---
layout: base.njk
title: Logga in
eleventyExcludeFromCollections: true
---

# Logga in

<form id="loginForm">
  <label for="password">Lösenord:</label>
  <input type="password" id="password" name="password" required>
  <button type="submit" class="btn btn-primary">Logga in</button>
  <div id="errorMessage" class="error-message" style="display: none;"></div>
  <div id="loadingMessage" class="loading-message" style="display: none;">
    Autentiserar...
  </div>
</form>

<script src="../scripts/main.js"></script>
<script>
  // Initialize login form
  document.addEventListener('DOMContentLoaded', function() {
    initLoginForm();
  });
</script>
