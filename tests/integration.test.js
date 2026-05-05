// ===============================
// integration.test.js
// Integrationstests – Zusammenspiel mehrerer Komponenten
// Ausführen: npx jest integration.test.js
// ===============================

// ---------------------------------------------------------------
// IMPORTS – passe die Pfade an dein Projekt an
// ---------------------------------------------------------------
const {
    berechneEntfernung,
    calculateDistanceToRoute,
    shouldRecalculate,
    findNearestDefiPure,
} = require('../src/routing.logic.js');

// ---------------------------------------------------------------
// MOCK: Audio & SpeechSynthesis (wie in voiceNavigation.test.js)
// ---------------------------------------------------------------
const spokenTexts = [];

global.Audio = jest.fn().mockImplementation((src) => {
    const handlers = {};
    return {
        src,
        volume: 1,
        play: jest.fn().mockImplementation(function () {
            if (handlers['ended']) handlers['ended']();
            return Promise.resolve();
        }),
        addEventListener: jest.fn((event, cb) => {
            handlers[event] = cb;
        }),
    };
});

global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => {
    return { text, lang: 'de-AT', volume: 1, rate: 1, onend: null, onerror: null };
});

// ---------------------------------------------------------------
// KLASSEN (kopiert aus voiceNavigation.js)
// ---------------------------------------------------------------
const BASE_PATH = 'sprachliche Weganweisungen/';

const AUDIO_FILES = {
    intro:     { 10: '10.mp3', 20: '20.mp3', 30: '30.mp3' },
    direction: { left: 'links abbiegen.mp3', right: 'rechts abbiegen.mp3', straight: 'geradeaus weiter.mp3' },
    connector: { in_die: 'in die.mp3', auf_die: 'auf die.mp3', richtung: 'richtung.mp3' },
    immediate: { left: 'jetzt links abbiegen.mp3', right: 'jetzt rechts abbiegen.mp3', straight: 'weiter geradeaus.mp3' },
    arrival:   { reached: 'ziel erreicht.mp3', left_side: 'ziel links.mp3', right_side: 'ziel rechts.mp3' },
    reroute:   { recalculating: 'route neu berechnet.mp3', return: 'route zurueck.mp3' },
};

class VoiceNavigation {
    constructor() {
        this.enabled   = true;
        this.volume    = 1.0;
        this.queue     = [];
        this.isPlaying = false;
        this.ttsLang   = 'de-AT';
    }
    setEnabled(value) { this.enabled = value; if (!value) this._clearQueue(); }
    setVolume(value)  { this.volume = Math.min(1, Math.max(0, value)); }
    announceApproaching(distanceMeters, direction, streetName, connector = 'in_die') {
        if (!this.enabled) return;
        const introFile = AUDIO_FILES.intro[distanceMeters];
        const dirFile   = AUDIO_FILES.direction[direction];
        const conFile   = AUDIO_FILES.connector[connector];
        if (!introFile || !dirFile || !conFile) return;
        this._enqueue([
            { type: 'audio', src: BASE_PATH + introFile },
            { type: 'audio', src: BASE_PATH + dirFile },
            { type: 'tts',   text: streetName },
        ]);
    }
    announceImmediate(direction) {
        if (!this.enabled) return;
        const file = AUDIO_FILES.immediate[direction];
        if (!file) return;
        this._enqueue([{ type: 'audio', src: BASE_PATH + file }]);
    }
    announceArrival(variant = 'reached') {
        if (!this.enabled) return;
        const file = AUDIO_FILES.arrival[variant];
        if (!file) return;
        this._enqueue([{ type: 'audio', src: BASE_PATH + file }]);
    }
    announceRerouting() {
        if (!this.enabled) return;
        this._enqueue([{ type: 'audio', src: BASE_PATH + AUDIO_FILES.reroute.recalculating }]);
    }
    _enqueue(segments) {
        this.queue.push(...segments);
        if (!this.isPlaying) this._playNext();
    }
    _playNext() {
        if (this.queue.length === 0) { this.isPlaying = false; return; }
        this.isPlaying = true;
        const segment = this.queue.shift();
        if (segment.type === 'audio') this._playAudio(segment.src);
        else if (segment.type === 'tts') this._playTTS(segment.text);
    }
    _playAudio(src) {
        const audio = new Audio(src);
        audio.volume = this.volume;
        audio.addEventListener('ended', () => this._playNext());
        audio.addEventListener('error', () => this._playNext());
        audio.play().catch(() => this._playNext());
    }
    _playTTS(text) {
        if (!global.speechSynthesis) { this._playNext(); return; }
        global.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang    = this.ttsLang;
        utterance.volume  = this.volume;
        utterance.onend   = () => this._playNext();
        utterance.onerror = () => this._playNext();
        global.speechSynthesis.speak(utterance);
    }
    _clearQueue() { this.queue = []; this.isPlaying = false; global.speechSynthesis?.cancel(); }
}

