import { apiFetch } from '../api/client.js';
import { showToast } from '../utils/toast.js';
import { formatTokens } from '../utils/tokens.js';
import { setUser, getUser } from '../utils/auth.js';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    tokens: '10,000 / mo',
    features: ['AI Chat', '5 background tasks/mo', '1 agent', 'Community support'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$9',
    period: '/mo',
    tokens: '100,000 / mo',
    features: ['Unlimited tasks', '10 agents', 'Email support', '90-day history'],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/mo',
    tokens: '500,000 / mo',
    features: ['Unlimited agents', 'Priority queue', 'Priority support 24h', 'Analytics'],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$99',
    period: '/mo',
    tokens: '2,000,000 / mo',
    features: ['10 team seats', 'Custom templates', 'Dedicated support', 'Custom integrations'],
  },
];

// Mock usage history
const MOCK_HISTORY = [
  { month: 'May 2026',   used: 0,       limit: 10000,  cost: '$0.00' },
  { month: 'Apr 2026',   used: 8200,    limit: 10000,  cost: '$0.00' },
  { month: 'Mar 2026',   used: 9750,    limit: 10000,  cost: '$0.00' },
  { month: 'Feb 2026',   used: 6400,    limit: 10000,  cost: '$0.00' },
];

export async function initBilling(container) {
  container.innerHTML = `<div class="billing-page"><div class="skeleton" style="height:120px;border-radius:12px"></div></div>`;

  let user;
  try {
    user = await apiFetch('/auth/me');
    // persist fresh user data
    const stored = getUser();
    if (stored) setUser({ ...stored, ...user });
  } catch {
    // fallback to stored user
    user = getUser() || { plan: 'free', tokens_used: 0, tokens_limit: 10000, email: '' };
  }

  const used  = user.tokens_used  || 0;
  const limit = user.tokens_limit || 10000;
  const pct   = Math.min((used / limit) * 100, 100);
  const plan  = user.plan || 'free';

  container.innerHTML = `
    <div class="billing-page">
      <!-- Current usage card -->
      <div class="usage-card">
        <div class="usage-card-header">
          <div>
            <h3>Token Usage</h3>
            <div class="usage-card-sub">Plan: <strong style="color:var(--fg);text-transform:capitalize">${plan}</strong></div>
          </div>
          <div class="usage-pct-label" style="color:${pct>85?'var(--red)':pct>60?'var(--yellow)':'var(--green)'}">
            ${Math.round(pct)}%
          </div>
        </div>
        <div class="billing-usage-bar">
          <div class="billing-usage-fill ${pct>85?'danger':pct>60?'warn':''}" style="width:${pct}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--fg-dim);margin-top:0.35rem">
          <span>${formatTokens(used)} used</span>
          <span>${formatTokens(limit)} total</span>
        </div>
        ${pct > 80 ? `
          <div class="upgrade-prompt" style="margin-top:1rem">
            <span>⚠️ You're at ${Math.round(pct)}% of your limit. Upgrade to avoid interruptions.</span>
            <button class="btn-primary btn-sm checkout-btn" data-plan="starter">Upgrade Now</button>
          </div>
        ` : ''}
      </div>

      <!-- Plans -->
      <div>
        <div class="section-header"><span class="section-title">Available Plans</span></div>
        <div class="plans-grid">
          ${PLANS.map(p => buildPlanCard(p, plan)).join('')}
        </div>
      </div>

      <!-- Usage history -->
      <div>
        <div class="section-header"><span class="section-title">Usage History</span></div>
        <div class="card" style="padding:0;overflow:hidden">
          <table class="usage-history-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Tokens Used</th>
                <th>Limit</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              ${MOCK_HISTORY.map(row => `
                <tr>
                  <td>${row.month}</td>
                  <td>${formatTokens(row.used)}</td>
                  <td>${formatTokens(row.limit)}</td>
                  <td>${row.cost}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Checkout buttons
  container.querySelectorAll('.checkout-btn').forEach(btn => {
    btn.addEventListener('click', () => startCheckout(btn.dataset.plan));
  });

  // Handle Stripe redirect
  const params = new URLSearchParams(window.location.search);
  if (params.get('success')) {
    showToast('Subscription activated! 🎉', 'success');
    history.replaceState({}, '', window.location.pathname);
  } else if (params.get('canceled')) {
    showToast('Checkout canceled.', 'info');
    history.replaceState({}, '', window.location.pathname);
  }
}

function buildPlanCard(plan, currentPlan) {
  const isCurrent = plan.id === currentPlan;
  const showBadge = isCurrent || plan.popular;
  return `
    <div class="plan-card ${isCurrent ? 'active-plan' : plan.popular ? 'popular-plan' : ''}">
      ${showBadge ? `<span class="plan-badge-label ${isCurrent ? 'current' : 'popular'}">${isCurrent ? 'Current' : 'Popular'}</span>` : ''}
      <div class="plan-name-text">${plan.name}</div>
      <div class="plan-price">${plan.price}<span>${plan.period}</span></div>
      <div class="plan-tokens-note">${plan.tokens} tokens</div>
      <ul class="plan-features-list">
        ${plan.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
      ${isCurrent
        ? '<button class="btn-ghost w-full" disabled>Current Plan</button>'
        : plan.id === 'free'
          ? '<button class="btn-ghost w-full" disabled>Free</button>'
          : `<button class="btn-primary w-full checkout-btn" data-plan="${plan.id}">Upgrade to ${plan.name}</button>`
      }
    </div>`;
}

async function startCheckout(plan) {
  try {
    const data = await apiFetch('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
    if (data.url) window.location.href = data.url;
  } catch (err) {
    showToast('Checkout failed: ' + err.message, 'error');
  }
}
