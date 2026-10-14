/* PWA: service worker, aviso "Instalar app" y vibración suave al tocar. */
(function(){
  if("serviceWorker" in navigator && location.protocol.startsWith("http")){
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(()=>{}));
  }
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  let deferred = null;
  const get = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const set = (k,v) => { try { localStorage.setItem(k,v); } catch {} };
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; showBanner(); });
  window.addEventListener("appinstalled", () => { deferred = null; hideBanner(); set("iap_installed","1"); });

  function css(){
    if(document.getElementById("pwaCss")) return;
    const s = document.createElement("style"); s.id = "pwaCss";
    s.textContent = `.pwa-b{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:95;max-width:460px;margin:0 auto;background:#fff;color:#101a33;border-radius:18px;padding:14px 14px 14px 16px;display:flex;gap:12px;align-items:center;box-shadow:0 14px 40px rgba(0,0,0,.35);animation:pwaUp .5s cubic-bezier(.2,.8,.2,1)}
      .pwa-b img{width:46px;height:46px;border-radius:12px;background:#05070d;flex:none}
      .pwa-b div{flex:1;line-height:1.25;font-size:14px}.pwa-b b{display:block;font-size:15px}
      .pwa-b button{font:inherit;cursor:pointer;border:0;border-radius:11px;padding:10px 14px;font-weight:700}
      .pwa-b .go{background:linear-gradient(135deg,#12a8ff,#1e56ff);color:#fff}.pwa-b .x{background:none;color:#7b8aa6;padding:6px 8px;font-size:18px}
      .pwa-sheet{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:300;display:grid;align-items:end}
      .pwa-sheet>div{background:#fff;color:#101a33;border-radius:22px 22px 0 0;padding:22px 20px calc(24px + env(safe-area-inset-bottom));max-width:520px;width:100%;margin:0 auto;animation:pwaUp .35s ease}
      .pwa-sheet h3{font-size:19px;margin-bottom:10px}.pwa-sheet ol{margin:0 0 14px 20px;display:grid;gap:8px}
      .pwa-sheet button{width:100%;font:inherit;font-weight:700;border:0;border-radius:12px;padding:13px;background:#1e6bff;color:#fff;cursor:pointer}
      @keyframes pwaUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}`;
    document.head.appendChild(s);
  }
  function hideBanner(){ const b = document.getElementById("pwaBanner"); if(b) b.remove(); }
  function showBanner(){
    // se avisa UNA sola vez por inicio de sesión (al entrar con Gmail se reinicia el aviso)
    if(standalone || get("iap_installed") || get("iap_pwa_seen") || !get("iap_user") || get("iap_user")==="null" || document.getElementById("pwaBanner")) return;
    if(!ios && !deferred) return; // en Android/PC solo si el navegador ya permite instalar con un toque
    set("iap_pwa_seen","1");
    css();
    const b = document.createElement("div"); b.className = "pwa-b"; b.id = "pwaBanner";
    b.innerHTML = `<img src="icon-192.png" alt=""><div><b>Instala la app de IA Plus</b>Entra a tu cuenta con un toque desde tu pantalla de inicio.</div><button class="go">Instalar</button><button class="x" aria-label="Cerrar">✕</button>`;
    document.body.appendChild(b);
    b.querySelector(".go").onclick = install;
    b.querySelector(".x").onclick = hideBanner;
  }
  async function install(){
    if(deferred){ deferred.prompt(); try{ await deferred.userChoice; }catch{} deferred = null; hideBanner(); return; }
    css(); hideBanner();
    const sh = document.createElement("div"); sh.className = "pwa-sheet";
    sh.innerHTML = ios
      ? `<div><h3>📲 Instalar en tu iPhone</h3><ol><li>Toca el botón <b>Compartir</b> (el cuadro con la flecha ↑) abajo en Safari.</li><li>Baja y elige <b>«Añadir a pantalla de inicio»</b>.</li><li>Toca <b>Añadir</b>. ¡Listo! Tendrás el ícono de IA Plus.</li></ol><button>Entendido</button></div>`
      : `<div><h3>📲 Instalar la app</h3><ol><li>Abre el menú del navegador (⋮ arriba a la derecha).</li><li>Elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.</li><li>Confirma. Tendrás el ícono de IA Plus como una app.</li></ol><button>Entendido</button></div>`;
    sh.onclick = e => { if(e.target===sh || e.target.tagName==="BUTTON") sh.remove(); };
    document.body.appendChild(sh);
  }
  window.iapInstall = install;
  window.iapAskInstall = showBanner;
  document.addEventListener("click", e => { if(e.target.closest("[data-install]")){ e.preventDefault(); install(); } });
  // iOS no avisa solo: mostramos el aviso con instrucciones tras unos segundos
  if(ios && !standalone) window.addEventListener("load", () => setTimeout(showBanner, 2500));
  // Android/PC: el navegador avisa cuando se puede instalar; si ya hay sesión, se muestra enseguida
  window.addEventListener("load", () => setTimeout(showBanner, 2500));
  // vibración suave al tocar botones (celulares que lo permiten)
  document.addEventListener("click", e => { if(e.isTrusted && navigator.userActivation && navigator.userActivation.isActive && navigator.vibrate && e.target.closest(".btn,.ib,.chip,.tabs button,.bn a,.bn button")) navigator.vibrate(8); }, {passive:true});
})();
