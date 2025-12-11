// Operator Dashboard JavaScript

// Global Variables
let currentOperator = null;
let currentOrders = [];
let currentMessages = [];
let currentInventory = [];
let currentPage = 1;
let itemsPerPage = 25;

// Initialize Operator Dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeOperatorDashboard();
});

function initializeOperatorDashboard() {
    // Check authentication
    checkOperatorAuth();
    
    // Load operator data
    loadOperatorData();
    
    // Set up event listeners
    setupOperatorEventListeners();
    
    // Initialize date display
    updateDateTime();
    
    // Load dashboard data
    loadDashboardData();
    
    // Start auto-refresh
    startAutoRefresh();
}

// Authentication
function checkOperatorAuth() {
    const operatorData = localStorage.getItem('currentUser');
    if (!operatorData) {
        window.location.href = '../index.html';
        return;
    }
    
    const user = JSON.parse(operatorData);
    if (user.role !== 'operator') {
        window.location.href = '../index.html';
        return;
    }
    
    currentOperator = user;
}

// Load Operator Data
function loadOperatorData() {
    if (currentOperator) {
        document.getElementById('operatorName').textContent = currentOperator.name;
        document.getElementById('operatorEmail').textContent = currentOperator.email;
        document.getElementById('operatorGreeting').textContent = currentOperator.name.split(' ')[0];
        document.getElementById('opFullName').value = currentOperator.name;
        document.getElementById('opEmail').value = currentOperator.email;
        document.getElementById('opPhone').value = currentOperator.phone || '';
        
        // Update avatar with initials
        const initials = currentOperator.name.split(' ').map(n => n[0]).join('').toUpperCase();
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=2196F3&color=fff`;
        document.getElementById('operatorAvatar').src = avatarUrl;
        document.getElementById('currentProfilePic').src = avatarUrl;
        
        // Load assignments
        loadAssignments();
    }
}

function loadAssignments() {
    if (!currentOperator || !currentOperator.assignments) return;
    
    const assignmentsList = document.getElementById('assignmentsList');
    assignmentsList.innerHTML = '';
    
    currentOperator.assignments.forEach(assignment => {
        const item = document.createElement('div');
        item.className = 'assignment-item';
        item.innerHTML = `
            <h5>${assignment}</h5>
            <div class="assignment-stats">
                <span>Orders: 0</span>
                <span>Pending: 0</span>
            </div>
        `;
        assignmentsList.appendChild(item);
    });
}

// Event Listeners
function setupOperatorEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            navigateToSection(target);
        });
    });
    
    // Menu toggle
    document.getElementById('menuToggle').addEventListener('click', function() {
        document.querySelector('.operator-sidebar').classList.toggle('active');
    });
    
    // Dark mode
    document.getElementById('opDarkMode').addEventListener('click', toggleDarkMode);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logoutOperator);
    
    // Refresh
    document.getElementById('refreshBtn').addEventListener('click', refreshDashboard);
    
    // Notifications
    document.getElementById('notifyBtn').addEventListener('click', showNotifications);
    
    // Dashboard actions
    document.getElementById('startProcessing').addEventListener('click', startProcessing);
    document.getElementById('viewAllOrders').addEventListener('click', () => navigateToSection('orders'));
    
    // Orders
    document.getElementById('orderFilter').addEventListener('change', filterOrders);
    document.getElementById('orderSort').addEventListener('change', sortOrders);
    document.getElementById('bulkUpdateBtn').addEventListener('click', bulkUpdateOrders);
    document.getElementById('selectAllOrders').addEventListener('change', toggleSelectAllOrders);
    
    // Offline orders
    document.getElementById('offlineOrderForm').addEventListener('submit', saveOfflineOrder);
    document.getElementById('orderType').addEventListener('change', updateOrderForm);
    document.getElementById('quantity').addEventListener('input', calculateTotal);
    document.getElementById('pricePerKg').addEventListener('input', calculateTotal);
    document.getElementById('millingFee').addEventListener('input', calculateTotal);
    
    // Messages
    document.getElementById('newMessageBtn').addEventListener('click', showNewMessageModal);
    document.getElementById('markAllRead').addEventListener('click', markAllMessagesRead);
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('input', toggleSendButton);
    document.getElementById('recipientType').addEventListener('change', updateRecipientSelect);
    document.getElementById('newMessageForm').addEventListener('submit', sendNewMessage);
    
    // History
    document.getElementById('filterHistory').addEventListener('click', filterHistory);
    document.getElementById('exportHistory').addEventListener('click', exportHistory);
    document.getElementById('prevPage').addEventListener('click', previousPage);
    document.getElementById('nextPage').addEventListener('click', nextPage);
    
    // Settings
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
    
    document.getElementById('saveSettings').addEventListener('click', saveAllSettings);
    document.getElementById('changePasswordForm').addEventListener('submit', changePassword);
    document.getElementById('enable2FA').addEventListener('click', enableTwoFactor);
    document.getElementById('fontSize').addEventListener('input', updateFontSize);
    
    // Help
    document.getElementById('refreshInventory').addEventListener('click', refreshInventory);
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Window close modal
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Navigation
function navigateToSection(sectionId) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`a[href="#${sectionId}"]`).classList.add('active');
    
    // Update active section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    
    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    const titles = {
        'dashboard': 'Operator Dashboard',
        'orders': 'My Orders',
        'offline': 'Offline Orders',
        'messages': 'Messages',
        'history': 'Order History',
        'settings': 'Settings'
    };
    pageTitle.textContent = titles[sectionId] || 'Operator Dashboard';
    
    // Load section data
    loadSectionData(sectionId);
}

// Load Section Data
function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'orders':
            loadOrdersData();
            break;
        case 'offline':
            loadOfflineData();
            break;
        case 'messages':
            loadMessagesData();
            break;
        case 'history':
            loadHistoryData();
            break;
        case 'settings':
            loadSettingsData();
            break;
    }
}

// Dashboard Functions
function loadDashboardData() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    
    // Update stats
    updateDashboardStats(usersData);
    
    // Load assigned inventory
    loadAssignedInventory(usersData);
    
    // Load recent orders
    loadRecentOrders(usersData);
    
    // Update notification badges
    updateNotificationBadges(usersData);
}

function updateDashboardStats(data) {
    const orders = data.orders || [];
    const today = new Date().toISOString().split('T')[0];
    
    // Get operator's assigned orders
    const assignedOrders = orders.filter(order => 
        order.assignedTo === currentOperator.id || 
        (order.assignedTo && order.assignedTo.includes(currentOperator.id))
    );
    
    // Today's stats
    const todayOrders = assignedOrders.filter(o => 
        o.orderDate && o.orderDate.startsWith(today)
    );
    const pendingOrders = assignedOrders.filter(o => 
        o.status === 'pending' || o.status === 'processing'
    );
    const completedToday = todayOrders.filter(o => o.status === 'completed').length;
    const processingNow = assignedOrders.filter(o => o.status === 'processing').length;
    
    // Calculate earnings
    const todayEarnings = todayOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Update DOM
    document.getElementById('todayOrders').textContent = todayOrders.length;
    document.getElementById('pendingOrders').textContent = pendingOrders.length;
    document.getElementById('totalAssigned').textContent = assignedOrders.length;
    document.getElementById('completedToday').textContent = completedToday;
    document.getElementById('processingNow').textContent = processingNow;
    document.getElementById('todayEarnings').textContent = formatCurrency(todayEarnings);
    document.getElementById('pendingCount').textContent = pendingOrders.length;
}

function loadAssignedInventory(data) {
    const warehouse = data.warehouse || {};
    const assignments = currentOperator.assignments || [];
    const inventoryList = document.getElementById('assignedInventory');
    
    inventoryList.innerHTML = '';
    
    let lowInventoryCount = 0;
    
    // Get inventory items for assigned categories
    Object.entries(warehouse).forEach(([itemName, item]) => {
        if (assignments.some(assignment => 
            item.category && item.category.toLowerCase().includes(assignment.toLowerCase()) ||
            itemName.toLowerCase().includes(assignment.toLowerCase())
        )) {
            const quantity = item.quantity || 0;
            const alertLevel = item.alertLevel || 0;
            const percentage = Math.min((quantity / alertLevel) * 100, 100);
            
            let statusClass = 'high';
            if (quantity < alertLevel * 0.3) statusClass = 'low';
            else if (quantity < alertLevel * 0.6) statusClass = 'medium';
            
            if (statusClass === 'low') lowInventoryCount++;
            
            const itemDiv = document.createElement('div');
            itemDiv.className = `inventory-item ${statusClass}`;
            itemDiv.innerHTML = `
                <div class="inventory-name">
                    <strong>${itemName}</strong>
                    <br>
                    <small>${item.category || 'Uncategorized'}</small>
                </div>
                <div class="inventory-stats">
                    <span class="inventory-quantity">${formatNumber(quantity)} kg</span>
                    <div class="inventory-progress">
                        <div class="progress-bar ${statusClass}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
            inventoryList.appendChild(itemDiv);
        }
    });
    
    // Show inventory alert if needed
    const inventoryAlert = document.getElementById('inventoryAlert');
    if (lowInventoryCount > 0) {
        inventoryAlert.style.display = 'block';
        inventoryAlert.querySelector('p').textContent = `${lowInventoryCount} items are low in stock!`;
    } else {
        inventoryAlert.style.display = 'none';
    }
}

