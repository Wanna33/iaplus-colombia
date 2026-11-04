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
for(const id of ['catalogDiscovery','discoveryDuration','discoveryBudget','discoveryFavorites','discoveryClear'])assert(html.includes(`id="${id}"`));

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
console.log('PASS: favorites persist only valid IDs; combined filters; live catalog changes; blocked storage; real catalog render and purchase links; favorite/clear events, cross-tab updates and keyboard focus.');
