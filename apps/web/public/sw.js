/* Cache only public fallback/assets. Never queue account/payment/control requests. */
const CACHE='smartclamp-public-v1';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/pwa-icons/192','/pwa-icons/512']))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('smartclamp-public-') && key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET' || url.origin!==self.location.origin || request.headers.has('Authorization'))return;
  if(request.mode==='navigate'){event.respondWith(self.navigator.onLine===false?caches.match('/offline.html'):fetch(request,{cache:'no-store'}).catch(()=>caches.match('/offline.html')));return;}
  if(url.pathname.startsWith('/_next/static/') && /\.(js|css|woff2?)$/.test(url.pathname)){
    event.respondWith((async()=>{const cache=await caches.open(CACHE),prior=await cache.match(request);if(prior)return prior;
      const response=await fetch(request);if(response.ok && response.type==='basic'){await cache.put(request,response.clone());const keys=await cache.keys();if(keys.length>200)await cache.delete(keys.find(key=>new URL(key.url).pathname.startsWith('/_next/static/')));}return response;})());
  }
});
self.addEventListener('push',event=>{
  let id='account';try{const data=event.data?.json();if(/^[a-f0-9-]{36}$/.test(data?.id))id=data.id;}catch{}
  event.waitUntil(self.registration.showNotification('SmartClamp',{body:'You have an account update. Open SmartClamp to view it securely.',icon:'/pwa-icons/192',badge:'/pwa-icons/192',tag:'smartclamp-'+id}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{
  const target=new URL('/alerts',self.location.origin).href;
  for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))if(new URL(client.url).origin===self.location.origin){await client.navigate(target);await client.focus();return;}
  await self.clients.openWindow(target);
})());});
