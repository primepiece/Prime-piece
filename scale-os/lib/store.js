// Persistent storage for Scale OS data — a Redis/KV database (Vercel Marketplace → Redis,
// Upstash-backed) accessed via its plain REST API, no SDK. The whole Product Lab product
// list is stored as a single JSON value under one key: this is a "which product should we
// test next" tool for one founder, not a system with concurrent writers or complex queries,
// so one key holding one JSON array is the right amount of database for the job.
//
// Set up once in the Vercel dashboard: Project → Storage → connect a Redis database (Marketplace
// → Redis / Upstash). That automatically injects KV_REST_API_URL + KV_REST_API_TOKEN (or, if
// Upstash was connected directly rather than through Vercel's own integration card,
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) — either naming is supported below.

const PRODUCTS_KEY = 'scale_os:products:v1';
const RADAR_KEY = 'scale_os:radar:v1';

function credentials() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

export function isStoreConfigured() {
  const { url, token } = credentials();
  return Boolean(url && token);
}

async function redisCommand(command) {
  const { url, token } = credentials();
  if (!url || !token) throw new Error('No Redis/KV database connected to this project yet.');

  // Diagnostic logging is failure-path only — nothing here changes on a successful
  // call, so this doesn't alter Redis behavior for Product Lab or anything else that
  // already depends on this function. Never logs the URL/token — only the op name
  // (command[0], e.g. "GET"/"SET") and, on failure, the HTTP status / safe error text.
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
  } catch (err) {
    const cause = err?.cause ? (err.cause.code || err.cause.message || String(err.cause)) : null;
    console.error(`[store] Redis ${command[0]} request failed (network): ${err.message}${cause ? ` (cause: ${cause})` : ''}`);
    throw err;
  }

  const bodyText = await res.text();
  let data = null;
  try { data = JSON.parse(bodyText); } catch { /* handled below */ }
  if (!res.ok || !data || data.error) {
    const safeBody = bodyText.length > 400 ? bodyText.slice(0, 400) + '…' : bodyText;
    console.error(`[store] Redis ${command[0]} request failed: HTTP ${res.status} — ${data?.error || safeBody || '(empty body)'}`);
    throw new Error(`Storage request failed: ${data?.error || res.status}`);
  }
  return data.result;
}

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

function seedProducts() {
  return [
    { id: uid(), name: 'Carrara Natural Stone Basin', category: 'Vessel Basin', status: 'Idea' },
    { id: uid(), name: 'Beige Travertine Basin', category: 'Vessel Basin', status: 'Idea' },
    { id: uid(), name: '#41 Fluted Round Basin', category: 'Vessel Basin', status: 'Idea' },
  ];
}

export async function getProducts() {
  const raw = await redisCommand(['GET', PRODUCTS_KEY]);
  if (raw === null || raw === undefined) {
    const seeded = seedProducts();
    await saveProducts(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedProducts();
  } catch {
    return seedProducts();
  }
}

export async function saveProducts(products) {
  await redisCommand(['SET', PRODUCTS_KEY, JSON.stringify(products)]);
}

// --- Market Radar ---
// A broader, continuously-refreshable opportunity universe, separate from Product Lab
// (which is only the products Prime Piece is seriously investigating). Written by the
// GitHub Actions research worker (scripts/market-radar/run.mjs) using the same Redis
// REST API this file uses; read here for display and for "promote to Product Lab".

export async function getRadarOpportunities() {
  const raw = await redisCommand(['GET', RADAR_KEY]);
  if (raw === null || raw === undefined) {
    const { RADAR_SEED_DATA } = await import('./radar-seed.js');
    await saveRadarOpportunities(RADAR_SEED_DATA);
    return RADAR_SEED_DATA;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveRadarOpportunities(opportunities) {
  await redisCommand(['SET', RADAR_KEY, JSON.stringify(opportunities)]);
}

function radarUid() {
  return 'r_' + Math.random().toString(36).slice(2, 10);
}

// Maps a radar opportunity's structured evidence into a fresh Product Lab row.
// Only fields Market Radar actually has evidence for are filled — supplier cost,
// freight, packaging etc. stay blank, exactly like every other Product Lab entry,
// since no radar item has real supplier pricing.
function mapRadarItemToProduct(item) {
  const sb = item.scoreBreakdown || {};
  const scaleFromScore = (dim) => {
    const v = sb[dim]?.score;
    if (typeof v !== 'number') return undefined;
    return Math.max(1, Math.min(5, Math.round(v / 20))); // 0-100 -> 1-5
  };
  const invertScaleFromScore = (dim) => {
    const v = scaleFromScore(dim);
    return v === undefined ? undefined : 6 - v;
  };

  const sourcesList = (item.sources || []).map((s) => s.title || s.url).join(', ');

  return {
    id: radarUid(),
    name: item.variant ? `${item.product} — ${item.variant}` : item.product,
    category: item.category || '',
    differentiation: scaleFromScore('differentiation'),
    tradePotential: scaleFromScore('designerTrade'),
    freightRisk: invertScaleFromScore('operationalRisk'),
    damageRisk: invertScaleFromScore('operationalRisk'),
    competition: undefined,
    evidenceSource: `Promoted from Market Radar (opportunity score ${item.opportunityScore ?? '—'}, confidence ${item.confidenceScore ?? '—'}). Sources: ${sourcesList || 'see Market Radar detail'}.`,
    confidence: item.confidenceScore >= 70 ? 'High' : item.confidenceScore >= 40 ? 'Medium' : 'Low',
    notes: item.marketGap?.description || '',
    status: 'Idea',
    me_comparableCompetitors: (item.competitors || []).map((c) => `${c.name}${c.country ? ' (' + c.country + ')' : ''}`).join(', '),
    me_comparableRetailPrices: item.priceBand ? `${item.priceBand.currency || ''}${item.priceBand.low ?? '?'}-${item.priceBand.high ?? '?'}` : '',
    me_apparentMarketDemand: scaleFromScore('demandEvidence'),
    me_apparentMarketDemandType: item.demandSignal?.type || '',
    me_evidenceSources: sourcesList,
    me_confidenceLevel: item.confidenceScore >= 70 ? 'High' : item.confidenceScore >= 40 ? 'Medium' : 'Low',
    me_dateLastResearched: item.lastResearched || '',
    me_keyTakeaway: item.marketGap?.description || '',
  };
}

// Promotes one radar opportunity into Product Lab: appends a mapped row to the
// products list and marks the radar item as promoted. Returns the new product id.
export async function promoteRadarItem(radarId) {
  const [opportunities, products] = await Promise.all([getRadarOpportunities(), getProducts()]);
  const item = opportunities.find((o) => o.id === radarId);
  if (!item) throw new Error('Opportunity not found');

  const product = mapRadarItemToProduct(item);
  products.push(product);
  item.promotedToProductLab = true;
  item.promotedAt = new Date().toISOString();
  item.productLabId = product.id;

  await Promise.all([saveProducts(products), saveRadarOpportunities(opportunities)]);
  return product.id;
}
