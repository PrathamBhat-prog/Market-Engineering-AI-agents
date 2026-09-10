import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCandidateResolution, extractPageMetadata } from '../src/candidate-resolution-agent.mjs';

const candidate = { account_name_candidate: 'Hightouch', source_url: 'https://news.google.com/rss/articles/real' };
const html = '<html><head><title>Hightouch announces AI agents for marketers</title><link rel="canonical" href="https://www.businesswire.com/news/home/real"></head><body><article>Hightouch is expanding AI agents for marketers.</article></body></html>';

test('page metadata extracts canonical publisher URL and title', () => {
  const metadata = extractPageMetadata(html, candidate.source_url);
  assert.equal(metadata.canonical_url, 'https://www.businesswire.com/news/home/real');
  assert.equal(metadata.page_title, 'Hightouch announces AI agents for marketers');
});

test('candidate resolves only when entity and publisher are confirmed', () => {
  const metadata = extractPageMetadata(html, candidate.source_url);
  const result = assessCandidateResolution(candidate, metadata, { status: 200 });
  assert.equal(result.resolution_status, 'resolved');
  assert.equal(result.entity_match, true);
  assert.equal(result.publisher_resolved, true);
});

test('Google News-only URL remains partial without canonical publisher evidence', () => {
  const metadata = extractPageMetadata('<title>Hightouch AI agents</title>', candidate.source_url);
  const result = assessCandidateResolution(candidate, metadata, { status: 200 });
  assert.equal(result.resolution_status, 'partial');
});
