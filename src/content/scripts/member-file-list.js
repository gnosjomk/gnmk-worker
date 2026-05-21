const MEMBER_FILES_JSON_URL = "/api/file/members/member-files.json";
const MEMBER_FILES_BASE_URL = "/api/file/members/member-files/";

function initMemberFiles() {
    checkMemberAuth();
    setupLogout();
    loadMemberFiles();
}

async function checkMemberAuth() {
    try {
        const response = await fetch("/api/auth/check");
        if (!response.ok) {
            window.location.href = "/logga-in";
        }
    } catch (error) {
        window.location.href = "/logga-in";
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async function () {
            try {
                await fetch("/api/auth/logout", { method: "POST" });
            } catch (e) {
                // Redirect regardless
            }
            window.location.href = "/";
        });
    }
}

async function loadMemberFiles() {
    try {
        hideElement("errorMessage");
        showElement("loadingMessage");

        const response = await fetch(MEMBER_FILES_JSON_URL);

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = "/logga-in";
                return;
            }
            throw new Error("Kunde inte hämta fillistan");
        }

        let files = await response.json();

        // Sort newest first
        files.sort((a, b) => new Date(b.date) - new Date(a.date));

        hideElement("loadingMessage");

        if (!files || files.length === 0) {
            showElement("noFilesMessage");
            return;
        }

        const filesList = document.getElementById("filesList");
        filesList.innerHTML = "";

        files.forEach(file => {
            const item = createMemberFileItem(file);
            filesList.appendChild(item);
        });

        showElement("filesSection");
    } catch (error) {
        hideElement("loadingMessage");
        showError("Kunde inte ladda filer: " + error.message);
    }
}

function createMemberFileItem(file) {
    const item = document.createElement("div");
    item.className = "file-item";

    const title = file.title || file.file;
    const date = formatDateISO(file.date);
    const description = file.description ? ` • ${escapeHtml(file.description)}` : "";

    const encodedFile = encodeURIComponent(file.file);
    const fileUrl = MEMBER_FILES_BASE_URL + encodedFile;

    item.innerHTML = `
        <a class="undecorated-link" href="${fileUrl}" download>
            <span>${escapeHtml(date)} • <b>${escapeHtml(title)}</b>${description}</span>
        </a>
    `;

    return item;
}

function formatDateISO(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
}

function showElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "block";
}

function hideElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
}

function showError(message) {
    const el = document.getElementById("errorMessage");
    if (!el) return;
    el.textContent = message;
    el.style.display = "block";
}