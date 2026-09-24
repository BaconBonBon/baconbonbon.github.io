const CACHE = 'romaji-v2-20260924-header-fix-17';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const scope = new URL(self.registration.scope);
    await Promise.all(ASSETS.map(async asset => {
      const url = new URL(asset, scope);
      const response = await fetch(url, {cache: 'reload'});
      if (!response.ok) throw new Error('Unable to cache ' + url.pathname);
      await cache.put(url, response);
    }));
  })());
  // Existing clients explicitly accept the update before activation.
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('romaji-') && key !== CACHE).map(key => caches.delete(key))
  )));
  // Existing open editors keep their current controller until the user accepts the update.
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;

  const sameOrigin = url.origin === self.location.origin;
  const isRomanizer = url.hostname === 'cdn.jsdelivr.net' &&
    (/\/(kuroshiro|kuroshiro-analyzer-kuromoji|kuromoji)@/.test(url.pathname));
  if (!sameOrigin && !isRomanizer) return;

  const scope = new URL(self.registration.scope);
  if (sameOrigin && !ASSETS.some(asset => new URL(asset, scope).pathname === url.pathname)) return;

  const isPage = sameOrigin && (request.mode === 'navigate' ||
    url.pathname === scope.pathname ||
    url.pathname === new URL('./index.html', scope).pathname);

  if (isPage) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request, {cache: 'no-store'});
        if (response.ok) await cache.put(new URL('./index.html', scope), response.clone());
        return response;
      } catch {
        return (await cache.match(new URL('./index.html', scope))) ||
          (await cache.match(new URL('./', scope)));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
    return response;
  })());
});
