
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Missing fields' });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'Email not configured' });

  const firstName = name.split(' ')[0];

  const html = `
<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2C2A26;background:#F5F1EA;padding:40px 32px;">
  <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7BA5A8;margin:0 0 16px;">Prime Piece</p>
  <h1 style="font-size:28px;font-weight:400;margin:0 0 12px;line-height:1.2;">Hi ${firstName}, here's your code</h1>
  <p style="font-size:15px;color:#554F45;margin:0 0 24px;line-height:1.7;">Thank you for visiting. Use the code below for <strong>10% off</strong> your order — valid on any piece in the collection.</p>
  <div style="background:#E0D9CA;border:1.5px dashed #7BA5A8;padding:16px 24px;text-align:center;margin-bottom:24px;display:inline-block;min-width:200px;">
    <span style="font-size:26px;letter-spacing:0.2em;font-weight:500;">PRIME10</span>
  </div>
  <p style="font-size:14px;color:#554F45;margin:0 0 32px;line-height:1.7;">Each piece is handcrafted, one of one. Once it's gone, it's gone.</p>
  <a href="https://www.primepiece.co.nz/plinths.html" style="background:#2C2A26;color:#F5F1EA;padding:14px 32px;text-decoration:none;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;font-family:sans-serif;">Shop the Collection</a>
  <p style="font-size:11px;color:#8A8275;margin-top:40px;">Prime Piece &middot; Auckland, New Zealand &middot; primepiece.co.nz</p>
</div>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: 'Prime Piece <james@primepiece.co.nz>',
      to: [email],
      bcc: ['james@primepiece.co.nz'],
      subject: 'Your 10% off — Prime Piece',
      html,
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    return res.status(500).json({ error: err });
  }

  return res.status(200).json({ success: true });
}
