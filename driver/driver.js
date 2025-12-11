// Driver Portal JavaScript

// Global Variables
let currentDriver = null;
let currentOrder = null;
let map = null;
let marker = null;
let signatureCanvas = null;
let signatureContext = null;
let isDrawing = false;
let activeChatRecipient = null;
let chatMessages = [];

// Initialize Driver Portal
document.addEventListener("DOMContentLoaded", function () {
    // Check authentication
    checkDriverAuth();
    
    // Initialize the portal
    initializeDriverPortal();
});

function checkDriverAuth() {
    const driverData = localStorage.getItem("currentUser");
    if (!driverData) {
        window.location.href = "../index.html";
        return;
    }

    const user = JSON.parse(driverData);
    if (user.role !== "driver") {
        window.location.href = "../index.html";
        return;
    }

    currentDriver = user;
    console.log("Driver authenticated:", currentDriver);
}

function initializeDriverPortal() {
    // Load driver data
    loadDriverData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize components
    initializeComponents();
    
    // Load dashboard data
    loadDashboardData();
    
    // Update UI
    updateDriverStatus();
    updateNotificationCounts();
    
    // Start periodic updates
    startPeriodicUpdates();
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById("loadingScreen").style.display = "none";
    }, 1000);
}

function loadDriverData() {
    if (currentDriver) {
        // Update UI elements
        document.getElementById("driverName").textContent = currentDriver.name || "Driver";
        document.getElementById("driverEmail").textContent = currentDriver.email || "driver@email.com";
        document.getElementById("driverNameInput").value = currentDriver.name || "";
        document.getElementById("driverEmailInput").value = currentDriver.email || "";
        document.getElementById("driverPhone").value = currentDriver.phone || "";
        document.getElementById("driverVehicle").value = currentDriver.vehicle || "truck";
        document.getElementById("driverLicense").value = currentDriver.license || "";
        document.getElementById("driverAddress").value = currentDriver.address || "";
        
        // Load driver avatar
        if (currentDriver.avatar) {
            document.getElementById("driverAvatar").src = currentDriver.avatar;
            document.getElementById("avatarPreview").src = currentDriver.avatar;
        }
        
        // Load notification preferences
        if (currentDriver.notifications) {
            document.getElementById("notifyNewOrders").checked = currentDriver.notifications.newOrders || true;
            document.getElementById("notifyMessages").checked = currentDriver.notifications.messages || true;
            document.getElementById("notifyStatusUpdates").checked = currentDriver.notifications.statusUpdates || false;
            document.getElementById("notifyAnnouncements").checked = currentDriver.notifications.announcements || true;
        }
        
        // Load driver status
        if (currentDriver.status) {
            document.getElementById("statusSelect").value = currentDriver.status;
            updateDriverStatus();
        }
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const sectionId = this.getAttribute("href").substring(1);
            navigateToSection(sectionId);
            
            // Update active nav link
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            this.classList.add("active");
        });
    });
    
    // Sidebar toggle
    document.getElementById("sidebarToggle").addEventListener("click", function () {
        document.querySelector(".sidebar").classList.toggle("active");
    });
    
    // Dark mode toggle
    document.getElementById("darkModeToggle").addEventListener("click", toggleDarkMode);
    
    // Driver status selector
    document.getElementById("statusSelect").addEventListener("change", updateDriverStatus);
    
    // Logout
    document.getElementById("logoutBtn").addEventListener("click", logoutDriver);
    
    // Refresh buttons
    document.getElementById("refreshDashboard").addEventListener("click", loadDashboardData);
    document.getElementById("refreshOrders").addEventListener("click", loadNewOrders);
    document.getElementById("refreshMessages").addEventListener("click", loadMessages);
    
    // Order actions
    document.addEventListener("click", function (e) {
        if (e.target.closest(".view-order-details")) {
            const orderId = e.target.closest(".view-order-details").dataset.orderId;
            viewOrderDetails(orderId);
        }
        
        if (e.target.closest(".accept-order")) {
            const orderId = e.target.closest(".accept-order").dataset.orderId;
            acceptOrder(orderId);
        }
        
        if (e.target.closest(".reject-order")) {
            const orderId = e.target.closest(".reject-order").dataset.orderId;
            rejectOrder(orderId);
        }
    });
    
    // Status update
    document.getElementById("updateStatusBtn").addEventListener("click", updateCurrentOrderStatus);
    
    // Photo upload
    document.getElementById("browsePhotos").addEventListener("click", () => {
        document.getElementById("photoUpload").click();
    });
    
    document.getElementById("photoUpload").addEventListener("change", handlePhotoUpload);
    document.getElementById("photoDropZone").addEventListener("dragover", handleDragOver);
    document.getElementById("photoDropZone").addEventListener("drop", handleDrop);
    
    // Signature canvas
    signatureCanvas = document.getElementById("signatureCanvas");
    signatureContext = signatureCanvas.getContext("2d");
    initializeSignatureCanvas();
    
    document.getElementById("clearSignature").addEventListener("click", clearSignature);
    document.getElementById("saveSignature").addEventListener("click", saveSignature);
    
    // Delivery form
    document.getElementById("deliveryForm").addEventListener("submit", handleDeliveryForm);
    document.getElementById("clearPod").addEventListener("click", clearProofOfDelivery);
    
    // Rating stars
    document.querySelectorAll(".rating-stars i").forEach(star => {
        star.addEventListener("click", function () {
            const rating = this.dataset.rating;
            setRating(rating);
        });
    });
    
    // Communication
    document.getElementById("sendMessage").addEventListener("click", sendMessage);
    document.getElementById("messageInput").addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });
    
    document.getElementById("callOperator").addEventListener("click", callOperator);
    document.getElementById("messageOperator").addEventListener("click", messageOperator);
    document.getElementById("callCustomer").addEventListener("click", callCustomer);
    document.getElementById("callSupport").addEventListener("click", callSupport);
    document.getElementById("clearChat").addEventListener("click", clearChat);
    
    // Settings
    document.getElementById("profileForm").addEventListener("submit", saveProfileSettings);
    document.getElementById("passwordForm").addEventListener("submit", changePassword);
    document.getElementById("saveNotifications").addEventListener("click", saveNotificationSettings);
    document.getElementById("browseAvatar").addEventListener("click", () => {
        document.getElementById("avatarUpload").click();
    });
    document.getElementById("avatarUpload").addEventListener("change", handleAvatarUpload);
    document.getElementById("removeAvatar").addEventListener("click", removeAvatar);
    
    // Notifications
    document.getElementById("notificationBtn").addEventListener("click", showNotifications);
    
    // Modals
    document.querySelectorAll(".close-modal").forEach(btn => {
        btn.addEventListener("click", function () {
            this.closest(".modal").style.display = "none";
        });
    });
    
    window.addEventListener("click", function (e) {
        if (e.target.classList.contains("modal")) {
            e.target.style.display = "none";
        }
    });
}

