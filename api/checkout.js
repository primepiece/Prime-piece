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
  'basin-yellow':     { name: 'Yellow Onyx Vessel Basin',          price: 1390 },
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
  'plinth-dekton-sirius-side':       { name: 'Dekton Sirius Side Plinth',         price: 1500 },
  'plinth-florim':                   { name: 'Florim Plinth',                     price: 3200 },
  'plinth-grey-porcelain-450':       { name: 'Grey Porcelain Side Plinth',        price: 700  },
  'plinth-grey-porcelain-800':       { name: 'Grey Porcelain Plinth',             price: 1499 },
  'plinth-indian-green-2':           { name: 'Indian Green Marble Plinth',        price: 3490 },
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
};

const PROMO_CODES = { SAMPLEWORKSHOP: 0.10, PRIME10: 0.10, SIMONE10: 0.10 };

// Catalogue entries kept on record (names and prices stay valid for past orders and reporting)
// but NOT sold through online checkout — none has a live Add to Cart anywhere on the site, so a
// request for one can only come from an old cart or a hand-crafted API call. Remove an ID from
// this list to make it purchasable online again.
const NOT_SOLD_ONLINE = new Set([
  // Made-to-order / arriving-soon basins: sold by enquiry (quote + deposit), not checkout.
  'basin-nero', 'basin-green', 'basin-white-onyx', 'basin-statuario', 'basin-pietra',
  'basin-pink-purple', 'basin-tiger', 'basin-pink-shell', 'basin-yellow',
  // Coffee tables taken off the live grid in the "final 5" redesign (#57, 2026-09-29) without
  // being marked sold. Held back pending confirmation of their status.
  'table-amazon-vein-2', 'table-arctic-vein', 'table-blue-slate', 'table-desert-drift',
  'table-desert-drift-2', 'table-desert-drift-ii', 'table-gold-rush', 'table-golden-hour',
  'table-midnight-river', 'table-midnight-wave', 'table-mountain-breeze',
  'table-patagonia-platinum', 'table-pietra-noir', 'table-white-haven',
]);

// PRIME10 is the welcome offer: "new customers, first ready-made piece; excludes custom
// commissions and trade orders". What the server can enforce:
//  - visible, ready-made, full-price pieces only: items in CATALOG that are sold online (not in
//    NOT_SOLD_ONLINE) and not already discounted as a bundle or set (WELCOME_EXCLUDED_IDS).
//    Custom commissions are quoted and invoiced directly and never reach this endpoint;
//  - first order only: refused if this email already has a successful payment in Stripe;
//  - per-product exclusions: any catalogue ID listed here is never discounted by PRIME10.
// Trade orders can't be told apart at checkout (there are no trade accounts), so that part of
// the terms is enforced by trade pricing being invoiced, not by this code.
const WELCOME_CODE = 'PRIME10';
const WELCOME_EXCLUDED_IDS = new Set([
  'rosso-bundle',   // Rosso Africano table + plinth — already priced below the two pieces
  'table-twin-jade', // Twin Jade set of 2 — already includes the set saving
]);
const isWelcomeEligible = id => !!CATALOG[id] && !NOT_SOLD_ONLINE.has(id) && !WELCOME_EXCLUDED_IDS.has(id);

// Has this email already paid for an order? Uses Stripe's PaymentIntent search on the
// customer_email metadata this endpoint stores on every order. Throws if Stripe can't answer.
async function hasPreviousOrder(email, secretKey) {
  const forms = [...new Set([email.trim(), email.trim().toLowerCase()])];
  for (const form of forms) {
    const value = form.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const query = `status:'succeeded' AND metadata['customer_email']:'${value}'`;
    const r = await fetch('https://api.stripe.com/v1/payment_intents/search?' + new URLSearchParams({ query, limit: '1' }), {
      headers: { 'Authorization': `Bearer ${secretKey}` },
    });
    const data = await r.json();
    if (!r.ok || data.error) throw new Error((data.error && data.error.message) || `Stripe search failed (${r.status})`);
    if (data.data && data.data.length) return true;
  }
  return false;
}

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

  // Delivery fee computed server-side, same as pricing — never trust the client.
  const deliveryMode = customer.delivery || 'pickup';
  const deliveryFee = (deliveryMode === 'delivery' && subtotal < FREE_DELIVERY_THRESHOLD) ? DELIVERY_FLAT_FEE : 0;

  // Promo applied server-side — client value is display-only. The discount is rounded to whole
  // dollars, matching what the checkout page shows.
  const code = (promoCode || '').toUpperCase().trim();
  let discountRate = PROMO_CODES[code] || 0;
  let eligibleSubtotal = subtotal;
  let promoMessage = '';
  if (discountRate > 0 && code === WELCOME_CODE) {
    eligibleSubtotal = items.reduce((sum, item, i) => sum + (isWelcomeEligible(item.id) ? resolved[i].price : 0), 0);
    if (eligibleSubtotal === 0) {
      discountRate = 0;
      promoMessage = `${WELCOME_CODE} applies to ready-made pieces only.`;
    } else {
      try {
        if (await hasPreviousOrder(customer.email, secretKey)) {
          discountRate = 0;
          promoMessage = `${WELCOME_CODE} is for your first order — this email has already ordered with us.`;
        }
      } catch (err) {
        // Fail closed: the code is only honoured when we can confirm it's a first order.
        console.error('PRIME10 first-order check failed:', err);
        discountRate = 0;
        promoMessage = `We couldn't verify ${WELCOME_CODE} just now — please try again in a moment.`;
      }
    }
  }
  const discount = discountRate > 0 ? Math.round(eligibleSubtotal * discountRate) : 0;
  const totalCents = (subtotal - discount + deliveryFee) * 100;

  const itemsLabel = resolved.map(p => `${p.name} ($${p.price})`).join(' | ');
  const description = resolved.map(p => p.name).join(', ');

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
      promo: { code, applied: discount > 0, discount, message: promoMessage },
    });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Payment setup failed' });
  }
}
