const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {buildQueue,pageOf,waitLabel,LIMITS}=require('../admin-focus.js');
const now=Date.UTC(2026,10,4,18),hour=3600000;
const chat=(tel,extra={})=>({tel:String(tel),nombre:'Cliente '+tel,ts:now-hour,quien:'u',ultimo:'Necesito información',etiquetas:[],...extra});
const sale=(id,extra={})=>({id,telefono:'1',nombre:'Cliente 1',fecha:new Date(now-hour).toISOString(),estado:'POR CONFIRMAR',producto:'ChatGPT',...extra});
assert.equal(buildQueue().total,0);
assert.equal(buildQueue({chats:[null,{},chat('',{})],sales:[null,{}],now}).total,0);
assert.equal(buildQueue({chats:[chat(1,{quien:'a',etiquetas:['pago']})],now}).total,0,'A payment tag is not an unconfirmed financial record');
assert.equal(buildQueue({chats:[chat(1,{sinDatos:true})],now}).total,0,'Missing history cannot prove that a customer is waiting');
assert.equal(buildQueue({chats:[chat(1,{quien:'a',ultimo:'No pude completar la respuesta automática'})],now}).counts.reply,1);
assert.equal(buildQueue({chats:[chat(1),chat('+1',{quien:'a',ts:now,ultimo:'Aquí tienes la información'})],now}).total,0,'Only the newest chat controls the reply state');
assert.equal(buildQueue({chats:[chat(1,{ts:String(now),quien:'a',ultimo:'Listo'}),chat(1)],now}).total,0,'Numeric string timestamps must deduplicate correctly');
const combined=buildQueue({chats:[chat('+57 300 100',{etiquetas:['urgente','queja']})],sales:[sale('pay',{telefono:'57300100'}),sale('link',{telefono:'57300100',estado:'CONFIRMADO (enviar a mano)'})],now});
assert.equal(combined.total,1);assert.deepEqual(combined.counts,{support:1,reply:1,payment:1,delivery:1});assert.equal(combined.rows[0].orderIds.length,2);
assert.equal(buildQueue({sales:[sale('x'),sale('x')],now}).rows[0].orderIds.length,1,'Duplicate orders cannot inflate queue records');
assert.equal(buildQueue({sales:[sale('x'),sale('x',{fecha:new Date(now).toISOString(),estado:'CONFIRMADO'})],now}).total,0,'A newer confirmed state removes the payment exception');
for(const state of ['CONFIRMADO','AUTO-CONFIRMADO','RECHAZADO','ATENDIDO','NO VERIFICADO','UNKNOWN'])assert.equal(buildQueue({sales:[sale('x',{estado:state,enqueued:true,delivered:false})],now}).total,0,'Queueing a message does not establish delivery or an outstanding payment: '+state);
assert.equal(buildQueue({sales:[sale('help',{estado:'NECESITA AYUDA'})],now}).counts.support,1);
assert.equal(buildQueue({sales:[sale('claim',{estado:'RECLAMO'})],now}).counts.support,1);
const noPhone=buildQueue({sales:[sale('no-phone',{telefono:''})],now});assert.equal(noPhone.total,1);assert.equal(noPhone.rows[0].phone,'');assert.equal(noPhone.rows[0].id,'order:no-phone');
const priorities=buildQueue({chats:[chat(1,{ts:now-hour*40}),chat(2,{ts:now-hour*2}),chat(3,{ts:now,etiquetas:['urgente']}),chat(4,{ts:0})],now});
assert.deepEqual(priorities.rows.map(row=>row.phone),['3','1','2','4']);
assert.deepEqual(pageOf(priorities.rows,{sort:'oldest'}).items.map(row=>row.phone),['1','2','3','4']);
assert.equal(waitLabel(0,now),'Sin fecha');assert.equal(waitLabel(now+hour,now),'Ahora');assert.equal(waitLabel(now-5*60000,now),'5 min');assert.equal(waitLabel(now-hour*3,now),'3 h');assert.equal(waitLabel(now-hour*48,now),'2 d');
const escaped=buildQueue({chats:[chat(1,{nombre:'Ángela <img src=x onerror=alert(1)>',ultimo:'<script>alert(1)</script>'})],now});
assert.equal(pageOf(escaped.rows,{query:'angela'}).total,1);
const elapsed=[];
for(const size of [500,1000]){
  const chats=Object.freeze(Array.from({length:size},(_,i)=>Object.freeze(chat(i+1,{nombre:'Cliente '+i,ts:now-(i+1)*60000,etiquetas:Object.freeze(i%10===0?['queja']:[])}))));
  const sales=Object.freeze(Array.from({length:size/5},(_,i)=>Object.freeze(sale('order-'+i,{telefono:String(i*5+1),estado:i%2?'POR CONFIRMAR':'CONFIRMADO (enviar a mano)'}))));
  const before=JSON.stringify({chats,sales}),started=performance.now(),queue=buildQueue({chats,sales,now}),seen=new Set();
  assert.equal(queue.total,size);assert.equal(queue.counts.reply,size);assert.equal(queue.counts.support,size/10);
  for(let page=0;page<Math.ceil(size/LIMITS.page);page++){const result=pageOf(queue.rows,{page});assert(result.items.length<=LIMITS.page);result.items.forEach(row=>seen.add(row.id));}
  assert.equal(seen.size,size,'Every pending client must remain reachable');
  assert.equal(pageOf(queue.rows,{query:'Cliente '+(size-1)}).items[0].name,'Cliente '+(size-1),'Search must include clients beyond the first page');
  assert.equal(pageOf(queue.rows,{filter:'support'}).total,size/10);assert.equal(pageOf(queue.rows,{page:1e9}).page,Math.ceil(size/LIMITS.page)-1);assert.equal(pageOf(queue.rows,{page:-1}).page,0);
  assert.equal(JSON.stringify({chats,sales}),before,'Computing the queue cannot mutate chat, sale or plan records');
  elapsed.push(`${size}: ${Math.round(performance.now()-started)} ms`);
}
const source=fs.readFileSync('admin-focus.js','utf8');
assert(!/\bfetch\s*\(|XMLHttpRequest|setInterval|setTimeout|localStorage|sessionStorage|admin_wa_send|admin_wa_confirm|\.clave\b|\.codigo\b/.test(source),'The module must have no requests, timers, writes or access credentials');
class Element{
  constructor(){this.nodes=new Map();this.attributes=new Map();this.isConnected=true;this.innerHTML='';this.dataset={};this.value='';}
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Element());return this.nodes.get(selector);}
  setAttribute(name,value){this.attributes.set(name,value);}
}
async function ui(){
  const context=vm.createContext({console,Date,Map,Set,WeakMap});vm.runInContext(source,context);
  const navigation=[],root=new Element(),$=selector=>root.querySelector(selector);let retries=0,rejectRetry;
  const callbacks={openChat:phone=>navigation.push(['chat',phone]),openSales:(id,phone)=>navigation.push(['sales',id,phone]),onRetry:()=>{retries++;return new Promise((resolve,reject)=>rejectRetry=reject);}};
  let controller=context.IAPAdminFocus.mount(root,callbacks);
  const selectFilter=filter=>root.onclick({target:{closest:selector=>selector==='[data-focus-filter]'?{dataset:{focusFilter:filter}}:null}});
  const open=(id,action)=>root.onclick({target:{closest:selector=>selector==='[data-focus-open]'?{dataset:{focusOpen:id,focusAction:action}}:null}});
  assert.equal($('.af-total').textContent,'—');assert.equal(navigation.length,0);
  for(const size of [500,1000]){
    controller.update({chats:Array.from({length:size},(_,i)=>chat(i+1,{nombre:'Cliente '+i,ts:now-i*1000})),sales:[],now,updatedAt:now});
    const seen=new Set();
    for(let page=0;page<Math.ceil(size/LIMITS.page);page++){
      const rendered=[...$('.af-list').innerHTML.matchAll(/data-focus-row="([^"]+)"/g)];assert(rendered.length<=12,'The rendered DOM is bounded independently of snapshot size');rendered.forEach(match=>seen.add(match[1]));
      if(!$('.af-next').disabled)$('.af-next').onclick();
    }
    assert.equal(seen.size,size);assert.equal($('.af-next').disabled,true);assert.equal(navigation.length,0,'Rendering and paging cannot open a chat or perform an action');
    $('.af-search').oninput({target:{value:'Cliente '+(size-1)}});assert.equal(($('.af-list').innerHTML.match(/data-focus-row=/g)||[]).length,1);
    $('.af-search').oninput({target:{value:''}});
  }
  controller.update({chats:[chat(1,{nombre:'Ángela <img src=x onerror=alert(1)>',ultimo:'<script>alert(1)</script>',etiquetas:['urgente']})],sales:[sale('order-1')],now});
  const html=$('.af-list').innerHTML;assert(!html.includes('<img')&&!html.includes('<script>'));assert(html.includes('&lt;img')&&html.includes('&lt;script&gt;'));
  open('phone:1','chat');open('phone:1','sales');assert.deepEqual(navigation,[['chat','1'],['sales','order-1','1']]);
  open('phone:unknown','chat');open('phone:1','delete');assert.equal(navigation.length,2,'Only valid navigation actions are dispatched');
  selectFilter('payment');assert.equal($('[data-focus-filter="payment"]').attributes.get('aria-pressed'),'true');assert.equal($('.af-all').attributes.get('aria-pressed'),'false');
  $('.af-search').oninput({target:{value:'angela'}});const filtered=$('.af-list').innerHTML;
  controller.update({loading:true});assert.equal($('.af-list').innerHTML,filtered);assert.equal($('.af-list').attributes.get('aria-busy'),'true');
  controller.update({error:'offline'});assert.equal($('.af-list').innerHTML,filtered);assert.equal($('.af-status').dataset.state,'error');assert.equal($('.af-retry').hidden,false);
  controller.update({chats:[],sales:null});assert.equal($('.af-list').innerHTML,filtered,'An incomplete snapshot cannot wipe a valid view');
  $('.af-retry').onclick();$('.af-retry').onclick();assert.equal(retries,1,'Repeated retry clicks must not overlap');assert.equal($('.af-retry').hidden,true);assert.equal($('.af-list').innerHTML,filtered);
  rejectRetry(Error('offline'));await new Promise(resolve=>setImmediate(resolve));assert.equal($('.af-retry').hidden,false);assert.equal($('.af-list').innerHTML,filtered);
  controller.update({chats:[],sales:[],now});assert.equal($('.af-total').textContent,'0');assert.equal($('.af-retry').hidden,true);assert.equal($('.af-status').dataset.state,'ready');
  selectFilter('');$('.af-search').oninput({target:{value:''}});controller.update({chats:[],sales:[sale('without-number',{telefono:''})],now});assert(!$('.af-list').innerHTML.includes('data-focus-action="chat"'));open('order:without-number','sales');assert.deepEqual(navigation.at(-1),['sales','without-number','']);
  const oldController=controller;controller=context.IAPAdminFocus.mount(root,callbacks);controller.update({chats:[chat(2)],sales:[],now});const current=$('.af-list').innerHTML;oldController.update({chats:[],sales:[],now});assert.equal($('.af-list').innerHTML,current,'A destroyed controller cannot replace a new view');
  root.isConnected=false;controller.update({chats:[],sales:[],now});assert.equal($('.af-list').innerHTML,current,'Detached views cannot be rendered by late results');
  controller.destroy();assert.equal(root.onclick,null);assert.equal($('.af-search').oninput,null);assert.equal($('.af-next').onclick,null);assert.equal($('.af-retry').onclick,null);
}
ui().then(()=>console.log('OK: admin focus priorities, distinct clients/orders, payment semantics, full search/pagination, 500/1000 clients with max 12 rows, error/retry preservation, escaping, lifecycle and navigation only. '+elapsed.join('; '))).catch(error=>{console.error(error);process.exitCode=1;});
