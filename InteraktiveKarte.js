// ===============================
// Karte initialisieren (5. Bezirk Wien)
// ===============================
const map = L.map('map').setView([48.192, 16.352], 15);

// ===============================
// OpenStreetMap Tiles
// ===============================
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// ===============================
// Globale Variablen
// ===============================
let defiList = [];
let routingControl = null;
let currentUserMarker = null;
let positionWatchId = null;

// ===============================
// Icons
// ===============================
const heartIcon = L.icon({
    iconUrl: 'bilder/heart.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28]
});

// ===============================
// RAILWAY API KONFIGURATION
// ===============================
const RAILWAY_API = 'https://defind-production.up.railway.app/api/standorte';

// ===============================
// Defi-Daten von Railway laden
// ===============================
async function loadDefiData() {
    try {
        console.log('🌐 Lade Defis von Railway API:', RAILWAY_API);
        
        const response = await fetch(RAILWAY_API, {
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('📊 API Status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`API Fehler: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ API Antwort:', data);
        
        if (data.success) {
            defiList = data.data;
            console.log(`🗺️ ${defiList.length} Defis geladen (Mode: ${data.mode})`);
            
            // Defis auf Karte anzeigen
            displayDefisOnMap();
            
            // Erfolgsmeldung
            showMessage(`✅ ${defiList.length} Defibrillatoren geladen`, 'success');
        } else {
            throw new Error('API returned success: false');
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Laden:', error);
        
        // Fallback zu statischen Defis
        loadFallbackDefis();
        showMessage('⚠️ Verbindungsfehler. Lokale Daten werden verwendet.', 'warning');
    }
}

// ===============================
// Defis auf Karte anzeigen
// ===============================
function displayDefisOnMap() {
    // Alte Marker entfernen
    clearDefiMarkers();
    
    // Neue Marker hinzufügen
    defiList.forEach(defi => {
        const marker = L.marker([defi.latitude, defi.longitude], {
            icon: heartIcon,
            title: `${defi.adresse.straße} ${defi.adresse.hausnummer}`
        }).addTo(map);
        
        // Popup mit Defi-Informationen
        marker.bindPopup(`
            <div style="font-family: Arial; min-width: 250px;">
                <h3 style="margin: 0 0 10px 0; color: #d63031; font-size: 16px;">
                    🩺 Defibrillator
                </h3>
                <div style="margin-bottom: 8px;">
                    <strong>${defi.adresse.straße} ${defi.adresse.hausnummer}</strong><br>
                    ${defi.adresse.plz} ${defi.adresse.stadt}
                </div>
                <div style="font-size: 14px; color: #555; margin-bottom: 8px;">
                    📍 ${defi.zusatzinfo}
                </div>
                <hr style="margin: 10px 0;">
                <div style="font-size: 12px; color: #777;">
                    ID: ${defi.id} | 
                    ${defi.aktiv ? '✅ Aktiv' : '❌ Inaktiv'}
                </div>
            </div>
        `);
        
        // Bei Klick auf Marker Karte zentrieren
        marker.on('click', function() {
            map.setView([defi.latitude, defi.longitude], 17);
        });
    });
    
    // Karte auf alle Defis zoomen (wenn welche vorhanden)
    if (defiList.length > 0) {
        const bounds = L.latLngBounds(defiList.map(d => [d.latitude, d.longitude]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
}

// ===============================
// Alte Defi-Marker entfernen
// ===============================
function clearDefiMarkers() {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer.options.icon === heartIcon) {
            map.removeLayer(layer);
        }
    });
}

// ===============================
// Fallback-Daten (wenn API nicht geht)
// ===============================
function loadFallbackDefis() {
    console.log('⚠️ Verwende Fallback-Daten');
    
    // 3 Beispiel-Defis
    defiList = [
        {
            id: 1,
            latitude: 48.1810954,
            longitude: 16.3562034,
            adresse: {
                plz: "1050",
                stadt: "Wien",
                straße: "Leopold-Rister-Gasse",
                hausnummer: "5"
            },
            zusatzinfo: "an der Hauswand rechts eben dem Eingang",
            aktiv: true
        },
        {
            id: 2,
            latitude: 48.1806330,
            longitude: 16.3532999,
            adresse: {
                plz: "1050",
                stadt: "Wien",
                straße: "Einsiedlergasse",
                hausnummer: "2"
            },
            zusatzinfo: "beim Portier der MA48-Garage",
            aktiv: true
        },
        {
            id: 17,
            latitude: 48.1953328,
            longitude: 16.3563125,
            adresse: {
                plz: "1050",
                stadt: "Wien",
                straße: "Hamburgerstraße",
                hausnummer: "9"
            },
            zusatzinfo: "im Stiegenhaus vor der Aufzugtüre im EG",
            aktiv: true
        }
    ];
    
    displayDefisOnMap();
}

// ===============================
// Live-Standort
// ===============================
function geoFindMe() {
    console.log('📍 Live-Standort gestartet');
    
    if (!navigator.geolocation) {
        showMessage('Ihr Browser unterstützt keine Standortabfrage.', 'error');
        return;
    }
    
    // HTTPS prüfen (für GitHub Pages)
    if (window.location.protocol !== 'https:' && 
        !window.location.hostname.includes('localhost')) {
        const useHttps = confirm(
            'Für Standortzugriff wird HTTPS benötigt.\n\n' +
            'Möchten Sie zu HTTPS wechseln?'
        );
        if (useHttps) {
            window.location.href = window.location.href.replace('http:', 'https:');
            return;
        }
    }
    
    // Alte Verfolgung stoppen
    if (positionWatchId) {
        navigator.geolocation.clearWatch(positionWatchId);
    }
    
    // Alten Marker entfernen
    if (currentUserMarker) {
        map.removeLayer(currentUserMarker);
        currentUserMarker = null;
    }
    
    // Button-Status
    const btn = document.getElementById('find-me');
    const originalText = btn.textContent;
    btn.textContent = 'Suche...';
    btn.disabled = true;
    
    let firstLocation = true;
    
    function success(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        console.log(`📍 Standort: ${lat.toFixed(6)}, ${lng.toFixed(6)} (${Math.round(accuracy)}m)`);
        
        // Button zurücksetzen
        if (firstLocation) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
        
        // Marker erstellen/aktualisieren
        if (!currentUserMarker) {
            currentUserMarker = L.circleMarker([lat, lng], {
                radius: 10,
                color: '#1a5fb4',
                fillColor: '#62a0ea',
                fillOpacity: 0.9,
                weight: 3
            }).addTo(map);
            
            currentUserMarker.bindPopup(`
                <div style="font-family: Arial; min-width: 200px;">
                    <h4 style="margin: 0 0 5px 0; color: #1a5fb4;">📍 Ihr Standort</h4>
                    <p style="margin: 3px 0; font-size: 13px;">
                        <strong>Koordinaten:</strong><br>
                        ${lat.toFixed(6)}, ${lng.toFixed(6)}
                    </p>
                    <p style="margin: 3px 0; font-size: 12px; color: #666;">
                        Genauigkeit: ${Math.round(accuracy)} Meter
                    </p>
                </div>
            `);
        } else {
            currentUserMarker.setLatLng([lat, lng]);
        }
        
        // Bei erstem Standort Karte zentrieren
        if (firstLocation) {
            currentUserMarker.openPopup();
            map.setView([lat, lng], 16, { animate: true });
            firstLocation = false;
            
            showMessage(`✅ Standort gefunden! (${Math.round(accuracy)}m Genauigkeit)`, 'success');
        }
    }
    
    function error(err) {
        console.error('❌ Standortfehler:', err);
        
        btn.textContent = originalText;
        btn.disabled = false;
        
        let message = 'Standort konnte nicht ermittelt werden.';
        switch(err.code) {
            case err.PERMISSION_DENIED:
                message = 'Standort-Zugriff wurde verweigert. Bitte erlauben Sie den Zugriff in Ihren Browsereinstellungen.';
                break;
            case err.POSITION_UNAVAILABLE:
                message = 'Standortinformation nicht verfügbar. Stellen Sie sicher, dass GPS/WLAN aktiviert ist.';
                break;
            case err.TIMEOUT:
                message = 'Zeitüberschreitung bei Standortabfrage.';
                break;
        }
        
        showMessage(message, 'error');
        
        // Fallback: Wien Zentrum anzeigen
        if (!currentUserMarker) {
            currentUserMarker = L.marker([48.2082, 16.3738]).addTo(map);
            currentUserMarker.bindPopup('<b>Standort nicht verfügbar</b><br>Gezeigter Ort: Wien Zentrum').openPopup();
            map.setView([48.2082, 16.3738], 14);
        }
    }
    
    // Standort abfragen
    navigator.geolocation.getCurrentPosition(
        success,
        error,
        { enableHighAccuracy: true, timeout: 10000 }
    );
    
    // Kontinuierliche Verfolgung
    positionWatchId = navigator.geolocation.watchPosition(
        success,
        error,
        { enableHighAccuracy: true, maximumAge: 3000 }
    );
}

// ===============================
// Nächsten Defi finden
// ===============================
function findNearestDefi(lat, lng) {
    if (!defiList || defiList.length === 0) {
        showMessage('Keine Defis verfügbar.', 'warning');
        return null;
    }
    
    let nearest = null;
    let minDist = Infinity;
    
    defiList.forEach(defi => {
        const dist = map.distance([lat, lng], [defi.latitude, defi.longitude]);
        if (dist < minDist) {
            minDist = dist;
            nearest = defi;
        }
    });
    
    if (nearest) {
        console.log(`📍 Nächster Defi: ${nearest.adresse.straße} ${nearest.adresse.hausnummer} (${Math.round(minDist)}m)`);
    }
    
    return nearest;
}

// ===============================
// Route zum nächsten Defi
// ===============================
function routeToNearestDefi() {
    if (!currentUserMarker) {
        const startLocation = confirm(
            'Ihr Standort ist nicht bekannt.\n\n' +
            'Möchten Sie zuerst Ihren Standort ermitteln?\n' +
            'OK = Standort ermitteln\n' +
            'Abbrechen = Route von Wien Zentrum berechnen'
        );
        
        if (startLocation) {
            geoFindMe();
            return;
        } else {
            // Fallback: Wien Zentrum
            currentUserMarker = L.marker([48.2082, 16.3738]).addTo(map);
            currentUserMarker.bindPopup('<b>Startpunkt: Wien Zentrum</b>').openPopup();
            map.setView([48.2082, 16.3738], 14);
        }
    }
    
    if (!defiList || defiList.length === 0) {
        showMessage('Keine Defis verfügbar.', 'warning');
        return;
    }
    
    const userPos = currentUserMarker.getLatLng();
    const nearest = findNearestDefi(userPos.lat, userPos.lng);
    
    if (!nearest) {
        showMessage('Keinen Defi in der Nähe gefunden.', 'warning');
        return;
    }
    
    // Alte Route entfernen
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    
    // Neue Route berechnen
    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(userPos.lat, userPos.lng),
            L.latLng(nearest.latitude, nearest.longitude)
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
        lineOptions: {
            styles: [{
                color: '#0e6127',
                weight: 6,
                opacity: 0.8
            }]
        },
        createMarker: function() { return null; }
    }).addTo(map);
    
    // Distanz anzeigen
    const distance = map.distance([userPos.lat, userPos.lng], [nearest.latitude, nearest.longitude]);
    const distanceKm = (distance / 1000).toFixed(2);
    
    showMessage(`🚑 Route zum nächsten Defi (${Math.round(distance)}m, ${distanceKm}km)`, 'success');
    
    // Ziel-Marker hervorheben
    setTimeout(() => {
        map.eachLayer(layer => {
            if (layer instanceof L.Marker && 
                layer.getLatLng().lat === nearest.latitude && 
                layer.getLatLng().lng === nearest.longitude) {
                layer.openPopup();
            }
        });
    }, 500);
}

// ===============================
// Nachricht anzeigen
// ===============================
function showMessage(text, type = 'info') {
    console.log(`${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'} ${text}`);
    
    // Kleine Notification (optional)
    if (typeof alert !== 'undefined' && type === 'error') {
        setTimeout(() => alert(text), 100);
    }
}

// ===============================
// App initialisieren
// ===============================
function initApp() {
    console.log('🚀 DeFind App wird gestartet');
    console.log('🔗 API:', RAILWAY_API);
    
    // Defis laden
    loadDefiData();
    
    // Event Listener
    document.getElementById('find-me').addEventListener('click', geoFindMe);
    document.getElementById('find-defi').addEventListener('click', routeToNearestDefi);
    
    // Für GitHub Pages: HTTPS erzwingen
    if (window.location.hostname.includes('github.io') && 
        window.location.protocol !== 'https:') {
        console.log('🔄 Wechsel zu HTTPS');
        window.location.href = window.location.href.replace('http:', 'https:');
    }
}

// ===============================
// DOM Ready
// ===============================
document.addEventListener('DOMContentLoaded', initApp);

// ===============================
// Debug-Funktionen (in Console)
// ===============================
window.debugDefis = function() {
    console.log('🔍 DEBUG:');
    console.log('Defis:', defiList);
    console.log('API:', RAILWAY_API);
    console.log('Karten-Center:', map.getCenter());
};

window.reloadDefis = function() {
    console.log('🔄 Defis neu laden');
    loadDefiData();
};