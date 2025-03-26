const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const ldap = require('ldap-authentication');
const session = require('express-session');
const { exec } = require('child_process');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Session-Konfiguration
app.use(session({
    secret: process.env.SESSION_SECRET || 'telc-speiseplan-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3 * 24 * 60 * 60 * 1000 // 3 Tage in Millisekunden
    }
}));

// Middleware für Authentifizierungsprüfung
const requireLogin = (req, res, next) => {
    // Wenn der Benutzer angemeldet ist, fahre mit der Anfrage fort
    if (req.session.authenticated) {
        return next();
    }
    // Speichere die ursprünglich angeforderte URL
    req.session.returnTo = req.originalUrl;
    // Andernfalls umleiten zur Anmeldeseite
    res.redirect('/login');
};

// Middleware
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create data directory if it doesn't exist
const dataDir = path.resolve(__dirname, '../../pdf-writer-data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
}

// SQLite-Datenbank initialisieren
const db = new Database(path.join(dataDir, 'menu.db'));

// Tabelle erstellen, falls sie nicht existiert
db.exec(`
    CREATE TABLE IF NOT EXISTS menu_entries (
        date TEXT PRIMARY KEY,
        week TEXT,
        day_index INTEGER,
        date_title TEXT,
        meat_main TEXT,
        meat_side TEXT,
        halal BOOLEAN,
        meat_price TEXT,
        veggi_main TEXT,
        veggi_side TEXT,
        veggi_price TEXT
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS menu_entries_en (
        date TEXT PRIMARY KEY,
        week TEXT,
        meat_main TEXT,
        meat_side TEXT,
        veggi_main TEXT,
        veggi_side TEXT
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS daily_entries (
        date TEXT PRIMARY KEY,
        week TEXT,
        day_index INTEGER,
        date_title TEXT,
        daily_main TEXT,
        daily_side TEXT,
        daily_halal BOOLEAN,
        daily_veggi BOOLEAN,
        daily_price TEXT,
        daily_soup TEXT,
        soup_halal BOOLEAN,
        soup_veggi BOOLEAN,
        soup_price TEXT
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS daily_entries_en (
        date TEXT PRIMARY KEY,
        week TEXT,
        day_index INTEGER,
        daily_main TEXT,
        daily_side TEXT,
        daily_soup TEXT
    )
`);

app.get('/', (req, res) => {
    res.redirect('/home');
});

app.get('/home', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public', 'home.html'));
});

// LDAP-Authentifizierung Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Define the domain for UPN format
        const domain = 'telc.local';
        const userPrincipalName = username.includes('@') ? username : `${username}@${domain}`;

        // Verbindung mit LDAP - with Active Directory optimized config
        const user = await ldap.authenticate({
            ldapOpts: {
                url: process.env.LDAP_URL,
                reconnect: true,
                timeout: 10000
            },
            // Admin-Anmeldedaten für die erweiterte Suche verwenden
            adminDn: process.env.LDAP_USER_DN,
            adminPassword: process.env.LDAP_USER_PASSWORD,
            userSearchBase: process.env.LDAP_SEARCH_BASE,
            userSearchFilter: `(sAMAccountName=${username})`,
            // Benutzerpasswort separat validieren
            username: username,
            userPassword: password,
            usernameAttribute: 'sAMAccountName',
            attributes: ['cn', 'displayName', 'sAMAccountName', 'mail', 'memberOf']
        });
        
        console.log('User object keys:', Object.keys(user));
        const userName = user.displayName || user.cn || user.sAMAccountName || username;
        console.log('Successfully authenticated:', userName);
        
        let isAdmin = false;
        let hasRestaurantAccess = false;
        
        if (user.memberOf && Array.isArray(user.memberOf)) {
            isAdmin = user.memberOf.some(group => 
                group.includes('CN=Domain Admins')
            );
            
            // Prüfe ob Benutzer in der erforderlichen Gruppe ist
            hasRestaurantAccess = user.memberOf.some(group => 
                group.includes('CN=g32 Betriebsrestaurant')
            );
            
            console.log('User groups:', user.memberOf);
            console.log('Is admin:', isAdmin);
            console.log('Has restaurant access:', hasRestaurantAccess);
        }
        
        // Zugriff nur für Admin oder Mitglieder der Betriebsrestaurant-Gruppe gewähren
        if (!isAdmin && !hasRestaurantAccess) {
            return res.status(403).json({ 
                success: false, 
                message: 'Zugriff verweigert: Keine Berechtigung!' 
            });
        }
        
        // Session setzen mit Rolleninformationen
        req.session.authenticated = true;
        req.session.user = { 
            name: userName,
            isAdmin: isAdmin,
            groups: user.memberOf || []
        };
        
        // Bestimme die Rücksprung-URL
        let returnTo = '/edit/menu'; // Standard-Rücksprung
        if (req.session.returnTo) {
            returnTo = req.session.returnTo;
            delete req.session.returnTo; // Lösche nach Verwendung
        }
        
        res.json({ 
            success: true, 
            user: { 
                name: userName, 
                isAdmin: isAdmin 
            }, 
            redirect: returnTo 
        });
    } catch (error) {
        console.error('LDAP authentication error:', error);
        res.status(401).json({ success: false, message: 'Authentication failed' });
    }
});

