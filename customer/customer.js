// Customer Dashboard JavaScript

// Global Variables
let currentCustomer = null;
let currentCart = [];
let savedItems = [];
let currentProducts = [];
let currentOrders = [];
let currentMessages = [];
let currentNotifications = [];

// Initialize Customer Dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeCustomerDashboard();
});

function initializeCustomerDashboard() {
    // Check authentication
    checkCustomerAuth();
    
    // Load customer data
    loadCustomerData();
    
    // Set up event listeners
    setupCustomerEventListeners();
    
    // Load dashboard data
    loadDashboardData();
    
    // Initialize dark mode
    initializeDarkMode();
    
    // Start auto-refresh
    startAutoRefresh();
}

// Authentication
function checkCustomerAuth() {
    const customerData = localStorage.getItem('currentUser');
    if (!customerData) {
        window.location.href = '../index.html';
        return;
    }
    
    const user = JSON.parse(customerData);
    if (user.role !== 'customer') {
        window.location.href = '../index.html';
        return;
    }
    
    currentCustomer = user;
}

// Load Customer Data
function loadCustomerData() {
    if (currentCustomer) {
        // Update header info
        document.getElementById('customerName').textContent = currentCustomer.name;
        document.getElementById('customerEmail').textContent = currentCustomer.email;
        document.getElementById('customerGreeting').textContent = currentCustomer.name.split(' ')[0];
        
        // Update avatar
            const initials = currentCustomer.name.split(' ').map(n => n[0]).join('').toUpperCase();
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=FF9800&color=fff`;
            const avatarUrl = currentCustomer.profilePicture && currentCustomer.profilePicture.length ? currentCustomer.profilePicture : fallbackAvatar;
            const customerAvatarEl = document.getElementById('customerAvatar');
            const settingsAvatarEl = document.getElementById('settingsAvatar');
            if (customerAvatarEl) customerAvatarEl.src = avatarUrl;
            if (settingsAvatarEl) settingsAvatarEl.src = avatarUrl;
        
        // Load cart
        loadCart();
        
        // Load saved items
        loadSavedItems();
    }
}

// Event Listeners
function setupCustomerEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            navigateToSection(target);
            
            // Update active nav
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logoutCustomer);
    
    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    
    // Notifications
    document.getElementById('notificationBtn').addEventListener('click', toggleNotificationPanel);
    
    // Products search and filter
    document.getElementById('productSearch').addEventListener('input', filterProducts);
    document.getElementById('categoryFilter').addEventListener('change', filterProducts);
    document.getElementById('sortFilter').addEventListener('change', sortProducts);
    
    // Cart
    document.getElementById('checkoutBtn').addEventListener('click', proceedToCheckout);
    
    // Orders filter
    document.getElementById('orderStatusFilter').addEventListener('change', filterOrders);
    
    // Special orders
    document.getElementById('specialOrderForm').addEventListener('submit', placeSpecialOrder);
    document.getElementById('specialQuantity').addEventListener('input', calculateSpecialOrder);
    document.getElementById('millingType').addEventListener('change', calculateSpecialOrder);
    
    // Messages
    document.getElementById('newMessageBtn').addEventListener('click', showNewMessageModal);
    document.getElementById('markAllReadBtn').addEventListener('click', markAllMessagesRead);
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('input', toggleSendButton);
    document.getElementById('newMessageForm').addEventListener('submit', sendNewMessage);
    
    // Settings
    document.getElementById('profileSettingsForm').addEventListener('submit', saveProfileSettings);
    document.getElementById('securityForm').addEventListener('submit', changePassword);
    // Language selector: change language immediately and persist
    const langSelect = document.getElementById('languagePref');
    if (langSelect) {
        langSelect.addEventListener('change', function(e) {
            const newLang = e.target.value;
            try {
                if (window.i18n && typeof window.i18n.setLanguage === 'function') {
                    window.i18n.setLanguage(newLang);
                    // apply translations to DOM elements marked with data-i18n
                    if (typeof window.i18n.applyTranslations === 'function') {
                        window.i18n.applyTranslations(newLang);
                    }
                    // refresh active section to re-render dynamic strings
                    const activeSection = document.querySelector('.content-section.active');
                    if (activeSection && typeof loadSectionData === 'function') {
                        loadSectionData(activeSection.id);
                    }
                }
            } catch (err) {
                console.error('i18n setLanguage error', err);
            }

            // Persist to user preferences immediately
            try {
                const key = `preferences_${currentCustomer.id}`;
                const prefs = JSON.parse(localStorage.getItem(key) || '{}');
                prefs.language = newLang;
                localStorage.setItem(key, JSON.stringify(prefs));
            } catch (e) {
                console.warn('Failed to persist language preference', e);
            }

            showToast('Language changed', 'success');
        });
    }
    
    // Close modals
    document.querySelectorAll('.close-modal, .close-panel').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal, .notification-panel').style.display = 'none';
        });
    });
    
    // Window close modal
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Initialize dropdowns
    initializeDropdowns();
}

// Navigation
function navigateToSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        
        // Load section data
        loadSectionData(sectionId);
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Load Section Data
function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'products':
            loadProductsData();
            break;
        case 'cart':
            loadCartData();
            break;
        case 'orders':
            loadOrdersData();
            break;
        case 'special':
            loadSpecialOrdersData();
            break;
        case 'messages':
            loadMessagesData();
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
    
    // Load recent orders
    loadRecentOrders(usersData);
    
    // Load recommendations
    loadRecommendations(usersData);
    
    // Load notifications
    loadNotifications(usersData);
}

function updateDashboardStats(data) {
    const orders = data.orders || [];
    const customerOrders = orders.filter(order => order.customerId === currentCustomer.id);
    
    const totalOrders = customerOrders.length;
    const pendingOrders = customerOrders.filter(order => 
        order.status === 'pending' || order.status === 'processing'
    ).length;
    const completedOrders = customerOrders.filter(order => order.status === 'completed').length;
    
    // Update DOM
    document.getElementById('totalOrdersCount').textContent = totalOrders;
    document.getElementById('pendingOrdersCount').textContent = pendingOrders;
    document.getElementById('completedOrdersCount').textContent = completedOrders;
}

function loadRecentOrders(data) {
    const orders = data.orders || [];
    const products = data.products || [];
    
    const recentOrders = orders
        .filter(order => order.customerId === currentCustomer.id)
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
        const product = products.find(p => p.id === order.productId);
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-item';
        orderDiv.innerHTML = `
            <div class="order-info">
                <h4>${product ? product.name : order.productName || 'Product'}</h4>
                <div class="order-details">
                    <span><i class="fas fa-balance-scale"></i> ${order.quantity || 0} kg</span>
                    <span><i class="fas fa-money-bill"></i> ${formatCurrency(order.total || 0)}</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(order.orderDate)}</span>
                </div>
            </div>
            <div class="order-status status-${order.status || 'pending'}">
                ${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending'}
            </div>
        `;
        ordersList.appendChild(orderDiv);
    });
}

function loadRecommendations(data) {
    const products = data.products || [];
    const recommendationsGrid = document.getElementById('recommendationsGrid');
    
    // Get posted products
    const postedProducts = products.filter(product => product.posted).slice(0, 4);
    
    recommendationsGrid.innerHTML = '';
    
    if (postedProducts.length === 0) {
        recommendationsGrid.innerHTML = '<p>No recommendations available</p>';
        return;
    }
    
    postedProducts.forEach(product => {
        const productCard = createProductCard(product);
        recommendationsGrid.appendChild(productCard);
    });
}

// Products Functions
function loadProductsData() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    currentProducts = usersData.products || [];
    
    displayProducts(currentProducts.filter(p => p.posted));
}

function displayProducts(products) {
    const productsGrid = document.getElementById('productsGrid');
    const noProductsMessage = document.getElementById('noProductsMessage');
    
    productsGrid.innerHTML = '';
    
    if (products.length === 0) {
        noProductsMessage.style.display = 'block';
        return;
    }
    
    noProductsMessage.style.display = 'none';
    
    products.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Check if product is saved
    const isSaved = savedItems.some(item => item.productId === product.id);
    
    card.innerHTML = `
        <div class="product-image">
            ${product.image ? `<img src="${product.image}" alt="${product.name}">` : ''}
            <div class="product-badge">${product.category}</div>
            <button class="favorite-btn ${isSaved ? 'active' : ''}" onclick="toggleSaveItem(${product.id})">
                <i class="fas fa-heart"></i>
            </button>
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-category">${product.origin || ''} | ${product.quality || ''}</p>
            <p class="product-description">${product.description || ''}</p>
            <div class="product-price">
                ${formatCurrency(product.price)}/kg
            </div>
            <p class="product-milling">Milling: ${formatCurrency(product.millingFee || 0)}/kg</p>
            <div class="product-actions">
                <button class="btn btn-primary" onclick="showOrderForm(${product.id})">
                    <i class="fas fa-shopping-cart"></i> Buy Now
                </button>
                <button class="btn btn-outline" onclick="addToCart(${product.id})">
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function filterProducts() {
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const sortBy = document.getElementById('sortFilter').value;
    
    let filteredProducts = currentProducts.filter(product => product.posted);
    
    // Apply search filter
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description?.toLowerCase().includes(searchTerm) ||
            product.category?.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply category filter
    if (category !== 'all') {
        filteredProducts = filteredProducts.filter(product =>
            product.category?.toLowerCase() === category
        );
    }
    
    // Apply sorting
    filteredProducts.sort((a, b) => {
        switch(sortBy) {
            case 'price-low':
                return a.price - b.price;
            case 'price-high':
                return b.price - a.price;
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });
    
    displayProducts(filteredProducts);
}

function sortProducts() {
    filterProducts();
}

// Cart Functions
function loadCart() {
    const cart = JSON.parse(localStorage.getItem(`cart_${currentCustomer.id}`) || '[]');
    currentCart = cart;
    updateCartCount();
}

function loadCartData() {
    updateCartDisplay();
    updateCartSummary();
    updateSavedItems();
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    
    cartItems.innerHTML = '';
    
    if (currentCart.length === 0) {
        emptyCart.style.display = 'block';
        cartItems.style.display = 'none';
        return;
    }
    
    emptyCart.style.display = 'none';
    cartItems.style.display = 'flex';
    
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const products = usersData.products || [];
    
    currentCart.forEach((cartItem, index) => {
        const product = products.find(p => p.id === cartItem.productId);
        if (!product) return;
        
        const itemTotal = (cartItem.quantity || 1) * (cartItem.price || product.price);
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <div class="cart-item-image">
                ${product.image ? `<img src="${product.image}" alt="${product.name}">` : ''}
            </div>
            <div class="cart-item-details">
                <h4>${product.name}</h4>
                <p class="cart-item-price">${formatCurrency(product.price)}/kg</p>
                <div class="cart-item-controls">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="updateCartQuantity(${index}, -0.5)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="quantity-input" value="${cartItem.quantity || 1}" 
                               min="${product.minQuantity || 1}" step="0.5" 
                               onchange="updateCartQuantityInput(${index}, this.value)">
                        <button class="quantity-btn" onclick="updateCartQuantity(${index}, 0.5)">
                            <i class="fas fa-plus"></i>
                        </button>
                        <span>kg</span>
                    </div>
                    <div class="cart-item-actions">
                        <button class="btn btn-sm btn-outline" onclick="moveToSaved(${index})">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="cart-item-total">
                ${formatCurrency(itemTotal)}
            </div>
        `;
        cartItems.appendChild(itemDiv);
    });
}

function updateCartSummary() {
    const subtotal = calculateSubtotal();
    const millingTotal = calculateMillingTotal();
    const orderTotal = subtotal + millingTotal + 20; // 20 Birr order fee
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('millingTotal').textContent = formatCurrency(millingTotal);
    document.getElementById('orderTotal').textContent = formatCurrency(orderTotal);
    
    // Update checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    checkoutBtn.disabled = currentCart.length === 0;
    
    // Update cart summary in header
    document.getElementById('cartTotalItems').textContent = currentCart.length;
    document.getElementById('cartTotalPrice').textContent = formatCurrency(orderTotal);
}

function calculateSubtotal() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const products = usersData.products || [];
    
    return currentCart.reduce((total, cartItem) => {
        const product = products.find(p => p.id === cartItem.productId);
        if (!product) return total;
        
        return total + (cartItem.quantity || 1) * (cartItem.price || product.price);
    }, 0);
}

function calculateMillingTotal() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const products = usersData.products || [];
    
    return currentCart.reduce((total, cartItem) => {
        const product = products.find(p => p.id === cartItem.productId);
        if (!product) return total;
        
        return total + (cartItem.quantity || 1) * (product.millingFee || 0);
    }, 0);
}

function updateCartCount() {
    const count = currentCart.length;
    document.getElementById('cartCount').textContent = count;
    document.getElementById('cartItemsCount').textContent = count;
}

function addToCart(productId) {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const product = usersData.products.find(p => p.id === productId);
    
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    // Check if product is already in cart
    const existingIndex = currentCart.findIndex(item => item.productId === productId);
    
    if (existingIndex !== -1) {
        // Update quantity
        currentCart[existingIndex].quantity = (currentCart[existingIndex].quantity || 1) + 1;
    } else {
        // Add new item
        currentCart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            millingFee: product.millingFee,
            quantity: product.minQuantity || 1,
            addedAt: new Date().toISOString()
        });
    }
    
    // Save cart
    localStorage.setItem(`cart_${currentCustomer.id}`, JSON.stringify(currentCart));
    
    // Update UI
    updateCartCount();
    
    if (document.getElementById('cart').classList.contains('active')) {
        updateCartDisplay();
        updateCartSummary();
    }
    
    showToast('Product added to cart', 'success');
}

function updateCartQuantity(index, change) {
    const newQuantity = (currentCart[index].quantity || 1) + change;
    
    // Get product min quantity
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const product = usersData.products.find(p => p.id === currentCart[index].productId);
    const minQuantity = product?.minQuantity || 1;
    
    if (newQuantity < minQuantity) {
        showToast(`Minimum quantity is ${minQuantity} kg`, 'warning');
        return;
    }
    
    currentCart[index].quantity = newQuantity;
    localStorage.setItem(`cart_${currentCustomer.id}`, JSON.stringify(currentCart));
    
    updateCartDisplay();
    updateCartSummary();
}

function updateCartQuantityInput(index, value) {
    const quantity = parseFloat(value);
    
    if (isNaN(quantity) || quantity <= 0) {
        showToast('Please enter a valid quantity', 'error');
        return;
    }
    
    // Get product min quantity
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const product = usersData.products.find(p => p.id === currentCart[index].productId);
    const minQuantity = product?.minQuantity || 1;
    
    if (quantity < minQuantity) {
        showToast(`Minimum quantity is ${minQuantity} kg`, 'warning');
        currentCart[index].quantity = minQuantity;
    } else {
        currentCart[index].quantity = quantity;
    }
    
    localStorage.setItem(`cart_${currentCustomer.id}`, JSON.stringify(currentCart));
    
    updateCartDisplay();
    updateCartSummary();
}

function removeFromCart(index) {
    currentCart.splice(index, 1);
    localStorage.setItem(`cart_${currentCustomer.id}`, JSON.stringify(currentCart));
    
    updateCartDisplay();
    updateCartSummary();
    updateCartCount();
    
    showToast('Item removed from cart', 'success');
}

function moveToSaved(index) {
    const item = currentCart[index];
    savedItems.push(item);
    
    // Remove from cart
    currentCart.splice(index, 1);
    
    // Save both
    localStorage.setItem(`cart_${currentCustomer.id}`, JSON.stringify(currentCart));
    localStorage.setItem(`saved_${currentCustomer.id}`, JSON.stringify(savedItems));
    
    // Update UI
    updateCartDisplay();
    updateCartSummary();
    updateCartCount();
    updateSavedItems();
    
    showToast('Item moved to saved items', 'success');
}

function loadSavedItems() {
    savedItems = JSON.parse(localStorage.getItem(`saved_${currentCustomer.id}`) || '[]');
}

function updateSavedItems() {
    const savedContainer = document.getElementById('savedItems');
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const products = usersData.products || [];
    
    savedContainer.innerHTML = '';
    
    if (savedItems.length === 0) {
        savedContainer.innerHTML = '<p>No saved items</p>';
        return;
    }
    
    savedItems.forEach((item, index) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;
        
        const savedDiv = document.createElement('div');
        savedDiv.className = 'saved-item';
        savedDiv.innerHTML = `
            ${product.image ? `<img src="${product.image}" alt="${product.name}">` : ''}
            <div class="saved-item-details">
                <h5>${product.name}</h5>
                <p class="saved-item-price">${formatCurrency(product.price)}/kg</p>
                <div class="saved-item-actions">
                    <button class="btn btn-sm btn-primary" onclick="moveToCartFromSaved(${index})">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="removeFromSaved(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        savedContainer.appendChild(savedDiv);
    });
}

function moveToCartFromSaved(index) {
    const item = savedItems[index];
    currentCart.push(item);
    
    // Remove from saved
    savedItems.splice(index, 1);
    
    // Save both
    localStorage.setItem(`cart_${currentCustomer.id}`, JSON.stringify(currentCart));
    localStorage.setItem(`saved_${currentCustomer.id}`, JSON.stringify(savedItems));
    
    // Update UI
    updateCartDisplay();
    updateCartSummary();
    updateCartCount();
    updateSavedItems();
    
    showToast('Item moved to cart', 'success');
}

function removeFromSaved(index) {
    savedItems.splice(index, 1);
    localStorage.setItem(`saved_${currentCustomer.id}`, JSON.stringify(savedItems));
    
    updateSavedItems();
    showToast('Item removed from saved items', 'success');
}

function toggleSaveItem(productId) {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const product = usersData.products.find(p => p.id === productId);
    
    if (!product) return;
    
    const existingIndex = savedItems.findIndex(item => item.productId === productId);
    
    if (existingIndex !== -1) {
        // Remove from saved
        savedItems.splice(existingIndex, 1);
        showToast('Removed from saved items', 'success');
    } else {
        // Add to saved
        savedItems.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            savedAt: new Date().toISOString()
        });
        showToast('Added to saved items', 'success');
    }
    
    localStorage.setItem(`saved_${currentCustomer.id}`, JSON.stringify(savedItems));
    updateSavedItems();
    
    // Update favorite button
    const favoriteBtn = event.target.closest('.favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.classList.toggle('active');
    }
}

// Orders Functions
function loadOrdersData() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    currentOrders = usersData.orders || [];
    
    displayOrders();
}

