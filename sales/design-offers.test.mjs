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
