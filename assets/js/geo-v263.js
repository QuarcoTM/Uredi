(function(){
  'use strict';
  const $=(s,c=document)=>c.querySelector(s);
  const $$=(s,c=document)=>Array.from(c.querySelectorAll(s));
  const KEY='marketDistanceOriginV254';
  const coords={
    'софия':[42.6977,23.3219],'пловдив':[42.1354,24.7453],'варна':[43.2141,27.9147],
    'бургас':[42.5048,27.4626],'кюстендил':[42.2839,22.6911],'благоевград':[42.0209,23.0943],
    'перник':[42.6052,23.0378],'русе':[43.8356,25.9657],'дупница':[42.2673,23.1188],
    'стара загора':[42.4258,25.6345],'плевен':[43.4170,24.6067],'велико търново':[43.0757,25.6172],
    'шумен':[43.2706,26.9229],'добрич':[43.5726,27.8273],'хасково':[41.9344,25.5554],
    'сливен':[42.6817,26.3229],'ямбол':[42.4841,26.5035],'враца':[43.2102,23.5529],
    'монтана':[43.4085,23.2257],'видин':[43.9962,22.8679],'габрово':[42.8742,25.3187],
    'ловеч':[43.1357,24.7140],'търговище':[43.2512,26.5722],'разград':[43.5337,26.5411],
    'силистра':[44.1171,27.2606],'смолян':[41.5774,24.7011],'кърджали':[41.6420,25.3694],
    'пазарджик':[42.1928,24.3336]
  };
  const norm=v=>String(v||'').trim().toLowerCase();
  const readOrigin=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
  const saveOrigin=o=>{try{localStorage.setItem(KEY,JSON.stringify(o))}catch{}};
  const hav=(a,b)=>{const R=6371,toRad=x=>x*Math.PI/180,dLat=toRad(b[0]-a[0]),dLon=toRad(b[1]-a[1]),la1=toRad(a[0]),la2=toRad(b[0]);const q=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q))};
  const hint=()=> $('[data-distance-hint]');
  const button=()=> $('[data-use-location]');
  const radius=()=> $('#distanceRadius');
  const city=()=> $('#cityFilter');

  function rowCoords(row){
    const lat=Number(row.dataset.lat),lon=Number(row.dataset.lon);
    if(Number.isFinite(lat)&&Number.isFinite(lon))return [lat,lon];
    const name=row.dataset.city||row.querySelector('.listing-location')?.textContent||'';
    return coords[norm(name)]||null;
  }
  function origin(){
    const o=readOrigin();
    if(o&&Number.isFinite(Number(o.lat))&&Number.isFinite(Number(o.lon)))return [Number(o.lat),Number(o.lon)];
    return null;
  }
  function apply(){
    const r=Number(radius()?.value||0),o=origin();
    $$('.listing-row').forEach(row=>row.classList.remove('geo-filter-hidden'));
    if(!r||!o)return;
    $$('.listing-row').forEach(row=>{
      const p=rowCoords(row);
      if(!p||hav(o,p)>r)row.classList.add('geo-filter-hidden');
    });
  }
  function setReady(){
    const b=button();if(!b)return;
    const o=origin();
    b.classList.toggle('geo-location-active',!!o);
    b.classList.remove('geo-location-busy');
    b.disabled=false;
    b.textContent=o?'Моето място':'Моето място';
    if(o&&hint())hint().textContent=`Текущото ти местоположение е избрано${radius()?.value?` · до ${radius().value} км`:''}.`;
  }
  function fail(message){
    const b=button();if(b){b.disabled=false;b.classList.remove('geo-location-busy');b.textContent='Моето място'}
    if(hint())hint().textContent=message;
    if(window.marketToast)window.marketToast(message);
  }
  async function locate(){
    const b=button();if(!b)return;
    b.disabled=true;b.classList.add('geo-location-busy');b.textContent='Определям…';
    if(hint())hint().textContent='Изчаквам разрешение за местоположение от браузъра…';
    if(!window.isSecureContext)return fail('Местоположението работи само през защитена HTTPS връзка.');
    if(!navigator.geolocation)return fail('Този браузър не поддържа определяне на местоположение.');
    navigator.geolocation.getCurrentPosition(pos=>{
      saveOrigin({lat:Number(pos.coords.latitude),lon:Number(pos.coords.longitude),accuracy:Number(pos.coords.accuracy)||null,at:Date.now()});
      if(radius()&&!radius().value)radius().value='50';
      if(city())city().value='';
      setReady();
      radius()?.dispatchEvent(new Event('change',{bubbles:true}));
      city()?.dispatchEvent(new Event('input',{bubbles:true}));
      apply();
    },err=>{
      const msg=err?.code===1?'Разреши достъп до местоположението от настройките на браузъра и опитай пак.':err?.code===3?'Не успях да определя местоположението навреме. Опитай пак.':'Не успях да определя местоположението. Можеш да избереш град ръчно.';
      fail(msg);
    },{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-use-location]');
    if(!b)return;
    e.preventDefault();e.stopPropagation();locate();
  },true);
  document.addEventListener('change',e=>{if(e.target.matches('#distanceRadius')){setReady();apply()}},true);
  document.addEventListener('input',e=>{if(e.target.matches('#cityFilter')&&e.target.value.trim()){try{localStorage.removeItem(KEY)}catch{};setReady();apply()}},true);
  const observer=new MutationObserver(()=>apply());
  const list=$('.listing-list');if(list)observer.observe(list,{childList:true,subtree:true});
  setReady();apply();
})();
