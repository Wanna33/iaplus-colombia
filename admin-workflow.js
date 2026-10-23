/* Pure administrative batch rules. Only the server creates activation codes. */
(function(root){
  function validateBatch({qty,days,price}){
    qty=Number(qty);days=Number(days);price=Number(price);
    if(!Number.isInteger(qty)||qty<1||qty>200)throw Error('Elige entre 1 y 200 códigos por lote.');
    if(!Number.isInteger(days)||days<1||days>366)throw Error('La duración debe ser de 1 a 366 días.');
    if(!Number.isFinite(price)||price<0||!Number.isInteger(price))throw Error('Escribe un precio total válido en pesos colombianos.');
    return {qty,days,price,total:qty*price};
  }
  async function createCodes(api,{row,qty,days,price},onProgress=()=>{}){
    const codes=[];
    try{
      while(codes.length<qty){
        const count=Math.min(100,qty-codes.length);let result;
        try{result=await api('admin_bulk',{fila:row,cantidad:count,dias:days,precio:price});}
        catch(e){
          if(!/acci[oó]n (?:no v[aá]lida|desconocida)|unsupported_action/i.test(e.message))throw e;
          for(let i=0;i<count;i++){
            const one=await api('admin_clone',{fila:row,dias:days,precio:price});
            if(!one.codigo)throw Error('El servidor no confirmó el código. Actualiza la lista antes de repetir.');
            codes.push(String(one.codigo));onProgress(codes.length,qty);
          }
          continue;
        }
        if(!Array.isArray(result.codigos)||result.codigos.some(c=>typeof c!=='string'||!c))throw Error('El servidor devolvió un resultado incompleto. Actualiza la lista antes de repetir.');
        if(result.codigos.length!==count){codes.push(...result.codigos);throw Error('El servidor devolvió un lote parcial. Actualiza la lista antes de repetir.');}
        codes.push(...result.codigos);onProgress(codes.length,qty);
      }
      return codes;
    }catch(e){e.codes=[...codes];throw e;}
  }
  const api={validateBatch,createCodes};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IAPAdminTools=api;
})(typeof window!=='undefined'?window:globalThis);
