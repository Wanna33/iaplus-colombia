const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const workspace=require('../account-workspace.js'),state=require('../account-state.js');
const now=Date.UTC(2026,10,4,17),day=86400000;
const productOf=it=>/chatgpt/i.test(it.producto)?{k:'chatgpt',n:'ChatGPT'}:/canva/i.test(it.producto)?{k:'canva',n:'Canva'}:{k:'gemini',n:'Gemini'};
const items=Object.freeze([
  {producto:'ChatGPT 3 meses',correo:'primera@example.test',clave:'not-searchable-secret',fin:new Date(now+20*day).toISOString(),ordenCuenta:10,recomendada:true},
  {producto:'ChatGPT',correo:'adicional@example.test',clave:'secret-2',fin:new Date(now+20*day).toISOString(),ordenCuenta:30,adicional:true},
  {producto:'ChatGPT Plus',correo:'retirada@example.test',clave:'secret-3',fin:new Date(now+2*day).toISOString(),ordenCuenta:99,recomendada:true,retirada:true,adicional:true},
  {producto:'Canva',correo:'diseno@example.test',clave:'secret-4',fin:new Date(now+5*day).toISOString(),ordenCuenta:20},
  {producto:'Canva',correo:'otra@example.test',clave:'secret-5',fin:new Date(now+5*day+1).toISOString(),ordenCuenta:1},
  {producto:'Gemini',correo:'vencida@example.test',clave:'secret-6',fin:new Date(now).toISOString(),ordenCuenta:80,recomendada:true},
  {producto:'Gemini',correo:'pendiente@example.test',clave:'secret-7',fin:'sin fecha',ordenCuenta:4},
  {producto:'Gemini',correo:'flag@example.test',clave:'secret-8',fin:new Date(now+day).toISOString(),vencida:true,ordenCuenta:5}
].map(Object.freeze));
const original=JSON.stringify(items),summary=workspace.summary(items,now,productOf);
assert.deepEqual(summary,{total:8,active:5,products:2,recommended:1,soon:2,expired:2,nextExpiry:now+2*day});
assert(!('plans' in summary)&&!('purchases' in summary));
assert.equal(workspace.select(items,{view:'active'},now,productOf).length,5);
assert.deepEqual(workspace.select(items,{view:'recommended'},now,productOf),[0]);
assert.deepEqual(workspace.select(items,{view:'soon'},now,productOf),[3,2]);
assert.deepEqual(workspace.select(items,{view:'expired'},now,productOf),[5,7]);
assert.deepEqual(workspace.select(items,{view:'pending'},now,productOf),[6]);
assert.deepEqual(workspace.select(items,{product:'canva',view:'active',sort:'expiry'},now,productOf),[3,4]);
assert.deepEqual(workspace.select(items,{query:'ADICIONAL@'},now,productOf),[1]);
assert.deepEqual(workspace.select(items,{query:'not-searchable-secret'},now,productOf),[]);
assert.equal(workspace.select(items,{sort:'recent'},now,productOf).at(-1),2,'Retired accesses remain reachable but sort last');
assert.equal(workspace.select(items,{sort:'recommended'},now,productOf)[0],0);
assert.deepEqual(workspace.summary([],now,productOf),{total:0,active:0,products:0,recommended:0,soon:0,expired:0,nextExpiry:null});
assert.equal(workspace.summary([{producto:'Canva'}],now,productOf).nextExpiry,null,'A missing date never becomes an infinite expiry');
assert.equal(JSON.stringify(items),original,'No mutation to credentials, dates or entitlements');
for(const item of items){const described=workspace.describe([item],now,productOf)[0];assert.equal(described.active,state.isActive(item,now));assert.equal(described.expired,state.isExpired(item,now));}

