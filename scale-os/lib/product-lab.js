// Product Lab: the "which product should we spend money, attention and time testing next"
// decision tool. Data is stored server-side (see scale-os/lib/store.js) so it persists safely
// and works across devices — the client just talks to /api/scale-os/products.

export const PRODUCT_LAB_STYLE = `
  .lab-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .lab-toolbar-left { display: flex; align-items: center; gap: 12px; }
  .lab-toolbar-actions { display: flex; gap: 8px; align-items: center; }
  .save-status { font-size: 11.5px; }
  .winner-banner {
    border: 1px solid var(--line); border-left: 3px solid var(--teal); background: var(--white);
    border-radius: 6px; padding: 16px 20px; margin-bottom: 18px;
  }
  .winner-banner .label { font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
  .winner-banner .value { font-size: 17px; font-weight: 600; }
  .winner-banner .value .score { color: var(--teal-dark); font-weight: 700; }
  details.legend { margin-bottom: 18px; }
  details.legend summary { cursor: pointer; font-size: 12.5px; color: var(--muted); padding: 4px 0; }
  details.legend summary:hover { color: var(--black); }
  .legend-body { padding: 14px 0 4px; font-size: 12.5px; line-height: 1.7; color: #444; }
  .legend-body h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--teal-dark); margin: 16px 0 6px; }
  .legend-body h4:first-child { margin-top: 0; }
  .legend-body code { background: #EEECE6; padding: 1px 5px; border-radius: 3px; }
  .legend-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px 20px; margin-top: 8px; }
  .evidence-types { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .evidence-tag { font-size: 10.5px; letter-spacing: 0.03em; padding: 3px 9px; border-radius: 20px; background: #EEECE6; color: #555; }
  .empty-state { padding: 40px 20px; text-align: center; color: var(--muted); font-size: 13px; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 6px; background: var(--white); }
  table.lab { border-collapse: collapse; width: 100%; min-width: 3300px; font-size: 12.5px; }
  table.lab th, table.lab td { border-bottom: 1px solid var(--line); border-right: 1px solid #EFEDE7; padding: 0; white-space: nowrap; }
  table.lab thead th {
    position: sticky; top: 56px; background: #F4F2EC; z-index: 5; padding: 9px 10px; text-align: left;
    font-size: 10.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); cursor: pointer;
  }
  table.lab thead th:hover { color: var(--black); }
  table.lab thead th.sorted { color: var(--teal-dark); }
  table.lab thead tr.group-row th { position: sticky; top: 0; background: #EAE7DF; font-size: 9.5px; color: #9A9587; padding: 5px 10px; cursor: default; }
  table.lab td.sticky-col, table.lab th.sticky-col { position: sticky; left: 0; background: #F4F2EC; z-index: 3; min-width: 240px; max-width: 300px; white-space: normal; }
  table.lab tbody td.sticky-col { background: var(--white); box-shadow: 2px 0 0 #EFEDE7; }
  table.lab td.sticky-col2, table.lab th.sticky-col2 { position: sticky; left: 240px; background: #F4F2EC; z-index: 3; min-width: 40px; max-width: 40px; text-align: center; }
  table.lab tbody td.sticky-col2 { background: var(--white); box-shadow: 2px 0 0 #EFEDE7; }
  table.lab tbody tr:hover td { background: #FBFAF7; }
  table.lab tbody tr:hover td.sticky-col, table.lab tbody tr:hover td.sticky-col2 { background: #F7F6F2; }
  table.lab tbody tr.status-killed td { opacity: 0.45; }
  td.computed { color: var(--muted); font-style: italic; background: #FAFAF8; }
  td.score-cell { font-weight: 700; font-style: normal; }
  .missing-note { font-style: italic; color: #B69B6B; }
  .cell-input {
    width: 100%; min-width: 78px; border: 1px solid transparent; background: transparent; font-size: 12.5px;
    padding: 8px 10px; font-family: inherit; color: inherit; border-radius: 3px;
  }
  .cell-input:hover { border-color: var(--line); }
  .cell-input:focus { outline: none; border-color: var(--teal); background: #fff; }
  select.cell-input { cursor: pointer; }
  textarea.cell-input { resize: vertical; min-height: 34px; white-space: normal; }
  input.cell-input[type=number] { min-width: 74px; }
  input.name-input { font-weight: 600; font-size: 13px; }
  .row-actions { padding: 6px !important; text-align: center; }
  .del-btn { background: none; border: none; color: #C6C2B8; font-size: 15px; cursor: pointer; line-height: 1; padding: 6px; }
  .del-btn:hover { color: var(--red); }
  .expand-btn { background: none; border: none; cursor: pointer; font-size: 13px; color: var(--muted); width: 100%; padding: 10px 0; }
  .expand-btn:hover { color: var(--black); }
  select.status-select { font-weight: 700; border-radius: 20px; text-align: center; text-align-last: center; padding-left: 12px; padding-right: 12px; }
  .status-Idea, select.status-Idea { background: #EEECE6; color: #8A8577; }
  .status-Researching, select.status-Researching { background: #E3ECEC; color: #4E7376; }
  .status-Sampling, select.status-Sampling { background: #E9E2CC; color: #8A6A2A; }
  .status-Testing, select.status-Testing { background: #DCE9E9; color: #3F7377; }
  .status-Validated, select.status-Validated { background: #DCEAE0; color: #2E7D4F; }
  .status-Scaling, select.status-Scaling { background: #111111; color: #fff; }
  .status-Killed { background: #F1E4DF; color: #A05B44; }
  .storage-note { font-size: 11.5px; color: var(--muted); margin-top: 14px; line-height: 1.6; }

  tr.me-row td { background: #F7F6F2; padding: 20px 26px; border-right: none; white-space: normal; }
  .me-panel { max-width: 1180px; }
  .me-panel-head { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--black); margin-bottom: 4px; }
  .me-panel-sub { font-size: 11.5px; color: var(--muted); margin-bottom: 16px; }
  .me-section { margin-bottom: 18px; }
  .me-section:last-child { margin-bottom: 0; }
  .me-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--teal-dark); margin-bottom: 8px; }
  .me-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px 20px; }
  .me-field { display: flex; flex-direction: column; gap: 4px; }
  .me-label { font-size: 11px; color: var(--muted); }
  .me-input { border: 1px solid var(--line); background: #fff; border-radius: 4px; padding: 7px 9px; font-size: 12.5px; font-family: inherit; }
  textarea.me-input { resize: vertical; min-height: 40px; }
  .me-pair { display: flex; gap: 6px; }
  .me-pair select.me-rating { max-width: 64px; flex: none; }
  .me-pair select.me-type { flex: 1; }
`;

