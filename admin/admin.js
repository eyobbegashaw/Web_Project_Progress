// Admin Dashboard JavaScript

// Global Variables
let currentAdmin = null;
let charts = {};
let currentWarehouseData = {};
let activeChatRecipient = null;
let _realtimeDebounceTimer = null;
// Snapshot of last seen millUsers state to detect new orders
let lastMillUsersSnapshot = null;

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e.name === "QuotaExceededError") {
      console.warn("LocalStorage quota exceeded, cleaning up...");

      // Try to clean up old data
      if (cleanupOldData()) {
        try {
          localStorage.setItem(key, value);
          showToast("Cleaned up old data and saved successfully.", "success");
          return true;
        } catch (e2) {
          console.error("Still out of space after cleanup:", e2);
        }
      }

      // If still failing, show error and offer to backup
      if (
        confirm("Storage is full. Would you like to backup and clear old data?")
      ) {
        backupData();
        localStorage.clear();
        location.reload();
      }
      return false;
    }
    console.error("Error saving to localStorage:", e);
    return false;
  }
}

function cleanupOldData() {
  try {
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");

    // Keep only recent orders (last 6 months)
    if (usersData.orders && usersData.orders.length > 100) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      usersData.orders = usersData.orders.filter((order) => {
        if (!order) return false;
        const orderDate = new Date(
          order.orderDate || order.createdAt || order.timestamp || Date.now()
        );
        return !isNaN(orderDate) && orderDate >= sixMonthsAgo;
      });
    }

    // Clean old notifications (keep last 100)
    if (usersData.notifications && usersData.notifications.length > 100) {
      usersData.notifications = usersData.notifications.slice(-100);
    }

    // Clean old messages (keep last 200)
    if (usersData.messages && usersData.messages.length > 200) {
      usersData.messages = usersData.messages.slice(-200);
    }

    // Compress images in products (remove large base64 images)
    if (usersData.products) {
      usersData.products.forEach((product) => {
        if (product.image && product.image.length > 50000) {
          // 50KB
          delete product.image; // Remove large images
        }
      });
    }

    // Save cleaned data
    const cleanedData = JSON.stringify(usersData);
    if (cleanedData.length < 4500000) {
      // 4.5MB limit
      localStorage.setItem("millUsers", cleanedData);
      console.log("Data cleaned successfully. New size:", cleanedData.length);
      return true;
    } else {
      console.warn("Data still too large after cleaning:", cleanedData.length);
      return false;
    }
  } catch (e) {
    console.error("Error cleaning data:", e);
    return false;
  }
}

// Initialize Admin Dashboard
document.addEventListener("DOMContentLoaded", function () {
  initializeAdminDashboard();
  updateAllCounts(); // Add this line
});

function initializeAdminDashboard() {
  // Check authentication
  checkAdminAuth();

  // Load admin data
  loadAdminData();

  // Set up event listeners
  setupAdminEventListeners();

  // Initialize date display
  updateDateTime();

  // Load dashboard data
  loadDashboardData();

  // Initialize charts
  initializeCharts();
  // Enable realtime chart updates (listens for localStorage writes and storage events)
  enableRealtimeCharts();

  // Keep a snapshot of millUsers to detect new orders later
  try {
    lastMillUsersSnapshot = JSON.parse(
      localStorage.getItem("millUsers") || "{}"
    );
  } catch (e) {
    lastMillUsersSnapshot = {};
  }

  // Start auto-refresh
  startAutoRefresh();
}

function loadSettingsData() {
  updateSystemInfo();
}
function updateSystemInfo() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");

  // Count totals
  const totalCustomers = (usersData.customers || []).length;
  const totalProducts = (usersData.products || []).length;
  const totalOrders = (usersData.orders || []).length;
  const totalOperators = (usersData.operators || []).length;
  const totalDrivers = (usersData.drivers || []).length;

  // Calculate data size
  const dataString = JSON.stringify(usersData);
  const dataSizeBytes = new Blob([dataString]).size;
  const dataSizeKB = Math.round((dataSizeBytes / 1024) * 100) / 100;
  const dataSizeMB = Math.round((dataSizeBytes / (1024 * 1024)) * 100) / 100;
  const dataSizeDisplay =
    dataSizeMB > 1 ? `${dataSizeMB} MB` : `${dataSizeKB} KB`;

  // Get last backup time
  const lastBackup = localStorage.getItem("lastBackupTime") || "Never";

  // Update DOM elements
  const updateElement = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  updateElement("sysTotalCustomers", totalCustomers);
  updateElement("sysTotalProducts", totalProducts);
  updateElement("sysTotalOrders", totalOrders);
  updateElement("sysTotalOperators", totalOperators);
  updateElement("sysTotalDrivers", totalDrivers || 0);
  updateElement("dataSize", dataSizeDisplay);
  updateElement("lastBackup", lastBackup);
}

// Update backup function to set last backup time
function backupData() {
  const usersData = localStorage.getItem("millUsers");
  const blob = new Blob([usersData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `millpro-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Save backup time
  const now = new Date().toLocaleString();
  localStorage.setItem("lastBackupTime", now);

  // Update system info
  updateSystemInfo();

  showToast("Backup created successfully!", "success");
}

// Call updateSystemInfo when settings page loads
function loadSettingsData() {
  updateSystemInfo();
  // ... other settings loading code ...
}

// Also update when data changes (add to save functions)
function updateAllCounts() {
  updateSystemInfo();
  updateDashboardStats(JSON.parse(localStorage.getItem("millUsers") || "{}"));
  updateNotificationCount();
}
// Real-time chart support
function enableRealtimeCharts() {
  try {
    // Monkey-patch localStorage.setItem to emit an event within same tab
    if (!localStorage.__patchedForRealtime) {
      const nativeSet = localStorage.setItem.bind(localStorage);
      localStorage.setItem = function (key, value) {
        nativeSet(key, value);
        try {
          window.dispatchEvent(
            new CustomEvent("millUsersChanged", { detail: { key } })
          );
        } catch (e) {}
      };
      localStorage.__patchedForRealtime = true;
    }
  } catch (e) {
    console.warn("Realtime patch failed", e);
  }

  // Respond to our custom event (same tab writers)
  window.addEventListener("millUsersChanged", () => {
    debounceRealtimeUpdate();
  });

  // Also listen to storage events (cross-tab)
  window.addEventListener("storage", (ev) => {
    if (ev.key === "millUsers") {
      debounceRealtimeUpdate();
    }
  });
}

function debounceRealtimeUpdate() {
  // small debounce to batch rapid writes
  if (_realtimeDebounceTimer) clearTimeout(_realtimeDebounceTimer);
  _realtimeDebounceTimer = setTimeout(() => {
    _realtimeDebounceTimer = null;
    try {
      // Load latest millUsers snapshot and detect changes (new orders)
      const currentMill = JSON.parse(localStorage.getItem("millUsers") || "{}");
      handleMillUsersChange(lastMillUsersSnapshot || {}, currentMill);
      // update our snapshot reference
      lastMillUsersSnapshot = JSON.parse(JSON.stringify(currentMill));
      // Refresh charts and small UI sections
      try {
        updateCharts(currentMill);
      } catch (e) {
        console.error("updateCharts error", e);
      }
    } catch (e) {
      console.error("Realtime update failed to parse millUsers", e);
    }
  }, 300);
}

// Ensure warehouse updates happen in real-time
function handleMillUsersChange(prev, curr) {
  if (!curr) return;

  const prevOrders =
    prev && Array.isArray(prev.orders)
      ? prev.orders.reduce((map, order) => {
          if (order && order.id) map[String(order.id)] = order;
          return map;
        }, {})
      : {};

  const currOrders = Array.isArray(curr.orders) ? curr.orders : [];
  let modified = false;

  // Ensure containers exist
  if (!curr.warehouse) curr.warehouse = {};
  if (!curr.notifications) curr.notifications = [];

  // Process new orders
  currOrders.forEach((order) => {
    if (!order || !order.id) return;

    const orderId = String(order.id);
    const previousOrder = prevOrders[orderId];

    // Process if order is new or not yet processed
    if (
      (!previousOrder || !previousOrder.warehouseProcessed) &&
      !order.warehouseProcessed
    ) {
      // Only process orders that are confirmed
      if (
        order.status === "Completed" ||
        order.status === "Processing" ||
        order.status === "Confirmed"
      ) {
        const processed = processOrderForWarehouse(order, curr);
        if (processed) {
          order.warehouseProcessed = true;
          modified = true;

          // Add notification for warehouse update
          curr.notifications.push({
            id: Date.now(),
            type: "info",
            title: "Warehouse Updated",
            message: `${order.quantity || 0}kg of ${
              order.productName || "product"
            } deducted from warehouse.`,
            timestamp: new Date().toISOString(),
            read: false,
          });
        }
      }
    }
  });

  // Save changes if any
  if (modified) {
    try {
      localStorage.setItem("millUsers", JSON.stringify(curr));

      // Update warehouse UI if on warehouse page
      if (document.querySelector("#warehouse.active")) {
        loadWarehouseData();
      }

      // Update notifications
      updateNotificationCount();

      // Update charts
      updateCharts(curr);

      console.log("Warehouse updated for processed orders");
    } catch (e) {
      console.error("Failed to save warehouse updates:", e);
    }
  }
}

function processOrderForWarehouse(order, usersData) {
  if (!order || order.status === "Cancelled") return false;

  const warehouse = usersData.warehouse || {};
  const orderQuantity = parseFloat(order.quantity) || 0;

  if (orderQuantity <= 0) return false;

  // Find product name from order
  let productName = "";

  if (order.productName) {
    productName = order.productName;
  } else if (order.productId) {
    // Try to find product name from products list
    const products = usersData.products || [];
    const product = products.find(
      (p) => String(p.id) === String(order.productId)
    );
    if (product) {
      productName = product.name;
    }
  }

  if (!productName) {
    console.warn("Could not determine product name for order:", order);
    return false;
  }

  // Find warehouse item (exact name match first, then case-insensitive)
  let warehouseItem = warehouse[productName];
  let foundKey = productName;

  if (!warehouseItem) {
    // Try case-insensitive match
    for (const key in warehouse) {
      if (key.toLowerCase() === productName.toLowerCase()) {
        warehouseItem = warehouse[key];
        foundKey = key;
        break;
      }
    }
  }

  if (!warehouseItem) {
    console.warn(`Product "${productName}" not found in warehouse`);
    return false;
  }

  const currentQuantity = parseFloat(warehouseItem.quantity) || 0;

  // Check if enough stock
  if (currentQuantity < orderQuantity) {
    console.warn(
      `Insufficient stock for ${productName}. Required: ${orderQuantity}, Available: ${currentQuantity}`
    );

    // Create notification for low stock
    createLowStockNotification(
      productName,
      currentQuantity,
      warehouseItem.alertLevel || 0,
      usersData
    );

    return false;
  }

  // Decrease quantity
  const newQuantity = currentQuantity - orderQuantity;
  warehouseItem.quantity = Math.max(0, Math.round(newQuantity * 100) / 100);
  warehouseItem.lastUpdated = new Date().toISOString();

  // Check for low stock alert after deduction
  const alertLevel = parseFloat(warehouseItem.alertLevel) || 0;
  if (alertLevel > 0 && warehouseItem.quantity <= alertLevel) {
    createLowStockNotification(
      productName,
      warehouseItem.quantity,
      alertLevel,
      usersData
    );
  }

  // Mark order as processed
  order.warehouseProcessed = true;

  console.log(
    `Warehouse updated: ${productName} decreased by ${orderQuantity}kg. New quantity: ${warehouseItem.quantity}kg`
  );
  return true;
}

function saveProduct() {
  const card = document.getElementById("productFormCard");
  const editingId =
    card && card.dataset && card.dataset.editingId
      ? card.dataset.editingId
      : null;

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  if (!usersData.products) usersData.products = [];

  // Gather values from your actual form fields
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value;
  const price = parseFloat(document.getElementById("productPrice").value) || 0;
  const millingFee =
    parseFloat(document.getElementById("millingFee").value) || 0;
  const minQuantity =
    parseFloat(document.getElementById("minQuantity").value) || 0;
  const origin = document.getElementById("productOrigin").value;
  const quality = document.getElementById("productQuality").value;
  const description = document.getElementById("productDescription").value;
  const imageBase64 = document.getElementById("productImageBase64").value;

  // Validation
  if (!name || !category || price <= 0) {
    showToast(
      "Please fill in product name, category, and valid price.",
      "error"
    );
    return;
  }

  // Check if warehouse item exists
  const warehouse = usersData.warehouse || {};
  let warehouseItem = warehouse[name];

  if (!warehouseItem) {
    // Try case-insensitive match
    for (const key in warehouse) {
      if (key.toLowerCase() === name.toLowerCase()) {
        warehouseItem = warehouse[key];
        break;
      }
    }
  }

  // If warehouse item doesn't exist, ask to create it
  if (!warehouseItem) {
    const createWarehouse = confirm(
      `Warehouse item "${name}" doesn't exist. Do you want to create it?`
    );
    if (createWarehouse) {
      // Navigate to warehouse section to create the item
      navigateToSection("warehouse");
      showToast(
        `Please create warehouse item "${name}" first, then come back to save the product.`,
        "warning"
      );
      return;
    } else {
      showToast(
        "Product cannot be saved without corresponding warehouse item.",
        "error"
      );
      return;
    }
  }

  // Ensure category matches
  if (warehouseItem.category !== category) {
    showToast(
      `Product "${name}" belongs to "${warehouseItem.category}" category in warehouse, not "${category}". Please correct the category.`,
      "error"
    );
    return;
  }

  if (editingId) {
    // Update existing product
    const idx = usersData.products.findIndex(
      (p) => String(p.id) === String(editingId)
    );
    if (idx !== -1) {
      const existing = usersData.products[idx];
      existing.name = name;
      existing.category = category;
      existing.price = price;
      existing.millingFee = millingFee;
      existing.minQuantity = minQuantity;
      existing.origin = origin;
      existing.quality = quality;
      existing.description = description;
      existing.updatedAt = new Date().toISOString();

      // Only update image if new one was provided
      if (imageBase64) {
        existing.image = imageBase64;
      }

      usersData.products[idx] = existing;
      localStorage.setItem("millUsers", JSON.stringify(usersData));

      if (card && card.dataset && card.dataset.editingId)
        delete card.dataset.editingId;
      hideProductForm();
      loadProductsData();
      updateAllCounts();
      showToast("Product updated successfully!", "success");
      return;
    }
  }

  // Create new product
  const productData = {
    id: Date.now(),
    name,
    category,
    price,
    millingFee,
    minQuantity,
    origin,
    quality,
    description,
    image: imageBase64 || "",
    posted: false,
    createdAt: new Date().toISOString(),
    warehouseItem: name, // Link to warehouse item
  };

  usersData.products.push(productData);
  localStorage.setItem("millUsers", JSON.stringify(usersData));

  hideProductForm();
  loadProductsData();
  updateAllCounts();
  showToast("Product saved successfully!", "success");
}

