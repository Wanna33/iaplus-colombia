/* Local automation: data stays in memory; only enabled/disabled preferences are stored. */
(() => {
  const definitions = [
    {id:'renewals',name:'Bot de vencimientos',icon:'◷',description:'Detecta planes activos que vencen en los próximos 5 días y prepara la revisión de renovaciones.'},
    {id:'inventory',name:'Bot de inventario',icon:'▦',description:'Agrupa los productos y detecta códigos agotados o con pocas unidades disponibles.'},
    {id:'support',name:'Bot de incidencias',icon:'◇',description:'Ordena las cuentas marcadas con problemas y las ventas de WhatsApp que necesitan ayuda.'}
  ];
  function analyze(records, sales = []) {
    const list = Array.isArray(records) ? records : [];
    const renewals = list.filter(i => i.cliente && !i.vencida && i.restante !== null && i.restante !== undefined && Number.isFinite(Number(i.restante)) && Number(i.restante) >= 0 && Number(i.restante) <= 5).sort((a,b)=>Number(a.restante)-Number(b.restante));
    const products = new Map();
    for (const i of list) {
      const name = String(i.producto || 'Sin producto');
      const free = !i.cliente && !!i.codigo && i.estado !== 'Con problemas';
      products.set(name, (products.get(name) || 0) + (free ? 1 : 0));
    }
    return {
      renewals: renewals.map(i => ({title:String(i.producto || 'Plan')+' · '+Number(i.restante)+' días',detail:String(i.nombre || i.cliente),target:'cli'})),
      inventory: [...products].filter(([,n])=>n<=2).sort((a,b)=>a[1]-b[1]).map(([name,n])=>({title:name,detail:n ? `${n} códigos disponibles. Revisa si necesitas preparar más.` : 'Sin códigos disponibles en los datos cargados.',target:'cod'})),
      support: list.filter(i=>i.estado==='Con problemas').map(i=>({title:String(i.producto || 'Cuenta')+' · requiere revisión',detail:'Revisa el estado en Cuentas antes de reasignar o modificar accesos.',target:'cta'})).concat((Array.isArray(sales)?sales:[]).filter(s=>['NECESITA AYUDA','RECLAMO','POR CONFIRMAR'].includes(s.estado)).map(s=>({title:'WhatsApp · '+s.estado,detail:'Revisa esta solicitud en el espacio de WhatsApp.',target:'wa'})))
    };
  }
  let root, records=[], timer, paused=false, latest={}, lastRun;
  let enabled={renewals:true,inventory:true,support:true};
  try { const p=JSON.parse(localStorage.getItem('iap_local_bot_preferences') || '{}'); definitions.forEach(d=>{if(typeof p[d.id]==='boolean')enabled[d.id]=p[d.id];}); } catch {}
  const safe = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function run() {
    if(!root?.isConnected)return;
    latest=analyze(records,typeof WAV==='undefined'?[]:WAV);
    lastRun=new Date();
    draw();
  }
  function draw() {
    root.innerHTML=`<div class="lb-intro"><span class="lb-kicker">TU EQUIPO LOCAL</span><h2>Menos tareas repetitivas.<br>Más control de tu negocio.</h2><p>Estos bots revisan los datos ya cargados. No usan modelos de IA ni hacen solicitudes de red. La revisión se repite cada minuto mientras este panel está abierto y visible.</p><div class="lb-actions"><button type="button" class="btn p" data-lb-run>Revisar ahora</button><button type="button" class="btn" data-lb-pause>${paused?'Reanudar revisión':'Pausar revisión'}</button><span role="status">${paused?'Pausado':'Revisión local activa'} · ${lastRun?lastRun.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',timeZone:'America/Bogota'}):'—'} (Colombia)</span></div></div><div class="lb-grid">${definitions.map(d=>`<article class="lb-card"><span class="lb-icon">${d.icon}</span><label class="lb-switch"><input type="checkbox" data-lb-toggle="${d.id}" ${enabled[d.id]?'checked':''}> ${enabled[d.id]?'Activado':'Desactivado'}</label><h3>${d.name}</h3><p>${d.description}</p><strong>${enabled[d.id]?(latest[d.id]||[]).length:'—'}</strong><small>${enabled[d.id]?'pendientes detectados':'bot desactivado'}</small></article>`).join('')}</div><div class="lb-results"><h3>Pendientes priorizados</h3><p>Se recalculan con cada revisión. No cambian cuentas ni envían mensajes.</p>${definitions.map(d=>{if(!enabled[d.id])return '';const tasks=latest[d.id]||[];return `<section><h4>${d.name}</h4>${tasks.length?tasks.slice(0,30).map(t=>`<div class="lb-task"><div><b>${safe(t.title)}</b><small>${safe(t.detail)}</small></div><button class="btn s" type="button" data-lb-goto="${t.target}">Revisar ↗</button></div>`).join('')+(tasks.length>30?`<p>Mostrando 30 de ${tasks.length}. Consulta el listado completo en su sección.</p>`:''):'<p class="lb-clear">✓ Sin pendientes detectados en los datos cargados.</p>'}</section>`;}).join('')}${definitions.every(d=>!enabled[d.id])?'<p>Activa al menos un bot para ver pendientes.</p>':''}</div><div class="lb-existing"><h3>Tus otros asistentes, en su espacio</h3><p>El bot de WhatsApp y los agentes de «Mi empresa» conservan su configuración. Pueden utilizar servicios externos y consumir saldo de IA; no forman parte de estas automatizaciones locales.</p><button class="btn" data-lb-goto="wa">Abrir WhatsApp ↗</button> <button class="btn" data-lb-goto="ag">Abrir Mi empresa ↗</button><p class="lb-foot">Para recibir datos nuevos utiliza «Actualizar» en el panel. Al cerrar la página se detiene la revisión local. No se almacenan clientes, códigos ni contraseñas en este módulo.</p></div>`;
    root.querySelector('[data-lb-run]').onclick=run;
    root.querySelector('[data-lb-pause]').onclick=()=>{paused=!paused;draw();};
    root.querySelectorAll('[data-lb-toggle]').forEach(el=>el.onchange=()=>{enabled[el.dataset.lbToggle]=el.checked;try{localStorage.setItem('iap_local_bot_preferences',JSON.stringify(enabled));}catch{}draw();});
    root.querySelectorAll('[data-lb-goto]').forEach(el=>el.onclick=()=>{if(typeof setTab==='function')setTab(el.dataset.lbGoto);});
  }
  window.IAPLocalBots={analyze,mount(element,data){
    if(!element)return;
    root=element; records=data;run();
    clearInterval(timer);
    timer=setInterval(()=>{if(!paused&&!document.hidden&&root?.isConnected&&!root.closest('.hide'))run();},60000);
  }};
})();
