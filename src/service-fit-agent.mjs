const problemPatterns = [
  {
    id: 'marketing-ops-handoff',
    statement: 'Marketing-to-sales reporting, routing, and handoffs are becoming operationally important.',
    pattern: /marketing operations|marketing-ops|revops|revenue operations|lead routing|marketing-to-sales|handoff|reporting|measurement|operational intelligence/i,
    score: 55,
    evidenceStrength: 'direct',
    serviceOffer: 'Marketing Operations Workflow Diagnostic',
    agentRole: 'A human-approved workflow monitor that checks lead routing, lifecycle fields, handoffs, and reporting exceptions.',
    validationStep: 'Interview the marketing-operations or RevOps owner and inspect one real lead-to-opportunity workflow.',
  },
  {
    id: 'agentic-marketing-governance',
    statement: 'Marketing AI agents are expanding across channels and need controls, context, and measurement.',
    pattern: /AI agent|AI agents|agentic|customer acquisition|advertising|social media|SEO|AI-chatbot|marketing workflow/i,
    score: 45,
    evidenceStrength: 'trigger',
    serviceOffer: 'Agent Operations Layer for Marketing',
    agentRole: 'A narrow agent with source checks, approval gates, structured logs, cost controls, and a human-owned exception path.',
    validationStep: 'Confirm which marketing task is actually being automated, who approves it, and how success is measured.',
  },
  {
    id: 'post-acquisition-integration',
    statement: 'Acquisitions may create fragmented marketing data, taxonomies, and go-to-market workflows.',
    pattern: /acquisition|acquisitions|acquired|consolidation strategy/i,
    score: 42,
    evidenceStrength: 'trigger',
    serviceOffer: 'Post-M&A Marketing Systems Integration',
    agentRole: 'A reconciliation agent that compares source fields, taxonomies, and reporting definitions before a human approves the mapping.',
    validationStep: 'Confirm whether systems or teams were actually consolidated and identify the first duplicate reporting task.',
  },
  {
    id: 'international-gtm-operations',
    statement: 'International expansion increases the need for consistent regional marketing operations and reporting.',
    pattern: /international|European expansion|expansion across Europe|EEA|new markets|geographic expansion|multiple countries|regional launch/i,
    score: 32,
    evidenceStrength: 'trigger',
    serviceOffer: 'International GTM Operations Setup',
    agentRole: 'An expansion signal and localization planner that tracks regional requirements and produces a review queue for operators.',
    validationStep: 'Confirm which regions, systems, and campaign processes are changing in the next 90 days.',
  },
  {
    id: 'launch-to-scale',
    statement: 'A newly funded or launched company may need repeatable acquisition, reporting, and operating workflows.',
    pattern: /launched|launches|raised|funding|backing|investment|hiring|hire|scale|growth/i,
    score: 24,
    evidenceStrength: 'trigger',
    serviceOffer: 'GTM Operations Foundation',
    agentRole: 'A research, enrichment, QA, and reporting agent used inside a measurable operating process—not sold as the outcome.',
    validationStep: 'Confirm the first process that is still manual and the metric that leadership wants to improve.',
  },
];

function signalText(item) {
  return [
    item.company_name,
    item.news_signal,
    item.product_signal,
    item.hiring_signal,
    item.evidence_summary,
    item.source_type,
  ].filter((value) => value && !['none', 'unknown'].includes(String(value).toLowerCase())).join(' ');
}

export function mapSignalToService(item) {
  const text = signalText(item);
  const matches = problemPatterns.filter(({ pattern }) => pattern.test(text));
  const ranked = [...matches].sort((a, b) => b.score - a.score);
  const primary = ranked[0];
  const source = String(item.source_type || '').toLowerCase();
  const directSource = source.includes('job posting') || source.includes('hiring');
  const hasEvidence = (item.evidence_urls ?? []).length > 0;

  if (!primary) {
    return {
      problem_id: null,
      problem_statement: 'No clear marketing-engineering problem detected from the available signal.',
      service_offer: null,
      agent_role: null,
      service_fit_score: 0,
      service_fit_status: hasEvidence ? 'needs_review' : 'disqualified',
      service_fit_confidence: 'low',
      matched_problem_ids: [],
      service_fit_reasons: [],
      validation_step: 'Collect a clearer business trigger before proposing a service.',
    };
  }

  const directBonus = directSource ? 15 : 0;
  const score = Math.min(100, primary.score + directBonus + Math.min(10, Math.max(0, ranked.length - 1) * 5));
  const status = directSource && score >= 55 ? 'qualified' : 'needs_review';
  const confidence = !hasEvidence ? 'low' : directSource ? 'high' : 'medium';

  return {
    problem_id: primary.id,
    problem_statement: primary.statement,
    service_offer: primary.serviceOffer,
    agent_role: primary.agentRole,
    service_fit_score: score,
    service_fit_status: status,
    service_fit_confidence: confidence,
    matched_problem_ids: ranked.map(({ id }) => id),
    service_fit_reasons: ranked.map(({ id, statement, evidenceStrength }) => ({ id, statement, evidence_strength: evidenceStrength })),
    validation_step: primary.validationStep,
  };
}

export { problemPatterns };
