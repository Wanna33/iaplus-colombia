const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const C=require('../catalog-utils.js');
const D=require('../store-discovery.js');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'app-20261022.js'),'utf8');
let products=vm.runInNewContext('('+source.match(/const PRODUCTS = (\[[\s\S]*?\n\]);/)[1]+')');
const original=JSON.stringify(products);
const writes=[];
let saved=JSON.stringify(['chatgpt','chatgpt','missing',{email:'not-a-product'}]);
const storage={getItem:key=>(assert.equal(key,D.KEY),saved),setItem:(key,value)=>{assert.equal(key,D.KEY);saved=value;writes.push(JSON.parse(value));}};
const model=D.createModel({getProducts:()=>products,storage});
assert.deepEqual(D.validIds(null,products),[]);
assert.equal(model.count(),1,'Malformed and unavailable IDs never become favorites');
assert.equal(model.has('chatgpt'),true);
assert.equal(model.toggle('missing').changed,false);
assert.equal(writes.length,0,'Unknown products cannot be persisted');
assert.equal(model.toggle('chatgpt3').selected,true);
assert.deepEqual(JSON.parse(saved),['chatgpt','chatgpt3']);
assert.equal(D.createModel({getProducts:()=>products,storage}).has('chatgpt3'),true,'Favorites survive a reload');
model.configure({favoritesOnly:true,duration:'90',budget:'20000'});
assert.deepEqual(Array.from(model.filter(products),p=>p.id),['chatgpt3']);
model.configure({budget:10000});assert.equal(model.filter(products).length,0);
model.reset();assert.equal(model.active(),false);assert.equal(model.count(),2,'Clearing filters keeps saved choices');
assert.equal(model.filter(products).length,products.length);
assert(model.options().durations.includes(365));
assert(model.options().budgets.includes(products.find(p=>p.id==='capcut').price));
assert.equal(JSON.stringify(products),original,'Discovery cannot modify catalog prices, duration or modality');

// Existing choices remain meaningful when the owner changes a price or duration.
const live=products.find(p=>p.id==='chatgpt3');
model.configure({duration:90,budget:20000,favoritesOnly:true});
live.price=25000;assert.equal(model.filter(products).length,0,'Budget uses the latest total price');
live.price=20000;live.days=45;
assert.equal(model.filter(products).length,0,'Duration uses the latest catalog value');
assert(model.options().durations.includes(45));
model.configure({duration:45});assert.equal(model.filter(products).length,1);
products=products.filter(p=>p.id!=='chatgpt3');model.reconcile();
assert.equal(model.count(),1);assert.deepEqual(JSON.parse(saved),['chatgpt'],'Retired products are removed from saved IDs');
model.read('["capcut", "capcut6"]');assert.equal(model.count(),2);assert.equal(model.has('chatgpt'),false);
model.read('{broken');assert.equal(model.count(),0);
model.read('null');assert.equal(model.count(),0);
const blocked=D.createModel({getProducts:()=>products,storage:()=>{throw Error('Storage disabled');}});
assert.equal(blocked.toggle('chatgpt').saved,false);assert.equal(blocked.has('chatgpt'),true,'Blocked storage still allows this session');
blocked.configure({duration:Infinity,budget:'invalid'});assert.equal(blocked.active(),false);

