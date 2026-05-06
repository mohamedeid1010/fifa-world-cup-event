const API_BASE = '/api';
const GET_RETRY_DELAYS_MS = [250, 800, 1600];

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export const api = {
  async get(endpoint) {
    let lastError;

    for (let attempt = 0; attempt <= GET_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const res = await fetch(`${API_BASE}${endpoint}`);

        if (res.ok) {
          return res.json();
        }

        const body = await res.json().catch(() => ({}));
        const error = new Error(body.error || `GET ${endpoint} failed`);

        if (res.status >= 500 && attempt < GET_RETRY_DELAYS_MS.length) {
          lastError = error;
          await wait(GET_RETRY_DELAYS_MS[attempt]);
          continue;
        }

        throw error;
      } catch (error) {
        if (attempt >= GET_RETRY_DELAYS_MS.length) {
          throw error;
        }

        lastError = error;
        await wait(GET_RETRY_DELAYS_MS[attempt]);
      }
    }

    throw lastError || new Error(`GET ${endpoint} failed`);
  },

  async post(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `POST ${endpoint} failed`);
    }
    return res.json();
  },

  async put(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `PUT ${endpoint} failed`);
    }
    return res.json();
  },

  connectSSE() {
    const source = new EventSource(`${API_BASE}/stream`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.listeners[data.type]) {
          this.listeners[data.type].forEach(cb => cb(data.payload));
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };
    this.source = source;
  },

  listeners: {},
  on(type, callback) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(callback);
  }
};
