// Karte initialisieren (5. Bezirk Wien)
const map = L.map('map').setView([48.192, 16.352], 15);

// OpenStreetMap Tiles laden
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// Herzsymbol für Defi-Standorte
const heartIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/833/833472.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -28]
});

// Defi-Daten
const defis = [
  { name: "DEFI 1", lat: 48.1935, lng: 16.3501, address: "Pilgramgasse 22, 1050 Wien" },
  { name: "DEFI 2", lat: 48.1902, lng: 16.3578, address: "Reinprechtsdorfer Straße 12, 1050 Wien" },
  { name: "DEFI 3", lat: 48.1951, lng: 16.3489, address: "Schönbrunner Straße 150, 1050 Wien" }
];

// Marker setzen
defis.forEach(d => {
  L.marker([d.lat, d.lng], { icon: heartIcon })
    .addTo(map)
    .bindPopup(`<b>${d.name}</b><br>${d.address}`);
});

// Aktuellen Standort anzeigen
function geoFindMe() {
  if (!navigator.geolocation) {
    alert("Geolocation wird von Ihrem Browser nicht unterstützt");
    return;
  }

  function success(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // Blauen Marker für aktuellen Standort erstellen
    const userIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -28]
    });

    // Marker hinzufügen
    L.marker([lat, lng], { icon: userIcon })
      .addTo(map)
      .bindPopup(`<b>Ihr Standort</b><br>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`)
      .openPopup();

    // Karte auf Standort zentrieren
    map.setView([lat, lng], 16);

    // Optional: Nächsten Defi finden
    findNearestDefi(lat, lng);
  }

  function error() {
    alert("Standort konnte nicht ermittelt werden. Bitte erlauben Sie den Zugriff auf Ihren Standort.");
  }

  navigator.geolocation.getCurrentPosition(success, error);
}

// Button-Event (falls Button existiert)
const findMeBtn = document.getElementById("find-me");
if (findMeBtn) {
  findMeBtn.addEventListener("click", geoFindMe);
}