// Dev-Login Route - nur verfügbar wenn NODE_ENV=development
if (process.env.NODE_ENV === 'development') {
    app.post('/dev-login', (req, res) => {
        const { username, password } = req.body;
        
        // Prüfe ob es sich um den Dev-User handelt und das Passwort aus .env stimmt
        if (username === 'dev' && password === process.env.DEV_LOGIN_PASSWORD) {
            // Session setzen
            req.session.authenticated = true;
            req.session.user = {
                name: 'Developer',
                isAdmin: true, // Dev-User hat Admin-Rechte
                groups: ['CN=Domain Admins,CN=Users,DC=telc,DC=local'] // Simulierte Gruppen
            };

            // Bestimme die Rücksprung-URL
            let returnTo = '/edit/menu'; // Standard-Rücksprung
            if (req.session.returnTo) {
                returnTo = req.session.returnTo;
                delete req.session.returnTo;
            }

            res.json({
                success: true,
                user: {
                    name: 'Developer',
                    isAdmin: true
                },
                redirect: returnTo
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid dev credentials'
            });
        }
    });
}

// Admin-Middleware hinzufügen
const requireAdmin = (req, res, next) => {
    if (req.session.authenticated) {
        if (req.session.user && req.session.user.isAdmin) {
            return next();
        }
        return res.status(403).send('Zugriff verweigert: Administratorrechte erforderlich');
    }
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
};

// Logout-Route hinzufügen
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Öffentliche Routen
app.get('/login', (req, res) => {
    // Wenn bereits angemeldet, zur Hauptseite umleiten
    if (req.session.authenticated) {
        return res.redirect('/edit/menu');
    }
    res.sendFile(path.join(__dirname, '../frontend/public', 'login.html'));
});

app.get('/digitalSignage/dailyFeed', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/digitalSignage', 'dailyFeed.html'));
});

app.get('/digitalSignage/weeklyFeed', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/digitalSignage', 'weeklyFeed.html'));
});

app.get('/digitalSignage/tabletFeed', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/digitalSignage', 'tabletFeed.html'));
});

// Geschützte Routen
app.get('/edit/menu', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/edit', 'menu.html'));
});

app.get('/edit/dailyDish', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/edit', 'dailyDish.html'));
});

// Beispiel für eine Admin-Route
app.get('/admin/settings', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/admin', 'settings.html'));
});

