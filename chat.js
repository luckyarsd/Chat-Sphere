// chat.js
const chat = document.getElementById("chat");
const form = document.getElementById("inputForm");
const input = document.getElementById("userInput");

// --- New Modal Elements References ---
const nameModal = document.getElementById('nameModal');
const modalUserNameInput = document.getElementById('modalUserNameInput');
const startChatModalBtn = document.getElementById('startChatModalBtn');
const aiSuggestedNameSpan = document.getElementById('aiSuggestedName'); // Reference to the span for suggested AI name

// Set suggested AI name
const suggestedAIName = "Aura"; // You can change this to any name you like!
if (aiSuggestedNameSpan) {
    aiSuggestedNameSpan.textContent = suggestedAIName;
}


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

// --- NEW/MODIFIED CODE FOR USER NAME GREETING (using modal) ---
document.addEventListener('DOMContentLoaded', () => {
  let userName = localStorage.getItem('chatSphereUserName'); // Try to get name from local storage

  if (!userName) {
    // If name not found, display the custom modal
    nameModal.classList.add('active'); // Show the modal
    modalUserNameInput.focus(); // Focus on the input field

    // Event listener for the "Start Chat" button in the modal
    startChatModalBtn.addEventListener('click', () => {
      let enteredName = modalUserNameInput.value.trim();
      if (enteredName) {
        userName = enteredName;
        localStorage.setItem('chatSphereUserName', userName);
      } else {
        userName = "Guest"; // Default name if user enters nothing
        localStorage.setItem('chatSphereUserName', userName);
      }
      nameModal.classList.remove('active'); // Hide the modal
      // Now, display the greeting message
      appendMessage(`Hello ${userName}! I'm ${suggestedAIName}, your AI companion. How can I assist you today?`, "bot");
    });

    // Allow pressing Enter key to submit name in modal
    modalUserNameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission if any
            startChatModalBtn.click(); // Simulate button click
        }
    });

  } else {
    // If name is found, directly display the greeting message
    appendMessage(`Hello ${userName}! I'm ${suggestedAIName}, your AI companion. How can I assist you today?`, "bot");
  }
});
// --- END NEW/MODIFIED CODE ---


// Event listener for main chat form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userText = input.value.trim();
  if (!userText) return;

  appendMessage(userText, "user");
  input.value = "";

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Network response was not ok: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.reply) {
      appendMessage(data.reply, "bot");
    } else {
      appendMessage("Error: AI did not provide a valid reply.", "bot");
      console.error("AI response missing 'reply' field:", data);
    }

  } catch (error) {
    appendMessage("Error: Could not get response from AI. Please try again.", "bot");
    console.error("Fetch error:", error);
  }
});
