(function(){
  'use strict';
  const CONFIG_KEY='marketMonetizationV241';
  const WALLETS_KEY='marketPromotionWalletsV241';
  const HISTORY_KEY='marketPromotionHistoryV241';
  const PURCHASES_KEY='marketPromotionPurchasesV241';
  const LISTING_PROMOS_KEY='marketListingPromotionsV241';
  const CURRENT_USER_KEY='marketCurrentUserV241';
  const BONUS_GRANTS_KEY='marketBetaBonusGrantsV245';

  const DEFAULTS={
    version:'2.45',
    freeBeta:true,
    paidServicesEnabled:false,
    paymentMode:'test',
    livePaymentsReady:false,
    currency:'EUR',
    bonusCampaign:{
      id:'early-500-top7',
      enabled:true,
      title:'Бонус за първите 500',
      maxVerifiedUsers:500,
      creditProductId:'top7',
      qty:1,
      redeemUntil:'2026-12-31T23:59:59+02:00',
      requiresVerifiedEmail:true
    },
    products:{
      bump:{id:'bump',kind:'bump',name:'Изкачи',shortName:'Изкачи',durationDays:0,regularPrice:1.99,enabled:true,description:'Премества обявата най-горе сред обикновените обяви. В „Избрани обяви“ влиза само ако няма активни VIP или TOP.',promotion:{enabled:false,price:null,start:null,end:null,audience:'all',maxSales:null,sales:0}},
      top7:{id:'top7',kind:'top',name:'TOP · 7 дни',shortName:'TOP',durationDays:7,regularPrice:4.99,enabled:true,description:'Обявата стои пред нормалните обяви с TOP badge за 7 дни. В „Избрани обяви“ се показва само ако няма активни VIP.',promotion:{enabled:false,price:null,start:null,end:null,audience:'all',maxSales:null,sales:0}},
      top30:{id:'top30',kind:'top',name:'TOP · 30 дни',shortName:'TOP',durationDays:30,regularPrice:9.99,enabled:true,description:'Обявата стои пред нормалните обяви с TOP badge за 30 дни. В „Избрани обяви“ се показва само ако няма активни VIP.',promotion:{enabled:false,price:null,start:null,end:null,audience:'all',maxSales:null,sales:0}},
      vip7:{id:'vip7',kind:'vip',name:'VIP · 7 дни',shortName:'VIP',durationDays:7,regularPrice:7.99,enabled:true,description:'Най-висока позиция — пред TOP и нормалните обяви за 7 дни. VIP е първият приоритет в „Избрани обяви“.',promotion:{enabled:false,price:null,start:null,end:null,audience:'all',maxSales:null,sales:0}},
      vip30:{id:'vip30',kind:'vip',name:'VIP · 30 дни',shortName:'VIP',durationDays:30,regularPrice:14.99,enabled:true,description:'Най-висока позиция — пред TOP и нормалните обяви за 30 дни. VIP е първият приоритет в „Избрани обяви“.',promotion:{enabled:false,price:null,start:null,end:null,audience:'all',maxSales:null,sales:0}}
    },
    packages:[
      {id:'pack-bump10',name:'10 × Изкачи',creditProductId:'bump',qty:10,regularPrice:19.90,enabled:true,description:'10 изкачвания, които използваш когато поискаш.',promotion:{enabled:false,price:null,start:null,end:null,audience:'all',maxSales:null,sales:0}},
      {id:'pack-top10',name:'10 × TOP · 7 дни',creditProductId:'top7',qty:10,regularPrice:49.90,enabled:true,description:'10 TOP активации за 7 дни. Не се активират автоматично.',promotion:{enabled:false,price:null,start:null,end:null,audience:'all',maxSales:null,sales:0}},
      {id:'pack-vip5',name:'5 × VIP · 7 дни',creditProductId:'vip7',qty:5,regularPrice:39.95,enabled:true,description:'5 VIP активации за 7 дни, които остават в баланса ти.',promotion:{enabled:false,price:null,start:null,end:null,audience:'all',maxSales:null,sales:0}}
    ]
  };

  const clone=x=>JSON.parse(JSON.stringify(x));
  const read=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):clone(fallback)}catch(e){return clone(fallback)}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const mergePromo=(p,d)=>Object.assign({},d||DEFAULTS.products.bump.promotion,p||{});

  function normalize(config){
    const c=Object.assign(clone(DEFAULTS),config||{});
    c.products=Object.assign({},clone(DEFAULTS.products),(config&&config.products)||{});
    Object.keys(c.products).forEach(k=>{
      c.products[k]=Object.assign({},DEFAULTS.products[k]||{},c.products[k]);
      c.products[k].promotion=mergePromo(c.products[k].promotion,(DEFAULTS.products[k]||{}).promotion);
    });
    c.packages=Array.isArray(config?.packages)?config.packages.map(p=>Object.assign({},p,{promotion:mergePromo(p.promotion)})):clone(DEFAULTS.packages);
    c.bonusCampaign=Object.assign({},clone(DEFAULTS.bonusCampaign),(config&&config.bonusCampaign)||{});
    c.bonusCampaign.enabled=!!c.bonusCampaign.enabled;
    c.bonusCampaign.maxVerifiedUsers=Math.max(1,Number(c.bonusCampaign.maxVerifiedUsers||500));
    c.bonusCampaign.qty=Math.max(1,Number(c.bonusCampaign.qty||1));
    c.freeBeta=c.freeBeta!==false;
    c.paidServicesEnabled=!!c.paidServicesEnabled;
    c.paymentMode=c.paymentMode==='live'?'live':'test';
    c.livePaymentsReady=!!c.livePaymentsReady;
    if(c.freeBeta)c.paidServicesEnabled=false;
    return c;
  }

  function getConfig(){
    const stored=localStorage.getItem(CONFIG_KEY);
    if(stored)return normalize(read(CONFIG_KEY,DEFAULTS));
    const site=window.SITE_CONFIG||{};
    const initial=clone(DEFAULTS);
    initial.freeBeta=site.freeBeta!==false;
    initial.paidServicesEnabled=!!site.paidServicesEnabled;
    if(initial.freeBeta)initial.paidServicesEnabled=false;
    write(CONFIG_KEY,initial);
    return normalize(initial);
  }
  function saveConfig(config){
    const c=normalize(config);
    c.updatedAt=new Date().toISOString();
    write(CONFIG_KEY,c);
    window.dispatchEvent(new CustomEvent('market:monetization-changed',{detail:c}));
    return c;
  }
  function setPlatform(patch){
    const c=getConfig();
    Object.assign(c,patch||{});
    if(c.freeBeta)c.paidServicesEnabled=false;
    if(c.paymentMode==='live'&&!c.livePaymentsReady)c.paidServicesEnabled=false;
    if(c.paidServicesEnabled && validatePaidSetup(c).length)c.paidServicesEnabled=false;
    return saveConfig(c);
  }
  function getPlatform(){
    const c=getConfig();
    return {freeBeta:c.freeBeta,paidServicesEnabled:c.paidServicesEnabled,paymentMode:c.paymentMode,livePaymentsReady:c.livePaymentsReady};
  }
  function paidAvailable(){const p=getPlatform();return !p.freeBeta&&p.paidServicesEnabled;}
  function checkoutAllowed(){const p=getPlatform();return paidAvailable()&&(p.paymentMode==='test'||p.livePaymentsReady);}

  function getCurrentUser(){
    return read(CURRENT_USER_KEY,{id:'demo-user',type:'private',name:'Иван Петров'});
  }
  function setCurrentUser(user){write(CURRENT_USER_KEY,Object.assign({id:'demo-user',type:'private'},user||{}));}
  function getWallet(userId){
    const id=userId||getCurrentUser().id;
    const all=read(WALLETS_KEY,{});
    return Object.assign({},Object.fromEntries(Object.keys(getConfig().products).map(k=>[k,0])),all[id]||{});
  }
  function setWallet(userId,wallet){
    const id=userId||getCurrentUser().id;
    const all=read(WALLETS_KEY,{});all[id]=wallet;write(WALLETS_KEY,all);
    window.dispatchEvent(new CustomEvent('market:wallet-changed',{detail:{userId:id,wallet}}));
    return wallet;
  }
  function historyPush(entry){
    const all=read(HISTORY_KEY,[]);all.unshift(Object.assign({at:new Date().toISOString()},entry));write(HISTORY_KEY,all.slice(0,1000));
  }
  function adjustWallet(userId,productId,qty,reason,source){
    const c=getConfig();if(!c.products[productId])throw new Error('Невалиден тип промоция.');
    const n=Number(qty);if(!Number.isInteger(n)||n===0)throw new Error('Количеството трябва да е цяло число, различно от 0.');
    const id=userId||getCurrentUser().id,w=getWallet(id),next=Number(w[productId]||0)+n;
    if(next<0)throw new Error('Балансът не може да стане отрицателен.');
    w[productId]=next;setWallet(id,w);historyPush({userId:id,productId,qty:n,reason:reason||'',source:source||'admin',balanceAfter:next});return w;
  }
  function getHistory(){return read(HISTORY_KEY,[]);}
  function getPurchases(){return read(PURCHASES_KEY,[]);}

  function parseDate(v){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d;}
  function audienceMatches(a,userType){return (a||'all')==='all'||a===userType;}
  function promoActive(item,userType,now){
    const p=item?.promotion;if(!p?.enabled||p.price===null||p.price==='')return false;
    now=now||new Date();const start=parseDate(p.start),end=parseDate(p.end);
    if(start&&now<start)return false;if(end&&now>end)return false;
    if(!audienceMatches(p.audience,getCurrentUser().type||userType||'private'))return false;
    if(p.maxSales!==null&&p.maxSales!==''&&Number(p.sales||0)>=Number(p.maxSales))return false;
    return Number.isFinite(Number(p.price));
  }
  function priceFor(item,userType){
    const regular=Number(item?.regularPrice||0),active=promoActive(item,userType||getCurrentUser().type);
    return {regular,current:active?Number(item.promotion.price):regular,onPromo:active};
  }
  function money(v){return Number(v||0).toLocaleString('bg-BG',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
  function findItem(id){
    const c=getConfig();if(c.products[id])return {type:'product',item:c.products[id],config:c};
    const p=c.packages.find(x=>x.id===id);return p?{type:'package',item:p,config:c}:null;
  }
  function completePurchase(itemId,opts){
    opts=opts||{};if(!paidAvailable())throw new Error('Платените услуги не са активни.');if(!checkoutAllowed())throw new Error('Checkout не е готов за този режим.');
    const found=findItem(itemId);if(!found||!found.item.enabled)throw new Error('Офертата не е активна.');
    if(opts.listingId && found.type==='product'){
      const allowed=canApplyPromotion(opts.listingId,found.item.id);
      if(!allowed.ok)throw new Error(allowed.message);
    }
    const user=getCurrentUser(),pr=priceFor(found.item,user.type),productId=found.type==='product'?found.item.id:found.item.creditProductId,qty=found.type==='product'?1:Number(found.item.qty||0);
    adjustWallet(opts.userId||user.id,productId,qty,'Покупка: '+found.item.name,'purchase');
    const purchases=getPurchases();purchases.unshift({id:'pay_'+Date.now(),userId:opts.userId||user.id,itemId,productId,qty,amount:pr.current,regularAmount:pr.regular,onPromo:pr.onPromo,mode:getPlatform().paymentMode,context:opts.context||'wallet',listingId:opts.listingId||null,at:new Date().toISOString()});write(PURCHASES_KEY,purchases.slice(0,1000));
    if(pr.onPromo){found.item.promotion.sales=Number(found.item.promotion.sales||0)+1;saveConfig(found.config);}
    return purchases[0];
  }

  function getListingPromotions(){return read(LISTING_PROMOS_KEY,{});}


  function getBonusCampaign(){return Object.assign({},getConfig().bonusCampaign||{});}

  function getBonusGrants(){return read(BONUS_GRANTS_KEY,{});}

  function getBonusGrant(userId){
    const id=String(userId||getCurrentUser().id||'').trim();
    return getBonusGrants()[id]||null;
  }

  function bonusRedeemOpen(campaign,now){
    const c=campaign||getBonusCampaign();
    if(!c.enabled)return false;
    const end=parseDate(c.redeemUntil);
    const ts=now instanceof Date?now:new Date(now||Date.now());
    return !end || ts<=end;
  }

  function getBonusSummary(userId,now){
    const grant=getBonusGrant(userId),campaign=getBonusCampaign();
    if(!grant||grant.campaignId!==campaign.id)return [];
    const remaining=Math.max(0,Number(grant.remaining||0));
    if(!remaining||!bonusRedeemOpen(campaign,now))return [];
    const product=getConfig().products?.[grant.productId];
    if(!product||!product.enabled)return [];
    return [{
      campaignId:campaign.id,
      campaignTitle:campaign.title,
      productId:grant.productId,
      name:product.name,
      shortName:product.shortName,
      remaining,
      redeemUntil:grant.redeemUntil||campaign.redeemUntil,
      verifiedRegistrationOrder:grant.verifiedRegistrationOrder
    }];
  }

  function grantEarlyBetaBonus(userId,verifiedRegistrationOrder,verifiedEmail){
    const c=getConfig(),campaign=c.bonusCampaign||{},id=String(userId||'').trim();
    const order=Number(verifiedRegistrationOrder);
    if(!id)return {granted:false,reason:'missing-user'};
    if(!campaign.enabled)return {granted:false,reason:'campaign-off'};
    if(campaign.requiresVerifiedEmail&&verifiedEmail!==true)return {granted:false,reason:'email-not-verified'};
    if(!Number.isInteger(order)||order<1||order>Number(campaign.maxVerifiedUsers||500))return {granted:false,reason:'not-in-first-group'};
    if(!bonusRedeemOpen(campaign))return {granted:false,reason:'campaign-expired'};
    if(!c.products?.[campaign.creditProductId])return {granted:false,reason:'invalid-product'};

    const all=getBonusGrants();
    if(all[id]?.campaignId===campaign.id)return {granted:false,reason:'already-granted',grant:all[id]};

    // Local prototype duplicate-order guard. Production must enforce this globally in the DB.
    const duplicate=Object.values(all).find(g=>g?.campaignId===campaign.id&&Number(g.verifiedRegistrationOrder)===order);
    if(duplicate)return {granted:false,reason:'registration-order-used'};

    const grant={
      campaignId:campaign.id,
      userId:id,
      productId:campaign.creditProductId,
      qty:Number(campaign.qty||1),
      remaining:Number(campaign.qty||1),
      verifiedRegistrationOrder:order,
      grantedAt:new Date().toISOString(),
      redeemUntil:campaign.redeemUntil||null
    };
    all[id]=grant;write(BONUS_GRANTS_KEY,all);
    historyPush({userId:id,productId:grant.productId,qty:grant.qty,reason:'FREE BETA бонус · първите '+Number(campaign.maxVerifiedUsers||500)+' потвърдени регистрации',source:'beta-bonus',balanceAfter:grant.remaining});
    window.dispatchEvent(new CustomEvent('market:bonus-changed',{detail:{userId:id,grant}}));
    return {granted:true,grant};
  }

  function useBonus(productId,listingId,userId){
    const id=String(userId||getCurrentUser().id||'').trim(),campaign=getBonusCampaign(),all=getBonusGrants(),grant=all[id];
    if(!grant||grant.campaignId!==campaign.id||grant.productId!==productId)throw new Error('Нямаш такъв наличен бонус.');
    if(!bonusRedeemOpen(campaign))throw new Error('Срокът за използване на бонуса е изтекъл.');
    if(Number(grant.remaining||0)<1)throw new Error('Бонусът вече е използван.');
    const allowed=canApplyPromotion(listingId,productId);
    if(!allowed.ok)throw new Error(allowed.message);

    const before=Number(grant.remaining||0);
    grant.remaining=before-1;all[id]=grant;write(BONUS_GRANTS_KEY,all);
    try{
      const record=applyPromotion(listingId,productId);
      historyPush({userId:id,productId,qty:-1,reason:'Използван FREE BETA бонус за обява '+String(listingId||''),source:'beta-bonus-use',balanceAfter:grant.remaining});
      window.dispatchEvent(new CustomEvent('market:bonus-changed',{detail:{userId:id,grant}}));
      return record;
    }catch(err){
      grant.remaining=before;all[id]=grant;write(BONUS_GRANTS_KEY,all);
      throw err;
    }
  }

  function bonusPromotionsAvailable(userId){return getBonusSummary(userId).length>0;}

  function promotionPlacementEnabled(){
    if(paidAvailable())return true;
    const all=getListingPromotions(),now=Date.now();
    return Object.values(all).some(r=>recordActiveTimed(r,now)||(r?.kind==='bump'&&!!parseDate(r.bumpedAt)));
  }

  function promotionAccessAvailable(userId){
    return paidAvailable()||bonusPromotionsAvailable(userId)||promotionPlacementEnabled();
  }

  function validatePaidSetup(config){
    const c=config||getConfig(),issues=[];
    const products=Object.values(c.products||{}).filter(p=>p&&p.enabled);
    if(!products.length)issues.push('Няма включена платена услуга.');
    products.forEach(p=>{
      if(!Number.isFinite(Number(p.regularPrice))||Number(p.regularPrice)<0)issues.push('Невалидна редовна цена за '+(p.name||p.id)+'.');
      if((p.kind==='top'||p.kind==='vip')&&Number(p.durationDays||0)<=0)issues.push('Липсва валиден срок за '+(p.name||p.id)+'.');
      const pr=p.promotion||{};
      if(pr.enabled){
        if(pr.price===null||pr.price===''||!Number.isFinite(Number(pr.price))||Number(pr.price)<0)issues.push('Невалидна промо цена за '+(p.name||p.id)+'.');
        const s=parseDate(pr.start),e=parseDate(pr.end);
        if(s&&e&&s>=e)issues.push('Краят на промоцията трябва да е след началото за '+(p.name||p.id)+'.');
      }
    });
    (c.packages||[]).filter(p=>p&&p.enabled).forEach(p=>{
      if(!c.products?.[p.creditProductId])issues.push('Пакетът '+(p.name||p.id)+' сочи към липсваща услуга.');
      if(!Number.isInteger(Number(p.qty))||Number(p.qty)<1)issues.push('Невалиден брой активации в '+(p.name||p.id)+'.');
      if(!Number.isFinite(Number(p.regularPrice))||Number(p.regularPrice)<0)issues.push('Невалидна цена на '+(p.name||p.id)+'.');
      const pr=p.promotion||{};
      if(pr.enabled){
        if(pr.price===null||pr.price===''||!Number.isFinite(Number(pr.price))||Number(pr.price)<0)issues.push('Невалидна промо цена за '+(p.name||p.id)+'.');
        const s=parseDate(pr.start),e=parseDate(pr.end);
        if(s&&e&&s>=e)issues.push('Краят на промоцията трябва да е след началото за '+(p.name||p.id)+'.');
      }
    });
    if(c.paymentMode==='live'&&!c.livePaymentsReady)issues.push('LIVE плащанията не са свързани.');
    return [...new Set(issues)];
  }

  function recordActiveTimed(record,now){
    if(!record||(record.kind!=='top'&&record.kind!=='vip'))return false;
    const ts=now instanceof Date?now.getTime():Number(now||Date.now());
    const end=parseDate(record.expiresAt);
    return !end || end.getTime()>ts;
  }

  function getActivePromotion(listingId,now){
    const id=String(listingId||''),record=getListingPromotions()[id];
    if(!recordActiveTimed(record,now))return null;
    return {listingId:id,active:true,kind:record.kind,productId:record.productId||null,startedAt:record.startedAt||null,expiresAt:record.expiresAt||null};
  }

  function getListingPromotionState(listingId,now){
    const id=String(listingId||''),record=getListingPromotions()[id]||null;
    const active=getActivePromotion(id,now);
    if(active)return active;
    const bumpedAt=record?.kind==='bump'&&parseDate(record.bumpedAt)?record.bumpedAt:null;
    return {listingId:id,active:false,kind:bumpedAt?'bump':null,productId:bumpedAt?(record.productId||'bump'):null,bumpedAt,startedAt:bumpedAt?(record.startedAt||bumpedAt):null,expiresAt:null};
  }

  function canApplyPromotion(listingId,productId,now){
    const c=getConfig(),product=c.products?.[productId];
    if(!product||!product.enabled)return {ok:false,message:'Тази услуга не е активна.'};
    const id=String(listingId||'').trim();
    if(!id)return {ok:false,message:'Не е избрана обява.'};
    const active=getActivePromotion(id,now);
    if(active){
      const name=active.kind==='vip'?'VIP':'TOP',end=parseDate(active.expiresAt);
      const until=end?' до '+end.toLocaleDateString('bg-BG'):'';
      return {ok:false,active,message:'Обявата вече има активен '+name+until+'. Изчакай да изтече, преди да активираш друга промоция.'};
    }
    return {ok:true,active:null};
  }

  function getFeaturedPromotionSelection(now){
    const all=getListingPromotions(),ts=now instanceof Date?now.getTime():Number(now||Date.now());
    const entries=Object.entries(all).map(([listingId,record])=>({listingId,record:record||{}}));
    const sortStarted=(a,b)=>(parseDate(b.record.startedAt)?.getTime()||0)-(parseDate(a.record.startedAt)?.getTime()||0);
    const sortBumped=(a,b)=>(parseDate(b.record.bumpedAt)?.getTime()||0)-(parseDate(a.record.bumpedAt)?.getTime()||0);
    const vip=entries.filter(x=>x.record.kind==='vip'&&recordActiveTimed(x.record,ts)).sort(sortStarted);
    if(vip.length)return {tier:'vip',listingIds:vip.map(x=>x.listingId)};
    const top=entries.filter(x=>x.record.kind==='top'&&recordActiveTimed(x.record,ts)).sort(sortStarted);
    if(top.length)return {tier:'top',listingIds:top.map(x=>x.listingId)};
    const bumped=entries.filter(x=>x.record.kind==='bump'&&!!parseDate(x.record.bumpedAt)).sort(sortBumped);
    if(bumped.length)return {tier:'bump',listingIds:bumped.map(x=>x.listingId)};
    return {tier:null,listingIds:[]};
  }

  function getRankingState(listingId,now){
    const state=getListingPromotionState(listingId,now);
    if(state.active&&state.kind==='vip')return {tier:'vip',priority:2,startedAt:state.startedAt||null,bumpedAt:null};
    if(state.active&&state.kind==='top')return {tier:'top',priority:1,startedAt:state.startedAt||null,bumpedAt:null};
    if(state.kind==='bump')return {tier:'bump',priority:0,startedAt:null,bumpedAt:state.bumpedAt||null};
    return {tier:null,priority:0,startedAt:null,bumpedAt:null};
  }

  function applyPromotion(listingId,productId){
    const c=getConfig(),p=c.products[productId];if(!p||!p.enabled)throw new Error('Невалиден тип промоция.');
    const id=String(listingId||'').trim()||('listing-'+Date.now()),allowed=canApplyPromotion(id,productId);
    if(!allowed.ok)throw new Error(allowed.message);
    const all=getListingPromotions(),now=Date.now(),record={};
    if(p.kind==='bump'){
      record.kind='bump';record.productId=productId;record.startedAt=new Date(now).toISOString();record.bumpedAt=record.startedAt;record.expiresAt=null;
    }else if(p.kind==='top'||p.kind==='vip'){
      const until=now+Number(p.durationDays||0)*86400000;
      record.kind=p.kind;record.productId=productId;record.startedAt=new Date(now).toISOString();record.expiresAt=p.durationDays?new Date(until).toISOString():null;record.bumpedAt=null;
    }else throw new Error('Невалиден тип промоция.');
    all[id]=record;write(LISTING_PROMOS_KEY,all);
    window.dispatchEvent(new CustomEvent('market:listing-promotion-changed',{detail:{listingId:id,record}}));
    return record;
  }

  function useCredit(productId,listingId,userId){
    const user=userId||getCurrentUser().id,w=getWallet(user);
    if(Number(w[productId]||0)<1)throw new Error('Нямаш налична активация за тази услуга.');
    const allowed=canApplyPromotion(listingId,productId);
    if(!allowed.ok)throw new Error(allowed.message);
    const previous=Number(w[productId]||0);
    w[productId]=previous-1;setWallet(user,w);
    try{
      const record=applyPromotion(listingId,productId);
      historyPush({userId:user,productId,qty:-1,reason:'Използвано за обява '+String(listingId||''),source:'use',balanceAfter:w[productId]});
      return record;
    }catch(err){
      w[productId]=previous;setWallet(user,w);throw err;
    }
  }
  function walletSummary(userId){
    const c=getConfig(),w=getWallet(userId);return Object.values(c.products).filter(p=>p.enabled&&Number(w[p.id]||0)>0).map(p=>({id:p.id,name:p.name,count:Number(w[p.id]||0)}));
  }

  window.MarketMonetization={DEFAULTS:clone(DEFAULTS),getConfig,saveConfig,setPlatform,getPlatform,paidAvailable,checkoutAllowed,getCurrentUser,setCurrentUser,getWallet,setWallet,adjustWallet,getHistory,getPurchases,promoActive,priceFor,money,findItem,completePurchase,useCredit,applyPromotion,getListingPromotions,getActivePromotion,getListingPromotionState,canApplyPromotion,getFeaturedPromotionSelection,getRankingState,validatePaidSetup,getBonusCampaign,getBonusGrant,getBonusSummary,grantEarlyBetaBonus,useBonus,bonusPromotionsAvailable,promotionPlacementEnabled,promotionAccessAvailable,walletSummary};
})();