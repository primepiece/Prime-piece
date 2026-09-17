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
import { getRadarOpportunities, saveRadarOpportunities, getProducts, savePulseBrief, saveSupplierBatch, createApprovalRequest, getSuppliers, getApprovals, applyParsedQuote, getFastTrackAnalyses, saveFastTrackAnalyses, createFastTrackRequest } from '../../scale-os/lib/store.js';
import { computeOpportunityScore, computeConfidenceScore, trendDirectionFromHistory, SCORE_WEIGHTS, rankSuppliers, selectOutreachBatch, representativeUnitPrice, computeFitGate, rankFastTrackSuppliers, computeFastTrackEconomics, computeFastTrackDecision } from './scoring.mjs';

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

const MODE = process.env.RADAR_MODE || 'hunt'; // 'hunt' | 'candidate' | 'refresh' | 'daily' | 'supplier' | 'quote-capture' | 'demand-evidence' | 'fast-track' | 'list'
const HUNT_COUNT = Math.max(1, Math.min(5, Number(process.env.RADAR_HUNT_COUNT) || 3));
const REFRESH_COUNT = Math.max(1, Math.min(5, Number(process.env.RADAR_REFRESH_COUNT) || 3));
const SEARCH_BUDGET = Math.max(2, Math.min(10, Number(process.env.RADAR_SEARCH_BUDGET) || 6));
// Fallback budget for a research call's one retry after its full-budget attempt times
// out — fewer searches means a shorter server-side tool loop, so the retry has a real
// chance of finishing inside REQUEST_TIMEOUT_MS instead of repeating the same timeout.
const RETRY_SEARCH_BUDGET = Math.max(2, Math.floor(SEARCH_BUDGET / 2));
const DRY_RUN = process.env.RADAR_DRY_RUN === '1' || process.env.RADAR_DRY_RUN === 'true';

// findSuppliers() no longer uses Anthropic's web_search tool at all (see the Supplier
// research section below) — two real production runs on 2026-09-16 timed out at the
// full 240s request timeout, and the timeout persisted even after cutting the search
// budget from 6 to 3 to 2, which pointed at the web_search tool loop itself (combined
// with this request shape) as the reliability risk, not the budget. Supplier
// discovery is now a two-stage pipeline with a fast, predictable REST search API
// (Tavily) doing retrieval and a plain non-tool Claude call doing extraction.
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
// Fast Track's Stage 1 needs the actual content of a specific URL (the product page,
// a named supplier's site) rather than a query search — Tavily's dedicated Extract
// endpoint does exactly that (fetch + clean a real page into markdown/text), which is
// far more reliable than trying to coax the same content out of a search query.
const TAVILY_EXTRACT_URL = 'https://api.tavily.com/extract';

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
async function callClaude({ system, prompt, maxSearches, maxTokens, responseFormat }) {
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
  // Structured outputs (output_config.format) constrain the final text block to a
  // JSON Schema — used by findSuppliers() so "the model returned prose instead of
  // JSON" (a real production failure, 2026-09-16) becomes structurally impossible
  // instead of something extractJson has to recover from after the fact.
  if (responseFormat) {
    body.output_config = { format: responseFormat };
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

  return { text, searchesUsed, usage: data.usage, stopReason: data.stop_reason };
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

  const system = 'You are the Opportunity Hunter for Prime Piece Pulse, the operating system for Prime Piece\'s scalable IMPORTED natural-stone (marble/travertine) ecommerce product business (Auckland, NZ). Your central question is: what scalable product should Prime Piece import, test, reorder, scale, hold or kill next? You use web search to find real, evidenced candidate product ideas — never invent products, prices, or competitors.';
  const prompt = `Prime Piece already sells or has researched these products (do NOT suggest anything on this list, or an obvious near-duplicate of it):
${excludeNames.map((n) => `- ${n}`).join('\n')}

Use web search to find ${HUNT_COUNT} NEW candidate natural-stone / marble / travertine homeware, bathroom, furniture, or decor products that show some real market signal (a retailer stocking it, a design-press trend mention, marketplace listings, etc.) — not just something that sounds nice. Prefer AU/NZ/UK/US/EU markets.

Every candidate must be realistically importable at scale from an overseas manufacturer — this is a sourcing/import business, not a bespoke fabrication one. Strongly favour candidates that look:
- repeatable/importable (a factory could produce many identical units, not a one-off commission)
- premium-looking but compact relative to its value (ships economically, doesn't dominate freight cost)
- high perceived value for its likely landed cost — ideally landed cost could plausibly be ≤30% of retail
- capable of 60-70%+ gross margin at a premium retail price
- visually strong (photographs/films well)
- relatively low breakage/damage risk in freight and handling
- differentiated in the NZ market, not already saturated
- reorderable (not a novelty/one-time purchase)
- capable of meaningful ecommerce scale (broad appeal, not a narrow niche)

Do NOT suggest anything that is:
- bespoke-only, made-to-order, or requires NZ-based custom fabrication/one-off craftsmanship (Prime Piece Pulse explicitly excludes this — it belongs elsewhere in the business, not here)
- bulky or low-value relative to its size/weight (poor freight economics)
- a generic, undifferentiated commodity product
- reliant on a large speculative minimum order quantity to be viable
- in a category you can already tell is highly saturated in NZ with little realistic differentiation

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
  "productType": "IMPORTED | BESPOKE_LOCAL | OTHER — IMPORTED if a factory could realistically produce many identical units for import at scale; BESPOKE_LOCAL if this genuinely requires NZ-based custom fabrication or one-off craftsmanship; OTHER only if you truly cannot tell",
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
      productType: 'IMPORTED',
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

  const system = 'You are the research/enrichment step of Prime Piece Pulse, the operating system for Prime Piece\'s scalable IMPORTED natural-stone ecommerce product business. You use web search and report ONLY what you actually find. Never invent a competitor, a price, a review count, or a URL. If you find nothing for a field, use null/empty/"Not found" rather than guessing, and reflect that honestly in demandSignal.type and confidence-relevant fields.';
  const prompt = `Research this candidate product for Prime Piece (premium natural-stone ecommerce, Auckland NZ) using web search: "${product}"${variant ? ` (variant: ${variant})` : ''}${category ? `, category: ${category}` : ''}.

Find: real competitors and their prices, review counts/themes if visible, trend/design-press signals, the size of any pricing/market gap, and qualitative economics (retail price band, AOV, freight/damage difficulty, cross-sell fit). Score all 10 dimensions below 0-100 based only on what you found. Classify productType honestly — most candidates should be IMPORTED; only use BESPOKE_LOCAL if this genuinely cannot be manufactured overseas and imported at scale.

Prime Piece Pulse's central question is what should be imported, tested, reordered, scaled, held or killed next — so flag disqualifiers honestly and put real weight on: bespoke-only or custom-fabrication-only products, bulky/low-value-for-size items with poor freight economics, generic commodity products with no differentiation, products that only make sense at a large speculative minimum order quantity, high compliance/import burden, and categories you can tell are already highly saturated in NZ. Any of these is a valid, useful disqualifier — a low score or a Kill-worthy disqualifier is a genuinely useful result, not a failure.

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

// --- Supplier research (Phase 2 — Supplier + Approval Engine, manual trigger only) --
// Runs only via RADAR_MODE=supplier, targeting one already-discovered Market Radar
// opportunity by id. Never runs as part of 'daily' or 'refresh' — supplier research is
// a deliberately separate, manually-triggered pass, kept off the automatic schedule to
// control cost until this is proven out.
//
// Two-stage pipeline (replaces the single Claude-orchestrated web_search call that
// failed twice in real production on 2026-09-16 — see the TAVILY_SEARCH_URL comment
// above):
//   Stage 1 (gatherSupplierEvidence/tavilySearch) — deterministic web retrieval via
//     Tavily's REST search API. Plain HTTP, no Claude call, no tool loop to hang.
//   Stage 2 (findSuppliers's own Claude call) — one plain, non-tool Claude call that
//     only extracts/ranks from the evidence Stage 1 already collected. No web_search
//     tool is attached, so there is no server-side search loop left to time out.

const SUPPLIER_SCHEMA_EXAMPLE = `{"suppliers": [{
  "name": "string — real company name",
  "country": "string",
  "website": "string or null",
  "sourcePlatform": "string — where you found them, e.g. Alibaba, Global Sources, direct company site, trade directory",
  "credibilityScore": "0-100 — based on real signals only (years trading, verified/trade-assurance badges, review counts, company registration info actually found)",
  "credibilitySignals": ["string — the actual signals behind the score above"],
  "moq": "number or null — minimum order quantity in units",
  "samplePrice": "number or null",
  "sampleCurrency": "$ | NZ$ | AU$ | £ | € | US$ or null",
  "pricingTiers": [{"qty": "number", "unitPrice": "number"}],
  "cartonSpec": {"size": "string or null, e.g. 40x30x20cm", "weightKg": "number or null"},
  "leadTimeDays": "number or null",
  "freightEstimate": "string or null — whatever real freight/shipping info you found, in plain words",
  "complianceNotes": "string or null — any certification, safety standard, or import compliance detail you found",
  "sources": [{"url": "a real URL you actually retrieved via web search this session", "title": "string"}]
}]}`;

// Nullable leaf per the field above — the API's structured-outputs JSON Schema
// support does not document `"type": ["string", "null"]` union syntax, but does
// document `anyOf`, so nullable fields are built that way throughout the schema below.
function nullable(schema) {
  return { anyOf: [schema, { type: 'null' }] };
}

// Enforces the exact shape above at the API level (output_config.format,
// type: "json_schema") — every response is guaranteed valid JSON in this shape or
// the call fails outright, so "the model returned prose instead of JSON" (the
// second failure in the 2026-09-16 production run) can no longer happen. Wrapped in
// a top-level object (root type "object", not "array") to match every documented
// structured-outputs example — a bare top-level array is not documented as supported.
const SUPPLIER_RESPONSE_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      suppliers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            country: { type: 'string' },
            website: nullable({ type: 'string' }),
            sourcePlatform: { type: 'string' },
            credibilityScore: { type: 'number' },
            credibilitySignals: { type: 'array', items: { type: 'string' } },
            moq: nullable({ type: 'number' }),
            samplePrice: nullable({ type: 'number' }),
            sampleCurrency: nullable({ type: 'string' }),
            pricingTiers: {
              type: 'array',
              items: {
                type: 'object',
                properties: { qty: { type: 'number' }, unitPrice: { type: 'number' } },
                required: ['qty', 'unitPrice'],
                additionalProperties: false,
              },
            },
            cartonSpec: {
              type: 'object',
              properties: { size: nullable({ type: 'string' }), weightKg: nullable({ type: 'number' }) },
              required: ['size', 'weightKg'],
              additionalProperties: false,
            },
            leadTimeDays: nullable({ type: 'number' }),
            freightEstimate: nullable({ type: 'string' }),
            complianceNotes: nullable({ type: 'string' }),
            sources: {
              type: 'array',
              items: {
                type: 'object',
                properties: { url: { type: 'string' }, title: { type: 'string' } },
                required: ['url', 'title'],
                additionalProperties: false,
              },
            },
          },
          required: ['name', 'country', 'website', 'sourcePlatform', 'credibilityScore', 'credibilitySignals', 'moq', 'samplePrice', 'sampleCurrency', 'pricingTiers', 'cartonSpec', 'leadTimeDays', 'freightEstimate', 'complianceNotes', 'sources'],
          additionalProperties: false,
        },
      },
    },
    required: ['suppliers'],
    additionalProperties: false,
  },
};

