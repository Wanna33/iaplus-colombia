const CLIENT_ID = "912360874722-idm6s6ujebsi7bbvmduq7ql88efb9uq9.apps.googleusercontent.com";
const API_URL = "https://script.google.com/macros/s/AKfycbyIINkQAuYouCXVr722gi_8K1dHPLeF6N5XlmzHgCRA0ETF4cBc-VpIw0933mz1lFg8qA/exec";
const SITE = "https://wanna33.github.io/iaplus-colombia/";
const PRICES = {"ChatGPT":10000,"ChatGPT 3 meses":20000,"ChatGPT 6 meses":50000,"Claude Code":30000,"Gemini Pro":10000,"Flow":20000,"CapCut Pro":15000,"Filmora":10000,"Duolingo":30000,"Canva":10000,"Xbox Game Pass Ultimate":26000,"Adobe Premiere Pro":20000,"Adobe Photoshop":20000,"DaVinci Resolve":30000,"YouTube Premium":30000};
const DAYS = {"Duolingo":365,"YouTube Premium":90,"ChatGPT 3 meses":90,"ChatGPT 6 meses":180};
const daysOf = p => { const k = Object.keys(DAYS).find(x=>x.toLowerCase()===String(p||"").trim().toLowerCase()); return k ? DAYS[k] : 30; };
const DEFAULT_PRICE = 10000;
const priceOf = p => { const k = Object.keys(PRICES).find(x=>x.toLowerCase()===String(p||"").trim().toLowerCase()); return k ? PRICES[k] : DEFAULT_PRICE; };
const EMO = p => /capcut/i.test(p)?"🎬":/filmora/i.test(p)?"🎞️":/chatgpt/i.test(p)?"🤖":/claude/i.test(p)?"🧠":/youtube/i.test(p)?"▶️":/photoshop/i.test(p)?"🖼️":/premiere|adobe/i.test(p)?"🎬":/xbox|game ?pass/i.test(p)?"🎮":/canva/i.test(p)?"🎨":/duolingo/i.test(p)?"🦉":/gemini/i.test(p)?"✨":/flow/i.test(p)?"🎥":"📦";
function copyText(t){
  const fb=()=>new Promise(r=>{ const a=document.createElement("textarea"); a.value=t; a.setAttribute("readonly",""); a.style.cssText="position:fixed;opacity:0;top:0"; document.body.appendChild(a); a.select(); try{document.execCommand("copy");}catch{} a.remove(); r(); });
  return navigator.clipboard?.writeText ? navigator.clipboard.writeText(t).catch(fb) : fb();
}
const $ = s => document.querySelector(s);
const esc = s => String(s??"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const save = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const fdate = iso => iso ? new Date(iso).toLocaleDateString("es-CO",{timeZone:"America/Bogota",day:"2-digit",month:"short",year:"numeric"}) : "—";
const fdt = iso => iso ? new Date(iso).toLocaleString("es-CO",{timeZone:"America/Bogota",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";
const money = n => "$"+Math.round(Number(n)||0).toLocaleString("es-CO");
const norm = s => String(s??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
let items = [], busy = false, hlCode = "", curTab = "res", TTL = null; // TTL: minutos que dura un código sin canjear (0 = nunca)
try{ curTab = sessionStorage.getItem("iap_tab") || "res"; }catch{}
const DRAFT = "iap_admin_draft";
// Permanente (localStorage): producto, correo y días. Las contraseñas y claves 2FA solo duran mientras la pestaña esté abierta (sessionStorage).
const SENSITIVE = ["clave","k2"];
const draftGet = () => { try { return {...(JSON.parse(sessionStorage.getItem(DRAFT))||{}), ...(JSON.parse(localStorage.getItem(DRAFT))||{})}; } catch { return {}; } };
const draftSet = d => { try {
  const perm = {}, temp = {}; for(const k in d) (SENSITIVE.includes(k)?temp:perm)[k] = d[k];
  localStorage.setItem(DRAFT, JSON.stringify(perm)); sessionStorage.setItem(DRAFT, JSON.stringify(temp)); } catch {} };
const draftClear = () => { try { localStorage.removeItem(DRAFT); sessionStorage.removeItem(DRAFT); } catch {} };
const FIELDS = {fProd:"producto", fMail:"correo", fPass:"clave", fKey:"k2", fDays:"dias", fPrice:"precio"};
function restoreDraft(){
  const d = draftGet(); let any = false;
  for(const [id,k] of Object.entries(FIELDS)){ if(d[k]!==undefined && d[k]!==""){ $("#"+id).value = d[k]; if(k!=="producto"&&k!=="dias"&&k!=="precio") any = true; } }
  if(any){ $("#addBox").open = true; $("#draftNote").textContent = "Borrador recuperado automáticamente ✔"; }
}
function saveDraft(){
  const d = {}; for(const [id,k] of Object.entries(FIELDS)) d[k] = $("#"+id).value; draftSet(d);
  $("#draftNote").textContent = "Guardado automático ✔ (correo y días quedan guardados; contraseñas solo mientras esta pestaña esté abierta)";
}

function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.add("on"); setTimeout(()=>t.classList.remove("on"),2600); }
function message(title, text, extra=""){ $("#app").innerHTML = `<div class="msg"><h2>${title}</h2><p>${text}</p>${extra}</div>`; }
function parseJwt(t){ const b=t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"); return JSON.parse(decodeURIComponent(atob(b).split("").map(c=>"%"+("00"+c.charCodeAt(0).toString(16)).slice(-2)).join(""))); }

function loadAdminScript(src){
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector(`script[data-admin-module="${src}"]`);
    if(existing){if(existing.dataset.ready==="true")resolve();else{existing.addEventListener("load",resolve,{once:true});existing.addEventListener("error",reject,{once:true});}return;}
    const script=document.createElement("script");script.src=src;script.dataset.adminModule=src;script.onload=()=>{script.dataset.ready="true";resolve();};script.onerror=()=>{script.remove();reject(new Error("No se pudo cargar este módulo."));};document.body.append(script);
  });
}
function loadAdminStyle(href){
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector(`link[data-admin-style="${href}"]`);
    if(existing){if(existing.dataset.ready==="true")resolve();else{existing.addEventListener("load",resolve,{once:true});existing.addEventListener("error",reject,{once:true});}return;}
    const link=document.createElement("link");link.rel="stylesheet";link.href=href;link.dataset.adminStyle=href;link.onload=()=>{link.dataset.ready="true";resolve();};link.onerror=()=>{link.remove();reject(new Error("No se pudo cargar el estilo de esta sección."));};document.head.append(link);
  });
}

async function api(action, data={}){
  const cred = load("iap_cred");
  if(!cred || cred.exp < Date.now()) throw new Error("Tu sesión venció. Inicia sesión otra vez.");
  const j = await postJson(API_URL, {...data, action, idToken:cred.token}); if(!j.ok) throw new Error(j.error||"Error"); return j;
}

function showLogin(){
  message("Acceso del administrador","Inicia sesión con la cuenta de Google autorizada.",'<div id="g" style="display:inline-block"></div>');
  if(!window.google?.accounts?.id&&!document.querySelector('script[data-google-identity]')){
    const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;script.dataset.googleIdentity="true";
    script.onerror=()=>{const mount=$("#g");if(mount)mount.innerHTML='<p class="login-load-error" role="status">No se pudo cargar el acceso de Google. Revisa tu conexión e intenta de nuevo.</p>';};document.head.append(script);
  }
  let attempts=0;
  const go = () => {
    if(!window.google?.accounts?.id){if(++attempts<40)return setTimeout(go,250);const mount=$("#g");if(mount)mount.innerHTML='<p class="login-load-error" role="status">Google está tardando en responder. Revisa tu conexión e intenta de nuevo.</p>';return;}
    google.accounts.id.initialize({client_id:CLIENT_ID, callback:r=>{
      const p=parseJwt(r.credential);
      save("iap_cred",{token:r.credential,exp:p.exp*1000}); save("iap_user",{email:p.email,name:p.name||p.email,picture:p.picture||""});
      start();
    }});
    google.accounts.id.renderButton($("#g"),{theme:"outline",size:"large",shape:"pill",locale:"es"});
  };
  go();
}

async function refresh(){
  if(busy) return; busy = true;
  const reload = $("#reload"); if(reload){reload.disabled=true;reload.textContent="Actualizando…";}
  const syncStart=$("#syncState"); if(syncStart){syncStart.textContent="Actualizando datos…";syncStart.dataset.state="busy";}
  try{ const j = await api("admin_list"); if(!Array.isArray(j.items)) throw new Error("El servidor no devolvió una lista válida. Intenta actualizar otra vez."); items = j.items; if(j.ttl!==undefined) TTL = j.ttl; render();
    const sync=$("#syncState");if(sync){sync.textContent="Actualizado "+new Date().toLocaleTimeString("es-CO",{timeZone:"America/Bogota",hour:"2-digit",minute:"2-digit"});sync.dataset.state="ok";}
  }
  catch(e){
    if(/administrador/i.test(e.message)) message("Acceso denegado","Esta cuenta no es administradora.",'<a class="btn" href="index.html">Volver a la tienda</a>');
    else if(/sesión|venció|Inicia/i.test(e.message)) showLogin();
    else if($("#addForm")){ toast("No se pudo actualizar: "+e.message); const sync=$("#syncState");if(sync){sync.textContent="Datos pendientes de actualizar";sync.dataset.state="error";} }
    else message("No se pudo cargar", esc(e.message), '<button class="btn p" id="retry">Reintentar</button>'); { const r=document.getElementById("retry"); if(r) r.onclick=start; }
  }
  finally { busy = false; if(reload){reload.disabled=false;reload.textContent="↻ Actualizar";} }
}
function start(){
  const u = load("iap_user"); const cred = load("iap_cred");
  if(!cred || cred.exp < Date.now()){ showLogin(); return; }
  $("#who").textContent = u ? u.email : ""; $("#reload").classList.remove("hide"); $("#gSearch").classList.remove("hide"); $("#gSettings").classList.remove("hide");
  refresh().then(()=>{setTimeout(()=>{if(!document.hidden&&window.matchMedia("(min-width: 761px)").matches&&!$("#gSettings")?.classList.contains("hide"))loadSaldo();},2500);});
  clearInterval(window._saldoT); window._saldoT = setInterval(()=>{ if(!document.hidden&&window.matchMedia("(min-width: 761px)").matches) loadSaldo(); }, 300000);
}

/* ---------- Utilidades de datos ---------- */
function state(it){
  if(it.estado==="Con problemas" && !it.cliente) return {k:"pr", t:"Con problemas"};
  if(!it.cliente && (it.estado==="Sin código" || !it.codigo)) return {k:"nc", t:"Sin código"};
  if(!it.cliente) return {k:"av", t:"Disponible"};
  if(!IAPInsights.isActive(it,Date.now())) return {k:"b", t:"Vencida"};
  if(it.restante!==null && it.restante<=5) return {k:"w", t:"Por vencer"};
  return {k:"ok", t:"Activa"};
}
function waNum(n){ n=String(n||"").replace(/[^\d]/g,""); if(!n) return ""; if(n.length===10 && n[0]==="3") n="57"+n; return n; }
function waLink(num, text){ const n=waNum(num); return "https://wa.me/"+n+(text?"?text="+encodeURIComponent(text):""); }
function clients(){
  const m = new Map();
  items.filter(i=>i.cliente).forEach(i=>{
    const k = i.cliente.toLowerCase();
    const c = m.get(k) || {email:k, nombre:"", whatsapp:"", nota:"", cuentas:[], gastado:0, primera:null, ultima:null, vence:null, activos:0, vencidos:0, usos2fa:0};
    c.cuentas.push(i);
    c.nombre = c.nombre || i.nombre; c.whatsapp = c.whatsapp || i.whatsapp; c.nota = c.nota || i.nota;
    c.gastado += Number(i.precio)||0; c.usos2fa += i.usos2fa||0;
    if(i.inicio){ if(!c.primera || i.inicio<c.primera) c.primera=i.inicio; if(!c.ultima || i.inicio>c.ultima) c.ultima=i.inicio; }
    if(!IAPInsights.isActive(i,Date.now())) c.vencidos++; else { c.activos++; if(i.fin && (!c.vence || i.fin>c.vence)) c.vence=i.fin; }
    m.set(k,c);
  });
  return [...m.values()];
}
function cState(c){
  if(!c.activos) return {k:"b", t:"Vencido"};
  const r = Math.min(...c.cuentas.filter(i=>IAPInsights.isActive(i,Date.now())).map(i=>i.restante??9999));
  return r<=5 ? {k:"w", t:"Por vencer"} : {k:"ok", t:"Activo"};
}

