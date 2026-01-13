//Distanz-Berechnung
const {
    calculateDistance,
    findNearestDefi
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
