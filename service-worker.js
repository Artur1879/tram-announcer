const CACHE_NAME = 'tram-announcer-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './routes.json',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Кеширование файлов');
                return cache.addAll(urlsToCache);
            })
    );
});

// Активация и очистка старых кешей
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Удаление старого кеша:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Возвращаем из кеша или делаем запрос в сеть
                return response || fetch(event.request).then((fetchResponse) => {
                    // Кешируем новые аудиофайлы
                    if (event.request.url.includes('/audio/')) {
                        const responseClone = fetchResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return fetchResponse;
                });
            })
            .catch(() => {
                // Офлайн-заглушка для HTML запросов
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./index.html');
                }
            })
    );
});
