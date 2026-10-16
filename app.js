/* ============ CONFIGURACIÓN (edita esto) ============ */
const CONFIG = {
  // 1) Crea un "OAuth Client ID" tipo Web en https://console.cloud.google.com/apis/credentials
  //    y agrega tu dominio (y http://localhost) en "Orígenes autorizados de JavaScript".
  GOOGLE_CLIENT_ID: "912360874722-idm6s6ujebsi7bbvmduq7ql88efb9uq9.apps.googleusercontent.com",
  // 2) Tu número de WhatsApp con código de país, sin + ni espacios (Colombia = 57)
  WHATSAPP: "573102035327",
  PAGOS: false, // pagos en línea con Wompi (el servidor decide precio y firma; si no están activos, se avisa y queda WhatsApp)
  STORE: "IA Plus Colombia",
  // URL de la API (Apps Script) que entrega las cuentas con el código de activación
  API_URL: "https://script.google.com/macros/s/AKfycbyIINkQAuYouCXVr722gi_8K1dHPLeF6N5XlmzHgCRA0ETF4cBc-VpIw0933mz1lFg8qA/exec",
};

/* ============ PRODUCTOS (edita nombres, precios y detalles) ============ */
const PRODUCTS = [
  {id:"chatgpt", name:"ChatGPT", cat:"IA", ico:"🤖", img:"chatgpt.png", dark:true, price:10000, per:"/mes", hot:true, feats:["Cuenta lista para usar","Entrega rápida por WhatsApp","Garantía durante el mes"]},
  {id:"claude", name:"Claude Code", cat:"IA", ico:"🧠", img:"claude.png", lt:true, price:30000, per:"/mes", feats:["Acceso a Claude Code","Para 1 solo dispositivo","Entrega rápida por WhatsApp","Garantía durante el mes"]},
  {id:"gemini", name:"Gemini Pro", cat:"IA", ico:"✨", img:"gemini.png", lt:true, price:10000, per:"/mes", feats:["Acceso a cuenta privada","Gemini Pro listo para usar","Entrega rápida por WhatsApp","Garantía durante el mes"]},
  {id:"flow", name:"Flow", cat:"IA", ico:"🎥", img:"flow.png", lt:true, price:20000, per:"/mes", feats:["Generador de video con IA profesional","1.000 créditos incluidos","Entrega rápida por WhatsApp","Garantía durante el mes"]},
  {id:"duolingo", name:"Duolingo", cat:"Educación", ico:"🦉", img:"duolingo.png", lt:true, price:30000, per:"/12 meses", days:365, feats:["Duolingo por 12 meses completos","Cuenta lista para usar","Entrega rápida por WhatsApp","Garantía incluida"]},
  {id:"canva", name:"Canva", cat:"Diseño", ico:"🎨", img:"canva.png", lt:true, price:10000, per:"/mes", feats:["Cuenta lista para usar","Entrega rápida por WhatsApp","Garantía durante el mes"]},
  {id:"xbox", name:"Xbox Game Pass Ultimate", cat:"Juegos", ico:"🎮", img:"xbox.png", price:26000, per:"/mes", feats:["Game Pass Ultimate por 1 mes","Entrega rápida por WhatsApp","Garantía durante el mes"]},
  {id:"premiere", name:"Adobe Premiere Pro", cat:"Edición de video", ico:"🎞️", img:"premiere.png", lt:true, price:20000, per:"/mes", feats:["Programa para PC","Edición de video profesional","Entrega rápida por WhatsApp","Garantía durante el mes"]},
  {id:"photoshop", name:"Adobe Photoshop", cat:"Diseño", ico:"🖼️", img:"photoshop.png", lt:true, price:20000, per:"/mes", feats:["Programa para PC","Edición de fotos y diseño profesional","Entrega rápida por WhatsApp","Garantía durante el mes"]},
  {id:"davinci", name:"DaVinci Resolve", cat:"Edición de video", ico:"🎬", img:"davinci.png", lt:true, price:30000, per:"/mes", feats:["Programa para PC","Edición y color de nivel profesional","Entrega rápida por WhatsApp","Garantía durante el mes"]},
  {id:"youtube", name:"YouTube Premium", cat:"Streaming", ico:"▶️", img:"youtube.png", lt:true, price:30000, per:"/3 meses", days:90, feats:["YouTube Premium por 3 meses","Sin anuncios y con reproducción en segundo plano","Entrega rápida por WhatsApp","Garantía incluida"]},
  {id:"capcut", name:"CapCut Pro", cat:"Edición de video", ico:"🎬", img:"capcut.png", lt:true, price:15000, per:"/mes", feats:["Cuenta privada solo para ti","Entrega rápida por WhatsApp","Garantía durante el mes"]},
  {id:"filmora", name:"Filmora", cat:"Edición de video", ico:"🎞️", img:"filmora.png", lt:true, price:10000, per:"/mes", feats:["Cuenta lista para usar","Entrega rápida por WhatsApp","Garantía durante el mes"]},
];
const iconOf = p => p.img ? `<img src="${p.img}" alt="">` : p.ico;

