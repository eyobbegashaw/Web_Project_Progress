// Operator Dashboard JavaScript - Updated Version
// Global Variables
let currentOperator = null;
let currentOrders = [];
let currentMessages = [];
let currentInventory = [];
let currentDrivers = [];
let currentPage = 1;
let itemsPerPage = 25;
let googleMap = null;
let mapMarkers = {};
let directionsService = null;
let directionsDisplay = null;
let trafficLayer = null;
let mapCenter = { lat: 9.032, lng: 38.74 }; // Addis Ababa coordinates

// Initialize Operator Dashboard
document.addEventListener("DOMContentLoaded", function () {
  initializeOperatorDashboard();
});

// Update initializeOperatorDashboard to include sample drivers
function initializeOperatorDashboard() {
    // Check authentication
    checkOperatorAuth();
    
    // Initialize sample data
    initializeSampleDrivers();
    
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

// Add refreshDrivers function
function refreshDrivers() {
    loadDrivers();
    loadDriversOnMap();
    showToast('Drivers list refreshed', 'success');
}

// Update viewDriverLocation function
function viewDriverLocation(driverId) {
    navigateToSection('drivers');
    setTimeout(() => {
        centerMapOnDriver(driverId);
    }, 500);
}
// Google Maps Functions
function initializeGoogleMap() {
    if (typeof google === 'undefined') {
        console.error('Google Maps API not loaded');
        showToast('Google Maps not available. Please check your API key.', 'error');
        return;
    }
    
    const mapOptions = {
        center: mapCenter,
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    };
    
    googleMap = new google.maps.Map(document.getElementById('googleMap'), mapOptions);
    directionsService = new google.maps.DirectionsService();
    directionsDisplay = new google.maps.DirectionsRenderer();
    directionsDisplay.setMap(googleMap);
    
    trafficLayer = new google.maps.TrafficLayer();
    
    // Add click listener to map
    google.maps.event.addListener(googleMap, 'click', function(event) {
        // Optional: Add custom marker on click
        // addCustomMarker(event.latLng);
    });
    
    // Load drivers and show on map
    loadDriversOnMap();
    
    // Start location updates
    startDriverLocationUpdates();
}

function loadDriversOnMap() {
    // Clear existing markers
    Object.values(mapMarkers).forEach(marker => marker.setMap(null));
    mapMarkers = {};
    
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const drivers = usersData.drivers || [];
    
    drivers.forEach(driver => {
        if (driver.location && driver.location.lat && driver.location.lng) {
            addDriverMarker(driver);
        }
    });
}

function addDriverMarker(driver) {
    if (!googleMap) return;
    
    // Determine marker color based on status
    let markerColor = '#4CAF50'; // Available - Green
    if (driver.status === 'on_delivery') markerColor = '#FF9800'; // Orange
    if (driver.status === 'busy') markerColor = '#F44336'; // Red
    
    // Create custom marker icon
    const icon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: markerColor,
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: 10
    };
    
    const marker = new google.maps.Marker({
        position: { lat: driver.location.lat, lng: driver.location.lng },
        map: googleMap,
        title: `${driver.name} - ${driver.vehicle}`,
        icon: icon,
        animation: google.maps.Animation.DROP
    });
    
    // Add info window
    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div class="map-info-window">
                <h4>${driver.name}</h4>
                <p><strong>Vehicle:</strong> ${driver.vehicle}</p>
                <p><strong>Status:</strong> ${driver.status.replace('_', ' ').toUpperCase()}</p>
                <p><strong>Phone:</strong> ${driver.phone}</p>
                <p><strong>Last Update:</strong> ${formatTime(driver.lastLocationUpdate)}</p>
                ${driver.currentOrder ? `<p><strong>Current Order:</strong> #${driver.currentOrder.toString().slice(-6)}</p>` : ''}
                <div class="info-window-actions">
                    <button onclick="centerMapOnDriver('${driver.id}')" class="btn-map">Center</button>
                    <button onclick="getDirectionsToDriver('${driver.id}')" class="btn-map">Directions</button>
                    <button onclick="messageDriver('${driver.id}')" class="btn-map">Message</button>
                </div>
            </div>
        `
    });
    
    marker.addListener('click', function() {
        infoWindow.open(googleMap, marker);
    });
    
    // Store marker reference
    mapMarkers[driver.id] = marker;
}

function centerMapOnDriver(driverId) {
    const driver = currentDrivers.find(d => d.id === driverId);
    if (driver && driver.location && googleMap) {
        googleMap.setCenter({ lat: driver.location.lat, lng: driver.location.lng });
        googleMap.setZoom(15);
        
        // Open info window
        if (mapMarkers[driverId]) {
            mapMarkers[driverId].setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(() => mapMarkers[driverId].setAnimation(null), 1500);
        }
    }
}

function centerMapOnDrivers() {
    if (!googleMap || currentDrivers.length === 0) return;
    
    const bounds = new google.maps.LatLngBounds();
    let hasLocations = false;
    
    currentDrivers.forEach(driver => {
        if (driver.location && driver.location.lat && driver.location.lng) {
            bounds.extend({ lat: driver.location.lat, lng: driver.location.lng });
            hasLocations = true;
        }
    });
    
    if (hasLocations) {
        googleMap.fitBounds(bounds);
        if (currentDrivers.length === 1) {
            googleMap.setZoom(15);
        }
    } else {
        googleMap.setCenter(mapCenter);
        googleMap.setZoom(12);
    }
}

function getDirectionsToDriver(driverId) {
    const driver = currentDrivers.find(d => d.id === driverId);
    if (!driver || !driver.location) {
        showToast('Driver location not available', 'warning');
        return;
    }
    
    // In a real app, get user's current location
    // For now, use a fixed starting point (could be mill location)
    const millLocation = { lat: 9.032, lng: 38.74 }; // Mill location
    
    const request = {
        origin: millLocation,
        destination: { lat: driver.location.lat, lng: driver.location.lng },
        travelMode: google.maps.TravelMode.DRIVING
    };
    
    directionsService.route(request, function(result, status) {
        if (status === 'OK') {
            directionsDisplay.setDirections(result);
            
            // Calculate distance and time
            const route = result.routes[0].legs[0];
            const distance = route.distance.text;
            const duration = route.duration.text;
            
            showToast(`Route found: ${distance} (${duration})`, 'success');
        } else {
            showToast('Could not calculate route: ' + status, 'error');
        }
    });
}

function toggleTraffic() {
    if (!trafficLayer) return;
    
    const trafficButton = document.querySelector('button[onclick="toggleTraffic()"]');
    if (trafficLayer.getMap()) {
        trafficLayer.setMap(null);
        trafficButton.innerHTML = '<i class="fas fa-road"></i> Show Traffic';
        trafficButton.classList.remove('active');
    } else {
        trafficLayer.setMap(googleMap);
        trafficButton.innerHTML = '<i class="fas fa-road"></i> Hide Traffic';
        trafficButton.classList.add('active');
    }
}

function updateDriverLocation(driverId, lat, lng) {
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    const driverIndex = usersData.drivers.findIndex(d => d.id === driverId);
    
    if (driverIndex !== -1) {
        usersData.drivers[driverIndex].location = { lat, lng };
        usersData.drivers[driverIndex].lastLocationUpdate = new Date().toISOString();
        
        localStorage.setItem('millUsers', JSON.stringify(usersData));
        
        // Update marker on map
        if (mapMarkers[driverId] && googleMap) {
            const newPosition = new google.maps.LatLng(lat, lng);
            mapMarkers[driverId].setPosition(newPosition);
            
            // Add moving animation
            mapMarkers[driverId].setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(() => mapMarkers[driverId].setAnimation(null), 1000);
        }
        
        return true;
    }
    return false;
}

function updateAllDriverLocations() {
    // Simulate updating driver locations (in real app, drivers would send updates)
    const usersData = JSON.parse(localStorage.getItem('millUsers'));
    const drivers = usersData.drivers || [];
    
    drivers.forEach(driver => {
        if (driver.status === 'on_delivery' && driver.location) {
            // Simulate small movement for demo
            const lat = driver.location.lat + (Math.random() * 0.001 - 0.0005);
            const lng = driver.location.lng + (Math.random() * 0.001 - 0.0005);
            updateDriverLocation(driver.id, lat, lng);
        }
    });
    
    loadDrivers();
    showToast('Driver locations updated', 'success');
}

function startDriverLocationUpdates() {
    // Simulate real-time location updates every 30 seconds
    setInterval(() => {
        if (document.querySelector('.content-section.active').id === 'drivers') {
            updateAllDriverLocations();
        }
    }, 30000);
}

function simulateDriverMovement(driverId) {
    const driver = currentDrivers.find(d => d.id === driverId);
    if (!driver || !driver.location) return;
    
    // Generate new location nearby
    const lat = driver.location.lat + (Math.random() * 0.002 - 0.001);
    const lng = driver.location.lng + (Math.random() * 0.002 - 0.001);
    
    updateDriverLocation(driverId, lat, lng);
    showToast(`${driver.name} location updated`, 'info');
}


// Authentication
function checkOperatorAuth() {
  const operatorData = localStorage.getItem("currentUser");
  if (!operatorData) {
    window.location.href = "../index.html";
    return;
  }

  const user = JSON.parse(operatorData);
  if (user.role !== "operator") {
    window.location.href = "../index.html";
    return;
  }

  currentOperator = user;
}

// Load Operator Data
function loadOperatorData() {
  if (currentOperator) {
    document.getElementById("operatorName").textContent = currentOperator.name;
    document.getElementById("operatorEmail").textContent =
      currentOperator.email;
    document.getElementById("operatorGreeting").textContent =
      currentOperator.name.split(" ")[0];
    document.getElementById("opFullName").value = currentOperator.name;
    document.getElementById("opEmail").value = currentOperator.email;
    document.getElementById("opPhone").value = currentOperator.phone || "";

    // Load operator profile image
    const savedImage = localStorage.getItem(
      `operator_${currentOperator.id}_profile_image`
    );
    if (savedImage) {
      document.getElementById("operatorAvatar").src = savedImage;
      document.getElementById("currentProfilePic").src = savedImage;
    } else {
      const initials = currentOperator.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        initials
      )}&background=2196F3&color=fff`;
      document.getElementById("operatorAvatar").src = avatarUrl;
      document.getElementById("currentProfilePic").src = avatarUrl;
    }

    // Load assignments
    loadAssignments();
    // Load drivers
    loadDrivers();
  }
}

