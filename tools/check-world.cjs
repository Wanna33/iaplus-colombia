const assert=require('node:assert/strict'),fs=require('node:fs');
const {unique,stage,changes,saleChanges,pageOf,sceneSlot,scenePageOf,createTracker,zoomLevel,LIMITS,WORLD,TEAM}=require('../admin-world.js');
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
const sceneSource=fs.readFileSync('admin-world-scene.js','utf8');
assert.deepEqual(WORLD,{width:1000,height:720,minWidth:760});
assert.equal(TEAM.length,12);
assert.equal(new Set(TEAM.map(worker=>worker.name)).size,TEAM.length,'Every employee must be distinct');
assert(require('../admin-world-scene.js').markup().includes(`viewBox="0 0 ${WORLD.width} ${WORLD.height}"`),'Scenery and avatar coordinates must use the same canvas');
for(const worker of TEAM)for(const [x,y] of [[worker.x,worker.y],...worker.path]){
  assert(x>=40&&x<=WORLD.width-40&&y>=90&&y<=WORLD.height-24,`${worker.name} has a route outside the canvas`);
}
assert.equal(zoomLevel(-100),.3);assert.equal(zoomLevel(100),1.8);assert.equal(zoomLevel(NaN),1);
let zoom=1;for(let i=0;i<50;i++)zoom=zoomLevel(zoom+.2);assert.equal(zoom,1.8);
for(let i=0;i<50;i++)zoom=zoomLevel(zoom-.2);assert.equal(zoom,.3,'Repeated zooming must clamp without floating point drift');
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
for(const kind of ['waiting','shopping','support','payment','sale'])for(let rank=0;rank<LIMITS.avatars;rank++){const [x,y]=sceneSlot(kind,rank);assert(x>=40&&x<=WORLD.width-40&&y>=90&&y<=WORLD.height-24,`Slot ${kind}/${rank} escaped the store`);}
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
  class Element{
    constructor(){this.nodes=new Map();this.innerHTML='';this.isConnected=true;this.dataset={};this.style={};this.attributes=new Map();this.clientWidth=900;this.clientHeight=600;this.scrollLeft=0;this.scrollTop=0;const classes=new Set();this.classList={toggle(name,on){const value=on===undefined?!classes.has(name):on;if(value)classes.add(name);else classes.delete(name);return value;},contains(name){return classes.has(name);}};}
    querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s);}
    append(n){n.isConnected=true;}remove(){this.isConnected=false;}setAttribute(name,value){this.attributes.set(name,value);}prepend(){}
  }
  const root=new Element(),nodes=[],listeners=new Map(),timers=new Map(),frames=new Map();let seq=0,reads=0,finish,frameTime=1000;
  const doc={hidden:false,createElement(){const e=new Element();nodes.push(e);return e;},addEventListener(k,f){listeners.set(k,f);},removeEventListener(k){listeners.delete(k);}};
  const ctx=vm.createContext({document:doc,matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),performance:{now:()=>frameTime},setTimeout(f){const id=++seq;timers.set(id,f);return id;},clearTimeout(id){timers.delete(id);},requestAnimationFrame(f){const id=++seq;frames.set(id,f);return id;},cancelAnimationFrame(id){frames.delete(id);},Date,Map,Set,console});
  vm.runInContext(sceneSource,ctx);vm.runInContext(source,ctx);
  const element=selector=>root.querySelector(selector);
  const customers=()=>nodes.filter(n=>n.isConnected&&n.className==='world-person world-customer');
  const staff=()=>nodes.filter(n=>n.isConnected&&n.className==='world-person world-staff');
  const position=node=>[parseFloat(node.style.left)*WORLD.width/100,parseFloat(node.style.top)*WORLD.height/100];
  function assertBounded(){assert(customers().length<=LIMITS.avatars);assert.equal(staff().length,TEAM.length);for(const node of [...customers(),...staff()]){const[x,y]=position(node);assert(Number.isFinite(x)&&Number.isFinite(y)&&x>=40&&x<=WORLD.width-40&&y>=90&&y<=WORLD.height-24,`${node.title||node.className} escaped the canvas at ${x},${y}`);}}
  function runFrames(count,observe=()=>{}){for(let i=0;i<count;i++){assert.equal(frames.size,1,'Exactly one animation loop must be active');const[id,callback]=frames.entries().next().value;frames.delete(id);frameTime+=80;callback(frameTime);assertBounded();observe();}}
  const settle=()=>new Promise(r=>setImmediate(r));
  ctx.IAPWorld.mount(root,{readChats:()=>{reads++;return new Promise(r=>finish=r);},openChat(){throw Error('Should not open chats automatically');}});
  assert.equal(reads,1);root.querySelector('.world-refresh').onclick();assert.equal(reads,1,'Never overlap refreshes');
  doc.hidden=true;listeners.get('visibilitychange')();assert.equal(frames.size,0);assert.equal(timers.size,0);
  finish({chats:[],sales:[]});await settle();assert.equal(timers.size,0,'No hidden polling after inflight request settles');
  doc.hidden=false;listeners.get('visibilitychange')();assert.equal(reads,2);
  const chats=Array.from({length:1000},(_,i)=>({tel:String(i+1),ts:Date.now(),nombre:'Cliente '+i,quien:'u',etiquetas:[]}));
  finish({chats,sales:[]});await settle();
  assert.equal(customers().length,LIMITS.avatars);assert.equal(staff().length,12);assertBounded();
  assert(staff().every(worker=>worker.attributes.get('role')==='img'&&worker.attributes.get('aria-label').includes('personaje virtual')),'Staff must have accessible descriptions');
  assert.equal((element('.world-client-list').innerHTML.match(/data-chat=/g)||[]).length,LIMITS.page);
  const counters=()=>['today','waiting','support','sales'].map(key=>element(`[data-count="${key}"]`).textContent);
  const initialCounters=counters(),initialActivity=element('.world-activity-total').textContent;
  const viewport=element('.world-viewport'),canvas=element('.world-stage');
  assert.equal(element('.world-zoom-value').textContent,'100 %');assert.equal(element('.world-zoom-out').disabled,false);
  const centerX=(viewport.scrollLeft+viewport.clientWidth/2)/viewport.clientWidth;
  const centerY=(viewport.scrollTop+viewport.clientHeight/2)/(viewport.clientWidth*WORLD.height/WORLD.width);
  for(let i=0;i<20;i++)element('.world-zoom-in').onclick();
  assert.equal(canvas.style.width,'180%');assert.equal(canvas.style.minWidth,`${WORLD.minWidth*1.8}px`);assert.equal(element('.world-zoom-in').disabled,true);
  assert(Math.abs((viewport.scrollLeft+viewport.clientWidth/2)/(viewport.clientWidth*1.8)-centerX)<1e-9,'Zoom must preserve the horizontal view center');
  assert(Math.abs((viewport.scrollTop+viewport.clientHeight/2)/(viewport.clientWidth*1.8*WORLD.height/WORLD.width)-centerY)<1e-9,'Zoom must preserve the vertical view center');
  for(let i=0;i<20;i++)element('.world-zoom-out').onclick();
  assert.equal(canvas.style.width,'30%');assert.equal(element('.world-zoom-value').textContent,'30 %');assert.equal(element('.world-zoom-out').disabled,true);assert.equal(element('.world-zoom-in').disabled,false);
  viewport.clientWidth=1000;viewport.clientHeight=350;
  element('.world-zoom-in').onclick();viewport.scrollLeft=100;viewport.scrollTop=200;element('.world-zoom-fit').onclick();
  assert.equal(canvas.style.width,'40%','Fit must round down to fit a short viewport');assert.equal(canvas.style.minWidth,`${WORLD.minWidth*.4}px`);assert.equal(viewport.scrollLeft,0);assert.equal(viewport.scrollTop,0);
  viewport.clientHeight=450;
  for(let i=0;i<10;i++){element('.world-zoom-in').onclick();element('.world-zoom-fit').onclick();}
  assert.equal(canvas.style.width,'60%');assert.equal(element('.world-zoom-value').textContent,'60 %');assert.equal(element('.world-zoom-out').disabled,false);
  const fittedWidth=viewport.clientWidth*parseFloat(canvas.style.width)/100,fittedHeight=fittedWidth*WORLD.height/WORLD.width;
  assert.equal(fittedWidth,600);assert.equal(fittedHeight,432);assert(fittedHeight<=viewport.clientHeight,'Fit must show the full canvas when the minimum zoom permits it');
  viewport.clientHeight=1800;element('.world-zoom-fit').onclick();assert.equal(canvas.style.width,'100%','Fit must never enlarge an already visible canvas');
  viewport.clientWidth=330;viewport.clientHeight=500;
  for(let i=0;i<10;i++){element('.world-zoom-in').onclick();element('.world-zoom-fit').onclick();}
  assert.equal(canvas.style.width,'40%');assert.equal(canvas.style.minWidth,'304px');assert.equal(element('.world-zoom-value').textContent,'40 %');
  const mobileWidth=Math.max(viewport.clientWidth*parseFloat(canvas.style.width)/100,parseFloat(canvas.style.minWidth)),mobileHeight=mobileWidth*WORLD.height/WORLD.width;
  assert.equal(mobileWidth,304);assert(mobileWidth<=viewport.clientWidth&&mobileHeight<=viewport.clientHeight,'Fit must account for both the width and the height of a mobile viewport');assert.equal(viewport.scrollLeft,0);assert.equal(viewport.scrollTop,0);
  viewport.clientWidth=900;viewport.clientHeight=600;
  for(let i=0;i<10;i++){element('.world-zoom-in').onclick();element('.world-zoom-reset').onclick();}
  element('.world-zoom-in').onclick();viewport.scrollLeft=217;viewport.scrollTop=99;element('.world-zoom-reset').onclick();
  assert.equal(canvas.style.width,'100%');assert.equal(canvas.style.minWidth,`${WORLD.minWidth}px`);assert.equal(viewport.scrollLeft,0);assert.equal(viewport.scrollTop,0);
  element('.world-expand').onclick();assert.equal(element('.world-expand').attributes.get('aria-expanded'),'true');listeners.get('keydown')({key:'Escape'});assert.equal(element('.world-expand').attributes.get('aria-expanded'),'false');
  for(let i=0;i<100;i++){element('.world-next-scene').onclick();assertBounded();}
  element('.world-next').onclick();assert.equal((element('.world-client-list').innerHTML.match(/data-chat=/g)||[]).length,LIMITS.page);
  assert.equal(reads,2,'Camera, group and directory controls must not request or write business data');
  assert.deepEqual(counters(),initialCounters,'Visual controls must preserve real counters');assert.equal(element('.world-activity-total').textContent,initialActivity);
  const startingStaff=new Map(staff().map(worker=>[worker,position(worker)])),movedStaff=new Set();
  runFrames(220,()=>staff().forEach(worker=>{const before=startingStaff.get(worker),after=position(worker);if(Math.hypot(before[0]-after[0],before[1]-after[1])>1)movedStaff.add(worker);}));
  assert.equal(movedStaff.size,TEAM.length,'Each worker must be able to complete a decorative route');
  // Only a newly confirmed order initiates checkout and a departure; never write a sale.
  element('.world-refresh').onclick();assert.equal(reads,3);finish({chats,sales:[sale]});await settle();runFrames(1);
  const buyer=customers().find(node=>node.dataset.stage==='sale');assert(buyer,'A new confirmed order must reach the cashier');
  let visitedCashier=false,visitedExit=false;
  runFrames(260,()=>{const[x,y]=position(buyer);if(Math.hypot(x-715,y-570)<2)visitedCashier=true;if(Math.hypot(x-840,y-688)<3)visitedExit=true;});
  assert(visitedCashier,'Buyer must stop at the cashier');assert(visitedExit,'Buyer must reach the exit inside the expanded canvas');assert.equal(buyer.isConnected,false,'Buyer must leave after checkout');
  assert(element('.world-scene-count').textContent.startsWith(`${customers().length} en escena`),'The scene count must update when a buyer leaves');
  const activityAfterSale=element('.world-activity-total').textContent;
  element('.world-refresh').onclick();finish({chats,sales:[sale]});await settle();runFrames(5);
  assert.equal(element('.world-activity-total').textContent,activityAfterSale,'The same confirmed order must not replay');assert(!customers().some(node=>node.dataset.stage==='sale'));
  root.querySelector('.world-pause').onclick({currentTarget:new Element()});assert.equal(frames.size,0,'Paused animation must stop RAF');
  assert.equal(timers.size,1);ctx.IAPWorld.stop();assert.equal(frames.size,0);assert.equal(timers.size,0);assert.equal(listeners.size,0);
  // A rejected request preserves the scene and schedules one backoff, never a burst.
  ctx.IAPWorld.mount(root,{readChats:async()=>{throw Error('offline');},openChat(){}});await new Promise(r=>setImmediate(r));assert.equal(timers.size,1);ctx.IAPWorld.stop();assert.equal(timers.size,0);
}
lifecycle().then(()=>console.log('OK: 100/1000/10000 clients; 12 staff + max 12 customers, safe routes and checkout exit, zoom clamps/reset, preserved counters/reads, bounded history, directory, deduplication, Colombia day, pause/visibility/disposal, no writes. '+elapsed.join('; '))).catch(e=>{console.error(e);process.exitCode=1;});
