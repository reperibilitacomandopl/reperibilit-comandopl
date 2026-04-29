# 🚀 Scaletta Operativa — Implementazione Audit Completo

> **Regola d'Oro**: Ogni step viene testato con `npm run build` PRIMA del deploy.  
> Nessun deploy in produzione senza build riuscita.

---

## Stato Avanzamento

| Step | Titolo | Stato | Rischio |
|------|--------|-------|---------|
| 1 | Pulizia Toolbar Pianificazione | ✅ Completato | 🟢 Basso |
| 2 | Sticky Header Griglia Turni | ✅ Già presente | 🟢 Basso |
| 3 | KPI Cliccabili + Contatore Richieste | ✅ Completato | 🟢 Basso |
| 4 | Cookie Banner GDPR | ✅ Completato | 🟢 Basso |
| 5 | Form Demo Funzionante | ✅ Completato | 🟢 Basso |
| 6 | Legenda Colori + Conflitti Visivi | ✅ Completato | 🟢 Basso |
| 7 | SOS Long-Press + Countdown Turno | ✅ Completato | 🟡 Medio |
| 8 | Mappa GPS Fix + Placeholder | ✅ Completato | 🟡 Medio |
| 9 | PDF Miglioramenti (Logo, Watermark, Individuale) | ✅ Completato | 🟡 Medio |
| 10 | Template ODS + Notifica Telegram Auto | ✅ Completato | 🟡 Medio |
| 11 | Landing Page Upgrade (Screenshot, Video) | ✅ Completato | 🟢 Basso |
| 12 | Funzionalità Avanzate (Multi-select, Undo, Chat) | ⬜ Da fare | 🔴 Alto |

---

## 📌 STEP 1 — Pulizia Toolbar Pianificazione
**Priorità: CRITICA** | **Rischio: 🟢 Basso** | **Effort: ~45 min**

### Problema
La pagina Pianificazione Mensile ha 30+ pulsanti visibili in 4 righe di toolbar.  
È confusa e intimidisce gli utenti non esperti.

### Intervento
Raggruppare i pulsanti in **3 dropdown** contestuali:
1. **📤 Export** → PDF Pro, PDF Rep, Excel, Excel Rep, Export Paghe
2. **⚙️ Strumenti** → Import Turni, Import Rep, Reset Turni, Reset Rep, Modello, Generatore Auto, AI Resolver, Verbatel Sync
3. **📋 Gestione** → Gestione Personale, Assenze, Audit, Coda Approvazioni

I pulsanti primari restano visibili: **Sala Operativa**, **Stampa ODS**, **Bacheca**, **Chiama Reperibili**

### File coinvolti
- `src/components/admin/AdminShiftGrid.tsx` (toolbar)

### Verifiche
- [ ] `npm run build` → OK
- [ ] Tutti i pulsanti restano funzionanti
- [ ] I dropdown si aprono/chiudono correttamente
- [ ] Su mobile i dropdown non escono dallo schermo

---

## 📌 STEP 2 — Sticky Header Griglia Turni
**Priorità: ALTA** | **Rischio: 🟢 Basso** | **Effort: ~15 min**

### Problema
Quando si scrolla la griglia dei turni, l'intestazione con i numeri dei giorni scompare.

### Intervento
Aggiungere `position: sticky; top: 0; z-index: 10;` all'header della tabella turni.

### File coinvolti
- `src/components/admin/AdminShiftGrid.tsx` (table header)

### Verifiche
- [ ] L'header resta fisso durante lo scroll
- [ ] Non ci sono sovrapposizioni con la sidebar
- [ ] Su mobile funziona correttamente

---

## 📌 STEP 3 — KPI Cliccabili + Contatore Richieste Pendenti
**Priorità: ALTA** | **Rischio: 🟢 Basso** | **Effort: ~30 min**

### Problema
Le card KPI nell'Overview non sono interattive. Manca un contatore delle richieste in attesa.

### Intervento
1. Wrappare ogni KPI card in un `<Link>` verso la pagina corrispondente
2. Aggiungere un badge "richieste pendenti" nel Pannello Overview

