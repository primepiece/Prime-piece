// Stripe webhook handler — receives payment_intent.succeeded events.
// Sends a reliable "Placed Order" event to Klaviyo using the metadata
// stored on the PaymentIntent at checkout time (customer email, name, items).
// This is the authoritative post-purchase trigger — not success.html.

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    console.error('Stripe env vars missing');
    return res.status(500).end();
  }

  const rawBody = await readRawBody(req);
  const sig = req.headers['stripe-signature'];

  // Verify webhook signature using Stripe's algorithm
  let event;
  try {
    event = verifyStripeWebhook(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.type !== 'payment_intent.succeeded') {
    return res.status(200).json({ received: true });
  }

  const pi = event.data.object;
  const meta = pi.metadata || {};
  const email = meta.customer_email;
  const name = meta.customer_name;
  const itemsStr = meta.items || '';
  const delivery = meta.delivery || 'pickup';
  const notes = meta.notes || '';
  const promo = meta.promo || '';
  const amountPaid = pi.amount / 100; // Stripe stores in cents

  if (!email) {
    console.error('Webhook: no email in PaymentIntent metadata', pi.id);
    return res.status(200).json({ received: true });
  }

  const klaviyoKey = process.env.KLAVIYO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const ga4Secret = process.env.GA4_API_SECRET;

  // Server-side GA4 purchase event — backstops the client-side event fired
  // from success.html, which silently never fires for ad-blocked browsers,
  // failed redirects, or a tab closed before it loads. Both events share the
  // Stripe PaymentIntent id as transaction_id, which GA4 uses to dedupe
  // purchase events, so this never double-counts revenue.
  if (ga4Secret) {
    try {
      const gaClientId = meta.ga_client_id || `${pi.id}.server`;
      const items = itemsStr.split(' | ').filter(Boolean).map(entry => {
        const match = entry.match(/^(.*) \(\$(\d+(?:\.\d+)?)\)$/);
        return match
          ? { item_name: match[1], price: parseFloat(match[2]), quantity: 1 }
          : { item_name: entry, quantity: 1 };
      });
      await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=G-S14SLX5T16&api_secret=${ga4Secret}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: gaClientId,
          events: [{
            name: 'purchase',
            params: {
              transaction_id: pi.id,
              value: amountPaid,
              currency: 'NZD',
              items,
            },
          }],
        }),
      });
    } catch (err) {
      console.error('GA4 purchase event error:', err);
    }
  }

  // Upsert Klaviyo profile and send Placed Order event
  if (klaviyoKey) {
    try {
      const profRes = await fetch('https://a.klaviyo.com/api/profiles/', {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${klaviyoKey}`,
          'Content-Type': 'application/json',
          'revision': '2023-12-15',
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            attributes: {
              email,
              first_name: name ? name.split(' ')[0] : '',
              last_name: name && name.includes(' ') ? name.slice(name.indexOf(' ') + 1) : '',
            },
          },
        }),
      });

      let profileId;
      const profData = await profRes.json().catch(() => ({}));
      if (profRes.status === 201) profileId = profData?.data?.id;
      else if (profRes.status === 409) profileId = profData?.errors?.[0]?.meta?.duplicate_profile_id;

      if (profileId) {
        await fetch('https://a.klaviyo.com/api/events/', {
          method: 'POST',
          headers: {
            'Authorization': `Klaviyo-API-Key ${klaviyoKey}`,
            'Content-Type': 'application/json',
            'revision': '2023-12-15',
          },
          body: JSON.stringify({
            data: {
              type: 'event',
              attributes: {
                metric: { data: { type: 'metric', attributes: { name: 'Placed Order' } } },
                profile: { data: { type: 'profile', id: profileId } },
                properties: {
                  order_id: pi.id,
                  value: amountPaid,
                  currency: 'NZD',
                  customer_name: name,
                  customer_email: email,
                  delivery_method: delivery,
                  items: itemsStr,
                  promo_code: promo,
                  notes: notes,
                  url: 'https://www.primepiece.co.nz/basins.html',
                },
              },
            },
          }),
        });
      }
    } catch (err) {
      console.error('Klaviyo placed order error:', err);
    }
  }

  // Notify James of the sale (belt-and-suspenders alongside Stripe dashboard)
  if (resendKey) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'Prime Piece <james@primepiece.co.nz>',
        to: ['james@primepiece.co.nz'],
        subject: `💳 Order received — NZD $${amountPaid.toLocaleString('en-NZ')} from ${name || email}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;color:#2c2a26;">
            <div style="background:#2c2a26;padding:20px 28px;margin-bottom:24px;">
              <div style="color:#C9A96E;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;margin-bottom:4px;">Prime Piece — Order Received</div>
              <div style="color:#fff;font-size:20px;font-weight:300;">NZD $${amountPaid.toLocaleString('en-NZ')} · ${name || 'Customer'}</div>
            </div>
            <table style="font-size:14px;line-height:2;color:#444;width:100%;">
              <tr><td style="color:#7BA5A8;font-weight:600;padding-right:16px;white-space:nowrap;">Customer</td><td>${name || '—'}</td></tr>
              <tr><td style="color:#7BA5A8;font-weight:600;padding-right:16px;white-space:nowrap;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="color:#7BA5A8;font-weight:600;padding-right:16px;white-space:nowrap;">Items</td><td>${itemsStr || '—'}</td></tr>
              <tr><td style="color:#7BA5A8;font-weight:600;padding-right:16px;white-space:nowrap;">Total Paid</td><td>NZD $${amountPaid.toLocaleString('en-NZ')}</td></tr>
              <tr><td style="color:#7BA5A8;font-weight:600;padding-right:16px;white-space:nowrap;">Delivery</td><td>${delivery}</td></tr>
              ${promo ? `<tr><td style="color:#7BA5A8;font-weight:600;padding-right:16px;">Promo</td><td>${promo}</td></tr>` : ''}
              ${notes ? `<tr><td style="color:#7BA5A8;font-weight:600;padding-right:16px;vertical-align:top;">Notes</td><td>${notes}</td></tr>` : ''}
              <tr><td style="color:#7BA5A8;font-weight:600;padding-right:16px;">Stripe ID</td><td style="font-size:12px;color:#888;">${pi.id}</td></tr>
            </table>
            <p style="font-size:12px;color:#999;margin-top:24px;padding-top:16px;border-top:1px solid #eee;">Reply to <a href="mailto:${email}">${email}</a> to arrange delivery. Check Stripe dashboard for full payment details.</p>
          </div>`,
      }),
    }).catch(err => console.error('Order notify email error:', err));
  }

  return res.status(200).json({ received: true });
}

// Stripe webhook signature verification (manual — no SDK needed)
function verifyStripeWebhook(payload, header, secret) {
  if (!header) throw new Error('No stripe-signature header');
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=')));
  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) throw new Error('Malformed stripe-signature');

  // Reject stale webhooks (5 minute tolerance)
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (age > 300) throw new Error('Webhook timestamp too old');

  const signedPayload = `${timestamp}.${payload.toString()}`;

  // HMAC-SHA256 — crypto is a Node built-in, no import needed
  const { createHmac } = require('crypto');
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    throw new Error('Signature mismatch');
  }

  return JSON.parse(payload.toString());
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
