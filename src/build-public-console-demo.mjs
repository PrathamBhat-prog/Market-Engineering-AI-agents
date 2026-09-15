import fs from 'node:fs/promises';
import path from 'node:path';
import { renderConsoleHtml } from './marketing-engineering-console.mjs';

const controls = [
  ['Facts before judgment', 'Keep retrieved evidence separate from AI interpretation.'],
  ['Human in the loop', 'Keep validation and approval human-owned.'],
  ['No-guess rule', 'Missing information remains unresolved.'],
  ['Workflow before automation', 'Map the recurring process before automating it.'],
  ['Evidence and memory', 'Compare current observations with stored context.'],
];

const demoModel = {
  generated_at: new Date().toISOString(),
  demo_notice: 'PUBLIC DEMO ONLY — all account names, facts, and sources below are synthetic placeholders. No private company research is included.',
  source_methodology: {
    workflow: ['Retrieve', 'Compare', 'Research', 'Reason', 'Route', 'Human review'],
    controls,
    boundary: 'This demo organizes evidence and judgment for human review. It does not claim a confirmed problem, send outreach, or mutate a CRM.',
  },
  summary: {
    accounts_checked: 3,
    verified: 2,
    research_blocked: 1,
    ready_for_manual_contact_research: 0,
    held_for_human_review: 3,
    hypothesis_blueprints: 2,
    not_scored_false_positive_risk: 3,
    agent_checked: 1,
    agent_disagreements: 1,
  },
  agent_summary: {
    accounts_requested: 3,
    successful: 1,
    method: 'Illustrative agent cross-check shown with synthetic data.',
  },
  accounts: [
    {
      account_id: 'demo-01', company_name: 'Pilot Account 01', stage: 'Human review gate', changes: ['new hiring signal'], signal_date: '2026-09-12', source_type: 'synthetic public posting', evidence_url: null, evidence_status: 'verified', confidence: 'high', false_positive_risk: 'not scored', icp_status: 'needs_review', fit_score: 72, facts: 'Synthetic fact: a public posting references reporting, lifecycle operations, and cross-functional handoffs.', judgment: 'Possible workflow friction; validate the process owner and current exception rate.', service_offer: 'Marketing Operations Workflow Diagnostic', validation_step: 'Inspect one real lead-to-opportunity workflow with the owner.', readiness: 'hold', readiness_reason: 'Demo record requires human validation.', blueprint_status: 'hypothesis_blueprint', blueprint_output: 'Workflow diagnostic and approved improvement backlog.', human_approval_required: true, agent_provider: 'Demo research agent', agent_status: 'succeeded', agent_confidence: 'medium', agent_enrichment: 'Synthetic enrichment confirms a technology-company profile.', agent_disagreement: 'Demo disagreement: employee band is not independently confirmed.'
    },
    {
      account_id: 'demo-02', company_name: 'Pilot Account 02', stage: 'Blueprint hypothesis', changes: ['new funding signal'], signal_date: '2026-09-08', source_type: 'synthetic company newsroom', evidence_url: null, evidence_status: 'verified', confidence: 'medium', false_positive_risk: 'not scored', icp_status: 'needs_review', fit_score: 55, facts: 'Synthetic fact: a company announcement describes a new market expansion and planned operating investment.', judgment: 'Expansion may create regional process and reporting dependencies.', service_offer: 'International GTM Operations Setup', validation_step: 'Confirm which regions, systems, and campaign processes are changing.', readiness: 'hold', readiness_reason: 'Trigger evidence is not proof of an operational problem.', blueprint_status: 'hypothesis_blueprint', blueprint_output: 'Regional readiness board and dependency queue.', human_approval_required: true, agent_provider: 'Demo research agent', agent_status: 'not_run', agent_confidence: 'not scored', agent_enrichment: null, agent_disagreement: null
    },
    {
      account_id: 'demo-03', company_name: 'Pilot Account 03', stage: 'Research blocked', changes: ['unverified signal'], signal_date: '2026-09-05', source_type: 'synthetic secondary source', evidence_url: null, evidence_status: 'blocked', confidence: 'not scored', false_positive_risk: 'not scored', icp_status: 'ambiguous', fit_score: null, facts: 'No verified fact recorded.', judgment: 'No judgment until the source can be verified.', service_offer: 'Not mapped', validation_step: 'Find an independent source or hold the record.', readiness: 'hold', readiness_reason: 'Evidence is blocked; do not progress.', blueprint_status: 'held', blueprint_output: null, human_approval_required: true, agent_provider: 'Demo research agent', agent_status: 'not_run', agent_confidence: 'not scored', agent_enrichment: null, agent_disagreement: null
    },
  ],
};

const outputPath = path.resolve('public-console-site/dist/index.html');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, renderConsoleHtml(demoModel), 'utf8');
console.log(`Built public synthetic demo: ${outputPath}`);
