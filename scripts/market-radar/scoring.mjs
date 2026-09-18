// Deterministic Opportunity Score + Confidence Score for a Market Radar entry.
//
// The LLM enrichment step (see run.mjs) produces 10 named sub-scores (0-100 each,
// with a one-line justification) plus source/evidence-type metadata. Everything
// past that point — the weighted sum, the confidence calculation — is plain
// arithmetic, not another model call, so a score is exactly reproducible and
// auditable rather than something an LLM "computes" and might round differently
// on every run.
//
// Weights match the brief exactly (sums to 1.00):
export const SCORE_WEIGHTS = {
  demandEvidence: 0.20,
  contributionProfit: 0.15,
  aovCac: 0.10,
  differentiation: 0.10,
  adContent: 0.10,
  auScale: 0.10,
  designerTrade: 0.10,
  sourcing: 0.05,
  operationalRisk: 0.05,
  crossSell: 0.05,
};

const DIMENSION_KEYS = Object.keys(SCORE_WEIGHTS);

// scoreBreakdown: { demandEvidence: {score: 0-100, why: '...'}, ... } — one entry per
// dimension above. Returns { opportunityScore, missingDimensions }.
export function computeOpportunityScore(scoreBreakdown) {
  let weightedSum = 0;
  let weightUsed = 0;
  const missingDimensions = [];

  for (const key of DIMENSION_KEYS) {
    const entry = scoreBreakdown?.[key];
    const value = typeof entry?.score === 'number' ? entry.score : null;
    if (value === null) {
      missingDimensions.push(key);
      continue;
    }
    const clamped = Math.max(0, Math.min(100, value));
    weightedSum += clamped * SCORE_WEIGHTS[key];
    weightUsed += SCORE_WEIGHTS[key];
  }

  // If some dimensions are missing (the enrichment pass couldn't judge them),
  // scale by the weight actually available rather than silently treating a
  // missing dimension as zero — same "never present partial as complete"
  // principle as Product Lab's scoring, just re-normalised instead of
  // reported as a fraction, since this score is meant to be a single
  // comparable 0-100 number across the whole radar.
  const opportunityScore = weightUsed > 0 ? Math.round(weightedSum / weightUsed) : null;

  return { opportunityScore, missingDimensions, weightUsed: Math.round(weightUsed * 100) };
}

// Confidence is independent of the opportunity score on purpose — a high score
// built on thin evidence must never look the same as a high score built on
// solid evidence. Driven by two things: how many independent sources were
// actually found, and what fraction of tagged claims are FACT/PROXY (observed
// signals) vs ESTIMATE/FOUNDER ASSUMPTION (reasoned guesses).
export function computeConfidenceScore({ sources = [], evidenceTags = [] }) {
  const independentSourceCount = new Set(
    sources.map((s) => {
      try {
        return new URL(s.url).hostname.replace(/^www\./, '');
      } catch {
        return s.url || s.title || Math.random();
      }
    })
  ).size;

  const sourceComponent = Math.min(independentSourceCount / 5, 1) * 100; // 5+ independent sources = full marks

  let evidenceComponent = 50; // neutral default if nothing tagged yet
  if (evidenceTags.length > 0) {
    const strong = evidenceTags.filter((t) => t === 'Fact' || t === 'Proxy / Signal').length;
    evidenceComponent = (strong / evidenceTags.length) * 100;
  }

  const confidenceScore = Math.round(sourceComponent * 0.5 + evidenceComponent * 0.5);
  return { confidenceScore, independentSourceCount };
}

// --- Supplier ranking (Phase 2 — Supplier + Approval Engine) -----------------------
// Deliberately separate from SCORE_WEIGHTS/computeOpportunityScore above: Prime Piece
// explicitly asked not to reweight or touch the existing opportunity-scoring model
// until real supplier/economics data exists to inform that decision. This is a new,
// independent, comparative ranking — it scores suppliers relative to each other
// within one opportunity's research batch, not against any absolute external
// benchmark (no market-wide price index exists to compare against).
export const SUPPLIER_SCORE_WEIGHTS = {
  price: 0.35,
  credibility: 0.30,
  moq: 0.20,
  leadTime: 0.15,
};

// Picks the pricing tier closest to a representative mid-scale reorder quantity (50
// units) so suppliers quoting different tier structures (10/25/50/100) are still
// comparable on roughly the same basis, rather than comparing a 10-unit price against
// a 100-unit price.
export function representativeUnitPrice(supplier) {
  const tiers = Array.isArray(supplier.pricingTiers)
    ? supplier.pricingTiers.filter((t) => typeof t?.unitPrice === 'number' && t.unitPrice > 0)
    : [];
  if (!tiers.length) return null;
  const target = 50;
  const closest = tiers.slice().sort((a, b) => Math.abs((a.qty || 0) - target) - Math.abs((b.qty || 0) - target));
  return closest[0].unitPrice;
}

// Normalizes one metric to 0-100 relative to the other suppliers in the same batch.
// A supplier missing this metric scores 0 for it — unknown must never look the same
// as "best," the same principle used everywhere else in this scoring model.
function normalizeWithinBatch(values, lowerIsBetter) {
  const present = values.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (!present.length) return values.map(() => 0);
  const min = Math.min(...present);
  const max = Math.max(...present);
  return values.map((v) => {
    if (typeof v !== 'number' || Number.isNaN(v)) return 0;
    if (max === min) return 100;
    const frac = (v - min) / (max - min);
    return Math.round((lowerIsBetter ? 1 - frac : frac) * 100);
  });
}

// Ranks a batch of suppliers (found for one opportunity) best-first. Returns each
// supplier with a `supplierScore` (0-100) and a `scoreBreakdown` of the 4 components,
// so the Suppliers page can show its reasoning, not just a bare number.
export function rankSuppliers(suppliers) {
  if (!Array.isArray(suppliers) || !suppliers.length) return [];

  const prices = suppliers.map(representativeUnitPrice);
  const moqs = suppliers.map((s) => (typeof s.moq === 'number' ? s.moq : null));
  const leadTimes = suppliers.map((s) => (typeof s.leadTimeDays === 'number' ? s.leadTimeDays : null));
  const credibilities = suppliers.map((s) => (typeof s.credibilityScore === 'number' ? Math.max(0, Math.min(100, s.credibilityScore)) : null));

  const priceScores = normalizeWithinBatch(prices, true);
  const moqScores = normalizeWithinBatch(moqs, true);
  const leadTimeScores = normalizeWithinBatch(leadTimes, true);
  const credibilityScores = credibilities.map((c) => (c === null ? 0 : c));

  return suppliers
    .map((s, i) => ({
      ...s,
      supplierScore: Math.round(
        priceScores[i] * SUPPLIER_SCORE_WEIGHTS.price +
        credibilityScores[i] * SUPPLIER_SCORE_WEIGHTS.credibility +
        moqScores[i] * SUPPLIER_SCORE_WEIGHTS.moq +
        leadTimeScores[i] * SUPPLIER_SCORE_WEIGHTS.leadTime
      ),
      scoreBreakdown: { price: priceScores[i], credibility: credibilityScores[i], moq: moqScores[i], leadTime: leadTimeScores[i] },
    }))
    .sort((a, b) => b.supplierScore - a.supplierScore);
}

