import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { classifyVerification, extractAnchors, htmlToText } from '../src/evidence-verification-agent.mjs';

const signals = JSON.parse(await fs.readFile(new URL('../examples/signals-current.json', import.meta.url), 'utf8'));
const mollie = signals.find((item) => item.account_id === 'mollie');

test('anchors preserve factual company and funding signals', () => {
  const anchors = extractAnchors(mollie);
  assert.ok(anchors.includes('mollie'));
  assert.ok(anchors.some((anchor) => anchor.includes('€350m')));
  assert.ok(anchors.includes('infrastructure'));
});

test('matching company, amount, and signal terms verifies a source', () => {
  const pageText = htmlToText('<html><body>Mollie completed operations across all EEA countries and committed €350M over five years to expand its product offering, infrastructure, and team.</body></html>');
  const result = classifyVerification(mollie, pageText, { status: 200 });
  assert.equal(result.status, 'verified');
  assert.ok(result.matched_anchors.length >= 3);
});

test('a successful page with weak matching remains partial or failed', () => {
  const result = classifyVerification(mollie, 'Mollie is a payments company.', { status: 200 });
  assert.notEqual(result.status, 'verified');
});

test('blocked pages are never treated as verified', () => {
  const result = classifyVerification(mollie, '', { status: 403 });
  assert.equal(result.status, 'blocked');
  assert.equal(result.score, 0);
});
