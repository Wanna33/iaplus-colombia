/* Anti-clickjacking: si la página se abre dentro de otra, se sale del marco. */
(function(){
  if (window.top === window.self) return;
  try { window.top.location.href = window.self.location.href; }
  catch (e) { document.documentElement.style.display = "none"; }
})();
/* Corre antes de pintar: si el visitante ya cerró la guía de primera visita, se oculta desde el inicio y la tienda no salta. */
try { if (localStorage.getItem("iaplus.firstVisitVideoTip.dismissed.v1") === "1") document.documentElement.classList.add("guia-vista"); } catch (e) {}
