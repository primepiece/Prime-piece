// Vouchers page: the showroom counter's tools for gift vouchers, behind the Pulse login.
//  - Check: look up a code and its balance.
//  - Take at the counter: spend some or all of a voucher on an in-store sale. Any balance left is issued
//    as a new voucher and emailed to the customer, the same as online checkout does.
//  - Sell in-store: issue a new voucher after the customer pays at the counter (EFTPOS or cash), and
//    email it to them. Every sale and redemption is copied to james@primepiece.co.nz as a record.
// The handlers run inside api/scale-os/[page].js (Hobby plan: no room for another function).
import { findVoucher, spendVoucher, issueVoucher, voucherEmailHtml, sendEmail, escapeHtml } from '../../lib/vouchers.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_RE = /^[a-zA-Z0-9-]{8,64}$/;
const wholeDollars = (n, max) => Number.isInteger(n) && n >= 1 && n <= max;
const firstName = name => String(name || '').trim().split(' ')[0];

function recordForJames(subject, rows) {
  const row = (k, v) => `<tr><td style="color:#5D8588;font-weight:600;padding:4px 16px 4px 0;vertical-align:top;">${k}</td><td style="padding:4px 0;">${v}</td></tr>`;
  return sendEmail({
    to: 'james@primepiece.co.nz',
    subject,
    html: `<div style="font-family:sans-serif;max-width:520px;color:#2C2A26;"><h2 style="font-weight:400;">${escapeHtml(subject)}</h2>
      <table style="font-size:14px;line-height:1.6;">${rows.map(([k, v]) => row(k, v)).join('')}</table>
      <p style="font-size:12px;color:#999;">Recorded from the Vouchers page in Prime Piece Pulse.</p></div>`,
  });
}

export async function handleVoucherCheck(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { voucher, reason } = await findVoucher(req.body?.code);
    if (!voucher) return res.status(200).json({ ok: false, reason });
    return res.status(200).json({ ok: true, code: voucher.code, balance: voucher.balance });
  } catch (err) {
    console.error('Voucher check error:', err);
    return res.status(500).json({ error: 'Couldn\'t reach Stripe just now. Try again in a moment.' });
  }
}

export async function handleVoucherRedeem(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { code, email, name, note } = req.body || {};
  const amount = Number(req.body?.amount);
  if (!wholeDollars(amount, 100000)) return res.status(400).json({ error: 'Enter the amount to take off, in whole dollars.' });
  let found;
  try { found = await findVoucher(code); } catch (err) {
    console.error('Voucher redeem lookup error:', err);
    return res.status(500).json({ error: 'Couldn\'t reach Stripe just now. Try again in a moment.' });
  }
  const voucher = found.voucher;
  if (!voucher) return res.status(400).json({ error: found.reason });
  if (amount > voucher.balance) return res.status(400).json({ error: `This voucher only has $${voucher.balance} on it.` });
  const remaining = voucher.balance - amount;
  if (remaining > 0 && !EMAIL_RE.test(String(email || ''))) {
    return res.status(400).json({ error: `$${remaining} will be left over. Enter the customer's email so the new voucher can be sent to them.` });
  }

  const ref = `showroom-${voucher.code}`;
  let spent;
  try { spent = await spendVoucher(voucher.id, ref); } catch (err) {
    console.error('Voucher spend error:', err);
    return res.status(500).json({ error: 'Couldn\'t mark the voucher as used. Nothing has changed; try again.' });
  }
  if (!spent) return res.status(400).json({ error: 'This voucher has just been used somewhere else.' });

  let change = null;
  if (remaining > 0) {
    try {
      change = await issueVoucher(remaining, `${voucher.id}-showroom-change`, { source: 'change', order: ref });
      await sendEmail({ to: email, subject: `Your $${remaining} Prime Piece voucher balance`,
        html: voucherEmailHtml(firstName(name), [change], `here's the $${remaining} left on your voucher.`) });
    } catch (err) {
      console.error('Showroom change voucher error:', err);
    }
  }
  await recordForJames(`Voucher taken in the showroom: ${voucher.code}, $${amount}`, [
    ['Voucher', `${escapeHtml(voucher.code)} ($${voucher.balance})`],
    ['Taken off', `$${amount}`],
    ['Left over', remaining > 0 ? (change ? `$${remaining} issued as ${escapeHtml(change.code)} and emailed to ${escapeHtml(email)}` : `⚠️ $${remaining} could NOT be issued automatically. Create it in Stripe and email ${escapeHtml(email)}.`) : 'Nothing'],
    ...(note ? [['Note', escapeHtml(note)]] : []),
  ]);
  return res.status(200).json({ ok: true, taken: amount, remaining, change: change ? change.code : null, changeFailed: remaining > 0 && !change });
}

