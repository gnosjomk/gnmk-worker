const SERMONS_JSON_URL = "/api/file/public/predikningar/sermons.json";
const AUDIO_BASE_URL = "/api/file/public/predikningar/ljudfiler/";

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
    const date = formatDate(sermon.date);

    const encodedFile = encodeURIComponent(sermon.file);
    const audioUrl = AUDIO_BASE_URL + encodedFile;

    item.innerHTML = `
        <a class="btn btn-primary btn-small" href="${audioUrl}" download>
            <p><b>${escapeHtml(title)}</b> • ${escapeHtml(date)} • ${escapeHtml(speaker)}</p>
        </a>
    `;

    return item;
}

function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleDateString("sv-SE", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
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