// Product Functions - updated for proper warehouse integration
function loadProductsData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const products = usersData.products || [];

  loadProductsGrid(products);
}

function createLowStockNotification(
  itemName,
  currentQty,
  alertLevel,
  usersData
) {
  if (!usersData.notifications) usersData.notifications = [];

  // Check if notification already exists
  const existingNotification = usersData.notifications.find(
    (n) => n.message && n.message.includes(`Low stock: ${itemName}`) && !n.read
  );

  if (!existingNotification) {
    const notification = {
      id: Date.now(),
      type: "warning",
      title: "Low Stock Alert",
      message: `Low stock: ${itemName} has ${currentQty}kg remaining (alert level: ${alertLevel}kg).`,
      timestamp: new Date().toISOString(),
      read: false,
      priority: "high",
    };

    usersData.notifications.push(notification);
  }
}

function getLastNMonthLabels(n) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleString("en-US", { month: "short" }));
  }
  return months;
}

// Authentication
function checkAdminAuth() {
  const adminData = localStorage.getItem("currentUser");
  if (!adminData) {
    window.location.href = "../index.html";
    return;
  }

  const user = JSON.parse(adminData);
  if (user.role !== "admin") {
    window.location.href = "../index.html";
    return;
  }

  currentAdmin = user;
}

// Load Admin Data
function loadAdminData() {
  if (currentAdmin) {
    document.getElementById("adminName").textContent = currentAdmin.name;
    document.getElementById("adminEmail").textContent = currentAdmin.email;
    document.getElementById("adminFullName").value = currentAdmin.name;
    document.getElementById("adminEmailSettings").value = currentAdmin.email;
    document.getElementById("adminPhone").value =
      currentAdmin.phone || "+251911223344";
  }
}

// Event Listeners
function setupAdminEventListeners() {
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
    document.querySelector(".sidebar").classList.toggle("active");
  });

  // Dark mode
  document
    .getElementById("adminDarkMode")
    .addEventListener("click", toggleAdminDarkMode);

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", logoutAdmin);

  // Refresh data
  document
    .getElementById("refreshData")
    .addEventListener("click", refreshDashboard);

  // Warehouse
  document
    .getElementById("addNewItem")
    .addEventListener("click", showAddItemForm);
  document
    .getElementById("cancelAddItem")
    .addEventListener("click", hideAddItemForm);
  document
    .getElementById("warehouseForm")
    .addEventListener("submit", saveWarehouseItem);
  document
    .getElementById("exportWarehouse")
    .addEventListener("click", exportWarehouseData);

  // Products
  document
    .getElementById("addProductBtn")
    .addEventListener("click", showProductForm);
  document
    .getElementById("cancelProductForm")
    .addEventListener("click", hideProductForm);
  document
    .getElementById("saveProductBtn")
    .addEventListener("click", saveProduct);
  document
    .getElementById("postProductBtn")
    .addEventListener("click", postProduct);

  // Operators
  document
    .getElementById("addOperatorBtn")
    .addEventListener("click", showOperatorModal);
  document
    .getElementById("cancelOperator")
    .addEventListener("click", hideOperatorModal);
  document
    .getElementById("operatorForm")
    .addEventListener("submit", saveOperator);

  // Finance
  document
    .getElementById("addExpenseBtn")
    .addEventListener("click", addExpense);
  document
    .getElementById("generateReport")
    .addEventListener("click", generateFinancialReport);

  // In setupAdminEventListeners or initializeProductForm
  document
    .getElementById("productCategory")
    ?.addEventListener("change", updateProductSubcategories);

  // Reports
  document
    .getElementById("generateCustomReport")
    .addEventListener("click", generateCustomReport);
  // Drivers
  document
    .getElementById("addDriverBtn")
    .addEventListener("click", showDriverModal);
  document
    .getElementById("cancelDriver")
    .addEventListener("click", hideDriverModal);
  document.getElementById("driverForm").addEventListener("submit", saveDriver);
  document
    .getElementById("cancelResetDriverPassword")
    .addEventListener("click", hideResetDriverPasswordModal);
  document
    .getElementById("resetDriverPasswordForm")
    .addEventListener("submit", resetDriverPassword);
  // Settings
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const tab = this.dataset.tab;
      switchTab(tab);
    });
  });

  document
    .getElementById("profileForm")
    .addEventListener("submit", saveProfileSettings);
  document
    .getElementById("saveSystemSettings")
    .addEventListener("click", saveSystemSettings);
  document
    .getElementById("resetSystemSettings")
    .addEventListener("click", resetSystemSettings);
  document
    .getElementById("saveNotificationSettings")
    .addEventListener("click", saveNotificationSettings);
  document.getElementById("backupNow").addEventListener("click", backupData);
  document
    .getElementById("restoreBackup")
    .addEventListener("click", restoreBackup);
  document
    .getElementById("deleteAllData")
    .addEventListener("click", deleteAllData);

  // Messages
  document
    .getElementById("newMessageBtn")
    .addEventListener("click", startNewMessage);
  document
    .getElementById("sendMessageBtn")
    .addEventListener("click", sendMessage);
  document
    .getElementById("sendBroadcast")
    .addEventListener("click", sendBroadcastMessage);

  // Quick actions
  document
    .getElementById("quickNotify")
    .addEventListener("click", showNotifications);
  // Image upload
  document
    .getElementById("uploadImageBtn")
    .addEventListener("click", function () {
      document.getElementById("productImageFile").click();
    });
  document
    .getElementById("productImageFile")
    .addEventListener("change", handleImageUpload);

  // Search functionality
  document
    .getElementById("searchWarehouse")
    .addEventListener("input", filterWarehouseItems);
  document
    .getElementById("filterCategory")
    .addEventListener("change", filterWarehouseItems);

  // Customer search
  document
    .getElementById("searchCustomers")
    .addEventListener("input", filterCustomers);
  document
    .getElementById("filterCustomers")
    .addEventListener("change", filterCustomers);

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

function filterCustomers() {
  const searchInput = document.getElementById("searchCustomers");
  const filterSelect = document.getElementById("filterCustomers");
  const tableBody = document.querySelector("#customersTable tbody");

  if (!tableBody) return;

  const searchTerm = (searchInput?.value || "").toLowerCase();
  const filterValue = filterSelect?.value || "all";

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const customers = usersData.customers || [];
  const orders = usersData.orders || [];

  // Filter customers
  let filteredCustomers = customers.filter((customer) => {
    // Search filter
    const matchesSearch =
      !searchTerm ||
      (customer.name && customer.name.toLowerCase().includes(searchTerm)) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
      (customer.phone && customer.phone.includes(searchTerm)) ||
      (customer.address && customer.address.toLowerCase().includes(searchTerm));

    if (!matchesSearch) return false;

    // Status filter
    if (filterValue === "all") return true;

    const customerOrders = orders.filter((o) => o.customerId === customer.id);
    const lastOrder = customerOrders.sort(
      (a, b) =>
        new Date(b.orderDate || b.createdAt) -
        new Date(a.orderDate || a.createdAt)
    )[0];

    if (filterValue === "online") {
      // Customer is considered online if they have an order in the last 24 hours
      if (!lastOrder) return false;
      const lastOrderDate = new Date(
        lastOrder.orderDate || lastOrder.createdAt
      );
      return new Date() - lastOrderDate < 24 * 60 * 60 * 1000;
    } else if (filterValue === "offline") {
      if (!lastOrder) return true;
      const lastOrderDate = new Date(
        lastOrder.orderDate || lastOrder.createdAt
      );
      return new Date() - lastOrderDate >= 24 * 60 * 60 * 1000;
    }

    return true;
  });

  // Load filtered customers
  loadCustomersTable(filteredCustomers, orders);
}

// Update loadCustomersData to call filter initially
function loadCustomersData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const customers = usersData.customers || [];
  const orders = usersData.orders || [];

  // Load all customers initially
  loadCustomersTable(customers, orders);
}

// Image Upload Function
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const preview = document.getElementById("productImagePreview");
  const placeholder = document.getElementById("imagePlaceholder");
  const reader = new FileReader();

  reader.onload = function (e) {
    preview.src = e.target.result;
    preview.style.display = "block";
    placeholder.style.display = "none";
    document.getElementById("productImageBase64").value = e.target.result;
  };

  reader.readAsDataURL(file);
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
    dashboard: "Admin Dashboard",
    warehouse: "Warehouse Management",
    products: "Product Management",
    operators: "Operator Management",
    customers: "Customer Management",
    finance: "Financial Management",
    reports: "Reports & Analytics",
    settings: "System Settings",
    drivers: "Driver Management",
    messages: "Messages",
  };
  pageTitle.textContent = titles[sectionId] || "Admin Dashboard";

  // Load section data
  loadSectionData(sectionId);
}

// Dashboard Functions
function loadDashboardData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");

  // Update stats
  updateDashboardStats(usersData);

  // Load recent orders
  loadRecentOrders(usersData);

  // Update charts
  updateCharts(usersData);
}

function updateDashboardStats(data) {
  const customers = data.customers || [];
  const operators = data.operators || [];
  const orders = data.orders || [];
  const warehouse = data.warehouse || {};

  // Customer stats
  const totalCustomers = customers.length;
  const onlineCustomers = customers.filter(
    (c) => c.lastActive && new Date() - new Date(c.lastActive) < 300000
  ).length; // Active in last 5 minutes

  // Order stats
  const totalOrders = orders.length;
  const today = new Date().toISOString().split("T")[0];
  const todayOrders = orders.filter(
    (o) => o.orderDate && o.orderDate.startsWith(today)
  ).length;

  // Revenue stats
  const totalRevenue = orders.reduce(
    (sum, order) => sum + (order.total || 0),
    0
  );
  const todayRevenue = orders
    .filter((o) => o.orderDate && o.orderDate.startsWith(today))
    .reduce((sum, order) => sum + (order.total || 0), 0);

  // Inventory stats
  const totalInventory = Object.values(warehouse).reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );

  // Update DOM
  document.getElementById("totalCustomers").textContent = totalCustomers;
  document.getElementById("onlineCustomers").textContent = onlineCustomers;
  document.getElementById("totalOrders").textContent = totalOrders;
  document.getElementById("totalRevenue").textContent =
    formatCurrency(totalRevenue);
  document.getElementById("totalOperators").textContent = operators.length;
  document.getElementById("totalInventory").textContent =
    formatNumber(totalInventory);
}

function loadRecentOrders(data) {
  const orders = data.orders || [];
  const customers = data.customers || [];
  const products = data.products || [];

  const recentOrders = orders.slice(-10).reverse(); // Last 10 orders

  const tableBody = document.querySelector("#recentOrdersTable tbody");
  tableBody.innerHTML = "";

  recentOrders.forEach((order) => {
    const customer = customers.find((c) => c.id === order.customerId);
    const product = products.find((p) => p.id === order.productId);

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>#${order.id.toString().slice(-6)}</td>
            <td>${customer ? customer.name : "Unknown"}</td>
            <td>${product ? product.name : order.productName || "N/A"}</td>
            <td>${order.quantity || 0} kg</td>
            <td>${formatCurrency(order.total || 0)}</td>
            <td><span class="status-badge status-${
              order.status || "pending"
            }">${order.status || "Pending"}</span></td>
            <td>${formatDate(order.orderDate)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-icon btn-outline" onclick="viewOrderDetails(${
                      order.id
                    })" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon btn-outline" onclick="editOrder(${
                      order.id
                    })" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
    tableBody.appendChild(row);
  });
}

// Update the initializeCharts function to not use an undefined usersData variable
function initializeCharts() {
  // Get data from localStorage
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");

  // Orders Chart - Check if chart already exists and destroy it
  const ordersCtx = document.getElementById("ordersChart");
  if (ordersCtx) {
    // Destroy existing chart if it exists
    if (charts.orders) {
      charts.orders.destroy();
    }

    charts.orders = new Chart(ordersCtx.getContext("2d"), {
      type: "line",
      data: {
        labels: getLastNDays(7),
        datasets: [
          {
            label: "Orders",
            data: calculateDailyOrders(usersData.orders || [], 7),
            borderColor: "#4CAF50",
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          x: {
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
        },
      },
    });
  }

  // Revenue Chart
  const revenueCtx = document.getElementById("revenueChart");
  if (revenueCtx) {
    // Destroy existing chart if it exists
    if (charts.revenue) {
      charts.revenue.destroy();
    }

    charts.revenue = new Chart(revenueCtx.getContext("2d"), {
      type: "bar",
      data: {
        labels: getLastNMonthLabels(6),
        datasets: [
          {
            label: "Revenue",
            data: calculateMonthlyRevenue(usersData.orders || []),
            backgroundColor: "#2196F3",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              callback: function (value) {
                return "Br " + value.toLocaleString();
              },
            },
          },
          x: {
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
        },
      },
    });
  }

  // Inventory Chart
  const inventoryCtx = document.getElementById("inventoryChart");
  if (inventoryCtx) {
    // Destroy existing chart if it exists
    if (charts.inventory) {
      charts.inventory.destroy();
    }

    const inventoryData = calculateInventoryByCategory(
      usersData.warehouse || {}
    );
    charts.inventory = new Chart(inventoryCtx.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: inventoryData.labels,
        datasets: [
          {
            data: inventoryData.values,
            backgroundColor: [
              "#4CAF50",
              "#2196F3",
              "#FF9800",
              "#9C27B0",
              "#F44336",
              "#00BCD4",
              "#FF5722",
              "#795548",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
          },
        },
      },
    });
  }

  // Income vs Expense Chart - This needs to be initialized properly
  const incomeExpenseCtx = document.getElementById("incomeExpenseChart");
  if (incomeExpenseCtx) {
    // Destroy existing chart if it exists
    if (charts.incomeExpense) {
      charts.incomeExpense.destroy();
    }

    charts.incomeExpense = new Chart(incomeExpenseCtx.getContext("2d"), {
      type: "bar",
      data: {
        labels: getLastNMonthLabels(6),
        datasets: [
          {
            label: "Income",
            data: calculateMonthlyRevenue(usersData.orders || []),
            backgroundColor: "rgba(76, 175, 80, 0.7)",
            borderColor: "rgba(76, 175, 80, 1)",
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false,
          },
          {
            label: "Expenses",
            data: calculateMonthlyExpenses(usersData.expenses || []),
            backgroundColor: "rgba(244, 67, 54, 0.7)",
            borderColor: "rgba(244, 67, 54, 1)",
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${formatCurrency(
                  context.raw
                )}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              callback: function (value) {
                return "Br " + value.toLocaleString();
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                size: 11,
              },
            },
          },
        },
      },
    });
  }

  // Profit Trend Chart
  const profitCtx = document.getElementById("profitChart");
  if (profitCtx) {
    // Destroy existing chart if it exists
    if (charts.profit) {
      charts.profit.destroy();
    }

    charts.profit = new Chart(profitCtx.getContext("2d"), {
      type: "line",
      data: {
        labels: getLastNMonthLabels(6),
        datasets: [
          {
            label: "Profit",
            data: calculateMonthlyProfit(
              usersData.orders || [],
              usersData.expenses || []
            ),
            borderColor: "rgba(255, 152, 0, 1)",
            backgroundColor: "rgba(255, 152, 0, 0.1)",
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "rgba(255, 152, 0, 1)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Profit: ${formatCurrency(context.raw)}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              callback: function (value) {
                return "Br " + value.toLocaleString();
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                size: 11,
              },
            },
          },
        },
      },
    });
  }
}