/* ---------- Diálogos ---------- */
function askForm(title, fields, intro="", okLabel="Guardar"){
  return new Promise(res=>{
    const d=document.createElement("dialog");
    d.innerHTML=`<form method="dialog"><h2>${esc(title)}</h2>${intro?`<p style="color:var(--mut);font-size:14px;margin-bottom:12px">${intro}</p>`:""}
      <div class="form" style="grid-template-columns:1fr">${fields.map(f=>`<div>${f.type==="check"?`<label style="display:flex;gap:10px;align-items:center;cursor:pointer"><input type="checkbox" name="${f.id}" value="1" ${f.value?"checked":""} style="width:auto"> ${esc(f.label)}</label>`:`<label>${esc(f.label)}</label>`}${f.type==="check"?"":f.type==="select"?`<select name="${f.id}" required>${f.opts.map(o=>`<option value="${esc(o.v)}" ${o.v==f.value?"selected":""}>${esc(o.l)}</option>`).join("")}</select>`:f.area
        ?`<textarea name="${f.id}" rows="3" placeholder="${esc(f.ph||"")}">${esc(f.value||"")}</textarea>`
        :`<input name="${f.id}" type="${f.type||"text"}" value="${esc(f.value??"")}" placeholder="${esc(f.ph||"")}" autocomplete="off" ${f.req?"required":""}>`}</div>`).join("")}</div>
      <div class="acts" style="margin-top:16px;justify-content:flex-end"><button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn p" value="ok">${esc(okLabel)}</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener("close",()=>{ let out=null; if(d.returnValue==="ok"){ out={}; new FormData(d.querySelector("form")).forEach((v,k)=>out[k]=v); } d.remove(); res(out); });
    d.showModal();
  });
}
function showInfo(html){
  const d=document.createElement("dialog");
  d.innerHTML=html+`<div class="acts" style="margin-top:14px;justify-content:flex-end"><button class="btn p" id="dlgX">Cerrar</button></div>`;
  document.body.appendChild(d); d.querySelector("#dlgX").onclick=()=>d.close(); d.addEventListener("close",()=>d.remove()); d.showModal();
}

/* ---------- Vistas ---------- */
function statsHtml(){return businessKpisHtml();}

function monthsHtml(){
  const now = new Date(), rows = [];
  for(let k=11;k>=0;k--){
    const d = new Date(now.getFullYear(), now.getMonth()-k, 1);
    const its = items.filter(i=>{ if(!i.inicio||!i.cliente) return false; const x=new Date(i.inicio); return x.getMonth()===d.getMonth()&&x.getFullYear()===d.getFullYear(); });
    rows.push({l:d.toLocaleDateString("es-CO",{month:"short"}).replace(".",""), y:d.getFullYear(), n:its.length, v:its.reduce((s,i)=>s+(Number(i.precio)||0),0), cur:k===0});
  }
  const W=720, H=230, pl=8, pr=8, pt=26, pb=28, bw=(W-pl-pr)/rows.length, mx=Math.max(1,...rows.map(r=>r.v));
  const tot = rows.reduce((s,r)=>s+r.v,0), nTot = rows.reduce((s,r)=>s+r.n,0);
  const bars = rows.map((r,i)=>{ const h=Math.max(r.v?4:0,(H-pt-pb)*r.v/mx), x=pl+i*bw+bw*.18, y=H-pb-h, w=bw*.64;
    return `<g class="bar${r.cur?" cur":""}"><title>${r.l} ${r.y}: ${money(r.v)} · ${r.n} venta${r.n===1?"":"s"}</title><rect x="${x}" y="${pt}" width="${w}" height="${H-pt-pb}" rx="6" class="bg"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="fg"/>${r.v?`<text x="${x+w/2}" y="${y-7}" class="val">${r.v>=1e6?(r.v/1e6).toFixed(1)+"M":Math.round(r.v/1000)+"k"}</text>`:""}<text x="${x+w/2}" y="${H-9}" class="lbl">${r.l}</text></g>`; }).join("");
  return `<div class="chart-h"><div><b>${money(tot)}</b><small>${nTot} activaciones en 12 meses</small></div></div><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Valor de activaciones por mes de los últimos 12 meses"><defs><linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f43f5e"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>${bars}</svg>`;
}
function dailyHtml(){
  const D=86400000, today=new Date(); today.setHours(0,0,0,0); const pts=[];
  for(let k=29;k>=0;k--){ const t0=today.getTime()-k*D; pts.push({d:new Date(t0), n:items.filter(i=>i.cliente&&i.inicio&&(t=>t>=t0&&t<t0+D)(new Date(i.inicio).getTime())).length}); }
  const W=720,H=150,p=10, mx=Math.max(1,...pts.map(x=>x.n)), sx=(W-2*p)/(pts.length-1);
  const xy = pts.map((q,i)=>[p+i*sx, H-22-(H-44)*q.n/mx]);
  const line = xy.map((c,i)=>(i?"L":"M")+c[0].toFixed(1)+" "+c[1].toFixed(1)).join(" ");
  const area = line+` L${xy[xy.length-1][0].toFixed(1)} ${H-22} L${p} ${H-22} Z`;
  const total = pts.reduce((s,q)=>s+q.n,0), last7 = pts.slice(-7).reduce((s,q)=>s+q.n,0);
  const dots = xy.map((c,i)=>`<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${pts[i].n?3.5:0}"><title>${pts[i].d.toLocaleDateString("es-CO",{weekday:"short",day:"2-digit",month:"short"})}: ${pts[i].n} activación${pts[i].n===1?"":"es"}</title></circle>`).join("");
  const ticks = [0,7,14,21,29].map(i=>`<text x="${(p+i*sx).toFixed(1)}" y="${H-5}" class="lbl" text-anchor="${i===0?"start":i===29?"end":"middle"}">${pts[i].d.toLocaleDateString("es-CO",{day:"2-digit",month:"short"}).replace(".","")}</text>`).join("");
  return `<div class="chart-h"><div><b>${total}</b><small>activaciones en 30 días · ${last7} en los últimos 7</small></div></div><svg class="chart line" viewBox="0 0 ${W} ${H}" role="img" aria-label="Activaciones por día"><defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f43f5e" stop-opacity=".28"/><stop offset="1" stop-color="#f43f5e" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#gArea)"/><path d="${line}" class="ln"/>${dots}${ticks}</svg>`;
}
function mixHtml(){
  const m = new Map(); items.filter(i=>i.cliente&&IAPInsights.isActive(i,Date.now())).forEach(i=>m.set(i.producto, (m.get(i.producto)||0)+1));
  const arr = [...m.entries()].sort((a,b)=>b[1]-a[1]), tot = arr.reduce((s,a)=>s+a[1],0);
  if(!tot) return '<div class="empty">Aún no hay planes activos.</div>';
  const COL = ["#f43f5e","#8b5cf6","#ff8a65","#0ea5e9","#10b981","#f59e0b","#ec4899","#64748b"];
  const top = arr.slice(0,6), rest = arr.slice(6).reduce((s,a)=>s+a[1],0); if(rest) top.push(["Otros",rest]);
  const R=54, C=2*Math.PI*R; let off=0;
  const segs = top.map((a,i)=>{ const len=C*a[1]/tot, el=`<circle r="${R}" cx="70" cy="70" fill="none" stroke="${COL[i%COL.length]}" stroke-width="18" stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"><title>${esc(a[0])}: ${a[1]} (${Math.round(a[1]/tot*100)}%)</title></circle>`; off+=len; return el; }).join("");
  return `<div class="mix"><svg viewBox="0 0 140 140" class="donut" role="img" aria-label="Planes activos por producto"><g transform="rotate(-90 70 70)">${segs}</g><text x="70" y="66" class="dn">${tot}</text><text x="70" y="84" class="dl">activos</text></svg>
    <ul class="legend">${top.map((a,i)=>`<li><i style="background:${COL[i%COL.length]}"></i><span>${esc(a[0])}</span><b>${a[1]}</b><small>${Math.round(a[1]/tot*100)}%</small></li>`).join("")}</ul></div>`;
}
/* actividad reciente de clientes en el tablero */
let FEED = {t:0, list:[]}, feedTimer=0, feedLoading=false;
const ago = iso => { const s=(Date.now()-new Date(iso))/1000; if(s<60) return "hace un momento"; if(s<3600) return "hace "+Math.floor(s/60)+" min"; if(s<86400) return "hace "+Math.floor(s/3600)+" h"; return new Date(iso).toLocaleDateString("es-CO",{day:"2-digit",month:"short"}); };
function drawFeed(){
  const el = $("#feed"); if(!el) return;
  el.innerHTML = FEED.list.length ? FEED.list.map(l=>`<li><span class="fd-dot"></span><div><b>${esc(l.evento)}</b><small>${esc(l.quien)} · ${esc(String(l.detalle||"").replace(/ · (Android|iPhone|Windows|Mac|Linux|Otro) · .*$/,""))}</small></div><time title="${esc(fdtL(l.fecha).replace(/<[^>]+>/g,""))}">${ago(l.fecha)}</time></li>`).join("") : '<li class="empty">Sin movimientos recientes.</li>';
}
async function loadFeed(force){
  if(!$("#feed")) return;
  if(force&&feedTimer){clearTimeout(feedTimer);feedTimer=0;}
  if(!force&&!FEED.t){
    if(!feedTimer)feedTimer=setTimeout(()=>{feedTimer=null;if(!document.hidden&&curTab==="res")loadFeed(true);},1500);
    return;
  }
  if(!force && Date.now()-FEED.t < 60000){ drawFeed(); return; }
  if(feedLoading)return;feedLoading=true;
  try{ const r = (await api("admin_log")).log; const adm = (load("iap_user")||{}).email;
    FEED = {t:Date.now(), list:r.slice(0,12)}; drawFeed(); if($("#feedStatus")) $("#feedStatus").textContent="Últimos "+FEED.list.length+" eventos registrados · actualizado "+new Date().toLocaleTimeString("es-CO",{timeZone:"America/Bogota",hour:"2-digit",minute:"2-digit"}); }
  catch{ $("#feed").innerHTML = '<li class="empty">No se pudo cargar la actividad.</li>'; }
  finally{feedLoading=false;}
}
/* tabla de productos: ventas, ingresos y cupo */
function prodTableHtml(){
  const cap = getCap(), cm = capMap(), m = new Map();
  items.forEach(i=>{ const k=i.producto||"—"; const a=m.get(k)||{k,cuentas:new Set(),act:0,tot:0,libre:0,ing:0,mes:0}; a.cuentas.add(i.correo.toLowerCase());
    if(i.cliente){ a.tot++; if(IAPInsights.isActive(i,Date.now())) a.act++; a.ing+=Number(i.precio)||0; const d=i.inicio&&new Date(i.inicio), n=new Date(); if(d&&d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()) a.mes+=Number(i.precio)||0; }
    else if(state(i).k==="av") a.libre++; m.set(k,a); });
  const list = [...m.values()].sort((a,b)=>b.ing-a.ing);
  if(!list.length) return '<div class="empty">Aún no hay productos.</div>';
  return `<div class="wrapt"><table class="ptable"><thead><tr><th>Producto</th><th>Precio</th><th>Plan</th><th>Activos</th><th>Códigos libres</th><th>Vendidos</th><th>Ingresos del mes</th><th>Ingresos totales</th><th>Clientes en sus cuentas</th><th></th></tr></thead><tbody>${list.map(a=>{
    const accs=[...a.cuentas].map(c=>cm.get(c)).filter(x=>x&&!x.prob), usados=accs.reduce((t,x)=>t+Math.min(cap,used(x)),0), total=accs.length*cap, pct=total?Math.round(usados/total*100):0, cls=pct>=100?"full":pct>=80?"hi":"";
    return `<tr><td data-l="Producto"><b>${EMO(a.k)} ${esc(a.k)}</b></td><td data-l="Precio">${money(priceOf(a.k))}</td><td data-l="Plan">${daysOf(a.k)} días</td><td data-l="Activos"><b>${a.act}</b></td><td data-l="Códigos libres">${a.libre?`<span class="tag t-av">${a.libre}</span>`:'<span class="tag t-w">0</span>'}</td><td data-l="Vendidos">${a.tot}</td><td data-l="Ingresos del mes">${money(a.mes)}</td><td data-l="Ingresos totales"><b>${money(a.ing)}</b></td>
      <td data-l="Clientes">${noCap()?`<b>${accs.reduce((t,x)=>t+used(x),0)}</b> <small style="color:var(--mut)">en ${accs.length} cta${accs.length===1?"":"s"}</small>`:`<span class="capbar ${cls}" title="${usados} de ${total} lugares ocupados en ${accs.length} cuenta(s)"><i style="width:${Math.min(100,pct)}%"></i></span> <b class="capn ${cls}">${pct}%</b> <small style="color:var(--mut)">${accs.length} cta${accs.length===1?"":"s"}</small>`}</td>
      <td class="acts-td"><button class="btn s p" data-genp="${esc(a.k)}">🎲 Generar códigos</button></td></tr>`; }).join("")}</tbody></table></div>`;
}
function byProductHtml(){
  const m = new Map();
  items.forEach(i=>{ const k=i.producto||"—"; const a=m.get(k)||{k,act:0,tot:0,libre:0,ing:0}; if(i.cliente){ a.tot++; if(IAPInsights.isActive(i,Date.now())) a.act++; a.ing+=Number(i.precio)||0; } else a.libre++; m.set(k,a); });
  return [...m.values()].map(a=>`<div class="pcard"><div class="pe">${EMO(a.k)}</div><b>${esc(a.k)}</b><div class="pn">${a.act} <small>activos</small></div><div class="pm">${a.tot} vendidos · ${a.libre} libres</div><div class="pm"><b>${money(a.ing)}</b> ingresos</div></div>`).join("") || '<div class="empty">Aún no hay productos.</div>';
}
function passListHtml(){
  const m = new Map();
  items.forEach(i=>{ const k=(i.producto||"")+"|"+i.correo.toLowerCase(); const a=m.get(k)||{k,producto:i.producto,correo:i.correo,clave:i.clave,total:0,clientes:0}; a.total++; if(i.cliente&&IAPInsights.isActive(i,Date.now())) a.clientes++; m.set(k,a); });
  return [...m.values()].map(a=>`<div class="passrow"><div class="pr-info"><b>${EMO(a.producto)} ${esc(a.producto)}</b><span class="mono">${esc(a.correo)}</span><small>${a.clientes} ${a.clientes===1?"cliente activo":"clientes activos"} · ${a.total} ${a.total===1?"código":"códigos"}</small></div>
    <div class="pr-cap">${(()=>{ const c=capMap().get(a.correo.toLowerCase()); return c?capBar(c,getCap()):""; })()}</div>
    <input class="pr-in" data-pk="${esc(a.k)}" data-orig="${esc(a.clave)}" value="${esc(a.clave)}" autocomplete="off" aria-label="Contraseña de ${esc(a.correo)}">
    <button class="btn s p" data-ps="${esc(a.k)}" disabled>Guardar</button></div>`).join("") || '<div class="empty">Aún no hay cuentas.</div>';
}
async function savePass(k){
  const inp = document.querySelector(`.pr-in[data-pk="${CSS.escape(k)}"]`), btn = document.querySelector(`[data-ps="${CSS.escape(k)}"]`); if(!inp) return;
  const nueva = inp.value.trim(), i = items.find(x=>((x.producto||"")+"|"+x.correo.toLowerCase())===k);
  if(!i || !nueva || nueva===i.clave) return;
  btn.disabled = true; btn.textContent = "Guardando…";
  try{
    const fin = await setPasswordEverywhere(i.correo, nueva);
    const mal = fin.filter(x=>x.clave!==nueva).length, cli = fin.filter(x=>x.cliente).length;
    toast(mal ? "⚠️ "+mal+" código(s) no se actualizaron. Pulsa Guardar otra vez" : "Contraseña actualizada ✔ para "+cli+(cli===1?" cliente":" clientes"));
    if(!mal) offerNotify(i.correo, i.producto);
  }catch(ex){ toast(ex.message); }
  const pl = $("#passList"); if(pl) pl.innerHTML = passListHtml();
}
function byAccountHtml(){
  const m = new Map();
  items.forEach(i=>{ const k=i.producto+" — "+i.correo; const a=m.get(k)||{k,fila:i.fila,act:0,tot:0,libre:0,v:0};
    if(i.cliente){ a.tot++; if(!IAPInsights.isActive(i,Date.now())) a.v++; else a.act++; } else a.libre++; m.set(k,a); });
  return [...m.values()].map(a=>`<div class="accrow"><div class="accname">${esc(a.k)}</div>
    <span class="tag t-ok">${a.act} activos</span><span class="tag t-av">${a.libre} códigos libres</span><span class="tag t-b">${a.v} vencidos</span><span class="tag t-g">${a.tot} clientes en total</span><span class="caprow2">${(()=>{ const c=capMap().get(a.k.split(" — ").slice(1).join(" — ").toLowerCase()); return c?capBar(c,getCap()):""; })()}</span><button class="btn s p" data-pa="${a.fila}">🔑 Cambiar contraseña</button></div>`).join("") || '<div class="empty">Aún no hay cuentas.</div>';
}
const prevN = [];
function countUp(){
  document.querySelectorAll("[data-n]").forEach((el,idx)=>{
    const to = +el.dataset.n, from = +(prevN[idx]||0); prevN[idx] = to;
    if(from===to){ el.textContent = to; return; }
    const t0 = performance.now(), dur = 700;
    const step = t => { const p = Math.min(1,(t-t0)/dur); el.textContent = Math.round(from+(to-from)*(1-Math.pow(1-p,3))); if(p<1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
/* ---------- Navegación: menú lateral (computador) y barra inferior (celular) ---------- */
const IC = {
  dios:'<path d="M12 2l2.6 6.3L21 9l-5 4.4L17.5 20 12 16.6 6.5 20 8 13.4 3 9l6.4-.7z"/>',
  res:'<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  cli:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
  pay:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  wa:'<path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-4.8A8.5 8.5 0 1 1 20.5 11.5z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5"/>',
  cod:'<path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"/><path d="M10 7v12" stroke-dasharray="2 2"/>',
  cta:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
  prod:'<path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  log:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ag:'<rect x="5" y="7" width="14" height="12" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6"/>',
  rev:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/>',
  more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
};
const svgI = k => `<svg class="nvi" viewBox="0 0 24 24" aria-hidden="true">${IC[k]||""}</svg>`;
const NAV = [
  {g:"General", t:"local", l:"Bots sin API", s:"Automatizaciones locales · sin consumo de IA · mientras el panel está abierto"},
  {g:"General", t:"res", l:"Tablero", s:"Así va tu negocio hoy"},
  {g:"General", t:"dios", l:"Modo Dios", s:"Precios, instrucciones y asistente con cambios revisados"},
  {g:"Ventas", t:"cli", l:"Clientes", s:"Todos tus clientes, sus planes y vencimientos"},
  {g:"Ventas", t:"wa", l:"WhatsApp", s:"Ventas del asistente de WhatsApp: confirma el pago y se envía el enlace"},
  {g:"Ventas", t:"pay", l:"Pedidos en línea", s:"Pedidos de Wompi y PayPal"},
  {g:"Inventario", t:"cod", l:"Códigos", s:"Genera y administra los códigos de activación"},
  {g:"Inventario", t:"cta", l:"Cuentas", s:"Correos, contraseñas y cupo de cada cuenta"},
  {g:"Inventario", t:"prod", l:"Productos", s:"Ventas, ingresos y cupo libre por producto"},
  {g:"Control", t:"ag", l:"Mi empresa", s:"Tus empleados de IA trabajando 24/7: quién hace qué, su nivel y sus tareas"},
  {g:"Control", t:"rev", l:"Revendedores", s:"Personas que autorizas para vender, con permisos limitados"},
  {g:"Control", t:"log", l:"Actividad", s:"Cada movimiento de tus clientes con fecha y hora"}
];
let WAV = []; // ventas del asistente de WhatsApp
function navBadges(){
  const porVencer = clients().filter(c=>cState(c).k==="w").length;
  const libres = items.filter(i=>state(i).k==="av").length;
  const waP = WAV.filter(v=>v.estado==="POR CONFIRMAR"||v.estado==="NO VERIFICADO"||v.estado==="NECESITA AYUDA"||v.estado==="RECLAMO").length;
  return {cli:porVencer?{n:porVencer,c:"w",t:"clientes por vencer"}:null, cod:{n:libres,c:"",t:"códigos disponibles"}, wa:waP?{n:waP,c:"w",t:"ventas de WhatsApp por atender"}:null};
}
function drawNav(){
  const b = navBadges(); let g = "";
  $("#sideNav").innerHTML = NAV.map(n=>{ const h = n.g!==g ? `<div class="nvg">${n.g}</div>` : ""; g = n.g; const bd = b[n.t];
    return h+`<button type="button" class="nv" data-t="${n.t}" title="${esc(n.s)}" aria-label="${esc(n.l)}: ${esc(n.s)}">${svgI(n.t)}<span>${n.l}</span>${bd?`<em class="nvb ${bd.c}" title="${bd.n} ${bd.t}">${bd.n}</em>`:""}</button>`; }).join("");
}
function openSide(on){ document.body.classList.toggle("side-open", !!on); $("#sideBtn")?.setAttribute("aria-expanded",String(!!on)); }
let catalogReady=false,catalogPromise=null;
function ensureCatalog(){
  if(catalogReady)return Promise.resolve();
  if(!catalogPromise)catalogPromise=api("admin_catalogo").then(j=>{GPRODS=j.productos||[];catalogReady=true;syncPrecios();if(curTab==="cod")fillAuto();if(curTab==="prod")drawProds();}).catch(()=>{}).finally(()=>{catalogPromise=null;});
  return catalogPromise;
}
function setTab(t){
  const previousTab=curTab;
  if(!NAV.some(n=>n.t===t)) t = "res";
  curTab = t; try{ sessionStorage.setItem("iap_tab", t); }catch{}
  document.querySelectorAll(".nv[data-t],.tabs button[data-t]").forEach(b=>{ const on=b.dataset.t===t; b.classList.toggle("on", on); if(on) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current"); });
  const more = document.querySelector('.tabs button[data-t="more"]'); if(more) more.classList.toggle("on", !["res","cli","cod","cta"].includes(t));
  document.querySelectorAll("[id^=tab-]").forEach(s=>s.classList.toggle("hide", s.id!=="tab-"+t));
  const n = NAV.find(x=>x.t===t); $("#pageTitle").textContent = n.l; $("#pageSub").textContent = n.s; document.title = n.l + " · Panel IA Plus";
  openSide(false);
  if(previousTab!==t) window.scrollTo({top:0,left:0,behavior:"instant"});

  if(t==="log"){ loadLog(logCli); loadSeg(); }
  if(t==="pay") loadPagos();
  if(t==="wa") loadWa();
  if(t==="rev") loadRev();
  if(t==="ag") loadAgentes();
  if(t==="dios" && !godDirty && !godSaving) loadDios();
  if(t==="res") loadFeed();
  if(t==="prod"){ $("#byProd").innerHTML=byProductHtml();$("#prodTable").innerHTML=prodTableHtml(); }
  if(t==="cli") crows();
  if(t==="cod"){fillAccounts();fillAuto();rows();updateGeneratorPreview();ensureCatalog();}
  if(t==="cta"){if(!$("#passList").contains(document.activeElement))$("#passList").innerHTML=passListHtml();fillAccounts();}
  if(t==="local")Promise.all([loadAdminStyle("local-bots.css"),loadAdminScript("local-bots.js")]).then(()=>window.IAPLocalBots?.mount(document.getElementById("localBots"),items)).catch(()=>{const el=$("#localBots");if(el)el.innerHTML='<div class="empty">No se pudo cargar esta sección. Comprueba la conexión e inténtalo de nuevo.</div>';});
}
function updateViews(){
  $("#stats").innerHTML = statsHtml(); $("#alerts").innerHTML = alertsHtml(); $("#attn").innerHTML = attentionHtml(); $("#due").innerHTML = dueHtml(); $("#months").innerHTML = monthsHtml();
  if(!$("#profit").contains(document.activeElement)) $("#profit").innerHTML = profitHtml();
  $("#daily").innerHTML = dailyHtml(); $("#mix").innerHTML = mixHtml(); drawBusinessInsights(); drawNav(); setTab(curTab); countUp();
  const u = load("iap_user")||{}; const h = new Date().getHours(); $("#hello").innerHTML = `${h<12?"Buenos días":h<19?"Buenas tardes":"Buenas noches"}${u.name?", "+esc(String(u.name).split(" ")[0]):""} 👋<small>${new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long"})}</small>`;
}
function render(){
  if($("#addForm")){ updateViews(); return; }
  $("#app").innerHTML = `
  <div class="tabs">
    <button data-t="res">${svgI("res")}<span>Tablero</span></button><button data-t="cli">${svgI("cli")}<span>Clientes</span></button><button data-t="cod">${svgI("cod")}<span>Códigos</span></button><button data-t="cta">${svgI("cta")}<span>Cuentas</span></button><button data-t="more" id="moreBtn">${svgI("more")}<span>Más</span></button>
  </div>

  <section id="tab-local" class="hide"><div id="localBots"></div></section>
  <section id="tab-res">
    <div class="dash-top"><h2 class="hello" id="hello"></h2>
      <div class="qa">
        <button class="btn p" data-qa="gen">🎲 Generar código</button>
        <button class="btn" data-qa="acc">➕ Agregar cuenta</button>
        <button class="btn" data-qa="pass">🔑 Cambiar contraseña</button>
        <button class="btn" data-qa="avisar">💬 Avisar vencimientos</button>
        <button class="btn" data-goto="dios">⚡ Modo Dios</button>
        <button class="btn" data-goto="rev">🤝 Revendedores</button>
      </div></div>
    <div class="insight-toolbar"><div><span class="overline">TU NEGOCIO EN UN VISTAZO</span><p>Clientes, activaciones y disponibilidad con los datos del panel.</p></div><div><label for="insightPeriod">Periodo de análisis</label><select id="insightPeriod"><option value="1">Hoy</option><option value="7">Últimos 7 días</option><option value="30" selected>Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="0">Todo el historial</option></select><button class="btn" id="insightExport" type="button">Descargar resumen</button></div></div>
    <div class="kpis business-kpis" id="stats"></div><p class="insight-scope" id="insightScope"></p><div id="businessInsights" class="business-insights"></div>
    <div class="dgrid">
      <div class="card span2"><h2>Valor de activaciones por mes</h2><div id="months"></div><p class="hint">Activaciones por fecha de canje; el monto es el precio anotado en cada código.</p></div>
      <div class="card"><h2>Planes activos por producto</h2><div id="mix"></div></div>
      <div class="card span2"><h2>Activaciones por día</h2><div id="daily"></div></div>
      <div class="card"><h2>Actividad reciente del negocio <button class="btn s ghost" data-goto="log" style="float:right">Ver todo</button></h2><p class="hint" id="feedStatus" role="status"></p><ul class="feed" id="feed"><li class="empty">Cargando…</li></ul></div>
      <div class="card"><h2>🔔 Alertas</h2><div id="alerts" class="alerts"></div></div>
      <div class="card span2"><h2>📅 Vencimientos de los próximos 14 días</h2><div id="due"></div></div>
      <div class="card span3"><h2>⚠️ Requieren atención (por vencer y vencidos)</h2><div id="attn"></div></div>
      <div class="card span3"><h2>Estimación de valor y costos por correo de acceso</h2><div id="profit"></div></div>
    </div>
  </section>

  <section id="tab-prod" class="hide">
    <div class="card"><h2>🛍️ Productos</h2><p class="hint" style="margin:0 0 12px">Ordenados por ingresos. «Clientes en sus cuentas» es cuántos clientes activos hay repartidos en las cuentas de cada producto (sin tope por cuenta).</p><div id="prodTable"></div></div>
    <div class="card"><h2>Resumen por producto</h2><div id="byProd" class="prodgrid"></div></div>
  </section>

  <section id="tab-wa" class="hide">
    <div class="card"><h2>💬 Conversaciones</h2>
      <p style="color:var(--mut);font-size:14px;margin-bottom:12px">Todos los chats de clientes que atiende el asistente. Puedes leerlos y, si quieres, escribirle tú a un cliente: el mensaje sale desde tu WhatsApp. El asistente sigue atendiendo; usa <b>Pausar asistente</b> solo si quieres llevar tú ese chat.</p>
      <div class="tools"><input id="ibQ" placeholder="Buscar nombre, número o mensaje" style="min-width:200px"><select id="ibF"><option value="">Todos</option><option value="sin">Sin responder</option><option value="pendiente">⏳ Pendientes (no han comprado)</option><option value="pago">✅ Pagaron</option><option value="interesado">🔥 Interesados</option><option value="alerta">🚨 Urgentes y quejas</option><option value="pausa">⏸ Asistente en pausa</option></select><button class="btn s" id="ibReload">↻</button></div>
      <div class="inbox"><div class="ib-list" id="ibList"><div class="empty">Cargando…</div></div><div class="ib-chat" id="ibChat"><div class="empty" style="margin:auto">Elige un chat para verlo.</div></div></div>
    </div>
    <div class="card"><h2>💬 Ventas por WhatsApp</h2>
      <p style="color:var(--mut);font-size:14px;margin-bottom:12px">Claude analiza los comprobantes y activa automáticamente los pagos válidos. Esta lista muestra el resultado y solo deja una acción manual para excepciones que no se pueden validar solas.</p>
      <div class="tools"><select id="waSt"><option value="pend">Por atender</option><option value="">Todas</option></select><button class="btn s" id="waReload">↻ Recargar</button></div>
      <div id="waRows" class="walist"><div class="empty">Cargando…</div></div>
    </div>
    <div class="card"><h2>🏷️ Clientes y etiquetas</h2>
      <p style="color:var(--mut);font-size:14px;margin-bottom:12px">El asistente marca a cada cliente según cómo va la conversación. Los <b>urgentes</b> también te llegan por correo.</p>
      <div class="tools"><select id="waEt"><option value="">Todas las etiquetas</option><option value="pendiente">⏳ Pendiente</option><option value="urgente">🚨 Urgente</option><option value="queja">😠 Queja</option><option value="reembolso">💸 Reembolso</option><option value="pago">✅ Pagó</option><option value="interesado">🔥 Interesado</option><option value="no_interesado">🙅 No interesado</option></select><input id="waEtQ" placeholder="Buscar nombre o número…"></div>
      <div id="waCli" class="walist"><div class="empty">Cargando…</div></div>
    </div>
    <details class="card" id="waCfgBox"><summary style="cursor:pointer;font-weight:700;font-size:16px">⚙️ Conexión del asistente</summary><div id="waCfg" style="margin-top:12px">Cargando…</div></details>
  </section>

  <section id="tab-pay" class="hide">
    <div class="card"><h2>💳 Pagos en línea (Wompi)</h2>
      <div id="payCfg" class="paycfg"></div>
      <div class="tools"><button class="btn s" id="payReload">↻ Recargar pedidos</button></div>
      <div class="wrapt"><table style="min-width:640px"><thead><tr><th>Fecha</th><th>Cliente</th><th>Producto</th><th>Monto</th><th>Estado</th><th>Referencia</th><th></th></tr></thead><tbody id="payRows"><tr><td colspan="7" class="empty">Cargando…</td></tr></tbody></table></div>
    </div>
  </section>

  <section id="tab-cli" class="hide">
    <div class="card"><h2>👥 Todos mis clientes</h2>
      <div class="tools">
        <input id="cq" placeholder="Buscar por nombre, Gmail, WhatsApp o nota…">
        <select id="cst"><option value="">Todos</option><option value="ok">Activos sin alerta</option><option value="active-all">Todos los activos</option><option value="inactive-all">Sin plan vigente</option><option value="due7">Vencen en 7 días</option><option value="w">Por vencer</option><option value="b">Vencidos</option></select>
        <select id="cso"><option value="rest">Ordenar: vencen primero</option><option value="gasto">Ordenar: más pagaron</option><option value="nuevo">Ordenar: más recientes</option><option value="nombre">Ordenar: nombre</option></select>
        <button class="btn s" id="ccsv">⬇ Exportar clientes CSV</button>
      </div>
      <div class="tools hide bulk-bar" id="cBulk" role="region" aria-label="Acciones con los clientes seleccionados">
        <b id="cBulkN">0 seleccionados</b>
        <button class="btn s" id="cBulkCsv">⬇ Exportar seleccionados</button>
        <button class="btn s" id="cBulkTel">📋 Copiar WhatsApp</button>
        <button class="btn s" id="cBulkClr">Quitar selección</button>
      </div>
      <div class="wrapt"><table><thead><tr><th class="sel-th"><input type="checkbox" id="cselAll" aria-label="Seleccionar todos los clientes visibles"></th><th>Cliente</th><th>WhatsApp</th><th>Cuentas</th><th>Estado</th><th>Vence</th><th>Cliente desde</th><th>Total pagado</th><th>Nota</th><th>Acciones</th></tr></thead><tbody id="crows"></tbody></table></div>
    </div>
  </section>

  <section id="tab-cod" class="hide">
    <div class="admin-section-intro"><span class="overline">ENTREGA PROFESIONAL</span><h2>Códigos listos para tus clientes.</h2><p>Configura el plan, revisa el lote y entrega un enlace de activación claro.</p></div>
    <div class="card generator-card"><div class="card-heading"><div><span class="overline">GENERADOR DE ACCESOS</span><h2>Prepara tu próximo lote</h2></div><span class="tag t-av">Un código · un uso</span></div>
      <p style="color:var(--mut);font-size:14px;margin-bottom:12px">Los códigos se distribuyen entre las cuentas disponibles de menor carga. Las cuentas marcadas con problemas quedan fuera. Hasta 200 códigos por lote.</p>
      <div class="generator-presets" role="group" aria-label="Plan rápido de ChatGPT"><span>ChatGPT rápido</span><button type="button" data-code-preset="ChatGPT">1 mes</button><button type="button" data-code-preset="ChatGPT 3 meses">3 meses</button><button type="button" data-code-preset="ChatGPT 6 meses">6 meses</button></div>
      <form id="autoForm" class="form">
        <div><label>Producto</label><select id="aProd" required></select></div>
        <div><label>Cantidad de códigos</label><input id="aQty" type="number" min="1" max="200" step="1" value="1" required></div>
        <div><label>Días del plan</label><input id="aDays" type="number" min="1" max="366" value="30" required></div>
        <div><label>Precio (COP)</label><input id="aPrice" type="number" min="0" step="500" value="10000"></div>
        <div><button class="btn p" style="width:100%" type="submit">Revisar y generar →</button></div>
      </form>
      <div id="generatorPreview" class="generator-preview" aria-live="polite"></div>
      <div id="batchProgress" class="batch-progress" hidden><div><b id="batchProgressText">Preparando lote…</b><span>No cierres esta pestaña.</span></div><progress max="100" value="0"></progress></div>
      <details class="generator-options"><summary>Vigencia del código y opciones de reparto</summary><div class="ttlbox"><span>🛡️ <b>Seguridad:</b> los códigos que nadie canjee se borran solos a los</span>
        <select id="aTtl"><option value="0">Nunca</option><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="120">2 horas</option><option value="360">6 horas</option><option value="1440">24 horas</option></select>
        <button class="btn s" type="button" id="aClean" title="Invalida ahora mismo los códigos que ya pasaron el tiempo">🧹 Limpiar ahora</button></div>
      <label class="chk"><input type="checkbox" id="aCount"> Contar también los códigos generados que todavía no se han canjeado</label>
      </details><details class="capacity-details"><summary>Ver distribución y disponibilidad de cuentas</summary><div id="capInfo" class="capinfo"></div></details>
      <div class="newcode" id="autoOut" aria-live="polite"></div>
    </div>
    <details class="card" id="manualBox"><summary style="cursor:pointer;font-weight:700;font-size:16px">🔑 Generar código de una cuenta en particular</summary>
      <p style="color:var(--mut);font-size:14px;margin-bottom:12px">Elige la cuenta y listo: se crean códigos nuevos de un solo uso. El correo, la contraseña y el código 2FA son los mismos de la cuenta. Se crea 1 código por defecto; puedes subir la cantidad si lo necesitas.</p>
      <form id="genForm" class="form">
        <div style="grid-column:span 2"><label>Cuenta</label><select id="gAcc" required></select></div>
        <div><label>Días del plan</label><input id="gDays" type="number" min="1" max="366" value="30" required></div>
        <div><label>Precio (COP)</label><input id="gPrice" type="number" min="0" step="500" value="${DEFAULT_PRICE}"></div>
        <div><label>Cantidad de códigos</label><input id="gQty" type="number" min="1" max="200" step="1" value="1" required></div>
        <div><button class="btn p" style="width:100%" type="submit">Generar</button></div>
      </form>
      <div class="newcode" id="newcode"></div>
    </details>
    <div class="card"><h2>📋 Todos los códigos y clientes</h2>
      <div class="tools">
        <input id="q" placeholder="Buscar cliente, correo, código o nota…">
        <select id="st"><option value="">Todos los estados</option><option value="av">Disponibles</option><option value="ok">Activas sin alerta</option><option value="active-plans">Todos los planes activos</option><option value="w">Por vencer</option><option value="b">Vencidas</option><option value="pr">Con problemas</option><option value="expired-code">Códigos sin canjear vencidos</option></select>
        <select id="pf"><option value="">Todos los productos</option></select>
        <button class="btn s" id="csv">⬇ Exportar CSV</button>
      </div>
      <div class="wrapt"><table><thead><tr><th>Producto</th><th>Cuenta</th><th>Código</th><th>Estado</th><th>Cliente (Gmail)</th><th>Activada</th><th>Vence</th><th>Pidió 2FA</th><th>Precio</th><th>Tiempo restante</th><th>Acciones</th></tr></thead><tbody id="rows"></tbody></table></div>
    </div>
  </section>

  <section id="tab-cta" class="hide">
    <div class="card"><h2>🧩 Mis cuentas</h2>
      <p style="color:var(--mut);font-size:14px;margin-bottom:12px">Cada fila es una cuenta que compartes: ves cuántos clientes la usan (barra de cupo) y puedes cambiar su contraseña. Al guardar, <b>se actualiza sola para todos sus clientes</b>. Escribe la nueva y pulsa <b>Guardar</b> (o Enter).</p>
      <div id="passList"></div></div>
    <details class="card" id="addBox"><summary style="cursor:pointer;font-weight:700;font-size:16px">➕ Agregar una cuenta nueva (correo y contraseña distintos)</summary>
      <form id="addForm" class="form" style="margin-top:14px">
        <div><label>Producto</label><input id="fProd" value="ChatGPT" list="prodList" required><datalist id="prodList">${Object.keys(PRICES).map(k=>`<option value="${k}">`).join("")}</datalist></div>
        <div><label>Correo de la cuenta</label><input id="fMail" type="text" required autocomplete="off"></div>
        <div><label>Contraseña de la cuenta</label><input id="fPass" type="password" required autocomplete="off"></div>
        <div><label>Clave del autenticador 2FA (opcional)</label><input id="fKey" type="password" autocomplete="off" placeholder="Ej: ABCD EFGH IJKL MNOP"></div>
        <div><label>Días del plan</label><input id="fDays" type="number" min="1" max="366" value="30" required></div>
        <div><label>Precio (COP)</label><input id="fPrice" type="number" min="0" step="500" value="${DEFAULT_PRICE}"></div>
        <div><button class="btn p" style="width:100%" type="submit">Crear y generar código</button></div>
      </form>
      <div class="saved" id="draftNote"></div>
    </details>
  </section>

  <section id="tab-dios" class="hide">
    <div class="god-hero"><div><span class="overline">CONTROL DEL NEGOCIO</span><h2>Modo Dios</h2><p>Tu tienda, tus reglas. Revisa los cambios del asistente antes de guardarlos. Los precios se guardan por producto.</p></div><div class="god-badges" id="godBadges"></div></div>
    <nav class="god-jumps" aria-label="Secciones de Modo Dios"><a href="#godAssistant">Asistente</a><a href="#godRules">Instrucciones</a><a href="#godAnswers">Respuestas</a><a href="#godCatalog">Planes y precios</a></nav>
    <div class="god-savebar" id="godSavebar" data-state="saved"><div><span class="save-indicator"></span><span id="godSaveStatus" role="status">Cargando configuración…</span></div><div><button class="btn s" type="button" id="godDiscard" disabled>Descartar</button><button class="btn p" type="button" id="godSaveAll" disabled>Guardar cambios</button></div></div>
    <div class="god-grid">
      <div class="card" id="godAssistant"><h2>Asistente de WhatsApp</h2>
        <label class="sw"><input type="checkbox" id="gAsis"><span></span><b>Asistente encendido</b><small>Si lo apagas, nadie responde por WhatsApp hasta que lo vuelvas a encender.</small></label>
        <label class="sw"><input type="checkbox" id="gSal"><span></span><b>Saludo automático gratis</b><small>A quien escribe "hola" por primera vez le llega la bienvenida con los planes, sin gastar IA.</small></label>
        <div class="acts" style="margin-top:10px"><button class="btn s" id="gReanudar">▶ Reactivar el asistente en todos los chats pausados</button></div>
      </div>
      <div class="card"><h2>☀️ Recordatorios automáticos</h2>
        <label class="sw"><input type="checkbox" id="gRec"><span></span><b>Enviar recordatorios</b><small>A clientes que no han comprado (nunca a tus contactos), máximo 1 cada 3 días por persona.</small></label>
        <div class="god-row"><label>Hora<select id="gRecH"><option value="5">5:00 a. m.</option><option value="6">6:00 a. m.</option><option value="7">7:00 a. m.</option><option value="8">8:00 a. m.</option><option value="9">9:00 a. m.</option><option value="10">10:00 a. m.</option><option value="11">11:00 a. m.</option><option value="12">12:00 m.</option><option value="13">1:00 p. m.</option><option value="14">2:00 p. m.</option><option value="15">3:00 p. m.</option><option value="16">4:00 p. m.</option><option value="17">5:00 p. m.</option><option value="18">6:00 p. m.</option><option value="19">7:00 p. m.</option><option value="20">8:00 p. m.</option><option value="21">9:00 p. m.</option></select></label>
          <label>Máximo por día<input id="gRecMax" type="number" min="0" max="150"></label><label>De esos, clientes antiguos<input id="gRecV" type="number" min="0" max="60"></label></div>
        <p class="god-hint">⚠️ Más mensajes = más ventas, pero también más riesgo de que WhatsApp bloquee el número. Recomendado: 60 por día y 25 antiguos.</p>
      </div>
    </div>
    <div class="card" id="godRules"><h2>Instrucciones para la IA</h2>
      <p class="god-hint">Escribe instrucciones en tus palabras y el asistente las usará como orientación. Ejemplos: "Si preguntan por Netflix, di que llega la otra semana", "Los domingos ofrece el plan de 3 meses primero", "No vendas Canva por ahora".</p>
      <textarea id="gReglas" rows="5" maxlength="3000" class="god-ta" placeholder="Tus órdenes para el asistente…"></textarea>
      <div class="acts" style="justify-content:flex-end;margin-top:8px"><span class="god-hint" id="gReglasN"></span><button class="btn p" id="gReglasOk">Revisar cambios</button></div>
    </div>
    <div class="card" id="godAnswers"><h2>Respuestas automáticas <span class="tag t-ok" style="font-size:11px">gratis · sin IA</span></h2>
      <p class="god-hint">Si el cliente escribe una de estas palabras, se le responde al instante con tu texto, sin gastar saldo de IA. Si pregunta por otro producto o algo más complejo, responde la IA. Los precios de ChatGPT ($10.000 / $20.000 / $50.000) se actualizan solos con los de abajo.</p>
      <div id="gFaq" class="faq-list"></div>
      <div class="acts" style="margin-top:10px"><button class="btn s" id="gFaqAdd">➕ Agregar respuesta</button><button class="btn s" id="gFaqReset">↺ Volver a las de fábrica</button><span style="flex:1"></span><button class="btn p" id="gFaqOk">Revisar cambios</button></div>
    </div>
    <div class="card" id="godCatalog"><h2>Productos, planes y precios</h2>
      <p class="god-hint">Cambia el precio o los días y toca Guardar: se actualiza en la tienda, en el asistente, en los revendedores y en los códigos nuevos. "Visible" apagado lo esconde de la tienda y el asistente deja de ofrecerlo.</p>
      <div class="tools catalog-control-tools"><label class="control-search"><span>Buscar producto</span><input id="godProductSearch" placeholder="ChatGPT, Canva, CapCut…" type="search"></label><span id="godProductCount" class="hint"></span></div><div class="wrapt god-products"><table class="god-tab"><thead><tr><th>Producto</th><th>Precio (COP)</th><th>Días</th><th>Visible</th><th>Disponibilidad</th><th></th></tr></thead><tbody id="gProds"><tr><td colspan="6" class="empty">Cargando…</td></tr></tbody></table></div>
      <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">➕ Agregar un producto nuevo</summary>
        <div class="god-row" style="margin-top:10px"><label>Nombre<input id="nNom" placeholder="Ej: Netflix"></label><label>Precio<input id="nPre" type="number" placeholder="15000"></label><label>Días<input id="nDia" type="number" value="30"></label><button class="btn p" id="nOk" style="align-self:end">Crear</button></div>
        <p class="god-hint">Luego agrega sus cuentas en la pestaña Cuentas con un nombre que contenga la misma palabra (por ejemplo "Netflix"). En la tienda aparece en la lista del asistente; para mostrarlo con foto en la página, pídemelo.</p></details>
    </div>
  </section>

  <section id="tab-ag" class="hide">
    <div class="card"><h2>🏢 Tu empresa de IA</h2>
      <p style="color:var(--mut);font-size:14px;margin-bottom:12px">Cada agente hace una parte del trabajo, día y noche, sin que tengas que intervenir. Si algo falla, el vigilante te escribe al correo.</p>
      <div id="agGrid" class="agrid"><div class="empty">Cargando…</div></div>
    </div>
  </section>

  <section id="tab-rev" class="hide">
    <div class="card"><h2>🤝 Revendedores</h2>
      <p style="color:var(--mut);font-size:14px;margin-bottom:12px">Autoriza a una persona con su Gmail. Ella entra a <b>revendedor.html</b> y <b>solo</b> puede: generar códigos de los productos que le permitas (con un tope al día), ver <b>sus</b> ventas, anular <b>sus</b> códigos sin usar y, si quieres, dar códigos 2FA extra a <b>sus</b> clientes. Nunca ve correos ni contraseñas de las cuentas, ni a tus otros clientes, ni este panel. Todo lo que hace queda en <b>Actividad</b>.</p>
      <div class="tools"><button class="btn s p" id="revAdd">➕ Autorizar revendedor</button><button class="btn s" id="revLink">🔗 Copiar enlace de su página</button><button class="btn s" id="revReload">↻ Recargar</button></div>
      <div id="revRows" class="walist"><div class="empty">Cargando…</div></div>
    </div>
  </section>

  <section id="tab-log" class="hide">
    <div class="card" id="segCard"><h2>🛡️ Seguridad</h2>
      <p style="color:var(--mut);font-size:14px;margin-bottom:12px">Bloquea a un cliente que abuse de la tienda (reventa, fraude, uso indebido) y cierra todas las sesiones si crees que alguien entró sin permiso. Los cambios aplican al instante; tú nunca quedas bloqueado.</p>
      <div class="tools"><input id="segMail" type="email" placeholder="Gmail del cliente a bloquear" style="min-width:240px" autocomplete="off"><input id="segWhy" placeholder="Motivo (opcional)" maxlength="120"><button class="btn s d" id="segBlock" type="button">Bloquear</button></div>
      <div id="segList" style="margin:10px 0"></div>
      <div class="tools"><button class="btn s d" id="segLogout" type="button">Cerrar todas las sesiones</button><span id="segInfo" style="color:var(--mut);font-size:13px"></span></div>
    </div>
    <div class="card"><h2>🕘 Actividad de clientes y registro</h2>
      <p style="color:var(--mut);font-size:14px;margin-bottom:12px">Cada movimiento con su fecha y hora de Colombia: cuándo entran, activan códigos, piden el autenticador, copian o ven la contraseña, piden ayuda, renuevan o cierran sesión, y desde qué dispositivo. Sin cliente: los últimos 500 eventos.</p>
      <div class="tools"><input id="lcli" type="email" placeholder="Correo del cliente (ver toda su actividad)" style="min-width:240px"><button class="btn s p" id="lcliGo">Ver actividad</button><button class="btn s" id="logReload">↻ Todo el registro</button><input id="lq" placeholder="Filtrar lo que se muestra…"></div>
      <div id="lsum"></div>
      <div class="wrapt"><table style="min-width:640px"><thead><tr><th>Fecha</th><th>Evento</th><th>Detalle</th><th>Quién</th></tr></thead><tbody id="lrows"><tr><td colspan="4" class="empty">Abre esta pestaña para cargar.</td></tr></tbody></table></div>
    </div>
  </section>`;
  document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{ if(b.dataset.t==="more"){ openSide(true); return; } setTab(b.dataset.t); });
  $("#side").classList.remove("hide"); document.body.classList.add("has-side"); drawNav();
  if(!$("#fab")){ const f=document.createElement("button"); f.className="fab"; f.id="fab"; f.title="Nueva cuenta o código"; f.textContent="＋"; f.onclick=()=>{ setTab("cta"); const bx=$("#addBox"); bx.open=true; bx.scrollIntoView({behavior:"smooth",block:"start"}); setTimeout(()=>$("#fMail").focus(),400); }; document.body.appendChild(f); }
  $("#addForm").onsubmit = addAccount;
  $("#fProd").addEventListener("change",()=>{ $("#fPrice").value = priceOf($("#fProd").value); $("#fDays").value = daysOf($("#fProd").value); saveDraft(); });
  $("#addForm").addEventListener("input", saveDraft);
  restoreDraft();
  $("#genForm").onsubmit = genCode;
  $("#autoForm").onsubmit = autoGen; $("#aProd").onchange = onAutoProd;
  $("#aCount").checked = countFree();
  $("#aTtl").onchange = async () => { try{ await api("admin_set_ttl",{minutos:$("#aTtl").value}); TTL = +$("#aTtl").value; toast(TTL? "Los códigos sin canjear se borrarán a los "+$("#aTtl").selectedOptions[0].textContent+" ✔" : "Los códigos ya no caducan"); rows(); }catch(ex){ $("#aTtl").value = String(TTL??60); toast(/no válida|Acción/i.test(ex.message)?"Falta actualizar el backend (Code.gs) para usar la caducidad":ex.message); } };
  $("#aClean").onclick = async () => { try{ const j = await api("admin_cleanup"); toast(j.borrados? j.borrados+" código(s) vencido(s) invalidados ✔" : "No había códigos vencidos"); await refresh(); }catch(ex){ toast(/no válida|Acción/i.test(ex.message)?"Falta actualizar el backend (Code.gs)":ex.message); } };
  $("#aCount").onchange = () => { try{ localStorage.setItem(COUNT_KEY, JSON.stringify($("#aCount").checked)); }catch{} $("#capInfo").innerHTML = capInfoHtml(); updateViews(); };
  $("#gAcc").onchange = syncDays;
  ["aQty","aDays","aPrice"].forEach(id=>$("#"+id).addEventListener("input",updateGeneratorPreview));
  $("#aProd").addEventListener("change",updateGeneratorPreview);
  $("#autoForm").querySelectorAll("label").forEach(label=>{const control=label.parentElement.querySelector("input,select");if(control)label.htmlFor=control.id;});
  $("#genForm").querySelectorAll("label").forEach(label=>{const control=label.parentElement.querySelector("input,select");if(control)label.htmlFor=control.id;});
  let filterTimer;
  const redrawFilters = () => { clearTimeout(filterTimer); filterTimer = setTimeout(()=>{ rows(); crows(); }, 90); };
  $("#q").oninput = $("#st").onchange = $("#pf").onchange = redrawFilters;
  $("#cq").oninput = $("#cst").onchange = $("#cso").onchange = redrawFilters;
  $("#csv").onclick = exportCsv; $("#ccsv").onclick = exportClientsCsv; wireClientSelection();
  $("#payReload").onclick = loadPagos; $("#logReload").onclick = ()=>{ $("#lcli").value=""; loadLog(); }; $("#lq").oninput = drawLog;
  $("#lcliGo").onclick = ()=>loadLog($("#lcli").value.trim().toLowerCase()); $("#lcli").onkeydown = e=>{ if(e.key==="Enter") $("#lcliGo").click(); };
  document.querySelectorAll("[data-qa]").forEach(b=>b.onclick=()=>quick(b.dataset.qa));
  updateViews();
}
// Acciones rápidas del Resumen
function quick(a){
  const go=(tab,el)=>{ setTab(tab); setTimeout(()=>{ el&&el.scrollIntoView({behavior:"smooth",block:"start"}); },60); };
  if(a==="gen") go("cod",$("#autoForm"));
  else if(a==="acc"){ setTab("cta"); $("#addBox").open=true; setTimeout(()=>{ $("#addBox").scrollIntoView({behavior:"smooth",block:"start"}); $("#fMail").focus(); },80); }
  else if(a==="pass"){ setTab("cta"); setTimeout(()=>{ const i=document.querySelector(".pr-in"); if(i){ i.scrollIntoView({behavior:"smooth",block:"center"}); i.focus(); i.select(); } },80); }
  else if(a==="avisar") $("#attn").scrollIntoView({behavior:"smooth",block:"start"});
}

/* ---------- Clientes ---------- */
function cFiltered(){
  const q = norm($("#cq")?.value||""), st = $("#cst")?.value||"", so = $("#cso")?.value||"rest";
  const list = clients().filter(c=>(!st||(st==="due7"?c.cuentas.some(i=>IAPInsights.isDue(i,Date.now())):st==="active-all"?c.cuentas.some(i=>IAPInsights.isActive(i,Date.now())):st==="inactive-all"?!c.cuentas.some(i=>IAPInsights.isActive(i,Date.now())):cState(c).k===st)) && (!q || norm([c.nombre,c.email,c.whatsapp,c.nota].join(" ")).includes(q)));
  const rest = c => Math.min(...c.cuentas.filter(i=>IAPInsights.isActive(i,Date.now())).map(i=>i.restante??9999), 99999);
  const sorters = {rest:(a,b)=>rest(a)-rest(b), gasto:(a,b)=>b.gastado-a.gastado, nuevo:(a,b)=>String(b.ultima||"").localeCompare(String(a.ultima||"")), nombre:(a,b)=>(a.nombre||a.email).localeCompare(b.nombre||b.email)};
  return list.sort(sorters[so]);
}
let clientPage=0,clientFilterKey="";
const CLIENT_PAGE_SIZE=25;
function crows(){
  if(curTab!=="cli")return;
  const el = $("#crows"); if(!el) return;
  const all=cFiltered(),key=JSON.stringify([$("#cq")?.value||"",$("#cst")?.value||"",$("#cso")?.value||""]);
  if(key!==clientFilterKey){clientPage=0;clientFilterKey=key;}
  clientPage=Math.max(0,Math.min(clientPage,Math.ceil(all.length/CLIENT_PAGE_SIZE)-1));
  const start=clientPage*CLIENT_PAGE_SIZE,list=all.slice(start,start+CLIENT_PAGE_SIZE);
  let pager=$("#clientPager");
  if(!pager){pager=document.createElement("nav");pager.id="clientPager";pager.className="code-pager";pager.setAttribute("aria-label","Páginas de clientes");el.closest(".wrapt").after(pager);}
  pager.innerHTML=`<span role="status">${all.length?start+1:0}–${Math.min(start+CLIENT_PAGE_SIZE,all.length)} de ${all.length} clientes</span><div><button class="btn s" type="button" data-client-step="-1" ${clientPage===0?"disabled":""}>← Anterior</button><button class="btn s" type="button" data-client-step="1" ${start+CLIENT_PAGE_SIZE>=all.length?"disabled":""}>Siguiente →</button></div>`;
  pager.querySelectorAll("[data-client-step]").forEach(button=>button.onclick=()=>{clientPage+=Number(button.dataset.clientStep);crows();el.closest(".wrapt").scrollIntoView({block:"start",behavior:"instant"});});
  el.innerHTML = list.length ? list.map(c=>{
    const s = cState(c);
    return `<tr data-c="${esc(c.email)}"><td class="sel-td" data-l="Seleccionar"><input type="checkbox" class="csel" data-sel="${esc(c.email)}" ${cSel.has(c.email)?"checked":""} aria-label="Seleccionar a ${esc(c.nombre||c.email)}"></td><td data-l="Cliente"><div><b>${esc(c.nombre||"(sin nombre)")}</b><br><small style="color:var(--mut)">${esc(c.email)}</small></div></td>
      <td data-l="WhatsApp">${c.whatsapp?esc(c.whatsapp):'<span style="color:var(--mut)">—</span>'}</td>
      <td data-l="Cuentas">${c.cuentas.length} <small style="color:var(--mut)">(${c.activos} activas${c.vencidos?`, ${c.vencidos} vencidas`:""})</small></td>
      <td data-l="Estado"><span class="tag t-${s.k}">${s.t}</span></td>
      <td data-l="Vence">${fdate(c.vence)}</td><td data-l="Desde">${fdate(c.primera)}</td>
      <td data-l="Pagado"><b>${money(c.gastado)}</b></td><td data-l="Nota"><div class="note">${esc(c.nota||"—")}</div></td>
      <td class="acts-td"><div class="acts"><button class="btn s" data-ca="info">Ver detalle</button><button class="btn s" data-ca="edit">Datos / nota</button><button class="btn s p" data-ca="grant" title="Darle acceso a más cuentas de un producto">➕ Dar más cuentas</button><button class="btn s" data-ca="2fa" title="Darle más pedidos del código de verificación">🔢 Más códigos 2FA</button>
        ${c.whatsapp?`<a class="btn s wa" target="_blank" rel="noopener" href="${waLink(c.whatsapp, renewMsg({...c.cuentas[0],nombre:c.nombre}))}">💬 WhatsApp</a>`:""}</div></td></tr>`;
  }).join("") : `<tr><td colspan="10" class="empty">No hay clientes que coincidan.</td></tr>`;
  cSelUpdate();
}
function clientDetail(c){
  const s = cState(c);
  showInfo(`<h2>${esc(c.nombre||c.email)} <span class="tag t-${s.k}">${s.t}</span></h2>
    <div class="kv"><b>Gmail</b><span>${esc(c.email)}</span><b>WhatsApp</b><span>${esc(c.whatsapp||"—")}</span>
    <b>Cliente desde</b><span>${fdate(c.primera)}</span><b>Última activación</b><span>${fdate(c.ultima)}</span>
    <b>Total pagado</b><span><b style="color:var(--text)">${money(c.gastado)}</b></span><b>Códigos 2FA pedidos</b><span>${c.usos2fa}</span>
    <b>Nota</b><span style="white-space:pre-wrap">${esc(c.nota||"—")}</span></div>
    <div class="acts" style="margin:6px 0 12px"><button class="btn s p" data-actividad="${esc(c.email)}">🕘 Ver toda su actividad (con horas)</button><button class="btn s p" data-grant="${esc(c.email)}">➕ Dar más cuentas</button><button class="btn s" data-dar2fa="${esc(c.email)}">🔢 Más códigos 2FA</button></div>
    <h2 style="font-size:16px">Cuentas de este cliente (${c.cuentas.length})</h2>
    ${c.cuentas.map(i=>{const st=state(i);return `<div class="mini"><b>${esc(i.producto)}</b> · ${esc(i.correo)} <span class="tag t-${st.k}">${st.t}</span><br>
      Código <span class="mono">${esc(i.codigo)}</span> · Activada ${fdate(i.inicio)} · Vence ${fdate(i.fin)} ${i.vencida?"":`(${i.restante} d)`}<br>
      2FA: ${i.tiene2fa?`${i.usos2fa}/${i.max2fa} usos${i.ultimo2fa?" · último "+fdt(i.ultimo2fa):""}`:"sin clave"} · Precio ${money(i.precio)}</div>`;}).join("")}`);
}
// Dar acceso a más cuentas de un producto: el cliente las ve en «Mi suscripción» y vencen igual que su plan.
const PKEYS = {"ChatGPT":"chatgpt","Claude Code":"claude","Gemini Pro":"gemini","Flow":"flow","Duolingo":"duolingo","Canva":"canva","Xbox Game Pass Ultimate":"xbox","Adobe Premiere Pro":"premiere","Adobe Photoshop":"photoshop","DaVinci Resolve":"davinci","YouTube Premium":"youtube","CapCut Pro":"capcut","Filmora":"filmora"};
const pkeyOf = name => { const n=String(name||"").toLowerCase(); const hit=Object.keys(PKEYS).find(k=>n.includes(k.toLowerCase())||n.includes(PKEYS[k])); return hit?PKEYS[hit]:""; };
// Más pedidos del código de verificación (2FA) para un cliente: solo por hoy, un límite fijo, o volver al normal
async function dar2fa(email){
  email = String(email||"").trim().toLowerCase(); if(!email) return;
  const actual = Math.max(0, ...items.filter(i=>(i.cliente||"").toLowerCase()===email).map(i=>Number(i.max2fa)||0)) || 2;
  const v = await askForm("Códigos de verificación de "+email,[
    {id:"modo",label:"¿Qué quieres hacer?",type:"select",value:"hoy",opts:[{v:"hoy",l:"Darle códigos extra solo por hoy"},{v:"siempre",l:"Cambiar su límite diario (para siempre)"},{v:"normal",l:"Volver al normal (7 por día)"}]},
    {id:"cantidad",label:"Cantidad (extra de hoy, o el nuevo límite diario)",type:"number",value:3}],
    "Hoy puede pedir <b>"+actual+"</b> código(s) en total. Los pedidos se comparten entre todas sus cuentas.","Guardar");
  if(!v) return;
  const j = await api("admin_2fa_extra",{cliente:email, modo:v.modo, cantidad:v.cantidad});
  toast("Listo ✔ Hoy puede pedir "+j.limite+" código(s) de verificación");
  await refresh();
}
async function grantAccounts(email){
  email = String(email||"").trim().toLowerCase(); if(!email) return;
  const mine = new Set(items.filter(i=>(i.cliente||"").toLowerCase()===email && IAPInsights.isActive(i,Date.now())).map(i=>i.correo.toLowerCase()));
  const libres = k => new Set(items.filter(i=>pkeyOf(i.producto)===k && i.estado!=="Con problemas" && !mine.has(i.correo.toLowerCase())).map(i=>i.correo.toLowerCase())).size;
  const opts = Object.keys(PKEYS).map(n=>({v:PKEYS[n], l:n+" — "+libres(PKEYS[n])+" cuenta(s) que aún no tiene"})).filter(o=>libres(o.v)>0);
  if(!opts.length) return toast("Este cliente ya tiene acceso a todas las cuentas.");
  const v = await askForm("Dar más cuentas a "+email,[
    {id:"producto",label:"Producto",type:"select",opts,value:opts.find(o=>o.v==="chatgpt")?.v||opts[0].v},
    {id:"cantidad",label:"¿Cuántas cuentas más? (escribe «todas» para darle todas)",value:"todas",req:true}],
    "Las cuentas nuevas le aparecen en «Mi suscripción» con correo, contraseña y 2FA, y vencen el mismo día que su plan actual. Si no tiene un plan activo, empiezan hoy.","Dar acceso");
  if(!v) return;
  const j = await api("admin_grant",{cliente:email, producto:v.producto, cantidad:String(v.cantidad).trim().toLowerCase()==="todas"?"todas":v.cantidad});
  toast("Listo ✔ Se le dieron "+j.dadas+" cuenta"+(j.dadas===1?"":"s")+(j.quedan?" · quedan "+j.quedan+" que aún no tiene":""));
  await refresh();
}
async function editClient(c){
  const v = await askForm("Datos de "+(c.nombre||c.email),[
    {id:"nombre",label:"Nombre",value:c.nombre,ph:"Ej: Laura Pérez"},
    {id:"whatsapp",label:"WhatsApp (con o sin 57)",value:c.whatsapp,ph:"3001234567"},
    {id:"nota",label:"Nota privada",value:c.nota,area:true,ph:"Ej: paga por Nequi, renueva cada mes…"}]);
  if(!v) return;
  await api("admin_clientinfo",{cliente:c.email,nombre:v.nombre,whatsapp:v.whatsapp,nota:v.nota}); toast("Datos del cliente guardados ✔"); await refresh();
}

/* ---------- Cuentas / códigos ---------- */
/* ---------- Cupos por cuenta y generación automática ---------- */
const CAP_KEY = "iap_cap";
const getCap = () => { const v = +load(CAP_KEY); return v > 0 ? Math.floor(v) : 25; };
// Una "cuenta" es un correo. Ocupa cupo cada cliente que YA canjeó su código (y sigue activo). Los códigos sin canjear solo cuentan si activas la casilla.
function capMap(){
  const m = new Map();
  items.forEach(i=>{
    const k = i.correo.toLowerCase();
    const a = m.get(k) || {correo:i.correo, filas:{}, act:0, libres:0, prob:false};
    if(a.filas[i.producto]===undefined) a.filas[i.producto] = i.fila;
    if(i.cliente){ if(IAPInsights.isActive(i,Date.now())) a.act++; }
    else if(i.estado==="Con problemas") a.prob = true;
    else if(i.codigo && i.estado!=="Sin código") a.libres++;
    m.set(k,a);
  });
  return m;
}
const COUNT_KEY = "iap_cap_free";
const countFree = () => !!load(COUNT_KEY);   // por defecto NO: solo cuentan los clientes que ya canjearon
const used = a => a.act + (countFree() ? a.libres : 0);
const NOCAP_KEY = "iap_nocap";
const noCap = () => true; // sin tope de clientes por cuenta: cada cuenta recibe los clientes que sean
function planAuto(prod, qty, cap){
  const base = [...capMap().values()].filter(a=>!a.prob && a.filas[prod]!==undefined);
  const pool = noCap() ? base.map(a=>({...a, room:Infinity, load:used(a)})) : base.map(a=>({...a, room:cap-used(a), load:used(a)})).filter(a=>a.room>0);
  const plan = new Map(); let left = qty;
  while(left>0){
    const open = pool.filter(a=>a.room>0); if(!open.length) break;
    let a;
    if(noCap()){ const min = Math.min(...open.map(x=>x.load)); const lo = open.filter(x=>x.load===min); a = lo[Math.floor(Math.random()*lo.length)]; } // la menos ocupada
    else a = open[Math.floor(Math.random()*open.length)];
    a.room--; a.load++; left--;
    const p = plan.get(a.correo) || {correo:a.correo, fila:a.filas[prod], n:0, antes:used(a)}; p.n++; plan.set(a.correo,p);
  }
  return {plan, hechos:qty-left, faltan:left, cuentas:pool.length};
}
function capBar(a, cap){
  if(noCap()){ const u = used(a); return `<b class="capn" title="${a.act} clientes activos · ${a.libres} códigos sin canjear">${u} cliente${u===1?"":"s"}</b>`; }
  const u = used(a), pct = Math.min(100, u/cap*100), cls = u>=cap ? "full" : (pct>=80 ? "hi" : "");
  return `<span class="capbar ${cls}" title="${a.act} clientes activos · ${a.libres} códigos sin canjear"><i style="width:${pct}%"></i></span><b class="capn ${cls}">${u}/${cap}</b>`;
}
function capInfoHtml(){
  const prod = $("#aProd")?.value, cap = getCap(); if(!prod) return "";
  const todas = [...capMap().values()].filter(a=>a.filas[prod]!==undefined);
  const abiertas = todas.filter(a=>!a.prob && (noCap() || used(a)<cap));
  const cupo = abiertas.reduce((s,a)=>s+cap-used(a),0);
  const prob = todas.filter(a=>a.prob).length;
  return `<div class="capsum"><b>${esc(prod)}</b>: ${noCap()?`<b>sin tope</b> · se reparten entre <b>${abiertas.length}</b> cuenta${abiertas.length===1?"":"s"} de ${todas.length}`:`hay cupo para <b>${cupo}</b> código${cupo===1?"":"s"} más en <b>${abiertas.length}</b> cuenta${abiertas.length===1?"":"s"} de ${todas.length}`}${prob?` · ${prob} marcada${prob===1?"":"s"} con problemas (no se usan)`:""}.</div>
    ${todas.sort((a,b)=>used(b)-used(a)).map(a=>`<div class="caprow"><span class="capm">${esc(a.correo)}${a.prob?' <small class="tag t-pr">con problemas</small>':""}</span>${capBar(a,cap)}${a.libres?`<small class="capfree">+${a.libres} sin canjear</small>`:""}</div>`).join("")}
    ${abiertas.length===0?`<div class="capwarn">⚠️ No hay cuentas ${noCap()?"disponibles":"con cupo"} para ${esc(prod)}. Agrega una cuenta nueva (más abajo) para poder generar códigos.</div>`:""}`;
}
function fillAuto(){
  const sel = $("#aProd"); if(!sel) return;
  const tt = $("#aTtl"); if(tt && TTL!==null) tt.value = [0,15,30,60,120,360,1440].includes(TTL) ? String(TTL) : "60";
  const prev = sel.value, ps = [...new Set(items.map(i=>i.producto))];
  sel.innerHTML = ps.length ? ps.map(p=>`<option>${esc(p)}</option>`).join("") : "<option value=\"\">Primero agrega una cuenta</option>";
  if(ps.includes(prev)) sel.value = prev; else onAutoProd();
  $("#capInfo").innerHTML = capInfoHtml();
}
function onAutoProd(){ const p=$("#aProd").value; if(!p) return; $("#aDays").value = daysOf(p); $("#aPrice").value = priceOf(p); $("#capInfo").innerHTML = capInfoHtml(); updateGeneratorPreview(); }
// Crea n códigos de una cuenta (bulk si el backend lo permite; si no, uno por uno)
let generationBusy=false;
function updateGeneratorPreview(){
  const el=$("#generatorPreview");if(!el)return;
  try{
    const v=IAPAdminTools.validateBatch({qty:$("#aQty").value,days:$("#aDays").value,price:$("#aPrice").value});
    const product=$("#aProd").value,available=[...capMap().values()].filter(a=>!a.prob&&a.filas[product]!==undefined).length;
    el.innerHTML=`<div><small>Tu lote</small><b>${v.qty} ${v.qty===1?"código":"códigos"}</b><span>${esc(product||"Agrega una cuenta")}</span></div><div><small>Duración por acceso</small><b>${v.days} días</b><span>Desde su activación</span></div><div><small>Precio por código</small><b>${money(v.price)}</b><span>${money(v.total)} valor total del lote</span></div><div><small>Reparto automático</small><b>${available} ${available===1?"cuenta":"cuentas"}</b><span>${available?"Disponibles para generar":"Agrega una cuenta en Cuentas"}</span></div>`;
    el.dataset.valid="true";
  }catch(e){el.textContent=e.message;el.dataset.valid="false";}
}
function reviewGeneration(product,v,plan){
  return new Promise(resolve=>{
    const d=document.createElement("dialog");d.className="generation-review";d.setAttribute("aria-labelledby","generationReviewTitle");
    d.innerHTML=`<form method="dialog"><span class="overline">REVISA ANTES DE CREAR</span><h2 id="generationReviewTitle">Tu lote, listo para generar.</h2><p>Se crearán códigos reales de un solo uso para <b>${esc(product)}</b>.</p><div class="review-metrics"><div><small>Códigos</small><b>${v.qty}</b></div><div><small>Vigencia del plan</small><b>${v.days} días</b></div><div><small>Precio por acceso</small><b>${money(v.price)}</b></div></div><div class="review-accounts">${plan.map(p=>`<div><span>${esc(p.correo)}</span><b>+${p.n}</b></div>`).join("")}</div><p class="hint">${TTL?"Los códigos sin canjear caducan en "+(TTL>=60?TTL/60+" horas":TTL+" minutos")+".":"Los códigos sin canjear no tienen caducidad configurada."} La duración del plan empieza al activar el acceso.</p><div class="review-actions"><button class="btn" value="cancel">Volver</button><button class="btn p" value="generate">Crear ${v.qty} ${v.qty===1?"código":"códigos"}</button></div></form>`;
    d.addEventListener("close",()=>{const ok=d.returnValue==="generate";d.remove();resolve(ok);},{once:true});
    d.addEventListener("cancel",e=>{e.preventDefault();d.close("cancel");});document.body.appendChild(d);d.showModal();
  });
}
async function makeCodes(fila,n,dias,precio,onProgress){return IAPAdminTools.createCodes(api,{row:fila,qty:n,days:dias,price:precio},onProgress);}
function presentCodeBatch(out,res,product,v,failure){
  const all=res.flatMap(r=>r.codes);out.classList.add("on");
  out.innerHTML=`<div class="batch-result-head"><span class="batch-result-icon">${failure?"!":"✓"}</span><div><h3>${all.length} ${all.length===1?"código creado":"códigos creados"}</h3><p>${esc(product)} · ${v.days} días · ${money(v.price)} por acceso</p></div><span class="tag ${failure?"t-w":"t-ok"}">${failure?"Lote parcial":"Listo para entregar"}</span></div>${failure?`<p class="batch-error" role="alert">${esc(failure)}<br>Conservamos los códigos confirmados. Consulta la lista actualizada antes de repetir el resto.</p>`:""}<div class="batch-result-actions"><button class="btn p" data-batch-links>Copiar enlaces</button><button class="btn" data-batch-codes>Copiar códigos</button><button class="btn" data-batch-export>Descargar lote .txt</button></div><div class="batch-welcome"><img src="assets/gracias-ia-plus-colombia.jpg" width="1200" height="630" alt="Tarjeta de bienvenida de IA Plus Colombia"><div><b>Tarjeta de bienvenida lista</b><small>Al compartir cada enlace por WhatsApp, el cliente verá esta imagen y una guía rápida para canjear su código.</small></div></div><p class="hint">Envía a cada cliente su propio enlace. Podrá revisar su Gmail antes de activarlo.</p>${res.map(r=>`<div class="batch-group"><div class="batch-group-label">${esc(r.correo)} <span>${r.codes.length} ${r.codes.length===1?"código":"códigos"}</span></div>${r.codes.map(c=>`<div class="codeline"><span class="mono">${esc(c)}</span><div><button class="btn s p" data-cl="${esc(c)}">Copiar enlace</button><button class="btn s" data-cm="${esc(c)}">Copiar mensaje</button><button class="btn s" data-cp="${esc(c)}">Código</button></div></div>`).join("")}</div>`).join("")}`;
  out.querySelectorAll("[data-cp]").forEach(b=>b.onclick=()=>copy(b.dataset.cp));
  out.querySelectorAll("[data-cl]").forEach(b=>b.onclick=()=>copyText(linkFor(b.dataset.cl)).then(()=>toast("Enlace copiado ✔ Al compartirlo por WhatsApp se verá la tarjeta de bienvenida.")));
  out.querySelectorAll("[data-cm]").forEach(b=>b.onclick=()=>copy(msgFor({producto:product,codigo:b.dataset.cm,dias:v.days})));
  out.querySelector("[data-batch-links]").onclick=()=>copyText(all.map(linkFor).join("\n")).then(()=>toast("Enlaces copiados ✔ Cada uno incluye la bienvenida para el cliente."));
  out.querySelector("[data-batch-codes]").onclick=()=>copy(all.join("\n"));
  out.querySelector("[data-batch-export]").onclick=()=>{
    const text=["IA Plus Colombia · Lote de accesos",product+" · "+v.days+" días · "+money(v.price)+" COP", "Creado: "+new Date().toLocaleString("es-CO",{timeZone:"America/Bogota"}),"",...all.map(c=>c+" · "+linkFor(c))].join("\n");
    const url=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download="iaplus-codigos-"+new Intl.DateTimeFormat("en-CA",{timeZone:"America/Bogota",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())+".txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
}
async function autoGen(e){
  e.preventDefault();if(generationBusy)return;
  let v;try{v=IAPAdminTools.validateBatch({qty:$("#aQty").value,days:$("#aDays").value,price:$("#aPrice").value});}catch(ex){toast(ex.message);return;}
  const product=$("#aProd").value,{plan,hechos}=planAuto(product,v.qty,getCap());
  if(!product||hechos!==v.qty){toast("No hay cuentas disponibles para este lote. Revisa Cuentas.");return;}
  generationBusy=true;const b=e.target.querySelector('[type="submit"]'),original=b.textContent;b.disabled=true;
  const results=[];let failure="";
  try{
    if(!await reviewGeneration(product,v,[...plan.values()]))return;
    b.textContent="Creando lote…";const progress=$("#batchProgress");progress.hidden=false;let total=0;
    for(const part of plan.values()){
      try{const codes=await makeCodes(part.fila,part.n,v.days,v.price,done=>{$("#batchProgressText").textContent=(total+done)+" de "+v.qty+" códigos confirmados";progress.querySelector("progress").value=(total+done)/v.qty*100;});results.push({correo:part.correo,codes});total+=codes.length;}
      catch(ex){if(ex.codes?.length)results.push({correo:part.correo,codes:ex.codes});throw ex;}
    }
  }catch(ex){failure=ex.message;}
  finally{
    if(results.length||failure){await refresh();const out=$("#autoOut");if(results.length)presentCodeBatch(out,results,product,v,failure);else{out.classList.add("on");out.innerHTML=`<p class="batch-error" role="alert">${esc(failure)}<br>No recibimos códigos confirmados. Actualiza la lista antes de repetir el lote.</p>`;}out.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth",block:"start"});toast(failure?"Lote detenido. Revisa el resultado.":"Lote creado. Elige cómo entregarlo.");}
    generationBusy=false;b.disabled=false;b.textContent=original;$("#batchProgress").hidden=true;updateGeneratorPreview();
  }
}

function accounts(){
  const m = new Map();
  items.forEach(i=>{ const k=i.producto+"|"+i.correo; if(!m.has(k)) m.set(k,{k,producto:i.producto,correo:i.correo,fila:i.fila,dias:i.dias}); });
  return [...m.values()];
}
function fillProducts(){
  const sel=$("#pf"); if(!sel) return; const prev=sel.value; const ps=[...new Set(items.map(i=>i.producto))];
  sel.innerHTML='<option value="">Todos los productos</option>'+ps.map(p=>`<option>${esc(p)}</option>`).join(""); if(ps.includes(prev)) sel.value=prev;
}
function fillAccounts(){
  fillProducts();
  const sel=$("#gAcc"); if(!sel) return; const prev=sel.value; const list=accounts();
  sel.innerHTML = list.length ? list.map(a=>{ const c=capMap().get(a.correo.toLowerCase()); const u=c?used(c):0, cap=getCap(); return `<option value="${esc(a.k)}">${esc(a.producto)} — ${esc(a.correo)} (${noCap()?u+" cliente"+(u===1?"":"s"):u+"/"+cap+(u>=cap?" · LLENA":"")})</option>`; }).join("") : '<option value="">Primero agrega una cuenta (abajo)</option>';
  if(prev && list.some(a=>a.k===prev)) sel.value=prev; else syncDays();
}
function syncDays(){ const a=accounts().find(x=>x.k===$("#gAcc").value); if(a){ $("#gDays").value=a.dias; $("#gPrice").value=priceOf(a.producto); } }
function showCodes(codes, it){
  const mb=$("#manualBox"); if(mb) mb.open=true;
  const n=$("#newcode"); n.classList.add("on");
  n.innerHTML = `<div style="color:var(--mut);font-size:13px">${codes.length>1?codes.length+" códigos nuevos":"Código nuevo"} (un solo uso) — ${esc(it.producto)}:</div>
    ${codes.map(c=>`<div class="codeline"><span class="mono">${esc(c)}</span><button class="btn s p" data-cl="${esc(c)}">🔗 Copiar enlace de activación</button><button class="btn s" data-cp="${esc(c)}">Copiar código</button><button class="btn s" data-cm="${esc(c)}">Copiar mensaje</button><a class="btn s" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msgFor({...it,codigo:c}))}">Enviar por WhatsApp</a></div>`).join("")}
    ${codes.length>1?`<div class="acts" style="margin-top:10px"><button class="btn s p" id="clAll">🔗 Copiar todos los enlaces</button><button class="btn s" id="cpAll">Copiar todos los códigos</button></div>`:""}`;
  n.querySelectorAll("[data-cp]").forEach(b=>b.onclick=()=>copy(b.dataset.cp));
  n.querySelectorAll("[data-cl]").forEach(b=>b.onclick=()=>copyText(linkFor(b.dataset.cl)).then(()=>toast("Enlace copiado ✔ Al compartirlo por WhatsApp se verá la tarjeta de bienvenida.")));
  n.querySelectorAll("[data-cm]").forEach(b=>b.onclick=()=>copy(msgFor({...it,codigo:b.dataset.cm})));
  const all=$("#cpAll"); if(all) all.onclick=()=>copy(codes.join("\n"));
  const allL=$("#clAll"); if(allL) allL.onclick=()=>copy(codes.map(linkFor).join("\n"));
}
async function genCode(e){
  e.preventDefault();if(generationBusy)return;const a=accounts().find(x=>x.k===$("#gAcc").value);if(!a)return toast("Primero agrega una cuenta");
  let v;try{v=IAPAdminTools.validateBatch({qty:$("#gQty").value,days:$("#gDays").value,price:$("#gPrice").value});}catch(ex){toast(ex.message);return;}
  const account=capMap().get(a.correo.toLowerCase());if(account?.prob)return toast("Esta cuenta está marcada con problemas. Elige otra.");
  generationBusy=true;const b=e.target.querySelector("button"),original=b.textContent;b.disabled=true;let codes=[],failure="";
  try{if(!await reviewGeneration(a.producto,v,[{correo:a.correo,n:v.qty}]))return;b.textContent="Generando…";codes=await makeCodes(a.fila,v.qty,v.days,v.price);}
  catch(ex){codes=ex.codes||[];failure=ex.message;}
  finally{
    if(codes.length||failure){await refresh();const out=$("#newcode");if(codes.length){presentCodeBatch(out,[{correo:a.correo,codes}],a.producto,v,failure);$("#manualBox").open=true;}else{out.classList.add("on");out.innerHTML=`<p class="batch-error" role="alert">${esc(failure)}<br>No recibimos códigos confirmados. Revisa la lista antes de repetir.</p>`;$("#manualBox").open=true;}}
    generationBusy=false;b.disabled=false;b.textContent=original;
  }
}

function filtered(){
  const q = norm($("#q")?.value||""), st = $("#st")?.value||"";
  const pf = $("#pf")?.value||"";
  return items.filter(i => (!st || (st==="active-plans"?!!i.cliente&&IAPInsights.isActive(i,Date.now()):st==="expired-code"?IAPInsights.isExpiredCode(i,Date.now(),TTL):st==="av"?state(i).k==="av"&&!IAPInsights.isExpiredCode(i,Date.now(),TTL):state(i).k===st)) && (!pf || i.producto===pf) && (!q || norm([i.cliente,i.nombre,i.correo,i.codigo,i.producto,i.nota].join(" ")).includes(q)))
    .sort((a,b)=> (b.codigo===hlCode)-(a.codigo===hlCode) || (a.restante??9999)-(b.restante??9999));
}
// Cuenta regresiva de un código sin canjear (se borra solo a los TTL minutos)
function expiraHtml(i){
  if(i.cliente || !i.codigo || !i.creado || !TTL) return "";
  const left = Math.ceil((new Date(i.creado).getTime() + TTL*60000 - Date.now())/60000);
  if(left<=0) return `<div class="exp over">⏱ vencido · se borra solo</div>`;
  return `<div class="exp ${left<=10?"low":""}">⏱ vence en ${left>=60?Math.floor(left/60)+" h "+(left%60)+" min":left+" min"}</div>`;
}
let codePage = 0, codeFilterKey = "";
const CODE_PAGE_SIZE = 20;
function rows(){
  if(curTab!=="cod")return;
  const el = $("#rows"); if(!el) return;
  const all = filtered();
  const filterKey = JSON.stringify([$("#q")?.value||"",$("#st")?.value||"",$("#pf")?.value||"",hlCode]);
  if(filterKey!==codeFilterKey){codePage=0;codeFilterKey=filterKey;}
  codePage=Math.max(0,Math.min(codePage,Math.ceil(all.length/CODE_PAGE_SIZE)-1));
  const start=codePage*CODE_PAGE_SIZE, list=all.slice(start,start+CODE_PAGE_SIZE);
  let pager=$("#codePager");
  if(!pager){pager=document.createElement("nav");pager.id="codePager";pager.className="code-pager";pager.setAttribute("aria-label","Páginas de códigos");el.closest(".wrapt").after(pager);}
  pager.innerHTML=`<span role="status">${all.length?start+1:0}–${Math.min(start+CODE_PAGE_SIZE,all.length)} de ${all.length} registros</span><div><button class="btn s" type="button" data-code-step="-1" ${codePage===0?"disabled":""}>← Anterior</button><button class="btn s" type="button" data-code-step="1" ${start+CODE_PAGE_SIZE>=all.length?"disabled":""}>Siguiente →</button></div>`;
  pager.querySelectorAll("[data-code-step]").forEach(button=>button.onclick=()=>{codePage+=Number(button.dataset.codeStep);rows();el.closest(".wrapt").scrollIntoView({block:"start",behavior:"instant"});});
  el.innerHTML = list.length ? list.map(i=>{
    const s = state(i);
    const rest = !i.cliente ? "—" : i.vencida ? `<b style="color:var(--bad)">Venció</b>` : `<b>${i.restante} ${i.restante===1?"día":"días"}</b>`;
    return `<tr data-f="${i.fila}" class="${hlCode&&i.codigo===hlCode?"hl":""}"><td data-l="Producto">${EMO(i.producto)} ${esc(i.producto)}</td><td data-l="Cuenta"><div>${esc(i.correo)}<br><small style="color:var(--mut)">${i.clave?"••••••••":"Sin contraseña"}</small><br>${i.tiene2fa?'<span class="tag t-ok" title="Tiene autenticador 2FA">2FA ✓</span>':'<span class="tag t-w" title="Sin clave 2FA">sin 2FA</span>'}${i.nota?`<div class="note" style="margin-top:4px">📝 ${esc(i.nota)}</div>`:""}</div></td>
      <td class="mono" data-l="Código">${esc(i.codigo||"—")}${expiraHtml(i)}</td><td data-l="Estado"><span class="tag t-${s.k}">${s.t}</span></td>
      <td data-l="Cliente" style="word-break:break-all">${i.cliente?`<div>${i.nombre?`<b>${esc(i.nombre)}</b><br>`:""}${esc(i.cliente)}${i.whatsapp?`<br><small style="color:var(--mut)">📱 ${esc(i.whatsapp)}</small>`:""}</div>`:"—"}</td><td data-l="Activada">${fdate(i.inicio)}</td><td data-l="Vence">${fdate(i.fin)}</td><td data-l="2FA usado">${i.cliente&&i.tiene2fa?`<span class="tag ${(i.usos2fa||0)>=(i.max2fa||5)?"t-b":"t-av"}">${i.usos2fa||0}/${i.max2fa||5}</span>`:"—"}</td><td data-l="Precio">${i.precio?money(i.precio):"—"}</td><td data-l="Restante"><div>${rest} <small style="color:var(--mut)">(plan ${i.dias} d)</small></div></td>
      <td class="acts-td"><div class="acts">
        ${i.codigo&&!i.cliente?`<button class="btn s p" data-a="link" title="Enlace que activa el plan directo en la cuenta del cliente">🔗 Copiar enlace de activación</button><a class="btn s wa" target="_blank" rel="noopener" href="${i.whatsapp?waLink(i.whatsapp, msgFor(i)):"https://wa.me/?text="+encodeURIComponent(msgFor(i))}">💬 Enviar enlace</a><button class="btn s" data-a="msg">Copiar mensaje</button><button class="btn s" data-a="assign">Asignar cliente</button>`:""}
        <button class="btn s" data-a="creds" title="Copia correo y contraseña">📋 Datos</button>
        <button class="btn s" data-a="pass" title="Cambiar la contraseña de esta cuenta">🔑 Contraseña</button>
        ${i.tiene2fa?`<button class="btn s" data-a="v2fa" title="Ver el código de autenticación ahora">🔢 Ver 2FA</button>`:""}
        ${i.cliente?`<button class="btn s p" data-a="repl" title="El cliente tiene un problema: darle otra cuenta">🔁 Reemplazar cuenta</button><button class="btn s" data-a="chcli">✏️ Cambiar Gmail</button>`:`<button class="btn s" data-a="prob">${state(i).k==="pr"?"✔ Ya funciona":"⚠️ Con problemas"}</button>`}
        ${i.cliente&&i.tiene2fa?`<button class="btn s" data-a="r2fa">Reiniciar 2FA</button>`:""}${i.cliente?`<button class="btn s" data-a="ext">+ Días</button>${i.whatsapp?`<a class="btn s wa" target="_blank" rel="noopener" href="${waLink(i.whatsapp, renewMsg(i))}">💬 WhatsApp</a>`:`<button class="btn s" data-a="wa">Renovar WA</button>`}`:""}
        <button class="btn s" data-a="clone" title="Otro código para esta misma cuenta (otro cliente)">+ Código otro cliente</button>
        <button class="btn s" data-a="edit">Editar</button>
        <button class="btn s" data-a="new">Nuevo código</button>
        ${i.cliente?`<button class="btn s d" data-a="rev">Quitar cliente</button>`:""}
        <button class="btn s d" data-a="del" title="Borra esta fila de la hoja">🗑</button>
      </div></td></tr>`;
  }).join("") : `<tr><td colspan="11" class="empty">No hay cuentas que coincidan.</td></tr>`;
}
async function addAccount(e){
  e.preventDefault(); const b=e.target.querySelector("button"); b.disabled=true;
  try{
    const j = await api("admin_add",{producto:$("#fProd").value,correo:$("#fMail").value,clave:$("#fPass").value,clave2fa:$("#fKey").value,dias:$("#fDays").value,precio:$("#fPrice").value});
    const prod=$("#fProd").value, dias=$("#fDays").value;
    hlCode = j.codigo; draftClear();
    $("#addForm").reset(); $("#fProd").value="ChatGPT"; $("#fDays").value=30; $("#fPrice").value=DEFAULT_PRICE; $("#addBox").open=false; $("#draftNote").textContent="";
    await refresh(); setTab("cod"); showCodes([j.codigo],{producto:prod,dias:dias});
    toast("Cuenta guardada en tu hoja de Google ✔");
    $("#rows tr.hl")?.scrollIntoView({behavior:"smooth",block:"center"});
  }catch(ex){ toast(ex.message); }
  b.disabled=false;
}
function copy(t){ copyText(t).then(()=>toast("Copiado ✔")); }

/* ---------- Registro ---------- */
let logData = [];
let logCli = "", logReq = 0;
/* ---------- Seguridad: bloqueos y cierre de sesiones ---------- */
function drawSeg(r){
  const ids = Object.keys(r.bloqueados||{}), el = $("#segList"); if(!el) return;
  el.innerHTML = ids.length ? ids.map(m=>{ const b=r.bloqueados[m]||{}; return `<div class="mini" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px"><div style="min-width:0;word-break:break-word"><b>${esc(m)}</b><br><small style="color:var(--mut)">${esc(b.motivo||"Sin motivo")}${b.fecha?" · desde "+esc(fdate(new Date(b.fecha).toISOString())):""}</small></div><button class="btn s" type="button" data-seg-un="${esc(m)}">Desbloquear</button></div>`; }).join("") : '<p style="color:var(--mut);font-size:14px;margin:0">Nadie está bloqueado.</p>';
  const info = $("#segInfo"); if(info) info.textContent = r.sesionDesde ? "Última vez que se cerraron las sesiones: "+new Date(r.sesionDesde).toLocaleString("es-CO",{timeZone:"America/Bogota"}) : "";
}
async function loadSeg(){
  try{ drawSeg(await api("admin_seg_info")); }
  catch(ex){ const el=$("#segList"); if(el) el.innerHTML = `<p style="color:var(--mut);font-size:14px;margin:0">${esc(/no válida/i.test(ex.message)?"Falta actualizar el backend (Code.gs) en Apps Script para usar la seguridad.":ex.message)}</p>`; }
}
async function segCall(action, data, okMsg){
  try{ const r = await api(action, data); toast(okMsg); if(r.bloqueados) drawSeg({bloqueados:r.bloqueados, sesionDesde:0}); await loadSeg(); }
  catch(ex){ toast(ex.message); }
}
document.addEventListener("click", e=>{
  const t = e.target;
  if(t.id==="segBlock"){ const m=$("#segMail").value.trim().toLowerCase(); if(!m) return toast("Escribe el Gmail del cliente"); if(!confirm("¿Bloquear a "+m+"? No podrá usar la tienda hasta que lo desbloquees.")) return; segCall("admin_seg_bloquear",{cliente:m,motivo:$("#segWhy").value.trim()},"Cliente bloqueado ✔").then(()=>{ $("#segMail").value=""; $("#segWhy").value=""; }); }
  else if(t.dataset && t.dataset.segUn){ segCall("admin_seg_desbloquear",{cliente:t.dataset.segUn},"Cliente desbloqueado ✔"); }
  else if(t.id==="segLogout"){ if(!confirm("Se cerrará la sesión de TODOS (también la tuya) y cada persona deberá volver a entrar con Google. ¿Continuar?")) return; api("admin_seg_cerrar_sesiones").then(()=>{ toast("Sesiones cerradas. Entra de nuevo."); try{ localStorage.removeItem("iap_cred"); }catch{} setTimeout(()=>location.reload(),900); }).catch(ex=>toast(ex.message)); }
});
async function loadLog(cli){
  logCli = typeof cli==="string" ? cli : ""; const my = ++logReq; // si llegan dos respuestas, solo vale la última pedida
  $("#lrows").innerHTML = '<tr><td colspan="4" class="empty">Cargando…</td></tr>'; $("#lsum").innerHTML = "";
  try{ const r = (await api("admin_log", logCli?{cliente:logCli}:{})).log; if(my!==logReq) return; logData = r; drawLog(); }
  catch(ex){ $("#lrows").innerHTML = `<tr><td colspan="4" class="empty">${esc(/no válida/i.test(ex.message)?"Falta actualizar el backend (Code.gs) en Apps Script.":ex.message)}</td></tr>`; }
}
const fdtL = iso => { if(!iso) return "—"; const d=new Date(iso); return d.toLocaleDateString("es-CO",{timeZone:"America/Bogota",weekday:"short",day:"2-digit",month:"short"})+" · <b>"+d.toLocaleTimeString("es-CO",{timeZone:"America/Bogota",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true})+"</b>"; };
function logSummary(list){
  if(!logCli){ $("#lsum").innerHTML=""; return; }
  if(!list.length){ $("#lsum").innerHTML='<div class="mini">Este cliente no tiene actividad registrada todavía.</div>'; return; }
  const hrs = new Array(24).fill(0), devs = {}, evs = {};
  list.forEach(l=>{ const h=+new Date(l.fecha).toLocaleString("en-US",{timeZone:"America/Bogota",hour:"numeric",hour12:false})%24; hrs[h]++;
    const m=/· ((?:Android|iPhone|Windows|Mac|Linux|Otro) · [^·]+)$/.exec(l.detalle); if(m) devs[m[1].trim()]=(devs[m[1].trim()]||0)+1; evs[l.evento]=(evs[l.evento]||0)+1; });
  const hh = h => (h%12||12)+(h<12?" a. m.":" p. m.");
  const top = hrs.map((n,h)=>[n,h]).filter(x=>x[0]).sort((a,b)=>b[0]-a[0]).slice(0,3).map(x=>hh(x[1])+" ("+x[0]+")").join(", ");
  const max = Math.max(...hrs);
  const bars = hrs.map((n,h)=>`<div title="${hh(h)}: ${n} movimiento(s)" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:2px"><i style="display:block;width:100%;height:${max?Math.max(n?6:0,Math.round(n/max*54)):0}px;background:var(--red,#ef5350);border-radius:3px 3px 0 0;opacity:${n?1:0}"></i><small style="font-size:9px;color:var(--mut)">${h%3===0?h:""}</small></div>`).join("");
  const sorted = list.map(l=>l.fecha).sort();
  $("#lsum").innerHTML = `<div class="mini" style="margin:10px 0">
    <b>${esc(logCli)}</b> · ${list.length} movimiento(s) · primero: ${fdtL(sorted[0])} · último: ${fdtL(sorted[sorted.length-1])}<br>
    <b>Horas en que más se mueve:</b> ${esc(top)}<br>
    <b>Dispositivos:</b> ${esc(Object.entries(devs).sort((a,b)=>b[1]-a[1]).map(x=>x[0]+" ("+x[1]+")").join(", ")||"—")}<br>
    <b>Lo que más hace:</b> ${esc(Object.entries(evs).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]+" ("+x[1]+")").join(", "))}
    <div style="display:flex;gap:2px;height:72px;margin-top:10px;align-items:stretch" aria-label="Movimientos por hora del día">${bars}</div>
    <small style="color:var(--mut)">Movimientos por hora del día (0 = medianoche, hora de Colombia)</small></div>`;
}
function drawLog(){
  const q = ($("#lq")?.value||"").toLowerCase();
  const list = logData.filter(l=>!q||[l.evento,l.detalle,l.quien].join(" ").toLowerCase().includes(q));
  logSummary(list);
  $("#lrows").innerHTML = list.length ? list.map(l=>`<tr><td data-l="Fecha" style="white-space:nowrap">${fdtL(l.fecha)}</td><td data-l="Evento"><b>${esc(l.evento)}</b></td><td data-l="Detalle" style="word-break:break-all">${esc(l.detalle)}</td><td data-l="Quién" style="word-break:break-all">${esc(l.quien)}</td></tr>`).join("") : `<tr><td colspan="4" class="empty">Sin eventos.</td></tr>`;
}

/* ---------- CSV ---------- */
function download(name, head, data){
  const q = v => '"'+String(v??"").replace(/"/g,'""')+'"';
  const csv = [head.map(q).join(",")].concat(data.map(r=>r.map(q).join(","))).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv"})); a.download = name; a.click();
}
function exportCsv(){
  download("cuentas-iaplus.csv",["Producto","Cuenta","Codigo","Estado","Cliente","Nombre","WhatsApp","Activada","Vence","Dias restantes","Dias del plan","Precio","Nota"],
    filtered().map(i=>[i.producto,i.correo,i.codigo,state(i).t,i.cliente,i.nombre,i.whatsapp,fdate(i.inicio),fdate(i.fin),i.restante??"",i.dias,i.precio||"",i.nota]));
}
const CLIENT_HEAD = ["Nombre","Gmail","WhatsApp","Cuentas","Activas","Vencidas","Estado","Vence","Cliente desde","Total pagado","Nota"];
const clientRow = c => [c.nombre,c.email,c.whatsapp,c.cuentas.length,c.activos,c.vencidos,cState(c).t,fdate(c.vence),fdate(c.primera),c.gastado,c.nota];
function exportClientsCsv(){ download("clientes-iaplus.csv", CLIENT_HEAD, cFiltered().map(clientRow)); }

/* ---------- Selección masiva de clientes ---------- */
const cSel = new Set(); // Gmail de los clientes marcados; sobrevive a los filtros mientras el panel esté abierto
function cSelUpdate(){
  const bar = $("#cBulk"); if(!bar) return;
  const n = cSel.size;
  bar.classList.toggle("hide", n===0); $("#cBulkN").textContent = n+(n===1?" seleccionado":" seleccionados");
  const all = $("#cselAll"), vis = cFiltered().slice(clientPage*CLIENT_PAGE_SIZE,(clientPage+1)*CLIENT_PAGE_SIZE).map(c=>c.email);
  if(all){ all.checked = vis.length>0 && vis.every(e=>cSel.has(e)); all.indeterminate = !all.checked && vis.some(e=>cSel.has(e)); }
}
function cSelected(){ const byMail = new Map(clients().map(c=>[c.email,c])); return [...cSel].map(e=>byMail.get(e)).filter(Boolean); }
function exportSelectedCsv(){ download("clientes-seleccionados-iaplus.csv", CLIENT_HEAD, cSelected().map(clientRow)); }
async function copySelectedPhones(){
  const nums = cSelected().map(c=>c.whatsapp).filter(Boolean);
  if(!nums.length) return toast("Los clientes seleccionados no tienen WhatsApp guardado");
  try{ await navigator.clipboard.writeText(nums.join("\n")); toast(nums.length+" WhatsApp copiados ✔"); }
  catch{ toast("No pudimos copiar. Selecciona los números a mano."); }
}
function wireClientSelection(){
  $("#cBulkCsv").onclick = exportSelectedCsv;
  $("#cBulkTel").onclick = copySelectedPhones;
  $("#cBulkClr").onclick = ()=>{ cSel.clear(); crows(); };
  $("#cselAll").onchange = e=>{ cFiltered().slice(clientPage*CLIENT_PAGE_SIZE,(clientPage+1)*CLIENT_PAGE_SIZE).forEach(c=>e.target.checked ? cSel.add(c.email) : cSel.delete(c.email)); crows(); };
  $("#crows").onchange = e=>{ const b = e.target.closest(".csel"); if(!b) return; b.checked ? cSel.add(b.dataset.sel) : cSel.delete(b.dataset.sel); cSelUpdate(); };
}

/* ---------- Seguridad: cierre automático por inactividad ---------- */
// Si el panel queda sin usar 30 minutos, se borra la sesión y hay que volver a entrar con Google.
const IDLE_MS = 30*60*1000; let idleTimer = 0;
function idleLock(){ if(!load("iap_cred")) return; try{ localStorage.removeItem("iap_cred"); }catch{} location.reload(); }
function resetIdle(){ clearTimeout(idleTimer); idleTimer = setTimeout(idleLock, IDLE_MS); }
["pointerdown","keydown","touchstart","scroll"].forEach(ev=>document.addEventListener(ev, resetIdle, {passive:true}));
resetIdle();

/* ---------- Ver código 2FA (soporte) ---------- */
async function show2fa(i){
  const d=document.createElement("dialog");
  d.innerHTML=`<h2>🔢 Código 2FA</h2><p style="color:var(--mut);font-size:14px">${esc(i.correo)}</p><div class="mono" id="t2c" style="font-size:44px;letter-spacing:.12em;text-align:center;margin:14px 0;color:var(--acc)">······</div><div class="prog2"><i id="t2b"></i></div><p id="t2s" style="text-align:center;color:var(--mut);font-size:13px;margin-top:8px"></p><div class="acts" style="justify-content:flex-end;margin-top:14px"><button class="btn" id="t2cp">Copiar</button><button class="btn p" id="t2x">Cerrar</button></div>`;
  document.body.appendChild(d); d.showModal();
  let code="", end=0, alive=true;
  const pull=async()=>{ try{ const j=await api("totp",{correo:i.correo,ask:true}); code=j.code; end=Date.now()+j.left*1000; $("#t2c").textContent=code.slice(0,3)+" "+code.slice(3); }catch(ex){ $("#t2s").textContent=ex.message; } };
  await pull();
  const iv=setInterval(()=>{ if(!alive) return; const l=Math.max(0,Math.ceil((end-Date.now())/1000)); $("#t2s").textContent="Cambia en "+l+" s"; $("#t2b").style.width=(l/30*100)+"%"; if(l<=0) pull(); },500);
  $("#t2cp").onclick=()=>copy(code); $("#t2x").onclick=()=>d.close();
  d.addEventListener("close",()=>{ alive=false; clearInterval(iv); d.remove(); });
}

/* ---------- Acciones ---------- */
// Cambia la contraseña en TODAS las filas (códigos) que comparten ese correo. Funciona con el backend viejo y el nuevo.
async function setPasswordEverywhere(correo, nueva){
  const mail = correo.toLowerCase();
  let pend = items.filter(x=>x.correo.toLowerCase()===mail && x.clave!==nueva);
  let revisado = false;
  for(let n=0; n<pend.length && n<60; n++){
    toast("Actualizando contraseña… "+(n+1)+" de "+pend.length);
    await api("admin_update",{fila:pend[n].fila,clave:nueva});
    if(!revisado){ revisado = true; // con el backend nuevo la primera llamada ya actualiza todas: se revisa para no repetir
      const j = await api("admin_list"); items = j.items; if(j.ttl!==undefined) TTL = j.ttl;
      pend = items.filter(x=>x.correo.toLowerCase()===mail && x.clave!==nueva); n = -1; if(!pend.length) break;
    }
  }
  await refresh();
  return items.filter(x=>x.correo.toLowerCase()===mail);
}
async function changePassword(i){
  const mismas = items.filter(x=>x.correo.toLowerCase()===i.correo.toLowerCase());
  const conCli = mismas.filter(x=>x.cliente).length;
  const v = await askForm("Cambiar contraseña de "+i.correo,[
    {id:"clave",label:"Nueva contraseña",value:i.clave,req:true}],
    "Se actualiza en "+mismas.length+(mismas.length===1?" código":" códigos")+" de esta cuenta ("+conCli+(conCli===1?" cliente la verá":" clientes la verán")+" al instante en Mi cuenta).");
  if(!v) return; const nueva=String(v.clave).trim();
  if(!nueva||nueva===i.clave) return toast("No hay cambios");
  const fin = await setPasswordEverywhere(i.correo, nueva);
  const mal = fin.filter(x=>x.clave!==nueva).length;
  toast(mal ? "⚠️ "+mal+" código(s) no se actualizaron. Pulsa de nuevo en Cambiar contraseña" : "Contraseña actualizada ✔ para "+conCli+(conCli===1?" cliente":" clientes")+" ("+fin.length+(fin.length===1?" código":" códigos")+")");
  if(!mal) offerNotify(i.correo, i.producto);
}
document.addEventListener("input", e=>{ const inp=e.target.closest(".pr-in"); if(!inp) return; const b=document.querySelector(`[data-ps="${CSS.escape(inp.dataset.pk)}"]`); if(b) b.disabled = inp.value.trim()==="" || inp.value.trim()===inp.dataset.orig; });
document.addEventListener("keydown", e=>{ if(e.key==="Enter" && e.target.classList && e.target.classList.contains("pr-in")){ e.preventDefault(); savePass(e.target.dataset.pk); } });
document.addEventListener("click", async e=>{
  const ps = e.target.closest("[data-ps]");
  if(ps){ await savePass(ps.dataset.ps); return; }
  const pa = e.target.closest("[data-pa]");
  if(pa){ const i=items.find(x=>String(x.fila)===pa.dataset.pa); if(i){ try{ await changePassword(i); }catch(ex){ toast(ex.message); } } return; }
  const ca = e.target.closest("[data-ca]");
  if(ca){
    const c = clients().find(x=>x.email===ca.closest("tr").dataset.c); if(!c) return;
    try{ if(ca.dataset.ca==="info") clientDetail(c); else if(ca.dataset.ca==="grant") await grantAccounts(c.email); else if(ca.dataset.ca==="2fa") await dar2fa(c.email); else await editClient(c); }catch(ex){ toast(ex.message); }
    return;
  }
  const bt = e.target.closest("[data-a]"); if(!bt) return;
  const host = bt.closest("tr")||bt.closest(".alert"); const i = items.find(x=>String(x.fila)===host.dataset.f); if(!i) return;
  const a = bt.dataset.a;
  try{
    if(a==="msg"){ copy(msgFor(i)); return; }
    if(a==="link"){ copyText(linkFor(i.codigo)).then(()=>toast("Enlace copiado ✔ Al compartirlo por WhatsApp se verá la tarjeta de bienvenida.")); return; }
    if(a==="v2fa"){ await show2fa(i); return; }
    if(a==="repl"){
      const dests = accounts().filter(x=>x.correo.toLowerCase()!==i.correo.toLowerCase() && items.some(z=>z.correo===x.correo && z.estado!=="Con problemas"));
      if(!dests.length) return toast("Primero agrega otra cuenta para poder reemplazar");
      const v = await askForm("Reemplazar la cuenta de "+(i.nombre||i.cliente),[
        {id:"destino",label:"Darle esta cuenta",type:"select",opts:dests.map(x=>({v:x.fila,l:x.producto+" — "+x.correo})),value:(dests.find(x=>x.producto===i.producto)||dests[0]).fila},
        {id:"motivo",label:"Motivo (opcional)",ph:"Ej: la cuenta pidió verificación"},
        {id:"marcarProblema",label:"Marcar la cuenta anterior ("+i.correo+") como «Con problemas» para no entregarla",type:"check",value:true}],
        "Se queda con el mismo código y el mismo tiempo restante ("+(i.restante??"—")+" días). El correo y la contraseña que ve en Mi cuenta cambian solos.","Reemplazar");
      if(!v) return; await api("admin_replace",{fila:i.fila,destino:v.destino,motivo:v.motivo,marcarProblema:!!v.marcarProblema}); toast("Cuenta reemplazada ✔ El cliente ya ve la nueva");
    }
    if(a==="chcli"){ const v = await askForm("Cambiar el Gmail del cliente",[{id:"cliente",label:"Nuevo Gmail",type:"email",req:true,value:i.cliente}],"Conserva el plan y las fechas. El cliente anterior pierde el acceso."); if(!v) return; await api("admin_changeclient",{fila:i.fila,cliente:v.cliente}); toast("Gmail cambiado ✔"); }
    if(a==="prob"){ await api("admin_setstate",{fila:i.fila,estado:state(i).k==="pr"?"Disponible":"Con problemas"}); toast("Estado actualizado ✔"); }
    if(a==="pass"){ await changePassword(i); return; }
    if(a==="creds"){ copy(`${i.producto}\nCuenta: ${i.correo}\nContraseña: ${i.clave}`); return; }
    if(a==="wa"){ window.open("https://wa.me/?text="+encodeURIComponent(renewMsg(i)),"_blank"); return; }
    if(a==="clone"){ const j = await api("admin_clone",{fila:i.fila,precio:priceOf(i.producto)}); copy(msgFor({...i,codigo:j.codigo})); toast("Código nuevo para la misma cuenta ✔ (mensaje copiado)"); }
    if(a==="r2fa"){ if(!confirm("¿Devolver los pedidos de códigos de autenticación de hoy a "+i.cliente+"?")) return; await api("admin_reset2fa",{fila:i.fila}); toast("Códigos 2FA reiniciados ✔"); }
    if(a==="ext"){
      const v = await askForm("Renovar / sumar días a "+(i.nombre||i.cliente),[
        {id:"dias",label:"Días a sumar (usa negativo para restar)",type:"number",value:30,req:true},
        {id:"precio",label:"Monto cobrado en COP (opcional, se suma al total del cliente)",type:"number",value:priceOf(i.producto)}]);
      if(!v) return;
      await api("admin_extend",{fila:i.fila,dias:v.dias,precio:v.precio}); toast("Días agregados ✔");
    }
    if(a==="assign"){
      const v = await askForm("Asignar cliente a "+i.codigo,[
        {id:"cliente",label:"Gmail del cliente",type:"email",req:true,ph:"cliente@gmail.com"}],
        "El plan empieza a contar desde ahora, igual que si el cliente canjeara el código.");
      if(!v) return; await api("admin_assign",{fila:i.fila,cliente:v.cliente}); toast("Cliente asignado ✔");
    }
    if(a==="new"){ if(!confirm(i.cliente?"Esta cuenta ya tiene cliente. Un código nuevo la libera y le quita el acceso al cliente actual. ¿Continuar?":"¿Generar un código nuevo para esta cuenta?")) return;
      const j = await api("admin_newcode",{fila:i.fila}); copy(msgFor({...i,codigo:j.codigo})); toast("Nuevo código creado y mensaje copiado ✔"); }
    if(a==="rev"){ if(!confirm("¿Quitar al cliente "+i.cliente+" de esta cuenta? El código quedará libre otra vez.")) return; await api("admin_revoke",{fila:i.fila}); toast("Cliente quitado ✔"); }
    if(a==="del"){ if(!confirm("¿Borrar esta fila ("+(i.codigo||i.correo)+")"+(i.cliente?" y el acceso de "+i.cliente:"")+"? No se puede deshacer, pero queda anotado en el Registro.")) return;
      await api("admin_delete",{fila:i.fila}); toast("Fila borrada ✔"); }
    if(a==="edit"){
      const v = await askForm("Editar cuenta "+i.correo,[
        {id:"correo",label:"Correo de la cuenta",value:i.correo},
        {id:"clave",label:"Contraseña de la cuenta",value:i.clave},
        {id:"producto",label:"Producto",value:i.producto},
        {id:"clave2fa",label:"Clave del autenticador 2FA (vacío = no cambiar)",value:"",ph:i.tiene2fa?"Ya tiene una guardada":"ABCD EFGH IJKL MNOP"},
        {id:"diasPlan",label:"Días del plan",type:"number",value:i.dias},
        {id:"precio",label:"Precio (COP)",type:"number",value:i.precio||""},
        {id:"whatsapp",label:"WhatsApp del cliente",value:i.whatsapp,ph:"3001234567"},
        {id:"nota",label:"Nota privada",value:i.nota,area:true}]);
      if(!v) return;
      await api("admin_update",{fila:i.fila,...v});
      if(v.clave && v.clave.trim() && v.clave.trim()!==i.clave && (!v.correo || v.correo.trim().toLowerCase()===i.correo.toLowerCase())){ await refresh(); await setPasswordEverywhere(i.correo, v.clave.trim()); }
      toast("Cuenta actualizada ✔");
    }
    await refresh();
  }catch(ex){ toast(/no válida|Acción/i.test(ex.message)?"Falta actualizar el backend (Code.gs) en Apps Script para usar esta función.":ex.message); }
});
$("#reload").onclick = refresh;
document.addEventListener("keydown",e=>{ // "/" enfoca el buscador
  if(e.key!=="/" || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || !$("#q")) return;
  e.preventDefault(); if(curTab!=="cli"&&curTab!=="cod") setTab("cod"); (curTab==="cli"?$("#cq"):$("#q")).focus();
});
const isEditing = () => { const a=document.activeElement; return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
start(); setInterval(()=>{ if(!document.hidden && !isEditing() && !godDirty && !generationBusy && !productDrafts.size && $("#rows") && !document.querySelector("dialog[open]")) refresh(); }, 120000);


/* =====================================================================
   FUNCIONES DE GESTIÓN: plantillas, avisos, alertas, vencimientos,
   rentabilidad, búsqueda global, ajustes, respaldo y modo oscuro.
   (Se guardan en este navegador; no necesitan cambios en el backend.)
   ===================================================================== */
const lsSet = (k,v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} };
const firstName = i => String(i.nombre||"").trim().split(/\s+/)[0] || "";
const sp = s => String(s).replace(/ {2,}/g," ").replace(/ ([.,!?])/g,"$1");

/* ---------- Plantillas de mensajes ---------- */
const TPL_DEFAULT = {
  renovar: "Hola {nombre} 👋 Tu plan de {producto} {estado}. ¿Quieres renovarlo?",
  vencido: "Hola {nombre} 👋 Tu {producto} venció el {fin}. ¿Quieres reactivarlo? Escríbenos y lo dejamos listo.",
  codigo: "Hola 👋 Tu cuenta de {producto} está lista.\n\n👉 Actívala con un clic: {enlace}\n\nSolo inicia sesión con tu Gmail y se desbloquea sola. (Código: {codigo})\n\nEl enlace funciona una sola vez y tu plan dura {dias} días desde que lo actives.",
  clave: "Hola {nombre} 👋 Actualizamos la contraseña de tu cuenta de {producto}. Entra a {sitio}cuenta.html y verás los datos nuevos. Si tienes dudas, escríbenos."
};
const TPL = () => ({...TPL_DEFAULT, ...(load("iap_tpl")||{})});
function fillTpl(key, v){ const t = TPL()[key] || TPL_DEFAULT[key]; return t.replace(/\{(\w+)\}/g,(m,k)=> v[k]!==undefined ? v[k] : m); }
function renewMsg(i){
  const base = {nombre:firstName(i), producto:i.producto, fin:fdate(i.fin), dias:i.dias, sitio:SITE, estado:i.vencida?"venció el "+fdate(i.fin):"vence el "+fdate(i.fin)};
  return sp(fillTpl(i.vencida?"vencido":"renovar", base));
}
const linkFor = c => SITE + "cuenta.html?codigo=" + encodeURIComponent(c);
function msgFor(i){ let m = fillTpl("codigo", {producto:i.producto, codigo:i.codigo, dias:i.dias, sitio:SITE, nombre:firstName(i), enlace:linkFor(i.codigo)}); if(!m.includes("cuenta.html?codigo=")) m += "\n\n🔗 Abre tu enlace personal de activación: " + linkFor(i.codigo); return m + "\n\n🧭 Para activar tu acceso:\n1. Abre el enlace y entra con tu Gmail.\n2. Revisa tu plan y pulsa «Activar mi acceso».\n3. Al confirmarse, entra a «Mi cuenta» y sigue los pasos para iniciar sesión.\n\n🔒 No compartas tu contraseña ni códigos de verificación. Si necesitas ayuda, responde a este mensaje."; }

/* ---------- Seguimiento de avisos (a quién ya le escribiste) ---------- */
const avKey = i => String(i.cliente).toLowerCase()+"|"+i.producto+"|"+(i.fin||"");
const AVS = () => load("iap_avisos") || {};
function markAv(i){ const a = AVS(); a[avKey(i)] = Date.now(); lsSet("iap_avisos", a); }
function avText(i){
  const t = AVS()[avKey(i)]; if(!t) return "";
  const h = Math.floor((Date.now()-t)/3600000);
  return h<1 ? "hace unos minutos" : h<24 ? "hace "+h+" h" : "hace "+Math.floor(h/24)+" d";
}
function attentionHtml(){
  const list = items.filter(i=>i.cliente && (i.vencida || (i.restante!==null && i.restante<=5)))
    .sort((a,b)=> (!!AVS()[avKey(a)]-!!AVS()[avKey(b)]) || ((a.restante??-9999)-(b.restante??-9999))).slice(0,30);
  if(!list.length) return '<div class="empty">Todo al día ✔ No hay planes por vencer ni vencidos.</div>';
  const pend = list.filter(i=>!AVS()[avKey(i)]).length;
  return `<div class="avhead">${pend?`<b>${pend}</b> por avisar`:"✔ Ya avisaste a todos"} · <small>los que ya avisaste bajan al final</small></div>` +
    list.map(i=>{ const av = avText(i); return `<div class="alert ${av?"done":""}" data-f="${i.fila}"><div class="who"><b>${esc(i.nombre||i.cliente)}</b><br><small style="color:var(--mut)">${esc(i.cliente)} · ${esc(i.producto)}</small></div>
    <span class="tag t-${i.vencida?"b":"w"}">${i.vencida?"Venció "+fdate(i.fin):"Vence en "+i.restante+(i.restante===1?" día":" días")}</span>
    ${av?`<small class="avdone">✔ avisado ${av}</small>`:""}
    <a class="btn s wa" target="_blank" rel="noopener" data-av="${i.fila}" href="${waLink(i.whatsapp, renewMsg(i))}">💬 ${av?"Avisar otra vez":"Avisar por WhatsApp"}</a>
    <button class="btn s" data-a="ext">Renovar</button></div>`; }).join("");
}

/* ---------- Alertas inteligentes ---------- */
function alertsHtml(){
  const cap = getCap(), out = [], cm = [...capMap().values()];
  if(!noCap()) cm.filter(a=>!a.prob && used(a)>=cap).forEach(a=>out.push({t:"b",ic:"🚫",tx:`Cuenta llena (${used(a)}/${cap}): <b>${esc(a.correo)}</b>. No le generes más códigos.`,go:"cta"}));
  if(!noCap()) cm.filter(a=>!a.prob && used(a)<cap && used(a)>=Math.ceil(cap*.8)).forEach(a=>out.push({t:"w",ic:"📈",tx:`Casi llena (${used(a)}/${cap}): <b>${esc(a.correo)}</b>. Conviene agregar una cuenta nueva.`,go:"cta"}));
  cm.filter(a=>a.prob).forEach(a=>out.push({t:"b",ic:"⚠️",tx:`Cuenta marcada con problemas: <b>${esc(a.correo)}</b>.`,go:"cta"}));
  const sin2 = {}; items.forEach(i=>{ if(i.cliente && IAPInsights.isActive(i,Date.now()) && !i.tiene2fa){ const k=i.correo.toLowerCase(); sin2[k]=(sin2[k]||0)+1; } });
  Object.entries(sin2).forEach(([k,n])=>out.push({t:"w",ic:"🔓",tx:`<b>${esc(k)}</b> tiene ${n} cliente${n===1?"":"s"} y no tiene clave 2FA guardada.`,go:"cta"}));
  const prods = new Set(items.map(i=>i.producto));
  prods.forEach(p=>{ const abiertas = cm.filter(a=>!a.prob && a.filas[p]!==undefined && (noCap() || used(a)<cap)); if(!abiertas.length && cm.some(a=>a.filas[p]!==undefined)) out.push({t:"b",ic:"🧯",tx:`Sin cupo para vender <b>${esc(p)}</b>: todas sus cuentas están llenas.`,go:"cod"}); });
  const venc7 = items.filter(i=>i.cliente && i.vencida && i.restante!==null && i.restante<=-1 && i.restante>=-7 && !AVS()[avKey(i)]);
  if(venc7.length) out.push({t:"w",ic:"💸",tx:`${venc7.length} cliente${venc7.length===1?"":"s"} venció${venc7.length===1?"":"ieron"} en la última semana y no los has avisado: es el mejor momento para recuperarlos.`,go:"res",el:"#attn"});
  if(TTL) items.filter(i=>!i.cliente && i.codigo && i.creado).forEach(i=>{ const left = Math.ceil((new Date(i.creado).getTime()+TTL*60000-Date.now())/60000); if(left>0 && left<=10) out.push({t:"w",ic:"⏱",tx:`El código <b>${esc(i.codigo)}</b> se borra en ${left} min si nadie lo canjea.`,go:"cod"}); });
  if(!out.length) return '<div class="empty">Todo en orden ✔ No hay alertas.</div>';
  const rank = {b:0,w:1}; out.sort((a,b)=>rank[a.t]-rank[b.t]);
  return out.slice(0,12).map(a=>`<button class="alrt ${a.t}" type="button" data-goto="${a.go}" ${a.el?`data-el="${a.el}"`:""}><span>${a.ic}</span><span>${a.tx}</span></button>`).join("");
}

/* ---------- Vencimientos de los próximos 14 días ---------- */
function dueHtml(){
  const days = [...Array(14)].map((_,k)=>({k, n:0, names:[], v:0}));
  items.filter(i=>i.cliente && IAPInsights.isActive(i,Date.now()) && i.fin).forEach(i=>{
    const d = Math.ceil((new Date(i.fin)-Date.now())/DAY_MS); if(d>=0 && d<14){ days[d].n++; days[d].names.push(i.nombre||i.cliente); days[d].v += Number(i.precio)||0; }
  });
  const mx = Math.max(1,...days.map(d=>d.n)), week = days.slice(0,7), nw = week.reduce((s,d)=>s+d.n,0), vw = week.reduce((s,d)=>s+d.v,0);
  const lbl = k => { if(k===0) return "hoy"; if(k===1) return "mañ"; const d=new Date(Date.now()+k*DAY_MS); return d.toLocaleDateString("es-CO",{weekday:"short"}).slice(0,2)+" "+d.getDate(); };
  return `<div class="due">${days.map(d=>`<div class="dcol" title="${esc(d.names.join(", ")||"Nadie")}"><b>${d.n||""}</b><i class="${d.k<=2?"hot":""}" style="height:${d.n?Math.max(10,d.n/mx*74):3}px"></i><span>${lbl(d.k)}</span></div>`).join("")}</div>
    <p class="duenote">${nw?`Esta semana vencen <b>${nw}</b> plan${nw===1?"":"es"}. Si todos renuevan entran <b>${money(vw)}</b>.`:"Nadie vence en los próximos 7 días."}</p>`;
}
const DAY_MS = 86400000;

/* ---------- Rentabilidad por cuenta (el costo lo anotas tú) ---------- */
const COST_KEY = "iap_costs";
const COSTS = () => load(COST_KEY) || {};
function profitHtml(){
  const costs = COSTS(), m = new Map();
  items.forEach(i=>{
    const k = i.correo.toLowerCase(), a = m.get(k) || {k, correo:i.correo, producto:i.producto, act:0, ing:0};
    if(i.cliente && IAPInsights.isActive(i,Date.now())){ a.act++; a.ing += (Number(i.precio)||0) * 30 / Math.max(1, i.dias||30); }
    m.set(k,a);
  });
  const list = [...m.values()].sort((a,b)=>b.ing-a.ing);
  let tIng=0, tCost=0;
  const rows = list.map(a=>{ const c = Number(costs[a.k])||0; tIng += a.ing; tCost += c; const g = a.ing - c;
    return `<div class="prow"><div class="pr-n"><b>${EMO(a.producto)} ${esc(a.producto)}</b><span class="mono">${esc(a.correo)}</span><small>${a.act} activo${a.act===1?"":"s"}</small></div>
      <div class="pr-c"><small>Ingreso/mes</small><b>${money(a.ing)}</b></div>
      <div class="pr-c"><small>Costo/mes</small><input class="cost-in" data-ck="${esc(a.k)}" type="number" min="0" step="500" value="${c||""}" placeholder="0" aria-label="Costo de ${esc(a.correo)}"></div>
      <div class="pr-c"><small>Ganancia</small><b class="${g<0?"neg":"pos"}">${money(g)}</b></div></div>`; }).join("");
  const g = tIng - tCost;
  return `<p style="color:var(--mut);font-size:13px;margin-bottom:10px">Valor mensual estimado = precios registrados de los planes de clientes <b>activos</b> de cada cuenta (ajustado a 30 días). Escribe cuánto te cuesta cada cuenta al mes; se guarda en este navegador. Es una estimación; no sustituye una conciliación de ingresos y gastos.</p>${rows||'<div class="empty">Aún no hay cuentas.</div>'}
    <div class="prow total"><div class="pr-n"><b>Total</b></div><div class="pr-c"><small>Ingreso/mes</small><b>${money(tIng)}</b></div><div class="pr-c"><small>Costos/mes</small><b>${money(tCost)}</b></div><div class="pr-c"><small>Ganancia</small><b class="${g<0?"neg":"pos"}">${money(g)}</b></div></div>`;
}

/* ---------- Avisar a los clientes después de cambiar una contraseña ---------- */
function offerNotify(correo, producto){
  const cl = items.filter(x=>x.correo.toLowerCase()===correo.toLowerCase() && x.cliente && !x.vencida);
  if(!cl.length) return;
  setTimeout(()=>showInfo(`<h2>📣 Avisar a los clientes</h2><p style="color:var(--mut);font-size:14px;margin-bottom:12px">La contraseña de <b>${esc(correo)}</b> cambió. Ellos ya la ven en Mi cuenta; avísales para que no se confundan.</p>
    ${cl.map(i=>`<div class="mini"><b>${esc(i.nombre||i.cliente)}</b> <small style="color:var(--mut)">${esc(i.cliente)}</small><div style="margin-top:6px"><a class="btn s wa" target="_blank" rel="noopener" href="${waLink(i.whatsapp, sp(fillTpl("clave",{nombre:firstName(i),producto:i.producto||producto,sitio:SITE})))}">💬 Avisar por WhatsApp</a></div></div>`).join("")}`), 350);
}

/* ---------- Búsqueda global (Ctrl+K) ---------- */
function openSearch(){
  const d = document.createElement("dialog"); d.className="gs";
  d.innerHTML = `<input id="gsq" placeholder="Buscar cliente, Gmail, WhatsApp, código o cuenta…" autocomplete="off" aria-label="Buscar"><div id="gsr" class="gsr"></div><p class="gsh">Enter abre el primer resultado · Esc cierra</p>`;
  document.body.appendChild(d); d.showModal();
  const q = d.querySelector("#gsq"), r = d.querySelector("#gsr");
  const go = (kind, val) => { d.close(); if(kind==="cli"){ setTab("cli"); $("#cq").value = val; crows(); } else { setTab("cod"); $("#q").value = val; $("#st").value=""; $("#pf").value=""; rows(); } window.scrollTo({top:0,behavior:"smooth"}); };
  const paint = () => {
    const s = q.value.trim().toLowerCase(); if(!s){ r.innerHTML = '<div class="empty">Escribe para buscar…</div>'; return; }
    const res = [];
    clients().filter(c=>[c.nombre,c.email,c.whatsapp,c.nota].join(" ").toLowerCase().includes(s)).slice(0,6).forEach(c=>res.push({k:"cli",v:c.email,t:"👤 "+(c.nombre||c.email),sub:c.email+" · "+c.cuentas.length+" cuenta"+(c.cuentas.length===1?"":"s")}));
    items.filter(i=>[i.codigo,i.correo,i.nota,i.producto].join(" ").toLowerCase().includes(s)).slice(0,8).forEach(i=>res.push({k:"cod",v:i.codigo||i.correo,t:(i.codigo?"🎫 "+i.codigo:"🔑 "+i.correo),sub:i.producto+" · "+i.correo+" · "+(i.cliente?"cliente "+i.cliente:"sin cliente")}));
    r.innerHTML = res.length ? res.map((x,n)=>`<button class="gsi" type="button" data-n="${n}"><b>${esc(x.t)}</b><small>${esc(x.sub)}</small></button>`).join("") : '<div class="empty">Sin resultados.</div>';
    r.querySelectorAll(".gsi").forEach(b=>b.onclick=()=>{ const x=res[+b.dataset.n]; go(x.k,x.v); });
    r._res = res;
  };
  q.addEventListener("input", paint); paint();
  q.addEventListener("keydown", e=>{ if(e.key==="Enter" && r._res && r._res[0]){ e.preventDefault(); go(r._res[0].k, r._res[0].v); } });
  d.addEventListener("close", ()=>d.remove());
  d.addEventListener("click", e=>{ if(e.target===d) d.close(); });
  q.focus();
}

/* ---------- Respaldo ---------- */
function backupJson(){
  const data = {generado:new Date().toISOString(), cuentas:items, costos:COSTS(), plantillas:TPL()};
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  a.download = "respaldo-iaplus-"+new Date().toISOString().slice(0,10)+".json"; a.click();
}

/* ---------- Tema oscuro ---------- */
function applyTheme(){ const t = load("iap_theme") || ""; document.documentElement.dataset.theme = t; const m=document.querySelector('meta[name="theme-color"]'); if(m) m.content = t==="dark" ? "#0f1420" : "#ffffff"; }
applyTheme();

/* ---------- Ajustes ---------- */
function openSettings(){
  const t = TPL(), d = document.createElement("dialog"); d.className="set";
  d.innerHTML = `<form method="dialog"><h2>⚙️ Ajustes</h2>
    <h3>💬 Mensajes de WhatsApp</h3>
    <p class="sethelp">Usa estas palabras entre llaves y se reemplazan solas: <code>{nombre}</code> <code>{producto}</code> <code>{fin}</code> <code>{estado}</code> <code>{codigo}</code> <code>{enlace}</code> <code>{dias}</code> <code>{sitio}</code></p>
    <label>Aviso de renovación (por vencer)</label><textarea name="renovar" rows="2">${esc(t.renovar)}</textarea>
    <label>Aviso a un cliente vencido</label><textarea name="vencido" rows="2">${esc(t.vencido)}</textarea>
    <label>Mensaje con el código de activación</label><textarea name="codigo" rows="6">${esc(t.codigo)}</textarea>
    <label>Aviso de cambio de contraseña</label><textarea name="clave" rows="3">${esc(t.clave)}</textarea>
    <h3>🎨 Apariencia</h3>
    <label class="chk" style="margin:4px 0"><input type="checkbox" name="dark" ${load("iap_theme")==="dark"?"checked":""}> Modo oscuro</label>
    <h3>💾 Respaldo</h3>
    <div class="acts"><button class="btn s" type="button" id="bkJson">Descargar respaldo (JSON)</button><button class="btn s" type="button" id="bkCsv">Descargar cuentas (CSV)</button><button class="btn s d" type="button" id="tplReset">Restablecer mensajes</button></div>
    <div class="acts" style="margin-top:18px;justify-content:flex-end"><button class="btn" value="cancel" formnovalidate>Cerrar</button><button class="btn p" value="ok">Guardar</button></div></form>`;
  document.body.appendChild(d); d.showModal();
  d.querySelector("#bkJson").onclick = backupJson; d.querySelector("#bkCsv").onclick = exportCsv;
  d.querySelector("#tplReset").onclick = () => { if(confirm("¿Volver a los mensajes originales?")){ lsSet("iap_tpl", {}); d.close(); toast("Mensajes restablecidos ✔"); refresh(); } };
  d.addEventListener("close", () => {
    if(d.returnValue==="ok"){
      const f = new FormData(d.querySelector("form")), nt = {};
      for(const k of Object.keys(TPL_DEFAULT)){ const v = String(f.get(k)||"").trim(); if(v && v!==TPL_DEFAULT[k]) nt[k]=v; }
      lsSet("iap_tpl", nt);
      if(f.get("cap")) lsSet(CAP_KEY, Math.max(1, +f.get("cap")||25));
      lsSet("iap_theme", f.get("dark") ? "dark" : ""); applyTheme();
      toast("Ajustes guardados ✔"); refresh();
    }
    d.remove();
  });
}

/* ---------- Eventos de las funciones nuevas ---------- */
document.addEventListener("click", e=>{
  const av = e.target.closest("[data-av]"); // al abrir WhatsApp se anota que ya se avisó
  if(av){ const i = items.find(x=>String(x.fila)===av.dataset.av); if(i){ markAv(i); setTimeout(()=>{ if($("#attn")) $("#attn").innerHTML = attentionHtml(); if($("#alerts")) $("#alerts").innerHTML = alertsHtml(); },150); } return; }
  const g = e.target.closest("[data-goto]");
  if(g){ setTab(g.dataset.goto); const el = g.dataset.el && $(g.dataset.el); setTimeout(()=>{ (el||document.body).scrollIntoView({behavior:"smooth",block:"start"}); },80); return; }
  if(e.target.closest("#gSearch")){ openSearch(); return; }
  if(e.target.closest("#gSettings")){ openSettings(); return; }
});
document.addEventListener("change", e=>{
  const c = e.target.closest(".cost-in"); if(!c) return;
  const all = COSTS(); const v = Math.max(0, +c.value||0); if(v) all[c.dataset.ck]=v; else delete all[c.dataset.ck]; lsSet(COST_KEY, all);
  $("#profit").innerHTML = profitHtml(); const n=document.querySelector(`.cost-in[data-ck="${CSS.escape(c.dataset.ck)}"]`); if(n) n.focus();
});
document.addEventListener("keydown", e=>{ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); if(!document.querySelector("dialog[open].gs") && $("#gSearch")) openSearch(); } });


/* ---------- Pagos en línea (Wompi) ---------- */
let PEDIDOS = [];
const PAY_TAG = {ENTREGADO:["t-ok","Entregado"], PENDIENTE:["t-w","Pendiente"], APROBADO_SIN_STOCK:["t-b","Aprobado · sin cupo"], RECHAZADO:["t-g","Rechazado"]};
/* ---------- Ventas del asistente de WhatsApp ---------- */
let waTimer = null, waCfgTimer = null;
const WA_TAG = {"POR CONFIRMAR":["t-w","💰 Pagó · por confirmar"],"NECESITA AYUDA":["t-b","🙋 Pide hablar contigo"],"RECLAMO":["t-b","⚠️ Reclamo (devolución u otro)"],"NO VERIFICADO":["t-g","🤖 Comprobante no válido · lo maneja el asistente"],"CONFIRMADO":["t-ok","✔ Confirmado · enlace enviado"],"AUTO-CONFIRMADO":["t-ok","🤖 Venta automática · enlace enviado"],"CONFIRMADO (enviar a mano)":["t-w","✔ Confirmado · envía el enlace a mano"],"RECHAZADO":["t-g","✖ Rechazado"],"ATENDIDO":["t-g","✔ Atendido"]};
async function loadWa(){
  const el = $("#waRows"); if(!el) return;
  try{ WAV = (await api("admin_wa_list")).ventas; drawWa(); }
  catch(ex){ el.innerHTML = '<div class="capwarn">'+esc(/no válida|Acción/i.test(ex.message)?"Falta actualizar el backend (Code.gs) para usar WhatsApp.":ex.message)+'</div>'; }
  api("admin_wa_clientes").then(j=>{ WACLI = j.clientes||[]; drawWaCli(); }).catch(()=>{ const c=$("#waCli"); if(c) c.innerHTML='<div class="empty">Aún no hay etiquetas.</div>'; });
  if($("#waCfgBox") && !$("#waCfgBox").dataset.ok) loadWaCfg();
  loadInbox();
  clearInterval(waTimer); waTimer = setInterval(()=>{ if(curTab==="wa" && !document.querySelector("dialog[open]")) api("admin_wa_list").then(j=>{ WAV=j.ventas; drawWa(); }).catch(()=>{}); }, 45000);
}
function drawWa(){
  const el = $("#waRows"); if(!el) return; const pend = $("#waSt").value==="pend";
  const list = WAV.filter(v=>!pend || v.estado==="POR CONFIRMAR" || v.estado==="NO VERIFICADO" || v.estado==="NECESITA AYUDA" || v.estado==="RECLAMO" || v.estado==="CONFIRMADO (enviar a mano)");
  drawNav(); document.querySelectorAll(".nv[data-t]").forEach(x=>x.classList.toggle("on", x.dataset.t===curTab));
  el.innerHTML = list.length ? list.map(v=>{ const [c,t] = WA_TAG[v.estado]||["t-g",v.estado];
    return `<div class="wacard" data-wa="${esc(v.id)}"><div class="wah"><b>${esc(v.nombre||"Cliente")}</b> <a href="https://wa.me/${esc(v.telefono)}" target="_blank" rel="noopener" class="mono">+${esc(v.telefono)}</a> <span class="tag ${c}">${t}</span><small style="color:var(--mut);margin-left:auto">${fdt(v.fecha)}</small></div>
      <div class="wab">${v.producto?`${EMO(v.producto)} <b>${esc(v.producto)}</b> · ${money(v.monto)}`:""}${v.gmail?` · Gmail: <span class="mono">${esc(v.gmail)}</span>`:""}${v.codigo?` · Código <span class="mono">${esc(v.codigo)}</span>`:""}${v.nota?`<div class="note">📝 ${esc(v.nota)}</div>`:""}</div>
      <div class="acts">${v.comprobante?`<button class="btn s" data-wv="media">🧾 Ver comprobante</button>`:""}
        ${v.estado==="POR CONFIRMAR"||v.estado==="NO VERIFICADO"?`<button class="btn s p" data-wv="ok">🛠 Resolver excepción</button><button class="btn s d" data-wv="no">✖ Rechazar</button>`:""}
        ${v.estado==="NECESITA AYUDA"?`<button class="btn s p" data-wv="ok">✔ Confirmar una venta</button><button class="btn s" data-wv="done">Marcar atendido</button>`:""}${v.estado==="RECLAMO"?`<button class="btn s" data-wv="done">Marcar resuelto</button>`:""}
        ${v.codigo?`<button class="btn s" data-wv="link">🔗 Copiar enlace</button>`:""}
        <a class="btn s wa" target="_blank" rel="noopener" href="https://wa.me/${esc(v.telefono)}">💬 Abrir chat</a></div></div>`; }).join("")
    : `<div class="empty">${pend?"No hay ventas por atender 🎉":"Todavía no hay ventas por WhatsApp."}</div>`;
}
let WACLI = [];
const ET_TAG = {urgente:["t-b","🚨 Urgente"], queja:["t-w","😠 Queja"], reembolso:["t-b","💸 Reembolso"], pago:["t-ok","✅ Pagó"], interesado:["t-av","🔥 Interesado"], no_interesado:["t-g","🙅 No interesado"]};
function drawWaCli(){
  const el = $("#waCli"); if(!el) return;
  const f = $("#waEt").value, q = ($("#waEtQ").value||"").trim().toLowerCase();
  const orden = c => c.etiquetas.includes("urgente")?0:c.etiquetas.includes("queja")||c.etiquetas.includes("reembolso")?1:2;
  const list = WACLI.filter(c=>(!f||c.etiquetas.includes(f)) && (!q||(c.nombre+" "+c.telefono).toLowerCase().includes(q))).sort((a,b)=>orden(a)-orden(b)).slice(0,200);
  el.innerHTML = list.length ? list.map(c=>`<div class="wacard"><div class="wah"><b>${esc(c.nombre||"Cliente")}</b> <a class="mono" href="https://wa.me/${esc(c.telefono)}" target="_blank" rel="noopener">+${esc(c.telefono)}</a>
      ${c.etiquetas.map(e=>{ const [k,t]=ET_TAG[e]||["t-g",e]; return `<span class="tag ${k}">${t}</span>`; }).join(" ")}<small style="color:var(--mut);margin-left:auto">${fdt(c.actualizado)}</small></div>
      ${c.nota?`<div class="note">📝 ${esc(c.nota)}</div>`:""}</div>`).join("") : '<div class="empty">No hay clientes con esa etiqueta.</div>';
}
document.addEventListener("change", e=>{ if(e.target.id==="waEt") drawWaCli(); });
document.addEventListener("input", e=>{ if(e.target.id==="waEtQ") drawWaCli(); });
async function waAction(v, a){
  if(a==="link"){ copy(linkFor(v.codigo)); return; }
  if(a==="media"){ toast("Trayendo comprobante…"); const j = await api("admin_wa_media",{id:v.id}); showInfo(`<h2>🧾 Comprobante de ${esc(v.nombre||"+"+v.telefono)}</h2><img src="data:${esc(j.mime)};base64,${j.b64}" alt="Comprobante" style="max-width:100%;border-radius:12px">`); return; }
  if(a==="done"){ await api("admin_wa_done",{id:v.id}); toast("Marcado como atendido ✔"); return loadWa(); }
  if(a==="no"){
    const f = await askForm("Rechazar el pago de "+(v.nombre||"+"+v.telefono),[{id:"motivo",label:"Mensaje para el cliente (opcional)",area:true,value:"Hola, no encontramos tu pago. ¿Me envías de nuevo el comprobante, por favor?"},{id:"avisar",label:"Enviarle este mensaje por WhatsApp",type:"check",value:true}],"","Rechazar");
    if(!f) return; const j = await api("admin_wa_reject",{id:v.id,motivo:f.motivo,avisar:!!f.avisar}); toast(j.enviado?"Rechazado y avisado ✔":"Rechazado ✔"); return loadWa();
  }
  if(a==="ok"){
    const opts = Object.keys(PKEYS).map(n=>({v:PKEYS[n], l:n+" — "+money(priceOf(n))}));
    const f = await askForm("Confirmar pago de "+(v.nombre||"+"+v.telefono),[{id:"producto",label:"Producto que compró",type:"select",opts,value:pkeyOf(v.producto)||"chatgpt"},{id:"monto",label:"Monto recibido (COP)",type:"number",value:v.monto||priceOf(v.producto)}],
      "¿Ya te llegó el dinero? Al confirmar se crea un código y al cliente le llega su enlace de activación por WhatsApp.","Confirmar y enviar");
    if(!f) return; const j = await api("admin_wa_confirm",{id:v.id,producto:f.producto,monto:f.monto});
    if(j.enviado) toast("Pago confirmado ✔ El cliente ya recibió su enlace de activación");
    else { copyText(j.texto); showInfo(`<h2>✔ Código creado</h2><p>No se pudo enviar por WhatsApp${j.error?": "+esc(j.error):""}. El mensaje con el enlace quedó <b>copiado</b>; pégalo en el chat.</p><div class="acts" style="margin-top:10px"><a class="btn p wa" target="_blank" rel="noopener" href="https://wa.me/${esc(j.telefono)}?text=${encodeURIComponent(j.texto)}">💬 Enviar por WhatsApp</a></div>`); }
    await refresh(); return loadWa();
  }
}
function terminalPanel(e){
  e = e || {}; const t = e.terminal || {}, live = e.ok && e.whatsapp && t.conectada !== false;
  const ago = Number(t.hace_segundos), cuando = Number.isFinite(ago) ? (ago < 60 ? `hace ${ago}s` : `hace ${Math.round(ago/60)} min`) : "sin latido";
  const estado = live ? '<span class="tag t-ok">● Terminal conectada</span>' : '<span class="tag t-b">● Terminal sin conexión</span>';
  return `<div class="terminal-panel" aria-live="polite"><div><b>🖥️ Terminal del asistente</b><small>Monitoreo integrado en este panel · ${esc(cuando)}</small></div><div class="acts">${estado}<span class="tag ${e.ia?"t-ok":"t-b"}">${e.ia?"✔ Claude listo":"✖ Falta Claude"}</span><span class="tag ${e.tienda?"t-ok":"t-b"}">${e.tienda?"✔ Tienda conectada":"✖ Tienda sin respuesta"}</span></div><p>${live?"El puente QR está atendiendo mensajes y la IA procesa los comprobantes válidos automáticamente.":"La terminal no está reportando señal. Abre el puente QR y conserva el PC conectado a internet."}</p><div class="acts"><a class="btn s" href="http://127.0.0.1:3111/centro" target="_blank" rel="noopener">Abrir centro local</a><button class="btn s" id="waTermReload" type="button">↻ Actualizar estado</button></div></div>`;
}
async function refrescarTerminal(){
  const target = $("#waTerminal"); if(!target) return;
  try { const c = await api("admin_wa_config"); target.innerHTML = terminalPanel(c.estado); }
  catch { target.innerHTML = terminalPanel({ok:false,terminal:{conectada:false}}); }
}
async function loadWaCfg(){
  const box = $("#waCfg"); if(!box) return;
  try{
    const c = await api("admin_wa_config"); $("#waCfgBox").dataset.ok = "1";
    const e = c.estado||{}; const ck = (ok,t)=>`<span class="tag ${ok?"t-ok":"t-b"}">${ok?"✔":"falta"} ${t}</span>`;
    box.innerHTML = `<p style="color:var(--mut);font-size:14px;margin:0 0 10px">La terminal del puente QR ahora se controla desde aquí. El panel muestra su conexión y la salud de Claude; no abras una segunda terminal.</p>
      <div id="waTerminal">${terminalPanel(e)}</div>
      <div class="form" style="grid-template-columns:1fr auto"><input id="waUrl" placeholder="https://iaplus-whatsapp.TU-USUARIO.workers.dev" value="${esc(c.workerUrl)}"><button class="btn p" id="waSave">Guardar</button></div>
      <p style="margin:12px 0 6px"><b>Clave del asistente</b> <small style="color:var(--mut)">(va en Cloudflare como <span class="mono">BOT_SECRET</span>; no la compartas)</small></p>
      <div class="codeline"><span class="mono" id="waSec">••••••••••••</span><button class="btn s" id="waShow">Mostrar</button><button class="btn s" id="waCp">Copiar</button></div>
      <p style="margin:12px 0 6px"><b>Inteligencia artificial del asistente</b> <small style="color:var(--mut)">(las claves se guardan en tu asistente, no en la página)</small></p>
      <div class="form" style="grid-template-columns:1fr auto"><select id="waProv"><option value="claude"${e.proveedor!=="chatgpt"?" selected":""}>Claude (Anthropic) · modelo más económico</option><option value="chatgpt"${e.proveedor==="chatgpt"?" selected":""}>ChatGPT (OpenAI)</option></select><button class="btn p" id="waProvSave" type="button">Usar este</button></div>
      <p style="margin:10px 0 4px"><small>Clave de Claude ${e.tiene_claude?'<span class="tag t-ok">✔ guardada</span>':'<span class="tag t-b">falta</span>'}</small></p>
      <div class="form" style="grid-template-columns:1fr auto"><input id="waIaKey" type="password" autocomplete="off" placeholder="sk-ant-…"><button class="btn p" id="waIaSave" type="button">Guardar clave de Claude</button></div>
      <p style="margin:10px 0 4px"><small>Clave de ChatGPT ${e.tiene_chatgpt?'<span class="tag t-ok">✔ guardada</span>':'<span class="tag t-b">falta</span>'}</small></p>
      <div class="form" style="grid-template-columns:1fr auto"><input id="waGptKey" type="password" autocomplete="off" placeholder="sk-…"><button class="btn p" id="waGptSave" type="button">Guardar clave de ChatGPT</button></div>
      <div class="form" style="grid-template-columns:1fr auto;margin-top:6px"><input id="waGptModel" placeholder="Modelo de ChatGPT (económico)" value="${esc(e.modelo_chatgpt||"gpt-5-nano")}"><button class="btn s" id="waGptModelSave" type="button">Guardar modelo</button></div>
      <p style="color:var(--mut);font-size:13px;margin:6px 0 0">Límite fijo: 3,000 tokens por respuesta, con cualquiera de los dos.</p>
      ${c.workerUrl?`<div class="acts" style="margin-top:12px">${e.ok?`${e.modo==="meta"?'<span class="tag t-ok">☁️ Nube activa · PC apagado</span>':'<span class="tag t-w">📱 QR activo · PC encendido</span>'}${ck(e.whatsapp,"WhatsApp")}${ck(e.ia,"Clave de IA")}${ck(e.tienda,"Conexión con la tienda")}${e.meta?ck(e.meta.webhook,"Webhook Meta"):""}${e.pausados?`<span class="tag t-w">${e.pausados} chat(s) en pausa (los atiendes tú)</span>`:""}`:`<span class="tag t-b">No responde: ${esc(e.error||"revisa la dirección")}</span>`}</div>`:""}`;
    $("#waSave").onclick = async()=>{ try{ await api("admin_wa_config",{workerUrl:$("#waUrl").value}); toast("Guardado ✔"); delete $("#waCfgBox").dataset.ok; loadWaCfg(); }catch(ex){ toast(ex.message); } };
    const iaPost = async(datos, btn, ok)=>{
      if(!c.workerUrl) return toast("Primero guarda la dirección del asistente");
      btn.disabled = true;
      try{
        const r = await fetch(c.workerUrl.replace(/\/+$/,"")+"/clave-ia",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+c.secret},body:JSON.stringify(datos)});
        const j = await r.json().catch(()=>({}));
        if(!r.ok||!j.ok) throw new Error(j.error||"No se pudo guardar");
        toast(ok(j)); delete $("#waCfgBox").dataset.ok; loadWaCfg();
      }catch(ex){ toast(ex.message); } finally{ btn.disabled = false; }
    };
    const guardaClave = (inputId, btnId, tipo, nombre)=>{ $(btnId).onclick = ()=>{ const inp = $(inputId), clave = inp.value.trim(); if(!clave) return toast("Pega la clave primero"); iaPost({clave,tipo}, $(btnId), j=>{ inp.value = ""; return "Clave de "+nombre+" guardada ✔ (termina en "+j.terminacion+")"; }); }; };
    guardaClave("#waIaKey","#waIaSave","claude","Claude");
    guardaClave("#waGptKey","#waGptSave","openai","ChatGPT");
    $("#waProvSave").onclick = ()=>iaPost({proveedor:$("#waProv").value}, $("#waProvSave"), j=>"Ahora responde "+(j.proveedor==="chatgpt"?"ChatGPT":"Claude")+" ✔");
    $("#waGptModelSave").onclick = ()=>iaPost({modelo:$("#waGptModel").value}, $("#waGptModelSave"), ()=>"Modelo guardado ✔");
    $("#waShow").onclick = ()=>{ $("#waSec").textContent = c.secret; };
    $("#waCp").onclick = ()=>copy(c.secret);
    $("#waTermReload").onclick = refrescarTerminal;
    clearInterval(waCfgTimer); waCfgTimer = setInterval(()=>{ if(curTab==="wa" && !document.hidden) refrescarTerminal(); }, 30000);
  }catch(ex){ box.innerHTML = '<div class="capwarn">'+esc(ex.message)+'</div>'; }
}
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-wv]"); if(!b) return;
  const v = WAV.find(x=>x.id===b.closest("[data-wa]").dataset.wa); if(!v) return;
  b.disabled = true; waAction(v, b.dataset.wv).catch(ex=>toast(ex.message)).finally(()=>{ b.disabled = false; });
});
document.addEventListener("change", e=>{ if(e.target.id==="waSt") drawWa(); });
document.addEventListener("click", e=>{ if(e.target.id==="waReload") loadWa(); });

async function loadPagos(){
  const cfgBox = $("#payCfg"), rowsEl = $("#payRows"); if(!cfgBox) return;
  try{
    const [c]=await Promise.all([api("admin_pay_config"),loadAdminScript("admin-paypal.js")]);
    const ck = (ok, t, opt) => `<span class="tag ${ok?"t-ok":(opt?"t-g":"t-b")}">${ok?"✔":(opt?"opcional":"falta")} ${t}</span>`;
    cfgBox.innerHTML = `<p style="color:var(--mut);font-size:14px;margin-bottom:8px">Ambiente: <b>${c.env==="production"?"PRODUCCIÓN (dinero real)":"PRUEBAS (sandbox, sin dinero real)"}</b> · ${c.productos} productos en el servidor</p>
      <div class="acts" style="margin-bottom:12px">${ck(c.publica,"Llave pública")}${ck(c.privada,"Llave privada")}${ck(c.integridad,"Secreto de integridad")}${ck(c.eventos,"Secreto de eventos",true)}</div>${(c.publica&&c.privada&&c.integridad)?"":'<div class="capwarn">Faltan llaves: agrégalas en Apps Script → Configuración del proyecto → Propiedades del script (WOMPI_PUBLIC, WOMPI_PRIVATE, WOMPI_INTEGRITY). Hasta entonces el botón «Pagar ahora» avisa que no está disponible.</div>'}`;
    window.IAPAdminPayPal?.mount(cfgBox,c.paypal);
  }catch(ex){
    cfgBox.innerHTML = '<div class="capwarn">'+esc(/no válida|Acción/i.test(ex.message)?"Falta actualizar el backend (Code.gs) en Apps Script para activar los pagos en línea.":ex.message)+"</div>";
    rowsEl.innerHTML = '<tr><td colspan="7" class="empty">—</td></tr>'; return;
  }
  try{ PEDIDOS = (await api("admin_orders")).pedidos; drawPagos(); }catch(ex){ rowsEl.innerHTML = '<tr><td colspan="7" class="empty">'+esc(ex.message)+'</td></tr>'; }
}
function drawPagos(){
  const el = $("#payRows"); if(!el) return;
  el.innerHTML = PEDIDOS.length ? PEDIDOS.map(p=>{
    const [cls, txt] = PAY_TAG[p.estado] || ["t-g", p.estado];
    return `<tr><td data-l="Fecha">${fdt(p.creado)}</td><td data-l="Cliente" style="word-break:break-all">${esc(p.cliente)}</td><td data-l="Producto">${EMO(p.nombre)} ${esc(p.nombre)}</td><td data-l="Monto">${p.proveedor==="paypal"?`<b>US${esc(p.montoUSD||"—")}</b><small class="exp">Catálogo: ${money(p.monto)} COP</small>`:`<b>${money(p.monto)}</b>`}</td>
      <td data-l="Estado"><span class="tag ${cls}">${txt}</span>${p.nota?`<div class="note">${esc(p.nota)}</div>`:""}</td><td data-l="Referencia" class="mono" style="font-size:12px;word-break:break-all">${esc(p.ref)}${p.tx?`<div class="exp">${p.proveedor==="paypal"?"PayPal":"Wompi"} · ${esc(p.tx)}</div>`:""}</td>
      <td class="acts-td">${p.estado==="ENTREGADO"?`<small style="color:var(--mut)">${esc(p.cuenta)}</small>`:`<button class="btn s p" data-deliver="${esc(p.ref)}">Entregar</button>`}</td></tr>`; }).join("")
    : '<tr><td colspan="7" class="empty">Todavía no hay pedidos.</td></tr>';
}
document.addEventListener("click", async e=>{
  const b = e.target.closest("[data-deliver]"); if(!b) return;
  const p = PEDIDOS.find(x=>x.ref===b.dataset.deliver); if(!p) return;
  if(!confirm("¿Entregar «"+p.nombre+"» a "+p.cliente+"?\n\nHazlo solo si ya verificaste en el proveedor de pago que el pedido "+p.ref+" fue APROBADO.")) return;
  b.disabled = true;
  try{ const j = await api("admin_order_deliver",{ref:p.ref, forzar:p.estado==="RECHAZADO"}); toast(j.estado==="ENTREGADO"?"Cuenta entregada ✔":"Sin cupo: agrega una cuenta nueva y vuelve a intentar"); await loadPagos(); await refresh(); }
  catch(ex){ toast(ex.message); b.disabled = false; }
});

/* ---------- abrir la actividad de un cliente desde su detalle ---------- */
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-actividad]"); if(!b) return;
  const em = b.dataset.actividad; const d = b.closest("dialog"); if(d) d.close();
  setTab("log"); const i = $("#lcli"); if(i) i.value = em; loadLog(em); window.scrollTo({top:0,behavior:"smooth"});
});
document.addEventListener("click", e=>{
  const z = e.target.closest("[data-dar2fa]");
  if(z){ const d = z.closest("dialog"); if(d) d.close(); dar2fa(z.dataset.dar2fa).catch(ex=>toast(ex.message)); return; }
  const b = e.target.closest("[data-grant]"); if(!b) return;
  const d = b.closest("dialog"); if(d) d.close();
  grantAccounts(b.dataset.grant).catch(ex=>toast(ex.message));
});

