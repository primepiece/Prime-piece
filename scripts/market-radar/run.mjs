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
import { getRadarOpportunities, saveRadarOpportunities, getProducts, savePulseBrief } from '../../scale-os/lib/store.js';
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

const MODE = process.env.RADAR_MODE || 'hunt'; // 'hunt' | 'candidate' | 'refresh' | 'daily'
const HUNT_COUNT = Math.max(1, Math.min(5, Number(process.env.RADAR_HUNT_COUNT) || 3));
const REFRESH_COUNT = Math.max(1, Math.min(5, Number(process.env.RADAR_REFRESH_COUNT) || 3));
const SEARCH_BUDGET = Math.max(2, Math.min(10, Number(process.env.RADAR_SEARCH_BUDGET) || 6));
// Fallback budget for a research call's one retry after its full-budget attempt times
// out — fewer searches means a shorter server-side tool loop, so the retry has a real
// chance of finishing inside REQUEST_TIMEOUT_MS instead of repeating the same timeout.
const RETRY_SEARCH_BUDGET = Math.max(2, Math.floor(SEARCH_BUDGET / 2));
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

// 120s was measured too short in production: real search-backed research calls
// (multiple server-side web_search round trips per candidate) routinely exceeded
// it, so every retry re-sent the identical request at the identical budget and
// failed identically (confirmed 2026-09-15, run 35019228654 — 4/5 candidates
// timed out on all 3 attempts). 240s gives real research calls room to finish.
const REQUEST_TIMEOUT_MS = 240_000;
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
      if (err.name === 'AbortError') {
        // A slow web-search-backed call timing out is not a transient blip — retrying
        // the identical request at the identical budget just reproduces the same
        // timeout (confirmed 2026-09-15, run 35019228654: 4/5 candidates failed all 3
        // attempts, each hitting the same 120000ms deadline). Fail this attempt
        // immediately; the caller (huntCandidates/enrichCandidate) retries once with a
        // reduced search budget instead of resending the same request.
        throw new Error(`${label}: timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      const cause = err?.cause ? (err.cause.code || err.cause.message || String(err.cause)) : null;
      lastErr = err;
      log(`${label}: network error "${err.message}"${cause ? ` (cause: ${cause})` : ''} on attempt ${attempt}/${MAX_RETRIES + 1}`);
      if (attempt <= MAX_RETRIES) { await sleep(RETRY_DELAYS_MS[attempt - 1]); continue; }
    }
  }
  throw lastErr;
}

// maxSearches omitted (undefined) -> no web_search tool attached at all, for calls
// that only need to reason over data already given to them (the Pulse synthesis
// call) rather than research the web — cheaper and keeps that call's intent honest.
async function callClaude({ system, prompt, maxSearches, maxTokens }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — required for anything other than RADAR_DRY_RUN=1.');

  const body = {
    model: MODEL,
    max_tokens: maxTokens || 8000,
    system,
    messages: [{ role: 'user', content: prompt }],
  };
  if (maxSearches) {
    body.tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxSearches }];
  }

  const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
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

  // Max 2 attempts total: full search budget, then — only if that timed out — one
  // retry at a reduced budget. A third identical attempt would just repeat the same
  // failure (see the AbortError comment in fetchWithRetry), so we don't make one.
  const budgets = [SEARCH_BUDGET, RETRY_SEARCH_BUDGET];
  let lastErr;
  for (let i = 0; i < budgets.length; i++) {
    try {
      const { text, searchesUsed } = await callClaude({ system, prompt, maxSearches: budgets[i] });
      log(`Hunter used ${searchesUsed} searches${i > 0 ? ` (retry at reduced budget ${budgets[i]})` : ''}.`);
      const parsed = extractJson(text);
      if (!Array.isArray(parsed)) throw new Error('Hunter did not return a JSON array.');
      return parsed;
    } catch (err) {
      lastErr = err;
      log(`Hunter attempt ${i + 1}/${budgets.length} failed: ${err.message}`);
    }
  }
  throw lastErr;
}

// --- Refresh: pick the N stalest existing opportunities to re-research ------------
// This is what makes trend direction, score-change and confidence-change data real
// over time — 'hunt' mode only ever finds brand-new items (it's explicitly told to
// avoid duplicates), so without this, nothing already on the radar would ever be
// revisited and "Biggest Movers" would have nothing to show. Tier A/B only (Kill/C
// tier isn't worth repeat spend), sorted by lastResearched ascending so the whole
// list rotates through coverage over time regardless of how large it grows.
export function pickStaleForRefresh(radar, count) {
  return radar
    .filter((o) => o.tier === 'A' || o.tier === 'B')
    .slice()
    .sort((a, b) => (a.lastResearched || '0000-00-00').localeCompare(b.lastResearched || '0000-00-00'))
    .slice(0, count)
    .map((o) => ({ product: o.product, variant: o.variant || '', category: o.category || '' }));
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

  // Max 2 attempts total: full search budget, then — only if that timed out — one
  // retry at a reduced budget. If both fail, the caller (main()'s per-candidate try/
  // catch) marks this candidate failed and moves on; it never blocks the other
  // candidates or the Pulse synthesis step that follows them.
  const budgets = [SEARCH_BUDGET, RETRY_SEARCH_BUDGET];
  let lastErr;
  for (let i = 0; i < budgets.length; i++) {
    try {
      const { text, searchesUsed } = await callClaude({ system, prompt, maxSearches: budgets[i] });
      log(`Enrich("${product}") used ${searchesUsed} searches${i > 0 ? ` (retry at reduced budget ${budgets[i]})` : ''}.`);
      const parsed = extractJson(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`Enrich("${product}") did not return a JSON object.`);
      return parsed;
    } catch (err) {
      lastErr = err;
      log(`Enrich("${product}") attempt ${i + 1}/${budgets.length} failed: ${err.message}`);
    }
  }
  throw lastErr;
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

// Finds the single scoreBreakdown dimension that moved the most between two scans
// and returns a short human-readable clause using that dimension's own "why" text —
// this is what turns "score 40->75" into an actual explanation of why, without a
// second Claude call: the "why" text was already produced by the enrichment call
// that generated the new scoreBreakdown, this just picks the most relevant one.
export function biggestDimensionShift(oldBreakdown, newBreakdown) {
  if (!oldBreakdown || !newBreakdown) return null;
  let best = null;
  for (const key of DIMENSION_KEYS) {
    const oldVal = oldBreakdown[key]?.score;
    const newVal = newBreakdown[key]?.score;
    if (typeof oldVal !== 'number' || typeof newVal !== 'number') continue;
    const delta = newVal - oldVal;
    if (Math.abs(delta) < 10) continue; // ignore noise-level moves
    if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { key, delta, oldVal, newVal, why: newBreakdown[key]?.why };
  }
  if (!best) return null;
  const arrow = best.delta > 0 ? '↑' : '↓';
  return `${best.key} ${best.oldVal}${arrow}${best.newVal}${best.why ? ` (${best.why})` : ''}`;
}

export function mergeIntoRadar(list, ranked, note) {
  const { independentSourceCount, evidenceTags, disqualifiers, evidenceGap, ...item } = ranked;

  const idx = list.findIndex((o) => o.product.toLowerCase() === item.product.toLowerCase() && (o.variant || '').toLowerCase() === (item.variant || '').toLowerCase());

  if (idx === -1) {
    const historyEntry = { scanDate: TODAY, score: item.opportunityScore, confidence: item.confidenceScore, priceRange: item.priceBand, reviewCount: null, note };
    const history = [historyEntry];
    const created = { id: nextRadarId(list), ...item, trendDirection: trendDirectionFromHistory(history), firstSeen: TODAY, lastResearched: TODAY, history, promotedToProductLab: false };
    list.push(created);
    return { action: 'created', item: created };
  }

  const existing = list[idx];
  const shift = biggestDimensionShift(existing.scoreBreakdown, item.scoreBreakdown);
  const historyEntry = { scanDate: TODAY, score: item.opportunityScore, confidence: item.confidenceScore, priceRange: item.priceBand, reviewCount: null, note: shift ? `${note} — ${shift}` : note };
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

// --- Pulse synthesis (one plain Claude call, no web search, no invented facts) ----
// Runs once at the end of a 'daily' scan, after Market Radar has already been
// refreshed — never on Dashboard load. Given only the structured data we already
// have (never re-researches anything itself), it must say "not recorded" rather
// than guess when a field is missing. This is deliberately NOT a Vercel function —
// it runs inside this same GitHub Actions worker and writes straight to Redis via
// store.js, exactly like the rest of this script.

function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// Same 8-area score + landed-cost/margin math as scale-os/lib/product-lab.js and
// dashboard.js — duplicated on purpose (this script has no access to client-side
// inline-script code, and there's no shared-JS mechanism in this codebase) so the
// number Pulse talks about is always the same number Dashboard shows.
export function productEconomics(p) {
  const supplierCost = num(p.supplierCost), freightCost = num(p.freightCost), sellingPrice = num(p.sellingPrice);
  const packagingCost = num(p.packagingCost), fulfilmentFreightCost = num(p.fulfilmentFreightCost);
  const paymentFeesCost = num(p.paymentFeesCost), damageReturnsAllowance = num(p.damageReturnsAllowance);
  const totalLandedCost = (supplierCost !== null || freightCost !== null) ? (supplierCost || 0) + (freightCost || 0) : null;
  const grossMarginPct = (totalLandedCost !== null && sellingPrice) ? ((sellingPrice - totalLandedCost) / sellingPrice) * 100 : null;
  const landedCostPctOfRetail = (totalLandedCost !== null && sellingPrice) ? (totalLandedCost / sellingPrice) * 100 : null;
  const inputs = [sellingPrice, supplierCost, freightCost, packagingCost, fulfilmentFreightCost, paymentFeesCost, damageReturnsAllowance];
  const contributionComplete = inputs.every((v) => v !== null);
  const contributionMarginPct = contributionComplete
    ? ((sellingPrice - supplierCost - freightCost - packagingCost - fulfilmentFreightCost - paymentFeesCost - damageReturnsAllowance) / sellingPrice) * 100
    : null;
  return { sellingPrice, totalLandedCost, grossMarginPct, landedCostPctOfRetail, contributionMarginPct };
}

const SCORE_AREA_GETTERS = [
  (p, econ) => { const m = econ.contributionMarginPct; return m === null ? null : m < 0 ? 1 : m < 15 ? 2 : m < 30 ? 3 : m < 45 ? 4 : 5; },
  (p) => num(p.me_apparentMarketDemand),
  (p) => num(p.differentiation),
  (p) => num(p.contentPotential),
  (p) => { const v = num(p.freightRisk); return v === null ? null : 6 - v; },
  (p) => { const v = num(p.damageRisk); return v === null ? null : 6 - v; },
  (p) => num(p.tradePotential),
  (p) => { const v = num(p.competition); return v === null ? null : 6 - v; },
];
export function primeOpportunityScore(p) {
  const econ = productEconomics(p);
  let sum = 0, count = 0;
  for (const get of SCORE_AREA_GETTERS) {
    const v = get(p, econ);
    if (v === null) continue;
    sum += (v / 5) * 100;
    count++;
  }
  return count ? Math.round(sum / count) : null;
}

export function buildSynthesisContext(products, radar) {
  const notKilled = (p) => p.status !== 'KILL';
  const perf = (p) => ({
    period: p.perf_periodLabel || null,
    revenue: num(p.perf_revenue),
    unitsSold: num(p.perf_unitsSold),
    sessions: num(p.perf_sessions),
    conversionRatePct: num(p.perf_conversionRate),
    adSpend: num(p.perf_adSpend),
    preordersOrEnquiries: num(p.perf_preordersOrEnquiries),
    preorderRevenue: num(p.perf_preorderRevenue),
    currentStock: p.perf_currentStock || null,
    founderRecordedNextAction: p.perf_nextAction || null,
  });

  const activeProducts = products.filter((p) => p.priorityLane === 'Active' && notKilled(p)).map((p) => ({
    name: p.name, tier: p.tier || null, stage: p.status, unitEconomics: productEconomics(p), performance: perf(p),
  }));
  const researchCandidates = products.filter((p) => p.priorityLane === 'Research Candidate' && notKilled(p)).map((p) => ({
    name: p.name, tier: p.tier || null, stage: p.status, primeOpportunityScore: primeOpportunityScore(p),
    unitEconomics: productEconomics(p), keyTakeaway: p.me_keyTakeaway || null, performance: perf(p),
  }));
  const maintainProducts = products.filter((p) => p.priorityLane === 'Maintain' && notKilled(p)).map((p) => ({ name: p.name, tier: p.tier || null, stage: p.status }));
  const recentlyKilledProducts = products.filter((p) => p.status === 'KILL').slice(-5).map((p) => ({ name: p.name, reason: p.notes || null }));
  const recentlyKilledRadarItems = radar.filter((r) => r.tier === 'Kill').slice(-5).map((r) => ({ name: r.product, reason: (r.disqualifiers || []).join('; ') || null }));

  const notPromoted = (r) => !r.promotedToProductLab;
  const topOpportunities = radar.filter((r) => notPromoted(r) && r.tier !== 'Kill')
    .slice().sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0)).slice(0, 5)
    .map((r) => ({ name: r.product, variant: r.variant || null, opportunityScore: r.opportunityScore, confidenceScore: r.confidenceScore, tier: r.tier, trendDirection: r.trendDirection, mainMarket: r.mainMarket || null, estimatedRetail: r.economicsPotential?.retailPriceRangeEstimate || null }));

  const movers = radar.filter((r) => (r.history || []).length >= 2).map((r) => {
    const [prev, cur] = r.history.slice(-2);
    const delta = (cur.score ?? null) !== null && (prev.score ?? null) !== null ? cur.score - prev.score : null;
    return { name: r.product, variant: r.variant || null, previousScore: prev.score, newScore: cur.score, scoreDelta: delta, trendDirection: r.trendDirection, whatChanged: cur.note || null };
  }).filter((m) => m.scoreDelta !== null && Math.abs(m.scoreDelta) >= 5)
    .sort((a, b) => Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta)).slice(0, 5);

  const newThisRun = radar.filter((r) => r.firstSeen === TODAY && (r.history || []).length === 1)
    .slice().sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0)).slice(0, 5)
    .map((r) => ({ name: r.product, variant: r.variant || null, opportunityScore: r.opportunityScore, tier: r.tier, mainMarket: r.mainMarket || null }));

  return { activeProducts, researchCandidates, maintainProducts, recentlyKilledProducts, recentlyKilledRadarItems, topOpportunities, movers, newThisRun };
}

const SYNTHESIS_SCHEMA_EXAMPLE = `{
  "pulseBullets": ["max 5 short plain-English bullets — what matters most today, most important first"],
  "nextThousand": {"recommendation": "one short sentence: the single best use of Prime Piece's next $1,000", "rationale": "1-3 sentences, grounded only in the data given"},
  "threeMoves": ["exactly 3 specific, concrete actions for today"],
  "missingDataWarnings": ["one sentence per important gap that limits confidence — empty array if nothing important is missing"]
}`;

export async function synthesizeBrief(context) {
  if (DRY_RUN) {
    log('DRY RUN — skipping real synthesis call, using a fixture brief.');
    return {
      pulseBullets: ['Dry-run fixture — no real synthesis performed.'],
      nextThousand: { recommendation: 'Dry-run fixture.', rationale: 'Dry-run fixture.' },
      threeMoves: ['Dry-run fixture.', 'Dry-run fixture.', 'Dry-run fixture.'],
      missingDataWarnings: [],
    };
  }

  const system = 'You are writing Prime Piece\'s daily executive brief. Prime Piece is a premium NZ natural-stone (marble/travertine) ecommerce brand with a HALO ($1,500-$8,000+ one-of-one) / CORE ($299-$1,200 repeatable, the primary scaling layer) / ENTRY ($99-$299 acquisition) product architecture, and a policy of at most one active CORE launch/test at a time. You are given ONLY real structured data below — never invent a name, number, score, or fact not present in it. A null field or empty array means that information is genuinely not recorded — say so explicitly in missingDataWarnings rather than guessing or filling the gap with something plausible-sounding. Be concise and decision-oriented, never generic AI commentary. Never recommend a large speculative inventory order based on a Market Radar score alone — that score reflects market opportunity, not proof Prime Piece should hold stock.';
  const prompt = `Here is today's Prime Piece data:\n${JSON.stringify(context, null, 0)}\n\nRespond with ONLY a JSON object (no markdown fences, no prose) in exactly this shape:\n${SYNTHESIS_SCHEMA_EXAMPLE}`;

  const { text } = await callClaude({ system, prompt, maxTokens: 2000 });
  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Synthesis did not return a JSON object.');
  if (!Array.isArray(parsed.pulseBullets) || !Array.isArray(parsed.threeMoves) || !Array.isArray(parsed.missingDataWarnings) || !parsed.nextThousand) {
    throw new Error('Synthesis JSON is missing an expected field.');
  }
  return parsed;
}

// --- Main ---------------------------------------------------------------------------

async function main() {
  log(`Mode: ${MODE}${DRY_RUN ? ' (DRY RUN — no real API calls, no cost)' : ''}`);

  const [radar, products] = await Promise.all([getRadarOpportunities(), getProducts()]);
  const knownNames = [
    ...radar.map((o) => (o.variant ? `${o.product} — ${o.variant}` : o.product)),
    ...products.map((p) => p.name),
  ];

  const NOTE_BY_SOURCE = { hunt: 'Automated Hunter scan', refresh: 'Scheduled refresh scan', candidate: 'Manual candidate refresh' };
  let candidates;
  if (MODE === 'candidate') {
    const raw = process.env.RADAR_CANDIDATE;
    if (!raw) throw new Error('RADAR_MODE=candidate requires RADAR_CANDIDATE="Product Name|Variant|Category" (variant/category optional).');
    const [product, variant, category] = raw.split('|').map((s) => (s || '').trim());
    if (!product) throw new Error('RADAR_CANDIDATE must include at least a product name.');
    candidates = [{ product, variant, category, _source: 'candidate' }];
  } else if (MODE === 'refresh') {
    candidates = pickStaleForRefresh(radar, REFRESH_COUNT).map((c) => ({ ...c, _source: 'refresh' }));
    log(`Refresh selected ${candidates.length} stalest tier A/B opportunity(ies): ${candidates.map((c) => c.product).join(', ') || '(none — radar has no tier A/B items yet)'}`);
  } else if (MODE === 'daily') {
    // Hunter failing (even after its own 2-attempt retry) must not take the whole
    // daily run down with it — refresh candidates and Pulse synthesis still matter.
    let hunted = [];
    try {
      hunted = (await huntCandidates(knownNames)).map((c) => ({ ...c, _source: 'hunt' }));
    } catch (err) {
      log(`Hunter FAILED: ${err.message} — continuing with refresh candidates only.`);
    }
    const stale = pickStaleForRefresh(radar, REFRESH_COUNT).map((c) => ({ ...c, _source: 'refresh' }));
    candidates = [...hunted, ...stale];
    log(`Daily scan: ${hunted.length} new candidate(s) from Hunter, ${stale.length} stale opportunity(ies) selected for refresh.`);
  } else {
    candidates = (await huntCandidates(knownNames)).map((c) => ({ ...c, _source: 'hunt' }));
    log(`Hunter found ${candidates.length} candidate(s): ${candidates.map((c) => c.product).join(', ')}`);
  }

  let created = 0, updated = 0, failed = 0;
  for (const candidate of candidates) {
    try {
      const raw = await enrichCandidate(candidate);
      const audited = auditRaw(raw);
      const ranked = rankAudited(audited);
      const note = NOTE_BY_SOURCE[candidate._source] || 'Automated scan';
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

  if (MODE === 'daily') {
    const radarRun = { mode: MODE, created, updated, failed, huntCount: HUNT_COUNT, refreshCount: REFRESH_COUNT };
    let brief;
    try {
      const freshProducts = await getProducts();
      const context = buildSynthesisContext(freshProducts, radar);
      brief = await synthesizeBrief(context);
      log('Pulse synthesis succeeded.');
    } catch (err) {
      log(`Pulse synthesis FAILED (radar data above was still saved successfully): ${err.message}`);
      brief = { pulseBullets: [], nextThousand: null, threeMoves: [], missingDataWarnings: ['Today\'s synthesis call failed — see the GitHub Actions run log for the underlying Market Radar data, which updated successfully.'], synthesisFailed: true };
    }
    await savePulseBrief({ generatedAt: new Date().toISOString(), radarRun, ...brief });
    log('Pulse brief saved.');

    // A daily run producing the best brief it can from whatever research succeeded is
    // the intended, successful outcome now — individual candidate timeouts are
    // expected and already isolated above, so they must not turn the job red. Only
    // fail the job if the actual deliverable, the Pulse brief itself, didn't get made.
    if (brief.synthesisFailed) {
      throw new Error('Pulse synthesis failed — see logs above. Market Radar data (if any candidates succeeded) was still saved.');
    }
  } else if (failed > 0) {
    // Outside 'daily' mode there's no brief to fall back on — the candidate(s)
    // researched ARE the deliverable, so any failure must fail the job (red). Without
    // this, main() returns normally on an all-failed run and exits 0, which is
    // exactly how GitHub Actions showed a past run as green while nothing was saved.
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
