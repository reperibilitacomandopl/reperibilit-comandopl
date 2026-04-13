import { describe, it, expect } from 'vitest'
import { isHoliday, getEaster } from '@/utils/holidays'

describe('holidays utilities', () => {

  // ====== getEaster ======
  describe('getEaster', () => {
    it('calcola Pasqua 2026 correttamente (5 Aprile)', () => {
      const easter = getEaster(2026)
      expect(easter.getDate()).toBe(5)
      expect(easter.getMonth()).toBe(3) // Aprile = 3 (0-indexed)
    })

    it('calcola Pasqua 2025 correttamente (20 Aprile)', () => {
      const easter = getEaster(2025)
      expect(easter.getDate()).toBe(20)
      expect(easter.getMonth()).toBe(3)
    })

    it('calcola Pasqua 2024 correttamente (31 Marzo)', () => {
      const easter = getEaster(2024)
      expect(easter.getDate()).toBe(31)
      expect(easter.getMonth()).toBe(2) // Marzo = 2
    })
  })

  // ====== isHoliday ======
  describe('isHoliday', () => {
    it('riconosce Capodanno', () => {
      expect(isHoliday(new Date(2026, 0, 1))).toBe(true)
    })

    it('riconosce Epifania', () => {
      expect(isHoliday(new Date(2026, 0, 6))).toBe(true)
    })

    it('riconosce Liberazione (25 Aprile)', () => {
      expect(isHoliday(new Date(2026, 3, 25))).toBe(true)
    })

    it('riconosce Festa Lavoratori (1 Maggio)', () => {
      expect(isHoliday(new Date(2026, 4, 1))).toBe(true)
    })

    it('riconosce Festa Patronale Altamura (5 Maggio)', () => {
      expect(isHoliday(new Date(2026, 4, 5))).toBe(true)
    })

    it('riconosce Festa Repubblica (2 Giugno)', () => {
      expect(isHoliday(new Date(2026, 5, 2))).toBe(true)
    })

    it('riconosce Ferragosto', () => {
      expect(isHoliday(new Date(2026, 7, 15))).toBe(true)
    })

    it('riconosce Natale e Santo Stefano', () => {
      expect(isHoliday(new Date(2026, 11, 25))).toBe(true)
      expect(isHoliday(new Date(2026, 11, 26))).toBe(true)
    })

    it('riconosce Immacolata (8 Dicembre)', () => {
      expect(isHoliday(new Date(2026, 11, 8))).toBe(true)
    })

    it('riconosce weekend (Sabato e Domenica)', () => {
      // 11 Aprile 2026 = Sabato
      expect(isHoliday(new Date(2026, 3, 11))).toBe(true)
      // 12 Aprile 2026 = Domenica
      expect(isHoliday(new Date(2026, 3, 12))).toBe(true)
    })

    it('riconosce Pasquetta 2026 (6 Aprile)', () => {
      expect(isHoliday(new Date(2026, 3, 6))).toBe(true)
    })

    it('NON classifica giorni feriali normali come festivi', () => {
      // 13 Aprile 2026 = Lunedì feriale
      expect(isHoliday(new Date(2026, 3, 13))).toBe(false)
      // 15 Aprile 2026 = Mercoledì feriale
      expect(isHoliday(new Date(2026, 3, 15))).toBe(false)
    })
  })
})
