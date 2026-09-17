// Dashboard: Prime Piece Pulse's command centre. Market Intelligence / Product
// Pipeline is one function of this page, not a separate system — it reads the same
// Product Lab and Market Radar data those two pages already own (via their existing
// /api/scale-os/products and /api/scale-os/radar-data endpoints), plus the daily
// Pulse brief written by the scheduled Market Radar worker (scripts/market-radar/
// run.mjs, 'daily' mode) into a new Redis key read through that same radar-data
// endpoint. Everything here is either aggregated client-side from existing data or
// read as an already-generated brief — this page never calls Claude itself, so
// opening it is always instant and never costs an API call. No new API route, no
// new serverless function.
//
// Meant to answer, within 60 seconds of opening it:
//   1. What is making money now?        -> Current Money Maker (priorityLane = Active)
//   2. What's happening globally?       -> Top 5 Global Opportunities, Biggest Movers
//   3. What's beginning to trend?       -> Biggest Movers, Today's Pulse
//   4. What's genuinely relevant to us? -> Next Product Candidate
//   5. What deserves the next $1,000?   -> Next $1,000 (from the daily Pulse brief)
//   6. What should I ignore?            -> Kill List + Maintain (steady-state) list
//   7. What are today's 3 actions?      -> Today's 3 Moves (from the daily Pulse brief)

export const DASHBOARD_STYLE = `
  .warn-banner {
    border: 1px solid #E3B48A; border-left: 3px solid var(--red); background: #FBF1EA;
    border-radius: 6px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;
  }
  .warn-banner strong { color: var(--red); }
  .section { margin-bottom: 28px; }
  .section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .section-title { font-size: 15px; font-weight: 700; letter-spacing: -0.01em; }
  .section-q { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--teal-dark); font-weight: 700; }
  .section-link { font-size: 12px; color: var(--teal-dark); text-decoration: underline; white-space: nowrap; }
  .money-card { background: var(--white); border: 1px solid var(--line); border-left: 3px solid var(--teal); border-radius: 6px; padding: 18px 20px; margin-bottom: 12px; }
  .money-card:last-child { margin-bottom: 0; }
  .money-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
  .money-name { font-size: 15px; font-weight: 700; }
  .money-meta { font-size: 11.5px; color: var(--muted); margin-bottom: 14px; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px 16px; margin-bottom: 12px; }
  .stat-tile { background: var(--paper); border: 1px solid var(--line); border-radius: 5px; padding: 8px 10px; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 3px; }
  .stat-val { font-size: 15px; font-weight: 700; }
  .stat-val.dim { color: var(--muted); font-weight: 500; font-style: italic; font-size: 12.5px; }
  .next-action-box { background: #F4F2EC; border-radius: 5px; padding: 10px 12px; font-size: 12.5px; line-height: 1.5; }
  .next-action-box .k { font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; color: var(--teal-dark); margin-right: 6px; }
  .empty-note { color: var(--muted); font-size: 13px; padding: 14px 0; }
  .mini-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 6px; background: var(--white); }
  table.mini { border-collapse: collapse; width: 100%; font-size: 12.5px; min-width: 640px; }
  table.mini th, table.mini td { border-bottom: 1px solid var(--line); padding: 8px 10px; text-align: left; white-space: nowrap; }
  table.mini thead th { background: #F4F2EC; font-size: 10.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
  table.mini tbody tr:last-child td { border-bottom: none; }
  table.mini tbody tr:hover td { background: #FBFAF7; }
  .badge { display: inline-block; font-size: 10.5px; font-weight: 700; padding: 2px 9px; border-radius: 20px; white-space: nowrap; }
  .badge-tier-HALO { background: #EFE6D8; color: #8A6A2A; }
  .badge-tier-CORE { background: #DCEAE0; color: #2E7D4F; }
  .badge-tier-ENTRY { background: #E3ECEC; color: #4E7376; }
  .badge-stage { background: #EEECE6; color: #666; }
  .badge-ok { background: #DCEAE0; color: #2E7D4F; }
  .badge-warn { background: #F1E4DF; color: #A05B44; }
  .kill-list { display: flex; flex-direction: column; gap: 8px; }
  .kill-row { border: 1px solid var(--line); border-radius: 5px; padding: 8px 12px; font-size: 12.5px; background: var(--white); }
  .kill-row .kn { font-weight: 700; }
  .kill-row .kr { color: var(--muted); margin-top: 2px; }
  .maintain-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .maintain-chip { font-size: 12px; padding: 6px 12px; border-radius: 20px; background: #F4F2EC; border: 1px solid var(--line); }
  .signal-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid #EFEDE7; font-size: 12.5px; }
  .signal-row:last-child { border-bottom: none; }
  .signal-name { font-weight: 600; }
  .signal-meta { color: var(--muted); font-size: 11.5px; }
  .freshness-line { font-size: 11.5px; color: var(--muted); margin-bottom: 14px; }
  .pulse-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
  .pulse-list li { font-size: 13.5px; line-height: 1.5; padding-left: 18px; position: relative; }
  .pulse-list li::before { content: "—"; position: absolute; left: 0; color: var(--teal-dark); }
  .moves-list { list-style: none; margin: 0; padding: 0; counter-reset: move; display: flex; flex-direction: column; gap: 10px; }
  .moves-list li { font-size: 13.5px; line-height: 1.5; padding-left: 26px; position: relative; counter-increment: move; }
  .moves-list li::before { content: counter(move); position: absolute; left: 0; top: -1px; width: 18px; height: 18px; border-radius: 50%; background: var(--black); color: var(--white); font-size: 10.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .missing-data-note { margin-top: 10px; font-size: 11.5px; color: #A05B44; }
  .mover-up { color: #2E7D4F; font-weight: 700; }
  .mover-down { color: var(--red); font-weight: 700; }
  .funnel-pill { display: inline-block; font-size: 10.5px; font-weight: 700; padding: 2px 9px; border-radius: 20px; white-space: nowrap; }
  .funnel-SAMPLE { background: #DCEAE0; color: #2E7D4F; }
  .funnel-HOLD { background: #E9E2CC; color: #8A6A2A; }
  .funnel-KILL { background: #F1E4DF; color: #A05B44; }
  .funnel-UNKNOWN { background: #EEECE6; color: #8A8577; }
  .funnel-EXISTING_OPTIMISE { background: #E3ECEC; color: #4E7376; }
  .funnel-caveat { font-size: 11px; color: #B69B6B; font-style: italic; margin-top: 10px; }
`;

