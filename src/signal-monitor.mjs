import fs from 'node:fs/promises';
import path from 'node:path';
import { qualifyOpportunity } from './opportunity-qualification.mjs';
import { buildAccountBrief } from './account-brief.mjs';

const [, , currentPath, previousPath] = process.argv;
if (!currentPath || !previousPath) {
  console.error('Usage: node src/signal-monitor.mjs <current.json> <previous.json>');
  process.exit(1);
}

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const current = await readJson(currentPath);
const previous = await readJson(previousPath);
const previousById = new Map(previous.map((item) => [item.account_id, item]));

function assess(currentItem, previousItem) {
  const changes = [];
  if (!previousItem) changes.push('new account');
  if (previousItem && currentItem.pricing !== previousItem.pricing) changes.push('pricing changed');
  if (previousItem && currentItem.hiring_signal !== previousItem.hiring_signal) changes.push('hiring signal changed');
  if (previousItem && currentItem.product_signal !== previousItem.product_signal) changes.push('product signal changed');

  let severity = 'none';
  if (changes.includes('pricing changed')) severity = 'high';
  else if (changes.some((change) => ['hiring signal changed', 'product signal changed', 'new account'].includes(change))) severity = 'medium';

  const action = severity === 'high'
    ? 'Human review: investigate the pricing change and prepare a relevant account brief.'
    : severity === 'medium'
      ? 'Human review: verify the signal and decide whether this account deserves outreach.'
      : 'No action.';

  const qualification = qualifyOpportunity(currentItem);
  return {
    account_id: currentItem.account_id,
    company_name: currentItem.company_name,
    changes,
    severity,
    confidence: changes.length ? 'high' : 'high',
    evidence_urls: currentItem.evidence_urls ?? [],
    recommended_action: action,
    ...qualification,
    ...buildAccountBrief(currentItem, qualification),
  };
}

const findings = current.map((item) => assess(item, previousById.get(item.account_id)));
const actionable = findings.filter((finding) => finding.severity !== 'none');
const timestamp = new Date().toISOString();

const report = {
  generated_at: timestamp,
  summary: {
    accounts_checked: findings.length,
    actionable_findings: actionable.length,
    high: actionable.filter((item) => item.severity === 'high').length,
    medium: actionable.filter((item) => item.severity === 'medium').length,
  },
  findings,
};

const markdown = [
  '# Marketing Signal Review',
  '',
  `Generated: ${timestamp}`,
  '',
  `Checked **${report.summary.accounts_checked}** accounts. Found **${report.summary.actionable_findings}** actionable changes (**${report.summary.high} high**, **${report.summary.medium} medium**).`,
  '',
  ...(actionable.length ? actionable.flatMap((item) => [
    `## ${item.severity.toUpperCase()} — ${item.company_name}`,
    `Changes: ${item.changes.join(', ')}`,
    `Action: ${item.recommended_action}`,
    `ICP status: ${item.icp_status} | Fit score: ${item.fit_score} | Confidence: ${item.confidence}`,
    `Why it may matter: ${item.detected_problem}`,
    `Account brief: ${item.account_brief}`,
    `Next best action: ${item.next_best_action}`,
    `Evidence: ${item.evidence_urls.map((url) => `[source](${url})`).join(', ') || 'Not provided'}`,
    '',
  ]) : ['No changes detected.']),
].join('\n');

const csvFields = ['account_id', 'company_name', 'severity', 'icp_status', 'fit_score', 'confidence', 'changes', 'detected_problem', 'account_brief', 'next_best_action', 'recommended_action', 'evidence_urls'];
const csvCell = (value) => `"${String(Array.isArray(value) ? value.join('; ') : value ?? '').replaceAll('"', '""')}"`;
const csv = [
  csvFields.join(','),
  ...findings.map((item) => csvFields.map((field) => csvCell(item[field])).join(',')),
].join('\n');

const outputDir = path.resolve('output');
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, 'signal-report.json'), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(outputDir, 'signal-report.md'), markdown);
await fs.writeFile(path.join(outputDir, 'signal-review.csv'), csv);
await fs.writeFile(path.join(outputDir, 'signals-baseline.json'), JSON.stringify(current, null, 2));
console.log(markdown);
