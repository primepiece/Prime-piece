// Suppliers: Phase 2 of the Supplier + Approval Engine. Read-only research view —
// per Market Radar opportunity, the suppliers found for it, ranked, plus whatever
// Approval Queue request that research produced. The one write action on this page
// is Approve/Reject on a PENDING approval — everything else is display only.
//
// Data comes from the existing /api/scale-os/radar-data endpoint (now also returning
// suppliers + approvals alongside opportunities/pulse) and one new small endpoint,
// /api/scale-os/approvals-decide, for the approve/reject action. No new serverless
// function — both are routed through the existing api/scale-os/[page].js handler.
//
// Supplier research itself is never triggered from this page — it only ever runs via
// the GitHub Actions worker's manually-triggered 'supplier' mode (real web-search
// calls, real cost), matching how Market Radar's own research already works.

export const SUPPLIERS_STYLE = `
  .empty-state { padding: 40px 20px; text-align: center; color: var(--muted); font-size: 13px; }
  .empty-note { color: var(--muted); font-size: 13px; padding: 14px 0; }
  .section { margin-bottom: 28px; }
  .section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .section-title { font-size: 15px; font-weight: 700; letter-spacing: -0.01em; }
  .approval-card {
    background: var(--white); border: 1px solid var(--line); border-left: 3px solid var(--teal);
    border-radius: 6px; padding: 16px 20px; margin-bottom: 12px;
  }
  .approval-card.decided { border-left-color: var(--line); opacity: 0.75; }
  .approval-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
  .approval-type { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--teal-dark); font-weight: 700; }
  .approval-summary { font-size: 13.5px; line-height: 1.5; margin-bottom: 8px; }
  .approval-rationale { font-size: 12px; color: var(--muted); line-height: 1.5; margin-bottom: 12px; }
  .approval-actions { display: flex; gap: 8px; align-items: center; }
  .approval-decision { font-size: 12px; font-weight: 700; }
  .approval-decision.APPROVED { color: #2E7D4F; }
  .approval-decision.REJECTED { color: var(--red); }
  .chain-card { background: var(--white); border: 1px solid var(--line); border-radius: 6px; padding: 18px 20px; margin-bottom: 16px; }
  .chain-head { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 4px; }
  .chain-title { font-size: 15px; font-weight: 700; }
  .chain-sub { font-size: 11.5px; color: var(--muted); margin-bottom: 14px; }
  .mini-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 6px; background: var(--white); margin-bottom: 10px; }
  table.mini { border-collapse: collapse; width: 100%; font-size: 12.5px; min-width: 760px; }
  table.mini th, table.mini td { border-bottom: 1px solid var(--line); padding: 8px 10px; text-align: left; white-space: nowrap; }
  table.mini thead th { background: #F4F2EC; font-size: 10.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
  table.mini tbody tr:last-child td { border-bottom: none; }
  table.mini tbody tr.best-supplier td { background: #F7FBF9; }
  .supplier-name { font-weight: 600; }
  .best-tag { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 8px; border-radius: 20px; background: #DCEAE0; color: #2E7D4F; margin-left: 6px; }
  .evidence-gap-tag { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 8px; border-radius: 20px; background: #F1E4DF; color: #A05B44; margin-left: 6px; }
  .score-breakdown-mini { font-size: 10.5px; color: var(--muted); }
  .draft-messages { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
  .draft-message { border: 1px solid var(--line); border-radius: 5px; padding: 10px 12px; background: var(--paper); }
  .draft-message-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 12px; font-weight: 600; }
  .draft-message-body { white-space: pre-wrap; font-family: inherit; font-size: 11.5px; line-height: 1.5; margin: 0; color: #333; }
  .sample-order-details { margin-top: 10px; }
  table.econ-mini td { font-size: 12px; }
  table.econ-mini td:first-child { color: var(--muted); width: 210px; }
  .why-supplier-box { background: #F4F2EC; border-radius: 5px; padding: 10px 12px; font-size: 12.5px; line-height: 1.5; margin-top: 8px; }
  .why-supplier-box .k { font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; color: var(--teal-dark); margin-right: 6px; }
  .expand-btn-sm { background: none; border: none; cursor: pointer; font-size: 13px; color: var(--muted); padding: 4px; }
  .expand-btn-sm:hover { color: var(--black); }
  tr.quote-detail-row td { background: #F7F6F2; padding: 16px 18px; white-space: normal; }
  .quote-detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap: 10px 18px; font-size: 12.5px; margin-bottom: 12px; }
  .qd-label { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
  .raw-reply-toggle { font-size: 11px; color: var(--teal-dark); cursor: pointer; text-decoration: underline; }
  .raw-reply-text { white-space: pre-wrap; font-size: 11px; color: var(--muted); margin-top: 6px; padding: 8px; background: var(--white); border: 1px solid var(--line); border-radius: 4px; }
  .paste-reply-form textarea { width: 100%; min-height: 90px; border: 1px solid var(--line); border-radius: 4px; padding: 8px; font-family: inherit; font-size: 12px; margin-bottom: 8px; box-sizing: border-box; }
`;