export const DASHBOARD_BODY = `
  <h1>Prime Piece Pulse</h1>
  <p class="page-sub">What's making money, what's happening globally, what deserves capital, and what to do today — in 60 seconds.</p>

  <div id="loadingState" class="empty-note">Loading…</div>
  <div id="loadErrorState" class="empty-note" style="display:none;"></div>

  <div id="dashContent" style="display:none;">
    <div id="freshnessLine" class="freshness-line"></div>
    <div id="staleWarning" class="warn-banner" style="display:none;"></div>
    <div id="coreWarning" class="warn-banner" style="display:none;"></div>

    <div class="section">
      <div class="section-head"><div class="section-title">Today's Pulse</div></div>
      <div id="pulseBody"></div>
    </div>

    <div class="section">
      <div class="section-head"><div><div class="section-q">What is making money now?</div><div class="section-title">Current Money Maker</div></div></div>
      <div id="moneyMakerBody"></div>
    </div>

    <div class="section">
      <div class="section-head"><div><div class="section-q">What deserves the next $1,000?</div><div class="section-title">Next Product Candidate</div></div></div>
      <div id="nextCandidateBody"></div>
      <div id="nextThousandBody"></div>
    </div>

    <div class="section">
      <div class="section-head"><div class="section-title">Today's 3 Moves</div></div>
      <div id="movesBody"></div>
    </div>

    <div class="section">
      <div class="section-head"><div><div class="section-q">What deserves capital, not just attention?</div><div class="section-title">Commercial Funnel — Investment Readiness</div></div><a class="section-link" href="/scale-os/radar">Open Market Radar →</a></div>
      <div id="funnelBody"></div>
    </div>

    <div class="section">
      <div class="section-head"><div class="section-title">Top 5 Global Opportunities</div><a class="section-link" href="/scale-os/radar">Open Market Radar →</a></div>
      <div id="topGlobalBody"></div>
    </div>

    <div class="section">
      <div class="section-head"><div class="section-title">Biggest Movers</div></div>
      <div id="moversBody"></div>
    </div>

    <div class="section">
      <div class="section-head"><div><div class="section-q">What should I ignore?</div><div class="section-title">Kill List &amp; Maintain</div></div></div>
      <div id="ignoreBody"></div>
    </div>

    <div class="section">
      <div class="section-head"><div class="section-title">Product Pipeline</div><a class="section-link" href="/scale-os/product-lab">Open Product Lab →</a></div>
      <div id="pipelineBody"></div>
    </div>

    <div class="section">
      <div class="section-head"><div class="section-title">Unit Economics</div></div>
      <div id="economicsBody"></div>
    </div>

    <div class="section">
      <div class="section-head"><div class="section-title">Validation Results</div></div>
      <div id="validationBody"></div>
    </div>
  </div>
`;

