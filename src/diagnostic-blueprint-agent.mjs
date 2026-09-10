import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const templates = {
  'marketing-ops-handoff': {
    objective: 'Make the marketing-to-sales handoff observable and easier to diagnose.',
    deterministic_work: ['Check required lifecycle and routing fields.', 'Measure handoff lag and stale records.', 'Identify duplicate or conflicting routing conditions.'],
    agent_work: ['Summarize the highest-impact exceptions.', 'Suggest a human-reviewable routing or ownership hypothesis.', 'Generate a weekly operations brief from the exception queue.'],
    approval_gate: 'A marketing-operations or RevOps owner approves any routing, lifecycle, or CRM change.',
    output_artifact: 'Workflow diagnostic, exception queue, and approved improvement backlog.',
    pilot_metrics: ['routing accuracy', 'handoff lag', 'stale lead rate', 'exception resolution time'],
  },
  'agentic-marketing-governance': {
    objective: 'Make marketing-agent activity observable, reviewable, and cost-controlled.',
    deterministic_work: ['Inventory tools, tasks, permissions, and measurable outputs.', 'Track run counts, latency, spend, and pass/fail outcomes.', 'Apply hard limits for cost, frequency, and data access.'],
    agent_work: ['Classify an incoming marketing task.', 'Draft an execution plan and required evidence.', 'Summarize results and route exceptions to a human.'],
    approval_gate: 'A named operator approves external publication, spend, CRM mutation, or any irreversible action.',
    output_artifact: 'Agent operating specification, approval queue, run log, and evaluation set.',
    pilot_metrics: ['task success rate', 'human override rate', 'cost per completed task', 'time saved per approved task'],
  },
  'post-acquisition-integration': {
    objective: 'Reduce ambiguity when marketing data, taxonomies, and workflows span acquired businesses.',
    deterministic_work: ['Compare field names, values, owners, and source systems.', 'Detect duplicate definitions and missing mappings.', 'Produce a reconciliation table with confidence and provenance.'],
    agent_work: ['Explain likely semantic matches.', 'Draft a proposed mapping with source evidence.', 'Create an unresolved-items queue for the integration owner.'],
    approval_gate: 'The data or RevOps owner approves mappings before any production merge or reporting change.',
    output_artifact: 'Marketing-data reconciliation pack and approved integration backlog.',
    pilot_metrics: ['mapping acceptance rate', 'unresolved-field count', 'duplicate-report count', 'time to approve a mapping'],
  },
  'international-gtm-operations': {
    objective: 'Give regional GTM teams a repeatable way to track expansion requirements and operational dependencies.',
    deterministic_work: ['Track countries, launch dates, systems, owners, and required fields.', 'Check regional completeness and reporting consistency.', 'Flag overdue dependencies and missing approvals.'],
    agent_work: ['Summarize what changed by region.', 'Draft a launch-readiness brief from the tracked inputs.', 'Route missing information to the correct owner.'],
    approval_gate: 'Regional and central marketing owners approve localization, compliance, and launch decisions.',
    output_artifact: 'Regional GTM readiness board, dependency queue, and weekly expansion brief.',
    pilot_metrics: ['dependency completion rate', 'launch-readiness lead time', 'missing-field rate', 'regional reporting consistency'],
  },
  'launch-to-scale': {
    objective: 'Turn one repeatable GTM process into a measurable operating workflow before adding more automation.',
    deterministic_work: ['Define the process stages, owners, inputs, and output metrics.', 'Normalize research and campaign data.', 'Calculate volume, conversion, cost, and SLA measures.'],
    agent_work: ['Research and summarize approved sources.', 'Draft structured records for review.', 'Generate QA and performance reports without sending messages.'],
    approval_gate: 'The operator approves source selection, record changes, campaign copy, and any external action.',
    output_artifact: 'GTM process map, structured research queue, QA checklist, and measurement baseline.',
    pilot_metrics: ['record completeness', 'research time per account', 'QA error rate', 'cost per reviewed record'],
  },
};