function loadAssignments() {
  if (!currentOperator || !currentOperator.assignments) return;

  const assignmentsList = document.getElementById("assignmentsList");
  assignmentsList.innerHTML = "";

  currentOperator.assignments.forEach((assignment) => {
    const item = document.createElement("div");
    item.className = "assignment-item";
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

function loadDrivers() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  currentDrivers = usersData.drivers || [];

  // Update driver stats in sidebar
  const availableDrivers = currentDrivers.filter(
    (driver) => driver.status === "available"
  );
  document.getElementById("availableDrivers").textContent =
    availableDrivers.length;
}

// Event Listeners
function setupOperatorEventListeners() {
  // Navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      const target = this.getAttribute("href").substring(1);
      navigateToSection(target);
    });
  });

  // Menu toggle
  document.getElementById("menuToggle").addEventListener("click", function () {
    document.querySelector(".operator-sidebar").classList.toggle("active");
  });

  // Dark mode
  document
    .getElementById("opDarkMode")
    .addEventListener("click", toggleDarkMode);

  // Logout
  document
    .getElementById("logoutBtn")
    .addEventListener("click", logoutOperator);

  // Refresh
  document
    .getElementById("refreshBtn")
    .addEventListener("click", refreshDashboard);

  // Notifications
  document
    .getElementById("notifyBtn")
    .addEventListener("click", showNotifications);

  // Dashboard actions
  document
    .getElementById("startProcessing")
    .addEventListener("click", startProcessing);
  document
    .getElementById("viewAllOrders")
    .addEventListener("click", () => navigateToSection("orders"));

  // Orders
  document
    .getElementById("orderFilter")
    .addEventListener("change", filterOrders);
  document.getElementById("orderSort").addEventListener("change", sortOrders);
  document
    .getElementById("bulkUpdateBtn")
    .addEventListener("click", bulkUpdateOrders);
  document
    .getElementById("selectAllOrders")
    .addEventListener("change", toggleSelectAllOrders);

  // Offline orders
  document
    .getElementById("offlineOrderForm")
    .addEventListener("submit", saveOfflineOrder);
  document
    .getElementById("orderType")
    .addEventListener("change", updateOrderForm);
  document.getElementById("quantity").addEventListener("input", calculateTotal);
  document
    .getElementById("pricePerKg")
    .addEventListener("input", calculateTotal);
  document
    .getElementById("millingFee")
    .addEventListener("input", calculateTotal);

  // Messages
  document
    .getElementById("newMessageBtn")
    .addEventListener("click", showNewMessageModal);
  document
    .getElementById("markAllRead")
    .addEventListener("click", markAllMessagesRead);
  document
    .getElementById("sendMessageBtn")
    .addEventListener("click", sendMessage);
  document
    .getElementById("messageInput")
    .addEventListener("input", toggleSendButton);
  document
    .getElementById("recipientType")
    .addEventListener("change", updateRecipientSelect);
  document
    .getElementById("newMessageForm")
    .addEventListener("submit", sendNewMessage);

  // History
  document
    .getElementById("filterHistory")
    .addEventListener("click", filterHistory);
  document
    .getElementById("exportHistory")
    .addEventListener("click", exportHistory);
  document.getElementById("prevPage").addEventListener("click", previousPage);
  document.getElementById("nextPage").addEventListener("click", nextPage);

  // Settings
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const tab = this.dataset.tab;
      switchTab(tab);
    });
  });

  document
    .getElementById("saveSettings")
    .addEventListener("click", saveAllSettings);
  document
    .getElementById("changePasswordForm")
    .addEventListener("submit", changePassword);
  document
    .getElementById("enable2FA")
    .addEventListener("click", enableTwoFactor);
  document.getElementById("fontSize").addEventListener("input", updateFontSize);

  // Profile picture change
  document
    .getElementById("profileImageUpload")
    .addEventListener("change", handleProfileImageUpload);

  // Help
  document
    .getElementById("refreshInventory")
    .addEventListener("click", refreshInventory);

  // Close modals
  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.closest(".modal").style.display = "none";
    });
  });

  // Window close modal
  window.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none";
    }
  });
}

