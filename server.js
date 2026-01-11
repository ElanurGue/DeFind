const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Debug: Zeige alle Environment Variables
console.log('=== RAILWAY ENV VARIABLES ===');
console.log('PORT:', process.env.PORT);
console.log('MYSQLHOST:', process.env.MYSQLHOST);
console.log('MYSQLUSER:', process.env.MYSQLUSER);
console.log('MYSQLDATABASE:', process.env.MYSQLDATABASE);
console.log('MYSQLPORT:', process.env.MYSQLPORT);
console.log('MYSQLPASSWORD:', process.env.MYSQLPASSWORD ? '***SET***' : 'NOT SET');
console.log('=============================');

// CORS für alle erlauben
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS']
}));

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// ====== HARDCODED DEFI DATEN (als Fallback) ======
const HARDCODED_DEFIS = [
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
        zusatzinfo: "an der Hauswand rechts eben dem Eingang",
        aktiv: true
    },
    {
        id: 2,
        latitude: 48.1806330,
        longitude: 16.3532999,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Einsiedlergasse",
            hausnummer: "2"
        },
        zusatzinfo: "beim Portier der MA48-Garage",
        aktiv: true
    },
    {
        id: 3,
        latitude: 48.1814583,
        longitude: 16.3511552,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Siebenbrunnenfeldgasse",
            hausnummer: "26-30"
        },
        zusatzinfo: "an der Hauswand",
        aktiv: true
    },
    {
        id: 4,
        latitude: 48.1842160,
        longitude: 16.3469646,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Arbeitergasse",
            hausnummer: "45"
        },
        zusatzinfo: "beim Haupteingang rein gerade durchgehen bis zum Lift rechts an der Wand",
        aktiv: true
    },
    {
        id: 5,
        latitude: 48.1851496,
        longitude: 16.3474096,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Johannagasse",
            hausnummer: "28"
        },
        zusatzinfo: "direkt an der Tankstelle außen",
        aktiv: true
    },
    {
        id: 6,
        latitude: 48.1852020,
        longitude: 16.3506484,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Embelgasse",
            hausnummer: "46-48"
        },
        zusatzinfo: "im Sekretariat",
        aktiv: true
    },
    {
        id: 7,
        latitude: 48.1867586,
        longitude: 16.3440004,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Margaretengürtel",
            hausnummer: "142"
        },
        zusatzinfo: "Rezeption und im SPA Bereich",
        aktiv: true
    },
    {
        id: 8,
        latitude: 48.1881797,
        longitude: 16.3438260,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Bruno Kreisky Park",
            hausnummer: "-"
        },
        zusatzinfo: "beim Wartepersonal",
        aktiv: true
    },
    {
        id: 10,
        latitude: 48.1887919,
        longitude: 16.3526762,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Bräuhausgasse",
            hausnummer: "37"
        },
        zusatzinfo: "im Foyer Bürohaus Erdgeschoß",
        aktiv: true
    },
    {
        id: 11,
        latitude: 48.1855989,
        longitude: 16.3571681,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Spengergasse",
            hausnummer: "20"
        },
        zusatzinfo: "links neben dem Portier direkt beim Eingang",
        aktiv: true
    },
    {
        id: 12,
        latitude: 48.1845995,
        longitude: 16.3615028,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Wiednerhauptstrasse",
            hausnummer: "120"
        },
        zusatzinfo: "beim Portier eingang links",
        aktiv: true
    },
    {
        id: 13,
        latitude: 48.1887081,
        longitude: 16.3591965,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Viktor-Christ-Gasse",
            hausnummer: "9"
        },
        zusatzinfo: "im Eingangsbereich",
        aktiv: true
    },
    {
        id: 14,
        latitude: 48.1877160,
        longitude: 16.3623185,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Nikolsdorfergasse",
            hausnummer: "18"
        },
        zusatzinfo: "Gerät befindet sich im Eingangsbereich in einem gekennzeichneten Kasten",
        aktiv: true
    },
    {
        id: 15,
        latitude: 48.1879791,
        longitude: 16.3620091,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Nikolsdorfergasse",
            hausnummer: "32"
        },
        zusatzinfo: "beim Portier in der Eingangshalle",
        aktiv: true
    },
    {
        id: 16,
        latitude: 48.1917359,
        longitude: 16.3587795,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Margaretenplatz",
            hausnummer: "2/131"
        },
        zusatzinfo: "beim Empfang",
        aktiv: true
    },
    {
        id: 17,
        latitude: 48.1953328,
        longitude: 16.3563125,
        adresse: {
            plz: "1050",
            stadt: "Wien",
            straße: "Hamburgerstraße",
            hausnummer: "9"
        },
        zusatzinfo: "im Stiegenhaus vor der Aufzugtüre im EG",
        aktiv: true
    }
];

