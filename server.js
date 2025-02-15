const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// SQLite-Datenbank initialisieren
const db = new Database('menu.db');

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

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

const { exec } = require('child_process');

app.post('/generate-pdf', (req, res) => {
    const { week } = req.body;

    exec(`python.exe ./writePdf.py ${week}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error generating PDF: ${error.message}`);
            return res.status(500).json({ success: false, error: 'Fehler beim Generieren der PDF' });
        }
        if (stderr) {
            console.error(`Error generating PDF: ${stderr}`);
            return res.status(500).json({ success: false, error: 'Fehler beim Generieren der PDF' });
        }
        console.log(`PDF generated: ${stdout}`);
        res.json({ success: true });
    });
});

server.listen(4000, () => {
    console.log('Server is listening on port 4000');
});