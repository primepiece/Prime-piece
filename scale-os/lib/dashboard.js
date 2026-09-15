// Dashboard: Prime Piece's overall Scale OS command centre. Market Intelligence /
// Product Pipeline is one function of this page, not a separate system — it reads the
// same Product Lab and Market Radar data those two pages already own (via their
// existing /api/scale-os/products and /api/scale-os/radar-data endpoints) and
// aggregates it client-side, exactly like every other Scale OS page does. No new
// storage key, no new API route, no new serverless function.
//
// Answers three questions, in this order, because that's the order James actually
// needs them in:
//   1. WHAT IS MAKING MONEY NOW?      -> Current Money Maker (priorityLane = Active)
//   2. WHAT SHOULD GET THE NEXT $1,000? -> Next Product Candidate
//   3. WHAT SHOULD I IGNORE?          -> Kill List + Maintain (steady-state) list

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
`;

export const DASHBOARD_BODY = `
  <h1>Dashboard</h1>
  <p class="page-sub">Prime Piece's command centre — what's making money, what's next, and what to leave alone.</p>

  <div id="loadingState" class="empty-note">Loading…</div>
  <div id="loadErrorState" class="empty-note" style="display:none;"></div>

  <div id="dashContent" style="display:none;">
    <div id="coreWarning" class="warn-banner" style="display:none;"></div>

    <div class="section">
      <div class="section-head"><div><div class="section-q">What is making money now?</div><div class="section-title">Current Money Maker</div></div></div>
      <div id="moneyMakerBody"></div>
    </div>

    <div class="section">
      <div class="section-head"><div><div class="section-q">What should get the next $1,000?</div><div class="section-title">Next Product Candidate</div></div></div>
      <div id="nextCandidateBody"></div>
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
      <div class="section-head"><div class="section-title">Market Signals</div><a class="section-link" href="/scale-os/radar">Open Market Radar →</a></div>
      <div id="signalsBody"></div>
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
      .filter(function (p) { return p.priorityLane === 'Research Candidate' && p.status !== 'KILL'; })
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
      .filter(function (r) { return !r.promotedToProductLab && r.tier !== 'Kill'; })
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

  // --- Market Signals ---------------------------------------------------------
  function renderSignals(radar) {
    var el = document.getElementById('signalsBody');
    var signals = (radar || [])
      .filter(function (r) { return !r.promotedToProductLab && r.tier !== 'Kill' && /^(Rising|New)/.test(r.trendDirection || '') && (r.tier === 'A' || r.tier === 'B'); })
      .sort(function (a, b) { return (b.opportunityScore || 0) - (a.opportunityScore || 0); })
      .slice(0, 8);
    if (!signals.length) { el.innerHTML = '<p class="empty-note">No new Rising/tier A-B signals right now — check Market Radar for the full universe.</p>'; return; }
    el.innerHTML = signals.map(function (r) {
      return '<div class="signal-row"><span class="signal-name">' + escapeText(r.product) + (r.variant ? ' — ' + escapeText(r.variant) : '') + '</span>' +
        '<span class="signal-meta">' + escapeText(r.trendDirection || '') + ' · Score ' + (r.opportunityScore != null ? r.opportunityScore : '—') + ' · Tier ' + escapeText(r.tier) + ' · ' + escapeText(r.mainMarket || '') + '</span></div>';
    }).join('');
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

  function renderAll(products, radar) {
    renderCoreWarning(products);
    renderMoneyMaker(products);
    renderNextCandidate(products, radar);
    renderIgnore(products, radar);
    renderPipeline(products);
    renderSignals(radar);
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
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('dashContent').style.display = 'block';
      renderAll(products, radar);
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
