// File: api/ask.js
// Place this file inside an 'api' directory in your project root (e.g., your-project-root/api/ask.js)

// IMPORTANT: Increase timeout for Vercel Serverless Function
// This allows the function to run for up to 60 seconds, preventing timeouts
// while waiting for the Groq API response.
export const maxDuration = 60; // Vercel Hobby plan max is 60 seconds

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// --- NEW: Define your creator info here ---
const creatorInfo = {
    name: "Lucky Tiwari",
    role: "Full Stack Developer & Owner of ChatSphere AI",
    image: "owner.jpg",
    bio: "Lucky Tiwari is a passionate full stack developer and the visionary mind behind ChatSphere AI. With a deep commitment to innovation, open-source development, and user-friendly design, he built ChatSphere AI to transform how people interact with intelligent systems."
};
      // --- END NEW ---


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
        const { message, history } = req.body; // <--- MODIFIED: Also extract history for context if needed for future logic

        // Validate incoming message
        if (!message) {
            return res.status(400).json({ error: 'Bad Request - No message content provided.' });
        }

        const lowerCaseMessage = message.toLowerCase();

        // --- NEW LOGIC: Check for creator/owner/developer queries ---
        if (
            lowerCaseMessage.includes("who is your creator") ||
            lowerCaseMessage.includes("who made you") ||
            lowerCaseMessage.includes("who developed you") ||
            lowerCaseMessage.includes("who owns you") ||
            lowerCaseMessage.includes("your owner") ||
            lowerCaseMessage.includes("your developer") ||
            lowerCaseMessage.includes("about your creator")
        ) {
            // If a specific query is detected, return the custom info
            return res.status(200).json({
                reply: `I was created by ${creatorInfo.name}, a ${creatorInfo.role}.`,
                displayInfo: creatorInfo // Send the full creatorInfo object
            });
        }
        // --- END NEW LOGIC ---

        // Prepare the payload for the Groq API
        const groqPayload = {
            model: "llama3-8b-8192",
            // <--- MODIFIED: Include full history for Groq API context ---
            messages: [
                { role: "system", content: "You are a helpful AI assistant." },
                ...(history || []), // Ensure history is an array, handle if not provided
                { role: "user", content: message }
            ],
            // --- END MODIFIED ---
            temperature: 0.7,
            max_tokens: 1024,
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

        const groqData = await groqResponse.json();

        const reply = groqData.choices?.[0]?.message?.content || "No AI response content found.";

        // Send the AI's reply back to the frontend
        res.status(200).json({ reply });

    } catch (error) {
        console.error('Serverless Function Error:', error);
        res.status(500).json({ error: 'Internal Server Error - Failed to process AI request.' });
    }
}
