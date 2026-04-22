// ===============================
// Hauptfunktion: Nächsten Defi finden MIT Standortabfrage
// ===============================
function findAndRouteToNearestDefi() {
    console.log('🔍 Finde nächsten Defi...');
    
    // Prüfen ob Defis geladen wurden
    if (!defiList || defiList.length === 0) {
        showMessage(
            `<div style="text-align: left; padding: 5px;">
                <div style="font-size: 16px; font-weight: bold; color: #cc0000; margin-bottom: 8px;">
                    ⚠️ Keine Defis verfügbar
                </div>
                <div style="margin-bottom: 6px;">
                    Bitte warten Sie...
                </div>
            </div>`, 
            'warning', 
            8000
        );
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
        
        // Popup für Live-Standort
        updateUserMarkerPopup(lat, lng);
        
        // Karte auf Standort zentrieren
        currentUserMarker.openPopup();
        map.setView([lat, lng], 17, { animate: true });
        
        // Adresse ermitteln
        getSimpleAddress(lat, lng);
        
        // Erfolgsmeldung mit längerer Anzeigezeit
        showMessage(
            `<div style="text-align: left; padding: 5px;">
                <div style="font-size: 16px; font-weight: bold; color: #1a73e8; margin-bottom: 8px;">
                    ✅ Standort ermittelt
                </div>
                <div style="margin-bottom: 6px;">
                    <span style="font-weight: bold;">📍 Position:</span> ${lat.toFixed(6)}, ${lng.toFixed(6)}
                </div>
                <div style="margin-bottom: 6px;">
                    <span style="font-weight: bold;"> Genauigkeit:</span> ${Math.round(accuracy)} Meter
                </div>
                <div style="font-size: 12px; color: #666; margin-top: 8px;">
                    Live-Tracking ist nun aktiv. Ihre Position wird automatisch aktualisiert.
                </div>
            </div>`,
            'success',
            10000 // 10 Sekunden
        );
        
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
        
        showMessage(
            `<div style="text-align: left; padding: 5px;">
                <div style="font-size: 16px; font-weight: bold; color: #cc0000; margin-bottom: 8px;">
                    ❌ Standortfehler
                </div>
                <div style="margin-bottom: 6px;">
                    ${errorMessage}
                </div>
            </div>`, 
            'error', 
            10000
        );
        
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
                    
                    if (distanceToRoute > 15) { // Wenn mehr als 15m von der Route entfernt
                        console.log('Zu weit von Route entfernt, berechne neu...');
                        recalculateRoute(lat, lng);
                    }
                }
            }
        },
        function(error) {
            console.warn('⚠️ Live-Tracking Fehler:', error);
            showMessage(
                `<div style="text-align: left; padding: 5px;">
                    <div style="font-size: 16px; font-weight: bold; color: #cc0000; margin-bottom: 8px;">
                        ⚠️ Live-Tracking unterbrochen
                    </div>
                </div>`, 
                'warning', 
                8000
            );
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 2000 // Aktuelle Daten für Fußgänger
        }
    );
    
    showMessage(
        `<div style="text-align: left; padding: 5px;">
            <div style="font-size: 16px; font-weight: bold; color: #1a73e8; margin-bottom: 8px;">
                ✅ Live-Tracking aktiv
            </div>
            <div style="margin-bottom: 6px;">
                Ihre Position wird nun verfolgt. Bewegungen werden automatisch aktualisiert.
            </div>
            <div style="font-size: 12px; color: #666;">
                Klicken Sie auf den blauen Punkt für Ihren aktuellen Standort.
            </div>
        </div>`,
        'success',
        8000
    );
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

    // Navigationsanzeige ausblenden wenn Tracking gestoppt
    verbergeNavAnzeige();
    
    const btn = document.getElementById('find-defi');
    if (btn) {
        btn.textContent = 'Finde den nächsten Defi';
    }
    
    showMessage(
        `<div style="text-align: left; padding: 5px;">
            <div style="font-size: 16px; font-weight: bold; color: #666; margin-bottom: 8px;">
            Live-Tracking beendet
            </div>
        </div>`, 
        'info', 
        8000
    );
}

