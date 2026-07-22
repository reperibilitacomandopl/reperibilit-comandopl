# Connessione al Server Oracle Cloud (Produzione)

Questa guida spiega come connettersi al server Oracle Cloud e gestire i container dell'applicazione.

## 1. Dettagli di Connessione

- **Host/Dominio:** `gestionepolizialocale.it`
- **Utente SSH:** `ubuntu`
- **Chiave Privata SSH:** `backup_credenziali/id_rsa`
- **Sistema Operativo:** Ubuntu LTS (aarch64 - Oracle Cloud Infrastructure)

---

## 2. Comando di Connessione SSH

### Da Windows (PowerShell)
Se ti trovi nella cartella principale del progetto (`c:\Users\dibenedettom\Desktop\portale-caserma`), esegui:
```powershell
ssh -i .\backup_credenziali\id_rsa ubuntu@gestionepolizialocale.it
```

### Da Windows (Prompt dei Comandi - cmd)
```cmd
ssh -i backup_credenziali\id_rsa ubuntu@gestionepolizialocale.it
```

### Da macOS / Linux / Git Bash
```bash
ssh -i backup_credenziali/id_rsa ubuntu@gestionepolizialocale.it
```

---

## 3. Gestione dei Servizi sul Server

Una volta connesso al server, puoi controllare lo stato dei container Docker:

```bash
# Visualizzare i container attivi
sudo docker ps

# Visualizzare i log dell'applicazione Next.js
sudo docker logs -f app-portale-caserma-1

# Riavviare l'applicazione in caso di necessità
cd ~/app
sudo docker compose restart portale-caserma
```

---

## 4. Struttura dei Container sul Server

- `app-portale-caserma-1` (Next.js App, esposta localmente sulla porta `3000`, protetta da Nginx che gestisce SSL/TLS)
- `app-db-1` (Database PostgreSQL 15, esposto localmente sulla porta `5432`)

---

## 5. Configurazione delle API Oracle Cloud (OCI)

Per l'integrazione con i servizi di Oracle Cloud Infrastructure (OCI), sono presenti le credenziali API nella cartella `backup_credenziali/`:
- **File di configurazione:** `backup_credenziali/config`
- **Chiave API PEM:** `backup_credenziali/oci_api_key.pem`
