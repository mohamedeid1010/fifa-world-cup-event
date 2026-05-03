// Active Dispatches Page Functionality

// Handle navigation button clicks
const navButtons = document.querySelectorAll('.nav-btn');
navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const page = btn.getAttribute('data-page');
    
    // Remove active class from all buttons
    navButtons.forEach(b => b.classList.remove('active'));
    // Add active class to clicked button
    btn.classList.add('active');
    
    // Navigation logic
    const pageUrls = {
      'control-units': '/index.html',
      'police': '/src/pages/police.html',
      'medical': '/src/pages/active-dispatches.html',
      'communications': '/communications.html'
    };
    
    if (pageUrls[page]) {
      console.log(`Navigating to ${pageUrls[page]}`);
      window.location.href = pageUrls[page];
    }
  });
});


// Handle search bar functionality
const searchBar = document.querySelector('.search-bar');
if (searchBar) {
  searchBar.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const incidentCards = document.querySelectorAll('.incident-item');
    
    incidentCards.forEach(card => {
      const userName = card.getAttribute('data-user-name')?.toLowerCase() || '';
      const section = card.getAttribute('data-section')?.toLowerCase() || '';
      const incidentType = card.getAttribute('data-incident-type')?.toLowerCase() || '';
      const unit = card.getAttribute('data-unit')?.toLowerCase() || '';
      const risk = card.getAttribute('data-risk')?.toLowerCase() || '';
      
      // Convert risk values to display text for better searchability
      const riskDisplay = risk === 'high' ? 'High risk' : 
                         risk === 'risk' ? 'High' : 
                         risk === 'normal' ? 'Normal' : risk;
      
      const matchesSearch = userName.includes(searchTerm) || 
                           section.includes(searchTerm) || 
                           incidentType.includes(searchTerm) || 
                           unit.includes(searchTerm) ||
                           risk.includes(searchTerm) ||
                           riskDisplay.includes(searchTerm);
      
      card.style.display = matchesSearch ? 'block' : 'none';
    });
  });
}

// Handle new dispatch button
const newDispatchBtn = document.querySelector('.new-dispatch-btn');
const newDispatchModal = document.getElementById('newDispatchModal');
const newDispatchForm = document.getElementById('newDispatchForm');
const dispatchModalClose = document.querySelector('.dispatch-modal-close');
const cancelBtn = document.querySelector('.cancel-btn');
const riskButtonsModal = document.querySelectorAll('.risk-btn-modal');

let selectedRiskModal = 'HIGH';

if (newDispatchBtn && newDispatchModal) {
  newDispatchBtn.addEventListener('click', () => {
    newDispatchModal.classList.add('active');
    newDispatchModal.setAttribute('aria-hidden', 'false');
    // Reset form
    newDispatchForm.reset();
    selectedRiskModal = 'HIGH';
    setRiskButtonsModal(selectedRiskModal);
    // Focus first input for accessibility
    document.getElementById('dispatchUserName').focus();
  });
}

// Modal close handlers
function closeModal() {
  newDispatchModal.classList.remove('active');
  newDispatchModal.setAttribute('aria-hidden', 'true');
}

if (dispatchModalClose && newDispatchModal) {
  dispatchModalClose.addEventListener('click', closeModal);
}

if (cancelBtn && newDispatchModal) {
  cancelBtn.addEventListener('click', closeModal);
}

// Close modal when clicking outside
if (newDispatchModal) {
  newDispatchModal.addEventListener('click', (e) => {
    if (e.target === newDispatchModal) {
      closeModal();
    }
  });
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && newDispatchModal.classList.contains('active')) {
    closeModal();
  }
});

// Handle risk button selection in modal
function setRiskButtonsModal(activeRisk) {
  riskButtonsModal.forEach(btn => {
    const risk = btn.getAttribute('data-risk');
    const isActive = risk === activeRisk;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive.toString());
  });
}

