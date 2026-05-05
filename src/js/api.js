const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
  }

  async get(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) throw new Error(`API GET ${endpoint} failed`);
    return response.json();
  }

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      let errorMsg = `API POST ${endpoint} failed`;
      try {
        const errBody = await response.json();
        if (errBody.error) errorMsg = errBody.error;
      } catch (e) {}
      throw new Error(errorMsg);
    }
    return response.json();
  }

  async put(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      let errorMsg = `API PUT ${endpoint} failed`;
      try {
        const errBody = await response.json();
        if (errBody.error) errorMsg = errBody.error;
      } catch (e) {}
      throw new Error(errorMsg);
    }
    return response.json();
  }

  connectSSE() {
    if (this.eventSource) return;
    this.eventSource = new EventSource(`${API_BASE}/stream`);

    this.eventSource.addEventListener('new-request', (e) => {
      this.emit('new-request', JSON.parse(e.data));
    });

    this.eventSource.addEventListener('update-request', (e) => {
      this.emit('update-request', JSON.parse(e.data));
    });

    this.eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      this.eventSource.close();
      this.eventSource = null;
      setTimeout(() => this.connectSSE(), 5000); // Reconnect after 5s
    };
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
}

export const api = new ApiClient();
