/**
 * Render a chat message bubble.
 * Supports basic markdown: **bold**, `code`, ```blocks```, # headers, - lists
 */
export function renderMessage({ role, content, isStreaming = false }) {
  const row = document.createElement('div');
  row.className = `message-row ${role === 'user' ? 'user-row' : ''}`;

  const avatar = document.createElement('div');
  avatar.className = `message-avatar ${role === 'user' ? 'user-avatar' : 'ai-avatar'}`;
  avatar.textContent = role === 'user' ? 'U' : '⚡';

  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${role === 'user' ? 'user-bubble' : 'ai-bubble'}`;

  if (isStreaming) {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    bubble.appendChild(indicator);
  } else {
    bubble.innerHTML = markdownToHtml(content);
  }

  row.appendChild(avatar);
  row.appendChild(bubble);
  return { row, bubble };
}

/** Minimal markdown renderer */
function markdownToHtml(text) {
  if (!text) return '';

  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${code.trimEnd()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered lists
  html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs (double newline → <p>)
  const blocks = html.split(/\n\n+/);
  html = blocks.map(block => {
    if (block.startsWith('<h') || block.startsWith('<pre') || block.startsWith('<ul') || block.startsWith('<ol')) {
      return block;
    }
    const line = block.replace(/\n/g, '<br/>').trim();
    return line ? `<p>${line}</p>` : '';
  }).join('\n');

  return html;
}
