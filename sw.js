/* ============================================================
   Service Worker Campus+ IST — Mise à jour sécurisée avec rollback
   ============================================================ */

// ── Version & Changelog ──────────────────────────────────────
// ⚠️  Changer APP_VERSION à chaque déploiement !
const APP_VERSION  = '7';
const CACHE        = 'campus-plus-v' + APP_VERSION;
const PREV_CACHE   = 'campus-plus-v' + (Number(APP_VERSION) - 1);

// Ce texte sera montré à l'utilisateur lors de la mise à jour
const CHANGELOG = [
  '🗓️ Emplois du temps : l'admin et les chefs de département peuvent déposer les plannings',
  '🗺️ Plan interactif : la salle du cours est automatiquement surlignée et une notification est envoyée',
  '👑 Chef de classe : l'enseignant peut nommer un délégué qui peut envoyer des documents dans la salle virtuelle',
  '🖼️ Annonces : aperçu et redimensionnement automatique des images',
  '⚙️ Admin : gestion des programmes UE, des services du campus et de l'identité IST',
  '🧹 Base de données nettoyée : suppression des événements de test non réels',
];

const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css', 'assets/icon.svg',
  'js/config.js', 'js/icons.js', 'js/ui.js', 'js/data.js', 'js/api.js', 'js/store.js', 'js/app.js',
  'js/pages/auth.js', 'js/pages/academic.js', 'js/pages/documents.js', 'js/pages/news.js',
  'js/pages/agenda.js', 'js/pages/services.js', 'js/pages/map.js', 'js/pages/identity.js',
  'js/pages/profile.js', 'js/pages/notifications.js', 'js/pages/admin.js', 'js/pages/classes.js',
  'js/pages/filiere.js', 'js/pages/personnel.js', 'js/pages/home.js',
];

// ── Installation ─────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => {
        // Ne pas appeler skipWaiting() immédiatement :
        // on attend la confirmation de l'utilisateur (ou timeout)
        console.log('[SW] Nouvelle version installée, en attente d'activation.');
      })
      .catch((err) => {
        // Si le téléchargement échoue → on NE skip pas, l'ancienne version reste active
        console.error('[SW] Échec installation — rollback automatique :', err);
        // On ne resolve pas : le SW reste en waiting, l'ancien prend le contrôle
        return Promise.reject(err);
      })
  );
});

// ── Activation ───────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => {
        const toDelete = keys.filter((k) => k !== CACHE && k !== PREV_CACHE && k.startsWith('campus-plus-v'));
        return Promise.all(toDelete.map((k) => {
          console.log('[SW] Suppression ancien cache :', k);
          return caches.delete(k);
        }));
      })
      .then(() => self.clients.claim())
      .then(() => {
        // Diffuser le changelog à toutes les fenêtres ouvertes
        self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'APP_UPDATED',
              version: APP_VERSION,
              changelog: CHANGELOG,
            });
          });
        });
      })
  );
});

// ── Fetch : réseau d'abord, cache en secours ─────────────────
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Message : déclencher le skipWaiting depuis l'app ─────────
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Notifications Push ────────────────────────────────────────
self.addEventListener('push', (e) => {
  let data = { title: 'Campus+ IST', body: 'Nouvelle alerte du campus.', url: './' };
  try {
    if (e.data) data = e.data.json();
  } catch (err) {
    if (e.data) data.body = e.data.text();
  }
  const options = {
    body: data.body,
    icon: 'assets/icon.svg',
    badge: 'assets/icon.svg',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'campus-ist-notif',
    renotify: true,
    data: { url: data.url || './' },
  };
  e.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const urlToOpen = (e.notification.data && e.notification.data.url) ? e.notification.data.url : './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client) client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
