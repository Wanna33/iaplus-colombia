/* Bienvenida al activar un código o un enlace de activación: una ventana clara con lo que sigue.
   Se usa desde cuenta-20261022.js con IAPCelebrate.show(item). */
(() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const WHATSAPP = "573102035327";
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSpooky = () => document.documentElement.classList.contains("halloween-theme");
  const userName = () => {
    try { return (JSON.parse(localStorage.getItem("iap_user")) || {}).name || ""; } catch { return ""; }
  };
  const fecha = d => d ? new Date(d).toLocaleDateString("es-CO", {day: "numeric", month: "long", year: "numeric"}) : "";

  // Confeti de emojis que cae una vez y se borra solo.
  function burst(host, spooky){
    if (reduceMotion()) return;
    const set = spooky ? ["🎃", "👻", "🦇", "✨"] : ["🎉", "✨", "🎊", "💜"];
    const wrap = document.createElement("div");
    wrap.className = "cel-burst";
    wrap.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 22; i++) {
      const s = document.createElement("span");
      s.textContent = set[i % set.length];
      s.style.left = (Math.random() * 100).toFixed(1) + "%";
      s.style.animationDelay = (Math.random() * 0.6).toFixed(2) + "s";
      s.style.fontSize = (14 + Math.random() * 14).toFixed(0) + "px";
      wrap.appendChild(s);
    }
    host.appendChild(wrap);
    setTimeout(() => wrap.remove(), 4200);
  }

  function show(item){
    const spooky = isSpooky();
    const first = userName().split(" ")[0];
    const gmail = (() => { try { return (JSON.parse(localStorage.getItem("iap_user")) || {}).email || ""; } catch { return ""; } })();
    const dlg = document.createElement("dialog");
    dlg.className = "celebrate" + (spooky ? " spooky" : "");
    dlg.setAttribute("aria-labelledby", "celTitle");
    const producto = item ? esc(item.producto) : "tu acceso";
    const vence = item && item.fin ? `Vence el <b>${esc(fecha(item.fin))}</b>.` : "";
    dlg.innerHTML = `<form method="dialog" class="cel-box">
      <div class="cel-icon" aria-hidden="true">${spooky ? "🎃" : "🎉"}</div>
      <span class="eyebrow">ACTIVACIÓN COMPLETA</span>
      <h2 id="celTitle">¡Bienvenido${first ? ", " + esc(first) : ""}!</h2>
      <p>Tu <b>${producto}</b> ya está activo. ${vence}</p>
      <ol class="cel-steps">
        <li><span class="cel-n">1</span><div><b>Entra con tu Gmail</b><small>${gmail ? "Usa <b>" + esc(gmail) + "</b> para ver tus datos." : "Usa el mismo Gmail con el que activaste."}</small></div></li>
        <li><span class="cel-n">2</span><div><b>Copia tus datos de acceso</b><small>El correo y la contraseña están en Mi cuenta, con un botón para copiar.</small></div></li>
        <li><span class="cel-n">3</span><div><b>Pide el código de verificación cuando lo necesites</b><small>Si el correo te lo pide, toca «Pedir código» en Mi cuenta.</small></div></li>
      </ol>
      <div class="cel-actions">
        <button class="cta cel-go" value="go" type="submit">Ver mis datos de acceso →</button>
        <a class="cel-help" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, acabo de activar mi cuenta y tengo una duda")}" target="_blank" rel="noopener">¿Necesitas ayuda? Escríbenos por WhatsApp</a>
      </div>
    </form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener("close", () => {
      const go = dlg.returnValue === "go";
      dlg.remove();
      if (go) document.getElementById("app")?.scrollIntoView({behavior: "smooth", block: "start"});
    }, {once: true});
    dlg.addEventListener("cancel", e => { e.preventDefault(); dlg.close("go"); });
    dlg.showModal();
    dlg.querySelector(".cel-go")?.focus();
    burst(dlg, spooky);
  }

  window.IAPCelebrate = {show};
})();
