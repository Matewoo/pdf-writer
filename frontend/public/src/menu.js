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

function generatePDF(type, trans) {
    saveWeek();
    const weekNumber = getWeekNumber(currentWeek);
    const year = currentWeek.getFullYear();
    const val = `KW${weekNumber}-${year}`;

    fetch('/generate-pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ val, type, trans })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('PDF erfolgreich generiert');
                if (trans === '') {
                    window.open(`../../data/${val.replace('-', " ")}_DE.pdf`, '_blank');
                } else {
                    window.open(`../../data/${val.replace('-', " ")}_EN.pdf`, '_blank');
                }
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

async function sendAiTranslateRequest() {
    try {
        // Get current week to load data
        const weekNumber = getWeekNumber(currentWeek);
        const year = currentWeek.getFullYear();
        const week = `KW${weekNumber} ${year}`;

        // Fetch the current week's menu data
        const response = await fetch(`/load-week?week=${encodeURIComponent(week)}`);
        const data = await response.json();

        // Sort the data by day index to ensure correct order
        data.sort((a, b) => a.day_index - b.day_index);

        // Format the data as described in the prompt
        let promptText = '';
        // Store original dishes for reference
        const originalDishes = [];

        data.forEach(entry => {
            // Add meat dish
            if (entry.meat_main) {
                promptText += `${entry.meat_main}\n`;
                originalDishes.push({
                    main: entry.meat_main,
                    side: entry.meat_side || ''
                });
                
                if (entry.meat_side) {
                    promptText += `${entry.meat_side}\n\n`;
                } else {
                    promptText += '\n';
                }
            }

            // Add vegetarian dish
            if (entry.veggi_main) {
                promptText += `${entry.veggi_main}\n`;
                originalDishes.push({
                    main: entry.veggi_main,
                    side: entry.veggi_side || ''
                });
                
                if (entry.veggi_side) {
                    promptText += `${entry.veggi_side}\n\n`;
                } else {
                    promptText += '\n';
                }
            }
        });

        // Send to the AI service
        const aiResponse = await fetch('/ai-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: promptText })
        });

        const aiData = await aiResponse.json();
        if (aiData.error) {
            console.error('AI request failed:', aiData.error);
            alert('AI-Übersetzung fehlgeschlagen: ' + aiData.error);
            return;
        }

        // Show the results to the user
        console.log('AI response:', aiData.result);
        console.log('Original dishes:', originalDishes);

        // Create a modal to display the translation with original dishes
        displayTranslation(aiData.result, originalDishes);
    } catch (error) {
        console.error('Error sending AI request:', error);
        alert('Fehler bei der KI-Anfrage: ' + error.message);
    }
}

function sendTestTranslateRequest() {
    const testResponse = `[{'main_course':'Turkey schnitzel with pepper sauce','side_dish':'served with spaghetti'},{'main_course':'Lentil curry with coconut milk','side_dish':'served with rice'},{'main_course':'White cabbage stew with potatoes and ground beef','side_dish':'served with a side salad and homemade bread'},{'main_course':'Sweet potato gnocchi with cheese sauce and arugula','side_dish':'served with a side salad'},{'main_course':'Ramsons bratwurst','side_dish':'accompanied by steakhouse fries'},{'main_course':'"Poached eggs" in mustard sauce','side_dish':'served with boiled potatoes and a side salad'},{'main_course':'Chicken breast fillet in herb sauce','side_dish':'with fried potatoes and a side salad'},{'main_course':'Vegetable fritter with dip','side_dish':'served with couscous'},{'main_course':'Halibut fillet in lemon herb sauce','side_dish':'served with boiled potatoes and a side salad'},{'main_course':'Vegetable rösti with dip','side_dish':'served with potato salad'}]`;
    
    // Beispiel-deutsche Gerichte für den Test
    const testOriginalDishes = [
        { main: 'Putenschnitzel mit Pfeffersauce', side: 'mit Spaghetti' },
        { main: 'Linsencurry mit Kokosmilch', side: 'mit Reis' },
        { main: 'Weißkohleintopf mit Kartoffeln und Hackfleisch', side: 'mit Salat und hausgemachtem Brot' },
        { main: 'Süßkartoffel-Gnocchi mit Käsesauce und Rucola', side: 'mit Salat' },
        { main: 'Bärlauch-Bratwurst', side: 'mit Steakhouse-Pommes' },
        { main: '"Verlorene Eier" in Senfsauce', side: 'mit Kartoffeln und Salat' },
        { main: 'Hähnchenbrust-Filet in Kräutersauce', side: 'mit Bratkartoffeln und Salat' },
        { main: 'Gemüsepuffer mit Dip', side: 'mit Couscous' },
        { main: 'Heilbuttfilet in Zitronenkräutersauce', side: 'mit Salzkartoffeln und Salat' },
        { main: 'Gemüserösti mit Dip', side: 'mit Kartoffelsalat' }
    ];
    
    displayTranslation(testResponse, testOriginalDishes);
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

            const sideDishInput = document.createElement('input');
            sideDishInput.type = 'text';
            sideDishInput.value = item.side_dish;
            sideDishInput.style.padding = '8px';
            sideDishInput.style.width = '100%';
            sideDishInput.style.boxSizing = 'border-box';

            dishContainer.appendChild(dishHeader);
            dishContainer.appendChild(mainCourseInput);
            dishContainer.appendChild(sideDishInput);

            form.appendChild(dishContainer);
        });

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
            generatePDF('week', translations);
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

        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Übersetzungen kopieren';
        copyBtn.style.padding = '8px 16px';
        copyBtn.style.backgroundColor = '#1e88e5';
        copyBtn.style.color = 'white';
        copyBtn.style.border = 'none';
        copyBtn.style.borderRadius = '4px';
        copyBtn.style.cursor = 'pointer';
        copyBtn.onclick = () => {
            // Get all translated texts
            const inputs = form.querySelectorAll('input');
            let copyText = '';

            for (let i = 0; i < inputs.length; i += 2) {
                copyText += `${inputs[i].value}\n${inputs[i + 1].value}\n\n`;
            }

            navigator.clipboard.writeText(copyText)
                .then(() => alert('Übersetzungen wurden in die Zwischenablage kopiert!'))
                .catch(err => console.error('Fehler beim Kopieren:', err));
        };

        const disclaimer = document.createElement('p');
        disclaimer.textContent = 'Hinweis: KI generierter Inhalt kann Fehler enthalten. Bitte überprüfen Sie die Übersetzungen sorgfältig.';
        disclaimer.style.margin = '0'
        disclaimer.style.fontWeight = 'bold';

        buttonContainer.appendChild(generateBtn);
        buttonContainer.appendChild(copyBtn);
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

// Initialize the display when page loads
updateWeekDisplay();
updateDayDisplay();
const weekNumber = getWeekNumber(currentWeek);
const year = currentWeek.getFullYear();
const week = `KW${weekNumber} ${year}`;
loadWeekData(week);