class NavigationController {
    constructor(voiceNav) {
        this.voice         = voiceNav;
        this._announced30m = false;
        this._announced5m  = false;
        this._currentStep  = null;
        this._silent       = false;
    }
    resetState() {
        this._announced30m = false;
        this._announced5m  = false;
        this._currentStep  = null;
    }
    update(step) {
        if (this._silent) return;
        if (step !== this._currentStep) {
            this._currentStep  = step;
            this._announced30m = false;
            this._announced5m  = false;
        }
        const dist = step.distance;
        if (step.type === 'arrive') {
            if (!this._announced5m) { this._announced5m = true; this.voice.announceArrival('reached'); }
            return;
        }
        if (dist <= 5 && !this._announced5m) {
            this._announced5m = true;
            this.voice.announceImmediate(step.type);
            return;
        }
        if (dist <= 30 && !this._announced30m) {
            this._announced30m = true;
            const rounded = Math.round(dist / 10) * 10 || 10;
            this.voice.announceApproaching(rounded, step.type, step.street || '', step.connector || 'in_die');
        }
    }
    onReroute() {
        this.voice.announceRerouting();
        this._announced30m = false;
        this._announced5m  = false;
        this._currentStep  = null;
        this._silent = true;
        setTimeout(() => { this._silent = false; }, 4000);
    }
}

// ---------------------------------------------------------------
// DOM-Hilfsfunktionen (kopiert aus navigation.js)
// ---------------------------------------------------------------
function bestimmePfeil(typ) {
    if (!typ) return '⬆️';
    const t = typ.toLowerCase();
    if (t.includes('left'))   return '⬅️';
    if (t.includes('right'))  return '➡️';
    if (t.includes('arrive')) return '🏁';
    return '⬆️';
}

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
    document.getElementById('nav-pfeil').textContent      = pfeil;
    document.getElementById('nav-entfernung').textContent = Math.round(entfernung) + ' m';
    document.getElementById('nav-strasse').textContent    = strasse || '';
}


// ================================================================
// INTEGRATIONSTESTS
// ================================================================

// ── bereits vorhandener Integrationstest (aus routing.test.js) ──

describe('IT-01 | calculateDistanceToRoute() + shouldRecalculate()', () => {

    const testRoute = [
        { lat: 48.200, lng: 16.370 },
        { lat: 48.201, lng: 16.371 },
        { lat: 48.202, lng: 16.372 },
    ];

    test('Nutzer auf Route → kein Recalculate', () => {
        const dist = calculateDistanceToRoute(testRoute, 48.200, 16.370);
        expect(shouldRecalculate(dist)).toBe(false);
    });

    test('Nutzer weit von Route → Recalculate wird ausgelöst', () => {
        const dist = calculateDistanceToRoute(testRoute, 48.201 + 0.002, 16.371 + 0.002);
        expect(shouldRecalculate(dist)).toBe(true);
    });
});


// ── NEU: Routenabweichung löst Sprachansage aus ──────────────────

describe('IT-02 | calculateDistanceToRoute() + shouldRecalculate() + announceRerouting()', () => {

    let voiceNav;

    beforeEach(() => {
        jest.clearAllMocks();
        spokenTexts.length = 0;
        global.speechSynthesis = { speak: jest.fn(), cancel: jest.fn() };
        voiceNav = new VoiceNavigation();
    });

    const testRoute = [
        { lat: 48.200, lng: 16.370 },
        { lat: 48.201, lng: 16.371 },
    ];

    test('Abweichung > 15m → Neuberechnung → Sprachansage wird abgespielt', () => {
        const dist = calculateDistanceToRoute(testRoute, 48.210, 16.390); // weit daneben
        if (shouldRecalculate(dist)) {
            voiceNav.announceRerouting();
        }
        expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'route neu berechnet.mp3');
    });

    test('Nutzer auf Route → keine Sprachansage', () => {
        const dist = calculateDistanceToRoute(testRoute, 48.200, 16.370); // direkt auf Route
        if (shouldRecalculate(dist)) {
            voiceNav.announceRerouting();
        }
        expect(Audio).not.toHaveBeenCalled();
    });
});


// ── NEU: Nächster Defi + Distanzberechnung ───────────────────────