function initializeComponents() {
    // Initialize Google Maps
    initializeMap();
    
    // Initialize signature canvas
    initializeSignatureCanvas();
    
    // Load current order if exists
    loadCurrentOrder();
    
    // Load new orders
    loadNewOrders();
    
    // Load messages
    loadMessages();
    
    // Check for dark mode
    checkTheme();
}

function navigateToSection(sectionId) {
    // Hide all sections
    document.querySelectorAll(".content-section").forEach(section => {
        section.classList.remove("active");
    });
    
    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add("active");
        
        // Update page title
        const titles = {
            dashboard: "Driver Dashboard",
            newOrders: "New Assigned Orders",
            currentOrder: "Current Order Status",
            proofDelivery: "Proof of Delivery",
            communication: "Communication",
            settings: "Driver Settings"
        };
        document.getElementById("pageTitle").textContent = titles[sectionId] || "Driver Portal";
        
        // Section-specific initializations
        switch(sectionId) {
            case "dashboard":
                loadDashboardData();
                break;
            case "newOrders":
                loadNewOrders();
                break;
            case "currentOrder":
                updateProgressTimeline();
                break;
            case "proofDelivery":
                updatePODOrderInfo();
                break;
            case "communication":
                loadMessages();
                break;
        }
    }
}

// Google Maps Functions
function initializeMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;
    
    // Default to Addis Ababa if no location available
    const defaultLocation = { lat: 9.032, lng: 38.74 };
    
    map = new google.maps.Map(mapElement, {
        center: defaultLocation,
        zoom: 12,
        mapTypeId: 'roadmap',
        styles: [
            {
                "featureType": "all",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#7c93a3"}]
            },
            {
                "featureType": "poi.park",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#a8d08d"}]
            }
        ]
    });
    
    // Try to get current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                map.setCenter(pos);
                
                // Add marker
                marker = new google.maps.Marker({
                    position: pos,
                    map: map,
                    title: "Your Location",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#2196F3",
                        fillOpacity: 1,
                        strokeColor: "#FFFFFF",
                        strokeWeight: 2
                    }
                });
                
                // Add info window
                const infoWindow = new google.maps.InfoWindow({
                    content: `<div style="padding: 10px;">
                        <strong>Your Location</strong><br>
                        Latitude: ${pos.lat.toFixed(6)}<br>
                        Longitude: ${pos.lng.toFixed(6)}
                    </div>`
                });
                
                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });
            },
            () => {
                // Use default location if geolocation fails
                handleLocationError(true);
            }
        );
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false);
    }
    
    // Center map button
    document.getElementById("centerMap").addEventListener("click", centerMap);
}

function handleLocationError(browserHasGeolocation) {
    const defaultLocation = { lat: 9.032, lng: 38.74 };
    map.setCenter(defaultLocation);
    
    marker = new google.maps.Marker({
        position: defaultLocation,
        map: map,
        title: "Default Location"
    });
    
    console.log(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
}

function centerMap() {
    if (marker && marker.getPosition()) {
        map.panTo(marker.getPosition());
        map.setZoom(15);
    } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.panTo(pos);
                map.setZoom(15);
            },
            () => {
                showToast("Unable to get current location", "error");
            }
        );
    }
}

// Dashboard Functions
function loadDashboardData() {
    // Load statistics from localStorage
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const orders = usersData.orders || [];
    const drivers = usersData.drivers || [];
    
    // Get current driver's orders
    const driverOrders = orders.filter(order => 
        order.driverId === currentDriver.id
    );
    
    // Calculate stats
    const totalOrders = driverOrders.length;
    const deliveredOrders = driverOrders.filter(o => o.status === "delivered" || o.status === "completed").length;
    const activeOrders = driverOrders.filter(o => 
        ["accepted", "processing", "on_the_way", "arrived"].includes(o.status)
    ).length;
    
    // Calculate earnings (assuming 10% commission on order total)
    const totalEarnings = driverOrders.reduce((sum, order) => {
        if (order.status === "delivered" || order.status === "completed") {
            return sum + (order.total * 0.1); // 10% commission
        }
        return sum;
    }, 0);
    
    // Update UI
    document.getElementById("totalOrders").textContent = totalOrders;
    document.getElementById("deliveredOrders").textContent = deliveredOrders;
    document.getElementById("activeOrders").textContent = activeOrders;
    document.getElementById("totalEarnings").textContent = formatCurrency(totalEarnings);
    
    // Update activity timeline
    updateActivityTimeline(driverOrders);
    
    showToast("Dashboard refreshed", "success");
}

