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
let isLiveTracking = false;
let currentDefiTarget = null;

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
// OSRM Routing Service für Fußgänger
// ===============================
const routingService = L.Routing.osrmv1({
    serviceUrl: 'https://router.project-osrm.org/route/v1',
    profile: 'foot', // Fußgänger-Routen
    timeout: 10000
});

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
                    🚑 Führe zum Defi 
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
// Hauptfunktion: Nächsten Defi finden MIT Standortabfrage
// ===============================
function findAndRouteToNearestDefi() {
    console.log('🔍 Finde nächsten Defi...');
    
    // Prüfen ob Defis geladen wurden
    if (!defiList || defiList.length === 0) {
        showMessage('Keine Defis verfügbar. Bitte warten Sie...', 'warning');
        loadDefiData();
        return;
    }
    
    // Wenn schon ein Standort vorhanden ist, direkt Routen berechnen
    if (currentUserMarker && !isLiveTracking) {
        calculateRouteToNearestDefi();
        return;
    }
    
    // Wenn Live-Tracking aktiv ist, fragen ob beendet werden soll
    if (isLiveTracking) {
        stopLiveTracking();
        return;
    }
    
    // Wenn kein Standort, zuerst Standortabfrage
    askForLocationAndFindDefi();
}

// ===============================
// Standortabfrage MIT anschließender Routenberechnung
// ===============================
function askForLocationAndFindDefi() {
    // Prüfen ob Browser Geolocation unterstützt
    if (!navigator.geolocation) {
        alert("Ihr Browser unterstützt keine Standortabfrage.");
        // Fallback: Defi-Liste anzeigen
        showDefiListPopup();
        return;
    }
    
    // User-freundliche Abfrage
    const userResponse = confirm(
        'DeFind - Nächsten Defibrillator finden\n\n' +
        'Um den nächstgelegenen Defibrillator zu finden, benötigen wir Ihren aktuellen Standort.\n\n' +
        '• Ihre Daten werden nicht gespeichert, sie werden nur für die Routenberechnung verwendet\n' +
        '• Ihre Position wird verfolgt, während Sie sich bewegen\n\n' +
        'OK = Standort teilen und Route berechnen\n' +
        'Abbrechen = Ohne Standort fortfahren'
    );
    
    if (userResponse) {
        console.log('📍 Benutzer hat Standortfreigabe akzeptiert');
        // Button-Text ändern während Suche
        const btn = document.getElementById('find-defi');
        const originalText = btn.textContent;
        btn.textContent = 'Suche Standort...';
        btn.disabled = true;
        
        getUserLocationForRouting(btn, originalText);
    } else {
        console.log('📍 Benutzer hat Standortfreigabe abgelehnt');
        // Defi-Liste anzeigen oder Karte auf Wien Zentrum setzen
        showDefiListPopup();
    }
}

