// ===============================
// Debug-Funktionen (in Console)
// ===============================
window.debugDefis = function() {
    console.log('🔍 DEBUG:');
    console.log('Defis:', defiList);
    console.log('API:', RAILWAY_API);
    console.log('Karten-Center:', map.getCenter());
    console.log('Standort-Marker:', currentUserMarker ? 'Ja' : 'Nein');
    console.log('Live-Tracking:', isLiveTracking ? 'Aktiv' : 'Inaktiv');
    console.log('Aktuelles Ziel:', currentDefiTarget);
};

window.reloadDefis = function() {
    console.log('Defis neu laden');
    loadDefiData();
};

window.stopTracking = function() {
    stopLiveTracking();
    console.log('🛑 Live-Tracking gestoppt');
};

window.showCurrentPosition = function() {
    if (currentUserMarker) {
        const pos = currentUserMarker.getLatLng();
        console.log('📍 Aktuelle Position:', pos.lat.toFixed(6), pos.lng.toFixed(6));
        map.setView([pos.lat, pos.lng], 17);
        currentUserMarker.openPopup();
    } else {
        console.log('❌ Kein Standort verfügbar');
    }
};

// ===============================
// Fehlerbehandlung für fehlende Leaflet Routing Machine
// ===============================
if (typeof L.Routing === 'undefined') {
    console.error('❌ Leaflet Routing Machine nicht geladen!');
    console.log('ℹ️ Stelle sicher, dass du folgende Skripte in deinem HTML hast:');
    console.log('<link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine/dist/leaflet-routing-machine.css" />');
    console.log('<script src="https://unpkg.com/leaflet-routing-machine/dist/leaflet-routing-machine.js"></script>');
    
    // Fallback-Funktionen
    window.routeToDefi = function(defi) {
        alert('Routing-Funktion nicht verfügbar. Bitte Routing Machine Bibliothek laden.');
    };
    
    const originalCalculateRoute = window.calculateRouteToNearestDefi;
    window.calculateRouteToNearestDefi = function() {
        if (typeof L.Routing === 'undefined') {
            showMessage(
                '<div style="text-align: left; padding: 5px;">' +
                '<div style="font-size: 16px; font-weight: bold; color: #cc0000; margin-bottom: 8px;">' +
                '🚧 Routing-Funktion nicht verfügbar' +
                '</div>' +
                '<div style="margin-bottom: 6px;">' +
                'Die Leaflet Routing Machine Bibliothek konnte nicht geladen werden.' +
                '</div>' +
                '<div style="font-size: 12px; color: #666;">' +
                'Bitte laden Sie die Seite neu oder überprüfen Sie Ihre Internetverbindung.' +
                '</div>' +
                '</div>',
                'error',
                15000
            );
            return;
        }
        if (originalCalculateRoute) {
            originalCalculateRoute();
        }
    };
}

// ===============================
// App initialisieren
// ===============================
function initApp() {
    console.log('DeFind App wird gestartet');
    console.log('API:', RAILWAY_API);
    
    // CSS-Animationen hinzufügen
    addPulsingAnimation();

    // ── NEU: Navigationsbox einmalig ins DOM einfügen ──
    createNavBox();
    
    // Defis laden
    loadDefiData();
    
    // Event Listener für den "find-defi" Button
    const findDefiBtn = document.getElementById('find-defi');
    if (findDefiBtn) {
        findDefiBtn.addEventListener('click', findAndRouteToNearestDefi);
    } else {
        console.error('❌ Button "find-defi" nicht gefunden!');
    }
    
    // Für GitHub Pages: HTTPS erzwingen
    if (window.location.hostname.includes('github.io') && 
        window.location.protocol !== 'https:') {
        console.log('🔄 Wechsel zu HTTPS');
        window.location.href = window.location.href.replace('http:', 'https:');
    }
    
    // Event Listener für Karten-Klick, um Live-Tracking zu stoppen
    map.on('click', function() {
        if (isLiveTracking) {
            currentUserMarker.openPopup();
        }
    });
    
    console.log('✅ App initialisiert');
}

// ===============================
// DOM Ready
// ===============================
document.addEventListener('DOMContentLoaded', initApp);

console.log('JS InteraktiveKarte.js komplett geladen');
