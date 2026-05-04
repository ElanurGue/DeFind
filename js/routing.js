/**
 * routing.js
 * Standortabfrage, Live-Tracking und Routenberechnung.
 * Reine Berechnungsfunktionen → routing.logic.js
 */

// ================================================================
// GLOBALE VARIABLEN
// ================================================================
let isRecalculating = false;
let lastRecalculateTime = 0;

// ================================================================
// PRIVATE HILFSFUNKTIONEN
// ================================================================

// ── Kurzes HTML für zweiteilige Meldungen ────────────────────────
function _msgHtml(title, body, color) {
    const c = color || '#cc0000';
    return `<div style="text-align:left;padding:5px">
        <div style="font-size:16px;font-weight:bold;color:${c};margin-bottom:8px">${title}</div>
        ${body ? `<div style="margin-bottom:6px">${body}</div>` : ''}
    </div>`;
}

// ── Leaflet Routing Control bauen ────────────────────────────────
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
        lineOptions: { styles: [{ color, weight: 5, opacity: 0.8, dashArray: '10, 10' }] },
        createMarker: () => null
    }).addTo(map);

    if (onFound) ctrl.on('routesfound', onFound);
    return ctrl;
}

// ── Benutzer-Kreis-Marker erstellen oder verschieben ─────────────
function _setUserCircleMarker(lat, lng) {
    if (!currentUserMarker) {
        currentUserMarker = L.circleMarker([lat, lng], {
            radius: 6, color: '#1a73e8', fillColor: '#4285f4',
            fillOpacity: 0.9, weight: 2, className: 'user-live-marker'
        }).addTo(map);
    } else {
        currentUserMarker.setLatLng([lat, lng]);
    }
}

// ── Standort anfordern ────────────────────────────────────────────
function _requestLocation(opts) {
    if (!navigator.geolocation) {
        alert('Ihr Browser unterstützt keine Standortabfrage.');
        opts.onCancel && opts.onCancel();
        return;
    }
    if (!confirm(opts.confirmMsg)) {
        opts.onCancel && opts.onCancel();
        return;
    }

    if (opts.button) { opts.button.textContent = 'Suche Standort...'; opts.button.disabled = true; }
    if (positionWatchId) { navigator.geolocation.clearWatch(positionWatchId); positionWatchId = null; }

    navigator.geolocation.getCurrentPosition(
        function(pos) {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            console.log(`📍 Standort: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${Math.round(accuracy)}m)`);

            if (opts.button) { opts.button.textContent = 'Live-Tracking stoppen'; opts.button.disabled = false; }

            _setUserCircleMarker(lat, lng);
            updateUserMarkerPopup(lat, lng);
            currentUserMarker.openPopup();
            map.setView([lat, lng], 17, { animate: true });
            getSimpleAddress(lat, lng);
            startLiveTracking();

            opts.onSuccess(lat, lng, accuracy);
        },
        function(err) {
            console.error('❌ Standortfehler:', err);
            if (opts.button) { opts.button.textContent = opts.originalText || 'Finde den nächsten Defi'; opts.button.disabled = false; }

            const msg = err.code === err.PERMISSION_DENIED ? 'Standort-Zugriff wurde verweigert.'
                      : err.code === err.TIMEOUT            ? 'Standortabfrage hat zu lange gedauert.'
                      :                                       'Standort konnte nicht ermittelt werden.';
            showMessage(_msgHtml('❌ Standortfehler', msg), 'error', 10000);

            opts.onCancel && opts.onCancel();
            setDefaultLocation();
        },
        { enableHighAccuracy: true, timeout: opts.timeout || 15000, maximumAge: 0 }
    );
}

// ================================================================
// STANDORT & TRACKING
// ================================================================

// ── Haupteinstieg: Nächsten Defi finden ──────────────────────────
function findAndRouteToNearestDefi() {
    console.log('🔍 Finde nächsten Defi...');

    if (!defiList || defiList.length === 0) {
        showMessage(_msgHtml('⚠️ Keine Defis verfügbar', 'Bitte warten Sie...'), 'warning', 8000);
        loadDefiData();
        return;
    }
    if (isLiveTracking)                       { stopLiveTracking(); return; }
    if (currentUserMarker && !isLiveTracking) { calculateRouteToNearestDefi(); return; }

    askForLocationAndFindDefi();
}

// ── Bestätigungsdialog → Standort holen → Route berechnen ────────
function askForLocationAndFindDefi() {
    const btn = document.getElementById('find-defi');

    _requestLocation({
        confirmMsg:
            'DeFind - Nächsten Defibrillator finden\n\n' +
            'Um den nächstgelegenen Defibrillator zu finden, benötigen wir Ihren aktuellen Standort.\n\n' +
            '• Ihre Daten werden nicht gespeichert, sie werden nur für die Routenberechnung verwendet\n' +
            '• Ihre Position wird verfolgt, während Sie sich bewegen\n\n' +
            'OK = Standort teilen und Route berechnen\n' +
            'Abbrechen = Ohne Standort fortfahren',
        button: btn,
        originalText: btn ? btn.textContent : '',
        onSuccess: (lat, lng, accuracy) => {
            showMessage(
                _msgHtml('✅ Standort ermittelt',
                    `<span style="font-weight:bold">📍 Position:</span> ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
                     <span style="font-weight:bold">🎯 Genauigkeit:</span> ${Math.round(accuracy)} Meter<br>
                     <span style="font-size:12px;color:#666">Live-Tracking ist nun aktiv.</span>`,
                    '#1a73e8'),
                'success', 10000
            );
            setTimeout(() => calculateRouteToNearestDefi(), 500);
        },
        onCancel: () => {
            console.log('📍 Standortfreigabe abgelehnt');
            showDefiListPopup();
        }
    });
}

