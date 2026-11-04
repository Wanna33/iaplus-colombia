/* UI helpers only: no API calls, credentials, persistent storage or checkout changes. */
(() => {
  'use strict';
  const account=document.body.classList.contains('account-app');
  const store=document.body.classList.contains('storefront');
  if((!account&&!store)||document.querySelector('[data-pro-ui]'))return;
  const marker=document.createElement('span');marker.hidden=true;marker.dataset.proUi='';document.body.append(marker);
  const search=document.getElementById(account?'q':'search');
  if(!search)return;
  const offline=document.createElement('div');offline.className='pro-offline';offline.hidden=true;offline.setAttribute('role','status');
  offline.textContent='Tu navegador indica que estás sin conexión. Revisa internet antes de activar un código o continuar con un pago.';
  document.body.prepend(offline);
  const network=()=>{offline.hidden=navigator.onLine!==false;};network();
  window.addEventListener('online',network);window.addEventListener('offline',network);
  function clear(){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus();schedule();}
  function clearButton(){const b=document.createElement('button');b.type='button';b.className='pro-search-clear';b.textContent='Borrar búsqueda';b.setAttribute('aria-controls','grid');b.addEventListener('click',clear);return b;}
  let reset=null,frame=0;
  if(store){const toolbar=document.querySelector('#catalogo .toolbar');if(toolbar){reset=clearButton();reset.hidden=!search.value.trim();toolbar.append(reset);}}
  // Search the existing answers locally; no chat request or customer data is sent.
  if(store){
    const faq=document.getElementById('faq');
    const answers=faq?[...faq.querySelectorAll('details')]:[];
    if(answers.length){
      const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const texts=answers.map(answer=>normalize(answer.textContent));
      const tools=document.createElement('div');tools.className='pro-faq-search';
      tools.innerHTML='<label for="faqSearch">Encuentra una respuesta</label><div><input id="faqSearch" type="search" autocomplete="off" maxlength="160" placeholder="Prueba con: activar, garantía, pago…"><button type="button" class="pro-search-clear" hidden>Limpiar</button></div><p role="status" aria-live="polite" aria-atomic="true"></p>';
      answers[0].before(tools);
      const empty=document.createElement('p');empty.className='pro-faq-empty';empty.hidden=true;
      empty.innerHTML='No encontramos esa respuesta. Prueba otra palabra o <a href="#contacto">consulta las opciones de contacto</a>.';answers.at(-1).after(empty);
      const input=tools.querySelector('input'),button=tools.querySelector('button'),status=tools.querySelector('[role="status"]');
      function filterAnswers(){
        const query=normalize(input.value.trim()),words=query.split(/\s+/).filter(Boolean);let count=0;
        answers.forEach((answer,index)=>{const show=words.every(word=>texts[index].includes(word));answer.hidden=!show;if(show){count++;answer.classList.add('in');}});
        button.hidden=!query;empty.hidden=count>0;status.textContent=query?count+' de '+answers.length+' respuestas coinciden.':answers.length+' respuestas sobre compra, activación y soporte.';
      }
      const clearAnswers=()=>{input.value='';filterAnswers();input.focus();};
      input.addEventListener('input',filterAnswers);button.addEventListener('click',clearAnswers);
      input.addEventListener('keydown',event=>{if(event.key==='Escape'&&input.value){event.preventDefault();event.stopPropagation();clearAnswers();}});
      filterAnswers();
    }
  }
  function sync(){
    frame=0;if(document.hidden)return;
    if(reset)reset.hidden=!search.value.trim();
    if(!account)return;
    if(document.querySelector('#accountWorkspace .aw-tools'))return;
    const grid=document.querySelector('#app #grid');
    if(!grid)return;
    let results=grid.previousElementSibling;
    if(!results?.classList.contains('pro-results')){
      results=document.createElement('div');results.className='pro-results';results.hidden=true;
      const label=document.createElement('span');label.setAttribute('role','status');label.setAttribute('aria-live','polite');label.setAttribute('aria-atomic','true');
      results.append(label,clearButton());grid.before(results);
    }
    const query=search.value.trim();results.hidden=!query;
    if(query){const cards=[...grid.querySelectorAll('.sub-card')];const visible=cards.filter(c=>!c.hidden&&c.style.display!=='none').length;const label=results.querySelector('[role="status"]');const text=visible+' de '+cards.length+' cuentas coinciden con tu búsqueda';if(label.textContent!==text)label.textContent=text;}
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
  search.addEventListener('input',schedule);
  search.addEventListener('keydown',e=>{if(e.key==='Escape'&&search.value){e.preventDefault();e.stopPropagation();clear();}});
  document.addEventListener('keydown',e=>{
    if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||document.querySelector('dialog[open],#loginModal.on'))return;
    if(e.target instanceof Element&&e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if(!search.getClientRects().length)return;
    e.preventDefault();search.focus();search.select();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{network();schedule();}});
  window.addEventListener('iap:catalog-updated',schedule);
  // The customer view is replaced on refresh/tab changes. Watch only its direct children,
  // never the rotating verification code, password fields or per-second countdown.
  const mount=account?document.getElementById('app'):null;
  const observer=mount?new MutationObserver(schedule):null;
  if(observer)observer.observe(mount,{childList:true});
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;observer?.disconnect();});
  window.addEventListener('pageshow',()=>{if(observer)observer.observe(mount,{childList:true});network();schedule();});
  schedule();
})();
