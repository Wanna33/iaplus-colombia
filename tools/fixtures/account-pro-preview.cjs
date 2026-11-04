// Isolated local fixture: no customer data, session writes, or real API calls.
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'../..');
exports.html=()=>fs.readFileSync(path.join(root,'cuenta.html'),'utf8').replace(/<script[^>]+src="(?:net|early-list)\.js[^\"]*"[^>]*><\/script>/g,'').replace(/src="cuenta-20261022\.js[^\"]*"/,'src="/__qa/account-pro.js"').replace(/<script[^>]+src="https:\/\/accounts.google.com\/gsi\/client"[^>]*><\/script>/g,'').replace(/(src|href)="(?!https?:|\/|#)([^"]+)"/g,'$1="/$2"');
exports.js=()=>{
 let s=fs.readFileSync(path.join(root,'cuenta-20261022.js'),'utf8');
 s=s.replace(/img:"([a-z-]+\.webp)"/g,'img:"/$1"');
 s=s.replace(/const load = k => [^\n]+/,'const load = k => qaStore[k]??null;').replace(/const save = \(k,v\) => [^\n]+/,'const save = (k,v) => {qaStore[k]=v;};');
 return `const qaStore={iap_cred:{token:'demo',exp:Date.now()+3600000},iap_user:{email:'demo@example.test',name:'Valentina'}};async function postJson(){return {ok:true,admin:false,items:Array.from({length:4},(_,i)=>({codigo:'IAP-DEMO-'+i,producto:'ChatGPT',correo:'cuenta'+i+'@example.test',clave:'SOLO-DEMO',dias:90,restante:42,vencida:false,fin:new Date(Date.now()+42*86400000).toISOString(),inicio:new Date(Date.now()-48*86400000).toISOString(),recomendada:i===0,ordenCuenta:4-i,tiene2fa:false,precio:i===0?20000:0}))};}\n`+s;
};
