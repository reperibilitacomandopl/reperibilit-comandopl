# Visita Comando PL Altamura — Demo Guidata

> Data: da fissare | Durata: 45 minuti | Partecipanti: Comandante + eventuale Assessore

---

## 🎯 Obiettivo

Mostrare il valore di Sentinel in 45 minuti, raccogliere feedback, ottenere lettera di referenza.

---

## 📋 Agenda

### 1. Il problema (5 min) — solo parlato
- "Quanto tempo passate a settimana a fare turni e OdS?"
- "Come comunicate i turni agli agenti? WhatsApp? Fogli excel?"
- "Cosa succede se un agente in strada ha un'emergenza?"

Far emergere il dolore prima di mostrare la soluzione.

### 2. Dashboard Comandante (10 min) — mostra schermo
URL: `gestionepolizialocale.it/altamura/admin/comandante`
Mostrare:
- KPI in tempo reale (organico, copertura, assenteismo)
- Pianificazione ferie (chi è via e quando)
- Alert automatici
- **Domanda:** "Vi sarebbe utile avere questa vista ogni mattina?"

### 3. Pianificazione Turni (10 min) — live demo
URL: `gestionepolizialocale.it/altamura/admin/pianificazione`
Mostrare:
- Click su cella → cambio turno immediato
- Generatore automatico (menu Strumenti → Generatore Auto)
- Pubblicazione mese (lock + notifica Telegram)
- **Domanda:** "Quanto tempo risparmiereste rispetto al vostro metodo attuale?"

### 4. Ordine di Servizio (5 min) — live demo
URL: `gestionepolizialocale.it/altamura/admin/ods`
Mostrare:
- Drag & drop agenti nei servizi
- Certificazione con firma SHA-256
- PDF generato con QR code
- **Domanda:** "Quanto valgono OdS certificati digitalmente per voi?"

### 5. Mobile Agent (5 min) — mostra su telefono
URL: `gestionepolizialocale.it/altamura` (da telefono)
Mostrare:
- Dashboard agente (turno oggi, countdown)
- Timbratura GPS
- SOS con long-press
- Installazione PWA su home screen
- **Domanda:** "I vostri agenti userebbero l'app sul telefono?"

### 6. Richieste e Workflow (5 min)
URL: `gestionepolizialocale.it/altamura/admin/richieste`
Mostrare:
- Workflow a 2 livelli (Ufficiale → Admin)
- Auto-escalation 48h
- Notifiche Telegram

### 7. Chiusura e Prossimi Passi (5 min)
- "Cosa ne pensate? Cosa manca per le vostre esigenze?"
- "Possiamo personalizzare qualsiasi modulo"
- Richiedere **lettera di referenza** (basta una mail di 3 righe)
- Offrire **3 mesi gratuiti** in cambio di feedback continuativo

---

## 📦 Materiale da Portare

- **Tablet/PC** per mostrare la dashboard admin (o usare il loro PC)
- **Telefono** con PWA già installata per la demo agente
- **PDF stampato** della scheda tecnica (1 pagina dal PRD)
- **PDF DPA e SLA** precompilati per Altamura (generati da `/admin/compliance`)
- **Manuale operativo** stampato (1 pagina admin + 1 pagina agente)

---

## 💬 Risposte a Domande Probabili

**"Quanto costa?"**
> Abbiamo un piano TRIAL gratuito di 30 giorni. Dopo, 199€/mese per fino a 50 agenti. Per Altamura, in qualità di primo comando pilota, offriamo 3 mesi gratuiti e uno sconto fedeltà.

**"I dati dove stanno?"**
> Su cloud Supabase in AWS EU-Central-1 (Francoforte). Certificato GDPR. Facciamo backup automatici giornalieri. Possiamo anche installare su vostro server se preferite.

**"È sicuro?"**
> Abbiamo completato un audit di sicurezza su 28 punti. Usiamo crittografia AES-256 per i dati sensibili, 2FA per l'accesso, firma digitale SHA-256 per gli OdS. Superiamo i requisiti AgID per SaaS PA.

**"Gli agenti sono restii alla tecnologia?"**
> L'app è un sito web normale. Si installa come un'app in 2 tap, senza passare dallo store. Se sanno usare WhatsApp, sanno usare Sentinel.

**"Possiamo provarlo prima di decidere?"**
> Certo. Vi attiviamo un ambiente di prova con i vostri dati reali. 30 giorni gratuiti, senza impegno.

---

## 📝 Dopo la Visita

1. Inviare **email di follow-up** entro 24 ore con:
   - Link all'ambiente di prova
   - PDF dei documenti mostrati
   - Contatti per supporto
2. Programmare **seconda visita tra 2 settimane** per verificare come sta andando
3. Chiedere **referenza scritta** (bastano 3 righe: "Sentinel funziona bene, la consiglio")
