/**
 * routing.logic.js
 * Reine Berechnungsfunktionen – kein DOM, kein Leaflet.
 * Kann im Browser UND in Jest-Tests verwendet werden.
 */

// ===============================
// Haversine-Formel: GPS-Entfernung in Metern
// ===============================
function berechneEntfernung(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ===============================
// Minimale Entfernung von Position zu einer Route
// ===============================
function calculateDistanceToRoute(routeCoords, userLat, userLng) {
    if (!routeCoords || routeCoords.length === 0) return 0;
    let minDist = Infinity;
    routeCoords.forEach(point => {
        const d = berechneEntfernung(userLat, userLng, point.lat, point.lng);
        if (d < minDist) minDist = d;
    });
    return minDist;
}

// ===============================
// Entscheidung: Routenneuberechnung nötig?
// ===============================
function shouldRecalculate(distanceToRoute, threshold = 15) {
    return distanceToRoute > threshold;
}

// ===============================
// Nächsten Defi finden (ohne Leaflet map.distance)
// ===============================
function findNearestDefiPure(defiList, lat, lng) {
    if (!defiList || defiList.length === 0) return null;
    let nearest = null;
    let minDist = Infinity;
    defiList.forEach(defi => {
        const dist = berechneEntfernung(lat, lng, defi.latitude, defi.longitude);
        if (dist < minDist) { minDist = dist; nearest = defi; }
    });
    return nearest;
}

// Node.js-Export für Jest (im Browser wird das ignoriert)
if (typeof module !== 'undefined') {
    module.exports = { berechneEntfernung, calculateDistanceToRoute, shouldRecalculate, findNearestDefiPure };
}
