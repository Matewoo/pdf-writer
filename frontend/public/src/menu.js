let currentWeek = new Date();
currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Set to Monday
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

function updateWeekDisplay() {
    const startOfWeek = new Date(currentWeek);
    const endOfWeek = new Date(currentWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 4); // Friday

    const weekNumber = getWeekNumber(startOfWeek);

    const startDate = startOfWeek.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
    const endDate = endOfWeek.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });

    document.getElementById('currentWeek').textContent =
        `KW${weekNumber} ${startDate} - ${endDate}`;
}

function updateDayDisplay() {
    const currentDate = new Date(currentWeek);
    currentDate.setDate(currentDate.getDate() + currentDayIndex);
    const dayName = currentDate.toLocaleDateString('de-DE', { weekday: 'long' });
    const dateStr = currentDate.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
    document.getElementById('currentDay').textContent = `${dayName} ${dateStr}`;

    // Show the correct form for the current day
    document.querySelectorAll('.day-form').forEach((form, index) => {
        form.classList.toggle('active', index === currentDayIndex);
    });
}

function previousDay() {
    if (currentDayIndex > 0) {
        currentDayIndex--;
        updateDayDisplay();
    }
}

function nextDay() {
    if (currentDayIndex < 4) {
        currentDayIndex++;
        updateDayDisplay();
    }
}

function previousWeek() {
    currentWeek.setDate(currentWeek.getDate() - 7);
    currentDayIndex = 0; // Reset to Monday
    updateWeekDisplay();
    updateDayDisplay();
    const weekNumber = getWeekNumber(currentWeek);
    const year = currentWeek.getFullYear();
    const week = `KW${weekNumber} ${year}`;
    loadWeekData(week);
}

function nextWeek() {
    currentWeek.setDate(currentWeek.getDate() + 7);
    currentDayIndex = 0; // Reset to Monday
    updateWeekDisplay();
    updateDayDisplay();
    const weekNumber = getWeekNumber(currentWeek);
    const year = currentWeek.getFullYear();
    const week = `KW${weekNumber} ${year}`;
    loadWeekData(week);
}

function saveWeek() {
    const weekNumber = getWeekNumber(currentWeek);
    const year = currentWeek.getFullYear();
    const week = `KW${weekNumber} ${year}`;
    const entries = [];

    for (let i = 0; i < 5; i++) {
        const currentDate = new Date(currentWeek);
        currentDate.setDate(currentDate.getDate() + i);

        const entry = {
            date: currentDate.toISOString().split('T')[0], // Reines Datum
            dayIndex: i,
            dateTitle: document.querySelector(`input[name="dateTitle${i}"]`).value,
            meatMain: document.querySelector(`input[name="meatMain${i}"]`).value,
            meatSide: document.querySelector(`input[name="meatSide${i}"]`).value,
            halal: document.querySelector(`select[name="halal${i}"]`).value === 'halal',
            meatPrice: document.querySelector(`input[name="meatPrice${i}"]`).value,
            veggiMain: document.querySelector(`input[name="veggiMain${i}"]`).value,
            veggiSide: document.querySelector(`input[name="veggiSide${i}"]`).value,
            veggiPrice: document.querySelector(`input[name="veggiPrice${i}"]`).value
        };

        entries.push(entry);
    }

    fetch('/save-week', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ week, entries })
    })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
        })
        .catch(error => {
            console.error('Error saving week:', error);
            alert('Fehler beim Speichern der Woche');
        });
}

