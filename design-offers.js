/* Public offer descriptions only; entitlement and availability are decided by the server. */
(function(root){
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function imageIntent(text){
    const q=normalize(text);
    return /\b(imagen(?:es)?|fotos?|ilustraciones?|logos?)\b/.test(q) && !/\bno (?:quiero |necesito |busco )?(?:generar |crear |hacer )?(?:imagenes|fotos|logos)\b/.test(q);
  }
  function apply(products,prices){
    const p=products.find(p=>p.id==='chatgpt3');
    if(p){
      p.name='ChatGPT 3 meses';p.badge='El más pedido';p.bonusDays=0;p.unavailable=false;
      p.feats=['ChatGPT Plus por 3 meses','Pago único por la duración indicada','Cuenta compartida · hasta 2 dispositivos','Soporte por WhatsApp durante tu plan'];
    }
    for(const id of ['diseno3','diseno6']){
      const old=products.findIndex(p=>p.id===id);if(old>=0)products.splice(old,1);
      const bundle=prices.find(p=>p.k===id),six=id==='diseno6';
      if(bundle&&!bundle.oculto&&bundle.design?.available)products.push({id,name:six?'Combo imágenes · 6 + 6 meses':'Combo diseño · 3 + 1 meses',cat:'IA',ico:'🎨',img:'chatgpt.webp',dark:true,price:bundle.price,days:six?180:90,per:six?'/combo 6 + 6':'/combo 3 + 1',badge:'ChatGPT + CapCut',imageOnly:six,bonusDays:six?180:30,feats:['ChatGPT Plus por '+(six?6:3)+' meses','CapCut Pro por '+(six?'6 meses':'1 mes')+' incluido','Disponible para compras nuevas','Cuentas compartidas · pago único']});
    }
  }
  const api={imageIntent,apply};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IAPDesign=api;
})(typeof window!=='undefined'?window:globalThis);
