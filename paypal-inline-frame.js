(() => {
  'use strict';
  let initialized = false, sequence = 0;
  const requests = new Map();
  const send = data => parent.postMessage(data,location.origin);
  const notifyError = () => { document.getElementById('status').textContent = 'No se pudo completar el pago. Revisa el estado en la tienda antes de volver a pagar.'; send({type:'iap-inline-error'}); };
  function request(type, extra = {}) {
    const key = String(++sequence);
    return new Promise((resolve,reject) => {
      const timeout = setTimeout(()=>{requests.delete(key);reject(new Error('El servidor tardó en responder. Revisa el pago.'));},90000);
      requests.set(key,{resolve,reject,timeout}); send({type,request:key,...extra});
    });
  }
  window.addEventListener('message', async event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    const data = event.data || {};
    if (data.type === 'iap-inline-response') {
      const pending = requests.get(data.request); if (!pending) return;
      requests.delete(data.request); clearTimeout(pending.timeout);
      data.error ? pending.reject(new Error(data.error)) : pending.resolve(data); return;
    }
    if (data.type !== 'iap-inline-init' || initialized || !/^[A-Za-z0-9_-]{20,200}$/.test(data.clientId || '')) return;
    initialized = true;
    try {
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='https://www.paypal.com/sdk/js?client-id='+encodeURIComponent(data.clientId)+'&locale=es_CO&currency=USD&intent=capture&components=buttons,card-fields&enable-funding=card&disable-funding=venmo';
        script.onload=resolve;script.onerror=reject;document.head.append(script);
      });
      const callbacks={createOrder:async()=> (await request('iap-inline-create')).id,
        onApprove:async details=>{await request('iap-inline-approved',{id:details.orderID});},
        onError:notifyError,onCancel:()=>send({type:'iap-inline-error'})};
      let cards = false;
      if (window.paypal.CardFields) {
        const fields = paypal.CardFields({...callbacks,style:{input:{'font-size':'16px','color':'#172c50'}}});
        if (fields.isEligible()) {
          cards = true; document.getElementById('card-form').hidden=false;
          await Promise.all([fields.NameField({placeholder:'Nombre en la tarjeta'}).render('#card-name'),fields.NumberField({placeholder:'Número de tarjeta'}).render('#card-number'),fields.ExpiryField({placeholder:'MM/AA'}).render('#card-expiry'),fields.CVVField({placeholder:'CVV'}).render('#card-cvv')]);
          document.getElementById('pay-card').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await fields.submit({contingencies:['SCA_WHEN_REQUIRED']});}catch{notifyError();}finally{button.disabled=false;}};
        }
      }
      if (!cards) {
        const card=paypal.Buttons({...callbacks,fundingSource:paypal.FUNDING.CARD,style:{layout:'vertical'}});
        if(card.isEligible()) await card.render('#card-button');
      }
      const wallet=paypal.Buttons({...callbacks,fundingSource:paypal.FUNDING.PAYPAL,style:{layout:'vertical'}});
      if(wallet.isEligible()) await wallet.render('#wallet-buttons');
      send({type:'iap-inline-loaded'});
    } catch(error) {console.error('PayPal initialization:', error?.message);notifyError();}
  });
  new ResizeObserver(()=>send({type:'iap-inline-height',height:document.body.scrollHeight+10})).observe(document.body);
  send({type:'iap-inline-ready'});
})();