/* ---------- menú lateral: clics, cajón en celular y atajos ---------- */
document.addEventListener("click", e=>{
  const n = e.target.closest(".nv[data-t]"); if(n){ setTab(n.dataset.t); return; }
  if(e.target.closest("#sideBtn")){ openSide(!document.body.classList.contains("side-open")); return; }
  if(e.target.closest("#sideShade")){ openSide(false); return; }
  if(e.target.closest("#gTheme")){ lsSet("iap_theme", load("iap_theme")==="dark" ? "" : "dark"); applyTheme(); return; }
  if(e.target.closest("#gLogout")){ if(!confirm("¿Cerrar la sesión del panel?")) return; try{ window.google?.accounts?.id?.disableAutoSelect(); }catch{} ["iap_cred","iap_user","iap_admin"].forEach(k=>{ try{ localStorage.removeItem(k); }catch{} }); location.reload(); return; }
  const gp = e.target.closest("[data-genp]"); if(gp){ setTab("cod"); const sel=$("#aProd"); if(sel){ sel.value = gp.dataset.genp; onAutoProd(); } setTimeout(()=>{ $("#autoForm")?.scrollIntoView({behavior:"smooth",block:"start"}); $("#aQty")?.focus(); },80); return; }
  const k = e.target.closest(".kpi[data-goto]"); if(k){ setTab(k.dataset.goto); window.scrollTo({top:0,behavior:"smooth"}); }
});
document.addEventListener("keydown", e=>{
  if(e.key==="Escape") openSide(false);
  const k = e.target.closest && e.target.closest(".kpi[data-goto]"); if(k && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); k.click(); }
  if(e.altKey && /^[1-7]$/.test(e.key) && $("#sideNav")?.children.length){ e.preventDefault(); setTab(NAV[+e.key-1].t); }
});

