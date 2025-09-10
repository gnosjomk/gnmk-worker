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

async function getMemberFiles() {
    return await apiRequest('/members/files');
}
async function getPublicFiles() {
    return await apiRequest('/public/files');
}

async function downloadFile(filename, members) {
    try {
        const response = await fetch(`${API_BASE}/${members ? "members": "public"}/files/${encodeURIComponent(filename)}`);
        
        if (!response.ok) {
            throw new Error('Failed to download file');
        }
        
        // Create a blob from the response
        const blob = await response.blob();
        
        // Create a temporary URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary anchor element and trigger download
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Download failed:', error);
        showError('Failed to download file: ' + error.message);
    }
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

// Members area functionality
function initMembersArea() {
    // Check authentication first
    checkAuthentication();
    
    // Set up logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Load files
    loadFiles(true);
}

// Members area functionality
function initPublicFilesArea() {
    // Load files
    loadFiles(false);
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

async function loadFiles(members) {
    const filesSection = document.getElementById('filesSection');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const noFilesMessage = document.getElementById('noFilesMessage');
    const filesList = document.getElementById('filesList');
    
    try {
        hideError();
        showElement('loadingMessage');

        let files;
        if (members) {
            files = await getMemberFiles();
        } else {
            files = await getPublicFiles();
        }
        
        hideElement('loadingMessage');
        
        if (!files || files.length === 0) {
            showElement('noFilesMessage');
            return;
        }
        
        // Clear existing files
        filesList.innerHTML = '';
        
        // Create file items
        files.forEach(file => {
            const fileItem = createFileItem(file, members);
            filesList.appendChild(fileItem);
        });
        
        showElement('filesSection');
        
    } catch (error) {
        hideElement('loadingMessage');
        showError('Failed to load files: ' + error.message);
    }
}

function createFileItem(file, members) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const fileExtension = getFileExtension(file.name);
    
    item.innerHTML = `
        <div class="file-info">
            <div class="file-icon">
                ${fileExtension.toUpperCase()}
            </div>
            <div class="file-details">
                <h4>${escapeHtml(file.name)}</h4>
                <p>${formatFileSize(file.size)} • Modified ${formatDate(file.lastModified)}</p>
            </div>
        </div>
        <div class="file-actions">
            <button class="btn btn-primary btn-small" onclick="downloadFile('${escapeHtml(file.name)}', ${members})">
                Download
            </button>
        </div>
    `;
    
    return item;
}

function getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : 'FILE';
}

function formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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