/* ============ UTILIDADES ============ */
const $ = s => document.querySelector(s);
const cop = n => "$" + n.toLocaleString("es-CO");
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

let user = load("iap_user", null);
// cliente que ya activó una cuenta: entra directo a su pantalla (la sesión de Google se renueva allí)
if(user && load("iap_has", false) && !/[?&]tienda/.test(location.search)) location.replace("cuenta.html");
let cart = load("iap_cart", []);
let filter = "Todos";

// copiar con respaldo para navegadores antiguos o sin HTTPS
function copyText(t){
  if(navigator.clipboard?.writeText) return navigator.clipboard.writeText(t).catch(()=>fallbackCopy(t));
  return fallbackCopy(t);
}
function fallbackCopy(t){
  return new Promise(res=>{ const a=document.createElement("textarea"); a.value=t; a.setAttribute("readonly",""); a.style.cssText="position:fixed;opacity:0;top:0";
    document.body.appendChild(a); a.select(); try{ document.execCommand("copy"); }catch{} a.remove(); res(); });
}
let toastT;
function toast(msg){ const t=$("#toast"); clearTimeout(toastT); t.classList.remove("on"); void t.offsetWidth; t.textContent=msg; t.classList.add("on"); toastT=setTimeout(()=>t.classList.remove("on"),2600); }