// --- Outreach batch selection (Phase 3 — Supplier Outreach + Quote Capture) --------
// Deliberately separate from rankSuppliers() above: that function ranks by real
// commercial terms (price/MOQ/lead-time) and is meaningless before any quote exists —
// every supplier scores ~0 on those dimensions until contacted. Choosing WHO to
// contact in the first place needs a different question entirely: does this supplier
// actually look capable of making and exporting this specific product, based on the
// evidence already gathered? That's credibility + explicit product/category match +
// export capability + material capability — plain keyword evidence over the supplier's
// own researched text, not another Claude call.
const MATERIAL_KEYWORDS = ['marble', 'travertine', 'onyx', 'granite', 'limestone', 'stone', 'natural stone'];
const EXPORT_KEYWORDS = ['export', 'exporter', 'international', 'worldwide', 'overseas', 'supplying', 'ship to', 'shipped to', 'importer'];
const GENERIC_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'stone', 'marble', 'travertine']);
// This system's own evidence-honesty prompts make the model say things like "no
// dedicated bowl product page was found" or "no dedicated stone-bowl product listing
// located" — a naive substring match on "bowl" would count that as a positive match on
// the exact sentence documenting its absence. Matching must be sentence-scoped and
// negation-aware, or the honesty this system is built on becomes a false positive.
const NEGATION_MARKERS = ['no ', 'not ', 'none', 'n/a', 'without', 'unable', 'could not', "didn't", 'did not', 'nothing'];

function sentencesOf(supplier) {
  const text = [supplier.name, supplier.sourcePlatform, ...(supplier.credibilitySignals || [])].join('. ').toLowerCase();
  return text.split(/[.!?]/);
}

// True only if `needle` appears in some sentence that isn't itself negating it.
function positiveMatch(sentences, needle) {
  return sentences.some((s) => s.includes(needle) && !NEGATION_MARKERS.some((neg) => s.includes(neg)));
}

function anyPositiveMatch(sentences, needles) {
  return needles.some((n) => positiveMatch(sentences, n));
}

// Pulls distinctive words out of the target product/category to check for an explicit
// match in the supplier's own researched text (e.g. "Decorative Bowl Manufacturer"
// matching a "Stone Decorative Bowl" opportunity) — generic material words are excluded
// so every stone supplier doesn't trivially "match" on the word "marble" alone.
function productKeywords(target) {
  const raw = `${target.product || ''} ${target.variant || ''} ${target.category || ''}`.toLowerCase();
  return raw.split(/[^a-z]+/).filter((w) => w.length > 3 && !GENERIC_WORDS.has(w));
}

// Returns { outreachFitScore (0-100), breakdown: {credibility, productMatch, export, material} }.
// Equal-weighted across the 4 factors on purpose — the brief was explicit that
// commercial-term scores (which don't exist yet) must not be what decides who gets
// contacted, and no single one of these 4 factors should dominate the others either.
export function computeOutreachFitScore(supplier, target) {
  const sentences = sentencesOf(supplier);
  const keywords = productKeywords(target);

  const credibility = typeof supplier.credibilityScore === 'number' ? Math.max(0, Math.min(100, supplier.credibilityScore)) : 0;
  const productMatch = keywords.length && anyPositiveMatch(sentences, keywords) ? 100 : 0;
  const exportCapability = anyPositiveMatch(sentences, EXPORT_KEYWORDS) ? 100 : 0;
  const materialCapability = anyPositiveMatch(sentences, MATERIAL_KEYWORDS) ? 100 : 0;

  const outreachFitScore = Math.round((credibility + productMatch + exportCapability + materialCapability) / 4);
  return { outreachFitScore, breakdown: { credibility, productMatch, exportCapability, materialCapability } };
}

// Selects the top `count` suppliers worth sending a real quote request to, from a
// researched batch, by outreachFitScore — not by rankSuppliers()'s commercial-terms
// score, which is uninformative before any quote exists. Returns suppliers with their
// fit score/breakdown attached, best first.
export function selectOutreachBatch(suppliers, target, count = 3) {
  return suppliers
    .map((s) => ({ ...s, ...computeOutreachFitScore(s, target) }))
    .sort((a, b) => b.outreachFitScore - a.outreachFitScore)
    .slice(0, count);
}

// Human-readable trend direction from the append-only history log — compares
// the last two scans rather than storing a separate field that could drift
// out of sync with history.
export function trendDirectionFromHistory(history = []) {
  if (!history.length) return 'New opportunity';
  if (history.length === 1) return 'New opportunity';
  const [prev, current] = history.slice(-2);
  if (prev.score === null || current.score === null) return 'Evidence changed';
  const delta = current.score - prev.score;
  if (Math.abs(delta) < 3) return 'Stable';
  return delta > 0 ? 'Rising' : 'Declining';
}

// --- Commercial Funnel: Investment Readiness (plain code, zero new LLM calls) ------
// RADAR -> FIT -> DEMAND PROOF -> ECONOMICS READINESS -> SAMPLE GATE -> TOP 3/WATCH/KILL
//
// opportunityScore/confidenceScore above are an ATTENTION-ranking only — "investigate
// this before something scoring lower," never "this is more likely to make money."
// Everything below turns that attention ranking into an investment-readiness read,
// entirely from fields enrichCandidate/findSuppliers already produce. Nothing here
// changes SCORE_WEIGHTS, adds a new evidence field, or makes a new Claude/Tavily call.
//
// Hard rule throughout: a criterion with no supporting evidence is reported UNKNOWN /
// NOT YET PROVEN. It is never silently treated as a pass, a fail, or a zero — the same
// principle rankSuppliers/computeOutreachFitScore already apply to supplier evidence,
// extended here to the product-opportunity funnel.
export const UNKNOWN = 'UNKNOWN';

function hasBeenResearched(o) {
  return Boolean(o.scoreBreakdown || (o.sources && o.sources.length) || o.demandSignal);
}

// Reused across Fit/Demand/NZ-gap: a plain keyword heuristic over evidence text
// actually gathered (disqualifiers/operatingRisks/marketGap), same "evidence honesty"
// spirit as computeOutreachFitScore's negation-aware matching above — not a model
// judgment call.
const SOURCING_PLATFORM_WORDS = ['alibaba', 'made-in-china', 'global sources', 'manufacturer', 'wholesale supplier', 'trade directory', 'factory direct'];
const COMMODITY_WORDS = ['commodity', 'saturated', 'big-box', 'big box', 'generic', 'race-to-the-bottom', 'race to the bottom'];
const INSTALL_WORDS = ['installation', 'professional install', 'plumber', 'tradesperson required', 'built-in', 'permanent fixture'];

// Portfolio + Logistics Sanity Gate word lists (see computeFitGate's widened
// disqualifiers and computePortfolioCheck below). Same "plain keyword heuristic over
// evidence actually gathered" philosophy as the lists above — a real production run
// surfaced marketGap text explicitly saying "not real stone" or "overlaps Prime
// Piece's existing X line" for several Fit-passing items, so these are read as hard
// signals rather than left as unknowns once that specific evidence exists.
const NOT_GENUINE_STONE_WORDS = ['not real stone', 'marble-look', 'stone-look', 'faux marble', 'faux stone', 'printed canvas', 'graphic panel', 'mdf', 'engineered look'];
const PHYSICAL_RISK_WORDS = ['pallet', 'built to measure', 'trade/tile product', 'not a retail ecommerce sku', 'wall-anchoring', 'oversized', 'freight class', 'requires professional installation'];
// Evidence-driven — Enrich's own marketGap sometimes states outright that an item
// overlaps something Prime Piece already has (e.g. "Overlaps heavily with Prime
// Piece's existing 9-variant plinth line," "a repositioning play, not a new
// product"). Multi-word phrases only, to avoid a bare "existing" false-positiving on
// unrelated commentary.
const EXISTING_PORTFOLIO_SIGNAL_WORDS = ['overlaps heavily with', "prime piece's existing", 'overlaps existing', 'not a new product', 'repositioning play', 'already sell', 'already part of the range'];
// Founder-declared fact, not yet reflected in any Radar/Product-Lab evidence text —
// Prime Piece's Product Lab currently tracks research candidates, not live SKUs, so
// this is the one place a real-world "we already sell this" fact has to be recorded
// by hand rather than derived. Keep this list to exactly what's been declared —
// never infer additions to it.
const DECLARED_EXISTING_CATEGORIES = ['cheese board', 'cheese/serving board', 'serving board', 'chopping board', 'serving platter'];

