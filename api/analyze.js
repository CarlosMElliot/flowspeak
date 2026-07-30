export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'FlowSpeak API is active.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on Vercel.' });
  }

  // Helper to read body stream safely
  const getBody = (req) => {
    return new Promise((resolve) => {
      if (req.body && typeof req.body === 'object') {
        return resolve(req.body);
      }
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({});
        }
      });
    });
  };

  const body = await getBody(req);
  const transcript = body.transcript || body.text || '';

  if (!transcript.trim()) {
    return res.status(400).json({ error: 'No transcript text provided.' });
  }

  const prompt = `
    You are an expert English Speaking Coach for FlowSpeak.
    Analyze this verbatim transcript spoken by an English learner:
    "${transcript}"

    CRITICAL INSTRUCTION:
    In the "corrected" field, ALWAYS rewrite repetitive, conversational, awkward, or informal sentences into natural, polished, professional English. NEVER return an identical string.

    Respond STRICTLY with valid JSON (no markdown block, no extra prose):
    {
      "overall": 88,
      "fluency": 85,
      "grammar": 88,
      "vocabulary": 82,
      "pronunciation": 84,
      "hesitations": 4,
      "wpm": 120,
      "fillers": [],
      "sentences": [
        {
          "original": "exact spoken sentence from transcript",
          "corrected": "polished native English rephrasing",
          "suggestion": "Why this rephrasing sounds more professional and concise.",
          "isGibberish": false,
          "needsCorrection": true,
          "completed": false
        }
      ]
    }
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gemini API Error: ${errText}` });
    }

    const data = await response.json();
    const rawJsonText = data.candidates[0].content.parts[0].text;
    const aiContent = JSON.parse(rawJsonText);

    // Clean score rounding
    aiContent.overall = Math.round(aiContent.overall || 85);
    aiContent.fluency = Math.round(aiContent.fluency || 85);
    aiContent.grammar = Math.round(aiContent.grammar || 85);
    aiContent.vocabulary = Math.round(aiContent.vocabulary || 85);
    aiContent.pronunciation = Math.round(aiContent.pronunciation || 85);
    aiContent.text = transcript;

    return res.status(200).json(aiContent);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