// --- Supplier discovery Stage 1: deterministic web retrieval (Tavily, no Claude) --
// Three targeted queries, run in parallel — a plain REST search API responds in
// seconds and predictably, unlike a Claude-orchestrated web_search tool loop. Results
// are deduped by URL so Stage 2's prompt isn't padded with the same page twice.
function buildSupplierSearchQueries({ product, variant, category }) {
  const productLine = variant ? `${product} (${variant})` : product;
  return [
    `${productLine} manufacturer wholesale supplier`,
    `${productLine} ${category || ''} factory export Alibaba OR "Global Sources" OR "Made-in-China"`.replace(/\s+/g, ' ').trim(),
    `${productLine} manufacturer contact MOQ`,
  ];
}

async function tavilySearch(query, maxResults) {
  const apiKey = process.env.TAVILY_API_KEY;
  const res = await fetchWithRetry(TAVILY_SEARCH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, search_depth: 'basic', max_results: maxResults }),
  }, 'Tavily API');
  const bodyText = await res.text();
  let data = null;
  try { data = JSON.parse(bodyText); } catch { /* handled below */ }
  if (!res.ok || !data) {
    log(`Tavily API: HTTP ${res.status} — body: ${safeSnippet(bodyText)}`);
    throw new Error(`Tavily API error: ${data?.detail?.error || data?.error || `HTTP ${res.status}`}`);
  }
  return (Array.isArray(data.results) ? data.results : []).map((r) => ({ url: r.url, title: r.title, content: r.content, score: typeof r.score === 'number' ? r.score : 0 }));
}

// Fetches and cleans one or more specific URLs' actual page content (not a search —
// used by Fast Track Stage 1 for the product/supplier/competitor URLs James pastes
// in directly). A failed URL (dead link, blocked, JS-only page even at 'advanced'
// depth) is reported per-URL via failed_results, never silently dropped — the caller
// sees exactly which URLs came back empty and why, same evidence-honesty principle
// as everywhere else in this file.
async function tavilyExtract(urls) {
  const apiKey = process.env.TAVILY_API_KEY;
  const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  if (!list.length) return { extracted: [], failed: [] };
  const res = await fetchWithRetry(TAVILY_EXTRACT_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ urls: list, extract_depth: 'advanced', format: 'text' }),
  }, 'Tavily Extract API');
  const bodyText = await res.text();
  let data = null;
  try { data = JSON.parse(bodyText); } catch { /* handled below */ }
  if (!res.ok || !data) {
    log(`Tavily Extract API: HTTP ${res.status} — body: ${safeSnippet(bodyText)}`);
    throw new Error(`Tavily Extract API error: ${data?.detail?.error || data?.error || `HTTP ${res.status}`}`);
  }
  const extracted = (Array.isArray(data.results) ? data.results : []).map((r) => ({ url: r.url, content: r.raw_content || '' }));
  const failed = (Array.isArray(data.failed_results) ? data.failed_results : []).map((r) => ({ url: r.url, error: r.error }));
  if (failed.length) log(`Tavily Extract: ${failed.length} URL(s) failed — ${failed.map((f) => `${f.url} (${f.error})`).join('; ')}`);
  return { extracted, failed };
}

// Stage 2's real-world evidence set (up to 15 raw results across 3 queries) produced
// a prompt large enough that the model's response was truncated mid-JSON at
// maxTokens:3000 in production (2026-09-16) — both attempts failed identically with
// "Unterminated JSON". Capping to the strongest results by Tavily's own relevance
// score, and capping each snippet's length, shrinks the prompt without touching the
// retrieval queries themselves.
const SUPPLIER_EVIDENCE_LIMIT = 8;
const SUPPLIER_EVIDENCE_SNIPPET_CHARS = 450;

// A single failed query is logged and skipped rather than failing the whole gather —
// partial evidence is still useful, and Stage 2 is instructed to only use what it's
// actually given. A missing API key is checked once, up front, rather than letting it
// surface as 3 identical per-query failures collapsing into a generic "no evidence"
// error — a misconfigured secret should be immediately obvious, not look like Tavily
// genuinely found nothing.
async function gatherSupplierEvidence({ product, variant, category }) {
  if (!process.env.TAVILY_API_KEY) throw new Error('TAVILY_API_KEY is not set — required for supplier discovery (Stage 1 web retrieval).');
  const queries = buildSupplierSearchQueries({ product, variant, category });
  const settled = await Promise.allSettled(queries.map((q) => tavilySearch(q, 5)));
  const seen = new Set();
  const evidence = [];
  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      log(`Tavily search failed for query "${queries[i]}": ${result.reason?.message || result.reason}`);
      return;
    }
    for (const item of result.value) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      evidence.push(item);
    }
  });
  // Rank by Tavily's own relevance score and keep only the strongest — this bounds
  // Stage 2's prompt size regardless of how many raw results the 3 queries return.
  return evidence
    .sort((a, b) => b.score - a.score)
    .slice(0, SUPPLIER_EVIDENCE_LIMIT);
}

export async function findSuppliers({ product, variant, category }) {
  if (DRY_RUN) {
    log(`DRY RUN — skipping real supplier search for "${product}", using fixture suppliers.`);
    return [
      { name: 'Dry Run Manufacturing Co (fixture)', country: 'Unknown', website: null, sourcePlatform: 'Dry-run fixture', credibilityScore: 40, credibilitySignals: ['Dry-run fixture — no real search performed.'], moq: 100, samplePrice: 25, sampleCurrency: 'US$', pricingTiers: [{ qty: 50, unitPrice: 12 }, { qty: 100, unitPrice: 10 }], cartonSpec: { size: null, weightKg: null }, leadTimeDays: 30, freightEstimate: 'Dry-run fixture.', complianceNotes: null, sources: [] },
      { name: 'Dry Run Trading Ltd (fixture)', country: 'Unknown', website: null, sourcePlatform: 'Dry-run fixture', credibilityScore: 60, credibilitySignals: ['Dry-run fixture — no real search performed.'], moq: 50, samplePrice: 30, sampleCurrency: 'US$', pricingTiers: [{ qty: 50, unitPrice: 14 }, { qty: 100, unitPrice: 11 }], cartonSpec: { size: null, weightKg: null }, leadTimeDays: 21, freightEstimate: 'Dry-run fixture.', complianceNotes: null, sources: [] },
    ];
  }

  const evidence = await gatherSupplierEvidence({ product, variant, category });
  log(`Gathered ${evidence.length} unique evidence item(s) from Tavily for "${product}".`);
  if (!evidence.length) {
    throw new Error('Tavily returned no usable search results for this product — cannot extract suppliers from no evidence.');
  }

  const evidenceBlock = evidence
    .map((e, i) => `[${i + 1}] ${e.title || '(no title)'}\nURL: ${e.url}\n${(e.content || '').slice(0, SUPPLIER_EVIDENCE_SNIPPET_CHARS)}`)
    .join('\n\n');

  // Stage 2: extraction/ranking only — no web_search tool, so there is no server-side
  // search loop left to hang (the cause of both real production timeouts on
  // 2026-09-16). Claude reasons only over the evidence Stage 1 already gathered.
  const system = 'You are the supplier-sourcing step of Prime Piece Pulse. You extract REAL manufacturer/supplier facts strictly from the search evidence given to you below — you have no web access of your own. Never invent a company, price, MOQ, URL, or any other commercial detail that is not explicitly present in the evidence. If a fact is not clearly supported by the evidence, its field must be null — never guess or infer a plausible-sounding value.';
  const prompt = `Here is web search evidence (title, URL, and page excerpt) gathered for this product: "${product}"${variant ? ` (variant: ${variant})` : ''}${category ? `, category: ${category}` : ''}.

${evidenceBlock}

From ONLY the evidence above, identify up to 3 companies that the evidence clearly shows genuinely MANUFACTURE or SUPPLY this product (or a very close match) for wholesale/export. Reject general retailers, marketplace homepages, blog/news posts, and any company whose relevance as an actual manufacturer/supplier is not clearly supported by the evidence — do not include a company just to reach 3; return fewer if fewer are well-supported.

Hard rule on every field: MOQ, sample price, pricing tiers, credibility signals (years trading, badges, review counts), carton/weight, lead time, freight information, and compliance notes must each be null unless the evidence text above actually states that specific fact for that company — never infer, estimate, or fill in a plausible-sounding value from general knowledge. Every supplier's "sources" must be exactly the URL(s) from the evidence above that support it — never a URL not shown above.

Respond in exactly this shape (up to 3 entries in "suppliers"):
${SUPPLIER_SCHEMA_EXAMPLE}`;

  // responseFormat (structured outputs) constrains the response to valid JSON in this
  // exact shape at the API level. maxTokens raised from the original 3000 (which
  // truncated mid-JSON in production on 2026-09-16 — see SUPPLIER_EVIDENCE_LIMIT
  // above for the evidence-size half of that fix) to 4500 — up to 3 suppliers with
  // no prose, over an evidence set now capped at 8 short snippets, should fit
  // comfortably with headroom. Two attempts, reusing the same Stage 1 evidence (no
  // reason to re-spend Tavily credits on a retry of the extraction step alone).
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { text, stopReason } = await callClaude({ system, prompt, maxTokens: 4500, responseFormat: SUPPLIER_RESPONSE_FORMAT });
      // A max_tokens stop is truncation, not malformed output — report it as exactly
      // that instead of handing an incomplete response to extractJson, which would
      // just produce a confusing "Unterminated JSON" message for the same root cause.
      if (stopReason === 'max_tokens') {
        throw new Error('Supplier extraction response was truncated (stop_reason=max_tokens) before completing — this is a token-budget cutoff, not malformed JSON.');
      }
      log(`Supplier extraction for "${product}" completed (attempt ${attempt}/2, stop_reason=${stopReason}).`);
      // extractJson still runs as a defensive fallback (e.g. if output_config were
      // ever ignored by a given deployment) — it recovers JSON wrapped in markdown
      // fences or stray prose locally, with no extra paid call. Accepts either the
      // {"suppliers": [...]} shape or a bare array.
      const parsed = extractJson(text);
      const suppliers = Array.isArray(parsed) ? parsed : parsed?.suppliers;
      if (!Array.isArray(suppliers)) throw new Error('Supplier extraction did not return a JSON array.');
      return suppliers;
    } catch (err) {
      lastErr = err;
      log(`Supplier extraction for "${product}" attempt ${attempt}/2 failed: ${err.message}`);
    }
  }
  throw lastErr;
}

