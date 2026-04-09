import { openDB } from 'idb';

const DB_NAME = 'caserma-offline-db';
const STORE_NAME = 'pending-requests';

// Inizializza il database asincrono direttamente a bordo del dispositivo mobile
export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
         db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

// Parcheggia ("Store") la richiesta fallita se non c'è internet
export async function storeOfflineRequest(url: string, method: string, body: any) {
  try {
    const db = await initDB();
    await db.add(STORE_NAME, {
      url,
      method,
      body,
      timestamp: new Date().toISOString(),
    });
    console.log('[PWA] ⚠️ Assenza connessione: Operazione archiviata in memoria Locale.');
  } catch (error) {
    console.error('[PWA] Fallimento apertura DB Locale:', error);
  }
}

// Invia in massa ("Forward") le richieste accumulate quando torna internet
export async function syncOfflineRequests() {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const requests = await store.getAll();

    if (requests.length === 0) return;

    console.log(`[PWA] 🟢 Connessione Rilevata! Avvio Sincronizzazione Elettronica di ${requests.length} record...`);

    for (const req of requests) {
      try {
        const response = await fetch(req.url, {
          method: req.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        });
        
        if (response.ok) {
           await store.delete(req.id);
           console.log(`[PWA] Record #${req.id} consegnato in Centrale.`);
        }
      } catch (e) {
        console.warn(`[PWA] Tentativo di recapito Record #${req.id} fallito. Ritenterò.`);
      }
    }
  } catch (err) {
    console.error('[PWA] Errore critico nel ciclo Forward:', err);
  }
}
