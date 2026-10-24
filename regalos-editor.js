/* Convierte "usuario clave" (una por línea) en el regalos.json de hoy. No envía nada a ningún servidor. */
(() => {
  const $ = s => document.querySelector(s);
  const hoy = () => new Intl.DateTimeFormat("en-CA", {timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date());
  const say = t => { $("#ok").textContent = t; setTimeout(() => { if ($("#ok").textContent === t) $("#ok").textContent = ""; }, 2600); };
  function parse(text) {
    const out = [];
    text.split(/\r?\n/).forEach(line => {
      const l = line.trim(); if (!l) return;
      const m = l.match(/^(\S+?)[\s,;|:]+(.+)$/); // usuario y clave: separados por espacio, coma, punto y coma, barra o dos puntos
      if (m) out.push({usuario: m[1].trim(), clave: m[2].trim()});
    });
    return out;
  }
  $("#gen").onclick = () => {
    const cuentas = parse($("#cuentas").value), plan = $("#plan").value.trim(), msg = $("#msg").value.trim();
    if (!cuentas.length) { say("Pega al menos una cuenta (usuario y contraseña)"); return; }
    if (plan) cuentas.forEach(c => { c.plan = plan; });
    $("#out").value = JSON.stringify({fecha: hoy(), mensaje: msg, cuentas}, null, 2) + "\n";
    say(cuentas.length + " cuenta(s) lista(s) ✔");
  };
  $("#clr").onclick = () => { ["#cuentas", "#plan", "#msg", "#out"].forEach(s => { $(s).value = ""; }); };
  $("#copy").onclick = async () => {
    if (!$("#out").value) { say("Primero genera el archivo"); return; }
    try { await navigator.clipboard.writeText($("#out").value); say("Copiado ✔ Ahora pégalo en GitHub"); } catch { $("#out").select(); say("Selecciona y copia con Ctrl+C"); }
  };
  $("#dl").onclick = () => {
    if (!$("#out").value) { say("Primero genera el archivo"); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([$("#out").value], {type: "application/json"})); a.download = "regalos.json"; a.click();
  };
})();
