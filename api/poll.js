export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing prediction ID' });

  const replicateKey = process.env.REPLICATE_API_TOKEN;
  if (!replicateKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${replicateKey}` }
    });

    const data = await pollRes.json();

    if (data.status === 'succeeded' && data.output) {
      const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      return res.status(200).json({ status: 'succeeded', imageUrl });
    }

    if (data.status === 'failed') {
      return res.status(200).json({ status: 'failed', error: data.error || 'Generation failed' });
    }

    return res.status(200).json({ status: data.status });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
