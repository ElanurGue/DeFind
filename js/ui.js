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
                <strong> ${time}</strong><br>
            </div>
            ${currentDefiTarget ? `
            <div style="background: #e8f5e9; padding: 6px; border-radius: 4px; font-size: 12px;">
                 Ziel: ${currentDefiTarget.adresse.straße} ${currentDefiTarget.adresse.hausnummer}
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
     if (!currentRouteCoords || currentRouteCoords.length === 0) return 0;
    
    let minDist = Infinity;
    currentRouteCoords.forEach(point => {
        const dist = berechneEntfernung(userPos.lat, userPos.lng, point.lat, point.lng);
        if (dist < minDist) minDist = dist;
    });
    return minDist;
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
                         Ziel: ${currentDefiTarget.adresse.straße} ${currentDefiTarget.adresse.hausnummer}
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
// Nachricht anzeigen (mit konfigurierbarer Dauer)
// ===============================
function showMessage(text, type = 'info', duration = 5000) {
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
                     max-width: 350px;">
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <span style="font-size: 24px; flex-shrink: 0;">
                        ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                    </span>
                    <div style="font-size: 14px; line-height: 1.4;">${text}</div>
                </div>
            </div>
        `)
        .openOn(map);
    
    setTimeout(() => {
        map.closePopup(popup);
    }, duration);
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
// Defi-Liste als Popup anzeigen (wenn kein Standort)
// ===============================
function showDefiListPopup() {
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
    
    showMessage(
        `<div style="text-align: left; padding: 5px;">
            <div style="font-size: 16px; font-weight: bold; color: #1a73e8; margin-bottom: 8px;">
                ℹ️ Wählen Sie einen Defibrillator
            </div>
            <div style="margin-bottom: 6px;">
                Aus der Liste aus.
            </div>
        </div>`, 
        'info', 
        8000
    );
}
