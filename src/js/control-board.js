import { api, isLocalApiMode } from './api.js';
import { pageUrls } from './routes.js';

const LIVE_LOCATION_MAP_ASSET = new URL('../assets/image/live-location-stadium.png', import.meta.url).href;

const STORAGE_KEYS = {
  user: 'fifa-matchday-user',
  tickets: 'fifa-matchday-tickets'
};

const CONTROL_ACCESS_KEY = 'fifa-control-access';

/* ─── Professional Password / Notification Modal ─── */
function ensureBoardModal() {
  let overlay = document.getElementById('board-pw-overlay');
  if (overlay) return overlay;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="board-pw-overlay" class="board-pw-overlay" aria-hidden="true">
      <div class="board-pw-card" role="dialog" aria-modal="true" aria-labelledby="board-pw-heading">
        <button type="button" class="board-pw-close" id="board-pw-close" aria-label="Close">&times;</button>
        <div class="board-pw-icon-wrap" id="board-pw-icon-wrap">
          <span class="board-pw-icon" id="board-pw-icon">🔒</span>
        </div>
        <h3 class="board-pw-heading" id="board-pw-heading">AUTHORIZATION REQUIRED</h3>
        <p class="board-pw-desc" id="board-pw-desc">Enter the archive password to continue.</p>
        <div class="board-pw-input-group" id="board-pw-input-group">
          <input type="password" id="board-pw-input" class="board-pw-input" placeholder="••••••" autocomplete="off" />
          <div class="board-pw-dots" id="board-pw-dots"></div>
        </div>
        <div class="board-pw-msg" id="board-pw-msg"></div>
        <div class="board-pw-actions" id="board-pw-actions">
          <button type="button" class="board-pw-btn board-pw-btn-cancel" id="board-pw-cancel">CANCEL</button>
          <button type="button" class="board-pw-btn board-pw-btn-submit" id="board-pw-submit">CONFIRM</button>
        </div>
      </div>
    </div>
  `);

  return document.getElementById('board-pw-overlay');
}

/**
 * Show a professional card modal.
 * @param {'password'|'confirm'|'error'|'success'} mode
 * @param {object} opts  { title, desc, onConfirm, onCancel }
 */
function showBoardModal(mode, opts = {}) {
  const overlay = ensureBoardModal();
  const heading = document.getElementById('board-pw-heading');
  const desc = document.getElementById('board-pw-desc');
  const inputGroup = document.getElementById('board-pw-input-group');
  const input = document.getElementById('board-pw-input');
  const dots = document.getElementById('board-pw-dots');
  const msg = document.getElementById('board-pw-msg');
  const actions = document.getElementById('board-pw-actions');
  const cancelBtn = document.getElementById('board-pw-cancel');
  const submitBtn = document.getElementById('board-pw-submit');
  const closeBtn = document.getElementById('board-pw-close');
  const iconWrap = document.getElementById('board-pw-icon-wrap');
  const iconEl = document.getElementById('board-pw-icon');

  // Reset
  msg.textContent = '';
  msg.className = 'board-pw-msg';
  input.value = '';
  dots.textContent = '';
  overlay.className = 'board-pw-overlay';

  if (mode === 'password') {
    overlay.classList.add('mode-password');
    iconEl.textContent = '🔐';
    iconWrap.className = 'board-pw-icon-wrap pw-lock';
    heading.textContent = opts.title || 'AUTHORIZATION REQUIRED';
    desc.textContent = opts.desc || 'Enter the archive password to continue.';
    inputGroup.style.display = '';
    cancelBtn.style.display = '';
    submitBtn.style.display = '';
    submitBtn.textContent = 'VERIFY';
    cancelBtn.textContent = 'CANCEL';
  } else if (mode === 'confirm') {
    overlay.classList.add('mode-confirm');
    iconEl.textContent = '⚠️';
    iconWrap.className = 'board-pw-icon-wrap pw-warn';
    heading.textContent = opts.title || 'CONFIRM ARCHIVE';
    desc.textContent = opts.desc || 'This dispatch will be removed from the live queue and moved to archive.';
    inputGroup.style.display = 'none';
    cancelBtn.style.display = '';
    submitBtn.style.display = '';
    submitBtn.textContent = 'ARCHIVE';
    cancelBtn.textContent = 'CANCEL';
  } else if (mode === 'error') {
    overlay.classList.add('mode-error');
    iconEl.textContent = '✗';
    iconWrap.className = 'board-pw-icon-wrap pw-error';
    heading.textContent = opts.title || 'ERROR';
    desc.textContent = opts.desc || 'Something went wrong.';
    inputGroup.style.display = 'none';
    cancelBtn.style.display = 'none';
    submitBtn.style.display = '';
    submitBtn.textContent = 'OK';
    cancelBtn.textContent = '';
  } else if (mode === 'success') {
    overlay.classList.add('mode-success');
    iconEl.textContent = '✓';
    iconWrap.className = 'board-pw-icon-wrap pw-success';
    heading.textContent = opts.title || 'SUCCESS';
    desc.textContent = opts.desc || 'Operation completed.';
    inputGroup.style.display = 'none';
    cancelBtn.style.display = 'none';
    submitBtn.style.display = '';
    submitBtn.textContent = 'OK';
    cancelBtn.textContent = '';
  }

  // Show
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  if (mode === 'password') {
    window.setTimeout(() => input.focus(), 80);
  }

  // Input dots feedback
  const onInput = () => {
    const len = input.value.length;
    dots.textContent = '● '.repeat(len) + '○ '.repeat(Math.max(0, 6 - len));
    msg.textContent = '';
    msg.className = 'board-pw-msg';
  };
  input.addEventListener('input', onInput);

  // Cleanup helper
  const cleanup = () => {
    input.removeEventListener('input', onInput);
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    submitBtn.replaceWith(submitBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    closeBtn.replaceWith(closeBtn.cloneNode(true));
    overlay.replaceWith(overlay.cloneNode(true));
  };

  const close = () => {
    cleanup();
    opts.onCancel?.();
  };

  const submit = () => {
    if (mode === 'password') {
      const pw = input.value.trim();
      if (pw !== 'Noor') {
        msg.textContent = '✗ Incorrect password';
        msg.classList.add('error');
        input.value = '';
        dots.textContent = '○ ○ ○ ○ ○ ○';
        input.focus();
        // Shake animation
        const card = overlay.querySelector('.board-pw-card');
        card.classList.add('shake');
        window.setTimeout(() => card.classList.remove('shake'), 500);
        return;
      }
      cleanup();
      opts.onConfirm?.();
    } else if (mode === 'confirm') {
      cleanup();
      opts.onConfirm?.();
    } else {
      cleanup();
      opts.onConfirm?.();
    }
  };

  document.getElementById('board-pw-submit').addEventListener('click', submit);
  document.getElementById('board-pw-cancel').addEventListener('click', close);
  document.getElementById('board-pw-close').addEventListener('click', close);
  document.getElementById('board-pw-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('board-pw-overlay')) close();
  });

  // Enter key for password mode
  if (mode === 'password') {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submit();
    });
  }
}

function readStorage(key, fallback) {
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

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function hasControlAccess() {
  const rawValue = localStorage.getItem(CONTROL_ACCESS_KEY);

  if (!rawValue) {
    return false;
  }

  try {
    const accessState = JSON.parse(rawValue);
    return Boolean(accessState?.grantedAt);
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatClock(value) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(value));
}

function formatSyncTime(value) {
  if (!value) {
    return 'Waiting';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function padTime(value) {
  return String(value).padStart(2, '0');
}

function getElapsedText(requestTimestamp) {
  const start = new Date(requestTimestamp);

  if (Number.isNaN(start.getTime())) {
    return '00:00';
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (hours > 0) {
    return `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
  }

  return `${padTime(minutes)}:${padTime(seconds)}`;
}

