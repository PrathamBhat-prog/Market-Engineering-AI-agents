import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildTamMap } from '../src/tam-mapping-agent.mjs';

const report = JSON.parse(await fs.readFile(new URL('../output/signal-report.json', import.meta.url), 'utf8'));
const verification = JSON.parse(await fs.readFile(new URL('../output/evidence-verification.json', import.meta.url), 'utf8'));
const blueprints = JSON.parse(await fs.readFile(new URL('../output/diagnostic-blueprints.json', import.meta.url), 'utf8'));

test('TAM map recommends a wedge from verified problem clusters', () => {
  const result = buildTamMap(report, verification, blueprints);
  assert.match(result.recommended_wedge.name, /GTM operations/i);
  assert.equal(result.evidence_summary.live_verified_signals, 6);
  assert.ok(result.observed_problem_clusters.some((cluster) => cluster.problem_id === 'marketing-ops-handoff'));
});

test('TAM map keeps enrichment, formula, and agent work separate', () => {
  const result = buildTamMap(report, verification, blueprints);
  assert.ok(result.collection_plan.enrichment_before_agent.length > 0);
  assert.ok(result.collection_plan.formula_work.length > 0);
  assert.ok(result.collection_plan.agent_work.length > 0);
  assert.match(result.collection_plan.paid_data_boundary, /contact|waterfall/i);
});
