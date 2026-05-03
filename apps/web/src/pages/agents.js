import { api } from '../api/client.js';
import { renderAgentCard } from '../components/agent-card.js';

let selectedAgent = null;
let agents = [];

export function renderAgents(container) {
  container.innerHTML = `
    <div class="agents-layout">
      <div class="agents-sidebar">
        <div class="agents-sidebar-header">
          <span style="font-size:.875rem; font-weight:700;">My Agents</span>
          <button class="btn btn-primary btn-sm" id="new-agent-btn">+ New</button>
        </div>
        <div class="agents-list" id="agents-list">
          <div class="text-center text-dim text-small" style="padding:1rem;">Loading...</div>
        </div>
      </div>
      <div class="agents-main" id="agents-main">
        <div class="empty-state">
          <div class="empty-state-icon">🤖</div>
          <h3>Select or create an agent</h3>
          <p>Build custom AI agents with specific roles, goals, and tools.</p>
        </div>
      </div>
    </div>
  `;

  loadAgents();
  document.getElementById('new-agent-btn').addEventListener('click', showNewAgentForm);
}

async function loadAgents() {
  const list = document.getElementById('agents-list');
  if (!list) return;
  try {
    agents = await api.get('/agents');
    if (!agents.length) {
      list.innerHTML = '<div class="text-center text-dim text-small" style="padding:1rem;">No agents yet</div>';
      return;
    }
    list.innerHTML = '';
    agents.forEach(agent => {
      const card = renderAgentCard(agent, (a) => showAgentDetail(a));
      list.appendChild(card);
    });
  } catch {
    list.innerHTML = '<div class="text-center text-dim text-small" style="padding:1rem;">Failed to load</div>';
  }
}

function showNewAgentForm() {
  selectedAgent = null;
  document.querySelectorAll('.agent-list-item').forEach(i => i.classList.remove('active'));
  renderAgentForm(null);
}

function showAgentDetail(agent) {
  selectedAgent = agent;
  document.querySelectorAll('.agent-list-item').forEach(i => {
    i.classList.toggle('active', i.dataset.agentId === agent.id);
  });
  renderAgentForm(agent);
}

