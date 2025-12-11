// Admin Dashboard JavaScript - Complete Working Version
// Global Variables
let currentAdmin = null;
let charts = {};
let currentWarehouseData = {};
let activeChatRecipient = null;

// Initialize Admin Dashboard
document.addEventListener("DOMContentLoaded", function() {
    console.log("Admin dashboard initializing...");
    initializeAdminDashboard();
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
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Apply saved theme
    applySavedTheme();
    
    console.log("Admin dashboard initialized successfully");
}

// ========== AUTHENTICATION ==========
function checkAdminAuth() {
    try {
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
    } catch (error) {
        console.error("Authentication error:", error);
        window.location.href = "../index.html";
    }
}

function loadAdminData() {
    if (!currentAdmin) return;
    
    if (document.getElementById("adminName")) {
        document.getElementById("adminName").textContent = currentAdmin.name;
    }
    if (document.getElementById("adminEmail")) {
        document.getElementById("adminEmail").textContent = currentAdmin.email;
    }
    if (document.getElementById("adminFullName")) {
        document.getElementById("adminFullName").value = currentAdmin.name;
    }
    if (document.getElementById("adminEmailSettings")) {
        document.getElementById("adminEmailSettings").value = currentAdmin.email;
    }
    if (document.getElementById("adminPhone")) {
        document.getElementById("adminPhone").value = currentAdmin.phone || "+251911223344";
    }
}

function logoutAdmin() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("currentUser");
        window.location.href = "../index.html";
    }
}

// ========== EVENT LISTENERS ==========
function setupAdminEventListeners() {
    console.log("Setting up event listeners...");
    
    // Navigation
    document.querySelectorAll(".nav-item").forEach((item) => {
        item.addEventListener("click", function(e) {
            e.preventDefault();
            const href = this.getAttribute("href");
            if (href && href.startsWith("#")) {
                navigateToSection(href.substring(1));
            }
        });
    });
    
    // Menu toggle
    const menuToggle = document.getElementById("menuToggle");
    if (menuToggle) {
        menuToggle.addEventListener("click", function() {
            document.querySelector(".sidebar")?.classList.toggle("active");
        });
    }
    
    // Dark mode toggle
    const darkModeBtn = document.getElementById("adminDarkMode");
    if (darkModeBtn) {
        darkModeBtn.addEventListener("click", toggleAdminDarkMode);
    }
    
    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logoutAdmin);
    
    // Refresh data
    const refreshBtn = document.getElementById("refreshData");
    if (refreshBtn) refreshBtn.addEventListener("click", refreshDashboard);
    
    // Warehouse buttons - SIMPLE DIRECT EVENT LISTENERS
    const addNewItemBtn = document.getElementById("addNewItem");
    if (addNewItemBtn) {
        addNewItemBtn.addEventListener("click", showAddItemForm);
    }
    
    const cancelAddItemBtn = document.getElementById("cancelAddItem");
    if (cancelAddItemBtn) {
        cancelAddItemBtn.addEventListener("click", hideAddItemForm);
    }
    
    // Warehouse form submit - FIXED
    const warehouseForm = document.getElementById("warehouseForm");
    if (warehouseForm) {
        console.log("Warehouse form found, adding submit listener");
        warehouseForm.addEventListener("submit", function(e) {
            e.preventDefault();
            console.log("Warehouse form submitted");
            saveWarehouseItem();
            return false;
        });
    }
    
    // Also add direct click listener to save button
    const warehouseSaveBtn = document.querySelector('#warehouseForm button[type="submit"]');
    if (warehouseSaveBtn) {
        console.log("Warehouse save button found");
        warehouseSaveBtn.addEventListener("click", function(e) {
            e.preventDefault();
            console.log("Warehouse save button clicked");
            saveWarehouseItem();
            return false;
        });
    }
    
    const exportWarehouseBtn = document.getElementById("exportWarehouse");
    if (exportWarehouseBtn) {
        exportWarehouseBtn.addEventListener("click", exportWarehouseData);
    }
    
    // Warehouse category change
    const itemCategory = document.getElementById("itemCategory");
    if (itemCategory) {
        itemCategory.addEventListener("change", updateWarehouseSubcategories);
    }
    
    // Products
    const addProductBtn = document.getElementById("addProductBtn");
    if (addProductBtn) addProductBtn.addEventListener("click", showProductForm);
    
    const cancelProductForm = document.getElementById("cancelProductForm");
    if (cancelProductForm) cancelProductForm.addEventListener("click", hideProductForm);
    
    const saveProductBtn = document.getElementById("saveProductBtn");
    if (saveProductBtn) saveProductBtn.addEventListener("click", saveProduct);
    
    const postProductBtn = document.getElementById("postProductBtn");
    if (postProductBtn) postProductBtn.addEventListener("click", postProduct);
    
    // Product category change
    const productCategory = document.getElementById("productCategory");
    if (productCategory) productCategory.addEventListener("change", updateSubcategories);
    
    // Product subcategory change
    const productSubcategory = document.getElementById("productSubcategory");
    if (productSubcategory) productSubcategory.addEventListener("change", updateProductPriceFromWarehouse);
    
    // Image upload
    const productImageFile = document.getElementById("productImageFile");
    if (productImageFile) productImageFile.addEventListener("change", handleImageUpload);
    
    // Search functionality
    const searchWarehouse = document.getElementById("searchWarehouse");
    if (searchWarehouse) searchWarehouse.addEventListener("input", filterWarehouseItems);
    
    const filterCategory = document.getElementById("filterCategory");
    if (filterCategory) filterCategory.addEventListener("change", filterWarehouseItems);
    
    // Close modals
    document.querySelectorAll(".close-modal").forEach((btn) => {
        btn.addEventListener("click", function() {
            const modal = this.closest(".modal");
            if (modal) modal.style.display = "none";
        });
    });
    
    // Window click to close modals
    window.addEventListener("click", function(e) {
        if (e.target.classList.contains("modal")) {
            e.target.style.display = "none";
        }
    });
    
    // Enter key for messages
    const messageInput = document.getElementById("messageInput");
    if (messageInput) {
        messageInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    console.log("Event listeners setup complete");
}

