import { api } from '../api/client.js';
import { streamChat } from '../api/chat.js';
import { renderMessage } from '../components/message.js';

let currentConvId = null;
let isStreaming = false;

export function renderChat(container) {
  container.innerHTML = `
    <div class="chat-layout">
      <div class="chat-sidebar">
        <div class="chat-sidebar-header">
          <button class="btn btn-primary btn-sm w-full" id="new-chat-btn">+ New Chat</button>
        </div>
        <div class="conversations-list" id="conversations-list">
          <div class="text-center text-dim text-small" style="padding:1rem;">Loading...</div>
        </div>
      </div>
      <div class="chat-main">
        <div class="messages-area" id="messages-area">
          <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <h3>Start a conversation</h3>
            <p>Ask anything — research, writing, analysis, code, or just a question.</p>
          </div>
        </div>
        <div class="chat-input-area">
          <textarea class="chat-input" id="chat-input" placeholder="Ask anything... (Enter to send, Shift+Enter for newline)" rows="1"></textarea>
          <button class="btn btn-primary" id="send-btn">Send</button>
        </div>
      </div>
    </div>
  `;

  loadConversations();
  document.getElementById('new-chat-btn').addEventListener('click', startNewChat);
  document.getElementById('send-btn').addEventListener('click', sendMessage);

  const input = document.getElementById('chat-input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  });
}

async function loadConversations() {
  const list = document.getElementById('conversations-list');
  if (!list) return;
  try {
    const convs = await api.get('/chat/conversations?limit=50');
    if (!convs.length) {
      list.innerHTML = '<div class="text-center text-dim text-small" style="padding:1rem;">No conversations yet</div>';
      return;
    }
    list.innerHTML = '';
    convs.forEach(conv => {
      const item = document.createElement('div');
      item.className = 'conv-item' + (conv.id === currentConvId ? ' active' : '');
      item.textContent = conv.title || 'New Chat';
      item.dataset.convId = conv.id;
      item.addEventListener('click', () => loadConversation(conv.id));
      list.appendChild(item);
    });
  } catch {
    list.innerHTML = '<div class="text-center text-dim text-small" style="padding:1rem;">Failed to load</div>';
  }
}

async function loadConversation(convId) {
  currentConvId = convId;
  document.querySelectorAll('.conv-item').forEach(item => {
    item.classList.toggle('active', item.dataset.convId === convId);
  });
  const messagesArea = document.getElementById('messages-area');
  messagesArea.innerHTML = '<div class="text-center text-dim text-small" style="padding:2rem;">Loading...</div>';
  try {
    const conv = await api.get('/chat/conversations/' + convId);
    messagesArea.innerHTML = '';
    conv.messages.forEach(msg => {
      const { row } = renderMessage({ role: msg.role, content: msg.content });
      messagesArea.appendChild(row);
    });
    scrollToBottom();
  } catch {
    messagesArea.innerHTML = '<div class="text-center text-dim text-small" style="padding:2rem;">Failed to load conversation</div>';
  }
}

function startNewChat() {
  currentConvId = null;
  document.getElementById('messages-area').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">💬</div>
      <h3>Start a conversation</h3>
      <p>Ask anything — research, writing, analysis, code, or just a question.</p>
    </div>`;
  document.querySelectorAll('.conv-item').forEach(i => i.classList.remove('active'));
  document.getElementById('chat-input').focus();
}

async function sendMessage() {
  if (isStreaming) return;
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  const messagesArea = document.getElementById('messages-area');
  const sendBtn = document.getElementById('send-btn');
  const emptyState = messagesArea.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const { row: userRow } = renderMessage({ role: 'user', content: message });
  messagesArea.appendChild(userRow);
  scrollToBottom();

  input.value = '';
  input.style.height = 'auto';

  const { row: aiRow, bubble: aiBubble } = renderMessage({ role: 'assistant', content: '', isStreaming: true });
  messagesArea.appendChild(aiRow);
  scrollToBottom();

  isStreaming = true;
  sendBtn.disabled = true;
  sendBtn.textContent = '...';

  let fullContent = '';

  await streamChat({
    message,
    conversationId: currentConvId,
    onToken: (token) => {
      if (aiBubble.querySelector('.typing-indicator')) aiBubble.innerHTML = '';
      fullContent += token;
      aiBubble.textContent = fullContent;
      scrollToBottom();
    },
    onDone: async (data) => {
      currentConvId = data.conversation_id;
      const { bubble: b } = renderMessage({ role: 'assistant', content: fullContent });
      aiBubble.innerHTML = b.innerHTML;
      isStreaming = false;
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
      await loadConversations();
    },
    onError: (msg) => {
      aiBubble.innerHTML = '<span style="color:var(--red)">Error: ' + msg + '</span>';
      isStreaming = false;
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
    },
  });
}

function scrollToBottom() {
  const area = document.getElementById('messages-area');
  if (area) area.scrollTop = area.scrollHeight;
}
