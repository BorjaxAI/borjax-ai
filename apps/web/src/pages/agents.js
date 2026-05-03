import { apiFetch } from '../api/client.js';
import { showToast } from '../utils/toast.js';

const TEMPLATES = [
  {
    id: 'research',
    icon: '🔍',
    name: 'Research Pro',
    desc: 'Web-search specialist — finds, summarizes, and synthesizes information.',
    role: 'Senior Research Analyst',
    instructions: 'You are an expert research analyst. Search the web, gather information from multiple sources, verify facts, and produce concise, well-cited summaries. Always indicate your confidence level and note any conflicting information.',
    tools: ['web_search', 'text_analysis'],
    model: 'claude-3-5-haiku-20241022',
  },
  {
    id: 'writer',
    icon: '✍️',
    name: 'Content Writer',
    desc: 'Writes blogs, emails, copy, and marketing content.',
    role: 'Senior Content Strategist',
    instructions: 'You are a skilled content writer specializing in compelling, SEO-friendly content. Write clearly, engagingly, and adapt tone to the audience. Always ask for target audience and tone if not specified.',
    tools: ['text_analysis'],
    model: 'claude-3-5-sonnet-20241022',
  },
  {
    id: 'analyst',
    icon: '📊',
    name: 'Data Analyst',
    desc: 'Analyzes data, finds patterns, and creates reports.',
    role: 'Senior Data Analyst',
    instructions: 'You are a data analyst expert. When given data, identify trends, anomalies, and insights. Present findings clearly with charts descriptions, tables, and actionable recommendations.',
    tools: ['text_analysis', 'code_execution'],
    model: 'claude-3-5-haiku-20241022',
  },
];

const TOOLS_LIST = [
  { id: 'web_search',     label: '🌐 Web Search' },
  { id: 'text_analysis',  label: '📝 Text Analysis' },
  { id: 'code_execution', label: '💻 Code Execution' },
  { id: 'file_reader',    label: '📁 File Reader' },
  { id: 'calculator',     label: '🔢 Calculator' },
];

const MODELS = [
  { id: 'claude-3-5-haiku-20241022',  label: 'Claude 3.5 Haiku (fast)' },
  { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (smart)' },
  { id: 'claude-3-opus-20240229',     label: 'Claude 3 Opus (best)' },
];

let agents = [];

export async function initAgents(container) {
  container.innerHTML = `
    <div class="agents-page">
      <!-- Header -->
      <div class="agents-top">
        <div>
          <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--fg-dim);margin-bottom:0.25rem">Templates</div>
          <div class="templates-grid" id="templates-grid">
            ${TEMPLATES.map(t => `
              <div class="template-card" data-tpl="${t.id}">
                <div class="template-icon">${t.icon}</div>
                <div class="template-name">${t.name}</div>
                <div class="template-desc">${t.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Builder form -->
      <div class="agent-builder" id="agent-builder">
        <h3 id="builder-title">🤖 New Agent</h3>
        <form id="agent-form">
          <input type="hidden" id="agent-id"/>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label">Agent Name</label>
              <input type="text" id="agent-name" placeholder="e.g. Research Pro" required/>
            </div>
            <div class="form-group">
              <label class="form-label">Role</label>
              <input type="text" id="agent-role" placeholder="e.g. Senior Analyst" required/>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Instructions</label>
            <textarea id="agent-instructions" placeholder="Describe what this agent does, its personality, and how it should respond…" style="min-height:100px" required></textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label">Model</label>
              <select id="agent-model">
                ${MODELS.map(m => `<option value="${m.id}">${m.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Tools</label>
            <div class="tools-grid">
              ${TOOLS_LIST.map(t => `
                <label class="tool-checkbox-label">
                  <input type="checkbox" value="${t.id}" name="tools"/>
                  ${t.label}
                </label>
              `).join('')}
            </div>
          </div>
          <div style="display:flex;gap:0.75rem">
            <button type="submit" class="btn-primary" id="agent-save-btn">Create Agent</button>
            <button type="button" class="btn-ghost" id="agent-reset-btn">Reset</button>
          </div>
        </form>
      </div>

      <!-- Agent library -->
      <div>
        <div class="section-header">
          <span class="section-title">Your Agents</span>
          <button class="btn-secondary btn-sm" id="refresh-agents-btn">↻ Refresh</button>
        </div>
        <div class="agents-grid" id="agents-grid">
          ${skeleton(3)}
        </div>
      </div>
    </div>
  `;

  // Wire templates
  document.getElementById('templates-grid').addEventListener('click', e => {
    const card = e.target.closest('.template-card');
    if (!card) return;
    const tpl = TEMPLATES.find(t => t.id === card.dataset.tpl);
    if (tpl) fillForm(null, tpl);
  });

  // Wire form
  document.getElementById('agent-form').addEventListener('submit', saveAgent);
  document.getElementById('agent-reset-btn').addEventListener('click', () => resetForm());
  document.getElementById('refresh-agents-btn').addEventListener('click', loadAgents);

  await loadAgents();
}

function skeleton(n) {
  return Array.from({length: n}, () =>
    '<div class="skeleton" style="height:160px;border-radius:12px"></div>'
  ).join('');
}

async function loadAgents() {
  const grid = document.getElementById('agents-grid');
  if (!grid) return;
  try {
    agents = await apiFetch('/agents');
    if (!agents?.length) {
      grid.innerHTML = `
        <div class="empty-state" style="padding:2rem;grid-column:1/-1">
          <div class="empty-icon">🤖</div>
          <h3>No agents yet</h3>
          <p>Fill the form above or pick a template to create your first agent.</p>
        </div>`;
      return;
    }
    grid.innerHTML = agents.map(a => buildAgentCard(a)).join('');
    wireAgentCards();
  } catch (err) {
    grid.innerHTML = `<p class="muted-text" style="padding:1rem">Failed to load agents: ${err.message}</p>`;
  }
}

function buildAgentCard(a) {
  const tools = Array.isArray(a.tools) ? a.tools : [];
  return `
    <div class="agent-card" data-id="${a.id}">
      <div class="agent-card-header">
        <div>
          <div class="agent-name">${escHtml(a.name)}</div>
          <div class="agent-role">${escHtml(a.role || '')}</div>
        </div>
        <div class="agent-avatar">🤖</div>
      </div>
      <div class="agent-desc">${escHtml(a.instructions || a.backstory || a.goal || '')}</div>
      ${tools.length ? `<div class="tool-badges">${tools.map(t => `<span class="tool-badge">${t}</span>`).join('')}</div>` : ''}
      <div class="agent-card-actions">
        <button class="btn-primary btn-sm agent-run-btn" data-id="${a.id}">▶ Run</button>
        <button class="btn-ghost btn-sm agent-edit-btn" data-id="${a.id}">Edit</button>
        <button class="btn-danger btn-sm agent-del-btn" data-id="${a.id}">Delete</button>
      </div>
    </div>`;
}

function wireAgentCards() {
  document.querySelectorAll('.agent-run-btn').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); openRunModal(btn.dataset.id); })
  );
  document.querySelectorAll('.agent-edit-btn').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const a = agents.find(x => x.id === btn.dataset.id);
      if (a) fillForm(a, null);
    })
  );
  document.querySelectorAll('.agent-del-btn').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); deleteAgent(btn.dataset.id); })
  );
}

