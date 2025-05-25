// chat.js
const chat = document.getElementById("chat");
const form = document.getElementById("inputForm");
const input = document.getElementById("userInput");

/**
 * Appends a new message to the chat display.
 * @param {string} text - The message content.
 * @param {string} className - Class for styling (e.g., 'user' or 'bot').
 */
function appendMessage(text, className) {
  const div = document.createElement("div");
  div.textContent = text;
  div.className = "message " + className;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight; // Auto-scroll to the bottom
}

// --- NEW CODE FOR USER NAME GREETING ---
document.addEventListener('DOMContentLoaded', () => {
  let userName = localStorage.getItem('chatSphereUserName'); // Try to get name from local storage

  if (!userName) {
    // If name not found, prompt the user
    userName = prompt("Welcome to ChatSphere! What should I call you?");
    if (userName) {
      userName = userName.trim(); // Trim whitespace
      localStorage.setItem('chatSphereUserName', userName); // Store the name
    } else {
      userName = "Guest"; // Default name if user cancels or enters nothing
      localStorage.setItem('chatSphereUserName', userName);
    }
  }

  // Display the greeting message as the first bot message
  appendMessage(`Hello ${userName}! How can I assist you today?`, "bot");
});
// --- END NEW CODE ---


// Event listener for form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // Prevent default form submission behavior

  const userText = input.value.trim();
  if (!userText) return; // Don't send empty messages

  appendMessage(userText, "user"); // Display user's message
  input.value = ""; // Clear the input field

  try {
    // Calling the Vercel serverless function at /api/ask
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText }),
    });

    if (!response.ok) {
      // If the response status is not 2xx, throw an error
      const errorText = await response.text(); // Get raw text for better debugging
      throw new Error(`Network response was not ok: ${response.status} - ${errorText}`);
    }

    const data = await response.json(); // Parse the JSON response

    if (data.reply) {
      appendMessage(data.reply, "bot"); // Display AI's reply
    } else {
      appendMessage("Error: AI did not provide a valid reply.", "bot");
      console.error("AI response missing 'reply' field:", data);
    }

  } catch (error) {
    appendMessage("Error: Could not get response from AI. Please try again.", "bot");
    console.error("Fetch error:", error);
  }
});
