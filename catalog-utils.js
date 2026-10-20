/* Shared catalog rules. No requests or customer information. */
(function(root){
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const money = value => '$'+Number(value).toLocaleString('es-CO');
  const days = p => Number(p.days) > 0 ? Number(p.days) : /\/(\d+) meses/.test(p.per) ? Number(p.per.match(/\/(\d+) meses/)[1])*30 : 30;
  const duration = p => {const d=days(p);return d===365?'12 meses':d%30===0?`${d/30} ${d===30?'mes':'meses'}`:`${d} días`;};
  const mode = p => {const f=normalize((p.feats||[]).join(' '));return /compartid/.test(f)?'Cuenta compartida':/privad/.test(f)?'Cuenta privada':'Modalidad por confirmar';};
  const devices = p => {const f=(p.feats||[]).find(f=>/dispositivo/i.test(f))||'';const n=f.match(/(\d+)\s*(?:solo\s*)?dispositivo/);return n?(n[1]==='1'?'1 dispositivo':`Hasta ${n[1]} dispositivos`):'Consultar dispositivos';};
  const matches = (p,query) => {const q=normalize(query);return !q||normalize([p.name,p.cat,...(p.feats||[])].join(' ')).includes(q);};
  const api={normalize,money,days,duration,mode,devices,matches};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IAPCatalog=api;
})(typeof window!=='undefined'?window:globalThis);
