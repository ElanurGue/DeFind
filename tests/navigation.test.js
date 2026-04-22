// ===============================
// navigation.test.js
// Modultests für navigation.js
// Setup: npm install --save-dev jest jest-environment-jsdom
// Ausführen: npx jest navigation.test.js
// ===============================

// ---------------------------------------------------------------
// Hilfsfunktionen direkt hier definiert (oder per import/require)
// Falls du ES-Module nutzt: export die Funktionen in navigation.js
// und importiere sie hier. Für CommonJS: module.exports = { ... }
// ---------------------------------------------------------------

function bestimmePfeil(typ) {
    if (!typ) return '⬆️';
    const t = typ.toLowerCase();
    if (t.includes('left'))  return '⬅️';
    if (t.includes('right')) return '➡️';
    if (t.includes('arrive')) return '🏁';
    return '⬆️';
}

function berechneEntfernung(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ===============================
// TESTS: bestimmePfeil()
// ===============================
describe('bestimmePfeil()', () => {

    // --- Normalfälle ---
    test('gibt Linkspfeil zurück bei "turn-left"', () => {
        expect(bestimmePfeil('turn-left')).toBe('⬅️');
    });

    test('gibt Rechtspfeil zurück bei "turn-right"', () => {
        expect(bestimmePfeil('turn-right')).toBe('➡️');
    });

    test('gibt Zielflagge zurück bei "arrive"', () => {
        expect(bestimmePfeil('arrive')).toBe('🏁');
    });

    test('gibt geradeaus Pfeil zurück bei "straight"', () => {
        expect(bestimmePfeil('straight')).toBe('⬆️');
    });

    // --- Groß-/Kleinschreibung ---
    test('ist case-insensitiv: "TURN-LEFT" → Linkspfeil', () => {
        expect(bestimmePfeil('TURN-LEFT')).toBe('⬅️');
    });

    test('ist case-insensitiv: "TURN-RIGHT" → Rechtspfeil', () => {
        expect(bestimmePfeil('TURN-RIGHT')).toBe('➡️');
    });

    test('ist case-insensitiv: "ARRIVE" → Zielflagge', () => {
        expect(bestimmePfeil('ARRIVE')).toBe('🏁');
    });

    // --- Teilstrings ---
    test('erkennt "left" auch als Teilstring: "sharp-left"', () => {
        expect(bestimmePfeil('sharp-left')).toBe('⬅️');
    });

    test('erkennt "right" auch als Teilstring: "slight-right"', () => {
        expect(bestimmePfeil('slight-right')).toBe('➡️');
    });

    // --- Grenzfälle ---
    test('gibt Standard-Pfeil zurück bei null', () => {
        expect(bestimmePfeil(null)).toBe('⬆️');
    });

    test('gibt Standard-Pfeil zurück bei undefined', () => {
        expect(bestimmePfeil(undefined)).toBe('⬆️');
    });

    test('gibt Standard-Pfeil zurück bei leerem String', () => {
        expect(bestimmePfeil('')).toBe('⬆️');
    });

    test('gibt Standard-Pfeil zurück bei unbekanntem Typ "merge"', () => {
        expect(bestimmePfeil('merge')).toBe('⬆️');
    });
});

// ===============================
// TESTS: berechneEntfernung()
// ===============================
describe('berechneEntfernung()', () => {

    // --- Gleicher Punkt → 0 Meter ---
    test('gibt 0 zurück wenn Start = Ziel (Wien Stephansdom)', () => {
        const dist = berechneEntfernung(48.2085, 16.3731, 48.2085, 16.3731);
        expect(dist).toBeCloseTo(0, 1);
    });

    // --- Bekannte Distanzen ---
    test('Distanz Wien–Bratislava liegt zwischen 50 und 70 km', () => {
        // Wien: 48.2092, 16.3728 | Bratislava: 48.1486, 17.1077
        const dist = berechneEntfernung(48.2092, 16.3728, 48.1486, 17.1077);
        expect(dist).toBeGreaterThan(50000);
        expect(dist).toBeLessThan(70000);
    });

    test('Distanz zweier naher Punkte in Wien (~500 m)', () => {
        // Stephansdom → Karlskirche (ca. 1 km Luftlinie)
        const dist = berechneEntfernung(48.2085, 16.3731, 48.1985, 16.3731);
        expect(dist).toBeGreaterThan(900);
        expect(dist).toBeLessThan(1200);
    });

    // --- Symmetrie ---
    test('Distanz A→B gleich wie B→A (Symmetrie)', () => {
        const dist1 = berechneEntfernung(48.2085, 16.3731, 48.1486, 17.1077);
        const dist2 = berechneEntfernung(48.1486, 17.1077, 48.2085, 16.3731);
        expect(dist1).toBeCloseTo(dist2, 1);
    });

    // --- Rückgabewert ist eine Zahl ---
    test('gibt einen numerischen Wert zurück', () => {
        const dist = berechneEntfernung(0, 0, 1, 1);
        expect(typeof dist).toBe('number');
        expect(isNaN(dist)).toBe(false);
    });

    // --- Äquator: 1 Längengrad ≈ 111 km ---
    test('1 Breitengrad am Äquator entspricht ~111 km', () => {
        const dist = berechneEntfernung(0, 0, 1, 0);
        expect(dist).toBeGreaterThan(110000);
        expect(dist).toBeLessThan(112000);
    });

    // --- Negative Koordinaten ---
    test('funktioniert mit negativen Koordinaten (Südamerika)', () => {
        const dist = berechneEntfernung(-23.5505, -46.6333, -22.9068, -43.1729);
        expect(dist).toBeGreaterThan(300000); // São Paulo → Rio: ~360 km
        expect(dist).toBeLessThan(450000);
    });
});

// ===============================
// TESTS: DOM-Funktionen (mit jsdom)
// @jest-environment jsdom
// ===============================

// Kopiere diese Funktionen aus navigation.js oder importiere sie
function createNavBox() {
    if (document.getElementById('nav-box')) return;
    const navBox = document.createElement('div');
    navBox.id = 'nav-box';
    navBox.style.cssText = 'display: none;';
    navBox.innerHTML = `
        <div id="nav-pfeil" style="font-size: 40px;">⬆️</div>
        <div id="nav-entfernung" style="font-size: 22px;">-- m</div>
        <div id="nav-strasse" style="font-size: 13px;"></div>
    `;
    document.body.appendChild(navBox);
}

function aktualisiereNavAnzeige(entfernung, pfeil, strasse) {
    const box = document.getElementById('nav-box');
    if (!box) return;
    box.style.display = 'block';
    document.getElementById('nav-pfeil').textContent = pfeil;
    document.getElementById('nav-entfernung').textContent = Math.round(entfernung) + ' m';
    document.getElementById('nav-strasse').textContent = strasse || '';
}

function verbergeNavAnzeige() {
    const box = document.getElementById('nav-box');
    if (box) box.style.display = 'none';
}

describe('createNavBox()', () => {

    beforeEach(() => {
        // DOM vor jedem Test zurücksetzen
        document.body.innerHTML = '';
    });

    test('erstellt eine nav-box im DOM', () => {
        createNavBox();
        expect(document.getElementById('nav-box')).not.toBeNull();
    });

    test('enthält nav-pfeil, nav-entfernung, nav-strasse', () => {
        createNavBox();
        expect(document.getElementById('nav-pfeil')).not.toBeNull();
        expect(document.getElementById('nav-entfernung')).not.toBeNull();
        expect(document.getElementById('nav-strasse')).not.toBeNull();
    });

    test('box ist initial ausgeblendet (display: none)', () => {
        createNavBox();
        const box = document.getElementById('nav-box');
        expect(box.style.display).toBe('none');
    });

    test('wird nicht doppelt erstellt bei mehrfachem Aufruf', () => {
        createNavBox();
        createNavBox();
        const boxes = document.querySelectorAll('#nav-box');
        expect(boxes.length).toBe(1);
    });
});

describe('aktualisiereNavAnzeige()', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
        createNavBox();
    });

    test('zeigt die Box an', () => {
        aktualisiereNavAnzeige(200, '⬅️', 'Hauptstraße');
        expect(document.getElementById('nav-box').style.display).toBe('block');
    });

    test('setzt den Pfeil korrekt', () => {
        aktualisiereNavAnzeige(200, '⬅️', 'Hauptstraße');
        expect(document.getElementById('nav-pfeil').textContent).toBe('⬅️');
    });

    test('rundet die Entfernung und hängt " m" an', () => {
        aktualisiereNavAnzeige(123.7, '⬆️', 'Ringstraße');
        expect(document.getElementById('nav-entfernung').textContent).toBe('124 m');
    });

    test('setzt den Straßennamen', () => {
        aktualisiereNavAnzeige(50, '➡️', 'Mariahilfer Straße');
        expect(document.getElementById('nav-strasse').textContent).toBe('Mariahilfer Straße');
    });

    test('zeigt leeren Straßennamen wenn keiner übergeben wird', () => {
        aktualisiereNavAnzeige(50, '⬆️', null);
        expect(document.getElementById('nav-strasse').textContent).toBe('');
    });

    test('tut nichts wenn nav-box nicht existiert', () => {
        document.body.innerHTML = ''; // Box entfernen
        expect(() => aktualisiereNavAnzeige(100, '⬆️', 'Test')).not.toThrow();
    });
});

describe('verbergeNavAnzeige()', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
        createNavBox();
    });

    test('setzt display auf none', () => {
        const box = document.getElementById('nav-box');
        box.style.display = 'block';
        verbergeNavAnzeige();
        expect(box.style.display).toBe('none');
    });

    test('wirft keinen Fehler wenn box nicht existiert', () => {
        document.body.innerHTML = '';
        expect(() => verbergeNavAnzeige()).not.toThrow();
    });
});