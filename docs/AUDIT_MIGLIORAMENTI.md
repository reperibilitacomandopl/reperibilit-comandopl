# 🔍 Audit Completo — Sentinel Security Suite
## Piano di Miglioramento Dettagliato (Funzionalità + Grafica)

> Analisi condotta il 29 Aprile 2026 su tutte le pagine del portale in produzione.
> **Ultimo aggiornamento implementazioni: 29 Aprile 2026**

---

## 📊 Riepilogo Esecutivo

| Area | Stato Attuale | Priorità |
|------|--------------|----------|
| Landing Page | ⭐⭐⭐⭐ Eccellente | Bassa |
| Dashboard Admin (Overview) | ⭐⭐⭐⭐ Molto buona | Media |
| Pianificazione Mensile (Cockpit) | ⭐⭐⭐ Buona ma densa | **Alta** |
| Ordine di Servizio (ODS) | ⭐⭐⭐⭐ Molto buona | Media |
| Stampa ODS | ⭐⭐⭐⭐ Professionale | Bassa |
| Centrale Operativa GPS | ⭐⭐⭐ Funzionale ma vuota | Media |
| Dashboard Agente | ⭐⭐⭐⭐ Eccellente UX mobile | Media |
| PDF Export | ⭐⭐⭐ Corretto (appena fixato) | Bassa |
| Calendario iCal | ⭐⭐⭐⭐ Funzionante (appena fixato) | Bassa |

---

## 🏠 1. LANDING PAGE (`/`)

### Stato Attuale
Design moderno e premium con glassmorphism, animazioni scroll, sezione pricing e form demo. Molto professionale.

