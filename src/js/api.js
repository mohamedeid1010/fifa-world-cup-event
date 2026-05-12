const DEFAULT_API_BASE = '/api';
const GET_RETRY_DELAYS_MS = [250, 800, 1600];
const LOCAL_DB_KEY = 'fifa-local-api-db';
const LOCAL_EVENT_KEY = 'fifa-local-api-event';
const LOCAL_EVENT_CHANNEL = 'fifa-local-api-events';
const LEGACY_TICKETS_KEY = 'fifa-matchday-tickets';
const LEGACY_SERVICES_KEY = 'fifa-matchday-services';
const FORCE_STATIC_ONLY = import.meta.env.VITE_STATIC_ONLY === 'true';
const CONFIGURED_API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL || '');
const USE_LOCAL_API = FORCE_STATIC_ONLY || (!CONFIGURED_API_BASE && import.meta.env.BASE_URL !== '/');
const API_BASE = CONFIGURED_API_BASE || DEFAULT_API_BASE;

const LOCAL_DB_TEMPLATE = Object.freeze({
  users: [],
  tickets: [],
  requests: [],
  counters: {
    user: 1,
    ticket: 1,
    assistance: 1,
    food: 1
  }
});

const listeners = {};
let localChannel = null;
let localStorageBridgeReady = false;