// Add helper functions for chart data
function getLastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString("en-US", { weekday: "short" }));
  }
  return days;
}

function calculateDailyOrders(orders, days = 7) {
  const dailyCounts = new Array(days).fill(0);
  const today = new Date();

  orders.forEach((order) => {
    const orderDate = new Date(
      order.orderDate || order.createdAt || order.timestamp
    );
    if (isNaN(orderDate)) return;

    const diffDays = Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < days) {
      dailyCounts[diffDays]++;
    }
  });

  return dailyCounts.reverse();
}

function getLastNMonthLabels(n) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleString("en-US", { month: "short" }));
  }
  return months;
}

// Also update the loadSectionData to initialize product form
function loadSectionData(sectionId) {
  switch (sectionId) {
    case "dashboard":
      loadDashboardData();
      break;
    case "warehouse":
      loadWarehouseData();
      break;
    case "products":
      loadProductsData();
      initializeProductForm();
      break;
    case "operators":
      loadOperatorsData();
      break;
    case "customers":
      loadCustomersData();
      break;
    case "finance":
      loadFinanceData();
      break;
    case "reports":
      loadReportsData();
      break;
    case "settings":
      loadSettingsData();
      break;
    case "messages":
      loadMessagesData();
      break;
    case "drivers":
      loadDriversData();
      break;
  }
}

// Fix for the error: line 1881 - check if element exists before accessing
document.addEventListener("DOMContentLoaded", function () {
  // Check if productImage element exists before adding event listener
  const productImageInput = document.getElementById("productImage");
  if (productImageInput) {
    productImageInput.addEventListener("change", handleImageUpload);
  }

  // Initialize the dashboard
  initializeAdminDashboard();
  updateAllCounts();
});

// Update the updateCharts function
function updateCharts(data) {
  if (!data) data = JSON.parse(localStorage.getItem("millUsers") || "{}");

  // Update orders chart
  if (charts.orders) {
    charts.orders.data.labels = getLastNDays(7);
    charts.orders.data.datasets[0].data = calculateDailyOrders(
      data.orders || [],
      7
    );
    charts.orders.update();
  }

  // Update revenue chart
  if (charts.revenue) {
    charts.revenue.data.labels = getLastNMonthLabels(6);
    charts.revenue.data.datasets[0].data = calculateMonthlyRevenue(
      data.orders || []
    );
    charts.revenue.update();
  }

  // Update inventory chart
  if (charts.inventory) {
    const inventoryData = calculateInventoryByCategory(data.warehouse || {});
    charts.inventory.data.labels = inventoryData.labels;
    charts.inventory.data.datasets[0].data = inventoryData.values;
    charts.inventory.update();
  }

  // Add finance chart updates
  if (charts.incomeExpense) {
    const monthlyRevenue = calculateMonthlyRevenue(data.orders || []);
    const monthlyExpenses = calculateMonthlyExpenses(data.expenses || []);

    charts.incomeExpense.data.labels = getLastNMonthLabels(6);
    charts.incomeExpense.data.datasets[0].data = monthlyRevenue;
    charts.incomeExpense.data.datasets[1].data = monthlyExpenses;
    charts.incomeExpense.update();
  }

  if (charts.profit) {
    charts.profit.data.labels = getLastNMonthLabels(6);
    charts.profit.data.datasets[0].data = calculateMonthlyProfit(
      data.orders || [],
      data.expenses || []
    );
    charts.profit.update();
  }
}

function calculateMonthlyExpenses(expenses) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  const totals = months.map(() => 0);

  expenses.forEach((expense) => {
    const expenseDate = new Date(
      expense.timestamp || expense.date || expense.createdAt
    );
    if (isNaN(expenseDate)) return;

    for (let i = 0; i < months.length; i++) {
      if (
        expenseDate.getFullYear() === months[i].year &&
        expenseDate.getMonth() === months[i].month
      ) {
        totals[i] += Number(expense.amount) || 0;
        break;
      }
    }
  });

  return totals.map((v) => Math.round(v * 100) / 100);
}

function calculateMonthlyProfit(orders, expenses) {
  const monthlyRevenue = calculateMonthlyRevenue(orders);
  const monthlyExpenses = calculateMonthlyExpenses(expenses);

  return monthlyRevenue.map((revenue, index) => {
    const expense = monthlyExpenses[index] || 0;
    return Math.round((revenue - expense) * 100) / 100;
  });
}

// Income vs Expense Chart
const incomeExpenseCtx = document.getElementById("incomeExpenseChart");
if (incomeExpenseCtx) {
  charts.incomeExpense = new Chart(incomeExpenseCtx.getContext("2d"), {
    type: "bar",
    data: {
      labels: getLastNMonthLabels(6),
      datasets: [
        {
          label: "Income",
          data: calculateMonthlyRevenue(usersData.orders || []),
          backgroundColor: "rgba(76, 175, 80, 0.7)",
          borderColor: "rgba(76, 175, 80, 1)",
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: "Expenses",
          data: calculateMonthlyExpenses(usersData.expenses || []),
          backgroundColor: "rgba(244, 67, 54, 0.7)",
          borderColor: "rgba(244, 67, 54, 1)",
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
          ticks: {
            callback: function (value) {
              return "Br " + value.toLocaleString();
            },
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 11,
            },
          },
        },
      },
    },
  });
}

// Profit Trend Chart
const profitCtx = document.getElementById("profitChart");
if (profitCtx) {
  charts.profit = new Chart(profitCtx.getContext("2d"), {
    type: "line",
    data: {
      labels: getLastNMonthLabels(6),
      datasets: [
        {
          label: "Profit",
          data: calculateMonthlyProfit(
            usersData.orders || [],
            usersData.expenses || []
          ),
          borderColor: "rgba(255, 152, 0, 1)",
          backgroundColor: "rgba(255, 152, 0, 0.1)",
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "rgba(255, 152, 0, 1)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Profit: ${formatCurrency(context.raw)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
          ticks: {
            callback: function (value) {
              return "Br " + value.toLocaleString();
            },
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 11,
            },
          },
        },
      },
    },
  });
}

function formatCurrency(amount) {
  return (
    "Br " +
    amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
// Make sure charts are initialized properly
document.addEventListener("DOMContentLoaded", function () {
  // Initialize charts after a short delay to ensure DOM is ready
  setTimeout(() => {
    initializeCharts();
    updateCharts();
  }, 500);
});

// Warehouse Functions
function loadWarehouseData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const warehouse = usersData.warehouse || {};
  currentWarehouseData = warehouse;

  updateWarehouseSummary(warehouse);
  loadWarehouseItems(warehouse);
  loadCategoryItems(warehouse);
}

function updateWarehouseSummary(warehouse) {
  let totalInvestment = 0;
  let totalWeight = 0;
  let lowStockCount = 0;
  let totalItems = Object.keys(warehouse).length;

  Object.values(warehouse).forEach((item) => {
    totalInvestment += (item.quantity || 0) * (item.purchasePrice || 0);
    totalWeight += item.quantity || 0;
    if ((item.quantity || 0) < (item.alertLevel || 0)) {
      lowStockCount++;
    }
  });

  document.getElementById("totalInvestment").textContent =
    formatCurrency(totalInvestment);
  document.getElementById("totalWeight").textContent =
    formatNumber(totalWeight);
  document.getElementById("lowStockCount").textContent = lowStockCount;
  document.getElementById("totalItems").textContent = totalItems;
}

function loadWarehouseItems(warehouse) {
  const tableBody = document.querySelector("#warehouseTable tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  // Group items by category first
  const itemsByCategory = {};

  Object.entries(warehouse).forEach(([itemName, item]) => {
    const category = item.category || "Uncategorized";
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push({ name: itemName, ...item });
  });

  // Sort categories
  const sortedCategories = ["Grain", "Legume", "Other", "Uncategorized"];

  sortedCategories.forEach((category) => {
    const items = itemsByCategory[category] || [];

    items.forEach((item) => {
      const totalInvestment = (item.quantity || 0) * (item.purchasePrice || 0);
      const status =
        (item.quantity || 0) < (item.alertLevel || 0)
          ? "Low Stock"
          : "In Stock";

      const row = document.createElement("tr");
      row.innerHTML = `
            <td>${item.name}</td>
            <td>${category}</td>
            <td>${formatNumber(item.quantity || 0)}</td>
            <td>${formatCurrency(item.purchasePrice || 0)}</td>
            <td>${formatCurrency(item.sellPrice || 0)}</td>
            <td>${formatCurrency(totalInvestment)}</td>
            <td>${formatNumber(item.alertLevel || 0)}</td>
            <td><span class="status-badge ${
              status === "Low Stock" ? "status-cancelled" : "status-completed"
            }">${status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-icon btn-outline" onclick="editWarehouseItem('${
                      item.name
                    }')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="deleteWarehouseItem('${
                      item.name
                    }')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
      tableBody.appendChild(row);
    });
  });
}

function loadCategoryItems(warehouse) {
  const grains = Object.entries(warehouse).filter(
    ([_, item]) => item.category === "Grain"
  );
  const legumes = Object.entries(warehouse).filter(
    ([_, item]) => item.category === "Legume"
  );
  const others = Object.entries(warehouse).filter(
    ([_, item]) => item.category === "Other"
  );

  loadCategoryList("grainsList", grains);
  loadCategoryList("legumesList", legumes);
  loadCategoryList("othersList", others);
}

function loadCategoryList(elementId, items) {
  const container = document.getElementById(elementId);
  container.innerHTML = "";

  items.forEach(([name, item]) => {
    const percentage = Math.min((item.quantity / item.alertLevel) * 100, 100);

    const div = document.createElement("div");
    div.className = "category-item";
    div.innerHTML = `
            <span>${name}</span>
            <div class="stock-info">
                <span>${formatNumber(item.quantity)} kg</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    container.appendChild(div);
  });
}

function showAddItemForm() {
  document.getElementById("addItemForm").style.display = "block";
  document.getElementById("warehouseForm").reset();

  // Clear editing state
  const formCard = document.getElementById("addItemForm");
  if (formCard && formCard.dataset && formCard.dataset.editingName) {
    delete formCard.dataset.editingName;
  }

  window.scrollTo({
    top: document.getElementById("addItemForm").offsetTop - 20,
    behavior: "smooth",
  });
}

function hideAddItemForm() {
  document.getElementById("addItemForm").style.display = "none";
}

function saveWarehouseItem(e) {
  e.preventDefault();

  const itemName = document.getElementById("itemName").value.trim();
  const category = document.getElementById("itemCategory").value;
  const purchasePrice = parseFloat(
    document.getElementById("purchasePrice").value
  );
  const sellPrice = parseFloat(document.getElementById("sellPrice").value);
  const totalQuantity = parseFloat(
    document.getElementById("totalQuantity").value
  );
  const alertLevel = parseFloat(document.getElementById("alertLevel").value);
  const description = document.getElementById("itemDescription").value;

  // Validation
  if (
    !itemName ||
    !category ||
    purchasePrice <= 0 ||
    sellPrice <= 0 ||
    totalQuantity <= 0
  ) {
    showToast("Please fill in all required fields with valid values.", "error");
    return;
  }

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  if (!usersData.warehouse) usersData.warehouse = {};

  // Check if editing existing item
  const formCard = document.getElementById("addItemForm");
  const editingName =
    formCard && formCard.dataset && formCard.dataset.editingName
      ? formCard.dataset.editingName
      : null;

  // If editing and the name changed, remove the old key
  if (
    editingName &&
    editingName !== itemName &&
    usersData.warehouse &&
    usersData.warehouse[editingName]
  ) {
    delete usersData.warehouse[editingName];
  }

  // Create or update warehouse item
  usersData.warehouse[itemName] = {
    category,
    purchasePrice,
    sellPrice,
    quantity: totalQuantity,
    alertLevel,
    description,
    lastUpdated: new Date().toISOString(),
  };

  // Update any linked products
  if (usersData.products) {
    usersData.products.forEach((product) => {
      if (product.name === itemName || product.subcategory === itemName) {
        product.price = sellPrice;
        product.category = category;
      }
    });
  }

  // Clear editing state
  if (formCard && formCard.dataset && formCard.dataset.editingName)
    delete formCard.dataset.editingName;

  localStorage.setItem("millUsers", JSON.stringify(usersData));

  hideAddItemForm();
  loadWarehouseData();
  updateAllCounts();
  showToast(
    editingName
      ? "Item updated successfully!"
      : "Item added to warehouse successfully!",
    "success"
  );
}

// loadSectionData(sectionId);

// Add event listener for DOMContentLoaded to ensure proper initialization
document.addEventListener("DOMContentLoaded", function () {
  // Initialize product form when products section is active
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "childList") {
        const productsSection = document.getElementById("products");
        if (productsSection && productsSection.classList.contains("active")) {
          initializeProductForm();
        }
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
});

function loadProductsGrid(products) {
  const grid = document.getElementById("productsGridAdmin");
  if (!grid) return;

  grid.innerHTML = "";

  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card-admin";

    // Determine image source
    let imageSrc = "";
    let imageAlt = product.name || "Product";

    if (product.image) {
      if (product.image.startsWith("data:image")) {
        // Base64 image
        imageSrc = product.image;
      } else if (product.image.startsWith("http")) {
        // URL image
        imageSrc = product.image;
      }
    }

    card.innerHTML = `
            <div class="product-image-admin">
                ${
                  imageSrc
                    ? `<img src="${imageSrc}" alt="${imageAlt}" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'no-image\\'><i class=\\'fas fa-image\\'></i><span>No Image</span></div>';" loading="lazy">`
                    : `<div class="no-image">
                        <i class="fas fa-image"></i>
                        <span>No Image</span>
                    </div>`
                }
                ${
                  product.posted ? `<div class="posted-badge">Posted</div>` : ""
                }
            </div>
            <div class="product-content-admin">
                <h4>${escapeHtml(product.name || "Unnamed Product")}</h4>
                <p class="product-category">${escapeHtml(
                  product.category || "Uncategorized"
                )}</p>
                <p class="product-price">${formatCurrency(
                  product.price || 0
                )}/kg</p>
                <p class="product-milling">Milling: ${formatCurrency(
                  product.millingFee || 0
                )}/kg</p>
                ${
                  product.description
                    ? `<p class="product-description">${escapeHtml(
                        product.description.substring(0, 100)
                      )}${product.description.length > 100 ? "..." : ""}</p>`
                    : ""
                }
                
                <div class="product-actions-admin">
                    <button class="btn btn-sm ${
                      product.posted ? "btn-outline" : "btn-primary"
                    }" 
                            onclick="toggleProductPost(${product.id})">
                        <i class="fas ${
                          product.posted ? "fa-eye-slash" : "fa-eye"
                        }"></i>
                        ${product.posted ? "Unpost" : "Post"}
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="editProduct(${
                      product.id
                    })">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${
                      product.id
                    })">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    grid.appendChild(card);
  });
}

