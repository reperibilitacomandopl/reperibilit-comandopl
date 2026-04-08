import { z } from "zod";

// --- VALIDAZIONI VEICOLI ---
export const vehicleSchema = z.object({
  name: z.string().min(2, "Il nome del veicolo deve avere almeno 2 caratteri."),
  targa: z.string().optional().nullable(),
  scadenzaAssicurazione: z.string().optional().nullable(),
  scadenzaBollo: z.string().optional().nullable(),
  scadenzaRevisione: z.string().optional().nullable(),
  // Forziamo lo stato ristretto per impedire dati non previsti
  stato: z.enum(["ATTIVO", "MANUTENZIONE", "DISMESSO"]).default("ATTIVO")
});

export const vehicleUpdateSchema = vehicleSchema.extend({
  id: z.string().uuid("ID Veicolo non valido (deve essere un identificatore alfanumerico UUID).")
});

// --- VALIDAZIONI UTENTI / AGENTI ---
export const userCreateSchema = z.object({
  matricola: z.string().min(1, "La matricola è un campo obbligatorio."),
  name: z.string().min(2, "Il nome e cognome deve contenere almeno 2 caratteri."),
  password: z.string().min(6, "Regola di sicurezza: La password iniziale deve essere di almeno 6 caratteri."),
  isUfficiale: z.boolean().default(false),
  squadra: z.string().optional().nullable(),
  massimale: z.union([z.string(), z.number()]).optional(),
  qualifica: z.string().optional().nullable(),
  dataAssunzione: z.string().optional().nullable(),
  scadenzaPatente: z.string().optional().nullable(),
  scadenzaPortoArmi: z.string().optional().nullable(),
});

// --- VALIDAZIONI IMPOSTAZIONI GLOBALI ---
export const globalSettingsSchema = z.object({
  minUfficiali: z.number().min(0, "Il minimo di ufficiali non può essere negativo."),
  usaProporzionale: z.boolean(),
  annoCorrente: z.number().min(2024, "L'anno non può essere antecedente al lancio del software."),
  meseCorrente: z.number().min(1, "Il mese minimo è 1").max(12, "Il mese massimo è 12"),
  massimaleAgente: z.number().min(1, "Un agente deve avere almeno 1 turno come massimale."),
  massimaleUfficiale: z.number().min(1, "Un ufficiale deve avere almeno 1 turno come massimale."),
  distaccoMinimo: z.number().min(0).max(24, "Il distacco minimo non può superare 24 ore."),
  permettiConsecutivi: z.boolean()
});

// --- VALIDAZIONI TURNI GIONALIERI ---
export const dailyShiftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "L'inserimento cronologico richiede il formato ISO esatto (YYYY-MM-DD)."),
  userId: z.string().uuid("Impossibile associare il turno: ID Agente invalido."),
  type: z.string().optional(),
  timeRange: z.string().optional().nullable(),
  serviceCategoryId: z.string().optional().nullable(),
  serviceTypeId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  serviceDetails: z.string().optional().nullable(),
  patrolGroupId: z.string().optional().nullable()
});
