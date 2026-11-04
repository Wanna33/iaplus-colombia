/* An admin-only, read-only view. No credentials, orders or plans are written here. */
(function (scope) {
  'use strict';
  const FAILURE = /no pude completar|no puedo responder|respuesta automática.*error/i;
  function unique(chats) {
    const map = new Map();
    for (const c of chats || []) if(c.tel && (!map.has(String(c.tel)) || Number(c.ts)>Number(map.get(String(c.tel)).ts))) map.set(String(c.tel),c);
    return [...map.values()].sort((a,b)=>Number(b.ts)-Number(a.ts));
  }
  function stage(c) {
    const tags=c.etiquetas||[];
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
  function saleChanges(before,sales){return sales.filter(s=>s.id&&s.telefono&&confirmed(s.estado)&&(!before.has(s.id)||!confirmed(before.get(s.id)))).map(s=>({kind:'sale',chat:{tel:String(s.telefono),nombre:s.nombre,ts:Date.now(),etiquetas:[],quien:'a'},product:s.producto}));}
  if(typeof module==='object'&&module.exports) { module.exports={unique,stage,changes,saleChanges,confirmed}; return; }
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
    let disposed=false,loading=false,paused=false,frame=0,poll=0,baseline=null,saleBaseline=null,lastFrame=0,viewChats=[],lastSync=0;
    const people=new Map(),departed=new Map(), reduced=matchMedia('(prefers-reduced-motion: reduce)');
    root.innerHTML=`<div class="world-shell"><header class="world-head"><div><div class="world-eyebrow">SOLO PARA TI · ADMINISTRACIÓN</div><h2>Tu tienda cobra vida<span>✦</span></h2><p>Personajes virtuales. Conversaciones y actividad reales.</p></div><div class="world-actions"><button type="button" class="world-pause">Pausar movimiento</button><button type="button" class="world-refresh">↻ Actualizar</button></div></header><div class="world-metrics"><div><span>Conversaciones recientes</span><b data-count="recent">—</b></div><div><span>Esperan atención</span><b data-count="waiting">—</b></div><div><span>Necesitan ayuda</span><b data-count="support">—</b></div><div><span>Compras registradas¹</span><b data-count="sales">—</b></div></div><div class="world-layout"><div class="world-main"><div class="world-status" role="status">Conectando con tus conversaciones…</div><div class="world-viewport"><div class="world-stage">${scenery()}<div class="world-people"></div><div class="world-scene-label">IA PLUS <span>ESTUDIO EN VIVO</span></div></div></div><div class="world-legend"><span><i style="background:#d69b49"></i>Espera</span><span><i style="background:#529c83"></i>Conversación</span><span><i style="background:#ac7dc3"></i>Soporte</span><span>Selecciona un cliente para abrir su chat ↗</span></div></div><aside class="world-panel"><h3>El equipo</h3><div class="world-roster"></div><h3>Actividad de esta sesión</h3><ol class="world-events"><li>La actividad nueva aparecerá aquí al actualizar.</li></ol></aside></div><div class="world-footer"><p>¹ Conversaciones con compra registrada entre las activas en las últimas 72 horas; no es un conteo de pagos nuevos. Se muestran hasta 14 clientes a la vez.</p><p>Esta vista solo observa. Los personajes y mostradores no cambian planes, cuentas ni pagos. El movimiento del equipo es decorativo.</p></div><details class="world-accessible"><summary>Ver clientes en lista</summary><div class="world-client-list"></div></details></div>`;
    const layer=root.querySelector('.world-people');
    const expand=document.createElement('button');expand.type='button';expand.textContent='Ampliar tienda';expand.setAttribute('aria-expanded','false');root.querySelector('.world-actions').prepend(expand);
    function expandScene(on){root.classList.toggle('world-expanded',on);expand.textContent=on?'Cerrar vista ampliada':'Ampliar tienda';expand.setAttribute('aria-expanded',String(on));}
    expand.onclick=()=>expandScene(!root.classList.contains('world-expanded'));
    const escape=e=>{if(e.key==='Escape')expandScene(false);};document.addEventListener('keydown',escape);
    const staff=[['Luna','Recepción','#e4ad64',177,280],['Nico','Ventas','#729b89',605,345],['Mía','Soporte','#a18bc1',854,225],['Leo','Caja','#6698ae',880,415],['Bruno','Seguridad','#354c61',302,510]];
    root.querySelector('.world-roster').innerHTML=staff.map(([name,role,color])=>`<div><span class="world-mini">${avatar(color)}</span><span><b>${name}</b><small>${role}</small></span><i>Personal virtual</i></div>`).join('');
    staff.forEach(([name,role,color,x,y],i)=>{
      const el=document.createElement('div');el.className='world-person world-staff';el.innerHTML=avatar(color,i%2?'#e2ac81':'#b77e59','#30313a',i===4)+`<span class="world-name">${name}</span>`;el.title=name+' · '+role;layer.append(el);
      people.set('staff'+i,{el,x,y,tx:x,ty:y,home:[x,y],staff:true,index:i});
    });
    function draw(p){p.el.style.left=p.x/10+'%';p.el.style.top=p.y/6+'%';p.el.style.zIndex=Math.round(p.y);}
    function target(c,index){const kind=stage(c),rank=Math.max(0,viewChats.filter(x=>stage(x)===kind).findIndex(x=>String(x.tel)===String(c.tel)));if(kind==='waiting')return [215+(rank%3)*53,320+Math.floor(rank/3)*50];if(kind==='shopping')return [375+(rank%7)*42,345+Math.floor(rank/7)*165];if(kind==='support')return [725+(rank%3)*61,240+Math.floor(rank/3)*48];if(kind==='payment')return [740+(rank%3)*55,430+Math.floor(rank/3)*50];return locations[kind];}
    function person(c,index,entry=false){const id=String(c.tel);let p=people.get(id);const [tx,ty]=target(c,index);if(!p){const el=document.createElement('button');el.type='button';el.className='world-person world-customer';el.innerHTML=avatar(colors[index%colors.length],index%2?'#e6b187':'#ac7655')+'<span class="world-bubble"></span><span class="world-name"></span>';el.onclick=()=>openChat(id);layer.append(el);p={el,x:entry?245:tx,y:entry?527:ty,tx,ty};people.set(id,p);}if(p.salePhase)return;p.tx=tx;p.ty=ty;p.el.dataset.stage=stage(c);p.el.querySelector('.world-name').textContent=(c.nombre||'Cliente').slice(0,18);p.el.querySelector('.world-bubble').textContent=titles[stage(c)];p.el.setAttribute('aria-label',(c.nombre||'Cliente')+': '+titles[stage(c)]+'. Abrir conversación');draw(p);}
    function log(event){const list=root.querySelector('.world-events');if(!list.dataset.started){list.innerHTML='';list.dataset.started='1';}const li=document.createElement('li');li.innerHTML=`<span>${esc(titles[event.kind])}</span><b>${esc(event.chat.nombre||'Cliente')}</b><small>${new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}</small>`;list.prepend(li);while(list.children.length>12)list.lastChild.remove();}
    async function sync(){
      if(disposed||loading||document.hidden)return;
      loading=true;root.querySelector('.world-refresh').disabled=true;
      try {
        const result=await readChats();if(disposed)return;if(!Array.isArray(result.chats))throw Error('No se recibieron conversaciones válidas');
        const all=unique(result.chats), now=Date.now();
        viewChats=all.filter(c=>now-Number(c.ts)<72*3600000&&!c.sinDatos&&!c.etiquetas?.includes('no_interesado'));
        const sales=Array.isArray(result.sales)?result.sales:null;
        const events=baseline?changes(baseline,all).filter(e=>!sales||e.kind!=='sale'):[];
        if(sales){if(saleBaseline)events.push(...saleChanges(saleBaseline,sales));else saleBaseline=new Map();for(const s of sales)if(!confirmed(saleBaseline.get(s.id)))saleBaseline.set(s.id,s.estado);}
        baseline=new Map(all.map(c=>[String(c.tel),{ts:c.ts,vendido:!!c.vendido}]));
        const shown=viewChats.filter(c=>!departed.has(String(c.tel))||Number(c.ts)>departed.get(String(c.tel))).slice(0,14), ids=new Set(shown.map(c=>String(c.tel)));
        for(const [id,p] of people)if(!p.staff&&!ids.has(id)&&!p.salePhase){p.el.remove();people.delete(id);}
        shown.forEach((c,i)=>person(c,i,lastSync>0));
        for(const e of events.slice(-30)){log(e);const staffId={waiting:'staff0',shopping:'staff1',support:'staff2',payment:'staff3',sale:'staff3'}[e.kind];const worker=people.get(staffId);if(worker){worker.jobUntil=performance.now()+7000;worker.el.querySelector('.world-name').textContent=staff[worker.index][0]+' · atendiendo';}if(e.kind==='sale'){let p=people.get(String(e.chat.tel));if(!p&&people.size<20){person(e.chat,0,true);p=people.get(String(e.chat.tel));}if(p){p.tx=780;p.ty=410;p.salePhase='cash';p.saleTs=Number(e.chat.ts);p.el.dataset.stage='sale';p.el.querySelector('.world-bubble').textContent=(e.product||'Compra registrada')+' ✓';}}}
        for(const [key,value] of Object.entries({recent:viewChats.length,waiting:viewChats.filter(c=>stage(c)==='waiting').length,support:viewChats.filter(c=>stage(c)==='support').length,sales:viewChats.filter(c=>c.vendido).length}))root.querySelector(`[data-count="${key}"]`).textContent=value;
        root.querySelector('.world-client-list').innerHTML=shown.map(c=>`<button type="button" data-chat="${esc(c.tel)}"><b>${esc(c.nombre||'Cliente')}</b><span>${esc(titles[stage(c)])}</span></button>`).join('')||'<p>Sin conversaciones recientes.</p>';
        root.querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>openChat(b.dataset.chat));
        lastSync=now;root.querySelector('.world-status').textContent='● Conectado · actualizado '+new Date(now).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})+' · cada 30 s'+(!viewChats.length?' · La tienda espera clientes':'');root.querySelector('.world-status').dataset.error='false';
      }catch(e){if(!disposed){root.querySelector('.world-status').textContent='Sin actualizar · '+e.message+(lastSync?' · conservamos la última vista':'');root.querySelector('.world-status').dataset.error='true';}}
      finally{loading=false;if(!disposed)root.querySelector('.world-refresh').disabled=false;}
    }
    function animate(t){
      if(disposed)return;
      if(!document.hidden&&!paused){const dt=Math.min((t-lastFrame)/1000||0,.05);
        for(const [id,p]of people){
          if(p.staff){p.tx=p.home[0]+(reduced.matches?0:Math.sin(t/4500+p.index)*12);p.ty=p.home[1]+(p.jobUntil>t?-15:0);if(p.jobUntil&&p.jobUntil<t){p.el.querySelector('.world-name').textContent=staff[p.index][0];p.jobUntil=0;}}
          if(p.salePhase==='cash'&&Math.hypot(p.tx-p.x,p.ty-p.y)<2){p.salePhase='hold';p.leaveAt=t+2500;}
          if(p.salePhase==='hold'&&t>p.leaveAt){p.salePhase='exit';p.tx=840;p.ty=560;}
          if(p.salePhase==='exit'&&Math.hypot(p.tx-p.x,p.ty-p.y)<2){departed.set(id,p.saleTs);p.el.remove();people.delete(id);continue;}
          const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy),step=reduced.matches?d:Math.min(d,dt*58);if(d>0){p.x+=dx/d*step;p.y+=dy/d*step;}
          p.el.classList.toggle('walking',d>2&&!reduced.matches);draw(p);
        }
      }lastFrame=t;frame=requestAnimationFrame(animate);
    }
    const visibility=()=>{if(!document.hidden)sync();};document.addEventListener('visibilitychange',visibility);
    root.querySelector('.world-refresh').onclick=sync;
    root.querySelector('.world-pause').onclick=e=>{paused=!paused;root.classList.toggle('world-paused',paused);e.currentTarget.textContent=paused?'Reanudar movimiento':'Pausar movimiento';e.currentTarget.setAttribute('aria-pressed',String(paused));};
    active={root,destroy(){disposed=true;clearInterval(poll);cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',escape);expandScene(false);people.clear();if(active?.root===root)active=null;}};
    people.forEach(draw);sync();poll=setInterval(sync,30000);frame=requestAnimationFrame(animate);
  }
  scope.IAPWorld={mount,stop(){active?.destroy();},unique,stage,changes};
})(globalThis);
