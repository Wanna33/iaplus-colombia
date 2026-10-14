/* ============ CONFIGURACIÓN (edita esto) ============ */
const CONFIG = {
  // 1) Crea un "OAuth Client ID" tipo Web en https://console.cloud.google.com/apis/credentials
  //    y agrega tu dominio (y http://localhost) en "Orígenes autorizados de JavaScript".
  GOOGLE_CLIENT_ID: "TU_CLIENT_ID.apps.googleusercontent.com",
  // 2) Tu número de WhatsApp con código de país, sin + ni espacios (Colombia = 57)
  WHATSAPP: "573000000000",
  STORE: "IA Plus Colombia",
};

/* ============ PRODUCTOS (edita nombres, precios y detalles) ============ */
const PRODUCTS = [
  {id:"chatgpt", name:"ChatGPT Plus", cat:"IA", ico:"🤖", price:45000, per:"/mes", hot:true, feats:["GPT de última generación","Generación de imágenes","Garantía durante el mes"]},
  {id:"gemini", name:"Gemini Advanced", cat:"IA", ico:"✨", price:35000, per:"/mes", feats:["Google AI Pro","2 TB de almacenamiento","Garantía durante el mes"]},
  {id:"claude", name:"Claude Pro", cat:"IA", ico:"🧠", price:55000, per:"/mes", feats:["Más uso y modelos avanzados","Proyectos y archivos","Garantía durante el mes"]},
  {id:"midjourney", name:"Midjourney", cat:"IA", ico:"🎨", price:40000, per:"/mes", feats:["Imágenes con IA","Modo rápido","Garantía durante el mes"]},
  {id:"canva", name:"Canva Pro", cat:"Diseño", ico:"🖌️", price:15000, per:"/mes", hot:true, feats:["Todas las plantillas premium","Quitar fondos","Kit de marca"]},
  {id:"capcut", name:"CapCut Pro", cat:"Diseño", ico:"🎬", price:18000, per:"/mes", feats:["Sin marca de agua","Efectos premium","Exporta en 4K"]},
  {id:"netflix", name:"Netflix", cat:"Streaming", ico:"🍿", price:14000, per:"/mes", feats:["Perfil individual","Calidad HD/4K","Soporte incluido"]},
  {id:"disney", name:"Disney+", cat:"Streaming", ico:"🏰", price:10000, per:"/mes", feats:["Perfil individual","Disney, Marvel, Star Wars","Soporte incluido"]},
  {id:"spotify", name:"Spotify Premium", cat:"Música", ico:"🎧", price:12000, per:"/mes", feats:["Sin anuncios","Descargas offline","En tu propio correo"]},
  {id:"youtube", name:"YouTube Premium", cat:"Música", ico:"▶️", price:10000, per:"/mes", feats:["Sin anuncios","YouTube Music incluido","Reproducción en segundo plano"]},
];

/* ============ UTILIDADES ============ */
const $ = s => document.querySelector(s);
const cop = n => "$" + n.toLocaleString("es-CO");
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

let user = load("iap_user", null);
let cart = load("iap_cart", []);
let filter = "Todos";

function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("on"); setTimeout(()=>t.classList.remove("on"),2400); }

/* ============ CATÁLOGO ============ */
function renderFilters(){
  const cats = ["Todos", ...new Set(PRODUCTS.map(p=>p.cat))];
  $("#filters").innerHTML = cats.map(c=>`<button class="chip ${c===filter?"on":""}" data-c="${c}">${c}</button>`).join("");
  $("#filters").onclick = e => { const c=e.target.dataset.c; if(c){ filter=c; renderFilters(); renderGrid(); } };
}
function renderGrid(){
  const list = PRODUCTS.filter(p => filter==="Todos" || p.cat===filter);
  $("#grid").innerHTML = list.map(p=>`
    <article class="card">
      ${p.hot?'<span class="badge">🔥 Popular</span>':''}
      <div class="ico">${p.ico}</div>
      <h3>${esc(p.name)}</h3>
      <div class="cat">${esc(p.cat)}</div>
      <ul>${p.feats.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>
      <div class="price">${cop(p.price)} <small>COP ${p.per}</small></div>
      <button class="btn btn-primary full" data-add="${p.id}">Agregar al carrito</button>
    </article>`).join("");
}
$("#grid").addEventListener("click", e => {
  const id = e.target.dataset.add; if(!id) return;
  if(!user){ openLogin(); toast("Primero ingresa con tu Gmail"); return; }
  cart.push(id); save("iap_cart", cart); renderCart(); toast("Agregado al carrito ✔");
});

