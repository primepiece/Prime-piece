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

    const emailPayload = isBasinWaitlist ? {
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
      from: 'James at Prime Piece <james@primepiece.co.nz>',
      to: [email],
      subject: 'Your welcome credit — Prime Piece',
      html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/><title>Your welcome credit</title></head>
<body style="margin:0;padding:0;background:#F5F1EA;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" style="background:#F5F1EA;" width="100%"><tr><td align="center" style="padding:40px 16px;">
<table border="0" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;" width="560">
${emailHeader}
<tr><td style="padding:40px 0 24px;">
  <p style="margin:0 0 12px;font-size:9px;letter-spacing:0.32em;text-transform:uppercase;color:#7BA5A8;font-weight:500;">Welcome</p>
  <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;color:#2C2A26;line-height:1.2;">You're part of something rare.</h1>
  <p style="margin:16px 0 0;font-size:14px;line-height:1.8;color:#554F45;">Thanks for joining the list, ${firstName}. Every Prime Piece is cut from a single slab of natural stone, so there is only ever one. As a welcome gift, here's 10% off your first ready-made piece.</p>
</td></tr>
<tr><td style="padding-bottom:32px;">
  <table border="0" cellpadding="0" cellspacing="0" style="background:#EBE5DA;border-radius:2px;" width="100%"><tr><td style="padding:24px;text-align:center;">
    <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#8A8275;">Your code</p>
    <p style="margin:0;font-size:28px;letter-spacing:0.24em;color:#2C2A26;font-weight:500;">PRIME10</p>
    <p style="margin:6px 0 0;font-size:11px;color:#8A8275;letter-spacing:0.1em;text-transform:uppercase;">10% off your first ready-made piece</p>
    <p style="margin:8px 0 0;font-size:11px;color:#8A8275;">Excludes custom commissions and trade orders.</p>
  </td></tr></table>
</td></tr>
<tr><td style="padding-bottom:40px;">
  <table border="0" cellpadding="0" cellspacing="0"><tr><td style="background:#7BA5A8;border-radius:1px;"><a href="https://www.primepiece.co.nz/tables.html" style="display:block;padding:16px 36px;font-size:10px;letter-spacing:0.26em;text-transform:uppercase;font-weight:500;color:#F5F1EA;text-decoration:none;">View the Collection →</a></td></tr></table>
</td></tr>
<tr><td style="padding-bottom:40px;border-bottom:1px solid rgba(44,42,38,0.12);">
  <p style="margin:0;font-size:13px;line-height:1.9;color:#554F45;">Each piece is made once from natural stone — when it's gone, it's gone. Have a question first, or want something made to order? Reply to this email or call James directly on <a href="tel:0211466990" style="color:#7BA5A8;text-decoration:none;">021 146 6990</a>.</p>
</td></tr>
${emailFooter}
</table>
</td></tr></table>
</body></html>`,
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
