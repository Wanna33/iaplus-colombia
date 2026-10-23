/* Animaciones de Halloween: murciélagos, fantasmas y calabazas flotando detrás del contenido.
   Solo corre cuando seasonal.js activó el tema, y no se muestra a quien pidió menos movimiento en su equipo. */
(() => {
  if (!document.documentElement.classList.contains("halloween-theme")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const rnd = (min, max) => min + Math.random() * (max - min);
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const small = window.matchMedia("(max-width: 600px)").matches;

  const layer = document.createElement("div");
  layer.className = "hw-fx";
  layer.setAttribute("aria-hidden", "true");

  const glow = document.createElement("div");
  glow.className = "hw-glow";
  layer.appendChild(glow);

  // Cada elemento recibe su propio tamaño, velocidad y punto de inicio para que no se vea repetido.
  const count = small ? 7 : 14;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    const kind = pick(["ghost", "ghost", "pumpkin", "bat"]);
    el.className = "hw-" + kind;
    el.textContent = kind === "bat" ? "🦇" : kind === "ghost" ? "👻" : "🎃";
    el.style.setProperty("--x", rnd(0, 100).toFixed(1) + "vw");
    el.style.setProperty("--y", rnd(5, 85).toFixed(1) + "vh");
    el.style.setProperty("--s", (kind === "bat" ? rnd(18, 28) : rnd(20, 38)).toFixed(0) + "px");
    el.style.setProperty("--o", rnd(0.45, 0.75).toFixed(2));
    el.style.setProperty("--d", rnd(kind === "bat" ? 14 : 18, kind === "bat" ? 24 : 34).toFixed(1) + "s");
    el.style.setProperty("--delay", "-" + rnd(0, 30).toFixed(1) + "s");
    el.style.setProperty("--sway", rnd(-60, 60).toFixed(0) + "px");
    layer.appendChild(el);
  }

  document.body.appendChild(layer);
})();
