const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require(require.resolve('jsdom',{paths:[process.cwd()+'/outputs/paypal-qa']}));
const tick=()=>new Promise(r=>setImmediate(r));
const purchase={provider:'paypal',checkout:'hosted',env:'live',ref:'IAPP-ABCDEFGHJKLM',id:'',name:'ChatGPT Plus 1 mes',days:30,total:'3.17',approveUrl:'https://www.paypal.com/ncp/payment/PLB-TEST12345678'};
async function setup(options={}){
 const dom=new JSDOM('<button data-paypal="chatgpt">Pagar</button>',{url:'https://shop.example.test/',runScripts:'outside-only'}),w=dom.window,calls=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 Object.assign(w,{user:options.loggedOut?null:{email:'buyer@example.test'},esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),save:(k,v)=>w.localStorage.setItem(k,JSON.stringify(v)),load:(k,d)=>JSON.parse(w.localStorage.getItem(k)||'null')||d,renderGrid:()=>{},toast:()=>{},openLogin:()=>calls.push('login')});
 if(options.pending)w.save('iap_hosted_pending:buyer@example.test',options.pending);
 w.apiRaw=async b=>{calls.push(b.action);if(b.action==='paypal_hosted_create'){await options.onCreate?.(w);return options.purchase||purchase;}if(options.error)throw Error(options.error);await options.onStatus?.(w);return {ok:true,estado:options.state||'PENDIENTE',checkout:purchase};};
 w.eval(fs.readFileSync('paypal-hosted-auto.js','utf8'));w.document.querySelector('[data-paypal]').click();await tick();await tick();
 return {w,calls,close:()=>w.close()};
}
(async()=>{
 let t=await setup({loggedOut:true});assert.deepEqual(t.calls,['login']);t.close();
 t=await setup();assert.deepEqual(t.calls,['paypal_hosted_create']);assert.ok(t.w.document.querySelector('[data-pay]'));assert.equal(t.w.localStorage.getItem('iap_has'),null);t.close();
 t=await setup({pending:purchase});assert.deepEqual(t.calls,['paypal_status']);assert.ok(t.w.document.querySelector('[data-pay]'));t.close();
 t=await setup({pending:purchase,state:'ENTREGADO'});assert.match(t.w.document.body.textContent,/ya está activa/);assert.equal(t.w.load('iap_has'),true);assert.equal(t.w.document.querySelector('[data-pay]'),null);t.close();
 t=await setup({state:'ENTREGADO'});t.w.document.querySelector('[data-review]').click();await tick();assert.match(t.w.document.body.textContent,/suscripción está activa/);assert.equal(t.w.load('iap_has'),true);t.close();
 t=await setup({state:'APROBADO_SIN_STOCK'});t.w.document.querySelector('[data-review]').click();await tick();assert.equal(t.w.localStorage.getItem('iap_has'),null);assert.match(t.w.document.body.textContent,/último acceso/);t.close();
 t=await setup({pending:purchase,error:'No encontramos ese pedido para tu cuenta.'});assert.deepEqual(t.calls,['paypal_status','paypal_hosted_create']);t.close();
 t=await setup({pending:purchase,error:'Error de red'});assert.deepEqual(t.calls,['paypal_status']);assert.equal(t.w.load('iap_hosted_pending:buyer@example.test').ref,purchase.ref);t.close();
 t=await setup({purchase:{...purchase,approveUrl:'https://evil.example/pay'}});assert.equal(t.w.document.querySelector('[data-pay]'),null);t.close();
 t=await setup({onCreate:w=>w.user={email:'other@example.test'}});assert.equal(t.w.document.querySelector('[data-pay]'),null);t.close();
 t=await setup({state:'ENTREGADO',onStatus:w=>w.user={email:'other@example.test'}});t.w.document.querySelector('[data-review]').click();await tick();assert.equal(t.w.localStorage.getItem('iap_has'),null);t.close();
 console.log('PASS: login, single creation, pending resume, server-confirmed delivery, no-stock, network retention, safe URLs and session changes.');
})().catch(e=>{console.error(e);process.exitCode=1});