// ========== NAVIGATION ==========
function navigateToSection(sectionId) {
    // Update active nav item
    document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.remove("active");
    });
    
    const navItem = document.querySelector(`a[href="#${sectionId}"]`);
    if (navItem) navItem.classList.add("active");
    
    // Update active section
    document.querySelectorAll(".content-section").forEach((section) => {
        section.classList.remove("active");
    });
    
    const section = document.getElementById(sectionId);
    if (section) section.classList.add("active");
    
    // Update page title
    updatePageTitle(sectionId);
    
    // Load section data
    loadSectionData(sectionId);
}

function updatePageTitle(sectionId) {
    const pageTitle = document.getElementById("pageTitle");
    if (!pageTitle) return;
    
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
        messages: "Messages"
    };
    
    pageTitle.textContent = titles[sectionId] || "Admin Dashboard";
}

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
        default:
            loadDashboardData();
    }
}

// ========== DASHBOARD FUNCTIONS ==========
function loadDashboardData() {
    const usersData = getUsersData();
    updateDashboardStats(usersData);
    loadRecentOrders(usersData);
    updateCharts(usersData);
}

function updateDashboardStats(data) {
    const customers = data.customers || [];
    const operators = data.operators || [];
    const orders = data.orders || [];
    const warehouse = data.warehouse || {};
    
    // Calculate stats
    const totalCustomers = customers.length;
    const onlineCustomers = customers.filter(c => {
        if (!c.lastActive) return false;
        const lastActive = new Date(c.lastActive);
        const now = new Date();
        return (now - lastActive) < 5 * 60 * 1000;
    }).length;
    
    const totalOrders = orders.length;
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.orderDate && o.orderDate.startsWith(today)).length;
    
    const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
    const todayRevenue = orders
        .filter(o => o.orderDate && o.orderDate.startsWith(today))
        .reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
    
    const totalInventory = Object.values(warehouse).reduce(
        (sum, item) => sum + (parseFloat(item.quantity) || 0), 0
    );
    
    // Update DOM elements
    const stats = {
        "totalCustomers": totalCustomers,
        "onlineCustomers": onlineCustomers,
        "totalOrders": totalOrders,
        "totalRevenue": formatCurrency(totalRevenue),
        "totalOperators": operators.length,
        "totalInventory": formatNumber(totalInventory),
        "todayOrders": todayOrders,
        "todayRevenue": formatCurrency(todayRevenue)
    };
    
    for (const [id, value] of Object.entries(stats)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
}

