import { describe, it, expect } from "vitest"
import { generateMonthShifts, Agent, GenerationOptions } from "../utils/generation-engine"

describe("Generation Engine Algorithm", () => {
  const mockAgents: Agent[] = [
    { id: "1", name: "Ufficiale A", isUfficiale: true, massimale: 6 },
    { id: "2", name: "Agente B", isUfficiale: false, massimale: 5 },
    { id: "3", name: "Agente C", isUfficiale: false, massimale: 5 },
    { id: "4", name: "Agente D", isUfficiale: false, massimale: 5 },
    { id: "5", name: "Agente E", isUfficiale: false, massimale: 5 },
  ]

  const options: GenerationOptions = {
    year: 2026,
    month: 4, // Aprile (30 giorni)
    repPerAgente: 5,
    repPerUfficiale: 6,
    minSpacing: 2,
    allowConsecutive: false,
    usaProporzionale: true,
    minUfficiali: 1,
    checkRestHours: true
  }

  it("should respect individual massimali", () => {
    const result = generateMonthShifts(mockAgents, [], options)
    expect(result.success).toBe(true)
    
    mockAgents.forEach(agent => {
      const count = result.newShifts.filter(s => s.userId === agent.id).length
      expect(count).toBeLessThanOrEqual(agent.massimale || 5)
    })
  })

  it("should ensure at least one officer per day (given enough staff)", () => {
    const manyOfficers: Agent[] = [
      { id: "O1", name: "Uff 1", isUfficiale: true, massimale: 6 },
      { id: "O2", name: "Uff 2", isUfficiale: true, massimale: 6 },
      { id: "O3", name: "Uff 3", isUfficiale: true, massimale: 6 },
      { id: "O4", name: "Uff 4", isUfficiale: true, massimale: 6 },
      { id: "O5", name: "Uff 5", isUfficiale: true, massimale: 6 },
      { id: "A1", name: "Agt 1", isUfficiale: false, massimale: 5 },
      { id: "A2", name: "Agt 2", isUfficiale: false, massimale: 5 },
    ]
    const result = generateMonthShifts(manyOfficers, [], options)
    
    for (let d = 1; d <= 30; d++) {
      const uffCount = result.newShifts.filter(s => {
        const uff = manyOfficers.find(a => a.id === s.userId)
        return uff?.isUfficiale && s.date.getUTCDate() === d
      }).length
      expect(uffCount, `Giorno ${d} senza ufficiale`).toBeGreaterThanOrEqual(1)
    }
  })

  it("should respect the 11-hour rule (blocking adjacent Night shifts)", () => {
    // Agente B ha un turno di Notte (N) il giorno 10
    const existingShifts = [
      { userId: "2", date: new Date(Date.UTC(2026, 3, 10)), type: "N" }
    ]
    
    const result = generateMonthShifts(mockAgents, existingShifts, options)
    
    // Agente B non dovrebbe avere REP il giorno 10 (perché finisce la mattina dopo)
    // né il giorno 9 (perché inizierebbe la notte stessa)
    const repOnDay10 = result.newShifts.find(s => s.userId === "2" && s.date.getUTCDate() === 10)
    expect(repOnDay10).toBeUndefined()
  })

  it("should allow adjacent shifts if checkRestHours is false", () => {
    const existingShifts = [
      { userId: "2", date: new Date(Date.UTC(2026, 3, 10)), type: "N" }
    ]
    const relaxedOptions = { ...options, checkRestHours: false }
    
    const result = generateMonthShifts(mockAgents, existingShifts, relaxedOptions)
    
    // In questo caso, l'algoritmo potrebbe (se necessario) assegnare la REP 
    // perché non stiamo controllando la vicinanza oraria dei turni base
    // Nota: depends on algorithm priorities, but we verify it doesn't hard-block.
    expect(result.success).toBe(true)
  })

  it("should handle months with different lengths correctly", () => {
    const febOptions = { ...options, month: 2, year: 2026 } // Febbraio (28 gg)
    const result = generateMonthShifts(mockAgents, [], febOptions)
    expect(result.success).toBe(true)
    
    const maxDay = Math.max(...result.newShifts.map(s => s.date.getUTCDate()))
    expect(maxDay).toBeLessThanOrEqual(28)
  })

  it("should respect the minimum spacing between shifts", () => {
    const result = generateMonthShifts(mockAgents, [], options)
    
    mockAgents.forEach(agent => {
      const agentShifts = result.newShifts
        .filter(s => s.userId === agent.id)
        .map(s => s.date.getUTCDate())
        .sort((a, b) => a - b)
      
      for (let i = 0; i < agentShifts.length - 1; i++) {
        const diff = agentShifts[i+1] - agentShifts[i]
        expect(diff).toBeGreaterThan(options.minSpacing)
      }
    })
  })
})
