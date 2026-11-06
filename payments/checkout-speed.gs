// One authenticated request resumes an existing purchase or creates the selected plan.
// This runs under doPost's existing payment lock; it never trusts a browser's payment status.
function ppHostedStartFast_(b,email){
  const c=ppConfig_();
  if(!ppHostedReady_(c))throw fail_('El pago con activación automática aún no está disponible. Intenta más tarde.');
  function resume(order){
    const result=ppHandle_({action:'paypal_status',ref:order.ref},email);
    return result.estado==='PENDIENTE' ? (result.checkout || ppHostedApproval_(order)) : Object.assign({ref:order.ref},result);
  }
  if(b.pendingRef){
    let previous;
    try{previous=ppOwned_({ref:b.pendingRef},email);}
    catch(e){if(['No encontramos ese pedido para tu cuenta.','Pedido de PayPal no válido.'].indexOf(e.message)<0)throw e;}
    if(previous&&previous.data.env===c.env){
      if(['PAGADO','ENTREGADO','APROBADO_SIN_STOCK'].indexOf(previous.state)>=0)return resume(previous);
      if(previous.id){
        const result=resume(previous);
        if(result.estado!=='PENDIENTE'&&result.checkout!=='hosted'||previous.data.product===b.producto)return result;
      }
      if(previous.data.product===b.producto&&previous.data.checkout==='hosted'&&previous.data.resource&&previous.state==='PENDIENTE')return resume(previous);
    }
  }
  const recent=ppSheet_().getDataRange().getValues().slice(1).reverse().find(r=>{
    if(['PENDIENTE','CREANDO'].indexOf(r[4])<0||Date.now()-new Date(r[6]).getTime()>=3600000)return false;
    try{const q=JSON.parse(String(r[3]));return q.email===email&&q.product===b.producto&&q.env===c.env&&q.checkout==='hosted';}catch(e){return false;}
  });
  if(recent){
    const order=ppOwned_({ref:String(recent[0])},email);
    return order.data.resource?resume(order):ppCreate_({quote:order.quote},email);
  }
  const valid=ppGuard_(email,String(b.producto||''),c);
  const quote=ppQuote_({producto:b.producto,checkout:'hosted'},email,valid);
  return ppCreate_({quote:quote.quote},email,valid);
}
