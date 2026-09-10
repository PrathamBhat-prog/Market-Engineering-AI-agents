import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEWS_HOSTS = new Set(['news.google.com', 'google.com', 'www.google.com']);
const normalize = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

export function extractPageMetadata(html, fallbackUrl) {
  const source = String(html || '');
  const canonical = source.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]
    || source.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1]
    || fallbackUrl;
  const title = (source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
    .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const text = source.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  let host = '';
  try { host = new URL(canonical).hostname; } catch { /* preserve unresolved URL */ }
  return { canonical_url: canonical, publisher_host: host, page_title: title, page_text: text };
}

export function assessCandidateResolution(candidate, metadata, response = {}) {
  const account = normalize(candidate.account_name_candidate);
  const pageText = normalize(`${metadata.page_title} ${metadata.page_text}`);
  const entityMatch = Boolean(account && pageText.includes(account));
  let canonicalHost = '';
  try { canonicalHost = new URL(metadata.canonical_url).hostname; } catch { /* unresolved */ }
  const publisherResolved = Boolean(canonicalHost && !NEWS_HOSTS.has(canonicalHost));
  const httpOk = Number(response.status || 0) >= 200 && Number(response.status || 0) < 400;
  const status = httpOk && entityMatch && publisherResolved ? 'resolved' : httpOk && entityMatch ? 'partial' : 'held';
  return {
    resolution_status: status,
    entity_match: entityMatch,
    publisher_resolved: publisherResolved,
    http_status: response.status || 0,
    reason: status === 'resolved'
      ? 'The publisher page resolved, exposes a canonical URL, and contains the candidate account name.'
      : status === 'partial'
        ? 'The page contains the candidate account name, but the canonical publisher URL could not be confirmed.'
        : 'The candidate is held because the publisher page or account-name match could not be confirmed.',
  };
}

async function resolveCandidate(candidate) {
  const url = candidate.source_url;
  if (!url) return { ...candidate, resolution_status: 'held', publisher_homepage: candidate.publisher_url || null, reason: 'No source URL was recorded.' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'MarketingEngineeringCandidateResolver/1.0' } });
    const html = await response.text();
    const metadata = extractPageMetadata(html, response.url || url);
    return { ...candidate, publisher_homepage: candidate.publisher_url || null, ...metadata, ...assessCandidateResolution(candidate, metadata, response), page_text: undefined };
  } catch (error) {
    return { ...candidate, publisher_homepage: candidate.publisher_url || null, resolution_status: 'held', http_status: 0, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

const [, , inputPath = 'output/tam-news-signals.json'] = process.argv;
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const collection = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  const results = [];
  for (const candidate of collection.signals ?? []) results.push(await resolveCandidate(candidate));
  const summary = {
    candidates_checked: results.length,
    resolved: results.filter((item) => item.resolution_status === 'resolved').length,
    partial: results.filter((item) => item.resolution_status === 'partial').length,
    held: results.filter((item) => item.resolution_status === 'held').length,
  };
  const output = { resolved_at: new Date().toISOString(), source_collection: path.resolve(inputPath), summary, results };
  await fs.mkdir('output', { recursive: true });
  await fs.writeFile('output/tam-candidate-resolution.json', JSON.stringify(output, null, 2));
  await fs.writeFile('output/tam-candidate-resolution.md', [
    '# TAM Candidate Source Resolution',
    '',
    `Checked **${summary.candidates_checked}** candidates: resolved **${summary.resolved}**, partial **${summary.partial}**, held **${summary.held}**.`,
    '',
    ...results.flatMap((item) => [
      `## ${item.resolution_status.toUpperCase()} — ${item.account_name_candidate || 'Unresolved'}`,
      `Publisher: ${item.publisher || 'Unknown'} | HTTP: ${item.http_status || 'n/a'} | Entity match: ${item.entity_match ? 'yes' : 'no'}`,
      `Page title: ${item.page_title || 'Not available'}`,
      `Reason: ${item.reason}`,
      `Canonical URL: ${item.canonical_url || 'Not available'}`,
      `Publisher homepage: ${item.publisher_homepage || 'Not available'}`,
      `RSS source: ${item.source_url || 'Not available'}`,
      '',
    ]),
  ].join('\n'));
  console.log(`Resolved ${summary.resolved}/${summary.candidates_checked} live TAM candidates.`);
}
