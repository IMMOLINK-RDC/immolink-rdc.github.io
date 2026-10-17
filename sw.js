/* Service worker de Ma Caisse : fonctionne sans connexion.
   Change VERSION à chaque mise à jour de l'app pour forcer le rafraîchissement. */
var VERSION = 'ma-caisse-v1';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  /* Pages : on sert la version en cache, on met à jour en arrière-plan */
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(function (cached) {
        var net = fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put('./index.html', copy); });
          return res;
        }).catch(function () { return cached; });
        return cached || net;
      })
    );
    return;
  }

  /* Polices Google : mises en cache à la première visite */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
          return res;
        }).catch(function () { return hit; });
      })
    );
    return;
  }

  /* Le reste de l'app : cache d'abord */
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
          return res;
        });
      })
    );
  }
});