// Navigation
function navigateToSection(sectionId) {
  // Update active nav item
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });
  document.querySelector(`a[href="#${sectionId}"]`).classList.add("active");

  // Update active section
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
  });
  document.getElementById(sectionId).classList.add("active");

  // Update page title
  const pageTitle = document.getElementById("pageTitle");
  const titles = {
    dashboard: "Operator Dashboard",
    orders: "My Orders",
    offline: "Offline Orders",
    messages: "Messages",
    history: "Order History",
    drivers: "Drivers Management",
    settings: "Settings",
  };
  pageTitle.textContent = titles[sectionId] || "Operator Dashboard";

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
        case 'drivers':
            loadDriversSection();
            // Initialize map if not already initialized
            setTimeout(() => {
                if (!googleMap) {
                    initializeGoogleMap();
                } else {
                    loadDriversOnMap();
                }
            }, 100);
            break;
        case 'settings':
            loadSettingsData();
            break;
    }
}

// Dashboard Functions
function loadDashboardData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");

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
  const today = new Date().toISOString().split("T")[0];

  // Get operator's assigned orders
  const assignedOrders = orders.filter(
    (order) =>
      order.assignedTo === currentOperator.id ||
      (order.assignedTo && order.assignedTo.includes(currentOperator.id))
  );

  // Today's stats
  const todayOrders = assignedOrders.filter(
    (o) => o.orderDate && o.orderDate.startsWith(today)
  );
  const pendingOrders = assignedOrders.filter(
    (o) => o.status === "pending" || o.status === "processing"
  );
  const completedToday = todayOrders.filter(
    (o) => o.status === "completed"
  ).length;
  const processingNow = assignedOrders.filter(
    (o) => o.status === "processing"
  ).length;

  // Calculate earnings
  const todayEarnings = todayOrders
    .filter((o) => o.status === "completed")
    .reduce((sum, order) => sum + (order.total || 0), 0);

  // Update DOM
  document.getElementById("todayOrders").textContent = todayOrders.length;
  document.getElementById("pendingOrders").textContent = pendingOrders.length;
  document.getElementById("totalAssigned").textContent = assignedOrders.length;
  document.getElementById("completedToday").textContent = completedToday;
  document.getElementById("processingNow").textContent = processingNow;
  document.getElementById("todayEarnings").textContent =
    formatCurrency(todayEarnings);
  document.getElementById("pendingCount").textContent = pendingOrders.length;
}