function textBlob(o) {
  return [...(o.disqualifiers || []), ...(o.operatingRisks || []), o.marketGap?.description || ''].join(' . ').toLowerCase();
}
// Widened corpus for the Portfolio + Logistics Sanity Gate checks only — also folds
// in product/variant/category text, since some of the strongest signals (a "Marble-
// Look" name, a "Built-in ..." name) are only visible in the product name itself, not
// in the separately-gathered evidence fields.
function extendedTextBlob(o) {
  return `${textBlob(o)} . ${o.product || ''} ${o.variant || ''} ${o.category || ''}`.toLowerCase();
}
function containsAny(text, words) {
  return words.some((w) => text.includes(w));
}

// --- STAGE 2: PRIME PIECE FIT -------------------------------------------------------
// Hard disqualifiers only ever come from evidence already gathered (productType,
// the existing disqualifiers[] list, freight+damage both High together, or a price
// band that plainly does not overlap Core AOV). Everything else the spec asks about —
// brand fit, installation complexity, variant/collection potential, and whether
// genuine stone is truly integral to the value proposition — has no supporting field
// in current evidence, so it is reported as an explicit unknown rather than assumed.
export function computeFitGate(o) {
  if (!hasBeenResearched(o)) {
    return { result: UNKNOWN, reasons: ['Not yet researched — no Enrich evidence recorded.'], unknowns: ['All Fit criteria — nothing researched yet.'] };
  }

  const reasons = [];
  const unknowns = [];
  let fail = false;

  if (o.productType && o.productType !== 'IMPORTED') {
    fail = true;
    reasons.push(`productType=${o.productType} — not a repeatable/importable SKU.`);
  }
  const disq = (o.disqualifiers || []).filter(Boolean);
  if (disq.length) {
    fail = true;
    reasons.push(`Existing disqualifier(s): ${disq.join('; ')}`);
  }

  // Widened per the Portfolio + Logistics Sanity Gate: a product should not pass
  // merely because freight and damage risk are not BOTH High — packaging difficulty
  // now counts too, and any ONE of the three being High is disqualifying. A real
  // production run showed a genuinely High damage-risk item (heavy, brittle stone
  // slabs) sailing through the old both-High gate because its freight rating alone
  // was only "Moderate."
  const freight = o.economicsPotential?.freightDifficulty;
  const damage = o.economicsPotential?.damageRisk;
  const packaging = o.economicsPotential?.packagingDifficulty;
  if (freight === 'High' || damage === 'High' || packaging === 'High') {
    fail = true;
    reasons.push(`Physical scalability risk — freight ${freight || 'unassessed'} / damage ${damage || 'unassessed'} / packaging ${packaging || 'unassessed'} includes at least one High rating.`);
  } else {
    if (!freight) unknowns.push('Freight difficulty not assessed.');
    if (!damage) unknowns.push('Damage risk not assessed.');
    if (!packaging) unknowns.push('Packaging difficulty not assessed.');
  }

  // Physical/logistics red flags visible only in free text (pallet freight, built-to-
  // measure trade items, wall-mounted installs) — a numeric freight/damage/packaging
  // rating alone missed these (e.g. a built-in shower bench rated only "Moderate" on
  // all three, but its own marketGap says outright it "functions as a trade/tile
  // product ... not a retail ecommerce SKU").
  if (containsAny(extendedTextBlob(o), PHYSICAL_RISK_WORDS) || containsAny(extendedTextBlob(o), INSTALL_WORDS)) {
    fail = true;
    reasons.push('Evidence indicates this is difficult to hold/reorder as normal parcel-shipped ecommerce inventory (pallet/crate freight, built-to-measure/trade fulfilment, or a wall-mounted/professional install requirement).');
  }

  // Genuine natural stone is Prime Piece's entire premise — an item whose own
  // evidence says the "stone" look is actually printed canvas, MDF, or a "marble-
  // look" veneer cannot qualify for imported-product ranking at all, regardless of
  // how good its demand evidence looks.
  if (containsAny(extendedTextBlob(o), NOT_GENUINE_STONE_WORDS)) {
    fail = true;
    reasons.push('Evidence indicates this is not genuine natural stone (a "look"/faux/printed material) — stone is Prime Piece\'s core premise, not optional.');
  }

  // Two lanes, not one: Prime Piece's ENTRY ($99-299, acquisition/gifting) and CORE
  // ($299-1,200, repeatable/importable scaling layer) are both legitimate homes for an
  // investment-ready imported product — a single Core-only gate wrongly killed ENTRY-
  // priced items (e.g. a $135 candidate) that never had a real chance to overlap a
  // $250+ floor. Overlapping either lane is sufficient; HALO ($1,500+, NZ-made one-of-
  // one, not importable) is out of scope for this gate entirely.
  const low = o.priceBand?.low, high = o.priceBand?.high;
  if (typeof low === 'number' && typeof high === 'number') {
    const overlapsEntry = high >= 99 && low <= 299;
    const overlapsCore = high >= 299 && low <= 1200;
    if (!overlapsEntry && !overlapsCore) {
      fail = true;
      reasons.push(`Price band ${o.priceBand.currency || ''}${low}-${high} does not overlap either Prime Piece lane (ENTRY $99-299 or CORE $299-1,200).`);
    } else {
      reasons.push(`Price band ${o.priceBand.currency || ''}${low}-${high} overlaps the ${overlapsCore ? 'CORE ($299-1,200)' : 'ENTRY ($99-299)'} lane.`);
    }
  } else {
    unknowns.push('Price band not established — ENTRY/CORE lane fit not verified.');
  }

  if (containsAny(textBlob(o), COMMODITY_WORDS)) {
    fail = true;
    reasons.push('Evidence flags this as commodity/saturated/big-box-dominated.');
  }

  // Installation-related language is now a hard fail above (via PHYSICAL_RISK_WORDS/
  // INSTALL_WORDS) when evidence actually mentions it — this only flags the residual
  // case where nothing in the evidence speaks to it either way.
  if (!containsAny(extendedTextBlob(o), INSTALL_WORDS) && !containsAny(extendedTextBlob(o), PHYSICAL_RISK_WORDS)) {
    unknowns.push('Installation complexity not assessed.');
  }
  unknowns.push('Variant / future-collection potential not assessed.');
  unknowns.push('Prime Piece brand fit not assessed — this is a founder judgment call, not something evidence alone can answer.');
  // Genuine-stone integrity is now a hard fail above when evidence actually says
  // otherwise — this only flags the residual case where nothing contradicts the
  // Hunter/Enrich research scope's own assumption that it's natural stone.
  if (!containsAny(extendedTextBlob(o), NOT_GENUINE_STONE_WORDS)) {
    unknowns.push('Not independently reverified that genuine stone is integral to this item\'s value proposition (assumed true by Hunter/Enrich research scope, which only searches for natural-stone products).');
  }

  if (!reasons.length) reasons.push('No structural disqualifier found in current evidence.');

  return { result: fail ? 'FAIL' : 'PASS', reasons, unknowns };
}