export async function handleVoucherIssue(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, name, note, requestId } = req.body || {};
  const amount = Number(req.body?.amount);
  if (!wholeDollars(amount, 5000)) return res.status(400).json({ error: 'Enter the voucher value in whole dollars ($1–$5,000).' });
  if (!EMAIL_RE.test(String(email || ''))) return res.status(400).json({ error: 'Enter the email address to send the voucher to.' });
  if (!REQUEST_RE.test(String(requestId || ''))) return res.status(400).json({ error: 'Refresh the page and try again.' });

  // The request id seeds the code, so pressing the button twice (or a retry) returns the same
  // voucher rather than issuing a second one.
  let voucher;
  try {
    voucher = await issueVoucher(amount, `showroom-sale-${requestId}`, { source: 'showroom', order: `showroom-${requestId}` });
  } catch (err) {
    console.error('Showroom voucher issue error:', err);
    return res.status(500).json({ error: 'Couldn\'t create the voucher in Stripe. Nothing was issued; try again.' });
  }
  await sendEmail({ to: email, subject: 'Your Prime Piece gift voucher',
    html: voucherEmailHtml(firstName(name), [voucher], 'here\'s your gift voucher.') });
  await recordForJames(`Voucher sold in the showroom: ${voucher.code}, $${amount}`, [
    ['Voucher', `${escapeHtml(voucher.code)}, $${amount}`],
    ['Emailed to', `${escapeHtml(name || '')} ${escapeHtml(email)}`],
    ['Payment', 'Taken at the counter (not through Stripe). Record it with your other showroom sales.'],
    ...(note ? [['Note', escapeHtml(note)]] : []),
  ]);
  return res.status(200).json({ ok: true, code: voucher.code, amount });
}

export const VOUCHER_DESK_STYLE = `
  .vd-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
  .vd-grid h2 { font-size: 15px; margin: 0 0 4px; }
  .vd-grid p.muted { font-size: 12.5px; margin: 0 0 14px; line-height: 1.5; }
  .vd-grid label { display: block; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin: 10px 0 4px; }
  .vd-grid input, .vd-grid textarea { width: 100%; padding: 9px 11px; border: 1px solid var(--line); border-radius: 4px; font: inherit; font-size: 14px; }
  .vd-grid textarea { min-height: 54px; }
  .vd-grid .btn { margin-top: 14px; }
  .vd-out { margin-top: 12px; font-size: 13.5px; line-height: 1.5; }
  .vd-out.ok { color: var(--teal-dark); }
  .vd-out.err { color: var(--red); }
  .vd-code { font-family: ui-monospace, Menlo, monospace; font-size: 15px; letter-spacing: .08em; }
`;

export const VOUCHER_DESK_BODY = `
  <h1>Vouchers</h1>
  <p class="page-sub">The showroom counter: check a code, take a voucher off an in-store sale, or sell one in person. Every sale and redemption is emailed to james@primepiece.co.nz.</p>
  <div class="vd-grid">
    <form class="card" id="vd-check">
      <h2>Check a code</h2>
      <p class="muted">See whether a voucher is valid and how much is on it.</p>
      <label for="vd-check-code">Voucher code</label>
      <input id="vd-check-code" placeholder="PP-XXXX-XXXX" autocomplete="off" required>
      <button class="btn btn--ghost" type="submit">Check</button>
      <div class="vd-out" id="vd-check-out"></div>
    </form>
    <form class="card" id="vd-redeem">
      <h2>Take a voucher at the counter</h2>
      <p class="muted">For an in-store sale. Takes the amount off the voucher; anything left is emailed to the customer as a new voucher.</p>
      <label for="vd-redeem-code">Voucher code</label>
      <input id="vd-redeem-code" placeholder="PP-XXXX-XXXX" autocomplete="off" required>
      <label for="vd-redeem-amount">Amount to take off ($)</label>
      <input id="vd-redeem-amount" type="number" min="1" step="1" required>
      <label for="vd-redeem-email">Customer email (needed if any is left over)</label>
      <input id="vd-redeem-email" type="email">
      <label for="vd-redeem-note">What they bought (optional)</label>
      <input id="vd-redeem-note">
      <button class="btn btn--teal" type="submit">Take off voucher</button>
      <div class="vd-out" id="vd-redeem-out"></div>
    </form>
    <form class="card" id="vd-issue">
      <h2>Sell a voucher in-store</h2>
      <p class="muted">Take payment at the counter first (EFTPOS or cash), then issue it here. The voucher is emailed to the address you enter.</p>
      <label for="vd-issue-amount">Value ($)</label>
      <input id="vd-issue-amount" type="number" min="1" step="1" value="200" required>
      <label for="vd-issue-name">Their name (optional)</label>
      <input id="vd-issue-name">
      <label for="vd-issue-email">Email to send it to</label>
      <input id="vd-issue-email" type="email" required>
      <label for="vd-issue-note">Note (optional)</label>
      <input id="vd-issue-note" placeholder="Paid by EFTPOS">
      <button class="btn" type="submit">Issue and email voucher</button>
      <div class="vd-out" id="vd-issue-out"></div>
    </form>
  </div>
`;

