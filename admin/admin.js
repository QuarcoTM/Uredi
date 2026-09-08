
function adminToastV230(message){
  let host=document.querySelector('.admin-toast-host');
  if(!host){
    host=document.createElement('div');
    host.className='admin-toast-host';
    host.setAttribute('aria-live','polite');
    document.body.appendChild(host);
  }
  const toast=document.createElement('div');
  toast.className='admin-toast';
  toast.textContent=String(message||'Готово.');
  host.appendChild(toast);
  setTimeout(()=>toast.remove(),2600);
}

// Admin demo actions
document.querySelectorAll('[data-demo-action]').forEach(b=>b.addEventListener('click',()=>{
  const row=b.closest('tr');
  if(row){row.style.opacity='.45';setTimeout(()=>row.style.opacity='1',400)}
  adminToastV230('Демо действие: '+b.dataset.demoAction)
}));

document.querySelectorAll('[data-save]').forEach(b=>b.addEventListener('click',()=>{
  const original=b.textContent;
  b.textContent='Запазено';
  setTimeout(()=>b.textContent=original||'Запази',1200)
}));

// v1.8: turn wide admin tables into readable mobile cards without changing every HTML page.
document.querySelectorAll('table').forEach(table=>{
  const labels=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());
  table.querySelectorAll('tbody tr').forEach(row=>{
    [...row.children].forEach((cell,i)=>{
      if(cell.tagName==='TD') cell.dataset.label=labels[i]||'';
    });
  });
});


// v1.9 mobile admin navigation drawer.
(function(){
  const topbar=document.querySelector('.topbar');
  const aside=document.querySelector('.aside');
  if(!topbar||!aside)return;
  if(!document.querySelector('.admin-menu-toggle')){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='admin-menu-toggle';
    btn.setAttribute('aria-label','Отвори админ менюто');
    btn.textContent='☰';
    topbar.insertBefore(btn,topbar.firstChild);

    const overlay=document.createElement('div');
    overlay.className='admin-nav-backdrop';
    document.body.appendChild(overlay);

    const close=()=>document.body.classList.remove('admin-menu-open');
    btn.addEventListener('click',()=>document.body.classList.toggle('admin-menu-open'));
    overlay.addEventListener('click',close);
    aside.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }
})();


// v2.0 preserve admin position on refresh/back-forward.
(function(){
  if(!('sessionStorage' in window))return;
  const key='market:admin-scroll:'+location.pathname+location.search;
  const save=()=>sessionStorage.setItem(key,JSON.stringify({x:scrollX||0,y:scrollY||0}));
  addEventListener('scroll',save,{passive:true});
  addEventListener('pagehide',save);
  const nav=performance.getEntriesByType?.('navigation')?.[0];
  if(nav && (nav.type==='reload'||nav.type==='back_forward')){
    try{
      const p=JSON.parse(sessionStorage.getItem(key)||'null');
      if(p){history.scrollRestoration='manual';requestAnimationFrame(()=>requestAnimationFrame(()=>scrollTo(p.x||0,p.y||0)))}
    }catch(e){}
  }
})();

// v2.2 FREE BETA safeguard.
(function(){
  const t=document.querySelector('[data-paid-services-toggle]');
  if(!t)return;
  t.checked=false;
  t.addEventListener('change',()=>{
    t.checked=false;
    adminToastV230('Платените услуги остават изключени в FREE BETA.');
  });
})();


// v2.3: shared Admin navigation adds the sold archive without editing every HTML page.
(function(){
  const nav=document.querySelector('.sidebar nav');
  if(!nav || nav.querySelector('a[href="sold-archive.html"]')) return;
  const ads=nav.querySelector('a[href="ads.html"]');
  const a=document.createElement('a');
  a.href='sold-archive.html';
  a.textContent='Продадени';
  if((location.pathname.split('/').pop()||'')==='sold-archive.html') a.classList.add('active');
  if(ads) ads.insertAdjacentElement('afterend',a); else nav.appendChild(a);
})();


// v2.11 maintenance mode + backup checklist prototype
(function(){
  const toggle=document.querySelector('[data-maintenance-toggle]');
  const status=document.querySelector('[data-maintenance-status]');
  const draw=()=>{
    const on=localStorage.getItem('marketMaintenanceMode')==='1';
    if(toggle)toggle.checked=on;
    if(status){
      status.textContent=on?'Включен':'Изключен';
      status.className=on?'admin-status-on':'admin-status-off';
    }
  };
  toggle?.addEventListener('change',()=>{
    localStorage.setItem('marketMaintenanceMode',toggle.checked?'1':'0');
    draw();
  });
  draw();

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-backup-action]');
    if(!btn)return;
    const s=document.querySelector('[data-backup-status]');
    if(btn.dataset.backupAction==='snapshot'){
      localStorage.setItem('demoBackupSnapshotAt',String(Date.now()));
      if(s)s.textContent='Тестовият backup е отбелязан като създаден. Реалната операция ще се изпълнява от backend/Supabase.';
    }
    if(btn.dataset.backupAction==='restore-check'){
      localStorage.setItem('demoRestoreCheckAt',String(Date.now()));
      if(s)s.textContent='Restore checklist е маркиран за проверка. В production това трябва да е реален тест за възстановяване.';
    }
  });
})();


// v2.21 Admin Health: read local client-error buffer.
(function healthV221(){
  const list=document.querySelector('[data-health-error-list]');
  const count=document.querySelector('[data-health-error-count]');
  if(!list&&!count)return;
  const key='marketClientErrorsV221';
  const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return[]}};
  const render=()=>{
    const arr=read();
    if(count)count.textContent=String(arr.length);
    if(list){
      list.replaceChildren();
      if(!arr.length){
        const empty=document.createElement('div');
        empty.className='empty-admin-state';
        empty.textContent='Няма записани JavaScript грешки.';
        list.appendChild(empty);
      }else{
        arr.slice(0,20).forEach(x=>{
          const row=document.createElement('div');
          row.className='health-error-row';
          const code=document.createElement('code');
          code.textContent=String(x.message||'Грешка');
          const meta=document.createElement('small');
          meta.textContent=String(x.page||'')+' · '+String(x.time||'');
          row.append(code,meta);
          list.appendChild(row);
        });
      }
    }
  };
  document.querySelector('[data-health-clear-errors]')?.addEventListener('click',()=>{
    localStorage.removeItem(key);render();
  });
  render();
})();
