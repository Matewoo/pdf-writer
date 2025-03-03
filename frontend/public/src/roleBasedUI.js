document.addEventListener('DOMContentLoaded', function() {
    // Admin-Status aus localStorage abrufen
    const isAdmin = localStorage.getItem('userRole') === 'admin';
    const userName = localStorage.getItem('userName') || 'Benutzer';
    
    // Erstelle einen minimalistischen Header mit Dropdown
    const userMenu = document.createElement('div');
    userMenu.className = 'user-menu';
    userMenu.innerHTML = `
        <div class="user-dropdown">
            <span class="user-name-display">${userName} ▼</span>
            <div class="dropdown-content">
                ${isAdmin ? '<a href="/admin/settings">Admin-Bereich</a>' : ''}
                <a href="/logout">Abmelden</a>
            </div>
        </div>
    `;
    
    // Füge CSS für das Dropdown-Menü hinzu
    const style = document.createElement('style');
    style.textContent = `
        .user-menu {
            position: fixed;
            top: 10px;
            right: 20px;
            z-index: 1000;
        }
        
        .user-dropdown {
            position: relative;
            display: inline-block;
        }
        
        .user-name-display {
            color: white;
            font-weight: bold;
            cursor: pointer;
            padding: 5px 10px;
            border-radius: 4px;
            background-color: rgba(168, 20, 17, 0.8);
        }
        
        .dropdown-content {
            display: none;
            position: absolute;
            right: 0;
            background-color: white;
            min-width: 160px;
            box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
            z-index: 1;
            border-radius: 4px;
            margin-top: 5px;
        }
        
        .dropdown-content a {
            color: black;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            border-bottom: 1px solid #f1f1f1;
        }
        
        .dropdown-content a:last-child {
            border-bottom: none;
        }
        
        .dropdown-content a:hover {
            background-color: #f1f1f1;
        }
        
        .user-dropdown:hover .dropdown-content {
            display: block;
        }
    `;
    document.head.appendChild(style);
    
    // Füge das Menü zum Body hinzu
    document.body.appendChild(userMenu);
    
    // Admin-spezifische Elemente anzeigen/verbergen
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(element => {
        element.style.display = isAdmin ? 'block' : 'none';
    });
});