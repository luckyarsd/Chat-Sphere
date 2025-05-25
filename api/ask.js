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

    // --- Keep the explicit formatting instructions for the AI ---
    const formattingInstruction = `
        Please provide a detailed overview of the topic.
        Begin with a short introductory paragraph to set the context.
        After the introduction, present the main information as a list of distinct points.
        Each main section (like "General Information", "Geography", "Economy", "Culture", "History") should have its own title on a new line, followed by a colon (e.g., General Information:).
        Under each section title, list related details. Each detail should start on a new line and be prefixed with a single dash ( - ) followed by a space.
        Crucially, do NOT use asterisks (*) or double asterisks (**) or any other markdown symbols for bolding or bullet points. Simply format the text so it appears structured and important terms are naturally emphasized.
        Ensure there is a blank line between the introductory paragraph and the first section, and between each main section's title and its details.
        Conclude with a brief, friendly closing sentence.
    `.trim();

    const formattedMessage = `${message}\n\n${formattingInstruction}`;

    // Prepare the payload for the Groq API
    const groqPayload = {
      model: "llama3-8b-8192", // Or your chosen Groq model
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant. Your responses must be clearly structured, highly readable, and adhere precisely to the user's formatting instructions. Absolutely avoid markdown syntax for bolding or lists, unless explicitly asked."
        },
        { role: "user", content: formattedMessage } // Sending the combined, formatted message
      ],
      temperature: 0.7, // Creativity level (0.0 to 1.0)
      max_tokens: 1024, // Max tokens in the response
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

    // --- START OF NEW POST-PROCESSING STEP ---
    // Remove all instances of double asterisks (**) from the reply string
    // This will effectively remove markdown bolding
    reply = reply.replaceAll('**', '');
    // Optionally, if it still uses single asterisks for lists despite instructions, you could also remove those:
    // reply = reply.replaceAll('* ', ''); // Note the space after * to avoid removing actual text characters
    // Or replace them with your desired bullet character:
    // reply = reply.replaceAll('* ', '• '); // Replace * with a proper bullet character

    // --- END OF NEW POST-PROCESSING STEP ---

    // Send the AI's cleaned reply back to the frontend
    res.status(200).json({ reply });

  } catch (error) {
    console.error('Serverless Function Error:', error);
    // Generic error response for frontend in case of unexpected errors
    res.status(500).json({ error: 'Internal Server Error - Failed to process AI request.' });
  }
}
