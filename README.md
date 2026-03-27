# 🛡️ Portale Reperibilità — Comando di Polizia Locale di Altamura

Sistema di gestione dei turni di reperibilità notturna (22:00–07:00) per il Comando di Polizia Locale di Altamura.

---

## 📋 Panoramica

Il sistema gestisce due ruoli principali:

| Ruolo | Accesso | Funzioni |
|-------|---------|----------|
| **Amministratore** | Dashboard completa, gestione turni | Importa turni base, genera reperibilità, pubblica, modifica manualmente |
| **Agente / Ufficiale** | Dashboard personale | Visualizza proprio calendario, sincronizza con Google/Apple, gestisce agenda personale |

---

## 🔐 Accesso al Sistema

Ogni utente accede con **matricola** e **password** dalla pagina di login.  
L'accesso determina automaticamente il ruolo (Admin o Agente) e la vista mostrata.

---

## 👨‍💼 LATO AMMINISTRATORE

### 1. Importazione Turni Base (Excel)

L'admin importa il file Excel dei turni base del mese. Il file contiene per ogni agente il turno giornaliero assegnato (es. `M7`, `P14`, `F`, `RR`, `104`, ecc.).

Questi turni base sono **fondamentali** perché determinano:
- **Chi è disponibile** per la reperibilità in un dato giorno
- **Chi è bloccato** (ferie, malattia, riposi, congedi)

### 2. Generazione Automatica delle Reperibilità

Cliccando su **"Genera Reperibilità"**, l'algoritmo assegna automaticamente i turni REP 22:00–07:00 per l'intero mese.

#### Come funziona l'algoritmo

L'assegnazione avviene in **3 fasi** successive:

---

#### FASE 0 — Assegnazione Ufficiali (Prioritaria)

Per **ogni giorno del mese**, il sistema assicura la presenza di **almeno 1 ufficiale** tra i reperibili.

Gli ufficiali vengono scelti con questi criteri:
- L'ufficiale non deve essere **bloccato** quel giorno (codici bloccanti: `F`, `FERIE`, `M`, `MALATTIA`, `104`, `RR`, `RP`, `RPS`, `CONGEDO`, `ASS`, `CS`, `PNR`, ecc.)
- L'ufficiale non deve essere bloccato **il giorno successivo** (poiché il turno notturno finisce la mattina dopo)
- Deve esserci un **distanziamento di almeno 2 giorni** tra due reperibilità consecutive
- Massimo **1 sabato** e **1 domenica** al mese per ufficiale
- A parità di condizioni, viene preferito chi ha **meno turni assegnati** rispetto al proprio obiettivo

---

#### FASE 1 — Assegnazione Principale Agenti

Per ogni giorno, il sistema assegna i restanti agenti fino a raggiungere il **target giornaliero** (tra 7 e 8 agenti reperibili al giorno).

I candidati vengono valutati con un **sistema a punteggio** (score più basso = priorità più alta):

| Criterio | Effetto sul Punteggio |
|----------|----------------------|
| Rapporto turni fatti / turni obiettivo | Base del calcolo — chi ha fatto meno turni ha priorità |
| Turno base di **mattina** (M7, M8...) | **Bonus −500** (preferito, perché finisce prima del turno notturno) |
| Turno base di **pomeriggio** (P14...) | **Penalità +300** (meno ideale per servizio notturno consecutivo) |
| Già raggiunto il target festivi (2) | **Penalità +5000** |
| Già fatto 1 sabato o 1 domenica | **Penalità +1.000.000** (praticamente escluso) |

**Regole ferree:**
- Mai **due reperibilità consecutive** (distanza minima 2 giorni)
- Mai reperibilità se il giorno dopo è **bloccato**
- Massimo **1 sabato** e **1 domenica** per agente al mese
- Obiettivo: **2 festivi** (idealmente 1 sabato + 1 domenica) per agente

---

#### FASE 2 — Riempimento (Rilassato)

Se dopo la Fase 1 ci sono giorni con **meno di 7 agenti reperibili**, il sistema esegue 2 passaggi di riempimento con regole progressivamente rilassate:
- **Passaggio 1**: Distanziamento ridotto a 1 giorno
- **Passaggio 2**: Nessun vincolo di distanziamento

---

#### Target Individuale e Proporzionalità

Ogni agente ha un **massimale** personale impostato dall'admin (default: 5 per agenti, 6 per ufficiali, configurabile fino a 8).

Se l'opzione **"Proporzionalità Assenze"** è attiva:
- Se un agente ha **molte assenze** nel mese (ferie, malattie, ecc.), il suo obiettivo viene ridotto proporzionalmente
- Esempio: se un agente con massimale 8 è presente solo 20 giorni su 30, il suo target diventa circa 5

Formula: `Target = (Giorni Disponibili / Giorni Base) × Massimale`

---

### 3. Modifica Manuale

Dopo la generazione automatica, l'admin può:
- **Aggiungere** una reperibilità a un agente in un giorno specifico (clic sulla cella)
- **Rimuovere** una reperibilità esistente (clic sulla cella con REP)
- **Modificare** il turno base di un agente

### 4. Pubblicazione

Quando l'admin è soddisfatto della distribuzione, clicca **"Pubblica Mese"**.  
Solo dopo la pubblicazione i turni diventano visibili agli agenti nella loro dashboard.

### 5. Gestione Agenti

