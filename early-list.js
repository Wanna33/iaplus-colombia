/* Mi cuenta: pide la lista de accesos desde el primer instante (antes de cargar estilos y scripts) para que los datos lleguen más rápido. */
(function () {
  try {
    var c = JSON.parse(localStorage.getItem("iap_cred") || "null");
    if (!c || !c.token || c.exp < Date.now() + 30000) return;
    if (/[?&](codigo|code|tutorial)=/.test(location.search) || sessionStorage.getItem("iap_pending_code")) return;
    var API = "https://script.google.com/macros/s/AKfycbyIINkQAuYouCXVr722gi_8K1dHPLeF6N5XlmzHgCRA0ETF4cBc-VpIw0933mz1lFg8qA/exec";
    var ctl = "AbortController" in window ? new AbortController() : null;
    if (ctl) setTimeout(function () { ctl.abort(); }, 25000);
    window.__earlyList = {
      t: Date.now(),
      p: fetch(API, {method: "POST", body: JSON.stringify({action: "list", idToken: c.token}), credentials: "omit", cache: "no-store", signal: ctl ? ctl.signal : undefined})
        .then(function (r) { return r.text(); })
        .then(function (t) { try { return JSON.parse(t); } catch (e) { return null; } })
        .catch(function () { return null; })
    };
  } catch (e) {}
})();
