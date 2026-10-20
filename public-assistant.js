/* Public customer help: deterministic rules, no network requests or stored conversations. */
(() => {
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/chat\s*gpt/g,'chatgpt').replace(/cap\s*cut/g,'capcut').replace(/you\s*tube/g,'youtube').replace(/\s+/g,' ').trim();
  const money = value => '$'+Number(value).toLocaleString('es-CO');
  const families={chatgpt:/chatgpt/,canva:/canva/,capcut:/capcut/,claude:/claude/,gemini:/gemini/,flow:/\bflow\b/,duolingo:/duolingo|idiomas/,xbox:/xbox|game pass/,premiere:/premiere/,photoshop:/photoshop/,davinci:/davinci|da vinci/,youtube:/youtube/,filmora:/filmora/};
  function answer(question, catalog = [], context = {}) {
    const q=normalize(question);
    const C=typeof IAPCatalog==='undefined'?require('./catalog-utils.js'):IAPCatalog;
    if(/problema|falla|garantia|reembolso|no funciona/.test(q)) return {text:'Si tu cuenta presenta una falla, abre «Mi cuenta» y solicita ayuda por WhatsApp. El equipo revisará el caso según las condiciones de garantía. No escribas contraseñas ni códigos en este chat.',account:true,contact:true};
    const explicitFamily=Object.keys(families).find(key=>families[key].test(q));
    const family=explicitFamily||(/mes|ano|anual|privad|compart|disposit|cuesta|precio/.test(q)?context.family:null);
    const budgetMatch=q.match(/(?:hasta|presupuesto(?: de)?|menos de)\s*\$?\s*(\d[\d.,]*)\s*(mil)?/);
    const budget=budgetMatch?Number(budgetMatch[1].replace(/[.,]/g,''))*(budgetMatch[2]?1000:1):null;
    if(/compart|privad|disposit/.test(q)){
      const relevant=family?catalog.filter(p=>families[family].test(normalize(p.name))):[];
      return {text:relevant.length?relevant.map(p=>`${p.name}: ${C.mode(p)}. ${C.devices(p)}.`).join(' '):'Cada cuenta puede tener condiciones distintas. Revisa la modalidad y los dispositivos en la ficha del plan antes de pagar.',products:relevant,family,catalog:!relevant.length};
    }
    if(/activ|codigo|enlace/.test(q)) return {text:'Cuando recibas tu código, entra con Google y escríbelo en «¿Ya pagaste?». Si ya lo activaste, abre «Mi cuenta» con el mismo correo. Este chat no activa códigos ni valida pagos.',activate:true,account:true};
    if(/pago|pagar|nequi|banco|transfer|comprobante|como comprar|como compro/.test(q)) return {text:'Elige tu cuenta y confirma por WhatsApp el precio, duración, modalidad y disponibilidad antes de pagar. Allí te indican los datos de pago y revisan tu comprobante. Después recibes las instrucciones de activación.',contact:true,catalog:true};
    if(/contrasena|gmail|google|correo/.test(q)) return {text:'Usa el botón oficial de Google de la página para iniciar sesión. No necesitas compartir tu contraseña personal por chat. Usa el mismo correo con el que realizaste la compra.',account:true};
    if(/renov|venc/.test(q)) return {text:'Consulta la duración y el vencimiento de tu plan en «Mi cuenta». Para renovar, confirma precio y disponibilidad por WhatsApp.',account:true,contact:true};
    if(/entrega|tarda|tiempo/.test(q)) return {text:'La activación se gestiona después de revisar tu pago. Confirma el tiempo estimado de entrega por WhatsApp antes de comprar.',contact:true};
    let matches=family?catalog.filter(p=>families[family].test(normalize(p.name))):[];
    const months=q.match(/\b(1|3|6|12)\s*(?:mes|meses)/);
    const requestedDays=months?(Number(months[1])===12?365:Number(months[1])*30):/anual|un ano/.test(q)?365:null;
    if(requestedDays&&family)matches=matches.filter(p=>C.days(p)===requestedDays);
    if(budget&&family)matches=matches.filter(p=>p.price<=budget);
    if(family&&matches.length)return {text:'Estos son los planes que coinciden con tu consulta. El importe es el total por la duración indicada. Confirma disponibilidad antes de pagar.',products:matches,family};
    if(family)return {text:'No encuentro un plan con esas condiciones de duración o presupuesto en el catálogo actual. Puedes revisar otras opciones o consultar por WhatsApp.',family,catalog:true,contact:true};
    const category=/video|reels|pelicula/.test(q)?'Edición de video':/diseno|fotos|imagenes/.test(q)?'Diseño':/escribir|programar|estudiar|inteligencia/.test(q)?'IA':/jugar|juegos/.test(q)?'Juegos':/editar|edicion/.test(q)?'Edición de video':null;
    if(category||budget){matches=catalog.filter(p=>(!category||p.cat===category)&&(!budget||p.price<=budget)).sort((a,b)=>a.price-b.price);return {text:matches.length?'Estas opciones coinciden con tu objetivo o presupuesto. Cada precio corresponde al plan completo indicado.':'No hay planes que coincidan con ese presupuesto y objetivo. Prueba otro importe o consulta con atención.',products:matches.slice(0,6),advisor:true,contact:!matches.length};}
    if(/precio|cuesta|planes|catalogo|cuenta|elegir|recomiend/.test(q)) return {text:'Puedes comparar las cuentas del catálogo o usar «Ayúdame a elegir» para filtrar por objetivo y presupuesto. ¿Buscas ChatGPT, Canva, CapCut u otra cuenta?',catalog:true,advisor:true};
    if(/^(hola|buenas|buenos|hey|saludos)/.test(q)) return {text:'¡Hola! Te ayudo con cuentas digitales, precios, pasos de compra y activación. ¿Qué cuenta te interesa?',catalog:true};
    return {text:'No tengo una respuesta programada para esa consulta. Puedes elegir un tema o hablar con una persona por WhatsApp.',contact:true};
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={answer};return;}
  window.IAPPublicHelp={answer};
  const launcher=document.getElementById('publicHelpLaunch');
  const dialog=document.getElementById('publicHelpDialog');
  if(!launcher||!dialog)return;
  const log=dialog.querySelector('[data-help-log]');
  const form=dialog.querySelector('form');
  const field=form.querySelector('input');
  let conversation={};
  const addLink=(box,text,href)=>{const a=document.createElement('a');a.textContent=text;a.href=href;if(href.startsWith('https:')){a.target='_blank';a.rel='noopener';}else a.onclick=()=>dialog.close();box.append(a);};
  function respond(text){
    const user=document.createElement('p');user.className='ph-question';user.textContent=text;log.append(user);
    const result=answer(text,typeof PRODUCTS==='undefined'?[]:PRODUCTS,conversation);
    if(result.family)conversation.family=result.family;
    const box=document.createElement('div');box.className='ph-answer';
    const copy=document.createElement('p');copy.textContent=result.text;box.append(copy);
    const phone=typeof CONFIG==='undefined'?'573102035327':CONFIG.WHATSAPP;
    (result.products||[]).forEach(p=>addLink(box,`${p.name} · ${money(p.price)} COP ${p.per}`,`https://wa.me/${phone}?text=${encodeURIComponent('Hola, quiero confirmar disponibilidad y condiciones de '+p.name+' ('+money(p.price)+' COP '+p.per+').')}`));
    if(result.catalog)addLink(box,'Ver catálogo de cuentas ↗','#catalogo');
    if(result.advisor)addLink(box,'Ayúdame a elegir ↗','#asistentes');
    if(result.account)addLink(box,'Abrir Mi cuenta ↗','cuenta.html');
    if(result.activate)addLink(box,'Ir a activar mi código ↗','#unlock');
    if(result.contact)addLink(box,'Hablar con una persona por WhatsApp ↗',`https://wa.me/${phone}?text=${encodeURIComponent('Hola, necesito ayuda con las cuentas de IA Plus.')}`);
    log.append(box);while(log.children.length>16)log.firstElementChild.remove();log.scrollTop=log.scrollHeight;
  }
  const open=()=>{if(typeof dialog.showModal!=='function'){location.hash='asistentes';return;}dialog.showModal();launcher.setAttribute('aria-expanded','true');field.focus();};
  launcher.onclick=open;
  document.querySelectorAll('[data-open-help]').forEach(b=>b.onclick=open);
  dialog.querySelector('[data-help-close]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{launcher.setAttribute('aria-expanded','false');launcher.focus();});
  dialog.querySelectorAll('[data-help-topic]').forEach(b=>b.onclick=()=>respond(b.dataset.helpTopic));
  form.onsubmit=e=>{e.preventDefault();const text=field.value.trim();if(!text)return;field.value='';respond(text);};
})();
