const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// WICHTIG: Vor allen anderen Middlewares
app.use(cors());

// Statische Dateien
app.use(express.static(__dirname));

// SIMPLE Healthcheck - muss ganz oben sein!
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        service: 'defi-api',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Datenbankverbindung (mit Timeout für Railway)
const db = mysql.createConnection({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'defidb',
    port: process.env.MYSQLPORT || 3306,
    connectTimeout: 10000 // 10 Sekunden Timeout
});

// Async DB-Verbindung (blockiert nicht den Start)
let dbConnected = false;

db.connect(err => {
    if (err) {
        console.log('⚠️ DB nicht verbunden (startet trotzdem):', err.message);
        // App startet trotzdem ohne DB
    } else {
        console.log('✅ MySQL verbunden');
        dbConnected = true;
    }
});

// API-Endpoint (mit DB-Fallback)
app.get('/api/standorte', (req, res) => {
    if (!dbConnected) {
        // Fallback-Daten, wenn DB nicht verfügbar
        const fallbackData = [
            {
                id: 1,
                latitude: 48.1810954,
                longitude: 16.3562034,
                adresse: {
                    plz: "1050",
                    stadt: "Wien",
                    straße: "Leopold-Rister-Gasse",
                    hausnummer: "5"
                },
                zusatzinfo: "an der Hauswand rechts eben dem Eingang"
            }
        ];
        
        return res.json({
            success: true,
            count: 1,
            data: fallbackData,
            mode: 'fallback'
        });
    }

    const query = `
        SELECT 
            k.k_id,
            k.k_latitude,
            k.k_longitude,
            a.a_plz,
            a.a_stadt,
            a.a_straße,
            a.a_hausnummer,
            z.z_ort,
            z.z_aktiv
        FROM k_koordinaten k
        JOIN a_adresse a ON k.k_id = a.a_k_koordinaten
        JOIN z_zusatzinfo z ON a.a_id = z.z_a_adresse
        WHERE z.z_aktiv = 1
        ORDER BY k.k_id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('DB Fehler:', err);
            return res.status(500).json({ 
                error: true,
                message: 'Datenbankfehler'
            });
        }

        const standorte = results.map(row => ({
            id: row.k_id,
            latitude: parseFloat(row.k_latitude),
            longitude: parseFloat(row.k_longitude),
            adresse: {
                plz: row.a_plz,
                stadt: row.a_stadt,
                straße: row.a_straße,
                hausnummer: row.a_hausnummer
            },
            zusatzinfo: row.z_ort,
            aktiv: Boolean(row.z_aktiv)
        }));

        res.json({
            success: true,
            count: standorte.length,
            data: standorte,
            mode: 'database'
        });
    });
});

// Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Alle anderen Routes
app.get('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Server starten - WICHTIG: Keine DB-Abhängigkeit!
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ====================================
    🚀 Defi-Server GESTARTET
    📡 Port: ${PORT}
    🌐 Healthcheck: http://localhost:${PORT}/api/health
    ====================================
    `);
});