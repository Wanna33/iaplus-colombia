/* Public customer help: deterministic rules, no network requests or stored conversations. */
(() => {
  const normalize = value => String(value).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/chat\s*gpt/g,'chatgpt').replace(/cap\s*cut/g,'capcut').replace(/you\s*tube/g,'youtube').replace(/[¿?¡!]/g,' ').replace(/\s+/g,' ').trim();
  const money = value => '$'+Number(value).toLocaleString('es-CO');
  const families={chatgpt:/chatgpt/,canva:/canva/,capcut:/capcut/,claude:/claude/,gemini:/gemini/,flow:/\bflow\b/,duolingo:/duolingo|idiomas/,xbox:/xbox|game pass/,premiere:/premiere/,photoshop:/photoshop/,davinci:/davinci|da vinci/,youtube:/youtube/,filmora:/filmora/};
  // Palabras clave para tolerar errores de escritura (una letra de diferencia).
  const familyWords={chatgpt:['chatgpt'],canva:['canva'],capcut:['capcut'],claude:['claude'],gemini:['gemini'],duolingo:['duolingo'],premiere:['premiere'],photoshop:['photoshop'],davinci:['davinci'],youtube:['youtube'],filmora:['filmora']};
  const categoryRules=[
    ['Streaming',/sin anuncios|series|netflix|musica|spotify|\bver (?:peliculas|series|contenido|videos)/],
    ['Juegos',/jugar|juegos|juego|game|xbox/],
    ['Educación',/idioma|ingles|aprender|educacion|educativ/],
    ['Diseño',/diseno|fotos?|imagen|ilustra|\blogos?\b/],
    ['Edición de video',/video|reels|tiktok|editar|edicion|montaje/],
    ['IA',/escribir|programar|codigo|estudiar|tarea|inteligencia|\bia\b|texto/]
  ];
  // Preguntas cortas que se refieren al tema de la conversación anterior.
  const followUp=/\bmes|\bano|anual|privad|compart|disposit|cuesta|precio|cuanto|vale\b|barat|dura|\by\b|tambien|otro|otra/;
  const months={un:1,1:1,tres:3,3:3,seis:6,6:6,doce:12,12:12};
  function distance(a, b) {
    let row = Array.from({length: b.length + 1}, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return row[b.length];
  }
  function familyOf(q) {
    const explicit = Object.keys(families).find(key => families[key].test(q));
    if (explicit) return explicit;
    for (const token of q.split(' ')) {
      if (token.length < 5) continue;
      for (const [key, list] of Object.entries(familyWords)) {
        if (list.some(word => distance(token, word) === 1)) return key;
      }
    }
    return null;
  }
  function categoryOf(q) {
    const hit = categoryRules.find(([, pattern]) => pattern.test(q));
    return hit ? hit[0] : null;
  }
  function budgetOf(q) {
    const m = q.match(/(hasta|presupuesto(?: de)?|menos de|maximo|con|tengo)?\s*\$?\s*(\d[\d.,]*)\b(?:\s*(mil)\b)?(?!\s*(?:mes|meses|dia|dias|ano|anos|anual|dispositivo|dispositivos))/);
    if (!m) return null;
    const value = Number(m[2].replace(/[.,]/g,'')) * (m[3] ? 1000 : 1);
    return (m[1] || m[3] || /\$/.test(m[0]) || value >= 1000) ? value : null;
  }
  function daysOf(q) {
    const m = q.match(/\b(un|1|tres|3|seis|6|doce|12)\s*(?:mes|meses)\b/);
    if (m) return months[m[1]] === 12 ? 365 : months[m[1]] * 30;
    return /anual|un ano|1 ano/.test(q) ? 365 : null;
  }
  function answer(question, catalog = [], context = {}) {
    const q=normalize(question);
    const C=typeof IAPCatalog==='undefined'?require('./catalog-utils.js'):IAPCatalog;
    const named=Object.keys(families).filter(key=>families[key].test(q));
    const family=familyOf(q)||(followUp.test(q)?context.family||null:null);
    const budget=budgetOf(q);
    const requestedDays=daysOf(q);
    const cheapest=/barat|economic|menor precio|mas bajo/.test(q);
    const category=categoryOf(q)||((budget||cheapest||followUp.test(q))?context.category:null);
    const inFamily=key=>catalog.filter(p=>families[key].test(normalize(p.name)));
    if(/^(muchas )?gracias\b|^(chao|adios|hasta luego)\b/.test(q)&&!family&&!category) return {text:'¡Con gusto! Si necesitas algo más, aquí estaré. Recuerda que la activación llega después de confirmar tu pago.'};
    if(/devol|devuelv|reembols|cambiar de opinion|me arrepent/.test(q)) return {text:'Una vez pagado y entregado el acceso no hay devolución de dinero por cambio de opinión o por no usar el servicio. Si la cuenta no corresponde a lo ofrecido o no funciona y no logramos reemplazarla, tienes derecho a la garantía que indica la ley. Revisa los términos y condiciones o escríbenos por WhatsApp.',terms:true,contact:true};
    if(/problema|falla|garantia|no funciona|no sirve|no entra|no me deja|error/.test(q)) return {text:'Si tu cuenta presenta una falla, abre «Mi cuenta» y solicita ayuda por WhatsApp. El equipo revisará el caso según las condiciones de garantía. No escribas contraseñas ni códigos en este chat.',account:true,contact:true};
    if(/oficial|original|legit|seguro|estafa|confia|confiable|es real|robo|fraude/.test(q)) return {text:'Cada plan muestra su modalidad, dispositivos y duración en la ficha. El pago se hace con PayPal dentro de la tienda y puedes revisar los términos antes de pagar. Si tienes una duda específica sobre un plan, escríbenos por WhatsApp.',terms:true,contact:true};
    if(/compart|privad|disposit/.test(q)){
      const relevant=family?inFamily(family):[];
      return {text:relevant.length?relevant.map(p=>`${p.name}: ${C.mode(p)}. ${C.devices(p)}.`).join(' '):'Cada cuenta puede tener condiciones distintas. Revisa la modalidad y los dispositivos en la ficha del plan antes de pagar.',products:relevant,family,catalog:!relevant.length};
    }
    if(/activ|codigo|enlace/.test(q)) return {text:'Cuando recibas tu código, entra con Google y escríbelo en «¿Ya pagaste?». Si ya lo activaste, abre «Mi cuenta» con el mismo correo. Este chat no activa códigos ni valida pagos.',activate:true,account:true};
    if(/paypal|tarjeta|credito|debito/.test(q)) return {text:'Pagas con PayPal dentro de la tienda: elige tu plan y pulsa el botón «PayPal» de su tarjeta. La activación llega después de confirmar el pago. Si un producto no muestra PayPal, escríbenos por WhatsApp.',catalog:true,contact:true};
    if(/pago|pagar|nequi|banco|transfer|comprobante|como comprar|como compro/.test(q)) return {text:'Elige tu plan y pulsa el botón «PayPal» de su tarjeta. Revisas el importe total en PayPal antes de aprobar. Después recibes las instrucciones de activación.',catalog:true};
    if(/contrasena|gmail|google|correo/.test(q)) return {text:'Usa el botón oficial de Google de la página para iniciar sesión. No necesitas compartir tu contraseña personal por chat. Usa el mismo correo con el que realizaste la compra.',account:true};
    if(/renov|venc/.test(q)) return {text:'Consulta la duración y el vencimiento de tu plan en «Mi cuenta». Para renovar, elige el plan en el catálogo y paga con PayPal.',account:true,catalog:true};
    if(/entrega|tarda|tiempo/.test(q)) return {text:'La activación se gestiona después de confirmar tu pago en PayPal. Si tienes dudas sobre el tiempo, escribe por WhatsApp.',contact:true};
    if(/cuanto dura|duracion|vigencia|cuantos meses|hasta cuando/.test(q)&&family){
      const plans=inFamily(family).sort((a,b)=>a.price-b.price);
      return {text:plans.length?'Cada plan indica su duración en la ficha. Estos son los planes de esa cuenta.':'No encuentro planes de esa cuenta en el catálogo actual. Consulta por WhatsApp.',products:plans,family,contact:!plans.length};
    }
    if(named.length>=2){
      const plans=catalog.filter(p=>named.some(key=>families[key].test(normalize(p.name)))).sort((a,b)=>a.price-b.price);
      return {text:'Estos son los planes de ambas cuentas. Compara modalidad, dispositivos y precio en cada ficha.',products:plans.slice(0,8),catalog:true};
    }
    if(family){
      let matches=inFamily(family);
      if(requestedDays)matches=matches.filter(p=>C.days(p)===requestedDays);
      if(budget)matches=matches.filter(p=>p.price<=budget);
      matches.sort((a,b)=>a.price-b.price);
      if(matches.length)return {text:cheapest?'Este es el plan de menor precio de esa cuenta que coincide con tu consulta. El importe es el total por la duración indicada. Confirma disponibilidad antes de pagar.':'Estos son los planes que coinciden con tu consulta. El importe es el total por la duración indicada. Confirma disponibilidad antes de pagar.',products:matches,family};
      return {text:'No encuentro un plan con esas condiciones de duración o presupuesto en el catálogo actual. Puedes revisar otras opciones o consultar por WhatsApp.',family,catalog:true,contact:true};
    }
    if(category||budget||cheapest){
      const matches=catalog.filter(p=>(!category||p.cat===category)&&(!budget||p.price<=budget)).sort((a,b)=>a.price-b.price);
      return {text:matches.length?(budget?'Estas opciones están dentro de tu presupuesto. Cada precio corresponde al plan completo indicado.':'Estas opciones coinciden con tu objetivo. Cada precio corresponde al plan completo indicado.'):'No hay planes que coincidan con ese presupuesto y objetivo. Prueba otro importe o consulta por WhatsApp.',products:matches.slice(0,6),category:category||null,advisor:true,contact:!matches.length};
    }
    if(/recomiend|cual me|cual es mejor|cual conviene|que me conviene|cual elijo|no se cual|ayudame|ayuda para elegir/.test(q)) return {text:'Te ayudo a elegir. Dime para qué lo usarás (escribir o programar, diseñar, editar videos, aprender idiomas, jugar o ver contenido) y tu presupuesto total.',advisor:true,catalog:true};
    if(/precio|cuesta|planes|catalogo|cuenta|elegir/.test(q)) return {text:'Puedes comparar las cuentas del catálogo o usar «Ayúdame a elegir» para filtrar por objetivo y presupuesto. ¿Buscas ChatGPT, Canva, CapCut u otra cuenta?',catalog:true,advisor:true};
    if(/^(hola|buenas|buenos|hey|saludos)/.test(q)) return {text:'¡Hola! Te ayudo con cuentas digitales, precios, pasos de compra y activación. ¿Qué cuenta te interesa?',catalog:true};
    if(context.family) return {text:'No entendí la consulta. Seguimos con la cuenta que estabas revisando: puedes preguntar por su precio, duración o modalidad, o hablar con una persona por WhatsApp.',products:inFamily(context.family),family:context.family,contact:true};
    return {text:'No tengo una respuesta programada para esa consulta. Puedes elegir un tema, probar con otras palabras o hablar con una persona por WhatsApp.',contact:true};
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
    if(result.category)conversation.category=result.category;
    const box=document.createElement('div');box.className='ph-answer';
    const copy=document.createElement('p');copy.textContent=result.text;box.append(copy);
    const phone=typeof CONFIG==='undefined'?'573102035327':CONFIG.WHATSAPP;
    (result.products||[]).forEach(p=>addLink(box,`${p.name} · ${money(p.price)} COP ${p.per}`,'#catalogo'));
    if(result.catalog)addLink(box,'Ver catálogo de cuentas ↗','#catalogo');
    if(result.advisor)addLink(box,'Ayúdame a elegir ↗','#asistentes');
    if(result.account)addLink(box,'Abrir Mi cuenta ↗','cuenta.html');
    if(result.terms)addLink(box,'Ver términos y condiciones ↗','terminos.html');
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