function hideProductForm() {
  const card = document.getElementById("productFormCard");
  if (card) {
    // clear editing state when hiding
    if (card.dataset && card.dataset.editingId) delete card.dataset.editingId;
    card.style.display = "none";
  }
}

// Driver Functions

function showProductForm() {
  document.getElementById("productFormCard").style.display = "block";
  document.getElementById("productFormTitle").textContent = "Add New Product";
  document.getElementById("productForm").reset();
  document.getElementById("postProductBtn").style.display = "none";
  document.getElementById("saveProductBtn").style.display = "block";

  // Reset image preview
  document.getElementById("productImagePreview").style.display = "none";
  document.getElementById("imagePlaceholder").style.display = "block";
  document.getElementById("productImageBase64").value = "";
  document.getElementById("productImageFile").value = "";

  // Initialize form logic
  initializeProductForm();
}

function initializeProductForm() {
  initializeProductFormPriceAutoFill();

  // Trigger category change to populate suggestions
  const categorySelect = document.getElementById("productCategory");
  if (categorySelect) {
    const event = new Event("change");
    categorySelect.dispatchEvent(event);
  }
}

// function loadDriversData() {
//   const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
//   const drivers = usersData.drivers || [];

//   loadDriversGrid(drivers);
//   loadDriverAssignments(drivers);
// }

// Fix for the usersData reference error
function loadDriversData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const drivers = usersData.drivers || [];

  loadDriversGrid(drivers);
  loadDriverAssignments(drivers);
}

// function loadDriversGrid(drivers) {
//   const grid = document.getElementById("driversGrid");
//   if (!grid) return;

//   grid.innerHTML = "";

//   drivers.forEach((driver) => {
//     const card = document.createElement("div");
//     card.className = "driver-card";
//     card.innerHTML = `
//             <div class="driver-avatar">
//                 <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
//                   driver.name
//                 )}&background=2196F3&color=fff" alt="${driver.name}">
//             </div>
//             <div class="driver-info">
//                 <h4>${driver.name}</h4>
//                 <p><i class="fas fa-envelope"></i> ${driver.email}</p>
//                 <p><i class="fas fa-phone"></i> ${driver.phone}</p>
//                 <p><i class="fas fa-id-card"></i> ${driver.license || "N/A"}</p>
//                 <p><i class="fas fa-truck"></i> ${driver.vehicle || "N/A"}</p>
//                 <span class="driver-status status-${
//                   driver.status || "active"
//                 }">${driver.status || "Active"}</span>
//             </div>
//             <div class="driver-actions">
//                 <button class="btn btn-sm btn-outline" onclick="editDriver(${
//                   driver.id
//                 })" title="Edit">
//                     <i class="fas fa-edit"></i>
//                 </button>
//                 <button class="btn btn-sm btn-warning" onclick="showResetDriverPassword(${
//                   driver.id
//                 })" title="Reset Password">
//                     <i class="fas fa-key"></i>
//                 </button>
//                 <button class="btn btn-sm btn-danger" onclick="deleteDriver(${
//                   driver.id
//                 })" title="Delete">
//                     <i class="fas fa-trash"></i>
//                 </button>
//                 <button class="btn btn-sm btn-primary" onclick="messageDriver(${
//                   driver.id
//                 })" title="Message">
//                     <i class="fas fa-envelope"></i>
//                 </button>
//             </div>
//         `;
//     grid.appendChild(card);
//   });
// }

function loadDriversGrid(drivers) {
  const grid = document.getElementById("driversGrid");
  if (!grid) return;

  grid.innerHTML = "";

  drivers.forEach((driver) => {
    const card = document.createElement("div");
    card.className = "driver-card";
    card.innerHTML = `
            <div class="driver-avatar">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
                  driver.name
                )}&background=2196F3&color=fff" alt="${driver.name}">
            </div>
            <div class="driver-info">
                <h4>${driver.name}</h4>
                <p><i class="fas fa-envelope"></i> ${driver.email}</p>
                <p><i class="fas fa-phone"></i> ${driver.phone}</p>
                <p><i class="fas fa-id-card"></i> ${driver.license || "N/A"}</p>
                <p><i class="fas fa-truck"></i> ${driver.vehicle || "N/A"}</p>
                <span class="driver-status status-${
                  driver.status || "active"
                }">${driver.status || "Active"}</span>
            </div>
            <div class="driver-actions">
                <button class="btn btn-sm btn-outline" onclick="editDriver(${
                  driver.id
                })" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="showResetDriverPassword(${
                  driver.id
                })" title="Reset Password">
                    <i class="fas fa-key"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteDriver(${
                  driver.id
                })" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn btn-sm btn-primary" onclick="messageDriver(${
                  driver.id
                })" title="Message">
                    <i class="fas fa-envelope"></i>
                </button>
            </div>
        `;
    grid.appendChild(card);
  });
}

function processOrderForWarehouse(order, usersData) {
  if (!order || order.status === "Cancelled") return false;

  const warehouse = usersData.warehouse || {};
  const orderQuantity = parseFloat(order.quantity) || 0;

  if (orderQuantity <= 0) return false;

  // Find product name from order
  let productName = "";

  if (order.productName) {
    productName = order.productName;
  } else if (order.productId) {
    // Try to find product name from products list
    const products = usersData.products || [];
    const product = products.find(
      (p) => String(p.id) === String(order.productId)
    );
    if (product) {
      productName = product.name;
    }
  }

  if (!productName) {
    console.warn("Could not determine product name for order:", order);
    return false;
  }

  // Find warehouse item (exact name match first, then case-insensitive)
  let warehouseItem = warehouse[productName];
  let foundKey = productName;

  if (!warehouseItem) {
    // Try case-insensitive match
    for (const key in warehouse) {
      if (key.toLowerCase() === productName.toLowerCase()) {
        warehouseItem = warehouse[key];
        foundKey = key;
        break;
      }
    }
  }

  if (!warehouseItem) {
    console.warn(`Product "${productName}" not found in warehouse`);
    return false;
  }

  const currentQuantity = parseFloat(warehouseItem.quantity) || 0;

  // Check if enough stock
  if (currentQuantity < orderQuantity) {
    console.warn(
      `Insufficient stock for ${productName}. Required: ${orderQuantity}, Available: ${currentQuantity}`
    );

    // Create notification for low stock
    createLowStockNotification(
      productName,
      currentQuantity,
      warehouseItem.alertLevel || 0,
      usersData
    );

    return false;
  }

  // Decrease quantity
  const newQuantity = currentQuantity - orderQuantity;
  warehouseItem.quantity = Math.max(0, Math.round(newQuantity * 100) / 100);
  warehouseItem.lastUpdated = new Date().toISOString();

  // Check for low stock alert after deduction
  const alertLevel = parseFloat(warehouseItem.alertLevel) || 0;
  if (alertLevel > 0 && warehouseItem.quantity <= alertLevel) {
    createLowStockNotification(
      productName,
      warehouseItem.quantity,
      alertLevel,
      usersData
    );
  }

  // Mark order as processed
  order.warehouseProcessed = true;

  console.log(
    `Warehouse updated: ${productName} decreased by ${orderQuantity}kg. New quantity: ${warehouseItem.quantity}kg`
  );
  return true;
}

function loadDriverAssignments(drivers) {
  const assignmentsList = document.getElementById("driverAssignmentsList");
  if (!assignmentsList) return;

  assignmentsList.innerHTML = "";

  // Get current orders that need delivery
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const orders = usersData.orders || [];
  const pendingOrders = orders.filter(
    (order) =>
      order.status === "Processing" || order.status === "Ready for Delivery"
  );

  if (pendingOrders.length === 0) {
    assignmentsList.innerHTML =
      '<p class="muted">No pending deliveries at the moment.</p>';
    return;
  }

  pendingOrders.forEach((order) => {
    const customer = (usersData.customers || []).find(
      (c) => c.id === order.customerId
    );
    const product = (usersData.products || []).find(
      (p) => p.id === order.productId
    );

    const assignmentItem = document.createElement("div");
    assignmentItem.className = "assignment-item";
    assignmentItem.innerHTML = `
            <div>
                <strong>Order #${
                  order.id?.toString().slice(-6) || "N/A"
                }</strong>
                <p>${customer?.name || "Unknown Customer"}</p>
                <small>${product?.name || order.productName || "Product"}: ${
      order.quantity || 0
    }kg</small>
            </div>
            <div class="assignment-actions">
                <select class="driver-assign-select" data-order-id="${
                  order.id
                }" onchange="assignDriverToOrder(${order.id}, this.value)">
                    <option value="">Assign Driver</option>
                    ${drivers
                      .map(
                        (driver) =>
                          `<option value="${driver.id}" ${
                            order.driverId === driver.id ? "selected" : ""
                          }>
                            ${driver.name} - ${driver.vehicle || "No vehicle"}
                        </option>`
                      )
                      .join("")}
                </select>
            </div>
        `;
    assignmentsList.appendChild(assignmentItem);
  });
}

function showDriverModal() {
  const modal = document.getElementById("driverModal");
  if (modal) {
    modal.style.display = "flex";
    modal.querySelector("#driverModalTitle").textContent = "Add Driver";
    modal.querySelector("#driverForm").reset();
    // Clear editing state
    if (modal.dataset && modal.dataset.editingId) {
      delete modal.dataset.editingId;
    }
  }
}

function hideDriverModal() {
  const modal = document.getElementById("driverModal");
  if (modal) {
    modal.style.display = "none";
    // Clear editing state
    if (modal.dataset && modal.dataset.editingId) {
      delete modal.dataset.editingId;
    }
  }
}

function saveDriver(e) {
  e.preventDefault();

  const modal = document.getElementById("driverModal");
  const editingId =
    modal && modal.dataset && modal.dataset.editingId
      ? modal.dataset.editingId
      : null;

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  if (!usersData.drivers) usersData.drivers = [];

  // Gather form values
  const name = document.getElementById("driverName").value;
  const email = document.getElementById("driverEmail").value;
  const phone = document.getElementById("driverPhone").value;
  const license = document.getElementById("driverLicense").value;
  const password = document.getElementById("driverPassword").value;
  const vehicle = document.getElementById("driverVehicle").value;
  const status = document.getElementById("driverStatus").value;

  if (editingId) {
    // Update existing driver
    const idx = usersData.drivers.findIndex(
      (d) => String(d.id) === String(editingId)
    );
    if (idx !== -1) {
      const existing = usersData.drivers[idx];
      existing.name = name;
      existing.email = email;
      existing.phone = phone;
      existing.license = license;
      // Only update password if provided
      if (password && password.trim() !== "") existing.password = password;
      existing.vehicle = vehicle;
      existing.status = status;
      existing.updatedAt = new Date().toISOString();

      usersData.drivers[idx] = existing;
      localStorage.setItem("millUsers", JSON.stringify(usersData));

      delete modal.dataset.editingId;
      hideDriverModal();
      loadDriversData();
      showToast("Driver updated successfully!", "success");
      return;
    }
  }

  // Create new driver
  const driverData = {
    id: Date.now(),
    name,
    email,
    phone,
    license,
    password,
    vehicle,
    status,
    role: "driver",
    createdAt: new Date().toISOString(),
  };

  usersData.drivers.push(driverData);
  localStorage.setItem("millUsers", JSON.stringify(usersData));

  hideDriverModal();
  loadDriversData();
  showToast("Driver added successfully!", "success");
}

function editDriver(driverId) {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const drivers = usersData.drivers || [];
  const driver = drivers.find((d) => String(d.id) === String(driverId));

  if (!driver) {
    showToast("Driver not found.", "error");
    return;
  }

  const modal = document.getElementById("driverModal");
  if (modal) {
    modal.dataset.editingId = String(driverId);
    modal.querySelector("#driverModalTitle").textContent = "Edit Driver";

    // Populate form fields
    document.getElementById("driverName").value = driver.name || "";
    document.getElementById("driverEmail").value = driver.email || "";
    document.getElementById("driverPhone").value = driver.phone || "";
    document.getElementById("driverLicense").value = driver.license || "";
    document.getElementById("driverPassword").value = ""; // Don't show current password
    document.getElementById("driverVehicle").value = driver.vehicle || "Truck";
    document.getElementById("driverStatus").value = driver.status || "active";

    modal.style.display = "flex";
  }
}

function showResetDriverPassword(driverId) {
  const modal = document.getElementById("resetDriverPasswordModal");
  if (modal) {
    modal.dataset.driverId = driverId;
    document.getElementById("resetDriverId").value = driverId;
    modal.style.display = "flex";
  }
}

function hideResetDriverPasswordModal() {
  const modal = document.getElementById("resetDriverPasswordModal");
  if (modal) {
    modal.style.display = "none";
    modal.querySelector("#resetDriverPasswordForm").reset();
    if (modal.dataset && modal.dataset.driverId) {
      delete modal.dataset.driverId;
    }
  }
}

function resetDriverPassword(e) {
  e.preventDefault();

  const modal = document.getElementById("resetDriverPasswordModal");
  const driverId = modal && modal.dataset && modal.dataset.driverId;

  const newPassword = document.getElementById("newDriverPassword").value;
  const confirmPassword = document.getElementById(
    "confirmDriverPassword"
  ).value;

  if (newPassword !== confirmPassword) {
    showToast("Passwords do not match!", "error");
    return;
  }

  if (newPassword.length < 6) {
    showToast("Password must be at least 6 characters!", "error");
    return;
  }

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const driverIndex = usersData.drivers?.findIndex(
    (d) => String(d.id) === String(driverId)
  );

  if (driverIndex !== -1 && driverIndex !== undefined) {
    usersData.drivers[driverIndex].password = newPassword;
    usersData.drivers[driverIndex].passwordUpdatedAt = new Date().toISOString();

    localStorage.setItem("millUsers", JSON.stringify(usersData));

    hideResetDriverPasswordModal();
    loadDriversData();
    showToast("Driver password reset successfully!", "success");
  } else {
    showToast("Driver not found.", "error");
  }
}