export const PRODUCT_LAB_BODY = `
  <h1>Product Lab</h1>
  <p class="page-sub">Based on the evidence we currently have, which product deserves Prime Piece's next $1,000 of money and attention?</p>

  <div id="winnerBanner" class="winner-banner" style="display:none;">
    <div class="label">Highest-scored active product</div>
    <div class="value" id="winnerValue">—</div>
  </div>

  <details class="legend">
    <summary>How scoring, unit economics and market evidence work — read before entering data</summary>
    <div class="legend-body">
      <h4>Unit economics</h4>
      <p><strong>Contribution profit before advertising</strong> = Selling price − total landed cost − packaging − fulfilment/customer freight − payment fees − expected damage/returns allowance. It only calculates once <em>all seven</em> of those inputs are known — a missing cost is never assumed to be $0, so you'll see "— · n/7 costs" until every input is entered.</p>
      <p><strong>Contribution margin %</strong> = contribution profit ÷ selling price. <strong>Break-even CAC</strong> is the same number as contribution profit — the most you could spend acquiring one customer and still break even before fixed costs. <strong>Target CAC</strong> is a number you set yourself, with margin built in below break-even — there's no formula for it, so it's a plain manual entry.</p>

      <h4>Overall score — 8 areas</h4>
      <p>Unit Economics, Market Demand Evidence, Differentiation, Content Potential, Freight Risk, Damage Risk, Trade Potential, and Competition/Saturation. The score is the average of whichever areas actually have data — shown as e.g. "64 · 6/8 areas" — never presented as complete when it isn't. Confidence (Low/Medium/High) is shown alongside the score, not blended into it, so you can judge for yourself how much to trust it.</p>
      <p><strong>Unit Economics</strong> is derived automatically from Contribution Margin %: below 0% → 1, 0–14% → 2, 15–29% → 3, 30–44% → 4, 45%+ → 5. <strong>Market Demand Evidence</strong> comes from "Apparent market demand" in that product's Market Evidence panel below — there's no separate demand field in the main table anymore.</p>

      <h4>Evidence types</h4>
      <p>Every rated signal in Market Evidence must be labelled with what kind of evidence it actually is. Do not claim a competitor product is selling well unless there is genuine evidence for it.</p>
      <div class="evidence-types">
        <span class="evidence-tag">FACT — directly observed or confirmed (Prime Piece's own data, a supplier quote, a published number)</span>
        <span class="evidence-tag">PROXY / SIGNAL — an indirect indicator (bestseller label, high review volume, stocked by multiple retailers, strong search demand)</span>
        <span class="evidence-tag">ESTIMATE — a reasoned calculation from available data</span>
        <span class="evidence-tag">FOUNDER ASSUMPTION — a judgment call with no external evidence yet</span>
      </div>
    </div>
  </details>

  <div id="loadingState" class="empty-state">Loading products…</div>
  <div id="loadErrorState" class="empty-state" style="display:none;"></div>

  <div id="labContent" style="display:none;">
    <div class="lab-toolbar">
      <div class="lab-toolbar-left">
        <div class="muted" id="rowCount" style="font-size:12.5px;"></div>
        <span id="saveStatus" class="save-status muted"></span>
      </div>
      <div class="lab-toolbar-actions">
        <button class="btn btn--ghost btn--small" id="importBtn">Import JSON</button>
        <input type="file" id="importFile" accept="application/json" style="display:none;">
        <button class="btn btn--ghost btn--small" id="exportBtn">Export JSON</button>
        <button class="btn btn--teal" id="addBtn">+ Add product</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="lab" id="labTable">
        <thead>
          <tr class="group-row">
            <th class="sticky-col"></th>
            <th class="sticky-col2"></th>
            <th colspan="2">Identity</th>
            <th colspan="6">Landed Cost &amp; Margin</th>
            <th colspan="8">Contribution Economics</th>
            <th colspan="6">Scoring (1–5)</th>
            <th colspan="4">Evidence &amp; Notes</th>
            <th>Status</th>
            <th></th>
          </tr>
          <tr id="headerRow"></tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
    <div id="emptyState" class="empty-state" style="display:none;">No products yet. Click "+ Add product" to start.</div>

    <p class="storage-note">Product data is stored in a shared database and syncs across devices. Use <strong>Export JSON</strong> occasionally as a manual backup.</p>
  </div>
`;

