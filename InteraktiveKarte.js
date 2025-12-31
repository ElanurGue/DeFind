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

// Defi-Daten von der Datenbank laden und auf der Karte anzeigen
async function loadDefiDataFromDatabase() {
  try {
    // API-Aufruf an den Node.js Server
    const response = await fetch('http://localhost:3000/api/standorte');
    
    if (!response.ok) {
      return;
    }
    
    const defis = await response.json();
    
    // Marker für jeden Standort setzen
    defis.forEach(d => {
      L.marker([d.latitude, d.longitude], { icon: heartIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Arial, sans-serif; min-width: 200px;">
            <h3 style="margin: 0 0 5px 0; color: #d63031;">⚕️ Defibrillator</h3>
            <p style="margin: 5px 0;">
              <strong>${d.adresse.straße} ${d.adresse.hausnummer}</strong><br>
              ${d.adresse.plz} ${d.adresse.stadt}
            </p>
            <p style="margin: 5px 0; font-size: 0.9em; color: #555;">
              📍 ${d.zusatzinfo}
            </p>
          </div>
        `);
    });
    
    // Karte auf alle Marker zoomen
    if (defis.length > 0) {
      const bounds = L.latLngBounds(defis.map(d => [d.latitude, d.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    
  } catch (error) {
    // Keine Fehlerbehandlung 
    return;
  }
}

// Initialisierung wenn DOM geladen ist
document.addEventListener('DOMContentLoaded', function() {
  // Defi-Daten von der Datenbank laden und anzeigen
  loadDefiDataFromDatabase();
});

// Aktuellen Standort anzeigen MIT Live-Tracking
function geoFindMe() {
  if (!navigator.geolocation) {
    return; // Keine Fehlermeldung mehr
  }

  // Globale Variablen für Live-Tracking
  let userMarker = null;
  let watchId = null;

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

    // Wenn noch kein Marker existiert, erstelle einen
    if (!userMarker) {
      userMarker = L.marker([lat, lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>Ihr Standort</b><br>Bewegt sich...`);
      userMarker.openPopup();
    } else {
      // Marker zur neuen Position bewegen
      userMarker.setLatLng([lat, lng]);
    }

    // Adresse abrufen (mit Straße, PLZ und Stadt)
    updateAddress(lat, lng, userMarker);
  }

  function error() {
    // KEINE Fehlermeldung mehr - einfach nichts anzeigen
    console.log("Standort konnte nicht ermittelt werden.");
  }

  // WENN bereits ein Tracking läuft, stoppe es zuerst
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  // Starte kontinuierliche Positionsverfolgung
  watchId = navigator.geolocation.watchPosition(success, error, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 5000
  });
}

// Hilfsfunktion für Adressupdate (mit Straße, PLZ und Stadt)
function updateAddress(lat, lng, marker) {
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
    .then(response => response.json())
    .then(data => {
      if (data && data.address) {
        const addr = data.address;
        
        // Straße mit Hausnummer
        const street = addr.road || addr.pedestrian || addr.footway || '';
        const houseNumber = addr.house_number ? ' ' + addr.house_number : '';
        const streetWithNumber = street + houseNumber;
        
        // Postleitzahl
        const postcode = addr.postcode || '';
        
        // Stadt
        const city = addr.city || addr.town || addr.village || addr.municipality || '';
        
        // Adresse zusammenbauen
        let address = '';
        
        if (streetWithNumber.trim()) {
          address = streetWithNumber;
        }
        
        // Postleitzahl und Stadt hinzufügen
        if (postcode || city) {
          if (address) address += ', ';
          if (postcode) address += postcode;
          if (postcode && city) address += ' ';
          if (city) address += city;
        }
        
        // Fallback falls keine Straße gefunden wurde
        if (!address.trim() && data.display_name) {
          address = data.display_name.split(',')[0];
        }
        
        if (address.trim()) {
          marker.setPopupContent(`<b>Ihr Standort</b><br>${address}`);
        }
      }
    })
    .catch(error => console.error('Fehler:', error));
}

// Button-Event mit Toggle-Funktion
document.addEventListener('DOMContentLoaded', function() {
  // Defi-Daten von der Datenbank laden und anzeigen
  loadDefiDataFromDatabase();
  
  // Button-Event mit Toggle-Funktion hinzufügen
  const findMeBtn = document.getElementById('find-me');
  if (findMeBtn) {
    // Button-Stile setzen
    findMeBtn.style.backgroundColor = '#0e6127D7';
    findMeBtn.style.color = 'white';
    findMeBtn.style.padding = '15px 32px';
    findMeBtn.style.textAlign = 'center';
    findMeBtn.style.textDecoration = 'none';
    findMeBtn.style.display = 'inline-block';
    findMeBtn.style.fontSize = '16px';
    findMeBtn.style.margin = '4px 2px';
    findMeBtn.style.cursor = 'pointer';
    findMeBtn.style.border = 'none';
    findMeBtn.style.borderRadius = '8px';
    
    // Tracking-Status-Variable
    let isTracking = false;
    let watchId = null;
    let userMarker = null;
    
    // Toggle-Funktion
    function toggleTracking() {
      if (!isTracking) {
        // Tracking starten - Button-Text sofort ändern
        findMeBtn.textContent = 'Standort wird geladen...';
        findMeBtn.style.backgroundColor = '#ff9900'; // Orange für "Lädt"
        findMeBtn.disabled = true;
        
        startTracking();
      } else {
        // Tracking stoppen
        stopTracking();
        findMeBtn.textContent = 'Live-Tracking starten';
        findMeBtn.style.backgroundColor = '#0e6127D7';
        isTracking = false;
      }
    }
    
    // Tracking starten Funktion
    function startTracking() {
      if (!navigator.geolocation) {
        // Fallback falls Browser keine Geolocation unterstützt
        findMeBtn.textContent = 'Live-Tracking starten';
        findMeBtn.style.backgroundColor = '#0e6127D7';
        findMeBtn.disabled = false;
        return;
      }
      
      // ZUERST einmaligen Standort abrufen (für sofortige Anzeige)
      navigator.geolocation.getCurrentPosition(
        // Erfolg
        function(position) {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          const userIcon = L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -28]
          });
          
          if (!userMarker) {
            userMarker = L.marker([lat, lng], { icon: userIcon })
              .addTo(map)
              .bindPopup(`<b>Ihr Standort</b><br>Wird geladen...`);
            userMarker.openPopup();
          } else {
            userMarker.setLatLng([lat, lng]);
          }
          
          updateAddress(lat, lng, userMarker);
          
          // Button auf "Tracking stoppen" setzen
          findMeBtn.textContent = 'Tracking stoppen';
          findMeBtn.style.backgroundColor = '#cc0000';
          findMeBtn.disabled = false;
          isTracking = true;
          
          // JETZT Live-Tracking starten (für kontinuierliche Updates)
          startLiveTracking();
        },
        // Fehler
        function(error) {
          console.log("Standort konnte nicht ermittelt werden:", error);
          // Button zurücksetzen
          findMeBtn.textContent = 'Live-Tracking starten';
          findMeBtn.style.backgroundColor = '#0e6127D7';
          findMeBtn.disabled = false;
          isTracking = false;
        },
        // Optionen mit längeren Timeouts für Browser-Abfrage
        {
          enableHighAccuracy: true,
          timeout: 30000, // 30 Sekunden für Browser-Abfrage
          maximumAge: 0
        }
      );
    }
    
    // Live-Tracking für kontinuierliche Updates
    function startLiveTracking() {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
      
      watchId = navigator.geolocation.watchPosition(
        function(position) {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (userMarker) {
            userMarker.setLatLng([lat, lng]);
            updateAddress(lat, lng, userMarker);
          }
        },
        function(error) {
          console.log("Fehler bei Live-Tracking:", error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 10000
        }
      );
    }
    
    // Tracking stoppen Funktion
    function stopTracking() {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      
      if (userMarker) {
        userMarker.setPopupContent(`<b>Ihr Standort</b><br>Tracking gestoppt`);
      }
    }
    
    // Standard-Text setzen
    findMeBtn.textContent = 'Live-Tracking starten';
    
    // Event-Listener hinzufügen
    findMeBtn.addEventListener('click', toggleTracking);
    
    console.log('Button-Event erfolgreich hinzugefügt');
  } else {
    console.error('Button nicht gefunden!');
  }
});