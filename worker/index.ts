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
  '/api/admin/clock-in',
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

// VERSION: 1.0.5 - Simplest format for iOS
const SW_VERSION = '1.0.5';

    // Notifica ultra-semplice per massima compatibilità iOS
    const options: any = {
      body: data.body,
      icon: '/icon-192.png',
      data: { url: data.url || '/' },
      actions: [
        { action: 'CLOCK_OUT', title: '⏹ Timbra Uscita' },
        { action: 'open', title: 'Apri App' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Promemoria', options)
    );
  } catch (e) {
    console.error('[PWA-PUSH] Errore parsing push:', e);
  }
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  const action = event.action;
  const notification = event.notification;
  notification.close();
  
  if (action === 'CLOCK_IN' || action === 'CLOCK_OUT') {
    const type = action === 'CLOCK_IN' ? 'IN' : 'OUT';
    
    event.waitUntil(
      // Eseguiamo la timbratura in background
      fetch('/api/admin/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type, 
          lat: null, 
          lng: null, 
          accuracy: null, 
          isManual: true // Segnaliamo che è da notifica
        })
      }).then(async (res) => {
        if (res.ok) {
          // Mostra una notifica di conferma del successo
          return self.registration.showNotification(
            type === 'IN' ? '✅ Entrata Confermata' : '🏁 Uscita Confermata',
            {
              body: `Timbratura ${type} eseguita correttamente in background.`,
              icon: '/icon-192.png',
              tag: 'clock-confirm'
            }
          );
        } else {
          // Se fallisce (es. sessione scaduta), apri l'app
          return self.clients.openWindow(notification.data?.url || '/');
        }
      }).catch(() => {
        return self.clients.openWindow(notification.data?.url || '/');
      })
    );
    return;
  }

  const urlToOpen = notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('[SENTINEL-PWA] Service Worker Custom Inizializzato Correttamente.');
