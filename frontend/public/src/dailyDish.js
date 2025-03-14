let currentWeek = new Date();
currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Set to Monday
let today = new Date();
let currentDayIndex = today.getDay() - 1;
if (currentDayIndex < 0) {currentDayIndex = 0;}

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

async function sendAiTranslateRequest() {
    try {
        // Get current date for the active day
        const currentDate = new Date(currentWeek);
        currentDate.setDate(currentDate.getDate() + currentDayIndex);
        const date = currentDate.toISOString().split('T')[0];
        
        // Fetch the current day's data
        const response = await fetch(`/load-day-daily?date=${encodeURIComponent(date)}`);
        let entry;
        try {
            entry = await response.json();
        } catch (e) {
            console.error('Error parsing daily dish data:', e);
            alert('Keine Daten für diesen Tag gefunden');
            return;
        }
        
        if (!entry || (!entry.daily_main && !entry.daily_soup)) {
            alert('Keine Daten zum Übersetzen für diesen Tag gefunden');
            return;
        }

        // Construct menu item list
        const menuItems = [];
        
        // Add daily dish to menu items
        if (entry.daily_main) {
            menuItems.push({
                main: entry.daily_main,
                side: entry.daily_side || ''
            });
        }
        
        // Add soup to menu items
        if (entry.daily_soup) {
            menuItems.push({
                main: entry.daily_soup,
                side: ''
            });
        }

        // Create a structured request with system instructions
        const requestData = {
            menuItems: menuItems,
            menuType: 'daily' // Specify that this is a daily menu
        };

        console.log('Sending request data:', requestData);

        // Send to the AI service with the structured data
        const aiResponse = await fetch('/ai-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        // Debugging for non-JSON responses
        const contentType = aiResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const errorText = await aiResponse.text();
            console.error('Non-JSON response received:', errorText);
            throw new Error('Server returned non-JSON response. You might need to log in again or check server logs.');
        }

        const aiData = await aiResponse.json();
        if (aiData.error) {
            console.error('AI request failed:', aiData.error);
            alert('AI-Übersetzung fehlgeschlagen: ' + aiData.error);
            return;
        }

        // Process the result as before
        let cleanedText = aiData.result
            .trim()
            .replace(/\n/g, '');
        
        // Extract just the array part if needed
        if (cleanedText.indexOf('[') >= 0) {
            cleanedText = cleanedText.substring(cleanedText.indexOf('['));
            
            if (!cleanedText.endsWith(']')) {
                const lastBracket = cleanedText.lastIndexOf(']');
                if (lastBracket > 0) {
                    cleanedText = cleanedText.substring(0, lastBracket + 1);
                }
            }
        }
        
        const parseJsObject = function(str) {
            try {
                return (new Function('return ' + str))();
            } catch (e) {
                console.error('Failed to parse:', e);
                throw new Error('Invalid format in translation response');
            }
        };
        
        try {
            // Parse the translation data
            const translations = parseJsObject(cleanedText);
            console.log('Parsed translations:', translations);
            
            // Create a single entry for the current day
            const weekNumber = getWeekNumber(currentWeek);
            const year = currentWeek.getFullYear();
            const week = `KW${weekNumber} ${year}`;
            
            // Clean quotes function to remove unwanted quotes
            const cleanQuotes = (text) => {
                if (typeof text !== 'string') return '';
                // Remove starting and ending quotes if present
                let cleaned = text.trim();
                if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
                    (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
                    cleaned = cleaned.substring(1, cleaned.length - 1);
                }
                return cleaned;
            };
            
            const englishEntry = {
                date: date,
                week: week,
                dayIndex: currentDayIndex,
                dailyMain: '',
                dailySide: '',
                dailySoup: ''
            };
            
            let translationIndex = 0;
            
            // Add daily dish translation
            if (entry.daily_main && translations[translationIndex]) {
                englishEntry.dailyMain = cleanQuotes(translations[translationIndex].main_course || '');
                englishEntry.dailySide = cleanQuotes(translations[translationIndex].side_dish || '');
                translationIndex++;
            }
            
            // Add soup translation
            if (entry.daily_soup && translations[translationIndex]) {
                englishEntry.dailySoup = cleanQuotes(translations[translationIndex].main_course || '');
                translationIndex++;
            }
            
            console.log('Saving translation entry:', englishEntry);
            
            // Save translation to database
            const saveResponse = await fetch('/save-week-daily-en', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ week, entries: [englishEntry] })
            });
            
            if (!saveResponse.ok) {
                const errorText = await saveResponse.text();
                throw new Error(`Server response not OK: ${saveResponse.status} ${errorText}`);
            }
            
            const saveResult = await saveResponse.json();
            alert('Englische Übersetzung wurde gespeichert.');
        } catch (parseError) {
            console.error('Error parsing or saving AI response:', parseError);
            alert('Fehler beim Verarbeiten oder Speichern der KI-Antwort: ' + parseError.message);
        }
        
    } catch (error) {
        console.error('Error sending AI request:', error);
        alert('Fehler bei der KI-Anfrage: ' + error.message);
    }
}