// Plain code, mirrors auditRaw(): strips implausible source URLs and clamps
// credibilityScore into range — the one step in this pipeline deliberately suspicious
// of the model's own output, same as the opportunity Evidence Auditor.
export function auditSuppliers(rawSuppliers) {
  return (rawSuppliers || []).map((s) => {
    const sources = Array.isArray(s.sources) ? s.sources.filter((src) => isPlausibleUrl(src?.url)) : [];
    const droppedCount = (s.sources?.length || 0) - sources.length;
    if (droppedCount > 0) log(`Supplier Evidence Auditor: dropped ${droppedCount} implausible source URL(s) for "${s.name}".`);
    const credibilityScore = typeof s.credibilityScore === 'number' ? Math.max(0, Math.min(100, s.credibilityScore)) : null;
    return { ...s, sources, credibilityScore, evidenceGap: sources.length === 0 };
  });
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
    // _productTypeTagged=true: Enrich just classified productType from real research,
    // so the one-time store.js migration (which only backfills pre-existing untagged
    // items) must never overwrite it on a later read.
    const created = { id: nextRadarId(list), ...item, _productTypeTagged: true, trendDirection: trendDirectionFromHistory(history), firstSeen: TODAY, lastResearched: TODAY, history, promotedToProductLab: false };
    list.push(created);
    return { action: 'created', item: created };
  }

  const existing = list[idx];
  const shift = biggestDimensionShift(existing.scoreBreakdown, item.scoreBreakdown);
  const historyEntry = { scanDate: TODAY, score: item.opportunityScore, confidence: item.confidenceScore, priceRange: item.priceBand, reviewCount: null, note: shift ? `${note} — ${shift}` : note };
  const history = [...(existing.history || []), historyEntry];
  const updated = {
    ...existing, ...item, id: existing.id, _productTypeTagged: true,
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

// Prime Piece Pulse's central question is what to import next — a bespoke/local NZ
// fabrication item (productType BESPOKE_LOCAL) or one with unknown productType (OTHER,
// not yet classified) must never distort product discovery, Next $1,000, or ranking.
// Only IMPORTED items are eligible here. Current-operations context (Active/Maintain/
// Killed) is untouched — this exclusion is specifically about forward-looking ranking.
const isImportEligible = (item) => item.productType === 'IMPORTED';

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
  const researchCandidates = products.filter((p) => p.priorityLane === 'Research Candidate' && notKilled(p) && isImportEligible(p)).map((p) => ({
    name: p.name, tier: p.tier || null, stage: p.status, primeOpportunityScore: primeOpportunityScore(p),
    unitEconomics: productEconomics(p), keyTakeaway: p.me_keyTakeaway || null, performance: perf(p),
  }));
  const maintainProducts = products.filter((p) => p.priorityLane === 'Maintain' && notKilled(p)).map((p) => ({ name: p.name, tier: p.tier || null, stage: p.status }));
  const recentlyKilledProducts = products.filter((p) => p.status === 'KILL').slice(-5).map((p) => ({ name: p.name, reason: p.notes || null }));
  const recentlyKilledRadarItems = radar.filter((r) => r.tier === 'Kill').slice(-5).map((r) => ({ name: r.product, reason: (r.disqualifiers || []).join('; ') || null }));

  const notPromoted = (r) => !r.promotedToProductLab;
  const topOpportunities = radar.filter((r) => notPromoted(r) && r.tier !== 'Kill' && isImportEligible(r))
    .slice().sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0)).slice(0, 5)
    .map((r) => ({ name: r.product, variant: r.variant || null, opportunityScore: r.opportunityScore, confidenceScore: r.confidenceScore, tier: r.tier, trendDirection: r.trendDirection, mainMarket: r.mainMarket || null, estimatedRetail: r.economicsPotential?.retailPriceRangeEstimate || null }));

  const movers = radar.filter((r) => (r.history || []).length >= 2 && isImportEligible(r)).map((r) => {
    const [prev, cur] = r.history.slice(-2);
    const delta = (cur.score ?? null) !== null && (prev.score ?? null) !== null ? cur.score - prev.score : null;
    return { name: r.product, variant: r.variant || null, previousScore: prev.score, newScore: cur.score, scoreDelta: delta, trendDirection: r.trendDirection, whatChanged: cur.note || null };
  }).filter((m) => m.scoreDelta !== null && Math.abs(m.scoreDelta) >= 5)
    .sort((a, b) => Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta)).slice(0, 5);

  const newThisRun = radar.filter((r) => r.firstSeen === TODAY && (r.history || []).length === 1 && isImportEligible(r))
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

  // 2000 was measured too tight in production: a real (non-fixture) brief with
  // actual bullets, rationale and moves got cut off mid-JSON before the model
  // finished (confirmed 2026-09-15, run 35025859555 — "Unterminated JSON in model
  // response"). This call is plain text completion, not search — doubling the
  // ceiling costs little and gives real output room to finish.
  const { text } = await callClaude({ system, prompt, maxTokens: 4000 });
  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Synthesis did not return a JSON object.');
  if (!Array.isArray(parsed.pulseBullets) || !Array.isArray(parsed.threeMoves) || !Array.isArray(parsed.missingDataWarnings) || !parsed.nextThousand) {
    throw new Error('Synthesis JSON is missing an expected field.');
  }
  return parsed;
}

// --- Quote request template (plain text, no Claude call) --------------------------
// This is fixed business boilerplate, not something that benefits from an LLM
// generating it fresh each time (and doing so would cost a call for no real gain) —
// a deterministic template keeps every enquiry consistent and guarantees the one hard
// rule (never reveal Prime Piece's target retail price or margin) can never be
// accidentally violated by a model improvising wording. James copies this into his own
// email client and sends it himself; nothing here transmits anything.
export function buildQuoteRequestEmail({ supplierName, product, variant, category }) {
  const productLine = variant ? `${product} (${variant})` : product;
  const subject = `Wholesale enquiry — ${productLine}`;
  const body = `Hello ${supplierName || 'there'},

We are Prime Piece, a premium natural-stone homeware retailer based in Auckland, New Zealand, and we are evaluating suppliers for the following product:

${productLine}${category ? ` — category: ${category}` : ''}

Could you please provide the following information:

- Sample availability and sample price
- Minimum order quantity (MOQ)
- Unit pricing at 10 / 25 / 50 / 100 units
- Available real stone types for this product
- Standard dimensions, and whether custom dimensions are available
- Net weight and packaged weight
- Carton/crate dimensions
- Packaging method
- Production lead time
- Branding or custom packaging options
- Incoterms you work under
- Shipping options and estimated cost to Auckland, New Zealand
- Your damage/replacement policy
- Any relevant quality control or certification information

Thank you for your time — we look forward to your reply.

Kind regards,
Prime Piece`;
  return { subject, body };
}

// --- Supplier mode: manual trigger only, one existing opportunity at a time --------
// Deliberately not part of 'daily' — this is the Supplier + Approval Engine's first
// step, kept manual until proven out. Finds suppliers, ranks them by commercial terms
// (rankSuppliers — meaningless before any quote exists, kept for later) and separately
// by outreach fit (selectOutreachBatch — credibility + product/export/material
// evidence, the actual basis for choosing who to contact), saves the full batch, and
// creates ONE approval covering the top 3 by outreach fit. Never sends anything —
// approving only unlocks the drafted enquiry text for James to send himself.
async function runSupplierMode() {
  const targetId = process.env.RADAR_SUPPLIER_TARGET;
  if (!targetId) throw new Error('RADAR_MODE=supplier requires RADAR_SUPPLIER_TARGET="<radar opportunity id>", e.g. radar_003.');

  const radar = await getRadarOpportunities();
  const opportunity = radar.find((o) => o.id === targetId);
  if (!opportunity) throw new Error(`No Market Radar opportunity found with id "${targetId}".`);
  if (opportunity.productType && opportunity.productType !== 'IMPORTED') {
    throw new Error(`"${opportunity.product}" is tagged productType=${opportunity.productType}, not IMPORTED — supplier research only runs for importable opportunities.`);
  }

  log(`Researching suppliers for "${opportunity.product}"${opportunity.variant ? ` (${opportunity.variant})` : ''}...`);
  const rawSuppliers = await findSuppliers({ product: opportunity.product, variant: opportunity.variant, category: opportunity.category });
  const audited = auditSuppliers(rawSuppliers);
  const now = new Date().toISOString();
  const withIds = audited.map((s) => ({
    ...s,
    id: 'sup_' + Math.random().toString(36).slice(2, 10),
    opportunityId: opportunity.id,
    status: 'DISCOVERED',
    lastContactedAt: null,
    quoteParseStatus: null,
    quoteRawText: null,
    quoteReceivedAt: null,
    createdAt: now,
    updatedAt: now,
  }));

  // Commercial ranking (rankSuppliers) is attached now even though it's near-uniformly
  // low pre-quote — it becomes meaningful once quote-capture runs and is kept here so
  // the Suppliers page always has a consistent shape to render.
  const commerciallyRanked = rankSuppliers(withIds);

  await saveSupplierBatch(opportunity.id, commerciallyRanked);
  log(`Saved ${commerciallyRanked.length} supplier(s) for "${opportunity.product}".`);

  if (!commerciallyRanked.length) {
    log('No suppliers found — no approval request created.');
    return;
  }

  const outreachTarget = { product: opportunity.product, variant: opportunity.variant, category: opportunity.category };
  const batch = selectOutreachBatch(commerciallyRanked, outreachTarget, 3);
  const draftMessages = batch.map((s) => ({ supplierId: s.id, supplierName: s.name, ...buildQuoteRequestEmail({ supplierName: s.name, ...outreachTarget }) }));

  const batchLines = batch.map((s) => `${s.name} (${s.country || 'country unknown'}) — outreach fit ${s.outreachFitScore}/100 [credibility ${s.breakdown.credibility}, product match ${s.breakdown.productMatch}, export ${s.breakdown.exportCapability}, material ${s.breakdown.materialCapability}]`);
  const summary = `Supplier research for "${opportunity.product}"${opportunity.variant ? ` (${opportunity.variant})` : ''} found ${commerciallyRanked.length} candidate supplier(s). Recommending outreach to the ${batch.length} best-fit suppliers for a real quote — selected on credibility, explicit product/category match, export capability and material capability, not on current commercial-term scores (which are uninformative before any quote exists).`;
  const rationale = `Selection order: ${batchLines.join(' | ')}.`;
  await createApprovalRequest({
    type: 'SUPPLIER_OUTREACH',
    opportunityId: opportunity.id,
    supplierIds: batch.map((s) => s.id),
    draftMessages,
    summary,
    recommendation: `Approve sending the drafted enquiry to ${batch.map((s) => s.name).join(', ')}.`,
    rationale,
    estimatedCost: null, // a research/contact recommendation, not a purchase — no dollar cost to approve here
  });
  log(`Approval request created: SUPPLIER_OUTREACH for ${batch.map((s) => s.name).join(', ')}.`);
}

// --- Quote reply parsing (Phase 3 — Supplier Outreach + Quote Capture) -------------
// James pastes a supplier's real email reply into the Suppliers page (no email
// integration exists — see the module comment above); that raw text is stored via
// store.js's recordRawQuoteReply(). This one Claude call, no web search, turns that
// unstructured text into the same structured fields the Supplier record already has
// slots for. Never invents a figure the supplier didn't actually state.

