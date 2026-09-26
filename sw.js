const CACHE = 'romaji-v2-20260926-data-tools-2';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg', './enhancements.js'];

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
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('romaji-') && key !== CACHE).map(key => caches.delete(key))
  )));
});

async function enhancedPage(response){
  if(!response?.ok) return response;
  const html=await response.text();
  if(html.includes('src="enhancements.js"')) return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
  const output=html.replace('</body>','<script src="enhancements.js"></script>\n</body>');
  const headers=new Headers(response.headers);headers.set('content-type','text/html; charset=utf-8');
  return new Response(output,{status:response.status,statusText:response.statusText,headers});
}

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
        return enhancedPage(response);
      } catch {
        const cached=(await cache.match(new URL('./index.html', scope))) || (await cache.match(new URL('./', scope)));
        return enhancedPage(cached);
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