// Datenbank Konfiguration
const dbConfig = {
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'defidb',
    port: process.env.MYSQLPORT || 3306,
    connectTimeout: 10000
};

console.log('🔧 Database config:', {
    host: dbConfig.host,
    database: dbConfig.database,
    port: dbConfig.port,
    user: dbConfig.user
});

let db;
let dbConnected = false;

// Versuche Datenbank zu verbinden (nicht blockierend)
try {
    db = mysql.createConnection(dbConfig);
    
    db.connect((err) => {
        if (err) {
            console.error('❌ DATABASE CONNECTION FAILED:', err.message);
            console.log('⚠️ Using hardcoded data only');
        } else {
            console.log('✅ DATABASE CONNECTED');
            dbConnected = true;
            
            // Test query
            db.query('SELECT 1 as test', (err, results) => {
                if (err) {
                    console.error('❌ Test query failed:', err.message);
                } else {
                    console.log('✅ Database test successful');
                }
            });
        }
    });
} catch (err) {
    console.error('❌ Failed to create DB connection:', err.message);
}

// ====== API ENDPOINTS ======

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'defi-api',
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        data_source: dbConnected ? 'database' : 'hardcoded',
        defi_count: HARDCODED_DEFIS.length
    });
});

// Test Endpoint (für Debugging)
app.get('/api/test', (req, res) => {
    if (!dbConnected) {
        return res.json({
            database: 'not_connected',
            message: 'Using hardcoded data',
            hardcoded_defis: HARDCODED_DEFIS.length,
            env_vars: {
                mysqlhost: process.env.MYSQLHOST,
                mysqldatabase: process.env.MYSQLDATABASE,
                mysqlport: process.env.MYSQLPORT,
                mysqluser: process.env.MYSQLUSER,
                mysqlpassword_set: !!process.env.MYSQLPASSWORD
            }
        });
    }
    
    // Test database connection
    db.query('SELECT DATABASE() as db, USER() as user', (err, results) => {
        if (err) {
            res.json({
                database: 'error',
                error: err.message,
                env_vars: {
                    mysqlhost: process.env.MYSQLHOST,
                    mysqldatabase: process.env.MYSQLDATABASE,
                    mysqlport: process.env.MYSQLPORT
                }
            });
        } else {
            res.json({
                database: 'connected',
                current_db: results[0].db,
                current_user: results[0].user,
                env_vars: {
                    mysqlhost: process.env.MYSQLHOST,
                    mysqldatabase: process.env.MYSQLDATABASE,
                    mysqlport: process.env.MYSQLPORT
                }
            });
        }
    });
});

// Haupt-API: Alle Defis
app.get('/api/standorte', (req, res) => {
    console.log('📡 /api/standorte called');
    
    // Wenn DB verbunden ist, versuche Daten zu holen
    if (dbConnected) {
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
                console.error('❌ Database query failed:', err.message);
                // Fallback zu hardcoded Daten
                returnHardcodedData(res);
            } else if (results.length === 0) {
                console.log('⚠️ Database returned 0 results');
                returnHardcodedData(res);
            } else {
                console.log(`✅ Database returned ${results.length} defis`);
                
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
                    mode: 'database',
                    timestamp: new Date().toISOString()
                });
            }
        });
    } else {
        // DB nicht verbunden → hardcoded Daten
        returnHardcodedData(res);
    }
});

// Hilfsfunktion für hardcoded Daten
function returnHardcodedData(res) {
    const activeDefis = HARDCODED_DEFIS.filter(d => d.aktiv);
    
    res.json({
        success: true,
        count: activeDefis.length,
        data: activeDefis,
        mode: 'hardcoded',
        timestamp: new Date().toISOString(),
        message: dbConnected ? 'Database empty or error' : 'Database not connected'
    });
}

// Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        available_routes: [
            '/api/standorte',
            '/api/health',
            '/api/test'
        ]
    });
});

// Server starten
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ============================================
    🚀 DEFI SERVER STARTED
    📡 Port: ${PORT}
    🌐 URL: http://localhost:${PORT}
    🩺 Health: /api/health
    📊 API: /api/standorte
    🔧 Env: ${process.env.NODE_ENV || 'development'}
    📈 Defis: ${HARDCODED_DEFIS.length} hardcoded
    ============================================
    `);
});