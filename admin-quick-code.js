/* A single administrator action creates one code. The server picks current inventory. */
(function(root){
  function mount({form,api,load,save,esc,copy,refresh,owner}){
    if(!form)return;
    const select=form.querySelector('select'),button=form.querySelector('button'),out=form.parentElement.querySelector('[data-quick-result]');
    const key='iap_quick_pending:'+owner;let pending=load(key),busy=false;
    if(pending&&(![1,3,6].includes(pending.months)||!/^[a-zA-Z0-9-]{16,80}$/.test(pending.id||''))){pending=null;save(key,null);}
    if(pending){select.value=String(pending.months);select.disabled=true;button.textContent='Recuperar código pendiente';}
    form.onsubmit=async e=>{
      e.preventDefault();if(busy)return;
      const months=Number(select.value);if(![1,3,6].includes(months))return;
      if(pending&&pending.months!==months){out.textContent='Recupera primero el código pendiente con la duración anterior.';select.value=String(pending.months);return;}
      pending=pending||{months,id:crypto.randomUUID()};save(key,pending);busy=true;button.disabled=true;select.disabled=true;button.textContent='Generando…';out.textContent='Eligiendo una cuenta activa y preparando tu enlace…';
      try{
        const result=await api('admin_quick_code',{meses:months,solicitud:pending.id});
        if(result.caducado){save(key,null);pending=null;out.textContent='El código pendiente ya caducó. Pulsa Generar código y enlace para crear uno nuevo.';return;}
        if(!/^IAP-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(result.codigo||'')||result.dias!==months*30)throw Error('La respuesta necesita revisión. Recupera la misma solicitud.');
        const link='https://wanna33.github.io/iaplus-colombia/cuenta.html?codigo='+encodeURIComponent(result.codigo);
        const message=`¡Hola! 👋 Tu acceso a ChatGPT por ${months} ${months===1?'mes':'meses'} está listo para activar en IA Plus Colombia.\n\n🔗 Activa tu acceso aquí:\n${link}\n\n1. Abre el enlace e inicia sesión con tu Gmail.\n2. Pulsa «Activar mi acceso».\n3. Entra a «Mi cuenta» para consultar tu acceso.\n\n📅 Tu plan dura ${result.dias} días desde la activación.\n🔑 Código: ${result.codigo}\n\nEl código es de un solo uso. Si necesitas ayuda, responde a este mensaje.`;
        save(key,null);pending=null;
        out.innerHTML=`<div class="quick-code-success"><span class="tag t-ok">Listo para entregar</span><h3>ChatGPT · ${months} ${months===1?'mes':'meses'}</h3><p>${result.dias} días desde que el cliente active el código.</p><div class="acts"><button type="button" class="btn p" data-copy-message>Copiar mensaje para el cliente</button><button type="button" class="btn" data-copy-link>Copiar enlace</button><button type="button" class="btn" data-copy-code>Copiar código</button></div><details class="quick-code-message"><summary>Ver mensaje para el cliente</summary><textarea readonly rows="12" aria-label="Mensaje para el cliente" style="width:100%;margin-top:12px;resize:vertical">${esc(message)}</textarea></details><label>Código<input readonly value="${esc(result.codigo)}" aria-label="Código generado"></label><label>Enlace de activación<input readonly value="${esc(link)}" aria-label="Enlace de activación"></label></div>`;
        out.querySelector('[data-copy-message]').onclick=()=>copy(message);
        out.querySelector('[data-copy-link]').onclick=()=>copy(link);out.querySelector('[data-copy-code]').onclick=()=>copy(result.codigo);
        Promise.resolve().then(refresh).catch(()=>{});
      }catch(error){out.textContent=error.message+' La solicitud queda guardada: pulsa Recuperar código pendiente para comprobarla sin duplicar códigos.';}
      finally{busy=false;button.disabled=false;select.disabled=!!pending;button.textContent=pending?'Recuperar código pendiente':'Generar código y enlace';}
    };
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={mount};else root.IAPQuickCode={mount};
})(typeof window!=='undefined'?window:globalThis);
