// Server-side Klaviyo event tracking.
// Accepts { email, event, properties } and forwards to Klaviyo Events API.
// Private API key never leaves the server.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, event, properties = {} } = req.body || {};

  if (!email || !event) {
    return res.status(400).json({ error: 'email and event are required' });
  }

  // Basic email validation — reject obviously bad inputs
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const klaviyoKey = process.env.KLAVIYO_API_KEY;
  if (!klaviyoKey) {
    // Fail silently in production if not configured — don't break the customer journey
    return res.status(200).json({ ok: true, note: 'tracking not configured' });
  }

  try {
    // Upsert the profile first so the event has a profile to attach to
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
          attributes: { email },
        },
      }),
    });

    let profileId;
    const profData = await profRes.json().catch(() => ({}));
    if (profRes.status === 201) {
      profileId = profData?.data?.id;
    } else if (profRes.status === 409) {
      profileId = profData?.errors?.[0]?.meta?.duplicate_profile_id;
    } else {
      console.error('Klaviyo profile upsert failed:', profRes.status, JSON.stringify(profData));
    }

    if (!profileId) {
      return res.status(200).json({ ok: false, note: 'could not resolve profile' });
    }

    // Send the event
    const eventRes = await fetch('https://a.klaviyo.com/api/events/', {
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
            metric: {
              data: { type: 'metric', attributes: { name: event } },
            },
            profile: {
              data: { type: 'profile', id: profileId },
            },
            properties,
          },
        },
      }),
    });

    if (!eventRes.ok) {
      const errData = await eventRes.json().catch(() => ({}));
      console.error('Klaviyo event error:', eventRes.status, JSON.stringify(errData));
      return res.status(200).json({ ok: false, note: 'event send failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Track error:', err);
    // Never return 5xx — don't let tracking failures break the customer journey
    return res.status(200).json({ ok: false, note: 'server error' });
  }
}
