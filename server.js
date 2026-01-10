const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // In Produktion einschränken: ['https://dein-frontend.github.io']
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Datenbank-Verbindung
const createDbConnection = () => {
  return mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'defidb',
    port: process.env.MYSQL_PORT || 3306,
    ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
};

let db = createDbConnection();

// Verbindung überwachen und neu verbinden
function handleDisconnect() {
  db.connect(err => {
    if (err) {
      console.error('❌ Fehler bei DB-Verbindung:', err.message);
      console.log('🔄 Versuche erneut in 5 Sekunden...');
      setTimeout(handleDisconnect, 5000);
    } else {
      console.log('✅ Verbunden mit MySQL-Datenbank');
      console.log(`📊 Datenbank: ${process.env.MYSQL_DATABASE || 'defidb'}`);
    }
  });

  db.on('error', err => {
    console.error('❌ DB-Fehler:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      console.log('🔄 Verbindung verloren, neu verbinden...');
      db = createDbConnection();
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

// ===============================
// API ENDPOINTS
// ===============================

// 1. ALLE Defis abrufen
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
      console.error('❌ DB Query Fehler:', err);
      return res.status(500).json({ 
        error: true,
        message: 'Datenbankfehler',
        details: err.message 
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
      timestamp: new Date().toISOString()
    });
  });
});

// 2. NÄCHSTEN Defi finden (per Koordinaten)
app.get('/api/nearest', (req, res) => {
  const { lat, lng } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({
      error: true,
      message: 'Latitude und Longitude benötigt'
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
      z.z_aktiv,
      ST_Distance_Sphere(
        point(k.k_longitude, k.k_latitude),
        point(?, ?)
      ) as distance_meter
    FROM k_koordinaten k
    JOIN a_adresse a ON k.k_id = a.a_k_koordinaten
    JOIN z_zusatzinfo z ON a.a_id = z.z_a_adresse
    WHERE z.z_aktiv = 1
    ORDER BY distance_meter ASC
    LIMIT 1
  `;

  db.query(query, [parseFloat(lng), parseFloat(lat)], (err, results) => {
    if (err) {
      console.error('❌ Nearest Query Fehler:', err);
      return res.status(500).json({ error: true, message: 'Datenbankfehler' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: true, message: 'Keine Defis gefunden' });
    }

    const defi = results[0];
    const response = {
      id: defi.k_id,
      latitude: parseFloat(defi.k_latitude),
      longitude: parseFloat(defi.k_longitude),
      adresse: {
        plz: defi.a_plz,
        stadt: defi.a_stadt,
        straße: defi.a_straße,
        hausnummer: defi.a_hausnummer
      },
      zusatzinfo: defi.z_ort,
      distance: Math.round(defi.distance_meter),
      distance_km: (defi.distance_meter / 1000).toFixed(2)
    };

    res.json({
      success: true,
      data: response
    });
  });
});

// 3. Health Check
app.get('/api/health', (req, res) => {
  db.query('SELECT 1 as status', (err) => {
    const dbStatus = err ? 'disconnected' : 'connected';
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'defi-backend',
      database: dbStatus,
      uptime: process.uptime()
    });
  });
});

// 4. Datenbank-Info
app.get('/api/info', (req, res) => {
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM k_koordinaten) as total_defis,
      (SELECT COUNT(*) FROM k_koordinaten k 
       JOIN a_adresse a ON k.k_id = a.a_k_koordinaten
       JOIN z_zusatzinfo z ON a.a_id = z.z_a_adresse
       WHERE z.z_aktiv = 1) as active_defis,
      (SELECT MIN(k_latitude) FROM k_koordinaten) as min_lat,
      (SELECT MAX(k_latitude) FROM k_koordinaten) as max_lat,
      (SELECT MIN(k_longitude) FROM k_koordinaten) as min_lng,
      (SELECT MAX(k_longitude) FROM k_koordinaten) as max_lng
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: true, message: 'Datenbankfehler' });
    }

    res.json({
      success: true,
      data: results[0]
    });
  });
});

// 5. Frontend Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 6. Fallback Route
app.get('*', (req, res) => {
  res.status(404).json({
    error: true,
    message: 'Route nicht gefunden',
    available_routes: ['/api/standorte', '/api/nearest', '/api/health', '/api/info']
  });
});

// Server starten
app.listen(PORT, () => {
  console.log(`
  ========================================
  🚀 Defi-Backend Server gestartet
  📡 Port: ${PORT}
  🌐 URL: http://localhost:${PORT}
  📊 API: http://localhost:${PORT}/api/standorte
  🩺 Defis: 17 Standorte in Wien
  ========================================
  `);
});