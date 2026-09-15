(async()=>{
  'use strict';
  const cfg=window.SITE_CONFIG,client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  const status=document.getElementById('status'),editor=document.getElementById('editor');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateInput=v=>{const d=new Date(v);return Number.isNaN(+d)?'':new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
  const tell=m=>{status.textContent=m};
  async function load(){
    const auth=await client.auth.getUser();
    if(!auth.data?.user){location.replace('../admin-access.html');return}
    const aal=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal.data?.currentLevel!=='aal2'){location.replace('../admin-access.html');return}
    const results=await Promise.all(['promotion_products','promotion_packages','promotion_price_campaigns'].map(t=>client.from(t).select('*')));
    if(results.some(r=>r.error))throw results.find(r=>r.error).error;
    const [products,packages,campaigns]=results.map(r=>r.data||[]);
    const items=[...products.map(x=>({...x,type:'product'})),...packages.map(x=>({...x,type:'package'}))];
    editor.innerHTML=items.map((p,i)=>`<article data-index="${i}"><h2>${esc(p.name)}</h2><div class="grid"><label>Редовна цена (€)<input data-price type="number" min="0.01" step="0.01" value="${Number(p.regular_price)}"></label><label>Услугата е налична<select data-enabled><option value="true" ${p.enabled?'selected':''}>Да</option><option value="false" ${p.enabled?'':'selected'}>Не</option></select></label></div><button data-save-price>Запази редовната цена</button><h3>Нова промоция</h3><div class="grid"><label>Промо цена (€)<input data-promo-price type="number" min="0.01" step="0.01"></label><label>Начало<input data-start type="datetime-local"></label><label>Край<input data-end type="datetime-local"></label><label>За кого<select data-audience><option value="all">Всички</option><option value="private">Частни лица</option><option value="dealer">Търговци</option></select></label></div><button data-add-campaign>Запази промоцията</button>${campaigns.filter(c=>c.item_type===p.type&&c.item_id===p.id).map(c=>`<div class="campaign"><b>${Number(c.promo_price).toFixed(2)} €</b> · ${esc(dateInput(c.starts_at).replace('T',' '))} — ${esc(dateInput(c.ends_at).replace('T',' '))} · ${esc(c.audience)} · ${c.enabled?'Включена':'Спряна'} ${c.enabled?`<button data-stop="${esc(c.id)}">Спри промоцията</button>`:''}</div>`).join('')}</article>`).join('');
    tell('Заредени са цените от базата. Записът изисква администраторски права.');
    editor.onclick=async e=>{
      const b=e.target.closest('button'),card=b?.closest('article');if(!card||b.disabled)return;
      const p=items[Number(card.dataset.index)],q=s=>card.querySelector(s);b.disabled=true;
      try{
        let r;
        if(b.hasAttribute('data-save-price')){
          const price=Number(q('[data-price]').value);if(!Number.isFinite(price)||price<=0)throw new Error('Въведи положителна цена.');
          r=await client.from(p.type==='product'?'promotion_products':'promotion_packages').update({regular_price:price,enabled:q('[data-enabled]').value==='true'}).eq('id',p.id).select('id');
        }else if(b.hasAttribute('data-stop')){
          r=await client.from('promotion_price_campaigns').update({enabled:false}).eq('id',b.dataset.stop).select('id');
        }else{
          const price=Number(q('[data-promo-price]').value),start=new Date(q('[data-start]').value),end=new Date(q('[data-end]').value);
          if(!(price>0&&price<Number(p.regular_price)))throw new Error('Промо цената трябва да е над нула и под записаната редовна цена.');
          if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<=start)throw new Error('Въведи валидни начало и край.');
          if(campaigns.some(c=>c.enabled&&c.item_type===p.type&&c.item_id===p.id&&c.audience===q('[data-audience]').value&&+new Date(c.starts_at)<+end&&+new Date(c.ends_at)>+start))throw new Error('Има застъпваща се промоция за тази аудитория. Спри я преди новата.');
          r=await client.from('promotion_price_campaigns').insert({item_type:p.type,item_id:p.id,promo_price:price,starts_at:start.toISOString(),ends_at:end.toISOString(),audience:q('[data-audience]').value,enabled:true}).select('id');
        }
        if(r.error)throw r.error;if(!r.data?.length)throw new Error('Няма разрешение за запис. Нужен е администраторски профил с двустепенно потвърждение.');
        await load();tell('Запазено в базата. Платените услуги остават изключени.');
      }catch(err){tell(err.message||'Записът не е успешен.')}finally{b.disabled=false}
    };
  }
  try{await load()}catch(err){tell(err.message||'Не успяхме да заредим настройките.')}
})();