// Run the actual storefront rendering function with the discovery model in front of it.
products=vm.runInNewContext('('+source.match(/const PRODUCTS = (\[[\s\S]*?\n\]);/)[1]+')');
const renderedModel=D.createModel({getProducts:()=>products,storage:{getItem:()=>JSON.stringify(['chatgpt3','capcut3'])}});
renderedModel.configure({duration:90,budget:30000,favoritesOnly:true});
const elements={'#search':{value:'chatgpt'},'#sort':{value:'asc'},'#count':{},'#grid':{innerHTML:''}};
let syncArgs,eventCount=0;
const context=vm.createContext({PRODUCTS:products,IAPCatalog:C,filter:'IA',gridFirst:true,
  $:selector=>elements[selector]||null,esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;'),cop:C.money,iconOf:()=>'',observeReveal:()=>{},
  CONFIG:{WHATSAPP:'573102035327'},CustomEvent:function(type){this.type=type;},
  window:{dispatchEvent:event=>{assert.equal(event.type,'iap:catalog-updated');eventCount++;}},
  discovery:{sync:args=>{syncArgs=args;renderedModel.reconcile();},filter:list=>renderedModel.filter(list),cardAction:p=>`<button data-favorite="${p.id}"></button>`,empty:()=>'<div>EMPTY</div>',favoriteView:()=>renderedModel.state.favoritesOnly}
});
vm.runInContext(source.slice(source.indexOf('function renderGrid(){'),source.indexOf('function observeReveal(){'))+'\nrenderGrid();',context);
assert.equal(syncArgs.category,'IA');assert.equal(syncArgs.query,'chatgpt');
assert.equal(elements['#count'].textContent,'1 plan de 17 · IA · favoritos');
assert(elements['#grid'].innerHTML.includes('data-product="chatgpt3"'));
assert(!elements['#grid'].innerHTML.includes('data-product="capcut3"'));
assert(elements['#grid'].innerHTML.includes('https://wa.me/573102035327?text='),'Existing purchase link is kept');
assert(elements['#grid'].innerHTML.includes(C.money(products.find(p=>p.id==='chatgpt3').price)));
elements['#search'].value='no-such-product';vm.runInContext('renderGrid()',context);assert.equal(elements['#grid'].innerHTML,'<div>EMPTY</div>');
assert.equal(eventCount,2,'Existing comparison and price listeners still receive each render');
renderedModel.reset();elements['#search'].value='';context.filter='Todos';vm.runInContext('renderGrid()',context);
assert.equal((elements['#grid'].innerHTML.match(/data-product=/g)||[]).length,17);

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.indexOf('src="catalog-utils.js"')<html.indexOf('src="store-discovery.js?'));
assert(html.indexOf('src="store-discovery.js?')<html.indexOf('src="app-20261022.js?'),'Discovery must be ready before the initial render');
for(const id of ['catalogDiscovery','discoveryDuration','discoveryBudget','discoveryFavorites','discoveryClear','discoveryMore','discoveryActiveCount'])assert(html.includes(`id="${id}"`));
assert.match(html,/<details id="discoveryMore"[^>]*>[\s\S]*?<summary[^>]*>[\s\S]*?Más filtros[\s\S]*?<\/summary>[\s\S]*?id="catalogDiscovery"[\s\S]*?<\/details>/,'Secondary filters retain a native keyboard-operable disclosure');

// Exercise the actual controller's events: saving must not redraw every card or lose focus.
const node=id=>({id,hidden:true,value:'',dataset:{},attributes:{},listeners:{},classList:{add(){},remove(){}},
  addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(key,value){this.attributes[key]=value;},
  focus(){this.focused=true;},closest(selector){return selector==='[data-favorite]'&&this.dataset.favorite?this:null;},
  querySelector(){return this.counter||(this.counter={textContent:''});}});
const nodes=Object.fromEntries(['catalogDiscovery','discoveryDuration','discoveryBudget','discoveryFavorites','discoveryClear'].map(id=>[id,node(id)]));
const favorite=node('favorite');favorite.dataset.favorite='chatgpt';let buttons=[favorite],redraws=0,resets=0,ui;
const events={},browserEvents={},notifications=[];let browserSaved='[]';
const doc={getElementById:id=>nodes[id],querySelectorAll:()=>buttons,addEventListener:(type,fn)=>events[type]=fn};
const win={localStorage:{getItem:()=>browserSaved,setItem:(key,value)=>{assert.equal(key,D.KEY);browserSaved=value;}},addEventListener:(type,fn)=>browserEvents[type]=fn};
ui=D.mount({getProducts:()=>products,document:doc,window:win,notify:text=>notifications.push(text),
  onChange:()=>{redraws++;if(ui?.favoriteView())buttons=ui.filter(products).some(p=>p.id==='chatgpt')?[favorite]:[];ui?.sync();},onReset:()=>{resets++;ui.sync();}});