function loadRecentOrders(data) {
    const orders = data.orders || [];
    const customers = data.customers || [];
    const products = data.products || [];
    
    const recentOrders = orders
        .slice(-10)
        .reverse()
        .filter(order => order && order.id);
    
    const tableBody = document.querySelector("#recentOrdersTable tbody");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    if (recentOrders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center muted">No recent orders found</td>
            </tr>
        `;
        return;
    }
    
    recentOrders.forEach((order) => {
        const customer = customers.find(c => c.id === order.customerId);
        const product = products.find(p => p.id === order.productId);
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>#${String(order.id).slice(-6)}</td>
            <td>${escapeHtml(customer?.name || "Unknown")}</td>
            <td>${escapeHtml(product?.name || order.productName || "N/A")}</td>
            <td>${formatNumber(order.quantity || 0)} kg</td>
            <td>${formatCurrency(order.total || 0)}</td>
            <td><span class="status-badge status-${order.status || "pending"}">${order.status || "Pending"}</span></td>
            <td>${formatDate(order.orderDate)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-icon btn-outline" onclick="viewOrderDetails(${order.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon btn-outline" onclick="editOrder(${order.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// ========== WAREHOUSE FUNCTIONS - WORKING VERSION ==========
function loadWarehouseData() {
    const usersData = getUsersData();
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
        if (!item) return;
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.purchasePrice) || 0;
        const alertLevel = parseFloat(item.alertLevel) || 0;
        
        totalInvestment += quantity * price;
        totalWeight += quantity;
        if (quantity < alertLevel) {
            lowStockCount++;
        }
    });
    
    if (document.getElementById("totalInvestment")) {
        document.getElementById("totalInvestment").textContent = formatCurrency(totalInvestment);
    }
    if (document.getElementById("totalWeight")) {
        document.getElementById("totalWeight").textContent = formatNumber(totalWeight);
    }
    if (document.getElementById("lowStockCount")) {
        document.getElementById("lowStockCount").textContent = lowStockCount;
    }
    if (document.getElementById("totalItems")) {
        document.getElementById("totalItems").textContent = totalItems;
    }
}

function loadWarehouseItems(warehouse) {
    const tableBody = document.querySelector("#warehouseTable tbody");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    if (Object.keys(warehouse).length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center muted">No warehouse items found</td>
            </tr>
        `;
        return;
    }
    
    Object.entries(warehouse).forEach(([name, item]) => {
        if (!item) return;
        
        const quantity = parseFloat(item.quantity) || 0;
        const purchasePrice = parseFloat(item.purchasePrice) || 0;
        const sellPrice = parseFloat(item.sellPrice) || 0;
        const alertLevel = parseFloat(item.alertLevel) || 0;
        
        const totalInvestment = quantity * purchasePrice;
        const status = quantity < alertLevel ? "Low Stock" : "In Stock";
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(item.category || "Uncategorized")}</td>
            <td>${formatNumber(quantity)}</td>
            <td>${formatCurrency(purchasePrice)}</td>
            <td>${formatCurrency(sellPrice)}</td>
            <td>${formatCurrency(totalInvestment)}</td>
            <td>${formatNumber(alertLevel)}</td>
            <td><span class="status-badge ${status === "Low Stock" ? "status-cancelled" : "status-completed"}">${status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-icon btn-outline" onclick="editWarehouseItem('${escapeHtml(name)}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="deleteWarehouseItem('${escapeHtml(name)}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function loadCategoryItems(warehouse) {
    const grainsList = document.getElementById("grainsList");
    const legumesList = document.getElementById("legumesList");
    const othersList = document.getElementById("othersList");
    
    if (grainsList) {
        grainsList.innerHTML = "";
        const grains = Object.entries(warehouse).filter(([_, item]) => item?.category === "Grain");
        if (grains.length === 0) {
            grainsList.innerHTML = '<p class="muted">No grains found</p>';
        } else {
            grains.forEach(([name, item]) => {
                const quantity = parseFloat(item.quantity) || 0;
                const alertLevel = parseFloat(item.alertLevel) || 1;
                const percentage = Math.min((quantity / alertLevel) * 100, 100);
                
                const div = document.createElement("div");
                div.className = "category-item";
                div.innerHTML = `
                    <span>${escapeHtml(name)}</span>
                    <div class="stock-info">
                        <span>${formatNumber(quantity)} kg</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
                grainsList.appendChild(div);
            });
        }
    }
    
    if (legumesList) {
        legumesList.innerHTML = "";
        const legumes = Object.entries(warehouse).filter(([_, item]) => item?.category === "Legume");
        if (legumes.length === 0) {
            legumesList.innerHTML = '<p class="muted">No legumes found</p>';
        } else {
            legumes.forEach(([name, item]) => {
                const quantity = parseFloat(item.quantity) || 0;
                const alertLevel = parseFloat(item.alertLevel) || 1;
                const percentage = Math.min((quantity / alertLevel) * 100, 100);
                
                const div = document.createElement("div");
                div.className = "category-item";
                div.innerHTML = `
                    <span>${escapeHtml(name)}</span>
                    <div class="stock-info">
                        <span>${formatNumber(quantity)} kg</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
                legumesList.appendChild(div);
            });
        }
    }
    
    if (othersList) {
        othersList.innerHTML = "";
        const others = Object.entries(warehouse).filter(([_, item]) => item?.category === "Other");
        if (others.length === 0) {
            othersList.innerHTML = '<p class="muted">No other items found</p>';
        } else {
            others.forEach(([name, item]) => {
                const quantity = parseFloat(item.quantity) || 0;
                const alertLevel = parseFloat(item.alertLevel) || 1;
                const percentage = Math.min((quantity / alertLevel) * 100, 100);
                
                const div = document.createElement("div");
                div.className = "category-item";
                div.innerHTML = `
                    <span>${escapeHtml(name)}</span>
                    <div class="stock-info">
                        <span>${formatNumber(quantity)} kg</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
                othersList.appendChild(div);
            });
        }
    }
}

function showAddItemForm() {
    console.log("Showing add item form");
    const formCard = document.getElementById("addItemForm");
    if (formCard) {
        formCard.style.display = "block";
        
        // Reset the form
        const form = document.getElementById("warehouseForm");
        if (form) {
            form.reset();
        }
        
        // Reset category and subcategory
        const categorySelect = document.getElementById("itemCategory");
        const subcategorySelect = document.getElementById("itemSubcategory");
        if (categorySelect) categorySelect.value = "";
        if (subcategorySelect) {
            subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
        }
        
        // Clear editing state
        if (formCard.dataset?.editingName) {
            delete formCard.dataset.editingName;
        }
        
        // Update form title
        const formTitle = formCard.querySelector("h3");
        if (formTitle) {
            formTitle.textContent = "Add New Warehouse Item";
        }
        
        // Scroll to form
        window.scrollTo({
            top: formCard.offsetTop - 20,
            behavior: "smooth"
        });
    }
}

function hideAddItemForm() {
    const formCard = document.getElementById("addItemForm");
    if (formCard) {
        formCard.style.display = "none";
    }
}

// WORKING SAVE FUNCTION
function saveWarehouseItem() {
    console.log("saveWarehouseItem function called");
    
    // Get form values
    const category = document.getElementById("itemCategory")?.value;
    const subcategory = document.getElementById("itemSubcategory")?.value;
    const purchasePrice = parseFloat(document.getElementById("purchasePrice")?.value) || 0;
    const sellPrice = parseFloat(document.getElementById("sellPrice")?.value) || 0;
    const totalQuantity = parseFloat(document.getElementById("totalQuantity")?.value) || 0;
    const alertLevel = parseFloat(document.getElementById("alertLevel")?.value) || 0;
    const description = document.getElementById("itemDescription")?.value || "";
    
    console.log("Form values:", { category, subcategory, purchasePrice, sellPrice, totalQuantity, alertLevel, description });
    
    // Validation
    if (!category) {
        showToast("Please select a category!", "error");
        return;
    }
    
    if (!subcategory) {
        showToast("Please select a subcategory!", "error");
        return;
    }
    
    if (totalQuantity <= 0) {
        showToast("Quantity must be greater than 0!", "error");
        return;
    }
    
    if (purchasePrice < 0 || sellPrice < 0) {
        showToast("Prices cannot be negative!", "error");
        return;
    }
    
    // Get current data
    const usersData = getUsersData();
    if (!usersData.warehouse) {
        usersData.warehouse = {};
    }
    
    // Check if editing
    const formCard = document.getElementById("addItemForm");
    const editingName = formCard?.dataset?.editingName;
    const itemName = subcategory;
    
    // If editing and name changed, delete old entry
    if (editingName && editingName !== itemName && usersData.warehouse[editingName]) {
        delete usersData.warehouse[editingName];
    }
    
    // Save the item
    usersData.warehouse[itemName] = {
        category,
        purchasePrice,
        sellPrice,
        quantity: totalQuantity,
        alertLevel,
        description,
        lastUpdated: new Date().toISOString(),
        createdAt: editingName && usersData.warehouse[itemName]?.createdAt 
            ? usersData.warehouse[itemName].createdAt 
            : new Date().toISOString()
    };
    
    // Save to localStorage
    try {
        localStorage.setItem("millUsers", JSON.stringify(usersData));
        console.log("Item saved successfully:", itemName);
        
        // Hide form and refresh data
        hideAddItemForm();
        loadWarehouseData();
        
        // Show success message
        showToast(
            editingName ? `"${itemName}" updated successfully!` : `"${itemName}" added to warehouse!`,
            "success"
        );
    } catch (error) {
        console.error("Error saving item:", error);
        showToast("Error saving item. Please try again.", "error");
    }
}

function editWarehouseItem(itemName) {
    const usersData = getUsersData();
    const warehouse = usersData.warehouse || {};
    const item = warehouse[itemName];
    
    if (!item) {
        showToast("Warehouse item not found.", "error");
        return;
    }
    
    // Show the form
    showAddItemForm();
    
    const formCard = document.getElementById("addItemForm");
    if (formCard) {
        formCard.dataset.editingName = itemName;
        
        // Update form title
        const formTitle = formCard.querySelector("h3");
        if (formTitle) {
            formTitle.textContent = `Edit: ${itemName}`;
        }
    }
    
    // Set form values
    document.getElementById("itemCategory").value = item.category || "";
    
    // Update subcategories based on category
    updateWarehouseSubcategories();
    
    // Wait a moment for subcategories to populate, then set values
    setTimeout(() => {
        document.getElementById("itemSubcategory").value = itemName;
        document.getElementById("purchasePrice").value = item.purchasePrice || "";
        document.getElementById("sellPrice").value = item.sellPrice || "";
        document.getElementById("totalQuantity").value = item.quantity || "";
        document.getElementById("alertLevel").value = item.alertLevel || "";
        document.getElementById("itemDescription").value = item.description || "";
    }, 100);
}

function deleteWarehouseItem(itemName) {
    if (!confirm(`Are you sure you want to delete "${itemName}" from warehouse?`)) {
        return;
    }
    
    const usersData = getUsersData();
    if (usersData.warehouse && usersData.warehouse[itemName]) {
        delete usersData.warehouse[itemName];
        localStorage.setItem("millUsers", JSON.stringify(usersData));
        loadWarehouseData();
        showToast(`${itemName} deleted from warehouse!`, "success");
    }
}

function updateWarehouseSubcategories() {
    const category = document.getElementById("itemCategory")?.value;
    const subcategorySelect = document.getElementById("itemSubcategory");
    
    if (!subcategorySelect) return;
    
    // Clear existing options
    subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
    
    if (!category) return;
    
    let subcategories = [];
    
    switch (category) {
        case "Grain":
            subcategories = ["Teff", "Barley", "Wheat", "Sorghum", "Millet", "Flax", "Rice"];
            break;
        case "Legume":
            subcategories = ["Peas", "Beans", "Lentils", "Chickpeas", "Bolokhi", "Corn", "Soybeans"];
            break;
        case "Other":
            subcategories = ["Pepper", "Spices", "Whole Grains", "Oats", "Coffee", "Sugar", "Salt"];
            break;
    }
    
    // Add options
    subcategories.forEach((sub) => {
        const option = document.createElement("option");
        option.value = sub;
        option.textContent = sub;
        subcategorySelect.appendChild(option);
    });
}

function filterWarehouseItems() {
    const searchInput = document.getElementById("searchWarehouse");
    const filterSelect = document.getElementById("filterCategory");
    const tableBody = document.querySelector("#warehouseTable tbody");
    
    if (!tableBody) return;
    
    const searchTerm = (searchInput?.value || "").toLowerCase().trim();
    const filterValue = filterSelect?.value || "";
    
    const usersData = getUsersData();
    const warehouse = usersData.warehouse || {};
    
    // Filter items
    const filteredItems = Object.entries(warehouse).filter(([name, item]) => {
        if (!item) return false;
        
        // Category filter
        if (filterValue && item.category !== filterValue) return false;
        
        // Search filter
        if (searchTerm) {
            const searchString = `${name} ${item.category || ""} ${item.description || ""}`.toLowerCase();
            return searchString.includes(searchTerm);
        }
        
        return true;
    });
    
    // Display filtered items
    tableBody.innerHTML = "";
    
    if (filteredItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center muted">No items match your filters</td>
            </tr>
        `;
        return;
    }
    
    filteredItems.forEach(([name, item]) => {
        const quantity = parseFloat(item.quantity) || 0;
        const purchasePrice = parseFloat(item.purchasePrice) || 0;
        const sellPrice = parseFloat(item.sellPrice) || 0;
        const alertLevel = parseFloat(item.alertLevel) || 0;
        
        const totalInvestment = quantity * purchasePrice;
        const status = quantity < alertLevel ? "Low Stock" : "In Stock";
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(item.category || "Uncategorized")}</td>
            <td>${formatNumber(quantity)}</td>
            <td>${formatCurrency(purchasePrice)}</td>
            <td>${formatCurrency(sellPrice)}</td>
            <td>${formatCurrency(totalInvestment)}</td>
            <td>${formatNumber(alertLevel)}</td>
            <td><span class="status-badge ${status === "Low Stock" ? "status-cancelled" : "status-completed"}">${status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-icon btn-outline" onclick="editWarehouseItem('${escapeHtml(name)}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="deleteWarehouseItem('${escapeHtml(name)}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function exportWarehouseData() {
    const usersData = getUsersData();
    const warehouse = usersData.warehouse || {};
    
    if (Object.keys(warehouse).length === 0) {
        showToast("No warehouse data to export!", "warning");
        return;
    }
    
    // Convert to CSV
    let csv = "Item Name,Category,Quantity (kg),Purchase Price,Sell Price,Total Investment,Alert Level,Status,Last Updated\n";
    
    Object.entries(warehouse).forEach(([name, item]) => {
        if (!item) return;
        
        const quantity = parseFloat(item.quantity) || 0;
        const purchasePrice = parseFloat(item.purchasePrice) || 0;
        const sellPrice = parseFloat(item.sellPrice) || 0;
        const alertLevel = parseFloat(item.alertLevel) || 0;
        
        const totalInvestment = quantity * purchasePrice;
        const status = quantity < alertLevel ? "Low Stock" : "In Stock";
        const lastUpdated = item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : "N/A";
        
        csv += `"${name.replace(/"/g, '""')}","${item.category || ""}",${quantity},${purchasePrice},${sellPrice},${totalInvestment},${alertLevel},"${status}","${lastUpdated}"\n`;
    });
    
    // Create and download file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = `warehouse-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast("Warehouse data exported successfully!", "success");
}

// ========== PRODUCT FUNCTIONS ==========
function loadProductsData() {
    const usersData = getUsersData();
    const products = usersData.products || [];
    loadProductsGrid(products);
}

function loadProductsGrid(products) {
    const grid = document.getElementById("productsGridAdmin");
    if (!grid) return;
    
    grid.innerHTML = "";
    
    if (products.length === 0) {
        grid.innerHTML = '<p class="muted text-center">No products found. Add your first product!</p>';
        return;
    }
    
    products.forEach((product) => {
        if (!product) return;
        
        let imageSrc = "";
        let imageAlt = product.name || "Product";
        
        if (product.image) {
            if (product.image.startsWith("data:image") || product.image.startsWith("http")) {
                imageSrc = product.image;
            }
        }
        
        const card = document.createElement("div");
        card.className = "product-card-admin";
        card.innerHTML = `
            <div class="product-image-admin">
                ${imageSrc ? 
                    `<img src="${imageSrc}" alt="${escapeHtml(imageAlt)}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'no-image\\'><i class=\\'fas fa-image\\'></i><span>No Image</span></div>';" loading="lazy">` : 
                    `<div class="no-image"><i class="fas fa-image"></i><span>No Image</span></div>`
                }
                ${product.posted ? `<div class="posted-badge">Posted</div>` : ""}
            </div>
            <div class="product-content-admin">
                <h4>${escapeHtml(product.name || "Unnamed Product")}</h4>
                <p class="product-category">${escapeHtml(product.category || "Uncategorized")}</p>
                <p class="product-price">${formatCurrency(product.price || 0)}/kg</p>
                <p class="product-milling">Milling: ${formatCurrency(product.millingFee || 0)}/kg</p>
                ${product.description ? 
                    `<p class="product-description">${escapeHtml(product.description.substring(0, 100))}${product.description.length > 100 ? "..." : ""}</p>` : 
                    ""}
                
                <div class="product-actions-admin">
                    <button class="btn btn-sm ${product.posted ? "btn-outline" : "btn-primary"}" 
                            onclick="toggleProductPost(${product.id})">
                        <i class="fas ${product.posted ? "fa-eye-slash" : "fa-eye"}"></i>
                        ${product.posted ? "Unpost" : "Post"}
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function showProductForm() {
    const formCard = document.getElementById("productFormCard");
    if (!formCard) return;
    
    formCard.style.display = "block";
    
    const title = document.getElementById("productFormTitle");
    if (title) title.textContent = "Add New Product";
    
    // Clear editing state
    if (formCard.dataset?.editingId) {
        delete formCard.dataset.editingId;
    }
    
    // Reset form
    const form = document.getElementById("productForm");
    if (form) form.reset();
    
    // Reset image preview
    resetImagePreview();
    
    // Show correct buttons
    const saveBtn = document.getElementById("saveProductBtn");
    const postBtn = document.getElementById("postProductBtn");
    if (saveBtn) saveBtn.style.display = "block";
    if (postBtn) postBtn.style.display = "none";
    
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideProductForm() {
    const formCard = document.getElementById("productFormCard");
    if (formCard) {
        formCard.style.display = "none";
        
        if (formCard.dataset?.editingId) {
            delete formCard.dataset.editingId;
        }
        
        const form = document.getElementById("productForm");
        if (form) form.reset();
        
        resetImagePreview();
    }
}

function resetImagePreview() {
    const preview = document.getElementById("productImagePreview");
    const placeholder = document.getElementById("imagePlaceholder");
    const imageBase64Input = document.getElementById("productImageBase64");
    const imageFileInput = document.getElementById("productImageFile");
    
    if (preview) {
        preview.src = "";
        preview.style.display = "none";
    }
    if (placeholder) placeholder.style.display = "block";
    if (imageBase64Input) imageBase64Input.value = "";
    if (imageFileInput) imageFileInput.value = "";
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast("Please select an image file", "error");
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast("Image size should be less than 5MB", "error");
        return;
    }
    
    const preview = document.getElementById("productImagePreview");
    const placeholder = document.getElementById("imagePlaceholder");
    const reader = new FileReader();
    
    reader.onload = function(e) {
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = "block";
        }
        if (placeholder) placeholder.style.display = "none";
        
        const imageBase64Input = document.getElementById("productImageBase64");
        if (imageBase64Input) imageBase64Input.value = e.target.result;
    };
    
    reader.onerror = function() {
        showToast("Error reading image file", "error");
    };
    
    reader.readAsDataURL(file);
}

function saveProduct() {
    const formCard = document.getElementById("productFormCard");
    const editingId = formCard?.dataset?.editingId;
    
    const usersData = getUsersData();
    if (!usersData.products) usersData.products = [];
    
    // Gather form values
    const category = document.getElementById("productCategory")?.value || "";
    const subcategory = document.getElementById("productSubcategory")?.value || "";
    const price = parseFloat(document.getElementById("productPrice")?.value) || 0;
    const millingFee = parseFloat(document.getElementById("millingFee")?.value) || 0;
    const minQuantity = parseFloat(document.getElementById("minQuantity")?.value) || 0;
    const origin = document.getElementById("productOrigin")?.value.trim() || "";
    const quality = document.getElementById("productQuality")?.value || "";
    const description = document.getElementById("productDescription")?.value.trim() || "";
    const imageBase64 = document.getElementById("productImageBase64")?.value || "";
    const imageUrl = document.getElementById("productImage")?.value || "";
    const image = imageBase64 || imageUrl;
    
    const name = subcategory || "Unnamed Product";
    
    // Validation
    if (!category) {
        showToast("Category is required!", "error");
        return;
    }
    
    if (!subcategory) {
        showToast("Subcategory is required!", "error");
        return;
    }
    
    if (price <= 0) {
        showToast("Price must be greater than 0!", "error");
        return;
    }
    
    if (editingId) {
        // Update existing product
        const idx = usersData.products.findIndex(p => String(p.id) === String(editingId));
        if (idx !== -1) {
            const existing = usersData.products[idx];
            usersData.products[idx] = {
                ...existing,
                name,
                category,
                subcategory,
                price,
                millingFee,
                minQuantity,
                origin,
                quality,
                description,
                image: image || existing.image,
                updatedAt: new Date().toISOString()
            };
            
            localStorage.setItem("millUsers", JSON.stringify(usersData));
            
            delete formCard.dataset.editingId;
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
        subcategory,
        price,
        millingFee,
        minQuantity,
        origin,
        quality,
        description,
        image,
        posted: false,
        createdAt: new Date().toISOString()
    };
    
    usersData.products.push(productData);
    localStorage.setItem("millUsers", JSON.stringify(usersData));
    
    hideProductForm();
    loadProductsData();
    updateAllCounts();
    showToast("Product saved successfully!", "success");
}

function editProduct(productId) {
    const usersData = getUsersData();
    const products = usersData.products || [];
    const product = products.find(p => String(p.id) === String(productId));
    
    if (!product) {
        showToast("Product not found.", "error");
        return;
    }
    
    // Open product form
    const formCard = document.getElementById("productFormCard");
    if (!formCard) {
        showToast("Product form not found!", "error");
        return;
    }
    
    formCard.style.display = "block";
    formCard.dataset.editingId = String(product.id);
    
    const title = document.getElementById("productFormTitle");
    if (title) title.textContent = "Edit Product";
    
    // Fill form fields
    document.getElementById("productCategory").value = product.category || "";
    
    // Trigger subcategory update
    updateSubcategories();
    
    // Set values after a short delay
    setTimeout(() => {
        document.getElementById("productSubcategory").value = product.subcategory || "";
        updateProductPriceFromWarehouse();
        
        // If price is different from warehouse, use custom price
        if (product.price && document.getElementById("productPrice").value !== product.price.toString()) {
            document.getElementById("productPrice").value = product.price;
        }
        
        document.getElementById("millingFee").value = product.millingFee || "";
        document.getElementById("minQuantity").value = product.minQuantity || "";
        document.getElementById("productOrigin").value = product.origin || "";
        document.getElementById("productQuality").value = product.quality || "";
        document.getElementById("productDescription").value = product.description || "";
        
        // Handle image
        const preview = document.getElementById("productImagePreview");
        const placeholder = document.getElementById("imagePlaceholder");
        const imageBase64Input = document.getElementById("productImageBase64");
        const imageUrlInput = document.getElementById("productImage");
        
        if (product.image) {
            if (product.image.startsWith("data:image")) {
                preview.src = product.image;
                preview.style.display = "block";
                placeholder.style.display = "none";
                imageBase64Input.value = product.image;
                imageUrlInput.value = "";
            } else if (product.image.startsWith("http")) {
                preview.src = product.image;
                preview.style.display = "block";
                placeholder.style.display = "none";
                imageBase64Input.value = "";
                imageUrlInput.value = product.image;
            } else {
                preview.style.display = "none";
                placeholder.style.display = "block";
                imageBase64Input.value = "";
                imageUrlInput.value = product.image;
            }
        } else {
            preview.style.display = "none";
            placeholder.style.display = "block";
            imageBase64Input.value = "";
            imageUrlInput.value = "";
        }
        
        // Show/hide buttons
        const saveBtn = document.getElementById("saveProductBtn");
        const postBtn = document.getElementById("postProductBtn");
        if (saveBtn) saveBtn.style.display = "block";
        if (postBtn) postBtn.style.display = product.posted ? "block" : "none";
        
    }, 100);
    
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleProductPost(productId) {
    const usersData = getUsersData();
    const productIndex = usersData.products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
        showToast("Product not found.", "error");
        return;
    }
    
    usersData.products[productIndex].posted = !usersData.products[productIndex].posted;
    usersData.products[productIndex].postedAt = usersData.products[productIndex].posted ? new Date().toISOString() : null;
    
    localStorage.setItem("millUsers", JSON.stringify(usersData));
    loadProductsData();
    
    showToast(
        `Product ${usersData.products[productIndex].posted ? "posted" : "unposted"} successfully!`,
        "success"
    );
}

function deleteProduct(productId) {
    if (!confirm("Are you sure you want to delete this product?")) {
        return;
    }
    
    const usersData = getUsersData();
    const productIndex = usersData.products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
        showToast("Product not found.", "error");
        return;
    }
    
    usersData.products.splice(productIndex, 1);
    localStorage.setItem("millUsers", JSON.stringify(usersData));
    loadProductsData();
    showToast("Product deleted successfully!", "success");
}

function postProduct() {
    showToast("Product posted to customers!", "success");
}

function updateProductPriceFromWarehouse() {
    const subcategory = document.getElementById("productSubcategory")?.value;
    const priceField = document.getElementById("productPrice");
    
    if (!subcategory || !priceField) return;
    
    priceField.value = "";
    
    const usersData = getUsersData();
    const warehouse = usersData.warehouse || {};
    
    // Find warehouse item with matching name (case-insensitive)
    let warehouseItem = null;
    for (const [name, item] of Object.entries(warehouse)) {
        if (name.toLowerCase() === subcategory.toLowerCase()) {
            warehouseItem = item;
            break;
        }
    }
    
    if (warehouseItem && warehouseItem.sellPrice) {
        priceField.value = warehouseItem.sellPrice;
    } else {
        showToast("Sell price not found in warehouse for this item", "warning");
    }
}

function updateSubcategories() {
    const category = document.getElementById("productCategory").value;
    const subcategorySelect = document.getElementById("productSubcategory");
    
    if (!subcategorySelect) return;
    
    subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
    
    if (!category) {
        document.getElementById("productPrice").value = "";
        return;
    }
    
    // Get warehouse items for the selected category
    const usersData = getUsersData();
    const warehouse = usersData.warehouse || {};
    
    // Get unique warehouse item names for this category
    const warehouseItems = [];
    Object.entries(warehouse).forEach(([name, item]) => {
        if (item && item.category === category && !warehouseItems.includes(name)) {
            warehouseItems.push(name);
        }
    });
    
    // Sort alphabetically
    warehouseItems.sort();
    
    // Populate dropdown with warehouse items
    warehouseItems.forEach((itemName) => {
        const option = document.createElement("option");
        option.value = itemName;
        option.textContent = itemName;
        subcategorySelect.appendChild(option);
    });
    
    // Clear price when category changes
    document.getElementById("productPrice").value = "";
}

// ========== UTILITY FUNCTIONS ==========
function getUsersData() {
    try {
        return JSON.parse(localStorage.getItem("millUsers") || "{}");
    } catch (e) {
        console.error("Error parsing users data:", e);
        return {};
    }
}

function formatCurrency(amount) {
    return "Br " + amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatNumber(number) {
    return new Intl.NumberFormat().format(number);
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    } catch (e) {
        return "Invalid date";
    }
}

function escapeHtml(str) {
    if (typeof str !== "string") return str;
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

function updateDateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
    const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
    });
    
    const dateElement = document.getElementById("currentDate");
    if (dateElement) {
        dateElement.textContent = `${dateStr} ${timeStr}`;
    }
}

function toggleAdminDarkMode() {
    const body = document.body;
    const icon = document.querySelector("#adminDarkMode i");
    
    if (body.getAttribute("data-theme") === "dark") {
        body.removeAttribute("data-theme");
        localStorage.setItem("theme", "light");
        if (icon) {
            icon.classList.remove("fa-sun");
            icon.classList.add("fa-moon");
        }
    } else {
        body.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
        if (icon) {
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
        }
    }
}

function applySavedTheme() {
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
}

function refreshDashboard() {
    loadDashboardData();
    showToast("Dashboard refreshed!", "success");
}

function startAutoRefresh() {
    // Auto-refresh dashboard every 5 minutes
    setInterval(() => {
        const activeSection = document.querySelector(".content-section.active");
        if (activeSection && activeSection.id === "dashboard") {
            loadDashboardData();
        }
    }, 300000);
    
    // Update time every minute
    setInterval(updateDateTime, 60000);
}

// ========== CHART FUNCTIONS ==========
function initializeCharts() {
    const usersData = getUsersData();
    
    // Orders Chart
    const ordersCtx = document.getElementById("ordersChart");
    if (ordersCtx) {
        charts.orders = new Chart(ordersCtx.getContext("2d"), {
            type: "line",
            data: {
                labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                datasets: [{
                    label: "Orders",
                    data: [12, 19, 8, 15, 12, 20, 10],
                    borderColor: "#4CAF50",
                    backgroundColor: "rgba(76, 175, 80, 0.1)",
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: "rgba(0, 0, 0, 0.05)"
                        }
                    },
                    x: {
                        grid: {
                            color: "rgba(0, 0, 0, 0.05)"
                        }
                    }
                }
            }
        });
    }
    
    // Revenue Chart
    const revenueCtx = document.getElementById("revenueChart");
    if (revenueCtx) {
        charts.revenue = new Chart(revenueCtx.getContext("2d"), {
            type: "bar",
            data: {
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                datasets: [{
                    label: "Revenue",
                    data: [12000, 19000, 8000, 15000, 12000, 20000],
                    backgroundColor: "#2196F3",
                    borderRadius: 4,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: "rgba(0, 0, 0, 0.05)"
                        },
                        ticks: {
                            callback: function(value) {
                                return "Br " + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

function updateCharts(data) {
    // Update charts if needed
}

// ========== ORDER FUNCTIONS ==========
function viewOrderDetails(orderId) {
    const usersData = getUsersData();
    const orders = usersData.orders || [];
    const products = usersData.products || [];
    const customers = usersData.customers || [];
    
    const order = orders.find(o => String(o.id) === String(orderId));
    if (!order) {
        showToast("Order not found", "error");
        return;
    }
    
    const customer = customers.find(c => c.id === order.customerId);
    const product = products.find(p => p.id === order.productId);
    
    alert(`Order Details:
    ID: #${order.id}
    Customer: ${customer?.name || "Unknown"}
    Product: ${product?.name || order.productName || "N/A"}
    Quantity: ${order.quantity || 0} kg
    Total: ${formatCurrency(order.total || 0)}
    Status: ${order.status || "Pending"}
    Date: ${formatDate(order.orderDate)}`);
}

function editOrder(orderId) {
    showToast("Edit order function not implemented yet", "info");
}

// ========== OTHER SECTION STUBS ==========
function loadOperatorsData() {
    console.log("Loading operators data");
}

function loadCustomersData() {
    console.log("Loading customers data");
}

function loadFinanceData() {
    console.log("Loading finance data");
}

function loadReportsData() {
    console.log("Loading reports data");
}

function loadSettingsData() {
    console.log("Loading settings data");
}

function loadMessagesData() {
    console.log("Loading messages data");
}

function loadDriversData() {
    console.log("Loading drivers data");
}

function updateAllCounts() {
    console.log("Updating all counts");
}

function sendMessage() {
    console.log("Sending message");
}

// ========== GLOBAL FUNCTIONS ==========
window.navigateToSection = navigateToSection;
window.viewOrderDetails = viewOrderDetails;
window.editOrder = editOrder;
window.editWarehouseItem = editWarehouseItem;
window.deleteWarehouseItem = deleteWarehouseItem;
window.toggleProductPost = toggleProductPost;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateProductPriceFromWarehouse = updateProductPriceFromWarehouse;
window.updateSubcategories = updateSubcategories;

// ========== FINAL INITIALIZATION ==========
// Make sure warehouse form works - add this emergency listener
setTimeout(function() {
    console.log("Running emergency warehouse form fix...");
    
    const warehouseForm = document.getElementById('warehouseForm');
    if (warehouseForm) {
        console.log("Found warehouse form, adding emergency listener");
        
        // Add submit listener
        warehouseForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log("EMERGENCY: Form submitted!");
            saveWarehouseItem();
            return false;
        });
        
        // Also find and fix the save button
        const saveButton = document.querySelector('#warehouseForm button[type="submit"]');
        if (saveButton) {
            console.log("Found save button, adding click listener");
            saveButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log("EMERGENCY: Save button clicked!");
                saveWarehouseItem();
                return false;
            });
        }
    }
}, 1000);