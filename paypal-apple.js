/* Apple Pay uses the same authenticated order and server capture as other methods. */
(() => {
  'use strict';
  const loadAppleSDK = () => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js';
    script.onload = resolve; script.onerror = reject; document.head.append(script);
  });
  const bounded = task => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Apple Pay availability timeout')), 12000);
    Promise.resolve(task).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
  window.IAPApplePay = async ({total, request, send, onError}) => {
    const area = document.getElementById('apple-method');
    const hint = document.getElementById('apple-hint');
    const unavailable = document.getElementById('apple-unavailable');
    const button = document.getElementById('apple-pay-button');
    const setHint = text => { hint.textContent = text; };
    if (!area || !hint || !unavailable || !button) return;
    try {
      if (!/^\d+\.\d{2}$/.test(total || '') || Number(total) <= 0) throw Error('Invalid quote');
      const applepay = window.paypal.Applepay();
      const config = await bounded(applepay.config());
      if (!config.isEligible) {
        setHint('Apple Pay aún no está habilitado para esta tienda. Puedes pagar con tarjeta o PayPal.');
        return;
      }
      await bounded(loadAppleSDK());
      if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
        setHint('Apple Pay no está disponible en este dispositivo o navegador. Puedes usar tarjeta o PayPal.');
        return;
      }
      unavailable.hidden = true; button.hidden = false;
      setHint('Confirma el pago con tu dispositivo Apple.');
      let busy = false;
      button.addEventListener('click', () => {
        if (busy) return;
        busy = true;
        let session, ended = false, authorized = false;
        const release = () => {
          busy = false;
          area.removeAttribute('aria-busy');
          document.querySelectorAll('.payment-method:not(#apple-method)').forEach(el => el.inert = false);
          send({type:'iap-inline-apple-busy',busy:false});
        };
        const fail = () => {
          if (!ended && session) { try { session.abort(); } catch {} }
          ended = true; release(); onError();
        };
        try {
          // Must be created synchronously in the buyer's click handler.
          session = new ApplePaySession(4, {
            countryCode:config.countryCode, currencyCode:'USD',
            supportedNetworks:config.supportedNetworks,
            merchantCapabilities:config.merchantCapabilities,
            requiredBillingContactFields:['postalAddress'],
            total:{label:'IA Plus Colombia',type:'final',amount:total}
          });
          area.setAttribute('aria-busy','true');
          document.querySelectorAll('.payment-method:not(#apple-method)').forEach(el => el.inert = true);
          send({type:'iap-inline-apple-busy',busy:true});
          session.onvalidatemerchant = async event => {
            try {
              const validation = await applepay.validateMerchant({validationUrl:event.validationURL,displayName:'IA Plus Colombia'});
              if (!ended) session.completeMerchantValidation(validation.merchantSession);
            } catch { fail(); }
          };
          session.oncancel = () => { ended = true; release(); };
          session.onpaymentauthorized = async event => {
            if (authorized || ended) return;
            authorized = true;
            try {
              const order = await request('iap-inline-create');
              if (ended) return;
              const approval = await applepay.confirmOrder({orderId:order.id,token:event.payment.token,billingContact:event.payment.billingContact});
              if (!['APPROVED','COMPLETED'].includes(approval.status)) throw Error('Payment not approved');
              // The server independently checks ownership, amount, recipient and capture.
              const capture = await request('iap-inline-apple-approved',{id:order.id});
              if (!['ENTREGADO','APROBADO_SIN_STOCK'].includes(capture.state)) throw Error('Capture not completed');
              if (!ended) { session.completePayment(ApplePaySession.STATUS_SUCCESS); ended = true; }
              release();
              // Only now may the parent replace the iframe with the verified receipt.
              send({type:'iap-inline-apple-finished',id:order.id});
            } catch {
              if (!ended) { try { session.completePayment(ApplePaySession.STATUS_FAILURE); } catch {} ended = true; }
              release(); onError();
            }
          };
          session.begin();
        } catch { fail(); }
      });
    } catch {
      setHint('No pudimos comprobar Apple Pay. Puedes continuar con tarjeta o PayPal.');
    }
  };
})();
