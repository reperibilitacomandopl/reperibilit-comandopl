/// <reference lib="WebWorker" />

declare const self: ServiceWorkerGlobalScope;

import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

// 1. Background Sync per SOS, Timbrature e ODS
// Questo plugin mette in coda le richieste fallite e le riprova automaticamente quando torna il segnale
const bgSyncPlugin = new BackgroundSyncPlugin('sentinel-sync-queue', {
  maxRetentionTime: 24 * 60 // Riprova per 24 ore
});

// Registriamo le rotte critiche per il Background Sync
const syncRoutes = [
  '/api/admin/alert-emergency',
  '/api/agent/clock-in',
  '/api/agent/ods-update'
];

syncRoutes.forEach(path => {
  registerRoute(
    ({ url }) => url.pathname === path,
    new NetworkOnly({
      plugins: [bgSyncPlugin]
    }),
    'POST'
  );
});

// 2. Runtime Caching per Turni e ODS (Lettura)
// Strategia: Mostra i dati in cache (se presenti) e contestualmente scarica quelli nuovi
registerRoute(
  ({ url }) => url.pathname.includes('/api/agent/shifts') || url.pathname.includes('/api/agent/ods'),
  new StaleWhileRevalidate({
    cacheName: 'sentinel-data-cache',
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          // Filtriamo per assicurarci di non mettere in cache errori
          if (response && response.status === 200) {
            return response;
          }
          return null;
        }
      }
    ]
  })
);

// Listener per messaggi personalizzati (opzionale)
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SENTINEL-PWA] Service Worker Custom Inizializzato Correttamente.');
