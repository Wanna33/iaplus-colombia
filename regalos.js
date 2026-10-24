/* Cuentas de regalo del día. Los datos salen de regalos.json (se actualiza a diario). */
(() => {
  const WA = "573102035327";
  const $ = s => document.querySelector(s);
  const wa = t => "https://wa.me/" + WA + "?text=" + encodeURIComponent(t);
  $("#rgWaTop").href = wa("Hola, necesito ayuda con las cuentas gratis de Crunchyroll");

  const hoyBogota = () => new Intl.DateTimeFormat("en-CA", {timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date());
  const fechaLarga = iso => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-CO", {timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"}); };
  const toast = msg => { const t = $("#rgToast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 1800); };

  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } finally { ta.remove(); }
    }
    btn.classList.add("copied"); setTimeout(() => btn.classList.remove("copied"), 1400); toast("Copiado ✔");
  }

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  function field(label, value, hidden) {
    const wrap = document.createDocumentFragment();
    wrap.appendChild(el("span", "rg-lbl", label));
    const row = el("div", "rg-row"); const val = el("div", "rg-val", hidden ? "••••••••••" : value); row.appendChild(val);
    if (hidden) {
      const eye = el("button", "rg-ib", "👁"); eye.type = "button"; eye.title = "Mostrar u ocultar"; eye.setAttribute("aria-label", "Mostrar u ocultar la contraseña");
      let shown = false; eye.onclick = () => { shown = !shown; val.textContent = shown ? value : "••••••••••"; };
      row.appendChild(eye);
    }
    const cp = el("button", "rg-ib", "📋"); cp.type = "button"; cp.title = "Copiar"; cp.setAttribute("aria-label", "Copiar " + label.toLowerCase());
    cp.onclick = () => copy(value, cp); row.appendChild(cp);
    wrap.appendChild(row); return wrap;
  }

  function render(data) {
    const list = $("#rgList"), notice = $("#rgNotice"); list.textContent = "";
    const hoy = hoyBogota(), fecha = String(data.fecha || ""), accounts = (Array.isArray(data.cuentas) ? data.cuentas : []).filter(c => c && c.usuario && c.clave);
    const vigente = fecha === hoy;
    $("#rgDate").textContent = fecha ? (vigente ? "Actualizadas hoy · " : "Última actualización · ") + fechaLarga(fecha) : "Todavía sin publicar";
    if (data.mensaje) { notice.hidden = false; notice.textContent = data.mensaje; }
    else if (accounts.length && !vigente) { notice.hidden = false; notice.textContent = "Estas cuentas son de un día anterior y es posible que ya no funcionen. Pronto publicamos las nuevas."; }
    else notice.hidden = true;
    if (!accounts.length) {
      const e = el("div", "rg-empty"); e.appendChild(el("b", null, "Todavía no publicamos las cuentas de hoy")); e.appendChild(el("span", null, "Vuelve en un rato: las subimos cada día. También puedes escribirnos por WhatsApp y te avisamos."));
      list.appendChild(e); return;
    }
    accounts.forEach((c, i) => {
      const card = el("article", "rg-card" + (vigente ? "" : " old")); card.style.animationDelay = (i * 60) + "ms";
      card.appendChild(el("span", "rg-num", "Cuenta " + (i + 1)));
      if (c.plan) card.appendChild(el("span", "rg-plan", String(c.plan)));
      card.appendChild(field("Usuario o correo", String(c.usuario), false));
      card.appendChild(field("Contraseña", String(c.clave), true));
      if (c.nota) card.appendChild(el("p", "rg-note", String(c.nota)));
      const bad = el("a", "rg-bad", "¿No funciona? Avísanos"); bad.href = wa("Hola, la cuenta " + (i + 1) + " de Crunchyroll de hoy (" + c.usuario + ") no funciona."); bad.target = "_blank"; bad.rel = "noopener";
      card.appendChild(bad); list.appendChild(card);
    });
  }

  fetch("regalos.json?t=" + Date.now(), {cache: "no-store"})
    .then(r => { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
    .then(render)
    .catch(() => render({fecha: "", cuentas: []}));
})();