const QUOTE_SCHEMA_EXAMPLE = `{
  "moq": "number or null — minimum order quantity in units",
  "samplePrice": "number or null",
  "sampleCurrency": "$ | NZ$ | AU$ | £ | € | US$ or null",
  "pricingTiers": [{"qty": "number", "unitPrice": "number"}],
  "materials": ["string — real stone types actually mentioned, e.g. White Carrara Marble, Beige Travertine"],
  "customDimensionsNotes": "string or null",
  "netWeightKg": "number or null",
  "cartonSpec": {"size": "string or null", "weightKg": "number or null — packaged/carton weight, distinct from netWeightKg"},
  "packagingMethod": "string or null",
  "leadTimeDays": "number or null",
  "brandingOptions": "string or null",
  "incoterms": "string or null, e.g. FOB, EXW, CIF",
  "freightEstimate": "string or null — whatever freight/shipping information was actually given, in plain words",
  "freightPerUnitEstimateUSD": "number or null — ONLY if a per-unit or easily-divisible freight figure was actually given; do not estimate or calculate one yourself",
  "complianceNotes": "string or null — QC process or certifications actually mentioned",
  "damageReplacementPolicy": "string or null"
}`;

export async function parseQuoteReply({ rawText, supplierName }) {
  if (DRY_RUN) {
    log(`DRY RUN — skipping real quote parse for "${supplierName}", using a fixture.`);
    return {
      moq: 50, samplePrice: 20, sampleCurrency: 'US$', pricingTiers: [{ qty: 50, unitPrice: 12 }, { qty: 100, unitPrice: 10 }],
      materials: ['Dry-run fixture'], customDimensionsNotes: null, netWeightKg: null, cartonSpec: { size: null, weightKg: null },
      packagingMethod: null, leadTimeDays: 25, brandingOptions: null, incoterms: 'FOB', freightEstimate: 'Dry-run fixture.',
      freightPerUnitEstimateUSD: null, complianceNotes: null, damageReplacementPolicy: null,
    };
  }

  const system = 'You extract structured commercial quote data from a real supplier email reply for Prime Piece Pulse. Report ONLY what the reply actually states. Never invent a number, material, or term the supplier did not mention, and never calculate a figure (like a per-unit freight cost) the supplier did not state directly. Use null for anything not stated.';
  const prompt = `Here is a supplier's (${supplierName}) reply to a quote request. Extract the structured fields below from ONLY what is actually stated in the reply.

---
${rawText}
---

Respond with ONLY a JSON object (no markdown fences, no prose) in exactly this shape:
${QUOTE_SCHEMA_EXAMPLE}`;

  // Plain text extraction, no web search — same single-attempt shape as
  // synthesizeBrief() (fetchWithRetry's own 429/5xx retry still applies; there's no
  // search budget to reduce on a retry, so no second attempt is made here either).
  const { text } = await callClaude({ system, prompt, maxTokens: 2000 });
  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`Quote parse for "${supplierName}" did not return a JSON object.`);
  return parsed;
}

// --- Landed economics (plain code, no Claude call) ---------------------------------
// Every figure here is either a real number carried straight from a supplier's own
// quote or Market Radar's own priceBand, or explicitly null with a note — never a
// guess, never a missing figure silently treated as zero. This is what the SAMPLE_ORDER
// approval is built from.
export function estimateLandedEconomics(supplier, opportunity, rankedSuppliers) {
  const unitPriceAt50 = representativeUnitPrice(supplier);
  const freightPerUnitEstimateUSD = typeof supplier.freightPerUnitEstimateUSD === 'number' ? supplier.freightPerUnitEstimateUSD : null;
  const estimatedLandedCost = (unitPriceAt50 !== null && freightPerUnitEstimateUSD !== null) ? unitPriceAt50 + freightPerUnitEstimateUSD : null;
  const landedCostNote = unitPriceAt50 === null
    ? 'No unit pricing received from this supplier yet.'
    : freightPerUnitEstimateUSD === null
      ? 'Unit price is known; a per-unit freight figure was not stated, so landed cost is incomplete rather than assumed.'
      : null;

  const sampleLandedCost = typeof supplier.samplePrice === 'number' ? supplier.samplePrice : null;

  const targetRetail = opportunity.priceBand && typeof opportunity.priceBand.low === 'number' ? opportunity.priceBand.low : null;
  const targetRetailCurrency = opportunity.priceBand?.currency || null;
  const targetRetailNote = 'Entry-tier price from Market Radar\'s priceBand — a real target retail figure should be confirmed in Product Lab once/if this product is promoted.';

  const grossMarginPct = (estimatedLandedCost !== null && targetRetail) ? Math.round(((targetRetail - estimatedLandedCost) / targetRetail) * 1000) / 10 : null;

  const mainRisks = [
    ...((opportunity.operatingRisks || [])),
    ...(supplier.evidenceGap ? ['No verifiable source URLs were found for this supplier during discovery — treat with caution.'] : []),
  ].slice(0, 5);

  const others = (rankedSuppliers || []).filter((s) => s.id !== supplier.id);
  const whyBeatsAlternatives = others.length
    ? `Ranked ${supplier.supplierScore}/100 on real commercial terms vs. next-best "${others[0].name}" at ${others[0].supplierScore}/100.`
    : 'Only supplier with a recorded quote so far — no alternative to compare against yet.';

  return {
    unitPriceAt50, freightPerUnitEstimateUSD, estimatedLandedCost, landedCostNote,
    sampleLandedCost, targetRetail, targetRetailCurrency, targetRetailNote, grossMarginPct,
    contributionMarginPotential: null,
    contributionMarginNote: "Not computable yet — requires Prime Piece's own packaging/fulfilment/payment-fee assumptions, entered once this product is promoted to Product Lab.",
    mainRisks, whyBeatsAlternatives,
  };
}

// --- Demand-evidence enrichment (Commercial Funnel support, manual trigger only) ---
// The Commercial Funnel's Demand Proof gate can only distinguish "no real demand"
// from "not yet researched" if competitor/review evidence actually exists — most of
// Market Radar's items were never given a dedicated consumer-market search (Enrich's
// original pass is broader and thinner). This targets EXACTLY the opportunities that
// currently PASS computeFitGate (the same gate the funnel itself uses, so the target
// set can never drift from what's actually worth investigating), and gathers ONLY
// consumer-market demand evidence — real retailers, countries, review counts, sold-
// out/bestseller signals, real retail prices, NZ competitors. Uses Tavily for
// retrieval and a plain non-tool Claude call for extraction, the same two-stage
// pattern as supplier discovery above and for the same reason: no Anthropic
// web_search tool loop to hang. Never touches opportunityScore, confidenceScore,
// scoreBreakdown, or priceBand (Prime Piece's own anticipated retail estimate) —
// purely additive evidence into the existing competitors[]/trendSignals[] fields the
// Demand Proof / Price Validation / NZ Gap functions already read.
function buildDemandSearchQueries({ product, variant, category }) {
  const productLine = variant ? `${product} (${variant})` : product;
  return [
    `${productLine} buy reviews`,
    `${productLine} bestseller OR "sold out" OR backorder OR "best seller"`,
    `${productLine} New Zealand retailer OR store`,
    `${productLine} ${category || ''} price`.replace(/\s+/g, ' ').trim(),
  ];
}

const DEMAND_EVIDENCE_LIMIT = 8;
const DEMAND_EVIDENCE_SNIPPET_CHARS = 450;

async function gatherDemandEvidence({ product, variant, category }) {
  if (!process.env.TAVILY_API_KEY) throw new Error('TAVILY_API_KEY is not set — required for demand-evidence enrichment (Stage 1 web retrieval).');
  const queries = buildDemandSearchQueries({ product, variant, category });
  const settled = await Promise.allSettled(queries.map((q) => tavilySearch(q, 5)));
  const seen = new Set();
  const evidence = [];
  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      log(`Tavily search failed for query "${queries[i]}": ${result.reason?.message || result.reason}`);
      return;
    }
    for (const item of result.value) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      evidence.push(item);
    }
  });
  return evidence.sort((a, b) => b.score - a.score).slice(0, DEMAND_EVIDENCE_LIMIT);
}

const DEMAND_SCHEMA_EXAMPLE = `{
  "competitors": [{"name": "string", "country": "string", "priceLow": number|null, "priceHigh": number|null, "reviewCount": number|null, "bestsellerFlag": boolean}],
  "trendSignals": [{"signal": "string", "type": "Fact | Proxy / Signal | Estimate | Founder Assumption", "source": "string"}]
}`;

const DEMAND_RESPONSE_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      competitors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            country: { type: 'string' },
            priceLow: nullable({ type: 'number' }),
            priceHigh: nullable({ type: 'number' }),
            reviewCount: nullable({ type: 'number' }),
            bestsellerFlag: { type: 'boolean' },
          },
          required: ['name', 'country', 'priceLow', 'priceHigh', 'reviewCount', 'bestsellerFlag'],
          additionalProperties: false,
        },
      },
      trendSignals: {
        type: 'array',
        items: {
          type: 'object',
          properties: { signal: { type: 'string' }, type: { type: 'string' }, source: { type: 'string' } },
          required: ['signal', 'type', 'source'],
          additionalProperties: false,
        },
      },
    },
    required: ['competitors', 'trendSignals'],
    additionalProperties: false,
  },
};

export async function findDemandEvidence({ product, variant, category }) {
  if (DRY_RUN) {
    log(`DRY RUN — skipping real demand-evidence search for "${product}", using fixture evidence.`);
    return {
      competitors: [{ name: 'Dry Run Retailer (fixture)', country: 'Unknown', priceLow: 100, priceHigh: 150, reviewCount: 10, bestsellerFlag: false }],
      trendSignals: [{ signal: 'Dry-run fixture signal', type: 'Founder Assumption', source: 'Dry-run fixture' }],
    };
  }

  const evidence = await gatherDemandEvidence({ product, variant, category });
  log(`Gathered ${evidence.length} unique demand-evidence item(s) from Tavily for "${product}".`);
  if (!evidence.length) {
    // No evidence found is a genuinely useful result, not a failure — the caller
    // merges this in as zero new competitors/signals, which keeps Demand Proof at
    // UNKNOWN rather than the pipeline throwing over a product Tavily just has
    // nothing on.
    return { competitors: [], trendSignals: [] };
  }

  const evidenceBlock = evidence
    .map((e, i) => `[${i + 1}] ${e.title || '(no title)'}\nURL: ${e.url}\n${(e.content || '').slice(0, DEMAND_EVIDENCE_SNIPPET_CHARS)}`)
    .join('\n\n');

  const system = 'You are the demand-evidence extraction step of Prime Piece Pulse. You extract REAL consumer-market facts strictly from the search evidence given to you below — you have no web access of your own. Never invent a retailer, price, review count, or country not clearly supported by the evidence. If a fact is not stated, leave it null/empty. A bestsellerFlag of true requires the evidence to explicitly say the item is a bestseller, sold out, on backorder, or similarly in-demand — never infer this from price or general popularity alone.';
  const prompt = `Here is web search evidence (title, URL, page excerpt) gathered for this product: "${product}"${variant ? ` (variant: ${variant})` : ''}${category ? `, category: ${category}` : ''}.

${evidenceBlock}

From ONLY the evidence above, extract:
1. "competitors": every distinct real retailer/seller genuinely selling this product or a close match (NOT manufacturers/wholesalers/Alibaba-style listings — this is consumer-facing retail evidence only). For each: name, country (the market it sells into, only if clearly supported), priceLow/priceHigh if a real price is stated, reviewCount if stated, bestsellerFlag per the rule above.
2. "trendSignals": any other real demand signal not already captured as a specific retailer above (e.g. "stocked by multiple independent boutiques", "featured in [publication]", genuine search/social trend evidence). type must be "Fact" (directly stated), "Proxy / Signal" (an indirect indicator like a bestseller badge or multi-retailer stocking), "Estimate", or "Founder Assumption" only if you are inferring rather than reading a direct statement.

Leave a field null or omit an array entry rather than padding results to look more complete than the evidence supports.

Respond with ONLY a JSON object in exactly this shape:
${DEMAND_SCHEMA_EXAMPLE}`;

  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { text, stopReason } = await callClaude({ system, prompt, maxTokens: 3500, responseFormat: DEMAND_RESPONSE_FORMAT });
      if (stopReason === 'max_tokens') {
        throw new Error('Demand-evidence extraction response was truncated (stop_reason=max_tokens) before completing.');
      }
      log(`Demand-evidence extraction for "${product}" completed (attempt ${attempt}/2, stop_reason=${stopReason}).`);
      const parsed = extractJson(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Demand-evidence extraction did not return a JSON object.');
      return { competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [], trendSignals: Array.isArray(parsed.trendSignals) ? parsed.trendSignals : [] };
    } catch (err) {
      lastErr = err;
      log(`Demand-evidence extraction for "${product}" attempt ${attempt}/2 failed: ${err.message}`);
    }
  }
  throw lastErr;
}