/* ============ CARRITO ============ */
function renderCart(){
  $("#cartCount").textContent = cart.length;
  const body = $("#cartItems");
  if(!cart.length){ body.innerHTML = '<div class="empty">Tu carrito está vacío</div>'; $("#cartTotal").textContent = cop(0); return; }
  let total = 0;
  body.innerHTML = cart.map((id,i)=>{
    const p = PRODUCTS.find(x=>x.id===id); total += p.price;
    return `<div class="citem"><div>${p.ico} <b>${esc(p.name)}</b><small>${cop(p.price)} ${p.per}</small></div><button data-rm="${i}" aria-label="Quitar">🗑</button></div>`;
  }).join("");
  $("#cartTotal").textContent = cop(total);
}
$("#cartItems").addEventListener("click", e => {
  const i = e.target.dataset.rm; if(i===undefined) return;
  cart.splice(+i,1); save("iap_cart", cart); renderCart();
});
function openDrawer(on){ $("#drawer").classList.toggle("on",on); $("#overlay").classList.toggle("on",on); }
$("#cartBtn").onclick = () => openDrawer(true);
$("#closeCart").onclick = () => openDrawer(false);
$("#overlay").onclick = () => openDrawer(false);

$("#checkout").onclick = () => {
  if(!user){ openDrawer(false); openLogin(); return; }
  if(!cart.length){ toast("Tu carrito está vacío"); return; }
  const items = cart.map(id => PRODUCTS.find(p=>p.id===id));
  const total = items.reduce((a,p)=>a+p.price,0);
  const orders = load("iap_orders", []);
  orders.unshift({date:new Date().toLocaleString("es-CO"), email:user.email, items:items.map(p=>p.name), total});
  save("iap_orders", orders);
  const msg = `Hola ${CONFIG.STORE} 👋\nQuiero hacer este pedido:\n\n` +
    items.map(p=>`• ${p.name} - ${cop(p.price)}`).join("\n") +
    `\n\nTotal: ${cop(total)} COP\nMi Gmail: ${user.email}\nNombre: ${user.name}`;
  window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  cart = []; save("iap_cart", cart); renderCart(); openDrawer(false);
};
$("#myOrders").onclick = () => {
  if(!user){ openDrawer(false); openLogin(); return; }
  const mine = load("iap_orders", []).filter(o=>o.email===user.email);
  $("#cartItems").innerHTML = mine.length
    ? mine.map(o=>`<div class="order"><b>${cop(o.total)}</b><br>${o.items.map(esc).join(", ")}<br><small>${esc(o.date)}</small></div>`).join("")
    : '<div class="empty">Aún no tienes pedidos</div>';
  $("#cartTotal").textContent = "—";
  $(".drawer-head h3").textContent = "Mis pedidos";
  const back = () => { $(".drawer-head h3").textContent = "Tu carrito"; renderCart(); };
  $("#closeCart").addEventListener("click", back, {once:true});
  $("#overlay").addEventListener("click", back, {once:true});
};

/* ============ LOGIN REAL CON GOOGLE ============ */
const hasClientId = /^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(CONFIG.GOOGLE_CLIENT_ID);
let gReady = false;

function parseJwt(t){
  const b = t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
  return JSON.parse(decodeURIComponent(atob(b).split("").map(c=>"%"+("00"+c.charCodeAt(0).toString(16)).slice(-2)).join("")));
}
function setUser(u){ user = u; save("iap_user", u); renderAuth(); renderHeroCard(); closeLogin(); toast(`Bienvenido, ${u.name.split(" ")[0]} 👋`); }

function onGoogle(resp){
  // Para máxima seguridad, verifica resp.credential también en tu servidor.
  const p = parseJwt(resp.credential);
  const okIss = p.iss === "accounts.google.com" || p.iss === "https://accounts.google.com";
  if(!okIss || p.aud !== CONFIG.GOOGLE_CLIENT_ID || p.exp*1000 < Date.now() || !p.email_verified){
    toast("No se pudo verificar tu cuenta de Google"); return;
  }
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
  user = null; save("iap_user", null); cart = []; save("iap_cart", []);
  renderAuth(); renderCart(); renderHeroCard(); toast("Sesión cerrada");
}
function renderAuth(){
  const a = $("#authArea");
  if(!user){
    a.innerHTML = `<button class="btn btn-google" id="loginBtn">Ingresar con Gmail</button>`;
    $("#loginBtn").onclick = openLogin;
    return;
  }
  a.innerHTML = `<div class="user">${avatarOf(36)}<div class="uname">${esc(user.name)}<small>${esc(user.email)}</small></div><button id="logout">Salir</button></div>`;
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

/* ============ INIT ============ */
$("#heroLogin").onclick = () => { if(user) toast("Ya iniciaste sesión ✔"); else $("#heroCard").scrollIntoView({behavior:"smooth",block:"center"}); };
$("#burger").onclick = () => $("#links").classList.toggle("on");
$("#links").onclick = () => $("#links").classList.remove("on");
$("#waContact").href = `https://wa.me/${CONFIG.WHATSAPP}`;
$("#year").textContent = new Date().getFullYear();
renderFilters(); renderGrid(); renderCart(); renderAuth(); renderHeroCard();
