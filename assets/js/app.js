
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
      const files=(window.marketPreparedPhotos?.map(x=>x.file)||[...($('[data-photo-input]')?.files||[])]);
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


  // v2.4 share listing using the phone's native share sheet when available.
  document.querySelectorAll('[data-share-listing]').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      const shareData={
        title:document.querySelector('.detail-card h1')?.textContent?.trim()||document.title,
        text:(document.querySelector('.detail-card h1')?.textContent?.trim()||'Обява')+' · '+(document.querySelector('.detail-price')?.textContent?.trim()||''),
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


  // v2.6 guest favorites page: localStorage works without registration.
  (function(){
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(file!=='favorites.html')return;

    const section=document.querySelector('[data-favorites-section]');
    const empty=document.querySelector('[data-empty-template]');

    const render=()=>{
      let ids=[];
      try{ids=JSON.parse(localStorage.getItem('favorites')||'[]')}catch(e){}
      const cards=[...document.querySelectorAll('[data-favorite-card]')];
      let visible=0;

      cards.forEach(card=>{
        const show=ids.includes(card.dataset.favoriteCard);
        card.hidden=!show;
        if(show)visible++;
      });

      if(section)section.style.display=visible?'':'none';
      if(empty)empty.style.display=visible?'none':'';
    };

    render();
    document.querySelectorAll('[data-favorite]').forEach(btn=>{
      btn.addEventListener('click',()=>setTimeout(render,0));
    });

    const pageSubtitle=document.querySelector('.page-subtitle');
    if(pageSubtitle && !document.querySelector('.favorite-guest-note')){
      const note=document.createElement('div');
      note.className='favorite-guest-note';
      note.textContent='Любимите се пазят и без регистрация на това устройство.';
      pageSubtitle.insertAdjacentElement('afterend',note);
    }
  })();

  // v2.6 tiny price indicator opens the full dated history only on tap.
  (function(){
    let pop=document.querySelector('.price-history-popover');

    const ensure=()=>{
      if(pop)return pop;
      pop=document.createElement('div');
      pop.className='price-history-popover';
      pop.innerHTML='<div class="price-history-popover-card"><div class="price-history-popover-head"><h3>История на цената</h3><button type="button" aria-label="Затвори">×</button></div><div class="price-history-popover-list"></div></div>';
      document.body.appendChild(pop);
      pop.querySelector('button').addEventListener('click',()=>pop.classList.remove('open'));
      pop.addEventListener('click',e=>{if(e.target===pop)pop.classList.remove('open')});
      return pop;
    };

    // Capture phase prevents the older v2.5 popup handler from also firing.
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-price-history]');
      if(!btn)return;
      e.preventDefault();
      e.stopImmediatePropagation();

      const p=ensure();
      const list=p.querySelector('.price-history-popover-list');
      const parsed=(btn.dataset.priceHistory||'').split(';').filter(Boolean).map(x=>{
        const [price,date]=x.split('|');
        const value=parseFloat((price||'').replace(/[^\d.,]/g,'').replace(',','.'))||0;
        return {price:price||'',date:date||'',value};
      });

      list.innerHTML=parsed.map((row,i)=>{
        let cls='same',symbol='•';
        if(i>0){
          const prev=parsed[i-1].value;
          if(row.value<prev){cls='down';symbol='↓'}
          else if(row.value>prev){cls='up';symbol='↑'}
        }
        return `<div><span>${row.date}</span><strong>${row.price}</strong><em class="price-history-change ${cls}">${symbol}</em></div>`;
      }).join('') || '<div><span>Няма предишни промени.</span><strong>—</strong><em class="price-history-change same">•</em></div>';

      p.classList.add('open');
    },true);
  })();

  // v2.6 category / brand landing pages.
  (function(){
    const body=document.body;
    const kind=body?.dataset?.landingKind;
    if(!kind)return;

    const params=new URLSearchParams(location.search);
    const name=(params.get('name')||'').trim();
    const brand=(params.get('brand')||'').trim();

    const title=document.querySelector('[data-landing-title]');
    const subtitle=document.querySelector('[data-landing-subtitle]');
    const label=document.querySelector('[data-landing-label]');
    const links=document.querySelector('[data-landing-links]');

    const categories=['Перални','Сушилни','Хладилници','Печки','Фризери','Съдомиялни','Фурни','Котлони'];
    const brands=['Bosch','Samsung','LG','AEG','Siemens'];

    if(kind==='category'){
      const heading=brand?`${name} ${brand}`:(name||'Категория');
      if(title)title.textContent=heading;
      if(subtitle)subtitle.textContent=`Актуални обяви за ${heading.toLowerCase()} с директен контакт с продавача.`;
      if(label)label.textContent='Популярни марки:';
      if(links)links.innerHTML=brands.map(b=>`<a class="${b===brand?'active':''}" href="category.html?name=${encodeURIComponent(name)}&brand=${encodeURIComponent(b)}">${b}</a>`).join('');
      document.title=heading+' · Пазар за бяла техника';
    }

    if(kind==='brand'){
      const heading=name?`${name} · бяла техника`:'Марка';
      if(title)title.textContent=heading;
      if(subtitle)subtitle.textContent=`Разгледай актуалните обяви за ${name||'избраната марка'} по категории.`;
      if(label)label.textContent='Категории:';
      if(links)links.innerHTML=categories.slice(0,6).map(c=>`<a href="category.html?name=${encodeURIComponent(c)}&brand=${encodeURIComponent(name)}">${c}</a>`).join('');
      document.title=heading+' · Пазар за бяла техника';
    }
  })();

  // v2.6 point search suggestions to the category/brand landing pages.
  document.addEventListener('focusin',e=>{
    const box=e.target.closest?.('.header-search,.mobile-header-search');
    if(!box)return;
    setTimeout(()=>{
      box.querySelectorAll('.search-suggest a').forEach(a=>{
        const small=a.querySelector('small')?.textContent?.trim();
        const label=a.querySelector('span')?.textContent?.trim();
        if(!label)return;
        if(small==='Марка')a.href='brand.html?name='+encodeURIComponent(label);
        if(small==='Категория'){
          const category=label.replace(/\s+(Bosch|Samsung|LG|AEG|Siemens)$/,'');
          a.href='category.html?name='+encodeURIComponent(category);
        }
      });
    },0);
  });


  // v2.9 phone-tap statistics. Counts button taps, not completed calls.
  (function phoneTapStats(){
    const keyPrefix='marketPhoneTaps:';
    document.querySelectorAll('[data-phone-track]').forEach(link=>{
      link.addEventListener('click',()=>{
        const id=link.dataset.phoneTrack||document.body.dataset.listingId||'listing';
        const key=keyPrefix+id;
        const now=(parseInt(localStorage.getItem(key)||'0',10)||0)+1;
        localStorage.setItem(key,String(now));
      });
    });

    document.querySelectorAll('[data-phone-stat]').forEach(el=>{
      const id=el.dataset.phoneStat;
      const base=parseInt(el.dataset.base||'0',10)||0;
      const extra=parseInt(localStorage.getItem(keyPrefix+id)||'0',10)||0;
      el.textContent=String(base+extra);
    });

    const total=document.querySelector('[data-total-phone-stat]');
    if(total){
      const base=parseInt(total.dataset.base||'0',10)||0;
      let extra=0;
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(k&&k.startsWith(keyPrefix)) extra+=parseInt(localStorage.getItem(k)||'0',10)||0;
      }
      total.textContent=String(base+extra);
    }
  })();

  // v2.9 robust photo preparation:
  // exact SHA-256 duplicate detection, client-side optimization, progress,
  // retry for one failed photo, desktop drag/drop and mobile long-press sorting.
  (function photoManagerV29(){
    const input=document.querySelector('[data-photo-input]');
    const grid=document.querySelector('[data-photo-preview]');
    const counter=document.querySelector('[data-photo-counter]');
    const status=document.querySelector('[data-photo-status]');
    if(!input||!grid)return;

    const cfg=(window.SITE_CONFIG||{}).imageProcessing||{};
    const maxPhotos=((window.SITE_CONFIG||{}).moderation||{}).maxPhotos||15;
    const maxSourceBytes=(cfg.maxSourceMb||20)*1024*1024;
    const maxDimension=cfg.maxDimension||1920;
    const quality=cfg.quality||0.84;
    const allowed=['image/jpeg','image/png','image/webp'];
    let items=[];
    let seq=0;
    let desktopDragId=null;
    let touchDragId=null;
    let touchTimer=null;
    let lastTouchTarget=null;

    window.marketPreparedPhotos=[];

    const escapeHTML=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const formatBytes=n=>{
      if(n<1024)return n+' B';
      if(n<1024*1024)return (n/1024).toFixed(n<100*1024?1:0)+' KB';
      return (n/1024/1024).toFixed(1)+' MB';
    };
    const readyItems=()=>items.filter(x=>x.status==='ready');

    const syncPrepared=()=>{
      window.marketPreparedPhotos=readyItems().map(x=>({id:x.id,file:x.file,hash:x.hash,original:x.source}));
      try{
        const dt=new DataTransfer();
        readyItems().forEach(x=>dt.items.add(x.file));
        input.files=dt.files;
      }catch(e){}
    };

    const updateSummary=()=>{
      const ready=items.filter(x=>x.status==='ready').length;
      const processing=items.filter(x=>x.status==='processing').length;
      const failed=items.filter(x=>x.status==='failed'||x.status==='duplicate').length;
      if(counter)counter.textContent=ready+'/'+maxPhotos;
      if(status){
        let t=ready+'/'+maxPhotos+' готови снимки · минимум 2';
        if(processing)t+=' · '+processing+' се подготвят';
        if(failed)t+=' · '+failed+' изискват внимание';
        status.textContent=t;
      }
    };

    const firstReadyId=()=>readyItems()[0]?.id||null;

    const draw=()=>{
      updateSummary();
      if(!items.length){
        grid.innerHTML='<div class="photo-preview-empty">Избраните снимки ще се появят тук. Първата ще бъде основна.</div>';
        syncPrepared();
        return;
      }
      const mainId=firstReadyId();
      grid.innerHTML=items.map((it,i)=>{
        const cls='photo-preview-card '+(
          it.status==='processing'?'photo-processing':
          it.status==='failed'?'photo-error':
          it.status==='duplicate'?'photo-duplicate':''
        );
        const main=(it.id===mainId&&it.status==='ready')?'<span class="photo-label">Основна</span>':'';
        const image=it.url?`<img src="${it.url}" alt="">`:'';
        const progress=it.status==='processing'
          ?`<span class="photo-processing-label">${escapeHTML(it.step||'Подготовка…')}</span><div class="photo-progress"><span style="width:${Math.max(4,it.progress||4)}%"></span></div>`
          :'';
        const err=(it.status==='failed'||it.status==='duplicate')
          ?`<div class="photo-file-meta"><span class="photo-status-error">${escapeHTML(it.error||'Грешка')}</span><button type="button" class="photo-retry" data-photo-retry="${it.id}">Опитай пак</button></div>`
          :`<div class="photo-file-meta"><strong>${escapeHTML(it.source?.name||'Снимка')}</strong><span>${it.status==='ready' ? escapeHTML(it.sizeText||'Готова за качване') : 'Подготовка…'}</span></div>`;
        const move=it.status==='ready'
          ?`<div class="photo-move"><button type="button" data-photo-left="${it.id}" ${it.id===readyItems()[0]?.id?'disabled':''}>←</button><button type="button" data-photo-right="${it.id}" ${it.id===readyItems()[readyItems().length-1]?.id?'disabled':''}>→</button></div>`
          :'';
        return `<div class="${cls}" data-photo-item="${it.id}" draggable="${it.status==='ready'?'true':'false'}">
          <div class="photo-preview-image-wrap">
            ${image}${main}${progress}
            <div class="photo-card-top-actions">
              ${it.status==='ready'?`<button type="button" class="photo-drag-handle" data-photo-drag="${it.id}" aria-label="Задръж и премести">⋮⋮</button>`:''}
              <button type="button" class="photo-remove" data-photo-remove="${it.id}" aria-label="Премахни снимката">×</button>
            </div>
          </div>
          ${err}${move}
        </div>`;
      }).join('');
      syncPrepared();
    };

    const setItem=(item, patch)=>{
      Object.assign(item,patch);
      draw();
    };

    const hashFile=async file=>{
      if(!window.crypto?.subtle)return null;
      const buffer=await file.arrayBuffer();
      const digest=await crypto.subtle.digest('SHA-256',buffer);
      return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
    };

    const loadImageSource=async file=>{
      if('createImageBitmap' in window){
        try{
          const bmp=await createImageBitmap(file,{imageOrientation:'from-image'});
          return {source:bmp,width:bmp.width,height:bmp.height,cleanup:()=>bmp.close?.()};
        }catch(e){
          try{
            const bmp=await createImageBitmap(file);
            return {source:bmp,width:bmp.width,height:bmp.height,cleanup:()=>bmp.close?.()};
          }catch(e2){}
        }
      }
      return await new Promise((resolve,reject)=>{
        const url=URL.createObjectURL(file);
        const img=new Image();
        img.onload=()=>resolve({source:img,width:img.naturalWidth,height:img.naturalHeight,cleanup:()=>URL.revokeObjectURL(url)});
        img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Снимката не може да бъде прочетена.'))};
        img.src=url;
      });
    };

    const canvasBlob=(canvas,type,q)=>new Promise((resolve,reject)=>{
      canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Снимката не може да бъде оптимизирана.')),type,q);
    });

    const optimizeImage=async(item)=>{
      setItem(item,{progress:42,step:'Отваряне…'});
      const loaded=await loadImageSource(item.source);
      try{
        const scale=Math.min(1,maxDimension/Math.max(loaded.width,loaded.height));
        const width=Math.max(1,Math.round(loaded.width*scale));
        const height=Math.max(1,Math.round(loaded.height*scale));

        if(scale===1 && item.source.size<=1200*1024){
          setItem(item,{progress:82,step:'Проверка…'});
          return item.source;
        }

        setItem(item,{progress:64,step:'Оптимизиране…'});
        const canvas=document.createElement('canvas');
        canvas.width=width;canvas.height=height;
        const ctx=canvas.getContext('2d',{alpha:true});
        ctx.imageSmoothingEnabled=true;
        ctx.imageSmoothingQuality='high';
        ctx.drawImage(loaded.source,0,0,width,height);

        let blob;
        try{
          blob=await canvasBlob(canvas,'image/webp',quality);
        }catch(e){
          blob=await canvasBlob(canvas,'image/jpeg',quality);
        }
        setItem(item,{progress:88,step:'Финализиране…'});

        if(blob.size>=item.source.size*0.97)return item.source;
        const base=(item.source.name||'photo').replace(/\.[^.]+$/,'');
        const ext=blob.type==='image/webp'?'.webp':'.jpg';
        return new File([blob],base+ext,{type:blob.type,lastModified:Date.now()});
      } finally {
        loaded.cleanup?.();
      }
    };

    const processItem=async(item)=>{
      if(item.url){try{URL.revokeObjectURL(item.url)}catch(e){}}
      item.url=URL.createObjectURL(item.source);
      setItem(item,{status:'processing',progress:8,step:'Проверка…',error:''});

      try{
        if(!allowed.includes(item.source.type))throw new Error('Разрешени са JPG, PNG и WebP.');
        if(item.source.size>maxSourceBytes)throw new Error('Снимката е прекалено голяма за обработка.');

        setItem(item,{progress:20,step:'Проверка за дубликат…'});
        item.hash=await hashFile(item.source);
        if(item.hash){
          const duplicate=items.some(x=>x!==item && x.hash===item.hash && x.status==='ready');
          if(duplicate){
            setItem(item,{status:'duplicate',progress:100,error:'Тази снимка вече е добавена.'});
            return;
          }
        }

        const optimized=await optimizeImage(item);
        if(item.url){try{URL.revokeObjectURL(item.url)}catch(e){}}
        item.file=optimized;
        item.url=URL.createObjectURL(optimized);
        const saved=item.source.size>0?Math.max(0,Math.round((1-optimized.size/item.source.size)*100)):0;
        const sizeText=optimized===item.source
          ?formatBytes(optimized.size)+' · готова'
          :formatBytes(item.source.size)+' → '+formatBytes(optimized.size)+(saved>0?' · −'+saved+'%':'');
        setItem(item,{status:'ready',progress:100,step:'Готова',sizeText});
      }catch(err){
        setItem(item,{status:'failed',progress:100,error:err?.message||'Снимката не можа да бъде подготвена.'});
      }
    };

    const addFiles=async files=>{
      const activeCount=items.filter(x=>!['failed','duplicate'].includes(x.status)).length;
      const room=Math.max(0,maxPhotos-activeCount);
      const incoming=[...files].slice(0,room);
      if(!incoming.length){
        if(status)status.textContent='Можеш да качиш максимум '+maxPhotos+' снимки.';
        return;
      }
      for(const file of incoming){
        const item={id:'ph'+(++seq),source:file,file:null,url:null,hash:null,status:'processing',progress:2,step:'Добавяне…',error:''};
        items.push(item);
        draw();
        await processItem(item); // sequential by design: safer on phones with large camera photos
      }
    };

    // Capture phase prevents the older simple handlers from also rebuilding the grid.
    input.addEventListener('change',e=>{
      const files=[...input.files];
      e.stopImmediatePropagation();
      addFiles(files);
    },true);

    grid.addEventListener('click',e=>{
      const remove=e.target.closest('[data-photo-remove]');
      const retry=e.target.closest('[data-photo-retry]');
      const left=e.target.closest('[data-photo-left]');
      const right=e.target.closest('[data-photo-right]');

      if(remove){
        const id=remove.dataset.photoRemove;
        const idx=items.findIndex(x=>x.id===id);
        if(idx>=0){
          if(items[idx].url){try{URL.revokeObjectURL(items[idx].url)}catch(e){}}
          items.splice(idx,1);draw();
        }
        return;
      }
      if(retry){
        const it=items.find(x=>x.id===retry.dataset.photoRetry);
        if(it)processItem(it);
        return;
      }

      const moveReady=(id,dir)=>{
        const ordered=readyItems();
        const pos=ordered.findIndex(x=>x.id===id);
        const other=ordered[pos+dir];
        if(pos<0||!other)return;
        const a=items.findIndex(x=>x.id===id),b=items.findIndex(x=>x.id===other.id);
        [items[a],items[b]]=[items[b],items[a]];
        draw();
      };
      if(left)moveReady(left.dataset.photoLeft,-1);
      if(right)moveReady(right.dataset.photoRight,1);
    });

    // Desktop drag/drop.
    grid.addEventListener('dragstart',e=>{
      const card=e.target.closest('[data-photo-item]');
      if(!card||card.getAttribute('draggable')!=='true')return;
      desktopDragId=card.dataset.photoItem;
      card.classList.add('dragging');
      if(e.dataTransfer)e.dataTransfer.effectAllowed='move';
    });
    grid.addEventListener('dragover',e=>{if(desktopDragId)e.preventDefault()});
    grid.addEventListener('drop',e=>{
      if(!desktopDragId)return;
      e.preventDefault();
      const target=e.target.closest('[data-photo-item]');
      const from=items.findIndex(x=>x.id===desktopDragId);
      const to=target?items.findIndex(x=>x.id===target.dataset.photoItem):-1;
      if(from>=0&&to>=0&&from!==to){
        const [moved]=items.splice(from,1);
        items.splice(to,0,moved);
      }
      desktopDragId=null;draw();
    });
    grid.addEventListener('dragend',()=>{desktopDragId=null;draw()});

    // Mobile: hold the grip for a short moment, then drag over another photo.
    grid.addEventListener('pointerdown',e=>{
      const handle=e.target.closest('[data-photo-drag]');
      if(!handle)return;
      const id=handle.dataset.photoDrag;
      clearTimeout(touchTimer);
      touchTimer=setTimeout(()=>{
        touchDragId=id;
        lastTouchTarget=id;
        document.body.classList.add('photo-touch-sorting');
        if(navigator.vibrate)try{navigator.vibrate(20)}catch(err){}
      },280);
    });
    document.addEventListener('pointermove',e=>{
      if(!touchDragId)return;
      e.preventDefault();
      const under=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-photo-item]');
      const targetId=under?.dataset.photoItem;
      if(!targetId||targetId===lastTouchTarget||targetId===touchDragId)return;
      const from=items.findIndex(x=>x.id===touchDragId);
      const to=items.findIndex(x=>x.id===targetId);
      if(from>=0&&to>=0){
        const [moved]=items.splice(from,1);
        items.splice(to,0,moved);
        lastTouchTarget=targetId;
        draw();
      }
    },{passive:false});
    const endTouch=()=>{
      clearTimeout(touchTimer);
      touchDragId=null;
      lastTouchTarget=null;
      document.body.classList.remove('photo-touch-sorting');
    };
    document.addEventListener('pointerup',endTouch);
    document.addEventListener('pointercancel',endTouch);

    // Product-label photo uses the same safe optimization path.
    const labelInput=document.querySelector('[data-label-photo-input]');
    const labelPreview=document.querySelector('[data-label-photo-preview]');
    const labelPicker=document.querySelector('[data-label-photo-picker]');
    if(labelInput&&labelPreview&&labelPicker){
      labelInput.addEventListener('change',async e=>{
        const file=labelInput.files?.[0];
        e.stopImmediatePropagation();
        if(!file)return;
        const tmp={id:'label',source:file,file:null,url:null,hash:null,status:'processing',progress:5,step:'Подготовка…'};
        try{
          if(!allowed.includes(file.type))throw new Error('Разрешени са JPG, PNG и WebP.');
          if(file.size>maxSourceBytes)throw new Error('Снимката е прекалено голяма.');
          const optimized=await optimizeImage(tmp);
          window.marketPreparedLabelPhoto=optimized;
          labelPreview.innerHTML='<img src="'+URL.createObjectURL(optimized)+'" alt="Снимка на продуктовия етикет"><div class="label-photo-hint">'+formatBytes(file.size)+' → '+formatBytes(optimized.size)+'</div>';
          labelPreview.style.display='block';
          labelPicker.textContent='Смени снимката на етикета';
        }catch(err){
          alert(err?.message||'Снимката не можа да бъде обработена.');
        }
      },true);
    }

    // Preview modal uses the first prepared photo.
    const modal=document.querySelector('[data-ad-preview-modal]');
    document.querySelector('[data-ad-preview]')?.addEventListener('click',()=>{
      if(!modal)return;
      const first=readyItems()[0];
      const ph=modal.querySelector('[data-preview-photo]');
      if(ph)ph.innerHTML=first?`<img src="${first.url}" alt="">`:'Основна снимка';
      modal.querySelector('[data-preview-price]').textContent=(document.querySelector('[data-ad-price]')?.value||'—')+' €';
      modal.querySelector('[data-preview-description]').textContent=document.querySelector('[data-ad-description]')?.value||'Описанието ще се покаже тук.';
      modal.classList.add('open');
      modal.setAttribute('aria-hidden','false');
    });
    modal?.querySelectorAll('[data-close-preview]').forEach(x=>x.addEventListener('click',()=>{
      modal.classList.remove('open');modal.setAttribute('aria-hidden','true');
    }));

    draw();
  })();


  // v2.10 UI resilience and marketplace polish.
  (function marketV210(){
    const $$=(s,r=document)=>[...r.querySelectorAll(s)];
    const $=(s,r=document)=>r.querySelector(s);

    // ---------- Toasts ----------
    const toastHost=document.createElement('div');
    toastHost.className='market-toast-host';
    document.body.appendChild(toastHost);

    window.marketToast=(message,actionLabel,action)=>{
      const t=document.createElement('div');
      t.className='market-toast';
      const span=document.createElement('span');
      span.textContent=message;
      t.appendChild(span);
      if(actionLabel&&action){
        const b=document.createElement('button');
        b.type='button';b.textContent=actionLabel;
        b.addEventListener('click',()=>{try{action()}finally{t.remove()}});
        t.appendChild(b);
      }
      toastHost.appendChild(t);
      const timer=setTimeout(()=>t.remove(),3800);
      t.addEventListener('mouseenter',()=>clearTimeout(timer),{once:true});
      return t;
    };

    // ---------- Network / weak connection ----------
    const net=document.createElement('div');
    net.className='network-banner';
    net.style.display='none';
    net.innerHTML='<span data-net-text></span><button type="button">Опитай пак</button>';
    net.querySelector('button').addEventListener('click',()=>location.reload());
    document.body.appendChild(net);

    const drawNetwork=()=>{
      const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
      const weak=!!(c&&(c.saveData||['slow-2g','2g'].includes(c.effectiveType)));
      if(!navigator.onLine){
        net.classList.add('offline');net.style.display='flex';
        net.querySelector('[data-net-text]').textContent='Няма интернет връзка. Неприключените действия няма да бъдат изпратени.';
      }else if(weak){
        net.classList.remove('offline');net.style.display='flex';
        net.querySelector('[data-net-text]').textContent='Връзката е бавна. Снимките и обявите може да се зареждат по-дълго.';
      }else{
        net.style.display='none';
      }
    };
    addEventListener('online',()=>{drawNetwork();window.marketToast('Връзката е възстановена.')});
    addEventListener('offline',drawNetwork);
    navigator.connection?.addEventListener?.('change',drawNetwork);
    drawNetwork();

    // ---------- Lazy image blur ----------
    const readyImage=img=>img.classList.add('is-loaded');
    $$('img[data-blur-load]').forEach(img=>{
      if(img.complete)readyImage(img);
      else{
        img.addEventListener('load',()=>readyImage(img),{once:true});
        img.addEventListener('error',()=>readyImage(img),{once:true});
      }
    });

    // ---------- Short action locks: no repeated backend-intent events ----------
    document.addEventListener('click',e=>{
      const action=e.target.closest('[data-favorite],[data-follow-seller],[data-send-message],[data-submit-report],[data-share-listing],[data-compare],[data-security-action]');
      if(!action)return;
      if(action.dataset.actionBusy==='1'){
        e.preventDefault();e.stopImmediatePropagation();return;
      }
      action.dataset.actionBusy='1';
      setTimeout(()=>{delete action.dataset.actionBusy},550);
    },true);

    // ---------- Favorite toast + safe Undo ----------
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-favorite]');
      if(!btn)return;
      const id=btn.dataset.favorite;
      setTimeout(()=>{
        let fav=[];
        try{fav=JSON.parse(localStorage.getItem('favorites')||'[]')}catch(err){}
        const active=fav.includes(id);
        if(active){
          window.marketToast('Добавено в любими.');
        }else{
          window.marketToast('Премахнато от любими.','Върни',()=>{
            let a=[];
            try{a=JSON.parse(localStorage.getItem('favorites')||'[]')}catch(err){}
            if(!a.includes(id))a.push(id);
            localStorage.setItem('favorites',JSON.stringify(a));
            $$(`[data-favorite="${CSS.escape(id)}"]`).forEach(x=>x.classList.add('active'));
            window.marketToast('Върнато в любими.');
          });
        }
      },0);
    });

    // ---------- Seller block across listing / profile / chat ----------
    const blockedKey='marketBlockedSellers';
    const getBlocked=()=>{try{return JSON.parse(localStorage.getItem(blockedKey)||'[]')}catch(e){return []}};
    const setBlocked=a=>localStorage.setItem(blockedKey,JSON.stringify([...new Set(a)]));
    const currentSeller=document.body.dataset.sellerId||document.body.dataset.counterpartyId||'';
    const isBlocked=id=>getBlocked().includes(id);

    const drawBlockState=()=>{
      const id=currentSeller||'seller-1';
      const blocked=isBlocked(id);
      $$('[data-block-seller]').forEach(b=>{
        const bid=b.dataset.blockSeller||id;
        b.textContent=isBlocked(bid)?'Разблокирай продавача':'Блокирай продавача';
      });
      $$('[data-blocked-seller-banner],[data-chat-blocked-banner]').forEach(x=>x.style.display=blocked?'block':'none');
      if(blocked){
        $$('a[href="messages.html"],.message-action-button,[data-send-message]').forEach(x=>{
          if(!x.closest('.mobile-bottom')&&!x.closest('.site-header'))x.classList.add('is-blocked-contact');
        });
        const inp=$('[data-chat-input]');
        if(inp){inp.disabled=true;inp.placeholder='Потребителят е блокиран';}
      }else{
        $$('.is-blocked-contact').forEach(x=>x.classList.remove('is-blocked-contact'));
        const inp=$('[data-chat-input]');
        if(inp){inp.disabled=false;inp.placeholder='Напиши съобщение...';}
      }
    };
    document.addEventListener('click',e=>{
      const block=e.target.closest('[data-block-seller]');
      const unblock=e.target.closest('[data-unblock-seller]');
      if(!block&&!unblock)return;
      const id=(block?.dataset.blockSeller||unblock?.dataset.unblockSeller||currentSeller||'seller-1');
      let arr=getBlocked();
      if(isBlocked(id)){
        arr=arr.filter(x=>x!==id);
        setBlocked(arr);
        window.marketToast('Продавачът е разблокиран.');
      }else if(block){
        arr.push(id);setBlocked(arr);
        window.marketToast('Продавачът е блокиран.');
      }
      drawBlockState();
    });
    drawBlockState();

    // ---------- Account security prototype ----------
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-security-action]');
      if(!btn)return;
      const action=btn.dataset.securityAction;
      if(action==='change-email'){
        const email=$('[data-new-email]')?.value.trim()||'';
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
          window.marketToast('Въведи валиден нов email адрес.');
          $('[data-new-email]')?.focus();return;
        }
        localStorage.setItem('pendingEmailChange',email);
        window.marketToast('Изпратено е потвърждение към новия email.');
      }
      if(action==='reset-password')window.marketToast('Изпратен е защитен линк за нова парола.');
      if(action==='signout-all'){
        localStorage.setItem('signoutAllRequested',String(Date.now()));
        window.marketToast('Другите активни сесии ще бъдат прекратени.');
      }
    });

    // ---------- Smart results engine ----------
    const list=$('.listing-list');
    const rows=list?$$('.listing-row',list):[];
    if(list&&rows.length){
      const panel=$('.filter-panel');
      const search=$('[data-listing-search]');
      const sort=$('[data-sort-listings]');
      const count=$('[data-result-count]');
      const chips=$('[data-active-filters]');
      const chipWrap=$('[data-active-filters-wrap]');
      const zero=$('[data-zero-results]');
      const loadMore=$('[data-load-more]');
      const skeleton=$('[data-results-skeleton]');
      let visibleLimit=5;
      let lastChangedKey='';

      const clean=s=>(s||'').toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^\p{L}\p{N}]+/gu,' ').trim();

      const lev=(a,b)=>{
        const m=Array.from({length:b.length+1},(_,i)=>[i]);
        for(let j=0;j<=a.length;j++)m[0][j]=j;
        for(let i=1;i<=b.length;i++)for(let j=1;j<=a.length;j++)
          m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[j-1]===b[i-1]?0:1));
        return m[b.length][a.length];
      };

      const dictionary=['bosch','siemens','samsung','gorenje','daikin','tesy','пералня','перални','сушилня','сушилни','хладилник','хладилници','фризер','фризери','съдомиялна','съдомиялни','фурна','фурни','печка','печки','котлон','котлони','аспиратор','аспиратори','климатик','климатици','бойлер','бойлери','софия','пловдив','варна','бургас','кюстендил'];
      const correctWord=w=>{
        if(w.length<4||dictionary.includes(w))return w;
        let best=w,score=99;
        dictionary.forEach(k=>{const d=lev(w,k);if(d<score){score=d;best=k}});
        const limit=w.length>=7?2:1;
        return score<=limit?best:w;
      };
      const synonymMap={
        'печка':['готварска','готварски','печки'],
        'печки':['готварска','готварски','печка'],
        'пералня':['перални'],
        'перални':['пералня'],
        'сушилня':['сушилни'],
        'сушилни':['сушилня'],
        'хладилник':['хладилници'],
        'хладилници':['хладилник'],
        'съдомиялна':['съдомиялни'],
        'съдомиялни':['съдомиялна']
      };
      const queryTokens=q=>{
        const base=clean(q).split(/\s+/).filter(Boolean).map(correctWord);
        const out=[...base];
        base.forEach(w=>(synonymMap[w]||[]).forEach(x=>out.push(x)));
        if(clean(q).includes('пералня със сушилня')||clean(q).includes('пералня сушилня'))out.push('перални','сушилни');
        return [...new Set(out)];
      };
      const rowHay=r=>clean([r.dataset.search,r.dataset.brand,r.dataset.city,r.dataset.state,r.dataset.category].join(' '));

      const controls={
        category:$('#categoryFilter'),brand:$('#brandFilter'),state:$('#stateFilter'),
        city:$('#cityFilter'),seller:$('#sellerTypeFilter'),
        minPrice:$('#minPrice'),maxPrice:$('#maxPrice'),q:search
      };

      // Query from header / shared URL.
      const urlQ=new URLSearchParams(location.search).get('q');
      if(urlQ&&search&&!search.value)search.value=urlQ;

      const value=k=>(controls[k]?.value||'').trim();
      const labelFor=(k,v)=>({
        q:`Търсене: ${v}`,
        category:v,brand:v,state:v,city:v,
        seller:v==='private'?'Частно лице':v==='trader'?'Търговец':v,
        minPrice:`от ${v} €`,maxPrice:`до ${v} €`
      }[k]||v);

      const matches=(r)=>{
        const q=value('q'), tokens=queryTokens(q), hay=rowHay(r);
        const qOk=!q||tokens.every(t=>hay.includes(t))||tokens.some(t=>hay.includes(t));
        const min=parseFloat(value('minPrice')||'0')||0;
        const max=parseFloat(value('maxPrice')||'999999')||999999;
        return qOk &&
          (!value('category')||clean(r.dataset.category)===clean(value('category'))) &&
          (!value('brand')||r.dataset.brand===value('brand')) &&
          (!value('state')||r.dataset.state===value('state')) &&
          (!value('city')||clean(r.dataset.city)===clean(value('city'))) &&
          (!value('seller')||r.dataset.sellerType===value('seller')) &&
          (+r.dataset.price>=min) && (+r.dataset.price<=max);
      };

      const sortedRows=()=>{
        const arr=rows.filter(matches);
        const mode=sort?.value||'Най-нови';
        arr.sort((a,b)=>{
          if(mode.includes('ниска'))return (+a.dataset.price)-(+b.dataset.price);
          if(mode.includes('висока'))return (+b.dataset.price)-(+a.dataset.price);
          return (+b.dataset.created||0)-(+a.dataset.created||0);
        });
        return arr;
      };

      const drawCounts=()=>{
        const specs=[
          ['#brandFilter','brand'],['#stateFilter','state'],['#sellerTypeFilter','seller']
        ];
        specs.forEach(([sel,key])=>{
          const control=$(sel);if(!control||control.tagName!=='SELECT')return;
          [...control.options].forEach((opt,i)=>{
            if(i===0){opt.textContent=opt.dataset.baseLabel||opt.textContent.replace(/\s+\(\d+\)$/,'');opt.dataset.baseLabel=opt.textContent;return}
            const raw=opt.value||opt.textContent.replace(/\s+\(\d+\)$/,'');
            opt.dataset.baseLabel=opt.dataset.baseLabel||raw;
            const c=rows.filter(r=>{
              if(key==='brand')return r.dataset.brand===raw;
              if(key==='state')return r.dataset.state===raw;
              if(key==='seller')return r.dataset.sellerType===raw;
              return true;
            }).length;
            opt.textContent=opt.dataset.baseLabel+' ('+c+')';
          });
        });
      };

      const drawChips=()=>{
        if(!chips||!chipWrap)return;
        const active=[];
        Object.entries(controls).forEach(([k,c])=>{
          if(!c)return;
          const v=(c.value||'').trim();
          if(v)active.push([k,v]);
        });
        chips.innerHTML=active.map(([k,v])=>`<span class="filter-chip">${labelFor(k,v)} <button type="button" data-remove-filter="${k}" aria-label="Премахни">×</button></span>`).join('');
        chipWrap.style.display=active.length?'flex':'none';
      };

      const apply=()=>{
        sortedRows().forEach(r=>list.appendChild(r));
        const matched=sortedRows();
        rows.forEach(r=>r.style.display='none');
        matched.slice(0,visibleLimit).forEach(r=>r.style.display='grid');
        if(count)count.textContent=matched.length+' обяви';
        if(zero)zero.style.display=matched.length?'none':'block';
        if(loadMore){
          loadMore.style.display=matched.length>visibleLimit?'flex':'none';
          loadMore.textContent=`Покажи още (${Math.min(5,matched.length-visibleLimit)})`;
        }
        drawChips();
      };

      Object.entries(controls).forEach(([key,c])=>{
        if(!c)return;
        ['input','change'].forEach(evt=>c.addEventListener(evt,()=>{
          lastChangedKey=key;visibleLimit=5;apply();
        }));
      });
      sort?.addEventListener('change',()=>{lastChangedKey='sort';apply()});
      loadMore?.addEventListener('click',()=>{visibleLimit+=5;apply()});

      document.addEventListener('click',e=>{
        const remove=e.target.closest('[data-remove-filter]');
        if(remove){
          const key=remove.dataset.removeFilter;
          if(controls[key])controls[key].value='';
          lastChangedKey='';visibleLimit=5;apply();
        }
        if(e.target.closest('[data-clear-filters]')){
          Object.values(controls).forEach(c=>{if(c)c.value=''});
          lastChangedKey='';visibleLimit=5;apply();
        }
        if(e.target.closest('[data-remove-last-filter]')){
          const keys=[lastChangedKey,'q','maxPrice','minPrice','seller','city','state','brand','category'].filter(Boolean);
          const key=keys.find(k=>controls[k]&&(controls[k].value||'').trim());
          if(key)controls[key].value='';
          lastChangedKey='';visibleLimit=5;apply();
        }
      });

      drawCounts();
      // Very short skeleton to avoid a blank jump; backend fetch will later control this state.
      rows.forEach(r=>r.style.visibility='hidden');
      setTimeout(()=>{
        if(skeleton)skeleton.classList.add('is-hidden');
        rows.forEach(r=>r.style.visibility='');
        apply();
      },220);
    }

    // ---------- Publishing: required fields, no double publish, no accidental exit ----------
    const post=$('.post-layout');
    if(post){
      let dirty=false, safeToLeave=false, publishing=false;
      const sections=$$('.form-section');
      const stepDots=$$('.step');
      const prev=$('[data-prev]'),next=$('[data-next]'),publish=$('[data-publish]');
      const touchedControls=$$('input,select,textarea',post);

      const clearFieldError=ctrl=>{
        const field=ctrl.closest('.field');if(!field)return;
        field.classList.remove('field-error');
        field.querySelector('.field-error-message')?.remove();
      };
      const markFieldError=(ctrl,msg)=>{
        const field=ctrl.closest('.field');if(!field)return;
        clearFieldError(ctrl);
        field.classList.add('field-error');
        const m=document.createElement('span');m.className='field-error-message';m.textContent=msg;
        ctrl.insertAdjacentElement('afterend',m);
      };
      const gotoStep=i=>{
        sections.forEach((s,n)=>s.classList.toggle('active',n===i));
        stepDots.forEach((s,n)=>s.classList.toggle('active',n<=i));
        if(prev)prev.style.visibility=i===0?'hidden':'visible';
        if(next)next.style.display=i===sections.length-1?'none':'inline-flex';
        if(publish)publish.style.display=i===sections.length-1?'inline-flex':'none';
      };
      const requiredIn=section=>$$('[data-smart-required]',section);
      const validControl=ctrl=>{
        const v=(ctrl.value||'').trim();
        if(!v)return false;
        if(ctrl.type==='number'&&(+v<=0))return false;
        return true;
      };
      const validateSection=section=>{
        let first=null;
        requiredIn(section).forEach(ctrl=>{
          clearFieldError(ctrl);
          if(!validControl(ctrl)){markFieldError(ctrl,'Попълни това поле.');first=first||ctrl}
        });
        return first;
      };
      const validateAll=()=>{
        let bad=null,badIndex=-1;
        sections.forEach((s,i)=>{const x=validateSection(s);if(x&&badIndex<0){bad=x;badIndex=i}});
        const photos=(window.marketPreparedPhotos||[]).length;
        if(photos<2){
          const picker=$('[data-photo-picker]');
          if(!bad){bad=picker;badIndex=3}
          const status=$('[data-photo-status]');
          if(status){status.textContent='Добави поне 2 готови снимки.';status.classList.add('photo-status-error')}
        }
        return {bad,badIndex};
      };

      touchedControls.forEach(c=>{
        c.addEventListener('input',()=>{dirty=true;clearFieldError(c)});
        c.addEventListener('change',()=>{dirty=true;clearFieldError(c)});
      });

      next?.addEventListener('click',e=>{
        const active=sections.findIndex(s=>s.classList.contains('active'));
        const bad=validateSection(sections[active]||sections[0]);
        if(bad){
          e.preventDefault();e.stopImmediatePropagation();
          bad.scrollIntoView({behavior:'smooth',block:'center'});
          setTimeout(()=>bad.focus?.(),250);
          window.marketToast('Провери маркираното поле.');
        }
      },true);

      publish?.addEventListener('click',e=>{
        e.preventDefault();e.stopImmediatePropagation();
        if(publishing)return;
        const {bad,badIndex}=validateAll();
        if(bad){
          if(badIndex>=0)gotoStep(badIndex);
          setTimeout(()=>{bad.scrollIntoView?.({behavior:'smooth',block:'center'});bad.focus?.()},80);
          window.marketToast('Обявата още не е готова за публикуване.');
          return;
        }

        // Basic moderation remains client-side demo; server repeats it in production.
        const desc=($('[data-ad-description]')?.value||'').trim();
        const defects=($('[data-ad-defects]')?.value||'').trim();
        const combined=(desc+' '+defects).toLowerCase();
        const blockedWords=['порнография','наркотици','фалшив документ'];
        const contactPattern=/(https?:\/\/|www\.|t\.me\/|telegram|whatsapp|viber|(?:\+359|0)8[7-9]\d[\s.-]?\d{3}[\s.-]?\d{3})/i;
        const errors=[];
        if(blockedWords.some(w=>combined.includes(w)))errors.push('Текстът съдържа съдържание, което не е разрешено.');
        if(contactPattern.test(desc))errors.push('Не поставяй телефон или външни контакти в описанието.');
        if(errors.length){
          const f=$('[data-moderation-feedback]');
          if(f){f.className='moderation-feedback error';f.innerHTML='<strong>Обявата още не може да бъде публикувана.</strong><br>'+errors.join('<br>');f.style.display='block';f.scrollIntoView({behavior:'smooth',block:'center'})}
          return;
        }

        publishing=true;safeToLeave=true;
        publish.dataset.actionBusy='1';
        publish.classList.add('is-publishing');
        publish.textContent='Публикуване…';
        window.marketToast('Публикуваме обявата…');
        setTimeout(()=>{
          localStorage.setItem('demoAdPublished','1');
          location.href='my-ads.html?published=1';
        },650);
      },true);

      addEventListener('beforeunload',e=>{
        if(dirty&&!safeToLeave){
          e.preventDefault();
          e.returnValue='';
        }
      });
      // Internal links should still warn using the browser's native navigation guard.
      post.dataset.unsavedGuard='1';
    }
  })();

})();
