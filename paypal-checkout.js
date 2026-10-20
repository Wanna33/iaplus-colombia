/* Redirect checkout. Prices and credentials are controlled by the authenticated server. */
(() => {
  const state={ready:false,env:'live',prices:{}};
  const usd=value=>'US$'+Number(value).toLocaleString('es-CO',{minimumFractionDigits:2,maximumFractionDigits:2});
  const canPay=id=>state.ready&&state.env==='live'&&/^\d+\.\d{2}$/.test(state.prices[id]||'');
  window.IAPPayPal={canPay,amount:id=>canPay(id)?usd(state.prices[id]):'',get available(){return state.ready&&state.env==='live';}};
  const dialog=document.createElement('dialog');dialog.className='paypal-dialog';dialog.setAttribute('aria-labelledby','paypalCheckoutTitle');document.body.append(dialog);
  let source=null,busy=false;
  const header='<header class="paypal-checkout-head"><strong>Pay<span>Pal</span></strong><button type="button" data-pp-close aria-label="Cerrar pago de PayPal">✕</button></header>';
  const show=body=>{dialog.innerHTML=header+body;dialog.querySelector('[data-pp-close]').onclick=()=>{if(!busy)dialog.close();};if(!dialog.open)dialog.showModal();};
  dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  dialog.addEventListener('close',()=>{if(source?.isConnected)source.focus();});
  function error(message){busy=false;show(`<h2 id="paypalCheckoutTitle">No pudimos abrir PayPal</h2><p>${esc(message)}</p><a class="btn btn-ghost" href="https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent('Hola, necesito ayuda para pagar con PayPal.')}" target="_blank" rel="noopener">Consultar por WhatsApp</a>`);}
  async function start(id,button){
    if(busy||!canPay(id))return;
    if(!user){const parent=button.closest('dialog');if(parent?.open)parent.close();toast('Ingresa con Google para asociar el pago a tu cuenta.');openLogin();return;}
    source=button;busy=true;
    show('<h2 id="paypalCheckoutTitle">Consultando tu plan…</h2><p>Verificamos el precio y la disponibilidad con la tienda.</p><p class="pp-loading" role="status">Un momento, por favor…</p>');
    let quote;try{quote=await apiRaw({action:'paypal_quote',producto:id});}catch(e){error(e.message);return;}
    busy=false;
    if(quote.env!=='live'||quote.currency!=='USD'||!/^\d+\.\d{2}$/.test(String(quote.total))||!quote.quote){error('No se recibió una cotización válida del servidor.');return;}
    show(`<span class="pp-eyebrow">REVISA TU COMPRA</span><h2 id="paypalCheckoutTitle">${esc(quote.name)}</h2><dl class="pp-summary"><div><dt>Duración del plan</dt><dd>${Number(quote.days)} días</dd></div><div><dt>Moneda del cobro</dt><dd>Dólares estadounidenses (USD)</dd></div><div class="pp-total"><dt>Total en PayPal</dt><dd>${usd(quote.total)}</dd></div></dl><p>Este es el precio de este plan en PayPal. Si tu medio de pago utiliza otra moneda, PayPal te mostrará la conversión aplicable antes de aprobar.</p><p class="pp-terms">La cuenta se activa después de verificar el pago. Revisa los <a href="terminos.html" target="_blank" rel="noopener">términos y garantía</a> antes de continuar.</p><button type="button" class="btn paypal-button" id="continuePayPal">Continuar a PayPal · ${usd(quote.total)}</button><p class="pp-small">Completarás la aprobación en PayPal. Esta página no solicita datos de tu tarjeta ni tu contraseña de PayPal.</p><p id="paypalCheckoutError" role="status"></p>`);
    dialog.querySelector('#continuePayPal').onclick=async e=>{
      if(busy)return;
      if(Date.now()>=Number(quote.expires)){error('El precio venció. Vuelve a elegir el plan para consultar una cotización actual.');return;}
      busy=true;const b=e.currentTarget;b.disabled=true;b.textContent='Preparando tu pedido…';
      try{
        const result=await apiRaw({action:'paypal_create',quote:quote.quote});
        const approved=new URL(result.approveUrl);if(approved.protocol!=='https:'||approved.hostname!=='www.paypal.com')throw new Error('El servidor no devolvió una dirección válida de PayPal.');
        save('iap_pay',{provider:'paypal',ref:result.ref,id:result.id,t:Date.now()});
        location.assign(approved.href);
      }catch(ex){busy=false;b.disabled=false;b.textContent='Reintentar abrir PayPal';dialog.querySelector('#paypalCheckoutError').textContent=ex.message;}
    };
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-paypal]');if(b)start(b.dataset.paypal,b);});
  postJson(CONFIG.API_URL,{action:'paypal_config'}).then(j=>{
    if(!j?.ok||!j.ready||j.env!=='live')return;
    state.ready=true;state.env=j.env;state.prices=j.prices||{};
    renderGrid();
    const grid=document.getElementById('grid');
    if(grid&&!document.getElementById('ppPromo')){
      const promo=document.createElement('div');promo.id='ppPromo';promo.className='pp-promo';
      promo.innerHTML='<b>Paga con PayPal</b> y tu cuenta llega sola después del pago. Elige tu plan y pulsa el botón PayPal de la tarjeta.';
      grid.parentNode.insertBefore(promo,grid);
    }
  }).catch(()=>{});
})();
