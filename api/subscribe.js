export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name, source = 'Website Popup' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const klaviyoKey = process.env.KLAVIYO_API_KEY;
  const listId = process.env.KLAVIYO_LIST_ID;
  const resendKey = process.env.RESEND_API_KEY;
  const firstName = (name || '').split(' ')[0] || 'there';
  const isBasinWaitlist = source === 'basin-collection-teaser';

  // Klaviyo is best-effort — a Klaviyo outage or misconfiguration must never
  // cause a lead to be lost. James's notification email below is the
  // guaranteed capture path.
  let klaviyoOk = false;
  if (klaviyoKey && listId) {
    try {
      const profileRes = await fetch('https://a.klaviyo.com/api/profiles/', {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${klaviyoKey}`,
          'Content-Type': 'application/json',
          'revision': '2023-12-15',
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            attributes: { email, first_name: name || '', properties: { source } },
          },
        }),
      });

      let profileId;
      if (profileRes.status === 201) {
        profileId = (await profileRes.json()).data.id;
      } else if (profileRes.status === 409) {
        const profileData = await profileRes.json();
        profileId = profileData.errors?.[0]?.meta?.duplicate_profile_id;
      } else {
        console.error('Klaviyo profile error:', JSON.stringify(await profileRes.json().catch(() => ({}))));
      }

      if (profileId) {
        const listRes = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
          method: 'POST',
          headers: {
            'Authorization': `Klaviyo-API-Key ${klaviyoKey}`,
            'Content-Type': 'application/json',
            'revision': '2023-12-15',
          },
          body: JSON.stringify({ data: [{ type: 'profile', id: profileId }] }),
        });
        // 204 = already on list (idempotent success), 2xx = added
        klaviyoOk = listRes.ok || listRes.status === 204;
        if (!klaviyoOk) console.error('Klaviyo list error:', JSON.stringify(await listRes.json().catch(() => ({}))));
      }
    } catch (err) {
      console.error('Klaviyo error:', err);
    }
  } else {
    console.error('Klaviyo env vars missing');
  }

  // Instant notification to James — this is the guaranteed capture path.
  // Runs regardless of whether Klaviyo succeeded, so a subscriber is never
  // silently lost.
  let notifyOk = false;
  if (resendKey) {
    try {
      const notifyRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'Prime Piece <james@primepiece.co.nz>',
          to: ['james@primepiece.co.nz'],
          reply_to: email,
          subject: `New subscriber — ${email}${isBasinWaitlist ? ' · Basin Waitlist' : ''}`,
          html: `
            <div style="font-family:sans-serif;font-size:14px;line-height:2;color:#444;max-width:480px;">
              <div style="background:#2c2a26;padding:20px 28px;margin-bottom:24px;">
                <div style="color:#C9A96E;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;margin-bottom:4px;">Prime Piece — New Subscriber</div>
                <div style="color:#fff;font-size:18px;font-weight:300;">${email}</div>
              </div>
              <table style="font-size:14px;line-height:2;color:#444;width:100%;">
                <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
                ${name ? `<tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">Name</td><td>${name}</td></tr>` : ''}
                <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">Source</td><td>${source}</td></tr>
                <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">Klaviyo</td><td>${klaviyoOk ? 'Added ✓' : 'Not added — check KLAVIYO_API_KEY / KLAVIYO_LIST_ID'}</td></tr>
              </table>
            </div>`,
        }),
      });
      notifyOk = notifyRes.ok;
      if (!notifyOk) console.error('Notify email error:', JSON.stringify(await notifyRes.json().catch(() => ({}))));
    } catch (err) {
      console.error('Notify email error:', err);
    }

    // Customer-facing confirmation email — fire and forget.
    const emailPayload = isBasinWaitlist ? {
      from: 'James at Prime Piece <james@primepiece.co.nz>',
      to: [email],
      subject: "You're on the list — Prime Piece Stone Basins",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#2c2a26;">
          <div style="background:#0A0908;padding:28px 32px;margin-bottom:24px;">
            <div style="color:#C9A86E;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;margin-bottom:4px;">Prime Piece</div>
            <div style="color:#E8E3DC;font-size:22px;font-weight:300;letter-spacing:0.04em;">You're on the list, ${firstName}.</div>
          </div>
          <div style="padding:0 32px 32px;">
            <p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:20px;">Our natural stone vessel basin collection launches on <strong>14 September 2026</strong>. You'll hear from us first — before anyone else gets access.</p>
            <p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:20px;">Each basin is handcrafted in Auckland from a unique piece of natural stone — marble, onyx and travertine. Made to order, 6–8 week lead time.</p>
            <p style="font-size:12px;color:#bbb;margin-top:28px;padding-top:20px;border-top:1px solid #eee;">Prime Piece · Wairau Valley, Auckland NZ · <a href="https://www.primepiece.co.nz" style="color:#bbb;">primepiece.co.nz</a></p>
          </div>
        </div>
      `,
    } : {
      from: 'James at Prime Piece <james@primepiece.co.nz>',
      to: [email],
      subject: 'Your 10% off code — Prime Piece',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#2c2a26;">
          <div style="background:#2c2a26;padding:28px 32px;margin-bottom:24px;">
            <div style="color:#C9A96E;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;margin-bottom:4px;">Prime Piece</div>
            <div style="color:#fff;font-size:22px;font-weight:300;letter-spacing:0.04em;">Here's your code, ${firstName}.</div>
          </div>
          <div style="padding:0 32px 32px;">
            <p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:20px;">Thanks for joining the list. Use the code below for 10% off your order:</p>
            <div style="background:#EBE5DA;border:1.5px dashed #7BA5A8;padding:18px 24px;text-align:center;margin-bottom:24px;">
              <div style="font-size:28px;letter-spacing:0.24em;color:#2c2a26;font-weight:500;">PRIME10</div>
              <div style="font-size:11px;color:#8A8275;margin-top:6px;letter-spacing:0.1em;text-transform:uppercase;">10% off your order</div>
            </div>
            <p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:20px;">Each piece is made once from natural stone — when it's gone, it's gone. Browse the full collection and find yours:</p>
            <a href="https://www.primepiece.co.nz/tables.html" style="display:inline-block;padding:12px 28px;background:#7BA5A8;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;">View the Collection →</a>
            <p style="font-size:12px;color:#bbb;margin-top:28px;padding-top:20px;border-top:1px solid #eee;">Prime Piece · Wairau Valley, Auckland NZ · <a href="https://www.primepiece.co.nz" style="color:#bbb;">primepiece.co.nz</a></p>
          </div>
        </div>
      `,
    };

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
      body: JSON.stringify(emailPayload),
    }).catch(err => console.error('Confirmation email error:', err));
  } else {
    console.error('Resend env var missing — no notification or confirmation email sent');
  }

  if (!klaviyoOk && !notifyOk) {
    // Both capture paths failed — this lead genuinely was not recorded anywhere.
    return res.status(500).json({ success: false, error: 'Subscription failed — please try again or contact us directly' });
  }

  return res.status(200).json({ success: true });
}
