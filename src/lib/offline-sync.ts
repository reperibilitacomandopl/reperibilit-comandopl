import { openDB } from 'idb';

const DB_NAME = 'caserma-offline-db';
const STORE_NAME = 'pending-requests';
const CACHE_STORE = 'cached-data';

// Inizializza il database asincrono direttamente a bordo del dispositivo mobile
export async function initDB() {
  return openDB(DB_NAME, 2, { // Incrementiamo la versione per lo schema
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
         db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
         db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
      console.log(`[PWA-DB] Upgrade Completo: v${oldVersion} -> v2`);
    },
  });
}

// --- GESTIONE CACHE DATI (Lettura Offline) ---

export async function cacheDataset(key: string, data: any) {
  try {
    const db = await initDB();
    await db.put(CACHE_STORE, {
      key,
      data,
      updatedAt: new Date().toISOString()
    });
    console.log(`[PWA-CACHE] Dataset '${key}' archiviato localmente.`);
  } catch (error) {
    console.warn('[PWA-CACHE] Fallimento salvataggio cache:', error);
  }
}

export async function getCachedDataset(key: string) {
  try {
    const db = await initDB();
    const entry = await db.get(CACHE_STORE, key);
    return entry ? entry.data : null;
  } catch (error) {
    console.error('[PWA-CACHE] Errore recupero cache:', error);
    return null;
  }
}

// --- GESTIONE RICHIESTE PENDENTI (Scrittura Offline) ---

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
    
    // Proviamo a triggerare un sync automatico se possibile
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sentinel-sync-queue');
    }
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
