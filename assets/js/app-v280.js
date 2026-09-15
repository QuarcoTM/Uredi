
(function(){
  window.MARKET_BUILD='2.97';
  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
  const store={get:(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
  window.Market={store};
  const marketEscapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[ch]));
  const marketSafeLocalURL=(value,fallback='#')=>{
    try{
      const raw=String(value||'').trim();
      if(!raw)return fallback;
      if(/^\s*(javascript:|data:|vbscript:|file:)/i.test(raw))return fallback;
      if(raw.startsWith('//'))return fallback;

      const u=new URL(raw,location.href);
      if(u.origin!==location.origin)return fallback;
      if(!['http:','https:'].includes(u.protocol))return fallback;

      // Preserve safe relative paths such as assets/img/products/washer-blue.svg.
      // The previous implementation kept only the last filename, which broke
      // "Наскоро разглеждани" images on the homepage.
      if(!/^[a-z][a-z0-9+.-]*:/i.test(raw) && !raw.startsWith('/')){
        return raw;
      }

      return u.pathname+u.search+u.hash;
    }catch(e){return fallback}
  };
  window.Market.escapeHTML=marketEscapeHTML;
  const fav=store.get('favorites',[]), cmp=store.get('compare',[]);
  $$('[data-favorite]').forEach(b=>{const id=b.dataset.favorite;if(fav.includes(id))b.classList.add('active');b.addEventListener('click',e=>{e.preventDefault();let a=store.get('favorites',[]);a.includes(id)?a=a.filter(x=>x!==id):a.push(id);store.set('favorites',a);b.classList.toggle('active');});});
  const phoneBtn=$('[data-phone]');if(phoneBtn)phoneBtn.addEventListener('click',()=>{phoneBtn.textContent=phoneBtn.dataset.phone;phoneBtn.classList.remove('secondary-btn');phoneBtn.classList.add('primary-btn');});
  const fbtn=$('[data-filter-toggle]'), panel=$('.filter-panel');if(fbtn&&panel)fbtn.addEventListener('click',()=>panel.classList.toggle('open'));
  const filters=$$('.filter-panel input,.filter-panel select');
  const search=$('[data-listing-search]');
  function filterRows(){
    if((window.SITE_CONFIG||{}).supabaseEnabled)return;
    const rows=$$('.listing-row');if(!rows.length)return;
    const norm=s=>(s||'').toString().toLowerCase().trim();
    const categoryAlias=s=>{
      const v=norm(s);
      if(v==='печки'||v==='готварска печка'||v==='готварски печки')return 'готварски печки';
      return v;
    };
    const text=(search?.value||'').trim().toLowerCase();
    const category=$('#categoryFilter')?.value||'';
    const brand=$('#brandFilter')?.value||'';
    const state=$('#stateFilter')?.value||'';
    const seller=$('#sellerTypeFilter')?.value||'';
    const min=parseFloat($('#minPrice')?.value||'0')||0;
    const max=parseFloat($('#maxPrice')?.value||'999999')||999999;
    const city=$('#cityFilter')?.value||'';
    rows.forEach(r=>{
      const ok=(!text||(r.dataset.search||'').includes(text)) &&
        (!category||categoryAlias(r.dataset.category)===categoryAlias(category)) &&
        (!brand||r.dataset.brand===brand) &&
        (!state||r.dataset.state===state) &&
        (!seller||r.dataset.sellerType===seller) &&
        (+r.dataset.price>=min) && (+r.dataset.price<=max) &&
        (!city||r.dataset.city===city);
      r.style.display=ok?'grid':'none';
    });
    const count=rows.filter(r=>r.style.display!=='none').length;
    const cc=$('[data-result-count]');if(cc)cc.textContent=count+' обяви';
  }
  filters.forEach(x=>x.addEventListener('change',filterRows));filters.forEach(x=>x.addEventListener('input',filterRows));if(search)search.addEventListener('input',filterRows);
  const cookie=$('.cookie-bar');if(cookie&&!localStorage.getItem('cookieChoice'))setTimeout(()=>cookie.classList.add('show'),300);$$('[data-cookie]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem('cookieChoice',b.dataset.cookie);cookie?.classList.remove('show');}));
  const sections=$$('.form-section');let step=0;function showStep(n){step=Math.max(0,Math.min(sections.length-1,n));sections.forEach((s,i)=>s.classList.toggle('active',i===step));$$('.step').forEach((x,i)=>x.classList.toggle('active',i<=step));const prev=$('[data-prev]'), next=$('[data-next]'), pub=$('[data-publish]');if(prev)prev.style.visibility=step===0?'hidden':'visible';if(next)next.style.display=step===sections.length-1?'none':'inline-flex';if(pub)pub.style.display=step===sections.length-1?'inline-flex':'none';window.scrollTo({top:0,behavior:'smooth'});}if(sections.length){showStep(0);$('[data-next]')?.addEventListener('click',()=>showStep(step+1));$('[data-prev]')?.addEventListener('click',()=>showStep(step-1));if(!(window.SITE_CONFIG||{}).supabaseEnabled);}
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

  // v2.18: mobile chat remembers the open conversation on refresh/back-forward.
  (function improveMobileChatV218(){
    const shell=$('.chat-shell');
    if(!shell)return;

    const product=shell.querySelector('.chat-product');
    const stateOpenKey='marketChatOpenV218';
    const stateConversationKey='marketActiveConversationV218';

    const setOpen=(open)=>{
      shell.classList.toggle('chat-open',!!open);
      sessionStorage.setItem(stateOpenKey,open?'1':'0');
    };

    const selectConversation=(conversation)=>{
      if(!conversation)return;
      shell.querySelectorAll('.conversation').forEach(x=>x.classList.remove('active'));
      conversation.classList.add('active');
      const id=conversation.dataset.conversationId||'';
      if(id)sessionStorage.setItem(stateConversationKey,id);
    };

    if(product&&!product.querySelector('.mobile-chat-back')){
      const back=document.createElement('button');
      back.type='button';
      back.className='mobile-chat-back';
      back.setAttribute('aria-label','Назад към разговорите');
      back.textContent='←';
      product.insertBefore(back,product.firstChild);
      back.addEventListener('click',()=>{
        setOpen(false);
      });
    }

    shell.querySelectorAll('.conversation').forEach(c=>c.addEventListener('click',()=>{
      selectConversation(c);
      setOpen(true);
    }));

    // Only restore the open conversation for Reload / Back-Forward.
    // A fresh tap on the bottom "Чат" tab still opens the conversation list.
    const navEntry=performance.getEntriesByType?.('navigation')?.[0];
    const navigationType=navEntry?.type||'navigate';
    const shouldRestore=(navigationType==='reload'||navigationType==='back_forward')
      && sessionStorage.getItem(stateOpenKey)==='1';

    const savedId=sessionStorage.getItem(stateConversationKey);
    const savedConversation=savedId
      ? shell.querySelector(`.conversation[data-conversation-id="${CSS.escape(savedId)}"]`)
      : null;

    if(savedConversation)selectConversation(savedConversation);
    if(shouldRestore)setOpen(true);
    else if(navigationType==='navigate')setOpen(false);
  })();


  // v1.9: comparison becomes stacked cards on phones instead of a wide table.
  void 0;

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
    const cfg=window.MarketMonetization?.getPlatform?.()||window.SITE_CONFIG||{};
    if(cfg.freeBeta===false && cfg.paidServicesEnabled===true)return;
    document.documentElement.classList.add('free-beta');
    $$('a[href="promote.html"],a[href="checkout.html"]').forEach(a=>a.remove());
    $$('.badge-vip,.badge-top,.promo-badge').forEach(x=>x.remove());
    $$('.listing-row.vip,.listing-row.top').forEach(x=>{x.classList.remove('vip','top')});
  })();

  // v2.44: VIP -> TOP -> normal. "Изкачи" changes recency among normal ads.
  void 0;


  // v2.50 public FREE BETA campaign messaging.
  (function betaCampaignPublicV250(){
    const M=window.MarketMonetization;
    const blocks=[...document.querySelectorAll('[data-beta-public-campaign]')];
    if(!M||!blocks.length)return;

    const campaign=M.getBonusCampaign?.()||{};
    const platform=M.getPlatform?.()||{};
    const config=M.getConfig?.()||{};
    const product=config.products?.[campaign.creditProductId];
    const end=campaign.redeemUntil?new Date(campaign.redeemUntil):null;
    const expired=end&&!Number.isNaN(end.getTime())&&end.getTime()<Date.now();

    // Static FREE BETA build: the public campaign remains visible.
    // Real global on/off control will move to Supabase.
    if(expired||!product){
      blocks.forEach(x=>x.hidden=true);
      return;
    }

    const max=Number(campaign.maxVerifiedUsers||500);
    const qty=Number(campaign.qty||1);
    const productName=product.name||'TOP · 7 дни';
    const title='Първите '+max+' потвърдени регистрации получават '+qty+' × '+productName;
    const copy=(end&&!Number.isNaN(end.getTime()))
      ? 'Бонусът може да се активира до '+end.toLocaleDateString('bg-BG')+'. Няма плащане.'
      : 'Бонусът е безплатен. Няма плащане.';

    blocks.forEach(block=>{
      const t=block.querySelector('[data-beta-campaign-title]');
      const c=block.querySelector('[data-beta-campaign-copy]');
      if(t)t.textContent=title;
      if(c)c.textContent=copy;
      block.hidden=false;
    });
  })();

  // v2.50 private / trader registration fields.
  (function registrationProfileV250(){
    const type=document.querySelector('[data-register-type]');
    const panel=document.querySelector('[data-register-trader-fields]');
    if(!type||!panel)return;
    const sync=()=>{
      const dealer=type.value==='dealer';
      panel.hidden=!dealer;
      panel.querySelectorAll('[data-register-trader-required]').forEach(input=>{
        input.required=dealer;
        input.setAttribute('aria-required',dealer?'true':'false');
      });
    };
    type.addEventListener('change',sync);
    sync();
  })();

  // v2.52 registration password rules and confirmation.
  (function registrationPasswordV252(){
    const pass=document.querySelector('[data-register-password]');
    const confirm=document.querySelector('[data-register-password-confirm]');
    const status=document.querySelector('[data-password-match-status]');
    if(!pass||!confirm||!status)return;

    const sync=()=>{
      if(!confirm.value){
        status.hidden=true;
        status.textContent='';
        status.classList.remove('is-ok','is-error');
        confirm.removeAttribute('aria-invalid');
        return;
      }
      const same=pass.value===confirm.value;
      status.hidden=false;
      status.textContent=same?'Паролите съвпадат.':'Паролите не съвпадат.';
      status.classList.toggle('is-ok',same);
      status.classList.toggle('is-error',!same);
      confirm.setAttribute('aria-invalid',same?'false':'true');
    };
    pass.addEventListener('input',sync);
    confirm.addEventListener('input',sync);
  })();

  // v2.2: email verification flow for the static prototype.
  void 0;

  // v2.2: image picker + lightweight pre-publication checks.
  void 0;

  // v2.36 recently viewed: repair old stored image paths from v2.30-v2.32.
  void 0;

  // Report submission is handled by Supabase; never simulate success.
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
        window.marketToast?.('Разрешени са JPG, PNG и WebP.');
        input.value='';
        return;
      }
      if(file.size>10*1024*1024){
        window.marketToast?.('Снимката трябва да е до 10 MB.');
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
    addEventListener('load',()=>navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(()=>{}));
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
  void 0;

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



  // v2.39 price history: current price is always the final history row.
  (function priceHistoryV239(){
    let pop=null;

    const parseValue=text=>{
      const n=parseFloat(String(text||'').replace(/[^\d.,]/g,'').replace(',','.'));
      return Number.isFinite(n)?n:0;
    };

    const priceTextFor=btn=>{
      const wrap=btn.closest('[data-price-with-trend],.price-with-trend');
      return (
        wrap?.querySelector('.detail-price,.price')?.textContent?.trim() ||
        btn.dataset.currentPrice ||
        ''
      );
    };

    const todayBG=()=>{
      const d=new Date();
      return new Intl.DateTimeFormat('bg-BG',{
        day:'2-digit',month:'2-digit',year:'numeric'
      }).format(d);
    };

    const getHistory=btn=>{
      const parsed=(btn.dataset.priceHistory||'')
        .split(';')
        .filter(Boolean)
        .map(x=>{
          const [price,date]=x.split('|');
          return {
            price:(price||'').trim(),
            date:(date||'').trim(),
            value:parseValue(price)
          };
        })
        .filter(x=>x.price && x.value>0);

      const currentPrice=priceTextFor(btn);
      const currentValue=parseValue(currentPrice);

      if(currentValue>0){
        const last=parsed[parsed.length-1];

        // This is the important guard: if HTML/backend history forgot the
        // current price, append it automatically instead of showing stale data.
        if(!last || Math.abs(last.value-currentValue)>0.001){
          parsed.push({
            price:currentPrice,
            date:btn.dataset.currentPriceDate||todayBG(),
            value:currentValue,
            current:true
          });
        }else{
          last.current=true;
          if(btn.dataset.currentPriceDate)last.date=btn.dataset.currentPriceDate;
        }
      }

      return parsed;
    };

    const syncIndicator=btn=>{
      const rows=getHistory(btn);
      if(rows.length<2){
        btn.hidden=true;
        return;
      }

      const prev=rows[rows.length-2].value;
      const current=rows[rows.length-1].value;

      btn.classList.remove('price-trend-down','price-trend-up');

      if(current<prev){
        btn.hidden=false;
        btn.classList.add('price-trend-down');
        btn.dataset.priceTrend='down';
        btn.setAttribute('aria-label','Цената е намалена. Виж историята на цената.');
        btn.title='Цената е намалена · История на цената';
      }else if(current>prev){
        btn.hidden=false;
        btn.classList.add('price-trend-up');
        btn.dataset.priceTrend='up';
        btn.setAttribute('aria-label','Цената е повишена. Виж историята на цената.');
        btn.title='Цената е повишена · История на цената';
      }else{
        // Locked product rule: no movement = no indicator.
        btn.hidden=true;
      }
    };

    const ensure=()=>{
      if(pop)return pop;
      pop=document.createElement('div');
      pop.className='price-history-popover';
      pop.innerHTML=
        '<div class="price-history-popover-card" role="dialog" aria-modal="true" aria-labelledby="price-history-title-v239">'+
          '<div class="price-history-popover-head">'+
            '<h3 id="price-history-title-v239">История на цената</h3>'+
            '<button type="button" aria-label="Затвори">×</button>'+
          '</div>'+
          '<div class="price-history-popover-list"></div>'+
        '</div>';
      document.body.appendChild(pop);
      pop.querySelector('button').addEventListener('click',()=>pop.classList.remove('open'));
      pop.addEventListener('click',e=>{
        if(e.target===pop)pop.classList.remove('open');
      });
      return pop;
    };

    const render=btn=>{
      const rows=getHistory(btn);
      const p=ensure();
      const list=p.querySelector('.price-history-popover-list');

      list.innerHTML=rows.map((row,i)=>{
        let cls='same',symbol='•';
        if(i>0){
          const prev=rows[i-1].value;
          if(row.value<prev){cls='down';symbol='↓'}
          else if(row.value>prev){cls='up';symbol='↑'}
        }

        const current=row.current || i===rows.length-1;
        const currentLabel=current
          ? '<small class="price-history-current">Текуща цена</small>'
          : '';

        return (
          `<div class="${current?'is-current':''}">`+
            `<span>${marketEscapeHTML(row.date)}${currentLabel}</span>`+
            `<strong>${marketEscapeHTML(row.price)}</strong>`+
            `<em class="price-history-change ${cls}" aria-hidden="true">${symbol}</em>`+
          `</div>`
        );
      }).join('') ||
      '<div><span>Няма предишни промени.</span><strong>—</strong><em class="price-history-change same">•</em></div>';

      p.classList.add('open');
    };

    document.querySelectorAll('[data-price-history]').forEach(syncIndicator);

    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-price-history]');
      if(!btn || btn.hidden)return;
      e.preventDefault();
      e.stopPropagation();
      render(btn);
    },true);

    document.addEventListener('keydown',e=>{
      if(e.key==='Escape' && pop?.classList.contains('open')){
        pop.classList.remove('open');
      }
    });
  })();


  // v2.6 guest favorites page: localStorage works without registration.
  void 0;


  // v2.25 category / brand landing pages with real scoped filtering.
  (function landingRoutingV225(){
    const body=document.body;
    const kind=body?.dataset?.landingKind;
    if(!kind)return;

    const params=new URLSearchParams(location.search);
    const rawName=(params.get('name')||'').trim();
    const brand=(params.get('brand')||'').trim();

    const categoryAliases={
      'Печки':'Готварски печки',
      'Готварска печка':'Готварски печки',
      'Готварски печки':'Готварски печки'
    };
    const canonicalCategory=name=>categoryAliases[name]||name;

    const categories=[
      'Перални','Сушилни','Перални със сушилни','Хладилници','Фризери',
      'Съдомиялни','Фурни','Готварски печки','Котлони','Аспиратори',
      'Микровълнови','Климатици','Бойлери','Друга бяла техника'
    ];
    const brands=['Bosch','Samsung','LG','AEG','Siemens'];

    const title=document.querySelector('[data-landing-title]');
    const subtitle=document.querySelector('[data-landing-subtitle]');
    const label=document.querySelector('[data-landing-label]');
    const links=document.querySelector('[data-landing-links]');
    const breadcrumb=document.querySelector('.breadcrumb span:last-child');
    const categoryFilter=document.querySelector('#categoryFilter');
    const brandFilter=document.querySelector('#brandFilter');

    if(kind==='category'){
      const name=canonicalCategory(rawName);
      const valid=categories.includes(name);
      const heading=valid?(brand?`${name} ${brand}`:name):'Обяви';

      if(title)title.textContent=heading;
      if(subtitle)subtitle.textContent=valid
        ? `Актуални обяви за ${heading.toLowerCase()} с директен контакт с продавача.`
        : 'Разгледай всички актуални обяви.';
      if(breadcrumb)breadcrumb.textContent=valid?name:'Обяви';
      if(label)label.textContent='Популярни марки:';
      if(links&&valid){
        links.innerHTML=brands.map(b=>
          `<a class="${b===brand?'active':''}" href="category.html?name=${encodeURIComponent(name)}&brand=${encodeURIComponent(b)}">${b}</a>`
        ).join('');
      }

      if(valid&&categoryFilter){
        const option=[...categoryFilter.options].find(o=>canonicalCategory(o.value||o.textContent)===name);
        if(option)categoryFilter.value=option.value;
        categoryFilter.disabled=true;
        categoryFilter.setAttribute('aria-label',`Категория: ${name}`);
        categoryFilter.dataset.routeLocked='1';
      }
      if(brand&&brandFilter){
        const option=[...brandFilter.options].find(o=>(o.value||o.textContent)===brand);
        if(option)brandFilter.value=option.value;
      }

      document.title=heading+' · Пазар за бяла техника';
    }

    if(kind==='brand'){
      const name=rawName;
      const heading=name?`${name} · бяла техника`:'Марка';
      if(title)title.textContent=heading;
      if(subtitle)subtitle.textContent=`Разгледай актуалните обяви за ${name||'избраната марка'} по категории.`;
      if(breadcrumb)breadcrumb.textContent=name||'Марка';
      if(label)label.textContent='Категории:';
      if(links)links.innerHTML=categories.map(c=>
        `<a href="category.html?name=${encodeURIComponent(c)}&brand=${encodeURIComponent(name)}">${c}</a>`
      ).join('');

      if(name&&brandFilter){
        const option=[...brandFilter.options].find(o=>(o.value||o.textContent)===name);
        if(option)brandFilter.value=option.value;
        brandFilter.disabled=true;
        brandFilter.setAttribute('aria-label',`Марка: ${name}`);
        brandFilter.dataset.routeLocked='1';
      }

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
          window.marketToast?.(err?.message||'Снимката не можа да бъде обработена.');
        }
      },true);
    }

    // v2.50 full mobile preview before publishing.
    const modal=document.querySelector('[data-ad-preview-modal]');
    const selectedText=el=>el?.selectedOptions?.[0]?.textContent?.trim()||'';
    let previewScrollY=0;
    let previewBodyState=null;
    let previewTouchY=0;
    const previewTouchStart=e=>{previewTouchY=e.touches?.[0]?.clientY||0};
    const previewTouchMove=e=>{
      if(!modal?.classList.contains('open'))return;
      const sheet=e.target?.closest?.('.ad-preview-sheet');
      if(!sheet){e.preventDefault();return}
      const y=e.touches?.[0]?.clientY||previewTouchY;
      const delta=y-previewTouchY;
      previewTouchY=y;
      const canScroll=sheet.scrollHeight>sheet.clientHeight+1;
      const atTop=sheet.scrollTop<=0;
      const atBottom=sheet.scrollTop+sheet.clientHeight>=sheet.scrollHeight-1;
      if(!canScroll||(atTop&&delta>0)||(atBottom&&delta<0))e.preventDefault();
    };
    const previewWheel=e=>{
      if(!modal?.classList.contains('open'))return;
      const sheet=e.target?.closest?.('.ad-preview-sheet');
      if(!sheet)e.preventDefault();
    };
    const lockPreviewScroll=()=>{
      if(!modal||previewBodyState)return;
      previewScrollY=window.scrollY||window.pageYOffset||0;
      previewBodyState={
        position:document.body.style.position,
        top:document.body.style.top,
        left:document.body.style.left,
        right:document.body.style.right,
        width:document.body.style.width,
        height:document.body.style.height,
        overflow:document.body.style.overflow,
        touchAction:document.body.style.touchAction,
        htmlOverflow:document.documentElement.style.overflow,
        htmlHeight:document.documentElement.style.height,
        scrollOverflow:document.scrollingElement?.style?.overflow||''
      };
      document.documentElement.classList.add('ad-preview-open');
      document.body.classList.add('ad-preview-open');
      document.documentElement.style.overflow='hidden';
      document.documentElement.style.height='100%';
      document.body.style.position='fixed';
      document.body.style.top=`-${previewScrollY}px`;
      document.body.style.left='0';
      document.body.style.right='0';
      document.body.style.width='100%';
      document.body.style.height='100%';
      document.body.style.overflow='hidden';
      document.body.style.touchAction='none';
      if(document.scrollingElement)document.scrollingElement.style.overflow='hidden';
      document.addEventListener('touchstart',previewTouchStart,{passive:true,capture:true});
      document.addEventListener('touchmove',previewTouchMove,{passive:false,capture:true});
      document.addEventListener('wheel',previewWheel,{passive:false,capture:true});
    };
    const unlockPreviewScroll=()=>{
      if(!previewBodyState)return;
      const state=previewBodyState;previewBodyState=null;
      document.removeEventListener('touchstart',previewTouchStart,true);
      document.removeEventListener('touchmove',previewTouchMove,true);
      document.removeEventListener('wheel',previewWheel,true);
      document.documentElement.classList.remove('ad-preview-open');
      document.body.classList.remove('ad-preview-open');
      document.documentElement.style.overflow=state.htmlOverflow;
      document.documentElement.style.height=state.htmlHeight;
      document.body.style.position=state.position;
      document.body.style.top=state.top;
      document.body.style.left=state.left;
      document.body.style.right=state.right;
      document.body.style.width=state.width;
      document.body.style.height=state.height;
      document.body.style.overflow=state.overflow;
      document.body.style.touchAction=state.touchAction;
      if(document.scrollingElement)document.scrollingElement.style.overflow=state.scrollOverflow;
      window.scrollTo(0,previewScrollY);
    };
    const closePreview=()=>{
      if(!modal)return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden','true');
      unlockPreviewScroll();
    };

    document.querySelector('[data-ad-preview]')?.addEventListener('click',()=>{
      if(!modal)return;

      const first=readyItems()[0];
      const ph=modal.querySelector('[data-preview-photo]');
      if(ph)ph.innerHTML=first?`<img src="${first.url}" alt="">`:'Основна снимка';

      const category=selectedText(document.querySelector('[data-ad-category]'))||'Категория';
      let brand=selectedText(document.querySelector('[data-ad-brand]'))||'Марка';
      if(brand==='Друга марка'){
        brand=document.querySelector('[data-other-brand-input]')?.value.trim()||'Друга марка';
      }
      const model=document.querySelector('[data-ad-model]')?.value.trim()||'';
      const condition=selectedText(document.querySelector('[data-ad-condition]'))||'Състояние';
      const warranty=selectedText(document.querySelector('[data-ad-warranty]'))||'Без гаранция';
      const city=document.querySelector('[data-ad-city]')?.value.trim()||'Градът не е попълнен';
      const delivery=selectedText(document.querySelector('[data-ad-delivery]'))||'Не е избрано';
      const price=document.querySelector('[data-ad-price]')?.value||'—';
      const description=document.querySelector('[data-ad-description]')?.value.trim()||'Описанието не е попълнено.';
      const defects=document.querySelector('[data-ad-defects]')?.value.trim()||'';
      const phone=(document.querySelector('[data-ad-phone]')?.value||'').replace(/\D+/g,'');
      const phoneVisible=!!document.querySelector('[data-ad-phone-visible]')?.checked;

      const title=(brand+(model?' '+model:'')).trim();

      const set=(sel,value)=>{
        const el=modal.querySelector(sel);
        if(el)el.textContent=value;
      };
      set('[data-preview-category]',category);
      set('[data-preview-title]',title||category);
      set('[data-preview-price]',price+' €');
      set('[data-preview-condition]',condition);
      set('[data-preview-city]',city);
      set('[data-preview-warranty]',warranty);
      set('[data-preview-description]',description);
      set('[data-preview-delivery]',delivery);
      set('[data-preview-phone]',phone&&phoneVisible?phone:'Само чат');

      const defectsWrap=modal.querySelector('[data-preview-defects-wrap]');
      if(defectsWrap){
        defectsWrap.hidden=!defects;
        if(defects)set('[data-preview-defects]',defects);
      }

      const promoInput=document.querySelector('input[name="supa-post-promotion"]:checked');
      const promoLabel=promoInput?.closest('.post-promo-option')?.querySelector('b')?.textContent?.replace(/^Използвай\s+1\s*[×x]\s*/i,'')?.trim()||'';
      let promoPreview=modal.querySelector('[data-preview-promotion]');
      if(!promoPreview){
        promoPreview=document.createElement('div');
        promoPreview.className='ad-preview-promotion';
        promoPreview.dataset.previewPromotion='';
        const contact=modal.querySelector('.ad-preview-contact');
        contact?.insertAdjacentElement('afterend',promoPreview);
      }
      if(promoPreview){
        promoPreview.innerHTML=promoInput?.value
          ? `<span>Промотиране</span><strong>${promoLabel||'Избрана активация'}</strong>`
          : '<span>Промотиране</span><strong>Без промотиране</strong>';
      }
      lockPreviewScroll();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden','false');
      const sheet=modal.querySelector('.ad-preview-sheet');if(sheet)sheet.scrollTop=0;
    });

    modal?.querySelectorAll('[data-close-preview]').forEach(x=>x.addEventListener('click',closePreview));
    modal?.querySelector('[data-preview-publish]')?.addEventListener('click',()=>{
      closePreview();
      document.querySelector('[data-publish]')?.click();
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&modal?.classList.contains('open'))closePreview();
    });

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

      ;

      addEventListener('beforeunload',e=>{
        if(dirty&&!safeToLeave&&post.dataset.supabaseSafeLeave!=='1'){
          e.preventDefault();
          e.returnValue='';
        }
      });
      // Internal links should still warn using the browser's native navigation guard.
      post.dataset.unsavedGuard='1';
    }
  })();


  // v2.11 password, data-rights, appeal, chat-safety and maintenance UI.
  void 0;


  // v2.12 profile hub actions
  void 0;


  // v2.13 mobile navigation: notification badge + repeat-tab scroll to top.
  (function mobileNavV213(){
    const badge=document.querySelector('[data-notification-badge]');
    if(badge){
      let unread=parseInt(localStorage.getItem('marketUnreadNotifications')||'',10);
      if(Number.isNaN(unread)){
        unread=0;
        localStorage.setItem('marketUnreadNotifications','0');
      }
      if(unread>0){
        badge.textContent=unread>9?'9+':String(unread);
        badge.classList.add('has-unread');
        badge.setAttribute('aria-hidden','false');
        const link=badge.closest('a');
        if(link)link.setAttribute('aria-label',`Известия, ${unread} непрочетени`);
      }else{
        badge.textContent='';
        badge.classList.remove('has-unread');
        badge.setAttribute('aria-hidden','true');
      }
    }

    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    document.querySelectorAll('.mobile-bottom a').forEach(link=>{
      link.addEventListener('click',e=>{
        const target=(link.getAttribute('href')||'').split('?')[0].toLowerCase();
        if(target===file && link.classList.contains('is-active')){
          e.preventDefault();
          window.scrollTo({top:0,behavior:'smooth'});
        }
      });
    });
  })();


  // v2.15 notifications, recent searches, menus, archive and accessibility.
  (function marketV215(){
    const $=(s,r=document)=>r.querySelector(s);
    const $$=(s,r=document)=>[...r.querySelectorAll(s)];

    // ----- Correct active mobile navigation, including Favorites.
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    const key=
      file==='index.html'?'home':
      file==='favorites.html'?'favorites':
      ['post-ad.html','edit-ad.html'].includes(file)?'add':
      file==='messages.html'?'chat':
      ['profile.html','profile-edit.html','account-security.html','profile-settings.html','data-rights.html','my-ads.html','saved-searches.html'].includes(file)?'profile':
      '';
    $$('.mobile-bottom a[data-nav]').forEach(a=>{
      const on=a.dataset.nav===key;
      a.classList.toggle('is-active',on);
      if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });

    // ----- Recent searches: local, max 5, shown only when the field is empty.
    const recentKey='marketRecentSearchesV215';
    const getRecent=()=>{try{return JSON.parse(localStorage.getItem(recentKey)||'[]')}catch(e){return[]}};
    const saveRecent=q=>{
      q=(q||'').trim();
      if(!q)return;
      const arr=[q,...getRecent().filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,5);
      localStorage.setItem(recentKey,JSON.stringify(arr));
    };
    $$('.header-search,.mobile-header-search').forEach(form=>{
      const input=$('input',form);
      if(!input||$('.recent-searches-panel',form))return;
      input.setAttribute('aria-autocomplete','list');

      const panel=document.createElement('div');
      panel.className='recent-searches-panel';
      panel.hidden=true;
      panel.setAttribute('role','listbox');
      form.appendChild(panel);

      const close=()=>{panel.hidden=true;input.setAttribute('aria-expanded','false')};
      const render=()=>{
        if(input.value.trim()){close();return}
        const items=getRecent();
        if(!items.length){close();return}
        panel.innerHTML=`<div class="recent-searches-head"><span>Последни търсения</span><button type="button" data-recent-clear-all>Изчисти</button></div>`+
          items.map((q,i)=>`<div class="recent-search-row"><a role="option" href="listings.html?q=${encodeURIComponent(q)}">${marketEscapeHTML(q)}</a><button type="button" data-recent-remove="${i}" aria-label="Премахни ${marketEscapeHTML(q)}">×</button></div>`).join('');
        panel.hidden=false;
        input.setAttribute('aria-expanded','true');
      };
      input.addEventListener('focus',render);
      input.addEventListener('input',render);
      form.addEventListener('submit',()=>saveRecent(input.value));
      panel.addEventListener('click',e=>{
        const rm=e.target.closest('[data-recent-remove]');
        const clear=e.target.closest('[data-recent-clear-all]');
        const link=e.target.closest('.recent-search-row a');
        if(link)saveRecent(link.textContent);
        if(rm){
          e.preventDefault();
          const arr=getRecent();arr.splice(+rm.dataset.recentRemove,1);
          localStorage.setItem(recentKey,JSON.stringify(arr));render();
        }
        if(clear){
          localStorage.removeItem(recentKey);close();input.focus();
        }
      });
      document.addEventListener('click',e=>{if(!form.contains(e.target))close()});
      input.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    });

    // ----- Generic three-dot menus.
    const closeMenus=(except=null)=>{
      $$('[data-overflow-menu],[data-chat-menu]').forEach(menu=>{
        if(menu===except)return;
        menu.hidden=true;
        const trigger=menu.parentElement?.querySelector('[data-overflow-trigger],[data-chat-menu-trigger]');
        trigger?.setAttribute('aria-expanded','false');
      });
    };
    document.addEventListener('click',e=>{
      const trigger=e.target.closest('[data-overflow-trigger],[data-chat-menu-trigger]');
      if(trigger){
        e.preventDefault();
        const menu=trigger.parentElement.querySelector('[data-overflow-menu],[data-chat-menu]');
        const open=menu?.hidden;
        closeMenus(menu);
        if(menu){
          menu.hidden=!open;
          trigger.setAttribute('aria-expanded',open?'true':'false');
          if(open)menu.querySelector('a,button')?.focus();
        }
        return;
      }
      if(!e.target.closest('.overflow-menu'))closeMenus();
    });

    // ----- Cookie preference center.
    const cookieStateKey='marketCookiePreferencesV215';
    const getCookieState=()=>{
      try{return JSON.parse(localStorage.getItem(cookieStateKey)||'null')}catch(e){return null}
    };
    const drawCookiePrefs=()=>{
      const state=getCookieState();
      const a=$('[data-cookie-pref="analytics"]');
      const m=$('[data-cookie-pref="marketing"]');
      if(a)a.checked=!!state?.analytics;
      if(m)m.checked=!!state?.marketing;
      const status=$('[data-cookie-choice-status]');
      if(status){
        status.textContent=!state?'Не е избрано':
          state.analytics&&state.marketing?'Всички':
          state.analytics?'Необходими + аналитични':
          state.marketing?'Необходими + маркетинг':'Само необходими';
      }
    };
    $$('[data-cookie-save]').forEach(btn=>btn.addEventListener('click',()=>{
      const type=btn.dataset.cookieSave;
      let state={necessary:true,analytics:false,marketing:false};
      if(type==='all')state={necessary:true,analytics:true,marketing:true};
      if(type==='selection'){
        state.analytics=!!$('[data-cookie-pref="analytics"]')?.checked;
        state.marketing=!!$('[data-cookie-pref="marketing"]')?.checked;
      }
      localStorage.setItem(cookieStateKey,JSON.stringify(state));
      localStorage.setItem('cookieChoice',state.analytics||state.marketing?'custom':'necessary');
      document.querySelector('.cookie-bar')?.classList.remove('show');
      drawCookiePrefs();
      window.marketToast?.('Предпочитанията за бисквитки са запазени.');
    }));
    drawCookiePrefs();

    // ----- Escape closes all dialogs/menus and restores sane focus.
    document.addEventListener('keydown',e=>{
      if(e.key!=='Escape')return;
      closeMenus();
      closeVerified();
      document.querySelectorAll('.search-suggest.open').forEach(x=>x.classList.remove('open'));
      document.querySelectorAll('.recent-searches-panel').forEach(x=>x.hidden=true);
    });

    // ----- Accessible labels for controls that have only placeholder/text context.
    $$('input,select,textarea').forEach(el=>{
      if(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby'))return;
      const field=el.closest('.field');
      const label=field?.querySelector('label')?.textContent?.trim();
      if(label)el.setAttribute('aria-label',label.replace('*','').trim());
      else if(el.getAttribute('placeholder'))el.setAttribute('aria-label',el.getAttribute('placeholder'));
    });
  })();


  // v2.16 notifications + chat behavior.
  void 0;





  // v2.18 cleanup for existing conversations.
  void 0;





  // v2.21 consolidated chat: drafts, delivery status, unread divider, typing and images.
  void 0;

  // v2.21 suspicious-auth guard: rate limiting + CAPTCHA placeholder only after rapid failures.
  void 0;

  // v2.21 security sessions / passkey prototype.
  void 0;

  // v2.21 client-side error monitoring buffer for Admin Health.
  (function errorMonitorV221(){
    const key='marketClientErrorsV221';
    const push=(payload)=>{
      let arr=[];try{arr=JSON.parse(localStorage.getItem(key)||'[]')}catch(e){}
      arr.unshift({...payload,time:new Date().toISOString(),page:location.pathname});
      localStorage.setItem(key,JSON.stringify(arr.slice(0,50)));
    };
    window.addEventListener('error',e=>push({type:'error',message:e.message||'Unknown error',source:e.filename||'',line:e.lineno||0}));
    window.addEventListener('unhandledrejection',e=>push({type:'promise',message:String(e.reason?.message||e.reason||'Unhandled promise rejection')}));
    window.marketLogError=(message,extra={})=>push({type:'manual',message,...extra});
  })();


  // v2.22 mobile keyboard handling + custom brand field.
  (function marketV222(){
    const $=(s,r=document)=>r.querySelector(s);

    // ----- "Друга марка" in posting form.
    const brand=$('[data-ad-brand]');
    const otherField=$('[data-other-brand-field]');
    const otherInput=$('[data-other-brand-input]');

    const syncOtherBrand=()=>{
      if(!brand||!otherField||!otherInput)return;
      const isOther=brand.value==='Друга'||brand.options?.[brand.selectedIndex]?.textContent?.trim()==='Друга марка';
      otherField.hidden=!isOther;
      otherField.style.display=isOther?'block':'none';
      otherField.setAttribute('aria-hidden',isOther?'false':'true');
      if(isOther){
        otherInput.setAttribute('data-smart-required','');
        otherInput.setAttribute('aria-required','true');
        otherInput.required=true;
        otherInput.disabled=false;
        // Keep the new field immediately usable after choosing “Друга марка”.
        setTimeout(()=>{try{otherInput.focus({preventScroll:true})}catch{}},0);
      }else{
        otherInput.removeAttribute('data-smart-required');
        otherInput.removeAttribute('aria-required');
        otherInput.required=false;
        otherInput.disabled=true;
        otherInput.value='';
        otherInput.closest('.field')?.classList.remove('field-error');
        otherInput.closest('.field')?.querySelector('.field-error-message')?.remove();
      }
    };
    brand?.addEventListener('change',syncOtherBrand);
    brand?.addEventListener('input',syncOtherBrand);
    syncOtherBrand();

    // ----- iPhone / mobile keyboard: resize chat to the visual viewport.
    const body=document.body;
    const input=$('[data-chat-input]');
    const scroller=$('[data-chat-scroll]');

    if(body.classList.contains('messages-page') && input){
      const vv=window.visualViewport;

      const updateViewport=()=>{
        const height=vv?.height || window.innerHeight;
        document.documentElement.style.setProperty('--chat-visible-height',`${Math.round(height)}px`);

        const keyboardLikelyOpen =
          document.activeElement===input &&
          (window.innerHeight-height)>120;

        body.classList.toggle('chat-keyboard-open',keyboardLikelyOpen);

        if(keyboardLikelyOpen && scroller){
          requestAnimationFrame(()=>{
            scroller.scrollTop=scroller.scrollHeight;
          });
        }
      };

      vv?.addEventListener('resize',updateViewport);
      vv?.addEventListener('scroll',updateViewport);
      window.addEventListener('resize',updateViewport);
      input.addEventListener('focus',()=>setTimeout(updateViewport,40));
      input.addEventListener('blur',()=>setTimeout(updateViewport,80));
      updateViewport();

      // After sending on mobile, close the keyboard instead of leaving it over the chat.
      const form=$('[data-chat-form]');
      form?.addEventListener('submit',()=>{
        if(matchMedia('(max-width:760px)').matches){
          setTimeout(()=>{
            input.blur();
            body.classList.remove('chat-keyboard-open');
            updateViewport();
          },80);
        }
      });
    }
  })();


  // v2.24: future non-essential scripts stay blocked until explicit cookie consent.
  (function consentGateV224(){
    const prefKey='marketCookiePreferencesV215';
    const read=()=>{
      try{
        const s=JSON.parse(localStorage.getItem(prefKey)||'null');
        return s&&typeof s==='object'
          ? {necessary:true,analytics:!!s.analytics,marketing:!!s.marketing}
          : {necessary:true,analytics:false,marketing:false};
      }catch(e){return {necessary:true,analytics:false,marketing:false}}
    };
    const can=category=>{
      if(category==='necessary')return true;
      const s=read();
      return category==='analytics'?s.analytics:category==='marketing'?s.marketing:false;
    };
    const activate=()=>{
      document.querySelectorAll('script[type="text/plain"][data-consent-category]').forEach(old=>{
        const cat=old.dataset.consentCategory;
        if(!can(cat)||old.dataset.consentActivated==='1')return;
        const s=document.createElement('script');
        [...old.attributes].forEach(a=>{
          if(!['type','data-consent-category','data-consent-activated'].includes(a.name))s.setAttribute(a.name,a.value);
        });
        if(old.src)s.src=old.src; else s.textContent=old.textContent;
        old.dataset.consentActivated='1'; old.after(s);
      });
      window.dispatchEvent(new CustomEvent('market:consentchange',{detail:read()}));
    };
    window.marketConsent={get:read,can,refresh:activate};
    document.addEventListener('click',e=>{
      const banner=e.target.closest('[data-cookie]');
      if(banner){
        localStorage.setItem(prefKey,JSON.stringify(
          banner.dataset.cookie==='all'
            ? {necessary:true,analytics:true,marketing:true}
            : {necessary:true,analytics:false,marketing:false}
        ));
        setTimeout(activate,0);
      }
      if(e.target.closest('[data-cookie-save]'))setTimeout(activate,0);
    },true);
    activate();
  })();


  // v2.25 category-routing safety: never show another category on a category landing page.
  (function categoryRoutingSafetyV225(){
    const body=document.body;
    if(body?.dataset?.landingKind!=='category')return;
    const params=new URLSearchParams(location.search);
    const aliases={'Печки':'Готварски печки','Готварска печка':'Готварски печки'};
    const category=aliases[params.get('name')]||params.get('name')||'';
    const zero=document.querySelector('[data-zero-results]');
    if(zero&&category){
      const h=zero.querySelector('h3');
      const p=zero.querySelector('p');
      if(h)h.textContent=`Няма активни обяви в „${category}“`;
      if(p)p.textContent='Категорията е отворена правилно. При реални обяви тук ще се показват само уреди от тази категория.';
    }
  })();


  // v2.29 archive semantics: archived != closed.
  void 0;


  // v2.30: strip invisible control characters from user-editable text fields.
  // HTML characters are NOT removed; output is encoded instead.
  (function sanitizeTextControlsV230(){
    const clean=value=>String(value||'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'');
    document.addEventListener('input',e=>{
      const el=e.target;
      if(!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement))return;
      const type=(el.type||'text').toLowerCase();
      if(!['text','search','email','tel','url',''].includes(type) && !(el instanceof HTMLTextAreaElement))return;
      const next=clean(el.value);
      if(next!==el.value){
        const start=el.selectionStart,end=el.selectionEnd;
        el.value=next;
        try{el.setSelectionRange(start,end)}catch(err){}
      }
    },true);
  })();


  // v2.35 iOS Safari: do not restore/open the header search after refresh.
  // Search suggestions/recent searches may open only after an intentional
  // pointer/touch/keyboard interaction with the search field.
  (function preventAccidentalSearchFocusV235(){
    const searchInputs=()=>[...document.querySelectorAll('.header-search input,.mobile-header-search input')];
    let intentionalUntil=0;

    const markIntentional=e=>{
      const input=e.target.closest?.('.header-search input,.mobile-header-search input');
      if(!input)return;
      intentionalUntil=Date.now()+1200;
    };

    document.addEventListener('pointerdown',markIntentional,true);
    document.addEventListener('touchstart',markIntentional,{capture:true,passive:true});
    document.addEventListener('keydown',e=>{
      if(e.target.matches?.('.header-search input,.mobile-header-search input')){
        intentionalUntil=Date.now()+1200;
      }
    },true);

    const closeSearchPanels=input=>{
      const form=input?.closest?.('.header-search,.mobile-header-search');
      form?.querySelectorAll('.search-suggest,.recent-searches-panel').forEach(panel=>{
        panel.classList?.remove('open');
        panel.hidden=true;
      });
      input?.setAttribute('aria-expanded','false');
    };

    const neutralizeRestoredFocus=()=>{
      const active=document.activeElement;
      if(
        active instanceof HTMLInputElement &&
        active.matches('.header-search input,.mobile-header-search input') &&
        Date.now()>intentionalUntil
      ){
        active.blur();
        closeSearchPanels(active);
      }
    };

    // Safari can restore form focus during reload/pageshow, even when the user
    // only tapped the browser Refresh button while the page was still moving.
    const nav=performance.getEntriesByType?.('navigation')?.[0];
    const restoredNavigation=nav && (nav.type==='reload'||nav.type==='back_forward');

    if(restoredNavigation){
      requestAnimationFrame(neutralizeRestoredFocus);
      setTimeout(neutralizeRestoredFocus,0);
      setTimeout(neutralizeRestoredFocus,80);
      setTimeout(neutralizeRestoredFocus,250);
    }

    window.addEventListener('pageshow',e=>{
      if(e.persisted || restoredNavigation){
        intentionalUntil=0;
        requestAnimationFrame(neutralizeRestoredFocus);
        setTimeout(neutralizeRestoredFocus,80);
      }
    });

    // Do not let iOS save the search field as the focused element for reload.
    const blurHeaderSearch=()=>{
      searchInputs().forEach(input=>{
        if(document.activeElement===input)input.blur();
        closeSearchPanels(input);
      });
    };
    window.addEventListener('pagehide',blurHeaderSearch);
    window.addEventListener('beforeunload',blurHeaderSearch);

    // Final guard: an unintentional focus event after reload is rejected.
    document.addEventListener('focusin',e=>{
      const input=e.target.closest?.('.header-search input,.mobile-header-search input');
      if(!input || Date.now()<=intentionalUntil)return;
      if(restoredNavigation){
        requestAnimationFrame(()=>{
          if(document.activeElement===input){
            input.blur();
            closeSearchPanels(input);
          }
        });
      }
    },true);
  })();


  // v2.38 QA fixes: contact, safety report and edit-ad actions.
  void 0;


  // v2.40: remove fake prototype counters saved by older frontend builds.
  (function removePrototypeMetricsV240(){
    localStorage.setItem('marketUnreadChatCount','0');
    localStorage.setItem('marketUnreadNotifications','0');

    const remove=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key && key.startsWith('marketPhoneTaps:'))remove.push(key);
    }
    remove.forEach(key=>localStorage.removeItem(key));

    document.querySelectorAll('[data-chat-badge],[data-notification-badge]').forEach(b=>{
      b.textContent='';
      b.classList.remove('has-unread');
      b.setAttribute('aria-hidden','true');
    });
  })();


  // v2.41 monetization: wallet, promote page, checkout and instant promotion during publishing.
  void 0;


  // v2.42 "Избрани обяви": VIP only -> if none TOP only -> if none latest bumped.
  void 0;


  // v2.44: show VIP/TOP on the current listing only when promotion data says so.
  void 0;


  // v2.47 Promotions & bonuses account page.
  void 0;

})();


