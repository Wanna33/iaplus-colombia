/* Catalog discovery. Only product IDs are persisted; prices always come from the catalog. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./catalog-utils.js'));
  else root.IAPDiscovery=factory(root.IAPCatalog);
})(typeof window==='undefined'?globalThis:window,function(C){
  'use strict';
  const KEY='iap_favorite_products_v1';
  const positive=value=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):0;
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validIds(value,products){
    const known=new Set(products.map(p=>p.id));
    return Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&known.has(id)))]:[];
  }
  function matches(plan,state,favorites){
    return (!state.duration||C.days(plan)===state.duration)
      &&(!state.budget||Number(plan.price)<=state.budget)
      &&(!state.favoritesOnly||favorites.has(plan.id));
  }
  function createModel({getProducts,storage}){
    let favorites=new Set();
    const state={duration:0,budget:0,favoritesOnly:false};
    const getStorage=()=>typeof storage==='function'?storage():storage;
    function read(raw){
      try{favorites=new Set(validIds(JSON.parse(raw===undefined?getStorage()?.getItem(KEY)||'[]':raw||'[]'),getProducts()));}
      catch{favorites=new Set();}
    }
    function persist(){try{const target=getStorage();if(!target)return false;target.setItem(KEY,JSON.stringify([...favorites]));return true;}catch{return false;}}
    function reconcile(){
      const next=validIds([...favorites],getProducts());
      if(next.length!==favorites.size){favorites=new Set(next);persist();}
    }
    function configure(values){
      if('duration' in values)state.duration=positive(values.duration);
      if('budget' in values)state.budget=positive(values.budget);
      if('favoritesOnly' in values)state.favoritesOnly=!!values.favoritesOnly;
    }
    function toggle(id){
      if(!getProducts().some(p=>p.id===id))return {changed:false};
      if(favorites.has(id))favorites.delete(id);else favorites.add(id);
      return {changed:true,selected:favorites.has(id),saved:persist()};
    }
    function options(){
      const list=getProducts();
      return {
        durations:[...new Set([...list.map(C.days),state.duration].filter(positive))].sort((a,b)=>a-b),
        budgets:[...new Set([...list.map(p=>positive(p.price)),state.budget].filter(positive))].sort((a,b)=>a-b)
      };
    }
    read();
    return {state,configure,toggle,reconcile,options,read,
      reset:()=>configure({duration:0,budget:0,favoritesOnly:false}),
      has:id=>favorites.has(id),count:()=>favorites.size,
      active:()=>!!(state.duration||state.budget||state.favoritesOnly),
      filter:list=>list.filter(p=>matches(p,state,favorites))};
  }
  function mount({getProducts,onChange,onReset,notify,document:doc=document,window:win=window}){
    const controls=doc.getElementById('catalogDiscovery');
    if(!controls)return null;
    const model=createModel({getProducts,storage:()=>win.localStorage});
    const duration=doc.getElementById('discoveryDuration'),budget=doc.getElementById('discoveryBudget');
    const only=doc.getElementById('discoveryFavorites'),clear=doc.getElementById('discoveryClear');
    const more=doc.getElementById('discoveryMore'),activeCount=doc.getElementById('discoveryActiveCount');
    const summary=more?.querySelector('summary');
    // Respect controls restored by the browser as well as saved product choices.
    model.configure({duration:duration.value,budget:budget.value,favoritesOnly:only.getAttribute?.('aria-pressed')==='true'});
    let durationKey='',budgetKey='',disclosureInitialized=false;
    const bookmark='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/></svg>';
    const label=id=>getProducts().find(p=>p.id===id)?.name||'este plan';
    function cardAction(plan){
      const selected=model.has(plan.id);
      return `<button type="button" class="plan-save" data-favorite="${escape(plan.id)}" aria-pressed="${selected}" aria-label="${selected?'Quitar de':'Guardar en'} favoritos: ${escape(plan.name)}" title="${selected?'Quitar de favoritos':'Guardar en favoritos'}">${bookmark}</button>`;
    }
    function sync({query='',category='Todos',sort=''}={}){
      model.reconcile();
      const options=model.options(),dk=options.durations.join(','),bk=options.budgets.join(',');
      if(dk!==durationKey){durationKey=dk;duration.innerHTML='<option value="">Cualquier duración</option>'+options.durations.map(days=>`<option value="${days}">${C.duration({days})}</option>`).join('');}
      if(bk!==budgetKey){budgetKey=bk;budget.innerHTML='<option value="">Cualquier precio</option>'+options.budgets.map(price=>`<option value="${price}">Hasta ${C.money(price)} COP</option>`).join('');}
      duration.value=String(model.state.duration||'');budget.value=String(model.state.budget||'');
      only.setAttribute('aria-pressed',String(model.state.favoritesOnly));
      only.querySelector('[data-favorite-count]').textContent=String(model.count());
      // Search already has its own clear control; this resets combined filters.
      clear.hidden=!(model.active()||category!=='Todos'||sort);
      controls.hidden=false;
      const active=Number(!!model.state.duration)+Number(!!model.state.budget)+Number(model.state.favoritesOnly);
      if(activeCount){activeCount.textContent=`${active} ${active===1?'activo':'activos'}`;activeCount.hidden=!active;}
      if(more){
        // Set the initial layout once; native details then keeps the user's choice.
        if(!disclosureInitialized){more.open=!win.matchMedia?.('(max-width: 600px)').matches||model.active()||model.count()>0;disclosureInitialized=true;}
        more.hidden=false;
      }
    }
    function reset(){model.reset();onReset();}
    function focusFilter(target=duration){(more&&!more.open?summary:target)?.focus({preventScroll:true});}
    function updateFavoriteButton(button,id){
      const selected=model.has(id);
      button.setAttribute('aria-pressed',String(selected));
      button.setAttribute('aria-label',`${selected?'Quitar de':'Guardar en'} favoritos: ${label(id)}`);
      button.setAttribute('title',selected?'Quitar de favoritos':'Guardar en favoritos');
    }
    function empty(query){
      const saved=model.state.favoritesOnly;
      const title=saved&&!model.count()?'Tu selección empieza aquí':'No hay planes con estos filtros';
      const detail=saved&&!model.count()?'Guarda los planes que te interesen con el marcador de cada tarjeta. Podrás encontrarlos aquí.':query?`Prueba otra búsqueda o amplía los filtros para encontrar «${query}».`:'Prueba otra duración, un presupuesto mayor o revisa todas las categorías.';
      return `<div class="nores discovery-empty"><span class="discovery-empty-icon" aria-hidden="true">${bookmark}</span><h3>${escape(title)}</h3><p>${escape(detail)}</p><button type="button" class="btn btn-ghost" data-reset-discovery>Ver todo el catálogo</button></div>`;
    }
    duration.addEventListener('change',()=>{model.configure({duration:duration.value});onChange();});
    budget.addEventListener('change',()=>{model.configure({budget:budget.value});onChange();});
    only.addEventListener('click',()=>{model.configure({favoritesOnly:!model.state.favoritesOnly});onChange();});
    clear.addEventListener('click',()=>{reset();focusFilter();});
    doc.addEventListener('click',event=>{
      const saved=event.target.closest?.('[data-favorite]');
      if(saved){
        const id=saved.dataset.favorite,result=model.toggle(id);if(!result.changed)return;
        // Keep the page still when saving a plan. Only redraw if the visible list changes.
        if(model.state.favoritesOnly)onChange();
        else{updateFavoriteButton(saved,id);only.querySelector('[data-favorite-count]').textContent=String(model.count());}
        const current=[...doc.querySelectorAll('[data-favorite]')].find(b=>b.dataset.favorite===id);
        if(current)current.focus({preventScroll:true});else focusFilter(only);
        if(current){current.classList.remove('just-saved');if(result.selected)current.classList.add('just-saved');}
        notify?.(`${label(id)} ${result.selected?'guardado en favoritos':'quitado de favoritos'}.${result.saved?'':' El cambio solo se conserva mientras esta página esté abierta.'}`);
        return;
      }
      if(event.target.closest?.('[data-reset-discovery]')){reset();focusFilter();}
    });
    win.addEventListener('storage',event=>{
      if(event.key!==KEY&&event.key!==null)return;
      model.read(event.key===null?'[]':event.newValue);
      if(model.state.favoritesOnly)onChange();
      else{only.querySelector('[data-favorite-count]').textContent=String(model.count());doc.querySelectorAll('[data-favorite]').forEach(button=>updateFavoriteButton(button,button.dataset.favorite));}
    });
    sync();
    return {filter:list=>model.filter(list),sync,cardAction,empty,reset,clearExtras:()=>model.reset(),favoriteView:()=>model.state.favoritesOnly};
  }
  return {KEY,validIds,matches,createModel,mount};
});