function displayOrders() {
    const statusFilter = document.getElementById('orderStatusFilter').value;
    const startDate = document.getElementById('orderStartDate').value;
    const endDate = document.getElementById('orderEndDate').value;
    
    let filteredOrders = currentOrders.filter(order => order.customerId === currentCustomer.id);
    
    // Apply status filter
    if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }
    
    // Apply date filter
    if (startDate) {
        filteredOrders = filteredOrders.filter(order => 
            new Date(order.orderDate) >= new Date(startDate)
        );
    }
    
    if (endDate) {
        filteredOrders = filteredOrders.filter(order =>
            new Date(order.orderDate) <= new Date(endDate + 'T23:59:59')
        );
    }
    
    // Sort by date (newest first)
    filteredOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    
    const ordersContainer = document.getElementById('ordersContainer');
    const noOrdersMessage = document.getElementById('noOrdersMessage');
    
    ordersContainer.innerHTML = '';
    
    if (filteredOrders.length === 0) {
        noOrdersMessage.style.display = 'block';
        return;
    }
    
    noOrdersMessage.style.display = 'none';
    
    filteredOrders.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersContainer.appendChild(orderCard);
    });
}

function createOrderCard(order) {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const products = usersData.products || [];
    const operators = usersData.operators || [];
    
    const product = products.find(p => p.id === order.productId);
    const operator = operators.find(o => o.id === order.assignedTo);
    
    const orderDate = new Date(order.orderDate);
    const formattedDate = orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
        <div class="order-header">
            <div>
                <div class="order-id">Order #${order.id.toString().slice(-6)}</div>
                <div class="order-date">${formattedDate}</div>
            </div>
            <div class="order-status status-${order.status || 'pending'}">
                ${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending'}
            </div>
        </div>
        
        <div class="order-details-grid">
            <div class="order-item-row">
                <span class="order-item-name">${product ? product.name : order.productName || 'Product'}</span>
                <span class="order-item-quantity">${order.quantity || 0} kg</span>
                <span class="order-item-price">${formatCurrency((order.pricePerKg || 0) * (order.quantity || 0))}</span>
            </div>
            ${order.millingFee > 0 ? `
                <div class="order-item-row">
                    <span class="order-item-name">Milling Service</span>
                    <span class="order-item-quantity">${order.quantity || 0} kg</span>
                    <span class="order-item-price">${formatCurrency((order.millingFee || 0) * (order.quantity || 0))}</span>
                </div>
            ` : ''}
        </div>
        
        ${operator ? `
            <div class="order-operator">
                <p><strong>Assigned Operator:</strong> ${operator.name}</p>
                <p><strong>Contact:</strong> ${operator.phone || 'N/A'}</p>
            </div>
        ` : ''}
        
        <div class="order-total">
            <div>
                <div class="order-total-label">Total Amount</div>
                ${order.orderType === 'special' ? '<div class="order-type">Special Order</div>' : ''}
            </div>
            <div class="order-total-amount">${formatCurrency(order.total || 0)}</div>
        </div>
        
        <div class="order-actions">
            <button class="btn btn-sm btn-outline" onclick="viewOrderDetails(${order.id})">
                <i class="fas fa-eye"></i> View Details
            </button>
            ${order.status === 'processing' ? `
                <button class="btn btn-sm btn-primary" onclick="contactOperator(${order.id})">
                    <i class="fas fa-comment"></i> Contact Operator
                </button>
            ` : ''}
            ${order.status === 'pending' ? `
                <button class="btn btn-sm btn-danger" onclick="cancelOrder(${order.id})">
                    <i class="fas fa-times"></i> Cancel Order
                </button>
            ` : ''}
        </div>
    `;
    
    return card;
}

function filterOrders() {
    displayOrders();
}

function viewOrderDetails(orderId) {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const order = usersData.orders.find(o => o.id === orderId);
    
    if (!order) return;
    
    const product = usersData.products.find(p => p.id === order.productId);
    const operator = usersData.operators.find(o => o.id === order.assignedTo);
    
    const details = `
        <div class="order-details-modal">
            <h3>Order Details</h3>
            <div class="details-grid">
                <div class="detail-item">
                    <strong>Order ID:</strong> #${order.id.toString().slice(-6)}
                </div>
                <div class="detail-item">
                    <strong>Status:</strong> ${order.status}
                </div>
                <div class="detail-item">
                    <strong>Order Date:</strong> ${formatDate(order.orderDate)}
                </div>
                <div class="detail-item">
                    <strong>Product:</strong> ${product ? product.name : order.productName}
                </div>
                <div class="detail-item">
                    <strong>Quantity:</strong> ${order.quantity} kg
                </div>
                <div class="detail-item">
                    <strong>Price per kg:</strong> ${formatCurrency(order.pricePerKg || 0)}
                </div>
                ${order.millingFee > 0 ? `
                    <div class="detail-item">
                        <strong>Milling Fee:</strong> ${formatCurrency(order.millingFee)}/kg
                    </div>
                ` : ''}
                <div class="detail-item">
                    <strong>Order Fee:</strong> 20 Birr
                </div>
                <div class="detail-item total">
                    <strong>Total Amount:</strong> ${formatCurrency(order.total || 0)}
                </div>
            </div>
            
            ${operator ? `
                <div class="operator-info">
                    <h4>Operator Information</h4>
                    <p><strong>Name:</strong> ${operator.name}</p>
                    <p><strong>Phone:</strong> ${operator.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> ${operator.email || 'N/A'}</p>
                </div>
            ` : ''}
            
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="closeModal()">
                    Close
                </button>
            </div>
        </div>
    `;
    
    // Show in modal
    document.getElementById('orderModalContent').innerHTML = details;
    document.getElementById('orderModal').style.display = 'flex';
}

function contactOperator(orderId) {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const order = usersData.orders.find(o => o.id === orderId);
    
    if (!order || !order.assignedTo) {
        showToast('No operator assigned to this order', 'warning');
        return;
    }
    
    navigateToSection('messages');
    // Focus on operator chat
    showToast('Opening chat with operator', 'info');
}

function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) {
        return;
    }
    
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    const orderIndex = usersData.orders.findIndex(o => o.id === orderId);
    
    if (orderIndex !== -1) {
        usersData.orders[orderIndex].status = 'cancelled';
        usersData.orders[orderIndex].cancelledAt = new Date().toISOString();
        
        localStorage.setItem('millUsers', JSON.stringify(usersData));
        
        loadOrdersData();
        loadDashboardData();
        
        showToast('Order cancelled successfully', 'success');
    }
}

// Special Orders Functions
function loadSpecialOrdersData() {
    // Load special orders history
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const specialOrders = usersData.orders.filter(order => 
        order.customerId === currentCustomer.id && order.orderType === 'special'
    );
    
    displaySpecialOrdersHistory(specialOrders);
}

function displaySpecialOrdersHistory(orders) {
    const historyList = document.getElementById('specialOrdersHistory');
    historyList.innerHTML = '';
    
    if (orders.length === 0) {
        historyList.innerHTML = '<p>No special orders yet</p>';
        return;
    }
    
    orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)).forEach(order => {
        const orderDate = new Date(order.orderDate);
        const formattedDate = orderDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-item-header">
                <div class="history-item-id">Special Order #${order.id.toString().slice(-6)}</div>
                <div class="order-status status-${order.status || 'pending'}">
                    ${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending'}
                </div>
            </div>
            <div class="history-item-details">
                <span>${order.productName || 'Milling Service'}</span>
                <span>${order.quantity} kg</span>
                <span>${formatCurrency(order.total)}</span>
            </div>
            <div class="history-item-date">${formattedDate}</div>
        `;
        historyList.appendChild(historyItem);
    });
}