function normalizeWorkflowStatus(serviceRequest) {
  const explicitStatus = String(serviceRequest.workflowStatus || '').toUpperCase();

  if (explicitStatus) {
    return explicitStatus;
  }

  const derivedStatus = String(serviceRequest.status || '').toLowerCase();

  if (derivedStatus.includes('archived')) {
    return 'ARCHIVED';
  }

  if (derivedStatus.includes('resolved') || derivedStatus.includes('done')) {
    return 'DONE';
  }

  if (derivedStatus.includes('processing') || derivedStatus.includes('responding')) {
    return 'PROCESSING';
  }

  return 'PENDING';
}

function normalizeRisk(serviceRequest) {
  const explicitRisk = String(serviceRequest.risk || '').toUpperCase();

  if (['HIGH', 'RISK', 'NORMAL'].includes(explicitRisk)) {
    return explicitRisk;
  }

  const text = `${serviceRequest.details || ''} ${serviceRequest.notes || ''}`.toLowerCase();

  if (text.toLowerCase().includes('high')) {
    return 'HIGH';
  }

  if (text.toLowerCase().includes('moderate')) {
    return 'RISK';
  }

  return 'NORMAL';
}

function getRiskClass(risk) {
  if (risk === 'HIGH') {
    return 'risk-high';
  }

  if (risk === 'RISK') {
    return 'risk-warning';
  }

  return 'risk-normal';
}

function getStatusClass(status) {
  if (status === 'PROCESSING') {
    return 'processing';
  }

  if (status === 'DONE') {
    return 'done';
  }

  if (status === 'ARCHIVED') {
    return 'archived';
  }

  return 'pending';
}

function getStatusLabel(status) {
  if (status === 'PROCESSING') {
    return '🟠 PROCESSING';
  }

  if (status === 'DONE') {
    return '✅ DONE';
  }

  if (status === 'ARCHIVED') {
    return '📁 ARCHIVED';
  }

  return 'PENDING';
}

function isRelevantUnit(serviceRequest, unitType) {
  if (serviceRequest.kind !== 'assistance') {
    return false;
  }

  const explicitUnit = String(serviceRequest.unitType || '').toLowerCase();

  if (explicitUnit) {
    return explicitUnit === unitType;
  }

  const title = String(serviceRequest.title || '').toLowerCase();

  if (unitType === 'ambulance') {
    return title.includes('ambulance') || title.includes('medical');
  }

  return title.includes('police');
}