/* ---------- Revendedores (solo el dueño los autoriza y controla) ---------- */
let REVS = [], REVCAT = [];
async function loadRev(){
  const el = $("#revRows"); if(!el) return;
  $("#revAdd").onclick = ()=>editRev(null); $("#revReload").onclick = loadRev;
  $("#revLink").onclick = ()=>copyText(SITE+"revendedor.html").then(()=>toast("Enlace copiado ✔"));
  try{ const j = await api("admin_rev_list"); REVS = j.revendedores; REVCAT = j.catalogo; drawRev(); }
  catch(ex){ el.innerHTML = '<div class="capwarn">'+esc(/no válida|Acción/i.test(ex.message)?"Falta actualizar el backend (Code.gs) para usar revendedores.":ex.message)+'</div>'; }
}
function drawRev(){
  const el = $("#revRows"); if(!el) return;
  const nm = k => (REVCAT.find(c=>c.k===k)||{name:k}).name;
  el.innerHTML = REVS.length ? REVS.map(r=>{ const s = r.stats||{};
    return `<div class="wacard"><div class="wah"><b>${esc(r.nombre||r.gmail)}</b> <span class="mono">${esc(r.gmail)}</span> <span class="tag ${r.activo?"t-ok":"t-g"}">${r.activo?"Activo":"Pausado"}</span></div>
      <div class="wab">Productos: ${(r.productos||[]).length?r.productos.map(k=>esc(nm(k))).join(", "):"ninguno"} · Tope: <b>${r.tope}</b>/día${r.d2fa?" · puede dar 2FA extra":""}</div>
      <div class="wab">Hoy: <b>${s.hoy||0}</b> códigos · Total: ${s.total||0} · Activados: <b>${s.activados||0}</b> · Sin usar: ${s.disponibles||0} · Clientes activos: ${s.activos||0} · Valor vendido: <b>${money(s.valor)}</b>${s.ultimo?" · último: "+esc(s.ultimo):""}</div>
      <div class="acts"><button class="btn s" data-rv="edit" data-g="${esc(r.gmail)}">✏️ Permisos</button><button class="btn s" data-rv="pausa" data-g="${esc(r.gmail)}">${r.activo?"⏸ Pausar":"▶ Activar"}</button><button class="btn s" data-rv="act" data-g="${esc(r.gmail)}">🕘 Su actividad</button><button class="btn s d" data-rv="del" data-g="${esc(r.gmail)}">🗑 Quitar</button></div></div>`; }).join("")
    : '<div class="empty">Aún no tienes revendedores. Toca «Autorizar revendedor».</div>';
}
async function guardarRev(r){ await api("admin_rev_set", r); toast("Revendedor guardado ✔"); loadRev(); }
async function editRev(r){
  const f = await askForm(r?"Permisos de "+(r.nombre||r.gmail):"Autorizar revendedor", [
    ...(r?[]:[{id:"gmail", label:"Gmail del revendedor", type:"email", req:true, ph:"persona@gmail.com"}]),
    {id:"nombre", label:"Nombre", value:r?r.nombre:"", ph:"Ej: Pedro"},
    {id:"tope", label:"Máximo de códigos al día", type:"number", value:r?r.tope:5, req:true},
    {id:"d2fa", type:"check", label:"Puede dar códigos 2FA extra a sus clientes", value:r?r.d2fa:false},
    ...REVCAT.map(c=>({id:"p_"+c.k, type:"check", label:"Puede vender "+c.name, value:r?(r.productos||[]).includes(c.k):c.k==="chatgpt"}))
  ], "Elige qué puede vender. Siempre puedes cambiarlo, pausarlo o quitarlo.");
  if(!f) return;
  try{ await guardarRev({gmail:r?r.gmail:f.gmail, nombre:f.nombre, tope:+f.tope||0, d2fa:!!f.d2fa, activo:r?r.activo:true, productos:REVCAT.filter(c=>f["p_"+c.k]).map(c=>c.k)}); }
  catch(ex){ toast(ex.message); }
}
document.addEventListener("click", async e=>{
  const b = e.target.closest("[data-rv]"); if(!b) return;
  const r = REVS.find(x=>x.gmail===b.dataset.g); if(!r) return;
  const a = b.dataset.rv;
  if(a==="edit") return editRev(r);
  if(a==="act"){ logCli = r.gmail; setTab("log"); return; }
  try{
    if(a==="pausa") await guardarRev({...r, activo:!r.activo});
    if(a==="del"){ if(!confirm("¿Quitar a "+(r.nombre||r.gmail)+"? Ya no podrá entrar. Sus ventas y clientes siguen igual.")) return; await api("admin_rev_del", {gmail:r.gmail}); toast("Revendedor quitado ✔"); loadRev(); }
  }catch(ex){ toast(ex.message); }
});

