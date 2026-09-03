// Market Radar research worker — runs on GitHub Actions (workflow_dispatch, manual
// trigger only in V1), NOT on Vercel. Keeping this off Vercel avoids the Hobby plan's
// 12-serverless-function cap entirely and sidesteps Vercel's execution-time limits for
// what can be a multi-web-search, multi-minute research pass.
//
// V1 covers 4 of the 8 conceptual agents from the Market Intelligence Engine design:
//   - Opportunity Hunter   -> huntCandidates()   (one web-search-backed Claude call)
//   - Competitor Scout,
//     Trend Scanner,
//     Review Miner,
//     Market Gap Finder,
//     Economics Potential  -> enrichCandidate()  (one combined web-search-backed call
//                                                  per candidate — in a live human research
//                                                  pass these are the same conversation, so
//                                                  V1 does not pretend they are 5 separate
//                                                  live systems)
//   - Evidence Auditor     -> auditRaw()         (plain code: strips fabricated-looking
//                                                  sources, forces low confidence / a
//                                                  conservative next action when evidence
//                                                  is thin)
//   - Opportunity Ranker   -> scoring.mjs        (plain code: the same deterministic
//                                                  weighted-sum formula the seed data and
//                                                  the live UI already use)
//
// Every dollar this script spends is a real Anthropic API charge (web search is metered
// separately on top of tokens) — that's why hunting and search-per-candidate are both
// capped by env vars, and why RADAR_DRY_RUN exists to exercise the merge/audit/rank code
// paths for free before ever touching the real API.
import { getRadarOpportunities, saveRadarOpportunities, getProducts } from '../../scale-os/lib/store.js';
import { computeOpportunityScore, computeConfidenceScore, trendDirectionFromHistory, SCORE_WEIGHTS } from './scoring.mjs';

// Sonnet 5, not Opus 5: this is structured research synthesis over web-search results,
// not deep multi-step reasoning, and the brief was explicit about running this
// cost-consciously on a schedule. Raw HTTP (not the Anthropic SDK) matches this whole
// repo's existing convention (auth.js, store.js, product-lab.js) — no package.json /
// npm install step exists anywhere else in the project, and adding one just for this
// worker would be new machinery for a script that only needs two endpoints.
const MODEL = 'claude-sonnet-5';
const ANTHROPIC_VERSION = '2023-06-01';
const EVIDENCE_TYPES = ['Fact', 'Proxy / Signal', 'Estimate', 'Founder Assumption'];
const DIMENSION_KEYS = Object.keys(SCORE_WEIGHTS);
const TODAY = new Date().toISOString().slice(0, 10);

const MODE = process.env.RADAR_MODE || 'hunt'; // 'hunt' | 'candidate'
const HUNT_COUNT = Math.max(1, Math.min(5, Number(process.env.RADAR_HUNT_COUNT) || 3));
const SEARCH_BUDGET = Math.max(2, Math.min(10, Number(process.env.RADAR_SEARCH_BUDGET) || 6));
const DRY_RUN = process.env.RADAR_DRY_RUN === '1' || process.env.RADAR_DRY_RUN === 'true';

function log(...args) {
  console.log(`[market-radar]`, ...args);
}

// --- Anthropic call ---------------------------------------------------------------
// Model/headers/tool shape verified 2026-09 against the current Messages API docs:
// model "claude-sonnet-5" is a valid current model ID; "anthropic-version: 2023-06-01"
// is still the correct wire-protocol version header (unrelated to model releases, not
// flagged as changed); the web_search_20260209 tool takes exactly {type, name,
// max_uses} with no beta header required. None of that was the bug.

