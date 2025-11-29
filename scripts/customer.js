// Customer specific JavaScript

let currentProduct = null;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

document.addEventListener('DOMContentLoaded', function() {
    initializeCustomerPage();
});

function initializeCustomerPage() {
    loadProducts();
    setupEventListeners();
    checkRegistrationRequirement();
}

function loadProducts() {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;

    productsGrid.innerHTML = '';
    
    productsData.forEach(product => {
        const isFavorite = favorites.includes(product.id);
        const productCard = createProductCard(product, isFavorite);
        productsGrid.appendChild(productCard);
    });
}

function createProductCard(product, isFavorite) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <div class="product-image">
            ${product.image ? 
                `<img src="${product.image}" alt="${product.name}">` : 
                `<i class="fas fa-${getProductIcon(product.category)}"></i>`
            }
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="product-price">${product.price} ETB/kg</div>
            <div class="product-actions">
                <button class="btn-icon love-btn ${isFavorite ? 'favorited' : ''}" data-id="${product.id}">
                    <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <button class="btn btn-secondary cart-btn" data-id="${product.id}">
                    <i class="fas fa-shopping-cart"></i> Cart
                </button>
                <button class="btn btn-primary buy-btn" data-id="${product.id}">
                    Buy Now
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function getProductIcon(category) {
    const icons = {
        'grain': 'wheat-alt',
        'legume': 'seedling', 
        'spice': 'pepper-hot',
        'other': 'shopping-basket'
    };
    return icons[category] || 'shopping-basket';
}

function setupEventListeners() {
    // Product search
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }
    
    // Category filters
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterProducts();
        });
    });
    
    // Registration form payment method change
    const paymentMethod = document.getElementById('payment-method');
    if (paymentMethod) {
        paymentMethod.addEventListener('change', togglePaymentFields);
    }
    
    // ID upload preview
    setupFileUploadPreview();
}

function filterProducts() {
    const searchTerm = document.getElementById('product-search').value.toLowerCase();
    const activeCategory = document.querySelector('.filter-btn.active').dataset.category;
    
    const filteredProducts = productsData.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                            product.description.toLowerCase().includes(searchTerm);
        const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
        return matchesSearch && matchesCategory;
    });
    
    displayFilteredProducts(filteredProducts);
}

function displayFilteredProducts(products) {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = '';
    
    products.forEach(product => {
        const isFavorite = favorites.includes(product.id);
        const productCard = createProductCard(product, isFavorite);
        productsGrid.appendChild(productCard);
    });
    
    // Re-attach event listeners to new buttons
    attachProductButtonListeners();
}

function attachProductButtonListeners() {
    // Love buttons
    document.querySelectorAll('.love-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = parseInt(this.dataset.id);
            toggleFavorite(productId, this);
        });
    });
    
    // Cart buttons
    document.querySelectorAll('.cart-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = parseInt(this.dataset.id);
            addToCart(productId);
        });
    });
    
    // Buy buttons
    document.querySelectorAll('.buy-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = parseInt(this.dataset.id);
            showOrderForm(productId);
        });
    });
}

function toggleFavorite(productId, button) {
    const icon = button.querySelector('i');
    const index = favorites.indexOf(productId);
    
    if (index > -1) {
        favorites.splice(index, 1);
        icon.classList.remove('fas');
        icon.classList.add('far');
        button.classList.remove('favorited');
    } else {
        favorites.push(productId);
        icon.classList.remove('far');
        icon.classList.add('fas');
        button.classList.add('favorited');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Update favorite count in all instances
    updateFavoriteButtons(productId);
}

function updateFavoriteButtons(productId) {
    const allLoveButtons = document.querySelectorAll(`.love-btn[data-id="${productId}"]`);
    const isFavorited = favorites.includes(productId);
    
    allLoveButtons.forEach(button => {
        const icon = button.querySelector('i');
        if (isFavorited) {
            icon.classList.remove('far');
            icon.classList.add('fas');
            button.classList.add('favorited');
        } else {
            icon.classList.remove('fas');
            icon.classList.add('far');
            button.classList.remove('favorited');
        }
    });
}

function addToCart(productId) {
    const product = productsData.find(p => p.id === productId);
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    showNotification(`${product.name} added to cart!`);
}

function showOrderForm(productId) {
    currentProduct = productsData.find(p => p.id === productId);
    const orderModal = document.getElementById('order-modal');
    
    if (!currentProduct) return;
    
    // Check if user is registered
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        showRegistrationModal();
        return;
    }
    
    // Populate order form
    document.getElementById('order-product-name').textContent = currentProduct.name;
    document.getElementById('order-product-desc').textContent = currentProduct.description;
    document.getElementById('order-product-price').textContent = `${currentProduct.price} ETB/kg`;
    document.getElementById('order-milling-price').textContent = `Milling: ${currentProduct.millingPrice} ETB/kg`;
    
    if (currentProduct.image) {
        document.getElementById('order-product-img').src = currentProduct.image;
        document.getElementById('order-product-img').style.display = 'block';
    } else {
        document.getElementById('order-product-img').style.display = 'none';
    }
    
    updateOrderSummary();
    orderModal.style.display = 'flex';
    
    // Add event listeners for order form
    document.getElementById('order-quantity').addEventListener('input', updateOrderSummary);
    document.getElementById('buy-now-btn').addEventListener('click', processOrder);
    document.getElementById('add-cart-btn').addEventListener('click', addCurrentToCart);
    document.getElementById('favorite-btn').addEventListener('click', toggleCurrentFavorite);
}

