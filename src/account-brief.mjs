export function buildAccountBrief(item, qualification, changes = []) {
  const meaningful = (value) => value && value !== 'none' && value !== 'unknown';
  const signal = [item.news_signal, item.product_signal, item.hiring_signal].find(meaningful) || changes.join(', ') || 'No specific signal recorded.';
  const evidence = (item.evidence_urls ?? [])[0] || 'No source URL recorded; manual verification required.';
  const action = qualification.icp_status === 'qualified'
    ? `Verify the evidence, identify the responsible owner, and validate this first: ${qualification.validation_step}`
    : `Do not outreach yet. ${qualification.validation_step}`;
  const service = qualification.service_offer || 'No service offer should be proposed yet.';
  const agent = qualification.agent_role || 'No agent role should be proposed yet.';
  return {
    account_brief: `Signal: ${signal} Evidence: ${item.evidence_summary || 'No evidence summary recorded.'} Problem hypothesis: ${qualification.detected_problem} Service to investigate: ${service} AI-engineering role: ${agent}`,
    evidence_url: evidence,
    next_best_action: action,
    approval_required: true,
  };
}
