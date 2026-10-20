/* Rule-based assistants: no network calls, keys, models or usage fees. */
(() => {
  const panel = document.getElementById('assistantPanel');
  if (!panel) return;
  let mode = 'advisor';
  const note = '<p class="local-note">Asistente con respuestas programadas. No lee tus pedidos ni verifica pagos. Puedes hablar con una persona por WhatsApp.</p>';
  const contact = () => `<a href="https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent('Hola, necesito ayuda con mi compra en IA Plus.')}" target="_blank" rel="noopener">Hablar con una persona ↗</a>`;
  function draw() {
    if (mode === 'advisor') {
      panel.innerHTML = `<span class="assistant-tag">ASESOR DE HERRAMIENTAS</span><h3>¿Qué quieres hacer hoy?</h3><p>Te mostramos opciones del catálogo actual según tu objetivo y tu presupuesto.</p><form id="advisorForm"><label for="botGoal">Quiero una herramienta para…</label><select id="botGoal"><option value="IA">Escribir, estudiar o programar con IA</option><option value="Diseño">Crear diseños y editar fotos</option><option value="Edición de video">Editar y crear videos</option><option value="Educación">Aprender idiomas</option><option value="Juegos">Jugar</option><option value="Streaming">Ver contenido sin anuncios</option></select><label for="botBudget">Presupuesto total del plan</label><select id="botBudget"><option value="1000000">Ver todas las opciones</option><option value="10000">Hasta $10.000 COP</option><option value="20000">Hasta $20.000 COP</option><option value="30000">Hasta $30.000 COP</option></select><button class="btn btn-primary" type="submit">Encontrar mi herramienta ↗</button></form><div id="botResult" aria-live="polite"></div>${note}`;
      panel.querySelector('form').onsubmit = e => {
        e.preventDefault();
        const list = PRODUCTS.filter(p => p.cat === panel.querySelector('#botGoal').value && p.price <= +panel.querySelector('#botBudget').value).sort((a,b) => a.price - b.price);
        const out = panel.querySelector('#botResult');
        out.className = 'assistant-result';
        out.innerHTML = list.length ? `<b>${list.length} ${list.length === 1 ? 'opción para ti' : 'opciones para ti'}</b>` + list.map(p=>`<a href="#catalogo" data-product-query="${esc(p.name)}">${esc(p.name)} · ${cop(p.price)} COP ${esc(p.per)} ↗</a>`).join('') + '<small>El precio corresponde a la duración indicada. Consulta modalidad y disponibilidad en cada producto.</small>' : 'No hay opciones con ese presupuesto. Prueba otro importe o consulta con nosotros.' + contact();
      };
    } else if (mode === 'guide') {
      panel.innerHTML = `<span class="assistant-tag">GUÍA DE COMPRA</span><h3>Tu compra, paso a paso.</h3><p>Marca lo que ya revisaste. Esta lista orienta tu compra; el pago se confirma en PayPal y tu acceso aparece en «Mi cuenta».</p><div class="assistant-checks">${['Elegí el producto y revisé si la cuenta es privada o compartida.','Revisé el precio total y la duración del plan.','Pagué con PayPal dentro de la tienda y aprobé el pago.','Esperé la confirmación y revisé mi acceso en «Mi cuenta».','Recibí mi código y lo activé con Google.'].map((s,i)=>`<label><input type="checkbox" data-check="${i}"><span>${s}</span></label>`).join('')}</div><div id="checkProgress" class="assistant-progress" aria-live="polite">0 de 5 pasos revisados</div><a class="btn btn-primary" href="#catalogo">Ir al catálogo y pagar ↗</a>${note}`;
      const progress = () => { panel.querySelector('#checkProgress').textContent = `${panel.querySelectorAll('input:checked').length} de 5 pasos revisados`; };
      panel.querySelectorAll('[data-check]').forEach(c => c.onchange = progress);
    } else {
      panel.innerHTML = `<span class="assistant-tag">AYUDA RÁPIDA</span><h3>Resuelve una duda.</h3><p>Selecciona un tema o escribe una pregunta breve.</p><form id="helpForm"><label for="helpQuestion">¿En qué te ayudamos?</label><input id="helpQuestion" maxlength="250" placeholder="Ej.: ¿cómo activo mi código?" required><button class="btn btn-primary" type="submit">Consultar respuesta ↗</button></form><div class="assistant-topics"><button class="linkbtn" data-question="pago">Medios de pago</button><button class="linkbtn" data-question="compartida">Cuenta privada o compartida</button><button class="linkbtn" data-question="activar">Activar mi código</button></div><div id="botResult" aria-live="polite"></div>${note}`;
      const answer = question => {
        const result=IAPPublicHelp.answer(question,PRODUCTS);
        const out=panel.querySelector('#botResult');out.className='assistant-result';out.textContent=result.text;
        (result.products||[]).forEach(p=>{const a=document.createElement('a');a.href='#catalogo';a.dataset.productQuery=p.name;a.textContent=`${p.name} · ${cop(p.price)} COP ${p.per} ↗`;out.append(a);});
        out.insertAdjacentHTML('beforeend',contact());

      };
      panel.querySelector('form').onsubmit=e=>{e.preventDefault();answer(panel.querySelector('input').value);};
      panel.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>answer(b.dataset.question));
    }
  }
  document.querySelectorAll('[data-assistant]').forEach(b => b.onclick = () => {
    mode = b.dataset.assistant;
    document.querySelectorAll('[data-assistant]').forEach(t=>{t.classList.toggle('on',t===b);t.setAttribute('aria-pressed',String(t===b));});
    draw();
  });
  panel.addEventListener('click',e=>{const a=e.target.closest('[data-product-query]');if(!a)return; document.querySelector('#search').value=a.dataset.productQuery; filter='Todos';renderFilters();renderGrid();});
  draw();
})();
