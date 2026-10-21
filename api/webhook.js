import { createHmac } from 'node:crypto';
import { markSold } from '../lib/release.js';
import { issueVoucher, spendVoucher, voucherEmailHtml, sendEmail } from '../lib/vouchers.js';

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

  // Gift vouchers: issue and email any that were bought, and mark a voucher used to pay as
  // spent (sending any change as a new voucher). Codes are derived from the PaymentIntent id,
  // so a retried webhook finds the same vouchers rather than issuing new ones.
  const firstName = name ? name.split(' ')[0] : '';
  const voucherRows = [];
  const bought = (meta.vouchers_purchased || '').split(',').map(Number).filter(n => n > 0);
  if (bought.length) {
    try {
      const issued = [];
      for (let i = 0; i < bought.length; i++) {
        issued.push(await issueVoucher(bought[i], `${pi.id}-${i}`, { source: 'purchase', order: pi.id }));
      }
      await sendEmail({ to: email, subject: issued.length > 1 ? 'Your Prime Piece gift vouchers' : 'Your Prime Piece gift voucher',
        html: voucherEmailHtml(firstName, issued, issued.length > 1 ? 'here are your gift vouchers.' : 'here\'s your gift voucher.') });
      issued.forEach(v => voucherRows.push(`Issued ${v.code} ($${v.amount}) — emailed to customer`));
    } catch (err) {
      console.error('Voucher issue error:', err);
      voucherRows.push(`⚠️ Voucher purchase ($${bought.join(', $')}) could NOT be issued automatically — create it by hand in Stripe and email the customer`);
    }
  }
  if (meta.voucher_promo) {
    const applied = Number(meta.voucher_applied || 0);
    const remaining = Number(meta.voucher_balance || 0) - applied;
    try {
      const spent = await spendVoucher(meta.voucher_promo, pi.id);
      voucherRows.push(spent
        ? `Redeemed ${meta.voucher_code}: $${applied} used`
        : `⚠️ ${meta.voucher_code} was ALREADY USED on another order — $${applied} was taken off this one. Check Stripe.`);
      if (spent && remaining > 0) {
        const change = await issueVoucher(remaining, `${pi.id}-change`, { source: 'change', order: pi.id });
        await sendEmail({ to: email, subject: `Your $${remaining} Prime Piece voucher balance`,
          html: voucherEmailHtml(firstName, [change], `here's the $${remaining} left on your voucher.`) });
        voucherRows.push(`Change issued: ${change.code} ($${remaining}) — emailed to customer`);
      }
    } catch (err) {
      console.error('Voucher redeem error:', err);
      voucherRows.push(`⚠️ Couldn't mark ${meta.voucher_code} as used — deactivate it in Stripe by hand`);
    }
  }

  // Christmas Release: mark the boards sold so the gifts page and checkout stop selling them.
  const releaseItems = (meta.release_items || '').split(',').filter(Boolean);
  if (releaseItems.length) {
    try {
      const boards = await markSold(releaseItems, pi.id);
      voucherRows.push(`Christmas Release sold: ${boards.join(', ')} — now showing Sold on the site`);
    } catch (err) {
      console.error('Release mark sold error:', err);
      voucherRows.push('⚠️ Christmas Release board sold but could NOT be marked sold — it may still show as available. Tell Claude or mark it in Stripe.');
    }
  }

  // Notify James of the sale (belt-and-suspenders alongside Stripe dashboard)
  if (resendKey) {
    await fetch('https://api.resend.com/emails', {
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
              ${meta.address ? `<tr><td style="color:#7BA5A8;font-weight:600;padding-right:16px;vertical-align:top;">Address</td><td>${meta.address}</td></tr>` : ''}
              ${voucherRows.length ? `<tr><td style="color:#7BA5A8;font-weight:600;padding-right:16px;vertical-align:top;">Notes for James</td><td>${voucherRows.join('<br>')}</td></tr>` : ''}
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

  // HMAC-SHA256 with Node's built-in crypto
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
