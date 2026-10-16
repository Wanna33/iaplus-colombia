/* Red: una sola forma de hablar con el servidor en todas las páginas.
   - Tiempo límite (el celular con mala señal no queda colgado para siempre).
   - Un reintento automático si falla la conexión (no si el servidor respondió).
   - Si la respuesta no es JSON (página de error de Google), se devuelve un mensaje claro. */
(function(){
  // hojas de estilo diferidas (fuentes): se activan sin bloquear el primer dibujo de la página
  document.querySelectorAll("link[data-async-css]").forEach(l => { l.media = "all"; });
  const TIMEOUT = 25000;
  async function once(url, body){
    const ctrl = "AbortController" in window ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT) : 0;
    try{
      const r = await fetch(url, {method:"POST", body:JSON.stringify(body), signal:ctrl ? ctrl.signal : undefined, credentials:"omit", cache:"no-store", redirect:"follow"});
      const txt = await r.text();
      try{ return JSON.parse(txt); }
      catch{ return {ok:false, error:"El servidor no respondió bien. Intenta de nuevo en unos segundos."}; }
    }catch(e){
      const err = new Error(e && e.name === "AbortError" ? "El servidor tardó demasiado en responder. Revisa tu internet e intenta de nuevo." : "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.");
      err.network = true; throw err;
    }finally{ if(t) clearTimeout(t); }
  }
  // Solo se reintentan las consultas que no cambian nada (repetir un canje o un pago podría duplicarlo).
  const SAFE = ["list", "pay_confirm", "admin_list", "admin_log", "admin_orders", "admin_pay_config"];
  const isSafe = b => b && (SAFE.indexOf(b.action || "list") >= 0 || (b.action === "totp" && !b.ask));
  // Dispositivo (para el registro de actividad): sistema y navegador, sin datos personales.
  function device(){
    const u = navigator.userAgent || "";
    const os = /iPhone|iPad|iPod/.test(u) ? "iPhone" : /Android/.test(u) ? "Android" : /Windows/.test(u) ? "Windows" : /Mac OS X/.test(u) ? "Mac" : /Linux/.test(u) ? "Linux" : "Otro";
    const br = /SamsungBrowser/.test(u) ? "Samsung" : /Edg\//.test(u) ? "Edge" : /OPR\//.test(u) ? "Opera" : /Firefox\//.test(u) ? "Firefox" : /CriOS|Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : "Navegador";
    const app = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone ? " (app)" : "";
    return os + " · " + br + app;
  }
  window.IAP_API = "https://script.google.com/macros/s/AKfycbyIINkQAuYouCXVr722gi_8K1dHPLeF6N5XlmzHgCRA0ETF4cBc-VpIw0933mz1lFg8qA/exec";
  window.postJson = async function(url, body){
    if(body && !body.dev) body = {...body, dev: device()};
    let j;
    try{ j = await once(url, body); }
    catch(e){
      if(!e.network || navigator.onLine === false || !isSafe(body)) throw e;
      await new Promise(r => setTimeout(r, 1200));
      j = await once(url, body);
    }
    // sesión larga: el servidor la entrega al entrar con Google y la renueva con el uso (dura hasta pulsar «Salir»)
    if(j && j.ses && j.sesExp){ try{ localStorage.setItem("iap_cred", JSON.stringify({token:j.ses, exp:j.sesExp})); }catch{} }
    return j;
  };
  window.iapTrack = function(tipo, detalle){
    try{
      const c = JSON.parse(localStorage.getItem("iap_cred") || "null");
      if(!c || !c.token || c.exp < Date.now()) return;
      const body = JSON.stringify({action:"evento", tipo, detalle: String(detalle || "").slice(0, 80), idToken: c.token, dev: device()});
      // sendBeacon llega aunque el cliente cambie de página o cierre la pestaña
      if(!(navigator.sendBeacon && navigator.sendBeacon(window.IAP_API, new Blob([body], {type:"text/plain"})))) once(window.IAP_API, JSON.parse(body)).catch(()=>{});
    }catch{}
  };
})();
