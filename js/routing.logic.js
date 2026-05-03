/**
 * routing.logic.js
 * Reine Berechnungsfunktionen für Routing und Navigation.
 * Keine DOM-Manipulation, keine Leaflet-Aufrufe.
 */

// ================================================================
// ENTFERNUNG BERECHNEN (Haversine-Formel)
// ================================================================

/**
 * Berechnet die Luftlinien-Entfernung zwischen zwei GPS-Koordinaten in Metern.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Entfernung in Metern
 */
function berechneEntfernung(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Erdradius in Metern
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ================================================================
// NÄCHSTEN DEFI FINDEN
// ================================================================

/**
 * Findet den nächstgelegenen Defi aus der defiList.
 * @param {number} userLat
 * @param {number} userLng
 * @returns {object|null} Nächster Defi oder null
 */
function findNearestDefi(userLat, userLng) {
    if (!defiList || defiList.length === 0) return null;

    let nearest = null;
    let minDist = Infinity;

    defiList.forEach(function(defi) {
        const dist = berechneEntfernung(userLat, userLng, defi.latitude, defi.longitude);
        if (dist < minDist) {
            minDist = dist;
            nearest = defi;
        }
    });

    console.log(`📍 Nächster Defi: ${nearest?.adresse?.straße} ${nearest?.adresse?.hausnummer} (${Math.round(minDist)}m)`);
    return nearest;
}

// ================================================================
// ABWEICHUNG VON ROUTE BERECHNEN
// ================================================================

/**
 * Berechnet die minimale Entfernung des Nutzers von der aktuellen Route.
 * @param {Array} routeCoords - Array von {lat, lng} Punkten
 * @param {number} userLat
 * @param {number} userLng
 * @returns {number} Minimale Entfernung in Metern
 */
function calculateDistanceToRoute(routeCoords, userLat, userLng) {
    if (!routeCoords || routeCoords.length === 0) return 0;

    let minDist = Infinity;
    routeCoords.forEach(function(point) {
        const d = berechneEntfernung(userLat, userLng, point.lat, point.lng);
        if (d < minDist) minDist = d;
    });
    return minDist;
}

// ================================================================
// NEUBERECHNUNG PRÜFEN
// ================================================================

/**
 * Gibt true zurück wenn die Abweichung den Schwellenwert überschreitet.
 * @param {number} distanceToRoute - Aktuelle Abweichung in Metern
 * @param {number} threshold - Schwellenwert in Metern (default: 15)
 * @returns {boolean}
 */
function shouldRecalculate(distanceToRoute, threshold = 15) {
    return distanceToRoute > threshold;
}
