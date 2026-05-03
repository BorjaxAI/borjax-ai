import { apiFetch } from '../api/client.js';
import { showToast } from '../utils/toast.js';
import { getUser, setUser, logout } from '../utils/auth.js';

export async function initSettings(container) {
  const user = getUser() || {};

  container.innerHTML = `
    <div class="settings-page">

      <!-- Profile -->
      <div class="settings-section">
        <h3>👤 Profile</h3>
        <div class="avatar-display" id="settings-avatar">
          ${(user.name || user.full_name || user.email || '?')[0]?.toUpperCase() || '?'}
        </div>
        <form id="profile-form">
          <div class="form-group">
            <label class="form-label">Name</label>
            <input type="text" id="profile-name" value="${escHtml(user.name || user.full_name || '')}" placeholder="Your name"/>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="profile-email" value="${escHtml(user.email || '')}" placeholder="you@example.com"/>
          </div>
          <button type="submit" class="btn-primary btn-sm" id="profile-save-btn">Save Changes</button>
        </form>
      </div>

      <!-- Theme -->
      <div class="settings-section">
        <h3>🎨 Appearance</h3>
        <div class="theme-toggle-row">
          <div>
            <div style="font-size:0.9rem;font-weight:600">Theme</div>
            <div style="font-size:0.78rem;color:var(--fg-dim);margin-top:0.15rem">
              Currently: <span id="theme-label">Dark (Tokyo Night)</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="theme-toggle" ${document.body.classList.contains('theme-light') ? 'checked' : ''}/>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- API Key -->
      <div class="settings-section">
        <h3>🔑 API Key</h3>
        <p style="font-size:0.82rem;color:var(--fg-dim);margin-bottom:0.75rem">
          Use this key to access the BorjaxAI API programmatically.
        </p>
        <div class="api-key-display" id="api-key-display">
          <span id="api-key-text">bx_sk_••••••••••••••••••••••••••••</span>
          <button class="btn-icon btn-sm" id="copy-key-btn" title="Copy key">📋</button>
          <button class="btn-icon btn-sm" id="toggle-key-btn" title="Show/Hide">👁</button>
        </div>
        <div style="display:flex;gap:0.5rem">
          <button class="btn-secondary btn-sm" id="copy-key-btn2">Copy Key</button>
          <button class="btn-ghost btn-sm" id="regen-key-btn">Regenerate</button>
        </div>
        <div class="form-hint">Regenerating invalidates the current key immediately.</div>
      </div>

      <!-- Notifications -->
      <div class="settings-section">
        <h3>🔔 Notifications</h3>
        <div style="display:flex;flex-direction:column;gap:0.75rem">
          ${[
            ['notif-tasks', 'Task completion', 'Notify when background tasks finish'],
            ['notif-billing', 'Billing alerts', 'Notify when approaching token limit'],
            ['notif-updates', 'Product updates', 'Occasional product news'],
          ].map(([id, label, desc]) => `
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div>
                <div style="font-size:0.875rem;font-weight:500">${label}</div>
                <div style="font-size:0.78rem;color:var(--fg-dim)">${desc}</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="${id}" checked/>
                <span class="toggle-slider"></span>
              </label>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Danger zone -->
      <div class="settings-section danger-zone">
        <h3>⚠️ Danger Zone</h3>
        <p style="font-size:0.82rem;color:var(--fg-dim);margin-bottom:1rem">
          These actions are irreversible. Please proceed with caution.
        </p>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
          <button class="btn-danger btn-sm" id="sign-out-btn">Sign Out of All Devices</button>
          <button class="btn-danger btn-sm" id="delete-account-btn">Delete Account</button>
        </div>
      </div>

    </div>
  `;

  // ── Profile form ─────────────────────────────────────────────
  document.getElementById('profile-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn   = document.getElementById('profile-save-btn');
    const name  = document.getElementById('profile-name').value.trim();
    const email = document.getElementById('profile-email').value.trim();

    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const updated = await apiFetch('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name, email, full_name: name }),
      });
      const stored = getUser() || {};
      setUser({ ...stored, ...updated, name, email });
      document.getElementById('settings-avatar').textContent = (name || email || '?')[0].toUpperCase();
      // update sidebar
      const sidebarName = document.getElementById('user-name');
      const sidebarAvatar = document.getElementById('user-avatar');
      if (sidebarName) sidebarName.textContent = name || email;
      if (sidebarAvatar) sidebarAvatar.textContent = (name || email || '?')[0].toUpperCase();
      showToast('Profile updated!', 'success');
    } catch (err) {
      // local-only update if API fails
      const stored = getUser() || {};
      setUser({ ...stored, name, email });
      showToast('Saved locally (API unavailable)', 'info');
    } finally {
      btn.disabled = false; btn.textContent = 'Save Changes';
    }
  });

  // ── Theme toggle ─────────────────────────────────────────────
  let keyVisible = false;
  const mockKey  = 'bx_sk_a1b2c3d4e5f6789012345678abcdef0123456789';

  document.getElementById('theme-toggle').addEventListener('change', e => {
    const isLight = e.target.checked;
    document.body.classList.toggle('theme-light', isLight);
    document.body.classList.toggle('theme-dark', !isLight);
    document.getElementById('theme-label').textContent = isLight ? 'Light' : 'Dark (Tokyo Night)';
    showToast(`Switched to ${isLight ? 'light' : 'dark'} mode`, 'info');
    localStorage.setItem('borjax_theme', isLight ? 'light' : 'dark');
  });

  // ── API key ──────────────────────────────────────────────────
  document.getElementById('toggle-key-btn').addEventListener('click', () => {
    keyVisible = !keyVisible;
    document.getElementById('api-key-text').textContent = keyVisible
      ? mockKey
      : 'bx_sk_••••••••••••••••••••••••••••';
  });

  const copyKey = () => {
    navigator.clipboard.writeText(mockKey).then(() => showToast('API key copied!', 'success'));
  };
  document.getElementById('copy-key-btn').addEventListener('click', copyKey);
  document.getElementById('copy-key-btn2').addEventListener('click', copyKey);

  document.getElementById('regen-key-btn').addEventListener('click', async () => {
    if (!confirm('Regenerate API key? The current key will be invalidated immediately.')) return;
    try {
      await apiFetch('/auth/api-key/regenerate', { method: 'POST', body: JSON.stringify({}) });
      showToast('API key regenerated!', 'success');
    } catch {
      showToast('Simulated: key regenerated (API unavailable)', 'info');
    }
  });

  // ── Danger zone ──────────────────────────────────────────────
  document.getElementById('sign-out-btn').addEventListener('click', () => {
    if (!confirm('Sign out of all devices?')) return;
    logout();
    window.location.reload();
  });

  document.getElementById('delete-account-btn').addEventListener('click', async () => {
    const confirmed = prompt('Type DELETE to confirm account deletion:');
    if (confirmed !== 'DELETE') return;
    try {
      await apiFetch('/auth/account', { method: 'DELETE', body: JSON.stringify({}) });
    } catch { /* ignore */ }
    logout();
    window.location.reload();
  });
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