### File coinvolti
- `src/components/PannelloOverview.tsx`
- `src/app/[tenantSlug]/admin/pannello/page.tsx` (passare il conteggio)

### Verifiche
- [ ] Click su "Forze sul Campo" → apre Sala Operativa
- [ ] Click su "Ufficiali" → apre Pianificazione
- [ ] Click su "Autoparco" → apre Parco Auto
- [ ] Badge richieste visibile e aggiornato

---

## 📌 STEP 4 — Cookie Banner GDPR
**Priorità: CRITICA (legale)** | **Rischio: 🟢 Basso** | **Effort: ~30 min**

### Problema
La landing page pubblica non ha un cookie banner. È obbligatorio per legge in Italia/EU.

### Intervento
Creare un componente `CookieBanner.tsx` che:
- Appare in basso alla prima visita
- Salva il consenso in localStorage
- Mostra le opzioni: "Accetta Tutti", "Solo Necessari", "Personalizza"
- Link a `/cookie-policy`

### File coinvolti
- `src/components/CookieBanner.tsx` (nuovo)
- `src/app/layout.tsx` (integrazione)

### Verifiche
- [ ] Appare solo alla prima visita
- [ ] Dopo il click "Accetta" non riappare
- [ ] Il link alla cookie policy funziona
- [ ] Non interferisce con il layout delle pagine protette

---

## 📌 STEP 5 — Form Demo Funzionante
**Priorità: CRITICA (business)** | **Rischio: 🟢 Basso** | **Effort: ~30 min**

### Problema
Il form "Richiedi Demo" nella landing ha un `TODO: Send to API` e non invia nulla.

### Intervento
1. Creare endpoint `POST /api/demo-request`
2. Inviare i dati via Telegram al bot del super admin
3. Salvare la richiesta nel database (tabella `DemoRequest`)
4. Mostrare conferma visiva

### File coinvolti
- `src/app/api/demo-request/route.ts` (nuovo)
- `src/components/LandingPage.tsx` (fetch POST)

### Verifiche
- [ ] Compilare il form → messaggio Telegram ricevuto
- [ ] Conferma visiva "Richiesta Inviata" mostrata
- [ ] Validazione campi obbligatori funzionante

---

## 📌 STEP 6 — Legenda Colori + Conflitti Visivi
**Priorità: MEDIA** | **Rischio: 🟢 Basso** | **Effort: ~30 min**

### Problema
Nella griglia turni non c'è una legenda dei colori. I conflitti (doppio turno, massimale superato) non sono evidenziati.

### Intervento
1. Aggiungere una **barra legenda collassabile** sotto la toolbar
2. Aggiungere un **bordo rosso pulsante** sulle celle con conflitti

### File coinvolti
- `src/components/admin/AdminShiftGrid.tsx`

### Verifiche
- [ ] La legenda mostra tutti i colori usati
- [ ] Le celle con conflitti hanno bordo rosso
- [ ] La legenda è collassabile per non ingombrare

---

## 📌 STEP 7 — SOS Long-Press + Countdown Prossimo Turno
**Priorità: ALTA (sicurezza)** | **Rischio: 🟡 Medio** | **Effort: ~45 min**

### Problema
Il pulsante SOS può essere premuto accidentalmente. Manca un countdown al prossimo turno.

### Intervento
1. Implementare conferma **long-press 3 secondi** con barra di progresso circolare
2. Aggiungere widget **countdown** ("Prossimo servizio tra Xh Ym")

### File coinvolti
- `src/components/agent/AgentSosModal.tsx`
- `src/components/agent/AgentHeader.tsx` (pulsante SOS)
- `src/components/agent/NextShiftCard.tsx` (countdown)

### Verifiche
- [ ] SOS si attiva SOLO dopo 3 secondi di pressione continua
- [ ] Se si rilascia prima, non parte
- [ ] Countdown aggiorna correttamente ogni minuto
- [ ] Countdown scompare se non ci sono turni futuri

---

## 📌 STEP 8 — Fix Mappa GPS + Placeholder Informativo
**Priorità: MEDIA** | **Rischio: 🟡 Medio** | **Effort: ~30 min**

### Problema
La Centrale Operativa GPS mostra una pagina quasi vuota quando non ci sono agenti in servizio.

