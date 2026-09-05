
(function(){
  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
  const store={get:(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
  window.Market={store};
  const fav=store.get('favorites',[]), cmp=store.get('compare',[]);
  $$('[data-favorite]').forEach(b=>{const id=b.dataset.favorite;if(fav.includes(id))b.classList.add('active');b.addEventListener('click',e=>{e.preventDefault();let a=store.get('favorites',[]);a.includes(id)?a=a.filter(x=>x!==id):a.push(id);store.set('favorites',a);b.classList.toggle('active');});});
  $$('[data-compare]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.compare;let a=store.get('compare',[]);if(!a.includes(id)){if(a.length>=3){alert('Можеш да сравняваш до 3 обяви.');return;}a.push(id);store.set('compare',a);b.textContent='Добавено за сравнение';}}));
  const phoneBtn=$('[data-phone]');if(phoneBtn)phoneBtn.addEventListener('click',()=>{phoneBtn.textContent=phoneBtn.dataset.phone;phoneBtn.classList.remove('secondary-btn');phoneBtn.classList.add('primary-btn');});
  const fbtn=$('[data-filter-toggle]'), panel=$('.filter-panel');if(fbtn&&panel)fbtn.addEventListener('click',()=>panel.classList.toggle('open'));
  const filters=$$('.filter-panel input,.filter-panel select');
  const search=$('[data-listing-search]');
  function filterRows(){const rows=$$('.listing-row');if(!rows.length)return; const text=(search?.value||'').trim().toLowerCase();const brand=$('#brandFilter')?.value||'';const state=$('#stateFilter')?.value||'';const max=parseFloat($('#maxPrice')?.value||'999999');const city=$('#cityFilter')?.value||'';rows.forEach(r=>{const ok=(!text||r.dataset.search.includes(text))&&(!brand||r.dataset.brand===brand)&&(!state||r.dataset.state===state)&&(+r.dataset.price<=max)&&(!city||r.dataset.city===city);r.style.display=ok?'grid':'none';});const count=rows.filter(r=>r.style.display!=='none').length;const cc=$('[data-result-count]');if(cc)cc.textContent=count+' обяви';}
  filters.forEach(x=>x.addEventListener('change',filterRows));filters.forEach(x=>x.addEventListener('input',filterRows));if(search)search.addEventListener('input',filterRows);
  const cookie=$('.cookie-bar');if(cookie&&!localStorage.getItem('cookieChoice'))setTimeout(()=>cookie.classList.add('show'),300);$$('[data-cookie]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem('cookieChoice',b.dataset.cookie);cookie?.classList.remove('show');}));
  const sections=$$('.form-section');let step=0;function showStep(n){step=Math.max(0,Math.min(sections.length-1,n));sections.forEach((s,i)=>s.classList.toggle('active',i===step));$$('.step').forEach((x,i)=>x.classList.toggle('active',i<=step));const prev=$('[data-prev]'), next=$('[data-next]'), pub=$('[data-publish]');if(prev)prev.style.visibility=step===0?'hidden':'visible';if(next)next.style.display=step===sections.length-1?'none':'inline-flex';if(pub)pub.style.display=step===sections.length-1?'inline-flex':'none';window.scrollTo({top:0,behavior:'smooth'});}if(sections.length){showStep(0);$('[data-next]')?.addEventListener('click',()=>showStep(step+1));$('[data-prev]')?.addEventListener('click',()=>showStep(step-1));$('[data-publish]')?.addEventListener('click',()=>{localStorage.setItem('demoAdPublished','1');location.href='my-ads.html?published=1';});}
  const send=$('[data-send-message]');if(send){send.addEventListener('click',()=>{const inp=$('[data-chat-input]');const val=inp.value.trim();if(!val)return;const wrap=$('.chat-messages');const row=document.createElement('div');row.className='bubble-row me';row.innerHTML='<div class="bubble">'+val.replace(/[<>]/g,'')+'<div class="bubble-time">сега</div></div>';wrap.appendChild(row);inp.value='';wrap.scrollTop=wrap.scrollHeight;});}
  const q=$('[data-quick-message]');$$('[data-quick-message]').forEach(b=>b.addEventListener('click',()=>{const inp=$('[data-chat-input]');if(inp){inp.value=b.textContent.trim();inp.focus();}}));
  $$('[data-tab]').forEach(t=>t.addEventListener('click',()=>{$$('[data-tab]').forEach(x=>x.classList.remove('active'));t.classList.add('active');const target=t.dataset.tab;$$('[data-tab-panel]').forEach(p=>p.style.display=p.dataset.tabPanel===target?'block':'none');}));
  if(new URLSearchParams(location.search).get('published')){const c=$('[data-published-callout]');if(c)c.style.display='block';}

  // v1.9: consistent mobile header on every public page.
  (function ensureMobileHeader(){
    const header=$('.site-header .header-inner');
    const actions=header?.querySelector('.header-actions');
    if(!header||!actions)return;
    let mobileSearch=actions.querySelector('.mobile-header-search')||header.querySelector('.mobile-header-search');
    if(!mobileSearch){
      mobileSearch=document.createElement('form');
      mobileSearch.className='mobile-header-search';
      mobileSearch.action='listings.html';
      mobileSearch.innerHTML='<input name="q" placeholder="Търси техника..." aria-label="Търси техника"><button aria-label="Търси"><span class="ico"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.2-3.2"></path></svg></span></button>';
      actions.insertBefore(mobileSearch,actions.firstChild);
    }
    let mobileFav=actions.querySelector('.mobile-favorite');
    if(!mobileFav){
      mobileFav=actions.querySelector('a[href="favorites.html"]');
      if(mobileFav)mobileFav.classList.add('mobile-favorite');
    }
  })();

  // v1.9: mark the active item in the fixed mobile navigation.
  (function markMobileNav(){
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    $$('.mobile-bottom a').forEach(a=>{
      const href=(a.getAttribute('href')||'').split('?')[0].toLowerCase();
      const active=
        (file==='index.html'&&href==='index.html')||
        (file==='listings.html'&&href==='listings.html')||
        ((file==='post-ad.html'||file==='edit-ad.html')&&href==='post-ad.html')||
        (file==='messages.html'&&href==='messages.html')||
        ((['profile.html','my-ads.html','notifications.html','saved-searches.html','favorites.html'].includes(file))&&href==='profile.html');
      a.classList.toggle('is-active',!!active);
    });
  })();

  // v1.9: filter panel gets a real close button and locks the page behind it.
  (function improveMobileFilters(){
    const fp=$('.filter-panel'), toggle=$('[data-filter-toggle]');
    if(!fp||!toggle)return;
    const title=fp.querySelector('.filter-title');
    if(title&&!title.querySelector('.filter-close')){
      const close=document.createElement('button');
      close.type='button';close.className='filter-close';close.setAttribute('aria-label','Затвори филтрите');close.textContent='×';
      title.appendChild(close);
      close.addEventListener('click',()=>{fp.classList.remove('open');document.body.classList.remove('filter-open')});
    }
    toggle.addEventListener('click',()=>setTimeout(()=>document.body.classList.toggle('filter-open',fp.classList.contains('open')),0));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fp.classList.contains('open')){fp.classList.remove('open');document.body.classList.remove('filter-open')}});
  })();

  // v1.9: mobile chat opens as conversation list and has a back button.
  (function improveMobileChat(){
    const shell=$('.chat-shell');
    if(!shell)return;
    const pane=shell.querySelector('.chat-pane');
    const product=shell.querySelector('.chat-product');
    if(product&&!product.querySelector('.mobile-chat-back')){
      const back=document.createElement('button');
      back.type='button';back.className='mobile-chat-back';back.setAttribute('aria-label','Назад към разговорите');back.textContent='←';
      product.insertBefore(back,product.firstChild);
      back.addEventListener('click',()=>shell.classList.remove('chat-open'));
    }
    shell.querySelectorAll('.conversation').forEach(c=>c.addEventListener('click',()=>{
      shell.querySelectorAll('.conversation').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
      shell.classList.add('chat-open');
    }));
  })();

  // v1.9: comparison becomes stacked cards on phones instead of a wide table.
  (function buildMobileCompare(){
    const wrap=$('.compare-wrap'), table=wrap?.querySelector('.compare-table');
    if(!wrap||!table||wrap.querySelector('.mobile-compare-cards'))return;
    const heads=[...table.querySelectorAll('thead th')].slice(1);
    const rows=[...table.querySelectorAll('tbody tr')];
    if(!heads.length||!rows.length)return;
    const holder=document.createElement('div');holder.className='mobile-compare-cards';
    heads.forEach((head,idx)=>{
      const card=document.createElement('article');card.className='mobile-compare-card';
      const img=head.querySelector('img')?.getAttribute('src')||'';
      const title=head.querySelector('.compare-product div')?.textContent.trim()||('Обява '+(idx+1));
      const price=head.querySelector('.price')?.textContent.trim()||'';
      const specs=rows.map(r=>{
        const cells=[...r.children];
        const label=cells[0]?.textContent.trim()||'';
        const value=cells[idx+1]?.textContent.trim()||'—';
        return '<div class="mobile-compare-spec"><span>'+label+'</span><strong>'+value+'</strong></div>';
      }).join('');
      card.innerHTML='<div class="mobile-compare-head">'+(img?'<img src="'+img+'" alt="">':'')+'<div><strong>'+title+'</strong><div class="price">'+price+'</div></div></div>'+specs;
      holder.appendChild(card);
    });
    wrap.appendChild(holder);wrap.classList.add('has-mobile-compare');
  })();

  // v2.0: keep the exact scroll position on refresh and when returning with browser Back/Forward.
  (function preservePagePosition(){
    if(!('sessionStorage' in window))return;
    const key='market:scroll:'+location.pathname+location.search;
    let ticking=false;
    const save=()=>{
      sessionStorage.setItem(key,JSON.stringify({x:window.scrollX||0,y:window.scrollY||0,t:Date.now()}));
      ticking=false;
    };
    addEventListener('scroll',()=>{
      if(!ticking){ticking=true;requestAnimationFrame(save)}
    },{passive:true});
    addEventListener('pagehide',save);
    addEventListener('beforeunload',save);
    const nav=performance.getEntriesByType?.('navigation')?.[0];
    const shouldRestore=nav && (nav.type==='reload'||nav.type==='back_forward');
    if(shouldRestore){
      const raw=sessionStorage.getItem(key);
      if(raw){
        try{
          const p=JSON.parse(raw);
          history.scrollRestoration='manual';
          requestAnimationFrame(()=>requestAnimationFrame(()=>scrollTo(p.x||0,p.y||0)));
          setTimeout(()=>scrollTo(p.x||0,p.y||0),120);
        }catch(e){}
      }
    }
  })();

  // v2.0: mobile Back always means the previous page in this site; direct entries fall back to Home.
  (function addMobileHistoryBack(){
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(file==='index.html')return;
    const inner=document.querySelector('.site-header .header-inner');
    if(!inner||inner.querySelector('.mobile-history-back'))return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='mobile-history-back';
    btn.setAttribute('aria-label','Назад');
    btn.innerHTML='<span class="ico"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"></path></svg></span>';
    inner.insertBefore(btn,inner.firstChild);
    document.body.classList.add('has-mobile-back');
    btn.addEventListener('click',()=>{
      let internal=false;
      try{internal=!!document.referrer && new URL(document.referrer).origin===location.origin}catch(e){}
      if(internal && history.length>1) history.back();
      else location.href='index.html';
    });
  })();

  // v2.0: save the current page position before any internal navigation.
  document.addEventListener('click',e=>{
    const a=e.target.closest?.('a[href]');
    if(!a)return;
    const href=a.getAttribute('href');
    if(!href||href.startsWith('#')||href.startsWith('javascript:')||a.target==='_blank')return;
    try{
      const u=new URL(href,location.href);
      if(u.origin===location.origin){
        const key='market:scroll:'+location.pathname+location.search;
        sessionStorage.setItem(key,JSON.stringify({x:window.scrollX||0,y:window.scrollY||0,t:Date.now()}));
      }
    }catch(err){}
  });


  // v2.2: FREE BETA is a real application mode.
  (function applyFreeBeta(){
    const cfg=window.SITE_CONFIG||{};
    if(cfg.paidServicesEnabled!==false)return;
    document.documentElement.classList.add('free-beta');
    $$('a[href="promote.html"],a[href="checkout.html"]').forEach(a=>a.remove());
    $$('.badge-vip,.badge-top,.promo-badge').forEach(x=>x.remove());
    $$('.listing-row.vip,.listing-row.top').forEach(x=>{x.classList.remove('vip','top')});
  })();

  // v2.2: real sorting for the current result set. Default is newest first.
  (function listingSort(){
    const select=$('[data-sort-listings]');
    const list=$('.listing-list');
    if(!select||!list)return;
    const sort=()=>{
      const rows=[...list.querySelectorAll('.listing-row')];
      const mode=select.value||select.options[select.selectedIndex]?.textContent||'';
      rows.sort((a,b)=>{
        if(mode.includes('ниска'))return (+a.dataset.price)-(+b.dataset.price);
        if(mode.includes('висока'))return (+b.dataset.price)-(+a.dataset.price);
        return (+b.dataset.created||0)-(+a.dataset.created||0);
      });
      rows.forEach(r=>list.appendChild(r));
    };
    select.addEventListener('change',sort);
    sort();
  })();

  // v2.2: email verification flow for the static prototype.
  (function emailVerification(){
    $('[data-register-submit]')?.addEventListener('click',()=>localStorage.setItem('marketEmailVerified','0'));
    $('[data-email-verified]')?.addEventListener('click',()=>{
      localStorage.setItem('marketEmailVerified','1');
      location.href='profile.html';
    });
    $('[data-resend-email]')?.addEventListener('click',e=>{
      e.currentTarget.textContent='Линкът е изпратен отново';
      e.currentTarget.disabled=true;
      setTimeout(()=>{e.currentTarget.disabled=false;e.currentTarget.textContent='Изпрати линка отново'},2500);
    });
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if((window.SITE_CONFIG||{}).emailVerificationRequired && ['post-ad.html','messages.html'].includes(file) && localStorage.getItem('marketEmailVerified')==='0'){
      location.replace('verify-email.html?next='+encodeURIComponent(file));
    }
  })();

  // v2.2: image picker + lightweight pre-publication checks.
  (function adModeration(){
    const picker=$('[data-photo-picker]');
    const input=$('[data-photo-input]');
    const status=$('[data-photo-status]');
    if(picker&&input){
      picker.addEventListener('click',()=>input.click());
      input.addEventListener('change',()=>{
        const files=[...input.files];
        const cfg=(window.SITE_CONFIG||{}).moderation||{};
        const allowed=cfg.allowedImageTypes||['image/jpeg','image/png','image/webp'];
        const maxBytes=(cfg.maxImageMb||10)*1024*1024;
        const bad=files.filter(f=>!allowed.includes(f.type)||f.size>maxBytes);
        const dup=new Set(), duplicates=[];
        files.forEach(f=>{const k=f.name+'|'+f.size;if(dup.has(k))duplicates.push(f.name);dup.add(k)});
        if(status){
          if(bad.length)status.textContent='Невалиден формат или прекалено голям файл.';
          else if(duplicates.length)status.textContent='Има вероятно дублирани снимки.';
          else status.textContent=files.length+' избрани снимки.';
        }
      });
    }

    const publish=$('[data-publish]');
    if(!publish)return;
    publish.addEventListener('click',e=>{
      const feedback=$('[data-moderation-feedback]');
      const desc=($('[data-ad-description]')?.value||'').trim();
      const defects=($('[data-ad-defects]')?.value||'').trim();
      const price=+$('[data-ad-price]')?.value||0;
      const files=[...($('[data-photo-input]')?.files||[])];
      const cfg=(window.SITE_CONFIG||{}).moderation||{};
      const min=cfg.minPhotos||2;
      const max=cfg.maxPhotos||15;
      const allowed=cfg.allowedImageTypes||['image/jpeg','image/png','image/webp'];
      const maxBytes=(cfg.maxImageMb||10)*1024*1024;

      // Keep this list server-side in production; here it only demonstrates the workflow.
      const blockedWords=['порнография','наркотици','фалшив документ'];
      const combined=(desc+' '+defects).toLowerCase();
      const contactPattern=/(https?:\/\/|www\.|t\.me\/|telegram|whatsapp|viber|(?:\+359|0)8[7-9]\d[\s.-]?\d{3}[\s.-]?\d{3})/i;
      const duplicateKeys=new Set();
      let duplicate=false;
      files.forEach(f=>{const k=f.name+'|'+f.size;if(duplicateKeys.has(k))duplicate=true;duplicateKeys.add(k)});

      const errors=[];
      if(files.length<min)errors.push('Добави поне '+min+' снимки.');
      if(files.length>max)errors.push('Можеш да качиш максимум '+max+' снимки.');
      if(files.some(f=>!allowed.includes(f.type)))errors.push('Разрешени са JPG, PNG и WebP.');
      if(files.some(f=>f.size>maxBytes))errors.push('Всяка снимка трябва да е до '+(cfg.maxImageMb||10)+' MB.');
      if(duplicate)errors.push('Премахни дублираните снимки.');
      if(blockedWords.some(w=>combined.includes(w)))errors.push('Текстът съдържа съдържание, което не е разрешено.');
      if(contactPattern.test(desc))errors.push('Не поставяй телефон, линкове или външни контакти в описанието. Използвай отделното поле за телефон и вътрешния чат.');

      if(errors.length){
        e.preventDefault();e.stopImmediatePropagation();
        if(feedback){feedback.className='moderation-feedback error';feedback.innerHTML='<strong>Обявата още не може да бъде публикувана.</strong><br>'+errors.join('<br>');feedback.style.display='block';feedback.scrollIntoView({behavior:'smooth',block:'center'})}
        return;
      }

      if(price>0 && price<=5){
        localStorage.setItem('demoRiskFlag','suspicious-price');
        if(feedback){feedback.className='moderation-feedback warn';feedback.innerHTML='<strong>Обявата ще бъде публикувана, но цената изглежда необичайно ниска.</strong><br>Ще бъде маркирана за проверка, без автоматично да се спира.';feedback.style.display='block'}
      }else{
        localStorage.removeItem('demoRiskFlag');
        if(feedback){feedback.className='moderation-feedback ok';feedback.textContent='Автоматичните проверки са успешни. Публикуваме обявата веднага.';feedback.style.display='block'}
      }
    },true);
  })();

  // v2.2: no free daily bump. Renewal is available only in the Expired state.
  $$('[data-renew-ad]').forEach(b=>b.addEventListener('click',()=>{
    b.textContent='Подновена за 60 дни';
    b.disabled=true;
  }));
  $$('[data-ad-action]').forEach(b=>b.addEventListener('click',()=>{
    const a=b.dataset.adAction;
    const msg=a==='sold'?'Обявата е маркирана като продадена.':a==='deactivate'?'Обявата е деактивирана.':'Обявата е изтрита.';
    alert(msg);
  }));


  // v2.3 recently viewed
  (function(){
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase(),key='marketRecentViewedV23';
    const get=()=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return[]}};
    if(file==='listing.html'){
      const item={id:'bosch-serie-6',title:document.querySelector('.detail-card h1')?.textContent?.trim()||'Bosch Serie 6',price:document.querySelector('.detail-price')?.textContent?.trim()||'329 €',image:document.querySelector('.gallery-main img')?.getAttribute('src')||'assets/img/products/washer-blue.svg',meta:'9 kg · 1400 rpm · A',location:'София',href:'listing.html',viewedAt:Date.now()};
      const arr=get().filter(x=>x.id!==item.id);arr.unshift(item);localStorage.setItem(key,JSON.stringify(arr.slice(0,8)));
    }
    if(file==='index.html'){
      const sec=document.querySelector('[data-recent-section]'),grid=document.querySelector('[data-recent-grid]'),items=get();
      if(sec&&grid&&items.length){sec.style.display='';grid.innerHTML=items.slice(0,4).map(x=>`<article class="product-card"><a href="${x.href}"><img class="product-img" src="${x.image}" alt="${x.title}"></a><div class="card-body"><a href="${x.href}"><h3 class="product-title">${x.title}</h3><div class="product-specs">${x.meta}</div></a><div class="product-meta"><div class="price">${x.price}</div><span class="location">${x.location}</span></div></div></article>`).join('')}
    }
  })();

  document.querySelectorAll('[data-follow-seller]').forEach(btn=>{
    const key='marketFollow:'+btn.dataset.followSeller;
    const draw=()=>{const on=localStorage.getItem(key)==='1';btn.textContent=on?'Следваш продавача':'Следвай продавача';btn.classList.toggle('is-following',on)};
    btn.addEventListener('click',()=>{localStorage.setItem(key,localStorage.getItem(key)==='1'?'0':'1');draw()});draw();
  });

  document.querySelector('[data-submit-report]')?.addEventListener('click',()=>{const x=document.querySelector('[data-report-success]');if(x){x.style.display='block';x.scrollIntoView({behavior:'smooth',block:'center'})}});
  document.querySelectorAll('[data-history-back]').forEach(b=>b.addEventListener('click',()=>history.length>1?history.back():location.assign('index.html')));

  (function(){
    const input=document.querySelector('[data-photo-input]'),grid=document.querySelector('[data-photo-preview]'),counter=document.querySelector('[data-photo-counter]'),status=document.querySelector('[data-photo-status]');
    if(!input||!grid)return;let items=[];
    const draw=()=>{if(counter)counter.textContent=items.length+'/15';if(status)status.textContent=items.length+'/15 снимки · минимум 2';if(!items.length){grid.innerHTML='<div class="photo-preview-empty">Избраните снимки ще се появят тук. Първата ще бъде основна.</div>';return}grid.innerHTML=items.map((it,i)=>`<div class="photo-preview-card"><img src="${it.url}" alt="">${i===0?'<span class="photo-label">Основна</span>':''}<div class="photo-move"><button type="button" data-photo-left="${i}" ${i===0?'disabled':''}>←</button><button type="button" data-photo-right="${i}" ${i===items.length-1?'disabled':''}>→</button></div></div>`).join('')};
    input.addEventListener('change',()=>{items.forEach(x=>{try{URL.revokeObjectURL(x.url)}catch(e){}});items=[...input.files].slice(0,15).map(f=>({file:f,url:URL.createObjectURL(f)}));draw()});
    grid.addEventListener('click',e=>{const l=e.target.closest('[data-photo-left]'),rr=e.target.closest('[data-photo-right]');if(l){const i=+l.dataset.photoLeft;if(i>0){[items[i-1],items[i]]=[items[i],items[i-1]];draw()}}if(rr){const i=+rr.dataset.photoRight;if(i<items.length-1){[items[i+1],items[i]]=[items[i],items[i+1]];draw()}}});
    const modal=document.querySelector('[data-ad-preview-modal]');
    document.querySelector('[data-ad-preview]')?.addEventListener('click',()=>{if(!modal)return;const ph=modal.querySelector('[data-preview-photo]');if(ph)ph.innerHTML=items[0]?`<img src="${items[0].url}" alt="">`:'Основна снимка';modal.querySelector('[data-preview-price]').textContent=(document.querySelector('[data-ad-price]')?.value||'—')+' €';modal.querySelector('[data-preview-description]').textContent=document.querySelector('[data-ad-description]')?.value||'Описанието ще се покаже тук.';modal.classList.add('open');modal.setAttribute('aria-hidden','false')});
    modal?.querySelectorAll('[data-close-preview]').forEach(x=>x.addEventListener('click',()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}));
  })();

  document.querySelector('[data-block-user]')?.addEventListener('click',e=>{const on=e.currentTarget.dataset.blocked==='1';e.currentTarget.dataset.blocked=on?'0':'1';e.currentTarget.textContent=on?'Блокирай':'Отблокирай'});


  // v2.4 share listing using the phone's native share sheet when available.
  document.querySelectorAll('[data-share-listing]').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      const shareData={
        title:document.querySelector('.detail-card h1')?.textContent?.trim()||document.title,
        text:'Виж тази обява за бяла техника',
        url:location.href
      };
      try{
        if(navigator.share){
          await navigator.share(shareData);
        }else if(navigator.clipboard){
          await navigator.clipboard.writeText(location.href);
          const old=btn.textContent;
          btn.textContent='Линкът е копиран';
          setTimeout(()=>btn.textContent=old,1800);
        }else{
          prompt('Копирай линка:',location.href);
        }
      }catch(err){
        if(err?.name!=='AbortError' && navigator.clipboard){
          try{await navigator.clipboard.writeText(location.href)}catch(e){}
        }
      }
    });
  });

  // v2.4 optional product-label photo.
  (function(){
    const input=document.querySelector('[data-label-photo-input]');
    const picker=document.querySelector('[data-label-photo-picker]');
    const preview=document.querySelector('[data-label-photo-preview]');
    if(!input||!picker||!preview)return;
    let url=null;
    picker.addEventListener('click',()=>input.click());
    input.addEventListener('change',()=>{
      if(url){try{URL.revokeObjectURL(url)}catch(e){}}
      const file=input.files?.[0];
      if(!file){
        preview.style.display='none';
        preview.innerHTML='';
        picker.textContent='Добави снимка на етикета';
        return;
      }
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
        alert('Разрешени са JPG, PNG и WebP.');
        input.value='';
        return;
      }
      if(file.size>10*1024*1024){
        alert('Снимката трябва да е до 10 MB.');
        input.value='';
        return;
      }
      url=URL.createObjectURL(file);
      preview.innerHTML='<img src="'+url+'" alt="Снимка на продуктовия етикет">';
      preview.style.display='block';
      picker.textContent='Смени снимката на етикета';
    });
  })();


  // v2.5 PWA registration
  if('serviceWorker' in navigator){
    addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
  }

  // v2.5 subtle search suggestions.
  (function(){
    const suggestions=[
      {label:'Bosch',type:'Марка',href:'listings.html?brand=Bosch'},
      {label:'Bosch Serie 6',type:'Модел',href:'listings.html?q=Bosch%20Serie%206'},
      {label:'Bosch перални',type:'Категория',href:'listings.html?category=Перални&brand=Bosch'},
      {label:'Перални',type:'Категория',href:'listings.html?category=Перални'},
      {label:'Сушилни',type:'Категория',href:'listings.html?category=Сушилни'},
      {label:'Хладилници',type:'Категория',href:'listings.html?category=Хладилници'},
      {label:'София',type:'Град',href:'listings.html?city=София'},
      {label:'Пловдив',type:'Град',href:'listings.html?city=Пловдив'},
      {label:'Кюстендил',type:'Град',href:'listings.html?city=Кюстендил'},
      {label:'LG',type:'Марка',href:'listings.html?brand=LG'},
      {label:'Samsung',type:'Марка',href:'listings.html?brand=Samsung'}
    ];
    document.querySelectorAll('.header-search,.mobile-header-search').forEach(box=>{
      const input=box.querySelector('input');
      if(!input||box.querySelector('.search-suggest'))return;
      const menu=document.createElement('div');menu.className='search-suggest';box.appendChild(menu);
      const render=()=>{
        const q=input.value.trim().toLowerCase();
        if(!q){menu.classList.remove('open');menu.innerHTML='';return}
        const found=suggestions.filter(x=>x.label.toLowerCase().includes(q)).slice(0,4);
        if(!found.length){menu.classList.remove('open');return}
        menu.innerHTML=found.map(x=>`<a href="${x.href}"><span>${x.label}</span><small>${x.type}</small></a>`).join('');
        menu.classList.add('open');
      };
      input.addEventListener('input',render);
      input.addEventListener('focus',render);
      document.addEventListener('click',e=>{if(!box.contains(e.target))menu.classList.remove('open')});
    });
  })();

  // v2.5 PWA install flow: native prompt on supporting browsers, instructions on iPhone/iPad.
  (function(){
    let deferredPrompt=null;
    window.addEventListener('beforeinstallprompt',e=>{
      e.preventDefault();
      deferredPrompt=e;
      document.querySelectorAll('[data-install-app]').forEach(b=>b.disabled=false);
    });

    const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone=window.matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;

    document.querySelectorAll('[data-install-app]').forEach(btn=>{
      if(standalone){btn.textContent='Добавено';btn.disabled=true}
      btn.addEventListener('click',async()=>{
        if(standalone)return;
        if(deferredPrompt){
          deferredPrompt.prompt();
          try{await deferredPrompt.userChoice}catch(e){}
          deferredPrompt=null;
          return;
        }
        if(isiOS){
          showInstallHelp('iPhone / iPad','Натисни бутона за споделяне в Safari, избери „Добави към началния екран“ и потвърди „Добави“. След това сайтът ще се отваря като приложение.');
        }else{
          showInstallHelp('Добавяне на началния екран','От менюто на браузъра избери „Инсталиране на приложение“ или „Добави към началния екран“.');
        }
      });
    });

    function showInstallHelp(title,text){
      let wrap=document.querySelector('.install-help');
      if(!wrap){
        wrap=document.createElement('div');wrap.className='install-help';
        wrap.innerHTML=`<div class="install-help-card"><h3></h3><p></p><button class="primary-btn" type="button">Разбрах</button></div>`;
        document.body.appendChild(wrap);
        wrap.querySelector('button').addEventListener('click',()=>wrap.classList.remove('open'));
        wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.classList.remove('open')});
      }
      wrap.querySelector('h3').textContent=title;
      wrap.querySelector('p').textContent=text;
      wrap.classList.add('open');
    }
  })();

  // v2.5 Push permission/UI. Remote pushes will be connected to the backend later.
  (function(){
    const btn=document.querySelector('[data-enable-push]');
    const status=document.querySelector('[data-push-status]');
    if(!btn)return;
    const draw=()=>{
      if(!('Notification' in window)){
        btn.disabled=true;btn.textContent='Неподдържано';
        if(status)status.textContent='Този браузър не поддържа web push.';
        return;
      }
      if(Notification.permission==='granted'){
        btn.textContent='Включени';btn.disabled=true;
        if(status)status.textContent='Разрешението за push известия е активно.';
      }else if(Notification.permission==='denied'){
        btn.textContent='Блокирани';btn.disabled=true;
        if(status)status.textContent='Известията са блокирани от настройките на браузъра.';
      }
    };
    draw();
    btn.addEventListener('click',async()=>{
      if(!('Notification' in window))return;
      const p=await Notification.requestPermission();
      draw();
      if(p==='granted' && 'serviceWorker' in navigator){
        try{
          const reg=await navigator.serviceWorker.ready;
          await reg.showNotification('Известията са включени',{
            body:'Когато свържем backend-а, тук ще идват чатове и важни промени по обявите.',
            icon:'assets/img/pwa-192.png',
            data:{url:'notifications.html'}
          });
        }catch(e){}
      }
    });
  })();

  // v2.5 gallery: thumbnail switching, swipe, fullscreen and pinch zoom.
  (function(){
    const main=document.querySelector('[data-gallery-main]');
    if(!main)return;
    const mainImg=main.querySelector('img');
    const thumbs=[...document.querySelectorAll('[data-gallery-thumbs] img')];
    let images=[];
    try{images=JSON.parse(main.dataset.galleryImages||'[]')}catch(e){}
    if(!images.length && mainImg?.src)images=[mainImg.getAttribute('src')];
    let index=Math.max(0,images.indexOf(mainImg?.getAttribute('src')));
    const counter=document.querySelector('[data-gallery-counter]');
    const modal=document.querySelector('[data-gallery-modal]');
    const modalImg=modal?.querySelector('[data-gallery-modal-image]');
    const modalCounter=modal?.querySelector('[data-gallery-modal-counter]');
    const stage=modal?.querySelector('[data-gallery-stage]');
    let scale=1,startX=null,lastPinch=null;

    const show=i=>{
      if(!images.length)return;
      index=(i+images.length)%images.length;
      if(mainImg)mainImg.src=images[index];
      if(counter)counter.textContent=(index+1)+'/'+images.length;
      thumbs.forEach((im,n)=>im.parentElement?.classList.toggle('active',n===index));
      if(modalImg)modalImg.src=images[index];
      if(modalCounter)modalCounter.textContent=(index+1)+'/'+images.length;
      scale=1;if(modalImg)modalImg.style.transform='scale(1)';
    };
    thumbs.forEach((im,i)=>im.addEventListener('click',()=>show(i)));
    show(index);

    let touchStart=0;
    main.addEventListener('touchstart',e=>{if(e.touches.length===1)touchStart=e.touches[0].clientX},{passive:true});
    main.addEventListener('touchend',e=>{
      const dx=e.changedTouches[0].clientX-touchStart;
      if(Math.abs(dx)>45)show(index+(dx<0?1:-1));
    },{passive:true});

    document.querySelector('[data-gallery-open]')?.addEventListener('click',()=>{
      if(!modal)return;show(index);modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
    });
    const close=()=>{if(!modal)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';scale=1};
    modal?.querySelector('[data-gallery-close]')?.addEventListener('click',close);
    modal?.querySelector('[data-gallery-prev]')?.addEventListener('click',()=>show(index-1));
    modal?.querySelector('[data-gallery-next]')?.addEventListener('click',()=>show(index+1));

    if(stage){
      stage.addEventListener('touchstart',e=>{
        if(e.touches.length===1){startX=e.touches[0].clientX;lastPinch=null}
        if(e.touches.length===2){
          const [a,b]=e.touches;lastPinch=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
        }
      },{passive:true});
      stage.addEventListener('touchmove',e=>{
        if(e.touches.length===2 && modalImg){
          e.preventDefault();
          const [a,b]=e.touches,dist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
          if(lastPinch){
            scale=Math.max(1,Math.min(4,scale*(dist/lastPinch)));
            modalImg.style.transform='scale('+scale+')';
          }
          lastPinch=dist;
        }
      },{passive:false});
      stage.addEventListener('touchend',e=>{
        if(e.changedTouches.length===1 && startX!==null && scale<=1.05){
          const dx=e.changedTouches[0].clientX-startX;
          if(Math.abs(dx)>45)show(index+(dx<0?1:-1));
        }
        startX=null;lastPinch=null;
      },{passive:true});
      stage.addEventListener('dblclick',()=>{
        scale=scale>1?1:2;
        if(modalImg)modalImg.style.transform='scale('+scale+')';
      });
    }
    document.addEventListener('keydown',e=>{
      if(!modal?.classList.contains('open'))return;
      if(e.key==='Escape')close();
      if(e.key==='ArrowLeft')show(index-1);
      if(e.key==='ArrowRight')show(index+1);
    });
  })();

  // v2.5 price history popup for green/down or red/up indicator.
  (function(){
    let pop=null;
    const ensure=()=>{
      if(pop)return pop;
      pop=document.createElement('div');pop.className='price-history-popover';
      pop.innerHTML='<div class="price-history-popover-card"><div class="price-history-popover-head"><h3>История на цената</h3><button type="button" aria-label="Затвори">×</button></div><div class="price-history-popover-list"></div></div>';
      document.body.appendChild(pop);
      pop.querySelector('button').addEventListener('click',()=>pop.classList.remove('open'));
      pop.addEventListener('click',e=>{if(e.target===pop)pop.classList.remove('open')});
      return pop;
    };
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-price-history]');
      if(!btn)return;
      e.preventDefault();e.stopPropagation();
      const p=ensure();
      const list=p.querySelector('.price-history-popover-list');
      const rows=(btn.dataset.priceHistory||'').split(';').filter(Boolean).map(x=>{
        const [price,date]=x.split('|');
        return `<div><span>${date||''}</span><strong>${price||''}</strong></div>`;
      }).join('');
      list.innerHTML=rows||'<div><span>Няма предишни промени.</span><strong>—</strong></div>';
      p.classList.add('open');
    });
  })();

})();