/* ============ CATÁLOGO ============ */
function renderFilters(){
  if(new Set(PRODUCTS.map(p=>p.cat)).size<2){ $("#filters").innerHTML=""; return; }
  const cats = ["Todos", ...new Set(PRODUCTS.map(p=>p.cat))];
  $("#filters").innerHTML = cats.map(c=>`<button class="chip ${c===filter?"on":""}" data-c="${c}">${c}</button>`).join("");
  $("#filters").onclick = e => { const b=e.target.closest(".chip"), c=b&&b.dataset.c; if(c && c!==filter){ filter=c; renderFilters(); swapGrid(); $("#filters .chip.on")?.scrollIntoView?.({inline:"center",block:"nearest",behavior:"smooth"}); } };
}
// cambio suave del catálogo: se desvanece, se redibuja y las tarjetas entran escalonadas
let gridFirst = true, swapT;
function swapGrid(){
  const g=$("#grid"); clearTimeout(swapT); g.classList.add("swap");
  swapT=setTimeout(()=>{ renderGrid(); g.classList.remove("swap"); }, 180);
}
function renderGrid(){
  const q = (($("#search")||{}).value||"").trim().toLowerCase(), so = ($("#sort")||{}).value||"";
  let list = PRODUCTS.filter(p => (filter==="Todos" || p.cat===filter) && (!q || (p.name+" "+p.cat+" "+p.feats.join(" ")).toLowerCase().includes(q)));
  if(so) list = [...list].sort((a,b)=> so==="asc" ? a.price-b.price : b.price-a.price);
  const cnt=$("#count"); if(cnt) cnt.textContent = list.length ? (list.length===PRODUCTS.length ? `${list.length} cuentas disponibles` : `${list.length} de ${PRODUCTS.length} cuentas`) : "";
  const first = gridFirst; gridFirst = false;
  $("#grid").innerHTML = list.map((p,n)=>`
    <article class="card ${first?"reveal":"anim"}" style="--d:${Math.min(n,8)*(first?80:55)}ms">
      ${p.hot?'<span class="badge">Más vendido</span>':''}
      <div class="ico ${p.lt?"lt":""} ${p.dark?"dk":""}">${iconOf(p)}</div>
      <h3>${esc(p.name)}</h3>
      <div class="cat">${esc(p.cat)}</div>
      <ul>${p.feats.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>
      <div class="price">${cop(p.price)} <small>COP ${p.per}</small></div>
      <div class="perday">≈ ${cop(Math.round(p.price/(p.days||30)/10)*10)} al día</div>
      ${(CONFIG.PAGOS||/[?&]pagos=1/.test(location.search))?`<button class="btn btn-primary full buy-btn pay-btn" type="button" data-pay="${p.id}"><svg class="ic"><use href="#i-card"/></svg>Pagar ahora</button>
      <a class="buy-alt" target="_blank" rel="noopener" href="https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent('Hola, quiero comprar '+p.name+' ('+cop(p.price)+' COP '+p.per+')')}">o compra por WhatsApp</a>`
      :`<a class="btn btn-primary full buy-btn" target="_blank" rel="noopener" href="https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent('Hola, quiero comprar '+p.name+' ('+cop(p.price)+' COP '+p.per+')')}"><svg class="ic"><use href="#i-wa"/></svg>Comprar por WhatsApp</a>`}
    </article>`).join("") || `<div class="nores"><svg class="ic big"><use href="#i-search"/></svg>No encontramos «${esc(q)}». <button class="linkbtn" id="clearSearch">Ver todo el catálogo</button></div>`;
  const cl=$("#clearSearch"); if(cl) cl.onclick=()=>{ $("#search").value=""; filter="Todos"; renderFilters(); swapGrid(); };
  observeReveal();
}
function observeReveal(){
  const els = document.querySelectorAll(".reveal:not(.in)");
  if(!("IntersectionObserver" in window)){ els.forEach(e=>e.classList.add("in")); return; }
  const io = new IntersectionObserver(es=>es.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } }), {threshold:.12});
  els.forEach(e=>io.observe(e));
}
function renderCart(){}

/* ============ LOGIN REAL CON GOOGLE ============ */
const hasClientId = /^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(CONFIG.GOOGLE_CLIENT_ID);
let gReady = false;

function parseJwt(t){
  const b = t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
  return JSON.parse(decodeURIComponent(atob(b).split("").map(c=>"%"+("00"+c.charCodeAt(0).toString(16)).slice(-2)).join("")));
}
function setUser(u){ user = u; try{ localStorage.removeItem("iap_pwa_seen"); }catch{} save("iap_user", u); renderAuth(); renderHeroCard(); renderRedeem(); closeLogin(); toast(`Bienvenido, ${u.name.split(" ")[0]}`); loadMine(); setTimeout(()=>window.iapAskInstall&&window.iapAskInstall(),1200); }

