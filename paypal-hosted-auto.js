/* Hosted PayPal methods, with server-verified automatic account fulfillment. */
(() => {
  'use strict';
  const plans={chatgpt:'3.17',chatgpt3:'6.34',chatgpt6:'10.87'};
  const dialog=document.createElement('dialog');
  dialog.className='iap-hosted-dialog iap-checkout-compact';dialog.setAttribute('aria-labelledby','hostedAutoTitle');document.body.append(dialog);
  let generation=0,timer,source,checking=false,activePayment;
  const preparing=new Map();
  function prepare(id,buyer,pending){
    const requestKey=buyer+'|'+id;
    if(!preparing.has(requestKey)){
      const request=apiRaw({action:'paypal_hosted_create',producto:id,pendingRef:pending?.ref||''});
      preparing.set(requestKey,request);
      request.finally(()=>{if(preparing.get(requestKey)===request)preparing.delete(requestKey);}).catch(()=>{});
    }
    return preparing.get(requestKey);
  }
  const email=()=>String(user?.email||'').trim().toLowerCase();
  const key=buyer=>'iap_hosted_pending:'+buyer;
  const current=(n,buyer)=>n===generation&&dialog.open&&email()===buyer;
  const header='<header class="iap-checkout-brand"><strong>Pago seguro</strong><button type="button" data-close aria-label="Cerrar pago">✕</button></header>';
  const show=body=>{dialog.innerHTML=header+body;dialog.querySelector('[data-close]').onclick=()=>dialog.close();if(!dialog.open)dialog.showModal();};
  const status=text=>{const el=dialog.querySelector('[role=status]');if(el)el.textContent=text;};
  const validLink=p=>p?.checkout==='hosted'&&p.env==='live'&&/^https:\/\/www\.paypal\.com\/ncp\/payment\/PLB-[A-Z0-9]{6,40}$/.test(p.approveUrl||'')&&/^IAPP-[A-Z2-9]{12}$/.test(p.ref||'');
  function remember(p,buyer){save(key(buyer),{...p,owner:buyer});save('iap_pay',{provider:'paypal',checkout:'hosted',ref:p.ref,id:p.id||'',owner:buyer,t:Date.now()});}
  function finish(p,buyer){save(key(buyer),null);const old=load('iap_pay',null);if(old?.ref===p.ref)save('iap_pay',null);save('iap_has',true);}
  dialog.addEventListener('close',()=>{generation++;activePayment=null;clearTimeout(timer);source?.isConnected&&source.focus();});
  window.IAPPayPal={canPay:id=>!!plans[id],amount:id=>plans[id]?'US$'+plans[id]:'',get available(){return true;}};
  fetch(CONFIG.API_URL,{method:'POST',body:JSON.stringify({action:'paypal_config'}),credentials:'omit'}).then(r=>r.json()).then(j=>{if(j.ready&&j.prices){for(const id of ['diseno3','diseno6'])if(j.prices[id])plans[id]=String(j.prices[id]);if(typeof renderGrid==='function')renderGrid();}}).catch(()=>{});
  window.addEventListener('focus',()=>{if(activePayment&&dialog.querySelector('[data-pay]')?.dataset.started==='true'){clearTimeout(timer);monitor(activePayment.p,activePayment.buyer,activePayment.n);}});
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
      if(dialog.querySelector('[data-pay]')?.dataset.started==='true')status('Esperando confirmación del pago…');
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
      const p=await prepare(id,buyer,load(key(buyer),null));
      if(p?.estado==='ENTREGADO'){
        if(!current(n,buyer))return;
        finish(p,buyer);show('<h2 id="hostedAutoTitle">Tu compra ya está activa</h2><p>Encuentra tus accesos en Mi cuenta.</p><a class="btn full" href="cuenta.html">Ver mis accesos</a><button class="btn full" data-new>Nueva compra</button>');dialog.querySelector('[data-new]').onclick=()=>start(id,button);return;
      }
      if(p?.estado==='APROBADO_SIN_STOCK'){
        if(current(n,buyer))show('<h2 id="hostedAutoTitle">Tu pago está registrado</h2><p>El equipo está resolviendo la entrega. No vuelvas a pagar.</p><a class="btn full" href="cuenta.html">Ir a Mi cuenta</a>');return;
      }
      if(!validLink(p))throw new Error('No pudimos preparar el pago automático. Intenta de nuevo en unos momentos.');
      // Retain a created order even if its dialog was closed while awaiting the server.
      remember(p,buyer);if(!current(n,buyer))return;
      activePayment={p,buyer,n};
      show(`<section class="iap-compact-summary"><h2 id="hostedAutoTitle">${esc(p.name)}</h2><p class="iap-compact-duration">${Number(p.days)} días de ChatGPT · pago único</p>${p.bonusDays?`<p class="iap-compact-duration">Incluye CapCut Pro por ${Number(p.bonusDays)} días</p>`:''}<div class="iap-compact-price">US$${esc(p.total)} <span>USD</span></div></section><a class="btn full paypal-button iap-compact-pay" href="${esc(p.approveUrl)}" target="_blank" rel="noopener" data-pay>Pagar ahora <span aria-hidden="true">→</span></a><p class="iap-compact-methods">Tarjetas · PayPal · Apple Pay*</p><p class="iap-compact-activation"><span aria-hidden="true">✓</span> Activación automática</p><p class="iap-compact-status" role="status" aria-live="polite"></p><details class="iap-compact-details"><summary>Detalles de la compra</summary><p>Acceso para <strong>${esc(buyer)}</strong>.</p><p>Sin renovación automática. El cobro se realiza en USD.</p><p>El pago se abre en PayPal. *Apple Pay depende de la disponibilidad para tu dispositivo y país.</p><a href="terminos.html" target="_blank" rel="noopener">Términos y garantía</a><button type="button" class="btn full" data-review>Revisar mi pago</button></details>`);
      dialog.querySelector('[data-review]').onclick=()=>{clearTimeout(timer);monitor(p,buyer,n);};
      dialog.querySelector('[data-pay]').addEventListener('click',()=>{dialog.querySelector('[data-pay]').dataset.started='true';status('Confirma el pago en PayPal.');clearTimeout(timer);timer=setTimeout(()=>monitor(p,buyer,n),4000);});
    }catch(error){if(current(n,buyer)){show('<h2 id="hostedAutoTitle">No pudimos preparar el pago</h2><p role="status">'+esc(error.message)+'</p><button type="button" class="btn full" data-retry>Reintentar</button>');dialog.querySelector('[data-retry]')?.addEventListener('click',()=>start(id,button));}}
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-paypal],[data-hosted-paypal]');if(!button)return;const id=button.dataset.paypal||button.dataset.hostedPaypal;if(!plans[id])return;event.preventDefault();event.stopImmediatePropagation();start(id,button);},true);
  if(typeof renderGrid==='function')renderGrid();
})();
