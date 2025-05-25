// File: api/ask.js
// Place this file inside an 'api' directory in your project root (e.g., your-project-root/api/ask.js)

// IMPORTANT: Increase timeout for Vercel Serverless Function
// This allows the function to run for up to 60 seconds, preventing timeouts
// while waiting for the Groq API response.
export const maxDuration = 60; // Vercel Hobby plan max is 60 seconds

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// You do NOT need to 'npm install groq' or 'import Groq from "groq-sdk";' with this approach.

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

    // --- START OF UPDATE ---

    // 1. Define your formatting instructions
    // You can customize this string to be more specific (e.g., "numbered list", "table", "short paragraphs").
    // The key is to be explicit.
    const formattingInstruction = `
        Please provide your response in a clear, systematic manner.
        Use bullet points for key information, and bold any important terms.
        Keep each point concise and easy to read.
    `.trim(); // .trim() helps clean up extra whitespace from the multiline string

    // 2. Combine the user's message with the formatting instruction
    const formattedMessage = `${message}\n\n${formattingInstruction}`;

    // --- END OF UPDATE ---

    // Prepare the payload for the Groq API
    const groqPayload = {
      model: "llama3-8b-8192", // You can choose other Groq models: 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'
      messages: [
        { role: "system", content: "You are a helpful AI assistant. Always strive for clarity and conciseness." }, // Added a system role instruction for general behavior
        { role: "user", content: formattedMessage } // <-- Now sending the combined, formatted message
      ],
      temperature: 0.7, // Creativity level (0.0 to 1.0)
      max_tokens: 1024, // Max tokens in the response. Consider increasing if structured output gets cut off.
    };

    // Make the direct fetch call to the Groq API
    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}` // Send API key in Authorization header
      },
      body: JSON.stringify(groqPayload)
    });

    // Check if the Groq API call was successful
    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({ message: 'Unknown error from Groq API' }));
      console.error('Error from Groq API:', groqResponse.status, errorData);
      return res.status(groqResponse.status).json({
        error: `Groq API Error: ${errorData.message || 'Failed to get response'}`,
        details: errorData // Include details for debugging in development
      });
    }

    const groqData = await groqResponse.json(); // Parse Groq's response

    // Extract the AI's reply. Use optional chaining for safety.
    const reply = groqData.choices?.[0]?.message?.content || "No AI response content found.";

    // Send the AI's reply back to the frontend
    res.status(200).json({ reply });

  } catch (error) {
    console.error('Serverless Function Error:', error);
    // Generic error response for frontend in case of unexpected errors
    res.status(500).json({ error: 'Internal Server Error - Failed to process AI request.' });
  }
}