function demandEvidenceDedupeKey(name, country) {
  return `${(name || '').trim().toLowerCase()}|${(country || '').trim().toLowerCase()}`;
}

// Purely additive merge: new competitors/trendSignals are appended if not already
// present (by name+country, or by exact signal text) — never overwrites or removes
// existing evidence, never touches opportunityScore/confidenceScore/scoreBreakdown/
// priceBand. Records a history entry so the enrichment pass itself is auditable.
export function mergeDemandEvidence(opportunity, evidence) {
  const existingCompetitorKeys = new Set((opportunity.competitors || []).map((c) => demandEvidenceDedupeKey(c.name, c.country)));
  const newCompetitors = (evidence.competitors || []).filter((c) => c?.name && !existingCompetitorKeys.has(demandEvidenceDedupeKey(c.name, c.country)));
  const existingSignalTexts = new Set((opportunity.trendSignals || []).map((t) => (t.signal || '').trim().toLowerCase()));
  const newTrendSignals = (evidence.trendSignals || []).filter((t) => t?.signal && !existingSignalTexts.has(t.signal.trim().toLowerCase()));

  return {
    ...opportunity,
    competitors: [...(opportunity.competitors || []), ...newCompetitors],
    trendSignals: [...(opportunity.trendSignals || []), ...newTrendSignals],
    lastResearched: TODAY,
    history: [...(opportunity.history || []), {
      scanDate: TODAY, score: opportunity.opportunityScore, confidence: opportunity.confidenceScore, priceRange: opportunity.priceBand, reviewCount: null,
      note: `Demand-evidence enrichment (Tavily) — +${newCompetitors.length} competitor(s), +${newTrendSignals.length} trend signal(s)`,
    }],
  };
}

async function runDemandEvidenceMode() {
  const radar = await getRadarOpportunities();
  const targets = radar.filter((o) => computeFitGate(o).result === 'PASS');
  log(`Demand-evidence pass targeting ${targets.length} opportunity(ies) that currently PASS Prime Piece Fit: ${targets.map((o) => o.id).join(', ') || '(none)'}`);
  if (!targets.length) {
    log('Nothing to enrich — no opportunity currently passes Fit.');
    return;
  }

  let succeeded = 0, failed = 0;
  for (const target of targets) {
    try {
      log(`Gathering demand evidence for "${target.product}"${target.variant ? ` (${target.variant})` : ''}...`);
      const evidence = await findDemandEvidence({ product: target.product, variant: target.variant, category: target.category });
      const idx = radar.findIndex((o) => o.id === target.id);
      radar[idx] = mergeDemandEvidence(radar[idx], evidence);
      const merged = radar[idx];
      log(`"${target.product}": now ${merged.competitors.length} total competitor(s), ${merged.trendSignals.length} total trend signal(s) on record.`);
      succeeded++;
    } catch (err) {
      failed++;
      log(`FAILED demand-evidence pass on "${target.product}": ${err.message}`);
    }
  }

  await saveRadarOpportunities(radar);
  log(`Saved. ${succeeded} succeeded, ${failed} failed.`);
  if (failed > 0 && succeeded === 0) {
    throw new Error(`All ${failed} demand-evidence pass(es) failed — see logs above.`);
  }
}

// =====================================================================================
// FAST TRACK PRODUCT ANALYSIS (manual trigger only, RADAR_MODE=fast-track)
// James pastes a product URL (+ optional supplier/competitor URLs, notes, image) into
// Pulse; that creates a PENDING record in Redis (scale_os:fasttrack:v1) at zero cost.
// This mode processes every PENDING record in one run — same "process everything
// waiting" convention as quote-capture — through 6 real-evidence stages (Tavily
// Extract for the pasted URLs, Tavily Search + a plain non-tool Claude call for
// market/design/supplier research, one more plain Claude call for risk) plus one
// deterministic stage (economics) and a deterministic decision assembly
// (computeFastTrackDecision in scoring.mjs). Never runs automatically; never orders
// anything; a KILL/HOLD/SAMPLE here is a recommendation for James, same as every
// other decision this system produces.
// =====================================================================================

function nullableStr() { return nullable({ type: 'string' }); }
function nullableNum() { return nullable({ type: 'number' }); }

// --- Stage 1: Product extraction ----------------------------------------------------
const FAST_TRACK_EXTRACT_SCHEMA_EXAMPLE = `{
  "category": "string", "materials": "string", "dimensions": "string or null", "capacity": "string or null",
  "constructionMethod": "string or null", "designForm": "string", "accessories": "string or null",
  "retailPrice": {"value": number|null, "currency": "string or null"},
  "targetCustomer": "string", "positioning": "string", "sellingPoints": ["string"],
  "careInstructions": "string or null", "foodSafetyClaims": "string or null",
  "stockSignal": "IN_STOCK | PREORDER | SOLD_OUT | WAITLIST | UNKNOWN",
  "searchVariants": ["string — 5-7 realistic search phrases a shopper or competitor-scout would use to find this exact product category, e.g. for a marble espresso cup: 'marble espresso cup', 'natural stone coffee cup', 'onyx espresso cup'"],
  "confidenceType": "FACT | ESTIMATE | INFERENCE | UNKNOWN — FACT if this was read directly off the page, UNKNOWN if the page failed to load"
}`;
const FAST_TRACK_EXTRACT_RESPONSE_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      category: { type: 'string' }, materials: { type: 'string' }, dimensions: nullableStr(), capacity: nullableStr(),
      constructionMethod: nullableStr(), designForm: { type: 'string' }, accessories: nullableStr(),
      retailPrice: { type: 'object', properties: { value: nullableNum(), currency: nullableStr() }, required: ['value', 'currency'], additionalProperties: false },
      targetCustomer: { type: 'string' }, positioning: { type: 'string' }, sellingPoints: { type: 'array', items: { type: 'string' } },
      careInstructions: nullableStr(), foodSafetyClaims: nullableStr(), stockSignal: { type: 'string' },
      searchVariants: { type: 'array', items: { type: 'string' } }, confidenceType: { type: 'string' },
    },
    required: ['category', 'materials', 'dimensions', 'capacity', 'constructionMethod', 'designForm', 'accessories', 'retailPrice', 'targetCustomer', 'positioning', 'sellingPoints', 'careInstructions', 'foodSafetyClaims', 'stockSignal', 'searchVariants', 'confidenceType'],
    additionalProperties: false,
  },
};

// imageBase64, if provided, is a data URL ("data:image/jpeg;base64,...") from the
// Fast Track form's file input — passed to Claude as a real image content block
// (vision), not described in text. Never fabricates page content for a URL that
// failed to extract; the prompt is told explicitly when that happened.
function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  return m ? { mediaType: m[1], data: m[2] } : null;
}

export async function fastTrackExtractProduct({ productUrl, notes, imageBase64 }) {
  if (DRY_RUN) {
    log('DRY RUN — skipping real Fast Track extraction, using a fixture.');
    return {
      category: 'Dry-run fixture category', materials: 'Dry-run fixture', dimensions: null, capacity: null,
      constructionMethod: null, designForm: 'Dry-run fixture', accessories: null, retailPrice: { value: null, currency: null },
      targetCustomer: 'Dry-run fixture', positioning: 'Dry-run fixture', sellingPoints: [], careInstructions: null,
      foodSafetyClaims: null, stockSignal: 'UNKNOWN', searchVariants: ['dry-run fixture variant'], confidenceType: 'UNKNOWN',
    };
  }

  const { extracted, failed } = await tavilyExtract([productUrl]);
  const pageText = extracted[0]?.content ? extracted[0].content.slice(0, 6000) : null;
  if (!pageText) {
    log(`Fast Track: could not extract product URL content (${failed.map((f) => f.error).join('; ') || 'no content returned'}).`);
  }

  const system = 'You are the product-extraction step of Prime Piece Pulse\'s Fast Track workflow. Extract ONLY what the page content (and image, if given) actually shows. Never invent a dimension, price, material, or claim not present in the evidence — use null/empty and confidenceType UNKNOWN for anything not actually stated.';
  const textForPrompt = pageText
    ? `Here is the extracted content of the product page (${productUrl}):\n\n${pageText}`
    : `The product page (${productUrl}) could not be extracted (${failed.map((f) => f.error).join('; ') || 'no content'}). Rely only on the founder's notes below and/or the attached image, if any.`;
  const notesLine = notes ? `\n\nFounder's notes: ${notes}` : '';
  const promptText = `${textForPrompt}${notesLine}\n\nExtract the product's details. Respond with ONLY a JSON object (no markdown fences, no prose) in exactly this shape:\n${FAST_TRACK_EXTRACT_SCHEMA_EXAMPLE}`;

  const image = parseDataUrl(imageBase64);
  const content = image
    ? [{ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } }, { type: 'text', text: promptText }]
    : promptText;

  // callClaude's `prompt` param is passed straight through as the message's `content`
  // field, which the Messages API accepts as either a plain string or an array of
  // content blocks — so passing the image+text array here needs no separate helper.
  const { text, stopReason } = await callClaude({ system, prompt: content, maxTokens: 2000, responseFormat: FAST_TRACK_EXTRACT_RESPONSE_FORMAT });
  if (stopReason === 'max_tokens') throw new Error('Fast Track extraction response was truncated (stop_reason=max_tokens).');
  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Fast Track extraction did not return a JSON object.');
  return parsed;
}

// --- Stage 2: Market validation -----------------------------------------------------
function buildMarketValidationQueries(searchVariants) {
  const variants = (searchVariants || []).slice(0, 7);
  const queries = variants.map((v) => v);
  // Fold explicit NZ/AU coverage onto the first couple of variants rather than the
  // full variants × 4-countries cross product (keeps this a low-cost, targeted pass) —
  // international coverage comes for free from the plain variant queries themselves.
  if (variants[0]) queries.push(`${variants[0]} New Zealand`);
  if (variants[1]) queries.push(`${variants[1]} Australia`);
  return queries.length ? queries : ['(no search variants extracted)'];
}

