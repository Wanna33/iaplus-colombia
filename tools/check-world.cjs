const assert=require('node:assert/strict'),fs=require('node:fs');
const {unique,stage,changes,saleChanges,pageOf,sceneSlot,scenePageOf,createTracker,LIMITS}=require('../admin-world.js');
const c={tel:'1',ts:10,quien:'u',vendido:false,etiquetas:[]};
assert.equal(unique([c,{...c,ts:1}]).length,1);
assert.equal(unique([c,{...c,ts:1}])[0].ts,10);
assert.equal(stage(c),'waiting');
assert.equal(stage({...c,quien:'a',ultimo:'Tu mensaje llegó, pero ahora no pude completar la respuesta automática'}),'waiting');
assert.equal(stage({...c,quien:'a',etiquetas:['pago']}),'payment');
assert.equal(stage({...c,etiquetas:['reembolso']}),'support');
const baseline=new Map([['1',c]]);
assert.deepEqual(changes(baseline,[c]),[]);
assert.equal(changes(baseline,[{...c,ts:11}])[0].kind,'waiting');
assert.equal(changes(baseline,[{...c,vendido:true}])[0].kind,'sale');
assert.notEqual(changes(new Map(),[{...c,vendido:true}])[0].kind,'sale');
assert.equal(changes(new Map([['1',{...c,vendido:true}]]),[{...c,vendido:true}]).length,0);
assert.notEqual(changes(baseline,[{...c,ts:12,etiquetas:['pago']}])[0].kind,'sale');
const sale={id:'order-1',telefono:'1',nombre:'Demo',estado:'AUTO-CONFIRMADO'};
assert.equal(saleChanges(new Map(),[sale]).length,1);
assert.equal(saleChanges(new Map([['order-1','AUTO-CONFIRMADO']]),[sale]).length,0);
assert.equal(saleChanges(new Map(),[{...sale,estado:'NO VERIFICADO'}]).length,0);
assert.equal(saleChanges(new Map([['order-1','POR CONFIRMAR']]),[sale])[0].kind,'sale');
assert.equal(saleChanges(new Map([['order-1','AUTO-CONFIRMADO']]),[{...sale,id:'renewal-2'}]).length,1);
const source=fs.readFileSync('admin-world.js','utf8');
assert(!/fetch\(|localStorage|admin_(add|delete|wa_send|account)|\.clave\b|\.codigo\b/.test(source));
assert(source.includes('document.hidden')&&source.includes('clearTimeout(poll)'));
const vm=require('node:vm'),admin=fs.readFileSync('admin.js','utf8'),context={};
vm.runInNewContext(admin.slice(admin.indexOf('function inboxNeedsReply('),admin.indexOf('function drawInbox(')),context);
assert(context.inboxNeedsReply({quien:'a',ultimo:'Tu mensaje llegó, pero ahora no pude completar la respuesta automática'}));
assert(!context.inboxNeedsReply({quien:'d',ultimo:'Te envié las instrucciones de acceso'}));
assert.equal(context.inboxUnique([{tel:'1',ts:20},{tel:'1',ts:10}]).length,1);
assert.equal(context.inboxUnique([{tel:'1',ts:20},{tel:'1',ts:10}])[0].ts,20);
const now=Date.UTC(2026,10,4,18),elapsed=[];
for(const size of [100,1000,10000]){
  const chats=Array.from({length:size},(_,i)=>({tel:String(i+1),nombre:'Cliente '+i,ts:now-i*1000,quien:i%2?'a':'u',etiquetas:i%5===0?['queja']:[],vendido:false}));
  const tracker=createTracker(),start=performance.now();
  const initial=tracker.ingest(chats,[],now);
  assert.equal(initial.chats.length,size);assert.equal(initial.events.length,0);assert.equal(initial.counts.today,size);
  const again=tracker.ingest([...chats,...chats.map(c=>({...c,ts:c.ts-100}))],[],now);
  assert.equal(again.chats.length,size);assert.equal(again.events.length,0);
  const sales=Array.from({length:size},(_,i)=>({id:'sale-'+i,telefono:String(i+1),estado:'AUTO-CONFIRMADO',nombre:'Cliente '+i}));
  const sold=tracker.ingest(chats,[...sales,...sales],now);
  assert.equal(sold.events.filter(e=>e.kind==='sale').length,size);
  assert(sold.historySize<=LIMITS.history&&sold.saleHistorySize<=LIMITS.history);
  assert.equal(tracker.ingest([],[],now).events.length,0);
  assert.equal(tracker.ingest(chats,sales,now).events.length,0,'Missing snapshots must not replay sales');
  const allIds=new Set();for(let page=0;page<Math.ceil(size/LIMITS.page);page++){const result=pageOf(chats,{page});assert(result.items.length<=20);result.items.forEach(c=>allIds.add(c.tel));}
  assert.equal(allIds.size,size,'Every client must be reachable through pagination');
  assert.equal(pageOf(chats,{query:'Cliente 99'}).items[0].nombre,'Cliente 99');
  assert(pageOf(chats,{filter:'support'}).items.every(c=>stage(c)==='support'));
  assert.equal(pageOf(chats,{page:99999}).page,Math.ceil(size/20)-1);
  elapsed.push(`${size}: ${Math.round(performance.now()-start)} ms`);
}
const midnight=Date.UTC(2026,10,4,5),midTracker=createTracker();
assert.equal(midTracker.ingest([{tel:'before',ts:midnight-1},{tel:'today',ts:midnight},{tel:'future',ts:midnight+9999999}],[],midnight).counts.today,1);
for(const kind of ['waiting','shopping','support','payment'])for(let rank=0;rank<12;rank++){const [x,y]=sceneSlot(kind,rank);assert(x>=40&&x<=960&&y>=90&&y<=530,`Slot ${kind}/${rank} escaped the store`);}
assert.deepEqual(saleChanges(new Map(),[sale,sale]).map(e=>e.id),['order-1']);
// A cashier occupies one of the 12 slots: all remaining clients need 3 groups.
const crowd=Array.from({length:24},(_,i)=>({tel:String(i+1),ts:100})),cashier=new Set(['1']),visible=new Set(['1']);
let scene=scenePageOf(crowd,{sales:cashier});assert.equal(scene.pages,3);assert.equal(scene.capacity,11);
for(let i=0;i<3;i++){assert.equal(scene.page,i);assert(scene.items.length+cashier.size<=LIMITS.avatars);scene.items.forEach(c=>visible.add(c.tel));scene=scenePageOf(crowd,{sales:cashier,page:scene.page,advance:true});}
assert.equal(scene.page,0);assert.equal(visible.size,24,'The next-group control must reach all clients while a sale animates');
const left=new Map(crowd.slice(0,20).map(c=>[c.tel,c.ts]));
assert.equal(scenePageOf(crowd,{departed:left,sales:cashier,page:2,advance:true}).page,0);
assert.equal(scenePageOf(crowd,{departed:left,sales:cashier}).items.length,4);

// Exercise mounting, concurrent refreshes, visibility and disposal with controlled clocks.
async function lifecycle(){
  class Element{constructor(){this.nodes=new Map();this.innerHTML='';this.isConnected=true;this.dataset={};this.style={};this.classList={toggle(){},contains(){return false;}};}querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s);}append(n){n.isConnected=true;}remove(){this.isConnected=false;}setAttribute(){}prepend(){} }
  const root=new Element(),nodes=[],listeners=new Map(),timers=new Map(),frames=new Map();let seq=0,reads=0,finish;
  const doc={hidden:false,createElement(){const e=new Element();nodes.push(e);return e;},addEventListener(k,f){listeners.set(k,f);},removeEventListener(k){listeners.delete(k);}};
  const ctx={document:doc,matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),performance:{now:()=>1000},setTimeout(f){const id=++seq;timers.set(id,f);return id;},clearTimeout(id){timers.delete(id);},requestAnimationFrame(f){const id=++seq;frames.set(id,f);return id;},cancelAnimationFrame(id){frames.delete(id);},Date,Map,Set,console};
  vm.runInNewContext(source,ctx);
  ctx.IAPWorld.mount(root,{readChats:()=>{reads++;return new Promise(r=>finish=r);},openChat(){throw Error('Should not open chats automatically');}});
  assert.equal(reads,1);root.querySelector('.world-refresh').onclick();assert.equal(reads,1,'Never overlap refreshes');
  doc.hidden=true;listeners.get('visibilitychange')();assert.equal(frames.size,0);assert.equal(timers.size,0);
  finish({chats:[],sales:[]});await new Promise(r=>setImmediate(r));assert.equal(timers.size,0,'No hidden polling after inflight request settles');
  doc.hidden=false;listeners.get('visibilitychange')();assert.equal(reads,2);
  finish({chats:Array.from({length:1000},(_,i)=>({tel:String(i+1),ts:Date.now(),nombre:'Cliente '+i,quien:'u',etiquetas:[]})),sales:[]});await new Promise(r=>setImmediate(r));
  assert.equal(nodes.filter(n=>n.isConnected&&n.className==='world-person world-customer').length,LIMITS.avatars);
  assert.equal((root.querySelector('.world-client-list').innerHTML.match(/data-chat=/g)||[]).length,LIMITS.page);
  root.querySelector('.world-pause').onclick({currentTarget:new Element()});assert.equal(frames.size,0,'Paused animation must stop RAF');
  assert.equal(timers.size,1);ctx.IAPWorld.stop();assert.equal(frames.size,0);assert.equal(timers.size,0);assert.equal(listeners.size,0);
  // A rejected request preserves the scene and schedules one backoff, never a burst.
  ctx.IAPWorld.mount(root,{readChats:async()=>{throw Error('offline');},openChat(){}});await new Promise(r=>setImmediate(r));assert.equal(timers.size,1);ctx.IAPWorld.stop();assert.equal(timers.size,0);
}
lifecycle().then(()=>console.log('OK: 100/1000/10000 clients; bounded history, avatars, paginated directory, deduplication, Colombia day, pause/visibility/disposal, no writes. '+elapsed.join('; '))).catch(e=>{console.error(e);process.exitCode=1;});
