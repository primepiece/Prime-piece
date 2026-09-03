export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, piece, stone, phone, source } = req.body;
  // Accept either field name — trade.html and other callers send `message`,
  // the room-render form sends `notes`. Losing whichever one isn't read here
  // means the actual enquiry content never reaches James.
  const notes = req.body.notes || req.body.message;
  const { imageBase64, imageMime } = req.body;

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
    <h2 style="font-family:sans-serif;color:#2c2a26;">New Enquiry${source ? ' — ' + source : ''}</h2>
    <table style="font-family:sans-serif;font-size:14px;line-height:2;color:#444;">
      <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;">Name</td><td>${name}</td></tr>
      <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
      ${phone ? `<tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;">Phone</td><td><a href="tel:${phone}">${phone}</a></td></tr>` : ''}
      ${piece ? `<tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;">Piece</td><td>${piece}</td></tr>` : ''}
      ${stone ? `<tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;">Stone</td><td>${stone}</td></tr>` : ''}
      ${notes ? `<tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;vertical-align:top;">Notes</td><td style="white-space:pre-wrap;">${notes}</td></tr>` : ''}
      ${imageBase64 ? `<tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;">Photo</td><td>Attached ✓</td></tr>` : ''}
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
        from: 'Prime Piece <james@primepiece.co.nz>',
        to: ['james@primepiece.co.nz'],
        reply_to: email,
        subject: `${source ? source + ' — ' : 'Enquiry — '}${name}${piece && piece !== 'Get in touch' ? ' · ' + piece : ''}`,
        html,
        attachments,
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok || emailData.error) {
      console.error('Resend error:', JSON.stringify(emailData));
      return res.status(500).json({ error: emailData.message || emailData.error || 'Failed to send email' });
    }

    // Auto-reply to customer
    const replyHtml = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#2c2a26;">
        <div style="background:#2c2a26;padding:28px 32px;margin-bottom:24px;">
          <div style="color:#C9A96E;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;margin-bottom:4px;">Prime Piece</div>
          <div style="color:#fff;font-size:22px;font-weight:300;letter-spacing:0.04em;">Thanks, ${name}.</div>
        </div>
        <div style="padding:0 32px 32px;">
          <p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:18px;">Your message has come through — James will be in touch personally within 24 hours.</p>
          <p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:18px;">In the meantime, take a look at the full gallery to see more of the collection:</p>
          <a href="https://www.primepiece.co.nz/gallery.html" style="display:inline-block;padding:12px 24px;background:#7BA5A8;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;border-radius:1px;margin-bottom:28px;">View the Gallery →</a>
          <p style="font-size:13px;color:#888;line-height:1.6;border-top:1px solid #eee;padding-top:20px;margin-top:8px;">For anything urgent, text James directly: <a href="tel:0211466990" style="color:#7BA5A8;">021 146 6990</a><br>Or reply to this email — it goes straight to him.</p>
          <p style="font-size:12px;color:#bbb;margin-top:16px;">Prime Piece · Wairau Valley, Auckland NZ · <a href="https://www.primepiece.co.nz" style="color:#bbb;">primepiece.co.nz</a></p>
        </div>
      </div>
    `;

    // Send auto-reply (fire and forget — don't fail the main request if this errors)
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'James at Prime Piece <james@primepiece.co.nz>',
        to: [email],
        subject: `Got your message, ${name} — Prime Piece`,
        html: replyHtml,
      }),
    }).catch(err => console.error('Auto-reply error:', err));

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Enquire error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
