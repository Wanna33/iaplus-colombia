/* Actual dashboard integration + request adapter + focus module, with no network. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const admin=fs.readFileSync(path.join(__dirname,'../admin.js'),'utf8');
const focus=fs.readFileSync(path.join(__dirname,'../admin-focus.js'),'utf8');
const adapter=admin.slice(admin.indexOf('const adminReadRequests='),admin.indexOf('function showLogin(){'));
const integration=admin.slice(admin.indexOf('function loadFocus(){'),admin.indexOf('function updateViews(){'));
assert(adapter.includes('async function api('));assert(integration.includes('IAPAdminFocus.mount('));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const chat=(tel='1001')=>({tel,nombre:'Cliente de prueba '+tel,ts:Date.now(),quien:'u',ultimo:'Consulta de prueba',etiquetas:[]});
const sale=estado=>({id:'test-sale',telefono:'1001',nombre:'Cliente de prueba',estado,fecha:new Date().toISOString()});
class Element{
  constructor(){this.nodes=new Map();this.attributes=new Map();this.isConnected=true;this.innerHTML='';this.dataset={};this.value='';}
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Element());return this.nodes.get(selector);}
  setAttribute(name,value){this.attributes.set(name,value);}
  focus(){this.focused=true;}scrollIntoView(){this.scrolled=true;}
}
function harness(){
  const root=new Element(),pending=[],navigation=[],selectors=new Map(),modules=[];
  let callbacks,inboxResolve,inboxLoads=0;
  const context=vm.createContext({console,Date,Map,Set,WeakMap,Error,JSON,
    document:{getElementById:id=>id==='adminFocus'?root:null,querySelectorAll:()=>[]},
    window:{},curTab:'res',focusRoot:null,focusController:null,focusRequest:null,WAV:[],
    API_URL:'https://test.invalid',load:()=>({token:'test-session',exp:Date.now()+600000}),
    postJson:(url,body)=>new Promise((resolve,reject)=>pending.push({url,body,resolve,reject})),
    loadAdminStyle:async src=>{modules.push(src);},loadAdminScript:async src=>{modules.push(src);},
    $:selector=>{if(!selectors.has(selector))selectors.set(selector,new Element());return selectors.get(selector);},
    drawWa(){},setTab:tab=>{context.curTab=tab;},openChat:tel=>navigation.push(tel),
    loadInbox:()=>{inboxLoads++;return new Promise(resolve=>inboxResolve=resolve);}
  });
  vm.runInContext(focus,context);
  const module=context.IAPAdminFocus;
  context.window.IAPAdminFocus={mount(element,options){callbacks=options;return module.mount(element,options);}};
  vm.runInContext(adapter+'\n'+integration,context);
  const take=action=>{const index=pending.findIndex(request=>request.body.action===action);assert(index>=0,'Expected request '+action);return pending.splice(index,1)[0];};
  const complete=(chats=[chat()],sales=[])=>{take('admin_wa_chats').resolve({ok:true,chats});take('admin_wa_list').resolve({ok:true,ventas:sales});};
  return {context,root,pending,navigation,modules,take,complete,callbacks:()=>callbacks,inboxLoads:()=>inboxLoads,releaseInbox:()=>inboxResolve?.()};
}
async function concurrentLoads(){
  const h=harness(),first=h.context.loadFocus(),second=h.context.loadFocus(),third=h.context.loadFocus();
  assert.strictEqual(second,first);assert.strictEqual(third,first);await tick();
  assert.equal(h.modules.length,2,'Concurrent entry must load one script and one stylesheet');
  assert.equal(h.pending.length,2,'Concurrent entry must issue one read per resource');
  assert.deepEqual(h.pending.map(request=>request.body.action).sort(),['admin_wa_chats','admin_wa_list']);
  h.complete();await Promise.all([first,second,third]);await tick();
  assert.equal(h.context.focusRequest,null,'Completed loads must release the request guard');
  assert.equal(h.root.querySelector('.af-total').textContent,'1');
  const next=h.context.loadFocus();await tick();assert.equal(h.pending.length,2,'A later refresh must obtain new data');h.complete();await next;
}
async function hiddenResultCannotReplaceNewSales(){
  const h=harness(),initial=h.context.loadFocus();await tick();h.complete();await initial;await tick();
  const old=h.context.loadFocus();await tick();
  // Sales resolves first; chats remains pending. A new WA read is now independent.
  h.take('admin_wa_list').resolve({ok:true,ventas:[sale('POR CONFIRMAR')]});await tick();
  h.context.curTab='wa';const recent=h.context.api('admin_wa_list');
  h.take('admin_wa_list').resolve({ok:true,ventas:[sale('CONFIRMADO')]});h.context.WAV=(await recent).ventas;
  const confirmed=h.context.WAV;
  h.take('admin_wa_chats').resolve({ok:true,chats:[chat()]});await old;
  assert.strictEqual(h.context.WAV,confirmed,'Late hidden dashboard results must not overwrite the newer sales view');
  assert.equal(h.context.WAV[0].estado,'CONFIRMADO');
  h.context.curTab='res';await tick();const returnLoad=h.context.loadFocus();await tick();h.complete([chat('1002')],[sale('CONFIRMADO')]);await returnLoad;
  assert(h.root.querySelector('.af-list').innerHTML.includes('phone:1002'),'Returning to the dashboard must still refresh successfully');
}
async function navigationCannotStealLaterSelection(){
  const h=harness(),initial=h.context.loadFocus();await tick();h.complete();await initial;
  const result=h.callbacks().openChat('client-A');
  assert.equal(h.context.curTab,'wa');assert.deepEqual(h.navigation,['client-A'],'The requested chat must open immediately without awaiting an inbox read');
  h.context.openChat('client-B');h.releaseInbox();await Promise.resolve(result);await tick();
  assert.deepEqual(h.navigation,['client-A','client-B'],'A delayed inbox must not reopen A after the user selected B');
  assert.equal(h.inboxLoads(),0,'The focus callback must leave inbox loading to normal WA navigation');
}
async function errorsPreserveSnapshotAndAllowRetry(){
  const h=harness(),initial=h.context.loadFocus();await tick();h.complete();await initial;await tick();
  const list=h.root.querySelector('.af-list'),original=list.innerHTML,total=h.root.querySelector('.af-total');
  const failed=h.context.loadFocus();await tick();
  assert.equal(list.innerHTML,original,'Starting refresh must preserve the visible snapshot');
  h.take('admin_wa_chats').reject(Error('offline'));h.take('admin_wa_list').resolve({ok:true,ventas:[]});await failed;await tick();
  assert.equal(list.innerHTML,original);assert.equal(total.textContent,'1');assert.equal(h.root.querySelector('.af-status').dataset.state,'error');assert.equal(h.root.querySelector('.af-retry').hidden,false);assert.equal(h.context.focusRequest,null);
  const invalid=h.context.loadFocus();await tick();h.take('admin_wa_chats').resolve({ok:true,chats:[]});h.take('admin_wa_list').resolve({ok:true,ventas:null});await invalid;await tick();
  assert.equal(list.innerHTML,original,'A malformed response must preserve the last complete snapshot');
  const retry=h.root.querySelector('.af-retry');retry.onclick();retry.onclick();await tick();
  assert.equal(h.pending.length,2,'Double retry must still issue one read per resource');const recovery=h.context.focusRequest.promise;h.complete([chat('1003')]);await recovery;
  assert(list.innerHTML.includes('phone:1003'));assert(!list.innerHTML.includes('phone:1001'));assert.equal(h.root.querySelector('.af-status').dataset.state,'ready');assert.equal(retry.hidden,true);
}
async function detachedLoadCannotTouchReplacement(){
  const h=harness(),load=h.context.loadFocus();await tick();
  const controller=h.context.focusController;controller.destroy();h.context.focusController=null;h.context.focusRoot=null;h.root.isConnected=false;
  const unchanged=h.root.querySelector('.af-list').innerHTML;
  h.complete();await load;
  assert.equal(h.root.querySelector('.af-list').innerHTML,unchanged);assert.equal(h.context.WAV.length,0,'Leaving the authenticated root must discard old data');
}
(async()=>{
  await concurrentLoads();await hiddenResultCannotReplaceNewSales();await navigationCannotStealLaterSelection();await errorsPreserveSnapshotAndAllowRetry();await detachedLoadCannotTouchReplacement();
  console.log('OK: focus integration coalesces concurrent loads, preserves newer sales and later chat selection, keeps snapshots on failure, retries once, and discards detached results. Actual integration/API/module; no network.');
})().catch(error=>{console.error(error);process.exitCode=1;});
