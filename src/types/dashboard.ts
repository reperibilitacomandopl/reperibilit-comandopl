export interface DashboardShift {
  id: string
  userId: string
  date: Date | string
  type: string
  repType: string | null
  timeRange?: string | null
  serviceCategory?: { id: string, name: string } | null
  serviceType?: { id: string, name: string } | null
  vehicle?: { id: string, name: string, plate?: string } | null
  serviceDetails?: string | null
  durationHours?: number
  overtimeHours?: number
}

export interface BalanceDetail {
  code: string
  label: string
  used: number
  initialValue: number
  residue: number
  unit: 'HOURS' | 'DAYS'
}

export interface BalanceData {
  user?: {
    qualifica?: string
    ruoloInSquadra?: string
    telegramChatId?: string | null
  }
  details?: BalanceDetail[]
  ferieResidue?: number
  ferieTotali?: number
  permessi104Residui?: number
  permessi104Totali?: number
  festivitaResidue?: number
  festivitaTotali?: number
  [key: string]: unknown
}

export interface DutyMember {
  id: string
  name: string
  matricola: string
  phone?: string | null
  telegramChatId?: string | null
  repType: string
}

export interface SwapRequest {
  id: string
  requester: { id: string, name: string }
  targetUser: { id: string, name: string }
  shift: { id: string, date: string, repType: string }
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'APPROVED'
  targetUserId: string
}

export interface OdsPartner {
  id: string
  user: {
    id: string
    name: string
    matricola: string
  }
}

export interface OdsData {
  shift: DashboardShift
  partners: OdsPartner[]
}

export type AgendaItem = {
  id: string
  date: string
  code: string
  label: string
  hours: number | null
  note: string | null
}
export interface DashboardAgent {
  id: string;
  name: string;
  matricola: string;
  isUfficiale: boolean;
  email: string | null;
  phone: string | null;
  qualifica: string | null;
  gradoLivello: number;
  squadra: string | null;
  massimale: number;
  defaultServiceCategoryId?: string | null;
  defaultServiceTypeId?: string | null;
  rotationGroupId?: string | null;
  dataAssunzione?: string | Date | null;
  scadenzaPatente?: string | Date | null;
  scadenzaPortoArmi?: string | Date | null;
  noteInterne?: string | null;
  repTotal: number;
}

export interface AuditLog {
  id: string;
  action: string;
  adminName: string | null;
  createdAt: string | Date;
  details: string;
  targetName?: string | null;
  targetId?: string | null;
}

export interface PendingSwap {
  id: string;
  shift: { date: string | Date; type: string };
  requester: { name: string };
  targetUser: { name: string };
}

export interface PendingRequest {
  id: string;
  date: string | Date;
  user: { name: string };
  code: string;
  startTime?: string | null;
  endTime?: string | null;
  hours?: number | null;
  notes?: string | null;
}

export interface AgentBalances {
  balance: { details: BalanceDetail[] } | null;
  usage: {
    absences: { code: string }[];
    agendaEntries: { code: string; hours?: number }[];
  };
  requests: { code: string }[];
}
