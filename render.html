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
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: imageMime || 'image/jpeg', data: imageBase64 }
            },
            {
              type: 'text',
              text: `You are an expert interior design photographer writing prompts for an AI image generator. Analyse this room photo carefully. Write a single detailed image generation prompt that produces a photorealistic version of this exact room with ${piece} made from ${stone} naturally placed in it. The prompt must describe the room's exact colours, materials, lighting, and layout as seen, place the stone piece in the most natural fitting position, describe the stone's texture, veining, colour and how light catches it, and end with: "photorealistic interior photography, natural lighting, sharp focus, 4K, no text, no watermarks, professional real estate photography style". Output ONLY the prompt. No preamble, no explanation.`
            }
          ]
        }]
      })
    });

    const claudeData = await claudeRes.json();
    if (claudeData.error) throw new Error(`Claude: ${claudeData.error.message}`);

    const imagePrompt = claudeData.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('').trim();

    const replicateRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${replicateKey}`
      },
      body: JSON.stringify({
        input: {
          prompt: imagePrompt,
          width: 1024,
          height: 1024,
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
      prompt: imagePrompt
    });

  } catch (err) {
    console.error('Render error:', err);
    return res.status(500).json({ error: err.message || 'Render failed' });
  }
}
