import { z } from "zod"

export const createServiceReportSchema = z.object({
  reportDate: z.string().datetime(),
  activities: z.string().min(10, "Descrizione attività richiesta (min 10 caratteri)"),
  outcome: z.string().optional(),
  notes: z.string().optional(),
  shiftId: z.string().optional(),
  interventionIds: z.array(z.string()).optional().default([]),
  accidentReportIds: z.array(z.string()).optional().default([]),
})

export const updateServiceReportSchema = createServiceReportSchema.partial()
