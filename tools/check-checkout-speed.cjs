const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {setup}=require('./check-paypal.cjs');
const current=fs.readFileSync('backend/Code.gs','utf8'),before=fs.readFileSync('backend/backups/before-checkout-speed-v57.gs','utf8');
function fixture(source){
 const t=setup(),metrics={properties:0,inventory:0,resources:0};
 Object.assign(t.props,{PAYPAL_MERCHANT_ID:'TESTMERCHANT',PAYPAL_HOSTED_AUTO:'true'});
 t.c.PropertiesService={getScriptProperties:()=>({getProperty:k=>{metrics.properties++;return t.props[k];},getProperties:()=>{metrics.properties++;return {...t.props};}})};
 const values=t.accounts.getDataRange.bind(t.accounts);t.accounts.getDataRange=()=>{metrics.inventory++;return values();};
 for(const m of source.matchAll(/^function (pp\w+_|design\w+_)\(/gm)){
   const end=source.indexOf('\nfunction ',m.index+1);vm.runInContext(source.slice(m.index,end<0?source.length:end),t.c);
 }
 const original=t.c.ppCall_;t.c.ppCall_=(c,p,method,body,key)=>{
   if(p==='/v1/checkout/payment-resources'){
     metrics.resources++;if(t.failCreate){t.failCreate=false;throw Error('temporary provider error');}
     assert.equal(body.line_items[0].collect_shipping_address,false);
     const id='PLB-TEST'+String(metrics.resources).padStart(8,'0');return {id,links:[{rel:'payment_link',href:'https://www.paypal.com/ncp/payment/'+id}]};
   }return original(c,p,method,body,key);
 };
 return {...t,metrics};
}
const buyer='buyer@example.test',body={action:'paypal_hosted_create',producto:'chatgpt'};
let old=fixture(before),fast=fixture(current);
old.c.ppHandle_(body,buyer);let p=fast.c.ppHandle_(body,buyer);
assert.ok(fast.metrics.properties<old.metrics.properties);assert.equal(fast.metrics.inventory,1);assert.equal(old.metrics.inventory,2);
console.log('Creation service reads:',JSON.stringify({before:old.metrics,after:fast.metrics}));
assert.equal(fast.c.ppHandle_({...body,pendingRef:p.ref},buyer).ref,p.ref);assert.equal(fast.metrics.resources,1);
let other=fast.c.ppHandle_({...body,producto:'chatgpt3',pendingRef:p.ref,total:'0.01'},buyer);assert.notEqual(other.ref,p.ref);assert.equal(other.total,'6.34');
assert.equal(fast.c.ppHandle_({...body,producto:'chatgpt3',pendingRef:'IAPP-ZZZZZZZZZZZZ'},buyer).ref,other.ref);
const outsider=fast.c.ppHandle_({...body,pendingRef:p.ref},'other@example.test');assert.notEqual(outsider.ref,p.ref);
assert.equal(fast.c.ppFind_(0,p.ref).data.email,buyer);
let bound=fast.c.ppFind_(0,p.ref);bound.id='ORDER12345678';fast.c.ppSave_(bound);
fast.remote.set(bound.id,{id:bound.id,intent:'CAPTURE',status:'CREATED',purchase_units:[{payee:{merchant_id:'TESTMERCHANT'},amount:{currency_code:'USD',value:'3.17'},items:[{sku:p.ref,item_id:bound.data.resource,quantity:'1',unit_amount:{currency_code:'USD',value:'3.17'}}]}]});
assert.equal(fast.c.ppHandle_({...body,pendingRef:p.ref},buyer).approveUrl,p.approveUrl,'bound but unpaid order retains its link');
assert.equal(fast.c.ppHandle_({...body,producto:'chatgpt3',pendingRef:p.ref},buyer).ref,other.ref,'an unpaid bound order does not replace the selected plan');
let paid=fast.c.ppFind_(0,p.ref);paid.state='ENTREGADO';fast.c.ppSave_(paid);const count=fast.metrics.resources;
assert.equal(fast.c.ppHandle_({...body,pendingRef:p.ref},buyer).estado,'ENTREGADO');assert.equal(fast.metrics.resources,count);
fast=fixture(current);fast.c.CATALOGO.chatgpt.oculto=true;assert.throws(()=>fast.c.ppHandle_(body,buyer));assert.equal(fast.metrics.resources,0);
fast=fixture(current);fast.c.cuentasConCupo_=()=>[];assert.throws(()=>fast.c.ppHandle_(body,buyer));assert.equal(fast.metrics.resources,0);
fast=fixture(current);
// Provider failures retain the same server-owned reference for a retry.
const orig=fast.c.ppCall_;let failed=false;fast.c.ppCall_=(...args)=>{if(!failed&&args[1]==='/v1/checkout/payment-resources'){failed=true;throw Error('temporary');}return orig(...args);};
assert.throws(()=>fast.c.ppHandle_(body,buyer),/temporary/);const ref=fast.orders.rows[1][0];
assert.equal(fast.c.ppHandle_(body,buyer).ref,ref);assert.equal(fast.orders.rows.length,2);
assert.equal(require('./patch-checkout-speed.cjs').patch(current),current);
console.log('PASS: one inventory check; fewer property reads; same-order retry; selected plan; private ownership; paid-order recovery; stock and hidden-product guards preserved.');
