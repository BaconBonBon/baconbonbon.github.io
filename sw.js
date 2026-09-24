const CACHE = 'romaji-v2-20260924-compact-search-top-14';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  // Existing clients explicitly accept the update before activation.
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('romaji-') && key !== CACHE).map(key => caches.delete(key))
  )));
  // No claim: a first install must not reload a page with an open editor.
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  const isRomanizer=url.hostname==='cdn.jsdelivr.net'&&(/\/(kuroshiro|kuroshiro-analyzer-kuromoji|kuromoji)@/.test(url.pathname));
  if(url.origin!==self.location.origin&&!isRomanizer)return;
  const scope = new URL(self.registration.scope);
  if(url.origin===self.location.origin&&!ASSETS.some(asset => new URL(asset, scope).pathname === url.pathname))return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(request, {ignoreSearch: url.origin===self.location.origin});
    if (cached) return cached;
    const response=await fetch(request);if(response.ok||response.type==='opaque')cache.put(request,response.clone());return response;
  }));
});