const REQUEST_TIMEOUT_MS = 120_000; // web-search-backed calls can run long
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [2000, 5000];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Truncates a response body before logging — keeps CI logs readable. Only ever logs
// response bodies, never request headers, so an API key/token can never appear here.
function safeSnippet(text, max = 400) {
  if (!text) return '(empty)';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function isRetryableStatus(status) {
  return status === 429 || status >= 500;
}

// Wraps fetch with a timeout (AbortController) and a small retry-with-backoff for
// transient failures: network-layer errors (DNS, connection reset, timeout — the
// generic Node "fetch failed") and 429/5xx responses. 4xx errors other than 429 are
// NOT retried — retrying a malformed request just wastes another paid call. Every
// attempt logs what happened (status or the underlying cause) before deciding.
async function fetchWithRetry(url, options, label) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok && isRetryableStatus(res.status) && attempt <= MAX_RETRIES) {
        const bodyText = await res.text().catch(() => '');
        log(`${label}: HTTP ${res.status} (retryable) on attempt ${attempt}/${MAX_RETRIES + 1} — body: ${safeSnippet(bodyText)}`);
        await sleep(RETRY_DELAYS_MS[attempt - 1]);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      const cause = err?.cause ? (err.cause.code || err.cause.message || String(err.cause)) : null;
      lastErr = err.name === 'AbortError' ? new Error(`${label}: timed out after ${REQUEST_TIMEOUT_MS}ms`) : err;
      log(`${label}: network error "${err.message}"${cause ? ` (cause: ${cause})` : ''} on attempt ${attempt}/${MAX_RETRIES + 1}`);
      if (attempt <= MAX_RETRIES) { await sleep(RETRY_DELAYS_MS[attempt - 1]); continue; }
    }
  }
  throw lastErr;
}

async function callClaude({ system, prompt, maxSearches }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — required for anything other than RADAR_DRY_RUN=1.');

  const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxSearches }],
    }),
  }, 'Anthropic API');

  const bodyText = await res.text();
  let data = null;
  try { data = JSON.parse(bodyText); } catch { /* handled below */ }
  if (!res.ok || !data) {
    log(`Anthropic API: HTTP ${res.status} — body: ${safeSnippet(bodyText)}`);
    throw new Error(`Anthropic API error: ${data?.error?.message || `HTTP ${res.status}`}`);
  }

  const text = (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
  const searchesUsed = (data.content || []).filter((block) => block.type === 'server_tool_use' && block.name === 'web_search').length;

  return { text, searchesUsed, usage: data.usage };
}

// Pulls the first well-formed JSON value out of a model's free-text response —
// tolerant of stray prose or ```json fences around the object/array we asked for.
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error('No JSON object/array found in model response.');
  const openChar = candidate[start];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return JSON.parse(candidate.slice(start, i + 1));
    }
  }
  throw new Error('Unterminated JSON in model response.');
}

// --- Agent 1: Opportunity Hunter ---------------------------------------------------

export async function huntCandidates(excludeNames) {
  if (DRY_RUN) {
    log('DRY RUN — skipping real Hunter call, using a fixture candidate.');
    return [{ product: 'Stone Soap Dispenser', variant: '', category: 'Bathroom Accessory', rationale: 'Dry-run fixture, not real research.' }];
  }

  const system = 'You are the Opportunity Hunter for Prime Piece, a premium natural-stone (marble/travertine) ecommerce brand based in Auckland, NZ. You use web search to find real, evidenced candidate product ideas — never invent products, prices, or competitors.';
  const prompt = `Prime Piece already sells or has researched these products (do NOT suggest anything on this list, or an obvious near-duplicate of it):
${excludeNames.map((n) => `- ${n}`).join('\n')}

Use web search to find ${HUNT_COUNT} NEW candidate natural-stone / marble / travertine homeware, bathroom, furniture, or decor products that a premium NZ stone brand could plausibly sell, and that show some real market signal (a retailer stocking it, a design-press trend mention, marketplace listings, etc.) — not just something that sounds nice. Prefer AU/NZ/UK/US/EU markets.

Respond with ONLY a JSON array (no markdown fences, no prose) of exactly ${HUNT_COUNT} objects shaped like:
[{"product": "string", "variant": "string or empty", "category": "string", "rationale": "one sentence, cite what you actually found"}]`;

  const { text, searchesUsed } = await callClaude({ system, prompt, maxSearches: SEARCH_BUDGET });
  log(`Hunter used ${searchesUsed} searches.`);
  const parsed = extractJson(text);
  if (!Array.isArray(parsed)) throw new Error('Hunter did not return a JSON array.');
  return parsed;
}

// --- Agents 2-6 (combined): Competitor Scout / Trend Scanner / Review Miner /
//     Market Gap Finder / Economics Potential ------------------------------------

