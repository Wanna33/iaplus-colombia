const fs = require('node:fs');
const assert = require('node:assert/strict');
// Test-only dependency: npm install --prefix outputs/paypal-qa jsdom
const {JSDOM} = require(require.resolve('jsdom', {paths:[process.cwd(),process.cwd()+'/outputs/paypal-qa']}));
const tick = () => new Promise(resolve=>setTimeout(resolve,0));
const pending = {provider:'paypal',ref:'IAPP-AAAAAAAAAAAA',id:'OLDORDER',t:1};
async function setup(options={}) {
  const dom = new JSDOM('<body><button data-paypal="chatgpt6">Pagar</button></body>',{url:'https://store.example.test/',runScripts:'outside-only'});
  const w=dom.window, calls=[];
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
  if(options.pending) w.localStorage.setItem('iap_pay',JSON.stringify(options.pending));
  const quote={checkout:'embedded',env:'live',currency:'USD',clientId:'publicclientidwithtwentycharacters',total:'10.87',name:'6 meses',days:180,quote:'PPQ-'+ 'A'.repeat(20),expires:Date.now()+300000};
  Object.assign(w,{CONFIG:{API_URL:'https://api.example.test'},user:{email:'buyer@example.test'},load:(k,d)=>JSON.parse(w.localStorage.getItem(k)||'null')||d,save:(k,v)=>w.localStorage.setItem(k,JSON.stringify(v)),esc:s=>s,renderGrid:()=>{},postJson:async()=>({ok:true,ready:true,env:'live',checkoutVersion:options.version||2,prices:{chatgpt6:'10.87'}}),apiRaw:async b=>{
    calls.push(b.action);
    if(b.action==='paypal_status'){if(options.statusError)throw Error(options.statusError);return {estado:options.state||'PENDIENTE',checkout:quote};}
    if(b.action==='paypal_quote')return quote;
    if(b.action==='paypal_create')return {checkout:'embedded',total:'10.87',env:'live',ref:'IAPP-'+ 'B'.repeat(12),id:'NEWORDER'};
    if(b.action==='paypal_confirm')return {estado:'ENTREGADO'};
  }});
  w.eval(fs.readFileSync('paypal-inline.js','utf8'));await tick();w.document.querySelector('[data-paypal]').click();await tick();await tick();
  const send=(data,origin='https://store.example.test')=>{const f=w.document.querySelector('iframe');w.dispatchEvent(new w.MessageEvent('message',{source:f.contentWindow,origin,data}));};
  return {w,calls,send,close:()=>w.close(),hasFrame:()=>!!w.document.querySelector('iframe')};
}
(async()=>{
  let t=await setup({pending,statusError:'No encontramos ese pedido para tu cuenta.'});
  assert.deepEqual(t.calls,['paypal_status','paypal_quote']);assert.ok(t.hasFrame());assert.deepEqual(JSON.parse(t.w.localStorage.getItem('iap_paypal_last:buyer@example.test')),pending);t.close();
  t=await setup({pending:{...pending,owner:'another@example.test'}});assert.deepEqual(t.calls,['paypal_quote']);assert.ok(t.hasFrame());assert.equal(JSON.parse(t.w.localStorage.getItem('iap_pay')).owner,'another@example.test');t.close();
  t=await setup({pending,statusError:'No hay conexión con el servidor.'});assert.deepEqual(t.calls,['paypal_status']);assert.ok(!t.hasFrame());assert.match(t.w.document.body.textContent,/Volver a intentar/);assert.deepEqual(JSON.parse(t.w.localStorage.getItem('iap_pay')),pending);t.close();
  t=await setup({pending});assert.deepEqual(t.calls,['paypal_status']);t.send({type:'iap-inline-create',request:'1'});await tick();assert.ok(!t.calls.includes('paypal_create'));t.close();
  t=await setup({pending,state:'ENTREGADO'});assert.ok(!t.hasFrame());assert.match(t.w.document.body.textContent,/ya está activa/);t.w.document.querySelector('[data-new]').click();await tick();await tick();assert.ok(t.hasFrame());assert.equal(t.calls.filter(x=>x==='paypal_quote').length,1);t.close();
  t=await setup();t.send({type:'iap-inline-create',request:'1'},'https://evil.example');await tick();assert.equal(t.calls.length,1);
  t.send({type:'iap-inline-create',request:'2'});await tick();t.send({type:'iap-inline-create',request:'3'});await tick();assert.equal(t.calls.filter(x=>x==='paypal_create').length,1);assert.equal(JSON.parse(t.w.localStorage.getItem('iap_paypal_pending:buyer@example.test')).id,'NEWORDER');
  t.send({type:'iap-inline-approved',id:'WRONG',request:'4'});await tick();assert.ok(!t.calls.includes('paypal_confirm'));
  t.send({type:'iap-inline-approved',id:'NEWORDER',request:'5'});await tick();assert.equal(t.calls.filter(x=>x==='paypal_confirm').length,1);assert.match(t.w.document.body.textContent,/Tu cuenta está lista/);assert.equal(JSON.parse(t.w.localStorage.getItem('iap_pay')),null);t.close();
  t=await setup();t.w.user={email:'changed@example.test'};t.send({type:'iap-inline-create',request:'6'});await tick();assert.ok(!t.calls.includes('paypal_create'));t.close();
  t=await setup({version:1});assert.ok(!t.hasFrame());t.close();
  console.log('PASS: stale and foreign pending orders, isolated accounts, network retention, pending reuse, completed purchase, session change, origin checks, single creation and server-confirmed delivery. No real charges.');
})().catch(error=>{console.error(error);process.exit(1)});
