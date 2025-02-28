let currentWeek = new Date();
currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Set to Monday
let today = new Date();
let currentDayIndex = today.getDay() - 1;

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

        // Anpassen der Werte entsprechend der daily_entries Tabelle
        const dailyHalalVeggiValue = document.querySelector(`select[name="dailyHalalVeggi${i}"]`).value;
        const soupHalalVeggiValue = document.querySelector(`select[name="soupHalalVeggi${i}"]`).value;
        const entry = {
            date: currentDate.toISOString().split('T')[0],
            week: week,
            dayIndex: i,
            dateTitle: document.querySelector(`input[name="dateTitle${i}"]`).value,
            dailyMain: document.querySelector(`input[name="dailyMain${i}"]`).value,
            dailySide: document.querySelector(`input[name="dailySide${i}"]`).value,
            dailyHalal: dailyHalalVeggiValue === 'halal' ? 1 : 0,
            dailyVeggi: dailyHalalVeggiValue === 'veggi' ? 1 : 0,
            dailyPrice: document.querySelector(`input[name="dailyPrice${i}"]`).value,
            dailySoup: document.querySelector(`input[name="dailySoup${i}"]`).value,
            soupHalal: soupHalalVeggiValue === 'halal' ? 1 : 0,
            soupVeggi: soupHalalVeggiValue === 'veggi' ? 1 : 0,
            soupPrice: document.querySelector(`input[name="soupPrice${i}"]`).value
        };

        entries.push(entry);
    }

    console.log('Saving week data:', { week, entries });

    fetch('/save-week-daily', {
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
    fetch(`/load-week-daily?week=${encodeURIComponent(week)}`)
        .then(response => response.json())
        .then(data => {
            // Clear all input fields
            for (let i = 0; i < 5; i++) {
                document.querySelector(`input[name="dateTitle${i}"]`).value = '';
                document.querySelector(`input[name="dailyMain${i}"]`).value = '';
                document.querySelector(`input[name="dailySide${i}"]`).value = '';
                document.querySelector(`select[name="dailyHalalVeggi${i}"]`).value = '';
                document.querySelector(`input[name="dailyPrice${i}"]`).value = '';
                document.querySelector(`input[name="dailySoup${i}"]`).value = '';
                document.querySelector(`select[name="soupHalalVeggi${i}"]`).value = '';
                document.querySelector(`input[name="soupPrice${i}"]`).value = '';
            }

            // Fill input fields with loaded data
            const loadedDays = new Set(data.map(entry => entry.day_index));
            data.forEach(entry => {
                const dayIndex = entry.day_index;
                const dateTitleInput = document.querySelector(`input[name="dateTitle${dayIndex}"]`);
                const dailyPriceInput = document.querySelector(`input[name="dailyPrice${dayIndex}"]`);
                const dailyHalalVeggiSelect = document.querySelector(`select[name="dailyHalalVeggi${dayIndex}"]`);
                const soupPriceInput = document.querySelector(`input[name="soupPrice${dayIndex}"]`);
                const soupHalalVeggiSelect = document.querySelector(`select[name="soupHalalVeggi${dayIndex}"]`);

                dateTitleInput.value = entry.date_title;
                document.querySelector(`input[name="dailyMain${dayIndex}"]`).value = entry.daily_main;
                document.querySelector(`input[name="dailySide${dayIndex}"]`).value = entry.daily_side;
                dailyPriceInput.value = entry.daily_price;
                document.querySelector(`input[name="dailySoup${dayIndex}"]`).value = entry.daily_soup;
                soupPriceInput.value = entry.soup_price;
                if (entry.daily_halal) {
                    dailyHalalVeggiSelect.value = 'halal';
                } else if (entry.daily_veggi) {
                    dailyHalalVeggiSelect.value = 'veggi';
                } else {
                    dailyHalalVeggiSelect.value = '';
                }
                if (entry.soup_halal) {
                    soupHalalVeggiSelect.value = 'halal';
                } else if (entry.soup_veggi) {
                    soupHalalVeggiSelect.value = 'veggi';
                } else {
                    soupHalalVeggiSelect.value = '';
                }

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

                // Automatically fill dailyPrice if empty
                if (!dailyPriceInput.value) {
                    dailyPriceInput.value = "6,00 € / 4,20 €";
                }
                if (!soupPriceInput.value) {
                    soupPriceInput.value = "Großer Teller 4,00 € / Kleiner Teller 2,00 €";
                }
            });

            // Automatically fill dateTitle, dailyPrice if not in DB
            for (let i = 0; i < 5; i++) {
                if (!loadedDays.has(i)) {
                    const dateTitleInput = document.querySelector(`input[name="dateTitle${i}"]`);
                    const dailyPriceInput = document.querySelector(`input[name="dailyPrice${i}"]`);
                    const soupPriceInput = document.querySelector(`input[name="soupPrice${i}"]`);

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

                    if (!dailyPriceInput.value) {
                        dailyPriceInput.value = "6,00 € / 4,20 €";
                    }
                    if (!soupPriceInput.value) {
                        soupPriceInput.value = "Großer Teller 4,00 € / Kleiner Teller 2,00 €";
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error loading week:', error);
            alert('Fehler beim Laden der Woche.\n\nBitte kontaktieren Sie Ihren zuständigen Systemadministrator.');
        });
}

function generatePDF() {
    const weekNumber = getWeekNumber(currentWeek);
    const year = currentWeek.getFullYear();
    const week = `KW${weekNumber}-${year}`;

    fetch('/generate-pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ week })
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