function deleteDriver(driverId) {
  if (confirm("Are you sure you want to delete this driver?")) {
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const driverIndex = usersData.drivers?.findIndex((d) => d.id === driverId);

    if (driverIndex !== -1 && driverIndex !== undefined) {
      usersData.drivers.splice(driverIndex, 1);
      localStorage.setItem("millUsers", JSON.stringify(usersData));
      loadDriversData();
      showToast("Driver deleted successfully!", "success");
    }
  }
}

function assignDriverToOrder(orderId, driverId) {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const orderIndex = usersData.orders?.findIndex((o) => o.id === orderId);
  const driver = usersData.drivers?.find((d) => d.id === parseInt(driverId));

  if (orderIndex !== -1 && orderIndex !== undefined) {
    usersData.orders[orderIndex].driverId = driverId
      ? parseInt(driverId)
      : null;
    usersData.orders[orderIndex].driverAssignedAt = new Date().toISOString();

    if (driverId) {
      // Create notification for the driver
      if (!usersData.messages) usersData.messages = [];
      usersData.messages.push({
        id: Date.now(),
        from: { role: "admin", id: currentAdmin ? currentAdmin.id : null },
        to: { role: "driver", id: parseInt(driverId) },
        content: `You have been assigned to deliver Order #${orderId}`,
        timestamp: new Date().toISOString(),
        read: false,
        type: "assignment",
      });

      // Update driver status
      const driverIndex = usersData.drivers?.findIndex(
        (d) => d.id === parseInt(driverId)
      );
      if (driverIndex !== -1 && driverIndex !== undefined) {
        usersData.drivers[driverIndex].status = "on_delivery";
      }

      showToast(`Order assigned to ${driver?.name || "driver"}`, "success");
    } else {
      showToast("Driver assignment removed", "info");
    }

    localStorage.setItem("millUsers", JSON.stringify(usersData));
    loadDriversData();
  }
}

function messageDriver(driverId) {
  // Navigate to messages section and select the driver
  navigateToSection("messages");

  // Ensure contacts are loaded
  try {
    loadMessagesData();
  } catch (e) {}

  // Small delay to allow DOM to update
  setTimeout(() => {
    const contactsList = document.getElementById("contactsList");
    if (!contactsList) {
      showToast("Messages UI not available.", "error");
      return;
    }

    const selector = `.contact-item[data-contact-id="${driverId}"][data-contact-type="driver"]`;
    let item = contactsList.querySelector(selector);

    if (item) {
      item.click();
      showToast("Opened chat with driver.", "success");
    } else {
      // If there is no existing contact, load drivers and add to contacts
      startNewMessage();
      showToast("Driver contact loaded.", "info");
    }
  }, 150);
}

// Update the contacts array to include drivers
const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
const drivers = usersData.drivers || [];

// // In the contacts array, add:
// drivers.forEach((d) =>
//   contacts.push({
//     id: d.id,
//     name: d.name || d.email || "Driver",
//     type: "driver",
//   })
// );

// // Add drivers to contacts array
// drivers.forEach((d) =>
//   contacts.push({
//     id: d.id,
//     name: d.name || d.email || "Driver",
//     type: "driver",
//   })
// );

// Add drivers to contacts array
drivers.forEach((d) =>
  contacts.push({
    id: d.id,
    name: d.name || d.email || "Driver",
    type: "driver",
  })
);
 
function postProduct() {
  // Implementation for posting product
  showToast("Product posted to customers!", "success");
}

// Operator Functions
function loadOperatorsData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const operators = usersData.operators || [];

  loadOperatorsGrid(operators);
}

function loadOperatorsGrid(operators) {
  const grid = document.getElementById("operatorsGrid");
  grid.innerHTML = "";

  operators.forEach((operator) => {
    const card = document.createElement("div");
    card.className = "operator-card";
    card.innerHTML = `
            <div class="operator-avatar">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
                  operator.name
                )}&background=2196F3&color=fff" alt="${operator.name}">
            </div>
            <div class="operator-info">
                <h4>${operator.name}</h4>
                <p>${operator.email}</p>
                <p>${operator.phone}</p>
                <div class="operator-assignments">
                    ${
                      operator.assignments
                        ? operator.assignments.join(", ")
                        : "No assignments"
                    }
                </div>
            </div>
            <div class="operator-actions">
                <button class="btn btn-icon btn-outline" onclick="editOperator(${
                  operator.id
                })" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-icon btn-danger" onclick="deleteOperator(${
                  operator.id
                })" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    grid.appendChild(card);
  });
}

function showOperatorModal() {
  document.getElementById("operatorModal").style.display = "flex";
  document.getElementById("operatorModalTitle").textContent = "Add Operator";
  document.getElementById("operatorForm").reset();
}

function hideOperatorModal() {
  document.getElementById("operatorModal").style.display = "none";
}

updatePriceFromWarehouse();

function saveOperator(e) {
  e.preventDefault();

  const modal = document.getElementById("operatorModal");
  const editingId =
    modal && modal.dataset && modal.dataset.editingId
      ? modal.dataset.editingId
      : null;

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  if (!usersData.operators) usersData.operators = [];

  // Gather form values
  const name = document.getElementById("operatorName").value;
  const email = document.getElementById("operatorEmail").value;
  const phone = document.getElementById("operatorPhone").value;
  const password = document.getElementById("operatorPassword").value;
  const assignments = Array.from(
    document.querySelectorAll('input[name="assignment"]:checked')
  ).map((cb) => cb.value);

  if (editingId) {
    // Update existing operator
    const idx = usersData.operators.findIndex(
      (o) => String(o.id) === String(editingId)
    );
    if (idx !== -1) {
      const existing = usersData.operators[idx];
      existing.name = name;
      existing.email = email;
      existing.phone = phone;
      // Only overwrite password if a new one provided
      if (password && password.trim() !== "") existing.password = password;
      existing.assignments = assignments;
      existing.updatedAt = new Date().toISOString();

      usersData.operators[idx] = existing;
      localStorage.setItem("millUsers", JSON.stringify(usersData));
      delete modal.dataset.editingId;
      hideOperatorModal();
      loadOperatorsData();
      showToast("Operator updated successfully!", "success");
      return;
    }
    // If not found, fall through to create
  }

  // Create new operator
  const operatorData = {
    id: Date.now(),
    name,
    email,
    phone,
    password,
    role: "operator",
    assignments,
    createdAt: new Date().toISOString(),
  };

  usersData.operators.push(operatorData);
  localStorage.setItem("millUsers", JSON.stringify(usersData));

  hideOperatorModal();
  loadOperatorsData();
  showToast("Operator added successfully!", "success");
}

// Customer Functions
function loadCustomersData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const customers = usersData.customers || [];
  const orders = usersData.orders || [];

  loadCustomersTable(customers, orders);
}

function loadCustomersTable(customers, orders) {
  const tableBody = document.querySelector("#customersTable tbody");
  tableBody.innerHTML = "";

  customers.forEach((customer) => {
    const customerOrders = orders.filter((o) => o.customerId === customer.id);
    const totalSpent = customerOrders.reduce(
      (sum, order) => sum + (order.total || 0),
      0
    );

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>#${customer.id.toString().slice(-6)}</td>
            <td>${customer.name}</td>
            <td>${customer.phone}</td>
            <td>${customer.email}</td>
            <td>${
              customer.address
                ? customer.address.substring(0, 30) + "..."
                : "N/A"
            }</td>
            <td>${customerOrders.length}</td>
            <td>${formatCurrency(totalSpent)}</td>
            <td>
                <span class="status-badge status-completed">Active</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-icon btn-outline" onclick="viewCustomerDetails(${
                      customer.id
                    })" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon btn-outline" onclick="messageCustomer(${
                      customer.id
                    })" title="Message">
                        <i class="fas fa-envelope"></i>
                    </button>
                </div>
            </td>
        `;
    tableBody.appendChild(row);
  });
}

// Finance Functions
function loadFinanceData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const orders = usersData.orders || [];
  const expenses = usersData.expenses || [];

  updateFinanceSummary(orders, expenses);
  loadExpensesTable(expenses);
}

function updateFinanceSummary(orders, expenses) {
  const totalIncome = orders.reduce(
    (sum, order) => sum + (order.total || 0),
    0
  );
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0
  );
  const netProfit = totalIncome - totalExpenses;
  const taxExpense = totalIncome * 0.15; // 15% tax for example

  document.getElementById("totalIncome").textContent =
    formatCurrency(totalIncome);
  document.getElementById("totalExpenses").textContent =
    formatCurrency(totalExpenses);
  document.getElementById("netProfit").textContent = formatCurrency(netProfit);
  document.getElementById("taxExpense").textContent =
    formatCurrency(taxExpense);
}

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

