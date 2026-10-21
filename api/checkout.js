import { VOUCHER_VALUES, isVoucher, findVoucher, spendVoucher, issueVoucher, voucherEmailHtml, sendEmail } from '../lib/vouchers.js';

// Authoritative server-side price catalogue.
// Client sends only product IDs — prices and names always come from here.
const CATALOG = {
  // Basins
  'basin-carrara':    { name: 'White Carrara Vessel Basin', price: 1350 },
  'basin-beige':      { name: 'Warm Beige Vessel Basin', price: 1100 },
  'basin-nero':       { name: 'Nero Marquina Vessel Basin', price: 1200 },
  'basin-green':      { name: 'Dark Green Marble Vessel Basin', price: 1220 },
  'basin-white-onyx': { name: 'White Onyx Vessel Basin', price: 1550 },
  'basin-statuario':  { name: 'Statuario Vessel Basin',            price: 1390 },
  'basin-pietra':     { name: 'Pietra Grey Vessel Basin', price: 1500 },
  'basin-pink-purple':{ name: 'Pink Purple Onyx Vessel Basin', price: 2300 },
  'basin-tiger':      { name: 'Tiger Onyx Vessel Basin', price: 1650 },
  'basin-pink-shell': { name: 'Pink Onyx Shell Vessel Basin',      price: 1590 },
  'basin-yellow':     { name: 'Yellow Onyx Vessel Basin',          price: 1450 },
  // Serving boards
  'board-emerald-vein':  { name: 'Emerald Vein', price: 99 },
  'board-green-onyx':    { name: 'Jade Cloud', price: 99 },
  'board-green-onyx-2':  { name: 'Jade Cloud II', price: 99 },
  'board-india-green':   { name: 'Forest Stone', price: 99 },
  'board-pink-storm':    { name: 'Pink Storm', price: 99 },
  'board-pink-storm-2':  { name: 'Pink Storm II', price: 99 },
  'board-pink-storm-3':  { name: 'Pink Storm III', price: 99 },
  'board-silver-drift':  { name: 'Silver Drift', price: 99 },
  'board-silver-drift-2':{ name: 'Silver Drift II', price: 99 },
  'board-teal-tide-2':   { name: 'Teal Tide II', price: 99 },
  'board-teal-tide-4':   { name: 'Teal Tide IV', price: 99 },
  'board-volcanic-ash':  { name: 'Volcanic Ash', price: 99 },
  'board-white-haven':   { name: 'White Haven', price: 99 },
  // Entertaining platters
  'platter-rosa-cloud':  { name: 'Rosa Cloud — Entertaining Platter', price: 189 },
  'platter-teal-tide':   { name: 'Teal Tide — Entertaining Platter', price: 189 },
  'platter-teal-tide-2': { name: 'Teal Tide II — Entertaining Platter', price: 189 },
  'platter-dune':        { name: 'Dune — Entertaining Platter', price: 189 },
  'platter-silver-mist': { name: 'Silver Mist — Entertaining Platter', price: 189 },
  // Plinths
  'plinth-dekton-sirius-side':       { name: 'Dekton Sirius Coffee Table Plinth', price: 1950 },
  'plinth-florim':                   { name: 'Florim Plinth',                     price: 3200 },
  'plinth-grey-porcelain-450':       { name: 'Grey Porcelain Side Plinth',        price: 700  },
  'plinth-grey-porcelain-800':       { name: 'Grey Porcelain Plinth',             price: 1499 },
  'plinth-indian-green-2':           { name: 'Indian Green Marble Plinth',        price: 4000 },
  'plinth-navarro':                  { name: 'Navarro Marble Plinth',             price: 3499 },
  'plinth-rosso-africano-plinth':    { name: 'Rosso Africano Marble Plinth',      price: 3800 },
  'plinth-rosso-africano-table-2':   { name: 'Rosso Africano Marble Table', price: 4900 },
  'plinth-rosso-levanto-plinth':     { name: 'Rosso Levanto Marble Plinth',       price: 1400 },
  'plinth-verde-apli-table':         { name: 'Verde Alpi Marble Table', price: 4000 },
  // Tables — coffee & side
  'table-amazon-vein-2':    { name: 'Amazon Vein II', price: 520 },
  'table-arctic-vein':      { name: 'Arctic Vein', price: 520 },
  'table-blue-slate':       { name: 'Blue Slate', price: 480 },
  'table-dark-current':     { name: 'Dark Current', price: 510 },
  'table-desert-crown':     { name: 'Desert Crown', price: 2600 },
  'table-desert-drift':     { name: 'Desert Drift', price: 460 },
  'table-desert-drift-2':   { name: 'Desert Drift 2.0', price: 520 },
  'table-desert-drift-ii':  { name: 'Desert Drift II', price: 460 },
  'table-gold-rush':        { name: 'Gold Rush', price: 520 },
  'table-golden-hour':      { name: 'Golden Hour', price: 550 },
  'table-jade-horizon':     { name: 'Jade Horizon', price: 2750 },
  'table-jade-jewel':       { name: 'Jade Jewel', price: 520 },
  'table-jade-rain':        { name: 'Jade Rain', price: 520 },
  'table-lunar-river':      { name: 'Lunar River', price: 1499 },
  'table-midnight-moon':    { name: 'Midnight Moon', price: 2800 },
  'table-midnight-river':   { name: 'Midnight River', price: 490 },
  'table-midnight-wave':    { name: 'Midnight Wave', price: 540 },
  'table-mountain-breeze':  { name: 'Mountain Breeze', price: 550 },
  'table-obsidian-storm':   { name: 'Obsidian Storm', price: 2650 },
  'table-patagonia-platinum':{ name: 'Patagonia Platinum', price: 550 },
  'table-pietra-noir':      { name: 'Pietra Noir', price: 480 },
  'table-sage-plateau':     { name: 'Sage Plateau', price: 1950 },
  'table-serpentine-storm': { name: 'Serpentine Storm', price: 490 },
  'table-twin-jade':        { name: 'Twin Jade (Set of 2)', price: 1700 },
  'table-twin-jade-single': { name: 'Twin Jade (Single)', price: 950 },
  'table-white-haven':      { name: 'White Haven', price: 480 },
  'table-white-haven-lounge':{ name: 'White Haven Carrara Lounge Table', price: 1950 },
  // Bundles
  'rosso-bundle': { name: 'Rosso Africano Bundle — Table + Plinth', price: 7750 },
  // Gift vouchers — emailed as a code after payment (lib/vouchers.js)
  ...Object.fromEntries(Object.entries(VOUCHER_VALUES).map(([id, v]) => [id, { name: `Prime Piece Gift Voucher — $${v}`, price: v }])),
};

