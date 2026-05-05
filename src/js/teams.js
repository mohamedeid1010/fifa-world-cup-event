const EGYPT_ROSTER = [
  { num: 1, name: 'Mohamed El Shenawy', pos: 'Goalkeeper', img: '/src/assets/players/elshenawy.png' },
  { num: 3, name: 'Mohamed Hany', pos: 'Defender', img: '/src/assets/players/hany.png' },
  { num: 6, name: 'Ahmed Hegazi', pos: 'Defender', img: '/src/assets/players/hegazi.png' },
  { num: 2, name: 'Mohamed Abdelmonem', pos: 'Defender', img: '/src/assets/players/abdelmonem.png' },
  { num: 13, name: 'Ahmed Fotouh', pos: 'Defender', img: '/src/assets/players/fotouh.png' },
  { num: 17, name: 'Mohamed Elneny', pos: 'Midfielder', img: '/src/assets/players/elneny.png' },
  { num: 8, name: 'Emam Ashour', pos: 'Midfielder', img: '/src/assets/players/ashour.png' },
  { num: 5, name: 'Hamdi Fathi', pos: 'Midfielder', img: '/src/assets/players/fathi.png' },
  { num: 10, name: 'Mohamed Salah (C)', pos: 'Forward', img: '/src/assets/players/salah.png' },
  { num: 7, name: 'Trezeguet', pos: 'Forward', img: '/src/assets/players/trezeguet.png' },
  { num: 19, name: 'Mostafa Mohamed', pos: 'Forward', img: '/src/assets/players/mostafa.png' }
];

const BELGIUM_ROSTER = [
  { num: 1, name: 'Thibaut Courtois', pos: 'Goalkeeper', img: '/src/assets/players/courtois.png' },
  { num: 21, name: 'Timothy Castagne', pos: 'Defender', img: '/src/assets/players/castagne_transparent.png' },
  { num: 5, name: 'Jan Vertonghen', pos: 'Defender', img: '/src/assets/players/jan.png' },
  { num: 4, name: 'Wout Faes', pos: 'Defender', img: '/src/assets/players/wout_faes.png', imgStyle: 'transform: scale(2.0); transform-origin: bottom center;' },
  { num: 3, name: 'Arthur Theate', pos: 'Defender', img: '/src/assets/players/arthur.png?v=2' },
  { num: 8, name: 'Youri Tielemans', pos: 'Midfielder', img: '/src/assets/players/tielemans.png' },
  { num: 24, name: 'Amadou Onana', pos: 'Midfielder', img: '/src/assets/players/onana.png' },
  { num: 7, name: 'Kevin De Bruyne (C)', pos: 'Midfielder', img: '/src/assets/players/debruyne.png?v=2' },
  { num: 11, name: 'Yannick Carrasco', pos: 'Forward', img: '/src/assets/players/carrasco.png' },
  { num: 10, name: 'Romelu Lukaku', pos: 'Forward', img: '/src/assets/players/lukaku.png?v=2' },
  { num: 22, name: 'Jérémy Doku', pos: 'Forward', img: '/src/assets/players/doku.png' }
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

  const renderGrid = (grid, roster, teamType) => {
    if (!grid) return;
    grid.innerHTML = roster.map(p => {
      // Generate some dummy FUT stats based on position
      const isGK = p.pos === 'Goalkeeper';
      const stats = {
        pac: isGK ? 80 + Math.floor(Math.random() * 10) : 85 + Math.floor(Math.random() * 10),
        sho: isGK ? 20 + Math.floor(Math.random() * 15) : (p.pos === 'Forward' ? 88 + Math.floor(Math.random() * 10) : 60 + Math.floor(Math.random() * 20)),
        dri: isGK ? 75 + Math.floor(Math.random() * 15) : 80 + Math.floor(Math.random() * 15),
        pas: isGK ? 70 + Math.floor(Math.random() * 20) : 75 + Math.floor(Math.random() * 15),
        phy: isGK ? 85 + Math.floor(Math.random() * 10) : 70 + Math.floor(Math.random() * 20),
        def: isGK ? 85 + Math.floor(Math.random() * 10) : (p.pos === 'Defender' ? 88 + Math.floor(Math.random() * 10) : 40 + Math.floor(Math.random() * 30)),
      };

      const rating = Math.floor(Math.random() * 8) + 85; // 85-92
      let shortPos = 'ST';
      if (p.pos === 'Goalkeeper') shortPos = 'GK';
      if (p.pos === 'Defender') shortPos = 'CB';
      if (p.pos === 'Midfielder') shortPos = 'CM';
      if (p.pos === 'Forward') shortPos = 'ST';

      const themeClass = teamType === 'egypt' ? 'gold-card' : 'silver-card';
      const flagGradient = teamType === 'egypt'
        ? 'linear-gradient(to bottom, #ce1126 33%, #fff 33%, #fff 66%, #000 66%)'
        : 'linear-gradient(to right, #000 33%, #ffd700 33%, #ffd700 66%, #ed2939 66%)';

      return `
      <div class="fut-card-container ${themeClass}">
        <div class="fut-card">
          <div class="fut-card-top">
            <div class="fut-card-left-info">
              <div class="fut-card-pos">${shortPos}</div>
              <div class="fut-card-rating">${rating}</div>
              <div class="fut-card-nation-box" style="background: ${flagGradient};"></div>
              <div class="fut-card-club">
                <svg viewBox="0 0 100 120" class="shield-icon">
                  <path d="M50 120 L10 20 L10 0 L90 0 L90 20 Z" fill="rgba(255,255,255,0.8)"/>
                  <text x="50" y="55" font-family="Arial" font-size="40" font-weight="bold" fill="#000" text-anchor="middle" dominant-baseline="middle">A</text>
                </svg>
              </div>
            </div>
            <div class="fut-card-player-img">
              <img src="${p.img}" alt="${p.name}" class="player-photo" style="${p.imgStyle || ''}">
            </div>
          </div>
          <div class="fut-card-bottom">
            <div class="fut-card-name">${p.name.toUpperCase()}</div>
            <div class="fut-card-stats-divider"></div>
            <div class="fut-card-stats">
              <div class="fut-stat-labels">
                <span>PAC</span><span>SHO</span><span>DRI</span><span>PAS</span><span>PHY</span><span>DEF</span>
              </div>
              <div class="fut-stat-values">
                <span>${stats.pac}</span><span>${stats.sho}</span><span>${stats.dri}</span><span>${stats.pas}</span><span>${stats.phy}</span><span>${stats.def}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      `;
    }).join('');
  };

  renderGrid(egyptGrid, EGYPT_ROSTER, 'egypt');
  renderGrid(belgiumGrid, BELGIUM_ROSTER, 'belgium');
  initTeamsNavbar();
});