// API-Routen, die auch geschützt werden sollten
app.post('/save-week', requireLogin, (req, res) => {
    const { week, entries } = req.body;

    const insert = db.prepare(`
        INSERT OR REPLACE INTO menu_entries (date, week, day_index, date_title, meat_main, meat_side, halal, meat_price, veggi_main, veggi_side, veggi_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((entries) => {
        for (const entry of entries) {
            insert.run(
                entry.date,
                week,
                entry.dayIndex,
                entry.dateTitle,
                entry.meatMain,
                entry.meatSide,
                entry.halal ? 1 : 0,
                entry.meatPrice,
                entry.veggiMain,
                entry.veggiSide,
                entry.veggiPrice
            );
        }
    });

    try {
        transaction(entries);
        res.json({ message: 'Woche erfolgreich gespeichert' });
    } catch (error) {
        console.error('Error saving week:', error);
        res.status(500).json({ error: 'Fehler beim Speichern der Woche' });
    }
});

app.post('/save-week-en', requireLogin, (req, res) => {
    const { week, entries } = req.body;

    const insert = db.prepare(`
        INSERT OR REPLACE INTO menu_entries_en (date, week, meat_main, meat_side, veggi_main, veggi_side)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((entries) => {
        for (const entry of entries) {
            insert.run(
                entry.date,
                week,
                entry.meatMain,
                entry.meatSide,
                entry.veggiMain,
                entry.veggiSide,
            );
        }
    });

    try {
        transaction(entries);
        res.json({ message: 'Woche erfolgreich gespeichert' });
    } catch (error) {
        console.error('Error saving week:', error);
        res.status(500).json({ error: 'Fehler beim Speichern der Woche' });
    }
});

app.post('/save-week-daily', requireLogin, (req, res) => {
    const { week, entries } = req.body;

    const insert = db.prepare(`
        INSERT OR REPLACE INTO daily_entries (date, week, day_index, date_title, daily_main, daily_side, daily_halal, daily_veggi, daily_price, daily_soup, soup_halal, soup_veggi, soup_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((entries) => {
        for (const entry of entries) {
            insert.run(
                entry.date,
                entry.week,
                entry.dayIndex,
                entry.dateTitle,
                entry.dailyMain,
                entry.dailySide,
                entry.dailyHalal,
                entry.dailyVeggi,
                entry.dailyPrice,
                entry.dailySoup,
                entry.soupHalal,
                entry.soupVeggi,
                entry.soupPrice
            );
        }
    });

    try {
        transaction(entries);
        res.json({ message: 'Woche erfolgreich gespeichert' });
    } catch (error) {
        console.error('Error saving week:', error);
        res.status(500).json({ error: 'Fehler beim Speichern der Woche' });
    }
});

app.post('/save-week-daily-en', requireLogin, (req, res) => {
    const { week, entries } = req.body;

    const insert = db.prepare(`
        INSERT OR REPLACE INTO daily_entries_en (date, week, day_index, daily_main, daily_side, daily_soup)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((entries) => {
        for (const entry of entries) {
            insert.run(
                entry.date,
                entry.week,
                entry.dayIndex,
                entry.dailyMain,
                entry.dailySide,
                entry.dailySoup
            );
        }
    });

    try {
        transaction(entries);
        res.json({ message: 'Woche erfolgreich gespeichert' });
    } catch (error) {
        console.error('Error saving week:', error);
        res.status(500).json({ error: 'Fehler beim Speichern der Woche' });
    }
});

app.post('/generate-pdf', requireLogin, (req, res) => {
    const { val, type, trans } = req.body;
    let pdfPath;
    console.log('Type:', type);
    console.log('Val:', val);

    try {
        if (type === 'week' && trans === '') {
            console.log('Generating PDF for week:', val);
            pdfPath = `python3 scripts/writeWeeklyMenuDE.py ${val}`;
        } else if (type === 'week' && trans !== '') {
            console.log('Generating EN PDF for week:', val);
            
            // Create temporary JSON file with translations with explicit UTF-8 encoding
            const tempJsonPath = path.join(__dirname, 'temp_translations.json');
            fs.writeFileSync(tempJsonPath, JSON.stringify(trans, null, 2), 'utf8');
            
            // Call Python script without passing the translations as command line argument
            pdfPath = `python3 scripts/writeWeeklyMenuEN.py ${val}`;
        } else if (type === 'day') {
            console.log('Generating PDF for daily:', val);
            pdfPath = `python3 scripts/writeDailyMenu.py ${val}`;
        }
        
        exec(pdfPath, (error, stdout, stderr) => {
            // Clean up the temporary file if it was created
            const tempJsonPath = path.join(__dirname, 'temp_translations.json');
            if (fs.existsSync(tempJsonPath)) {
                fs.unlinkSync(tempJsonPath);
            }

            if (error) {
                console.error(`Error generating PDF: ${error.message}`);
                return res.status(500).json({ success: false, error: error.message });
            }
            if (stderr) {
                console.error(`Error generating PDF: ${stderr}`);
                return res.status(500).json({ success: false, error: stderr });
            }
            console.log(`PDF generated: ${stdout}`);
            res.json({ success: true });
        });
    } catch (error) {
        console.error('Error in PDF generation process:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route for AI translation requests
app.post('/ai-request', requireAdmin, async (req, res) => {
    try {
        // Extract parameters from request body
        const { prompt, systemPrompt, menuItems, menuType } = req.body;
        
        console.log('\n==== AI REQUEST DEBUG INFO ====');
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        console.log('Menu Type:', menuType);
        
        // Define specialized prompts for different menu types
        const specializedPrompts = {
            weekly: `Du bist ein professioneller Übersetzer. Übersetze den folgenden Speiseplan ins Englische. Begriffe in Anführungszeichen sind Fachbegriffe oder Eigennamen und dürfen NICHT übersetzt werden. Falls ein Begriff nicht übersetzt wird, bleibt er im Output in Anführungszeichen. Die Übersetzung soll natürlich klingen: Hauptgericht und Beilage sollen mit Worten verbunden sein (Also zb statt Zeile1: Turkey schnitzel with pepper sauce, Zeile2: spaghetti; Sollst Du schreiben Zeile1: Turkey schnitzel with pepper sauce, Zeile2: served with spaghetti), aber dennoch in ZWEI getrennten Zeilen stehen. Gib das Ergebnis in folgendem Format zurück. Alles bitte in eine Zeile, ohne Leerzeichen zwischen den Json Parametern: [{'main_course':'<Hauptgericht in natürlicher Formulierung>','side_dish':'<Beilage in natürlicher Formulierung>'},{'main_course':'<Hauptgericht in natürlicher Formulierung>','side_dish':'<Beilage in natürlicher Formulierung>'}]`,
            
            daily: `Du bist ein professioneller Übersetzer. Übersetze den folgenden Tagesgerichte-Plan ins Englische. Begriffe in Anführungszeichen sind Fachbegriffe oder Eigennamen und dürfen NICHT übersetzt werden. Falls ein Begriff nicht übersetzt wird, bleibt er im Output in Anführungszeichen. Die Übersetzung soll natürlich klingen: Hauptgericht und Beilage sollen mit Worten verbunden sein, und die Suppe soll separat übersetzt werden. Tagesgerichte und Suppen sollen in getrennten Einträgen stehen. Beispiel für ein Tagesgericht: Main: "Turkey schnitzel with pepper sauce", Side: "served with spaghetti", und für eine Suppe: Main: "Tomato soup with basil", Side: "". Gib das Ergebnis in folgendem Format zurück. Alles bitte in eine Zeile, ohne Leerzeichen zwischen den Json Parametern: [{'main_course':'<Hauptgericht in natürlicher Formulierung>','side_dish':'<Beilage in natürlicher Formulierung>'},{'main_course':'<Suppe in natürlicher Formulierung>','side_dish':''}]`
        };
        
        // Construct messages array based on available parameters
        const messages = [];
        
        // Choose the appropriate system prompt based on menuType
        let effectiveSystemPrompt = systemPrompt;
        if (menuType && specializedPrompts[menuType]) {
            effectiveSystemPrompt = specializedPrompts[menuType];
            console.log('Using specialized prompt for:', menuType);
        }
        
        // Add system message if provided
        if (effectiveSystemPrompt) {
            messages.push({ role: "system", content: effectiveSystemPrompt });
            console.log('System prompt used:', effectiveSystemPrompt);
            
            // If using structured menu items
            if (menuItems && Array.isArray(menuItems)) {
                let userPrompt = "";
                
                menuItems.forEach(item => {
                    userPrompt += `- ${item.main}`;
                    if (item.side) {
                        userPrompt += ` ${item.side}`;
                    }
                    userPrompt += "\n";
                });
                
                messages.push({ role: "user", content: userPrompt });
                console.log('User prompt constructed from menu items:', userPrompt);
            }
        } 
        // Fall back to simple prompt if no structured data
        else if (prompt) {
            messages.push({ role: "user", content: prompt });
            console.log('Direct prompt used:', prompt);
        } else {
            throw new Error("No prompt provided");
        }
        
        console.log('Complete message array sent to OpenAI:', JSON.stringify(messages, null, 2));
        
        // Prepare request for OpenAI
        const requestOptions = {
            model: "gpt-4o-mini",
            messages: messages
        };
        console.log('OpenAI request options:', JSON.stringify(requestOptions, null, 2));
        
        // Send request to OpenAI
        const completion = await openai.chat.completions.create(requestOptions);
        
        console.log('\n==== AI RESPONSE DEBUG INFO ====');
        console.log('Complete OpenAI response:', JSON.stringify(completion, null, 2));
        
        const messageContent = completion.choices[0].message.content;
        console.log('Extracted message content:', messageContent);
        console.log('============================\n');
        
        res.json({ result: messageContent });
    } catch (error) {
        console.error('OpenAI API error:', error);
        console.log('Error details:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error processing AI request: ' + error.message });
    }
});

// Ungeschützte API-Routen für die digitalSignage
app.get('/load-week', (req, res) => {
    const { week } = req.query;

    try {
        const entries = db.prepare('SELECT * FROM menu_entries WHERE week = ?').all(week);
        res.json(entries);
    } catch (error) {
        console.error('Error loading week:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Woche' });
    }
});

app.get('/load-week-en', (req, res) => {
    const { week } = req.query;

    try {
        const entries = db.prepare('SELECT * FROM menu_entries_en WHERE week = ?').all(week);
        res.json(entries);
    } catch (error) {
        console.error('Error loading week:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Woche' });
    }
});

app.get('/load-week-daily', (req, res) => {
    const { week } = req.query;

    try {
        const entries = db.prepare('SELECT * FROM daily_entries WHERE week = ?').all(week);
        res.json(entries);
    } catch (error) {
        console.error('Error loading week:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Woche' });
    }
});

app.get('/load-week-daily-en', (req, res) => {
    const { week } = req.query;

    try {
        const entries = db.prepare('SELECT * FROM daily_entries_en WHERE week = ?').all(week);
        res.json(entries);
    } catch (error) {
        console.error('Error loading daily English translations:', error);
        res.status(500).json({ error: 'Fehler beim Laden der englischen Tagesgerichte' });
    }
});

app.get('/load-day-menu', (req, res) => {
    const { date } = req.query;

    try {
        const entry = db.prepare('SELECT * FROM menu_entries WHERE date = ?').get(date);
        if (entry) {
            res.json(entry);
        } else {
            res.status(404).json({ error: 'No menu entry found for the given date' });
        }
    } catch (error) {
        console.error('Error loading menu:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Menüs' });
    }
});

app.get('/load-day-daily', (req, res) => {
    const { date } = req.query;

    try {
        const entry = db.prepare('SELECT * FROM daily_entries WHERE date = ?').get(date);
        if (entry) {
            res.json(entry);
        } else {
            res.status(404).json({ error: 'No daily entry found for the given date' });
        }
    } catch (error) {
        console.error('Error loading daily:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Tagesgerichts' });
    }
});

app.get('/load-day-menu-en', (req, res) => {
    const { date } = req.query;

    try {
        const entry = db.prepare('SELECT * FROM menu_entries_en WHERE date = ?').get(date);
        if (entry) {
            res.json(entry);
        } else {
            res.status(404).json({ error: 'No English menu entry found for the given date' });
        }
    } catch (error) {
        console.error('Error loading English menu:', error);
        res.status(500).json({ error: 'Fehler beim Laden des englischen Menüs' });
    }
});

app.get('/load-day-daily-en', (req, res) => {
    const { date } = req.query;

    try {
        const entry = db.prepare('SELECT * FROM daily_entries_en WHERE date = ?').get(date);
        if (entry) {
            res.json(entry);
        } else {
            res.status(404).json({ error: 'No English daily entry found for the given date' });
        }
    } catch (error) {
        console.error('Error loading English daily:', error);
        res.status(500).json({ error: 'Fehler beim Laden des englischen Tagesgerichts' });
    }
});


server.listen(4000, () => {
    console.log('Server is listening on port 4000');
});