function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function toggleAdminDarkMode() {
  const body = document.body;
  const icon = document.querySelector("#adminDarkMode i");

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

function logoutAdmin() {
  localStorage.removeItem("currentUser");
  window.location.href = "../index.html";
}

function refreshDashboard() {
  loadDashboardData();
  showToast("Data refreshed successfully!", "success");
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
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

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function startAutoRefresh() {
  // Auto-refresh every 5 minutes
  setInterval(() => {
    if (document.querySelector(".content-section.active").id === "dashboard") {
      loadDashboardData();
    }
  }, 300000);

  // Update time every minute
  setInterval(updateDateTime, 60000);
}

function viewOrderDetails(orderId) {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const orders = usersData.orders || [];
  const products = usersData.products || [];
  const customers = usersData.customers || [];

  const order = orders.find((o) => String(o.id) === String(orderId));
  if (!order) {
    showToast("Order not found.", "error");
    return;
  }

  let modal = document.getElementById("orderDetailModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "orderDetailModal";
    modal.className = "modal order-modal";
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Order Details</h3>
                    <button class="close-modal btn btn-icon" title="Close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="orderDetailBody" style="max-height:60vh; overflow:auto; padding:1rem"></div>
                <div class="modal-footer" style="padding:1rem; text-align:right">
                    <button id="editThisOrder" class="btn btn-primary">Edit Order</button>
                    <button id="deleteThisOrder" class="btn btn-danger">Delete Order</button>
                    <button class="close-modal btn btn-outline">Close</button>
                </div>
            </div>
        `;
    document.body.appendChild(modal);

    modal.querySelectorAll(".close-modal").forEach((btn) =>
      btn.addEventListener("click", () => {
        modal.style.display = "none";
      })
    );
  }

  const body = modal.querySelector("#orderDetailBody");
  const product =
    products.find((p) => String(p.id) === String(order.productId)) || {};
  const customer =
    customers.find((c) => String(c.id) === String(order.customerId)) || {};

  body.innerHTML = `
        <p><strong>Order ID:</strong> #${order.id}</p>
        <p><strong>Customer:</strong> ${escapeHtml(
          customer.name || "Unknown"
        )} (${escapeHtml(customer.email || "")})</p>
        <p><strong>Product:</strong> ${escapeHtml(
          product.name || order.productName || "N/A"
        )}</p>
        <p><strong>Quantity:</strong> ${order.quantity || 0} kg</p>
        <p><strong>Total:</strong> ${formatCurrency(order.total || 0)}</p>
        <p><strong>Status:</strong> ${escapeHtml(order.status || "Pending")}</p>
        <p><strong>Date:</strong> ${formatDate(
          order.orderDate || order.createdAt || order.timestamp
        )}</p>
        ${
          order.notes
            ? `<p><strong>Notes:</strong> ${escapeHtml(order.notes)}</p>`
            : ""
        }
    `;

  modal.querySelector("#editThisOrder").onclick = () => {
    modal.style.display = "none";
    editOrder(orderId);
  };

  modal.querySelector("#deleteThisOrder").onclick = () => {
    if (confirm("Are you sure you want to delete this order?")) {
      const idx = orders.findIndex((o) => String(o.id) === String(orderId));
      if (idx !== -1) {
        orders.splice(idx, 1);
        usersData.orders = orders;
        localStorage.setItem("millUsers", JSON.stringify(usersData));
        try {
          loadDashboardData();
        } catch (e) {}
        try {
          loadRecentOrders(usersData);
        } catch (e) {}
        showToast("Order deleted.", "success");
        modal.style.display = "none";
      }
    }
  };

  modal.style.display = "flex";
}

function editOrder(orderId) {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const orders = usersData.orders || [];
  const products = usersData.products || [];

  const order = orders.find((o) => String(o.id) === String(orderId));
  if (!order) {
    showToast("Order not found.", "error");
    return;
  }

  let modal = document.getElementById("orderEditModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "orderEditModal";
    modal.className = "modal order-edit-modal";
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Order</h3>
                    <button class="close-modal btn btn-icon" title="Close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="max-height:60vh; overflow:auto; padding:1rem">
                    <form id="orderEditForm">
                        <div class="form-row">
                            <label>Order ID</label>
                            <input type="text" id="editOrderId" readonly />
                        </div>
                        <div class="form-row">
                            <label>Product</label>
                            <input type="text" id="editOrderProduct" readonly />
                        </div>
                        <div class="form-row">
                            <label>Customer</label>
                            <input type="text" id="editOrderCustomer" readonly />
                        </div>
                        <div class="form-row">
                            <label>Quantity (kg)</label>
                            <input type="number" id="editOrderQuantity" step="0.01" />
                        </div>
                        <div class="form-row">
                            <label>Total</label>
                            <input type="number" id="editOrderTotal" step="0.01" />
                        </div>
                        <div class="form-row">
                            <label>Status</label>
                            <select id="editOrderStatus">
                                <option value="Pending">Pending</option>
                                <option value="Processing">Processing</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label>Notes</label>
                            <textarea id="editOrderNotes"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer" style="padding:1rem; text-align:right">
                    <button id="saveOrderEdit" class="btn btn-primary">Save</button>
                    <button class="close-modal btn btn-outline">Cancel</button>
                </div>
            </div>
        `;
    document.body.appendChild(modal);
    modal.querySelectorAll(".close-modal").forEach((btn) =>
      btn.addEventListener("click", () => {
        modal.style.display = "none";
      })
    );
  }

  // Prefill fields
  const product =
    products.find((p) => String(p.id) === String(order.productId)) || {};
  document.getElementById("editOrderId").value = order.id;
  document.getElementById("editOrderProduct").value =
    product.name || order.productName || "";
  const customers = usersData.customers || [];
  const customer =
    customers.find((c) => String(c.id) === String(order.customerId)) || {};
  document.getElementById("editOrderCustomer").value = customer.name || "";
  document.getElementById("editOrderQuantity").value = order.quantity || 0;
  document.getElementById("editOrderTotal").value = order.total || 0;
  document.getElementById("editOrderStatus").value = order.status || "Pending";
  document.getElementById("editOrderNotes").value = order.notes || "";

  document.getElementById("saveOrderEdit").onclick = (e) => {
    e.preventDefault();
    const qty =
      parseFloat(document.getElementById("editOrderQuantity").value) || 0;
    const total =
      parseFloat(document.getElementById("editOrderTotal").value) || 0;
    const status = document.getElementById("editOrderStatus").value;
    const notes = document.getElementById("editOrderNotes").value;

    const idx = orders.findIndex((o) => String(o.id) === String(orderId));
    if (idx !== -1) {
      orders[idx].quantity = qty;
      orders[idx].total = total;
      orders[idx].status = status;
      orders[idx].notes = notes;
      orders[idx].updatedAt = new Date().toISOString();
      usersData.orders = orders;
      localStorage.setItem("millUsers", JSON.stringify(usersData));
      try {
        loadDashboardData();
      } catch (e) {}
      try {
        loadRecentOrders(usersData);
      } catch (e) {}
      showToast("Order updated successfully.", "success");
      modal.style.display = "none";
    }
  };

  modal.style.display = "flex";
}

function deleteWarehouseItem(itemName) {
  if (confirm(`Are you sure you want to delete ${itemName} from warehouse?`)) {
    const usersData = JSON.parse(localStorage.getItem("millUsers"));
    if (usersData.warehouse && usersData.warehouse[itemName]) {
      delete usersData.warehouse[itemName];
      localStorage.setItem("millUsers", JSON.stringify(usersData));
      loadWarehouseData();
      showToast(`${itemName} deleted from warehouse!`, "success");
    }
  }
}

function initializeProductFormHTML() {
  const productForm = document.getElementById("productForm");
  if (!productForm) return;

  // Check if subcategory select exists, create if not
  let subcategorySelect = document.getElementById("productSubcategory");
  if (!subcategorySelect) {
    // Find the position to insert after category field
    const categoryField = document.getElementById("productCategory");
    if (categoryField && categoryField.parentNode) {
      const formRow = document.createElement("div");
      formRow.className = "form-row";
      formRow.innerHTML = `
        <label for="productSubcategory">Product *</label>
        <select id="productSubcategory" name="productSubcategory" required>
          <option value="">Select Product</option>
        </select>
      `;
      categoryField.parentNode.parentNode.insertBefore(
        formRow,
        categoryField.parentNode.nextSibling
      );
    }
  }
}

function toggleProductPost(productId) {
  const usersData = JSON.parse(localStorage.getItem("millUsers"));
  const productIndex = usersData.products.findIndex((p) => p.id === productId);
  if (productIndex !== -1) {
    usersData.products[productIndex].posted =
      !usersData.products[productIndex].posted;
    localStorage.setItem("millUsers", JSON.stringify(usersData));
    loadProductsData();
    showToast(
      `Product ${
        usersData.products[productIndex].posted ? "posted" : "unposted"
      } successfully!`,
      "success"
    );
  }
}

// Call this when loading products section
function loadProductsData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const products = usersData.products || [];

  // Initialize form HTML
  initializeProductFormHTML();

  // Initialize form logic
  initializeProductForm();

  loadProductsGrid(products);
}

function deleteProduct(productId) {
  if (confirm("Are you sure you want to delete this product?")) {
    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const productIndex = usersData.products?.findIndex(
      (p) => p.id === productId
    );

    if (productIndex !== -1) {
      usersData.products.splice(productIndex, 1);
      safeSetItem("millUsers", JSON.stringify(usersData));
      loadProductsData();
      showToast("Product deleted successfully!", "success");
    }
  }
}

function editOperator(operatorId) {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const operators = usersData.operators || [];
  const op = operators.find((o) => String(o.id) === String(operatorId));
  if (!op) {
    showToast("Operator not found.", "error");
    return;
  }

  // Open modal and populate
  showOperatorModal();
  const modal = document.getElementById("operatorModal");
  if (modal) modal.dataset.editingId = String(op.id);
  const title = document.getElementById("operatorModalTitle");
  if (title) title.textContent = "Edit Operator";

  document.getElementById("operatorName").value = op.name || "";
  document.getElementById("operatorEmail").value = op.email || "";
  document.getElementById("operatorPhone").value = op.phone || "";
  // Do not prefill password for security
  document.getElementById("operatorPassword").value = "";

  // Set assignments checkboxes if present
  const assignmentInputs = document.querySelectorAll(
    'input[name="assignment"]'
  );
  assignmentInputs.forEach((cb) => {
    try {
      cb.checked = Array.isArray(op.assignments)
        ? op.assignments.includes(cb.value)
        : false;
    } catch (e) {
      cb.checked = false;
    }
  });
}

function deleteOperator(operatorId) {
  if (confirm("Are you sure you want to delete this operator?")) {
    const usersData = JSON.parse(localStorage.getItem("millUsers"));
    const operatorIndex = usersData.operators.findIndex(
      (o) => o.id === operatorId
    );
    if (operatorIndex !== -1) {
      usersData.operators.splice(operatorIndex, 1);
      localStorage.setItem("millUsers", JSON.stringify(usersData));
      loadOperatorsData();
      showToast("Operator deleted successfully!", "success");
    }
  }
}

function viewCustomerDetails(customerId) {
  navigateToSection("customers");

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const customers = usersData.customers || [];
  const customer = customers.find((c) => String(c.id) === String(customerId));

  // Build a modal to show customer details
  let modal = document.getElementById("customerDetailModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "customerDetailModal";
    modal.className = "modal customer-modal";
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Customer Details</h3>
                    <button class="close-modal btn btn-icon" title="Close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="customerDetailBody" style="max-height:60vh; overflow:auto; padding:1rem"></div>
                <div class="modal-footer" style="padding:1rem; text-align:right">
                    <button id="messageThisCustomer" class="btn btn-primary">Message</button>
                    <button id="closeCustomerDetail" class="btn btn-outline">Close</button>
                </div>
            </div>
        `;
    document.body.appendChild(modal);

    // Wire up close buttons
    modal.querySelector(".close-modal").addEventListener("click", () => {
      modal.style.display = "none";
    });
    modal
      .querySelector("#closeCustomerDetail")
      .addEventListener("click", () => {
        modal.style.display = "none";
      });
  }

  const body = modal.querySelector("#customerDetailBody");
  if (!customer) {
    body.innerHTML = '<p class="muted">Customer not found.</p>';
  } else {
    const usersDataAll = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const orders = (usersDataAll.orders || []).filter(
      (o) => String(o.customerId) === String(customerId)
    );
    const totalSpent = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);

    body.innerHTML = `
            <p><strong>Name:</strong> ${escapeHtml(customer.name || "N/A")}</p>
            <p><strong>Email:</strong> ${escapeHtml(
              customer.email || "N/A"
            )}</p>
            <p><strong>Phone:</strong> ${escapeHtml(
              customer.phone || "N/A"
            )}</p>
            <p><strong>Address:</strong> ${escapeHtml(
              customer.address || "N/A"
            )}</p>
            <p><strong>Joined:</strong> ${formatDate(
              customer.createdAt || customer.registeredAt || customer.created_at
            )}</p>
            <p><strong>Orders:</strong> ${orders.length}</p>
            <p><strong>Total Spent:</strong> ${formatCurrency(totalSpent)}</p>
        `;
  }

  // Message button
  const msgBtn = modal.querySelector("#messageThisCustomer");
  msgBtn.onclick = () => {
    modal.style.display = "none";
    messageCustomer(customerId);
  };

  modal.style.display = "flex";
}

loadSectionData(sectionId);

function messageCustomer(customerId) {
  // Open messages section and select the customer in the contacts list
  navigateToSection("messages");
  // Ensure contacts are loaded
  try {
    loadMessagesData();
  } catch (e) {}

  // Small delay to allow DOM to update
  setTimeout(() => {
    const contactsList = document.getElementById("contactsList");
    if (!contactsList) {
      showToast("Messages UI not available.", "error");
      return;
    }

    const selector = `.contact-item[data-contact-id="${customerId}"][data-contact-type="customer"]`;
    let item = contactsList.querySelector(selector);

    // If not found by data attributes, try to match by name/email heuristics
    if (!item) {
      item = Array.from(contactsList.querySelectorAll(".contact-item")).find(
        (ci) => {
          const text = ci.textContent || "";
          return text.includes(String(customerId));
        }
      );
    }

    if (item) {
      item.click();
      showToast("Opened chat with customer.", "success");
    } else {
      // If there is no existing contact, open startNewMessage and focus input
      startNewMessage();
      const input = document.getElementById("messageInput");
      if (input) input.focus();
      showToast("Contact not found. You can start a new message.", "warning");
    }
  }, 120);
}

function addExpense() {
  // Prompt admin for expense details and save to localStorage.millUsers.expenses
  const description = prompt("Expense description (short):", "Misc expense");
  if (description === null) return; // cancelled

  let amountStr = prompt("Amount (numeric):", "0");
  if (amountStr === null) return; // cancelled
  amountStr = amountStr.replace(/,/g, "").trim();
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    showToast("Invalid amount entered.", "error");
    return;
  }

  const category =
    prompt("Category (e.g., Utilities, Rent, Salary):", "General") || "General";
  const dateInput = prompt("Date (YYYY-MM-DD) or leave blank for today:", "");
  const timestamp = dateInput
    ? new Date(dateInput).toISOString()
    : new Date().toISOString();

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  if (!usersData.expenses) usersData.expenses = [];

  const expense = {
    id: Date.now() + Math.floor(Math.random() * 10000),
    description: description.trim(),
    amount: Math.round((amount + Number.EPSILON) * 100) / 100,
    category: category.trim(),
    timestamp,
  };

  usersData.expenses.push(expense);
  localStorage.setItem("millUsers", JSON.stringify(usersData));

  // Refresh finance UI
  try {
    loadFinanceData();
  } catch (e) {}
  showToast("Expense added successfully.", "success");
}

function generateFinancialReport() {
  // Generate a CSV financial report for the current month (orders + expenses + summary)
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const orders = usersData.orders || [];
  const expenses = usersData.expenses || [];

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  // filter helper for order date
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d)) return false;
    return d >= monthStart && d < monthEnd;
  };

  const filteredOrders = orders.filter((o) =>
    inRange(o.orderDate || o.order_date || o.date || o.createdAt || o.timestamp)
  );
  const filteredExpenses = expenses.filter((ex) => {
    const t = ex.timestamp || ex.date || ex.createdAt;
    const d = t ? new Date(t) : null;
    return d && d >= monthStart && d < monthEnd;
  });

  // Build CSV
  let csv = "Type,ID,Date,Description/Item,Quantity,Total,Category\n";

  filteredOrders.forEach((o) => {
    const date =
      o.orderDate || o.order_date || o.date || o.createdAt || o.timestamp || "";
    csv += `Order,${o.id || ""},${date},${o.productName || o.product || ""},${
      o.quantity || ""
    },${o.total || 0},${o.status || ""}\n`;
  });

  csv += "\nExpenses\n";
  csv += "ID,Date,Description,Category,Amount\n";
  filteredExpenses.forEach((ex) => {
    csv += `${ex.id || ""},${ex.timestamp || ""},"${(
      ex.description || ""
    ).replace(/"/g, '""')}",${ex.category || ""},${ex.amount || 0}\n`;
  });

  // Summary
  const totalIncome = filteredOrders.reduce(
    (s, o) => s + (Number(o.total) || 0),
    0
  );
  const totalExpenses = filteredExpenses.reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0
  );
  const net = totalIncome - totalExpenses;

  csv += `\nSummary\nTotal Income,${totalIncome}\nTotal Expenses,${totalExpenses}\nNet,${net}\n`;

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `financial-report-${year}-${String(month + 1).padStart(
    2,
    "0"
  )}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Financial report generated for current month.", "success");
}

function generateCustomReport() {
  // Prompt for start and end dates (YYYY-MM-DD) and export orders+expenses CSV
  const start = prompt("Enter start date (YYYY-MM-DD):", "");
  if (!start) return;
  const end = prompt("Enter end date (YYYY-MM-DD):", "");
  if (!end) return;

  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T23:59:59");
  if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
    showToast("Invalid date range.", "error");
    return;
  }

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const orders = usersData.orders || [];
  const expenses = usersData.expenses || [];

  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d)) return false;
    return d >= startDate && d <= endDate;
  };

  const filteredOrders = orders.filter((o) =>
    inRange(o.orderDate || o.order_date || o.date || o.createdAt || o.timestamp)
  );
  const filteredExpenses = expenses.filter((e) => {
    const t = e.timestamp || e.date || e.createdAt;
    const d = t ? new Date(t) : null;
    return d && d >= startDate && d <= endDate;
  });

  let csv = "Type,ID,Date,Description/Item,Quantity,Total,Category\n";
  filteredOrders.forEach((o) => {
    const date =
      o.orderDate || o.order_date || o.date || o.createdAt || o.timestamp || "";
    csv += `Order,${o.id || ""},${date},${o.productName || o.product || ""},${
      o.quantity || ""
    },${o.total || 0},${o.status || ""}\n`;
  });

  csv += "\nExpenses\n";
  csv += "ID,Date,Description,Category,Amount\n";
  filteredExpenses.forEach((ex) => {
    csv += `${ex.id || ""},${ex.timestamp || ""},"${(
      ex.description || ""
    ).replace(/"/g, '""')}",${ex.category || ""},${ex.amount || 0}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `custom-report-${start}-${end}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Custom report generated.", "success");
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  document.querySelectorAll(".tab-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.id === tabId);
  });
}

function saveProfileSettings(e) {
  e.preventDefault();
  showToast("Profile settings saved!", "success");
}

function saveSystemSettings() {
  showToast("System settings saved!", "success");
}

function resetSystemSettings() {
  if (
    confirm("Are you sure you want to reset all system settings to default?")
  ) {
    showToast("System settings reset to default!", "success");
  }
}

function saveNotificationSettings() {
  showToast("Notification preferences saved!", "success");
}

