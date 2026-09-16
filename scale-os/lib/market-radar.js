// Market Radar: the broad, continuously-refreshable opportunity universe. Separate from
// Product Lab (which only holds products Prime Piece is seriously investigating) — this
// page is read-mostly, populated by the GitHub Actions research worker
// (scripts/market-radar/run.mjs), with one manual action: promote an opportunity into
// Product Lab once it clears whatever bar James judges worth investigating.

export const MARKET_RADAR_STYLE = `
  .radar-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .radar-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .filter-chip {
    font-size: 11.5px; padding: 5px 11px; border-radius: 20px; border: 1px solid var(--line);
    background: var(--white); color: var(--muted); cursor: pointer; user-select: none;
  }
  .filter-chip:hover { border-color: var(--black); color: var(--black); }
  .filter-chip.active { background: var(--black); color: var(--white); border-color: var(--black); }
  .filter-chip.tier-A.active { background: #2E7D4F; border-color: #2E7D4F; }
  .filter-chip.tier-B.active { background: #8A6A2A; border-color: #8A6A2A; }
  .filter-chip.tier-C.active { background: #8A8577; border-color: #8A8577; }
  .filter-chip.tier-Kill.active { background: var(--red); border-color: var(--red); }
  select.radar-select { font-size: 12px; padding: 5px 8px; border-radius: 4px; border: 1px solid var(--line); background: var(--white); color: var(--black); }
  .empty-state { padding: 40px 20px; text-align: center; color: var(--muted); font-size: 13px; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 6px; background: var(--white); }
  table.radar { border-collapse: collapse; width: 100%; min-width: 2400px; font-size: 12.5px; }
  table.radar th, table.radar td { border-bottom: 1px solid var(--line); border-right: 1px solid #EFEDE7; padding: 9px 10px; white-space: nowrap; text-align: left; vertical-align: top; }
  table.radar thead th { position: sticky; top: 56px; background: #F4F2EC; z-index: 5; font-size: 10.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); cursor: pointer; }
  table.radar thead th:hover { color: var(--black); }
  table.radar thead th.sorted { color: var(--teal-dark); }
  table.radar td.sticky-col, table.radar th.sticky-col { position: sticky; left: 0; background: #F4F2EC; z-index: 3; min-width: 220px; max-width: 280px; white-space: normal; }
  table.radar tbody td.sticky-col { background: var(--white); box-shadow: 2px 0 0 #EFEDE7; }
  table.radar td.sticky-col2, table.radar th.sticky-col2 { position: sticky; left: 220px; background: #F4F2EC; z-index: 3; min-width: 40px; max-width: 40px; text-align: center; }
  table.radar tbody td.sticky-col2 { background: var(--white); box-shadow: 2px 0 0 #EFEDE7; }
  table.radar tbody tr:hover td { background: #FBFAF7; }
  table.radar tbody tr:hover td.sticky-col, table.radar tbody tr:hover td.sticky-col2 { background: #F7F6F2; }
  table.radar tbody tr.tier-Kill td { opacity: 0.5; }
  .rank-cell { font-weight: 700; color: var(--muted); text-align: center; }
  .score-pair { display: flex; flex-direction: column; gap: 2px; }
  .score-num { font-weight: 700; font-size: 14px; }
  .conf-num { font-size: 10.5px; color: var(--muted); }
  .tier-pill { font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
  .tier-pill.tier-A { background: #DCEAE0; color: #2E7D4F; }
  .tier-pill.tier-B { background: #E9E2CC; color: #8A6A2A; }
  .tier-pill.tier-C { background: #EEECE6; color: #8A8577; }
  .tier-pill.tier-Kill { background: #F1E4DF; color: #A05B44; }
  .trend-badge { font-size: 11px; }
  .trend-Rising::before { content: "\\2191 "; color: #2E7D4F; }
  .trend-Declining::before { content: "\\2193 "; color: var(--red); }
  .trend-Stable::before { content: "\\2192 "; color: var(--muted); }
  .trend-New::before { content: "\\2726 "; color: var(--teal-dark); }
  .expand-btn { background: none; border: none; cursor: pointer; font-size: 13px; color: var(--muted); width: 100%; padding: 10px 0; }
  .expand-btn:hover { color: var(--black); }

  tr.detail-row td { background: #F7F6F2; padding: 22px 26px; border-right: none; white-space: normal; }
  .detail-panel { max-width: 1200px; }
  .detail-head { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 4px; }
  .detail-title { font-size: 15px; font-weight: 700; }
  .detail-sub { font-size: 11.5px; color: var(--muted); margin-bottom: 18px; }
  .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px 24px; }
  .detail-section { margin-bottom: 4px; }
  .detail-section-title { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--teal-dark); margin-bottom: 6px; }
  .detail-section-body { font-size: 12.5px; line-height: 1.6; color: #333; }
  .detail-section-body ul { margin: 0; padding-left: 18px; }
  .source-unavailable { color: #B69B6B; font-style: italic; }
  .evidence-tag-sm { font-size: 9.5px; letter-spacing: 0.02em; padding: 1px 7px; border-radius: 20px; background: #EEECE6; color: #555; margin-left: 5px; white-space: nowrap; }
  .competitor-row { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; border-bottom: 1px solid #EFEDE7; }
  .competitor-row:last-child { border-bottom: none; }
  .source-link { display: block; font-size: 11.5px; margin-bottom: 3px; color: var(--teal-dark); }
  .breakdown-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 11px; }
  .breakdown-label { width: 130px; flex: none; color: var(--muted); }
  .breakdown-track { flex: 1; height: 6px; background: #EEECE6; border-radius: 4px; overflow: hidden; }
  .breakdown-fill { height: 100%; background: var(--teal); }
  .breakdown-val { width: 30px; text-align: right; flex: none; font-weight: 600; }
  .next-action-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; background: var(--black); color: var(--white); }
  .promote-btn { margin-top: 4px; }
  .promoted-note { font-size: 11.5px; color: #2E7D4F; margin-top: 8px; }

  .funnel-pill { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 20px; letter-spacing: 0.03em; }
  .funnel-SAMPLE { background: #DCEAE0; color: #2E7D4F; }
  .funnel-HOLD { background: #E9E2CC; color: #8A6A2A; }
  .funnel-KILL { background: #F1E4DF; color: #A05B44; }
  .funnel-UNKNOWN { background: #EEECE6; color: #8A8577; }
  .funnel-gate-row { display: flex; justify-content: space-between; gap: 10px; padding: 3px 0; font-size: 12px; }
  .funnel-gate-row .funnel-gate-label { color: var(--muted); }
  .funnel-caveat { font-size: 11px; color: #B69B6B; font-style: italic; margin-top: 8px; }
`;