function loadAssignedInventory(data) {
  const warehouse = data.warehouse || {};
  const assignments = currentOperator.assignments || [];
  const inventoryList = document.getElementById("assignedInventory");

  inventoryList.innerHTML = "";

  let lowInventoryCount = 0;

  // Get inventory items for assigned categories
  Object.entries(warehouse).forEach(([itemName, item]) => {
    if (
      assignments.some(
        (assignment) =>
          (item.category &&
            item.category.toLowerCase().includes(assignment.toLowerCase())) ||
          itemName.toLowerCase().includes(assignment.toLowerCase())
      )
    ) {
      const quantity = item.quantity || 0;
      const alertLevel = item.alertLevel || 0;
      const percentage = Math.min((quantity / alertLevel) * 100, 100);

      let statusClass = "high";
      if (quantity < alertLevel * 0.3) statusClass = "low";
      else if (quantity < alertLevel * 0.6) statusClass = "medium";

      if (statusClass === "low") lowInventoryCount++;

      const itemDiv = document.createElement("div");
      itemDiv.className = `inventory-item ${statusClass}`;
      itemDiv.innerHTML = `
                <div class="inventory-name">
                    <strong>${itemName}</strong>
                    <br>
                    <small>${item.category || "Uncategorized"}</small>
                </div>
                <div class="inventory-stats">
                    <span class="inventory-quantity">${formatNumber(
                      quantity
                    )} kg</span>
                    <div class="inventory-progress">
                        <div class="progress-bar ${statusClass}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
      inventoryList.appendChild(itemDiv);
    }
  });

  // Show inventory alert if needed
  const inventoryAlert = document.getElementById("inventoryAlert");
  if (lowInventoryCount > 0) {
    inventoryAlert.style.display = "block";
    inventoryAlert.querySelector(
      "p"
    ).textContent = `${lowInventoryCount} items are low in stock!`;
  } else {
    inventoryAlert.style.display = "none";
  }
}

function loadRecentOrders(data) {
  const orders = data.orders || [];
  const customers = data.customers || [];
  const products = data.products || [];

  // Get operator's recent orders
  const recentOrders = orders
    .filter(
      (order) =>
        order.assignedTo === currentOperator.id ||
        (order.assignedTo && order.assignedTo.includes(currentOperator.id))
    )
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
    .slice(0, 5);

  const ordersList = document.getElementById("recentOrdersList");
  ordersList.innerHTML = "";

  if (recentOrders.length === 0) {
    ordersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>No recent orders</p>
            </div>
        `;
    return;
  }
 
  recentOrders.forEach((order) => {
    const customer = customers.find((c) => c.id === order.customerId);
    const product = products.find((p) => p.id === order.productId);

    const orderDiv = document.createElement("div");
    orderDiv.className = "order-item";
    orderDiv.innerHTML = `
            <div class="order-info">
                <h4>${
                  product ? product.name : order.productName || "Product"
                }</h4>
                <div class="order-details">
                    <span><i class="fas fa-user"></i> ${
                      customer ? customer.name : "Customer"
                    }</span>
                    <span><i class="fas fa-balance-scale"></i> ${
                      order.quantity || 0
                    } kg</span>
                    <span><i class="fas fa-money-bill"></i> ${formatCurrency(
                      order.total || 0
                    )}</span>
                </div>
            </div>
            <div class="order-status status-${order.status || "pending"}">
                ${
                  order.status
                    ? order.status.charAt(0).toUpperCase() +
                      order.status.slice(1)
                    : "Pending"
                }
            </div>
        `;
    ordersList.appendChild(orderDiv);
  });
}

// Orders Functions - UPDATED
function loadOrdersData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  currentOrders = usersData.orders || [];

  updateOrdersTable();
}

// Add initialization data function to create sample drivers with locations
function initializeSampleDrivers() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    
    if (!usersData.drivers || usersData.drivers.length === 0) {
        usersData.drivers = [
            {
                id: 'driver_001',
                name: 'John Smith',
                phone: '+251911223344',
                vehicle: 'Toyota Hilux',
                license: 'ET-123456',
                status: 'available',
                location: { lat: 9.035, lng: 38.745 },
                lastLocationUpdate: new Date().toISOString(),
                photo: 'https://ui-avatars.com/api/?name=John+Smith&background=4CAF50&color=fff'
            },
            {
                id: 'driver_002',
                name: 'Michael Johnson',
                phone: '+251922334455',
                vehicle: 'Ford Ranger',
                license: 'ET-234567',
                status: 'on_delivery',
                location: { lat: 9.025, lng: 38.735 },
                lastLocationUpdate: new Date().toISOString(),
                currentOrder: Date.now() - 1000,
                photo: 'https://ui-avatars.com/api/?name=Michael+Johnson&background=FF9800&color=fff'
            },
            {
                id: 'driver_003',
                name: 'David Williams',
                phone: '+251933445566',
                vehicle: 'Isuzu D-Max',
                license: 'ET-345678',
                status: 'available',
                location: { lat: 9.045, lng: 38.755 },
                lastLocationUpdate: new Date().toISOString(),
                photo: 'https://ui-avatars.com/api/?name=David+Williams&background=4CAF50&color=fff'
            },
            {
                id: 'driver_004',
                name: 'Robert Brown',
                phone: '+251944556677',
                vehicle: 'Mitsubishi L200',
                license: 'ET-456789',
                status: 'busy',
                location: { lat: 9.015, lng: 38.725 },
                lastLocationUpdate: new Date().toISOString(),
                photo: 'https://ui-avatars.com/api/?name=Robert+Brown&background=F44336&color=fff'
            }
        ];
        
        localStorage.setItem('millUsers', JSON.stringify(usersData));
    }
}



