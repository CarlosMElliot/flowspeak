export default async function handler(req, res) {
  // 1. Allow POST requests (and basic GET checks for testing)
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'API endpoint is active. Send a POST request with transcript data.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing in Vercel settings.' });
  }

  // 2. Safely extract transcript from request body
  let transcript = '';
  try {
    if (typeof req.body === 'string') {
      const parsed = JSON.parse(req.body);
      transcript = parsed.transcript || parsed.text || '';
    } else if (req.body) {
      transcript = req.body.transcript || req.body.text || '';
    }
  } catch (err) {
    transcript = '';
  }

  if (!transcript || transcript.trim() === '') {
    return res.status(400).json({ error: 'No transcript text provided in request body.' });
  }

  // 3. Define prompt AFTER transcript is validated
  const prompt = `
    You are the FlowSpeak English Speech Coach. Analyze this spoken transcript from an English learner:
    "${transcript}"

    CRITICAL INSTRUCTION:
    1. Provide integer scores from 0-100 (NO decimals).
    2. In the "corrected" field, ALWAYS rewrite repetitive, conversational, awkward, or informal sentences into natural, polished, professional English. NEVER return an identical string if phrasing can be improved.

    Respond STRICTLY with valid JSON (no markdown block, no extra prose) matching this format:
    {
      "overall": 88,
      "fluency": 85,
      "grammar": 88,
      "vocabulary": 80,
      "pronunciation": 84,
      "hesitations": 4,
      "wpm": 130,
      "fillers": ["like"],
      "sentences": [
        {
          "original": "exact original sentence from user transcript",
          "corrected": "polished, natural native English version",
          "suggestion": "Detailed explanation of why this rephrasing sounds clearer and more natural.",
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
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const rawJsonText = data.candidates[0].content.parts[0].text;
    const aiContent = JSON.parse(rawJsonText);

    // Ensure integer scores
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
