import { z } from "zod"

export const accidentVehicleSchema = z.object({
  licensePlate: z.string().min(1),
  vehicleType: z.string(),
  directionOfTravel: z.string().optional(),
  maneuver: z.string().optional(),
  isFugitive: z.boolean().optional().default(false),
  insuranceCompany: z.string().optional(),
  insurancePolicy: z.string().optional(),
  damageDescription: z.string().optional(),
})

export const accidentPersonSchema = z.object({
  role: z.string(), // CONDUCENTE, PASSEGGERO, PEDONE, TESTIMONE
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  fiscalCode: z.string().optional(),
  licenseCategory: z.string().optional(),
  seatbeltUsed: z.boolean().optional(),
  isFugitive: z.boolean().optional().default(false),
  injuries: z.string().optional(),
  injuriesDetail: z.string().optional(),
  alcoholTest: z.string().optional(),
  drugTest: z.string().optional(),
  vehicleIndex: z.number().optional().nullable(), // Per legarlo a un veicolo nel payload (-1 = fuga conducente)
})

export const createAccidentSchema = z.object({
  date: z.string().datetime(),
  address: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  severity: z.enum(["SOLO_DANNI", "FERITI", "MORTALE", "RISERVA_PROGNOSI"]),
  roadType: z.string().optional(),
  lighting: z.string().optional(),
  weatherCondition: z.string().optional(),
  roadCondition: z.string().optional(),
  trafficCondition: z.string().optional(),
  dynamicDescription: z.string().optional(),
  interventionId: z.string().optional(),
  vehicles: z.array(accidentVehicleSchema).optional(),
  people: z.array(accidentPersonSchema).optional(),
})
