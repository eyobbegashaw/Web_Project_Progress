// Initialize application
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

function initializeApp() {
  // Initialize data storage
  initializeStorage();

  // Set up event listeners
  setupEventListeners();

  // Load products
  loadProducts();

  // Check for active theme
  checkTheme();

  // Show home section by default
  showSection("home");

  // Initialize animations
  initializeAnimations();
}

document.addEventListener("DOMContentLoaded", function () {
  // Get the image elements
  const image1 = document.getElementById("image1");
  const image2 = document.getElementById("image2");
  const image3 = document.getElementById("image3");

  // Apply animations with delays
  setTimeout(() => {
    image1.classList.add("animate");
  }, 500);

  setTimeout(() => {
    image2.classList.add("animate");
  }, 800);

  setTimeout(() => {
    image3.classList.add("animate");
  }, 1100);

  // Scroll event listener
  let lastScrollTop = 0;
  let imagesVisible = true;

  window.addEventListener("scroll", function () {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const homeSection = document.querySelector(".home-section");
    const homeSectionHeight = homeSection.offsetHeight;

    // Check if we're in the home section
    if (scrollTop < homeSectionHeight) {
      // Scrolling down
      if (scrollTop > lastScrollTop && scrollTop > 1) {
        if (imagesVisible) {
          // Move images out
          image1.classList.remove("animate");
          image1.classList.add("scroll-out-left");

          image2.classList.remove("animate");
          image2.classList.add("scroll-out-right");

          image3.classList.remove("animate");
          image3.classList.add("scroll-out-bottom");

          imagesVisible = false;
        }
      }
      // Scrolling up
      else if (
        scrollTop < lastScrollTop &&
        scrollTop < homeSectionHeight - 10
      ) {
        if (!imagesVisible) {
          // Bring images back
          image1.classList.remove("scroll-out-left");
          image1.classList.add("animate");

          image2.classList.remove("scroll-out-right");
          image2.classList.add("animate");

          image3.classList.remove("scroll-out-bottom");
          image3.classList.add("animate");

          imagesVisible = true;
        }
      }
    }

    lastScrollTop = scrollTop;
  });
});

// Data storage initialization
function initializeStorage() {
  if (!localStorage.getItem("millUsers")) {
    const initialUsers = {
      admin: [
        {
          id: 1,
          email: "admin@millpro.com",
          password: "admin123",
          name: "System Admin",
          phone: "+251911223344",
          role: "admin",
          secret: "MILL2024ADMIN",
        },
      ],
      customers: [],
      operators: [],
      drivers: [],
      products: getInitialProducts(),
      orders: [],
      warehouse: getInitialWarehouse(),
      messages: [],
    };
    localStorage.setItem("millUsers", JSON.stringify(initialUsers));
  }
}

function getInitialProducts() {
  return [
    {
      id: 1,
      name: "Teff",
      category: "Grain",
      price: 180,
      millingFee: 10,
      minQuantity: 1,
      image:
        "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
      description: "Premium Ethiopian teff, perfect for making injera.",
      origin: "Ethiopia",
      quality: "Grade A",
      posted: true,
    },
    {
      id: 2,
      name: "Barley",
      category: "Grain",
      price: 120,
      millingFee: 8,
      minQuantity: 1,
      image:
        "https://images.unsplash.com/photo-1586201375761-83865001e311?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
      description: "Organic barley for healthy meals.",
      origin: "Local",
      quality: "Grade B",
      posted: true,
    },
    {
      id: 3,
      name: "Wheat",
      category: "Grain",
      price: 150,
      millingFee: 10,
      minQuantity: 1,
      image:
        "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
      description: "High quality wheat flour.",
      origin: "Imported",
      quality: "Grade A",
      posted: true,
    },
  ];
}

function getInitialWarehouse() {
  return {
    teff: { quantity: 1000, purchasePrice: 150, sellPrice: 180 },
    barley: { quantity: 500, purchasePrice: 100, sellPrice: 120 },
    wheat: { quantity: 300, purchasePrice: 120, sellPrice: 150 },
    sorghum: { quantity: 200, purchasePrice: 80, sellPrice: 100 },
    peas: { quantity: 400, purchasePrice: 90, sellPrice: 110 },
    pepper: { quantity: 600, purchasePrice: 200, sellPrice: 250 },
  };
}