// ===============================
// Standort für Routenberechnung abrufen
// ===============================
function getUserLocationForRouting(button, originalButtonText) {
    console.log('📍 Starte Standortabfrage für Routing...');
    
    // Alte Verfolgung stoppen
    if (positionWatchId) {
        navigator.geolocation.clearWatch(positionWatchId);
        positionWatchId = null;
    }
    
    function success(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        console.log(`📍 Standort gefunden: ${lat.toFixed(6)}, ${lng.toFixed(6)} (Genauigkeit: ${Math.round(accuracy)}m)`);
        
        // Button zurücksetzen
        if (button) {
            button.textContent = 'Live-Tracking stoppen';
            button.disabled = false;
        }
        
        // Marker erstellen oder aktualisieren
        if (!currentUserMarker) {
            // KLEINERER blauer Punkt für den Live-Standort
            currentUserMarker = L.circleMarker([lat, lng], {
                radius: 6, // REDUZIERT von 10 auf 6
                color: '#1a73e8',
                fillColor: '#4285f4',
                fillOpacity: 0.9,
                weight: 2,
                className: 'user-live-marker'
            }).addTo(map);
        } else {
            currentUserMarker.setLatLng([lat, lng]);
        }
        
        /* Genauigkeitskreis (optional)
        if (accuracy < 100) { // Nur anzeigen wenn Genauigkeit ok
            L.circle([lat, lng], {
                radius: accuracy,
                color: '#1a73e8',
                fillColor: '#4285f4',
                fillOpacity: 0.1,
                weight: 1
            }).addTo(map).bindTooltip(`Genauigkeit: ${Math.round(accuracy)}m`);
        }
        */
        
        // Popup für Live-Standort
        updateUserMarkerPopup(lat, lng);
        
        // Karte auf Standort zentrieren
        currentUserMarker.openPopup();
        map.setView([lat, lng], 17, { animate: true });
        
        // Adresse ermitteln
        getSimpleAddress(lat, lng);
        
        // Route berechnen (mit kurzer Verzögerung für bessere UX)
        setTimeout(() => {
            calculateRouteToNearestDefi();
        }, 500);
        
        // Live-Tracking starten
        startLiveTracking();
    }
    
    function error(err) {
        console.error('❌ Standortfehler:', err);
        
        // Button zurücksetzen
        if (button) {
            button.textContent = originalButtonText;
            button.disabled = false;
        }
        
        let errorMessage = "Standort konnte nicht ermittelt werden.";
        if (err.code === err.PERMISSION_DENIED) {
            errorMessage = "Standort-Zugriff wurde verweigert.";
        } else if (err.code === err.TIMEOUT) {
            errorMessage = "Standortabfrage hat zu lange gedauert.";
        }
        
        showMessage(errorMessage, 'error');
        
        // Fallback: Defi-Liste anzeigen
        showDefiListPopup();
        
        // Fallback-Standort setzen
        setDefaultLocation();
    }
    
    // Standort abfragen (einmalig für die Routenberechnung)
    navigator.geolocation.getCurrentPosition(
        success,
        error,
        {
            enableHighAccuracy: true, // Wichtig für Fußgänger-Navigation
            timeout: 15000,
            maximumAge: 0
        }
    );
}

// ===============================
// Live-Tracking starten
// ===============================
function startLiveTracking() {
    if (positionWatchId) {
        navigator.geolocation.clearWatch(positionWatchId);
    }
    
    isLiveTracking = true;
    
    positionWatchId = navigator.geolocation.watchPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            console.log(`📍 Live-Update: ${lat.toFixed(6)}, ${lng.toFixed(6)} (${Math.round(accuracy)}m)`);
            
            if (currentUserMarker) {
                // Sanfte Animation der Bewegungen
                currentUserMarker.setLatLng([lat, lng]);
                
                // Karte langsam folgen lassen (nicht bei jedem kleinen Schritt zentrieren)
                if (!map.getBounds().contains([lat, lng])) {
                    map.panTo([lat, lng], {
                        animate: true,
                        duration: 1.0
                    });
                }
                
                // Popup aktualisieren
                updateUserMarkerPopup(lat, lng);
                
                // Wenn eine Route aktiv ist, könnte man hier die Route neu berechnen lassen
                // (optional - kann Performance beeinträchtigen)
                if (routingControl && currentDefiTarget) {
                    // Route automatisch aktualisieren wenn man zu weit abweicht
                    const userPos = currentUserMarker.getLatLng();
                    const distanceToRoute = calculateDistanceToRoute(userPos);
                    
                    if (distanceToRoute > 50) { // Wenn mehr als 50m von der Route entfernt
                        console.log('⚠️ Zu weit von Route entfernt, berechne neu...');
                        recalculateRoute(lat, lng);
                    }
                }
            }
        },
        function(error) {
            console.warn('⚠️ Live-Tracking Fehler:', error);
            showMessage('Live-Tracking unterbrochen', 'warning');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 2000 // Aktuelle Daten für Fußgänger
        }
    );
    
    showMessage('✅ Live-Tracking aktiv. Ihre Position wird verfolgt.', 'success');
}

// ===============================
// Live-Tracking stoppen
// ===============================
function stopLiveTracking() {
    if (positionWatchId) {
        navigator.geolocation.clearWatch(positionWatchId);
        positionWatchId = null;
    }
    
    isLiveTracking = false;
    
    const btn = document.getElementById('find-defi');
    if (btn) {
        btn.textContent = 'Finde den nächsten Defi';
    }
    
    showMessage('Live-Tracking beendet.', 'info');
}