// v2.53 required-field consistency pass.


// v2.54: seller reviews, reserved listings, price-drop notifications, distance search and security UI.
void 0;


// v2.55: seller-only completed-sale flow with explicit buyer selection.
void 0;


  // v2.70 professional character limits and live counters.
  // Counts every entered Unicode character, including spaces, punctuation and new lines.
  (function characterLimitsV270(){
    const controls=[...document.querySelectorAll('[data-char-counter][data-max-chars]')];
    if(!controls.length)return;

    const charCount=value=>Array.from(String(value??'')).length;
    const update=el=>{
      const max=Math.max(0,Number(el.dataset.maxChars||el.getAttribute('maxlength')||0));
      if(!max)return;
      const count=charCount(el.value);
      let counter=el._urediCharCounter;
      if(!counter){
        counter=document.createElement('div');
        counter.className='char-counter';
        counter.setAttribute('aria-live','polite');
        counter.setAttribute('aria-atomic','true');
        counter.dataset.for=el.id||'';
        if(el.matches('[data-chat-input]'))counter.classList.add('chat-char-counter');
        el.insertAdjacentElement('afterend',counter);
        el._urediCharCounter=counter;
        if(el.id){
          counter.id=`${el.id}-char-counter`;
          const described=(el.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);
          if(!described.includes(counter.id)){described.push(counter.id);el.setAttribute('aria-describedby',described.join(' '));}
        }
      }
      counter.textContent=`${count}/${max}`;
      counter.classList.toggle('is-near-limit',count>=Math.ceil(max*.9)&&count<=max);
      counter.classList.toggle('is-at-limit',count===max);
      counter.classList.toggle('is-over-limit',count>max);
      el.classList.toggle('char-limit-exceeded',count>max);
      return count<=max;
    };

    const refreshAll=()=>controls.forEach(update);
    controls.forEach(el=>{
      // Native maxlength prevents ordinary typing/paste from going beyond the same visible limit.
      const max=Number(el.dataset.maxChars||0);
      if(max>0)el.setAttribute('maxlength',String(max));
      el.addEventListener('input',()=>update(el));
      el.addEventListener('change',()=>update(el));
      el.addEventListener('blur',()=>update(el));
      update(el);
    });

    document.addEventListener('submit',()=>setTimeout(refreshAll,0),true);
    document.addEventListener('click',e=>{
      if(e.target.closest('[data-send-message],.chat-send-btn,[data-publish],[data-register-submit],[data-contact-submit],[data-safety-submit],[data-edit-save]')){
        setTimeout(refreshAll,0);
      }
    },true);
    window.addEventListener('pageshow',refreshAll);
    setTimeout(refreshAll,250);
    setTimeout(refreshAll,1000);

    // Numeric text fields (phone, EIK, year) remain character-counted but reject letters and punctuation.
    document.querySelectorAll('[data-digits-only]').forEach(el=>{
      const clean=()=>{
        const max=Number(el.dataset.maxChars||el.getAttribute('maxlength')||999);
        const next=String(el.value||'').replace(/\D+/g,'').slice(0,max);
        if(next!==el.value)el.value=next;
        update(el);
      };
      el.addEventListener('input',clean,true);
      el.addEventListener('paste',()=>setTimeout(clean,0));
      clean();
    });

    window.UrediCharCounters={refresh:update,refreshAll,count:charCount};
  })();


