import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { qualifyOpportunity } from '../src/opportunity-qualification.mjs';

const signals = JSON.parse(await fs.readFile(new URL('../examples/signals-current.json', import.meta.url), 'utf8'));
const byId = new Map(signals.map((item) => [item.account_id, item]));

test('direct marketing-operations evidence can qualify for human review', () => {
  const result = qualifyOpportunity(byId.get('cordance'));
  assert.equal(result.problem_id, 'marketing-ops-handoff');
  assert.equal(result.icp_status, 'qualified');
  assert.equal(result.service_offer, 'Marketing Operations Workflow Diagnostic');
  assert.equal(result.confidence, 'high');
});

test('AI-agent product announcements remain review hypotheses', () => {
  const result = qualifyOpportunity(byId.get('runable'));
  assert.equal(result.problem_id, 'agentic-marketing-governance');
  assert.equal(result.icp_status, 'needs_review');
  assert.equal(result.confidence, 'medium');
  assert.match(result.agent_role, /approval/i);
});

test('a company announcement alone is not treated as a proven buying problem', () => {
  const result = qualifyOpportunity(byId.get('opusflow'));
  assert.equal(result.icp_status, 'needs_review');
  assert.equal(result.confidence, 'medium');
  assert.match(result.qualification_note, /not proof/i);
});

test('missing evidence cannot become a qualified opportunity', () => {
  const result = qualifyOpportunity({ company_name: 'Unverified company', news_signal: 'launching a product', evidence_urls: [] });
  assert.notEqual(result.icp_status, 'qualified');
  assert.equal(result.confidence, 'low');
});
