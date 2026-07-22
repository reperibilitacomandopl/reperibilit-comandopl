# Guida di Deploy con GitHub

Questa guida descrive come utilizzare GitHub per sincronizzare il codice locale con il repository remoto e come avviare il deploy sul server di produzione Oracle.

## 1. Dettagli del Repository GitHub

- **Account/Organizzazione:** `reperibilitacomandopl`
- **Nome Repository:** `reperibilit-comandopl`
- **URL Repository (HTTPS):** `https://github.com/reperibilitacomandopl/reperibilit-comandopl.git`
- **Branch Principali:**
  - `master` (utilizzato per la produzione)
  - `develop` (per lo sviluppo e i test)

---

## 2. Flusso di Lavoro (Workflow) per le Modifiche

Ogni volta che effettui una modifica al codice e desideri portarla in produzione, segui questi passaggi dal tuo terminale locale:

### Passo A: Verifica che il build passi in locale
Prima di fare qualsiasi commit, assicurati che l'applicazione Next.js compili correttamente senza errori:
```bash
npm run build
```

### Passo B: Aggiungi e committa le modifiche
```bash
# Controlla lo stato dei file modificati
git status

# Aggiungi le modifiche
git add .

# Esegui il commit con un messaggio descrittivo
git commit -m "Descrizione delle modifiche apportate"
```

### Passo C: Invia le modifiche su GitHub
Invia i commit sul branch `master` di GitHub:
```bash
git push origin master
```

---

## 3. Deploy sul Server Oracle Cloud

Dopo aver inviato il codice aggiornato su GitHub, connettiti al server Oracle tramite SSH per scaricare le modifiche ed aggiornare l'applicazione Docker.

1. **Connettiti al server SSH:**
   ```powershell
   ssh -i .\backup_credenziali\id_rsa ubuntu@gestionepolizialocale.it
   ```

2. **Aggiorna il codice sul server ed avvia il build del container:**
   ```bash
   # Spostati nella cartella del progetto
   cd ~/app

   # Scarica l'ultimo codice da GitHub
   git pull origin master

   # Ricostruisci ed avvia il container in background
   sudo docker compose up -d --build portale-caserma
   ```
