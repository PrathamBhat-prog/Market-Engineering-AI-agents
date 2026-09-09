export function buildAccountBrief(item, qualification) {
  const signal = item.news_signal || item.product_signal || item.hiring_signal || 'No specific signal recorded.';
  const evidence = (item.evidence_urls ?? [])[0] || 'No source URL recorded; manual verification required.';
  const action = qualification.icp_status === 'qualified'
    ? 'Review the evidence, identify the responsible marketing or RevOps owner, and decide whether to offer a workflow diagnostic.'
    : 'Verify the company context and evidence before deciding whether this belongs in the outreach queue.';
  return {
    account_brief: `Signal: ${signal} Likely relevance: ${qualification.detected_problem}`,
    evidence_url: evidence,
    next_best_action: action,
    approval_required: true,
  };
}
