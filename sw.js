// Service worker de IA Plus: abre rápido y funciona sin conexión (solo la pantalla; las cuentas siempre se piden en línea).
const VER = "iap-v92-ligero-20261029";
const SHELL = ["./", "index.html", "cuenta.html", "assets/fondo-colombia-tienda-v2.webp", "assets/trust-colombia-halloween-720.webp", "assets/hero-colombia-creadora-mobile-640.webp", "cuenta.min.css", "tienda.min.css", "premium-2026.css", "colombia-identity.css", "seasonal.js", "activation-welcome.js", "first-visit-guide.js", "assets/gracias-ia-plus-colombia.jpg", "assets/halloween-colombia.jpg", "assets/brand-iaplus.svg", "assets/brand-mark-64.png", "assets/brand-mark-192.png", "assets/brand-mark-512.png", "assets/brand-maskable-512.png", "customer-glass.css", "activation-utils.js", "storefront-pro.js", "assets/brand-mark.svg", "customer-theme.css", "paypal-checkout.js", "catalog-utils.js", "store-tools-20261022.js", "assistants.js", "public-assistant.js", "assets/presentadora-cuentas.webp", "app-20261022.js", "pwa.js", "net.js", "guard.js", "halloween-fx.js", "cuenta-20261022.js", "activation-celebrate.js", "logo-main.webp", "favicon.png", "chatgpt.webp", "capcut.webp", "filmora.webp", "canva.webp", "gemini.webp", "claude.webp", "davinci.webp", "duolingo.webp", "flow.webp", "photoshop.webp", "premiere.webp", "xbox.webp", "youtube.webp", "icon-192.png", "manifest.webmanifest"];
SHELL.push("account-state.js", "assets/rio-colombia-panel.webp");
self.addEventListener("install", e => { e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (/regalos\.json$/.test(u.pathname)) return; // las cuentas del día siempre se piden a la red
  if (/\.(mp4|webm)$/.test(u.pathname)) return; // el video se pide directo (pesa y se reproduce por partes)
  if (/(admin|revendedor)\.(html|js)$/.test(u.pathname)) return; // los paneles (admin y revendedor) nunca se guarda en el teléfono // Google, Apps Script, etc. van directo a la red
  if (r.mode === "navigate") { // páginas: primero red (siempre lo último); sin internet usa la copia
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(m => m || caches.match("index.html"))));
    return;
  }
  const isCode = /[.](js|css|html|webmanifest)$/.test(u.pathname) || u.pathname.endsWith("/");
  if (isCode && /[?&]v=/.test(u.search)) { // código con versión (?v=...): esa versión nunca cambia, así que abre al instante desde la copia
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r, {ignoreSearch:true}))));
    return;
  }
  if (isCode) { // código sin versión: siempre lo más nuevo si hay internet (evita mezclar versiones); sin internet, la copia
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r, {ignoreSearch:true})));
    return;
  }
  e.respondWith(caches.match(r, {ignoreSearch:true}).then(m => m || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); } return res; }))); // imágenes: copia al instante
});