function updateActivityTimeline(orders) {
    const timeline = document.getElementById("activityTimeline");
    if (!timeline) return;
    
    // Sort orders by date (newest first)
    const sortedOrders = orders.sort((a, b) => 
        new Date(b.orderDate || b.createdAt) - new Date(a.orderDate || a.createdAt)
    ).slice(0, 10); // Last 10 orders
    
    timeline.innerHTML = "";
    
    if (sortedOrders.length === 0) {
        timeline.innerHTML = '<p class="muted">No recent activity</p>';
        return;
    }
    
    sortedOrders.forEach(order => {
        const item = document.createElement("div");
        item.className = "activity-item";
        
        let icon = "fa-clipboard-check";
        let color = "var(--primary-color)";
        let description = `Order #${order.id.toString().slice(-6)} assigned`;
        
        if (order.status === "delivered" || order.status === "completed") {
            icon = "fa-check-circle";
            color = "var(--success-color)";
            description = `Order #${order.id.toString().slice(-6)} delivered`;
        } else if (order.status === "cancelled") {
            icon = "fa-times-circle";
            color = "var(--danger-color)";
            description = `Order #${order.id.toString().slice(-6)} cancelled`;
        } else if (order.status === "on_the_way") {
            icon = "fa-truck";
            color = "var(--warning-color)";
            description = `Order #${order.id.toString().slice(-6)} on the way`;
        }
        
        const date = order.orderDate ? new Date(order.orderDate) : new Date();
        const timeAgo = getTimeAgo(date);
        
        item.innerHTML = `
            <div class="activity-icon" style="background: ${color}20; color: ${color}">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-content">
                <p>${description}</p>
                <small>${timeAgo}</small>
            </div>
        `;
        
        timeline.appendChild(item);
    });
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    
    return date.toLocaleDateString();
}

// Order Management Functions
function loadNewOrders() {
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const orders = usersData.orders || [];
    const products = usersData.products || [];
    const customers = usersData.customers || [];
    
    // Get orders assigned to this driver
    const driverOrders = orders.filter(order => 
        order.driverId === currentDriver.id && 
        ["assigned", "pending"].includes(order.status)
    );
    
    // Update order count badge
    document.getElementById("newOrderCount").textContent = driverOrders.length;
    
    // Load orders grid
    loadOrdersGrid(driverOrders, products, customers);
}