const MARKET_EVIDENCE_LIMIT = 15;
const MARKET_EVIDENCE_SNIPPET_CHARS = 400;

async function gatherMarketEvidence(searchVariants) {
  const queries = buildMarketValidationQueries(searchVariants);
  const settled = await Promise.allSettled(queries.map((q) => tavilySearch(q, 5)));
  const seen = new Set();
  const evidence = [];
  settled.forEach((result, i) => {
    if (result.status === 'rejected') { log(`Tavily search failed for query "${queries[i]}": ${result.reason?.message || result.reason}`); return; }
    for (const item of result.value) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      evidence.push(item);
    }
  });
  return evidence.sort((a, b) => b.score - a.score).slice(0, MARKET_EVIDENCE_LIMIT);
}

const FAST_TRACK_MARKET_SCHEMA_EXAMPLE = `{
  "comparables": [{"company": "string", "country": "string", "url": "string", "product": "string", "retailPrice": {"value": number|null, "currency": "string or null"}, "stone": "string or null", "design": "string or null", "availability": "string or null", "reviewCount": number|null, "socialEvidence": "string or null", "positioning": "string or null", "confidenceType": "FACT | Proxy / Signal | ESTIMATE | INFERENCE"}],
  "nzCompetitionLevel": "NONE_FOUND | LOW | MODERATE | HIGH",
  "internationalCompetitionLevel": "LOW | MODERATE | HIGH",
  "marketMaturity": "EMERGING | GROWING | MATURE | SATURATED_COMMODITY",
  "demandCharacter": "GENUINE | MIXED | AESTHETIC_SOCIAL_ONLY — GENUINE requires real transaction/repeat-stocking/review evidence, not just that the product looks attractive or is trending on social",
  "whitespaceNotes": "string",
  "confidenceType": "FACT | ESTIMATE | INFERENCE | UNKNOWN"
}`;
const FAST_TRACK_MARKET_RESPONSE_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      comparables: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            company: { type: 'string' }, country: { type: 'string' }, url: { type: 'string' }, product: { type: 'string' },
            retailPrice: { type: 'object', properties: { value: nullableNum(), currency: nullableStr() }, required: ['value', 'currency'], additionalProperties: false },
            stone: nullableStr(), design: nullableStr(), availability: nullableStr(), reviewCount: nullableNum(),
            socialEvidence: nullableStr(), positioning: nullableStr(), confidenceType: { type: 'string' },
          },
          required: ['company', 'country', 'url', 'product', 'retailPrice', 'stone', 'design', 'availability', 'reviewCount', 'socialEvidence', 'positioning', 'confidenceType'],
          additionalProperties: false,
        },
      },
      nzCompetitionLevel: { type: 'string' }, internationalCompetitionLevel: { type: 'string' }, marketMaturity: { type: 'string' },
      demandCharacter: { type: 'string' }, whitespaceNotes: { type: 'string' }, confidenceType: { type: 'string' },
    },
    required: ['comparables', 'nzCompetitionLevel', 'internationalCompetitionLevel', 'marketMaturity', 'demandCharacter', 'whitespaceNotes', 'confidenceType'],
    additionalProperties: false,
  },
};

export async function fastTrackMarketValidation({ category, searchVariants, competitorUrls }) {
  if (DRY_RUN) {
    log('DRY RUN — skipping real Fast Track market validation, using a fixture.');
    return { comparables: [], nzCompetitionLevel: 'NONE_FOUND', internationalCompetitionLevel: 'LOW', marketMaturity: 'EMERGING', demandCharacter: 'MIXED', whitespaceNotes: 'Dry-run fixture.', confidenceType: 'UNKNOWN' };
  }

  const [searchEvidence, competitorExtract] = await Promise.all([
    gatherMarketEvidence(searchVariants),
    tavilyExtract(competitorUrls || []).catch((err) => { log(`Fast Track: competitor URL extraction failed: ${err.message}`); return { extracted: [], failed: [] }; }),
  ]);
  log(`Fast Track market validation: gathered ${searchEvidence.length} search result(s), extracted ${competitorExtract.extracted.length} named competitor URL(s).`);

  const searchBlock = searchEvidence.map((e, i) => `[${i + 1}] ${e.title || '(no title)'}\nURL: ${e.url}\n${(e.content || '').slice(0, MARKET_EVIDENCE_SNIPPET_CHARS)}`).join('\n\n');
  const competitorBlock = competitorExtract.extracted.map((e, i) => `[Named competitor ${i + 1}] URL: ${e.url}\n${(e.content || '').slice(0, 1200)}`).join('\n\n');

  const system = 'You are the market-validation step of Prime Piece Pulse\'s Fast Track workflow. Extract REAL competitor/retailer facts strictly from the evidence given — never invent a company, price, review count, or country. Distinguish genuine transactional/repeat-stocking demand from evidence that is merely aesthetic or social-media attention: demandCharacter must be GENUINE only if real sales/review/repeat-stocking signals exist, not because the product looks attractive.';
  const prompt = `Category: "${category}".\n\nSearch evidence:\n${searchBlock || '(none found)'}\n\n${competitorBlock ? `Named competitor/supplier URLs the founder specifically flagged:\n${competitorBlock}\n\n` : ''}From ONLY the evidence above, identify UP TO 8 real comparables/retailers (fewer if fewer are well-supported), prioritising the strongest evidence across NZ, AU, US, UK and any other market — always include every named competitor URL above — then classify competition/market maturity/demand character, and note any genuine NZ whitespace — remembering that no competition found does not automatically mean an opportunity; it may mean no real demand either.\n\nRespond with ONLY a JSON object in exactly this shape:\n${FAST_TRACK_MARKET_SCHEMA_EXAMPLE}`;

  // Original 4500 truncated mid-JSON in production (2026-09-17) — 15 evidence items
  // (MARKET_EVIDENCE_LIMIT) with an uncapped comparables array of 12-field objects let
  // the model try to enumerate more comparables than the budget could hold, the same
  // failure class already fixed once for fastTrackSupplierSearch above. Same two-part
  // fix: cap comparables at 8 in the prompt, raise maxTokens for headroom.
  const { text, stopReason } = await callClaude({ system, prompt, maxTokens: 6500, responseFormat: FAST_TRACK_MARKET_RESPONSE_FORMAT });
  if (stopReason === 'max_tokens') throw new Error('Fast Track market validation response was truncated (stop_reason=max_tokens).');
  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Fast Track market validation did not return a JSON object.');
  return parsed;
}

// --- Stage 3: Design intelligence ---------------------------------------------------
const FAST_TRACK_DESIGN_SCHEMA_EXAMPLE = `{
  "clusters": [{"pattern": "string — e.g. handleless, tapered, sphere handle, geometric handle, traditional handle, coaster, saucer, single stone, contrasting stones", "frequencyNote": "string, grounded in the evidence"}],
  "directions": {
    "A": {"label": "safest commercial design", "form": "string", "dimensions": "string", "capacity": "string or null", "handle": "string", "coasterSaucer": "string or null", "stones": "string", "manufacturingDifficulty": "Low | Moderate | High", "likelyCustomer": "string", "advantages": ["string"], "risks": ["string"]},
    "B": {"label": "strongest luxury/editorial design", "form": "string", "dimensions": "string", "capacity": "string or null", "handle": "string", "coasterSaucer": "string or null", "stones": "string", "manufacturingDifficulty": "Low | Moderate | High", "likelyCustomer": "string", "advantages": ["string"], "risks": ["string"]},
    "C": {"label": "most differentiated design", "form": "string", "dimensions": "string", "capacity": "string or null", "handle": "string", "coasterSaucer": "string or null", "stones": "string", "manufacturingDifficulty": "Low | Moderate | High", "likelyCustomer": "string", "advantages": ["string"], "risks": ["string"]}
  },
  "recommendedDirection": "A | B | C",
  "recommendedWhy": "string"
}`;
function directionSchema() {
  return {
    type: 'object',
    properties: {
      label: { type: 'string' }, form: { type: 'string' }, dimensions: { type: 'string' }, capacity: nullableStr(),
      handle: { type: 'string' }, coasterSaucer: nullableStr(), stones: { type: 'string' }, manufacturingDifficulty: { type: 'string' },
      likelyCustomer: { type: 'string' }, advantages: { type: 'array', items: { type: 'string' } }, risks: { type: 'array', items: { type: 'string' } },
    },
    required: ['label', 'form', 'dimensions', 'capacity', 'handle', 'coasterSaucer', 'stones', 'manufacturingDifficulty', 'likelyCustomer', 'advantages', 'risks'],
    additionalProperties: false,
  };
}
const FAST_TRACK_DESIGN_RESPONSE_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      clusters: { type: 'array', items: { type: 'object', properties: { pattern: { type: 'string' }, frequencyNote: { type: 'string' } }, required: ['pattern', 'frequencyNote'], additionalProperties: false } },
      directions: { type: 'object', properties: { A: directionSchema(), B: directionSchema(), C: directionSchema() }, required: ['A', 'B', 'C'], additionalProperties: false },
      recommendedDirection: { type: 'string' }, recommendedWhy: { type: 'string' },
    },
    required: ['clusters', 'directions', 'recommendedDirection', 'recommendedWhy'],
    additionalProperties: false,
  },
};

export async function fastTrackDesignIntelligence({ category, extractedProduct, marketValidation }) {
  if (DRY_RUN) {
    log('DRY RUN — skipping real Fast Track design intelligence, using a fixture.');
    const fixtureDirection = { label: 'Dry-run fixture', form: 'Dry-run fixture', dimensions: 'n/a', capacity: null, handle: 'n/a', coasterSaucer: null, stones: 'n/a', manufacturingDifficulty: 'Moderate', likelyCustomer: 'n/a', advantages: [], risks: [] };
    return { clusters: [], directions: { A: fixtureDirection, B: fixtureDirection, C: fixtureDirection }, recommendedDirection: 'A', recommendedWhy: 'Dry-run fixture.' };
  }

  const comparablesBlock = (marketValidation.comparables || []).map((c, i) => `[${i + 1}] ${c.company} (${c.country}) — ${c.product}. Design: ${c.design || 'not stated'}. Stone: ${c.stone || 'not stated'}. URL: ${c.url}`).join('\n');

  const system = 'You are the design-intelligence step of Prime Piece Pulse\'s Fast Track workflow. Cluster real design patterns from the evidence given, then propose 3 ORIGINAL Prime Piece design directions inspired by the category, not a copy of any single named competitor. Never recommend directly copying a specific competitor\'s design.';
  const prompt = `Category: "${category}". Product extraction: ${JSON.stringify(extractedProduct)}.\n\nReal comparable designs found:\n${comparablesBlock || '(none found)'}\n\nCluster the design patterns you see, then produce exactly 3 original Prime Piece design directions (A = safest commercial, B = strongest luxury/editorial, C = most differentiated), and recommend which ONE to prototype first and why.\n\nRespond with ONLY a JSON object in exactly this shape:\n${FAST_TRACK_DESIGN_SCHEMA_EXAMPLE}`;

  const { text, stopReason } = await callClaude({ system, prompt, maxTokens: 4000, responseFormat: FAST_TRACK_DESIGN_RESPONSE_FORMAT });
  if (stopReason === 'max_tokens') throw new Error('Fast Track design intelligence response was truncated (stop_reason=max_tokens).');
  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Fast Track design intelligence did not return a JSON object.');
  return parsed;
}