// Keep the page still behind filters and dialogs, including iOS edge swipes.
(()=>{
  const body=document.body,html=document.documentElement;
  let locked=false,savedX=0,savedY=0,lastX=0,lastY=0;
  const visible=el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
  const surfaces=()=>[
    ...[...document.querySelectorAll('.filter-panel.open')].filter(el=>getComputedStyle(el).position==='fixed'),
    ...document.querySelectorAll('[role="dialog"][aria-modal="true"],.price-history-popover.open .price-history-popover-card,[data-gallery-modal].open')
  ].filter(el=>!el.closest('[data-ad-preview-modal]')&&visible(el));
  function update(){
    const active=surfaces().length>0;
    if(active===locked)return;
    locked=active;
    if(active){
      savedX=window.scrollX;savedY=window.scrollY;
      body.style.setProperty('--overlay-scroll-top',`-${savedY}px`);
      body.classList.add('overlay-scroll-locked-v302');html.classList.add('overlay-scroll-locked-v302');
    }else{
      body.classList.remove('overlay-scroll-locked-v302');html.classList.remove('overlay-scroll-locked-v302');
      body.style.removeProperty('--overlay-scroll-top');
      const old=html.style.scrollBehavior;html.style.scrollBehavior='auto';
      window.scrollTo(savedX,savedY);html.style.scrollBehavior=old;
    }
  }
  function canScroll(target,dx,dy){
    const roots=surfaces(),root=roots.find(el=>el.contains(target));
    if(!root)return false;
    for(let el=target instanceof Element?target:target.parentElement;el;el=el.parentElement){
      const css=getComputedStyle(el);
      if(Math.abs(dx)>Math.abs(dy)&&/(auto|scroll)/.test(css.overflowX)&&el.scrollWidth>el.clientWidth+1&&((dx<0&&el.scrollLeft>0)||(dx>0&&el.scrollLeft+el.clientWidth<el.scrollWidth-1)))return true;
      if(/(auto|scroll)/.test(css.overflowY)&&el.scrollHeight>el.clientHeight+1&&((dy<0&&el.scrollTop>0)||(dy>0&&el.scrollTop+el.clientHeight<el.scrollHeight-1)))return true;
      if(el===root)break;
    }
    return false;
  }
  document.addEventListener('touchstart',e=>{lastX=e.touches[0]?.clientX||0;lastY=e.touches[0]?.clientY||0},{passive:true,capture:true});
  document.addEventListener('touchmove',e=>{
    if(!locked||e.touches.length!==1)return;
    const x=e.touches[0].clientX,y=e.touches[0].clientY,dx=lastX-x,dy=lastY-y;lastX=x;lastY=y;
    if(!canScroll(e.target,dx,dy)&&e.cancelable)e.preventDefault();
  },{passive:false,capture:true});
  document.addEventListener('wheel',e=>{if(locked&&!e.ctrlKey&&!canScroll(e.target,e.deltaX,e.deltaY)&&e.cancelable)e.preventDefault()},{passive:false,capture:true});
  new MutationObserver(update).observe(body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','aria-hidden','open']});
  window.addEventListener('resize',update);window.addEventListener('pageshow',update);update();
})();