function updateOrdersTable() {
  const tableBody = document.getElementById("ordersTableBody");
  const noOrdersMessage = document.getElementById("noOrdersMessage");

  // Filter orders assigned to this operator
  const assignedOrders = currentOrders.filter(
    (order) =>
      order.assignedTo === currentOperator.id ||
      (order.assignedTo && order.assignedTo.includes(currentOperator.id))
  );

  // Apply filters
  const filter = document.getElementById("orderFilter").value;
  let filteredOrders = assignedOrders;

  if (filter !== "all") {
    filteredOrders = assignedOrders.filter((order) => order.status === filter);
  }

  // Apply sorting
  const sort = document.getElementById("orderSort").value;
  filteredOrders.sort((a, b) => {
    switch (sort) {
      case "newest":
        return new Date(b.orderDate) - new Date(a.orderDate);
      case "oldest":
        return new Date(a.orderDate) - new Date(b.orderDate);
      case "priority":
        return (b.priority || 0) - (a.priority || 0);
      default:
        return 0;
    }
  });

  tableBody.innerHTML = "";

  if (filteredOrders.length === 0) {
    noOrdersMessage.style.display = "block";
    tableBody.style.display = "none";
    return;
  }

  noOrdersMessage.style.display = "none";
  tableBody.style.display = "table-row-group";

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const customers = usersData.customers || [];
  const products = usersData.products || [];

  filteredOrders.forEach((order) => {
    const customer = customers.find((c) => c.id === order.customerId);
    const product = products.find((p) => p.id === order.productId);

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>
                <input type="checkbox" class="order-checkbox" data-id="${
                  order.id
                }">
            </td>
            <td>#${order.id.toString().slice(-6)}</td>
            <td>${customer ? customer.name : "Walk-in Customer"}</td>
            <td>${product ? product.name : order.productName || "N/A"}</td>
            <td>${order.quantity || 0} kg</td>
            <td>${order.orderType || "Purchase"}</td>
            <td>
                <select class="status-select" data-id="${
                  order.id
                }" onchange="updateOrderStatus(${order.id}, this.value)">
                    <option value="pending" ${
                      order.status === "pending" ? "selected" : ""
                    }>Pending</option>
                    <option value="processing" ${
                      order.status === "processing" ? "selected" : ""
                    }>Processing</option>
                    <option value="completed" ${
                      order.status === "completed" ? "selected" : ""
                    }>Completed</option>
                    <option value="cancelled" ${
                      order.status === "cancelled" ? "selected" : ""
                    }>Cancelled</option>
                </select>
            </td>
            <td>${formatDate(order.orderDate)}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="viewOrderDetails(${
                  order.id
                })" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline" onclick="notifyCustomer(${
                  order.id
                })" title="Notify">
                    <i class="fas fa-bell"></i>
                </button>
                <button class="btn btn-sm btn-outline" onclick="messageCustomer(${
                  order.customerId
                })" title="Message">
                    <i class="fas fa-comment"></i>
                </button>
                ${
                  order.status === "processing"
                    ? `<button class="btn btn-sm btn-outline" onclick="assignDriverToOrder(${order.id})" title="Assign Driver">
                    <i class="fas fa-truck"></i>
                </button>`
                    : ""
                }
            </td>
        `;
    tableBody.appendChild(row);
  });

  // Update badge
  const pendingCount = assignedOrders.filter(
    (o) => o.status === "pending"
  ).length;
  document.getElementById("ordersBadge").textContent = pendingCount;
}

// UPDATED: View Order Details with Payment Screenshots
function viewOrderDetails(orderId) {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const order = usersData.orders.find((o) => o.id == orderId);

  if (!order) return;

  const customer = usersData.customers.find((c) => c.id === order.customerId);
  const product = usersData.products.find((p) => p.id === order.productId);
  const assignedDriver = order.assignedDriver
    ? currentDrivers.find((d) => d.id === order.assignedDriver)
    : null;

  const content = document.getElementById("orderDetailsContent");
  content.innerHTML = `
        <div class="order-detail-section">
            <h4>Order Information</h4>
            <p><strong>Order ID:</strong> #${order.id.toString().slice(-6)}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Order Date:</strong> ${formatDate(order.orderDate)}</p>
            <p><strong>Type:</strong> ${order.orderType || "Purchase"}</p>
            <p><strong>Assigned Driver:</strong> ${
              assignedDriver ? assignedDriver.name : "Not Assigned"
            }</p>
        </div>
        
        <div class="order-detail-section">
            <h4>Customer Information</h4>
            <p><strong>Name:</strong> ${
              customer ? customer.name : "Walk-in Customer"
            }</p>
            ${
              customer ? `<p><strong>Phone:</strong> ${customer.phone}</p>` : ""
            }
            ${
              customer
                ? `<p><strong>Address:</strong> ${
                    customer.address || "N/A"
                  }</p>`
                : ""
            }
        </div>
        
        <div class="order-detail-section">
            <h4>Product Details</h4>
            <p><strong>Product:</strong> ${
              product ? product.name : order.productName || "N/A"
            }</p>
            <p><strong>Quantity:</strong> ${order.quantity || 0} kg</p>
            <p><strong>Price per kg:</strong> ${formatCurrency(
              order.pricePerKg || 0
            )}</p>
            <p><strong>Milling Fee:</strong> ${formatCurrency(
              order.millingFee || 0
            )}</p>
            <p><strong>Total Amount:</strong> ${formatCurrency(
              order.total || 0
            )}</p>
        </div>
        
        <div class="order-detail-section">
            <h4>Payment Screenshots</h4>
            <div class="payment-screenshots">
                ${
                  order.paymentScreenshots
                    ? order.paymentScreenshots
                        .map(
                          (img, index) => `
                    <div class="payment-image-container">
                        <img src="${img}" alt="Payment Screenshot ${
                            index + 1
                          }" class="payment-image">
                        <a href="${img}" target="_blank" class="btn btn-sm btn-outline">View Full</a>
                    </div>
                `
                        )
                        .join("")
                    : "<p>No payment screenshots available</p>"
                }
            </div>
        </div>
        
        <div class="order-detail-section">
            <h4>Order Actions</h4>
            <select class="status-select form-control" onchange="updateOrderStatus(${
              order.id
            }, this.value)">
                <option value="pending" ${
                  order.status === "pending" ? "selected" : ""
                }>Pending</option>
                <option value="processing" ${
                  order.status === "processing" ? "selected" : ""
                }>Processing</option>
                <option value="completed" ${
                  order.status === "completed" ? "selected" : ""
                }>Completed</option>
                <option value="cancelled" ${
                  order.status === "cancelled" ? "selected" : ""
                }>Cancelled</option>
            </select>
            
            ${
              order.status === "processing"
                ? `
                <div class="assign-driver-section mt-3">
                    <label for="driverSelect">Assign Driver:</label>
                    <select id="driverSelect" class="form-control">
                        <option value="">Select Driver</option>
                        ${currentDrivers
                          .filter((d) => d.status === "available")
                          .map(
                            (driver) => `
                            <option value="${driver.id}" ${
                              order.assignedDriver === driver.id
                                ? "selected"
                                : ""
                            }>${driver.name} - ${driver.vehicle}</option>
                        `
                          )
                          .join("")}
                    </select>
                    <button class="btn btn-primary btn-block mt-2" onclick="assignDriver(${
                      order.id
                    })">
                        <i class="fas fa-truck"></i> Assign Driver
                    </button>
                </div>
            `
                : ""
            }
            
            <button class="btn btn-primary btn-block mt-2" onclick="notifyCustomer(${
              order.id
            })">
                <i class="fas fa-bell"></i> Notify Customer
            </button>
        </div>
    `;

  document.getElementById("orderDetailsModal").style.display = "block";
}

// UPDATED: Update Order Status - Send to Admin and Customer
function updateOrderStatus(orderId, newStatus) {
  const usersData = JSON.parse(localStorage.getItem("millUsers"));
  const orderIndex = usersData.orders.findIndex((o) => o.id == orderId);

  if (orderIndex !== -1) {
    const oldStatus = usersData.orders[orderIndex].status;
    usersData.orders[orderIndex].status = newStatus;
    usersData.orders[orderIndex].updatedAt = new Date().toISOString();

    // Create notification for admin
    const adminNotification = {
      id: Date.now(),
      type: "order_status_update",
      title: "Order Status Updated",
      message: `Order #${orderId
        .toString()
        .slice(
          -6
        )} status changed from ${oldStatus} to ${newStatus} by Operator ${
        currentOperator.name
      }`,
      from: currentOperator.id,
      to: "admin",
      timestamp: new Date().toISOString(),
      read: false,
    };

    if (!usersData.notifications) usersData.notifications = [];
    usersData.notifications.push(adminNotification);

    // Create notification for customer
    const customerNotification = {
      id: Date.now() + 1,
      type: "order_status_update",
      title: "Order Status Updated",
      message: `Your order #${orderId
        .toString()
        .slice(-6)} status has been updated to ${newStatus}`,
      from: currentOperator.id,
      to: usersData.orders[orderIndex].customerId,
      timestamp: new Date().toISOString(),
      read: false,
    };

    usersData.notifications.push(customerNotification);

    // Update inventory if completed
    if (newStatus === "completed") {
      updateInventoryAfterCompletion(usersData.orders[orderIndex]);
    }

    localStorage.setItem("millUsers", JSON.stringify(usersData));
    showToast("Order status updated and notifications sent", "success");

    // Refresh data
    loadDashboardData();
    loadOrdersData();
  }
}

function loadDriversSection() {
    const usersData = JSON.parse(localStorage.getItem('millUsers') || '{}');
    const drivers = usersData.drivers || [];
    const driversList = document.getElementById('driversList');
    
    driversList.innerHTML = '';
    
    if (drivers.length === 0) {
        driversList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-truck"></i>
                <p>No drivers available</p>
            </div>
        `;
        return;
    }
    
    drivers.forEach(driver => {
        const driverCard = document.createElement('div');
        driverCard.className = 'driver-card';
        driverCard.innerHTML = `
            <div class="driver-info">
                <img src="${driver.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(driver.name) + '&background=2196F3&color=fff'}" alt="${driver.name}" class="driver-photo">
                <div class="driver-details">
                    <h4>${driver.name}</h4>
                    <p><i class="fas fa-phone"></i> ${driver.phone}</p>
                    <p><i class="fas fa-car"></i> ${driver.vehicle}</p>
                    <p><i class="fas fa-id-badge"></i> ${driver.license}</p>
                    <p class="driver-status status-${driver.status}">
                        <i class="fas fa-circle"></i> ${driver.status.replace('_', ' ').toUpperCase()}
                    </p>
                    ${driver.location ? `
                        <p class="location-info">
                            <i class="fas fa-map-marker-alt"></i> 
                            Location: ${driver.location.lat.toFixed(4)}, ${driver.location.lng.toFixed(4)}
                        </p>
                        <p class="location-time">
                            <small>Updated: ${formatTime(driver.lastLocationUpdate)}</small>
                        </p>
                    ` : ''}
                </div>
            </div>
            <div class="driver-actions">
                ${driver.location ? `
                    <button class="btn btn-sm btn-outline" onclick="centerMapOnDriver('${driver.id}')">
                        <i class="fas fa-crosshairs"></i> Center
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="simulateDriverMovement('${driver.id}')">
                        <i class="fas fa-sync-alt"></i> Move
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="getDirectionsToDriver('${driver.id}')">
                        <i class="fas fa-directions"></i> Route
                    </button>
                ` : ''}
                <button class="btn btn-sm btn-outline" onclick="messageDriver('${driver.id}')">
                    <i class="fas fa-comment"></i> Message
                </button>
            </div>
        `;
        driversList.appendChild(driverCard);
    });
}


