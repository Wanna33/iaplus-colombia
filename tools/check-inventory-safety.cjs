const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function extract(s,name){const start=s.indexOf('function '+name+'(');assert.ok(start>=0,name);const next=s.indexOf('\nfunction ',start+1);return s.slice(start,next<0?s.length:next);}
for(const file of ['backend/Code.gs','backend/Code-con-PayPal.gs']){
 const source=fs.readFileSync(file,'utf8');new vm.Script(source);
 const rows=[Array(15).fill(''),['USED','ChatGPT','shared@example.test','original','client@example.test','Activo',new Date('2026-11-01'),30,1,123,'note','',10000,'Client',''],['FREE','ChatGPT','other@example.test','other','','Disponible','',30],['OLD','ChatGPT','shared@example.test','original','past@example.test','Vencido',new Date('2020-01-01'),30]];
 const original=JSON.stringify(rows),props={TOTP_shared:'untouched'},logs=[];
 const store={getProperty:k=>props[k],setProperty:(k,v)=>props[k]=v,deleteProperty:k=>delete props[k],getProperties:()=>({...props})};
 const sh={getDataRange:()=>({getValues:()=>rows}),getLastRow:()=>rows.length,getRange:(n,c=1,h=1,w=1)=>({getValues:()=>rows.slice(n-1,n-1+h).map(r=>r.slice(c-1,c-1+w)),getValue:()=>rows[n-1][c-1]}),deleteRow:n=>rows.splice(n-1,1)};
 const c=vm.createContext({PropertiesService:{getScriptProperties:()=>store},sheet_:()=>sh,isAdmin_:e=>e==='admin',alertaIntruso_:()=>{},fail_:m=>new Error(m),log_:(...a)=>logs.push(a),plan_:r=>({vencida:r[5]==='Vencido'}),lim2faCfg_:()=>({}),limite2fa_:()=>2,usedToday_:()=>0,created_:()=>null,ttlMin_:()=>0,DEFAULT_DAYS:30});
 for(const n of ['inventarioMeta_','cuentaRetirada_','exigirCuentaDisponible_','cuentasConCupo_','rowNum_','handle_'])vm.runInContext(extract(source,n),c);
 const call=b=>c.handle_(b,'admin'),prod={match:['chatgpt']};
 const beforeRecommendation=JSON.stringify(rows);
 assert.throws(()=>c.handle_({action:'admin_account_recommend',correo:'shared@example.test',recomendada:true},'visitor'),/administrador/);
 call({action:'admin_account_recommend',correo:'shared@example.test',recomendada:true});
 assert.ok(call({action:'admin_list'}).items.find(i=>i.correo==='shared@example.test').recomendada);
 assert.equal(JSON.stringify(rows),beforeRecommendation,'recommendation preserves subscriptions');
 call({action:'admin_account_recommend',correo:'shared@example.test',recomendada:false});
 assert.equal(call({action:'admin_list'}).items.find(i=>i.correo==='shared@example.test').recomendada,false);
 props['INVENTARIO_ALTA_other@example.test']='999';
 assert.equal(c.inventarioMeta_(rows,props)['other@example.test'].ordenCuenta,999);
 assert.equal(c.inventarioMeta_(rows,props)['shared@example.test'].ordenCuenta,1);
 logs.length=0;

 assert.throws(()=>c.handle_({action:'admin_account_inventory',correo:'shared@example.test',retirada:true},'visitor'),/administrador/);
 assert.equal(call({action:'admin_account_inventory',correo:' SHARED@example.test ',retirada:true}).retirada,true);
 assert.equal(JSON.stringify(rows),original,'retirement must not mutate any subscription field');
 assert.equal(c.cuentasConCupo_(rows,prod,Infinity).length,1);
 assert.throws(()=>call({action:'admin_account_recommend',correo:'shared@example.test',recomendada:true}),/retirada/);
 assert.ok(call({action:'admin_list'}).items.filter(x=>x.correo==='shared@example.test').every(x=>x.retirada));
 for(const action of ['admin_bulk','admin_clone','admin_newcode'])assert.throws(()=>call({action,fila:2}),/retirada/);
 for(const fila of [2,4])assert.throws(()=>call({action:'admin_delete',fila,codigo:rows[fila-1][0],correo:rows[fila-1][2]}),/cliente/);
 assert.throws(()=>call({action:'admin_add',correo:'SHARED@example.test',clave:'new'}),/ya existe/);
 assert.throws(()=>call({action:'admin_delete',fila:3,codigo:'STALE',correo:'other@example.test'}),/cambió/);
 assert.equal(JSON.stringify(rows),original);
 call({action:'admin_account_inventory',correo:'shared@example.test',retirada:false});
 assert.equal(c.cuentasConCupo_(rows,prod,Infinity).length,2);
 assert.equal(JSON.stringify(rows),original);
 assert.equal(logs.length,2);assert.equal(props.TOTP_shared,'untouched');
 console.log(file+': OK — retiro/restauración sin tocar planes, exclusión de ventas, permisos, duplicados y borrado protegido');
}
