const PAGE_MAP = {
  '1': 'chat',
  '2': 'tasks',
  '3': 'agents',
  '4': 'models',
  '5': 'billing',
};

export function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;

    // Ctrl/Cmd+K — focus search / command palette
    if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      if (input) {
        input.focus();
        input.select();
      } else {
        // Navigate to chat and focus
        window.location.hash = '#/chat';
        setTimeout(() => {
          document.getElementById('chat-input')?.focus();
        }, 200);
      }
      return;
    }

    // Ctrl/Cmd+N — new chat
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      window.location.hash = '#/chat';
      setTimeout(() => {
        document.getElementById('new-chat-btn')?.click();
      }, 100);
      return;
    }

    // Ctrl/Cmd+1-5 — switch pages
    if (PAGE_MAP[e.key]) {
      e.preventDefault();
      window.location.hash = `#/${PAGE_MAP[e.key]}`;
      return;
    }
  });

  // Add shortcuts hint to footer area
  addShortcutsHint();
}

function addShortcutsHint() {
  const existing = document.getElementById('shortcuts-hint');
  if (existing) return;

  const hint = document.createElement('div');
  hint.id = 'shortcuts-hint';
  hint.className = 'shortcuts-hint';

  const isMac = navigator.platform?.includes('Mac') || navigator.userAgent?.includes('Mac');
  const mod = isMac ? '⌘' : 'Ctrl+';

  hint.innerHTML = `
    <span>${mod}K Search</span>
    <span>${mod}N New Chat</span>
    <span>${mod}1-5 Pages</span>
  `;

  const sidebar = document.querySelector('.sidebar-bottom');
  if (sidebar) {
    sidebar.insertBefore(hint, sidebar.firstChild);
  }
}
