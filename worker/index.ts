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


// 3. Notifiche Push (Enterprise Sentinel)
self.addEventListener('push', (event: PushEvent) => {
  try {
    const data = event.data ? event.data.json() : { title: 'Notifica Sentinel', body: 'Nuovo aggiornamento disponibile dal Comando.' };
    
    // Pattern vibrazione SOS: Lunghi impulsi ripetuti
    const sosVibration = [500, 100, 500, 100, 500, 100, 500];
    const defaultVibration = [200, 100, 200];
    const isSos = data.title?.includes('SOS') || data.title?.includes('EMERGENZA') || data.type === 'ALERT';

    // Propaga via messaggio ai tab aperti per forzare lo sblocco sonoro Web Audio
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'PLAY_ALARM', isSos }));
      })
    );

    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/badge-icon.png',
        tag: isSos ? 'sos-alarm' : 'default-alert',
        renotify: isSos,
        requireInteraction: isSos,
        silent: false, // Forza l'overload sonoro del sistema operativo
        vibrate: isSos ? sosVibration : defaultVibration,
        data: {
          url: data.url || '/'
        },
        actions: [
          { action: 'open', title: isSos ? '🚨 RISPONDI ORA' : 'Vedi Dettagli' }
        ]
      } as NotificationOptions)
    );
  } catch (e) {
    console.error('[PWA-PUSH] Errore parsing push:', e);
  }
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Se c'è già una finestra aperta, facciamo focus
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Altrimenti ne apriamo una nuova
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('[SENTINEL-PWA] Service Worker Custom Inizializzato Correttamente.');
