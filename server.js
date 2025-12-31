const express = require('express');
const mysql = require('mysql');
const path = require('path');
const app = express();
const port = 3000;

// MySQL Verbindung erstellen
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',  
    password: '',   
    database: 'defidb'
});

// Verbindung zur Datenbank herstellen
db.connect((err) => {
    if (err) {
        console.error('Fehler bei der Verbindung zur Datenbank:', err);
        return;
    }
    console.log('Verbunden mit MySQL-Datenbank');
});

// Statische Dateien (HTML, CSS, JS, Bilder)
app.use(express.static(path.join(__dirname)));

// API-Endpoint für Standorte
app.get('/api/standorte', (req, res) => {
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
            console.error('Fehler bei der Datenbankabfrage:', err);
            res.status(500).json({ error: 'Datenbankfehler' });
            return;
        }
        
        // Formatieren der Daten für die Frontend
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
        
        res.json(standorte);
    });
});

// Starte den Server
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});