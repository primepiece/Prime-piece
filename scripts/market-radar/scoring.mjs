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
function representativeUnitPrice(supplier) {
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
