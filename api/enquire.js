export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, piece, stone, notes, imageBase64, imageMime } = req.body;

  if (!name || !email) return res.status(400).json({ error: 'Missing required fields' });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'Email not configured' });

  const attachments = [];
  if (imageBase64 && imageBase64.length < 3000000) {
    attachments.push({
      filename: 'room.jpg',
      content: imageBase64,
    });
  }

  const html = `
    <h2 style="font-family:sans-serif;color:#2c2a26;">New Render Request</h2>
    <table style="font-family:sans-serif;font-size:14px;line-height:2;color:#444;">
      <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;">Name</td><td>${name}</td></tr>
      <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;">Piece</td><td>${piece}</td></tr>
      <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;">Stone</td><td>${stone}</td></tr>
      ${notes ? `<tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;">Notes</td><td>${notes}</td></tr>` : ''}
      ${imageBase64 ? `<tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;">Photo</td><td>Attached ✓</td></tr>` : '<tr><td style="color:#7BA5A8;font-weight:600;">Photo</td><td>Not uploaded</td></tr>'}
    </table>
    <p style="font-family:sans-serif;font-size:12px;color:#999;margin-top:24px;">Reply directly to this email to respond to ${name}.</p>
  `;

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'Prime Piece Renders <renders@primepiece.co.nz>',
        to: ['james@primepiece.co.nz'],
        reply_to: email,
        subject: `Render Request — ${name} (${piece}, ${stone})`,
        html,
        attachments,
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok || emailData.error) {
      console.error('Resend error:', JSON.stringify(emailData));
      return res.status(500).json({ error: emailData.message || emailData.error || 'Failed to send email' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Enquire error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