async function calculateSpecialOrder() {
    const quantity = parseFloat(document.getElementById('specialQuantity').value) || 0;
    const millingType = document.getElementById('millingType').value;
    
    // Milling fee based on type
    let millingFeePerKg = 10; // Base fee
    if (millingType === 'fine') millingFeePerKg = 15;
    if (millingType === 'coarse') millingFeePerKg = 8;
    
    // Transport fee: real calculation using geocoding + haversine
    const transportFeePerKm = 10; // 1 km = 10 Birr

    // Helper: geocode an address using Nominatim (returns {lat, lon} or null)
    async function geocode(address) {
        if (!address) return null;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) return null;
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        } catch (err) {
            return null;
        }
    }

    // Helper: haversine distance in km between two coords
    function haversine(lat1, lon1, lat2, lon2) {
        const toRad = v => v * Math.PI / 180;
        const R = 6371; // Earth's radius in km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    const pickupAddress = document.getElementById('pickupAddress')?.value || '';
    const deliveryAddress = document.getElementById('deliveryAddress')?.value || '';

    let distanceKm = null;
    let usedFallback = false;

    if (pickupAddress && deliveryAddress) {
        const [from, to] = await Promise.all([geocode(pickupAddress), geocode(deliveryAddress)]);
        if (from && to) {
            distanceKm = haversine(from.lat, from.lon, to.lat, to.lon);
        }
    }

    if (distanceKm === null || !isFinite(distanceKm)) {
        usedFallback = true;
        distanceKm = 5; // fallback estimate
    }

    const millingTotal = quantity * millingFeePerKg;
    const transportTotal = distanceKm * transportFeePerKm;
    const orderTotal = millingTotal + transportTotal;

    // Update display (safeguard if elements missing)
    const millingRateEl = document.getElementById('millingFeeRate');
    const distanceEl = document.getElementById('estimatedDistance');
    const transportFeeEl = document.getElementById('transportFee');
    const totalEl = document.getElementById('specialOrderTotal');

    if (millingRateEl) millingRateEl.textContent = `${formatCurrency(millingFeePerKg)}`;
    if (distanceEl) distanceEl.textContent = `${distanceKm.toFixed(2)} km${usedFallback ? ' (estimated)' : ''}`;
    if (transportFeeEl) transportFeeEl.textContent = formatCurrency(transportTotal);
    if (totalEl) totalEl.textContent = formatCurrency(orderTotal);
}

function placeSpecialOrder(e) {
    e.preventDefault();
    
    if (!validateSpecialOrderForm()) {
        return;
    }
    
    const specialOrder = {
        id: Date.now(),
        customerId: currentCustomer.id,
        customerName: currentCustomer.name,
        customerPhone: currentCustomer.phone,
        orderType: 'special',
        productName: document.getElementById('specialProductType').options[document.getElementById('specialProductType').selectedIndex].text,
        productType: document.getElementById('specialProductType').value,
        quantity: parseFloat(document.getElementById('specialQuantity').value),
        millingType: document.getElementById('millingType').value,
        pickupAddress: document.getElementById('pickupAddress').value,
        deliveryAddress: document.getElementById('deliveryAddress').value,
        pickupDate: document.getElementById('pickupDate').value,
        deliveryDate: document.getElementById('deliveryDate').value,
        specialInstructions: document.getElementById('specialInstructions').value,
        total: parseFloat(document.getElementById('specialOrderTotal').textContent.replace(/[^0-9.]/g, '')),
        status: 'pending',
        orderDate: new Date().toISOString(),
        type: 'special'
    };
    
    // Assign to appropriate operator based on product type
    assignSpecialOrderToOperator(specialOrder);
    
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    usersData.orders.push(specialOrder);
    localStorage.setItem('millUsers', JSON.stringify(usersData));
    
    // Reset form
    document.getElementById('specialOrderForm').reset();
    
    // Update history
    loadSpecialOrdersData();
    
    // Show success message
    showSpecialOrderSuccess(specialOrder);
}

function validateSpecialOrderForm() {
    const requiredFields = [
        'specialProductType',
        'specialQuantity',
        'millingType',
        'pickupAddress',
        'deliveryAddress',
        'pickupDate',
        'deliveryDate'
    ];
    
    for (const fieldId of requiredFields) {
        const field = document.getElementById(fieldId);
        if (!field.value) {
            showToast(`Please fill in ${field.labels[0]?.textContent || 'all required fields'}`, 'error');
            field.focus();
            return false;
        }
    }
    
    const pickupDate = new Date(document.getElementById('pickupDate').value);
    const deliveryDate = new Date(document.getElementById('deliveryDate').value);
    
    if (deliveryDate < pickupDate) {
        showToast('Delivery date must be after pickup date', 'error');
        return false;
    }
    
    return true;
}

