import { mapSignalToService } from './service-fit-agent.mjs';

export function qualifyOpportunity(item) {
  const fit = mapSignalToService(item);
  const hasEvidence = (item.evidence_urls ?? []).length > 0;
  const qualification_note = fit.service_fit_status === 'qualified'
    ? 'Direct operational evidence exists, but a human must confirm the process and owner before outreach.'
    : fit.service_fit_status === 'needs_review'
      ? 'This is a source-backed trigger, not proof of a buying problem. Verify the process, owner, and urgency.'
      : 'No source-backed marketing-engineering problem is clear enough to pursue.';

  return {
    icp_status: fit.service_fit_status,
    fit_score: fit.service_fit_score,
    confidence: hasEvidence ? fit.service_fit_confidence : 'low',
    detected_problem: fit.problem_statement,
    qualification_reasons: fit.service_fit_reasons.map(({ statement, evidence_strength }) => `${statement} (${evidence_strength} evidence)`),
    qualification_note,
    problem_id: fit.problem_id,
    matched_problem_ids: fit.matched_problem_ids,
    service_offer: fit.service_offer,
    agent_role: fit.agent_role,
    validation_step: fit.validation_step,
  };
}