// ===============================
// Route zum nächsten Defi berechnen (FÜR FUSGÄNGER)
// ===============================
function calculateRouteToNearestDefi() {
    if (!currentUserMarker) {
        showMessage(
            `<div style="text-align: left; padding: 5px;">
                <div style="font-size: 16px; font-weight: bold; color: #cc0000; margin-bottom: 8px;">
                    ❌ Standort nicht verfügbar
                </div>
            </div>`, 
            'error', 
            8000
        );
        return;
    }
    
    if (!defiList || defiList.length === 0) {
        showMessage(
            `<div style="text-align: left; padding: 5px;">
                <div style="font-size: 16px; font-weight: bold; color: #cc0000; margin-bottom: 8px;">
                    ⚠️ Keine Defis verfügbar
                </div>
            </div>`, 
            'warning', 
            8000
        );
        return;
    }
    
    const userPos = currentUserMarker.getLatLng();
    const nearest = findNearestDefi(userPos.lat, userPos.lng);
    
    if (!nearest) {
        showMessage(
            `<div style="text-align: left; padding: 5px;">
                <div style="font-size: 16px; font-weight: bold; color: #cc0000; margin-bottom: 8px;">
                    ⚠️ Keinen Defi in der Nähe gefunden
                </div>
            </div>`, 
            'warning', 
            8000
        );
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
                color: '#2363ed',
                weight: 5,
                opacity: 0.8,
                dashArray: '10, 10'
            }]
        },
        createMarker: function() { return null; }
    }).addTo(map);
    
    // Event Listener für Routen-Load
    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        if (routes && routes.length > 0) {
            const route = routes[0];

            currentRouteCoords = route.coordinates;
            starteNavAnzeige(route.instructions, route.coordinates);

            // Ziel-Marker hervorheben
            highlightTargetDefi(nearest);
        }
    });
    
    // Event Listener für Fehler
    routingControl.on('routingerror', function(e) {
        console.error('Routing Fehler:', e.error);
        showMessage(
            `<div style="text-align: left; padding: 5px;">
                <div style="font-size: 16px; font-weight: bold; color: #cc0000; margin-bottom: 8px;">
                    ⚠️ Route konnte nicht berechnet werden
                </div>
                <div style="margin-bottom: 6px;">
                    Versuche direkte Linie...
                </div>
            </div>`, 
            'warning', 
            10000
        );
        
        // Fallback: Direkte Linie zeichnen
        drawDirectRoute(userPos, nearest);
    });
}

// ===============================
// Route neu berechnen (wenn man abweicht)
// ===============================
function recalculateRoute(lat, lng) {
    if (!currentDefiTarget) return;
    
    // Navigationsanzeige kurz zurücksetzen
    verbergeNavAnzeige();

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
                color: '#1a73e8',
                weight: 5,
                opacity: 0.8,
                dashArray: '10, 10'
            }]
        },
        createMarker: function() { return null; }
    }).addTo(map);

    // Navigationsanzeige für neue Route starten
    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        if (routes && routes.length > 0) {
            starteNavAnzeige(routes[0].instructions, routes[0].coordinates);
        }
    });
    
    showMessage(
        `<div style="text-align: left; padding: 5px;">
            <div style="font-size: 16px; font-weight: bold; color: #1a73e8; margin-bottom: 8px;">
                ℹ️ Route wurde neu berechnet
            </div>
        </div>`, 
        'info', 
        8000
    );
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
        `<div style="text-align: left; padding: 5px;">
            <div style="font-size: 16px; font-weight: bold; color: #cc0000; margin-bottom: 8px;">
                ⚠️ Direkte Route (Luftlinie)
            </div>
            <div style="margin-bottom: 8px; padding: 8px; background: #fff8e1; border-radius: 4px;">
                <span style="font-weight: bold; color: #cc0000;">📍 Ziel:</span><br>
                ${defi.adresse.straße} ${defi.adresse.hausnummer}
            </div>
            <div style="margin-bottom: 8px;">
                <span style="font-weight: bold; color: #cc0000;">📏 Luftlinie:</span> ${Math.round(distance)} Meter
            </div>
            <div style="font-size: 13px; color: #666; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                <em>Hinweis:</em> Diese Route berücksichtigt keine Fußwege oder Straßen.<br>
                Sie wird in 30 Sekunden automatisch entfernt.
            </div>
        </div>`, 
        'warning',
        15000 // 15 Sekunden
    );
    
    // Als temporäre Route markieren
    setTimeout(() => {
        if (directLine) map.removeLayer(directLine);
    }, 30000);
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

    // Navigationsanzeige zurücksetzen
    verbergeNavAnzeige();

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

    // ── NEU: Navigationsanzeige starten sobald Route geladen ──
    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        if (routes && routes.length > 0) {
            currentRouteCoords = routes[0].coordinates; 
            starteNavAnzeige(routes[0].instructions, routes[0].coordinates);
        }
    });

    // Distanz berechnen
    const distance = map.distance(
        [userPos.lat, userPos.lng],
        [defi.latitude, defi.longitude]
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
        showMessage(
            `<div style="text-align: left; padding: 5px;">
                <div style="font-size: 16px; font-weight: bold; color: #cc0000; margin-bottom: 8px;">
                    ⚠️ Route kann nicht berechnet werden
                </div>
                <div style="margin-bottom: 6px;">
                    Ohne Standort keine Route möglich.
                </div>
            </div>`, 
            'warning', 
            8000
        );
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
        showMessage(
            `<div style="text-align: left; padding: 5px;">
                <div style="font-size: 16px; font-weight: bold; color: #1a73e8; margin-bottom: 8px;">
                    ✅ Standort ermittelt
                </div>
                <div style="margin-bottom: 6px;">
                    Live-Tracking aktiv.
                </div>
            </div>`, 
            'success', 
            10000
        );
        
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
        
        showMessage(
            `<div style="text-align: left; padding: 5px;">
                <div style="font-size: 16px; font-weight: bold; color: #cc0000; margin-bottom: 8px;">
                    ❌ Standortfehler
                </div>
                <div style="margin-bottom: 6px;">
                    ${errorMessage}
                </div>
            </div>`, 
            'error', 
            10000
        );
        
        // Fallback-Standort setzen
        setDefaultLocation();
    }
    
    // Standort abfragen
    navigator.geolocation.getCurrentPosition(success, error, {
        enableHighAccuracy: true,
        timeout: 10000
    });
}
