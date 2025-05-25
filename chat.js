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

    // --- New Chat/Recent Chats Elements ---
    const newChatButton = document.getElementById('newChatButton');
    const currentChatNavLink = document.getElementById('currentChatNavLink');
    const recentChatsList = document.getElementById('recentChatsList');

    // --- API PROXY CONFIGURATION ---
    const PROXY_API_ENDPOINT = '/api/ask';

    // --- Chat History Configuration ---
    const CHAT_STORAGE_PREFIX = 'chatSphereChat_'; // Prefix for individual chat keys
    const CHAT_LIST_KEY = 'chatSphereChatList'; // Key for the list of chat IDs

    let currentChatId = null; // Stores the ID of the currently active chat
    let chatHistory = []; // Stores messages of the current chat
    let currentTypingIndicator = null; // Variable to hold the reference to the currently displayed typing indicator

    // --- Theme Toggle Elements ---
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const moonIconPath = "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.34 2.42-3.92 2.76-2.5.56-4.92-1.39-5.48-3.89-.56-2.5 1.39-4.92 3.89-5.48 1.34-.3 2.75-.11 4.03.36C16.94 4.14 14.58 3 12 3zm-2.83 2.6c.5-.07 1-.1 1.5-.1 3.87 0 7 3.13 7 7 0 .5-.03 1-.09 1.5-.47-2.12-2.19-3.79-4.38-4.38-2.6-1.12-5.44.89-6.56 3.49-.64 1.46-.86 3.01-.68 4.54-2.13-1.66-3.57-4.27-3.57-7.25 0-3.87 3.13-7 7-7z";
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
        setOppositeThemeIcon(theme);
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
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
    themeToggle.addEventListener('click', toggleTheme);

    // --- Sidebar / Hamburger Menu JS ---
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
            // Only remove 'active' from other nav links if not a chat-related link
            if (event.currentTarget.id !== 'newChatButton' && event.currentTarget.id !== 'currentChatNavLink' && !event.currentTarget.closest('.recent-chats-list')) {
                navLinks.forEach(l => l.classList.remove('active'));
                event.currentTarget.classList.add('active');
            }

            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });

    if (aiSuggestedNameSpan) {
        aiSuggestedNameSpan.textContent = "Aura";
    }

    // --- Chat History Management Functions ---

    /**
     * Gets the list of chat IDs and their titles from localStorage.
     * @returns {Array<Object>} An array of chat objects { id: string, title: string }.
     */
    function getChatList() {
        try {
            const list = JSON.parse(localStorage.getItem(CHAT_LIST_KEY));
            return Array.isArray(list) ? list : [];
        } catch (e) {
            console.error("Error parsing chat list from localStorage:", e);
            localStorage.removeItem(CHAT_LIST_KEY); // Clear corrupt data
            return [];
        }
    }

    /**
     * Saves the list of chat IDs and titles to localStorage.
     * @param {Array<Object>} list - The array of chat objects to save.
     */
    function saveChatList(list) {
        localStorage.setItem(CHAT_LIST_KEY, JSON.stringify(list));
    }

    /**
     * Loads a specific chat history by ID.
     * @param {string} chatId - The ID of the chat to load.
     * @returns {Array<Object>} The chat history messages.
     */
    function loadChatHistory(chatId) {
        if (!chatId) return [];
        try {
            const storedHistory = localStorage.getItem(CHAT_STORAGE_PREFIX + chatId);
            const parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];
            return Array.isArray(parsedHistory) ? parsedHistory : [];
        } catch (e) {
            console.error(`Error parsing chat history for ID ${chatId}:`, e);
            localStorage.removeItem(CHAT_STORAGE_PREFIX + chatId); // Clear corrupt data
            return [];
        }
    }

    /**
     * Saves the current chat history to localStorage using the currentChatId.
     */
    function saveCurrentChatHistory() {
        if (currentChatId && chatHistory.length > 0) {
            localStorage.setItem(CHAT_STORAGE_PREFIX + currentChatId, JSON.stringify(chatHistory));
            updateRecentChatsUI(); // Update UI whenever history is saved
        }
    }

    /**
     * Generates a simple title for a chat based on its first user message.
     * @param {Array<Object>} history - The chat history.
     * @returns {string} A truncated title.
     */
    function generateChatTitle(history) {
        const firstUserMessage = history.find(msg => msg.role === 'user');
        return firstUserMessage ? firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '') : 'New Chat';
    }

    /**
     * Appends a message to the chat display.
     * @param {string} text - The message content.
     * @param {string} sender - 'user' or 'ai'.
     */
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

    /**
     * Clears the chat display.
     */
    function clearChatDisplay() {
        chatMessages.innerHTML = '';
    }

    /**
     * Starts a new chat session.
     */
    function startNewChat() {
        // Save the current chat before starting a new one, but only if it's not truly empty.
        // A chat is considered "not truly empty" if it has more than just the initial AI welcome.
        if (currentChatId && chatHistory.length > 1) { // If there's more than just the initial AI message
            saveCurrentChatHistory();
        } else if (currentChatId && chatHistory.length === 1 && chatHistory[0].role === 'ai') {
            // If it's a "New Chat" with only the AI welcome, and user clicks "New Chat" again,
            // we should not save this empty chat to the recent list.
            // Instead, we just replace it with a fresh "New Chat".
            const chatList = getChatList();
            const index = chatList.findIndex(chat => chat.id === currentChatId);
            if (index !== -1) {
                // If it's the current chat and it's truly empty, remove it from the list
                chatList.splice(index, 1);
                saveChatList(chatList);
            }
        }

        currentChatId = Date.now().toString(); // Generate a new unique ID for the new chat
        chatHistory = []; // Reset history for the new chat
        clearChatDisplay();

        const initialAIMessage = { role: "ai", content: "Hi there! I'm ChatSphere AI, your general purpose assistant. How can I help you today?" };
        appendMessage(initialAIMessage.content, initialAIMessage.role);
        chatHistory.push(initialAIMessage);

        const chatList = getChatList();
        chatList.unshift({ id: currentChatId, title: 'New Chat' }); // Add to the beginning of the list
        saveChatList(chatList);
        updateRecentChatsUI();
        highlightCurrentChatInSidebar();

        currentChatNavLink.textContent = 'Current Chat'; // Reset "Current Chat" link text
        messageInput.value = ''; // Clear input field
        messageInput.focus();
    }

    /**
     * Switches to an existing chat session.
     * @param {string} chatId - The ID of the chat to switch to.
     * @param {string} chatTitle - The title of the chat.
     */
    function switchChat(chatId, chatTitle) {
        if (currentChatId === chatId) {
            if (window.innerWidth <= 768) closeSidebar();
            return; // Already on this chat, just close sidebar if mobile
        }

        // Save the current chat's history before switching
        if (currentChatId && chatHistory.length > 1) { // Only save if the current chat has user messages
            saveCurrentChatHistory();
        } else if (currentChatId && chatHistory.length === 1 && chatHistory[0].role === 'ai') {
            // If we are switching away from a "New Chat" that never got a user message,
            // remove it from the recent chats list to avoid clutter.
            const chatList = getChatList();
            const index = chatList.findIndex(chat => chat.id === currentChatId);
            if (index !== -1) {
                chatList.splice(index, 1);
                saveChatList(chatList);
            }
        }


        currentChatId = chatId;
        chatHistory = loadChatHistory(chatId);
        clearChatDisplay();

        // Render loaded history
        chatHistory.forEach(msg => {
            appendMessage(msg.content, msg.role);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Update current chat link text and highlight recent chat link
        currentChatNavLink.textContent = chatTitle;
        highlightCurrentChatInSidebar();

        if (window.innerWidth <= 768) {
            closeSidebar();
        }
        messageInput.focus();
    }

    /**
     * Highlights the current chat in the sidebar.
     */
    function highlightCurrentChatInSidebar() {
        // Remove 'active' from all nav links first
        document.querySelectorAll('.sidebar nav a').forEach(link => {
            link.classList.remove('active');
        });
        // Remove 'active-chat' from all recent chat links
        document.querySelectorAll('.recent-chats-list a').forEach(link => {
            link.classList.remove('active-chat');
        });

        // Highlight the "Current Chat" link if it matches the current active chat
        if (currentChatId) {
             const currentChatEntry = getChatList().find(chat => chat.id === currentChatId);
             if (currentChatEntry && currentChatEntry.title !== 'New Chat') {
                 // Only highlight 'Current Chat' main link if it refers to a named, existing chat
                 currentChatNavLink.classList.add('active');
             } else {
                 // If it's still 'New Chat', don't highlight the generic "Current Chat"
                 // as "New Chat" button will be active instead.
             }
        }


        // Find and highlight the specific recent chat link if it exists
        const activeRecentChatLink = document.querySelector(`.recent-chats-list a[data-chat-id="${currentChatId}"]`);
        if (activeRecentChatLink) {
            activeRecentChatLink.classList.add('active-chat');
        } else {
             // If no specific recent chat link is highlighted (e.g., brand new chat),
             // highlight the "New Chat" button.
             newChatButton.classList.add('active-chat'); // Using active-chat for consistency
        }
    }

    /**
     * Populates and updates the "Recent Chats" list in the sidebar.
     */
    function updateRecentChatsUI() {
        recentChatsList.innerHTML = ''; // Clear existing list
        let chatList = getChatList();

        // Filter out "New Chat" entries that are truly empty (only initial AI message)
        chatList = chatList.filter(chat => {
            const history = loadChatHistory(chat.id);
            // A chat is considered "empty" if it only contains the initial AI message or is empty
            return history.length > 1 || (history.length === 1 && history[0].role !== 'ai');
        });

        // Ensure the current chat (if it exists and has content) is at the top
        if (currentChatId && chatHistory.length > 1) {
            const currentChatEntry = chatList.find(chat => chat.id === currentChatId);
            if (currentChatEntry) {
                // Remove it from its current position
                chatList = chatList.filter(chat => chat.id !== currentChatId);
                // Add it to the front
                chatList.unshift(currentChatEntry);
            }
        }

        saveChatList(chatList); // Save the cleaned and reordered list

        chatList.forEach(chat => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = "#"; // Prevent page reload
            a.textContent = chat.title;
            a.dataset.chatId = chat.id; // Store chat ID
            a.classList.add('recent-chat-link');

            a.addEventListener('click', (event) => {
                event.preventDefault();
                switchChat(chat.id, chat.title);
            });
            li.appendChild(a);
            recentChatsList.appendChild(li);
        });

        highlightCurrentChatInSidebar(); // Ensure the active chat is highlighted after update
    }

    // Initialize/load the latest chat on page load
    function initializeChat() {
        const chatList = getChatList();
        if (chatList.length > 0) {
            // Load the most recent chat if available and not empty
            const mostRecentChat = chatList[0];
            const history = loadChatHistory(mostRecentChat.id);

            // If the most recent chat is just an empty 'New Chat', discard it and start fresh
            if (history.length === 1 && history[0].role === 'ai') {
                chatList.shift(); // Remove it from the list
                saveChatList(chatList);
                startNewChat(); // Start a truly new one
            } else {
                currentChatId = mostRecentChat.id;
                chatHistory = history;
                chatHistory.forEach(msg => {
                    appendMessage(msg.content, msg.role);
                });
                currentChatNavLink.textContent = mostRecentChat.title;
            }
        } else {
            // Start a new chat if no history exists at all
            startNewChat();
        }
        updateRecentChatsUI();
        highlightCurrentChatInSidebar();
    }

    // Call initializeChat when the DOM is ready
    initializeChat();

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

        // If it's a "New Chat" and this is the first user message, generate its title
        const isFirstUserMessageInNewChat = chatHistory.length === 1 && chatHistory[0].role === 'ai';

        appendMessage(messageText, 'user');
        chatHistory.push({ role: "user", content: messageText });

        if (isFirstUserMessageInNewChat) {
            let chatList = getChatList();
            let currentChatEntry = chatList.find(chat => chat.id === currentChatId);

            if (currentChatEntry) {
                currentChatEntry.title = generateChatTitle(chatHistory);
                currentChatNavLink.textContent = currentChatEntry.title; // Update the main link

                // Move the current chat to the top of the list if it's not already
                chatList = chatList.filter(chat => chat.id !== currentChatId); // Remove old entry
                chatList.unshift(currentChatEntry); // Add updated entry to the front
                saveChatList(chatList);
                updateRecentChatsUI(); // Re-render recent chats with the new title
            }
        } else {
            saveCurrentChatHistory(); // Save after every subsequent user message
        }

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
                body: JSON.stringify({ message: messageText, history: chatHistory }) // Send full history for context
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Backend error:', response.status, errorData);
                if (currentTypingIndicator && chatMessages.contains(currentTypingIndicator)) {
                    chatMessages.removeChild(currentTypingIndicator);
                    currentTypingIndicator = null;
                }
                const errorMessage = `Oops! Backend error: ${errorData.error || 'Failed to get response'}. Please check your Groq API key or Vercel function logs.`;
                appendMessage(errorMessage, 'ai');
                chatHistory.push({ role: "ai", content: errorMessage });
                saveCurrentChatHistory();
                return;
            }

            const data = await response.json();
            const aiResponse = data.reply || "No AI response content found.";

            if (currentTypingIndicator && chatMessages.contains(currentTypingIndicator)) {
                chatMessages.removeChild(currentTypingIndicator);
                currentTypingIndicator = null;
            }
            appendMessage(aiResponse, 'ai');
            chatHistory.push({ role: "ai", content: aiResponse });
            saveCurrentChatHistory();

        } catch (error) {
            console.error('Error fetching AI response from Vercel function:', error);
            if (currentTypingIndicator && chatMessages.contains(currentTypingIndicator)) {
                chatMessages.removeChild(currentTypingIndicator);
                currentTypingIndicator = null;
            }
            const errorMessage = "Oops! I couldn't get a response from the AI. Please check your Vercel function (`api/ask.js`) setup or try again later.";
            appendMessage(errorMessage, 'ai');
            chatHistory.push({ role: "ai", content: errorMessage });
            saveCurrentChatHistory();
        }
    }

    // --- Modal Functionality ---
    // Show modal on page load only if there are no saved chats at all
    if (getChatList().length === 0) {
        welcomeModal.style.display = 'flex';
    } else {
        welcomeModal.style.display = 'none';
    }

    closeModalButton.addEventListener('click', () => {
        welcomeModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === welcomeModal) {
            welcomeModal.style.display = 'none';
        }
    });

    // Event listener for the "New Chat" button
    newChatButton.addEventListener('click', (event) => {
        event.preventDefault();
        startNewChat();
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    });

    // Event listener for "Current Chat" link
    currentChatNavLink.addEventListener('click', (event) => {
        event.preventDefault();
        // If there's an active chat, simply re-display it and close the sidebar if mobile
        if (currentChatId) {
            const chatList = getChatList();
            const currentChatData = chatList.find(chat => chat.id === currentChatId);
            if (currentChatData) {
                 // No need to reload history or clear display if it's the same chat
                 // Just ensure UI is correct and close sidebar if mobile
                highlightCurrentChatInSidebar(); // Ensure highlighting is correct
                if (window.innerWidth <= 768) {
                    closeSidebar();
                }
            } else {
                // Fallback: if currentChatId is set but not in list, start new
                startNewChat();
            }
        } else {
            // If no current chat ID, start a new one (should be handled by initializeChat usually)
            startNewChat();
        }
    });

}); // End DOMContentLoaded
