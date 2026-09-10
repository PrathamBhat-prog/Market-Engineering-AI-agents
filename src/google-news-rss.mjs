import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const decode = (value) => String(value || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/gi, "'")
  .trim();

const field = (item, name) => decode(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? '');

function normalizeId(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function dateOnly(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? '' : new Date(parsed).toISOString().slice(0, 10);
}

export function identifyAccountCandidate(title) {
  const cleaned = String(title || '').replace(/^(exclusive|breaking|update)\s*:\s*/i, '').trim();
  const match = cleaned.match(/^(.{2,80}?)\s+(?:raises?|raised|launches?|launched|unveils?|announces?|announced|secures?|secured|acquires?|acquired|expands?|expanded|is hiring|hires?|introduces?|introduced|builds?|bets on|invests in)\b/i);
  if (!match) return null;
  const candidate = match[1].replace(/[,:-]\s*$/, '').trim();
  return candidate.length >= 2 && candidate.length <= 80 ? candidate : null;
}

export function parseRssXml(xml, metadata = {}) {
  const items = [...String(xml || '').matchAll(/<item[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  return items.map((item, index) => {
    const title = field(item, 'title');
    const url = field(item, 'link') || field(item, 'guid');
    const publisher = field(item, 'source');
    const publisherUrl = decode(item.match(/<source[^>]+url=["']([^"']+)["'][^>]*>/i)?.[1] ?? '');
    const publishedAt = field(item, 'pubDate');
    const accountNameCandidate = identifyAccountCandidate(title);
    const ambiguousAccountCandidate = Boolean(accountNameCandidate && /\band\b|&/i.test(accountNameCandidate));
    const text = `${title} ${publisher}`;
    return {
      signal_id: normalizeId(`${accountNameCandidate || title}-${publishedAt}-${index}`) || `rss-signal-${index + 1}`,
      account_id: normalizeId(accountNameCandidate) || null,
      account_name_candidate: accountNameCandidate || null,
      account_name_confidence: accountNameCandidate && !ambiguousAccountCandidate ? 'medium' : 'low',
      title,
      publisher: publisher || null,
      publisher_url: publisherUrl || null,
      published_at: publishedAt || null,
      signal_date: dateOnly(publishedAt),
      source_type: 'Google News RSS',
      source_url: url || null,
      evidence_urls: url ? [url] : [],
      signal_tags: {
        hiring: /hir(e|ing)|recruit|talent|job|staff/i.test(text),
        ai_marketing: /AI agent|AI agents|agentic|customer acquisition|advertising|SEO|social media|marketing workflow/i.test(text),
        expansion: /expand|expansion|international|Europe|EEA|new market|global/i.test(text),
        funding: /fund|funding|raised|investment|backing|Series [A-F]/i.test(text),
        acquisition: /acqui|merger|consolidat/i.test(text),
      },
      raw_headline: title,
      collection_query: metadata.query || null,
      rss_url: metadata.rss_url || null,
      requires_account_resolution: !accountNameCandidate || ambiguousAccountCandidate,
    };
  });
}

export function buildGoogleNewsUrl(query, options = {}) {
  const hl = options.hl || 'en-US';
  const gl = options.gl || 'US';
  const ceid = options.ceid || 'US:en';
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`;
}

const [, , source, output = 'examples/news-signals.json'] = process.argv;
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  if (!source) {
    console.error('Usage: node src/google-news-rss.mjs <rss-url-or-file> [output.json]');
    process.exit(1);
  }
  const rssUrl = source.startsWith('http://') || source.startsWith('https://') ? source : null;
  const xml = rssUrl
    ? await (await fetch(rssUrl, { headers: { 'user-agent': 'MarketingEngineeringSignalMonitor/1.0' } })).text()
    : await fs.readFile(source, 'utf8');
  const signals = parseRssXml(xml, { rss_url: rssUrl });
  const outputPath = path.resolve(output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(signals, null, 2));
  console.log(`Wrote ${signals.length} signals to ${outputPath}`);
}