events.click({target:favorite});
assert.equal(redraws,0);assert.equal(favorite.attributes['aria-pressed'],'true');assert.equal(favorite.focused,true);
assert.equal(nodes.discoveryFavorites.counter.textContent,'1');assert.deepEqual(JSON.parse(browserSaved),['chatgpt']);
nodes.discoveryFavorites.listeners.click();assert.equal(redraws,1);assert.equal(ui.favoriteView(),true);
events.click({target:favorite});assert.equal(redraws,2);assert.equal(nodes.discoveryFavorites.focused,true,'Removing the last visible favorite returns focus to the filter');
assert.equal(ui.filter(products).length,0);assert(ui.empty('').includes('Tu selección empieza aquí'));
nodes.discoveryClear.listeners.click();assert.equal(resets,1);assert.equal(ui.favoriteView(),false);
buttons=[favorite];browserEvents.storage({key:D.KEY,newValue:'["chatgpt"]'});
assert.equal(favorite.attributes['aria-pressed'],'true');assert.equal(nodes.discoveryFavorites.counter.textContent,'1');
assert.equal(redraws,2,'Cross-tab saves leave the unfiltered catalog still');
assert.equal(notifications.length,2);

// Collapsed controls must preserve the user's choice and never receive hidden focus.
function disclosureFixture({mobile=false,saved='[]',duration='',budget='',favorites=false}={}){
  const ids=['catalogDiscovery','discoveryDuration','discoveryBudget','discoveryFavorites','discoveryClear','discoveryMore','discoveryActiveCount'];
  const elements=Object.fromEntries(ids.map(id=>[id,node(id)])),summary=node('summary'),events={},storageEvents={};
  elements.discoveryMore.open=true;elements.discoveryMore.querySelector=selector=>selector==='summary'?summary:null;
  elements.discoveryDuration.value=duration;elements.discoveryBudget.value=budget;
  elements.discoveryFavorites.getAttribute=key=>key==='aria-pressed'?String(favorites):null;
  let controller;
  controller=D.mount({getProducts:()=>products,document:{getElementById:id=>elements[id],querySelectorAll:()=>[],addEventListener:(type,fn)=>events[type]=fn},
    window:{matchMedia:query=>(assert.equal(query,'(max-width: 600px)'),{matches:mobile}),localStorage:{getItem:()=>saved,setItem(){}},addEventListener:(type,fn)=>storageEvents[type]=fn},
    onChange:()=>controller?.sync(),onReset:()=>controller.sync()});
  return {controller,elements,summary,events,storageEvents};
}
const mobile=disclosureFixture({mobile:true});
assert.equal(mobile.elements.discoveryMore.open,false,'Mobile starts compact without active filters or saved favorites');
assert.equal(mobile.elements.discoveryMore.hidden,false);assert.equal(mobile.elements.catalogDiscovery.hidden,false);
assert.equal(mobile.elements.discoveryActiveCount.hidden,true);
mobile.elements.discoveryMore.open=true;
mobile.elements.discoveryDuration.value='90';mobile.elements.discoveryDuration.listeners.change();
assert.equal(mobile.elements.discoveryActiveCount.textContent,'1 activo');
mobile.elements.discoveryBudget.value='20000';mobile.elements.discoveryBudget.listeners.change();
mobile.elements.discoveryFavorites.listeners.click();
assert.equal(mobile.elements.discoveryActiveCount.textContent,'3 activos');
mobile.elements.discoveryMore.open=false;
mobile.controller.sync({query:'chatgpt',category:'IA',sort:'asc'});
assert.equal(mobile.elements.discoveryMore.open,false,'Searching and rerendering preserve the user\'s closed disclosure');
assert.equal(mobile.elements.discoveryActiveCount.hidden,false,'Active constraints stay indicated while controls are collapsed');
mobile.elements.discoveryClear.listeners.click();
assert.equal(mobile.elements.discoveryMore.open,false);assert.equal(mobile.summary.focused,true,'Reset focuses the visible summary instead of a collapsed select');
assert.equal(mobile.elements.discoveryActiveCount.hidden,true);
mobile.storageEvents.storage({key:D.KEY,newValue:'["chatgpt"]'});
assert.equal(mobile.elements.discoveryMore.open,false,'Cross-tab saves do not override the user\'s disclosure choice');
mobile.elements.discoveryMore.open=true;mobile.controller.sync();
assert.equal(mobile.elements.discoveryMore.open,true,'An intentionally expanded empty disclosure stays expanded');
for(const options of [{saved:'["chatgpt"]'},{duration:'90'},{budget:'20000'},{favorites:true}]){
  const fixture=disclosureFixture({mobile:true,...options});
  assert.equal(fixture.elements.discoveryMore.open,true,'Restored filters or saved favorites start visible on mobile');
}
assert.equal(disclosureFixture().elements.discoveryMore.open,true,'Desktop starts with secondary filters expanded');
const emptyFavorite=disclosureFixture({mobile:true,saved:'["chatgpt"]',favorites:true});
emptyFavorite.elements.discoveryMore.open=false;
emptyFavorite.events.click({target:favorite});
assert.equal(emptyFavorite.summary.focused,true,'Removing the last favorite cannot focus a collapsed favorites control');

