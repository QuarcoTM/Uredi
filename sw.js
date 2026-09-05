const CACHE='tehnika-v2.5';
const CORE=['./index.html','./assets/css/styles.css','./assets/js/app.js','./assets/img/logo.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

// Network first so a refresh never gets trapped on an old version.
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith(
    fetch(event.request).then(resp=>{
      const copy=resp.clone();
      caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});
      return resp;
    }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html')))
  );
});

self.addEventListener('push',event=>{
  let data={title:'Ново известие',body:'Има нова активност в профила ти.',url:'./notifications.html'};
  try{
    const incoming=event.data?.json();
    if(incoming) data={...data,...incoming};
  }catch(e){
    if(event.data) data.body=event.data.text();
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
      if('focus' in c){ c.navigate(url); return c.focus(); }
    }
    return clients.openWindow(url);
  }));
});