function assignSpecialOrderToOperator(order) {
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    const operators = usersData.operators || [];
    
    // Find operator assigned to this product type
    const assignedOperator = operators.find(operator => 
        operator.assignments && 
        operator.assignments.some(assignment => 
            assignment.toLowerCase().includes(order.productType.toLowerCase())
        )
    );
    
    if (assignedOperator) {
        order.assignedTo = assignedOperator.id;
        order.operatorName = assignedOperator.name;
        order.operatorPhone = assignedOperator.phone;
    }
}

function showSpecialOrderSuccess(order) {
    const successMessage = `
        <div class="order-success">
            <i class="fas fa-check-circle"></i>
            <h3>Special Order Placed Successfully!</h3>
            <p>Your milling service order has been received.</p>
            
            <div class="order-summary">
                <p><strong>Order ID:</strong> #${order.id.toString().slice(-6)}</p>
                <p><strong>Total Amount:</strong> ${formatCurrency(order.total)}</p>
                ${order.operatorName ? `
                    <p><strong>Assigned Operator:</strong> ${order.operatorName}</p>
                    <p><strong>Operator Phone:</strong> ${order.operatorPhone}</p>
                ` : '<p>An operator will be assigned shortly</p>'}
            </div>
            
            <button class="btn btn-primary" onclick="closeModal()">
                Continue
            </button>
        </div>
    `;
    
    document.getElementById('orderModalContent').innerHTML = successMessage;
    document.getElementById('orderModal').style.display = 'flex';
}

// Order Form Functions
function showOrderForm(productId) {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const product = usersData.products.find(p => p.id === productId);
    
    if (!product) return;
    
    const formHtml = `
        <form id="singleOrderForm" onsubmit="placeSingleOrder(event, ${productId})">
            <div class="form-group">
                <label>Product</label>
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p>${product.description || ''}</p>
                    <p><strong>Price:</strong> ${formatCurrency(product.price)}/kg</p>
                    <p><strong>Milling Fee:</strong> ${formatCurrency(product.millingFee || 0)}/kg</p>
                    <p><strong>Minimum Quantity:</strong> ${product.minQuantity || 1} kg</p>
                </div>
            </div>
            
            <div class="form-group">
                <label for="orderQuantity">Quantity (kg) *</label>
                <input type="number" id="orderQuantity" 
                       min="${product.minQuantity || 1}" 
                       step="0.5" 
                       value="${product.minQuantity || 1}" 
                       required>
            </div>
            
            <div class="form-group">
                <label for="orderAddress">Delivery Address *</label>
                <textarea id="orderAddress" rows="2" required>${currentCustomer.address || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label for="orderPayment">Payment Method *</label>
                <select id="orderPayment" required>
                    <option value="">Select Payment Method</option>
                    <option value="cbe">CBE</option>
                    <option value="telebirr">Telebirr</option>
                    <option value="cash">Cash on Delivery</option>
                </select>
            </div>
            
            <div class="price-calculation">
                <h4>Price Calculation</h4>
                <div class="calculation-row">
                    <span>Product Price:</span>
                    <span id="productPriceCalc">${formatCurrency(product.price)} × 1 kg</span>
                </div>
                <div class="calculation-row">
                    <span>Milling Fee:</span>
                    <span id="millingPriceCalc">${formatCurrency(product.millingFee || 0)} × 1 kg</span>
                </div>
                <div class="calculation-row">
                    <span>Order Fee:</span>
                    <span>20 Birr</span>
                </div>
                <div class="calculation-row total">
                    <span>Total:</span>
                    <span id="totalPriceCalc">${formatCurrency(product.price + (product.millingFee || 0) + 20)}</span>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-outline" onclick="closeOrderModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-paper-plane"></i> Place Order
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('orderModalContent').innerHTML = formHtml;
    document.getElementById('orderModal').style.display = 'flex';
    
    // Update calculation on quantity change
    document.getElementById('orderQuantity').addEventListener('input', function() {
        updateOrderCalculation(product, this.value);
    });
}

function updateOrderCalculation(product, quantity) {
    const quantityNum = parseFloat(quantity) || product.minQuantity || 1;
    const productTotal = quantityNum * product.price;
    const millingTotal = quantityNum * (product.millingFee || 0);
    const orderTotal = productTotal + millingTotal + 20;
    
    document.getElementById('productPriceCalc').textContent = 
        `${formatCurrency(product.price)} × ${quantityNum} kg = ${formatCurrency(productTotal)}`;
    document.getElementById('millingPriceCalc').textContent = 
        `${formatCurrency(product.millingFee || 0)} × ${quantityNum} kg = ${formatCurrency(millingTotal)}`;
    document.getElementById('totalPriceCalc').textContent = formatCurrency(orderTotal);
}

function placeSingleOrder(e, productId) {
    e.preventDefault();
    
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const product = usersData.products.find(p => p.id === productId);
    
    if (!product) return;
    
    const quantity = parseFloat(document.getElementById('orderQuantity').value);
    const address = document.getElementById('orderAddress').value;
    const paymentMethod = document.getElementById('orderPayment').value;
    
    const productTotal = quantity * product.price;
    const millingTotal = quantity * (product.millingFee || 0);
    const orderTotal = productTotal + millingTotal + 20;
    
    const newOrder = {
        id: Date.now(),
        customerId: currentCustomer.id,
        customerName: currentCustomer.name,
        customerPhone: currentCustomer.phone,
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        pricePerKg: product.price,
        millingFee: product.millingFee || 0,
        total: orderTotal,
        address: address,
        paymentMethod: paymentMethod,
        status: 'pending',
        orderDate: new Date().toISOString(),
        type: 'regular'
    };
    
    // Assign to appropriate operator
    assignOrderToOperator(newOrder, product.category);
    
    usersData.orders.push(newOrder);
    localStorage.setItem('millUsers', JSON.stringify(usersData));
    
    closeOrderModal();
    showOrderSuccess(newOrder);
}

function assignOrderToOperator(order, productCategory) {
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    const operators = usersData.operators || [];
    
    // Find operator assigned to this category
    const assignedOperator = operators.find(operator => 
        operator.assignments && 
        operator.assignments.some(assignment => {
            const assignmentLower = assignment.toLowerCase();
            const categoryLower = productCategory.toLowerCase();
            return assignmentLower.includes(categoryLower) || categoryLower.includes(assignmentLower);
        })
    );
    
    if (assignedOperator) {
        order.assignedTo = assignedOperator.id;
        order.operatorName = assignedOperator.name;
        order.operatorPhone = assignedOperator.phone;
    }
}

function showOrderSuccess(order) {
    const successMessage = `
        <div class="order-success">
            <i class="fas fa-check-circle"></i>
            <h3>Order Placed Successfully!</h3>
            <p>Your order has been received and will be processed soon.</p>
            
            <div class="order-summary">
                <p><strong>Order ID:</strong> #${order.id.toString().slice(-6)}</p>
                <p><strong>Product:</strong> ${order.productName}</p>
                <p><strong>Quantity:</strong> ${order.quantity} kg</p>
                <p><strong>Total Amount:</strong> ${formatCurrency(order.total)}</p>
                ${order.operatorName ? `
                    <p><strong>Assigned Operator:</strong> ${order.operatorName}</p>
                    <p><strong>Operator Phone:</strong> ${order.operatorPhone}</p>
                ` : '<p>An operator will be assigned shortly</p>'}
            </div>
            
            <div class="success-actions">
                <button class="btn btn-primary" onclick="closeModal()">
                    Continue Shopping
                </button>
                <button class="btn btn-outline" onclick="navigateToSection('orders')">
                    View Orders
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('orderModalContent').innerHTML = successMessage;
    document.getElementById('orderModal').style.display = 'flex';
}

// Checkout Functions
function proceedToCheckout() {
    if (currentCart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }
    
    const subtotal = calculateSubtotal();
    const millingTotal = calculateMillingTotal();
    const orderTotal = subtotal + millingTotal + 20;
    
    const checkoutHtml = `
        <form id="checkoutForm" onsubmit="placeCartOrder(event)">
            <h3>Checkout</h3>
            
            <div class="order-summary-checkout">
                <h4>Order Summary</h4>
                ${currentCart.map((item, index) => `
                    <div class="checkout-item">
                        <span>${item.name}</span>
                        <span>${item.quantity} kg × ${formatCurrency(item.price)}</span>
                        <span>${formatCurrency(item.quantity * item.price)}</span>
                    </div>
                `).join('')}
                
                <div class="checkout-totals">
                    <div class="checkout-row">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(subtotal)}</span>
                    </div>
                    <div class="checkout-row">
                        <span>Milling Service:</span>
                        <span>${formatCurrency(millingTotal)}</span>
                    </div>
                    <div class="checkout-row">
                        <span>Order Fee:</span>
                        <span>20 Birr</span>
                    </div>
                    <div class="checkout-row total">
                        <span>Total Amount:</span>
                        <span>${formatCurrency(orderTotal)}</span>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="checkoutAddress">Delivery Address *</label>
                <textarea id="checkoutAddress" rows="3" required>${currentCustomer.address || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label for="checkoutPayment">Payment Method *</label>
                <select id="checkoutPayment" required>
                    <option value="">Select Payment Method</option>
                    <option value="cbe">CBE</option>
                    <option value="telebirr">Telebirr</option>
                    <option value="cash">Cash on Delivery</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="checkoutNotes">Order Notes (Optional)</label>
                <textarea id="checkoutNotes" rows="2" placeholder="Any special instructions for your order..."></textarea>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-outline" onclick="closeCheckoutModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-check"></i> Confirm Order
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('checkoutContent').innerHTML = checkoutHtml;
    document.getElementById('checkoutModal').style.display = 'flex';
}

function placeCartOrder(e) {
    e.preventDefault();
    
    const address = document.getElementById('checkoutAddress').value;
    const paymentMethod = document.getElementById('checkoutPayment').value;
    const notes = document.getElementById('checkoutNotes').value;
    
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    const products = usersData.products || [];
    
    // Create orders for each cart item
    const newOrders = [];
    
    currentCart.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.productId);
        if (!product) return;
        
        const productTotal = cartItem.quantity * product.price;
        const millingTotal = cartItem.quantity * (product.millingFee || 0);
        const itemTotal = productTotal + millingTotal + 20; // 20 Birr order fee per item
        
        const newOrder = {
            id: Date.now() + Math.random(), // Unique ID
            customerId: currentCustomer.id,
            customerName: currentCustomer.name,
            customerPhone: currentCustomer.phone,
            productId: product.id,
            productName: product.name,
            quantity: cartItem.quantity,
            pricePerKg: product.price,
            millingFee: product.millingFee || 0,
            total: itemTotal,
            address: address,
            paymentMethod: paymentMethod,
            notes: notes,
            status: 'pending',
            orderDate: new Date().toISOString(),
            type: 'cart'
        };
        
        // Assign to appropriate operator
        assignOrderToOperator(newOrder, product.category);
        
        newOrders.push(newOrder);
        usersData.orders.push(newOrder);
    });
    
    // Save orders
    localStorage.setItem('millUsers', JSON.stringify(usersData));
    
    // Clear cart
    currentCart = [];
    localStorage.setItem(`cart_${currentCustomer.id}`, JSON.stringify([]));
    
    // Update UI
    updateCartCount();
    updateCartDisplay();
    updateCartSummary();
    
    // Close checkout modal
    closeCheckoutModal();
    
    // Show success message
    showCartOrderSuccess(newOrders);
}

function showCartOrderSuccess(orders) {
    const successMessage = `
        <div class="order-success">
            <i class="fas fa-check-circle"></i>
            <h3>${orders.length} Order${orders.length > 1 ? 's' : ''} Placed Successfully!</h3>
            <p>Your order${orders.length > 1 ? 's have' : ' has'} been received and will be processed soon.</p>
            
            <div class="order-summary">
                <p><strong>Total Items:</strong> ${orders.length}</p>
                <p><strong>Total Amount:</strong> ${formatCurrency(orders.reduce((sum, order) => sum + order.total, 0))}</p>
                ${orders[0]?.operatorName ? `
                    <p><strong>Main Operator:</strong> ${orders[0].operatorName}</p>
                    <p>Different operators may be assigned based on product types</p>
                ` : '<p>Operators will be assigned shortly</p>'}
            </div>
            
            <div class="success-actions">
                <button class="btn btn-primary" onclick="closeModal()">
                    Continue Shopping
                </button>
                <button class="btn btn-outline" onclick="navigateToSection('orders')">
                    View Orders
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('orderModalContent').innerHTML = successMessage;
    document.getElementById('orderModal').style.display = 'flex';
}

