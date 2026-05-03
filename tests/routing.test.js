/**
 * routing.test.js
 * Automatisierte Tests für routing.logic.js
 *
 * Ausführen:
 *   npm test              → einmal ausführen
 *   npm run test:watch    → bei Dateiänderung automatisch neu ausführen
 *   npm run test:coverage → mit Abdeckungsbericht
 */

const {
    berechneEntfernung,
    calculateDistanceToRoute,
    shouldRecalculate,
    findNearestDefiPure
} = require('../src/routing.logic.js');


// ================================================================
// berechneEntfernung()
// ================================================================
describe('berechneEntfernung()', () => {

    test('gleicher Punkt ergibt 0 Meter', () => {
        expect(berechneEntfernung(48.2, 16.3, 48.2, 16.3)).toBeCloseTo(0, 1);
    });

    test('Stephansdom → Karlsplatz ≈ 1090 m (bekannte Wiener Distanz)', () => {
        const dist = berechneEntfernung(48.2085, 16.3731, 48.1990, 16.3695);
        expect(dist).toBeGreaterThan(900);
        expect(dist).toBeLessThan(1300);
    });

    test('gibt immer einen positiven Wert zurück', () => {
        expect(berechneEntfernung(48.1, 16.3, 48.2, 16.4)).toBeGreaterThan(0);
        expect(berechneEntfernung(48.2, 16.4, 48.1, 16.3)).toBeGreaterThan(0); // umgekehrt
    });

    test('Symmetrie: A→B == B→A', () => {
        const ab = berechneEntfernung(48.18, 16.35, 48.19, 16.36);
        const ba = berechneEntfernung(48.19, 16.36, 48.18, 16.35);
        expect(ab).toBeCloseTo(ba, 5);
    });

    test('größere Koordinatendifferenz = größere Entfernung', () => {
        const nah = berechneEntfernung(48.18, 16.35, 48.181, 16.351);
        const weit = berechneEntfernung(48.18, 16.35, 48.19, 16.36);
        expect(weit).toBeGreaterThan(nah);
    });
});


// ================================================================
// shouldRecalculate()  ←  Kernlogik der Routenneuberechnung
// ================================================================
describe('shouldRecalculate()', () => {

    test('exakt 15 m → KEINE Neuberechnung (threshold ist exklusiv)', () => {
        expect(shouldRecalculate(15)).toBe(false);
    });

    test('16 m → Neuberechnung nötig', () => {
        expect(shouldRecalculate(16)).toBe(true);
    });

    test('0 m → keine Neuberechnung', () => {
        expect(shouldRecalculate(0)).toBe(false);
    });

    test('100 m → Neuberechnung nötig', () => {
        expect(shouldRecalculate(100)).toBe(true);
    });

    test('14.99 m → keine Neuberechnung', () => {
        expect(shouldRecalculate(14.99)).toBe(false);
    });

    test('eigener Schwellenwert: 20 m erlaubt, 26 m triggert', () => {
        expect(shouldRecalculate(20, 25)).toBe(false);
        expect(shouldRecalculate(26, 25)).toBe(true);
    });

    test('Default-Threshold ist 15', () => {
        // explizit übergeben vs. Default – gleiche Ergebnisse
        expect(shouldRecalculate(10, 15)).toBe(shouldRecalculate(10));
        expect(shouldRecalculate(20, 15)).toBe(shouldRecalculate(20));
    });
});


