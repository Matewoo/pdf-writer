document.addEventListener('DOMContentLoaded', function() {
    // Admin-Status aus localStorage abrufen
    const isAdmin = localStorage.getItem('userRole') === 'admin';
    const userName = localStorage.getItem('userName') || 'Benutzer';
    
    // Header-Bereich mit Benutzerinfos und Logout-Button hinzufügen
    const header = document.createElement('div');
    header.className = 'user-header';
    header.innerHTML = `
        <div class="user-info">
            Angemeldet als: <span class="user-name">${userName}</span>
            ${isAdmin ? '<span class="admin-badge">Administrator</span>' : ''}
        </div>
        <div class="header-buttons">
            ${isAdmin ? '<button onclick="window.location.href=\'/admin/settings\'" class="admin-button">Admin-Bereich</button>' : ''}
            <button onclick="window.location.href=\'/logout\'" class="logout-button">Abmelden</button>
        </div>
    `;
    
    // Header vor dem Container einfügen
    const container = document.querySelector('.container');
    if (container) {
        container.parentNode.insertBefore(header, container);
    }
    
    // Admin-spezifische Elemente anzeigen/verbergen
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(element => {
        element.style.display = isAdmin ? 'block' : 'none';
    });
});