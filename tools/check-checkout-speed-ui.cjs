const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require(require.resolve('jsdom',{paths:[process.cwd()+'/outputs/paypal-qa']}));
const tick=()=>new Promise(r=>setImmediate(r));
const purchase={ok:true,provider:'paypal',checkout:'hosted',env:'live',ref:'IAPP-ABCDEFGHJKLM',id:'',name:'ChatGPT Plus 1 mes',days:30,total:'3.17',approveUrl:'https://www.paypal.com/ncp/payment/PLB-TEST12345678'};
async function setup(options={}){
 const dom=new JSDOM('<button data-paypal="chatgpt">Pagar</button>',{url:'https://shop.example.test/',runScripts:'outside-only'}),w=dom.window,calls=[],timers=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 Object.assign(w,{CONFIG:{API_URL:'https://api.example.test'},fetch:async()=>({json:async()=>({ready:true,prices:{}})}),user:options.loggedOut?null:{email:'buyer@example.test'},esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),save:(k,v)=>w.localStorage.setItem(k,JSON.stringify(v)),load:(k,d)=>JSON.parse(w.localStorage.getItem(k)||'null')||d,renderGrid:()=>{},toast:()=>{},openLogin:()=>calls.push({action:'login'})});
 w.setTimeout=(fn,ms)=>{timers.push({fn,ms});return timers.length;};w.clearTimeout=()=>{};
 if(options.pending)w.save('iap_hosted_pending:buyer@example.test',options.pending);
 w.apiRaw=async b=>{
   calls.push(b);
   if(b.action==='paypal_hosted_create'){
     await options.onCreate?.(w);if(options.error)throw Error(options.error);
     return options.startState?{ok:true,ref:purchase.ref,estado:options.startState}:options.purchase||purchase;
   }
   await options.onStatus?.(w);return {ok:true,estado:options.state||'PENDIENTE',checkout:purchase};
 };
 w.eval(fs.readFileSync('paypal-hosted-auto.js','utf8'));w.document.querySelector('[data-paypal]').click();await tick();await tick();
 return {w,calls,timers,close:()=>w.close()};
}
(async()=>{
 let t=await setup({loggedOut:true});assert.deepEqual(t.calls.map(x=>x.action),['login']);t.close();
 t=await setup();assert.equal(t.calls.length,1);assert.ok(t.w.document.querySelector('[data-pay]'));assert.equal(t.w.localStorage.getItem('iap_has'),null);assert.equal(t.timers.length,0,'no polling while customer has not opened PayPal');t.close();
 t=await setup({pending:purchase});assert.equal(t.calls.length,1);assert.equal(t.calls[0].action,'paypal_hosted_create');assert.equal(t.calls[0].pendingRef,purchase.ref);assert.ok(t.w.document.querySelector('[data-pay]'));t.close();
 t=await setup({pending:purchase,startState:'ENTREGADO'});assert.match(t.w.document.body.textContent,/ya está activa/);assert.equal(t.w.load('iap_has'),true);assert.equal(t.w.document.querySelector('[data-pay]'),null);t.close();
 t=await setup({startState:'APROBADO_SIN_STOCK'});assert.equal(t.w.localStorage.getItem('iap_has'),null);assert.match(t.w.document.body.textContent,/pago está registrado/);t.close();
 t=await setup({state:'ENTREGADO'});t.w.document.querySelector('[data-review]').click();await tick();assert.match(t.w.document.body.textContent,/suscripción está activa/);assert.equal(t.w.load('iap_has'),true);t.close();
 t=await setup({pending:purchase,error:'Error de red'});assert.equal(t.calls.length,1);assert.equal(t.w.load('iap_hosted_pending:buyer@example.test').ref,purchase.ref);t.close();
 t=await setup({purchase:{...purchase,approveUrl:'https://evil.example/pay'}});assert.equal(t.w.document.querySelector('[data-pay]'),null);t.close();
 t=await setup({onCreate:w=>w.user={email:'other@example.test'}});assert.equal(t.w.document.querySelector('[data-pay]'),null);t.close();
 t=await setup({state:'ENTREGADO',onStatus:w=>w.user={email:'other@example.test'}});t.w.document.querySelector('[data-review]').click();await tick();assert.equal(t.w.localStorage.getItem('iap_has'),null);t.close();
 let release;t=await setup({onCreate:()=>new Promise(r=>release=r)});t.w.document.querySelector('[data-close]').click();t.w.document.querySelector('[data-paypal]').click();await tick();assert.equal(t.calls.length,1,'close and reopen shares the in-flight preparation');release();await tick();await tick();assert.ok(t.w.document.querySelector('[data-pay]'));t.close();
 t=await setup();const pay=t.w.document.querySelector('[data-pay]');pay.addEventListener('click',e=>e.preventDefault());pay.click();assert.equal(t.timers[0].ms,4000);t.w.dispatchEvent(new t.w.Event('focus'));await tick();assert.equal(t.calls.at(-1).action,'paypal_status');t.close();
 console.log('PASS: one request with pending order; no idle polling; in-flight deduplication; return-to-tab review; authenticated server-only activation; safe URLs and session changes.');
})().catch(e=>{console.error(e);process.exitCode=1});