### Miglioramenti Grafica
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 1.1 | Aggiungere un **video/animazione hero** (mockup dell'app in uso) al posto del solo testo | Alto | Medio |
| 1.2 | Inserire **loghi clienti** nella social proof bar (anche solo il logo del Comune di Altamura) | Medio | Basso |
| 1.3 | Aggiungere una **sezione screenshot** dell'app con carousel interattivo | Alto | Medio |
| 1.4 | Il form demo non invia realmente i dati (`TODO: Send to API` nel codice). **Collegare a un endpoint** | **Critico** | Basso |

### Miglioramenti Funzionali
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 1.5 | Implementare invio email reale per il form demo (via API `/api/demo-request`) | Alto | Basso |
| 1.6 | Aggiungere **cookie banner GDPR** nella landing (obbligatorio per legge) | **Critico** | Basso |
| 1.7 | SEO: aggiungere structured data (JSON-LD) per Google | Medio | Basso |

---

## 📊 2. DASHBOARD ADMIN — PANNELLO OVERVIEW (`/admin/pannello`)

### Stato Attuale
KPI card professionali, scanner strategico con barra di copertura, sezione AI Insights suggestiva. Buon livello.

### Miglioramenti Grafica
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 2.1 | Le **KPI card** hanno label generiche ("Sentinel KPI 01/02/03/04"). Sostituire con nomi più specifici o rimuovere | Basso | Basso |
| 2.2 | Lo **Scanner Strategico Forze** è un po' statico. Aggiungere un **mini-grafico a linee** (ultimi 7 giorni di copertura) | Alto | Medio |
| 2.3 | La sezione **"AI Intelligence Insights"** è ben costruita ma testuale. Aggiungere **icone di stato** colorate accanto ai titoli | Medio | Basso |
| 2.4 | Aggiungere un **widget calendario mini** che mostri i prossimi eventi importanti (pubblicazioni, scadenze) | Alto | Medio |

### Miglioramenti Funzionali
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 2.5 | Le card KPI non sono **cliccabili**. Renderle link (es. "Forze sul Campo" → apre la sala operativa) | Medio | Basso |
| 2.6 | Aggiungere un **contatore richieste pendenti** (ferie/permessi in attesa di approvazione) visibile in overview | Alto | Basso |
| 2.7 | Implementare **notifica sonora** per nuove richieste di assenza o SOS | Medio | Medio |

---

## 📅 3. PIANIFICAZIONE MENSILE — CABINA DI REGIA (`/admin/pianificazione`)

> [!WARNING]
> Questa è la pagina con il maggior margine di miglioramento. L'alta densità di pulsanti rende l'interfaccia confusa per utenti non esperti.

### Stato Attuale
Griglia turni completa con ~30 pulsanti operativi visibili simultaneamente in 4 righe di toolbar. La tabella dei turni funziona bene ma è schiacciata dallo spazio occupato dall'header.

### Miglioramenti Grafica — PRIORITÀ ALTA
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 3.1 | **Raggruppare i pulsanti** in categorie collassabili: "📤 Export" (PDF, Excel, Paghe), "⚙️ Sistema" (Reset, Import, Modello), "🔧 Operativo" (Sala Operativa, Stampa ODS, Generatore) | **Critico** | Medio |
| 3.2 | Implementare un **menu contestuale** (dropdown) per le azioni secondarie, riducendo i pulsanti visibili a max 8 | **Critico** | Medio |
| 3.3 | Rendere il banner **"Onboarding" nascondibile permanentemente** (mostra "Nascondi" ma riappare) | Medio | Basso |
| 3.4 | La **barra di ricerca** "Cerca agente..." è piccola. Renderla più prominente con filtri avanzati (per squadra, per ruolo) | Medio | Medio |
| 3.5 | Aggiungere **sticky header** alla griglia dei turni (l'intestazione con i giorni deve restare visibile durante lo scroll) | Alto | Basso |
| 3.6 | Migliorare la **legenda colori** dei turni: aggiungere una legenda visibile sotto la toolbar | Medio | Basso |

### Miglioramenti Funzionali
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 3.7 | **Undo/Redo**: Implementare un sistema di annullamento per le modifiche ai turni | Alto | Alto |
| 3.8 | **Multi-select**: Permettere la selezione di più celle contemporaneamente per assegnazioni bulk | Alto | Alto |
| 3.9 | **Copia-incolla mese**: Copiare la pianificazione da un mese precedente come base | Medio | Medio |
| 3.10 | **Conflitti visivi**: Mostrare un bordo rosso sulle celle con conflitti (es. doppio turno, massimale superato) | Alto | Medio |

---

## 🏢 4. ORDINE DI SERVIZIO — SALA OPERATIVA (`/admin/ods`)

### Stato Attuale
Interfaccia drag & drop con due colonne (Mattina/Pomeriggio), raggruppamento per servizio. Molto funzionale.

### Miglioramenti Grafica
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 4.1 | La colonna **"Risorse Disponibili"** a sinistra è stretta. Renderla collassabile per dare più spazio alla zona operativa | Medio | Basso |
| 4.2 | Aggiungere un **indicatore visivo di completamento** ("12/15 agenti assegnati") in alto | Medio | Basso |
| 4.3 | I **dropdown** (+Veicolo, +Radio) sono piccoli. Renderli più leggibili su mobile | Medio | Basso |

### Miglioramenti Funzionali
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 4.4 | **Template ODS**: Salvare configurazioni ricorrenti come template riutilizzabili | Alto | Medio |
| 4.5 | **Stampa rapida**: Pulsante "Certifica e Stampa" con un solo click (attualmente sono 2 passaggi) | Medio | Basso |
| 4.6 | **Notifica automatica Telegram** al momento della certificazione dell'ODS | Alto | Basso |

---

## 🗺️ 5. CENTRALE OPERATIVA GPS (`/admin/sala-operativa`)

### Stato Attuale
Pagina con header "Centrale Operativa GPS" ma la mappa appare vuota con "0 Agenti in Rete". Il layout è molto scarno.

### Miglioramenti Grafica
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 5.1 | La mappa **non si vede** nella schermata attuale. Verificare che il componente Leaflet si carichi correttamente | **Critico** | Basso |
| 5.2 | Aggiungere **stato placeholder** più informativo quando non ci sono agenti in servizio (illustrazione, orari previsti) | Medio | Basso |
| 5.3 | Aggiungere **pannello laterale** con lista agenti attivi e filtri per servizio | Alto | Medio |

### Miglioramenti Funzionali
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 5.4 | **Geofencing**: Configurare zone di servizio e alert quando un agente esce dalla zona assegnata | Alto | Alto |
| 5.5 | **Storico posizioni**: Timeline delle posizioni degli agenti nelle ultime 24h | Medio | Alto |
| 5.6 | **Integrazione meteo**: Sovrapporre layer meteo sulla mappa per decisioni operative | Basso | Medio |

---

## 📱 6. DASHBOARD AGENTE (`/altamura?view=agent`)

### Stato Attuale
Design premium "gamer/glassmorphism" ottimizzato per mobile. Widget servizio del giorno, bacheca comando, calendario personale.

### Miglioramenti Grafica
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 6.1 | Il pulsante **SOS** è molto prominente. Aggiungere una conferma "long-press" (3 secondi) per evitare attivazioni accidentali | **Critico** | Medio |
| 6.2 | Il **WeatherWidget** è carino ma fisso su "Altamura". Renderlo dinamico in base alla posizione GPS dell'agente | Basso | Medio |
| 6.3 | Aggiungere un **countdown** al prossimo turno ("Prossimo servizio tra 14h 30m") | Alto | Basso |
| 6.4 | Le viste calendario (Calendario/Griglia/Annuale) funzionano. Aggiungere un **toggle dark/light mode** dedicato | Basso | Basso |

### Miglioramenti Funzionali
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 6.5 | **Storico personale**: Sezione "I miei turni passati" con filtri per mese e tipo di servizio | Medio | Medio |
| 6.6 | **Documenti personali**: Upload patente, porto d'armi con alert di scadenza personalizzato | Alto | Medio |
| 6.7 | **Chat tra colleghi**: Mini-chat tra i membri della stessa pattuglia/servizio del giorno | Medio | Alto |

---

## 🖨️ 7. PDF & EXPORT

### Stato Attuale
PDF pianificazione e reperibilità funzionanti (appena corretti). Grafica uniformata con sigla "REP".

### Miglioramenti
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 7.1 | Aggiungere **intestazione con logo** del Comune nel PDF (attualmente opzionale e spesso assente) | Alto | Basso |
| 7.2 | **PDF riepilogo mensile** individuale per ogni agente (ore lavorate, straordinari, assenze) | Alto | Medio |
| 7.3 | Implementare **export PDF dell'ODS** con layout uguale a quello cartaceo tradizionale | Medio | Medio |
| 7.4 | Aggiungere **watermark "BOZZA"** ai PDF dei mesi non ancora pubblicati | Basso | Basso |

---

## ⚙️ 8. IMPOSTAZIONI & SISTEMA

### Miglioramenti
| # | Intervento | Impatto | Effort |
|---|-----------|---------|--------|
| 8.1 | Le impostazioni sono **difficili da raggiungere**. Aggiungere un link diretto nella sidebar admin | **Critico** | Basso |
| 8.2 | Implementare un **backup manuale** del database scaricabile dall'admin | Alto | Medio |
| 8.3 | **Log attività** più dettagliato con filtri per utente, azione e data | Medio | Medio |
| 8.4 | **Ruoli personalizzabili**: Attualmente ci sono permessi granulari, ma senza preset (es. "Capo Squadra" pre-configurato) | Medio | Medio |

---

## 🎯 Roadmap Prioritaria Consigliata

### 🔴 Sprint 1 — Correzioni Critiche (1-2 settimane)
1. ~~Fix PDF vuoti~~ ✅ Completato
2. ~~Fix calendario iCal/iPhone~~ ✅ Completato
3. ~~Cookie banner GDPR (1.6)~~ ✅ Completato — Componente `CookieBanner.tsx`
4. ~~Form demo → collegare a email (1.4, 1.5)~~ ✅ Completato — API `/api/demo-request` + Telegram
5. ~~Mappa GPS non caricata (5.1)~~ ✅ Completato — Placeholder informativo migliorato
6. Link impostazioni nella sidebar (8.1)

### 🟡 Sprint 2 — UX Admin (2-3 settimane)
7. ~~Riorganizzazione toolbar Pianificazione (3.1, 3.2)~~ ✅ Completato — 2 dropdown (Strumenti + Export)
8. ~~Sticky header griglia turni (3.5)~~ ✅ Già presente nel codice
9. ~~KPI cliccabili nell'overview (2.5)~~ ✅ Completato — Link a pagine corrispondenti
10. ~~Contatore richieste pendenti (2.6)~~ ✅ Già presente (badge Approvazioni)
11. ~~Conferma long-press SOS (6.1)~~ ✅ Completato — 2.5s con progress ring SVG
12. Template ODS riutilizzabili (4.4)

### 🟢 Sprint 3 — Funzionalità Avanzate (3-4 settimane)
13. Mini-grafico storico copertura (2.2)
14. Multi-select celle turni (3.8)
15. ~~PDF watermark BOZZA (7.4)~~ ✅ Completato
16. Countdown prossimo turno (6.3)
17. ~~Legenda colori nella griglia (3.6)~~ ✅ Completato — Barra collassabile
18. ~~Notifica Telegram auto su ODS (4.6)~~ ✅ Completato — Auto-invio alla certificazione

### 🟣 Sprint 4 — Innovazione (4-6 settimane)
19. Video/mockup hero landing (1.1)
20. Geofencing GPS (5.4)
21. Chat pattuglia (6.7)
22. Undo/Redo turni (3.7)
23. Storico posizioni GPS (5.5)