function loadRecentOrders(data) {
    const orders = data.orders || [];
    const customers = data.customers || [];
    const products = data.products || [];
    
    // Get operator's recent orders
    const recentOrders = orders
        .filter(order => order.assignedTo === currentOperator.id || 
                        (order.assignedTo && order.assignedTo.includes(currentOperator.id)))
        .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
        .slice(0, 5);
    
    const ordersList = document.getElementById('recentOrdersList');
    ordersList.innerHTML = '';
    
    if (recentOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>No recent orders</p>
            </div>
        `;
        return;
    }
    
    recentOrders.forEach(order => {
        const customer = customers.find(c => c.id === order.customerId);
        const product = products.find(p => p.id === order.productId);
        
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-item';
        orderDiv.innerHTML = `
            <div class="order-info">
                <h4>${product ? product.name : order.productName || 'Product'}</h4>
                <div class="order-details">
                    <span><i class="fas fa-user"></i> ${customer ? customer.name : 'Customer'}</span>
                    <span><i class="fas fa-balance-scale"></i> ${order.quantity || 0} kg</span>
                    <span><i class="fas fa-money-bill"></i> ${formatCurrency(order.total || 0)}</span>
                </div>
            </div>
            <div class="order-status status-${order.status || 'pending'}">
                ${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending'}
            </div>
        `;
        ordersList.appendChild(orderDiv);
    });
}

// Orders Functions
function loadOrdersData() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    currentOrders = usersData.orders || [];
    
    updateOrdersTable();
}

function updateOrdersTable() {
    const tableBody = document.getElementById('ordersTableBody');
    const noOrdersMessage = document.getElementById('noOrdersMessage');
    
    // Filter orders assigned to this operator
    const assignedOrders = currentOrders.filter(order => 
        order.assignedTo === currentOperator.id || 
        (order.assignedTo && order.assignedTo.includes(currentOperator.id))
    );
    
    // Apply filters
    const filter = document.getElementById('orderFilter').value;
    let filteredOrders = assignedOrders;
    
    if (filter !== 'all') {
        filteredOrders = assignedOrders.filter(order => order.status === filter);
    }
    
    // Apply sorting
    const sort = document.getElementById('orderSort').value;
    filteredOrders.sort((a, b) => {
        switch(sort) {
            case 'newest':
                return new Date(b.orderDate) - new Date(a.orderDate);
            case 'oldest':
                return new Date(a.orderDate) - new Date(b.orderDate);
            case 'priority':
                return (b.priority || 0) - (a.priority || 0);
            default:
                return 0;
        }
    });
    
    tableBody.innerHTML = '';
    
    if (filteredOrders.length === 0) {
        noOrdersMessage.style.display = 'block';
        tableBody.style.display = 'none';
        return;
    }
    
    noOrdersMessage.style.display = 'none';
    tableBody.style.display = 'table-row-group';
    
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const customers = usersData.customers || [];
    const products = usersData.products || [];
    
    filteredOrders.forEach(order => {
        const customer = customers.find(c => c.id === order.customerId);
        const product = products.find(p => p.id === order.productId);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="order-checkbox" data-id="${order.id}">
            </td>
            <td>#${order.id.toString().slice(-6)}</td>
            <td>${customer ? customer.name : 'Walk-in Customer'}</td>
            <td>${product ? product.name : order.productName || 'N/A'}</td>
            <td>${order.quantity || 0} kg</td>
            <td>${order.orderType || 'Purchase'}</td>
            <td>
                <select class="status-select" data-id="${order.id}" onchange="updateOrderStatus(${order.id}, this.value)">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>${formatDate(order.orderDate)}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="viewOrderDetails(${order.id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline" onclick="notifyCustomer(${order.id})" title="Notify">
                    <i class="fas fa-bell"></i>
                </button>
                <button class="btn btn-sm btn-outline" onclick="messageCustomer(${order.customerId})" title="Message">
                    <i class="fas fa-comment"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Update badge
    const pendingCount = assignedOrders.filter(o => o.status === 'pending').length;
    document.getElementById('ordersBadge').textContent = pendingCount;
}

function filterOrders() {
    updateOrdersTable();
}

function sortOrders() {
    updateOrdersTable();
}

function toggleSelectAllOrders() {
    const selectAll = document.getElementById('selectAllOrders');
    const checkboxes = document.querySelectorAll('.order-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
}

function bulkUpdateOrders() {
    const selectedOrders = Array.from(document.querySelectorAll('.order-checkbox:checked'))
        .map(cb => cb.dataset.id);
    
    if (selectedOrders.length === 0) {
        showToast('Please select orders to update', 'warning');
        return;
    }
    
    const newStatus = prompt('Enter new status (pending, processing, completed, cancelled):');
    if (!newStatus || !['pending', 'processing', 'completed', 'cancelled'].includes(newStatus)) {
        showToast('Invalid status', 'error');
        return;
    }
    
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    selectedOrders.forEach(orderId => {
        const orderIndex = usersData.orders.findIndex(o => o.id == orderId);
        if (orderIndex !== -1) {
            usersData.orders[orderIndex].status = newStatus;
            usersData.orders[orderIndex].updatedAt = new Date().toISOString();
        }
    });
    
    localStorage.setItem('millUsers', JSON.stringify(usersData));
    loadOrdersData();
    showToast(`${selectedOrders.length} orders updated to ${newStatus}`, 'success');
}

function updateOrderStatus(orderId, newStatus) {
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    const orderIndex = usersData.orders.findIndex(o => o.id == orderId);
    
    if (orderIndex !== -1) {
        usersData.orders[orderIndex].status = newStatus;
        usersData.orders[orderIndex].updatedAt = new Date().toISOString();
        
        // Update inventory if completed
        if (newStatus === 'completed') {
            updateInventoryAfterCompletion(usersData.orders[orderIndex]);
        }
        
        localStorage.setItem('millUsers', JSON.stringify(usersData));
        showToast('Order status updated', 'success');
        
        // Refresh data
        loadDashboardData();
    }
}

function updateInventoryAfterCompletion(order) {
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    
    // Find the product in warehouse
    const productName = order.productName;
    if (productName && usersData.warehouse && usersData.warehouse[productName]) {
        const quantity = order.quantity || 0;
        usersData.warehouse[productName].quantity = 
            Math.max(0, (usersData.warehouse[productName].quantity || 0) - quantity);
        usersData.warehouse[productName].lastUpdated = new Date().toISOString();
        
        localStorage.setItem('millUsers', JSON.stringify(usersData));
        showToast('Inventory updated', 'success');
    }
}

// Offline Orders Functions
function loadOfflineData() {
    // Load products for dropdown
    loadProductsForDropdown();
    loadRecentOfflineOrders();
}

function loadProductsForDropdown() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const products = usersData.products || [];
    const select = document.getElementById('productSelect');
    
    select.innerHTML = '<option value="">Select Product</option>';
    
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} - ${formatCurrency(product.price)}/kg`;
        option.dataset.price = product.price;
        option.dataset.millingFee = product.millingFee;
        select.appendChild(option);
    });
}

