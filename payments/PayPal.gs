// Add this file to the SAME Apps Script project as backend/Code.gs.
// Client ID is public. NEVER put PAYPAL_CLIENT_SECRET in this file or the website.
const PP_CLIENT_DEFAULT = 'BAA9yjbj7se43Z4YQ4vzRw4WetDH5_rns_feCJMc-kVIGaNEnFpCdl1CwT5Bxe4Xq6gN4jBsz8W0XAbTDE';
const PP_USD_DEFAULT = {chatgpt:'3.17',chatgpt3:'6.34',chatgpt6:'15.85'};
const PP_HEADERS = ['Referencia','Pedido PayPal','Cotizacion','Datos del pedido','Estado','Captura PayPal','Creado'];
function ppConfig_(){
  const props=PropertiesService.getScriptProperties(),g=k=>String(props.getProperty(k)||'').trim();
  let prices=PP_USD_DEFAULT;try{if(g('PAYPAL_USD_PRICES'))prices=JSON.parse(g('PAYPAL_USD_PRICES'));}catch(e){prices={};}
  return {env:g('PAYPAL_ENV')||'live',enabled:g('PAYPAL_ENABLED')==='true',client:g('PAYPAL_CLIENT_ID')||PP_CLIENT_DEFAULT,secret:g('PAYPAL_CLIENT_SECRET'),webhook:g('PAYPAL_WEBHOOK_ID'),merchant:g('PAYPAL_MERCHANT_ID'),prices:prices};
}
function ppCents_(value){
  const s=String(value);if(!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(s))return 0;
  const n=Math.round(Number(s)*100);return Number.isSafeInteger(n)&&n>0&&n<=99999999?n:0;
}
function ppAmount_(cents){return (cents/100).toFixed(2);}
function ppStatus_(){
  const c=ppConfig_(),prices={};Object.keys(c.prices||{}).forEach(k=>{const n=ppCents_(c.prices[k]);if(n&&CATALOGO[k]&&!CATALOGO[k].oculto)prices[k]=ppAmount_(n);});
  return {enabled:c.enabled,ready:!!(c.enabled&&c.client&&c.secret&&['live','sandbox'].indexOf(c.env)>=0&&Object.keys(prices).length),env:c.env,currency:'USD',client:!!c.client,secret:!!c.secret,webhook:!!c.webhook,prices:prices};
}
function ppBase_(c){if(c.env!=='live'&&c.env!=='sandbox')throw fail_('Ambiente de PayPal no válido.');return c.env==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';}
function ppToken_(c){
  if(!c.client||!c.secret)throw fail_('PayPal todavía no está configurado. Compra por WhatsApp.');
  const cache=CacheService.getScriptCache(),key='pp-token-'+sha256hex_(c.env+c.client+c.secret).slice(0,32),cached=cache.get(key);if(cached)return cached;
  let response;try{response=UrlFetchApp.fetch(ppBase_(c)+'/v1/oauth2/token',{method:'post',contentType:'application/x-www-form-urlencoded',payload:'grant_type=client_credentials',headers:{Authorization:'Basic '+Utilities.base64Encode(c.client+':'+c.secret)},muteHttpExceptions:true});}catch(e){throw fail_('PayPal no respondió. Intenta de nuevo en unos momentos.');}
  let json={};try{json=JSON.parse(response.getContentText());}catch(e){}
  if(response.getResponseCode()!==200||!json.access_token)throw fail_('No se pudo conectar con PayPal. Contacta con la tienda.');
  cache.put(key,json.access_token,Math.max(1,Math.min(600,Number(json.expires_in||600)-60)));return json.access_token;
}
function ppCall_(c,path,method,body,requestId){
  const headers={Authorization:'Bearer '+ppToken_(c),Prefer:'return=representation'};if(requestId)headers['PayPal-Request-Id']=requestId;
  const options={method:method||'get',headers:headers,muteHttpExceptions:true};
  if(body!==undefined){options.contentType='application/json';options.payload=JSON.stringify(body);}
  let response;try{response=UrlFetchApp.fetch(ppBase_(c)+path,options);}catch(e){throw fail_('No pudimos consultar PayPal. No pagues otra vez; vuelve a revisar este pedido.');}
  let json={};try{json=JSON.parse(response.getContentText());}catch(e){}
  if(response.getResponseCode()<200||response.getResponseCode()>=300)throw fail_('PayPal no pudo completar la operación. Vuelve a revisar tu pedido o contacta a la tienda.');
  return json;
}
function ppSheet_(){const ss=sheet_().getParent();let sh=ss.getSheetByName('PedidosPayPal');if(!sh){sh=ss.insertSheet('PedidosPayPal');sh.getRange(1,1,1,PP_HEADERS.length).setValues([PP_HEADERS]).setFontWeight('bold');sh.setFrozenRows(1);}return sh;}
function ppFind_(field,value){const sh=ppSheet_(),rows=sh.getDataRange().getValues();for(let i=1;i<rows.length;i++)if(String(rows[i][field])===String(value)){const r=rows[i];return {n:i+1,ref:String(r[0]),id:String(r[1]),quote:String(r[2]),data:JSON.parse(String(r[3])),state:String(r[4]),capture:String(r[5]),created:r[6]};}return null;}
function ppSave_(order){ppSheet_().getRange(order.n,1,1,7).setValues([[order.ref,order.id||'',order.quote,JSON.stringify(order.data),order.state||'PENDIENTE',order.capture||'',order.created||new Date()]]);SpreadsheetApp.flush();}
function ppOwned_(b,email){
  const ref=String(b.ref||'');if(!/^IAPP-[A-Z2-9]{12}$/.test(ref))throw fail_('Pedido de PayPal no válido.');
  const order=ppFind_(0,ref),osh=ordersSheet_(),n=findOrder_(osh,ref);
  if(!order||!n||String(osh.getRange(n,2).getValue()).toLowerCase()!==email)throw fail_('No encontramos ese pedido para tu cuenta.');
  if(b.id&&String(b.id)!==order.id)throw fail_('El identificador de PayPal no corresponde a este pedido.');
  order.main=n;return order;
}
function ppGuard_(email,product){
  const c=ppConfig_();if(!ppStatus_().ready)throw fail_('PayPal todavía no está disponible. Compra por WhatsApp.');
  if(c.env==='sandbox'&&!isAdmin_(email))throw fail_('PayPal está en pruebas. Compra por WhatsApp.');
  const p=CATALOGO[product];if(!p||p.oculto||!ppCents_(c.prices[product]))throw fail_('Este plan no tiene precio de PayPal. Consulta por WhatsApp.');
  if(!cuentasConCupo_(sheet_().getDataRange().getValues(),p,CAP_PAGOS).length)throw fail_('No hay cupo para este plan. Consulta por WhatsApp antes de pagar.');
  return {config:c,product:p};
}
function ppQuote_(b,email){
  const id=String(b.producto||''),valid=ppGuard_(email,id),p=valid.product,c=valid.config;
  const pending=ordersSheet_().getDataRange().getValues().slice(1).filter(r=>String(r[1]).toLowerCase()===email&&r[4]==='PENDIENTE'&&r[5] instanceof Date&&Date.now()-r[5].getTime()<3600000);
  if(pending.length>=5)throw fail_('Tienes varios pedidos pendientes. Revisa tus pagos antes de crear otro.');
  const q={id:'PPQ-'+randStr_(20,'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'),ref:'IAPP-'+randStr_(12,'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'),email:email,product:id,name:p.name,days:p.dias,match:p.match.slice(),cop:p.price,cents:ppCents_(c.prices[id]),currency:'USD',env:c.env,expires:Date.now()+15*60000};
  CacheService.getScriptCache().put(q.id,JSON.stringify(q),900);
  return {ok:true,quote:q.id,name:q.name,days:q.days,currency:q.currency,total:ppAmount_(q.cents),catalogCOP:q.cop,env:q.env,expires:q.expires};
}
function ppApproval_(order){
  const url=String(order.data.approval||''),pattern=order.data.env==='live'?/^https:\/\/www\.paypal\.com\//:/^https:\/\/www\.sandbox\.paypal\.com\//;
  if(!pattern.test(url))throw fail_('No se recibió un enlace válido de PayPal. Revisa tu pedido.');
  return {ok:true,provider:'paypal',ref:order.ref,id:order.id,approveUrl:url,currency:'USD',total:ppAmount_(order.data.cents),env:order.data.env};
}
function ppCreate_(b,email){
  const quote=String(b.quote||'');if(!/^PPQ-[A-Z2-9]{20}$/.test(quote))throw fail_('Cotización de PayPal no válida.');
  let order=ppFind_(2,quote),q;
  if(order){ppOwned_({ref:order.ref},email);q=order.data;if(order.id)return ppApproval_(order);}
  else{try{q=JSON.parse(CacheService.getScriptCache().get(quote)||'null');}catch(e){} }
  if(!q||q.email!==email||q.expires<Date.now())throw fail_('La cotización venció. Vuelve a revisar el precio de PayPal.');
  const valid=ppGuard_(email,q.product),c=valid.config,p=valid.product;
  if(c.env!==q.env||ppCents_(c.prices[q.product])!==q.cents||p.price!==q.cop||p.dias!==q.days)throw fail_('El plan cambió. Vuelve a consultar el precio antes de pagar.');
  if(!order){
    const sh=ppSheet_();order={n:sh.getLastRow()+1,ref:q.ref,id:'',quote:quote,data:q,state:'CREANDO',created:new Date()};ppSave_(order);
  }
  const osh=ordersSheet_();if(!findOrder_(osh,q.ref))osh.appendRow([q.ref,email,q.product,q.cop,'PENDIENTE',new Date(),'','','PayPal · USD '+ppAmount_(q.cents)]);
  const back=TIENDA_URL+'pago.html?provider=paypal&ref='+encodeURIComponent(q.ref);
  const body={intent:'CAPTURE',purchase_units:[{reference_id:q.ref,custom_id:q.ref,invoice_id:q.ref,description:'IA Plus Colombia · '+q.name+' · '+q.days+' días',amount:{currency_code:'USD',value:ppAmount_(q.cents)}}],payment_source:{paypal:{experience_context:{brand_name:'IA Plus Colombia',shipping_preference:'NO_SHIPPING',user_action:'PAY_NOW',return_url:back,cancel_url:back+'&cancel=1'}}}};
  const result=ppCall_(c,'/v2/checkout/orders','post',body,q.ref+'-create');
  if(!/^[A-Z0-9]{1,36}$/.test(String(result.id||'')))throw fail_('PayPal no devolvió un pedido válido.');
  const approval=(result.links||[]).find(l=>l.rel==='payer-action'||l.rel==='approve');
  order.id=result.id;order.state='PENDIENTE';order.data.approval=approval&&approval.href||'';order.data.merchant=c.merchant||(((result.purchase_units||[])[0]||{}).payee||{}).merchant_id||'';ppSave_(order);
  log_('Pedido PayPal creado',q.ref+' · USD '+ppAmount_(q.cents),email);
  return ppApproval_(order);
}
function ppValidateOrder_(remote,order){
  const units=remote.purchase_units||[],u=units[0]||{},q=order.data;
  if(String(remote.id)!==order.id||remote.intent!=='CAPTURE'||units.length!==1||u.reference_id!==order.ref||u.custom_id!==order.ref||u.invoice_id!==order.ref||!u.amount||u.amount.currency_code!=='USD'||ppCents_(u.amount.value)!==q.cents)throw fail_('El pago de PayPal no coincide con el pedido. Contacta con la tienda.');
  if(q.merchant&&(!u.payee||u.payee.merchant_id!==q.merchant))throw fail_('El destinatario de PayPal no coincide.');
  return u;
}
function ppCompleteCapture_(unit,order){
  const captures=((unit.payments||{}).captures)||[];
  if(captures.length!==1)return null;
  const cap=captures[0];if(cap.status!=='COMPLETED')return null;
  if(!/^[A-Z0-9]{1,36}$/.test(String(cap.id||''))||!cap.amount||cap.amount.currency_code!=='USD'||ppCents_(cap.amount.value)!==order.data.cents||cap.final_capture!==true)throw fail_('La captura de PayPal no coincide con el importe del pedido.');
  return cap;
}
function ppDeliver_(order){
  const osh=ordersSheet_(),n=findOrder_(osh,order.ref),o=osh.getRange(n,1,1,9).getValues()[0],q=order.data;
  if(order.state==='SIMULACION')return {ok:true,estado:'SIMULACION'};
  if(order.state!=='PAGADO'&&order.state!=='ENTREGADO'&&order.state!=='APROBADO_SIN_STOCK')throw fail_('No hay una captura verificada para entregar este pedido.');
  const sh=sheet_(),rows=sh.getDataRange().getValues(),marker='Pago PayPal '+order.ref;
  const delivered=rows.slice(1).find(r=>String(r[10])===marker&&String(r[4]).toLowerCase()===String(o[1]).toLowerCase());
  if(delivered){osh.getRange(n,5).setValue('ENTREGADO');osh.getRange(n,8).setValue(delivered[2]);order.state='ENTREGADO';ppSave_(order);return {ok:true,estado:'ENTREGADO'};}
  const pool=cuentasConCupo_(rows,{match:q.match},CAP_PAGOS);
  if(!pool.length){order.state='APROBADO_SIN_STOCK';ppSave_(order);osh.getRange(n,5).setValue('APROBADO_SIN_STOCK');avisar_('Pago PayPal aprobado sin cupo',[order.ref,'Cliente: '+o[1],'Cobrado: USD '+ppAmount_(q.cents)]);return {ok:true,estado:'APROBADO_SIN_STOCK'};}
  const base=rows[pool[0].fila-1],taken={};rows.forEach(r=>{if(r[0])taken[String(r[0]).toUpperCase()]=true;});
  // USD receipts are kept in PedidosPayPal. No guessed COP revenue/conversion.
  putRow_(sh,[newCode_(taken),base[1],base[2],base[3],String(o[1]).toLowerCase(),'Activo',new Date(),q.days,0,'',marker,'',0,txt_(q.customerName||''),'']);SpreadsheetApp.flush();
  osh.getRange(n,5).setValue('ENTREGADO');osh.getRange(n,8).setValue(base[2]);order.state='ENTREGADO';ppSave_(order);
  log_('Pago PayPal entregado',order.ref+' · USD '+ppAmount_(q.cents),String(o[1]));avisar_('Venta PayPal: '+q.name,['Pedido: '+order.ref,'Cobrado: USD '+ppAmount_(q.cents),'Cliente: '+o[1]]);
  return {ok:true,estado:'ENTREGADO'};
}
function ppSettle_(order,capture){
  if(order.state==='ENTREGADO')return {ok:true,estado:'ENTREGADO'};
  if(order.state==='SIMULACION')return {ok:true,estado:'SIMULACION'};
  const c=ppConfig_();if(c.env!==order.data.env)throw fail_('Este pedido pertenece a otro ambiente de PayPal.');
  if(!order.id)throw fail_('Este pedido aún no tiene un identificador de PayPal. Vuelve al catálogo y revisa el pedido.');
  let remote=ppCall_(c,'/v2/checkout/orders/'+order.id),unit=ppValidateOrder_(remote,order),cap=ppCompleteCapture_(unit,order);
  if(!cap&&remote.status==='APPROVED'&&capture){ppCall_(c,'/v2/checkout/orders/'+order.id+'/capture','post',{},order.ref+'-capture');remote=ppCall_(c,'/v2/checkout/orders/'+order.id);unit=ppValidateOrder_(remote,order);cap=ppCompleteCapture_(unit,order);}
  if(!cap)return {ok:true,estado:'PENDIENTE',provider:'paypal',total:ppAmount_(order.data.cents),currency:'USD'};
  if(remote.status!=='COMPLETED')throw fail_('PayPal todavía no confirma la finalización del pedido.');
  const all=ppSheet_().getDataRange().getValues();if(all.slice(1).some(r=>String(r[0])!==order.ref&&String(r[5])===cap.id))throw fail_('Esta captura de PayPal ya está asociada a otro pedido.');
  order.capture=cap.id;
  if(order.data.env==='sandbox'){order.state='SIMULACION';ppSave_(order);ordersSheet_().getRange(findOrder_(ordersSheet_(),order.ref),5).setValue('SIMULACION');return {ok:true,estado:'SIMULACION'};}
  order.state='PAGADO';ppSave_(order);const osh=ordersSheet_(),n=findOrder_(osh,order.ref);osh.getRange(n,7).setValue('PAYPAL:'+cap.id);
  return ppDeliver_(order);
}
function ppHandle_(b,email){
  if(b.action==='paypal_quote')return ppQuote_(b,email);
  if(b.action==='paypal_create')return ppCreate_(b,email);
  const order=ppOwned_(b,email);if(order.state==='ENTREGADO')return {ok:true,estado:'ENTREGADO'};
  if(order.state==='SIMULACION')return {ok:true,estado:'SIMULACION'};
  if(!order.data.customerName){order.data.customerName=NAME_||'';ppSave_(order);}
  return ppSettle_(order,b.action==='paypal_confirm');
}
function ppWebhook_(body){
  const c=ppConfig_(),event=body.event||{},h=body.headers||{};if(!c.webhook)return {ok:false};
  const fields=['paypal-transmission-id','paypal-transmission-time','paypal-transmission-sig','paypal-auth-algo','paypal-cert-url'];if(fields.some(k=>typeof h[k]!=='string'||!h[k]||h[k].length>4096))return {ok:false};
  if(!/^https:\/\/api(?:-m)?(?:\.sandbox)?\.paypal\.com\/v1\/notifications\/certs\//.test(h['paypal-cert-url']))return {ok:false};
  const verified=ppCall_(c,'/v1/notifications/verify-webhook-signature','post',{auth_algo:h['paypal-auth-algo'],cert_url:h['paypal-cert-url'],transmission_id:h['paypal-transmission-id'],transmission_sig:h['paypal-transmission-sig'],transmission_time:h['paypal-transmission-time'],webhook_id:c.webhook,webhook_event:event});
  if(verified.verification_status!=='SUCCESS')return {ok:false};
  const resource=event.resource||{},id=event.event_type==='CHECKOUT.ORDER.APPROVED'?resource.id:(((resource.supplementary_data||{}).related_ids||{}).order_id);
  if(!/^[A-Z0-9]{1,36}$/.test(String(id||'')))return {ok:true};const order=ppFind_(1,id);if(!order||order.data.env!==c.env)return {ok:true};
  if(event.event_type==='CHECKOUT.ORDER.APPROVED'||event.event_type==='PAYMENT.CAPTURE.COMPLETED')return ppSettle_(order,event.event_type==='CHECKOUT.ORDER.APPROVED');
  if(/REFUNDED|REVERSED/.test(String(event.event_type))){log_('Revisar incidencia PayPal',order.ref+' · '+event.event_type,'paypal');avisar_('Revisar pago PayPal',[order.ref,event.event_type,'Verifica el movimiento en PayPal antes de cambiar el acceso.']);}
  return {ok:true};
}
function ppAdminSet_(b){
  const s=b.settings;if(!s||typeof s!=='object'||Array.isArray(s))throw fail_('Configuración no válida.');
  const allowed=['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_WEBHOOK_ID','PAYPAL_MERCHANT_ID'];
  const values={};allowed.forEach(k=>{if(s[k]!==undefined&&String(s[k]).trim()){const v=String(s[k]).trim();if(v.length>512||/[\r\n]/.test(v))throw fail_('El valor de '+k+' no es válido.');values[k]=v;}});
  if(s.PAYPAL_ENV!==undefined){if(['live','sandbox'].indexOf(s.PAYPAL_ENV)<0)throw fail_('Ambiente no válido.');values.PAYPAL_ENV=s.PAYPAL_ENV;}
  if(s.PAYPAL_ENABLED!==undefined)values.PAYPAL_ENABLED=s.PAYPAL_ENABLED===true?'true':'false';
  if(s.PAYPAL_USD_PRICES!==undefined){const prices=s.PAYPAL_USD_PRICES;if(!prices||typeof prices!=='object'||Array.isArray(prices))throw fail_('Los precios USD deben ser un objeto.');const clean={};Object.keys(prices).forEach(k=>{if(!CATALOGO[k]||!ppCents_(prices[k]))throw fail_('Precio USD no válido para '+k+'.');clean[k]=ppAmount_(ppCents_(prices[k]));});values.PAYPAL_USD_PRICES=JSON.stringify(clean);}
  if(values.PAYPAL_ENABLED==='true'){
    const c=ppConfig_();c.env=values.PAYPAL_ENV||c.env;c.client=values.PAYPAL_CLIENT_ID||c.client;c.secret=values.PAYPAL_CLIENT_SECRET||c.secret;
    ppToken_(c); // Authentication-only check; does not create or capture a payment.
  }
  PropertiesService.getScriptProperties().setProperties(values);log_('Configuración PayPal actualizada','Se actualizaron parámetros del proveedor; secretos ocultos.','admin');
  return {ok:true,paypal:ppStatus_()};
}
function paypalEstado(){Logger.log(JSON.stringify(ppStatus_()));}
function paypalVerificarConexion(){ppToken_(ppConfig_());Logger.log('PayPal: autenticación correcta. No se crearon pedidos ni se capturaron pagos.');}
function ppSummaries_(){const result={};ppSheet_().getDataRange().getValues().slice(1).forEach(r=>{try{const q=JSON.parse(String(r[3]));result[String(r[0])]={total:ppAmount_(q.cents),env:q.env};}catch(e){}});return result;}
