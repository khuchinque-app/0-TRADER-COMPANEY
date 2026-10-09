// scripts/gen-routes.mjs — fetch indodax.com sitemaps, emit packages/indodax-routes/routes.json
// Usage: node scripts/gen-routes.mjs
// Fallback: reads ./indodax.sitemap.xml.txt if network fails (marks generatedAt stale).
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'packages', 'indodax-routes');
const OUT_FILE = path.join(OUT_DIR, 'routes.json');
const FALLBACK = path.join(ROOT, 'indodax.sitemap.xml.txt');

const BASE = 'https://indodax.com/sitemap';
const CHILDREN = [
  { name: 'homepage', url: `${BASE}/homepage.xml` },
  { name: 'market', url: `${BASE}/market.xml` },
  { name: 'depth_chart', url: `${BASE}/depth_chart.xml` },
  { name: 'chart', url: `${BASE}/chart.xml` },
];

function locs(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) =>
    decodeURIComponent(m[1].replace(/^https?:\/\/[^/]+/i, '')).replace(/\/$/, '')
  );
}

async function fetchChild(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'routes-gen/1.0' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } catch {
    return null;
  }
}

// Split an indodax slug into { base, quote } stripping the quote suffix ONCE from the end.
// Edge cases: IDRXIDR, IDRTIDR, NEOIDRIDR, GOIDRIDR, GLIDRIDR, INDRIDR, USDTIDR, IDRXUSDT.
export function splitSlug(slug) {
  if (slug.endsWith('IDR') && !slug.endsWith('USDT')) {
    // order matters: longest suffix first to handle NEOIDRIDR (base NEOIDR? no — strip once => base NEOIDR, quote IDR)
    return { base: slug.slice(0, -3), quote: 'IDR' };
  }
  if (slug.endsWith('USDT')) return { base: slug.slice(0, -4), quote: 'USDT' };
  if (slug.endsWith('IDR')) return { base: slug.slice(0, -3), quote: 'IDR' };
  return { base: slug, quote: 'IDR' };
}

const results = {};
let stale = false;
for (const c of CHILDREN) {
  const xml = await fetchChild(c.url);
  if (xml) {
    results[c.name] = locs(xml);
  } else {
    stale = true;
    const fb = existsSync(FALLBACK) ? readFileSync(FALLBACK, 'utf8') : '';
    // fallback file: one URL per line or full xml; tag each loc with its sitemap
    const lines = fb.split('\n').map((l) => l.trim()).filter(Boolean);
    results[c.name] = lines.filter((l) => l.includes(`/${c.name === 'homepage' ? '' : 'market/'}`).length || l.includes('/'));
    if (c.name === 'homepage') results[c.name] = lines.filter((l) => !/\/(market|chart)/.test(l));
    if (c.name === 'market') results[c.name] = lines.filter((l) => /^\/market\/[^/]+$/.test(l));
    if (c.name === 'depth_chart') results[c.name] = lines.filter((l) => l.startsWith('/market/depth_chart/'));
    if (c.name === 'chart') results[c.name] = lines.filter((l) => l.startsWith('/chart/'));
    if (!results[c.name].length) {
      console.error(`FATAL: no data for ${c.name} and no usable fallback at ${FALLBACK}`);
      process.exit(1);
    }
  }
}

const marketSet = new Set(results.market || []);
const chartSet = new Set(results.chart || []);
const depthSet = new Set(results.depth_chart || []);

// Collect pair slugs from market + depth_chart + chart
const slugMap = new Map();
function addPair(slug, key) {
  if (!/^[A-Z0-9]+$/.test(slug)) return; // only uppercase pair slugs
  if (key !== 'market' && key !== ' depth_chart' && key !== 'chart') {}
  const e = slugMap.get(slug) || { slug, base: splitSlug(slug).base, quote: splitSlug(slug).quote, inMarket: false, inDepth: false, inChart: false };
  if (key === 'market') e.inMarket = true;
  if (key === 'depth_chart') e.inDepth = true;
  if (key === 'chart') e.inChart = true;
  slugMap.set(slug, e);
}
for (const l of marketSet) {
  const m = l.match(/^\/market\/([A-Z0-9]+)$/);
  if (m && !l.includes('depth_chart')) addPair(m[1], 'market');
}
for (const l of depthSet) {
  const m = l.match(/^\/market\/depth_chart\/([A-Z0-9]+)$/);
  if (m) addPair(m[1], 'depth_chart');
}
for (const l of chartSet) {
  const m = l.match(/^\/chart\/([A-Z0-9]+)$/);
  if (m) addPair(m[1], 'chart');
}

const pairs = [...slugMap.values()].sort((a, b) => a.slug.localeCompare(b.slug));

// static = homepage locs
const staticRoutes = [...(results.homepage || [])];

const manifest = {
  generatedAt: new Date().toISOString(),
  stale,
  static: staticRoutes,
  pairs,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + '\n');

// Summary only
console.log(`generatedAt: ${manifest.generatedAt}${stale ? '  (STALE — fallback used)' : ''}`);
console.log(`static:  ${staticRoutes.length}`);
console.log(`market:  ${marketSet.size}  depth_chart: ${depthSet.size}  chart: ${chartSet.size}`);
console.log(`union pairs: ${pairs.length}`);
const onlyDepth = pairs.filter((p) => p.inDepth && !p.inMarket).map((p) => p.slug);
const onlyChart = pairs.filter((p) => p.inChart && !p.inMarket).map((p) => p.slug);
if (onlyDepth.length) console.log(`in depth_chart but not market: ${onlyDepth.join(', ')}`);
if (onlyChart.length) console.log(`in chart but not market:      ${onlyChart.join(', ')}`);
