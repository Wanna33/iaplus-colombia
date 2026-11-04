/* An admin-only, read-only view. No credentials, orders or plans are written here. */
(function (scope) {
  'use strict';
  const FAILURE = /no pude completar|no puedo responder|respuesta automática.*error/i;
  const LIMITS = Object.freeze({avatars:12,history:10000,events:12,saleQueue:24,page:20});
  function unique(chats) {
    const map = new Map();
    for (const c of Array.isArray(chats)?chats:[]) if(c?.tel && (!map.has(String(c.tel)) || Number(c.ts)>Number(map.get(String(c.tel)).ts))) map.set(String(c.tel),c);
    return [...map.values()].sort((a,b)=>Number(b.ts)-Number(a.ts));
  }
  function stage(c) {
    const tags=Array.isArray(c.etiquetas)?c.etiquetas:[];
    if(tags.some(t=>['queja','urgente','reembolso'].includes(t))) return 'support';
    if(FAILURE.test(c.ultimo||'')) return 'waiting';
    if(c.quien==='u') return 'waiting';
    if(tags.includes('pago')&&!c.vendido) return 'payment';
    return 'shopping';
  }
  function changes(before, chats) {
    const events=[];
    for(const c of unique(chats)) {
      const old=before.get(String(c.tel));
      // A baseline is not a new sale. Labels alone never confirm a purchase.
      if(old && !old.vendido && c.vendido) events.push({kind:'sale',chat:c});
      else if(old && Number(c.ts)>Number(old.ts)) events.push({kind:stage(c),chat:c});
      else if(!old) events.push({kind:stage(c),chat:c});
    }
    return events;
  }
  const confirmed=s=>['CONFIRMADO','AUTO-CONFIRMADO','CONFIRMADO (enviar a mano)'].includes(s);
  function saleChanges(before,sales){const seen=new Set();return (sales||[]).filter(s=>{if(!s?.id||!s.telefono||seen.has(String(s.id))||!confirmed(s.estado)||confirmed(before.get(String(s.id))))return false;seen.add(String(s.id));return true;}).map(s=>({kind:'sale',id:String(s.id),chat:{tel:String(s.telefono),nombre:s.nombre,ts:Date.now(),etiquetas:[],quien:'a'},product:s.producto}));}
  function pageOf(chats,{query='',filter='',page=0,size=LIMITS.page}={}){
    const q=String(query).toLocaleLowerCase('es').trim();
    const filtered=chats.filter(c=>(!filter||stage(c)===filter)&&(!q||String(c.nombre||'').toLocaleLowerCase('es').includes(q)||String(c.tel).includes(q)));
    const pages=Math.max(1,Math.ceil(filtered.length/size)),current=Math.max(0,Math.min(page,pages-1));
    return {items:filtered.slice(current*size,(current+1)*size),page:current,pages,total:filtered.length};
  }
  function sceneSlot(kind,rank){
    const slots={waiting:[[220,322],[278,322],[220,400],[278,400],[220,480],[278,480]],shopping:[[390,345],[455,345],[520,345],[585,345],[390,514],[455,514]],support:[[733,237],[798,237],[910,238]],payment:[[738,425],[794,485],[855,485]],sale:[[780,410]]};
    // Overflow uses an open aisle instead of extending beyond the room or canvas.
    return slots[kind]?.[rank]||[620+(rank%2)*30,330+(Math.floor(rank/2)%4)*50];
  }
  function scenePageOf(chats,{departed=new Map(),sales=new Set(),page=0,advance=false}={}){
    const available=chats.filter(c=>!sales.has(String(c.tel))&&(!departed.has(String(c.tel))||Number(c.ts)>departed.get(String(c.tel))));
    const capacity=Math.max(1,LIMITS.avatars-sales.size),pages=Math.max(1,Math.ceil(available.length/capacity));
    const current=Math.max(0,Math.min(page,pages-1)),selected=advance?(current+1)%pages:current;
    return {items:available.slice(selected*capacity,(selected+1)*capacity),page:selected,pages,capacity};
  }
  function createTracker(){
    let initialized=false;const history=new Map(),saleHistory=new Map();
    function trim(map){while(map.size>LIMITS.history)map.delete(map.keys().next().value);}
    return {ingest(chats,sales,now=Date.now()){
      const all=unique(chats),recent=all.filter(c=>Number(c.ts)>now-72*3600000&&Number(c.ts)<=now+300000&&!c.sinDatos&&!(Array.isArray(c.etiquetas)&&c.etiquetas.includes('no_interesado')));
      const events=[];
      for(const c of recent.slice(0,LIMITS.history).reverse()){
        const id=String(c.tel),old=history.get(id);
        if(initialized&&(!old||Number(c.ts)>Number(old.ts)))events.push({kind:stage(c),chat:c});
        if(!old||Number(c.ts)>Number(old.ts)){history.delete(id);history.set(id,{ts:Number(c.ts)});}
      }
      const boundedSales=(Array.isArray(sales)?sales:[]).slice(0,LIMITS.history);
      if(initialized)events.push(...saleChanges(saleHistory,boundedSales));
      for(const s of boundedSales)if(s?.id&&!confirmed(saleHistory.get(String(s.id))))saleHistory.set(String(s.id),s.estado);
      trim(history);trim(saleHistory);initialized=true;
      const dayStart=Math.floor((now-5*3600000)/86400000)*86400000+5*3600000;
      return {chats:recent,events,counts:{today:recent.filter(c=>Number(c.ts)>=dayStart).length,recent:recent.length,waiting:recent.filter(c=>stage(c)==='waiting').length,support:recent.filter(c=>stage(c)==='support').length,sales:recent.filter(c=>c.vendido).length},historySize:history.size,saleHistorySize:saleHistory.size};
    }};
  }
  if(typeof module==='object'&&module.exports) { module.exports={unique,stage,changes,saleChanges,confirmed,pageOf,sceneSlot,scenePageOf,createTracker,LIMITS}; return; }
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const titles={waiting:'Espera atención',support:'Necesita ayuda',payment:'Pago por revisar',shopping:'En conversación',sale:'Compra registrada'};
  const colors=['#f5b56b','#a999ef','#6bc3ad','#df91bb','#82b6ea','#f0d478'];
  const locations={waiting:[235,365],shopping:[495,330],support:[790,185],payment:[780,405],sale:[780,405]};
  function avatar(color,skin='#bd825f',hair='#30313a',guard=false){return `<svg viewBox="0 0 46 64" aria-hidden="true"><ellipse cx="23" cy="59" rx="17" ry="5" fill="#163d3629"/><g class="world-body"><path d="M15 45v11m16-11v11" stroke="#334650" stroke-width="8" stroke-linecap="round"/><path d="M11 32l-4 13m28-13 4 13" stroke="${skin}" stroke-width="7" stroke-linecap="round"/><rect x="10" y="27" width="26" height="22" rx="9" fill="${color}"/><rect x="19" y="29" width="8" height="6" rx="2" fill="#fff9"/><rect x="10" y="5" width="26" height="25" rx="11" fill="${skin}"/><path d="M10 17V12Q9 0 24 2Q40 2 36 17l-6-6-15 2z" fill="${hair}"/><circle cx="18" cy="19" r="1.5" fill="#253434"/><circle cx="28" cy="19" r="1.5" fill="#253434"/><path d="M20 24q3 2 6 0" fill="none" stroke="#663f36" stroke-width="1.5"/>${guard?'<path d="M9 9Q23-2 37 9v5H9z" fill="#203e52"/><path d="M23 7l3 2-3 4-3-4z" fill="#f6d477"/>':''}</g></svg>`;}
  function scenery(){return `<svg class="world-map" viewBox="0 0 1000 600" role="img" aria-label="Tienda de IA Plus: recepción a la izquierda, productos en el centro, oficina de soporte arriba a la derecha y caja junto a la salida.">
    <defs><pattern id="world-tile" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="#eceddf"/><path d="M60 0H0V60" fill="none" stroke="#d8ddcc" stroke-width="1"/></pattern><pattern id="world-wood" width="20" height="60" patternUnits="userSpaceOnUse"><rect width="20" height="60" fill="#d7bd97"/><path d="M20 0H0V60" stroke="#c1a780" fill="none"/></pattern><filter id="world-shadow"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#254438" flood-opacity=".14"/></filter></defs>
    <rect width="1000" height="600" rx="24" fill="#afc4ae"/><path d="M28 86H972V543H28Z" fill="url(#world-tile)"/>
    <path d="M28 86V45H972V86Z" fill="#536f60"/><path d="M28 86H972" stroke="#d5e2ce" stroke-width="8"/>
    <path d="M28 86v457h944V86" fill="none" stroke="#6f8e77" stroke-width="12"/>
    <rect x="55" y="32" width="274" height="48" rx="12" fill="#233f37"/><text x="78" y="63" fill="#f4e6b6" font-size="23" font-weight="800">IA+ · THE ACCOUNT SHOP</text>
    <rect x="687" y="92" width="276" height="178" fill="url(#world-wood)"/>
    <path d="M680 87v189h108m85 0h96" stroke="#738f7b" stroke-width="9" fill="none"/>
    <text x="711" y="116" class="world-room-label">OFICINA · SOPORTE</text>
    <g filter="url(#world-shadow)"><rect x="727" y="128" width="164" height="48" rx="8" fill="#9d795a"/><rect x="733" y="120" width="152" height="46" rx="8" fill="#edc99b"/><rect x="778" y="120" width="49" height="28" rx="4" fill="#355a52"/><rect x="782" y="124" width="41" height="19" rx="2" fill="#83cbb7"/><path d="M795 153h19" stroke="#355a52" stroke-width="5"/><rect x="848" y="133" width="23" height="19" rx="2" fill="#fff8e9"/></g>
    <rect x="395" y="115" width="225" height="66" rx="12" fill="#486956"/><text x="419" y="144" fill="#f5f1d6" font-size="18" font-weight="800">CUENTAS DIGITALES</text><text x="419" y="163" fill="#c5dbc9" font-size="12">Tu negocio, en movimiento</text>
    <g filter="url(#world-shadow)"><rect x="88" y="178" width="179" height="51" rx="12" fill="#927555"/><rect x="88" y="164" width="179" height="51" rx="12" fill="#e6c59b"/><rect x="112" y="170" width="42" height="25" rx="4" fill="#355b53"/><rect x="116" y="173" width="34" height="16" rx="2" fill="#86cdb9"/><rect x="228" y="176" width="18" height="16" rx="4" fill="#edede1"/></g>
    <text x="101" y="249" class="world-room-label">RECEPCIÓN</text>
    <rect x="105" y="310" width="83" height="128" rx="16" fill="#b8cdbc"/><rect x="112" y="319" width="34" height="50" rx="9" fill="#779881"/><rect x="112" y="379" width="34" height="50" rx="9" fill="#779881"/><text x="101" y="463" class="world-room-label">BIENVENIDA</text>
    <g filter="url(#world-shadow)"><rect x="349" y="215" width="235" height="74" rx="10" fill="#b1936a"/><rect x="344" y="206" width="245" height="65" rx="10" fill="#f4dfb9"/>
    <rect x="358" y="214" width="64" height="44" rx="7" fill="#2c8f78"/><text x="390" y="241" text-anchor="middle" fill="white" font-size="13" font-weight="700">ChatGPT</text>
    <rect x="433" y="214" width="64" height="44" rx="7" fill="#8a74b5"/><text x="465" y="241" text-anchor="middle" fill="white" font-size="13" font-weight="700">Gemini</text>
    <rect x="508" y="214" width="64" height="44" rx="7" fill="#da9b69"/><text x="540" y="241" text-anchor="middle" fill="#3b332b" font-size="13" font-weight="700">Claude</text>
    <rect x="349" y="393" width="235" height="74" rx="10" fill="#b1936a"/><rect x="344" y="384" width="245" height="65" rx="10" fill="#f4dfb9"/>
    <rect x="358" y="392" width="64" height="44" rx="7" fill="#559fb0"/><text x="390" y="419" text-anchor="middle" fill="white" font-size="13" font-weight="700">Canva</text>
    <rect x="433" y="392" width="64" height="44" rx="7" fill="#465459"/><text x="465" y="419" text-anchor="middle" fill="white" font-size="13" font-weight="700">CapCut</text>
    <rect x="508" y="392" width="64" height="44" rx="7" fill="#8a9957"/><text x="540" y="419" text-anchor="middle" fill="white" font-size="13" font-weight="700">Más</text></g>
    <text x="392" y="497" class="world-room-label">EXHIBIDORES</text>
    <g filter="url(#world-shadow)"><rect x="732" y="330" width="177" height="50" rx="10" fill="#8b7256"/><rect x="732" y="318" width="177" height="50" rx="10" fill="#e5c298"/><rect x="798" y="319" width="48" height="31" rx="5" fill="#2e4c44"/><rect x="803" y="323" width="38" height="19" rx="2" fill="#9cd8b9"/><rect x="863" y="335" width="28" height="24" rx="4" fill="#d4a05d"/></g>
    <text x="749" y="300" class="world-room-label">CAJA · COMPRAS</text>
    <rect x="192" y="534" width="108" height="17" rx="4" fill="#f9e7b9"/><text x="213" y="574" class="world-room-label">ENTRADA ↑</text>
    <rect x="785" y="534" width="108" height="17" rx="4" fill="#f9e7b9"/><text x="807" y="574" class="world-room-label">SALIDA ↓</text>
    ${[ [58,128],[637,133],[930,304],[60,489],[932,493] ].map(([x,y])=>`<g transform="translate(${x} ${y})"><ellipse cy="12" rx="16" ry="9" fill="#937c5c"/><circle cy="-2" r="20" fill="#5d8964"/><circle cx="-8" cy="-8" r="12" fill="#83a478"/><circle cx="9" cy="-5" r="10" fill="#719b6c"/></g>`).join('')}
    </svg>`;}
  let active=null;
  function mount(root,{readChats,openChat}) {
    if(active?.root===root)return;
    active?.destroy();
    let disposed=false,loading=false,paused=false,frame=0,poll=0,lastFrame=0,lastSync=0,failures=0,viewChats=[],scenePage=0,listPage=0,filter='',query='',pendingSales=[],recentEvents=[],eventTotal=0,clock=0;
    const people=new Map(),departed=new Map(),tracker=createTracker(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
    root.innerHTML=`<div class="world-shell"><header class="world-head"><div><div class="world-eyebrow"><span class="world-live-dot"></span> TU NEGOCIO, EN MOVIMIENTO</div><h2>Una tienda llena de vida<span>✦</span></h2><p>La actividad de tus clientes, vista desde otro lugar.</p></div><div class="world-actions"><button type="button" class="world-expand" aria-expanded="false">⤢ Ampliar</button><button type="button" class="world-pause" aria-pressed="false">Ⅱ Pausar</button><button type="button" class="world-refresh">↻ Actualizar</button></div></header>
    <div class="world-metrics"><div><span>Conversaciones activas hoy</span><b data-count="today">—</b><small>Horario de Colombia</small></div><div><span>Esperan respuesta</span><b data-count="waiting">—</b><small>Últimas 72 horas</small></div><div><span>Necesitan ayuda</span><b data-count="support">—</b><small>Soporte y solicitudes</small></div><div><span>Clientes con compra¹</span><b data-count="sales">—</b><small>Entre los chats recientes</small></div></div>
    <div class="world-layout"><div class="world-main"><div class="world-status" role="status">Conectando con tu tienda…</div><div class="world-viewport"><div class="world-stage">${scenery()}<div class="world-people"></div><div class="world-scene-label">IA PLUS <span>SOLO ADMINISTRADOR</span></div></div></div><div class="world-scene-bar"><span class="world-scene-count">Preparando personajes…</span><button type="button" class="world-next-scene">Otro grupo →</button></div><div class="world-legend"><span><i style="background:#d69b49"></i>Espera</span><span><i style="background:#529c83"></i>Conversación</span><span><i style="background:#ac7dc3"></i>Soporte</span><span>Selecciona un cliente para abrir su chat ↗</span></div></div>
    <aside class="world-panel"><h3>Tu equipo virtual <span>05</span></h3><div class="world-roster"></div><div class="world-feed-title"><h3>Ahora en tu tienda</h3><span class="world-activity-total">Esta sesión</span></div><ol class="world-events"><li>Los nuevos movimientos aparecerán aquí.</li></ol></aside></div>
    <section class="world-directory" aria-label="Directorio de conversaciones"><div class="world-directory-head"><div><div class="world-eyebrow">TODOS TIENEN SU LUGAR</div><h3>Conversaciones recientes <span class="world-directory-total">0</span></h3><p>Últimas 72 horas. Encuentra a cualquier cliente aunque no esté en la escena.</p></div><div class="world-directory-controls"><label><span class="world-sr-only">Buscar cliente</span><input class="world-search" type="search" placeholder="Buscar nombre o número…" autocomplete="off"></label><label><span class="world-sr-only">Estado de la conversación</span><select class="world-filter"><option value="">Todos los estados</option><option value="waiting">Esperan respuesta</option><option value="support">Necesitan ayuda</option><option value="payment">Pago por revisar</option><option value="shopping">En conversación</option></select></label></div></div><div class="world-client-list"></div><div class="world-pagination"><span class="world-page-info" aria-live="polite"></span><div><button type="button" class="world-prev">← Anterior</button><button type="button" class="world-next">Siguiente →</button></div></div></section>
    <div class="world-footer"><p>¹ Clientes con compra registrada entre las conversaciones recientes; no representa pagos nuevos. La escena muestra hasta ${LIMITS.avatars} clientes. El directorio conserva todos los chats recientes.</p><p>Los personajes representan la actividad. Esta vista no cambia planes, cuentas ni pagos. Los movimientos del equipo son decorativos.</p></div></div>`;
    const $=s=>root.querySelector(s),layer=$('.world-people');
    const staff=[['Luna','Recepción','#e4ad64',177,280],['Nico','Ventas','#729b89',605,345],['Mía','Soporte','#a18bc1',854,225],['Leo','Caja','#6698ae',880,415],['Bruno','Seguridad','#354c61',302,510]];
    $('.world-roster').innerHTML=staff.map(([name,role,color],i)=>`<div><span class="world-mini">${avatar(color,i%2?'#e2ac81':'#b77e59','#30313a',i===4)}</span><span><b>${name}</b><small>${role}</small></span><i>Virtual</i></div>`).join('');
    staff.forEach(([name,role,color,x,y],i)=>{const el=document.createElement('div');el.className='world-person world-staff';el.innerHTML=avatar(color,i%2?'#e2ac81':'#b77e59','#30313a',i===4)+`<span class="world-name">${name}</span>`;el.title=name+' · '+role;layer.append(el);people.set('staff'+i,{el,x,y,tx:x,ty:y,home:[x,y],staff:true,index:i});});
    function usable(){return !disposed&&root.isConnected&&!document.hidden;}
    function draw(p){p.el.style.left=p.x/10+'%';p.el.style.top=p.y/6+'%';p.el.style.zIndex=Math.round(p.y);}
    function person(c,index,slot,entry=false){const id=String(c.tel);let p=people.get(id);if(!p){if([...people.values()].filter(x=>!x.staff).length>=LIMITS.avatars)return null;const el=document.createElement('button');el.type='button';el.className='world-person world-customer';el.innerHTML=avatar(colors[index%colors.length],index%2?'#e6b187':'#ac7655')+'<span class="world-bubble"></span><span class="world-name"></span>';el.onclick=()=>openChat(id);layer.append(el);p={el,x:entry?245:slot[0],y:entry?527:slot[1],tx:slot[0],ty:slot[1]};people.set(id,p);}if(p.salePhase)return p;p.tx=slot[0];p.ty=slot[1];if(reduced.matches){p.x=p.tx;p.y=p.ty;}p.el.dataset.stage=stage(c);p.el.querySelector('.world-name').textContent=String(c.nombre||'Cliente').slice(0,24);p.el.querySelector('.world-bubble').textContent=titles[stage(c)];p.el.setAttribute('aria-label',(c.nombre||'Cliente')+': '+titles[stage(c)]+'. Abrir conversación');draw(p);return p;}
    function renderScene(advance=false){
      const sales=new Set([...people].filter(([,p])=>p.salePhase).map(([id])=>id));
      const page=scenePageOf(viewChats,{departed,sales,page:scenePage,advance});scenePage=page.page;
      const shown=page.items,ids=new Set(shown.map(c=>String(c.tel)));
      for(const [id,p]of people)if(!p.staff&&!p.salePhase&&!ids.has(id)){p.el.remove();people.delete(id);}
      const ranks={};shown.forEach((c,i)=>{const k=stage(c),rank=ranks[k]||0;ranks[k]=rank+1;person(c,i,sceneSlot(k,rank),lastSync>0);});
      const count=[...people.values()].filter(p=>!p.staff).length;
      $('.world-scene-count').textContent=`${count} en escena · ${viewChats.length} conversaciones recientes`+(pendingSales.length?' · '+pendingSales.length+' compras por animar':'');
      $('.world-next-scene').disabled=page.pages<=1;
    }
    function renderDirectory(){const result=pageOf(viewChats,{query,filter,page:listPage});listPage=result.page;$('.world-directory-total').textContent=viewChats.length;
      $('.world-client-list').innerHTML=result.items.map(c=>`<button type="button" data-chat="${esc(c.tel)}"><span class="world-client-initial" data-stage="${stage(c)}">${esc(String(c.nombre||'C').slice(0,1).toUpperCase())}</span><span><b>${esc(c.nombre||'Cliente')}</b><small>${esc(titles[stage(c)])}</small></span><span class="world-chat-arrow" aria-hidden="true">↗</span></button>`).join('')||'<p class="world-empty">No hay conversaciones que coincidan con tu búsqueda.</p>';
      $('.world-page-info').textContent=result.total?`${result.page*LIMITS.page+1}–${Math.min((result.page+1)*LIMITS.page,result.total)} de ${result.total} · Página ${result.page+1} de ${result.pages}`:'Sin resultados';
      $('.world-prev').disabled=result.page===0;$('.world-next').disabled=result.page>=result.pages-1;
    }
    function renderEvents(){const el=$('.world-events');if(!recentEvents.length)return;el.innerHTML=recentEvents.map(e=>`<li><i data-stage="${esc(e.kind)}"></i><div><span>${esc(titles[e.kind])}</span><b>${esc(e.chat.nombre||'Cliente')}</b></div><small>${new Date(e.at).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}</small></li>`).join('');$('.world-activity-total').textContent=eventTotal+' movimientos';}
    function consume(events){if(!events.length)return;eventTotal+=events.length;recentEvents=[...events.slice(-LIMITS.events).reverse().map(e=>({...e,at:Date.now()})),...recentEvents].slice(0,LIMITS.events);renderEvents();
      const newest=events.slice(-LIMITS.avatars);for(const e of newest){const worker=people.get({waiting:'staff0',shopping:'staff1',support:'staff2',payment:'staff3',sale:'staff3'}[e.kind]);if(worker)worker.jobUntil=clock+5000;}
      // A burst of sales is represented in aggregate; the scene remains bounded.
      pendingSales=[...pendingSales,...events.filter(e=>e.kind==='sale')].slice(-LIMITS.saleQueue);
      if(reduced.matches)pendingSales=[];
    }
    function beginSale(){if(!pendingSales.length||[...people.values()].some(p=>p.salePhase))return;const e=pendingSales.shift(),id=String(e.chat.tel);let p=people.get(id);if(!p){const replace=[...people].find(([,x])=>!x.staff&&!x.salePhase);if([...people.values()].filter(x=>!x.staff).length>=LIMITS.avatars&&replace){replace[1].el.remove();people.delete(replace[0]);}p=person(e.chat,0,[780,410],true);}if(p){p.tx=780;p.ty=410;p.salePhase='cash';p.saleTs=e.chat.ts;p.el.dataset.stage='sale';p.el.querySelector('.world-bubble').textContent=String(e.product||'Compra registrada')+' ✓';p.el.setAttribute('aria-label',(e.chat.nombre||'Cliente')+': compra registrada. Abrir conversación');renderScene();}}
    function schedule(delay=30000){clearTimeout(poll);poll=0;if(usable())poll=setTimeout(sync,delay);}
    async function sync(){
      if(!usable()||loading)return;clearTimeout(poll);poll=0;loading=true;$('.world-refresh').disabled=true;
      try{const result=await readChats();if(disposed||!root.isConnected)return;if(!Array.isArray(result.chats)||!Array.isArray(result.sales))throw Error('No se pudo comprobar la actividad de la tienda.');
        const snap=tracker.ingest(result.chats,result.sales);viewChats=snap.chats;consume(snap.events);
        for(const [key,value] of Object.entries(snap.counts)){const el=$(`[data-count="${key}"]`);if(el)el.textContent=value.toLocaleString('es-CO');}
        // Departures only need to outlive the currently retained conversation.
        const current=new Map(viewChats.map(c=>[String(c.tel),Number(c.ts)]));for(const [id,ts]of departed)if(!current.has(id)||current.get(id)>ts)departed.delete(id);while(departed.size>LIMITS.history)departed.delete(departed.keys().next().value);
        renderScene();renderDirectory();lastSync=Date.now();failures=0;$('.world-status').dataset.error='false';$('.world-status').textContent='● En vivo · '+new Date(lastSync).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})+' · Actualización cada 30 s';
      }catch(e){if(!disposed){failures=Math.min(failures+1,3);$('.world-status').dataset.error='true';$('.world-status').textContent='No se pudo actualizar. '+(lastSync?'Conservamos la última vista. ':'')+'Reintentamos en '+Math.min(120,30*2**failures)+' s.';}}
      finally{loading=false;if(!disposed){$('.world-refresh').disabled=false;schedule(failures?Math.min(120000,30000*2**failures):30000);}}
    }
    function animate(t){frame=0;if(!usable()||paused||reduced.matches)return;
      if(t-lastFrame<32){frame=requestAnimationFrame(animate);return;}const dt=Math.min((t-lastFrame)/1000||0,.08);lastFrame=t;clock+=dt*1000;beginSale();
      for(const [id,p]of people){if(p.staff){p.tx=p.home[0]+Math.sin(clock/4500+p.index)*8;p.ty=p.home[1]+(p.jobUntil>clock?-12:0);}
        if(p.salePhase==='cash'&&Math.hypot(p.tx-p.x,p.ty-p.y)<2){p.salePhase='hold';p.leaveAt=clock+2000;}
        if(p.salePhase==='hold'&&clock>p.leaveAt){p.salePhase='exit';p.tx=840;p.ty=560;}
        if(p.salePhase==='exit'&&Math.hypot(p.tx-p.x,p.ty-p.y)<2){departed.set(id,p.saleTs);p.el.remove();people.delete(id);continue;}
        const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy),step=Math.min(d,dt*85);if(d>.1){p.x+=dx/d*step;p.y+=dy/d*step;draw(p);}p.el.classList.toggle('walking',d>2);
      }frame=requestAnimationFrame(animate);
    }
    function animationState(){cancelAnimationFrame(frame);frame=0;root.classList.toggle('world-paused',paused||document.hidden||reduced.matches);if(usable()&&!paused&&!reduced.matches){lastFrame=performance.now();frame=requestAnimationFrame(animate);}}
    function visibility(){clearTimeout(poll);poll=0;animationState();if(!document.hidden)sync();}
    function expandScene(on){root.classList.toggle('world-expanded',on);$('.world-expand').textContent=on?'× Cerrar':'⤢ Ampliar';$('.world-expand').setAttribute('aria-expanded',String(on));}
    const escape=e=>{if(e.key==='Escape')expandScene(false);};
    $('.world-expand').onclick=()=>expandScene(!root.classList.contains('world-expanded'));
    $('.world-refresh').onclick=sync;
    $('.world-pause').onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?'▷ Reanudar':'Ⅱ Pausar';e.currentTarget.setAttribute('aria-pressed',String(paused));animationState();};
    $('.world-next-scene').onclick=()=>renderScene(true);
    $('.world-search').oninput=e=>{query=e.target.value;listPage=0;renderDirectory();};$('.world-filter').onchange=e=>{filter=e.target.value;listPage=0;renderDirectory();};
    $('.world-prev').onclick=()=>{listPage--;renderDirectory();};$('.world-next').onclick=()=>{listPage++;renderDirectory();};
    $('.world-client-list').onclick=e=>{const button=e.target.closest('[data-chat]');if(button)openChat(button.dataset.chat);};
    const motion=()=>{pendingSales=[];for(const [id,p]of people)if(p.salePhase){departed.set(id,p.saleTs);p.el.remove();people.delete(id);}renderScene();animationState();};
    document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',escape);reduced.addEventListener('change',motion);
    active={root,destroy(){disposed=true;clearTimeout(poll);cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',escape);reduced.removeEventListener('change',motion);expandScene(false);people.clear();pendingSales=[];if(active?.root===root)active=null;}};
    people.forEach(draw);sync();animationState();
  }
  scope.IAPWorld={mount,stop(){active?.destroy();},unique,stage,changes};
})(globalThis);
