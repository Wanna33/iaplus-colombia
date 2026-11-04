// Isolated local fixture: no customer data, session writes, or real API calls.
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'../..');
exports.html=()=>fs.readFileSync(path.join(root,'cuenta.html'),'utf8').replace(/<script[^>]+src="(?:net|early-list)\.js[^\"]*"[^>]*><\/script>/g,'').replace(/src="cuenta-20261022\.js[^\"]*"/,'src="/__qa/account-pro.js"').replace(/<script[^>]+src="https:\/\/accounts.google.com\/gsi\/client"[^>]*><\/script>/g,'').replace(/(src|href)="(?!https?:|\/|#)([^"]+)"/g,'$1="/$2"');
exports.js=()=>{
 let s=fs.readFileSync(path.join(root,'cuenta-20261022.js'),'utf8');
 s=s.replace(/img:"([a-z-]+\.webp)"/g,'img:"/$1"');
 s=s.replace(/const load = k => [^\n]+/,'const load = k => qaStore[k]??null;').replace(/const save = \(k,v\) => [^\n]+/,'const save = (k,v) => {qaStore[k]=v;};');
 s=s.replace(/\blocalStorage\b/g,'qaLocalStorage').replace(/\bsessionStorage\b/g,'qaSessionStorage');
 s=s.replace(/src="assets\//g,'src="/assets/');
 s="if(new URLSearchParams(location.search).get('preview')==='signin'){delete qaStore.iap_cred;delete qaStore.iap_user;}\n"+s;
 return `const qaStore={iap_cred:{token:'demo',exp:Date.now()+3600000},iap_user:{email:'demo@example.test',name:'Valentina'}};const qaMemoryStorage=()=>{const values=new Map();return {getItem:key=>values.has(String(key))?values.get(String(key)):null,setItem:(key,value)=>values.set(String(key),String(value)),removeItem:key=>values.delete(String(key)),clear:()=>values.clear()};};const qaLocalStorage=qaMemoryStorage(),qaSessionStorage=qaMemoryStorage();async function postJson(){return {ok:true,admin:false,items:Array.from({length:4},(_,i)=>({codigo:'IAP-DEMO-'+i,producto:'ChatGPT',correo:'cuenta'+i+'@example.test',clave:'SOLO-DEMO',dias:90,restante:42,vencida:false,fin:new Date(Date.now()+42*86400000).toISOString(),inicio:new Date(Date.now()-48*86400000).toISOString(),recomendada:i===0,ordenCuenta:4-i,tiene2fa:false,precio:i===0?20000:0}))};}\n`+s+`
// Local-only preview controls. Events run from the external fixture script for CSP.
(() => {
  if (new URLSearchParams(location.search).get('preview') !== 'christmas') return;
  function mountChristmasPreview(){
    if(document.getElementById('qaChristmasPreview')) return;
    const controls=document.createElement('nav');
    controls.id='qaChristmasPreview';
    controls.setAttribute('aria-label','Vista previa local de Navidad');
    controls.style.cssText='position:relative;z-index:10001;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:14px;background:#173f35;color:#fff8df;border-bottom:2px solid #c4a14c';
    function button(label,action){
      const element=document.createElement('button');
      element.type='button';element.textContent=label;
      element.style.cssText='padding:12px 16px;min-height:44px;border:1px solid #e6d1a2;border-radius:12px;background:#fff8df;color:#173f35;font:600 14px system-ui;cursor:pointer';
      element.addEventListener('click',action);controls.appendChild(element);
    }
    button('Vista previa: acceso confirmado',()=>window.IAPCelebrate?.show({producto:'ChatGPT Plus',fin:new Date(Date.now()+42*86400000).toISOString()}));
    button('Vista previa: bienvenida de éxito',()=>{
      window.IAPActivationWelcome?.showSuccess();
      const art=document.querySelector('#activationWelcome .activation-welcome-art img');
      if(art) art.src='/assets/navidad-santa-confianza-2026.webp';
    });
    document.body.prepend(controls);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mountChristmasPreview,{once:true});
  else mountChristmasPreview();
})();
`;
};
