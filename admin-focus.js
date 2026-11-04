/* Read-only priorities from existing admin snapshots. Navigation only; no requests or timers. */
(function(scope){
  'use strict';
  const LIMITS=Object.freeze({page:12});
  const GROUPS=Object.freeze([
    {key:'support',label:'Soporte',detail:'Quejas y solicitudes de ayuda',icon:'!'},
    {key:'reply',label:'Sin responder',detail:'Último mensaje del cliente o fallo',icon:'↩'},
    {key:'payment',label:'Pagos por revisar',detail:'Estado registrado: por confirmar',icon:'◈'},
    {key:'delivery',label:'Enlace por enviar',detail:'Confirmadas para envío manual',icon:'↗'}
  ]);
  const normalized=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const phoneOf=value=>String(value??'').replace(/\D/g,'');
  const timestamp=value=>{if(!value)return 0;const n=typeof value==='number'||/^\d+$/.test(String(value))?Number(value):new Date(value).getTime();return Number.isFinite(n)&&n>0?n:0;};
  const needsReply=c=>!c.sinDatos&&(c.quien==='u'||/no pude completar|no puedo responder|respuesta automática.*error/i.test(c.ultimo||''));
  function buildQueue({chats=[],sales=[],now=Date.now()}={}){
    const uniqueChats=new Map(),uniqueSales=new Map(),rows=new Map();
    for(const c of Array.isArray(chats)?chats:[]){const phone=phoneOf(c?.tel);if(!phone)continue;const previous=uniqueChats.get(phone);if(!previous||timestamp(c.ts)>=timestamp(previous.ts))uniqueChats.set(phone,c);}
    for(const s of Array.isArray(sales)?sales:[]){if(!s?.id)continue;const id=String(s.id),previous=uniqueSales.get(id);if(!previous||timestamp(s.fecha)>=timestamp(previous.fecha))uniqueSales.set(id,s);}
    function rowFor(phone,id,name){
      const key=phone?'phone:'+phone:'order:'+id;
      if(!rows.has(key))rows.set(key,{id:key,phone,name:String(name||''),preview:'',categories:[],reasons:[],orderIds:[],priority:100,since:0,search:''});
      const row=rows.get(key);if(!row.name&&name)row.name=String(name);return row;
    }
    function add(row,key,label,priority,at){
      if(!row.categories.includes(key))row.categories.push(key);
      if(!row.reasons.includes(label))row.reasons.push(label);
      row.priority=Math.min(row.priority,priority);const time=Math.min(timestamp(at),now);if(time&&(!row.since||time<row.since))row.since=time;
    }
    for(const [phone,c]of uniqueChats){
      const tags=Array.isArray(c.etiquetas)?c.etiquetas:[],support=tags.some(t=>['urgente','queja','reembolso'].includes(t)),reply=needsReply(c);
      if(!support&&!reply)continue;
      const row=rowFor(phone,'',c.nombre);row.preview=String(c.ultimo||'');row.search=row.preview;
      if(support)add(row,'support',tags.includes('urgente')?'Marcado urgente':tags.includes('reembolso')?'Solicitud de reembolso':'Queja por revisar',tags.includes('urgente')?0:10,c.ts);
      if(reply)add(row,'reply',c.quien==='u'?'Último mensaje del cliente':'Fallo del asistente',40,c.ts);
    }
    for(const [id,s]of uniqueSales){
      const status=String(s.estado||''),support=['NECESITA AYUDA','RECLAMO'].includes(status),payment=status==='POR CONFIRMAR',delivery=status==='CONFIRMADO (enviar a mano)';
      if(!support&&!payment&&!delivery)continue;
      const phone=phoneOf(s.telefono),chat=uniqueChats.get(phone),row=rowFor(phone,id,chat?.nombre||s.nombre);
      row.orderIds.push(id);row.search+=' '+String(s.producto||'')+' '+id;
      if(!row.preview)row.preview=String(s.producto||'Revisar el registro en Ventas por WhatsApp');
      if(support)add(row,'support',status==='RECLAMO'?'Reclamo en ventas':'Solicita atención personal',10,s.fecha);
      if(payment)add(row,'payment','Pago por confirmar',30,s.fecha);
      if(delivery)add(row,'delivery','Enlace pendiente de envío manual',20,s.fecha);
    }
    const list=[...rows.values()];
    for(const row of list){row.name=row.name||'Cliente';row.search=normalized([row.name,row.phone,row.search,...row.reasons].join(' '));}
    list.sort((a,b)=>a.priority-b.priority||(a.since||Infinity)-(b.since||Infinity)||a.id.localeCompare(b.id));
    const counts=Object.fromEntries(GROUPS.map(group=>[group.key,list.filter(row=>row.categories.includes(group.key)).length]));
    return {rows:list,total:list.length,counts,now};
  }
  function pageOf(rows,{query='',filter='',page=0,sort='priority'}={}){
    const q=normalized(query),list=rows.filter(row=>(!filter||row.categories.includes(filter))&&(!q||row.search.includes(q)));
    if(sort==='oldest')list.sort((a,b)=>(a.since||Infinity)-(b.since||Infinity)||a.priority-b.priority||a.id.localeCompare(b.id));
    const pages=Math.max(1,Math.ceil(list.length/LIMITS.page)),current=Math.min(pages-1,Math.max(0,Math.floor(Number(page)||0)));
    return {items:list.slice(current*LIMITS.page,(current+1)*LIMITS.page),total:list.length,page:current,pages};
  }
  function waitLabel(since,now=Date.now()){
    if(!since)return 'Sin fecha';const minutes=Math.max(0,Math.floor((now-since)/60000));
    return minutes<1?'Ahora':minutes<60?`${minutes} min`:minutes<1440?`${Math.floor(minutes/60)} h`:`${Math.floor(minutes/1440)} d`;
  }
  const exported={buildQueue,pageOf,waitLabel,needsReply,LIMITS};
  if(typeof module==='object'&&module.exports){module.exports=exported;return;}
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const instances=new WeakMap();
  function mount(root,{openChat=()=>{},openSales=()=>{},onRetry=null}={}){
    instances.get(root)?.destroy();
    let disposed=false,loaded=false,query='',filter='',page=0,sort='priority',loading=false,error='',updatedAt=0,snapshot=buildQueue();
    root.innerHTML=`<section class="admin-focus" aria-label="Centro de pendientes"><header class="af-head"><div><span class="af-eyebrow">ATENCIÓN AL CLIENTE</span><h2>Centro de pendientes <span class="af-total">—</span></h2><p>Una vista para decidir a quién atender primero.</p></div><div class="af-sync"><span class="af-status" role="status" aria-live="polite">Cargando prioridades…</span><button type="button" class="af-retry" hidden>Reintentar</button></div></header><div class="af-stats">${GROUPS.map(group=>`<button type="button" class="af-stat" data-focus-filter="${group.key}" aria-pressed="false"><span class="af-stat-icon" aria-hidden="true">${group.icon}</span><span><strong data-focus-count="${group.key}">—</strong><b>${group.label}</b><small>${group.detail}</small></span></button>`).join('')}</div><div class="af-toolbar"><div class="af-filter-state"><button type="button" class="af-all" data-focus-filter="" aria-pressed="true">Todos los pendientes</button><span class="af-filter-name"></span></div><div class="af-controls"><label><span class="af-sr-only">Buscar pendientes por nombre, número o mensaje</span><input class="af-search" type="search" placeholder="Nombre, número o mensaje…" autocomplete="off"></label><label><span class="af-sr-only">Orden de los pendientes</span><select class="af-sort"><option value="priority">Prioridad primero</option><option value="oldest">Más antiguos primero</option></select></label></div></div><div class="af-list"></div><footer class="af-footer"><span class="af-page-info" role="status" aria-live="polite"></span><nav aria-label="Páginas de pendientes"><button type="button" class="af-prev">← Anterior</button><button type="button" class="af-next">Siguiente →</button></nav></footer><p class="af-note">Un cliente puede aparecer en varios grupos; la lista lo muestra una sola vez. Las etiquetas señalan qué revisar. Los estados de pago vienen de los registros de ventas.</p></section>`;
    const $=selector=>root.querySelector(selector);
    function render(){
      if(disposed||!root.isConnected)return;
      const result=pageOf(snapshot.rows,{query,filter,page,sort});page=result.page;
      $('.af-total').textContent=loaded?snapshot.total.toLocaleString('es-CO'):'—';
      for(const group of GROUPS){$(`[data-focus-count="${group.key}"]`).textContent=loaded?snapshot.counts[group.key].toLocaleString('es-CO'):'—';$(`[data-focus-filter="${group.key}"]`).setAttribute('aria-pressed',String(filter===group.key));}
      $('.af-all').setAttribute('aria-pressed',String(!filter));$('.af-filter-name').textContent=GROUPS.find(group=>group.key===filter)?.label||'';
      $('.af-list').setAttribute('aria-busy',String(loading));
      $('.af-list').innerHTML=result.items.length?result.items.map(row=>`<article class="af-row" data-focus-row="${esc(row.id)}"><div class="af-avatar" data-kind="${row.priority<20?'support':row.categories.includes('delivery')?'delivery':row.categories.includes('payment')?'payment':'reply'}" aria-hidden="true">${esc(row.name.trim().slice(0,1).toUpperCase())}</div><div class="af-client"><div class="af-client-title"><h3>${esc(row.name.slice(0,80))}</h3><span class="af-age" title="Tiempo desde el evento pendiente más antiguo">${esc(waitLabel(row.since,snapshot.now))}</span></div><p class="af-preview">${esc(row.preview.slice(0,180)||'Abre la conversación para revisar el contexto.')}</p><div class="af-reasons">${row.reasons.map(reason=>`<span>${esc(reason)}</span>`).join('')}</div><small class="af-phone">${row.phone?'+'+esc(row.phone):'Sin número registrado'}</small></div><div class="af-row-actions">${row.phone?`<button type="button" data-focus-open="${esc(row.id)}" data-focus-action="chat" aria-label="Abrir chat de ${esc(row.name)}">Abrir chat <span aria-hidden="true">↗</span></button>`:''}${row.orderIds.length?`<button type="button" class="af-sales" data-focus-open="${esc(row.id)}" data-focus-action="sales" aria-label="Revisar registros de venta de ${esc(row.name)}">Revisar venta${row.orderIds.length>1?'s · '+row.orderIds.length:''}</button>`:''}</div></article>`).join(''):`<div class="af-empty"><span aria-hidden="true">${loaded?'✓':'◌'}</span><b>${!loaded?'Esperando los datos del panel':snapshot.total?'No hay coincidencias':'No hay pendientes en estos datos'}</b><p>${!loaded?'Las prioridades aparecerán al terminar la actualización.':snapshot.total?'Prueba otro nombre, número o grupo.':'Revisa de nuevo cuando lleguen más conversaciones.'}</p></div>`;
      $('.af-page-info').textContent=result.total?`${page*LIMITS.page+1}–${Math.min((page+1)*LIMITS.page,result.total)} de ${result.total} clientes · Página ${page+1} de ${result.pages}`:loaded?'0 clientes':'Sin datos todavía';
      $('.af-prev').disabled=page===0;$('.af-next').disabled=page>=result.pages-1;
      const status=$('.af-status');status.dataset.state=error?'error':loading?'loading':loaded?'ready':'loading';
      status.textContent=error?(loaded?'No se pudo actualizar · conservamos la última vista':'No se pudieron cargar las prioridades'):loading?'Actualizando prioridades…':loaded?'Actualizado '+(updatedAt?new Date(updatedAt).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}):'ahora'):'Cargando prioridades…';
      $('.af-retry').hidden=!error||typeof onRetry!=='function';$('.af-retry').disabled=loading;
    }
    root.onclick=event=>{
      if(disposed)return;
      const selected=event.target.closest('[data-focus-filter]');
      if(selected){const value=selected.dataset.focusFilter;if(value!==''&&!GROUPS.some(group=>group.key===value))return;filter=value;page=0;render();return;}
      const button=event.target.closest('[data-focus-open]');if(!button)return;
      const row=snapshot.rows.find(row=>row.id===button.dataset.focusOpen);if(!row)return;
      if(button.dataset.focusAction==='chat'&&row.phone)openChat(row.phone);
      if(button.dataset.focusAction==='sales'&&row.orderIds.length)openSales(row.orderIds[0],row.phone);
    };
    $('.af-search').oninput=event=>{query=String(event.target.value||'');page=0;render();};
    $('.af-sort').onchange=event=>{sort=event.target.value==='oldest'?'oldest':'priority';page=0;render();};
    $('.af-prev').onclick=()=>{page--;render();};$('.af-next').onclick=()=>{page++;render();};
    $('.af-retry').onclick=()=>{if(disposed||loading||!error||typeof onRetry!=='function')return;loading=true;error='';render();try{Promise.resolve(onRetry()).catch(()=>{if(disposed)return;loading=false;error='No se pudo actualizar';render();});}catch(e){loading=false;error='No se pudo actualizar';render();}};
    const controller={update(data={}){
      if(disposed)return;
      loading=!!data.loading;error=data.error?String(data.error):'';
      if('chats'in data||'sales'in data){
        if(Array.isArray(data.chats)&&Array.isArray(data.sales)){snapshot=buildQueue({chats:data.chats,sales:data.sales,now:data.now??Date.now()});loaded=true;updatedAt=timestamp(data.updatedAt)||snapshot.now;}
        else error='Datos incompletos';
      }
      render();
    },destroy(){if(disposed)return;disposed=true;root.onclick=null;$('.af-search').oninput=null;$('.af-sort').onchange=null;$('.af-prev').onclick=null;$('.af-next').onclick=null;$('.af-retry').onclick=null;if(instances.get(root)===controller)instances.delete(root);}};
    instances.set(root,controller);render();return controller;
  }
  scope.IAPAdminFocus=Object.freeze({...exported,mount});
})(globalThis);
