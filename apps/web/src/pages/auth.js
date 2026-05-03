import { api } from '../api/client.js';
import { setToken } from '../utils/auth.js';

export function renderAuth(container, onSuccess) {
  let isLogin = true;

  function render() {
    container.innerHTML = `
      <div class="auth-box">
        <div class="auth-logo">
          <div class="logo" style="justify-content:center; display:flex; align-items:center; gap:.6rem;">
            <div class="logo-icon">⚡</div>
            <span style="font-size:1.25rem; font-weight:800; background:linear-gradient(135deg,#7aa2f7,#bb9af7); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">BorjaxAI</span>
          </div>
        </div>

        <div class="auth-title">${isLogin ? 'Welcome back' : 'Create account'}</div>
        <div class="auth-subtitle">${isLogin ? 'Sign in to your AI workspace' : 'Start with 10,000 free tokens'}</div>

        <div id="auth-error" class="auth-error hidden"></div>

        <form id="auth-form">
          ${!isLogin ? `
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" class="input" id="full-name" placeholder="Your name" required />
            </div>
          ` : ''}

          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="input" id="email" placeholder="you@example.com" required autocomplete="email" />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="input" id="password" placeholder="••••••••" required autocomplete="${isLogin ? 'current-password' : 'new-password'}" />
          </div>

          <button type="submit" class="btn btn-primary btn-full btn-lg" id="auth-submit">
            ${isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div class="auth-toggle">
          ${isLogin
            ? 'No account? <a id="toggle-mode">Create one free →</a>'
            : 'Already have an account? <a id="toggle-mode">Sign in</a>'
          }
        </div>
      </div>
    `;

    document.getElementById('toggle-mode').addEventListener('click', () => {
      isLogin = !isLogin;
      render();
    });

    document.getElementById('auth-form').addEventListener('submit', handleSubmit);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('auth-submit');
    const errorDiv = document.getElementById('auth-error');
    errorDiv.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = isLogin ? 'Signing in...' : 'Creating account...';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      let data;
      if (isLogin) {
        data = await api.post('/auth/login', { email, password });
      } else {
        const full_name = document.getElementById('full-name').value;
        data = await api.post('/auth/register', { email, password, full_name });
      }

      setToken(data.access_token);
      onSuccess(data.user);
    } catch (err) {
      errorDiv.textContent = err.message || 'Authentication failed';
      errorDiv.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = isLogin ? 'Sign In' : 'Create Account';
    }
  }

  render();
}