// --- PORTFOLIO CHECK (Portfolio + Logistics Sanity Gate, check 1 of 3) -------------
// Orthogonal to Fit/Demand — a product can have excellent evidence on both and still
// not be a genuinely NEW inventory bet if Prime Piece already sells it or something
// meaningfully similar. Two sources of evidence: (a) Enrich's own marketGap text
// sometimes says outright that an opportunity overlaps an existing Prime Piece line
// ("Overlaps heavily with Prime Piece's existing 9-variant plinth line," "a
// repositioning play, not a new product") — read directly, no inference; (b) a small,
// explicitly founder-declared list for real-world "we already sell this" facts that
// Product Lab's own data doesn't yet capture (Product Lab currently tracks research
// candidates, not live SKUs — every item in it is stage RESEARCH or KILL, none
// Active/Maintain, so it cannot itself answer "what do we currently sell").
export function computePortfolioCheck(o) {
  const productText = `${o.product || ''} ${o.variant || ''} ${o.category || ''}`.toLowerCase();
  const declaredMatch = DECLARED_EXISTING_CATEGORIES.find((k) => productText.includes(k));
  if (declaredMatch) {
    return { classification: 'EXISTING_OPTIMISE', reasons: [`Matches a declared existing Prime Piece category ("${declaredMatch}") — not treated as new-product discovery unless this represents a meaningfully different format or economics.`] };
  }
  const evidenceMatch = EXISTING_PORTFOLIO_SIGNAL_WORDS.find((w) => textBlob(o).includes(w));
  if (evidenceMatch) {
    return { classification: 'EXISTING_OPTIMISE', reasons: [`Evidence explicitly states an overlap with Prime Piece's existing range ("${evidenceMatch}") — see marketGap/operatingRisks.`] };
  }
  return { classification: 'NEW', reasons: ['No evidence or declared overlap with an existing Prime Piece product/category found.'] };
}

// --- STAGE 3: DEMAND PROOF -----------------------------------------------------------
// Evidence hierarchy per spec: real sales/orders > reviews/repeat stocking > sold-out/
// restock > multiple retailers > search demand > social > editorial > trend articles >
// AI interpretation. Current evidence never directly records "actual sales," so the
// strongest signal available today is bestseller/repeat-stocking flags and review
// volume (tier 2-4); Fact/Proxy-tagged trend signals sit below that; Estimate/
// Assumption-tagged or editorial-sounding signals sit at the bottom — never above
// reviews/bestseller evidence, per the spec's explicit hierarchy.
function isConsumerSeller(c) {
  const blob = `${c.name || ''} ${c.country || ''}`.toLowerCase();
  return !containsAny(blob, SOURCING_PLATFORM_WORDS);
}

export function computeDemandProofGate(o) {
  if (!hasBeenResearched(o)) {
    return { result: UNKNOWN, confidence: 'LOW', reasons: ['Not yet researched.'], unknowns: ['All Demand Proof criteria — nothing researched yet.'], sellerDepthCount: 0, distinctMarkets: 0, comparablesCount: 0, transactionTier: UNKNOWN };
  }

  const competitors = o.competitors || [];

  // Missing competitor/review evidence is not the same thing as evidence of no
  // demand — it means a real consumer-market research pass (as opposed to Enrich's
  // original, often thin, web-search sweep) hasn't been run yet. A hard FAIL below
  // requires either actual negative evidence or a completed search (competitors[]
  // genuinely populated) that still falls short of the minimum criteria — never a
  // bare absence of data. This was previously misclassified as FAIL, which is
  // exactly the false-negative the funnel's real production run surfaced: 47 of 49
  // opportunities failed Demand Proof, almost entirely because they'd never had a
  // dedicated consumer-market search, not because real evidence showed no demand.
  if (!competitors.length) {
    return {
      result: UNKNOWN, confidence: 'LOW',
      reasons: ['No competitor/review evidence recorded yet — this opportunity has not been through a dedicated consumer-market demand research pass. A hard FAIL requires actual negative evidence or a completed search that falls short of the minimum criteria, neither of which exists yet.'],
      unknowns: ['Seller depth, transaction signal and price comparables all require a real consumer-market research pass that has not yet been run for this opportunity.'],
      sellerDepthCount: 0, distinctMarkets: 0, comparablesCount: 0, transactionTier: UNKNOWN,
    };
  }

  const consumerSellers = competitors.filter(isConsumerSeller);
  const distinctMarkets = new Set(consumerSellers.map((c) => (c.country || '').trim()).filter(Boolean));
  const sellerDepthPass = consumerSellers.length >= 3 && distinctMarkets.size >= 2;

  const hasBestsellerOrRepeat = consumerSellers.some((c) => c.bestsellerFlag);
  const maxReviews = consumerSellers.reduce((m, c) => Math.max(m, c.reviewCount || 0), 0);
  const hasReviewVolume = maxReviews >= 50;
  const trendSignals = o.trendSignals || [];
  const factOrProxySignals = trendSignals.filter((t) => t.type === 'Fact' || t.type === 'Proxy / Signal');
  const estimateOrAssumptionOnly = trendSignals.length > 0 && factOrProxySignals.length === 0;

  let transactionTier;
  if (hasBestsellerOrRepeat) transactionTier = 'STRONG (bestseller / repeat-stocking signal)';
  else if (hasReviewVolume) transactionTier = 'MODERATE (meaningful review volume)';
  else if (factOrProxySignals.length) transactionTier = 'WEAK (Fact/Proxy trend signal only — no sales/review evidence)';
  else if (estimateOrAssumptionOnly) transactionTier = 'VERY WEAK (Estimate/Assumption or editorial-only signal)';
  else transactionTier = 'NONE';

  const comparablesWithPrice = competitors.filter((c) => typeof c.priceLow === 'number' || typeof c.priceHigh === 'number');

  let result, confidence;
  if (sellerDepthPass && (hasBestsellerOrRepeat || hasReviewVolume)) {
    result = 'PASS'; confidence = 'HIGH';
  } else if (consumerSellers.length >= 1 && transactionTier !== 'NONE') {
    result = 'HOLD'; confidence = factOrProxySignals.length ? 'MEDIUM' : 'LOW';
  } else {
    result = 'FAIL'; confidence = 'LOW';
  }

  const reasons = [
    `Seller depth: ${consumerSellers.length} credible consumer seller(s) across ${distinctMarkets.size} market(s) (target: 3+ across 2+ markets; Alibaba/manufacturer-style listings excluded).`,
    `Transaction signal: ${transactionTier}.`,
    `Price comparables: ${comparablesWithPrice.length} of ${competitors.length} competitor(s) have pricing data (target: 5+).`,
  ];
  const unknowns = [];
  if (competitors.some((c) => !c.country)) unknowns.push('Some competitors have no recorded country — market count may be understated.');

  return { result, confidence, reasons, unknowns, sellerDepthCount: consumerSellers.length, distinctMarkets: distinctMarkets.size, comparablesCount: comparablesWithPrice.length, transactionTier };
}

