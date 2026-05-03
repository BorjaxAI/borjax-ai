import { getToken, API } from '../utils/auth.js';

export async function streamChat(content, conversationId, onDelta, onDone) {
  const res = await fetch(`${API}/v1/chat/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ content, conversation_id: conversationId || null }),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try { msg = JSON.parse(text).detail || JSON.parse(text).error || msg; } catch {}
    throw new Error(msg);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';
  let convId    = conversationId;

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
        const data = JSON.parse(raw);
        if (data.type === 'conversation_id') convId = data.id;
        if (data.type === 'token')  onDelta(data.content);
        if (data.type === 'delta')  onDelta(data.text);
        if (data.type === 'done')   onDone?.(convId);
      } catch { /* ignore malformed */ }
    }
  }

  return convId;
}
