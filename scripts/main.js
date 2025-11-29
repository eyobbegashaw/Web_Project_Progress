// Main JavaScript for common functionality across all pages

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });
}

// Language Toggle
const languageToggle = document.getElementById('language-toggle');
if (languageToggle) {
    languageToggle.addEventListener('click', () => {
        const currentLang = languageToggle.textContent.includes('EN') ? 'EN' : 'AM';
        if (currentLang === 'EN') {
            languageToggle.innerHTML = '<i class="fas fa-globe"></i> AM';
            // Here you would typically load Amharic translations
            switchToAmharic();
        } else {
            languageToggle.innerHTML = '<i class="fas fa-globe"></i> EN';
            // Here you would typically load English translations
            switchToEnglish();
        }
    });
}

// Modal functionality
function setupModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close-modal');
    
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modals.forEach(modal => modal.style.display = 'none');
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Sample data for products
const productsData = [
    {
        id: 1,
        name: "Teff",
        category: "grain",
        subcategory: "teff",
        price: 180,
        millingPrice: 10,
        stock: 1500,
        image: "",
        description: "High-quality teff grain, perfect for making injera.",
        minPurchase: 1
    },
    {
        id: 2,
        name: "Barley",
        category: "grain", 
        subcategory: "barley",
        price: 120,
        millingPrice: 10,
        stock: 800,
        image: "",
        description: "Nutritious barley grain for various culinary uses.",
        minPurchase: 1
    },
    {
        id: 3,
        name: "Wheat",
        category: "grain",
        subcategory: "wheat", 
        price: 150,
        millingPrice: 10,
        stock: 1200,
        image: "",
        description: "Premium wheat grain for baking and cooking.",
        minPurchase: 1
    },
    {
        id: 4,
        name: "Beans",
        category: "legume",
        subcategory: "beans",
        price: 100,
        millingPrice: 10,
        stock: 600,
        image: "",
        description: "Fresh beans rich in protein and fiber.",
        minPurchase: 1
    },
    {
        id: 5,
        name: "Lentils",
        category: "legume",
        subcategory: "lentils",
        price: 90,
        millingPrice: 10,
        stock: 450,
        image: "",
        description: "High-quality lentils for nutritious meals.",
        minPurchase: 1
    },
    {
        id: 6,
        name: "Pepper",
        category: "spice", 
        subcategory: "pepper",
        price: 200,
        millingPrice: 15,
        stock: 300,
        image: "",
        description: "Aromatic pepper for flavoring your dishes.",
        minPurchase: 0.5
    }
];

// Language switching functions (placeholder)
function switchToAmharic() {
    // This would contain Amharic translations
    console.log('Switching to Amharic');
}

function switchToEnglish() {
    // This would contain English translations  
    console.log('Switching to English');
}

// Initialize theme from localStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = document.querySelector('#theme-toggle i');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
    
    setupModals();
});