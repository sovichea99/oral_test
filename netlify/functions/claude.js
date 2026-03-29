exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);

    const systemText = body.system || '';
    const userText = body.messages?.[0]?.content || '';

    // Combine system + user into one message (Gemini free tier doesn't always support system_instruction)
    const combinedText = systemText + '\n\n' + userText;

    const geminiBody = {
      contents: [{
        role: 'user',
        parts: [{ text: combinedText }]
      }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      }
    };

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: [{ type: 'text', text: 'GEMINI_API_KEY មិនទាន់បានកំណត់នៅ Netlify Environment Variables ទេ។' }]
        }),
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    // Extract text — handle all possible Gemini response shapes
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || data?.candidates?.[0]?.output
      || '';

    // If still empty, return the raw Gemini response so we can debug
    const finalText = text || ('Gemini raw response: ' + JSON.stringify(data).slice(0, 500));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: [{ type: 'text', text: finalText }]
      }),
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: [{ type: 'text', text: 'Server error: ' + err.message }]
      }),
    };
  }
};