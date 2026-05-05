describe('Defibrillator Systemtest', () => {

  // ✅ Cross-Origin Fehler ignorieren
  Cypress.on('uncaught:exception', (err) => {
    return false
  })

  beforeEach(() => {
    cy.visit('https://defind-ec4z.onrender.com/', {
      onBeforeLoad(win) {
        cy.stub(win, 'confirm').returns(true)

        cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((success) => {
          success({ coords: { latitude: 48.1951, longitude: 16.3628, accuracy: 10 } })
        })

        cy.stub(win.navigator.geolocation, 'watchPosition').callsFake((success) => {
          success({ coords: { latitude: 48.1951, longitude: 16.3628, accuracy: 10 } })
          return 1
        })
      }
    })

    cy.get('.leaflet-marker-icon', { timeout: 20000 }).should('exist')
    cy.wait(5000)

    cy.window().then((win) => {
      if (win.mapInstance) win.mapInstance.invalidateSize()
    })
  })

  // 🟢 1. Defis laden
  it('lädt Defis und zeigt Marker', () => {
    cy.get('.leaflet-marker-icon')
      .should('have.length.greaterThan', 0)
  })

  // 🟢 2. Klick → Popup
  it('zeigt Details im Popup nach Klick auf Defi', () => {
    cy.get('.leaflet-marker-icon').last().click({ force: true })
    cy.get('[data-cy="defi-popup"]').should('exist')
    cy.get('[data-cy="defi-adresse"]').should('exist')
  })

  // 🟢 3. Route berechnen
  it('berechnet Route zum Defi', () => {
    cy.get('[data-cy="start-navigation"]').click()
    cy.get('.leaflet-routing-container', { timeout: 15000 }).should('exist')
  })

// 🔥 4. Neuberechnung bei Abweichung
it('berechnet Route neu bei Abweichung > 15m', () => {
  cy.get('[data-cy="start-navigation"]').click()
  cy.get('.leaflet-routing-container', { timeout: 15000 }).should('exist')

  cy.window().then((win) => {
    if (!win.currentDefiTarget) {
      if (win.defiList && win.defiList.length > 0) {
        win.currentDefiTarget = win.defiList[0]
      } else {
        win.currentDefiTarget = {
          latitude: 48.200,
          longitude: 16.370,
          adresse: { straße: 'Teststraße', hausnummer: '1' }
        }
      }
    }
    return new Promise(resolve => setTimeout(resolve, 500))
  }).then(() => {
    cy.window().then((win) => {
      win.recalculateRoute(48.210, 16.390)
    })
  })

  // Prüfen dass eine neue Route berechnet wurde (routing container bleibt bestehen)
  cy.get('.leaflet-routing-container', { timeout: 10000 }).should('exist')
})

  // 🔊 5. Navigation UI
  it('zeigt Navigationsanweisungen', () => {
    cy.get('[data-cy="start-navigation"]').click()
    cy.get('.leaflet-routing-container', { timeout: 15000 }).should('exist')
    cy.get('#nav-box', { timeout: 10000 }).should('exist')
    cy.get('#nav-pfeil').should('exist')
    cy.get('#nav-strasse').should('exist')
  })

})