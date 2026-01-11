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
let locationPermissionAsked = false; // Neu: Verhindert wiederholtes Fragen

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
        
        //Popup Fenster für jeden Defi Marker
        marker.bindPopup(`
            <div style="font-family: Arial; min-width: 220px;">
                <h4 style="margin: 0 0 8px 0; color: #d63031; font-size: 16px;">
                    🩺 Defibrillator
                </h4>

                <div style="font-size: 14px; margin-bottom: 6px;">
                    <strong>${defi.adresse.straße} ${defi.adresse.hausnummer}</strong><br>
                    ${defi.adresse.plz} ${defi.adresse.stadt}
                </div>

                <div style="font-size: 13px; color: #555; margin-bottom: 10px;">
                    📍 ${defi.zusatzinfo || ''}
                </div>

                <button
                    style="
                        width: 100%;
                        padding: 8px;
                        background: #0e6127;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 14px;
                        cursor: pointer;
                    "
                    onclick="routeToDefi(${JSON.stringify(defi).replace(/"/g, '&quot;')})"
                >
                    🚑 Lead to Defi
                </button>
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
// AUTOMATISCHE STANDFORTABFRAGE BEIM START
// ===============================
function askForLocationPermission() {
    // Verhindert wiederholtes Fragen
    if (locationPermissionAsked) return;
    locationPermissionAsked = true;
    
    // Kleine Verzögerung, damit die Seite erst vollständig geladen ist
    setTimeout(() => {
        // Überprüfen ob Browser Geolocation unterstützt
        if (!navigator.geolocation) {
            console.log('❌ Browser unterstützt keine Geolocation');
            showMessage('Ihr Browser unterstützt keine Standortabfrage.', 'warning');
            return;
        }
        
        // Freundliche Abfrage anzeigen
        const userResponse = confirm(
            'DeFind - Optimale Routenfunktion\n\n' +
            'Möchten Sie Ihren Standort teilen, um die beste Route zum nächsten Defibrillator zu berechnen?\n\n' +
            '• Ihre Daten werden nicht gespeichert\n' +
            '• Nur für die Routenberechnung verwendet\n' +
            '• Sie können jederzeit ablehnen\n\n' +
            'OK = Standort teilen\n' +
            'Abbrechen = Ohne Standort fortfahren'
        );
        
        if (userResponse) {
            console.log('📍 Benutzer hat Standortfreigabe akzeptiert');
            getUserLocation();
        } else {
            console.log('📍 Benutzer hat Standortfreigabe abgelehnt');
            showMessage('Sie können Ihren Standort jederzeit über den "Standort teilen" Button aktivieren.', 'info');
            
            // Fallback auf Wien Zentrum setzen
            setDefaultLocation();
        }
    }, 1500); // 1.5 Sekunden Verzögerung für bessere UX
}

// ===============================
// Standort abrufen (nach Bestätigung)
// ===============================
function getUserLocation() {
    console.log('📍 Starte Standortabfrage...');
    
    // Alte Verfolgung stoppen
    if (positionWatchId) {
        navigator.geolocation.clearWatch(positionWatchId);
        positionWatchId = null;
    }
    
    // Alten Marker entfernen
    if (currentUserMarker) {
        map.removeLayer(currentUserMarker);
        currentUserMarker = null;
    }
    
    let firstLocation = true;
    
    function success(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        console.log(`📍 Standort gefunden: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        
        // Marker erstellen oder aktualisieren
        if (!currentUserMarker) {
            createUserMarker(lat, lng);
        } else {
            currentUserMarker.setLatLng([lat, lng]);
        }
        
        // Bei erstem Standort Karte zentrieren
        if (firstLocation) {
            currentUserMarker.openPopup();
            map.setView([lat, lng], 16, { animate: true });
            firstLocation = false;
            
            // Erfolgsmeldung
            showMessage('✅ Standort ermittelt - Optimale Routen sind jetzt möglich!', 'success');
        }
        
        // Adresse ermitteln
        getSimpleAddress(lat, lng);
    }
    
    function error(err) {
        console.error('❌ Standortfehler:', err);
        
        let errorMessage = "Standort konnte nicht ermittelt werden.";
        if (err.code === err.PERMISSION_DENIED) {
            errorMessage = "Standort-Zugriff wurde verweigert. Sie können dies in den Browsereinstellungen ändern.";
        } else if (err.code === err.TIMEOUT) {
            errorMessage = "Standortabfrage hat zu lange gedauert.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
            errorMessage = "Standortinformationen sind nicht verfügbar.";
        }
        
        showMessage(errorMessage, 'error');
        
        // Fallback auf Wien Zentrum
        setDefaultLocation();
    }
    
    // Standort mit hoher Genauigkeit abrufen
    positionWatchId = navigator.geolocation.watchPosition(
        success,
        error,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
    
    // Einmalige Abfrage als Fallback
    navigator.geolocation.getCurrentPosition(success, error, {
        enableHighAccuracy: true,
        timeout: 10000
    });
}