const ENRICH_SCHEMA_EXAMPLE = `{
  "product": "string",
  "variant": "string or empty",
  "category": "string",
  "mainMarket": "NZ | AU | UK | US | EU | Global",
  "auPotential": "Low | Moderate | High",
  "nzPotential": "Low | Moderate | High",
  "tradePotential": "Low | Moderate | High",
  "priceBand": {"low": number|null, "high": number|null, "currency": "$ | NZ$ | AU$ | £ | €"},
  "demandSignal": {"level": "Weak | Moderate | Moderate-Strong | Strong", "type": "Fact | Proxy / Signal | Estimate | Founder Assumption", "description": "grounded in what you actually found"},
  "competitors": [{"name": "string", "country": "string", "priceLow": number|null, "priceHigh": number|null, "reviewCount": number|null, "bestsellerFlag": boolean}],
  "reviews": {"positiveThemes": ["string"], "complaints": ["string"], "purchaseMotivations": ["string"]},
  "trendSignals": [{"signal": "string", "type": "Fact | Proxy / Signal | Estimate | Founder Assumption", "source": "string"}],
  "marketGap": {"description": "string", "gapScore": 0-100},
  "economicsPotential": {"retailPriceRangeEstimate": "string", "aovBand": "Low | Moderate | High", "paidAcquisitionSuitability": "string", "grossMarginPotentialCategory": "string starting 'Estimate: '", "freightDifficulty": "Low | Moderate | High", "packagingDifficulty": "Low | Moderate | High", "damageRisk": "Low | Moderate | High", "crossSellPotential": "string"},
  "operatingRisks": ["string"],
  "designerTradeSignals": ["string"],
  "disqualifiers": ["string — reasons this should never be a Prime Piece SKU regardless of score, e.g. not genuine stone, requires unrelated fabrication skill, bespoke trade-only install. Empty array if none."],
  "recommendedNextAction": "GET_SUPPLIER_PRICE | SAMPLE | MONITOR | IGNORE",
  "sources": [{"url": "a real URL you actually retrieved via web search this session", "title": "string"}],
  "scoreBreakdown": {
    "demandEvidence": {"score": 0-100, "why": "one line, grounded in evidence above"},
    "contributionProfit": {"score": 0-100, "why": "string"},
    "aovCac": {"score": 0-100, "why": "string"},
    "differentiation": {"score": 0-100, "why": "string"},
    "adContent": {"score": 0-100, "why": "string"},
    "auScale": {"score": 0-100, "why": "string"},
    "designerTrade": {"score": 0-100, "why": "string"},
    "sourcing": {"score": 0-100, "why": "string"},
    "operationalRisk": {"score": 0-100, "why": "string, higher score = LOWER risk"},
    "crossSell": {"score": 0-100, "why": "string"}
  }
}`;

export async function enrichCandidate({ product, variant, category }) {
  if (DRY_RUN) {
    log(`DRY RUN — skipping real Enrich call for "${product}", using a fixture.`);
    return {
      product, variant: variant || '', category: category || 'Bathroom Accessory',
      mainMarket: 'NZ', auPotential: 'Moderate', nzPotential: 'Moderate', tradePotential: 'Low',
      priceBand: { low: 40, high: 90, currency: '$' },
      demandSignal: { level: 'Weak', type: 'Founder Assumption', description: 'Dry-run fixture — no real search performed.' },
      competitors: [], reviews: { positiveThemes: [], complaints: [], purchaseMotivations: [] }, trendSignals: [],
      marketGap: { description: 'Dry-run fixture.', gapScore: 30 },
      economicsPotential: { retailPriceRangeEstimate: '$40-90', aovBand: 'Low', paidAcquisitionSuitability: 'Weak', grossMarginPotentialCategory: 'Estimate: Unknown', freightDifficulty: 'Low', packagingDifficulty: 'Low', damageRisk: 'Low', crossSellPotential: 'Moderate' },
      operatingRisks: [], designerTradeSignals: [], disqualifiers: [], recommendedNextAction: 'MONITOR',
      sources: [], // deliberately empty — proves the Evidence Auditor step actually runs on a zero-source item
      scoreBreakdown: Object.fromEntries(DIMENSION_KEYS.map((k) => [k, { score: 30, why: 'Dry-run fixture, not scored.' }])),
    };
  }

  const system = 'You are the research/enrichment step of the Prime Piece Market Radar. You use web search and report ONLY what you actually find. Never invent a competitor, a price, a review count, or a URL. If you find nothing for a field, use null/empty/"Not found" rather than guessing, and reflect that honestly in demandSignal.type and confidence-relevant fields.';
  const prompt = `Research this candidate product for Prime Piece (premium natural-stone ecommerce, Auckland NZ) using web search: "${product}"${variant ? ` (variant: ${variant})` : ''}${category ? `, category: ${category}` : ''}.

Find: real competitors and their prices, review counts/themes if visible, trend/design-press signals, the size of any pricing/market gap, and qualitative economics (retail price band, AOV, freight/damage difficulty, cross-sell fit). Score all 10 dimensions below 0-100 based only on what you found. Flag disqualifiers honestly — a low score or a Kill-worthy disqualifier is a valid, useful result.

Respond with ONLY a JSON object (no markdown fences, no prose) in exactly this shape:
${ENRICH_SCHEMA_EXAMPLE}`;

  const { text, searchesUsed } = await callClaude({ system, prompt, maxSearches: SEARCH_BUDGET });
  log(`Enrich("${product}") used ${searchesUsed} searches.`);
  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`Enrich("${product}") did not return a JSON object.`);
  return parsed;
}

