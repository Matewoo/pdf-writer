let currentWeek = new Date();
if (currentWeek.getDay() >= 5) { // 5 = Freitag
    currentWeek.setDate(currentWeek.getDate() + 7);
}
currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1);

let currentDayIndex = 0; // 0 = Monday, 4 = Friday

function getWeekNumber(date) {
    const target = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}

function loadWeek(week) {
    fetch(`/load-week?week=${encodeURIComponent(week)}`)
        .then(response => response.json())
        .then(data => {
            // Default-Werte für leere Tage
            const defaultData = {
                date_title: 'WOCHENTAG',
                meat_main: 'Eintrag fehlt',
                meat_side: '',
                veggi_main: 'Eintrag fehlt',
                veggi_side: '',
                halal: false,
                day_index: 0
            };

            let sortedData = [];
            for (let i = 0; i < 5; i++) {
                const dayData = data.find(item => item.day_index === i);
                sortedData.push(dayData || { ...defaultData, day_index: i });
            }

            sortedData.sort((a, b) => a.day_index - b.day_index);

            const container = document.querySelector('body');
            container.innerHTML = `
                <h1>Freuen Sie sich auf:</h1>
                <div class="content">
                    <div class="ticker-wrapper">
                        <div class="ticker-content">
                            ${sortedData.map(item => `
                                <div class="menu-item">
                                    <p class="category">— ${item.date_title} ${item.halal ? '<span class="halal">„HALAL"</span>' : ''}</p>
                                    <p class="main">~ ${item.meat_main}</p>
                                    <p class="side">${item.meat_side}</p>
                                    <p class="main">~ ${item.veggi_main}</p>
                                    <p class="side">${item.veggi_side}</p>
                                    <hr>
                                </div>
                            `).join('')}
                        </div>
                        <div class="ticker-content">
                            ${sortedData.map(item => `
                                <div class="menu-item">
                                    <p class="category">— ${item.date_title} ${item.halal ? '<span class="halal">„HALAL"</span>' : ''}</p>
                                    <p class="main">~ ${item.meat_main}</p>
                                    <p class="side">${item.meat_side}</p>
                                    <p class="main">~ ${item.veggi_main}</p>
                                    <p class="side">${item.veggi_side}</p>
                                    <hr>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            startScrolling();
        })
        .catch(error => {
            console.error('Error loading week:', error);
        });
}

function startScrolling() {
    const tickerWrapper = document.querySelector('.ticker-wrapper');
    const tickerContents = document.querySelectorAll('.ticker-content');

    let currentPosition = 0;
    const contentHeight = tickerContents[0].offsetHeight;

    function scroll() {
        currentPosition -= 0.4;

        if (Math.abs(currentPosition) >= contentHeight) {
            currentPosition = 0;
        }

        tickerWrapper.style.transform = `translateY(${currentPosition}px)`;
        requestAnimationFrame(scroll);
    }

    requestAnimationFrame(scroll);
}

const weekNumber = getWeekNumber(currentWeek);
const year = currentWeek.getFullYear();
const week = `KW${weekNumber} ${year}`;
console.log(week);
loadWeek(week);