export const PRODUCT_LAB_SCRIPT = `
<script>
(function () {
  var STATUS_OPTIONS = ['Idea', 'Researching', 'Sampling', 'Testing', 'Validated', 'Scaling', 'Killed'];
  var CONFIDENCE_OPTIONS = ['Low', 'Medium', 'High'];
  var ACTIVE_STATUSES = ['Idea', 'Researching', 'Sampling', 'Testing'];
  var EVIDENCE_TYPE_OPTIONS = ['Fact', 'Proxy / Signal', 'Estimate', 'Founder Assumption'];

  var SCALE_5 = [
    { v: '', l: '—' }, { v: '1', l: '1' }, { v: '2', l: '2' }, { v: '3', l: '3' }, { v: '4', l: '4' }, { v: '5', l: '5' }
  ];

  // Column definitions drive both header + row rendering for the main comparison table.
  var COLUMNS = [
    { id: 'name', label: 'Product name', type: 'text', sticky: 1, width: 240 },
    { id: '__toggle', label: '', type: 'toggle', sticky: 2, width: 40 },
    { id: 'category', label: 'Category', type: 'text', width: 130 },
    { id: 'supplier', label: 'Supplier', type: 'text', width: 130 },

    { id: 'supplierCost', label: 'Supplier cost', type: 'number', width: 100 },
    { id: 'freightCost', label: 'Freight / landed', type: 'number', width: 110 },
    { id: 'totalLandedCost', label: 'Total landed cost', type: 'computed', width: 120 },
    { id: 'sellingPrice', label: 'Selling price', type: 'number', width: 100 },
    { id: 'grossProfit', label: 'Gross profit', type: 'computed', width: 100 },
    { id: 'grossMarginPct', label: 'Gross margin %', type: 'computed', width: 100 },

    { id: 'packagingCost', label: 'Packaging cost', type: 'number', width: 100 },
    { id: 'fulfilmentFreightCost', label: 'Fulfilment / customer freight', type: 'number', width: 130 },
    { id: 'paymentFeesCost', label: 'Payment processing fees', type: 'number', width: 120 },
    { id: 'damageReturnsAllowance', label: 'Damage / returns allowance', type: 'number', width: 130 },
    { id: 'contributionProfit', label: 'Contribution profit', type: 'computed', width: 150 },
    { id: 'contributionMarginPct', label: 'Contribution margin %', type: 'computed', width: 130 },
    { id: 'breakEvenCAC', label: 'Break-even CAC', type: 'computed', width: 110 },
    { id: 'targetCAC', label: 'Target CAC', type: 'number', width: 100 },

    { id: 'differentiation', label: 'Differentiation', type: 'scale', title: 'How different this is from what is already on the market. 5 = highly differentiated.' },
    { id: 'contentPotential', label: 'Content potential', type: 'scale', title: 'How well it photographs/films — visual & content marketing potential. 5 = excellent.' },
    { id: 'freightRisk', label: 'Freight risk', type: 'scale', invert: true, title: 'Risk of cost blowouts, delay or damage in freight. 5 = high risk.' },
    { id: 'damageRisk', label: 'Damage risk', type: 'scale', invert: true, title: 'Risk of breakage/damage in handling & shipping. 5 = high risk.' },
    { id: 'tradePotential', label: 'Trade potential', type: 'scale', title: 'Appeal to designers, architects, trade/wholesale buyers. 5 = strong appeal.' },
    { id: 'competition', label: 'Competition / saturation', type: 'scale', invert: true, title: 'How saturated / competitive this category is. 5 = highly saturated.' },

    { id: 'overallScore', label: 'Overall score', type: 'computed', width: 160 },
    { id: 'evidenceSource', label: 'Evidence source', type: 'textarea', width: 170 },
    { id: 'confidence', label: 'Confidence', type: 'select', options: CONFIDENCE_OPTIONS, width: 100 },
    { id: 'notes', label: 'Notes', type: 'textarea', width: 200 },
    { id: 'status', label: 'Status', type: 'status', width: 130 },
  ];

  var COMPUTED_IDS = COLUMNS.filter(function (c) { return c.type === 'computed'; }).map(function (c) { return c.id; });

  // Market Evidence — a per-product research panel, not columns (16 fields would blow out the table).
  var ME_SECTIONS = [
    { title: 'Competitive landscape', fields: [
      { id: 'me_comparableCompetitors', label: 'Comparable competitors', type: 'textarea', placeholder: 'e.g. Brand X vessel basin range, Brand Y stone bath collection' },
      { id: 'me_comparableRetailPrices', label: 'Comparable retail prices', type: 'text', placeholder: 'e.g. $850–$1,600 across 4 competitors' },
    ] },
    { title: 'Demand signals', fields: [
      { id: 'me_apparentMarketDemand', label: 'Apparent market demand', type: 'scaleType' },
      { id: 'me_searchDemandEvidence', label: 'Search demand evidence', type: 'textarea', placeholder: 'e.g. Google Trends, keyword volume, marketplace search data' },
    ] },
    { title: 'Review signals', fields: [
      { id: 'me_competitorReviewVolume', label: 'Competitor review volume', type: 'text', placeholder: 'e.g. ~120 reviews across top 3 competitors' },
      { id: 'me_positiveReviewThemes', label: 'Common positive review themes', type: 'textarea' },
      { id: 'me_customerComplaints', label: 'Common customer complaints', type: 'textarea' },
    ] },
    { title: 'Distribution & trade signals', fields: [
      { id: 'me_stockedAcrossRetailers', label: 'Products/styles repeatedly stocked across retailers', type: 'textarea' },
      { id: 'me_usedByDesigners', label: 'Products/styles repeatedly used by designers/specifiers', type: 'textarea' },
    ] },
    { title: 'Trend & saturation', fields: [
      { id: 'me_visualTrendStrength', label: 'Visual trend strength', type: 'scaleType' },
      { id: 'me_categorySaturation', label: 'Apparent category saturation', type: 'scaleType' },
      { id: 'me_marketGap', label: 'Potential market gap', type: 'textarea' },
    ] },
    { title: 'Sources & confidence', fields: [
      { id: 'me_evidenceSources', label: 'Evidence sources', type: 'textarea', placeholder: 'Where each claim above came from — links, publications, retailer names' },
      { id: 'me_confidenceLevel', label: 'Confidence level', type: 'select', options: CONFIDENCE_OPTIONS },
      { id: 'me_dateLastResearched', label: 'Date last researched', type: 'date' },
      { id: 'me_keyTakeaway', label: 'Key takeaway', type: 'textarea', placeholder: 'One sentence: what does this evidence mean for Prime Piece?' },
    ] },
  ];

  function uid() { return 'p_' + Math.random().toString(36).slice(2, 10); }

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

  function unitEconomicsBand(marginPct) {
    if (marginPct === null || marginPct === undefined) return null;
    if (marginPct < 0) return 1;
    if (marginPct < 15) return 2;
    if (marginPct < 30) return 3;
    if (marginPct < 45) return 4;
    return 5;
  }

  // The 8 scored areas. Each resolves to a 1-5 value (or null if not yet known) and is
  // normalized to 0-100, inverted for risk-type areas, then averaged across whichever
  // areas actually have data.
  var SCORE_AREAS = [
    { id: 'unitEconomics', invert: false, getValue: function (row, ctx) { return unitEconomicsBand(ctx.contributionMarginPct); } },
    { id: 'marketDemand', invert: false, getValue: function (row) { return num(row.me_apparentMarketDemand); } },
    { id: 'differentiation', invert: false, getValue: function (row) { return num(row.differentiation); } },
    { id: 'contentPotential', invert: false, getValue: function (row) { return num(row.contentPotential); } },
    { id: 'freightRisk', invert: true, getValue: function (row) { return num(row.freightRisk); } },
    { id: 'damageRisk', invert: true, getValue: function (row) { return num(row.damageRisk); } },
    { id: 'tradePotential', invert: false, getValue: function (row) { return num(row.tradePotential); } },
    { id: 'competition', invert: true, getValue: function (row) { return num(row.competition); } },
  ];

  function computeRow(row) {
    var supplierCost = num(row.supplierCost);
    var freightCost = num(row.freightCost);
    var sellingPrice = num(row.sellingPrice);
    var packagingCost = num(row.packagingCost);
    var fulfilmentFreightCost = num(row.fulfilmentFreightCost);
    var paymentFeesCost = num(row.paymentFeesCost);
    var damageReturnsAllowance = num(row.damageReturnsAllowance);

    var totalLandedCost = (supplierCost !== null || freightCost !== null)
      ? (supplierCost || 0) + (freightCost || 0)
      : null;

    var grossProfit = (sellingPrice !== null && totalLandedCost !== null) ? sellingPrice - totalLandedCost : null;
    var grossMarginPct = (grossProfit !== null && sellingPrice) ? (grossProfit / sellingPrice) * 100 : null;

    var contributionInputs = [sellingPrice, supplierCost, freightCost, packagingCost, fulfilmentFreightCost, paymentFeesCost, damageReturnsAllowance];
    var contributionKnownCount = contributionInputs.filter(function (v) { return v !== null; }).length;
    var contributionComplete = contributionKnownCount === contributionInputs.length;
    var contributionProfit = contributionComplete
      ? sellingPrice - supplierCost - freightCost - packagingCost - fulfilmentFreightCost - paymentFeesCost - damageReturnsAllowance
      : null;
    var contributionMarginPct = (contributionProfit !== null && sellingPrice) ? (contributionProfit / sellingPrice) * 100 : null;
    var breakEvenCAC = contributionProfit;

    var scoredCount = 0;
    var scoreSum = 0;
    SCORE_AREAS.forEach(function (area) {
      var v = area.getValue(row, { contributionMarginPct: contributionMarginPct });
      if (v === null) return;
      scoredCount++;
      scoreSum += area.invert ? ((6 - v) / 5) * 100 : (v / 5) * 100;
    });
    var overallScore = scoredCount ? Math.round(scoreSum / scoredCount) : null;

    return {
      totalLandedCost: totalLandedCost,
      grossProfit: grossProfit,
      grossMarginPct: grossMarginPct,
      contributionProfit: contributionProfit,
      contributionKnownCount: contributionKnownCount,
      contributionMarginPct: contributionMarginPct,
      breakEvenCAC: breakEvenCAC,
      overallScore: overallScore,
      scoredCount: scoredCount,
      confidence: row.confidence || '',
    };
  }

  function computedCellContent(id, computed) {
    if (id === 'totalLandedCost') return money(computed.totalLandedCost);
    if (id === 'grossProfit') return money(computed.grossProfit);
    if (id === 'grossMarginPct') return pct(computed.grossMarginPct);
    if (id === 'contributionProfit') {
      if (computed.contributionProfit === null) return '<span class="missing-note">— · ' + computed.contributionKnownCount + '/7 costs</span>';
      return money(computed.contributionProfit);
    }
    if (id === 'contributionMarginPct') return pct(computed.contributionMarginPct);
    if (id === 'breakEvenCAC') return computed.breakEvenCAC === null ? '—' : money(computed.breakEvenCAC);
    if (id === 'overallScore') {
      if (computed.overallScore === null) return '—';
      var conf = computed.confidence ? ' · ' + computed.confidence + ' confidence' : '';
      return computed.overallScore + ' · ' + computed.scoredCount + '/8 areas' + conf;
    }
    return '—';
  }

  var state = [];
  var expandedIds = {};
  var sortKey = 'overallScore';
  var sortDir = 'desc';

  function headerRowHtml() {
    return COLUMNS.map(function (col) {
      var w = col.width ? ' style="min-width:' + col.width + 'px;"' : '';
      var stickyClass = col.sticky === 1 ? ' sticky-col' : col.sticky === 2 ? ' sticky-col2' : '';
      var sortedClass = col.id === sortKey ? ' sorted' : '';
      var arrow = col.id === sortKey ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';
      var title = col.title ? ' title="' + col.title.replace(/"/g, '&quot;') + '"' : '';
      var sortAttr = col.type === 'toggle' ? '' : ' data-sort="' + col.id + '"';
      return '<th class="' + stickyClass.trim() + sortedClass + '"' + w + title + sortAttr + '>' + col.label + arrow + '</th>';
    }).join('') + '<th style="min-width:36px;"></th>';
  }

  function cellHtml(row, col, computed) {
    var val = row[col.id];
    if (col.type === 'toggle') {
      var expanded = !!expandedIds[row.id];
      return '<td class="sticky-col2"><button class="expand-btn" data-toggle="' + row.id + '" title="Market Evidence">' + (expanded ? '▾' : '▸') + '</button></td>';
    }
    if (col.type === 'computed') {
      var extraClass = col.id === 'overallScore' ? ' score-cell' : '';
      return '<td class="computed' + extraClass + '">' + computedCellContent(col.id, computed) + '</td>';
    }
    if (col.type === 'text') {
      var cls = col.id === 'name' ? 'cell-input name-input' : 'cell-input';
      return '<td class="' + (col.sticky === 1 ? 'sticky-col' : '') + '"><input class="' + cls + '" type="text" value="' + escapeAttr(val || '') + '" data-field="' + col.id + '" data-id="' + row.id + '"></td>';
    }
    if (col.type === 'number') {
      return '<td><input class="cell-input" type="number" step="0.01" min="0" value="' + (val === undefined || val === null ? '' : val) + '" data-field="' + col.id + '" data-id="' + row.id + '"></td>';
    }
    if (col.type === 'textarea') {
      return '<td><textarea class="cell-input" rows="1" data-field="' + col.id + '" data-id="' + row.id + '">' + escapeText(val || '') + '</textarea></td>';
    }
    if (col.type === 'select') {
      var opts = ['<option value="">—</option>'].concat(col.options.map(function (o) {
        return '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>';
      }));
      return '<td><select class="cell-input" data-field="' + col.id + '" data-id="' + row.id + '">' + opts.join('') + '</select></td>';
    }
    if (col.type === 'scale') {
      var opts2 = SCALE_5.map(function (o) {
        var selected = String(val || '') === o.v ? ' selected' : '';
        return '<option value="' + o.v + '"' + selected + '>' + o.l + '</option>';
      });
      return '<td><select class="cell-input" data-field="' + col.id + '" data-id="' + row.id + '">' + opts2.join('') + '</select></td>';
    }
    if (col.type === 'status') {
      var opts3 = STATUS_OPTIONS.map(function (o) {
        return '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>';
      });
      var statusClass = 'status-select status-' + (val || 'Idea');
      return '<td><select class="cell-input ' + statusClass + '" data-field="' + col.id + '" data-id="' + row.id + '">' + opts3.join('') + '</select></td>';
    }
    return '<td></td>';
  }

  function meFieldHtml(row, f) {
    var val = row[f.id];
    var ph = f.placeholder ? ' placeholder="' + escapeAttr(f.placeholder) + '"' : '';
    if (f.type === 'text') {
      return '<input class="cell-input me-input" type="text" value="' + escapeAttr(val || '') + '"' + ph + ' data-field="' + f.id + '" data-id="' + row.id + '">';
    }
    if (f.type === 'textarea') {
      return '<textarea class="cell-input me-input" rows="2"' + ph + ' data-field="' + f.id + '" data-id="' + row.id + '">' + escapeText(val || '') + '</textarea>';
    }
    if (f.type === 'date') {
      return '<input class="cell-input me-input" type="date" value="' + escapeAttr(val || '') + '" data-field="' + f.id + '" data-id="' + row.id + '">';
    }
    if (f.type === 'select') {
      var opts = ['<option value="">—</option>'].concat(f.options.map(function (o) {
        return '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>';
      }));
      return '<select class="cell-input me-input" data-field="' + f.id + '" data-id="' + row.id + '">' + opts.join('') + '</select>';
    }
    if (f.type === 'scaleType') {
      var typeVal = row[f.id + 'Type'];
      var ratingOpts = SCALE_5.map(function (o) {
        return '<option value="' + o.v + '"' + (String(val || '') === o.v ? ' selected' : '') + '>' + o.l + '</option>';
      });
      var typeOpts = ['<option value="">— type —</option>'].concat(EVIDENCE_TYPE_OPTIONS.map(function (o) {
        return '<option value="' + o + '"' + (typeVal === o ? ' selected' : '') + '>' + o + '</option>';
      }));
      return '<div class="me-pair"><select class="cell-input me-input me-rating" data-field="' + f.id + '" data-id="' + row.id + '">' + ratingOpts.join('') + '</select>' +
        '<select class="cell-input me-input me-type" data-field="' + f.id + 'Type" data-id="' + row.id + '">' + typeOpts.join('') + '</select></div>';
    }
    return '';
  }

  function renderMEPanel(row) {
    var sections = ME_SECTIONS.map(function (sec) {
      var fields = sec.fields.map(function (f) {
        return '<div class="me-field"><label class="me-label">' + f.label + '</label>' + meFieldHtml(row, f) + '</div>';
      }).join('');
      return '<div class="me-section"><div class="me-section-title">' + sec.title + '</div><div class="me-grid">' + fields + '</div></div>';
    }).join('');
    var colspan = COLUMNS.length + 1;
    return '<tr class="me-row" data-me-row="' + row.id + '"><td colspan="' + colspan + '">' +
      '<div class="me-panel"><div class="me-panel-head">Market Evidence — ' + escapeText(row.name || 'Untitled product') + '</div>' +
      '<div class="me-panel-sub">Learn from the wider market before we have enough of our own sales data. Label every signal honestly — see the legend above.</div>' +
      sections + '</div></td></tr>';
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
  function escapeText(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function sortedRows() {
    var rows = state.slice();
    rows.forEach(function (r) { r._computed = computeRow(r); });
    rows.sort(function (a, b) {
      var av, bv;
      if (COMPUTED_IDS.indexOf(sortKey) !== -1) {
        av = a._computed[sortKey]; bv = b._computed[sortKey];
      } else {
        av = a[sortKey]; bv = b[sortKey];
      }
      var aEmpty = av === null || av === undefined || av === '';
      var bEmpty = bv === null || bv === undefined || bv === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      if (typeof av === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return rows;
  }

  function render() {
    document.getElementById('headerRow').innerHTML = headerRowHtml();
    var rows = sortedRows();
    var body = document.getElementById('tableBody');
    var empty = document.getElementById('emptyState');
    var wrap = document.getElementById('labTable');

    document.getElementById('rowCount').textContent = state.length + (state.length === 1 ? ' product' : ' products');

    if (!rows.length) {
      wrap.style.display = 'none';
      empty.style.display = 'block';
    } else {
      wrap.style.display = '';
      empty.style.display = 'none';
      body.innerHTML = rows.map(function (row) {
        var cells = COLUMNS.map(function (col) { return cellHtml(row, col, row._computed); }).join('');
        var delCell = '<td class="row-actions"><button class="del-btn" data-del="' + row.id + '" title="Delete">×</button></td>';
        var statusClass = row.status === 'Killed' ? ' status-killed' : '';
        var mainRow = '<tr class="' + statusClass + '">' + cells + delCell + '</tr>';
        var panelRow = expandedIds[row.id] ? renderMEPanel(row) : '';
        return mainRow + panelRow;
      }).join('');
    }

    refreshBannerOnly();
  }

  function refreshComputedCellsForRow(id, computed) {
    var row = document.querySelector('tr:has(input[data-id="' + id + '"]), tr:has(select[data-id="' + id + '"]), tr:has(textarea[data-id="' + id + '"])');
    // :has() may be unsupported in older browsers — fall back to full render if so.
    if (!row) { render(); return; }
    var cells = row.querySelectorAll('td.computed');
    COMPUTED_IDS.forEach(function (cid, i) {
      if (cells[i]) cells[i].innerHTML = computedCellContent(cid, computed);
    });
  }

  function refreshBannerOnly() {
    var rows = state.slice();
    rows.forEach(function (r) { r._computed = r._computed || computeRow(r); });
    var active = rows.filter(function (r) { return ACTIVE_STATUSES.indexOf(r.status || 'Idea') !== -1 && r._computed.overallScore !== null; });
    active.sort(function (a, b) { return b._computed.overallScore - a._computed.overallScore; });
    var banner = document.getElementById('winnerBanner');
    var valueEl = document.getElementById('winnerValue');
    if (active.length) {
      var top = active[0];
      var conf = top.confidence ? ', ' + top.confidence + ' confidence' : '';
      banner.style.display = 'block';
      valueEl.innerHTML = (top.name || 'Untitled product') + ' — <span class="score">' + top._computed.overallScore + '</span> (' + top._computed.scoredCount + '/8 areas scored' + conf + ')';
    } else {
      banner.style.display = 'none';
    }
  }

  function updateField(id, field, value) {
    var row = state.filter(function (r) { return r.id === id; })[0];
    if (!row) return;
    row[field] = value;
    scheduleSave();
  }

  document.getElementById('tableBody').addEventListener('input', function (e) {
    var t = e.target;
    var field = t.getAttribute('data-field');
    var id = t.getAttribute('data-id');
    if (!field || !id) return;
    updateField(id, field, t.value);
    var row = state.filter(function (r) { return r.id === id; })[0];
    var computed = computeRow(row);
    row._computed = computed;
    refreshComputedCellsForRow(id, computed);
    refreshBannerOnly();
  });

  document.getElementById('tableBody').addEventListener('change', function (e) {
    var t = e.target;
    if (t.tagName === 'SELECT') render();
  });

  document.getElementById('tableBody').addEventListener('click', function (e) {
    var toggleId = e.target.getAttribute('data-toggle');
    if (toggleId) {
      if (expandedIds[toggleId]) delete expandedIds[toggleId]; else expandedIds[toggleId] = true;
      render();
      return;
    }
    var delId = e.target.getAttribute('data-del');
    if (!delId) return;
    var row = state.filter(function (r) { return r.id === delId; })[0];
    var label = row && row.name ? row.name : 'this product';
    if (confirm('Delete "' + label + '"? This cannot be undone.')) {
      state = state.filter(function (r) { return r.id !== delId; });
      delete expandedIds[delId];
      render();
      persistProducts();
    }
  });

  document.getElementById('headerRow').addEventListener('click', function (e) {
    var key = e.target.getAttribute('data-sort');
    if (!key) return;
    if (sortKey === key) {
      sortDir = sortDir === 'desc' ? 'asc' : 'desc';
    } else {
      sortKey = key;
      sortDir = 'desc';
    }
    render();
  });

  document.getElementById('addBtn').addEventListener('click', function () {
    state.push({ id: uid(), name: '', status: 'Idea' });
    render();
    persistProducts();
  });

  function stripComputed(r) {
    var copy = {};
    Object.keys(r).forEach(function (k) { if (k !== '_computed') copy[k] = r[k]; });
    return copy;
  }

  document.getElementById('exportBtn').addEventListener('click', function () {
    var clean = state.map(stripComputed);
    var blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'prime-piece-product-lab-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importBtn').addEventListener('click', function () {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error('not an array');
        if (confirm('Import ' + parsed.length + ' product(s)? This replaces all current Product Lab data for everyone.')) {
          state = parsed;
          render();
          persistProducts();
        }
      } catch (err) {
        alert('Could not read that file — expected a Product Lab JSON export.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // --- Server persistence ---

  function setSaveStatus(kind, message) {
    var el = document.getElementById('saveStatus');
    if (!el) return;
    if (kind === 'pending') el.textContent = 'Unsaved changes…';
    else if (kind === 'saving') el.textContent = 'Saving…';
    else if (kind === 'saved') el.textContent = 'Saved';
    else if (kind === 'error') el.textContent = 'Save failed — ' + (message || 'check connection');
  }

  var saveTimer = null;
  function scheduleSave() {
    setSaveStatus('pending');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(persistProducts, 700);
  }

  function persistProducts() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    setSaveStatus('saving');
    var clean = state.map(stripComputed);
    fetch('/api/scale-os/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: clean }),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Save failed');
        setSaveStatus('saved');
      });
    }).catch(function (err) {
      setSaveStatus('error', err.message);
    });
  }

  // If a debounced save is still pending when the tab closes/navigates away, flush it with
  // sendBeacon — a normal fetch can be cancelled mid-flight by navigation, sendBeacon is built
  // to survive it. Prevents losing the last few keystrokes of an edit.
  window.addEventListener('beforeunload', function () {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    var clean = state.map(stripComputed);
    var blob = new Blob([JSON.stringify({ products: clean })], { type: 'application/json' });
    navigator.sendBeacon('/api/scale-os/products', blob);
  });

  function fetchProducts() {
    return fetch('/api/scale-os/products').then(function (res) {
      if (res.status === 401) {
        window.location.href = '/scale-os/login?next=' + encodeURIComponent(window.location.pathname);
        return Promise.reject(new Error('not authenticated'));
      }
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || ('Failed to load (status ' + res.status + ')'));
        return data.products || [];
      });
    });
  }

  fetchProducts().then(function (products) {
    state = products;
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('labContent').style.display = 'block';
    render();
  }).catch(function (err) {
    document.getElementById('loadingState').style.display = 'none';
    var errEl = document.getElementById('loadErrorState');
    errEl.textContent = 'Could not load Product Lab data — ' + err.message;
    errEl.style.display = 'block';
  });
})();
</script>
`;
