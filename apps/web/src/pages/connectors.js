import { showToast } from '../utils/toast.js';

const CONNECTORS = [
  // Communication
  { id: "slack", name: "Slack", category: "Communication", icon: "💬", color: "#4A154B",
    description: "Send messages, read channels, search conversations",
    actions: ["Send message", "Read channel", "Search messages", "Create channel"],
    tier: "starter" },
  { id: "gmail", name: "Gmail", category: "Communication", icon: "📧", color: "#EA4335",
    description: "Read emails, send emails, search inbox, manage labels",
    actions: ["Send email", "Read inbox", "Search emails", "Create draft"],
    tier: "starter" },
  { id: "discord", name: "Discord", category: "Communication", icon: "🎮", color: "#5865F2",
    description: "Post messages, manage channels, read conversations",
    actions: ["Send message", "Read channel", "Create thread"],
    tier: "starter" },
  { id: "telegram", name: "Telegram", category: "Communication", icon: "✈️", color: "#0088CC",
    description: "Send messages to channels or contacts",
    actions: ["Send message", "Read updates"],
    tier: "free" },
  { id: "whatsapp", name: "WhatsApp", category: "Communication", icon: "📱", color: "#25D366",
    description: "Send and receive WhatsApp messages via Business API",
    actions: ["Send message", "Send template", "Read messages"],
    tier: "pro" },

  // Productivity
  { id: "notion", name: "Notion", category: "Productivity", icon: "📝", color: "#000000",
    description: "Create pages, update databases, search content",
    actions: ["Create page", "Update database", "Search", "Read page"],
    tier: "starter" },
  { id: "google-docs", name: "Google Docs", category: "Productivity", icon: "📄", color: "#4285F4",
    description: "Create and edit documents, read content",
    actions: ["Create doc", "Edit doc", "Read doc", "Share doc"],
    tier: "starter" },
  { id: "google-sheets", name: "Google Sheets", category: "Productivity", icon: "📊", color: "#0F9D58",
    description: "Read data, write rows, create sheets",
    actions: ["Read sheet", "Write rows", "Create sheet", "Update cells"],
    tier: "starter" },
  { id: "trello", name: "Trello", category: "Productivity", icon: "📋", color: "#0052CC",
    description: "Create cards, move between lists, manage boards",
    actions: ["Create card", "Move card", "Add comment", "List cards"],
    tier: "free" },
  { id: "airtable", name: "Airtable", category: "Productivity", icon: "🗃️", color: "#18BFFF",
    description: "Read records, create entries, update tables",
    actions: ["Read records", "Create record", "Update record", "Search"],
    tier: "starter" },

  // Storage
  { id: "google-drive", name: "Google Drive", category: "Storage", icon: "📁", color: "#4285F4",
    description: "Upload files, search documents, share links",
    actions: ["Upload file", "Search files", "Share link", "Create folder"],
    tier: "starter" },
  { id: "dropbox", name: "Dropbox", category: "Storage", icon: "📦", color: "#0061FF",
    description: "Upload and download files, share folders",
    actions: ["Upload", "Download", "Share", "Search"],
    tier: "starter" },

  // Development
  { id: "github", name: "GitHub", category: "Development", icon: "🐙", color: "#6e7681",
    description: "Create issues, read repos, manage PRs",
    actions: ["Create issue", "Read repo", "List PRs", "Create PR comment"],
    tier: "free" },
  { id: "linear", name: "Linear", category: "Development", icon: "🔷", color: "#5E6AD2",
    description: "Create issues, track projects, manage sprints",
    actions: ["Create issue", "Update status", "List issues", "Search"],
    tier: "starter" },

  // CRM & Marketing
  { id: "hubspot", name: "HubSpot", category: "CRM", icon: "🟠", color: "#FF7A59",
    description: "Manage contacts, create deals, track pipeline",
    actions: ["Create contact", "Create deal", "Search contacts", "Log activity"],
    tier: "pro" },
  { id: "mailchimp", name: "Mailchimp", category: "Marketing", icon: "🐒", color: "#FFE01B",
    description: "Manage email campaigns, add subscribers",
    actions: ["Add subscriber", "Create campaign", "List audiences", "Send campaign"],
    tier: "starter" },

  // Automation
  { id: "zapier", name: "Zapier", category: "Automation", icon: "⚡", color: "#FF4A00",
    description: "Trigger Zaps, connect to 6,000+ apps",
    actions: ["Trigger webhook", "Send data"],
    tier: "starter" },
  { id: "make", name: "Make (Integromat)", category: "Automation", icon: "🔄", color: "#6D00CC",
    description: "Trigger scenarios, send data to workflows",
    actions: ["Trigger webhook", "Send data"],
    tier: "starter" },
  { id: "webhooks", name: "Custom Webhooks", category: "Automation", icon: "🔗", color: "#7aa2f7",
    description: "Send data to any URL when tasks complete",
    actions: ["POST webhook", "Custom headers"],
    tier: "free" },
];

const CATEGORIES = ["All", "Communication", "Productivity", "Storage", "Development", "CRM", "Marketing", "Automation"];

function getConnectedIds() {
  try {
    return JSON.parse(localStorage.getItem('borjax_connectors') || '[]');
  } catch { return []; }
}

function setConnectedIds(ids) {
  localStorage.setItem('borjax_connectors', JSON.stringify(ids));
}

function canAccess(tier) {
  const tiers = ['free', 'starter', 'pro', 'agency'];
  try {
    const u = JSON.parse(localStorage.getItem('borjax_user') || '{}');
    const userPlan = u.plan || 'free';
    return tiers.indexOf(userPlan) >= tiers.indexOf(tier);
  } catch { return false; }
}