export const VOUCHER_DESK_SCRIPT = `
<script>
  (function () {
    function $(id) { return document.getElementById(id); }
    function show(id, ok, html) { var el = $(id); el.className = 'vd-out ' + (ok ? 'ok' : 'err'); el.innerHTML = html; }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
    function post(page, body) {
      return fetch('/api/scale-os/' + page, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (d) { if (r.status === 401) throw new Error('Logged out. Refresh the page and log in again.'); return d; }); });
    }
    function newRequestId() { return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.floor(Math.random() * 1e9)); }
    var issueRequestId = newRequestId();

    $('vd-check').addEventListener('submit', function (e) {
      e.preventDefault();
      show('vd-check-out', true, 'Checking…');
      post('voucher-check', { code: $('vd-check-code').value }).then(function (d) {
        if (d.error) return show('vd-check-out', false, esc(d.error));
        if (!d.ok) return show('vd-check-out', false, esc(d.reason));
        show('vd-check-out', true, 'Valid: <span class="vd-code">' + esc(d.code) + '</span> has <b>$' + d.balance + '</b> on it.');
        $('vd-redeem-code').value = d.code;
      }).catch(function (err) { show('vd-check-out', false, esc(err.message)); });
    });

    $('vd-redeem').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = e.submitter; if (btn) btn.disabled = true;
      show('vd-redeem-out', true, 'Working…');
      post('voucher-redeem', { code: $('vd-redeem-code').value, amount: Number($('vd-redeem-amount').value), email: $('vd-redeem-email').value.trim(), note: $('vd-redeem-note').value.trim() }).then(function (d) {
        if (d.error) return show('vd-redeem-out', false, esc(d.error));
        var msg = 'Done. $' + d.taken + ' taken off.';
        if (d.change) msg += ' The $' + d.remaining + ' left was emailed to the customer as <span class="vd-code">' + esc(d.change) + '</span>.';
        if (d.changeFailed) msg += ' ⚠️ The $' + d.remaining + ' left couldn\\'t be issued automatically. Check your email for what to do.';
        show('vd-redeem-out', !d.changeFailed, msg);
        $('vd-redeem').reset();
      }).catch(function (err) { show('vd-redeem-out', false, esc(err.message)); }).then(function () { if (btn) btn.disabled = false; });
    });

    $('vd-issue').addEventListener('submit', function (e) {
      e.preventDefault();
      var amount = Number($('vd-issue-amount').value);
      if (!confirm('Issue a $' + amount + ' voucher to ' + $('vd-issue-email').value.trim() + '? Only do this once payment has been taken.')) return;
      var btn = e.submitter; if (btn) btn.disabled = true;
      show('vd-issue-out', true, 'Issuing…');
      post('voucher-issue', { amount: amount, name: $('vd-issue-name').value.trim(), email: $('vd-issue-email').value.trim(), note: $('vd-issue-note').value.trim(), requestId: issueRequestId }).then(function (d) {
        if (d.error) return show('vd-issue-out', false, esc(d.error));
        show('vd-issue-out', true, 'Issued <span class="vd-code">' + esc(d.code) + '</span> for $' + d.amount + ' and emailed it.');
        $('vd-issue').reset(); issueRequestId = newRequestId();
      }).catch(function (err) { show('vd-issue-out', false, esc(err.message)); }).then(function () { if (btn) btn.disabled = false; });
    });
  })();
</script>
`;
