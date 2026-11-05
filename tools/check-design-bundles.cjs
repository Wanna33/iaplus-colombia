const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('backend/Code.gs','utf8'),addon=fs.readFileSync('payments/design-bundles.gs','utf8');
new vm.Script(source);
const {setup}=require('./check-paypal.cjs');
function extract(name){const i=source.indexOf('function '+name+'('),n=source.indexOf('\nfunction ',i+1);assert.ok(i>=0,name);return source.slice(i,n<0?source.length:n);}
function fixture(enabled=true){
 const t=setup();t.c.DAY=86400000;t.c.DEFAULT_DAYS=30;
 t.props.DESIGN_PROMO=JSON.stringify({enabled,startAt:Date.now()-1000,account:'capcut@example.test'});
 t.props.PAYPAL_USD_PRICES=JSON.stringify({chatgpt:'3.17',chatgpt3:'6.34',chatgpt6:'10.87',diseno6:'15.85'});
 t.c.CATALOGO.diseno6={name:'Diseño 6 meses · ChatGPT + CapCut',price:50000,dias:180,match:['chatgpt'],oculto:true};
 t.c.PropertiesService={getScriptProperties:()=>({getProperty:k=>t.props[k],getProperties:()=>({...t.props}),setProperty:(k,v)=>{t.props[k]=v;},setProperties:values=>Object.assign(t.props,values)})};
 t.accounts.appendRow(['CAPCUT-STOCK','CapCut Pro','capcut@example.test','fixture-only-secret','','Disponible']);
 vm.runInContext(addon,t.c);
 for(const n of ['plan_','cuentasConCupo_','ppStatus_','ppGuard_','ppQuote_','ppDeliver_'])vm.runInContext(extract(n),t.c);
 return t;
}
const buyer='buyer@example.test';
let t=fixture(false);
assert.equal(t.c.designSnapshot_('chatgpt3'),null);assert.throws(()=>t.c.designSnapshot_('diseno6'));
assert.equal(t.c.designFromNote_('Venta WhatsApp antigua'),null);
assert.equal(t.c.designValid_({version:1,product:'chatgpt3',days:30,created:1,startAt:2,account:'x'}),false);
function buy(t,id){const q=t.c.ppHandle_({action:'paypal_quote',producto:id,design:{days:999}},buyer);const p=t.c.ppHandle_({action:'paypal_create',quote:q.quote},buyer);return {q,p};}
let old=buy(t,'chatgpt3');t.props.DESIGN_PROMO=JSON.stringify({enabled:true,startAt:Date.now()-1000,account:'capcut@example.test'});
t.c.ppHandle_({action:'paypal_confirm',ref:old.p.ref,id:old.p.id},buyer);
assert.equal(t.accounts.rows.filter(r=>r[4]===buyer).length,1,'orders created before promotion never receive retroactive bonus');
for(const [id,chatDays,capDays] of [['chatgpt3',90,30],['diseno6',180,180]]){
 t=fixture();const {q,p}=buy(t,id);assert.equal(q.total,id==='diseno6'?'15.85':'6.34');
 assert.throws(()=>t.c.ppHandle_({action:'paypal_confirm',ref:p.ref,id:p.id},'attacker@example.test'));
 assert.equal(t.accounts.rows.filter(r=>r[4]===buyer).length,0);
 const result=t.c.ppHandle_({action:'paypal_confirm',ref:p.ref,id:p.id},buyer);assert.equal(result.estado,'ENTREGADO');
 t.c.ppHandle_({action:'paypal_confirm',ref:p.ref,id:p.id},buyer);
 const granted=t.accounts.rows.filter(r=>r[4]===buyer);assert.equal(granted.length,2);
 assert.equal(granted.find(r=>r[1]==='ChatGPT')[7],chatDays);assert.equal(granted.find(r=>r[1]==='CapCut Pro')[7],capDays);
 assert.equal(+granted[0][6],+granted[1][6]);assert.equal(granted[1][12],0,'bonus does not double count income');
}
t=fixture();let checkout=buy(t,'chatgpt3');t.props['INVENTARIO_APAGADA_capcut@example.test']='1';
assert.throws(()=>t.c.ppHandle_({action:'paypal_confirm',ref:checkout.p.ref,id:checkout.p.id},buyer));
assert.notEqual(t.orders.rows[1][4],'ENTREGADO');delete t.props['INVENTARIO_APAGADA_capcut@example.test'];
assert.equal(t.c.ppHandle_({action:'paypal_confirm',ref:checkout.p.ref,id:checkout.p.id},buyer).estado,'ENTREGADO');
assert.equal(t.accounts.rows.filter(r=>r[4]===buyer).length,2,'retry after stock failure must not duplicate either access');
t=fixture();t.props['INVENTARIO_APAGADA_capcut@example.test']='1';assert.throws(()=>buy(t,'diseno6'));assert.throws(()=>buy(t,'chatgpt3'));
t=fixture();const snap=t.c.designSnapshot_('chatgpt3');const note=t.c.designNote_('Venta WhatsApp WTEST',snap);
assert.equal(t.c.designFromNote_(note).days,30);
const start=new Date();t.accounts.appendRow(['PAID-WA','ChatGPT','fixture@example.test','fixture',buyer,'Activo',start,90,0,'',note,'',20000,'Buyer','']);
t.accounts.appendRow(['OLD-WA','ChatGPT','fixture@example.test','fixture','old@example.test','Activo',start,90,0,'','Venta WhatsApp antigua','',20000,'','']);
t.c.designPending_(t.accounts,buyer);t.c.designPending_(t.accounts,buyer);t.c.designPending_(t.accounts,'old@example.test');
assert.equal(t.accounts.rows.filter(r=>r[4]===buyer&&r[1]==='CapCut Pro').length,1);assert.equal(t.accounts.rows.filter(r=>r[4]==='old@example.test').length,1);
const D=require('../design-offers.js');const plans=[{id:'chatgpt3',price:20000},{id:'chatgpt6',price:35000}];
D.apply(plans,[{k:'chatgpt3',design:{active:true,available:true}},{k:'diseno6',price:50000,oculto:false,design:{available:true}}]);
assert.equal(plans.find(p=>p.id==='chatgpt3').bonusDays,30);assert.equal(plans.find(p=>p.id==='chatgpt6').price,35000);assert.equal(plans.find(p=>p.id==='diseno6').imageOnly,true);
assert.ok(D.imageIntent('ChatGPT para generar imágenes'));assert.ok(!D.imageIntent('ChatGPT para estudiar'));assert.ok(!D.imageIntent('No quiero crear imágenes'));
const help=require('../public-assistant.js');assert.ok(!(help.answer('precio de ChatGPT',plans).products||[]).some(p=>p.id==='diseno6'));assert.ok(help.answer('ChatGPT para generar imágenes',plans).products.some(p=>p.id==='diseno6'));
D.apply(plans,[]);assert.equal(plans.some(p=>p.id==='diseno6'),false);assert.equal(plans[0].bonusDays,0);
console.log('PASS: new-purchase-only promotion; separate expiries; $50000 / USD15.85 bundle; paid-order ownership; unavailable inventory; crash retry without duplicates; image-only offers; original six-month plan retained.');