// Event Listeners Setup
function setupEventListeners() {
  // Navigation
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const sectionId = this.getAttribute("href").substring(1);
      showSection(sectionId);

      // Update active nav link
      document
        .querySelectorAll(".nav-link")
        .forEach((l) => l.classList.remove("active"));
      this.classList.add("active");

      // Close mobile nav menu if open (helpful on small screens)
      const navMenu = document.querySelector(".nav-menu");
      if (navMenu && navMenu.classList.contains("active")) {
        navMenu.classList.remove("active");
      }
    });
  });

  // Mobile menu toggle
  document.querySelector(".hamburger").addEventListener("click", function () {
    document.querySelector(".nav-menu").classList.toggle("active");
  });

  // Dark mode toggle
  document
    .getElementById("darkModeToggle")
    .addEventListener("click", toggleDarkMode);

  // Modal buttons
  document
    .getElementById("loginBtn")
    .addEventListener("click", () => showModal("loginModal"));
  document
    .getElementById("registerBtn")
    .addEventListener("click", () => showModal("registerModal"));
  document.getElementById("showRegister").addEventListener("click", (e) => {
    e.preventDefault();
    hideModal("loginModal");
    showModal("registerModal");
  });

  // Close modals
  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.closest(".modal").style.display = "none";
    });
  });

  // Forgot password
  document.getElementById("forgotPassword").addEventListener("click", (e) => {
    e.preventDefault();
    hideModal("loginModal");
    showModal("forgotModal");
  });

  // Form submissions
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document
    .getElementById("registerForm")
    .addEventListener("submit", handleRegister);
  document
    .getElementById("forgotForm")
    .addEventListener("submit", handleForgotPassword);
  document
    .getElementById("contactForm")
    .addEventListener("submit", handleContact);

  // Close modal when clicking outside
  window.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none";
    }
  });
}

// Modal Functions
function showModal(modalId) {
  document.getElementById(modalId).style.display = "flex";
}

function hideModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

// Section Navigation
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  // Show selected section
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.add("active");

    // Trigger animations for elements in this section
    setTimeout(() => {
      animateSectionElements(section);
    }, 100);

    // Scroll the section into view with offset to avoid the fixed navbar
    try {
      const navHeightRaw =
        getComputedStyle(document.documentElement).getPropertyValue(
          "--nav-height"
        ) || "80px";
      const navHeight = parseInt(navHeightRaw.replace("px", "")) || 80;
      const extraGap = 8; // small extra spacing
      const top =
        window.pageYOffset +
        section.getBoundingClientRect().top -
        (navHeight + extraGap);
      window.scrollTo({ top, behavior: "smooth" });
    } catch (err) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

// Animation Functions
function initializeAnimations() {
  // Initialize intersection observer for scroll animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate__animated", "animate__fadeInUp");
        }
      });
    },
    { threshold: 0.1 }
  );

  // Observe cards for animation
  document.querySelectorAll(".card").forEach((card) => {
    observer.observe(card);
  });
}

function animateSectionElements(section) {
  const elements = section.querySelectorAll(".animate__animated");
  elements.forEach((el, index) => {
    setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, index * 100);
  });
}

// Dark Mode
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

