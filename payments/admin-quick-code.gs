// Called only inside the authenticated admin branch and the existing write lock.
function adminQuickCode_(b,email){
  if(!isAdmin_(email))throw fail_('Acceso solo para el administrador.');
  const months=Number(b.meses),request=String(b.solicitud||'');
  if([1,3,6].indexOf(months)<0)throw fail_('Elige 1, 3 o 6 meses.');
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(request))throw fail_('Solicitud no válida.');
  const sh=sheet_(),rows=sh.getDataRange().getValues(),marker='Código rápido '+email+' '+request;
  const existing=rows.slice(1).find(r=>String(r[10])===marker);
  function response(row){return {ok:true,codigo:String(row[0]),dias:Number(row[7]),meses:Number(row[7])/30,producto:'ChatGPT',precio:Number(row[12])||0,enlace:TIENDA_URL+'cuenta.html?codigo='+encodeURIComponent(row[0])};}
  if(existing){if(Number(existing[7])!==months*30)throw fail_('Esta solicitud corresponde a otra duración. Recupera primero el código anterior.');if(!String(existing[0]).trim()||expired_(existing,ttlMin_()))return {ok:true,caducado:true};return response(existing);}
  const product=CATALOGO[months===1?'chatgpt':'chatgpt'+months];
  if(!product||product.oculto)throw fail_('Este plan no está disponible.');
  const pool=cuentasConCupo_(rows,product,CAP_PAGOS).filter(a=>String(rows[a.fila-1][3]||'').trim()).sort((a,b)=>a.act-b.act);
  if(!pool.length)throw fail_('No hay cuentas de ChatGPT activas y disponibles. Enciende una cuenta en Cuentas.');
  const base=rows[pool[0].fila-1],taken={};rows.forEach(r=>{if(r[0])taken[String(r[0]).toUpperCase()]=true;});
  const row=[newCode_(taken),product.name,base[2],base[3],'','Disponible','',months*30,0,'',marker,'',product.price,'',new Date()];
  putRow_(sh,row);SpreadsheetApp.flush();
  log_('Código rápido creado',months+' meses de ChatGPT',email);
  return response(row);
}
