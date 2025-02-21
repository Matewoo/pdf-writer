function loadWeek(week) {
    fetch(`/load-week?week=${encodeURIComponent(week)}`)
        .then(response => response.json())
        .then(data => {
            const sortedData = data.sort((a, b) => a.day_index - b.day_index);

            const container = document.querySelector('body');
            container.innerHTML = `
            <h1>Freuen Sie sich auf:</h1>
            ${sortedData.map(item => `
                <p class="category">— ${item.date_title} ${item.halal ? '<span class="halal">„HALAL"</span>' : ''}</p>
                <p class="main">~ ${item.meat_main}</p>
                <p class="side">${item.meat_side}</p>
                
                <p class="main">~ ${item.veggi_main}</p>
                <p class="side">${item.veggi_side}</p>
                <hr>
            `).join('')}
        `;
        })
        .catch(error => {
            console.error('Error loading week:', error);
        });
}

// Get current week number and year
function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7);
    return `KW${week} ${now.getFullYear()}`;
}

// Load current week's menu on page load
loadWeek(getCurrentWeek());

// Reload page every 15 seconds
setInterval(() => {
    window.location.reload();
}, 15000);