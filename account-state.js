(function(root){
  const expired=(it,now=Date.now())=>!!it.vencida||(Number.isFinite(Date.parse(it.fin))&&Date.parse(it.fin)<=now);
  const active=(it,now=Date.now())=>!it.vencida&&Number.isFinite(Date.parse(it.fin))&&Date.parse(it.fin)>now;
  const api={isActive:active,isExpired:expired};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.IAPAccountState=api;
})(typeof window==='object'?window:globalThis);
