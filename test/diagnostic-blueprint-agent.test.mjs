import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBlueprint } from '../src/diagnostic-blueprint-agent.mjs';

const cordance = {
  account_id: 'cordance',
  company_name: 'Cordance',
  problem_id: 'marketing-ops-handoff',
  service_offer: 'Marketing Operations Workflow Diagnostic',
  source_type: 'company job posting',
  signal_date: '2026-09-10',
  evidence_summary: 'The job posting covers reporting, measurement, lead routing, and marketing-to-sales handoffs.',
  evidence_url: 'https://job-boards.greenhouse.io/cordance/jobs/5392784008',
};

test('verified signal produces a non-manual diagnostic blueprint', () => {
  const result = buildBlueprint(cordance, { status: 'verified' });
  assert.equal(result.status, 'hypothesis_blueprint');
  assert.equal(result.service_offer, 'Marketing Operations Workflow Diagnostic');
  assert.ok(result.deterministic_work.length > 0);
  assert.ok(result.agent_work.length > 0);
  assert.match(result.approval_gate, /approves/i);
});

test('blocked evidence is held without producing a service blueprint', () => {
  const result = buildBlueprint(cordance, { status: 'blocked' });
  assert.equal(result.status, 'held');
  assert.equal(result.evidence_status, 'blocked');
  assert.equal(result.deterministic_work, undefined);
});
