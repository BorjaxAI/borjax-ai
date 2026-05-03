const STORAGE_KEY = 'borjaxai_notifications';
const MAX_NOTIFICATIONS = 50;

/**
 * Notification types: task_complete, token_warning, upgrade_prompt, system
 */

export function getNotifications() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveNotifications(notifs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, MAX_NOTIFICATIONS)));
}

export function addNotification(type, title, message) {
  const notifs = getNotifications();
  notifs.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type,
    title,
    message,
    read: false,
    time: Date.now(),
  });
  saveNotifications(notifs);
  updateBadge();
}

export function markAllRead() {
  const notifs = getNotifications().map(n => ({ ...n, read: true }));
  saveNotifications(notifs);
  updateBadge();
}

export function clearNotifications() {
  saveNotifications([]);
  updateBadge();
}

function getUnreadCount() {
  return getNotifications().filter(n => !n.read).length;
}

function updateBadge() {
  const dot = document.getElementById('notif-dot');
  if (!dot) return;
  const count = getUnreadCount();
  dot.style.display = count > 0 ? 'flex' : 'none';
  dot.textContent = count > 9 ? '9+' : count > 0 ? count : '';
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ICONS = {
  task_complete: '⚡',
  token_warning: '⚠️',
  upgrade_prompt: '💎',
  system: 'ℹ️',
};

function renderDropdown() {
  const existing = document.getElementById('notif-dropdown');
  if (existing) { existing.remove(); return; }

  const notifs = getNotifications();
  const dropdown = document.createElement('div');
  dropdown.id = 'notif-dropdown';
  dropdown.className = 'notif-dropdown';

  dropdown.innerHTML = `
    <div class="notif-dropdown-header">
      <span class="notif-dropdown-title">Notifications</span>
      <div class="notif-dropdown-actions">
        ${notifs.some(n => !n.read) ? '<button class="notif-action-btn" id="notif-mark-read">Mark all read</button>' : ''}
        ${notifs.length > 0 ? '<button class="notif-action-btn" id="notif-clear">Clear</button>' : ''}
      </div>
    </div>
    <div class="notif-dropdown-list">
      ${notifs.length === 0
        ? '<div class="notif-empty">No notifications yet</div>'
        : notifs.slice(0, 20).map(n => `
          <div class="notif-item ${n.read ? '' : 'unread'}">
            <span class="notif-item-icon">${ICONS[n.type] || 'ℹ️'}</span>
            <div class="notif-item-body">
              <div class="notif-item-title">${n.title}</div>
              <div class="notif-item-msg">${n.message}</div>
            </div>
            <span class="notif-item-time">${timeAgo(n.time)}</span>
          </div>
        `).join('')
      }
    </div>
  `;

  document.querySelector('.header-right')?.appendChild(dropdown);

  // close on outside click
  setTimeout(() => {
    const close = (e) => {
      if (!dropdown.contains(e.target) && e.target.id !== 'notif-bell') {
        dropdown.remove();
        document.removeEventListener('click', close);
      }
    };
    document.addEventListener('click', close);
  }, 10);

  dropdown.querySelector('#notif-mark-read')?.addEventListener('click', () => {
    markAllRead();
    dropdown.remove();
  });
  dropdown.querySelector('#notif-clear')?.addEventListener('click', () => {
    clearNotifications();
    dropdown.remove();
  });
}

export function initNotifications() {
  updateBadge();

  const bell = document.getElementById('notif-bell');
  if (bell) {
    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      renderDropdown();
    });
  }
}

// Convenience helpers for other modules
export function notifyTaskComplete(taskName) {
  addNotification('task_complete', 'Task Complete', `"${taskName}" finished successfully.`);
}

export function notifyTokenWarning(pct) {
  addNotification('token_warning', 'Token Warning', `You've used ${pct}% of your monthly tokens.`);
}

export function notifyUpgrade() {
  addNotification('upgrade_prompt', 'Upgrade Available', 'Unlock more tokens and features with a paid plan.');
}
