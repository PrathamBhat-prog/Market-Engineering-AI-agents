import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function assessReadiness(finding, verification) {
  const evidenceStatus = verification?.status || 'missing';
  const directlyRelevant = finding.icp_status === 'qualified';
  const verified = evidenceStatus === 'verified';

  if (directlyRelevant && verified) {
    return {
      readiness: 'ready_for_manual_contact_research',
      campaign_stage: 'contact_research',
      reason: 'The signal has direct operational relevance and its source content matched the verification rules.',
      next_action: 'Research the responsible marketing-operations or RevOps owner. Prepare a human-reviewed problem-specific message; do not send automatically.',
      human_approval_required: true,
    };
  }

  if (evidenceStatus !== 'verified') {
    return {
      readiness: 'hold',
      campaign_stage: 'manual_validation',
      reason: `Evidence status is ${evidenceStatus}; do not progress this record to contact research.`,
      next_action: evidenceStatus === 'blocked' ? 'Find an accessible primary source or manually review the blocked page before continuing.' : 'Review the source and signal summary manually before continuing.',
      human_approval_required: true,
    };
  }

  return {
    readiness: 'hold',
    campaign_stage: 'manual_validation',
    reason: 'The source is verified, but the current signal is still a strategic trigger rather than direct evidence of an operational problem.',
    next_action: finding.validation_step || 'Validate the process, owner, and urgency before researching contacts.',
    human_approval_required: true,
  };
}

const [, , reportPath = 'output/signal-report.json', verificationPath = 'output/evidence-verification.json'] = process.argv;
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const verification = JSON.parse(await fs.readFile(verificationPath, 'utf8'));
  const verificationById = new Map((verification.results ?? []).map((item) => [item.account_id, item]));
  const results = (report.findings ?? []).map((finding) => ({
    account_id: finding.account_id,
    company_name: finding.company_name,
    problem_id: finding.problem_id,
    service_offer: finding.service_offer,
    signal_date: finding.signal_date,
    source_url: finding.evidence_url,
    evidence_status: verificationById.get(finding.account_id)?.status || 'missing',
    ...assessReadiness(finding, verificationById.get(finding.account_id)),
  }));
  const summary = {
    accounts_checked: results.length,
    ready_for_manual_contact_research: results.filter((item) => item.readiness === 'ready_for_manual_contact_research').length,
    held: results.filter((item) => item.readiness === 'hold').length,
  };
  const output = { generated_at: new Date().toISOString(), source_report: path.resolve(reportPath), verification_report: path.resolve(verificationPath), summary, results };
  await fs.mkdir('output', { recursive: true });
  await fs.writeFile('output/outreach-readiness.json', JSON.stringify(output, null, 2));
  const markdown = [
    '# Outreach Readiness Review',
    '',
    `Checked **${summary.accounts_checked}** accounts. Ready for manual contact research: **${summary.ready_for_manual_contact_research}**. Held: **${summary.held}**.`,
    '',
    ...results.flatMap((item) => [
      `## ${item.readiness === 'hold' ? 'HOLD' : 'READY'} — ${item.company_name}`,
      `Problem: ${item.problem_id || 'None mapped'} | Service: ${item.service_offer || 'None'}`,
      `Evidence: ${item.evidence_status} | Stage: ${item.campaign_stage}`,
      `Reason: ${item.reason}`,
      `Next action: ${item.next_action}`,
      `Source: ${item.source_url ? `[open source](${item.source_url})` : 'Not recorded'}`,
      '',
    ]),
  ].join('\n');
  await fs.writeFile('output/outreach-readiness.md', markdown);
  console.log(markdown);
}
