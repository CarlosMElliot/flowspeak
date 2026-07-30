export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'FlowSpeak API Active' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on Vercel.' });
  }

  // Parse body safely
  let transcript = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    transcript = body.transcript || body.text || '';
  } catch (e) {
    transcript = '';
  }

  if (!transcript.trim()) {
    return res.status(400).json({ error: 'No transcript text provided.' });
  }

  const prompt = `
    You are an expert English Speaking Coach. Analyze this spoken transcript from an English learner:
    "${transcript}"

    CRITICAL REWRITE REQUIREMENT:
    In "corrected", ALWAYS rewrite, rephrase, or clean up the user's speech into a natural, professional, polished native sentence. Even if the input is jumbled or broken speech, convert it into clear, professional English. NEVER return an identical string.

    Respond STRICTLY in JSON matching this structure:
    {
      "overall": 88,
      "fluency": 85,
      "grammar": 88,
      "vocabulary": 85,
      "pronunciation": 84,
      "hesitations": 2,
      "wpm": 130,
      "fillers": [],
      "sentences": [
        {
          "original": "${transcript.replace(/"/g, '\\"')}",
          "corrected": "A professional, clear native English rephrasing of what the speaker was attempting to say.",
          "suggestion": "Rephrased messy spoken transcript into clear, professional structure.",
          "isGibberish": false,
          "needsCorrection": true,
          "completed": false
        }
      ]
    }
  `;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini Error:", errText);
      return res.status(response.status).json({ error: `Gemini API Error: ${errText}` });
    }

    const data = await response.json();
    const rawJsonText = data.candidates[0].content.parts[0].text;
    const aiContent = JSON.parse(rawJsonText);

    aiContent.overall = Math.round(aiContent.overall || 85);
    aiContent.fluency = Math.round(aiContent.fluency || 85);
    aiContent.grammar = Math.round(aiContent.grammar || 85);
    aiContent.vocabulary = Math.round(aiContent.vocabulary || 85);
    aiContent.pronunciation = Math.round(aiContent.pronunciation || 85);
    aiContent.text = transcript;

    return res.status(200).json(aiContent);
  } catch (error) {
    console.error("Handler Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
