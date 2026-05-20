# 🗺️ ROADMAP — Sentinel PL v3.0

> Piano di implementazione completo per il Portale Polizia Locale SaaS.
> Ultimo aggiornamento: 27 Aprile 2026

---

## 🟢 FASE 6 — Quick Win (Priorità P0-P1)

### 6.1 Fix Pasqua nei festivi
- [x] Aggiungere il giorno di Pasqua (non solo Pasquetta) a `isCalendarHoliday()`
- **File**: `src/utils/holidays.ts`
- **Impatto**: Correttezza conteggio FEST/FER

### 6.2 Equity Index reale nelle statistiche
- [x] Calcolare la varianza reale delle reperibilità tra agenti
- [x] Sostituire il valore hardcoded (95%) con il calcolo effettivo
- [x] Calcolare Compliance Target reale (superamenti massimale)
- **File**: `src/components/StatisticsDashboard.tsx`

### 6.3 Export Paghe con distinzione Festivi/Feriali
- [x] Aggiungere colonne REP_FEST e REP_FER nell'export CSV ragioneria
- [x] Utilizzare `isHoliday()` per distinguere i giorni
- **File**: `src/app/api/admin/reports/monthly-export/route.ts`

### 6.4 Timbro Grafico Digitale sul PDF OdS
- [x] Aggiungere sigillo visivo verde "FIRMATO DIGITALMENTE" nel PDF
- [x] Mostrare nome firmatario e data nel sigillo
- **File**: `src/utils/pdf-generator.ts` → `generateODSPDF()`

### 6.5 Notifica Bacheca post-firma OdS
- [x] Creare automaticamente un annuncio in bacheca quando un OdS viene certificato
- [x] Badge visivo "📋 OdS Certificato" nella bacheca agenti
- **File**: `src/components/ServiceOrderDashboard.tsx` → `certifyAndEmit()`

---

## 🟡 FASE 7 — Medio Termine (Priorità P2)

### 7.1 Alert Scadenze Documentali
- [x] CRON job per controllare scadenze patente, porto d'armi, kevlar
- [x] Notifica push + Telegram 30 giorni prima della scadenza
- [x] Widget nel Pannello Overview con badge rossi
- **File**: Nuovo CRON + evoluzione `PannelloOverview.tsx`
- **Dati DB**: Campi `scadenzaPatente`, `scadenzaPortoArmi`, `scadenzaKevlar` già presenti

### 7.2 Calendario Assenze Visuale Admin
- [x] Griglia calendario mensile che mostra chi è assente in ogni giorno
- [x] Codice colore per tipo assenza (ferie, malattia, 104, etc.)
- [x] Aiuta l'admin a visualizzare sovrapposizioni prima di approvare richieste
- **File**: Nuovo componente `AbsenceCalendar.tsx`

### 7.3 Dashboard KPI Comparativa Multi-Mese
- [x] Grafici andamento ultimi 12 mesi
- [x] Metriche: tasso assenteismo, ore straordinario, copertura, equità
- [x] Trend line con evidenza anomalie
- **File**: Evoluzione `StatisticsDashboard.tsx` + nuova API stats/yearly

### 7.4 Stampa Batch OdS Settimanale
- [x] Generare PDF multipagina con OdS di 7 giorni
- [x] Bottone "Stampa Settimana" nella dashboard OdS
- **File**: `ServiceOrderDashboard.tsx` + `pdf-generator.ts`

### 7.5 Dashboard Storico Agente (Cartellino Annuale)
- [x] Riepilogo annuale per singolo agente
- [x] Ferie godute vs spettanti, monte ore straordinario cumulato
- [x] Giorni di malattia totali, reperibilità fest/fer
- **File**: Nuovo componente `AgentYearlyCard.tsx`

### 7.6 Calendario Interattivo Agente
- [x] Nella dashboard agente, calendario visuale stile Google Calendar
- [x] Ogni giorno mostra turno con codice colore
- [x] Click per dettagli giornata
- **File**: Evoluzione `AgentShiftsList.tsx`

---

## 🔴 FASE 8 — Strategiche (Priorità P3)

### 8.1 Modulo Buoni Pasto Automatizzati
- [x] Calcolo automatico buoni pasto spettanti per tipo turno
- [x] Soglie orarie configurabili (già in `GlobalSettings`: `bpTurnoContinuato`, etc.)
- [x] Report mensile buoni pasto per ragioneria
- **File**: Nuovo componente `MealVoucherCalculator.tsx`

### 8.2 Modulo Indennità Automatizzate
- [x] Indennità di missione/servizio esterno
- [x] Export per ragioneria con totali mensili
- **File**: Evoluzione `ExportPaghePanel.tsx`

### 8.3 Modulo Formazione e Aggiornamento
- [x] Nuovo modello DB `TrainingRecord` (corso, data, scadenza, agente)
- [x] Tracciamento corsi obbligatori (tiro a segno, primo soccorso, BLSD)
- [x] Widget nell'anagrafica con alert scadenze
- **File**: Nuovo modello Prisma + componente `TrainingManager.tsx`

### 8.4 API Pubblica Documentata (OpenAPI)
- [ ] Endpoint read-only per integrazioni comunali
- [ ] Swagger UI integrata
- [ ] Autenticazione via API Key
- **File**: Evoluzione `ApiDocsPanel.tsx`

---

## 📋 Regole di Implementazione

> [!IMPORTANT]
> 1. **NON rompere mai** le funzionalità esistenti
> 2. **Build check** (`npm run build`) dopo ogni modifica
> 3. **Commit atomici** — un commit per feature
> 4. **Test manuale** prima del push su master
> 5. **Sync develop** dopo ogni push su master

---

## 📊 Stato Avanzamento

| Fase | Feature | Stato |
|------|---------|-------|
| 6.1 | Fix Pasqua | ✅ Completato |
| 6.2 | Equity Index reale | ✅ Completato |
| 6.3 | Export Paghe fest/fer | ✅ Completato |
| 6.4 | Timbro Grafico PDF | ✅ Completato |
| 6.5 | Notifica post-firma | ✅ Completato |
| 7.1 | Alert scadenze | ✅ Completato |
| 7.2 | Calendario assenze | ✅ Completato |
| 7.3 | KPI multi-mese | ✅ Completato |
| 7.4 | Stampa batch OdS | ✅ Completato |
| 7.5 | Cartellino annuale | ✅ Completato |
| 7.6 | Calendario agente | ✅ Completato |
| 8.1 | Buoni pasto | ✅ Completato |
| 8.2 | Indennità | ✅ Completato |
| 8.3 | Formazione | ✅ Completato |
| 8.4 | API pubblica | ⚠️ Parziale |

