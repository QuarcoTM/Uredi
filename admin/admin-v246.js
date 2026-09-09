
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


// v2.41: platform mode, prices/promotions/packages and manual bonus wallet.
(function monetizationAdminV241(){
  const M=window.MarketMonetization;if(!M)return;
  const toast=window.adminToastV230||function(m){alert(m)};
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dt=v=>{if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return '';const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())};
  const iso=v=>v?new Date(v).toISOString():null;

  function renderPlatform(){
    const p=M.getPlatform(),free=document.querySelector('[data-free-beta-toggle]'),paid=document.querySelector('[data-paid-services-toggle]'),mode=document.querySelector('[data-payment-mode]'),status=document.querySelector('[data-platform-mode]'),hint=document.querySelector('[data-paid-services-hint]'),live=document.querySelector('[data-live-payment-status]');
    if(free)free.checked=p.freeBeta;if(paid){paid.checked=p.paidServicesEnabled;paid.disabled=p.freeBeta||(p.paymentMode==='live'&&!p.livePaymentsReady)}if(mode)mode.value=p.paymentMode;
    if(status){status.textContent=p.freeBeta?'FREE BETA':p.paidServicesEnabled?(p.paymentMode==='test'?'ПЛАТЕНИ · TEST':'ПЛАТЕНИ · LIVE'):'ПЛАТЕНИ УСЛУГИ OFF';status.className=p.paidServicesEnabled?'admin-status-on':'admin-status-off'}
    if(hint)hint.textContent=p.freeBeta?'Първо изключи FREE BETA.':p.paidServicesEnabled?'Включени. Потребителите виждат цените и checkout.':'Изключени. Потребителите не могат да плащат.';
    if(live)live.value=p.livePaymentsReady?'Готови':'Не е свързан платежен оператор';
  }
  document.querySelector('[data-free-beta-toggle]')?.addEventListener('change',e=>{
    if(!e.target.checked&&!confirm('Изключване на FREE BETA. Публикуването остава безплатно, но ще можеш да включиш платените допълнителни услуги. Продължи?')){e.target.checked=true;return}
    M.setPlatform({freeBeta:e.target.checked});renderPlatform();toast(e.target.checked?'FREE BETA е включена.':'FREE BETA е изключена.');
  });
  document.querySelector('[data-paid-services-toggle]')?.addEventListener('change',e=>{
    const p=M.getPlatform();
    if(e.target.checked){
      if(p.freeBeta){e.target.checked=false;toast('Първо изключи FREE BETA.');return}
      if(p.paymentMode==='live'&&!p.livePaymentsReady){e.target.checked=false;toast('Реалните плащания още не са свързани. Използвай тестов режим.');return}
      const issues=M.validatePaidSetup?.()||[];
      if(issues.length){e.target.checked=false;alert('Платените услуги не могат да се включат още:\n\n• '+issues.join('\n• '));renderPlatform();return}
      const msg=p.paymentMode==='test'?'Да включа ли платените услуги в ТЕСТОВ режим? Няма да се взимат истински пари.':'Да включа ли РЕАЛНИТЕ плащания?';
      if(!confirm(msg)){e.target.checked=false;return}
    }
    M.setPlatform({paidServicesEnabled:e.target.checked});renderPlatform();toast(e.target.checked?'Платените услуги са включени.':'Платените услуги са изключени.');
  });
  document.querySelector('[data-payment-mode]')?.addEventListener('change',e=>{
    if(e.target.value==='live'&&!M.getPlatform().livePaymentsReady){M.setPlatform({paymentMode:'live',paidServicesEnabled:false});renderPlatform();toast('LIVE режимът е избран, но плащанията остават OFF до свързване на платежен оператор.');return}
    M.setPlatform({paymentMode:e.target.value,paidServicesEnabled:false});renderPlatform();toast('Режимът е сменен. Включи платените услуги отново след проверка.');
  });
  renderPlatform();


  function renderBetaCampaign(){
    const box=document.querySelector('[data-beta-campaign-editor]');if(!box)return;
    const c=M.getConfig(),b=c.bonusCampaign||{},productOptions=Object.values(c.products).map(p=>'<option value="'+esc(p.id)+'" '+(p.id===b.creditProductId?'selected':'')+'>'+esc(p.name)+'</option>').join('');
    const dt=v=>{if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return '';const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())};
    box.innerHTML='<div class="monetization-editor beta-campaign-editor"><div class="monetization-editor-head"><div><h3>'+esc(b.title||'Бонус за първите 500')+'</h3><p>Безплатна промоция по време на FREE BETA. Не отваря checkout.</p></div><label class="admin-switch-inline"><input data-beta-enabled type="checkbox" '+(b.enabled?'checked':'')+'> Активна</label></div><div class="monetization-grid"><label><span>Първите колко потвърдени регистрации?</span><input data-beta-limit min="1" step="1" type="number" value="'+Number(b.maxVerifiedUsers||500)+'"></label><label><span>Какъв бонус?</span><select data-beta-product>'+productOptions+'</select></label><label><span>Брой активации</span><input data-beta-qty min="1" step="1" type="number" value="'+Number(b.qty||1)+'"></label><label><span>Може да се използва до</span><input data-beta-until type="datetime-local" value="'+dt(b.redeemUntil)+'"></label></div><div class="monetization-actions"><button class="btn primary" data-save-beta-campaign type="button">Запази кампанията</button></div></div>';
  }

  function promoEditor(item,type){
    const p=item.promotion||{};return '<article class="monetization-editor" data-monetization-item="'+esc(item.id)+'" data-item-type="'+type+'"><div class="monetization-editor-head"><div><h3>'+esc(item.name)+'</h3><p>'+esc(item.description||'')+'</p></div><label class="admin-switch-inline"><input data-item-enabled type="checkbox" '+(item.enabled?'checked':'')+'> Активно</label></div><div class="monetization-grid"><label><span>Редовна цена (€)</span><input data-regular type="number" min="0" step="0.01" value="'+Number(item.regularPrice||0).toFixed(2)+'"></label><label><span>Промо цена (€)</span><input data-promo-price type="number" min="0" step="0.01" value="'+(p.price??'')+'" placeholder="няма"></label><label><span>Начало</span><input data-promo-start type="datetime-local" value="'+dt(p.start)+'"></label><label><span>Край</span><input data-promo-end type="datetime-local" value="'+dt(p.end)+'"></label></div><details class="monetization-advanced"><summary>Разширени настройки</summary><div class="monetization-grid"><label><span>За кого</span><select data-promo-audience><option value="all" '+((p.audience||'all')==='all'?'selected':'')+'>Всички</option><option value="private" '+(p.audience==='private'?'selected':'')+'>Частни лица</option><option value="dealer" '+(p.audience==='dealer'?'selected':'')+'>Търговци</option></select></label><label><span>Край след X покупки</span><input data-promo-limit type="number" min="1" step="1" value="'+(p.maxSales??'')+'" placeholder="без лимит"></label></div></details><div class="monetization-actions"><label class="admin-switch-inline"><input data-promo-enabled type="checkbox" '+(p.enabled?'checked':'')+'> Промоцията е включена</label><span class="muted-admin">Покупки на промо: '+Number(p.sales||0)+(p.maxSales?' / '+Number(p.maxSales):'')+'</span><button class="btn primary" data-save-monetization type="button">Запази</button><button class="btn" data-stop-promo type="button">Спри промоцията</button>'+(type==='package'?'<button class="btn danger" data-delete-package type="button">Изтрий пакет</button>':'')+'</div></article>';
  }
  function renderEditors(){
    const c=M.getConfig(),services=document.querySelector('[data-service-editor]'),packages=document.querySelector('[data-package-editor]');
    if(services)services.innerHTML=Object.values(c.products).map(p=>promoEditor(p,'product')).join('');
    if(packages)packages.innerHTML=c.packages.length?c.packages.map(p=>promoEditor(p,'package')).join(''):'<div class="empty-admin-state">Няма пакети.</div>';
    const select=document.querySelector('[data-wallet-product]');if(select)select.innerHTML=Object.values(c.products).map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('');
    renderWallet();renderHistory();
  }
  function mutable(c,type,id){return type==='product'?c.products[id]:c.packages.find(x=>x.id===id)}
  document.addEventListener('click',e=>{
    const save=e.target.closest('[data-save-monetization]');if(save){
      const card=save.closest('[data-monetization-item]'),c=M.getConfig(),item=mutable(c,card.dataset.itemType,card.dataset.monetizationItem);if(!item)return;
      const q=s=>card.querySelector(s);item.enabled=q('[data-item-enabled]').checked;item.regularPrice=Number(q('[data-regular]').value||0);item.promotion=item.promotion||{};item.promotion.enabled=q('[data-promo-enabled]').checked;item.promotion.price=q('[data-promo-price]').value===''?null:Number(q('[data-promo-price]').value);item.promotion.start=iso(q('[data-promo-start]').value);item.promotion.end=iso(q('[data-promo-end]').value);item.promotion.audience=q('[data-promo-audience]').value;item.promotion.maxSales=q('[data-promo-limit]').value===''?null:Number(q('[data-promo-limit]').value);item.promotion.sales=Number(item.promotion.sales||0);
      if(item.promotion.enabled&&item.promotion.price===null){toast('Въведи промо цена.');return}if(item.promotion.start&&item.promotion.end&&new Date(item.promotion.start)>=new Date(item.promotion.end)){toast('Краят трябва да е след началото.');return}
      M.saveConfig(c);toast('Цената и промоцията са запазени.');renderEditors();return;
    }
    const stop=e.target.closest('[data-stop-promo]');if(stop){const card=stop.closest('[data-monetization-item]'),c=M.getConfig(),item=mutable(c,card.dataset.itemType,card.dataset.monetizationItem);item.promotion.enabled=false;M.saveConfig(c);renderEditors();toast('Промоцията е спряна.');return}
    const del=e.target.closest('[data-delete-package]');if(del){if(!confirm('Да изтрия ли този пакет?'))return;const card=del.closest('[data-monetization-item]'),c=M.getConfig();c.packages=c.packages.filter(x=>x.id!==card.dataset.monetizationItem);M.saveConfig(c);renderEditors();return}
    if(e.target.closest('[data-add-package]')){
      const name=prompt('Име на пакета, например: 10 × TOP · 7 дни');if(!name)return;const c=M.getConfig(),ids=Object.keys(c.products),productId=prompt('Кредит: '+ids.join(', '),'top7');if(!c.products[productId]){toast('Невалиден кредит.');return}const qty=Number(prompt('Брой активации','10'));if(!Number.isInteger(qty)||qty<1){toast('Невалиден брой.');return}const price=Number(prompt('Редовна цена (€)',String((c.products[productId].regularPrice*qty).toFixed(2))));if(!Number.isFinite(price)||price<0){toast('Невалидна цена.');return}c.packages.push({id:'pack-'+Date.now(),name,creditProductId:productId,qty,regularPrice:price,enabled:true,description:qty+' активации, които се използват когато потребителят поиска.',promotion:{enabled:false,price:null,start:null,end:null,audience:'all',maxSales:null,sales:0}});M.saveConfig(c);renderEditors();toast('Пакетът е добавен.');
    }
  });
  function renderWallet(){const id=(document.querySelector('[data-wallet-user]')?.value||'demo-user').trim(),w=M.getWallet(id),c=M.getConfig(),box=document.querySelector('[data-wallet-preview]');if(box)box.innerHTML=Object.values(c.products).map(p=>'<div><strong>'+Number(w[p.id]||0)+'</strong><span>'+esc(p.name)+'</span></div>').join('')}
  function renderHistory(){const box=document.querySelector('[data-promotion-history]');if(!box)return;const c=M.getConfig(),h=M.getHistory().slice(0,30);box.innerHTML=h.length?h.map(x=>'<div class="activity"><strong>'+esc(x.userId)+' · '+esc(c.products[x.productId]?.name||x.productId)+' · '+(x.qty>0?'+':'')+x.qty+'</strong><span>'+new Date(x.at).toLocaleString('bg-BG')+' · '+esc(x.reason||x.source||'')+'</span></div>').join(''):'<div class="empty-admin-state">Няма операции.</div>'}

  document.addEventListener('click',e=>{
    const save=e.target.closest('[data-save-beta-campaign]');
    if(save){
      const c=M.getConfig(),b=c.bonusCampaign||{};
      const enabled=document.querySelector('[data-beta-enabled]')?.checked;
      const maxVerifiedUsers=Number(document.querySelector('[data-beta-limit]')?.value||500);
      const creditProductId=document.querySelector('[data-beta-product]')?.value||'top7';
      const qty=Number(document.querySelector('[data-beta-qty]')?.value||1);
      const until=document.querySelector('[data-beta-until]')?.value||'';
      if(!Number.isInteger(maxVerifiedUsers)||maxVerifiedUsers<1){toast('Невалиден брой регистрации.');return}
      if(!Number.isInteger(qty)||qty<1){toast('Невалиден брой бонуси.');return}
      if(!c.products[creditProductId]){toast('Невалиден вид бонус.');return}
      b.enabled=!!enabled;b.maxVerifiedUsers=maxVerifiedUsers;b.creditProductId=creditProductId;b.qty=qty;b.redeemUntil=until?new Date(until).toISOString():null;b.requiresVerifiedEmail=true;
      c.bonusCampaign=b;M.saveConfig(c);renderBetaCampaign();toast('FREE BETA кампанията е запазена.');return;
    }
    const grant=e.target.closest('[data-beta-test-grant]');
    if(grant){
      const user=(document.querySelector('[data-beta-test-user]')?.value||'').trim(),order=Number(document.querySelector('[data-beta-test-order]')?.value),status=document.querySelector('[data-beta-test-status]');
      if(typeof M.grantEarlyBetaBonus!=='function'){
        if(status){status.className='warning-callout';status.textContent='Зареден е стар кеширан файл. Обнови страницата още веднъж.'}
        return;
      }
      const result=M.grantEarlyBetaBonus(user,order,true);
      if(status){
        status.className=result?.granted?'admin-info-box':'warning-callout';
        status.textContent=result?.granted?'Бонусът е даден успешно.':'Не е даден бонус: '+String(result?.reason||'неизвестна причина');
      }
      renderHistory();return;
    }
  });

  document.querySelector('[data-wallet-user]')?.addEventListener('input',renderWallet);
  document.querySelector('[data-wallet-apply]')?.addEventListener('click',()=>{const id=(document.querySelector('[data-wallet-user]').value||'demo-user').trim(),product=document.querySelector('[data-wallet-product]').value,qty=Number(document.querySelector('[data-wallet-qty]').value),reason=document.querySelector('[data-wallet-reason]').value.trim();try{M.adjustWallet(id,product,qty,reason||'Ръчна корекция от админ','admin');renderWallet();renderHistory();toast('Балансът е променен.')}catch(err){toast(err.message)}});
  if(document.querySelector('[data-service-editor]')){renderEditors();renderBetaCampaign();}
})();
