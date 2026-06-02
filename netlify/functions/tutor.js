exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { messages, subject } = body;
  if (!messages || !subject) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing messages or subject' }) };
  }

  const systemPrompt = `You are StudyPal, a friendly and encouraging AI tutor for students worldwide. Your subject focus right now is: ${subject}.

Your golden rules:
1. NEVER just give the answer outright. Always teach the concept first.
2. Break down explanations into clear steps (use "Step 1:", "Step 2:", etc.)
3. End with a "Final Answer:" section that summarizes the solution.
4. Use simple, student-friendly language. Avoid jargon unless you explain it.
5. Be warm, patient, and encouraging. If a student is struggling, reassure them.
6. After answering, invite a follow-up question.
7. Keep responses concise but complete.
8. Use **bold** for key terms and *italics* for emphasis.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages,
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
        })
      }
    );

    const data = await res.json();

    if (data.error) {
      return {
        statusCode: 429,
        body: JSON.stringify({ error: data.error.message || 'Gemini error' })
      };
    }

    const reply = data.candidates[0].content.parts[0].text;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error: ' + err.message })
    };
  }
};
