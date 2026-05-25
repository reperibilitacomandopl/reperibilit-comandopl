/** Converte Date/Decimal Prisma in valori JSON-safe per Client Components (un solo passaggio). */
export function serializeForClient<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (v instanceof Date ? v.toISOString() : v))
  ) as T
}

const toIso = (v: unknown): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString() : (v as string)

/** Solo campi usati dalla griglia pianificazione — evita clone JSON dell'intero record Prisma. */
export function mapShiftForPlanningGrid(shift: {
  id: string
  userId: string
  date: Date | string
  type: string
  repType?: string | null
  isTheoretical?: boolean
}) {
  return {
    id: shift.id,
    userId: shift.userId,
    date: toIso(shift.date) ?? shift.date,
    type: shift.type,
    repType: shift.repType ?? null,
    ...(shift.isTheoretical ? { isTheoretical: true as const } : {}),
  }
}

export function mapAgentForPlanningGrid<T extends Record<string, unknown>>(user: T) {
  return {
    ...user,
    dataAssunzione: toIso(user.dataAssunzione),
    scadenzaPatente: toIso(user.scadenzaPatente),
    scadenzaPortoArmi: toIso(user.scadenzaPortoArmi),
    dataDiNascita: toIso(user.dataDiNascita),
  }
}
