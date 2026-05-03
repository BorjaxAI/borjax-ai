import { api } from './client.js';

/**
 * Stream chat via SSE.
 * Calls onToken(text) for each token, onDone({conversation_id, tokens_used}) when complete.
 */
export async function streamChat({ message, conversationId, onToken, onDone, onError }) {
  let res;
  try {
    res = await api.stream('/chat/send', {
      message,
      conversation_id: conversationId || null,
    });
  } catch (err) {
    onError?.(err.message || 'Network error');
    return;
  }

  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try { msg = JSON.parse(text).detail || JSON.parse(text).error || msg; } catch {}
    onError?.(msg);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;

      try {
        const event = JSON.parse(raw);
        if (event.type === 'token') {
          onToken?.(event.content);
        } else if (event.type === 'done') {
          onDone?.(event);
        } else if (event.type === 'error') {
          onError?.(event.message);
        }
      } catch {
        // ignore malformed events
      }
    }
  }
}