// ===============================
// Standort-Marker erstellen
// ===============================
function createUserMarker(lat, lng) {
    currentUserMarker = L.circleMarker([lat, lng], {
        radius: 10,
        color: '#1a5fb4',
        fillColor: '#62a0ea',
        fillOpacity: 0.9,
        weight: 3
    }).addTo(map);
    
    // Temporäres Popup
    currentUserMarker.bindPopup(`
        <div style="font-family: Arial; min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #1a5fb4; font-size: 16px;">
                📍 Ihr aktueller Standort
            </h4>
            <div style="font-size: 14px;">
                Adresse wird ermittelt...
            </div>
        </div>
    `);
}

// ===============================
// Default-Standort (Wien Zentrum)
// ===============================
function setDefaultLocation() {
    console.log('📍 Verwende Default-Standort (Wien Zentrum)');
    
    if (currentUserMarker) {
        map.removeLayer(currentUserMarker);
    }
    
    currentUserMarker = L.marker([48.2082, 16.3738]).addTo(map);
    currentUserMarker.bindPopup(`
        <div style="font-family: Arial; min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #1a5fb4; font-size: 16px;">
                📍 Standort nicht verfügbar
            </h4>
            <div style="font-size: 14px;">
                Wien Zentrum (Fallback)<br>
                1010 Wien
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                Tipp: Klicken Sie auf "Standort teilen" für Ihren aktuellen Standort
            </div>
        </div>
    `).openPopup();
    
    // Karte auf Wien Zentrum setzen
    map.setView([48.2082, 16.3738], 14);
}

