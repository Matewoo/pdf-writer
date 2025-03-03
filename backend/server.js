const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const ldap = require('ldap-authentication');
const session = require('express-session');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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

// LDAP-Authentifizierung Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Für Active Directory verwenden wir eine andere Methode
        const user = await ldap.authenticate({
            ldapOpts: {
                url: process.env.LDAP_URL,
                reconnect: true
            },
            userDn: process.env.LDAP_USER_DN,
            userPassword: process.env.LDAP_USER_PASSWORD,
            userSearchBase: process.env.LDAP_SEARCH_BASE,
            usernameAttribute: 'sAMAccountName',
            username: username,
            // Gruppenmitgliedschaften abfragen
            attributes: ['cn', 'displayName', 'mail', 'memberOf'],
            validatePassword: true,
            passwordAttribute: 'userPassword'
        });
        
        console.log('Successfully authenticated:', user.cn);
        
        // Rollen aus den Gruppen bestimmen
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
                message: 'Zugriff verweigert: Keine Berechtigung für die Speiseplan-Anwendung' 
            });
        }
        
        // Session setzen mit Rolleninformationen
        req.session.authenticated = true;
        req.session.user = { 
            name: user.cn,
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
                name: user.cn, 
                isAdmin: isAdmin 
            }, 
            redirect: returnTo 
        });
    } catch (error) {
        console.error('LDAP authentication error:', error);
        res.status(401).json({ success: false, message: 'Authentication failed' });
    }
});

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

app.post('/generate-pdf', requireLogin, (req, res) => {
    const { val, type } = req.body;
    let pdfPath;
    console.log('Type:', type);
    console.log('Val:', val);

    if (type === 'week') {
        console.log('Generating PDF for week:', val);
        pdfPath = `python3 scripts/writeWeeklyMenu.py ${val}`;
    } else if (type === 'day') {
        console.log('Generating PDF for daily:', val);
        pdfPath = `python3 scripts/writeDailyMenu.py ${val}`;
    }
    

    exec(pdfPath, (error, stdout, stderr) => {
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

const { exec } = require('child_process');

server.listen(4000, () => {
    console.log('Server is listening on port 4000');
});