/* Exercise the actual admin request adapter with a controlled transport; no network. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../admin.js'),'utf8');
const adapter=source.slice(source.indexOf('const adminReadRequests='),source.indexOf('function showLogin(){'));
assert(adapter.includes('async function api('),'Expected request adapter source');
const pending=[];let credential={token:'test-session-a',exp:Date.now()+600000};
const context=vm.createContext({Map,Set,Date,JSON,Error,API_URL:'https://test.invalid',load:()=>credential,postJson:(url,body)=>new Promise((resolve,reject)=>pending.push({url,body,resolve,reject}))});
vm.runInContext(adapter+';this.requestCount=()=>adminReadRequests.size;',context);
const take=()=>{assert(pending.length,'Expected a network request');return pending.shift();};
async function ok(promise,body={ok:true}){take().resolve(body);return promise;}
(async()=>{
  const a=context.api('admin_wa_chat',{tel:'one'}),b=context.api('admin_wa_chat',{tel:'one'});
  assert.equal(pending.length,1,'Same in-flight read shares transport');assert.equal(context.requestCount(),1);
  const reply={ok:true,tel:'one',turnos:[]};take().resolve(reply);assert.strictEqual(await a,reply);assert.strictEqual(await b,reply);assert.equal(context.requestCount(),0);
  const next=context.api('admin_wa_chat',{tel:'one'});assert.equal(pending.length,1,'Settled result is not cached');await ok(next);
  const d1=context.api('admin_wa_chat',{tel:'one'}),d2=context.api('admin_wa_chat',{tel:'two'}),d3=context.api('admin_wa_chats');assert.equal(pending.length,3,'Different query/action remains independent');
  take().resolve({ok:true,tel:'one'});take().resolve({ok:true,tel:'two'});take().resolve({ok:true,chats:[]});await Promise.all([d1,d2,d3]);
  const oldSession=context.api('admin_list');credential={token:'test-session-b',exp:Date.now()+600000};const newSession=context.api('admin_list');assert.equal(pending.length,2,'Different sessions never share data');
  const oldRequest=take(),newRequest=take();assert.equal(oldRequest.body.idToken,'test-session-a');assert.equal(newRequest.body.idToken,'test-session-b');oldRequest.resolve({ok:true,items:['old']});newRequest.resolve({ok:true,items:['new']});assert.deepEqual((await oldSession).items,['old']);assert.deepEqual((await newSession).items,['new']);
  for(const [action,data] of [['admin_wa_send',{tel:'one',texto:'example'}],['admin_wa_saldo',{fijar:25}],['admin_catalogo',{set:{key:'example',price:1}}],['admin_add',{producto:'example'}]]){
    const x=context.api(action,data),y=context.api(action,data);assert.equal(pending.length,2,'Writes never coalesce: '+action);assert.equal(context.requestCount(),0);take().resolve({ok:true});take().resolve({ok:true});await Promise.all([x,y]);
  }
  const errorRead=context.api('admin_wa_list'),errorTwin=context.api('admin_wa_list');const both=Promise.allSettled([errorRead,errorTwin]);take().reject(Error('offline'));assert((await both).every(r=>r.status==='rejected'));assert.equal(context.requestCount(),0,'Rejected transport releases key');
  await ok(context.api('admin_wa_list'));
  const bad=context.api('admin_list'),badOutcome=Promise.allSettled([bad]);take().resolve({ok:false,error:'Server rejected'});assert.equal((await badOutcome)[0].reason.message,'Server rejected');assert.equal(context.requestCount(),0,'Application error releases key');
  credential=null;await assert.rejects(context.api('admin_list'),/sesión/);assert.equal(pending.length,0);
  credential={token:'expired',exp:Date.now()-1};await assert.rejects(context.api('admin_list'),/sesión/);assert.equal(pending.length,0);
  credential={token:'bounded',exp:Date.now()+600000};const burst=Array.from({length:40},(_,i)=>context.api('admin_wa_chat',{tel:String(i)}));assert.equal(pending.length,40);assert.equal(context.requestCount(),32,'Tracking stays bounded during burst');
  const twin=context.api('admin_wa_chat',{tel:'0'});assert.equal(pending.length,40,'An already tracked query still coalesces at limit');
  while(pending.length)take().resolve({ok:true});await Promise.all([...burst,twin]);assert.equal(context.requestCount(),0);
  console.log('PASS: shared simultaneous reads; independent queries, actions and sessions; writes never merged; no settled cache; success/error cleanup; expired-session guard; bounded 40-request burst. No network.');
})().catch(e=>{console.error(e);process.exitCode=1;});
