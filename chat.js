// chat.js
const chat = document.getElementById("chat");
const form = document.getElementById("inputForm");
const input = document.getElementById("userInput");

function appendMessage(text, className) {
  const div = document.createElement("div");
  div.textContent = text;
  div.className = "message " + className;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight; // Auto-scroll to the bottom
}

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
