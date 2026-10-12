const BUILD_ID='__BUILD_ID__';
const CACHE=`nami-learning-studio-${BUILD_ID}`;
const SHELL='./index.html';
const CORE=[SHELL,'./manifest.webmanifest','./icons/matrix-nami.svg?v=3','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png','./resources/starwars-font.css?v=2','./starwars-music-browser.js','./learning-studio-v3.js','./resources/sw-video/rotation-v1.json'];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nami-learning-studio-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(url.pathname.includes('/resources/sw-audio/')||url.pathname.includes('/resources/sw-video/'))return;
  if(event.request.headers.has('range'))return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(SHELL,copy));return response;}).catch(()=>caches.match(SHELL)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response?.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));return response;})));
});
