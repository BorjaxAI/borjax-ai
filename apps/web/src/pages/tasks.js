import { api } from '../api/client.js';
import { renderTaskCard } from '../components/task-card.js';

let pollInterval = null;
let selectedTask = null;

export function renderTasks(container) {
  container.innerHTML = `
    <div class="tasks-layout">
      <div class="page-header">
        <div>
          <div class="page-title">Background Tasks</div>
          <div class="page-subtitle">Submit long-running AI tasks and track results</div>
        </div>
        <button class="btn btn-secondary btn-sm" id="refresh-tasks-btn">↻ Refresh</button>
      </div>
      <div class="tasks-body">
        <div class="task-form-panel">
          <h3 style="font-size:.95rem; font-weight:700; margin-bottom:1.25rem;">New Task</h3>
          <form id="task-form">
            <div class="form-group">
              <label class="form-label">Task Type</label>
              <select class="select" id="task-type" required>
                <option value="research">🔍 Research</option>
                <option value="write">✍️ Write</option>
                <option value="analyze">📊 Analyze</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Prompt</label>
              <textarea class="textarea" id="task-prompt" placeholder="Describe what you want the AI to do..." required style="min-height:140px;"></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-full" id="submit-task-btn">Submit Task</button>
          </form>

          <div id="task-result-panel" style="margin-top:1.5rem; display:none;">
            <h3 style="font-size:.95rem; font-weight:700; margin-bottom:.75rem;">Task Result</h3>
            <div id="task-result-content" style="background:var(--bg-alt); border:1px solid var(--border); border-radius:8px; padding:1rem; font-size:.85rem; line-height:1.7; max-height:400px; overflow-y:auto; white-space:pre-wrap; color:var(--fg-dim);"></div>
          </div>
        </div>

        <div class="tasks-list-panel">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
            <h3 style="font-size:.95rem; font-weight:700;">Recent Tasks</h3>
            <select class="select" id="status-filter" style="width:auto;">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div id="tasks-list">
            <div class="text-center text-dim text-small" style="padding:2rem;">Loading tasks...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  loadTasks();
  startPolling();

  document.getElementById('task-form').addEventListener('submit', submitTask);
  document.getElementById('refresh-tasks-btn').addEventListener('click', loadTasks);
  document.getElementById('status-filter').addEventListener('change', loadTasks);
}

async function loadTasks() {
  const list = document.getElementById('tasks-list');
  if (!list) return;
  const status = document.getElementById('status-filter')?.value || '';
  const url = '/tasks?limit=30' + (status ? '&status=' + status : '');
  try {
    const data = await api.get(url);
    const tasks = data.tasks || data;
    if (!tasks.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚡</div><h3>No tasks yet</h3><p>Submit a task using the form on the left.</p></div>';
      return;
    }
    list.innerHTML = '';
    tasks.forEach(task => {
      const card = renderTaskCard(task, (t) => showTaskResult(t));
      list.appendChild(card);
    });
  } catch (err) {
    list.innerHTML = '<div class="text-center text-dim text-small" style="padding:2rem;">Failed to load tasks</div>';
  }
}

async function showTaskResult(task) {
  const panel = document.getElementById('task-result-panel');
  const content = document.getElementById('task-result-content');
  if (!panel || !content) return;

  try {
    const full = await api.get('/tasks/' + task.id);
    panel.style.display = 'block';
    if (full.result) {
      content.textContent = full.result;
    } else if (full.error) {
      content.textContent = 'Error: ' + full.error;
      content.style.color = 'var(--red)';
    } else {
      content.textContent = 'Status: ' + full.status + '...';
    }
  } catch (err) {
    panel.style.display = 'block';
    content.textContent = 'Failed to load result';
  }
}

async function submitTask(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-task-btn');
  const type = document.getElementById('task-type').value;
  const prompt = document.getElementById('task-prompt').value.trim();
  if (!prompt) return;

  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const task = await api.post('/tasks', { type, prompt });
    btn.disabled = false;
    btn.textContent = 'Submit Task';
    document.getElementById('task-prompt').value = '';
    await loadTasks();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Submit Task';
    alert('Failed to submit task: ' + err.message);
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => {
    const list = document.getElementById('tasks-list');
    if (!list) { clearInterval(pollInterval); return; }
    loadTasks();
  }, 5000);
}

export function cleanupTasks() {
  if (pollInterval) clearInterval(pollInterval);
}
