import { apiFetch } from '../api/client.js';
import { showToast } from '../utils/toast.js';
import { timeAgo }   from '../utils/time.js';
import { formatTokens } from '../utils/tokens.js';

const TYPE_ICONS = { research: '🔍', write: '✍️', analyze: '📊', scrape: '🌐' };
const FILTER_LABELS = ['All', 'Pending', 'Running', 'Done', 'Failed'];

let pollTimer = null;
let activeFilter = 'all';

export async function initTasks(container) {
  container.innerHTML = `
    <div class="tasks-page">
      <!-- Submit form -->
      <div class="task-submit-form">
        <h3>⚡ Submit New Task</h3>
        <form id="task-form">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Title</label>
              <input type="text" id="task-title" placeholder="Descriptive title" required/>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Type</label>
              <select id="task-type">
                <option value="research">🔍 Research</option>
                <option value="write">✍️ Write</option>
                <option value="analyze">📊 Analyze</option>
                <option value="scrape">🌐 Scrape</option>
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-top:0.75rem;margin-bottom:0.75rem">
            <label class="form-label">Prompt</label>
            <textarea id="task-prompt" placeholder="Describe exactly what you want the AI to do…" style="min-height:80px" required></textarea>
          </div>
          <button type="submit" class="btn-primary" id="task-submit-btn">Submit Task</button>
        </form>
      </div>

      <!-- Filter tabs + list -->
      <div>
        <div class="tasks-top">
          <h2>Recent Tasks</h2>
          <div class="filter-tabs" id="filter-tabs">
            ${FILTER_LABELS.map(l => `
              <button class="tab-btn${l.toLowerCase() === activeFilter ? ' active' : ''}"
                      data-filter="${l.toLowerCase()}">${l}</button>
            `).join('')}
          </div>
        </div>
        <div class="tasks-grid" id="tasks-grid">
          ${skeletonCards(3)}
        </div>
      </div>
    </div>
  `;

  // Wire filter tabs
  document.getElementById('filter-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    loadTasks();
  });

  // Wire form
  document.getElementById('task-form').addEventListener('submit', submitTask);

  await loadTasks();
  startPolling();
}

function skeletonCards(n) {
  return Array.from({length: n}, () =>
    '<div class="skeleton" style="height:88px;border-radius:12px;margin-bottom:0.75rem"></div>'
  ).join('');
}

async function loadTasks() {
  const grid = document.getElementById('tasks-grid');
  if (!grid) return;

  const filter = activeFilter === 'all' ? '' : activeFilter;
  // map "done" → "completed" for API
  const apiStatus = filter === 'done' ? 'completed' : filter;
  const url = '/tasks?limit=30' + (apiStatus ? `&status=${apiStatus}` : '');

  try {
    const data  = await apiFetch(url);
    const tasks = Array.isArray(data) ? data : (data.tasks || []);

    if (!tasks.length) {
      grid.innerHTML = `
        <div class="empty-state" style="padding:3rem 1rem">
          <div class="empty-icon">⚡</div>
          <h3>No tasks yet</h3>
          <p>${activeFilter === 'all' ? 'Submit your first task above.' : `No ${activeFilter} tasks.`}</p>
        </div>`;
      return;
    }

    grid.innerHTML = tasks.map(task => buildTaskCard(task)).join('');

    // Expand / collapse handlers
    grid.querySelectorAll('.task-result-toggle').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const result = btn.previousElementSibling;
        const expanded = result.classList.toggle('expanded');
        btn.textContent = expanded ? '▲ Show less' : '▼ Show more';
      });
    });

    // Click card → load full result
    grid.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', () => loadTaskDetail(card.dataset.id));
    });

    // Auto-refresh if any running tasks
    const hasRunning = tasks.some(t => t.status === 'running' || t.status === 'pending');
    if (!hasRunning) stopPolling();

  } catch (err) {
    grid.innerHTML = `<p class="muted-text" style="padding:1rem">Failed to load tasks: ${err.message}</p>`;
  }
}

async function loadTaskDetail(id) {
  try {
    const task = await apiFetch(`/tasks/${id}`);
    const card = document.querySelector(`.task-card[data-id="${id}"]`);
    if (!card) return;

    const resultEl = card.querySelector('.task-result');
    if (!resultEl && task.result) {
      card.insertAdjacentHTML('beforeend', `
        <div class="task-result">${escapeHtml(task.result)}</div>
        <button class="task-result-toggle">▼ Show more</button>
      `);
      card.querySelector('.task-result-toggle').addEventListener('click', e => {
        e.stopPropagation();
        const r = e.target.previousElementSibling;
        const exp = r.classList.toggle('expanded');
        e.target.textContent = exp ? '▲ Show less' : '▼ Show more';
      });
    }
  } catch {}
}

function buildTaskCard(task) {
  const icon       = TYPE_ICONS[task.type] || '📋';
  const statusKey  = (task.status === 'completed' ? 'done' : task.status) || 'pending';
  const statusCls  = `badge status-${statusKey}`;
  const prompt     = task.prompt || task.description || '';
  const title      = task.title || prompt.slice(0, 60) || 'Untitled task';
  const tokens     = task.tokens_used ? `${formatTokens(task.tokens_used)} tokens` : '';
  const created    = task.created_at ? timeAgo(task.created_at) : '';
  const hasResult  = task.result || task.error;

  return `
    <div class="task-card" data-id="${task.id}">
      <div class="task-header">
        <span class="task-type-icon">${icon}</span>
        <span class="task-title">${escapeHtml(title)}</span>
        <span class="${statusCls} badge">${statusKey}</span>
      </div>
      ${prompt ? `<div class="task-body">${escapeHtml(prompt)}</div>` : ''}
      <div class="task-meta">
        ${created ? `<span>🕐 ${created}</span>` : ''}
        ${tokens  ? `<span>🔤 ${tokens}</span>`  : ''}
        ${task.type ? `<span style="text-transform:capitalize">${task.type}</span>` : ''}
      </div>
      ${hasResult ? `
        <div class="task-result">${escapeHtml(task.result || task.error || '')}</div>
        <button class="task-result-toggle">▼ Show more</button>
      ` : ''}
    </div>`;
}

async function submitTask(e) {
  e.preventDefault();
  const btn    = document.getElementById('task-submit-btn');
  const title  = document.getElementById('task-title').value.trim();
  const type   = document.getElementById('task-type').value;
  const prompt = document.getElementById('task-prompt').value.trim();
  if (!prompt) return;

  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    await apiFetch('/tasks', { method: 'POST', body: JSON.stringify({ title, type, prompt }) });
    document.getElementById('task-title').value = '';
    document.getElementById('task-prompt').value = '';
    showToast('Task submitted!', 'success');
    await loadTasks();
    startPolling();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Submit Task';
  }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    if (!document.getElementById('tasks-grid')) { stopPolling(); return; }
    loadTasks();
  }, 5000);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
