# BUSINESS CONTINUITY PLAN E DISASTER RECOVERY
## Sentinel Security Suite

**Versione:** 1.0  
**Data:** 22 Maggio 2026  
**Classificazione:** Riservato (Allegato Tecnico per Bandi PA)  

---

## 1. OBIETTIVO DEL DOCUMENTO

Il presente documento descrive le misure tecniche e organizzative adottate per garantire la continuità operativa (Business Continuity) e il ripristino in caso di disastro (Disaster Recovery) della piattaforma SaaS **Sentinel Security Suite**.
Il piano è redatto in conformità con i requisiti del D.Lgs. 82/2005 (CAD), GDPR (UE 2016/679), e le linee guida AgID per i servizi cloud della Pubblica Amministrazione.

## 2. DEFINIZIONE DEI PARAMETRI DI RECUPERO

I parametri fondamentali che guidano il piano di continuità sono:
- **RTO (Recovery Time Objective):** Il tempo massimo tollerabile in cui il sistema può rimanere non disponibile dopo un'interruzione grave.
  - *Obiettivo RTO per Sentinel:* **≤ 4 ore**
- **RPO (Recovery Point Objective):** La massima perdita di dati tollerabile, misurata in tempo.
  - *Obiettivo RPO per Sentinel:* **≤ 1 ora** (grazie al backup continuo).

## 3. ARCHITETTURA DI ALTA AFFIDABILITÀ

La piattaforma è progettata per prevenire i singoli punti di guasto (Single Point of Failure - SPOF):

### 3.1 Applicazione (Frontend/API)
L'applicazione (Next.js) è ospitata su infrastruttura serverless distribuita (Edge Network).
- **Bilanciamento:** Il traffico è automaticamente bilanciato su più nodi.
- **Auto-scaling:** L'infrastruttura scala automaticamente per gestire picchi di traffico.
- **Failover:** In caso di guasto di un nodo, il traffico viene reindirizzato istantaneamente a nodi sani.

### 3.2 Database
Il database PostgreSQL è gestito in modalità cloud-native ad alta disponibilità.
- **Replicazione:** I dati sono replicati in modo sincrono su nodi secondari nella stessa region.
- **Failover automatico:** In caso di guasto del database primario, un nodo di standby viene promosso a primario senza intervento manuale.
- **Crittografia:** Tutti i dati sono crittografati "at rest" con algoritmo AES-256-GCM.

### 3.3 Storage (Documenti e File)
I documenti generati (OdS, PDF, allegati) sono memorizzati su Object Storage distribuito geograficamente.
- **Durabilità:** Garantita al 99.999999999% (11 9s).
- **Versioning:** Gestione delle versioni per prevenire cancellazioni o modifiche accidentali.

## 4. PIANO DI BACKUP E RETENTION

Per garantire l'RPO di 1 ora e la conformità normativa:
- **Backup continui (Point-in-Time Recovery):** Il database conserva log continui per consentire il ripristino a qualsiasi secondo degli ultimi 7 giorni.
- **Snapshot giornalieri:** Eseguiti automaticamente ogni notte.
- **Archiviazione mensile:** Uno snapshot mensile viene conservato per 1 anno.
- **Separazione geografica:** I backup sono conservati in una regione geografica separata dal database primario per protezione contro disastri regionali.
- **Verifica automatica:** I backup sono verificati periodicamente.

## 5. SCENARI DI DISASTRO E PROCEDURE DI RIPRISTINO

### 5.1 Guasto dell'Infrastruttura Applicativa
*Descrizione:* Interruzione del provider cloud di calcolo.
*Azione:* Rilascio automatico (tramite pipeline CI/CD) del codice su un provider di failover pre-configurato. L'operazione richiede aggiornamento DNS.
*Tempo stimato (RTO):* 1-2 ore.

### 5.2 Corruzione del Database o Attacco Ransomware
*Descrizione:* Dati compromessi a causa di errore umano o attacco malevolo.
*Azione:* Attivazione del Point-in-Time Recovery per ripristinare il database allo stato immediatamente precedente l'incidente. Cambio credenziali e invalidazione sessioni.
*Tempo stimato (RTO):* 2-3 ore.

### 5.3 Disastro Regionale (Perdita del Datacenter Principale)
*Descrizione:* L'intera regione del provider cloud non è raggiungibile (es. incendio o calamità naturale).
*Azione:* Avvio dell'infrastruttura (tramite Infrastructure-as-Code, es. Terraform) in una regione cloud geograficamente distante. Ripristino dei dati dall'ultimo backup disponibile nella regione di disaster recovery. Modifica del DNS globale.
*Tempo stimato (RTO):* 3-4 ore.

## 6. COMUNICAZIONE E GESTIONE INCIDENTI

In caso di attivazione del piano di Disaster Recovery, la procedura di comunicazione prevede:
1. **Identificazione:** Entro 15 minuti dal rilevamento dell'anomalia.
2. **Prima notifica:** Entro 1 ora all'amministratore/referente del Comando PL tramite email/PEC, specificando la natura del problema e il tempo stimato di ripristino.
3. **Aggiornamenti continui:** Ogni ora durante le fasi di ripristino.
4. **Data Breach:** Se l'incidente comporta una violazione dei dati personali, il DPO (Data Protection Officer) attiverà le procedure di notifica al Garante della Privacy entro 72 ore (Art. 33 GDPR).
5. **Report Post-Incidente (RCA):** Entro 5 giorni lavorativi dalla risoluzione, verrà inviato un report dettagliato sulle cause e le misure correttive adottate.

## 7. TEST E AGGIORNAMENTI

Il presente piano non è un documento statico. L'efficacia delle procedure viene garantita tramite:
- **Test di ripristino periodici:** Almeno una volta ogni 6 mesi viene simulato uno scenario di disastro per verificare le tempistiche di RTO e RPO. I risultati vengono verbalizzati.
- **Revisione del piano:** Annuale o in concomitanza con importanti aggiornamenti infrastrutturali.

---
*Documento valido ai fini della partecipazione a bandi di gara e MEPA.*
