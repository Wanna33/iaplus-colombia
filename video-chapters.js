/* Capítulos del video guía: botones que llevan directo a cada parte. Uso: <video data-chapters> o IAPVideoChapters.mount(video). */
(() => {
  const CH = [["Bienvenida", 0], ["La tienda", 23], ["Catálogo y ayuda", 81], ["Cómo pagar", 118], ["Recibes tu acceso", 167], ["Activar con el enlace", 205], ["Activar con el código", 264], ["Si algo sale mal", 306], ["Tu acceso activo", 350], ["Entrar a ChatGPT Plus", 401], ["Código de verificación", 458], ["Cuenta compartida", 500], ["Si algo falla y garantía", 563], ["Historial, renovar y app", 621]];
  const fmt = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  function mount(video) {
    if (!video || video.dataset.chaptersReady) return;
    video.dataset.chaptersReady = "1";
    const box = document.createElement("div");
    box.className = "video-chapters";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Capítulos del video");
    box.innerHTML = CH.map(([n, t], i) => `<button type="button" data-t="${t}"><i>${i + 1}</i><span>${n}</span><small>${fmt(t)}</small></button>`).join("");
    box.addEventListener("click", e => {
      const b = e.target.closest("button[data-t]"); if (!b) return;
      const go = () => { video.currentTime = Number(b.dataset.t); video.play().catch(() => {}); };
      if (video.readyState < 1) { video.preload = "auto"; video.addEventListener("loadedmetadata", go, {once: true}); video.load(); } else go();
    });
    const sync = () => {
      let cur = 0; CH.forEach(([, t], i) => { if (video.currentTime >= t - 0.3) cur = i; });
      box.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === cur));
    };
    video.addEventListener("timeupdate", sync);
    video.insertAdjacentElement("afterend", box);
  }
  window.IAPVideoChapters = {mount};
  document.querySelectorAll("video[data-chapters]").forEach(mount);
})();