// --- STAGE 3C: PRICE VALIDATION ------------------------------------------------------
// Low/median/upper/outlier over whatever real competitor pricing exists — the spec is
// explicit that the highest listing must never be read as "normal market price," so an
// outlier is called out separately rather than folded into the range silently.
export function computePriceValidation(o) {
  const competitors = o.competitors || [];
  const prices = competitors
    .map((c) => {
      if (typeof c.priceLow === 'number' && typeof c.priceHigh === 'number') return (c.priceLow + c.priceHigh) / 2;
      return typeof c.priceLow === 'number' ? c.priceLow : (typeof c.priceHigh === 'number' ? c.priceHigh : null);
    })
    .filter((p) => p !== null)
    .sort((a, b) => a - b);

  if (!prices.length) {
    return { result: UNKNOWN, comparablesCount: 0, low: null, median: null, upper: null, outlier: null, reasons: ['No competitor pricing recorded.'] };
  }

  const low = prices[0];
  const high = prices[prices.length - 1];
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  const outlier = high > median * 1.75 ? high : null;
  const result = prices.length >= 5 ? 'PASS' : (prices.length >= 2 ? 'HOLD' : UNKNOWN);

  return {
    result, comparablesCount: prices.length, low, median, upper: high, outlier,
    reasons: [`${prices.length} price comparable(s) recorded (target: 5+). Low ${low}, median ${median}, upper ${high}${outlier ? `. ${outlier} is flagged as an outlier, not treated as typical market price` : ''}.`],
  };
}

// --- STAGE 3D: NZ COMPETITIVE GAP -----------------------------------------------------
// The spec is explicit: no competition is NOT automatically good — an empty market can
// mean no demand rather than a gap. Current evidence has no dedicated NZ-competitor
// research step, so this almost always returns UNKNOWN rather than guessing which of
// "genuine gap" or "no real demand" a silent market actually is.
export function computeNzGap(o) {
  if (!hasBeenResearched(o)) return { classification: UNKNOWN, reasons: ['Not yet researched.'] };

  const blob = textBlob(o);
  const nzCompetitors = (o.competitors || []).filter((c) => /new zealand|\bnz\b/i.test(c.country || ''));

  if (containsAny(blob, COMMODITY_WORDS)) {
    return { classification: 'BIG_BOX_COMMODITY', reasons: ['Evidence flags commodity/saturated/big-box competition.'] };
  }
  if (nzCompetitors.length >= 3) {
    return { classification: 'STRONG_COMPETITION', reasons: [`${nzCompetitors.length} NZ competitor(s) explicitly recorded.`] };
  }
  if (nzCompetitors.length >= 1) {
    return { classification: 'FRAGMENTED_COMPETITION', reasons: [`${nzCompetitors.length} NZ competitor(s) explicitly recorded — not clearly dominant.`] };
  }
  return {
    classification: UNKNOWN,
    reasons: ['No NZ-specific competitor evidence recorded. An empty market cannot be assumed low-competition — per the funnel spec it may equally mean no demand. This axis needs dedicated NZ-market research, not yet performed for this opportunity.'],
  };
}

// --- STAGE 5: ECONOMICS READINESS -----------------------------------------------------
// Requires a real, PARSED supplier quote — before that, landed cost/margin is genuinely
// unknown, never a placeholder. Deliberately does not duplicate run.mjs's
// estimateLandedEconomics (which also needs Product Lab's own contribution-margin
// inputs); this is the earlier, Radar-stage readiness check, before promotion.
export function computeEconomicsReadiness(o, suppliersForOpportunity) {
  const suppliers = suppliersForOpportunity || [];
  const credibleSuppliers = suppliers.filter((s) => !s.evidenceGap);
  const parsedSuppliers = suppliers.filter((s) => s.quoteParseStatus === 'PARSED');

  if (!suppliers.length) {
    return { result: UNKNOWN, supplierCount: 0, credibleSupplierCount: 0, bestSupplier: null, reasons: ['No supplier research has been run for this opportunity yet.'] };
  }
  if (!parsedSuppliers.length) {
    return {
      result: UNKNOWN, supplierCount: suppliers.length, credibleSupplierCount: credibleSuppliers.length, bestSupplier: null,
      reasons: [`${suppliers.length} supplier(s) discovered (${credibleSuppliers.length} credible), but no real quote has been parsed yet — landed cost/margin cannot be computed from discovery-stage data alone.`],
    };
  }

  const priced = parsedSuppliers
    .map((s) => ({ s, price: representativeUnitPrice(s) }))
    .filter((x) => x.price !== null)
    .sort((a, b) => a.price - b.price);
  const best = priced[0];

  if (!best) {
    return { result: UNKNOWN, supplierCount: suppliers.length, credibleSupplierCount: credibleSuppliers.length, bestSupplier: parsedSuppliers[0] || null, reasons: ['A quote was parsed but no usable unit pricing was stated.'] };
  }

  const unitPrice = best.price;
  const freightPerUnit = typeof best.s.freightPerUnitEstimateUSD === 'number' ? best.s.freightPerUnitEstimateUSD : null;
  const landedCost = freightPerUnit !== null ? unitPrice + freightPerUnit : null;
  const targetRetail = typeof o.priceBand?.low === 'number' ? o.priceBand.low : null;
  const landedCostPct = (landedCost !== null && targetRetail) ? Math.round((landedCost / targetRetail) * 1000) / 10 : null;
  const grossMarginPct = landedCostPct !== null ? Math.round((100 - landedCostPct) * 10) / 10 : null;
  const readinessOk = landedCostPct !== null && landedCostPct <= 30 && grossMarginPct !== null && grossMarginPct >= 60;

  return {
    result: landedCost === null ? UNKNOWN : (readinessOk ? 'READY' : 'NOT_READY'),
    supplierCount: suppliers.length, credibleSupplierCount: credibleSuppliers.length, bestSupplier: best.s,
    unitPrice, freightPerUnit, landedCost, targetRetail, landedCostPct, grossMarginPct,
    reasons: [
      landedCost === null
        ? 'Unit price is known but no per-unit freight figure was recorded — landed cost is incomplete, not assumed.'
        : `Landed cost ${landedCostPct}% of target retail (target ≤25-30%), gross margin ${grossMarginPct}% (target ≥60-70%).`,
    ],
  };
}

// --- STAGE 6: DOWNSIDE STRESS TEST -----------------------------------------------------
export function computeDownsideStressTest(economicsReadiness) {
  if (economicsReadiness.result === UNKNOWN || economicsReadiness.landedCost == null) {
    return { flag: UNKNOWN, baseMarginPct: null, downsideLandedCost: null, downsideMarginPct: null, reasons: ['Economics not established yet — cannot stress test.'] };
  }
  const { landedCost, targetRetail, grossMarginPct } = economicsReadiness;
  const downsideLandedCost = Math.round(landedCost * 1.2 * 100) / 100;
  const downsideMarginPct = targetRetail ? Math.round((1 - downsideLandedCost / targetRetail) * 1000) / 10 : null;

  let flag;
  if (downsideMarginPct === null) flag = UNKNOWN;
  else if (downsideMarginPct >= 50) flag = 'ROBUST';
  else if (downsideMarginPct >= 30) flag = 'MARGINAL';
  else flag = 'FRAGILE';

  return {
    flag, baseMarginPct: grossMarginPct, downsideLandedCost, downsideMarginPct,
    reasons: [`Base-case gross margin ${grossMarginPct}%. Downside case (landed cost +20%) gross margin ${downsideMarginPct}%.`],
  };
}

// --- STAGE 7: SAMPLE GATE --------------------------------------------------------------
// A tri-state per condition (MET / NOT_MET / UNKNOWN) — "not enough evidence gathered
// yet" is never collapsed into "failed." Right-to-win and validation-plan are explicit
// founder judgment calls with no evidence source at all yet, so they are always
// UNKNOWN here rather than auto-generated — recording them is deliberately left as a
// manual step outside this pass.
// A generous but explicit assumption (documented in the reason text, never hidden):
// an initial commercial order of MOQ x unit price under US$2,000 is treated as "small
// enough that being wrong is not financially painful."
const MOQ_CAPITAL_EXPOSURE_CAP_USD = 2000;

