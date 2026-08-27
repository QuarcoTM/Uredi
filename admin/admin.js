// Admin demo actions
document.querySelectorAll('[data-demo-action]').forEach(b=>b.addEventListener('click',()=>{
  const row=b.closest('tr');
  if(row){row.style.opacity='.45';setTimeout(()=>row.style.opacity='1',400)}
  alert('Демо действие: '+b.dataset.demoAction)
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
