# Checklist Modulo Sinistri + Eventi Speciali

## SINISTRI - Capitolato UNI 11472

### Schema Database
- [x] AccidentReport — campi estesi (legalFramework, penalArticles, secondOfficerId, supervisorId, receivedAt/arrivedAt/closedAt, istatCode, notes, locationNotes, dynamicDiagramUrl)
- [x] AccidentVehicle — campi estesi (brand, model, color, owner*, insuranceExpiry/Valid, mitDataFetchedAt, towing*, vehicleNumber, position, damageZones)
- [x] AccidentPerson — campi estesi (birthDate/Place, nationality, address, license*, injuryDescription, hospitalSentTo, transportedBy, alcoholTest*, drugTest*, refused689, notified689At)
- [x] AccidentDeclaration — NUOVO modello (SPONTANEA/SU_INVITO/S.I.T./RIFIUTO)
- [x] AccidentSurvey — NUOVO modello (rilievi tecnici, misure metriche, segnaletica)
- [x] AccidentExternalUnit — NUOVO modello (VVF, 118, PS, CC, GDF, ANAS)
- [x] AccidentEmailLog — NUOVO modello (log invio PEC/email)
- [ ] MitCache — modello cache lookup targa MIT/DTT (richiede convenzione esterna)

### API Routes
- [x] CRUD sinistri (POST/GET/PUT/DELETE)
- [x] State machine (BOZZA → IN_COMPILAZIONE → REVISIONATO → CHIUSO / ANNULLATO)
- [x] POST/GET /declarations — dichiarazioni S.I.T.
- [x] POST/GET /survey — rilievi tecnici
- [x] POST/GET /external-units — enti esterni
- [x] POST /send-email — invio email/PEC
- [x] GET .../export/istat — export CSV ISTAT (agente + admin)
- [x] PUT .../vehicles + PUT .../people — modifica veicoli/persone
- [x] POST .../photos — upload foto forensi
- [ ] POST .../vehicles/:id/fetch-mit — lookup MIT/DTT
- [ ] GET .../export/istat — export XML ISTAT

### UI Sinistro (Stepper 10 tab)
- [x] Tab 1. Info — dati generali, stato, riepilogo requisiti UNI
- [x] Tab 2. Sicurezza — checklist + firma
- [x] Tab 3. Tracce — catalogazione reperti
- [x] Tab 4. Foto — upload forense con SHA-256
- [x] Tab 5. Veicoli — CRUD + modifica + download scheda
- [x] Tab 6. Persone — CRUD + modifica + download scheda
- [x] Tab 7. Dichiarazioni — S.I.T. / spontanee / rifiuto
- [x] Tab 8. Rilievi — misure metriche, segnaletica, danni
- [x] Tab 9. Enti Esterni — VVF/118/PS/CC...
- [x] Tab 10. Relazione — editor + auto-generazione

### PDF / DOCX
- [x] PDF Sinistro completo (12 sezioni da capitolato)
- [x] PDF Scheda Persona singola
- [x] PDF Scheda Veicolo singola
- [x] DOCX Sinistro completo (Word editabile)
- [x] DOCX Dichiarazioni persona
- [x] DOCX Relazione di Servizio
- [x] DOCX Verbale Violazione
- [ ] Firma digitale PDF/A con ghostscript
- [ ] PDF con QR code verifica

### Navigazione
- [x] Home / Back nella lista sinistri agente
- [x] Home / Back nel dettaglio sinistro
- [x] Home in admin infortunistica

### Altro
- [x] Foto: compressione canvas JPEG prima upload
- [x] Foto: edit veicoli e persone con modale riutilizzabile
- [x] Fascicolo separato (flag + invio email)
- [x] Export ISTAT CSV (admin + agente)
- [x] Validazioni Zod complete per tutti i modelli
- [ ] Integrazione MIT/DTT lookup targa
- [ ] Planimetria SVG editor (Fabric.js/Konva.js)
- [ ] Assistenza AI redazione dinamica (Claude API)
- [ ] Invio PEC automatizzato (solo SMTP base implementato)
- [ ] Score completezza UNI 11472 in UI

---

## EVENTI SPECIALI - ODS Personalizzato

### Gestione Eventi
- [x] CRUD eventi (nome, date, descrizione, ordinanza, note ODS)
- [x] Lista eventi con card
- [x] Eliminazione evento

### Drag & Drop Board
- [x] Sidebar agenti disponibili (da API users)
- [x] Board Mattina (M) con zone di drop
- [x] Board Pomeriggio (P) con zone di drop
- [x] Drag agenti da sidebar a board
- [x] Drag agenti tra zone
- [x] Drag agenti tra Mattina e Pomeriggio
- [x] Rimozione agente (trascina su sidebar o tasto X)

### Zone Geografiche
- [x] Creazione zone (input nome)
- [x] Eliminazione zone
- [x] Rinominazione zone
- [x] Assegnazione agenti a zone via drag & drop
- [x] Zone visualizzate come sezioni nella board

### Pattuglie
- [x] Checkbox selezione su ogni card agente
- [x] Multi-selezione agenti
- [x] Tasto "Crea Pattuglia"
- [x] Evidenziazione visiva pattuglie (bordo blu)
- [ ] Assegnazione manuale compagno con dropdown

### Veicoli
- [x] Dropdown veicoli da parco auto (/api/admin/vehicles)
- [x] Assegnazione veicolo per agente nel modale edit
- [x] Visualizzazione veicolo nella card agente
- [ ] Sincronizzazione veicolo tra membri pattuglia

### Import da Pianificazione
- [x] Pulsante "Importa da Pianificazione"
- [x] Carica shift per le date dell'evento
- [x] Classifica M/P dal tipo turno
- [ ] Mostra agenti assenti/indisponibili
- [ ] Importa fasce orarie reali dai turni
- [ ] Filtra per data specifica (non solo range)

### Modifica Assegnazione
- [x] Modale edit con tipo servizio, zona, veicolo
- [x] Orario personalizzabile
- [x] Ore ordinarie / straordinarie / progetto
- [x] Modifica multipla (più assegnazioni stesso agente)

### PDF ODS Evento
- [x] Generazione PDF evento speciale
- [x] Intestazione istituzionale
- [x] Tabella personale con colonne: N., Nome, Servizio, Zona, Orario, Veicolo, Firma
- [x] RowSpan per operatori con più assegnazioni
- [x] Note ODS stampate
- [x] Timbro digitale
- [ ] Allineamento colonne corretto (in corso)
- [ ] QR code verifica

---

## COSE DA FARE (priorità)

### Urgente
- [ ] **Fix allineamento colonne PDF evento** — la zona finisce nella colonna veicoli
- [ ] **PDF ODS evento: colonne allineate correttamente**

### Importante
- [ ] Import da pianificazione: mostrare agenti assenti
- [ ] Score completezza UNI 11472 nella UI sinistri
- [ ] Sincronizzazione veicolo tra membri pattuglia

### Futuro
- [ ] MIT/DTT lookup targa
- [ ] Planimetria SVG editor
- [ ] AI relazione discorsiva
- [ ] Firma digitale PDF/A
