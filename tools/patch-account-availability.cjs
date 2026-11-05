const fs=require('node:fs'),vm=require('node:vm');
function patch(source){
  let s=source.replace(/\r\n/g,'\n');
  if(!s.includes('function autoAgregarSinEspera_(')){
    const marker='function sincronizarChatgptTodos() {';
    if(!s.includes(marker))throw Error('Missing account synchronization function');
    s=s.replace(marker,`// Account reads must not queue behind payment or bot operations.
function autoAgregarSinEspera_(sh, email) {
  if (isAdmin_(email)) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1)) return; // Existing accesses remain readable; synchronize on a later visit.
  try {
    const result = autoAgregar_(sh, email);
    if (result && result.accesosAgregados) SpreadsheetApp.flush();
    return result;
  } finally { lock.releaseLock(); }
}
`+marker);
  }
  s=s.replace("if (action === 'admin_list') out = handle_(body, email);", "if (action === 'admin_list' || action === 'list') out = handle_(body, email);");
  s=s.replace('La lectura del inventario no espera ventas ni llamadas externas al bot.', 'Las lecturas de inventario y accesos no esperan ventas ni llamadas externas al bot.');
  s=s.replace("try { autoAgregar_(sh, email); } catch (e)", "try { if (action === 'list') autoAgregarSinEspera_(sh, email); else autoAgregar_(sh, email); } catch (e)");
  s=s.replace('const metaInventario = inventarioMeta_(rows, PropertiesService.getScriptProperties().getProperties());', 'const propsCuenta = PropertiesService.getScriptProperties().getProperties();\n  const metaInventario = inventarioMeta_(rows, propsCuenta);\n  let cfgCuenta = {}; try { cfgCuenta = JSON.parse(propsCuenta.LIM2FA || \'{}\'); } catch (e) {}');
  s=s.replace('tiene2fa: has2fa_(rows[i][2])', "tiene2fa: !!propsCuenta['TOTP_' + String(rows[i][2]).trim().toLowerCase()]");
  s=s.replace('limite2fa_(email) - hoy), max2fa: limite2fa_(email)', 'limite2fa_(email, cfgCuenta) - hoy), max2fa: limite2fa_(email, cfgCuenta)');
  const start=s.indexOf('function cuentasConCupo_('), end=s.indexOf('\nfunction ',start+1);
  if(start<0||end<0)throw Error('Missing inventory availability function');
  let fn=s.slice(start,end);
  if(!fn.includes('const props = PropertiesService'))fn=fn.replace('  const m = {};', '  const m = {}, props = PropertiesService.getScriptProperties().getProperties();');
  fn=fn.replace('&& cuentaPublica_(a.correo)', "&& props['INVENTARIO_RETIRADA_' + a.correo] !== '1' && props['INVENTARIO_ELIMINADA_' + a.correo] !== '1' && props['INVENTARIO_APAGADA_' + a.correo] !== '1'");
  fn=fn.replace('&& !cuentaRetirada_(a.correo)', "&& props['INVENTARIO_RETIRADA_' + a.correo] !== '1' && props['INVENTARIO_ELIMINADA_' + a.correo] !== '1' && props['INVENTARIO_APAGADA_' + a.correo] !== '1'");
  s=s.slice(0,start)+fn+s.slice(end);
  new vm.Script(s);
  if(!s.includes("action === 'admin_list' || action === 'list'")||!s.includes("if (action === 'list') autoAgregarSinEspera_"))throw Error('Account route patch incomplete');
  return s;
}
if(require.main===module){for(const file of process.argv.slice(2)){fs.writeFileSync(file,patch(fs.readFileSync(file,'utf8')));console.log('Updated '+file);}}
module.exports={patch};
