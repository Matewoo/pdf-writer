const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
        halal BOOLEAN,
        veggi BOOLEAN,
        daily_price TEXT
    )
`);

// Routes
app.get('/edit/menu', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/edit', 'menu.html'));
});

app.get('/edit/dailyDish', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/edit', 'dailyDish.html'));
});

app.get('/digitalSignage/dailyFeed', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/digitalSignage', 'dailyFeed.html'));
});

app.get('/digitalSignage/weeklyFeed', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/digitalSignage', 'weeklyFeed.html'));
});

app.post('/save-week', (req, res) => {
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

app.post('/save-week-daily', (req, res) => {
    const { week, entries } = req.body;

    const insert = db.prepare(`
        INSERT OR REPLACE INTO daily_entries (date, week, day_index, date_title, daily_main, daily_side, halal, veggi, daily_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                entry.halal,
                entry.veggi,
                entry.dailyPrice
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

app.post('/generate-pdf', (req, res) => {
    const { week } = req.body;

    exec(`python.exe .\\scripts\\writePdf.py ${week}`, (error, stdout, stderr) => {
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

server.listen(4000, () => {
    console.log('Server is listening on port 4000');
});