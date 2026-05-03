import { apiFetch } from '../api/client.js';
import { streamChat } from '../api/chat.js';
import { showToast } from '../utils/toast.js';
import { isGuest, getUser } from '../utils/auth.js';
import { formatTokens } from '../utils/tokens.js';
import { showTokenExhaustedModal } from '../components/modals.js';
import { notifyTaskComplete } from '../components/notifications.js';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

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
  let lastUserText  = '';

  // ── Guest token bar ─────────────────────────────────────────
  if (isGuest()) {
    const user = getUser();
    const left = Math.max(0, (user?.tokens_limit || 5000) - (user?.tokens_used || 0));
    const bar = document.createElement('div');
    bar.className = 'guest-token-bar';
    bar.id = 'guest-token-bar';
    bar.innerHTML = `
      <span class="tokens-label">🎁 Free trial</span>
      <span class="tokens-left" id="guest-tokens-left">${formatTokens(left)} tokens left</span>
      <span class="upgrade-link" id="upgrade-link">Create free account →</span>
    `;
    document.getElementById('messages-area').before(bar);
    document.getElementById('upgrade-link')?.addEventListener('click', showTokenExhaustedModal);
  }

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
    area.innerHTML = msgs.map((m, i) => buildMessage(m.role, m.content, m.created_at, i === msgs.length - 1)).join('');
    area.scrollTop = area.scrollHeight;
    bindMessageActions();
  }

  function buildMessage(role, content, timestamp, isLast) {
    const isUser = role === 'user';
    const html = isUser
      ? content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      : (typeof marked !== 'undefined' ? marked.parse(content) : content);
    const timeStr = timestamp ? timeAgo(timestamp) : 'just now';
    const fullDate = timestamp ? new Date(timestamp).toLocaleString() : '';

    return `<div class="message ${isUser ? 'user' : 'assistant'}">
      ${!isUser ? '<div class="msg-avatar">🤖</div>' : ''}
      <div class="msg-bubble">
        <div class="msg-content">${html}</div>
        <div class="msg-meta">
          <span class="msg-time" title="${fullDate}">${timeStr}</span>
          ${!isUser ? `
            <button class="msg-action-btn copy-msg-btn" title="Copy">📋</button>
            ${isLast ? '<button class="msg-action-btn regen-btn" title="Regenerate">🔄</button>' : ''}
          ` : ''}
        </div>
      </div>
    </div>`;
  }

  function bindMessageActions() {
    // Copy buttons
    document.querySelectorAll('.copy-msg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const content = btn.closest('.msg-bubble')?.querySelector('.msg-content');
        if (content) {
          navigator.clipboard.writeText(content.innerText).then(() => {
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = '📋'; }, 1500);
          });
        }
      });
    });

    // Regenerate button
    document.querySelector('.regen-btn')?.addEventListener('click', () => {
      if (lastUserText) regenerateResponse();
    });
  }

  // ── Regenerate last response ────────────────────────────────
  async function regenerateResponse() {
    if (isStreaming || !lastUserText) return;
    // Remove last AI message from DOM
    const area = document.getElementById('messages-area');
    const lastAi = area.querySelector('.message.assistant:last-child');
    if (lastAi) lastAi.remove();
    // Re-send
    await doSend(lastUserText, true);
  }

  // ── Send message ─────────────────────────────────────────────
  async function sendMessage() {
    if (isStreaming) return;
    const input = document.getElementById('chat-input');
    const text  = input.value.trim();
    if (!text) return;

    input.value = ''; input.style.height = 'auto';
    lastUserText = text;
    await doSend(text, false);
  }

  async function doSend(text, isRegen) {
    isStreaming = true;
    const sendBtn = document.getElementById('send-btn');
    sendBtn.disabled = true;

    document.getElementById('chat-empty')?.remove();
    const area = document.getElementById('messages-area');

    if (!isRegen) {
      area.insertAdjacentHTML('beforeend', buildMessage('user', text, null, false));
    }

    // Add typing indicator
    const aiEl = document.createElement('div');
    aiEl.className = 'message assistant';
    aiEl.innerHTML = `<div class="msg-avatar">🤖</div>
      <div class="msg-bubble"><div class="msg-content">
        <span class="typing-dots"><span></span><span></span><span></span></span>
      </div>
      <div class="msg-meta"><span class="msg-time">typing...</span></div>
      </div>`;
    area.appendChild(aiEl);
    area.scrollTop = area.scrollHeight;

    const contentEl = aiEl.querySelector('.msg-content');
    const metaEl = aiEl.querySelector('.msg-meta');
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

      // Update meta after streaming done
      if (metaEl) {
        metaEl.innerHTML = `
          <span class="msg-time" title="${new Date().toLocaleString()}">just now</span>
          <button class="msg-action-btn copy-msg-btn" title="Copy">📋</button>
          <button class="msg-action-btn regen-btn" title="Regenerate">🔄</button>
        `;
      }
      bindMessageActions();
    } catch (err) {
      if (err.status === 402 || err.code === 'TOKEN_LIMIT_REACHED') {
        aiEl.remove();
        if (!isRegen) area.querySelector('.message.user:last-of-type')?.remove();
        showTokenExhaustedModal();
      } else {
        contentEl.innerHTML = `<span style="color:var(--red)">Error: ${err.message}</span>`;
      }
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
    lastUserText = '';
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
