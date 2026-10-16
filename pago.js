/* Resultado del pago: Wompi devuelve al cliente aquí (?id=...). El servidor confirma el pago directo con Wompi y entrega la cuenta. */
(function(){
  const API_URL = "https://script.google.com/macros/s/AKfycbyIINkQAuYouCXVr722gi_8K1dHPLeF6N5XlmzHgCRA0ETF4cBc-VpIw0933mz1lFg8qA/exec";
  const CLIENT_ID = "912360874722-idm6s6ujebsi7bbvmduq7ql88efb9uq9.apps.googleusercontent.com";
  const WHATSAPP = "573102035327";
  const $ = s => document.querySelector(s);
  const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const save = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const params = new URLSearchParams(location.search);
  const txId = params.get("id") || "";
  const pend = load("iap_pay");
  const ref = pend && pend.ref;
  const wa = t => "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(t);
  const logo = '<img class="lg" src="logo-main.webp" alt="IA Plus Colombia">';
  const show = (ic, title, text, extra) => { $("#box").innerHTML = logo + '<div class="ic">' + ic + '</div><h1>' + title + '</h1><p>' + text + '</p>' + (ref ? '<div class="ref">Referencia: ' + esc(ref) + '</div>' : '') + (extra || ""); };
  function parseJwt(t){ const b=t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"); return JSON.parse(decodeURIComponent(atob(b).split("").map(c=>"%"+("00"+c.charCodeAt(0).toString(16)).slice(-2)).join(""))); }
  function ensureCred(){
    const c = load("iap_cred"); if(c && c.exp > Date.now()+30000) return Promise.resolve(c);
    return new Promise(resolve => {
      show("🔐", "Confirma tu cuenta", "Inicia sesión con el mismo Gmail con el que pagaste para ver tu pedido.", '<div id="gb" style="display:flex;justify-content:center"></div>');
      const init = () => {
        if(!window.google || !google.accounts || !google.accounts.id) return setTimeout(init, 300);
        google.accounts.id.initialize({client_id:CLIENT_ID, callback:r => { const p=parseJwt(r.credential); const cr={token:r.credential,exp:p.exp*1000}; save("iap_cred",cr); save("iap_user",{email:p.email,name:p.name||p.email,picture:p.picture||""}); resolve(cr); }});
        google.accounts.id.renderButton($("#gb"), {theme:"outline", size:"large", shape:"pill", locale:"es"});
      };
      init();
    });
  }
  async function call(body){
    const cred = await ensureCred();
    const j = await postJson(API_URL, {...body, idToken:cred.token});
    if(!j.ok && /sesión venció|Inicia sesión/i.test(j.error||"")){ try{ localStorage.removeItem("iap_cred"); }catch{} return call(body); }
    return j;
  }
  const done = () => { try{ localStorage.removeItem("iap_pay"); localStorage.setItem("iap_has","true"); }catch{} };
  async function run(){
    if(!ref){ show("🤔", "No encontramos un pago en curso", "Si ya pagaste, escríbenos y lo revisamos de inmediato.", '<a class="btn w" href="'+wa("Hola, pagué en la tienda pero no veo mi cuenta.")+'" target="_blank" rel="noopener">💬 Escribir por WhatsApp</a><a class="btn g" href="cuenta.html">Ir a Mi cuenta</a>'); return; }
    for(let i=0; i<45; i++){
      let j;
      try{ j = await call({action:"pay_confirm", ref, id:txId}); }
      catch(e){ show("⚠️", "No pudimos confirmar el pago", esc(e.message), '<a class="btn w" href="'+wa("Hola, tuve un problema con mi pago. Referencia "+ref)+'" target="_blank" rel="noopener">💬 Escribir por WhatsApp</a>'); return; }
      if(!j.ok){ show("⚠️", "No pudimos confirmar el pago", esc(j.error||"Intenta de nuevo."), '<a class="btn w" href="'+wa("Hola, tuve un problema con mi pago. Referencia "+ref)+'" target="_blank" rel="noopener">💬 Escribir por WhatsApp</a>'); return; }
      if(j.estado === "ENTREGADO"){ done(); show("🎉", "¡Pago aprobado!", "Tu cuenta ya está lista. Entra a <b>Mi cuenta</b> para ver el correo, la contraseña y tu plan.", '<a class="btn p" href="cuenta.html">🔓 Ver mi cuenta</a>'); return; }
      if(j.estado === "APROBADO_SIN_STOCK"){ show("✅", "Pago aprobado", "Recibimos tu pago. Estamos preparando tu cuenta y te la entregamos en breve. Si quieres, avísanos con tu referencia.", '<a class="btn w" href="'+wa("Hola, mi pago fue aprobado y espero mi cuenta. Referencia "+ref)+'" target="_blank" rel="noopener">💬 Avisar por WhatsApp</a><a class="btn g" href="cuenta.html">Ir a Mi cuenta</a>'); return; }
      if(j.estado === "RECHAZADO"){ show("❌", "Pago no aprobado", "Tu banco o Wompi no aprobó el pago. Si ves algún cobro, tu banco lo revierte solo. Puedes intentarlo de nuevo con otro medio de pago.", '<a class="btn p" href="index.html?tienda=1#catalogo">Volver a la tienda</a>'); return; }
      if(!txId){ show("🧾", "Pedido registrado", "Todavía no vemos un pago asociado. Si ya pagaste, espera unos segundos o escríbenos.", '<a class="btn g" href="index.html?tienda=1#catalogo">Volver a la tienda</a>'); return; }
      $("#box").querySelector("h1") && ($("#box").querySelector("h1").textContent = "Esperando la confirmación…");
      await new Promise(r => setTimeout(r, 4000));
    }
    show("⏳", "Tu pago sigue en proceso", "Algunos bancos tardan unos minutos. No pagues otra vez: en cuanto se apruebe verás tu cuenta en Mi cuenta.", '<a class="btn p" href="cuenta.html">Ir a Mi cuenta</a><a class="btn w" href="'+wa("Hola, mi pago sigue en proceso. Referencia "+ref)+'" target="_blank" rel="noopener">💬 Escribir por WhatsApp</a>');
  }
  run();
})();
