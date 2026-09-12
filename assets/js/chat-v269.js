(()=>{
  'use strict';

  if(!document.body.classList.contains('messages-page'))return;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const toast=(m)=>window.marketToast?.(m);
  const ARCHIVE_KEY='marketArchivedConversationIdsV227';
  const VIEW_KEY='marketConversationViewV227';
  const BLOCK_KEY='marketBlockedSellers';
  const DEALS_KEY='marketCompletedDealsV254';

  const readJSON=(key,fallback)=>{
    try{
      const parsed=JSON.parse(localStorage.getItem(key));
      return parsed??fallback;
    }catch(e){return fallback}
  };
  const writeJSON=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const unique=(arr)=>[...new Set(arr.filter(Boolean))];
  const html=(v)=>String(v??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  const shell=$('.chat-shell');
  if(!shell)return;

  const archiveButton=$('[data-archive-conversation]');
  const archiveBanner=$('[data-archived-chat-banner]');
  const blockBanner=$('[data-chat-blocked-banner]');
  const chatForm=$('[data-chat-form]');
  const chatInput=$('[data-chat-input]');
  const sendButton=chatForm?.querySelector('button[type="submit"]');
  const imageInput=$('[data-chat-image-input]');
  const imagePicker=$('[data-chat-image-picker]');

  const selectedConversation=()=>$('.conversation.active',shell);

  const setSelected=(row)=>{
    if(!row)return;
    $$('.conversation',shell).forEach(x=>x.classList.remove('active'));
    row.classList.add('active');
    const id=row.dataset.conversationId||'';
    if(id)sessionStorage.setItem('marketActiveConversationV218',id);
  };

  const archivedIds=()=>{
    const value=readJSON(ARCHIVE_KEY,[]);
    return Array.isArray(value)?value:[];
  };
  const saveArchived=(ids)=>writeJSON(ARCHIVE_KEY,unique(ids));

  function showView(view){
    const safe=view==='archived'?'archived':'active';
    localStorage.setItem(VIEW_KEY,safe);
    $$('[data-conversation-view]').forEach(btn=>{
      const on=btn.dataset.conversationView===safe;
      btn.classList.toggle('active',on);
      btn.setAttribute('aria-selected',on?'true':'false');
      btn.tabIndex=on?0:-1;
    });
    const rows=$$('.conversation[data-conversation-state]',shell);
    rows.forEach(row=>{
      const visible=row.dataset.conversationState===safe;
      row.hidden=!visible;
      row.style.display=visible?'flex':'none';
      row.setAttribute('aria-hidden',visible?'false':'true');
    });
    const count=rows.filter(row=>row.dataset.conversationState===safe).length;
    $$('[data-conversation-empty]').forEach(empty=>{
      empty.hidden=empty.dataset.conversationEmpty!==safe||count>0;
    });
  }

  function syncArchiveUI(){
    const row=selectedConversation();
    const isArchived=row?.dataset.conversationState==='archived';
    if(archiveButton){
      archiveButton.textContent=isArchived?'Върни в активни':'Архивирай разговора';
      archiveButton.dataset.archiveMode=isArchived?'restore':'archive';
      archiveButton.disabled=!row;
    }
    if(archiveBanner)archiveBanner.hidden=!isArchived;
  }

  function toggleArchiveSelected(){
    const row=selectedConversation();
    if(!row){toast('Първо избери разговор.');return;}
    const id=row.dataset.conversationId||'';
    const isArchived=row.dataset.conversationState==='archived';
    if(isArchived){
      row.dataset.conversationState='active';
      if(id)saveArchived(archivedIds().filter(x=>x!==id));
      showView('active');
      setSelected(row);
      syncArchiveUI();
      syncBlockUI();
      toast('Разговорът е върнат в „Активни“.');
    }else{
      row.dataset.conversationState='archived';
      if(id)saveArchived([...archivedIds(),id]);
      showView('archived');
      setSelected(row);
      syncArchiveUI();
      syncBlockUI();
      toast('Разговорът е архивиран.');
    }
    const menu=$('[data-chat-menu]');
    const trigger=$('[data-chat-menu-trigger]');
    if(menu)menu.hidden=true;
    trigger?.setAttribute('aria-expanded','false');
  }

  // Determine the actual other participant of the currently selected chat.
  // In seller view each conversation row stores the buyer. In buyer view the
  // listing owner is the counterparty.
  function currentCounterpartyId(){
    const row=selectedConversation();
    const role=document.body.dataset.chatRole||'';
    if(role==='seller')return row?.dataset.buyerId||document.body.dataset.counterpartyId||'';
    return document.body.dataset.listingOwnerId||document.body.dataset.counterpartyId||$('[data-block-seller]')?.dataset.blockSeller||'';
  }

  const blockedIds=()=>{
    const value=readJSON(BLOCK_KEY,[]);
    return Array.isArray(value)?value:[];
  };
  const isBlocked=(id)=>!!id&&blockedIds().includes(id);
  const saveBlocked=(ids)=>writeJSON(BLOCK_KEY,unique(ids));

  function syncBlockUI(){
    const id=currentCounterpartyId();
    const blocked=isBlocked(id);
    $$('[data-block-seller]').forEach(btn=>{
      btn.textContent=blocked?'Разблокирай':'Блокирай';
      btn.dataset.chat269Counterparty=id||'';
      btn.setAttribute('aria-pressed',blocked?'true':'false');
    });
    $$('[data-unblock-seller]').forEach(btn=>btn.dataset.chat269Counterparty=id||'');
    if(blockBanner)blockBanner.style.display=blocked?'block':'none';

    if(chatInput){
      chatInput.disabled=blocked;
      chatInput.setAttribute('aria-disabled',blocked?'true':'false');
      chatInput.placeholder=blocked?'Потребителят е блокиран':'Напиши съобщение…';
    }
    if(sendButton){
      sendButton.disabled=blocked;
      sendButton.setAttribute('aria-disabled',blocked?'true':'false');
    }
    if(imageInput)imageInput.disabled=blocked;
    if(imagePicker){
      imagePicker.classList.toggle('is-chat-disabled',blocked);
      imagePicker.setAttribute('aria-disabled',blocked?'true':'false');
      imagePicker.tabIndex=blocked?-1:0;
    }
    chatForm?.classList.toggle('is-chat-blocked',blocked);
  }

  function toggleBlocked(){
    const id=currentCounterpartyId();
    if(!id){toast('Не успяхме да определим потребителя в този разговор.');return;}
    let ids=blockedIds();
    if(ids.includes(id)){
      ids=ids.filter(x=>x!==id);
      saveBlocked(ids);
      toast('Потребителят е разблокиран.');
    }else{
      saveBlocked([...ids,id]);
      toast('Потребителят е блокиран. Нови съобщения не могат да се изпращат.');
    }
    syncBlockUI();
    const menu=$('[data-chat-menu]');
    const trigger=$('[data-chat-menu-trigger]');
    if(menu)menu.hidden=true;
    trigger?.setAttribute('aria-expanded','false');
  }

  function blockSendIfNeeded(event){
    const id=currentCounterpartyId();
    if(!isBlocked(id))return false;
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    syncBlockUI();
    toast('Потребителят е блокиран. Разблокирай го, за да изпратиш съобщение.');
    return true;
  }

  // ----- Deal completion: explicit buyer selection, independent of the older
  // prototype handler so the action always opens and does something.
  const completedDeals=()=>{
    const value=readJSON(DEALS_KEY,[]);
    return Array.isArray(value)?value:[];
  };
  const dealFor=(sellerId,listingId)=>completedDeals().find(x=>x.sellerId===sellerId&&x.listingId===listingId&&x.buyerId);

  function ensureDealModal(){
    let modal=$('[data-chat269-deal-modal]');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.className='deal-modal';
    modal.dataset.chat269DealModal='';
    modal.hidden=true;
    modal.innerHTML=`<div class="deal-modal-card" role="dialog" aria-modal="true" aria-labelledby="chat269-deal-title">
      <div class="deal-modal-head">
        <div><h2 id="chat269-deal-title">Приключване на сделка</h2><p class="muted small" data-chat269-deal-product></p></div>
        <button class="deal-modal-close" type="button" data-chat269-deal-close aria-label="Затвори">×</button>
      </div>
      <div class="deal-modal-note">Избери кой купувач реално е купил уреда. Само избраният купувач ще може да остави оценка за тази сделка.</div>
      <fieldset class="deal-buyer-list" data-chat269-deal-buyers><legend>Купувач</legend></fieldset>
      <label class="deal-confirm-check"><input type="checkbox" data-chat269-deal-confirm> <span>Потвърждавам, че сделката с избрания купувач е приключена.</span></label>
      <div class="deal-modal-actions"><button class="ghost-btn" type="button" data-chat269-deal-cancel>Отказ</button><button class="primary-btn" type="button" data-chat269-deal-submit disabled>Потвърди сделката</button></div>
    </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function syncDealButton(){
    const btn=$('[data-open-complete-deal]');
    if(!btn)return;
    const sellerId=btn.dataset.sellerId||document.body.dataset.listingOwnerId||'seller-1';
    const listingId=btn.dataset.listingId||selectedConversation()?.dataset.listingId||'';
    const deal=dealFor(sellerId,listingId);
    if(deal){
      btn.textContent=`Сделката е приключена с ${deal.buyerName||'избран купувач'}`;
      btn.disabled=true;
      btn.setAttribute('aria-disabled','true');
    }else{
      btn.textContent='Отбележи сделката като приключена';
      btn.disabled=false;
      btn.removeAttribute('aria-disabled');
    }
  }

  function openDealModal(trigger){
    const sellerId=trigger.dataset.sellerId||document.body.dataset.listingOwnerId||'seller-1';
    const listingId=trigger.dataset.listingId||selectedConversation()?.dataset.listingId||'';
    const existing=dealFor(sellerId,listingId);
    if(existing){syncDealButton();toast(`Сделката вече е приключена с ${existing.buyerName||'избран купувач'}.`);return;}

    const rows=$$(`.conversation[data-listing-id="${CSS.escape(listingId)}"][data-buyer-id]`,shell);
    if(!rows.length){toast('Няма разговори с купувачи за тази обява.');return;}

    const modal=ensureDealModal();
    modal.dataset.sellerId=sellerId;
    modal.dataset.listingId=listingId;
    modal.querySelector('[data-chat269-deal-product]').textContent=$('.chat-product strong')?.textContent?.trim()||'Тази обява';
    const list=modal.querySelector('[data-chat269-deal-buyers]');
    const selected=selectedConversation();
    const selectedBuyer=selected?.dataset.buyerId||rows[0].dataset.buyerId;
    list.innerHTML=rows.map(row=>{
      const buyerId=row.dataset.buyerId||'';
      const buyerName=row.dataset.buyerName||row.querySelector('.conversation-name')?.textContent?.trim()||'Купувач';
      const initials=buyerName.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
      const archived=row.dataset.conversationState==='archived';
      return `<label class="deal-buyer-option">
        <input type="radio" name="chat269DealBuyer" value="${html(buyerId)}" data-buyer-name="${html(buyerName)}" data-conversation-id="${html(row.dataset.conversationId||'')}" ${buyerId===selectedBuyer?'checked':''}>
        <span class="deal-buyer-avatar">${html(initials)}</span>
        <span class="deal-buyer-copy"><strong>${html(buyerName)}</strong><small>${archived?'Архивиран разговор':'Активен разговор'}</small></span>
        <span class="deal-buyer-radio"></span>
      </label>`;
    }).join('');
    const confirm=modal.querySelector('[data-chat269-deal-confirm]');
    if(confirm)confirm.checked=false;
    const submit=modal.querySelector('[data-chat269-deal-submit]');
    if(submit)submit.disabled=true;
    modal.hidden=false;
    document.documentElement.classList.add('chat-modal-open');
    setTimeout(()=>list.querySelector('input:checked')?.focus(),0);
  }

  function closeDealModal(){
    const modal=$('[data-chat269-deal-modal]');
    if(modal)modal.hidden=true;
    document.documentElement.classList.remove('chat-modal-open');
  }

  function updateDealSubmit(){
    const modal=$('[data-chat269-deal-modal]:not([hidden])');
    if(!modal)return;
    const picked=modal.querySelector('input[name="chat269DealBuyer"]:checked');
    const confirmed=modal.querySelector('[data-chat269-deal-confirm]')?.checked;
    const submit=modal.querySelector('[data-chat269-deal-submit]');
    if(submit)submit.disabled=!(picked&&confirmed);
  }

  function completeDeal(){
    const modal=$('[data-chat269-deal-modal]:not([hidden])');
    if(!modal)return;
    const radio=modal.querySelector('input[name="chat269DealBuyer"]:checked');
    const confirmed=modal.querySelector('[data-chat269-deal-confirm]')?.checked;
    if(!radio||!confirmed){updateDealSubmit();return;}
    const sellerId=modal.dataset.sellerId||'seller-1';
    const listingId=modal.dataset.listingId||'';
    let deals=completedDeals();
    if(deals.some(x=>x.sellerId===sellerId&&x.listingId===listingId&&x.buyerId)){
      closeDealModal();
      syncDealButton();
      toast('За тази обява вече има потвърдена продажба.');
      return;
    }
    deals=deals.filter(x=>!(x.sellerId===sellerId&&x.listingId===listingId&&!x.buyerId));
    const deal={
      id:'deal-'+Date.now(),
      sellerId,
      listingId,
      buyerId:radio.value,
      buyerName:radio.dataset.buyerName||'Купувач',
      conversationId:radio.dataset.conversationId||'',
      completedAt:Date.now()
    };
    deals.push(deal);
    writeJSON(DEALS_KEY,deals);
    closeDealModal();
    syncDealButton();
    toast(`Сделката е приключена с ${deal.buyerName}.`);
  }

  // Capture the three problematic chat actions before the old prototype
  // handlers, so one click can never mutate a different conversation.
  document.addEventListener('click',event=>{
    const archive=event.target.closest('[data-archive-conversation]');
    if(archive){
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleArchiveSelected();
      return;
    }

    const block=event.target.closest('[data-block-seller],[data-unblock-seller]');
    if(block){
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleBlocked();
      return;
    }

    const deal=event.target.closest('[data-open-complete-deal]');
    if(deal){
      event.preventDefault();
      event.stopImmediatePropagation();
      openDealModal(deal);
      const menu=$('[data-chat-menu]');
      if(menu)menu.hidden=true;
      $('[data-chat-menu-trigger]')?.setAttribute('aria-expanded','false');
      return;
    }

    const cancel=event.target.closest('[data-chat269-deal-cancel],[data-chat269-deal-close]');
    if(cancel){event.preventDefault();closeDealModal();return;}
    const modal=event.target.closest('[data-chat269-deal-modal]');
    if(modal&&event.target===modal){closeDealModal();return;}
    const submit=event.target.closest('[data-chat269-deal-submit]');
    if(submit){event.preventDefault();completeDeal();return;}
  },true);

  document.addEventListener('change',event=>{
    if(event.target.closest('[data-chat269-deal-modal]'))updateDealSubmit();
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&$('[data-chat269-deal-modal]:not([hidden])')){
      event.preventDefault();
      closeDealModal();
    }
  });

  // Hard enforcement: a blocked participant cannot receive new messages from
  // this browser even if an older click/Enter handler tries to submit.
  chatForm?.addEventListener('submit',event=>{
    blockSendIfNeeded(event);
  },true);
  sendButton?.addEventListener('click',event=>{
    blockSendIfNeeded(event);
  },true);
  imagePicker?.addEventListener('click',event=>{
    if(blockSendIfNeeded(event))event.preventDefault();
  },true);
  imageInput?.addEventListener('change',event=>{
    if(isBlocked(currentCounterpartyId())){
      event.preventDefault();
      imageInput.value='';
      toast('Потребителят е блокиран.');
    }
  },true);

  // After selecting a different conversation, all controls must reflect that
  // exact conversation, not the first active row in the list.
  $$('.conversation',shell).forEach(row=>{
    row.addEventListener('click',()=>{
      setTimeout(()=>{
        setSelected(row);
        syncArchiveUI();
        syncBlockUI();
      },0);
    });
  });

  $$('[data-conversation-view]').forEach(btn=>{
    btn.addEventListener('click',()=>setTimeout(()=>{
      syncArchiveUI();
      syncBlockUI();
    },0));
  });

  // Restore persisted archive state and initialize the exact selected chat.
  const storedArchived=new Set(archivedIds());
  $$('.conversation[data-conversation-id]',shell).forEach(row=>{
    if(storedArchived.has(row.dataset.conversationId))row.dataset.conversationState='archived';
  });
  const currentView=localStorage.getItem(VIEW_KEY)||'active';
  showView(currentView);
  let selected=selectedConversation();
  if(!selected||selected.dataset.conversationState!==currentView){
    selected=$(`.conversation[data-conversation-state="${currentView}"]`,shell)||selected;
    if(selected)setSelected(selected);
  }
  syncArchiveUI();
  syncBlockUI();
  syncDealButton();
})();
