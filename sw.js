// Service Worker - Controle de Intervalos
const CACHE = 'intervalos-v2';
const FILES = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Timers de notificação
const timers = [];

function clearAll() {
  timers.forEach(t => clearTimeout(t));
  timers.length = 0;
}

self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    clearAll();
    const now = Date.now();
    (e.data.events || []).forEach(ev => {
      const delay = ev.fireAt - now;
      if (delay < 0) return;
      const t = setTimeout(() => {
        self.registration.showNotification(ev.title, {
          body: ev.body,
          icon: './icon-192.png',
          badge: './icon-192.png',
          vibrate: [300, 100, 300, 100, 300],
          tag: ev.tag,
          renotify: true,
          requireInteraction: true,
          data: { url: self.registration.scope }
        });
      }, delay);
      timers.push(t);
    });
  }
  if (e.data.type === 'CLEAR_NOTIFICATIONS') {
    clearAll();
  }
});

// Clique na notificação → foca ou abre o app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
