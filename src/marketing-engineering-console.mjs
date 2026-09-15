import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKFLOW_STAGES = ['Retrieve', 'Compare', 'Research', 'Reason', 'Route', 'Human review'];

const SOURCE_CONTROLS = [
  ['Facts before judgment', 'Keep retrieved evidence separate from AI interpretation.'],
  ['Human in the loop', 'Keep validation, approval, external actions, and irreversible changes human-owned.'],
  ['No-guess rule', 'Missing, blocked, or unverified information stays explicitly unresolved.'],
  ['Workflow before automation', 'Map the real recurring process, then automate deterministic work before judgment.'],
  ['Evidence and memory', 'Compare current observations with stored context and preserve provenance.'],
];

const normalizeList = (value) => Array.isArray(value) ? value : [];

function stageFor(finding, verification, readiness, blueprint) {
  if (verification?.status === 'blocked' || verification?.status === 'failed') return 'Research blocked';
  if (readiness?.readiness === 'ready_for_manual_contact_research') return 'Human review gate';
  if (blueprint?.status === 'hypothesis_blueprint') return 'Blueprint hypothesis';
  if (verification?.status === 'verified') return 'Route for validation';
  if (finding?.problem_id) return 'Reasoning review';
  return 'Needs review';
}

export function buildConsoleModel({ report = {}, verification = {}, readiness = {}, blueprints = {} } = {}) {
  const evidenceById = new Map(normalizeList(verification.results).map((item) => [item.account_id, item]));
  const readinessById = new Map(normalizeList(readiness.results).map((item) => [item.account_id, item]));
  const blueprintById = new Map(normalizeList(blueprints.blueprints).map((item) => [item.account_id, item]));

  const accounts = normalizeList(report.findings).map((finding) => {
    const evidence = evidenceById.get(finding.account_id) ?? {};
    const gate = readinessById.get(finding.account_id) ?? {};
    const blueprint = blueprintById.get(finding.account_id) ?? {};
    return {
      account_id: finding.account_id,
      company_name: finding.company_name,
      stage: stageFor(finding, evidence, gate, blueprint),
      changes: normalizeList(finding.changes),
      signal_date: finding.signal_date ?? null,
      source_type: finding.source_type ?? 'Not recorded',
      evidence_url: finding.evidence_url ?? normalizeList(finding.evidence_urls)[0] ?? null,
      evidence_status: evidence.status ?? 'missing',
      confidence: finding.confidence ?? 'not scored',
      false_positive_risk: finding.false_positive_risk ?? 'not scored',
      icp_status: finding.icp_status ?? 'not scored',
      fit_score: finding.fit_score ?? null,
      facts: finding.evidence_summary ?? 'No source fact recorded.',
      judgment: finding.detected_problem ?? 'No AI judgment recorded.',
      service_offer: finding.service_offer ?? 'No service mapped.',
      validation_step: finding.validation_step ?? 'No validation step recorded.',
      readiness: gate.readiness ?? 'missing',
      readiness_reason: gate.reason ?? 'No readiness decision recorded.',
      blueprint_status: blueprint.status ?? 'missing',
      blueprint_output: blueprint.output_artifact ?? null,
      human_approval_required: gate.human_approval_required ?? finding.approval_required ?? true,
    };
  });

  const count = (predicate) => accounts.filter(predicate).length;
  const summary = {
    accounts_checked: accounts.length,
    verified: count((item) => item.evidence_status === 'verified'),
    research_blocked: count((item) => ['blocked', 'failed'].includes(item.evidence_status)),
    ready_for_manual_contact_research: count((item) => item.readiness === 'ready_for_manual_contact_research'),
    held_for_human_review: count((item) => item.readiness !== 'ready_for_manual_contact_research'),
    hypothesis_blueprints: count((item) => item.blueprint_status === 'hypothesis_blueprint'),
    not_scored_false_positive_risk: count((item) => item.false_positive_risk === 'not scored'),
  };

  return {
    generated_at: new Date().toISOString(),
    source_methodology: {
      workflow: WORKFLOW_STAGES,
      controls: SOURCE_CONTROLS,
      boundary: 'This console organizes evidence and judgment for human review. It does not claim a confirmed problem, send outreach, or mutate a CRM.',
    },
    summary,
    accounts,
  };
}

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const display = (value, fallback = 'Not recorded') => value == null || value === '' ? fallback : escapeHtml(value);

