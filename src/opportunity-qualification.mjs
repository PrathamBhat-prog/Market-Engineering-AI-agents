const positiveSignals = [
  { pattern: /marketing ops|marketing operations|revops|revenue operations|demand generation|growth/i, points: 35, reason: 'Hiring indicates operational marketing capacity is a current priority.' },
  { pattern: /launch|platform|product|expan|fund|acqui|partnership/i, points: 20, reason: 'A business change may create new marketing-system demands.' },
  { pattern: /pricing changed/i, points: 25, reason: 'A pricing change creates a timely reason to review customer and campaign workflows.' },
];

export function qualifyOpportunity(item) {
  const text = [item.company_name, item.news_signal, item.hiring_signal, item.product_signal].filter(Boolean).join(' ');
  const reasons = positiveSignals.filter(({ pattern }) => pattern.test(text));
  const fit_score = Math.min(100, reasons.reduce((sum, reason) => sum + reason.points, 0));
  const hasEvidence = (item.evidence_urls ?? []).length > 0;
  const status = !hasEvidence ? 'needs_review' : fit_score >= 35 ? 'qualified' : fit_score > 0 ? 'needs_review' : 'disqualified';
  return {
    icp_status: status,
    fit_score,
    confidence: hasEvidence && reasons.length ? 'medium' : 'low',
    detected_problem: reasons.length ? 'The company may need help connecting marketing data, workflows, or execution systems.' : 'No clear marketing-engineering problem detected from the available signal.',
    qualification_reasons: reasons.map(({ reason }) => reason),
    qualification_note: status === 'needs_review' ? 'Verify the signal and company context before taking action.' : undefined,
  };
}
