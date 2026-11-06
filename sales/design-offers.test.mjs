import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wantsImages,offeredProducts,designRules} from './design-offers.ts';
const bundle={key:'diseno6',nombre:'Diseño 6 meses',precio:50000,dias:180,disponible:true,soloImagenes:true,capcutDias:180};
test('la oferta 6+6 solo se ofrece por intención de imágenes del cliente',()=>{
 assert.equal(wantsImages([{r:'u',t:'Quiero ChatGPT para generar imágenes'}]),true);
 for(const turn of [{r:'u',t:'Quiero ChatGPT para estudiar'},{r:'u',t:'No quiero crear imágenes'},{r:'u',t:'El cliente envió una imagen',img:'file'},{r:'a',t:'ChatGPT para generar imágenes'}])assert.equal(wantsImages([turn]),false);
 assert.equal(offeredProducts([bundle],false).length,0);assert.equal(offeredProducts([bundle],true).length,1);
 assert.equal(offeredProducts([{...bundle,oculto:true}],true).length,0);
 assert.ok(designRules([bundle]).includes('clave exacta'));
});

test('el combo 3+1 cuesta 25000 y no cambia el plan sencillo de 20000',()=>{
 const combo={key:'diseno3',nombre:'Combo diseño',precio:25000,dias:90,disponible:true,capcutDias:30};
 const plain={key:'chatgpt3',nombre:'ChatGPT',precio:20000,dias:90,disponible:true};
 assert.deepEqual(offeredProducts([plain,combo,bundle],false),[plain,combo]);
 const rules=designRules([plain,combo]);assert.ok(rules.includes('$25.000 COP (diseno3)'));assert.ok(rules.includes('sin CapCut'));
 assert.ok(!designRules([plain]).includes('$25.000 COP (diseno3)'));
});
