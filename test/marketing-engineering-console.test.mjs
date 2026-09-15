import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConsoleModel, renderConsoleHtml } from '../src/marketing-engineering-console.mjs';

const report = {
  findings: [
    {
      account_id: 'alpha', company_name: 'Alpha Systems', changes: ['hiring signal changed'], signal_date: '2026-09-01',
      source_type: 'company careers page', evidence_urls: ['https://example.com/jobs'], evidence_summary: 'A named operations role is open.',
      detected_problem: 'The workflow may need better handoff visibility.', service_offer: 'Workflow diagnostic', validation_step: 'Interview the owner.',
      confidence: 'high', icp_status: 'qualified', fit_score: 70,
    },
    {
      account_id: 'beta', company_name: 'Beta Labs', changes: ['new account'], source_type: 'company newsroom',
      evidence_urls: [], evidence_summary: 'No accessible source was recorded.', detected_problem: 'Expansion may create operational work.',
      confidence: 'low', icp_status: 'needs_review',
    },
  ],
};

test('console model joins evidence, readiness, and blueprint data by account id', () => {
  const model = buildConsoleModel({
    report,
    verification: { results: [{ account_id: 'alpha', status: 'verified' }, { account_id: 'beta', status: 'blocked' }] },
    readiness: { results: [{ account_id: 'alpha', readiness: 'ready_for_manual_contact_research', human_approval_required: true, reason: 'Manual gate.' }, { account_id: 'beta', readiness: 'hold', reason: 'Blocked.' }] },
    blueprints: { blueprints: [{ account_id: 'alpha', status: 'hypothesis_blueprint', output_artifact: 'Queue.' }] },
  });
  assert.deepEqual(model.summary, {
    accounts_checked: 2,
    verified: 1,
    research_blocked: 1,
    ready_for_manual_contact_research: 1,
    held_for_human_review: 1,
    hypothesis_blueprints: 1,
    not_scored_false_positive_risk: 2,
    agent_checked: 0,
    agent_disagreements: 0,
  });
  assert.equal(model.accounts[0].stage, 'Human review gate');
  assert.equal(model.accounts[1].stage, 'Research blocked');
  assert.equal(model.accounts[1].false_positive_risk, 'not scored');
});

test('rendered console keeps guardrails visible and escapes untrusted text', () => {
  const html = renderConsoleHtml(buildConsoleModel({ report: { findings: [{ account_id: 'x', company_name: '<X>', evidence_summary: 'fact', detected_problem: 'judgment' }] } }));
  assert.match(html, /Facts before judgment/);
  assert.match(html, /Human in the loop/);
  assert.match(html, /&lt;X&gt;/);
  assert.doesNotMatch(html, /<X>/);
  assert.match(html, /does not claim a confirmed problem/);
});
