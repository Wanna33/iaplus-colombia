/* Red: una sola forma de hablar con el servidor en todas las páginas.
   - Tiempo límite (el celular con mala señal no queda colgado para siempre).
   - Un reintento automático si falla la conexión (no si el servidor respondió).
   - Si la respuesta no es JSON (página de error de Google), se devuelve un mensaje claro. */
(function(){
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
  window.postJson = async function(url, body){
    try{ return await once(url, body); }
    catch(e){
      if(!e.network || navigator.onLine === false || !isSafe(body)) throw e;
      await new Promise(r => setTimeout(r, 1200));
      return once(url, body);
    }
  };
})();
