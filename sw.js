/* Service worker : met l'application en cache pour l'utiliser hors connexion. */
const CACHE = 'campus-plus-v5';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css', 'assets/icon.svg',
  'js/config.js', 'js/icons.js', 'js/ui.js', 'js/data.js', 'js/api.js', 'js/store.js', 'js/app.js',
  'js/pages/auth.js', 'js/pages/academic.js', 'js/pages/documents.js', 'js/pages/news.js',
  'js/pages/agenda.js', 'js/pages/services.js', 'js/pages/map.js', 'js/pages/identity.js',
  'js/pages/profile.js', 'js/pages/notifications.js', 'js/pages/admin.js', 'js/pages/classes.js',
  'js/pages/filiere.js', 'js/pages/personnel.js', 'js/pages/home.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (pour avoir les mises à jour), cache en secours hors connexion.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