function renderAccountRow(account) {
  const riskClass = account.false_positive_risk === 'not scored' ? 'muted' : '';
  const link = account.evidence_url
    ? `<a href="${escapeHtml(account.evidence_url)}" target="_blank" rel="noreferrer">Open evidence</a>`
    : '<span class="muted">No URL</span>';
  return `<tr data-search="${escapeHtml(`${account.company_name} ${account.stage} ${account.service_offer} ${account.evidence_status}`)}">
    <td><strong>${display(account.company_name)}</strong><small>${display(account.account_id)}</small></td>
    <td><span class="pill stage">${display(account.stage)}</span><small>${display(account.changes.join(', '), 'No change recorded')}</small></td>
    <td><span class="pill ${escapeHtml(account.evidence_status)}">${display(account.evidence_status)}</span><small>${display(account.source_type)}</small></td>
    <td><strong>${display(account.facts)}</strong><small>${display(account.signal_date)}</small></td>
    <td>${display(account.judgment)}<small>${display(account.service_offer)}</small></td>
    <td><span class="pill ${escapeHtml(account.readiness)}">${display(account.readiness)}</span><small>${display(account.validation_step)}</small></td>
    <td><span class="${riskClass}">${display(account.false_positive_risk)}</span><small>Confidence: ${display(account.confidence)}</small></td>
    <td>${link}</td>
  </tr>`;
}

