const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const addon=fs.readFileSync(path.join(__dirname,'../payments/design-bundles.gs'),'utf8');
function patch(source){
  let s=source.replace(/\r\n/g,'\n');
  if(s.includes('function designConfig_()'))return s;
  function replace(a,b){if(!s.includes(a))throw Error('Missing patch anchor: '+a.slice(0,90));s=s.replace(a,b);}
  replace("  claude:    {name:","  diseno3: {name:'Combo diseño · ChatGPT 3 meses + CapCut 1 mes', match:['chatgpt'], price:25000, dias:90, de:'chatgpt', oculto:true},\n  diseno6: {name:'Diseño 6 meses · ChatGPT + CapCut', match:['chatgpt'], price:50000, dias:180, de:'chatgpt', oculto:true},\n  claude:    {name:");
  replace("function precios_() { return", "function precios_() { const design = designPublic_(); return");
  replace("oculto: !!CATALOGO[k].oculto})); }", "oculto: (k === 'diseno3' || k === 'diseno6') ? !design.available : !!CATALOGO[k].oculto, design: (k === 'diseno3' || k === 'diseno6') ? design : undefined})); }");
  replace("    if (action === 'admin_paypal_set')", "    if (action === 'admin_design_set') return designConfigure_(b);\n    if (action === 'admin_paypal_set')");
  replace("  return guardarChatgptGlobal_(sh, prepararChatgptGlobal_", "  designPending_(sh, email);\n  return guardarChatgptGlobal_(sh, prepararChatgptGlobal_");
  // A snapshot is attached only while creating a new paid order/code, never inferred from old plan dates.
  replace("'Venta WhatsApp ' + v[0], tel, monto", "designNote_('Venta WhatsApp ' + v[0], designSnapshot_(Object.keys(CATALOGO).find(k => CATALOGO[k] === prod))), tel, monto");
  replace("  q.checkout=b.checkout===", "  q.design=designSnapshot_(id);\n  q.checkout=b.checkout===");
  replace("chatgpt6:'10.87'}", "chatgpt6:'10.87',diseno3:'7.93',diseno6:'15.85'}");
  replace("n&&CATALOGO[k]&&!CATALOGO[k].oculto", "n&&CATALOGO[k]&&((k==='diseno3'||k==='diseno6')?designPublic_().available:!CATALOGO[k].oculto)");
  replace("const p=CATALOGO[product];if(!p||p.oculto||", "const p=CATALOGO[product];if(!p||(p.oculto && product!=='diseno3' && product!=='diseno6')||");
  replace("  return {config:c,product:p};", "  designSnapshot_(product);\n  return {config:c,product:p};");
  replace("  if(delivered){osh.getRange(n,5)", "  if(delivered){designDeliver_(sh,q.design,order.ref,o[1],delivered[6],q.customerName);osh.getRange(n,5)");
  replace("  osh.getRange(n,5).setValue('ENTREGADO');osh.getRange(n,8).setValue(base[2]);order.state='ENTREGADO';ppSave_(order);", "  const primary=sh.getDataRange().getValues().slice(1).find(r=>String(r[10])===marker && String(r[4]).toLowerCase()===String(o[1]).toLowerCase());\n  designDeliver_(sh,q.design,order.ref,o[1],primary[6],q.customerName);\n  osh.getRange(n,5).setValue('ENTREGADO');osh.getRange(n,8).setValue(base[2]);order.state='ENTREGADO';ppSave_(order);");
  replace("approveUrl:q.approval,name:q.name,days:q.days,total:ppAmount_(q.cents)", "approveUrl:q.approval,name:q.name,days:q.days,bonusDays:q.design?q.design.days:0,total:ppAmount_(q.cents)");
  replace("description:'Acceso por '+q.days+' días. Pago único, sin renovación automática.'", "description:'ChatGPT por '+q.days+' días.'+(q.design?' Incluye CapCut Pro por '+q.design.days+' días.':'')+' Pago único, sin renovación automática.'");
  replace("    const cents = prod.price * 100;", "    const bonus = designSnapshot_(id);\n    const cents = prod.price * 100;");
  replace("osh.appendRow([ref, email, id, prod.price, 'PENDIENTE', new Date(), '', '', '']);", "osh.appendRow([ref, email, id, prod.price, 'PENDIENTE', new Date(), '', '', designNote_('', bonus)]);");
  replace("'Pago Wompi ' + o[0], '', Number(o[3])", "designNote_('Pago Wompi ' + o[0], designFromNote_(o[8])), '', Number(o[3])");
  replace("  osh.getRange(n, 5).setValue('ENTREGADO'); osh.getRange(n, 8).setValue(base[2]);", "  designPending_(sh, String(o[1]).toLowerCase());\n  osh.getRange(n, 5).setValue('ENTREGADO'); osh.getRange(n, 8).setValue(base[2]);");
  replace("  const data = sh.getDataRange().getValues();\n  const pool = cuentasConCupo_(data, prod, CAP_PAGOS);", "  const data = sh.getDataRange().getValues();\n  const existing=data.slice(1).find(r=>String(r[10]).split(' | DESIGN:')[0]==='Pago Wompi '+o[0]&&String(r[4]).toLowerCase()===String(o[1]).toLowerCase());\n  if(existing){designPending_(sh,String(o[1]).toLowerCase());osh.getRange(n,5).setValue('ENTREGADO');osh.getRange(n,8).setValue(existing[2]);return {ok:true,estado:'ENTREGADO'};}\n  const pool = cuentasConCupo_(data, prod, CAP_PAGOS);");
  // The bot receives current terms and a conditional-offer flag; credentials never leave inventory.
  replace("    return {ok: true, tienda: TIENDA_URL, productos:", "    const design = designPublic_();\n    return {ok: true, tienda: TIENDA_URL, productos:");
  replace("disponible: cuentasConCupo_(data, CATALOGO[k], CAP_PAGOS).length > 0, oculto: !!CATALOGO[k].oculto", "disponible: cuentasConCupo_(data, CATALOGO[k], CAP_PAGOS).length > 0 && (!(k==='diseno6'||k==='diseno3') || design.available), oculto: (k==='diseno3'||k==='diseno6') ? !design.available : !!CATALOGO[k].oculto, soloImagenes:k==='diseno6', capcutDias:design.active?(k==='diseno3'?30:k==='diseno6'?180:0):0, promoDesde:design.startAt");
  s+='\n'+addon;new vm.Script(s);return s;
}
if(require.main===module)for(const f of process.argv.slice(2)){fs.writeFileSync(f,patch(fs.readFileSync(f,'utf8')));console.log('Prepared '+f);}
module.exports={patch};
