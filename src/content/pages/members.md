---
layout: base.njk
title: Medlemssida
---

# Medlemssida

## Filer

<div id="loadingMessage" class="loading-message">
    Laddar filer...
</div>

<div id="errorMessage" class="error-message" style="display: none;"></div>

<div id="filesSection" style="display: none;">
    <div id="filesList" class="files-list">
        <!-- Files will be loaded here dynamically -->
    </div>
</div>

<div id="noFilesMessage" class="no-files-message" style="display: none;">
    <p>Det finns inga filer tillgängliga.</p>
</div>

<button id="logoutBtn" class="btn btn-secondary">Logga ut</button>

<script src="../scripts/main.js"></script>
<script>
    // Initialize members area
    document.addEventListener('DOMContentLoaded', function() {
        initMembersArea();
    });
</script>
