const SERMONS_JSON_URL = "/api/file/public/predikningar/sermons.json";
const AUDIO_BASE_URL = "/api/file/public/predikningar/ljudfiler/";
const UTSIKT_JSON_URL = "/api/file/public/utsikt/utsikt.json";
const PDF_BASE_URL = "/api/file/public/utsikt/pdfer/";

function initSermons() {
    loadSermons();
}

async function loadSermons() {
    const filesSection = document.getElementById('filesSection');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const noFilesMessage = document.getElementById('noFilesMessage');
    const filesList = document.getElementById('filesList');

    try {
        hideElement('errorMessage');
        showElement('loadingMessage');

        const response = await fetch(SERMONS_JSON_URL);

        if (!response.ok) {
            throw new Error("Failed to fetch sermons.json");
        }

        let sermons = await response.json();

        // Sort newest first
        sermons.sort((a, b) => new Date(b.date) - new Date(a.date));

        hideElement('loadingMessage');

        if (!sermons || sermons.length === 0) {
            showElement('noFilesMessage');
            return;
        }

        filesList.innerHTML = "";

        sermons.forEach(sermon => {
            const item = createSermonItem(sermon);
            filesList.appendChild(item);
        });

        showElement('filesSection');

    } catch (error) {
        hideElement('loadingMessage');
        showError("Kunde inte ladda predikningar: " + error.message);
    }
}

function createSermonItem(sermon) {

    const item = document.createElement("div");
    item.className = "file-item";

    const title = sermon.title ? sermon.title : "Predikan";
    const speaker = sermon.speaker ? sermon.speaker : "";
    const date = formatDateISO(sermon.date);

    const encodedFile = encodeURIComponent(sermon.file);
    const audioUrl = AUDIO_BASE_URL + encodedFile;

    item.innerHTML = `
        <a class="undecorated-link" href="${audioUrl}" download>
            <span><b>${escapeHtml(title)}</b> • ${escapeHtml(date.substring(0, 10))} • ${escapeHtml(speaker)}</span>
        </a>
    `;

    return item;
}


function initUtsikt() {
    loadUtsikt();
}

async function loadUtsikt() {
    const filesSection = document.getElementById('filesSection');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const noFilesMessage = document.getElementById('noFilesMessage');
    const filesList = document.getElementById('filesList');

    try {
        hideElement('errorMessage');
        showElement('loadingMessage');

        const response = await fetch(UTSIKT_JSON_URL);

        if (!response.ok) {
            throw new Error("Failed to fetch utsikt.json");
        }

        let utsikts = await response.json();

        // Sort newest first
        utsikts.sort((a, b) => new Date(b.date) - new Date(a.date));

        hideElement('loadingMessage');

        if (!utsikts || utsikts.length === 0) {
            showElement('noFilesMessage');
            return;
        }

        filesList.innerHTML = "";

        utsikts.forEach(utsikt => {
            const item = createUtsiktItem(utsikt);
            filesList.appendChild(item);
        });

        showElement('filesSection');

    } catch (error) {
        hideElement('loadingMessage');
        showError("Kunde inte ladda Utsikt: " + error.message);
    }
}

function createUtsiktItem(utsikt) {

    const item = document.createElement("div");
    item.className = "file-item";

    const title = utsikt.title ? utsikt.title : "";
    const date = formatDateISO(utsikt.date);

    const encodedFile = encodeURIComponent(utsikt.file);
    const pdfUrl = PDF_BASE_URL + encodedFile;

    item.innerHTML = `
        <a class="undecorated-link" href="${pdfUrl}" download>
            <span>${escapeHtml(date.substring(0, 10))} • <b>${escapeHtml(title)}</b></span>
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
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
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