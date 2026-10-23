(() => {
  const init = () => {
    const guide = document.getElementById("firstVisitVideoTip");
    if (!guide) return;
    const key = "iaplus.firstVisitVideoTip.dismissed.v1";
    try {
      if (localStorage.getItem(key) === "1") return;
    } catch {}
    guide.hidden = false;
    const remember = () => { try { localStorage.setItem(key, "1"); } catch {} };
    guide.querySelector("[data-first-visit-video]")?.addEventListener("click", () => {
      remember();
      guide.hidden = true;
    });
    guide.querySelector("[data-first-visit-dismiss]")?.addEventListener("click", () => {
      remember();
      guide.hidden = true;
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
