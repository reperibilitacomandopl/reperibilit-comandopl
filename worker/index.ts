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
    
    const isSos = data.title?.includes('SOS') || data.title?.includes('EMERGENZA') || data.type === 'ALERT';

    // Opzioni minime: su iOS Safari/PWA azioni e vibrate possono far fallire showNotification
    const options: NotificationOptions = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/', isSos },
      tag: isSos ? 'sentinel-sos' : 'sentinel-push',
    };

    // Su iOS il Service Worker può morire improvvisamente. Uniamo le promesse per assicurarci
    // che sia la propagazione locale (Audio) sia la notifica visibile vengano elaborate
    event.waitUntil(
      Promise.all([
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
          clients.forEach(c => c.postMessage({ type: 'PLAY_ALARM', isSos }));
        }),
        self.registration.showNotification(data.title || 'Promemoria', options)
      ])
    );
  } catch (e) {
    console.error('[PWA-PUSH] Errore parsing push:', e);
  }
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  const action = event.action;
  const notification = event.notification;
  notification.close();
  
  const baseUrl = notification.data?.url;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          if (action === 'CLOCK_IN' || action === 'CLOCK_OUT') {
            const separator = client.url.includes('?') ? '&' : '?';
            client.navigate(`${client.url}${separator}action=${action}&fromPush=true`);
          } else if (baseUrl && baseUrl !== '/') {
            client.navigate(baseUrl);
          }
          return client.focus();
        }
      }
      
      if (self.clients.openWindow) {
        let targetUrl = baseUrl || '/';
        if (action === 'CLOCK_IN' || action === 'CLOCK_OUT') {
          const separator = targetUrl.includes('?') ? '&' : '?';
          targetUrl = `${targetUrl}${separator}action=${action}&fromPush=true`;
        }
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

console.log('[SENTINEL-PWA] Service Worker Custom Inizializzato Correttamente.');
