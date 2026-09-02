// Product Lab: the "which product should we spend money, attention and time testing next"
// decision tool. Data lives in the browser (localStorage) — there is no backend database yet,
// which is deliberate: this is a solo-founder tool for a pre-scale business, not infrastructure
// for imaginary scale. Export/Import JSON is the backup + cross-device path until real order/ad
// data justifies a proper database.

export const PRODUCT_LAB_STYLE = `
  .lab-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .lab-toolbar-actions { display: flex; gap: 8px; align-items: center; }
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
  .legend-body code { background: #EEECE6; padding: 1px 5px; border-radius: 3px; }
  .legend-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px 20px; margin-top: 8px; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 6px; background: var(--white); }
  table.lab { border-collapse: collapse; width: 100%; min-width: 2200px; font-size: 12.5px; }
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
  table.lab tbody tr:hover td { background: #FBFAF7; }
  table.lab tbody tr:hover td.sticky-col { background: #F7F6F2; }
  table.lab tbody tr.status-killed td { opacity: 0.45; }
  td.computed { color: var(--muted); font-style: italic; background: #FAFAF8; }
  td.score-cell { font-weight: 700; }
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
  select.status-select { font-weight: 700; border-radius: 20px; text-align: center; text-align-last: center; padding-left: 12px; padding-right: 12px; }
  .status-Idea, select.status-Idea { background: #EEECE6; color: #8A8577; }
  .status-Researching, select.status-Researching { background: #E3ECEC; color: #4E7376; }
  .status-Sampling, select.status-Sampling { background: #E9E2CC; color: #8A6A2A; }
  .status-Testing, select.status-Testing { background: #DCE9E9; color: #3F7377; }
  .status-Validated, select.status-Validated { background: #DCEAE0; color: #2E7D4F; }
  .status-Scaling, select.status-Scaling { background: #111111; color: #fff; }
  .status-Killed { background: #F1E4DF; color: #A05B44; }
  .storage-note { font-size: 11.5px; color: var(--muted); margin-top: 14px; line-height: 1.6; }
  .empty-state { padding: 40px 20px; text-align: center; color: var(--muted); font-size: 13px; }
`;

export const PRODUCT_LAB_BODY = `
  <h1>Product Lab</h1>
  <p class="page-sub">Which product should Prime Piece spend money, attention and time testing next?</p>

  <div id="winnerBanner" class="winner-banner" style="display:none;">
    <div class="label">Highest-scored active product</div>
    <div class="value" id="winnerValue">—</div>
  </div>

  <details class="legend">
    <summary>How scoring works — read before scoring products</summary>
    <div class="legend-body">
      <p><strong>Total landed cost</strong>, <strong>gross profit</strong>, <strong>gross margin %</strong> and <strong>overall score</strong> are calculated automatically — you never enter them directly.</p>
      <p><strong>Overall score</strong> is the average of whichever of the 7 rated factors below you've filled in (shown as e.g. "64 · 5/7 scored"), so a score is never based on assumed data — only on what's actually been rated. Leave a factor blank if you don't know it yet.</p>
      <div class="legend-grid">
        <div><strong>Demand, Differentiation, Content Potential, Trade Potential</strong> — rate 1–5, higher is better.</div>
        <div><strong>Freight Risk, Damage Risk, Competition</strong> — rate 1–5, higher is worse (inverted automatically in the score).</div>
      </div>
      <p style="margin-top:10px;">Every score must be backed by an <strong>Evidence Source</strong> (e.g. "Meta Ads actual data", "Supplier quote", "Competitor research", "Founder estimate") and a <strong>Confidence</strong> level. Unlabelled guesses are not data — if you don't know it, leave it blank.</p>
    </div>
  </details>

  <div class="lab-toolbar">
    <div class="muted" id="rowCount" style="font-size:12.5px;"></div>
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
          <th colspan="2">Identity</th>
          <th colspan="6">Economics</th>
          <th colspan="7">Scoring (1–5)</th>
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

  <p class="storage-note">Data is stored only in this browser (localStorage) — it is not sent to any server. Use <strong>Export JSON</strong> regularly to back up, or to move data to another device.</p>
`;

