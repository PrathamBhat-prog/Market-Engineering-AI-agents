import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapSignalToService } from './service-fit-agent.mjs';

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CONTACT_PATH_PATTERN = /(?:contact|talk-to-sales|book-a-demo|request-a-demo|demo|sales)/i;
const SIGNAL_TERMS = /(?:AI agent|agentic|marketing|workflow|automation|data integration|sales automation|acquisition|expansion|hiring|funding|investment|reporting|lead routing|go-to-market|GTM)/i;

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

export function extractPublicPageFacts(html, pageUrl) {
  const source = String(html || '');
  const rawCanonical = decodeHtml(source.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]
    || source.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] || pageUrl);
  let canonical = rawCanonical;
  try { canonical = new URL(rawCanonical, pageUrl).toString(); } catch { /* leave unresolved */ }
  const pageTitle = decodeHtml(source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const links = [...source.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ href: decodeHtml(match[1]), text: decodeHtml(match[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() }));
  const pageText = decodeHtml(source.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const sentences = pageText.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  const evidenceAnchors = sentences.filter((sentence) => SIGNAL_TERMS.test(sentence)).slice(0, 5);
  const emails = [...new Set((pageText.match(EMAIL_PATTERN) || []).map((email) => email.toLowerCase()))];
  const contactUrls = [...new Set(links.filter(({ href, text }) => CONTACT_PATH_PATTERN.test(`${href} ${text}`)).map(({ href }) => {
    try { return new URL(href, pageUrl).toString(); } catch { return href; }
  }))];
  let host = null;
  try { host = new URL(canonical).hostname; } catch { /* leave unknown */ }
  return { canonical_url: canonical || null, page_title: pageTitle || null, publisher_host: host, page_text_length: pageText.length, evidence_anchors: evidenceAnchors, public_email_addresses: emails, public_contact_urls: contactUrls };
}

export function assessPublicEnrichment(candidate, sourceFacts, companyFacts = null, responses = {}) {
  const account = String(candidate.account_name_candidate || '').toLowerCase().trim();
  const sourceText = `${sourceFacts?.page_title || ''} ${(sourceFacts?.evidence_anchors || []).join(' ')}`.toLowerCase();
  const entityMatch = Boolean(account && sourceText.includes(account));
  const sourceStatus = Number(responses.source_status || 0);
  const sourceVerified = sourceStatus >= 200 && sourceStatus < 400 && entityMatch && (sourceFacts?.evidence_anchors || []).length > 0;
  const companyStatus = Number(responses.company_status || 0);
  const companyVerified = Boolean(companyFacts && companyStatus >= 200 && companyStatus < 400 && companyFacts.canonical_url);
  return { source_status: sourceVerified ? 'verified' : 'held', source_entity_match: entityMatch, company_site_status: companyVerified ? 'verified' : companyFacts ? 'held' : 'not_checked', enrichment_confidence: sourceVerified && companyVerified ? 'high' : sourceVerified ? 'medium' : 'low' };
}

async function fetchFacts(url) {
  if (!url) return { status: 0, error: 'No URL supplied.' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'MarketingEngineeringPublicEnrichment/1.0' } });
    const html = await response.text();
    return { status: response.status, facts: extractPublicPageFacts(html, response.url || url), final_url: response.url || url };
  } catch (error) {
    return { status: 0, error: error instanceof Error ? error.message : String(error) };
  } finally { clearTimeout(timeout); }
}

function mergeContactChannels(sourceFacts, companyFacts, companyUrl) {
  let companyHost = '';
  try { companyHost = new URL(companyFacts?.canonical_url || companyUrl).hostname.replace(/^www\./, ''); } catch { /* no company host */ }
  const companyEmails = (companyFacts?.public_email_addresses || []).filter((email) => email.split('@')[1] === companyHost);
  const sourceCompanyEmails = (sourceFacts?.public_email_addresses || []).filter((email) => email.split('@')[1] === companyHost);
  return {
    public_email_addresses: [...new Set([...sourceCompanyEmails, ...companyEmails])],
    public_contact_urls: [...new Set(companyFacts?.public_contact_urls || [])],
    excluded_publisher_contacts: (sourceFacts?.public_email_addresses || []).filter((email) => !companyEmails.includes(email) && !sourceCompanyEmails.includes(email)),
  };
}