function renderAgentForm(agent) {
  const main = document.getElementById('agents-main');
  if (!main) return;

  const isEdit = !!agent;
  const tools = ['web_search', 'text_analysis', 'code_execution', 'file_reader'];

  main.innerHTML = `
    <div style="max-width:700px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2rem;">
        <h2 style="font-size:1.2rem; font-weight:800;">${isEdit ? 'Edit Agent' : 'New Agent'}</h2>
        ${isEdit ? `
          <div style="display:flex; gap:.5rem;">
            <button class="btn btn-secondary btn-sm" id="run-agent-btn">▶ Run Agent</button>
            <button class="btn btn-danger btn-sm" id="delete-agent-btn">Delete</button>
          </div>
        ` : ''}
      </div>

      <form id="agent-form">
        <div class="agent-form-section">
          <h3>Identity</h3>
          <div class="form-group">
            <label class="form-label">Name</label>
            <input type="text" class="input" id="agent-name" value="${agent?.name || ''}" placeholder="e.g. Research Analyst" required />
          </div>
          <div class="form-group">
            <label class="form-label">Role</label>
            <input type="text" class="input" id="agent-role" value="${agent?.role || ''}" placeholder="e.g. Senior Research Analyst" required />
          </div>
          <div class="form-group">
            <label class="form-label">Goal</label>
            <textarea class="textarea" id="agent-goal" placeholder="What should this agent accomplish?" required style="min-height:80px;">${agent?.goal || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Backstory</label>
            <textarea class="textarea" id="agent-backstory" placeholder="The agent's background and expertise..." required style="min-height:100px;">${agent?.backstory || ''}</textarea>
          </div>
        </div>

        <div class="agent-form-section">
          <h3>Tools</h3>
          <div style="display:flex; flex-wrap:wrap; gap:.5rem; margin-bottom:1rem;">
            ${tools.map(tool => `
              <label style="display:flex; align-items:center; gap:.4rem; cursor:pointer; padding:.4rem .75rem; border:1px solid var(--border); border-radius:6px; font-size:.85rem; transition:all .15s;">
                <input type="checkbox" value="${tool}" ${agent?.tools?.includes(tool) ? 'checked' : ''} style="accent-color:var(--blue);" />
                ${tool.replace(/_/g,' ')}
              </label>
            `).join('')}
          </div>
        </div>

        <div style="display:flex; gap:.75rem;">
          <button type="submit" class="btn btn-primary" id="save-agent-btn">
            ${isEdit ? 'Save Changes' : 'Create Agent'}
          </button>
          <button type="button" class="btn btn-ghost" id="cancel-agent-btn">Cancel</button>
        </div>
      </form>

      ${isEdit ? `
        <div style="margin-top:2rem; border-top:1px solid var(--border); padding-top:1.5rem;">
          <h3 style="font-size:.95rem; font-weight:700; margin-bottom:1rem;">Run Agent</h3>
          <div class="form-group">
            <label class="form-label">Task Prompt</label>
            <textarea class="textarea" id="run-prompt" placeholder="What do you want this agent to do?" style="min-height:80px;"></textarea>
          </div>
          <button class="btn btn-primary" id="run-agent-submit">▶ Run Now</button>
          <div id="run-result" style="margin-top:1rem; display:none; background:var(--bg-alt); border:1px solid var(--border); border-radius:8px; padding:1rem; font-size:.85rem; color:var(--fg-dim);"></div>
        </div>
      ` : ''}
    </div>
  `;

  document.getElementById('agent-form').addEventListener('submit', (e) => saveAgent(e, agent?.id));
  document.getElementById('cancel-agent-btn').addEventListener('click', () => {
    main.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🤖</div><h3>Select or create an agent</h3><p>Build custom AI agents with specific roles, goals, and tools.</p></div>';
  });

  if (isEdit) {
    document.getElementById('delete-agent-btn').addEventListener('click', () => deleteAgent(agent.id));
    document.getElementById('run-agent-submit').addEventListener('click', () => runAgent(agent.id));
  }
}

async function saveAgent(e, agentId) {
  e.preventDefault();
  const btn = document.getElementById('save-agent-btn');
  const tools = [...document.querySelectorAll('#agent-form input[type=checkbox]:checked')].map(cb => cb.value);

  const payload = {
    name: document.getElementById('agent-name').value,
    role: document.getElementById('agent-role').value,
    goal: document.getElementById('agent-goal').value,
    backstory: document.getElementById('agent-backstory').value,
    tools,
  };

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    if (agentId) {
      await api.put('/agents/' + agentId, payload);
    } else {
      await api.post('/agents', payload);
    }
    await loadAgents();
    btn.disabled = false;
    btn.textContent = agentId ? 'Save Changes' : 'Create Agent';
  } catch (err) {
    btn.disabled = false;
    btn.textContent = agentId ? 'Save Changes' : 'Create Agent';
    alert('Failed: ' + err.message);
  }
}

async function deleteAgent(agentId) {
  if (!confirm('Delete this agent?')) return;
  try {
    await api.delete('/agents/' + agentId);
    await loadAgents();
    document.getElementById('agents-main').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🤖</div><h3>Agent deleted</h3><p>Create or select another agent.</p></div>';
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}

async function runAgent(agentId) {
  const prompt = document.getElementById('run-prompt').value.trim();
  if (!prompt) { alert('Enter a prompt first'); return; }
  const btn = document.getElementById('run-agent-submit');
  const result = document.getElementById('run-result');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  result.style.display = 'none';

  try {
    const data = await api.post('/agents/' + agentId + '/run', { prompt });
    result.style.display = 'block';
    result.textContent = 'Task submitted! Task ID: ' + data.task_id + '\nPolling for results... check the Tasks page.';
    btn.disabled = false;
    btn.textContent = '▶ Run Now';
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '▶ Run Now';
    alert('Failed: ' + err.message);
  }
}
