const STORAGE_KEYS = {
  user: 'fifa-matchday-user',
  tickets: 'fifa-matchday-tickets',
  services: 'fifa-matchday-services'
};

const CONTROL_ACCESS_KEY = 'fifa-control-access';

const ACCESS_CODES = {
  police: '123456',
  medical: '654321'
};

let selectedRole = null;

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

function countRequestsByUnit(serviceRequests, unitType) {
  return serviceRequests.filter((request) => {
    if (request.kind !== 'assistance') {
      return false;
    }

    const explicitUnit = String(request.unitType || '').toLowerCase();

    if (explicitUnit) {
      return explicitUnit === unitType;
    }

    const title = String(request.title || '').toLowerCase();

    if (unitType === 'ambulance') {
      return title.includes('ambulance') || title.includes('medical');
    }

    return title.includes('police');
  }).length;
}

function formatSyncTime(value) {
  if (!value) {
    return 'Waiting for portal activity';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

import { api } from './api.js';

async function renderPortalSync() {
  const tickets = readStorage(STORAGE_KEYS.tickets, []);
  let serviceRequests = [];
  try {
    serviceRequests = await api.get('/requests');
  } catch (err) {
    console.error('Failed to load service requests', err);
  }

  const latestRequest = serviceRequests[0];
  const latestSync = latestRequest?.lastTouchedAt || latestRequest?.handledAt || latestRequest?.archivedAt || latestRequest?.controlQueuedAt || latestRequest?.createdAt || tickets[0]?.purchasedAt;

  document.getElementById('linked-ticket-count').textContent = String(tickets.length);
  document.getElementById('linked-police-count').textContent = String(countRequestsByUnit(serviceRequests, 'police'));
  document.getElementById('linked-medical-count').textContent = String(countRequestsByUnit(serviceRequests, 'ambulance'));
  document.getElementById('linked-last-sync').textContent = formatSyncTime(latestSync);
}

function grantControlAccess(role) {
  localStorage.setItem(CONTROL_ACCESS_KEY, JSON.stringify({
    grantedAt: new Date().toISOString(),
    source: 'control-center',
    role
  }));
}

document.addEventListener('DOMContentLoaded', () => {
  if (!hasControlAccess()) {
    window.location.href = '/';
    return;
  }

  const policeCard = document.querySelector('.police-card');
  const medicalCard = document.querySelector('.medical-card');
  const codeModal = document.getElementById('codeModal');
  const codeInput = document.getElementById('codeInput');
  const codeDisplay = document.getElementById('codeDisplay');
  const codeTitle = document.getElementById('codeTitle');
  const codeCancelBtn = document.getElementById('codeCancelBtn');
  const codeSubmitBtn = document.getElementById('codeSubmitBtn');
  const codeCloseBtn = document.getElementById('codeCloseBtn');
  const codeMessage = document.getElementById('codeMessage');

  const hideModal = () => {
    codeModal.classList.remove('active');
    codeMessage.textContent = '';
    codeMessage.classList.remove('error', 'success');
  };

  const showCodeModal = (role, title) => {
    selectedRole = role;
    codeTitle.textContent = `${title} - ENTER CODE`;
    codeInput.value = '';
    codeDisplay.textContent = '○ ○ ○ ○ ○ ○';
    codeMessage.textContent = '';
    codeMessage.classList.remove('error', 'success');
    codeModal.classList.remove('medical', 'police');
    codeModal.classList.add('active', role);
    window.setTimeout(() => codeInput.focus(), 80);
  };

  const validateCode = () => {
    const enteredCode = codeInput.value.trim();

    if (enteredCode !== ACCESS_CODES[selectedRole]) {
      codeMessage.textContent = '✗ Invalid Code';
      codeMessage.classList.remove('success');
      codeMessage.classList.add('error');
      codeInput.value = '';
      codeDisplay.textContent = '○ ○ ○ ○ ○ ○';
      return;
    }

    codeMessage.textContent = '✓ Access Granted';
    codeMessage.classList.remove('error');
    codeMessage.classList.add('success');
    grantControlAccess(selectedRole);

    window.setTimeout(() => {
      window.location.href = selectedRole === 'police'
        ? '/src/pages/police.html'
        : '/src/pages/active-dispatches.html';
    }, 700);
  };

  renderPortalSync();

  policeCard?.addEventListener('click', () => {
    showCodeModal('police', 'POLICE COMMAND');
  });

  medicalCard?.addEventListener('click', () => {
    showCodeModal('medical', 'MEDICAL RESPONSE');
  });

  codeInput.addEventListener('input', (event) => {
    const enteredLength = event.target.value.length;
    codeDisplay.textContent = '● '.repeat(enteredLength) + '○ '.repeat(6 - enteredLength);
    codeMessage.textContent = '';
    codeMessage.classList.remove('error', 'success');
  });

  codeSubmitBtn?.addEventListener('click', validateCode);
  codeInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      validateCode();
    }
  });

  [codeCancelBtn, codeCloseBtn].forEach((button) => {
    button?.addEventListener('click', hideModal);
  });

  codeModal?.addEventListener('click', (event) => {
    if (event.target === codeModal) {
      hideModal();
    }
  });

  api.connectSSE();
  api.on('new-request', renderPortalSync);
  api.on('update-request', renderPortalSync);

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.tickets) {
      renderPortalSync();
    }
  });
});