function fillForm(agent, tpl) {
  const src = agent || tpl;
  document.getElementById('agent-id').value          = agent?.id || '';
  document.getElementById('agent-name').value        = src.name || '';
  document.getElementById('agent-role').value        = src.role || '';
  document.getElementById('agent-instructions').value= src.instructions || src.backstory || src.goal || '';
  document.getElementById('agent-model').value       = src.model || 'claude-3-5-haiku-20241022';
  const tools = src.tools || [];
  document.querySelectorAll('input[name="tools"]').forEach(cb => {
    cb.checked = tools.includes(cb.value);
  });
  document.getElementById('builder-title').textContent = agent ? `✏️ Edit: ${agent.name}` : '🤖 New Agent';
  document.getElementById('agent-save-btn').textContent = agent ? 'Save Changes' : 'Create Agent';
  document.getElementById('agent-builder').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
  document.getElementById('agent-id').value = '';
  document.getElementById('agent-form').reset();
  document.getElementById('builder-title').textContent = '🤖 New Agent';
  document.getElementById('agent-save-btn').textContent = 'Create Agent';
}

async function saveAgent(e) {
  e.preventDefault();
  const btn   = document.getElementById('agent-save-btn');
  const id    = document.getElementById('agent-id').value;
  const tools = [...document.querySelectorAll('input[name="tools"]:checked')].map(cb => cb.value);

  const payload = {
    name:         document.getElementById('agent-name').value.trim(),
    role:         document.getElementById('agent-role').value.trim(),
    instructions: document.getElementById('agent-instructions').value.trim(),
    model:        document.getElementById('agent-model').value,
    tools,
    // legacy fields
    goal:         document.getElementById('agent-instructions').value.trim(),
    backstory:    '',
  };

  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    if (id) {
      await apiFetch(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Agent updated!', 'success');
    } else {
      await apiFetch('/agents', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Agent created!', 'success');
    }
    resetForm();
    await loadAgents();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = id ? 'Save Changes' : 'Create Agent';
  }
}

async function deleteAgent(id) {
  if (!confirm('Delete this agent?')) return;
  try {
    await apiFetch(`/agents/${id}`, { method: 'DELETE' });
    showToast('Agent deleted', 'info');
    await loadAgents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openRunModal(agentId) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">▶ Run: ${escHtml(agent.name)}</span>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Task Prompt</label>
        <textarea id="run-prompt" placeholder="What do you want this agent to do?" style="min-height:100px"></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" id="modal-run-btn">Submit Task ↗</button>
        <button class="btn-ghost" id="modal-cancel-btn">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#modal-run-btn').addEventListener('click', async () => {
    const prompt = overlay.querySelector('#run-prompt').value.trim();
    if (!prompt) { showToast('Enter a prompt', 'warning'); return; }
    const btn = overlay.querySelector('#modal-run-btn');
    btn.disabled = true; btn.textContent = 'Submitting…';
    try {
      const data = await apiFetch(`/agents/${agentId}/run`, {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      showToast('Task submitted! Check the Tasks page.', 'success');
      overlay.remove();
      // redirect to tasks
      location.hash = '#/tasks';
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Submit Task ↗';
    }
  });
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
