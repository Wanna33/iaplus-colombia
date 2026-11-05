/* Hosted PayPal methods, with server-verified automatic account fulfillment. */
(() => {
  'use strict';
  const plans={chatgpt:'3.17',chatgpt3:'6.34',chatgpt6:'10.87'};
  const dialog=document.createElement('dialog');
  dialog.className='iap-hosted-dialog';dialog.setAttribute('aria-labelledby','hostedAutoTitle');document.body.append(dialog);
  let generation=0,timer,source,checking=false;
  const email=()=>String(user?.email||'').trim().toLowerCase();
  const key=buyer=>'iap_hosted_pending:'+buyer;
  const current=(n,buyer)=>n===generation&&dialog.open&&email()===buyer;
  const header='<header class="iap-checkout-brand"><strong>IA Plus Colombia · Pago seguro</strong><button type="button" data-close aria-label="Cerrar pago">✕</button></header>';
  const show=body=>{dialog.innerHTML=header+body;dialog.querySelector('[data-close]').onclick=()=>dialog.close();if(!dialog.open)dialog.showModal();};
  const status=text=>{const el=dialog.querySelector('[role=status]');if(el)el.textContent=text;};
  const validLink=p=>p?.checkout==='hosted'&&p.env==='live'&&/^https:\/\/www\.paypal\.com\/ncp\/payment\/PLB-[A-Z0-9]{6,40}$/.test(p.approveUrl||'')&&/^IAPP-[A-Z2-9]{12}$/.test(p.ref||'');
  function remember(p,buyer){save(key(buyer),{...p,owner:buyer});save('iap_pay',{provider:'paypal',checkout:'hosted',ref:p.ref,id:p.id||'',owner:buyer,t:Date.now()});}
  function finish(p,buyer){save(key(buyer),null);const old=load('iap_pay',null);if(old?.ref===p.ref)save('iap_pay',null);save('iap_has',true);}
  dialog.addEventListener('close',()=>{generation++;clearTimeout(timer);source?.isConnected&&source.focus();});
  window.IAPPayPal={canPay:id=>!!plans[id],amount:id=>plans[id]?'US$'+plans[id]:'',get available(){return true;}};
  async function monitor(p,buyer,n,round=0){
    if(!current(n,buyer)||checking)return;
    checking=true;
    try{
      const result=await apiRaw({action:'paypal_status',ref:p.ref});
      if(!current(n,buyer))return;
      if(result.estado==='ENTREGADO'){
        finish(p,buyer);show('<h2 id="hostedAutoTitle">¡Tu suscripción está activa!</h2><p>PayPal confirmó el pago y tus accesos ya están disponibles.</p><a class="btn full iap-hosted-support" href="cuenta.html">Ver mi cuenta y mis accesos</a>');return;
      }
      if(result.estado==='APROBADO_SIN_STOCK'){
        show('<h2 id="hostedAutoTitle">Pago recibido</h2><p>Registramos tu pago, pero el último acceso se agotó. Avisamos al equipo para resolver la entrega. No vuelvas a pagar.</p><a class="btn full" href="cuenta.html">Ir a Mi cuenta</a>');return;
      }
      status('Esperando la confirmación de PayPal. Al completarse el pago, tu suscripción aparecerá aquí automáticamente.');
    }catch(error){if(current(n,buyer))status(error.message+' Si ya pagaste, no repitas el pago. Puedes volver a revisar el pedido.');}
    finally{checking=false;}
    if(current(n,buyer)&&round<60)timer=setTimeout(()=>monitor(p,buyer,n,round+1),8000);
  }
  async function start(id,button){
    if(!plans[id])return;
    button.closest('dialog')?.close();
    if(!user){toast('Ingresa con tu Gmail para recibir el acceso automáticamente.');openLogin();return;}
    source=button;clearTimeout(timer);const n=++generation,buyer=email();
    show('<h2 id="hostedAutoTitle">Preparando tu compra…</h2><p role="status">Comprobando tu plan y disponibilidad.</p>');
    try{
      let p=load(key(buyer),null);
      if(p?.ref){
        let result;
        try{result=await apiRaw({action:'paypal_status',ref:p.ref});}
        catch(error){if(!['No encontramos ese pedido para tu cuenta.','Pedido de PayPal no válido.'].includes(error.message))throw error;save(key(buyer),null);p=null;}
        if(!current(n,buyer))return;
        if(result?.estado==='ENTREGADO'){
          finish(p,buyer);show('<h2 id="hostedAutoTitle">Tu compra ya está activa</h2><p>Encuentra tus accesos en Mi cuenta.</p><a class="btn full" href="cuenta.html">Ver mis accesos</a><button class="btn full" data-new>Nueva compra</button>');dialog.querySelector('[data-new]').onclick=()=>start(id,button);return;
        }
        if(result?.estado==='APROBADO_SIN_STOCK'){show('<h2 id="hostedAutoTitle">Tu pago está registrado</h2><p>El equipo está resolviendo la entrega. No vuelvas a pagar.</p><a class="btn full" href="cuenta.html">Ir a Mi cuenta</a>');return;}
        if(result?.checkout)p=result.checkout;
      }
      if(!p)p=await apiRaw({action:'paypal_hosted_create',producto:id});
      if(!validLink(p))throw new Error('No pudimos preparar el pago automático. Intenta de nuevo en unos momentos.');
      // Retain a created order even if its dialog was closed while awaiting the server.
      remember(p,buyer);if(!current(n,buyer))return;
      show(`<section class="iap-order-summary"><span class="iap-checkout-eyebrow">TU PLAN, A UN PASO</span><h2 id="hostedAutoTitle">${esc(p.name)}</h2><div class="iap-order-bottom"><span class="iap-plan-duration">${Number(p.days)} días de acceso<small>Pago único · sin renovación automática</small></span><span class="iap-hosted-total">US$${esc(p.total)}<small>USD</small></span></div></section><h3>Elige cómo pagar en PayPal</h3><p>Tarjeta de crédito o débito · PayPal · Apple Pay cuando esté disponible.</p><a class="btn full paypal-button" href="${esc(p.approveUrl)}" target="_blank" rel="noopener" data-pay>Pagar ahora · US$${esc(p.total)}</a><p class="iap-checkout-footnote">Se abrirá el pago seguro de PayPal. Puedes mantener esta ventana abierta: tu acceso se activará aquí al confirmarse el pago.</p><div class="iap-activation-note"><span aria-hidden="true">✓</span><p><strong>Activación automática en tu cuenta</strong><br>Sin enviar comprobantes ni escribir por WhatsApp.</p></div><p role="status">Tu pedido está listo para pagar.</p><button type="button" class="btn full" data-review>Revisar mi pago</button><p class="iap-checkout-footnote">Gmail de activación: ${esc(buyer)}<br><a href="terminos.html" target="_blank" rel="noopener">Términos y garantía</a></p>`);
      dialog.querySelector('[data-review]').onclick=()=>{clearTimeout(timer);monitor(p,buyer,n);};
      dialog.querySelector('[data-pay]').addEventListener('click',()=>{clearTimeout(timer);timer=setTimeout(()=>monitor(p,buyer,n),4000);});
      timer=setTimeout(()=>monitor(p,buyer,n),8000);
    }catch(error){if(current(n,buyer)){show('<h2 id="hostedAutoTitle">No pudimos preparar el pago</h2><p role="status">'+esc(error.message)+'</p><button type="button" class="btn full" data-retry>Reintentar</button>');dialog.querySelector('[data-retry]')?.addEventListener('click',()=>start(id,button));}}
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-paypal],[data-hosted-paypal]');if(!button)return;const id=button.dataset.paypal||button.dataset.hostedPaypal;if(!plans[id])return;event.preventDefault();event.stopImmediatePropagation();start(id,button);},true);
  if(typeof renderGrid==='function')renderGrid();
})();