function tierBadgeClass(tier) {
  return `badge badge-${tier}`;
}

export async function initConnectors(container) {
  let activeCategory = 'All';
  let searchQuery = '';

  function render() {
    const connectedIds = getConnectedIds();
    const connected = CONNECTORS.filter(c => connectedIds.includes(c.id));

    let filtered = CONNECTORS;
    if (activeCategory !== 'All') {
      filtered = filtered.filter(c => c.category === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }

    container.innerHTML = `
      <div class="connectors-page">
        <!-- Header -->
        <div class="connectors-header">
          <div>
            <h2 style="font-size:1.15rem;font-weight:800;margin-bottom:0.25rem">🔌 Connectors</h2>
            <p style="font-size:0.875rem;color:var(--fg-dim)">Connect your favorite tools to BorjaxAI</p>
          </div>
          <div class="connector-search-wrap">
            <span class="search-icon">🔍</span>
            <input type="text" class="connector-search" id="connector-search" placeholder="Search connectors…" value="${searchQuery}"/>
          </div>
        </div>

        <!-- Category tabs -->
        <div class="category-tabs" id="category-tabs">
          ${CATEGORIES.map(cat => `
            <button class="tab-btn ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">${cat}</button>
          `).join('')}
        </div>

        ${connected.length ? `
          <!-- Connected connectors -->
          <div>
            <div class="section-header"><span class="section-title">Connected (${connected.length})</span></div>
            <div class="connector-grid">
              ${connected.map(c => buildConnectorCard(c, true)).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Callout -->
        <div class="connector-callout">
          <span class="connector-callout-icon">🤖</span>
          <span>Connected services become available as tools in the <strong>Agent Builder</strong>. Build agents that send Slack messages, create Notion pages, or update spreadsheets.</span>
        </div>

        <!-- All connectors -->
        <div>
          <div class="section-header"><span class="section-title">${activeCategory === 'All' ? 'All Connectors' : activeCategory} (${filtered.length})</span></div>
          ${filtered.length ? `
            <div class="connector-grid" id="connector-grid">
              ${filtered.map(c => buildConnectorCard(c, connectedIds.includes(c.id))).join('')}
            </div>
          ` : `
            <div class="empty-state" style="padding:2rem">
              <div class="empty-icon">🔍</div>
              <h3>No connectors found</h3>
              <p>Try a different search or category.</p>
            </div>
          `}
        </div>

        <!-- Request a connector -->
        <div class="connector-request">
          <span>Don't see what you need?</span>
          <a href="https://github.com/borjax/borjax-ai/issues/new?title=Connector+Request:&labels=connector-request" target="_blank" rel="noopener">Request a Connector →</a>
        </div>
      </div>
    `;

    wireEvents();
  }

  function wireEvents() {
    // Category tabs
    container.querySelectorAll('#category-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        render();
      });
    });

    // Search
    const searchEl = container.querySelector('#connector-search');
    if (searchEl) {
      searchEl.addEventListener('input', e => {
        searchQuery = e.target.value;
        render();
        // Re-focus after render
        const newSearch = container.querySelector('#connector-search');
        if (newSearch) { newSearch.focus(); newSearch.selectionStart = newSearch.selectionEnd = newSearch.value.length; }
      });
    }

    // Connect / Disconnect buttons
    container.querySelectorAll('.connector-connect-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const connector = CONNECTORS.find(c => c.id === id);
        if (!connector) return;

        if (!canAccess(connector.tier)) {
          showToast(`Upgrade to ${connector.tier} plan to connect ${connector.name}`, 'warning');
          return;
        }

        showToast(`${connector.name} — Coming Soon! OAuth integration will be available shortly.`, 'info');
      });
    });

    container.querySelectorAll('.connector-disconnect-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const connector = CONNECTORS.find(c => c.id === id);
        const ids = getConnectedIds().filter(x => x !== id);
        setConnectedIds(ids);
        showToast(`Disconnected ${connector?.name || id}`, 'info');
        render();
      });
    });
  }

  render();
}

function buildConnectorCard(c, isConnected) {
  const locked = !canAccess(c.tier);

  return `
    <div class="connector-card ${locked ? 'locked' : ''} ${isConnected ? 'connected' : ''}" style="--connector-color:${c.color}">
      <div class="connector-color-stripe" style="background:${c.color}"></div>
      <div class="connector-card-body">
        <div class="connector-card-top">
          <span class="connector-icon">${c.icon}</span>
          <div>
            <div class="connector-name">${c.name}</div>
            <div class="connector-category">${c.category}</div>
          </div>
          <div class="connector-status-area">
            ${isConnected
              ? '<span class="connector-status connected">✓ Connected</span>'
              : '<span class="connector-status not-connected">Not connected</span>'
            }
            <span class="${tierBadgeClass(c.tier)}">${c.tier}</span>
          </div>
        </div>
        <div class="connector-desc">${c.description}</div>
        <div class="connector-actions">
          ${c.actions.map(a => `<span class="connector-action-pill">${a}</span>`).join('')}
        </div>
        <div class="connector-card-footer">
          ${isConnected
            ? `<button class="btn-ghost btn-sm connector-disconnect-btn" data-id="${c.id}">Disconnect</button>`
            : locked
              ? `<button class="btn-secondary btn-sm connector-connect-btn" data-id="${c.id}">🔒 Upgrade to connect</button>`
              : `<button class="btn-primary btn-sm connector-connect-btn" data-id="${c.id}">Connect</button>`
          }
        </div>
      </div>
    </div>`;
}

