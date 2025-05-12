
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chatContainer');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const apiKeyContainer = document.getElementById('apiKeyContainer');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKey');
    const chatHistory = document.getElementById('chatHistory');
    const themeToggle = document.getElementById('themeToggle');
    const codeTheme = document.getElementById('code-theme');

    // Theme toggle functionality
    let darkMode = localStorage.getItem('darkMode') === 'true';

    // Set initial theme
    if (darkMode) {
        document.body.classList.add('dark-theme');
        codeTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css';
    } else {
        codeTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css';
    }

    themeToggle.addEventListener('click', () => {
        darkMode = !darkMode;
        if (darkMode) {
            document.body.classList.add('dark-theme');
            codeTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css';
            themeToggle.textContent = '☀️';
        } else {
            document.body.classList.remove('dark-theme');
            codeTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css';
            themeToggle.textContent = '🌙';
        }
        localStorage.setItem('darkMode', darkMode);

        // Re-highlight all code blocks
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    });

    // Update theme toggle icon based on current theme
    themeToggle.textContent = darkMode ? '☀️' : '🌙';

    // Check if API key already exists
    let apiKey = localStorage.getItem('geminiApiKey');
    if (apiKey) {
        apiKeyContainer.style.display = 'none';
    }

    // Save API key
    saveApiKeyBtn.addEventListener('click', () => {
        apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('geminiApiKey', apiKey);
            apiKeyContainer.style.display = 'none';

            // Add animation for smooth transition
            apiKeyContainer.style.opacity = '0';
            setTimeout(() => {
                apiKeyContainer.style.display = 'none';
            }, 300);
        } else {
            // Shake animation for invalid input
            apiKeyInput.style.animation = 'shake 0.5s';
            setTimeout(() => {
                apiKeyInput.style.animation = '';
            }, 500);

            alert('Please enter a valid API key');
        }
    });

    // Variables to track conversation
    let conversationHistory = [];
    let currentChatId = 'chat-' + Date.now();
    let artifactCounter = 1;

    // Initialize conversation
    conversationHistory.push({
        role: 'assistant',
        content: "Hello! I'm your AI coding assistant powered by Gemini. I can help you with coding questions, generate code examples, debug issues, and more. What would you like help with today?"
    });

    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    userInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    newChatBtn.addEventListener('click', () => {
        // Save current chat to history if it has messages
        if (conversationHistory.length > 1) {
            saveCurrentChatToHistory();
        }

        // Create new chat
        currentChatId = 'chat-' + Date.now();
        chatContainer.innerHTML = '';
        conversationHistory = [];

        // Add welcome message
        const welcomeMessage = "Hello! I'm your AI coding assistant powered by Gemini. I can help you with coding questions, generate code examples, debug issues, and more. What would you like help with today?";
        addAssistantMessage(welcomeMessage);
        conversationHistory.push({
            role: 'assistant',
            content: welcomeMessage
        });

        // Update UI
        updateChatHistory();
    });

    function saveCurrentChatToHistory() {
        // Get first user message as title or use default
        let chatTitle = "New Chat";
        for (const msg of conversationHistory) {
            if (msg.role === 'user') {
                chatTitle = msg.content.substring(0, 20) + (msg.content.length > 20 ? '...' : '');
                break;
            }
        }

        // Save chat to localStorage
        const chatData = {
            id: currentChatId,
            title: chatTitle,
            messages: conversationHistory,
            timestamp: Date.now()
        };

        // Get existing chats
        let savedChats = JSON.parse(localStorage.getItem('aiChatHistory') || '[]');
        savedChats.push(chatData);
        localStorage.setItem('aiChatHistory', JSON.stringify(savedChats));

        updateChatHistory();
    }

    function updateChatHistory() {
        // Get saved chats
        const savedChats = JSON.parse(localStorage.getItem('aiChatHistory') || '[]');

        // Clear and rebuild chat history
        chatHistory.innerHTML = '<div class="chat-item" data-id="new">New Chat</div>';

        // Add saved chats (most recent first)
        savedChats
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10)  // Keep only most recent 10
            .forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-item';
                chatItem.dataset.id = chat.id;
                chatItem.textContent = chat.title;
                chatHistory.appendChild(chatItem);
            });

        // Add click event to history items
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.dataset.id === 'new') {
                    // Simulate clicking new chat button
                    newChatBtn.click();
                } else {
                    loadChat(item.dataset.id);
                }
            });
        });
    }

    function loadChat(chatId) {
        // Load chat from localStorage
        const savedChats = JSON.parse(localStorage.getItem('aiChatHistory') || '[]');
        const chat = savedChats.find(c => c.id === chatId);

        if (chat) {
            // Set as current chat
            currentChatId = chatId;
            conversationHistory = [...chat.messages];

            // Clear and rebuild chat UI
            chatContainer.innerHTML = '';
            conversationHistory.forEach(msg => {
                if (msg.role === 'user') {
                    addUserMessage(msg.content);
                } else {
                    addAssistantMessage(msg.content);
                }
            });
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Check if API key exists
        if (!apiKey) {
            apiKeyContainer.style.display = 'flex';
            return;
        }

        // Add user message to the chat
        addUserMessage(message);

        // Add to conversation history
        conversationHistory.push({
            role: 'user',
            content: message
        });

        // Clear input
        userInput.value = '';
        userInput.style.height = 'auto';

        // Show thinking indicator
        showThinking();

        try {
            // Call Gemini API
            const response = await callGeminiAPI(message);

            // Hide thinking indicator
            hideThinking();

            // Process and display the response
            addAssistantMessage(response);

            // Add to conversation history
            conversationHistory.push({
                role: 'assistant',
                content: response
            });

        } catch (error) {
            console.error('Error:', error);
            hideThinking();
            addAssistantMessage('Sorry, I encountered an error while processing your request. Please check your API key and try again.');
        }
    }

    async function callGeminiAPI(prompt) {
        const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

        try {
            // Convert conversation history to Gemini format
            const messages = conversationHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

            // Add current prompt
            messages.push({
                role: 'user',
                parts: [{ text: prompt }]
            });

            const response = await fetch(`${API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: messages,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log("API Response:", data);

            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                // Extract the response text from the first candidate
                const generatedText = data.candidates[0].content.parts[0].text;
                return generatedText;
            } else {
                throw new Error('Invalid response format from API');
            }
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            return `I'm having trouble connecting to my API. Please check your API key and internet connection.
                    
Error details: ${error.message}`;
        }
    }

    function addUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `
                    <div class="avatar user-avatar">U</div>
                    <div class="message-content">${escapeHTML(message)}</div>
                `;
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    function addAssistantMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant-message';

        // Extract code blocks for potential artifacts
        const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
        let match;
        let processedMessage = message;
        let codeBlocks = [];

        // Find and collect all code blocks
        while ((match = codeBlockRegex.exec(message)) !== null) {
            const language = match[1] || 'plaintext';
            const code = match[2].trim();

            // Skip empty code blocks
            if (code) {
                codeBlocks.push({ language, code });
            }
        }

        // Convert markdown to HTML
        let htmlContent = marked.parse(processedMessage);

        messageDiv.innerHTML = `
                    <div class="avatar assistant-avatar">AI</div>
                    <div class="message-content">${htmlContent}</div>
                `;
        chatContainer.appendChild(messageDiv);

        // Convert code blocks to artifacts
        if (codeBlocks.length > 0) {
            const messageContent = messageDiv.querySelector('.message-content');

            // Remove ```code``` blocks from the content as we'll replace them with artifacts
            codeBlocks.forEach((blockInfo, index) => {
                // Add artifacts for significant code blocks
                if (blockInfo.code.split('\n').length > 2) {
                    addCodeArtifact(
                        messageContent,
                        `${blockInfo.language.charAt(0).toUpperCase() + blockInfo.language.slice(1)} Code${codeBlocks.length > 1 ? ' ' + (index + 1) : ''}`,
                        blockInfo.language === '' ? 'plaintext' : blockInfo.language,
                        blockInfo.code
                    );
                }
            });
        }

        // Apply syntax highlighting to any remaining code blocks
        messageDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        // Add a subtle entrance animation
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(10px)';

        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
            messageDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }, 10);

        scrollToBottom();
    }

    function addCodeArtifact(container, title, language, code) {
        const artifactId = `artifact-${artifactCounter++}`;
        const artifact = document.createElement('div');
        artifact.className = 'artifact';
        artifact.id = artifactId;

        artifact.innerHTML = `
                    <div class="artifact-header">
                        <div class="artifact-title">${title}</div>
                        <div class="artifact-controls">
                            <button onclick="copyArtifact('${artifactId}')" title="Copy to clipboard">Copy</button>
                        </div>
                    </div>
                    <pre class="artifact-content"><code class="${language}">${escapeHTML(code)}</code></pre>
                `;

        container.appendChild(artifact);

        // Apply syntax highlighting
        hljs.highlightElement(artifact.querySelector('code'));

        // Add entrance animation
        artifact.style.opacity = '0';
        setTimeout(() => {
            artifact.style.opacity = '1';
            artifact.style.transition = 'opacity 0.5s ease';
        }, 100);

        scrollToBottom();
    }

    function showThinking() {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message assistant-message thinking';
        thinkingDiv.id = 'thinking';
        thinkingDiv.innerHTML = `
                    <div class="avatar assistant-avatar">AI</div>
                    <div class="message-content">
                        <span>Thinking</span>
                        <div class="thinking-dots">
                            <span class="thinking-dot"></span>
                            <span class="thinking-dot"></span>
                            <span class="thinking-dot"></span>
                        </div>
                    </div>
                `;
        chatContainer.appendChild(thinkingDiv);
        scrollToBottom();
    }

    function hideThinking() {
        const thinkingDiv = document.getElementById('thinking');
        if (thinkingDiv) {
            // Fade out animation
            thinkingDiv.style.opacity = '0';
            thinkingDiv.style.transform = 'translateY(10px)';
            thinkingDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

            setTimeout(() => {
                thinkingDiv.remove();
            }, 300);
        }
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Make copyArtifact function available globally
    window.copyArtifact = function (artifactId) {
        const codeElement = document.querySelector(`#${artifactId} .artifact-content code`);
        const textToCopy = codeElement.textContent;

        navigator.clipboard.writeText(textToCopy).then(() => {
            // Show a brief "Copied!" message
            const button = document.querySelector(`#${artifactId} button`);
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.backgroundColor = '#10a37f';
            button.style.color = 'white';

            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '';
                button.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    // Add animation keyframes
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
            `;
    document.head.appendChild(styleSheet);

    // Load saved chats on startup
    updateChatHistory();
});