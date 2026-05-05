describe('Defibrillator Systemtest', () => {

  beforeEach(() => {
    cy.visit('http://localhost:3000')
  })

  // 🟢 1. Defis laden
  it('lädt Defis und zeigt Marker', () => {
    cy.intercept('GET', '**/defis').as('getDefis')
    cy.wait('@getDefis')

    cy.get('[data-cy="defi-marker"]', { timeout: 10000 })
      .should('have.length.greaterThan', 0)
  })

  // 🟢 2. Klick → Popup
  it('zeigt Details im Popup nach Klick auf Defi', () => {
    cy.get('[data-cy="defi-marker"]').first().click()

    cy.get('[data-cy="defi-popup"]').should('be.visible')
    cy.get('[data-cy="defi-adresse"]').should('not.be.empty')
  })

  // 🟢 3. Route berechnen
  it('berechnet Route zum Defi', () => {
    cy.get('[data-cy="start-navigation"]').click()

    cy.get('[data-cy="route-line"]').should('be.visible')
  })

  // 🔥 4. Change Request: Abweichung → Neuberechnung
  it('berechnet Route neu bei Abweichung > 15m', () => {

    // Start Navigation
    cy.get('[data-cy="start-navigation"]').click()

    // Fake Standort weit weg setzen
    cy.window().then((win) => {
      if (win.updateUserPosition) {
        win.updateUserPosition(48.210, 16.390)
      }
    })

    // Prüfen ob Re-Route passiert
    cy.get('[data-cy="reroute-message"]', { timeout: 10000 })
      .should('be.visible')
  })

  // 🔊 5. Change Request: Navigation UI
  it('zeigt Navigationsanweisungen (Text + Pfeil)', () => {
    cy.get('[data-cy="start-navigation"]').click()

    cy.get('#nav-box').should('be.visible')
    cy.get('#nav-pfeil').should('exist')
    cy.get('#nav-strasse').should('not.be.empty')
  })

})