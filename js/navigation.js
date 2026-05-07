// ===============================
// NAVIGATIONSANZEIGE – Box erstellen (wird einmalig beim Start eingefügt)
// ===============================
function createNavBox() {
    if (document.getElementById('nav-wrapper')) return;

    const style = document.createElement('style');
    style.innerHTML = `
        #nav-wrapper {
            position: fixed;
            top: 80px;
            left: 0;
            width: 100%;
            z-index: 9999;
            pointer-events: none;
            display: flex;
            flex-direction: row;       /* ← immer row, auch mobil */
            justify-content: center;
            align-items: flex-start;
            gap: 10px;
            padding: 8px 12px;
            box-sizing: border-box;
        }
        .nav-ui-box {
            background: rgba(14, 97, 39, 0.92);
            color: white;
            border-radius: 14px;
            font-family: Arial, sans-serif;
            text-align: center;
            box-shadow: 0 4px 16px rgba(0,0,0,0.25);
            flex-shrink: 0;
        }
        #nav-box {
            padding: 10px 16px;
            flex: 1 1 auto;
            max-width: 65vw;           /* ← lässt Platz für Distanz-Box */
            display: none;
        }
        #nav-box #nav-pfeil       { font-size: 32px; line-height: 1; }
        #nav-box #nav-entfernung  { font-size: 18px; font-weight: bold; margin-top: 2px; }
        #nav-box #nav-strasse     {
            font-size: 11px; margin-top: 2px; opacity: 0.85;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        #defi-distanz-box {
            padding: 10px 12px;
            flex: 0 0 auto;
            min-width: 90px;
            display: none;
        }
        #defi-distanz-box #defi-distanz-wert { font-size: 18px; font-weight: bold; }

        /* Größere Screens: Distanz-Box rechts außen */
        @media (min-width: 600px) {
            #nav-box {
                max-width: 340px;
                padding: 12px 24px;
            }
            #nav-box #nav-pfeil       { font-size: 40px; }
            #nav-box #nav-entfernung  { font-size: 22px; }
            #nav-box #nav-strasse     { font-size: 13px; }
            #defi-distanz-box {
                position: absolute;
                right: 16px;
                top: 8px;
                padding: 10px 16px;
            }
            #defi-distanz-box #defi-distanz-wert { font-size: 22px; }
        }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'nav-wrapper';
    document.body.appendChild(wrapper);

    const navBox = document.createElement('div');
    navBox.id = 'nav-box';
    navBox.className = 'nav-ui-box';
    navBox.innerHTML = `
        <div id="nav-pfeil" style="font-size: 40px; line-height: 1;">⬆️</div>
        <div id="nav-entfernung" style="font-size: 22px; font-weight: bold; margin-top: 4px;">-- m</div>
        <div id="nav-strasse" style="font-size: 13px; margin-top: 4px; opacity: 0.85;"></div>
    `;
    wrapper.appendChild(navBox);

    const distBox = document.createElement('div');
    distBox.id = 'defi-distanz-box';
    distBox.className = 'nav-ui-box';
    distBox.innerHTML = `
        <div style="font-size: 11px; opacity: 0.85; margin-bottom: 2px;">Entfernung zum Defi:</div>
        <div id="defi-distanz-wert" style="font-size: 22px; font-weight: bold;">-- m</div>
    `;
    wrapper.appendChild(distBox);
}

// ===============================
// NAVIGATIONSANZEIGE – Anzeige aktualisieren
// ===============================
function aktualisiereNavAnzeige(entfernung, pfeil, strasse) {
    const box = document.getElementById('nav-box');
    if (!box) return;

    box.style.display = 'block';
    document.getElementById('nav-pfeil').textContent = pfeil;
    document.getElementById('nav-strasse').textContent = strasse || '';
    document.getElementById('nav-entfernung').textContent = Math.min(30, Math.round(entfernung)) + ' m';
}

// ===============================
// NAVIGATIONSANZEIGE – Box ausblenden
// ===============================
function verbergeNavAnzeige() {
    const box = document.getElementById('nav-box');
    if (box) box.style.display = 'none';
}

// ===============================
// DEFI-ENTFERNUNG – Live-Anzeige aktualisieren
// ===============================
function updateDefiDistanz(meter) {
    const box = document.getElementById('defi-distanz-box');
    const val = document.getElementById('defi-distanz-wert');
    if (!box || !val) return;

    box.style.display = 'block';

    if (meter < 1000) {
        val.textContent = Math.round(meter) + ' m';
    } else {
        val.textContent = (meter / 1000).toFixed(1) + ' km';
    }
}

// ===============================
// DEFI-ENTFERNUNG – Anzeige ausblenden
// ===============================
function hideDefiDistanz() {
    const box = document.getElementById('defi-distanz-box');
    if (box) box.style.display = 'none';
}

// ===============================
// NAVIGATIONSANZEIGE – Richtungspfeil bestimmen
// ===============================
function bestimmePfeil(typ) {
    if (!typ) return '⬆️';
    const t = typ.toLowerCase();
    if (t.includes('left'))   return '⬅️';
    if (t.includes('right'))  return '➡️';
    if (t.includes('arrive')) return '🏁';
    return '⬆️';
}

// ===============================
// NAVIGATIONSANZEIGE – Aktueller GPS-Watcher (nur einer aktiv!)
// ===============================
let _navWatchId = null;         // ← globale ID des aktiven Watchers
let _aktuelleSchritte = [];     // ← aktuelle Routenschritte
let _aktuellePunkte = [];       // ← aktuelle Routenpunkte
let _letzterSchrittIndex = null;

// ===============================
// NAVIGATIONSANZEIGE – Route aktualisieren (ohne neuen Watcher)
// ===============================
function starteNavAnzeige(routeSchritte, routePunkte) {
    if (!routeSchritte || routeSchritte.length === 0) return;

    // Neue Route speichern
    _aktuelleSchritte = routeSchritte;
    _aktuellePunkte   = routePunkte;
    _letzterSchrittIndex = null; // Reset damit Ansagen neu starten

    // Watcher nur einmal starten!
    if (_navWatchId !== null) return;

    _navWatchId = navigator.geolocation.watchPosition(function(pos) {
        const nutzerLat = pos.coords.latitude;
        const nutzerLon = pos.coords.longitude;

        if (!_aktuelleSchritte || _aktuelleSchritte.length === 0) return;

        let naechsterSchritt = null;
        let kleinsteEntfernung = Infinity;

        _aktuelleSchritte.forEach(function(schritt) {
            const idx = schritt.index;
            if (!_aktuellePunkte[idx]) return;

            const schrittLat = _aktuellePunkte[idx].lat;
            const schrittLng = _aktuellePunkte[idx].lng;
            const entf = berechneEntfernung(nutzerLat, nutzerLon, schrittLat, schrittLng);

            if (entf < kleinsteEntfernung) {
                kleinsteEntfernung = entf;
                naechsterSchritt = schritt;
            }
        });

        if (!naechsterSchritt) return;

        const pfeil = bestimmePfeil(naechsterSchritt.type);
        aktualisiereNavAnzeige(kleinsteEntfernung, pfeil, naechsterSchritt.road || '');


        const richtung = naechsterSchritt.type?.toLowerCase().includes('left')   ? 'left'
                       : naechsterSchritt.type?.toLowerCase().includes('right')  ? 'right'
                       : naechsterSchritt.type?.toLowerCase().includes('arrive') ? 'arrive'
                       : 'straight';

        // Neuer Schritt → letzterSchrittIndex zurücksetzen damit Ansagen neu triggern
        if (naechsterSchritt.index !== _letzterSchrittIndex) {
            _letzterSchrittIndex = naechsterSchritt.index;
            navController.update({
                distance:  kleinsteEntfernung,
                type:      richtung,
                street:    naechsterSchritt.road || '',
                connector: 'in_die',  // ← Unterstrich, passend zu AUDIO_FILES.connector
            });
        } else {
            navController.update({
                distance:  kleinsteEntfernung,
                type:      richtung,
                street:    naechsterSchritt.road || '',
                connector: 'in_die',  // ← Unterstrich, passend zu AUDIO_FILES.connector
            });
        }

    }, function(err) {
        console.warn('GPS Fehler in NavAnzeige:', err);
    }, { enableHighAccuracy: true, maximumAge: 1000 });
}

// ===============================
// NAVIGATIONSANZEIGE – Watcher stoppen (beim Tracking-Stop aufrufen)
// ===============================
function stoppeNavAnzeige() {
    if (_navWatchId !== null) {
        navigator.geolocation.clearWatch(_navWatchId);
        _navWatchId = null;
    }
    _aktuelleSchritte = [];
    _aktuellePunkte   = [];
    _letzterSchrittIndex = null;
    verbergeNavAnzeige();
}
