// ===============================
// NAVIGATIONSANZEIGE – Box erstellen (wird einmalig beim Start eingefügt)
// ===============================
function createNavBox() {
    // Prüfen, ob der Wrapper schon existiert
    if (document.getElementById('nav-wrapper')) return;

    // 1. CSS für responsives Layout dynamisch einfügen
    const style = document.createElement('style');
    style.innerHTML = `
        #nav-wrapper {
            position: fixed;
            top: 80px; /* Hier anpassen, falls es deinen Header/andere Menüs optisch verdeckt */
            left: 0;
            width: 100%;
            z-index: 9999;
            pointer-events: none; /* WICHTIG: Klicks gehen durch die Boxen durch, nichts wird blockiert! */
            display: flex;
            flex-direction: column; /* Auf kleinen Handys untereinander stapeln */
            align-items: center;
            gap: 15px; /* Abstand zwischen Nav-Box und Defi-Box auf Handys */
            padding: 0 16px;
            box-sizing: border-box;
        }

        .nav-ui-box {
            background: rgba(14, 97, 39, 0.92);
            color: white;
            border-radius: 14px;
            font-family: Arial, sans-serif;
            text-align: center;
            box-shadow: 0 4px 16px rgba(0,0,0,0.25);
            max-width: 90vw; /* Verhindert, dass die Boxen den Bildschirmrand berühren/sprengen */
        }

        #nav-box {
            padding: 12px 24px;
            min-width: 180px;
            display: none;
        }

        #defi-distanz-box {
            padding: 10px 16px;
            min-width: 110px;
            display: none;
        }

        /* Desktop & Tablets (ab 600px Breite): Platzierung anpassen */
        @media (min-width: 600px) {
            #nav-wrapper {
                flex-direction: row;
                justify-content: center; /* Navigations-Pfeil bleibt exakt in der Mitte */
            }
            #defi-distanz-box {
                position: absolute;
                right: 16px; /* Defi-Box wandert an den rechten Rand */
                top: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // 2. Gemeinsamen Wrapper (Container) erstellen
    const wrapper = document.createElement('div');
    wrapper.id = 'nav-wrapper';
    document.body.appendChild(wrapper);

    // 3. Navigationsanzeige (Pfeil) erstellen
    const navBox = document.createElement('div');
    navBox.id = 'nav-box';
    navBox.className = 'nav-ui-box';
    navBox.innerHTML = `
        <div id="nav-pfeil" style="font-size: 40px; line-height: 1;">⬆️</div>
        <div id="nav-entfernung" style="font-size: 22px; font-weight: bold; margin-top: 4px;">-- m</div>
        <div id="nav-strasse" style="font-size: 13px; margin-top: 4px; opacity: 0.85;"></div>
    `;
    wrapper.appendChild(navBox);

    // 4. Entfernungsanzeige (Defi) erstellen
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
    document.getElementById('nav-entfernung').textContent = Math.round(entfernung) + ' m';
    document.getElementById('nav-strasse').textContent = strasse || '';
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

    // Anzeige: unter 1000m → Meter, ab 1000m → km
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
// NAVIGATIONSANZEIGE – GPS-Position laufend mit Route vergleichen
// ===============================
function starteNavAnzeige(routeSchritte, routePunkte) {
    if (!routeSchritte || routeSchritte.length === 0) return;

    let letzterSchrittIndex = null;

    navigator.geolocation.watchPosition(function(pos) {
        const nutzerLat = pos.coords.latitude;
        const nutzerLon = pos.coords.longitude;

        let naechsterSchritt = null;
        let kleinsteEntfernung = Infinity;

        routeSchritte.forEach(function(schritt) {
            const idx = schritt.index;
            if (!routePunkte[idx]) return;

            const schrittLat = routePunkte[idx].lat;
            const schrittLng = routePunkte[idx].lng;
            const entf = berechneEntfernung(nutzerLat, nutzerLon, schrittLat, schrittLng);

            if (entf < kleinsteEntfernung) {
                kleinsteEntfernung = entf;
                naechsterSchritt = schritt;
            }
        });

        if (naechsterSchritt) {
            const pfeil = bestimmePfeil(naechsterSchritt.type);
            aktualisiereNavAnzeige(kleinsteEntfernung, pfeil, naechsterSchritt.road || '');

            // ── Sprachnavigation ────────────────────────────────────────────

            // Schritt bestimmen (links/rechts/geradeaus/arrive)
            const richtung = naechsterSchritt.type?.toLowerCase().includes('left')   ? 'left'
                           : naechsterSchritt.type?.toLowerCase().includes('right')  ? 'right'
                           : naechsterSchritt.type?.toLowerCase().includes('arrive') ? 'arrive'
                           : 'straight';

            // Neuer Schritt → Sprachsystem informieren
            if (naechsterSchritt.index !== letzterSchrittIndex) {
                letzterSchrittIndex = naechsterSchritt.index;
                navController.update({             // ← NEU
                    distance:  kleinsteEntfernung,
                    type:      richtung,
                    street:    naechsterSchritt.road || '',
                    connector: 'in die',
                });
            } else {
                navController.update({             // ← NEU (laufendes Update für 30m/5m-Trigger)
                    distance:  kleinsteEntfernung,
                    type:      richtung,
                    street:    naechsterSchritt.road || '',
                    connector: 'in die',
                });
            }
            // ────────────────────────────────────────────────────────────────
        }

    }, function(err) {
        console.warn('GPS Fehler in NavAnzeige:', err);
    }, { enableHighAccuracy: true, maximumAge: 1000 });
}
