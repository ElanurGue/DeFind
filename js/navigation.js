// ===============================
// NAVIGATIONSANZEIGE – Box erstellen (wird einmalig beim Start eingefügt)
// ===============================
function createNavBox() {
    // Nur erstellen wenn noch nicht vorhanden
    if (document.getElementById('nav-box')) return;

    const navBox = document.createElement('div');
    navBox.id = 'nav-box';
    navBox.style.cssText = `
        display: none;
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(14, 97, 39, 0.92);
        color: white;
        padding: 12px 24px;
        border-radius: 14px;
        font-family: Arial, sans-serif;
        text-align: center;
        z-index: 9999;
        min-width: 180px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        pointer-events: none;
    `;
    navBox.innerHTML = `
        <div id="nav-pfeil" style="font-size: 40px; line-height: 1;">⬆️</div>
        <div id="nav-entfernung" style="font-size: 22px; font-weight: bold; margin-top: 4px;">-- m</div>
        <div id="nav-strasse" style="font-size: 13px; margin-top: 4px; opacity: 0.85;"></div>
    `;
    document.body.appendChild(navBox);
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
// NAVIGATIONSANZEIGE – Richtungspfeil bestimmen
// ===============================
function bestimmePfeil(typ) {
    if (!typ) return '⬆️';
    const t = typ.toLowerCase();
    if (t.includes('left'))  return '⬅️';
    if (t.includes('right')) return '➡️';
    if (t.includes('arrive')) return '🏁';
    return '⬆️';
}

// ===============================
// NAVIGATIONSANZEIGE – GPS-Position laufend mit Route vergleichen
// ===============================
function starteNavAnzeige(routeSchritte, routePunkte) {
    if (!routeSchritte || routeSchritte.length === 0) return;

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
        }

    }, function(err) {
        console.warn('GPS Fehler in NavAnzeige:', err);
        
    }, { enableHighAccuracy: true, maximumAge: 1000 });
}

// ===============================
// NAVIGATIONSANZEIGE – Entfernung zwischen zwei Punkten (in Metern)
// ===============================
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