export const PRODUCT_LAB_SCRIPT = `
<script>
(function () {
  var STORAGE_KEY = 'primepiece_scale_os_products_v1';

  var STATUS_OPTIONS = ['Idea', 'Researching', 'Sampling', 'Testing', 'Validated', 'Scaling', 'Killed'];
  var CONFIDENCE_OPTIONS = ['Low', 'Medium', 'High'];
  var ACTIVE_STATUSES = ['Idea', 'Researching', 'Sampling', 'Testing'];

  var SCALE_5 = [
    { v: '', l: '—' }, { v: '1', l: '1' }, { v: '2', l: '2' }, { v: '3', l: '3' }, { v: '4', l: '4' }, { v: '5', l: '5' }
  ];

  // Column definitions drive both header + row rendering.
  var COLUMNS = [
    { id: 'name', label: 'Product name', type: 'text', sticky: true, width: 240 },
    { id: 'category', label: 'Category', type: 'text', width: 130 },
    { id: 'supplier', label: 'Supplier', type: 'text', width: 130 },

    { id: 'supplierCost', label: 'Supplier cost', type: 'number', width: 100 },
    { id: 'freightCost', label: 'Freight / landed', type: 'number', width: 100 },
    { id: 'totalLandedCost', label: 'Total landed cost', type: 'computed', width: 110 },
    { id: 'sellingPrice', label: 'Selling price', type: 'number', width: 100 },
    { id: 'grossProfit', label: 'Gross profit', type: 'computed', width: 100 },
    { id: 'grossMarginPct', label: 'Gross margin %', type: 'computed', width: 100 },

    { id: 'demand', label: 'Demand', type: 'scale', title: 'Evidence of real customer demand (sales, search volume, enquiries, ad engagement). 5 = strong.' },
    { id: 'differentiation', label: 'Differentiation', type: 'scale', title: 'How different this is from what is already on the market. 5 = highly differentiated.' },
    { id: 'contentPotential', label: 'Content potential', type: 'scale', title: 'How well it photographs/films — visual & content marketing potential. 5 = excellent.' },
    { id: 'freightRisk', label: 'Freight risk', type: 'scale', invert: true, title: 'Risk of cost blowouts, delay or damage in freight. 5 = high risk.' },
    { id: 'damageRisk', label: 'Damage risk', type: 'scale', invert: true, title: 'Risk of breakage/damage in handling & shipping. 5 = high risk.' },
    { id: 'tradePotential', label: 'Trade potential', type: 'scale', title: 'Appeal to designers, architects, trade/wholesale buyers. 5 = strong appeal.' },
    { id: 'competition', label: 'Competition', type: 'scale', invert: true, title: 'How saturated / competitive this category is. 5 = highly saturated.' },

    { id: 'overallScore', label: 'Overall score', type: 'computed', width: 110 },
    { id: 'evidenceSource', label: 'Evidence source', type: 'textarea', width: 170 },
    { id: 'confidence', label: 'Confidence', type: 'select', options: CONFIDENCE_OPTIONS, width: 100 },
    { id: 'notes', label: 'Notes', type: 'textarea', width: 200 },
    { id: 'status', label: 'Status', type: 'status', width: 130 },
  ];

  var SCALE_FIELDS = COLUMNS.filter(function (c) { return c.type === 'scale'; }).map(function (c) { return c.id; });

  function uid() { return 'p_' + Math.random().toString(36).slice(2, 10); }

  function seedData() {
    return [
      { id: uid(), name: 'Carrara Natural Stone Basin', category: 'Vessel Basin', status: 'Idea' },
      { id: uid(), name: 'Beige Travertine Basin', category: 'Vessel Basin', status: 'Idea' },
      { id: uid(), name: '#41 Fluted Round Basin', category: 'Vessel Basin', status: 'Idea' },
    ];
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        var seeded = seedData();
        save(seeded);
        return seeded;
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : seedData();
    } catch (e) {
      return seedData();
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function num(v) {
    if (v === '' || v === null || v === undefined) return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
  }

  function computeRow(row) {
    var supplierCost = num(row.supplierCost);
    var freightCost = num(row.freightCost);
    var sellingPrice = num(row.sellingPrice);

    var totalLandedCost = (supplierCost !== null || freightCost !== null)
      ? (supplierCost || 0) + (freightCost || 0)
      : null;

    var grossProfit = (sellingPrice !== null && totalLandedCost !== null)
      ? sellingPrice - totalLandedCost
      : null;

    var grossMarginPct = (grossProfit !== null && sellingPrice)
      ? (grossProfit / sellingPrice) * 100
      : null;

    var scoredCount = 0;
    var scoreSum = 0;
    SCALE_FIELDS.forEach(function (f) {
      var col = COLUMNS.filter(function (c) { return c.id === f; })[0];
      var v = num(row[f]);
      if (v === null) return;
      scoredCount++;
      var normalized = col.invert ? ((6 - v) / 5) * 100 : (v / 5) * 100;
      scoreSum += normalized;
    });
    var overallScore = scoredCount ? Math.round(scoreSum / scoredCount) : null;

    return {
      totalLandedCost: totalLandedCost,
      grossProfit: grossProfit,
      grossMarginPct: grossMarginPct,
      overallScore: overallScore,
      scoredCount: scoredCount,
    };
  }

  function money(v) {
    if (v === null || v === undefined) return '—';
    return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function pct(v) {
    if (v === null || v === undefined) return '—';
    return v.toFixed(1) + '%';
  }

  var state = load();
  var sortKey = 'overallScore';
  var sortDir = 'desc';

  function headerRowHtml() {
    return COLUMNS.map(function (col) {
      var w = col.width ? ' style="min-width:' + col.width + 'px;"' : '';
      var sticky = col.sticky ? ' sticky-col' : '';
      var sortedClass = col.id === sortKey ? ' sorted' : '';
      var arrow = col.id === sortKey ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';
      var title = col.title ? ' title="' + col.title.replace(/"/g, '&quot;') + '"' : '';
      return '<th class="' + sticky.trim() + sortedClass + '"' + w + title + ' data-sort="' + col.id + '">' + col.label + arrow + '</th>';
    }).join('') + '<th style="min-width:36px;"></th>';
  }

  function cellHtml(row, col, computed) {
    var val = row[col.id];
    if (col.type === 'computed') {
      if (col.id === 'totalLandedCost') return '<td class="computed">' + money(computed.totalLandedCost) + '</td>';
      if (col.id === 'grossProfit') return '<td class="computed">' + money(computed.grossProfit) + '</td>';
      if (col.id === 'grossMarginPct') return '<td class="computed">' + pct(computed.grossMarginPct) + '</td>';
      if (col.id === 'overallScore') {
        var scoreText = computed.overallScore === null ? '—' : computed.overallScore + ' · ' + computed.scoredCount + '/7';
        return '<td class="computed score-cell">' + scoreText + '</td>';
      }
    }
    if (col.type === 'text') {
      var cls = col.id === 'name' ? 'cell-input name-input' : 'cell-input';
      return '<td class="' + (col.sticky ? 'sticky-col' : '') + '"><input class="' + cls + '" type="text" value="' + escapeAttr(val || '') + '" data-field="' + col.id + '" data-id="' + row.id + '"></td>';
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
      if (['totalLandedCost', 'grossProfit', 'grossMarginPct', 'overallScore'].indexOf(sortKey) !== -1) {
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
        return '<tr class="' + statusClass + '">' + cells + delCell + '</tr>';
      }).join('');
    }

    // Winner banner
    var active = rows.filter(function (r) { return ACTIVE_STATUSES.indexOf(r.status || 'Idea') !== -1 && r._computed.overallScore !== null; });
    active.sort(function (a, b) { return b._computed.overallScore - a._computed.overallScore; });
    var banner = document.getElementById('winnerBanner');
    var valueEl = document.getElementById('winnerValue');
    if (active.length) {
      var top = active[0];
      banner.style.display = 'block';
      valueEl.innerHTML = (top.name || 'Untitled product') + ' — <span class="score">' + top._computed.overallScore + '</span> (' + top._computed.scoredCount + '/7 factors scored)';
    } else {
      banner.style.display = 'none';
    }
  }

  function updateField(id, field, value) {
    var row = state.filter(function (r) { return r.id === id; })[0];
    if (!row) return;
    row[field] = value;
    save(state);
  }

  document.getElementById('tableBody').addEventListener('input', function (e) {
    var t = e.target;
    var field = t.getAttribute('data-field');
    var id = t.getAttribute('data-id');
    if (!field || !id) return;
    updateField(id, field, t.value);
    // Live-update computed cells + banner without a full re-render (keeps focus in the field being typed).
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
    var delId = e.target.getAttribute('data-del');
    if (!delId) return;
    var row = state.filter(function (r) { return r.id === delId; })[0];
    var label = row && row.name ? row.name : 'this product';
    if (confirm('Delete "' + label + '"? This cannot be undone.')) {
      state = state.filter(function (r) { return r.id !== delId; });
      save(state);
      render();
    }
  });

  function refreshComputedCellsForRow(id, computed) {
    var row = document.querySelector('tr:has(input[data-id="' + id + '"]), tr:has(select[data-id="' + id + '"]), tr:has(textarea[data-id="' + id + '"])');
    // :has() may be unsupported in older browsers — fall back to full render if so.
    if (!row) { render(); return; }
    var cells = row.querySelectorAll('td.computed');
    cells[0].textContent = money(computed.totalLandedCost);
    cells[1].textContent = money(computed.grossProfit);
    cells[2].textContent = pct(computed.grossMarginPct);
    cells[3].textContent = computed.overallScore === null ? '—' : computed.overallScore + ' · ' + computed.scoredCount + '/7';
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
      banner.style.display = 'block';
      valueEl.innerHTML = (top.name || 'Untitled product') + ' — <span class="score">' + top._computed.overallScore + '</span> (' + top._computed.scoredCount + '/7 factors scored)';
    } else {
      banner.style.display = 'none';
    }
  }

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
    save(state);
    render();
  });

  document.getElementById('exportBtn').addEventListener('click', function () {
    var clean = state.map(function (r) {
      var copy = {};
      Object.keys(r).forEach(function (k) { if (k !== '_computed') copy[k] = r[k]; });
      return copy;
    });
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
        if (confirm('Import ' + parsed.length + ' product(s)? This replaces all current Product Lab data in this browser.')) {
          state = parsed;
          save(state);
          render();
        }
      } catch (err) {
        alert('Could not read that file — expected a Product Lab JSON export.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  render();
})();
</script>
`;
