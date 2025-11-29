// Admin specific JavaScript

const ADMIN_SECRET = 'admin123';
let isAdminLoggedIn = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPage();
});

function initializeAdminPage() {
    setupAdminEventListeners();
    checkAdminLogin();
}

function setupAdminEventListeners() {
    // Admin login form
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }
    
    // Add product button
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', showAddProductModal);
    }
    
    // Add product form
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProduct);
    }
    
    // Category change for subcategories
    const categorySelect = document.getElementById('product-category');
    if (categorySelect) {
        categorySelect.addEventListener('change', updateSubcategories);
    }
}

function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    const secret = document.getElementById('admin-secret').value;
    
    if (secret !== ADMIN_SECRET) {
        alert('Invalid admin secret code');
        return;
    }
    
    // Simple authentication (in real app, this would be server-side)
    if (username && password) {
        isAdminLoggedIn = true;
        localStorage.setItem('adminLoggedIn', 'true');
        showAdminDashboard();
    } else {
        alert('Please enter username and password');
    }
}

function checkAdminLogin() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    if (isLoggedIn) {
        isAdminLoggedIn = true;
        showAdminDashboard();
    }
}

function showAdminDashboard() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    
    loadAdminData();
    initializeCharts();
    loadOperators();
    loadProductsTable();
}

function loadAdminData() {
    // Load customer statistics
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
    
    document.getElementById('total-customers').textContent = customers.length;
    document.getElementById('online-orders').textContent = orders.length;
    
    // Calculate grain stock
    let totalStock = 0;
    productsData.forEach(product => {
        totalStock += product.stock;
    });
    document.getElementById('grain-stock').textContent = `${totalStock} kg`;
    
    // Calculate monthly revenue
    const monthlyRevenue = orders.reduce((total, order) => total + order.total, 0);
    document.getElementById('monthly-revenue').textContent = `${monthlyRevenue} ETB`;
}

function initializeCharts() {
    // Grain Sales Chart
    const grainSalesCtx = document.getElementById('grainSalesChart').getContext('2d');
    new Chart(grainSalesCtx, {
        type: 'bar',
        data: {
            labels: ['Teff', 'Barley', 'Wheat', 'Beans', 'Lentils', 'Pepper'],
            datasets: [{
                label: 'Sales (kg)',
                data: [1200, 800, 950, 600, 450, 300],
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgb(52, 152, 219)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Profit & Loss Chart
    const profitLossCtx = document.getElementById('profitLossChart').getContext('2d');
    new Chart(profitLossCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue',
                data: [200000, 220000, 180000, 240000, 260000, 245000],
                borderColor: 'rgb(46, 204, 113)',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                fill: true
            }, {
                label: 'Expenses',
                data: [150000, 160000, 140000, 170000, 180000, 175000],
                borderColor: 'rgb(231, 76, 60)',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                fill: true
            }]
        },
        options: {
            responsive: true
        }
    });
    
    // Customer Distribution Chart
    const customerCtx = document.getElementById('customerChart').getContext('2d');
    new Chart(customerCtx, {
        type: 'doughnut',
        data: {
            labels: ['Online', 'In-Person', 'New'],
            datasets: [{
                data: [60, 30, 10],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(241, 196, 15, 0.7)'
                ]
            }]
        }
    });
    
    // Revenue Sources Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    new Chart(revenueCtx, {
        type: 'pie',
        data: {
            labels: ['Teff', 'Barley', 'Wheat', 'Beans', 'Lentils', 'Pepper'],
            datasets: [{
                data: [216000, 96000, 142500, 60000, 40500, 60000],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(241, 196, 15, 0.7)',
                    'rgba(230, 126, 34, 0.7)',
                    'rgba(155, 89, 182, 0.7)',
                    'rgba(231, 76, 60, 0.7)'
                ]
            }]
        }
    });
}