function onGoogle(resp){
  // Para máxima seguridad, verifica resp.credential también en tu servidor.
  const p = parseJwt(resp.credential);
  const okIss = p.iss === "accounts.google.com" || p.iss === "https://accounts.google.com";
  if(!okIss || p.aud !== CONFIG.GOOGLE_CLIENT_ID || p.exp*1000 < Date.now() || !p.email_verified){
    toast("No se pudo verificar tu cuenta de Google"); return;
  }
  save("iap_cred",{token:resp.credential,exp:p.exp*1000});
  setUser({email:p.email, name:p.name || p.email, picture:p.picture || ""});
}
function showSetupError(){
  const msg = "Falta configurar el Google Client ID en app.js (CONFIG.GOOGLE_CLIENT_ID).";
  const e = $("#loginErr"); e.textContent = msg; e.hidden = false;
  $("#gBtnHero").innerHTML = '<p class="err" style="font-size:13px">'+msg+'</p>';
}
function initGoogle(){
  if(user) return;
  if(!hasClientId){ showSetupError(); return; }
  if(!window.google?.accounts?.id){ setTimeout(initGoogle, 300); return; }
  if(!gReady){ google.accounts.id.initialize({client_id:CONFIG.GOOGLE_CLIENT_ID, callback:onGoogle, auto_select:false}); gReady = true; }
  const opts = {theme:"outline", size:"large", shape:"pill", text:"signin_with", locale:"es", width:300};
  $("#gBtn").innerHTML = ""; $("#gBtnHero").innerHTML = "";
  google.accounts.id.renderButton($("#gBtn"), opts);
  google.accounts.id.renderButton($("#gBtnHero"), opts);
}
function openLogin(){ const m=$("#loginModal"); m.classList.add("on"); m.setAttribute("aria-hidden","false"); initGoogle(); setTimeout(()=>$("#closeLogin").focus(),50); }
function closeLogin(){ const m=$("#loginModal"); m.classList.remove("on"); m.setAttribute("aria-hidden","true"); }
document.addEventListener("keydown", e => { if(e.key==="Escape" && $("#loginModal").classList.contains("on")) closeLogin(); });
$("#closeLogin").onclick = closeLogin;
$("#loginModal").addEventListener("click", e => { if(e.target.id==="loginModal") closeLogin(); });

function avatarOf(sz){
  return user.picture ? `<img src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer">`
    : `<img alt="" src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="'+sz+'" height="'+sz+'"><rect width="'+sz+'" height="'+sz+'" fill="#ef5350"/><text x="'+sz/2+'" y="'+sz*0.68+'" font-size="'+sz/2+'" text-anchor="middle" fill="#fff" font-family="Arial">'+esc(user.name[0].toUpperCase())+'</text></svg>')}">`;
}
function logout(){
  try{ window.google?.accounts?.id?.disableAutoSelect(); }catch{}
  user = null; try{ localStorage.removeItem("iap_pwa_seen"); }catch{} save("iap_user", null); save("iap_cred", null); save("iap_has", false); save("iap_admin", false); cart = []; save("iap_cart", []);
  renderAuth(); renderCart(); renderHeroCard(); renderRedeem(); toast("Sesión cerrada");
}
function renderAuth(){
  const a = $("#authArea");
  if(!user){
    a.innerHTML = `<button class="btn btn-google" id="loginBtn">Ingresar con Gmail</button>`;
    $("#loginBtn").onclick = openLogin;
    return;
  }
  const mine = (myItems&&myItems.length) ? '<a class="btn btn-ghost" href="cuenta.html" style="padding:8px 14px">Mi cuenta</a> ' : '';
  const adm = load("iap_admin", false) ? '<a class="btn btn-primary" href="admin.html" style="padding:8px 14px">Panel admin</a> ' : '';
  a.innerHTML = `${adm}${mine}<div class="user">${avatarOf(36)}<div class="uname">${esc(user.name)}<small>${esc(user.email)}</small></div><button id="logout">Salir</button></div>`;
  $("#logout").onclick = logout;
}
function hasAccount(){ return !!(user && (load("iap_has", false) || (myItems&&myItems.length))); }
async function redeemCode(code, err, btn, label){
  err.hidden=true; btn.disabled=true; btn.textContent="Verificando…";
  try{ myItems = await callApi("redeem", code); toast("Cuenta desbloqueada"); location.href = "cuenta.html"; }
  catch(ex){ err.textContent = ex.message; err.hidden=false; btn.disabled=false; btn.textContent=label; }
}
function renderHeroCard(){
  const c = $("#heroCard");
  if(user && hasAccount()){
    c.innerHTML = `<div class="who">${avatarOf(72)}<h3>Hola, ${esc(user.name.split(" ")[0])}</h3><p>Tu cuenta ya está activa.</p></div>
      <a href="cuenta.html" class="btn btn-primary full pulse-btn"><svg class="ic"><use href="#i-unlock"/></svg>Ver mi cuenta</a>
      <a href="#catalogo" class="btn btn-ghost full" style="margin-top:10px">Comprar otra cuenta</a>
      <button class="linkbtn" id="heroLogout">Cerrar sesión</button>`;
    $("#heroLogout").onclick = logout;
  } else if(user){
    c.innerHTML = `<div class="who">${avatarOf(72)}<h3>Hola, ${esc(user.name.split(" ")[0])}</h3><p>Escribe el código que te enviamos para activar tu cuenta.</p></div>
      <form id="heroForm" class="redeem-form" style="flex-direction:column"><input id="heroCode" placeholder="Ej: IAP-AB12-CD34" autocomplete="off" maxlength="40"><button class="btn btn-primary" type="submit">Activar mi código</button></form>
      <p class="note err" id="heroErr" hidden></p>
      <a href="#catalogo" class="btn btn-ghost full" style="margin-top:10px">¿Aún no tienes código? Ver catálogo</a>
      <button class="linkbtn" id="heroLogout">Cerrar sesión</button>`;
    $("#heroLogout").onclick = logout;
    $("#heroForm").onsubmit = e => { e.preventDefault(); redeemCode($("#heroCode").value, $("#heroErr"), e.target.querySelector("button"), "Activar mi código"); };
  } else {
    c.innerHTML = `<h3>Entra a tu cuenta</h3><p>¿Ya activaste tu código? Inicia sesión con tu Gmail y te llevamos directo a tu cuenta. Si es tu primera vez, aquí mismo activas tu código.</p>
      <div id="gBtnHero" class="gbtn"></div><small class="legal">Usamos Google para identificarte. Nunca vemos tu contraseña.</small>
      <a href="#catalogo" class="linkbtn" style="display:block;margin-top:12px">¿Aún no tienes código? Ver catálogo ↓</a>`;
    initGoogle();
  }
}