// ===============================
// MANUELLE STANDFORTABFRAGE (für Button)
// ===============================
function geoFindMe() {
    console.log('📍 Manuelle Standortanfrage');
    
    if (!navigator.geolocation) {
        alert("Ihr Browser unterstützt keine Standortabfrage.");
        return;
    }
    
    // Alte Verfolgung stoppen
    if (positionWatchId) {
        navigator.geolocation.clearWatch(positionWatchId);
        positionWatchId = null;
    }
    
    // Alten Marker entfernen
    if (currentUserMarker) {
        map.removeLayer(currentUserMarker);
        currentUserMarker = null;
    }
    
    // Button-Status ändern
    const btn = document.getElementById('find-me');
    const originalText = btn.textContent;
    btn.textContent = 'Suche Standort...';
    btn.disabled = true;
    
    let firstLocation = true;
    
    function success(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        console.log(`📍 Manueller Standort: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        
        // Button zurücksetzen
        if (firstLocation) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
        
        // Marker erstellen
        if (!currentUserMarker) {
            createUserMarker(lat, lng);
        } else {
            currentUserMarker.setLatLng([lat, lng]);
        }
        
        // Bei erstem Standort Karte zentrieren
        if (firstLocation) {
            currentUserMarker.openPopup();
            map.setView([lat, lng], 16, { animate: true });
            firstLocation = false;
        }
        
        // Adresse ermitteln
        getSimpleAddress(lat, lng);
    }
    
    function error(err) {
        console.error('❌ Manueller Standortfehler:', err);
        
        // Button zurücksetzen
        btn.textContent = originalText;
        btn.disabled = false;
        
        let errorMessage = "Standort konnte nicht ermittelt werden.";
        if (err.code === err.PERMISSION_DENIED) {
            errorMessage = "Standort-Zugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Browsereinstellungen.";
        }
        
        showMessage(errorMessage, 'error');
        
        // Fallback: Wien Zentrum
        setDefaultLocation();
    }
    
    // Standort abfragen
    navigator.geolocation.getCurrentPosition(success, error, {
        enableHighAccuracy: true,
        timeout: 10000
    });
}

// ===============================
// EINFACHE ADRESSE ANZEIGEN
// ===============================
function getSimpleAddress(lat, lng) {
    if (!currentUserMarker) return;
    
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=de`)
        .then(res => res.json())
        .then(data => {
            if (!data || !data.address) {
                currentUserMarker.setPopupContent(`
                    <div style="font-family: Arial; min-width: 200px;">
                        <h4 style="margin: 0 0 8px 0; color: #1a5fb4; font-size: 16px;">
                            📍 Ihr Standort
                        </h4>
                        <div style="font-size: 14px;">
                            Adresse nicht verfügbar
                        </div>
                    </div>
                `);
                return;
            }
            
            const addr = data.address;
            let street = addr.road || addr.pedestrian || '';
            const number = addr.house_number ? ` ${addr.house_number}` : '';
            const streetWithNumber = street ? `${street}${number}` : '';
            let city = addr.city || addr.town || addr.village || '';
            const postcode = addr.postcode || '';
            
            let addressText = '';
            if (streetWithNumber) addressText += streetWithNumber;
            if (postcode && city) {
                if (addressText) addressText += '<br>';
                addressText += `${postcode} ${city}`;
            } else if (city) {
                if (addressText) addressText += '<br>';
                addressText += city;
            }
            
            if (!addressText) addressText = 'Unbekannter Ort';
            
            currentUserMarker.setPopupContent(`
                <div style="font-family: Arial; min-width: 200px;">
                    <h4 style="margin: 0 0 8px 0; color: #1a5fb4; font-size: 16px;">
                        📍 Ihr aktueller Standort
                    </h4>
                    <div style="font-size: 14px; line-height: 1.4;">
                        ${addressText}
                    </div>
                    <div style="margin-top: 8px; font-size: 12px; color: #666;">
                        Für optimale Routenberechnung
                    </div>
                </div>
            `);
        })
        .catch(err => {
            console.log('Adressermittlung fehlgeschlagen:', err);
            currentUserMarker.setPopupContent(`
                <div style="font-family: Arial; min-width: 200px;">
                    <h4 style="margin: 0 0 8px 0; color: #1a5fb4; font-size: 16px;">
                        📍 Ihr Standort
                    </h4>
                    <div style="font-size: 14px;">
                        Adresse nicht verfügbar
                    </div>
                </div>
            `);
        });
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
        askForLocationPermission();
        showMessage('Bitte erlauben Sie zuerst den Standortzugriff für die Routenberechnung.', 'info');
        return;
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
// Popup Fenster, welche zu einem bestimmten Defi routen
// ===============================
function routeToDefi(defi) {
    if (!currentUserMarker) {
        const ok = confirm(
            'Ihr Standort ist nicht bekannt.\n\n' +
            'Möchten Sie zuerst Ihren Standort ermitteln?'
        );
        if (ok) {
            geoFindMe();
        }
        return;
    }

    const userPos = currentUserMarker.getLatLng();

    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(userPos.lat, userPos.lng),
            L.latLng(defi.latitude, defi.longitude)
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        show: false,
        lineOptions: {
            styles: [{
                color: '#0e6127',
                weight: 6,
                opacity: 0.8
            }]
        },
        createMarker: () => null
    }).addTo(map);

    const distance = map.distance(
        [userPos.lat, userPos.lng],
        [defi.latitude, defi.longitude]
    );

    showMessage(
        `🚑 Route zum Defibrillator (${Math.round(distance)} m)`,
        'success'
    );
}

// ===============================
// App initialisieren
// ===============================
function initApp() {
    console.log('🚀 DeFind App wird gestartet');
    console.log('🔗 API:', RAILWAY_API);
    
    // Defis laden
    loadDefiData();
    
    // Event Listener für Buttons
    document.getElementById('find-me').addEventListener('click', geoFindMe);
    document.getElementById('find-defi').addEventListener('click', routeToNearestDefi);
    
    // Automatische Standortabfrage starten (nach kurzer Verzögerung)
    askForLocationPermission();
    
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
    console.log('Standort-Marker:', currentUserMarker ? 'Ja' : 'Nein');
};

window.reloadDefis = function() {
    console.log('🔄 Defis neu laden');
    loadDefiData();
};