// ── Live-Tracking starten ─────────────────────────────────────────
function startLiveTracking() {
    if (positionWatchId) navigator.geolocation.clearWatch(positionWatchId);
    isLiveTracking = true;

    positionWatchId = navigator.geolocation.watchPosition(
        function(pos) {
            if (isRecalculating) return;
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
                    
                    console.log(`↩️ ${Math.round(offRoute)}m von Route entfernt – berechne neu`);
                    navController.onReroute();
                    //showMessage(_msgHtml('ℹ️ Route wird neu berechnet...', '', '#1a73e8'), 'info', 8000);
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
    stoppeNavAnzeige();
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
            _msgHtml('⚠️ Route konnte nicht berechnet werden', 'Versuche direkte Linie...'),
            'warning', 10000
        );
        drawDirectRoute(userPos, nearest);
    });
}

// ── Route neu berechnen (Abweichung > 15 m) ──────────────────────
function recalculateRoute(lat, lng) {
    if (!currentDefiTarget) return;
    verbergeNavAnzeige();
    if (routingControl) { map.removeControl(routingControl); routingControl = null; }

    routingControl = _buildRoutingControl(
        { lat, lng }, currentDefiTarget, '#1a73e8',
        function(e) {
            if (e.routes[0]) {
                isRecalculating = false;
                currentRouteCoords = e.routes[0].coordinates;
                starteNavAnzeige(e.routes[0].instructions, e.routes[0].coordinates);
            }
        }
    );
}

// ── Direkte Linie als Fallback ────────────────────────────────────
function drawDirectRoute(userPos, defi) {
    const directLine = L.polyline(
        [[userPos.lat, userPos.lng], [defi.latitude, defi.longitude]],
        { color: '#2033a1', weight: 3, opacity: 0.6, dashArray: '5, 10' }
    ).addTo(map);

    const distance = map.distance([userPos.lat, userPos.lng], [defi.latitude, defi.longitude]);

    showMessage(
        _msgHtml('⚠️ Direkte Route (Luftlinie)',
            `<div style="background:#fff8e1;padding:8px;border-radius:4px;margin-bottom:8px">
                <span style="color:#cc0000;font-weight:bold">📍 Ziel:</span><br>
                ${defi.adresse.straße} ${defi.adresse.hausnummer}
            </div>
            <span style="font-weight:bold;color:#cc0000">📏 Luftlinie:</span> ${Math.round(distance)} Meter<br>
            <span style="font-size:13px;color:#666"><em>Keine Fußwege berücksichtigt.</em> Wird in 30s entfernt.</span>`
        ),
        'warning', 15000
    );

    setTimeout(() => { if (directLine) map.removeLayer(directLine); }, 30000);
}

// ── Route zu einem bestimmten Defi (aus Popup-Button) ────────────
function routeToDefi(defi) {
    if (!currentUserMarker || !isLiveTracking) {
        geoFindMeForDefi((lat, lng) => {
            currentDefiTarget = defi;
            createRouteToDefi({ lat, lng }, defi);
        });
        return;
    }
    currentDefiTarget = defi;
    createRouteToDefi(currentUserMarker.getLatLng(), defi);
}

function createRouteToDefi(userPos, defi) {
    if (routingControl) { map.removeControl(routingControl); routingControl = null; }
    currentRouteCoords = [];
    verbergeNavAnzeige();
    navController.resetState();

    routingControl = _buildRoutingControl(userPos, defi, '#0e6127', function(e) {
        if (e.routes[0]) {
            currentRouteCoords = e.routes[0].coordinates;
            starteNavAnzeige(e.routes[0].instructions, e.routes[0].coordinates);

            // ── Startansage mit Verzögerung ───────────────────────
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
            }, 2000);
            // ─────────────────────────────────────────────────────
        }
    });

    highlightTargetDefi(defi);
}

// ── Standort für Defi-Popup anfordern ────────────────────────────
function geoFindMeForDefi(callback) {
    console.log('📍 Standortanfrage für spezifischen Defi');

    _requestLocation({
        confirmMsg:
            'DeFind - Route zum Defibrillator\n\n' +
            'Um eine Route zu berechnen, benötigen wir Ihren aktuellen Standort.\n\n' +
            'Möchten Sie Ihren Standort jetzt teilen?',
        onSuccess: (lat, lng) => {
            showMessage(
                _msgHtml('✅ Standort ermittelt', 'Live-Tracking aktiv.', '#1a73e8'),
                'success', 10000
            );
            if (callback) callback(lat, lng);
        },
        onCancel: () => {
            showMessage(
                _msgHtml('⚠️ Route kann nicht berechnet werden', 'Ohne Standort keine Route möglich.'),
                'warning', 8000
            );
        }
    });
}