function updateOrderForm() {
    const orderType = document.getElementById('orderType').value;
    const millingFeeInput = document.getElementById('millingFee');
    
    if (orderType === 'milling') {
        millingFeeInput.required = true;
        millingFeeInput.disabled = false;
        document.getElementById('pricePerKg').value = '0';
        document.getElementById('pricePerKg').disabled = true;
    } else {
        millingFeeInput.required = false;
        millingFeeInput.disabled = orderType === 'purchase';
        document.getElementById('pricePerKg').disabled = false;
    }
    
    calculateTotal();
}

function calculateTotal() {
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const pricePerKg = parseFloat(document.getElementById('pricePerKg').value) || 0;
    const millingFee = parseFloat(document.getElementById('millingFee').value) || 0;
    const orderType = document.getElementById('orderType').value;
    
    let total = 0;
    
    if (orderType === 'purchase') {
        total = quantity * pricePerKg;
    } else if (orderType === 'milling') {
        total = quantity * millingFee;
    } else if (orderType === 'both') {
        total = quantity * (pricePerKg + millingFee);
    }
    
    // Add order fee
    total += 20; // Fixed order fee
    
    document.getElementById('totalAmount').value = total.toFixed(2);
}

function saveOfflineOrder(e) {
    e.preventDefault();
    
    const orderData = {
        id: Date.now(),
        customerName: document.getElementById('customerName').value,
        customerPhone: document.getElementById('customerPhone').value,
        orderType: document.getElementById('orderType').value,
        productId: document.getElementById('productSelect').value,
        productName: document.getElementById('productSelect').selectedOptions[0]?.text.split(' - ')[0] || '',
        quantity: parseFloat(document.getElementById('quantity').value),
        pricePerKg: parseFloat(document.getElementById('pricePerKg').value) || 0,
        millingFee: parseFloat(document.getElementById('millingFee').value) || 0,
        total: parseFloat(document.getElementById('totalAmount').value),
        paymentMethod: document.getElementById('paymentMethod').value,
        paymentReference: document.getElementById('paymentReference').value,
        notes: document.getElementById('orderNotes').value,
        status: 'completed',
        orderDate: new Date().toISOString(),
        type: 'offline',
        processedBy: currentOperator.id,
        assignedTo: currentOperator.id
    };
    
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    if (!usersData.orders) usersData.orders = [];
    
    usersData.orders.push(orderData);
    
    // Update inventory for purchase orders
    if (orderData.orderType !== 'milling') {
        updateWarehouseInventory(orderData.productName, orderData.quantity);
    }
    
    localStorage.setItem('millUsers', JSON.stringify(usersData));
    
    // Reset form
    document.getElementById('offlineOrderForm').reset();
    
    // Reload data
    loadRecentOfflineOrders();
    loadDashboardData();
    
    showToast('Offline order saved successfully!', 'success');
}

