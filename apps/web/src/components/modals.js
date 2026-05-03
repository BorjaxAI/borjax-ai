import { initAuthPage } from '../pages/auth.js';

export function showTokenExhaustedModal() {
  // Remove any existing modal
  document.querySelector('.modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal token-modal">
      <div class="modal-icon">🎉</div>
      <h2>You've used your free tokens!</h2>
      <p>Create a free account and get <strong>10,000 tokens</strong> instantly — plus access to tasks, agents, and more.</p>
      <div class="modal-stats">
        <div class="modal-stat"><span>Free account</span><strong>10,000 tokens</strong></div>
        <div class="modal-stat"><span>Starter plan</span><strong>100,000 tokens</strong></div>
        <div class="modal-stat"><span>Pro plan</span><strong>500,000 tokens</strong></div>
      </div>
      <div id="modal-auth-form"></div>
      <p class="modal-terms">Already have an account? <a href="#" id="modal-login-link">Sign in instead</a></p>
    </div>
  `;
  document.body.appendChild(overlay);

  // Render auth form (register mode by default) inside modal
  initAuthPage(overlay.querySelector('#modal-auth-form'), () => {
    overlay.remove();
    window.location.reload();
  });

  // Close on backdrop click
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

export function showSignUpModal(message = 'Create an account to continue') {
  // Remove any existing modal
  document.querySelector('.modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal signup-modal">
      <button class="modal-close" id="modal-close">✕</button>
      <div class="modal-icon">🔐</div>
      <h2>${message}</h2>
      <p>It's free to get started. No credit card required.</p>
      <div id="modal-auth-form"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  initAuthPage(overlay.querySelector('#modal-auth-form'), () => {
    overlay.remove();
    window.location.reload();
  });

  overlay.querySelector('#modal-close')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}