function loadOrdersGrid(orders, products, customers) {
    const grid = document.getElementById("ordersGrid");
    if (!grid) return;
    
    grid.innerHTML = "";
    
    if (orders.length === 0) {
        grid.innerHTML = `
            <div class="text-center" style="grid-column: 1/-1; padding: 40px;">
                <i class="fas fa-box-open" style="font-size: 48px; color: var(--text-muted); margin-bottom: 20px;"></i>
                <p class="muted">No new orders assigned</p>
            </div>
        `;
        return;
    }
    
    orders.forEach(order => {
        const customer = customers.find(c => c.id === order.customerId) || {};
        const product = products.find(p => p.id === order.productId) || {};
        
        const card = document.createElement("div");
        card.className = "order-card";
        card.innerHTML = `
            <div class="order-header">
                <span class="order-id">Order #${order.id.toString().slice(-6)}</span>
                <span class="status-badge status-${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
            </div>
            
            <div class="customer-info">
                <h4>${customer.name || "Customer"}</h4>
                <p><i class="fas fa-phone"></i> ${customer.phone || "N/A"}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${customer.address ? customer.address.substring(0, 30) + "..." : "Address not provided"}</p>
            </div>
            
            <div class="order-items">
                <h5>Order Items</h5>
                <div class="item-list">
                    <div class="item">
                        <span>${product.name || order.productName || "Product"}</span>
                        <span>${order.quantity || 0} kg</span>
                    </div>
                </div>
            </div>
            
            ${order.notes ? `
                <div class="special-instructions">
                    <h5>Special Instructions</h5>
                    <p>${order.notes}</p>
                </div>
            ` : ""}
            
            <div class="order-actions">
                <button class="btn btn-primary accept-order" data-order-id="${order.id}">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="btn btn-danger reject-order" data-order-id="${order.id}">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button class="btn btn-outline view-order-details" data-order-id="${order.id}">
                    <i class="fas fa-eye"></i> Details
                </button>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function viewOrderDetails(orderId) {
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const orders = usersData.orders || [];
    const products = usersData.products || [];
    const customers = usersData.customers || [];
    
    const order = orders.find(o => o.id == orderId);
    if (!order) {
        showToast("Order not found", "error");
        return;
    }
    
    const customer = customers.find(c => c.id === order.customerId) || {};
    const product = products.find(p => p.id === order.productId) || {};
    
    // Populate modal
    const modalBody = document.getElementById("orderDetailBody");
    modalBody.innerHTML = `
        <div class="details-grid">
            <div class="detail-group">
                <h4>Order Information</h4>
                <p><strong>Order ID:</strong> #${order.id.toString().slice(-6)}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status}</span></p>
                <p><strong>Date:</strong> ${new Date(order.orderDate || order.createdAt).toLocaleString()}</p>
                <p><strong>Total:</strong> ${formatCurrency(order.total || 0)}</p>
            </div>
            
            <div class="detail-group">
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> ${customer.name || "N/A"}</p>
                <p><strong>Phone:</strong> ${customer.phone || "N/A"}</p>
                <p><strong>Email:</strong> ${customer.email || "N/A"}</p>
                <p><strong>Address:</strong> ${customer.address || "N/A"}</p>
            </div>
            
            <div class="detail-group">
                <h4>Delivery Details</h4>
                <p><strong>Product:</strong> ${product.name || order.productName || "N/A"}</p>
                <p><strong>Quantity:</strong> ${order.quantity || 0} kg</p>
                <p><strong>Special Instructions:</strong> ${order.notes || "None"}</p>
                <p><strong>Assigned Driver:</strong> ${currentDriver.name}</p>
            </div>
        </div>
        
        ${customer.address ? `
            <div style="margin-top: 20px;">
                <h4>Delivery Location</h4>
                <div id="orderMap" style="height: 200px; width: 100%; border-radius: var(--radius); margin-top: 10px;"></div>
            </div>
        ` : ""}
    `;
    
    // Show modal
    const modal = document.getElementById("orderDetailModal");
    modal.style.display = "flex";
    
    // Set up action buttons
    document.getElementById("acceptOrder").onclick = () => {
        acceptOrder(orderId);
        modal.style.display = "none";
    };
    
    document.getElementById("rejectOrder").onclick = () => {
        rejectOrder(orderId);
        modal.style.display = "none";
    };
    
    // Initialize map for delivery location if address exists
    if (customer.address) {
        setTimeout(() => {
            geocodeAddress(customer.address, "orderMap");
        }, 100);
    }
}

function geocodeAddress(address, mapElementId) {
    if (!window.google || !window.google.maps) return;
    
    const geocoder = new google.maps.Geocoder();
    const mapElement = document.getElementById(mapElementId);
    
    if (!mapElement) return;
    
    geocoder.geocode({ address: address }, (results, status) => {
        if (status === "OK" && results[0]) {
            const map = new google.maps.Map(mapElement, {
                zoom: 15,
                center: results[0].geometry.location
            });
            
            new google.maps.Marker({
                map: map,
                position: results[0].geometry.location
            });
        }
    });
}

function acceptOrder(orderId) {
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const orderIndex = usersData.orders.findIndex(o => o.id == orderId);
    
    if (orderIndex !== -1) {
        usersData.orders[orderIndex].status = "accepted";
        usersData.orders[orderIndex].acceptedAt = new Date().toISOString();
        usersData.orders[orderIndex].acceptedBy = currentDriver.id;
        
        // Update driver status
        const driverIndex = usersData.drivers.findIndex(d => d.id === currentDriver.id);
        if (driverIndex !== -1) {
            usersData.drivers[driverIndex].status = "on_delivery";
        }
        
        localStorage.setItem("millUsers", JSON.stringify(usersData));
        
        // Update current driver data
        const updatedDriver = usersData.drivers.find(d => d.id === currentDriver.id);
        if (updatedDriver) {
            currentDriver = updatedDriver;
            localStorage.setItem("currentUser", JSON.stringify(currentDriver));
        }
        
        // Update UI
        updateDriverStatus();
        loadNewOrders();
        loadCurrentOrder();
        
        // Create notification
        createNotification("Order Accepted", `You accepted Order #${orderId.toString().slice(-6)}`, "success");
        
        showToast("Order accepted successfully", "success");
    }
}

function rejectOrder(orderId) {
    const reason = prompt("Please provide a reason for rejecting this order:");
    if (reason === null) return; // User cancelled
    
    if (!reason.trim()) {
        showToast("Please provide a reason", "error");
        return rejectOrder(orderId);
    }
    
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const orderIndex = usersData.orders.findIndex(o => o.id == orderId);
    
    if (orderIndex !== -1) {
        usersData.orders[orderIndex].status = "rejected";
        usersData.orders[orderIndex].rejectedAt = new Date().toISOString();
        usersData.orders[orderIndex].rejectionReason = reason;
        usersData.orders[orderIndex].rejectedBy = currentDriver.id;
        
        // Remove driver assignment
        usersData.orders[orderIndex].driverId = null;
        
        localStorage.setItem("millUsers", JSON.stringify(usersData));
        
        // Update UI
        loadNewOrders();
        
        // Create notification
        createNotification("Order Rejected", `You rejected Order #${orderId.toString().slice(-6)}`, "warning");
        
        showToast("Order rejected", "info");
    }
}

function loadCurrentOrder() {
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const orders = usersData.orders || [];
    const products = usersData.products || [];
    const customers = usersData.customers || [];
    
    // Find current active order for driver
    currentOrder = orders.find(order => 
        order.driverId === currentDriver.id && 
        ["accepted", "processing", "on_the_way", "arrived"].includes(order.status)
    );
    
    if (currentOrder) {
        const customer = customers.find(c => c.id === currentOrder.customerId) || {};
        const product = products.find(p => p.id === currentOrder.productId) || {};
        
        // Update header
        document.getElementById("currentOrderHeader").innerHTML = `
            <span class="order-id">Order #${currentOrder.id.toString().slice(-6)} - ${customer.name || "Customer"}</span>
            <span id="currentStatusBadge" class="status-badge status-${currentOrder.status}">
                ${currentOrder.status.charAt(0).toUpperCase() + currentOrder.status.slice(1).replace("_", " ")}
            </span>
        `;
        
        // Update status select
        document.getElementById("statusUpdateSelect").value = currentOrder.status;
        document.getElementById("updateStatusBtn").disabled = false;
        
        // Update order details
        document.getElementById("currentOrderDetails").innerHTML = `
            <div class="details-grid">
                <div class="detail-group">
                    <h4>Customer Information</h4>
                    <p><strong>Name:</strong> ${customer.name || "N/A"}</p>
                    <p><strong>Phone:</strong> ${customer.phone || "N/A"}</p>
                    <p><strong>Address:</strong> ${customer.address || "N/A"}</p>
                </div>
                
                <div class="detail-group">
                    <h4>Order Details</h4>
                    <p><strong>Product:</strong> ${product.name || currentOrder.productName || "N/A"}</p>
                    <p><strong>Quantity:</strong> ${currentOrder.quantity || 0} kg</p>
                    <p><strong>Total:</strong> ${formatCurrency(currentOrder.total || 0)}</p>
                    <p><strong>Special Instructions:</strong> ${currentOrder.notes || "None"}</p>
                </div>
                
                <div class="detail-group">
                    <h4>Delivery Information</h4>
                    <p><strong>Assigned:</strong> ${formatDate(currentOrder.orderDate)}</p>
                    <p><strong>Accepted:</strong> ${currentOrder.acceptedAt ? formatDate(currentOrder.acceptedAt) : "Not yet"}</p>
                    <p><strong>Last Updated:</strong> ${currentOrder.updatedAt ? formatDate(currentOrder.updatedAt) : "Never"}</p>
                </div>
            </div>
        `;
        
        // Update progress timeline
        updateProgressTimeline();
        
        // Update POD order info
        updatePODOrderInfo();
        
        // Update customer info in communication
        updateCustomerInfo(customer);
    } else {
        // No current order
        document.getElementById("currentOrderHeader").innerHTML = `
            <span class="order-id">No active order</span>
            <span id="currentStatusBadge" class="status-badge status-pending">No Order</span>
        `;
        
        document.getElementById("currentOrderDetails").innerHTML = `
            <p class="muted">No active order. Please accept an order from New Orders section.</p>
        `;
        
        document.getElementById("updateStatusBtn").disabled = true;
        
        // Reset progress timeline
        document.querySelectorAll(".timeline-step").forEach(step => {
            step.classList.remove("active", "completed");
        });
        document.getElementById("timelineFill").style.width = "0%";
    }
}

function updateProgressTimeline() {
    if (!currentOrder) return;
    
    const steps = document.querySelectorAll(".timeline-step");
    const fill = document.getElementById("timelineFill");
    
    // Reset all steps
    steps.forEach(step => {
        step.classList.remove("active", "completed");
    });
    
    // Define status to step mapping
    const statusMap = {
        "assigned": 1,
        "accepted": 2,
        "pickup_started": 3,
        "picked_up": 4,
        "on_the_way": 5,
        "arrived": 6,
        "delivered": 7
    };
    
    const currentStep = statusMap[currentOrder.status] || 0;
    
    // Update steps
    for (let i = 1; i <= currentStep; i++) {
        if (i === currentStep) {
            steps[i-1].classList.add("active");
        } else {
            steps[i-1].classList.add("completed");
        }
    }
    
    // Update progress bar
    const percentage = ((currentStep - 1) / 6) * 100;
    fill.style.width = `${percentage}%`;
}

function updateCurrentOrderStatus() {
    const newStatus = document.getElementById("statusUpdateSelect").value;
    if (!newStatus || !currentOrder) return;
    
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const orderIndex = usersData.orders.findIndex(o => o.id === currentOrder.id);
    
    if (orderIndex !== -1) {
        usersData.orders[orderIndex].status = newStatus;
        usersData.orders[orderIndex].updatedAt = new Date().toISOString();
        
        // If delivered, add delivered timestamp
        if (newStatus === "delivered") {
            usersData.orders[orderIndex].deliveredAt = new Date().toISOString();
        }
        
        localStorage.setItem("millUsers", JSON.stringify(usersData));
        
        // Update current order
        currentOrder = usersData.orders[orderIndex];
        
        // Update UI
        loadCurrentOrder();
        loadDashboardData();
        
        // Create notification
        createNotification("Status Updated", `Order status updated to ${newStatus}`, "info");
        
        showToast("Order status updated successfully", "success");
        
        // If order is delivered, navigate to POD section
        if (newStatus === "delivered") {
            setTimeout(() => {
                navigateToSection("proofDelivery");
            }, 1000);
        }
    }
}

// Proof of Delivery Functions
function updatePODOrderInfo() {
    const podOrderInfo = document.getElementById("podOrderInfo");
    if (!currentOrder) {
        podOrderInfo.innerHTML = `<span class="muted">Select an order to provide proof of delivery</span>`;
        return;
    }
    
    podOrderInfo.innerHTML = `
        <strong>Order #${currentOrder.id.toString().slice(-6)}</strong> - 
        Ready for delivery confirmation
    `;
}

function initializeSignatureCanvas() {
    if (!signatureCanvas || !signatureContext) return;
    
    // Set canvas size
    signatureCanvas.width = signatureCanvas.offsetWidth;
    signatureCanvas.height = signatureCanvas.offsetHeight;
    
    // Set up drawing context
    signatureContext.lineWidth = 2;
    signatureContext.lineCap = 'round';
    signatureContext.strokeStyle = '#333333';
    
    // Event listeners for drawing
    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    signatureCanvas.addEventListener('touchstart', startDrawingTouch);
    signatureCanvas.addEventListener('touchmove', drawTouch);
    signatureCanvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    const rect = signatureCanvas.getBoundingClientRect();
    signatureContext.beginPath();
    signatureContext.moveTo(
        e.clientX - rect.left,
        e.clientY - rect.top
    );
    e.preventDefault();
}

function draw(e) {
    if (!isDrawing) return;
    const rect = signatureCanvas.getBoundingClientRect();
    signatureContext.lineTo(
        e.clientX - rect.left,
        e.clientY - rect.top
    );
    signatureContext.stroke();
}

function stopDrawing() {
    isDrawing = false;
    signatureContext.closePath();
}

function startDrawingTouch(e) {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousedown", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        signatureCanvas.dispatchEvent(mouseEvent);
    }
    e.preventDefault();
}

