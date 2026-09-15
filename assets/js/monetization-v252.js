(()=>{'use strict';
  const DEFAULTS={
    version:'2.52',
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

let user={id:'',name:'',type:'private'};
const unavailable=()=>{throw new Error('Действието изисква потвърждение от сървъра.')};
window.MarketMonetization={getCurrentUser:()=>({...user}),setCurrentUser:value=>{user={id:'',name:'',type:'private',...value}},getConfig:()=>structuredClone(DEFAULTS),getPlatform:()=>({...window.SITE_CONFIG,freeBeta:window.SITE_CONFIG?.freeBeta!==false}),getBonusCampaign:()=>({...DEFAULTS.bonusCampaign}),paidAvailable:()=>false,checkoutAllowed:()=>false,completePurchase:unavailable,useCredit:unavailable,useBonus:unavailable,adjustWallet:unavailable};
})();
