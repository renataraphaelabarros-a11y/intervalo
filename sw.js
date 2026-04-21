// Service Worker - Controle de Intervalos
const CACHE = 'intervalos-v1';
const FILES = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// Instala e faz cache dos arquivos
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Serve do cache quando offline
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Recebe mensagens da página para agendar notificações
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    scheduleAll(e.data.events);
  }
  if (e.data && e.data.type === 'CLEAR_NOTIFICATIONS') {
    clearAll();
  }
});

// Guarda os timeouts agendados
const timers = [];

function clearAll() {
  timers.forEach(t => clearTimeout(t));
  timers.length = 0;
}

function scheduleAll(events) {
  clearAll();
  const now = Date.now();
  events.forEach(ev => {
    const delay = ev.fireAt - now;
    if (delay < 0) return; // já passou
    const t = setTimeout(() => {
      self.registration.showNotification(ev.title, {
        body: ev.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: ev.tag,
        renotify: true,
        requireInteraction: true,
        data: { url: '/' }
      });
    }, delay);
    timers.push(t);
  });
}

// Clique na notificação → abre o app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});