// NEW: Assign Driver to Order
function assignDriverToOrder(orderId) {
  const usersData = JSON.parse(localStorage.getItem("millUsers"));
  const orderIndex = usersData.orders.findIndex((o) => o.id == orderId);

  if (orderIndex !== -1) {
    viewOrderDetails(orderId); // Open order details to assign driver
  }
}

function assignDriver(orderId) {
  const driverSelect = document.getElementById("driverSelect");
  const driverId = driverSelect.value;

  if (!driverId) {
    showToast("Please select a driver", "warning");
    return;
  }

  const usersData = JSON.parse(localStorage.getItem("millUsers"));
  const orderIndex = usersData.orders.findIndex((o) => o.id == orderId);
  const driver = currentDrivers.find((d) => d.id == driverId);

  if (orderIndex !== -1 && driver) {
    usersData.orders[orderIndex].assignedDriver = driverId;
    usersData.orders[orderIndex].driverAssignedAt = new Date().toISOString();

    // Update driver status
    const driverIndex = usersData.drivers.findIndex((d) => d.id == driverId);
    if (driverIndex !== -1) {
      usersData.drivers[driverIndex].status = "on_delivery";
      usersData.drivers[driverIndex].currentOrder = orderId;
    }

    // Create notification for admin
    const adminNotification = {
      id: Date.now(),
      type: "driver_assigned",
      title: "Driver Assigned",
      message: `Driver ${driver.name} assigned to order #${orderId
        .toString()
        .slice(-6)} by Operator ${currentOperator.name}`,
      from: currentOperator.id,
      to: "admin",
      timestamp: new Date().toISOString(),
      read: false,
    };

    if (!usersData.notifications) usersData.notifications = [];
    usersData.notifications.push(adminNotification);

    // Create notification for customer
    const customerNotification = {
      id: Date.now() + 1,
      type: "driver_assigned",
      title: "Driver Assigned",
      message: `Driver ${driver.name} (${driver.vehicle}) has been assigned to deliver your order`,
      from: currentOperator.id,
      to: usersData.orders[orderIndex].customerId,
      timestamp: new Date().toISOString(),
      read: false,
    };

    usersData.notifications.push(customerNotification);

    localStorage.setItem("millUsers", JSON.stringify(usersData));
    showToast(`Driver ${driver.name} assigned to order`, "success");

    // Refresh data
    loadDashboardData();
    loadOrdersData();
    loadDrivers();
    closeOrderDetails();
  }
}
loadDriversSection
// Drivers Section Functions
// function loadDriversSection() {
//   const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
//   const drivers = usersData.drivers || [];
//   const driversList = document.getElementById("driversList");
//   const mapContainer = document.getElementById("mapContainer");

//   driversList.innerHTML = "";

//   if (drivers.length === 0) {
//     driversList.innerHTML = `
//             <div class="empty-state">
//                 <i class="fas fa-truck"></i>
//                 <p>No drivers available</p>
//             </div>
//         `;
//     return;
//   }

//   drivers.forEach((driver) => {
//     const driverCard = document.createElement("div");
//     driverCard.className = "driver-card";
//     driverCard.innerHTML = `
//             <div class="driver-info">
//                 <img src="${
//                   driver.photo ||
//                   "https://ui-avatars.com/api/?name=" +
//                     encodeURIComponent(driver.name) +
//                     "&background=2196F3&color=fff"
//                 }" alt="${driver.name}" class="driver-photo">
//                 <div class="driver-details">
//                     <h4>${driver.name}</h4>
//                     <p><i class="fas fa-phone"></i> ${driver.phone}</p>
//                     <p><i class="fas fa-car"></i> ${driver.vehicle}</p>
//                     <p><i class="fas fa-id-badge"></i> ${driver.license}</p>
//                     <p class="driver-status status-${driver.status}">
//                         <i class="fas fa-circle"></i> ${driver.status
//                           .replace("_", " ")
//                           .toUpperCase()}
//                     </p>
//                 </div>
//             </div>
//             <div class="driver-actions">
//                 ${
//                   driver.currentOrder
//                     ? `
//                     <button class="btn btn-sm btn-outline" onclick="viewDriverLocation('${driver.id}')">
//                         <i class="fas fa-map-marker-alt"></i> Track Location
//                     </button>
//                     <button class="btn btn-sm btn-outline" onclick="viewAssignedOrder(${driver.currentOrder})">
//                         <i class="fas fa-box"></i> View Order
//                     </button>
//                 `
//                     : `
//                     <button class="btn btn-sm btn-outline" onclick="messageDriver('${driver.id}')">
//                         <i class="fas fa-comment"></i> Message
//                     </button>
//                 `
//                 }
//             </div>
//         `;
//     driversList.appendChild(driverCard);
//   });