// Messages Functions
function loadMessagesData() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    currentMessages = usersData.messages || [];
    
    loadMessageContacts();
    updateMessagesBadge();
}

function loadMessageContacts() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const admin = usersData.admin?.[0];
    const operators = usersData.operators || [];
    const contactsList = document.getElementById('messagesContacts');
    
    contactsList.innerHTML = '';
    
    // Add admin
    if (admin) {
        const adminContact = createMessageContact(admin, 'admin');
        contactsList.appendChild(adminContact);
    }
    
    // Add operators the customer has interacted with
    const interactedOperators = getInteractedOperators();
    interactedOperators.forEach(operator => {
        const operatorContact = createMessageContact(operator, 'operator');
        contactsList.appendChild(operatorContact);
    });
}

function getInteractedOperators() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const operators = usersData.operators || [];
    const orders = usersData.orders || [];
    
    // Get operators assigned to customer's orders
    const assignedOperatorIds = orders
        .filter(order => order.customerId === currentCustomer.id && order.assignedTo)
        .map(order => order.assignedTo);
    
    return operators.filter(operator => assignedOperatorIds.includes(operator.id));
}

function createMessageContact(user, type) {
    const messages = currentMessages.filter(msg => 
        (msg.senderId === user.id && msg.receiverId === currentCustomer.id) ||
        (msg.receiverId === user.id && msg.senderId === currentCustomer.id)
    );
    
    const unreadCount = messages.filter(msg => 
        msg.receiverId === currentCustomer.id && !msg.read
    ).length;
    
    const lastMessage = messages[messages.length - 1];
    
    const contactDiv = document.createElement('div');
    contactDiv.className = 'contact-item';
    contactDiv.dataset.userId = user.id;
    contactDiv.dataset.userType = type;
    contactDiv.onclick = () => openMessageChat(user, type);
    
    contactDiv.innerHTML = `
        <div class="contact-avatar">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=${type === 'admin' ? '4CAF50' : '2196F3'}&color=fff" alt="${user.name}">
        </div>
        <div class="contact-info">
            <h4>${user.name}</h4>
            <p>${lastMessage ? (lastMessage.content?.substring(0, 30) + '...' || '') : type === 'admin' ? 'System Admin' : 'Operator'}</p>
        </div>
        ${unreadCount > 0 ? `<div class="unread-indicator"></div>` : ''}
    `;
    
    return contactDiv;
}

function openMessageChat(user, type) {
    // Update chat header
    const chatHeader = document.getElementById('chatHeader');
    chatHeader.innerHTML = `
        <div class="chat-user">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=${type === 'admin' ? '4CAF50' : '2196F3'}&color=fff" alt="${user.name}">
            <div class="chat-user-info">
                <h4>${user.name}</h4>
                <p>${type === 'admin' ? 'System Admin' : 'Operator'}</p>
            </div>
        </div>
    `;
    
    // Load messages
    loadMessageChat(user.id);
    
    // Update info panel
    const infoPanel = document.getElementById('messageInfoPanel');
    infoPanel.innerHTML = `
        <h4>Contact Information</h4>
        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>${type === 'admin' ? 'Email' : 'Phone'}:</strong> ${type === 'admin' ? user.email : user.phone}</p>
        ${user.address ? `<p><strong>Address:</strong> ${user.address}</p>` : ''}
        <button class="btn btn-sm btn-outline btn-block" onclick="startNewOrderWith(${user.id})">
            <i class="fas fa-shopping-cart"></i> New Order with ${type === 'admin' ? 'Admin' : 'Operator'}
        </button>
    `;
    
    // Mark messages as read
    markMessagesAsRead(user.id);
}

function loadMessageChat(userId) {
    const chatMessages = document.getElementById('chatMessages');
    const messages = currentMessages.filter(msg => 
        (msg.senderId === userId && msg.receiverId === currentCustomer.id) ||
        (msg.senderId === currentCustomer.id && msg.receiverId === userId)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    chatMessages.innerHTML = '';
    
    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.senderId === currentCustomer.id ? 'sent' : 'received'}`;
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
        if (msg.receiverId === currentCustomer.id && msg.senderId === userId && !msg.read) {
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
        senderId: currentCustomer.id,
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
    loadMessageChat(currentChatUserId);
    
    showToast('Message sent', 'success');
}

function showNewMessageModal() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const admin = usersData.admin?.[0];
    const operators = getInteractedOperators();
    
    const recipientSelect = document.getElementById('messageTo');
    recipientSelect.innerHTML = '<option value="">Select Recipient</option>';
    
    if (admin) {
        const option = document.createElement('option');
        option.value = admin.id;
        option.textContent = `${admin.name} (Admin)`;
        recipientSelect.appendChild(option);
    }
    
    operators.forEach(operator => {
        const option = document.createElement('option');
        option.value = operator.id;
        option.textContent = `${operator.name} (Operator)`;
        recipientSelect.appendChild(option);
    });
    
    document.getElementById('newMessageModal').style.display = 'flex';
}

function closeNewMessageModal() {
    document.getElementById('newMessageModal').style.display = 'none';
    document.getElementById('newMessageForm').reset();
}

function sendNewMessage(e) {
    e.preventDefault();
    
    const recipientId = document.getElementById('messageTo').value;
    const subject = document.getElementById('messageSubject').value;
    const content = document.getElementById('messageContent').value;
    const messageType = document.getElementById('messageType').value;
    
    if (!recipientId) {
        showToast('Please select a recipient', 'warning');
        return;
    }
    
    const newMessage = {
        id: Date.now(),
        senderId: currentCustomer.id,
        receiverId: recipientId,
        subject: subject,
        content: content,
        type: messageType,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    usersData.messages.push(newMessage);
    localStorage.setItem('millUsers', JSON.stringify(usersData));
    
    closeNewMessageModal();
    showToast('Message sent successfully', 'success');
    
    // Reload messages
    loadMessagesData();
}

function markAllMessagesRead() {
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    
    usersData.messages = usersData.messages.map(msg => {
        if (msg.receiverId === currentCustomer.id && !msg.read) {
            return { ...msg, read: true, readAt: new Date().toISOString() };
        }
        return msg;
    });
    
    localStorage.setItem('millUsers', JSON.stringify(usersData));
    
    updateMessagesBadge();
    loadMessagesData();
    showToast('All messages marked as read', 'success');
}

function startNewOrderWith(userId) {
    showToast('Starting new order with this contact', 'info');
    // Implementation would vary based on requirements
}

function attachImageToMessage() {
    // Create a hidden file input to pick an image
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', async function() {
        const file = this.files && this.files[0];
        if (!file) return;

        // Basic validations
        const maxSize = 2 * 1024 * 1024; // 2 MB
        if (file.size > maxSize) {
            showToast('Image too large (max 2 MB)', 'error');
            return;
        }

        const chatHeader = document.getElementById('chatHeader');
        const currentChatUserId = chatHeader.querySelector('.chat-user')?.dataset?.userId;
        if (!currentChatUserId) {
            showToast('Please select a contact to send the image', 'warning');
            return;
        }

        // Read file as Data URL
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;

            const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
            usersData.messages = usersData.messages || [];

            const newMessage = {
                id: Date.now() + Math.random(),
                senderId: currentCustomer.id,
                receiverId: currentChatUserId,
                content: dataUrl,
                timestamp: new Date().toISOString(),
                read: false,
                type: 'image'
            };

            usersData.messages.push(newMessage);
            localStorage.setItem('millUsers', JSON.stringify(usersData));

            // Refresh UI for messages and chat
            loadMessagesData();
            loadMessageChat(currentChatUserId);

            showToast('Image sent', 'success');
        };

        reader.onerror = function() {
            showToast('Failed to read image file', 'error');
        };

        reader.readAsDataURL(file);
    });

    // Trigger file picker
    document.body.appendChild(fileInput);
    fileInput.click();

    // Clean up after use
    fileInput.addEventListener('blur', () => fileInput.remove());
}

function attachFileToMessage() {
    // Create a hidden file input to pick any file type
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '*/*';
    fileInput.style.display = 'none';

    // Helper to format bytes
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    fileInput.addEventListener('change', function() {
        const file = this.files && this.files[0];
        if (!file) return;

        // Basic validation: limit file size (example: 10 MB)
        const maxSize = 10 * 1024 * 1024; // 10 MB
        if (file.size > maxSize) {
            showToast('File too large (max 10 MB)', 'error');
            return;
        }

        const chatHeader = document.getElementById('chatHeader');
        const currentChatUserId = chatHeader.querySelector('.chat-user')?.dataset?.userId;
        if (!currentChatUserId) {
            showToast('Please select a contact to send the file', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;

            // Create a simple downloadable link as the message content so existing rendering (innerHTML) shows it
            const safeFileName = file.name.replace(/"/g, '');
            const fileLinkHtml = `<a href="${dataUrl}" download="${encodeURIComponent(safeFileName)}" class="file-attachment">${safeFileName} (${formatFileSize(file.size)})</a>`;

            const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
            usersData.messages = usersData.messages || [];

            const newMessage = {
                id: Date.now() + Math.random(),
                senderId: currentCustomer.id,
                receiverId: currentChatUserId,
                content: fileLinkHtml,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                timestamp: new Date().toISOString(),
                read: false,
                type: 'file'
            };

            usersData.messages.push(newMessage);
            localStorage.setItem('millUsers', JSON.stringify(usersData));

            // Refresh messages UI
            loadMessagesData();
            loadMessageChat(currentChatUserId);

            showToast('File sent', 'success');
        };

        reader.onerror = function() {
            showToast('Failed to read file', 'error');
        };

        reader.readAsDataURL(file);
    });

    // Trigger file picker
    document.body.appendChild(fileInput);
    fileInput.click();

    // Clean up after use
    fileInput.addEventListener('blur', () => fileInput.remove());
}

// Settings Functions
function loadSettingsData() {
    // Load profile data
    document.getElementById('fullName').value = currentCustomer.name;
    document.getElementById('email').value = currentCustomer.email;
    document.getElementById('phone').value = currentCustomer.phone || '';
    document.getElementById('backupPhone').value = currentCustomer.backupPhone || '';
    document.getElementById('address').value = currentCustomer.address || '';
    
    // Load payment methods
    loadPaymentMethods();
    
    // Load preferences
    loadPreferences();
}

function loadPaymentMethods() {
    const paymentMethods = currentCustomer.paymentMethods || [];
    const container = document.getElementById('paymentMethods');
    
    container.innerHTML = '';
    
    if (paymentMethods.length === 0) {
        container.innerHTML = '<p>No payment methods saved</p>';
        return;
    }
    
    paymentMethods.forEach((method, index) => {
        const methodDiv = document.createElement('div');
        methodDiv.className = 'payment-method';
        methodDiv.innerHTML = `
            <div class="payment-method-info">
                <div class="payment-method-icon">
                    <i class="fas fa-${method.type === 'cbe' ? 'university' : 'mobile-alt'}"></i>
                </div>
                <div>
                    <h5>${method.type === 'cbe' ? 'CBE' : 'Telebirr'}</h5>
                    <p>${method.accountNumber}</p>
                </div>
            </div>
            <div class="payment-method-actions">
                <button class="btn btn-sm btn-outline" onclick="editPaymentMethod(${index})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePaymentMethod(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(methodDiv);
    });
}

