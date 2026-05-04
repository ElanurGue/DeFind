// ===============================
// voiceNavigation.test.js
// Modultests für VoiceNavigation & NavigationController
// Setup: npm install --save-dev jest jest-environment-jsdom
// Ausführen: npx jest voiceNavigation.test.js
// ===============================

// ===============================
// MOCK: Audio & SpeechSynthesis
// ===============================

// Audio-Mock: ruft 'ended' sofort synchron auf damit die ganze Queue durchläuft
const playedAudios = [];
global.Audio = jest.fn().mockImplementation((src) => {
    const handlers = {};
    return {
        src,
        volume: 1,
        play: jest.fn().mockImplementation(function() {
            if (handlers['ended']) handlers['ended']();
            return Promise.resolve();
        }),
        addEventListener: jest.fn((event, cb) => {
            handlers[event] = cb;
        }),
    };
});

// SpeechSynthesis-Mock: ruft onend sofort synchron auf
const spokenTexts = [];
global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => {
    const utt = { text, lang: 'de-AT', volume: 1, rate: 1, onend: null, onerror: null };
    return utt;
});


// ===============================
// KLASSEN (kopiert aus voiceNavigation.js)
// ===============================

const BASE_PATH = 'sprachliche Weganweisungen/';

const AUDIO_FILES = {
    intro: { 10: '10.mp3', 20: '20.mp3', 30: '30.mp3' },
    direction: {
        left:     'links abbiegen.mp3',
        right:    'rechts abbiegen.mp3',
        straight: 'geradeaus weiter.mp3',
    },
    connector: {
        in_die:  'in die.mp3',
        auf_die: 'auf die.mp3',
        richtung: 'richtung.mp3',
    },
    immediate: {
        left:     'jetzt links abbiegen.mp3',
        right:    'jetzt rechts abbiegen.mp3',
        straight: 'weiter geradeaus.mp3',
    },
    arrival: {
        reached:   'ziel erreicht.mp3',
        left_side: 'ziel links.mp3',
        right_side:'ziel rechts.mp3',
    },
    reroute: {
        recalculating: 'route neu berechnet.mp3',
        return:        'route zurueck.mp3',
    },
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
        utterance.lang   = this.ttsLang;
        utterance.volume = this.volume;
        utterance.onend  = () => this._playNext();
        utterance.onerror = () => this._playNext();
        global.speechSynthesis.speak(utterance);
    }
    _clearQueue() { this.queue = []; this.isPlaying = false; global.speechSynthesis?.cancel(); }
}

class NavigationController {
    constructor(voiceNav) {
        this.voice = voiceNav;
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

// ===============================
// TESTS: T10 – Weganweisungen
// ===============================

describe('T10 – Sprachliche Weganweisungen', () => {

    let voiceNav;
    let navController;

    beforeEach(() => {
        jest.clearAllMocks();
        spokenTexts.length = 0;

        // ← NEU: Mock nach clearAllMocks wiederherstellen
    global.speechSynthesis = {
        speak: jest.fn((utterance) => {
            spokenTexts.push(utterance.text);
            if (utterance.onend) utterance.onend();
        }),
        cancel: jest.fn(),
    };

        voiceNav = new VoiceNavigation();
        navController = new NavigationController(voiceNav);
    });

    // ── Vorankündigung (30m) ───────────────────────────────────────

    describe('Vorankündigung bei 30m', () => {

        test('spielt Entfernungs-Audio ab bei 30m links', () => {
            voiceNav.announceApproaching(30, 'left', 'Margaretenstraße', 'in_die');
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + '30.mp3');
        });

        test('spielt Richtungs-Audio ab bei links abbiegen', () => {
            voiceNav.announceApproaching(30, 'left', 'Margaretenstraße', 'in_die');
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'links abbiegen.mp3');
        });

        test('spielt Richtungs-Audio ab bei rechts abbiegen', () => {
            voiceNav.announceApproaching(30, 'right', 'Hauptstraße', 'in_die');
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'rechts abbiegen.mp3');
        });

        test('spricht Straßenname per TTS aus', () => {
            voiceNav.announceApproaching(30, 'left', 'Margaretenstraße', 'in_die');
            expect(SpeechSynthesisUtterance).toHaveBeenCalledWith('Margaretenstraße');
        });

        test('spricht Straßenname auf Deutsch (de-AT)', () => {
            voiceNav.announceApproaching(30, 'left', 'Mariahilfer Straße', 'in_die');
            const sprechAufruf = global.speechSynthesis.speak.mock.calls[0][0];
            expect(sprechAufruf.lang).toBe('de-AT');
        });

        test('Box-Anzeige und Stimme stimmen überein: beide zeigen Straßenname', () => {
            // Stimme spricht Straßenname
            voiceNav.announceApproaching(30, 'left', 'Einsiedlergasse', 'in_die');
            expect(SpeechSynthesisUtterance).toHaveBeenCalledWith('Einsiedlergasse');
        });
    });

    // ── Direkte Abbiegeansage (5m) ─────────────────────────────────

    describe('Direkte Abbiegeansage bei 5m', () => {

        test('spielt "jetzt links abbiegen" bei 5m links', () => {
            voiceNav.announceImmediate('left');
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'jetzt links abbiegen.mp3');
        });

        test('spielt "jetzt rechts abbiegen" bei 5m rechts', () => {
            voiceNav.announceImmediate('right');
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'jetzt rechts abbiegen.mp3');
        });