function normalizeApiBase(value) {
  if (!value) {
    return '';
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function buildApiUrl(endpoint) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${normalizedEndpoint}`;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function cloneValue(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function readJsonStorage(key, fallback) {
  const rawValue = localStorage.getItem(key);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallback;
  }
}

function deriveFoodWorkflowStatus(request) {
  const status = String(request.status || '').toLowerCase();

  if (request.archivedAt || status.includes('collect')) {
    return 'ARCHIVED';
  }

  if (request.handledAt || status.includes('ready')) {
    return 'DONE';
  }

  if (status.includes('process')) {
    return 'PROCESSING';
  }

  return 'PENDING';
}

function deriveLastTouchedAt(request) {
  return request.archivedAt || request.handledAt || request.controlQueuedAt || request.lastTouchedAt || request.createdAt || new Date().toISOString();
}

function sortByCreatedAt(items) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function toRowNumber(row) {
  if (typeof row === 'string' && /^[A-Za-z]$/.test(row)) {
    return row.toUpperCase().charCodeAt(0) - 64;
  }

  const numericRow = Number.parseInt(row, 10);
  return Number.isFinite(numericRow) ? numericRow : row;
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { password, ...safeUser } = user;
  return safeUser;
}

function getUserDisplayName(user) {
  if (!user) {
    return 'Guest Fan';
  }

  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Guest Fan';
}

function buildDefaultLocalDb() {
  return cloneValue(LOCAL_DB_TEMPLATE);
}

function normalizeLocalDb(db) {
  const fallback = buildDefaultLocalDb();
  const nextDb = db && typeof db === 'object' ? db : {};

  return {
    users: Array.isArray(nextDb.users) ? nextDb.users : fallback.users,
    tickets: Array.isArray(nextDb.tickets) ? nextDb.tickets : fallback.tickets,
    requests: Array.isArray(nextDb.requests) ? nextDb.requests : fallback.requests,
    counters: {
      ...fallback.counters,
      ...(nextDb.counters && typeof nextDb.counters === 'object' ? nextDb.counters : {})
    }
  };
}

function buildSeedLocalDb() {
  const db = buildDefaultLocalDb();
  const legacyTickets = readJsonStorage(LEGACY_TICKETS_KEY, []);
  const legacyRequests = readJsonStorage(LEGACY_SERVICES_KEY, []);

  if (Array.isArray(legacyTickets) && legacyTickets.length > 0) {
    db.tickets = cloneValue(legacyTickets);
    db.counters.ticket = legacyTickets.length + 1;
  }

  if (Array.isArray(legacyRequests) && legacyRequests.length > 0) {
    db.requests = cloneValue(legacyRequests);
    db.counters.assistance = legacyRequests.filter((request) => request.kind !== 'food').length + 1;
    db.counters.food = legacyRequests.filter((request) => request.kind === 'food').length + 1;
  }

  return db;
}

function syncLegacyStores(db) {
  localStorage.setItem(LEGACY_TICKETS_KEY, JSON.stringify(db.tickets));
  localStorage.setItem(LEGACY_SERVICES_KEY, JSON.stringify(db.requests));
}

function readLocalDb() {
  const rawValue = localStorage.getItem(LOCAL_DB_KEY);

  if (!rawValue) {
    const seededDb = buildSeedLocalDb();
    writeLocalDb(seededDb);
    return seededDb;
  }

  try {
    return normalizeLocalDb(JSON.parse(rawValue));
  } catch {
    const seededDb = buildSeedLocalDb();
    writeLocalDb(seededDb);
    return seededDb;
  }
}

function writeLocalDb(db) {
  const normalizedDb = normalizeLocalDb(db);
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(normalizedDb));
  syncLegacyStores(normalizedDb);
}

function nextCounterValue(db, counterName) {
  const currentValue = Number.parseInt(db.counters[counterName], 10);
  const nextValue = Number.isFinite(currentValue) && currentValue > 0 ? currentValue : 1;
  db.counters[counterName] = nextValue + 1;
  return nextValue;
}

function parseEndpoint(endpoint) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return new URL(normalizedEndpoint, 'https://local.invalid');
}

function findUserByEmail(db, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return db.users.find((user) => String(user.email || '').trim().toLowerCase() === normalizedEmail) || null;
}

function emitToListeners(type, payload) {
  if (!listeners[type]) {
    return;
  }

  listeners[type].forEach((callback) => callback(cloneValue(payload)));
}

function ensureLocalEventBridge() {
  if (!USE_LOCAL_API) {
    return;
  }

  if (typeof BroadcastChannel === 'function' && !localChannel) {
    localChannel = new BroadcastChannel(LOCAL_EVENT_CHANNEL);
    localChannel.addEventListener('message', (event) => {
      if (!event.data?.type) {
        return;
      }

      emitToListeners(event.data.type, event.data.payload);
    });
  }

  if (!localStorageBridgeReady) {
    window.addEventListener('storage', (event) => {
      if (event.key !== LOCAL_EVENT_KEY || !event.newValue) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue);
        if (payload?.type) {
          emitToListeners(payload.type, payload.data);
        }
      } catch {
        // Ignore malformed storage bridge payloads.
      }
    });
    localStorageBridgeReady = true;
  }
}

function broadcastLocalEvent(type, payload) {
  emitToListeners(type, payload);
  ensureLocalEventBridge();

  if (localChannel) {
    localChannel.postMessage({ type, payload });
    return;
  }

  localStorage.setItem(LOCAL_EVENT_KEY, JSON.stringify({
    id: `${Date.now()}-${Math.random()}`,
    type,
    data: payload
  }));
}

function createError(message) {
  return new Error(message);
}

function createAssistanceRequest(data) {
  const createdAt = new Date().toISOString();

  return {
    id: `assistance-${data.id}`,
    kind: 'assistance',
    unitType: data.unitType || data.type || '',
    title: data.title || `${data.unitType || 'Service'} Assistance`,
    ownerName: data.ownerName || 'Guest Fan',
    ownerEmail: data.ownerEmail || '',
    status: data.status || 'Pending',
    workflowStatus: data.workflowStatus || 'PENDING',
    risk: data.risk || 'NORMAL',
    details: data.details || '',
    notes: data.notes || '',
    source: data.source || 'user-portal',
    createdAt,
    controlQueuedAt: data.controlQueuedAt || null,
    assignedUnit: data.assignedUnit || null,
    handledAt: data.handledAt || null,
    archivedAt: data.archivedAt || null,
    lastTouchedAt: data.lastTouchedAt || createdAt,
    section: data.section || '',
    row: data.row || '',
    seat: data.seat || '',
    ticketId: data.ticketId || null,
    liveLatitude: data.liveLatitude ?? null,
    liveLongitude: data.liveLongitude ?? null,
    liveAccuracy: data.liveAccuracy ?? null,
    liveCapturedAt: data.liveCapturedAt || null,
    liveMapX: data.liveMapX ?? null,
    liveMapY: data.liveMapY ?? null
  };
}

function createFoodRequest({ id, user, item, ticket, notes }) {
  const createdAt = new Date().toISOString();
  const quantity = Number.parseInt(item.quantity, 10) || 1;
  const title = item.name || 'Restaurant Order';
  const details = `${quantity}x ${title}`;

  return {
    id: `food-${id}`,
    kind: 'food',
    unitType: 'restaurant',
    title,
    ownerName: getUserDisplayName(user),
    ownerEmail: user.email,
    status: 'Pending',
    workflowStatus: 'PENDING',
    risk: 'NORMAL',
    details,
    notes: notes || '',
    source: 'user-portal',
    createdAt,
    controlQueuedAt: null,
    assignedUnit: null,
    handledAt: null,
    archivedAt: null,
    lastTouchedAt: createdAt,
    section: ticket?.sectionShort || ticket?.section || '',
    row: ticket?.row || '',
    seat: ticket?.seatNumber || '',
    ticketId: ticket?.ticketId || null,
    liveLatitude: null,
    liveLongitude: null,
    liveAccuracy: null,
    liveCapturedAt: null,
    liveMapX: null,
    liveMapY: null
  };
}

async function localGet(endpoint) {
  const url = parseEndpoint(endpoint);
  const db = readLocalDb();

  if (url.pathname === '/tickets') {
    const email = url.searchParams.get('email');
    const tickets = sortByCreatedAt(db.tickets);
    const result = email
      ? tickets.filter((ticket) => String(ticket.ownerEmail || '').toLowerCase() === String(email).toLowerCase())
      : tickets;

    return cloneValue(result);
  }

  if (url.pathname === '/seats') {
    return cloneValue(db.tickets.map((ticket) => ({
      section: ticket.sectionShort || ticket.section || '',
      row: toRowNumber(ticket.row),
      seatNumber: String(ticket.seatNumber || '')
    })));
  }

  if (url.pathname === '/requests') {
    const email = url.searchParams.get('email');
    const requests = sortByCreatedAt(db.requests);
    const result = email
      ? requests.filter((request) => String(request.ownerEmail || '').toLowerCase() === String(email).toLowerCase())
      : requests;

    return cloneValue(result);
  }

  throw createError(`GET ${url.pathname} is not supported in static-only mode`);
}

async function localPost(endpoint, data = {}) {
  const url = parseEndpoint(endpoint);
  const db = readLocalDb();

  if (url.pathname === '/auth/signup') {
    const firstName = String(data.firstName || '').trim();
    const lastName = String(data.lastName || '').trim();
    const email = String(data.email || '').trim();
    const phone = String(data.phone || '').trim();
    const password = String(data.password || '');

    if (!firstName || !lastName || !email || !phone || !password) {
      throw createError('All sign up fields are required');
    }

    if (findUserByEmail(db, email)) {
      throw createError('Email already exists');
    }

    const user = {
      id: nextCounterValue(db, 'user'),
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      password
    };

    db.users.push(user);
    writeLocalDb(db);
    return { user: sanitizeUser(user) };
  }

  if (url.pathname === '/auth/login') {
    const email = String(data.email || '').trim();
    const password = String(data.password || '');

    if (!email || !password) {
      throw createError('Email and password are required');
    }

    const user = findUserByEmail(db, email);
    if (!user || user.password !== password) {
      throw createError('Invalid email or password');
    }

    return { user: sanitizeUser(user) };
  }

  if (url.pathname === '/tickets') {
    const ownerEmail = String(data.ownerEmail || '').trim();
    const sectionShort = String(data.sectionShort || '').trim();
    const row = String(data.row || '').trim();
    const seatNumber = String(data.seatNumber || '').trim();
    const user = findUserByEmail(db, ownerEmail);

    if (!user) {
      throw createError('User not found. Please log in again.');
    }

    const seatTaken = db.tickets.some((ticket) => (
      String(ticket.sectionShort || ticket.section || '').toLowerCase() === sectionShort.toLowerCase()
      && String(ticket.row) === row
      && String(ticket.seatNumber) === seatNumber
    ));

    if (seatTaken) {
      throw createError('This seat is already booked.');
    }

    const bookedAt = new Date().toISOString();
    const ticket = {
      ticketId: nextCounterValue(db, 'ticket'),
      price: Number(data.price || 0),
      status: 'Booked',
      bookedAt,
      purchasedAt: bookedAt,
      ownerName: getUserDisplayName(user),
      ownerEmail: user.email,
      section: sectionShort,
      sectionFull: sectionShort,
      sectionShort,
      row,
      seatNumber,
      gate: '03'
    };

    db.tickets.push(ticket);
    writeLocalDb(db);
    return { success: true, ticketId: ticket.ticketId };
  }

  if (url.pathname === '/requests') {
    const request = createAssistanceRequest({
      ...data,
      id: nextCounterValue(db, 'assistance')
    });

    db.requests.unshift(request);
    writeLocalDb(db);
    broadcastLocalEvent('new-request', request);
    return cloneValue(request);
  }

  if (url.pathname === '/food-orders') {
    const email = String(data.email || '').trim();
    const items = Array.isArray(data.items) ? data.items : [];
    const user = findUserByEmail(db, email);

    if (!user) {
      throw createError('User not found');
    }

    const latestTicket = sortByCreatedAt(db.tickets.filter((ticket) => String(ticket.ownerEmail || '').toLowerCase() === email.toLowerCase()))[0] || null;

    items.forEach((item) => {
      const request = createFoodRequest({
        id: nextCounterValue(db, 'food'),
        user,
        item,
        ticket: latestTicket,
        notes: data.notes
      });

      db.requests.unshift(request);
      broadcastLocalEvent('new-request', request);
    });

    writeLocalDb(db);
    return { success: true };
  }

  throw createError(`POST ${url.pathname} is not supported in static-only mode`);
}

async function localPut(endpoint, data = {}) {
  const url = parseEndpoint(endpoint);
  const db = readLocalDb();

  if (url.pathname === '/auth/password') {
    const email = String(data.email || '').trim();
    const currentPassword = String(data.currentPassword || '');
    const newPassword = String(data.newPassword || '');
    const user = findUserByEmail(db, email);

    if (!user) {
      throw createError('User not found');
    }

    if (user.password !== currentPassword) {
      throw createError('Current password is incorrect');
    }

    if (newPassword.length < 4) {
      throw createError('New password must be at least 4 characters');
    }

    user.password = newPassword;
    writeLocalDb(db);
    return { success: true };
  }

  if (url.pathname.startsWith('/requests/')) {
    const requestId = decodeURIComponent(url.pathname.slice('/requests/'.length));
    const index = db.requests.findIndex((request) => String(request.id) === requestId);

    if (index === -1) {
      throw createError('Request not found');
    }

    const currentRequest = db.requests[index];
    const mappedUpdates = { ...data };

    if (mappedUpdates.type && !mappedUpdates.unitType) {
      mappedUpdates.unitType = mappedUpdates.type;
    }
    if (mappedUpdates.ticketRef && !mappedUpdates.ticketId) {
      mappedUpdates.ticketId = mappedUpdates.ticketRef;
    }
    if (mappedUpdates.sectionLabel && !mappedUpdates.section) {
      mappedUpdates.section = mappedUpdates.sectionLabel;
    }
    if (mappedUpdates.rowLabel && !mappedUpdates.row) {
      mappedUpdates.row = mappedUpdates.rowLabel;
    }
    if (mappedUpdates.seatLabel && !mappedUpdates.seat) {
      mappedUpdates.seat = mappedUpdates.seatLabel;
    }

    const nextRequest = {
      ...currentRequest,
      ...mappedUpdates,
      lastTouchedAt: new Date().toISOString()
    };

    if (nextRequest.kind === 'food') {
      nextRequest.unitType = 'restaurant';
      nextRequest.risk = 'NORMAL';
      nextRequest.workflowStatus = deriveFoodWorkflowStatus(nextRequest);
      nextRequest.lastTouchedAt = deriveLastTouchedAt(nextRequest);
    }

    db.requests[index] = nextRequest;
    writeLocalDb(db);
    broadcastLocalEvent('update-request', nextRequest);
    return cloneValue(nextRequest);
  }

  throw createError(`PUT ${url.pathname} is not supported in static-only mode`);
}

async function remoteGet(endpoint) {
  let lastError;

  for (let attempt = 0; attempt <= GET_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const res = await fetch(buildApiUrl(endpoint));

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
}

async function remotePost(endpoint, data) {
  const res = await fetch(buildApiUrl(endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `POST ${endpoint} failed`);
  }

  return res.json();
}

async function remotePut(endpoint, data) {
  const res = await fetch(buildApiUrl(endpoint), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `PUT ${endpoint} failed`);
  }

  return res.json();
}

export const api = {
  async get(endpoint) {
    if (USE_LOCAL_API) {
      return localGet(endpoint);
    }

    return remoteGet(endpoint);
  },

  async post(endpoint, data) {
    if (USE_LOCAL_API) {
      return localPost(endpoint, data);
    }

    return remotePost(endpoint, data);
  },

  async put(endpoint, data) {
    if (USE_LOCAL_API) {
      return localPut(endpoint, data);
    }

    return remotePut(endpoint, data);
  },

  connectSSE() {
    if (USE_LOCAL_API) {
      ensureLocalEventBridge();
      return;
    }

    const source = new EventSource(buildApiUrl('/stream'));
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        emitToListeners(data.type, data.payload);
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };
    this.source = source;
  },

  listeners,
  on(type, callback) {
    if (!listeners[type]) {
      listeners[type] = [];
    }

    listeners[type].push(callback);
  }
};