function loadPreferences() {
    const preferences = JSON.parse(localStorage.getItem(`preferences_${currentCustomer.id}`) || '{}');
    
    if (preferences.darkMode !== undefined) {
        // Set all dark-mode checkboxes
        setDarkModeCheckboxes(preferences.darkMode);
        // Apply theme immediately to page and toggle icon so UI matches saved preference
        try {
            const body = document.body;
            const icon = document.querySelector('#darkModeToggle i');
            if (preferences.darkMode) {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
            } else {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                if (icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
            }
        } catch (e) {
            console.warn('Failed to apply dark mode preference', e);
        }
    }
    if (preferences.emailNotifications !== undefined) {
        document.getElementById('emailNotifications').checked = preferences.emailNotifications;
    }
    if (preferences.smsNotifications !== undefined) {
        document.getElementById('smsNotifications').checked = preferences.smsNotifications;
    }
    if (preferences.language) {
        document.getElementById('languagePref').value = preferences.language;
        // Apply language immediately using i18n if available
        try {
            if (window.i18n && typeof window.i18n.setLanguage === 'function') {
                window.i18n.setLanguage(preferences.language);
                if (typeof window.i18n.applyTranslations === 'function') {
                    window.i18n.applyTranslations(preferences.language);
                }
                // refresh current active section to pick up dynamic strings
                const active = document.querySelector('.content-section.active');
                if (active) loadSectionData(active.id);
            }
        } catch (e) {
            console.warn('i18n not available to apply language', e);
        }
    }
    if (preferences.fontSize) {
        document.getElementById('fontSize').value = preferences.fontSize;
        document.getElementById('fontSizeValue').textContent = `${preferences.fontSize}px`;
    }
}
const fontSlider = document.getElementById('fontSize');
if (fontSlider) {
  fontSlider.addEventListener('input', e => {
    const v = parseInt(e.target.value, 10) || 16;
    document.documentElement.style.fontSize = `${v}px`;
    document.getElementById('fontSizeValue').textContent = `${v}px`;
  });
}
function saveProfileSettings(e) {
    e.preventDefault();
    
    // If the settings avatar image was changed via the UI, read its src
    const settingsAvatarEl = document.getElementById('settingsAvatar');
    const selectedProfilePicture = (settingsAvatarEl && settingsAvatarEl.src) ? settingsAvatarEl.src : (currentCustomer && currentCustomer.profilePicture) || '';

    const updatedCustomer = {
        ...currentCustomer,
        name: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        backupPhone: document.getElementById('backupPhone').value,
        address: document.getElementById('address').value,
        profilePicture: selectedProfilePicture
    };
    
    // Update in users data (handle missing/empty localStorage safely)
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    usersData.customers = usersData.customers || [];
    const customerIndex = usersData.customers.findIndex(c => c.id === currentCustomer.id);

    if (customerIndex !== -1) {
        usersData.customers[customerIndex] = updatedCustomer;
    } else {
        // If customer record doesn't exist for some reason, add it
        usersData.customers.push(updatedCustomer);
    }

    // Persist changes and update current session
    localStorage.setItem('millUsers', JSON.stringify(usersData));
    currentCustomer = updatedCustomer;
    localStorage.setItem('currentUser', JSON.stringify(currentCustomer));

    // Update UI
    loadCustomerData();
    showToast('Profile updated successfully!', 'success');
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
    
    if (currentPassword !== currentCustomer.password) {
        showToast('Current password is incorrect', 'error');
        return;
    }
    
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    const customerIndex = usersData.customers.findIndex(c => c.id === currentCustomer.id);
    
    if (customerIndex !== -1) {
        usersData.customers[customerIndex].password = newPassword;
        localStorage.setItem('millUsers', JSON.stringify(usersData));
        
        // Update current customer
        currentCustomer.password = newPassword;
        localStorage.setItem('currentUser', JSON.stringify(currentCustomer));
        
        showToast('Password changed successfully!', 'success');
        document.getElementById('securityForm').reset();
    }
}

function addPaymentMethod() {
    const methodType = prompt('Enter payment method type (cbe or telebirr):');
    const accountNumber = prompt('Enter account number:');
    
    if (!methodType || !accountNumber) {
        showToast('Please enter both fields', 'warning');
        return;
    }
    
    if (!['cbe', 'telebirr'].includes(methodType.toLowerCase())) {
        showToast('Invalid payment method type', 'error');
        return;
    }
    
    const newMethod = {
        type: methodType.toLowerCase(),
        accountNumber: accountNumber,
        addedAt: new Date().toISOString()
    };
    
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    const customerIndex = usersData.customers.findIndex(c => c.id === currentCustomer.id);
    
    if (customerIndex !== -1) {
        if (!usersData.customers[customerIndex].paymentMethods) {
            usersData.customers[customerIndex].paymentMethods = [];
        }
        usersData.customers[customerIndex].paymentMethods.push(newMethod);
        
        localStorage.setItem('millUsers', JSON.stringify(usersData));
        
        // Update current customer
        currentCustomer = usersData.customers[customerIndex];
        localStorage.setItem('currentUser', JSON.stringify(currentCustomer));
        
        loadPaymentMethods();
        showToast('Payment method added successfully!', 'success');
    }
}

function editPaymentMethod(index) {
    const method = currentCustomer.paymentMethods[index];
    const newAccountNumber = prompt('Enter new account number:', method.accountNumber);
    
    if (newAccountNumber && newAccountNumber !== method.accountNumber) {
        const usersData = JSON.parse(localStorage.getItem('millUsers'));
        const customerIndex = usersData.customers.findIndex(c => c.id === currentCustomer.id);
        
        if (customerIndex !== -1) {
            usersData.customers[customerIndex].paymentMethods[index].accountNumber = newAccountNumber;
            localStorage.setItem('millUsers', JSON.stringify(usersData));
            
            currentCustomer = usersData.customers[customerIndex];
            localStorage.setItem('currentUser', JSON.stringify(currentCustomer));
            
            loadPaymentMethods();
            showToast('Payment method updated!', 'success');
        }
    }
}

function deletePaymentMethod(index) {
    if (!confirm('Are you sure you want to delete this payment method?')) {
        return;
    }
    
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    const customerIndex = usersData.customers.findIndex(c => c.id === currentCustomer.id);
    
    if (customerIndex !== -1) {
        usersData.customers[customerIndex].paymentMethods.splice(index, 1);
        localStorage.setItem('millUsers', JSON.stringify(usersData));
        
        currentCustomer = usersData.customers[customerIndex];
        localStorage.setItem('currentUser', JSON.stringify(currentCustomer));
        
        loadPaymentMethods();
        showToast('Payment method deleted!', 'success');
    }
}

function savePreferences() {
    // Read dark mode from any dark-mode-pref control if present
    const darkEls = Array.from(document.querySelectorAll('.dark-mode-pref'));
    const darkModeValue = darkEls.length ? !!darkEls[0].checked : !!(document.getElementById('darkModePref') && document.getElementById('darkModePref').checked);

    const preferences = {
        darkMode: darkModeValue,
        emailNotifications: document.getElementById('emailNotifications').checked,
        smsNotifications: document.getElementById('smsNotifications').checked,
        language: document.getElementById('languagePref').value,
        fontSize: parseInt(document.getElementById('fontSize').value)
    };
    
    localStorage.setItem(`preferences_${currentCustomer.id}`, JSON.stringify(preferences));

    // Apply font size
    document.documentElement.style.fontSize = `${preferences.fontSize}px`;
    // Persist theme selection globally and ensure UI matches; update all checkbox controls
    try {
        const body = document.body;
        const icon = document.querySelector('#darkModeToggle i');
        if (preferences.darkMode) {
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
        } else {
            body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            if (icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
        }
        setDarkModeCheckboxes(preferences.darkMode);
    } catch (e) {
        console.warn('Failed to apply theme while saving preferences', e);
    }
    // Apply language immediately if i18n is available
    try {
        if (window.i18n && typeof window.i18n.setLanguage === 'function') {
            window.i18n.setLanguage(preferences.language);
            if (typeof window.i18n.applyTranslations === 'function') {
                window.i18n.applyTranslations(preferences.language);
            }
            const active = document.querySelector('.content-section.active');
            if (active) loadSectionData(active.id);
        }
    } catch (e) {
        console.warn('i18n not available to apply language', e);
    }
    
    showToast('Preferences saved!', 'success');
}

function changeProfilePicture() {
    // Create hidden file input for image selection
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', function() {
        const file = this.files && this.files[0];
        if (!file) return;

        // Validate size (2 MB) and basic type
        const maxSize = 2 * 1024 * 1024; // 2 MB
        if (file.size > maxSize) {
            showToast('Image too large (max 2 MB)', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;

            // Update DOM avatars if present
            const settingsAvatar = document.getElementById('settingsAvatar');
            const headerAvatar = document.getElementById('customerAvatar');
            if (settingsAvatar) settingsAvatar.src = dataUrl;
            if (headerAvatar) headerAvatar.src = dataUrl;

            // Persist to localStorage: update millUsers.customers and currentUser
            const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
            usersData.customers = usersData.customers || [];

            const customerIndex = usersData.customers.findIndex(c => c.id === currentCustomer?.id);

            const updatedRecord = {
                ...(customerIndex !== -1 ? usersData.customers[customerIndex] : currentCustomer || {}),
                profilePicture: dataUrl
            };

            if (customerIndex !== -1) {
                usersData.customers[customerIndex] = updatedRecord;
            } else {
                usersData.customers.push(updatedRecord);
            }

            localStorage.setItem('millUsers', JSON.stringify(usersData));

            // Update current session user
            currentCustomer = { ...(currentCustomer || {}), profilePicture: dataUrl };
            localStorage.setItem('currentUser', JSON.stringify(currentCustomer));

            showToast('Profile picture updated', 'success');
        };

        reader.onerror = function() {
            showToast('Failed to read image file', 'error');
        };

        reader.readAsDataURL(file);
    });

    // Trigger the file picker
    document.body.appendChild(fileInput);
    fileInput.click();

    // Cleanup
    fileInput.addEventListener('blur', () => fileInput.remove());
}

function removeProfilePicture() {
    const defaultAvatar = 'https://ui-avatars.com/api/?name=Customer&background=FF9800&color=fff';
    const settingsAvatarEl = document.getElementById('settingsAvatar');
    const headerAvatarEl = document.getElementById('customerAvatar');

    if (settingsAvatarEl) settingsAvatarEl.src = defaultAvatar;
    if (headerAvatarEl) headerAvatarEl.src = defaultAvatar;

    // Persist removal in millUsers and currentUser
    try {
        const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
        usersData.customers = usersData.customers || [];
        const idx = usersData.customers.findIndex(c => c.id === currentCustomer?.id);
        if (idx !== -1) {
            delete usersData.customers[idx].profilePicture;
        }
        localStorage.setItem('millUsers', JSON.stringify(usersData));

        if (currentCustomer && currentCustomer.profilePicture) {
            delete currentCustomer.profilePicture;
            localStorage.setItem('currentUser', JSON.stringify(currentCustomer));
        }
    } catch (e) {
        console.warn('Failed to persist profile picture removal', e);
    }

    showToast('Profile picture removed', 'success');
}

function showLoginHistory() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');

    // Try multiple places where login events might be stored
    let history = [];
    if (Array.isArray(usersData.loginHistory)) {
        history = usersData.loginHistory.filter(h => h.userId === currentCustomer?.id);
    } else if (currentCustomer && Array.isArray(currentCustomer.loginHistory)) {
        history = currentCustomer.loginHistory;
    } else if (Array.isArray(usersData.sessions)) {
        history = usersData.sessions.filter(s => s.userId === currentCustomer?.id);
    }

    const modalContentEl = document.getElementById('orderModalContent');
    if (!modalContentEl) return showToast('Unable to display login history', 'error');

    const sorted = history.slice().sort((a, b) => new Date(b.at || b.timestamp) - new Date(a.at || a.timestamp));

    const entriesHtml = sorted.length ? sorted.map(entry => {
        const when = formatDate(entry.at || entry.timestamp) + ' ' + formatTime(entry.at || entry.timestamp);
        const parts = [];
        if (entry.ip) parts.push(`IP: ${entry.ip}`);
        if (entry.device) parts.push(entry.device);
        if (entry.location) parts.push(entry.location);
        const meta = parts.join(' • ');

        return `
            <div class="login-entry">
                <div class="login-time">${when}</div>
                ${meta ? `<div class="login-meta">${meta}</div>` : ''}
            </div>
        `;
    }).join('') : '<p>No login history found for this account.</p>';

    modalContentEl.innerHTML = `
        <div class="login-history">
            <h3>Login History</h3>
            <div class="login-history-list">${entriesHtml}</div>

            <div class="form-actions" style="margin-top:16px; display:flex; gap:8px;">
                <button class="btn btn-outline" onclick="closeOrderModal()">Close</button>
                ${sorted.length ? '<button class="btn btn-danger" onclick="clearLoginHistory()">Clear History</button>' : ''}
            </div>
        </div>
    `;

    document.getElementById('orderModal').style.display = 'flex';
}