// Product Loading
function loadProducts() {
  const productsGrid = document.getElementById("productsGrid");
  const usersData = JSON.parse(localStorage.getItem("millUsers"));
  const postedProducts = usersData.products.filter((p) => p.posted);

  productsGrid.innerHTML = postedProducts
    .map(
      (product) => `
        <div class="product-card animate__animated">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-category">${product.category}</p>
                <p class="product-description">${product.description}</p>
                <div class="product-details">
                    <p><strong>Origin:</strong> ${product.origin}</p>
                    <p><strong>Quality:</strong> ${product.quality}</p>
                    <p><strong>Min. Quantity:</strong> ${product.minQuantity}kg</p>
                </div>
                <div class="product-price">
                    Price: ${product.price} Birr/kg<br>
                    Milling: ${product.millingFee} Birr/kg
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary btn-block" onclick="showOrderForm(${product.id})">
                        <i class="fas fa-shopping-cart"></i> Buy Now
                    </button>
                    <button class="btn btn-outline btn-block" onclick="addToCart(${product.id})">
                        <i class="fas fa-heart"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

// Form Handlers
function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const userType = document.querySelector(
    'input[name="userType"]:checked'
  ).value;

  const usersData = JSON.parse(localStorage.getItem("millUsers"));
  let user = null;

  if (userType === "admin") {
    user = usersData.admin.find(
      (u) => u.email === email && u.password === password
    );
    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(user));
      window.location.href = "admin/admin.html";
      return;
    }
  } else if (userType === "operator") {
    user = usersData.operators.find(
      (u) => u.email === email && u.password === password
    );
    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(user));
      window.location.href = "operator/operator.html";
      return;
    }
  } else if (userType === "driver") {
    user = usersData.drivers.find(
      (u) => u.email === email && u.password === password
    );
    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(user));
      window.location.href = "driver/index.html";
      return;
    }
  } else {
    user = usersData.customers.find(
      (u) => u.email === email && u.password === password
    );
    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(user));
      window.location.href = "customer/customer.html";
      return;
    }
  }

  alert("Invalid email or password!");
}

function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const phone = document.getElementById("regPhone").value;
  const backupPhone = document.getElementById("regBackupPhone").value;
  const address = document.getElementById("regAddress").value;
  const password = document.getElementById("regPassword").value;
  const confirmPassword = document.getElementById("regConfirmPassword").value;

  // Validation
  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  if (!phone.match(/^\+251[97]\d{8}$/)) {
    alert("Please enter a valid Ethiopian phone number (+2519/7XXXXXXXX)");
    return;
  }

  const usersData = JSON.parse(localStorage.getItem("millUsers"));

  // Check if user already exists
  if (usersData.customers.some((u) => u.email === email)) {
    alert("User with this email already exists!");
    return;
  }

  // Create new customer
  const newCustomer = {
    id: Date.now(),
    name,
    email,
    phone,
    backupPhone,
    address,
    password,
    role: "customer",
    registeredDate: new Date().toISOString(),
    orders: [],
    cart: [],
  };

  usersData.customers.push(newCustomer);
  localStorage.setItem("millUsers", JSON.stringify(usersData));

  alert("Registration successful! You can now login.");
  hideModal("registerModal");
  showModal("loginModal");
}

function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById("forgotEmail").value;

  // In a real application, this would send a request to the admin
  alert(
    "Password reset request has been sent to the admin. You will be contacted shortly."
  );
  hideModal("forgotModal");
}

function handleContact(e) {
  e.preventDefault();

  const name = document.getElementById("contactName").value;
  const email = document.getElementById("contactEmail").value;
  const message = document.getElementById("contactMessage").value;

  // Store contact message
  const usersData = JSON.parse(localStorage.getItem("millUsers"));
  usersData.messages.push({
    id: Date.now(),
    name,
    email,
    message,
    timestamp: new Date().toISOString(),
    read: false,
  });

  localStorage.setItem("millUsers", JSON.stringify(usersData));

  alert("Thank you for your message! We will get back to you soon.");
  document.getElementById("contactForm").reset();
}

// Product Functions (to be used in product cards)
function showOrderForm(productId) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) {
    alert("Please login to place an order!");
    showModal("loginModal");
    return;
  }

  // Redirect to customer page with order form
  localStorage.setItem("orderProductId", productId);
  window.location.href = "customer/customer.html?order=true";
}

function addToCart(productId) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) {
    alert("Please login to add items to cart!");
    showModal("loginModal");
    return;
  }

  const usersData = JSON.parse(localStorage.getItem("millUsers"));
  const userIndex = usersData.customers.findIndex(
    (u) => u.id === currentUser.id
  );

  if (userIndex !== -1) {
    const product = usersData.products.find((p) => p.id === productId);
    if (product) {
      usersData.customers[userIndex].cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        millingFee: product.millingFee,
        quantity: 1,
        addedDate: new Date().toISOString(),
      });

      localStorage.setItem("millUsers", JSON.stringify(usersData));
      localStorage.setItem(
        "currentUser",
        JSON.stringify(usersData.customers[userIndex])
      );

      alert("Product added to cart!");
    }
  }
}