// --- Stage 4: Supplier search --------------------------------------------------------
// Deliberately broader than the existing Market Radar supplier-discovery queries
// (buildSupplierSearchQueries above) — the spec explicitly names the platforms/regions
// to check, and explicitly warns not to assume a known/named supplier is automatically
// best, so that supplier is extracted and scored through the exact same pipeline as
// every other candidate, never given a free pass.
function buildFastTrackSupplierQueries(category) {
  return [
    `${category} manufacturer wholesale`,
    `${category} factory export Alibaba`,
    `${category} "Made-in-China" OR "Global Sources"`,
    `${category} Xiamen stone factory`,
    `${category} Shuitou stone manufacturer`,
    `natural stone tableware manufacturer cups mugs`,
    `stone carving factory small stone arts products`,
  ];
}

const FAST_TRACK_SUPPLIER_SCHEMA_EXAMPLE = `{"candidates": [{
  "name": "string — real company name", "country": "string", "website": "string or null", "sourcePlatform": "string",
  "isKnownSupplier": "boolean — true only for the founder's own named supplier URL, if one was given",
  "subScores": {"quality": number|null, "unitEconomics": number|null, "moq": number|null, "customisation": number|null, "leadTime": number|null, "shipping": number|null, "communication": number|null, "evidence": number|null},
  "factoryPriceUSD": number|null, "moq": number|null,
  "notes": "string — the real signals behind the sub-scores above",
  "sources": [{"url": "string", "title": "string"}],
  "supplierQuestions": ["string — a specific question to ask this supplier to fill a real gap in the evidence"]
}]}`;
const FAST_TRACK_SUPPLIER_RESPONSE_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' }, country: { type: 'string' }, website: nullableStr(), sourcePlatform: { type: 'string' }, isKnownSupplier: { type: 'boolean' },
            subScores: {
              type: 'object',
              properties: { quality: nullableNum(), unitEconomics: nullableNum(), moq: nullableNum(), customisation: nullableNum(), leadTime: nullableNum(), shipping: nullableNum(), communication: nullableNum(), evidence: nullableNum() },
              required: ['quality', 'unitEconomics', 'moq', 'customisation', 'leadTime', 'shipping', 'communication', 'evidence'], additionalProperties: false,
            },
            factoryPriceUSD: nullableNum(), moq: nullableNum(), notes: { type: 'string' },
            sources: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' }, title: { type: 'string' } }, required: ['url', 'title'], additionalProperties: false } },
            supplierQuestions: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'country', 'website', 'sourcePlatform', 'isKnownSupplier', 'subScores', 'factoryPriceUSD', 'moq', 'notes', 'sources', 'supplierQuestions'],
          additionalProperties: false,
        },
      },
    },
    required: ['candidates'],
    additionalProperties: false,
  },
};

export async function fastTrackSupplierSearch({ category, supplierUrl }) {
  if (DRY_RUN) {
    log('DRY RUN — skipping real Fast Track supplier search, using fixture candidates.');
    return [{ name: 'Dry Run Factory (fixture)', country: 'Unknown', website: null, sourcePlatform: 'Dry-run fixture', isKnownSupplier: false, subScores: { quality: 40, unitEconomics: 40, moq: 40, customisation: 40, leadTime: 40, shipping: 40, communication: 40, evidence: 40 }, factoryPriceUSD: 5, moq: 100, notes: 'Dry-run fixture.', sources: [], supplierQuestions: [] }];
  }

  const queries = buildFastTrackSupplierQueries(category);
  const [searchSettled, knownExtract] = await Promise.all([
    Promise.allSettled(queries.map((q) => tavilySearch(q, 5))),
    supplierUrl ? tavilyExtract([supplierUrl]).catch((err) => { log(`Fast Track: known supplier URL extraction failed: ${err.message}`); return { extracted: [], failed: [] }; }) : Promise.resolve({ extracted: [], failed: [] }),
  ]);
  const seen = new Set();
  const evidence = [];
  searchSettled.forEach((result, i) => {
    if (result.status === 'rejected') { log(`Tavily search failed for query "${queries[i]}": ${result.reason?.message || result.reason}`); return; }
    for (const item of result.value) { if (!item.url || seen.has(item.url)) continue; seen.add(item.url); evidence.push(item); }
  });
  const topEvidence = evidence.sort((a, b) => b.score - a.score).slice(0, SUPPLIER_EVIDENCE_LIMIT);
  log(`Fast Track supplier search: gathered ${topEvidence.length} search result(s)${supplierUrl ? `, extracted the named supplier URL (${knownExtract.extracted.length ? 'success' : 'failed'})` : ''}.`);

  const evidenceBlock = topEvidence.map((e, i) => `[${i + 1}] ${e.title || '(no title)'}\nURL: ${e.url}\n${(e.content || '').slice(0, SUPPLIER_EVIDENCE_SNIPPET_CHARS)}`).join('\n\n');
  const knownBlock = knownExtract.extracted[0]?.content ? `\n\nThe founder's own named/known supplier (${supplierUrl}) — evaluate this one through the EXACT same scoring as every other candidate below; do not assume it is best:\n${knownExtract.extracted[0].content.slice(0, 2000)}` : '';

  const system = 'You are the supplier-sourcing step of Prime Piece Pulse\'s Fast Track workflow. Extract REAL manufacturer facts strictly from the evidence given — never invent a price, MOQ, or capability. Score each of the 8 sub-scores (0-100) only where the evidence actually supports a judgment; leave a sub-score null rather than guessing. A founder-named/known supplier must be scored by the same standard as every other candidate, never given an automatic high score just for being named.';
  const prompt = `Category: "${category}".\n\nSearch evidence:\n${evidenceBlock || '(none found)'}${knownBlock}\n\nIdentify UP TO 4 real manufacturer candidates (fewer if fewer are well-supported by the evidence) prioritising companies already producing cups/mugs/espresso cups/stone tableware/stone arts/small carved natural-stone products. For each, score the 8 sub-scores from evidence only, and list at most 3 specific questions to ask to fill any real gap.\n\nRespond with ONLY a JSON object in exactly this shape:\n${FAST_TRACK_SUPPLIER_SCHEMA_EXAMPLE}`;

  // Original 4500 truncated mid-JSON in production (2026-09-16) — the schema's per-
  // candidate payload (8 sub-scores + notes + sources + supplierQuestions) is heavier
  // than findSuppliers' plainer shape above, and the prompt didn't cap candidate count.
  // Raised to 6500 and the prompt above now explicitly caps candidates at 4, mirroring
  // findSuppliers' "up to 3" pattern rather than leaving the count unbounded.
  const { text, stopReason } = await callClaude({ system, prompt, maxTokens: 6500, responseFormat: FAST_TRACK_SUPPLIER_RESPONSE_FORMAT });
  if (stopReason === 'max_tokens') throw new Error('Fast Track supplier search response was truncated (stop_reason=max_tokens).');
  const parsed = extractJson(text);
  const candidates = Array.isArray(parsed) ? parsed : parsed?.candidates;
  if (!Array.isArray(candidates)) throw new Error('Fast Track supplier search did not return a JSON array.');
  return candidates;
}

// --- Stage 6: Risk assessment --------------------------------------------------------
const FAST_TRACK_RISK_SCHEMA_EXAMPLE = `{"checks": [
  {"item": "Food-contact safety", "severity": "HIGH | MEDIUM | LOW", "status": "CONFIRMED | LIKELY | UNKNOWN", "note": "string", "evidenceType": "FACT | ESTIMATE | INFERENCE | UNKNOWN"}
]}`;
const FAST_TRACK_RISK_ITEMS = ['Food-contact safety', 'Sealing', 'Heat resistance', 'Thermal shock', 'Staining', 'Acids', 'Cracking', 'Dishwasher suitability', 'Weight', 'Shipping breakage', 'Customer expectations', 'IP / design-copy risk'];
const FAST_TRACK_RISK_RESPONSE_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      checks: {
        type: 'array',
        items: {
          type: 'object',
          properties: { item: { type: 'string' }, severity: { type: 'string' }, status: { type: 'string' }, note: { type: 'string' }, evidenceType: { type: 'string' } },
          required: ['item', 'severity', 'status', 'note', 'evidenceType'], additionalProperties: false,
        },
      },
    },
    required: ['checks'], additionalProperties: false,
  },
};

export async function fastTrackRiskAssessment({ extractedProduct, designIntelligence }) {
  if (DRY_RUN) {
    log('DRY RUN — skipping real Fast Track risk assessment, using a fixture.');
    return { checks: FAST_TRACK_RISK_ITEMS.map((item) => ({ item, severity: 'LOW', status: 'UNKNOWN', note: 'Dry-run fixture.', evidenceType: 'UNKNOWN' })) };
  }

  // No web search here — this is a materials/food-safety/logistics judgment from the
  // product's own extracted facts plus general natural-stone-material knowledge, not
  // something a fresh web search resolves better. Every item still gets an honest
  // evidenceType — most will be INFERENCE or ESTIMATE from material properties, not FACT.
  const system = 'You are the risk-assessment step of Prime Piece Pulse\'s Fast Track workflow, evaluating a natural-stone product for real manufacturing/logistics/customer risks. Base every judgment on the product facts given plus genuine material-science/logistics knowledge — never claim FACT unless the extracted evidence itself stated it; use INFERENCE for a reasoned judgment from material properties, ESTIMATE for a rough quantitative guess, UNKNOWN when you genuinely cannot judge it.';
  const prompt = `Product: ${JSON.stringify(extractedProduct)}.\nRecommended design direction: ${JSON.stringify(designIntelligence?.directions?.[designIntelligence?.recommendedDirection] || {})}.\n\nAssess EXACTLY these ${FAST_TRACK_RISK_ITEMS.length} risk items: ${FAST_TRACK_RISK_ITEMS.join(', ')}.\n\nRespond with ONLY a JSON object in exactly this shape:\n${FAST_TRACK_RISK_SCHEMA_EXAMPLE}`;

  const { text, stopReason } = await callClaude({ system, prompt, maxTokens: 3000, responseFormat: FAST_TRACK_RISK_RESPONSE_FORMAT });
  if (stopReason === 'max_tokens') throw new Error('Fast Track risk assessment response was truncated (stop_reason=max_tokens).');
  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Fast Track risk assessment did not return a JSON object.');
  return parsed;
}

