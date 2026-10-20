const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const addon=fs.readFileSync(path.join(__dirname,'../payments/PayPal.gs'),'utf8');
new vm.Script(fs.readFileSync(path.join(__dirname,'../backend/Code.gs'),'utf8'));
function setup(environment='live'){
  let sequence=0,orderSequence=0,captureCount=0,deliveries=0,crash=false,verifySuccess=true;
  const props={PAYPAL_ENABLED:'true',PAYPAL_ENV:environment,PAYPAL_CLIENT_ID:'public-test-client',PAYPAL_CLIENT_SECRET:'test-only-not-a-real-secret',PAYPAL_WEBHOOK_ID:'WEBHOOK-TEST'};
  const cache=new Map(),sheets=new Map(),remote=new Map();
  class Sheet{
    constructor(name,rows=[]){this.name=name;this.rows=rows;}
    getLastRow(){return this.rows.length;}
    appendRow(row){this.rows.push([...row]);return this;}
    getParent(){return {getSheetByName:name=>sheets.get(name),insertSheet:name=>{const sh=new Sheet(name);sheets.set(name,sh);return sh;}};}
    setFrozenRows(){return this;}
    getDataRange(){return {getValues:()=>this.rows.map(r=>[...r])};}
    getRange(n,c,height=1,width=1){return {
      getValue:()=>this.rows[n-1]?.[c-1]??'',
      getValues:()=>Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>this.rows[n+i-1]?.[c+j-1]??'')),
      setValue:value=>{while(this.rows.length<n)this.rows.push([]);this.rows[n-1][c-1]=value;return this;},
      setValues:values=>{for(let i=0;i<height;i++){while(this.rows.length<n+i)this.rows.push([]);for(let j=0;j<width;j++)this.rows[n+i-1][c+j-1]=values[i][j];}return {setFontWeight:()=>this};}
    };}
  }
  const accounts=new Sheet('Cuentas',[['Code','Product','Mail','Pass','Owner','State'],['STOCK','ChatGPT','fixture@example.test','not-a-real-password','','Disponible']]);
  const orders=new Sheet('Pedidos',[['Ref','Email','Product','COP','State','Date','Transaction','Account','Note']]);sheets.set('Pedidos',orders);
  const response=(json,status=200)=>({getResponseCode:()=>status,getContentText:()=>JSON.stringify(json)});
  const context={Date,JSON,Number,String,Object,Array,Math,RegExp,Error,CATALOGO:{chatgpt:{name:'ChatGPT',match:['chatgpt'],price:10000,dias:30},chatgpt3:{name:'ChatGPT 3 meses',match:['chatgpt'],price:20000,dias:90},chatgpt6:{name:'ChatGPT 6 meses',match:['chatgpt'],price:50000,dias:180},canva:{name:'Canva',match:['canva'],price:10000,dias:30}},CAP_PAGOS:Infinity,TIENDA_URL:'https://shop.example.test/',NAME_:'Fixture Customer',
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key],setProperties:values=>Object.assign(props,values)})},
    CacheService:{getScriptCache:()=>({get:key=>cache.get(key),put:(key,value)=>cache.set(key,value)})},
    SpreadsheetApp:{flush:()=>{}},Utilities:{base64Encode:value=>Buffer.from(value).toString('base64')},
    sha256hex_:value=>crypto.createHash('sha256').update(value).digest('hex'),fail_:message=>new Error(message),
    sheet_:()=>accounts,ordersSheet_:()=>orders,findOrder_:(sh,ref)=>{const n=sh.rows.findIndex(r=>r[0]===ref);return n<1?0:n+1;},
    randStr_:(n)=>String.fromCharCode(65+(++sequence%26)).repeat(n),cuentasConCupo_:()=>[{fila:2}],isAdmin_:email=>email==='admin@example.test',
    newCode_:()=>`TEST-CODE-${deliveries}`,txt_:s=>s,avisar_:()=>{},log_:()=>{},
    putRow_:(sh,row)=>{deliveries++;sh.appendRow(row);if(crash){crash=false;throw Error('simulated interruption after inventory write');}},
    UrlFetchApp:{fetch:(url,options={})=>{
      if(url.endsWith('/v1/oauth2/token'))return response({access_token:'mock-token',expires_in:3600});
      if(url.endsWith('/v1/notifications/verify-webhook-signature'))return response({verification_status:verifySuccess?'SUCCESS':'FAILURE'});
      if(url.endsWith('/v2/checkout/orders')){
        const payload=JSON.parse(options.payload),id='ORDER'+String(++orderSequence).padStart(8,'0');
        const order={id,intent:payload.intent,status:'APPROVED',purchase_units:payload.purchase_units.map(u=>({...u,payee:{merchant_id:'TESTMERCHANT'}})),links:[{rel:'payer-action',href:(environment==='live'?'https://www.paypal.com/':'https://www.sandbox.paypal.com/')+'checkoutnow?token='+id}]};remote.set(id,order);return response(order,201);
      }
      const match=url.match(/\/v2\/checkout\/orders\/(ORDER\d+)(\/capture)?$/);if(!match||!remote.has(match[1]))return response({},404);
      const order=remote.get(match[1]);
      if(match[2]){captureCount++;assert.ok(options.headers['PayPal-Request-Id'].endsWith('-capture'));order.status='COMPLETED';order.purchase_units[0].payments={captures:[{id:'CAPTURE'+String(orderSequence).padStart(8,'0'),status:'COMPLETED',amount:{...order.purchase_units[0].amount},final_capture:true}]};}
      return response(order);
    }}
  };
  vm.createContext(context);vm.runInContext(addon,context);
  return {c:context,props,cache,accounts,orders,remote,get captures(){return captureCount;},get deliveries(){return deliveries;},set crash(value){crash=value;},set verify(value){verifySuccess=value;}};
}
const customer='customer@example.test';
function purchase(t,product='chatgpt3',email=customer){const q=t.c.ppQuote_({producto:product},email);const p=t.c.ppCreate_({quote:q.quote,total:'0.01',producto:'canva'},email);return {q,p};}
let t=setup();assert.equal(t.c.ppCents_('3.17'),317);for(const invalid of ['3.170','1e2','0','-1','abc'])assert.equal(t.c.ppCents_(invalid),0);
assert.equal(t.c.ppStatus_().env,'live');
let {q,p}=purchase(t);assert.equal(q.total,'6.34');assert.equal(q.days,90);assert.ok(p.approveUrl.startsWith('https://www.paypal.com/'));
assert.equal(t.remote.get(p.id).purchase_units[0].amount.value,'6.34');
assert.throws(()=>t.c.ppOwned_({ref:p.ref},'intruder@example.test'));
assert.throws(()=>t.c.ppOwned_({ref:p.ref,id:'WRONG'},customer));
assert.equal(t.c.ppCreate_({quote:q.quote},customer).id,p.id);assert.equal(t.remote.size,1);
assert.equal(t.c.ppHandle_({action:'paypal_confirm',ref:p.ref,id:p.id},customer).estado,'ENTREGADO');
assert.equal(t.deliveries,1);assert.equal(t.captures,1);assert.equal(t.accounts.rows.at(-1)[7],90);assert.equal(t.accounts.rows.at(-1)[12],0);
assert.equal(t.c.ppHandle_({action:'paypal_confirm',ref:p.ref,id:p.id},customer).estado,'ENTREGADO');assert.equal(t.deliveries,1);assert.equal(t.captures,1);
t=setup();({q,p}=purchase(t));t.remote.get(p.id).purchase_units[0].amount.value='0.01';assert.throws(()=>t.c.ppHandle_({action:'paypal_confirm',ref:p.ref},customer));assert.equal(t.captures,0);assert.equal(t.deliveries,0);
t=setup();({q,p}=purchase(t));t.remote.get(p.id).purchase_units[0].custom_id='ANOTHER-REF';assert.throws(()=>t.c.ppHandle_({action:'paypal_confirm',ref:p.ref},customer));assert.equal(t.deliveries,0);
t=setup();({q,p}=purchase(t));t.remote.get(p.id).status='CREATED';assert.equal(t.c.ppHandle_({action:'paypal_confirm',ref:p.ref},customer).estado,'PENDIENTE');assert.equal(t.captures,0);assert.equal(t.deliveries,0);
t=setup();({q,p}=purchase(t));t.crash=true;assert.throws(()=>t.c.ppHandle_({action:'paypal_confirm',ref:p.ref},customer),/simulated/);assert.equal(t.deliveries,1);assert.equal(t.c.ppHandle_({action:'paypal_confirm',ref:p.ref},customer).estado,'ENTREGADO');assert.equal(t.deliveries,1);assert.equal(t.captures,1);
t=setup('sandbox');({q,p}=purchase(t,'chatgpt3','admin@example.test'));assert.equal(t.c.ppHandle_({action:'paypal_confirm',ref:p.ref},'admin@example.test').estado,'SIMULACION');assert.equal(t.deliveries,0);
t=setup('sandbox');assert.throws(()=>t.c.ppQuote_({producto:'chatgpt'},customer));
t=setup();t.props.PAYPAL_ENABLED='false';assert.throws(()=>t.c.ppQuote_({producto:'chatgpt'},customer));assert.equal(t.remote.size,0);
t=setup();assert.throws(()=>t.c.ppQuote_({producto:'canva'},customer));q=t.c.ppQuote_({producto:'chatgpt'},customer);t.c.CATALOGO.chatgpt.price=999;assert.throws(()=>t.c.ppCreate_({quote:q.quote},customer));
t=setup();({q,p}=purchase(t));const event={event_type:'CHECKOUT.ORDER.APPROVED',resource:{id:p.id}},headers={'paypal-transmission-id':'TRANS','paypal-transmission-time':new Date().toISOString(),'paypal-transmission-sig':'test-signature','paypal-auth-algo':'SHA256withRSA','paypal-cert-url':'https://api.paypal.com/v1/notifications/certs/TEST'};
t.verify=false;assert.equal(t.c.ppWebhook_({event,headers}).ok,false);assert.equal(t.captures,0);t.verify=true;assert.equal(t.c.ppWebhook_({event,headers}).estado,'ENTREGADO');assert.equal(t.deliveries,1);assert.equal(t.c.ppWebhook_({event,headers}).estado,'ENTREGADO');assert.equal(t.deliveries,1);assert.equal(t.captures,1);
for(const file of ['paypal-checkout.js','admin-paypal.js','pago.js'])new vm.Script(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
console.log('PASS: USD prices; ownership; altered amount/reference rejection; pending payments; stable order/capture idempotency; crash recovery; sandbox isolation; webhook verification and replay. No external requests or real charges.');
