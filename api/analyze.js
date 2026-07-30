export default async function handler(req, res) {
  // Always handle non-POST or health check requests cleanly
  if (req.method !== 'POST') {
    return res.status(200).json({ message: "FlowSpeak API endpoint active. Use POST with transcript." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY environment variable is not configured in Vercel." });
  }

  // Safely parse body regardless of how Vercel/Fetch formats it
  let transcript = "";
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    transcript = body.transcript || body.text || "";
  } catch (err) {
    transcript = "";
  }

  if (!transcript.trim()) {
    return res.status(400).json({ error: "No transcript provided." });
  }

  const prompt = `
    You are an expert English Speaking Coach for FlowSpeak.
    Analyze this verbatim transcript spoken by an English learner:
    "${transcript}"

    INSTRUCTION:
    1. Provide whole rounded integer scores (0-100) for overall, fluency, grammar, vocabulary, pronunciation.
    2. In "corrected", ALWAYS rewrite the sentence into a natural, polished, native English alternative.
    3. NEVER return the exact same string in "corrected" if phrasing can sound more natural or concise.

    Respond STRICTLY in JSON:
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
          "original": "exact spoken sentence",
          "corrected": "polished native phrasing",
          "suggestion": "Why this change makes the sentence sound more concise and professional.",
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
      const errDetail = await response.text();
      throw new Error(`Gemini API HTTP ${response.status}: ${errDetail}`);
    }

    const data = await response.json();
    const rawJsonText = data.candidates[0].content.parts[0].text;
    const aiContent = JSON.parse(rawJsonText);

    // Round scores to prevent long decimals
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
