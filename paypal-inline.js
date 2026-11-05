/* Automatic checkout: the authenticated server owns price, capture and delivery. */
(() => {
  'use strict';
  let config = null, source, order, confirming, active = 0;
  const money = value => `US$${Number(value).toFixed(2)}`;
  const dialog = document.createElement('dialog');
  dialog.className = 'iap-hosted-dialog';
  dialog.setAttribute('aria-labelledby', 'inlineTitle');
  document.body.append(dialog);
  const status = text => { const el = dialog.querySelector('[role=status]'); if (el) el.textContent = text; };
  const emailOf = () => String(user?.email || '').trim().toLowerCase();
  const pendingKey = email => 'iap_paypal_pending:' + email;
  const pending = email => {
    const own = load(pendingKey(email), null);
    if (own) return own;
    const legacy = load('iap_pay', null);
    return legacy && (!legacy.owner || legacy.owner === email) ? legacy : null;
  };
  function remember(value, email) {
    const item = {...value, owner:email};
    save(pendingKey(email), item); save('iap_pay', item);
  }
  function forget(value, email) {
    // Preserve the original reference for support; never delete server orders.
    save('iap_paypal_last:' + email, value);
    save(pendingKey(email), null);
    const legacy = load('iap_pay', null);
    if (legacy?.ref === value?.ref) save('iap_pay', null);
  }
  const header = '<header><span class="iap-checkout-brand"><span class="iap-checkout-mark" aria-hidden="true">IA</span><span>IA Plus Colombia<small>Pago seguro</small></span></span><button type="button" data-close aria-label="Cerrar pago">✕</button></header>';
  function show(body) {
    dialog.innerHTML = header + body;
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    if (!dialog.open) dialog.showModal();
  }
  dialog.addEventListener('close', () => { active++; source?.isConnected && source.focus(); });
  async function confirm() {
    if (order?.owner !== emailOf()) throw new Error('La sesión cambió. Cierra esta ventana y vuelve a entrar con tu cuenta.');
    if (confirming) return confirming;
    if (!order?.ref || !order?.id) throw new Error('No encontramos el pedido. Revisa tus pagos antes de volver a pagar.');
    const current = active, purchase = {...order}, buyer = emailOf();
    confirming = (async () => {
      status('Verificando el pago y activando tu cuenta…');
      const result = await apiRaw({action:'paypal_confirm',ref:purchase.ref,id:purchase.id});
      if (current !== active || emailOf() !== buyer) return result;
      if (result.estado === 'ENTREGADO') {
        forget(purchase, buyer); save('iap_has', true);
        show('<h2 id="inlineTitle">¡Tu cuenta está lista!</h2><p>El pago fue verificado y tu suscripción ya está activa.</p><a class="btn full iap-hosted-support" href="cuenta.html">Ver mi cuenta y mis accesos</a>');
      } else if (result.estado === 'APROBADO_SIN_STOCK') {
        show('<h2 id="inlineTitle">Pago recibido</h2><p>No quedan accesos disponibles. Registramos tu pago y avisamos al equipo para resolver la entrega. No vuelvas a pagar.</p><a class="btn full" href="cuenta.html">Ir a mi cuenta</a>');
      } else {
        status('El pago aún no está completado. No vuelvas a pagar si ya lo aprobaste; pulsa «Revisar mi pago».');
      }
      return result;
    })();
    try { return await confirming; } finally { confirming = null; }
  }
  async function start(id, button) {
    if (!config?.ready || !config.prices[id]) return;
    const parent = button.closest('dialog'); if (parent?.open) parent.close();
    if (!user) { toast('Ingresa con Google para recibir el acceso automáticamente.'); openLogin(); return; }
    source = button; const current = ++active;
    order = null; let creating = null;
    const buyer = emailOf();
    const existing = pending(buyer);
    show('<h2 id="inlineTitle">Preparando tu compra…</h2><p role="status">Consultando precio y disponibilidad.</p>');
    try {
      let result;
      if (existing?.provider === 'paypal' && existing.ref && existing.id) {
        let previous;
        try { previous = await apiRaw({action:'paypal_status',ref:existing.ref,id:existing.id}); }
        catch(error) {
          // Only this definitive server response permits a fresh quote. Network and
          // payment-provider failures retain the pending order to prevent a duplicate.
          if (error.message !== 'No encontramos ese pedido para tu cuenta.' && error.message !== 'Pedido de PayPal no válido.') throw error;
          if(current !== active || emailOf() !== buyer) return;
          forget(existing, buyer);
        }
        if(current !== active || emailOf() !== buyer) return;
        if(!previous) {
          result = await apiRaw({action:'paypal_quote',producto:id,checkout:'embedded'});
        } else if(previous.estado === 'ENTREGADO') {
          forget(existing, buyer);
          show('<h2 id="inlineTitle">Tu compra anterior ya está activa</h2><p>Encuentra tus accesos en Mi cuenta. Si necesitas otro plan, puedes iniciar una nueva compra.</p><a class="btn full" href="cuenta.html">Ver mi cuenta</a><button type="button" class="btn full" data-new>Nueva compra</button>');
          dialog.querySelector('[data-new]').onclick=()=>start(id,button); return;
        } else if(previous.estado === 'PENDIENTE' && previous.checkout?.checkout === 'embedded') {
          order={...existing,owner:buyer}; remember(order,buyer); result=previous.checkout;
        } else {
          show('<h2 id="inlineTitle">Tu pedido anterior</h2><p>Revisa el resultado de tu pago antes de iniciar otra compra.</p><a class="btn full iap-hosted-support" href="pago.html?provider=paypal&ref='+encodeURIComponent(existing.ref)+'&token='+encodeURIComponent(existing.id)+'">Ver mi pedido</a>');
          return;
        }
      } else result = await apiRaw({action:'paypal_quote',producto:id,checkout:'embedded'});
      if (current !== active || emailOf() !== buyer) return;
      if (result.checkout !== 'embedded' || result.env !== 'live' || result.currency !== 'USD' || !/^[A-Za-z0-9_-]{20,200}$/.test(result.clientId || '') || !/^\d+\.\d{2}$/.test(result.total)) throw new Error('El servidor aún no está listo para el pago integrado.');
      const quote = result;
      show(`<section class="iap-order-summary"><span class="iap-checkout-eyebrow">TU PLAN, A UN PASO</span><h2 id="inlineTitle">${esc(quote.name)}</h2><div class="iap-order-bottom"><span class="iap-plan-duration">${Number(quote.days)} días de acceso<small>Pago único · sin renovación automática</small></span><span class="iap-hosted-total">${money(quote.total)}<small>USD</small></span></div></section><div class="iap-payment-heading"><h3>¿Cómo quieres pagar?</h3><p>Elige tu medio de pago para continuar.</p></div><p class="iap-loading-status" role="status">Preparando tus opciones de pago…</p><iframe class="iap-hosted-frame" title="Pagar con tarjeta o PayPal" allow="payment" src="paypal-inline-frame.html?v=20261105-fast1"></iframe><div class="iap-activation-note"><span aria-hidden="true">✓</span><p><strong>Tu acceso se activa automáticamente</strong><br>Cuando se confirme el pago, lo encontrarás en Mi cuenta.</p></div><p class="iap-checkout-footnote">Pago procesado por PayPal. Tus datos de tarjeta se introducen en sus campos seguros. <a href="terminos.html" target="_blank" rel="noopener">Términos y garantía</a></p><button class="btn full" type="button" data-check hidden>Revisar mi pago</button>`);
      const frame = dialog.querySelector('iframe');
      const review = dialog.querySelector('[data-check]');
      review.hidden = !order;
      review.onclick = () => confirm().catch(e => status(e.message));
      const timer = setTimeout(() => { if (current === active) status('Si los métodos no cargan, cierra esta ventana e inténtalo de nuevo.'); }, 20000);
      const respond = (request, data) => frame.contentWindow?.postMessage({type:'iap-inline-response',request,...data}, location.origin);
      async function receive(event) {
        if (event.origin !== location.origin || event.source !== frame.contentWindow || current !== active) return;
        const message = event.data || {};
        if (emailOf() !== buyer) { status('La sesión cambió. Cierra esta ventana y vuelve a elegir el plan.'); return; }
        if (message.type === 'iap-inline-ready') {
          frame.contentWindow.postMessage({type:'iap-inline-init',clientId:quote.clientId,total:quote.total,name:quote.name},location.origin);
        } else if (message.type === 'iap-inline-loaded') {
          clearTimeout(timer); status('');
        } else if (message.type === 'iap-inline-height' && Number.isFinite(message.height)) {
          frame.style.height = Math.max(180,Math.min(1400,message.height))+'px';
        } else if (message.type === 'iap-inline-error') {
          clearTimeout(timer); status(order ? 'No se pudo completar la operación. Revisa tu pago antes de volver a pagar.' : 'El medio de pago no pudo cargarse o se canceló. Puedes intentarlo de nuevo.');
        } else if (message.type === 'iap-inline-create') {
          try {
            if(order) { respond(message.request,{id:order.id}); return; }
            if (Date.now() >= quote.expires && !order) throw new Error('La cotización venció. Cierra esta ventana y vuelve a elegir el plan.');
            if (!creating) creating = apiRaw({action:'paypal_create',quote:quote.quote});
            const created = await creating;
            if (created.checkout !== 'embedded' || created.total !== quote.total || created.env !== 'live' || !/^IAPP-[A-Z2-9]{12}$/.test(created.ref) || !/^[A-Z0-9]{1,36}$/.test(created.id)) throw new Error('No se recibió un pedido válido.');
            // Persist even if the buyer closed the dialog while the request was in flight.
            remember({provider:'paypal',ref:created.ref,id:created.id,t:Date.now()},buyer);
            if (current !== active || emailOf() !== buyer) return;
            order = {...created,owner:buyer}; review.hidden = false;
            respond(message.request,{id:created.id});
          } catch(e) { creating = null; status(e.message); respond(message.request,{error:e.message}); }
        } else if (message.type === 'iap-inline-approved') {
          if (!order || message.id !== order.id) { respond(message.request,{error:'El pedido no coincide.'}); return; }
          try { const result = await confirm(); respond(message.request,{state:result.estado}); }
          catch(e) { status(e.message); respond(message.request,{error:e.message}); }
        }
      }
      window.addEventListener('message', receive);
      dialog.addEventListener('close', () => { clearTimeout(timer); window.removeEventListener('message',receive); }, {once:true});
    } catch(e) { if (current === active) {
      show('<h2 id="inlineTitle">No pudimos preparar el pago</h2><p role="status"></p><button type="button" class="btn full" data-retry>Volver a intentar</button><a class="btn full" href="cuenta.html">Revisar mi cuenta</a>');
      status(e.message); dialog.querySelector('[data-retry]').onclick=()=>start(id,button);
    } }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-paypal]');
    if (button && config?.prices[button.dataset.paypal]) { event.preventDefault(); event.stopImmediatePropagation(); start(button.dataset.paypal,button); }
  },true);
  const configKey = 'iap_paypal_public_config_v2';
  function applyConfig(value) {
    if (!value?.ok || !value.ready || value.env !== 'live' || value.checkoutVersion !== 2) return false;
    config = value;
    window.IAPPayPal = {canPay:id=>!!config?.prices[id],amount:id=>money(config.prices[id]),get available(){return !!config;}};
    renderGrid(); return true;
  }
  // Only public availability/prices are cached. Quotes, ownership, capture and
  // delivery always go to the authenticated server; stale prices cannot charge.
  const cachedConfig = load(configKey, null);
  if (cachedConfig?.until > Date.now()) applyConfig(cachedConfig.value);
  postJson(CONFIG.API_URL,{action:'paypal_config'}).then(value => {
    if (applyConfig(value)) save(configKey,{until:Date.now()+300000,value});
    else { config=null; save(configKey,null); renderGrid(); }
  }).catch(()=>{});
})();
