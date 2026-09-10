import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const segmentDefinitions = {
  'marketing-ops-handoff': {
    segment: 'B2B software companies hiring for marketing operations or RevOps ownership',
    strongSignal: 'A role explicitly owns reporting, measurement, lead routing, operational intelligence, or marketing-to-sales handoffs.',
  },
  'agentic-marketing-governance': {
    segment: 'AI-native software companies expanding agents into marketing or customer-acquisition workflows',
    strongSignal: 'A public product or funding source explicitly describes agents executing marketing work across channels or tools.',
  },
  'post-acquisition-integration': {
    segment: 'Vertical software groups integrating acquired products, data, and go-to-market motions',
    strongSignal: 'A company announces multiple acquisitions alongside data, AI, GTM, or consolidation work.',
  },
  'international-gtm-operations': {
    segment: 'B2B software companies expanding across Europe or multiple new markets',
    strongSignal: 'A source names countries or regions and connects expansion to product, infrastructure, team, or GTM investment.',
  },
  'launch-to-scale': {
    segment: 'Newly funded or launched B2B software companies building their first repeatable GTM operating system',
    strongSignal: 'A source combines funding or launch activity with hiring or stated GTM/operations expansion.',
  },
};

function countBy(items, key) {
  const counts = new Map();
  for (const item of items) {
    const value = item[key] || 'unknown';
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
}

export function buildTamMap(report, verification, blueprints) {
  const verificationById = new Map((verification.results ?? []).map((item) => [item.account_id, item]));
  const verifiedFindings = (report.findings ?? []).filter((item) => verificationById.get(item.account_id)?.status === 'verified');
  const mapped = verifiedFindings.filter((item) => segmentDefinitions[item.problem_id]);
  const clusters = countBy(mapped, 'problem_id').map(({ label: problem_id, count }) => ({
    problem_id,
    count,
    segment: segmentDefinitions[problem_id].segment,
    strong_signal: segmentDefinitions[problem_id].strongSignal,
    observed_companies: mapped.filter((item) => item.problem_id === problem_id).map((item) => item.company_name),
  }));

  return {
    generated_at: new Date().toISOString(),
    scope: 'Initial evidence-based TAM/ICP hypothesis for a marketing-systems implementation service.',
    evidence_summary: {
      total_signals: (report.findings ?? []).length,
      live_verified_signals: verifiedFindings.length,
      blocked_or_unverified_signals: (report.findings ?? []).length - verifiedFindings.length,
      source_types: countBy(verifiedFindings, 'source_type'),
    },
    recommended_wedge: {
      name: 'GTM operations and marketing-system control for B2B software teams undergoing expansion or operational change',
      plain_english: 'Companies growing across markets, adding marketing operations, adopting marketing AI, or integrating acquisitions often need their data and workflows connected before more automation is safe.',
      why_this_wedge: 'It is the common thread across the verified sample: the trigger is operational change, and the service is workflow diagnosis plus controlled implementation.',
      service_not_technology: 'Sell improved visibility, routing, reporting, and repeatable GTM operations. Use AI agents internally where they reduce research, QA, monitoring, or reconciliation work.',
    },
    icp_hypothesis: {
      must_have: [
        'B2B software or software-enabled company with a visible operational change.',
        'A public trigger tied to marketing operations, AI-enabled marketing work, acquisition integration, or multi-market GTM.',
        'A process that can be bounded to one workflow, owner, data source, and measurable pilot.',
      ],
      preferred_buyer_context: ['Marketing Operations', 'Revenue Operations', 'GTM Operations', 'Demand Generation', 'Growth Operations', 'Data/Systems leadership'],
      disqualifiers: ['Only a generic funding announcement with no operational trigger.', 'No source that can be independently verified.', 'A request that requires autonomous external action before a human approval path exists.'],
    },
    observed_problem_clusters: clusters,
    signal_strength_rules: {
      strong: ['Direct job responsibility for the target workflow.', 'Explicit product or funding language describing AI agents executing marketing work.', 'Expansion or acquisition announcement that names systems, data, GTM, or operational integration.'],
      weak_alone: ['Funding by itself.', 'Generic hiring by itself.', 'Generic “AI” language without a described workflow.', 'Geographic expansion without an operational or GTM detail.'],
    },
    collection_plan: {
      public_sources: ['Company newsroom and product announcements', 'Google News RSS for expansion, funding, acquisition, and marketing-operations terms', 'Greenhouse, Lever, and company careers pages for direct operational roles'],
      enrichment_before_agent: ['company name and domain', 'source date and source type', 'signal category', 'named systems, regions, role responsibilities, or workflow terms', 'source URL and verification status'],
      formula_work: ['deduplicate account IDs', 'count signal clusters', 'score evidence and freshness', 'route strong vs weak signals'],
      agent_work: ['map a verified signal to a problem hypothesis', 'draft the service-delivery blueprint', 'identify missing facts and route them to human validation'],
      paid_data_boundary: 'Do not spend on contact or waterfall enrichment until the wedge produces a repeatable verified problem pattern and a bounded pilot hypothesis.',
    },
    limitations: [
      'This is a small, deliberately selected sample, not a statistical market-size estimate.',
      'Public evidence shows triggers and stated activity; it does not prove budget, urgency, or willingness to buy.',
      'The current sample is biased toward companies with accessible English-language public sources.',
      'The next TAM iteration requires more verified accounts and consistent industry, size, geography, and workflow fields.',
    ],
    blueprint_coverage: {
      verified_blueprints: (blueprints.blueprints ?? []).filter((item) => item.status === 'hypothesis_blueprint').length,
      held_blueprints: (blueprints.blueprints ?? []).filter((item) => item.status === 'held').length,
    },
  };
}

const [, , reportPath = 'output/signal-report.json', verificationPath = 'output/evidence-verification.json', blueprintPath = 'output/diagnostic-blueprints.json'] = process.argv;
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const verification = JSON.parse(await fs.readFile(verificationPath, 'utf8'));
  const blueprints = JSON.parse(await fs.readFile(blueprintPath, 'utf8'));
  const output = buildTamMap(report, verification, blueprints);
  await fs.mkdir('output', { recursive: true });
  await fs.writeFile('output/tam-map.json', JSON.stringify(output, null, 2));
  const markdown = [
    '# Initial TAM and ICP Map',
    '',
    `Verified signals: **${output.evidence_summary.live_verified_signals}** of **${output.evidence_summary.total_signals}**.`,
    '',
    `## Recommended wedge: ${output.recommended_wedge.name}`,
    '',
    output.recommended_wedge.plain_english,
    '',
    `Why: ${output.recommended_wedge.why_this_wedge}`,
    '',
    `Commercial framing: ${output.recommended_wedge.service_not_technology}`,
    '',
    '## Observed problem clusters',
    '',
    ...output.observed_problem_clusters.flatMap((cluster) => [
      `### ${cluster.problem_id} — ${cluster.count} verified signal(s)`,
      `Segment: ${cluster.segment}`,
      `Observed companies: ${cluster.observed_companies.join(', ')}`,
      `Strong signal rule: ${cluster.strong_signal}`,
      '',
    ]),
    '## ICP hypothesis',
    '',
    `Must-have: ${output.icp_hypothesis.must_have.join(' | ')}`,
    `Preferred buyer context: ${output.icp_hypothesis.preferred_buyer_context.join(', ')}`,
    `Disqualifiers: ${output.icp_hypothesis.disqualifiers.join(' | ')}`,
    '',
    '## Course-method boundary',
    '',
    `Enrichment: ${output.collection_plan.enrichment_before_agent.join(', ')}.`,
    `Formula: ${output.collection_plan.formula_work.join(', ')}.`,
    `Agent: ${output.collection_plan.agent_work.join(', ')}.`,
    `Paid-data boundary: ${output.collection_plan.paid_data_boundary}`,
    '',
    '## Limitations',
    '',
    ...output.limitations.map((item) => `- ${item}`),
  ].join('\n');
  await fs.writeFile('output/tam-map.md', markdown);
  console.log(markdown);
}
