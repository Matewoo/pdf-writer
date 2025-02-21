function loadDay(day) {
    Promise.all([
        fetch(`/load-day-menu?date=${encodeURIComponent(day)}`).then(response => response.json()),
        fetch(`/load-day-daily?date=${encodeURIComponent(day)}`).then(response => response.json())
    ])
        .then(([menuData, dailyData]) => {
            if (menuData.error) {
                console.error('Error loading menu:', menuData.error);
                return;
            }
            if (dailyData.error) {
                console.error('Error loading daily:', dailyData.error);
                return;
            }

            document.querySelector('h2').textContent = menuData.date_title.toUpperCase();

            const categories = {
                meat: {
                    category: 'Fleisch und Meer',
                    main: menuData.meat_main,
                    side: menuData.meat_side,
                    price: menuData.meat_price,
                    halal: menuData.halal ? '„HALAL“' : ''
                },
                veggi: {
                    category: 'Frisch und lecker',
                    main: menuData.veggi_main,
                    side: menuData.veggi_side,
                    price: menuData.veggi_price,
                    veggi: '„veggi“'
                },
                daily: {
                    category: 'Tagesempfehlung',
                    main: dailyData.daily_main,
                    side: dailyData.daily_side,
                    price: dailyData.daily_price,
                    special: dailyData.halal ? '„HALAL“' : (dailyData.veggi ? '„veggi“' : '')
                }
            };

            const container = document.querySelector('body');
            container.innerHTML = `
            <h1>Was gibt's heute?</h1>
            <h2>${menuData.date_title.toUpperCase()}</h2>
            <hr>
            ${Object.values(categories).map(item => `
                <p class="category">— ${item.category} <span class="halal">${item.halal || item.veggi || item.special || ''}</span></p>
                <p class="main">${item.main}</p>
                <p class="side">${item.side}</p>
                <p class="price">${item.price}</p>
                <hr>
            `).join('')}
            <p class="category">— Tagessuppe</p>
            <p class="main">Kürbiscremesuppe</p>
            <p class="price"><i>Großer Teller 4,00 € / Kleiner Teller 2,00 €</i></p>
            <hr>

            <p class="category">— Frisch und knackig</p>
            <p class="main">Tagessalat</p>
            <p class="side">mit verschiedenen Toppings und Baguette</p>
            <p class="price">7,00 € / 4,90 €</p>

            <p class="main">Salatbuffet</p>
            <p class="side">mit verschiedenen Dressings</p>
            <p class="price">Mittlerer Teller 3,50 € / Kleiner Teller 2,50 €</p>
        `;
        })
        .catch(error => {
            console.error('Error loading day:', error);
        });
}

// Load today's menu on page load
const today = new Date().toISOString().split('T')[0];
loadDay(today);