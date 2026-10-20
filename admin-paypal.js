/* Admin-only form. Server enforces authorization; secrets are never returned or stored here. */
(() => {
  function mount(parent,status){
    if(!status)return;
    const box=document.createElement('section');box.className='card';box.style.marginTop='18px';
    box.innerHTML=`<h2>PayPal · ${esc(status.env)}</h2><p class="hint">${status.ready?'Configurado para mostrar los planes con precio en USD.':'Falta completar o activar la configuración del servidor.'}</p><div class="acts">${status.secret?'✓ Secreto guardado':'○ Falta secreto'} · ${status.webhook?'✓ Webhook configurado':'○ Sin webhook automático'}</div><details style="margin-top:14px"><summary>Configurar PayPal</summary><form id="paypalSettingsForm" style="display:grid;gap:12px;padding-top:16px"><label>Modo <select name="mode"><option value="live" ${status.env==='live'?'selected':''}>Live · dinero real</option><option value="sandbox" ${status.env==='sandbox'?'selected':''}>Sandbox · pruebas sin entregar cuentas</option></select></label><label>ID de cliente (opcional si no cambia)<input name="client" autocomplete="off" placeholder="Se conserva el ID de cliente configurado"></label><label>Llave secreta nueva<input name="secret" type="password" autocomplete="new-password" placeholder="Vacío conserva la guardada; no se vuelve a mostrar"></label><label>ID del webhook (opcional)<input name="webhook" autocomplete="off" placeholder="ID del webhook del mismo ambiente"></label><label>Precios fijos en USD por clave de producto<textarea name="prices" rows="5" spellcheck="false">${esc(JSON.stringify(status.prices||{},null,2))}</textarea></label><label><input type="checkbox" name="enabled" ${status.enabled?'checked':''}> Habilitar PayPal para los planes configurados</label><p class="hint">El secreto se envía únicamente al servidor de la tienda y se guarda en las Propiedades del script. La integración pública solo recibe disponibilidad y precios.</p><button class="btn p" type="submit">Guardar configuración de PayPal</button><p data-settings-message role="status"></p></form></details>`;
    parent.append(box);const form=box.querySelector('form');
    form.onsubmit=async e=>{
      e.preventDefault();const button=form.querySelector('button[type=submit]'),message=form.querySelector('[data-settings-message]');
      const value=name=>form.elements.namedItem(name).value.trim();
      let prices;try{prices=JSON.parse(value('prices'));}catch{message.textContent='Los precios deben ser un objeto JSON válido.';return;}
      const settings={PAYPAL_ENV:value('mode'),PAYPAL_ENABLED:form.elements.namedItem('enabled').checked,PAYPAL_USD_PRICES:prices};
      if(value('client'))settings.PAYPAL_CLIENT_ID=value('client');if(value('secret'))settings.PAYPAL_CLIENT_SECRET=value('secret');if(value('webhook'))settings.PAYPAL_WEBHOOK_ID=value('webhook');
      button.disabled=true;message.textContent='Guardando en el servidor…';
      try{const result=await api('admin_paypal_set',{settings});form.elements.namedItem('secret').value='';delete settings.PAYPAL_CLIENT_SECRET;message.textContent=result.paypal.ready?'Configuración guardada. PayPal está disponible para los planes en USD.':'Configuración guardada. Aún faltan parámetros o habilitar PayPal.';}catch(error){message.textContent=error.message;}finally{form.elements.namedItem('secret').value='';delete settings.PAYPAL_CLIENT_SECRET;button.disabled=false;}
    };
  }
  window.IAPAdminPayPal={mount};
})();
