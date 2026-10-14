/* ============ CONFIGURACIÓN (edita esto) ============ */
const CONFIG = {
  // 1) Crea un "OAuth Client ID" tipo Web en https://console.cloud.google.com/apis/credentials
  //    y agrega tu dominio (y http://localhost) en "Orígenes autorizados de JavaScript".
  GOOGLE_CLIENT_ID: "912360874722-idm6s6ujebsi7bbvmduq7ql88efb9uq9.apps.googleusercontent.com",
  // 2) Tu número de WhatsApp con código de país, sin + ni espacios (Colombia = 57)
  WHATSAPP: "573102035327",
  STORE: "IA Plus Colombia",
  ADMIN: "j03l1525@gmail.com", // solo muestra el botón; el permiso real lo valida el servidor
  // URL de la API (Apps Script) que entrega las cuentas con el código de activación
  API_URL: "https://script.google.com/macros/s/AKfycbyIINkQAuYouCXVr722gi_8K1dHPLeF6N5XlmzHgCRA0ETF4cBc-VpIw0933mz1lFg8qA/exec",
};

/* ============ PRODUCTOS (edita nombres, precios y detalles) ============ */
const PRODUCTS = [
  {id:"chatgpt", name:"ChatGPT", cat:"IA", ico:"🤖", img:"chatgpt.png", price:10000, per:"/mes", hot:true, feats:["Cuenta lista para usar","Entrega rápida por WhatsApp","Garantía durante el mes"]},
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
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("on"); setTimeout(()=>t.classList.remove("on"),2400); }

