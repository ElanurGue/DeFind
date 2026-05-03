// ===============================
// routing.js
// Standortabfrage, Live-Tracking und Routenberechnung
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
    if (currentUserMarker && !isLiveTracking && isGPSMarker) {
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

// ── oben bei den globalen Variablen hinzufügen ──
let isRecalculating = false;
let lastRecalculateTime = 0;

// ── Leaflet Routing Control bauen ────────────
function _buildRoutingControl(from, to, color, onFound) {
    const ctrl = L.Routing.control({
        router: routingService,
        waypoints: [
            L.latLng(from.lat, from.lng), 
            L.latLng(to.latitude ?? to.lat, to.longitude ?? to.lng)
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

    if (onFound) ctrl.on('routesfound', onFound);
    return ctrl;
}

        currentRouteCoords = route.coordinates;
        starteNavAnzeige(route.instructions, route.coordinates);
            
        // Ziel-Marker hervorheben
        highlightTargetDefi(nearest);
        
    


// ── Live-Tracking starten ─────────────────────────────────────────
function startLiveTracking() {
    if (positionWatchId) navigator.geolocation.clearWatch(positionWatchId);
    isLiveTracking = true;

    positionWatchId = navigator.geolocation.watchPosition(
        function(pos) {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            console.log(`📍 Live-Update: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${Math.round(accuracy)}m)`);

            if (!currentUserMarker) return;

            currentUserMarker.setLatLng([lat, lng]);
            if (!map.getBounds().contains([lat, lng])) {
                map.panTo([lat, lng], { animate: true, duration: 1.0 });
            }
            updateUserMarkerPopup(lat, lng);

            // Entfernungsanzeige zum Defi aktualisieren
            if (currentDefiTarget) {
                const meterToDefi = berechneEntfernung(
                    lat, lng, currentDefiTarget.latitude, currentDefiTarget.longitude
                );
                updateDefiDistanz(meterToDefi);
            }

            // Route neu berechnen wenn zu weit abgewichen
            if (routingControl && currentDefiTarget) {
                const offRoute = calculateDistanceToRoute(currentRouteCoords, lat, lng);
                if (shouldRecalculate(offRoute)) {
                    const now = Date.now();
                    if (isRecalculating || (now - lastRecalculateTime) < 5000) return;
                    isRecalculating = true;
                    lastRecalculateTime = now;

                    console.log('🔄 onReroute wird aufgerufen!'); // ← NEU

                    console.log(`↩️ ${Math.round(offRoute)}m von Route entfernt – berechne neu`);
                    navController.onReroute();
                    showMessage(_msgHtml('ℹ️ Route wird neu berechnet...', '', '#1a73e8'), 'info', 8000);
                    setTimeout(() => recalculateRoute(lat, lng), 1500);
                }
            }
        },
        function(err) {
            console.warn('⚠️ Live-Tracking Fehler:', err);
            showMessage(_msgHtml('⚠️ Live-Tracking unterbrochen', ''), 'warning', 8000);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );

    showMessage(
        _msgHtml('✅ Live-Tracking aktiv',
            'Ihre Position wird nun verfolgt.<br>' +
            '<span style="font-size:12px;color:#666">Klicken Sie auf den blauen Punkt für Ihren Standort.</span>',
            '#1a73e8'),
        'success', 8000
    );
}

// ── Live-Tracking stoppen ─────────────────────────────────────────
function stopLiveTracking() {
    if (positionWatchId) { navigator.geolocation.clearWatch(positionWatchId); positionWatchId = null; }
    isLiveTracking = false;
    verbergeNavAnzeige();
    hideDefiDistanz();

    const btn = document.getElementById('find-defi');
    if (btn) btn.textContent = 'Finde den nächsten Defi';

    showMessage(_msgHtml('Live-Tracking beendet', '', '#666'), 'info', 8000);
}


// ================================================================
// ROUTENBERECHNUNG
// ================================================================

// ── Route zum nächsten Defi (Fußgänger) ──────────────────────────
function calculateRouteToNearestDefi() {
    if (!currentUserMarker) {
        showMessage(_msgHtml('❌ Standort nicht verfügbar', ''), 'error', 8000);
        return;
    }
    if (!defiList || defiList.length === 0) {
        showMessage(_msgHtml('⚠️ Keine Defis verfügbar', ''), 'warning', 8000);
        return;
    }

    const userPos = currentUserMarker.getLatLng();
    const nearest = findNearestDefi(userPos.lat, userPos.lng);

    if (!nearest) {
        showMessage(_msgHtml('⚠️ Keinen Defi in der Nähe gefunden', ''), 'warning', 8000);
        return;
    }

    currentDefiTarget = nearest;
    if (routingControl) { map.removeControl(routingControl); routingControl = null; }
    console.log(`📍 Route zu: ${nearest.adresse.straße} ${nearest.adresse.hausnummer}`);

    // ← NUR EINMAL _buildRoutingControl aufrufen!
    routingControl = _buildRoutingControl(userPos, nearest, '#2363ed', function(e) {
        const route = e.routes[0];
        if (!route) return;
        currentRouteCoords = route.coordinates;
        starteNavAnzeige(route.instructions, route.coordinates);
        highlightTargetDefi(nearest);

        // ── Startansage ──────────────────────────────────────
        if (route.instructions && route.instructions.length > 0) {
            const ersterSchritt = route.instructions[0];
            const richtung = ersterSchritt.type?.toLowerCase().includes('left')  ? 'left'
                           : ersterSchritt.type?.toLowerCase().includes('right') ? 'right'
                           : 'straight';
            voiceNav.announceApproaching(
                Math.min(30, Math.round(ersterSchritt.distance / 10) * 10) || 10,
                richtung,
                ersterSchritt.road || '',
                'in_die'
            );
        }
        // ─────────────────────────────────────────────────────
    });

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
    verbergeNavAnzeige(); 
    if (routingControl) { map.removeControl(routingControl); routingControl = null; }

    routingControl = _buildRoutingControl(
    { lat, lng }, currentDefiTarget, '#1a73e8',
    function(e) {
        if (e.routes[0]) {
            isRecalculating = false; // ← NEU: Sperre aufheben
            currentRouteCoords = e.routes[0].coordinates;
            starteNavAnzeige(e.routes[0].instructions, e.routes[0].coordinates);
            //showMessage(_msgHtml('ℹ️ Route wurde neu berechnet', '', '#1a73e8'), 'info', 8000);
        }
    }
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
    navController.resetState(); // ← nur Status zurücksetzen, kein Audio

    routingControl = _buildRoutingControl(userPos, defi, '#0e6127', function(e) {
        if (e.routes[0]) {
            currentRouteCoords = e.routes[0].coordinates;
            starteNavAnzeige(e.routes[0].instructions, e.routes[0].coordinates);

            // ── Startansage mit Verzögerung ──────────────────────────
        setTimeout(() => {
            const ersterSchritt = e.routes[0].instructions[0];
            if (ersterSchritt) {
                const richtung = ersterSchritt.type?.toLowerCase().includes('left')  ? 'left'
                               : ersterSchritt.type?.toLowerCase().includes('right') ? 'right'
                               : 'straight';
                voiceNav.announceApproaching(
                    Math.min(30, Math.round(ersterSchritt.distance / 10) * 10) || 10,
                    richtung,
                    ersterSchritt.road || '',
                    'in_die'
                );
            }
        }, 2000); // ← 2 Sekunden warten
        // ─────────────────────────────────────────────────────────
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
        
    }
    
    // Standort abfragen
    navigator.geolocation.getCurrentPosition(success, error, {
        enableHighAccuracy: true,
        timeout: 10000
    });
}