async function saveTranslationsToDatabase(translations, originalDishes = null) {
    try {
        // Get current week
        const weekNumber = getWeekNumber(currentWeek);
        const year = currentWeek.getFullYear();
        const week = `KW${weekNumber} ${year}`;
        
        let entries = [];
        
        if (originalDishes === null) {
            // Case 1: Called from sendAiTranslateRequest with full data
            // Fetch the current week's daily dishes data
            const response = await fetch(`/load-week-daily?week=${encodeURIComponent(week)}`);
            const data = await response.json();
            
            // Sort the data by day index to ensure correct order
            data.sort((a, b) => a.day_index - b.day_index);
            
            let translationIndex = 0;
            
            // Map translations to database entries
            data.forEach(entry => {
                const englishEntry = {
                    date: entry.date,
                    week: week,
                    dayIndex: entry.day_index,
                    dailyMain: '',
                    dailySide: '',
                    dailySoup: ''
                };
                
                // Add daily dish translation
                if (entry.daily_main && translations[translationIndex]) {
                    englishEntry.dailyMain = translations[translationIndex].main_course;
                    englishEntry.dailySide = translations[translationIndex].side_dish;
                    translationIndex++;
                }
                
                // Add soup translation
                if (entry.daily_soup && translations[translationIndex]) {
                    englishEntry.dailySoup = translations[translationIndex].main_course;
                    translationIndex++;
                }
                
                entries.push(englishEntry);
            });
        } else {
            // Case 2: Called from displayTranslation with form values
            // Fetch the original data to get the dates
            const response = await fetch(`/load-week-daily?week=${encodeURIComponent(week)}`);
            const data = await response.json();
            
            // Sort the data by day index to ensure correct order
            data.sort((a, b) => a.day_index - b.day_index);
            
            // Create entries with dates from original data
            let translationIndex = 0;
            
            data.forEach(entry => {
                const englishEntry = {
                    date: entry.date,
                    week: week,
                    dayIndex: entry.day_index,
                    dailyMain: '',
                    dailySide: '',
                    dailySoup: ''
                };
                
                // Add daily dish translation if original has a daily dish
                if (entry.daily_main && translations[translationIndex]) {
                    englishEntry.dailyMain = translations[translationIndex].main_course;
                    englishEntry.dailySide = translations[translationIndex].side_dish;
                    translationIndex++;
                }
                
                // Add soup translation if original has a soup
                if (entry.daily_soup && translations[translationIndex]) {
                    englishEntry.dailySoup = translations[translationIndex].main_course;
                    translationIndex++;
                }
                
                entries.push(englishEntry);
            });
        }
        
        // Save translations to database using the daily dish endpoint
        const saveResponse = await fetch('/save-week-daily-en', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ week, entries })
        });
        
        const saveResult = await saveResponse.json();
        return { success: true, message: 'Englische Übersetzungen wurden gespeichert.' };
        
    } catch (error) {
        console.error('Error saving translations to database:', error);
        return { success: false, message: 'Fehler beim Speichern der Übersetzungen: ' + error.message };
    }
}

