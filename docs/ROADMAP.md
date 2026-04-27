# 🗺️ ROADMAP — Sentinel PL v3.0

> Piano di implementazione completo per il Portale Polizia Locale SaaS.
> Ultimo aggiornamento: 27 Aprile 2026

---

## 🟢 FASE 6 — Quick Win (Priorità P0-P1)

### 6.1 Fix Pasqua nei festivi
- [ ] Aggiungere il giorno di Pasqua (non solo Pasquetta) a `isCalendarHoliday()`
- **File**: `src/utils/holidays.ts`
- **Impatto**: Correttezza conteggio FEST/FER

### 6.2 Equity Index reale nelle statistiche
- [ ] Calcolare la varianza reale delle reperibilità tra agenti
- [ ] Sostituire il valore hardcoded (95%) con il calcolo effettivo
- [ ] Calcolare Compliance Target reale (superamenti massimale)
- **File**: `src/components/StatisticsDashboard.tsx`

### 6.3 Export Paghe con distinzione Festivi/Feriali
- [ ] Aggiungere colonne REP_FEST e REP_FER nell'export CSV ragioneria
- [ ] Utilizzare `isHoliday()` per distinguere i giorni
- **File**: `src/app/api/admin/reports/monthly-export/route.ts`

### 6.4 Timbro Grafico Digitale sul PDF OdS
- [ ] Aggiungere sigillo visivo verde "FIRMATO DIGITALMENTE" nel PDF
- [ ] Mostrare nome firmatario e data nel sigillo
- **File**: `src/utils/pdf-generator.ts` → `generateODSPDF()`

### 6.5 Notifica Bacheca post-firma OdS
- [ ] Creare automaticamente un annuncio in bacheca quando un OdS viene certificato
- [ ] Badge visivo "📋 OdS Certificato" nella bacheca agenti
- **File**: `src/components/ServiceOrderDashboard.tsx` → `certifyAndEmit()`

---

## 🟡 FASE 7 — Medio Termine (Priorità P2)

### 7.1 Alert Scadenze Documentali
- [ ] CRON job per controllare scadenze patente, porto d'armi, kevlar
- [ ] Notifica push + Telegram 30 giorni prima della scadenza
- [ ] Widget nel Pannello Overview con badge rossi
- **File**: Nuovo CRON + evoluzione `PannelloOverview.tsx`
- **Dati DB**: Campi `scadenzaPatente`, `scadenzaPortoArmi`, `scadenzaKevlar` già presenti

### 7.2 Calendario Assenze Visuale Admin
- [ ] Griglia calendario mensile che mostra chi è assente in ogni giorno
- [ ] Codice colore per tipo assenza (ferie, malattia, 104, etc.)
- [ ] Aiuta l'admin a visualizzare sovrapposizioni prima di approvare richieste
- **File**: Nuovo componente `AbsenceCalendar.tsx`

### 7.3 Dashboard KPI Comparativa Multi-Mese
- [ ] Grafici andamento ultimi 12 mesi
- [ ] Metriche: tasso assenteismo, ore straordinario, copertura, equità
- [ ] Trend line con evidenza anomalie
- **File**: Evoluzione `StatisticsDashboard.tsx` + nuova API stats/yearly

### 7.4 Stampa Batch OdS Settimanale
- [ ] Generare PDF multipagina con OdS di 7 giorni
- [ ] Bottone "Stampa Settimana" nella dashboard OdS
- **File**: `ServiceOrderDashboard.tsx` + `pdf-generator.ts`

### 7.5 Dashboard Storico Agente (Cartellino Annuale)
- [ ] Riepilogo annuale per singolo agente
- [ ] Ferie godute vs spettanti, monte ore straordinario cumulato
- [ ] Giorni di malattia totali, reperibilità fest/fer
- **File**: Nuovo componente `AgentYearlyCard.tsx`

### 7.6 Calendario Interattivo Agente
- [ ] Nella dashboard agente, calendario visuale stile Google Calendar
- [ ] Ogni giorno mostra turno con codice colore
- [ ] Click per dettagli giornata
- **File**: Evoluzione `AgentShiftsList.tsx`

---

## 🔴 FASE 8 — Strategiche (Priorità P3)

### 8.1 Modulo Buoni Pasto Automatizzati
- [ ] Calcolo automatico buoni pasto spettanti per tipo turno
- [ ] Soglie orarie configurabili (già in `GlobalSettings`: `bpTurnoContinuato`, etc.)
- [ ] Report mensile buoni pasto per ragioneria
- **File**: Nuovo componente `MealVoucherCalculator.tsx`

### 8.2 Modulo Indennità Automatizzate
- [ ] Tariffe differenziate: reperibilità festiva vs feriale
- [ ] Maggiorazione turno notturno
- [ ] Indennità di missione/servizio esterno
- [ ] Export per ragioneria con totali mensili
- **File**: Evoluzione `ExportPaghePanel.tsx`

### 8.3 Modulo Formazione e Aggiornamento
- [ ] Nuovo modello DB `TrainingRecord` (corso, data, scadenza, agente)
- [ ] Tracciamento corsi obbligatori (tiro a segno, primo soccorso, BLSD)
- [ ] Widget nell'anagrafica con alert scadenze
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
| 6.1 | Fix Pasqua | ⬜ Da fare |
| 6.2 | Equity Index reale | ⬜ Da fare |
| 6.3 | Export Paghe fest/fer | ⬜ Da fare |
| 6.4 | Timbro Grafico PDF | ⬜ Da fare |
| 6.5 | Notifica post-firma | ⬜ Da fare |
| 7.1 | Alert scadenze | ⬜ Da fare |
| 7.2 | Calendario assenze | ⬜ Da fare |
| 7.3 | KPI multi-mese | ⬜ Da fare |
| 7.4 | Stampa batch OdS | ⬜ Da fare |
| 7.5 | Cartellino annuale | ⬜ Da fare |
| 7.6 | Calendario agente | ⬜ Da fare |
| 8.1 | Buoni pasto | ⬜ Da fare |
| 8.2 | Indennità | ⬜ Da fare |
| 8.3 | Formazione | ⬜ Da fare |
| 8.4 | API pubblica | ⬜ Da fare |
