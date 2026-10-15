/* Anti-clickjacking: si la página se abre dentro de otra, se sale del marco. */
(function(){
  if (window.top === window.self) return;
  try { window.top.location.href = window.self.location.href; }
  catch (e) { document.documentElement.style.display = "none"; }
})();