// ================================================================
// calculateDistanceToRoute()
// ================================================================
describe('calculateDistanceToRoute()', () => {

    const testRoute = [
        { lat: 48.200, lng: 16.370 },
        { lat: 48.201, lng: 16.371 },
        { lat: 48.202, lng: 16.372 },
    ];

    test('leere Route gibt 0 zurück', () => {
        expect(calculateDistanceToRoute([], 48.2, 16.37)).toBe(0);
    });

    test('null/undefined Route gibt 0 zurück', () => {
        expect(calculateDistanceToRoute(null, 48.2, 16.37)).toBe(0);
        expect(calculateDistanceToRoute(undefined, 48.2, 16.37)).toBe(0);
    });

    test('Nutzer genau auf dem ersten Routenpunkt → ~0 m', () => {
        const dist = calculateDistanceToRoute(testRoute, 48.200, 16.370);
        expect(dist).toBeCloseTo(0, 1);
    });

    test('Nutzer genau auf dem mittleren Routenpunkt → ~0 m', () => {
        const dist = calculateDistanceToRoute(testRoute, 48.201, 16.371);
        expect(dist).toBeCloseTo(0, 1);
    });

    test('gibt die MINIMALE Distanz zurück (nicht die zum letzten Punkt)', () => {
        // Nutzer ist sehr nah an Punkt 1 (48.200/16.370) aber weit von Punkt 3
        // → muss Distanz zu Punkt 1 zurückgeben, nicht zu Punkt 3
        const distGesamt = calculateDistanceToRoute(testRoute, 48.200, 16.370);
        const distNurLetzer = berechneEntfernung(48.200, 16.370, 48.202, 16.372);
        expect(distGesamt).toBeLessThan(distNurLetzer);
    });

    test('Nutzer 50 m neben Route → Wert > 0', () => {
        // leicht verschobene Position
        const dist = calculateDistanceToRoute(testRoute, 48.2005, 16.3704);
        expect(dist).toBeGreaterThan(0);
    });

    test('Entfernung triggert shouldRecalculate korrekt wenn kombiniert', () => {
        // Integration: 2m von Route → kein Recalc; 20m von Route → Recalc
        const distNah = calculateDistanceToRoute(testRoute, 48.200, 16.370); // ~0m
        const distWeit = calculateDistanceToRoute(
            testRoute, 48.201 + 0.002, 16.371 + 0.002 // deutlich daneben
        );
        expect(shouldRecalculate(distNah)).toBe(false);
        expect(shouldRecalculate(distWeit)).toBe(true);
    });
});


// ================================================================
// findNearestDefiPure()
// ================================================================
describe('findNearestDefiPure()', () => {

    const defis = [
        { id: 1, latitude: 48.181, longitude: 16.356,
          adresse: { straße: 'Leopold-Rister-Gasse', hausnummer: '5' } },
        { id: 2, latitude: 48.195, longitude: 16.353,
          adresse: { straße: 'Hamburgerstraße', hausnummer: '9' } },
        { id: 3, latitude: 48.190, longitude: 16.360,
          adresse: { straße: 'Einsiedlergasse', hausnummer: '2' } },
    ];

    test('findet den nächstgelegenen Defi korrekt', () => {
        // Nutzer direkt bei id:3
        const result = findNearestDefiPure(defis, 48.190, 16.360);
        expect(result.id).toBe(3);
    });

    test('findet den richtigen wenn Nutzer bei id:1', () => {
        const result = findNearestDefiPure(defis, 48.181, 16.356);
        expect(result.id).toBe(1);
    });

    test('gibt null zurück bei leerer Liste', () => {
        expect(findNearestDefiPure([], 48.2, 16.3)).toBeNull();
    });

    test('gibt null zurück bei null', () => {
        expect(findNearestDefiPure(null, 48.2, 16.3)).toBeNull();
    });

    test('funktioniert mit einem einzigen Defi', () => {
        const result = findNearestDefiPure([defis[0]], 48.0, 16.0);
        expect(result.id).toBe(1);
    });

    test('gibt das korrekte Defi-Objekt zurück (nicht nur die ID)', () => {
        const result = findNearestDefiPure(defis, 48.195, 16.353);
        expect(result).toHaveProperty('latitude');
        expect(result).toHaveProperty('longitude');
        expect(result).toHaveProperty('adresse');
    });
});
