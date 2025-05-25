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

    // --- REFINED FORMATTING INSTRUCTIONS FOR RELEVANCE + CONCISE POINTS ---
    const formattingInstruction = `
        Provide a very short, point-to-point answer to the following request.
        List only the essential key facts.
        Each point must start on a new line and be prefixed with a single dash ( - ) followed by a space.
        Do NOT include any introductory or concluding sentences or paragraphs.
        Just the list of points, nothing else.
    `.trim();

    const formattedMessage = `${message}\n\n${formattingInstruction}`;

    // Prepare the payload for the Groq API
    const groqPayload = {
      model: "llama3-8b-8192", // Or your chosen Groq model
      messages: [
        {
          role: "system",
          content: "You are an ultra-concise AI assistant focused on delivering only essential facts. Your output must be a simple list of points without any conversational text, introductions, or conclusions. Each point should be on a new line and prefixed with a a single dash."
        },
        { role: "user", content: formattedMessage } // Sending the combined, formatted message
      ],
      temperature: 0.5, // Increased temperature slightly for more varied content
      max_tokens: 512, // Increased max_tokens significantly to allow for diverse answers
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

    // --- POST-PROCESSING: THE RELIABLE CLEANUP ---
    // Remove all instances of double asterisks (**) for bolding
    reply = reply.replaceAll('**', '');

    // Replace markdown list item asterisks (*) with your preferred dash (-)
    // This is important because the AI might still use '*' despite instructions
    reply = reply.replaceAll('* ', '- '); 
    
    // Ensure there's a newline between points if the AI mushes them together
    // This is a more advanced regex to ensure each dash-prefixed item is on its own line
    // It looks for a dash, then anything not a newline, followed by another dash, and inserts a newline
    reply = reply.replace(/(- [^\n]+)( - )/g, '$1\n$2');


    // --- END OF POST-PROCESSING ---

    // Send the AI's cleaned reply back to the frontend
    res.status(200).json({ reply });

  } catch (error) {
    console.error('Serverless Function Error:', error);
    // Generic error response for frontend in case of unexpected errors
    res.status(500).json({ error: 'Internal Server Error - Failed to process AI request.' });
  }
}
