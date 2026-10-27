export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name, source = 'Website Popup' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  // Homepage welcome popup A/B test — which headline this person signed up from.
  const welcomeVariant = ['A', 'B'].includes(req.body.welcomeVariant) ? req.body.welcomeVariant : null;
  const properties = welcomeVariant ? { source, welcome_variant: welcomeVariant } : { source };

  const klaviyoKey = process.env.KLAVIYO_API_KEY;
  const listId = process.env.KLAVIYO_LIST_ID;
  const resendKey = process.env.RESEND_API_KEY;
  const firstName = (name || '').split(' ')[0] || 'there';
  const isBasinWaitlist = source === 'basin-collection-teaser';
  const isReleaseWaitlist = source === 'christmas-release';

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
            attributes: { email, first_name: name || '', properties },
          },
        }),
      });

      let profileId;
      if (profileRes.status === 201) {
        profileId = (await profileRes.json()).data.id;
      } else if (profileRes.status === 409) {
        const profileData = await profileRes.json();
        profileId = profileData.errors?.[0]?.meta?.duplicate_profile_id;
        // Already in Klaviyo (e.g. from an abandoned checkout): the create above didn't
        // save anything, so record which popup headline they signed up from.
        if (profileId && welcomeVariant) {
          const patchRes = await fetch(`https://a.klaviyo.com/api/profiles/${profileId}/`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Klaviyo-API-Key ${klaviyoKey}`,
              'Content-Type': 'application/json',
              'revision': '2023-12-15',
            },
            body: JSON.stringify({ data: { type: 'profile', id: profileId, attributes: { properties: { welcome_variant: welcomeVariant } } } }),
          });
          if (!patchRes.ok) console.error('Klaviyo variant update error:', JSON.stringify(await patchRes.json().catch(() => ({}))));
        }
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
          subject: `New subscriber — ${email}${isBasinWaitlist ? ' · Basin Waitlist' : ''}${isReleaseWaitlist ? ' · Christmas Release first look' : ''}`,
          html: `
            <div style="font-family:sans-serif;font-size:14px;line-height:2;color:#444;max-width:480px;">
              <div style="background:#2c2a26;padding:20px 28px;margin-bottom:24px;">
                <div style="color:#C9A96E;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;margin-bottom:4px;">Prime Piece — New Subscriber</div>
                <div style="color:#fff;font-size:18px;font-weight:300;">${email}</div>
              </div>
              <table style="font-size:14px;line-height:2;color:#444;width:100%;">
                <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
                ${name ? `<tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">Name</td><td>${name}</td></tr>` : ''}
                <tr><td style="padding-right:16px;color:#7BA5A8;font-weight:600;white-space:nowrap;">Source</td><td>${source}${welcomeVariant ? ` (headline ${welcomeVariant})` : ''}</td></tr>
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

    // Customer-facing confirmation email — fire and forget. Styled to match
    // the Klaviyo abandoned-checkout email's template (same cream page,
    // same eyebrow/serif-headline/footer system) so every automated email
    // a customer gets from us feels like one consistent brand.
    const emailHeader = `
      <tr>
        <td style="padding-bottom:40px;border-bottom:1px solid rgba(44,42,38,0.12);">
          <p style="margin:0;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;font-weight:500;color:#2C2A26;">PRIME PIECE</p>
          <p style="margin:4px 0 0;font-size:10px;letter-spacing:0.15em;color:#8A8275;font-style:italic;">one of one.</p>
        </td>
      </tr>`;
    const emailFooter = `
      <tr>
        <td style="padding-top:32px;">
          <p style="margin:0 0 4px;font-size:11px;color:#8A8275;line-height:1.7;">Prime Piece, Auckland</p>
          <p style="margin:0;font-size:11px;color:#8A8275;line-height:1.7;"><a href="https://primepiece.co.nz" style="color:#8A8275;text-decoration:none;">primepiece.co.nz</a></p>
        </td>
      </tr>`;

    const emailPayload = isReleaseWaitlist ? {
      from: 'James at Prime Piece <james@primepiece.co.nz>',
      to: [email],
      subject: "You're on the first-look list — Christmas Release",
      html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/><title>You're on the first-look list</title></head>
<body style="margin:0;padding:0;background:#F5F1EA;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" style="background:#F5F1EA;" width="100%"><tr><td align="center" style="padding:40px 16px;">
<table border="0" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;" width="560">
${emailHeader}
<tr><td style="padding:40px 0 24px;">
  <p style="margin:0 0 12px;font-size:9px;letter-spacing:0.32em;text-transform:uppercase;color:#7BA5A8;font-weight:500;">Christmas Release 2026</p>
  <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;color:#2C2A26;line-height:1.2;">You're on the list, ${firstName}.</h1>
  <p style="margin:16px 0 0;font-size:14px;line-height:1.8;color:#554F45;">Three natural stone grazing boards — burgundy red, deep green, and white with grey veining. One of each, never repeated. You'll get the photos and the link before they go anywhere else.</p>
</td></tr>
<tr><td style="padding-bottom:40px;border-bottom:1px solid rgba(44,42,38,0.12);">
  <p style="margin:0;font-size:13px;line-height:1.9;color:#554F45;">Each board is cut and finished by hand in our Wairau Valley workshop. Questions? Reply to this email or call James on <a href="tel:0211466990" style="color:#7BA5A8;text-decoration:none;">021 146 6990</a>.</p>
</td></tr>
${emailFooter}
</table>
</td></tr></table>
</body></html>`,
    } : isBasinWaitlist ? {
      from: 'James at Prime Piece <james@primepiece.co.nz>',
      to: [email],
      subject: "You're on the list — Prime Piece Stone Basins",
      html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/><title>You're on the list</title></head>
<body style="margin:0;padding:0;background:#F5F1EA;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" style="background:#F5F1EA;" width="100%"><tr><td align="center" style="padding:40px 16px;">
<table border="0" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;" width="560">
${emailHeader}
<tr><td style="padding:40px 0 24px;">
  <p style="margin:0 0 12px;font-size:9px;letter-spacing:0.32em;text-transform:uppercase;color:#7BA5A8;font-weight:500;">Basin waitlist</p>
  <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;color:#2C2A26;line-height:1.2;">You're on the list, ${firstName}.</h1>
  <p style="margin:16px 0 0;font-size:14px;line-height:1.8;color:#554F45;">Our natural stone vessel basin collection launches on <strong>14 September 2026</strong>. You'll hear from us first — before anyone else gets access.</p>
</td></tr>
<tr><td style="padding-bottom:40px;border-bottom:1px solid rgba(44,42,38,0.12);">
  <p style="margin:0;font-size:13px;line-height:1.9;color:#554F45;">Each basin is handcrafted in Auckland from a unique piece of natural stone — marble, onyx and travertine. Made to order, 6–8 week lead time. Questions before launch? Reply to this email or call James directly on <a href="tel:0211466990" style="color:#7BA5A8;text-decoration:none;">021 146 6990</a>.</p>
</td></tr>
${emailFooter}
</table>
</td></tr></table>
</body></html>`,
    } : {
      from: 'Prime Piece <james@primepiece.co.nz>',
      to: [email],
      bcc: ['james@primepiece.co.nz'],
      subject: 'Your 10% off — Prime Piece',
      html: `
<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2C2A26;background:#F5F1EA;padding:40px 32px;">
  <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7BA5A8;margin:0 0 16px;">Prime Piece</p>
  <h1 style="font-size:28px;font-weight:400;margin:0 0 12px;line-height:1.2;">${name ? `Hi ${firstName}, here's your code` : "Here's your code"}</h1>
  <p style="font-size:15px;color:#554F45;margin:0 0 24px;line-height:1.7;">Thanks for joining the list. Use the code below for <strong>10% off</strong> any ready-made piece in the collection.</p>
  <div style="background:#E0D9CA;border:1.5px dashed #7BA5A8;padding:16px 24px;text-align:center;margin-bottom:8px;display:inline-block;min-width:200px;">
    <span style="font-size:26px;letter-spacing:0.2em;font-weight:500;">PRIME10</span>
  </div>
  <p style="font-size:11px;color:#8A8275;margin:0 0 24px;">Excludes custom commissions and trade orders.</p>
  <p style="font-size:14px;color:#554F45;margin:0 0 32px;line-height:1.7;">Each piece is handcrafted, one of one. Once it's gone, it's gone.</p>
  <a href="https://www.primepiece.co.nz/tables.html" style="background:#2C2A26;color:#F5F1EA;padding:14px 32px;text-decoration:none;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;font-family:sans-serif;">Shop the Collection</a>
  <p style="font-size:11px;color:#8A8275;margin-top:40px;">Prime Piece &middot; Auckland, New Zealand &middot; primepiece.co.nz</p>
</div>`,
    };

    // Awaited, not fire-and-forget: on Vercel the function can be frozen as
    // soon as the response is sent, which silently dropped this email.
    try {
      const confirmRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
        body: JSON.stringify(emailPayload),
      });
      if (!confirmRes.ok) console.error('Confirmation email error:', JSON.stringify(await confirmRes.json().catch(() => ({}))));
    } catch (err) {
      console.error('Confirmation email error:', err);
    }
  } else {
    console.error('Resend env var missing — no notification or confirmation email sent');
  }

  if (!klaviyoOk && !notifyOk) {
    // Both capture paths failed — this lead genuinely was not recorded anywhere.
    return res.status(500).json({ success: false, error: 'Subscription failed — please try again or contact us directly' });
  }

  return res.status(200).json({ success: true });
}
