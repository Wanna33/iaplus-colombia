/* PayPal-hosted checkout. Payment confirmation and activation are handled by support. */
(() => {
  'use strict';
  const plans = {
    chatgpt: { button: 'ESZ3PJJFB5752', name: 'ChatGPT Plus compartido — 1 mes', amount: '3.17', enabled: true },
    chatgpt3: { button: 'QJWRD7JVZVBMQ', name: 'ChatGPT Plus compartido — 3 meses', amount: '6.34', enabled: true },
    chatgpt6: { button: 'R244SQBE54KXA', name: 'ChatGPT Plus compartido — 6 meses', amount: '10.87', enabled: true }
  };
  const legacy = window.IAPPayPal;
  window.IAPPayPal = {
    canPay: id => !!plans[id]?.enabled || !!legacy?.canPay(id),
    amount: id => plans[id]?.enabled ? `US$${plans[id].amount}` : legacy?.amount(id) || '',
    get available() { return true; }
  };
  const dialog = document.createElement('dialog');
  dialog.className = 'iap-hosted-dialog';
  dialog.setAttribute('aria-labelledby', 'iapHostedTitle');
  document.body.append(dialog);
  let source, generation = 0;
  dialog.addEventListener('close', () => { generation++; source?.focus(); });
  function mount() {
    for (const card of document.querySelectorAll('#grid [data-product]')) {
      const id = card.dataset.product;
      const plan = plans[id];
      if (!plan?.enabled || card.querySelector('[data-hosted-paypal]')) continue;
      const button = card.querySelector('[data-paypal]') || document.createElement('button');
      button.removeAttribute('data-paypal');
      button.type = 'button';
      button.className = 'btn full iap-hosted-trigger';
      button.dataset.hostedPaypal = id;
      button.textContent = `Tarjeta / PayPal · US$${plan.amount}`;
      button.setAttribute('aria-label', `Pagar ${plan.name} con tarjeta o PayPal: USD ${plan.amount}`);
      card.append(button);
    }
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-hosted-paypal], [data-paypal]');
    const plan = plans[button?.dataset.hostedPaypal || button?.dataset.paypal];
    if (!plan?.enabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const parent = button.closest('dialog');
    if (parent?.open) parent.close();
    source = button;
    const current = ++generation;
    const support = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent('Hola, quiero verificar mi pago de PayPal para '+plan.name+'. Adjunto el comprobante y mi Gmail para activar el acceso.')}`;
    dialog.innerHTML = `<header><strong>Pago seguro con PayPal</strong><button type="button" aria-label="Cerrar pago">✕</button></header>
      <h2 id="iapHostedTitle">${plan.name}</h2>
      <p class="iap-hosted-total">US$${plan.amount} <small>USD · pago único</small></p>
      <p>Cuenta compartida por el periodo indicado. Sin renovación automática. El cobro se realiza en dólares; tu proveedor de pago puede aplicar una conversión.</p>
      <p class="iap-hosted-delivery"><strong>Activación por WhatsApp:</strong> después de pagar, envíanos el comprobante y tu Gmail. Verificaremos el pago para entregarte el acceso.</p>
      <p>PayPal mostrará las opciones disponibles para tu dispositivo y país, incluidas tarjetas o Apple Pay cuando corresponda.</p>
      <p><a href="terminos.html" target="_blank" rel="noopener">Términos y garantía</a></p>
      <p role="status" id="iapHostedStatus">Cargando opciones de pago…</p>
      <div id="paypal-container-${plan.button}"></div>
      <a class="btn full iap-hosted-fallback" href="https://www.paypal.com/ncp/payment/${plan.button}" target="_blank" rel="noopener">Abrir pago en PayPal ↗</a>
      <a class="btn full iap-hosted-support" href="${support}" target="_blank" rel="noopener">Enviar comprobante por WhatsApp</a>`;
    dialog.querySelector('header button').onclick = () => dialog.close();
    if (!dialog.open) dialog.showModal();
    const frame = document.createElement('iframe');
    frame.title = 'Opciones de pago de PayPal';
    frame.allow = 'payment';
    frame.className = 'iap-hosted-frame';
    frame.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation');
    frame.src = 'paypal-hosted-frame.html?v=20261105-restored1&button=' + plan.button;
    const status = dialog.querySelector('#iapHostedStatus');
    const fail = () => { if (generation === current && dialog.open) status.textContent = 'Si los botones no aparecen, abre el pago directamente en PayPal con el enlace de abajo.'; };
    const timeout = setTimeout(fail, 20000);
    function receive(message) {
      if (message.origin !== location.origin || message.source !== frame.contentWindow || message.data?.button !== plan.button) return;
      if (generation !== current) return;
      if (message.data.type === 'iap-paypal-ready') {
        clearTimeout(timeout); status.textContent = '';
      } else if (message.data.type === 'iap-paypal-error') {
        clearTimeout(timeout); fail();
      } else if (message.data.type === 'iap-paypal-height' && Number.isFinite(message.data.height)) {
        frame.style.height = Math.max(160, Math.min(1200, message.data.height)) + 'px';
      }
    }
    window.addEventListener('message', receive);
    dialog.addEventListener('close', () => { clearTimeout(timeout); window.removeEventListener('message', receive); }, {once:true});
    dialog.querySelector('#paypal-container-' + plan.button).append(frame);
  }, true);
  window.addEventListener('iap:catalog-updated', mount);
  const grid = document.getElementById('grid');
  if (grid) new MutationObserver(mount).observe(grid, { childList: true });
  if (typeof renderGrid === 'function') renderGrid();
  mount();
})();
