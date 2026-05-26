import { z } from "zod"

export const accidentVehicleSchema = z.object({
  licensePlate: z.string().min(1),
  vehicleType: z.string(),
  insuranceCompany: z.string().optional(),
  insurancePolicy: z.string().optional(),
  damageDescription: z.string().optional(),
})

export const accidentPersonSchema = z.object({
  role: z.string(), // CONDUCENTE, PASSEGGERO, PEDONE, TESTIMONE
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  fiscalCode: z.string().optional(),
  injuries: z.string().optional(),
  vehicleIndex: z.number().optional() // Per legarlo a un veicolo nel payload
})

export const createAccidentSchema = z.object({
  date: z.string().datetime(),
  address: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  severity: z.enum(["SOLO_DANNI", "FERITI", "MORTALE", "RISERVA_PROGNOSI"]),
  weatherCondition: z.string().optional(),
  roadCondition: z.string().optional(),
  trafficCondition: z.string().optional(),
  dynamicDescription: z.string().optional(),
  interventionId: z.string().optional(), // OQ2: opzionale
  vehicles: z.array(accidentVehicleSchema).optional(),
  people: z.array(accidentPersonSchema).optional()
})