### Intervento
1. Verificare che il componente Leaflet si carichi (lazy loading)
2. Aggiungere un **placeholder illustrato** quando 0 agenti sono in rete
3. Mostrare gli **orari dei prossimi turni** come informazione contestuale

### File coinvolti
- `src/components/ControlRoomMap.tsx`

### Verifiche
- [ ] La mappa si carica correttamente
- [ ] Con 0 agenti → placeholder con info utili
- [ ] Con agenti attivi → marker sulla mappa

---

## 📌 STEP 9 — PDF Miglioramenti
**Priorità: MEDIA** | **Rischio: 🟡 Medio** | **Effort: ~1h**

### Interventi
1. **Logo del Comune**: Assicurarsi che il logo venga sempre incluso se configurato
2. **Watermark "BOZZA"**: Aggiungere watermark ai PDF dei mesi non pubblicati
3. **PDF individuale**: Nuovo pulsante "Stampa Scheda Agente" con riepilogo mensile personale

### File coinvolti
- `src/utils/pdf-generator.ts`
- `src/hooks/useAdminData.ts` (nuovo handler)

### Verifiche
- [ ] Logo visibile nel PDF se configurato
- [ ] Watermark "BOZZA" presente solo per mesi non pubblicati
- [ ] PDF individuale contiene: nome, ore, straordinari, assenze, reperibilità

---

## 📌 STEP 10 — Template ODS + Notifica Telegram Auto
**Priorità: MEDIA** | **Rischio: 🟡 Medio** | **Effort: ~1h**

### Interventi
1. **Template ODS**: Pulsante "Salva come Template" nell'OdS + "Carica Template"
2. **Notifica Telegram automatica**: Quando l'OdS viene certificato, tutti gli agenti assegnati ricevono un messaggio Telegram

### File coinvolti
- `src/components/ServiceOrderDashboard.tsx`
- `src/app/api/admin/ods/route.ts`

### Verifiche
- [ ] Template salvato e ricaricabile
- [ ] Notifica Telegram inviata al momento della certificazione
- [ ] Il messaggio contiene orario e servizio assegnato

---

## 📌 STEP 11 — Landing Page Upgrade
**Priorità: BASSA** | **Rischio: 🟢 Basso** | **Effort: ~1h**

### Interventi
1. Aggiungere **sezione screenshot** con carousel dell'app (3-4 immagini generate)
2. Migliorare **social proof** con logo del Comune e numero agenti reali
3. SEO: structured data JSON-LD per Google

### File coinvolti
- `src/components/LandingPage.tsx`
- `src/app/layout.tsx` (meta tags)

### Verifiche
- [ ] Screenshot carousel funzionante
- [ ] Dati reali nella social proof
- [ ] Google Lighthouse SEO score migliorato

---

## 📌 STEP 12 — Funzionalità Avanzate
**Priorità: BASSA** | **Rischio: 🔴 Alto** | **Effort: ~3-5h**

### Interventi (da valutare uno per uno)
1. **Multi-select celle** nella griglia turni (Shift+Click)
2. **Undo/Redo** per le modifiche ai turni
3. **Copia mese** da un mese precedente
4. **Link Impostazioni** nella sidebar admin
5. **Mini-grafico storico** copertura (ultimi 7 giorni)

### File coinvolti
- Multipli componenti admin

### Verifiche
- [ ] Ogni funzionalità testata isolatamente
- [ ] Nessuna regressione sui flussi esistenti
- [ ] Build riuscita dopo ogni modifica

---

## 📋 Protocollo di Sicurezza per Ogni Step

1. **Prima di toccare il codice** → leggere il file coinvolto per confermare lo stato attuale
2. **Modifiche incrementali** → mai riscrivere un file intero, solo aggiungere/modificare
3. **Build check** → `npm run build` dopo ogni step
4. **Deploy** → `vercel --prod` solo dopo build riuscita
5. **Verifica visiva** → controllare nel browser che tutto funzioni

> [!CAUTION]  
> **Mai** modificare `middleware.ts`, `auth.ts` o `prisma/schema.prisma` senza una verifica extra.  
> Questi file sono critici per la sicurezza e la stabilità del sistema.