// Execute real category handlers with replacement DOM nodes and controllable timers.
const focusDoc={activeElement:null},pending=new Map();let nextTimer=0,reduced=true,renders=0;
const categoryNodes={
  '#search':{focus(options){focusDoc.activeElement=this;this.focusOptions=options;}},
  '#grid':{classes:new Set(),classList:{add(value){categoryNodes['#grid'].classes.add(value);},remove(value){categoryNodes['#grid'].classes.delete(value);}}}
};
const categoryHost={children:[],contains(element){return this.children.includes(element);},
  set innerHTML(value){
    if(this.contains(focusDoc.activeElement))focusDoc.activeElement=null;
    this.children=[...value.matchAll(/data-c="([^"]+)" aria-pressed="([^"]+)"/g)].map(match=>({
      dataset:{c:match[1]},pressed:match[2],closest(){return this;},
      focus(options){focusDoc.activeElement=this;this.focusOptions=options;},scrollIntoView(options){this.scrollOptions=options;}
    }));
  },querySelectorAll(selector){assert.equal(selector,'.chip');return this.children;},querySelector(selector){assert.equal(selector,'.chip.on');return this.children.find(button=>button.pressed==='true');}};
categoryNodes['#filters']=categoryHost;
const focusContext=vm.createContext({PRODUCTS:products,filter:'Todos',document:focusDoc,$:selector=>categoryNodes[selector],
  window:{matchMedia:query=>(assert.equal(query,'(prefers-reduced-motion: reduce)'),{matches:reduced})},
  renderGrid:()=>renders++,clearTimeout:id=>pending.delete(id),setTimeout:(callback,delay)=>{assert.equal(delay,180);pending.set(++nextTimer,callback);return nextTimer;}});
