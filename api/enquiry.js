// Basin enquiry handler — separate from /api/enquire (used by stone furniture forms)
// Accepts the field format used by basins-launch.html enquiry modals.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    first_name, last_name, name,
    email, phone, city, message,
    product, source = 'Basin Enquiry',
  } = req.body || {};

  const fullName = name || [first_name, last_name].filter(Boolean).join(' ');
  if (!fullName || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'Email not configured' });

  const firstName = fullName.split(' ')[0];
  const productLine = product || 'Natural Stone Basin';
  const sourceLine = source;

  // Email to James
  const notifyHtml = `
    <div style="font-family:sans-serif;font-size:14px;line-height:2;color:#444;max-width:560px;">
      <div style="background:#2c2a26;padding:20px 28px;margin-bottom:24px;">
        <div style="color:#C9A96E;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;margin-bottom:4px;">Prime Piece — Basin Enquiry</div>
        <div style="color:#fff;font-size:18px;font-weight:300;">${fullName} is enquiring about ${productLine}</div>
      </div>
      <table style="font-size:14px;line-height:2;color:#444;width:100%;">
        <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">Name</td><td>${fullName}</td></tr>
        <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
        ${phone ? `<tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">Phone</td><td><a href="tel:${phone}">${phone}</a></td></tr>` : ''}
        ${city ? `<tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">City</td><td>${city}</td></tr>` : ''}
        <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">Product</td><td>${productLine}</td></tr>
        <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">Source</td><td>${sourceLine}</td></tr>
        ${message ? `<tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;vertical-align:top;">Message</td><td style="white-space:pre-wrap;">${message}</td></tr>` : ''}
      </table>
      <p style="font-size:12px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:16px;">Reply directly to this email to respond to ${fullName}.</p>
    </div>`;

  // Auto-reply to customer
  const replyHtml = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#2c2a26;">
      <div style="background:#2c2a26;padding:28px 32px;margin-bottom:24px;">
        <div style="color:#C9A96E;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;margin-bottom:4px;">Prime Piece</div>
        <div style="color:#fff;font-size:22px;font-weight:300;">Thanks, ${firstName}.</div>
      </div>
      <div style="padding:0 32px 32px;">
        <p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:18px;">Your enquiry about <strong style="color:#2c2a26;">${productLine}</strong> has come through. James will be in touch personally within 24 hours.</p>
        <p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:24px;">Every basin is carved from a single slab of natural stone — no two are identical, and none are restocked once sold. If you have questions in the meantime, text James directly:</p>
        <a href="sms:+64211466990" style="display:inline-block;padding:12px 24px;background:#7BA5A8;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;border-radius:1px;margin-bottom:28px;">Text James — 021 146 6990</a>
        <p style="font-size:12px;color:#bbb;margin-top:8px;padding-top:20px;border-top:1px solid #eee;">Prime Piece · Wairau Valley, Auckland NZ · <a href="https://www.primepiece.co.nz" style="color:#bbb;">primepiece.co.nz</a></p>
      </div>
    </div>`;

  try {
    const notifyRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'Prime Piece <james@primepiece.co.nz>',
        to: ['james@primepiece.co.nz'],
        reply_to: email,
        subject: `Basin Enquiry — ${fullName} · ${productLine}`,
        html: notifyHtml,
      }),
    });

    if (!notifyRes.ok) {
      const err = await notifyRes.json().catch(() => ({}));
      console.error('Resend notify error:', JSON.stringify(err));
      return res.status(500).json({ error: 'Failed to send notification' });
    }

    // Auto-reply — fire and forget
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'James at Prime Piece <james@primepiece.co.nz>',
        to: [email],
        subject: `Got your message, ${firstName} — Prime Piece`,
        html: replyHtml,
      }),
    }).catch(err => console.error('Auto-reply error:', err));

    // Track in Klaviyo if we can
    const klaviyoKey = process.env.KLAVIYO_API_KEY;
    if (klaviyoKey) {
      // Upsert profile
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
              first_name: firstName,
              last_name: fullName.includes(' ') ? fullName.slice(firstName.length + 1) : '',
              phone_number: phone || undefined,
              location: city ? { city } : undefined,
            },
          },
        }),
      }).catch(() => null);

      let profileId;
      if (profRes) {
        const profData = await profRes.json().catch(() => ({}));
        profileId = profData?.data?.id || profData?.errors?.[0]?.meta?.duplicate_profile_id;
      }

      if (profileId) {
        fetch('https://a.klaviyo.com/api/events/', {
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
                metric: { data: { type: 'metric', attributes: { name: 'Basin Enquiry Submitted' } } },
                profile: { data: { type: 'profile', id: profileId } },
                properties: {
                  product: productLine,
                  source: sourceLine,
                  city: city || '',
                  message: message || '',
                  url: 'https://www.primepiece.co.nz/basins.html',
                },
              },
            },
          }),
        }).catch(err => console.error('Klaviyo event error:', err));
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Basin enquiry error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
