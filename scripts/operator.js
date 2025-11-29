// Operator specific JavaScript

let currentOperator = null;
let chatMessages = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeOperatorPage();
});

function initializeOperatorPage() {
    setupOperatorEventListeners();
    checkOperatorLogin();
}

function setupOperatorEventListeners() {
    // Operator login
    const loginForm = document.getElementById('operator-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleOperatorLogin);
    }
    
    // Daily report
    const reportBtn = document.getElementById('send-daily-report');
    if (reportBtn) {
        reportBtn.addEventListener('click', sendDailyReport);
    }
    
    // Messaging
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message');
    const uploadFileBtn = document.getElementById('upload-file');
    const fileUpload = document.getElementById('file-upload');
    
    if (messageInput && sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    if (uploadFileBtn && fileUpload) {
        uploadFileBtn.addEventListener('click', () => fileUpload.click());
        fileUpload.addEventListener('change', handleFileUpload);
    }
    
    // Contact selection
    const contacts = document.querySelectorAll('.contact');
    contacts.forEach(contact => {
        contact.addEventListener('click', function() {
            contacts.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            loadChatMessages(this.dataset.contact);
        });
    });
}

function handleOperatorLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('operator-username').value;
    const password = document.getElementById('operator-password').value;
    
    // Simple authentication
    const operators = JSON.parse(localStorage.getItem('operators')) || [];
    const operator = operators.find(op => op.username === username);
    
    if (operator) {
        currentOperator = operator;
        localStorage.setItem('currentOperator', JSON.stringify(operator));
        showOperatorDashboard();
    } else {
        alert('Invalid operator credentials');
    }
}

function checkOperatorLogin() {
    const savedOperator = localStorage.getItem('currentOperator');
    if (savedOperator) {
        currentOperator = JSON.parse(savedOperator);
        showOperatorDashboard();
    }
}

function showOperatorDashboard() {
    document.getElementById('operator-login').style.display = 'none';
    document.getElementById('operator-dashboard').style.display = 'block';
    
    loadOperatorData();
    loadPendingOrders();
    setupChat();
}

function loadOperatorData() {
    if (currentOperator) {
        document.getElementById('operator-name').textContent = currentOperator.name;
        
        // Load assigned tasks
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = `
            <div class="task-item">
                <strong>Primary Task:</strong> ${currentOperator.task}
            </div>
            <div class="task-item">
                <strong>Status:</strong> Active
            </div>
        `;
        
        // Calculate today's earnings
        const orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
        const today = new Date().toDateString();
        const todayOrders = orders.filter(order => {
            const orderDate = new Date(order.orderDate).toDateString();
            return orderDate === today && order.status === 'completed';
        });
        
        const todayEarnings = todayOrders.reduce((total, order) => total + order.total, 0);
        document.getElementById('today-earnings').textContent = `${todayEarnings} ETB`;
        
        const pendingPayments = orders.filter(order => order.status === 'pending').length;
        document.getElementById('pending-payments').textContent = `${pendingPayments} orders`;
    }
}

function loadPendingOrders() {
    const orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
    const pendingOrders = orders.filter(order => order.status === 'pending');
    const ordersGrid = document.getElementById('pending-orders');
    
    ordersGrid.innerHTML = '';
    
    pendingOrders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        orderCard.innerHTML = `
            <div class="order-header">
                <span class="order-id">Order #${order.id}</span>
                <span class="order-status status-pending">Pending</span>
            </div>
            <div class="order-details">
                <p><strong>Product:</strong> ${order.productName}</p>
                <p><strong>Quantity:</strong> ${order.quantity} kg</p>
                <p><strong>Total:</strong> ${order.total} ETB</p>
                <p><strong>Customer:</strong> ${order.customerInfo?.fullName || 'N/A'}</p>
            </div>
            <div class="order-actions">
                <button class="btn btn-primary" onclick="processOrder(${order.id})">
                    Process Order
                </button>
                <button class="btn btn-secondary" onclick="viewOrderDetails(${order.id})">
                    Details
                </button>
            </div>
        `;
        ordersGrid.appendChild(orderCard);
    });
}

function processOrder(orderId) {
    const orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex > -1) {
        orders[orderIndex].status = 'processing';
        orders[orderIndex].processedBy = currentOperator.name;
        orders[orderIndex].processDate = new Date().toISOString();
        
        localStorage.setItem('customerOrders', JSON.stringify(orders));
        
        // Send message to customer
        sendMessageToCustomer(orderId, "Your order is now being processed. We'll notify you when it's ready.");
        
        loadPendingOrders();
        loadOperatorData();
        
        alert('Order processing started');
    }
}

function viewOrderDetails(orderId) {
    const orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
    const order = orders.find(order => order.id === orderId);
    
    if (order) {
        const details = `
            Order ID: ${order.id}
            Product: ${order.productName}
            Quantity: ${order.quantity} kg
            Total: ${order.total} ETB
            Customer: ${order.customerInfo?.fullName || 'N/A'}
            Phone: ${order.customerInfo?.phone || 'N/A'}
            Address: ${order.customerInfo?.address || 'N/A'}
        `;
        alert(details);
    }
}

