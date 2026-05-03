import { showToast } from '../utils/toast.js';

const MODELS = [
  { id: 'claude-sonnet-4',   name: 'Claude Sonnet 4',   provider: 'Anthropic', icon: '🟣', speed: 4, intel: 4, cost: '1x',    ctx: '200K', tier: 'free',    desc: 'Best balance of speed, intelligence, and cost. Ideal for most tasks.',           default: true },
  { id: 'claude-haiku-4',    name: 'Claude Haiku 4',    provider: 'Anthropic', icon: '⚡', speed: 5, intel: 3, cost: '0.25x',  ctx: '200K', tier: 'free',    desc: 'Ultra-fast responses for simple tasks, summaries, and quick answers.' },
  { id: 'claude-opus-4',     name: 'Claude Opus 4',     provider: 'Anthropic', icon: '💎', speed: 3, intel: 5, cost: '5x',     ctx: '200K', tier: 'pro',     desc: 'Maximum intelligence for complex reasoning, research, and analysis.' },
  { id: 'gpt-4o',            name: 'GPT-4o',            provider: 'OpenAI',    icon: '🟢', speed: 4, intel: 4, cost: '1.5x',   ctx: '128K', tier: 'starter', desc: 'OpenAI flagship model with strong multimodal capabilities.' },
  { id: 'gpt-4o-mini',       name: 'GPT-4o Mini',       provider: 'OpenAI',    icon: '🟡', speed: 5, intel: 3, cost: '0.15x',  ctx: '128K', tier: 'free',    desc: 'Lightweight and affordable for everyday tasks and quick queries.' },
  { id: 'gemini-2.5-pro',    name: 'Gemini 2.5 Pro',    provider: 'Google',    icon: '🔵', speed: 4, intel: 4, cost: '1.2x',   ctx: '1M',   tier: 'starter', desc: 'Massive 1M context window — perfect for long documents and codebases.' },
  { id: 'llama-4-maverick',  name: 'Llama 4 Maverick',  provider: 'Meta',      icon: '🦙', speed: 4, intel: 4, cost: '0.5x',   ctx: '128K', tier: 'free',    desc: 'Open-weight powerhouse with excellent cost efficiency.' },
  { id: 'deepseek-r1',       name: 'DeepSeek R1',       provider: 'DeepSeek',  icon: '🧠', speed: 3, intel: 5, cost: '0.8x',   ctx: '128K', tier: 'starter', desc: 'Deep reasoning specialist — excels at math, logic, and code.' },
];

const SPEED_LABELS = { 3: 'Moderate', 4: 'Fast', 5: 'Very Fast' };
const INTEL_LABELS = { 3: 'Good', 4: 'High', 5: 'Highest' };
const LS_KEY = 'borjax_model';

function getSelectedModel() {
  return localStorage.getItem(LS_KEY) || 'claude-sonnet-4';
}

function renderBar(value, max = 5, color) {
  const pct = (value / max) * 100;
  return `<div class="meter-bar"><div class="meter-fill" style="width:${pct}%;background:${color}"></div></div>`;
}

function tierBadge(tier) {
  const labels = { free: 'Free', starter: 'Starter', pro: 'Pro' };
  return `<span class="badge badge-${tier}">${labels[tier] || tier}</span>`;
}

function costColor(cost) {
  const n = parseFloat(cost);
  if (n <= 0.25) return 'var(--green)';
  if (n <= 1)    return 'var(--blue)';
  if (n <= 2)    return 'var(--yellow)';
  return 'var(--red)';
}

export async function initModels(container) {
  const selected = getSelectedModel();
  const activeModel = MODELS.find(m => m.id === selected) || MODELS[0];
  const userTier = 'free'; // TODO: pull from user profile

  container.innerHTML = `
    <div class="models-page">
      <!-- Header -->
      <div class="models-header">
        <h2>AI Models</h2>
        <p class="muted-text">Choose the best model for your needs</p>
      </div>

      <!-- Active Model Card -->
      <div class="active-model-banner">
        <div class="active-model-icon">${activeModel.icon}</div>
        <div class="active-model-info">
          <div class="active-model-label">Currently Active</div>
          <div class="active-model-name">${activeModel.name}</div>
          <div class="active-model-meta">${activeModel.provider} · ${activeModel.ctx} context · ${activeModel.cost} cost</div>
        </div>
      </div>

      <!-- Model Grid -->
      <div class="model-grid" id="model-grid">
        ${MODELS.map(m => {
          const isActive = m.id === selected;
          const tierOrder = { free: 0, starter: 1, pro: 2 };
          const userTierLevel = tierOrder[userTier] || 0;
          const modelTierLevel = tierOrder[m.tier] || 0;
          const locked = modelTierLevel > userTierLevel;

          return `
          <div class="model-card${isActive ? ' active' : ''}${locked ? ' locked' : ''}" data-model="${m.id}">
            <div class="model-card-top">
              <span class="model-icon">${m.icon}</span>
              <div class="model-card-badges">
                ${m.default ? '<span class="badge badge-default">Default</span>' : ''}
                ${tierBadge(m.tier)}
              </div>
            </div>
            <div class="model-name">${m.name}</div>
            <div class="model-provider">${m.provider}</div>
            <div class="model-desc">${m.desc}</div>

            <div class="model-stats">
              <div class="model-stat-row">
                <span class="stat-label">Speed</span>
                ${renderBar(m.speed, 5, 'var(--cyan)')}
                <span class="stat-value">${SPEED_LABELS[m.speed] || m.speed}</span>
              </div>
              <div class="model-stat-row">
                <span class="stat-label">Intelligence</span>
                ${renderBar(m.intel, 5, 'var(--purple)')}
                <span class="stat-value">${INTEL_LABELS[m.intel] || m.intel}</span>
              </div>
            </div>

            <div class="model-meta-row">
              <span class="cost-badge" style="color:${costColor(m.cost)}">${m.cost} cost</span>
              <span class="ctx-badge">${m.ctx} ctx</span>
            </div>

            <button class="btn-primary btn-full btn-sm model-select-btn" data-model="${m.id}"
              ${locked ? 'disabled' : ''}>
              ${isActive ? '✓ Active' : locked ? '🔒 Upgrade to unlock' : 'Select Model'}
            </button>
          </div>`;
        }).join('')}
      </div>

      <!-- Comparison Table -->
      <div class="models-comparison">
        <h3>Model Comparison</h3>
        <div class="comparison-table-wrap">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Provider</th>
                <th>Speed</th>
                <th>Intelligence</th>
                <th>Cost</th>
                <th>Context</th>
                <th>Tier</th>
              </tr>
            </thead>
            <tbody>
              ${MODELS.map(m => `
                <tr class="${m.id === selected ? 'row-active' : ''}">
                  <td><span class="table-model-name">${m.icon} ${m.name}</span></td>
                  <td>${m.provider}</td>
                  <td>${SPEED_LABELS[m.speed] || m.speed}</td>
                  <td>${INTEL_LABELS[m.intel] || m.intel}</td>
                  <td><span style="color:${costColor(m.cost)};font-weight:600">${m.cost}</span></td>
                  <td class="font-mono">${m.ctx}</td>
                  <td>${tierBadge(m.tier)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Event: select model
  container.querySelectorAll('.model-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modelId = btn.dataset.model;
      if (btn.disabled) return;
      const model = MODELS.find(m => m.id === modelId);
      if (!model) return;

      localStorage.setItem(LS_KEY, modelId);
      showToast(`Switched to ${model.name}`, 'success');
      initModels(container); // Re-render
    });
  });
}
