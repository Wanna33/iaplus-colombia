// Server-only configuration. Credentials stay in the existing private inventory.
function designConfig_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('DESIGN_PROMO') || '{}'); }
  catch (e) { return {}; }
}
function designPool_(rows, account) {
  return cuentasConCupo_(rows, {match:['capcut']}, CAP_PAGOS).filter(a => a.correo === account && String(rows[a.fila - 1][3] || '').trim());
}
function designSnapshot_(product) {
  if (product !== 'chatgpt3' && product !== 'diseno6') return null;
  const c = designConfig_();
  if (!c.enabled || !c.startAt || Date.now() < c.startAt) {
    if (product === 'diseno6') throw fail_('El paquete de diseño todavía no está disponible.');
    return null;
  }
  if (!designPool_(sheet_().getDataRange().getValues(), c.account).length) throw fail_('El paquete con CapCut está temporalmente sin disponibilidad. No realices el pago todavía.');
  return {version:1, product:product, account:c.account, days:product === 'chatgpt3' ? 30 : 180, created:Date.now(), startAt:c.startAt};
}
function designNote_(note, snapshot) { return snapshot ? note + ' | DESIGN:' + JSON.stringify(snapshot) : note; }
function designFromNote_(note) {
  const s = String(note || ''), i = s.indexOf(' | DESIGN:');
  if (i < 0) return null;
  try { return JSON.parse(s.slice(i + 10)); } catch (e) { return null; }
}
function designValid_(s) {
  return !!(s && s.version === 1 && ['chatgpt3','diseno6'].indexOf(s.product) >= 0 && s.days === (s.product === 'chatgpt3' ? 30 : 180) && s.created >= s.startAt && s.startAt > 0 && s.account);
}
function designDeliver_(sh, snapshot, reference, email, started, name) {
  if (!snapshot) return;
  if (!designValid_(snapshot)) throw fail_('La promoción del pedido necesita revisión.');
  const marker = 'CapCut diseño ' + reference, rows = sh.getDataRange().getValues();
  const owner = String(email).trim().toLowerCase();
  if (rows.slice(1).some(r => String(r[10]) === marker && String(r[4]).trim().toLowerCase() === owner)) return;
  const pool = designPool_(rows, snapshot.account);
  if (!pool.length) throw fail_('Tu compra está registrada; falta disponibilidad de CapCut. No vuelvas a pagar.');
  const base = rows[pool[0].fila - 1], taken = {};
  rows.forEach(r => { if (r[0]) taken[String(r[0]).toUpperCase()] = true; });
  putRow_(sh, [newCode_(taken), 'CapCut Pro', base[2], base[3], owner, 'Activo', new Date(started), snapshot.days, 0, '', marker, '', 0, txt_(name || ''), '']);
  SpreadsheetApp.flush();
}
function designPending_(sh, email) {
  const rows = sh.getDataRange().getValues();
  rows.slice(1).forEach(r => {
    if (String(r[4]).trim().toLowerCase() !== email || !r[6]) return;
    const s = designFromNote_(r[10]);
    if (s) designDeliver_(sh, s, String(r[0]), email, r[6], r[13]);
  });
}
function designPublic_() {
  const c = designConfig_(), active = !!(c.enabled && c.startAt && Date.now() >= c.startAt);
  return {active:active, startAt:active ? c.startAt : null, available:active && !!designPool_(sheet_().getDataRange().getValues(), c.account).length};
}
function designConfigure_(b) {
  const p = PropertiesService.getScriptProperties(), old = designConfig_();
  if (b.enabled === false) { p.setProperty('DESIGN_PROMO', JSON.stringify(Object.assign({}, old, {enabled:false}))); return {ok:true, active:false}; }
  const account = String(b.account || '').trim().toLowerCase();
  if (!account || !designPool_(sheet_().getDataRange().getValues(), account).length) throw fail_('Agrega primero la cuenta de CapCut Pro al inventario privado y comprueba su disponibilidad.');
  const config = {enabled:true, account:account, startAt:old.startAt || Date.now()};
  const prices=Object.assign({},ppConfig_().prices,{diseno6:'15.85'});
  p.setProperty('PAYPAL_USD_PRICES',JSON.stringify(prices));
  p.setProperty('DESIGN_PROMO', JSON.stringify(config));
  log_('Promoción diseño habilitada', 'Solo pedidos nuevos; 3+1 por 20000 COP y 6+6 por 50000 COP', 'admin');
  return {ok:true, active:true, startAt:config.startAt};
}