if (riskButtonsModal) {
  riskButtonsModal.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRiskModal = btn.getAttribute('data-risk');
      setRiskButtonsModal(selectedRiskModal);
    });
  });
}

// Handle form submission
if (newDispatchForm && newDispatchModal) {
  newDispatchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form values
    const userName = document.getElementById('dispatchUserName').value.trim();
    const section = document.getElementById('dispatchSection').value.trim();
    const row = document.getElementById('dispatchRow').value.trim();
    const seat = document.getElementById('dispatchSeat').value.trim();
    const incidentType = document.getElementById('dispatchIncidentType').value;
    const unit = document.getElementById('dispatchUnit').value.trim();
    
    // Basic validation
    if (!userName || !section || !row || !seat || !incidentType || !unit) {
      alert('Please fill in all required fields.');
      return;
    }
    
    // Create new dispatch request
    const newRequest = { 
      userName: userName,
      section: section,
      row: row,
      seat: seat,
      incidentType: incidentType,
      requestTimestamp: new Date().toISOString(),
      timeText: formatRequestTime(),
      unit: unit,
      risk: selectedRiskModal,
      badge: 'NEW DISPATCH',
      incidentId: Date.now() // Simple ID generation
    };
    
    // Create and add the incident card
    const newCard = createIncidentCard(newRequest);
    priorityQueue.appendChild(newCard);
    incrementStatusCount('PENDING');
    
    // Close modal
    closeModal();
    
    console.log('New dispatch created:', newRequest);
  });
}
const summaryUserName = document.getElementById('summaryUserName');
const summarySection = document.getElementById('summarySection');
const summaryRow = document.getElementById('summaryRow');
const summarySeat = document.getElementById('summarySeat');
const summaryIncidentType = document.getElementById('summaryIncidentType');
const summaryElapsed = document.getElementById('summaryElapsed');
const summaryUnit = document.getElementById('summaryUnit');
const riskButtons = document.querySelectorAll('.risk-btn');
const addRequestBtn = document.getElementById('addRequestBtn');
const priorityQueue = document.getElementById('priorityQueue');
const archiveQueue = document.getElementById('archiveQueue');
const archiveSection = document.getElementById('archiveSection');
const archiveToggleBtn = document.getElementById('archiveToggleBtn');
const dispatchStatusText = document.querySelector('.dispatch-status');

if (archiveToggleBtn && archiveSection) {
  archiveToggleBtn.addEventListener('click', () => {
    archiveSection.classList.toggle('collapsed');
    const isExpanded = !archiveSection.classList.contains('collapsed');
    const queue = document.getElementById('archiveQueue');
    if (queue) {
      queue.classList.toggle('hidden', !isExpanded);
    }
    archiveToggleBtn.setAttribute('aria-expanded', String(isExpanded));
    archiveToggleBtn.setAttribute('aria-label', isExpanded ? 'Hide archive' : 'Show archive');
  });
}

function formatRequestTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function padTime(value) {
  return String(value).padStart(2, '0');
}

