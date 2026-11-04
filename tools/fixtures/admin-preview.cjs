// Vista local con datos ficticios. No inicia sesión ni consulta servidores.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
exports.html=()=>fs.readFileSync(path.join(root,'admin.html'),'utf8').replace('<title>','<title>DEMO · ').replace(/<script[^>]+src="net\.js[^\"]*"[^>]*><\/script>/,'').replace(/src="admin\.js[^\"]*"/,'src="/__qa/admin-preview.js"').replace('https://accounts.google.com/gsi/client','/__qa/no-google.js').replace(/(src|href)="(?!https?:|\/|#)([^"]+)"/g,'$1="/$2"');
const originalHtml=exports.html;
exports.html=()=>originalHtml();
exports.js=()=>{
  let s=fs.readFileSync(path.join(root,'admin.js'),'utf8');
  s=s.replace('script.src=src;', 'script.src="/"+src;').replace('link.href=href;', 'link.href="/"+href;');
  s=s.replace('const cred = load("iap_cred");','const cred = {token:"demo",exp:Date.now()+3600000};');
  s=s.replace('const u = load("iap_user"); const cred = load("iap_cred");','const u = {email:"demo@example.test",name:"Demostración"}; const cred = {token:"demo",exp:Date.now()+3600000};');
  const mock=`if(location.search.includes('world'))sessionStorage.setItem('iap_tab','world');let qaWorld=0;const qaNow=Date.now(),qaCount=Math.max(8,Math.min(5000,Number(new URLSearchParams(location.search).get('clients'))||8));let qaUpdates=0; async function postJson(url, data){
    await new Promise(r=>setTimeout(r,80));
    if(data.action==='admin_list' && ++qaUpdates>1 && location.search.includes('fallo=1'))return {ok:false,error:'Fallo de conexión simulado'};
    if(data.action==='admin_list')return {ok:true,ttl:1440,items:Array.from({length:24},(_,i)=>({fila:i+2,codigo:'DEMO-'+(1000+i),producto:['ChatGPT','Canva','CapCut Pro'][i%3],correo:'cuenta'+(i%4)+'@example.test',clave:'solo-demostracion',cliente:i%4?'cliente'+i+'@example.test':'',estado:i%4?'Activo':'Disponible',dias:30,restante:25-i,vencida:25-i<0,precio:10000,inicio:new Date(Date.now()-i*86400000).toISOString(),fin:new Date(Date.now()+(25-i)*86400000).toISOString(),tiene2fa:false,usos2fa:0,max2fa:2,whatsapp:'',nota:'Datos ficticios',nombre:'Demo '+i}))};
    if(data.action==='admin_wa_chats'){qaWorld++;if(qaWorld>1&&location.search.includes('world-fail'))return {ok:false,error:'Conexión interrumpida de prueba'};return {ok:true,chats:Array.from({length:qaCount},(_,i)=>({tel:'demo-'+i,nombre:['Ana','David','Mariana','Juan','Sara','Lucas','Valeria','Tomás'][i%8]+(qaCount>8?' '+(i+1):''),ts:qaNow-i*60000+(i===0&&qaWorld>1?60000:0),quien:i%3?'a':'u',ultimo:'Consulta de demostración',etiquetas:i%8===2?['queja']:i%8===4?['pago']:[],vendido:i===1&&qaWorld>1}))};}
    if(data.action==='admin_wa_list')return {ok:true,ventas:qaWorld>1?[{id:'demo-sale',telefono:'demo-1',nombre:'David',producto:'ChatGPT',estado:'AUTO-CONFIRMADO'}]:[]};
    if(data.action==='admin_wa_chat')return {ok:true,tel:data.tel,nombre:'Cliente de demostración',etiquetas:[],pausa:false,turnos:[{r:'u',t:'Hola, quisiera información. Conversación ficticia para verificar la navegación.',ts:Date.now()}]};
    if(data.action==='admin_catalogo')return {ok:true,productos:[]};
    if(data.action==='admin_log')return {ok:true,log:[]};
    return {ok:true,pedidos:[],ventas:[],config:{},saldo:0};
  }\n`;
  return mock+s;
};