vm.runInContext(source.slice(source.indexOf('function prefersReducedMotion(){'),source.indexOf('function renderGrid(){')),focusContext);
vm.runInContext('renderFilters()',focusContext);
const before=categoryHost.children.find(button=>button.dataset.c==='IA');before.focus();
categoryHost.onclick({target:before});
const after=categoryHost.querySelector('.chip.on');
assert.notEqual(after,before,'Test replaces nodes as innerHTML does in the browser');
assert.equal(after.dataset.c,'IA');assert.equal(focusDoc.activeElement,after,'Keyboard activation retains focus on the selected replacement category');
assert.equal(after.focusOptions.preventScroll,true);assert.equal(after.scrollOptions.behavior,'instant');
assert.equal(renders,1);assert.equal(pending.size,0,'Reduced-motion selection renders immediately without a fade timer');
categoryHost.children.find(button=>button.dataset.c==='Diseño').focus();vm.runInContext('renderFilters()',focusContext);
assert.equal(focusDoc.activeElement.dataset.c,'Diseño','A live refresh also preserves focus on a category reached by Tab but not yet selected');
assert.equal(categoryHost.querySelector('.chip.on').dataset.c,'IA','Preserving focus cannot change the selected category');
focusDoc.activeElement=categoryNodes['#search'];vm.runInContext('renderFilters()',focusContext);
assert.equal(focusDoc.activeElement,categoryNodes['#search'],'A catalog refresh cannot steal focus from the search input');
reduced=false;
const design=categoryHost.children.find(button=>button.dataset.c==='Diseño');design.focus();categoryHost.onclick({target:design});
assert.equal(pending.size,1);assert.equal(renders,1);assert.equal(categoryHost.querySelector('.chip.on').scrollOptions.behavior,'smooth');
assert(categoryNodes['#grid'].classes.has('swap'));
reduced=true;
const all=categoryHost.children.find(button=>button.dataset.c==='Todos');all.focus();categoryHost.onclick({target:all});
assert.equal(pending.size,0,'Enabling reduced motion cancels an older delayed catalog render');
assert.equal(renders,2);assert.equal(categoryNodes['#grid'].classes.has('swap'),false);
focusContext.PRODUCTS=[products[0]];vm.runInContext('renderFilters()',focusContext);
assert.equal(focusDoc.activeElement,categoryNodes['#search'],'When live data removes category choices, focus moves to the visible search');

// Run the complete shortcuts module: a product dock button must land on its results.
const shortcutSource=fs.readFileSync(path.join(root,'store-tools-20261022.js'),'utf8');
assert.match(html,/id="count" tabindex="-1"/,'Results are programmatically focusable without becoming another Tab stop');
for(const reduce of [false,true]){
  const events={},calls=[],catalogBefore=JSON.stringify(products);
  const input={value:'old search',focus(){throw Error('Product shortcuts must not focus a mobile text input');}};
  const results={tabIndex:0,textContent:'old count',focus(options){assert.equal(options.preventScroll,true);calls.push('focus:'+this.textContent);},
    scrollIntoView(options){assert.equal(options.behavior,reduce?'instant':'smooth');assert.equal(options.block,'start');calls.push('scroll');}};
  const context=vm.createContext({IAPCatalog:C,PRODUCTS:products,filter:'Diseño',CONFIG:{WHATSAPP:'573102035327'},esc:String,
    document:{createElement:()=>({setAttribute(){},addEventListener(){}}),body:{append(){},classList:{toggle(){}}},
      getElementById:id=>id==='search'?input:id==='count'?results:null,querySelectorAll:()=>[],addEventListener:(type,listener)=>events[type]=listener},
    window:{addEventListener(){},matchMedia:query=>(assert.equal(query,'(prefers-reduced-motion: reduce)'),{matches:reduce})},
    discovery:{clearExtras:()=>calls.push('clear')},renderFilters:()=>calls.push('filters'),
    renderGrid:()=>{calls.push('grid');results.textContent=products.filter(p=>C.matches(p,input.value)).length+' planes';}});
  vm.runInContext(shortcutSource,context);
  const shortcut={dataset:{jumpProduct:'capcut'},closest:selector=>selector==='[data-jump-product]'?shortcut:null};
  events.click({target:shortcut});
  assert.equal(input.value,'CapCut Pro');assert.equal(context.filter,'Todos','Product shortcuts keep clearing the category filter');
  assert.deepEqual(calls,['clear','filters','grid','focus:3 planes','scroll'],'Results render before focus and scrolling, and extra filters are cleared first');
  assert.equal(results.tabIndex,-1);assert.equal(JSON.stringify(products),catalogBefore,'Navigation cannot change plans or prices');
  events.click({target:{closest:()=>null}});assert.equal(calls.length,5,'Unrelated clicks cannot retrigger result navigation');
}
console.log('PASS: favorites and combined filters; unchanged catalog and purchase links; responsive disclosure, restored state, active count, hidden-focus fallback; category focus and reduced-motion cancellation; product shortcuts focus and scroll to rendered results without mobile input focus.');
