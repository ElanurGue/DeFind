// ===============================
// Konfiguration
// ===============================
const CONFIG = {
    // Railway Backend URL (hier eintragen nach Deployment)
    API_URL: 'https://defi-backend-production.up.railway.app/api/standorte',
    
    // Für lokale Entwicklung:
    // API_URL: 'http://localhost:3000/api/standorte'
};

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
// Globale Variablen für Routing
// ===============================
let defiList = [];
let routingControl = null;
let currentUserMarker = null;
let positionWatchId = null;

// ===============================
// Herzsymbol für Defi-Standorte
// ===============================
const heartIcon = L.icon({
    iconUrl: 'bilder/heart.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28]
});

// ===============================
// Defi-Daten laden (angepasst für Railway)
// ===============================
async function loadDefiData() {
    try {
        console.log('🌐 Lade Defi-Daten von:', CONFIG.API_URL);
        
        const response = await fetch(CONFIG.API_URL, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('❌ API-Fehler:', response.status);
            loadFallbackData();
            return;
        }

        const result = await response.json();
        
        // Railway API gibt {success, count, data} zurück
        if (result.success) {
            defiList = result.data;
        } else {
            defiList = result; // Fallback für lokale API
        }

        console.log(`✅ ${defiList.length} Defis geladen`);

        // Marker auf Karte setzen
        defiList.forEach(d => {
            L.marker([d.latitude, d.longitude], { icon: heartIcon })
                .addTo(map)
                .bindPopup(`
                    <div style="font-family: Arial; min-width: 200px;">
                        <h3 style="margin: 0; color: #d63031;">⚕️ Defibrillator</h3>
                        <p>
                            <strong>${d.adresse.straße} ${d.adresse.hausnummer}</strong><br>
                            ${d.adresse.plz} ${d.adresse.stadt}
                        </p>
                        <p style="font-size: 0.9em; color: #555;">
                            📍 ${d.zusatzinfo}
                        </p>
                    </div>
                `);
        });

        if (defiList.length > 0) {
            const bounds = L.latLngBounds(defiList.map(d => [d.latitude, d.longitude]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        
        updateStatus(`${defiList.length} Defis geladen`);

    } catch (e) {
        console.error('❌ Fehler beim Laden:', e);
        loadFallbackData();
    }
}

// ===============================
// Fallback-Daten (wenn Railway nicht erreichbar)
// ===============================
function loadFallbackData() {
    console.log('⚠️ Verwende Fallback-Daten');
    
    // Ein paar Beispiel-Defis (aus deiner DB)
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
            zusatzinfo: "an der Hauswand rechts eben dem Eingang"
        },
        {
            id: 2,
            latitude: 48.1953328,
            longitude: 16.3563125,
            adresse: {
                plz: "1050",
                stadt: "Wien",
                straße: "Hamburgerstraße",
                hausnummer: "9"
            },
            zusatzinfo: "im Stiegenhaus vor der Aufzugtüre im EG"
        }
    ];
    
    // Marker setzen
    defiList.forEach(d => {
        L.marker([d.latitude, d.longitude], { icon: heartIcon })
            .addTo(map)
            .bindPopup(`<b>${d.adresse.straße} ${d.adresse.hausnummer}</b>`);
    });
    
    updateStatus('⚠️ Offline-Modus aktiv');
}

// ===============================
// Status-Anzeige
// ===============================
function updateStatus(message) {
    console.log('Status:', message);
    // Optional: Status irgendwo anzeigen
    // document.getElementById('status').textContent = message;
}

// ===============================
// Adresse per Reverse Geocoding
// ===============================
function updateAddress(lat, lng, marker) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
            if (!data.address) return;

            const addr = data.address;
            const street = addr.road || addr.pedestrian || '';
            const number = addr.house_number ? ' ' + addr.house_number : '';
            const city = addr.city || addr.town || addr.village || '';
            const postcode = addr.postcode || '';

            const text = `${street}${number}, ${postcode} ${city}`;
            marker.setPopupContent(`<b>Ihr Standort</b><br>${text}`);
        })
        .catch(() => {
            // Bei Fehler Koordinaten anzeigen
            marker.setPopupContent(`<b>Ihr Standort</b><br>${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        });
}

// ===============================
// Nächsten Defi finden
// ===============================
function findNearestDefi(lat, lng) {
    let nearest = null;
    let minDist = Infinity;

    defiList.forEach(d => {
        const dist = map.distance([lat, lng], [d.latitude, d.longitude]);
        if (dist < minDist) {
            minDist = dist;
            nearest = d;
        }
    });

    return nearest;
}

// ===============================
// LIVE-STANDORT (mit Circle für flüssigere Bewegung)
// ===============================
function geoFindMe() {
  if (!navigator.geolocation) return;

  // Existierende Verfolgung stoppen
  if (window.positionWatchId) {
    navigator.geolocation.clearWatch(window.positionWatchId);
  }

  // Alten Marker entfernen
  if (currentUserMarker) {
    map.removeLayer(currentUserMarker);
  }

  // Circle für flüssigere Bewegung erstellen
  currentUserMarker = L.circleMarker([0, 0], {
    radius: 12,
    color: '#1a5fb4',      // Dunkleres Blau für Rand
    fillColor: '#62a0ea',   // Dunkleres Blau für Füllung
    fillOpacity: 0.9,
    weight: 3
  }).addTo(map);

  currentUserMarker.bindPopup(`<b>Ihr Standort</b><br>Wird aktualisiert...`);

  let isFirstUpdate = true;

  function success(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // Sanfte Animation zum neuen Standort
    currentUserMarker.setLatLng([lat, lng]);
    
    if (isFirstUpdate) {
      currentUserMarker.openPopup();
      map.setView([lat, lng], 16, { animate: true });
      isFirstUpdate = false;
    }

    updateAddress(lat, lng, currentUserMarker);
  }

  function error(err) {
    console.error("Standortfehler:", err);
    currentUserMarker.bindPopup(`<b>Standortfehler</b><br>${err.message}`).openPopup();
  }

  // Watch-Position starten
  window.positionWatchId = navigator.geolocation.watchPosition(
    success,
    error,
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000
    }
  );
}


// ===============================
// ROUTE ZUM NÄCHSTEN DEFI
// ===============================
function routeToNearestDefi() {
  if (!currentUserMarker) {
    alert('Bitte zuerst Live-Standort starten');
    return;
  }

  const pos = currentUserMarker.getLatLng();
  const nearest = findNearestDefi(pos.lat, pos.lng);

  if (!nearest) {
    alert('Kein Defi gefunden');
    return;
  }

  if (routingControl) {
    map.removeControl(routingControl);
  }
  // 🔹 Live-Standort-Marker ausblenden
  if (currentUserMarker) {
  map.removeLayer(currentUserMarker);
  }

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(pos.lat, pos.lng),
      L.latLng(nearest.latitude, nearest.longitude)
    ],
    addWaypoints: false,
    draggableWaypoints: false,
    show: false,
    lineOptions: {
      styles: [{ color: 'green', weight: 5 }]
    }
  }).addTo(map);
}

// ===============================
// DOM READY
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  loadDefiDataFromDatabase();

  document.getElementById('find-me').addEventListener('click', geoFindMe);
  document.getElementById('find-defi').addEventListener('click', routeToNearestDefi);
});
