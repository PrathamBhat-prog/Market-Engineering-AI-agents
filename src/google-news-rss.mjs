import fs from 'node:fs/promises';
import path from 'node:path';

const [, , source, output = 'examples/news-signals.json'] = process.argv;
if (!source) {
  console.error('Usage: node src/google-news-rss.mjs <rss-url-or-file> [output.json]');
  process.exit(1);
}

const xml = source.startsWith('http://') || source.startsWith('https://')
  ? await (await fetch(source, { headers: { 'user-agent': 'MarketingEngineeringSignalMonitor/0.1' } })).text()
  : await fs.readFile(source, 'utf8');

const decode = (value) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const field = (item, name) => decode(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? '');
const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((match) => match[0]);
const signals = items.map((item, index) => {
  const title = field(item, 'title');
  const url = field(item, 'link');
  const account = title.split(/\s[|—-]\s/)[0].trim() || `news-account-${index + 1}`;
  return {
    account_id: account.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    company_name: account,
    pricing: 'unknown',
    hiring_signal: /hir(e|ing)|recruit|talent|job|staff/i.test(title) ? 'news hiring signal' : 'none',
    product_signal: /launch|release|product|platform|expan|fund|acqui|partnership/i.test(title) ? title : 'none',
    evidence_urls: url ? [url] : [],
    news_signal: title,
    news_source: field(item, 'source'),
    published_at: field(item, 'pubDate'),
  };
});

const outputPath = path.resolve(output);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(signals, null, 2));
console.log(`Wrote ${signals.length} signals to ${outputPath}`);
