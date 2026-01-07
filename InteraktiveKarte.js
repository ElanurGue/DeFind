// ===============================
// Karte initialisieren (5. Bezirk Wien)
// ===============================
const map = L.map('map').setView([48.192, 16.352], 15);

// ===============================
// OpenStreetMap Tiles
// ===============================
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

// ===============================
// Globale Variablen für Routing
// ===============================
let defiList = [];
let routingControl = null;
let currentUserMarker = null;

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
// Defi-Daten laden
// ===============================
async function loadDefiDataFromDatabase() {
  try {
    const response = await fetch('http://localhost:3000/api/standorte');
    if (!response.ok) return;

    const defis = await response.json();
    defiList = defis;

    defis.forEach(d => {
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

    if (defis.length > 0) {
      const bounds = L.latLngBounds(defis.map(d => [d.latitude, d.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  } catch (e) {
    console.error(e);
  }
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
    .catch(() => {});
}

// ===============================
// LIVE-STANDORT 
// ===============================
function geoFindMe() {
  if (!navigator.geolocation) return;

  let userMarker = null;
  let watchId = null;

  function success(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    const userIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -28]
    });

    if (!userMarker) {
      userMarker = L.marker([lat, lng], {
         //Standort-Marker ändern 
        radius: 8,
        color: '#3b5d26',        // Randfarbe
        fillColor: '#B8C59C',    // Füllfarbe
        fillOpacity: 0.9 
        
        })
        .addTo(map)
        .bindPopup(`<b>Ihr Standort</b><br>Bewegt sich...`);
      userMarker.openPopup();
    } else {
      userMarker.setLatLng([lat, lng]);
    }

    currentUserMarker = userMarker; //wichtig für Routing
    updateAddress(lat, lng, userMarker);
  }

  function error() {
    console.log("Standort konnte nicht ermittelt werden.");
  }

  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  watchId = navigator.geolocation.watchPosition(success, error, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 5000
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
