document.addEventListener('DOMContentLoaded', () => {
    // REMOVED: const sidebar = document.getElementById('sidebar');
    // REMOVED: const hamburgerButton = document.getElementById('hamburgerButton');
    // REMOVED: const overlay = document.getElementById('overlay');
    const navLinks = document.querySelectorAll('.sidebar nav a'); // Keep for sidebar nav highlighting
    const aiSuggestedNameSpan = document.getElementById('aiSuggestedName');

    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const welcomeModal = document.getElementById('welcomeModal');
    const closeModalButton = document.getElementById('closeModalButton');

    // --- API PROXY CONFIGURATION ---
    const PROXY_API_ENDPOINT = '/api/ask';

    const chatHistory = [];

    let currentTypingIndicator = null;

    // --- Theme Toggle Elements (REMOVED: since toggle button is gone) ---
    // The theme will still function based on localStorage or system preference,
    // but the user won't have a direct button in the header.
    // REMOVED: const themeToggle = document.getElementById('themeToggle');
    // REMOVED: const themeIcon = document.getElementById('themeIcon');
    // REMOVED: const moonIconPath = "...";
    // REMOVED: const sunIconPath = "...";

    // --- Theme Management Functions (Simplified) ---
    // The functions themselves are still useful for applying theme,
    // but the toggle logic needs to be adjusted since there's no button.
    function applyTheme(theme) {
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(`${theme}-theme`);
        localStorage.setItem('theme', theme);
        // REMOVED: setOppositeThemeIcon(theme); // No icon to update
    }

    // REMOVED: function toggleTheme() {...} // No toggle button

    // Initialize theme on load (still relevant for consistent theme)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark'); // Apply dark theme if system preference is dark
    } else {
        applyTheme('light'); // Default to light theme
    }

    // REMOVED: Event listener for theme toggle button

    // --- Sidebar / Hamburger Menu JS (Removed button interaction) ---
    // The sidebar itself still exists, but won't be toggled by a header button.
    // If you need the sidebar to be accessible on mobile, you'd need another trigger.
    // For now, it will remain visible on desktop and hidden on mobile as per CSS.
    // REMOVED: function openSidebar() {...}
    // REMOVED: function closeSidebar() {...}
    // REMOVED: hamburgerButton.addEventListener('click', openSidebar);
    // REMOVED: overlay.addEventListener('click', closeSidebar);

    // Keep nav link active highlighting if the sidebar is intended to be always visible on desktop
    // or if accessed by other means on mobile.
    navLinks.forEach(link => {
      link.addEventListener('click', (event) => {
        navLinks.forEach(l => l.classList.remove('active'));
        event.currentTarget.classList.add('active');

        // REMOVED: Mobile sidebar close logic
        // if (window.innerWidth <= 768) {
        //     closeSidebar();
        // }
      });
    });

    // --- Active Link Highlight (existing) ---
    const currentPath = window.location.pathname.split('/').pop();
    if (aiSuggestedNameSpan) {
        aiSuggestedNameSpan.textContent = "Aura";
    }

    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref.endsWith(currentPath) || (currentPath === '' && linkHref === 'chat.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // --- Chat Functionality (Groq API via Vercel Function) ---
    sendMessageButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    async function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        sendMessageButton.classList.add('send-button-bounce');
        sendMessageButton.addEventListener('animationend', () => {
            sendMessageButton.classList.remove('send-button-bounce');
        }, { once: true });

        appendMessage(messageText, 'user');
        chatHistory.push({ role: "user", content: messageText });
        messageInput.value = '';

        if (currentTypingIndicator && chatMessages.contains(currentTypingIndicator)) {
            chatMessages.removeChild(currentTypingIndicator);
            currentTypingIndicator = null;
        }

        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('typing-indicator');
        typingIndicator.innerHTML = 'ChatSphere AI is typing<span>.</span><span>.</span><span>.</span>';
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        currentTypingIndicator = typingIndicator;

        try {
            const response = await fetch(PROXY_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ message: messageText })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Backend error:', response.status, errorData);
                if (currentTypingIndicator && chatMessages.contains(currentTypingIndicator)) {
                    chatMessages.removeChild(currentTypingIndicator);
                    currentTypingIndicator = null;
                }
                appendMessage(`Oops! Backend error: ${errorData.error || 'Failed to get response'}. Please check your Groq API key or Vercel function logs.`, 'ai');
                return;
            }

            const data = await response.json();
            const aiResponse = data.reply || "No AI response content found.";

            if (currentTypingIndicator && chatMessages.contains(currentTypingIndicator)) {
                chatMessages.removeChild(currentTypingIndicator);
                currentTypingIndicator = null;
            }
            appendMessage(aiResponse, 'ai');
            chatHistory.push({ role: "assistant", content: aiResponse });

        } catch (error) {
            console.error('Error fetching AI response from Vercel function:', error);
            if (currentTypingIndicator && chatMessages.contains(currentTypingIndicator)) {
                chatMessages.removeChild(currentTypingIndicator);
                currentTypingIndicator = null;
            }
            appendMessage("Oops! I couldn't get a response from the AI. Please check your Vercel function (`api/ask.js`) setup or try again later.", 'ai');
        }
    }

    function appendMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.innerHTML = `<span>${text}</span>`;
        chatMessages.appendChild(messageElement);

        messageElement.classList.add('message-pop-in');
        messageElement.addEventListener('animationend', () => {
            messageElement.classList.remove('message-pop-in');
        }, { once: true });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- Modal Functionality (existing) ---
    welcomeModal.style.display = 'flex';

    closeModalButton.addEventListener('click', () => {
        welcomeModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === welcomeModal) {
            welcomeModal.style.display = 'none';
        }
    });

});
