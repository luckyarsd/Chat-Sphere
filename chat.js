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
    let currentTypingIndicatorElement = null; // Variable to hold the reference to the currently displayed typing indicator

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

    // --- Utility Functions for Chat Display ---

    /**
     * Scrolls the chat messages container to the bottom.
     */
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Formats plain text with markdown for display in HTML.
     * Converts **bold** or *bold* to <strong>bold</strong> and newlines \n to <br>.
     * @param {string} text - The raw text content.
     * @returns {string} The HTML formatted string.
     */
    function formatMessageText(text) {
    let formattedText = text;

    // 1. Add newlines before *, **, or number.
    // This is more complex because we want to ensure we don't double-break
    // if there's already a newline, and we want to preserve the markdown itself.

    // Add a <br> before single asterisks not at the start of the string or preceded by a space/newline.
    formattedText = formattedText.replace(/(?<!^)(?<![\s\n])\*/g, '<br>*');

    // Add a <br> before double asterisks not at the start of the string or preceded by a space/newline.
    formattedText = formattedText.replace(/(?<!^)(?<![\s\n])\*\*/g, '<br>**');

    // Add a <br> before a number followed by a period and space (for lists),
    // if it's not at the start of the string or already preceded by a newline.
    formattedText = formattedText.replace(/(?<!^)(?<![\n])(\d+\.\s)/g, '<br>$1');

    // Remove any accidental double <br><br> created by the above rules
    formattedText = formattedText.replace(/<br><br>/g, '<br>');

    // 2. Convert bold (both **text** and *text*) - keep this after adding newlines
    // to ensure bolding still works after <br> insertions.
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<strong>$1</strong>');


    // 3. Convert explicit newlines \n to <br> tags (important for existing newlines)
    formattedText = formattedText.replace(/\n/g, '<br>');


    return formattedText;
}
     /* Appends a message to the chat display.
     * @param {string} text - The message content.
     * @param {string} sender - 'user' or 'ai'.
     * @param {Object} [infoData=null] - Optional: Data object for creator info (for AI messages).
     */
    function appendMessage(text, sender, infoData = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);

        let contentHTML = formatMessageText(text); // Format text first

        if (sender === 'ai' && infoData) {
            // If it's an AI message AND infoData is provided, add the special layout
            // This wraps the contentHTML (which already contains formatted text)
            contentHTML = `
                <div class="ai-response-content">
                    ${contentHTML}
                    <div class="creator-info-card">
                        <img src="${infoData.image}" alt="${infoData.name}" class="creator-logo">
                        <div class="creator-details">
                            <h4>${infoData.name}</h4>
                            <p>${infoData.role}</p>
                            <p class="creator-bio">${infoData.bio}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        messageElement.innerHTML = contentHTML; // Use innerHTML to render formatted text
        chatMessages.appendChild(messageElement);

        messageElement.classList.add('message-pop-in');
        messageElement.addEventListener('animationend', () => {
            messageElement.classList.remove('message-pop-in');
        }, { once: true });

        scrollToBottom(); // Scroll after appending message
    }

    /**
     * Displays a typing indicator.
     */
    function showTypingIndicator() {
        if (currentTypingIndicatorElement) {
            removeTypingIndicator(); // Ensure only one indicator is present
        }
        currentTypingIndicatorElement = document.createElement('div');
        currentTypingIndicatorElement.classList.add('typing-indicator');
        currentTypingIndicatorElement.innerHTML = 'ChatSphere AI is typing<span>.</span><span>.</span><span>.</span>';
        chatMessages.appendChild(currentTypingIndicatorElement);
        scrollToBottom();
    }

    /**
     * Removes the typing indicator.
     */
    function removeTypingIndicator() {
        if (currentTypingIndicatorElement && chatMessages.contains(currentTypingIndicatorElement)) {
            chatMessages.removeChild(currentTypingIndicatorElement);
            currentTypingIndicatorElement = null;
        }
    }

    /**
     * Clears the chat display.
     */
    function clearChatDisplay() {
        chatMessages.innerHTML = '';
        console.log("Chat display cleared."); // DEBUG
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
        console.log("Saving chat list:", list); // DEBUG
        localStorage.setItem(CHAT_LIST_KEY, JSON.stringify(list));
    }

    /**
     * Loads a specific chat history by ID.
     * @param {string} chatId - The ID of the chat to load.
     * @returns {Array<Object>} The chat history messages.
     */
    function loadChatHistory(chatId) {
        if (!chatId) {
            console.warn("Attempted to load chat history with null chatId.");
            return [];
        }
        try {
            const storedHistory = localStorage.getItem(CHAT_STORAGE_PREFIX + chatId);
            const parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];
            console.log(`Loaded history for ${chatId}:`, parsedHistory); // DEBUG
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
        if (currentChatId) { // Always save if there's a currentChatId, even if chatHistory is empty (for cleanup)
            localStorage.setItem(CHAT_STORAGE_PREFIX + currentChatId, JSON.stringify(chatHistory));
            console.log(`Saved history for current chat ${currentChatId}:`, chatHistory); // DEBUG
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
        const title = firstUserMessage ? firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '') : 'New Chat';
        console.log("Generated chat title:", title); // DEBUG
        return title;
    }

    /**
     * Starts a new chat session.
     */
    function startNewChat() {
        console.log("Starting new chat..."); // DEBUG

        // 1. Before creating a new chat, potentially save or clean up the OLD current chat.
        if (currentChatId) {
            // Get the history of the chat we are moving *from*
            const oldChatHistory = loadChatHistory(currentChatId);

            // If the old chat only has the initial AI message (i.e., no user interaction),
            // remove it from the chat list to keep it clean.
            if (oldChatHistory.length === 1 && oldChatHistory[0].role === 'ai') {
                let chatList = getChatList();
                chatList = chatList.filter(chat => chat.id !== currentChatId);
                saveChatList(chatList);
                // Also remove its specific history from local storage
                localStorage.removeItem(CHAT_STORAGE_PREFIX + currentChatId);
                console.log(`Cleaned up empty chat ${currentChatId}`); // DEBUG
            } else if (oldChatHistory.length > 1) {
                // If the old chat has user messages, make sure it's saved.
                saveCurrentChatHistory(); // Saves the current chatHistory (which still belongs to the old chat)
            }
        }

        // 2. Initialize the NEW chat
        currentChatId = Date.now().toString(); // Generate a new unique ID
        chatHistory = []; // Reset history for the new chat
        clearChatDisplay();

        const initialAIMessage = { role: "ai", content: "Hi there! I'm ChatSphere AI, your general purpose assistant. How can I help you today?" };
        appendMessage(initialAIMessage.content, initialAIMessage.role); // No infoData for initial message
        chatHistory.push(initialAIMessage);
        saveCurrentChatHistory(); // Save initial AI message to its specific chat ID

        // 3. Add new chat to the chat list (initially with "New Chat" title)
        let chatList = getChatList();
        chatList.unshift({ id: currentChatId, title: 'New Chat' });
        saveChatList(chatList);

        // 4. Update UI
        currentChatNavLink.textContent = 'Current Chat'; // Reset "Current Chat" link text
        messageInput.value = ''; // Clear input field
        messageInput.focus();
        updateRecentChatsUI();
        highlightCurrentChatInSidebar();
        console.log(`New chat started with ID: ${currentChatId}`); // DEBUG
    }

    /**
     * Switches to an existing chat session.
     * @param {string} chatId - The ID of the chat to switch to.
     * @param {string} chatTitle - The title of the chat.
     */
    function switchChat(chatId, chatTitle) {
        console.log(`Switching to chat: ${chatId} - "${chatTitle}"`); // DEBUG

        if (currentChatId === chatId) {
            console.log("Already on this chat."); // DEBUG
            if (window.innerWidth <= 768) closeSidebar();
            return;
        }

        // Save the current chat's history before switching away from it
        if (currentChatId) {
            const oldChatHistory = loadChatHistory(currentChatId);
            // If the old chat only has the initial AI message (i.e., no user interaction), remove it.
            if (oldChatHistory.length === 1 && oldChatHistory[0].role === 'ai') {
                let chatList = getChatList();
                chatList = chatList.filter(chat => chat.id !== currentChatId);
                saveChatList(chatList);
                localStorage.removeItem(CHAT_STORAGE_PREFIX + currentChatId);
                console.log(`Cleaned up empty chat ${currentChatId} before switching.`); // DEBUG
            } else {
                saveCurrentChatHistory(); // This saves the chatHistory that *was* active.
            }
        }

        // Load the new chat
        currentChatId = chatId;
        chatHistory = loadChatHistory(chatId);
        clearChatDisplay();

        // Render loaded history
        chatHistory.forEach(msg => {
            // Note: If you want creator info to reappear when loading history,
            // your saved history messages need to store this info.
            // For now, we assume history only stores 'content' and 'role'.
            // The backend will resend 'displayInfo' if the user asks again.
            appendMessage(msg.content, msg.role);
        });
        scrollToBottom(); // Scroll after loading history

        // Update current chat link text and highlight recent chat link
        currentChatNavLink.textContent = chatTitle;
        highlightCurrentChatInSidebar(); // This will re-highlight based on new currentChatId

        if (window.innerWidth <= 768) {
            closeSidebar();
        }
        messageInput.focus();
    }

    /**
     * Highlights the current chat in the sidebar.
     */
    function highlightCurrentChatInSidebar() {
        console.log("Highlighting sidebar for current chat:", currentChatId); // DEBUG
        // Remove 'active' from all generic nav links
        document.querySelectorAll('.sidebar nav a').forEach(link => {
            link.classList.remove('active');
        });
        // Remove 'active-chat' from all recent chat links and the new chat button
        document.querySelectorAll('.recent-chats-list a').forEach(link => {
            link.classList.remove('active-chat');
        });
        newChatButton.classList.remove('active-chat'); // Remove from new chat button

        // Highlight the "Current Chat" generic link if it refers to a non-"New Chat"
        const currentChatEntry = getChatList().find(chat => chat.id === currentChatId);
        if (currentChatEntry && currentChatEntry.title !== 'New Chat') {
            currentChatNavLink.classList.add('active');
        }

        // Highlight the specific recent chat link or the "New Chat" button
        const activeRecentChatLink = document.querySelector(`.recent-chats-list a[data-chat-id="${currentChatId}"]`);
        if (activeRecentChatLink) {
            activeRecentChatLink.classList.add('active-chat');
        } else {
            // If current chat is a "New Chat" (or not yet in recent list), highlight "New Chat" button
            newChatButton.classList.add('active-chat');
        }
    }

    /**
     * Populates and updates the "Recent Chats" list in the sidebar.
     */
    function updateRecentChatsUI() {
        console.log("Updating Recent Chats UI..."); // DEBUG
        recentChatsList.innerHTML = ''; // Clear existing list
        let chatList = getChatList();

        // Filter out "New Chat" entries that are truly empty (only initial AI message)
        chatList = chatList.filter(chat => {
            const history = loadChatHistory(chat.id);
            // Keep chat if it has more than just the initial AI message or if it's the current active chat
            return (history.length > 1) || (history.length === 1 && history[0].role === 'ai' && chat.id === currentChatId);
        });

        // Ensure the current chat (if it exists and has content) is at the top
        if (currentChatId) {
            const currentChatEntryIndex = chatList.findIndex(chat => chat.id === currentChatId);
            if (currentChatEntryIndex !== -1) {
                const currentChatEntry = chatList.splice(currentChatEntryIndex, 1)[0]; // Remove and get
                chatList.unshift(currentChatEntry); // Add to the front
            }
        }

        saveChatList(chatList); // Save the cleaned and reordered list

        chatList.forEach(chat => {
            // Do not add the currently active "New Chat" (without user messages) to the recent list
            // It will be highlighted by the "New Chat" button
            if (chat.id === currentChatId && chat.title === 'New Chat' && chatHistory.length === 1 && chatHistory[0].role === 'ai') {
                console.log("Skipping empty 'New Chat' from recent list rendering:", chat.id); // DEBUG
                return;
            }

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

            // Add delete button for recent chats
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-chat-button');
            deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg>`; // Trash can SVG icon
            deleteButton.title = `Delete "${chat.title}"`;
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                deleteChat(chat.id, chat.title);
            });

            li.appendChild(a);
            li.appendChild(deleteButton);
            recentChatsList.appendChild(li);
        });

        highlightCurrentChatInSidebar(); // Ensure the active chat is highlighted after update
        console.log("Recent Chats UI updated."); // DEBUG
    }

    /**
     * Deletes a chat from localStorage and updates the UI.
     * @param {string} chatIdToDelete - The ID of the chat to delete.
     * @param {string} chatTitleToDelete - The title of the chat to delete (for confirmation).
     */
    function deleteChat(chatIdToDelete, chatTitleToDelete) {
        if (confirm(`Are you sure you want to delete the chat "${chatTitleToDelete}"?`)) {
            // Remove from chat list
            let chatList = getChatList();
            chatList = chatList.filter(chat => chat.id !== chatIdToDelete);
            saveChatList(chatList);

            // Remove its history from localStorage
            localStorage.removeItem(CHAT_STORAGE_PREFIX + chatIdToDelete);
            console.log(`Chat ${chatIdToDelete} deleted.`); // DEBUG

            // If the deleted chat was the current active chat, start a new one
            if (currentChatId === chatIdToDelete) {
                console.log("Deleted current chat, starting new one."); // DEBUG
                startNewChat();
            } else {
                updateRecentChatsUI(); // Just refresh the list if a non-current chat was deleted
            }
        }
    }


    // Initialize/load the latest chat on page load
    function initializeChat() {
        console.log("Initializing chat..."); // DEBUG
        const chatList = getChatList();
        if (chatList.length > 0) {
            // Try to load the most recent chat from the list
            const mostRecentChatId = chatList[0].id;
            const mostRecentChatTitle = chatList[0].title;
            const history = loadChatHistory(mostRecentChatId);

            // If the most recent chat is just an empty 'New Chat', discard it and start fresh
            // This happens if user just opened the page, got initial AI message, and closed.
            if (history.length === 1 && history[0].role === 'ai') {
                console.log(`Most recent chat (${mostRecentChatId}) is empty, starting new one.`); // DEBUG
                // Remove the empty chat from the list
                let newChatList = chatList.filter(chat => chat.id !== mostRecentChatId);
                saveChatList(newChatList);
                localStorage.removeItem(CHAT_STORAGE_PREFIX + mostRecentChatId);
                startNewChat(); // Start a truly new one
            } else {
                // Otherwise, load the actual most recent chat
                currentChatId = mostRecentChatId;
                chatHistory = history;
                chatHistory.forEach(msg => {
                    appendMessage(msg.content, msg.role, null);
                });
                currentChatNavLink.textContent = mostRecentChatTitle;
                console.log(`Loaded existing chat: ${mostRecentChatId}`); // DEBUG
            }
        } else {
            // Start a new chat if no history exists at all
            console.log("No existing chats, starting new one."); // DEBUG
            startNewChat();
        }
        updateRecentChatsUI(); // Ensure UI is updated regardless of initial state
        highlightCurrentChatInSidebar();
    }

    // Call initializeChat when the DOM is ready
    initializeChat();

    // --- Textarea Auto-Resizing ---
    function autoResizeTextarea() {
        messageInput.style.height = 'auto'; // Reset height
        messageInput.style.height = messageInput.scrollHeight + 'px'; // Set to scroll height
    }
    messageInput.addEventListener('input', autoResizeTextarea);

    // --- Chat Functionality (Groq API via Vercel Function) ---
    sendMessageButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Allow Shift+Enter for new line
            e.preventDefault(); // Prevent default Enter key behavior (new line)
            sendMessage();
        }
    });

    async function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        // Animate send button
        sendMessageButton.classList.add('send-button-bounce');
        sendMessageButton.addEventListener('animationend', () => {
            sendMessageButton.classList.remove('send-button-bounce');
        }, { once: true });

        // Check if this is the first user message in the current chat
        const isFirstUserMessage = chatHistory.length === 1 && chatHistory[0].role === 'ai';

        appendMessage(messageText, 'user');
        chatHistory.push({ role: "user", content: messageText });

        if (isFirstUserMessage) {
            let chatList = getChatList();
            let currentChatEntry = chatList.find(chat => chat.id === currentChatId);

            if (currentChatEntry) {
                currentChatEntry.title = generateChatTitle(chatHistory);
                currentChatNavLink.textContent = currentChatEntry.title; // Update the main link

                // Move the current chat to the top of the list (even if it's already there)
                chatList = chatList.filter(chat => chat.id !== currentChatId); // Remove old entry
                chatList.unshift(currentChatEntry); // Add updated entry to the front
                saveChatList(chatList);
                updateRecentChatsUI(); // Re-render recent chats with the new title and order
            }
        } else {
            saveCurrentChatHistory(); // Save after every subsequent user message
        }

        // Clear input and reset its height
        messageInput.value = '';
        autoResizeTextarea(); // Reset height immediately after clearing

        showTypingIndicator(); // Show typing indicator

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
                removeTypingIndicator(); // Remove typing indicator on error
                const errorMessage = `Oops! Backend error: ${errorData.error || 'Failed to get response'}. Please check your Groq API key or Vercel function logs.`;
                appendMessage(errorMessage, 'ai');
                chatHistory.push({ role: "ai", content: errorMessage });
                saveCurrentChatHistory();
                return;
            }

            const data = await response.json();
            const aiResponseText = data.reply || "No AI response content found.";
            const aiDisplayInfo = data.displayInfo || null;

            removeTypingIndicator(); // Remove typing indicator before showing response
            appendMessage(aiResponseText, 'ai', aiDisplayInfo);
            chatHistory.push({ role: "ai", content: aiResponseText });
            saveCurrentChatHistory();

        } catch (error) {
            console.error('Error fetching AI response from Vercel function:', error);
            removeTypingIndicator(); // Remove typing indicator on error
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
            // If currentChatId is set, ensure we load its content fresh.
            // This also handles ensuring it's at the top of the recent chats list.
            const currentChatData = getChatList().find(chat => chat.id === currentChatId);
            if (currentChatData) {
                switchChat(currentChatData.id, currentChatData.title);
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
