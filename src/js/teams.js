const EGYPT_ROSTER = [
  { num: 1, name: 'Mohamed El Shenawy', pos: 'Goalkeeper' },
  { num: 3, name: 'Mohamed Hany', pos: 'Defender' },
  { num: 6, name: 'Ahmed Hegazi', pos: 'Defender' },
  { num: 2, name: 'Mohamed Abdelmonem', pos: 'Defender' },
  { num: 13, name: 'Ahmed Fotouh', pos: 'Defender' },
  { num: 17, name: 'Mohamed Elneny', pos: 'Midfielder' },
  { num: 8, name: 'Emam Ashour', pos: 'Midfielder' },
  { num: 5, name: 'Hamdi Fathi', pos: 'Midfielder' },
  { num: 10, name: 'Mohamed Salah (C)', pos: 'Forward' },
  { num: 7, name: 'Trezeguet', pos: 'Forward' },
  { num: 19, name: 'Mostafa Mohamed', pos: 'Forward' }
];

const BELGIUM_ROSTER = [
  { num: 1, name: 'Thibaut Courtois', pos: 'Goalkeeper' },
  { num: 21, name: 'Timothy Castagne', pos: 'Defender' },
  { num: 5, name: 'Jan Vertonghen', pos: 'Defender' },
  { num: 4, name: 'Wout Faes', pos: 'Defender' },
  { num: 3, name: 'Arthur Theate', pos: 'Defender' },
  { num: 8, name: 'Youri Tielemans', pos: 'Midfielder' },
  { num: 24, name: 'Amadou Onana', pos: 'Midfielder' },
  { num: 7, name: 'Kevin De Bruyne (C)', pos: 'Midfielder' },
  { num: 11, name: 'Yannick Carrasco', pos: 'Forward' },
  { num: 10, name: 'Romelu Lukaku', pos: 'Forward' },
  { num: 22, name: 'Jérémy Doku', pos: 'Forward' }
];

function readStoredUser() {
  const rawUser = localStorage.getItem('fifa-matchday-user');

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

function getInitials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function initTeamsNavbar() {
  const navbar = document.getElementById('main-navbar');

  if (!navbar) {
    return;
  }

  const navToggle = navbar.querySelector('[data-nav-toggle]');
  const navMenu = navbar.querySelector('[data-nav-menu]');
  const initialsEl = navbar.querySelector('.nav-account-initials');
  const nameEl = navbar.querySelector('.nav-account-name');
  const statusEl = navbar.querySelector('.nav-account-status');
  const currentUser = readStoredUser();

  if (currentUser?.name) {
    if (initialsEl) initialsEl.textContent = getInitials(currentUser.name);
    if (nameEl) nameEl.textContent = currentUser.name;
    if (statusEl) statusEl.textContent = currentUser.email || 'Open Matchday Portal';
  }

  const setNavbarOpen = (isOpen) => {
    navbar.classList.toggle('is-open', isOpen);

    if (navToggle) {
      navToggle.setAttribute('aria-expanded', String(isOpen));
    }
  };

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      setNavbarOpen(!navbar.classList.contains('is-open'));
    });
  }

  if (navMenu) {
    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        setNavbarOpen(false);
      });
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      setNavbarOpen(false);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const egyptGrid = document.getElementById('egypt-roster-grid');
  const belgiumGrid = document.getElementById('belgium-roster-grid');

  const renderGrid = (grid, roster) => {
    if (!grid) return;
    grid.innerHTML = roster.map(p => `
      <div class="player-card">
        <div class="player-number">${p.num}</div>
        <div class="player-info">
          <span class="player-name">${p.name}</span>
          <span class="player-pos">${p.pos}</span>
        </div>
      </div>
    `).join('');
  };

  renderGrid(egyptGrid, EGYPT_ROSTER);
  renderGrid(belgiumGrid, BELGIUM_ROSTER);
  initTeamsNavbar();
});