/* ---------- Saldo de IA (barra de arriba) ---------- */
let SALDO = null;
async function loadSaldo(){ try{ SALDO = await api("admin_wa_saldo"); drawSaldo(); }catch{ const b=$("#saldoIA"); if(b){ b.classList.remove("hide"); b.textContent="🧠 Saldo IA: —"; } } }
function fmtDias(d){ return d==null ? "" : d < 1 ? Math.max(1, Math.round(d*24))+" h" : Math.round(d)+" días"; }
function drawSaldo(){
  const b = $("#saldoIA"); if(!b) return; b.classList.remove("hide","w","b"); b.onclick = editSaldo;
  if(!SALDO || !SALDO.fijado){ b.innerHTML = "🧠 Saldo IA: <u>escríbelo</u>"; b.classList.add("w"); return; }
  const r = Math.max(0, SALDO.restante), pct = SALDO.inicial > 0 ? Math.max(2, Math.min(100, r / SALDO.inicial * 100)) : 0, d = SALDO.diasRestantes;
  if(r < 1) b.classList.add("b"); else if(r < 2.5 || (d != null && d < 2)) b.classList.add("w");
  b.innerHTML = `🧠 IA <span class="bar"><i style="width:${pct}%"></i></span> US$ ${r.toFixed(2)}<span class="tx2">${d!=null?" · ~"+fmtDias(d):""}</span>`;
  b.title = `Saldo estimado de Claude: US$ ${r.toFixed(2)} de ${SALDO.inicial.toFixed(2)} · gastado US$ ${SALDO.gastado.toFixed(3)} desde el ${fdt(new Date(SALDO.desde).toISOString())} · ~US$ ${(SALDO.porDia||0).toFixed(2)} por día. Toca para actualizarlo.`;
}
async function editSaldo(){
  const f = await askForm("Saldo de IA (Claude)", [{id:"usd", label:"¿Cuánto saldo tienes ahora? (en dólares, ej: 4.75)", value:SALDO&&SALDO.fijado?Math.max(0,SALDO.restante).toFixed(2):"", req:true}],
    'Míralo en <a href="https://platform.claude.com/settings/billing" target="_blank" rel="noopener" style="color:var(--acc)">platform.claude.com → Billing</a> y escríbelo aquí. Desde ese momento la barra descuenta sola lo que gastan tus agentes. Cuando recargues, vuelve a escribir el saldo nuevo.', "Guardar saldo");
  if(!f) return;
  const v = Number(String(f.usd).replace(",", ".").replace(/[^\d.]/g, ""));
  if(!(v >= 0)) return toast("Escribe un número, por ejemplo 4.75");
  try{ SALDO = await api("admin_wa_saldo", {fijar:v}); drawSaldo(); toast("Saldo guardado ✔"); }catch(ex){ toast(ex.message); }
}