L'admin può:
- Aggiungere/rimuovere agenti dal sistema
- Designare un agente come **Ufficiale** (toggle)
- Modificare il **massimale** individuale di reperibilità
- Impostare email e telefono per le notifiche PEC

---

## 👮 LATO AGENTE / UFFICIALE

### 1. Calendario Personale

Dopo il login, l'agente vede il proprio **calendario mensile** con una griglia a 7 colonne, simile a Google Calendar.

Ogni giorno mostra:
- 🟢 **Verde** → Reperibilità assegnata (REP 22:00–07:00)
- 🟡 **Giallo** → Assenza (Ferie, 104, ecc.)
- 🔵 **Blu** → Turno standard o malattia
- 🔴 **Rosso** → Weekend/Festivo
- 🟣 **Viola** → Voce in Agenda Personale
- 🔵 **Bordo blu lampeggiante** → Giorno corrente

### 2. Widget "Prossima Reperibilità"

Un widget dinamico mostra sempre:
- La **data della prossima reperibilità** futura
- Un **countdown** (tra X giorni / ⚠️ Domani / 🔴 OGGI!)
- L'**orario del turno** (22:00 – 07:00)

### 3. Riepilogo Mensile

Una sezione dedicata elenca **tutte le reperibilità del mese** con:
- Data e giorno della settimana
- Tipo di reperibilità
- Turno base assegnato
- Conteggio totale

### 4. Sincronizzazione Calendario

L'agente può esportare le proprie reperibilità in:
- 📱 **iPhone / iPad / Mac** → Abbonamento automatico via `webcal://`
- 💻 **Windows / Outlook** → Abbonamento calendario Internet
- 🌐 **Google Calendar** → Importazione diretta
- 📥 **File .ics** → Download manuale

---

## 📒 AGENDA PERSONALE

Ogni agente dispone di un'**agenda personale privata** integrata nel calendario.

### Come Funziona

1. **Clicca su un giorno** nel calendario oppure sul pulsante **"Gestisci Agenda"**
2. Si apre la modale con:
   - **A sinistra**: Form di inserimento con ricerca tra 60+ codici
   - **A destra**: Lista di tutti gli appunti del mese

### Codici Disponibili

I codici sono organizzati in **7 categorie colorate**:

| Emoji | Categoria | Esempi |
|-------|-----------|--------|
| 🏖️ | **Ferie e Festività** | Ferie Anno Corrente (0015), Festività Soppresse (0010) |
| 👶 | **Congedi** | Congedo Paternità (0112), Parentale 100% (0111), 80% (0098), 30% (0097) |
| 📋 | **Permessi** | L.104/92 (0031), Istituzionali Retribuiti (0005), Motivi Personali (0014) |
| 🏥 | **Malattia e Salute** | Visite/Esami (0032), Donazione Sangue (0035), Allattamento (0003) |
| 🔄 | **Recupero Ore** | Recupero A.O. (0009), Ore Eccedenti (0008), Riposo Compensativo (0036) |
| ⏰ | **Straordinario** | Pagamento (2000), Notturno (2001), Festivo (2002), Elettorale (2020) |
| 🎓 | **Formazione** | Corso Aggiornamento (2041), Diritto Studio 150h (0011), Missione (0068) |

### Funzionalità
- **🔍 Ricerca rapida**: Digita "ferie", "104", "straord" per trovare il codice
- **⏱ Ore**: Campo opzionale per registrare le ore (es. permessi orari, straordinari)
- **📝 Note**: Dettagli aggiuntivi liberi
- **🗑️ Eliminazione**: Hover sulla voce → icona cestino
- **📊 Statistiche**: Totale voci e ore visualizzate nel footer della modale e nella card della dashboard

### Privacy
> ⚠️ **L'agenda è strettamente personale**: ogni utente vede e gestisce solo le proprie voci. Nessun altro utente o amministratore può accedere all'agenda di un altro agente.

---

## 🗄️ Struttura Database

| Tabella | Descrizione |
|---------|-------------|
| `User` | Agenti e admin con matricola, ruolo, massimale, flag ufficiale |
| `Shift` | Turni base + assegnazione REP per data |
| `Absence` | Assenze importate da Excel |
| `AgendaEntry` | Voci dell'agenda personale (codice, label, ore, note) |
| `MonthStatus` | Stato pubblicazione per mese/anno |
| `GlobalSettings` | Parametri globali (anno, mese corrente, proporzionalità) |

---

## 🚀 Avvio Rapido

```bash
# Installazione dipendenze
npm install

# Setup database
npx prisma db push

# Avvio in sviluppo
npm run dev
```

L'app sarà disponibile su `http://localhost:3000`

---

## 📂 File Principali

| File | Funzione |
|------|----------|
| `src/app/api/admin/generate/route.ts` | Algoritmo di generazione reperibilità |
| `src/app/api/admin/edit-shift/route.ts` | Modifica manuale turni |
| `src/app/api/admin/publish-month/route.ts` | Pubblicazione mese |
| `src/app/api/agenda/route.ts` | API CRUD agenda personale |
| `src/app/api/calendar/[userId]/route.ts` | Generazione file .ics |
| `src/components/AgentDashboard.tsx` | Dashboard agente completa |
| `src/app/page.tsx` | Dashboard admin + routing |
| `prisma/schema.prisma` | Schema database |

---

*Comando di Polizia Locale di Altamura · Sistema Reperibilità v1.0*