export function renderConsoleHtml(model) {
  const { summary, accounts, source_methodology: methodology } = model;
  const controlCards = methodology.controls.map(([title, text]) => `<div class="control"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></div>`).join('');
  const workflow = methodology.workflow.map((stage, index) => `<div class="workflow-step"><b>${index + 1}</b><span>${escapeHtml(stage)}</span></div>`).join('');
  const rows = accounts.map(renderAccountRow).join('');
  const data = JSON.stringify(model).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Marketing Engineering Operator Console</title>
<style>
:root{--navy:#0d1b2a;--blue:#173b67;--ink:#17202a;--muted:#667085;--line:#d8e0ea;--pale:#f5f8fb;--cyan:#dff3f8;--green:#e6f4ea;--amber:#fff3cd;--red:#fde8e7}
*{box-sizing:border-box}body{margin:0;background:var(--pale);color:var(--ink);font:14px/1.45 Arial,Helvetica,sans-serif}main{max-width:1680px;margin:auto;padding:28px 34px 56px}header{background:var(--navy);color:#fff;border-radius:18px;padding:28px 32px;box-shadow:0 10px 28px #0d1b2a1c}h1{font-size:28px;margin:0 0 7px}h2{font-size:18px;margin:0 0 14px}header p{margin:0;color:#c7d6e6;max-width:1000px}.workflow{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}.workflow-step{display:flex;align-items:center;gap:8px;background:#ffffff16;border:1px solid #ffffff2b;border-radius:999px;padding:7px 12px}.workflow-step b{display:grid;place-items:center;background:#8fd3e8;color:var(--navy);width:21px;height:21px;border-radius:50%;font-size:12px}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin:18px 0}.metric,.panel{background:#fff;border:1px solid var(--line);border-radius:14px}.metric{padding:16px}.metric strong{display:block;font-size:26px;color:var(--blue)}.metric span{color:var(--muted);font-size:12px}.panel{padding:20px;margin-top:18px}.controls{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.control{background:#f8fafc;border-left:3px solid #8bcfe0;padding:10px 12px;min-height:70px}.control strong,.control span{display:block}.control strong{color:var(--blue);font-size:12px;margin-bottom:5px}.control span{font-size:12px;color:var(--muted)}.toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px}.toolbar input,.toolbar select{border:1px solid var(--line);border-radius:8px;padding:10px;background:#fff;color:var(--ink)}.toolbar input{min-width:310px}table{border-collapse:separate;border-spacing:0;width:100%;font-size:13px}th{background:var(--blue);color:#fff;text-align:left;padding:11px 10px;position:sticky;top:0;z-index:1}td{padding:12px 10px;vertical-align:top;border-bottom:1px solid var(--line);background:#fff}tr:nth-child(even) td{background:#fbfdff}td small{display:block;color:var(--muted);margin-top:5px;font-size:11px}td strong{font-weight:600}.pill{display:inline-block;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:700;background:#edf1f5;color:#445}.pill.verified,.pill.ready_for_manual_contact_research{background:var(--green);color:#23633a}.pill.blocked,.pill.failed,.pill.hold{background:var(--red);color:#9b2c28}.pill.missing,.pill.manual_validation{background:var(--amber);color:#825b00}.pill.stage{background:var(--cyan);color:#15586c}.muted{color:var(--muted)}a{color:#0c6380;text-decoration:none;font-weight:600}a:hover{text-decoration:underline}.footnote{color:var(--muted);font-size:12px;margin-top:14px}.empty{padding:26px;text-align:center;color:var(--muted)}@media(max-width:1100px){.grid{grid-template-columns:repeat(3,1fr)}.controls{grid-template-columns:repeat(2,1fr)}.panel.table-wrap{overflow:auto}table{min-width:1100px}}@media(max-width:680px){main{padding:18px}.grid{grid-template-columns:repeat(2,1fr)}.controls{grid-template-columns:1fr}.toolbar{align-items:stretch;flex-direction:column}.toolbar input{min-width:0;width:100%}}
</style>
</head>
<body><main>
<header><h1>Marketing Engineering Operator Console</h1><p>Source-aligned review surface for public signal research. Facts, evidence status, AI judgment, and human gates stay visible in one place.</p><div class="workflow">${workflow}</div></header>
<section class="grid">
<div class="metric"><strong>${summary.accounts_checked}</strong><span>Accounts checked</span></div>
<div class="metric"><strong>${summary.verified}</strong><span>Evidence verified</span></div>
<div class="metric"><strong>${summary.research_blocked}</strong><span>Research blocked</span></div>
<div class="metric"><strong>${summary.held_for_human_review}</strong><span>Held for human review</span></div>
<div class="metric"><strong>${summary.hypothesis_blueprints}</strong><span>Blueprint hypotheses</span></div>
<div class="metric"><strong>${summary.not_scored_false_positive_risk}</strong><span>Risk not scored</span></div>
</section>
<section class="panel"><h2>Operating controls</h2><div class="controls">${controlCards}</div><p class="footnote">${escapeHtml(methodology.boundary)}</p></section>
<section class="panel table-wrap"><div class="toolbar"><h2>Account review queue</h2><div><input id="search" type="search" placeholder="Search accounts, stages, services…"><select id="status"><option value="">All evidence states</option><option value="verified">Verified</option><option value="blocked">Blocked</option><option value="failed">Failed</option><option value="missing">Missing</option></select></div></div>
<table><thead><tr><th>Account</th><th>Workflow stage</th><th>Evidence</th><th>Deterministic fact</th><th>AI judgment</th><th>Human gate</th><th>Risk / confidence</th><th>Source</th></tr></thead><tbody id="queue">${rows || '<tr><td class="empty" colspan="8">No findings available.</td></tr>'}</tbody></table></section>
<script>
const model=${data};
const rows=[...document.querySelectorAll('#queue tr[data-search]')];
function update(){const q=document.querySelector('#search').value.toLowerCase();const s=document.querySelector('#status').value;rows.forEach(row=>{const text=row.dataset.search.toLowerCase();const evidence=row.querySelector('td:nth-child(3) .pill')?.textContent.trim();row.hidden=Boolean((q&&!text.includes(q))||(s&&evidence!==s));});}
document.querySelector('#search').addEventListener('input',update);document.querySelector('#status').addEventListener('change',update);
</script>
</main></body></html>`;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

const [, , reportPath = 'output/signal-report.json', verificationPath = 'output/evidence-verification.json', readinessPath = 'output/outreach-readiness.json', blueprintPath = 'output/diagnostic-blueprints.json'] = process.argv;
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const [report, verification, readiness, blueprints] = await Promise.all([
    readJson(reportPath), readJson(verificationPath), readJson(readinessPath), readJson(blueprintPath),
  ]);
  const model = buildConsoleModel({ report, verification, readiness, blueprints });
  await fs.mkdir('output', { recursive: true });
  await fs.writeFile('output/source-aligned-operator-console.json', JSON.stringify(model, null, 2));
  await fs.writeFile('output/source-aligned-operator-console.html', renderConsoleHtml(model));
  console.log(`Built local operator console for ${model.summary.accounts_checked} accounts.`);
  console.log(`HTML: ${path.resolve('output/source-aligned-operator-console.html')}`);
}
