const assert=require('node:assert/strict');
const {setup,headers}=require('./check-paypal.cjs');
const buyer='buyer@example.test';
function fixture(env='live'){
 const t=setup(env);Object.assign(t.props,{PAYPAL_HOSTED_AUTO:'true',PAYPAL_MERCHANT_ID:'TESTMERCHANT'});
 const original=t.c.ppCall_;let resources=0;
 t.c.ppCall_=(c,path,method,body,key)=>{
  if(path==='/v1/checkout/payment-resources'){
   resources++;t.body=body;assert.equal(body.line_items[0].unit_amount.value,'3.17');assert.ok(key.endsWith('-hosted'));
   return {id:'PLB-TEST12345678',links:[{rel:'payment_link',href:'https://'+(env==='live'?'www.paypal.com':'www.sandbox.paypal.com')+'/ncp/payment/PLB-TEST12345678'}]};
  }return original(c,path,method,body,key);
 };
 const email=env==='sandbox'?'admin@example.test':buyer;
 const p=t.c.ppHandle_({action:'paypal_hosted_create',producto:'chatgpt',total:'0.01',paid:true},email);
 const remote={id:'ORDER12345678',intent:'CAPTURE',status:'COMPLETED',purchase_units:[{reference_id:'default',payee:{merchant_id:'TESTMERCHANT'},amount:{currency_code:'USD',value:'3.17'},items:[{sku:p.ref,item_id:'PLB-TEST12345678',quantity:'1',unit_amount:{currency_code:'USD',value:'3.17'}}],payments:{captures:[{id:'HOSTEDCAPTURE',status:'COMPLETED',amount:{currency_code:'USD',value:'3.17'},final_capture:true}]}}]};
 t.remote.set(remote.id,remote);return {t,p,remote,email};
}
const event=id=>({headers,event:{event_type:'PAYMENT.CAPTURE.COMPLETED',resource:{id:'HOSTEDCAPTURE',supplementary_data:{related_ids:{order_id:id}}}}});
let {t,p,remote,email}=fixture();
assert.equal(t.c.ppHandle_({action:'paypal_status',ref:p.ref},email).estado,'PENDIENTE');assert.equal(t.deliveries,0);
assert.throws(()=>t.c.ppHandle_({action:'paypal_status',ref:p.ref},'attacker@example.test'));
t.verify=false;assert.equal(t.c.ppWebhook_(event(remote.id)).ok,false);assert.equal(t.deliveries,0);t.verify=true;
assert.equal(t.c.ppWebhook_(event(remote.id)).estado,'ENTREGADO');
assert.equal(t.c.ppWebhook_(event(remote.id)).estado,'ENTREGADO');assert.equal(t.deliveries,1);assert.equal(t.captures,0);
assert.equal(t.c.ppHandle_({action:'paypal_status',ref:p.ref},email).estado,'ENTREGADO');
for(const mutate of [
 r=>r.purchase_units[0].items[0].sku='IAPP-AAAAAAAAAAAA',
 r=>r.purchase_units[0].items[0].item_id='PLB-OTHER1234567',
 r=>r.purchase_units[0].items[0].quantity='2',
 r=>r.purchase_units[0].amount.value='0.01',
 r=>r.purchase_units[0].items[0].unit_amount.value='0.01',
 r=>r.purchase_units[0].payee.merchant_id='ATTACKER',
 r=>r.status='APPROVED',
 r=>r.purchase_units[0].payments.captures[0].status='PENDING',
 r=>r.purchase_units[0].payments.captures[0].amount.value='0.01',
 r=>r.purchase_units[0].payments.captures[0].final_capture=false,
]){
 ({t,p,remote,email}=fixture());mutate(remote);try{t.c.ppWebhook_(event(remote.id));}catch{}
 assert.equal(t.deliveries,0);assert.equal(t.captures,0);
}
({t,p,remote,email}=fixture('sandbox'));assert.equal(t.c.ppWebhook_(event(remote.id)).estado,'SIMULACION');assert.equal(t.deliveries,0);
({t,p,remote,email}=fixture());t.crash=true;assert.throws(()=>t.c.ppWebhook_(event(remote.id)),/simulated/);assert.equal(t.deliveries,1);assert.equal(t.c.ppWebhook_(event(remote.id)).estado,'ENTREGADO');assert.equal(t.deliveries,1);
const another={...remote,id:'ORDER87654321'};t.remote.set(another.id,another);assert.throws(()=>t.c.ppWebhook_(event(another.id)));assert.equal(t.deliveries,1);
console.log('PASS: hosted links bind only verified immutable SKU/resource/merchant/amount; signature, ownership, replay, crash recovery and Sandbox isolation.');
