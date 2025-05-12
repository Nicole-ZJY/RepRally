// Login and Registration Page Script

document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const success = urlParams.get('success');
    const tab = urlParams.get('tab');
    
    // Handle error messages
    if (error === 'invalid') {
        showError('Invalid username or password. Please try again.');
    } else if (error === 'session') {
        showError('Your session has expired. Please login again.');
    } else if (error === 'exists') {
        showError('Username already exists. Please choose another one.');
        switchToTab('register');
    } else if (error === 'registration') {
        showError('Registration failed. Please try again later.');
        switchToTab('register');
    }
    
    // Handle success messages
    if (success === 'registered') {
        showSuccess('Registration successful! You can now login.');
        switchToTab('login');
    }
    
    // Switch to requested tab if specified in URL
    if (tab === 'register') {
        switchToTab('register');
    }
    
    // Tab switching
    loginTab.addEventListener('click', function() {
        switchToTab('login');
    });
    
    registerTab.addEventListener('click', function() {
        switchToTab('register');
    });
    
    // Login form submission
    loginForm.addEventListener('submit', function(e) {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();
        
        if (!username || !password) {
            e.preventDefault();
            showError('Please enter both username and password.');
        }
    });
    
    // Registration form submission
    registerForm.addEventListener('submit', function(e) {
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value.trim();
        const confirmPassword = document.getElementById('confirm-password').value.trim();
        
        // Validate inputs
        if (!username || !email || !password || !confirmPassword) {
            e.preventDefault();
            showError('Please fill in all fields.');
            return;
        }
        
        if (username.length < 4) {
            e.preventDefault();
            showError('Username must be at least 4 characters long.');
            return;
        }
        
        if (password.length < 6) {
            e.preventDefault();
            showError('Password must be at least 6 characters long.');
            return;
        }
        
        if (password !== confirmPassword) {
            e.preventDefault();
            showError('Passwords do not match.');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            e.preventDefault();
            showError('Please enter a valid email address.');
            return;
        }
    });
    
    // Function to switch between tabs
    function switchToTab(tabName) {
        if (tabName === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
            document.getElementById('login-username').focus();
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
            document.getElementById('register-username').focus();
        }
        
        // Clear any displayed messages
        hideMessages();
    }
    
    // Function to display error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        
        // Add a subtle animation effect
        errorMessage.classList.add('show');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorMessage.classList.remove('show');
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 300);
        }, 5000);
    }
    
    // Function to display success message
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        
        // Add a subtle animation effect
        successMessage.classList.add('show');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            successMessage.classList.remove('show');
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 300);
        }, 5000);
    }
    
    // Function to hide all messages
    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }
    
    // Add simple animation to login card
    const loginCard = document.querySelector('.login-card');
    loginCard.addEventListener('mousemove', function(e) {
        const rect = loginCard.getBoundingClientRect();
        const x = e.clientX - rect.left; // x position within the element
        const y = e.clientY - rect.top;  // y position within the element
        
        // Calculate rotation based on mouse position (subtle effect)
        const rotateX = (y - rect.height / 2) / 40;
        const rotateY = (rect.width / 2 - x) / 40;
        
        // Apply the transform
        loginCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    // Reset transform when mouse leaves
    loginCard.addEventListener('mouseleave', function() {
        loginCard.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
    
    // Set initial focus
    document.getElementById('login-username').focus();
});