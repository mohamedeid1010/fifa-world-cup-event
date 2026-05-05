const STORAGE_KEYS = {
	tickets: 'fifa-matchday-tickets',
	services: 'fifa-matchday-services'
};

const CONTROL_ACCESS_KEY = 'fifa-control-access';

const elements = {
	waitingCount: document.getElementById('waiting-count'),
	readyCount: document.getElementById('ready-count'),
	archiveCount: document.getElementById('archive-count'),
	waitingBadge: document.getElementById('waiting-badge'),
	readyBadge: document.getElementById('ready-badge'),
	archiveBadge: document.getElementById('archive-badge'),
	lastSync: document.getElementById('restaurant-last-sync'),
	waitingOrders: document.getElementById('waiting-orders'),
	readyOrders: document.getElementById('ready-orders'),
	archiveOrders: document.getElementById('archive-orders')
};

function hasControlAccess() {
	const rawValue = localStorage.getItem(CONTROL_ACCESS_KEY);

	if (!rawValue) {
		return false;
	}

	try {
		return Boolean(JSON.parse(rawValue)?.grantedAt);
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

function writeStorage(key, value) {
	localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function formatDateTime(value) {
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

function getTicketSeatLabel(ticket) {
	if (!ticket) {
		return 'Seat not linked';
	}

	return `${ticket.sectionShort || ticket.section} • Row ${ticket.row} • Seat ${ticket.seatNumber}`;
}

function isReadyOrder(order) {
	return String(order.status || '').toLowerCase().includes('ready');
}

function isArchivedOrder(order) {
	const normalizedStatus = String(order.status || '').toLowerCase();
	return normalizedStatus === 'done' || normalizedStatus.includes('complete') || normalizedStatus.includes('collected');
}

function isCompletedOrder(order) {
	return isReadyOrder(order) || isArchivedOrder(order);
}

function getFoodOrders() {
	const rawFoodOrders = readStorage(STORAGE_KEYS.services, []).filter((order) => order.kind === 'food');
	const tickets = readStorage(STORAGE_KEYS.tickets, []);
	const ticketMap = new Map(tickets.map((ticket) => [ticket.ticketId, ticket]));
	const fallbackOrderNumbers = new Map(
		[...rawFoodOrders]
			.sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
			.map((order, index) => [order.id, index + 1])
	);

	return rawFoodOrders
		.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
		.map((order) => {
			const ready = isReadyOrder(order);
			const archived = isArchivedOrder(order);
			const state = archived ? 'archive' : ready ? 'ready' : 'waiting';
			return {
				...order,
				orderNumber: Number.parseInt(order.orderNumber, 10) || fallbackOrderNumbers.get(order.id) || 0,
				seatLabel: order.subtitle || getTicketSeatLabel(ticketMap.get(order.ticketId)),
				totalLabel: order.notes || 'Total: --',
				createdLabel: formatDateTime(order.createdAt),
				state
			};
		});
}

function buildEmptyState(message) {
	return `<div class="orders-empty">${escapeHtml(message)}</div>`;
}

function buildOrderCard(order) {
	const { state } = order;
	const isReady = state === 'ready';
	const isArchived = state === 'archive';

	let statusLabel = 'Preparing';
	let cardClass = 'order-card';
	let statusClass = 'order-status';

	if (isReady) {
		statusLabel = 'Ready';
		cardClass = 'order-card order-card-ready';
		statusClass = 'order-status order-status-ready';
	} else if (isArchived) {
		statusLabel = 'Collected';
		cardClass = 'order-card order-card-archive';
		statusClass = 'order-status order-status-archive';
	}

	let actionButton = '';
	if (state === 'waiting') {
		actionButton = `<button class="order-done-btn" type="button" data-order-id="${escapeHtml(order.id)}" data-action="done">Mark Ready</button>`;
	} else if (state === 'ready') {
		actionButton = `<button class="order-collect-btn" type="button" data-order-id="${escapeHtml(order.id)}" data-action="collect">Mark Collected</button>`;
	}

	return `
		<article class="${cardClass}">
			<div class="order-card-top">
				<span class="order-number">#${String(order.orderNumber).padStart(2, '0')}</span>
				<span class="${statusClass}">${statusLabel}</span>
			</div>
			<h3 class="order-title">${escapeHtml(order.details || 'Restaurant Order')}</h3>
			<div class="order-meta">
				<span>${escapeHtml(order.totalLabel)}</span>
				<span>${escapeHtml(order.seatLabel)}</span>
				<span>${escapeHtml(order.ticketId || 'No Ticket')}</span>
				<span>${escapeHtml(order.createdLabel)}</span>
			</div>
			${actionButton}
		</article>
	`;
}

function renderOrders() {
	const orders = getFoodOrders();
	const waitingOrders = orders.filter((order) => order.state === 'waiting');
	const readyOrders = orders.filter((order) => order.state === 'ready');
	const archiveOrders = orders.filter((order) => order.state === 'archive');
	const latestOrder = orders[0];

	elements.waitingCount.textContent = String(waitingOrders.length);
	elements.readyCount.textContent = String(readyOrders.length);
	elements.archiveCount.textContent = String(archiveOrders.length);
	elements.waitingBadge.textContent = String(waitingOrders.length);
	elements.readyBadge.textContent = String(readyOrders.length);
	elements.archiveBadge.textContent = String(archiveOrders.length);
	elements.lastSync.textContent = latestOrder ? latestOrder.createdLabel : 'Waiting';

	elements.waitingOrders.innerHTML = waitingOrders.length
		? waitingOrders.map((order) => buildOrderCard(order)).join('')
		: buildEmptyState('No waiting orders right now.');

	elements.readyOrders.innerHTML = readyOrders.length
		? readyOrders.map((order) => buildOrderCard(order)).join('')
		: buildEmptyState('No orders ready for pickup.');

	elements.archiveOrders.innerHTML = archiveOrders.length
		? archiveOrders.map((order) => buildOrderCard(order)).join('')
		: buildEmptyState('No archived orders yet.');
}

function markOrderDone(orderId) {
	const serviceRequests = readStorage(STORAGE_KEYS.services, []);
	const nextRequests = serviceRequests.map((order) => {
		if (order.id !== orderId) {
			return order;
		}

		return {
			...order,
			status: 'Ready for pickup',
			pickupMessage: 'You can collect your order from the restaurant now.',
			handledAt: new Date().toISOString(),
			lastTouchedAt: new Date().toISOString()
		};
	});

	writeStorage(STORAGE_KEYS.services, nextRequests);
	renderOrders();
}

function markOrderCollected(orderId) {
	const serviceRequests = readStorage(STORAGE_KEYS.services, []);
	const nextRequests = serviceRequests.map((order) => {
		if (order.id !== orderId) {
			return order;
		}

		return {
			...order,
			status: 'Done',
			collectedAt: new Date().toISOString(),
			lastTouchedAt: new Date().toISOString()
		};
	});

	writeStorage(STORAGE_KEYS.services, nextRequests);
	renderOrders();
}

document.addEventListener('DOMContentLoaded', () => {
	if (!hasControlAccess()) {
		window.location.href = '/';
		return;
	}

	renderOrders();

	const archiveToggleBtn = document.getElementById('archive-toggle-btn');
	const archivePanel = document.getElementById('archive-panel');

	archiveToggleBtn.addEventListener('click', () => {
		const isExpanded = archiveToggleBtn.getAttribute('aria-expanded') === 'true';
		archiveToggleBtn.setAttribute('aria-expanded', String(!isExpanded));
		archivePanel.classList.toggle('archive-panel-hidden', isExpanded);
	});

	document.addEventListener('click', (event) => {
		const actionButton = event.target.closest('[data-order-id]');

		if (!actionButton) {
			return;
		}

		const { orderId, action } = actionButton.dataset;

		if (action === 'done') {
			markOrderDone(orderId);
		} else if (action === 'collect') {
			markOrderCollected(orderId);
		}
	});

	window.addEventListener('storage', (event) => {
		if (![STORAGE_KEYS.services, STORAGE_KEYS.tickets].includes(event.key)) {
			return;
		}

		renderOrders();
	});
});