// --- Agent 7: Evidence Auditor (plain code) ----------------------------------------

function isPlausibleUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    if (/^(example|placeholder|yourdomain)\.(com|test)$/i.test(u.hostname)) return false;
    if (u.hostname === '#' || u.hostname === '') return false;
    return true;
  } catch {
    return false;
  }
}

// Strips sources that don't look like real retrievable URLs, and — when a candidate
// ends up with zero real sources — forces a conservative recommendation and flags the
// gap explicitly, rather than letting a thin/empty research pass masquerade as a
// normal result. This is the one step in the pipeline that is deliberately suspicious
// of the model's own output.
export function auditRaw(raw) {
  const sources = Array.isArray(raw.sources) ? raw.sources.filter((s) => isPlausibleUrl(s?.url)) : [];
  const droppedCount = (raw.sources?.length || 0) - sources.length;
  if (droppedCount > 0) log(`Evidence Auditor: dropped ${droppedCount} implausible source URL(s) for "${raw.product}".`);

  const evidenceTags = [];
  if (raw.demandSignal?.type && EVIDENCE_TYPES.includes(raw.demandSignal.type)) evidenceTags.push(raw.demandSignal.type);
  (raw.trendSignals || []).forEach((t) => { if (t?.type && EVIDENCE_TYPES.includes(t.type)) evidenceTags.push(t.type); });

  const disqualifiers = Array.isArray(raw.disqualifiers) ? raw.disqualifiers.filter(Boolean) : [];

  let recommendedNextAction = raw.recommendedNextAction;
  let evidenceGap = false;
  if (sources.length === 0) {
    evidenceGap = true;
    if (recommendedNextAction === 'GET_SUPPLIER_PRICE' || recommendedNextAction === 'SAMPLE') {
      log(`Evidence Auditor: no real sources found for "${raw.product}" — downgrading "${recommendedNextAction}" to "MONITOR".`);
      recommendedNextAction = 'MONITOR';
    }
  }

  return { ...raw, sources, evidenceTags, disqualifiers, recommendedNextAction, evidenceGap };
}

// --- Agent 8: Opportunity Ranker (plain code, scoring.mjs does the arithmetic) -----

export function rankAudited(audited) {
  const { opportunityScore, missingDimensions, weightUsed } = computeOpportunityScore(audited.scoreBreakdown);
  const { confidenceScore, independentSourceCount } = computeConfidenceScore({ sources: audited.sources, evidenceTags: audited.evidenceTags });

  let tier;
  if (audited.disqualifiers.length > 0) tier = 'Kill';
  else if (opportunityScore == null) tier = 'C';
  else if (opportunityScore >= 55) tier = 'A';
  else if (opportunityScore >= 35) tier = 'B';
  else if (opportunityScore >= 20) tier = 'C';
  else tier = 'Kill';

  if (missingDimensions.length) log(`Ranker: "${audited.product}" missing dimensions [${missingDimensions.join(', ')}] — score re-normalised over ${weightUsed}% weight.`);

  return { ...audited, tier, opportunityScore, confidenceScore, independentSourceCount };
}

// --- Merge into the persisted Market Radar list ------------------------------------

