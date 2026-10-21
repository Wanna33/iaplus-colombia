// Vista local con datos ficticios. No inicia sesión ni consulta servidores.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
exports.html=()=>fs.readFileSync(path.join(root,'admin.html'),'utf8').replace('<title>','<title>DEMO · ').replace('<script src="net.js"></script>','').replace('src="admin.js"','src="/__qa/admin-preview.js"').replace('https://accounts.google.com/gsi/client','/__qa/no-google.js').replace(/(src|href)="(?!https?:|\/|#)([^"]+)"/g,'$1="/$2"');
exports.js=()=>{
  let s=fs.readFileSync(path.join(root,'admin.js'),'utf8');
  s=s.replace('const cred = load("iap_cred");','const cred = {token:"demo",exp:Date.now()+3600000};');
  s=s.replace('const u = load("iap_user"); const cred = load("iap_cred");','const u = {email:"demo@example.test",name:"Demostración"}; const cred = {token:"demo",exp:Date.now()+3600000};');
  const mock=`let qaUpdates=0; async function postJson(url, data){
    await new Promise(r=>setTimeout(r,80));
    if(data.action==='admin_list' && ++qaUpdates>1 && location.search.includes('fallo=1'))return {ok:false,error:'Fallo de conexión simulado'};
    if(data.action==='admin_list')return {ok:true,ttl:1440,items:Array.from({length:24},(_,i)=>({fila:i+2,codigo:'DEMO-'+(1000+i),producto:['ChatGPT','Canva','CapCut Pro'][i%3],correo:'cuenta'+(i%4)+'@example.test',clave:'solo-demostracion',cliente:i%4?'cliente'+i+'@example.test':'',estado:i%4?'Activo':'Disponible',dias:30,restante:25-i,vencida:25-i<0,precio:10000,inicio:new Date(Date.now()-i*86400000).toISOString(),fin:new Date(Date.now()+(25-i)*86400000).toISOString(),tiene2fa:false,usos2fa:0,max2fa:2,whatsapp:'',nota:'Datos ficticios',nombre:'Demo '+i}))};
    if(data.action==='admin_catalogo')return {ok:true,productos:[]};
    if(data.action==='admin_log')return {ok:true,log:[]};
    return {ok:true,pedidos:[],ventas:[],config:{},saldo:0};
  }\n`;
  return mock+s;
};