// Drive the actual controls with existing card nodes; filtering must not recreate access/2FA nodes.
class Element{constructor(){this.nodes=new Map();this.dataset={};this.style={};this.hidden=false;this.isConnected=true;this.attrs={};this.value='';this.innerHTML='';}querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s);}setAttribute(k,v){this.attrs[k]=v;}}
const host=new Element(),grid=new Element(),cards=items.map((_,i)=>{const el=new Element();el.dataset.accountIndex=String(i);el.totpSession={remaining:30,code:'123456'};return el;}),empty=new Element();
const buttons=['all','active','recommended','soon','expired'].map(view=>{const b=new Element();b.dataset.awView=view;return b;});
host.querySelectorAll=()=>buttons;
grid.querySelectorAll=()=>cards;
grid.querySelector=()=>empty;
grid.children=[...cards,empty];
grid.append=el=>{grid.children=grid.children.filter(x=>x!==el);grid.children.push(el);};
let query='',hides=0;
const realNow=Date.now;Date.now=()=>now;
workspace.mount(host,{items,grid,productOf,onQuery:value=>query=value,onHide(){hides++;}});
const prior=cards.map(c=>c.totpSession);
host.querySelector('.aw-sort').onchange({target:{value:'recommended'}});
assert.equal(grid.children.find(n=>!n.hidden&&n!==empty),cards[0]);
buttons.find(b=>b.dataset.awView==='recommended').onclick();
assert.equal(cards.filter(c=>!c.hidden).length,1);assert(hides>0);
host.querySelector('.aw-search').oninput({target:{value:'unmatched-client'}});
assert.equal(query,'unmatched-client');assert.equal(empty.hidden,false);
workspace.reveal();assert.equal(query,'');assert.equal(cards.filter(c=>!c.hidden).length,items.length);assert.equal(empty.hidden,true);
workspace.setQuery('ADICIONAL@');assert.equal(cards.filter(c=>!c.hidden).length,1);assert.equal(cards[1].hidden,false);
cards.forEach((c,i)=>assert.equal(c.totpSession,prior[i]));
workspace.unmount();assert(!workspace.isMounted());
// Defensive presentation when the state provider supplies an active access without a date.
// The real entitlement helper is restored immediately; its behavior remains unchanged.
const realActive=state.isActive;
try{
  state.isActive=()=>true;
  const undated=[{producto:'Canva'}];
  assert.equal(workspace.summary(undated,now,productOf).nextExpiry,null);
  assert.equal(workspace.summary([...undated,items[0]],now,productOf).nextExpiry,now+20*day);
  workspace.mount(host,{items:undated,grid,productOf});
  assert(host.innerHTML.includes('Fecha no disponible'));
  assert(!host.innerHTML.includes('Invalid Date'));
}finally{state.isActive=realActive;workspace.unmount();Date.now=realNow;}
const source=fs.readFileSync('account-workspace.js','utf8');
assert(!/fetch\(|localStorage|sessionStorage|MutationObserver|\.clave\b|\.codigo\b|action:/.test(source),'Presentation module must not persist secrets or call the backend');
const customer=fs.readFileSync('cuenta-20261022.js','utf8');
assert(customer.includes('data-account-index="${idx}"'));
assert(!/\$\{act\} planes activos|\?\x27plan vigente\x27:\x27planes vigentes\x27/.test(customer));
const presentation=vm.createContext({ITEMS:items,IAPAccountState:{isActive:it=>state.isActive(it,now),isExpired:it=>state.isExpired(it,now)},IAPCatalog:{duration:()=> '30 días'},appOf:it=>({k:'gemini',n:it.producto}),esc:value=>String(value??''),fmt:date=>String(date),DAY:day,WHATSAPP:'000000',I:{}});
vm.runInContext(customer.slice(customer.indexOf('function card(it, idx){'),customer.indexOf('function addBox(first){')),presentation);
const history=presentation.histHtml(),statusLabels=[...history.matchAll(/<span class="st ([^"]*)">([^<]+)<\/span>/g)];
assert.deepEqual(statusLabels.map(match=>match[2]),items.map(item=>state.isActive(item,now)?'Activo':state.isExpired(item,now)?'Expirado':'Por confirmar'));
assert.equal(statusLabels[6][1],'','An unconfirmed access must not carry active styling');
for(const [index,delay]of [[0,0],[1,45],[5,225],[10000,225]])assert(presentation.card(items[5],index).includes(`animation-delay:${delay}ms`),'Entrance delay stays bounded for large accounts');
console.log('OK: accurate access/product summaries, filters, ordering, expiry boundaries, unchanged state API, stable cards/2FA, in-memory preferences, no backend writes.');
