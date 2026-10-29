/* Customer catalog tools: details, comparison and shortcuts. Selection stays in memory. */
(() => {
  const C=IAPCatalog;
  const selected=new Set();let returnFocus;
  const dialog=document.createElement('dialog');dialog.className='store-dialog';dialog.setAttribute('aria-labelledby','storeDialogTitle');
  document.body.append(dialog);
  const tray=document.createElement('aside');tray.className='compare-tray';tray.hidden=true;tray.setAttribute('aria-label','Planes seleccionados para comparar');document.body.append(tray);
  const find=id=>PRODUCTS.find(p=>p.id===id);
  const wa=p=>`https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent('Hola, quiero confirmar disponibilidad, modalidad y condiciones de '+p.name+' ('+C.money(p.price)+' COP '+p.per+').')}`;
  const link=p=>window.IAPPayPal?.canPay(p.id)?`<button type="button" class="btn paypal-button" data-paypal="${p.id}">PayPal · ${window.IAPPayPal.amount(p.id)}</button>`:`<a class="btn btn-primary" href="${wa(p)}" target="_blank" rel="noopener">Consultar por WhatsApp ↗</a>`;
  function open(html,source){
    returnFocus=source;dialog.innerHTML=`<header class="store-dialog-head"><span class="eyebrow">ELIGE CON CLARIDAD</span><button type="button" data-store-close aria-label="Cerrar ventana">✕</button></header>${html}`;
    dialog.querySelector('[data-store-close]').onclick=()=>dialog.close();
    if(!dialog.open)dialog.showModal();
  }
  dialog.addEventListener('close',()=>returnFocus?.isConnected&&returnFocus.focus());
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  function details(p,source){
    open(`<div class="detail-intro"><img class="${p.dark?'dark-image':''}" src="${esc(p.img)}" alt="" width="64" height="64"><div><span class="detail-category">${esc(p.cat)}</span><h2 id="storeDialogTitle">${esc(p.name)}</h2></div></div><div class="detail-price">${C.money(p.price)} <small>COP · ${C.duration(p)}</small></div><dl class="detail-facts"><div><dt>Modalidad</dt><dd>${C.mode(p)}</dd></div><div><dt>Dispositivos</dt><dd>${esc(C.devices(p))}</dd></div><div><dt>Activación</dt><dd>Después de revisar el pago</dd></div></dl><h3 class="detail-includes">Qué indica este plan</h3><ul class="detail-list">${p.feats.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>${C.mode(p)==='Cuenta compartida'?'<p class="shared-notice">En una cuenta compartida, otros usuarios pueden ver la información que guardes. Evita ingresar datos personales o sensibles.</p>':''}<p class="detail-note">Confirma disponibilidad y condiciones antes de pagar. Consulta los <a href="terminos.html">términos y garantía</a>.</p><div class="detail-actions">${link(p)}<button class="btn btn-ghost" type="button" data-compare="${p.id}" aria-pressed="${selected.has(p.id)}">${selected.has(p.id)?'✓ Seleccionado':'＋ Agregar a comparación'}</button></div>`,source);
  }
  function comparison(source){
    const plans=[...selected].map(find).filter(Boolean);if(plans.length<2)return;
    const rows=[['Duración',p=>C.duration(p)],['Precio total',p=>C.money(p.price)+' COP'],['Equivalente por 30 días',p=>C.money(Math.round(p.price/C.days(p)*30))+' COP'],['Modalidad',p=>C.mode(p)],['Dispositivos',p=>C.devices(p)]];
    open(`<h2 id="storeDialogTitle">Compara tus planes</h2><p class="detail-note">El equivalente por 30 días es orientativo. El pago corresponde al precio total del plan.</p><div class="compare-scroll" tabindex="0" role="region" aria-label="Tabla de comparación"><table class="compare-table"><thead><tr><th scope="col">Tu elección</th>${plans.map(p=>`<th scope="col"><img class="${p.dark?'dark-image':''}" src="${esc(p.img)}" alt="" width="40" height="40">${esc(p.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([title,fn])=>`<tr><th scope="row">${title}</th>${plans.map(p=>`<td>${esc(fn(p))}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">Siguiente paso</th>${plans.map(p=>`<td>${link(p)}</td>`).join('')}</tr></tbody></table></div><p class="detail-note">La disponibilidad se confirma por WhatsApp. <a href="terminos.html">Ver condiciones</a></p>`,source);
  }
  function sync(){
    for(const id of selected)if(!find(id))selected.delete(id);
    document.body.classList.toggle('comparing',selected.size>0);tray.hidden=!selected.size;
    document.querySelectorAll('[data-compare]').forEach(b=>{const on=selected.has(b.dataset.compare);b.setAttribute('aria-pressed',String(on));b.textContent=on?'✓ Seleccionado':'＋ Comparar';});
    if(selected.size){tray.innerHTML=`<div><b>${selected.size} de 3 planes</b><small>${[...selected].map(id=>esc(find(id).name)).join(' · ')}</small></div><button type="button" class="btn btn-primary" data-show-compare ${selected.size<2?'disabled':''}>Comparar${selected.size<2?' (elige otro)':' ↗'}</button><button type="button" class="tray-clear" data-clear-compare aria-label="Vaciar selección">✕</button>`;tray.querySelector('[data-show-compare]').onclick=e=>comparison(e.currentTarget);tray.querySelector('[data-clear-compare]').onclick=()=>{selected.clear();sync();};}
    document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===filter)));
  }
  function featured(){
    const plans=['chatgpt','chatgpt3','chatgpt6'].map(find).filter(Boolean);
    const words={chatgpt:['Empieza a tu ritmo','Un mes para empezar con ChatGPT Plus.'],chatgpt3:['Más tiempo para tus ideas','Tres meses para estudiar, trabajar y crear.'],chatgpt6:['Hazlo parte de tu día','Seis meses para tus proyectos a largo plazo.']};
    const el=document.getElementById('featuredPlans');
    if(el)el.innerHTML=plans.map(p=>`<article class="featured-plan feature-${p.id}"><div class="feature-top"><img src="${esc(p.img)}" alt="" width="48" height="48"><span>${esc(p.name)}</span><span class="feature-arrow" aria-hidden="true">↗</span></div><h3>${words[p.id][0]}</h3><p>${words[p.id][1]}</p><div class="feature-mode">${esc(C.mode(p))} · ${esc(C.devices(p))}</div><div class="feature-price"><b>${C.money(p.price)}</b><span>COP · ${C.duration(p)}</span></div><button type="button" data-details="${p.id}" aria-label="Ver plan y condiciones de ${esc(p.name)}">Ver plan y condiciones <span aria-hidden="true">↗</span></button></article>`).join('');
    const hero=document.getElementById('heroProductPeek');const p=find('chatgpt3');
    if(hero)hero.innerHTML=p?`<a href="#catalogo" data-details="chatgpt3"><img src="${esc(p.img)}" width="28" height="28" alt=""><span>ChatGPT · ${C.money(p.price)} COP / ${C.duration(p)}<small>${C.mode(p)} · ver condiciones ↗</small></span></a>`:'';
  }
  document.addEventListener('click',e=>{
    const d=e.target.closest('[data-details]');if(d){const p=find(d.dataset.details);if(p)details(p,d);return;}
    const b=e.target.closest('[data-compare]');if(b){const id=b.dataset.compare;if(!find(id))return;if(selected.has(id))selected.delete(id);else if(selected.size<3)selected.add(id);else{toast('Puedes comparar hasta 3 planes. Retira uno para agregar otro.');return;}sync();return;}
    const cat=e.target.closest('[data-category]');if(cat){filter=cat.dataset.category;document.getElementById('search').value='';renderFilters();renderGrid();document.querySelector('.toolbar').scrollIntoView({behavior:'smooth',block:'start'});return;}
    const jump=e.target.closest('[data-jump-product]');if(jump){document.getElementById('search').value=find(jump.dataset.jumpProduct)?.name||'';filter='Todos';renderFilters();renderGrid();}
  });
  window.addEventListener('iap:catalog-updated',()=>{featured();sync();});
  featured();sync();
})();
