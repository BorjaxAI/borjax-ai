import { getToken, removeToken } from '../utils/auth.js';

const BASE_URL = import.meta.env.VITE_API_URL || '/v1';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(method, path, body = null, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  if (res.status === 401) {
    removeToken();
    window.location.reload();
    throw new ApiError('Unauthorized', 401, null);
  }

  let data;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const msg = (data && data.detail) || (data && data.error) || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, data);
  }

  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),

  // Returns raw Response for SSE streams
  stream: (path, body) => {
    const token = getToken();
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(body),
    });
  },
};
