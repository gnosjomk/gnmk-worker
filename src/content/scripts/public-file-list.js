async function initSermons() {
    const filesSection = document.getElementById('filesSection');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const noFilesMessage = document.getElementById('noFilesMessage');
    const filesList = document.getElementById('filesList');

    let sermonList = getSermonList();

    sermonList.then{
        sermons => sermons.forEach(sermon => {
            const sermonItem = createSermonItem(sermon);
            filesList.appendChild(sermonItem);
        });
    };
}

async function getSermonList() {
    const response = await fetch(`${API_BASE}/file/public/predikningar/sermons.json}`);
    let sermonList = response.json();
    return sermonList;
}

function createSermonItem(file, members) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const fileExtension = getFileExtension(file.name);
    
    item.innerHTML = `
        <div class="file-info">
            <p>${sermon.file}</p>
        </div>
    `;
    
    return item;
}