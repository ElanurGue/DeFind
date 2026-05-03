// ===============================
// Karte initialisieren (5. Bezirk Wien)
// ===============================
const map = L.map('map').setView([48.192, 16.352], 15);

// ===============================
// OpenStreetMap Tiles
// ===============================
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// ===============================
// Globale Variablen
// ===============================
let defiList = [];
let routingControl = null;
let currentUserMarker = null;
let positionWatchId = null;
let isLiveTracking = false;
let currentDefiTarget = null;
let currentRouteCoords = [];

// ===============================
// Icons
// ===============================
const heartIcon = L.icon({
    iconUrl: 'bilder/heart.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28]
});

// ===============================
// RAILWAY API KONFIGURATION
// ===============================
const RAILWAY_API = 'https://defind-production.up.railway.app/api/standorte';

// ===============================
// OSRM Routing Service für Fußgänger
// ===============================
const routingService = L.Routing.osrmv1({
    serviceUrl: 'https://router.project-osrm.org/route/v1',
    profile: 'walking', // Fußgänger-Routen
    timeout: 10000
});
