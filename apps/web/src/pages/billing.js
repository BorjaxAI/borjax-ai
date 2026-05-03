import { api } from '../api/client.js';

export async function renderBilling(container) {
  container.innerHTML = '<div class="billing-layout"><div class="text-center text-dim" style="padding:3rem;">Loading billing info...</div></div>';

  let user;
  try {
    user = await api.get('/auth/me');
  } catch {
    container.innerHTML = '<div class="billing-layout"><div class="text-center text-dim" style="padding:3rem;">Failed to load billing info</div></div>';
    return;
  }

  const usagePct = Math.min(100, Math.round((user.tokens_used / user.tokens_limit) * 100));
  const isWarning = usagePct > 80;

  const plans = [
    { id: 'free',    name: 'Free',    price: '$0',   period: '', tokens: '10,000 / mo',    features: ['AI Chat', '5 background tasks/mo', '1 agent', 'Community support'] },
    { id: 'starter', name: 'Starter', price: '$9',   period: '/mo', tokens: '100,000 / mo',  features: ['Unlimited tasks', '10 agents', 'Email support', '90-day history'], popular: true },
    { id: 'pro',     name: 'Pro',     price: '$29',  period: '/mo', tokens: '500,000 / mo',  features: ['Unlimited agents', 'Priority queue', 'Priority support 24h', 'Analytics'] },
    { id: 'agency',  name: 'Agency',  price: '$99',  period: '/mo', tokens: '2,000,000 / mo', features: ['10 team seats', 'Custom templates', 'Dedicated support', 'Custom integrations'] },
  ];

  container.innerHTML = `
    <div class="billing-layout">
      <div class="page-header" style="padding:0 0 1.5rem;">
        <div>
          <div class="page-title">Billing & Plans</div>
          <div class="page-subtitle">Manage your subscription and usage</div>
        </div>
        <button class="btn btn-secondary btn-sm" id="manage-billing-btn">Manage Billing ↗</button>
      </div>

      <!-- Usage card -->
      <div class="billing-usage-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:.5rem;">
          <div>
            <div style="font-size:.875rem; font-weight:700;">Token Usage</div>
            <div style="font-size:.8rem; color:var(--fg-dim); margin-top:.2rem;">
              Current plan: <span style="color:var(--fg); font-weight:600; text-transform:capitalize;">${user.plan}</span>
            </div>
          </div>
          <div style="font-size:.875rem; font-weight:600; ${isWarning ? 'color:var(--orange)' : 'color:var(--fg-dim)'}">
            ${user.tokens_used.toLocaleString()} / ${user.tokens_limit.toLocaleString()}
          </div>
        </div>
        <div class="usage-bar-container">
          <div class="usage-bar ${isWarning ? 'warning' : ''}" style="width:${usagePct}%;"></div>
        </div>
        <div style="font-size:.8rem; color:var(--fg-dim); margin-top:.35rem;">${usagePct}% used this month</div>
        ${isWarning ? '<div style="margin-top:.75rem; font-size:.82rem; color:var(--orange);">⚠️ You are approaching your token limit. Consider upgrading.</div>' : ''}
      </div>

      <!-- Plans -->
      <div style="margin-bottom:1.5rem;">
        <div style="font-size:1rem; font-weight:700; margin-bottom:1.25rem;">Available Plans</div>
        <div class="billing-plans-grid">
          ${plans.map(plan => `
            <div class="plan-card ${user.plan === plan.id ? 'current' : plan.popular ? 'popular-plan' : ''}">
              ${user.plan === plan.id ? '<div class="current-label">Current</div>' : plan.popular ? '<div class="popular-label">Popular</div>' : ''}
              <div class="plan-name">${plan.name}</div>
              <div class="plan-price">${plan.price}<span>${plan.period}</span></div>
              <div class="plan-tokens">${plan.tokens} tokens</div>
              <ul class="plan-features">
                ${plan.features.map(f => `<li>${f}</li>`).join('')}
              </ul>
              ${user.plan === plan.id
                ? '<button class="btn btn-ghost btn-full" disabled>Current Plan</button>'
                : plan.id === 'free'
                  ? '<button class="btn btn-ghost btn-full" disabled>Free</button>'
                  : `<button class="btn btn-primary btn-full checkout-btn" data-plan="${plan.id}">Upgrade to ${plan.name}</button>`
              }
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.getElementById('manage-billing-btn').addEventListener('click', openPortal);

  document.querySelectorAll('.checkout-btn').forEach(btn => {
    btn.addEventListener('click', () => startCheckout(btn.dataset.plan));
  });

  // Handle success/cancel from Stripe redirect
  const params = new URLSearchParams(window.location.search);
  if (params.get('success')) {
    showBillingToast('Subscription activated! Welcome to ' + user.plan + ' plan.', 'success');
    history.replaceState({}, '', window.location.pathname);
  } else if (params.get('canceled')) {
    showBillingToast('Checkout canceled.', 'info');
    history.replaceState({}, '', window.location.pathname);
  }
}

async function startCheckout(plan) {
  try {
    const data = await api.post('/billing/checkout', { plan });
    if (data.url) window.location.href = data.url;
  } catch (err) {
    alert('Checkout failed: ' + err.message);
  }
}

async function openPortal() {
  try {
    const data = await api.post('/billing/portal', {});
    if (data.url) window.location.href = data.url;
  } catch (err) {
    alert('Could not open billing portal: ' + err.message);
  }
}

function showBillingToast(msg, type) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}
