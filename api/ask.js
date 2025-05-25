// File: api/ask.js
// Place this file inside an 'api' directory in your project root (e.g., your-project-root/api/ask.js)

// IMPORTANT: Increase timeout for Vercel Serverless Function
// This allows the function to run for up to 60 seconds, preventing timeouts
// while waiting for the Groq API response.
export const maxDuration = 60; // Vercel Hobby plan max is 60 seconds

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export default async function handler(req, res) {
  // Ensure only POST requests are processed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed - Only POST requests are permitted.' });
  }

  // Get the Groq API key from environment variables
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  // Basic validation for API key
  if (!GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not set in environment variables.');
    return res.status(500).json({ error: 'Server configuration error: Groq API key missing.' });
  }

  try {
    const { message } = req.body; // 'message' is the user's raw query

    // Validate incoming message
    if (!message) {
      return res.status(400).json({ error: 'Bad Request - No message content provided.' });
    }

    // --- REFINED FORMATTING INSTRUCTIONS FOR SHORT, POINT-TO-POINT ---
    const formattingInstruction = `
        Provide a very short, point-to-point answer to the following request.
        List only the essential key points.
        Each point must start on a new line and be prefixed with a single dash ( - ) followed by a space.
        Do NOT include any introductory or concluding sentences/paragraphs.
        Do NOT use any markdown symbols for bolding (like **) or for bullet points (like *).
        Focus solely on delivering brief, direct facts in the specified list format.
    `.trim();

    const formattedMessage = `${message}\n\n${formattingInstruction}`;

    // Prepare the payload for the Groq API
    const groqPayload = {
      model: "llama3-8b-8192", // Or your chosen Groq model
      messages: [
        {
          role: "system",
          content: "You are a concise AI assistant. Your output must be extremely brief, direct, and adhere strictly to requested formatting. Avoid conversational text, introductions, or conclusions. Only provide requested facts."
        },
        { role: "user", content: formattedMessage } // Sending the combined, formatted message
      ],
      temperature: 0.2, // Lower temperature for less creativity, more directness
      max_tokens: 256, // Significantly reduced max_tokens to force brevity
    };

    // Make the direct fetch call to the Groq API
    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(groqPayload)
    });

    // Check if the Groq API call was successful
    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({ message: 'Unknown error from Groq API' }));
      console.error('Error from Groq API:', groqResponse.status, errorData);
      return res.status(groqResponse.status).json({
        error: `Groq API Error: ${errorData.message || 'Failed to get response'}`,
        details: errorData
      });
    }

    const groqData = await groqResponse.json(); // Parse Groq's response

    let reply = groqData.choices?.[0]?.message?.content || "No AI response content found.";

    // --- Post-processing: Remove all instances of double asterisks (**) ---
    reply = reply.replaceAll('**', '');
    // Also remove single asterisks if they pop up for list items, replace with nothing or a dash
    reply = reply.replaceAll('* ', '- '); // Replace markdown * bullet with a simple dash bullet

    // Send the AI's cleaned reply back to the frontend
    res.status(200).json({ reply });

  } catch (error) {
    console.error('Serverless Function Error:', error);
    // Generic error response for frontend in case of unexpected errors
    res.status(500).json({ error: 'Internal Server Error - Failed to process AI request.' });
  }
}
