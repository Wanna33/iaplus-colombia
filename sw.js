// Service worker de IA Plus: abre rápido y funciona sin conexión (solo la pantalla; las cuentas siempre se piden en línea).
const VER = "iap-v51-persona-movil";
const SHELL = ["./", "index.html", "cuenta.html", "styles.css", "visual-refresh.css", "assets/brand-iaplus.svg", "assets/brand-mark-64.png", "assets/brand-mark-192.png", "assets/brand-mark-512.png", "assets/brand-maskable-512.png", "studio.css", "shop-experience.css", "customer-theme.css", "public-assistant.css", "paypal-checkout.css", "paypal-checkout.js", "catalog-utils.js", "store-tools.js", "assistants.js", "public-assistant.js", "assets/presentadora-cuentas.webp", "app.js", "pwa.js", "net.js", "guard.js", "pago.js", "cuenta.js", "logo-main.webp", "favicon.png", "chatgpt.webp", "capcut.webp", "filmora.webp", "canva.webp", "gemini.webp", "claude.webp", "davinci.webp", "duolingo.webp", "flow.webp", "photoshop.webp", "premiere.webp", "xbox.webp", "youtube.webp", "icon-192.png", "manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (/(admin|revendedor)\.(html|js)$/.test(u.pathname)) return; // los paneles (admin y revendedor) nunca se guarda en el teléfono // Google, Apps Script, etc. van directo a la red
  if (r.mode === "navigate") { // páginas: primero red (siempre lo último); sin internet usa la copia
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(m => m || caches.match("index.html"))));
    return;
  }
  const isCode = /[.](js|css|html|webmanifest)$/.test(u.pathname) || u.pathname.endsWith("/");
  if (isCode) { // código: siempre lo más nuevo si hay internet (evita mezclar versiones); sin internet, la copia
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r)));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); } return res; }))); // imágenes: copia al instante
});
