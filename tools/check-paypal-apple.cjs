const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require(require.resolve('jsdom',{paths:[process.cwd()+'/outputs/paypal-qa']}));
const tick=()=>new Promise(r=>setTimeout(r,0));
async function setup(options={}) {
  const dom=new JSDOM('<section class="payment-method"></section><section class="payment-method" id="apple-method"><p id="apple-hint"></p><button id="apple-unavailable" disabled>Apple Pay</button><apple-pay-button id="apple-pay-button" hidden></apple-pay-button></section>',{url:'https://store.example.test',runScripts:'outside-only'});
  const w=dom.window,events=[],sessions=[];
  class Session {
    static STATUS_SUCCESS=1;static STATUS_FAILURE=0;
    static canMakePayments(){return options.device!==false;}
    constructor(version,quote){events.push('session');this.quote=quote;sessions.push(this);}
    begin(){events.push('begin');}abort(){events.push('abort');}
    completeMerchantValidation(v){events.push('merchant-validated');assert.equal(v,'verified');}
    completePayment(status){events.push('complete:'+status);}
  }
  w.ApplePaySession=Session;
  w.paypal={Applepay:()=>({
    config:async()=>{if(options.configError)throw Error('Unavailable');return {isEligible:options.eligible!==false,countryCode:'US',supportedNetworks:['visa'],merchantCapabilities:['supports3DS']};},
    validateMerchant:async()=>{if(options.invalidDomain)throw Error('Domain not registered');return {merchantSession:'verified'};},
    confirmOrder:async data=>{events.push('approve');assert.equal(data.orderId,'ORDER');assert.equal(data.token,'test-token');return {status:options.approval||'APPROVED'};}
  })};
  w.document.head.append=el=>{events.push('apple-sdk');el.onload();};
  w.eval(fs.readFileSync('paypal-apple.js','utf8'));
  await w.IAPApplePay({total:'10.87',send:data=>events.push(data.type),onError:()=>events.push('error'),request:async(type,data)=>{
    events.push(type);
    if(type==='iap-inline-create')return {id:'ORDER'};
    assert.equal(data.id,'ORDER');
    if(options.captureError)throw Error('Capture not verified');
    if(options.captureWait)await options.captureWait;
    return {state:options.state||'ENTREGADO'};
  }});
  const click=()=>w.document.getElementById('apple-pay-button').click();
  const pay=()=>sessions[0].onpaymentauthorized({payment:{token:'test-token',billingContact:{}}});
  return {w,events,sessions,click,pay,close:()=>w.close()};
}
(async()=>{
  for(const options of [{eligible:false},{device:false},{configError:true}]){
    const t=await setup(options);assert.equal(t.w.document.getElementById('apple-pay-button').hidden,true);assert.equal(t.sessions.length,0);assert.ok(!t.events.includes('iap-inline-create'));t.close();
  }
  let t=await setup({invalidDomain:true});t.click();await t.sessions[0].onvalidatemerchant({validationURL:'https://apple.example.test'});assert.ok(t.events.includes('abort'));assert.ok(!t.events.includes('iap-inline-create'));t.close();
  t=await setup();assert.equal(t.w.document.getElementById('apple-pay-button').hidden,false);assert.equal(t.events.includes('iap-inline-create'),false);t.click();t.click();assert.equal(t.sessions.length,1);assert.equal(t.sessions[0].quote.total.amount,'10.87');
  await t.sessions[0].onvalidatemerchant({validationURL:'https://apple.example.test'});await t.pay();await t.pay();
  assert.equal(t.events.filter(x=>x==='iap-inline-create').length,1);assert.ok(t.events.indexOf('iap-inline-apple-approved')<t.events.indexOf('complete:1'));assert.ok(t.events.indexOf('complete:1')<t.events.indexOf('iap-inline-apple-finished'));t.close();
  for(const options of [{captureError:true},{state:'PENDIENTE'},{approval:'PAYER_ACTION_REQUIRED'}]){
    t=await setup(options);t.click();await t.pay();assert.ok(t.events.includes('complete:0'));assert.ok(!t.events.includes('complete:1'));assert.ok(!t.events.includes('iap-inline-apple-finished'));t.close();
  }
  t=await setup({state:'APROBADO_SIN_STOCK'});t.click();await t.pay();assert.ok(t.events.includes('complete:1'));assert.ok(t.events.includes('iap-inline-apple-finished'));t.close();
  t=await setup();t.click();t.sessions[0].oncancel();await t.pay();assert.ok(!t.events.includes('iap-inline-create'));t.close();
  console.log('PASS: merchant/device gating, domain rejection, quote amount, no orders before authorization, duplicate protection, capture-before-success, pending/failed capture, stock failure and cancellation. Simulations only.');
})().catch(e=>{console.error(e);process.exit(1)});
