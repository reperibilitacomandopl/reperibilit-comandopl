import { describe, it, expect } from 'vitest'
import { isMalattia, isMattina, isPomeriggio, isAssenza, isLavoro, isAssenzaProtetta } from '@/utils/shift-logic'

describe('shift-logic utilities', () => {

  // ====== isMalattia ======
  describe('isMalattia', () => {
    it('riconosce codici malattia standard', () => {
      expect(isMalattia('M')).toBe(true)
      expect(isMalattia('MAL')).toBe(true)
      expect(isMalattia('MALATTIA')).toBe(true)
    })

    it('riconosce codici malattia numerici', () => {
      expect(isMalattia('0018')).toBe(true)  // Malattia Figlio
      expect(isMalattia('0032')).toBe(true)  // Visite
      expect(isMalattia('0003')).toBe(true)  // Allattamento
      expect(isMalattia('0035')).toBe(true)  // Donazione Sangue
    })

    it('è case-insensitive', () => {
      expect(isMalattia('malattia')).toBe(true)
      expect(isMalattia('Mal')).toBe(true)
    })

    it('non confonde turni mattina con malattia', () => {
      expect(isMalattia('M7')).toBe(false)
      expect(isMalattia('M8')).toBe(false)
    })

    it('gestisce null/undefined/vuoto', () => {
      expect(isMalattia(null)).toBe(false)
      expect(isMalattia(undefined)).toBe(false)
      expect(isMalattia('')).toBe(false)
    })
  })

  // ====== isMattina ======
  describe('isMattina', () => {
    it('riconosce turni mattina', () => {
      expect(isMattina('M7')).toBe(true)
      expect(isMattina('M8')).toBe(true)
    })

    it('NON confonde malattia con mattina', () => {
      expect(isMattina('M')).toBe(false)      // "M" è malattia
      expect(isMattina('MAL')).toBe(false)
      expect(isMattina('MALATTIA')).toBe(false)
    })

    it('è case-insensitive', () => {
      expect(isMattina('m7')).toBe(true)
    })
  })

  // ====== isPomeriggio ======
  describe('isPomeriggio', () => {
    it('riconosce turni pomeriggio', () => {
      expect(isPomeriggio('P14')).toBe(true)
      expect(isPomeriggio('P15')).toBe(true)
    })

    it('è case-insensitive', () => {
      expect(isPomeriggio('p14')).toBe(true)
    })

    it('gestisce null', () => {
      expect(isPomeriggio(null)).toBe(false)
    })
  })

  // ====== isAssenza ======
  describe('isAssenza', () => {
    it('riconosce ferie', () => {
      expect(isAssenza('F')).toBe(true)
      expect(isAssenza('FERIE')).toBe(true)
      expect(isAssenza('FERIE_AP')).toBe(true)
      expect(isAssenza('FEST_SOP')).toBe(true)
    })

    it('riconosce permessi L.104', () => {
      expect(isAssenza('104')).toBe(true)
    })

    it('riconosce recupero/riposo', () => {
      expect(isAssenza('RP')).toBe(true)
      expect(isAssenza('RR')).toBe(true)
      expect(isAssenza('RPS')).toBe(true)
    })

    it('riconosce blocco reperibilità', () => {
      expect(isAssenza('BR')).toBe(true)
    })

    it('riconosce malattia come assenza', () => {
      expect(isAssenza('MALATTIA')).toBe(true)
      expect(isAssenza('MAL')).toBe(true)
    })

    it('NON classifica turni come assenza', () => {
      expect(isAssenza('M7')).toBe(false)
      expect(isAssenza('P14')).toBe(false)
      expect(isAssenza('REP')).toBe(false)
      expect(isAssenza('REP 22-07')).toBe(false)
    })

    it('gestisce parentesi nei codici', () => {
      expect(isAssenza('(F)')).toBe(true)
      expect(isAssenza('(104)')).toBe(true)
    })
  })

  // ====== isAssenzaProtetta ======
  describe('isAssenzaProtetta', () => {
    it('protegge ferie e malattia', () => {
      expect(isAssenzaProtetta('FERIE')).toBe(true)
      expect(isAssenzaProtetta('MALATTIA')).toBe(true)
      expect(isAssenzaProtetta('104')).toBe(true)
    })

    it('NON protegge riposi generati', () => {
      expect(isAssenzaProtetta('RP')).toBe(false)
      expect(isAssenzaProtetta('RR')).toBe(false)
    })
  })

  // ====== isLavoro ======
  describe('isLavoro', () => {
    it('classifica turni come lavoro', () => {
      expect(isLavoro('M7')).toBe(true)
      expect(isLavoro('P14')).toBe(true)
    })

    it('NON classifica assenze come lavoro', () => {
      expect(isLavoro('FERIE')).toBe(false)
      expect(isLavoro('RP')).toBe(false)
      expect(isLavoro(null)).toBe(false)
    })
  })
})
