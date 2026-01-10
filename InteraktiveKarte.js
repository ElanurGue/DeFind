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
// Konfiguration - HIER DEINE RAILWAY URL EINTRAGEN!
// ===============================
const CONFIG = {
    // RAILWAY URL: Gehe zu railway.app → DeFind → Settings → Domains
    // Kopiere die URL und füge sie hier ein (mit /api/standorte am Ende)
    API_URL: 'https://defi-finder-production.up.railway.app/api/standorte',
    
    // Für lokale Entwicklung auf deinem Laptop:
    // API_URL: 'http://localhost:3000/api/standorte'
    
    // Automatische URL-Erkennung
    getApiUrl: function() {
        // Wenn localhost, dann lokale API
        if (window.location.hostname.includes('localhost') || 
            window.location.hostname.includes('127.0.0.1')) {
            return 'http://localhost:3000/api/standorte';
        }
        // Ansonsten Railway URL
        return this.API_URL;
    }
};

// ===============================
// Defi-Daten laden
// ===============================
async function loadDefiData() {
    try {
        const apiUrl = CONFIG.getApiUrl();
        console.log('🌐 Lade Defi-Daten von:', apiUrl);
        
        const response = await fetch(apiUrl, {
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('📊 API Response Status:', response.status);
        
        if (!response.ok) {
            throw new Error(`API-Fehler: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ API-Daten empfangen:', data);
        
        // Daten verarbeiten (Railway Format: {success, data} oder direkt Array)
        if (data.success && data.data) {
            defiList = data.data;
            console.log(`🗺️ ${defiList.length} Defis von Railway geladen`);
        } else if (Array.isArray(data)) {
            defiList = data;
            console.log(`🗺️ ${defiList.length} Defis von lokaler API geladen`);
        } else {
            console.warn('⚠️ Unerwartetes Datenformat:', data);
            throw new Error('Ungültiges Datenformat');
        }

        // Defis auf Karte anzeigen
        displayDefisOnMap();
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Defi-Daten:', error);
        showErrorMessage('Konnte keine Defis laden. Verwende Fallback-Daten.');
        loadFallbackData();
    }
}

// ===============================
// Defis auf Karte anzeigen
// ===============================
function displayDefisOnMap() {
    // Alte Marker löschen (falls vorhanden)
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer.options.icon === heartIcon) {
            map.removeLayer(layer);
        }
    });
    
    // Neue Marker hinzufügen
    defiList.forEach(defi => {
        const marker = L.marker([defi.latitude, defi.longitude], {
            icon: heartIcon
        }).addTo(map);
        
        marker.bindPopup(`
            <div style="font-family: Arial; min-width: 220px;">
                <h3 style="margin: 0 0 10px 0; color: #d63031; font-size: 16px;">
                    🩺 Defibrillator
                </h3>
                <p style="margin: 5px 0;">
                    <strong>${defi.adresse.straße} ${defi.adresse.hausnummer}</strong><br>
                    ${defi.adresse.plz} ${defi.adresse.stadt}
                </p>
                <p style="margin: 5px 0; font-size: 14px; color: #555; font-style: italic;">
                    📍 ${defi.zusatzinfo}
                </p>
                <hr style="margin: 10px 0;">
                <p style="margin: 5px 0; font-size: 12px; color: #777;">
                    🆔 ID: ${defi.id} | 
                    ${defi.aktiv ? '✅ Aktiv' : '❌ Inaktiv'}
                </p>
            </div>
        `);
        
        // Bei Klick auf Marker Karte zentrieren
        marker.on('click', function() {
            map.setView([defi.latitude, defi.longitude], 17);
        });
    });
    
    // Karte auf alle Defis zoomen
    if (defiList.length > 0) {
        const bounds = L.latLngBounds(defiList.map(d => [d.latitude, d.longitude]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        console.log('✅ Karte auf Defis gezoomt');
    }
}

// ===============================
// Fallback-Daten (wenn API nicht erreichbar)
// ===============================
function loadFallbackData() {
    console.log('⚠️ Verwende Fallback-Daten');
    
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
            id: 3,
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
    showErrorMessage('Offline-Modus: Es werden nur Beispiel-Daten angezeigt.');
}

// ===============================
// Live-Standort
// ===============================
function geoFindMe() {
    console.log('📍 Standort-Button geklickt');
    
    // Prüfen ob Browser Geolocation unterstützt
    if (!navigator.geolocation) {
        alert("Ihr Browser unterstützt keine Standortabfrage. Bitte verwenden Sie einen modernen Browser.");
        return;
    }
    
    // HTTPS erforderlich für Geolocation (außer localhost)
    if (window.location.protocol !== 'https:' && 
        !window.location.hostname.includes('localhost') &&
        !window.location.hostname.includes('127.0.0.1')) {
        
        const useHttp = confirm(
            "Standortzugriff benötigt HTTPS für volle Funktionalität.\n\n" +
            "Möchten Sie zu HTTPS wechseln?\n" +
            "✓ Klicken Sie OK für HTTPS (empfohlen)\n" +
            "✗ Klicken Sie Abbrechen um mit HTTP fortzufahren"
        );
        
        if (useHttp) {
            window.location.href = window.location.href.replace('http:', 'https:');
            return;
        }
    }
    
    // Alte Standortverfolgung stoppen
    if (positionWatchId) {
        navigator.geolocation.clearWatch(positionWatchId);
        positionWatchId = null;
    }
    
    // Alten Standort-Marker entfernen
    if (currentUserMarker) {
        map.removeLayer(currentUserMarker);
        currentUserMarker = null;
    }
    
    // Button-Status ändern während Suche
    const btn = document.getElementById('find-me');
    const originalText = btn.textContent;
    btn.textContent = 'Suche Standort...';
    btn.disabled = true;
    
    let firstLocation = true;
    
    function success(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        console.log(`📍 Standort gefunden: ${lat.toFixed(6)}, ${lng.toFixed(6)} (Genauigkeit: ${Math.round(accuracy)}m)`);
        
        // Button zurücksetzen
        if (firstLocation) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
        
        // Marker erstellen oder aktualisieren
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
            map.setView([lat, lng], 16, {
                animate: true,
                duration: 1.0
            });
            firstLocation = false;
            
            showSuccessMessage(`Standort gefunden! Genauigkeit: ${Math.round(accuracy)} Meter`);
        }
        
        // Adresse ermitteln (optional)
        getAddressFromCoords(lat, lng);
    }
    
    function error(err) {
        console.error('❌ Standortfehler:', err);
        
        // Button zurücksetzen
        btn.textContent = originalText;
        btn.disabled = false;
        
        let errorMessage = "Standort konnte nicht ermittelt werden.\n\n";
        
        switch(err.code) {
            case err.PERMISSION_DENIED:
                errorMessage += "🔒 Standort-Zugriff wurde verweigert.\n";
                errorMessage += "Bitte erlauben Sie den Standortzugriff in Ihren Browsereinstellungen.";
                break;
            case err.POSITION_UNAVAILABLE:
                errorMessage += "📡 Standortinformation nicht verfügbar.\n";
                errorMessage += "Stellen Sie sicher, dass GPS/WLAN aktiviert ist.";
                break;
            case err.TIMEOUT:
                errorMessage += "⏱️ Zeitüberschreitung bei Standortabfrage.\n";
                errorMessage += "Bitte versuchen Sie es erneut.";
                break;
            default:
                errorMessage += "❌ Unbekannter Fehler: " + err.message;
        }
        
        showErrorMessage(errorMessage);
        
        // Fallback: Zeige Wien Zentrum
        if (!currentUserMarker) {
            currentUserMarker = L.marker([48.2082, 16.3738], {
                icon: L.icon({
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                })
            }).addTo(map);
            
            currentUserMarker.bindPopup('<b>Standort konnte nicht ermittelt werden</b><br>Gezeigter Ort: Wien Zentrum').openPopup();
            map.setView([48.2082, 16.3738], 14);
        }
    }
    
    // Standort abfragen
    navigator.geolocation.getCurrentPosition(
        success,
        error,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
    
    // Kontinuierliche Verfolgung starten (optional)
    positionWatchId = navigator.geolocation.watchPosition(
        success,
        error,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 3000
        }
    );
}

// ===============================
// Adresse von Koordinaten ermitteln
// ===============================
function getAddressFromCoords(lat, lng) {
    if (!currentUserMarker) return;
    
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
            if (!data || !data.address) return;
            
            const addr = data.address;
            const street = addr.road || addr.pedestrian || '';
            const number = addr.house_number ? ' ' + addr.house_number : '';
            const city = addr.city || addr.town || addr.village || '';
            const postcode = addr.postcode || '';
            
            if (street) {
                const addressText = `${street}${number}, ${postcode} ${city}`;
                currentUserMarker.setPopupContent(`
                    <div style="font-family: Arial; min-width: 220px;">
                        <h4 style="margin: 0 0 5px 0; color: #1a5fb4;">📍 Ihr Standort</h4>
                        <p style="margin: 3px 0; font-size: 13px;">
                            <strong>Adresse:</strong><br>
                            ${addressText}
                        </p>
                        <p style="margin: 3px 0; font-size: 12px; color: #666;">
                            Koordinaten: ${lat.toFixed(6)}, ${lng.toFixed(6)}
                        </p>
                    </div>
                `);
            }
        })
        .catch(err => console.log('Adressermittlung fehlgeschlagen:', err));
}

// ===============================
// Nächsten Defi finden
// ===============================
function findNearestDefi(lat, lng) {
    if (!defiList || defiList.length === 0) {
        showErrorMessage('Keine Defis verfügbar. Bitte warten Sie bis Daten geladen sind.');
        return null;
    }
    
    let nearest = null;
    let minDist = Infinity;
    let nearestIndex = -1;
    
    defiList.forEach((defi, index) => {
        const dist = map.distance([lat, lng], [defi.latitude, defi.longitude]);
        if (dist < minDist) {
            minDist = dist;
            nearest = defi;
            nearestIndex = index;
        }
    });
    
    if (nearest) {
        console.log(`📍 Nächster Defi: ${nearest.adresse.straße} ${nearest.adresse.hausnummer} (${Math.round(minDist)}m)`);
    }
    
    return nearest;
}

// ===============================
// Route zum nächsten Defi berechnen
// ===============================
function routeToNearestDefi() {
    // Prüfen ob Standort bekannt ist
    if (!currentUserMarker) {
        const startLocation = confirm(
            "Ihr Standort ist nicht bekannt.\n\n" +
            "Möchten Sie zuerst Ihren Standort ermitteln?\n" +
            "✓ OK: Standort ermitteln\n" +
            "✗ Abbrechen: Route von Wien Zentrum berechnen"
        );
        
        if (startLocation) {
            geoFindMe();
            return;
        } else {
            // Fallback: Wien Zentrum als Startpunkt
            currentUserMarker = L.marker([48.2082, 16.3738]).addTo(map);
            currentUserMarker.bindPopup('<b>Startpunkt: Wien Zentrum</b>').openPopup();
        }
    }
    
    // Prüfen ob Defis geladen sind
    if (!defiList || defiList.length === 0) {
        showErrorMessage('Keine Defis verfügbar. Bitte warten Sie bis Daten geladen sind.');
        return;
    }
    
    const userPos = currentUserMarker.getLatLng();
    const nearest = findNearestDefi(userPos.lat, userPos.lng);
    
    if (!nearest) {
        showErrorMessage('Keinen Defi in der Nähe gefunden.');
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
            styles: [
                {
                    color: '#0e6127',
                    weight: 6,
                    opacity: 0.8,
                    dashArray: '10, 10'
                }
            ]
        },
        createMarker: function(i, waypoint, n) {
            // Keine Marker für Start/Ziel anzeigen
            return null;
        }
    }).addTo(map);
    
    // Distanz anzeigen
    const distance = map.distance([userPos.lat, userPos.lng], [nearest.latitude, nearest.longitude]);
    const distanceKm = (distance / 1000).toFixed(2);
    
    // Ziel-Marker hervorheben
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && 
            layer.getLatLng().lat === nearest.latitude && 
            layer.getLatLng().lng === nearest.longitude) {
            
            // Marker animieren
            layer.setZIndexOffset(1000);
            layer.openPopup();
            
            // Marker pulsieren lassen
            let size = 32;
            const pulse = setInterval(() => {
                size = size === 32 ? 40 : 32;
                layer.setIcon(L.icon({
                    iconUrl: 'bilder/heart.png',
                    iconSize: [size, size],
                    iconAnchor: [size/2, size]
                }));
            }, 500);
            
            // Nach 5 Sekunden stoppen
            setTimeout(() => clearInterval(pulse), 5000);
        }
    });
    
    showSuccessMessage(`Route zum nächsten Defi berechnet! Entfernung: ${Math.round(distance)}m (${distanceKm}km)`);
    
    // Karte auf Route zoomen
    setTimeout(() => {
        const bounds = L.latLngBounds([
            [userPos.lat, userPos.lng],
            [nearest.latitude, nearest.longitude]
        ]);
        map.fitBounds(bounds, { padding: [100, 100] });
    }, 1000);
}

// ===============================
// Hilfsfunktionen für Meldungen
// ===============================
function showSuccessMessage(message) {
    console.log('✅ ' + message);
    // Optional: Notification anzeigen
    if (typeof alert !== 'undefined') {
        setTimeout(() => alert('✅ ' + message), 100);
    }
}

function showErrorMessage(message) {
    console.error('❌ ' + message);
    // Optional: Notification anzeigen
    if (typeof alert !== 'undefined') {
        setTimeout(() => alert('❌ ' + message), 100);
    }
}

function showInfoMessage(message) {
    console.log('ℹ️ ' + message);
}

// ===============================
// Initialisierung
// ===============================
function initApp() {
    console.log('🚀 DeFind App wird gestartet...');
    console.log('🌍 URL:', window.location.href);
    console.log('🔒 HTTPS:', window.location.protocol === 'https:');
    
    // Daten laden
    loadDefiData();
    
    // Event Listener für Buttons
    document.getElementById('find-me').addEventListener('click', geoFindMe);
    document.getElementById('find-defi').addEventListener('click', routeToNearestDefi);
    
    // Automatisch zu HTTPS wechseln für GitHub Pages
    if (window.location.hostname.includes('github.io') && 
        window.location.protocol !== 'https:' &&
        !window.location.href.includes('localhost')) {
        
        console.log('🔄 Wechsel zu HTTPS für GitHub Pages');
        window.location.href = window.location.href.replace('http:', 'https:');
        return; // Stoppe weitere Ausführung (Seite wird neu geladen)
    }
    
    console.log('✅ App initialisiert');
}

// ===============================
// DOM Ready Event
// ===============================
document.addEventListener('DOMContentLoaded', initApp);

// ===============================
// Globale Funktionen (für Debugging)
// ===============================
window.debugDefis = function() {
    console.log('🔍 Defi-Daten debuggen:');
    console.log('Anzahl Defis:', defiList.length);
    console.log('Defi-Liste:', defiList);
    console.log('API URL:', CONFIG.getApiUrl());
    console.log('Karten-Zentrum:', map.getCenter());
    console.log('Karten-Zoom:', map.getZoom());
};

window.reloadDefis = function() {
    console.log('🔄 Defis neu laden...');
    loadDefiData();
};

window.clearRoute = function() {
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
        console.log('🗑️ Route gelöscht');
    }
};