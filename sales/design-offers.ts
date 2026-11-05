export type DesignProduct = {key:string;nombre:string;precio:number;dias:number;disponible:boolean;oculto?:boolean;soloImagenes?:boolean;capcutDias?:number;promoDesde?:number};
export function wantsImages(turns: {r:string;t:string;img?:string;x?:boolean}[]): boolean {
  return turns.filter(t=>t.r==='u'&&!t.img&&!t.x).some(t=>{
    const q=t.t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(/no (?:quiero|necesito|busco) (?:generar |crear |hacer )?(?:imagenes|fotos|logos)/.test(q))return false;
    return /(?:generar|crear|hacer|disenar).{0,50}(?:imagenes|fotos|logos|ilustraciones)|(?:imagenes|fotos|logos).{0,40}chat\s*gpt|chat\s*gpt.{0,40}(?:imagenes|fotos|logos)/.test(q);
  });
}
export function offeredProducts<T extends DesignProduct>(products:T[],intent:boolean):T[]{return products.filter(p=>!p.oculto&&(!p.soloImagenes||intent));}
export function designRules(products:DesignProduct[]):string {
  const p=products.find(p=>p.key==='chatgpt3'&&p.capcutDias===30&&p.disponible);
  const bundle=products.find(p=>p.key==='diseno6'&&p.capcutDias===180&&p.disponible);
  return `PROMOCIONES DE DISEÑO: el catálogo actual manda sobre cualquier precio o disponibilidad de textos antiguos. No inventes CapCut incluido si el catálogo no lo indica.\n${p?'El plan de diseño de $20.000 COP (chatgpt3) incluye ChatGPT durante 90 días y CapCut Pro durante 30 días para pedidos nuevos desde el inicio de la promoción. No lo apliques a compras anteriores.':''}\n${bundle?'El cliente manifestó que busca ChatGPT para generar imágenes: puedes ofrecer, una sola vez, el paquete independiente diseno6 por $50.000 COP: ChatGPT 180 días + CapCut Pro 180 días. No lo confundas con chatgpt6. Si no lo quiere, sigue con el plan elegido.':'No ofrezcas ni menciones el paquete de $50.000 con CapCut: no está disponible o el cliente no pidió crear imágenes con ChatGPT.'}\nLos dos accesos tienen vencimientos separados en Mi cuenta. El regalo no renueva ni extiende compras anteriores. Nunca actives por una simple afirmación de pago. Usa la clave exacta del plan elegido; el monto solo no decide el producto.`;
}