export const SUPPLIERS_BODY = `
  <h1>Suppliers</h1>
  <p class="page-sub">Product → real suppliers → unit economics → best supplier → approval required. Supplier research runs manually via GitHub Actions (mode=supplier) — never automatically.</p>

  <div id="loadingState" class="empty-state">Loading…</div>
  <div id="loadErrorState" class="empty-state" style="display:none;"></div>

  <div id="suppliersContent" style="display:none;">
    <div class="section">
      <div class="section-head"><div class="section-title">Approval Queue</div></div>
      <div id="approvalsBody"></div>
    </div>

    <div class="section">
      <div class="section-head"><div class="section-title">Supplier Research</div></div>
      <div id="chainsBody"></div>
    </div>
  </div>
`;

export const SUPPLIERS_SCRIPT = `
<script>
(function () {
  function escapeText(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function money(v, currency) {
    if (v === null || v === undefined) return '—';
    return (currency || '$') + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  var opportunities = [];
  var suppliers = [];
  var approvals = [];
  var expandedSupplierIds = {};
  var draftTextByUid = {};

  function opportunityById(id) {
    return opportunities.filter(function (o) { return o.id === id; })[0] || null;
  }

  function isOutreachApproved(supplierId) {
    return approvals.some(function (a) {
      return a.type === 'SUPPLIER_OUTREACH' && a.status === 'APPROVED' && (a.supplierIds || []).indexOf(supplierId) !== -1;
    });
  }

  // --- Approval Queue -------------------------------------------------------------
  function draftMessagesHtml(a) {
    if (a.type !== 'SUPPLIER_OUTREACH' || !a.draftMessages || !a.draftMessages.length) return '';
    return '<div class="draft-messages">' + a.draftMessages.map(function (m, i) {
      var uid = a.id + '_' + i;
      var fullText = 'Subject: ' + m.subject + '\\n\\n' + m.body;
      draftTextByUid[uid] = fullText;
      return '<div class="draft-message">' +
        '<div class="draft-message-head"><span>' + escapeText(m.supplierName) + '</span><button class="btn btn--ghost btn--small" data-copy="' + uid + '">Copy</button></div>' +
        '<pre class="draft-message-body">' + escapeText(fullText) + '</pre>' +
        '</div>';
    }).join('') + '</div>';
  }

  function sampleOrderDetailsHtml(a) {
    if (a.type !== 'SAMPLE_ORDER' || !a.details) return '';
    var d = a.details;
    var rows = [
      ['Unit price (qty 50)', d.unitPriceAt50 != null ? money(d.unitPriceAt50, 'US$') : '—'],
      ['Freight per unit', d.freightPerUnitEstimateUSD != null ? money(d.freightPerUnitEstimateUSD, 'US$') : '— (' + escapeText(d.landedCostNote || 'not stated') + ')'],
      ['Estimated landed cost', d.estimatedLandedCost != null ? money(d.estimatedLandedCost, 'US$') : '— (' + escapeText(d.landedCostNote || 'incomplete') + ')'],
      ['Sample cost', d.sampleLandedCost != null ? money(d.sampleLandedCost, 'US$') : '—'],
      ['Target retail (entry tier)', d.targetRetail != null ? money(d.targetRetail, d.targetRetailCurrency) : '—'],
      ['Estimated gross margin', d.grossMarginPct != null ? d.grossMarginPct + '%' : '—'],
      ['Contribution margin', escapeText(d.contributionMarginNote || '—')],
    ];
    var risksHtml = (d.mainRisks && d.mainRisks.length) ? '<ul style="margin:4px 0 0;padding-left:18px;">' + d.mainRisks.map(function (r) { return '<li>' + escapeText(r) + '</li>'; }).join('') + '</ul>' : '<span class="muted">None recorded.</span>';
    return '<div class="sample-order-details">' +
      '<table class="mini econ-mini"><tbody>' + rows.map(function (r) { return '<tr><td>' + escapeText(r[0]) + '</td><td>' + r[1] + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin:12px 0 4px;">Main risks</div>' + risksHtml +
      (d.whyBeatsAlternatives ? '<div class="why-supplier-box"><span class="k">Why this supplier</span>' + escapeText(d.whyBeatsAlternatives) + '</div>' : '') +
      '</div>';
  }

  function renderApprovals() {
    var el = document.getElementById('approvalsBody');
    draftTextByUid = {};
    if (!approvals.length) { el.innerHTML = '<p class="empty-note">No approval requests yet — these are created automatically when supplier research finds and ranks suppliers for an opportunity.</p>'; return; }

    var sorted = approvals.slice().sort(function (a, b) {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    el.innerHTML = sorted.map(function (a) {
      var opp = opportunityById(a.opportunityId);
      var oppName = opp ? escapeText(opp.product) + (opp.variant ? ' — ' + escapeText(opp.variant) : '') : 'Unknown opportunity';
      var decided = a.status !== 'PENDING';
      var actions = decided
        ? '<span class="approval-decision ' + a.status + '">' + a.status + '</span><span class="muted" style="font-size:11.5px;"> · ' + escapeText(new Date(a.decidedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })) + '</span>'
        : '<button class="btn btn--teal btn--small" data-approve="' + a.id + '">Approve</button><button class="btn btn--ghost btn--small" data-reject="' + a.id + '">Reject</button>';
      return '<div class="approval-card' + (decided ? ' decided' : '') + '">' +
        '<div class="approval-head"><span class="approval-type">' + escapeText(a.type) + '</span><span class="muted" style="font-size:11.5px;">' + oppName + '</span></div>' +
        '<div class="approval-summary">' + escapeText(a.summary) + '</div>' +
        (a.rationale ? '<div class="approval-rationale">' + escapeText(a.rationale) + '</div>' : '') +
        draftMessagesHtml(a) + sampleOrderDetailsHtml(a) +
        '<div class="approval-actions">' + actions + '</div>' +
        '</div>';
    }).join('');
  }

  document.getElementById('approvalsBody').addEventListener('click', function (e) {
    var copyUid = e.target.getAttribute('data-copy');
    if (copyUid) {
      var text = draftTextByUid[copyUid] || '';
      var btn = e.target;
      var restore = function () { btn.textContent = 'Copy'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { btn.textContent = 'Copied!'; setTimeout(restore, 1500); })
          .catch(function () { alert('Could not copy automatically — please select and copy the text above by hand.'); });
      } else {
        alert('Clipboard not available — please select and copy the text above by hand.');
      }
      return;
    }
    var id = e.target.getAttribute('data-approve') || e.target.getAttribute('data-reject');
    if (!id) return;
    var decision = e.target.hasAttribute('data-approve') ? 'APPROVED' : 'REJECTED';
    if (!confirm((decision === 'APPROVED' ? 'Approve' : 'Reject') + ' this request? This only records the decision — nothing is sent automatically yet.')) return;
    e.target.closest('.approval-card').style.opacity = '0.5';
    fetch('/api/scale-os/approvals-decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, decision: decision }),
    }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.data.error || 'Failed to record decision');
        var a = approvals.filter(function (x) { return x.id === id; })[0];
        if (a) { a.status = decision; a.decidedAt = new Date().toISOString(); }
        renderApprovals();
        renderChains();
      })
      .catch(function (err) {
        alert('Could not record decision: ' + err.message);
        renderApprovals();
      });
  });

  // --- Supplier research chains, grouped by opportunity ----------------------------
  var DETAIL_COLSPAN = 9;

  // Structured quote fields, once a pasted reply has been parsed by a quote-capture
  // run — every field falls back to a dash rather than inventing a value, same
  // "missing stays null" principle as the rest of this system.
  function quoteDetailHtml(s) {
    if (s.quoteParseStatus === 'PARSED') {
      var cartonText = s.cartonSpec ? [s.cartonSpec.size, s.cartonSpec.weightKg != null ? s.cartonSpec.weightKg + ' kg' : null].filter(Boolean).join(', ') : null;
      var fields = [
        ['Materials', (s.materials || []).length ? s.materials.join(', ') : null],
        ['Custom dimensions', s.customDimensionsNotes],
        ['Net weight', s.netWeightKg != null ? s.netWeightKg + ' kg' : null],
        ['Carton / crate spec', cartonText],
        ['Packaging method', s.packagingMethod],
        ['Branding options', s.brandingOptions],
        ['Incoterms', s.incoterms],
        ['Freight estimate', s.freightEstimate],
        ['Damage / replacement policy', s.damageReplacementPolicy],
        ['Compliance / QC', s.complianceNotes],
      ];
      var gridHtml = '<div class="quote-detail-grid">' + fields.map(function (f) {
        return '<div><div class="qd-label">' + escapeText(f[0]) + '</div><div>' + (f[1] ? escapeText(f[1]) : '<span class="muted">—</span>') + '</div></div>';
      }).join('') + '</div>';
      var receivedHtml = s.quoteReceivedAt
        ? '<div class="muted" style="font-size:11px;margin-bottom:8px;">Quote received ' + escapeText(new Date(s.quoteReceivedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })) + '</div>'
        : '';
      var rawHtml = s.quoteRawText
        ? '<div><span class="raw-reply-toggle" data-toggle-raw="' + s.id + '">View raw reply text</span><div class="raw-reply-text" id="raw-' + s.id + '" style="display:none;">' + escapeText(s.quoteRawText) + '</div></div>'
        : '';
      return receivedHtml + gridHtml + rawHtml;
    }
    if (s.quoteParseStatus === 'PENDING') {
      return '<div class="muted" style="margin-bottom:10px;">Reply pasted — waiting for the next quote-capture run (GitHub Actions, mode=quote-capture) to parse it into structured fields.</div>' +
        (s.quoteRawText ? '<div><span class="raw-reply-toggle" data-toggle-raw="' + s.id + '">View pasted reply text</span><div class="raw-reply-text" id="raw-' + s.id + '" style="display:none;">' + escapeText(s.quoteRawText) + '</div></div>' : '');
    }
    return '';
  }

  // Only shown once James has approved a SUPPLIER_OUTREACH batch that includes this
  // supplier — there is no email integration, so this textarea is the only way a
  // real reply ever enters the system.
  function pasteReplyFormHtml(s) {
    if (!isOutreachApproved(s.id)) {
      return '<div class="muted">Outreach to this supplier has not been approved yet — approve the Supplier Outreach request above before recording a reply.</div>';
    }
    var label = s.quoteParseStatus ? 'Paste a new or updated reply' : 'Paste supplier reply';
    return '<div class="paste-reply-form">' +
      '<div class="muted" style="font-size:11px;margin-bottom:6px;">' + escapeText(label) + ' below — it is stored as-is, then parsed into the fields above by the next quote-capture run.</div>' +
      '<textarea data-reply-input="' + s.id + '" placeholder="Paste the full text of the supplier reply here..."></textarea>' +
      '<button class="btn btn--teal btn--small" data-submit-reply="' + s.id + '">Save reply</button>' +
      '</div>';
  }

  function quoteDetailRowHtml(s) {
    return '<tr class="quote-detail-row" id="detail-' + s.id + '" style="display:' + (expandedSupplierIds[s.id] ? 'table-row' : 'none') + ';">' +
      '<td colspan="' + DETAIL_COLSPAN + '">' + quoteDetailHtml(s) + pasteReplyFormHtml(s) + '</td>' +
      '</tr>';
  }

  function supplierRowHtml(s, isBest) {
    var tiers = (s.pricingTiers || []).map(function (t) { return t.qty + 'x ' + money(t.unitPrice, s.sampleCurrency); }).join(', ') || '—';
    var name = '<span class="supplier-name">' + escapeText(s.name) + '</span>' + (isBest ? '<span class="best-tag">Best</span>' : '') + (s.evidenceGap ? '<span class="evidence-gap-tag">No sources</span>' : '');
    var breakdown = s.scoreBreakdown
      ? '<span class="score-breakdown-mini">price ' + s.scoreBreakdown.price + ' · cred ' + s.scoreBreakdown.credibility + ' · MOQ ' + s.scoreBreakdown.moq + ' · lead ' + s.scoreBreakdown.leadTime + '</span>'
      : '—';
    var expandGlyph = expandedSupplierIds[s.id] ? '\\u25BE' : '\\u25B8';
    return '<tr class="' + (isBest ? 'best-supplier' : '') + '">' +
      '<td><button class="expand-btn-sm" data-toggle-expand="' + s.id + '" title="Quote detail / paste reply">' + expandGlyph + '</button></td>' +
      '<td>' + name + '<div class="muted" style="font-size:11px;">' + escapeText(s.country || '—') + ' · ' + escapeText(s.sourcePlatform || '—') + '</div></td>' +
      '<td>' + (s.supplierScore != null ? s.supplierScore : '—') + '<div>' + breakdown + '</div></td>' +
      '<td>' + (s.moq != null ? s.moq : '—') + '</td>' +
      '<td>' + money(s.samplePrice, s.sampleCurrency) + '</td>' +
      '<td>' + escapeText(tiers) + '</td>' +
      '<td>' + (s.leadTimeDays != null ? s.leadTimeDays + ' days' : '—') + '</td>' +
      '<td>' + escapeText(s.complianceNotes || '—') + '</td>' +
      '<td>' + ((s.sources || []).length ? (s.sources || []).map(function (src) { return '<a href="' + escapeText(src.url) + '" target="_blank" rel="noopener">' + escapeText(src.title || src.url) + '</a>'; }).join('<br>') : '<span class="muted">None</span>') + '</td>' +
      '</tr>' + quoteDetailRowHtml(s);
  }

  function chainCardHtml(opportunityId, oppSuppliers) {
    var opp = opportunityById(opportunityId);
    var name = opp ? escapeText(opp.product) + (opp.variant ? ' — ' + escapeText(opp.variant) : '') : 'Unknown opportunity (' + escapeText(opportunityId) + ')';
    var retail = opp && opp.economicsPotential && opp.economicsPotential.retailPriceRangeEstimate
      ? escapeText(opp.economicsPotential.retailPriceRangeEstimate)
      : (opp && opp.priceBand ? escapeText((opp.priceBand.currency || '') + (opp.priceBand.low != null ? opp.priceBand.low : '?') + '–' + (opp.priceBand.high != null ? opp.priceBand.high : '?')) : 'Not recorded');
    var ranked = oppSuppliers.slice().sort(function (a, b) { return (b.supplierScore || 0) - (a.supplierScore || 0); });
    var rows = ranked.map(function (s, i) { return supplierRowHtml(s, i === 0); }).join('');
    return '<div class="chain-card">' +
      '<div class="chain-head"><div class="chain-title">' + name + '</div><span class="tag">' + ranked.length + ' supplier(s)</span></div>' +
      '<div class="chain-sub">Est. NZ retail: ' + retail + ' — compare against each supplier pricing below to judge landed-cost viability.</div>' +
      '<div class="mini-table-wrap"><table class="mini"><thead><tr>' +
      '<th></th><th>Supplier</th><th>Score</th><th>MOQ</th><th>Sample price</th><th>Pricing tiers</th><th>Lead time</th><th>Compliance</th><th>Sources</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '</div>';
  }

  document.getElementById('chainsBody').addEventListener('click', function (e) {
    var expandId = e.target.getAttribute('data-toggle-expand');
    if (expandId) {
      expandedSupplierIds[expandId] = !expandedSupplierIds[expandId];
      var row = document.getElementById('detail-' + expandId);
      if (row) row.style.display = expandedSupplierIds[expandId] ? 'table-row' : 'none';
      e.target.innerHTML = expandedSupplierIds[expandId] ? '\\u25BE' : '\\u25B8';
      return;
    }
    var rawId = e.target.getAttribute('data-toggle-raw');
    if (rawId) {
      var rawEl = document.getElementById('raw-' + rawId);
      if (rawEl) rawEl.style.display = (rawEl.style.display === 'none') ? 'block' : 'none';
      return;
    }
    var submitId = e.target.getAttribute('data-submit-reply');
    if (submitId) {
      var textarea = document.querySelector('[data-reply-input="' + submitId + '"]');
      var rawText = textarea ? textarea.value.trim() : '';
      if (!rawText) { alert('Paste the supplier reply text first.'); return; }
      e.target.disabled = true;
      e.target.textContent = 'Saving…';
      fetch('/api/scale-os/quote-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: submitId, rawText: rawText }),
      }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.data.error || 'Failed to save reply');
          var s = suppliers.filter(function (x) { return x.id === submitId; })[0];
          if (s) { s.quoteRawText = rawText; s.quoteParseStatus = 'PENDING'; }
          expandedSupplierIds[submitId] = true;
          renderChains();
        })
        .catch(function (err) {
          alert('Could not save reply: ' + err.message);
          e.target.disabled = false;
          e.target.textContent = 'Save reply';
        });
      return;
    }
  });

  function renderChains() {
    var el = document.getElementById('chainsBody');
    if (!suppliers.length) {
      el.innerHTML = '<p class="empty-note">No supplier research yet. Trigger the Market Radar workflow by hand with mode=supplier and an opportunity id to research suppliers for one Market Radar opportunity.</p>';
      return;
    }
    var byOpportunity = {};
    suppliers.forEach(function (s) {
      if (!byOpportunity[s.opportunityId]) byOpportunity[s.opportunityId] = [];
      byOpportunity[s.opportunityId].push(s);
    });
    el.innerHTML = Object.keys(byOpportunity).map(function (oppId) {
      return chainCardHtml(oppId, byOpportunity[oppId]);
    }).join('');
  }

  fetch('/api/scale-os/radar-data').then(function (res) {
    if (res.status === 401) {
      window.location.href = '/scale-os/login?next=' + encodeURIComponent(window.location.pathname);
      return Promise.reject(new Error('not authenticated'));
    }
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.error || ('Failed to load (status ' + res.status + ')'));
      return data;
    });
  }).then(function (data) {
    opportunities = data.opportunities || [];
    suppliers = data.suppliers || [];
    approvals = data.approvals || [];
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('suppliersContent').style.display = 'block';
    renderApprovals();
    renderChains();
  }).catch(function (err) {
    document.getElementById('loadingState').style.display = 'none';
    var errEl = document.getElementById('loadErrorState');
    errEl.textContent = 'Could not load Suppliers — ' + err.message;
    errEl.style.display = 'block';
  });
})();
</script>
`;
