import { initAuth, isLoggedIn, getUser, logout } from './utils/auth.js';
import { initChat } from './pages/chat.js';
import { initTasks } from './pages/tasks.js';
import { initAgents } from './pages/agents.js';
import { initBilling } from './pages/billing.js';
import { initSettings } from './pages/settings.js';
import { initAuthPage } from './pages/auth.js';
import { updateUsageDisplay } from './utils/tokens.js';

const PAGES = {
  chat:     { init: initChat,     title: 'Chat' },
  tasks:    { init: initTasks,    title: 'Tasks' },
  agents:   { init: initAgents,   title: 'Agent Builder' },
  billing:  { init: initBilling,  title: 'Billing' },
  settings: { init: initSettings, title: 'Settings' },
};

async function route() {
  if (!isLoggedIn()) {
    showAuth();
    return;
  }
  showApp();
  const hash = location.hash.replace('#/', '') || 'chat';
  const page = PAGES[hash] || PAGES.chat;
  document.getElementById('page-title').textContent = page.title;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === hash);
  });
  const container = document.getElementById('page-content');
  container.innerHTML = '';
  await page.init(container);
  updateUsageDisplay();
}

function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  initAuthPage(document.getElementById('auth-form-container'), () => route());
}

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  const user = getUser();
  if (user) {
    document.getElementById('user-name').textContent = user.name || user.full_name || user.email;
    document.getElementById('user-avatar').textContent = (user.name || user.full_name || user.email || '?')[0].toUpperCase();
    const plan = user.plan || 'free';
    document.getElementById('user-plan').textContent = plan;
    document.getElementById('user-plan').className = `plan-badge badge-${plan}`;
  }
}

document.getElementById('logout-btn')?.addEventListener('click', () => { logout(); route(); });
document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  sidebar.classList.toggle('open');
});
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