/* ---------- Bandeja de WhatsApp: leer y responder chats ---------- */
let IB = [], ibSel = "", ibTimer = null, IBC = null;
const IBET = {pago:"✅ Pagó", pendiente:"⏳ Pendiente", interesado:"🔥 Interesado", queja:"😠 Queja", urgente:"🚨 Urgente", reembolso:"💸 Reembolso", no_interesado:"🙅 No interesado"};
const IBETC = {pago:"t-ok", pendiente:"t-w", interesado:"t-av", queja:"t-b", urgente:"t-b", reembolso:"t-b", no_interesado:"t-g"};
const etHtml = e => (e||[]).map(k=>`<span class="tag ${IBETC[k]||"t-g"}" style="font-size:11px;padding:1px 7px">${esc(IBET[k]||k)}</span>`).join(" ");
const hace = ts => { if(!ts) return ""; const m = (Date.now()-ts)/60000; return m<1?"ahora":m<60?Math.round(m)+" min":m<1440?Math.round(m/60)+" h":Math.round(m/1440)+" d"; };
async function loadInbox(){
  const el = $("#ibList"); if(!el) return;
  $("#ibQ").oninput = drawInbox; $("#ibF").onchange = drawInbox; $("#ibReload").onclick = loadInbox;
  try{ IB = (await api("admin_wa_chats")).chats || []; drawInbox(); }
  catch(ex){ el.innerHTML = '<div class="empty">'+esc(/no válida|Acción/i.test(ex.message)?"Falta actualizar el asistente para ver los chats.":ex.message)+'</div>'; }
  clearInterval(ibTimer); ibTimer = setInterval(()=>{
    if(curTab!=="wa" || document.hidden || document.querySelector("dialog[open]")) return;
    api("admin_wa_chats").then(j=>{ IB = j.chats||[]; drawInbox(); }).catch(()=>{});
    if(ibSel && !($("#ibTxt") && $("#ibTxt").value)) openChat(ibSel, true);
  }, 60000);
}
function drawInbox(){
  const el = $("#ibList"); if(!el) return;
  const q = ($("#ibQ").value||"").toLowerCase().trim(), f = $("#ibF").value;
  const list = IB.filter(c=>{
    if(f==="sin" && c.quien!=="u") return false;
    if(f==="pausa" && !c.pausa) return false;
    if(f==="alerta" && !c.etiquetas.some(e=>e==="urgente"||e==="queja")) return false;
    if(f && !["sin","pausa","alerta"].includes(f) && !c.etiquetas.includes(f)) return false;
    return !q || (c.nombre+" "+c.tel+" "+c.ultimo).toLowerCase().includes(q);
  });
  el.innerHTML = list.length ? list.slice(0,300).map(c=>`<button type="button" class="ib-it ${c.tel===ibSel?"on":""}" data-ib="${esc(c.tel)}">
      <div class="ib-h"><b>${c.quien==="u"?'<span class="ib-dot" title="Último mensaje del cliente"></span> ':""}${esc(c.nombre||("+"+c.tel))}</b><time>${hace(c.ts)}</time></div>
      <div class="ib-u">${c.quien==="a"?"🤖 ":c.quien==="d"?"👤 Tú: ":""}${esc(c.ultimo||(c.sinDatos?"(se actualiza con el próximo mensaje)":""))}</div>
      <div>${c.pausa?'<span class="tag t-g" style="font-size:11px;padding:1px 7px">⏸ Pausa</span> ':""}${etHtml(c.etiquetas)}</div></button>`).join("")
    + (list.length>300?`<div class="empty">Mostrando 300 de ${list.length}. Usa el buscador.</div>`:"")
    : '<div class="empty">No hay chats con ese filtro.</div>';
}
const RAPIDAS = [
  {l:"💳 Datos de pago", t:"Puedes pagar por *Nequi* al *310 203 5327*. Cuando pagues, envíame la captura del comprobante y tu correo de Gmail 🙌"},
  {l:"💲 Precios", t:"*ChatGPT Plus* cuesta *$10.000* por 30 días (hasta 2 dispositivos). Mira todos los productos aquí: " + SITE},
  {l:"🔑 Cómo entrar", t:"Entra a *Mi suscripción* con tu Gmail: " + SITE + "cuenta.html — ahí ves el correo, la contraseña y el código de verificación."},
  {l:"🤝 Es compartida", t:"Te cuento que la cuenta es *compartida* con otros usuarios: por eso el precio es tan bajo. Por favor no cambies la contraseña ni los datos de la cuenta 🙏"},
  {l:"🙏 Gracias", t:"¡Gracias por tu compra! 😊 Cualquier cosa me escribes por aquí."},
];
let CATB = null;
async function enviarCodigo(c){
  try{ if(!CATB) CATB = (await api("admin_rev_list")).catalogo; }catch(ex){ return toast(ex.message); }
  const f = await askForm("Enviar código de activación", [
    {id:"producto", label:"Producto", type:"select", value:"chatgpt", opts:CATB.map(p=>({v:p.k, l:p.name+" · "+money(priceOf(p.name))}))},
    {id:"precio", label:"Precio cobrado (COP)", type:"number", value:priceOf("ChatGPT")},
  ], "Se crea un código de un solo uso y le llega a <b>"+esc(c.nombre||("+"+c.tel))+"</b> por WhatsApp con su enlace de activación. Úsalo cuando el cliente ya te pagó.", "Crear y enviar");
  if(!f) return;
  try{ const j = await api("admin_wa_codigo", {tel:c.tel, producto:f.producto, precio:+f.precio||0, nombre:c.nombre||""}); toast("Código "+j.codigo+" enviado ✔"); openChat(c.tel, true); refresh(); }
  catch(ex){ toast(ex.message); }
}
async function openChat(tel, silencioso){
  ibSel = tel; const box = $("#ibChat"); if(!box) return;
  document.querySelectorAll(".ib-it").forEach(b=>b.classList.toggle("on", b.dataset.ib===tel));
  if(!silencioso) box.innerHTML = '<div class="empty" style="margin:auto">Cargando…</div>';
  try{
    const c = IBC = await api("admin_wa_chat", {tel});
    if(ibSel !== tel) return;
    const borrador = $("#ibTxt") && silencioso ? $("#ibTxt").value : "";
    box.innerHTML = `<div class="ib-top"><b>${esc(c.nombre||"Cliente")}</b> <a class="mono" href="https://wa.me/${esc(c.tel)}" target="_blank" rel="noopener" style="color:var(--acc);font-size:13px">+${esc(c.tel)}</a> ${etHtml(c.etiquetas)}
        <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap"><button class="btn s" id="ibCod" title="Crea el código de activación y se lo envía por WhatsApp">🎟️ Enviar código</button><button class="btn s" id="ibPausa">${c.pausa?"▶ Reactivar asistente":"⏸ Pausar asistente"}</button></span></div>
      <div class="ib-msgs" id="ibMsgs">${c.turnos.length?c.turnos.map(t=>`<div class="bub ${t.r==="u"?"u":t.d?"d":"a"}">${t.img?"📷 <i>Imagen</i>\n":""}${esc(t.t).replace(/\*([^*\n]+)\*/g,"<b>$1</b>")}<small>${t.r==="u"?"Cliente":t.d?"Tú":"Asistente"} · ${fdt(new Date(t.ts).toISOString())}</small></div>`).join(""):'<div class="empty">Sin mensajes guardados.</div>'}</div>
      ${c.pausa?'<div class="capwarn" style="margin:8px 10px 0">El asistente está en pausa en este chat: no le responde hasta que lo reactives.</div>':""}
      <div class="ib-quick">${RAPIDAS.map((q,i)=>`<button type="button" class="chip" data-rq="${i}">${q.l}</button>`).join("")}</div>
      <form class="ib-send" id="ibForm"><textarea id="ibTxt" rows="1" placeholder="Escribe un mensaje para el cliente…"></textarea><button class="btn p" type="submit">Enviar</button></form>`;
    const m = $("#ibMsgs"); m.scrollTop = m.scrollHeight;
    $("#ibTxt").value = borrador;
    $("#ibTxt").onkeydown = e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); $("#ibForm").requestSubmit(); } };
    $("#ibForm").onsubmit = async e=>{
      e.preventDefault(); const t = $("#ibTxt").value.trim(); if(!t) return; const bt = e.target.querySelector("button"); bt.disabled = true;
      try{ await api("admin_wa_send", {tel, texto:t}); $("#ibTxt").value = ""; toast("Enviado ✔ (sale de tu WhatsApp en segundos)"); await openChat(tel, true); }
      catch(ex){ toast(ex.message); } bt.disabled = false;
    };
    document.querySelectorAll("[data-rq]").forEach(b=>b.onclick=()=>{ const t=$("#ibTxt"); t.value = (t.value?t.value+"\n":"")+RAPIDAS[+b.dataset.rq].t; t.focus(); });
    $("#ibCod").onclick = ()=>enviarCodigo(c);
    $("#ibPausa").onclick = async ()=>{
      try{ await api("admin_wa_pausa", {tel, on:!c.pausa}); toast(c.pausa?"El asistente vuelve a atender este chat ✔":"Asistente en pausa en este chat ✔"); const x = IB.find(i=>i.tel===tel); if(x) x.pausa = !c.pausa; drawInbox(); openChat(tel, true); }
      catch(ex){ toast(ex.message); }
    };
  }catch(ex){ box.innerHTML = '<div class="empty" style="margin:auto">'+esc(ex.message)+'</div>'; }
}
document.addEventListener("click", e=>{ const b = e.target.closest("[data-ib]"); if(b) openChat(b.dataset.ib); });

