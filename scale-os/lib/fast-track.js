// Fast Track Product Analysis: paste a product URL James found (supplier, competitor,
// Instagram, Pinterest, wherever) and get back one concise SAMPLE/HOLD/KILL decision
// card — not another dashboard. Submitting a request here costs nothing; the actual
// research (real Tavily + Claude calls, see scripts/market-radar/run.mjs's
// 'fast-track' mode) only ever runs via a manually-triggered GitHub Actions run,
// same cost-control convention as Supplier discovery and quote-capture. This page is
// read-mostly: submit a URL, then watch it move from Pending to a decision card once
// that run has processed it.

export const FAST_TRACK_STYLE = `
  .empty-state { padding: 40px 20px; text-align: center; color: var(--muted); font-size: 13px; }
  .empty-note { color: var(--muted); font-size: 13px; padding: 14px 0; }
  .ft-form { background: var(--white); border: 1px solid var(--line); border-radius: 6px; padding: 20px 22px; margin-bottom: 28px; }
  .ft-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px 20px; margin-bottom: 14px; }
  .ft-field { display: flex; flex-direction: column; gap: 5px; }
  .ft-field label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .ft-field input[type=text], .ft-field input[type=url], .ft-field textarea {
    border: 1px solid var(--line); border-radius: 4px; padding: 8px 10px; font-family: inherit; font-size: 13px; box-sizing: border-box;
  }
  .ft-field textarea { min-height: 60px; resize: vertical; }
  .ft-field.wide { grid-column: 1 / -1; }
  .ft-submit-row { display: flex; align-items: center; gap: 12px; }
  .ft-submit-note { font-size: 11.5px; color: var(--muted); }

  .ft-list { display: flex; flex-direction: column; gap: 16px; }
  .ft-card { background: var(--white); border: 1px solid var(--line); border-radius: 6px; padding: 18px 20px; }
  .ft-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
  .ft-card-title { font-size: 15px; font-weight: 700; }
  .ft-card-sub { font-size: 11.5px; color: var(--muted); margin-bottom: 12px; }
  .ft-status-pill { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 10px; border-radius: 20px; }
  .ft-status-PENDING { background: #EEECE6; color: #8A8577; }
  .ft-status-FAILED { background: #F1E4DF; color: #A05B44; }
  .ft-decision-pill { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
  .ft-decision-SAMPLE { background: #DCEAE0; color: #2E7D4F; }
  .ft-decision-HOLD { background: #E9E2CC; color: #8A6A2A; }
  .ft-decision-KILL { background: #F1E4DF; color: #A05B44; }
  .ft-decision-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px 20px; margin: 12px 0; }
  .ft-dc-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 2px; }
  .ft-dc-value { font-size: 13px; line-height: 1.4; }
  .ft-why-box { background: #F4F2EC; border-radius: 5px; padding: 10px 12px; font-size: 12.5px; line-height: 1.5; margin-bottom: 10px; }
  .ft-why-box .k { font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; color: var(--teal-dark); margin-right: 6px; }
  .ft-expand-toggle { font-size: 11.5px; color: var(--teal-dark); cursor: pointer; text-decoration: underline; }
  .ft-detail { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); display: none; }
  .ft-detail.open { display: block; }
  .ft-detail-section { margin-bottom: 18px; }
  .ft-detail-section-title { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--teal-dark); margin-bottom: 8px; }
  table.ft-mini { border-collapse: collapse; width: 100%; font-size: 12px; }
  table.ft-mini th, table.ft-mini td { border-bottom: 1px solid var(--line); padding: 6px 8px; text-align: left; }
  table.ft-mini thead th { background: #F4F2EC; font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
  .evidence-tag-sm { font-size: 9.5px; letter-spacing: 0.02em; padding: 1px 7px; border-radius: 20px; background: #EEECE6; color: #555; margin-left: 5px; white-space: nowrap; }
  .ft-design-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
  .ft-design-card { border: 1px solid var(--line); border-radius: 5px; padding: 10px 12px; }
  .ft-design-card.recommended { border-color: var(--teal); background: #F7FBFB; }
  .ft-design-card h4 { margin: 0 0 6px; font-size: 12.5px; }
  .ft-error-note { color: var(--red); font-size: 12px; margin-top: 8px; }
  .ft-risk-HIGH { color: #A05B44; font-weight: 700; }
  .ft-risk-MEDIUM { color: #8A6A2A; font-weight: 700; }
  .ft-risk-LOW { color: var(--muted); }
`;

