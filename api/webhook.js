import { createHmac } from 'node:crypto';
import { markSold } from '../lib/release.js';
import { issueVoucher, spendVoucher, voucherEmailHtml, sendEmail, formatExpiry, escapeHtml, GIFT_CARD_POST_BY } from '../lib/vouchers.js';

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
  const card = meta.gift_card; // 'post', 'pickup' or '' — the printed gift card add-on
  const cardNote = card === 'post'
    ? `Your printed card${bought.length > 1 ? 's' : ''} will be posted to ${escapeHtml(meta.gift_card_to || 'the address you gave')} within 2 working days.`
    : card === 'pickup'
    ? `Your printed card${bought.length > 1 ? 's' : ''} will be ready to collect from our Wairau Valley showroom within 2 working days. We'll email you when ${bought.length > 1 ? 'they\'re' : 'it\'s'} ready.`
    : '';
  const issued = [];
  if (bought.length) {
    try {
      for (let i = 0; i < bought.length; i++) {
        issued.push(await issueVoucher(bought[i], `${pi.id}-${i}`, { source: 'purchase', order: pi.id }));
      }
      await sendEmail({ to: email, subject: issued.length > 1 ? 'Your Prime Piece gift vouchers' : 'Your Prime Piece gift voucher',
        html: voucherEmailHtml(firstName, issued, issued.length > 1 ? 'here are your gift vouchers.' : 'here\'s your gift voucher.', { note: cardNote }) });
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

  // Printed gift card: a separate to-do email for James with everything needed to print and send it.
  if (card && bought.length) {
    const posted = card === 'post';
    const to = escapeHtml(meta.gift_card_to || '');
    const stone = amount => amount >= 500 ? 'Emerald Vein' : amount >= 200 ? 'Teal Tide' : 'White Haven';
    const row = (k, v) => `<tr><td style="color:#5D8588;font-weight:600;padding:4px 16px 4px 0;white-space:nowrap;vertical-align:top;">${k}</td><td style="padding:4px 0;">${v}</td></tr>`;
    const cards = issued.length
      ? issued.map(v => `<div style="border:2px dashed #54ABBB;padding:12px 18px;margin:0 0 10px;">
          <div style="font-size:12px;color:#8A8275;text-transform:uppercase;letter-spacing:0.2em;">$${v.amount} card · ${stone(v.amount)}</div>
          <div style="font-size:26px;letter-spacing:0.14em;font-weight:600;margin:4px 0;">${v.code}</div>
          <div style="font-size:13px;color:#554F45;">Valid until ${formatExpiry(v.expiresAt)}</div></div>`).join('')
      : `<p style="color:#7a3020;font-weight:600;">⚠️ The voucher codes weren't issued automatically ($${bought.join(', $')}). Create them by hand in Stripe first, then print the cards.</p>`;
    voucherRows.push(posted ? `Printed card: post to ${to || '—'} — print & post email sent` : 'Printed card: showroom pickup — print email sent');
    await sendEmail({
      to: 'james@primepiece.co.nz',
      subject: posted ? `✉️ Print & post: gift card for ${meta.gift_card_to || name || email}` : `🎁 Print for pickup: gift card for ${meta.gift_card_to || name || email}`,
      html: `<div style="font-family:sans-serif;max-width:520px;color:#2C2A26;">
        <h2 style="font-weight:400;margin:0 0 6px;">${posted ? 'Print and post' : 'Print for showroom pickup'}: ${bought.length > 1 ? `${bought.length} gift cards` : 'gift card'}</h2>
        <p style="font-size:14px;color:#554F45;margin:0 0 18px;">The voucher${bought.length > 1 ? 's were' : ' was'} already emailed to the buyer. ${posted ? `Post within 2 working days. Orders before ${GIFT_CARD_POST_BY} are promised for Christmas.` : 'Have it ready within 2 working days, then email the buyer that it\'s ready to collect.'}</p>
        ${cards}
        <table style="font-size:14px;line-height:1.6;color:#444;margin-top:14px;">
          ${row('Card for', to || '—')}
          ${posted ? row('Post to', escapeHtml(meta.gift_card_address || '').replace(/\n/g, '<br>') || '<strong style="color:#7a3020;">No address given — email the buyer for it</strong>') : row('Pickup', 'Showroom, 209B Archers Road')}
          ${row('Message', meta.gift_card_message ? `“${escapeHtml(meta.gift_card_message)}”` : '— (sign it from the buyer)')}
          ${row('Bought by', `${escapeHtml(name || '—')} · <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>${meta.customer_phone ? ` · ${escapeHtml(meta.customer_phone)}` : ''}`)}
        </table>
        <ol style="font-size:13px;color:#554F45;line-height:1.7;padding-left:18px;margin-top:18px;">
          <li>Take the card with the matching stone on the front.</li>
          <li>On the front, write the code in the dashed box, the date under Valid until, and the To / From (white gel pen on the dark $500 card).</li>
          <li>On the back, write the message under A note for you, if there is one, and sign it from the buyer.</li>
          <li>Envelope and band${posted ? ', address it, and post it.' : ', then keep it at the counter.'}</li>
        </ol>
        <p style="font-size:12px;color:#999;">Stripe ID ${pi.id}</p></div>`,
    });
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
