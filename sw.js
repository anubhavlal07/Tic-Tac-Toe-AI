const CACHE_NAME = 'tictactoe-v5';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './index.js',
    './game.js',
    './features/mode-ai.js',
    './features/mode-local.js',
    './features/mode-local.css',
    './features/mode-online.js',
    './features/mode-online.css',
    './features/history.js',
    './features/history.css',
    './features/coach.js',
    './features/coach.css',
    './features/timer.js',
    './features/timer.css',
    './features/sound.js',
    './features/sound.css',
    './features/winline.js',
    './features/winline.css',
    './features/replay.js',
    './features/replay.css',
    './trap_ai.js',
    './icon-192.png',
    './icon-512.png',
    './manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event - serve from cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
            )
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
