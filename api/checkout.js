const PROMO_CODES = { SAMPLEWORKSHOP: 0.10, PRIME10: 0.10 };

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

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  if (subtotal <= 0) return res.status(400).json({ error: 'Invalid cart total' });

  // Apply promo server-side — client value is display-only, server is authoritative
  const code = (promoCode || '').toUpperCase().trim();
  const discountRate = PROMO_CODES[code] || 0;
  const discountAmount = Math.round(subtotal * discountRate * 100); // cents
  const totalCents = Math.round(subtotal * 100) - discountAmount;

  const itemsLabel = items.map(i => `${i.name} ($${i.price})`).join(' | ');
  const description = items.map(i => i.name).join(', ');

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
    'metadata[promo]': code || '',
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
