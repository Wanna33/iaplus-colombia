#!/usr/bin/env node
/* Read-only release check. Never prints credentials or customer data. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const checks = [];
const add = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail: String(detail || '') });

async function localJson(url, timeout = 5000) {
  const signal = AbortSignal.timeout(timeout);
  const res = await fetch(url, { signal });
  let body;
  try { body = await res.json(); }
  catch { throw new Error(`respuesta no JSON (${res.status})`); }
  return { status: res.status, body };
}

add('catálogo', fs.existsSync(path.join(root, 'index.html')) && fs.existsSync(path.join(root, 'app.js')), 'index.html y app.js presentes');
add('configuración PayPal protegida', fs.existsSync(path.join(root, 'payments', 'PayPal.gs')), 'la llave privada debe estar solo en Apps Script');
add('puente WhatsApp preparado', fs.existsSync(path.join(root, 'whatsapp-bot', 'puente', 'config.json')), 'requiere sesión vinculada y Worker configurado');

Promise.resolve().then(async () => {
  try {
    const r = await localJson('http://127.0.0.1:3111/api/salud');
    const b = r.body || {};
    add('bot local', r.status === 200 && b.ok === true, `${b.trozos || 0} fragmentos, ${b.archivos || 0} archivos`);
    add('modelo Ollama', b.modeloLocal === true, b.modeloLocal ? `${b.modelo} disponible` : `${b.modelo} no disponible; funciona el modo búsqueda`);
    add('puente local', b.puente?.conectado === true, b.puente?.conectado ? 'conectado' : 'sin señal reciente');
  } catch (e) {
    add('bot local', false, `no responde: ${e.message}`);
    add('modelo Ollama', false, 'no comprobable sin el bot local');
    add('puente local', false, 'no comprobable sin el bot local');
  }
  const live = process.env.IA_PLUS_LIVE_URL || 'https://wanna33.github.io/iaplus-colombia/version.json';
  try {
    const r = await localJson(live);
    add('publicación web', r.status === 200 && r.body?.version, r.status === 200 ? `versión ${r.body?.version || 'sin marcador'}` : `HTTP ${r.status}`);
  } catch (e) { add('publicación web', false, e.message); }
  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
  process.exitCode = failed.length ? 1 : 0;
}).catch((e) => { console.error(e); process.exitCode = 1; });
