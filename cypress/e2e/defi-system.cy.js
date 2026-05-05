describe('Defibrillator Systemtest', () => {

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

    // ✅ Kein cy.wait('@getDefis') — stattdessen auf Marker warten
    cy.get('.leaflet-marker-icon', { timeout: 20000 }).should('exist')

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
    cy.get('.leaflet-marker-icon').first().click()

    cy.get('[data-cy="defi-popup"]').should('be.visible')
    cy.get('[data-cy="defi-adresse"]').should('not.be.empty')
  })

  // 🟢 3. Route berechnen
  it('berechnet Route zum Defi', () => {
    cy.get('[data-cy="start-navigation"]').click()

    cy.get('.leaflet-routing-container', { timeout: 15000 }).should('exist')
  })

  // 🔥 4. Neuberechnung bei Abweichung
  it('berechnet Route neu bei Abweichung > 15m', () => {
    cy.get('[data-cy="start-navigation"]').click()

    cy.window().then((win) => {
      if (win.updateUserPosition) {
        win.updateUserPosition(48.210, 16.390)
      }
    })

    cy.get('[data-cy="reroute-message"]', { timeout: 10000 }).should('be.visible')
  })

  // 🔊 5. Navigation UI
  it('zeigt Navigationsanweisungen', () => {
    cy.get('[data-cy="start-navigation"]').click()

    cy.get('#nav-box', { timeout: 10000 }).should('be.visible')
    cy.get('#nav-pfeil').should('exist')
    cy.get('#nav-strasse').should('not.be.empty')
  })

})