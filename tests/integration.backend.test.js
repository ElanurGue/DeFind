// ===============================
// integration.backend.test.js
// Integrationstests – Frontend ↔ Backend (Express + MySQL gemockt)
// Setup: npm install --save-dev jest supertest
// Ausführen: npx jest integration.backend.test.js
// ===============================

// Polyfill für ältere Node.js Versionen
const { TextDecoder, TextEncoder } = require('util');
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;

const express = require('express');
const request = require('supertest');

// ---------------------------------------------------------------
// MOCK: MySQL Datenbank
// MySQL gibt Boolean-Felder als 1 / 0 zurück, nicht als true / false
// ---------------------------------------------------------------
const mockDefis = [
    { id: 1, latitude: 48.181, longitude: 16.356, adresse: 'Leopold-Rister-Gasse 5', verfuegbar: 1 },
    { id: 2, latitude: 48.195, longitude: 16.353, adresse: 'Hamburgerstraße 9',       verfuegbar: 1 },
    { id: 3, latitude: 48.190, longitude: 16.360, adresse: 'Einsiedlergasse 2',       verfuegbar: 0 },
];

jest.mock('mysql2', () => ({
    createConnection: jest.fn(() => ({
        connect: jest.fn(),
        query: jest.fn((sql, params, callback) => {
            if (sql.includes('WHERE id = ?')) {
                const id = params[0];
                const defi = mockDefis.find(d => d.id === id);
                callback(null, defi ? [defi] : []);
            } else if (sql.includes('WHERE verfuegbar = 1')) {
                callback(null, mockDefis.filter(d => d.verfuegbar === 1));
            } else if (sql.includes('SELECT')) {
                callback(null, mockDefis);
            } else {
                callback(null, []);
            }
        }),
        end: jest.fn(),
    })),
}));

const mysql = require('mysql2');
const db = mysql.createConnection({});

// ---------------------------------------------------------------
// EXPRESS SERVER (simuliert euer Backend)
// ---------------------------------------------------------------
const app = express();
app.use(express.json());

// Reihenfolge wichtig: spezifischere Routen zuerst!
app.get('/defis/filter/verfuegbar', (req, res) => {
    db.query('SELECT * FROM defis WHERE verfuegbar = 1', [], (err, results) => {
        if (err) return res.status(500).json({ error: 'Datenbankfehler' });
        res.json(results);
    });
});

app.get('/defis/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.query('SELECT * FROM defis WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Datenbankfehler' });
        if (results.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });
        res.json(results[0]);
    });
});

app.get('/defis', (req, res) => {
    db.query('SELECT * FROM defis', [], (err, results) => {
        if (err) return res.status(500).json({ error: 'Datenbankfehler' });
        res.json(results);
    });
});


// ================================================================
// INTEGRATIONSTESTS – Frontend ↔ Backend
// ================================================================

describe('IT-06 | GET /defis – Alle Defibrillatoren laden', () => {

    test('gibt HTTP 200 zurück', async () => {
        const res = await request(app).get('/defis');
        expect(res.statusCode).toBe(200);
    });

    test('gibt eine Liste von Defibrillatoren zurück', async () => {
        const res = await request(app).get('/defis');
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(3);
    });

    test('jeder Defi hat id, latitude, longitude und adresse', async () => {
        const res = await request(app).get('/defis');
        res.body.forEach(defi => {
            expect(defi).toHaveProperty('id');
            expect(defi).toHaveProperty('latitude');
            expect(defi).toHaveProperty('longitude');
            expect(defi).toHaveProperty('adresse');
        });
    });

    test('Koordinaten sind numerische Werte', async () => {
        const res = await request(app).get('/defis');
        res.body.forEach(defi => {
            expect(typeof defi.latitude).toBe('number');
            expect(typeof defi.longitude).toBe('number');
        });
    });
});


describe('IT-07 | GET /defis/:id – Einzelnen Defibrillator laden', () => {

    test('gibt den korrekten Defi bei gültiger ID zurück', async () => {
        const res = await request(app).get('/defis/1');
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe(1);
        expect(res.body.adresse).toBe('Leopold-Rister-Gasse 5');
    });

    test('gibt HTTP 404 zurück bei nicht vorhandener ID', async () => {
        const res = await request(app).get('/defis/999');
        expect(res.statusCode).toBe(404);
    });

    test('zurückgegebener Defi hat alle notwendigen Felder', async () => {
        const res = await request(app).get('/defis/2');
        expect(res.body).toHaveProperty('latitude');
        expect(res.body).toHaveProperty('longitude');
        expect(res.body).toHaveProperty('adresse');
        expect(res.body).toHaveProperty('verfuegbar');
    });
});


describe('IT-08 | GET /defis/filter/verfuegbar – Nur verfügbare Defis', () => {

    test('gibt HTTP 200 zurück', async () => {
        const res = await request(app).get('/defis/filter/verfuegbar');
        expect(res.statusCode).toBe(200);
    });

    test('gibt nur verfügbare Defis zurück (verfuegbar = 1)', async () => {
        const res = await request(app).get('/defis/filter/verfuegbar');
        res.body.forEach(defi => {
            expect(defi.verfuegbar).toBe(1);
        });
    });

    test('nicht verfügbare Defis sind nicht in der Liste', async () => {
        const res = await request(app).get('/defis/filter/verfuegbar');
        const ids = res.body.map(d => d.id);
        expect(ids).not.toContain(3); // id:3 hat verfuegbar = 0
    });
});


describe('IT-09 | Frontend verarbeitet Backend-Daten korrekt', () => {

    function findNearestDefiPure(defis, userLat, userLng) {
        if (!defis || defis.length === 0) return null;
        const R = 6371000;
        let nearest = null;
        let minDist = Infinity;
        defis.forEach(defi => {
            const dLat = (defi.latitude  - userLat) * Math.PI / 180;
            const dLon = (defi.longitude - userLng) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(defi.latitude * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            if (dist < minDist) { minDist = dist; nearest = defi; }
        });
        return nearest;
    }

    test('geladene Defis vom Backend → nächster Defi wird korrekt gefunden', async () => {
        const res = await request(app).get('/defis');
        const nearest = findNearestDefiPure(res.body, 48.190, 16.360);
        expect(nearest.id).toBe(3);
    });

    test('nur verfügbare Defis → nächster verfügbarer Defi hat verfuegbar = 1', async () => {
        const res = await request(app).get('/defis/filter/verfuegbar');
        const nearest = findNearestDefiPure(res.body, 48.190, 16.360);
        expect(nearest.verfuegbar).toBe(1);
    });

    test('leere Antwort vom Backend → Frontend gibt null zurück', async () => {
        const nearest = findNearestDefiPure([], 48.2, 16.3);
        expect(nearest).toBeNull();
    });
});