function displayTranslation(translationText, originalDishes = []) {
    try {
        console.log('Original text:', translationText);

        let cleanedText = translationText
            .trim()
            .replace(/\n/g, ''); // Remove any line breaks
        
        // Extract just the array part if needed
        if (cleanedText.indexOf('[') >= 0) {
            cleanedText = cleanedText.substring(cleanedText.indexOf('['));
            
            if (!cleanedText.endsWith(']')) {
                const lastBracket = cleanedText.lastIndexOf(']');
                if (lastBracket > 0) {
                    cleanedText = cleanedText.substring(0, lastBracket + 1);
                }
            }
        }
        
        console.log('Extracted JSON-like text:', cleanedText);

        const parseJsObject = function(str) {
            try {
                // Safely evaluate the string as a JavaScript expression
                return (new Function('return ' + str))();
            } catch (e) {
                console.error('Failed to parse:', e);
                throw new Error('Invalid format in translation response');
            }
        };
        
        // Parse the translation data
        const translations = parseJsObject(cleanedText);
        console.log('Parsed translations:', translations);
        
        // Create modal elements
        const modal = document.createElement('div');
        modal.classList.add('modal');

        const modalContent = document.createElement('div');
        modalContent.classList.add('modal-content');

        const title = document.createElement('h2');
        title.textContent = 'Übersetzung der Gerichte';
        title.style.color = '#a81411';
        title.style.marginTop = '0';

        modalContent.appendChild(title);

        // Create form for editing translations
        const form = document.createElement('form');
        form.classList.add('translation-form');

        // Add input fields for each translation
        translations.forEach((item, index) => {
            const dishContainer = document.createElement('div');
            dishContainer.classList.add('dish-container');

            // Deutsche Bezeichnung für das aktuelle Gericht
            const originalDish = originalDishes[index] || { main: '', side: '' };
            
            // Determine if this is a soup (soups have no side dish in original)
            const isSoup = originalDish.side === '' && originalDish.main.toLowerCase().includes('suppe');
            
            // Gericht-Header mit deutschem Original
            const dishHeader = document.createElement('div');
            dishHeader.style.fontWeight = 'bold';
            dishHeader.style.marginBottom = '10px';
            dishHeader.style.borderBottom = '1px solid #ccc';
            dishHeader.style.paddingBottom = '5px';
            dishHeader.style.color = '#a81411';
            dishHeader.textContent = `${originalDish.main} ${originalDish.side}`;
            
            const mainCourseInput = document.createElement('input');
            mainCourseInput.type = 'text';
            mainCourseInput.value = item.main_course;
            mainCourseInput.style.padding = '8px';
            mainCourseInput.style.marginBottom = '10px';
            mainCourseInput.style.width = '100%';
            mainCourseInput.style.boxSizing = 'border-box';
            mainCourseInput.placeholder = isSoup ? 'Suppe' : 'Hauptgericht';

            dishContainer.appendChild(dishHeader);
            dishContainer.appendChild(mainCourseInput);

            // Only add side dish input for regular dishes, not for soups
            if (!isSoup) {
                const sideDishInput = document.createElement('input');
                sideDishInput.type = 'text';
                sideDishInput.value = item.side_dish;
                sideDishInput.style.padding = '8px';
                sideDishInput.style.width = '100%';
                sideDishInput.style.boxSizing = 'border-box';
                sideDishInput.placeholder = 'Beilage';
                dishContainer.appendChild(sideDishInput);
            } else {
                // Add a hidden input for soups to maintain the pair structure when collecting values
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.value = '';
                dishContainer.appendChild(hiddenInput);
            }

            form.appendChild(dishContainer);
        });

        // Rest of the function remains unchanged
        modalContent.appendChild(form);

        // Add buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'first';
        buttonContainer.style.marginTop = '20px';
        buttonContainer.style.alignItems = 'center';
        buttonContainer.style.gap = '10px';

        const generateBtn = document.createElement('button');
        generateBtn.textContent = 'PDF generieren';
        generateBtn.style.padding = '8px 16px';
        generateBtn.style.backgroundColor = '#1e88e5';
        generateBtn.style.color = 'white';
        generateBtn.style.border = 'none';
        generateBtn.style.borderRadius = '4px';
        generateBtn.style.cursor = 'pointer';
        generateBtn.onclick = () => {
            // Collect the current values from the text fields
            const updatedTranslations = [];
            const inputs = form.querySelectorAll('input:not([type="hidden"])');
            const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
            let hiddenIndex = 0;
            
            for (let i = 0; i < inputs.length; i++) {
                const mainCourse = inputs[i].value;
                let sideDish = '';
                
                // If this is a soup (has hidden input), use empty side dish
                if (hiddenInputs[hiddenIndex] && 
                    hiddenInputs[hiddenIndex].parentNode === inputs[i].parentNode) {
                    sideDish = '';
                    hiddenIndex++;
                    i++; // Skip the next input which would be the hidden one
                } else {
                    // Otherwise get the next input as side dish
                    i++;
                    if (i < inputs.length) {
                        sideDish = inputs[i].value;
                    }
                }
                
                updatedTranslations.push({
                    main_course: mainCourse,
                    side_dish: sideDish
                });
            }

            // Pass the updated translations to the generatePDF function
            generatePDF('day', updatedTranslations);
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Schließen';
        closeBtn.style.padding = '8px 16px';
        closeBtn.style.backgroundColor = '#a81411';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => document.body.removeChild(modal);

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Übersetzungen speichern';
        saveBtn.style.padding = '8px 16px';
        saveBtn.style.backgroundColor = '#1e88e5';
        saveBtn.style.color = 'white';
        saveBtn.style.border = 'none';
        saveBtn.style.borderRadius = '4px';
        saveBtn.style.cursor = 'pointer';
        saveBtn.onclick = async () => {
            // Get all translated texts from form fields using the same logic as the PDF button
            const updatedTranslations = [];
            const inputs = form.querySelectorAll('input:not([type="hidden"])');
            const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
            let hiddenIndex = 0;
            
            for (let i = 0; i < inputs.length; i++) {
                const mainCourse = inputs[i].value;
                let sideDish = '';
                
                // If this is a soup (has hidden input), use empty side dish
                if (hiddenInputs[hiddenIndex] && 
                    hiddenInputs[hiddenIndex].parentNode === inputs[i].parentNode) {
                    sideDish = '';
                    hiddenIndex++;
                    i++; // Skip the next input which would be the hidden one
                } else {
                    // Otherwise get the next input as side dish
                    i++;
                    if (i < inputs.length) {
                        sideDish = inputs[i].value;
                    }
                }
                
                updatedTranslations.push({
                    main_course: mainCourse,
                    side_dish: sideDish
                });
            }
            
            // Save the translations to the database
            const saveResult = await saveTranslationsToDatabase(updatedTranslations, originalDishes);
            
            if (saveResult.success) {
                alert('Übersetzungen wurden in der Datenbank gespeichert!');
            } else {
                alert('Fehler beim Speichern: ' + saveResult.message);
            }
        };

        const disclaimer = document.createElement('p');
        disclaimer.textContent = 'Hinweis: KI generierter Inhalt kann Fehler enthalten. Bitte überprüfen Sie die Übersetzungen sorgfältig.';
        disclaimer.style.margin = '0'
        disclaimer.style.fontWeight = 'bold';

        buttonContainer.appendChild(generateBtn);
        buttonContainer.appendChild(saveBtn);
        buttonContainer.appendChild(closeBtn);
        buttonContainer.appendChild(disclaimer);
        modalContent.appendChild(buttonContainer);

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error parsing translation JSON:', error);
        alert('Fehler beim Verarbeiten der Übersetzung. Das Format ist ungültig.');
    }
}

async function displayEnglishTranslations() {
    try {
        // Get current week to load data
        const weekNumber = getWeekNumber(currentWeek);
        const year = currentWeek.getFullYear();
        const week = `KW${weekNumber} ${year}`;

        // First, fetch the current week's German daily dishes data for reference
        const germanResponse = await fetch(`/load-week-daily?week=${encodeURIComponent(week)}`);
        const germanData = await germanResponse.json();

        // Sort the data by day index to ensure correct order
        germanData.sort((a, b) => a.day_index - b.day_index);
        
        // Create array of original dishes for reference
        const originalDishes = [];
        
        // If German data exists, extract dish information
        if (germanData && germanData.length > 0) {
            germanData.forEach(entry => {
                // Add daily dish
                if (entry.daily_main) {
                    originalDishes.push({
                        main: entry.daily_main,
                        side: entry.daily_side || ''
                    });
                }
                
                // Add daily soup
                if (entry.daily_soup) {
                    originalDishes.push({
                        main: entry.daily_soup,
                        side: ''
                    });
                }
            });
        } else {
            // If no German data, create at least one empty placeholder
            originalDishes.push({
                main: 'Keine deutschen Einträge gefunden',
                side: ''
            });
        }

        // Now fetch English translations
        const englishResponse = await fetch(`/load-week-daily-en?week=${encodeURIComponent(week)}`);
        let englishData = [];
        try {
            englishData = await englishResponse.json();
        } catch (e) {
            console.log('No English translations found or error parsing response');
        }

        // Create formatted data for display
        const formattedTranslations = [];
        
        // Always create translation objects for each German dish, even if no English data exists
        if (germanData && germanData.length > 0) {
            germanData.forEach(entry => {
                // Find matching English entry by date (may be undefined)
                const englishEntry = englishData.find(en => en.date === entry.date);
                
                // Add daily dish translation (empty strings if no match)
                if (entry.daily_main) {
                    formattedTranslations.push({
                        main_course: englishEntry ? englishEntry.daily_main || '' : '',
                        side_dish: englishEntry ? englishEntry.daily_side || '' : ''
                    });
                }
                
                // Add soup translation (empty strings if no match)
                if (entry.daily_soup) {
                    formattedTranslations.push({
                        main_course: englishEntry ? englishEntry.daily_soup || '' : '',
                        side_dish: ''
                    });
                }
            });
        } else {
            // If no German data, add empty translation entry
            formattedTranslations.push({
                main_course: '',
                side_dish: ''
            });
        }

        // Format as JSON string for the existing displayTranslation function
        const translationText = JSON.stringify(formattedTranslations);
        
        // Display the translations
        displayTranslation(translationText, originalDishes);
        
    } catch (error) {
        console.error('Error loading English translations:', error);
        
        // Show empty form even when there's an error
        const emptyDish = [{ main: 'Fehler beim Laden der Daten', side: '' }];
        const emptyTranslations = JSON.stringify([{ main_course: '', side_dish: '' }]);
        
        displayTranslation(emptyTranslations, emptyDish);
    }
}

function generatePDF(type) {
    saveWeek();
    const currentDate = new Date(currentWeek);
    currentDate.setDate(currentDate.getDate() + currentDayIndex);
    const val = currentDate.toISOString().split('T')[0];


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
                window.open(`../../data/${val}.pdf`, '_blank');
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