        test('spielt "weiter geradeaus" bei geradeaus', () => {
            voiceNav.announceImmediate('straight');
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'weiter geradeaus.mp3');
        });
    });

    // ── Zielankunft ────────────────────────────────────────────────

    describe('Zielankunft', () => {

        test('spielt "ziel erreicht" Audio ab', () => {
            voiceNav.announceArrival('reached');
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'ziel erreicht.mp3');
        });

        test('spielt "ziel links" Audio ab', () => {
            voiceNav.announceArrival('left_side');
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'ziel links.mp3');
        });
    });

    // ── Routenneuberechnung ────────────────────────────────────────

    describe('Routenneuberechnung', () => {

        test('spielt "route neu berechnet" Audio ab', () => {
            voiceNav.announceRerouting();
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'route neu berechnet.mp3');
        });

        test('onReroute() spielt Neuberechnungs-Audio ab', () => {
            navController.onReroute();
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'route neu berechnet.mp3');
        });

        test('onReroute() setzt Status zurück', () => {
            navController._announced30m = true;
            navController._announced5m  = true;
            navController.onReroute();
            expect(navController._announced30m).toBe(false);
            expect(navController._announced5m).toBe(false);
        });

        test('nach onReroute() ist _silent = true', () => {
            navController.onReroute();
            expect(navController._silent).toBe(true);
        });
    });

    // ── NavigationController.update() ─────────────────────────────

    describe('NavigationController.update() – Triggerlogik', () => {

        test('keine Ansage bei Entfernung > 30m', () => {
            navController.update({ distance: 60, type: 'left', street: 'Testgasse', connector: 'in_die' });
            expect(Audio).not.toHaveBeenCalled();
        });

        test('Vorankündigung wird bei ≤ 30m ausgelöst', () => {
            navController.update({ distance: 28, type: 'left', street: 'Testgasse', connector: 'in_die' });
            expect(Audio).toHaveBeenCalled();
        });

        test('Vorankündigung wird nur einmal ausgelöst (nicht doppelt)', () => {
            const step = { distance: 28, type: 'left', street: 'Testgasse', connector: 'in_die' };
            navController.update(step);
            navController.update(step); // zweites Update, gleicher Schritt
            // Audio sollte nur einmal für 30m ausgelöst worden sein
            const calls = Audio.mock.calls.map(c => c[0]);
            const entfCalls = calls.filter(src => src.includes('30.mp3'));
            expect(entfCalls.length).toBe(1);
        });

        test('direkte Ansage wird bei ≤ 5m ausgelöst', () => {
            const step = { distance: 4, type: 'right', street: 'Testgasse', connector: 'in_die' };
            navController.update(step);
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'jetzt rechts abbiegen.mp3');
        });

        test('Zielankunft wird bei type "arrive" ausgelöst', () => {
            navController.update({ distance: 3, type: 'arrive', street: '', connector: 'in_die' });
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'ziel erreicht.mp3');
        });

        test('kein Audio wenn _silent = true', () => {
            navController._silent = true;
            navController.update({ distance: 10, type: 'left', street: 'Testgasse', connector: 'in_die' });
            expect(Audio).not.toHaveBeenCalled();
        });
    });

    // ── Lautstärke & Ein/Aus ───────────────────────────────────────

    describe('Lautstärke & Aktivierung', () => {

        test('kein Audio wenn disabled', () => {
            voiceNav.setEnabled(false);
            voiceNav.announceImmediate('left');
            expect(Audio).not.toHaveBeenCalled();
        });

        test('Audio wieder aktiv nach setEnabled(true)', () => {
            voiceNav.setEnabled(false);
            voiceNav.setEnabled(true);
            voiceNav.announceImmediate('left');
            expect(Audio).toHaveBeenCalled();
        });

        test('Lautstärke wird korrekt gesetzt', () => {
            voiceNav.setVolume(0.5);
            expect(voiceNav.volume).toBe(0.5);
        });

        test('Lautstärke wird auf 0–1 begrenzt', () => {
            voiceNav.setVolume(2.0);
            expect(voiceNav.volume).toBe(1.0);
            voiceNav.setVolume(-1.0);
            expect(voiceNav.volume).toBe(0.0);
        });
    });

    // ── Übereinstimmung Box-Anzeige & Stimme (T10) ────────────────

    describe('T10 – Box-Anzeige stimmt mit Stimme überein', () => {

        test('Straßenname in Stimme = Straßenname in Box-Anzeige', () => {
            const strassenname = 'Einsiedlergasse';
            voiceNav.announceApproaching(30, 'left', strassenname, 'in_die');
            // Stimme spricht denselben Straßennamen
            expect(SpeechSynthesisUtterance).toHaveBeenCalledWith(strassenname);
        });

        test('Richtung links → Stimme sagt links, Box zeigt ⬅️', () => {
            // Stimme
            voiceNav.announceApproaching(30, 'left', 'Testgasse', 'in_die');
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'links abbiegen.mp3');
        });

        test('Richtung rechts → Stimme sagt rechts, Box zeigt ➡️', () => {
            voiceNav.announceApproaching(30, 'right', 'Testgasse', 'in_die');
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + 'rechts abbiegen.mp3');
        });

        test('Entfernung 30m → Stimme sagt 30, Box zeigt max. 30m', () => {
            voiceNav.announceApproaching(30, 'left', 'Testgasse', 'in_die');
            expect(Audio).toHaveBeenCalledWith(BASE_PATH + '30.mp3');
        });
    });
});