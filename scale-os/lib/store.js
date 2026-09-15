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
const PULSE_KEY = 'scale_os:pulse:v1';

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

// Real Prime Piece priorities as of Sep 2026 (see product-lab.js for what tier/
// priorityLane/status mean). Only used to seed a brand-new, empty database — an
// already-populated one is never force-upserted, so this never overwrites or
// duplicates rows James has already edited by hand.
function seedProducts() {
  return [
    {
      id: uid(), name: 'Signature Collection Vessel Basins', category: 'Vessel Basin',
      tier: 'CORE', priorityLane: 'Active', status: 'LAUNCH',
      notes: 'Launched September 2026. Primary goal: generate sales and learn which stones/creative/messages convert.',
    },
    {
      id: uid(), name: 'Stone Lighting', category: 'Lighting',
      tier: 'CORE', priorityLane: 'Research Candidate', status: 'RESEARCH',
      notes: 'Candidate for the next Core product test. Not yet approved.',
    },
    {
      id: uid(), name: 'Noir Side Tables', category: 'Furniture',
      tier: 'CORE', priorityLane: 'Maintain', status: 'SCALE',
    },
    {
      id: uid(), name: 'Boards', category: 'Boards & Trays',
      tier: 'ENTRY', priorityLane: 'Maintain', status: 'SCALE',
    },
    {
      id: uid(), name: 'Custom Tables & Plinths', category: 'Halo / Custom',
      tier: 'HALO', priorityLane: 'Maintain', status: 'SCALE',
    },
  ];
}

// Migrates legacy status values (pre stage-pipeline rework) to the current
// RESEARCH -> SAMPLE -> TEST -> VALIDATED -> LAUNCH -> SCALE -> HOLD -> KILL vocabulary.
// Deliberately never maps anything into LAUNCH: a product only reaches LAUNCH by
// someone actively setting it, since that stage means "genuinely launched," not
// "was far along in the old pipeline." Idempotent — new-style values pass through.
const STATUS_MIGRATION = {
  Idea: 'RESEARCH',
  Researching: 'RESEARCH',
  Sampling: 'SAMPLE',
  Testing: 'TEST',
  Validated: 'VALIDATED',
  Scaling: 'SCALE',
  Killed: 'KILL',
};

function migrateStatuses(products) {
  let changed = false;
  products.forEach((p) => {
    const mapped = STATUS_MIGRATION[p.status];
    if (mapped) {
      p.status = mapped;
      changed = true;
    }
  });
  return changed;
}

// --- One-time priority tagging (tier / priorityLane / status) for the 5 known
// Prime Piece priority products ---
//
// This was deliberately NOT built as a fuzzy-matcher. No sandbox this was developed
// in ever had network access or credentials to the real production Redis database
// to see actual row names first — so instead of guessing at spelling variations,
// this ships with an explicit, reviewable alias list (exact match only, after
// trim + case-fold) that starts out covering only the canonical names themselves.
// Every run reports, via console.log (visible in Vercel function logs and in the
// GitHub Actions worker's own log), exactly which of the 5 targets matched and
// which did not — so an unmatched target is surfaced for a human to extend the
// alias list with the real name, never guessed at silently.
//
// Marker-based, not condition-based: once a row is stamped `_priorityTagged`, it is
// never touched again by this function even if its tier/priorityLane are later
// cleared back to blank by hand — "must not overwrite later manual changes" holds
// even in that edge case.
const PRIORITY_ALIAS_MAP = {
  'Signature Collection Vessel Basins': { tier: 'CORE', priorityLane: 'Active', status: 'LAUNCH', aliases: ['Signature Collection Vessel Basins'] },
  'Stone Lighting': { tier: 'CORE', priorityLane: 'Research Candidate', status: 'RESEARCH', aliases: ['Stone Lighting'] },
  'Noir Side Tables': { tier: 'CORE', priorityLane: 'Maintain', status: 'SCALE', aliases: ['Noir Side Tables'] },
  'Boards': { tier: 'ENTRY', priorityLane: 'Maintain', status: 'SCALE', aliases: ['Boards'] },
  'Custom Tables & Plinths': { tier: 'HALO', priorityLane: 'Maintain', status: 'SCALE', aliases: ['Custom Tables & Plinths'] },
};

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function migratePriorities(products) {
  let changed = false;
  const matchedTargets = [];
  const unmatchedTargets = [];

  for (const [canonicalName, rule] of Object.entries(PRIORITY_ALIAS_MAP)) {
    const aliasSet = new Set(rule.aliases.map(norm));
    // Already applied to some row for this target? Nothing to do or report —
    // this is the steady-state case on every read after the first successful match.
    const alreadyTagged = products.some((p) => p._priorityTagged === canonicalName);
    if (alreadyTagged) continue;

    const candidates = products.filter((p) => !p._priorityTagged && aliasSet.has(norm(p.name)));
    if (candidates.length === 1) {
      const row = candidates[0];
      row.tier = rule.tier;
      row.priorityLane = rule.priorityLane;
      row.status = rule.status;
      row._priorityTagged = canonicalName;
      changed = true;
      matchedTargets.push({ canonicalName, matchedName: row.name, id: row.id });
    } else if (candidates.length > 1) {
      // Ambiguous — more than one row has this exact name. Never guess which one.
      unmatchedTargets.push({ canonicalName, reason: `${candidates.length} rows share an exact-match name — ambiguous, left untouched` });
    } else {
      unmatchedTargets.push({ canonicalName, reason: 'no exact-match row found' });
    }
  }

  if (matchedTargets.length || unmatchedTargets.length) {
    console.log('[store] Priority migration:', JSON.stringify({ matchedTargets, unmatchedTargets }));
  }
  return changed;
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
    const products = Array.isArray(parsed) ? parsed : seedProducts();
    const statusChanged = migrateStatuses(products);
    const priorityChanged = migratePriorities(products);
    if (statusChanged || priorityChanged) await saveProducts(products);
    return products;
  } catch {
    return seedProducts();
  }
}

export async function saveProducts(products) {
  await redisCommand(['SET', PRODUCTS_KEY, JSON.stringify(products)]);
}

// --- Pulse brief ---
// The one Claude synthesis call per scheduled Market Radar run (see
// scripts/market-radar/run.mjs, 'daily' mode) writes its output here: Today's Pulse,
// the Next $1,000 recommendation, and Today's 3 Moves, plus a timestamp and a summary
// of that run. The Dashboard only ever reads this — it never calls Claude itself, so
// opening Prime Piece Pulse never costs an API call or waits on one.
export async function getPulseBrief() {
  const raw = await redisCommand(['GET', PULSE_KEY]);
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function savePulseBrief(brief) {
  await redisCommand(['SET', PULSE_KEY, JSON.stringify(brief)]);
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
    tier: '', // Market Radar doesn't score HALO/CORE/ENTRY fit — set by hand in Product Lab.
    priorityLane: '',
    differentiation: scaleFromScore('differentiation'),
    tradePotential: scaleFromScore('designerTrade'),
    freightRisk: invertScaleFromScore('operationalRisk'),
    damageRisk: invertScaleFromScore('operationalRisk'),
    competition: undefined,
    evidenceSource: `Promoted from Market Radar (opportunity score ${item.opportunityScore ?? '—'}, confidence ${item.confidenceScore ?? '—'}). Sources: ${sourcesList || 'see Market Radar detail'}.`,
    confidence: item.confidenceScore >= 70 ? 'High' : item.confidenceScore >= 40 ? 'Medium' : 'Low',
    notes: item.marketGap?.description || '',
    status: 'RESEARCH',
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
