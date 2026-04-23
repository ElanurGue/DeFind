/**
 * DeFind – Sprachnavigation
 * Spielt voraufgezeichnete Audiodateien aus dem Ordner "sprachliche Anweisungen" ab.
 * Sätze werden aus Einzelteilen zusammengesetzt (z. B. Entfernung + Richtung + Straßenname).
 * Für den Straßennamen wird Web Speech API (Text-to-Speech) verwendet.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PFAD-KONFIGURATION
// Passe BASE_PATH an deinen tatsächlichen Ordnerpfad an.
// ─────────────────────────────────────────────────────────────────────────────
const BASE_PATH = "sprachliche Weganweisungen/";

/**
 * Alle verfügbaren Audiodateien, gegliedert nach Kategorie.
 * Die Dateinamen müssen exakt mit deinen aufgenommenen Dateien übereinstimmen.
 */
const AUDIO_FILES = {
  // Einleitungen (30 m vorher)
  intro: {
    10: "10.mp3",
    20: "20.mp3",
    30: "30.mp3",
  },

  // Richtungen
  direction: {
    left:     "links abbiegen.mp3",
    right:    "rechts abbiegen.mp3",
    straight: "geradeaus weiter.mp3",
  },

  // Anschlüsse mit Straßenname
  connector: {
    in_die:  "in die.mp3",
    auf_die: "auf die.mp3",
    richtung:"richtung.mp3",
  },

  // Direkte Abbiegeansagen (5 m vorher)
  immediate: {
    left:     "jetzt links abbiegen.mp3",
    right:    "jetzt rechts abbiegen.mp3",
    straight: "weiter geradeaus.mp3",
  },

  // Ziel & Ankünfte
  arrival: {
    reached:      "ziel erreicht.mp3",
    left_side:    "ziel links.mp3",
    right_side:   "ziel rechts.mp3",
  },

  // Routenneuberechnung
  reroute: {
    recalculating: "route neu berechnet.mp3",
    return:        "route zurueck.mp3",
  },

  // Entfernungen (für 5-m-Ansagen falls benötigt)
  meters: {
    5:  "5.mp3",
    10: "10.mp3",
    15: "15.mp3",
    20: "20.mp3",
    25: "25.mp3",
    30: "30.mp3",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SPRACHNAVIGATION – KLASSE
// ─────────────────────────────────────────────────────────────────────────────

class VoiceNavigation {
  constructor() {
    this.enabled = true;          // Sprachausgabe ein/aus
    this.volume = 1.0;            // Lautstärke 0.0 – 1.0
    this.queue = [];              // Warteschlange für Audio-Segmente
    this.isPlaying = false;       // Läuft gerade etwas?
    this.ttsLang = "de-AT";       // Sprache für Text-to-Speech (Straßennamen)
  }

  // ── Einstellungen ──────────────────────────────────────────────────────────

  /** Sprachausgabe aktivieren / deaktivieren */
  setEnabled(value) {
    this.enabled = value;
    if (!value) this._clearQueue();
  }

  /** Lautstärke setzen (0.0 – 1.0) */
  setVolume(value) {
    this.volume = Math.min(1, Math.max(0, value));
  }

  // ── Öffentliche Methoden ───────────────────────────────────────────────────

  /**
   * Ansage 30 m vor einer Abbiegung.
   * Beispiel: "In 30 Metern links abbiegen in die Hauptstraße."
   *
   * @param {number} distanceMeters - 10 | 20 | 30
   * @param {"left"|"right"|"straight"} direction
   * @param {string} streetName - Straßenname (wird per TTS gesprochen)
   * @param {"in_die"|"auf_die"|"richtung"} [connector="in_die"]
   */
  announceApproaching(distanceMeters, direction, streetName, connector = "in_die") {
    if (!this.enabled) return;

    const introFile = AUDIO_FILES.intro[distanceMeters];
    const dirFile   = AUDIO_FILES.direction[direction];
    const conFile   = AUDIO_FILES.connector[connector];

    if (!introFile || !dirFile || !conFile) {
      console.warn("VoiceNav: Unbekannte Entfernung, Richtung oder Anschluss.", {
        distanceMeters, direction, connector,
      });
      return;
    }

    // Warteschlange: [Audiodatei, Audiodatei, Audiodatei, TTS-Text]
    this._enqueue([
      { type: "audio", src: BASE_PATH + introFile },
      { type: "audio", src: BASE_PATH + dirFile },
      { type: "audio", src: BASE_PATH + conFile },
      { type: "tts",   text: streetName },
    ]);
  }

  /**
   * Direkte Abbiegeansage ~5 m vor der Abbiegung.
   * Beispiel: "Jetzt links abbiegen."
   *
   * @param {"left"|"right"|"straight"} direction
   */
  announceImmediate(direction) {
    if (!this.enabled) return;

    const file = AUDIO_FILES.immediate[direction];
    if (!file) {
      console.warn("VoiceNav: Unbekannte Richtung für sofortige Ansage.", direction);
      return;
    }

    this._enqueue([{ type: "audio", src: BASE_PATH + file }]);
  }

  /**
   * Zielankunft ansagen.
   * @param {"reached"|"left_side"|"right_side"} [variant="reached"]
   */
  announceArrival(variant = "reached") {
    if (!this.enabled) return;

    const file = AUDIO_FILES.arrival[variant];
    if (!file) return;

    this._enqueue([{ type: "audio", src: BASE_PATH + file }]);
  }

  /**
   * Routenneuberechnung ansagen ("Route wird neu berechnet.").
   */
  announceRerouting() {
    if (!this.enabled) return;
    this._enqueue([
      { type: "audio", src: BASE_PATH + AUDIO_FILES.reroute.recalculating },
    ]);
  }

  // ── Interne Methoden ───────────────────────────────────────────────────────

  /**
   * Fügt eine Sequenz von Segmenten zur Warteschlange hinzu und startet
   * die Wiedergabe, falls sie noch nicht läuft.
   * Jedes Segment ist entweder { type: "audio", src } oder { type: "tts", text }.
   */
  _enqueue(segments) {
    this.queue.push(...segments);
    if (!this.isPlaying) this._playNext();
  }

  /** Nächstes Segment aus der Warteschlange abspielen */
  _playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const segment = this.queue.shift();

    if (segment.type === "audio") {
      this._playAudio(segment.src);
    } else if (segment.type === "tts") {
      this._playTTS(segment.text);
    }
  }

  /** Audiodatei abspielen */
  _playAudio(src) {
    const audio = new Audio(src);
    audio.volume = this.volume;

    audio.addEventListener("ended", () => this._playNext());
    audio.addEventListener("error", (e) => {
      console.error("VoiceNav: Audio konnte nicht geladen werden:", src, e);
      this._playNext(); // trotzdem weitermachen
    });

    audio.play().catch((err) => {
      console.error("VoiceNav: Wiedergabe fehlgeschlagen:", src, err);
      this._playNext();
    });
  }

  /** Text-to-Speech für Straßennamen */
  _playTTS(text) {
    if (!("speechSynthesis" in window)) {
      console.warn("VoiceNav: Web Speech API nicht verfügbar. Straßenname übersprungen.");
      this._playNext();
      return;
    }

    // Laufende TTS abbrechen
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang   = this.ttsLang;
    utterance.volume = this.volume;
    utterance.rate   = 1.0;

    utterance.onend   = () => this._playNext();
    utterance.onerror = (e) => {
      console.error("VoiceNav: TTS-Fehler:", e);
      this._playNext();
    };

    window.speechSynthesis.speak(utterance);
  }

  /** Warteschlange leeren und Wiedergabe stoppen */
  _clearQueue() {
    this.queue = [];
    this.isPlaying = false;
    window.speechSynthesis?.cancel();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION CONTROLLER
// Verbindet Kartenroute mit der Sprachnavigation.
// ─────────────────────────────────────────────────────────────────────────────

class NavigationController {
  /**
   * @param {VoiceNavigation} voiceNav - Instanz der Sprachnavigation
   */
  constructor(voiceNav) {
    this.voice = voiceNav;

    // Status für aktuellen Schritt
    this._announced30m = false; // Wurde die 30-m-Ansage bereits gespielt?
    this._announced5m  = false; // Wurde die 5-m-Ansage bereits gespielt?
    this._currentStep  = null;  // Aktueller Navigationsschritt
  }

  /**
   * Muss bei jedem Positionsupdate aufgerufen werden.
   *
   * @param {object} step - Aktueller Navigationsschritt (aus Leaflet Routing Machine o. ä.)
   *   step.distance  – Entfernung bis zur nächsten Abbiegung in Metern (number)
   *   step.type      – "left" | "right" | "straight" | "arrive"
   *   step.street    – Name der Straße, in die abgebogen wird (string)
   *   step.connector – "in die" | "auf die" | "Richtung" (optional, default "in die")
   */
  update(step) {
    // Neuer Schritt → Ansage-Status zurücksetzen
    if (step !== this._currentStep) {
      this._currentStep  = step;
      this._announced30m = false;
      this._announced5m  = false;
    }

    const dist = step.distance;

    // Zielankunft
    if (step.type === "arrive") {
      if (!this._announced5m) {
        this._announced5m = true;
        this.voice.announceArrival("reached");
      }
      return;
    }

    // 5-m-Ansage (direkte Abbiegeansage)
    if (dist <= 5 && !this._announced5m) {
      this._announced5m = true;
      this.voice.announceImmediate(step.type);
      return;
    }

    // 30-m-Ansage (Vorankündigung)
    if (dist <= 30 && !this._announced30m) {
      this._announced30m = true;
      // Entfernung auf nächsten 10er-Schritt runden (10 | 20 | 30)
      const roundedDist = Math.round(dist / 10) * 10 || 10;
      this.voice.announceApproaching(
        roundedDist,
        step.type,
        step.street || "",
        step.connector || "in die"
      );
    }
  }

  /**
   * Aufrufen, wenn das System eine Routenabweichung erkennt (≥ 15 m).
   * Spielt "Route wird neu berechnet." ab.
   */
  onReroute() {
    this.voice.announceRerouting();
    // Status zurücksetzen, damit nach Neuberechnung neue Ansagen kommen
    this._announced30m = false;
    this._announced5m  = false;
    this._currentStep  = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALISIERUNG & EXPORT
// ─────────────────────────────────────────────────────────────────────────────

// Globale Instanzen erstellen
const voiceNav = new VoiceNavigation();
const navController = new NavigationController(voiceNav);

// ─────────────────────────────────────────────────────────────────────────────
// UI-STEUERELEMENTE einbinden
// Füge folgendes HTML auf deiner Seite ein:
//
//   <input type="range" id="volumeSlider" min="0" max="100" value="100">
//   <button id="toggleVoice">🔊 Sprache aus</button>
//
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const slider = document.getElementById("volumeSlider");
  const toggleBtn = document.getElementById("toggleVoice");

  if (slider) {
    slider.addEventListener("input", (e) => {
      voiceNav.setVolume(e.target.value / 100);
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const nowEnabled = !voiceNav.enabled;
      voiceNav.setEnabled(nowEnabled);
      toggleBtn.textContent = nowEnabled ? "🔊 Sprache aus" : "🔇 Sprache ein";
    });
  }
});

/* Test in Konsole:

// Test 1: 30m-Ansage mit Straßenname (TTS)
voiceNav.announceApproaching(30, 'left', 'Margaretenstraße', 'in die');

// Test 2: Direkte Abbiegung
voiceNav.announceImmediate('right');

// Test 3: Ziel erreicht
voiceNav.announceArrival('reached');

// Test 4: Neuberechnung
voiceNav.announceRerouting();

*/ 