function updateWarehouseInventory(productName, quantity) {
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    
    if (usersData.warehouse && usersData.warehouse[productName]) {
        usersData.warehouse[productName].quantity = 
            Math.max(0, (usersData.warehouse[productName].quantity || 0) - quantity);
        usersData.warehouse[productName].lastUpdated = new Date().toISOString();
        
        localStorage.setItem('millUsers', JSON.stringify(usersData));
    }
}

function loadRecentOfflineOrders() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const orders = usersData.orders || [];
    
    const offlineOrders = orders
        .filter(order => order.type === 'offline' && order.processedBy === currentOperator.id)
        .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
        .slice(0, 10);
    
    const tableBody = document.getElementById('offlineOrdersTable');
    tableBody.innerHTML = '';
    
    offlineOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order.id.toString().slice(-6)}</td>
            <td>${order.customerName}</td>
            <td>${order.productName}</td>
            <td>${order.quantity} kg</td>
            <td>${formatCurrency(order.total)}</td>
            <td>${order.paymentMethod}</td>
            <td>${formatDate(order.orderDate)}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="viewOfflineOrder(${order.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Messages Functions
function loadMessagesData() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    currentMessages = usersData.messages || [];
    
    loadContacts();
    updateMessagesBadge();
}

function loadContacts() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const customers = usersData.customers || [];
    const admin = usersData.admin?.[0];
    const contactsList = document.getElementById('contactsList');
    
    contactsList.innerHTML = '';
    
    // Add admin contact
    if (admin) {
        const adminContact = createContactItem(admin, 'admin');
        contactsList.appendChild(adminContact);
    }
    
    // Add customer contacts (only assigned ones)
    const assignments = currentOperator.assignments || [];
    customers.forEach(customer => {
        // Check if customer has orders assigned to this operator
        const hasAssignedOrders = (usersData.orders || []).some(order => 
            order.customerId === customer.id && 
            (order.assignedTo === currentOperator.id || 
             (order.assignedTo && order.assignedTo.includes(currentOperator.id)))
        );
        
        if (hasAssignedOrders) {
            const customerContact = createContactItem(customer, 'customer');
            contactsList.appendChild(customerContact);
        }
    });
}

