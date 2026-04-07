function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = deg => deg * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function findNearestDefi(userLat, userLng, defiList) {
    if (!Array.isArray(defiList) || defiList.length === 0) {
        return null;
    }

    let nearest = null;
    let minDist = Infinity;

    defiList.forEach(defi => {
        const dist = calculateDistance(
            userLat,
            userLng,
            defi.latitude,
            defi.longitude
        );

        if (dist < minDist) {
            minDist = dist;
            nearest = defi;
        }
    });

    return nearest;
}

// Prüft ob der Nutzer mehr als `threshold` Meter von der Route abgewichen ist.
// routeCoords = Array von { lat, lng } Punkten der aktuellen Route
// userLat, userLng = aktuelle Position des Nutzers
// threshold = maximale Abweichung in Metern (laut CR1: 15m)
function isOffRoute(userLat, userLng, routeCoords, threshold = 15) {
    if (!Array.isArray(routeCoords) || routeCoords.length === 0) {
        return false;
    }

    let minDist = Infinity;

    // Kleinste Distanz zu irgendeinem Punkt auf der Route berechnen
    for (let i = 0; i < routeCoords.length; i++) {
        const dist = calculateDistance(userLat, userLng, routeCoords[i].lat, routeCoords[i].lng);
        if (dist < minDist) {
            minDist = dist;
        }
    }

    return minDist > threshold;
}

module.exports = {
    calculateDistance,
    findNearestDefi,
    isOffRoute
};