function drawTouch(e) {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousemove", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        signatureCanvas.dispatchEvent(mouseEvent);
    }
    e.preventDefault();
}

function clearSignature() {
    signatureContext.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    showToast("Signature cleared", "info");
}

function saveSignature() {
    if (signatureCanvas.toDataURL() === signatureCanvas.toDataURL('image/png', 0.0)) {
        showToast("Please sign first", "warning");
        return;
    }
    
    const signatureData = signatureCanvas.toDataURL('image/png');
    
    // Save to localStorage
    const podData = getPODData();
    podData.signature = signatureData;
    savePODData(podData);
    
    showToast("Signature saved", "success");
}

function handlePhotoUpload(e) {
    const files = e.target.files;
    handlePhotoFiles(files);
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    document.getElementById("photoDropZone").style.borderColor = "var(--primary-color)";
    document.getElementById("photoDropZone").style.backgroundColor = "rgba(33, 150, 243, 0.05)";
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById("photoDropZone").style.borderColor = "";
    document.getElementById("photoDropZone").style.backgroundColor = "";
    
    const files = e.dataTransfer.files;
    handlePhotoFiles(files);
}

function handlePhotoFiles(files) {
    const preview = document.getElementById("photoPreview");
    const podData = getPODData();
    
    for (let file of files) {
        // Check file type
        if (!file.type.match('image.*')) {
            showToast(`${file.name} is not an image file`, "error");
            continue;
        }
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            showToast(`${file.name} is too large (max 5MB)`, "error");
            continue;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgData = e.target.result;
            
            // Add to preview
            const previewItem = document.createElement("div");
            previewItem.className = "photo-preview-item";
            previewItem.innerHTML = `
                <img src="${imgData}" alt="Delivery Photo">
                <button class="remove-photo" data-filename="${file.name}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.appendChild(previewItem);
            
            // Add to POD data
            podData.photos = podData.photos || [];
            podData.photos.push({
                name: file.name,
                data: imgData,
                uploaded: new Date().toISOString()
            });
            
            // Save POD data
            savePODData(podData);
            
            // Add remove event listener
            previewItem.querySelector(".remove-photo").addEventListener("click", function() {
                const filename = this.dataset.filename;
                removePhoto(filename);
            });
        };
        reader.readAsDataURL(file);
    }
    
    // Reset file input
    document.getElementById("photoUpload").value = "";
}

function removePhoto(filename) {
    const podData = getPODData();
    if (podData.photos) {
        podData.photos = podData.photos.filter(photo => photo.name !== filename);
        savePODData(podData);
        
        // Remove from preview
        const previewItem = document.querySelector(`[data-filename="${filename}"]`).closest(".photo-preview-item");
        if (previewItem) {
            previewItem.remove();
        }
        
        showToast("Photo removed", "info");
    }
}

function setRating(rating) {
    document.getElementById("deliveryRating").value = rating;
    
    // Update star display
    document.querySelectorAll(".rating-stars i").forEach((star, index) => {
        if (index < rating) {
            star.classList.add("active");
        } else {
            star.classList.remove("active");
        }
    });
}

function handleDeliveryForm(e) {
    e.preventDefault();
    
    if (!currentOrder) {
        showToast("No active order for delivery confirmation", "error");
        return;
    }
    
    // Get form data
    const deliveryTime = document.getElementById("deliveryTime").value;
    const recipientName = document.getElementById("recipientName").value;
    const deliveryNotes = document.getElementById("deliveryNotes").value;
    const rating = document.getElementById("deliveryRating").value;
    
    // Validate
    if (!recipientName.trim()) {
        showToast("Please enter recipient name", "error");
        return;
    }
    
    // Get POD data
    const podData = getPODData();
    
    // Add form data
    podData.confirmation = {
        deliveryTime: deliveryTime || new Date().toISOString(),
        recipientName: recipientName,
        deliveryNotes: deliveryNotes,
        rating: parseInt(rating) || 0,
        confirmedAt: new Date().toISOString()
    };
    
    // Save to localStorage
    savePODData(podData);
    
    // Update order status in main data
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const orderIndex = usersData.orders.findIndex(o => o.id === currentOrder.id);
    
    if (orderIndex !== -1) {
        usersData.orders[orderIndex].deliveryProof = podData;
        usersData.orders[orderIndex].status = "completed";
        usersData.orders[orderIndex].completedAt = new Date().toISOString();
        
        localStorage.setItem("millUsers", JSON.stringify(usersData));
    }
    
    // Create notification
    createNotification("Delivery Confirmed", `Order #${currentOrder.id.toString().slice(-6)} delivery confirmed`, "success");
    
    // Reset form and clear POD
    document.getElementById("deliveryForm").reset();
    clearProofOfDelivery();
    
    // Update dashboard
    loadDashboardData();
    
    showToast("Delivery confirmed successfully!", "success");
    
    // Navigate back to dashboard
    setTimeout(() => {
        navigateToSection("dashboard");
    }, 2000);
}

function clearProofOfDelivery() {
    // Clear signature
    clearSignature();
    
    // Clear photo preview
    document.getElementById("photoPreview").innerHTML = "";
    
    // Clear POD data
    savePODData({});
    
    // Reset rating stars
    document.querySelectorAll(".rating-stars i").forEach(star => {
        star.classList.remove("active");
    });
    
    showToast("Proof of delivery cleared", "info");
}

function getPODData() {
    const podData = localStorage.getItem(`pod_${currentDriver.id}_${currentOrder ? currentOrder.id : 'none'}`);
    return podData ? JSON.parse(podData) : {};
}

function savePODData(data) {
    localStorage.setItem(`pod_${currentDriver.id}_${currentOrder ? currentOrder.id : 'none'}`, JSON.stringify(data));
}

// Communication Functions
function loadMessages() {
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const messages = usersData.messages || [];
    
    // Filter messages for this driver
    chatMessages = messages.filter(msg => 
        (msg.to && msg.to.role === "driver" && msg.to.id === currentDriver.id) ||
        (msg.from && msg.from.role === "driver" && msg.from.id === currentDriver.id)
    );
    
    // Sort by timestamp
    chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Update message count badge
    const unreadCount = chatMessages.filter(msg => !msg.read && msg.to.id === currentDriver.id).length;
    document.getElementById("messageCount").textContent = unreadCount;
    
    // Display messages
    displayMessages();
}

function displayMessages() {
    const chatMessagesElement = document.getElementById("chatMessages");
    if (!chatMessagesElement) return;
    
    if (chatMessages.length === 0) {
        chatMessagesElement.innerHTML = `
            <div class="message-placeholder">
                <i class="fas fa-comments"></i>
                <p>No messages yet. Start a conversation!</p>
            </div>
        `;
        return;
    }
    
    chatMessagesElement.innerHTML = "";
    
    chatMessages.forEach(msg => {
        const isSent = msg.from && msg.from.id === currentDriver.id;
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-content">${escapeHtml(msg.content)}</div>
            <div class="message-time">${time}</div>
        `;
        
        chatMessagesElement.appendChild(messageDiv);
    });
    
    // Scroll to bottom
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
    
    // Mark messages as read
    markMessagesAsRead();
}

function markMessagesAsRead() {
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    let updated = false;
    
    usersData.messages = usersData.messages.map(msg => {
        if (msg.to && msg.to.id === currentDriver.id && !msg.read) {
            updated = true;
            return { ...msg, read: true };
        }
        return msg;
    });
    
    if (updated) {
        localStorage.setItem("millUsers", JSON.stringify(usersData));
        updateNotificationCounts();
    }
}

function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();
    
    if (!message) {
        showToast("Please enter a message", "warning");
        return;
    }
    
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    if (!usersData.messages) usersData.messages = [];
    
    // Create message object (default to operator support)
    const messageObj = {
        id: Date.now(),
        from: {
            role: "driver",
            id: currentDriver.id,
            name: currentDriver.name
        },
        to: {
            role: "admin", // Default to admin/operator
            id: 1, // Default admin ID
            name: "Operator Support"
        },
        content: message,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    usersData.messages.push(messageObj);
    localStorage.setItem("millUsers", JSON.stringify(usersData));
    
    // Add to chat display
    chatMessages.push(messageObj);
    displayMessages();
    
    // Clear input
    input.value = "";
    input.focus();
    
    showToast("Message sent", "success");
}

function updateCustomerInfo(customer) {
    const customerInfo = document.getElementById("customerInfo");
    if (!customer || !customerInfo) return;
    
    customerInfo.innerHTML = `
        <p><strong>${customer.name || "Customer"}</strong></p>
        <p><i class="fas fa-phone"></i> ${customer.phone || "N/A"}</p>
        <p><i class="fas fa-map-marker-alt"></i> ${customer.address ? customer.address.substring(0, 50) + "..." : "Address not provided"}</p>
    `;
    
    // Enable call customer button
    document.getElementById("callCustomer").disabled = !customer.phone;
}

function callOperator() {
    showToast("Calling operator support...", "info");
    // In a real app, this would initiate a phone call
}

function messageOperator() {
    document.getElementById("messageInput").focus();
    document.getElementById("messageInput").placeholder = "Type message to operator...";
}

function callCustomer() {
    if (!currentOrder) {
        showToast("No active order", "error");
        return;
    }
    
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const customer = usersData.customers.find(c => c.id === currentOrder.customerId);
    
    if (customer && customer.phone) {
        showToast(`Calling ${customer.phone}...`, "info");
        // In a real app, this would initiate a phone call
    } else {
        showToast("Customer phone number not available", "error");
    }
}

function callSupport() {
    showToast("Calling support...", "info");
}

function clearChat() {
    if (confirm("Clear all chat messages?")) {
        const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
        usersData.messages = usersData.messages.filter(msg => 
            !(msg.from && msg.from.id === currentDriver.id) && 
            !(msg.to && msg.to.id === currentDriver.id)
        );
        
        localStorage.setItem("millUsers", JSON.stringify(usersData));
        loadMessages();
        showToast("Chat cleared", "info");
    }
}

// Settings Functions
function saveProfileSettings(e) {
    e.preventDefault();
    
    const name = document.getElementById("driverNameInput").value;
    const email = document.getElementById("driverEmailInput").value;
    const phone = document.getElementById("driverPhone").value;
    const vehicle = document.getElementById("driverVehicle").value;
    const license = document.getElementById("driverLicense").value;
    const address = document.getElementById("driverAddress").value;
    
    // Update driver data in localStorage
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const driverIndex = usersData.drivers.findIndex(d => d.id === currentDriver.id);
    
    if (driverIndex !== -1) {
        usersData.drivers[driverIndex].name = name;
        usersData.drivers[driverIndex].email = email;
        usersData.drivers[driverIndex].phone = phone;
        usersData.drivers[driverIndex].vehicle = vehicle;
        usersData.drivers[driverIndex].license = license;
        usersData.drivers[driverIndex].address = address;
        usersData.drivers[driverIndex].updatedAt = new Date().toISOString();
        
        localStorage.setItem("millUsers", JSON.stringify(usersData));
        
        // Update current driver
        currentDriver = usersData.drivers[driverIndex];
        localStorage.setItem("currentUser", JSON.stringify(currentDriver));
        
        // Update UI
        loadDriverData();
        
        showToast("Profile updated successfully", "success");
    }
}

function changePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    
    // Validation
    if (newPassword !== confirmPassword) {
        showToast("New passwords don't match", "error");
        return;
    }
    
    if (newPassword.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        return;
    }
    
    // Check current password
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const driverIndex = usersData.drivers.findIndex(d => d.id === currentDriver.id);
    
    if (driverIndex === -1) {
        showToast("Driver not found", "error");
        return;
    }
    
    if (usersData.drivers[driverIndex].password !== currentPassword) {
        showToast("Current password is incorrect", "error");
        return;
    }
    
    // Update password
    usersData.drivers[driverIndex].password = newPassword;
    usersData.drivers[driverIndex].passwordUpdatedAt = new Date().toISOString();
    
    localStorage.setItem("millUsers", JSON.stringify(usersData));
    
    // Update current driver
    currentDriver = usersData.drivers[driverIndex];
    localStorage.setItem("currentUser", JSON.stringify(currentDriver));
    
    // Reset form
    document.getElementById("passwordForm").reset();
    
    showToast("Password changed successfully", "success");
}

function saveNotificationSettings() {
    const notifications = {
        newOrders: document.getElementById("notifyNewOrders").checked,
        messages: document.getElementById("notifyMessages").checked,
        statusUpdates: document.getElementById("notifyStatusUpdates").checked,
        announcements: document.getElementById("notifyAnnouncements").checked
    };
    
    // Update driver data
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const driverIndex = usersData.drivers.findIndex(d => d.id === currentDriver.id);
    
    if (driverIndex !== -1) {
        usersData.drivers[driverIndex].notifications = notifications;
        localStorage.setItem("millUsers", JSON.stringify(usersData));
        
        // Update current driver
        currentDriver = usersData.drivers[driverIndex];
        localStorage.setItem("currentUser", JSON.stringify(currentDriver));
        
        showToast("Notification preferences saved", "success");
    }
}

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        showToast("Please select an image file", "error");
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        showToast("Image must be less than 2MB", "error");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const avatarData = e.target.result;
        
        // Update UI
        document.getElementById("driverAvatar").src = avatarData;
        document.getElementById("avatarPreview").src = avatarData;
        
        // Update driver data
        const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
        const driverIndex = usersData.drivers.findIndex(d => d.id === currentDriver.id);
        
        if (driverIndex !== -1) {
            usersData.drivers[driverIndex].avatar = avatarData;
            localStorage.setItem("millUsers", JSON.stringify(usersData));
            
            // Update current driver
            currentDriver = usersData.drivers[driverIndex];
            localStorage.setItem("currentUser", JSON.stringify(currentDriver));
        }
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    e.target.value = "";
}

function removeAvatar() {
    if (confirm("Remove profile picture?")) {
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentDriver.name)}&background=2196F3&color=fff`;
        
        // Update UI
        document.getElementById("driverAvatar").src = defaultAvatar;
        document.getElementById("avatarPreview").src = defaultAvatar;
        
        // Update driver data
        const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
        const driverIndex = usersData.drivers.findIndex(d => d.id === currentDriver.id);
        
        if (driverIndex !== -1) {
            delete usersData.drivers[driverIndex].avatar;
            localStorage.setItem("millUsers", JSON.stringify(usersData));
            
            // Update current driver
            currentDriver = usersData.drivers[driverIndex];
            localStorage.setItem("currentUser", JSON.stringify(currentDriver));
        }
        
        showToast("Profile picture removed", "info");
    }
}

// Utility Functions
function updateDriverStatus() {
    const status = document.getElementById("statusSelect").value;
    const indicator = document.getElementById("statusIndicator");
    
    // Update indicator
    indicator.className = "status-indicator " + status;
    
    // Update driver data in localStorage
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const driverIndex = usersData.drivers.findIndex(d => d.id === currentDriver.id);
    
    if (driverIndex !== -1) {
        usersData.drivers[driverIndex].status = status;
        usersData.drivers[driverIndex].lastActive = new Date().toISOString();
        localStorage.setItem("millUsers", JSON.stringify(usersData));
        
        // Update current driver
        currentDriver = usersData.drivers[driverIndex];
        localStorage.setItem("currentUser", JSON.stringify(currentDriver));
    }
    
    // Update notification badge
    updateNotificationCounts();
}

function updateNotificationCounts() {
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    
    // Count unread messages
    const messages = usersData.messages || [];
    const unreadMessages = messages.filter(msg => 
        msg.to && msg.to.id === currentDriver.id && !msg.read
    ).length;
    
    // Count notifications
    const notifications = usersData.notifications || [];
    const unreadNotifications = notifications.filter(n => !n.read).length;
    
    // Update badges
    document.getElementById("notificationCount").textContent = unreadNotifications;
    document.getElementById("notificationCount").style.display = unreadNotifications > 0 ? "flex" : "none";
    
    document.getElementById("messageCount").textContent = unreadMessages;
    document.getElementById("messageCount").style.display = unreadMessages > 0 ? "flex" : "none";
}

function showNotifications() {
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const notifications = usersData.notifications || [];
    
    const modal = document.getElementById("notificationsModal");
    const list = document.getElementById("notificationsList");
    
    if (notifications.length === 0) {
        list.innerHTML = '<p class="muted">No notifications</p>';
    } else {
        list.innerHTML = "";
        
        notifications.slice().reverse().forEach(notification => {
            const item = document.createElement("div");
            item.className = "notification-item";
            item.style.padding = "10px";
            item.style.borderBottom = "1px solid var(--border-color)";
            
            const time = new Date(notification.timestamp).toLocaleString();
            
            item.innerHTML = `
                <div style="font-weight: 600; color: ${notification.type === 'success' ? 'var(--success-color)' : 
                    notification.type === 'error' ? 'var(--danger-color)' : 
                    notification.type === 'warning' ? 'var(--warning-color)' : 'var(--text-color)'}">
                    ${escapeHtml(notification.title || "Notification")}
                </div>
                <div style="margin: 5px 0;">${escapeHtml(notification.message || "")}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${time}</div>
            `;
            
            list.appendChild(item);
        });
    }
    
    modal.style.display = "flex";
}

function createNotification(title, message, type = "info") {
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    if (!usersData.notifications) usersData.notifications = [];
    
    const notification = {
        id: Date.now(),
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    usersData.notifications.push(notification);
    localStorage.setItem("millUsers", JSON.stringify(usersData));
    
    // Update notification count
    updateNotificationCounts();
}

function toggleDarkMode() {
    const body = document.body;
    const icon = document.querySelector("#darkModeToggle i");
    
    if (body.getAttribute("data-theme") === "dark") {
        body.removeAttribute("data-theme");
        localStorage.setItem("theme", "light");
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
    } else {
        body.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
    }
}

function checkTheme() {
    const savedTheme = localStorage.getItem("theme");
    const icon = document.querySelector("#darkModeToggle i");
    
    if (savedTheme === "dark") {
        document.body.setAttribute("data-theme", "dark");
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
    }
}

function logoutDriver() {
    localStorage.removeItem("currentUser");
    window.location.href = "../index.html";
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-ET', {
        style: 'currency',
        currency: 'ETB',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    const icon = type === "success" ? "fa-check-circle" :
                 type === "error" ? "fa-exclamation-circle" :
                 type === "warning" ? "fa-exclamation-triangle" : "fa-info-circle";
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function startPeriodicUpdates() {
    // Update dashboard every 30 seconds
    setInterval(() => {
        if (document.querySelector("#dashboard.active")) {
            loadDashboardData();
        }
    }, 30000);
    
    // Check for new orders every 60 seconds
    setInterval(() => {
        loadNewOrders();
        loadMessages();
    }, 60000);
    
    // Update driver activity every 2 minutes
    setInterval(() => {
        updateDriverStatus();
    }, 120000);
}

// Add CSS for slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize on window load
window.addEventListener('load', initializeDriverPortal);