export function buildBlueprint(finding, verification) {
  const evidenceStatus = verification?.status || 'missing';
  if (evidenceStatus !== 'verified') {
    return {
      account_id: finding.account_id,
      company_name: finding.company_name,
      status: 'held',
      evidence_status: evidenceStatus,
      reason: 'Blueprint held because the source has not passed live evidence verification.',
    };
  }
  const template = templates[finding.problem_id];
  if (!template) {
    return {
      account_id: finding.account_id,
      company_name: finding.company_name,
      status: 'held',
      evidence_status: evidenceStatus,
      reason: 'Blueprint held because no specific service template is mapped to this problem.',
    };
  }
  return {
    account_id: finding.account_id,
    company_name: finding.company_name,
    status: 'hypothesis_blueprint',
    evidence_status: evidenceStatus,
    source_type: finding.source_type,
    signal_date: finding.signal_date,
    source_url: finding.evidence_url || finding.evidence_urls?.[0] || null,
    source_fact: finding.evidence_summary,
    problem_id: finding.problem_id,
    service_offer: finding.service_offer,
    objective: template.objective,
    deterministic_work: template.deterministic_work,
    agent_work: template.agent_work,
    approval_gate: template.approval_gate,
    output_artifact: template.output_artifact,
    pilot_metrics: template.pilot_metrics,
    delivery_sequence: ['Map the current process', 'Normalize the inputs', 'Detect exceptions', 'Draft recommendations', 'Human approval', 'Measure the pilot'],
    boundary: 'This is a service-design hypothesis based on public evidence. It is not a claim that the company has confirmed the problem or agreed to a pilot.',
  };
}

const [, , reportPath = 'output/signal-report.json', verificationPath = 'output/evidence-verification.json'] = process.argv;
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const verification = JSON.parse(await fs.readFile(verificationPath, 'utf8'));
  const verificationById = new Map((verification.results ?? []).map((item) => [item.account_id, item]));
  const blueprints = (report.findings ?? []).map((finding) => buildBlueprint(finding, verificationById.get(finding.account_id)));
  const summary = {
    accounts_checked: blueprints.length,
    hypothesis_blueprints: blueprints.filter((item) => item.status === 'hypothesis_blueprint').length,
    held: blueprints.filter((item) => item.status === 'held').length,
  };
  const output = { generated_at: new Date().toISOString(), source_report: path.resolve(reportPath), verification_report: path.resolve(verificationPath), summary, blueprints };
  await fs.mkdir('output', { recursive: true });
  await fs.writeFile('output/diagnostic-blueprints.json', JSON.stringify(output, null, 2));
  const markdown = [
    '# Non-Manual Service Diagnostic Blueprints',
    '',
    `Built **${summary.hypothesis_blueprints}** hypothesis blueprints. Held **${summary.held}** records because their evidence or problem mapping was insufficient.`,
    '',
    ...blueprints.flatMap((blueprint) => blueprint.status === 'held'
      ? [`## HELD — ${blueprint.company_name}`, `Evidence: ${blueprint.evidence_status}`, blueprint.reason, '']
      : [
        `## ${blueprint.company_name} — ${blueprint.service_offer}`,
        `Problem: ${blueprint.problem_id} | Evidence: ${blueprint.evidence_status}`,
        `Source fact: ${blueprint.source_fact}`,
        `Objective: ${blueprint.objective}`,
        `Deterministic work: ${blueprint.deterministic_work.join(' | ')}`,
        `Agent work: ${blueprint.agent_work.join(' | ')}`,
        `Approval gate: ${blueprint.approval_gate}`,
        `Output: ${blueprint.output_artifact}`,
        `Pilot metrics: ${blueprint.pilot_metrics.join(', ')}`,
        `Sequence: ${blueprint.delivery_sequence.join(' → ')}`,
        `Source: ${blueprint.source_url ? `[open source](${blueprint.source_url})` : 'Not recorded'}`,
        '',
      ]),
  ].join('\n');
  await fs.writeFile('output/diagnostic-blueprints.md', markdown);
  console.log(markdown);
}
