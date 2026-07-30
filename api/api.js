export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured on server' });
  }

  const { transcript } = req.body;

  const prompt = `
    You are the FlowSpeak English Speech Coach. Analyze this spoken transcript:
    "${transcript}"

    Respond STRICTLY with valid JSON matching this format:
    {
      "overall": 88,
      "fluency": 85,
      "grammar": 88,
      "vocabulary": 90,
      "pronunciation": 84,
      "hesitations": 4,
      "wpm": 130,
      "fillers": ["like", "um"],
      "sentences": [
        {
          "original": "exact original sentence from transcript",
          "corrected": "polished, natural native English version with fixed grammar, agreement, and no truncated words",
          "suggestion": "Say 'XYZ' instead of 'ABC' to sound more natural.",
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

    const data = await response.json();
    const rawJsonText = data.candidates[0].content.parts[0].text;
    const aiContent = JSON.parse(rawJsonText);
    aiContent.text = transcript;

    return res.status(200).json(aiContent);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}