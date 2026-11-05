const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {patch}=require('./patch-account-availability.cjs');
const source=fs.readFileSync('backend/Code.gs','utf8');
assert.equal(patch(source),source,'patch must be safe to rerun');
const now=new Date(),rows=[[],
 ['A','ChatGPT','active@example.test','visible-secret','buyer@example.test','Activo',now,30,0,'','', '',0,'Buyer',''],
 ['B','ChatGPT','other@example.test','private-secret','other@example.test','Activo',now,30,0,'','', '',0,'Other',''],
 ['C','ChatGPT','expired@example.test','expired-secret','buyer@example.test','Activo',new Date(Date.now()-90*86400000),30,0,'','', '',0,'Buyer',''],
 ['D','ChatGPT','hidden@example.test','hidden-secret','buyer@example.test','Activo',now,30,0,'','', '',0,'Buyer','']];
const props={'INVENTARIO_APAGADA_hidden@example.test':'1','TOTP_active@example.test':'secret-for-test',LIM2FA:'{"buyer@example.test":{"fijo":7}}'};
let lockAvailable=false,tries=0,waits=0,releases=0,syncs=0,flushes=0,propertyReads=0;
const lock={tryLock:ms=>{assert.equal(ms,1);tries++;return lockAvailable;},waitLock:()=>{waits++;throw Error('lock occupied');},releaseLock:()=>releases++};
const ctx={console,Date,PropertiesService:{getScriptProperties:()=>({getProperty:k=>{propertyReads++;return props[k];},getProperties:()=>{propertyReads++;return {...props};}})},
 CacheService:{getScriptCache:()=>({get:()=>1})},LockService:{getScriptLock:()=>lock},SpreadsheetApp:{flush:()=>flushes++},
 ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})}};
vm.createContext(ctx);vm.runInContext(source,ctx);
ctx.sheet_=()=>({getDataRange:()=>({getValues:()=>rows})});ctx.log_=()=>{};ctx.autoAgregar_=()=>{syncs++;return {accesosAgregados:1};};ctx.aplicarCatalogo_=()=>{};
ctx.verify_=token=>{if(token!=='valid')throw ctx.fail_('Inicia sesión con Google.');return 'buyer@example.test';};
function post(body){return JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(body)}}).text);}
const before=JSON.stringify(rows);
let r=post({action:'list',idToken:'valid'});
assert.equal(r.ok,true);assert.equal(waits,0);assert.equal(tries,1);assert.equal(syncs,0);assert.equal(releases,0);
assert.equal(r.items.length,2);assert.equal(r.items[0].clave,'visible-secret');assert.equal(r.items[0].max2fa,7);assert.equal(r.items[0].tiene2fa,true);assert.equal(r.items[1].clave,'');
assert.ok(!JSON.stringify(r).includes('private-secret'));assert.ok(!JSON.stringify(r).includes('hidden-secret'));assert.equal(r.planes.length,3);
const attempted=tries;r=post({action:'list'});assert.equal(r.ok,false);assert.equal(tries,attempted,'auth checked before any access');
post({action:'paypal_confirm',idToken:'valid'});assert.equal(waits,1,'payment mutation still serialized');assert.equal(syncs,0);
lockAvailable=true;r=post({action:'list',idToken:'valid'});assert.equal(r.ok,true);assert.equal(syncs,1);assert.equal(flushes,1);assert.equal(releases,1);
ctx.autoAgregar_=()=>{throw Error('sync failed');};r=post({action:'list',idToken:'valid'});assert.equal(r.ok,true);assert.equal(releases,2,'sync error releases lock and retains readable accounts');
propertyReads=0;const pool=ctx.cuentasConCupo_(rows,{match:['chatgpt']},Infinity);assert.equal(propertyReads,1,'one property read for all inventory');assert.ok(!pool.some(x=>x.correo==='hidden@example.test'));
props['INVENTARIO_RETIRADA_active@example.test']='1';props['INVENTARIO_ELIMINADA_other@example.test']='1';assert.equal(ctx.cuentasConCupo_(rows,{match:['chatgpt']},Infinity).length,1);
assert.equal(JSON.stringify(rows),before,'existing subscriptions not modified');
console.log('PASS: authenticated account reads survive busy locks; writes stay locked; ownership, expiry, hidden inventory, 2FA and cleanup preserved; inventory properties read once.');
