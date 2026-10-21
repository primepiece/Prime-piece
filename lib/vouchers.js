// Gift vouchers. Each voucher is a Stripe promotion code on a fixed-amount NZD coupon, so
// Stripe is the only store: it holds every code, its value and whether it's been spent
// (spent = promotion code deactivated). Nothing here needs a database, and James can see,
// search and deactivate vouchers in the Stripe dashboard under Products → Coupons.
//
// Vouchers never go through Stripe's own discount machinery (checkout uses PaymentIntents,
// which don't take coupons). api/checkout.js looks the code up and takes the value off the
// amount itself; api/webhook.js marks it spent once the payment succeeds.
//
// Lives outside /api so it isn't deployed as its own serverless function (Hobby plan limit).

import { createHmac } from 'node:crypto';

// Pinned: promotion_code.coupon is an expanded Coupon object in this version; later API
// versions moved it, and the account default would otherwise decide the response shape.
const STRIPE_VERSION = '2024-06-20';
const VALID_YEARS = 3;

export const VOUCHER_VALUES = { 'voucher-100': 100, 'voucher-200': 200, 'voucher-500': 500 };
export const isVoucher = id => Object.prototype.hasOwnProperty.call(VOUCHER_VALUES, id);

async function stripe(path, { method = 'GET', params } = {}) {
  const headers = {
    Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    'Stripe-Version': STRIPE_VERSION,
  };
  let url = `https://api.stripe.com/v1/${path}`;
  let body;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (method === 'GET') url += `?${qs}`;
    else { body = qs; headers['Content-Type'] = 'application/x-www-form-urlencoded'; }
  }
  const r = await fetch(url, { method, headers, body });
  const data = await r.json();
  if (data.error) {
    const err = new Error(data.error.message);
    err.code = data.error.code;
    throw err;
  }
  return data;
}

// Codes are shown as PP-7KQM-X3RD but stored in Stripe as PP7KQMX3RD (promotion codes only
// allow letters and digits); customers can type them either way. They're derived from a seed (the order's PaymentIntent id +
// position) with an HMAC, so a retried webhook regenerates the same codes instead of issuing
// duplicates, and nobody can work a code out without the secret.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
function codeFromSeed(seed) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SECRET_KEY;
  const bytes = createHmac('sha256', secret).update(`pp-voucher:${seed}`).digest();
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `PP${s}`;
}

// Stored form: PP + 8 letters/digits, whatever spacing or dashes the customer typed.
export function normaliseCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
export function displayCode(code) {
  const c = normaliseCode(code);
  return `${c.slice(0, 2)}-${c.slice(2, 6)}-${c.slice(6)}`;
}

// Create (or, on a retry, find) the voucher for this seed. Returns { code, amount, expiresAt }.
export async function issueVoucher(amount, seed, { source, order } = {}) {
  const code = codeFromSeed(seed);
  const couponId = `ppv_${code}`;
  try {
    await stripe('coupons', {
      method: 'POST',
      params: {
        id: couponId,
        amount_off: String(amount * 100),
        currency: 'nzd',
        duration: 'once',
        name: `Gift voucher $${amount}`,
        'metadata[pp_voucher]': '1',
      },
    });
  } catch (err) {
    if (err.code !== 'resource_already_exists') throw err;
  }

  const expiresAt = Math.floor(Date.now() / 1000) + VALID_YEARS * 365 * 24 * 3600;
  try {
    const promo = await stripe('promotion_codes', {
      method: 'POST',
      params: {
        coupon: couponId,
        code,
        expires_at: String(expiresAt),
        'metadata[pp_voucher]': '1',
        'metadata[source]': source || '',
        'metadata[order]': order || '',
      },
    });
    return { code: displayCode(code), amount, expiresAt: promo.expires_at || expiresAt };
  } catch (err) {
    // Already issued on an earlier attempt — return that one.
    const existing = await stripe('promotion_codes', { params: { code, limit: '1' } });
    const p = existing.data && existing.data[0];
    if (!p) throw err;
    return { code: displayCode(code), amount, expiresAt: p.expires_at };
  }
}