export function computeSampleGate({ demand, priceValidation, nzGap, economics, downside }) {
  function state(v) {
    if (v === null || v === undefined) return UNKNOWN;
    return v ? 'MET' : 'NOT_MET';
  }

  const bestSupplier = economics.bestSupplier;
  const hasParsedQuote = economics.result !== UNKNOWN || economics.landedCost != null; // a quote was actually parsed, even if numbers were incomplete
  const cartonKnown = bestSupplier ? Boolean(bestSupplier.cartonSpec?.size && bestSupplier.cartonSpec?.weightKg && bestSupplier.packagingMethod) : null;
  const moqKnown = bestSupplier ? typeof bestSupplier.moq === 'number' : null;
  const moqSmallEnough = moqKnown && typeof economics.unitPrice === 'number' ? (bestSupplier.moq * economics.unitPrice <= MOQ_CAPITAL_EXPOSURE_CAP_USD) : null;

  const checks = [
    { id: 'demand', label: '3+ credible sellers across 2+ markets with a real transaction signal', state: demand.result === 'PASS' ? 'MET' : (demand.result === UNKNOWN ? UNKNOWN : 'NOT_MET') },
    { id: 'priceValidation', label: '5+ genuine retail comparables', state: priceValidation.result === 'PASS' ? 'MET' : (priceValidation.result === UNKNOWN ? UNKNOWN : 'NOT_MET') },
    { id: 'nzOpportunity', label: 'NZ competitive gap actually understood (not just absence of data)', state: (nzGap.classification === 'FRAGMENTED_COMPETITION') ? 'MET' : (nzGap.classification === UNKNOWN ? UNKNOWN : 'NOT_MET') },
    { id: 'suppliers', label: '2+ credible supplier options', state: economics.supplierCount === 0 ? UNKNOWN : state(economics.credibleSupplierCount >= 2) },
    { id: 'economics', label: 'Landed cost ≤30% of retail, gross margin ≥60%', state: economics.result === UNKNOWN ? UNKNOWN : state(economics.result === 'READY') },
    { id: 'downside', label: 'Margin stays robust if landed cost comes in ~20% worse', state: downside.flag === UNKNOWN ? UNKNOWN : state(downside.flag === 'ROBUST') },
    { id: 'logistics', label: 'Packed dimensions, weight and packaging method known — not guessed', state: !hasParsedQuote ? UNKNOWN : state(cartonKnown) },
    { id: 'moq', label: `Initial order small enough that being wrong is not financially painful (assumed cap: US$${MOQ_CAPITAL_EXPOSURE_CAP_USD} exposure)`, state: !moqKnown ? UNKNOWN : state(moqSmallEnough) },
    { id: 'rightToWin', label: 'A specific, non-generic reason Prime Piece wins this over existing alternatives', state: UNKNOWN },
    { id: 'validationPlan', label: 'A recorded plan for testing the sample once received', state: UNKNOWN },
  ];

  const summary = {
    met: checks.filter((c) => c.state === 'MET').length,
    notMet: checks.filter((c) => c.state === 'NOT_MET').length,
    unknown: checks.filter((c) => c.state === UNKNOWN).length,
    total: checks.length,
  };

  return { checks, summary };
}

// --- STAGE 8: FINAL DECISION -----------------------------------------------------------
// KILL only ever fires on a structural problem already proven by real evidence (Fit
// FAIL or Demand FAIL) — never on missing evidence, which is HOLD's job. SAMPLE only
// fires when every Sample Gate condition is genuinely MET, not merely not-yet-unknown.
// EXISTING_OPTIMISE is checked first and short-circuits everything else — an item
// Prime Piece already sells is not a "new product" question at all, regardless of how
// its own Fit/Demand evaluation reads; those are still computed and shown (the
// opportunity's demand evidence is never discarded), just not used to decide whether
// to KILL/HOLD/SAMPLE it as a next inventory bet.
export function computeFinalDecision({ fit, demand, sampleGate, portfolio }) {
  if (portfolio && portfolio.classification === 'EXISTING_OPTIMISE') {
    return {
      decision: 'EXISTING_OPTIMISE',
      why: 'Prime Piece already sells this or a meaningfully similar product/category: ' + portfolio.reasons.join(' '),
      criticalEvidence: portfolio.reasons,
      mainRisk: 'Cannibalising or diluting an existing line rather than genuinely adding a new one.',
      whatWouldChange: 'A meaningfully different format or economics from what Prime Piece already sells.',
      nextAction: 'Route to existing-product optimisation (pricing, merchandising, cross-sell) — not new-product evaluation.',
    };
  }
  if (fit.result === 'FAIL') {
    return {
      decision: 'KILL',
      why: 'Fails Prime Piece Fit: ' + fit.reasons.join(' '),
      criticalEvidence: fit.reasons,
      mainRisk: 'Structural mismatch with Prime Piece\'s scalable-import ecommerce model.',
      whatWouldChange: 'A material change to the product itself (different variant, material, or positioning) — not more research on this one.',
      nextAction: 'Do not pursue further. Leave on Market Radar as Kill.',
    };
  }
  if (demand.result === 'FAIL') {
    return {
      decision: 'KILL',
      why: 'No credible demand evidence found despite research.',
      criticalEvidence: demand.reasons,
      mainRisk: 'This may simply not be a real market, not just an under-researched one.',
      whatWouldChange: 'New, currently-unavailable evidence of genuine consumer demand.',
      nextAction: 'Do not pursue further research on this opportunity at this time.',
    };
  }

  const { checks, summary } = sampleGate;
  if (summary.notMet === 0 && summary.unknown === 0) {
    return {
      decision: 'SAMPLE',
      why: 'Every Sample Gate condition is met with real evidence.',
      criticalEvidence: checks.filter((c) => c.state === 'MET').map((c) => c.label),
      mainRisk: 'Residual execution risk only (supplier reliability, real-world sell-through) — not evidence risk.',
      whatWouldChange: 'N/A — ready to proceed.',
      nextAction: 'Bring to James for a physical sample-order decision.',
    };
  }

  const missing = checks.filter((c) => c.state !== 'MET').map((c) => c.label);
  const nextAction = checks.some((c) => c.id === 'suppliers' && c.state !== 'MET')
    ? 'Run supplier discovery for this opportunity before anything else.'
    : checks.some((c) => c.id === 'economics' && c.state !== 'MET')
      ? 'Get a real supplier quote parsed so landed cost/margin can be computed.'
      : 'Gather the specific missing evidence listed below before considering a sample.';

  return {
    decision: 'HOLD',
    why: `Interesting candidate, but ${summary.notMet + summary.unknown} of ${summary.total} Sample Gate condition(s) are not yet proven (${summary.met} met, ${summary.notMet} checked-and-not-met, ${summary.unknown} unknown).`,
    criticalEvidence: checks.filter((c) => c.state === 'MET').map((c) => c.label),
    mainRisk: 'Committing money or attention before ' + (missing[0] || 'key evidence') + ' is actually known.',
    whatWouldChange: 'Missing: ' + missing.join('; '),
    nextAction,
  };
}