/* ---------- Tablero de agentes ---------- */
async function loadAgentes(){
  const el = $("#agGrid"); if(!el) return;
  try{ drawAgentes(await api("admin_wa_agentes")); }
  catch(ex){ el.innerHTML = '<div class="capwarn">'+esc(/no válida|Acción/i.test(ex.message)?"Falta actualizar el asistente para ver los agentes.":ex.message)+'</div>'; }
}
// Organigrama de la empresa: cada empleado, su departamento, si usa IA o es gratis, su nivel y sus tareas.
const nivelDe = n => Math.min(10, 1 + Math.floor(Math.log2(1 + (n||0) / 25)));
const sigNivel = nv => 25 * (Math.pow(2, nv) - 1);
const ROLES = [
  {d:"👔 Dirección", k:"gerente", ic:"👔", n:"Gerente general (CEO)", ia:"IA precisa · 2 veces al día", p:"Estudia todo el negocio, decide qué mejorar y escribe las instrucciones que siguen todos los empleados."},
  {d:"👔 Dirección", k:"secretaria", ic:"🗂️", n:"Secretaria", ia:"Gratis", p:"Te manda al correo el resumen del día: ventas, qué preguntan los clientes y qué mejorar."},
  {d:"👔 Dirección", k:"contador", ic:"🧮", n:"Contador", ia:"Gratis", p:"Lleva la cuenta de lo que gasta la IA y te avisa antes de que se acabe el saldo.", siempre:true},
  {d:"💼 Ventas", k:"despachador", ic:"🧭", n:"Despachador", ia:"Gratis", p:"Lee cada mensaje y decide qué empleado lo atiende, para que la IA solo se use cuando hace falta."},
  {d:"💼 Ventas", k:"saludador", ic:"👋", n:"Saludador", ia:"Gratis", p:"Le da la bienvenida con los planes de ChatGPT Plus a quien escribe «hola» por primera vez, sin gastar IA."},
  {d:"💼 Ventas", k:"respuestas_auto", ic:"⚡", n:"Respuestas automáticas", ia:"Gratis", p:"Contesta al instante precios, cómo pagar, «ya pagué», dispositivos y si la cuenta es compartida. Tú editas las respuestas en Modo Dios."},
  {d:"💼 Ventas", k:"recepcionista", ic:"🛎️", n:"Recepcionista", ia:"Gratis", p:"Contesta los «gracias» y los emojis sin gastar IA."},
  {d:"💼 Ventas", k:"vendedor", ic:"💬", n:"Vendedores (clones)", ia:"IA económica", p:"Atienden muchos chats a la vez, resuelven dudas y llevan al cliente a pagar. Cada vez que suben de nivel entran más vendedores.", clones:true},
  {d:"💼 Ventas", k:"control_calidad", ic:"✅", n:"Control de calidad", ia:"Gratis", p:"Revisa cada respuesta antes de enviarla: evita promesas de atención humana, filtra el plan de 1 mes si no lo preguntaron y mantiene respuestas breves y coherentes."},
  {d:"💼 Ventas", k:"seguimiento", ic:"🔁", n:"Agente de seguimiento", ia:"IA económica", p:"Le vuelve a escribir a quien dejó de responder sin comprar (a las 3 horas y al día siguiente)."},
  {d:"💰 Caja", k:"cajero", ic:"🧾", n:"Cajero", ia:"IA precisa · solo comprobantes", p:"Revisa la captura de Nequi: monto, destinatario, fecha y referencia. Una referencia nunca se acepta dos veces."},
  {d:"💰 Caja", k:"entregas", ic:"🔗", n:"Entregas", ia:"Gratis", p:"Si el pago es válido, crea el código y le manda al cliente su enlace de activación al instante."},
  {d:"🛠️ Atención al cliente", k:"soporte", ic:"🛠️", n:"Soporte técnico", ia:"IA económica", p:"Revisa planes, cambia cuentas que fallan, da códigos 2FA extra y registra reembolsos."},
  {d:"📣 Marketing", k:"revisor_a", et:"etiquetador_a", ic:"🏷️", n:"Etiquetador A · chats recientes", ia:"Gratis", p:"Marca a los clientes que escribieron estos días como Pagó o Pendiente, aquí y en tu WhatsApp Business."},
  {d:"📣 Marketing", k:"revisor_b", et:"etiquetador_b", ic:"🏷️", n:"Etiquetador B · viejos y archivados", ia:"Gratis", p:"Revisa los chats antiguos y archivados y los marca, para saber a quién recordarle."},
  {d:"📣 Marketing", k:"recordador_a", ic:"☀️", n:"Recordador A · pendientes", ia:"Gratis", p:"A las 7:00 a. m. les recuerda a los pendientes recientes que pueden tener ChatGPT en tu página."},
  {d:"📣 Marketing", k:"recordador_b", ic:"☀️", n:"Recordador B · clientes antiguos", ia:"Gratis", p:"Le escribe con cuidado a los clientes antiguos: máximo 25 por noche y uno cada 3 días por persona."},
  {d:"🛡️ Seguridad", k:"seguridad", ic:"🛡️", n:"Seguridad", ia:"Gratis", p:"Nunca escribe a tus contactos, rechaza comprobantes falsos o repetidos y corta los bucles con otros bots.", siempre:true},
  {d:"🛡️ Seguridad", k:"supervisor", ic:"👀", n:"Supervisor", ia:"Gratis", p:"Cada 10 minutos busca chats que se quedaron sin respuesta y hace que se respondan."},
  {d:"🛡️ Seguridad", k:"vigilante", ic:"🚨", n:"Vigilante", ia:"Gratis", p:"Cada 30 minutos revisa que WhatsApp esté conectado y que haya saldo. Si algo falla, te escribe al correo.", siempre:true},
  {d:"🎓 Capacitación", k:"capacitador", ic:"🎓", n:"Capacitador", ia:"(lo hace el CEO)", p:"Convierte las mejores conversaciones y tus respuestas en lecciones para todos los empleados."},
];
function drawAgentes(a){
  const el = $("#agGrid"); if(!el) return;
  const emp = a.empresa || {total:{}, dias:{}}, T = emp.total || {}, hoyK = Object.keys(emp.dias||{}).sort().pop(), H = (hoyK && emp.dias[hoyK]) || {};
  const e = a.etiquetas, sal = a.saldo || {}, ok = a.puente.conectado;
  const val = (o, r) => (o[r.k]||0) + (r.et ? (o[r.et]||0) : 0);
  const tareasHoy = Object.values(H).reduce((x,y)=>x+y,0), conIA = ROLES.filter(r=>/IA/.test(r.ia)).length;
  const salTxt = sal.fijado ? "US$ "+Math.max(0,sal.restante).toFixed(2)+(sal.porDia?" · gasta ~US$ "+sal.porDia.toFixed(2)+"/día":"") : "escribe tu saldo en la barra 🧠";
  const extra = r => r.k==="vendedor" ? "<li>👥 Vendedores trabajando a la vez: <b>"+(a.clones||8)+"</b></li>"
    : r.k==="contador" ? "<li>Saldo: <b>"+salTxt+"</b></li>"
    : r.k==="vigilante" ? "<li>WhatsApp: <b>"+(ok?"conectado ✅":"desconectado ❌")+"</b></li>"
    : r.k==="revisor_a"||r.k==="revisor_b" ? "<li>Marcados hoy: "+(H[r.et]||0)+" · total "+(T[r.et]||0)+"</li>" : "";
  const card = r => { const n = val(T, r), nv = nivelDe(n), ini = sigNivel(nv-1), fin = sigNivel(nv), pct = nv>=10?100:Math.round((n-ini)/(fin-ini)*100);
    const st = (r.k==="vigilante"||r.k==="vendedor"||r.k==="cajero") && !ok ? "b" : r.k==="contador" && sal.fijado && sal.restante<1 ? "b" : "";
    return `<div class="ag"><h3><span class="st ${st}"></span>${r.ic} ${esc(r.n)}</h3>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="tag t-av" style="font-size:11px">Nivel ${nv}</span><span class="saldo" style="padding:0;border:0;background:none"><span class="bar" style="width:90px"><i style="width:${pct}%"></i></span></span><span style="font-size:11px;color:var(--mut)">${r.ia}</span></div>
      <p>${r.p}</p><ul><li>Tareas hoy: <b>${val(H, r)}</b> · en total: ${n}${r.siempre?" (trabaja siempre)":""}</li>${extra(r)}</ul></div>`; };
  const deps = [...new Set(ROLES.map(r=>r.d))];
  el.outerHTML = `<div id="agGrid">
    <div class="kpis" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px">
      <div class="ag"><b style="font-size:22px">${ROLES.length}</b><p style="margin:0">empleados</p></div>
      <div class="ag"><b style="font-size:22px">${ROLES.length-conIA}</b><p style="margin:0">trabajan gratis (sin IA)</p></div>
      <div class="ag"><b style="font-size:22px">${a.clones||8}</b><p style="margin:0">vendedores a la vez</p></div>
      <div class="ag"><b style="font-size:22px">${tareasHoy}</b><p style="margin:0">tareas hoy</p></div>
      <div class="ag"><b style="font-size:22px">${e.pago}</b><p style="margin:0">clientes que pagaron</p></div>
      <div class="ag"><b style="font-size:22px">${e.pendiente}</b><p style="margin:0">pendientes por comprar</p></div>
    </div>
    <p style="color:var(--mut);font-size:13px;margin-bottom:14px">🧠 Todos comparten la misma memoria de cada cliente. El despachador decide quién trabaja en cada momento, así la IA solo se paga cuando hace falta. Con el trabajo suben de nivel; al subir el de ventas entran más vendedores a la vez. El CEO estudia los resultados dos veces al día y todos aprenden de eso.</p>
    ${deps.map(d=>`<h3 style="margin:16px 0 8px;font-size:15px">${d}</h3><div class="agrid">${ROLES.filter(r=>r.d===d).map(card).join("")}</div>`).join("")}
  </div>`;
}

