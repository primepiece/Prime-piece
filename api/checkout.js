import { CATALOG } from './_catalog.js';

// Promo codes live here now too — the client can suggest one, but the discount
// it produces is only ever applied using this table, never a client-sent amount.
const PROMO_CODES = { SAMPLEWORKSHOP: 0.10 };

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

  // Look up every item in the server-side catalog — an id that isn't a real
  // product fails the whole request, and price/name always come from here,
  // never from the request body.
  const resolved = [];
  for (const { id } of items) {
    const product = CATALOG[id];
    if (!product) return res.status(400).json({ error: `Unknown product: ${id}` });
    resolved.push({ id, ...product });
  }

  let amount = resolved.reduce((sum, item) => sum + item.price, 0);

  const code = (promoCode || '').trim().toUpperCase();
  const discountRate = PROMO_CODES[code] || 0;
  if (discountRate > 0) amount = Math.round(amount * (1 - discountRate));

  if (amount <= 0) return res.status(400).json({ error: 'Invalid cart total' });

  const description = resolved.map(i => i.name).join(', ');

  const body = new URLSearchParams({
    amount: Math.round(amount * 100).toString(),
    currency: 'nzd',
    description,
    receipt_email: customer.email,
    'metadata[customer_name]': customer.name,
    'metadata[customer_email]': customer.email,
    'metadata[customer_phone]': customer.phone || '',
    'metadata[delivery]': customer.delivery || 'pickup',
    'metadata[notes]': customer.notes || '',
    'metadata[items]': resolved.map(i => `${i.name} ($${i.price})`).join(' | '),
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

    return res.status(200).json({ clientSecret: data.client_secret, amount });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Payment setup failed' });
  }
}
