const prompt = `
    You are the FlowSpeak English Speech Coach. Analyze this spoken transcript from an English learner:
    "${transcript}"

    CRITICAL INSTRUCTION:
    In the "corrected" field, ALWAYS rephrase awkward, informal, repetitive, or conversational phrases into natural, polished, professional English. Never return an identical string if it contains casual repetition or conversational bloat.

    Respond STRICTLY with valid JSON (no markdown formatting, no code blocks) matching this schema:
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
          "original": "exact original sentence from user transcript",
          "corrected": "polished, natural native English version with fixed grammar and upgraded phrasing",
          "suggestion": "Specific explanation of why this rephrasing sounds more professional.",
          "isGibberish": false,
          "needsCorrection": true,
          "completed": false
        }
      ]
    }
  `;