function loadOperators() {
    const operators = JSON.parse(localStorage.getItem('operators')) || [
        {
            id: 1,
            name: 'Operator A',
            username: 'operator_a',
            task: 'Teff Milling',
            status: 'active'
        },
        {
            id: 2, 
            name: 'Operator B',
            username: 'operator_b',
            task: 'Barley & Wheat Milling',
            status: 'active'
        },
        {
            id: 3,
            name: 'Operator C',
            username: 'operator_c', 
            task: 'Other Grains & Spices',
            status: 'active'
        }
    ];
    
    const operatorsGrid = document.getElementById('operators-grid');
    operatorsGrid.innerHTML = '';
    
    operators.forEach(operator => {
        const operatorCard = document.createElement('div');
        operatorCard.className = 'operator-card';
        operatorCard.innerHTML = `
            <div class="operator-header">
                <span class="operator-name">${operator.name}</span>
                <div class="operator-actions">
                    <button class="btn btn-secondary" onclick="editOperator(${operator.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="resetPassword(${operator.id})">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteOperator(${operator.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="operator-task">Task: ${operator.task}</div>
            <div class="operator-status">Status: ${operator.status}</div>
        `;
        operatorsGrid.appendChild(operatorCard);
    });
}

function loadProductsTable() {
    const tableBody = document.querySelector('#products-table tbody');
    tableBody.innerHTML = '';
    
    productsData.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.price}</td>
            <td>${product.millingPrice}</td>
            <td>${product.stock}</td>
            <td class="table-actions">
                <button class="btn btn-secondary" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function showAddProductModal() {
    document.getElementById('add-product-modal').style.display = 'flex';
}

function updateSubcategories() {
    const category = document.getElementById('product-category').value;
    const subcategorySelect = document.getElementById('product-subcategory');
    
    subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
    
    const subcategories = {
        'grain': ['Teff', 'Barley', 'Wheat', 'Sorghum', 'Millet', 'Flax', 'Oats', 'Corn'],
        'legume': ['Peas', 'Beans', 'Lentils', 'Chickpeas', 'Bolokhi'],
        'spice': ['Pepper', 'Spices', 'Whole Grains'],
        'other': ['Other Items']
    };
    
    if (subcategories[category]) {
        subcategories[category].forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.toLowerCase();
            option.textContent = sub;
            subcategorySelect.appendChild(option);
        });
    }
}

function handleAddProduct(e) {
    e.preventDefault();
    
    const newProduct = {
        id: Date.now(),
        name: document.getElementById('product-name').value,
        category: document.getElementById('product-category').value,
        subcategory: document.getElementById('product-subcategory').value,
        price: parseFloat(document.getElementById('product-price').value),
        millingPrice: parseFloat(document.getElementById('milling-price').value),
        stock: parseInt(document.getElementById('product-stock').value),
        description: document.getElementById('product-description').value,
        minPurchase: 1
    };
    
    productsData.push(newProduct);
    loadProductsTable();
    document.getElementById('add-product-modal').style.display = 'none';
    document.getElementById('add-product-form').reset();
    
    updateAdminStats();
}

function editProduct(productId) {
    const product = productsData.find(p => p.id === productId);
    if (product) {
        // Populate edit form (similar to add form)
        // For simplicity, we'll just alert
        alert(`Edit product: ${product.name}`);
    }
}

function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        const index = productsData.findIndex(p => p.id === productId);
        if (index > -1) {
            productsData.splice(index, 1);
            loadProductsTable();
            updateAdminStats();
        }
    }
}

function editOperator(operatorId) {
    alert(`Edit operator with ID: ${operatorId}`);
}

function resetPassword(operatorId) {
    if (confirm('Reset password for this operator?')) {
        alert(`Password reset for operator ${operatorId}`);
    }
}

function deleteOperator(operatorId) {
    if (confirm('Are you sure you want to delete this operator?')) {
        let operators = JSON.parse(localStorage.getItem('operators')) || [];
        operators = operators.filter(op => op.id !== operatorId);
        localStorage.setItem('operators', JSON.stringify(operators));
        loadOperators();
    }
}

function updateAdminStats() {
    // Recalculate and update statistics
    loadAdminData();
}