function createContactItem(user, type) {
    const messages = currentMessages.filter(msg => 
        (msg.senderId === user.id && msg.receiverId === currentOperator.id) ||
        (msg.receiverId === user.id && msg.senderId === currentOperator.id)
    );
    
    const unreadCount = messages.filter(msg => 
        msg.receiverId === currentOperator.id && !msg.read
    ).length;
    
    const lastMessage = messages[messages.length - 1];
    
    const contactDiv = document.createElement('div');
    contactDiv.className = 'contact-item';
    contactDiv.dataset.userId = user.id;
    contactDiv.dataset.userType = type;
    contactDiv.onclick = () => openChat(user, type);
    
    contactDiv.innerHTML = `
        <div class="contact-avatar">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=${type === 'admin' ? '4CAF50' : '2196F3'}&color=fff" alt="${user.name}">
        </div>
        <div class="contact-info">
            <h4>${user.name}</h4>
            <p>${lastMessage ? (lastMessage.content?.substring(0, 30) + '...' || '') : type === 'admin' ? 'System Admin' : 'Customer'}</p>
        </div>
        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
    `;
    
    return contactDiv;
}

function openChat(user, type) {
    // Update chat header
    const chatHeader = document.getElementById('chatHeader');
    chatHeader.innerHTML = `
        <div class="chat-user">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=${type === 'admin' ? '4CAF50' : '2196F3'}&color=fff" alt="${user.name}">
            <div class="chat-user-info">
                <h4>${user.name}</h4>
                <p>${type === 'admin' ? 'System Admin' : 'Customer'}</p>
            </div>
        </div>
    `;
    
    // Load messages
    loadChatMessages(user.id);
    
    // Update chat info panel
    const chatInfoPanel = document.getElementById('chatInfoPanel');
    chatInfoPanel.innerHTML = `
        <h4>Contact Information</h4>
        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>${type === 'admin' ? 'Email' : 'Phone'}:</strong> ${type === 'admin' ? user.email : user.phone}</p>
        ${user.address ? `<p><strong>Address:</strong> ${user.address}</p>` : ''}
        ${type !== 'admin' ? `<button class="btn btn-sm btn-outline btn-block" onclick="viewCustomerOrders(${user.id})">View Orders</button>` : ''}
    `;
    
    // Mark messages as read
    markMessagesAsRead(user.id);
}