function clearLoginHistory() {
    if (!confirm('Are you sure you want to clear your login history? This cannot be undone.')) return;

    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');

    // Remove from shared loginHistory array if present
    if (Array.isArray(usersData.loginHistory)) {
        usersData.loginHistory = usersData.loginHistory.filter(h => h.userId !== currentCustomer?.id);
    }

    // Remove per-customer history stored on the customer record
    if (Array.isArray(usersData.customers)) {
        const idx = usersData.customers.findIndex(c => c.id === currentCustomer?.id);
        if (idx !== -1 && usersData.customers[idx].loginHistory) {
            delete usersData.customers[idx].loginHistory;
        }
    }

    // Remove from sessions array if present
    if (Array.isArray(usersData.sessions)) {
        usersData.sessions = usersData.sessions.filter(s => s.userId !== currentCustomer?.id);
    }

    // Update localStorage
    localStorage.setItem('millUsers', JSON.stringify(usersData));

    // Update currentUser stored copy
    if (currentCustomer && currentCustomer.loginHistory) {
        delete currentCustomer.loginHistory;
        localStorage.setItem('currentUser', JSON.stringify(currentCustomer));
    }

    showToast('Login history cleared', 'success');
    // Close the modal
    if (document.getElementById('orderModal')) document.getElementById('orderModal').style.display = 'none';
}

function logoutOtherSessions() {
    showToast('Other sessions logged out', 'success');
}

// Notification Functions
function loadNotifications(data) {
    const messages = data.messages || [];
    const orders = data.orders || [];
    
    currentNotifications = [];
    
    // Unread messages
    const unreadMessages = messages.filter(msg => 
        msg.receiverId === currentCustomer.id && !msg.read
    );
    
    unreadMessages.forEach(msg => {
        currentNotifications.push({
            type: 'message',
            title: 'New Message',
            content: `From: ${msg.senderId === currentCustomer.id ? 'You' : 'Sender'}`,
            time: formatTime(msg.timestamp),
            read: false,
            data: msg
        });
    });
    
    // Order updates
    const recentOrders = orders
        .filter(order => 
            order.customerId === currentCustomer.id &&
            new Date(order.updatedAt || order.orderDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        )
        .sort((a, b) => new Date(b.updatedAt || b.orderDate) - new Date(a.updatedAt || a.orderDate))
        .slice(0, 10);
    
    recentOrders.forEach(order => {
        currentNotifications.push({
            type: 'order',
            title: 'Order Update',
            content: `Order #${order.id.toString().slice(-6)} is ${order.status}`,
            time: formatTime(order.updatedAt || order.orderDate),
            read: true,
            data: order
        });
    });
    
    // Update notification badge
    const unreadCount = currentNotifications.filter(n => !n.read).length;
    document.getElementById('notificationCount').textContent = unreadCount;
}

function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
        displayNotifications();
    }
}

function displayNotifications() {
    const list = document.getElementById('notificationsList');
    list.innerHTML = '';
    
    if (currentNotifications.length === 0) {
        list.innerHTML = '<p class="text-center">No notifications</p>';
        return;
    }
    
    currentNotifications.forEach((notification, index) => {
        const item = document.createElement('div');
        item.className = `notification-item ${notification.read ? '' : 'unread'}`;
        item.onclick = () => handleNotificationClick(notification);
        
        item.innerHTML = `
            <div class="notification-content">
                <p><strong>${notification.title}</strong></p>
                <p>${notification.content}</p>
            </div>
            <div class="notification-time">${notification.time}</div>
        `;
        list.appendChild(item);
    });
}

function handleNotificationClick(notification) {
    if (!notification.read) {
        // Mark as read
        notification.read = true;
        
        if (notification.type === 'message') {
            // Mark message as read
            const usersData = JSON.parse(localStorage.getItem('millUsers'));
            const messageIndex = usersData.messages.findIndex(m => m.id === notification.data.id);
            
            if (messageIndex !== -1) {
                usersData.messages[messageIndex].read = true;
                usersData.messages[messageIndex].readAt = new Date().toISOString();
                localStorage.setItem('millUsers', JSON.stringify(usersData));
            }
        }
        
        // Update UI
        displayNotifications();
        updateMessagesBadge();
    }
    
    // Navigate based on notification type
    switch(notification.type) {
        case 'message':
            navigateToSection('messages');
            break;
        case 'order':
            navigateToSection('orders');
            break;
    }
    
    closeNotificationPanel();
}

