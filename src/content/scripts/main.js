// Configuration
const API_BASE = '/api';

// Utility functions
function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.style.display = 'block';
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.style.display = 'none';
}

function showError(message, elementId = 'errorMessage') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function hideError(elementId = 'errorMessage') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function setLoading(isLoading, buttonId = null) {
    const loadingElement = document.getElementById('loadingMessage');
    const button = buttonId ? document.getElementById(buttonId) : null;
    
    if (loadingElement) {
        loadingElement.style.display = isLoading ? 'block' : 'none';
    }
    
    if (button) {
        button.disabled = isLoading;
        button.textContent = isLoading ? 'Please wait...' : 'Login';
    }
}

// API functions
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'An error occurred');
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

async function login(password) {
    return await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password })
    });
}

async function logout() {
    return await apiRequest('/auth/logout', {
        method: 'POST'
    });
}

async function checkAuth() {
    return await apiRequest('/auth/check');
}

// Login form functionality
function initLoginForm() {
    const form = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    
    if (!form) return;
    
    // Check if already authenticated
    checkAuthAndRedirect();
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = passwordInput.value.trim();
        if (!password) {
            showError('Please enter a password');
            return;
        }
        
        hideError();
        setLoading(true, 'submitBtn');
        
        try {
            await login(password);
            
            // Redirect to members area
            window.location.href = '/medlem';
        } catch (error) {
            showError(error.message);
            passwordInput.value = '';
            passwordInput.focus();
        } finally {
            setLoading(false, 'submitBtn');
        }
    });
}


async function checkAuthentication() {
    try {
        await checkAuth();
    } catch (error) {
        // Not authenticated, redirect to login
        window.location.href = '/logga-in';
    }
}

async function checkAuthAndRedirect() {
    try {
        await checkAuth();
        // Already authenticated, redirect to members area
        window.location.href = '/medlem';
    } catch (error) {
        // Not authenticated, stay on current page
    }
}

async function handleLogout() {
    try {
        await logout();
        window.location.href = '/';
    } catch (error) {
        console.error('Logout failed:', error);
        // Even if logout fails on server, redirect to home
        window.location.href = '/';
    }
}



// Auto-check authentication on protected pages
document.addEventListener('DOMContentLoaded', function() {    
    const currentPath = window.location.pathname;
    
    // If on members page, ensure user is authenticated
    if (currentPath === '/medlem') {
        checkAuthentication();
    }
    
    // If on login page, redirect if already authenticated
    if (currentPath === '/logga-in') {
        checkAuthAndRedirect();
    }
});