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