export const MARKET_RADAR_BODY = `
  <h1>Market Radar</h1>
  <p class="page-sub">The broad opportunity universe — evidence-backed, continuously refreshed. Promote the strongest finds into Product Lab.</p>

  <div id="loadingState" class="empty-state">Loading opportunities…</div>
  <div id="loadErrorState" class="empty-state" style="display:none;"></div>

  <div id="radarContent" style="display:none;">
    <div class="radar-toolbar">
      <div class="radar-filters">
        <span class="filter-chip tier-A" data-tier="A">Tier A</span>
        <span class="filter-chip tier-B" data-tier="B">Tier B</span>
        <span class="filter-chip tier-C" data-tier="C">Tier C</span>
        <span class="filter-chip tier-Kill" data-tier="Kill">Kill</span>
        <select class="radar-select" id="marketFilter">
          <option value="">All markets</option>
        </select>
        <select class="radar-select" id="categoryFilter">
          <option value="">All categories</option>
        </select>
        <span class="filter-chip" data-toggle="rising">Rising</span>
        <span class="filter-chip" data-toggle="highConfidence">High confidence</span>
        <span class="filter-chip" data-toggle="new">New</span>
      </div>
      <div class="muted" id="rowCount" style="font-size:12.5px;"></div>
    </div>

    <div class="table-wrap">
      <table class="radar" id="radarTable">
        <thead>
          <tr id="headerRow"></tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
    <div id="emptyState" class="empty-state" style="display:none;">No opportunities match these filters.</div>
  </div>
`;

