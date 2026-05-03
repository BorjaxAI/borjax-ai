import { apiFetch } from '../api/client.js';
import { streamChat } from '../api/chat.js';
import { showToast } from '../utils/toast.js';

export async function initChat(container) {
  container.innerHTML = `
    <div class="chat-layout">
      <aside class="conv-sidebar">
        <button class="btn-primary new-chat-btn" id="new-chat-btn">+ New Chat</button>
        <div class="conv-list" id="conv-list">
          <div class="skeleton" style="height:36px;margin-bottom:6px;border-radius:7px"></div>
          <div class="skeleton" style="height:36px;margin-bottom:6px;border-radius:7px"></div>
          <div class="skeleton" style="height:36px;border-radius:7px"></div>
        </div>
      </aside>
      <div class="chat-main">
        <div class="messages-area" id="messages-area">
          <div class="empty-state" id="chat-empty">
            <div class="empty-icon">💬</div>
            <h3>Start a conversation</h3>
            <p>Ask me anything — I can search the web, write content, analyze data, and more.</p>
            <div class="suggestion-chips">
              <button class="chip">Research top AI tools in 2026</button>
              <button class="chip">Write a cold email for my SaaS</button>
              <button class="chip">Analyze my competitors</button>
            </div>
          </div>
        </div>
        <div class="chat-input-bar">
          <textarea id="chat-input" placeholder="Ask anything…" rows="1"></textarea>
          <button class="btn-primary send-btn" id="send-btn">↑</button>
        </div>
      </div>
    </div>
  `;

  let currentConvId = null;
  let isStreaming   = false;

  // ── Load conversations ──────────────────────────────────────
  try {
    const convs = await apiFetch('/chat/conversations?limit=50');
    const list  = document.getElementById('conv-list');
    if (!convs?.length) {
      list.innerHTML = '<p class="muted-text" style="font-size:0.78rem;padding:0.5rem 0.25rem">No conversations yet</p>';
    } else {
      list.innerHTML = convs.map(c =>
        `<button class="conv-item" data-id="${c.id}">${c.title || 'Untitled'}</button>`
      ).join('');
      list.querySelectorAll('.conv-item').forEach(btn =>
        btn.addEventListener('click', () => loadConversation(btn.dataset.id))
      );
    }
  } catch { /* silently ignore */ }

  // ── Load a conversation ──────────────────────────────────────
  async function loadConversation(id) {
    currentConvId = id;
    document.querySelectorAll('.conv-item').forEach(b =>
      b.classList.toggle('active', b.dataset.id === id)
    );
    const area = document.getElementById('messages-area');
    area.innerHTML = '<div class="skeleton msg-skeleton"></div>'.repeat(3);
    try {
      const data = await apiFetch(`/chat/conversations/${id}`);
      renderMessages(data.messages || []);
    } catch { showToast('Failed to load conversation', 'error'); }
  }

  function renderMessages(msgs) {
    const area = document.getElementById('messages-area');
    area.innerHTML = msgs.map(m => buildMessage(m.role, m.content)).join('');
    area.scrollTop = area.scrollHeight;
  }

  function buildMessage(role, content) {
    const isUser = role === 'user';
    const html = isUser
      ? content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      : (typeof marked !== 'undefined' ? marked.parse(content) : content);
    return `<div class="message ${isUser ? 'user' : 'assistant'}">
      ${!isUser ? '<div class="msg-avatar">🤖</div>' : ''}
      <div class="msg-bubble"><div class="msg-content">${html}</div></div>
    </div>`;
  }

  // ── Send message ─────────────────────────────────────────────
  async function sendMessage() {
    if (isStreaming) return;
    const input = document.getElementById('chat-input');
    const text  = input.value.trim();
    if (!text) return;

    isStreaming = true;
    input.value = ''; input.style.height = 'auto';
    const sendBtn = document.getElementById('send-btn');
    sendBtn.disabled = true;

    document.getElementById('chat-empty')?.remove();
    const area = document.getElementById('messages-area');
    area.insertAdjacentHTML('beforeend', buildMessage('user', text));

    const aiEl = document.createElement('div');
    aiEl.className = 'message assistant';
    aiEl.innerHTML = `<div class="msg-avatar">🤖</div>
      <div class="msg-bubble"><div class="msg-content">
        <span class="typing-dots"><span></span><span></span><span></span></span>
      </div></div>`;
    area.appendChild(aiEl);
    area.scrollTop = area.scrollHeight;

    const contentEl = aiEl.querySelector('.msg-content');
    let fullText = '';

    try {
      currentConvId = await streamChat(
        text,
        currentConvId,
        (delta) => {
          if (contentEl.querySelector('.typing-dots')) contentEl.innerHTML = '';
          fullText += delta;
          contentEl.innerHTML = typeof marked !== 'undefined'
            ? marked.parse(fullText)
            : fullText.replace(/</g,'&lt;');
          area.scrollTop = area.scrollHeight;
        },
        (convId) => { currentConvId = convId; refreshConvList(); }
      );
    } catch (err) {
      contentEl.innerHTML = `<span style="color:var(--red)">Error: ${err.message}</span>`;
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
    }
  }

  async function refreshConvList() {
    try {
      const convs = await apiFetch('/chat/conversations?limit=50');
      if (!convs?.length) return;
      const list = document.getElementById('conv-list');
      if (!list) return;
      list.innerHTML = convs.map(c =>
        `<button class="conv-item${c.id === currentConvId ? ' active' : ''}" data-id="${c.id}">${c.title || 'Untitled'}</button>`
      ).join('');
      list.querySelectorAll('.conv-item').forEach(btn =>
        btn.addEventListener('click', () => loadConversation(btn.dataset.id))
      );
    } catch {}
  }

  // ── Events ──────────────────────────────────────────────────
  document.getElementById('send-btn')?.addEventListener('click', sendMessage);
  document.getElementById('chat-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.getElementById('chat-input')?.addEventListener('input', e => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  });
  document.getElementById('new-chat-btn')?.addEventListener('click', () => {
    currentConvId = null;
    document.querySelectorAll('.conv-item').forEach(b => b.classList.remove('active'));
    document.getElementById('messages-area').innerHTML = `
      <div class="empty-state" id="chat-empty">
        <div class="empty-icon">💬</div>
        <h3>New conversation</h3>
        <p>Ask me anything.</p>
      </div>`;
    document.getElementById('chat-input')?.focus();
  });
  document.querySelectorAll('.chip').forEach(chip =>
    chip.addEventListener('click', () => {
      document.getElementById('chat-input').value = chip.textContent;
      sendMessage();
    })
  );
}
