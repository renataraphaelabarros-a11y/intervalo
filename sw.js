// Service Worker - Controle de Intervalos
const CACHE = 'intervalos-v3';
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

// ── Eventos agendados (guardados no próprio SW) ──────────────────────
let pendingEvents = [];

self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    pendingEvents = (e.data.events || []).filter(ev => ev.fireAt > Date.now());
    // Agenda verificação periódica via sync se disponível, senão usa keepalive
    scheduleCheck();
  }

  if (e.data.type === 'CLEAR_NOTIFICATIONS') {
    pendingEvents = [];
  }

  if (e.data.type === 'PING') {
    // Página mandou ping — aproveita pra verificar eventos
    checkAndFire();
  }
});

// Verifica e dispara eventos cujo horário já chegou
function checkAndFire() {
  const now = Date.now();
  const remaining = [];
  for (const ev of pendingEvents) {
    if (ev.fireAt <= now) {
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
    } else {
      remaining.push(ev);
    }
  }
  pendingEvents = remaining;
}

function scheduleCheck() {
  // Tenta usar Background Sync para acordar o SW
  if ('sync' in self.registration) {
    self.registration.sync.register('check-intervals').catch(() => {});
  }
}

// Background Sync — acorda o SW periodicamente
self.addEventListener('sync', e => {
  if (e.tag === 'check-intervals') {
    e.waitUntil(checkAndFire());
  }
});

// Push vazio — também acorda o SW (se configurado)
self.addEventListener('push', e => {
  e.waitUntil(checkAndFire());
});

// Clique na notificação → abre/foca o app
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
