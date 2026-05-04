const STORAGE_KEYS = {
  user: 'fifa-matchday-user',
  tickets: 'fifa-matchday-tickets'
};

const USER_ACCESS_KEY = 'fifa-user-access';
const CONTROL_ACCESS_KEY = 'fifa-control-access';

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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

function grantUserAccess() {
  writeStorage(USER_ACCESS_KEY, {
    grantedAt: new Date().toISOString(),
    source: 'demo-launcher'
  });
}

function grantControlAccess() {
  writeStorage(CONTROL_ACCESS_KEY, {
    grantedAt: new Date().toISOString(),
    source: 'demo-launcher'
  });
}

function getSavedUser() {
  return readStorage(STORAGE_KEYS.user, null);
}

function getUserEntryPath() {
  const savedUser = getSavedUser();

  if (savedUser?.email) {
    return '/src/pages/user-portal.html#portal';
  }

  return '/src/pages/user-portal.html#matches';
}

function openInNewTab(path) {
  window.open(path, '_blank', 'noopener');
}

document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    openUserDemoBtn: document.getElementById('open-user-demo-btn'),
    openControlDemoBtn: document.getElementById('open-control-demo-btn')
  };

  elements.openUserDemoBtn?.addEventListener('click', () => {
    grantUserAccess();
    openInNewTab(getUserEntryPath());
  });

  elements.openControlDemoBtn?.addEventListener('click', () => {
    grantControlAccess();
    openInNewTab('/src/pages/control-center.html');
  });
});