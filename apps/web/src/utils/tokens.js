import { getUser } from './auth.js';

export function formatTokens(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(0) + 'k';
  return String(n);
}

export function updateUsageDisplay() {
  const user = getUser();
  if (!user) return;
  const used  = user.tokens_used  || 0;
  const limit = user.tokens_limit || 10000;
  const pct   = Math.min((used / limit) * 100, 100);

  const fill       = document.getElementById('usage-fill');
  const text       = document.getElementById('usage-text');
  const headerText = document.getElementById('header-usage-text');

  if (fill) {
    fill.style.width = pct + '%';
    fill.className = 'usage-fill' + (pct > 85 ? ' danger' : pct > 60 ? ' warn' : '');
  }
  if (text)       text.textContent = `${formatTokens(used)} / ${formatTokens(limit)}`;
  if (headerText) headerText.textContent = `${formatTokens(Math.max(limit - used, 0))} tokens left`;
}
