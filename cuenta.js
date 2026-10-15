const API_URL = "https://script.google.com/macros/s/AKfycbyIINkQAuYouCXVr722gi_8K1dHPLeF6N5XlmzHgCRA0ETF4cBc-VpIw0933mz1lFg8qA/exec";
const WHATSAPP = "573102035327";
const DAY = 86400000;
const CLIENT_ID = "912360874722-idm6s6ujebsi7bbvmduq7ql88efb9uq9.apps.googleusercontent.com";
let IS_ADMIN = false; // lo informa el servidor
const $ = s => document.querySelector(s);
const esc = s => String(s??"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const save = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const fmt = d => d.toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"});
const fmtT = d => d.toLocaleDateString("es-CO",{day:"2-digit",month:"2-digit",year:"numeric"})+", "+d.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",hour12:false});
function parseJwt(t){ const b=t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"); return JSON.parse(decodeURIComponent(atob(b).split("").map(c=>"%"+("00"+c.charCodeAt(0).toString(16)).slice(-2)).join(""))); }
let credP = null;
function ensureCred(){
  const c = load("iap_cred");
  if(c && c.exp > Date.now()+30000) return Promise.resolve(c);
  if(credP) return credP;
  credP = new Promise(resolve=>{
    let bar = document.getElementById("relogin");
    if(!bar){ bar = document.createElement("div"); bar.id="relogin";
      bar.style.cssText="position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));max-width:460px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 16px;box-shadow:0 12px 40px rgba(20,40,90,.25);z-index:60;text-align:center";
      bar.innerHTML='<div style="font-weight:800;margin-bottom:8px">Confirma tu cuenta para continuar</div><div id="relBtn" style="display:flex;justify-content:center"></div>';
      document.body.appendChild(bar); }
    const init = () => {
      if(!window.google?.accounts?.id){ return setTimeout(init,300); }
      google.accounts.id.initialize({client_id:CLIENT_ID, auto_select:true, callback:r=>{
        const p=parseJwt(r.credential); const cr={token:r.credential,exp:p.exp*1000};
        save("iap_cred",cr); save("iap_user",{email:p.email,name:p.name||p.email,picture:p.picture||""});
        bar.remove(); credP=null; resolve(cr);
      }});
      google.accounts.id.renderButton(document.getElementById("relBtn"),{theme:"outline",size:"large",shape:"pill",locale:"es"});
      try{ google.accounts.id.prompt(); }catch{}
    };
    init();
  });
  return credP;
}
async function callApi(body){
  const cred = await ensureCred();
  const r = await fetch(API_URL,{method:"POST",body:JSON.stringify({...body, idToken:cred.token})});
  const j = await r.json();
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
      box.querySelector(".tnote").textContent = st.err ? st.err : (none ? "Si necesitas ayuda, escríbenos por WhatsApp." : "Al pedirlo se descuenta 1 de tus "+(box.dataset.max||5)+" pedidos de hoy (se renuevan cada día). Luego el código se renueva solo durante 10 minutos.");
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
  $("#app").innerHTML = `<div class="msg"><h2>${title}</h2><p>${text}</p><a class="cta" href="index.html?tienda=1">Ir a la tienda</a></div>`;
}
function confetti(){
  const box=document.createElement("div"); box.className="confetti";
  const cols=["#ef5350","#ff8a80","#12a36b","#fbbf24","#7c4dff"];
  for(let i=0;i<60;i++){const p=document.createElement("i");p.style.left=Math.random()*100+"%";p.style.background=cols[i%5];
    p.style.animationDuration=(2.4+Math.random()*2.4)+"s";p.style.animationDelay=Math.random()+"s";box.appendChild(p);}
  document.body.appendChild(box); setTimeout(()=>box.remove(),6500);
}
/* ---------- productos ---------- */
const APPS=[
  {k:"youtube",n:"YouTube Premium",img:"youtube.png",url:"https://www.youtube.com/",host:"youtube.com",dur:"3 meses"},
  {k:"davinci",n:"DaVinci Resolve",img:"davinci.png",url:"https://www.blackmagicdesign.com/products/davinciresolve",host:"DaVinci Resolve en tu PC"},
  {k:"photoshop",n:"Adobe Photoshop",img:"photoshop.png",url:"https://account.adobe.com/",host:"adobe.com (Creative Cloud en tu PC)"},
  {k:"premiere",n:"Adobe Premiere Pro",img:"premiere.png",url:"https://account.adobe.com/",host:"adobe.com (Creative Cloud en tu PC)"},
  {k:"xbox",n:"Xbox Game Pass Ultimate",img:"xbox.png",url:"https://www.xbox.com/es-CO/auth/msa?action=logIn",host:"xbox.com"},
  {k:"canva",n:"Canva",img:"canva.png",url:"https://www.canva.com/login",host:"canva.com"},
  {k:"duolingo",n:"Duolingo",img:"duolingo.png",url:"https://www.duolingo.com/log-in",host:"duolingo.com",dur:"12 meses"},
  {k:"claude",n:"Claude Code",img:"claude.png",url:"https://claude.ai/login",host:"claude.ai",dev:1},
  {k:"gemini",n:"Gemini Pro",img:"gemini.png",url:"https://gemini.google.com/",host:"gemini.google.com"},
  {k:"flow",n:"Flow",img:"flow.png",url:"https://labs.google/fx/tools/flow",host:"labs.google/fx/tools/flow"},
  {k:"capcut",n:"CapCut Pro",img:"capcut.png",url:"https://www.capcut.com/login",host:"capcut.com"},
  {k:"filmora",n:"Filmora",img:"filmora.png",url:"https://account.wondershare.com/",host:"Wondershare / Filmora"},
  {k:"chatgpt",n:"ChatGPT",img:"chatgpt.png",dark:true,url:"https://chatgpt.com/auth/login",host:"chatgpt.com"}
];
const appOf=it=>APPS.find(a=>String(it.producto||"").toLowerCase().includes(a.k))||{k:"",n:it.producto||"tu cuenta",url:"",host:""};
let ITEMS = [], tab = "sub", filterQ = "";
function card(it, idx){
  const app=appOf(it), ex=it.vencida;
  const start = it.inicio ? new Date(it.inicio) : null;
  const end = it.fin ? new Date(it.fin) : null;
  const left = end ? Math.max(0, Math.ceil((end - Date.now())/DAY)) : 30;
  const pct = start && end ? Math.min(100, Math.max(0,(Date.now()-start)/(end-start)*100)) : 0;
  const renew = "https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent("Hola, quiero renovar mi "+it.producto+" ("+it.correo+")");
  const prob = "https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent("Hola, tengo un problema con mi cuenta "+it.producto+" ("+it.correo+"). ¿Me ayudan o me dan otra cuenta?");
  const icon = app.img ? `<img src="${app.img}" alt="" style="${app.dark?"background:#000;padding:8px":""}">` : "📦";
  const access = ex ? "" : `
    <div class="access on" id="acc${idx}">
      <div class="lbl">${I.mail} Cuenta de acceso</div>
      <div class="field"><code>${esc(it.correo)}</code><button class="ib" data-copy="${esc(it.correo)}" title="Copiar">${I.copy}</button></div>
      <div class="lbl">${I.lock} Contraseña de acceso</div>
      <div class="field"><code class="pw" data-pw="${esc(it.clave)}">${esc(it.clave)}</code><button class="ib tog" title="Mostrar u ocultar">${I.eyeoff}</button><button class="ib" data-copy="${esc(it.clave)}" title="Copiar">${I.copy}</button></div>
      ${it.adicional?`<div class="note"><b>Cuenta adicional:</b> vence el mismo día que tu primera cuenta y comparte con ella tus pedidos de código de hoy.</div>`:""}
      ${it.tiene2fa?`<div data-totp="${esc(String(it.correo).toLowerCase())}" data-rest="${it.restantes2fa??''}" data-max="${it.max2fa||5}"><div class="lbl">${I.lock} Código de dos pasos (autenticador)</div>
        <div class="tbox"><div class="tview" hidden><div class="trow"><span class="tcode">--- ---</span><span class="tcnt"><b class="tleft">30</b></span><button class="ib tcopy" data-copy="" title="Copiar código">${I.copy}</button></div><div class="tline"><i class="tbar"></i></div></div>
        <div class="task"><button class="cta tbtn" type="button" data-ask>Pedir código de autenticación</button> <small class="trest" style="color:var(--mut);margin-left:8px"></small></div></div>
        <p class="tnote"></p></div>`:""}
      <div class="how"><h3>Cómo iniciar sesión</h3>
        <ol><li>Abre ${esc(app.n)}${app.url?` → <a class="l" href="${app.url}" target="_blank" rel="noopener">${esc(app.host||"ir al sitio")}</a>`:""}.</li>
        <li>Copia la <b>cuenta de acceso</b>, pégala y pulsa "Continuar".</li>
        <li>Copia la <b>contraseña</b>, pégala y entra. Si te pide verificación, usa el código de dos pasos o escríbenos.</li></ol></div>
      <div class="note"><b>Importante:</b> no cambies el correo ni la contraseña. ${app.dev===1?"Úsala en 1 solo dispositivo":"Puedes usarla en hasta 2 dispositivos"} y tiene acceso por ${app.dur||"1 mes"}.</div>
      ${app.k==="chatgpt"?`<details class="note"><summary>¿Te sale el error "model not found" u otro error en ChatGPT?</summary>
        <ol><li>Abre una <b>ventana de incógnito</b> (Ctrl+Shift+N) e inicia sesión en chatgpt.com. Si ahí funciona, el problema es la memoria de tu navegador.</li>
          <li>En tu navegador normal borra las <b>cookies y la caché</b> de chatgpt.com y vuelve a entrar.</li>
          <li>Desactiva extensiones (bloqueadores de anuncios, VPN) o prueba con <b>Google Chrome</b> actualizado.</li>
          <li>Abre un <b>chat nuevo</b> y elige el modelo desde la lista de arriba.</li>
          <li>Si sigue igual, escríbenos por WhatsApp con una captura del error.</li></ol></details>`:""}
    </div>`;
  return `<article class="sub-card ${ex?"expired":""}" style="animation-delay:${idx*80}ms" data-s="${esc((it.producto+" "+it.correo).toLowerCase())}">
    <div class="sub-head"><div class="picon">${icon}</div>
      <div class="pname"><h2>${esc(app.n==="tu cuenta"?it.producto:app.n)}</h2><small>Plan de ${it.dias||30} días · ${esc(it.correo)}</small></div>
      <a class="buyagain" href="${renew}" target="_blank" rel="noopener">${ex?"Renovar":"Comprar otra vez"}</a></div>
    <div class="sub-body">
      ${ex?"":`<button class="banner" type="button" data-acc="acc${idx}" aria-expanded="true"><span>🔑 Mis datos de acceso · <b data-end="${it.fin||""}">--</b></span><span class="chev">⌃</span></button>`}
      <div class="rows">
        ${ex?`<div class="stamp">EXPIRADO</div>`:`<div class="stamp okst">ACTIVO<br><small style="font-size:15px">${left} ${left===1?"día":"días"}</small></div>`}
        <div class="rw"><span>Tiempo de inicio</span><span>${start?fmtT(start):"—"}</span></div>
        <div class="rw"><span>Expira el tiempo</span><span>${end?fmtT(end):"—"}</span></div>
      </div>
      ${ex?"":`<div class="prog"><i style="width:${pct.toFixed(1)}%"></i></div>`}
    </div>
    ${access}
    <div class="foot"><a href="index.html?tienda=1#faq"><span class="q">?</span> Ayuda</a><a href="${prob}" target="_blank" rel="noopener"><span class="q">!</span> Soporte</a></div>
  </article>`;
}
function histHtml(){
  return `<div class="hist"><table><thead><tr><th>Producto</th><th>Cuenta</th><th>Inicio</th><th>Vence</th><th>Plan</th><th>Estado</th></tr></thead><tbody>
    ${ITEMS.map(it=>`<tr><td><b>${esc(it.producto)}</b></td><td style="word-break:break-all">${esc(it.correo)}</td><td>${it.inicio?fmt(new Date(it.inicio)):"—"}</td><td>${it.fin?fmt(new Date(it.fin)):"—"}</td><td>${it.dias||30} días</td><td><span class="st ${it.vencida?"e":"a"}">${it.vencida?"Expirado":"Activo"}</span></td></tr>`).join("")}</tbody></table></div>`;
}
function addBox(first){
  return `<div class="addbox" id="addbox"><h3>➕ ${first?"Desbloquea tu primera suscripción":"Agregar otra suscripción"}</h3>
    <p>${first?"Escribe el código que te enviamos por WhatsApp.":"¿Compraste otra cuenta? Escribe aquí su código de activación."}</p>
    <form class="addrow" id="addForm"><input id="addCode" placeholder="Ej: IAP-AB12-CD34" autocomplete="off" maxlength="40"><button class="cta" type="submit">Desbloquear</button></form>
    <div class="adderr" id="addErr" hidden></div>
    <p style="margin:14px 0 0"><a href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, quiero comprar otra cuenta")}" target="_blank" rel="noopener" style="color:var(--red);font-weight:800">¿No tienes código? Cómpralo por WhatsApp →</a></p></div>`;
}
function bindAdd(){
  const f=$("#addForm"); if(!f) return;
  f.onsubmit=async e=>{
    e.preventDefault(); const btn=f.querySelector("button"), err=$("#addErr"); err.hidden=true; btn.disabled=true; btn.textContent="Verificando…";
    try{
      const j=await callApi({action:"redeem",code:$("#addCode").value}); if(!j.ok) throw new Error(j.error||"Error");
      sessionStorage.removeItem("iap_conf"); await loadAll();
    }catch(ex){ err.textContent=ex.message; err.hidden=false; btn.disabled=false; btn.textContent="Desbloquear"; }
  };
}
function renderMain(){
  const act = ITEMS.filter(i=>!i.vencida).length;
  $("#app").innerHTML = `
    <div class="ttl"><h1><em>Mi suscripción</em> (${ITEMS.length})</h1><span class="tag">IA Plus</span><span style="color:var(--mut);font-weight:700">${act} ${act===1?"activa":"activas"}</span></div>
    <div class="tabs" role="tablist"><button data-tab="sub" class="${tab==="sub"?"on":""}" role="tab">Suscripción</button><button data-tab="hist" class="${tab==="hist"?"on":""}" role="tab">Historial de pedidos</button></div>
    <div id="view">${tab==="sub"?`<div class="grid" id="grid">${ITEMS.map(card).join("")}<div class="nores" id="nores" hidden>No hay suscripciones que coincidan.</div></div>`:histHtml()}</div>
    ${act?`<div class="morebox"><button class="cta" type="button" data-more="1">➕ Ver más cuentas disponibles</button><small>Como ya tienes una cuenta activa, puedes elegir otras sin costo. Vencen igual que la primera.</small></div>`:""}
    ${addBox(false)}`;
  bindAdd(); applyFilter(); tick(); refreshTotp();
}
function applyFilter(){
  const g=$("#grid"); if(!g) return; let n=0;
  g.querySelectorAll(".sub-card").forEach(c=>{ const ok=!filterQ||c.dataset.s.includes(filterQ); c.style.display=ok?"":"none"; if(ok) n++; });
  $("#nores").hidden = n>0;
}
function tick(){
  document.querySelectorAll("[data-end]").forEach(el=>{
    const e = el.dataset.end; if(!e) return;
    const ms = new Date(e) - Date.now(); if(ms<=0){ el.textContent="0 días"; return; }
    const d=Math.floor(ms/DAY), h=Math.floor(ms%DAY/3600000), m=Math.floor(ms%3600000/60000), s=Math.floor(ms%60000/1000);
    el.textContent = d+" d "+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  });
}
/* ---------- menú de usuario ---------- */
function buildMenu(){
  const u = load("iap_user") || {}; const em = String(u.email||"");
  const av = $("#avBtn");
  av.innerHTML = u.picture ? `<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">` : esc((u.name||em||"?")[0].toUpperCase());
  const act = ITEMS.filter(i=>!i.vencida).length;
  $("#menu").innerHTML = `<div class="who">${esc(em||"Mi cuenta")}</div><div class="sub">${esc(u.name||"Información personal")}</div>
    <div class="saved">${act} ${act===1?"suscripción activa":"suscripciones activas"} en IA Plus</div><hr>
    <button class="mi on" data-go="sub"><span class="ic">🔑</span>Mi suscripción</button>
    <button class="mi" data-go="hist"><span class="ic">🧾</span>Pedidos históricos</button>
    <a href="index.html?tienda=1#catalogo"><span class="ic">🛍️</span>Comprar más cuentas</a>
    <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener"><span class="ic">🎧</span>Soporte</a>
    <a href="index.html?tienda=1#faq"><span class="ic">📖</span>Centro de ayuda</a>
    <button class="mi" data-install><span class="ic">📲</span>Instalar la app</button>
    ${IS_ADMIN?`<a href="admin.html"><span class="ic">🛠️</span>Panel admin</a>`:""}
    <hr><button class="mi" id="logout"><span class="ic">🚪</span>Cerrar sesión</button>`;
}
document.addEventListener("click", e=>{
  const c = e.target.closest("[data-copy]");
  if(c){ copyText(c.dataset.copy).then(()=>{ const t=c.innerHTML; c.classList.add("ok"); c.innerHTML=I.ok; setTimeout(()=>{c.classList.remove("ok");c.innerHTML=t;},1500); const x=document.createElement("div"); x.className="toastc"; x.textContent="Copiado ✔"; document.body.appendChild(x); setTimeout(()=>x.remove(),1300); }); return; }
  const more = e.target.closest("[data-more]");
  if(more){ openMore(); return; }
  const ask = e.target.closest("[data-ask]");
  if(ask){ askTotp(ask.closest("[data-totp]")); return; }
  const g = e.target.closest(".tog");
  if(g){ const pw=g.parentElement.querySelector(".pw"); const hid = pw.textContent.includes("•"); pw.textContent = hid ? pw.dataset.pw : "•".repeat(10); g.innerHTML = hid ? I.eyeoff : I.eye; return; }
  const ba = e.target.closest("[data-acc]");
  if(ba){ const p=document.getElementById(ba.dataset.acc); const on=p.classList.toggle("on"); ba.setAttribute("aria-expanded",on); return; }
  const tb = e.target.closest("[data-tab]");
  if(tb){ tab=tb.dataset.tab; renderMain(); return; }
  const go = e.target.closest("[data-go]");
  if(go){ tab=go.dataset.go; $("#menu").classList.remove("on"); renderMain(); window.scrollTo({top:0,behavior:"smooth"}); return; }
  if(e.target.closest("#logout")){ try{ ["iap_user","iap_cred","iap_has","iap_admin","iap_pwa_seen"].forEach(k=>localStorage.removeItem(k)); sessionStorage.clear(); }catch{} try{ google.accounts.id.disableAutoSelect(); }catch{} location.href="index.html?tienda=1"; return; }
  if(e.target.closest("#avBtn")){ $("#menu").classList.toggle("on"); return; }
  if(!e.target.closest("#menu")) $("#menu").classList.remove("on");
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape") $("#menu").classList.remove("on"); });
$("#q").addEventListener("input", e=>{ filterQ=e.target.value.trim().toLowerCase(); if(tab!=="sub"){ tab="sub"; renderMain(); } applyFilter(); });
/* ---------- elegir otras cuentas (mismo producto, mismo vencimiento) ---------- */
async function openMore(){
  let m=document.getElementById("moreM"); if(m) m.remove();
  m=document.createElement("div"); m.id="moreM"; m.className="moremodal";
  m.innerHTML=`<div class="morecard"><button class="x" type="button" aria-label="Cerrar">×</button><h3>Más cuentas para ti</h3><div class="mbody">Buscando cuentas disponibles…</div></div>`;
  document.body.appendChild(m);
  const body=m.querySelector(".mbody"), close=()=>m.remove();
  m.addEventListener("click",e=>{ if(e.target===m||e.target.closest(".x")) close(); });
  try{
    const j=await callApi({action:"acct_options"}); if(!j.ok) throw new Error(j.error||"Error");
    if(j.tiene>=j.max){ body.innerHTML=`<p>Ya tienes el máximo de ${j.max} cuentas activas.</p>`; return; }
        body.innerHTML=`<p>Por tener una cuenta activa puedes elegir otras sin costo. Vencen el mismo día que tu primera cuenta y comparten tus 5 pedidos de código de cada día.</p>`+(j.grupos||[]).map(g=>`<h4 class="mgrp">${esc(g.producto)}</h4>`+(g.opciones.length?"":`<div class="mopt"><div><small>Sin cuentas libres por ahora</small></div><a class="cta" target="_blank" rel="noopener" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, quiero una cuenta de "+g.producto)}">Pedir</a></div>`)+g.opciones.map(o=>`<div class="mopt"><div><b>${esc(o.cuenta)}</b><small>${o.uso} de ${o.cupo} usuarios</small></div><button class="cta" type="button" data-pick="${o.fila}">Elegir</button></div>`).join("")).join("")+`<div class="adderr" id="moreErr" hidden></div>`;
    body.onclick=async e=>{
      const b=e.target.closest("[data-pick]"); if(!b) return; b.disabled=true; b.textContent="Agregando…";
      try{ const r=await callApi({action:"acct_add",fila:+b.dataset.pick}); if(!r.ok) throw new Error(r.error||"Error"); close(); await loadAll(); }
      catch(ex){ const er=body.querySelector("#moreErr"); er.textContent=ex.message; er.hidden=false; b.disabled=false; b.textContent="Elegir"; }
    };
  }catch(ex){ body.innerHTML="<p>"+esc(ex.message)+"</p>"; }
}
let timer=null;
async function loadAll(){
  try{
    const j = await callApi({action:"list"}); if(!j.ok) throw new Error(j.error||"Error");
    ITEMS = j.items; IS_ADMIN = !!j.admin; save("iap_admin", IS_ADMIN); save("iap_has", ITEMS.length>0); buildMenu();
    if(!ITEMS.length){ $("#app").innerHTML = `<div class="ttl"><h1><em>Mi suscripción</em> (0)</h1><span class="tag">IA Plus</span></div><p style="color:var(--mut);font-weight:700;margin:18px 0 0">Aún no tienes suscripciones activas.</p>${addBox(true)}`; bindAdd(); return; }
    renderMain();
    if(!timer) timer=setInterval(()=>{tick();refreshTotp();},1000);
    if(ITEMS.some(i=>!i.vencida) && !sessionStorage.getItem("iap_conf")){ sessionStorage.setItem("iap_conf","1"); confetti(); }
  }catch(err){ message("No pudimos cargar tu cuenta", esc(err.message)); }
}
loadAll();
(function(){
  const link="https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent("Hola, necesito ayuda con mi cuenta");
  const w=$("#bnWa"); if(w) w.href=link; const t=$("#topWa"); if(t) t.href=link;
  const add=$("#bnTop");
  if(add) add.addEventListener("click",e=>{ e.preventDefault(); const b=$("#addbox"); if(b){ b.scrollIntoView({behavior:"smooth",block:"center"}); setTimeout(()=>{ const i=$("#addCode"); if(i) i.focus(); },500); } });
})();
