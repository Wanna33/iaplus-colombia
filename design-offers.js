/* Public offer descriptions only; entitlement and availability are decided by the server. */
(function(root){
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function imageIntent(text){
    const q=normalize(text);
    return /\b(imagen(?:es)?|fotos?|ilustraciones?|logos?)\b/.test(q) && !/\bno (?:quiero |necesito |busco )?(?:generar |crear |hacer )?(?:imagenes|fotos|logos)\b/.test(q);
  }
  function apply(products,prices){
    const row=prices.find(p=>p.k==='chatgpt3'),status=row?.design;
    const p=products.find(p=>p.id==='chatgpt3');
    if(p){
      p.name=status?.active?'Plan de diseño · ChatGPT 3 meses':'ChatGPT 3 meses';
      p.badge=status?.active?'Incluye 1 mes de CapCut':'El más pedido';
      p.bonusDays=status?.active?30:0;p.unavailable=!!(status?.active&&!status?.available);
      p.feats=status?.active?['ChatGPT Plus por 3 meses','CapCut Pro por 1 mes incluido','Promoción para compras nuevas','Cuentas compartidas · activación en Mi cuenta']:['ChatGPT Plus por 3 meses','Pago único por la duración indicada','Cuenta compartida · hasta 2 dispositivos','Soporte por WhatsApp durante tu plan'];
    }
    const old=products.findIndex(p=>p.id==='diseno6');if(old>=0)products.splice(old,1);
    const bundle=prices.find(p=>p.k==='diseno6');
    if(bundle&&!bundle.oculto&&bundle.design?.available)products.push({id:'diseno6',name:'Diseño para imágenes · 6 meses',cat:'IA',ico:'🎨',img:'chatgpt.webp',dark:true,price:bundle.price,days:180,per:'/6 meses',badge:'ChatGPT + CapCut',imageOnly:true,bonusDays:180,feats:['ChatGPT Plus por 6 meses','CapCut Pro por 6 meses incluido','Para crear imágenes y editar contenido','Cuentas compartidas · pago único']});
  }
  const api={imageIntent,apply};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IAPDesign=api;
})(typeof window!=='undefined'?window:globalThis);