/* ============ MI CUENTA (código de activación) ============ */
let myItems = null;
async function callApi(action, code){
  const cred = load("iap_cred", null);
  if(!CONFIG.API_URL) throw new Error("El servicio de cuentas aún no está configurado.");
  if(!cred || cred.exp < Date.now()) throw new Error("Tu sesión venció. Pulsa Salir y vuelve a entrar con Google.");
  const j = await postJson(CONFIG.API_URL, {action, code, idToken:cred.token});
  if(!j.ok) throw new Error(j.error || "Error");
  if(j.admin !== undefined) save("iap_admin", !!j.admin); // lo decide el servidor, no el navegador
  return j.items;
}
function renderRedeem(){
  const box = $("#redeemBox"); if(!box) return;
  // quien ya tiene una cuenta activa no ve el panel de desbloqueo: va directo a su cuenta
  if(user && (load("iap_has", false) || (myItems&&myItems.length))){
    box.innerHTML = '<a class="btn btn-primary full" href="cuenta.html"><svg class="ic"><use href="#i-unlock"/></svg>Abrir mi cuenta</a><p class="note" style="margin-top:8px;color:var(--mut)">¿Compraste otra? Agrégala desde Mi cuenta.</p>';
    return;
  }
  if(!user){ box.innerHTML = '<button class="btn btn-google full" id="redeemLogin">Ingresar con Gmail para desbloquear</button>'; $("#redeemLogin").onclick = openLogin; return; }
  const list = (myItems&&myItems.length) ? '<a class="btn btn-primary full" style="margin-top:14px" href="cuenta.html"><svg class="ic"><use href="#i-unlock"/></svg>Abrir mi cuenta</a>' : '';
  box.innerHTML = `<form id="redeemForm" class="redeem-form"><input id="codeInput" placeholder="Ej: IAP-AB12-CD34" autocomplete="off" maxlength="40"><button class="btn btn-primary" type="submit">Desbloquear cuenta</button></form>
    <p class="note err" id="redeemErr" hidden></p>
    <div id="acctList">${myItems===null?'':(list||'')}</div>`;
  $("#redeemForm").onsubmit = async e => {
    e.preventDefault(); const err=$("#redeemErr"); err.hidden=true;
    const btn=e.target.querySelector("button"); btn.disabled=true; btn.textContent="Verificando…";
    try{ myItems = await callApi("redeem", $("#codeInput").value); toast("Cuenta desbloqueada"); location.href = "cuenta.html"; return; }
    catch(ex){ err.textContent = ex.message; err.hidden=false; }
    renderRedeem_keep(err.textContent, !err.hidden);
  };
}
function renderRedeem_keep(msg, show){ renderRedeem(); if(show){ const e=$("#redeemErr"); e.textContent=msg; e.hidden=false; } }
document.addEventListener("click", e => {
  const t = e.target.closest("[data-copy]"); if(!t) return;
  copyText(t.dataset.copy).then(()=>toast("Copiado"));
});
async function loadMine(){
  if(!user || !CONFIG.API_URL) return;
  try{
    myItems = await callApi("list"); save("iap_has", myItems.length>0); renderRedeem(); renderAuth(); renderHeroCard();
    // quien ya desbloqueó una cuenta entra directo a su pantalla (correo, contraseña y autenticador)
    if(myItems.length && !/[?&]tienda/.test(location.search)) location.replace("cuenta.html");
  }catch{}
}

