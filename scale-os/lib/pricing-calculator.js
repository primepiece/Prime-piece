// Pricing calculator, behind the Pulse login (served by api/scale-os/[page].js).
// A full standalone page rather than a renderShell page, so it keeps the Prime Piece look and
// prints cleanly. Everything it saves stays in the browser (localStorage); nothing is sent anywhere.
// Kept as a String.raw template: the HTML must not contain backticks or ${.
export const PRICING_CALCULATOR_HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Pricing Calculator · Prime Piece</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Inter+Tight:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --cream: #F5F1EA;
    --cream-soft: #EBE5DA;
    --cream-deep: #E0D9CA;
    --sage: #7BA5A8;
    --sage-deep: #5D8588;
    --ink: #2C2A26;
    --ink-soft: #554F45;
    --stone: #8A8275;
    --line: rgba(44,42,38,0.12);
    --good: #4f7f5a;
    --warn: #a7741c;
    --bad: #a94435;
    --display: 'Cormorant Garamond', serif;
    --body: 'Inter Tight', -apple-system, sans-serif;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--cream); color: var(--ink); font-family: var(--body); font-weight: 300; line-height: 1.5; letter-spacing: 0.01em; padding-bottom: 80px; }
  a { color: var(--sage-deep); }

  .top { background: var(--ink); color: var(--cream); padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .top .brand { font-size: 11px; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; }
  .top a { color: #A8C3C5; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; text-decoration: none; }

  .wrap { max-width: 1120px; margin: 0 auto; padding: 40px 24px 0; }
  h1 { font-family: var(--display); font-weight: 300; font-size: 46px; line-height: 1.05; }
  h1 em { color: var(--sage-deep); }
  .intro { max-width: 640px; color: var(--ink-soft); font-size: 14px; margin-top: 12px; }

  .grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 32px; margin-top: 32px; align-items: start; }
  .card { background: #fff; border: 1px solid var(--line); padding: 28px; }
  .card + .card { margin-top: 20px; }
  .label { font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--stone); font-weight: 500; margin-bottom: 16px; }

  .field { display: grid; grid-template-columns: 1fr 150px; gap: 12px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--line); }
  .field:last-child { border-bottom: none; }
  .field label { font-size: 13px; }
  .field small { display: block; font-size: 11px; color: var(--stone); margin-top: 2px; line-height: 1.4; }
  .inp { display: flex; align-items: center; border: 1px solid var(--cream-deep); background: var(--cream); }
  .inp span { font-size: 12px; color: var(--stone); padding: 0 8px; white-space: nowrap; }
  .inp input, .inp select { width: 100%; border: none; background: transparent; padding: 9px 8px; font-family: var(--body); font-size: 14px; color: var(--ink); outline: none; text-align: right; -moz-appearance: textfield; }
  .inp input::-webkit-outer-spin-button, .inp input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .inp:focus-within { border-color: var(--sage-deep); }
  .inp.text input { text-align: left; }
  .wide { grid-template-columns: 1fr; }

  .seg { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--cream-deep); margin-bottom: 8px; }
  .seg button { font-family: var(--body); font-size: 12px; padding: 10px 8px; border: none; background: var(--cream); color: var(--ink-soft); cursor: pointer; line-height: 1.35; }
  .seg button strong { display: block; font-weight: 500; color: var(--ink); font-size: 13px; }
  .seg button.on { background: var(--ink); color: rgba(245,241,234,0.7); }
  .seg button.on strong { color: var(--cream); }
  .note { font-size: 11.5px; color: var(--stone); line-height: 1.5; padding: 8px 0 4px; }
  .check { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; padding: 10px 0; }
  .check input { margin-top: 3px; accent-color: var(--sage-deep); }

  .presets { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
  .presets button { font-family: var(--body); font-size: 11px; padding: 5px 10px; border: 1px solid var(--cream-deep); background: var(--cream); cursor: pointer; color: var(--ink-soft); }
  .presets button.on { border-color: var(--sage-deep); color: var(--sage-deep); font-weight: 500; }

  /* results */
  .results { position: sticky; top: 16px; }
  .res-head { background: var(--ink); color: var(--cream); padding: 24px 28px; }
  .res-head .label { color: #A8C3C5; margin-bottom: 8px; }
  .res-name { font-family: var(--display); font-size: 28px; font-weight: 300; line-height: 1.1; }
  .prices { display: grid; grid-template-columns: 1fr 1fr; background: #fff; border: 1px solid var(--line); border-top: none; }
  .price { padding: 22px 28px; }
  .price + .price { border-left: 1px solid var(--line); }
  .price .big { font-family: var(--display); font-size: 40px; font-weight: 400; line-height: 1; margin-top: 6px; }
  .price .sub { font-size: 11.5px; color: var(--stone); margin-top: 6px; }
  .breakdown { background: #fff; border: 1px solid var(--line); border-top: none; padding: 18px 28px; font-size: 13px; }
  .row { display: flex; justify-content: space-between; gap: 16px; padding: 5px 0; }
  .row.total { border-top: 1px solid var(--ink); margin-top: 6px; padding-top: 10px; font-weight: 500; }
  .row .muted { color: var(--stone); }
  .margins { display: grid; grid-template-columns: 1fr 1fr; background: #fff; border: 1px solid var(--line); border-top: none; }
  .margin { padding: 18px 28px; }
  .margin + .margin { border-left: 1px solid var(--line); }
  .margin .pct { font-family: var(--display); font-size: 32px; line-height: 1; margin-top: 4px; }
  .margin .sub { font-size: 11.5px; color: var(--stone); margin-top: 4px; }
  .verdict { padding: 14px 28px; font-size: 13px; border: 1px solid var(--line); border-top: none; }
  .verdict.good { background: #e7efe6; color: var(--good); }
  .verdict.warn { background: #f5ecd9; color: var(--warn); }
  .verdict.bad { background: #f4e3df; color: var(--bad); }
  .actions { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
  .btn { font-family: var(--body); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 500; padding: 12px 18px; border: 1px solid var(--ink); background: var(--ink); color: var(--cream); cursor: pointer; }
  .btn.ghost { background: transparent; color: var(--ink); }
  .btn:hover { opacity: 0.88; }

  /* saved list */
  .saved { margin-top: 48px; }
  .saved h2 { font-family: var(--display); font-weight: 300; font-size: 30px; margin-bottom: 4px; }
  .saved p { font-size: 13px; color: var(--ink-soft); margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--line); font-size: 13px; }
  th { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--stone); font-weight: 500; text-align: right; padding: 12px; border-bottom: 1px solid var(--line); }
  th:first-child, td:first-child { text-align: left; }
  td { padding: 12px; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
  td:first-child { white-space: normal; font-weight: 500; }
  td .tag { font-size: 10px; color: var(--stone); font-weight: 300; display: block; }
  td button { font-family: var(--body); font-size: 11px; border: none; background: none; color: var(--sage-deep); cursor: pointer; padding: 2px 4px; }
  td button.del { color: var(--stone); }
  .empty { padding: 24px; text-align: center; color: var(--stone); font-size: 13px; background: #fff; border: 1px dashed var(--cream-deep); }
  .m-good { color: var(--good); } .m-warn { color: var(--warn); } .m-bad { color: var(--bad); }

  .how { margin-top: 48px; font-size: 13px; color: var(--ink-soft); max-width: 760px; }
  .how h2 { font-family: var(--display); font-weight: 300; font-size: 26px; color: var(--ink); margin-bottom: 10px; }
  .how li { margin: 0 0 8px 18px; }

  @media (max-width: 860px) {
    .grid { grid-template-columns: 1fr; }
    .results { position: static; }
  }
  @media (max-width: 520px) {
    .wrap { padding: 28px 16px 0; }
    h1 { font-size: 36px; }
    .card { padding: 20px 16px; }
    .field { grid-template-columns: 1fr; gap: 6px; }
    .res-head, .price, .breakdown, .margin, .verdict { padding-left: 16px; padding-right: 16px; }
    .price .big { font-size: 32px; }
    .table-scroll { overflow-x: auto; }
    table { min-width: 560px; }
  }
</style>
</head>
<body>

<div class="top">
  <span class="brand">Prime Piece · Pricing</span>
  <span style="display:flex;gap:18px;"><a href="/scale-os">← Pulse</a><a href="/scale-os/trade-quote">Open trade quote →</a></span>
</div>

<div class="wrap">
  <h1>Pricing <em>calculator</em></h1>
  <p class="intro">Put in what the factory charges and what it costs to get here. It works out what each piece really costs you, then your website price and trade price, and shows whether the margin is healthy. All prices here are NZD unless marked.</p>

  <div class="grid">
    <!-- INPUTS -->
    <div>
      <div class="card">
        <div class="label">The product</div>
        <div class="field wide"><div class="inp text"><input id="name" placeholder="e.g. Verde Alpi pedestal (Mars MSPS006)"></div></div>
      </div>

      <div class="card">
        <div class="label">What the factory quoted</div>
        <div class="seg" id="mode">
          <button data-mode="ddp"><strong>Delivered to my door (DDP)</strong>Price includes freight, duty and GST</button>
          <button data-mode="fob"><strong>Factory price only (FOB / EXW)</strong>I pay freight and import costs</button>
        </div>
        <div class="field">
          <label>Price per piece<small id="priceHint">From the factory's quote</small></label>
          <div class="inp"><select id="currency" style="width:auto;text-align:left;padding-right:0;"><option>USD</option><option>NZD</option><option>EUR</option><option>CNY</option></select><input id="price" type="number" min="0" step="1"></div>
        </div>
        <div class="field" id="fxRow">
          <label>Exchange rate<small>NZD for 1 <span id="curLabel">USD</span>. Check today's rate on Wise or your bank.</small></label>
          <div class="inp"><input id="fx" type="number" min="0" step="0.01"></div>
        </div>
        <div class="field" id="fxFeeRow">
          <label>Payment fee<small>Bank or Wise fee for paying overseas</small></label>
          <div class="inp"><input id="fxFee" type="number" min="0" step="0.1"><span>%</span></div>
        </div>
      </div>

      <div class="card" id="importCard">
        <div class="label">Getting it to NZ</div>
        <div class="field">
          <label>Pieces in this shipment<small>Freight and fees are shared across these</small></label>
          <div class="inp"><input id="qty" type="number" min="1" step="1"></div>
        </div>
        <div class="field">
          <label>Freight to Auckland<small>Total for the shipment, from your freight forwarder</small></label>
          <div class="inp"><span>$</span><input id="freight" type="number" min="0" step="1"></div>
        </div>
        <div class="field">
          <label>Customs clearance and port fees<small>Total for the shipment</small></label>
          <div class="inp"><span>$</span><input id="clearance" type="number" min="0" step="1"></div>
        </div>
        <div class="field">
          <label>Import duty<small>Ask your customs broker. Often 0% for stone basins, but check.</small></label>
          <div class="inp"><input id="duty" type="number" min="0" step="0.5"><span>%</span></div>
        </div>
      </div>

      <div class="card">
        <div class="label">Your costs in NZ</div>
        <div class="field">
          <label>Delivery to your client<small>Per piece. Leave at 0 if you charge it separately.</small></label>
          <div class="inp"><span>$</span><input id="local" type="number" min="0" step="1"></div>
        </div>
        <div class="field">
          <label>Breakage and surprises buffer<small>Covers a cracked piece, extra fees or a rate change</small></label>
          <div class="inp"><input id="buffer" type="number" min="0" step="1"><span>%</span></div>
        </div>
        <label class="check"><input type="checkbox" id="gstReg"> <span>I'm GST registered<small style="display:block;font-size:11px;color:var(--stone);">Website prices include GST. On a factory-price-only order, the GST you pay at the border is claimed back, so it isn't a cost.</small></span></label>
        <div class="note" id="ddpNote">On a delivered (DDP) price, the factory's agent usually imports it, so you can't claim that GST back. The whole price is counted as your cost to be safe.</div>
      </div>

      <div class="card">
        <div class="label">Your pricing</div>
        <div class="field">
          <label>Markup<small>Website price = your total cost × this</small><div class="presets" id="presets"><button data-m="2">2×</button><button data-m="2.2">2.2×</button><button data-m="2.5">2.5×</button><button data-m="3">3×</button></div></label>
          <div class="inp"><input id="markup" type="number" min="1" step="0.1"><span>×</span></div>
        </div>
        <div class="field">
          <label>Trade discount<small>Off the website price, same as your trade quotes</small></label>
          <div class="inp"><input id="trade" type="number" min="0" max="90" step="1"><span>%</span></div>
        </div>
        <div class="field">
          <label>Round website price to nearest</label>
          <div class="inp"><select id="round"><option value="1">$1</option><option value="10">$10</option><option value="50">$50</option><option value="100">$100</option></select></div>
        </div>
      </div>
    </div>

    <!-- RESULTS -->
    <div class="results">
      <div class="res-head">
        <div class="label">Result</div>
        <div class="res-name" id="rName">Untitled product</div>
      </div>
      <div class="prices">
        <div class="price">
          <div class="label">Website price</div>
          <div class="big" id="rRetail">$0</div>
          <div class="sub" id="rRetailSub">incl GST</div>
        </div>
        <div class="price">
          <div class="label">Trade price</div>
          <div class="big" id="rTrade">$0</div>
          <div class="sub" id="rTradeSub">excl GST</div>
        </div>
      </div>
      <div class="breakdown" id="breakdown"></div>
      <div class="margins">
        <div class="margin">
          <div class="label">Profit · website sale</div>
          <div class="pct" id="rMarginR">0%</div>
          <div class="sub" id="rProfitR">$0 per piece</div>
        </div>
        <div class="margin">
          <div class="label">Profit · trade sale</div>
          <div class="pct" id="rMarginT">0%</div>
          <div class="sub" id="rProfitT">$0 per piece</div>
        </div>
      </div>
      <div class="verdict" id="verdict"></div>
      <div class="actions">
        <button class="btn" id="saveBtn">Save to my list</button>
        <button class="btn ghost" id="newBtn">Start a new product</button>
      </div>
    </div>
  </div>

  <div class="saved">
    <h2>Saved products</h2>
    <p>Compare factory quotes side by side. Saved in this browser only.</p>
    <div id="savedWrap"></div>
  </div>

  <div class="how">
    <h2>How it works</h2>
    <ul>
      <li><strong>Total cost per piece</strong> = factory price in NZD (plus the payment fee) + its share of freight and clearance + duty + delivery to your client, plus the buffer.</li>
      <li><strong>Website price</strong> = total cost × markup, plus GST, rounded. This is the "From NZD" price you'd show on the site.</li>
      <li><strong>Trade price</strong> = website price minus your trade discount, shown excl GST. It's the same sum the trade quote template uses, so the numbers match.</li>
      <li><strong>Profit</strong> is what's left after your total cost, before your own time, marketing and overheads. Aim to keep trade profit at 35% or more.</li>
    </ul>
  </div>
</div>

<script>
(function () {
  var K = 'pp-pricing-current', KL = 'pp-pricing-saved';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var DEFAULTS = {
    name: '', mode: 'ddp', currency: 'USD', price: '', fx: 1.70, fxFee: 1.5,
    qty: 1, freight: '', clearance: '', duty: 0,
    local: 0, buffer: 5, gstReg: true,
    markup: 2.2, trade: 20, round: 50
  };
  var s;
  try { s = Object.assign({}, DEFAULTS, JSON.parse(lsGet(K) || '{}')); } catch (e) { s = Object.assign({}, DEFAULTS); }
  var saved;
  try { saved = JSON.parse(lsGet(KL) || '[]'); if (!Array.isArray(saved)) saved = []; } catch (e) { saved = []; }

  var $ = function (id) { return document.getElementById(id); };
  var nzd = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 });
  var nzd2 = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function n(v) { var x = parseFloat(v); return isNaN(x) ? 0 : x; }

  var FIELDS = ['name', 'currency', 'price', 'fx', 'fxFee', 'qty', 'freight', 'clearance', 'duty', 'local', 'buffer', 'markup', 'trade', 'round'];

  function compute(st) {
    var isNZD = st.currency === 'NZD';
    var fx = isNZD ? 1 : n(st.fx);
    var fee = isNZD ? 0 : n(st.fxFee);
    var gst = !!st.gstReg;
    var r = {};
    r.factoryNZD = n(st.price) * fx * (1 + fee / 100);
    var qty = Math.max(1, Math.round(n(st.qty)) || 1);
    if (st.mode === 'fob') {
      r.freightShare = n(st.freight) / qty;
      r.clearShare = n(st.clearance) / qty;
      r.duty = r.factoryNZD * n(st.duty) / 100;
      r.importGst = gst ? 0 : (r.factoryNZD + r.freightShare + r.duty) * 0.15;
    } else {
      r.freightShare = 0; r.clearShare = 0; r.duty = 0; r.importGst = 0;
    }
    r.local = n(st.local);
    var base = r.factoryNZD + r.freightShare + r.clearShare + r.duty + r.importGst + r.local;
    r.buffer = base * n(st.buffer) / 100;
    r.cost = base + r.buffer;
    var gstMult = gst ? 1.15 : 1;
    var step = n(st.round) || 1;
    var raw = r.cost * n(st.markup) * gstMult;
    r.retailIncl = r.cost > 0 ? Math.max(step, Math.round(raw / step) * step) : 0;
    r.retailEx = r.retailIncl / gstMult;
    r.tradeEx = Math.round(r.retailEx * (1 - n(st.trade) / 100));
    r.profitR = r.retailEx - r.cost;
    r.profitT = r.tradeEx - r.cost;
    r.marginR = r.retailEx ? r.profitR / r.retailEx : 0;
    r.marginT = r.tradeEx ? r.profitT / r.tradeEx : 0;
    r.gst = gst;
    return r;
  }

  function cls(m) { return m >= 0.35 ? 'good' : m >= 0.25 ? 'warn' : 'bad'; }

  function render() {
    var r = compute(s);
    var isNZD = s.currency === 'NZD';
    $('rName').textContent = s.name || 'Untitled product';
    $('rRetail').textContent = nzd.format(r.retailIncl);
    $('rRetailSub').textContent = r.gst ? 'incl GST · ' + nzd.format(r.retailEx) + ' excl GST' : 'no GST charged';
    $('rTrade').textContent = nzd.format(r.tradeEx);
    $('rTradeSub').textContent = r.gst ? 'excl GST · ' + nzd.format(r.tradeEx * 1.15) + ' incl GST' : 'no GST charged';

    var rows = [];
    rows.push(['Factory price in NZD' + (isNZD ? '' : ' (incl ' + n(s.fxFee) + '% fee)'), r.factoryNZD]);
    if (s.mode === 'fob') {
      rows.push(['Share of freight', r.freightShare]);
      rows.push(['Share of clearance and port fees', r.clearShare]);
      if (r.duty) rows.push(['Import duty', r.duty]);
      if (r.importGst) rows.push(['Import GST (not claimable)', r.importGst]);
    }
    if (r.local) rows.push(['Delivery to client', r.local]);
    rows.push(['Buffer (' + n(s.buffer) + '%)', r.buffer]);
    var html = '<div class="label" style="margin-bottom:8px;">Your total cost per piece</div>';
    rows.forEach(function (x) { html += '<div class="row"><span class="muted">' + x[0] + '</span><span>' + nzd2.format(x[1]) + '</span></div>'; });
    html += '<div class="row total"><span>Total cost' + (r.gst ? ' (excl GST)' : '') + '</span><span>' + nzd2.format(r.cost) + '</span></div>';
    $('breakdown').innerHTML = html;

    $('rMarginR').textContent = Math.round(r.marginR * 100) + '%';
    $('rMarginR').className = r.cost ? 'pct m-' + cls(r.marginR) : 'pct';
    $('rProfitR').textContent = nzd.format(r.profitR) + ' per piece';
    $('rMarginT').textContent = Math.round(r.marginT * 100) + '%';
    $('rMarginT').className = r.cost ? 'pct m-' + cls(r.marginT) : 'pct';
    $('rProfitT').textContent = nzd.format(r.profitT) + ' per piece';

    var v = $('verdict');
    if (!r.cost) { v.className = 'verdict'; v.textContent = 'Enter the factory price to see your numbers.'; }
    else if (r.marginT >= 0.35) { v.className = 'verdict good'; v.textContent = 'Healthy. Your trade price still leaves a solid profit after every cost.'; }
    else if (r.marginT >= 0.25) { v.className = 'verdict warn'; v.textContent = 'Workable but tight on trade sales. One cracked piece or a freight increase eats most of it. Consider a higher markup.'; }
    else { v.className = 'verdict bad'; v.textContent = 'Too thin. At this trade price you\'re barely covering costs. Raise the markup, cut the trade discount for this piece, or push the factory on price.'; }

    // inputs visibility
    document.querySelectorAll('#mode button').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === s.mode); });
    $('importCard').style.display = s.mode === 'fob' ? '' : 'none';
    $('ddpNote').style.display = s.mode === 'ddp' ? '' : 'none';
    $('priceHint').textContent = s.mode === 'ddp' ? 'Delivered price from the factory, incl GST' : 'Factory price before freight';
    $('fxRow').style.display = isNZD ? 'none' : '';
    $('fxFeeRow').style.display = isNZD ? 'none' : '';
    $('curLabel').textContent = s.currency;
    document.querySelectorAll('#presets button').forEach(function (b) { b.classList.toggle('on', n(b.dataset.m) === n(s.markup)); });

    lsSet(K, JSON.stringify(s));
  }

  function fill() {
    FIELDS.forEach(function (f) { $(f).value = s[f]; });
    $('gstReg').checked = !!s.gstReg;
  }

  FIELDS.forEach(function (f) {
    $(f).addEventListener('input', function () { s[f] = this.value; render(); });
    $(f).addEventListener('change', function () { s[f] = this.value; render(); });
  });
  $('gstReg').addEventListener('change', function () { s.gstReg = this.checked; render(); });
  document.querySelectorAll('#mode button').forEach(function (b) {
    b.addEventListener('click', function () { s.mode = b.dataset.mode; render(); });
  });
  document.querySelectorAll('#presets button').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); s.markup = b.dataset.m; $('markup').value = s.markup; render(); });
  });

  // ---------- saved list ----------
  function renderSaved() {
    var w = $('savedWrap');
    if (!saved.length) { w.innerHTML = '<div class="empty">Nothing saved yet. Price a product, then tap “Save to my list”.</div>'; return; }
    var h = '<div class="table-scroll"><table><thead><tr><th>Product</th><th>Total cost</th><th>Website</th><th>Trade</th><th>Trade profit</th><th></th></tr></thead><tbody>';
    saved.forEach(function (it, i) {
      var r = compute(it);
      h += '<tr><td>' + esc(it.name || 'Untitled') + '<span class="tag">' + (it.mode === 'ddp' ? 'Delivered' : 'Factory price') + ' · ' + esc(it.currency) + ' ' + n(it.price).toLocaleString('en-NZ') + ' · ' + n(it.markup) + '×</span></td>' +
        '<td>' + nzd.format(r.cost) + '</td><td>' + nzd.format(r.retailIncl) + '</td><td>' + nzd.format(r.tradeEx) + '</td>' +
        '<td class="m-' + cls(r.marginT) + '">' + nzd.format(r.profitT) + ' · ' + Math.round(r.marginT * 100) + '%</td>' +
        '<td><button data-load="' + i + '">Open</button><button class="del" data-del="' + i + '">Delete</button></td></tr>';
    });
    h += '</tbody></table></div>';
    w.innerHTML = h;
    w.querySelectorAll('[data-load]').forEach(function (b) { b.onclick = function () { s = Object.assign({}, DEFAULTS, saved[+b.dataset.load]); fill(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }; });
    w.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { var it = saved[+b.dataset.del]; if (confirm('Delete ' + (it.name || 'this product') + '?')) { saved.splice(+b.dataset.del, 1); lsSet(KL, JSON.stringify(saved)); renderSaved(); } }; });
  }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  $('saveBtn').addEventListener('click', function () {
    if (!s.name.trim()) { $('name').focus(); $('name').placeholder = 'Give it a name first'; return; }
    var idx = saved.findIndex(function (x) { return x.name.trim().toLowerCase() === s.name.trim().toLowerCase(); });
    var copy = JSON.parse(JSON.stringify(s));
    if (idx >= 0) saved[idx] = copy; else saved.push(copy);
    lsSet(KL, JSON.stringify(saved));
    renderSaved();
    var b = this; b.textContent = idx >= 0 ? 'Updated ✓' : 'Saved ✓'; setTimeout(function () { b.textContent = 'Save to my list'; }, 1500);
  });
  $('newBtn').addEventListener('click', function () {
    var keep = { fx: s.fx, fxFee: s.fxFee, gstReg: s.gstReg, markup: s.markup, trade: s.trade, round: s.round, currency: s.currency, mode: s.mode, buffer: s.buffer };
    s = Object.assign({}, DEFAULTS, keep);
    fill(); render(); $('name').focus();
  });

  fill(); render(); renderSaved();
})();
</script>
</body>
</html>
`;