function closeNotificationPanel() {
    document.getElementById('notificationPanel').style.display = 'none';
}

function updateMessagesBadge() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const messages = usersData.messages || [];
    
    const unreadCount = messages.filter(msg => 
        msg.receiverId === currentCustomer.id && !msg.read
    ).length;
    
    document.getElementById('notificationCount').textContent = unreadCount;
}

// Utility Functions
// Set all dark-mode checkbox elements to the given boolean value
function setDarkModeCheckboxes(value) {
    try {
        const els = Array.from(document.querySelectorAll('.dark-mode-pref'));
        if (els.length === 0) {
            const single = document.getElementById('darkModePref');
            if (single) els.push(single);
        }
        els.forEach(el => { el.checked = !!value; });
    } catch (e) {
        console.warn('Failed to set dark mode checkboxes', e);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-ET', {
        style: 'currency',
        currency: 'ETB',
        minimumFractionDigits: 2
    }).format(amount);
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

function initializeDropdowns() {
    // Handle dropdown menus
    document.querySelectorAll('.dropdown-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = this.nextElementSibling;
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
    });
    
    // Close dropdowns when clicking outside
    window.addEventListener('click', function() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    });

    // Ensure dropdown menu links navigate to sections and close the menu
    document.querySelectorAll('.dropdown-menu a').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href') || '';
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = href.substring(1);
                // Navigate to the section if it exists
                navigateToSection(target);

                // Close all dropdowns
                document.querySelectorAll('.dropdown-menu').forEach(menu => menu.style.display = 'none');
            }
        });
    });
}

function initializeDarkMode() {
    // Prefer per-user preference if available, otherwise fall back to global 'theme'
    let savedTheme = localStorage.getItem('theme');
    const darkModeBtn = document.getElementById('darkModeToggle');
    try {
        if (currentCustomer && currentCustomer.id) {
            const prefs = JSON.parse(localStorage.getItem(`preferences_${currentCustomer.id}`) || '{}');
            if (prefs.darkMode !== undefined) {
                savedTheme = prefs.darkMode ? 'dark' : 'light';
            }
        }
    } catch (e) {
        console.warn('Failed to read user preferences for theme', e);
    }

    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        // Update checkbox controls
        setDarkModeCheckboxes(true);
        if (darkModeBtn) {
            const icon = darkModeBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    } else {
        // Ensure default/light state
        setDarkModeCheckboxes(false);
        document.body.removeAttribute('data-theme');
        if (darkModeBtn) {
            const icon = darkModeBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
    }
}

function toggleDarkMode() {
    const body = document.body;
    const icon = document.querySelector('#darkModeToggle i');
    
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
    // Keep user preferences in sync with manual toggle
    try {
        if (currentCustomer && currentCustomer.id) {
            const key = `preferences_${currentCustomer.id}`;
            const prefs = JSON.parse(localStorage.getItem(key) || '{}');
            prefs.darkMode = !!(body.getAttribute('data-theme') === 'dark');
            localStorage.setItem(key, JSON.stringify(prefs));

            // Update settings checkbox(es) if present
            setDarkModeCheckboxes(prefs.darkMode);
        }
    } catch (e) {
        console.warn('Failed to persist dark mode preference', e);
    }
}

function logoutCustomer() {
    localStorage.removeItem('currentUser');
    window.location.href = '../index.html';
}

function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
}

function startAutoRefresh() {
    // Auto-refresh dashboard every 2 minutes
    setInterval(() => {
        if (document.querySelector('.content-section.active')) {
            const activeSection = document.querySelector('.content-section.active').id;
            loadSectionData(activeSection);
        }
    }, 120000);
}

// Initialize
window.addEventListener('load', function() {
    // Check for saved preferences
    const preferences = JSON.parse(localStorage.getItem(`preferences_${currentCustomer?.id}`) || '{}');
    
    if (preferences.fontSize) {
        document.documentElement.style.fontSize = `${preferences.fontSize}px`;
        document.getElementById('fontSize').value = preferences.fontSize;
        document.getElementById('fontSizeValue').textContent = `${preferences.fontSize}px`;
    }
    
    if (preferences.language) {
        document.getElementById('languagePref').value = preferences.language;
    }
});
// Function to create product card HTML from admin data
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = `product-card ${product.stock === 0 ? 'out-of-stock' : ''}`;
    card.setAttribute('data-category', product.category);
    card.setAttribute('data-id', product.id);
    
    // Set background image if provided
    if (product.imageUrl) {
        card.style.backgroundImage = `linear-gradient(135deg, 
            rgba(0, 0, 0, 0.6) 0%, 
            rgba(0, 0, 0, 0.3) 100%),
            url('${product.imageUrl}')`;
    }
    
    const stockStatus = product.stock === 0 ? 'out' : product.stock < 10 ? 'low' : '';
    
    card.innerHTML = `
        <div class="category-badge">${product.category.toUpperCase()}</div>
        
        ${product.isNew ? '<div class="status-badge">NEW</div>' : ''}
        ${product.onSale ? '<div class="sale-badge">SALE</div>' : ''}
        
        <div class="product-image-container">
            <img src="${product.imageUrl || 'default-image.jpg'}" alt="${product.name}" class="product-image">
        </div>
        
        <div class="quick-view-overlay">
            <button class="quick-view-btn" onclick="showQuickView('${product.id}')">
                Quick View
            </button>
        </div>
        
        <div class="product-content">
            <div class="product-type">${product.type || product.category}</div>
            <h3 class="product-name">${product.name}</h3>
            
            <div class="product-rating">
                <div class="rating-stars">
                    ${getStarRating(product.rating)}
                </div>
                <span class="rating-count">(${product.reviewCount || 0})</span>
            </div>
            
            <p class="product-description">${product.description}</p>
            
            <div class="product-details">
                <div class="detail-item">
                    <i class="fas fa-weight"></i>
                    <span>${product.weight || '1kg'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-certificate"></i>
                    <span>${product.quality || 'Grade A'}</span>
                </div>
                <div class="stock-status ${stockStatus}">
                    ${getStockText(product.stock)}
                </div>
            </div>
            
            <div class="price-section">
                <span class="current-price">$${product.price}</span>
                ${product.originalPrice ? 
                    `<span class="original-price">$${product.originalPrice}</span>` : ''}
                <span class="price-unit">/${product.unit || 'kg'}</span>
            </div>
            
            <div class="product-actions">
                <button class="action-btn" onclick="addToCart('${product.id}')">
                    ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button class="favorite-btn" onclick="toggleFavorite('${product.id}')">
                    <i class="fas fa-heart"></i>
                </button>
                
                ${product.stock > 0 ? `
                    <div class="quantity-controls">
                        <button class="qty-btn minus" onclick="updateQuantity('${product.id}', -1)">-</button>
                        <input type="text" class="qty-input" value="1" readonly>
                        <button class="qty-btn plus" onclick="updateQuantity('${product.id}', 1)">+</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    return card;
}

// Helper functions
function getStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (halfStar) stars += '½';
    
    return stars.padEnd(5, '☆');
}

function getStockText(stock) {
    if (stock === 0) return 'Out of Stock';
    if (stock < 10) return `Only ${stock} left`;
    return 'In Stock';
}

// Example product data structure from admin
const productData = {
    id: 'prod_001',
    name: 'Organic Whole Wheat',
    category: 'grain', // grain, legume, or other
    type: 'WHEAT',
    description: 'Premium organic wheat for baking and cooking',
    price: 24.99,
    originalPrice: 29.99, // optional for sale items
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
    stock: 25,
    quality: 'Grade A',
    weight: '1kg',
    unit: 'kg',
    isNew: true,
    onSale: true,
    rating: 4.5,
    reviewCount: 128
};

// Add event listeners for card interactions
document.addEventListener('DOMContentLoaded', function() {
    // Handle favorite button clicks
    document.addEventListener('click', function(e) {
        if (e.target.closest('.favorite-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.favorite-btn');
            btn.classList.toggle('active');
        }
        
        // Handle buy button clicks
        if (e.target.closest('.action-btn')) {
            const btn = e.target.closest('.action-btn');
            if (!btn.textContent.includes('Out of Stock')) {
                btn.classList.add('added-to-cart');
                btn.textContent = 'ADDED ✓';
                
                setTimeout(() => {
                    btn.classList.remove('added-to-cart');
                    btn.textContent = 'Add to Cart';
                }, 1500);
            }
        }
    });
});
// Make functions globally available
window.navigateToSection = navigateToSection;
window.showOrderForm = showOrderForm;
window.addToCart = addToCart;
window.toggleSaveItem = toggleSaveItem;
window.updateCartQuantity = updateCartQuantity;
window.updateCartQuantityInput = updateCartQuantityInput;
window.removeFromCart = removeFromCart;
window.moveToSaved = moveToSaved;
window.moveToCartFromSaved = moveToCartFromSaved;
window.removeFromSaved = removeFromSaved;
window.viewOrderDetails = viewOrderDetails;
window.contactOperator = contactOperator;
window.cancelOrder = cancelOrder;
window.calculateSpecialOrder = calculateSpecialOrder;
window.placeSpecialOrder = placeSpecialOrder;
window.closeOrderModal = closeOrderModal;
window.closeCheckoutModal = closeCheckoutModal;
window.proceedToCheckout = proceedToCheckout;
window.showNewMessageModal = showNewMessageModal;
window.closeNewMessageModal = closeNewMessageModal;
window.sendMessage = sendMessage;
window.markAllMessagesRead = markAllMessagesRead;
window.attachImageToMessage = attachImageToMessage;
window.attachFileToMessage = attachFileToMessage;
window.saveProfileSettings = saveProfileSettings;
window.changePassword = changePassword;
window.addPaymentMethod = addPaymentMethod;
window.editPaymentMethod = editPaymentMethod;
window.deletePaymentMethod = deletePaymentMethod;
window.savePreferences = savePreferences;
window.changeProfilePicture = changeProfilePicture;
window.removeProfilePicture = removeProfilePicture;
window.showLoginHistory = showLoginHistory;
window.logoutOtherSessions = logoutOtherSessions;
window.closeNotificationPanel = closeNotificationPanel;