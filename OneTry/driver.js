// Driver Delivery System - Main JavaScript

document.addEventListener("DOMContentLoaded", function () {
  // Initialize the application
  initApp();

  // Global variables
  let currentOrder = null;
  let newOrderAssignment = null;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let driverStatus = "offline";
  let currentSection = "dashboard";
  let currentLocation = null;
  let currentMap = null;
  let routeMap = null;
  
  // Mock data for orders
  const mockOrders = [
    {
      id: "ORD-1001",
      customer: "John Smith",
      address: "123 Main St, Apt 4B, New York, NY 10001",
      phone: "***-***-1234",
      items: [
        { name: "Pizza Margherita", quantity: 2, weight: "1.2kg" },
        { name: "Garlic Bread", quantity: 1, weight: "0.5kg" },
        { name: "Cola", quantity: 1, weight: "0.8kg" }
      ],
      totalWeight: "2.5kg",
      description: "Large pizza with extra cheese",
      instructions: "Leave at door, don't ring bell. Dog will bark.",
      status: "assigned",
      deliveryStage: 0,
      destination: "123 Main St, New York, NY 10001",
      assignedTime: "10:30 AM",
      estimatedDelivery: "11:30 AM",
      value: "$45.99"
    },
    {
      id: "ORD-1002",
      customer: "Sarah Johnson",
      address: "456 Oak Ave, Suite 12, Brooklyn, NY 11201",
      phone: "***-***-5678",
      items: [
        { name: "Chicken Burger", quantity: 3, weight: "1.8kg" },
        { name: "Fries", quantity: 2, weight: "0.6kg" },
        { name: "Milkshake", quantity: 2, weight: "1.2kg" }
      ],
      totalWeight: "3.6kg",
      description: "Spicy chicken burgers with extra sauce",
      instructions: "Call upon arrival. Apartment intercom is broken.",
      status: "pickup",
      deliveryStage: 1,
      destination: "456 Oak Ave, Brooklyn, NY 11201",
      assignedTime: "11:15 AM",
      estimatedDelivery: "12:15 PM",
      value: "$32.50"
    },
    {
      id: "ORD-1003",
      customer: "Robert Chen",
      address: "789 Pine Rd, Queens, NY 11355",
      phone: "***-***-9012",
      items: [
        { name: "Sushi Platter", quantity: 1, weight: "1.5kg" },
        { name: "Miso Soup", quantity: 2, weight: "0.8kg" },
        { name: "Green Tea", quantity: 1, weight: "0.3kg" }
      ],
      totalWeight: "2.6kg",
      description: "Fresh sushi with soy sauce and wasabi",
      instructions: "Park in visitor spot #3. No nuts allergy.",
      status: "pickedup",
      deliveryStage: 2,
      destination: "789 Pine Rd, Queens, NY 11355",
      assignedTime: "12:00 PM",
      estimatedDelivery: "1:00 PM",
      value: "$58.75"
    }
  ];

  // Canvas for signature
  const canvas = document.getElementById("signatureCanvas");
  const ctx = canvas.getContext("2d");

  // Initialize canvas
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000";

  // App initialization
  function initApp() {
    // Check if user is logged in
    checkLoginStatus();

    // Load saved settings
    loadSettings();

    // Set up navigation
    setupNavigation();

    // Initialize maps
    initCurrentLocationMap();
    initRouteMap();

    // Load mock orders
    renderOrderList();

    // Set up status selector
    setupStatusSelector();

    // Set up event listeners
    setupEventListeners();

    // Initialize signature canvas
    initSignatureCanvas();

    // Simulate a new order assignment after 3 seconds
    setTimeout(simulateNewOrder, 3000);

    // Update location periodically
    updateDriverLocation();
    setInterval(updateDriverLocation, 30000); // Update every 30 seconds

    // Show welcome notification
    showNotification(
      "Driver portal loaded successfully. You have " +
        mockOrders.length +
        " assigned orders.",
      "success"
    );
  }

  // Check login status
  function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem("driverLoggedIn");
    if (!isLoggedIn) {
      // Redirect to login page
      window.location.href = "index.html";
    }
  }

  // Load saved settings
  function loadSettings() {
    // Load dark mode preference
    const darkMode = localStorage.getItem("darkMode") === "true";
    if (darkMode) {
      document.body.classList.add("dark-mode");
      document.getElementById("darkModeToggle").checked = true;
    }

    // Load driver status
    const savedStatus = localStorage.getItem("driverStatus");
    if (savedStatus) {
      driverStatus = savedStatus;
      document.getElementById("status-selector").value = savedStatus;
      updateStatusIndicator(savedStatus);
    }

    // Load notification preferences
    loadNotificationPreferences();
  }

  // Set up navigation
  function setupNavigation() {
    const menuItems = document.querySelectorAll(".sidebar-menu li");
    menuItems.forEach(item => {
      item.addEventListener("click", function() {
        const section = this.dataset.section;
        navigateToSection(section);
        
        // Update active menu item
        menuItems.forEach(i => i.classList.remove("active"));
        this.classList.add("active");
      });
    });

    // Sidebar toggle
    document.getElementById("sidebarToggle").addEventListener("click", function() {
      document.getElementById("sidebar").classList.toggle("collapsed");
    });
  }

  // Navigate to section
  function navigateToSection(section) {
    // Hide all sections
    document.querySelectorAll(".content-section").forEach(sec => {
      sec.classList.remove("active");
    });

    // Show selected section
    document.getElementById(section + "Section").classList.add("active");

    // Update title
    const titles = {
      "dashboard": "Dashboard",
      "new-orders": "My New Orders",
      "current-status": "Current Order Status",
      "proof-delivery": "Proof of Delivery",
      "navigation": "Navigation & Route",
      "communication": "Communication",
      "settings": "Settings"
    };
    document.getElementById("currentSectionTitle").textContent = titles[section];
    currentSection = section;
  }

  // Initialize current location map
  function initCurrentLocationMap() {
    const mapElement = document.getElementById("currentLocationMap");
    if (!mapElement) return;

    currentMap = L.map('currentLocationMap').setView([40.7128, -74.0060], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(currentMap);
  }

  // Initialize route map
  function initRouteMap() {
    const mapElement = document.getElementById("routeMap");
    if (!mapElement) return;

    routeMap = L.map('routeMap').setView([40.7128, -74.0060], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(routeMap);
  }

  // Update driver location
  function updateDriverLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          currentLocation = { lat: latitude, lng: longitude };
          
          // Update current location map
          if (currentMap) {
            currentMap.setView([latitude, longitude], 15);
            L.marker([latitude, longitude])
              .addTo(currentMap)
              .bindPopup('Your Current Location')
              .openPopup();
          }

          // Update timestamp
          document.getElementById("locationTimestamp").textContent = 
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          // In real app, send location to server
          console.log("Location updated:", latitude, longitude);
        },
        error => {
          console.error("Error getting location:", error);
          // Use default location
          currentLocation = { lat: 40.7128, lng: -74.0060 };
        }
      );
    }
  }

  // Render order list
  function renderOrderList() {
    const ordersGrid = document.querySelector(".orders-grid");
    if (!ordersGrid) return;

    ordersGrid.innerHTML = "";

    mockOrders.forEach((order) => {
      const orderCard = document.createElement("div");
      orderCard.className = "order-card";
      orderCard.dataset.orderId = order.id;

      orderCard.innerHTML = `
        <div class="order-card-header">
          <div class="order-id">${order.id}</div>
          <span class="order-status-badge status-${order.status}">${getStatusText(order.status)}</span>
        </div>
        <div class="order-customer">
          <p><strong>Customer:</strong> ${order.customer}</p>
          <p><strong>Address:</strong> ${order.address}</p>
        </div>
        <div class="order-items">
          <p><strong>Items (${order.totalWeight}):</strong></p>
          ${order.items.map(item => `
            <div class="order-item">
              <span>${item.quantity}x ${item.name}</span>
              <span>${item.weight}</span>
            </div>
          `).join('')}
        </div>
        <div class="order-description">
          <p><strong>Description:</strong> ${order.description}</p>
        </div>
        <div class="order-actions">
          <button class="btn btn-primary view-order-btn" data-order-id="${order.id}">
            <i class="fas fa-eye"></i> View Details
          </button>
          <button class="btn btn-success accept-order-btn" data-order-id="${order.id}">
            <i class="fas fa-check"></i> Accept
          </button>
        </div>
      `;

      ordersGrid.appendChild(orderCard);
    });

    // Add event listeners to buttons
    document.querySelectorAll(".view-order-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        const orderId = this.dataset.orderId;
        showOrderDetails(orderId);
      });
    });

    document.querySelectorAll(".accept-order-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        const orderId = this.dataset.orderId;
        acceptOrder(orderId);
      });
    });
  }

  // Show order details modal
  function showOrderDetails(orderId) {
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) return;

    const modalBody = document.getElementById("modalBody");
    modalBody.innerHTML = `
      <div class="order-details-modal">
        <div class="detail-section">
          <h4>Order Information</h4>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Customer:</strong> ${order.customer}</p>
          <p><strong>Assigned Time:</strong> ${order.assignedTime}</p>
          <p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery}</p>
          <p><strong>Order Value:</strong> ${order.value}</p>
        </div>
        
        <div class="detail-section">
          <h4>Items Details</h4>
          ${order.items.map(item => `
            <div class="item-detail">
              <p><strong>${item.name}</strong></p>
              <p>Quantity: ${item.quantity}</p>
              <p>Weight: ${item.weight}</p>
            </div>
          `).join('')}
          <p><strong>Total Weight:</strong> ${order.totalWeight}</p>
        </div>
        
        <div class="detail-section">
          <h4>Delivery Address</h4>
          <p>${order.address}</p>
          <div id="orderAddressMap" style="height: 200px; margin-top: 15px; border-radius: 8px;"></div>
        </div>
        
        <div class="detail-section">
          <h4>Special Instructions</h4>
          <p>${order.instructions}</p>
        </div>
      </div>
    `;

    // Show modal
    document.getElementById("orderDetailsModal").classList.add("active");

    // Initialize map for this order (simulated)
    setTimeout(() => {
      const mapElement = document.getElementById("orderAddressMap");
      if (mapElement) {
        const orderMap = L.map('orderAddressMap').setView([40.7128, -74.0060], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(orderMap);
        L.marker([40.7128, -74.0060]).addTo(orderMap)
          .bindPopup(order.destination)
          .openPopup();
      }
    }, 100);
  }

  // Accept order
  function acceptOrder(orderId) {
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) return;

    order.status = "accepted";
    renderOrderList();
    showNotification(`Order ${orderId} accepted successfully!`, "success");
    
    // Update order in localStorage
    updateOrderInStorage(order);
  }

  // Update order in localStorage
  function updateOrderInStorage(order) {
    const orders = JSON.parse(localStorage.getItem("driverOrders") || "[]");
    const index = orders.findIndex(o => o.id === order.id);
    if (index !== -1) {
      orders[index] = order;
    } else {
      orders.push(order);
    }
    localStorage.setItem("driverOrders", JSON.stringify(orders));
    
    // Broadcast status to customer and operator
    broadcastStatusUpdate(order);
  }

  // Broadcast status update
  function broadcastStatusUpdate(order) {
    const statusUpdate = {
      orderId: order.id,
      status: order.status,
      timestamp: new Date().toISOString(),
      driverId: "8573",
      driverName: "Driver #8573"
    };

    // Save to localStorage for customer and operator to access
    const updates = JSON.parse(localStorage.getItem("orderUpdates") || "[]");
    updates.push(statusUpdate);
    localStorage.setItem("orderUpdates", JSON.stringify(updates));

    showNotification(`Status updated and broadcasted for order ${order.id}`, "success");
  }

  // Set up status selector
  function setupStatusSelector() {
    const statusSelector = document.getElementById("status-selector");
    statusSelector.addEventListener("change", function () {
      driverStatus = this.value;
      updateStatusIndicator(driverStatus);
      localStorage.setItem("driverStatus", driverStatus);
      
      showNotification(`Status updated to: ${driverStatus.toUpperCase()}`, "success");
    });
  }

  // Update status indicator
  function updateStatusIndicator(status) {
    const indicators = document.querySelectorAll(".status-indicator");
    indicators.forEach(indicator => {
      indicator.className = `status-indicator status-${status}`;
    });
    
    // Update sidebar text
    const statusText = document.getElementById("sidebarStatusText");
    if (statusText) {
      statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  // Initialize signature canvas
  function initSignatureCanvas() {
    if (!canvas) return;

    // Mouse events for desktop
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);

    // Touch events for mobile
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchmove", handleTouchMove);
    canvas.addEventListener("touchend", stopDrawing);
  }

  // Signature functions
  function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
  }

  function draw(e) {
    if (!isDrawing) return;

    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastX = x;
    lastY = y;
  }

  function stopDrawing() {
    isDrawing = false;
  }

  // Touch handlers for mobile
  function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    canvas.dispatchEvent(mouseEvent);
  }

  function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousemove", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    canvas.dispatchEvent(mouseEvent);
  }

  // Clear signature
  function clearSignature() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showNotification("Signature cleared.", "info");
  }

  // Save signature
  function saveSignature() {
    const dataURL = canvas.toDataURL();
    
    // Save to localStorage
    const deliveryProof = JSON.parse(localStorage.getItem("deliveryProof") || "{}");
    deliveryProof.signature = dataURL;
    deliveryProof.signatureTime = new Date().toISOString();
    localStorage.setItem("deliveryProof", JSON.stringify(deliveryProof));
    
    showNotification("Signature saved successfully!", "success");
    
    // Clear after saving
    setTimeout(() => {
      clearSignature();
    }, 2000);
  }

  // Handle photo upload
  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification("File size must be less than 5MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      const photoPreview = document.getElementById("photoPreview");
      const uploadPlaceholder = document.getElementById("uploadPlaceholder");
      
      if (uploadPlaceholder) {
        uploadPlaceholder.style.display = "none";
      }
      
      if (photoPreview) {
        photoPreview.innerHTML = `
          <img src="${event.target.result}" alt="Delivery Photo">
          <div class="photo-info">
            <p>${file.name} (${(file.size / 1024).toFixed(1)} KB)</p>
          </div>
        `;
      }

      // Save to localStorage
      const deliveryProof = JSON.parse(localStorage.getItem("deliveryProof") || "{}");
      deliveryProof.photo = event.target.result;
      deliveryProof.photoTime = new Date().toISOString();
      localStorage.setItem("deliveryProof", JSON.stringify(deliveryProof));

      showNotification("Delivery photo uploaded successfully!", "success");
    };
    reader.readAsDataURL(file);
  }

  // Load notification preferences
  function loadNotificationPreferences() {
    const prefs = JSON.parse(localStorage.getItem("notificationPrefs") || "{}");
    
    const checkboxes = [
      "emailNotifications",
      "smsNotifications",
      "pushNotifications",
      "newOrderAlerts",
      "statusUpdateAlerts",
      "messageAlerts"
    ];
    
    checkboxes.forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.checked = prefs[id] !== false; // Default to true
      }
    });
  }

  // Save notification preferences
  function saveNotificationPreferences() {
    const prefs = {};
    const checkboxes = [
      "emailNotifications",
      "smsNotifications",
      "pushNotifications",
      "newOrderAlerts",
      "statusUpdateAlerts",
      "messageAlerts"
    ];
    
    checkboxes.forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        prefs[id] = checkbox.checked;
      }
    });
    
    localStorage.setItem("notificationPrefs", JSON.stringify(prefs));
    showNotification("Notification preferences saved!", "success");
  }

  // Setup event listeners
  function setupEventListeners() {
    // Profile image upload
    document.getElementById("changeProfileBtn").addEventListener("click", () => {
      document.getElementById("profileUpload").click();
    });

    document.getElementById("profileUpload").addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        const img = document.getElementById("profileImage");
        img.src = event.target.result;
        
        // Save to localStorage
        localStorage.setItem("driverProfileImage", event.target.result);
        
        showNotification("Profile image updated!", "success");
      };
      reader.readAsDataURL(file);
    });

    // Dark mode toggle
    document.getElementById("darkModeToggle").addEventListener("change", function() {
      if (this.checked) {
        document.body.classList.add("dark-mode");
        localStorage.setItem("darkMode", "true");
      } else {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("darkMode", "false");
      }
    });

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", function() {
      localStorage.removeItem("driverLoggedIn");
      window.location.href = "index.html";
    });

    // Refresh location
    document.getElementById("refreshLocation")?.addEventListener("click", updateDriverLocation);

    // Close modal
    document.getElementById("closeModal")?.addEventListener("click", function() {
      document.getElementById("orderDetailsModal").classList.remove("active");
    });

    // Signature controls
    document.getElementById("clearSignature")?.addEventListener("click", clearSignature);
    document.getElementById("saveSignature")?.addEventListener("click", saveSignature);

    // Photo upload
    document.getElementById("deliveryPhoto")?.addEventListener("change", handlePhotoUpload);
    document.getElementById("uploadPhotoBtn")?.addEventListener("click", function() {
      document.getElementById("deliveryPhoto").click();
    });

    // Retake photo
    document.getElementById("retakePhoto")?.addEventListener("click", function() {
      document.getElementById("deliveryPhoto").value = "";
      const photoPreview = document.getElementById("photoPreview");
      const uploadPlaceholder = document.getElementById("uploadPlaceholder");
      
      if (photoPreview) photoPreview.innerHTML = "";
      if (uploadPlaceholder) uploadPlaceholder.style.display = "block";
    });

    // Delivery confirmation
    document.getElementById("confirmDelivery")?.addEventListener("click", function() {
      const deliveryTime = document.getElementById("deliveryTime").value;
      const recipientName = document.getElementById("recipientName").value;
      const notes = document.getElementById("deliveryNotes").value;

      if (!deliveryTime || !recipientName) {
        showNotification("Please fill in all required fields", "error");
        return;
      }

      const confirmation = {
        deliveryTime,
        recipientName,
        notes,
        timestamp: new Date().toISOString(),
        orderId: currentOrder?.id || "N/A"
      };

      // Save to localStorage
      localStorage.setItem("deliveryConfirmation", JSON.stringify(confirmation));
      
      showNotification("Delivery confirmed successfully!", "success");
      
      // Reset form
      document.getElementById("deliveryTime").value = "";
      document.getElementById("recipientName").value = "";
      document.getElementById("deliveryNotes").value = "";
    });

    // Settings
    document.getElementById("updateProfileBtn")?.addEventListener("click", function() {
      const name = document.getElementById("driverName").value;
      const email = document.getElementById("driverEmail").value;
      const phone = document.getElementById("driverPhone").value;
      const vehicle = document.getElementById("vehicleType").value;

      const profile = { name, email, phone, vehicle };
      localStorage.setItem("driverProfile", JSON.stringify(profile));
      
      showNotification("Profile updated successfully!", "success");
    });

    document.getElementById("resetPasswordBtn")?.addEventListener("click", function() {
      const current = document.getElementById("currentPassword").value;
      const newPass = document.getElementById("newPassword").value;
      const confirm = document.getElementById("confirmPassword").value;

      if (!current || !newPass || !confirm) {
        showNotification("Please fill in all password fields", "error");
        return;
      }

      if (newPass !== confirm) {
        showNotification("New passwords do not match", "error");
        return;
      }

      if (newPass.length < 6) {
        showNotification("Password must be at least 6 characters", "error");
        return;
      }

      // In real app, this would send to server
      showNotification("Password reset successfully!", "success");
      
      // Clear fields
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";
    });

    document.getElementById("saveNotificationsBtn")?.addEventListener("click", saveNotificationPreferences);

    // Communication
    document.getElementById("callCustomerBtn")?.addEventListener("click", function() {
      initiateCall("customer");
    });

    document.getElementById("callOperatorBtn")?.addEventListener("click", function() {
      initiateCall("operator");
    });

    document.getElementById("callAdminBtn")?.addEventListener("click", function() {
      initiateCall("admin");
    });

    document.getElementById("sendMessageBtn")?.addEventListener("click", function() {
      sendMessage();
    });

    // Get directions
    document.getElementById("getDirections")?.addEventListener("click", function() {
      if (!currentOrder) {
        showNotification("Please select an order first", "warning");
        return;
      }
      
      const address = encodeURIComponent(currentOrder.destination);
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
      window.open(mapsUrl, "_blank");
      
      showNotification(`Opening directions to: ${currentOrder.destination}`, "info");
    });

    // Status update
    document.getElementById("updateStatusBtn")?.addEventListener("click", function() {
      const status = document.getElementById("statusUpdateSelect").value;
      if (!status) {
        showNotification("Please select a status", "warning");
        return;
      }
      
      updateOrderStatus(status);
    });

    // Broadcast status
    document.getElementById("broadcastStatus")?.addEventListener("click", function() {
      const message = document.getElementById("statusMessage").value;
      if (!message.trim()) {
        showNotification("Please enter a message", "warning");
        return;
      }

      const sendToCustomer = document.getElementById("sendToCustomer").checked;
      const sendToOperator = document.getElementById("sendToOperator").checked;
      const sendToAdmin = document.getElementById("sendToAdmin").checked;

      if (!sendToCustomer && !sendToOperator && !sendToAdmin) {
        showNotification("Please select at least one recipient", "warning");
        return;
      }

      broadcastStatusMessage(message, { sendToCustomer, sendToOperator, sendToAdmin });
    });
  }

  // Get status text
  function getStatusText(status) {
    const statusMap = {
      assigned: "Assigned",
      accepted: "Accepted",
      pickup: "Pickup Started",
      pickedup: "Picked Up",
      ontheway: "On the Way",
      arrived: "Arrived",
      delivered: "Delivered"
    };
    return statusMap[status] || status;
  }

  // Update order status
  function updateOrderStatus(status) {
    if (!currentOrder) {
      showNotification("Please select an order first", "warning");
      return;
    }

    const statusMap = {
      "pickup_started": { stage: 1, status: "pickup" },
      "picked_up": { stage: 2, status: "pickedup" },
      "on_the_way": { stage: 3, status: "ontheway" },
      "arrived": { stage: 4, status: "arrived" },
      "delivered": { stage: 5, status: "delivered" }
    };

    const newStatus = statusMap[status];
    if (newStatus) {
      currentOrder.deliveryStage = newStatus.stage;
      currentOrder.status = newStatus.status;
      
      updateOrderInStorage(currentOrder);
      showNotification(`Status updated to: ${getStatusText(newStatus.status)}`, "success");
      
      // Clear status select
      document.getElementById("statusUpdateSelect").value = "";
    }
  }

  // Broadcast status message
  function broadcastStatusMessage(message, recipients) {
    const broadcast = {
      message,
      recipients,
      timestamp: new Date().toISOString(),
      driverId: "8573",
      orderId: currentOrder?.id || "N/A"
    };

    // Save to localStorage for other parties to access
    const broadcasts = JSON.parse(localStorage.getItem("statusBroadcasts") || "[]");
    broadcasts.push(broadcast);
    localStorage.setItem("statusBroadcasts", JSON.stringify(broadcasts));

    // Show in messages
    addMessageToChat(message, "sent", "status");

    // Clear message
    document.getElementById("statusMessage").value = "";
    
    showNotification("Status message broadcasted successfully!", "success");
  }

  // Initiate a call
  function initiateCall(recipient) {
    let number, name;

    switch(recipient) {
      case "customer":
        number = currentOrder ? currentOrder.phone : "***-***-1234";
        name = currentOrder ? currentOrder.customer : "Customer";
        break;
      case "operator":
        number = "1-800-OPERATOR";
        name = "Operator";
        break;
      case "admin":
        number = "1-800-ADMIN";
        name = "Admin";
        break;
    }

    // In a real app, this would use a telephony API
    showNotification(`Calling ${name} at ${number}...`, "info");

    // For demo, simulate a call
    setTimeout(() => {
      showNotification(`Connected to ${name}. Call in progress...`, "success");
    }, 1000);
  }

  // Send a message
  function sendMessage() {
    const messageInput = document.getElementById("messageInput");
    const message = messageInput.value.trim();
    const recipient = document.getElementById("messageRecipient").value;

    if (!message) {
      showNotification("Please enter a message.", "warning");
      return;
    }

    // Add to chat
    addMessageToChat(message, "sent", recipient);

    // Save to localStorage
    const messages = JSON.parse(localStorage.getItem("driverMessages") || "[]");
    messages.push({
      message,
      recipient,
      timestamp: new Date().toISOString(),
      direction: "sent"
    });
    localStorage.setItem("driverMessages", JSON.stringify(messages));

    // Clear input
    messageInput.value = "";

    // Show notification
    showNotification(`Message sent to ${recipient}`, "success");
  }

  // Add message to chat
  function addMessageToChat(message, direction, recipient) {
    const messagesContainer = document.getElementById("messagesContainer");
    if (!messagesContainer) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${direction}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageDiv.innerHTML = `
      <div class="message-content">${message}</div>
      <div class="message-time">${time} • ${recipient.charAt(0).toUpperCase() + recipient.slice(1)}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Simulate new order assignment
  function simulateNewOrder() {
    const newOrder = {
      id: "ORD-1004",
      customer: "Maria Garcia",
      address: "321 Maple Blvd, Apt 5C, Bronx, NY 10451",
      phone: "***-***-3456",
      items: [
        { name: "Lasagna", quantity: 1, weight: "1.8kg" },
        { name: "Caesar Salad", quantity: 1, weight: "0.6kg" },
        { name: "Red Wine", quantity: 1, weight: "1.1kg" }
      ],
      totalWeight: "3.5kg",
      description: "Freshly baked lasagna with garlic bread",
      instructions: "Building has elevator. Apartment is on 3rd floor.",
      status: "assigned",
      deliveryStage: 0,
      assignedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      estimatedDelivery: "1:30 PM",
      value: "$42.99"
    };

    // Update badge count
    const badge = document.getElementById("newOrdersBadge");
    if (badge) {
      const count = parseInt(badge.textContent) + 1;
      badge.textContent = count;
    }

    showNotification("New order assignment received!", "info");
  }

  // Show notification toast
  function showNotification(message, type = "info") {
    const toast = document.getElementById("notificationToast");
    const toastMessage = document.getElementById("toastMessage");

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    
    // Set icon and color based on type
    const icon = toast.querySelector("i");
    toast.className = `toast ${type}`;
    
    switch(type) {
      case "success":
        icon.className = "fas fa-check-circle";
        break;
      case "error":
        icon.className = "fas fa-exclamation-circle";
        break;
      case "warning":
        icon.className = "fas fa-exclamation-triangle";
        break;
      default:
        icon.className = "fas fa-info-circle";
    }

    // Show toast
    toast.classList.add("show");

    // Hide after 4 seconds
    setTimeout(() => {
      toast.classList.remove("show");
    }, 4000);
  }
});