function getElapsedText(requestTimestamp) {
  const start = new Date(requestTimestamp);
  if (Number.isNaN(start.getTime())) return '00:00';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (hours > 0) {
    return `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
  }

  return `${padTime(minutes)}:${padTime(seconds)}`;
}

function updateElapsedTimes() {
  document.querySelectorAll('.incident-item[data-request-timestamp]').forEach(card => {
    const requestTimestamp = card.dataset.requestTimestamp;
    const elapsedElement = card.querySelector('.time-elapsed');
    if (!requestTimestamp || !elapsedElement) return;

    elapsedElement.textContent = `ELAPSED: ${getElapsedText(requestTimestamp)}`;
  });
}

setInterval(updateElapsedTimes, 1000);
updateElapsedTimes();

function parseStatusCounts() {
  if (!dispatchStatusText) return { DONE: 0, PROCESSING: 0, PENDING: 0 };
  const match = dispatchStatusText.textContent.match(/(\d+)\s*Done.*?(\d+)\s*Processing.*?(\d+)\s*PENDING/i);
  if (!match) return { DONE: 0, PROCESSING: 0, PENDING: 0 };
  return {
    DONE: Number(match[1]) || 0,
    PROCESSING: Number(match[2]) || 0,
    PENDING: Number(match[3]) || 0
  };
}

function writeStatusCounts() {
  if (!dispatchStatusText) return;
  dispatchStatusText.textContent = ` • ${statusCounts.DONE} Done • ${statusCounts.PROCESSING} Processing • ${statusCounts.PENDING} PENDING`;
}

function incrementStatusCount(status) {
  statusCounts[status] = (statusCounts[status] || 0) + 1;
  writeStatusCounts();
}

function decrementStatusCount(status) {
  statusCounts[status] = Math.max(0, (statusCounts[status] || 0) - 1);
  writeStatusCounts();
}

const statusCounts = parseStatusCounts();

const incomingRequest = {
  userName: 'Alexander Vance',
  section: '402',
  row: 'L',
  seat: '24',
  incidentType: 'MEDICAL EMERGENCY',
  requestTimestamp: new Date().toISOString(),
  timeText: formatRequestTime(),
  elapsed: '04:12M',
  unit: 'UNIT 12A',
  badge: 'LIVE LOCATION SHARED'
};

let selectedRisk = 'HIGH';

function setRiskButtons(activeRisk) {
  riskButtons.forEach(btn => {
    const risk = btn.getAttribute('data-risk');
    btn.classList.toggle('active', risk === activeRisk);
  });
}

function renderIncomingRequest() {
  summaryUserName.textContent = incomingRequest.userName;
  summarySection.textContent = incomingRequest.section;
  summaryRow.textContent = incomingRequest.row;
  summarySeat.textContent = incomingRequest.seat;
  summaryIncidentType.value = incomingRequest.incidentType;
  summaryElapsed.textContent = incomingRequest.timeText || incomingRequest.elapsed;
  summaryUnit.textContent = incomingRequest.unit;
  setRiskButtons(selectedRisk);
}


function createIncidentCard(request) {
  const card = document.createElement('div');
  card.className = 'incident-item';
  card.setAttribute('data-user-name', request.userName);
  card.setAttribute('data-section', request.section);
  card.setAttribute('data-row', request.row);
  card.setAttribute('data-seat', request.seat);
  card.setAttribute('data-incident-type', request.incidentType);
  card.setAttribute('data-unit', request.unit);
  card.setAttribute('data-risk', request.risk);
  if (request.requestTimestamp) {
    card.setAttribute('data-request-timestamp', request.requestTimestamp);
  }

  const riskBadgeClass = request.risk === 'HIGH' ? 'risk-high' : request.risk === 'RISK' ? 'risk-warning' : 'risk-normal';
  const riskText = request.risk === 'HIGH' ? 'High risk' : request.risk === 'RISK' ? 'High' : 'Normal';
  const requestTime = request.requestTimestamp ? formatRequestTime(new Date(request.requestTimestamp)) : request.timeText || request.elapsed;
  const elapsedText = request.requestTimestamp ? getElapsedText(request.requestTimestamp) : null;

  card.innerHTML = `
    <div class="incident-header">
      <span>
        <span class="incident-badge">${request.badge}</span>
        <span class="incident-detail">${request.incidentType}</span>
        <span class="risk-badge ${riskBadgeClass}">${riskText}</span>
      </span>
      <button class="delete-btn" data-incident-id="${request.incidentId || 'new'}">🗑️</button>
    </div>
    <div class="incident-info">
      <p>Name: ${request.userName}</p>
      <p>Location: Section ${request.section} • Row ${request.row} • Seat ${request.seat}</p>
      <p class="request-time">REQUEST TIME: ${requestTime}</p>
    </div>
    <div class="incident-status">
      <span class="incident-unit">${request.unit}</span>
      <span class="incident-route status pending">PENDING</span>
    </div>
    <div class="status-selector" style="display: none;">
      <button class="status-btn processing" data-status="PROCESSING">🟠 PROCESSING</button>
      <button class="status-btn done" data-status="DONE">✅ DONE</button>
    </div>
  `;

  if (request.risk === 'HIGH') card.classList.add('risk-high');
  if (request.risk === 'RISK') card.classList.add('risk-warning');
  if (request.risk === 'NORMAL') card.classList.add('risk-normal');

  // Add click handler for status selection
  card.addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) {
      return;
    }
    if (e.target.closest('.status-btn')) {
      return;
    }
    if (e.target.closest('.incident-badge')) {
      // Handle live location shared click
      openLocationInMaps(request);
      return;
    }

    // Hide all other status selectors
    document.querySelectorAll('.status-selector').forEach(selector => {
      if (selector !== card.querySelector('.status-selector')) {
        selector.style.display = 'none';
      }
    });

    // Toggle this card's status selector
    const selector = card.querySelector('.status-selector');
    selector.style.display = selector.style.display === 'none' || selector.style.display === '' ? 'flex' : 'none';
  });

  return card;
}

function createArchiveCard(request) {
  const card = document.createElement('div');
  card.className = 'incident-item archive-item';

  const riskBadgeClass = request.risk === 'HIGH' ? 'risk-high' : request.risk === 'RISK' ? 'risk-warning' : 'risk-normal';
  const riskText = request.risk === 'HIGH' ? 'High risk' : request.risk === 'RISK' ? 'High' : 'Normal';
  const statusText = request.status || 'ARCHIVED';
  const timeText = request.timeText || request.elapsed || 'TIME UNKNOWN';

  card.innerHTML = `
    <div class="incident-header">
      <span>
        <span class="incident-badge">ARCHIVED</span>
        <span class="incident-detail">${request.incidentType}</span>
        <span class="risk-badge ${riskBadgeClass}">${riskText}</span>
      </span>
      <span class="incident-route status archived">${statusText}</span>
    </div>
    <div class="incident-info">
      <p>Name: ${request.userName}</p>
      <p>Location: Section ${request.section} • Row ${request.row} • Seat ${request.seat}</p>
      <p class="time-elapsed">${timeText}</p>
    </div>
    <div class="incident-status">
      <span class="incident-unit">${request.unit}</span>
    </div>
  `;

  return card;
}

// Function to open location in Google Maps
function openLocationInMaps(request) {
  // Convert stadium location to approximate coordinates
  // Assuming a typical FIFA World Cup stadium layout
  const baseLat = -23.5505; // Approximate latitude for a stadium (using São Paulo as example)
  const baseLng = -46.6333; // Approximate longitude for a stadium (using São Paulo as example)
  
  // Calculate offset based on section (assuming sections are numbered around the stadium)
  const sectionNum = parseInt(request.section) || 100;
  const sectionAngle = ((sectionNum - 100) % 360) * (Math.PI / 180); // Convert to radians
  
  // Create offset based on section (sections radiate outward from center)
  const radius = 0.001; // Small radius for stadium sections
  const latOffset = Math.cos(sectionAngle) * radius;
  const lngOffset = Math.sin(sectionAngle) * radius;
  
  // Add small random variation for row/seat
  const rowOffset = (request.row.charCodeAt(0) - 65) * 0.0001; // A=0, B=1, etc.
  const seatOffset = (parseInt(request.seat) || 1) * 0.00001;
  
  const finalLat = baseLat + latOffset + rowOffset;
  const finalLng = baseLng + lngOffset + seatOffset;
  
  // Create Google Maps URL
  const mapsUrl = `https://www.google.com/maps?q=${finalLat},${finalLng}&ll=${finalLat},${finalLng}&z=20`;
  
  // Open in new tab
  window.open(mapsUrl, '_blank');
  
  console.log(`Opening location for Section ${request.section}, Row ${request.row}, Seat ${request.seat} in Google Maps`);
}

const currentRiskDisplay = document.getElementById('currentRiskDisplay');

if (riskButtons) {
  riskButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRisk = btn.getAttribute('data-risk');
      setRiskButtons(selectedRisk);
      
      // Update risk display in card
      if (currentRiskDisplay) {
        currentRiskDisplay.textContent = selectedRisk === 'HIGH' ? 'High risk' : selectedRisk === 'RISK' ? 'High' : 'Normal';
        currentRiskDisplay.className = 'risk-level-' + (selectedRisk === 'HIGH' ? 'high' : selectedRisk === 'RISK' ? 'warning' : 'normal');
      }
      
      console.log(`Risk level set to ${selectedRisk}`);
    });
  });
}