// Board pair offer: any two serving boards for $179 ($19 off each pair). Applies automatically
// per complete pair; an odd board out pays full price. Paired boards are already discounted, so
// promo codes don't stack on them. Keep in sync with BOARD_PAIR_* in cart.js and checkout.html.
const BOARD_PAIR_SAVING = 19;
const isBoard = id => id.startsWith('board-');

const PROMO_CODES = { SAMPLEWORKSHOP: 0.10, PRIME10: 0.10, SIMONE10: 0.10 };

// Catalogue entries kept on record (names and prices stay valid for past orders and reporting)
// but NOT sold through online checkout — none has a live Add to Cart anywhere on the site, so a
// request for one can only come from an old cart or a hand-crafted API call. Remove an ID from
// this list to make it purchasable online again.
const NOT_SOLD_ONLINE = new Set([
  // Made-to-order / arriving-soon basins: sold by enquiry (quote + deposit), not checkout.
  'basin-nero', 'basin-green', 'basin-white-onyx', 'basin-statuario', 'basin-pietra',
  'basin-pink-purple', 'basin-tiger', 'basin-pink-shell', 'basin-yellow',
  // Coffee tables taken off the live grid in the "final 5" redesign (#57, 2026-09-29) — confirmed
  // sold, one-of-one pieces that won't be remade. Kept in CATALOG for past-order records only.
  'table-amazon-vein-2', 'table-arctic-vein', 'table-blue-slate', 'table-desert-drift',
  'table-desert-drift-2', 'table-desert-drift-ii', 'table-gold-rush', 'table-golden-hour',
  'table-midnight-river', 'table-midnight-wave', 'table-mountain-breeze',
  'table-patagonia-platinum', 'table-pietra-noir', 'table-white-haven',
]);

