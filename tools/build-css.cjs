#!/usr/bin/env node
/* Une las hojas de estilo de cada página en un solo archivo minificado: una sola petición y la pantalla se pinta antes.
   Uso: node tools/build-css.cjs  →  vuelve a correrlo cada vez que cambies uno de estos .css (o --check para comprobar que están al día). */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const esbuild = require(require.resolve('esbuild', { paths: [root, path.join(root, 'whatsapp-bot')] }));

// El orden importa: es el mismo orden en que la página cargaba cada hoja (las de abajo mandan).
const PAQUETES = {
  'tienda.min.css': { paginas: ['index.html'], hojas: ['styles.css', 'studio.css', 'public-assistant.css', 'shop-experience.css', 'paypal-checkout.css', 'visual-refresh.css', 'liquid-glass.css', 'experience-pro.css', 'premium-2026.css', 'trust-story.css', 'colombia-identity.css', 'seasonal.css', 'halloween-fx.css', 'video-guide.css', 'video-chapters.css', 'regalos-strip.css', 'storefront-polish.css', 'account-panel.css', 'rendimiento.css'] },
  'cuenta.min.css': { paginas: ['cuenta.html'], hojas: ['customer-theme.css', 'customer-glass.css', 'premium-2026.css', 'activation-welcome.css', 'colombia-identity.css', 'activation-celebrate.css', 'video-chapters.css', 'halloween-fx.css', 'account-signin.css', 'account-panel.css', 'rendimiento.css'] },
};

const soloRevisar = process.argv.includes('--check');
let desactualizado = false;
for (const [salida, { paginas, hojas }] of Object.entries(PAQUETES)) {
  const css = hojas.map((h) => fs.readFileSync(path.join(root, h), 'utf8')).join('\n');
  const { code } = esbuild.transformSync(css, { loader: 'css', minify: true, legalComments: 'none' });
  const ver = crypto.createHash('sha1').update(code).digest('hex').slice(0, 10);
  const enlace = `<link rel="stylesheet" href="${salida}?v=${ver}">`;
  // Git en Windows puede cambiar los saltos de línea al sacar el archivo: no cuenta como cambio.
  const actual = fs.existsSync(path.join(root, salida)) ? fs.readFileSync(path.join(root, salida), 'utf8').replace(/\r\n/g, '\n') : '';
  if (actual !== code) { desactualizado = true; if (!soloRevisar) fs.writeFileSync(path.join(root, salida), code); }
  for (const p of paginas) {
    const html = fs.readFileSync(path.join(root, p), 'utf8');
    const nuevo = html.replace(new RegExp(`<link rel="stylesheet" href="${salida.replace('.', '\\.')}\\?v=[^"]*">`), enlace);
    if (!nuevo.includes(enlace)) throw new Error(`${p} no enlaza ${salida}`);
    if (nuevo !== html) { desactualizado = true; if (!soloRevisar) fs.writeFileSync(path.join(root, p), nuevo); }
  }
  console.log(`${salida}: ${hojas.length} hojas → ${(code.length / 1024).toFixed(1)} KB (v=${ver})`);
}
if (soloRevisar && desactualizado) { console.error('Los paquetes de estilos no están al día: corre node tools/build-css.cjs'); process.exit(1); }