// --- STAGE 9: TOP 3 / WATCHLIST / KILL --------------------------------------------------
// opportunityScore is used ONLY as the final tiebreaker (3rd sort key) — a high Radar
// score alone can never outrank real demand/readiness evidence, per the funnel's
// central rule. "Top 3" here means "currently most investment-ready based on available
// evidence," not "will definitely sell" — sampleReadyCount tells you honestly how many
// of them have actually cleared every Sample Gate condition.
// Separates MARKET DEMAND (the demand/sampleGate evidence itself, always preserved
// and shown) from ATTRACTIVENESS AS PRIME PIECE'S NEXT INVENTORY BET (this ranking) —
// strong demand alone cannot make something #1 if it's already in the portfolio
// (routed out entirely, see existingOptimise below), if NZ competition is already
// saturated, or if its differentiation potential is weak.
export function rankInvestmentReadiness(evaluations) {
  const kill = evaluations.filter((e) => e.finalDecision.decision === 'KILL');
  const existingOptimise = evaluations.filter((e) => e.finalDecision.decision === 'EXISTING_OPTIMISE');
  const eligible = evaluations.filter((e) => e.finalDecision.decision !== 'KILL' && e.finalDecision.decision !== 'EXISTING_OPTIMISE');

  const rankKey = (e) => {
    const demandRank = e.demand.result === 'PASS' ? 2 : e.demand.result === 'HOLD' ? 1 : 0;
    // Saturated/big-box NZ competition and a weak differentiation sub-score (already
    // part of opportunityScore's own inputs, read here but never re-weighted) both
    // demote a "next inventory bet" ranking without touching the Radar score itself.
    const competitionPenalty = (e.nzGap?.classification === 'STRONG_COMPETITION' || e.nzGap?.classification === 'BIG_BOX_COMMODITY') ? 0 : 1;
    const differentiationScore = e.differentiationScore || 0;
    return [demandRank, competitionPenalty, e.sampleGate.summary.met, differentiationScore, e.opportunityScore || 0];
  };
  const sorted = eligible.slice().sort((a, b) => {
    const ra = rankKey(a), rb = rankKey(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return rb[i] - ra[i];
    return 0;
  });

  const sampleReady = sorted.filter((e) => e.finalDecision.decision === 'SAMPLE');
  const watchlist = sorted.filter((e) => e.finalDecision.decision === 'HOLD');
  const top10 = sorted.slice(0, 10);
  const top3 = sorted.slice(0, 3);

  return {
    top10, top3,
    top3IsFullyQualified: sampleReady.length >= 3,
    sampleReadyCount: sampleReady.length,
    watchlist, kill, existingOptimise,
  };
}

// =====================================================================================
// FAST TRACK PRODUCT ANALYSIS
// One-off, URL-anchored, single-product intelligence workflow — distinct from the
// batch Market Radar funnel above. James pastes a product URL (plus optional supplier/
// competitor URLs, notes, image) and gets a concise SAMPLE/HOLD/KILL decision card in
// one pass. Every stage that involves real evidence (extraction, market validation,
// design intelligence, supplier search) is a real Anthropic/Tavily call made by
// run.mjs's 'fast-track' mode (manual trigger only, same cost-control convention as
// supplier/quote-capture); everything below is the deterministic, non-AI arithmetic
// layer — ranking suppliers, modelling landed economics, and assembling the final
// decision card — kept here so it's exactly reproducible and unit-testable, same
// reasoning as every other plain-code function in this file.
// =====================================================================================

// --- Stage 4: Supplier ranking (Fast Track's own weights, per spec) -----------------
// Deliberately separate from SUPPLIER_SCORE_WEIGHTS above (that one ranks by
// commercial terms once a quote exists, meaningless before one). Fast Track ranks
// supplier CANDIDATES before any quote — quality/expertise and unit economics carry
// the most weight, MOQ/customisation next, then lead time/shipping, then soft signals.
export const FAST_TRACK_SUPPLIER_WEIGHTS = {
  quality: 0.20,
  unitEconomics: 0.20,
  moq: 0.15,
  customisation: 0.15,
  leadTime: 0.10,
  shipping: 0.10,
  communication: 0.05,
  evidence: 0.05,
};

// A known/named supplier (e.g. one the founder already has a relationship with) is
// passed through the exact same scoring as every other candidate — never assumed
// best. Each 0-100 sub-score must come from real evidence; a candidate missing a
// sub-score is scored 0 for it (same "unknown must never look like best" principle
// as normalizeWithinBatch above), and the reasons array says explicitly which
// sub-scores were UNKNOWN rather than silently averaging over fewer inputs.
export function rankFastTrackSuppliers(candidates) {
  if (!Array.isArray(candidates) || !candidates.length) return [];
  const keys = Object.keys(FAST_TRACK_SUPPLIER_WEIGHTS);
  return candidates
    .map((c) => {
      const missing = [];
      let weightedSum = 0;
      for (const key of keys) {
        const raw = c.subScores?.[key];
        const value = typeof raw === 'number' ? Math.max(0, Math.min(100, raw)) : null;
        if (value === null) { missing.push(key); continue; }
        weightedSum += value * FAST_TRACK_SUPPLIER_WEIGHTS[key];
      }
      const fastTrackScore = Math.round(weightedSum);
      return {
        ...c,
        fastTrackScore,
        missingSubScores: missing,
        knownFactory: Boolean(c.isKnownSupplier),
      };
    })
    .sort((a, b) => b.fastTrackScore - a.fastTrackScore);
}

// --- Stage 5: Unit economics (plain arithmetic, no Claude call) ---------------------
// Every figure is either a real number the supplier-search/market-validation stages
// actually found, or explicitly null — never a guess. LOW/BASE/HIGH scenario the
// spec asks for is modelled by varying the two least-certain inputs (factory price,
// freight) by ±15%; customs/GST/local-freight are applied at their real stated rates
// (or left null) since those are policy facts, not estimates that vary by scenario.
const SCENARIO_MULTIPLIERS = { LOW: 0.85, BASE: 1, HIGH: 1.15 };
const NZ_GST_RATE = 0.15;

function fastTrackScenario(inputs, multiplier) {
  const { factoryPriceUSD, packagingPerUnitUSD, freightPerUnitUSD, dutyRatePct, localFreightPerUnitNZD, fxRateUSDtoNZD, targetRetailNZD } = inputs;
  if (typeof factoryPriceUSD !== 'number') {
    return { landedCostNZD: null, grossProfitNZD: null, grossMarginPct: null, reasons: ['No factory price known yet — economics cannot be modelled.'] };
  }
  const packaging = typeof packagingPerUnitUSD === 'number' ? packagingPerUnitUSD : 0;
  const freight = typeof freightPerUnitUSD === 'number' ? freightPerUnitUSD * multiplier : null;
  const factory = factoryPriceUSD * multiplier;
  const fx = typeof fxRateUSDtoNZD === 'number' ? fxRateUSDtoNZD : null;
  const usdSubtotal = freight !== null ? factory + packaging + freight : null;
  const cifNZD = (usdSubtotal !== null && fx !== null) ? usdSubtotal * fx : null;
  const duty = (cifNZD !== null && typeof dutyRatePct === 'number') ? cifNZD * (dutyRatePct / 100) : null;
  const gstBase = (cifNZD !== null && duty !== null) ? cifNZD + duty : null;
  const gst = gstBase !== null ? gstBase * NZ_GST_RATE : null;
  const localFreight = typeof localFreightPerUnitNZD === 'number' ? localFreightPerUnitNZD : 0;
  const landedCostNZD = (gstBase !== null && gst !== null) ? gstBase + gst + localFreight : null;
  const grossProfitNZD = (landedCostNZD !== null && typeof targetRetailNZD === 'number') ? targetRetailNZD - landedCostNZD : null;
  const grossMarginPct = (grossProfitNZD !== null && targetRetailNZD) ? Math.round((grossProfitNZD / targetRetailNZD) * 1000) / 10 : null;
  const reasons = [];
  if (fx === null) reasons.push('No USD→NZD FX rate provided — landed cost in NZD not calculable.');
  if (freight === null) reasons.push('No per-unit freight figure known yet.');
  if (typeof dutyRatePct !== 'number') reasons.push('Duty rate unknown — treated as 0%, not verified.');
  return { landedCostNZD: landedCostNZD !== null ? Math.round(landedCostNZD * 100) / 100 : null, grossProfitNZD: grossProfitNZD !== null ? Math.round(grossProfitNZD * 100) / 100 : null, grossMarginPct, reasons };
}

// Reverse calculation: for each target gross margin (60/65/70/75%), what is the
// maximum landed cost that still achieves it against the target retail price?
// landedCost = retail * (1 - marginPct/100). Returns null if no target retail exists.
function maxAllowableLandedCost(targetRetailNZD) {
  if (typeof targetRetailNZD !== 'number') return null;
  const out = {};
  for (const marginPct of [60, 65, 70, 75]) {
    out[marginPct] = Math.round(targetRetailNZD * (1 - marginPct / 100) * 100) / 100;
  }
  return out;
}

export function computeFastTrackEconomics(inputs) {
  const scenarios = {};
  for (const [name, multiplier] of Object.entries(SCENARIO_MULTIPLIERS)) {
    scenarios[name] = fastTrackScenario(inputs, multiplier);
  }
  return {
    scenarios,
    maxAllowableLandedCostByMargin: maxAllowableLandedCost(inputs.targetRetailNZD),
    moqCashRequirementUSD: (typeof inputs.factoryPriceUSD === 'number' && typeof inputs.moq === 'number') ? Math.round(inputs.factoryPriceUSD * inputs.moq * 100) / 100 : null,
  };
}

// --- Stage 7: Decision card (plain arithmetic, assembles every prior stage) ---------
// Same tri-state honesty as the Commercial Funnel above: KILL only ever fires on a
// structural/safety problem actually found in evidence; SAMPLE only fires when the
// core evidence pillars (demand, price validation, at least one viable supplier, and
// a landed-cost-vs-target-margin fit) are all real and positive; everything else is
// HOLD, with the decision card saying exactly what's missing rather than rounding up
// to looking more confident than the evidence supports.
// supplierSearchFailed: true when the supplier-search stage itself errored (e.g. a
// truncated/malformed model response) rather than genuinely completing its research
// and finding zero candidates. Without this distinction, an empty supplierRanking
// array reads identically for "we looked and found nothing" and "we never actually
// looked" — the pillar label below says so explicitly so a HOLD is never mistaken
// for a complete assessment when supplier data is simply missing due to a technical
// failure. Defaults to false so every existing caller/fixture is unaffected.
export function computeFastTrackDecision({ marketValidation, designIntelligence, supplierRanking, economics, risk, supplierSearchFailed = false }) {
  const reasons = [];
  let structuralKill = null;

  const criticalRisks = (risk?.checks || []).filter((c) => c.severity === 'HIGH' && c.status === 'CONFIRMED');
  if (criticalRisks.length) {
    structuralKill = `Confirmed high-severity risk: ${criticalRisks.map((c) => c.item).join(', ')}.`;
  }
  if (!structuralKill && marketValidation?.marketMaturity === 'SATURATED_COMMODITY') {
    structuralKill = 'Market evidence indicates this is already a saturated commodity category.';
  }

  const bestSupplier = (supplierRanking || [])[0] || null;
  const bestScenario = economics?.scenarios?.BASE;
  const marginTargetMet = bestScenario && typeof bestScenario.grossMarginPct === 'number' && bestScenario.grossMarginPct >= 60;

  const demandGenuine = marketValidation?.demandCharacter === 'GENUINE';
  const hasComparables = (marketValidation?.comparables || []).length >= 3;
  const hasSupplier = Boolean(bestSupplier);
  const hasEconomics = Boolean(bestScenario && bestScenario.landedCostNZD !== null);

  const pillars = [
    { id: 'demand', label: 'Genuine (not purely aesthetic/social) demand evidence', met: demandGenuine },
    { id: 'comparables', label: '3+ real retail comparables found', met: hasComparables },
    { id: 'supplier', label: supplierSearchFailed ? 'Supplier search failed (technical error) — not yet researched, not confirmed absent' : 'At least one viable supplier candidate identified', met: hasSupplier },
    { id: 'economics', label: 'Landed cost modelled and meets ≥60% margin target', met: hasEconomics && marginTargetMet },
  ];
  const metCount = pillars.filter((p) => p.met).length;

  let decision, why;
  if (structuralKill) {
    decision = 'KILL';
    why = structuralKill;
  } else if (metCount === pillars.length) {
    decision = 'SAMPLE';
    why = 'All core evidence pillars are met: genuine demand, validated pricing, a viable supplier, and economics that clear the margin target.';
  } else {
    decision = 'HOLD';
    const missing = pillars.filter((p) => !p.met).map((p) => p.label);
    why = `${pillars.length - metCount} of ${pillars.length} core evidence pillar(s) not yet met: ${missing.join('; ')}.`;
  }

  // Opportunity score: a simple, documented 0-100 composite — NOT the same formula as
  // Market Radar's opportunityScore (that one is a 10-dimension weighted sum over
  // Enrich's scoreBreakdown; this is a 4-pillar evidence-completeness score specific
  // to the Fast Track flow). Never presented as more precise than "how many of the
  // 4 core pillars are actually proven."
  const opportunityScore = Math.round((metCount / pillars.length) * 100);
  const confidence = metCount >= 3 ? 'MEDIUM' : metCount >= 1 ? 'LOW' : 'VERY LOW';

  let nextExperiment;
  if (decision === 'KILL') {
    nextExperiment = 'Do not pursue further on current evidence.';
  } else if (decision === 'SAMPLE') {
    nextExperiment = `Order a physical sample from ${bestSupplier?.name || 'the best-ranked supplier'} in design direction ${designIntelligence?.recommendedDirection || '?'}, and test it against a real customer (waitlist, preorder, or trade showing) before committing to inventory.`;
  } else {
    const missingIds = pillars.filter((p) => !p.met).map((p) => p.id);
    if (missingIds.includes('supplier')) nextExperiment = 'Get real supplier quotes — this is the single biggest gap right now.';
    else if (missingIds.includes('economics')) nextExperiment = 'Get a firm factory price + freight quote so landed cost can be modelled against the margin target.';
    else if (missingIds.includes('comparables')) nextExperiment = 'Search for more real retail comparables to validate the price point before committing further.';
    else nextExperiment = 'Find genuine transaction evidence (sales, reviews, repeat-stocking) — current signal may be aesthetic/social only.';
  }

  return {
    decision, why, opportunityScore, confidence, pillars, nextExperiment,
    bestDesignDirection: designIntelligence?.recommendedDirection || null,
    bestSupplier: bestSupplier ? { name: bestSupplier.name, fastTrackScore: bestSupplier.fastTrackScore } : null,
    biggestRisk: (risk?.checks || []).slice().sort((a, b) => {
      const sev = { HIGH: 2, MEDIUM: 1, LOW: 0 };
      return (sev[b.severity] || 0) - (sev[a.severity] || 0);
    })[0] || null,
  };
}