// ===============================
// Route zum nächsten Defi berechnen (FÜR FUSGÄNGER)
// ===============================
function calculateRouteToNearestDefi() {
    if (!currentUserMarker) {
        showMessage('Standort nicht verfügbar.', 'error');
        return;
    }
    
    if (!defiList || defiList.length === 0) {
        showMessage('Keine Defis verfügbar.', 'warning');
        return;
    }
    
    const userPos = currentUserMarker.getLatLng();
    const nearest = findNearestDefi(userPos.lat, userPos.lng);
    
    if (!nearest) {
        showMessage('Keinen Defibrillator in der Nähe gefunden.', 'warning');
        return;
    }
    
    currentDefiTarget = nearest;
    
    // Alte Route entfernen
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    
    console.log(`📍 Berechne Fußgänger-Route zu Defi: ${nearest.adresse.straße} ${nearest.adresse.hausnummer}`);
    
    // Neue Route für Fußgänger berechnen
    routingControl = L.Routing.control({
        router: routingService, // Fußgänger-Routing
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
                color: '#0e6127', // Grün für Fußgänger
                weight: 5,
                opacity: 0.8,
                dashArray: '10, 10' // Gestrichelt für Fußgänger
            }]
        },
        createMarker: function() { return null; }
    }).addTo(map);
    
    // Event Listener für Routen-Load
    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        if (routes && routes.length > 0) {
            const route = routes[0];
            const distance = route.summary.totalDistance;
            const time = Math.round(route.summary.totalTime / 60); // Minuten
            
            // Erfolgsmeldung mit Details
            showMessage(
                `🚶‍♂️ Fußgänger-Route gefunden!<br>
                📍 ${nearest.adresse.straße} ${nearest.adresse.hausnummer}<br>
                📏 Entfernung: ${Math.round(distance)}m<br>
                ⏱️ Gehzeit: ca. ${time} Minuten`, 
                'success'
            );
            
            // Ziel-Marker hervorheben
            highlightTargetDefi(nearest);
        }
    });
    
    // Event Listener für Fehler
    routingControl.on('routingerror', function(e) {
        console.error('Routing Fehler:', e.error);
        showMessage('Route konnte nicht berechnet werden. Versuche direkte Linie...', 'warning');
        
        // Fallback: Direkte Linie zeichnen
        drawDirectRoute(userPos, nearest);
    });
}

// ===============================
// Route neu berechnen (wenn man abweicht)
// ===============================
function recalculateRoute(lat, lng) {
    if (!currentDefiTarget) return;
    
    // Alte Route entfernen
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    
    // Neue Route berechnen
    routingControl = L.Routing.control({
        router: routingService,
        waypoints: [
            L.latLng(lat, lng),
            L.latLng(currentDefiTarget.latitude, currentDefiTarget.longitude)
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
                weight: 5,
                opacity: 0.8,
                dashArray: '10, 10'
            }]
        },
        createMarker: function() { return null; }
    }).addTo(map);
    
    showMessage('Route wurde neu berechnet.', 'info');
}

// ===============================
// Direkte Route zeichnen (Fallback)
// ===============================
function drawDirectRoute(userPos, defi) {
    const directLine = L.polyline([
        [userPos.lat, userPos.lng],
        [defi.latitude, defi.longitude]
    ], {
        color: '#2033a1',
        weight: 3,
        opacity: 0.6,
        dashArray: '5, 10'
    }).addTo(map);
    
    // Distanz berechnen
    const distance = map.distance([userPos.lat, userPos.lng], [defi.latitude, defi.longitude]);
    
    showMessage(
        `⚠️ Direkte Route (keine Fußwege berücksichtigt)<br>
        📏 Luftlinie: ${Math.round(distance)}m`, 
        'warning'
    );
    
    // Als temporäre Route markieren
    setTimeout(() => {
        if (directLine) map.removeLayer(directLine);
    }, 30000);
}