// Look up an unspent voucher. Returns { id, code, balance } or null with a reason.
export async function findVoucher(rawCode) {
  const code = normaliseCode(rawCode);
  if (!/^PP[A-Z0-9]{8}$/.test(code)) return { voucher: null, reason: 'That doesn\'t look like a Prime Piece voucher code.' };
  const list = await stripe('promotion_codes', { params: { code, limit: '1' } });
  const p = list.data && list.data[0];
  if (!p || !p.metadata || p.metadata.pp_voucher !== '1') return { voucher: null, reason: 'We couldn\'t find that voucher code.' };
  if (!p.active) return { voucher: null, reason: 'This voucher has already been used.' };
  if (p.expires_at && p.expires_at * 1000 < Date.now()) return { voucher: null, reason: 'This voucher has expired.' };
  const c = p.coupon || {};
  if (!c.valid || c.currency !== 'nzd' || !c.amount_off) return { voucher: null, reason: 'This voucher can\'t be used.' };
  return { voucher: { id: p.id, code: displayCode(code), balance: c.amount_off / 100 }, reason: '' };
}

// Mark a voucher spent. Returns false if it was already spent (someone used it at the same
// time in another checkout) so the caller can flag it for James.
export async function spendVoucher(promoId, order) {
  const p = await stripe(`promotion_codes/${promoId}`);
  if (!p.active) return false;
  await stripe(`promotion_codes/${promoId}`, {
    method: 'POST',
    params: { active: 'false', 'metadata[spent_on]': order || '' },
  });
  return true;
}

export function formatExpiry(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Pacific/Auckland' });
}

// The email a voucher buyer (or someone left with change from a voucher) receives.
export function voucherEmailHtml(firstName, vouchers, intro) {
  const cards = vouchers.map(v => `
    <div style="background:#2C2A26;color:#F5F1EA;padding:32px 28px;margin:0 0 16px;text-align:center;">
      <div style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#A8C3C5;margin-bottom:10px;">Prime Piece Gift Voucher</div>
      <div style="font-family:Georgia,serif;font-size:44px;font-weight:300;margin-bottom:14px;">$${v.amount}</div>
      <div style="display:inline-block;border:1.5px dashed #7BA5A8;padding:10px 20px;font-family:monospace;font-size:20px;letter-spacing:0.12em;">${v.code}</div>
      <div style="font-size:12px;color:#B8B0A3;margin-top:14px;">Valid until ${formatExpiry(v.expiresAt)}</div>
    </div>`).join('');
  return `
<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2C2A26;background:#F5F1EA;padding:36px 28px;">
  <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7BA5A8;margin:0 0 14px;font-family:sans-serif;">Prime Piece</p>
  <h1 style="font-size:26px;font-weight:400;margin:0 0 12px;line-height:1.25;">Hi ${firstName || 'there'}, ${intro}</h1>
  <p style="font-size:15px;color:#554F45;margin:0 0 24px;line-height:1.7;">Forward this email, or print it and pop it in a card. To use it, add any piece to the cart at primepiece.co.nz and enter the code in the Gift Voucher box at checkout. It can also be used in our Wairau Valley showroom.</p>
  ${cards}
  <p style="font-size:13px;color:#554F45;line-height:1.7;margin:20px 0 0;font-family:sans-serif;">If the order comes to less than the voucher, the change is sent as a new voucher code. Vouchers can't be exchanged for cash.</p>
  <p style="font-size:13px;color:#554F45;line-height:1.7;margin:16px 0 0;font-family:sans-serif;">Questions? Reply to this email or call James on 021 146 6990.</p>
  <p style="font-size:11px;color:#8A8275;margin-top:32px;font-family:sans-serif;">Prime Piece &middot; 209B Archers Road, Wairau Valley, Auckland &middot; primepiece.co.nz</p>
</div>`;
}

export async function sendEmail({ to, subject, html, bcc }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error('Resend env var missing — email not sent:', subject); return; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from: 'James at Prime Piece <james@primepiece.co.nz>', to: [to], bcc, reply_to: 'james@primepiece.co.nz', subject, html }),
    });
    if (!r.ok) console.error('Email error:', subject, await r.text().catch(() => ''));
  } catch (err) {
    console.error('Email error:', subject, err);
  }
}
