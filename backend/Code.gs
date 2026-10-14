const CLIENT_ID = '912360874722-idm6s6ujebsi7bbvmduq7ql88efb9uq9.apps.googleusercontent.com';
const HEADERS = ['Código','Producto','Correo de la cuenta','Contraseña','Cliente (Gmail)','Estado','Fecha de canje'];

function sheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id).getSheetByName('Cuentas');
  const ss = SpreadsheetApp.create('IA Plus Colombia - Cuentas');
  props.setProperty('SHEET_ID', ss.getId());
  const sh = ss.getSheets()[0];
  sh.setName('Cuentas');
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.getRange(2, 1, 1, 6).setValues([['EJEMPLO-1234', 'ChatGPT', 'cuenta@correo.com', 'clave123', '', 'Disponible']]);
  sh.setColumnWidths(1, 7, 180);
  return sh;
}

// Ejecuta esta función una vez para crear la hoja y ver su enlace en el registro.
function setup() { Logger.log(sheet_().getParent().getUrl()); }

// Rellena un código aleatorio en las filas que tienen cuenta pero no código.
function generarCodigos() {
  const sh = sheet_();
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rnd = n => Array.from({length: n}, () => abc[Math.floor(Math.random() * abc.length)]).join('');
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (!String(data[i][0]).trim() && String(data[i][2]).trim()) {
      sh.getRange(i + 1, 1).setValue('IAP-' + rnd(4) + '-' + rnd(4));
      if (!String(data[i][5]).trim()) sh.getRange(i + 1, 6).setValue('Disponible');
    }
  }
}

function doGet() { return ContentService.createTextOutput('IA Plus API OK'); }

function doPost(e) {
  let out;
  try {
    const body = JSON.parse(e.postData.contents);
    const email = verify_(body.idToken);
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try { out = handle_(body, email); } finally { lock.releaseLock(); }
  } catch (err) {
    out = {ok: false, error: String(err.message || err)};
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function verify_(token) {
  if (!token) throw new Error('Inicia sesión con Google.');
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), {muteHttpExceptions: true});
  if (r.getResponseCode() !== 200) throw new Error('Tu sesión venció. Cierra sesión y vuelve a entrar con Google.');
  const p = JSON.parse(r.getContentText());
  if (p.aud !== CLIENT_ID || String(p.email_verified) !== 'true') throw new Error('Cuenta de Google no válida.');
  return String(p.email).toLowerCase();
}

// Ejecuta esta función UNA vez para guardar la clave 2FA (queda privada en Propiedades del script).
// Después de ejecutarla, borra la clave de aquí.
function guardarClave2FA() {
  PropertiesService.getScriptProperties().setProperty(
    'TOTP_uguonauxs4@vexcamp.com', 'PEGA_AQUI_LA_CLAVE_2FA');
}

function totp_(secret) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  secret.replace(/[\s=]/g, '').toUpperCase().split('').forEach(c => bits += ('00000' + A.indexOf(c).toString(2)).slice(-5));
  const key = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) key.push(parseInt(bits.substr(i, 8), 2) << 24 >> 24);
  const ctr = Math.floor(Date.now() / 30000);
  const msg = [0, 0, 0, 0, (ctr >>> 24) & 255, (ctr >>> 16) & 255, (ctr >>> 8) & 255, ctr & 255].map(x => x << 24 >> 24);
  const h = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_1, msg, key).map(x => x & 255);
  const o = h[19] & 15;
  const n = (((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1000000;
  return ('000000' + n).slice(-6);
}

function handle_(b, email) {
  const sh = sheet_();
  if (b.action === 'totp') {
    const target = String(b.correo || '').trim().toLowerCase();
    const rows0 = sh.getDataRange().getValues();
    const mine = rows0.some((r, i) => i > 0 && String(r[4]).trim().toLowerCase() === email && String(r[2]).trim().toLowerCase() === target);
    const secret = PropertiesService.getScriptProperties().getProperty('TOTP_' + target);
    if (!mine || !secret) throw new Error('No hay código disponible para esta cuenta.');
    return {ok: true, code: totp_(secret), left: 30 - Math.floor(Date.now() / 1000) % 30};
  }
  if (b.action === 'redeem') {
    const code = String(b.code || '').trim().toUpperCase();
    if (!code) throw new Error('Escribe tu código de activación.');
    const data = sh.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === code) {
        found = true;
        const owner = String(data[i][4]).trim().toLowerCase();
        if (owner && owner !== email) throw new Error('Este código ya fue usado por otra cuenta.');
        if (!owner) sh.getRange(i + 1, 5, 1, 3).setValues([[email, 'Entregado', new Date()]]);
        break;
      }
    }
    if (!found) throw new Error('Código inválido. Revisa que esté bien escrito.');
  }
  const rows = sh.getDataRange().getValues();
  const items = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][4]).trim().toLowerCase() === email) {
      items.push({producto: String(rows[i][1]), correo: String(rows[i][2]), clave: String(rows[i][3])});
    }
  }
  return {ok: true, items: items};
}
