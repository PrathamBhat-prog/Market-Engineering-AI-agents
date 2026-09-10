import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGoogleNewsUrl, parseRssXml } from './google-news-rss.mjs';

export const wedgeQueries = [
  '"marketing operations" SaaS reporting lead routing',
  '"marketing-to-sales" handoff RevOps software',
  '"AI agents" marketing workflow platform',
  'SaaS international expansion Europe GTM operations',
  'software acquisitions data go-to-market integration',
  'B2B software funding hiring go-to-market operations',
];

const MAX_SIGNAL_AGE_DAYS = 548;

const genericPhrases = /\b(best|guide|what are|examples?|career|insights?|how to|complete guide|software|tools|news and releases|my honest review|go-to picks)\b/i;

export function scoreSignal(signal) {
  const text = `${signal.raw_headline || ''} ${signal.publisher || ''}`;
  let score = 0;
  if (signal.signal_tags.funding) score += 3;
  if (signal.signal_tags.acquisition) score += 3;
  if (signal.signal_tags.expansion) score += 3;
  if (signal.signal_tags.ai_marketing) score += 3;
  if (signal.signal_tags.hiring) score += 2;
  if (/marketing operations|marketing-ops|RevOps|lead routing|handoff|go-to-market|GTM/i.test(text)) score += 2;
  if (genericPhrases.test(text)) score -= 4;
  if (!signal.account_name_candidate) score -= 2;
  return score;
}

export function isRecentSignal(signal, now = Date.now()) {
  const timestamp = Date.parse(signal.published_at || '');
  if (Number.isNaN(timestamp)) return false;
  const ageDays = (now - timestamp) / 86400000;
  return ageDays >= 0 && ageDays <= MAX_SIGNAL_AGE_DAYS;
}

async function fetchQuery(query) {
  const rssUrl = buildGoogleNewsUrl(query);
  try {
    const response = await fetch(rssUrl, { headers: { 'user-agent': 'MarketingEngineeringTAMCollector/1.0' } });
    const xml = await response.text();
    if (!response.ok) return { query, rss_url: rssUrl, http_status: response.status, signals: [], error: `Google News returned HTTP ${response.status}.` };
    const parsed = parseRssXml(xml, { query, rss_url: rssUrl });
    const signals = parsed.map((signal) => ({ ...signal, relevance_score: scoreSignal(signal) }));
    return { query, rss_url: rssUrl, http_status: response.status, signals };
  } catch (error) {
    return { query, rss_url: rssUrl, http_status: 0, signals: [], error: error instanceof Error ? error.message : String(error) };
  }
}

export function dedupeSignals(queryResults) {
  const unique = new Map();
  for (const result of queryResults) {
    for (const signal of result.signals) {
      const key = signal.source_url || `${signal.account_name_candidate}|${signal.raw_headline}`;
      if (!unique.has(key)) unique.set(key, signal);
    }
  }
  return [...unique.values()];
}

const [, , output = 'output/tam-news-signals.json'] = process.argv;
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const queryResults = await Promise.all(wedgeQueries.map(fetchQuery));
  const recentHighRelevance = queryResults.flatMap((result) => result.signals.filter((signal) => signal.relevance_score >= 4 && isRecentSignal(signal)));
  const candidateSignals = recentHighRelevance.filter((signal) => signal.account_name_candidate && !signal.requires_account_resolution);
  const unresolvedSignals = recentHighRelevance.filter((signal) => !signal.account_name_candidate || signal.requires_account_resolution);
  const signals = dedupeSignals([{ signals: candidateSignals }]).sort((a, b) => b.relevance_score - a.relevance_score);
  const unresolved = dedupeSignals([{ signals: unresolvedSignals }]).sort((a, b) => b.relevance_score - a.relevance_score);
  const result = {
    collected_at: new Date().toISOString(),
    collector: 'Google News RSS',
    query_count: wedgeQueries.length,
    successful_queries: queryResults.filter((item) => item.http_status >= 200 && item.http_status < 300).length,
    query_errors: queryResults.filter((item) => item.error).map(({ query, http_status, error }) => ({ query, http_status, error })),
    candidate_signal_count: signals.length,
    unresolved_signal_count: unresolved.length,
    excluded_low_relevance_count: queryResults.reduce((sum, result) => sum + result.signals.filter((signal) => signal.relevance_score < 4).length, 0),
    excluded_stale_count: queryResults.reduce((sum, result) => sum + result.signals.filter((signal) => signal.relevance_score >= 4 && !isRecentSignal(signal)).length, 0),
    signals,
    unresolved_signals: unresolved,
  };
  const outputPath = path.resolve(output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
  await fs.writeFile('output/tam-news-collection.md', [
    '# Live TAM Signal Collection',
    '',
    `Collected **${signals.length}** recent, high-relevance account candidates from **${result.successful_queries}/${result.query_count}** Google News RSS queries. Excluded **${result.excluded_low_relevance_count}** low-relevance headlines and **${result.excluded_stale_count}** stale headlines.`,
    '',
    'Account names are candidates extracted from headlines and must be resolved against the original article or company source before entering the qualification workflow.',
    '',
    ...signals.map((signal) => `- **${signal.account_name_candidate || 'Unresolved'}** — score ${signal.relevance_score} — ${signal.raw_headline} | ${signal.publisher || 'Unknown publisher'} | ${signal.published_at || 'No date'} | [source](${signal.source_url || '#'})`),
    '',
    `Unresolved recent high-signal headlines kept for later account resolution: **${unresolved.length}**.`,
  ].join('\n'));
  console.log(`Collected ${signals.length} unique live signals from ${result.successful_queries}/${result.query_count} queries.`);
}
