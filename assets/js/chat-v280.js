(()=>{
  'use strict';
  if(!document.body.classList.contains('messages-page'))return;
  document.body.dataset.realChat='1';

  const client=window.UrediSupabase;
  if(!client)return;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast=m=>window.marketToast?window.marketToast(m):alert(m);
  const money=v=>{const n=Number(v);return Number.isFinite(n)?`${new Intl.NumberFormat('bg-BG',{maximumFractionDigits:2}).format(n)} €`:''};
  const initials=name=>String(name||'П').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'П';
  const uuid=()=>crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const safeName=name=>String(name||'file').replace(/[^\p{L}\p{N}._-]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,90)||'file';
  const isImage=a=>String(a?.mime_type||'').startsWith('image/')||/\.(jpe?g|png|webp|heic|heif)$/i.test(String(a?.file_name||''));
  const humanError=err=>{
    const m=String(err?.message||err||'');
    if(/CANNOT_MESSAGE_YOURSELF/i.test(m))return 'Това е твоята обява.';
    if(/LISTING_NOT_AVAILABLE/i.test(m))return 'Обявата вече не е налична за нов разговор.';
    if(/LISTING_NOT_FOUND/i.test(m))return 'Обявата не е намерена.';
    if(/CHAT_BLOCKED/i.test(m))return 'Разговорът е блокиран и не могат да се изпращат нови съобщения.';
    if(/MESSAGE_TOO_LONG/i.test(m))return 'Съобщението е максимум 2000 символа.';
    if(/EMPTY_MESSAGE/i.test(m))return 'Напиши съобщение или добави файл.';
    if(/DEAL_ALREADY_COMPLETED/i.test(m))return 'За тази обява вече има потвърдена сделка.';
    if(/BUYER_HAS_NO_CONVERSATION/i.test(m))return 'Избраният купувач няма разговор за тази обява.';
    if(/ONLY_SELLER_CAN_COMPLETE/i.test(m))return 'Само продавачът може да приключи сделката.';
    if(/ONLY_BUYER_CAN_REVIEW/i.test(m))return 'Само избраният купувач може да остави оценка.';
    if(/market_|schema cache|could not find the function/i.test(m))return 'Чатът още не е активиран в Supabase. Пусни SQL блока за v2.80.';
    return m||'Възникна грешка. Опитай отново.';
  };

  const shell=$('.chat-shell');
  if(!shell)return;

  const state={
    user:null,
    conversations:[],
    profiles:new Map(),
    selectedId:null,
    selected:null,
    flags:null,
    view:'active',
    channel:null,
    file:null,
    signedUrls:new Map(),
    loadingConversation:false,
    syncTimer:null,
    syncBusy:false
  };

  shell.innerHTML=`
    <aside class="conversation-list" data-real-conversation-list>
      <div class="chat-title-row"><div class="chat-title">Съобщения</div><button class="real-chat-refresh" type="button" data-real-chat-refresh aria-label="Обнови разговорите">↻</button></div>
      <div class="conversation-tabs" role="tablist" aria-label="Разговори">
        <button class="conversation-tab active" type="button" data-real-chat-view="active" role="tab" aria-selected="true">Активни</button>
        <button class="conversation-tab" type="button" data-real-chat-view="archived" role="tab" aria-selected="false">Архивирани</button>
      </div>
      <div data-real-conversation-rows></div>
    </aside>
    <section class="chat-pane" data-real-chat-pane>
      <div class="real-chat-welcome">
        <div class="real-chat-welcome-icon">💬</div>
        <h2>Твоите разговори</h2>
        <p>Избери разговор от списъка или отвори обява и натисни „Съобщение“.</p>
      </div>
    </section>`;

  const listHost=$('[data-real-conversation-rows]',shell);
  const pane=$('[data-real-chat-pane]',shell);

  function relativeTime(value){
    if(!value)return '';
    const d=new Date(value), now=new Date();
    if(Number.isNaN(d.getTime()))return '';
    const same=d.toDateString()===now.toDateString();
    if(same)return d.toLocaleTimeString('bg-BG',{hour:'2-digit',minute:'2-digit'});
    const y=new Date(now);y.setDate(now.getDate()-1);
    if(d.toDateString()===y.toDateString())return 'вчера';
    return d.toLocaleDateString('bg-BG',{day:'2-digit',month:'short'});
  }

  function otherId(c){return c.seller_id===state.user.id?c.buyer_id:c.seller_id}
  function role(c){return c.seller_id===state.user.id?'seller':'buyer'}
  function unread(c){return role(c)==='seller'?Number(c.seller_unread||0):Number(c.buyer_unread||0)}
  function archived(c){return role(c)==='seller'?!!c.seller_archived:!!c.buyer_archived}
  function profileName(id){return state.profiles.get(id)?.display_name||'Потребител'}
  function imageUrl(path){
    if(!path)return '';
    return client.storage.from('listing-images').getPublicUrl(path).data?.publicUrl||'';
  }

  async function ensureProfiles(ids){
    const missing=[...new Set(ids.filter(Boolean))].filter(id=>!state.profiles.has(id));
    if(!missing.length)return;
    const {data,error}=await client.from('profiles').select('id,display_name,profile_type,city').in('id',missing);
    if(error){console.warn(error);return}
    (data||[]).forEach(p=>state.profiles.set(p.id,p));
  }

  function renderConversationRows(){
    const rows=state.conversations.filter(c=>archived(c)===(state.view==='archived'));
    if(!rows.length){
      listHost.innerHTML=`<div class="conversation-empty real-conversation-empty"><strong>${state.view==='archived'?'Няма архивирани разговори':'Няма активни разговори'}</strong><span>${state.view==='archived'?'Архивираните чатове ще се показват тук.':'Когато започнеш разговор за обява, той ще се появи тук.'}</span></div>`;
      return;
    }
    listHost.innerHTML=rows.map(c=>{
      const oid=otherId(c), name=profileName(oid), count=unread(c), selected=c.id===state.selectedId;
      const preview=c.last_message_preview||'Нов разговор';
      return `<button class="conversation real-conversation${selected?' active':''}" type="button" data-real-conversation="${esc(c.id)}" aria-current="${selected?'true':'false'}">
        <span class="avatar real-conversation-avatar">${esc(initials(name))}</span>
        <span class="conversation-main"><span class="conversation-name">${esc(name)}</span><span class="conversation-preview">${esc(preview)}</span></span>
        <span class="real-conversation-side"><span class="conversation-time">${esc(relativeTime(c.last_message_at))}</span>${count?`<span class="real-chat-unread">${count>99?'99+':count}</span>`:''}</span>
      </button>`;
    }).join('');
  }

  async function loadConversations({keepSelection=true}={}){
    const old=keepSelection?state.selectedId:null;
    const {data,error}=await client.from('market_conversations').select('*').order('last_message_at',{ascending:false});
    if(error)throw error;
    state.conversations=data||[];
    await ensureProfiles(state.conversations.map(otherId));
    if(old&&!state.conversations.some(c=>c.id===old))state.selectedId=null;
    renderConversationRows();
  }

  async function flagsFor(id){
    const {data,error}=await client.rpc('market_conversation_flags',{p_conversation_id:id});
    if(error)throw error;
    return Array.isArray(data)?data[0]||null:data||null;
  }

  async function signedAttachmentUrl(att){
    if(!att?.storage_path)return '';
    const key=att.storage_path;
    const cached=state.signedUrls.get(key);
    if(cached&&cached.expires>Date.now()+30000)return cached.url;
    const {data,error}=await client.storage.from(att.storage_bucket||'chat-attachments').createSignedUrl(key,3600);
    if(error){console.warn(error);return ''}
    const url=data?.signedUrl||'';
    if(url)state.signedUrls.set(key,{url,expires:Date.now()+3500000});
    return url;
  }

  async function loadMessages(id){
    const [{data:msgs,error:mErr},{data:atts,error:aErr}]=await Promise.all([
      client.from('market_messages').select('id,conversation_id,sender_id,body,has_attachment,created_at,seen_at').eq('conversation_id',id).order('created_at',{ascending:true}),
      client.from('market_message_attachments').select('*').eq('conversation_id',id).order('created_at',{ascending:true})
    ]);
    if(mErr)throw mErr;if(aErr)throw aErr;
    const byMessage=new Map();
    for(const a of atts||[]){
      a.signed_url=await signedAttachmentUrl(a);
      const arr=byMessage.get(a.message_id)||[];arr.push(a);byMessage.set(a.message_id,arr);
    }
    return (msgs||[]).map(m=>({...m,attachments:byMessage.get(m.id)||[]}));
  }

  function attachmentHTML(a){
    const url=a.signed_url||'';
    if(!url)return `<div class="real-chat-file is-unavailable">Прикаченият файл временно не е достъпен.</div>`;
    if(isImage(a))return `<button class="real-chat-image-button" type="button" data-real-chat-image="${esc(url)}" aria-label="Отвори снимката"><img src="${esc(url)}" alt="${esc(a.file_name||'Снимка')}"></button>`;
    return `<a class="real-chat-file" href="${esc(url)}" target="_blank" rel="noopener"><span class="real-chat-file-icon">↧</span><span><strong>${esc(a.file_name||'Файл')}</strong><small>${a.file_size?`${Math.max(1,Math.round(a.file_size/1024))} KB`:''}</small></span></a>`;
  }

  function messageHTML(m){
    const mine=m.sender_id===state.user.id;
    return `<div class="bubble-row${mine?' me':''}" data-real-message-id="${esc(m.id)}" data-message-direction="${mine?'outgoing':'incoming'}">
      <div class="bubble">${m.body?`<div class="real-chat-message-text">${esc(m.body).replace(/\n/g,'<br>')}</div>`:''}${(m.attachments||[]).map(attachmentHTML).join('')}<div class="bubble-time">${esc(new Date(m.created_at).toLocaleTimeString('bg-BG',{hour:'2-digit',minute:'2-digit'}))}</div>${mine&&m.seen_at?`<div class="bubble-seen">Видяно ${esc(new Date(m.seen_at).toLocaleTimeString('bg-BG',{hour:'2-digit',minute:'2-digit'}))}</div>`:''}</div>
    </div>`;
  }

  function currentOtherName(){return state.selected?profileName(otherId(state.selected)):'Потребител'}

  function renderPaneSkeleton(c,flags){
    const oid=otherId(c), name=profileName(oid), img=imageUrl(c.listing_image_path);
    const canDeal=flags?.user_role==='seller'&&!flags?.deal_id;
    const dealDone=!!flags?.deal_id;
    const canReview=flags?.user_role==='buyer'&&dealDone&&!flags?.review_id&&flags?.deal_buyer_id===state.user.id;
    const dealBuyerName=flags?.deal_buyer_id?profileName(flags.deal_buyer_id):'';
    const blocked=!!(flags?.blocked_by_me||flags?.blocked_me);
    const blockedText=flags?.blocked_by_me?'Ти блокира този потребител. Разблокирай го, за да продължиш разговора.':'Другият потребител е блокирал комуникацията. Нови съобщения не могат да се изпращат.';
    pane.innerHTML=`
      <div class="chat-product real-chat-product">
        <button class="mobile-chat-back" type="button" data-real-chat-back aria-label="Към разговорите">‹</button>
        ${img?`<img src="${esc(img)}" alt="">`:`<div class="real-chat-product-placeholder">▣</div>`}
        <div class="real-chat-product-copy"><strong>${esc(c.listing_title||'Обява')}</strong><div class="muted small">${esc(money(c.listing_price))}${c.listing_city?` · ${esc(c.listing_city)}`:''}</div><div class="real-chat-with">Разговор с ${esc(name)}</div></div>
        <a class="ghost-btn" href="listing.html?id=${encodeURIComponent(c.listing_id)}">Виж обявата</a>
        <div class="chat-overflow real-chat-overflow">
          <button class="overflow-trigger chat-overflow-trigger" type="button" data-real-chat-menu-trigger aria-label="Действия за разговора" aria-expanded="false">•••</button>
          <div class="overflow-menu chat-overflow-menu real-chat-menu" data-real-chat-menu hidden role="menu">
            ${canDeal?`<button class="overflow-menu-item" type="button" data-real-complete-deal>Отбележи сделката като приключена</button>`:''}
            ${dealDone&&flags?.user_role==='seller'?`<div class="overflow-menu-note">Сделката е приключена</div>`:''}
            <button class="overflow-menu-item" type="button" data-real-archive>${flags?.my_archived?'Върни в активни':'Архивирай разговора'}</button>
            ${flags?.blocked_me?'':`<button class="overflow-menu-item" type="button" data-real-block>${flags?.blocked_by_me?'Разблокирай':'Блокирай'}</button>`}
            <a class="overflow-menu-item danger" href="report.html?type=chat&conversation=${encodeURIComponent(c.id)}&user=${encodeURIComponent(oid)}">Докладвай</a>
          </div>
        </div>
      </div>
      ${flags?.my_archived?`<div class="archived-chat-banner"><strong>Архивиран разговор</strong><span>При ново съобщение разговорът автоматично се връща в „Активни“.</span></div>`:''}
      ${blocked?`<div class="chat-blocked-banner real-chat-block-banner"><strong>Разговорът е блокиран</strong><span>${esc(blockedText)}</span>${flags?.blocked_by_me?`<button class="secondary-btn compact-action" type="button" data-real-unblock>Разблокирай</button>`:''}</div>`:''}
      ${dealDone?`<div class="real-deal-banner"><strong>${flags?.user_role==='seller'&&dealBuyerName?`Сделката е приключена с ${esc(dealBuyerName)}.`:'Сделката е приключена.'}</strong>${canReview?`<button class="primary-btn compact-action" type="button" data-real-review-open>Оцени продавача</button>`:flags?.review_id?`<span>Оценката е изпратена.</span>`:''}</div>`:''}
      <div class="chat-messages" data-real-message-list aria-label="Съобщения в разговора" tabindex="0"><div class="real-chat-loading">Зареждане…</div></div>
      <div class="chat-composer-wrap real-chat-composer-wrap">
        <div class="chat-image-preview" data-real-file-preview hidden>
          <div class="chat-image-preview-card"><div class="real-chat-preview-icon">📎</div><div class="chat-image-preview-copy"><strong data-real-file-name>Файл</strong><span data-real-file-meta></span></div><button class="chat-image-remove" type="button" data-real-file-remove aria-label="Премахни файла">×</button></div>
        </div>
        <form class="chat-composer real-chat-composer" data-real-chat-form>
          <input class="chat-image-input" data-real-file-input id="realChatFileInput" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,text/plain,.doc,.docx" aria-label="Добави файл">
          <label class="chat-attach-btn" for="realChatFileInput" role="button" tabindex="0" title="Добави снимка или файл" aria-label="Добави снимка или файл"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 12.5 13.5 7a3 3 0 1 1 4.2 4.2l-7.4 7.4a4.5 4.5 0 0 1-6.4-6.4l7.2-7.2"></path></svg></label>
          <div class="real-chat-input-wrap"><textarea class="chat-composer-input" data-real-chat-input maxlength="2000" placeholder="Напиши съобщение…" rows="1" ${blocked?'disabled':''}></textarea><span class="real-chat-counter" data-real-chat-counter>0/2000</span></div>
          <button class="chat-send-btn" type="submit" aria-label="Изпрати съобщението" ${blocked?'disabled':''}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 11 18-8-7 18-2.5-7.5L3 11Z"></path><path d="m11.5 13.5 4-4"></path></svg></button>
        </form>
      </div>`;
  }

  async function renderMessages(id,{scroll=true}={}){
    const host=$('[data-real-message-list]',pane);if(!host)return;
    const previousTop=host.scrollTop;
    const wasNearBottom=(host.scrollHeight-host.scrollTop-host.clientHeight)<=90;
    const messages=await loadMessages(id);
    if(state.selectedId!==id)return;
    host.innerHTML=messages.length?messages.map(messageHTML).join(''):`<div class="real-chat-empty-thread"><strong>Нов разговор</strong><span>Напиши първото съобщение за тази обява.</span></div>`;
    requestAnimationFrame(()=>{
      if(scroll===true||(scroll==='auto'&&wasNearBottom))host.scrollTop=host.scrollHeight;
      else if(scroll===false)host.scrollTop=Math.min(previousTop,Math.max(0,host.scrollHeight-host.clientHeight));
    });
  }

  async function markRead(id){
    try{
      const {error}=await client.rpc('market_mark_conversation_read',{p_conversation_id:id});
      if(error)throw error;
      const c=state.conversations.find(x=>x.id===id);
      if(c){if(role(c)==='seller')c.seller_unread=0;else c.buyer_unread=0}
      renderConversationRows();
      window.UrediChatBadgeRefresh?.();
    }catch(err){console.warn(err)}
  }

  function syncComposer(){
    const input=$('[data-real-chat-input]',pane), counter=$('[data-real-chat-counter]',pane);
    if(!input||!counter)return;
    const n=Array.from(input.value||'').length;
    counter.textContent=`${n}/2000`;
    counter.classList.toggle('is-near-limit',n>=1800);
    input.style.height='auto';input.style.height=Math.min(input.scrollHeight,120)+'px';
  }

  async function selectConversation(id,{push=true}={}){
    if(state.loadingConversation&&state.selectedId===id)return;
    const c=state.conversations.find(x=>x.id===id);if(!c)return;
    state.loadingConversation=true;state.selectedId=id;state.selected=c;
    renderConversationRows();
    shell.classList.add('chat-open');
    try{
      state.flags=await flagsFor(id);
      if(state.flags?.deal_buyer_id)await ensureProfiles([state.flags.deal_buyer_id]);
      renderPaneSkeleton(c,state.flags);
      bindPaneEvents();
      await renderMessages(id);
      await markRead(id);
      if(push){const u=new URL(location.href);u.searchParams.set('conversation',id);u.searchParams.delete('listing');u.searchParams.delete('seller');history.replaceState({},'',u)}
    }catch(err){toast(humanError(err));console.error(err)}
    state.loadingConversation=false;
  }

  async function refreshSelected({messages=true}={}){
    if(!state.selectedId)return;
    const id=state.selectedId;
    const c=state.conversations.find(x=>x.id===id);if(!c)return;
    state.selected=c;
    state.flags=await flagsFor(id);
    if(state.flags?.deal_buyer_id)await ensureProfiles([state.flags.deal_buyer_id]);
    renderPaneSkeleton(c,state.flags);bindPaneEvents();
    if(messages)await renderMessages(id);
  }

  function closeChatOnMobile(){
    shell.classList.remove('chat-open');
    state.selectedId=null;state.selected=null;state.flags=null;
    renderConversationRows();
    const u=new URL(location.href);u.searchParams.delete('conversation');history.replaceState({},'',u);
  }

  async function archiveCurrent(){
    if(!state.selectedId)return;
    const next=!state.flags?.my_archived;
    const {error}=await client.rpc('market_set_conversation_archived',{p_conversation_id:state.selectedId,p_archived:next});
    if(error)throw error;
    const c=state.conversations.find(x=>x.id===state.selectedId);
    if(c){if(role(c)==='seller')c.seller_archived=next;else c.buyer_archived=next}
    state.flags.my_archived=next;
    toast(next?'Разговорът е архивиран.':'Разговорът е върнат в активни.');
    await refreshSelected({messages:true});renderConversationRows();
  }

  async function blockCurrent(blocked){
    if(!state.flags?.other_user_id)return;
    const {error}=await client.rpc('market_set_user_block',{p_user_id:state.flags.other_user_id,p_blocked:blocked});
    if(error)throw error;
    toast(blocked?'Потребителят е блокиран.':'Потребителят е разблокиран.');
    await refreshSelected({messages:true});
  }

  function openDealModal(){
    if(!state.selected||state.flags?.user_role!=='seller')return;
    const listingId=state.selected.listing_id;
    const candidates=state.conversations.filter(c=>c.listing_id===listingId&&c.seller_id===state.user.id);
    if(!candidates.length){toast('Няма разговори с купувачи за тази обява.');return}
    const old=$('[data-real-deal-modal]');if(old)old.remove();
    const modal=document.createElement('div');modal.className='deal-modal';modal.dataset.realDealModal='';
    modal.innerHTML=`<div class="deal-modal-card" role="dialog" aria-modal="true" aria-labelledby="real-deal-title"><div class="deal-modal-head"><div><h2 id="real-deal-title">Приключване на сделка</h2><p class="muted small">${esc(state.selected.listing_title||'Обява')}</p></div><button class="deal-modal-close" type="button" data-real-deal-close aria-label="Затвори">×</button></div><div class="deal-modal-note">Избери кой купувач реално е купил уреда. Само избраният купувач ще може да оцени продавача за тази сделка.</div><fieldset class="deal-buyer-list"><legend>Купувач</legend>${candidates.map((c,i)=>{const name=profileName(c.buyer_id);return `<label class="deal-buyer-option"><input type="radio" name="realDealBuyer" value="${esc(c.buyer_id)}" ${c.id===state.selectedId||(!state.selectedId&&i===0)?'checked':''}><span class="deal-buyer-avatar">${esc(initials(name))}</span><span class="deal-buyer-copy"><strong>${esc(name)}</strong><small>${archived(c)?'Архивиран разговор':'Активен разговор'}</small></span><span class="deal-buyer-radio"></span></label>`}).join('')}</fieldset><label class="deal-confirm-check"><input type="checkbox" data-real-deal-confirm> <span>Потвърждавам, че сделката с избрания купувач е приключена.</span></label><div class="deal-modal-actions"><button class="ghost-btn" type="button" data-real-deal-close>Отказ</button><button class="primary-btn" type="button" data-real-deal-submit disabled>Потвърди сделката</button></div></div>`;
    document.body.appendChild(modal);
    const sync=()=>{const submit=$('[data-real-deal-submit]',modal);if(submit)submit.disabled=!($('input[name="realDealBuyer"]:checked',modal)&&$('[data-real-deal-confirm]',modal)?.checked)};
    modal.addEventListener('change',sync);
    modal.addEventListener('click',async e=>{
      if(e.target===modal||e.target.closest('[data-real-deal-close]')){modal.remove();return}
      const submit=e.target.closest('[data-real-deal-submit]');if(!submit)return;
      sync();if(submit.disabled)return;
      const buyer=$('input[name="realDealBuyer"]:checked',modal)?.value;if(!buyer)return;
      submit.disabled=true;submit.textContent='Потвърждаване…';
      const {error}=await client.rpc('market_complete_deal',{p_listing_id:listingId,p_buyer_id:buyer});
      if(error){submit.disabled=false;submit.textContent='Потвърди сделката';toast(humanError(error));return}
      modal.remove();toast('Сделката е приключена и обявата е маркирана като продадена.');
      await loadConversations();await selectConversation(state.selectedId,{push:false});
    });
  }

  function openReviewModal(){
    const dealId=state.flags?.deal_id;if(!dealId)return;
    const old=$('[data-real-review-modal]');if(old)old.remove();
    const modal=document.createElement('div');modal.className='deal-modal';modal.dataset.realReviewModal='';
    modal.innerHTML=`<div class="deal-modal-card real-review-card" role="dialog" aria-modal="true" aria-labelledby="real-review-title"><div class="deal-modal-head"><div><h2 id="real-review-title">Оцени продавача</h2><p class="muted small">Оценката е свързана с потвърдената сделка.</p></div><button class="deal-modal-close" type="button" data-real-review-close aria-label="Затвори">×</button></div><div class="real-rating" role="radiogroup" aria-label="Оценка">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="realRating" value="${n}"><span aria-hidden="true">★</span><span class="sr-only">${n}</span></label>`).join('')}</div><label class="field"><span>Коментар <span class="muted">(по желание)</span></span><textarea data-real-review-comment maxlength="1000" rows="5" placeholder="Кратък коментар за сделката"></textarea><small class="real-review-counter" data-real-review-counter>0/1000</small></label><div class="deal-modal-actions"><button class="ghost-btn" type="button" data-real-review-close>Отказ</button><button class="primary-btn" type="button" data-real-review-submit disabled>Изпрати оценката</button></div></div>`;
    document.body.appendChild(modal);
    const sync=()=>{const submit=$('[data-real-review-submit]',modal);if(submit)submit.disabled=!$('input[name="realRating"]:checked',modal);const ta=$('[data-real-review-comment]',modal),counter=$('[data-real-review-counter]',modal);if(ta&&counter)counter.textContent=`${Array.from(ta.value||'').length}/1000`};
    modal.addEventListener('input',sync);modal.addEventListener('change',sync);
    modal.addEventListener('click',async e=>{
      if(e.target===modal||e.target.closest('[data-real-review-close]')){modal.remove();return}
      const submit=e.target.closest('[data-real-review-submit]');if(!submit)return;
      const rating=Number($('input[name="realRating"]:checked',modal)?.value||0);if(!rating)return;
      submit.disabled=true;submit.textContent='Изпращане…';
      const comment=$('[data-real-review-comment]',modal)?.value||'';
      const {error}=await client.rpc('market_submit_review',{p_deal_id:dealId,p_rating:rating,p_comment:comment});
      if(error){submit.disabled=false;submit.textContent='Изпрати оценката';toast(humanError(error));return}
      modal.remove();toast('Оценката е изпратена.');await refreshSelected({messages:true});
    });
  }

  function openImageModal(url){
    let modal=$('[data-real-chat-image-modal]');if(modal)modal.remove();
    modal=document.createElement('div');modal.className='real-chat-image-modal';modal.dataset.realChatImageModal='';
    modal.innerHTML=`<button type="button" data-real-chat-image-close aria-label="Затвори">×</button><img src="${esc(url)}" alt="Снимка от разговора">`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-real-chat-image-close]'))modal.remove()});
  }

  function setFile(file){
    state.file=file||null;
    const box=$('[data-real-file-preview]',pane),name=$('[data-real-file-name]',pane),meta=$('[data-real-file-meta]',pane);
    if(!box)return;
    if(!state.file){box.hidden=true;return}
    box.hidden=false;if(name)name.textContent=state.file.name||'Файл';if(meta)meta.textContent=`${Math.max(1,Math.round(state.file.size/1024))} KB`;
  }

  async function sendCurrent(){
    if(!state.selectedId||!state.selected)return;
    if(state.flags?.blocked_by_me||state.flags?.blocked_me){toast('Разговорът е блокиран.');return}
    const input=$('[data-real-chat-input]',pane),send=$('.chat-send-btn',pane);
    const body=String(input?.value||'');const file=state.file;
    if(!body.trim()&&!file)return;
    if(Array.from(body).length>2000){toast('Съобщението е максимум 2000 символа.');return}
    if(file&&file.size>15728640){toast('Файлът може да е максимум 15 MB.');return}
    let uploadedPath='';
    try{
      if(send)send.disabled=true;
      if(file){
        const ext=(file.name?.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8)||'bin';
        uploadedPath=`${state.selectedId}/${state.user.id}/${uuid()}-${safeName(file.name||`file.${ext}`)}`;
        const up=await client.storage.from('chat-attachments').upload(uploadedPath,file,{upsert:false,cacheControl:'3600',contentType:file.type||undefined});
        if(up.error)throw up.error;
      }
      const sent=await client.rpc('market_send_message',{p_conversation_id:state.selectedId,p_body:body.trim()||null,p_has_attachment:!!file});
      if(sent.error)throw sent.error;
      const messageId=sent.data;
      if(file){
        const meta=await client.rpc('market_add_message_attachment',{p_message_id:messageId,p_storage_path:uploadedPath,p_file_name:file.name||'Файл',p_mime_type:file.type||null,p_file_size:file.size||0});
        if(meta.error)throw meta.error;
      }
      if(input){input.value='';syncComposer()}
      setFile(null);
      await loadConversations();
      await refreshSelected({messages:true});
      window.UrediChatBadgeRefresh?.();
    }catch(err){
      if(uploadedPath){try{await client.storage.from('chat-attachments').remove([uploadedPath])}catch{}}
      toast(humanError(err));console.error(err);
    }finally{if(send&&!state.flags?.blocked_by_me&&!state.flags?.blocked_me)send.disabled=false}
  }

  function bindPaneEvents(){
    $('[data-real-chat-back]',pane)?.addEventListener('click',closeChatOnMobile);
    const trigger=$('[data-real-chat-menu-trigger]',pane),menu=$('[data-real-chat-menu]',pane);
    trigger?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const open=menu?.hidden;if(menu)menu.hidden=!open;trigger.setAttribute('aria-expanded',open?'true':'false')});
    $('[data-real-archive]',pane)?.addEventListener('click',async()=>{try{await archiveCurrent()}catch(err){toast(humanError(err))}});
    $('[data-real-block]',pane)?.addEventListener('click',async()=>{try{await blockCurrent(!state.flags?.blocked_by_me)}catch(err){toast(humanError(err))}});
    $('[data-real-unblock]',pane)?.addEventListener('click',async()=>{try{await blockCurrent(false)}catch(err){toast(humanError(err))}});
    $('[data-real-complete-deal]',pane)?.addEventListener('click',openDealModal);
    $('[data-real-review-open]',pane)?.addEventListener('click',openReviewModal);
    const input=$('[data-real-chat-input]',pane);
    input?.addEventListener('input',syncComposer);
    input?.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){
        e.preventDefault();
        if(!e.repeat)sendCurrent();
      }
    });
    syncComposer();
    $('[data-real-file-input]',pane)?.addEventListener('change',e=>{const f=e.target.files?.[0]||null;if(f&&f.size>15728640){toast('Файлът може да е максимум 15 MB.');e.target.value='';return}setFile(f)});
    $('[data-real-file-remove]',pane)?.addEventListener('click',()=>{const fi=$('[data-real-file-input]',pane);if(fi)fi.value='';setFile(null)});
    $('[data-real-chat-form]',pane)?.addEventListener('submit',e=>{e.preventDefault();sendCurrent()});
  }

  async function syncChatCatchUp(){
    if(state.syncBusy||document.visibilityState!=='visible'||!state.user?.id)return;
    state.syncBusy=true;
    try{
      await loadConversations();
      if(state.selectedId){
        const current=state.conversations.find(c=>c.id===state.selectedId);
        if(current){
          state.selected=current;
          const host=$('[data-real-message-list]',pane);
          const rendered=host?.querySelector('[data-real-message-id]:last-of-type')?.dataset?.realMessageId||'';
          if(current.last_message_id&&current.last_message_id!==rendered){
            if(unread(current)>0)await markRead(state.selectedId);
            await renderMessages(state.selectedId,{scroll:'auto'});
          }
        }
      }
      window.UrediChatBadgeRefresh?.();
    }catch(err){console.warn('Chat catch-up failed',err)}
    finally{state.syncBusy=false}
  }

  function startFallbackSync(){
    if(state.syncTimer)clearInterval(state.syncTimer);
    state.syncTimer=setInterval(()=>syncChatCatchUp(),3500);
  }

  async function subscribeRealtime(){
    if(state.channel){try{await client.removeChannel(state.channel)}catch{}}
    state.channel=client.channel(`uredi-real-chat-${state.user.id}-${Date.now()}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'market_messages'},async payload=>{
        try{
          await loadConversations();
          const m=payload.new||{};
          if(m.conversation_id===state.selectedId){
            if(m.sender_id!==state.user.id&&document.visibilityState==='visible')await markRead(state.selectedId);
            setTimeout(()=>renderMessages(state.selectedId,{scroll:'auto'}).catch(console.warn),70);
          }
          window.UrediChatBadgeRefresh?.();
        }catch(err){console.warn(err)}
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'market_messages'},payload=>{
        if((payload.new||{}).conversation_id===state.selectedId)renderMessages(state.selectedId,{scroll:false}).catch(console.warn);
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'market_message_attachments'},payload=>{
        if((payload.new||{}).conversation_id===state.selectedId)setTimeout(()=>renderMessages(state.selectedId,{scroll:'auto'}).catch(console.warn),80);
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'market_conversations'},async()=>{
        try{
          await loadConversations();
          const c=state.conversations.find(x=>x.id===state.selectedId);
          if(c)state.selected=c;
        }catch{}
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'market_deals'},async payload=>{
        try{
          const d=payload.new||{};
          if(state.selected&&d.listing_id===state.selected.listing_id)await refreshSelected({messages:true});
        }catch(err){console.warn(err)}
      })
      .subscribe(status=>{
        if(status==='SUBSCRIBED')syncChatCatchUp();
        if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
          setTimeout(()=>{if(document.visibilityState==='visible')subscribeRealtime().catch(console.warn)},1200);
        }
      });
    startFallbackSync();
  }

  async function openFromUrl(){
    const params=new URLSearchParams(location.search);
    let id=params.get('conversation');
    const listing=params.get('listing');
    if(!id&&listing){
      const {data,error}=await client.rpc('market_get_or_create_conversation',{p_listing_id:listing});
      if(error){toast(humanError(error));return}
      id=data;await loadConversations({keepSelection:false});
    }
    if(id&&state.conversations.some(c=>c.id===id))await selectConversation(id,{push:true});
  }

  document.addEventListener('click',e=>{if(e.target.closest('.real-chat-overflow'))return;const menu=$('[data-real-chat-menu]',pane),trigger=$('[data-real-chat-menu-trigger]',pane);if(menu)menu.hidden=true;trigger?.setAttribute('aria-expanded','false')});
  pane.addEventListener('click',e=>{const img=e.target.closest('[data-real-chat-image]');if(img)openImageModal(img.dataset.realChatImage)});
  listHost.addEventListener('click',e=>{const row=e.target.closest('[data-real-conversation]');if(row)selectConversation(row.dataset.realConversation)});
  $$('[data-real-chat-view]',shell).forEach(btn=>btn.addEventListener('click',()=>{
    state.view=btn.dataset.realChatView==='archived'?'archived':'active';
    $$('[data-real-chat-view]',shell).forEach(x=>{const on=x===btn;x.classList.toggle('active',on);x.setAttribute('aria-selected',on?'true':'false')});
    renderConversationRows();
  }));
  $('[data-real-chat-refresh]',shell)?.addEventListener('click',async()=>{try{await loadConversations();if(state.selectedId)await refreshSelected({messages:true});toast('Разговорите са обновени.')}catch(err){toast(humanError(err))}});

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){
      if(state.selectedId)markRead(state.selectedId);
      syncChatCatchUp();
    }
  });
  window.addEventListener('focus',()=>syncChatCatchUp());
  window.addEventListener('online',()=>syncChatCatchUp());
  window.addEventListener('popstate',()=>{const id=new URLSearchParams(location.search).get('conversation');if(id&&state.conversations.some(c=>c.id===id))selectConversation(id,{push:false});else closeChatOnMobile()});

  (async()=>{
    try{
      const {data,error}=await client.auth.getSession();if(error)throw error;
      state.user=data.session?.user||null;if(!state.user)return;
      await loadConversations({keepSelection:false});
      await subscribeRealtime();
      await openFromUrl();
    }catch(err){console.error(err);toast(humanError(err));listHost.innerHTML='<div class="conversation-empty real-conversation-empty"><strong>Чатът не можа да се зареди</strong><span>Провери дали SQL блокът за v2.80 е изпълнен.</span></div>'}
  })();
})();
