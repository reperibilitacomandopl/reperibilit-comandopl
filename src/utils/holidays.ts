export function getEaster(year: number): Date {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day, 12, 0, 0); // local noon to avoid timezone issues
}

export function isCalendarHoliday(date: Date): boolean {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  // Fixed holidays
  const fixed = [
    [1, 1],   // Capodanno
    [1, 6],   // Epifania
    [4, 25],  // Liberazione
    [5, 1],   // Lavoratori
    [5, 5],   // Festa Patronale
    [6, 2],   // Repubblica
    [8, 15],  // Ferragosto
    [11, 1],  // Tutti i Santi
    [12, 8],  // Immacolata
    [12, 25], // Natale
    [12, 26]  // S. Stefano
  ];
  if (fixed.some(([m, d]) => m === month && d === day)) return true;

  // Pasqua (Domenica) e Pasquetta (Lunedì)
  const easter = getEaster(year);
  if (easter.getDate() === day && easter.getMonth() + 1 === month) {
    return true;
  }
  const easterMonday = new Date(easter.getTime());
  easterMonday.setDate(easter.getDate() + 1);
  if (easterMonday.getDate() === day && easterMonday.getMonth() + 1 === month) {
    return true;
  }

  return false;
}

export function isHoliday(date: Date): boolean {
  const dow = date.getDay();
  if (dow === 0) return true; // Domenica è festivo

  return isCalendarHoliday(date);
}

/**
 * Ritorna true se il giorno è un sabato o il giorno prima di una festività sul calendario
 */
const FIXED_HOLIDAYS: Array<{ name: string; m: number; d: number }> = [
  { name: "Capodanno", m: 1, d: 1 },
  { name: "Epifania", m: 1, d: 6 },
  { name: "Liberazione", m: 4, d: 25 },
  { name: "Festa del Lavoro", m: 5, d: 1 },
  { name: "Festa Patronale", m: 5, d: 5 },
  { name: "Festa della Repubblica", m: 6, d: 2 },
  { name: "Ferragosto", m: 8, d: 15 },
  { name: "Tutti i Santi", m: 11, d: 1 },
  { name: "Immacolata", m: 12, d: 8 },
  { name: "Natale", m: 12, d: 25 },
  { name: "Santo Stefano", m: 12, d: 26 }
]

export function getMidweekHolidays(year: number): Array<{ name: string; date: Date }> {
  const holidays: Array<{ name: string; date: Date }> = []
  for (const item of FIXED_HOLIDAYS) {
    const d = new Date(year, item.m - 1, item.d)
    if (d.getDay() !== 0) holidays.push({ name: item.name, date: d })
  }
  const easter = getEaster(year)
  const easterMonday = new Date(easter.getTime())
  easterMonday.setDate(easter.getDate() + 1)
  if (easterMonday.getDay() !== 0) {
    holidays.push({ name: "Lunedì dell'Angelo (Pasquetta)", date: easterMonday })
  }
  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function isCalendarHolidayUTC(date: Date): boolean {
  const day = date.getUTCDate()
  const month = date.getUTCMonth() + 1
  const year = date.getUTCFullYear()
  if (FIXED_HOLIDAYS.some(h => h.m === month && h.d === day)) return true
  const easter = getEaster(year)
  if (easter.getUTCDate() === day && easter.getUTCMonth() + 1 === month) return true
  const easterMonday = new Date(easter.getTime())
  easterMonday.setUTCDate(easterMonday.getUTCDate() + 1)
  if (easterMonday.getUTCDate() === day && easterMonday.getUTCMonth() + 1 === month) return true
  return false
}

export function isPreFestive(date: Date): boolean {
  const dow = date.getDay();
  if (dow === 6) return true; // Sabato è pre-festivo per definizione

  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  return isCalendarHoliday(nextDay);
}