// PRIME10 is the sign-up offer: 10% off a ready-made piece for anyone who signs up, no
// first-order restriction. What the server still enforces:
//  - visible, ready-made, full-price pieces only: items in CATALOG that are sold online (not in
//    NOT_SOLD_ONLINE) and not already discounted as a bundle or set (WELCOME_EXCLUDED_IDS).
//    Custom commissions are quoted and invoiced directly and never reach this endpoint;
//  - per-product exclusions: any catalogue ID listed here is never discounted by PRIME10.
// Trade orders can't be told apart at checkout (there are no trade accounts), so that part of
// the terms is enforced by trade pricing being invoiced, not by this code.
const WELCOME_CODE = 'PRIME10';
const WELCOME_EXCLUDED_IDS = new Set([
  'rosso-bundle',   // Rosso Africano table + plinth — already priced below the two pieces
  'table-twin-jade', // Twin Jade set of 2 — already includes the set saving
]);
const isWelcomeEligible = id => !!CATALOG[id] && !NOT_SOLD_ONLINE.has(id) && !WELCOME_EXCLUDED_IDS.has(id);

// NZ-wide delivery: flat rate, free over the threshold. Showroom pickup is
// always free and isn't affected by this.
const DELIVERY_FLAT_FEE = 49;
const FREE_DELIVERY_THRESHOLD = 500;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { items, customer, promoCode } = req.body;

  if (!items?.length || !customer?.email || !customer?.name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Stripe not configured' });

  // Resolve every item against the server catalogue — reject unknown IDs,
  // never use the price from the request body.
  const resolved = [];
  for (const item of items) {
    const product = CATALOG[item.id];
    if (!product) {
      console.error('Unknown product id:', item.id);
      return res.status(400).json({ error: `Unknown product: ${item.id}` });
    }
    if (NOT_SOLD_ONLINE.has(item.id)) {
      console.error('Product not sold online:', item.id);
      return res.status(400).json({ error: `${product.name} isn't available to buy online — please get in touch and we'll help.` });
    }
    resolved.push(product);
  }

  const subtotal = resolved.reduce((sum, p) => sum + p.price, 0);

  // Board pairs: the first 2 × floor(boards / 2) boards in the cart are paired.
  const boardIdx = items.map((item, i) => isBoard(item.id) ? i : -1).filter(i => i >= 0);
  const pairCount = Math.floor(boardIdx.length / 2);
  const pairedIdx = new Set(boardIdx.slice(0, pairCount * 2));
  const pairSaving = pairCount * BOARD_PAIR_SAVING;
  const goodsTotal = subtotal - pairSaving;

  // Vouchers are emailed, so they don't need delivery or count toward free delivery, and
  // neither promo codes nor another voucher can be used to pay for them.
  const voucherItemsTotal = items.reduce((sum, item, i) => sum + (isVoucher(item.id) ? resolved[i].price : 0), 0);
  const physicalTotal = goodsTotal - voucherItemsTotal;

  // Delivery fee computed server-side, same as pricing — never trust the client.
  const deliveryMode = physicalTotal > 0 ? (customer.delivery || 'pickup') : 'email';
  const deliveryFee = (deliveryMode === 'delivery' && physicalTotal < FREE_DELIVERY_THRESHOLD) ? DELIVERY_FLAT_FEE : 0;

  // Promo applied server-side — client value is display-only. The discount is rounded to whole
  // dollars, matching what the checkout page shows.
  const code = (promoCode || '').toUpperCase().trim();
  let discountRate = PROMO_CODES[code] || 0;
  const isWelcome = code === WELCOME_CODE;
  const eligibleSubtotal = items.reduce((sum, item, i) =>
    sum + (!pairedIdx.has(i) && !isVoucher(item.id) && (!isWelcome || isWelcomeEligible(item.id)) ? resolved[i].price : 0), 0);
  let promoMessage = '';
  if (discountRate > 0 && eligibleSubtotal === 0) {
    discountRate = 0;
    promoMessage = pairCount > 0
      ? 'Your boards already have the pair saving — codes don\'t stack with it.'
      : `${WELCOME_CODE} applies to ready-made pieces only.`;
  }
  const discount = discountRate > 0 ? Math.round(eligibleSubtotal * discountRate) : 0;
  const totalBeforeVoucher = goodsTotal - discount + deliveryFee;

  // Gift voucher: checked against Stripe here, marked spent by the webhook once payment succeeds.
  let voucher = null;
  let voucherApplied = 0;
  let voucherMessage = '';
  if (req.body.voucherCode) {
    try {
      const found = await findVoucher(req.body.voucherCode);
      voucher = found.voucher;
      voucherMessage = found.reason;
    } catch (err) {
      console.error('Voucher lookup error:', err);
      voucherMessage = 'We couldn\'t check that voucher just now — please try again.';
    }
    if (voucher) {
      voucherApplied = Math.min(voucher.balance, totalBeforeVoucher - voucherItemsTotal);
      // Stripe can't take a payment under $1, so a voucher that would leave a few cents
      // owing leaves exactly $1 instead.
      const left = totalBeforeVoucher - voucherApplied;
      if (left > 0 && left < 1) voucherApplied = totalBeforeVoucher - 1;
      if (voucherApplied <= 0) { voucherApplied = 0; voucherMessage = 'Gift vouchers can\'t be used to buy another voucher.'; voucher = null; }
    }
  }
  const voucherInfo = voucher
    ? { code: voucher.code, applied: voucherApplied, balance: voucher.balance, remaining: voucher.balance - voucherApplied }
    : { code: '', applied: 0, message: voucherMessage };
  const totalCents = (totalBeforeVoucher - voucherApplied) * 100;

  const itemsLabel = resolved.map(p => `${p.name} ($${p.price})`).join(' | ');
  const description = resolved.map(p => p.name).join(', ');
  const vouchersPurchased = items.filter(item => isVoucher(item.id)).map(item => VOUCHER_VALUES[item.id]).join(',');

  // Fully paid by a voucher: there's nothing to charge, so there's no PaymentIntent. The page
  // shows "Place order" and calls back with placeVoucherOrder, which records the order here.
  if (totalCents === 0 && voucher) {
    if (!req.body.placeVoucherOrder) {
      return res.status(200).json({ clientSecret: null, amount: 0, pairSaving, voucherCoversAll: true, voucher: voucherInfo,
        promo: { code, applied: discount > 0, discount, message: promoMessage } });
    }
    return placeVoucherOrder({ res, voucher, voucherApplied, customer, deliveryMode, itemsLabel, code, discount });
  }

  const body = new URLSearchParams({
    amount: totalCents.toString(),
    currency: 'nzd',
    description,
    receipt_email: customer.email,
    'automatic_payment_methods[enabled]': 'true',
    'metadata[customer_name]': customer.name,
    'metadata[customer_email]': customer.email,
    'metadata[customer_phone]': customer.phone || '',
    'metadata[delivery]': deliveryMode,
    'metadata[delivery_fee]': deliveryFee.toString(),
    'metadata[notes]': customer.notes || '',
    'metadata[items]': itemsLabel,
    'metadata[promo]': discount > 0 ? code : '',
    'metadata[discount]': discount.toString(),
    'metadata[board_pair_saving]': pairSaving.toString(),
    'metadata[address]': (customer.address || '').slice(0, 450),
    'metadata[vouchers_purchased]': vouchersPurchased,
    'metadata[voucher_code]': voucher ? voucher.code : '',
    'metadata[voucher_promo]': voucher ? voucher.id : '',
    'metadata[voucher_applied]': voucherApplied.toString(),
    'metadata[voucher_balance]': voucher ? voucher.balance.toString() : '0',
  });

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await stripeRes.json();

    if (data.error) {
      console.error('Stripe error:', data.error);
      return res.status(400).json({ error: data.error.message });
    }

    return res.status(200).json({
      clientSecret: data.client_secret,
      amount: totalCents / 100,
      pairSaving,
      voucher: voucherInfo,
      promo: { code, applied: discount > 0, discount, message: promoMessage },
    });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Payment setup failed' });
  }
}

