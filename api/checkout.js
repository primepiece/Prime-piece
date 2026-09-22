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
  'board-emerald-vein':  { name: 'Emerald Vein', price: 160 },
  'board-green-onyx':    { name: 'Jade Cloud', price: 190 },
  'board-india-green':   { name: 'Forest Stone', price: 160 },
  'board-pink-storm':    { name: 'Pink Storm', price: 190 },
  'board-teal-tide':     { name: 'Teal Tide',       price: 99 },
  'board-teal-tide-2':   { name: 'Teal Tide II', price: 160 },
  'board-teal-tide-4':   { name: 'Teal Tide IV', price: 160 },
  'board-volcanic-ash':  { name: 'Volcanic Ash', price: 160 },
  'board-white-haven':   { name: 'White Haven', price: 160 },
  // Plinths
  'plinth-dekton-sirius-large':      { name: 'Dekton Sirius Plinth',               price: 2400 },
  'plinth-dekton-sirius-side':       { name: 'Dekton Sirius Side Plinth',         price: 1500 },
  'plinth-florim':                   { name: 'Florim Plinth',                     price: 3200 },
  'plinth-grey-porcelain-450':       { name: 'Grey Porcelain Side Plinth',        price: 700  },
  'plinth-grey-porcelain-800':       { name: 'Grey Porcelain Plinth',             price: 1499 },
  'plinth-indian-green-2':           { name: 'Indian Green Marble Plinth',        price: 1499 },
  'plinth-navarro':                  { name: 'Navarro Marble Plinth',             price: 3499 },
  'plinth-rosso-africano-plinth':    { name: 'Rosso Africano Marble Plinth',      price: 3800 },
  'plinth-rosso-africano-table-2':   { name: 'Rosso Africano Marble Table', price: 5800 },
  'plinth-rosso-levanto-plinth':     { name: 'Rosso Levanto Marble Plinth',       price: 1400 },
  'plinth-verde-apli-table':         { name: 'Verde Apli Marble Table', price: 5200 },
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
  'table-lunar-river':      { name: 'Lunar River', price: 1950 },
  'table-midnight-moon':    { name: 'Midnight Moon', price: 2800 },
  'table-midnight-river':   { name: 'Midnight River', price: 490 },
  'table-midnight-wave':    { name: 'Midnight Wave', price: 540 },
  'table-mountain-breeze':  { name: 'Mountain Breeze', price: 550 },
  'table-obsidian-storm':   { name: 'Obsidian Storm', price: 2650 },
  'table-patagonia-platinum':{ name: 'Patagonia Platinum', price: 550 },
  'table-pietra-noir':      { name: 'Pietra Noir', price: 480 },
  'table-sage-plateau':     { name: 'Sage Plateau', price: 1950 },
  'table-serpentine-storm': { name: 'Serpentine Storm', price: 490 },
  'table-sunset-stone':     { name: 'Sunset Stone', price: 470 },
  'table-twin-jade':        { name: 'Twin Jade (Set of 2)', price: 2850 },
  'table-twin-jade-single': { name: 'Twin Jade (Single)', price: 1550 },
  'table-white-haven':      { name: 'White Haven', price: 480 },
  'table-white-haven-lounge':{ name: 'White Haven Carrara Lounge Table', price: 1950 },
  // Bundles
  'rosso-bundle': { name: 'Rosso Africano Bundle — Table + Plinth', price: 7750 },
};

const PROMO_CODES = { SAMPLEWORKSHOP: 0.10, PRIME10: 0.10, SIMONE10: 0.10 };

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
    resolved.push(product);
  }

  const subtotal = resolved.reduce((sum, p) => sum + p.price, 0);

  // Promo applied server-side — client value is display-only
  const code = (promoCode || '').toUpperCase().trim();
  const discountRate = PROMO_CODES[code] || 0;
  const totalCents = Math.round(subtotal * 100 * (1 - discountRate));

  const itemsLabel = resolved.map(p => `${p.name} ($${p.price})`).join(' | ');
  const description = resolved.map(p => p.name).join(', ');

  const body = new URLSearchParams({
    amount: totalCents.toString(),
    currency: 'nzd',
    description,
    receipt_email: customer.email,
    'metadata[customer_name]': customer.name,
    'metadata[customer_email]': customer.email,
    'metadata[customer_phone]': customer.phone || '',
    'metadata[delivery]': customer.delivery || 'pickup',
    'metadata[notes]': customer.notes || '',
    'metadata[items]': itemsLabel,
    'metadata[promo]': discountRate > 0 ? code : '',
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

    return res.status(200).json({ clientSecret: data.client_secret, amount: totalCents / 100 });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Payment setup failed' });
  }
}