export const FAST_TRACK_BODY = `
  <h1>Fast Track Product Analysis</h1>
  <p class="page-sub">Paste a product URL you found (supplier, competitor, Instagram, Pinterest) — get back one concise SAMPLE / HOLD / KILL decision card, backed by real evidence and source URLs.</p>

  <div class="ft-form">
    <div class="ft-form-grid">
      <div class="ft-field">
        <label for="ftProductUrl">Product URL (required)</label>
        <input type="url" id="ftProductUrl" placeholder="https://houseofmarmar.com.au/products/...">
      </div>
      <div class="ft-field">
        <label for="ftSupplierUrl">Known supplier URL (optional)</label>
        <input type="url" id="ftSupplierUrl" placeholder="https://www.lewinstone.com/">
      </div>
      <div class="ft-field wide">
        <label for="ftCompetitorUrls">Competitor URLs (optional — one per line)</label>
        <textarea id="ftCompetitorUrls" placeholder="https://competitor-a.com/product&#10;https://competitor-b.com/product"></textarea>
      </div>
      <div class="ft-field wide">
        <label for="ftNotes">Notes (optional)</label>
        <textarea id="ftNotes" placeholder="e.g. Lewin Stone recently posted marble cups on Instagram. House of MarMar in Australia appears to be launching premium marble espresso cup sets. Considering whether this could work in NZ."></textarea>
      </div>
      <div class="ft-field">
        <label for="ftImage">Reference image (optional)</label>
        <input type="file" id="ftImage" accept="image/*">
      </div>
    </div>
    <div class="ft-submit-row">
      <button class="btn btn--teal" id="ftSubmitBtn">Submit for Fast Track analysis</button>
      <span class="ft-submit-note" id="ftSubmitNote">Free to submit — the actual analysis runs via GitHub Actions (mode=fast-track), triggered by hand, never automatically.</span>
    </div>
  </div>

  <div id="loadingState" class="empty-state">Loading…</div>
  <div id="loadErrorState" class="empty-state" style="display:none;"></div>
  <div id="ftContent" style="display:none;">
    <div id="ftList" class="ft-list"></div>
  </div>
`;

