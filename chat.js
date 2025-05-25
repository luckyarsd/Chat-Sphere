document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const hamburgerButton = document.getElementById('hamburgerButton');
    const overlay = document.getElementById('overlay');
    const navLinks = document.querySelectorAll('.sidebar nav a');
    const aiSuggestedNameSpan = document.getElementById('aiSuggestedName');

    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const welcomeModal = document.getElementById('welcomeModal');
    const closeModalButton = document.getElementById('closeModalButton');

    // --- Theme Toggle Elements ---
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    // Moon icon for light theme (suggests switching to dark)
    const moonIconPath = "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.34 2.42-3.92 2.76-2.5.56-4.92-1.39-5.48-3.89-.56-2.5 1.39-4.92 3.89-5.48 1.34-.3 2.75-.11 4.03.36C16.94 4.14 14.58 3 12 3zm-2.83 2.6c.5-.07 1-.1 1.5-.1 3.87 0 7 3.13 7 7 0 .5-.03 1-.09 1.5-.47-2.12-2.19-3.79-4.38-4.38-2.6-1.12-5.44.89-6.56 3.49-.64 1.46-.86 3.01-.68 4.54-2.13-1.66-3.57-4.27-3.57-7.25 0-3.87 3.13-7 7-7z";
    // Sun icon for dark theme (suggests switching to light)
    const sunIconPath = "M6.07 16.5c2.81 2.81 7.15 3.69 10.45 2.51-.76-2.02-2.18-3.72-4.01-4.87-2.6-1.63-5.91-1.55-8.44.2-.42.28-1.07.72-1.46 1.13.06 1.52.27 2.97 1.46 4.03zm12.39-3.73c.78-1.43 1.13-3.05.99-4.68-.42-1.28-1.07-2.43-1.92-3.41-1.03-1.18-2.31-2.06-3.7-2.58-1.57-.57-3.27-.47-4.83.27-.22.11-.44.23-.66.36-1.01-1.6-2.28-2.85-3.81-3.53C6.58 2.07 3.04 4.54 2.15 8.16c-1.33 5.4 2.44 10.4 7.6 11.66 4.31 1.05 8.9-.76 11.39-4.14-.14-1.24-.55-2.45-1.74-3.55z";

    // --- Theme Management Functions ---
    function setOppositeThemeIcon(currentTheme) {
        if (currentTheme === 'dark') {
            themeIcon.innerHTML = `<path d="M0 0h24v24H0V0z" fill="none"/><path d="${sunIconPath}" />`;
        } else {
            themeIcon.innerHTML = `<path d="M0 0h24v24H0V0z" fill="none"/><path d="${moonIconPath}" />`;
        }
    }

    function applyTheme(theme) {
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(`${theme}-theme`);
        localStorage.setItem('theme', theme);
        setOppositeThemeIcon(theme); // Update icon for the *next* toggle
    }

    function toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    // Initialize theme on load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark'); // Apply dark theme if system preference is dark
    } else {
        applyTheme('light'); // Default to light theme
    }

    // Event listener for theme toggle button
    themeToggle.addEventListener('click', toggleTheme);

    // --- Sidebar / Hamburger Menu JS (existing) ---
    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    hamburgerButton.addEventListener('click', openSidebar);
    overlay.addEventListener('click', closeSidebar);

    navLinks.forEach(link => {
      link.addEventListener('click', (event) => {
        navLinks.forEach(l => l.classList.remove('active'));
        event.currentTarget.classList.add('active');

        if (window.innerWidth <= 768) {
            closeSidebar();
        }
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

    // --- Chat Functionality (UPDATED: Removed Timestamps) ---
    sendMessageButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        appendMessage(messageText, 'user');
        messageInput.value = '';

        // Simulate AI response after a short delay
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('typing-indicator');
        typingIndicator.textContent = 'ChatSphere AI is typing...';
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom

        setTimeout(() => {
            chatMessages.removeChild(typingIndicator); // Remove typing indicator
            const aiResponse = getAiResponse(messageText);
            appendMessage(aiResponse, 'ai');
        }, 1500); // Simulate 1.5 seconds typing
    }

    function appendMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        // Removed timestamp generation and appending here
        messageElement.innerHTML = `<span>${text}</span>`; // Only message text
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the latest message
    }

    function getAiResponse(userMessage) {
        const lowerCaseMessage = userMessage.toLowerCase();
        // Simple keyword-based responses
        if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi')) {
            return "Hello! How can I assist you on your spiritual journey today?";
        } else if (lowerCaseMessage.includes('meditation')) {
            return "Meditation is a wonderful practice for inner peace. Would you like some tips to get started, or perhaps a guided meditation?";
        } else if (lowerCaseMessage.includes('mindfulness')) {
            return "Mindfulness is about being present. How do you practice mindfulness in your daily life, or would you like to explore techniques?";
        } else if (lowerCaseMessage.includes('meaning of life')) {
            return "The meaning of life is a profound question explored by many spiritual traditions. What are your thoughts on it?";
        } else if (lowerCaseMessage.includes('thank you') || lowerCaseMessage.includes('thanks')) {
            return "You're most welcome! I'm here to help.";
        } else if (lowerCaseMessage.includes('spiritual guidance')) {
            return "I can offer insights and different perspectives on spiritual topics. What specific guidance are you seeking?";
        } else if (lowerCaseMessage.includes('divine')) {
            return "The concept of the Divine is vast and deeply personal. What aspects of the Divine are you contemplating?";
        } else {
            return "That's an interesting thought! Could you tell me more, or perhaps ask another question related to spirituality?";
        }
    }

    // --- Modal Functionality (existing) ---
    // Show modal on page load
    welcomeModal.style.display = 'flex';

    // Close modal button
    closeModalButton.addEventListener('click', () => {
        welcomeModal.style.display = 'none';
    });

    // Close modal if clicked outside
    window.addEventListener('click', (event) => {
        if (event.target === welcomeModal) {
            welcomeModal.style.display = 'none';
        }
    });

}); // End DOMContentLoaded
