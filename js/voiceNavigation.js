/**
 * DeFind – Sprachnavigation
 */

const BASE_PATH = "sprachliche Weganweisungen/";

const AUDIO_FILES = {
  intro: {
    5:  "5.mp3",
    10: "10.mp3",
    15: "15.mp3",
    20: "20.mp3",
    25: "25.mp3",
    30: "30.mp3",
  },
  direction: {
    left:     "links abbiegen.mp3",
    right:    "rechts abbiegen.mp3",
    straight: "geradeaus weiter.mp3",
  },
  connector: {
    in_die:   "in die.mp3",
    auf_die:  "auf die.mp3",
    richtung: "richtung.mp3",
  },
  immediate: {
    left:     "jetzt links abbiegen.mp3",
    right:    "jetzt rechts abbiegen.mp3",
    straight: "weiter geradeaus.mp3",
  },
  arrival: {
    reached:   "ziel erreicht.mp3",
    left_side: "ziel links.mp3",
    right_side:"ziel rechts.mp3",
  },
  reroute: {
    //recalculating: "route neu berechnet.mp3",
  },
};

class VoiceNavigation {
  constructor() {
    this.enabled   = true;
    this.volume    = 1.0;
    this.queue     = [];
    this.isPlaying = false;
    this.ttsLang   = "de-AT";
  }

  setEnabled(value) {
    this.enabled = value;
    if (!value) this._clearQueue();
  }

  setVolume(value) {
    this.volume = Math.min(1, Math.max(0, value));
  }

  // distanceMeters muss exakt 5, 10, 15, 20, 25 oder 30 sein
  announceApproaching(distanceMeters, direction, streetName, connector = "in_die") {
    if (!this.enabled) return;
    const introFile = AUDIO_FILES.intro[distanceMeters];
    const dirFile   = AUDIO_FILES.direction[direction];
    const conFile   = AUDIO_FILES.connector[connector];
    if (!introFile || !dirFile || !conFile) {
      console.warn("VoiceNav: Datei nicht gefunden", { distanceMeters, direction, connector });
      return;
    }
    this._enqueue([
      { type: "audio", src: BASE_PATH + introFile },
      { type: "audio", src: BASE_PATH + dirFile },
      { type: "audio", src: BASE_PATH + conFile },
      { type: "tts",   text: streetName },
    ]);
  }

  announceImmediate(direction) {
    if (!this.enabled) return;
    const file = AUDIO_FILES.immediate[direction];
    if (!file) return;
    this._enqueue([{ type: "audio", src: BASE_PATH + file }]);
  }

  announceArrival(variant = "reached") {
    if (!this.enabled) return;
    const file = AUDIO_FILES.arrival[variant];
    if (!file) return;
    this._enqueue([{ type: "audio", src: BASE_PATH + file }]);
  }

  announceRerouting() {
    if (!this.enabled) return;
    this._enqueue([{ type: "audio", src: BASE_PATH + AUDIO_FILES.reroute.recalculating }]);
  }

  _enqueue(segments) {
    this.queue.push(...segments);
    if (!this.isPlaying) this._playNext();
  }

  _playNext() {
    if (this.queue.length === 0) { this.isPlaying = false; return; }
    this.isPlaying = true;
    const segment = this.queue.shift();
    if (segment.type === "audio") this._playAudio(segment.src);
    else if (segment.type === "tts") this._playTTS(segment.text);
  }

  _playAudio(src) {
    const audio = new Audio(src);
    audio.volume = this.volume;
    audio.addEventListener("ended", () => this._playNext());
    audio.addEventListener("error", () => { console.error("Audio Fehler:", src); this._playNext(); });
    audio.play().catch(() => this._playNext());
  }

  _playTTS(text) {
    if (!("speechSynthesis" in window)) { this._playNext(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang    = this.ttsLang;
    utterance.volume  = this.volume;
    utterance.rate    = 1.0;
    utterance.onend   = () => this._playNext();
    utterance.onerror = () => this._playNext();
    window.speechSynthesis.speak(utterance);
  }

  _clearQueue() {
    this.queue = [];
    this.isPlaying = false;
    window.speechSynthesis?.cancel();
  }
}

class NavigationController {
  constructor(voiceNav) {
    this.voice             = voiceNav;
    this._announced        = false; // wurde für diesen Schritt schon angesagt?
    this._currentStepIndex = null;
    this._silent           = false;
  }

  resetState() {
    this._announced        = false;
    this._currentStepIndex = null;
  }

  // distance muss bereits ein erlaubter Wert (5,10,15,20,25,30) oder -1 (stumm) sein
  update(step) {
    const dist = step.distance; // entweder erlaubter Wert oder -1

    // Schrittwechsel → Reset
    if (step.index !== this._currentStepIndex) {
      this._currentStepIndex = step.index;
      this._announced        = false;
    }

    if (this._silent) return;

    // Ziel
    if (step.type === "arrive") {
      if (!this._announced) {
        this._announced = true;
        this.voice.announceArrival("reached");
      }
      return;
    }

    // -1 = Box zeigt keinen erlaubten Wert → stumm
    if (dist < 0) return;

    // Nur einmal pro Schritt ansagen
    if (this._announced) return;
    this._announced = true;

    // dist ist bereits exakt 5, 10, 15, 20, 25 oder 30
    this.voice.announceApproaching(
      dist,
      step.type,
      step.street || "",
      step.connector || "in_die"
    );
  }

  onReroute() {
    //this.voice.announceRerouting();
    this._announced        = false;
    this._currentStepIndex = null;
    this._silent = true;
    setTimeout(() => { this._silent = false; }, 4000);
  }
}

// Globale Instanzen
const voiceNav = new VoiceNavigation();
const navController = new NavigationController(voiceNav);

document.addEventListener("DOMContentLoaded", () => {
  const slider    = document.getElementById("volumeSlider");
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