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
    // Step 1: Claude analyses the room and writes a targeted placement prompt
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: imageMime || 'image/jpeg', data: imageBase64 }
            },
            {
              type: 'text',
              text: `Look at this room photo carefully. I need to add a single stone furniture piece: ${piece}, made from ${stone}.

Write a precise img2img editing prompt (max 70 words) that describes ONLY the new object being added — its exact position in this specific room, how the stone colour and texture appear under this room's lighting, and how naturally it sits in the space. Keep the rest of the room completely unchanged.

Start the prompt with: "photograph of the same room, unchanged, with [describe the stone piece] placed [where in this room] —"

Output ONLY the prompt text, nothing else.`
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

    // Step 2: Flux img2img — low strength preserves the room, prompt guides the addition
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
          strength: 0.28,
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
