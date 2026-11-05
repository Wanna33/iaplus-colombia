const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),file=path.join(root,'whatsapp-bot/src/index.ts');
fs.copyFileSync(path.join(root,'sales/design-offers.ts'),path.join(root,'whatsapp-bot/src/design-offers.ts'));
fs.writeFileSync(path.join(root,'whatsapp-bot/pruebas/design-offers.test.mjs'),fs.readFileSync(path.join(root,'sales/design-offers.test.mjs'),'utf8').replace("'./design-offers.ts'","'../src/design-offers.ts'"));
let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
if(!s.includes("from './design-offers'")){
 s="import { wantsImages, offeredProducts, designRules } from './design-offers';\n"+s;
 s=s.replace('oculto?: boolean };','oculto?: boolean; soloImagenes?:boolean; capcutDias?:number; promoDesde?:number };');
 s=s.replace('${lista}\n\nMEDIOS DE PAGO','${lista}\n\n${designRules(prods)}\n\nMEDIOS DE PAGO');
 s=s.replace('  const prods = await catalogo(env);','  const prods = offeredProducts(await catalogo(env), wantsImages(chat.turnos));');
 s=s.replace('if (esPreguntaGeneral(chat, pregunta)) {','if (esPreguntaGeneral(chat, pregunta) && !prods.some(p=>p.capcutDias)) {');
 s=s.replace('  if (!nuevos.length || nuevos.some((t) => t.img) || !cfg.asistente) return null;', '  if (!nuevos.length || nuevos.some((t) => t.img) || !cfg.asistente || wantsImages(chat.turnos)) return null;');
 s=s.replace('else if (auto) { respuesta = conPrecios(auto.texto, await catalogo(env).catch(() => [])); usadas', "else if (auto) { const catalogoActual=await catalogo(env).catch(() => []); respuesta = conPrecios(auto.texto, catalogoActual); if(/20\\.000/.test(respuesta)&&catalogoActual.some(p=>p.key==='chatgpt3'&&p.capcutDias===30&&p.disponible))respuesta+='\\n\\n🎁 En compras nuevas del plan de diseño de $20.000: 3 meses de ChatGPT + 1 mes de CapCut Pro incluido. Cada acceso tiene su propio vencimiento.'; usadas");
}
if(!s.includes('${designRules(prods)}'))s=s.replace('${lista}\n\nMEDIOS DE PAGO','${lista}\n\n${designRules(prods)}\n\nMEDIOS DE PAGO');
fs.writeFileSync(file,s);
console.log('Design rules prepared; activation depends on private inventory configuration.');
