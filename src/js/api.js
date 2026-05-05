const API_BASE = '/api';

export const api = {
  async get(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `GET ${endpoint} failed`);
    }
    return res.json();
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