// ===============================
// Ziel-Defi hervorheben
// ===============================
function highlightTargetDefi(defi) {
    setTimeout(() => {
        map.eachLayer(layer => {
            if (layer instanceof L.Marker && 
                layer.getLatLng().lat === defi.latitude && 
                layer.getLatLng().lng === defi.longitude) {
                // Animationseffekt
                layer.openPopup();
                layer.setZIndexOffset(1000);
                
                // Pulsierender Effekt
                const originalIcon = layer.options.icon;
                const pulsingIcon = L.divIcon({
                    html: `<div style="
                        width: 40px;
                        height: 40px;
                        background-color: #ff4757;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        animation: pulse 1.5s infinite;
                    ">
                        <img src="bilder/heart.png" style="width: 24px; height: 24px;">
                    </div>`,
                    className: 'pulsing-marker',
                    iconSize: [40, 40],
                    iconAnchor: [20, 40]
                });
                
                layer.setIcon(pulsingIcon);
                
                // Nach 5 Sekunden zurück zu normal
                setTimeout(() => {
                    layer.setIcon(originalIcon);
                }, 5000);
            }
        });
    }, 500);
}

// ===============================
// Benutzer-Marker Popup aktualisieren
// ===============================
function updateUserMarkerPopup(lat, lng) {
    if (!currentUserMarker) return;
    
    const time = new Date().toLocaleTimeString();
    const popupContent = `
        <div style="font-family: Arial; min-width: 220px;">
            <h4 style="margin: 0 0 8px 0; color: #1a73e8; font-size: 16px;">
                📍 Ihr Live-Standort
            </h4>
            <div style="font-size: 13px; line-height: 1.4; margin-bottom: 8px;">
                <strong>🕒 ${time}</strong><br>
            </div>
            ${currentDefiTarget ? `
            <div style="background: #e8f5e9; padding: 6px; border-radius: 4px; font-size: 12px;">
                🎯 Ziel: ${currentDefiTarget.adresse.straße} ${currentDefiTarget.adresse.hausnummer}
            </div>
            ` : ''}
        </div>
    `;
    
    currentUserMarker.bindPopup(popupContent);
}

// ===============================
// Distanz zur aktuellen Route berechnen
// ===============================
function calculateDistanceToRoute(userPos) {
    // Vereinfachte Berechnung - in einer vollständigen Implementierung
    // würde man die tatsächliche Distanz zur Polyline berechnen
    return 0;
}

