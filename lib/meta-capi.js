// Meta Conversions API: sends each paid order to Meta from the server, so a sale still counts
// when the browser pixel is blocked (iOS tracking limits, ad blockers, a closed tab before
// success.html loads).
//
// Called by api/webhook.js on payment_intent.succeeded. The browser pixel on success.html sends
// the same Purchase with eventID = the PaymentIntent id, and this sends event_id = that same id,
// so Meta counts the order once whichever arrives first.
//
// Needs META_CAPI_TOKEN in Vercel (Events Manager → the pixel → Settings → Conversions API →
// Generate access token). Without it, nothing is sent and checkout carries on as normal.
// META_PIXEL_ID overrides the pixel; META_TEST_EVENT_CODE (from Events Manager → Test events)
// routes events to the test tab while checking the setup — remove it afterwards.
//
// Lives outside /api so it isn't deployed as its own serverless function.

import { createHash } from 'node:crypto';

const PIXEL_ID = process.env.META_PIXEL_ID || '722124784327437';
const API_VERSION = 'v21.0';

const sha256 = v => createHash('sha256').update(v).digest('hex');
const hashed = v => (v ? [sha256(v)] : undefined);

// Meta wants lowercased, trimmed values; phone as digits with country code.
function normPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '64' + d.slice(1); // NZ local number, e.g. 021… → 6421…
  return d;
}
const norm = v => String(v || '').trim().toLowerCase();

/**
 * @param {object} pi  Stripe PaymentIntent (from the webhook event)
 * @returns {Promise<void>} never throws — a Meta failure must not fail the webhook
 */
export async function sendPurchase(pi) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return;

  const meta = pi.metadata || {};
  const [first, ...rest] = norm(meta.customer_name).split(/\s+/);
  const userData = {
    em: hashed(norm(meta.customer_email)),
    ph: hashed(normPhone(meta.customer_phone)),
    fn: hashed(first),
    ln: hashed(rest.join(' ')),
    country: hashed('nz'),
    client_ip_address: meta.client_ip || undefined,
    client_user_agent: meta.client_ua || undefined,
    fbp: meta.fbp || undefined,
    fbc: meta.fbc || undefined,
  };
  const contentIds = (meta.item_ids || '').split(',').filter(Boolean);

  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor((pi.created || Date.now() / 1000)),
      event_id: pi.id,
      action_source: 'website',
      event_source_url: meta.page_url || 'https://www.primepiece.co.nz/checkout.html',
      user_data: userData,
      custom_data: {
        currency: 'NZD',
        value: pi.amount / 100,
        content_type: 'product',
        content_ids: contentIds,
        num_items: contentIds.length || undefined,
        order_id: pi.id,
      },
    }],
  };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(`https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!r.ok) console.error('Meta CAPI error:', r.status, (await r.text().catch(() => '')).slice(0, 500));
  } catch (err) {
    console.error('Meta CAPI request failed:', err.message);
  } finally {
    clearTimeout(timer);
  }
}

// Reads Meta's browser cookies from the request, for matching the server event to the visitor.
// _fbc is set by the pixel when someone lands from an ad (fbclid in the URL).
export function metaCookies(req) {
  const out = { fbp: '', fbc: '' };
  const cookie = req.headers?.cookie || '';
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === '_fbp') out.fbp = decodeURIComponent(v.join('='));
    if (k === '_fbc') out.fbc = decodeURIComponent(v.join('='));
  }
  return out;
}
