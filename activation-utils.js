/* Shared activation parsing. Never redeems or sends a code. */
(function(root){
  function parse(value){
    let raw=String(value||'').trim().replace(/[\u2010-\u2015\u2212]/g,'-');
    if(!raw)return {code:'',error:'Escribe o pega el código que recibiste con tu compra.'};
    if(/^https?:\/\//i.test(raw)){
      try{const url=new URL(raw);if(url.hostname!=='wanna33.github.io'||!url.pathname.startsWith('/iaplus-colombia/'))throw Error();raw=url.searchParams.get('codigo')||url.searchParams.get('code')||'';}
      catch{return {code:'',error:'Pega tu código o un enlace de activación de IA Plus Colombia.'};}
    }
    raw=raw.toUpperCase().replace(/\s+/g,'');
    if(/^IAP[A-Z0-9]{8}$/.test(raw))raw='IAP-'+raw.slice(3,7)+'-'+raw.slice(7);
    if(/^\d{6}$/.test(raw))return {code:'',error:'Ese parece un código de verificación de 6 dígitos. Usa el código de activación que empieza por IAP-.'};
    if(!/^[A-Z0-9-]{6,40}$/.test(raw))return {code:'',error:'Revisa el código completo. Ejemplo: IAP-AB12-CD34. También puedes pegar tu enlace de activación.'};
    return {code:raw,error:''};
  }
  const api={parse};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IAPActivation=api;
})(typeof window!=='undefined'?window:globalThis);
