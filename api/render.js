export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, imageMime, stone, piece } = req.body;
  if (!imageBase64 || !stone || !piece) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const replicateKey = process.env.REPLICATE_API_TOKEN;
  if (!anthropicKey || !replicateKey) {
    return res.status(500).json({ error: 'API keys not configured' });
  }

  try {
    // Step 1: Claude analyses the room and writes a focused prompt
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: imageMime || 'image/jpeg', data: imageBase64 }
            },
            {
              type: 'text',
              text: `Look at this room photo. I need to add ${piece} made from ${stone} into this room.

Write a short prompt (max 80 words) describing ONLY the stone piece being added — its exact position in the room, the stone colour/texture/veining, how light hits it, and how it sits on the floor. Do NOT describe the room itself. Start with "Add" — e.g. "Add a tall cylindrical red marble plinth with dramatic crimson veining in the left corner near the window, catching warm afternoon light across its polished curved surface."

Output ONLY the prompt.`
            }
          ]
        }]
      })
    });

    const claudeData = await claudeRes.json();
    if (claudeData.error) throw new Error(`Claude: ${claudeData.error.message}`);

    const addPrompt = claudeData.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('').trim();

    // Step 2: Use Flux-dev image-to-image — starts from the actual photo
    const imageUrl = `data:${imageMime || 'image/jpeg'};base64,${imageBase64}`;

    const replicateRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${replicateKey}`
      },
      body: JSON.stringify({
        input: {
          prompt: addPrompt,
          image: imageUrl,
          strength: 0.45,
          num_outputs: 1,
          guidance_scale: 3.5,
          num_inference_steps: 28,
          output_format: 'webp',
          output_quality: 90
        }
      })
    });

    const replicateData = await replicateRes.json();
    if (replicateData.detail) throw new Error(`Replicate: ${replicateData.detail}`);

    return res.status(200).json({
      success: true,
      predictionId: replicateData.id,
      prompt: addPrompt
    });

  } catch (err) {
    console.error('Render error:', err);
    return res.status(500).json({ error: err.message || 'Render failed' });
  }
}