function loadChatMessages(userId) {
    const chatMessages = document.getElementById('chatMessages');
    const messages = currentMessages.filter(msg => 
        (msg.senderId === userId && msg.receiverId === currentOperator.id) ||
        (msg.senderId === currentOperator.id && msg.receiverId === userId)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    chatMessages.innerHTML = '';
    
    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.senderId === currentOperator.id ? 'sent' : 'received'}`;
        messageDiv.innerHTML = `
            <div class="message-content">${msg.content || ''}</div>
            <div class="message-time">${formatTime(msg.timestamp)}</div>
        `;
        chatMessages.appendChild(messageDiv);
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function markMessagesAsRead(userId) {
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    let updated = false;
    
    usersData.messages = usersData.messages.map(msg => {
        if (msg.receiverId === currentOperator.id && msg.senderId === userId && !msg.read) {
            updated = true;
            return { ...msg, read: true, readAt: new Date().toISOString() };
        }
        return msg;
    });
    
    if (updated) {
        localStorage.setItem('millUsers', JSON.stringify(usersData));
        updateMessagesBadge();
    }
}

function toggleSendButton() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendMessageBtn');
    sendButton.disabled = !messageInput.value.trim();
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    // Get current chat user
    const chatHeader = document.getElementById('chatHeader');
    const currentChatUserId = chatHeader.querySelector('.chat-user')?.dataset?.userId;
    
    if (!currentChatUserId) {
        showToast('Please select a contact to message', 'warning');
        return;
    }
    
    const newMessage = {
        id: Date.now(),
        senderId: currentOperator.id,
        receiverId: currentChatUserId,
        content: content,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'text'
    };
    
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    usersData.messages.push(newMessage);
    localStorage.setItem('millUsers', JSON.stringify(usersData));
    
    // Clear input
    messageInput.value = '';
    toggleSendButton();
    
    // Reload messages
    loadMessagesData();
    loadChatMessages(currentChatUserId);
    
    showToast('Message sent', 'success');
}

function showNewMessageModal() {
    document.getElementById('newMessageModal').style.display = 'flex';
}

function closeNewMessageModal() {
    document.getElementById('newMessageModal').style.display = 'none';
    document.getElementById('newMessageForm').reset();
}

function updateRecipientSelect() {
    const recipientType = document.getElementById('recipientType').value;
    const container = document.getElementById('recipientSelectContainer');
    const select = document.getElementById('recipientSelect');
    
    if (recipientType === 'all') {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    select.innerHTML = '<option value="">Select Recipient</option>';
    
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    
    if (recipientType === 'admin') {
        const admin = usersData.admin?.[0];
        if (admin) {
            const option = document.createElement('option');
            option.value = admin.id;
            option.textContent = admin.name;
            select.appendChild(option);
        }
    } else if (recipientType === 'customer') {
        const customers = usersData.customers || [];
        const assignments = currentOperator.assignments || [];
        
        customers.forEach(customer => {
            // Check if customer has orders assigned to this operator
            const hasAssignedOrders = (usersData.orders || []).some(order => 
                order.customerId === customer.id && 
                (order.assignedTo === currentOperator.id || 
                 (order.assignedTo && order.assignedTo.includes(currentOperator.id)))
            );
            
            if (hasAssignedOrders) {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = customer.name;
                select.appendChild(option);
            }
        });
    }
}

function sendNewMessage(e) {
    e.preventDefault();
    
    const recipientType = document.getElementById('recipientType').value;
    const subject = document.getElementById('messageSubject').value;
    const content = document.getElementById('newMessageContent').value;
    
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    
    let recipients = [];
    
    if (recipientType === 'all') {
        // Send to all assigned customers
        const customers = usersData.customers || [];
        const assignments = currentOperator.assignments || [];
        
        recipients = customers.filter(customer => {
            const hasAssignedOrders = (usersData.orders || []).some(order => 
                order.customerId === customer.id && 
                (order.assignedTo === currentOperator.id || 
                 (order.assignedTo && order.assignedTo.includes(currentOperator.id)))
            );
            return hasAssignedOrders;
        }).map(c => c.id);
    } else {
        const recipientId = document.getElementById('recipientSelect').value;
        if (!recipientId) {
            showToast('Please select a recipient', 'warning');
            return;
        }
        recipients = [recipientId];
    }
    
    // Save messages
    recipients.forEach(recipientId => {
        const newMessage = {
            id: Date.now(),
            senderId: currentOperator.id,
            receiverId: recipientId,
            subject: subject,
            content: content,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'broadcast'
        };
        
        usersData.messages.push(newMessage);
    });
    
    localStorage.setItem('millUsers', JSON.stringify(usersData));
    
    closeNewMessageModal();
    showToast(`Message sent to ${recipients.length} recipient(s)`, 'success');
}

function markAllMessagesRead() {
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    
    usersData.messages = usersData.messages.map(msg => {
        if (msg.receiverId === currentOperator.id && !msg.read) {
            return { ...msg, read: true, readAt: new Date().toISOString() };
        }
        return msg;
    });
    
    localStorage.setItem('millUsers', JSON.stringify(usersData));
    
    updateMessagesBadge();
    loadMessagesData();
    showToast('All messages marked as read', 'success');
}

function updateMessagesBadge() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const messages = usersData.messages || [];
    
    const unreadCount = messages.filter(msg => 
        msg.receiverId === currentOperator.id && !msg.read
    ).length;
    
    document.getElementById('messagesBadge').textContent = unreadCount;
}

// History Functions
function loadHistoryData() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const orders = usersData.orders || [];
    
    // Get completed orders processed by this operator
    const completedOrders = orders.filter(order => 
        (order.assignedTo === currentOperator.id || 
         (order.assignedTo && order.assignedTo.includes(currentOperator.id))) &&
        order.status === 'completed'
    );
    
    updateHistoryStats(completedOrders);
    updateHistoryTable(completedOrders);
}

function updateHistoryStats(orders) {
    const totalProcessed = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Calculate average processing time (placeholder)
    const avgProcessingTime = '2.5h';
    
    document.getElementById('totalProcessed').textContent = totalProcessed;
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('avgProcessingTime').textContent = avgProcessingTime;
}

function updateHistoryTable(orders) {
    const tableBody = document.getElementById('historyTableBody');
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const customers = usersData.customers || [];
    const products = usersData.products || [];
    
    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = orders.slice(startIndex, endIndex);
    
    tableBody.innerHTML = '';
    
    if (paginatedOrders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-history"></i>
                        <p>No history found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    paginatedOrders.forEach(order => {
        const customer = customers.find(c => c.id === order.customerId);
        const product = products.find(p => p.id === order.productId);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order.id.toString().slice(-6)}</td>
            <td>${customer ? customer.name : 'Walk-in Customer'}</td>
            <td>${product ? product.name : order.productName || 'N/A'}</td>
            <td>${order.quantity || 0} kg</td>
            <td>${formatCurrency(order.total || 0)}</td>
            <td><span class="status-badge status-completed">Completed</span></td>
            <td>${formatDate(order.orderDate)}</td>
            <td>${formatDate(order.completedDate || order.updatedAt)}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="viewOrderHistory(${order.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Update pagination
    updatePagination(orders.length);
}

function filterHistory() {
    const startDate = document.getElementById('historyStartDate').value;
    const endDate = document.getElementById('historyEndDate').value;
    
    // This is a placeholder - in a real app, you would filter orders by date
    showToast('Filter applied', 'success');
    loadHistoryData();
}

function exportHistory() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const orders = usersData.orders || [];
    
    const completedOrders = orders.filter(order => 
        (order.assignedTo === currentOperator.id || 
         (order.assignedTo && order.assignedTo.includes(currentOperator.id))) &&
        order.status === 'completed'
    );
    
    // Convert to CSV
    let csv = 'Order ID,Customer,Product,Quantity,Total,Order Date,Completed Date\n';
    
    completedOrders.forEach(order => {
        csv += `"#${order.id.toString().slice(-6)}","${order.customerName || 'Customer'}","${order.productName || 'Product'}",${order.quantity || 0},${order.total || 0},"${formatDate(order.orderDate)}","${formatDate(order.completedDate || order.updatedAt)}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast('History exported successfully!', 'success');
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        loadHistoryData();
    }
}

