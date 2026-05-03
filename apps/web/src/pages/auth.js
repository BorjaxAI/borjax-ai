import { API, setToken, setUser } from '../utils/auth.js';
import { showToast } from '../utils/toast.js';

export function initAuthPage(container, onSuccess) {
  let mode = 'login';

  function render() {
    container.innerHTML = mode === 'login' ? `
      <h2>Welcome back</h2>
      <form id="auth-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="email" placeholder="you@example.com" required autocomplete="email"/>
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="password" placeholder="••••••••" required autocomplete="current-password"/>
        </div>
        <button type="submit" class="btn-primary w-full" id="auth-submit" style="margin-top:0.25rem">Sign In</button>
      </form>
      <p class="auth-toggle">Don't have an account? <a href="#" id="toggle-mode">Create one →</a></p>
    ` : `
      <h2>Create your account</h2>
      <form id="auth-form">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" id="name" placeholder="Your name" required/>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="email" placeholder="you@example.com" required autocomplete="email"/>
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="password" placeholder="Min 8 characters" required autocomplete="new-password"/>
        </div>
        <button type="submit" class="btn-primary w-full" id="auth-submit" style="margin-top:0.25rem">Create Account</button>
      </form>
      <p class="auth-toggle">Already have an account? <a href="#" id="toggle-mode">Sign in →</a></p>
    `;

    container.querySelector('#toggle-mode')?.addEventListener('click', e => {
      e.preventDefault();
      mode = mode === 'login' ? 'register' : 'login';
      render();
    });

    container.querySelector('#auth-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = container.querySelector('#auth-submit');
      btn.textContent = 'Loading…'; btn.disabled = true;

      const email    = container.querySelector('#email').value.trim();
      const password = container.querySelector('#password').value;
      const name     = container.querySelector('#name')?.value?.trim();

      try {
        const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
        const body     = mode === 'login'
          ? { email, password }
          : { email, password, name, full_name: name };

        const res  = await fetch(`${API}/v1${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.error || 'Authentication failed');

        // support both token fields
        setToken(data.token || data.access_token);
        setUser(data.user || { email, name: name || email, plan: 'free' });
        onSuccess();
      } catch (err) {
        showToast(err.message, 'error');
        btn.textContent = mode === 'login' ? 'Sign In' : 'Create Account';
        btn.disabled = false;
      }
    });
  }

  render();
}