export const FAST_TRACK_SCRIPT = `
<script>
(function () {
  function escapeText(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function money(v, currency) {
    if (v === null || v === undefined) return '—';
    return (currency || '$') + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  function fieldOrDash(v) { return (v === null || v === undefined || v === '') ? '<span class="muted">—</span>' : escapeText(v); }

  var analyses = [];
  var expandedIds = {};

  // --- Decision card (the concise, default view) -----------------------------------
  function decisionCardHtml(a) {
    var d = a.decision;
    var mv = a.stages && a.stages.marketValidation;
    var econ = a.stages && a.stages.economics;
    var baseScenario = econ && econ.scenarios && econ.scenarios.BASE;
    var extraction = a.stages && a.stages.extraction;

    var rows = [
      ['Opportunity Score', d.opportunityScore + '/100'],
      ['Confidence', d.confidence],
      ['Market Signal', mv ? escapeText(mv.demandCharacter) : '<span class="muted">Not run</span>'],
      ['NZ Competition', mv ? escapeText(mv.nzCompetitionLevel) : '<span class="muted">Not run</span>'],
      ['International Validation', mv ? escapeText(mv.internationalCompetitionLevel) + ' (' + (mv.comparables || []).length + ' comparable(s))' : '<span class="muted">Not run</span>'],
      ['Target Retail', econ ? money(econ.targetRetailNZD, 'NZ$') : '<span class="muted">Not run</span>'],
      ['Target Landed Cost', baseScenario && baseScenario.landedCostNZD != null ? money(baseScenario.landedCostNZD, 'NZ$') + (baseScenario.grossMarginPct != null ? ' (' + baseScenario.grossMarginPct + '% margin)' : '') : '<span class="muted">Unknown — no factory price yet</span>'],
      ['Best Design Direction', d.bestDesignDirection ? escapeText(d.bestDesignDirection) : '<span class="muted">Not run</span>'],
      ['Best Current Supplier', d.bestSupplier ? escapeText(d.bestSupplier.name) + ' (score ' + d.bestSupplier.fastTrackScore + '/100)' : '<span class="muted">None found</span>'],
      ['Biggest Risk', d.biggestRisk ? '<span class="ft-risk-' + d.biggestRisk.severity + '">' + escapeText(d.biggestRisk.item) + '</span> (' + escapeText(d.biggestRisk.status) + ')' : '<span class="muted">Not run</span>'],
      ['Next Experiment', escapeText(d.nextExperiment)],
    ];

    return '<div class="ft-why-box"><span class="k">Why</span>' + escapeText(d.why) + '</div>' +
      '<div class="ft-decision-card-grid">' + rows.map(function (r) {
        return '<div><div class="ft-dc-label">' + escapeText(r[0]) + '</div><div class="ft-dc-value">' + r[1] + '</div></div>';
      }).join('') + '</div>';
  }

  // --- Full stage-by-stage detail (expandable, off by default) ---------------------
  function extractionDetailHtml(e) {
    if (!e) return '<p class="empty-note">Extraction did not complete.</p>';
    var fields = [
      ['Category', e.category], ['Materials', e.materials], ['Dimensions', e.dimensions], ['Capacity', e.capacity],
      ['Construction method', e.constructionMethod], ['Design / form', e.designForm], ['Accessories', e.accessories],
      ['Retail price', e.retailPrice && e.retailPrice.value != null ? money(e.retailPrice.value, e.retailPrice.currency) : null],
      ['Target customer', e.targetCustomer], ['Positioning', e.positioning],
      ['Selling points', (e.sellingPoints || []).join(', ')], ['Care instructions', e.careInstructions],
      ['Food-safety claims', e.foodSafetyClaims], ['Stock signal', e.stockSignal],
    ];
    return '<table class="ft-mini"><tbody>' + fields.map(function (f) {
      return '<tr><td class="muted">' + escapeText(f[0]) + '</td><td>' + fieldOrDash(f[1]) + '</td></tr>';
    }).join('') + '</tbody></table><div class="evidence-tag-sm">' + escapeText(e.confidenceType) + '</div>';
  }

  function marketDetailHtml(mv) {
    if (!mv) return '<p class="empty-note">Market validation did not complete.</p>';
    var rows = (mv.comparables || []).map(function (c) {
      return '<tr><td>' + escapeText(c.company) + '</td><td>' + escapeText(c.country) + '</td><td>' + escapeText(c.product) + '</td>' +
        '<td>' + (c.retailPrice && c.retailPrice.value != null ? money(c.retailPrice.value, c.retailPrice.currency) : '—') + '</td>' +
        '<td>' + fieldOrDash(c.stone) + '</td><td>' + fieldOrDash(c.availability) + '</td>' +
        '<td>' + (c.reviewCount != null ? c.reviewCount : '—') + '</td>' +
        '<td><a href="' + escapeText(c.url) + '" target="_blank" rel="noopener">source</a> <span class="evidence-tag-sm">' + escapeText(c.confidenceType) + '</span></td></tr>';
    }).join('');
    var table = (mv.comparables || []).length
      ? '<table class="ft-mini"><thead><tr><th>Company</th><th>Country</th><th>Product</th><th>Price</th><th>Stone</th><th>Availability</th><th>Reviews</th><th>Source</th></tr></thead><tbody>' + rows + '</tbody></table>'
      : '<p class="empty-note">No comparables found.</p>';
    return '<div style="margin-bottom:10px;">NZ competition: <strong>' + escapeText(mv.nzCompetitionLevel) + '</strong> · International: <strong>' + escapeText(mv.internationalCompetitionLevel) + '</strong> · Market maturity: <strong>' + escapeText(mv.marketMaturity) + '</strong> · Demand character: <strong>' + escapeText(mv.demandCharacter) + '</strong></div>' +
      table +
      (mv.whitespaceNotes ? '<div class="ft-why-box" style="margin-top:10px;"><span class="k">Whitespace</span>' + escapeText(mv.whitespaceNotes) + '</div>' : '');
  }

  function designDetailHtml(di) {
    if (!di) return '<p class="empty-note">Design intelligence did not complete.</p>';
    var order = ['A', 'B', 'C'];
    var cards = order.map(function (k) {
      var d = di.directions && di.directions[k];
      if (!d) return '';
      var isRec = di.recommendedDirection === k;
      return '<div class="ft-design-card' + (isRec ? ' recommended' : '') + '"><h4>' + k + ' — ' + escapeText(d.label) + (isRec ? ' <span class="evidence-tag-sm">Recommended</span>' : '') + '</h4>' +
        '<div><strong>Form:</strong> ' + escapeText(d.form) + '</div>' +
        '<div><strong>Dimensions:</strong> ' + escapeText(d.dimensions) + (d.capacity ? ' · ' + escapeText(d.capacity) : '') + '</div>' +
        '<div><strong>Handle:</strong> ' + escapeText(d.handle) + (d.coasterSaucer ? ' · ' + escapeText(d.coasterSaucer) : '') + '</div>' +
        '<div><strong>Stones:</strong> ' + escapeText(d.stones) + '</div>' +
        '<div><strong>Manufacturing difficulty:</strong> ' + escapeText(d.manufacturingDifficulty) + '</div>' +
        '<div><strong>Likely customer:</strong> ' + escapeText(d.likelyCustomer) + '</div>' +
        '<div><strong>Advantages:</strong> ' + escapeText((d.advantages || []).join('; ')) + '</div>' +
        '<div><strong>Risks:</strong> ' + escapeText((d.risks || []).join('; ')) + '</div>' +
        '</div>';
    }).join('');
    var clusters = (di.clusters || []).map(function (c) { return '<span class="evidence-tag-sm">' + escapeText(c.pattern) + '</span>'; }).join(' ');
    return (clusters ? '<div style="margin-bottom:10px;">Recurring patterns found: ' + clusters + '</div>' : '') +
      '<div class="ft-design-grid">' + cards + '</div>' +
      (di.recommendedWhy ? '<div class="ft-why-box" style="margin-top:10px;"><span class="k">Why ' + escapeText(di.recommendedDirection) + '</span>' + escapeText(di.recommendedWhy) + '</div>' : '');
  }

  function supplierDetailHtml(suppliers) {
    if (!suppliers || !suppliers.length) return '<p class="empty-note">No supplier candidates found.</p>';
    var rows = suppliers.map(function (s) {
      return '<tr><td>' + escapeText(s.name) + (s.knownFactory ? ' <span class="evidence-tag-sm">Known supplier</span>' : '') + '<div class="muted" style="font-size:11px;">' + escapeText(s.country) + ' · ' + escapeText(s.sourcePlatform) + '</div></td>' +
        '<td>' + s.fastTrackScore + '/100' + (s.missingSubScores && s.missingSubScores.length ? '<div class="muted" style="font-size:10.5px;">missing: ' + escapeText(s.missingSubScores.join(', ')) + '</div>' : '') + '</td>' +
        '<td>' + (s.factoryPriceUSD != null ? money(s.factoryPriceUSD, 'US$') : '—') + '</td>' +
        '<td>' + (s.moq != null ? s.moq : '—') + '</td>' +
        '<td>' + escapeText(s.notes || '') + '</td>' +
        '<td>' + (s.sources && s.sources.length ? s.sources.map(function (src) { return '<a href="' + escapeText(src.url) + '" target="_blank" rel="noopener">' + escapeText(src.title || src.url) + '</a>'; }).join('<br>') : '<span class="muted">None</span>') + '</td></tr>';
    }).join('');
    var questions = suppliers.filter(function (s) { return s.supplierQuestions && s.supplierQuestions.length; })
      .map(function (s) { return '<li><strong>' + escapeText(s.name) + ':</strong> ' + escapeText(s.supplierQuestions.join(' / ')) + '</li>'; }).join('');
    return '<table class="ft-mini"><thead><tr><th>Supplier</th><th>Score</th><th>Factory price</th><th>MOQ</th><th>Notes</th><th>Sources</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      (questions ? '<div style="margin-top:10px;"><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Questions to ask</div><ul style="margin:0;padding-left:18px;font-size:12px;">' + questions + '</ul></div>' : '');
  }

  function economicsDetailHtml(econ) {
    if (!econ) return '<p class="empty-note">Economics could not be modelled.</p>';
    var scenarioRows = ['LOW', 'BASE', 'HIGH'].map(function (name) {
      var s = econ.scenarios && econ.scenarios[name];
      if (!s) return '';
      return '<tr><td>' + name + '</td><td>' + (s.landedCostNZD != null ? money(s.landedCostNZD, 'NZ$') : '—') + '</td><td>' + (s.grossProfitNZD != null ? money(s.grossProfitNZD, 'NZ$') : '—') + '</td><td>' + (s.grossMarginPct != null ? s.grossMarginPct + '%' : '—') + '</td></tr>';
    }).join('');
    var maxLanded = econ.maxAllowableLandedCostByMargin;
    var maxLandedRow = maxLanded ? [60, 65, 70, 75].map(function (m) { return m + '%: ' + money(maxLanded[m], 'NZ$'); }).join(' · ') : '—';
    var reasons = (econ.scenarios && econ.scenarios.BASE && econ.scenarios.BASE.reasons || []).join(' ');
    return '<table class="ft-mini"><thead><tr><th>Scenario</th><th>Landed cost</th><th>Gross profit</th><th>Gross margin</th></tr></thead><tbody>' + scenarioRows + '</tbody></table>' +
      '<div style="margin-top:10px;font-size:12px;"><strong>Max allowable landed cost by margin target:</strong> ' + maxLandedRow + '</div>' +
      (econ.moqCashRequirementUSD != null ? '<div style="margin-top:4px;font-size:12px;"><strong>MOQ cash requirement:</strong> ' + money(econ.moqCashRequirementUSD, 'US$') + '</div>' : '') +
      (reasons ? '<div class="ft-why-box" style="margin-top:10px;">' + escapeText(reasons) + '</div>' : '') +
      (econ.fxRateAssumptionNote ? '<div class="muted" style="font-size:11px;margin-top:6px;font-style:italic;">' + escapeText(econ.fxRateAssumptionNote) + '</div>' : '');
  }

  function riskDetailHtml(risk) {
    if (!risk || !risk.checks) return '<p class="empty-note">Risk assessment did not complete.</p>';
    var rows = risk.checks.map(function (c) {
      return '<tr><td>' + escapeText(c.item) + '</td><td><span class="ft-risk-' + c.severity + '">' + escapeText(c.severity) + '</span></td><td>' + escapeText(c.status) + '</td><td>' + escapeText(c.note) + '</td><td><span class="evidence-tag-sm">' + escapeText(c.evidenceType) + '</span></td></tr>';
    }).join('');
    return '<table class="ft-mini"><thead><tr><th>Item</th><th>Severity</th><th>Status</th><th>Note</th><th>Evidence type</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function fullDetailHtml(a) {
    var s = a.stages || {};
    return '<div class="ft-detail-section"><div class="ft-detail-section-title">Stage 1 — Product extraction</div>' + extractionDetailHtml(s.extraction) + '</div>' +
      '<div class="ft-detail-section"><div class="ft-detail-section-title">Stage 2 — Market validation</div>' + marketDetailHtml(s.marketValidation) + '</div>' +
      '<div class="ft-detail-section"><div class="ft-detail-section-title">Stage 3 — Design intelligence</div>' + designDetailHtml(s.designIntelligence) + '</div>' +
      '<div class="ft-detail-section"><div class="ft-detail-section-title">Stage 4 — Supplier search</div>' + supplierDetailHtml(s.supplierSearch) + '</div>' +
      '<div class="ft-detail-section"><div class="ft-detail-section-title">Stage 5 — Unit economics</div>' + economicsDetailHtml(s.economics) + '</div>' +
      '<div class="ft-detail-section"><div class="ft-detail-section-title">Stage 6 — Risk</div>' + riskDetailHtml(s.risk) + '</div>';
  }

  function cardHtml(a) {
    var title = (a.stages && a.stages.extraction && a.stages.extraction.category) || a.input.productUrl;
    var sub = 'Submitted ' + escapeText(new Date(a.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })) +
      ' · <a href="' + escapeText(a.input.productUrl) + '" target="_blank" rel="noopener">' + escapeText(a.input.productUrl) + '</a>';

    var body;
    if (a.status === 'PENDING') {
      body = '<p class="empty-note">Waiting for the next Fast Track run in GitHub Actions (mode=fast-track) — nothing is spent until that runs.</p>';
    } else if (a.status === 'FAILED') {
      body = '<p class="ft-error-note">Analysis failed: ' + escapeText(a.error || 'Unknown error') + '</p>';
    } else {
      body = decisionCardHtml(a) +
        (a.error ? '<div class="ft-error-note">Some stages did not complete: ' + escapeText(a.error) + '</div>' : '') +
        '<span class="ft-expand-toggle" data-toggle-detail="' + a.id + '">' + (expandedIds[a.id] ? 'Hide full analysis' : 'Show full analysis') + '</span>' +
        '<div class="ft-detail' + (expandedIds[a.id] ? ' open' : '') + '" id="ft-detail-' + a.id + '">' + (expandedIds[a.id] ? fullDetailHtml(a) : '') + '</div>';
    }

    var statusOrDecisionPill = a.status === 'COMPLETE'
      ? '<span class="ft-decision-pill ft-decision-' + a.decision.decision + '">' + a.decision.decision + '</span>'
      : '<span class="ft-status-pill ft-status-' + a.status + '">' + a.status + '</span>';

    return '<div class="ft-card">' +
      '<div class="ft-card-head"><div class="ft-card-title">' + escapeText(title) + '</div>' + statusOrDecisionPill + '</div>' +
      '<div class="ft-card-sub">' + sub + '</div>' +
      body +
      '</div>';
  }

  function render() {
    var el = document.getElementById('ftList');
    if (!analyses.length) { el.innerHTML = '<p class="empty-note">No Fast Track analyses yet — submit a product URL above.</p>'; return; }
    var sorted = analyses.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    el.innerHTML = sorted.map(cardHtml).join('');
  }

  document.getElementById('ftList').addEventListener('click', function (e) {
    var id = e.target.getAttribute('data-toggle-detail');
    if (!id) return;
    expandedIds[id] = !expandedIds[id];
    render();
  });

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  document.getElementById('ftSubmitBtn').addEventListener('click', function () {
    var productUrl = document.getElementById('ftProductUrl').value.trim();
    if (!productUrl) { alert('Product URL is required.'); return; }
    var supplierUrl = document.getElementById('ftSupplierUrl').value.trim();
    var competitorUrls = document.getElementById('ftCompetitorUrls').value.split('\\n').map(function (s) { return s.trim(); }).filter(Boolean);
    var notes = document.getElementById('ftNotes').value.trim();
    var imageFile = document.getElementById('ftImage').files[0];

    var btn = document.getElementById('ftSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    var imagePromise = imageFile ? readFileAsDataUrl(imageFile) : Promise.resolve(null);
    imagePromise.then(function (imageBase64) {
      return fetch('/api/scale-os/fast-track-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl: productUrl, supplierUrl: supplierUrl || null, competitorUrls: competitorUrls, notes: notes || null, imageBase64: imageBase64 }),
      });
    }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.data.error || 'Submit failed');
        analyses.push(r.data.request);
        render();
        document.getElementById('ftProductUrl').value = '';
        document.getElementById('ftSupplierUrl').value = '';
        document.getElementById('ftCompetitorUrls').value = '';
        document.getElementById('ftNotes').value = '';
        document.getElementById('ftImage').value = '';
      })
      .catch(function (err) { alert('Could not submit: ' + err.message); })
      .finally(function () { btn.disabled = false; btn.textContent = 'Submit for Fast Track analysis'; });
  });

  // Pre-fill from a Market Radar "Fast Track Analysis" button, if arrived via
  // ?productUrl=...&notes=... — never auto-submits, James still reviews and clicks.
  (function prefillFromQuery() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('productUrl')) document.getElementById('ftProductUrl').value = params.get('productUrl');
    if (params.get('notes')) document.getElementById('ftNotes').value = params.get('notes');
  })();

  fetch('/api/scale-os/fast-track-data').then(function (res) {
    if (res.status === 401) {
      window.location.href = '/scale-os/login?next=' + encodeURIComponent(window.location.pathname);
      return Promise.reject(new Error('not authenticated'));
    }
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.error || ('Failed to load (status ' + res.status + ')'));
      return data;
    });
  }).then(function (data) {
    analyses = data.analyses || [];
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('ftContent').style.display = 'block';
    render();
  }).catch(function (err) {
    document.getElementById('loadingState').style.display = 'none';
    var errEl = document.getElementById('loadErrorState');
    errEl.textContent = 'Could not load Fast Track — ' + err.message;
    errEl.style.display = 'block';
  });
})();
</script>
`;