function backupData() {
  const usersData = localStorage.getItem("millUsers");
  const blob = new Blob([usersData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `millpro-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast("Backup created successfully!", "success");
}

function restoreBackup() {
  // Let the admin select a JSON backup file and import it into localStorage.millUsers
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.style.display = "none";

  input.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const raw = evt.target.result;
        const parsed = JSON.parse(raw);

        // Normalize: some exports might be { millUsers: { ... } }
        const imported = parsed.millUsers ? parsed.millUsers : parsed;
        if (!imported || typeof imported !== "object") {
          showToast("Invalid backup file format.", "error");
          return;
        }

        // Ask user whether to replace or merge
        const replace = confirm(
          "Restore backup: OK = Replace all data, Cancel = Merge with existing data"
        );

        const existing = JSON.parse(localStorage.getItem("millUsers") || "{}");

        if (replace) {
          localStorage.setItem("millUsers", JSON.stringify(imported));
          showToast("Backup restored (replaced existing data).", "success");
        } else {
          // Merge incoming into existing (arrays merged by id when possible, objects shallow-merged)
          const merged = mergeMillUsers(existing, imported);
          localStorage.setItem("millUsers", JSON.stringify(merged));
          showToast("Backup merged into existing data.", "success");
        }

        // Refresh UI sections that depend on millUsers
        try {
          loadDashboardData();
        } catch (e) {}
        try {
          loadWarehouseData();
        } catch (e) {}
        try {
          loadProductsData();
        } catch (e) {}
        try {
          loadOperatorsData();
        } catch (e) {}
        try {
          loadCustomersData();
        } catch (e) {}
        try {
          loadMessagesData();
        } catch (e) {}
        try {
          updateCharts(JSON.parse(localStorage.getItem("millUsers") || "{}"));
        } catch (e) {}
      } catch (err) {
        console.error("Restore error", err);
        showToast(
          "Failed to parse backup file. See console for details.",
          "error"
        );
      }
    };

    reader.onerror = function () {
      showToast("Error reading file.", "error");
    };

    reader.readAsText(file);
  });

  // Append to body, trigger click, then remove
  document.body.appendChild(input);
  input.click();
  setTimeout(() => {
    document.body.removeChild(input);
  }, 1000);

  // Helper: merge two millUsers-like objects
  function mergeMillUsers(existing, incoming) {
    const result = JSON.parse(JSON.stringify(existing || {}));

    Object.keys(incoming || {}).forEach((key) => {
      const inc = incoming[key];
      const cur = result[key];

      // If both are arrays, merge by 'id' when available
      if (Array.isArray(cur) && Array.isArray(inc)) {
        const map = new Map();
        cur.forEach((item) => {
          if (item && item.id !== undefined) map.set(String(item.id), item);
          else map.set(JSON.stringify(item), item);
        });
        inc.forEach((item) => {
          if (item && item.id !== undefined) {
            map.set(String(item.id), item);
          } else {
            map.set(JSON.stringify(item), item);
          }
        });
        result[key] = Array.from(map.values());
      } else if (isPlainObject(cur) && isPlainObject(inc)) {
        // shallow merge objects (incoming overrides)
        result[key] = Object.assign({}, cur, inc);
      } else {
        // otherwise, just set/override
        result[key] = inc;
      }
    });

    return result;
  }

  function isPlainObject(v) {
    return v && typeof v === "object" && !Array.isArray(v);
  }
}

function deleteAllData() {
  if (
    confirm(
      "WARNING: This will delete ALL data including customers, orders, and products. Are you absolutely sure?"
    )
  ) {
    localStorage.clear();
    showToast("All data deleted! Redirecting to login...", "warning");
    setTimeout(() => {
      window.location.href = "../index.html";
    }, 2000);
  }
}

function updatePriceFromWarehouse() {
  const subcategorySelect = document.getElementById("productSubcategory");
  const priceInput = document.getElementById("productPrice");

  if (!subcategorySelect || !priceInput) return;

  subcategorySelect.addEventListener("change", function () {
    const selectedSubcategory = this.value;
    if (!selectedSubcategory) return;

    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const warehouse = usersData.warehouse || {};

    // Find the warehouse item by subcategory (case-insensitive)
    let warehouseItem = null;
    let itemName = "";

    for (const [name, item] of Object.entries(warehouse)) {
      if (name.toLowerCase() === selectedSubcategory.toLowerCase()) {
        warehouseItem = item;
        itemName = name;
        break;
      }
    }

    if (warehouseItem && warehouseItem.sellPrice) {
      priceInput.value = warehouseItem.sellPrice;
    } else {
      priceInput.value = "";
    }

    // Store the actual warehouse item name for later use
    priceInput.dataset.warehouseItem = itemName;
  });
}

function editWarehouseItem(itemName) {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const warehouse = usersData.warehouse || {};
  const item = warehouse[itemName];
  if (!item) {
    showToast("Warehouse item not found.", "error");
    return;
  }

  // Open add/edit form and populate
  showAddItemForm();
  const formCard = document.getElementById("addItemForm");
  if (formCard) formCard.dataset.editingName = itemName;

  document.getElementById("itemName").value = itemName;
  document.getElementById("itemCategory").value = item.category || "";
  document.getElementById("purchasePrice").value = item.purchasePrice || "";
  document.getElementById("sellPrice").value = item.sellPrice || "";
  document.getElementById("totalQuantity").value = item.quantity || "";
  document.getElementById("alertLevel").value = item.alertLevel || "";
  document.getElementById("itemDescription").value = item.description || "";
}

function startNewMessage() {
  // Open messages section
  navigateToSection("messages");

  const contactsList = document.getElementById("contactsList");
  const chatMessages = document.getElementById("chatMessages");
  const chatHeader = document.getElementById("chatHeader");

  // Clear current state
  activeChatRecipient = null;
  contactsList.innerHTML = "";
  chatMessages.innerHTML =
    '<p class="muted">Select a contact to start a conversation.</p>';

  // Load contacts (customers + operators)
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const customers = usersData.customers || [];
  const operators = usersData.operators || [];

  const contacts = [];
  customers.forEach((c) =>
    contacts.push({
      id: c.id,
      name: c.name || c.email || "Customer",
      type: "customer",
    })
  );
  operators.forEach((o) =>
    contacts.push({
      id: o.id,
      name: o.name || o.email || "Operator",
      type: "operator",
    })
  );

  if (contacts.length === 0) {
    contactsList.innerHTML = '<p class="muted">No contacts available.</p>';
    return;
  }

  // Populate contact list
  contacts.forEach((contact) => {
    const item = document.createElement("div");
    item.className = "contact-item";
    item.innerHTML = `
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
              contact.name
            )}&background=2196F3&color=fff" alt="${contact.name}">
            <div class="contact-info">
                <h5>${contact.name}</h5>
                <p class="muted">${contact.type}</p>
            </div>
        `;

    item.addEventListener("click", () => {
      // mark selected
      document
        .querySelectorAll("#contactsList .contact-item")
        .forEach((ci) => ci.classList.remove("active"));
      item.classList.add("active");

      activeChatRecipient = contact;

      // Update chat header
      const headerName = chatHeader.querySelector(".chat-user h4");
      const headerStatus = chatHeader.querySelector(".chat-user p");
      if (headerName) headerName.textContent = contact.name;
      if (headerStatus) headerStatus.textContent = "Online";

      // Load conversation for this contact
      loadChatMessagesFor(contact);

      // focus input
      const input = document.getElementById("messageInput");
      if (input) input.focus();
    });

    contactsList.appendChild(item);
  });

  // Auto-select first contact
  const first = contactsList.querySelector(".contact-item");
  if (first) first.click();
}

function sendMessage() {
  const input = document.getElementById("messageInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) {
    showToast("Please enter a message", "warning");
    return;
  }

  if (!activeChatRecipient) {
    showToast("Please select a contact first.", "warning");
    return;
  }

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  if (!usersData.messages) usersData.messages = [];

  // Create message object
  const messageObj = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    from: {
      role: "admin",
      id: currentAdmin ? currentAdmin.id : 0,
      name: currentAdmin ? currentAdmin.name : "Admin",
    },
    to: {
      role: activeChatRecipient.type,
      id: activeChatRecipient.id,
      name: activeChatRecipient.name,
    },
    content: text,
    timestamp: new Date().toISOString(),
    read: false,
  };

  // Save to localStorage
  usersData.messages.push(messageObj);
  localStorage.setItem("millUsers", JSON.stringify(usersData));

  // Update UI
  loadChatMessagesFor(activeChatRecipient);

  // Clear input and focus
  input.value = "";
  input.focus();

  // Show success message
  showToast("Message sent!", "success");
}

// Also fix the send on Enter key
document.addEventListener("DOMContentLoaded", function () {
  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });
  }
});
function loadChatMessagesFor(contact) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const messages = usersData.messages || [];

  // Filter messages between admin and this contact
  const convo = messages
    .filter((m) => {
      const fromAdminToContact =
        m.from &&
        m.from.role === "admin" &&
        m.to &&
        m.to.role === contact.type &&
        m.to.id === contact.id;
      const fromContactToAdmin =
        m.to &&
        m.to.role === "admin" &&
        m.from &&
        m.from.role === contact.type &&
        m.from.id === contact.id;
      return fromAdminToContact || fromContactToAdmin;
    })
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  chatMessages.innerHTML = "";

  if (convo.length === 0) {
    chatMessages.innerHTML = '<p class="muted">No messages yet. Say hello!</p>';
  } else {
    convo.forEach((msg) => {
      const msgDiv = document.createElement("div");
      msgDiv.className = `chat-bubble ${
        msg.from && msg.from.role === "admin"
          ? "chat-bubble-admin"
          : "chat-bubble-contact"
      }`;
      const time = new Date(msg.timestamp).toLocaleString();
      msgDiv.innerHTML = `
                <div class="message-content">${escapeHtml(msg.content)}</div>
                <div class="message-time">${time}</div>
            `;
      chatMessages.appendChild(msgDiv);
    });
  }

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function loadMessagesData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const customers = usersData.customers || [];
  const operators = usersData.operators || [];
  const messages = usersData.messages || [];

  // Update message count badge if present
  const msgCountEl = document.getElementById("messageCount");
  if (msgCountEl) msgCountEl.textContent = messages.length || 0;

  // Populate contacts list (without changing current selection if present)
  const contactsList = document.getElementById("contactsList");
  if (!contactsList) return;

  const contacts = [];
  customers.forEach((c) =>
    contacts.push({
      id: c.id,
      name: c.name || c.email || "Customer",
      type: "customer",
    })
  );
  operators.forEach((o) =>
    contacts.push({
      id: o.id,
      name: o.name || o.email || "Operator",
      type: "operator",
    })
  );

  contactsList.innerHTML = "";
  if (contacts.length === 0) {
    contactsList.innerHTML = '<p class="muted">No contacts available.</p>';
    return;
  }

  contacts.forEach((contact) => {
    const item = document.createElement("div");
    item.className = "contact-item";
    item.dataset.contactId = contact.id;
    item.dataset.contactType = contact.type;
    item.innerHTML = `
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
              contact.name
            )}&background=2196F3&color=fff" alt="${contact.name}">
            <div class="contact-info">
                <h5>${contact.name}</h5>
                <p class="muted">${contact.type}</p>
            </div>
        `;

    item.addEventListener("click", () => {
      activeChatRecipient = contact;
      document
        .querySelectorAll("#contactsList .contact-item")
        .forEach((ci) => ci.classList.remove("active"));
      item.classList.add("active");
      const headerName = document
        .getElementById("chatHeader")
        .querySelector(".chat-user h4");
      const headerStatus = document
        .getElementById("chatHeader")
        .querySelector(".chat-user p");
      if (headerName) headerName.textContent = contact.name;
      if (headerStatus) headerStatus.textContent = "Online";
      loadChatMessagesFor(contact);
    });

    contactsList.appendChild(item);
  });

  // Auto-select first if none selected
  if (!activeChatRecipient) {
    const first = contactsList.querySelector(".contact-item");
    if (first) first.click();
  }
}

function updateNotificationCount() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const notifications = usersData.notifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const notificationBadge = document.getElementById("notificationCount");
  if (notificationBadge) {
    notificationBadge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? "flex" : "none";
  }
}

function sendBroadcastMessage() {
  const broadcastTo = document.getElementById("broadcastTo");
  const messageEl = document.getElementById("broadcastMessage");
  if (!broadcastTo || !messageEl) {
    showToast("Broadcast controls not found.", "error");
    return;
  }

  const target = broadcastTo.value;
  const text = messageEl.value.trim();
  if (!text) {
    showToast("Please enter a broadcast message.", "warning");
    return;
  }

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  if (!usersData.messages) usersData.messages = [];

  let recipients = [];
  const customers = usersData.customers || [];
  const operators = usersData.operators || [];

  if (target === "all") {
    recipients = [
      ...customers.map((c) => ({ role: "customer", id: c.id })),
      ...operators.map((o) => ({ role: "operator", id: o.id })),
    ];
  } else if (target === "customers") {
    recipients = customers.map((c) => ({ role: "customer", id: c.id }));
  } else if (target === "operators") {
    recipients = operators.map((o) => ({ role: "operator", id: o.id }));
  }

  if (recipients.length === 0) {
    showToast("No recipients found for selected group.", "warning");
    return;
  }

  const timestamp = new Date().toISOString();
  const createdMessages = recipients.map((r) => ({
    id: Date.now() + Math.floor(Math.random() * 10000),
    from: { role: "admin", id: currentAdmin ? currentAdmin.id : null },
    to: { role: r.role, id: r.id },
    content: text,
    timestamp,
    read: false,
    broadcast: true,
  }));

  usersData.messages.push(...createdMessages);
  localStorage.setItem("millUsers", JSON.stringify(usersData));

  // Clear message box and show feedback
  messageEl.value = "";
  showToast(`Broadcast sent to ${recipients.length} user(s).`, "success");

  // Update message count badge
  const msgCountEl = document.getElementById("messageCount");
  if (msgCountEl) msgCountEl.textContent = (usersData.messages || []).length;
}

function showNotifications() {
  // Read notifications from storage
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  if (!usersData.notifications) usersData.notifications = [];
  const notifications = usersData.notifications;

  // Ensure a modal element exists (re-usable)
  let modal = document.getElementById("notificationsModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "notificationsModal";
    modal.className = "modal notifications-modal";
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Notifications</h3>
                    <div class="modal-actions">
                        <button id="markAllRead" class="btn btn-sm">Mark all read</button>
                        <button id="clearAllNotifications" class="btn btn-sm btn-danger">Clear all</button>
                        <button class="close-modal btn btn-icon" title="Close"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div id="notificationsList" class="modal-body notifications-list" style="max-height:60vh; overflow:auto; padding:1rem"></div>
            </div>
        `;
    document.body.appendChild(modal);

    // Wire up header buttons
    modal.querySelector("#markAllRead").addEventListener("click", () => {
      usersData.notifications = (usersData.notifications || []).map((n) => ({
        ...n,
        read: true,
      }));
      localStorage.setItem("millUsers", JSON.stringify(usersData));
      renderNotifications();
    });

    modal
      .querySelector("#clearAllNotifications")
      .addEventListener("click", () => {
        if (!confirm("Clear all notifications?")) return;
        usersData.notifications = [];
        localStorage.setItem("millUsers", JSON.stringify(usersData));
        renderNotifications();
      });

    // close button will be handled by existing .close-modal listeners
  }

  function renderNotifications() {
    const listEl = document.getElementById("notificationsList");
    if (!listEl) return;
    const items =
      JSON.parse(localStorage.getItem("millUsers") || "{}").notifications || [];
    listEl.innerHTML = "";

    if (items.length === 0) {
      listEl.innerHTML = '<p class="muted">No notifications.</p>';
      return;
    }

    items
      .slice()
      .reverse()
      .forEach((n, idx) => {
        const id = n.id || idx;
        const row = document.createElement("div");
        row.className = "notification-item";
        row.style.padding = "0.5rem";
        row.style.borderBottom = "1px solid rgba(0,0,0,0.05)";
        row.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem">
                    <div style="flex:1">
                        <div style="font-weight:600">${escapeHtml(
                          n.title || "Notification"
                        )}</div>
                        <div class="muted" style="font-size:0.9rem">${escapeHtml(
                          n.message || ""
                        )}</div>
                        <div class="muted" style="font-size:0.8rem">${
                          n.timestamp
                            ? new Date(n.timestamp).toLocaleString()
                            : ""
                        }</div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.25rem; align-items:flex-end">
                        <button class="btn btn-sm btn-outline" data-action="toggleRead" data-id="${id}">${
          n.read ? "Unread" : "Mark read"
        }</button>
                        <button class="btn btn-sm btn-danger" data-action="remove" data-id="${id}">Remove</button>
                    </div>
                </div>
            `;

        // toggle read handler
        row
          .querySelector('[data-action="toggleRead"]')
          .addEventListener("click", function () {
            const stored = JSON.parse(
              localStorage.getItem("millUsers") || "{}"
            );
            stored.notifications = (stored.notifications || []).map((item) => {
              if ((item.id || "") == id) return { ...item, read: true };
              return item;
            });
            localStorage.setItem("millUsers", JSON.stringify(stored));
            renderNotifications();
          });

        // remove handler
        row
          .querySelector('[data-action="remove"]')
          .addEventListener("click", function () {
            if (!confirm("Remove this notification?")) return;
            const stored = JSON.parse(
              localStorage.getItem("millUsers") || "{}"
            );
            stored.notifications = (stored.notifications || []).filter(
              (item) => (item.id || "") != id
            );
            localStorage.setItem("millUsers", JSON.stringify(stored));
            renderNotifications();
          });

        listEl.appendChild(row);
      });
  }

  // Show modal
  modal.style.display = "flex";
  renderNotifications();
}

function filterWarehouseItems() {
  // Filter warehouse table by search input and category select
  const queryEl = document.getElementById("searchWarehouse");
  const categoryEl = document.getElementById("filterCategory");
  const tableBody = document.querySelector("#warehouseTable tbody");
  if (!tableBody) return;

  const query = ((queryEl && queryEl.value) || "").trim().toLowerCase();
  const category = (categoryEl && categoryEl.value) || "";

  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const warehouse =
    currentWarehouseData && Object.keys(currentWarehouseData).length
      ? currentWarehouseData
      : usersData.warehouse || {};

  const rows = [];
  Object.entries(warehouse).forEach(([name, item]) => {
    // Category filter
    if (category && category !== "" && item.category !== category) return;

    // Search filter: check name, category, description
    if (query) {
      const hay = `${name} ${item.category || ""} ${
        item.description || ""
      }`.toLowerCase();
      if (!hay.includes(query)) return;
    }

    const totalInvestment = (item.quantity || 0) * (item.purchasePrice || 0);
    const status =
      (item.quantity || 0) < (item.alertLevel || 0) ? "Low Stock" : "In Stock";

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${name}</td>
            <td>${item.category || "Uncategorized"}</td>
            <td>${formatNumber(item.quantity || 0)}</td>
            <td>${formatCurrency(item.purchasePrice || 0)}</td>
            <td>${formatCurrency(item.sellPrice || 0)}</td>
            <td>${formatCurrency(totalInvestment)}</td>
            <td>${formatNumber(item.alertLevel || 0)}</td>
            <td><span class="status-badge ${
              status === "Low Stock" ? "status-cancelled" : "status-completed"
            }">${status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-icon btn-outline" onclick="editWarehouseItem('${name}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="deleteWarehouseItem('${name}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

    rows.push(row);
  });

  tableBody.innerHTML = "";
  if (rows.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="9" class="muted">No items match your filters.</td></tr>';
  } else {
    rows.forEach((r) => tableBody.appendChild(r));
  }

  // Optionally update summary counts based on filtered results
  // (keep overall summary in upper cards unchanged; only update counts if needed)
}

function updateProductSubcategories() {
  const categorySelect = document.getElementById("productCategory");
  const subcategorySelect = document.getElementById("productSubcategory");
  const priceInput = document.getElementById("productPrice");

  if (!categorySelect || !subcategorySelect) return;

  // Function to populate subcategory dropdown
  function populateSubcategories(selectedCategory) {
    subcategorySelect.innerHTML = '<option value="">Select Product</option>';

    if (!selectedCategory) return;

    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const warehouse = usersData.warehouse || {};

    // Get items in this category
    const categoryItems = Object.entries(warehouse)
      .filter(([_, item]) => item.category === selectedCategory)
      .map(([name, item]) => ({ name, ...item }));

    // Sort items alphabetically
    categoryItems.sort((a, b) => a.name.localeCompare(b.name));

    // Populate dropdown
    categoryItems.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.name;
      option.textContent = `${item.name} - ${formatCurrency(
        item.sellPrice || 0
      )}/kg`;
      option.dataset.price = item.sellPrice || 0;
      subcategorySelect.appendChild(option);
    });
  }

  // Initial population
  populateSubcategories(categorySelect.value);

  // Update when category changes
  categorySelect.addEventListener("change", function () {
    const selectedCategory = this.value;
    populateSubcategories(selectedCategory);

    // Clear price when category changes
    if (priceInput) {
      priceInput.value = "";
    }
  });

  // Update price when subcategory is selected
  subcategorySelect.addEventListener("change", function () {
    const selectedOption = this.options[this.selectedIndex];
    if (selectedOption && selectedOption.dataset.price && priceInput) {
      priceInput.value = selectedOption.dataset.price;
    } else if (priceInput) {
      priceInput.value = "";
    }
  });
}

function cleanupOldData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");

  // Keep only recent orders (last 6 months)
  if (usersData.orders && usersData.orders.length > 1000) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    usersData.orders = usersData.orders.filter((order) => {
      const orderDate = new Date(
        order.orderDate || order.createdAt || order.timestamp
      );
      return orderDate >= sixMonthsAgo;
    });
  }

  // Clean old notifications
  if (usersData.notifications && usersData.notifications.length > 500) {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    usersData.notifications = usersData.notifications.filter((notification) => {
      const notifDate = new Date(notification.timestamp);
      return notifDate >= oneMonthAgo;
    });
  }

  // Clean old messages
  if (usersData.messages && usersData.messages.length > 1000) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    usersData.messages = usersData.messages.filter((message) => {
      const messageDate = new Date(message.timestamp);
      return messageDate >= threeMonthsAgo;
    });
  }

  // Save cleaned data
  try {
    localStorage.setItem("millUsers", JSON.stringify(usersData));
  } catch (e) {
    console.error("Failed to save after cleanup:", e);
    // If still failing, backup and clear
    backupData();
    localStorage.removeItem("millUsers");
    location.reload();
  }
}

// Call this periodically
setInterval(cleanupOldData, 24 * 60 * 60 * 1000); // Daily cleanup

// Auto-fill price from warehouse when user types product name
function initializeProductFormPriceAutoFill() {
  const nameInput = document.getElementById("productName");
  const priceInput = document.getElementById("productPrice");
  const categorySelect = document.getElementById("productCategory");

  if (!nameInput || !priceInput || !categorySelect) return;

  // When user types product name, suggest warehouse items
  nameInput.addEventListener("input", function () {
    const typedName = this.value.trim().toLowerCase();
    if (!typedName) return;

    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const warehouse = usersData.warehouse || {};

    // Find matching warehouse items
    const matches = [];
    for (const [name, item] of Object.entries(warehouse)) {
      if (name.toLowerCase().includes(typedName)) {
        matches.push({ name, ...item });
      }
    }

    if (matches.length === 1) {
      // Auto-fill if exactly one match
      const item = matches[0];
      nameInput.value = item.name; // Use exact warehouse name
      priceInput.value = item.sellPrice || "";
      categorySelect.value = item.category || "";
    }
  });

  // When user leaves name field, check warehouse
  nameInput.addEventListener("blur", function () {
    const productName = this.value.trim();
    if (!productName) return;

    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const warehouse = usersData.warehouse || {};

    // Find warehouse item (case-insensitive)
    let warehouseItem = null;
    for (const [name, item] of Object.entries(warehouse)) {
      if (name.toLowerCase() === productName.toLowerCase()) {
        warehouseItem = item;
        this.value = name; // Use exact warehouse name
        break;
      }
    }

    if (warehouseItem) {
      priceInput.value = warehouseItem.sellPrice || "";
      categorySelect.value = warehouseItem.category || "";
    }
  });

  // When category changes, suggest items in that category
  categorySelect.addEventListener("change", function () {
    const selectedCategory = this.value;
    if (!selectedCategory) return;

    const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
    const warehouse = usersData.warehouse || {};

    // Create datalist for suggestions
    let datalist = document.getElementById("productNameSuggestions");
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = "productNameSuggestions";
      nameInput.setAttribute("list", "productNameSuggestions");
      document.body.appendChild(datalist);
    }

    // Clear and populate suggestions
    datalist.innerHTML = "";
    for (const [name, item] of Object.entries(warehouse)) {
      if (item.category === selectedCategory) {
        const option = document.createElement("option");
        option.value = name;
        datalist.appendChild(option);
      }
    }
  });
}

function editProduct(productId) {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const products = usersData.products || [];
  const p = products.find((x) => String(x.id) === String(productId));
  if (!p) {
    showToast("Product not found.", "error");
    return;
  }

  // Open product form and populate fields
  showProductForm();
  const card = document.getElementById("productFormCard");
  if (card) card.dataset.editingId = String(p.id);

  const title = document.getElementById("productFormTitle");
  if (title) title.textContent = "Edit Product";

  document.getElementById("productName").value = p.name || "";
  document.getElementById("productCategory").value = p.category || "";
  document.getElementById("productPrice").value = p.price || "";
  document.getElementById("millingFee").value = p.millingFee || "";
  document.getElementById("minQuantity").value = p.minQuantity || "";
  document.getElementById("productOrigin").value = p.origin || "";
  document.getElementById("productQuality").value = p.quality || "";
  document.getElementById("productDescription").value = p.description || "";

  // Show existing image
  if (p.image) {
    if (p.image.startsWith("data:image")) {
      // Base64 image
      document.getElementById("productImagePreview").src = p.image;
      document.getElementById("productImagePreview").style.display = "block";
      document.getElementById("imagePlaceholder").style.display = "none";
      document.getElementById("productImageBase64").value = p.image;
    }
  }

  // Show post button if previously posted
  const postBtn = document.getElementById("postProductBtn");
  if (postBtn) postBtn.style.display = p.posted ? "block" : "none";
}

function calculateWeeklyOrders(orders) {
  // Calculate number of orders per day for the current week (Mon -> Sun)
  // Accepts orders array where order date can be in `orderDate`, `createdAt`, `timestamp`, or `date`.
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Get Monday of current week (local time)
  const now = new Date();
  const todayDay = now.getDay(); // 0 (Sun) .. 6 (Sat)
  const diffToMonday = todayDay === 0 ? -6 : 1 - todayDay;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMonday
  );
  monday.setHours(0, 0, 0, 0);

  const counts = new Array(7).fill(0); // index 0 = Monday

  if (!Array.isArray(orders)) return counts;

  orders.forEach((order) => {
    // pick the timestamp field (fallbacks)
    const raw =
      order &&
      (order.orderDate ||
        order.order_date ||
        order.date ||
        order.createdAt ||
        order.timestamp);
    if (!raw) return;

    const d = new Date(raw);
    if (isNaN(d)) return;
    d.setHours(0, 0, 0, 0);

    const diffDays = Math.round((d - monday) / MS_PER_DAY);
    if (diffDays >= 0 && diffDays < 7) {
      counts[diffDays] += 1;
    }
  });

  return counts;
}

function calculateMonthlyRevenue(orders) {
  // Calculate revenue for the last 6 months (including current month).
  // Accepts orders array where date can be in `orderDate`, `order_date`, `date`, `createdAt`, or `timestamp`.
  // Returns an array of 6 numbers (oldest -> newest).
  const now = new Date();

  // Build the 6 target months (from oldest to newest)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  const totals = months.map(() => 0);

  if (!Array.isArray(orders)) return totals;

  orders.forEach((order) => {
    const raw =
      order &&
      (order.orderDate ||
        order.order_date ||
        order.date ||
        order.createdAt ||
        order.timestamp);
    if (!raw) return;

    const d = new Date(raw);
    if (isNaN(d)) return;

    // Determine monetary value for the order (try common fields)
    const value =
      Number(
        order.total || order.totalAmount || order.amount || order.price || 0
      ) || 0;

    for (let i = 0; i < months.length; i++) {
      if (
        d.getFullYear() === months[i].year &&
        d.getMonth() === months[i].month
      ) {
        totals[i] += value;
        break;
      }
    }
  });

  // Round to 2 decimal places for display (Chart.js accepts numbers)
  return totals.map((v) => Math.round((v + Number.EPSILON) * 100) / 100);
}

function calculateInventoryByCategory(warehouse) {
  const categories = {};

  Object.values(warehouse).forEach((item) => {
    const category = item.category || "Uncategorized";
    if (!categories[category]) {
      categories[category] = 0;
    }
    categories[category] += item.quantity || 0;
  });

  return {
    labels: Object.keys(categories),
    values: Object.values(categories),
  };
}

function exportWarehouseData() {
  const usersData = JSON.parse(localStorage.getItem("millUsers") || "{}");
  const warehouse = usersData.warehouse || {};

  // Convert to CSV
  let csv =
    "Item Name,Category,Quantity (kg),Purchase Price,Sell Price,Total Investment,Alert Level,Status\n";

  Object.entries(warehouse).forEach(([name, item]) => {
    const totalInvestment = (item.quantity || 0) * (item.purchasePrice || 0);
    const status =
      (item.quantity || 0) < (item.alertLevel || 0) ? "Low Stock" : "In Stock";

    csv += `"${name}","${item.category || ""}",${item.quantity || 0},${
      item.purchasePrice || 0
    },${item.sellPrice || 0},${totalInvestment},${
      item.alertLevel || 0
    },"${status}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `warehouse-export-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast("Warehouse data exported successfully!", "success");
}

// Initialize on load
window.addEventListener("load", function () {
  // Check for dark mode preference
  const savedTheme = localStorage.getItem("theme");
  const darkModeBtn = document.getElementById("adminDarkMode");

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
