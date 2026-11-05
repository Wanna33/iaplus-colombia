const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function extract(s,name){const start=s.indexOf('function '+name+'(');assert.ok(start>=0,name);const next=s.indexOf('\nfunction ',start+1);return s.slice(start,next<0?s.length:next);}
for(const file of ['backend/Code.gs','backend/Code-con-PayPal.gs']){
 const source=fs.readFileSync(file,'utf8');new vm.Script(source);let id=0;
 const day=86400000,now=Date.now(),start=new Date(now-5*day),rows=[Array(15).fill('')];
 function row(code,product,mail,owner,date,days,note=''){return [code,product,mail,'test-password',owner,'Activo',date,days,1,0,note,'',10000,'Test',''];}
 rows.push(row('BASE','Canva','canva@test.example','active@test.example',start,30));
 rows.push(row('LONG','Gemini Pro','gemini@test.example','active@test.example',start,90));
 rows.push(row('EXPIRED','Canva','old@test.example','expired@test.example',new Date(now-60*day),30));
 rows.push(row('BAD','Canva','bad@test.example','invalid@test.example','',30));
 rows.push(row('FUTURE','Canva','future@test.example','future@test.example',new Date(now+day),30));
 rows.push(row('ADMIN','Canva','admin@test.example','admin@test.example',start,30));
 for(let i=0;i<35;i++)rows.push(row('POOL'+i,'ChatGPT','gpt'+i+'@test.example','', '',30));
 rows.push(row('OWN','ChatGPT','gpt0@test.example','active@test.example',start,30));
 rows.push(row('RETIRED','ChatGPT','retired@test.example','', '',30));
 rows.push(row('BROKEN','ChatGPT','broken@test.example','', '',30));rows.at(-1)[5]='Con problemas';
 const original=JSON.stringify(rows), props={'INVENTARIO_RETIRADA_retired@test.example':'1'},logs=[];
 const sh={getDataRange:()=>({getValues:()=>rows}),getLastRow:()=>rows.length,getRange:(n,c,h,w)=>({setValues:v=>{assert.equal(n,rows.length+1);assert.equal(w,15);assert.equal(h,v.length);rows.push(...v);}})};
 const ctx=vm.createContext({Date,Map,Set,Number,Infinity,DEFAULT_DAYS:30,DAY:day,ADICIONAL:'Cuenta adicional',CATALOGO:{chatgpt:{match:['chatgpt']}},isAdmin_:e=>e==='admin@test.example',newCode_:taken=>{const c='NEW'+ ++id;assert.ok(!taken[c]);taken[c]=true;return c;},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],getProperties:()=>({...props})})},log_:(...a)=>logs.push(a)});
 for(const n of ['plan_','cuentaRetirada_','cuentasConCupo_','prepararChatgptGlobal_','guardarChatgptGlobal_','autoAgregar_'])vm.runInContext(extract(source,n),ctx);
 const grants=ctx.prepararChatgptGlobal_(rows);
 assert.equal(grants.clientes,1);assert.equal(grants.cuentas,35);assert.equal(grants.filas.length,34,'all accounts, including beyond previous 30 limit');
 assert.ok(grants.filas.every(r=>r[4]==='active@test.example'&&r[6]===start&&r[7]===90&&r[12]===0));
 assert.equal(JSON.stringify(rows),original,'existing rows untouched');
 ctx.guardarChatgptGlobal_(sh,grants,'test');assert.equal(ctx.prepararChatgptGlobal_(rows).filas.length,0,'idempotent');
 rows.push(row('LATER','ChatGPT','later@test.example','', '',30));assert.equal(ctx.autoAgregar_(sh,'active@test.example').accesosAgregados,1,'new accounts on next visit');
 assert.equal(ctx.autoAgregar_(sh,'expired@test.example').accesosAgregados,0);
 assert.equal(ctx.autoAgregar_(sh,'invalid@test.example').accesosAgregados,0);
 assert.equal(ctx.autoAgregar_(sh,'future@test.example').accesosAgregados,0);
 assert.equal(JSON.stringify(rows.slice(0,JSON.parse(original).length)),original);
 console.log(file+': PASS — all active users, all ChatGPT accounts, original plans unchanged, exact expiry, no duplicates, expired/future/invalid denied, retired/broken excluded');
}
