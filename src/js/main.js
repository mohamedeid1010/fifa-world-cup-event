import { api } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEYS = {
    user: 'fifa-matchday-user',
    tickets: 'fifa-matchday-tickets',
    services: 'fifa-matchday-services'
  };

  const DB_VERSION = 'v4_clear_data_strict_1_ticket';
  if (localStorage.getItem('fifa-db-version') !== DB_VERSION) {
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.tickets);
    localStorage.removeItem(STORAGE_KEYS.services);
    localStorage.setItem('fifa-db-version', DB_VERSION);
  }

  const targetDate = new Date('June 15, 2026 18:00:00').getTime();

  const elements = {
    appContainer: document.getElementById('app'),
    days: document.getElementById('timer-days'),
    hours: document.getElementById('timer-hours'),
    minutes: document.getElementById('timer-minutes'),
    seconds: document.getElementById('timer-seconds'),
    bookBtn: document.querySelector('.book-btn'),
    navbar: document.querySelector('.navbar'),
    navToggle: document.querySelector('[data-nav-toggle]'),
    navMenu: document.querySelector('[data-nav-menu]'),
    navPortal: document.getElementById('nav-portal'),
    navTeams: document.getElementById('nav-teams'),
    navTickets: document.getElementById('nav-tickets'),
    navServices: document.getElementById('nav-services'),
    openAuthBtn: document.getElementById('open-auth-btn'),
    profileInitials: document.getElementById('profile-initials'),
    profileIcon: document.getElementById('profile-icon'),
    profileGreeting: document.getElementById('profile-greeting'),
    profileStatus: document.getElementById('profile-status'),
    authModal: document.getElementById('auth-modal'),
    closeAuthModalBtn: document.getElementById('close-auth-modal'),
    authModalTitle: document.getElementById('auth-modal-title'),
    authModalDescription: document.getElementById('auth-modal-description'),
    authForm: document.getElementById('auth-form'),
    authName: document.getElementById('auth-name'),
    authEmail: document.getElementById('auth-email'),
    authPhone: document.getElementById('auth-phone'),
    authPassword: document.getElementById('auth-password'),
    authNewPassword: document.getElementById('auth-new-password'),
    authChangePwBtn: document.getElementById('auth-change-pw-btn'),
    authSuccessMsg: document.getElementById('auth-success-msg'),
    passwordChangeGroup: document.querySelector('.password-change-only'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authLogoutBtn: document.getElementById('auth-logout-btn'),
    toggleSignupBtn: document.getElementById('toggle-signup'),
    toggleSigninBtn: document.getElementById('toggle-signin'),
    authErrorMsg: document.getElementById('auth-error-msg'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authLogoutBtn: document.getElementById('auth-logout-btn'),
    modal: document.getElementById('booking-modal'),
    closeBookingBtn: document.getElementById('close-modal'),
    stadiumView: document.getElementById('stadium-view'),
    seatView: document.getElementById('seat-view'),
    paymentView: document.getElementById('payment-view'),
    ticketView: document.getElementById('ticket-view'),
    backToStadiumBtn: document.getElementById('back-to-stadium'),
    backToCartBtn: document.getElementById('back-to-cart'),
    seatsGrid: document.getElementById('seats-grid'),
    minimapDot: document.getElementById('minimap-dot'),
    currentSectionTitle: document.getElementById('current-section-title'),
    selectedSeatsList: document.getElementById('selected-seats-list'),
    subTotal: document.getElementById('sub-total'),
    serviceFee: document.getElementById('service-fee'),
    totalPrice: document.getElementById('total-price'),
    checkoutBtn: document.getElementById('checkout-btn'),
    fakePaymentForm: document.getElementById('fake-payment-form'),
    confirmPayBtn: document.getElementById('confirm-pay-btn'),
    paymentNameInput: document.querySelector('#fake-payment-form input[type="text"]'),
    bookingMain: document.querySelector('.booking-main'),
    bookingSidebar: document.querySelector('.booking-sidebar'),
    breadcrumbs: document.querySelectorAll('.breadcrumbs span'),
    successSub: document.querySelector('.success-sub'),
    ticketsList: document.getElementById('tickets-list'),
    goToPortalBtn: document.getElementById('go-to-portal-btn'),
    dashboardPage: document.getElementById('matchday-dashboard'),
    closeDashboardBtn: document.getElementById('close-dashboard-btn'),
    mainContent: document.querySelector('.main-content'),
    dashboardUserName: document.getElementById('dashboard-user-name'),
    dashboardUserContact: document.getElementById('dashboard-user-contact'),
    dashboardTicketCount: document.getElementById('dashboard-ticket-count'),
    dashboardNotice: document.getElementById('dashboard-notice'),
    dashboardTicketsList: document.getElementById('dashboard-tickets-list'),
    browseMenuBtn: document.getElementById('browse-menu-btn'),
    requestHelpBtn: document.getElementById('request-help-btn'),
    serviceRequestsList: document.getElementById('service-requests-list'),
    serviceModal: document.getElementById('service-modal'),
    closeServiceModalBtn: document.getElementById('close-service-modal'),
    serviceNotes: document.getElementById('service-notes'),
    emergencyCard: document.getElementById('emergency-card'),
    emergencyHeader: document.getElementById('emergency-header'),
    emergencyContent: document.getElementById('emergency-content'),
    emergencySuccess: document.getElementById('emergency-success'),
    emergencySeatDisplay: document.getElementById('emergency-seat-display'),
    emergencyBtns: document.querySelectorAll('.emergency-btn'),
    portalTransition: document.getElementById('portal-transition'),
    ptLoaderFill: document.getElementById('pt-loader-fill'),
    introScreen: document.getElementById('intro-screen'),
    introVideo: document.getElementById('intro-video'),
    restaurantModal: document.getElementById('restaurant-modal'),
    closeRestaurantModalBtn: document.getElementById('close-restaurant-modal'),
    menuGrid: document.getElementById('menu-grid'),
    cartTotal: document.getElementById('cart-total'),
    checkoutRestaurantBtn: document.getElementById('checkout-restaurant-btn'),
    restaurantTicketSelect: document.getElementById('restaurant-ticket-select'),
    checkoutRestaurantBtn: document.getElementById('checkout-restaurant-btn'),
    restaurantTicketSelect: document.getElementById('restaurant-ticket-select'),
    categoryBtns: document.querySelectorAll('.category-btn')
  };

  const state = {
    user: readStorage(STORAGE_KEYS.user, null),
    selectedSeats: [],
    currentSection: { name: '', price: 0 },
    tickets: readStorage(STORAGE_KEYS.tickets, []),
    serviceRequests: [],
    dashboardRequested: null,
    dashboardRoute: 'tickets'
  };

  let pendingAction = null;
  let dashboardNoticeTimer = null;
  const INDEX_ROUTES = new Set(['matches', 'portal', 'tickets', 'services']);
  const occupiedSeatCache = new Map();
  const INTRO_END_DELAY = 220;
  const INTRO_HIDE_DELAY = 1100;
  const INTRO_FALLBACK_DURATION = 15000;
  let introCompleted = false;
  let introFallbackTimer = 0;
  let introHideTimer = 0;

  const RESTAURANT_MENU = [
    { id: 'm1', name: 'Premium Burger', price: 15, category: 'burgers', icon: '🍔', desc: 'Angus beef, cheddar, special sauce' },
    { id: 'm2', name: 'Chicken Wrap', price: 12, category: 'burgers', icon: '🌯', desc: 'Grilled chicken, lettuce, garlic mayo' },
    { id: 'm3', name: 'Pepperoni Pizza', price: 18, category: 'pizza', icon: '🍕', desc: 'Salami, mozzarella, tomato sauce' },
    { id: 'm4', name: 'Margarita Slice', price: 8, category: 'pizza', icon: '🍕', desc: 'Classic cheese and basil' },
    { id: 'm5', name: 'Cold Soda', price: 5, category: 'drinks', icon: '🥤', desc: 'Cola, Sprite, or Fanta' },
    { id: 'm6', name: 'Mineral Water', price: 3, category: 'drinks', icon: '💧', desc: 'Sparkling or still' },
    { id: 'm7', name: 'Hot Dog Combo', price: 14, category: 'burgers', icon: '🌭', desc: 'Hot dog + fries + drink' },
    { id: 'm8', name: 'Nachos', price: 9, category: 'drinks', icon: '🧀', desc: 'Crispy chips with melted cheese' }
  ];
  let restaurantCart = {}; // { itemId: quantity }
  let currentCategory = 'all';

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

  function getCurrentUserEmail() {
    return state.user?.email || '';
  }

  function getCurrentUserTickets() {
    const email = getCurrentUserEmail();

    return state.tickets || [];
  }

  function hasTicketForEmail(email) {
    return state.tickets.some(t => t.ownerEmail === email);
  }

  function getCurrentUserServiceRequests() {
    return state.serviceRequests || [];
  }

  function saveUser() {
    if (state.user) {
      writeStorage(STORAGE_KEYS.user, state.user);
      return;
    }

    localStorage.removeItem(STORAGE_KEYS.user);
  }

  function saveTickets() {
    writeStorage(STORAGE_KEYS.tickets, state.tickets);
  }

  function saveServiceRequests() {
    // Deprecated: API used instead
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getInitials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  function formatCurrency(amount) {
    return `$${amount.toFixed(2)}`;
  }

  function formatDateTime(value) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  }

  function getTicketSeatLabel(ticket) {
    return `${ticket.section} | Row ${ticket.row} Seat ${ticket.seatNumber}`;
  }

  function getSectionShort(sectionName) {
    return sectionName.replace('Cat ', 'C').replace(' - ', ' ');
  }

  function setNavbarOpen(isOpen) {
    if (!elements.navbar || !elements.navToggle) {
      return;
    }

    elements.navbar.classList.toggle('is-open', isOpen);
    elements.navToggle.setAttribute('aria-expanded', String(isOpen));
  }

  function getIndexRoute() {
    const hashRoute = window.location.hash.replace('#', '').toLowerCase();

    if (INDEX_ROUTES.has(hashRoute)) {
      return hashRoute;
    }

    return 'matches';
  }

  function hasExplicitIndexRoute() {
    const hashRoute = window.location.hash.replace('#', '').toLowerCase();
    return INDEX_ROUTES.has(hashRoute);
  }

  function replaceIndexHash(route) {
    const nextRoute = INDEX_ROUTES.has(route) ? route : 'matches';
    const nextUrl = `${window.location.pathname}#${nextRoute}`;
    window.history.replaceState(null, '', nextUrl);
  }

  function setActiveNav(route) {
    const activeRoute = INDEX_ROUTES.has(route) ? route : 'matches';
    const navMatchRoute = activeRoute === 'matches' ? 'portal' : activeRoute;
    const navEntries = [
      ['portal', elements.navPortal],
      ['services', elements.navServices],
      ['tickets', elements.navTickets],
      ['teams', elements.navTeams]
    ];

    navEntries.forEach(([key, link]) => {
      if (!link) {
        return;
      }

      const isActive = key === navMatchRoute;
      link.classList.toggle('is-active', isActive);

      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function getDashboardTarget(route = state.dashboardRoute) {
    if (route === 'portal') {
      return elements.dashboardPage;
    }

    if (route === 'services') {
      return document.querySelector('.dash-services-grid') || elements.dashboardPage;
    }

    return elements.dashboardTicketsList || elements.dashboardPage;
  }

  function currentUserHasTickets() {
    return getCurrentUserTickets().length > 0;
  }

  function redirectToTicketBooking() {
    state.dashboardRequested = false;
    state.dashboardRoute = 'tickets';
    replaceIndexHash('matches');
    updateAppView();
    openBookingFlow();
  }

  function returnToMainRoute({ scrollBehavior = 'smooth' } = {}) {
    state.dashboardRequested = false;
    state.dashboardRoute = 'tickets';
    replaceIndexHash('matches');
    updateAppView();
    elements.mainContent?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
  }

  function openRequestedIndexRoute(route, { scrollBehavior = 'smooth' } = {}) {
    if (!state.user) {
      returnToMainRoute({ scrollBehavior });
      return;
    }

    if (!currentUserHasTickets()) {
      redirectToTicketBooking();
      return;
    }

    openDashboard(route, { scrollBehavior });
  }

  function routeToIndexSection(route, { scrollBehavior = 'smooth' } = {}) {
    const nextRoute = INDEX_ROUTES.has(route) ? route : 'matches';

    if (nextRoute === 'matches') {
      if (currentUserHasTickets()) {
        openDashboard('portal', { scrollBehavior });
        return;
      }
      state.dashboardRequested = false;
      state.dashboardRoute = 'tickets';
      replaceIndexHash('matches');
      updateAppView();
      elements.mainContent?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
      return;
    }

    replaceIndexHash(nextRoute);
    openRequestedIndexRoute(nextRoute, { scrollBehavior });
  }

  function syncIndexRoute({ scrollBehavior = 'auto' } = {}) {
    const route = getIndexRoute();
    const hasExplicitRoute = hasExplicitIndexRoute();

    if (route === 'matches') {
      if (currentUserHasTickets()) {
        openDashboard('portal', { scrollBehavior });
        return;
      }
      state.dashboardRequested = hasExplicitRoute ? false : null;
      state.dashboardRoute = hasExplicitRoute ? 'tickets' : 'portal';
      updateAppView();
      return;
    }

    state.dashboardRequested = false;
    state.dashboardRoute = 'tickets';
    updateAppView();
    openRequestedIndexRoute(route, { scrollBehavior });
  }

  function updateTimer() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      elements.days.innerText = '00';
      elements.hours.innerText = '00';
      elements.minutes.innerText = '00';
      elements.seconds.innerText = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    elements.days.innerText = days.toString().padStart(2, '0');
    elements.hours.innerText = hours.toString().padStart(2, '0');
    elements.minutes.innerText = minutes.toString().padStart(2, '0');
    elements.seconds.innerText = seconds.toString().padStart(2, '0');
  }

  function updateBreadcrumb(stepIndex) {
    elements.breadcrumbs.forEach((breadcrumb, index) => {
      breadcrumb.classList.toggle('active', index === stepIndex);
    });
  }

  function updateAuthFormFromState() {
    elements.authName.value = state.user?.name || '';
    elements.authEmail.value = state.user?.email || '';
    elements.authPhone.value = state.user?.phone || '';
  }

  function renderAuthModalState() {
    if (elements.authSuccessMsg) elements.authSuccessMsg.classList.add('hidden');
    if (state.user) {
      elements.authModalTitle.textContent = 'Account settings';
      elements.authModalDescription.textContent = 'Update your details, change your password, or log out.';
      elements.authSubmitBtn.textContent = 'Save Account';
      elements.authLogoutBtn.hidden = false;
      if (elements.authChangePwBtn) elements.authChangePwBtn.hidden = false;
      if (elements.passwordChangeGroup) elements.passwordChangeGroup.style.display = '';
      if (elements.authPassword) {
        elements.authPassword.placeholder = 'Current password';
        elements.authPassword.required = false;
      }
      // Hide signup/signin toggle when logged in
      const toggleContainer = document.querySelector('.auth-toggle-container');
      if (toggleContainer) toggleContainer.style.display = 'none';
      return;
    }

    elements.authModalTitle.textContent = 'Sign in before you buy your ticket';
    elements.authModalDescription.textContent = 'Save your booking in My Tickets and unlock food delivery plus police, ambulance, and stadium support requests on matchday.';
    elements.authSubmitBtn.textContent = 'Continue to Matchday';
    elements.authLogoutBtn.hidden = true;
    if (elements.authChangePwBtn) elements.authChangePwBtn.hidden = true;
    if (elements.passwordChangeGroup) elements.passwordChangeGroup.style.display = 'none';
    if (elements.authPassword) {
      elements.authPassword.placeholder = '••••••••';
      elements.authPassword.required = true;
    }
    const toggleContainer = document.querySelector('.auth-toggle-container');
    if (toggleContainer) toggleContainer.style.display = '';
  }

  function renderUserProfile() {
    if (state.user) {
      elements.profileGreeting.textContent = state.user.name;
      elements.profileStatus.textContent = state.user.email;
      elements.profileInitials.textContent = getInitials(state.user.name);
      elements.profileInitials.hidden = false;
      elements.profileIcon.hidden = true;
    } else {
      elements.profileGreeting.textContent = 'Guest Fan';
      elements.profileStatus.textContent = 'Sign in to book';
      elements.profileInitials.hidden = true;
      elements.profileIcon.hidden = false;
    }

    elements.paymentNameInput.value = state.user?.name || 'John Doe';
    updateAuthFormFromState();
    renderAuthModalState();
  }

  function renderDashboardSummary() {
    const currentTickets = getCurrentUserTickets();

    if (state.user) {
      elements.dashboardUserName.textContent = state.user.name;
      elements.dashboardUserContact.textContent = `${state.user.email} • ${state.user.phone}`;
    } else {
      elements.dashboardUserName.textContent = 'Guest Fan';
      elements.dashboardUserContact.textContent = 'Sign in to keep your tickets and services in one place.';
    }

    elements.dashboardTicketCount.textContent = String(currentTickets.length);
  }

  function buildTicketMarkup(ticket) {
    const sectionStyle = ticket.sectionShort.length > 5 ? 'font-size: 24px;' : '';

    return `
      <div class="digital-ticket">
        <div class="ticket-left">
          <div class="t-header">
            <span style="font-size: 16px;">⚽</span> MATCHDAY TICKET
          </div>

          <div class="t-teams">
            <div class="t-team">
              <img src="/src/assets/icon/flag.png" alt="EGY">
              <span>EGY</span>
            </div>
            <div class="t-vs">VS</div>
            <div class="t-team">
              <img src="/src/assets/icon/belgium (1).png" alt="BEL">
              <span>BEL</span>
            </div>
          </div>

          <div class="t-divider"></div>

          <div class="t-row">
            <div class="t-col">
              <span class="t-label">Date</span>
              <span class="t-val">15 JUN 2026</span>
            </div>
            <div class="t-col">
              <span class="t-label">Kickoff</span>
              <span class="t-val">20:00</span>
            </div>
            <div class="t-col">
              <span class="t-label">Gate</span>
              <span class="t-val">${escapeHtml(ticket.gate)}</span>
            </div>
          </div>

          <div class="t-divider"></div>

          <div class="t-row">
            <div class="t-col">
              <span class="t-label">Section</span>
              <span class="t-val large" style="${sectionStyle}">${escapeHtml(ticket.sectionShort)}</span>
            </div>
            <div class="t-col">
              <span class="t-label">Row</span>
              <span class="t-val large">${escapeHtml(ticket.row)}</span>
            </div>
            <div class="t-col">
              <span class="t-label">Seat</span>
              <span class="t-val large">${escapeHtml(ticket.seatNumber)}</span>
            </div>
          </div>
        </div>

        <div class="ticket-right">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticket.ticketId)}" alt="QR" class="t-qr">
          <div class="t-id-label">TICKET ID</div>
          <div class="t-id-val">${escapeHtml(ticket.ticketId)}</div>
          <div class="t-name">${escapeHtml(ticket.ownerName)}</div>
          <div class="t-disclaimer">Saved in My Tickets and linked to your matchday services.</div>
        </div>
      </div>
    `;
  }

  function buildEmptyTicketMarkup() {
    return `
      <div class="dashboard-empty-card">
        <h4>No tickets yet</h4>
        <p>Sign in and book a seat. Your match ticket will appear here automatically.</p>
      </div>
    `;
  }

  async function renderTickets() {
    if (!state.user?.email) return;
    
    try {
      const tickets = await api.get(`/tickets?email=${encodeURIComponent(state.user.email)}`);
      state.tickets = tickets;

      if (tickets.length === 0) {
        const emptyMarkup = buildEmptyTicketMarkup();
        elements.ticketsList.innerHTML = emptyMarkup;
        elements.dashboardTicketsList.innerHTML = emptyMarkup;
        elements.goToPortalBtn.disabled = true;
        updateServiceButtonState();
        return;
      }

      const markup = tickets.map(buildTicketMarkup).join('');
      elements.ticketsList.innerHTML = markup;
      elements.dashboardTicketsList.innerHTML = markup;
      elements.goToPortalBtn.disabled = false;
      updateServiceButtonState();
    } catch (err) {
      console.error('Failed to render tickets from database:', err);
    }
  }

  function buildServiceRequestMarkup(request) {
    const notes = escapeHtml(request.notes || 'No extra details added.').replace(/\n/g, '<br>');
    const title = request.title || `${request.unitType?.toUpperCase()} Assistance`;
    const subtitle = request.subtitle || `Section ${request.section} | Row ${request.row} Seat ${request.seat}`;

    return `
      <div class="service-request-card ${escapeHtml(request.kind || 'assistance')}">
        <div class="service-request-top">
          <div>
            <div class="service-request-title">${escapeHtml(title)}</div>
            <div class="service-request-subtitle">${escapeHtml(subtitle)}</div>
          </div>
          <div class="service-request-status">${escapeHtml(request.status)}</div>
        </div>
        <div class="service-request-meta">
          <span>ID: ${escapeHtml(String(request.id))}</span>
          <span>Priority: ${escapeHtml(request.risk || 'NORMAL')}</span>
        </div>
        <div class="service-request-notes">${notes}</div>
      </div>
    `;
  }

  function updateServiceButtonState() {
    const hasTickets = getCurrentUserTickets().length > 0;

    elements.browseMenuBtn.title = hasTickets ? '' : 'Book a ticket first';
    elements.requestHelpBtn.title = hasTickets ? '' : 'Book a ticket first';
  }

  async function renderServiceRequests() {
    if (!state.user?.email) return;

    try {
      const requests = await api.get(`/requests?email=${encodeURIComponent(state.user.email)}`);
      state.serviceRequests = requests;

      if (requests.length === 0) {
        elements.serviceRequestsList.innerHTML = '<div class="service-empty-state">No requests yet. Order food or ask for help from the cards above.</div>';
        updateServiceButtonState();
        return;
      }

      elements.serviceRequestsList.innerHTML = requests.map(buildServiceRequestMarkup).join('');
      updateServiceButtonState();
    } catch (err) {
      console.error('Failed to render requests from database:', err);
    }
  }

  async function renderAllDynamicData() {
    renderUserProfile();
    renderDashboardSummary();
    await Promise.all([renderTickets(), renderServiceRequests()]);
  }

  function markAppReady() {
    document.body.classList.remove('intro-active');
    document.body.classList.add('app-ready');
    syncIndexRoute({ scrollBehavior: 'auto' });
  }

  function updateAppView() {
    const currentTickets = getCurrentUserTickets();
    const hasTickets = currentTickets.length >= 1;
    const shouldShowDashboard = Boolean(state.user) && (
      state.dashboardRequested === true ||
      (state.dashboardRequested === null && hasTickets)
    );
    const activeRoute = shouldShowDashboard ? state.dashboardRoute : 'matches';

    if (elements.navPortal) {
      elements.navPortal.textContent = 'Matchday';
      elements.navPortal.setAttribute('href', hasTickets ? 'index.html#portal' : 'index.html#matches');
    }

    elements.navbar?.classList.toggle('pre-ticket-nav', !hasTickets);
    if (elements.openAuthBtn) {
      elements.openAuthBtn.hidden = false;
    }

    if (!hasTickets) {
      setNavbarOpen(false);
    }

    document.body.classList.toggle('portal-mode', shouldShowDashboard);
    elements.appContainer.classList.toggle('portal-mode', shouldShowDashboard);
    setActiveNav(activeRoute);

    if (shouldShowDashboard) {
      elements.mainContent.classList.add('hidden');
      elements.dashboardPage.classList.remove('hidden');
      elements.bookBtn.textContent = 'MATCHDAY SERVICES';
    } else {
      elements.mainContent.classList.remove('hidden');
      elements.dashboardPage.classList.add('hidden');
      elements.bookBtn.textContent = 'BOOK YOUR TICKET';
    }
  }

  function finishIntro() {
    if (introCompleted) {
      return;
    }

    introCompleted = true;
    window.clearTimeout(introHideTimer);
    
    if (elements.introVideo) {
      elements.introVideo.pause();
    }

    markAppReady();

    if (!elements.introScreen) {
      return;
    }

    elements.introScreen.classList.add('is-ending');
    introHideTimer = window.setTimeout(() => {
      elements.introScreen.classList.add('is-hidden');
    }, INTRO_HIDE_DELAY);
  }

  function initIntro() {
    if (!elements.introScreen || !elements.introVideo || currentUserHasTickets()) {
      if (elements.introScreen) elements.introScreen.style.display = 'none';
      if (elements.introVideo) elements.introVideo.pause();
      markAppReady();
      return;
    }

    const syncLoaderDuration = () => {
      const videoDuration = elements.introVideo.duration;
      if (videoDuration && videoDuration > 1.2) {
        const loaderDuration = videoDuration - 1.2;
        elements.introScreen.style.setProperty('--loader-duration', `${loaderDuration}s`);
        
        // Safety timeout: If 'ended' event fails for some reason, close it slightly after duration
        window.setTimeout(finishIntro, videoDuration * 1000 + 500);
      }
    };

    elements.introVideo.addEventListener('loadedmetadata', syncLoaderDuration);

    if (elements.introVideo.readyState >= 1) {
      syncLoaderDuration();
    }

    // End intro when video finishes
    elements.introVideo.addEventListener('ended', finishIntro, { once: true });
    
    // Fallback if there's an error playing the video
    elements.introVideo.addEventListener('error', finishIntro, { once: true });
  }

  function showDashboardNotice(message) {
    elements.dashboardNotice.textContent = message;
    elements.dashboardNotice.hidden = false;

    window.clearTimeout(dashboardNoticeTimer);
    dashboardNoticeTimer = window.setTimeout(() => {
      elements.dashboardNotice.hidden = true;
    }, 3500);
  }

  function openAuthModal(action) {
    pendingAction = action || null;
    updateAuthFormFromState();
    renderAuthModalState();
    
    if (elements.authErrorMsg) elements.authErrorMsg.classList.add('hidden');
    if (elements.authSuccessMsg) elements.authSuccessMsg.classList.add('hidden');
    if (elements.authPassword) elements.authPassword.value = '';
    if (elements.authNewPassword) elements.authNewPassword.value = '';

    if (state.user) {
      // Logged-in: show account settings mode
      if (elements.authForm) elements.authForm.dataset.mode = 'settings';
    } else {
      // Not logged in: show signup mode
      if (elements.authForm) {
        elements.authForm.dataset.mode = 'signup';
        elements.authName.required = true;
      }
      if (elements.toggleSignupBtn) {
        elements.toggleSignupBtn.classList.add('active');
        elements.toggleSigninBtn.classList.remove('active');
        elements.authSubmitBtn.textContent = 'Create Account';
      }
    }
    
    elements.authModal.classList.remove('hidden');
    if (!state.user) elements.authName.focus();
  }

  function closeAuthModal(clearPendingAction = true) {
    elements.authModal.classList.add('hidden');

    if (clearPendingAction) {
      pendingAction = null;
    }
  }

  function ensureAuthenticated(action) {
    if (state.user) {
      return true;
    }

    openAuthModal(action);
    return false;
  }

  function resetBookingFlow() {
    state.selectedSeats = [];
    state.currentSection = { name: '', price: 0 };
    elements.bookingMain.style.display = '';
    elements.bookingSidebar.style.display = '';
    elements.stadiumView.classList.remove('hidden');
    elements.seatView.classList.add('hidden');
    elements.paymentView.classList.add('hidden');
    elements.ticketView.classList.add('hidden');
    elements.confirmPayBtn.disabled = false;
    elements.confirmPayBtn.innerText = 'Pay Now';
    elements.confirmPayBtn.style.opacity = '1';
    updateBreadcrumb(1);
    updateOrderSummary();
  }

  function openBookingFlow() {
    // Block if this email already has a ticket
    if (hasTicketForEmail(getCurrentUserEmail())) {
      openDashboard('portal');
      return;
    }

    resetBookingFlow();
    elements.serviceModal.classList.add('hidden');
    elements.modal.classList.remove('hidden');
  }

  function closeBookingFlow() {
    elements.modal.classList.add('hidden');
  }

  function openDashboard(route = 'tickets', { scrollBehavior = 'smooth' } = {}) {
    state.dashboardRequested = true;
    state.dashboardRoute = route === 'services' ? 'services' : route === 'portal' ? 'portal' : 'tickets';
    replaceIndexHash(state.dashboardRoute);
    closeBookingFlow();
    closeServiceModal();
    renderAllDynamicData();
    updateAppView();

    const target = getDashboardTarget(state.dashboardRoute);
    target?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
  }

  function closeDashboard() {
    state.dashboardRequested = false;
    state.dashboardRoute = 'tickets';
    replaceIndexHash('matches');
    updateAppView();
    elements.dashboardNotice.hidden = true;
  }

  // Legacy updateServiceModal function removed

  /* ─── RESTAURANT MENU LOGIC ─── */
  function openRestaurantModal() {
    const currentTickets = getCurrentUserTickets();
    if (currentTickets.length === 0) {
      showDashboardNotice('You need a ticket to order food.');
      return;
    }

    elements.restaurantTicketSelect.innerHTML = '';
    currentTickets.forEach((t) => {
      const option = document.createElement('option');
      option.value = t.ticketId;
      option.textContent = `Ticket: ${t.ticketId} — ${getTicketSeatLabel(t)}`;
      elements.restaurantTicketSelect.appendChild(option);
    });

    restaurantCart = {};
    currentCategory = 'all';
    
    if (elements.categoryBtns) {
      elements.categoryBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === 'all');
      });
    }

    renderMenuGrid();
    updateCartSummary();

    elements.restaurantModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeRestaurantModal() {
    elements.restaurantModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function renderMenuGrid() {
    elements.menuGrid.innerHTML = '';
    
    const itemsToRender = currentCategory === 'all' 
      ? RESTAURANT_MENU 
      : RESTAURANT_MENU.filter(item => item.category === currentCategory);

    itemsToRender.forEach(item => {
      const qty = restaurantCart[item.id] || 0;
      
      const card = document.createElement('div');
      card.className = 'menu-item-card';
      
      let actionHTML = '';
      if (qty > 0) {
        actionHTML = `
          <div class="item-qty-controls">
            <button type="button" class="qty-btn dec-btn" data-id="${item.id}">-</button>
            <span class="item-qty">${qty}</span>
            <button type="button" class="qty-btn inc-btn" data-id="${item.id}">+</button>
          </div>
        `;
      } else {
        actionHTML = `<button type="button" class="add-to-cart-btn" data-id="${item.id}">Add</button>`;
      }

      card.innerHTML = `
        <div class="menu-item-icon">${item.icon}</div>
        <div class="menu-item-info">
          <h4>${item.name}</h4>
          <p>${item.desc}</p>
        </div>
        <div class="menu-item-action">
          <span class="menu-item-price">$${item.price}</span>
          ${actionHTML}
        </div>
      `;

      elements.menuGrid.appendChild(card);
    });

    // Attach event listeners
    const addBtns = elements.menuGrid.querySelectorAll('.add-to-cart-btn');
    addBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        restaurantCart[btn.dataset.id] = 1;
        renderMenuGrid();
        updateCartSummary();
      });
    });

    const incBtns = elements.menuGrid.querySelectorAll('.inc-btn');
    incBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        restaurantCart[btn.dataset.id]++;
        renderMenuGrid();
        updateCartSummary();
      });
    });

    const decBtns = elements.menuGrid.querySelectorAll('.dec-btn');
    decBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        restaurantCart[btn.dataset.id]--;
        if (restaurantCart[btn.dataset.id] <= 0) {
          delete restaurantCart[btn.dataset.id];
        }
        renderMenuGrid();
        updateCartSummary();
      });
    });
  }

  function updateCartSummary() {
    let total = 0;
    let itemCount = 0;

    Object.keys(restaurantCart).forEach(id => {
      const item = RESTAURANT_MENU.find(m => m.id === id);
      if (item) {
        total += item.price * restaurantCart[id];
        itemCount += restaurantCart[id];
      }
    });

    elements.cartTotal.textContent = `$${total.toFixed(2)}`;
    elements.checkoutRestaurantBtn.disabled = itemCount === 0;
  }

  async function placeRestaurantOrder() {
    const selectedTicketId = elements.restaurantTicketSelect.value;
    const currentTicket = getCurrentUserTickets().find((ticket) => ticket.ticketId === selectedTicketId);

    if (!currentTicket) {
      closeRestaurantModal();
      openDashboard();
      showDashboardNotice('Choose a valid ticket before placing your food order.');
      return;
    }

    const itemsList = [];
    
    Object.keys(restaurantCart).forEach(id => {
      const item = RESTAURANT_MENU.find(m => m.id === id);
      if (item) {
        itemsList.push(`${restaurantCart[id]}x ${item.name}`);
      }
    });

    const orderDesc = itemsList.join(', ');

    const items = Object.keys(restaurantCart).map(id => {
      const menuItem = RESTAURANT_MENU.find(m => m.id === id);
      return { id, name: menuItem?.name, quantity: restaurantCart[id] };
    });

    try {
      await api.post('/food-orders', {
        email: getCurrentUserEmail(),
        items: items,
        notes: `Total: ${elements.cartTotal.textContent}`
      });
      
      closeRestaurantModal();
      await renderServiceRequests();
      openDashboard();
      showDashboardNotice('Order placed successfully! The restaurant is preparing your food.');
    } catch (err) {
      console.error(err);
      showDashboardNotice('Failed to place order.');
    }
  }

  function openServiceModal() {
    const currentTickets = getCurrentUserTickets();

    if (currentTickets.length === 0) {
      showDashboardNotice('Book a ticket first so the emergency teams know your seat.');
      return;
    }

    elements.emergencySeatDisplay.textContent = getTicketSeatLabel(currentTickets[0]);
    elements.emergencyHeader.classList.remove('hidden');
    elements.emergencyContent.classList.remove('hidden');
    elements.emergencySuccess.classList.add('hidden');
    elements.emergencyCard.classList.remove('sending', 'success-state');

    elements.serviceModal.classList.remove('hidden');
  }

  function closeServiceModal() {
    elements.serviceModal.classList.add('hidden');
  }

  function isSeatUnavailable(sectionName, seatId) {
    const occupiedKey = `${sectionName}-${seatId}`;

    if (!occupiedSeatCache.has(occupiedKey)) {
      const hashValue = Array.from(occupiedKey).reduce((sum, character) => sum + character.charCodeAt(0), 0);
      occupiedSeatCache.set(occupiedKey, hashValue % 10 < 3);
    }

    const alreadyBooked = state.tickets.some(
      (ticket) => ticket.section === sectionName && ticket.row === seatId.charAt(0) && ticket.seatNumber === seatId.substring(1)
    );

    return occupiedSeatCache.get(occupiedKey) || alreadyBooked;
  }

  function generateSeats() {
    elements.seatsGrid.innerHTML = '';

    const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
    const seatsPerRow = 8;

    rows.forEach((row, rowIndex) => {
      const rowContainer = document.createElement('div');
      rowContainer.style.display = 'flex';
      rowContainer.style.alignItems = 'center';
      rowContainer.style.justifyContent = 'center';
      rowContainer.style.gap = '8px';
      rowContainer.style.marginBottom = '12px';

      const rowLabel = document.createElement('div');
      rowLabel.innerText = row;
      rowLabel.style.width = '20px';
      rowLabel.style.fontWeight = 'bold';
      rowLabel.style.color = '#64748b';
      rowContainer.appendChild(rowLabel);

      for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber += 1) {
        const seatId = `${row}${seatNumber}`;
        const rowPremium = (5 - rowIndex) * 10;
        const seatPrice = state.currentSection.price + rowPremium;

        const seatDiv = document.createElement('div');
        seatDiv.classList.add('seat');
        seatDiv.innerText = String(seatNumber);
        seatDiv.title = `Row ${row}, Seat ${seatNumber} - ${formatCurrency(seatPrice)}`;

        if (isSeatUnavailable(state.currentSection.name, seatId)) {
          seatDiv.classList.add('occupied');
          seatDiv.title = `Row ${row}, Seat ${seatNumber} - Occupied`;
        } else {
          seatDiv.classList.add('available');

          const isSelected = state.selectedSeats.some(
            (seat) => seat.id === seatId && seat.section === state.currentSection.name
          );

          if (isSelected) {
            seatDiv.classList.add('selected');
          }

          seatDiv.addEventListener('click', () => toggleSeatSelection(seatDiv, seatId, seatPrice));
        }

        rowContainer.appendChild(seatDiv);
      }

      const rightRowLabel = document.createElement('div');
      rightRowLabel.innerText = row;
      rightRowLabel.style.width = '20px';
      rightRowLabel.style.textAlign = 'right';
      rightRowLabel.style.fontWeight = 'bold';
      rightRowLabel.style.color = '#64748b';
      rowContainer.appendChild(rightRowLabel);

      elements.seatsGrid.appendChild(rowContainer);
    });
  }

  function toggleSeatSelection(seatDiv, seatId, seatPrice) {
    const selectedIndex = state.selectedSeats.findIndex(
      (seat) => seat.id === seatId && seat.section === state.currentSection.name
    );

    if (selectedIndex >= 0) {
      seatDiv.classList.remove('selected');
      state.selectedSeats.splice(selectedIndex, 1);
    } else {
      // Allow only 1 ticket
      if (state.selectedSeats.length >= 1) {
        document.querySelectorAll('.seat.selected').forEach(s => s.classList.remove('selected'));
        state.selectedSeats = [];
      }

      seatDiv.classList.add('selected');
      state.selectedSeats.push({
        id: seatId,
        section: state.currentSection.name,
        price: seatPrice
      });
    }

    updateOrderSummary();
  }

  function updateOrderSummary() {
    elements.selectedSeatsList.innerHTML = '';
    let ticketTotal = 0;
    const serviceFeePerTicket = 25;

    if (state.selectedSeats.length === 0) {
      elements.selectedSeatsList.innerHTML = '<div class="empty-state">Please select a seat from the map</div>';
      elements.subTotal.innerText = formatCurrency(0);
      elements.serviceFee.innerText = formatCurrency(0);
      elements.totalPrice.innerText = formatCurrency(0);
      elements.checkoutBtn.disabled = true;
      return;
    }

    state.selectedSeats.forEach((seat) => {
      ticketTotal += seat.price;

      const item = document.createElement('div');
      item.classList.add('selected-seat-item');
      item.innerHTML = `
        <div class="seat-info-box">
          <div class="seat-info-col">
            <span class="seat-info-label">Section:</span>
            <span class="seat-info-val">${escapeHtml(seat.section)}</span>
          </div>
          <div class="seat-info-col">
            <span class="seat-info-label">Row:</span>
            <span class="seat-info-val">${escapeHtml(seat.id.charAt(0))}</span>
          </div>
          <div class="seat-info-col">
            <span class="seat-info-label">Seat:</span>
            <span class="seat-info-val">${escapeHtml(seat.id.substring(1))}</span>
          </div>
          <div class="seat-info-col" style="font-size: 24px;">⚽</div>
        </div>
        <button class="remove-seat" data-id="${escapeHtml(seat.id)}" data-section="${escapeHtml(seat.section)}">&times;</button>
      `;
      elements.selectedSeatsList.appendChild(item);
    });

    const totalServiceFees = serviceFeePerTicket * state.selectedSeats.length;
    const finalTotal = ticketTotal + totalServiceFees;

    elements.subTotal.innerText = formatCurrency(ticketTotal);
    elements.serviceFee.innerText = formatCurrency(totalServiceFees);
    elements.totalPrice.innerText = formatCurrency(finalTotal);
    elements.checkoutBtn.disabled = false;

    document.querySelectorAll('.remove-seat').forEach((button) => {
      button.addEventListener('click', (event) => {
        const id = event.currentTarget.getAttribute('data-id');
        const section = event.currentTarget.getAttribute('data-section');

        state.selectedSeats = state.selectedSeats.filter((seat) => !(seat.id === id && seat.section === section));
        updateOrderSummary();

        if (state.currentSection.name === section) {
          generateSeats();
        }
      });
    });
  }

  function createTicketRecord(seat) {
    const ticketId = `EGBEL-${seat.section.substring(0, 2).toUpperCase()}-R${seat.id.charAt(0)}S${seat.id.substring(1)}-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      ticketId,
      section: seat.section,
      sectionShort: getSectionShort(seat.section),
      row: seat.id.charAt(0),
      seatNumber: seat.id.substring(1),
      price: seat.price,
      gate: '03',
      ownerName: state.user.name,
      ownerEmail: state.user.email,
      purchasedAt: new Date().toISOString()
    };
  }

  async function completePurchase() {
    // Final guard: block if email already has a ticket
    if (hasTicketForEmail(getCurrentUserEmail())) {
      closeBookingFlow();
      openDashboard();
      return;
    }

    const newTickets = state.selectedSeats.map(createTicketRecord);
    
    try {
      for (const t of newTickets) {
        await api.post('/tickets', {
          ownerEmail: t.ownerEmail,
          price: t.price,
          sectionShort: t.sectionShort,
          row: t.row,
          seatNumber: t.seatNumber
        });
      }

      state.selectedSeats = [];
      await renderAllDynamicData();

      elements.bookingMain.style.display = 'none';
      elements.bookingSidebar.style.display = 'none';
      elements.ticketView.classList.remove('hidden');
      updateBreadcrumb(3);

      elements.successSub.textContent = `${newTickets.length} ticket(s) saved in My Tickets. Entering Matchday Portal...`;
      
      // Cinematic transition to matchday portal
      setTimeout(() => {
        portalTransitionToServices();
      }, 1500);
    } catch (err) {
      console.error('Ticket purchase failed:', err);
      alert(err.message || 'Failed to complete purchase. Please try again.');
    }
  }

  function portalTransitionToServices() {
    // Close booking modal first
    if (elements.modal) elements.modal.classList.add('hidden');

    // Show transition overlay
    const overlay = elements.portalTransition;
    if (!overlay) { openDashboard('portal'); return; }

    // Reset loader
    elements.ptLoaderFill.style.transition = 'none';
    elements.ptLoaderFill.style.width = '0%';

    // Activate overlay (fade in)
    overlay.classList.add('is-active');
    overlay.classList.remove('is-fading');

    // Kick the loader animation after a tiny paint frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        elements.ptLoaderFill.style.transition = 'width 1.8s cubic-bezier(0.22, 1, 0.36, 1)';
        elements.ptLoaderFill.style.width = '100%';
      });
    });

    // While overlay is visible, switch the background to portal mode
    setTimeout(() => {
      openDashboard('portal');
    }, 900);

    // Fade out overlay
    setTimeout(() => {
      overlay.classList.add('is-fading');
    }, 2200);

    // Cleanup
    setTimeout(() => {
      overlay.classList.remove('is-active', 'is-fading');
    }, 2800);
  }

  elements.bookBtn.addEventListener('click', () => {
    if (getCurrentUserTickets().length >= 1) {
      elements.dashboardPage.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!ensureAuthenticated(openBookingFlow)) {
      return;
    }

    openBookingFlow();
  });

  elements.openAuthBtn.addEventListener('click', () => {
    openAuthModal(null);
  });

  elements.closeAuthModalBtn.addEventListener('click', () => {
    closeAuthModal();
  });

  elements.closeBookingBtn.addEventListener('click', () => {
    closeBookingFlow();
  });

  if (elements.closeDashboardBtn) {
    elements.closeDashboardBtn.addEventListener('click', () => {
      closeDashboard();
    });
  }

  elements.closeServiceModalBtn.addEventListener('click', () => {
    closeServiceModal();
  });

  if (elements.toggleSignupBtn && elements.toggleSigninBtn) {
    elements.toggleSignupBtn.addEventListener('click', () => {
      elements.authForm.dataset.mode = 'signup';
      elements.toggleSignupBtn.classList.add('active');
      elements.toggleSigninBtn.classList.remove('active');
      elements.authSubmitBtn.textContent = 'Create Account';
      elements.authErrorMsg.classList.add('hidden');
      elements.authName.required = true;
    });

    elements.toggleSigninBtn.addEventListener('click', () => {
      elements.authForm.dataset.mode = 'signin';
      elements.toggleSigninBtn.classList.add('active');
      elements.toggleSignupBtn.classList.remove('active');
      elements.authSubmitBtn.textContent = 'Sign In';
      elements.authErrorMsg.classList.add('hidden');
      elements.authName.required = false;
    });
  }

  elements.authForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (elements.authErrorMsg) elements.authErrorMsg.classList.add('hidden');
    
    const mode = elements.authForm.dataset.mode || 'signup';
    const name = elements.authName.value.trim();
    const email = elements.authEmail.value.trim().toLowerCase();
    const phone = elements.authPhone.value.trim();
    const password = elements.authPassword.value;

    elements.authSubmitBtn.disabled = true;
    const originalBtnText = elements.authSubmitBtn.textContent;
    elements.authSubmitBtn.textContent = 'Please wait...';

    try {
      if (mode === 'signup') {
        const res = await api.post('/auth/signup', { name, email, phone, password });
        state.user = res.user;
      } else {
        const res = await api.post('/auth/login', { email, password });
        state.user = res.user;
      }

      saveUser();
      closeAuthModal(false);
      renderAllDynamicData();
      updateAppView();

      // If this email already has a ticket, go straight to dashboard
      if (hasTicketForEmail(state.user.email)) {
        pendingAction = null;
        openDashboard();
        return;
      }

      if (pendingAction) {
        const action = pendingAction;
        pendingAction = null;
        action();
      }
    } catch (err) {
      if (elements.authErrorMsg) {
        elements.authErrorMsg.textContent = err.message || 'Authentication failed.';
        elements.authErrorMsg.classList.remove('hidden');
      }
    } finally {
      elements.authSubmitBtn.disabled = false;
      elements.authSubmitBtn.textContent = originalBtnText;
    }
  });

  elements.authLogoutBtn.addEventListener('click', () => {
    state.user = null;
    pendingAction = null;
    saveUser();
    closeAuthModal(false);
    closeDashboard();
    closeServiceModal();
    closeBookingFlow();
    renderAllDynamicData();
    updateAppView();
  });

  // Password change handler
  if (elements.authChangePwBtn) {
    elements.authChangePwBtn.addEventListener('click', async () => {
      if (!state.user?.email) return;
      
      const currentPw = elements.authPassword?.value || '';
      const newPw = elements.authNewPassword?.value || '';

      if (!currentPw) {
        if (elements.authErrorMsg) {
          elements.authErrorMsg.textContent = 'Enter your current password.';
          elements.authErrorMsg.classList.remove('hidden');
        }
        return;
      }
      if (!newPw || newPw.length < 4) {
        if (elements.authErrorMsg) {
          elements.authErrorMsg.textContent = 'New password must be at least 4 characters.';
          elements.authErrorMsg.classList.remove('hidden');
        }
        return;
      }

      elements.authChangePwBtn.disabled = true;
      elements.authChangePwBtn.textContent = 'Updating...';
      if (elements.authErrorMsg) elements.authErrorMsg.classList.add('hidden');
      if (elements.authSuccessMsg) elements.authSuccessMsg.classList.add('hidden');

      try {
        await api.put('/auth/password', {
          email: state.user.email,
          currentPassword: currentPw,
          newPassword: newPw
        });
        
        elements.authPassword.value = '';
        elements.authNewPassword.value = '';
        if (elements.authSuccessMsg) {
          elements.authSuccessMsg.textContent = '✓ Password updated successfully!';
          elements.authSuccessMsg.classList.remove('hidden');
        }
      } catch (err) {
        if (elements.authErrorMsg) {
          elements.authErrorMsg.textContent = err.message || 'Failed to update password.';
          elements.authErrorMsg.classList.remove('hidden');
        }
      } finally {
        elements.authChangePwBtn.disabled = false;
        elements.authChangePwBtn.textContent = 'Change Password';
      }
    });
  }

  document.querySelectorAll('.stadium-section').forEach((section) => {
    section.addEventListener('click', (event) => {
      const sectionElement = event.currentTarget;

      state.currentSection.name = sectionElement.getAttribute('data-section');
      state.currentSection.price = Number.parseInt(sectionElement.getAttribute('data-price'), 10);
      elements.minimapDot.style.top = `calc(${sectionElement.style.top} + ${sectionElement.style.height} / 2 - 5px)`;
      elements.minimapDot.style.left = `calc(${sectionElement.style.left} + ${sectionElement.style.width} / 2 - 5px)`;
      elements.currentSectionTitle.innerText = state.currentSection.name;
      elements.stadiumView.classList.add('hidden');
      elements.seatView.classList.remove('hidden');
      generateSeats();
    });
  });

  elements.backToStadiumBtn.addEventListener('click', () => {
    elements.seatView.classList.add('hidden');
    elements.stadiumView.classList.remove('hidden');
  });

  elements.checkoutBtn.addEventListener('click', () => {
    elements.stadiumView.classList.add('hidden');
    elements.seatView.classList.add('hidden');
    elements.bookingSidebar.style.display = 'none';
    elements.paymentView.classList.remove('hidden');
    updateBreadcrumb(2);
  });

  elements.backToCartBtn.addEventListener('click', () => {
    elements.paymentView.classList.add('hidden');
    elements.bookingSidebar.style.display = '';
    elements.seatView.classList.remove('hidden');
    updateBreadcrumb(1);
  });

  elements.fakePaymentForm.addEventListener('submit', (event) => {
    event.preventDefault();

    elements.confirmPayBtn.disabled = true;
    elements.confirmPayBtn.innerText = 'Processing...';
    elements.confirmPayBtn.style.opacity = '0.7';

    window.setTimeout(() => {
      completePurchase();
      elements.confirmPayBtn.disabled = false;
      elements.confirmPayBtn.innerText = 'Pay Now';
      elements.confirmPayBtn.style.opacity = '1';
    }, 800);
  });

  elements.goToPortalBtn.addEventListener('click', () => {
    openDashboard('portal');
  });

  if (elements.navPortal) {
    elements.navPortal.addEventListener('click', (event) => {
      event.preventDefault();
      routeToIndexSection(currentUserHasTickets() ? 'portal' : 'matches');
    });
  }

  elements.navTickets.addEventListener('click', (event) => {
    event.preventDefault();
    routeToIndexSection('tickets');
  });

  if (elements.navServices) {
    elements.navServices.addEventListener('click', (event) => {
      event.preventDefault();
      routeToIndexSection('services');
    });
  }

  elements.browseMenuBtn.addEventListener('click', () => {
    if (!ensureAuthenticated(() => openRestaurantModal())) {
      return;
    }

    openRestaurantModal();
  });

  elements.requestHelpBtn.addEventListener('click', () => {
    if (!ensureAuthenticated(() => openServiceModal())) {
      return;
    }
    openServiceModal();
  });

  elements.emergencyBtns.forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      const type = event.currentTarget.getAttribute('data-type');
      const currentTickets = getCurrentUserTickets();
      const currentTicket = currentTickets[0];

      if (!currentTicket) return;

      // Prevent double click
      if (btn.classList.contains('is-sending')) return;

      // Check if user already has an active request of this type
      const existingOfType = state.serviceRequests.find(
        r => r.kind === 'assistance' && 
             (r.unitType || '').toLowerCase() === type.toLowerCase() &&
             r.ownerEmail === state.user?.email &&
             r.workflowStatus !== 'DONE'
      );
      if (existingOfType) {
        // Pulse the button red to indicate already sent
        btn.classList.add('already-sent');
        setTimeout(() => btn.classList.remove('already-sent'), 1500);
        showDashboardNotice(`You already have an active ${type.toLowerCase()} request. Please wait for a response.`);
        closeServiceModal();
        openDashboard('services');
        return;
      }

      // Interactive feedback: show sending state
      btn.classList.add('is-sending');
      elements.emergencyCard.classList.add('sending');

      const newReq = {
        kind: 'assistance',
        title: `${type} Assistance`,
        subtitle: getTicketSeatLabel(currentTicket),
        status: 'Pending',
        workflowStatus: 'PENDING',
        details: `Priority High`,
        notes: 'Live location shared from the user portal.',
        ticketId: currentTicket.ticketId,
        ownerEmail: currentTicket.ownerEmail,
        ownerName: currentTicket.ownerName,
        ownerPhone: state.user?.phone || '',
        unitType: type.toLowerCase(),
        section: currentTicket.sectionShort,
        row: currentTicket.row,
        seat: currentTicket.seatNumber,
        source: 'user-portal',
        risk: 'HIGH'
      };

      try {
        const savedReq = await api.post('/requests', newReq);
        state.serviceRequests.unshift(savedReq);
        renderServiceRequests();

        btn.classList.remove('is-sending');
        btn.classList.add('is-sent');
        elements.emergencyCard.classList.remove('sending');
        elements.emergencyCard.classList.add('success-state');
        elements.emergencyHeader.classList.add('hidden');
        elements.emergencyContent.classList.add('hidden');
        elements.emergencySuccess.classList.remove('hidden');

        window.setTimeout(() => {
          closeServiceModal();
          openDashboard();
          showDashboardNotice(`${type} request sent to stadium control.`);
          // Reset button state after modal closes
          btn.classList.remove('is-sent');
        }, 4000);
      } catch (err) {
        console.error('Failed to send emergency request:', err);
        btn.classList.remove('is-sending');
        elements.emergencyCard.classList.remove('sending');
        showDashboardNotice('Failed to send emergency request. Please try again or find a steward.');
      }
    });
  });

  [elements.authModal, elements.modal, elements.serviceModal].forEach((overlay) => {
    overlay.addEventListener('click', (event) => {
      if (event.target !== overlay) {
        return;
      }

      if (overlay === elements.authModal) {
        closeAuthModal();
      }

      if (overlay === elements.modal) {
        closeBookingFlow();
      }

      if (overlay === elements.serviceModal) {
        closeServiceModal();
      }
    });
  });

  if (elements.closeRestaurantModalBtn) {
    elements.closeRestaurantModalBtn.addEventListener('click', closeRestaurantModal);
  }

  if (elements.categoryBtns) {
    elements.categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        elements.categoryBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        renderMenuGrid();
      });
    });
  }

  if (elements.checkoutRestaurantBtn) {
    elements.checkoutRestaurantBtn.addEventListener('click', placeRestaurantOrder);
  }

  if (elements.navToggle) {
    elements.navToggle.addEventListener('click', () => {
      setNavbarOpen(!elements.navbar?.classList.contains('is-open'));
    });
  }

  if (elements.navMenu) {
    elements.navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        setNavbarOpen(false);
      });
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 960) {
      setNavbarOpen(false);
    }
  });

  window.addEventListener('hashchange', () => {
    syncIndexRoute();
  });

  window.addEventListener('storage', (event) => {
    if (![STORAGE_KEYS.user, STORAGE_KEYS.tickets, STORAGE_KEYS.services].includes(event.key)) {
      return;
    }

    state.user = readStorage(STORAGE_KEYS.user, null);
    state.tickets = readStorage(STORAGE_KEYS.tickets, []);
    renderAllDynamicData();
    updateAppView();
  });

  async function loadServiceRequests() {
    if (!state.user?.email) return;
    try {
      state.serviceRequests = await api.get(`/requests?email=${encodeURIComponent(state.user.email)}`);
      renderServiceRequests();
    } catch (err) {
      console.error('Failed to load service requests:', err);
    }
  }

  api.connectSSE();
  api.on('new-request', (req) => {
    // Only add to state if it belongs to current user
    if (state.user?.email && req.ownerEmail === state.user.email) {
      if (!state.serviceRequests.find(r => r.id == req.id)) {
        state.serviceRequests.unshift(req);
        renderServiceRequests();
      }
    }
  });

  api.on('update-request', (req) => {
    // Only update if it belongs to current user
    if (state.user?.email && req.ownerEmail === state.user.email) {
      const index = state.serviceRequests.findIndex(r => r.id == req.id);
      if (index !== -1) {
        state.serviceRequests[index] = req;
        renderServiceRequests();
      }
    }
  });

  // Initial Data Load
  (async () => {
    await renderAllDynamicData();
    initIntro();
    updateTimer();
    window.setInterval(updateTimer, 1000);
    updateOrderSummary();
  })();
});