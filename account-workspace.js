/* Read-only presentation controls for existing access cards. No credentials are persisted. */
(function (root) {
  'use strict';
  const DAY=86400000,validViews=['all','active','recommended','soon','expired','pending'],validSorts=['recent','recommended','expiry','product'];
  const stateApi=typeof module==='object'&&module.exports?require('./account-state.js'):root.IAPAccountState;
  const clean=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const productDefault=it=>({k:clean(it.producto),n:String(it.producto||'Otros accesos')});
  function describe(items,now=Date.now(),productOf=productDefault){return (Array.isArray(items)?items:[]).map((it,index)=>{
    const p=productOf(it)||productDefault(it),active=stateApi.isActive(it,now),expired=stateApi.isExpired(it,now),end=Date.parse(it.fin);
    return {index,key:String(p.k||clean(p.n)),title:String(p.n||it.producto||'Otros accesos'),active,expired,retired:!!it.retirada,recommended:active&&!!it.recomendada&&!it.retirada,soon:active&&Number.isFinite(end)&&end-now<=5*DAY,end:Number.isFinite(end)?end:Infinity,created:Number(it.ordenCuenta)||0,search:clean((it.producto||'')+' '+(p.n||'')+' '+(it.correo||''))};
  });}
  function summary(items,now=Date.now(),productOf=productDefault){const rows=describe(items,now,productOf),active=rows.filter(x=>x.active),ends=active.map(x=>x.end).filter(Number.isFinite);return {total:rows.length,active:active.length,products:new Set(active.map(x=>x.key)).size,recommended:rows.filter(x=>x.recommended).length,soon:rows.filter(x=>x.soon).length,expired:rows.filter(x=>x.expired).length,nextExpiry:ends.length?Math.min(...ends):null};}
  function select(items,options={},now=Date.now(),productOf=productDefault){
    const view=validViews.includes(options.view)?options.view:'all',sort=validSorts.includes(options.sort)?options.sort:'recent',q=clean(options.query),product=String(options.product||'');
    const rows=describe(items,now,productOf).filter(x=>(!q||x.search.includes(q))&&(!product||x.key===product)&&(view==='all'||view==='active'&&x.active||view==='recommended'&&x.recommended||view==='soon'&&x.soon||view==='expired'&&x.expired||view==='pending'&&!x.active&&!x.expired));
    return rows.sort((a,b)=>Number(a.retired)-Number(b.retired)||(sort==='recommended'?Number(b.recommended)-Number(a.recommended)||Number(b.active)-Number(a.active):sort==='expiry'?Number(b.active)-Number(a.active)||(a.end===b.end?0:a.end-b.end):sort==='product'?a.title.localeCompare(b.title,'es'):0)||b.created-a.created||a.index-b.index).map(x=>x.index);
  }
  let current=null,preferences={view:'all',product:'',sort:'recent',query:''};
  function mount(host,{items,grid,productOf=productDefault,query='',onQuery=()=>{},onHide=()=>{}}){
    current=null;if(!host||!grid)return;
    preferences={...preferences,query:String(query)};
    const all=describe(items,Date.now(),productOf),products=[...new Map(all.map(x=>[x.key,x.title])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'es'));
    if(!products.some(([key])=>key===preferences.product))preferences.product='';
    const totals=summary(items,Date.now(),productOf),expiry=Number.isFinite(totals.nextExpiry)?new Date(totals.nextExpiry).toLocaleDateString('es-CO',{timeZone:'America/Bogota',day:'numeric',month:'short',year:'numeric'}):totals.active?'Fecha no disponible':'Sin accesos vigentes';
    host.innerHTML=`<section class="aw-summary" aria-label="Resumen de tus accesos"><div><span>Accesos vigentes</span><strong>${totals.active}</strong><small>Credenciales disponibles en tu cuenta</small></div><div><span>Productos con acceso</span><strong>${totals.products}</strong><small>Servicios incluidos en tus accesos</small></div><div><span>Recomendados por IA Plus</span><strong>${totals.recommended}</strong><small>Vigentes y disponibles en inventario</small></div><div class="aw-expiry"><span>Próximo vencimiento</span><strong>${escape(expiry)}</strong><small>Filtra «Vencen en 5 días» para revisarlos</small></div></section>
      <section class="aw-tools" aria-label="Organizar mis accesos"><div class="aw-heading"><div><h2>Encuentra tu acceso</h2><p>Elige una recomendada o revisa lo que está por vencer.</p></div><button class="aw-reset" type="button">Limpiar filtros</button></div>
      <div class="aw-controls"><label class="aw-search-label"><span>Buscar cuenta o producto</span><input class="aw-search" type="search" placeholder="ChatGPT, Canva o correo de acceso…" autocomplete="off"></label><label><span>Producto</span><select class="aw-product"><option value="">Todos los productos</option>${products.map(([key,title])=>`<option value="${escape(key)}">${escape(title)}</option>`).join('')}</select></label><label><span>Ordenar por</span><select class="aw-sort"><option value="recent">Más recientes primero</option><option value="recommended">Recomendadas primero</option><option value="expiry">Próximo vencimiento</option><option value="product">Nombre del producto</option></select></label></div>
      <div class="aw-filters" role="group" aria-label="Estado de los accesos">${[['all','Todos',totals.total],['active','Vigentes',totals.active],['recommended','★ Recomendados',totals.recommended],['soon','Vencen en 5 días',totals.soon],['expired','Vencidos',totals.expired]].map(([key,title,count])=>`<button type="button" data-aw-view="${key}" aria-pressed="false">${title}<span>${count}</span></button>`).join('')}</div><p class="aw-results" role="status" aria-live="polite" aria-atomic="true"></p></section>`;
    const $=s=>host.querySelector(s),cards=new Map([...grid.querySelectorAll('[data-account-index]')].map(el=>[Number(el.dataset.accountIndex),el]));
    function syncControls(){$('.aw-search').value=preferences.query;$('.aw-product').value=preferences.product;$('.aw-sort').value=preferences.sort;host.querySelectorAll('[data-aw-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.awView===preferences.view)));}
    function apply(){const indices=select(items,preferences,Date.now(),productOf),shown=new Set(indices);
      for(const [index,card]of cards){const visible=shown.has(index);if(!visible&&!card.hidden)onHide(card);card.hidden=!visible;card.style.display=visible?'':'none';}
      // Move existing nodes: open panels, timers, event handlers and copied values survive sorting.
      for(const index of indices){const card=cards.get(index);if(card)grid.append(card);}
      const empty=grid.querySelector('#nores');if(empty){empty.hidden=indices.length>0;empty.textContent='No hay accesos con esos filtros. Puedes cambiar el producto o limpiar la búsqueda.';grid.append(empty);}
      $('.aw-results').textContent=`${indices.length} de ${items.length} ${items.length===1?'acceso':'accesos'} visibles`+(preferences.view==='soon'?' · Vencen durante los próximos 5 días.':'.');
      $('.aw-reset').disabled=preferences.view==='all'&&!preferences.product&&!preferences.query&&preferences.sort==='recent';syncControls();return indices;
    }
    function reset(){preferences={view:'all',product:'',sort:'recent',query:''};onQuery('');apply();}
    $('.aw-search').oninput=e=>{preferences.query=e.target.value;onQuery(preferences.query);apply();};
    $('.aw-product').onchange=e=>{preferences.product=e.target.value;apply();};$('.aw-sort').onchange=e=>{preferences.sort=e.target.value;apply();};$('.aw-reset').onclick=reset;
    host.querySelectorAll('[data-aw-view]').forEach(b=>b.onclick=()=>{preferences.view=b.dataset.awView;apply();});
    current={host,apply,reset,setQuery(value){preferences.query=String(value||'');apply();},reveal(){reset();}};apply();
  }
  const api={describe,summary,select,mount,setQuery(value){current?.setQuery(value);},reset(){current?.reset();},reveal(){current?.reveal();},unmount(){current=null;},isMounted(){return !!current?.host?.isConnected;}};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.IAPAccountWorkspace=api;
})(typeof window==='object'?window:globalThis);
