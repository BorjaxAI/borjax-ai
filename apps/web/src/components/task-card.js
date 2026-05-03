export function renderTaskCard(task, onClick) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.taskId = task.id;

  const statusColors = {
    pending: 'status-pending',
    running: 'status-running',
    completed: 'status-completed',
    failed: 'status-failed',
    cancelled: 'status-cancelled',
  };

  const typeColors = {
    research: 'color: var(--blue)',
    write: 'color: var(--purple)',
    analyze: 'color: var(--cyan)',
    custom: 'color: var(--orange)',
  };

  const statusIcons = {
    pending: '⏳',
    running: '⚡',
    completed: '✅',
    failed: '❌',
    cancelled: '🚫',
  };

  const prompt = task.prompt.length > 120 ? task.prompt.slice(0, 120) + '...' : task.prompt;
  const date = new Date(task.created_at).toLocaleString();

  card.innerHTML = `
    <div class="task-card-header">
      <div class="task-card-type" style="${typeColors[task.type] || ''}">${task.type.toUpperCase()}</div>
      <span class="status-badge ${statusColors[task.status] || ''}">
        ${statusIcons[task.status] || ''} ${task.status}
      </span>
    </div>
    <div class="task-card-prompt">${prompt}</div>
    <div class="task-card-meta">
      <span>📅 ${date}</span>
      ${task.tokens_used ? `<span>🔢 ${task.tokens_used.toLocaleString()} tokens</span>` : ''}
    </div>
    ${task.status === 'running' ? '<div style="margin-top:.5rem; font-size:.75rem; color:var(--blue);">⚡ Processing...</div>' : ''}
  `;

  if (onClick) card.addEventListener('click', () => onClick(task));

  return card;
}
