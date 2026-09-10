import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleNewsUrl, parseRssXml } from '../src/google-news-rss.mjs';
import { dedupeSignals, isRecentSignal, scoreSignal } from '../src/tam-signal-collector.mjs';

const realSourceUrl = 'https://techcrunch.com/2026/08/26/runable-hits-21m-to-bet-ai-agents-can-go-from-building-businesses-to-growing-them/';
const rss = `<rss><channel><item><title>Runable raises $21M to expand AI agents | TechCrunch</title><link>${realSourceUrl}</link><pubDate>Wed, 26 Aug 2026 00:00:00 GMT</pubDate><source url="https://techcrunch.com">TechCrunch</source></item></channel></rss>`;

test('Google News URL preserves query parameters', () => {
  const url = buildGoogleNewsUrl('"AI agents" marketing workflow');
  assert.match(url, /^https:\/\/news\.google\.com\/rss\/search\?q=/);
  assert.match(url, /hl=en-US/);
  assert.match(url, /ceid=US%3Aen/);
});

test('RSS parsing preserves provenance and marks account resolution as required', () => {
  const [signal] = parseRssXml(rss, { query: 'AI agents marketing', rss_url: 'https://news.google.com/rss/search?q=AI' });
  assert.equal(signal.account_name_candidate, 'Runable');
  assert.equal(signal.publisher, 'TechCrunch');
  assert.equal(signal.signal_date, '2026-08-26');
  assert.equal(signal.source_url, realSourceUrl);
  assert.equal(signal.requires_account_resolution, false);
});

test('collector deduplicates the same article returned by multiple queries', () => {
  const parsed = parseRssXml(rss, { query: 'AI agents marketing' });
  const result = dedupeSignals([{ signals: parsed }, { signals: parsed }]);
  assert.equal(result.length, 1);
});

test('generic listicles score below trigger headlines', () => {
  const [generic] = parseRssXml('<rss><item><title>10 Best Marketing Automation Tools in 2026 | G2</title><source>G2</source></item></rss>');
  const [trigger] = parseRssXml(rss, { query: 'AI agents marketing' });
  assert.ok(scoreSignal(trigger) > scoreSignal(generic));
  assert.ok(scoreSignal(generic) < 4);
});

test('stale headlines are excluded from the current TAM batch', () => {
  assert.equal(isRecentSignal({ published_at: 'Thu, 01 Jan 2020 00:00:00 GMT' }, Date.parse('2026-09-10T00:00:00Z')), false);
  assert.equal(isRecentSignal({ published_at: 'Mon, 01 Sep 2026 00:00:00 GMT' }, Date.parse('2026-09-10T00:00:00Z')), true);
});

test('multi-company headlines remain unresolved', () => {
  const [signal] = parseRssXml('<rss><item><title>Microsoft and Publicis expand partnership to push agentic AI into marketing workflows | News</title><link>https://news.google.com/rss/articles/real</link><pubDate>Fri, 10 Apr 2026 00:00:00 GMT</pubDate><source>News</source></item></rss>');
  assert.equal(signal.account_name_candidate, 'Microsoft and Publicis');
  assert.equal(signal.requires_account_resolution, true);
  assert.equal(signal.account_name_confidence, 'low');
});
