(async()=>{
'use strict';
const cfg=window.SITE_CONFIG,c=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const $=s=>document.querySelector(s),status=$('[data-live-status]'),list=$('[data-live-list]');
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const page=location.pathname.split('/').pop(),kind=page==='ads.html'?'listings':page==='reports.html'?'reports':'flags';
const labels={active:'Активна',reserved:'Резервирана',sold:'Продадена',draft:'Чернова',removed:'Свалена',clear:'Без ограничение',blocked:'Скрита от администратор',under_review:'В проверка',open:'Нова',reviewed:'Прегледана',actioned:'Предприети мерки',resolved:'Приключена',dismissed:'Отхвърлена'};
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
function render(){
 if(!rows.length){list.innerHTML=`<div class="live-empty">${kind==='listings'?'Няма намерени обяви.':kind==='reports'?'Няма подадени сигнали.':'Няма автоматично маркирани записи.'}</div>`;return}
 list.innerHTML=rows.map(r=>{
 if(kind==='listings')return `<article class="live-card"><h2>${esc(r.title)}</h2><div class="live-meta">${esc(r.price)} € · ${esc(r.city||'')} · ${esc(labels[r.status]||r.status)}<br>${esc(date(r.created_at))}<br>Модерация: ${esc(labels[r.moderation_status]||r.moderation_status)}</div>${r.moderation_reason?`<p class="live-note">${esc(r.moderation_reason)}</p>`:''}<details><summary>Преглед на обявата</summary><div class="live-images">${imageMarkup(r)}</div><p>${esc(r.description||'Без описание.')}</p><small>Идентификатор: ${esc(r.id)}</small></details><div class="live-actions">${r.moderation_status==='blocked'?(r.previous_listing_status?btn('restore','Върни предишния статус',r.id):'<span>Няма записан предишен статус за автоматично връщане.</span>'):btn('hide','Скрий обявата',r.id)+btn('review','За проверка',r.id)+btn('clear','Без нарушение',r.id)}</div></article>`;
 const actions=kind==='reports'?[['under_review','Проверявам'],['resolved','Приключи'],['dismissed','Отхвърли']]:[['reviewed','Прегледано'],['actioned','Предприети мерки'],['dismissed','Отхвърли']];
 return `<article class="live-card"><h2>${esc(r.listing_title||(kind==='reports'?'Потребителски сигнал':'Автоматична проверка'))}</h2><div class="live-meta">${esc(labels[r.status]||r.status)} · ${esc(date(r.created_at))}</div><p>${esc(r.details||r.excerpt||'Няма допълнително описание.')}</p><small>${esc(r.reason||r.rule_code||'')}${r.severity?' · '+esc(r.severity):''}</small>${r.listing_id?`<p><a href="ads.html?q=${encodeURIComponent(r.listing_title||r.listing_id)}">Отвори обявата за преглед и действие</a></p>`:''}<div class="live-actions">${actions.filter(([a])=>a!==r.status).map(([a,t])=>btn(a,t,r.id)).join('')}</div><small>Статусът на проверката не променя автоматично обявата.</small></article>`;
 }).join('');
}
async function load(){
 if(loading)return;loading=true;list.setAttribute('aria-busy','true');status.textContent='Зареждаме…';
 try{const r=await c.rpc('admin_queue_v293',{p_kind:kind,p_offset:offset,p_query:q});if(r.error)throw r.error;rows=r.data?.rows||[];total=Number(r.data?.total||0);render();status.textContent=`Общо: ${total}.`;if(kind!=='listings')status.textContent+=' Неприключените проверки са най-отгоре.';$('[data-live-pager]').hidden=total<=30;$('[data-prev]').disabled=offset===0;$('[data-next]').disabled=offset+30>=total;$('[data-page]').textContent=`${Math.floor(offset/30)+1} / ${Math.max(1,Math.ceil(total/30))}`}
 catch(e){list.innerHTML='';status.textContent='Не успяхме да заредим данните. Провери администраторския вход и презареди.';console.error(e)}finally{loading=false;list.removeAttribute('aria-busy')}
}
try{
 const user=await c.auth.getUser();if(!user.data?.user){location.replace('../admin-access.html?next=admin/'+page);return}
 const access=await c.rpc('is_my_admin_account');if(access.error||access.data!==true){status.textContent='Нямаш администраторски достъп.';return}
 const aal=await c.auth.mfa.getAuthenticatorAssuranceLevel();if(aal.error||aal.data?.currentLevel!=='aal2'){location.replace('../admin-access.html?next=admin/'+page);return}
 if(kind==='listings'){$('[data-live-search]').hidden=false;$('[name=q]').value=q;}
 $('[data-live-search]').onsubmit=e=>{e.preventDefault();q=$('[name=q]').value.trim();offset=0;load()};
 $('[data-prev]').onclick=()=>{if(!loading){offset=Math.max(0,offset-30);load()}};$('[data-next]').onclick=()=>{if(!loading){offset+=30;load()}};
 list.onclick=async e=>{const b=e.target.closest('[data-action]');if(!b||loading||b.disabled)return;
 const id=b.dataset.id,action=b.dataset.action;let reason=null;
 if(kind==='listings'&&action==='hide'){reason=prompt('Причина за скриването (ще се запише в администраторската история):');if(reason===null)return;if(reason.trim().length<3){status.textContent='Въведи кратка причина.';return}}
 if(kind==='listings'&&action==='restore'&&!confirm('Да възстановим предишния статус на тази обява?'))return;
 if(kind==='reports'){reason=prompt('Бележка към сигнала (по желание):','');if(reason===null)return}
 const rpc=kind==='listings'?'admin_moderate_listing_v293':kind==='reports'?'admin_resolve_report':'admin_resolve_moderation_flag';
 const args=kind==='listings'?{p_listing_id:id,p_action:action,p_reason:reason}:kind==='reports'?{p_report_id:id,p_status:action,p_internal_note:reason}:{p_flag_id:id,p_status:action};
 b.disabled=true;
 try{const r=await c.rpc(rpc,args);if(r.error)throw r.error;await load();status.textContent='Промяната е записана. '+status.textContent}
 catch(err){status.textContent='Промяната не е записана. '+(err.message||'Опитай отново.')}
 finally{b.disabled=false}
 };
 await load();
}catch(e){status.textContent='Не успяхме да проверим достъпа. Презареди страницата.';console.error(e)}
})();
