//Distanz-Berechnung
const {
    calculateDistance,
    findNearestDefi,
    isOffRoute
} = require('../src/defiUtils');

test('calculateDistance gibt 0 bei gleichen Koordinaten zurück', () => {
    const dist = calculateDistance(48.2, 16.3, 48.2, 16.3);
    expect(dist).toBe(0);
});

//Distanz ist realistisch
test('calculateDistance berechnet realistische Distanz', () => {
    const dist = calculateDistance(
        48.2082, 16.3738,   // Wien Zentrum
        48.2100, 16.3700
    );

    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(1000);
});

//nächsten Defi finden 

test('findNearestDefi findet den nächstgelegenen Defi', () => {
    const defiList = [
          { id: 1, latitude: 48.14, longitude: 16.34 }, // näher
          { id: 2, latitude: 48.3,  longitude: 16.6 }   // weiter weg
    ];

    const nearest = findNearestDefi(48.15, 16.35, defiList);

    expect(nearest.id).toBe(1);
});

//für leere Defi-Liste
test('findNearestDefi gibt null zurück bei leerer Liste', () => {
    const nearest = findNearestDefi(48.2, 16.3, []);
    expect(nearest).toBeNull();
});

//für ungültige Daten
test('findNearestDefi gibt null bei ungültigen Daten', () => {
    const nearest = findNearestDefi(48.2, 16.3, null);
    expect(nearest).toBeNull();
});

// Abweichungserkennung

test('isOffRoute gibt false zurück wenn Nutzer genau auf der Route ist', () => {
    const routeCoords = [
        { lat: 48.200, lng: 16.370 },
        { lat: 48.201, lng: 16.371 },
        { lat: 48.202, lng: 16.372 }
    ];
    const result = isOffRoute(48.200, 16.370, routeCoords);
    expect(result).toBe(false);
});

test('isOffRoute gibt true zurück wenn Nutzer mehr als 15m von der Route entfernt ist', () => {
    const routeCoords = [
        { lat: 48.200, lng: 16.370 },
        { lat: 48.201, lng: 16.371 }
    ];
    // Position weit daneben
    const result = isOffRoute(48.205, 16.380, routeCoords);
    expect(result).toBe(true);
});

test('isOffRoute gibt false zurück bei exakt 15m (Grenzwert)', () => {
    // 15m entspricht ca. 0.000135 Grad Breitengrad
    const routeCoords = [{ lat: 48.200, lng: 16.370 }];
    // Nutzer genau auf dem Punkt → 0m → kein Recalc
    const result = isOffRoute(48.200, 16.370, routeCoords, 15);
    expect(result).toBe(false);
});

test('isOffRoute gibt false zurück bei leerer Route', () => {
    const result = isOffRoute(48.200, 16.370, []);
    expect(result).toBe(false);
});

test('isOffRoute gibt false zurück wenn routeCoords null ist', () => {
    const result = isOffRoute(48.200, 16.370, null);
    expect(result).toBe(false);
});

test('isOffRoute funktioniert mit eigenem threshold', () => {
    const routeCoords = [{ lat: 48.200, lng: 16.370 }];
    // ~20m daneben, threshold = 30 → kein Recalc
    const result = isOffRoute(48.2002, 16.370, routeCoords, 30);
    expect(result).toBe(false);
});