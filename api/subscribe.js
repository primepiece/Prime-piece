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

  if (!klaviyoKey || !listId) {
    console.error('Klaviyo env vars missing');
    return res.status(500).json({ success: false, error: 'Configuration error' });
  }

  try {
    // Step 1: Create or update profile
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
          attributes: {
            email,
            first_name: name || '',
            properties: { source },
          },
        },
      }),
    });

    let profileId;
    if (profileRes.status === 201) {
      const profileData = await profileRes.json();
      profileId = profileData.data.id;
    } else if (profileRes.status === 409) {
      const profileData = await profileRes.json();
      profileId = profileData.errors?.[0]?.meta?.duplicate_profile_id;
    } else {
      const err = await profileRes.json().catch(() => ({}));
      console.error('Klaviyo profile error:', JSON.stringify(err));
      return res.status(500).json({ success: false, error: 'Klaviyo profile error' });
    }

    if (!profileId) {
      console.error('Klaviyo profile ID missing after 409');
      return res.status(500).json({ success: false, error: 'Klaviyo profile ID missing' });
    }

    // Step 2: Add profile to list
    const listRes = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoKey}`,
        'Content-Type': 'application/json',
        'revision': '2023-12-15',
      },
      body: JSON.stringify({
        data: [{ type: 'profile', id: profileId }],
      }),
    });
    // 204 = already on list (idempotent success), 2xx = added
    if (!listRes.ok && listRes.status !== 204) {
      const err = await listRes.json().catch(() => ({}));
      console.error('Klaviyo list error:', JSON.stringify(err));
      return res.status(500).json({ success: false, error: 'Klaviyo list error' });
    }
  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ success: false, error: 'Unexpected error' });
  }

  // Send confirmation email — basin waitlist gets a launch confirmation, others get PRIME10
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && email) {
    const firstName = (name || '').split(' ')[0] || 'there';
    const isBasinWaitlist = source === 'basin-collection-teaser';

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
  }

  return res.status(200).json({ success: true });
}
