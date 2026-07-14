if (!["swipedex.app", "www.swipedex.app"].includes(self.location.hostname)) {
    self.registration.unregister().then(() => {
        console.log("Unauthorized domain. Service worker disabled.");
    });
}
const allowedHosts = [
    "swipedex.app",
    "www.swipedex.app"
];
const isMobileOrTablet =
    ("ontouchstart" in window) ||
    (navigator.maxTouchPoints > 0);
if (!allowedHosts.includes(location.hostname) || !isMobileOrTablet) {
    return;
}
const CACHE_NAME = "swipedex-v1";
const PRECACHE_ASSETS = [
    "/",
    "/index.html",
];
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;
    const request = event.request;
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, copy);
                        });
                    }
                    return response;
                })
                .catch(async () => {
                    const cache = await caches.open(CACHE_NAME);
                    const matched = await cache.match(request, { ignoreSearch: true });
                    return matched || await cache.match("/");
                })
        );
        return;
    }
    event.respondWith(
        caches.match(request, { ignoreSearch: true })
            .then(cached => {
                if (cached) {
                    return cached;
                }
                return fetch(request).then(response => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, copy);
                        });
                    }
                    return response;
                });
            })
    );
});