/* ============ CATÁLOGO ============ */
function renderFilters(){
  if(new Set(PRODUCTS.map(p=>p.cat)).size<2){ $("#filters").innerHTML=""; return; }
  const cats = ["Todos", ...new Set(PRODUCTS.map(p=>p.cat))];
  $("#filters").innerHTML = cats.map(c=>`<button class="chip ${c===filter?"on":""}" data-c="${c}">${c}</button>`).join("");
  $("#filters").onclick = e => { const c=e.target.dataset.c; if(c){ filter=c; renderFilters(); renderGrid(); } };
}
function renderGrid(){
  const list = PRODUCTS.filter(p => filter==="Todos" || p.cat===filter);
  $("#grid").innerHTML = list.map((p,n)=>`
    <article class="card reveal" style="--d:${n*90}ms">
      ${p.hot?'<span class="badge">🔥 Popular</span>':''}
      <div class="ico ${p.lt?"lt":""}">${iconOf(p)}</div>
      <h3>${esc(p.name)}</h3>
      <div class="cat">${esc(p.cat)}</div>
      <ul>${p.feats.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>
      <div class="price">${cop(p.price)} <small>COP ${p.per}</small></div>
      <a class="btn btn-primary full buy-btn" target="_blank" rel="noopener" href="https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent('Hola, quiero comprar '+p.name+' ('+cop(p.price)+' COP/mes)')}">💬 Comprar por WhatsApp</a>
    </article>`).join("");
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
function setUser(u){ user = u; save("iap_user", u); renderAuth(); renderHeroCard(); renderRedeem(); closeLogin(); toast(`Bienvenido, ${u.name.split(" ")[0]} 👋`); loadMine(); }

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
function openLogin(){ $("#loginModal").classList.add("on"); initGoogle(); }
function closeLogin(){ $("#loginModal").classList.remove("on"); }
$("#closeLogin").onclick = closeLogin;
$("#loginModal").addEventListener("click", e => { if(e.target.id==="loginModal") closeLogin(); });

function avatarOf(sz){
  return user.picture ? `<img src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer">`
    : `<img alt="" src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="'+sz+'" height="'+sz+'"><rect width="'+sz+'" height="'+sz+'" fill="#1e6bff"/><text x="'+sz/2+'" y="'+sz*0.68+'" font-size="'+sz/2+'" text-anchor="middle" fill="#fff" font-family="Arial">'+esc(user.name[0].toUpperCase())+'</text></svg>')}">`;
}
function logout(){
  try{ window.google?.accounts?.id?.disableAutoSelect(); }catch{}
  user = null; save("iap_user", null); save("iap_cred", null); save("iap_has", false); cart = []; save("iap_cart", []);
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
  const adm = (user.email||"").toLowerCase()===CONFIG.ADMIN ? '<a class="btn btn-primary" href="admin.html" style="padding:8px 14px">Panel admin</a> ' : '';
  a.innerHTML = `${adm}${mine}<div class="user">${avatarOf(36)}<div class="uname">${esc(user.name)}<small>${esc(user.email)}</small></div><button id="logout">Salir</button></div>`;
  $("#logout").onclick = logout;
}
function renderHeroCard(){
  const c = $("#heroCard");
  if(user){
    c.innerHTML = `<div class="who">${avatarOf(72)}<h3>Hola, ${esc(user.name.split(" ")[0])}</h3><p>${esc(user.email)}</p></div>
      <a href="#catalogo" class="btn btn-primary full">Ver catálogo</a>
      <button class="btn btn-ghost full" id="heroLogout" style="margin-top:10px">Cerrar sesión</button>`;
    $("#heroLogout").onclick = logout;
  } else {
    c.innerHTML = `<h3>Inicia sesión</h3><p>Entra con tu cuenta de Google para comprar y ver tus pedidos.</p>
      <div id="gBtnHero" class="gbtn"></div><small class="legal">Usamos Google para identificarte. Nunca vemos tu contraseña.</small>`;
    initGoogle();
  }
}

/* ============ MI CUENTA (código de activación) ============ */
let myItems = null;
async function callApi(action, code){
  const cred = load("iap_cred", null);
  if(!CONFIG.API_URL) throw new Error("El servicio de cuentas aún no está configurado.");
  if(!cred || cred.exp < Date.now()) throw new Error("Tu sesión venció. Pulsa Salir y vuelve a entrar con Google.");
  const r = await fetch(CONFIG.API_URL, {method:"POST", body:JSON.stringify({action, code, idToken:cred.token})});
  const j = await r.json();
  if(!j.ok) throw new Error(j.error || "Error");
  return j.items;
}
function renderRedeem(){
  const box = $("#redeemBox"); if(!box) return;
  // quien ya tiene una cuenta activa no ve el panel de desbloqueo: va directo a su cuenta
  if(user && (load("iap_has", false) || (myItems&&myItems.length))){
    box.innerHTML = '<a class="btn btn-primary full" href="cuenta.html">🔓 Abrir mi cuenta</a><p class="note" style="margin-top:8px;color:var(--mut)">¿Compraste otra? Agrégala desde Mi cuenta.</p>';
    return;
  }
  if(!user){ box.innerHTML = '<button class="btn btn-google full" id="redeemLogin">Ingresar con Gmail para desbloquear</button>'; $("#redeemLogin").onclick = openLogin; return; }
  const list = (myItems&&myItems.length) ? '<a class="btn btn-primary full" style="margin-top:14px" href="cuenta.html">🔓 Abrir mi cuenta</a>' : '';
  box.innerHTML = `<form id="redeemForm" class="redeem-form"><input id="codeInput" placeholder="Ej: IAP-AB12-CD34" autocomplete="off" maxlength="40"><button class="btn btn-primary" type="submit">Desbloquear cuenta</button></form>
    <p class="note err" id="redeemErr" hidden></p>
    <div id="acctList">${myItems===null?'':(list||'')}</div>`;
  $("#redeemForm").onsubmit = async e => {
    e.preventDefault(); const err=$("#redeemErr"); err.hidden=true;
    const btn=e.target.querySelector("button"); btn.disabled=true; btn.textContent="Verificando…";
    try{ myItems = await callApi("redeem", $("#codeInput").value); toast("Cuenta desbloqueada ✔"); location.href = "cuenta.html"; return; }
    catch(ex){ err.textContent = ex.message; err.hidden=false; }
    renderRedeem_keep(err.textContent, !err.hidden);
  };
}
function renderRedeem_keep(msg, show){ renderRedeem(); if(show){ const e=$("#redeemErr"); e.textContent=msg; e.hidden=false; } }
document.addEventListener("click", e => {
  const t = e.target.closest("[data-copy]"); if(!t) return;
  copyText(t.dataset.copy).then(()=>toast("Copiado ✔"));
});
async function loadMine(){
  if(!user || !CONFIG.API_URL) return;
  try{
    myItems = await callApi("list"); save("iap_has", myItems.length>0); renderRedeem(); renderAuth();
    // quien ya desbloqueó una cuenta entra directo a su pantalla (correo, contraseña y autenticador)
    if(myItems.length && !/[?&]tienda/.test(location.search)) location.replace("cuenta.html");
  }catch{}
}

/* ============ INIT ============ */
$("#heroLogin").onclick = () => { if(user) toast("Ya iniciaste sesión ✔"); else $("#heroCard").scrollIntoView({behavior:"smooth",block:"center"}); };
$("#burger").onclick = () => { const on = $("#links").classList.toggle("on"); $("#burger").setAttribute("aria-expanded", on); };
$("#links").onclick = () => $("#links").classList.remove("on");
$("#waContact").href = `https://wa.me/${CONFIG.WHATSAPP}`;
$("#waFloat").href = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent("Hola, quiero información")}`;
$("#year").textContent = new Date().getFullYear();
observeReveal(); renderFilters(); renderGrid(); renderCart(); renderAuth(); renderHeroCard(); renderRedeem(); loadMine();

// brillo que sigue al mouse en las tarjetas
document.addEventListener("pointermove", e => {
  const c = e.target.closest?.(".card"); if(!c) return;
  const r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX-r.left)+"px"); c.style.setProperty("--my", (e.clientY-r.top)+"px");
});
