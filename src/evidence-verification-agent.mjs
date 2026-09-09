import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STOP_WORDS = new Set([
  'about', 'after', 'across', 'also', 'announced', 'announcement', 'because', 'being', 'between', 'company',
  'completed', 'describes', 'from', 'into', 'more', 'over', 'plans', 'reports', 'says', 'that', 'the', 'their',
  'this', 'through', 'with', 'would', 'which', 'will', 'year', 'years', 'said', 'states', 'according', 'including',
]);

const normalize = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

export function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractAnchors(item) {
  const source = [item.news_signal, item.product_signal, item.hiring_signal, item.evidence_summary].filter((value) => value && !['none', 'unknown'].includes(String(value).toLowerCase())).join(' ');
  const anchors = new Set();
  const company = normalize(item.company_name);
  if (company) anchors.add(company);
  for (const amount of source.matchAll(/(?:[$€£]\s?\d+(?:\.\d+)?\s?(?:m|b|million|billion)?|\d+(?:\.\d+)?\s?(?:m|b|million|billion)\s?(?:funding|investment|backing)?)/gi)) {
    anchors.add(normalize(amount[0]));
  }
  for (const word of normalize(source).split(/[^a-z0-9€£$-]+/)) {
    if (word.length >= 5 && !STOP_WORDS.has(word) && !/^\d+$/.test(word) && !/[0-9]/.test(word)) anchors.add(word);
  }
  return [...anchors];
}

export function classifyVerification(item, pageText, response = {}) {
  const status = Number(response.status || 0);
  if (response.error || status === 403 || status === 429 || status >= 500 || !status) {
    return { status: 'blocked', score: 0, matched_anchors: [], missing_anchors: extractAnchors(item).slice(0, 8), reason: response.error || `Source returned HTTP ${status || 'no response'}.` };
  }
  const text = normalize(pageText);
  const anchors = extractAnchors(item);
  const matched = anchors.filter((anchor) => text.includes(anchor));
  const companyAnchor = normalize(item.company_name);
  const important = anchors.filter((anchor) => anchor !== companyAnchor && (anchor.includes('$') || anchor.includes('€') || anchor.includes('£')));
  const score = anchors.length ? Math.round((matched.length / anchors.length) * 100) / 100 : 0;
  const hasCompany = matched.includes(companyAnchor);
  const hasImportant = important.some((anchor) => matched.includes(anchor));
  const nonCompanyMatches = matched.filter((anchor) => anchor !== companyAnchor).length;
  const resultStatus = hasCompany && (hasImportant || nonCompanyMatches >= 2) && nonCompanyMatches >= 2 ? 'verified' : matched.length >= 2 ? 'partial' : 'failed';
  return {
    status: resultStatus,
    score,
    matched_anchors: matched.slice(0, 12),
    missing_anchors: anchors.filter((anchor) => !matched.includes(anchor)).slice(0, 12),
    reason: resultStatus === 'verified'
      ? 'The fetched page contains the company name and at least two independent factual or signal anchors.'
      : resultStatus === 'partial'
        ? 'The fetched page contains some signal terms, but not enough independent anchors for verification.'
        : 'The fetched page did not contain enough of the recorded signal to support it.',
  };
}

async function fetchSource(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'MarketingEngineeringEvidenceVerifier/1.0 (+human-review-required)' },
    });
    const html = await response.text();
    return { status: response.status, final_url: response.url, html };
  } catch (error) {
    return { status: 0, final_url: url, html: '', error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyFinding(item) {
  const url = (item.evidence_urls ?? [])[0];
  if (!url) return { account_id: item.account_id, company_name: item.company_name, source_url: null, status: 'failed', score: 0, reason: 'No source URL was recorded.' };
  const fetched = await fetchSource(url);
  const checked = classifyVerification(item, htmlToText(fetched.html), fetched);
  return { account_id: item.account_id, company_name: item.company_name, source_url: url, final_url: fetched.final_url, http_status: fetched.status, ...checked };
}

const [, , reportPath = 'output/signal-report.json'] = process.argv;
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const results = [];
  for (const finding of report.findings ?? []) results.push(await verifyFinding(finding));
  const summary = Object.fromEntries(['verified', 'partial', 'blocked', 'failed'].map((status) => [status, results.filter((result) => result.status === status).length]));
  const output = { generated_at: new Date().toISOString(), source_report: path.resolve(reportPath), summary, results };
  await fs.mkdir('output', { recursive: true });
  await fs.writeFile('output/evidence-verification.json', JSON.stringify(output, null, 2));
  const markdown = [
    '# Evidence Verification Review',
    '',
    `Verified **${summary.verified}**, partial **${summary.partial}**, blocked **${summary.blocked}**, failed **${summary.failed}**.`,
    '',
    ...results.flatMap((result) => [
      `## ${result.status.toUpperCase()} — ${result.company_name}`,
      `HTTP: ${result.http_status ?? 'n/a'} | Match score: ${result.score ?? 0}`,
      `Reason: ${result.reason}`,
      `Matched anchors: ${(result.matched_anchors ?? []).join(', ') || 'None'}`,
      `Missing anchors: ${(result.missing_anchors ?? []).join(', ') || 'None'}`,
      `Source: ${result.source_url ? `[open source](${result.source_url})` : 'Not recorded'}`,
      '',
    ]),
  ].join('\n');
  await fs.writeFile('output/evidence-verification.md', markdown);
  console.log(markdown);
}
