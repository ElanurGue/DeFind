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
  const status = document.querySelector("#status");
  const mapLink = document.querySelector("#map-link");

  mapLink.href = "";
  mapLink.textContent = "";

  function success(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    status.textContent = "";
    mapLink.href = `https://www.openstreetmap.org/#map=18/${latitude}/${longitude}`;
    mapLink.textContent = `Latitude: ${latitude} °, Longitude: ${longitude} °`;
  }

  function error() {
    status.textContent = "Unable to retrieve your location";
  }

  if (!navigator.geolocation) {
    status.textContent = "Geolocation is not supported by your browser";
  } else {
    status.textContent = "Locating…";
    navigator.geolocation.getCurrentPosition(success, error);
  }
}

document.querySelector("#find-me").addEventListener("click", geoFindMe);