if (addRequestBtn && priorityQueue) {
  addRequestBtn.addEventListener('click', () => {
    const request = { 
      ...incomingRequest,
      risk: selectedRisk,
      incidentType: summaryIncidentType.value
    };
    const newCard = createIncidentCard(request);
    priorityQueue.appendChild(newCard);
    incrementStatusCount('PENDING');
    addRequestBtn.textContent = 'REQUEST ADDED';
    addRequestBtn.classList.add('added');

    setTimeout(() => {
      addRequestBtn.textContent = 'ADD REQUEST TO QUEUE';
      addRequestBtn.classList.remove('added');
    }, 1800);

    console.log('Incoming request added to queue with risk:', selectedRisk);
  });
}

renderIncomingRequest();

// Handle delete button clicks with password protection
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('delete-btn')) {
    e.stopPropagation();
    const incidentId = e.target.getAttribute('data-incident-id');
    const card = e.target.closest('.incident-item');

    const password = prompt('Enter password to delete this incident:');
    const correctPassword = 'Noor'; // You can change this password

    if (password === correctPassword) {
      if (confirm('Are you sure you want to delete this incident?')) {
        const statusLabel = card.querySelector('.incident-route');
        let currentStatus = 'PENDING';
        if (statusLabel.classList.contains('processing')) currentStatus = 'PROCESSING';
        else if (statusLabel.classList.contains('done')) currentStatus = 'DONE';

        const timeText = card.querySelector('.time-elapsed')?.textContent || '';
        const archiveRequest = {
          userName: card.getAttribute('data-user-name'),
          section: card.getAttribute('data-section'),
          row: card.getAttribute('data-row'),
          seat: card.getAttribute('data-seat'),
          incidentType: card.getAttribute('data-incident-type'),
          unit: card.getAttribute('data-unit'),
          risk: card.getAttribute('data-risk'),
          status: currentStatus,
          timeText
        };

        if (archiveQueue) {
          archiveQueue.appendChild(createArchiveCard(archiveRequest));
        }

        card.remove();
        decrementStatusCount(currentStatus);
        console.log(`Incident ${incidentId} archived and deleted`);
      }
    } else {
      alert('Incorrect password. Deletion cancelled.');
    }
  }
});

// Handle status button clicks
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('status-btn')) {
    e.stopPropagation();
    const status = e.target.getAttribute('data-status');
    const card = e.target.closest('.incident-item');
    const statusLabel = card.querySelector('.incident-route');
    const selector = card.querySelector('.status-selector');

    // Determine current status
    let currentStatus = 'PENDING';
    if (statusLabel.classList.contains('processing')) currentStatus = 'PROCESSING';
    else if (statusLabel.classList.contains('done')) currentStatus = 'DONE';

    // Decrement current status count
    decrementStatusCount(currentStatus);

    // Update to new status
    if (statusLabel) {
      statusLabel.textContent = status === 'PROCESSING' ? '🟠 PROCESSING' : '✅ DONE';
      statusLabel.classList.remove('pending', 'processing', 'done');
      statusLabel.classList.add(status === 'PROCESSING' ? 'processing' : 'done');
    }

    // Increment new status count
    incrementStatusCount(status);

    if (selector) {
      selector.style.display = 'none';
    }

    console.log(`Incident ${card.getAttribute('data-incident-id')} status set to ${status}`);
  }
});