export async function enrichCandidate(candidate, override = {}) {
  const sourceUrl = override.direct_source_url || override.source_url || candidate.source_url;
  const companyUrl = override.company_url || null;
  const sourceResponse = await fetchFacts(sourceUrl);
  const companyResponse = companyUrl ? await fetchFacts(companyUrl) : null;
  const sourceFacts = sourceResponse.facts || { canonical_url: sourceUrl || null, evidence_anchors: [] };
  const companyFacts = companyResponse?.facts || null;
  const tagText = Object.entries(candidate.signal_tags || {})
    .filter(([, enabled]) => enabled)
    .map(([tag]) => tag.replace(/_/g, ' '))
    .join(' ');
  const serviceFit = mapSignalToService({
    company_name: candidate.account_name_candidate,
    news_signal: `${candidate.raw_headline || ''} ${tagText}`,
    product_signal: candidate.signal_tags?.ai_marketing ? 'AI marketing workflow signal' : '',
    hiring_signal: candidate.signal_tags?.hiring ? 'hiring signal' : '',
    source_type: candidate.source_type,
    evidence_urls: [sourceUrl].filter(Boolean),
  });
  const quality = assessPublicEnrichment(candidate, sourceFacts, companyFacts, { source_status: sourceResponse.status, company_status: companyResponse?.status });
  return {
    signal_id: candidate.signal_id,
    account_name: candidate.account_name_candidate || null,
    original_headline: candidate.raw_headline || candidate.title || null,
    signal_date: candidate.signal_date || null,
    signal_tags: candidate.signal_tags || {},
    source: { requested_url: sourceUrl || null, final_url: sourceResponse.final_url || null, canonical_url: sourceFacts.canonical_url || null, page_title: sourceFacts.page_title || null, http_status: sourceResponse.status || 0, evidence_anchors: sourceFacts.evidence_anchors || [] },
    company_site: companyUrl ? { requested_url: companyUrl, final_url: companyResponse?.final_url || null, canonical_url: companyFacts?.canonical_url || null, page_title: companyFacts?.page_title || null, http_status: companyResponse?.status || 0, evidence_anchors: companyFacts?.evidence_anchors || [] } : null,
    public_contact_channels: mergeContactChannels(sourceFacts, companyFacts, companyUrl),
    service_fit: serviceFit,
    quality,
    policy: { public_data_collection_allowed: true, company_owned_contact_channels_only: true, outreach_or_email_sent: false, outreach_requires_explicit_user_approval: true },
  };
}

async function main() {
  const [, , inputPath = 'output/tam-news-signals.json', overridesPath = 'output/tam-source-overrides.json', outputPath = 'output/tam-public-enrichment.json'] = process.argv;
  const collection = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  let overrides = {};
  try { overrides = JSON.parse(await fs.readFile(overridesPath, 'utf8')); } catch { /* optional local-only override file */ }
  const results = [];
  for (const candidate of collection.signals || []) results.push(await enrichCandidate(candidate, overrides[candidate.signal_id] || {}));
  const summary = { candidates_checked: results.length, source_verified: results.filter((item) => item.quality.source_status === 'verified').length, company_sites_verified: results.filter((item) => item.quality.company_site_status === 'verified').length, held: results.filter((item) => item.quality.source_status !== 'verified').length, public_contact_channels_found: results.filter((item) => item.public_contact_channels.public_email_addresses.length || item.public_contact_channels.public_contact_urls.length).length, outreach_sent: 0 };
  const output = { enriched_at: new Date().toISOString(), source_collection: path.resolve(inputPath), local_overrides_file: path.resolve(overridesPath), summary, results };
  const resolvedOutput = path.resolve(outputPath);
  await fs.mkdir(path.dirname(resolvedOutput), { recursive: true });
  await fs.writeFile(resolvedOutput, JSON.stringify(output, null, 2));
  await fs.writeFile('output/tam-public-enrichment.md', ['# Public TAM Enrichment', '', `Checked **${summary.candidates_checked}** candidates: source verified **${summary.source_verified}**, company sites verified **${summary.company_sites_verified}**, held **${summary.held}**.`, '', 'This is public-data research only. No person was contacted and no email was sent.', '', ...results.flatMap((item) => [`## ${item.account_name || 'Unresolved'} — ${item.quality.source_status}`, `Source: ${item.source.canonical_url || 'Not resolved'} | Company site: ${item.company_site?.canonical_url || 'Not checked'}`, `Service hypothesis: ${item.service_fit.service_offer || 'None'} (${item.service_fit.service_fit_status})`, `Public channels found: ${item.public_contact_channels.public_email_addresses.length + item.public_contact_channels.public_contact_urls.length}`, `Next step: ${item.service_fit.validation_step}`, '']),].join('\n'));
  console.log(`Enriched ${summary.candidates_checked} candidates; verified ${summary.source_verified} source pages.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) await main();