function nextPage() {
    const totalItems = document.getElementById('totalPages').textContent;
    if (currentPage < parseInt(totalItems)) {
        currentPage++;
        loadHistoryData();
    }
}

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Settings Functions
function loadSettingsData() {
    // Load saved preferences
    const preferences = JSON.parse(localStorage.getItem('operatorPreferences') || '{}');
    
    // Set form values from preferences
    if (preferences.language) {
        document.getElementById('opLanguage').value = preferences.language;
    }
    if (preferences.fontSize) {
        document.getElementById('fontSize').value = preferences.fontSize;
        updateFontSize();
    }
    if (preferences.itemsPerPage) {
        document.getElementById('itemsPerPage').value = preferences.itemsPerPage;
    }
    if (preferences.defaultView) {
        document.getElementById('defaultView').value = preferences.defaultView;
    }
    if (preferences.notifications) {
        Object.keys(preferences.notifications).forEach(key => {
            const checkbox = document.getElementById(key);
            if (checkbox) {
                checkbox.checked = preferences.notifications[key];
            }
        });
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
    });
}

function saveAllSettings() {
    const preferences = {
        language: document.getElementById('opLanguage').value,
        fontSize: document.getElementById('fontSize').value,
        itemsPerPage: document.getElementById('itemsPerPage').value,
        defaultView: document.getElementById('defaultView').value,
        autoRefresh: document.getElementById('autoRefresh').checked,
        showNotifications: document.getElementById('showNotifications').checked,
        notifications: {
            newOrderNotify: document.getElementById('newOrderNotify').checked,
            orderUpdateNotify: document.getElementById('orderUpdateNotify').checked,
            orderCompleteNotify: document.getElementById('orderCompleteNotify').checked,
            newMessageNotify: document.getElementById('newMessageNotify').checked,
            adminMessageNotify: document.getElementById('adminMessageNotify').checked,
            lowStockNotify: document.getElementById('lowStockNotify').checked,
            systemUpdateNotify: document.getElementById('systemUpdateNotify').checked
        }
    };
    
    localStorage.setItem('operatorPreferences', JSON.stringify(preferences));
    
    // Update operator profile
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    const operatorIndex = usersData.operators?.findIndex(o => o.id === currentOperator.id);
    
    if (operatorIndex !== -1 && usersData.operators) {
        usersData.operators[operatorIndex] = {
            ...usersData.operators[operatorIndex],
            name: document.getElementById('opFullName').value,
            email: document.getElementById('opEmail').value,
            phone: document.getElementById('opPhone').value,
            address: document.getElementById('opAddress').value
        };
        
        localStorage.setItem('millUsers', JSON.stringify(usersData));
        loadOperatorData(); // Refresh operator data
    }
    
    showToast('Settings saved successfully!', 'success');
}

function changePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }
    
    if (currentPassword !== currentOperator.password) {
        showToast('Current password is incorrect', 'error');
        return;
    }
    
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    const operatorIndex = usersData.operators?.findIndex(o => o.id === currentOperator.id);
    
    if (operatorIndex !== -1 && usersData.operators) {
        usersData.operators[operatorIndex].password = newPassword;
        localStorage.setItem('millUsers', JSON.stringify(usersData));
        
        // Update current operator
        currentOperator.password = newPassword;
        localStorage.setItem('currentUser', JSON.stringify(currentOperator));
        
        showToast('Password changed successfully!', 'success');
        document.getElementById('changePasswordForm').reset();
    }
}

function enableTwoFactor() {
    showToast('Two-factor authentication setup will be implemented soon!', 'info');
}

function updateFontSize() {
    const fontSize = document.getElementById('fontSize').value;
    document.getElementById('fontSizeValue').textContent = `${fontSize}px`;
    document.documentElement.style.fontSize = `${fontSize}px`;
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-ET', {
        style: 'currency',
        currency: 'ETB',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatNumber(number) {
    return new Intl.NumberFormat().format(number);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateDateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    document.getElementById('currentDate').textContent = `${dateStr} ${timeStr}`;
}

function toggleDarkMode() {
    const body = document.body;
    const icon = document.querySelector('#opDarkMode i');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    } else {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
}

function logoutOperator() {
    localStorage.removeItem('currentUser');
    window.location.href = '../index.html';
}

function refreshDashboard() {
    loadDashboardData();
    showToast('Data refreshed successfully!', 'success');
}

function showNotifications() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const messages = usersData.messages || [];
    const orders = usersData.orders || [];
    
    const notifications = [];
    
    // Unread messages
    const unreadMessages = messages.filter(msg => 
        msg.receiverId === currentOperator.id && !msg.read
    );
    
    unreadMessages.forEach(msg => {
        notifications.push({
            type: 'message',
            content: `New message from ${msg.senderId === currentOperator.id ? 'you' : 'sender'}`,
            time: formatTime(msg.timestamp),
            important: true
        });
    });
    
    // New orders assigned
    const newOrders = orders.filter(order => 
        (order.assignedTo === currentOperator.id || 
         (order.assignedTo && order.assignedTo.includes(currentOperator.id))) &&
        order.status === 'pending' &&
        new Date(order.orderDate) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );
    
    newOrders.forEach(order => {
        notifications.push({
            type: 'order',
            content: `New order assigned: #${order.id.toString().slice(-6)}`,
            time: formatTime(order.orderDate),
            important: true
        });
    });
    
    // Update notification count
    document.getElementById('notificationCount').textContent = notifications.length;
    
    // Show modal with notifications
    const modal = document.getElementById('notificationModal');
    const list = document.getElementById('notificationsList');
    
    list.innerHTML = '';
    
    if (notifications.length === 0) {
        list.innerHTML = '<p class="text-center">No notifications</p>';
    } else {
        notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            item.innerHTML = `
                <div class="notification-content">
                    <p><strong>${notification.content}</strong></p>
                    <small>${notification.time}</small>
                </div>
            `;
            list.appendChild(item);
        });
    }
    
    modal.style.display = 'flex';
}

