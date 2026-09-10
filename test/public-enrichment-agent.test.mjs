import test from 'node:test';
import assert from 'node:assert/strict';
import { assessPublicEnrichment, extractPublicPageFacts } from '../src/public-enrichment-agent.mjs';

const candidate = { account_name_candidate: 'ExampleCo' };
const html = '<html><head><title>ExampleCo launches workflow automation</title><link rel="canonical" href="https://example.test/news/launch"></head><body><article>ExampleCo launches an AI agent for marketing workflow automation. Contact us at hello@example.test.</article><a href="/contact">Contact</a></body></html>';

test('public page facts extract canonical URL, evidence, and public channels', () => {
  const facts = extractPublicPageFacts(html, 'https://news.google.com/rss/articles/example');
  assert.equal(facts.canonical_url, 'https://example.test/news/launch');
  assert.equal(facts.page_title, 'ExampleCo launches workflow automation');
  assert.equal(facts.public_email_addresses[0], 'hello@example.test');
  assert.equal(facts.public_contact_urls[0], 'https://news.google.com/contact');
  assert.equal(facts.evidence_anchors.length, 1);
});

test('relative canonical links are resolved against the fetched page URL', () => {
  const facts = extractPublicPageFacts('<link rel="canonical" href="/press-release/example">', 'https://publisher.test/article');
  assert.equal(facts.canonical_url, 'https://publisher.test/press-release/example');
});

test('enrichment requires entity evidence and a successful source response', () => {
  const facts = extractPublicPageFacts(html, 'https://example.test/news/launch');
  const result = assessPublicEnrichment(candidate, facts, null, { source_status: 200 });
  assert.equal(result.source_status, 'verified');
  assert.equal(result.company_site_status, 'not_checked');
  assert.equal(result.enrichment_confidence, 'medium');
});

test('a page without the candidate entity remains held', () => {
  const facts = extractPublicPageFacts('<title>Unrelated page</title><p>Marketing workflow automation.</p>', 'https://example.test/unrelated');
  const result = assessPublicEnrichment(candidate, facts, null, { source_status: 200 });
  assert.equal(result.source_status, 'held');
  assert.equal(result.enrichment_confidence, 'low');
});