/* ---------- Modo Dios: staged changes and independent product drafts ---------- */
let GCFG=null,GPRODS=[],godDirty=false,godSaving=false,godLoading=false,savedGodConfig=null;
const productDrafts=new Map(),productSaving=new Set();
function configShape(c={}){return {...c,asistente:!!c.asistente,saludo:!!c.saludo,reglas:c.reglas||'',rec:{activo:false,hora:9,max:60,viejos:25,...c.rec},faq:Array.isArray(c.faq)?c.faq:[]};}
function godStatus(text,state){
  const bar=$('#godSavebar');if(!bar)return;bar.dataset.state=state||'saved';$('#godSaveStatus').textContent=text;
  $('#godSaveAll').disabled=!godDirty||godSaving||!GCFG;$('#godDiscard').disabled=!godDirty||godSaving;$('#godSaveAll').textContent=godSaving?'Guardando…':'Guardar cambios';
}
function markGodDirty(){if(!GCFG||godSaving)return;godDirty=true;godStatus('Cambios sin guardar','dirty');}
function godControlsDisabled(disabled){document.querySelectorAll('#godAssistant input,#godAssistant button,.god-grid input,.god-grid select,#godRules textarea,#godRules button,#godAnswers input,#godAnswers textarea,#godAnswers button').forEach(el=>el.disabled=disabled);}
async function loadDios(){
  if(godDirty||godSaving||godLoading)return;godLoading=true;godStatus('Cargando configuración…','loading');godControlsDisabled(true);
  try{
    const [c,p]=await Promise.allSettled([api('admin_wa_ajustes'),api('admin_catalogo')]);
    if(c.status==='fulfilled'){GCFG=configShape(c.value.config);savedGodConfig=JSON.parse(JSON.stringify(GCFG));drawDiosCfg();godStatus('Todo guardado · los cambios se revisan antes de aplicar','saved');}
    else godStatus('No se pudo cargar la configuración. Vuelve a abrir Modo Dios.','error');
    if(p.status==='fulfilled'){GPRODS=p.value.productos||[];catalogReady=true;syncPrecios();drawProds();}
    else $('#gProds').innerHTML='<tr><td colspan="6" class="empty">'+esc(p.reason.message)+'</td></tr>';
  }finally{godLoading=false;godControlsDisabled(!GCFG);}
}
function syncPrecios(){GPRODS.forEach(x=>{PRICES[x.name]=x.price;DAYS[x.name]=x.dias;});updateGeneratorPreview();}
function drawDiosCfg(){
  const c=GCFG;if(!c)return;
  $('#gAsis').checked=c.asistente;$('#gSal').checked=c.saludo;$('#gRec').checked=c.rec.activo;
  $('#gRecH').value=c.rec.hora;$('#gRecMax').value=c.rec.max;$('#gRecV').value=c.rec.viejos;
  $('#gReglas').value=c.reglas;$('#gReglasN').textContent=c.reglas.length+'/3000';
  $('#godBadges').innerHTML=`<span class="tag ${c.asistente?'t-ok':'t-g'}">Asistente ${c.asistente?'activo':'apagado'}</span><span class="tag t-av">${c.faq.filter(f=>f.activa).length} respuestas activas</span><span class="tag ${c.rec.activo?'t-ok':'t-g'}">Recordatorios ${c.rec.activo?c.rec.hora+':00':'apagados'}</span>`;
  drawFaq();
}
function drawFaq(){
  $('#gFaq').innerHTML=GCFG.faq.map((f,i)=>`<div class="faq-it" data-fi="${i}"><label class="sw sm"><input type="checkbox" data-fa aria-label="Activar respuesta ${i+1}" ${f.activa?'checked':''}><span></span></label><div class="faq-b"><label>Palabras clave<input data-fk value="${esc((f.claves||[]).join(', '))}" placeholder="precio, planes, cuánto vale"></label><label>Respuesta al cliente<textarea data-fr rows="3" placeholder="Escribe una respuesta clara y breve">${esc(f.resp)}</textarea></label></div><button type="button" class="btn s d" data-fdel title="Quitar respuesta" aria-label="Quitar respuesta ${i+1}">×</button></div>`).join('')||'<div class="empty">No hay respuestas automáticas. Agrega tu primera respuesta.</div>';
}
function leerFaq(){return [...document.querySelectorAll('.faq-it')].map(el=>({id:GCFG.faq[+el.dataset.fi]?.id||'r'+Date.now()+el.dataset.fi,activa:el.querySelector('[data-fa]').checked,claves:el.querySelector('[data-fk]').value.split(',').map(x=>x.trim()).filter(Boolean),resp:el.querySelector('[data-fr]').value.trim()}));}
function readGodDraft(){
  if(!GCFG)throw Error('Espera a que cargue la configuración.');
  const rec={activo:$('#gRec').checked,hora:Number($('#gRecH').value),max:Number($('#gRecMax').value),viejos:Number($('#gRecV').value)};
  if(!Number.isInteger(rec.hora)||rec.hora<5||rec.hora>21||!Number.isInteger(rec.max)||rec.max<0||rec.max>150||!Number.isInteger(rec.viejos)||rec.viejos<0||rec.viejos>60||rec.viejos>rec.max)throw Error('Revisa los recordatorios: máximo diario de 0 a 150 y antiguos de 0 a 60, sin superar el máximo diario.');
  const faq=leerFaq();if(faq.some(f=>!f.claves.length||!f.resp))throw Error('Completa las palabras clave y la respuesta de cada fila, o elimina las filas vacías.');
  return {asistente:$('#gAsis').checked,saludo:$('#gSal').checked,rec,reglas:$('#gReglas').value.trim(),faq};
}
function reviewGodChanges(draft){
  return new Promise(resolve=>{
    const d=document.createElement('dialog');d.className='god-review';d.setAttribute('aria-labelledby','godReviewTitle');
    d.innerHTML=`<form method="dialog"><span class="overline">REVISA TUS CAMBIOS</span><h2 id="godReviewTitle">Así quedará tu asistente.</h2><dl class="god-review-list"><div><dt>Asistente de WhatsApp</dt><dd>${draft.asistente?'Encendido':'Apagado'}</dd></div><div><dt>Saludo automático</dt><dd>${draft.saludo?'Activo':'Inactivo'}</dd></div><div><dt>Recordatorios</dt><dd>${draft.rec.activo?draft.rec.hora+':00 · máximo '+draft.rec.max+' por día':'Apagados'}</dd></div><div><dt>Respuestas activas</dt><dd>${draft.faq.filter(f=>f.activa).length}</dd></div><div><dt>Instrucciones</dt><dd>${draft.reglas.length} caracteres</dd></div></dl>${savedGodConfig?.asistente&&!draft.asistente?'<p class="batch-error">El asistente dejará de responder por WhatsApp hasta que lo enciendas de nuevo.</p>':''}<p class="hint">Los precios se guardan por separado en cada producto. Esta acción actualiza la configuración del asistente.</p><div class="review-actions"><button class="btn" value="cancel">Volver</button><button class="btn p" value="save">Aplicar cambios</button></div></form>`;
    d.addEventListener('close',()=>{const ok=d.returnValue==='save';d.remove();resolve(ok);},{once:true});d.addEventListener('cancel',e=>{e.preventDefault();d.close('cancel');});document.body.appendChild(d);d.showModal();
  });
}
async function saveGodChanges(){
  if(godSaving||!godDirty)return;let draft;
  try{draft=readGodDraft();}catch(e){toast(e.message);return;}
  godSaving=true;godControlsDisabled(true);godStatus('Revisa el resumen antes de aplicar','dirty');
  try{
    if(!await reviewGodChanges(draft))return;
    godStatus('Guardando configuración…','loading');
    const j=await api('admin_wa_ajustes',{config:draft});GCFG=configShape(j.config);savedGodConfig=JSON.parse(JSON.stringify(GCFG));godDirty=false;drawDiosCfg();godStatus('Cambios guardados correctamente','saved');toast('Configuración actualizada.');
  }catch(e){godStatus('No se pudo guardar. Tus cambios siguen aquí.','error');toast(e.message);}
  finally{godSaving=false;godControlsDisabled(false);godStatus(godDirty?'Cambios sin guardar':'Todo guardado',godDirty?'dirty':'saved');}
}
function guardarCfg(){return saveGodChanges();}
function filterGodProducts(){
  const q=norm($('#godProductSearch')?.value||'');let visible=0;
  document.querySelectorAll('#gProds [data-pk]').forEach(row=>{const product=GPRODS.find(p=>p.k===row.dataset.pk);row.hidden=q&&!norm(product?.name||'').includes(q);if(!row.hidden)visible++;});
  const count=$('#godProductCount');if(count)count.textContent=visible+' de '+GPRODS.length+' productos'+(productDrafts.size?' · '+productDrafts.size+' sin guardar':'');
}
function drawProds(){
  $('#gProds').innerHTML=GPRODS.map(p=>{const draft=productDrafts.get(p.k)||{price:p.price,dias:p.dias,oculto:p.oculto};return `<tr data-pk="${esc(p.k)}" class="${productDrafts.has(p.k)?'product-dirty':''}"><td data-l="Producto"><b>${esc(p.name)}</b>${p.plan?' <span class="tag t-av">Plan</span>':''}</td><td data-l="Precio COP"><input aria-label="Precio de ${esc(p.name)}" data-pp type="number" min="1000" max="10000000" step="1000" value="${draft.price}"></td><td data-l="Días"><input aria-label="Días de ${esc(p.name)}" data-pd type="number" min="1" max="730" value="${draft.dias}"></td><td data-l="Visible"><label class="sw sm"><input type="checkbox" data-pv aria-label="Mostrar ${esc(p.name)} en la tienda" ${draft.oculto?'':'checked'}><span></span></label></td><td data-l="Disponibilidad"><span class="tag ${p.cuentas?'t-ok':'t-g'}">${p.cuentas?p.cuentas+' cuentas':'Sin cuentas'}</span></td><td class="acts" data-l="Acciones"><button class="btn s p" data-psave ${productSaving.has(p.k)?'disabled':''}>${productDrafts.has(p.k)?'Guardar cambios':'Guardar'}</button>${p.cambiado?'<button class="btn s" data-preset title="Restablecer precio y duración">Restablecer</button>':''}</td></tr>`;}).join('')||'<tr><td colspan="6" class="empty">No se encontraron productos.</td></tr>';
  filterGodProducts();
}
function draftProduct(row){const p=GPRODS.find(p=>p.k===row.dataset.pk);if(!p)return;const draft={price:Number(row.querySelector('[data-pp]').value),dias:Number(row.querySelector('[data-pd]').value),oculto:!row.querySelector('[data-pv]').checked};if(draft.price===p.price&&draft.dias===p.dias&&draft.oculto===!!p.oculto)productDrafts.delete(p.k);else productDrafts.set(p.k,draft);row.classList.toggle('product-dirty',productDrafts.has(p.k));row.querySelector('[data-psave]').textContent=productDrafts.has(p.k)?'Guardar cambios':'Guardar';filterGodProducts();}
function validateProduct(p){if(!Number.isInteger(p.price)||p.price<1000||p.price>10000000||!Number.isInteger(p.dias)||p.dias<1||p.dias>730)throw Error('Precio: entre $1.000 y $10.000.000 COP. Duración: entre 1 y 730 días.');}
async function saveProduct(row,reset=false){
  const key=row.dataset.pk;if(productSaving.has(key))return;
  const set={k:key,price:Number(row.querySelector('[data-pp]').value),dias:Number(row.querySelector('[data-pd]').value),oculto:!row.querySelector('[data-pv]').checked};
  if(reset&&!confirm('¿Restablecer este producto a su precio y duración de fábrica?'))return;
  try{if(!reset)validateProduct(set);}catch(e){toast(e.message);return;}
  productSaving.add(key);row.querySelectorAll('button,input').forEach(el=>el.disabled=true);const b=row.querySelector('[data-psave]');b.textContent='Guardando…';
  try{const j=await api('admin_catalogo',reset?{reset:key}:{set});GPRODS=j.productos;productDrafts.delete(key);syncPrecios();drawProds();toast('Producto guardado. Los demás borradores se conservan.');}
  catch(e){toast(e.message);row.querySelectorAll('button,input').forEach(el=>el.disabled=false);b.textContent='Reintentar guardado';}
  finally{productSaving.delete(key);const savedRow=[...document.querySelectorAll('#gProds [data-pk]')].find(r=>r.dataset.pk===key);savedRow?.querySelectorAll('button,input').forEach(el=>el.disabled=false);}
}
document.addEventListener('input',e=>{
  if(e.target.id==='godProductSearch'){filterGodProducts();return;}
  const row=e.target.closest('#gProds [data-pk]');if(row){draftProduct(row);return;}
  if(e.target.id==='gReglas')$('#gReglasN').textContent=e.target.value.length+'/3000';
  if(e.target.closest('#godRules,#godAnswers,.god-grid'))markGodDirty();
});
document.addEventListener('change',e=>{
  const row=e.target.closest('#gProds [data-pk]');if(row){draftProduct(row);return;}
  if(e.target.closest('#godRules,#godAnswers,.god-grid'))markGodDirty();
});
document.addEventListener('click',async e=>{
  const t=e.target.closest('button,a');if(!t)return;
  if(t.dataset.codePreset){const select=$('#aProd'),option=[...select.options].find(o=>o.value===t.dataset.codePreset);if(!option)return toast('Agrega primero una cuenta de '+t.dataset.codePreset+'.');select.value=option.value;onAutoProd();updateGeneratorPreview();return;}
  if(['godSaveAll','gReglasOk','gFaqOk'].includes(t.id))return saveGodChanges();
  if(t.id==='godDiscard'){if(godSaving)return;GCFG=JSON.parse(JSON.stringify(savedGodConfig));godDirty=false;drawDiosCfg();godStatus('Cambios descartados. Se conserva la configuración guardada.','saved');return;}
  if(t.id==='gFaqAdd'){if(!GCFG||godSaving)return;GCFG.faq=leerFaq();GCFG.faq.push({id:'r'+Date.now(),activa:true,claves:[],resp:''});drawFaq();markGodDirty();[...document.querySelectorAll('[data-fk]')].pop()?.focus();return;}
  if(t.matches('[data-fdel]')){GCFG.faq=leerFaq();GCFG.faq.splice(+t.closest('.faq-it').dataset.fi,1);drawFaq();markGodDirty();return;}
  if(t.id==='gFaqReset'){
    if(!GCFG||godSaving||!confirm('¿Restablecer las respuestas automáticas guardadas a las de fábrica? Los demás borradores se conservan.'))return;
    t.disabled=true;try{const j=await api('admin_wa_ajustes',{reiniciarFaq:true});const server=configShape(j.config);savedGodConfig=JSON.parse(JSON.stringify(server));GCFG.faq=server.faq;drawFaq();godStatus(godDirty?'Respuestas restablecidas. Hay otros cambios sin guardar.':'Respuestas de fábrica guardadas.',godDirty?'dirty':'saved');toast('Respuestas restablecidas.');}catch(e){toast(e.message);}finally{t.disabled=false;}return;
  }
  if(t.id==='gReanudar'){if(!confirm('¿Reactivar el asistente en todos los chats pausados?'))return;t.disabled=true;try{const j=await api('admin_wa_reanudar');toast('Asistente reactivado en '+(j.reanudados||0)+' chats.');}catch(e){toast(e.message);}finally{t.disabled=false;}return;}
  const row=t.closest('[data-pk]');if(row&&t.matches('[data-psave]'))return saveProduct(row);if(row&&t.matches('[data-preset]'))return saveProduct(row,true);
  if(t.id==='nOk'){
    const name=$('#nNom').value.trim(),k=norm(name).replace(/[^a-z0-9]/g,'').slice(0,20),set={k,name,price:Number($('#nPre').value),dias:Number($('#nDia').value),match:name};
    try{if(!name||name.length>80||!k)throw Error('Escribe un nombre válido para el producto.');if(GPRODS.some(p=>p.k===k||norm(p.name)===norm(name)))throw Error('Este producto ya existe. Edítalo en la lista.');validateProduct(set);t.disabled=true;GPRODS=(await api('admin_catalogo',{set})).productos;syncPrecios();drawProds();$('#nNom').value='';$('#nPre').value='';toast('Producto creado. Agrega sus cuentas para generar códigos.');}catch(e){toast(e.message);}finally{t.disabled=false;}return;
  }
});
addEventListener('beforeunload',e=>{if(godDirty||productDrafts.size||generationBusy){e.preventDefault();e.returnValue='';}});
/* ---------- Business overview: unique clients, periods and operational signals ---------- */
let insightPeriod=30;
const insightPeriodText=()=>insightPeriod===0?'todo el historial':insightPeriod===1?'hoy':'últimos '+insightPeriod+' días';
function businessSnapshot(){return IAPInsights.compute(items,{days:insightPeriod,ttl:TTL});}
function businessKpisHtml(){
 const m=businessSnapshot(),period=insightPeriodText();
 const k=(label,value,foot,kind='',go='')=>`<div class="kpi ${kind}" ${go?`data-insight-action="${go}" role="button" tabindex="0"`:''}><div class="kpi-h">${label}</div><b>${typeof value==='number'?'<span data-n="'+value+'">0</span>':value}</b><small>${foot}</small></div>`;
 return k('Clientes totales',m.totalCustomers,'Personas únicas por Gmail','kpi-customers','all-clients')+
 k('Clientes activos',m.activeCustomers,'Con al menos un plan vigente','','active-clients')+
 k('Clientes sin plan vigente',m.expiredCustomers,'Todos sus planes están vencidos','','expired-clients')+
 k('Planes activos',m.activePlans,'Una persona puede tener varios planes','','plans')+
 k('Nuevos clientes',m.newCustomers,'Primera activación · '+period)+
 k('Planes activados',m.periodActivations,'Activaciones registradas · '+period)+
 k('Valor de planes activados',money(m.periodValue),'COP · '+period,'metric-value')+
 k('Códigos disponibles',m.availableCodes,'Sin canjear y vigentes según el panel','','codes');
}
function drawBusinessInsights(){
 const el=$('#businessInsights');if(!el)return;const m=businessSnapshot(),period=insightPeriodText();
 const select=$('#insightPeriod');if(select)select.value=String(insightPeriod);
 const ratio=m.totalCustomers?Math.round(m.activeCustomers/m.totalCustomers*100):0;
 const queue=(label,note,count,action,cls='')=>`<button class="insight-attention ${cls}" data-insight-action="${action}"><span><b>${label}</b><small>${note}</small></span><strong>${count}</strong><span aria-hidden="true">↗</span></button>`;
 const top=m.topProducts.slice(0,5),max=Math.max(1,...top.map(p=>p.activations));
 el.innerHTML=`<section class="card insight-customer-card"><div class="insight-card-head"><div><span class="overline">BASE DE CLIENTES</span><h2>Quiénes compran contigo</h2></div><button class="btn s" data-insight-action="all-clients">Ver clientes ↗</button></div><div class="customer-health"><strong>${ratio}%</strong><span>de tus clientes tienen<br>un plan activo hoy</span></div><div class="customer-health-bar" role="img" aria-label="${m.activeCustomers} clientes activos de ${m.totalCustomers}"><i style="width:${ratio}%"></i></div><div class="insight-pairs"><div><b>${m.activeCustomers}</b><span>Activos</span></div><div><b>${m.expiredCustomers}</b><span>Sin plan vigente</span></div><div><b>${m.repeatCustomers}</b><span>Con más de un plan en su historial</span></div></div><p class="hint">Los clientes se cuentan una vez por Gmail. Tener varios planes no aumenta el total de personas.</p><details class="insight-top-clients"><summary>Clientes con más activaciones · ${period}</summary>${m.topCustomers.length?m.topCustomers.map(c=>`<button data-insight-client="${esc(c.email)}"><span><b>${esc(c.name||c.email)}</b><small>${esc(c.email)}</small></span><span><b>${c.periodPlans} ${c.periodPlans===1?'plan':'planes'}</b><small>${money(c.periodValue)} COP</small></span></button>`).join(''):'<p class="hint">No hay activaciones con fecha registrada en este periodo.</p>'}</details></section>
 <section class="card insight-attention-card"><div class="insight-card-head"><div><span class="overline">PRÓXIMOS PASOS</span><h2>Lo que necesita atención</h2></div><span class="tag t-av">Estado actual</span></div>${queue('Clientes por vencer','Al menos un plan vence en 7 días',m.dueCustomers,'due-clients','due')}${queue('Clientes sin acceso vigente','Revisa sus planes antes de ofrecer una renovación',m.expiredCustomers,'expired-clients')}${queue('Cuentas con problemas','Cuentas distintas marcadas con una incidencia',m.problemAccounts,'problems',m.problemAccounts?'problem':'')}${queue('Códigos sin canjear vencidos','Según la vigencia de seguridad configurada',m.expiredUnused,'expired-codes')}<p class="hint">Cada acceso abre la lista correspondiente. Tú decides qué acción realizar.</p></section>
 <section class="card"><div class="insight-card-head"><div><span class="overline">PLANES MÁS ACTIVADOS</span><h2>Qué eligen tus clientes</h2></div><span class="tag t-av">${insightPeriod===0?'Historial':insightPeriod===1?'Hoy':insightPeriod+' días'}</span></div>${top.length?`<div class="insight-product-list">${top.map(p=>`<div><div><b>${esc(p.name)}</b><span>${p.activations} ${p.activations===1?'activación':'activaciones'}</span></div><div class="insight-product-bar"><i style="width:${p.activations/max*100}%"></i></div><small>${money(p.value)} COP · valor registrado de los planes</small></div>`).join('')}</div>`:'<div class="insight-empty">Todavía no hay activaciones con fecha en este periodo.</div>'}<div class="insight-bottom-metrics"><div><span>Clientes que activaron</span><b>${m.periodBuyers}</b></div><div><span>Valor medio por plan</span><b>${money(m.averagePlan)} COP</b></div></div></section>
 <section class="card"><div class="insight-card-head"><div><span class="overline">INVENTARIO Y ENTREGA</span><h2>De tu cuenta al cliente</h2></div><button class="btn s" data-insight-action="codes">Ver códigos ↗</button></div><div class="code-funnel"><div><b>${m.totalAccounts}</b><span>Cuentas de productos</span></div><span aria-hidden="true">→</span><div><b>${m.availableCodes}</b><span>Códigos disponibles</span></div><span aria-hidden="true">→</span><div><b>${m.redeemedCodes}</b><span>Códigos canjeados</span></div></div><div class="insight-stock"><div><span>Registros sin código</span><b>${m.withoutCode}</b></div><div><span>Cuentas con problemas</span><b>${m.problemAccounts}</b></div><div><span>Cuentas sin 2FA registrado</span><b>${m.accountsWithout2fa}</b></div><div><span>Canje en registros actuales</span><b>${m.redemptionRate===null?'—':m.redemptionRate+'%'}</b></div></div><p class="hint">El porcentaje usa solo los códigos que conserva el panel; no representa conversión de visitantes. Las cuentas de ChatGPT de distintas duraciones se agrupan por correo.</p></section>`;
 $('#insightScope').textContent='La base de clientes y el estado de accesos muestran todos los registros disponibles. Nuevos clientes, activaciones y valor usan '+period+' (hora de Colombia). El valor activado es la suma de los precios registrados; no sustituye la conciliación de pagos.'+(m.missingActivationDates?' '+m.missingActivationDates+' planes no tienen fecha de activación; se incluyen en Todo el historial y se excluyen al filtrar por fecha.':'');
}
function insightNavigate(action,email){
 if(['all-clients','active-clients','expired-clients','due-clients'].includes(action)||email){
   setTab('cli');$('#cq').value=email||'';$('#cst').value=action==='expired-clients'?'inactive-all':action==='due-clients'?'due7':'';$('#cso').value='rest';
   if(action==='active-clients')$('#cst').value='active-all';crows();return;
 }
 setTab('cod');$('#q').value='';$('#pf').value='';$('#st').value=action==='plans'?'active-plans':action==='codes'?'av':action==='problems'?'pr':action==='expired-codes'?'expired-code':'';rows();
 const table=$('#rows')?.closest('.card');if(table)table.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
}
function exportBusinessSnapshot(){
 const m=businessSnapshot(),rows=[['Métrica','Valor','Alcance'],['Periodo',insightPeriodText(),'Hora de Colombia'],['Clientes totales',m.totalCustomers,'Todos los registros'],['Clientes activos',m.activeCustomers,'Estado actual'],['Clientes sin plan vigente',m.expiredCustomers,'Estado actual'],['Planes activos',m.activePlans,'Estado actual'],['Nuevos clientes',m.newCustomers,'Periodo seleccionado'],['Activaciones',m.periodActivations,'Periodo seleccionado'],['Valor de planes activados COP',m.periodValue,'Precios registrados; no es conciliación de pagos'],['Valor medio por plan COP',m.averagePlan,'Periodo seleccionado'],['Clientes por vencer en 7 días',m.dueCustomers,'Estado actual'],['Códigos disponibles',m.availableCodes,'Estado actual'],['Cuentas con problemas',m.problemAccounts,'Estado actual'],['Planes sin fecha de activación',m.missingActivationDates,'Todos los registros']];
 const text='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='iaplus-resumen-'+new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.addEventListener('change',e=>{if(e.target.id!=='insightPeriod')return;const period=Number(e.target.value);if(![0,1,7,30,90].includes(period))return;insightPeriod=period;$('#stats').innerHTML=businessKpisHtml();drawBusinessInsights();countUp();});
document.addEventListener('click',e=>{const el=e.target.closest('[data-insight-action],[data-insight-client],#insightExport');if(!el)return;if(el.id==='insightExport')return exportBusinessSnapshot();insightNavigate(el.dataset.insightAction,el.dataset.insightClient);});
document.addEventListener('keydown',e=>{const el=e.target.closest('[data-insight-action][role="button"]');if(el&&['Enter',' '].includes(e.key)){e.preventDefault();el.click();}});
