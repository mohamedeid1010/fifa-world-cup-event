const EGYPT_ROSTER = [
  { num: 1, name: 'Mohamed El Shenawy', pos: 'Goalkeeper', img: new URL('../assets/players/mohamed el shenawy.png', import.meta.url).href, age: 35, club: 'Al Ahly' },
  { num: 3, name: 'Mohamed Hany', pos: 'Defender', img: new URL('../assets/players/mohamed_hany-removebg-preview.png', import.meta.url).href, age: 28, club: 'Al Ahly' },
  { num: 6, name: 'Ahmed Hegazi', pos: 'Defender', img: new URL('../assets/players/ahmed_hegazy-removebg-preview (1).png', import.meta.url).href, age: 33, club: 'Neom SC' },
  { num: 2, name: 'Mohamed Abdelmonem', pos: 'Defender', img: new URL('../assets/players/mohamed abdelmonem.png', import.meta.url).href, age: 25, club: 'Nice' },
  { num: 13, name: 'Ahmed Fotouh', pos: 'Defender', img: new URL('../assets/players/Ahmed_fotouh-removebg-preview.png', import.meta.url).href, age: 26, club: 'Zamalek' },
  { num: 17, name: 'Mohamed Elneny', pos: 'Midfielder', img: new URL('../assets/players/mohamed el neny.png', import.meta.url).href, age: 31, club: 'Al Jazira' },
  { num: 8, name: 'Emam Ashour', pos: 'Midfielder', img: new URL('../assets/players/emam_ashour-removebg-preview.png', import.meta.url).href, age: 26, club: 'Al Ahly' },
  { num: 5, name: 'Hamdi Fathi', pos: 'Midfielder', img: new URL('../assets/players/hamdi fathy.png', import.meta.url).href, age: 29, club: 'Al-Wakrah' },
  { num: 10, name: 'Mohamed Salah (C)', pos: 'Forward', img: new URL('../assets/players/mohamed_salah-removebg-preview.png', import.meta.url).href, age: 31, club: 'Liverpool' },
  { num: 7, name: 'Trezeguet', pos: 'Forward', img: new URL('../assets/players/Trezeguet.png', import.meta.url).href, age: 29, club: 'Trabzonspor' },
  { num: 19, name: 'Mostafa Mohamed', pos: 'Forward', img: new URL('../assets/players/mostafa mohamed.png', import.meta.url).href, age: 26, club: 'Nantes' }
];

const BELGIUM_ROSTER = [
  { num: 1, name: 'Thibaut Courtois', pos: 'Goalkeeper', img: new URL('../assets/players/courtois.png', import.meta.url).href, age: 31, club: 'Real Madrid' },
  { num: 21, name: 'Timothy Castagne', pos: 'Defender', img: new URL('../assets/players/castagne_transparent.png', import.meta.url).href, age: 28, club: 'Fulham' },
  { num: 5, name: 'Jan Vertonghen', pos: 'Defender', img: new URL('../assets/players/jan.png', import.meta.url).href, age: 37, club: 'Anderlecht' },
  { num: 4, name: 'Wout Faes', pos: 'Defender', img: new URL('../assets/players/wout_faes.png', import.meta.url).href, imgStyle: 'transform: scale(2.0); transform-origin: bottom center;', age: 26, club: 'Leicester' },
  { num: 3, name: 'Arthur Theate', pos: 'Defender', img: new URL('../assets/players/arthur.png?v=2', import.meta.url).href, age: 23, club: 'Eintracht' },
  { num: 8, name: 'Youri Tielemans', pos: 'Midfielder', img: new URL('../assets/players/tielemans.png', import.meta.url).href, age: 27, club: 'Aston Villa' },
  { num: 24, name: 'Amadou Onana', pos: 'Midfielder', img: new URL('../assets/players/onana.png', import.meta.url).href, age: 22, club: 'Aston Villa' },
  { num: 7, name: 'Kevin De Bruyne (C)', pos: 'Midfielder', img: new URL('../assets/players/debruyne.png?v=2', import.meta.url).href, age: 32, club: 'Man City' },
  { num: 11, name: 'Yannick Carrasco', pos: 'Forward', img: new URL('../assets/players/carrasco.png', import.meta.url).href, age: 30, club: 'Al Shabab' },
  { num: 10, name: 'Romelu Lukaku', pos: 'Forward', img: new URL('../assets/players/lukaku.png?v=2', import.meta.url).href, age: 30, club: 'Roma' },
  { num: 22, name: 'Jérémy Doku', pos: 'Forward', img: new URL('../assets/players/doku.png', import.meta.url).href, age: 21, club: 'Man City' }
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
              <div class="fut-card-rating" title="Player Number">${p.num}</div>
              <div class="fut-card-nation-box" style="background: ${flagGradient};"></div>
              <div class="fut-card-age tooltip-container">
                <span class="age-value">${p.age}</span>
                <span class="tooltip-text">Player Age: ${p.age}</span>
              </div>
            </div>
            <div class="fut-card-player-img">
              <img src="${p.img}" alt="${p.name}" class="player-photo" style="${p.imgStyle || ''}">
            </div>
          </div>
          <div class="fut-card-bottom">
            <div class="fut-card-name">${p.name.toUpperCase()}</div>
            <div class="fut-card-stats-divider"></div>
            <div class="fut-card-club-name">${(p.club || '').toUpperCase()}</div>
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

  // Card Expansion Animation Logic
  const createCardOverlay = () => {
    let overlay = document.getElementById('card-expansion-overlay');
    if (!overlay) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="card-expansion-overlay" class="card-overlay" aria-hidden="true">
          <div class="card-overlay-close">&times;</div>
          <div class="card-overlay-content" id="card-overlay-content"></div>
        </div>
      `);
      overlay = document.getElementById('card-expansion-overlay');
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.classList.contains('card-overlay-close')) {
          overlay.classList.remove('is-open');
          setTimeout(() => {
            document.getElementById('card-overlay-content').innerHTML = '';
          }, 400); // Wait for CSS transition
        }
      });
    }
    return overlay;
  };

  createCardOverlay();

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.fut-card-container');
    // Only animate if it's not already the expanded one
    if (card && !card.closest('.card-overlay-content')) {
      const overlay = document.getElementById('card-expansion-overlay');
      const content = document.getElementById('card-overlay-content');
      
      const cardClone = card.cloneNode(true);
      
      content.innerHTML = '';
      content.appendChild(cardClone);
      
      requestAnimationFrame(() => {
        overlay.classList.add('is-open');
      });
    }
  });
});
