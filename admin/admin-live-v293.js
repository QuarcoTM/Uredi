(async()=>{
'use strict';
const cfg=window.SITE_CONFIG,c=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const $=s=>document.querySelector(s),status=$('[data-live-status]'),list=$('[data-live-list]');
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const page=location.pathname.split('/').pop(),kind=page==='index.html'?'home':page==='audit.html'?'audit':['settings.html','health.html','brands.html','categories.html','sold-archive.html'].includes(page)?'unavailable':page==='users.html'?'users':page==='ads.html'?'listings':page==='reports.html'?'reports':page==='blocked-profiles.html'?'blocked':'flags';
const labels={banned:'Блокиран',suspended:'Временно блокиран',restricted:'Ограничен',active:'Активна',reserved:'Резервирана',sold:'Продадена',draft:'Чернова',removed:'Свалена',clear:'Без ограничение',blocked:'Скрита от администратор',under_review:'В проверка',open:'Нова',reviewed:'Прегледана',actioned:'Предприети мерки',resolved:'Приключена',dismissed:'Отхвърлена'};
let offset=0,total=0,rows=[],loading=false,q=new URLSearchParams(location.search).get('q')||'';
const menu=document.createElement('button');menu.className='btn live-menu';menu.textContent='☰';menu.setAttribute('aria-label','Админ меню');$('.topbar').prepend(menu);
const backdrop=document.createElement('div');backdrop.className='live-menu-backdrop';backdrop.hidden=true;document.body.append(backdrop);
function toggle(open){document.body.classList.toggle('live-menu-open',open);backdrop.hidden=!open;menu.setAttribute('aria-expanded',String(open))}
menu.onclick=()=>toggle(!document.body.classList.contains('live-menu-open'));backdrop.onclick=()=>toggle(false);
const date=v=>v?new Date(v).toLocaleString('bg-BG'):'—';
const btn=(action,text,id)=>`<button class="btn ${action==='hide'?'danger':''}" data-action="${action}" data-id="${esc(id)}">${text}</button>`;
function imageMarkup(r){
 const paths=[...(r.images||[]).map(i=>i.storage_path),...(Array.isArray(r.specs?.__image_paths)?r.specs.__image_paths:[])];
 return [...new Set(paths)].filter(x=>typeof x==='string').slice(0,15).map(p=>{const url=c.storage.from('listing-images').getPublicUrl(p).data.publicUrl;return `<img loading="lazy" src="${esc(url)}" alt="Снимка към обявата">`}).join('');
}
function historyMarkup(entries){
 const names={listing_moderation_changed:'Промяна на обявата',account_status_changed:'Промяна на профила',report_status_changed:'Статус на сигнала',report_decision:'Решение по сигнала'};
 const decisions={hide:'Обявата е скрита',block:'Профилът е блокиран',dismiss:'Няма нарушение'};
 return `<details class="live-history"><summary>История (${(entries||[]).length})</summary>${(entries||[]).map(h=>{const d=h.details||{};return `<div class="live-history-entry"><strong>${esc(decisions[d.decision]||names[h.action]||h.action)}</strong><div class="live-meta">${esc(date(h.created_at))} · ${esc(h.actor_name)} · ${esc(h.actor_id)}</div>${d.status?`<p>${esc(labels[d.status]||d.status)}</p>`:''}${d.old_status?`<p>${esc(labels[d.old_status]||d.old_status)} → ${esc(labels[d.new_status]||d.new_status)}</p>`:''}${d.reason?`<p>${esc(d.reason)}</p>`:''}${h.target_id?`<small>Обект: ${esc(h.target_type)} · ${esc(h.target_id)}</small>`:''}</div>`}).join('')||'<p>Няма записани действия.</p>'}</details>`;
}
function reportMarkup(r){
 const l=r.listing,u=r.subject,open=['open','under_review'].includes(r.status);
 const reasonNames={spam:'Спам',fraud:'Измама',scam:'Измама',inappropriate:'Неподходящо съдържание',other:'Друго'};
 return `<article class="live-card"><h2>${esc(l?.title||'Сигнал за профил или съдържание')}</h2><div class="live-meta">${esc(labels[r.status]||r.status)} · ${esc(date(r.created_at))}</div><div class="live-note"><strong>Причина: ${esc(reasonNames[r.reason]||r.reason)}</strong><p>${esc(r.details||'Без допълнително описание.')}</p></div>${l?`<div class="live-images">${imageMarkup(l)}</div><p><strong>${esc(l.price)} €</strong> · ${esc(l.city)} · ${esc(labels[l.status]||l.status)}</p><details><summary>Пълно описание</summary><p>${esc(l.description||'Без описание.')}</p></details>`:'<p>Сигналът няма свързана обява за преглед.</p>'}${u?`<p><strong>Профил: ${esc(u.display_name||'Без име')}</strong><br><span class="live-meta">${esc(u.id)} · ${esc(labels[u.account_status]||u.account_status)}</span></p>`:''}${open?`<div class="live-actions">${btn('dismiss','Няма нарушение',r.id)}${l&&l.moderation_status!=='blocked'?btn('hide','Скрий обявата',r.id):''}${u&&!['banned','suspended'].includes(u.account_status)?btn('block','Блокирай профила',r.id):''}</div>`:'<p class="live-note">Сигналът е приключен. Решението е записано в историята.</p>'}${historyMarkup(r.history)}</article>`;
}
function userMarkup(r){
 const blocked=['banned','suspended'].includes(r.account_status);
 return `<article class="live-card"><h2>${esc(r.display_name||'Профил без име')}</h2><div class="live-meta">${esc(r.email||'Без имейл')}<br>${esc(r.city||'Без посочен град')} · ${esc(r.account_status==='active'?'Активен':labels[r.account_status]||r.account_status)}${r.is_admin?' · Администратор':''}<br>Регистрация: ${esc(date(r.created_at))}</div><div class="live-actions">${btn('user-listings','Обяви ('+Number(r.listing_count||0)+')',r.id)}${!blocked&&!r.is_admin?btn('block','Блокирай профила',r.id):''}${blocked?'<a class="btn" href="blocked-profiles.html">Към блокираните профили</a>':''}</div><div data-user-listings="${esc(r.id)}" hidden></div>${historyMarkup(r.history)}</article>`;
}
async function userListings(b){
 const id=b.dataset.id,box=$(`[data-user-listings="${id}"]`),start=Number(b.dataset.offset||0);
 if(!box)return;
 if(b.dataset.offset===undefined&&!box.hidden){box.hidden=true;b.setAttribute('aria-expanded','false');return}
 box.hidden=false;box.setAttribute('aria-busy','true');b.disabled=true;loading=true;b.setAttribute('aria-expanded','true');
 try{
 const r=await c.rpc('admin_user_listings_v296',{p_user_id:id,p_offset:start});if(r.error)throw r.error;
 const items=r.data?.rows||[],count=Number(r.data?.total||0);
 const pager=(off,label)=>`<button class="btn" data-action="user-listings" data-id="${esc(id)}" data-offset="${off}">${label}</button>`;
 box.innerHTML=items.map(l=>`<section class="live-user-ad"><h3>${esc(l.title)}</h3><div class="live-meta">${esc(l.price)} ${esc(l.currency)} · ${esc(l.city)}<br>${esc(labels[l.status]||l.status)} · ${esc(labels[l.moderation_status]||l.moderation_status)}</div>${l.moderation_reason?`<p class="live-note">${esc(l.moderation_reason)}</p>`:''}<div class="live-images">${imageMarkup(l)}</div><details><summary>Описание</summary><p>${esc(l.description||'Без описание.')}</p></details></section>`).join('')||'<p>Този профил няма обяви.</p>';
 if(count>20)box.innerHTML+=`<div class="live-pager">${start>0?pager(Math.max(0,start-20),'Назад'):''}<span>${Math.floor(start/20)+1} / ${Math.ceil(count/20)}</span>${start+20<count?pager(start+20,'Напред'):''}</div>`;
 }catch(e){box.textContent='Не успяхме да заредим обявите. Натисни „Обяви“ отново, за да затвориш и отвориш прегледа.';console.error(e)}finally{loading=false;b.disabled=false;box.removeAttribute('aria-busy')}
}
function render(){
 if(kind==='home'){list.innerHTML='<div class="live-card"><h2>Управление на сайта</h2><div class="live-actions"><a class="btn" href="reports.html">Сигнали</a><a class="btn" href="ads.html">Обяви</a><a class="btn" href="users.html">Потребители</a><a class="btn" href="blocked-profiles.html">Блокирани профили</a><a class="btn" href="moderation.html">Автоматични проверки</a><a class="btn" href="audit.html">История на действията</a><a class="btn" href="promotions.html">Цени и промоции</a></div></div>';return}
 if(kind==='unavailable'){list.innerHTML='<div class="live-empty">Този раздел все още не е достъпен. <a href="index.html">Към администрацията</a></div>';return}
 if(kind==='audit'){list.innerHTML=historyMarkup(rows.map(r=>({...r,actor_name:'Администратор'})));const details=list.querySelector('details');if(details)details.open=true;return}

 if(!rows.length){list.innerHTML=`<div class="live-empty">${kind==='users'?'Няма намерени потребители.':kind==='listings'?'Няма намерени обяви.':kind==='reports'?'Няма подадени сигнали.':kind==='blocked'?'Няма блокирани профили или история на блокирания.':'Няма автоматично маркирани записи.'}</div>`;return}
 list.innerHTML=rows.map(r=>{
 if(kind==='users')return userMarkup(r);
 if(kind==='reports')return reportMarkup(r);
 if(kind==='blocked')return `<article class="live-card"><h2>${esc(r.display_name||'Профил без име')}</h2><div class="live-meta">${esc(r.id)} · ${esc(labels[r.account_status]||r.account_status)}</div>${['banned','suspended'].includes(r.account_status)?`<div class="live-actions">${btn('unblock','Отблокирай профила',r.id)}</div>`:'<p>Профилът е отблокиран.</p>'}${historyMarkup(r.history)}</article>`;
 if(kind==='listings')return `<article class="live-card"><h2>${esc(r.title)}</h2><div class="live-meta">${esc(r.price)} € · ${esc(r.city||'')} · ${esc(labels[r.status]||r.status)}<br>${esc(date(r.created_at))}<br>Модерация: ${esc(labels[r.moderation_status]||r.moderation_status)}</div>${r.moderation_reason?`<p class="live-note">${esc(r.moderation_reason)}</p>`:''}<details><summary>Преглед на обявата</summary><div class="live-images">${imageMarkup(r)}</div><p>${esc(r.description||'Без описание.')}</p><small>Идентификатор: ${esc(r.id)}</small></details><div class="live-actions">${r.moderation_status==='blocked'?(r.previous_listing_status?btn('restore','Върни предишния статус',r.id):'<span>Няма записан предишен статус за автоматично връщане.</span>'):btn('hide','Скрий обявата',r.id)+btn('review','За проверка',r.id)+btn('clear','Без нарушение',r.id)}</div>${historyMarkup(r.history)}</article>`;
 const actions=[['reviewed','Прегледано'],['actioned','Предприети мерки'],['dismissed','Отхвърли']];
 return `<article class="live-card"><h2>${esc(r.listing_title||(kind==='reports'?'Потребителски сигнал':'Автоматична проверка'))}</h2><div class="live-meta">${esc(labels[r.status]||r.status)} · ${esc(date(r.created_at))}</div><p>${esc(r.details||r.excerpt||'Няма допълнително описание.')}</p><small>${esc(r.reason||r.rule_code||'')}${r.severity?' · '+esc(r.severity):''}</small>${r.listing_id?`<p><a href="ads.html?q=${encodeURIComponent(r.listing_title||r.listing_id)}">Отвори обявата за преглед и действие</a></p>`:''}<div class="live-actions">${actions.filter(([a])=>a!==r.status).map(([a,t])=>btn(a,t,r.id)).join('')}</div><small>Статусът на проверката не променя автоматично обявата.</small></article>`;
 }).join('');
}
async function load(){
 if(loading)return;loading=true;list.setAttribute('aria-busy','true');status.textContent='Зареждаме…';
 try{if(['home','unavailable'].includes(kind)){render();status.textContent='';$('[data-live-pager]').hidden=true;return}if(kind==='audit'){const r=await c.rpc('admin_recent_audit_log',{p_limit:100});if(r.error)throw r.error;rows=r.data||[];render();status.textContent='Последните 100 записани действия.';$('[data-live-pager]').hidden=true;return}const r=await c.rpc(kind==='users'?'admin_users_v296':'admin_queue_v295',kind==='users'?{p_offset:offset,p_query:q}:{p_kind:kind,p_offset:offset,p_query:q});if(r.error)throw r.error;rows=r.data?.rows||[];total=Number(r.data?.total||0);render();status.textContent=`Общо: ${total}.`;if(['reports','flags'].includes(kind))status.textContent+=' Неприключените проверки са най-отгоре.';$('[data-live-pager]').hidden=total<=30;$('[data-prev]').disabled=offset===0;$('[data-next]').disabled=offset+30>=total;$('[data-page]').textContent=`${Math.floor(offset/30)+1} / ${Math.max(1,Math.ceil(total/30))}`}
 catch(e){list.innerHTML='';status.textContent='Не успяхме да заредим данните. Провери администраторския вход и презареди.';console.error(e)}finally{loading=false;list.removeAttribute('aria-busy')}
}
try{
 const user=await c.auth.getUser();if(!user.data?.user){location.replace('../admin-access.html?next=admin/'+page);return}
 const access=await c.rpc('is_my_admin_account');if(access.error||access.data!==true){status.textContent='Нямаш администраторски достъп.';return}
 const aal=await c.auth.mfa.getAuthenticatorAssuranceLevel();if(aal.error||aal.data?.currentLevel!=='aal2'){location.replace('../admin-access.html?next=admin/'+page);return}
 if(['listings','users'].includes(kind)){$('[data-live-search]').hidden=false;$('[name=q]').value=q;}
 $('[data-live-search]').onsubmit=e=>{e.preventDefault();if(loading)return;q=$('[name=q]').value.trim();offset=0;load()};
 $('[data-prev]').onclick=()=>{if(!loading){offset=Math.max(0,offset-30);load()}};$('[data-next]').onclick=()=>{if(!loading){offset+=30;load()}};
 list.onclick=async e=>{const b=e.target.closest('[data-action]');if(!b||loading||b.disabled)return;
 const id=b.dataset.id,action=b.dataset.action;let reason=null;
 if(kind==='users'&&action==='user-listings'){await userListings(b);return}
 if(kind==='listings'&&['hide','restore'].includes(action)){reason=prompt('Причина за промяната (ще се запише в историята):');if(reason===null)return;if(reason.trim().length<3){status.textContent='Въведи кратка причина.';return}}
 if(kind==='listings'&&action==='restore'&&!confirm('Да възстановим предишния статус на тази обява?'))return;
 if(['reports','blocked','users'].includes(kind)){
 const title=action==='block'?'Блокирай профила':action==='hide'?'Скрий обявата':action==='unblock'?'Отблокирай профила':'Няма нарушение';
 reason=prompt(title+' — въведи причина за историята:','');if(reason===null)return;
 if(reason.trim().length<3||reason.length>1000){status.textContent='Въведи причина от 3 до 1000 символа.';return}
 if(action==='block'&&!confirm('Да блокираме този профил? Обявите му ще се скрият за другите потребители.'+(kind==='reports'?' Сигналът ще се приключи.':'')))return;
 if(action==='unblock'&&!confirm('Да възстановим достъпа на този профил? Обявите, които не са скрити отделно, отново ще са видими.'))return;
 }
 const rpc=kind==='users'?'admin_block_profile_v296':kind==='listings'?'admin_moderate_listing_v293':kind==='reports'?'admin_report_action_v295':kind==='blocked'?'admin_unblock_profile_v295':'admin_resolve_moderation_flag';
 const args=kind==='users'?{p_user_id:id,p_reason:reason}:kind==='listings'?{p_listing_id:id,p_action:action,p_reason:reason}:kind==='reports'?{p_report_id:id,p_action:action,p_reason:reason}:kind==='blocked'?{p_user_id:id,p_reason:reason}:{p_flag_id:id,p_status:action};
 b.disabled=true;loading=true;
 try{const r=await c.rpc(rpc,args);if(r.error)throw r.error;loading=false;await load();status.textContent='Промяната е записана. '+status.textContent}
 catch(err){status.textContent='Промяната не е записана. '+(err.message||'Опитай отново.')}
 finally{loading=false;b.disabled=false}
 };
 await load();
}catch(e){status.textContent='Не успяхме да проверим достъпа. Презареди страницата.';console.error(e)}
})();
