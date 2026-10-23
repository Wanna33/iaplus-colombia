/* Bienvenida al activar un código o un enlace de activación: una ventana clara con lo que sigue.
   Se usa desde cuenta-20261022.js con IAPCelebrate.show(item). */
(() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const WHATSAPP = "573102035327";
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const userName = () => {
    try { return (JSON.parse(localStorage.getItem("iap_user")) || {}).name || ""; } catch { return ""; }
  };
  const fecha = d => d ? new Date(d).toLocaleDateString("es-CO", {day: "numeric", month: "long", year: "numeric"}) : "";

  // Small gold and emerald accents, shown once and removed automatically.
  function burst(host){
    if (reduceMotion()) return;
    const set = ["✦", "✧", "•"];
    const wrap = document.createElement("div");
    wrap.className = "cel-burst";
    wrap.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      s.textContent = set[i % set.length];
      s.style.color = i % 2 ? "#c4a14c" : "#12815a";
      s.style.left = (Math.random() * 100).toFixed(1) + "%";
      s.style.animationDelay = (Math.random() * 0.6).toFixed(2) + "s";
      s.style.fontSize = (14 + Math.random() * 14).toFixed(0) + "px";
      wrap.appendChild(s);
    }
    host.appendChild(wrap);
    setTimeout(() => wrap.remove(), 4200);
  }

  function show(item){
    const first = userName().split(" ")[0];
    const gmail = (() => { try { return (JSON.parse(localStorage.getItem("iap_user")) || {}).email || ""; } catch { return ""; } })();
    const dlg = document.createElement("dialog");
    dlg.className = "celebrate celebrate-colombia";
    dlg.setAttribute("aria-labelledby", "celTitle");
    const producto = item ? esc(item.producto) : "tu acceso";
    const vence = item && item.fin ? `Vence el <b>${esc(fecha(item.fin))}</b>.` : "";
    dlg.innerHTML = `<form method="dialog" class="cel-welcome-form">
      <header class="cel-colombia-hero">
        <div class="cel-brand">ia<span>plus</span>colombia</div>
        <button class="cel-close" type="submit" value="go" aria-label="Cerrar bienvenida y ver mis cuentas">×</button>
        <div class="cel-hero-copy"><span class="cel-confirmed"><span aria-hidden="true">✓</span> ACTIVACIÓN COMPLETA</span><h2 id="celTitle">¡Bienvenido${first ? ", " + esc(first) : ""}!</h2><span class="cel-hero-thanks">Gracias por confiar en nosotros.</span></div>
      </header>
      <div class="cel-box">
      <p class="cel-plan-ready">Tu <b>${producto}</b> ya está activo. ${vence}</p>
      <ol class="cel-steps">
        <li><span class="cel-n">1</span><div><b>Tu acceso está en Mi cuenta</b><small>${gmail ? "Vinculado a <b>" + esc(gmail) + "</b>." : "Vinculado al Gmail con el que activaste."}</small></div></li>
        <li><span class="cel-n">2</span><div><b>Copia tus datos de acceso</b><small>El correo y la contraseña están en Mi cuenta, con un botón para copiar.</small></div></li>
        <li><span class="cel-n">3</span><div><b>Verifica solo si te lo pide</b><small>Si la aplicación solicita un código, toca «Pedir código» en Mi cuenta.</small></div></li>
      </ol>
      <div class="cel-actions">
        <button class="cta cel-go" value="go" type="submit">Ver mis datos de acceso →</button>
        <button class="guide-video-btn cel-video" type="button" data-guide-video>▶ Ver el video guía · 3 min</button>
        <a class="cel-help" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, acabo de activar mi cuenta y tengo una duda")}" target="_blank" rel="noopener">¿Necesitas ayuda? Estamos en WhatsApp ↗</a>
      </div>
      <small class="cel-signature"><span aria-hidden="true">🇨🇴</span> Colombia, contigo en cada paso.</small>
      </div>
    </form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener("close", () => {
      const go = dlg.returnValue === "go";
      dlg.remove();
      if (go) {
        const open = new CustomEvent("iap:open-access", {cancelable:true,detail:{codigo:item?.codigo,correo:item?.correo}});
        document.dispatchEvent(open);
        if (!open.defaultPrevented) document.getElementById("app")?.scrollIntoView({behavior: reduceMotion()?"auto":"smooth", block: "start"});
      }
    }, {once: true});
    dlg.addEventListener("cancel", e => { e.preventDefault(); dlg.close("go"); });
    dlg.showModal();
    dlg.querySelector(".cel-go")?.focus({preventScroll:true});
    burst(dlg);
  }

  // Video guía: se abre grande y se puede minimizar a un reproductor flotante (como YouTube) sin cortar el video.
  // Es siempre el mismo <dialog>: modal cuando está grande, no modal (clic en la página) cuando está minimizado.
  const PIP_OK = !!(document.pictureInPictureEnabled && HTMLVideoElement.prototype.requestPictureInPicture);

  function minimizeVideo(d){
    if (d.classList.contains("gv-mini")) return;
    d._switching = true; d.classList.add("gv-mini");
    d.style.left = d.style.top = d.style.right = d.style.bottom = "";
    if (d.open) d.close();
    d.show();
    syncBtns(d);
  }
  function expandVideo(d){
    d._switching = true; d.classList.remove("gv-mini");
    d.style.left = d.style.top = d.style.right = d.style.bottom = "";
    if (d.open) d.close();
    d.showModal();
    syncBtns(d);
    d.querySelector("video")?.focus?.();
  }
  function closeVideo(d){
    d._switching = false;
    try { d.querySelector("video")?.pause(); } catch {}
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    if (d.open) d.close();
    d.remove();
  }
  function syncBtns(d){
    const mini = d.classList.contains("gv-mini");
    d.querySelector('[data-gv="min"]').hidden = mini;
    d.querySelector('[data-gv="max"]').hidden = !mini;
  }
  // Arrastrar el reproductor minimizado por su barra superior.
  function enableDrag(d){
    const bar = d.querySelector(".gv-bar"); let drag = null;
    bar.addEventListener("pointerdown", e => {
      if (!d.classList.contains("gv-mini") || e.target.closest("button")) return;
      const r = d.getBoundingClientRect();
      drag = {dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height};
      d.style.right = d.style.bottom = "auto"; d.style.left = r.left + "px"; d.style.top = r.top + "px";
      bar.setPointerCapture(e.pointerId); e.preventDefault();
    });
    bar.addEventListener("pointermove", e => {
      if (!drag) return;
      const x = Math.min(Math.max(0, e.clientX - drag.dx), innerWidth - drag.w), y = Math.min(Math.max(0, e.clientY - drag.dy), innerHeight - drag.h);
      d.style.left = x + "px"; d.style.top = y + "px";
    });
    const end = () => { drag = null; };
    bar.addEventListener("pointerup", end); bar.addEventListener("pointercancel", end);
  }

  function openVideo(){
    const old = document.querySelector("dialog.guide-video");
    if (old) { if (old.classList.contains("gv-mini")) expandVideo(old); return; }
    const d = document.createElement("dialog");
    d.className = "guide-video";
    d.setAttribute("aria-label", "Video guía de activación");
    d.innerHTML = `<div class="gv-bar"><span class="gv-title">▶ Video guía</span><div class="gv-btns">
        ${PIP_OK ? '<button type="button" class="gv-btn" data-gv="pip" title="Ventana flotante fuera de la página" aria-label="Abrir en ventana flotante">⧉</button>' : ""}
        <button type="button" class="gv-btn" data-gv="min" title="Minimizar y seguir los pasos" aria-label="Minimizar el video">⌄</button>
        <button type="button" class="gv-btn" data-gv="max" title="Ampliar" aria-label="Ampliar el video" hidden>⤢</button>
        <button type="button" class="gv-btn" data-gv="close" title="Cerrar" aria-label="Cerrar el video">✕</button></div></div>
      <div class="gv-body"><span class="eyebrow">VIDEO GUÍA</span><h2>Activa y entra a tu cuenta</h2>
      <video controls playsinline autoplay poster="assets/video/como-activar-poster.jpg"><source src="assets/video/como-activar-chatgpt-plus.mp4" type="video/mp4"></video>
      <p>En 3 minutos: activar con enlace o código y entrar a tu ChatGPT Plus. <b>Toca ⌄ para minimizarlo</b> y seguir los pasos mientras lo ves.</p></div>`;
    document.body.appendChild(d);
    d.addEventListener("click", e => {
      const b = e.target.closest("[data-gv]"); if (!b) return;
      const k = b.dataset.gv;
      if (k === "min") minimizeVideo(d);
      else if (k === "max") expandVideo(d);
      else if (k === "close") closeVideo(d);
      else if (k === "pip") { const v = d.querySelector("video"); v.requestPictureInPicture().then(() => minimizeVideo(d)).catch(() => {}); }
    });
    // Esc o tocar fuera minimiza en vez de cerrar.
    d.addEventListener("cancel", e => { e.preventDefault(); minimizeVideo(d); });
    d.addEventListener("click", e => { if (e.target === d && !d.classList.contains("gv-mini")) minimizeVideo(d); });
    d.addEventListener("close", () => { if (d._switching) { d._switching = false; return; } try { d.querySelector("video")?.pause(); } catch {} d.remove(); });
    enableDrag(d);
    d.showModal();
    try { window.iapTrack && window.iapTrack("video_guia", location.pathname.split("/").pop()); } catch {}
  }
  document.addEventListener("click", e => { if (e.target.closest("[data-guide-video]")) { e.preventDefault(); openVideo(); } });

  window.IAPCelebrate = {show, openVideo};
})();