export const MARKET_RADAR_SCRIPT = `
<script>
(function () {
  var EVIDENCE_CLASS = { 'Fact': 'evidence-tag-sm', 'Proxy / Signal': 'evidence-tag-sm', 'Estimate': 'evidence-tag-sm', 'Founder Assumption': 'evidence-tag-sm' };

  // --- Commercial Funnel / Investment Readiness ---------------------------------
  // Mirrors scripts/market-radar/scoring.mjs (same file/function-per-page convention
  // as dashboard.js/product-lab.js — no shared client module loading in this app).
  // Read-only presentation layer: never triggers supplier research or sample spend.
  var UNKNOWN = 'UNKNOWN';
  var SOURCING_PLATFORM_WORDS = ['alibaba', 'made-in-china', 'global sources', 'manufacturer', 'wholesale supplier', 'trade directory', 'factory direct'];
  var COMMODITY_WORDS = ['commodity', 'saturated', 'big-box', 'big box', 'generic', 'race-to-the-bottom', 'race to the bottom'];
  var INSTALL_WORDS = ['installation', 'professional install', 'plumber', 'tradesperson required', 'built-in', 'permanent fixture'];

  function hasBeenResearched(o) { return !!(o.scoreBreakdown || (o.sources && o.sources.length) || o.demandSignal); }
  function textBlob(o) { return [].concat(o.disqualifiers || [], o.operatingRisks || [], [(o.marketGap && o.marketGap.description) || '']).join(' . ').toLowerCase(); }
  function containsAny(text, words) { return words.some(function (w) { return text.indexOf(w) !== -1; }); }

  function computeFitGate(o) {
    if (!hasBeenResearched(o)) return { result: UNKNOWN, reasons: ['Not yet researched — no Enrich evidence recorded.'], unknowns: ['All Fit criteria — nothing researched yet.'] };
    var reasons = [], unknowns = [], fail = false;
    if (o.productType && o.productType !== 'IMPORTED') { fail = true; reasons.push('productType=' + o.productType + ' — not a repeatable/importable SKU.'); }
    var disq = (o.disqualifiers || []).filter(Boolean);
    if (disq.length) { fail = true; reasons.push('Existing disqualifier(s): ' + disq.join('; ')); }
    var econ = o.economicsPotential || {};
    if (econ.freightDifficulty === 'High' && econ.damageRisk === 'High') { fail = true; reasons.push('Freight difficulty AND damage risk are both High.'); }
    else { if (!econ.freightDifficulty) unknowns.push('Freight difficulty not assessed.'); if (!econ.damageRisk) unknowns.push('Damage risk not assessed.'); }
    var pb = o.priceBand || {};
    if (typeof pb.low === 'number' && typeof pb.high === 'number') {
      if (!(pb.high >= 250 && pb.low <= 1200)) { fail = true; reasons.push('Price band does not overlap Core AOV target (NZ$250-1,200).'); }
    } else { unknowns.push('Price band not established.'); }
    if (containsAny(textBlob(o), COMMODITY_WORDS)) { fail = true; reasons.push('Evidence flags commodity/saturated/big-box-dominated.'); }
    if (containsAny(textBlob(o), INSTALL_WORDS)) unknowns.push('Installation-related language present — complexity not confirmed manageable.');
    else unknowns.push('Installation complexity not assessed.');
    unknowns.push('Variant / future-collection potential not assessed.');
    unknowns.push('Prime Piece brand fit not assessed — founder judgment call.');
    if (!reasons.length) reasons.push('No structural disqualifier found in current evidence.');
    return { result: fail ? 'FAIL' : 'PASS', reasons: reasons, unknowns: unknowns };
  }

  function isConsumerSeller(c) { return !containsAny(((c.name || '') + ' ' + (c.country || '')).toLowerCase(), SOURCING_PLATFORM_WORDS); }

  function computeDemandProofGate(o) {
    if (!hasBeenResearched(o)) return { result: UNKNOWN, confidence: 'LOW', reasons: ['Not yet researched.'], sellerDepthCount: 0, distinctMarkets: 0, transactionTier: UNKNOWN };
    var competitors = o.competitors || [];
    var consumerSellers = competitors.filter(isConsumerSeller);
    var marketSet = {};
    consumerSellers.forEach(function (c) { if (c.country) marketSet[c.country.trim()] = true; });
    var distinctMarkets = Object.keys(marketSet).length;
    var sellerDepthPass = consumerSellers.length >= 3 && distinctMarkets >= 2;
    var hasBestsellerOrRepeat = consumerSellers.some(function (c) { return c.bestsellerFlag; });
    var maxReviews = consumerSellers.reduce(function (m, c) { return Math.max(m, c.reviewCount || 0); }, 0);
    var hasReviewVolume = maxReviews >= 50;
    var trendSignals = o.trendSignals || [];
    var factOrProxy = trendSignals.filter(function (t) { return t.type === 'Fact' || t.type === 'Proxy / Signal'; });
    var transactionTier;
    if (hasBestsellerOrRepeat) transactionTier = 'STRONG (bestseller / repeat-stocking)';
    else if (hasReviewVolume) transactionTier = 'MODERATE (review volume)';
    else if (factOrProxy.length) transactionTier = 'WEAK (Fact/Proxy signal only)';
    else if (trendSignals.length) transactionTier = 'VERY WEAK (Estimate/Assumption only)';
    else transactionTier = 'NONE';
    var result, confidence;
    if (sellerDepthPass && (hasBestsellerOrRepeat || hasReviewVolume)) { result = 'PASS'; confidence = 'HIGH'; }
    else if (consumerSellers.length >= 1 && transactionTier !== 'NONE') { result = 'HOLD'; confidence = factOrProxy.length ? 'MEDIUM' : 'LOW'; }
    else { result = 'FAIL'; confidence = 'LOW'; }
    return {
      result: result, confidence: confidence, sellerDepthCount: consumerSellers.length, distinctMarkets: distinctMarkets, transactionTier: transactionTier,
      reasons: [
        'Seller depth: ' + consumerSellers.length + ' credible consumer seller(s) across ' + distinctMarkets + ' market(s) (target 3+/2+; Alibaba/manufacturer listings excluded).',
        'Transaction signal: ' + transactionTier + '.',
      ],
    };
  }

  function computePriceValidation(o) {
    var competitors = o.competitors || [];
    var prices = competitors.map(function (c) {
      if (typeof c.priceLow === 'number' && typeof c.priceHigh === 'number') return (c.priceLow + c.priceHigh) / 2;
      return typeof c.priceLow === 'number' ? c.priceLow : (typeof c.priceHigh === 'number' ? c.priceHigh : null);
    }).filter(function (p) { return p !== null; }).sort(function (a, b) { return a - b; });
    if (!prices.length) return { result: UNKNOWN, comparablesCount: 0, reasons: ['No competitor pricing recorded.'] };
    var low = prices[0], high = prices[prices.length - 1];
    var mid = Math.floor(prices.length / 2);
    var median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
    var outlier = high > median * 1.75 ? high : null;
    var result = prices.length >= 5 ? 'PASS' : (prices.length >= 2 ? 'HOLD' : UNKNOWN);
    return {
      result: result, comparablesCount: prices.length, low: low, median: median, upper: high, outlier: outlier,
      reasons: [prices.length + ' price comparable(s) (target 5+). Low ' + low + ', median ' + median + ', upper ' + high + (outlier ? '. ' + outlier + ' flagged as outlier, not typical price.' : '.')],
    };
  }

  function computeNzGap(o) {
    if (!hasBeenResearched(o)) return { classification: UNKNOWN, reasons: ['Not yet researched.'] };
    var blob = textBlob(o);
    var nzCompetitors = (o.competitors || []).filter(function (c) { return /new zealand|\bnz\b/i.test(c.country || ''); });
    if (containsAny(blob, COMMODITY_WORDS)) return { classification: 'BIG_BOX_COMMODITY', reasons: ['Evidence flags commodity/saturated/big-box competition.'] };
    if (nzCompetitors.length >= 3) return { classification: 'STRONG_COMPETITION', reasons: [nzCompetitors.length + ' NZ competitor(s) recorded.'] };
    if (nzCompetitors.length >= 1) return { classification: 'FRAGMENTED_COMPETITION', reasons: [nzCompetitors.length + ' NZ competitor(s) recorded — not clearly dominant.'] };
    return { classification: UNKNOWN, reasons: ['No NZ-specific competitor evidence. No competition ≠ automatically good — may equally mean no demand.'] };
  }

  function representativeUnitPrice(supplier) {
    var tiers = Array.isArray(supplier.pricingTiers) ? supplier.pricingTiers.filter(function (t) { return typeof (t && t.unitPrice) === 'number' && t.unitPrice > 0; }) : [];
    if (!tiers.length) return null;
    var target = 50;
    var closest = tiers.slice().sort(function (a, b) { return Math.abs((a.qty || 0) - target) - Math.abs((b.qty || 0) - target); });
    return closest[0].unitPrice;
  }

  function computeEconomicsReadiness(o, suppliers) {
    suppliers = suppliers || [];
    var credible = suppliers.filter(function (s) { return !s.evidenceGap; });
    var parsed = suppliers.filter(function (s) { return s.quoteParseStatus === 'PARSED'; });
    if (!suppliers.length) return { result: UNKNOWN, supplierCount: 0, credibleSupplierCount: 0, bestSupplier: null, reasons: ['No supplier research has been run for this opportunity yet.'] };
    if (!parsed.length) return { result: UNKNOWN, supplierCount: suppliers.length, credibleSupplierCount: credible.length, bestSupplier: null, reasons: [suppliers.length + ' supplier(s) discovered (' + credible.length + ' credible), but no real quote parsed yet.'] };
    var priced = parsed.map(function (s) { return { s: s, price: representativeUnitPrice(s) }; }).filter(function (x) { return x.price !== null; }).sort(function (a, b) { return a.price - b.price; });
    var best = priced[0];
    if (!best) return { result: UNKNOWN, supplierCount: suppliers.length, credibleSupplierCount: credible.length, bestSupplier: parsed[0] || null, reasons: ['A quote was parsed but no usable unit pricing was stated.'] };
    var unitPrice = best.price;
    var freightPerUnit = typeof best.s.freightPerUnitEstimateUSD === 'number' ? best.s.freightPerUnitEstimateUSD : null;
    var landedCost = freightPerUnit !== null ? unitPrice + freightPerUnit : null;
    var targetRetail = typeof (o.priceBand && o.priceBand.low) === 'number' ? o.priceBand.low : null;
    var landedCostPct = (landedCost !== null && targetRetail) ? Math.round((landedCost / targetRetail) * 1000) / 10 : null;
    var grossMarginPct = landedCostPct !== null ? Math.round((100 - landedCostPct) * 10) / 10 : null;
    var readinessOk = landedCostPct !== null && landedCostPct <= 30 && grossMarginPct !== null && grossMarginPct >= 60;
    return {
      result: landedCost === null ? UNKNOWN : (readinessOk ? 'READY' : 'NOT_READY'),
      supplierCount: suppliers.length, credibleSupplierCount: credible.length, bestSupplier: best.s,
      unitPrice: unitPrice, freightPerUnit: freightPerUnit, landedCost: landedCost, targetRetail: targetRetail, landedCostPct: landedCostPct, grossMarginPct: grossMarginPct,
      reasons: [landedCost === null ? 'Unit price known but no per-unit freight recorded — landed cost incomplete.' : ('Landed cost ' + landedCostPct + '% of target retail (target ≤25-30%), gross margin ' + grossMarginPct + '% (target ≥60-70%).')],
    };
  }

  function computeDownsideStressTest(econ) {
    if (econ.result === UNKNOWN || econ.landedCost == null) return { flag: UNKNOWN, reasons: ['Economics not established yet — cannot stress test.'] };
    var downsideLandedCost = Math.round(econ.landedCost * 1.2 * 100) / 100;
    var downsideMarginPct = econ.targetRetail ? Math.round((1 - downsideLandedCost / econ.targetRetail) * 1000) / 10 : null;
    var flag = downsideMarginPct === null ? UNKNOWN : (downsideMarginPct >= 50 ? 'ROBUST' : (downsideMarginPct >= 30 ? 'MARGINAL' : 'FRAGILE'));
    return { flag: flag, downsideMarginPct: downsideMarginPct, reasons: ['Base-case margin ' + econ.grossMarginPct + '%. Downside (landed cost +20%) margin ' + downsideMarginPct + '%.'] };
  }

  var MOQ_CAPITAL_EXPOSURE_CAP_USD = 2000;
  function computeSampleGate(g) {
    function state(v) { if (v === null || v === undefined) return UNKNOWN; return v ? 'MET' : 'NOT_MET'; }
    var econ = g.economics, bestSupplier = econ.bestSupplier;
    var hasParsedQuote = econ.result !== UNKNOWN || econ.landedCost != null;
    var cartonKnown = bestSupplier ? !!(bestSupplier.cartonSpec && bestSupplier.cartonSpec.size && bestSupplier.cartonSpec.weightKg && bestSupplier.packagingMethod) : null;
    var moqKnown = bestSupplier ? typeof bestSupplier.moq === 'number' : null;
    var moqSmallEnough = moqKnown && typeof econ.unitPrice === 'number' ? (bestSupplier.moq * econ.unitPrice <= MOQ_CAPITAL_EXPOSURE_CAP_USD) : null;
    var checks = [
      { id: 'demand', label: '3+ credible sellers, 2+ markets, real transaction signal', state: g.demand.result === 'PASS' ? 'MET' : (g.demand.result === UNKNOWN ? UNKNOWN : 'NOT_MET') },
      { id: 'priceValidation', label: '5+ genuine retail comparables', state: g.priceValidation.result === 'PASS' ? 'MET' : (g.priceValidation.result === UNKNOWN ? UNKNOWN : 'NOT_MET') },
      { id: 'nzOpportunity', label: 'NZ competitive gap actually understood', state: g.nzGap.classification === 'FRAGMENTED_COMPETITION' ? 'MET' : (g.nzGap.classification === UNKNOWN ? UNKNOWN : 'NOT_MET') },
      { id: 'suppliers', label: '2+ credible supplier options', state: econ.supplierCount === 0 ? UNKNOWN : state(econ.credibleSupplierCount >= 2) },
      { id: 'economics', label: 'Landed cost ≤30%, gross margin ≥60%', state: econ.result === UNKNOWN ? UNKNOWN : state(econ.result === 'READY') },
      { id: 'downside', label: 'Margin robust if landed cost ~20% worse', state: g.downside.flag === UNKNOWN ? UNKNOWN : state(g.downside.flag === 'ROBUST') },
      { id: 'logistics', label: 'Packed dimensions/weight/packaging known', state: !hasParsedQuote ? UNKNOWN : state(cartonKnown) },
      { id: 'moq', label: 'Initial order capital exposure small enough (≤US$' + MOQ_CAPITAL_EXPOSURE_CAP_USD + ')', state: !moqKnown ? UNKNOWN : state(moqSmallEnough) },
      { id: 'rightToWin', label: 'Specific, non-generic reason Prime Piece wins this', state: UNKNOWN },
      { id: 'validationPlan', label: 'Recorded plan for testing the sample', state: UNKNOWN },
    ];
    var met = checks.filter(function (c) { return c.state === 'MET'; }).length;
    var notMet = checks.filter(function (c) { return c.state === 'NOT_MET'; }).length;
    var unk = checks.filter(function (c) { return c.state === UNKNOWN; }).length;
    return { checks: checks, summary: { met: met, notMet: notMet, unknown: unk, total: checks.length } };
  }

  function computeFinalDecision(f) {
    if (f.fit.result === 'FAIL') return { decision: 'KILL', why: 'Fails Prime Piece Fit: ' + f.fit.reasons.join(' '), nextAction: 'Do not pursue further.' };
    if (f.demand.result === 'FAIL') return { decision: 'KILL', why: 'No credible demand evidence found despite research.', nextAction: 'Do not pursue further research at this time.' };
    var s = f.sampleGate.summary;
    if (s.notMet === 0 && s.unknown === 0) return { decision: 'SAMPLE', why: 'Every Sample Gate condition is met with real evidence.', nextAction: 'Bring to James for a physical sample-order decision.' };
    var missing = f.sampleGate.checks.filter(function (c) { return c.state !== 'MET'; }).map(function (c) { return c.label; });
    return { decision: 'HOLD', why: (s.notMet + s.unknown) + ' of ' + s.total + ' Sample Gate condition(s) not yet proven (' + s.met + ' met, ' + s.notMet + ' not met, ' + s.unknown + ' unknown).', nextAction: 'Missing: ' + missing.join('; ') };
  }

  function computeFunnel(o, suppliersByOpportunity) {
    var fit = computeFitGate(o);
    var demand = computeDemandProofGate(o);
    var priceValidation = computePriceValidation(o);
    var nzGap = computeNzGap(o);
    var economics = computeEconomicsReadiness(o, (suppliersByOpportunity && suppliersByOpportunity[o.id]) || []);
    var downside = computeDownsideStressTest(economics);
    var sampleGate = computeSampleGate({ demand: demand, priceValidation: priceValidation, nzGap: nzGap, economics: economics, downside: downside });
    var finalDecision = computeFinalDecision({ fit: fit, demand: demand, sampleGate: sampleGate });
    return { fit: fit, demand: demand, priceValidation: priceValidation, nzGap: nzGap, economics: economics, downside: downside, sampleGate: sampleGate, finalDecision: finalDecision };
  }

  var COLUMNS = [
    { id: '__rank', label: '#', width: 36 },
    { id: 'product', label: 'Product', sticky: 1, width: 220 },
    { id: '__toggle', label: '', sticky: 2, width: 40 },
    { id: 'variant', label: 'Variant', width: 140 },
    { id: 'category', label: 'Category', width: 130 },
    { id: 'opportunityScore', label: 'Opportunity Score', width: 90, sortKey: 'opportunityScore' },
    { id: 'confidenceScore', label: 'Confidence', width: 80, sortKey: 'confidenceScore' },
    { id: 'tier', label: 'Tier', width: 70 },
    { id: 'funnelDecision', label: 'Investment Funnel', width: 130 },
    { id: 'trendDirection', label: 'Trend', width: 90 },
    { id: 'mainMarket', label: 'Main Market', width: 90 },
    { id: 'priceBand', label: 'Price Band', width: 140 },
    { id: 'demandSignal', label: 'Demand Signal', width: 160 },
    { id: 'competition', label: 'Competition', width: 140 },
    { id: 'marketGap', label: 'Market Gap', width: 160 },
    { id: 'auPotential', label: 'AU Potential', width: 90 },
    { id: 'nzPotential', label: 'NZ Potential', width: 90 },
    { id: 'tradePotential', label: 'Trade Potential', width: 90 },
    { id: 'lastResearched', label: 'Last Researched', width: 110 },
    { id: 'changeSinceLastScan', label: 'Change Since Last Scan', width: 180 },
  ];

  var state = [];
  var filters = { tiers: {}, market: '', category: '', rising: false, highConfidence: false, isNew: false };
  var expandedIds = {};
  var sortKey = 'opportunityScore';
  var sortDir = 'desc';

  function escapeText(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function changeSinceLastScan(item) {
    var h = item.history || [];
    if (h.length < 2) return item.trendDirection === 'New opportunity' ? 'First scan' : '—';
    var prev = h[h.length - 2], cur = h[h.length - 1];
    var bits = [];
    if (prev.score !== cur.score) bits.push('score ' + prev.score + '→' + cur.score);
    if (prev.confidence !== cur.confidence) bits.push('confidence ' + prev.confidence + '→' + cur.confidence);
    if (cur.note) bits.push(cur.note);
    return bits.length ? bits.join(' · ') : 'No material change';
  }

  function headerRowHtml() {
    return COLUMNS.map(function (col) {
      var stickyClass = col.sticky === 1 ? ' sticky-col' : col.sticky === 2 ? ' sticky-col2' : '';
      var w = col.width ? ' style="min-width:' + col.width + 'px;"' : '';
      var sortedClass = col.sortKey && col.sortKey === sortKey ? ' sorted' : '';
      var arrow = col.sortKey && col.sortKey === sortKey ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';
      var sortAttr = col.sortKey ? ' data-sort="' + col.sortKey + '"' : '';
      return '<th class="' + stickyClass.trim() + sortedClass + '"' + w + sortAttr + '>' + col.label + arrow + '</th>';
    }).join('');
  }

  function priceBandText(pb) {
    if (!pb) return '—';
    var cur = pb.currency || '';
    if (pb.low == null && pb.high == null) return '—';
    return cur + (pb.low != null ? pb.low : '?') + '–' + cur + (pb.high != null ? pb.high : '?');
  }

  function demandSignalText(ds) {
    if (!ds) return '—';
    var lvl = ds.level != null ? ds.level : '';
    var type = ds.type ? ' <span class="evidence-tag-sm">' + escapeText(ds.type) + '</span>' : '';
    return escapeText(lvl) + type;
  }

  function cellText(item, col, rank) {
    if (col.id === '__rank') return rank;
    if (col.id === 'product') return '<strong>' + escapeText(item.product) + '</strong>';
    if (col.id === 'variant') return escapeText(item.variant || '—');
    if (col.id === 'category') return escapeText(item.category || '—');
    if (col.id === 'opportunityScore') return item.opportunityScore != null ? item.opportunityScore : '—';
    if (col.id === 'confidenceScore') return item.confidenceScore != null ? item.confidenceScore : '—';
    if (col.id === 'tier') return '<span class="tier-pill tier-' + item.tier + '">' + item.tier + '</span>';
    if (col.id === 'funnelDecision') {
      var fd = item.funnel && item.funnel.finalDecision ? item.funnel.finalDecision.decision : UNKNOWN;
      return '<span class="funnel-pill funnel-' + fd + '">' + fd + '</span>';
    }
    if (col.id === 'trendDirection') {
      var cls = (item.trendDirection || '').indexOf('Rising') === 0 ? 'trend-Rising' : (item.trendDirection || '').indexOf('Declining') === 0 ? 'trend-Declining' : (item.trendDirection || '').indexOf('New') === 0 ? 'trend-New' : 'trend-Stable';
      return '<span class="trend-badge ' + cls + '">' + escapeText(item.trendDirection || '—') + '</span>';
    }
    if (col.id === 'mainMarket') return escapeText(item.mainMarket || '—');
    if (col.id === 'priceBand') return priceBandText(item.priceBand);
    if (col.id === 'demandSignal') return demandSignalText(item.demandSignal);
    if (col.id === 'competition') return escapeText((item.competitors || []).length ? item.competitors.length + ' found' : '—');
    if (col.id === 'marketGap') return escapeText(item.marketGap && item.marketGap.description ? (item.marketGap.description.length > 60 ? item.marketGap.description.slice(0, 60) + '…' : item.marketGap.description) : '—');
    if (col.id === 'auPotential') return escapeText(item.auPotential || '—');
    if (col.id === 'nzPotential') return escapeText(item.nzPotential || '—');
    if (col.id === 'tradePotential') return escapeText(item.tradePotential || '—');
    if (col.id === 'lastResearched') return escapeText(item.lastResearched || '—');
    if (col.id === 'changeSinceLastScan') return escapeText(changeSinceLastScan(item));
    return '—';
  }

  function scoreCellHtml(item) {
    return '<div class="score-pair"><span class="score-num">' + (item.opportunityScore != null ? item.opportunityScore : '—') + '</span></div>';
  }

  function rowHtml(item, rank) {
    var cells = COLUMNS.map(function (col) {
      if (col.id === '__toggle') {
        var expanded = !!expandedIds[item.id];
        return '<td class="sticky-col2"><button class="expand-btn" data-toggle="' + item.id + '">' + (expanded ? '▾' : '▸') + '</button></td>';
      }
      var stickyClass = col.sticky === 1 ? ' class="sticky-col"' : '';
      if (col.id === 'opportunityScore') return '<td' + stickyClass + '>' + scoreCellHtml(item) + '</td>';
      if (col.id === 'confidenceScore') return '<td' + stickyClass + '>' + (item.confidenceScore != null ? item.confidenceScore : '—') + '</td>';
      return '<td' + stickyClass + '>' + cellText(item, col, rank) + '</td>';
    }).join('');
    var tierClass = ' tier-' + item.tier;
    var mainRow = '<tr class="' + tierClass + '">' + cells + '</tr>';
    var detailRow = expandedIds[item.id] ? detailRowHtml(item) : '';
    return mainRow + detailRow;
  }

  function evidenceList(arr, formatter) {
    if (!arr || !arr.length) return '<span class="source-unavailable">Not found</span>';
    return '<ul>' + arr.map(function (x) { return '<li>' + formatter(x) + '</li>'; }).join('') + '</ul>';
  }

  function detailRowHtml(item) {
    var sb = item.scoreBreakdown || {};
    var dims = [
      ['demandEvidence', 'Demand evidence (20%)'], ['contributionProfit', 'Contribution profit (15%)'],
      ['aovCac', 'AOV / paid-CAC (10%)'], ['differentiation', 'Differentiation (10%)'],
      ['adContent', 'Ad/content potential (10%)'], ['auScale', 'AU scalability (10%)'],
      ['designerTrade', 'Designer/trade (10%)'], ['sourcing', 'Sourcing (5%)'],
      ['operationalRisk', 'Operational risk (5%)'], ['crossSell', 'Cross-sell (5%)']
    ];
    var breakdownHtml = dims.map(function (d) {
      var entry = sb[d[0]];
      var val = entry && typeof entry.score === 'number' ? entry.score : null;
      var bar = val == null ? '<span class="source-unavailable">not scored</span>' :
        '<div class="breakdown-track"><div class="breakdown-fill" style="width:' + val + '%;"></div></div><span class="breakdown-val">' + val + '</span>';
      return '<div class="breakdown-bar-row"><span class="breakdown-label">' + d[1] + '</span>' + bar + '</div>' +
        (entry && entry.why ? '<div style="font-size:10.5px;color:var(--muted);margin:-2px 0 6px 138px;">' + escapeText(entry.why) + '</div>' : '');
    }).join('');

    var competitorsHtml = evidenceList(item.competitors, function (c) {
      return '<div class="competitor-row"><span>' + escapeText(c.name) + (c.country ? ' (' + escapeText(c.country) + ')' : '') + (c.bestsellerFlag ? ' <span class="evidence-tag-sm">bestseller signal</span>' : '') + '</span><span>' + (c.priceLow != null ? escapeText(c.priceLow) + (c.priceHigh != null ? '–' + escapeText(c.priceHigh) : '') : '') + (c.reviewCount ? ' · ' + escapeText(c.reviewCount) + ' reviews' + (c.reviewRating ? ' (' + escapeText(c.reviewRating) + '★)' : '') : '') + '</span></div>';
    });

    var trendHtml = evidenceList(item.trendSignals, function (t) {
      if (t.sourceUnavailable) return escapeText(t.signal || t.source) + ' — <span class="source-unavailable">SOURCE UNAVAILABLE</span>';
      return escapeText(t.signal) + (t.type ? ' <span class="evidence-tag-sm">' + escapeText(t.type) + '</span>' : '') + (t.source ? ' — ' + escapeText(t.source) : '');
    });

    var reviews = item.reviews || {};
    var designerHtml = evidenceList(item.designerTradeSignals, function (s) { return escapeText(s); });
    var risksHtml = evidenceList(item.operatingRisks, function (s) { return escapeText(s); });
    var sourcesHtml = (item.sources || []).length
      ? item.sources.map(function (s) { return '<a class="source-link" href="' + escapeText(s.url) + '" target="_blank" rel="noopener">' + escapeText(s.title || s.url) + '</a>'; }).join('')
      : '<span class="source-unavailable">No sources recorded</span>';

    var historyHtml = (item.history || []).length
      ? '<ul>' + item.history.slice().reverse().map(function (h) {
          return '<li>' + escapeText(h.scanDate) + ' — score ' + (h.score != null ? h.score : '—') + ', confidence ' + (h.confidence != null ? h.confidence : '—') + (h.note ? ' — ' + escapeText(h.note) : '') + '</li>';
        }).join('') + '</ul>'
      : '<span class="source-unavailable">No scan history yet</span>';

    var econ = item.economicsPotential || {};
    var econHtml = '<div class="detail-section-body">' +
      (econ.retailPriceRangeEstimate ? '<div><strong>Retail price range:</strong> ' + escapeText(econ.retailPriceRangeEstimate) + '</div>' : '') +
      (econ.aovBand ? '<div><strong>AOV band:</strong> ' + escapeText(econ.aovBand) + '</div>' : '') +
      (econ.paidAcquisitionSuitability ? '<div><strong>Paid acquisition suitability:</strong> ' + escapeText(econ.paidAcquisitionSuitability) + '</div>' : '') +
      (econ.grossMarginPotentialCategory ? '<div><strong>Gross margin potential:</strong> ' + escapeText(econ.grossMarginPotentialCategory) + '</div>' : '') +
      (econ.freightDifficulty ? '<div><strong>Freight difficulty:</strong> ' + escapeText(econ.freightDifficulty) + '</div>' : '') +
      (econ.damageRisk ? '<div><strong>Damage risk:</strong> ' + escapeText(econ.damageRisk) + '</div>' : '') +
      (econ.crossSellPotential ? '<div><strong>Cross-sell potential:</strong> ' + escapeText(econ.crossSellPotential) + '</div>' : '') +
      '<div class="source-unavailable" style="margin-top:6px;">All figures are estimates until real supplier quotes exist — never treated as confirmed economics.</div></div>';

    var funnel = item.funnel;
    var funnelHtml = '';
    if (funnel) {
      var fd = funnel.finalDecision;
      var gateRow = function (label, value, tag) {
        return '<div class="funnel-gate-row"><span class="funnel-gate-label">' + label + '</span><span>' + escapeText(value) + (tag ? ' <span class="evidence-tag-sm">' + escapeText(tag) + '</span>' : '') + '</span></div>';
      };
      funnelHtml =
        '<div class="detail-section" style="grid-column:1/-1;"><div class="detail-section-title">Commercial Funnel — Investment Readiness</div><div class="detail-section-body">' +
        '<div style="margin-bottom:8px;"><span class="funnel-pill funnel-' + fd.decision + '">' + fd.decision + '</span> — ' + escapeText(fd.why) + '</div>' +
        gateRow('Prime Piece Fit', funnel.fit.result) +
        gateRow('Demand Proof', funnel.demand.result, funnel.demand.confidence) +
        gateRow('Price Validation', funnel.priceValidation.result, funnel.priceValidation.comparablesCount + ' comparable(s)') +
        gateRow('NZ Competitive Gap', funnel.nzGap.classification) +
        gateRow('Economics Readiness', funnel.economics.result) +
        gateRow('Downside Stress Test', funnel.downside.flag) +
        gateRow('Sample Gate', funnel.sampleGate.summary.met + ' met / ' + funnel.sampleGate.summary.notMet + ' not met / ' + funnel.sampleGate.summary.unknown + ' unknown (of ' + funnel.sampleGate.summary.total + ')') +
        '<div style="margin-top:6px;"><strong>Next action:</strong> ' + escapeText(fd.nextAction) + '</div>' +
        '<div class="funnel-caveat">This is an attention-ranking based on available evidence, not a guarantee this product will sell. UNKNOWN means not yet proven — never treated as a pass or fail. A high Opportunity Score alone cannot pass this funnel.</div>' +
        '</div></div>';
    }

    var promoteSection = item.promotedToProductLab
      ? '<div class="promoted-note">✓ Promoted to Product Lab</div>'
      : '<button class="btn btn--teal btn--small promote-btn" data-promote="' + item.id + '">Promote to Product Lab</button>';

    var colspan = COLUMNS.length;
    return '<tr class="detail-row" data-detail-row="' + item.id + '"><td colspan="' + colspan + '">' +
      '<div class="detail-panel">' +
      '<div class="detail-head"><div class="detail-title">' + escapeText(item.product) + (item.variant ? ' — ' + escapeText(item.variant) : '') + '</div><span class="next-action-pill">' + escapeText(item.recommendedNextAction || 'MONITOR') + '</span></div>' +
      '<div class="detail-sub">First seen ' + escapeText(item.firstSeen || '—') + ' · Last researched ' + escapeText(item.lastResearched || '—') + ' · Markets: ' + escapeText(item.mainMarket || '—') + '</div>' +
      '<div class="detail-grid">' +
        '<div class="detail-section"><div class="detail-section-title">Why it matters</div><div class="detail-section-body">' + escapeText(item.marketGap && item.marketGap.description || 'Not yet summarised.') + '</div></div>' +
        '<div class="detail-section"><div class="detail-section-title">Market gap</div><div class="detail-section-body">' + escapeText(item.marketGap && item.marketGap.description || 'Not found') + (item.marketGap && item.marketGap.gapScore != null ? ' <span class="evidence-tag-sm">gap score ' + item.marketGap.gapScore + '</span>' : '') + '</div></div>' +
        '<div class="detail-section"><div class="detail-section-title">Competitors</div><div class="detail-section-body">' + competitorsHtml + '</div></div>' +
        '<div class="detail-section"><div class="detail-section-title">Pricing</div><div class="detail-section-body">' + priceBandText(item.priceBand) + (item.priceBand && item.priceBand.premiumCeiling ? ' · premium ceiling ' + escapeText(item.priceBand.premiumCeiling) : '') + '</div></div>' +
        '<div class="detail-section"><div class="detail-section-title">Reviews</div><div class="detail-section-body">' +
          '<div><strong>Positive themes:</strong> ' + (reviews.positiveThemes && reviews.positiveThemes.length ? escapeText(reviews.positiveThemes.join(', ')) : '<span class="source-unavailable">Not found</span>') + '</div>' +
          '<div><strong>Complaints:</strong> ' + (reviews.complaints && reviews.complaints.length ? escapeText(reviews.complaints.join(', ')) : '<span class="source-unavailable">Not found</span>') + '</div>' +
          '<div><strong>Purchase motivations:</strong> ' + (reviews.purchaseMotivations && reviews.purchaseMotivations.length ? escapeText(reviews.purchaseMotivations.join(', ')) : '<span class="source-unavailable">Not found</span>') + '</div>' +
        '</div></div>' +
        '<div class="detail-section"><div class="detail-section-title">Trend signals</div><div class="detail-section-body">' + trendHtml + '</div></div>' +
        '<div class="detail-section"><div class="detail-section-title">Designer / trade signals</div><div class="detail-section-body">' + designerHtml + '</div></div>' +
        '<div class="detail-section"><div class="detail-section-title">Economics potential (estimates)</div>' + econHtml + '</div>' +
        '<div class="detail-section"><div class="detail-section-title">Operating risks</div><div class="detail-section-body">' + risksHtml + '</div></div>' +
        '<div class="detail-section"><div class="detail-section-title">Confidence — ' + (item.confidenceScore != null ? item.confidenceScore : '—') + '/100</div><div class="detail-section-body">Based on independent source count and Fact/Proxy vs Estimate/Assumption mix. See Sources below.</div></div>' +
        '<div class="detail-section"><div class="detail-section-title">Sources</div><div class="detail-section-body">' + sourcesHtml + '</div></div>' +
        '<div class="detail-section" style="grid-column:1/-1;"><div class="detail-section-title">Opportunity score breakdown</div><div class="detail-section-body">' + breakdownHtml + '</div></div>' +
        '<div class="detail-section" style="grid-column:1/-1;"><div class="detail-section-title">Research history</div><div class="detail-section-body">' + historyHtml + '</div></div>' +
        funnelHtml +
      '</div>' +
      promoteSection +
      '</div></td></tr>';
  }

  function applyFilters(rows) {
    var activeTiers = Object.keys(filters.tiers).filter(function (t) { return filters.tiers[t]; });
    return rows.filter(function (item) {
      if (activeTiers.length && activeTiers.indexOf(item.tier) === -1) return false;
      if (filters.market && item.mainMarket !== filters.market) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.rising && (item.trendDirection || '').indexOf('Rising') !== 0) return false;
      if (filters.highConfidence && !(item.confidenceScore >= 70)) return false;
      if (filters.isNew && (item.trendDirection || '').indexOf('New') !== 0) return false;
      return true;
    });
  }

  function sortedRows(rows) {
    var copy = rows.slice();
    copy.sort(function (a, b) {
      var av = a[sortKey], bv = b[sortKey];
      var aEmpty = av === null || av === undefined;
      var bEmpty = bv === null || bv === undefined;
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return copy;
  }

  function populateFilterOptions() {
    var markets = {}, categories = {};
    state.forEach(function (i) { if (i.mainMarket) markets[i.mainMarket] = true; if (i.category) categories[i.category] = true; });
    var marketSel = document.getElementById('marketFilter');
    var catSel = document.getElementById('categoryFilter');
    Object.keys(markets).sort().forEach(function (m) {
      var o = document.createElement('option'); o.value = m; o.textContent = m; marketSel.appendChild(o);
    });
    Object.keys(categories).sort().forEach(function (c) {
      var o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o);
    });
  }

  function render() {
    document.getElementById('headerRow').innerHTML = headerRowHtml();
    var filtered = sortedRows(applyFilters(state));
    var body = document.getElementById('tableBody');
    var empty = document.getElementById('emptyState');
    var wrap = document.getElementById('radarTable');

    document.getElementById('rowCount').textContent = filtered.length + ' of ' + state.length + ' opportunities';

    if (!filtered.length) {
      wrap.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    wrap.style.display = '';
    empty.style.display = 'none';
    body.innerHTML = filtered.map(function (item, i) { return rowHtml(item, i + 1); }).join('');
  }

  document.querySelectorAll('.filter-chip[data-tier]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var t = chip.getAttribute('data-tier');
      filters.tiers[t] = !filters.tiers[t];
      chip.classList.toggle('active', !!filters.tiers[t]);
      render();
    });
  });
  document.querySelectorAll('.filter-chip[data-toggle]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var key = chip.getAttribute('data-toggle');
      filters[key] = !filters[key];
      chip.classList.toggle('active', !!filters[key]);
      render();
    });
  });
  document.getElementById('marketFilter').addEventListener('change', function (e) { filters.market = e.target.value; render(); });
  document.getElementById('categoryFilter').addEventListener('change', function (e) { filters.category = e.target.value; render(); });

  document.getElementById('tableBody').addEventListener('click', function (e) {
    var toggleId = e.target.getAttribute('data-toggle');
    if (toggleId) {
      if (expandedIds[toggleId]) delete expandedIds[toggleId]; else expandedIds[toggleId] = true;
      render();
      return;
    }
    var promoteId = e.target.getAttribute('data-promote');
    if (promoteId) {
      var item = state.filter(function (i) { return i.id === promoteId; })[0];
      var label = item ? item.product : 'this opportunity';
      if (!confirm('Promote "' + label + '" to Product Lab? This adds it as a new Idea-stage product.')) return;
      e.target.disabled = true;
      e.target.textContent = 'Promoting…';
      fetch('/api/scale-os/radar-promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promoteId }),
      }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.data.error || 'Promote failed');
          if (item) item.promotedToProductLab = true;
          render();
        })
        .catch(function (err) {
          alert('Could not promote: ' + err.message);
          e.target.disabled = false;
          e.target.textContent = 'Promote to Product Lab';
        });
    }
  });

  document.getElementById('headerRow').addEventListener('click', function (e) {
    var key = e.target.getAttribute('data-sort');
    if (!key) return;
    if (sortKey === key) { sortDir = sortDir === 'desc' ? 'asc' : 'desc'; } else { sortKey = key; sortDir = 'desc'; }
    render();
  });

  fetch('/api/scale-os/radar-data').then(function (res) {
    if (res.status === 401) {
      window.location.href = '/scale-os/login?next=' + encodeURIComponent(window.location.pathname);
      return Promise.reject(new Error('not authenticated'));
    }
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.error || ('Failed to load (status ' + res.status + ')'));
      return { opportunities: data.opportunities || [], suppliers: data.suppliers || [] };
    });
  }).then(function (data) {
    var suppliersByOpportunity = {};
    data.suppliers.forEach(function (s) {
      if (!s.opportunityId) return;
      (suppliersByOpportunity[s.opportunityId] = suppliersByOpportunity[s.opportunityId] || []).push(s);
    });
    state = data.opportunities;
    state.forEach(function (o) { o.funnel = computeFunnel(o, suppliersByOpportunity); });
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('radarContent').style.display = 'block';
    populateFilterOptions();
    render();
  }).catch(function (err) {
    document.getElementById('loadingState').style.display = 'none';
    var errEl = document.getElementById('loadErrorState');
    errEl.textContent = 'Could not load Market Radar — ' + err.message;
    errEl.style.display = 'block';
  });
})();
</script>
`;
