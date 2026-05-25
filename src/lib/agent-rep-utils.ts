/** Utilità reperibilità agente — giorni REP nel mese */

export type RepDayEntry = {
  day: number
  date: Date
  repType: string
  shiftType: string
  weekday: string
  isWeekend: boolean
}

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]

function shiftDateKey(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toISOString().split("T")[0]
}

function isRepShift(repType: string | null | undefined): boolean {
  return (repType || "").toLowerCase().includes("rep")
}

/** Elenco giorni di reperibilità nel mese (escluso giorno 1 mese successivo in griglia). */
export function getRepDaysForMonth(
  myShifts: { date: Date | string; repType?: string | null; type?: string | null }[],
  year: number,
  month: number
): RepDayEntry[] {
  const entries: RepDayEntry[] = []

  for (const s of myShifts) {
    if (!isRepShift(s.repType)) continue
    const d = new Date(s.date)
    if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month) continue

    const day = d.getUTCDate()
    const local = new Date(year, month - 1, day)
    entries.push({
      day,
      date: local,
      repType: (s.repType || "REP").toUpperCase(),
      shiftType: (s.type || "").toUpperCase(),
      weekday: WEEKDAYS[local.getDay()],
      isWeekend: local.getDay() === 0 || local.getDay() === 6,
    })
  }

  return entries.sort((a, b) => a.day - b.day)
}

export function countRepInMonth(
  myShifts: { date: Date | string; repType?: string | null }[],
  year: number,
  month: number
): number {
  return getRepDaysForMonth(myShifts, year, month).length
}

/** Etichetta breve tipo REP (REP_F, REP_I, …). */
export function formatRepTypeLabel(repType: string): string {
  const t = repType.toUpperCase()
  if (t.includes("REP_FE") || t.includes("FEST")) return "Fest."
  if (t.includes("REP_P") || t.includes("PREF")) return "Pref."
  if (t.includes("REP_F") || t.includes("FER")) return "Fer."
  if (t.includes("REP_M")) return "Man."
  if (t.includes("REP_I")) return "Imp."
  return "REP"
}
