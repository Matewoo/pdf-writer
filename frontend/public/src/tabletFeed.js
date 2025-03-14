function loadDay(day) {
    // Load both German and English data
    Promise.all([
        // German data sources
        fetch(`/load-day-menu?date=${encodeURIComponent(day)}`).then(response => response.json()),
        fetch(`/load-day-daily?date=${encodeURIComponent(day)}`).then(response => response.json()),
        // English data sources
        fetch(`/load-day-menu-en?date=${encodeURIComponent(day)}`).then(response => response.json().catch(() => ({}))),
        fetch(`/load-day-daily-en?date=${encodeURIComponent(day)}`).then(response => response.json().catch(() => ({})))
    ])
        .then(([germanMenuData, germanDailyData, englishMenuData, englishDailyData]) => {
            // Store both language versions in global variables
            window.germanContent = formatDayContent(germanMenuData, germanDailyData, 'de', germanMenuData, germanDailyData);
            window.englishContent = formatDayContent(englishMenuData, englishDailyData, 'en', germanMenuData, germanDailyData);
            
            // Initial display in German
            displayLanguage('de');
            
            // Start the language toggle cycle
            startLanguageToggle();
        })
        .catch(error => {
            console.error('Error loading day:', error);
        });
}

function formatDayContent(menuData, dailyData, language, germanMenuData, germanDailyData) {
    const isGerman = language === 'de';
    const title = isGerman ? 'Was gibt\'s heute?' : 'What\'s on today?';
    
    // Always use the German date title
    const dateTitle = germanMenuData?.date_title?.toUpperCase() || '';
    
    // Default data with consistent German price format for both languages
    const defaultData = {
        dailyMain: ' ',
        dailySide: ' ',
        dailyPrice: '6,00 € / 4,20 €',
        dailySoup: ' ',
        dailySoupPrice: 'Großer Teller 4,00 € / Kleiner Teller 2,00 €'
    };

    // Function to translate price text while keeping German numbering format
    function translatePriceText(text, isGerman) {
        if (isGerman) return text;
        
        return text
            .replace('Großer Teller', 'Large plate')
            .replace('Kleiner Teller', 'Small plate')
            .replace('Mittlerer Teller', 'Medium plate');
    }

    const categories = {
        meat: {
            category: isGerman ? 'Fleisch und Meer' : 'Meat and Sea',
            main: menuData?.meat_main || ' ',
            side: menuData?.meat_side || ' ',
            price: germanMenuData?.meat_price || ' ',  // Always use German price
            halal: menuData?.halal ? '„HALAL"' : ''
        },
        veggi: {
            category: isGerman ? 'Frisch und lecker' : 'Fresh and Delicious',
            main: menuData?.veggi_main || ' ',
            side: menuData?.veggi_side || ' ',
            price: germanMenuData?.veggi_price || ' ',  // Always use German price
            veggi: '„veggi"'
        },
        daily: {
            category: isGerman ? 'Tagesempfehlung' : 'Daily Special',
            main: dailyData?.daily_main || defaultData.dailyMain,
            side: dailyData?.daily_side || defaultData.dailySide,
            price: germanDailyData?.daily_price || defaultData.dailyPrice,  // Always use German price
            special: dailyData?.daily_halal ? '„HALAL"' : (dailyData?.daily_veggi ? '„veggi"' : '')
        },
        soup: {
            category: isGerman ? 'Tagessuppe' : 'Soup of the Day',
            main: dailyData?.daily_soup || defaultData.dailySoup,
            side: '',
            // Translate the text parts of the soup price but maintain German number format
            price: translatePriceText(germanDailyData?.daily_soup_price || defaultData.dailySoupPrice, isGerman),
            special: dailyData?.soup_halal ? '„HALAL"' : (dailyData?.soup_veggi ? '„veggi"' : '')
        }
    };

    // Return a complete HTML structure for this language
    return `
        <h1>${title}</h1>
        <h2>${dateTitle}</h2>
        <hr>
        ${Object.values(categories).map(item => `
            <p class="category">— ${item.category} <span class="halal">${item.halal || item.veggi || item.special || ''}</span></p>
            <p class="main">${item.main}</p>
            <p class="side">${item.side}</p>
            <p class="price">${item.price}</p>
            <hr>
        `).join('')}

        <p class="category">— ${isGerman ? 'Frisch und knackig' : 'Fresh and Crispy'}</p>
        <p class="main">${isGerman ? 'Tagessalat' : 'Daily Salad'}</p>
        <p class="side">${isGerman ? 'mit verschiedenen Toppings und Baguette' : 'with various toppings and baguette'}</p>
        <p class="price">7,00 € / 4,90 €</p>

        <p class="main">${isGerman ? 'Salatbuffet' : 'Salad Buffet'}</p>
        <p class="side">${isGerman ? 'mit verschiedenen Dressings' : 'with various dressings'}</p>
        <p class="price">${translatePriceText('Mittlerer Teller 3,50 € / Kleiner Teller 2,50 €', isGerman)}</p>
        
        <div class="language-indicator">${language.toUpperCase()}</div>
    `;
}

// Track which language is displayed
window.currentLanguage = 'de';
window.languageToggleInterval = null;

function displayLanguage(language) {
    const container = document.querySelector('body');
    
    // Hard cut - immediately change content without fade effect
    if (language === 'de') {
        container.innerHTML = window.germanContent;
    } else {
        container.innerHTML = window.englishContent;
    }
    
    // Update the current language
    window.currentLanguage = language;
}

function startLanguageToggle() {
    // Clear any existing interval
    if (window.languageToggleInterval) {
        clearInterval(window.languageToggleInterval);
    }
    
    // Toggle language every 10 seconds
    window.languageToggleInterval = setInterval(() => {
        const nextLanguage = window.currentLanguage === 'de' ? 'en' : 'de';
        displayLanguage(nextLanguage);
    }, 10000);
}

// Load today's menu on page load
const today = new Date().toISOString().split('T')[0];
loadDay(today);