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
                    🚑 Route zum Defi
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
    if (currentUserMarker) {
        calculateRouteToNearestDefi();
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
        '• Ihre Daten werden nicht gespeichert\n' +
        '• Nur für die Routenberechnung verwendet\n' +
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
        
        console.log(`📍 Standort gefunden: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        
        // Button zurücksetzen
        if (button) {
            button.textContent = originalButtonText;
            button.disabled = false;
        }
        
        // Marker erstellen oder aktualisieren
        if (!currentUserMarker) {
            currentUserMarker = L.circleMarker([lat, lng], {
                radius: 10,
                color: '#3B5D26',
                fillColor: '#6B8F3D',
                fillOpacity: 0.9,
                weight: 3
            }).addTo(map);
            
            // ZUERST einfaches Popup
            currentUserMarker.bindPopup(`
                <div style="font-family: Arial; min-width: 200px;">
                    <h4 style="margin: 0 0 8px 0; color: #1a5fb4; font-size: 16px;">
                        📍 Ihr Standort
                    </h4>
                    <div style="font-size: 14px;">
                        Adresse wird ermittelt...
                    </div>
                </div>
            `);
        } else {
            currentUserMarker.setLatLng([lat, lng]);
        }
        
        // Karte auf Standort zentrieren
        currentUserMarker.openPopup();
        map.setView([lat, lng], 16, { animate: true });
        
        // Adresse ermitteln
        getSimpleAddress(lat, lng);
        
        // Route berechnen (mit kurzer Verzögerung für bessere UX)
        setTimeout(() => {
            calculateRouteToNearestDefi();
        }, 1000);
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
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// ===============================
// Route zum nächsten Defi berechnen
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
                color: '#1a5fb4',
                weight: 6,
                opacity: 0.8
            }]
        },
        createMarker: function() { return null; }
    }).addTo(map);
    
    // Distanz berechnen und anzeigen
    const distance = map.distance([userPos.lat, userPos.lng], [nearest.latitude, nearest.longitude]);
    const distanceKm = (distance / 1000).toFixed(2);
    
    // Erfolgsmeldung mit Details
    showMessage(
        `🚑 Route zum nächsten Defibrillator gefunden!<br>
        📍 ${nearest.adresse.straße} ${nearest.adresse.hausnummer}<br>
        📏 Entfernung: ${Math.round(distance)}m (${distanceKm}km)`, 
        'success'
    );
    
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
            <h4 style="margin: 0 0 8px 0; color: #1a5fb4; font-size: 16px;">
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
// Defi-Liste als Popup anzeigen (wenn kein Standort)
// ===============================
function showDefiListPopup() {
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
// Nachricht anzeigen
// ===============================
function showMessage(text, type = 'info') {
    console.log(`${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'} ${text}`);
    
    // Für wichtige Meldungen ein Toast/Alert anzeigen
    if (type === 'success' || type === 'error') {
        // Temporäre Meldung als Popup in der Karte
        const popup = L.popup()
            .setLatLng(map.getCenter())
            .setContent(`
                <div style="font-family: Arial; padding: 10px; background: ${type === 'success' ? '#d4edda' : '#f8d7da'}; 
                         color: ${type === 'success' ? '#155724' : '#721c24'}; border-radius: 4px;">
                    ${type === 'success' ? '✅' : '❌'} ${text}
                </div>
            `)
            .openOn(map);
        
        // Popup nach 5 Sekunden automatisch schließen
        setTimeout(() => {
            map.closePopup(popup);
        }, 5000);
    }
}

// ===============================
// Popup Fenster, welche zu einem bestimmten Defi routen
// ===============================
function routeToDefi(defi) {
    // Wenn kein Standort vorhanden, zuerst fragen
    if (!currentUserMarker) {
        // User-freundliche Abfrage für spezifischen Defi
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
        
        // Standort abfragen
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                console.log(`📍 Standort für Defi-Route: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                
                // Marker erstellen oder aktualisieren
                if (!currentUserMarker) {
                    createUserMarker(lat, lng);
                } else {
                    currentUserMarker.setLatLng([lat, lng]);
                }
                
                // Karte auf Standort zentrieren
                currentUserMarker.openPopup();
                map.setView([lat, lng], 16, { animate: true });
                
                // Adresse ermitteln
                getSimpleAddress(lat, lng);
                
                // Erfolgsmeldung
                showMessage('✅ Standort ermittelt!', 'success');
                
                // Route berechnen
                setTimeout(() => {
                    createRouteToDefi({ lat, lng }, defi);
                }, 1000);
            },
            function(err) {
                console.error('❌ Standortfehler:', err);
                
                let errorMessage = "Standort konnte nicht ermittelt werden.";
                if (err.code === err.PERMISSION_DENIED) {
                    errorMessage = "Standort-Zugriff wurde verweigert.";
                }
                
                showMessage(errorMessage, 'error');
                
                // Fallback-Standort setzen
                setDefaultLocation();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000
            }
        );
        return;
    }

    const userPos = currentUserMarker.getLatLng();
    createRouteToDefi(userPos, defi);
}

// Hilfsfunktion für Route zu spezifischem Defi
function createRouteToDefi(userPos, defi) {
    // Alte Route entfernen
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    // Neue Route berechnen
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
                color: '#28668d',
                weight: 6,
                opacity: 0.8
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
        `🚑 Route zu ${defi.adresse.straße} ${defi.adresse.hausnummer} berechnet (${Math.round(distance)} m)`,
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
    
    // Event Listener nur für den "find-defi" Button
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