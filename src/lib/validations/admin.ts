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

// --- VALIDAZIONI RADIO ---
export const radioSchema = z.object({
  name: z.string().min(2, "Il nome della radio deve avere almeno 2 caratteri."),
  modello: z.string().optional().nullable(),
  seriale: z.string().optional().nullable(),
  assegnazioneFissaId: z.string().optional().nullable(),
  dataAssegnazione: z.string().optional().nullable(),
  cambioBatteria: z.string().optional().nullable(),
  stato: z.enum(["ATTIVO", "MANUTENZIONE", "DISMESSO"]).default("ATTIVO")
});

export const radioUpdateSchema = radioSchema.extend({
  id: z.string().uuid("ID Radio non valido (deve essere un identificatore alfanumerico UUID).")
});

// --- VALIDAZIONI UTENTI / AGENTI ---
export const userCreateSchema = z.object({
  matricola: z.string().min(1, "La matricola è un campo obbligatorio."),
  name: z.string().min(2, "Il nome e cognome deve contenere almeno 2 caratteri."),
  password: z.string()
    .min(8, "La password deve contenere almeno 8 caratteri.")
    .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola.")
    .regex(/[a-z]/, "La password deve contenere almeno una lettera minuscola.")
    .regex(/[0-9]/, "La password deve contenere almeno un numero.")
    .regex(/[^A-Za-z0-9]/, "La password deve contenere almeno un carattere speciale (!@#$%^&*...)."),
  isUfficiale: z.boolean().default(false),
  isSuperAdmin: z.boolean().default(false),
  squadra: z.string().optional().nullable(),
  massimale: z.union([z.string(), z.number()]).optional(),
  qualifica: z.string().optional().nullable(),
  dataAssunzione: z.string().optional().nullable(),
  dataDiNascita: z.string().optional().nullable(),
  scadenzaPatente: z.string().optional().nullable(),
  scadenzaPortoArmi: z.string().optional().nullable(),
  tipoContratto: z.string().optional().nullable(),
  email: z.string().email("Formato email non valido.").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  noteInterne: z.string().optional().nullable(),
  defaultServiceCategoryId: z.string().optional().nullable(),
  defaultServiceTypeId: z.string().optional().nullable(),
  fallbackServiceCategoryId: z.string().optional().nullable(),
  rotationGroupId: z.string().optional().nullable(),
  defaultPartnerIds: z.array(z.string()).optional(),
  fixedServiceDays: z.array(z.string()).optional(),
  hasL104: z.boolean().optional(),
  l104Assistiti: z.union([z.string(), z.number()]).optional(),
  hasStudyLeave: z.boolean().optional(),
  hasParentalLeave: z.boolean().optional(),
  hasChildSicknessLeave: z.boolean().optional(),
  canConfigureSystem: z.boolean().optional(),
  canManageShifts: z.boolean().optional(),
  canManageUsers: z.boolean().optional(),
  canVerifyClockIns: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const userUpdateSchema = userCreateSchema.extend({
  userId: z.string().optional(),
  action: z.string().optional(),
  newPassword: z.string().optional(),
  password: z.string()
    .min(8, "La password deve contenere almeno 8 caratteri.")
    .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola.")
    .regex(/[a-z]/, "La password deve contenere almeno una lettera minuscola.")
    .regex(/[0-9]/, "La password deve contenere almeno un numero.")
    .regex(/[^A-Za-z0-9]/, "La password deve contenere almeno un carattere speciale (!@#$%^&*...).")
    .optional()
    .or(z.literal("")),
}).partial();

// --- VALIDAZIONI ARMERIA (WEAPONS & ARMORS) ---
export const weaponSchema = z.object({
  name: z.string().min(1, "Il nome o la sigla dell'arma è obbligatorio"),
  modello: z.string().optional().nullable(),
  matricola: z.string().optional().nullable(),
  stato: z.string().default("ATTIVO"),
  assegnazioneFissaId: z.string().optional().nullable(),
  dataAssegnazione: z.string().optional().nullable(),
  note: z.string().optional().nullable()
});

export const weaponUpdateSchema = weaponSchema.partial().extend({
  id: z.string()
});

export const armorSchema = z.object({
  name: z.string().min(1, "Il nome o la sigla del GAP è obbligatorio"),
  modello: z.string().optional().nullable(),
  seriale: z.string().optional().nullable(),
  stato: z.string().default("ATTIVO"),
  assegnazioneFissaId: z.string().optional().nullable(),
  dataAssegnazione: z.string().optional().nullable(),
  scadenzaKevlar: z.string().optional().nullable()
});

export const armorUpdateSchema = armorSchema.partial().extend({
  id: z.string()
});

// --- VALIDAZIONI BACHECA (Announcements) ---
export const announcementSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  body: z.string().min(1, "Il contenuto è obbligatorio"),
  category: z.string().default("AVVISO"),
  priority: z.string().default("NORMAL"),
  requiresRead: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  attachments: z.array(z.string()).default([])
});

export const announcementUpdateSchema = announcementSchema.partial().extend({
  id: z.string()
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
  radioId: z.string().optional().nullable(),
  weaponId: z.string().optional().nullable(),
  armorId: z.string().optional().nullable(),
  serviceDetails: z.string().optional().nullable(),
  patrolGroupId: z.string().optional().nullable()
});