function buildTicketMap(tickets) {
  const ticketMap = new Map();

  tickets.forEach((ticket) => {
    ticketMap.set(ticket.ticketId, ticket);
    ticketMap.set(String(ticket.ticketId), ticket);
  });

  return ticketMap;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function constrainToStadiumBounds(x, y) {
  const centerX = 50;
  const centerY = 50;
  const radiusX = 40;
  const radiusY = 44;
  const offsetX = x - centerX;
  const offsetY = y - centerY;
  const normalizedDistance = ((offsetX ** 2) / (radiusX ** 2)) + ((offsetY ** 2) / (radiusY ** 2));

  if (normalizedDistance <= 1) {
    return {
      x: clamp(x, 12, 88),
      y: clamp(y, 10, 90)
    };
  }

  const scale = 1 / Math.sqrt(normalizedDistance);

  return {
    x: clamp(centerX + (offsetX * scale * 0.96), 12, 88),
    y: clamp(centerY + (offsetY * scale * 0.96), 10, 90)
  };
}

function hashString(value) {
  return Array.from(String(value ?? '')).reduce((total, character, index) => (
    total + (character.charCodeAt(0) * (index + 11))
  ), 0);
}

function getRowIndex(row) {
  const numericRow = Number.parseInt(row, 10);

  if (Number.isFinite(numericRow)) {
    return clamp(numericRow, 1, 24);
  }

  const normalized = String(row || 'A').trim().toUpperCase();
  const firstCharacter = normalized.charCodeAt(0);

  if (firstCharacter >= 65 && firstCharacter <= 90) {
    return clamp((firstCharacter - 64), 1, 24);
  }

  return 8;
}

function getSectionAnchor(section, seed) {
  const normalized = String(section || '').trim().toLowerCase();

  if (normalized.includes('vip') && normalized.includes('north')) {
    return { angleDeg: -90, ringBase: 0.34, zoneLabel: 'VIP North' };
  }

  if (normalized.includes('vip') && normalized.includes('south')) {
    return { angleDeg: 90, ringBase: 0.34, zoneLabel: 'VIP South' };
  }

  if (normalized.includes('north') && normalized.includes('west')) {
    return { angleDeg: -135, ringBase: 0.76, zoneLabel: 'North West' };
  }

  if (normalized.includes('north') && normalized.includes('east')) {
    return { angleDeg: -45, ringBase: 0.76, zoneLabel: 'North East' };
  }

  if (normalized.includes('south') && normalized.includes('west')) {
    return { angleDeg: 135, ringBase: 0.76, zoneLabel: 'South West' };
  }

  if (normalized.includes('south') && normalized.includes('east')) {
    return { angleDeg: 45, ringBase: 0.76, zoneLabel: 'South East' };
  }

  if (normalized.includes('north')) {
    return { angleDeg: -90, ringBase: 0.68, zoneLabel: 'North' };
  }

  if (normalized.includes('south')) {
    return { angleDeg: 90, ringBase: 0.68, zoneLabel: 'South' };
  }

  if (normalized.includes('east')) {
    return { angleDeg: 0, ringBase: 0.7, zoneLabel: 'East' };
  }

  if (normalized.includes('west')) {
    return { angleDeg: 180, ringBase: 0.7, zoneLabel: 'West' };
  }

  const fallbackAngles = [-150, -110, -55, 0, 52, 108, 152, 180];
  const angleDeg = fallbackAngles[seed % fallbackAngles.length] + (((seed >> 3) % 18) - 9);

  return {
    angleDeg,
    ringBase: 0.66,
    zoneLabel: String(section || 'Stadium Section')
  };
}

function getLiveLocationModel(request) {
  const liveMapX = toFiniteNumber(request.liveMapX);
  const liveMapY = toFiniteNumber(request.liveMapY);
  const liveLatitude = toFiniteNumber(request.liveLatitude);
  const liveLongitude = toFiniteNumber(request.liveLongitude);
  const liveAccuracy = toFiniteNumber(request.liveAccuracy);

  if (liveMapX !== null && liveMapY !== null) {
    const constrainedPoint = constrainToStadiumBounds(liveMapX, liveMapY);
    const x = constrainedPoint.x;
    const y = constrainedPoint.y;

    return {
      x,
      y,
      glowX: clamp(x, 12, 88),
      glowY: clamp(y, 14, 86),
      signalId: `GPS-${String(request.id).padStart(4, '0')}`,
      zoneLabel: 'User live position',
      liveNote: 'Real device location is active for this request. Seat information remains attached as a fallback if the fan moved.',
      sourceMode: 'gps',
      coordinateLabel: liveLatitude !== null && liveLongitude !== null
        ? `${liveLatitude.toFixed(5)}, ${liveLongitude.toFixed(5)}`
        : 'Unavailable',
      accuracyLabel: liveAccuracy !== null ? `${Math.round(liveAccuracy)} m` : 'Unavailable'
    };
  }

  const section = String(request.section || 'Stadium Section');
  const row = String(request.row || '--');
  const seat = String(request.seat || '--');
  const seed = hashString(`${section}-${row}-${seat}`);
  const rowIndex = getRowIndex(row);
  const seatNumber = Number.parseInt(seat, 10) || ((seed % 18) + 1);
  const anchor = getSectionAnchor(section, seed);
  const rowSpread = (((rowIndex - 1) % 12) / 11) - 0.5;
  const seatSpread = (((seatNumber - 1) % 18) / 17) - 0.5;
  const radius = clamp(anchor.ringBase + (rowSpread * 0.18), 0.24, 0.82);
  const angle = (anchor.angleDeg + (seatSpread * 24)) * (Math.PI / 180);
  const constrainedPoint = constrainToStadiumBounds(
    50 + Math.cos(angle) * (radius * 39),
    50 + Math.sin(angle) * (radius * 31)
  );
  const x = constrainedPoint.x;
  const y = constrainedPoint.y;
  const glowX = clamp(50 + Math.cos(angle) * (radius * 34), 12, 88);
  const glowY = clamp(50 + Math.sin(angle) * (radius * 27), 14, 86);

  return {
    x,
    y,
    glowX,
    glowY,
    signalId: `STDM-${String(seed).slice(-4).padStart(4, '0')}`,
    zoneLabel: anchor.zoneLabel,
    liveNote: 'Seat-linked live approximation generated from the reported stadium position.',
    sourceMode: 'seat',
    coordinateLabel: 'Seat-linked fallback',
    accuracyLabel: 'Seat-linked'
  };
}

function enrichServiceRequest(serviceRequest, ticketMap, config) {
  const linkedTicket = ticketMap.get(serviceRequest.ticketId);

  return {
    id: serviceRequest.id,
    serviceRequest,
    userName: serviceRequest.ownerName || linkedTicket?.ownerName || 'Matchday Fan',
    userEmail: serviceRequest.ownerEmail || '',
    section: serviceRequest.section || linkedTicket?.sectionShort || linkedTicket?.section || '--',
    row: serviceRequest.row || linkedTicket?.row || '--',
    seat: serviceRequest.seat || linkedTicket?.seatNumber || '--',
    incidentType: serviceRequest.title || config.defaultIncident,
    requestTimestamp: serviceRequest.createdAt || serviceRequest.controlQueuedAt || new Date().toISOString(),
    unit: serviceRequest.assignedUnit || config.defaultUnit,
    risk: normalizeRisk(serviceRequest),
    workflowStatus: normalizeWorkflowStatus(serviceRequest),
    badge: serviceRequest.source === 'control-center' ? 'MANUAL DISPATCH' : 'LIVE PORTAL',
    details: serviceRequest.details || 'No additional details',
    ticketId: serviceRequest.ticketId || 'DIRECT',
    liveLatitude: serviceRequest.liveLatitude ?? null,
    liveLongitude: serviceRequest.liveLongitude ?? null,
    liveAccuracy: serviceRequest.liveAccuracy ?? null,
    liveCapturedAt: serviceRequest.liveCapturedAt ?? null,
    liveMapX: serviceRequest.liveMapX ?? null,
    liveMapY: serviceRequest.liveMapY ?? null
  };
}

export async function getBoardData(config) {
  const user = readStorage(STORAGE_KEYS.user, null);
  
  // Fetch tickets from API for accurate count
  let tickets = [];
  try {
    tickets = await api.get('/tickets');
  } catch (err) {
    console.warn('Could not fetch tickets from API, falling back to localStorage');
    tickets = readStorage(STORAGE_KEYS.tickets, []);
  }
  const ticketMap = buildTicketMap(tickets);

  let serviceRequests = [];
  try {
    serviceRequests = await api.get('/requests');
  } catch (err) {
    console.error('Failed to load board data', err);
  }

  const relevantRequests = serviceRequests
    .filter((serviceRequest) => isRelevantUnit(serviceRequest, config.unitType))
    .map((serviceRequest) => enrichServiceRequest(serviceRequest, ticketMap, config))
    .sort((left, right) => new Date(right.requestTimestamp) - new Date(left.requestTimestamp));

  const intake = relevantRequests.filter((request) => (
    request.serviceRequest.source !== 'control-center'
    && !request.serviceRequest.controlQueuedAt
    && request.workflowStatus !== 'DONE'
    && request.workflowStatus !== 'ARCHIVED'
  ));

  const active = relevantRequests
    .filter((request) => (
      (request.serviceRequest.controlQueuedAt || request.serviceRequest.source === 'control-center')
      && request.workflowStatus !== 'ARCHIVED'
    ))
    .sort((left, right) => {
      const leftTime = left.serviceRequest.controlQueuedAt || left.requestTimestamp;
      const rightTime = right.serviceRequest.controlQueuedAt || right.requestTimestamp;
      return new Date(rightTime) - new Date(leftTime);
    });

  const archive = relevantRequests.filter((request) => request.workflowStatus === 'ARCHIVED');

  return {
    user,
    tickets,
    relevantRequests,
    intake,
    active,
    archive
  };
}

export async function updateServiceRequest(serviceId, updater, renderCallback) {
  try {
    const requests = await api.get('/requests');
    const targetRequest = requests.find(r => r.id == serviceId);
    
    if (targetRequest) {
       const updated = updater(targetRequest);
       
       // Create patch payload
       const updates = {};
       const fields = ['title', 'status', 'workflowStatus', 'risk', 'unitType', 'assignedUnit', 'controlQueuedAt', 'handledAt', 'archivedAt'];
       fields.forEach(f => {
         if (updated[f] !== targetRequest[f]) updates[f] = updated[f];
       });

       await api.put(`/requests/${serviceId}`, updates);
       if (renderCallback) renderCallback();
       return true;
    }
  } catch (err) {
    console.error('Failed to update service request', err);
  }
  return false;
}

export async function createManualDispatch(values, config, renderCallback) {
  const newReq = {
    kind: 'assistance',
    title: values.incidentType,
    subtitle: `Section ${values.section} | Row ${values.row} Seat ${values.seat}`,
    status: config.statusText.queued,
    workflowStatus: 'PENDING',
    details: `Priority ${config.riskLabels[values.risk]}`,
    notes: 'Created manually inside the control deck.',
    ticketId: `MANUAL-${String(Date.now()).slice(-6)}`,
    ownerEmail: '',
    ownerName: values.userName,
    ownerPhone: '',
    unitType: config.unitType,
    section: values.section,
    row: values.row,
    seat: values.seat,
    risk: values.risk,
    source: 'control-center',
    assignedUnit: values.unit
  };

  try {
    await api.post('/requests', newReq);
    if (renderCallback) renderCallback();
  } catch (err) {
    console.error('Failed to create manual dispatch', err);
  }
}

function createIncidentCard(request, config) {
  const card = document.createElement('div');
  card.className = 'incident-item';
  card.dataset.requestId = request.id;
  card.dataset.userName = request.userName;
  card.dataset.section = request.section;
  card.dataset.row = request.row;
  card.dataset.seat = request.seat;
  card.dataset.incidentType = request.incidentType;
  card.dataset.unit = request.unit;
  card.dataset.risk = request.risk;
  card.dataset.requestTimestamp = request.requestTimestamp;
  const badgeLabel = request.serviceRequest.source === 'control-center' ? 'DISPATCH MAP' : 'LIVE LOCATION';

  card.innerHTML = `
    <div class="incident-header">
      <span class="incident-header-meta">
        <button type="button" class="incident-badge incident-badge-action" title="Open live location map">${escapeHtml(badgeLabel)}</button>
        <span class="incident-detail">${escapeHtml(request.incidentType)}</span>
        <span class="risk-badge ${getRiskClass(request.risk)}">${escapeHtml(config.riskLabels[request.risk])}</span>
      </span>
      <button type="button" class="delete-btn" data-request-id="${escapeHtml(request.id)}" aria-label="Archive request">🗑️</button>
    </div>
    <div class="incident-info">
      <p>Name: ${escapeHtml(request.userName)}</p>
      <p>Location: Section ${escapeHtml(request.section)} • Row ${escapeHtml(request.row)} • Seat ${escapeHtml(request.seat)}</p>
      <p>Ticket: ${escapeHtml(request.ticketId)}</p>
      <p class="time-elapsed">TIME: ${escapeHtml(formatClock(request.requestTimestamp))}</p>
    </div>
    <div class="incident-status">
      <span class="incident-unit">${escapeHtml(request.unit)}</span>
      <span class="incident-route status ${getStatusClass(request.workflowStatus)}">${escapeHtml(getStatusLabel(request.workflowStatus))}</span>
    </div>
    <div class="status-selector" style="display: none;">
      <button type="button" class="status-btn processing" data-status="PROCESSING">🟠 PROCESSING</button>
      <button type="button" class="status-btn done" data-status="DONE">✅ DONE</button>
    </div>
  `;

  card.classList.add(getRiskClass(request.risk));
  return card;
}

function createArchiveCard(request, config) {
  const card = document.createElement('div');
  card.className = 'incident-item archive-item';
  card.dataset.requestId = request.id;
  card.dataset.userName = request.userName;
  card.dataset.section = request.section;
  card.dataset.row = request.row;
  card.dataset.seat = request.seat;
  card.dataset.incidentType = request.incidentType;
  card.dataset.unit = request.unit;
  card.dataset.risk = request.risk;
  card.dataset.requestTimestamp = request.requestTimestamp;

  card.innerHTML = `
    <div class="incident-header">
      <span class="incident-header-meta">
        <span class="incident-badge">ARCHIVED</span>
        <span class="incident-detail">${escapeHtml(request.incidentType)}</span>
        <span class="risk-badge ${getRiskClass(request.risk)}">${escapeHtml(config.riskLabels[request.risk])}</span>
      </span>
      <span class="incident-route status archived">${escapeHtml(request.serviceRequest.status || config.statusText.done)}</span>
    </div>
    <div class="incident-info">
      <p>Name: ${escapeHtml(request.userName)}</p>
      <p>Location: Section ${escapeHtml(request.section)} • Row ${escapeHtml(request.row)} • Seat ${escapeHtml(request.seat)}</p>
      <p class="time-elapsed">TIME: ${escapeHtml(formatClock(request.requestTimestamp))}</p>
    </div>
    <div class="incident-status">
      <span class="incident-unit">${escapeHtml(request.unit)}</span>
    </div>
  `;

  return card;
}

export function initControlBoard(config) {
  if (!hasControlAccess() && !isLocalApiMode) {
    window.location.href = pageUrls.home;
    return;
  }

  const elements = {
    searchBar: document.querySelector('.search-bar'),
    newDispatchBtn: document.querySelector('.new-dispatch-btn'),
    newDispatchModal: document.getElementById('newDispatchModal'),
    newDispatchForm: document.getElementById('newDispatchForm'),
    dispatchModalClose: document.querySelector('.dispatch-modal-close'),
    cancelBtn: document.querySelector('.cancel-btn'),
    riskButtonsModal: document.querySelectorAll('.risk-btn-modal'),
    summaryLabel: document.getElementById('summaryLabel'),
    summaryNote: document.getElementById('summaryNote'),
    summaryUserName: document.getElementById('summaryUserName'),
    summarySection: document.getElementById('summarySection'),
    summaryRow: document.getElementById('summaryRow'),
    summarySeat: document.getElementById('summarySeat'),
    summaryIncidentType: document.getElementById('summaryIncidentType'),
    summaryElapsed: document.getElementById('summaryElapsed'),
    summaryUnit: document.getElementById('summaryUnit'),
    currentRiskDisplay: document.getElementById('currentRiskDisplay'),
    riskButtons: document.querySelectorAll('.risk-btn'),
    addRequestBtn: document.getElementById('addRequestBtn'),
    priorityQueue: document.getElementById('priorityQueue'),
    archiveQueue: document.getElementById('archiveQueue'),
    archiveSection: document.getElementById('archiveSection'),
    archiveToggleBtn: document.getElementById('archiveToggleBtn'),
    dispatchStatusText: document.querySelector('.dispatch-status'),
    incomingRequestCard: document.getElementById('incomingRequestCard'),
    ticketCount: document.getElementById('board-ticket-count'),
    requestCount: document.getElementById('board-request-count'),
    syncTime: document.getElementById('board-sync-time'),
    syncMeta: document.getElementById('control-sync-meta')
  };

  const state = {
    currentIncomingId: '',
    selectedRisk: 'HIGH',
    selectedRiskModal: 'HIGH',
    requestLookup: new Map()
  };

  const setRiskButtons = (risk) => {
    state.selectedRisk = risk;

    elements.riskButtons.forEach((button) => {
      const isActive = button.dataset.risk === risk;
      button.classList.toggle('active', isActive);
    });

    if (elements.currentRiskDisplay) {
      elements.currentRiskDisplay.textContent = config.riskLabels[risk];
      elements.currentRiskDisplay.className = `risk-level-${risk === 'HIGH' ? 'high' : risk === 'RISK' ? 'warning' : 'normal'}`;
    }
  };

  const setModalRiskButtons = (risk) => {
    state.selectedRiskModal = risk;

    elements.riskButtonsModal.forEach((button) => {
      const isActive = button.dataset.risk === risk;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  const closeModal = () => {
    elements.newDispatchModal.classList.remove('active');
    elements.newDispatchModal.setAttribute('aria-hidden', 'true');
  };

  const openModal = () => {
    elements.newDispatchModal.classList.add('active');
    elements.newDispatchModal.setAttribute('aria-hidden', 'false');
    elements.newDispatchForm.reset();
    setModalRiskButtons('HIGH');
    document.getElementById('dispatchUserName').focus();
  };

  const ensureLocationModal = () => {
    let modal = document.getElementById('board-location-modal');

    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="board-location-modal" class="board-location-modal" aria-hidden="true">
          <div class="board-location-dialog" role="dialog" aria-modal="true" aria-labelledby="board-location-title">
            <button type="button" class="board-location-close" id="board-location-close" aria-label="Close live location">&times;</button>
            <div class="board-location-header">
              <span class="board-location-kicker" id="board-location-kicker">LIVE LOCATION</span>
              <h3 id="board-location-title">Seat-linked stadium map</h3>
              <p id="board-location-subtitle">A live stadium pin linked to the fan request.</p>
            </div>
            <div class="board-location-layout">
              <div class="board-location-map-shell">
                <div class="board-location-map-hud">
                  <span class="board-location-map-chip">Live seat-linked radar</span>
                  <span class="board-location-map-chip board-location-map-chip-secondary">Hover or focus the pin to inspect the dispatch.</span>
                </div>
                <img src="${LIVE_LOCATION_MAP_ASSET}" alt="Stadium live location map" class="board-location-map-image" />
                <div id="board-location-glow" class="board-location-glow"></div>
                <div id="board-location-marker" class="board-location-marker">
                  <div class="board-location-pin" id="board-location-pin" tabindex="0" role="button" aria-describedby="board-location-tooltip" aria-label="Live location pin">
                    <svg class="board-location-pin-svg" viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <ellipse cx="20" cy="53" rx="7" ry="2.5" fill="rgba(0,0,0,0.28)"/>
                      <path class="board-location-pin-body" d="M20 1C11.716 1 5 7.716 5 16C5 27.5 20 51 20 51C20 51 35 27.5 35 16C35 7.716 28.284 1 20 1Z"/>
                      <circle cx="20" cy="16" r="8" fill="rgba(255,255,255,0.18)"/>
                      <circle cx="20" cy="16" r="5" fill="white"/>
                      <circle cx="18.5" cy="14.5" r="2" fill="rgba(0,0,0,0.12)"/>
                      <defs>
                        <linearGradient id="boardPinGradAmb" x1="20" y1="1" x2="20" y2="51" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stop-color="#fb923c"/>
                          <stop offset="100%" stop-color="#dc2626"/>
                        </linearGradient>
                        <linearGradient id="boardPinGradPol" x1="20" y1="1" x2="20" y2="51" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stop-color="#38bdf8"/>
                          <stop offset="100%" stop-color="#1d4ed8"/>
                        </linearGradient>
                      </defs>
                    </svg>
                    <span class="board-location-pin-ring"></span>
                    <span class="board-location-pin-pulse"></span>
                  </div>
                  <div id="board-location-tooltip" class="board-location-tooltip" aria-hidden="true">
                    <div class="board-location-tooltip-row"><span>Section</span><strong id="board-location-tip-section">--</strong></div>
                    <div class="board-location-tooltip-row"><span>Row</span><strong id="board-location-tip-row">--</strong></div>
                    <div class="board-location-tooltip-row"><span>Seat</span><strong id="board-location-tip-seat">--</strong></div>
                    <div class="board-location-tooltip-row"><span>Zone</span><strong id="board-location-tip-zone">--</strong></div>
                    <div class="board-location-tooltip-row"><span>Unit</span><strong id="board-location-tip-unit">--</strong></div>
                    <div class="board-location-tooltip-row"><span>Risk</span><strong id="board-location-tip-risk">--</strong></div>
                    <div class="board-location-tooltip-row"><span>Signal</span><strong id="board-location-tip-signal">--</strong></div>
                    <div class="board-location-tooltip-arrow"></div>
                  </div>
                </div>
                <div id="board-location-tag" class="board-location-tag">Section -- • Row -- • Seat --</div>
              </div>
              <div class="board-location-sidebar">
                <div class="board-location-profile">
                  <div class="board-location-profile-top">
                    <span id="board-location-profile-label" class="board-location-profile-label">LIVE PORTAL</span>
                    <span id="board-location-risk" class="board-location-risk" data-tone="normal">Normal</span>
                  </div>
                  <strong id="board-location-profile-name" class="board-location-profile-name">Matchday Fan</strong>
                  <p id="board-location-profile-incident" class="board-location-profile-incident">Seat-linked dispatch preview.</p>
                  <div class="board-location-profile-grid">
                    <div class="board-location-profile-item"><span>Unit</span><strong id="board-location-unit">--</strong></div>
                    <div class="board-location-profile-item"><span>Ticket</span><strong id="board-location-ticket">--</strong></div>
                    <div class="board-location-profile-item"><span>Location Source</span><strong id="board-location-source">--</strong></div>
                    <div class="board-location-profile-item"><span>Accuracy</span><strong id="board-location-accuracy">--</strong></div>
                  </div>
                </div>
                <div class="board-location-stat-grid">
                  <div class="board-location-stat"><span>Section</span><strong id="board-location-section">--</strong></div>
                  <div class="board-location-stat"><span>Row</span><strong id="board-location-row">--</strong></div>
                  <div class="board-location-stat"><span>Seat</span><strong id="board-location-seat">--</strong></div>
                  <div class="board-location-stat"><span>Zone</span><strong id="board-location-zone">--</strong></div>
                  <div class="board-location-stat"><span>Signal</span><strong id="board-location-signal">--</strong></div>
                  <div class="board-location-stat"><span>Updated</span><strong id="board-location-updated">--</strong></div>
                </div>
                <div class="board-location-live-strip">
                  <span class="board-location-live-dot"></span>
                  <span id="board-location-live-copy">Live seat-linked request signal</span>
                </div>
                <p id="board-location-note" class="board-location-note">Seat-linked location preview.</p>
              </div>
            </div>
          </div>
        </div>
      `);

      modal = document.getElementById('board-location-modal');
    }

    return {
      modal,
      dialog: modal.querySelector('.board-location-dialog'),
      close: document.getElementById('board-location-close'),
      kicker: document.getElementById('board-location-kicker'),
      title: document.getElementById('board-location-title'),
      subtitle: document.getElementById('board-location-subtitle'),
      glow: document.getElementById('board-location-glow'),
      marker: document.getElementById('board-location-marker'),
      pin: document.getElementById('board-location-pin'),
      tooltip: document.getElementById('board-location-tooltip'),
      tipSection: document.getElementById('board-location-tip-section'),
      tipRow: document.getElementById('board-location-tip-row'),
      tipSeat: document.getElementById('board-location-tip-seat'),
      tipZone: document.getElementById('board-location-tip-zone'),
      tipUnit: document.getElementById('board-location-tip-unit'),
      tipRisk: document.getElementById('board-location-tip-risk'),
      tipSignal: document.getElementById('board-location-tip-signal'),
      tag: document.getElementById('board-location-tag'),
      profileLabel: document.getElementById('board-location-profile-label'),
      risk: document.getElementById('board-location-risk'),
      profileName: document.getElementById('board-location-profile-name'),
      profileIncident: document.getElementById('board-location-profile-incident'),
      unit: document.getElementById('board-location-unit'),
      ticket: document.getElementById('board-location-ticket'),
      source: document.getElementById('board-location-source'),
      accuracy: document.getElementById('board-location-accuracy'),
      section: document.getElementById('board-location-section'),
      row: document.getElementById('board-location-row'),
      seat: document.getElementById('board-location-seat'),
      zone: document.getElementById('board-location-zone'),
      signal: document.getElementById('board-location-signal'),
      updated: document.getElementById('board-location-updated'),
      note: document.getElementById('board-location-note'),
      liveCopy: document.getElementById('board-location-live-copy')
    };
  };

  const locationModal = ensureLocationModal();

  const closeLocationModal = () => {
    locationModal.modal.classList.remove('is-open');
    locationModal.modal.setAttribute('aria-hidden', 'true');
  };

  const openLocationModal = (request) => {
    const location = getLiveLocationModel(request);
    const hasPreciseLocation = location.sourceMode === 'gps';
    const unitLabel = config.unitType === 'police' ? 'POLICE LIVE LOCATION' : 'MEDICAL LIVE LOCATION';
    const refreshedAt = request.liveCapturedAt || request.serviceRequest.lastTouchedAt || request.serviceRequest.controlQueuedAt || request.requestTimestamp;
    const detailsNote = request.details && request.details !== 'No additional details'
      ? request.details
      : '';
    const markerLeft = clamp(location.x, 14, 86);
    const markerTop = clamp(location.y, 14, 86);
    const tagLeft = clamp(markerLeft, 18, 82);
    const tagTop = markerTop > 70
      ? clamp(markerTop - 18, 14, 70)
      : clamp(markerTop + 8, 18, 82);

    locationModal.dialog.dataset.unit = config.unitType;
    locationModal.kicker.textContent = unitLabel;
    locationModal.title.textContent = `${request.userName} • ${request.incidentType}`;
    locationModal.subtitle.textContent = hasPreciseLocation
      ? `User live location is active. Section ${request.section || '--'} • Row ${request.row || '--'} • Seat ${request.seat || '--'} stays attached as fallback.`
      : `Section ${request.section || '--'} • Row ${request.row || '--'} • Seat ${request.seat || '--'} • ${request.badge}`;
    locationModal.profileLabel.textContent = hasPreciseLocation ? 'USER LIVE LOCATION' : request.badge;
    locationModal.risk.textContent = config.riskLabels[request.risk];
    locationModal.risk.dataset.tone = String(request.risk || 'NORMAL').toLowerCase();
    locationModal.profileName.textContent = request.userName;
    locationModal.profileIncident.textContent = request.incidentType;
    locationModal.unit.textContent = request.unit;
    locationModal.ticket.textContent = String(request.ticketId || '--');
    locationModal.source.textContent = hasPreciseLocation ? 'Device GPS' : 'Seat fallback';
    locationModal.accuracy.textContent = location.accuracyLabel;
    locationModal.section.textContent = String(request.section || '--');
    locationModal.row.textContent = String(request.row || '--');
    locationModal.seat.textContent = String(request.seat || '--');
    locationModal.zone.textContent = location.zoneLabel;
    locationModal.signal.textContent = location.signalId;
    locationModal.updated.textContent = formatSyncTime(refreshedAt);
    locationModal.liveCopy.textContent = hasPreciseLocation
      ? `${request.unit} control is actively tracking the user's live location now.`
      : `${request.unit} control is actively tracking this seat-linked signal.`;
    locationModal.note.textContent = [location.liveNote, detailsNote].filter(Boolean).join(' ');
    locationModal.glow.style.left = `${location.glowX}%`;
    locationModal.glow.style.top = `${location.glowY}%`;
    locationModal.marker.style.left = `${markerLeft}%`;
    locationModal.marker.style.top = `${markerTop}%`;
    locationModal.tag.style.left = `${tagLeft}%`;
    locationModal.tag.style.top = `${tagTop}%`;
    locationModal.tag.textContent = hasPreciseLocation
      ? `User live location • ${location.coordinateLabel}`
      : `Section ${request.section || '--'} • Row ${request.row || '--'} • Seat ${request.seat || '--'}`;
    locationModal.pin.setAttribute('aria-label', hasPreciseLocation
      ? `Live user location pin for ${request.userName}`
      : `Live location pin for ${request.userName}, section ${request.section || '--'}, row ${request.row || '--'}, seat ${request.seat || '--'}`);

    locationModal.tipSection.textContent = String(request.section || '--');
    locationModal.tipRow.textContent = String(request.row || '--');
    locationModal.tipSeat.textContent = String(request.seat || '--');
    locationModal.tipZone.textContent = location.zoneLabel;
    locationModal.tipUnit.textContent = String(request.unit || '--');
    locationModal.tipRisk.textContent = config.riskLabels[request.risk];
    locationModal.tipSignal.textContent = location.signalId;

    locationModal.modal.classList.add('is-open');
    locationModal.modal.setAttribute('aria-hidden', 'false');
    locationModal.close.focus();
  };

  locationModal.close.addEventListener('click', closeLocationModal);
  locationModal.modal.addEventListener('click', (event) => {
    if (event.target === locationModal.modal) {
      closeLocationModal();
    }
  });

  const updateElapsedTimes = () => {
    document.querySelectorAll('.incident-item[data-request-timestamp]').forEach((card) => {
      const elapsedNode = card.querySelector('.time-elapsed');

      if (!elapsedNode) {
        return;
      }

      elapsedNode.textContent = `TIME: ${formatClock(card.dataset.requestTimestamp)}`;
    });
  };

  const renderSummary = (incomingRequest) => {
    if (!incomingRequest) {
      state.currentIncomingId = '';
      elements.summaryLabel.textContent = 'READY FOR MANUAL DISPATCH';
      elements.summaryUserName.textContent = config.emptySummaryTitle;
      elements.summaryNote.textContent = 'No live portal request is waiting. Use NEW DISPATCH to log an operator-created case.';
      elements.summarySection.textContent = '--';
      elements.summaryRow.textContent = '--';
      elements.summarySeat.textContent = '--';
      elements.summaryIncidentType.value = config.defaultIncident;
      elements.summaryElapsed.textContent = 'SYNCED';
      elements.summaryUnit.textContent = config.defaultUnit;
      elements.addRequestBtn.disabled = true;
      elements.addRequestBtn.textContent = 'QUEUE WAITING';
      elements.incomingRequestCard.classList.add('is-empty');
      setRiskButtons('NORMAL');
      return;
    }

    state.currentIncomingId = incomingRequest.id;
    elements.summaryLabel.textContent = 'INCOMING PORTAL REQUEST';
    elements.summaryUserName.textContent = incomingRequest.userName.toUpperCase();
    elements.summaryNote.textContent = 'Review the newest linked request, adjust the risk level, then add it to the active queue.';
    elements.summarySection.textContent = incomingRequest.section;
    elements.summaryRow.textContent = incomingRequest.row;
    elements.summarySeat.textContent = incomingRequest.seat;
    elements.summaryIncidentType.value = incomingRequest.incidentType;
    elements.summaryElapsed.textContent = formatClock(incomingRequest.requestTimestamp);
    elements.summaryUnit.textContent = incomingRequest.unit;
    elements.addRequestBtn.disabled = false;
    elements.addRequestBtn.textContent = 'ADD REQUEST TO QUEUE';
    elements.incomingRequestCard.classList.remove('is-empty');
    setRiskButtons(incomingRequest.risk);
  };

  const renderQueue = (requests) => {
    elements.priorityQueue.innerHTML = '<h3 class="queue-title">PRIORITY QUEUE</h3>';

    if (requests.length === 0) {
      elements.priorityQueue.insertAdjacentHTML('beforeend', '<div class="empty-queue">No active dispatches yet. Add the incoming request to the queue or create one manually.</div>');
      return;
    }

    requests.forEach((request) => {
      elements.priorityQueue.appendChild(createIncidentCard(request, config));
    });
  };

  const renderArchive = (requests) => {
    elements.archiveQueue.innerHTML = '';

    if (requests.length === 0) {
      elements.archiveQueue.innerHTML = '<div class="empty-queue">Archived dispatches will appear here once operators close them.</div>';
      return;
    }

    requests.forEach((request) => {
      elements.archiveQueue.appendChild(createArchiveCard(request, config));
    });
  };

  const renderOverview = (data) => {
    const latestRequest = data.relevantRequests[0];

    elements.ticketCount.textContent = String(data.tickets.length);
    elements.requestCount.textContent = String(data.active.length + data.intake.length);
    elements.syncTime.textContent = formatSyncTime(latestRequest?.serviceRequest.lastTouchedAt || latestRequest?.serviceRequest.createdAt);
    elements.syncMeta.textContent = data.intake.length
      ? `${data.intake.length} live portal request${data.intake.length === 1 ? '' : 's'} waiting for review.`
      : 'All linked requests are already queued or resolved.';
  };

  const renderStatusCounts = (data) => {
    const doneCount = data.archive.length;
    const processingCount = data.active.filter((request) => request.workflowStatus === 'PROCESSING').length;
    const pendingCount = data.active.filter((request) => request.workflowStatus === 'PENDING').length + data.intake.length;

    elements.dispatchStatusText.textContent = ` • ${doneCount} Done • ${processingCount} Processing • ${pendingCount} PENDING`;
  };

  const applySearch = (query) => {
    const normalizedQuery = query.trim().toLowerCase();

    document.querySelectorAll('.incident-item').forEach((card) => {
      const haystack = [
        card.dataset.userName,
        card.dataset.section,
        card.dataset.row,
        card.dataset.seat,
        card.dataset.incidentType,
        card.dataset.unit,
        card.dataset.risk
      ].join(' ').toLowerCase();

      card.style.display = !normalizedQuery || haystack.includes(normalizedQuery) ? 'block' : 'none';
    });
  };

  const renderBoard = async () => {
    const data = await getBoardData(config);
    state.requestLookup = new Map(data.relevantRequests.map((request) => [request.id, request]));
    renderOverview(data);
    renderSummary(data.intake[0]);
    renderQueue(data.active);
    renderArchive(data.archive);
    renderStatusCounts(data);
    updateElapsedTimes();
    applySearch(elements.searchBar?.value || '');
  };

  elements.newDispatchBtn?.addEventListener('click', openModal);
  elements.dispatchModalClose?.addEventListener('click', closeModal);
  elements.cancelBtn?.addEventListener('click', closeModal);

  elements.newDispatchModal?.addEventListener('click', (event) => {
    if (event.target === elements.newDispatchModal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.newDispatchModal.classList.contains('active')) {
      closeModal();
    }

    if (event.key === 'Escape' && locationModal.modal.classList.contains('is-open')) {
      closeLocationModal();
    }
  });

  elements.riskButtonsModal.forEach((button) => {
    button.addEventListener('click', () => {
      setModalRiskButtons(button.dataset.risk);
    });
  });

  elements.riskButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setRiskButtons(button.dataset.risk);
    });
  });

  elements.addRequestBtn?.addEventListener('click', () => {
    if (!state.currentIncomingId) {
      return;
    }

    const timestamp = new Date().toISOString();

    updateServiceRequest(state.currentIncomingId, (serviceRequest) => ({
      ...serviceRequest,
      title: elements.summaryIncidentType.value.trim() || serviceRequest.title || config.defaultIncident,
      risk: state.selectedRisk,
      unitType: serviceRequest.unitType || config.unitType,
      assignedUnit: serviceRequest.assignedUnit || config.defaultUnit,
      controlQueuedAt: timestamp,
      workflowStatus: 'PENDING',
      status: config.statusText.queued,
      lastTouchedAt: timestamp
    }), renderBoard);

    elements.addRequestBtn.textContent = 'REQUEST ADDED';
    elements.addRequestBtn.classList.add('added');
    window.setTimeout(() => {
      elements.addRequestBtn.classList.remove('added');

    }, 500);
  });

  elements.newDispatchForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    const userName = document.getElementById('dispatchUserName').value.trim();
    const section = document.getElementById('dispatchSection').value.trim();
    const row = document.getElementById('dispatchRow').value.trim();
    const seat = document.getElementById('dispatchSeat').value.trim();
    const incidentType = document.getElementById('dispatchIncidentType').value.trim();
    const unit = document.getElementById('dispatchUnit').value.trim();

    if (!userName || !section || !row || !seat || !incidentType || !unit) {
      showBoardModal('error', {
        title: 'MISSING FIELDS',
        desc: 'Please fill in all required fields before creating a dispatch.'
      });
      return;
    }

    createManualDispatch({
      userName,
      section,
      row,
      seat,
      incidentType,
      unit,
      risk: state.selectedRiskModal
    }, config, renderBoard);

    closeModal();
  });

  elements.archiveToggleBtn?.addEventListener('click', () => {
    elements.archiveSection.classList.toggle('collapsed');
    const isExpanded = !elements.archiveSection.classList.contains('collapsed');
    elements.archiveQueue.classList.toggle('hidden', !isExpanded);
    elements.archiveToggleBtn.setAttribute('aria-expanded', String(isExpanded));
    elements.archiveToggleBtn.setAttribute('aria-label', isExpanded ? 'Hide archive' : 'Show archive');
  });

  elements.searchBar?.addEventListener('input', (event) => {
    applySearch(event.target.value);
  });

  document.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.delete-btn');

    if (deleteButton) {
      event.stopPropagation();
      const requestId = deleteButton.dataset.requestId;

      showBoardModal('password', {
        title: 'ARCHIVE AUTHORIZATION',
        desc: 'Enter the password to archive this dispatch from the live queue.',
        onConfirm: () => {
          showBoardModal('confirm', {
            title: 'CONFIRM ARCHIVE',
            desc: 'This dispatch will be moved from the live queue to the archive. This action cannot be undone.',
            onConfirm: () => {
              const timestamp = new Date().toISOString();
              updateServiceRequest(requestId, (serviceRequest) => ({
                ...serviceRequest,
                workflowStatus: 'ARCHIVED',
                status: config.statusText.archived,
                archivedAt: timestamp,
                lastTouchedAt: timestamp
              }), renderBoard);
            }
          });
        }
      });
      return;
    }

    const statusButton = event.target.closest('.status-btn');

    if (statusButton) {
      event.stopPropagation();
      const card = statusButton.closest('.incident-item');
      const nextStatus = statusButton.dataset.status;
      const timestamp = new Date().toISOString();

      updateServiceRequest(card.dataset.requestId, (serviceRequest) => ({
        ...serviceRequest,
        workflowStatus: nextStatus,
        status: nextStatus === 'PROCESSING' ? config.statusText.processing : config.statusText.done,
        handledAt: nextStatus === 'DONE' ? timestamp : serviceRequest.handledAt,
        archivedAt: nextStatus === 'DONE' ? timestamp : serviceRequest.archivedAt,
        lastTouchedAt: timestamp
      }), renderBoard);
      return;
    }

    const badgeButton = event.target.closest('.incident-badge-action');

    if (badgeButton && badgeButton.closest('.incident-item')) {
      const card = badgeButton.closest('.incident-item');
      const request = state.requestLookup.get(String(card.dataset.requestId || ''));

      if (request) {
        openLocationModal(request);
      }

      return;
    }

    const card = event.target.closest('.incident-item');

    if (!card || card.classList.contains('archive-item')) {
      return;
    }

    const selector = card.querySelector('.status-selector');

    document.querySelectorAll('.status-selector').forEach((node) => {
      if (node !== selector) {
        node.style.display = 'none';
      }
    });

    selector.style.display = selector.style.display === 'flex' ? 'none' : 'flex';
  });

  api.connectSSE();
  api.on('new-request', renderBoard);
  api.on('update-request', renderBoard);

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.tickets) {
      renderBoard();
    }
  });
  window.setInterval(updateElapsedTimes, 1000);

  renderBoard();
}