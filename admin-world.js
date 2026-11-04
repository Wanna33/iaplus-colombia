/* An admin-only, read-only view. No credentials, orders or plans are written here. */
(function (scope) {
  'use strict';
  const FAILURE = /no pude completar|no puedo responder|respuesta automática.*error/i;
  const LIMITS = Object.freeze({avatars:12,history:10000,events:12,saleQueue:24,page:20});
  const WORLD=Object.freeze({width:1000,height:720,minWidth:760});
  const TEAM=Object.freeze([
    {name:'Luna',role:'Recepción',color:'#dfae65',x:112,y:260,look:'headset',path:[[112,260],[186,260]]},
    {name:'Nico',role:'Asesor de IA',color:'#538e7d',x:335,y:310,look:'headset',path:[[335,310],[390,310],[335,365]]},
    {name:'Mía',role:'Soporte técnico',color:'#a58cc8',x:740,y:235,look:'long',path:[[740,235],[740,258]]},
    {name:'Leo',role:'Caja principal',color:'#638fae',x:775,y:555,look:'glasses',path:[[775,555],[755,555]]},
    {name:'Bruno',role:'Vigilancia · entrada',color:'#334b61',x:190,y:650,look:'guard',path:[[190,650],[290,650]]},
    {name:'Sol',role:'Bienvenida',color:'#d99779',x:285,y:310,look:'long',path:[[285,310],[295,440],[285,310]]},
    {name:'Emi',role:'Diseño y video',color:'#9981bd',x:610,y:495,look:'headset',path:[[610,495],[605,355],[610,495]]},
    {name:'Alex',role:'Soporte de cuentas',color:'#6c9f99',x:825,y:235,look:'glasses',path:[[825,235],[825,285]]},
    {name:'Dani',role:'Activaciones',color:'#bc9864',x:910,y:235,look:'long',path:[[910,235],[910,255]]},
    {name:'Vale',role:'Segunda caja',color:'#be879b',x:900,y:555,look:'long',path:[[900,555],[880,555]]},
    {name:'Teo',role:'Inventario',color:'#8e9d68',x:115,y:615,look:'stock',path:[[115,615],[250,615]]},
    {name:'Iris',role:'Vigilancia · salida',color:'#42596e',x:900,y:650,look:'guard',path:[[900,650],[800,650]]}
  ]);
  function zoomLevel(value){return Math.min(1.8,Math.max(.3,Math.round((Number(value)||1)*10)/10));}
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
    const slots={waiting:[[250,280],[230,330],[200,460],[265,470]],shopping:[[390,330],[460,330],[530,330],[390,520],[460,520],[530,520]],support:[[720,350],[795,350],[870,350],[935,350]],payment:[[740,600],[805,600],[870,600],[935,600]],sale:[[715,570]]};
    // Overflow uses an open aisle instead of extending beyond the room or canvas.
    return slots[kind]?.[rank]||[360+(rank%5)*62,590+Math.floor(rank/5)*42];
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
  if(typeof module==='object'&&module.exports) { module.exports={unique,stage,changes,saleChanges,confirmed,pageOf,sceneSlot,scenePageOf,createTracker,zoomLevel,LIMITS,WORLD,TEAM}; return; }
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const titles={waiting:'Espera atención',support:'Necesita ayuda',payment:'Pago por revisar',shopping:'En conversación',sale:'Compra registrada'};
  const colors=['#f5b56b','#a999ef','#6bc3ad','#df91bb','#82b6ea','#f0d478'];
  function avatar(color,skin='#bd825f',hair='#30313a',look=''){
    const accessory=look==='guard'?'<path d="M9 9Q23-2 37 9v5H9z" fill="#203e52"/><path d="M23 7l3 2-3 4-3-4z" fill="#f6d477"/><path d="M27 34l3 2-3 5-3-5z" fill="#ead498"/>':look==='glasses'?'<path d="M13 17h8v6h-8zm12 0h8v6h-8zm-4 2h4" fill="none" stroke="#394b4b" stroke-width="1.6"/>':look==='headset'?'<path d="M9 19V14Q10 1 23 2Q36 2 37 14v8l-9 3" fill="none" stroke="#31514d" stroke-width="2.4"/><rect x="7" y="15" width="5" height="9" rx="2" fill="#31514d"/><rect x="34" y="15" width="5" height="9" rx="2" fill="#31514d"/>':look==='stock'?'<rect x="12" y="36" width="25" height="17" rx="2" fill="#be9666"/><path d="M23 36v8" stroke="#ead8b4" stroke-width="5"/>':'';
    return `<svg viewBox="0 0 46 64" aria-hidden="true"><ellipse cx="23" cy="59" rx="17" ry="5" fill="#163d3629"/><g class="world-body">${look==='long'?`<path d="M8 18Q8 1 23 1Q39 1 38 21l3 17H5z" fill="${hair}"/>`:''}<path d="M15 45v11m16-11v11" stroke="#334650" stroke-width="8" stroke-linecap="round"/><path d="M11 32l-4 13m28-13 4 13" stroke="${skin}" stroke-width="7" stroke-linecap="round"/><rect x="10" y="27" width="26" height="22" rx="9" fill="${color}"/><path d="M17 29l6 5 6-5" fill="#fffbe8"/><rect x="27" y="35" width="5" height="6" rx="1" fill="#fff9"/><rect x="10" y="5" width="26" height="25" rx="11" fill="${skin}"/><path d="M10 17V12Q9 0 24 2Q40 2 36 17l-6-6-15 2z" fill="${hair}"/><circle cx="18" cy="19" r="1.5" fill="#253434"/><circle cx="28" cy="19" r="1.5" fill="#253434"/><path d="M20 24q3 2 6 0" fill="none" stroke="#663f36" stroke-width="1.5"/>${accessory}</g></svg>`;
  }
  function scenery(){return scope.IAPWorldScene.markup();}
  let active=null;
  function mount(root,{readChats,openChat}) {
    if(active?.root===root)return;
    active?.destroy();
    let disposed=false,loading=false,paused=false,frame=0,poll=0,lastFrame=0,lastSync=0,failures=0,viewChats=[],scenePage=0,listPage=0,filter='',query='',pendingSales=[],recentEvents=[],eventTotal=0,clock=0,zoom=1,nextCashier=0;
    const people=new Map(),departed=new Map(),tracker=createTracker(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
    root.innerHTML=`<div class="world-shell"><header class="world-head"><div><div class="world-eyebrow"><span class="world-live-dot"></span> TU NEGOCIO, EN MOVIMIENTO</div><h2>La gran tienda IA Plus<span>✦</span></h2><p>Más espacio para tu equipo. Un lugar para cada cliente.</p></div><div class="world-actions"><button type="button" class="world-expand" aria-expanded="false">⤢ Pantalla completa</button><button type="button" class="world-pause" aria-pressed="false">Ⅱ Pausar</button><button type="button" class="world-refresh">↻ Actualizar</button></div></header>
    <div class="world-metrics"><div><span>Conversaciones activas hoy</span><b data-count="today">—</b><small>Horario de Colombia</small></div><div><span>Esperan respuesta</span><b data-count="waiting">—</b><small>Últimas 72 horas</small></div><div><span>Necesitan ayuda</span><b data-count="support">—</b><small>Soporte y solicitudes</small></div><div><span>Clientes con compra¹</span><b data-count="sales">—</b><small>Entre los chats recientes</small></div></div>
    <div class="world-layout"><div class="world-main"><div class="world-status" role="status">Conectando con tu tienda…</div><div class="world-camera"><div class="world-camera-info"><b>Recorre tu tienda</b><span>${TEAM.length} trabajadores · 6 zonas de trabajo</span></div><div class="world-camera-actions" role="group" aria-label="Tamaño de la tienda"><button type="button" class="world-zoom-out" aria-label="Alejar la tienda">−</button><span class="world-zoom-value" role="status">100 %</span><button type="button" class="world-zoom-in" aria-label="Acercar la tienda">+</button><button type="button" class="world-zoom-fit">Ver toda</button><button type="button" class="world-zoom-reset">Restablecer</button></div></div><div class="world-viewport" tabindex="0" role="region" aria-label="Escenario de la tienda. Usa las flechas para recorrerlo."><div class="world-stage">${scenery()}<div class="world-people"></div><div class="world-scene-label">IA PLUS <span>SOLO ADMINISTRADOR</span></div></div></div><div class="world-scene-bar"><span class="world-scene-count">Preparando personajes…</span><button type="button" class="world-next-scene">Otro grupo →</button></div><div class="world-legend"><span><i style="background:#d69b49"></i>Espera</span><span><i style="background:#529c83"></i>Conversación</span><span><i style="background:#ac7dc3"></i>Soporte</span><span>Selecciona un cliente para abrir su chat ↗</span></div></div>
    <aside class="world-panel"><h3>Tu equipo virtual <span>${TEAM.length} trabajadores</span></h3><div class="world-roster"></div><div class="world-feed-title"><h3>Ahora en tu tienda</h3><span class="world-activity-total">Esta sesión</span></div><ol class="world-events"><li>Los nuevos movimientos aparecerán aquí.</li></ol></aside></div>
    <section class="world-directory" aria-label="Directorio de conversaciones"><div class="world-directory-head"><div><div class="world-eyebrow">TODOS TIENEN SU LUGAR</div><h3>Conversaciones recientes <span class="world-directory-total">0</span></h3><p>Últimas 72 horas. Encuentra a cualquier cliente aunque no esté en la escena.</p></div><div class="world-directory-controls"><label><span class="world-sr-only">Buscar cliente</span><input class="world-search" type="search" placeholder="Buscar nombre o número…" autocomplete="off"></label><label><span class="world-sr-only">Estado de la conversación</span><select class="world-filter"><option value="">Todos los estados</option><option value="waiting">Esperan respuesta</option><option value="support">Necesitan ayuda</option><option value="payment">Pago por revisar</option><option value="shopping">En conversación</option></select></label></div></div><div class="world-client-list"></div><div class="world-pagination"><span class="world-page-info" aria-live="polite"></span><div><button type="button" class="world-prev">← Anterior</button><button type="button" class="world-next">Siguiente →</button></div></div></section>
    <div class="world-footer"><p>¹ Clientes con compra registrada entre las conversaciones recientes; no representa pagos nuevos. La escena muestra hasta ${LIMITS.avatars} clientes. El directorio conserva todos los chats recientes.</p><p>Los personajes representan la actividad. Esta vista no cambia planes, cuentas ni pagos. Los movimientos del equipo son decorativos.</p></div></div>`;
    const $=s=>root.querySelector(s),layer=$('.world-people');
    const staffLook=(worker,i)=>avatar(worker.color,['#b77e59','#e2ac81','#955e43','#cd956e'][i%4],i%3===0?'#614338':'#30313a',worker.look);
    $('.world-roster').innerHTML=TEAM.map((worker,i)=>`<div><span class="world-mini">${staffLook(worker,i)}</span><span><b>${worker.name}</b><small>${worker.role}</small></span><i>Virtual</i></div>`).join('');
    TEAM.forEach((worker,i)=>{const {name,role,x,y,path}=worker,el=document.createElement('div');el.className='world-person world-staff';el.innerHTML=staffLook(worker,i)+`<span class="world-name">${name}</span>`;el.title=name+' · '+role;el.setAttribute('role','img');el.setAttribute('aria-label',name+' · '+role+' · personaje virtual');layer.append(el);people.set('staff'+i,{el,x,y,tx:x,ty:y,home:[x,y],path,route:0,nextMove:1600+i*900,staff:true,index:i});});
    function usable(){return !disposed&&root.isConnected&&!document.hidden;}
    function draw(p){p.el.style.left=p.x/WORLD.width*100+'%';p.el.style.top=p.y/WORLD.height*100+'%';p.el.style.zIndex=Math.round(p.y);}
    function person(c,index,slot,entry=false){const id=String(c.tel);let p=people.get(id);if(!p){if([...people.values()].filter(x=>!x.staff).length>=LIMITS.avatars)return null;const el=document.createElement('button');el.type='button';el.className='world-person world-customer';el.innerHTML=avatar(colors[index%colors.length],index%2?'#e6b187':'#ac7655')+'<span class="world-bubble"></span><span class="world-name"></span>';el.onclick=()=>openChat(id);layer.append(el);p={el,x:entry?245:slot[0],y:entry?665:slot[1],tx:slot[0],ty:slot[1]};people.set(id,p);}if(p.salePhase)return p;p.tx=slot[0];p.ty=slot[1];if(reduced.matches){p.x=p.tx;p.y=p.ty;}p.el.dataset.stage=stage(c);p.el.querySelector('.world-name').textContent=String(c.nombre||'Cliente').slice(0,24);p.el.querySelector('.world-bubble').textContent=titles[stage(c)];p.el.setAttribute('aria-label',(c.nombre||'Cliente')+': '+titles[stage(c)]+'. Abrir conversación');draw(p);return p;}
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
      const teams={waiting:[0,5],shopping:[1,6],support:[2,7,8],payment:[3,9],sale:[3,9]};
      const newest=events.slice(-LIMITS.avatars);newest.forEach((e,i)=>{const workers=teams[e.kind]||[0],worker=people.get('staff'+workers[i%workers.length]);if(worker)worker.jobUntil=clock+5000;});
      // A burst of sales is represented in aggregate; the scene remains bounded.
      pendingSales=[...pendingSales,...events.filter(e=>e.kind==='sale')].slice(-LIMITS.saleQueue);
      if(reduced.matches)pendingSales=[];
    }
    function beginSale(){if(!pendingSales.length||[...people.values()].some(p=>p.salePhase))return;const e=pendingSales.shift(),id=String(e.chat.tel),checkout=nextCashier++%2?[850,570]:[715,570];let p=people.get(id);if(!p){const replace=[...people].find(([,x])=>!x.staff&&!x.salePhase);if([...people.values()].filter(x=>!x.staff).length>=LIMITS.avatars&&replace){replace[1].el.remove();people.delete(replace[0]);}p=person(e.chat,0,checkout,true);}if(p){p.tx=checkout[0];p.ty=checkout[1];p.salePhase='cash';p.saleTs=e.chat.ts;p.el.dataset.stage='sale';p.el.querySelector('.world-bubble').textContent=String(e.product||'Compra registrada')+' ✓';p.el.setAttribute('aria-label',(e.chat.nombre||'Cliente')+': compra registrada. Abrir conversación');renderScene();}}
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
      if(t-lastFrame<32){frame=requestAnimationFrame(animate);return;}const dt=Math.min((t-lastFrame)/1000||0,.08);lastFrame=t;clock+=dt*1000;beginSale();let sceneChanged=false;
      for(const [id,p]of people){if(p.staff){
          if(clock>=p.nextMove){p.route=(p.route+1)%p.path.length;p.nextMove=clock+5200+(p.index%3)*1300;}
          const target=p.jobUntil>clock?p.home:p.path[p.route];p.tx=target[0];p.ty=target[1];p.el.classList.toggle('world-working',p.jobUntil>clock);
        }
        if(p.salePhase==='cash'&&Math.hypot(p.tx-p.x,p.ty-p.y)<2){p.salePhase='hold';p.leaveAt=clock+2000;}
        if(p.salePhase==='hold'&&clock>p.leaveAt){p.salePhase='exit';p.tx=840;p.ty=688;}
        if(p.salePhase==='exit'&&Math.hypot(p.tx-p.x,p.ty-p.y)<2){departed.set(id,p.saleTs);p.el.remove();people.delete(id);sceneChanged=true;continue;}
        const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy),step=Math.min(d,dt*(p.staff?34:85));if(d>.1){p.x+=dx/d*step;p.y+=dy/d*step;draw(p);}p.el.classList.toggle('walking',d>2);
      }if(sceneChanged)renderScene();frame=requestAnimationFrame(animate);
    }
    function animationState(){cancelAnimationFrame(frame);frame=0;root.classList.toggle('world-paused',paused||document.hidden||reduced.matches);if(usable()&&!paused&&!reduced.matches){lastFrame=performance.now();frame=requestAnimationFrame(animate);}}
    function visibility(){clearTimeout(poll);poll=0;animationState();if(!document.hidden)sync();}
    function expandScene(on){root.classList.toggle('world-expanded',on);if(on)root.scrollTop=0;$('.world-expand').textContent=on?'× Cerrar':'⤢ Pantalla completa';$('.world-expand').setAttribute('aria-expanded',String(on));}
    function setZoom(value,reset=false){
      const viewport=$('.world-viewport'),stage=$('.world-stage'),oldWidth=Math.max(viewport.clientWidth,WORLD.minWidth)*zoom;
      const centerX=oldWidth<=viewport.clientWidth?.5:(viewport.scrollLeft+viewport.clientWidth/2)/oldWidth,centerY=(viewport.scrollTop+viewport.clientHeight/2)/(oldWidth*WORLD.height/WORLD.width);
      zoom=zoomLevel(value);stage.style.width=zoom*100+'%';stage.style.minWidth=WORLD.minWidth*zoom+'px';
      const newWidth=Math.max(viewport.clientWidth,WORLD.minWidth)*zoom;
      stage.classList.toggle('world-overview',newWidth<600);
      viewport.scrollLeft=reset?0:centerX*newWidth-viewport.clientWidth/2;viewport.scrollTop=reset?0:centerY*newWidth*WORLD.height/WORLD.width-viewport.clientHeight/2;
      $('.world-zoom-value').textContent=Math.round(zoom*100)+' %';$('.world-zoom-out').disabled=zoom<=.3;$('.world-zoom-in').disabled=zoom>=1.8;
    }
    const escape=e=>{if(e.key==='Escape')expandScene(false);};
    $('.world-expand').onclick=()=>expandScene(!root.classList.contains('world-expanded'));
    $('.world-refresh').onclick=sync;
    $('.world-zoom-in').onclick=()=>setZoom(zoom+.2);$('.world-zoom-out').onclick=()=>setZoom(zoom-.2);$('.world-zoom-reset').onclick=()=>setZoom(1,true);
    $('.world-zoom-fit').onclick=()=>{setZoom(1,true);const viewport=$('.world-viewport'),base=Math.max(viewport.clientWidth,WORLD.minWidth),fit=Math.min(1,viewport.clientWidth/base,viewport.clientHeight/(base*WORLD.height/WORLD.width));setZoom(Math.floor(fit*10)/10,true);};
    $('.world-pause').onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?'▷ Reanudar':'Ⅱ Pausar';e.currentTarget.setAttribute('aria-pressed',String(paused));animationState();};
    $('.world-next-scene').onclick=()=>renderScene(true);
    $('.world-search').oninput=e=>{query=e.target.value;listPage=0;renderDirectory();};$('.world-filter').onchange=e=>{filter=e.target.value;listPage=0;renderDirectory();};
    $('.world-prev').onclick=()=>{listPage--;renderDirectory();};$('.world-next').onclick=()=>{listPage++;renderDirectory();};
    $('.world-client-list').onclick=e=>{const button=e.target.closest('[data-chat]');if(button)openChat(button.dataset.chat);};
    const motion=()=>{pendingSales=[];for(const [id,p]of people)if(p.salePhase){departed.set(id,p.saleTs);p.el.remove();people.delete(id);}renderScene();animationState();};
    document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',escape);reduced.addEventListener('change',motion);
    active={root,destroy(){disposed=true;clearTimeout(poll);cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',escape);reduced.removeEventListener('change',motion);expandScene(false);people.clear();pendingSales=[];if(active?.root===root)active=null;}};
    people.forEach(draw);setZoom(1,true);sync();animationState();
  }
  scope.IAPWorld={mount,stop(){active?.destroy();},unique,stage,changes};
})(globalThis);
