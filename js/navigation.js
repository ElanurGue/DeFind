// ===============================
// NAVIGATIONSANZEIGE – Box erstellen
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
            flex-direction: row;
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

        /* NAV-BOX (Pfeil + Straße) */
        #nav-box {
            padding: 10px 16px;
            flex: 1 1 auto;
            max-width: 55vw;
            display: none;
        }

        /* DEFI-DISTANZ-BOX */
        #defi-distanz-box {
            padding: 10px 12px;
            flex: 0 0 auto;
            min-width: 90px;
            display: none;
        }
        #defi-distanz-box #defi-distanz-wert {
            font-size: 18px;
            font-weight: bold;
        }

        /* Größere Screens */
        @media (min-width: 600px) {
            #nav-box {
                max-width: 340px;
                padding: 12px 24px;
            }
            #defi-distanz-box {
                padding: 10px 16px;
                min-width: 110px;
            }
            #defi-distanz-box #defi-distanz-wert {
                font-size: 22px;
            }
        }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'nav-wrapper';
    document.body.appendChild(wrapper);

    // NAV-BOX (Pfeil + Entfernung + Straße)
    const navBox = document.createElement('div');
    navBox.id = 'nav-box';
    navBox.className = 'nav-ui-box';
    navBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div id="nav-pfeil" style="font-size: 40px; line-height: 1; flex-shrink: 0;">⬆️</div>
            <div style="text-align: left;">
                <div id="nav-entfernung" style="font-size: 22px; font-weight: bold; line-height: 1.2;">-- m</div>
                <div id="nav-strasse" style="font-size: 13px; margin-top: 2px; opacity: 0.85;
                     white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;"></div>
            </div>
        </div>
    `;
    wrapper.appendChild(navBox);

    // DEFI-DISTANZ-BOX (Entfernung zum Defi)
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
    box.style.display = 'flex';
    document.getElementById('nav-pfeil').textContent = pfeil;
    document.getElementById('nav-strasse').textContent = strasse || '';
    document.getElementById('nav-entfernung').textContent = Math.round(entfernung) + ' m';
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
// GPS-Watcher Variablen
// ===============================
let _navWatchId = null;
let _aktuelleSchritte = [];
let _aktuellePunkte   = [];

const ERLAUBTE_DISTANZEN = [5, 10, 15, 20, 25, 30];

// ===============================
// NAVIGATIONSANZEIGE – Route starten
// ===============================
function starteNavAnzeige(routeSchritte, routePunkte) {
    if (!routeSchritte || routeSchritte.length === 0) return;

    _aktuelleSchritte = routeSchritte;
    _aktuellePunkte   = routePunkte;

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
            const entf = berechneEntfernung(
                nutzerLat, nutzerLon,
                _aktuellePunkte[idx].lat,
                _aktuellePunkte[idx].lng
            );
            if (entf < kleinsteEntfernung) {
                kleinsteEntfernung = entf;
                naechsterSchritt = schritt;
            }
        });

        if (!naechsterSchritt) return;

        const pfeil = bestimmePfeil(naechsterSchritt.type);
        const echteEntfernung = naechsterSchritt.distance;

        // ✅ Beide Boxen gleichzeitig aktualisieren
        aktualisiereNavAnzeige(echteEntfernung, pfeil, naechsterSchritt.road || '');

        const richtung = naechsterSchritt.type?.toLowerCase().includes('left')   ? 'left'
                       : naechsterSchritt.type?.toLowerCase().includes('right')  ? 'right'
                       : naechsterSchritt.type?.toLowerCase().includes('arrive') ? 'arrive'
                       : 'straight';

        const angezeigteEntfernung = Math.round(echteEntfernung);
        const distFuerStimme = ERLAUBTE_DISTANZEN.includes(angezeigteEntfernung)
            ? angezeigteEntfernung
            : -1;

        navController.update({
            index:     naechsterSchritt.index,
            distance:  distFuerStimme,
            type:      richtung,
            street:    naechsterSchritt.road || '',
            connector: 'in_die',
        });

    }, function(err) {
        console.warn('GPS Fehler in NavAnzeige:', err);
    }, { enableHighAccuracy: true, maximumAge: 1000 });
}

// ===============================
// NAVIGATIONSANZEIGE – Watcher stoppen
// ===============================
function stoppeNavAnzeige() {
    if (_navWatchId !== null) {
        navigator.geolocation.clearWatch(_navWatchId);
        _navWatchId = null;
    }
    _aktuelleSchritte = [];
    _aktuellePunkte   = [];
    verbergeNavAnzeige();
    hideDefiDistanz(); // ← auch Distanz-Box ausblenden beim Stoppen
}