//   // Initialize map (placeholder for Google Maps integration)
//   mapContainer.innerHTML = `
//         <div class="map-placeholder">
//             <i class="fas fa-map-marked-alt"></i>
//             <p>Google Maps Integration</p>
//             <p class="small">Driver locations would appear here with real-time tracking</p>
//         </div>
//     `;
// }
// Sidebar Toggle Functionality
const menuToggle = document.getElementById('menuToggle');
const operatorSidebar = document.querySelector('.operator-sidebar');
const operatorMain = document.querySelector('.operator-main');
const body = document.body;

// Toggle sidebar
menuToggle.addEventListener('click', function() {
    operatorSidebar.classList.toggle('active');
    body.classList.toggle('sidebar-open');
    
    // Change menu icon
    const icon = this.querySelector('i');
    if (operatorSidebar.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(event) {
    const isMobile = window.innerWidth <= 992;
    const isClickInsideSidebar = operatorSidebar.contains(event.target);
    const isClickOnMenuToggle = menuToggle.contains(event.target);
    
    if (isMobile && operatorSidebar.classList.contains('active') && 
        !isClickInsideSidebar && !isClickOnMenuToggle) {
        operatorSidebar.classList.remove('active');
        body.classList.remove('sidebar-open');
        menuToggle.querySelector('i').classList.remove('fa-times');
        menuToggle.querySelector('i').classList.add('fa-bars');
    }
});

// Close sidebar when clicking on a link (mobile only)
document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', function() {
        if (window.innerWidth <= 992) {
            operatorSidebar.classList.remove('active');
            body.classList.remove('sidebar-open');
            menuToggle.querySelector('i').classList.remove('fa-times');
            menuToggle.querySelector('i').classList.add('fa-bars');
        }
    });
});

// Handle window resize
window.addEventListener('resize', function() {
    if (window.innerWidth > 992) {
        // On large screens, ensure sidebar is visible
        operatorSidebar.classList.add('active');
        body.classList.remove('sidebar-open');
    } else {
        // On small screens, hide sidebar if it was manually closed
        if (!operatorSidebar.classList.contains('active')) {
            operatorSidebar.classList.remove('active');
        }
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.innerWidth <= 992) {
        operatorSidebar.classList.remove('active');
        body.classList.remove('sidebar-open');
    } else {
        operatorSidebar.classList.add('active');
    }
});
// function viewDriverLocation(driverId) {
//   const driver = currentDrivers.find((d) => d.id === driverId);
//   if (driver && driver.location) {
//     // In a real implementation, this would open Google Maps with driver's location
//     const mapUrl = `https://www.google.com/maps?q=${driver.location.lat},${driver.location.lng}`;
//     window.open(mapUrl, "_blank");
//     showToast(`Opening ${driver.name}'s location on Google Maps`, "info");
//   } else {
//     showToast("Driver location not available", "warning");
//   }
// }
// Handle Google Maps API errors
window.gm_authFailure = function() {
    document.getElementById('googleMap').innerHTML = `
        <div class="map-error">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Google Maps Error</h4>
            <p>There was an issue loading Google Maps.</p>
            <p>Please check your API key and billing settings.</p>
            <a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank">
                Get API Key
            </a>
        </div>
    `;
    showToast('Google Maps failed to load. Check API key.', 'error');
};
function viewAssignedOrder(orderId) {
  viewOrderDetails(orderId);
}

function messageDriver(driverId) {
  navigateToSection("messages");
  // Focus on driver chat
  showToast("Opening chat with driver", "info");
}

// Messages Functions - FIXED
function loadMessagesData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  currentMessages = usersData.messages || [];

  loadContacts();
  updateMessagesBadge();
}

function loadContacts() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const customers = usersData.customers || [];
  const drivers = usersData.drivers || [];
  const admin = usersData.admin?.[0];
  const contactsList = document.getElementById("contactsList");

  contactsList.innerHTML = "";

  // Add admin contact
  if (admin) {
    const adminContact = createContactItem(admin, "admin");
    contactsList.appendChild(adminContact);
  }

  // Add driver contacts
  drivers.forEach((driver) => {
    const driverContact = createContactItem(driver, "driver");
    contactsList.appendChild(driverContact);
  });

  // Add customer contacts (only assigned ones)
  const assignments = currentOperator.assignments || [];
  customers.forEach((customer) => {
    // Check if customer has orders assigned to this operator
    const hasAssignedOrders = (usersData.orders || []).some(
      (order) =>
        order.customerId === customer.id &&
        (order.assignedTo === currentOperator.id ||
          (order.assignedTo && order.assignedTo.includes(currentOperator.id)))
    );

    if (hasAssignedOrders) {
      const customerContact = createContactItem(customer, "customer");
      contactsList.appendChild(customerContact);
    }
  });
}

function createContactItem(user, type) {
  const messages = currentMessages.filter(
    (msg) =>
      (msg.senderId === user.id && msg.receiverId === currentOperator.id) ||
      (msg.receiverId === user.id && msg.senderId === currentOperator.id)
  );

  const unreadCount = messages.filter(
    (msg) => msg.receiverId === currentOperator.id && !msg.read
  ).length;

  const lastMessage = messages[messages.length - 1];

  const contactDiv = document.createElement("div");
  contactDiv.className = "contact-item";
  contactDiv.dataset.userId = user.id;
  contactDiv.dataset.userType = type;
  contactDiv.onclick = () => openChat(user, type);

  // Determine background color based on type
  let bgColor = "2196F3"; // Default blue
  if (type === "admin") bgColor = "4CAF50"; // Green for admin
  if (type === "driver") bgColor = "FF9800"; // Orange for drivers

  contactDiv.innerHTML = `
        <div class="contact-avatar">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
              user.name
            )}&background=${bgColor}&color=fff" alt="${user.name}">
        </div>
        <div class="contact-info">
            <h4>${user.name}</h4>
            <p>${
              lastMessage
                ? lastMessage.content?.substring(0, 30) + "..." || ""
                : type.charAt(0).toUpperCase() + type.slice(1)
            }</p>
        </div>
        ${
          unreadCount > 0
            ? `<span class="unread-badge">${unreadCount}</span>`
            : ""
        }
    `;

  return contactDiv;
}