export const DASHBOARD_SCRIPT = `
<script>
(function () {
  // --- Shared calc, deliberately duplicated from Product Lab's own inline script
  // rather than imported from a shared module — this codebase has no client-side
  // module loading, and every Scale OS page is a self-contained template. Keeping the
  // same formulas here means the Dashboard's numbers always agree with Product Lab's.
  function num(v) {
    if (v === '' || v === null || v === undefined) return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
  }
  function money(v) {
    if (v === null || v === undefined) return '—';
    return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  function pct(v) {
    if (v === null || v === undefined) return '—';
    return v.toFixed(1) + '%';
  }
  function escapeText(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function unitEconomicsBand(marginPct) {
    if (marginPct === null || marginPct === undefined) return null;
    if (marginPct < 0) return 1;
    if (marginPct < 15) return 2;
    if (marginPct < 30) return 3;
    if (marginPct < 45) return 4;
    return 5;
  }

  function economics(row) {
    var supplierCost = num(row.supplierCost), freightCost = num(row.freightCost), sellingPrice = num(row.sellingPrice);
    var packagingCost = num(row.packagingCost), fulfilmentFreightCost = num(row.fulfilmentFreightCost);
    var paymentFeesCost = num(row.paymentFeesCost), damageReturnsAllowance = num(row.damageReturnsAllowance);

    var totalLandedCost = (supplierCost !== null || freightCost !== null) ? (supplierCost || 0) + (freightCost || 0) : null;
    var grossProfit = (sellingPrice !== null && totalLandedCost !== null) ? sellingPrice - totalLandedCost : null;
    var grossMarginPct = (grossProfit !== null && sellingPrice) ? (grossProfit / sellingPrice) * 100 : null;
    var landedCostPctOfRetail = (totalLandedCost !== null && sellingPrice) ? (totalLandedCost / sellingPrice) * 100 : null;

    var inputs = [sellingPrice, supplierCost, freightCost, packagingCost, fulfilmentFreightCost, paymentFeesCost, damageReturnsAllowance];
    var complete = inputs.every(function (v) { return v !== null; });
    var contributionProfit = complete
      ? sellingPrice - supplierCost - freightCost - packagingCost - fulfilmentFreightCost - paymentFeesCost - damageReturnsAllowance
      : null;
    var contributionMarginPct = (contributionProfit !== null && sellingPrice) ? (contributionProfit / sellingPrice) * 100 : null;

    return { totalLandedCost: totalLandedCost, grossProfit: grossProfit, grossMarginPct: grossMarginPct, sellingPrice: sellingPrice, landedCostPctOfRetail: landedCostPctOfRetail, contributionProfit: contributionProfit, contributionMarginPct: contributionMarginPct };
  }

  // Mirrors Product Lab's 8-area Prime Opportunity Score so ranking here matches
  // ranking there exactly. See product-lab.js legend for what each area means.
  var SCORE_AREAS = [
    { invert: false, getValue: function (row, econ) { return unitEconomicsBand(econ.contributionMarginPct); } },
    { invert: false, getValue: function (row) { return num(row.me_apparentMarketDemand); } },
    { invert: false, getValue: function (row) { return num(row.differentiation); } },
    { invert: false, getValue: function (row) { return num(row.contentPotential); } },
    { invert: true, getValue: function (row) { return num(row.freightRisk); } },
    { invert: true, getValue: function (row) { return num(row.damageRisk); } },
    { invert: false, getValue: function (row) { return num(row.tradePotential); } },
    { invert: true, getValue: function (row) { return num(row.competition); } },
  ];
  function primeScore(row, econ) {
    var scoredCount = 0, sum = 0;
    SCORE_AREAS.forEach(function (a) {
      var v = a.getValue(row, econ);
      if (v === null) return;
      scoredCount++;
      sum += a.invert ? ((6 - v) / 5) * 100 : (v / 5) * 100;
    });
    return scoredCount ? Math.round(sum / scoredCount) : null;
  }

  function cac(row) {
    var spend = num(row.perf_adSpend);
    if (spend === null) return null;
    var units = num(row.perf_unitsSold);
    if (units) return spend / units;
    var leads = num(row.perf_preordersOrEnquiries);
    if (leads) return spend / leads;
    return null;
  }

  function realizedProfit(row, econ) {
    var units = num(row.perf_unitsSold);
    if (!units) return { value: null, basis: '' };
    if (econ.contributionProfit !== null) return { value: econ.contributionProfit * units, basis: 'contribution' };
    if (econ.grossProfit !== null) return { value: econ.grossProfit * units, basis: 'gross' };
    return { value: null, basis: '' };
  }

  // Prime Piece Pulse's central question is what to import next — a BESPOKE_LOCAL
  // item (or one with unclassified productType, OTHER) must never distort product
  // discovery, Next $1,000, or ranking. Only IMPORTED items are eligible here.
  function isImportEligible(item) {
    return item.productType === 'IMPORTED';
  }

  // --- Commercial Funnel / Investment Readiness ----------------------------------
  // Mirrors scripts/market-radar/scoring.mjs (same duplicated-per-page convention
  // as the rest of this file). Read-only summary: never triggers supplier research
  // or sample spend. opportunityScore is never used to decide SAMPLE/HOLD/KILL here.
  var FUNNEL_UNKNOWN = 'UNKNOWN';
  var FUNNEL_SOURCING_WORDS = ['alibaba', 'made-in-china', 'global sources', 'manufacturer', 'wholesale supplier', 'trade directory', 'factory direct'];
  var FUNNEL_COMMODITY_WORDS = ['commodity', 'saturated', 'big-box', 'big box', 'generic', 'race-to-the-bottom', 'race to the bottom'];
  var FUNNEL_NOT_GENUINE_STONE_WORDS = ['not real stone', 'marble-look', 'stone-look', 'faux marble', 'faux stone', 'printed canvas', 'graphic panel', 'mdf', 'engineered look'];
  var FUNNEL_PHYSICAL_RISK_WORDS = ['pallet', 'built to measure', 'trade/tile product', 'not a retail ecommerce sku', 'wall-anchoring', 'oversized', 'freight class', 'requires professional installation', 'installation', 'professional install', 'plumber', 'tradesperson required', 'built-in', 'permanent fixture'];
  var FUNNEL_EXISTING_PORTFOLIO_SIGNAL_WORDS = ['overlaps heavily with', "prime piece's existing", 'overlaps existing', 'not a new product', 'repositioning play', 'already sell', 'already part of the range'];
  var FUNNEL_DECLARED_EXISTING_CATEGORIES = ['cheese board', 'cheese/serving board', 'serving board', 'chopping board', 'serving platter'];
  function funnelHasResearch(o) { return !!(o.scoreBreakdown || (o.sources && o.sources.length) || o.demandSignal); }
  function funnelTextBlob(o) { return [].concat(o.disqualifiers || [], o.operatingRisks || [], [(o.marketGap && o.marketGap.description) || '']).join(' . ').toLowerCase(); }
  function funnelExtendedTextBlob(o) { return (funnelTextBlob(o) + ' . ' + (o.product || '') + ' ' + (o.variant || '') + ' ' + (o.category || '')).toLowerCase(); }
  function funnelContainsAny(text, words) { return words.some(function (w) { return text.indexOf(w) !== -1; }); }

  function funnelFit(o) {
    if (!funnelHasResearch(o)) return { result: FUNNEL_UNKNOWN };
    var fail = false;
    if (o.productType && o.productType !== 'IMPORTED') fail = true;
    if ((o.disqualifiers || []).filter(Boolean).length) fail = true;
    var econ = o.economicsPotential || {};
    if (econ.freightDifficulty === 'High' || econ.damageRisk === 'High' || econ.packagingDifficulty === 'High') fail = true;
    if (funnelContainsAny(funnelExtendedTextBlob(o), FUNNEL_PHYSICAL_RISK_WORDS)) fail = true;
    if (funnelContainsAny(funnelExtendedTextBlob(o), FUNNEL_NOT_GENUINE_STONE_WORDS)) fail = true;
    var pb = o.priceBand || {};
    if (typeof pb.low === 'number' && typeof pb.high === 'number') {
      var overlapsEntry = pb.high >= 99 && pb.low <= 299;
      var overlapsCore = pb.high >= 299 && pb.low <= 1200;
      if (!overlapsEntry && !overlapsCore) fail = true;
    }
    if (funnelContainsAny(funnelTextBlob(o), FUNNEL_COMMODITY_WORDS)) fail = true;
    return { result: fail ? 'FAIL' : 'PASS' };
  }

  // Portfolio check (Portfolio + Logistics Sanity Gate, check 1) — see
  // scoring.mjs's computePortfolioCheck for the full rationale.
  function funnelPortfolio(o) {
    var productText = ((o.product || '') + ' ' + (o.variant || '') + ' ' + (o.category || '')).toLowerCase();
    var declaredMatch = FUNNEL_DECLARED_EXISTING_CATEGORIES.filter(function (k) { return productText.indexOf(k) !== -1; })[0];
    if (declaredMatch) return { classification: 'EXISTING_OPTIMISE', reasons: ['Matches a declared existing Prime Piece category ("' + declaredMatch + '").'] };
    var evidenceMatch = FUNNEL_EXISTING_PORTFOLIO_SIGNAL_WORDS.filter(function (w) { return funnelTextBlob(o).indexOf(w) !== -1; })[0];
    if (evidenceMatch) return { classification: 'EXISTING_OPTIMISE', reasons: ['Evidence explicitly states an overlap with Prime Piece\\'s existing range ("' + evidenceMatch + '").'] };
    return { classification: 'NEW', reasons: [] };
  }

  function funnelIsConsumerSeller(c) { return !funnelContainsAny(((c.name || '') + ' ' + (c.country || '')).toLowerCase(), FUNNEL_SOURCING_WORDS); }

  function funnelDemand(o) {
    if (!funnelHasResearch(o)) return { result: FUNNEL_UNKNOWN };
    var competitors = o.competitors || [];
    // Missing competitor evidence means "not yet researched," not "proven no
    // demand" — see scoring.mjs's computeDemandProofGate for the full rationale.
    if (!competitors.length) return { result: FUNNEL_UNKNOWN };
    var consumerSellers = competitors.filter(funnelIsConsumerSeller);
    var marketSet = {};
    consumerSellers.forEach(function (c) { if (c.country) marketSet[c.country.trim()] = true; });
    var distinctMarkets = Object.keys(marketSet).length;
    var sellerDepthPass = consumerSellers.length >= 3 && distinctMarkets >= 2;
    var hasBestsellerOrRepeat = consumerSellers.some(function (c) { return c.bestsellerFlag; });
    var hasReviewVolume = consumerSellers.reduce(function (m, c) { return Math.max(m, c.reviewCount || 0); }, 0) >= 50;
    var transactionNotNone = hasBestsellerOrRepeat || hasReviewVolume || (o.trendSignals || []).length > 0;
    if (sellerDepthPass && (hasBestsellerOrRepeat || hasReviewVolume)) return { result: 'PASS' };
    if (consumerSellers.length >= 1 && transactionNotNone) return { result: 'HOLD' };
    return { result: 'FAIL' };
  }

  function funnelRepresentativeUnitPrice(supplier) {
    var tiers = Array.isArray(supplier.pricingTiers) ? supplier.pricingTiers.filter(function (t) { return typeof (t && t.unitPrice) === 'number' && t.unitPrice > 0; }) : [];
    if (!tiers.length) return null;
    var closest = tiers.slice().sort(function (a, b) { return Math.abs((a.qty || 0) - 50) - Math.abs((b.qty || 0) - 50); });
    return closest[0].unitPrice;
  }

  function funnelEconomics(o, suppliers) {
    suppliers = suppliers || [];
    var parsed = suppliers.filter(function (s) { return s.quoteParseStatus === 'PARSED'; });
    if (!parsed.length) return { result: FUNNEL_UNKNOWN, credibleSupplierCount: suppliers.filter(function (s) { return !s.evidenceGap; }).length };
    var priced = parsed.map(function (s) { return { s: s, price: funnelRepresentativeUnitPrice(s) }; }).filter(function (x) { return x.price !== null; }).sort(function (a, b) { return a.price - b.price; });
    var best = priced[0];
    if (!best) return { result: FUNNEL_UNKNOWN, credibleSupplierCount: suppliers.filter(function (s) { return !s.evidenceGap; }).length };
    var freightPerUnit = typeof best.s.freightPerUnitEstimateUSD === 'number' ? best.s.freightPerUnitEstimateUSD : null;
    var landedCost = freightPerUnit !== null ? best.price + freightPerUnit : null;
    var targetRetail = typeof (o.priceBand && o.priceBand.low) === 'number' ? o.priceBand.low : null;
    var landedCostPct = (landedCost !== null && targetRetail) ? (landedCost / targetRetail) * 100 : null;
    var grossMarginPct = landedCostPct !== null ? 100 - landedCostPct : null;
    var ready = landedCostPct !== null && landedCostPct <= 30 && grossMarginPct !== null && grossMarginPct >= 60;
    return { result: landedCost === null ? FUNNEL_UNKNOWN : (ready ? 'READY' : 'NOT_READY'), credibleSupplierCount: suppliers.filter(function (s) { return !s.evidenceGap; }).length, bestSupplier: best.s, unitPrice: best.price, landedCost: landedCost, targetRetail: targetRetail, grossMarginPct: grossMarginPct };
  }

  function funnelDownside(econ) {
    if (econ.result === FUNNEL_UNKNOWN || econ.landedCost == null) return { flag: FUNNEL_UNKNOWN };
    var downsideLandedCost = econ.landedCost * 1.2;
    var downsideMarginPct = econ.targetRetail ? (1 - downsideLandedCost / econ.targetRetail) * 100 : null;
    return { flag: downsideMarginPct === null ? FUNNEL_UNKNOWN : (downsideMarginPct >= 50 ? 'ROBUST' : (downsideMarginPct >= 30 ? 'MARGINAL' : 'FRAGILE')) };
  }

  function funnelNzGap(o) {
    if (!funnelHasResearch(o)) return { classification: FUNNEL_UNKNOWN };
    var nzCompetitors = (o.competitors || []).filter(function (c) { return /new zealand|\bnz\b/i.test(c.country || ''); });
    if (funnelContainsAny(funnelTextBlob(o), FUNNEL_COMMODITY_WORDS)) return { classification: 'BIG_BOX_COMMODITY' };
    if (nzCompetitors.length >= 3) return { classification: 'STRONG_COMPETITION' };
    if (nzCompetitors.length >= 1) return { classification: 'FRAGMENTED_COMPETITION' };
    return { classification: FUNNEL_UNKNOWN };
  }

  // Sample Gate: 10 tri-state conditions; rightToWin and validationPlan are always
  // UNKNOWN (founder judgment calls this pass never fabricates).
  function funnelSampleGate(demand, econ, downside) {
    var met = 0, notMet = 0, unknown = 2; // rightToWin + validationPlan always unknown
    function tally(state) { if (state === 'MET') met++; else if (state === 'NOT_MET') notMet++; else unknown++; }
    tally(demand.result === 'PASS' ? 'MET' : (demand.result === FUNNEL_UNKNOWN ? FUNNEL_UNKNOWN : 'NOT_MET'));
    tally(econ.credibleSupplierCount === 0 || econ.credibleSupplierCount === undefined ? FUNNEL_UNKNOWN : (econ.credibleSupplierCount >= 2 ? 'MET' : 'NOT_MET'));
    tally(econ.result === FUNNEL_UNKNOWN ? FUNNEL_UNKNOWN : (econ.result === 'READY' ? 'MET' : 'NOT_MET'));
    tally(downside.flag === FUNNEL_UNKNOWN ? FUNNEL_UNKNOWN : (downside.flag === 'ROBUST' ? 'MET' : 'NOT_MET'));
    return { met: met, notMet: notMet, unknown: unknown, total: met + notMet + unknown };
  }

  function funnelFinalDecision(fit, demand, sampleGate, portfolio) {
    if (portfolio && portfolio.classification === 'EXISTING_OPTIMISE') {
      return { decision: 'EXISTING_OPTIMISE', why: 'Prime Piece already sells this or a meaningfully similar product/category.' };
    }
    if (fit.result === 'FAIL') return { decision: 'KILL', why: 'Fails Prime Piece Fit.' };
    if (demand.result === 'FAIL') return { decision: 'KILL', why: 'No credible demand evidence found.' };
    if (sampleGate.notMet === 0 && sampleGate.unknown === 0) return { decision: 'SAMPLE', why: 'Every Sample Gate condition is met with real evidence.' };
    return { decision: 'HOLD', why: (sampleGate.notMet + sampleGate.unknown) + ' of ' + sampleGate.total + ' Sample Gate condition(s) not yet proven.' };
  }

  function computeFunnelSummary(radar, suppliers) {
    var suppliersByOpportunity = {};
    (suppliers || []).forEach(function (s) { if (s.opportunityId) (suppliersByOpportunity[s.opportunityId] = suppliersByOpportunity[s.opportunityId] || []).push(s); });
    var importable = (radar || []).filter(isImportEligible);
    var evaluations = importable.map(function (o) {
      var fit = funnelFit(o);
      var demand = funnelDemand(o);
      var econ = funnelEconomics(o, suppliersByOpportunity[o.id] || []);
      var downside = funnelDownside(econ);
      var nzGap = funnelNzGap(o);
      var portfolio = funnelPortfolio(o);
      var sampleGate = funnelSampleGate(demand, econ, downside);
      var finalDecision = funnelFinalDecision(fit, demand, sampleGate, portfolio);
      var differentiationScore = (o.scoreBreakdown && o.scoreBreakdown.differentiation && o.scoreBreakdown.differentiation.score) || 0;
      return { o: o, fit: fit, demand: demand, econ: econ, nzGap: nzGap, portfolio: portfolio, sampleGate: sampleGate, finalDecision: finalDecision, differentiationScore: differentiationScore };
    });
    var fitPassCount = evaluations.filter(function (e) { return e.fit.result === 'PASS'; }).length;
    var demandPassCount = evaluations.filter(function (e) { return e.demand.result === 'PASS'; }).length;
    var economicsReadyCount = evaluations.filter(function (e) { return e.econ.result === 'READY'; }).length;
    var kill = evaluations.filter(function (e) { return e.finalDecision.decision === 'KILL'; });
    var existingOptimise = evaluations.filter(function (e) { return e.finalDecision.decision === 'EXISTING_OPTIMISE'; });
    var eligible = evaluations.filter(function (e) { return e.finalDecision.decision !== 'KILL' && e.finalDecision.decision !== 'EXISTING_OPTIMISE'; });
    // Separates MARKET DEMAND (demand.result, always shown) from ATTRACTIVENESS AS
    // PRIME PIECE'S NEXT INVENTORY BET (this ranking) — saturated NZ competition and
    // weak differentiation both demote an otherwise strong-demand item.
    var rankKey = function (e) {
      var demandRank = e.demand.result === 'PASS' ? 2 : e.demand.result === 'HOLD' ? 1 : 0;
      var competitionPenalty = (e.nzGap.classification === 'STRONG_COMPETITION' || e.nzGap.classification === 'BIG_BOX_COMMODITY') ? 0 : 1;
      return [demandRank, competitionPenalty, e.sampleGate.met, e.differentiationScore, e.o.opportunityScore || 0];
    };
    eligible.sort(function (a, b) {
      var ra = rankKey(a), rb = rankKey(b);
      for (var i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return rb[i] - ra[i];
      return 0;
    });
    var sampleReady = eligible.filter(function (e) { return e.finalDecision.decision === 'SAMPLE'; });
    var watchlist = eligible.filter(function (e) { return e.finalDecision.decision === 'HOLD'; });
    return {
      totalEvaluated: importable.length, fitPassCount: fitPassCount, demandPassCount: demandPassCount,
      economicsReadyCount: economicsReadyCount, sampleReadyCount: sampleReady.length,
      top3: eligible.slice(0, 3), watchlistCount: watchlist.length, killCount: kill.length, existingOptimiseCount: existingOptimise.length,
    };
  }

  function renderFunnel(radar, suppliers) {
    var el = document.getElementById('funnelBody');
    var importable = (radar || []).filter(isImportEligible);
    if (!importable.length) { el.innerHTML = '<p class="empty-note">No importable opportunities on Market Radar yet.</p>'; return; }
    var summary = computeFunnelSummary(radar, suppliers);
    var tiles = [
      statTile('Evaluated', summary.totalEvaluated),
      statTile('Passed Fit', summary.fitPassCount),
      statTile('Passed Demand Proof', summary.demandPassCount),
      statTile('Economics-ready', summary.economicsReadyCount),
      statTile('Fully Sample-ready', summary.sampleReadyCount),
      statTile('Watchlist (HOLD)', summary.watchlistCount),
      statTile('Existing / Optimise', summary.existingOptimiseCount),
      statTile('Kill', summary.killCount),
    ].join('');
    var top3Html = summary.top3.length
      ? '<div class="mini-table-wrap" style="margin-top:12px;"><table class="mini"><thead><tr><th>Product</th><th>Funnel</th><th>Why</th></tr></thead><tbody>' +
        summary.top3.map(function (e) {
          return '<tr><td>' + escapeText(e.o.product) + (e.o.variant ? ' — ' + escapeText(e.o.variant) : '') + '</td><td><span class="funnel-pill funnel-' + e.finalDecision.decision + '">' + e.finalDecision.decision + '</span></td><td>' + escapeText(e.finalDecision.why) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : '<p class="empty-note" style="margin-top:8px;">Only ' + summary.totalEvaluated + ' opportunity(ies) evaluated and none currently qualify for Top 3 — not manufacturing a Top 3 just because the UI expects one.</p>';
    el.innerHTML = '<div class="stat-grid">' + tiles + '</div>' + top3Html +
      '<div class="funnel-caveat">"Top 3" means currently most investment-ready based on available evidence, not a guarantee these will sell. Opportunity Score alone can never pass this funnel — see each opportunity\\'s expanded row in Market Radar for the full Fit / Demand / Economics / Sample Gate breakdown.</div>';
  }

  function stagePill(status) {
    return '<span class="badge badge-stage">' + escapeText(status || '—') + '</span>';
  }
  function tierPill(tier) {
    if (!tier) return '<span class="badge">—</span>';
    return '<span class="badge badge-tier-' + tier + '">' + tier + '</span>';
  }

  function statTile(label, value, dim) {
    return '<div class="stat-tile"><div class="stat-label">' + escapeText(label) + '</div><div class="stat-val' + (dim ? ' dim' : '') + '">' + value + '</div></div>';
  }

  // --- Current Money Maker ------------------------------------------------------
  function renderMoneyMaker(products) {
    var active = products.filter(function (p) { return p.priorityLane === 'Active' && p.status !== 'KILL'; });
    var el = document.getElementById('moneyMakerBody');
    if (!active.length) {
      el.innerHTML = '<p class="empty-note">Nothing is tagged Priority lane = Active in Product Lab yet.</p>';
      return;
    }
    el.innerHTML = active.map(function (row) {
      var econ = economics(row);
      var rp = realizedProfit(row, econ);
      var c = cac(row);
      var tiles = [
        statTile('Revenue', row.perf_revenue !== undefined ? money(num(row.perf_revenue)) : '—', row.perf_revenue === undefined),
        statTile('Units sold', num(row.perf_unitsSold) !== null ? num(row.perf_unitsSold) : '—', num(row.perf_unitsSold) === null),
        statTile(rp.basis === 'contribution' ? 'Contribution profit' : 'Gross profit', rp.value !== null ? money(rp.value) : '—', rp.value === null),
        statTile('Sessions', num(row.perf_sessions) !== null ? num(row.perf_sessions) : '—', num(row.perf_sessions) === null),
        statTile('Conversion rate', row.perf_conversionRate !== undefined && row.perf_conversionRate !== '' ? row.perf_conversionRate + '%' : '—', !row.perf_conversionRate),
        statTile('Ad spend', row.perf_adSpend !== undefined ? money(num(row.perf_adSpend)) : '—', row.perf_adSpend === undefined),
        statTile('CAC', c !== null ? money(c) : '—', c === null),
        statTile('Preorders / enquiries', num(row.perf_preordersOrEnquiries) !== null ? num(row.perf_preordersOrEnquiries) : '—', num(row.perf_preordersOrEnquiries) === null),
        statTile('Current stock', row.perf_currentStock || '—', !row.perf_currentStock),
      ].join('');
      var period = row.perf_periodLabel ? ' · ' + escapeText(row.perf_periodLabel) : '';
      var nextAction = row.perf_nextAction
        ? '<div class="next-action-box"><span class="k">Next action</span>' + escapeText(row.perf_nextAction) + '</div>'
        : '<div class="next-action-box"><span class="k">Next action</span><span class="stat-val dim">Not recorded yet — add one in Product Lab.</span></div>';
      return '<div class="money-card">' +
        '<div class="money-head"><span class="money-name">' + escapeText(row.name || 'Untitled product') + '</span>' + tierPill(row.tier) + stagePill(row.status) + '</div>' +
        '<div class="money-meta">Prime Opportunity Score ' + (primeScore(row, econ) != null ? primeScore(row, econ) : '—') + period + '</div>' +
        '<div class="stat-grid">' + tiles + '</div>' + nextAction +
        '</div>';
    }).join('');
  }

  function renderCoreWarning(products) {
    var activeCores = products.filter(function (p) { return p.tier === 'CORE' && p.priorityLane === 'Active' && p.status !== 'KILL'; });
    var el = document.getElementById('coreWarning');
    if (activeCores.length > 1) {
      el.style.display = 'block';
      el.innerHTML = '<strong>More than one CORE product is Active:</strong> ' +
        activeCores.map(function (p) { return escapeText(p.name || 'Untitled'); }).join(', ') +
        '. Prime Piece policy is at most one CORE launch/test at a time unless deliberately overridden — resolve this in Product Lab if it wasn\\'t intentional.';
    } else {
      el.style.display = 'none';
    }
  }

  // --- Next Product Candidate ----------------------------------------------------
  function renderNextCandidate(products, radar) {
    var el = document.getElementById('nextCandidateBody');
    var candidates = products
      .filter(function (p) { return p.priorityLane === 'Research Candidate' && p.status !== 'KILL' && isImportEligible(p); })
      .map(function (p) { var econ = economics(p); return { row: p, econ: econ, score: primeScore(p, econ) }; })
      .filter(function (c) { return c.score !== null; })
      .sort(function (a, b) { return b.score - a.score; });

    if (candidates.length) {
      var top = candidates[0];
      var econ = top.econ;
      var landedBadge = econ.landedCostPctOfRetail !== null
        ? '<span class="badge ' + (econ.landedCostPctOfRetail <= 30 ? 'badge-ok' : 'badge-warn') + '">Landed cost ' + econ.landedCostPctOfRetail.toFixed(0) + '% of retail (target ≤25–30%)</span>'
        : '';
      var marginBadge = econ.grossMarginPct !== null
        ? '<span class="badge ' + (econ.grossMarginPct >= 65 ? 'badge-ok' : 'badge-warn') + '">Gross margin ' + econ.grossMarginPct.toFixed(0) + '% (target 65%+)</span>'
        : '';
      el.innerHTML = '<div class="money-card">' +
        '<div class="money-head"><span class="money-name">' + escapeText(top.row.name || 'Untitled product') + '</span>' + tierPill(top.row.tier) + stagePill(top.row.status) + '</div>' +
        '<div class="money-meta">Prime Opportunity Score ' + top.score + (top.row.confidence ? ' · ' + escapeText(top.row.confidence) + ' confidence' : '') + '</div>' +
        '<div style="margin:8px 0 10px;display:flex;gap:8px;flex-wrap:wrap;">' + landedBadge + marginBadge + '</div>' +
        (top.row.me_keyTakeaway ? '<div class="next-action-box"><span class="k">Key takeaway</span>' + escapeText(top.row.me_keyTakeaway) + '</div>' : '') +
        '</div>' +
        (candidates.length > 1 ? '<p class="empty-note">' + (candidates.length - 1) + ' other Research Candidate(s) tracked in Product Lab.</p>' : '');
      return;
    }

    // No Research Candidate tagged in Product Lab yet — fall back to the top
    // not-yet-promoted Market Radar opportunity as a starting suggestion.
    var topRadar = (radar || [])
      .filter(function (r) { return !r.promotedToProductLab && r.tier !== 'Kill' && isImportEligible(r); })
      .sort(function (a, b) { return (b.opportunityScore || 0) - (a.opportunityScore || 0); })[0];
    if (topRadar) {
      el.innerHTML = '<div class="money-card">' +
        '<div class="money-head"><span class="money-name">' + escapeText(topRadar.product) + (topRadar.variant ? ' — ' + escapeText(topRadar.variant) : '') + '</span><span class="badge badge-stage">From Market Radar — not yet promoted</span></div>' +
        '<div class="money-meta">Opportunity Score ' + (topRadar.opportunityScore != null ? topRadar.opportunityScore : '—') + ' · Confidence ' + (topRadar.confidenceScore != null ? topRadar.confidenceScore : '—') + ' · Tier ' + escapeText(topRadar.tier) + '</div>' +
        '<p class="empty-note" style="padding:4px 0 0;">No Product Lab item is tagged Priority lane = Research Candidate yet — this is the strongest thing on Market Radar. Review and promote it in Market Radar if it\\'s worth Prime Piece\\'s attention.</p>' +
        '</div>';
    } else {
      el.innerHTML = '<p class="empty-note">Nothing tagged Priority lane = Research Candidate, and nothing usable on Market Radar yet.</p>';
    }
  }

  // --- Ignore: Kill List + Maintain ----------------------------------------------
  function renderIgnore(products, radar) {
    var el = document.getElementById('ignoreBody');
    var killedProducts = products.filter(function (p) { return p.status === 'KILL'; });
    var killedRadar = (radar || []).filter(function (r) { return r.tier === 'Kill'; });
    var maintain = products.filter(function (p) { return p.priorityLane === 'Maintain' && p.status !== 'KILL'; });

    var killHtml = '';
    if (killedProducts.length || killedRadar.length) {
      var rows = killedProducts.map(function (p) {
        return '<div class="kill-row"><div class="kn">' + escapeText(p.name || 'Untitled product') + '</div><div class="kr">' + escapeText(p.notes || 'No reason recorded — add one in Product Lab notes.') + '</div></div>';
      }).concat(killedRadar.map(function (r) {
        var reason = (r.disqualifiers && r.disqualifiers.length) ? r.disqualifiers.join('; ') : (r.marketGap && r.marketGap.description) || 'No reason recorded.';
        return '<div class="kill-row"><div class="kn">' + escapeText(r.product) + (r.variant ? ' — ' + escapeText(r.variant) : '') + ' <span class="badge badge-stage">Market Radar</span></div><div class="kr">' + escapeText(reason) + '</div></div>';
      }));
      killHtml = '<div class="kill-list">' + rows.join('') + '</div>';
    } else {
      killHtml = '<p class="empty-note">Nothing killed yet.</p>';
    }

    var maintainHtml = maintain.length
      ? '<div class="maintain-list">' + maintain.map(function (p) { return '<span class="maintain-chip">' + escapeText(p.name || 'Untitled product') + ' ' + tierPill(p.tier) + '</span>'; }).join('') + '</div>'
      : '<p class="empty-note">Nothing tagged Maintain.</p>';

    el.innerHTML = '<h4 style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin:0 0 8px;">Kill list — considered and rejected</h4>' + killHtml +
      '<h4 style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin:18px 0 8px;">Maintain — steady state, no new attention needed</h4>' + maintainHtml;
  }

  // --- Product Pipeline -----------------------------------------------------------
  function renderPipeline(products) {
    var el = document.getElementById('pipelineBody');
    var rows = products
      .filter(function (p) { return p.status !== 'KILL'; })
      .map(function (p) { var econ = economics(p); return { row: p, score: primeScore(p, econ) }; })
      .sort(function (a, b) {
        var av = a.score, bv = b.score;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return bv - av;
      });
    if (!rows.length) { el.innerHTML = '<p class="empty-note">No products in Product Lab yet.</p>'; return; }
    el.innerHTML = '<div class="mini-table-wrap"><table class="mini"><thead><tr>' +
      '<th>Product</th><th>Tier</th><th>Priority lane</th><th>Stage</th><th>Prime Opportunity Score</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td>' + escapeText(r.row.name || 'Untitled product') + '</td><td>' + tierPill(r.row.tier) + '</td><td>' + escapeText(r.row.priorityLane || '—') + '</td><td>' + stagePill(r.row.status) + '</td><td>' + (r.score != null ? r.score : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  // --- Top 5 Global Opportunities ------------------------------------------------
  // Enough detail to understand what's happening globally without opening Market
  // Radar: product, score, trend, confidence, market, estimated NZ retail, why it
  // matters, and stage (the linked Product Lab stage if promoted, else the worker's
  // own recommended next action as a stand-in "stage" for anything not yet promoted).
  function renderTopGlobal(radar, products) {
    var el = document.getElementById('topGlobalBody');
    var byId = {};
    products.forEach(function (p) { byId[p.id] = p; });
    var top = (radar || [])
      .filter(function (r) { return r.tier !== 'Kill' && isImportEligible(r); })
      .slice().sort(function (a, b) { return (b.opportunityScore || 0) - (a.opportunityScore || 0); })
      .slice(0, 5);
    if (!top.length) { el.innerHTML = '<p class="empty-note">Nothing importable on Market Radar yet.</p>'; return; }
    el.innerHTML = '<div class="mini-table-wrap"><table class="mini"><thead><tr>' +
      '<th>Product / category</th><th>Score</th><th>Trend</th><th>Confidence</th><th>Market</th><th>Est. NZ retail</th><th>Why it matters</th><th>Stage</th>' +
      '</tr></thead><tbody>' +
      top.map(function (r) {
        var stage = r.promotedToProductLab && byId[r.productLabId] ? escapeText(byId[r.productLabId].status) : escapeText(r.recommendedNextAction || 'Not yet promoted');
        var retail = (r.economicsPotential && r.economicsPotential.retailPriceRangeEstimate) || (r.priceBand ? (r.priceBand.currency || '') + (r.priceBand.low != null ? r.priceBand.low : '?') + '–' + (r.priceBand.high != null ? r.priceBand.high : '?') : '—');
        var why = (r.marketGap && r.marketGap.description) || '—';
        return '<tr><td>' + escapeText(r.product) + (r.variant ? ' — ' + escapeText(r.variant) : '') + '</td><td>' + (r.opportunityScore != null ? r.opportunityScore : '—') +
          '</td><td>' + escapeText(r.trendDirection || '—') + '</td><td>' + (r.confidenceScore != null ? r.confidenceScore : '—') + '</td><td>' + escapeText(r.mainMarket || '—') +
          '</td><td>' + escapeText(retail) + '</td><td>' + escapeText(why.length > 90 ? why.slice(0, 90) + '…' : why) + '</td><td>' + stage + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  // --- Biggest Movers -------------------------------------------------------------
  // Only opportunities whose score has actually moved meaningfully since the
  // previous scan (>=5 points) — needs Market Radar's 'refresh' scans to actually
  // revisit existing items over time, otherwise nothing here would ever move.
  function renderMovers(radar) {
    var el = document.getElementById('moversBody');
    var movers = (radar || []).filter(function (r) { return (r.history || []).length >= 2; }).map(function (r) {
      var h = r.history;
      var prev = h[h.length - 2], cur = h[h.length - 1];
      var delta = (cur.score != null && prev.score != null) ? cur.score - prev.score : null;
      return { name: r.product, variant: r.variant, delta: delta, newScore: cur.score, note: cur.note };
    }).filter(function (m) { return m.delta !== null && Math.abs(m.delta) >= 5; })
      .sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); })
      .slice(0, 8);
    if (!movers.length) { el.innerHTML = '<p class="empty-note">No opportunity has moved meaningfully since its last scan.</p>'; return; }
    el.innerHTML = movers.map(function (m) {
      var cls = m.delta > 0 ? 'mover-up' : 'mover-down';
      var arrow = m.delta > 0 ? '↑' : '↓';
      return '<div class="signal-row"><span class="signal-name">' + escapeText(m.name) + (m.variant ? ' — ' + escapeText(m.variant) : '') + ' <span class="' + cls + '">' + arrow + ' ' + Math.abs(m.delta) + '</span></span>' +
        '<span class="signal-meta">now ' + m.newScore + (m.note ? ' · ' + escapeText(m.note) : '') + '</span></div>';
    }).join('');
  }

  // --- Today's Pulse / Next $1,000 / Today's 3 Moves (AI-synthesized, stored) -----
  // These three read a brief generated once per day by the scheduled Market Radar
  // worker (scripts/market-radar/run.mjs, 'daily' mode) and stored in Redis — the
  // Dashboard never calls Claude itself, so opening this page is always instant and
  // never costs an API call.
  function renderPulse(pulse) {
    var el = document.getElementById('pulseBody');
    if (!pulse) { el.innerHTML = '<p class="empty-note">No Pulse brief yet — it\\'s generated by the first scheduled Market Radar run (or run mode=daily by hand in GitHub Actions).</p>'; return; }
    if (pulse.synthesisFailed) {
      el.innerHTML = '<p class="empty-note">Today\\'s synthesis call failed. Market Radar data itself still updated — see Top 5 Global Opportunities and Biggest Movers below, and the GitHub Actions run log for what went wrong.</p>';
      return;
    }
    var bullets = (pulse.pulseBullets || []).map(function (b) { return '<li>' + escapeText(b) + '</li>'; }).join('');
    var warnings = (pulse.missingDataWarnings || []).length
      ? '<div class="missing-data-note">Missing data: ' + (pulse.missingDataWarnings || []).map(escapeText).join(' · ') + '</div>'
      : '';
    el.innerHTML = '<ul class="pulse-list">' + (bullets || '<li>Nothing notable today.</li>') + '</ul>' + warnings;
  }

  function renderNextThousand(pulse) {
    var el = document.getElementById('nextThousandBody');
    if (!pulse || !pulse.nextThousand || pulse.synthesisFailed) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="next-action-box" style="margin-top:10px;"><span class="k">Next $1,000</span>' + escapeText(pulse.nextThousand.recommendation) +
      (pulse.nextThousand.rationale ? '<div style="margin-top:6px;color:var(--muted);font-size:12px;">' + escapeText(pulse.nextThousand.rationale) + '</div>' : '') + '</div>';
  }

  function renderMoves(pulse) {
    var el = document.getElementById('movesBody');
    if (!pulse || !(pulse.threeMoves || []).length || pulse.synthesisFailed) {
      el.innerHTML = '<p class="empty-note">No moves generated yet — comes from the same daily Pulse brief as Today\\'s Pulse above.</p>';
      return;
    }
    el.innerHTML = '<ol class="moves-list">' + pulse.threeMoves.map(function (m) { return '<li>' + escapeText(m) + '</li>'; }).join('') + '</ol>';
  }

  function renderFreshness(pulse) {
    var line = document.getElementById('freshnessLine');
    var warnEl = document.getElementById('staleWarning');
    if (!pulse || !pulse.generatedAt) {
      line.textContent = 'Last updated: never — Prime Piece Pulse has not completed a scheduled run yet.';
      warnEl.style.display = 'block';
      warnEl.innerHTML = '<strong>No Pulse data yet.</strong> Trigger the Market Radar workflow by hand (mode=daily) in GitHub Actions, or wait for the next scheduled run.';
      return;
    }
    var generated = new Date(pulse.generatedAt);
    var ageHours = (Date.now() - generated.getTime()) / 36e5;
    var dateLabel = generated.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    var runInfo = pulse.radarRun ? (' · Market Radar: ' + pulse.radarRun.created + ' created, ' + pulse.radarRun.updated + ' updated' + (pulse.radarRun.failed ? ', ' + pulse.radarRun.failed + ' failed' : '')) : '';
    line.textContent = 'Last updated: ' + dateLabel + runInfo;
    if (ageHours > 36) {
      warnEl.style.display = 'block';
      warnEl.innerHTML = '<strong>This data is stale (' + Math.round(ageHours) + ' hours old).</strong> Market Radar has not completed a scheduled run recently — check the GitHub Actions workflow.';
    } else if (pulse.radarRun && pulse.radarRun.failed > 0) {
      warnEl.style.display = 'block';
      warnEl.innerHTML = '<strong>' + pulse.radarRun.failed + ' candidate(s) failed to research on the last run.</strong> Check the GitHub Actions run log — the rest of this data is still current.';
    } else {
      warnEl.style.display = 'none';
    }
  }

  // --- Unit Economics -----------------------------------------------------------
  function renderEconomics(products) {
    var el = document.getElementById('economicsBody');
    var rows = products.filter(function (p) { return (p.priorityLane === 'Active' || p.priorityLane === 'Research Candidate') && p.status !== 'KILL'; });
    if (!rows.length) { el.innerHTML = '<p class="empty-note">Nothing tagged Active or Research Candidate yet.</p>'; return; }
    el.innerHTML = '<div class="mini-table-wrap"><table class="mini"><thead><tr>' +
      '<th>Product</th><th>Selling price</th><th>Landed cost</th><th>Landed cost % of retail</th><th>Gross margin %</th><th>Contribution margin %</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (p) {
        var e = economics(p);
        return '<tr><td>' + escapeText(p.name || 'Untitled product') + '</td><td>' + money(e.sellingPrice) + '</td><td>' + money(e.totalLandedCost) + '</td><td>' + pct(e.landedCostPctOfRetail) + '</td><td>' + pct(e.grossMarginPct) + '</td><td>' + pct(e.contributionMarginPct) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  // --- Validation Results ---------------------------------------------------------
  function renderValidation(products) {
    var el = document.getElementById('validationBody');
    var rows = products.filter(function (p) { return p.status === 'TEST' || p.status === 'VALIDATED'; });
    if (!rows.length) { el.innerHTML = '<p class="empty-note">Nothing currently in TEST or VALIDATED stage.</p>'; return; }
    el.innerHTML = '<div class="mini-table-wrap"><table class="mini"><thead><tr>' +
      '<th>Product</th><th>Stage</th><th>Traffic</th><th>Waitlist</th><th>Preorders / enquiries</th><th>Preorder revenue</th><th>Conversion rate</th><th>CAC</th><th>Feedback</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (p) {
        var c = cac(p);
        return '<tr><td>' + escapeText(p.name || 'Untitled product') + '</td><td>' + stagePill(p.status) + '</td><td>' + (num(p.perf_sessions) != null ? num(p.perf_sessions) : '—') + '</td><td>' + (num(p.perf_waitlistSignups) != null ? num(p.perf_waitlistSignups) : '—') + '</td><td>' + (num(p.perf_preordersOrEnquiries) != null ? num(p.perf_preordersOrEnquiries) : '—') + '</td><td>' + (p.perf_preorderRevenue !== undefined ? money(num(p.perf_preorderRevenue)) : '—') + '</td><td>' + (p.perf_conversionRate ? p.perf_conversionRate + '%' : '—') + '</td><td>' + (c !== null ? money(c) : '—') + '</td><td>' + escapeText(p.perf_customerFeedback ? (p.perf_customerFeedback.length > 60 ? p.perf_customerFeedback.slice(0, 60) + '…' : p.perf_customerFeedback) : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function renderAll(products, radar, pulse, suppliers) {
    renderFreshness(pulse);
    renderCoreWarning(products);
    renderPulse(pulse);
    renderMoneyMaker(products);
    renderNextCandidate(products, radar);
    renderNextThousand(pulse);
    renderMoves(pulse);
    renderFunnel(radar, suppliers);
    renderTopGlobal(radar, products);
    renderMovers(radar);
    renderIgnore(products, radar);
    renderPipeline(products);
    renderEconomics(products);
    renderValidation(products);
  }

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (res.status === 401) {
        window.location.href = '/scale-os/login?next=' + encodeURIComponent(window.location.pathname);
        return Promise.reject(new Error('not authenticated'));
      }
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || ('Failed to load (status ' + res.status + ')'));
        return data;
      });
    });
  }

  Promise.all([fetchJson('/api/scale-os/products'), fetchJson('/api/scale-os/radar-data')])
    .then(function (results) {
      var products = results[0].products || [];
      var radar = results[1].opportunities || [];
      var pulse = results[1].pulse || null;
      var suppliers = results[1].suppliers || [];
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('dashContent').style.display = 'block';
      renderAll(products, radar, pulse, suppliers);
    })
    .catch(function (err) {
      document.getElementById('loadingState').style.display = 'none';
      var errEl = document.getElementById('loadErrorState');
      errEl.textContent = 'Could not load Dashboard — ' + err.message;
      errEl.style.display = 'block';
    });
})();
</script>
`;
