
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

})();
