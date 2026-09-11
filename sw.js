const CACHE='tehnika-v2.58';
const CORE=[
  './index.html',
  './profile-promotions.html',
  './assets/css/styles-v258.css',
  './assets/js/app-v258.js',
  './assets/js/supabase-v258.js',
  './assets/js/monetization-v252.js',
  './assets/js/category-page.js',
  './assets/img/logo.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(CORE))
      .catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))
    )
  );
  self.clients.claim();
});

const cachePut=async(request,response)=>{
  if(!response || !response.ok)return;
  try{
    const cache=await caches.open(CACHE);
    await cache.put(request,response.clone());
  }catch(e){}
};

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);
  const sameOrigin=url.origin===self.location.origin;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request,{cache:'no-store'});
        await cachePut(request,response);
        return response;
      }catch(e){
        const cached=
          await caches.match(request,{ignoreSearch:true}) ||
          await caches.match('./index.html');
        if(cached)return cached;
        return new Response(
          '<!doctype html><meta charset="utf-8"><title>Няма връзка</title><p>Няма връзка с мрежата. Опитай отново.</p>',
          {status:503,headers:{'Content-Type':'text/html; charset=utf-8'}}
        );
      }
    })());
    return;
  }

  // Same-origin CSS/JS/images: cache first, refresh in background.
  // They NEVER fall back to an HTML page.
  if(sameOrigin){
    event.respondWith((async()=>{
      const cached=await caches.match(request,{ignoreSearch:false});

      const networkPromise=fetch(request,{cache:'no-store'})
        .then(async response=>{
          await cachePut(request,response);
          return response;
        })
        .catch(()=>null);

      if(cached){
        event.waitUntil(networkPromise.then(()=>{}));
        return cached;
      }

      const network=await networkPromise;
      if(network)return network;

      return new Response('',{
        status:503,
        statusText:'Asset unavailable'
      });
    })());
    return;
  }

  event.respondWith(fetch(request));
});

self.addEventListener('push',event=>{
  let data={title:'Ново известие',body:'Има нова активност в профила ти.',url:'./notifications.html'};
  try{
    const incoming=event.data?.json();
    if(incoming)data={...data,...incoming};
  }catch(e){
    if(event.data)data.body=event.data.text();
  }
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,
    icon:'./assets/img/pwa-192.png',
    badge:'./assets/img/pwa-192.png',
    data:{url:data.url}
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data?.url||'./notifications.html';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){
      if('focus' in c){
        c.navigate(url);
        return c.focus();
      }
    }
    return clients.openWindow(url);
  }));
});