/* ============ INIT ============ */
$("#heroLogin").onclick = () => { if(user) toast("Ya iniciaste sesión"); else $("#heroCard").scrollIntoView({behavior:"smooth",block:"center"}); };
$("#burger").onclick = () => { const on = $("#links").classList.toggle("on"); $("#burger").setAttribute("aria-expanded", on); };
$("#links").onclick = () => $("#links").classList.remove("on");
$("#waContact").href = `https://wa.me/${CONFIG.WHATSAPP}`;
$("#waFloat").href = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent("Hola, quiero información")}`;
$("#year").textContent = new Date().getFullYear();
observeReveal(); renderFilters(); renderGrid(); renderCart(); renderAuth(); renderHeroCard(); renderRedeem(); loadMine();

// brillo que sigue al mouse e inclinación 3D suave en las tarjetas (solo con mouse)
const finePointer = matchMedia("(hover:hover) and (pointer:fine)").matches && !matchMedia("(prefers-reduced-motion:reduce)").matches;
let tiltCard = null;
document.addEventListener("pointermove", e => {
  const c = e.target.closest?.(".card");
  if(tiltCard && tiltCard!==c){ tiltCard.classList.remove("tilting"); tiltCard.style.removeProperty("--rx"); tiltCard.style.removeProperty("--ry"); tiltCard=null; }
  if(!c) return;
  const r = c.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
  c.style.setProperty("--mx", x+"px"); c.style.setProperty("--my", y+"px");
  if(finePointer){ tiltCard=c; c.classList.add("tilting"); c.style.setProperty("--ry", ((x/r.width-.5)*7).toFixed(2)+"deg"); c.style.setProperty("--rx", ((.5-y/r.height)*7).toFixed(2)+"deg"); }
});
// onda al tocar botones
document.addEventListener("pointerdown", e => {
  const b = e.target.closest(".btn,.chip"); if(!b || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width,r.height), d = document.createElement("span");
  d.className="ripple"; d.style.cssText=`width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;
  b.appendChild(d); setTimeout(()=>d.remove(),650);
});

