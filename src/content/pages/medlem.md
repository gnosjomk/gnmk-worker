---
layout: base.njk
title: Medlemssida
order: 5
---

# Medlemssida

<div class="member-layout">

<details class="member-calendar" open>
    <summary><h2>Kalender</h2></summary>
    <div class="calendar">
        <iframe src="https://calendar.google.com/calendar/embed?height=800&wkst=2&ctz=Europe%2FStockholm&showPrint=0&src=Ym9AZ25vc2pvbWsuc2U&color=%23d81b60" style="border:solid 1px #777" id="calendar" frameborder="0" scrolling="no"></iframe>
    </div>
</details>

<details class="member-files" open>
    <summary><h2>Filer</h2></summary>

    <div id="loadingMessage" class="loading-message">
        Laddar filer...
    </div>

    <div id="errorMessage" class="error-message" style="display: none;"></div>

    <div id="filesSection" style="display: none;">
        <table class="file-table">
            <thead>
                <tr>
                    <th>Datum</th>
                    <th>Titel</th>
                    <th>Beskrivning</th>
                </tr>
            </thead>
            <tbody id="filesList">
                <!-- Files will be loaded here dynamically -->
            </tbody>
        </table>
    </div>

    <div id="noFilesMessage" class="no-files-message" style="display: none;">
        <p>Det finns inga filer tillgängliga.</p>
    </div>

</details>

</div>

<button id="logoutBtn" class="btn btn-secondary">Logga ut</button>

<script src="../scripts/member-file-list.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        initMemberFiles();
    });
</script>
