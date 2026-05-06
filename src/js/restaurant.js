import { api } from './api.js';

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
	if (!rawValue) return false;
	try {
		return Boolean(JSON.parse(rawValue)?.grantedAt);
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

function formatDateTime(value) {
	if (!value) return 'Waiting';
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	}).format(new Date(value));
}

function getOrderState(order) {
    const status = String(order.status || '').toLowerCase();
    if (status === 'done' || status.includes('collected')) return 'archive';
    if (status.includes('ready')) return 'ready';
    return 'waiting';
}

function buildEmptyState(message) {
	return `<div class="orders-empty">${escapeHtml(message)}</div>`;
}

function buildOrderCard(order) {
	const state = getOrderState(order);
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

    const seatLabel = `Sec ${order.section || '--'} • Row ${order.row || '--'} • Seat ${order.seat || '--'}`;

	return `
		<article class="${cardClass}">
			<div class="order-card-top">
				<span class="order-number">#${String(order.id).padStart(2, '0')}</span>
				<span class="${statusClass}">${statusLabel}</span>
			</div>
			<h3 class="order-title">${escapeHtml(order.details || 'Restaurant Order')}</h3>
			<div class="order-meta">
				<span>${escapeHtml(order.notes || 'No notes')}</span>
				<span>${escapeHtml(seatLabel)}</span>
				<span>${escapeHtml(order.ownerName || 'Guest')}</span>
				<span>${escapeHtml(formatDateTime(order.createdAt))}</span>
			</div>
			${actionButton}
		</article>
	`;
}

async function renderOrders() {
    try {
        const allRequests = await api.get('/requests');
        const orders = allRequests.filter(r => r.kind === 'food');
        
        const waitingOrders = orders.filter(o => getOrderState(o) === 'waiting');
        const readyOrders = orders.filter(o => getOrderState(o) === 'ready');
        const archiveOrders = orders.filter(o => getOrderState(o) === 'archive');
        
        const latestOrder = orders[0];

        elements.waitingCount.textContent = String(waitingOrders.length);
        elements.readyCount.textContent = String(readyOrders.length);
        elements.archiveCount.textContent = String(archiveOrders.length);
        elements.waitingBadge.textContent = String(waitingOrders.length);
        elements.readyBadge.textContent = String(readyOrders.length);
        elements.archiveBadge.textContent = String(archiveOrders.length);
        elements.lastSync.textContent = latestOrder ? formatDateTime(latestOrder.createdAt) : 'Waiting';

        elements.waitingOrders.innerHTML = waitingOrders.length
            ? waitingOrders.map(o => buildOrderCard(o)).join('')
            : buildEmptyState('No waiting orders right now.');

        elements.readyOrders.innerHTML = readyOrders.length
            ? readyOrders.map(o => buildOrderCard(o)).join('')
            : buildEmptyState('No orders ready for pickup.');

        elements.archiveOrders.innerHTML = archiveOrders.length
            ? archiveOrders.map(o => buildOrderCard(o)).join('')
            : buildEmptyState('No archived orders yet.');
    } catch (err) {
        console.error('Failed to render orders:', err);
    }
}

async function markOrderDone(orderId) {
    try {
        await api.put(`/requests/${orderId}`, {
            status: 'Ready for pickup',
            handledAt: new Date().toISOString()
        });
        await renderOrders();
    } catch (err) {
        console.error('Failed to mark order ready:', err);
    }
}

async function markOrderCollected(orderId) {
    try {
        await api.put(`/requests/${orderId}`, {
            status: 'Collected',
            archivedAt: new Date().toISOString()
        });
        await renderOrders();
    } catch (err) {
        console.error('Failed to mark order collected:', err);
    }
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
		if (!actionButton) return;

		const { orderId, action } = actionButton.dataset;
		if (action === 'done') {
			markOrderDone(orderId);
		} else if (action === 'collect') {
			markOrderCollected(orderId);
		}
	});

    api.connectSSE();
    api.on('new-request', (data) => {
        if (data.kind === 'food') renderOrders();
    });
    api.on('update-request', (data) => {
        if (data.kind === 'food') renderOrders();
    });
});