/* ============ BARRA INFERIOR (celular) ============ */
(function(){
  const wa = $("#bnWa"); if(wa){ wa.href = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent("Hola, quiero información")}`; }
  const acct = $("#bnAcct");
  if(acct) acct.addEventListener("click", e => {
    if(!user){ e.preventDefault(); openLogin(); }            // sin sesión: abre el ingreso con Gmail
    else if(!hasAccount()){ e.preventDefault(); location.hash = "inicio"; $("#heroCode")?.focus(); toast("Escribe tu código para activar tu cuenta"); }
  });
  const links = [...document.querySelectorAll(".bn a[data-s]")];
  if(links.length && "IntersectionObserver" in window){
    const io = new IntersectionObserver(es => es.forEach(en => { if(en.isIntersecting){ links.forEach(a => a.classList.toggle("on", a.dataset.s === en.target.id)); } }), {rootMargin:"-45% 0px -50% 0px"});
    ["inicio","catalogo"].forEach(id => { const s = document.getElementById(id); if(s) io.observe(s); });
  }
})();

/* ============ MEJORAS DE LA PÁGINA ============ */
(function(){
  // buscador y orden
  const se=$("#search"), so=$("#sort");
  let qt; if(se) se.addEventListener("input", ()=>{ clearTimeout(qt); qt=setTimeout(swapGrid,140); });
  if(so) so.addEventListener("change", swapGrid);
  const wb=$("#waBand"); if(wb) wb.href=`https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent("Hola, quiero comprar una cuenta premium")}`;
  // íconos flotando alrededor de la tarjeta de ingreso
  const ob=$("#orbit");
  if(ob){
    const pos=[[-2,4,-8],[90,0,7],[-8,48,6],[98,44,-6],[2,90,5],[88,92,-7]];
    ob.innerHTML=PRODUCTS.filter(p=>p.img).slice(0,6).map((p,i)=>`<span class="orb ${p.dark?"dk":""}" style="left:${pos[i][0]}%;top:${pos[i][1]}%;--rt:${pos[i][2]}deg;--dl:${(i*.7).toFixed(1)}s"><img src="${p.img}" alt=""></span>`).join("");
    requestAnimationFrame(()=>ob.classList.add("on"));
  }
  // la línea entre los pasos se dibuja al llegar a la sección
  const st=$("#steps");
  if(st && "IntersectionObserver" in window){ const io=new IntersectionObserver(es=>{ if(es[0].isIntersecting){ st.classList.add("in"); io.disconnect(); } },{threshold:.4}); io.observe(st); } else if(st) st.classList.add("in");
  // menú superior: resalta la sección visible
  const navLinks=[...document.querySelectorAll(".links a[data-s]")];
  if(navLinks.length && "IntersectionObserver" in window){
    const io=new IntersectionObserver(es=>es.forEach(en=>{ if(en.isIntersecting) navLinks.forEach(a=>a.classList.toggle("on", a.dataset.s===en.target.id)); }),{rootMargin:"-45% 0px -50% 0px"});
    navLinks.forEach(a=>{ const s=document.getElementById(a.dataset.s); if(s) io.observe(s); });
  }
  // preguntas: abren y cierran con animación de altura
  const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
  document.querySelectorAll("#faq details").forEach(d=>{
    const sm=d.querySelector("summary"); if(!sm || reduce || !d.animate) return;
    sm.addEventListener("click", e=>{
      e.preventDefault(); if(d._a) return;
      const h0=d.offsetHeight;
      if(d.open){ const h1=sm.offsetHeight; d._a=d.animate({height:[h0+"px",h1+"px"]},{duration:280,easing:"cubic-bezier(.2,.7,.2,1)"}); d._a.onfinish=()=>{ d.open=false; d._a=null; }; }
      else{
        document.querySelectorAll("#faq details[open]").forEach(o=>{ if(o!==d) o.querySelector("summary").click(); });
        d.open=true; const h1=d.offsetHeight; d._a=d.animate({height:[h0+"px",h1+"px"]},{duration:320,easing:"cubic-bezier(.2,.7,.2,1)"}); d._a.onfinish=()=>{ d._a=null; };
      }
    });
  });
  // franja de productos que se desplaza
  const mq=$("#mq");
  if(mq){ const one=PRODUCTS.map(p=>`<a class="mq-i" href="#catalogo"><span class="mq-ic ${p.lt?"lt":""} ${p.dark?"dk":""}">${iconOf(p)}</span><b>${esc(p.name)}</b><small>${cop(p.price)}</small></a>`).join(""); mq.innerHTML=one+one; }
  // "desde $X" en la portada
  const from=Math.min(...PRODUCTS.map(p=>p.price)), hs=document.querySelector(".hero-from");
  if(hs) hs.textContent=cop(from);
  // datos estructurados para buscadores
  try{
    const ld=document.createElement("script"); ld.type="application/ld+json";
    ld.textContent=JSON.stringify({"@context":"https://schema.org","@type":"ItemList",itemListElement:PRODUCTS.map((p,i)=>({"@type":"ListItem",position:i+1,item:{"@type":"Product",name:p.name,image:location.origin+location.pathname.replace(/[^/]*$/,"")+p.img,description:p.feats.join(". "),offers:{"@type":"Offer",price:p.price,priceCurrency:"COP",availability:"https://schema.org/InStock"}}}))});
    document.head.appendChild(ld);
  }catch{}
  // barra de progreso y botón de subir
  const pr=$("#progress"), tt=$("#totop"), ring=$("#totopRing");
  let tick=false;
  const onScroll=()=>{ if(tick) return; tick=true; requestAnimationFrame(()=>{ const h=document.documentElement; const max=h.scrollHeight-h.clientHeight, f=max>0?h.scrollTop/max:0; if(pr) pr.style.transform="scaleX("+f+")"; if(ring) ring.style.strokeDashoffset=(138.2*(1-f)).toFixed(1); if(tt) tt.classList.toggle("on", h.scrollTop>700); tick=false; }); };
  addEventListener("scroll", onScroll, {passive:true}); onScroll();
  if(tt) tt.onclick=()=>scrollTo({top:0,behavior:"smooth"});
  // contador animado en la portada
  document.querySelectorAll("[data-count]").forEach(el=>{ const to=el.dataset.count==="auto"?PRODUCTS.length:+el.dataset.count; const t0=performance.now()+350; const step=t=>{ const p=Math.max(0,Math.min(1,(t-t0)/1300)); el.textContent=Math.round(to*(1-Math.pow(1-p,3))); if(p<1) requestAnimationFrame(step); }; requestAnimationFrame(step); });
})();


/* ============ PAGOS EN LÍNEA (Wompi) ============ */
async function apiRaw(body){
  const cred = load("iap_cred", null);
  if(!cred || cred.exp < Date.now()) throw new Error("Tu sesión venció. Pulsa Salir y vuelve a entrar con Google.");
  const j = await postJson(CONFIG.API_URL, {...body, idToken:cred.token}); if(!j.ok) throw new Error(j.error || "Error"); return j;
}
// Dirección del Web Checkout de Wompi (la firma y el precio ya vienen firmados desde el servidor)
function wompiUrl(j){
  const back = location.origin + location.pathname.replace(/[^/]*$/, "") + "pago.html";
  const q = (k,v) => k + "=" + encodeURIComponent(v);
  return "https://checkout.wompi.co/p/?" + [q("public-key", j.publicKey), q("currency", j.currency), q("amount-in-cents", j.cents), q("reference", j.ref), "signature:integrity=" + encodeURIComponent(j.signature), q("redirect-url", back)].join("&");
}
async function payNow(id, btn){
  if(!user){ toast("Primero inicia sesión con tu Gmail para pagar"); openLogin(); return; }
  const label = btn.textContent; btn.disabled = true; btn.textContent = "Abriendo el pago…";
  try{
    const j = await apiRaw({action:"pay_create", producto:id});
    save("iap_pay", {ref:j.ref, t:Date.now()});
    location.href = wompiUrl(j);
  }catch(ex){
    btn.disabled = false; btn.textContent = label;
    toast(/Acción no válida|aún no están activos/i.test(ex.message) ? "Los pagos en línea aún no están disponibles. Compra por WhatsApp." : ex.message);
  }
}
document.addEventListener("click", e => { const b = e.target.closest("[data-pay]"); if(b) payNow(b.dataset.pay, b); });

/* sombra del encabezado al desplazarse */
(function(){const h=document.querySelector(".nav,.top");if(!h)return;const f=()=>h.classList.toggle("scrolled",window.scrollY>8);addEventListener("scroll",f,{passive:true});f();})();
