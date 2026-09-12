
(function(){
  window.MARKET_BUILD='2.60';
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
  $$('[data-compare]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.compare;let a=store.get('compare',[]);if(!a.includes(id)){if(a.length>=3){window.marketToast?.('Можеш да сравняваш до 3 обяви.');return;}a.push(id);store.set('compare',a);b.textContent='Добавено за сравнение';}}));
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
  const sections=$$('.form-section');let step=0;function showStep(n){step=Math.max(0,Math.min(sections.length-1,n));sections.forEach((s,i)=>s.classList.toggle('active',i===step));$$('.step').forEach((x,i)=>x.classList.toggle('active',i<=step));const prev=$('[data-prev]'), next=$('[data-next]'), pub=$('[data-publish]');if(prev)prev.style.visibility=step===0?'hidden':'visible';if(next)next.style.display=step===sections.length-1?'none':'inline-flex';if(pub)pub.style.display=step===sections.length-1?'inline-flex':'none';window.scrollTo({top:0,behavior:'smooth'});}if(sections.length){showStep(0);$('[data-next]')?.addEventListener('click',()=>showStep(step+1));$('[data-prev]')?.addEventListener('click',()=>showStep(step-1));if(!(window.SITE_CONFIG||{}).supabaseEnabled)$('[data-publish]')?.addEventListener('click',()=>{localStorage.setItem('demoAdPublished','1');location.href='my-ads.html?published=1';});}
  const send=$('[data-send-message]');if(send){send.addEventListener('click',()=>{const inp=$('[data-chat-input]');const val=inp.value.trim();if(!val)return;const wrap=$('.chat-messages');const row=document.createElement('div');row.className='bubble-row me';row.innerHTML='<div class="bubble">'+val.replace(/[<>]/g,'')+'<div class="bubble-time">сега</div></div>';wrap.appendChild(row);inp.value='';wrap.scrollTop=wrap.scrollHeight;});}
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
        return '<div class="mobile-compare-spec"><span>'+marketEscapeHTML(label)+'</span><strong>'+marketEscapeHTML(value)+'</strong></div>';
      }).join('');
      const safeImg=marketSafeLocalURL(img,'');
      card.innerHTML='<div class="mobile-compare-head">'+(safeImg?'<img src="'+marketEscapeHTML(safeImg)+'" alt="">':'')+'<div><strong>'+marketEscapeHTML(title)+'</strong><div class="price">'+marketEscapeHTML(price)+'</div></div></div>'+specs;
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
    const cfg=window.MarketMonetization?.getPlatform?.()||window.SITE_CONFIG||{};
    if(cfg.freeBeta===false && cfg.paidServicesEnabled===true)return;
    document.documentElement.classList.add('free-beta');
    $$('a[href="promote.html"],a[href="checkout.html"]').forEach(a=>a.remove());
    $$('.badge-vip,.badge-top,.promo-badge').forEach(x=>x.remove());
    $$('.listing-row.vip,.listing-row.top').forEach(x=>{x.classList.remove('vip','top')});
  })();

  // v2.44: VIP -> TOP -> normal. "Изкачи" changes recency among normal ads.
  (function listingSortV244(){
    const select=$('[data-sort-listings]'),list=$('.listing-list'),M=window.MarketMonetization;
    if((window.SITE_CONFIG||{}).supabaseEnabled)return;
    if(!select||!list)return;
    const ms=v=>{if(!v)return 0;const n=Number(v);if(Number.isFinite(n))return n;const d=new Date(v);return Number.isNaN(d.getTime())?0:d.getTime()};
    const clear=row=>{row.querySelector('[data-ranking-promo-badge]')?.remove();row.classList.remove('vip','top')};
    const state=row=>M?.promotionPlacementEnabled?.()?(M.getRankingState?.(row.dataset.listingId||'')||{tier:null,priority:0}):{tier:null,priority:0};
    const decorate=(row,st)=>{clear(row);if(!M?.promotionPlacementEnabled?.()||!st.tier||st.tier==='bump')return;const host=row.querySelector('.listing-info>div:first-child')||row.querySelector('.listing-info');if(!host)return;const b=document.createElement('span');b.dataset.rankingPromoBadge='';b.className='badge '+(st.tier==='vip'?'badge-vip':'badge-top');b.textContent=st.tier==='vip'?'VIP':'TOP';host.appendChild(b);row.classList.add(st.tier)};
    const sort=()=>{
      const mode=select.value||select.options[select.selectedIndex]?.textContent||'',rows=[...list.querySelectorAll('.listing-row')].map((row,index)=>({row,index,state:state(row)}));
      rows.forEach(x=>decorate(x.row,x.state));
      rows.sort((a,b)=>{
        if(a.state.priority!==b.state.priority)return b.state.priority-a.state.priority;
        if(mode.includes('ниска'))return ((+a.row.dataset.price)-(+b.row.dataset.price))||a.index-b.index;
        if(mode.includes('висока'))return ((+b.row.dataset.price)-(+a.row.dataset.price))||a.index-b.index;
        const ac=ms(a.row.dataset.created),bc=ms(b.row.dataset.created);
        const ae=a.state.tier==='bump'?Math.max(ac,ms(a.state.bumpedAt)):ac,be=b.state.tier==='bump'?Math.max(bc,ms(b.state.bumpedAt)):bc;
        return (be-ae)||a.index-b.index;
      });
      rows.forEach(x=>list.appendChild(x.row));
    };
    select.addEventListener('change',sort);
    window.addEventListener('market:listing-promotion-changed',sort);
    window.addEventListener('storage',ev=>{if(ev.key==='marketListingPromotionsV241')sort()});
    setInterval(sort,60000);sort();
  })();


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
  (function emailVerification(){
    if((window.SITE_CONFIG||{}).supabaseEnabled)return;
    $('[data-register-submit]')?.addEventListener('click',()=>localStorage.setItem('marketEmailVerified','0'));
    $('[data-email-verified]')?.addEventListener('click',()=>{
      localStorage.setItem('marketEmailVerified','1');
      const M=window.MarketMonetization,user=M?.getCurrentUser?.();
      const order=Number(user?.verifiedRegistrationOrder);
      if(M&&Number.isInteger(order)&&order>0){
        M.grantEarlyBetaBonus?.(user.id,order,true);
      }
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
    const msg=a==='sold'?'Обявата е маркирана като продадена.':a==='deactivate'?'Обявата е деактивирана.':a==='delete'?'Обявата е изтрита.':'';
    if(msg)window.marketToast?.(msg);
  }));


  // v2.36 recently viewed: repair old stored image paths from v2.30-v2.32.
  (function(){
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase(),key='marketRecentViewedV23';
    const fallbackImage='assets/img/products/washer-blue.svg';

    const normalizeImage=value=>{
      const raw=String(value||'').trim();
      if(!raw)return fallbackImage;

      // Older builds accidentally stored only "washer-blue.svg" instead of
      // "assets/img/products/washer-blue.svg". Repair that data automatically.
      if(/^[A-Za-z0-9._-]+\.(?:svg|png|jpe?g|webp)$/i.test(raw)){
        return 'assets/img/products/'+raw;
      }
      if(/^products\//i.test(raw)){
        return 'assets/img/'+raw;
      }

      return marketSafeLocalURL(raw,fallbackImage);
    };

    const get=()=>{
      try{
        const parsed=JSON.parse(localStorage.getItem(key)||'[]');
        if(!Array.isArray(parsed))return[];

        let changed=false;
        const repaired=parsed.map(item=>{
          const fixed={...item};
          const image=normalizeImage(fixed.image);
          if(image!==fixed.image){
            fixed.image=image;
            changed=true;
          }
          return fixed;
        });

        if(changed)localStorage.setItem(key,JSON.stringify(repaired));
        return repaired;
      }catch(e){
        return[];
      }
    };

    if(file==='listing.html'){
      const item={
        id:'bosch-serie-6',
        title:document.querySelector('.detail-card h1')?.textContent?.trim()||'Bosch Serie 6',
        price:document.querySelector('.detail-price')?.textContent?.trim()||'329 €',
        image:normalizeImage(document.querySelector('.gallery-main img')?.getAttribute('src')||fallbackImage),
        meta:'9 kg · 1400 rpm · A',
        location:'София',
        href:'listing.html',
        viewedAt:Date.now()
      };
      const arr=get().filter(x=>x.id!==item.id);
      arr.unshift(item);
      localStorage.setItem(key,JSON.stringify(arr.slice(0,8)));
    }

    if(file==='index.html'){
      const sec=document.querySelector('[data-recent-section]');
      const grid=document.querySelector('[data-recent-grid]');
      const items=get();

      if(sec&&grid&&items.length){
        sec.style.display='';
        grid.innerHTML=items.slice(0,4).map(x=>{
          const href=marketSafeLocalURL(x.href,'listings.html');
          const image=normalizeImage(x.image);
          return `<article class="product-card"><a href="${marketEscapeHTML(href)}"><img class="product-img" src="${marketEscapeHTML(image)}" alt="${marketEscapeHTML(x.title)}"></a><div class="card-body"><a href="${marketEscapeHTML(href)}"><h3 class="product-title">${marketEscapeHTML(x.title)}</h3><div class="product-specs">${marketEscapeHTML(x.meta)}</div></a><div class="product-meta"><div class="price">${marketEscapeHTML(x.price)}</div><span class="location">${marketEscapeHTML(x.location)}</span></div></div></article>`;
        }).join('');

        // Last-resort fallback if a stale/removed product asset is still stored.
        grid.querySelectorAll('img.product-img').forEach(img=>{
          img.addEventListener('error',()=>{
            if(!img.dataset.recentFallback){
              img.dataset.recentFallback='1';
              img.src=fallbackImage;
            }
          },{once:true});
        });
      }
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
    const lockPreviewScroll=()=>{
      if(!modal||previewBodyState)return;
      previewScrollY=window.scrollY||window.pageYOffset||0;
      previewBodyState={
        position:document.body.style.position,
        top:document.body.style.top,
        left:document.body.style.left,
        right:document.body.style.right,
        width:document.body.style.width,
        overflow:document.body.style.overflow
      };
      document.documentElement.classList.add('ad-preview-open');
      document.body.style.position='fixed';
      document.body.style.top=`-${previewScrollY}px`;
      document.body.style.left='0';
      document.body.style.right='0';
      document.body.style.width='100%';
      document.body.style.overflow='hidden';
    };
    const unlockPreviewScroll=()=>{
      if(!previewBodyState)return;
      const state=previewBodyState;previewBodyState=null;
      document.documentElement.classList.remove('ad-preview-open');
      document.body.style.position=state.position;
      document.body.style.top=state.top;
      document.body.style.left=state.left;
      document.body.style.right=state.right;
      document.body.style.width=state.width;
      document.body.style.overflow=state.overflow;
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
      const phone=document.querySelector('[data-ad-phone]')?.value.trim()||'';
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
      if((window.SITE_CONFIG||{}).supabaseEnabled && (action==='change-email'||action==='signout-all'))return;
      if(action==='change-email'){
        const currentPassword=$('[data-email-current-password]')?.value.trim()||'';
        const email=$('[data-new-email]')?.value.trim()||'';
        const status=$('[data-email-change-status]');
        if(!currentPassword){
          window.marketToast('Въведи текущата си парола.');
          $('[data-email-current-password]')?.focus();return;
        }
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
          window.marketToast('Въведи валиден нов email адрес.');
          $('[data-new-email]')?.focus();return;
        }
        localStorage.setItem('pendingEmailChange',email);
        if(status){
          status.hidden=false;
          status.textContent='Новият email ще стане активен едва след потвърждение. Дотогава текущият адрес остава без промяна.';
        }
        window.marketToast('Потвърждението на новия email е заявено.');
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
    if(list&&rows.length&&!(window.SITE_CONFIG||{}).supabaseEnabled){
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
        'съдомиялни':['съдомиялна'],
        'фризер':['фризери'],'фризери':['фризер'],
        'фурна':['фурни'],'фурни':['фурна'],
        'котлон':['котлони'],'котлони':['котлон'],
        'климатик':['климатици'],'климатици':['климатик'],
        'бойлер':['бойлери'],'бойлери':['бойлер'],
        'микровълнова':['микровълнови','печка'],'микровълнови':['микровълнова'],
        'уред':['уреди'],'уреди':['уред']
      };
      const queryTokens=q=>{
        const base=clean(q).split(/\s+/).filter(Boolean).map(correctWord);
        const out=[...base];
        base.forEach(w=>(synonymMap[w]||[]).forEach(x=>out.push(x)));
        if(clean(q).includes('пералня със сушилня')||clean(q).includes('пералня сушилня'))out.push('перални','сушилни');
        return [...new Set(out)];
      };
      const rowHay=r=>clean([r.dataset.search,r.dataset.brand,r.dataset.model,r.dataset.code,r.dataset.city,r.dataset.state,r.dataset.category].join(' '));

      const controls={
        category:$('#categoryFilter'),brand:$('#brandFilter'),state:$('#stateFilter'),
        city:$('#cityFilter'),seller:$('#sellerTypeFilter'),
        minPrice:$('#minPrice'),maxPrice:$('#maxPrice'),distance:$('#distanceRadius'),q:search
      };

      // v2.25: Query/filter state from shared URLs and landing pages.
      const routeParams=new URLSearchParams(location.search);
      const bodyKind=document.body?.dataset?.landingKind||'';
      const aliasCategory=s=>{
        const v=(s||'').trim();
        return ({'Печки':'Готварски печки','Готварска печка':'Готварски печки'}[v]||v);
      };
      const findOption=(control,wanted,key)=>{
        if(!control||!wanted)return null;
        return [...control.options].find(o=>{
          const ov=(o.value||o.textContent||'').trim();
          return key==='category'
            ? clean(aliasCategory(ov))===clean(aliasCategory(wanted))
            : clean(ov)===clean(wanted);
        });
      };
      const applyRouteValue=(key,wanted)=>{
        const c=controls[key];
        if(!c||!wanted)return;
        const opt=c.tagName==='SELECT'?findOption(c,wanted,key):null;
        if(c.tagName==='SELECT'){
          if(opt)c.value=opt.value;
        }else if(!c.value){
          c.value=wanted;
        }
      };

      const routeCategory=routeParams.get('category') ||
        (bodyKind==='category'?aliasCategory(routeParams.get('name')||''):'');
      const routeBrand=routeParams.get('brand') ||
        (bodyKind==='brand'?(routeParams.get('name')||''):'');
      const stateAliases={
        'new':'Ново',
        'нови':'Ново',
        'разопаковано':'Разопаковано/мострено',
        'разопаковано / мострено':'Разопаковано/мострено',
        'за ремонт / части':'За ремонт/части'
      };
      const routeStateRaw=(routeParams.get('state')||'').trim();
      const routeState=stateAliases[clean(routeStateRaw)]||routeStateRaw;
      let routeWarranty=routeParams.get('warranty')==='1';

      applyRouteValue('category',routeCategory);
      applyRouteValue('brand',routeBrand);
      applyRouteValue('city',routeParams.get('city')||'');
      applyRouteValue('state',routeState);
      applyRouteValue('seller',routeParams.get('seller')||'');
      applyRouteValue('minPrice',routeParams.get('minPrice')||'');
      applyRouteValue('maxPrice',routeParams.get('maxPrice')||routeParams.get('max')||'');
      applyRouteValue('distance',routeParams.get('distance')||'');
      applyRouteValue('q',routeParams.get('q')||'');

      const baseScope={
        category:bodyKind==='category'?(controls.category?.value||''):'',
        brand:bodyKind==='brand'?(controls.brand?.value||''):''
      };

      const value=k=>(controls[k]?.value||'').trim();
      const labelFor=(k,v)=>({
        q:`Търсене: ${v}`,
        category:v,brand:v,state:v,city:v,
        seller:v==='private'?'Частно лице':v==='trader'?'Търговец':v,
        warranty:'С гаранция',distance:`до ${v} км`,
        minPrice:`от ${v} €`,maxPrice:`до ${v} €`
      }[k]||v);

      const matches=(r)=>{
        const q=value('q'), tokens=queryTokens(q), hay=rowHay(r);
        const whiteGoodsQuery=['бяла техника','бяла-техника','електроуреди','уреди','уред'].includes(clean(q));
        const qOk=!q||whiteGoodsQuery||tokens.every(t=>hay.includes(t))||tokens.some(t=>hay.includes(t));
        const min=parseFloat(value('minPrice')||'0')||0;
        const max=parseFloat(value('maxPrice')||'999999')||999999;
        return qOk &&
          (!value('category')||clean(aliasCategory(r.dataset.category))===clean(aliasCategory(value('category')))) &&
          (!value('brand')||r.dataset.brand===value('brand')) &&
          (!value('state')||r.dataset.state===value('state')) &&
          (!value('city')||value('distance')||clean(r.dataset.city)===clean(value('city'))) &&
          (!value('seller')||r.dataset.sellerType===value('seller')) &&
          (!routeWarranty||r.dataset.warranty==='1') &&
          (!window.marketDistanceAllowsRow||window.marketDistanceAllowsRow(r)) &&
          (+r.dataset.price>=min) && (+r.dataset.price<=max);
      };

      const sortedRows=()=>{
        const arr=rows.filter(matches);
        const exactQuery=clean(value('q'));
        const mode=sort?.value||'Най-нови';
        arr.sort((a,b)=>{
          if(exactQuery){
            const ae=[clean(a.dataset.model),clean(a.dataset.code)].includes(exactQuery)?1:0;
            const be=[clean(b.dataset.model),clean(b.dataset.code)].includes(exactQuery)?1:0;
            if(ae!==be)return be-ae;
          }
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
        if(routeWarranty)active.push(['warranty','1']);
        chips.innerHTML=active.map(([k,v])=>{
          const locked=!!baseScope[k];
          return `<span class="filter-chip${locked?' route-locked':''}">${marketEscapeHTML(labelFor(k,v))} ${locked?'':`<button type="button" data-remove-filter="${marketEscapeHTML(k)}" aria-label="Премахни">×</button>`}</span>`;
        }).join('');
        chipWrap.style.display=active.length?'flex':'none';
      };

      const apply=()=>{
        sortedRows().forEach(r=>list.appendChild(r));
        const matched=sortedRows();
        rows.forEach(r=>r.style.display='none');
        matched.slice(0,visibleLimit).forEach(r=>r.style.display='grid');
        if(count)count.textContent=matched.length===1?'1 обява':matched.length+' обяви';
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
          if(key==='warranty')routeWarranty=false;
          else if(controls[key])controls[key].value=baseScope[key]||'';
          lastChangedKey='';visibleLimit=5;apply();
        }
        if(e.target.closest('[data-clear-filters]')){
          Object.entries(controls).forEach(([k,c])=>{
            if(!c)return;
            c.value=baseScope[k]||'';
          });
          routeWarranty=false;
          lastChangedKey='';visibleLimit=5;apply();
        }
        if(e.target.closest('[data-remove-last-filter]')){
          const keys=[lastChangedKey,'q','distance','maxPrice','minPrice','seller','city','state','brand','category'].filter(Boolean);
          const key=keys.find(k=>controls[k]&&(controls[k].value||'').trim()&&!baseScope[k]);
          if(key)controls[key].value='';
          else if(routeWarranty)routeWarranty=false;
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
        if((window.SITE_CONFIG||{}).supabaseEnabled)return;
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

        const monetization=window.MarketMonetization;
        const selectedPromotion=window.marketPostAdPromotion?.getSelected?.()||'';
        if(selectedPromotion){
          const newListingId='new-ad-'+Date.now();
          if(monetization?.paidAvailable?.()){
            const wallet=monetization.getWallet();
            if(Number(wallet[selectedPromotion]||0)>0){
              try{monetization.useCredit(selectedPromotion,newListingId)}catch(err){window.marketToast(err.message||'Промоцията не може да се активира.');return}
            }else{
              if(!monetization.checkoutAllowed()){window.marketToast('Checkout още не е готов за този режим.');return}
              safeToLeave=true;
              localStorage.setItem('marketPendingPublishV241',JSON.stringify({productId:selectedPromotion,listingId:newListingId,createdAt:Date.now()}));
              location.href='checkout.html?item='+encodeURIComponent(selectedPromotion)+'&context=publish';
              return;
            }
          }else if(monetization?.bonusPromotionsAvailable?.()){
            try{monetization.useBonus(selectedPromotion,newListingId)}catch(err){window.marketToast(err.message||'Бонусът не може да се активира.');return}
          }
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
  (function marketV211(){
    const $=(s,r=document)=>r.querySelector(s);
    const $$=(s,r=document)=>[...r.querySelectorAll(s)];

    // Forgot password exists only before login / via explicit "Забравена парола?" link.
    $('[data-forgot-submit]')?.addEventListener('click',()=>{
      if((window.SITE_CONFIG||{}).supabaseEnabled)return;
      const input=$('[data-forgot-email]');
      const status=$('[data-forgot-status]');
      const email=(input?.value||'').trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
        if(status){status.style.display='block';status.textContent='Въведи валиден email адрес.'}
        input?.focus();return;
      }
      localStorage.setItem('demoPasswordResetEmail',email);
      if(status){
        status.style.display='block';
        status.textContent='Ако има профил с този email, ще получиш защитен линк за нова парола.';
      }
    });

    // Logged-in password change is current password -> new -> confirm new.
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-security-action="change-password"]');
      if(!btn)return;
      if((window.SITE_CONFIG||{}).supabaseEnabled)return;
      const current=($('[data-current-password]')?.value||'').trim();
      const next=($('[data-new-password]')?.value||'').trim();
      const confirm=($('[data-confirm-password]')?.value||'').trim();
      if(!current){window.marketToast?.('Въведи старата парола.');$('[data-current-password]')?.focus();return}
      if(!(next.length>=8&&/[A-Za-zА-Яа-яЁё]/.test(next)&&/\d/.test(next))){window.marketToast?.('Новата парола трябва да е минимум 8 символа и да съдържа поне 1 буква и 1 цифра.');$('[data-new-password]')?.focus();return}
      if(next!==confirm){window.marketToast?.('Новата парола и потвърждението не съвпадат.');$('[data-confirm-password]')?.focus();return}
      localStorage.setItem('demoPasswordChangedAt',String(Date.now()));
      ['[data-current-password]','[data-new-password]','[data-confirm-password]'].forEach(s=>{const x=$(s);if(x)x.value=''});
      window.marketToast?.('Паролата е сменена.');
    });

    // GDPR/account data requests.
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-data-action]');
      if(!btn)return;
      const action=btn.dataset.dataAction;
      if(action==='export'){
        localStorage.setItem('demoDataExportRequestedAt',String(Date.now()));
        window.marketToast?.('Заявката за архив на данните е приета.');
      }
      if(action==='delete'){
        const box=$('[data-delete-confirm]');
        if(box){box.style.display='block';box.scrollIntoView({behavior:'smooth',block:'center'})}
      }
      if(action==='confirm-delete'){
        const val=($('[data-delete-confirm-text]')?.value||'').trim().toUpperCase();
        if(val!=='ИЗТРИЙ'){window.marketToast?.('Напиши ИЗТРИЙ, за да потвърдиш.');return}
        localStorage.setItem('demoAccountDeletionRequestedAt',String(Date.now()));
        window.marketToast?.('Заявката за изтриване на акаунта е приета.');
      }
    });

    // Rules-based chat safety warning. Does not inspect messages server-side in this static build.
    const chat=$('[data-chat-input]');
    const risk=$('[data-chat-risk-warning]');
    if(chat&&risk){
      const highRisk=/(cvv|cvc|pin|пин|код\s*(от|за)?\s*(sms|смс)|номер\s+на\s+карт|данни\s+от\s+карт|банкова\s+карт)/i;
      const linkRisk=/(https?:\/\/|www\.|bit\.ly|tinyurl|t\.me\/|telegram|whatsapp)/i;
      const drawRisk=()=>{
        const v=chat.value||'';
        if(highRisk.test(v)){
          risk.style.display='block';risk.classList.add('high-risk');
          risk.querySelector('[data-chat-risk-text]').textContent='Не изпращай номер на карта, PIN, CVV/CVC или кодове от SMS. Това са чувствителни данни.';
        }else if(linkRisk.test(v)){
          risk.style.display='block';risk.classList.remove('high-risk');
          risk.querySelector('[data-chat-risk-text]').textContent='Внимавай с външни линкове. Не въвеждай данни за карта или кодове за потвърждение извън платформата.';
        }else{
          risk.style.display='none';risk.classList.remove('high-risk');
        }
      };
      chat.addEventListener('input',drawRisk);
    }

    // User appeal after moderation removal.
    document.addEventListener('click',e=>{
      const open=e.target.closest('[data-open-appeal]');
      const send=e.target.closest('[data-submit-appeal]');
      if(open){
        const box=$(`[data-appeal-box="${CSS.escape(open.dataset.openAppeal)}"]`);
        if(box)box.style.display=box.style.display==='none'?'block':'none';
      }
      if(send){
        const id=send.dataset.submitAppeal;
        const text=($(`[data-appeal-text="${CSS.escape(id)}"]`)?.value||'').trim();
        if(text.length<10){window.marketToast?.('Напиши кратко обяснение за повторния преглед.');return}
        localStorage.setItem('demoModerationAppeal:'+id,JSON.stringify({text,createdAt:Date.now()}));
        send.disabled=true;send.textContent='Изпратено за преглед';
        window.marketToast?.('Искането за повторен преглед е изпратено.');
      }
    });

    // Maintenance mode - browsing stays available, new publishing/chat actions are disabled.
    const maintenance=localStorage.getItem('marketMaintenanceMode')==='1';
    if(maintenance && !document.body.closest('.admin-shell')){
      const banner=document.createElement('div');
      banner.className='maintenance-public-banner';
      banner.textContent='В момента извършваме кратка техническа поддръжка. Разглеждането работи, но публикуването и новите съобщения са временно спрени.';
      document.body.insertAdjacentElement('afterbegin',banner);
      $$('a[href="post-ad.html"],[data-send-message],.message-action-button').forEach(x=>{
        x.classList.add('is-blocked-contact');
        x.setAttribute('aria-disabled','true');
        x.addEventListener('click',ev=>{ev.preventDefault();window.marketToast?.('Това действие е временно спряно заради техническа поддръжка.')},true);
      });
    }
  })();


  // v2.12 profile hub actions
  (function profileHubV212(){
    if((window.SITE_CONFIG||{}).supabaseEnabled)return;
    document.querySelector('[data-profile-save]')?.addEventListener('click',()=>{
      const name=document.querySelector('[data-profile-name]');
      if(!name?.value.trim()){
        window.marketToast?.('Попълни името.');
        name?.focus();
        return;
      }
      localStorage.setItem('demoProfileUpdatedAt',String(Date.now()));
      window.marketToast?.('Промените в профила са запазени.');
    });

    document.querySelector('[data-profile-logout]')?.addEventListener('click',()=>{
      localStorage.setItem('demoLoggedOutAt',String(Date.now()));
      location.href='login.html';
    });
  })();


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

    // ----- Unread Chat badge.
    let unreadChat=parseInt(localStorage.getItem('marketUnreadChatCount')||'',10);
    if(Number.isNaN(unreadChat)){
      unreadChat=0;
      localStorage.setItem('marketUnreadChatCount','0');
    }
    $$('[data-chat-badge]').forEach(b=>{
      if(unreadChat>0){
        b.textContent=unreadChat>9?'9+':String(unreadChat);
        b.classList.add('has-unread');
        b.setAttribute('aria-hidden','false');
        const a=b.closest('a');
        if(a)a.setAttribute('aria-label',`Чат, ${unreadChat} непрочетени съобщения`);
      }else{
        b.textContent='';b.classList.remove('has-unread');b.setAttribute('aria-hidden','true');
      }
    });

    // Opening Chat marks the demo unread conversations as read.
    if(file==='messages.html'){
      unreadChat=0;
      localStorage.setItem('marketUnreadChatCount','0');
      $$('[data-chat-badge]').forEach(b=>{b.textContent='';b.classList.remove('has-unread')});
      $$('.conversation-unread').forEach(x=>x.remove());
    }

    // ----- Notification filters / unread state.
    const noticeList=$('.notice-list');
    if(noticeList){
      const notices=$$('.notice',noticeList);
      let unread=notices.filter(n=>n.classList.contains('unread')).length;
      localStorage.setItem('marketUnreadNotifications',String(unread));

      const syncBell=()=>{
        const n=notices.filter(x=>x.classList.contains('unread')).length;
        localStorage.setItem('marketUnreadNotifications',String(n));
        $$('[data-notification-badge]').forEach(b=>{
          if(n){
            b.textContent=n>9?'9+':String(n);b.classList.add('has-unread');b.setAttribute('aria-hidden','false');
          }else{
            b.textContent='';b.classList.remove('has-unread');b.setAttribute('aria-hidden','true');
          }
        });
      };
      syncBell();

      $$('[data-notification-filter]').forEach(btn=>{
        btn.addEventListener('click',()=>{
          $$('[data-notification-filter]').forEach(x=>{
            const active=x===btn;
            x.classList.toggle('active',active);
            x.setAttribute('aria-selected',active?'true':'false');
          });
          const type=btn.dataset.notificationFilter;
          notices.forEach(n=>n.hidden=type!=='all'&&n.dataset.notificationType!==type);
        });
      });
      $('[data-notifications-read-all]')?.addEventListener('click',()=>{
        notices.forEach(n=>{
          n.classList.remove('unread');
          n.querySelector('.notice-dot')?.remove();
          n.setAttribute('aria-label','Прочетено известие');
        });
        syncBell();
        window.marketToast?.('Всички известия са маркирани като прочетени.');
      });
      notices.forEach(n=>n.addEventListener('click',()=>{
        if(n.classList.contains('unread')){
          n.classList.remove('unread');
          n.querySelector('.notice-dot')?.remove();
          n.setAttribute('aria-label','Прочетено известие');
          syncBell();
        }
      }));
    }

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

    // ----- Active / archived conversations (v2.27).
    const conversationViewKey='marketConversationViewV227';
    const conversationArchiveKey='marketArchivedConversationIdsV227';

    const readArchivedConversationIds=()=>{
      try{
        const value=JSON.parse(localStorage.getItem(conversationArchiveKey)||'[]');
        return Array.isArray(value)?value:[];
      }catch(e){return[]}
    };

    const saveArchivedConversationIds=ids=>{
      localStorage.setItem(conversationArchiveKey,JSON.stringify([...new Set(ids)]));
    };

    const restoreConversationArchiveState=()=>{
      const archived=new Set(readArchivedConversationIds());
      $$('.conversation[data-conversation-id]').forEach(c=>{
        if(archived.has(c.dataset.conversationId))c.dataset.conversationState='archived';
      });
    };

    const showConversationView=view=>{
      const safeView=view==='archived'?'archived':'active';
      localStorage.setItem(conversationViewKey,safeView);

      $$('[data-conversation-view]').forEach(b=>{
        const selected=b.dataset.conversationView===safeView;
        b.classList.toggle('active',selected);
        b.setAttribute('aria-selected',selected?'true':'false');
        b.tabIndex=selected?0:-1;
      });

      const rows=$$('.conversation[data-conversation-state]');
      rows.forEach(c=>{
        const visible=c.dataset.conversationState===safeView;
        c.hidden=!visible;
        c.setAttribute('aria-hidden',visible?'false':'true');
        // Explicit style makes the prototype robust even if an old CSS cache survives.
        c.style.display=visible?'flex':'none';
      });

      const visibleCount=rows.filter(c=>c.dataset.conversationState===safeView).length;
      $$('[data-conversation-empty]').forEach(empty=>{
        empty.hidden=empty.dataset.conversationEmpty!==safeView || visibleCount>0;
      });
    };

    restoreConversationArchiveState();

    $$('[data-conversation-view]').forEach(b=>b.addEventListener('click',e=>{
      e.preventDefault();
      showConversationView(b.dataset.conversationView);
    }));

    if($('[data-conversation-tabs]')){
      showConversationView(localStorage.getItem(conversationViewKey)||'active');
    }

    $('[data-archive-conversation]')?.addEventListener('click',()=>{
      const active=$('.conversation[data-conversation-state="active"].active') ||
                   $('.conversation[data-conversation-state="active"]');
      if(active){
        const id=active.dataset.conversationId;
        active.dataset.conversationState='archived';

        if(id){
          const ids=readArchivedConversationIds();
          saveArchivedConversationIds([...ids,id]);
        }

        showConversationView('archived');

        window.marketToast?.('Разговорът е архивиран.','Върни',()=>{
          active.dataset.conversationState='active';
          if(id){
            saveArchivedConversationIds(readArchivedConversationIds().filter(x=>x!==id));
          }
          showConversationView('active');
        });
      }
      closeMenus();
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
  (function marketV216(){
    const $=(s,r=document)=>r.querySelector(s);
    const $$=(s,r=document)=>[...r.querySelectorAll(s)];

    // Whole notification row opens its destination.
    $$('.notice[data-notification-link]').forEach(n=>{
      const open=()=>{
        const href=n.dataset.notificationLink;
        if(href)location.href=href;
      };
      n.addEventListener('click',e=>{
        if(e.target.closest('a,button'))return;
        open();
      });
      n.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){
          e.preventDefault();open();
        }
      });
    });

    const composer=$('[data-chat-composer]');
    const form=$('[data-chat-form]');
    const input=$('[data-chat-input]');
    const quick=$('[data-quick-replies]');
    const thread=$('[data-chat-thread-demo]') || $('[data-message-list]');

    const hasConversationHistory=()=>{
      if($$('.chat-bubble').length>0)return true;
      if(thread?.dataset?.hasHistory==='1')return true;
      return false;
    };

    const syncQuickReplies=()=>{
      if(!quick)return;
      quick.hidden=hasConversationHistory();
    };
    syncQuickReplies();

    // Autogrow textarea.
    const grow=()=>{
      if(!input)return;
      input.style.height='auto';
      input.style.height=Math.min(input.scrollHeight,110)+'px';
    };
    input?.addEventListener('input',grow);
    grow();

    // Send with submit; Enter sends, Shift+Enter creates a new line.
    input?.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){
        e.preventDefault();
        form?.requestSubmit();
      }
    });

    form?.addEventListener('submit',e=>{
      e.preventDefault();
      const text=(input?.value||'').trim();
      if(!text)return;

      const host=$('[data-chat-thread-demo]') || thread;
      if(!host)return;

      const bubble=document.createElement('div');
      bubble.className='chat-bubble outgoing';
      const now=new Date();
      const hh=String(now.getHours()).padStart(2,'0');
      const mm=String(now.getMinutes()).padStart(2,'0');
      bubble.innerHTML=`<div class="chat-bubble-text"></div><span class="chat-bubble-time">${hh}:${mm}</span>`;
      bubble.querySelector('.chat-bubble-text').textContent=text;
      host.appendChild(bubble);

      input.value='';
      grow();
      if(quick)quick.hidden=true;

      // In a real chat this will be replaced by the backend send result.
      localStorage.setItem('demoLastChatMessageAt',String(Date.now()));

      requestAnimationFrame(()=>{
        bubble.scrollIntoView({behavior:'smooth',block:'end'});
        input.focus();
      });
    });

    // On opening a conversation, go to the newest messages.
    if(file==='messages.html'){
      setTimeout(()=>{
        const last=$('.chat-bubble:last-child');
        last?.scrollIntoView({block:'end'});
      },60);
    }
  })();





  // v2.18 cleanup for existing conversations.
  (function chatCleanupV218(){
    const hasHistory=document.querySelectorAll('.chat-messages .bubble-row').length>0;

    if(hasHistory){
      document.querySelectorAll(
        '[data-quick-message],[data-quick-replies],.quick-replies,.chat-quick-replies,.quick-message,.quick-messages'
      ).forEach(x=>{
        const wrapper=x.closest('[data-quick-replies],.quick-replies,.chat-quick-replies,.quick-messages');
        (wrapper||x).remove();
      });
    }

    // Old v2.x presence marker must never coexist with the current avatar badge.
    document.querySelectorAll('.conversation-online-dot').forEach(x=>x.remove());

    // Maria gets exactly one status badge, on the avatar.
    document.querySelectorAll('.conversation').forEach(c=>{
      const name=c.querySelector('.conversation-name')?.textContent?.trim()||'';
      const avatar=c.querySelector('.avatar');
      if(!avatar)return;
      const dots=[...avatar.querySelectorAll('.avatar-online-dot,.conversation-online-dot,.online-dot')];
      dots.forEach(x=>x.remove());
      if(name==='Мария Стоянова'){
        const dot=document.createElement('span');
        dot.className='avatar-online-dot';
        dot.setAttribute('aria-label','Онлайн');
        avatar.appendChild(dot);
      }
    });

    // Textual status in the open-chat header can remain, but not a second green dot.
    document.querySelectorAll('.chat-presence .online-dot,.chat-presence .conversation-online-dot').forEach(x=>x.remove());
  })();





  // v2.21 consolidated chat: drafts, delivery status, unread divider, typing and images.
  (function chatV221(){
    const $=(s,r=document)=>r.querySelector(s);
    const $$=(s,r=document)=>[...r.querySelectorAll(s)];
    const scroller=$('[data-chat-scroll]');
    const form=$('[data-chat-form]');
    const input=$('[data-chat-input]');
    const picker=$('[data-chat-image-picker]');
    const fileInput=$('[data-chat-image-input]');
    const preview=$('[data-chat-image-preview]');
    const previewImg=$('[data-chat-image-preview-img]');
    const imageName=$('[data-chat-image-name]');
    const imageMeta=$('[data-chat-image-meta]');
    const imageRemove=$('[data-chat-image-remove]');
    const typing=$('[data-typing-indicator]');
    const jump=$('[data-chat-jump-bottom]');
    if(!scroller||!form||!input)return;

    const getConversationId=()=>sessionStorage.getItem('marketActiveConversationV218')||'conv-1';
    const draftKey=()=>`marketChatDraft:${getConversationId()}`;
    let selectedFile=null,objectUrl=null,typingTimer=null;

    const fmt=n=>n<1024?`${n} B`:n<1048576?`${Math.round(n/1024)} KB`:`${(n/1048576).toFixed(1)} MB`;
    const nearBottom=()=>scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<80;
    const scrollBottom=(smooth=false)=>scroller.scrollTo({top:scroller.scrollHeight,behavior:smooth?'smooth':'auto'});

    // Draft persistence per conversation.
    const loadDraft=()=>{
      input.value=localStorage.getItem(draftKey())||'';
      input.style.height='auto';
      input.style.height=Math.min(input.scrollHeight,110)+'px';
    };
    loadDraft();
    input.addEventListener('input',()=>{
      localStorage.setItem(draftKey(),input.value);
      input.style.height='auto';
      input.style.height=Math.min(input.scrollHeight,110)+'px';
    });

    $$('.conversation').forEach(c=>c.addEventListener('click',()=>{
      setTimeout(loadDraft,0);
    }));

    // Unread divider before first unread demo message.
    const unread=$('[data-unread-message]',scroller);
    if(unread&&!$('.chat-new-divider',scroller)){
      const divider=document.createElement('div');
      divider.className='chat-new-divider';
      divider.textContent='Нови съобщения';
      unread.before(divider);
    }

    // Jump-to-bottom button.
    const syncJump=()=>{if(jump)jump.hidden=nearBottom()};
    scroller.addEventListener('scroll',syncJump,{passive:true});
    jump?.addEventListener('click',()=>scrollBottom(true));
    requestAnimationFrame(()=>{scrollBottom(false);syncJump()});

    // Image picker + preview.
    const clearImage=()=>{
      selectedFile=null;
      if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}
      if(fileInput)fileInput.value='';
      if(preview)preview.hidden=true;
      previewImg?.removeAttribute('src');
      if(imageName)imageName.textContent='Снимка';
      if(imageMeta)imageMeta.textContent='';
    };
    if(picker?.tagName!=='LABEL')picker?.addEventListener('click',()=>fileInput?.click());
    picker?.addEventListener('keydown',e=>{if(picker.tagName==='LABEL'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();fileInput?.click();}});
    fileInput?.addEventListener('change',()=>{
      const file=fileInput.files?.[0];
      if(!file){clearImage();return}
      const imageTypeOk=(file.type&&file.type.startsWith('image/'))||/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name||'');
      if(!imageTypeOk){
        clearImage();window.marketToast?.('Може да изпращаш само снимки.');return;
      }
      if(file.size>10*1024*1024){
        clearImage();window.marketToast?.('Снимката е прекалено голяма. Максимум 10 MB.');return;
      }
      selectedFile=file;
      if(objectUrl)URL.revokeObjectURL(objectUrl);
      objectUrl=URL.createObjectURL(file);
      if(previewImg)previewImg.src=objectUrl;
      if(imageName)imageName.textContent=file.name||'Снимка';
      if(imageMeta)imageMeta.textContent=fmt(file.size);
      if(preview)preview.hidden=false;
    });
    imageRemove?.addEventListener('click',clearImage);

    const statusFor=(bubble)=>{
      const status=document.createElement('div');
      status.className='bubble-delivery-status';
      status.textContent='Изпраща се…';
      bubble.appendChild(status);
      return status;
    };

    const finishDelivery=(status,row)=>{
      setTimeout(()=>{
        if(navigator.onLine){
          status.textContent='Изпратено';
          status.classList.remove('failed');
        }else{
          status.classList.add('failed');
          status.innerHTML='Неуспешно · <button type="button" class="bubble-retry">Опитай пак</button>';
          status.querySelector('.bubble-retry')?.addEventListener('click',()=>{
            status.textContent='Изпраща се…';status.classList.remove('failed');
            finishDelivery(status,row);
          },{once:true});
        }
      },500);
    };

    const showTyping=()=>{
      if(!typing)return;
      typing.hidden=false;
      clearTimeout(typingTimer);
      typingTimer=setTimeout(()=>{typing.hidden=true},1600);
    };

    // Single authoritative submit handler.
    form.addEventListener('submit',e=>{
      e.preventDefault();e.stopImmediatePropagation();
      const text=input.value.trim();
      if(!text&&!selectedFile)return;

      const row=document.createElement('div');
      row.className='bubble-row me';
      const bubble=document.createElement('div');
      bubble.className='bubble';

      if(selectedFile&&objectUrl){
        const image=document.createElement('img');
        image.className='chat-bubble-image';
        image.src=objectUrl;
        image.alt='Изпратена снимка';
        bubble.appendChild(image);
        objectUrl=null; // keep current demo URL alive in the sent bubble
      }
      if(text){
        const t=document.createElement('div');t.textContent=text;bubble.appendChild(t);
      }

      const time=document.createElement('div');
      time.className='bubble-time';
      const now=new Date();
      time.textContent=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
      bubble.appendChild(time);
      const delivery=statusFor(bubble);

      row.appendChild(bubble);
      scroller.appendChild(row);

      input.value='';input.style.height='auto';
      localStorage.removeItem(draftKey());
      selectedFile=null;
      if(fileInput)fileInput.value='';
      if(preview)preview.hidden=true;
      previewImg?.removeAttribute('src');
      if(imageName)imageName.textContent='Снимка';
      if(imageMeta)imageMeta.textContent='';

      finishDelivery(delivery,row);
      showTyping();
      requestAnimationFrame(()=>{scrollBottom(true);syncJump();input.focus()});
    },true);

    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit()}
    });
  })();

  // v2.21 suspicious-auth guard: rate limiting + CAPTCHA placeholder only after rapid failures.
  (function authGuardV221(){
    if((window.SITE_CONFIG||{}).supabaseEnabled)return;
    const challenge=document.querySelector('[data-suspicious-check]');
    if(!challenge)return;
    const human=challenge.querySelector('[data-human-check]');
    const key='marketAuthAttemptsV221';

    const getAttempts=()=>{try{return JSON.parse(sessionStorage.getItem(key)||'[]')}catch(e){return[]}};
    const addAttempt=()=>{
      const now=Date.now();
      const arr=[...getAttempts().filter(t=>now-t<60000),now];
      sessionStorage.setItem(key,JSON.stringify(arr));
      if(arr.length>=3)challenge.hidden=false;
      return arr.length;
    };
    const permitted=()=>challenge.hidden||!!human?.checked;

    const login=document.querySelector('[data-login-submit]');
    login?.addEventListener('click',()=>{
      const email=document.querySelector('[data-auth-email]')?.value.trim()||'';
      const pass=document.querySelector('[data-auth-password]')?.value||'';
      if(!email||!pass){addAttempt();window.marketToast?.('Попълни email и парола.');return}
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){addAttempt();window.marketToast?.('Въведи валиден email адрес.');document.querySelector('[data-auth-email]')?.focus();return}
      if(!permitted()){window.marketToast?.('Потвърди защитната проверка.');return}
      sessionStorage.removeItem(key);location.href='profile.html';
    });

    const register=document.querySelector('[data-register-submit]');
    register?.addEventListener('click',()=>{
      const name=document.querySelector('[data-register-name]')?.value.trim()||'';
      const email=document.querySelector('[data-register-email]')?.value.trim()||'';
      const pass=document.querySelector('[data-register-password]')?.value||'';
      const passConfirm=document.querySelector('[data-register-password-confirm]')?.value||'';
      const type=document.querySelector('[data-register-type]')?.value||'private';
      const terms=!!document.querySelector('[data-register-terms]')?.checked;
      const emailOk=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      const passwordOk=pass.length>=8&&/[A-Za-zА-Яа-яЁё]/.test(pass)&&/\d/.test(pass);

      if(!name||!emailOk){
        addAttempt();
        window.marketToast?.('Провери името и въведи валиден email.');
        return;
      }
      if(!passwordOk){
        window.marketToast?.('Паролата трябва да е минимум 8 символа и да съдържа поне 1 буква и 1 цифра.');
        return;
      }
      if(pass!==passConfirm){
        window.marketToast?.('Паролите не съвпадат.');
        return;
      }
      if(!terms){
        window.marketToast?.('Потвърди Общите условия и Политиката за поверителност.');
        return;
      }

      let companyName='',eik='',companyCity='';
      if(type==='dealer'){
        companyName=document.querySelector('[data-register-company]')?.value.trim()||'';
        eik=(document.querySelector('[data-register-eik]')?.value||'').replace(/\s+/g,'');
        companyCity=document.querySelector('[data-register-company-city]')?.value.trim()||'';
        if(!companyName||!companyCity||!/^(?:\d{9}|\d{13})$/.test(eik)){
          window.marketToast?.('За търговец попълни фирма, валиден ЕИК / Булстат и седалище.');
          return;
        }
      }

      if(!permitted()){
        window.marketToast?.('Потвърди защитната проверка.');
        return;
      }

      const pending={
        name,email,
        type:type==='dealer'?'dealer':'private',
        companyName:type==='dealer'?companyName:null,
        eik:type==='dealer'?eik:null,
        companyCity:type==='dealer'?companyCity:null
      };
      localStorage.setItem('marketPendingRegistrationV250',JSON.stringify(pending));

      const M=window.MarketMonetization;
      if(M?.setCurrentUser){
        M.setCurrentUser({
          id:'demo-user',
          name,
          type:pending.type,
          email,
          companyName:pending.companyName,
          eik:pending.eik,
          companyCity:pending.companyCity
        });
      }

      sessionStorage.removeItem(key);
      location.href='verify-email.html';
    });
  })();

  // v2.21 security sessions / passkey prototype.
  (function securityV221(){
    document.addEventListener('click',e=>{
      const revoke=e.target.closest('[data-revoke-session]');
      if(revoke){
        const id=revoke.dataset.revokeSession;
        document.querySelectorAll(`[data-session-row="${CSS.escape(id)}"]`).forEach(x=>x.remove());
        document.querySelector('[data-security-alert]')?.remove();
        localStorage.setItem('revokedSession:'+id,String(Date.now()));
        window.marketToast?.('Сесията е прекратена.');
      }
      const passkey=e.target.closest('[data-passkey-setup]');
      if(passkey){
        localStorage.setItem('demoPasskeyConfiguredAt',String(Date.now()));
        const status=document.querySelector('[data-passkey-status]');
        if(status)status.textContent='Настроен на това устройство';
        passkey.textContent='Passkey е настроен';
        passkey.disabled=true;
        window.marketToast?.('Passkey е добавен в прототипа.');
      }
    });
  })();

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
      const isOther=brand.value==='Друга';
      otherField.hidden=!isOther;
      if(isOther){
        otherInput.setAttribute('data-smart-required','');
        otherInput.setAttribute('aria-required','true');
        otherInput.required=true;
      }else{
        otherInput.removeAttribute('data-smart-required');
        otherInput.removeAttribute('aria-required');
        otherInput.required=false;
        otherInput.value='';
        otherInput.closest('.field')?.classList.remove('field-error');
        otherInput.closest('.field')?.querySelector('.field-error-message')?.remove();
      }
    };
    brand?.addEventListener('change',syncOtherBrand);
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
      if(h)h.textContent=`Няма активни тестови обяви в „${category}“`;
      if(p)p.textContent='Категорията е отворена правилно. При реални обяви тук ще се показват само уреди от тази категория.';
    }
  })();


  // v2.29 archive semantics: archived != closed.
  (function archiveSemanticsV229(){
    const shell=document.querySelector('.chat-shell');
    const banner=document.querySelector('[data-archived-chat-banner]');
    const form=document.querySelector('[data-chat-form]');
    if(!shell)return;

    const archiveKey='marketArchivedConversationIdsV227';

    const readArchived=()=>{
      try{
        const v=JSON.parse(localStorage.getItem(archiveKey)||'[]');
        return Array.isArray(v)?v:[];
      }catch(e){return[]}
    };
    const saveArchived=ids=>{
      localStorage.setItem(archiveKey,JSON.stringify([...new Set(ids)]));
    };

    const activeConversation=()=>shell.querySelector('.conversation.active');

    const syncBanner=()=>{
      const c=activeConversation();
      const isArchived=c?.dataset?.conversationState==='archived';
      if(banner)banner.hidden=!isArchived;
    };

    shell.querySelectorAll('.conversation').forEach(c=>{
      c.addEventListener('click',()=>setTimeout(syncBanner,0));
    });

    form?.addEventListener('submit',()=>{
      const c=activeConversation();
      if(!c || c.dataset.conversationState!=='archived')return;

      const id=c.dataset.conversationId||'';
      c.dataset.conversationState='active';
      if(id)saveArchived(readArchived().filter(x=>x!==id));

      if(banner)banner.hidden=true;
      localStorage.setItem('marketConversationViewV227','active');
      window.marketToast?.('Разговорът е върнат в „Активни“.');
    },true);

    syncBanner();
  })();


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
  (function qaFormActionsV238(){
    const toast=message=>window.marketToast?.(message);

    const contact=document.querySelector('[data-contact-submit]');
    contact?.addEventListener('click',()=>{
      const name=document.querySelector('[data-contact-name]');
      const email=document.querySelector('[data-contact-email]');
      const message=document.querySelector('[data-contact-message]');
      const status=document.querySelector('[data-contact-status]');
      if(!name?.value.trim() || !email?.value.trim() || !message?.value.trim()){
        toast('Попълни име, имейл и съобщение.');
        return;
      }
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())){
        toast('Въведи валиден имейл адрес.');
        email.focus();
        return;
      }
      if(status){
        status.hidden=false;
        status.textContent='Формата е валидирана. Реалното изпращане ще се активира при свързването на backend-а.';
        status.scrollIntoView({behavior:'smooth',block:'nearest'});
      }
    });

    const safety=document.querySelector('[data-safety-submit]');
    safety?.addEventListener('click',()=>{
      const description=document.querySelector('[data-safety-description]');
      const status=document.querySelector('[data-safety-status]');
      if(!description?.value.trim()){
        toast('Добави кратко описание на сигнала.');
        return;
      }
      if(status){
        status.hidden=false;
        status.textContent='Сигналът е валидиран в тестовата версия. Реалното изпращане ще се активира при свързването на backend-а.';
        status.scrollIntoView({behavior:'smooth',block:'nearest'});
      }
    });

    const editSave=document.querySelector('[data-edit-save]');
    editSave?.addEventListener('click',()=>{
      const fields=[...document.querySelectorAll('main .field')];
      const categoryEl=document.querySelector('[data-category-control]');
      const brandEl=document.querySelector('[data-ad-brand]');
      const customEl=document.querySelector('[data-other-brand-input]');
      const priceEl=document.getElementById('field-4');
      const conditionEl=document.getElementById('field-5');
      const descriptionEl=document.getElementById('field-7');
      const category=categoryEl?.value||'';
      const brand=brandEl?.value||'';
      const custom=customEl?.value.trim()||'';
      const inputs=[...document.querySelectorAll('main .field input,main .field select,main .field textarea')];
      if(!category){toast('Избери категория.');categoryEl?.focus();return;}
      if(!brand){toast('Избери марка.');brandEl?.focus();return;}
      if(brand==='Друга'&&!custom){toast('Напиши каква е марката.');customEl?.focus();return;}
      if(!priceEl?.value || Number(priceEl.value)<=0){toast('Въведи валидна цена.');priceEl?.focus();return;}
      if(!conditionEl?.value){toast('Избери състояние.');conditionEl?.focus();return;}
      if(!descriptionEl?.value.trim()){toast('Попълни описание.');descriptionEl?.focus();return;}
      const payload={
        category,
        brand:brand==='Друга'?custom:brand,
        values:inputs.map(el=>({
          id:el.id||'',
          value:el.type==='checkbox'?el.checked:el.value
        })),
        savedAt:Date.now()
      };
      localStorage.setItem('marketDemoEditedAdV238',JSON.stringify(payload));
      const status=document.querySelector('[data-edit-status]');
      if(status){
        status.hidden=false;
        status.textContent='Промените са запазени локално в тестовата версия.';
      }
      toast('Промените са запазени.');
    });
  })();


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
  (function monetizationV241(){
    const M=window.MarketMonetization;if(!M)return;
    const esc=window.Market?.escapeHTML||function(v){return String(v??'').replace(/[&<>"']/g,'')};
    const platform=M.getPlatform();

    function promoPriceHTML(item){
      const p=M.priceFor(item);
      return p.onPromo?'<span class="promo-old-price">'+M.money(p.regular)+'</span><span class="promo-current-price">'+M.money(p.current)+'</span>':'<span class="promo-current-price">'+M.money(p.current)+'</span>';
    }
    function promoEnd(item){
      if(!M.priceFor(item).onPromo||!item.promotion?.end)return '';
      const d=new Date(item.promotion.end);return Number.isNaN(d.getTime())?'':'<div class="promo-validity">Промо до '+d.toLocaleDateString('bg-BG')+'</div>';
    }
    function disabledPage(title,text){return '<div class="feature-disabled"><span class="beta-chip">FREE BETA</span><h1>'+title+'</h1><p>'+text+'</p><div class="warning-callout">В момента платформата не приема плащания и няма платено позициониране.</div><a class="primary-btn" href="listings.html">Към обявите</a></div>'}

    // Promote / bonus page.
    const promoteRoot=document.querySelector('[data-promote-root]');
    if(promoteRoot){
      const listing=new URLSearchParams(location.search).get('listing')||'';

      if(!M.paidAvailable()){
        const bonuses=M.getBonusSummary?.()||[],active=listing?M.getActivePromotion?.(listing):null,campaign=M.getBonusCampaign?.()||{};
        if(!bonuses.length&&!active){
          promoteRoot.innerHTML=disabledPage('Бонус промоции','В момента нямаш наличен бонус за промотиране.');
        }else{
          const activeEnd=active?.expiresAt?new Date(active.expiresAt):null;
          const activeText=active?('Обявата има активен '+(active.kind==='vip'?'VIP':'TOP')+(activeEnd&&!Number.isNaN(activeEnd.getTime())?' до '+activeEnd.toLocaleDateString('bg-BG'):'')+'.'):'';
          const cards=bonuses.map(b=>{
            const end=b.redeemUntil?new Date(b.redeemUntil):null,blocked=!!active;
            const expiry=end&&!Number.isNaN(end.getTime())?end.toLocaleDateString('bg-BG'):'';
            const action=listing?(blocked?'Изчакай да изтече':'Използвай бонуса'):'Избери обява';
            return '<article class="promo-card market-promo-card beta-bonus-card"><div class="market-promo-head"><h3>'+esc(b.name)+'</h3><span class="beta-chip">ПОДАРЪК</span></div><p>Бонус за първите '+Number(campaign.maxVerifiedUsers||500)+' потвърдени регистрации.</p><div class="beta-bonus-remaining">Наличен: <strong>'+Number(b.remaining||0)+'</strong></div>'+(expiry?'<div class="promo-validity">Използвай до '+expiry+'</div>':'')+'<button class="primary-btn" data-use-beta-bonus="'+esc(b.productId)+'" '+(blocked?'disabled':'')+'>'+action+'</button></article>';
          }).join('');
          promoteRoot.innerHTML='<div class="market-promo-page"><h1 class="page-title">Бонус промоция</h1><p class="page-subtitle">По време на FREE BETA не се приемат плащания. Тук можеш да използваш само безплатен бонус.</p>'+(activeText?'<div class="warning-callout"><strong>Активна промоция</strong><span>'+esc(activeText)+'</span></div>':'')+(cards?'<div class="promotion-grid">'+cards+'</div>':'')+(!listing&&bonuses.length?'<a class="secondary-btn beta-choose-listing" href="my-ads.html">Избери от моите обяви</a>':'')+'</div>';

          promoteRoot.addEventListener('click',e=>{
            const b=e.target.closest('[data-use-beta-bonus]');if(!b)return;
            if(!listing){location.href='my-ads.html';return}
            try{
              M.useBonus(b.dataset.useBetaBonus,listing);
              window.marketToast('Бонусът е активиран.');
              setTimeout(()=>location.href='my-ads.html?promoted=1',450);
            }catch(err){window.marketToast(err.message||'Бонусът не може да се активира.')}
          });
        }
      }else{
        const c=M.getConfig(),wallet=M.getWallet();
        const activeListingPromo=listing?M.getActivePromotion?.(listing):null;
        const activePromoName=activeListingPromo?(activeListingPromo.kind==='vip'?'VIP':'TOP'):'';
        const activePromoEnd=activeListingPromo?.expiresAt?new Date(activeListingPromo.expiresAt):null;
        const activePromoText=activeListingPromo?('Тази обява има активен '+activePromoName+(activePromoEnd&&!Number.isNaN(activePromoEnd.getTime())?' до '+activePromoEnd.toLocaleDateString('bg-BG'):'')+'. Нова промоция може да се активира след изтичането му.'):'';
        const walletRows=Object.values(c.products).filter(p=>p.enabled).map(p=>'<div><strong>'+Number(wallet[p.id]||0)+'</strong><span>'+esc(p.name)+'</span></div>').join('');
        const products=Object.values(c.products).filter(p=>p.enabled).map(p=>{
          const has=Number(wallet[p.id]||0)>0,blocked=!!activeListingPromo;
          const action=blocked?'Изчакай да изтече':(listing&&has?'Използвай 1 наличен':listing?'Купи и използвай сега':'Купи');
          return '<article class="promo-card market-promo-card'+(blocked?' is-promo-blocked':'')+'" data-promo-item="'+p.id+'"><div class="market-promo-head"><h3>'+esc(p.name)+'</h3></div><p>'+esc(p.description||'')+'</p><div class="promo-price market-promo-price">'+promoPriceHTML(p)+'</div>'+promoEnd(p)+'<div class="promo-balance-line">Налични: <strong>'+Number(wallet[p.id]||0)+'</strong></div><button class="primary-btn" data-promote-action="'+p.id+'" data-listing="'+esc(listing)+'" '+(blocked?'disabled':'')+'>'+action+'</button></article>';
        }).join('');
        const packages=c.packages.filter(p=>p.enabled).map(p=>'<article class="promo-card market-promo-card"><div class="market-promo-head"><h3>'+esc(p.name)+'</h3></div><p>'+esc(p.description||'')+'</p><div class="promo-price market-promo-price">'+promoPriceHTML(p)+'</div>'+promoEnd(p)+'<button class="secondary-btn" data-buy-package="'+p.id+'">Купи пакет</button></article>').join('');
        promoteRoot.innerHTML='<div class="market-promo-page"><h1 class="page-title">Промотирай обява</h1><p class="page-subtitle">Купените активации стоят в профила ти и ги използваш когато поискаш.</p>'+(activePromoText?'<div class="warning-callout promo-active-lock"><strong>'+esc(activePromoName)+' е активен</strong><span>'+esc(activePromoText)+'</span></div>':'')+'<div class="market-wallet"><div class="market-wallet-title"><strong>Моят баланс</strong><span>Налични активации</span></div><div class="market-wallet-values">'+walletRows+'</div></div><h2>Единични услуги</h2><div class="promotion-grid">'+products+'</div><h2 class="market-section-gap">Пакети</h2><div class="promotion-grid">'+packages+'</div></div>';
        promoteRoot.addEventListener('click',e=>{
          const b=e.target.closest('[data-promote-action]');
          if(b){
            const productId=b.dataset.promoteAction,listingId=b.dataset.listing||'',w=M.getWallet();
            if(listingId){const allowed=M.canApplyPromotion?.(listingId,productId);if(allowed&&!allowed.ok){window.marketToast(allowed.message);return}}
            if(listingId&&Number(w[productId]||0)>0){try{M.useCredit(productId,listingId);window.marketToast('Промоцията е активирана.');setTimeout(()=>location.href='my-ads.html?promoted=1',500)}catch(err){window.marketToast(err.message)}return}
            location.href='checkout.html?item='+encodeURIComponent(productId)+(listingId?'&listing='+encodeURIComponent(listingId):'')+'&context='+(listingId?'listing':'wallet');return;
          }
          const p=e.target.closest('[data-buy-package]');if(p)location.href='checkout.html?item='+encodeURIComponent(p.dataset.buyPackage)+'&context=wallet';
        });
      }
    }

    // Checkout: block overlap before purchase; clear failure screen.
    const checkoutRoot=document.querySelector('[data-checkout-root]');
    if(checkoutRoot){
      const qs=new URLSearchParams(location.search),itemId=qs.get('item')||'',found=M.findItem(itemId),context=qs.get('context')||'wallet',listing=qs.get('listing')||'',backHref=listing?'promote.html?listing='+encodeURIComponent(listing):'promote.html';
      const renderFailure=message=>{
        checkoutRoot.innerHTML='<div class="checkout-shell"><div class="checkout-card payment-failed-card"><h1>Плащането не беше успешно</h1><p>'+esc(message||'Не успяхме да завършим плащането. Не е активирана промоция.')+'</p><button class="primary-btn" data-retry-payment type="button">Опитай отново</button><a class="secondary-btn checkout-back" href="'+backHref+'">Назад</a></div></div>';
        checkoutRoot.querySelector('[data-retry-payment]')?.addEventListener('click',()=>location.reload());
      };
      if(!M.paidAvailable())checkoutRoot.innerHTML=disabledPage('Плащанията са изключени','В момента няма достъпни платени допълнителни услуги.');
      else if(qs.get('payment')==='failed')renderFailure('Плащането беше отказано или прекъснато. Опитай отново или се върни назад.');
      else if(!found)checkoutRoot.innerHTML='<div class="feature-disabled"><h1>Невалидна услуга</h1><p>Избраната услуга не е намерена.</p><a class="primary-btn" href="'+backHref+'">Назад</a></div>';
      else{
        const preflight=listing&&found.type==='product'?M.canApplyPromotion?.(listing,found.item.id):{ok:true};
        if(preflight&&!preflight.ok)checkoutRoot.innerHTML='<div class="checkout-shell"><div class="checkout-card"><h1>Обявата вече има активна промоция</h1><p>'+esc(preflight.message)+'</p><a class="primary-btn checkout-back" href="'+backHref+'">Назад</a></div></div>';
        else{
          const p=M.getPlatform(),price=M.priceFor(found.item),test=p.paymentMode==='test',can=M.checkoutAllowed();
          checkoutRoot.innerHTML='<div class="checkout-shell"><div class="checkout-card"><div class="market-promo-head"><h1>'+esc(found.item.name)+'</h1></div><p>'+esc(found.item.description||'')+'</p><div class="checkout-total"><span>Общо</span><div class="checkout-price-pair">'+(price.onPromo?'<span class="checkout-old-price">'+M.money(price.regular)+'</span>':'')+'<strong>'+M.money(price.current)+'</strong></div></div>'+(price.onPromo?promoEnd(found.item):'')+(test?'<div class="admin-info-box public-test-box"><strong>ТЕСТОВО ПЛАЩАНЕ</strong><span>Няма да бъдат взети истински пари. Това проверява целия поток до добавяне на бонуса.</span></div>':'')+(!can?'<div class="warning-callout">Реалните плащания още не са свързани с платежен оператор.</div>':'')+'<button class="primary-btn checkout-pay" data-checkout-pay '+(can?'':'disabled')+'>'+(test?'Завърши тестово плащане':'Плати')+'</button><a class="secondary-btn checkout-back" href="'+backHref+'">Назад</a></div></div>';
          checkoutRoot.querySelector('[data-checkout-pay]')?.addEventListener('click',()=>{
            try{
              M.completePurchase(itemId,{context,listingId:listing||null});
              const pending=localStorage.getItem('marketPendingPublishV241');
              if(context==='publish'&&pending){const data=JSON.parse(pending);M.useCredit(data.productId,data.listingId||('new-ad-'+Date.now()));localStorage.removeItem('marketPendingPublishV241');localStorage.setItem('demoAdPublished','1');location.href='my-ads.html?published=1&promoted=1';return}
              if(context==='listing'&&listing&&found.type==='product'){M.useCredit(found.item.id,listing);location.href='my-ads.html?promoted=1';return}
              location.href='promote.html?purchased=1';
            }catch(err){renderFailure(err.message||'Не успяхме да завършим плащането. Не е активирана промоция.')}
          });
        }
      }
    }

    // Final step of publishing: paid options OR FREE BETA bonus only.
    const post=document.querySelector('.post-layout');
    if(post&&!(window.SITE_CONFIG||{}).supabaseEnabled&&(M.paidAvailable()||M.bonusPromotionsAvailable?.())){
      const sections=[...post.querySelectorAll('.form-section')],last=sections[sections.length-1],panelBody=last?.querySelector('.panel-body');
      if(panelBody&&!panelBody.querySelector('[data-post-promotion]')){
        const c=M.getConfig(),wallet=M.getWallet(),box=document.createElement('div');
        box.className='post-promotion-box';box.dataset.postPromotion='';

        if(M.paidAvailable()){
          const ids=['bump','top7','vip7'].filter(id=>c.products[id]?.enabled);
          box.innerHTML='<div class="post-promo-title"><strong>Промотирай обявата</strong><span>По желание. Самото публикуване остава безплатно.</span></div><label class="post-promo-option is-selected"><input type="radio" name="post-promotion" value="" checked><span><b>Без промотиране</b><small>0,00 €</small></span></label>'+ids.map(id=>{const p=c.products[id],count=Number(wallet[id]||0),price=M.priceFor(p);return '<label class="post-promo-option"><input type="radio" name="post-promotion" value="'+id+'"><span><b>'+esc(p.name)+'</b><small>'+(count?'Използвай 1 от наличните '+count:'<span class="post-promo-buy-price">Купи за '+(price.onPromo?'<span class="post-promo-old-price">'+M.money(price.regular)+'</span> ':'')+'<strong>'+M.money(price.current)+'</strong></span> и използвай веднага')+(price.onPromo&&p.promotion?.end?'<span class="post-promo-validity">Промо до '+new Date(p.promotion.end).toLocaleDateString('bg-BG')+'</span>':'')+'</small></span></label>'}).join('')+'<a class="post-promo-packages" href="promote.html">Виж пакети и всички налични услуги</a>';
        }else{
          const bonuses=M.getBonusSummary?.()||[];
          box.innerHTML='<div class="post-promo-title"><strong>Безплатен бонус</strong><span>По желание. Няма плащане.</span></div><label class="post-promo-option is-selected"><input type="radio" name="post-promotion" value="" checked><span><b>Публикувай без бонус</b></span></label>'+bonuses.map(b=>{const end=b.redeemUntil?new Date(b.redeemUntil):null;return '<label class="post-promo-option"><input type="radio" name="post-promotion" value="'+esc(b.productId)+'"><span><b>Използвай 1 × '+esc(b.name)+'</b><small>'+(end&&!Number.isNaN(end.getTime())?'Може да се активира до '+end.toLocaleDateString('bg-BG'):'Без плащане')+'</small></span><em>ПОДАРЪК</em></label>'}).join('');
        }

        const callout=panelBody.querySelector('.success-callout');panelBody.insertBefore(box,callout||panelBody.firstChild);
        if(callout)callout.innerHTML=M.paidAvailable()?'<strong>Публикуването на обявата е безплатно.</strong> Плащаш само ако избереш допълнителна услуга.':'<strong>Публикуването е безплатно.</strong> Можеш да използваш наличния си бонус без плащане.';
        const publish=document.querySelector('[data-publish]'),selected=()=>box.querySelector('input[name="post-promotion"]:checked')?.value||'';
        window.marketPostAdPromotion={getSelected:selected};
        box.addEventListener('change',()=>{
          box.querySelectorAll('.post-promo-option').forEach(x=>x.classList.toggle('is-selected',x.querySelector('input')?.checked));
          const id=selected();
          if(!publish)return;
          if(!id)publish.textContent='Публикувай безплатно';
          else if(!M.paidAvailable())publish.textContent='Публикувай и използвай бонус TOP';
          else publish.textContent=Number(M.getWallet()[id]||0)>0?'Публикувай и използвай '+(c.products[id]?.shortName||'бонус'):'Публикувай и плати '+M.money(M.priceFor(c.products[id]).current);
        });
      }
    }

    // Existing ads: real promotion status + overlap lock.
    if(M.promotionAccessAvailable?.()){
      const renderMyAdsPromotions=()=>{
        document.querySelectorAll('[data-tab-panel="active"] .ad-manage').forEach((row,i)=>{
          const listingId=row.dataset.listingId||('demo-'+(i+1)),state=M.getListingPromotionState?.(listingId),info=row.children[1];
          row.querySelector('[data-my-ad-promotion]')?.remove();
          if(info&&state?.active){
            const end=state.expiresAt?new Date(state.expiresAt):null,box=document.createElement('div');
            box.dataset.myAdPromotion='';box.className='ad-promotion-status';
            box.innerHTML='<span class="badge '+(state.kind==='vip'?'badge-vip':'badge-top')+'">'+(state.kind==='vip'?'VIP':'TOP')+'</span><span>Активен до '+(end&&!Number.isNaN(end.getTime())?end.toLocaleDateString('bg-BG'):'изтичане')+'</span>';info.appendChild(box);
          }else if(info&&state?.kind==='bump'&&state.bumpedAt){
            const d=new Date(state.bumpedAt),box=document.createElement('div');box.dataset.myAdPromotion='';box.className='ad-promotion-status ad-bump-status';
            box.textContent='Изкачена'+(!Number.isNaN(d.getTime())?' · '+d.toLocaleString('bg-BG',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'');info.appendChild(box);
          }
          const menu=row.querySelector('[data-overflow-menu]');if(!menu)return;
          menu.querySelector('[data-promote-existing]')?.remove();menu.querySelector('[data-promo-locked-item]')?.remove();
          if(state?.active){
            const locked=document.createElement('span');locked.className='overflow-menu-item is-disabled';locked.dataset.promoLockedItem='';locked.textContent='Активен '+(state.kind==='vip'?'VIP':'TOP')+' — изчакай да изтече';menu.insertBefore(locked,menu.firstChild);
          }else if(M.paidAvailable()||M.bonusPromotionsAvailable?.()){
            const a=document.createElement('a');a.className='overflow-menu-item';a.href='promote.html?listing='+encodeURIComponent(listingId);a.dataset.promoteExisting='';a.textContent=M.paidAvailable()?'Промотирай':'Използвай бонус';menu.insertBefore(a,menu.firstChild);
          }
        });
      };
      renderMyAdsPromotions();window.addEventListener('market:listing-promotion-changed',renderMyAdsPromotions);window.addEventListener('storage',ev=>{if(ev.key==='marketListingPromotionsV241')renderMyAdsPromotions()});setInterval(renderMyAdsPromotions,60000);
    }

    // v2.48 permanent "Промотиране на обяви" row in Profile.
    const profile=document.querySelector('.profile-hub-container');
    if(profile && !window.SITE_CONFIG?.supabaseEnabled){
      const M=window.MarketMonetization,row=profile.querySelector('[data-profile-promotions-row]'),sub=row?.querySelector('[data-profile-promotions-sub]');
      const ownedIds=['demo-1','demo-2','demo-3','demo-4'];
      const renderProfilePromotionSummary=()=>{
        if(!row||!sub||!M)return;
        const bonus=M.getBonusSummary?.()||[];
        const wallet=M.paidAvailable?.()?(M.walletSummary?.()||[]):[];
        const active=ownedIds.map(id=>M.getActivePromotion?.(id)).filter(Boolean);

        const availableCount=
          bonus.reduce((sum,b)=>sum+Number(b.remaining||0),0)+
          wallet.reduce((sum,w)=>sum+Number(w.count||0),0);

        if(availableCount||active.length){
          const parts=[];
          if(availableCount)parts.push(availableCount+' наличн'+(availableCount===1?'а активация':'и активации'));
          if(active.length)parts.push(active.length+' активн'+(active.length===1?'а':'и'));
          sub.textContent=parts.join(' · ');
        }else{
          sub.textContent='VIP, TOP, Изкачи и бонуси';
        }
      };
      renderProfilePromotionSummary();
      window.addEventListener('market:bonus-changed',renderProfilePromotionSummary);
      window.addEventListener('market:wallet-changed',renderProfilePromotionSummary);
      window.addEventListener('market:listing-promotion-changed',renderProfilePromotionSummary);
      window.addEventListener('storage',renderProfilePromotionSummary);
    }
  })();


  // v2.42 "Избрани обяви": VIP only -> if none TOP only -> if none latest bumped.
  (function featuredPromotionsV242(){
    const section=document.querySelector('[data-featured-promo-section]');
    const grid=document.querySelector('[data-featured-promo-grid]');
    const M=window.MarketMonetization;
    if(!section||!grid)return;

    const cards=[...grid.querySelectorAll('[data-featured-listing][data-listing-id]')];
    const subtitle=section.querySelector('[data-featured-promo-subtitle]');

    const clearPromoBadge=card=>{
      card.querySelector('[data-featured-tier-badge]')?.remove();
      card.classList.remove('featured-vip-card','featured-top-card');
    };

    const setBadge=(card,tier)=>{
      clearPromoBadge(card);
      if(tier==='bump')return; // Изкачи has no badge by design.
      const badge=document.createElement('span');
      badge.dataset.featuredTierBadge='';
      badge.className='promo-badge badge '+(tier==='vip'?'badge-vip':'badge-top');
      badge.textContent=tier==='vip'?'VIP':'TOP';
      card.appendChild(badge);
      if(tier==='vip')card.classList.add('featured-vip-card');
      if(tier==='top')card.classList.add('featured-top-card');
    };

    const hide=()=>{
      cards.forEach(card=>{card.hidden=true;clearPromoBadge(card)});
      section.hidden=true;
    };

    const render=()=>{
      // During FREE BETA paid positioning is not public.
      if(!M?.promotionPlacementEnabled?.()){
        hide();
        return;
      }

      const selection=M.getFeaturedPromotionSelection?.()||{tier:null,listingIds:[]};
      if(!selection.tier||!selection.listingIds.length){
        hide();
        return;
      }

      const byId=new Map(cards.map(card=>[card.dataset.listingId,card]));
      const available=selection.listingIds.map(id=>byId.get(id)).filter(Boolean),limit=Math.min(4,available.length),bucket=Math.floor(Date.now()/600000),start=available.length>4?((bucket*4)%available.length):0,ordered=[];
      for(let i=0;i<limit;i++)ordered.push(available[(start+i)%available.length]);

      // Important: never fall down to a lower tier just because this static
      // prototype does not contain a card for a promoted listing.
      if(!ordered.length){
        hide();
        return;
      }

      cards.forEach(card=>{
        card.hidden=!ordered.includes(card);
        clearPromoBadge(card);
      });

      ordered.forEach(card=>{
        setBadge(card,selection.tier);
        grid.appendChild(card);
      });

      if(subtitle){
        subtitle.textContent=
          selection.tier==='vip'?'VIP обяви':
          selection.tier==='top'?'TOP обяви':
          'Изкачени обяви';
      }

      section.hidden=false;
    };

    render();
    window.addEventListener('market:listing-promotion-changed',render);
    window.addEventListener('storage',e=>{
      if(e.key==='marketListingPromotionsV241')render();
    });
    setInterval(render,60000);
  })();


  // v2.44: show VIP/TOP on the current listing only when promotion data says so.
  (function listingDetailPromotionV244(){
    const M=window.MarketMonetization,id=document.body?.dataset?.listingId,titleRow=document.querySelector('.listing-title-row');
    if(!M||!id||!titleRow)return;
    const render=()=>{titleRow.querySelector('[data-detail-promo-badge]')?.remove();if(!M.promotionPlacementEnabled?.())return;const state=M.getActivePromotion?.(id);if(!state)return;const badge=document.createElement('span');badge.dataset.detailPromoBadge='';badge.className='badge detail-promo-badge '+(state.kind==='vip'?'badge-vip':'badge-top');badge.textContent=state.kind==='vip'?'VIP':'TOP';titleRow.insertBefore(badge,titleRow.querySelector('[data-share-listing]')||null)};
    render();window.addEventListener('market:listing-promotion-changed',render);setInterval(render,60000);
  })();


  // v2.47 Promotions & bonuses account page.
  (function profilePromotionsV249(){
    const root=document.querySelector('[data-promotions-profile-root]');
    const M=window.MarketMonetization;
    if(!root||!M||window.SITE_CONFIG?.supabaseEnabled)return;
    const esc=window.Market?.escapeHTML||function(v){return String(v??'').replace(/[&<>"']/g,'')};

    const owned=[...root.querySelectorAll('[data-owned-listing]')].map(x=>({
      id:x.dataset.listingId||'',
      title:x.dataset.listingTitle||'Обява'
    })).filter(x=>x.id);

    const fmtDate=value=>{
      const d=value?new Date(value):null;
      return d&&!Number.isNaN(d.getTime())?d.toLocaleDateString('bg-BG'):'';
    };

    const productOrder=['vip30','vip7','top30','top7','bump'];

    const render=()=>{
      const available=root.querySelector('[data-available-promotions]');
      const activeBox=root.querySelector('[data-active-promotions]');
      const historyBox=root.querySelector('[data-promotion-account-history]');
      const summaryAvailable=root.querySelector('[data-promotion-summary-available]');
      const summaryActive=root.querySelector('[data-promotion-summary-active]');
      const buyCta=root.querySelector('[data-promotion-buy-cta]');
      const config=M.getConfig?.()||{};
      const currentUser=M.getCurrentUser?.()?.id||'';
      const bonus=M.getBonusSummary?.()||[];
      const wallet=M.paidAvailable?.()?(M.getWallet?.()||{}):{};

      if(buyCta)buyCta.hidden=!M.paidAvailable?.();

      const activeByProduct={};
      const activeRows=[];
      owned.forEach(item=>{
        const state=M.getActivePromotion?.(item.id);
        if(!state)return;
        const pid=state.productId||state.kind||'';
        activeByProduct[pid]=(activeByProduct[pid]||0)+1;
        activeRows.push(
          '<a class="promotion-account-row promotion-active-row" href="my-ads.html"><div><strong>'+esc(item.title)+'</strong><span><b class="'+(state.kind==='vip'?'text-vip':'text-top')+'">'+(state.kind==='vip'?'VIP':'TOP')+'</b>'+(state.expiresAt?' · до '+esc(fmtDate(state.expiresAt)):'')+'</span></div><span class="profile-menu-chevron">›</span></a>'
        );
      });

      const availableRows=[];
      let totalAvailable=0;

      bonus.forEach(b=>{
        const remaining=Number(b.remaining||0);
        const activeCount=Number(activeByProduct[b.productId]||0);
        totalAvailable+=remaining;
        availableRows.push(
          '<div class="promotion-inventory-row bonus-inventory-row"><div class="promotion-inventory-copy"><span class="beta-chip">БОНУС</span><strong>'+esc(b.name)+'</strong><small>'+(b.redeemUntil?'Използвай до '+esc(fmtDate(b.redeemUntil)):'Безплатна активация')+'</small></div><div class="promotion-inventory-stats"><div><strong>'+remaining+'</strong><span>налични</span></div>'+(activeCount?'<div><strong>'+activeCount+'</strong><span>активни</span></div>':'')+'</div><a class="mini-btn" href="my-ads.html">Използвай</a></div>'
        );
      });

      if(M.paidAvailable?.()){
        const products=config.products||{};
        const ids=[...productOrder,...Object.keys(products).filter(id=>!productOrder.includes(id))];
        ids.forEach(id=>{
          const p=products[id];
          if(!p||!p.enabled)return;
          const availableCount=Number(wallet[id]||0);
          const activeCount=Number(activeByProduct[id]||0);
          totalAvailable+=availableCount;

          if(!availableCount&&!activeCount)return;

          const stats=['<div><strong>'+availableCount+'</strong><span>налични</span></div>'];
          if(p.kind==='top'||p.kind==='vip'){
            stats.push('<div><strong>'+activeCount+'</strong><span>активни</span></div>');
          }

          availableRows.push(
            '<div class="promotion-inventory-row"><div class="promotion-inventory-copy"><strong>'+esc(p.name)+'</strong><small>'+(p.kind==='bump'?'Еднократно изкачване':'Активации за промотиране')+'</small></div><div class="promotion-inventory-stats">'+stats.join('')+'</div>'+(availableCount?'<a class="mini-btn" href="my-ads.html">Използвай</a>':'')+'</div>'
          );
        });
      }

      const history=(M.getHistory?.()||[]).filter(x=>!currentUser||x.userId===currentUser).slice(0,12);
      const hasEverPurchased=history.some(x=>x.source==='purchase');
      const hasEverPromotionActivity=history.length>0;

      if(summaryAvailable)summaryAvailable.textContent=String(totalAvailable);
      if(summaryActive)summaryActive.textContent=String(activeRows.length);

      if(available){
        if(availableRows.length){
          available.innerHTML=availableRows.join('');
        }else{
          const secondary=M.paidAvailable?.()
            ? (hasEverPurchased
                ? 'В момента нямаш неизползвани VIP, TOP или Изкачи активации.'
                : 'Все още не си купувал VIP, TOP или Изкачи.')
            : 'В момента нямаш наличен FREE BETA бонус или друга активация.';
          available.innerHTML='<div class="promotion-empty-state promotion-empty-box"><strong>Нямаш налични активации</strong><span>'+secondary+'</span></div>';
        }
      }

      if(activeBox){
        activeBox.innerHTML=activeRows.length
          ? activeRows.join('')
          : '<div class="promotion-empty-state promotion-empty-box compact"><strong>Нямаш активни промотирания</strong><span>Нито една твоя обява в момента няма активен TOP или VIP.</span></div>';
      }

      if(historyBox){
        if(history.length){
          historyBox.innerHTML=history.map(x=>{
            const product=config.products?.[x.productId];
            const name=product?.name||x.productId||'Промотиране';
            const d=x.at?new Date(x.at):null;
            const when=d&&!Number.isNaN(d.getTime())?d.toLocaleString('bg-BG',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
            let action=x.reason||'Операция';
            if(x.source==='purchase')action='Закупена активация';
            if(x.source==='beta-bonus')action='Получен FREE BETA бонус';
            if(x.source==='beta-bonus-use')action='Използван FREE BETA бонус';
            if(x.source==='use')action='Използвана активация';
            return '<div class="promotion-history-row"><div><strong>'+esc(name)+'</strong><span>'+esc(action)+'</span></div><small>'+esc(when)+'</small></div>';
          }).join('');
        }else{
          historyBox.innerHTML='<div class="promotion-empty-state promotion-empty-box compact"><strong>Нямаш история на промотиране</strong><span>Все още не си купувал, получавал или използвал VIP, TOP, Изкачи или бонус.</span></div>';
        }
      }
    };

    render();
    window.addEventListener('market:bonus-changed',render);
    window.addEventListener('market:wallet-changed',render);
    window.addEventListener('market:listing-promotion-changed',render);
    window.addEventListener('storage',render);
    setInterval(render,60000);
  })();

})();


// v2.53 required-field consistency pass.


// v2.54: seller reviews, reserved listings, price-drop notifications, distance search and security UI.
(function(){
  'use strict';
  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
  const esc=window.Market?.escapeHTML||((v)=>String(v??'').replace(/[&<>"']/g,''));
  const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch(e){return d}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const toast=(m)=>window.marketToast?.(m);

  // ---- status: Active / Reserved / Sold / Deactivated ----
  const STATUS_KEY='marketListingStatusV254';
  const getStatuses=()=>read(STATUS_KEY,{});
  const setStatus=(id,status)=>{const m=getStatuses();m[id]=status;write(STATUS_KEY,m);window.dispatchEvent(new CustomEvent('market:listing-status-changed',{detail:{id,status}}));};
  const statusLabel=s=>({active:'Активна',reserved:'Запазена',sold:'Продадена',deactivated:'Деактивирана'}[s]||'Активна');
  function drawStatuses(){
    const map=getStatuses();
    $$('[data-tab-panel="active"] .ad-manage[data-listing-id]').forEach(row=>{
      const id=row.dataset.listingId,st=map[id]||'active',meta=row.querySelector('[data-ad-status-text]');
      if(meta){const price=(meta.textContent.split('·')[0]||'').trim();meta.textContent=price+' · '+statusLabel(st);}
      const reserve=row.querySelector('[data-ad-action="reserve"]');
      if(reserve)reserve.textContent=st==='reserved'?'Върни като активна':'Запази за купувач';
      row.classList.toggle('is-reserved',st==='reserved');
    });
    $$('.listing-row[data-listing-id]').forEach(row=>{
      const st=map[row.dataset.listingId]||'active';
      row.classList.toggle('is-reserved',st==='reserved');
    });
    const detailId=document.body?.dataset?.listingId;
    if(detailId){
      const st=map[detailId]||'active',banner=$('[data-listing-status-banner]');
      if(banner){
        if(st==='reserved') {banner.hidden=false;banner.textContent='Този уред е запазен за купувач. Можеш да изпратиш съобщение, но телефонният контакт е временно скрит.';}
        else if(st==='sold') {banner.hidden=false;banner.textContent='Този уред е маркиран като продаден.';}
        else banner.hidden=true;
      }
      const reserve=st==='reserved';
      $$('a[href^="tel:"], [data-phone]').forEach(x=>{if(!x.closest('.site-header'))x.classList.toggle('reserved-contact-disabled',reserve)});
    }
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-ad-action]');if(!b)return;
    const row=b.closest('[data-listing-id]'),id=row?.dataset.listingId;if(!id)return;
    const action=b.dataset.adAction;
    if(action==='reserve'){
      const now=getStatuses()[id]||'active';setStatus(id,now==='reserved'?'active':'reserved');toast(now==='reserved'?'Обявата отново е активна.':'Обявата е маркирана като запазена.');drawStatuses();
    } else if(action==='sold'){setStatus(id,'sold');drawStatuses()}
      else if(action==='deactivate'){setStatus(id,'deactivated');drawStatuses()}
  });
  drawStatuses();

  // ---- ratings after completed transactions ----
  const DEALS_KEY='marketCompletedDealsV254',REVIEWS_KEY='marketSellerReviewsV254';
  const baseReviews={
    'seller-1':[
      {id:'base-r1',stars:5,name:'Мария П.',date:'08.09.2026',text:'Точно описание и коректна комуникация. Уредът беше както е описан.'},
      {id:'base-r2',stars:5,name:'Георги Н.',date:'01.09.2026',text:'Бързо уточнихме транспорта и всичко мина нормално.'},
      {id:'base-r3',stars:4,name:'Иван К.',date:'24.08.2026',text:'Коректен продавач. Получих достатъчно информация преди покупката.'}
    ]
  };
  const allReviews=id=>[...(baseReviews[id]||[]),...read(REVIEWS_KEY,[]).filter(x=>x.sellerId===id)].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const reviewer=()=>window.MarketMonetization?.getCurrentUser?.()||{id:'demo-user',name:'Иван Петров'};
  const eligible=id=>{const u=reviewer();if(!u?.id||u.id===id)return false;return read(DEALS_KEY,[]).some(x=>x.sellerId===id&&x.buyerId===u.id&&!read(REVIEWS_KEY,[]).some(r=>r.dealId===x.id));};
  const baseSummary={'seller-1':{avg:4.9,count:27}};
  const summary=id=>{
    const b=baseSummary[id]||{avg:0,count:0},custom=read(REVIEWS_KEY,[]).filter(x=>x.sellerId===id);
    if(!custom.length)return b;
    const total=b.avg*b.count+custom.reduce((s,x)=>s+x.stars,0),count=b.count+custom.length;
    return {avg:Math.round(total/count*10)/10,count};
  };
  function renderRatings(){
    $$('[data-seller-rating]').forEach(x=>{const id=x.dataset.sellerRating||'seller-1',s=summary(id);x.textContent='★ '+s.avg.toFixed(1)+' · '+s.count+' оценки'});
    const section=$('[data-reviews-section]');if(!section)return;
    const id=section.dataset.sellerId||'seller-1',s=summary(id),list=section.querySelector('[data-review-list]');
    const reviewButton=section.querySelector('[data-open-review]');if(reviewButton)reviewButton.hidden=!eligible(id);
    section.querySelector('[data-rating-average]').textContent=s.avg.toFixed(1);section.querySelector('[data-rating-count]').textContent=s.count;
    if(list)list.innerHTML=allReviews(id).slice(0,5).map(r=>`<article class="seller-review"><div class="seller-review-head"><div><div class="seller-review-name">${esc(r.name)}</div><div class="seller-review-meta">Потвърдена сделка · ${esc(r.date||'сега')}</div></div><div class="seller-review-stars" aria-label="${r.stars} от 5">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div></div>${r.text?`<p>${esc(r.text)}</p>`:''}</article>`).join('');
  }
  function ensureReviewModal(sellerId){
    let modal=$('.review-modal');if(modal)return modal;
    modal=document.createElement('div');modal.className='review-modal';modal.hidden=true;
    modal.innerHTML=`<div class="review-modal-card" role="dialog" aria-modal="true" aria-labelledby="review-title"><div class="review-modal-head"><h2 id="review-title">Оцени продавача</h2><button class="review-close" type="button" aria-label="Затвори">×</button></div><p class="muted small">Оценката се свързва с приключената сделка. Не публикувай телефон, адрес или други лични данни.</p><div class="review-stars-input" aria-label="Оценка"><button type="button" data-review-star="1">★</button><button type="button" data-review-star="2">★</button><button type="button" data-review-star="3">★</button><button type="button" data-review-star="4">★</button><button type="button" data-review-star="5">★</button></div><textarea maxlength="500" data-review-text placeholder="Кратък коментар (по желание)"></textarea><div class="review-modal-actions"><button type="button" class="ghost-btn" data-review-cancel>Отказ</button><button type="button" class="primary-btn" data-review-submit>Публикувай оценката</button></div></div>`;
    document.body.appendChild(modal);return modal;
  }
  document.addEventListener('click',e=>{
    const complete=e.target.closest('[data-complete-deal]');
    if(complete){
      const sellerId=complete.dataset.completeDeal||'seller-1',listingId=complete.dataset.listingId||'demo-1';let deals=read(DEALS_KEY,[]);
      if(!deals.some(x=>x.sellerId===sellerId&&x.listingId===listingId))deals.push({id:'deal-'+Date.now(),sellerId,listingId,completedAt:Date.now()});
      write(DEALS_KEY,deals);complete.textContent='Сделката е приключена';complete.disabled=true;toast('Сделката е отбелязана като приключена. Вече може да бъде оставена оценка.');return;
    }
    const open=e.target.closest('[data-open-review]');
    if(open){
      const id=open.dataset.openReview||'seller-1';if(!eligible(id)){toast('Оценка може да се остави само след приключена сделка.');return;}
      const m=ensureReviewModal(id);m.dataset.sellerId=id;m.dataset.stars='0';m.querySelectorAll('[data-review-star]').forEach(x=>x.classList.remove('active'));m.querySelector('[data-review-text]').value='';m.hidden=false;return;
    }
    const star=e.target.closest('[data-review-star]');if(star){const m=star.closest('.review-modal'),n=+star.dataset.reviewStar;m.dataset.stars=String(n);m.querySelectorAll('[data-review-star]').forEach(x=>x.classList.toggle('active',+x.dataset.reviewStar<=n));return;}
    if(e.target.closest('[data-review-cancel],.review-close')){e.target.closest('.review-modal').hidden=true;return;}
    const submit=e.target.closest('[data-review-submit]');if(submit){
      const m=submit.closest('.review-modal'),sellerId=m.dataset.sellerId,stars=+m.dataset.stars,text=m.querySelector('[data-review-text]').value.trim();if(stars<1){toast('Избери оценка от 1 до 5 звезди.');return;}
      const u=reviewer();const deal=read(DEALS_KEY,[]).find(x=>x.sellerId===sellerId&&x.buyerId===u.id&&!read(REVIEWS_KEY,[]).some(r=>r.dealId===x.id));if(!deal){toast('Няма потвърдена покупка за оценяване.');m.hidden=true;return;}
      const reviews=read(REVIEWS_KEY,[]);const displayName=(u.name||'Купувач').trim().split(/\s+/).map((v,i)=>i===0?v:(v.charAt(0)+'.')).join(' ');reviews.push({id:'review-'+Date.now(),dealId:deal.id,sellerId,buyerId:u.id,stars,text,name:displayName,date:new Date().toLocaleDateString('bg-BG'),createdAt:Date.now()});write(REVIEWS_KEY,reviews);m.hidden=true;renderRatings();toast('Оценката е публикувана.');
    }
  });
  renderRatings();

  // ---- favorite price snapshots + price drop notifications ----
  const SNAP_KEY='marketFavoritePriceSnapshotsV254',PRICE_KEY='marketListingPricesV254',NOTIFY_KEY='marketNotificationsV254';
  const favMap={'p1':'demo-1','p2':'demo-2','p3':'demo-3','p4':'demo-4','p5':'demo-5','p6':'demo-6','p7':'demo-7','p8':'demo-8','p9':'demo-9','p10':'demo-10'};
  const defaultPrices={'demo-1':329,'demo-2':289,'demo-3':499,'demo-4':579,'demo-5':489,'demo-6':649,'demo-7':379,'demo-8':249,'demo-9':699,'demo-10':219};
  const getPrice=id=>Number(read(PRICE_KEY,{})[id]??defaultPrices[id]??0);
  const notify=(n)=>{let arr=read(NOTIFY_KEY,[]);if(n.dedupe&&arr.some(x=>x.dedupe===n.dedupe))return;arr.unshift({id:'n-'+Date.now()+'-'+Math.random().toString(16).slice(2),createdAt:Date.now(),read:false,...n});write(NOTIFY_KEY,arr.slice(0,80));localStorage.setItem('marketUnreadNotifications',String(arr.filter(x=>!x.read).length));};
  function nodePrice(btn){const row=btn.closest('[data-listing-id]'),id=row?.dataset.listingId||favMap[btn.dataset.favorite];if(id)return {id,price:getPrice(id)||Number((row?.dataset.price||'').replace(',','.'))||0};return null}
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-favorite]');if(!b)return;
    setTimeout(()=>{const idFav=b.dataset.favorite,on=read('favorites',[]).includes(idFav),p=nodePrice(b);if(!p)return;let s=read(SNAP_KEY,{});if(on&&!s[idFav])s[idFav]={listingId:p.id,price:p.price,title:b.closest('.listing-row,.product-card,.detail-card')?.querySelector('h1,h3,.listing-title')?.textContent?.trim()||'Любима обява'};if(!on)delete s[idFav];write(SNAP_KEY,s)},0);
  });
  function applyStoredPrices(){
    const prices=read(PRICE_KEY,{});
    $$('[data-listing-id]').forEach(node=>{const id=node.dataset.listingId,p=prices[id];if(!p)return;node.dataset.price=String(p);const el=node.querySelector('.detail-price,.price');if(el)el.textContent=Number(p).toLocaleString('bg-BG')+' €'});
    if(document.body?.dataset?.listingId){const id=document.body.dataset.listingId,p=prices[id];if(p){$$('.detail-price,.mobile-top-price>span').forEach(x=>x.textContent=Number(p).toLocaleString('bg-BG')+' €')}}
  }
  function checkPriceDrops(){
    const favs=read('favorites',[]),snap=read(SNAP_KEY,{});
    favs.forEach(fid=>{const s=snap[fid];if(!s)return;const now=getPrice(s.listingId);if(now>0&&s.price>now){notify({type:'prices',kind:'price-drop',title:'Намаление на любима обява',text:`${s.title} е намалена от ${s.price} € на ${now} €.`,href:s.listingId==='demo-1'?'listing.html':'favorites.html',dedupe:`price-${s.listingId}-${now}`});s.price=now;}});write(SNAP_KEY,snap);
  }
  applyStoredPrices();
  (function initFavoriteSnapshots(){const favs=read('favorites',[]),snap=read(SNAP_KEY,{});favs.forEach(fid=>{if(snap[fid])return;const id=favMap[fid];if(!id)return;snap[fid]={listingId:id,price:getPrice(id),title:id==='demo-1'?'Bosch Serie 6':'Любима обява'};});write(SNAP_KEY,snap)})();
  checkPriceDrops();
  const editSave=$('[data-edit-save]');
  editSave?.addEventListener('click',()=>setTimeout(()=>{
    const priceEl=document.getElementById('field-4');if(!priceEl||!priceEl.value)return;const id='demo-1',newPrice=Number(priceEl.value),prices=read(PRICE_KEY,{}),old=Number(prices[id]??defaultPrices[id]);if(!(newPrice>0))return;prices[id]=newPrice;write(PRICE_KEY,prices);
    const favs=read('favorites',[]),snap=read(SNAP_KEY,{}),fid='p1';if(favs.includes(fid)){const original=snap[fid]?.price||old;if(newPrice<original){notify({type:'prices',kind:'price-drop',title:'Намаление на любима обява',text:`Bosch Serie 6 е намалена от ${original} € на ${newPrice} €.`,href:'listing.html',dedupe:`price-${id}-${newPrice}`});snap[fid]={listingId:id,price:newPrice,title:'Bosch Serie 6'};write(SNAP_KEY,snap);}}
  },0));
  function renderNotifications(){
    const box=$('[data-notification-list]');if(!box)return;const arr=read(NOTIFY_KEY,[]),empty=$('[data-notifications-empty]');
    if(!arr.length){if(empty)empty.hidden=false;return}
    if(empty)empty.hidden=true;
    box.querySelectorAll('.notification-item').forEach(x=>x.remove());
    arr.forEach(n=>{const a=document.createElement('article');a.className='notification-item '+(n.kind==='price-drop'?'notification-price-drop ':'')+(n.read?'':'is-unread');a.dataset.notificationType=n.type||'system';a.innerHTML=`<div class="notification-icon">${n.kind==='price-drop'?'↓':'•'}</div><div class="notification-copy"><strong>${esc(n.title)}</strong><p>${esc(n.text)}</p><small>${new Date(n.createdAt).toLocaleString('bg-BG',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></div>${n.href?`<a class="mini-btn" href="${esc(n.href)}">Виж</a>`:''}`;box.appendChild(a)});
    arr.forEach(x=>x.read=true);write(NOTIFY_KEY,arr);localStorage.setItem('marketUnreadNotifications','0');
  }
  renderNotifications();
  document.addEventListener('click',e=>{const f=e.target.closest('[data-notification-filter]');if(!f)return;const type=f.dataset.notificationFilter;setTimeout(()=>{$$('.notification-item').forEach(x=>x.hidden=type!=='all'&&x.dataset.notificationType!==type)},0)});

  // ---- distance filter: city center or browser geolocation ----
  const cityCoords={'софия':[42.6977,23.3219],'пловдив':[42.1354,24.7453],'варна':[43.2141,27.9147],'бургас':[42.5048,27.4626],'кюстендил':[42.2839,22.6911],'благоевград':[42.0209,23.0943],'перник':[42.6052,23.0378],'русе':[43.8356,25.9657],'дупница':[42.2673,23.1188],'стара загора':[42.4258,25.6345],'плевен':[43.4170,24.6067],'велико търново':[43.0757,25.6172]};
  const norm=s=>String(s||'').trim().toLowerCase();
  const hav=(a,b)=>{const R=6371,dLat=(b[0]-a[0])*Math.PI/180,dLon=(b[1]-a[1])*Math.PI/180,la1=a[0]*Math.PI/180,la2=b[0]*Math.PI/180,x=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
  let geoOrigin=read('marketDistanceOriginV254',null);
  function distanceOrigin(){if(geoOrigin?.lat)return [geoOrigin.lat,geoOrigin.lon];const city=$('#cityFilter')?.value;return cityCoords[norm(city)]||null}
  window.marketDistanceAllowsRow=(row)=>{const radius=Number($('#distanceRadius')?.value||0);if(!radius)return true;const origin=distanceOrigin();if(!origin)return true;const lat=Number(row.dataset.lat),lon=Number(row.dataset.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return false;return hav(origin,[lat,lon])<=radius};
  function applyDistance(){
    const radius=Number($('#distanceRadius')?.value||0),origin=distanceOrigin(),hint=$('[data-distance-hint]');
    if(!radius){$$('.listing-distance').forEach(x=>x.remove());if(hint)hint.textContent='Избери град и разстояние или използвай текущото си местоположение.';return}
    if(!origin){$$('.listing-distance').forEach(x=>x.remove());if(hint)hint.textContent='За филтър по разстояние избери град или използвай „Моето място“.';return}
    $$('.listing-row[data-lat][data-lon]').forEach(row=>{if(row.style.display==='none')return;const d=hav(origin,[+row.dataset.lat,+row.dataset.lon]);let tag=row.querySelector('.listing-distance');if(!tag){tag=document.createElement('span');tag.className='listing-distance';row.querySelector('.location')?.appendChild(tag)}if(tag)tag.textContent='· '+Math.round(d)+' км'});
    if(hint)hint.textContent=(geoOrigin?.lat?'Разстояние от текущото ти местоположение.':'Разстояние от '+($('#cityFilter')?.value||'избрания град')+'.');
  }
  const radius=$('#distanceRadius'),city=$('#cityFilter'),search=$('[data-listing-search]');
  [radius,city,search,...$$('.filter-panel select,.filter-panel input')].filter(Boolean).forEach(x=>['input','change'].forEach(ev=>x.addEventListener(ev,()=>setTimeout(applyDistance,0))));
  radius?.addEventListener('change',()=>setTimeout(applyDistance,10));
  $('[data-use-location]')?.addEventListener('click',()=>{
    if(!navigator.geolocation){toast('Браузърът не поддържа местоположение.');return}
    const b=$('[data-use-location]'),hint=$('[data-distance-hint]');b.disabled=true;b.textContent='Определям…';navigator.geolocation.getCurrentPosition(pos=>{geoOrigin={lat:pos.coords.latitude,lon:pos.coords.longitude,at:Date.now()};write('marketDistanceOriginV254',geoOrigin);if(radius&&!radius.value)radius.value='50';b.disabled=false;b.textContent='Моето място';radius?.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(applyDistance,0)},()=>{b.disabled=false;b.textContent='Моето място';if(hint)hint.textContent='Не получих достъп до местоположението. Можеш да избереш град.';toast('Няма разрешение за местоположението.')},{enableHighAccuracy:false,timeout:8000,maximumAge:600000});
  });
  setTimeout(applyDistance,300);

  // ---- 2FA UI: prototype only; real secret and verification must be backend-side ----
  if((window.SITE_CONFIG||{}).supabaseEnabled)return;
  function draw2FA(){const on=localStorage.getItem('marketDemo2FAV254')==='1',pill=$('[data-two-factor-status]'),btn=$('[data-toggle-two-factor]'),codes=$('[data-backup-codes]');if(pill){pill.textContent=on?'Включена':'Изключена';pill.classList.toggle('is-on',on)}if(btn)btn.textContent=on?'Изключи 2FA':'Настрой 2FA';if(codes&&!on)codes.hidden=true}
  $('[data-toggle-two-factor]')?.addEventListener('click',()=>{const on=localStorage.getItem('marketDemo2FAV254')==='1';if(on){localStorage.removeItem('marketDemo2FAV254');localStorage.removeItem('marketDemo2FACodesV254');toast('2FA е изключена в прототипа.');draw2FA();return}const rand=()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0].toString(36).slice(0,4).toUpperCase().padEnd(4,'X')};const codes=Array.from({length:8},()=>rand()+'-'+rand());localStorage.setItem('marketDemo2FAV254','1');write('marketDemo2FACodesV254',codes);const box=$('[data-backup-codes]');if(box){box.innerHTML='<strong>Резервни кодове — запази ги на сигурно място</strong><div class="security-code-grid">'+codes.map(c=>'<span>'+esc(c)+'</span>').join('')+'</div><small class="muted">В production кодовете и 2FA secret-ът няма да се пазят в браузъра.</small>';box.hidden=false}toast('2FA е подготвена в тестовия интерфейс.');draw2FA()});
  draw2FA();
})();


// v2.55: seller-only completed-sale flow with explicit buyer selection.
(function dealCompletionV255(){
  'use strict';
  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
  const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch(e){return d}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const DEALS_KEY='marketCompletedDealsV254';
  const REVIEWS_KEY='marketSellerReviewsV254';
  const toast=m=>window.marketToast?.(m);
  const html=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const currentUser=()=>window.MarketMonetization?.getCurrentUser?.()||{id:''};
  const isSeller=(trigger)=>{
    const explicit=document.body?.dataset?.chatRole;
    if(explicit)return explicit==='seller';
    const owner=trigger?.dataset?.sellerId||document.body?.dataset?.listingOwnerId||'';
    return !!owner&&currentUser().id===owner;
  };
  const buyerRows=(listingId)=>$$(`.conversation[data-listing-id="${CSS.escape(listingId)}"][data-buyer-id]`).map(row=>({
    buyerId:row.dataset.buyerId,
    buyerName:row.dataset.buyerName||row.querySelector('.conversation-name')?.textContent?.trim()||'Купувач',
    conversationId:row.dataset.conversationId||'',
    archived:row.dataset.conversationState==='archived',
    active:row.classList.contains('active')
  }));
  const existingDeal=(sellerId,listingId)=>read(DEALS_KEY,[]).find(x=>x.sellerId===sellerId&&x.listingId===listingId&&x.buyerId);
  function syncTrigger(trigger){
    if(!trigger)return;
    if(!isSeller(trigger)){trigger.hidden=true;return;}
    const deal=existingDeal(trigger.dataset.sellerId||'',trigger.dataset.listingId||'');
    if(deal){trigger.textContent=`Сделката е приключена с ${deal.buyerName||'избран купувач'}`;trigger.disabled=true;trigger.setAttribute('aria-disabled','true');}
  }
  function ensureModal(){
    let modal=$('[data-deal-modal]');if(modal)return modal;
    modal=document.createElement('div');
    modal.className='deal-modal';modal.dataset.dealModal='';modal.hidden=true;
    modal.innerHTML=`<div class="deal-modal-card" role="dialog" aria-modal="true" aria-labelledby="deal-modal-title">
      <div class="deal-modal-head"><div><h2 id="deal-modal-title">Приключване на сделка</h2><p class="muted small" data-deal-product></p></div><button class="deal-modal-close" type="button" aria-label="Затвори">×</button></div>
      <div class="deal-modal-note">Избери кой от писалите купувачи реално е купил уреда. <strong>Само този профил</strong> ще може да оцени продавача.</div>
      <fieldset class="deal-buyer-list" data-deal-buyers><legend>Купувач</legend></fieldset>
      <label class="deal-confirm-check"><input type="checkbox" data-deal-confirm/> <span>Потвърждавам, че сделката с избрания купувач е приключена.</span></label>
      <div class="deal-modal-actions"><button class="ghost-btn" type="button" data-deal-cancel>Отказ</button><button class="primary-btn" type="button" data-deal-submit disabled>Потвърди сделката</button></div>
    </div>`;
    document.body.appendChild(modal);
    return modal;
  }
  function closeModal(modal){if(!modal)return;modal.hidden=true;modal.dataset.sellerId='';modal.dataset.listingId='';}
  function updateSubmit(modal){
    const picked=modal.querySelector('input[name="dealBuyer"]:checked');
    const confirmed=modal.querySelector('[data-deal-confirm]')?.checked;
    const submit=modal.querySelector('[data-deal-submit]');if(submit)submit.disabled=!(picked&&confirmed);
  }
  function openModal(trigger){
    if(!isSeller(trigger)){toast('Само продавачът на обявата може да отбележи приключена сделка.');return;}
    const sellerId=trigger.dataset.sellerId||'',listingId=trigger.dataset.listingId||'';
    if(existingDeal(sellerId,listingId)){syncTrigger(trigger);toast('За тази обява вече е избран купувач.');return;}
    const buyers=buyerRows(listingId);
    if(!buyers.length){toast('Няма разговори с купувачи за тази обява.');return;}
    const modal=ensureModal();modal.dataset.sellerId=sellerId;modal.dataset.listingId=listingId;
    const title=$('.chat-product strong')?.textContent?.trim()||'Тази обява';
    modal.querySelector('[data-deal-product]').textContent=title;
    const list=modal.querySelector('[data-deal-buyers]');
    const active=buyers.find(x=>x.active)?.buyerId||buyers[0].buyerId;
    list.innerHTML=buyers.map(b=>`<label class="deal-buyer-option"><input type="radio" name="dealBuyer" value="${html(b.buyerId)}" data-buyer-name="${html(b.buyerName)}" data-conversation-id="${html(b.conversationId)}" ${b.buyerId===active?'checked':''}/><span class="deal-buyer-avatar">${html(b.buyerName.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())}</span><span class="deal-buyer-copy"><strong>${html(b.buyerName)}</strong><small>${b.archived?'Архивиран разговор':'Активен разговор'}</small></span><span class="deal-buyer-radio"></span></label>`).join('');
    const confirm=modal.querySelector('[data-deal-confirm]');confirm.checked=false;
    updateSubmit(modal);modal.hidden=false;
    setTimeout(()=>list.querySelector('input:checked')?.focus(),0);
  }
  $$('[data-open-complete-deal]').forEach(syncTrigger);
  document.addEventListener('click',e=>{
    const open=e.target.closest('[data-open-complete-deal]');if(open){e.preventDefault();openModal(open);return;}
    const modal=e.target.closest('[data-deal-modal]');
    if(!modal)return;
    if(e.target===modal||e.target.closest('[data-deal-cancel],.deal-modal-close')){closeModal(modal);return;}
    const submit=e.target.closest('[data-deal-submit]');if(!submit)return;
    const radio=modal.querySelector('input[name="dealBuyer"]:checked');
    const confirm=modal.querySelector('[data-deal-confirm]');
    if(!radio||!confirm?.checked){updateSubmit(modal);return;}
    const sellerId=modal.dataset.sellerId,listingId=modal.dataset.listingId;
    if(!isSeller(document.querySelector(`[data-open-complete-deal][data-listing-id="${CSS.escape(listingId)}"]`))){closeModal(modal);toast('Само продавачът може да потвърди продажбата.');return;}
    let deals=read(DEALS_KEY,[]);
    if(deals.some(x=>x.sellerId===sellerId&&x.listingId===listingId&&x.buyerId)){closeModal(modal);toast('За тази обява вече има потвърдена продажба.');return;}
    // Remove old prototype records that did not identify the buyer.
    deals=deals.filter(x=>!(x.sellerId===sellerId&&x.listingId===listingId&&!x.buyerId));
    const deal={id:'deal-'+Date.now(),sellerId,listingId,buyerId:radio.value,buyerName:radio.dataset.buyerName||'Купувач',conversationId:radio.dataset.conversationId||'',completedAt:Date.now()};
    deals.push(deal);write(DEALS_KEY,deals);
    closeModal(modal);
    $$(`[data-open-complete-deal][data-seller-id="${CSS.escape(sellerId)}"][data-listing-id="${CSS.escape(listingId)}"]`).forEach(syncTrigger);
    toast(`Сделката е приключена с ${deal.buyerName}. Само този купувач може да остави оценка.`);
  });
  document.addEventListener('change',e=>{const modal=e.target.closest('[data-deal-modal]');if(modal&&(e.target.matches('input[name="dealBuyer"]')||e.target.matches('[data-deal-confirm]')))updateSubmit(modal);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const modal=$('[data-deal-modal]:not([hidden])');if(modal)closeModal(modal);}});
})();
