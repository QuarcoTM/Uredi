/* Uredi v2.72 — category-specific listing characteristics.
   The characteristics section is generated from the selected category so users
   never see washing-machine questions for hobs, ovens, fridges, etc. */
(() => {
  'use strict';

  const q=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const energyNew=['A','B','C','D','E','F','G','Не е обозначен'];
  const energyLegacy=['A+++','A++','A+','A','B','C','D','Не е обозначен'];

  const configs={
    'Перални':[
      {key:'capacity',label:'Капацитет',options:['5 kg','6 kg','7 kg','8 kg','9 kg','10 kg','11 kg','12+ kg']},
      {key:'spin',label:'Обороти',options:['800 rpm','1000 rpm','1200 rpm','1400 rpm','1600 rpm']},
      {key:'energy',label:'Енергиен клас',options:energyNew},
      {key:'type',label:'Тип',options:['Стандартна','Slim','Горно зареждане','За вграждане']}
    ],
    'Сушилни':[
      {key:'capacity',label:'Капацитет',options:['6 kg','7 kg','8 kg','9 kg','10 kg','11 kg','12+ kg']},
      {key:'technology',label:'Технология',options:['С термопомпа','Кондензационна','Вентилационна']},
      {key:'energy',label:'Енергиен клас',options:energyLegacy},
      {key:'type',label:'Монтаж',options:['Свободностояща','За вграждане']}
    ],
    'Перални със сушилни':[
      {key:'wash_capacity',label:'Капацитет пране',options:['6 kg','7 kg','8 kg','9 kg','10 kg','11 kg','12+ kg']},
      {key:'dry_capacity',label:'Капацитет сушене',options:['4 kg','5 kg','6 kg','7 kg','8 kg','9 kg','10+ kg']},
      {key:'spin',label:'Обороти',options:['1000 rpm','1200 rpm','1400 rpm','1600 rpm']},
      {key:'energy',label:'Енергиен клас',options:energyNew}
    ],
    'Хладилници':[
      {key:'type',label:'Тип',options:['Хладилник с фризер','Само хладилник','Side-by-Side','French Door','За вграждане']},
      {key:'volume',label:'Общ обем',type:'number',min:20,max:1000,step:1,suffix:'л',placeholder:'Напр. 350'},
      {key:'no_frost',label:'No Frost',options:['Да','Не','Частичен No Frost']},
      {key:'energy',label:'Енергиен клас',options:energyNew}
    ],
    'Фризери':[
      {key:'type',label:'Тип',options:['Вертикален','Ракла','За вграждане']},
      {key:'volume',label:'Обем',type:'number',min:20,max:1000,step:1,suffix:'л',placeholder:'Напр. 250'},
      {key:'no_frost',label:'No Frost',options:['Да','Не']},
      {key:'energy',label:'Енергиен клас',options:energyNew}
    ],
    'Съдомиялни':[
      {key:'width',label:'Ширина',options:['45 cm','60 cm']},
      {key:'capacity',label:'Капацитет',options:['6 комплекта','8 комплекта','9 комплекта','10 комплекта','12 комплекта','13 комплекта','14 комплекта','15 комплекта','16+ комплекта']},
      {key:'type',label:'Монтаж',options:['Свободностояща','За вграждане','Частично вграждане']},
      {key:'energy',label:'Енергиен клас',options:energyNew}
    ],
    'Фурни':[
      {key:'fuel',label:'Тип',options:['Електрическа','Газова','Комбинирана']},
      {key:'installation',label:'Монтаж',options:['За вграждане','Свободностояща']},
      {key:'volume',label:'Обем',type:'number',min:20,max:150,step:1,suffix:'л',placeholder:'Напр. 72'},
      {key:'convection',label:'Вентилатор / конвекция',options:['Да','Не']}
    ],
    'Готварски печки':[
      {key:'fuel',label:'Тип',options:['Електрическа','Газова','Комбинирана']},
      {key:'hob',label:'Котлони',options:['Индукционни','Стъклокерамични','Газови','Чугунени плочи','Комбинирани']},
      {key:'width',label:'Ширина',options:['50 cm','55 cm','60 cm','90 cm']},
      {key:'energy',label:'Енергиен клас',options:energyNew}
    ],
    'Котлони':[
      {key:'hob_type',label:'Тип котлони',options:['Индукционни','Стъклокерамични','Газови','Електрически плочи','Комбинирани']},
      {key:'zones',label:'Брой зони',options:['1','2','3','4','5','6+']},
      {key:'width',label:'Ширина',options:['30 cm','45 cm','60 cm','70 cm','75 cm','80 cm','90 cm']},
      {key:'installation',label:'Монтаж',options:['За вграждане','Настолни / преносими']}
    ],
    'Аспиратори':[
      {key:'type',label:'Тип',options:['Стенен / коминен','Телескопичен','За вграждане','Островен','Под шкаф']},
      {key:'width',label:'Ширина',options:['50 cm','60 cm','70 cm','80 cm','90 cm','120 cm']},
      {key:'capacity',label:'Максимален дебит',type:'number',min:50,max:2000,step:1,suffix:'m³/h',placeholder:'Напр. 650'},
      {key:'energy',label:'Енергиен клас',options:energyLegacy}
    ],
    'Микровълнови':[
      {key:'type',label:'Монтаж',options:['Свободностояща','За вграждане']},
      {key:'volume',label:'Обем',type:'number',min:10,max:100,step:1,suffix:'л',placeholder:'Напр. 25'},
      {key:'power',label:'Мощност',type:'number',min:300,max:2500,step:10,suffix:'W',placeholder:'Напр. 900'},
      {key:'grill',label:'Грил',options:['Да','Не']}
    ],
    'Климатици':[
      {key:'type',label:'Тип',options:['Сплит система','Мултисплит','Мобилен','Прозоречен']},
      {key:'capacity',label:'Мощност',options:['7000 BTU','9000 BTU','12000 BTU','14000 BTU','18000 BTU','24000 BTU','30000 BTU','36000+ BTU']},
      {key:'inverter',label:'Инверторен',options:['Да','Не']},
      {key:'energy',label:'Енергиен клас',options:energyLegacy}
    ],
    'Бойлери':[
      {key:'volume',label:'Обем',options:['30 л','50 л','60 л','80 л','100 л','120 л','150 л','200+ л']},
      {key:'installation',label:'Монтаж',options:['Вертикален','Хоризонтален','Универсален']},
      {key:'type',label:'Тип',options:['Електрически','Термодинамичен','Комбиниран']},
      {key:'power',label:'Мощност',options:['1.5 kW','2 kW','2.5 kW','3 kW','4.5 kW','6+ kW']}
    ],
    'Друга бяла техника':[
      {key:'appliance_type',label:'Вид уред',type:'text',minlength:2,maxlength:60,placeholder:'Напр. ледогенератор'},
      {key:'main_feature',label:'Основна характеристика',type:'text',minlength:2,maxlength:120,placeholder:'Напр. 20 kg лед за 24 часа'}
    ]
  };

  function fieldHtml(def,index){
    const id=`category-spec-${index+1}`;
    const attrs=`data-category-spec="${esc(def.key)}" data-smart-required aria-required="true" required`;
    if(def.type==='number'){
      return `<div class="field category-spec-field"><label class="required-label" for="${id}">${esc(def.label)}</label><div class="spec-input-with-unit"><input id="${id}" type="number" inputmode="decimal" ${attrs} min="${def.min}" max="${def.max}" step="${def.step||1}" data-spec-suffix="${esc(def.suffix||'')}" placeholder="${esc(def.placeholder||'')}"><span>${esc(def.suffix||'')}</span></div></div>`;
    }
    if(def.type==='text'){
      return `<div class="field category-spec-field"><label class="required-label" for="${id}">${esc(def.label)}</label><input id="${id}" type="text" ${attrs} minlength="${def.minlength||1}" maxlength="${def.maxlength}" data-char-counter data-max-chars="${def.maxlength}" placeholder="${esc(def.placeholder||'')}"></div>`;
    }
    return `<div class="field category-spec-field"><label class="required-label" for="${id}">${esc(def.label)}</label><select id="${id}" ${attrs}><option value="" selected disabled>Избери ${esc(def.label.toLowerCase())}</option>${(def.options||[]).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select></div>`;
  }

  function render(){
    const select=q('[data-ad-category]');
    const host=q('[data-category-fields]');
    if(!select||!host)return;
    const category=select.value||'';
    const defs=configs[category]||[];
    host.dataset.category=category;
    if(!category){
      host.innerHTML='<div class="category-spec-empty"><strong>Първо избери категория.</strong><span>След това ще покажем само характеристиките, които са подходящи за този тип уред.</span></div>';
      return;
    }
    host.innerHTML=defs.map(fieldHtml).join('');
    try{window.UrediFormUX?.refreshCounters?.()}catch{}
  }

  function init(){
    window.UrediCategoryFields={render,configs};
    const bind=()=>{
      const select=q('[data-ad-category]');
      const host=q('[data-category-fields]');
      if(!select||!host)return;
      let newlyBound=false;
      if(select.dataset.categoryFieldsBoundV277!=='1'){
        select.dataset.categoryFieldsBoundV277='1';
        select.addEventListener('change',render,true);
        newlyBound=true;
      }
      const category=select.value||'';
      if(newlyBound||host.dataset.category!==category||!host.children.length)render();
    };
    bind();
    window.addEventListener('pageshow',bind);
    const observer=new MutationObserver(()=>bind());
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