function sendDailyReport() {
    const orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
    const today = new Date().toDateString();
    const todayOrders = orders.filter(order => {
        const orderDate = new Date(order.orderDate).toDateString();
        return orderDate === today;
    });
    
    const completedOrders = todayOrders.filter(order => order.status === 'completed');
    const totalEarnings = completedOrders.reduce((total, order) => total + order.total, 0);
    
    const report = {
        date: new Date().toISOString(),
        operator: currentOperator.name,
        totalOrders: todayOrders.length,
        completedOrders: completedOrders.length,
        totalEarnings: totalEarnings,
        sentAt: new Date().toISOString()
    };
    
    // Save report (in real app, this would be sent to admin)
    let dailyReports = JSON.parse(localStorage.getItem('dailyReports')) || [];
    dailyReports.push(report);
    localStorage.setItem('dailyReports', JSON.stringify(dailyReports));
    
    alert(`Daily report sent!\nOrders: ${report.totalOrders}\nEarnings: ${report.totalEarnings} ETB`);
}

function setupChat() {
    // Load initial messages
    loadChatMessages('admin');
}

function loadChatMessages(contact) {
    const chatMessagesDiv = document.getElementById('chat-messages');
    const currentContact = document.getElementById('current-contact');
    
    currentContact.textContent = contact === 'admin' ? 'Admin' : 'Customer Support';
    
    // Load messages from localStorage or use sample data
    chatMessages = JSON.parse(localStorage.getItem(`chat_${contact}`)) || [
        {
            id: 1,
            text: 'Welcome to the operator chat!',
            sender: 'system',
            time: new Date().toISOString(),
            type: 'received'
        }
    ];
    
    displayChatMessages();
}

function displayChatMessages() {
    const chatMessagesDiv = document.getElementById('chat-messages');
    chatMessagesDiv.innerHTML = '';
    
    chatMessages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}`;
        
        let messageHTML = `
            <div class="message-text">${message.text}</div>
            <div class="message-time">${formatTime(message.time)}</div>
        `;
        
        if (message.image) {
            messageHTML = `
                <div class="message-text">${message.text}</div>
                <img src="${message.image}" alt="Uploaded image" class="message-image">
                <div class="message-time">${formatTime(message.time)}</div>
            `;
        }
        
        messageDiv.innerHTML = messageHTML;
        chatMessagesDiv.appendChild(messageDiv);
    });
    
    // Scroll to bottom
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const text = messageInput.value.trim();
    
    if (!text) return;
    
    const activeContact = document.querySelector('.contact.active').dataset.contact;
    
    const message = {
        id: Date.now(),
        text: text,
        sender: currentOperator.name,
        time: new Date().toISOString(),
        type: 'sent'
    };
    
    chatMessages.push(message);
    saveChatMessages(activeContact);
    displayChatMessages();
    
    // Clear input
    messageInput.value = '';
    
    // Simulate reply (in real app, this would be from the other party)
    setTimeout(() => {
        const replies = {
            admin: [
                "Message received. Continue with the milling process.",
                "Make sure to update the stock levels after processing.",
                "The daily report looks good. Keep up the good work."
            ],
            customer_support: [
                "Thank you for the update.",
                "I'll inform the customer about their order status.",
                "Let me know if you need any assistance with customer orders."
            ]
        };
        
        const randomReply = replies[activeContact][Math.floor(Math.random() * replies[activeContact].length)];
        
        const replyMessage = {
            id: Date.now() + 1,
            text: randomReply,
            sender: activeContact === 'admin' ? 'Admin' : 'Support',
            time: new Date().toISOString(),
            type: 'received'
        };
        
        chatMessages.push(replyMessage);
        saveChatMessages(activeContact);
        displayChatMessages();
    }, 1000 + Math.random() * 2000);
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const activeContact = document.querySelector('.contact.active').dataset.contact;
            
            const message = {
                id: Date.now(),
                text: 'Image uploaded:',
                image: e.target.result,
                sender: currentOperator.name,
                time: new Date().toISOString(),
                type: 'sent'
            };
            
            chatMessages.push(message);
            saveChatMessages(activeContact);
            displayChatMessages();
        };
        reader.readAsDataURL(file);
    }
    
    // Reset file input
    event.target.value = '';
}

function saveChatMessages(contact) {
    localStorage.setItem(`chat_${contact}`, JSON.stringify(chatMessages));
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function sendMessageToCustomer(orderId, message) {
    // In a real application, this would send a notification to the customer
    console.log(`Message to customer for order ${orderId}: ${message}`);
    
    // For demo purposes, we'll store customer messages
    let customerMessages = JSON.parse(localStorage.getItem('customerMessages')) || {};
    if (!customerMessages[orderId]) {
        customerMessages[orderId] = [];
    }
    customerMessages[orderId].push({
        text: message,
        time: new Date().toISOString(),
        from: 'operator'
    });
    
    localStorage.setItem('customerMessages', JSON.stringify(customerMessages));
}