// ===============================
// Nächsten Defi finden (Helper-Funktion)
// ===============================
function findNearestDefi(lat, lng) {
    if (!defiList || defiList.length === 0) {
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
// EINFACHE ADRESSE ANZEIGEN
// ===============================
function getSimpleAddress(lat, lng) {
    if (!currentUserMarker) return;
    
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=de`)
        .then(res => res.json())
        .then(data => {
            if (!data || !data.address) {
                updateUserMarkerPopup(lat, lng);
                return;
            }
            
            const addr = data.address;
            let street = addr.road || addr.pedestrian || addr.footway || '';
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
            
            // Popup mit Adresse aktualisieren
            const time = new Date().toLocaleTimeString();
            currentUserMarker.setPopupContent(`
                <div style="font-family: Arial; min-width: 220px;">
                    <h4 style="margin: 0 0 8px 0; color: #1a73e8; font-size: 16px;">
                        📍 Ihr Live-Standort
                    </h4>
                    <div style="font-size: 13px; line-height: 1.4; margin-bottom: 8px;">
                        <strong>${addressText}</strong><br>
                        <span style="color: #666;">🕒 ${time}</span>
                    </div>
                    ${currentDefiTarget ? `
                    <div style="background: #e8f5e9; padding: 6px; border-radius: 4px; font-size: 12px;">
                        🎯 Ziel: ${currentDefiTarget.adresse.straße} ${currentDefiTarget.adresse.hausnummer}
                    </div>
                    ` : ''}
                </div>
            `);
        })
        .catch(err => {
            console.log('Adressermittlung fehlgeschlagen:', err);
            updateUserMarkerPopup(lat, lng);
        });
}

// ===============================
// Popup Fenster, welche zu einem bestimmten Defi routen
// ===============================
function routeToDefi(defi) {
    // Wenn kein Standort vorhanden, zuerst fragen
    if (!currentUserMarker || !isLiveTracking) {
        geoFindMeForDefi((lat, lng) => {
            // Nach Standortermittlung Route berechnen
            currentDefiTarget = defi;
            createRouteToDefi({ lat, lng }, defi);
        });
        return;
    }

    const userPos = currentUserMarker.getLatLng();
    currentDefiTarget = defi;
    createRouteToDefi(userPos, defi);
}

// Hilfsfunktion für Route zu spezifischem Defi
function createRouteToDefi(userPos, defi) {
    // Alte Route entfernen
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    // Neue Route für Fußgänger berechnen
    routingControl = L.Routing.control({
        router: routingService,
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
                weight: 5,
                opacity: 0.8,
                dashArray: '10, 10'
            }]
        },
        createMarker: () => null
    }).addTo(map);

    // Distanz berechnen
    const distance = map.distance(
        [userPos.lat, userPos.lng],
        [defi.latitude, defi.longitude]
    );

    // Erfolgsmeldung
    showMessage(
        `🚶‍♂️ Fußgänger-Route zu ${defi.adresse.straße} ${defi.adresse.hausnummer} berechnet (${Math.round(distance)} m)`,
        'success'
    );
    
    // Ziel hervorheben
    highlightTargetDefi(defi);
}

// ===============================
// MANUELLE STANDFORTABFRAGE (für Defi-Popup-Buttons)
// ===============================
function geoFindMeForDefi(callback) {
    console.log('📍 Standortanfrage für spezifischen Defi');
    
    if (!navigator.geolocation) {
        alert("Ihr Browser unterstützt keine Standortabfrage.");
        return;
    }
    
    // User-freundliche Abfrage
    const userResponse = confirm(
        'DeFind - Route zum Defibrillator\n\n' +
        'Um eine Route zu berechnen, benötigen wir Ihren aktuellen Standort.\n\n' +
        'Möchten Sie Ihren Standort jetzt teilen?'
    );
    
    if (!userResponse) {
        showMessage('Route kann ohne Standort nicht berechnet werden.', 'warning');
        return;
    }
    
    // Alte Verfolgung stoppen
    if (positionWatchId) {
        navigator.geolocation.clearWatch(positionWatchId);
        positionWatchId = null;
    }
    
    function success(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        console.log(`📍 Standort für Defi-Route: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        
        // Marker erstellen oder aktualisieren
        if (!currentUserMarker) {
            // Kleinerer blauer Punkt
            currentUserMarker = L.circleMarker([lat, lng], {
                radius: 6,
                color: '#1a73e8',
                fillColor: '#4285f4',
                fillOpacity: 0.9,
                weight: 2
            }).addTo(map);
        } else {
            currentUserMarker.setLatLng([lat, lng]);
        }
        
        // Karte auf Standort zentrieren
        currentUserMarker.openPopup();
        map.setView([lat, lng], 17, { animate: true });
        
        // Adresse ermitteln
        getSimpleAddress(lat, lng);
        
        // Erfolgsmeldung
        showMessage('✅ Standort ermittelt! Live-Tracking aktiv.', 'success');
        
        // Live-Tracking starten
        startLiveTracking();
        
        // Callback aufrufen (für die spezifische Defi-Route)
        if (callback && typeof callback === 'function') {
            callback(lat, lng);
        }
    }
    
    function error(err) {
        console.error('❌ Standortfehler:', err);
        
        let errorMessage = "Standort konnte nicht ermittelt werden.";
        if (err.code === err.PERMISSION_DENIED) {
            errorMessage = "Standort-Zugriff wurde verweigert.";
        }
        
        showMessage(errorMessage, 'error');
        
        // Fallback-Standort setzen
        setDefaultLocation();
    }
    
    // Standort abfragen
    navigator.geolocation.getCurrentPosition(success, error, {
        enableHighAccuracy: true,
        timeout: 10000
    });
}

// ===============================
// Nachricht anzeigen
// ===============================
function showMessage(text, type = 'info') {
    console.log(`${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'} ${text}`);
    
    // Temporäre Meldung als Popup in der Karte
    const popup = L.popup()
        .setLatLng(map.getCenter())
        .setContent(`
            <div style="font-family: Arial; padding: 12px; 
                     background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'}; 
                     color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'}; 
                     border-radius: 6px; border-left: 4px solid 
                     ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
                     max-width: 300px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">
                        ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                    </span>
                    <div style="font-size: 14px; line-height: 1.4;">${text}</div>
                </div>
            </div>
        `)
        .openOn(map);
    
    // Popup nach 5 Sekunden automatisch schließen (8 für wichtige Meldungen)
    const closeTime = type === 'success' ? 8000 : 5000;
    setTimeout(() => {
        map.closePopup(popup);
    }, closeTime);
}

// ===============================
// CSS für pulsierenden Marker hinzufügen
// ===============================
function addPulsingAnimation() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 71, 87, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
        }
        
        .user-live-marker {
            z-index: 1000 !important;
        }
    `;
    document.head.appendChild(style);
}

// ===============================
// App initialisieren
// ===============================
function initApp() {
    console.log('🚀 DeFind App wird gestartet');
    console.log('🔗 API:', RAILWAY_API);
    
    // CSS-Animationen hinzufügen
    addPulsingAnimation();
    
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

// ===============================
// Fehlende Funktionen hinzufügen
// ===============================

// ===============================
// Defi-Liste als Popup anzeigen (wenn kein Standort)
// ===============================
function showDefiListPopup() {
    if (!defiList || defiList.length === 0) {
        showMessage('Keine Defis verfügbar.', 'warning');
        return;
    }
    
    // Einfache Liste der verfügbaren Defis
    let defiListHTML = '<div style="font-family: Arial; max-height: 300px; overflow-y: auto;">';
    defiListHTML += '<h3 style="margin: 0 0 10px 0; color: #d63031;">Verfügbare Defibrillatoren</h3>';
    
    defiList.slice(0, 10).forEach((defi, index) => {
        defiListHTML += `
            <div style="padding: 8px; border-bottom: 1px solid #eee; font-size: 14px;">
                <strong>${index + 1}. ${defi.adresse.straße} ${defi.adresse.hausnummer}</strong><br>
                <span style="color: #666; font-size: 13px;">
                    ${defi.adresse.plz} ${defi.adresse.stadt}<br>
                    ${defi.zusatzinfo || ''}
                </span>
            </div>
        `;
    });
    
    defiListHTML += '</div>';
    
    // Popup in der Mitte der Karte anzeigen
    L.popup()
        .setLatLng(map.getCenter())
        .setContent(defiListHTML)
        .openOn(map);
    
    showMessage('Wählen Sie einen Defibrillator aus der Liste aus.', 'info');
}

// ===============================
// Standort-Marker erstellen
// ===============================
function createUserMarker(lat, lng) {
    if (currentUserMarker) {
        map.removeLayer(currentUserMarker);
    }
    
    currentUserMarker = L.circleMarker([lat, lng], {
        radius: 4, 
        color: '#1a73e8',
        fillColor: '#4285f4',
        fillOpacity: 0.9,
        weight: 2,
        className: 'user-live-marker'
    }).addTo(map);
    
    // Temporäres Popup
    currentUserMarker.bindPopup(`
        <div style="font-family: Arial; min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #1a73e8; font-size: 16px;">
                📍 Ihr aktueller Standort
            </h4>
            <div style="font-size: 14px;">
                Route wird berechnet...
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
            <h4 style="margin: 0 0 8px 0; color: #1a73e8; font-size: 16px;">
                📍 Standort nicht verfügbar
            </h4>
            <div style="font-size: 14px;">
                Wien Zentrum (Fallback)<br>
                1010 Wien
            </div>
        </div>
    `);
    
    // Karte auf Wien Zentrum setzen
    map.setView([48.2082, 16.3738], 14);
}

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
    console.log('🔄 Defis neu laden');
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
    
    // Überschreibe die calculateRouteToNearestDefi Funktion mit Fallback
    const originalCalculateRoute = window.calculateRouteToNearestDefi;
    window.calculateRouteToNearestDefi = function() {
        if (typeof L.Routing === 'undefined') {
            alert('🚧 Routing-Funktion temporär nicht verfügbar.\n\nBitte laden Sie die Seite neu oder verwenden Sie die direkte Ansicht.');
            return;
        }
        if (originalCalculateRoute) {
            originalCalculateRoute();
        }
    };
}

console.log('✅ JS InteraktiveKarte.js komplett geladen');