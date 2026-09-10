import test from 'node:test';
import assert from 'node:assert/strict';
import { assessReadiness } from '../src/outreach-readiness-agent.mjs';

const finding = {
  icp_status: 'qualified',
  problem_id: 'marketing-ops-handoff',
  service_offer: 'Marketing Operations Workflow Diagnostic',
  validation_step: 'Interview the marketing-operations owner.',
};

test('only a qualified finding with verified evidence reaches contact research', () => {
  const result = assessReadiness(finding, { status: 'verified' });
  assert.equal(result.readiness, 'ready_for_manual_contact_research');
  assert.equal(result.campaign_stage, 'contact_research');
  assert.equal(result.human_approval_required, true);
});

test('a blocked source is held even when fit is direct', () => {
  const result = assessReadiness(finding, { status: 'blocked' });
  assert.equal(result.readiness, 'hold');
  assert.equal(result.campaign_stage, 'manual_validation');
  assert.match(result.reason, /blocked/);
});

test('a verified strategic trigger is held for problem validation', () => {
  const result = assessReadiness({ ...finding, icp_status: 'needs_review' }, { status: 'verified' });
  assert.equal(result.readiness, 'hold');
  assert.match(result.reason, /strategic trigger/);
});