function updateOrderSummary() {
    if (!currentProduct) return;
    
    const quantity = parseInt(document.getElementById('order-quantity').value) || 1;
    const productCost = currentProduct.price * quantity;
    const millingCost = currentProduct.millingPrice * quantity;
    const orderFee = 20;
    const total = productCost + millingCost + orderFee;
    
    document.getElementById('summary-product-cost').textContent = `${productCost} ETB`;
    document.getElementById('summary-milling-cost').textContent = `${millingCost} ETB`;
    document.getElementById('summary-total').textContent = `${total} ETB`;
}

function processOrder() {
    const quantity = parseInt(document.getElementById('order-quantity').value) || 1;
    const user = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!user || !currentProduct) return;
    
    const order = {
        id: Date.now(),
        productId: currentProduct.id,
        productName: currentProduct.name,
        quantity: quantity,
        price: currentProduct.price,
        millingPrice: currentProduct.millingPrice,
        orderFee: 20,
        total: (currentProduct.price * quantity) + (currentProduct.millingPrice * quantity) + 20,
        status: 'pending',
        orderDate: new Date().toISOString(),
        customerInfo: user
    };
    
    // Save order
    let orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
    orders.push(order);
    localStorage.setItem('customerOrders', JSON.stringify(orders));
    
    showNotification('Order placed successfully!');
    document.getElementById('order-modal').style.display = 'none';
}

function addCurrentToCart() {
    if (currentProduct) {
        addToCart(currentProduct.id);
        document.getElementById('order-modal').style.display = 'none';
    }
}

function toggleCurrentFavorite() {
    if (currentProduct) {
        const button = document.getElementById('favorite-btn');
        toggleFavorite(currentProduct.id, button);
    }
}

function showRegistrationModal() {
    document.getElementById('register-modal').style.display = 'flex';
}

function togglePaymentFields() {
    const method = document.getElementById('payment-method').value;
    document.getElementById('cbe-fields').style.display = method === 'cbe' ? 'block' : 'none';
    document.getElementById('telebirr-fields').style.display = method === 'telebirr' ? 'block' : 'none';
}

function setupFileUploadPreview() {
    const frontInput = document.getElementById('id-front');
    const backInput = document.getElementById('id-back');
    const frontPreview = document.getElementById('front-preview');
    const backPreview = document.getElementById('back-preview');
    
    if (frontInput && frontPreview) {
        frontInput.addEventListener('change', function(e) {
            handleFileUpload(e, frontPreview);
        });
    }
    
    if (backInput && backPreview) {
        backInput.addEventListener('change', function(e) {
            handleFileUpload(e, backPreview);
        });
    }
}

function handleFileUpload(event, previewElement) {
    const file = event.target.files[0];
    if (file) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewElement.innerHTML = `<img src="${e.target.result}" alt="Upload preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please upload an image file (JPG, PNG, etc.)');
            event.target.value = '';
        }
    }
}

function checkRegistrationRequirement() {
    // For night orders, registration might not be required
    const now = new Date();
    const hours = now.getHours();
    const isNight = hours >= 22 || hours < 6;
    
    if (isNight) {
        // Allow browsing without registration at night
        console.log('Night mode: Registration not required for browsing');
    }
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 1rem 2rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize when page loads
attachProductButtonListeners();