// An order paid in full by a gift voucher. Spends the voucher, sends any change as a new
// voucher, and emails James and the customer — the same jobs the webhook does for a paid order.
async function placeVoucherOrder({ res, voucher, voucherApplied, customer, deliveryMode, itemsLabel, code, discount }) {
  const ref = `voucher-${voucher.code}`;
  let spent;
  try {
    spent = await spendVoucher(voucher.id, ref);
  } catch (err) {
    console.error('Voucher spend error:', err);
    return res.status(500).json({ error: 'We couldn\'t confirm your voucher just now — please try again.' });
  }
  if (!spent) return res.status(400).json({ error: 'This voucher has already been used.' });

  const firstName = (customer.name || '').split(' ')[0];
  const remaining = voucher.balance - voucherApplied;
  let change = null;
  if (remaining > 0) {
    try {
      change = await issueVoucher(remaining, `${ref}-change`, { source: 'change', order: ref });
      await sendEmail({ to: customer.email, subject: `Your $${remaining} Prime Piece voucher balance`,
        html: voucherEmailHtml(firstName, [change], `here's the $${remaining} left on your voucher.`) });
    } catch (err) {
      console.error('Voucher change error:', err);
    }
  }

  const row = (k, v) => `<tr><td style="color:#7BA5A8;font-weight:600;padding-right:16px;white-space:nowrap;vertical-align:top;">${k}</td><td>${v}</td></tr>`;
  await sendEmail({
    to: 'james@primepiece.co.nz',
    subject: `🎁 Order paid by voucher — ${customer.name || customer.email}`,
    html: `<div style="font-family:sans-serif;max-width:520px;color:#2c2a26;"><h2 style="font-weight:400;">Order paid in full by gift voucher</h2>
      <table style="font-size:14px;line-height:2;color:#444;">
        ${row('Customer', customer.name || '—')}${row('Email', `<a href="mailto:${customer.email}">${customer.email}</a>`)}
        ${row('Phone', customer.phone || '—')}${row('Items', itemsLabel)}${row('Delivery', deliveryMode)}
        ${customer.address ? row('Address', customer.address) : ''}
        ${row('Voucher', `${voucher.code} — $${voucherApplied} used of $${voucher.balance}`)}
        ${change ? row('Change issued', `${change.code} ($${remaining})`) : ''}
        ${discount > 0 ? row('Promo', code) : ''}${customer.notes ? row('Notes', customer.notes) : ''}
      </table><p style="font-size:12px;color:#999;">No card payment was taken. Reply to the customer to arrange delivery or pickup.</p></div>`,
  });
  await sendEmail({
    to: customer.email,
    subject: 'Your Prime Piece order',
    html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2C2A26;background:#F5F1EA;padding:36px 28px;">
      <h1 style="font-size:26px;font-weight:400;margin:0 0 12px;">Thank you, ${firstName || 'there'}.</h1>
      <p style="font-size:15px;color:#554F45;line-height:1.7;">Your order is confirmed and paid with gift voucher ${voucher.code}. James will be in touch within 24 hours to arrange ${deliveryMode === 'delivery' ? 'delivery' : 'pickup from the Wairau Valley showroom'}.</p>
      <p style="font-size:14px;color:#554F45;line-height:1.7;">${itemsLabel}</p></div>`,
  });

  return res.status(200).json({ paidByVoucher: true, amount: 0, ref });
}
