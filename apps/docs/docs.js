/* =====================================================
   BorjaxAI Docs — Shared JavaScript
   ===================================================== */
(function () {
  'use strict';

  /* ── Copy code buttons ── */
  function initCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pre = btn.closest('.code-block').querySelector('pre code');
        if (!pre) return;
        navigator.clipboard.writeText(pre.innerText.trim()).then(() => {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 2000);
        }).catch(() => {
          // Fallback
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(pre);
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('copy');
          sel.removeAllRanges();
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
        });
      });
    });
  }

  /* ── Auto-build TOC from article headings ── */
  function buildTOC() {
    const tocNav = document.getElementById('tocNav');
    if (!tocNav) return;
    const article = document.querySelector('.article');
    if (!article) return;
    const headings = article.querySelectorAll('h2, h3');
    if (!headings.length) { document.querySelector('.toc-sidebar')?.style.setProperty('display', 'none'); return; }
    const frag = document.createDocumentFragment();
    headings.forEach((h, i) => {
      if (!h.id) h.id = 'heading-' + i + '-' + h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      // Add anchor link
      if (!h.querySelector('.anchor-link')) {
        const a = document.createElement('a');
        a.className = 'anchor-link';
        a.href = '#' + h.id;
        a.textContent = '#';
        h.prepend(a);
      }
      const link = document.createElement('a');
      link.className = 'toc-link' + (h.tagName === 'H3' ? ' toc-h3' : '');
      link.href = '#' + h.id;
      link.textContent = h.textContent.replace('#', '').trim();
      link.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      frag.appendChild(link);
    });
    tocNav.appendChild(frag);
  }

  /* ── TOC scroll highlight ── */
  function initTOCHighlight() {
    const links = document.querySelectorAll('.toc-link');
    if (!links.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.remove('active'));
          const active = document.querySelector(`.toc-link[href="#${entry.target.id}"]`);
          if (active) {
            active.classList.add('active');
            active.scrollIntoView({ block: 'nearest' });
          }
        }
      });
    }, { rootMargin: '-10% 0px -80% 0px', threshold: 0 });
    document.querySelectorAll('.article h2, .article h3').forEach(h => observer.observe(h));
  }

  /* ── Sidebar search filter ── */
  function initSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      document.querySelectorAll('.nav-link').forEach(link => {
        const text = link.textContent.toLowerCase();
        const section = link.closest('.nav-section');
        link.style.display = (!q || text.includes(q)) ? '' : 'none';
      });
      // Show/hide section headings
      document.querySelectorAll('.nav-section').forEach(sec => {
        const visible = Array.from(sec.querySelectorAll('.nav-link')).some(l => l.style.display !== 'none');
        sec.style.display = visible ? '' : 'none';
      });
    });
    // ⌘K / Ctrl+K focus
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
      if (e.key === 'Escape' && document.activeElement === input) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.blur();
      }
    });
  }

  /* ── Mobile sidebar toggle ── */
  function initMobileSidebar() {
    const btn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!btn || !sidebar) return;
    function open() {
      sidebar.classList.add('open');
      overlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      sidebar.classList.remove('open');
      overlay?.classList.remove('open');
      document.body.style.overflow = '';
    }
    btn.addEventListener('click', () => sidebar.classList.contains('open') ? close() : open());
    overlay?.addEventListener('click', close);
    // Close on nav link click (mobile)
    sidebar.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => { if (window.innerWidth <= 900) close(); }));
  }

  /* ── Init all ── */
  document.addEventListener('DOMContentLoaded', () => {
    initCopyButtons();
    buildTOC();
    // Wait a tick for TOC links to render before observing
    requestAnimationFrame(initTOCHighlight);
    initSearch();
    initMobileSidebar();
  });
})();