function nextRadarId(list) {
  let max = 0;
  for (const item of list) {
    const m = /^radar_(\d+)$/.exec(item.id || '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return 'radar_' + String(max + 1).padStart(3, '0');
}

export function mergeIntoRadar(list, ranked, note) {
  const { independentSourceCount, evidenceTags, disqualifiers, evidenceGap, ...item } = ranked;
  const historyEntry = { scanDate: TODAY, score: item.opportunityScore, confidence: item.confidenceScore, priceRange: item.priceBand, reviewCount: null, note };

  const idx = list.findIndex((o) => o.product.toLowerCase() === item.product.toLowerCase() && (o.variant || '').toLowerCase() === (item.variant || '').toLowerCase());

  if (idx === -1) {
    const history = [historyEntry];
    const created = { id: nextRadarId(list), ...item, trendDirection: trendDirectionFromHistory(history), firstSeen: TODAY, lastResearched: TODAY, history, promotedToProductLab: false };
    list.push(created);
    return { action: 'created', item: created };
  }

  const existing = list[idx];
  const history = [...(existing.history || []), historyEntry];
  const updated = {
    ...existing, ...item, id: existing.id,
    trendDirection: trendDirectionFromHistory(history),
    firstSeen: existing.firstSeen || TODAY, lastResearched: TODAY, history,
    promotedToProductLab: existing.promotedToProductLab, promotedAt: existing.promotedAt, productLabId: existing.productLabId,
  };
  list[idx] = updated;
  return { action: 'updated', item: updated };
}

// --- Main ---------------------------------------------------------------------------

async function main() {
  log(`Mode: ${MODE}${DRY_RUN ? ' (DRY RUN — no real API calls, no cost)' : ''}`);

  const [radar, products] = await Promise.all([getRadarOpportunities(), getProducts()]);
  const knownNames = [
    ...radar.map((o) => (o.variant ? `${o.product} — ${o.variant}` : o.product)),
    ...products.map((p) => p.name),
  ];

  let candidates;
  if (MODE === 'candidate') {
    const raw = process.env.RADAR_CANDIDATE;
    if (!raw) throw new Error('RADAR_MODE=candidate requires RADAR_CANDIDATE="Product Name|Variant|Category" (variant/category optional).');
    const [product, variant, category] = raw.split('|').map((s) => (s || '').trim());
    if (!product) throw new Error('RADAR_CANDIDATE must include at least a product name.');
    candidates = [{ product, variant, category }];
  } else {
    candidates = await huntCandidates(knownNames);
    log(`Hunter found ${candidates.length} candidate(s): ${candidates.map((c) => c.product).join(', ')}`);
  }

  let created = 0, updated = 0, failed = 0;
  for (const candidate of candidates) {
    try {
      const raw = await enrichCandidate(candidate);
      const audited = auditRaw(raw);
      const ranked = rankAudited(audited);
      const note = MODE === 'candidate' ? 'Manual candidate refresh' : 'Automated Hunter scan';
      const result = mergeIntoRadar(radar, ranked, note);
      if (result.action === 'created') created++; else updated++;
      log(`${result.action === 'created' ? 'Created' : 'Updated'} "${result.item.product}" — score ${result.item.opportunityScore}, confidence ${result.item.confidenceScore}, tier ${result.item.tier}${ranked.evidenceGap ? ' (evidence gap — no real sources found)' : ''}`);
    } catch (err) {
      failed++;
      log(`FAILED on "${candidate.product}": ${err.message}`);
    }
  }

  if (created + updated > 0) {
    await saveRadarOpportunities(radar);
    log(`Saved. ${created} created, ${updated} updated, ${failed} failed.`);
  } else {
    log(`Nothing to save. ${failed} failed.`);
  }

  // Any failure must fail the job (red), even if some other candidate in the same run
  // succeeded and got saved above — "success" only means every candidate researched
  // cleanly. Without this, main() returns normally on an all-failed run and the
  // process exits 0, which is exactly how GitHub Actions showed this run as green
  // while nothing was actually saved.
  if (failed > 0) {
    throw new Error(`${failed} of ${candidates.length} candidate(s) failed — see logs above for the exact cause.`);
  }
}

// Guarded so a test harness can `import` this module's exported pipeline functions
// (huntCandidates, enrichCandidate, auditRaw, rankAudited, mergeIntoRadar) against an
// in-memory list without needing real Redis credentials or running main()'s full flow.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('[market-radar] Fatal:', err);
    process.exit(1);
  });
}
