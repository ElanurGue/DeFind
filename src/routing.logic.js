// ===============================
// routing.logic.js
// Reine Logikfunktionen – keine DOM/Leaflet-Abhängigkeiten
// Wird von routing.js genutzt UND von Jest getestet
// ===============================

/**
 * Berechnet die Entfernung zwischen zwei GPS-Koordinaten in Metern (Haversine-Formel).
 */
function berechneEntfernung(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Erdradius in Metern
    const toRad = (deg) => deg * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Berechnet die minimale Entfernung (in Metern) des Nutzers zu einem beliebigen
 * Punkt der übergebenen Route.
 *
 * @param {Array<{lat: number, lng: number}>} route  – Array von Routenpunkten
 * @param {number} userLat
 * @param {number} userLng
 * @returns {number} Minimale Entfernung in Metern, 0 bei leerer/ungültiger Route
 */
function calculateDistanceToRoute(route, userLat, userLng) {
    if (!route || route.length === 0) return 0;

    let minDistance = Infinity;

    for (const punkt of route) {
        const dist = berechneEntfernung(userLat, userLng, punkt.lat, punkt.lng);
        if (dist < minDistance) {
            minDistance = dist;
        }
    }

    return minDistance;
}

/**
 * Entscheidet, ob die Route neu berechnet werden soll.
 *
 * @param {number} distanceToRoute  – Aktuelle Entfernung von der Route in Metern
 * @param {number} threshold        – Schwellenwert in Metern (Standard: 15)
 * @returns {boolean} true wenn Neuberechnung nötig
 */
function shouldRecalculate(distanceToRoute, threshold = 15) {
    return distanceToRoute > threshold;
}

/**
 * Findet den nächstgelegenen Defibrillator aus einer Liste (ohne DOM/Leaflet).
 *
 * @param {Array<{latitude: number, longitude: number}>} defis – Defi-Liste
 * @param {number} userLat
 * @param {number} userLng
 * @returns {object|null} Nächster Defi oder null bei leerer/ungültiger Liste
 */
function findNearestDefiPure(defis, userLat, userLng) {
    if (!defis || defis.length === 0) return null;

    let nearest = null;
    let minDistance = Infinity;

    for (const defi of defis) {
        const dist = berechneEntfernung(userLat, userLng, defi.latitude, defi.longitude);
        if (dist < minDistance) {
            minDistance = dist;
            nearest = defi;
        }
    }

    return nearest;
}

module.exports = {
    berechneEntfernung,
    calculateDistanceToRoute,
    shouldRecalculate,
    findNearestDefiPure
};