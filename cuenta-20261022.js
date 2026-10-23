const API_URL = "https://script.google.com/macros/s/AKfycbyIINkQAuYouCXVr722gi_8K1dHPLeF6N5XlmzHgCRA0ETF4cBc-VpIw0933mz1lFg8qA/exec";
const WHATSAPP = "573102035327";
const DAY = 86400000;
const CLIENT_ID = "912360874722-idm6s6ujebsi7bbvmduq7ql88efb9uq9.apps.googleusercontent.com";
let IS_ADMIN = false; // lo informa el servidor
const $ = s => document.querySelector(s);
const esc = s => String(s??"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const load = k => { try { return JSON.parse((k==="iap_pending_code"?sessionStorage:localStorage).getItem(k)); } catch { return null; } };
const save = (k,v) => { try { (k==="iap_pending_code"?sessionStorage:localStorage).setItem(k, JSON.stringify(v)); } catch {} };
const fmt = d => d.toLocaleDateString("es-CO",{timeZone:"America/Bogota",day:"2-digit",month:"short",year:"numeric"});
const fmtT = d => d.toLocaleDateString("es-CO",{timeZone:"America/Bogota",day:"2-digit",month:"2-digit",year:"numeric"})+", "+d.toLocaleTimeString("es-CO",{timeZone:"America/Bogota",hour:"2-digit",minute:"2-digit",hour12:false});
function parseJwt(t){ const b=t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"); return JSON.parse(decodeURIComponent(atob(b).split("").map(c=>"%"+("00"+c.charCodeAt(0).toString(16)).slice(-2)).join(""))); }
let credP = null;
function ensureCred(){
  const c = load("iap_cred");
  if(c && c.exp > Date.now()+30000) return Promise.resolve(c);
  if(credP) return credP;
  credP = new Promise(resolve=>{
    let bar = document.getElementById("relogin");
    if(!bar){ bar = document.createElement("div"); bar.id="relogin";
      bar.className="account-signin";
      document.body.classList.add("is-signing-in");
      const act=!!load("iap_pending_code");
      bar.innerHTML=`
        <header class="signin-masthead"><a class="signin-brand" href="index.html?tienda=1"><img src="assets/brand-iaplus.svg?v=pro4" alt="iapluscolombia" width="200" height="58"></a><a class="signin-store-link" href="index.html?tienda=1">Ir a la tienda <span aria-hidden="true">↗</span></a></header>
        <section class="signin-showcase" aria-labelledby="signinWelcomeTitle">
          <div class="signin-scene"><img src="assets/hero-colombia-creadora-mobile.webp?v=20261023" width="780" height="975" alt="Creadora colombiana sonriente, con flores y un paisaje cafetero" fetchpriority="high" decoding="async"><span class="signin-colombia">🇨🇴 Con el corazón en Colombia</span></div>
          <h1 id="signinWelcomeTitle">Tu mundo digital.<br> <em>Más cerca de ti.</em></h1>
        </section>
        <section class="signin-access" aria-labelledby="signinAccessTitle">
          <span class="signin-kicker">${act?"PASO 2 DE 3 · TU IDENTIDAD":"BIENVENIDO A TU ESPACIO"}</span>
          <h2 id="signinAccessTitle">${act?"Activa tu próximo paso.":"Todo empieza contigo."}</h2>
          <p class="signin-intro">${act?"Tu código está listo. Entra con Google para revisar tu plan y confirmar la activación.":"Entra con el Gmail de tu compra para encontrar tus cuentas, accesos y pedidos."}</p>
          ${act?'<div class="pending-code">Código recibido <span>✓ Listo para revisar</span></div>':""}
          <div id="relBtn" class="signin-google signin-google-prominent"></div>
          <p id="loginWait" class="signin-wait" role="status">Preparando el acceso con Google…</p>
          <div class="signin-reassurance"><span aria-hidden="true">✓</span> Tu contraseña se queda con Google.</div>
          <div class="signin-assistance"><span>¿Es tu primera vez?</span><button type="button" class="guide-video-btn" data-guide-video>Ver cómo activar mi cuenta <span aria-hidden="true">↗</span></button></div>
          <small class="signin-legal">Al continuar aceptas nuestros <a href="terminos.html">Términos</a> y la <a href="privacidad.html">Política de datos</a>.</small>
        </section>
        <footer class="signin-footer"><span>iapluscolombia · Cuentas digitales, a tu ritmo.</span><a href="https://wa.me/573102035327" target="_blank" rel="noopener">¿Necesitas ayuda?</a></footer>`;
      $("#app").replaceChildren(bar); }
    let loginTries=0;

    const init = () => {
      if(!window.google?.accounts?.id){
        if(++loginTries>35){const w=$("#loginWait");if(w)w.innerHTML='Google no pudo cargar. Revisa tu conexión o bloqueadores y <a href="cuenta.html">vuelve a intentarlo</a>.';return;}
        return setTimeout(init,300);
      }
      google.accounts.id.initialize({client_id:CLIENT_ID, auto_select:true, callback:r=>{
        const p=parseJwt(r.credential); const cr={token:r.credential,exp:p.exp*1000};
        save("iap_cred",cr); save("iap_user",{email:p.email,name:p.name||p.email,picture:p.picture||""});
        bar.remove(); document.body.classList.remove("is-signing-in"); credP=null; resolve(cr);
      }});
      google.accounts.id.renderButton(document.getElementById("relBtn"),{theme:"outline",size:"large",shape:"pill",locale:"es"});
      if($("#loginWait")) $("#loginWait").textContent="Elige tu Gmail para continuar.";
    };
    init();
  });
  return credP;
}
async function callApi(body){
  const cred = await ensureCred();
  const j = await postJson(API_URL, {...body, idToken:cred.token});
  if(!j.ok && /sesión venció|Inicia sesión/i.test(j.error||"")){ try{ localStorage.removeItem("iap_cred"); }catch{} return callApi(body); }
  return j;
}
/* ---------- código de autenticación (2FA) ---------- */
const totpState = {};
function totpRest(box){
  const st=totpState[box.dataset.totp]||{};
  if(st.rest!==undefined) return st.rest;
  return box.dataset.rest===""||box.dataset.rest===undefined ? null : +box.dataset.rest;
}
async function fetchTotp(box, ask){
  const mail=box.dataset.totp, st=totpState[mail]=totpState[mail]||{};
  if(st.busy) return; st.busy=true; if(ask) st.err="";
  const btn=box.querySelector("[data-ask]"); if(ask){ btn.disabled=true; btn.textContent="Pidiendo…"; }
  try{
    const j=await callApi({action:"totp",v:2,ask:!!ask,correo:mail});
    if(!j.ok){ if(/SESION_2FA/.test(j.error||"")){ st.sesion=0; st.code=""; } else throw new Error(j.error||"Error"); }
    else { st.code=j.code; st.until=Date.now()+j.left*1000; st.rest=j.restantes; document.querySelectorAll("[data-totp]").forEach(b=>{ (totpState[b.dataset.totp]=totpState[b.dataset.totp]||{}).rest=j.restantes; }); st.sesion=j.hasta||(Date.now()+600000); st.err=""; }
  }catch(err){ st.err=err.message; if(ask) st.sesion=0; }
  st.busy=false; renderTotp();
}
function askTotp(box){ return fetchTotp(box,true); }
// "Pedir 2 códigos más": se dan al instante desde la sesión del cliente (los pedidos se comparten entre todas sus cuentas)
let masBusy = false;
async function masCodigos(){
  if(masBusy) return; masBusy = true; renderTotp();
  try{
    const j = await callApi({action:"totp_mas"}); if(!j.ok) throw new Error(j.error||"Error");
    for(const b of document.querySelectorAll("[data-totp]")){ b.dataset.max = j.limite; b.dataset.rest = j.restantes; const st = totpState[b.dataset.totp] = totpState[b.dataset.totp] || {}; st.rest = j.restantes; st.err = ""; }
    toastMsg("Listo ✔ Ya tienes "+j.restantes+" código(s) más para hoy");
  }catch(err){ for(const b of document.querySelectorAll("[data-totp]")){ const st = totpState[b.dataset.totp] = totpState[b.dataset.totp] || {}; st.err = err.message; } }
  masBusy = false; renderTotp();
}
document.addEventListener("click", e=>{ if(e.target.closest("[data-mas]")) masCodigos(); });
function renderTotp(){
  const now=Date.now();
  for(const box of document.querySelectorAll("[data-totp]")){
    const st=totpState[box.dataset.totp]||{}, rest=totpRest(box);
    const active = st.code && st.sesion && st.sesion>now;
    if(active && st.until<=now && !st.busy) fetchTotp(box,false); // el código sigue circulando solo
    box.querySelector(".tview").hidden=!active;
    box.querySelector(".task").hidden=!!active;
    if(active){
      const left=Math.max(0,Math.ceil((st.until-now)/1000));
      box.querySelector(".tcode").textContent=st.code.slice(0,3)+" "+st.code.slice(3);
      box.querySelector(".tcopy").dataset.copy=st.code;
      box.querySelector(".tleft").textContent=left;
      box.querySelector(".tbar").style.width=(left/30*100)+"%";
      const m=Math.max(0,Math.ceil((st.sesion-now)/60000));
      box.querySelector(".tnote").textContent="El código se renueva solo durante "+m+" min más. Después tendrás que volver a pedirlo.";
    } else {
      const btn=box.querySelector("[data-ask]");
      const none = rest!==null && rest<=0;
      btn.disabled=none||!!st.busy;
      btn.textContent=none?"Sin códigos disponibles":"Pedir código de autenticación";
      box.querySelector(".trest").textContent = rest===null ? "" : (none ? "Ya usaste tus "+(box.dataset.max||5)+" pedidos de hoy. Mañana se renuevan." : "Te quedan "+rest+" de "+(box.dataset.max||5)+" pedidos de hoy.");
      const agotado = none || /Ya usaste/.test(st.err||""), mas = box.querySelector(".tmore");
      if(mas){ mas.style.display = agotado ? "inline-block" : "none"; mas.disabled = !!masBusy; mas.textContent = masBusy ? "Pidiendo…" : "➕ Pedir 2 códigos más"; }
      box.querySelector(".tnote").textContent = st.err ? st.err : (none ? "¿Necesitas más hoy? Pide 2 códigos más aquí abajo (hasta 3 veces al día)." : "Al pedirlo se descuenta 1 de tus "+(box.dataset.max||5)+" pedidos de hoy (se renuevan cada día). Luego el código se renueva solo durante 10 minutos.");
    }
  }
}
function refreshTotp(){ renderTotp(); }
function copyText(t){
  const fb=()=>new Promise(r=>{ const a=document.createElement("textarea"); a.value=t; a.setAttribute("readonly",""); a.style.cssText="position:fixed;opacity:0;top:0"; document.body.appendChild(a); a.select(); try{document.execCommand("copy");}catch{} a.remove(); r(); });
  return navigator.clipboard?.writeText ? navigator.clipboard.writeText(t).catch(fb) : fb();
}
const I = {
  mail:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  copy:'<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="3"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
  eye:'<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeoff:'<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.5 7.6C3.9 9.4 2 12 2 12s3.6 6 10 6a9.8 9.8 0 0 0 4-.9"/></svg>',
  ok:'<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>'
};
function message(title, text){
  $("#app").innerHTML = `<div class="msg"><h2>${title}</h2><p>${text}</p><button class="cta" type="button" data-retry>🔄 Reintentar</button> <a class="ghostlink" href="index.html?tienda=1">Ir a la tienda</a></div>`;
}
function confetti(){
  if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  const box=document.createElement("div"); box.className="confetti";
  const cols=["#ef5350","#ff8a80","#12a36b","#fbbf24","#7c4dff"];
  for(let i=0;i<60;i++){const p=document.createElement("i");p.style.left=Math.random()*100+"%";p.style.background=cols[i%5];
    p.style.animationDuration=(2.4+Math.random()*2.4)+"s";p.style.animationDelay=Math.random()+"s";box.appendChild(p);}
  document.body.appendChild(box); setTimeout(()=>box.remove(),6500);
}
/* ---------- productos ---------- */
const APPS=[
  {k:"youtube",n:"YouTube Premium",img:"youtube.webp",url:"https://www.youtube.com/",host:"youtube.com",dur:"3 meses"},
  {k:"davinci",n:"DaVinci Resolve",img:"davinci.webp",url:"https://www.blackmagicdesign.com/products/davinciresolve",host:"DaVinci Resolve en tu PC"},
  {k:"photoshop",n:"Adobe Photoshop",img:"photoshop.webp",url:"https://account.adobe.com/",host:"adobe.com (Creative Cloud en tu PC)"},
  {k:"premiere",n:"Adobe Premiere Pro",img:"premiere.webp",url:"https://account.adobe.com/",host:"adobe.com (Creative Cloud en tu PC)"},
  {k:"xbox",n:"Xbox Game Pass Ultimate",img:"xbox.webp",url:"https://www.xbox.com/es-CO/auth/msa?action=logIn",host:"xbox.com"},
  {k:"canva",n:"Canva",img:"canva.webp",url:"https://www.canva.com/login",host:"canva.com"},
  {k:"duolingo",n:"Duolingo",img:"duolingo.webp",url:"https://www.duolingo.com/log-in",host:"duolingo.com",dur:"12 meses"},
  {k:"claude",n:"Claude Code",img:"claude.webp",url:"https://claude.ai/login",host:"claude.ai",dev:1},
  {k:"gemini",n:"Gemini Pro",img:"gemini.webp",url:"https://gemini.google.com/",host:"gemini.google.com"},
  {k:"flow",n:"Flow",img:"flow.webp",url:"https://labs.google/fx/tools/flow",host:"labs.google/fx/tools/flow"},
  {k:"capcut",n:"CapCut Pro",img:"capcut.webp",url:"https://www.capcut.com/login",host:"capcut.com"},
  {k:"filmora",n:"Filmora",img:"filmora.webp",url:"https://account.wondershare.com/",host:"Wondershare / Filmora"},
  {k:"chatgpt",n:"ChatGPT",img:"chatgpt.webp",dark:true,url:"https://chatgpt.com/auth/login",host:"chatgpt.com"}
];
const appOf=it=>APPS.find(a=>String(it.producto||"").toLowerCase().includes(a.k))||{k:"",n:it.producto||"tu cuenta",url:"",host:""};
let ITEMS = [], tab = "sub", filterQ = "";
function card(it, idx){
  const app=appOf(it), ex=IAPAccountState.isExpired(it), active=IAPAccountState.isActive(it), duration=IAPCatalog.duration({days:Number(it.dias)||30});
  const start = it.inicio ? new Date(it.inicio) : null;
  const end = it.fin ? new Date(it.fin) : null;
  const left = end ? Math.max(0, Math.ceil((end - Date.now())/DAY)) : 30;
  const pct = start && end ? Math.min(100, Math.max(0,(Date.now()-start)/(end-start)*100)) : 0;
  const renew = "index.html?tienda=1#catalogo";
  const prob = "https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent("Hola, tengo un problema con mi cuenta "+it.producto+" ("+it.correo+"). ¿Me ayudan o me dan otra cuenta?");
  const icon = app.img ? `<img src="${app.img}" alt="" style="${app.dark?"background:#000;padding:8px":""}">` : "📦";
  const access = ex ? "" : `
    <div class="access" id="acc${idx}" aria-hidden="true">
      <div class="lbl">${I.mail} Cuenta de acceso</div>
      <div class="field"><code>${esc(it.correo)}</code><button class="ib" data-copy="${esc(it.correo)}" title="Copiar correo" aria-label="Copiar correo de acceso">${I.copy}</button></div>
      <div class="lbl">${I.lock} Contraseña de acceso</div>
      <div class="field"><code class="pw" data-pw="${esc(it.clave)}">••••••••••</code><button class="ib tog" title="Mostrar u ocultar contraseña" aria-label="Mostrar u ocultar contraseña">${I.eye}</button><button class="ib" data-copy="${esc(it.clave)}" title="Copiar contraseña" aria-label="Copiar contraseña de acceso">${I.copy}</button></div>
      ${it.adicional?`<div class="note"><b>Cuenta adicional:</b> vence el mismo día que tu primera cuenta y comparte con ella tus pedidos de código de hoy.</div>`:""}
      ${it.tiene2fa?`<div data-totp="${esc(String(it.correo).toLowerCase())}" data-rest="${it.restantes2fa??''}" data-max="${it.max2fa||2}"><div class="lbl">${I.lock} Código de dos pasos (autenticador)</div>
        <div class="tbox"><div class="tview" hidden><div class="trow"><span class="tcode">--- ---</span><span class="tcnt"><b class="tleft">30</b></span><button class="ib tcopy" data-copy="" title="Copiar código">${I.copy}</button></div><div class="tline"><i class="tbar"></i></div></div>
        <div class="task"><button class="cta tbtn" type="button" data-ask>🔐 Pedir código de autenticación</button> <small class="trest" style="color:var(--mut);margin-left:8px"></small></div></div>
        <p class="tnote"></p><button class="cta tmore" type="button" data-mas style="display:none;margin-top:6px">➕ Pedir 2 códigos más</button></div>`:""}
      <details class="account-help"><summary>Cómo entrar y condiciones de uso</summary><div class="how"><h3>Cómo iniciar sesión</h3>
        <ol><li>Abre ${esc(app.n)}${app.url?` → <a class="l" href="${app.url}" target="_blank" rel="noopener">${esc(app.host||"ir al sitio")}</a>`:""}.</li>
        <li>Copia la <b>cuenta de acceso</b>, pégala y pulsa "Continuar".</li>
        <li>Copia la <b>contraseña</b>, pégala y entra. Si te pide verificación, usa el código de dos pasos o escríbenos.</li></ol></div>
      <div class="note"><b>Importante:</b> no cambies el correo ni la contraseña. ${app.k==="chatgpt"?"Puedes usarla en hasta 2 dispositivos.":app.dev===1?"Úsala en 1 solo dispositivo.":"Consulta los dispositivos permitidos en las condiciones del producto."} Tu plan tiene una duración de <b>${esc(duration)}</b>.</div>
      ${app.k==="chatgpt"?`<details class="note"><summary>¿Te sale el error "model not found" u otro error en ChatGPT?</summary>
        <ol><li>Abre una <b>ventana de incógnito</b> (Ctrl+Shift+N) e inicia sesión en chatgpt.com. Si ahí funciona, el problema es la memoria de tu navegador.</li>
          <li>En tu navegador normal borra las <b>cookies y la caché</b> de chatgpt.com y vuelve a entrar.</li>
          <li>Desactiva extensiones (bloqueadores de anuncios, VPN) o prueba con <b>Google Chrome</b> actualizado.</li>
          <li>Abre un <b>chat nuevo</b> y elige el modelo desde la lista de arriba.</li>
          <li>Si sigue igual, escríbenos por WhatsApp con una captura del error.</li></ol></details>`:""}
      </details>
    </div>`;
  return `<article class="sub-card ${ex?"expired":""}" style="animation-delay:${idx*80}ms" data-s="${esc((it.producto+" "+it.correo).toLowerCase())}">
    <div class="sub-head"><div class="picon">${icon}</div>
      <div class="pname"><h2>${esc(it.producto||app.n)}</h2><small>${esc(duration)} · Cuenta ${idx+1}</small></div>
      <span class="account-status ${active?'active':ex?'ended':'pending'}">${active?'Activa':ex?'Vencida':'Por confirmar'}</span>
    </div>
    <div class="sub-body">
      <div class="account-time"><strong>${ex?'Tu plan terminó':end?left+' '+(left===1?'día restante':'días restantes'):'Revisa tu plan'}</strong><span>${end?'Vence el '+fmt(end):'Sin fecha disponible'}</span></div>
      ${ex?"":`<div class="prog"><i style="width:${pct.toFixed(1)}%"></i></div>`}
      <div class="account-meta"><span>Inicio: ${start?fmt(start):'—'}</span><span>${ex?'Acceso finalizado':end?'Tiempo real · <b data-end="'+esc(it.fin)+'">--</b>':''}</span></div>
      ${ex?"":`<button class="banner" type="button" data-acc="acc${idx}" aria-controls="acc${idx}" aria-expanded="false"><span>Ver datos de acceso</span><span class="chev" aria-hidden="true">⌄</span></button>`}
    </div>
    ${access}
    <div class="foot">${!ex&&app.url?`<a class="account-open" href="${app.url}" target="_blank" rel="noopener">Abrir ${esc(app.n)} ↗</a>`:`<a href="${renew}">Renovar mi plan ↗</a>`}<a href="${prob}" target="_blank" rel="noopener">Soporte</a><a class="buyagain" href="${renew}">Renovar</a></div>
  </article>`;
}
function histHtml(){
  return `<div class="hist"><table><thead><tr><th>Producto</th><th>Cuenta</th><th>Inicio</th><th>Vence</th><th>Plan</th><th>Estado</th></tr></thead><tbody>
    ${ITEMS.map(it=>`<tr><td><b>${esc(it.producto)}</b></td><td style="word-break:break-all">${esc(it.correo)}</td><td>${it.inicio?fmt(new Date(it.inicio)):"—"}</td><td>${it.fin?fmt(new Date(it.fin)):"—"}</td><td>${it.dias||30} días</td><td><span class="st ${IAPAccountState.isExpired(it)?"e":"a"}">${IAPAccountState.isExpired(it)?"Expirado":"Activo"}</span></td></tr>`).join("")}</tbody></table></div>`;
}
function addBox(first){
  return `<div class="addbox" id="addbox"><span class="eyebrow">ACTIVACIÓN DE ACCESO</span><h3>${first?"Tu primer acceso empieza aquí":"¿Tienes otro código?"}</h3>
    <p>Pega tu código o el enlace que recibiste. Quedará asociado a tu Gmail actual.</p>
    <form class="addrow" id="addForm" novalidate><label class="sr-only" for="addCode">Código de activación</label><input id="addCode" placeholder="IAP-AB12-CD34" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="200" aria-describedby="addErr" required><button class="cta" type="submit">Revisar código →</button></form>
    <div class="adderr" id="addErr" role="alert" hidden></div>
    <button type="button" class="guide-video-btn" data-guide-video>▶ Ver el video guía · 3 min</button>
    <a class="activation-shop" href="index.html?tienda=1#planes-chatgpt">¿Aún no tienes uno? Elige tu plan de ChatGPT →</a></div>`;
}
let activationBusy=false,activationDraft="";
async function confirmActivation(code){
  await ensureCred();
  return new Promise(resolve=>{
    const d=document.createElement("dialog"),u=load("iap_user")||{};
    d.className="activation-review";
    d.setAttribute("aria-labelledby","activateReviewTitle");
    d.innerHTML=`<form method="dialog"><span class="eyebrow">PASO 3 DE 3 · REVISA TU ACTIVACIÓN</span><h2 id="activateReviewTitle">Tu acceso, en tu cuenta.</h2><p>Este código es de un solo uso. Confirma que estás usando el Gmail del cliente que lo va a activar.</p><dl><div><dt>Código de activación</dt><dd>${esc(code)}</dd></div><div><dt>Cuenta de Google</dt><dd>${esc(u.email||"Tu cuenta de Google actual")}</dd></div></dl><small>Al activarlo, encontrarás los datos de acceso y las instrucciones en Mi cuenta.</small><div class="review-actions"><button class="btn-review secondary" value="cancel">Volver</button><button class="btn-review" value="activate">Activar mi acceso</button></div><a class="switch-google" href="#" id="switchActivationUser">Usar otro Gmail</a><button type="button" class="guide-video-btn" data-guide-video>▶ ¿Dudas? Mira el video guía</button></form>`;
    d.addEventListener("close",()=>{const ok=d.returnValue==="activate";d.remove();resolve(ok);},{once:true});
    d.addEventListener("cancel",e=>{e.preventDefault();d.close("cancel");});
    document.body.appendChild(d);
    d.querySelector("#switchActivationUser").onclick=e=>{e.preventDefault();save("iap_cred",null);save("iap_user",null);d.close("cancel");location.href="cuenta.html?codigo="+encodeURIComponent(code);};
    d.showModal();d.querySelector('[value="activate"]').focus();
  });
}
function bindAdd(){
  const f=$("#addForm");if(!f)return;
  const input=$("#addCode"),err=$("#addErr");
  const pending=load("iap_pending_code");if(pending||activationDraft)input.value=pending||activationDraft;
  input.oninput=()=>{err.hidden=true;input.removeAttribute("aria-invalid");};
  f.onsubmit=async e=>{
    e.preventDefault();if(activationBusy)return;
    const p=IAPActivation.parse(input.value);err.hidden=true;
    if(p.error){err.textContent=p.error;err.hidden=false;input.setAttribute("aria-invalid","true");input.focus();return;}
    input.value=p.code;const btn=f.querySelector("button");activationBusy=true;btn.disabled=true;
    try{
      if(!await confirmActivation(p.code))return;
      btn.textContent="Activando tu acceso…";
      const j=await callApi({action:"redeem",code:p.code});if(!j.ok)throw new Error(j.error||"No se pudo activar el código.");
      save("iap_pending_code",null);activationDraft="";sessionStorage.removeItem("iap_conf");FLASH={ok:true,t:"Acceso activado. Ya puedes ver tus datos y entrar a tu cuenta."};WELCOME_CODE=p.code;await loadAll();
    }catch(ex){err.textContent=ex.message;err.hidden=false;input.focus();}
    finally{activationBusy=false;btn.disabled=false;btn.textContent="Revisar código →";}
  };
}

function warnHtml(){
  const out=[];
  ITEMS.forEach(it=>{
    const app=appOf(it), name=app.n==="tu cuenta"?it.producto:app.n, end=it.fin?new Date(it.fin):null;
    const link="index.html?tienda=1#catalogo";
    if(IAPAccountState.isExpired(it)) out.push(`<div class="warn bad"><span>⛔ Tu plan de <b>${esc(name)}</b> ya venció.</span><a href="${link}" target="_blank" rel="noopener">Renovar</a></div>`);
    else if(end){ const d=Math.ceil((end-Date.now())/DAY); if(d<=5) out.push(`<div class="warn"><span>⏰ Tu plan de <b>${esc(name)}</b> vence ${d<=0?"hoy":d===1?"mañana":"en "+d+" días"}.</span><a href="${link}" target="_blank" rel="noopener">Renovar</a></div>`); }
  });
  return out.slice(0,3).join("");
}
function renderMain(){
  document.querySelectorAll('.pw').forEach(hidePassword);
  const act = ITEMS.filter(i=>IAPAccountState.isActive(i)).length;
  $("#app").innerHTML = `
    ${warnHtml()}
    <section class="account-overview"><div><span class="account-eyebrow">TU ESPACIO · IA PLUS COLOMBIA</span><h1>Tus cuentas, a la mano.</h1><p>${ITEMS.length} ${ITEMS.length===1?"cuenta":"cuentas"} · ${act} ${act===1?"plan vigente":"planes vigentes"}</p></div><div class="account-overview-actions"><a href="#addbox">Activar otro código <span aria-hidden="true">＋</span></a>${act?'<button class="guiabtn" id="guiaBtn" type="button">Guía paso a paso ↗</button>':""}</div></section>
    <div class="tabs" role="tablist"><button data-tab="sub" class="${tab==="sub"?"on":""}" role="tab" aria-selected="${tab==="sub"}">Suscripción</button><button data-tab="hist" class="${tab==="hist"?"on":""}" role="tab" aria-selected="${tab==="hist"}">Historial de pedidos</button></div>
    <div id="view">${tab==="sub"?`<div class="grid" id="grid">${ITEMS.map(card).join("")}<div class="nores" id="nores" hidden>No hay suscripciones que coincidan.</div></div>`:histHtml()}</div>
    ${addBox(false)}`;
  bindAdd(); applyFilter(); tick(); refreshTotp(); buildMenu();
  const gb = $("#guiaBtn"); if(gb) gb.onclick = ()=>guia();
  // The guide opens on request, without covering the customer's accounts on arrival.
}
/* ---------- Guía paso a paso ---------- */
function guia(){
  const card = [...document.querySelectorAll(".sub-card:not(.expired)")][0]; if(!card) return;
  setAccess(card.querySelector("[data-acc]"),true);
  const help=card.querySelector(".account-help");if(help)help.open=true;
  const fields = card.querySelectorAll(".access .field"), ask = card.querySelector("[data-ask]"), how = card.querySelector(".how");
  const pasos = [
    {el:card, t:"¡Tu plan está activo! 🎉", d:"Te muestro en 4 pasos cómo entrar a tu cuenta. Tarda menos de un minuto."},
    {el:fields[0], t:"1️⃣ Copia el correo", d:"Toca el botón de copiar al lado del correo. Ese es el usuario para iniciar sesión."},
    {el:fields[1], t:"2️⃣ Copia la contraseña", d:"Toca copiar al lado de la contraseña. No cambies los datos de acceso entregados por la tienda."},
    ask ? {el:ask.closest("[data-totp]")||ask, t:"3️⃣ Código de verificación", d:"Si al entrar te pide un código de 6 dígitos, toca aquí y cópialo rápido: cambia cada 30 segundos."} : null,
    {el:how, t:ask?"4️⃣ Entra y pega los datos":"3️⃣ Entra y pega los datos", d:"Abre la página de tu herramienta desde este enlace, pega el correo y la contraseña, ¡y listo! 🚀"},
  ].filter(p=>p && p.el);
  let i = 0;
  const capa = document.createElement("div"); capa.className = "guia-capa"; document.body.appendChild(capa);
  const caja = document.createElement("div"); caja.className = "guia-caja"; caja.setAttribute("role","dialog"); caja.setAttribute("aria-live","polite"); document.body.appendChild(caja);
  const limpiar = ()=>document.querySelectorAll(".guia-hl").forEach(x=>x.classList.remove("guia-hl"));
  const fin = ()=>{ limpiar(); capa.remove(); caja.remove(); try{ localStorage.setItem("iap_guia_v1","1"); }catch{} document.removeEventListener("keydown", tecla); };
  const ver = ()=>{
    limpiar(); const p = pasos[i]; p.el.classList.add("guia-hl");
    p.el.scrollIntoView({behavior:"smooth", block:"center"});
    caja.innerHTML = `<div class="guia-dots">${pasos.map((_,k)=>`<i class="${k===i?"on":k<i?"ya":""}"></i>`).join("")}</div>
      <h3>${p.t}</h3><p>${p.d}</p>
      <div class="guia-acts"><button type="button" class="guia-skip">Saltar</button><span></span>${i?'<button type="button" class="guia-back">Atrás</button>':""}<button type="button" class="cta guia-next">${i===pasos.length-1?"¡Entendido!":"Siguiente"}</button></div>`;
    caja.classList.remove("in"); void caja.offsetWidth; caja.classList.add("in");
    caja.querySelector(".guia-skip").onclick = fin;
    caja.querySelector(".guia-next").onclick = ()=>{ if(i===pasos.length-1) fin(); else { i++; ver(); } };
    const b = caja.querySelector(".guia-back"); if(b) b.onclick = ()=>{ i--; ver(); };
    caja.querySelector(".guia-next").focus();
  };
  const tecla = e=>{ if(e.key==="Escape") fin(); };
  document.addEventListener("keydown", tecla); capa.onclick = fin;
  ver();
}
function applyFilter(){
  const g=$("#grid"); if(!g) return; let n=0;
  g.querySelectorAll(".sub-card").forEach(c=>{ const ok=!filterQ||c.dataset.s.includes(filterQ); c.style.display=ok?"":"none"; if(ok) n++; });
  $("#nores").hidden = n>0;
}
function tick(){
  const expiredNow=ITEMS.filter(i=>!i.vencida&&IAPAccountState.isExpired(i));
  if(expiredNow.length){expiredNow.forEach(i=>i.vencida=true);buildMenu();renderMain();return;}
  document.querySelectorAll("[data-end]").forEach(el=>{
    const e = el.dataset.end; if(!e) return;
    const ms = new Date(e) - Date.now(); if(ms<=0){ el.textContent="0 días"; return; }
    const d=Math.floor(ms/DAY), h=Math.floor(ms%DAY/3600000), m=Math.floor(ms%3600000/60000), s=Math.floor(ms%60000/1000);
    el.textContent = d+" d "+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  });
}
/* ---------- menú de usuario ---------- */
function buildMenu(){
  const u=load("iap_user")||{}, em=String(u.email||""),act=ITEMS.filter(i=>IAPAccountState.isActive(i)).length;
  const portrait=u.picture?`<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">`:`<span class="avatar-initial">${esc((u.name||em||"?")[0].toUpperCase())}</span>`;
  const av=$("#avBtn");av.innerHTML=portrait;av.classList.toggle("co-member-ring",act>0);av.setAttribute("aria-label",act?`Menú de usuario · ${act} planes activos · Colombia`:"Menú de usuario");
  $("#menu").innerHTML=`<div class="member-profile"><div class="member-avatar ${act?'co-member-ring':''}">${portrait}</div><div><div class="who">${esc(u.name||"Mi cuenta")}</div><div class="sub">${esc(em)}</div><span class="member-level">${act?'🇨🇴 Miembro activo':'Mi cuenta'}</span></div></div><div class="saved">${act} ${act===1?'plan vigente':'planes vigentes'} en IA Plus</div><hr>
    <button class="mi on" data-go="sub"><span class="ic">🔑</span>Mi suscripción</button>
    <button class="mi" data-go="hist"><span class="ic">🧾</span>Pedidos históricos</button>
    <a href="index.html?tienda=1#catalogo"><span class="ic">🛍️</span>Comprar más cuentas</a>
    <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener"><span class="ic">🎧</span>Soporte</a>
    <a href="index.html?tienda=1#faq"><span class="ic">📖</span>Centro de ayuda</a>
    <button class="mi" data-install><span class="ic">📲</span>Instalar la app</button>
    ${IS_ADMIN?`<a href="admin.html"><span class="ic">🛠️</span>Panel admin</a>`:""}
    <hr><button class="mi" id="logout"><span class="ic">🚪</span>Cerrar sesión</button>`;
}
const passwordTimers=new Map();
function hidePassword(pw){clearTimeout(passwordTimers.get(pw));passwordTimers.delete(pw);pw.textContent="••••••••••";const b=pw.parentElement.querySelector(".tog");if(b){b.innerHTML=I.eye;b.setAttribute("aria-pressed","false");}}
function setAccess(button,open){if(!button)return;document.querySelectorAll("[data-acc]").forEach(b=>{const panel=document.getElementById(b.dataset.acc),on=b===button&&open;if(!panel)return;panel.classList.toggle("on",on);panel.setAttribute("aria-hidden",String(!on));b.setAttribute("aria-expanded",String(on));b.querySelector("span").textContent=on?"Ocultar datos de acceso":"Ver datos de acceso";if(!on)panel.querySelectorAll(".pw").forEach(hidePassword);});}
document.addEventListener("visibilitychange",()=>{if(document.hidden)document.querySelectorAll(".pw").forEach(hidePassword);});
document.addEventListener('iap:open-access',e=>{
  if(tab!=='sub'){tab='sub';renderMain();}
  const detail=e.detail||{};
  let index=ITEMS.findIndex(it=>IAPAccountState.isActive(it)&&((detail.codigo&&it.codigo===detail.codigo)||(detail.correo&&it.correo===detail.correo)));
  if(index<0)index=ITEMS.findIndex(it=>IAPAccountState.isActive(it));
  const panel=document.getElementById('acc'+index),button=document.querySelector('[data-acc="acc'+index+'"]');
  if(!panel||!button)return;
  filterQ='';const search=$('#q');if(search)search.value='';applyFilter();
  e.preventDefault();setAccess(button,true);button.focus({preventScroll:true});panel.closest('.sub-card')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
});
document.addEventListener("click", e=>{
  if(!e.target.closest('#menu,#avBtn')){const menu=$('#menu');if(menu)menu.classList.remove('on');$('#avBtn')?.setAttribute('aria-expanded','false');}
  const c = e.target.closest("[data-copy]");
  if(c){ copyText(c.dataset.copy).then(()=>{ const t=c.innerHTML; c.classList.add("ok"); c.innerHTML=I.ok; setTimeout(()=>{c.classList.remove("ok");c.innerHTML=t;},1500); const x=document.createElement("div"); x.className="toastc"; x.textContent="Copiado ✔"; document.body.appendChild(x); setTimeout(()=>x.remove(),1300); }); return; }
  if(e.target.closest("[data-retry]")){ $("#app").innerHTML='<div class="skel"><i></i><i></i><i></i></div>'; loadAll(); return; }
  const ask = e.target.closest("[data-ask]");
  if(ask){ askTotp(ask.closest("[data-totp]")); return; }
  const g = e.target.closest(".tog");
  if(g){const pw=g.parentElement.querySelector(".pw"),show=pw.textContent.includes("•");hidePassword(pw);if(show){pw.textContent=pw.dataset.pw;g.innerHTML=I.eyeoff;g.setAttribute("aria-pressed","true");passwordTimers.set(pw,setTimeout(()=>hidePassword(pw),30000));}return;}
  const ba = e.target.closest("[data-acc]");
  if(ba){setAccess(ba,ba.getAttribute("aria-expanded")!=="true");return;}
  const tb = e.target.closest("[data-tab]");
  if(tb){ tab=tb.dataset.tab; renderMain(); return; }
  const go = e.target.closest("[data-go]");
  if(go){ tab=go.dataset.go; $("#menu").classList.remove("on"); renderMain(); window.scrollTo({top:0,behavior:"smooth"}); return; }
  if(e.target.closest("#logout")){ try{ ["iap_user","iap_cred","iap_has","iap_admin","iap_pwa_seen"].forEach(k=>localStorage.removeItem(k)); sessionStorage.clear(); }catch{} try{ google.accounts.id.disableAutoSelect(); }catch{} location.href="index.html?tienda=1"; return; }
  if(e.target.closest("#avBtn")){ const open=$("#menu").classList.toggle("on");$('#avBtn').setAttribute('aria-expanded',String(open));return; }
  if(!e.target.closest("#menu")) $("#menu").classList.remove("on");
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape"){ $("#menu").classList.remove("on");$('#avBtn').setAttribute('aria-expanded','false');document.querySelectorAll('.pw').forEach(hidePassword);} });
/* ---------- actividad: cada movimiento queda registrado con su hora (lo ve el administrador en el panel) ---------- */
document.addEventListener("click", e=>{
  if(!window.iapTrack) return;
  const card = e.target.closest(".sub-card");
  const det = card ? [card.querySelector(".pname h2")?.textContent, card.querySelector(".field code")?.textContent].filter(Boolean).join(" · ") : "";
  const c = e.target.closest("[data-copy]");
  if(c){ iapTrack(c.classList.contains("tcopy") ? "copio_2fa" : c.parentElement.querySelector(".pw") ? "copio_clave" : "copio_correo", det); return; }
  const g = e.target.closest(".tog");
  if(g){ const pw = g.parentElement.querySelector(".pw"); if(pw && pw.textContent.includes("•")) iapTrack("vio_clave", det); return; }
  const ba = e.target.closest("[data-acc]");
  if(ba){ const p = document.getElementById(ba.dataset.acc); if(p && !p.classList.contains("on")) iapTrack("ver_cuenta", det); return; }
  if(e.target.closest("#logout")){ iapTrack("salir"); return; }
  if(e.target.closest("[data-install]")){ iapTrack("instalar"); return; }
  const a = e.target.closest("a[href]"); if(!a) return;
  if(a.classList.contains("buyagain")) iapTrack("renovar", det);
  else if(/wa.me/.test(a.href)) iapTrack("soporte", det);
  else if(/#faq/.test(a.href)) iapTrack("ayuda", det);
  else if(/#catalogo/.test(a.href)) iapTrack("comprar");
}, true);
$("#q").addEventListener("input", e=>{ filterQ=e.target.value.trim().toLowerCase(); if(tab!=="sub"){ tab="sub"; renderMain(); } applyFilter(); });
let timer=null;
/* ---------- enlace de activación: cuenta.html?codigo=IAP-XXXX-XXXX ---------- */
(function(){ try{ const p=new URLSearchParams(location.search); const k=IAPActivation.parse(p.get("codigo")||p.get("code")||""); if(k.code){ save("iap_pending_code",k.code); history.replaceState(null,"",location.pathname); } }catch{} })();
let FLASH=null;
let WELCOME_CODE=null; // código recién activado: al cargar la cuenta se muestra la bienvenida una vez
function showFlash(){ if(!FLASH) return; const f=FLASH; FLASH=null; toastMsg(f.t, f.ok?4500:7000); if(f.ok){ if(window.IAPCelebrate){ window.IAPActivationWelcome?.hideForSuccess(); }else{ window.IAPActivationWelcome?.showSuccess(); } }else{ const a=$("#app"); if(a) a.insertAdjacentHTML("afterbegin",`<div class="warn bad"><span>⚠️ ${esc(f.t)}</span><a href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, mi enlace de activación no funcionó")}" target="_blank" rel="noopener">Pedir ayuda</a></div>`); } }
async function loadAll(){
  const pc = load("iap_pending_code");
  if(pc && !activationBusy){
    activationBusy=true;
    try{
      if(await confirmActivation(pc)){
        const r=await callApi({action:"redeem",code:pc});
        if(r.ok){save("iap_pending_code",null);FLASH={ok:true,t:"Acceso activado. Tus datos están listos en Mi cuenta."};sessionStorage.removeItem("iap_conf");WELCOME_CODE=pc;}
        else{activationDraft=pc;save("iap_pending_code",null);FLASH={ok:false,t:r.error||"No pudimos activar el código. Revísalo o pide ayuda."};}
      }else{activationDraft=pc;save("iap_pending_code",null);}
    }catch(e){FLASH={ok:false,t:e.message||"La conexión se interrumpió. Consulta tus accesos antes de volver a intentarlo."};}
    finally{activationBusy=false;}
  }
  try{
    const j = await callApi({action:"list"}); if(!j.ok) throw new Error(j.error||"Error");
    ITEMS = j.items; IS_ADMIN = !!j.admin; save("iap_admin", IS_ADMIN); save("iap_has", ITEMS.length>0); buildMenu();
    if(!ITEMS.length){ $("#app").innerHTML = `<div class="ttl"><h1><em>Mi suscripción</em> (0)</h1><span class="tag">IA Plus</span></div><p style="color:var(--mut);font-weight:700;margin:18px 0 0">Aún no tienes suscripciones activas.</p>${addBox(true)}`; bindAdd(); showFlash(); if(WELCOME_CODE){ WELCOME_CODE=null; window.IAPCelebrate?.show(null); } return; }
    renderMain(); showFlash();
    if(WELCOME_CODE){ const c=WELCOME_CODE; WELCOME_CODE=null; window.IAPCelebrate?.show(ITEMS.find(i=>i.codigo===c)||ITEMS.find(i=>!i.vencida)||null); }
    if(!timer) timer=setInterval(()=>{if(!document.hidden){tick();refreshTotp();}},1000);
    if(ITEMS.some(i=>IAPAccountState.isActive(i)) && !sessionStorage.getItem("iap_conf")){ sessionStorage.setItem("iap_conf","1"); confetti(); }
  }catch(err){ message("No pudimos cargar tu cuenta", /fetch|network|load failed/i.test(err.message)?"Parece que no hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.":esc(err.message)); }
}
loadAll();
(function(){
  const link="https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent("Hola, necesito ayuda con mi cuenta");
  const w=$("#bnWa"); if(w) w.href=link; const t=$("#topWa"); if(t) t.href=link;
  const add=$("#bnTop");
  if(add) add.addEventListener("click",e=>{ e.preventDefault(); const b=$("#addbox"); if(b){ b.scrollIntoView({behavior:"smooth",block:"center"}); setTimeout(()=>{ const i=$("#addCode"); if(i) i.focus(); },500); } });
})();

/* sombra del encabezado al desplazarse */
(function(){const h=document.querySelector(".nav,.top");if(!h)return;const f=()=>h.classList.toggle("scrolled",window.scrollY>8);addEventListener("scroll",f,{passive:true});f();})();

addEventListener("offline",()=>toastMsg("Sin internet. Revisa tu conexión."));
addEventListener("online",()=>toastMsg("Conexión recuperada ✔"));
function toastMsg(t,ms){ const x=document.createElement("div"); x.className="toastc"; x.textContent=t; document.body.appendChild(x); setTimeout(()=>x.remove(),ms||2600); }
