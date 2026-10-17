/* Panel de revendedor: solo lo que el dueño le permitió (generar códigos, ver SUS ventas, 2FA extra a SUS clientes).
   Todo se valida en el servidor; esta página nunca recibe correos ni contraseñas de las cuentas. */
const CLIENT_ID = "912360874722-idm6s6ujebsi7bbvmduq7ql88efb9uq9.apps.googleusercontent.com";
const API_URL = window.IAP_API;
const $ = s => document.querySelector(s);
const esc = s => String(s??"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const save = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const money = n => "$"+Math.round(Number(n)||0).toLocaleString("es-CO");
const fdate = iso => iso ? new Date(iso).toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"}) : "—";
let INFO = null, VENTAS = [], NUEVOS = [];

function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.add("on"); setTimeout(()=>t.classList.remove("on"),2600); }
function copyText(t){
  const fb=()=>new Promise(r=>{ const a=document.createElement("textarea"); a.value=t; a.setAttribute("readonly",""); a.style.cssText="position:fixed;opacity:0"; document.body.appendChild(a); a.select(); try{document.execCommand("copy");}catch{} a.remove(); r(); });
  return navigator.clipboard?.writeText ? navigator.clipboard.writeText(t).catch(fb) : fb();
}
function parseJwt(t){ const b=t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"); return JSON.parse(decodeURIComponent(atob(b).split("").map(c=>"%"+("00"+c.charCodeAt(0).toString(16)).slice(-2)).join(""))); }
function message(title, text, extra=""){ $("#app").innerHTML = `<div class="msg"><h2>${title}</h2><p>${text}</p>${extra}</div>`; }

async function api(action, data={}){
  const cred = load("iap_cred");
  if(!cred || cred.exp < Date.now()) throw new Error("Tu sesión venció. Inicia sesión otra vez.");
  const j = await postJson(API_URL, {...data, action, idToken:cred.token}); if(!j.ok) throw new Error(j.error||"Error"); return j;
}
function showLogin(){
  message("Panel de revendedor","Entra con la cuenta de Google que el dueño autorizó.",'<div id="g" style="display:inline-block"></div>');
  const go = () => {
    if(!window.google?.accounts?.id) return setTimeout(go,300);
    google.accounts.id.initialize({client_id:CLIENT_ID, callback:r=>{
      const p = parseJwt(r.credential);
      save("iap_cred",{token:r.credential,exp:p.exp*1000}); save("iap_user",{email:p.email,name:p.name||p.email,picture:p.picture||""});
      start();
    }});
    google.accounts.id.renderButton($("#g"),{theme:"outline",size:"large",shape:"pill",locale:"es"});
  };
  go();
}
function salir(){ try{ localStorage.removeItem("iap_cred"); localStorage.removeItem("iap_user"); }catch{} try{ google.accounts.id.disableAutoSelect(); }catch{} location.reload(); }

async function start(){
  const cred = load("iap_cred");
  if(!cred || cred.exp < Date.now()){ showLogin(); return; }
  try{
    INFO = await api("rev_info");
    $("#who").textContent = (INFO.nombre ? INFO.nombre + " · " : "") + INFO.email;
    $("#salir").hidden = false; $("#reload").hidden = false;
    render(); loadVentas();
  }catch(e){
    if(/sesión|venció|Inicia/i.test(e.message)) showLogin();
    else message("Sin acceso", esc(e.message), '<button class="btn" id="otra">Entrar con otra cuenta</button> <a class="btn" href="index.html">Ir a la tienda</a>');
    const o = $("#otra"); if(o) o.onclick = salir;
  }
}

function render(){
  const s = INFO.stats, prods = INFO.productos;
  $("#app").innerHTML = `
  <div class="stats">
    <div class="st"><b id="sHoy">${INFO.hoy} / ${INFO.tope}</b><span>Códigos generados hoy</span></div>
    <div class="st"><b>${s.activados}</b><span>Activados por tus clientes</span></div>
    <div class="st"><b>${s.activos}</b><span>Clientes con plan activo</span></div>
    <div class="st"><b>${money(s.valor)}</b><span>Valor de tus ventas</span></div>
  </div>
  <div class="card"><h2>🎟️ Generar código de activación</h2>
    ${prods.length ? `<form class="form" id="gen">
      <div><label for="gProd">Producto</label><select id="gProd">${prods.map(p=>`<option value="${esc(p.k)}" ${p.hay?"":"disabled"}>${esc(p.name)} · ${p.dias} días${p.hay?"":" (agotado)"}</option>`).join("")}</select></div>
      <div><label for="gCant">Cantidad</label><input id="gCant" type="number" min="1" max="20" value="1"></div>
      <div><label for="gRef">Para quién (opcional)</label><input id="gRef" maxlength="40" placeholder="Ej: Juan 300 123 4567"></div>
      <button class="btn p" id="gBtn" type="submit">Generar</button>
    </form>
    <div class="codes" id="nuevos"></div>
    <p class="note">Mándale el enlace a tu cliente: entra con su Google y el plan se le activa solo. Los códigos no caducan y cada uno sirve una sola vez. Tu tope es de ${INFO.tope} códigos al día.</p>`
    : `<p class="mut">Todavía no tienes productos habilitados. Pídele al dueño que te los active.</p>`}
  </div>
  ${INFO.d2fa ? `<div class="card"><h2>🔢 Códigos de verificación extra para tu cliente</h2>
    <p class="mut" style="margin-bottom:10px">Si a tu cliente se le acabaron los códigos de hoy, dale 2 más (máximo 3 veces al día).</p>
    <form class="tools" id="f2fa"><input id="c2fa" type="email" placeholder="Gmail de tu cliente" required><button class="btn p" type="submit">Dar 2 códigos más</button></form></div>` : ""}
  <div class="card"><h2>📋 Mis ventas</h2>
    <div class="tools"><input id="vq" placeholder="Buscar código, cliente o nota"><select id="vst"><option value="">Todas</option><option>Sin activar</option><option>Activa</option><option>Vencida</option></select></div>
    <div class="list" id="ventas"><div class="skel"></div></div>
  </div>`;
  const f = $("#gen"); if(f) f.onsubmit = generar;
  const g = $("#f2fa"); if(g) g.onsubmit = dar2fa;
  $("#vq").oninput = drawVentas; $("#vst").onchange = drawVentas;
  drawNuevos();
}
function mensaje(prod, dias, link){
  return `✅ ¡Listo! Aquí tienes tu acceso a ${prod}.\n\n👉 Actívalo aquí: ${link}\n\nAl abrir el enlace entra con tu cuenta de Google y tu plan de ${dias} días queda activo al instante. Ahí verás el correo, la contraseña y el código de verificación.\n\nℹ️ Es una cuenta compartida: no cambies la contraseña ni los datos de la cuenta.`;
}
function codeCard(c, prod, dias){
  const m = mensaje(prod, dias, c.link);
  return `<div class="code"><div class="h"><span class="mono">${esc(c.codigo)}</span> <span class="mut">· ${esc(prod)}</span></div>
    <div class="acts"><button class="btn s p" data-copy="${esc(m)}">📋 Copiar mensaje</button><button class="btn s" data-copy="${esc(c.link)}">🔗 Copiar enlace</button>
    <a class="btn s wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(m)}">💬 Enviar por WhatsApp</a></div></div>`;
}
function drawNuevos(){ const el = $("#nuevos"); if(el) el.innerHTML = NUEVOS.map(n=>codeCard(n, n.producto, n.dias)).join(""); }
async function generar(e){
  e.preventDefault(); const b = $("#gBtn"); b.disabled = true; b.textContent = "Generando…";
  try{
    const j = await api("rev_generar", {producto:$("#gProd").value, cantidad:+$("#gCant").value||1, ref:$("#gRef").value.trim()});
    NUEVOS = j.codigos.map(c=>({...c, producto:j.producto, dias:j.dias})).concat(NUEVOS).slice(0,40);
    INFO.hoy = j.hoy; $("#sHoy").textContent = j.hoy + " / " + j.tope; drawNuevos();
    if(j.codigos.length===1) copyText(mensaje(j.producto, j.dias, j.codigos[0].link)).then(()=>toast("Código listo · mensaje copiado ✔")); else toast(j.codigos.length+" códigos listos ✔");
    $("#gRef").value = ""; loadVentas();
  }catch(ex){ toast(ex.message); }
  b.disabled = false; b.textContent = "Generar";
}
async function dar2fa(e){
  e.preventDefault(); const btn = e.target.querySelector("button"); btn.disabled = true;
  try{ const j = await api("rev_2fa", {cliente:$("#c2fa").value.trim()}); toast("Listo: hoy puede pedir hasta "+j.limite+" códigos ✔"); $("#c2fa").value=""; }
  catch(ex){ toast(ex.message); }
  btn.disabled = false;
}
async function loadVentas(){
  try{ VENTAS = (await api("rev_ventas")).ventas; drawVentas(); }
  catch(ex){ const el=$("#ventas"); if(el) el.innerHTML = `<div class="empty">${esc(ex.message)}</div>`; }
}
function drawVentas(){
  const el = $("#ventas"); if(!el) return;
  const q = ($("#vq").value||"").toLowerCase(), st = $("#vst").value;
  const list = VENTAS.filter(v=>(!st || v.estado===st) && (!q || [v.codigo,v.cliente,v.nombre,v.ref,v.producto].join(" ").toLowerCase().includes(q)));
  const TAG = {"Activa":"t-ok","Sin activar":"t-w","Vencida":"t-b"};
  el.innerHTML = list.length ? list.map(v=>`<div class="it"><div class="h"><span class="mono">${esc(v.codigo)}</span><span class="tag ${TAG[v.estado]||""}">${esc(v.estado)}</span><b>${esc(v.producto)}</b><span class="mut">· generado ${esc(v.generado)}</span></div>
    <div class="mut">${v.ref?`Para: ${esc(v.ref)} · `:""}${v.cliente?`Cliente: <b>${esc(v.nombre||"")}</b> ${esc(v.cliente)} · vence ${fdate(v.fin)}${v.restante!=null&&v.estado==="Activa"?` (${v.restante} días)`:""}`:"Aún nadie lo activa"}</div>
    ${v.estado==="Sin activar"?`<div class="acts"><button class="btn s" data-copy="${esc(v.link)}">🔗 Copiar enlace</button><button class="btn s" data-anular="${esc(v.codigo)}">✖ Anular</button></div>`:""}</div>`).join("")
    : `<div class="empty">${VENTAS.length?"Nada coincide con la búsqueda.":"Aún no has generado códigos."}</div>`;
}
document.addEventListener("click", async e=>{
  const c = e.target.closest("[data-copy]"); if(c){ copyText(c.dataset.copy).then(()=>toast("Copiado ✔")); return; }
  const a = e.target.closest("[data-anular]");
  if(a){
    if(!confirm("¿Anular el código "+a.dataset.anular+"? Ya no servirá y se te devuelve el cupo de hoy si lo generaste hoy.")) return;
    a.disabled = true;
    try{ await api("rev_anular", {codigo:a.dataset.anular}); toast("Código anulado ✔"); NUEVOS = NUEVOS.filter(n=>n.codigo!==a.dataset.anular); drawNuevos(); INFO = await api("rev_info"); $("#sHoy").textContent = INFO.hoy+" / "+INFO.tope; loadVentas(); }
    catch(ex){ toast(ex.message); a.disabled = false; }
  }
});
$("#salir").onclick = salir;
$("#reload").onclick = () => start();
start();
