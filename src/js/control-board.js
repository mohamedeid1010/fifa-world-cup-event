const STORAGE_KEYS = {
  user: 'fifa-matchday-user',
  tickets: 'fifa-matchday-tickets',
  services: 'fifa-matchday-services'
};

const CONTROL_ACCESS_KEY = 'fifa-control-access';

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

  if (text.includes('high')) {
    return 'HIGH';
  }

  if (text.includes('moderate')) {
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
  return new Map(tickets.map((ticket) => [ticket.ticketId, ticket]));
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
    ticketId: serviceRequest.ticketId || 'DIRECT'
  };
}

function getBoardData(config) {
  const user = readStorage(STORAGE_KEYS.user, null);
  const tickets = readStorage(STORAGE_KEYS.tickets, []);
  const ticketMap = buildTicketMap(tickets);

  const relevantRequests = readStorage(STORAGE_KEYS.services, [])
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

function updateServiceRequest(serviceId, updater) {
  const serviceRequests = readStorage(STORAGE_KEYS.services, []);
  let wasUpdated = false;

  const nextRequests = serviceRequests.map((serviceRequest) => {
    if (serviceRequest.id !== serviceId) {
      return serviceRequest;
    }

    wasUpdated = true;
    return updater(serviceRequest);
  });

  if (!wasUpdated) {
    return false;
  }

  writeStorage(STORAGE_KEYS.services, nextRequests);
  return true;
}

function createManualDispatch(values, config) {
  const serviceRequests = readStorage(STORAGE_KEYS.services, []);
  const timestamp = new Date().toISOString();

  serviceRequests.unshift({
    id: `REQ-${Date.now()}`,
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
    assignedUnit: values.unit,
    createdAt: timestamp,
    controlQueuedAt: timestamp,
    lastTouchedAt: timestamp
  });

  writeStorage(STORAGE_KEYS.services, serviceRequests);
}

function openLocationInMaps(request) {
  const baseLat = 47.5952;
  const baseLng = -122.3316;
  const sectionSeed = Array.from(String(request.section || '100')).reduce((total, character) => total + character.charCodeAt(0), 0);
  const sectionAngle = (sectionSeed % 360) * (Math.PI / 180);
  const radius = 0.0007;
  const rowCode = String(request.row || 'A').charCodeAt(0) - 65;
  const seatNumber = Number.parseInt(request.seat, 10) || 1;

  const finalLat = baseLat + Math.cos(sectionAngle) * radius + rowCode * 0.00004;
  const finalLng = baseLng + Math.sin(sectionAngle) * radius + seatNumber * 0.00001;
  window.open(`https://www.google.com/maps?q=${finalLat},${finalLng}&ll=${finalLat},${finalLng}&z=20`, '_blank');
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

  card.innerHTML = `
    <div class="incident-header">
      <span class="incident-header-meta">
        <button type="button" class="incident-badge">${escapeHtml(request.badge)}</button>
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
  if (!hasControlAccess()) {
    window.location.href = '/';
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

  const renderBoard = () => {
    const data = getBoardData(config);
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
    }));

    elements.addRequestBtn.textContent = 'REQUEST ADDED';
    elements.addRequestBtn.classList.add('added');
    window.setTimeout(() => {
      elements.addRequestBtn.classList.remove('added');
      renderBoard();
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
      alert('Please fill in all required fields.');
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
    }, config);

    closeModal();
    renderBoard();
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
      const password = prompt('Enter password to archive this dispatch:');

      if (password !== 'Noor') {
        alert('Incorrect password. Archiving cancelled.');
        return;
      }

      if (!confirm('Archive this dispatch and remove it from the live queue?')) {
        return;
      }

      const timestamp = new Date().toISOString();

      updateServiceRequest(requestId, (serviceRequest) => ({
        ...serviceRequest,
        workflowStatus: 'ARCHIVED',
        status: config.statusText.archived,
        archivedAt: timestamp,
        lastTouchedAt: timestamp
      }));
      renderBoard();
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
      }));
      renderBoard();
      return;
    }

    const badgeButton = event.target.closest('.incident-badge');

    if (badgeButton && badgeButton.closest('.incident-item')) {
      const card = badgeButton.closest('.incident-item');
      const request = state.requestLookup.get(card.dataset.requestId);

      if (request) {
        openLocationInMaps(request);
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

  window.addEventListener('storage', renderBoard);
  window.setInterval(updateElapsedTimes, 1000);

  renderBoard();
}