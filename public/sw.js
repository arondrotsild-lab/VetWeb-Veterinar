// Минимальный service worker: делает сайт устанавливаемым приложением.
// Ничего не кэширует — всегда показывается свежая версия платформы.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