describe('IT-03 | findNearestDefiPure() + berechneEntfernung()', () => {

    const defis = [
        { id: 1, latitude: 48.181, longitude: 16.356 },
        { id: 2, latitude: 48.195, longitude: 16.353 },
        { id: 3, latitude: 48.190, longitude: 16.360 },
    ];

    test('nächster Defi wird gefunden und Distanz dazu berechnet', () => {
        const userLat = 48.190;
        const userLng = 16.360;

        const nearest = findNearestDefiPure(defis, userLat, userLng);
        expect(nearest.id).toBe(3);

        const dist = berechneEntfernung(userLat, userLng, nearest.latitude, nearest.longitude);
        expect(dist).toBeCloseTo(0, 1); // Nutzer direkt beim Defi
    });

    test('Distanz zum nächsten Defi ist kleiner als zu den anderen', () => {
        const userLat = 48.181;
        const userLng = 16.356;

        const nearest = findNearestDefiPure(defis, userLat, userLng);
        const distNearest = berechneEntfernung(userLat, userLng, nearest.latitude, nearest.longitude);

        defis.forEach(defi => {
            const dist = berechneEntfernung(userLat, userLng, defi.latitude, defi.longitude);
            expect(distNearest).toBeLessThanOrEqual(dist);
        });
    });
});


// ── NEU: Pfeilermittlung + DOM-Anzeige ───────────────────────────

describe('IT-04 | bestimmePfeil() + aktualisiereNavAnzeige()', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
        createNavBox();
    });

    test('Typ "turn-left" → Pfeil ⬅️ wird in der Navigationsbox angezeigt', () => {
        const pfeil = bestimmePfeil('turn-left');
        aktualisiereNavAnzeige(200, pfeil, 'Hauptstraße');
        expect(document.getElementById('nav-pfeil').textContent).toBe('⬅️');
    });

    test('Typ "turn-right" → Pfeil ➡️ wird in der Navigationsbox angezeigt', () => {
        const pfeil = bestimmePfeil('turn-right');
        aktualisiereNavAnzeige(50, pfeil, 'Ringstraße');
        expect(document.getElementById('nav-pfeil').textContent).toBe('➡️');
    });

    test('Typ "arrive" → Flagge 🏁 und Entfernung werden korrekt angezeigt', () => {
        const pfeil = bestimmePfeil('arrive');
        aktualisiereNavAnzeige(10, pfeil, 'Zielstraße');
        expect(document.getElementById('nav-pfeil').textContent).toBe('🏁');
        expect(document.getElementById('nav-entfernung').textContent).toBe('10 m');
    });

    test('Straßenname in Box stimmt mit übergebenem Wert überein', () => {
        const pfeil = bestimmePfeil('straight');
        aktualisiereNavAnzeige(100, pfeil, 'Mariahilfer Straße');
        expect(document.getElementById('nav-strasse').textContent).toBe('Mariahilfer Straße');
    });
});


// ── NEU: NavigationController + VoiceNavigation ─────────────────

describe('IT-05 | NavigationController.update() + VoiceNavigation', () => {

    let voiceNav;
    let navController;

    beforeEach(() => {
        jest.clearAllMocks();
        spokenTexts.length = 0;
        global.speechSynthesis = {
            speak: jest.fn((utterance) => {
                spokenTexts.push(utterance.text);
                if (utterance.onend) utterance.onend();
            }),
            cancel: jest.fn(),
        };
        voiceNav       = new VoiceNavigation();
        navController  = new NavigationController(voiceNav);
    });

    test('Navigationsschritt bei 28m → Vorankündigungs-Audio wird abgespielt', () => {
        navController.update({ distance: 28, type: 'left', street: 'Testgasse', connector: 'in_die' });
        expect(Audio).toHaveBeenCalledWith(BASE_PATH + '30.mp3');
        expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'links abbiegen.mp3');
    });

    test('Navigationsschritt bei 4m → direkte Abbiegeansage wird abgespielt', () => {
        navController.update({ distance: 4, type: 'right', street: 'Testgasse', connector: 'in_die' });
        expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'jetzt rechts abbiegen.mp3');
    });

    test('Zielankunft → "ziel erreicht" wird abgespielt', () => {
        navController.update({ distance: 2, type: 'arrive', street: '', connector: 'in_die' });
        expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'ziel erreicht.mp3');
    });

    test('onReroute() → Neuberechnungs-Audio und Status-Reset', () => {
        navController._announced30m = true;
        navController._announced5m  = true;
        navController.onReroute();
        expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'route neu berechnet.mp3');
        expect(navController._announced30m).toBe(false);
        expect(navController._announced5m).toBe(false);
    });

    test('Straßenname wird per TTS mit korrekter Sprache ausgesprochen', () => {
        navController.update({ distance: 28, type: 'left', street: 'Einsiedlergasse', connector: 'in_die' });
        expect(SpeechSynthesisUtterance).toHaveBeenCalledWith('Einsiedlergasse');
        const utterance = global.speechSynthesis.speak.mock.calls[0][0];
        expect(utterance.lang).toBe('de-AT');
    });
});