// --- Orchestrator ---------------------------------------------------------------------
// Every stage is wrapped individually — one stage failing (e.g. a dead product URL, a
// truncated response) never discards the stages that DID succeed. The decision card
// (Stage 7) is deterministic code over whatever stages actually completed; a missing
// stage shows up as an unmet pillar, never a fabricated pass.
async function runOneFastTrackAnalysis(request) {
  const input = request.input;
  const stages = { extraction: null, marketValidation: null, designIntelligence: null, supplierSearch: null, economics: null, risk: null };
  const errors = [];

  try {
    stages.extraction = await fastTrackExtractProduct({ productUrl: input.productUrl, notes: input.notes, imageBase64: input.imageBase64 });
    log(`Fast Track [${request.id}]: extraction complete — category "${stages.extraction.category}".`);
  } catch (err) {
    errors.push(`Extraction: ${err.message}`);
    log(`Fast Track [${request.id}] extraction FAILED: ${err.message}`);
  }

  const category = stages.extraction?.category || input.notes || input.productUrl;
  try {
    stages.marketValidation = await fastTrackMarketValidation({ category, searchVariants: stages.extraction?.searchVariants || [], competitorUrls: input.competitorUrls });
  } catch (err) {
    errors.push(`Market validation: ${err.message}`);
    log(`Fast Track [${request.id}] market validation FAILED: ${err.message}`);
  }

  try {
    stages.designIntelligence = await fastTrackDesignIntelligence({ category, extractedProduct: stages.extraction, marketValidation: stages.marketValidation || { comparables: [] } });
  } catch (err) {
    errors.push(`Design intelligence: ${err.message}`);
    log(`Fast Track [${request.id}] design intelligence FAILED: ${err.message}`);
  }

  try {
    stages.supplierSearch = await fastTrackSupplierSearch({ category, supplierUrl: input.supplierUrl });
  } catch (err) {
    errors.push(`Supplier search: ${err.message}`);
    log(`Fast Track [${request.id}] supplier search FAILED: ${err.message}`);
  }

  const rankedSuppliers = stages.supplierSearch ? rankFastTrackSuppliers(stages.supplierSearch) : [];
  const bestSupplier = rankedSuppliers[0] || null;
  // targetRetailNZD comes from real evidence only: the founder's own extracted retail
  // price if the product page stated one, else the median of real comparables found —
  // never invented. fxRateUSDtoNZD is a documented planning assumption (not fetched
  // live), clearly labelled as such in the decision card, not presented as fact.
  const comparablePrices = (stages.marketValidation?.comparables || []).map((c) => c.retailPrice?.value).filter((v) => typeof v === 'number').sort((a, b) => a - b);
  const targetRetailNZD = stages.extraction?.retailPrice?.value ?? (comparablePrices.length ? comparablePrices[Math.floor(comparablePrices.length / 2)] : null);
  stages.economics = {
    ...computeFastTrackEconomics({
      factoryPriceUSD: bestSupplier?.factoryPriceUSD ?? null,
      packagingPerUnitUSD: null,
      freightPerUnitUSD: null,
      dutyRatePct: null,
      localFreightPerUnitNZD: null,
      fxRateUSDtoNZD: 1.6, // documented planning assumption, not a live rate — see report
      targetRetailNZD,
      moq: bestSupplier?.moq ?? null,
    }),
    targetRetailNZD, // echoed back for display — the Fast Track page shows this alongside the scenarios
    fxRateAssumptionNote: 'USD→NZD FX rate (1.6) is a documented planning assumption, not a live rate.',
  };

  try {
    stages.risk = await fastTrackRiskAssessment({ extractedProduct: stages.extraction || {}, designIntelligence: stages.designIntelligence });
  } catch (err) {
    errors.push(`Risk assessment: ${err.message}`);
    log(`Fast Track [${request.id}] risk assessment FAILED: ${err.message}`);
  }

  const decision = computeFastTrackDecision({
    marketValidation: stages.marketValidation, designIntelligence: stages.designIntelligence,
    supplierRanking: rankedSuppliers, economics: stages.economics, risk: stages.risk,
  });

  return { stages: { ...stages, supplierSearch: rankedSuppliers }, decision, errors };
}

async function runFastTrackMode() {
  // Optional ad-hoc seed for a manual GitHub Actions run — same pattern as
  // RADAR_CANDIDATE for mode=candidate — so a request can be created and processed
  // in one run without needing the Fast Track page's own form submission first
  // (useful for proving the pipeline end-to-end, or a one-off analysis by hand).
  if (process.env.FAST_TRACK_SEED_PRODUCT_URL) {
    const seeded = await createFastTrackRequest({
      productUrl: process.env.FAST_TRACK_SEED_PRODUCT_URL,
      supplierUrl: process.env.FAST_TRACK_SEED_SUPPLIER_URL || null,
      competitorUrls: (process.env.FAST_TRACK_SEED_COMPETITOR_URLS || '').split(',').map((s) => s.trim()).filter(Boolean),
      notes: process.env.FAST_TRACK_SEED_NOTES || null,
    });
    log(`Seeded ad-hoc Fast Track request ${seeded.id} from workflow inputs.`);
  }

  const analyses = await getFastTrackAnalyses();
  const pending = analyses.filter((a) => a.status === 'PENDING');
  log(`Fast Track: ${pending.length} pending request(s) to process.`);
  if (!pending.length) { log('Nothing to process.'); return; }

  let succeeded = 0, failed = 0;
  for (const request of pending) {
    const idx = analyses.findIndex((a) => a.id === request.id);
    try {
      log(`Fast Track [${request.id}]: processing "${request.input.productUrl}"...`);
      const { stages, decision, errors } = await runOneFastTrackAnalysis(request);
      analyses[idx] = { ...request, status: 'COMPLETE', completedAt: new Date().toISOString(), stages, decision, error: errors.length ? errors.join(' | ') : null };
      log(`Fast Track [${request.id}]: COMPLETE — decision ${decision.decision} (score ${decision.opportunityScore}/100, confidence ${decision.confidence}).`);
      succeeded++;
    } catch (err) {
      analyses[idx] = { ...request, status: 'FAILED', completedAt: new Date().toISOString(), error: err.message };
      log(`Fast Track [${request.id}] FAILED entirely: ${err.message}`);
      failed++;
    }
    await saveFastTrackAnalyses(analyses); // save after each — one bad request never loses progress on the others
  }
  log(`Fast Track run complete. ${succeeded} succeeded, ${failed} failed.`);
}

// --- Quote-capture mode: manual trigger only ---------------------------------------
// Parses every supplier reply James has pasted in since the last run, then — for each
// affected opportunity — recalculates real commercial ranking and landed economics and
// creates one SAMPLE_ORDER approval. Never orders anything; the approval only records
// a recommendation for James to accept or reject.
async function runQuoteCaptureMode() {
  const suppliers = await getSuppliers();
  const pending = suppliers.filter((s) => s.quoteParseStatus === 'PENDING');
  if (!pending.length) {
    log('No pending supplier quote replies to parse.');
    return;
  }

  const affectedOpportunityIds = new Set();
  for (const supplier of pending) {
    try {
      const parsed = await parseQuoteReply({ rawText: supplier.quoteRawText, supplierName: supplier.name });
      await applyParsedQuote(supplier.id, parsed);
      affectedOpportunityIds.add(supplier.opportunityId);
      log(`Parsed quote reply from "${supplier.name}".`);
    } catch (err) {
      log(`FAILED to parse quote reply from "${supplier.name}": ${err.message}`);
    }
  }

  const radar = await getRadarOpportunities();
  const existingApprovals = await getApprovals();

  for (const opportunityId of affectedOpportunityIds) {
    const opportunity = radar.find((o) => o.id === opportunityId);
    if (!opportunity) { log(`Opportunity ${opportunityId} not found — skipping recalculation.`); continue; }

    const allSuppliers = await getSuppliers();
    const forThisOpportunity = allSuppliers.filter((s) => s.opportunityId === opportunityId);
    const reranked = rankSuppliers(forThisOpportunity);
    await saveSupplierBatch(opportunityId, reranked);

    const best = reranked[0];
    if (!best) continue;

    const alreadyPending = existingApprovals.some((a) => a.type === 'SAMPLE_ORDER' && a.opportunityId === opportunityId && a.status === 'PENDING');
    if (alreadyPending) {
      log(`A SAMPLE_ORDER approval is already pending for "${opportunity.product}" — recalculated rankings were saved, but not creating a duplicate approval.`);
      continue;
    }

    const econ = estimateLandedEconomics(best, opportunity, reranked);
    await createApprovalRequest({
      type: 'SAMPLE_ORDER',
      opportunityId,
      supplierId: best.id,
      summary: `Real quote data now exists for "${opportunity.product}". Recommended supplier: ${best.name} (${best.country || 'country unknown'}), supplier score ${best.supplierScore}/100.`,
      recommendation: `Approve a sample order from ${best.name}.`,
      rationale: econ.whyBeatsAlternatives,
      estimatedCost: econ.sampleLandedCost,
      details: econ,
    });
    log(`Approval request created: SAMPLE_ORDER for "${best.name}" on "${opportunity.product}".`);
  }
}

// --- Main ---------------------------------------------------------------------------

// Zero-cost read-only inspection of the real stored Market Radar data — no Anthropic
// call, no web search, no writes. Exists so a human (or Claude, working from the
// GitHub Actions log) can review the actual production radar before deciding what to
// research next, without spending anything to do it. One JSON line per opportunity —
// log-line-per-item rather than one pretty-printed blob, so it stays parseable however
// many items the radar has grown to.
async function runListMode() {
  const [radar, suppliers, approvals, products, fastTrackAnalyses] = await Promise.all([getRadarOpportunities(), getSuppliers(), getApprovals(), getProducts(), getFastTrackAnalyses()]);
  log(`${radar.length} opportunity(ies) in Market Radar:`);
  for (const o of radar) {
    log(JSON.stringify(o));
  }
  log(`${suppliers.length} supplier(s) on record:`);
  for (const s of suppliers) {
    log(JSON.stringify(s));
  }
  log(`${approvals.length} approval request(s) on record:`);
  for (const a of approvals) {
    log(JSON.stringify(a));
  }
  // Included so the Commercial Funnel's Portfolio Sanity Gate (scoring.mjs) can be
  // checked against what Prime Piece actually already sells, without a second
  // zero-cost run — Product Lab is the source of truth for "already in the portfolio."
  log(`${products.length} Product Lab item(s) on record:`);
  for (const p of products) {
    log(JSON.stringify(p));
  }
  log(`${fastTrackAnalyses.length} Fast Track analysis(es) on record:`);
  for (const a of fastTrackAnalyses) {
    // imageBase64 can be several hundred KB — redacted here to keep GH Actions log
    // lines a sane size (a multi-MB single log line risks the same chunking/
    // corruption issue seen earlier with long lines, and nothing in this pass needs
    // the actual image bytes).
    const redacted = a.input?.imageBase64 ? { ...a, input: { ...a.input, imageBase64: `[image data, ${a.input.imageBase64.length} chars, redacted]` } } : a;
    log(JSON.stringify(redacted));
  }
}

async function main() {
  log(`Mode: ${MODE}${DRY_RUN ? ' (DRY RUN — no real API calls, no cost)' : ''}`);

  if (MODE === 'list') {
    await runListMode();
    return;
  }

  if (MODE === 'supplier') {
    await runSupplierMode();
    return;
  }

  if (MODE === 'quote-capture') {
    await runQuoteCaptureMode();
    return;
  }

  if (MODE === 'demand-evidence') {
    await runDemandEvidenceMode();
    return;
  }

  if (MODE === 'fast-track') {
    await runFastTrackMode();
    return;
  }

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