function closeNotificationModal() {
    document.getElementById('notificationModal').style.display = 'none';
}

function startProcessing() {
    navigateToSection('orders');
    showToast('Start processing orders', 'info');
}

function viewOrderDetails(orderId) {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const order = usersData.orders.find(o => o.id == orderId);
    
    if (!order) return;
    
    const customer = usersData.customers.find(c => c.id === order.customerId);
    const product = usersData.products.find(p => p.id === order.productId);
    
    const content = document.getElementById('orderDetailsContent');
    content.innerHTML = `
        <div class="order-detail-section">
            <h4>Order Information</h4>
            <p><strong>Order ID:</strong> #${order.id.toString().slice(-6)}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Order Date:</strong> ${formatDate(order.orderDate)}</p>
            <p><strong>Type:</strong> ${order.orderType || 'Purchase'}</p>
        </div>
        
        <div class="order-detail-section">
            <h4>Customer Information</h4>
            <p><strong>Name:</strong> ${customer ? customer.name : 'Walk-in Customer'}</p>
            ${customer ? `<p><strong>Phone:</strong> ${customer.phone}</p>` : ''}
            ${customer ? `<p><strong>Address:</strong> ${customer.address || 'N/A'}</p>` : ''}
        </div>
        
        <div class="order-detail-section">
            <h4>Product Details</h4>
            <p><strong>Product:</strong> ${product ? product.name : order.productName || 'N/A'}</p>
            <p><strong>Quantity:</strong> ${order.quantity || 0} kg</p>
            <p><strong>Price per kg:</strong> ${formatCurrency(order.pricePerKg || 0)}</p>
            <p><strong>Milling Fee:</strong> ${formatCurrency(order.millingFee || 0)}</p>
            <p><strong>Total Amount:</strong> ${formatCurrency(order.total || 0)}</p>
        </div>
        
        <div class="order-detail-section">
            <h4>Processing</h4>
            <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            <button class="btn btn-primary btn-block mt-2" onclick="notifyCustomer(${order.id})">
                <i class="fas fa-bell"></i> Notify Customer
            </button>
        </div>
    `;
    
    document.getElementById('orderDetailsModal').style.display = 'block';
}

function closeOrderDetails() {
    document.getElementById('orderDetailsModal').style.display = 'none';
}

function notifyCustomer(orderId) {
    showToast('Customer notification sent!', 'success');
}

function messageCustomer(customerId) {
    navigateToSection('messages');
    // Focus on customer chat
    showToast('Opening chat with customer', 'info');
}

function viewCustomerOrders(customerId) {
    showToast('Viewing customer orders', 'info');
    // Implement customer order view
}

function viewOrderHistory(orderId) {
    showToast('Viewing order history details', 'info');
    // Implement order history view
}

function viewOfflineOrder(orderId) {
    showToast('Viewing offline order details', 'info');
    // Implement offline order view
}

function attachImage() {
    showToast('Image attachment feature coming soon!', 'info');
}

function attachDocument() {
    showToast('Document attachment feature coming soon!', 'info');
}

function showHelp() {
    document.getElementById('helpModal').style.display = 'flex';
}

function closeHelpModal() {
    document.getElementById('helpModal').style.display = 'none';
}

function refreshInventory() {
    loadDashboardData();
    showToast('Inventory refreshed', 'success');
}

function changeProfilePicture() {
    showToast('Profile picture change feature coming soon!', 'info');
}

function removeProfilePicture() {
    const defaultAvatar = 'https://ui-avatars.com/api/?name=Operator&background=2196F3&color=fff';
    document.getElementById('currentProfilePic').src = defaultAvatar;
    showToast('Profile picture removed', 'success');
}

function logoutOtherSessions() {
    showToast('Other sessions logged out', 'success');
}

function updateNotificationBadges(data) {
    const messages = data.messages || [];
    const orders = data.orders || [];
    
    // Message badge
    const unreadMessages = messages.filter(msg => 
        msg.receiverId === currentOperator.id && !msg.read
    ).length;
    document.getElementById('messagesBadge').textContent = unreadMessages;
    
    // Order badge
    const pendingOrders = orders.filter(order => 
        (order.assignedTo === currentOperator.id || 
         (order.assignedTo && order.assignedTo.includes(currentOperator.id))) &&
        order.status === 'pending'
    ).length;
    document.getElementById('ordersBadge').textContent = pendingOrders;
    
    // Notification badge
    const notificationCount = unreadMessages + pendingOrders;
    document.getElementById('notificationCount').textContent = notificationCount;
}

function showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to body
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function startAutoRefresh() {
    // Auto-refresh dashboard every 5 minutes if on dashboard
    setInterval(() => {
        if (document.querySelector('.content-section.active').id === 'dashboard') {
            loadDashboardData();
        }
    }, 300000);
    
    // Update time every minute
    setInterval(updateDateTime, 60000);
}

// Initialize on load
window.addEventListener('load', function() {
    // Check for dark mode preference
    const savedTheme = localStorage.getItem('theme');
    const darkModeBtn = document.getElementById('opDarkMode');
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (darkModeBtn) {
            const icon = darkModeBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    }
});