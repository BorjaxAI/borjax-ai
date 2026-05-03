import { isAuthenticated, removeToken } from './utils/auth.js';
import { renderAuth } from './pages/auth.js';
import { renderChat } from './pages/chat.js';
import { renderTasks, cleanupTasks } from './pages/tasks.js';
import { renderAgents } from './pages/agents.js';
import { renderBilling } from './pages/billing.js';
import { api } from './api/client.js';

// ── Toast ─────────────────────────────────────────────────────────────────────
export function showToast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── Router ─────────────────────────────────────────────────────────────────────
let currentPage = 'chat';

function navigate(page) {
  if (currentPage === 'tasks') cleanupTasks();
  currentPage = page;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  const container = document.getElementById('page-container');
  container.innerHTML = '';

  switch (page) {
    case 'chat':    renderChat(container);    break;
    case 'tasks':   renderTasks(container);   break;
    case 'agents':  renderAgents(container);  break;
    case 'billing': renderBilling(container); break;
    default:        renderChat(container);
  }
}

// ── User info ──────────────────────────────────────────────────────────────────
async function loadUserInfo() {
  try {
    const user = await api.get('/auth/me');
    const nameEl = document.getElementById('user-name');
    const planEl = document.getElementById('user-plan');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = user.full_name || user.email;
    if (planEl) planEl.textContent = user.plan + ' plan';
    if (avatarEl) avatarEl.textContent = (user.full_name || user.email).charAt(0).toUpperCase();
  } catch {}
}

// ── Init ───────────────────────────────────────────────────────────────────────
function init() {
  // Add toast container
  const toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  document.body.appendChild(toastContainer);

  const authOverlay = document.getElementById('auth-overlay');
  const app = document.getElementById('app');

  if (!isAuthenticated()) {
    authOverlay.classList.remove('hidden');
    app.classList.add('hidden');
    renderAuth(document.getElementById('auth-container'), (user) => {
      authOverlay.classList.add('hidden');
      app.classList.remove('hidden');
      const nameEl = document.getElementById('user-name');
      const planEl = document.getElementById('user-plan');
      const avatarEl = document.getElementById('user-avatar');
      if (nameEl) nameEl.textContent = user.full_name || user.email;
      if (planEl) planEl.textContent = user.plan + ' plan';
      if (avatarEl) avatarEl.textContent = (user.full_name || user.email).charAt(0).toUpperCase();
      navigate('chat');
    });
  } else {
    authOverlay.classList.add('hidden');
    app.classList.remove('hidden');
    loadUserInfo();
    navigate('chat');
  }

  // Nav click handlers
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.dataset.page);
    });
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    if (currentPage === 'tasks') cleanupTasks();
    removeToken();
    window.location.reload();
  });
}

init();