function loadWeekData(week) {
    fetch(`/load-week?week=${encodeURIComponent(week)}`)
        .then(response => response.json())
        .then(data => {
            // Clear all input fields
            for (let i = 0; i < 5; i++) {
                document.querySelector(`input[name="dateTitle${i}"]`).value = '';
                document.querySelector(`input[name="meatMain${i}"]`).value = '';
                document.querySelector(`input[name="meatSide${i}"]`).value = '';
                document.querySelector(`select[name="halal${i}"]`).value = '';
                document.querySelector(`input[name="meatPrice${i}"]`).value = '';
                document.querySelector(`input[name="veggiMain${i}"]`).value = '';
                document.querySelector(`input[name="veggiSide${i}"]`).value = '';
                document.querySelector(`input[name="veggiPrice${i}"]`).value = '';
            }

            // Fill input fields with loaded data
            const loadedDays = new Set(data.map(entry => entry.day_index));
            data.forEach(entry => {
                const dayIndex = entry.day_index;
                const dateTitleInput = document.querySelector(`input[name="dateTitle${dayIndex}"]`);
                const meatPriceInput = document.querySelector(`input[name="meatPrice${dayIndex}"]`);
                const veggiPriceInput = document.querySelector(`input[name="veggiPrice${dayIndex}"]`);
                const halalSelect = document.querySelector(`select[name="halal${dayIndex}"]`);

                dateTitleInput.value = entry.date_title;
                document.querySelector(`input[name="meatMain${dayIndex}"]`).value = entry.meat_main;
                document.querySelector(`input[name="meatSide${dayIndex}"]`).value = entry.meat_side;
                halalSelect.value = entry.halal ? 'halal' : '';
                meatPriceInput.value = entry.meat_price;
                document.querySelector(`input[name="veggiMain${dayIndex}"]`).value = entry.veggi_main;
                document.querySelector(`input[name="veggiSide${dayIndex}"]`).value = entry.veggi_side;
                veggiPriceInput.value = entry.veggi_price;

                // Automatically fill dateTitle if empty
                if (!dateTitleInput.value) {
                    const currentDate = new Date(currentWeek);
                    currentDate.setDate(currentDate.getDate() + dayIndex);
                    const dayName = currentDate.toLocaleDateString('de-DE', { weekday: 'long' }).toUpperCase();
                    const dateStr = currentDate.toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: 'long'
                    }).toUpperCase();
                    dateTitleInput.value = `${dayName}, ${dateStr}`;
                }

                // Automatically fill meatPrice if empty
                if (!meatPriceInput.value) {
                    meatPriceInput.value = (dayIndex === 4) ? "9,50 € / 6,80 € - Business Lunch 7,50 € / 5,10 €" : "9,00 € / 6,30 € - Business Lunch 7,00 € / 4,90 €";
                }

                // Automatically fill veggiPrice if empty
                if (!veggiPriceInput.value) {
                    veggiPriceInput.value = "8,50 € / 5,95 € - Business Lunch 6,50 € / 4,55 €";
                }
            });

            // Automatically fill dateTitle, meatPrice, and veggiPrice if not in DB
            for (let i = 0; i < 5; i++) {
                if (!loadedDays.has(i)) {
                    const dateTitleInput = document.querySelector(`input[name="dateTitle${i}"]`);
                    const meatPriceInput = document.querySelector(`input[name="meatPrice${i}"]`);
                    const veggiPriceInput = document.querySelector(`input[name="veggiPrice${i}"]`);
                    const halalSelect = document.querySelector(`select[name="halal${i}"]`);

                    if (!dateTitleInput.value) {
                        const currentDate = new Date(currentWeek);
                        currentDate.setDate(currentDate.getDate() + i);
                        const dayName = currentDate.toLocaleDateString('de-DE', { weekday: 'long' }).toUpperCase();
                        const dateStr = currentDate.toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: 'long'
                        }).toUpperCase();
                        dateTitleInput.value = `${dayName}, ${dateStr}`;
                    }

                    if (!meatPriceInput.value) {
                        meatPriceInput.value = (i === 4) ? "9,50 € / 6,80 € - Business Lunch 7,50 € / 5,10 €" : "9,00 € / 6,30 € - Business Lunch 7,00 € / 4,90 €";
                    }

                    if (!veggiPriceInput.value) {
                        veggiPriceInput.value = "8,50 € / 5,95 € - Business Lunch 6,50 € / 4,55 €";
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error loading week:', error);
            alert('Fehler beim Laden der Woche!\n\nBitte kontaktieren Sie Ihren zuständigen Systemadministrator.');
        });
}

function generatePDF(type) {
    const weekNumber = getWeekNumber(currentWeek);
    const year = currentWeek.getFullYear();
    const val = `KW${weekNumber}-${year}`;

    fetch('/generate-pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ val, type })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('PDF erfolgreich generiert');
            } else {
                const errorMessage = data.error || 'Unbekannter Fehler';
                alert(`Fehler beim Generieren der PDF:\n\n${errorMessage}\n\nBitte kontaktieren Sie Ihren zuständigen Systemadministrator.`);
            }
        })
        .catch(error => {
            console.error('Error generating PDF:', error);
            alert('Fehler beim Generieren der PDF');
        });
}


// Initialize the display when page loads
updateWeekDisplay();
updateDayDisplay();
const weekNumber = getWeekNumber(currentWeek);
const year = currentWeek.getFullYear();
const week = `KW${weekNumber} ${year}`;
loadWeekData(week);