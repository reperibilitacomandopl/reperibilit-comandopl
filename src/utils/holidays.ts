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

export function isHoliday(date: Date): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return true; // Weekend

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

  // Pasqua/Pasquetta
  const easter = getEaster(year);
  const easterMonday = new Date(easter.getTime());
  easterMonday.setDate(easter.getDate() + 1);
  if (easterMonday.getDate() === day && easterMonday.getMonth() + 1 === month) {
    return true;
  }

  return false;
}