function openChat(user, type) {
  // Update chat header
  const chatHeader = document.getElementById("chatHeader");
  const bgColor =
    type === "admin" ? "4CAF50" : type === "driver" ? "FF9800" : "2196F3";

  chatHeader.innerHTML = `
        <div class="chat-user">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
              user.name
            )}&background=${bgColor}&color=fff" alt="${user.name}">
            <div class="chat-user-info">
                <h4>${user.name}</h4>
                <p>${type.charAt(0).toUpperCase() + type.slice(1)}</p>
            </div>
        </div>
    `;

  // Save current chat user ID
  chatHeader.dataset.userId = user.id;

  // Load messages
  loadChatMessages(user.id);

  // Update chat info panel
  const chatInfoPanel = document.getElementById("chatInfoPanel");
  chatInfoPanel.innerHTML = `
        <h4>Contact Information</h4>
        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>${type === "admin" ? "Email" : "Phone"}:</strong> ${
    type === "admin" ? user.email : user.phone
  }</p>
        ${
          user.address ? `<p><strong>Address:</strong> ${user.address}</p>` : ""
        }
        ${
          type === "customer"
            ? `<button class="btn btn-sm btn-outline btn-block" onclick="viewCustomerOrders(${user.id})">View Orders</button>`
            : ""
        }
        ${
          type === "driver"
            ? `<button class="btn btn-sm btn-outline btn-block" onclick="viewDriverLocation('${user.id}')">Track Location</button>`
            : ""
        }
    `;

  // Mark messages as read
  markMessagesAsRead(user.id);
}

// FIXED: Send Message Function
function sendMessage() {
  const messageInput = document.getElementById("messageInput");
  const content = messageInput.value.trim();

  if (!content) return;

  // Get current chat user
  const chatHeader = document.getElementById("chatHeader");
  const receiverId = chatHeader.dataset.userId;

  if (!receiverId) {
    showToast("Please select a contact to message", "warning");
    return;
  }

  const newMessage = {
    id: Date.now(),
    senderId: currentOperator.id,
    senderName: currentOperator.name,
    senderRole: "operator",
    receiverId: receiverId,
    content: content,
    timestamp: new Date().toISOString(),
    read: false,
    type: "text",
  };

  const usersData = JSON.parse(localStorage.getItem("millUsers"));
  if (!usersData.messages) usersData.messages = [];
  usersData.messages.push(newMessage);
  localStorage.setItem("millUsers", JSON.stringify(usersData));

  // Clear input
  messageInput.value = "";
  toggleSendButton();

  // Reload messages
  loadMessagesData();
  loadChatMessages(receiverId);

  showToast("Message sent", "success");
}

// Profile Picture Functions
function handleProfileImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check if image
  if (!file.type.match("image.*")) {
    showToast("Please select an image file", "error");
    return;
  }

  // Check file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToast("Image size should be less than 2MB", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const imageUrl = e.target.result;

    // Save to localStorage
    localStorage.setItem(
      `operator_${currentOperator.id}_profile_image`,
      imageUrl
    );

    // Update profile pictures
    document.getElementById("operatorAvatar").src = imageUrl;
    document.getElementById("currentProfilePic").src = imageUrl;

    // Update operator data
    const usersData = JSON.parse(localStorage.getItem("millUsers"));
    const operatorIndex = usersData.operators?.findIndex(
      (o) => o.id === currentOperator.id
    );

    if (operatorIndex !== -1 && usersData.operators) {
      usersData.operators[operatorIndex].profileImage = imageUrl;
      localStorage.setItem("millUsers", JSON.stringify(usersData));
      currentOperator.profileImage = imageUrl;
      localStorage.setItem("currentUser", JSON.stringify(currentOperator));
    }

    showToast("Profile picture updated successfully!", "success");
  };

  reader.readAsDataURL(file);
}

function changeProfilePicture() {
  document.getElementById("profileImageUpload").click();
}

function removeProfilePicture() {
  // Remove from localStorage
  localStorage.removeItem(`operator_${currentOperator.id}_profile_image`);

  // Update operator data
  const usersData = JSON.parse(localStorage.getItem("millUsers"));
  const operatorIndex = usersData.operators?.findIndex(
    (o) => o.id === currentOperator.id
  );

  if (operatorIndex !== -1 && usersData.operators) {
    delete usersData.operators[operatorIndex].profileImage;
    localStorage.setItem("millUsers", JSON.stringify(usersData));
  }

  // Use default avatar
  const initials = currentOperator.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    initials
  )}&background=2196F3&color=fff`;

  document.getElementById("operatorAvatar").src = avatarUrl;
  document.getElementById("currentProfilePic").src = avatarUrl;

  delete currentOperator.profileImage;
  localStorage.setItem("currentUser", JSON.stringify(currentOperator));

  showToast("Profile picture removed", "success");
}

// Keep other functions as they are (they remain mostly the same)
// [Rest of the functions remain the same as in the original file...]

// Utility Functions
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(number) {
  return new Intl.NumberFormat().format(number);
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  document.getElementById("currentDate").textContent = `${dateStr} ${timeStr}`;
}

function toggleDarkMode() {
  const body = document.body;
  const icon = document.querySelector("#opDarkMode i");

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

function logoutOperator() {
  localStorage.removeItem("currentUser");
  window.location.href = "../index.html";
}

function refreshDashboard() {
  loadDashboardData();
  showToast("Data refreshed successfully!", "success");
}

function showToast(message, type = "success") {
  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
        <i class="fas fa-${
          type === "success"
            ? "check-circle"
            : type === "error"
            ? "exclamation-circle"
            : "info-circle"
        }"></i>
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
    if (document.querySelector(".content-section.active").id === "dashboard") {
      loadDashboardData();
    }
  }, 300000);

  // Update time every minute
  setInterval(updateDateTime, 60000);
}

// Initialize on load
window.addEventListener("load", function () {
  // Check for dark mode preference
  const savedTheme = localStorage.getItem("theme");
  const darkModeBtn = document.getElementById("opDarkMode");

  if (savedTheme === "dark") {
    document.body.setAttribute("data-theme", "dark");
    if (darkModeBtn) {
      const icon = darkModeBtn.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
      }
    }
  }
});
