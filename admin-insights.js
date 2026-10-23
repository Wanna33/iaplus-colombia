/* Read-only business metrics derived from the authenticated admin inventory. No tracking. */
(function(root){
  const DAY=86400000;
  const key=v=>String(v||'').trim().toLowerCase();
  const date=v=>{if(!v)return null;const n=new Date(v).getTime();return Number.isFinite(n)?n:null;};
  const price=i=>Math.max(0,Number(i.precio)||0);
  function periodStart(now,days){
    if(!days)return -Infinity;
    const bogota=new Date(now-5*3600000);
    return Date.UTC(bogota.getUTCFullYear(),bogota.getUTCMonth(),bogota.getUTCDate())+5*3600000-(days-1)*DAY;
  }
  function active(i,now){const end=date(i.fin);return !i.vencida&&(!end||end>now);}
  function isDue(i,now){if(!active(i,now))return false;const end=date(i.fin);return (end!==null&&end<=now+7*DAY)||(end===null&&i.restante!==null&&i.restante!==undefined&&Number(i.restante)<=7);}
  function isExpiredCode(i,now,ttl){const created=date(i.creado);return !key(i.cliente)&&!!i.codigo&&key(i.estado)!=='con problemas'&&Number(ttl)>0&&created!==null&&created+Number(ttl)*60000<=now;}
  function family(product){const p=key(product);return /chatgpt/.test(p)?'chatgpt':p;}
  function compute(source,{now=Date.now(),days=30,ttl=null}={}){
    const records=Array.isArray(source)?source:[],start=periodStart(now,days),previousStart=days?start-days*DAY:-Infinity;
    const customers=new Map(),accounts=new Map(),products=new Map();
    const assigned=records.filter(i=>key(i.cliente));
    const inPeriod=i=>{if(!days)return true;const at=date(i.inicio);return at!==null&&at<=now&&at>=start;};
    const period=assigned.filter(inPeriod);
    const previous=days?assigned.filter(i=>{const at=date(i.inicio);return at!==null&&at>=previousStart&&at<start;}):[];
    let availableCodes=0,expiredUnused=0,withoutCode=0,problemRows=0;
    for(const i of records){
      if(key(i.cliente)){
        const email=key(i.cliente),c=customers.get(email)||{email,name:i.nombre||'',plans:0,activePlans:0,first:null,periodPlans:0,periodValue:0,totalValue:0,soon:false};
        c.plans++;c.totalValue+=price(i);if(!c.name&&i.nombre)c.name=i.nombre;
        if(active(i,now)){c.activePlans++;const end=date(i.fin);if((end!==null&&end<=now+7*DAY)||(end===null&&i.restante!==null&&i.restante!==undefined&&Number(i.restante)<=7))c.soon=true;}
        const at=date(i.inicio);if(at!==null&&at<=now&&(c.first===null||at<c.first))c.first=at;
        if(inPeriod(i)){c.periodPlans++;c.periodValue+=price(i);}
        customers.set(email,c);
      }
      const email=key(i.correo);if(email){const id=family(i.producto)+'|'+email,a=accounts.get(id)||{email,problem:false,has2fa:false,known2fa:false};a.problem=a.problem||key(i.estado)==='con problemas';a.has2fa=a.has2fa||i.tiene2fa===true;a.known2fa=a.known2fa||typeof i.tiene2fa==='boolean';accounts.set(id,a);}
      if(!key(i.cliente)){
        if(key(i.estado)==='con problemas'){problemRows++;continue;}
        if(!i.codigo){withoutCode++;continue;}
        const created=date(i.creado);if(Number(ttl)>0&&created!==null&&created+Number(ttl)*60000<=now)expiredUnused++;else availableCodes++;
      }
    }
    for(const i of period){const name=String(i.producto||'Sin producto'),p=products.get(name)||{name,activations:0,value:0};p.activations++;p.value+=price(i);products.set(name,p);}
    const list=[...customers.values()],knownDates=assigned.filter(i=>date(i.inicio)!==null),value=period.reduce((sum,i)=>sum+price(i),0),previousValue=previous.reduce((sum,i)=>sum+price(i),0);
    const totalCodes=records.filter(i=>i.codigo).length,redeemedCodes=assigned.filter(i=>i.codigo).length;
    return {
      days,start,totalCustomers:list.length,activeCustomers:list.filter(c=>c.activePlans>0).length,expiredCustomers:list.filter(c=>!c.activePlans).length,
      activePlans:assigned.filter(i=>active(i,now)).length,expiredPlans:assigned.filter(i=>!active(i,now)).length,totalPlans:assigned.length,
      newCustomers:days?list.filter(c=>c.first!==null&&c.first>=start).length:list.length,repeatCustomers:list.filter(c=>c.plans>1).length,customersWithoutDate:list.filter(c=>c.first===null).length,
      dueCustomers:list.filter(c=>c.soon).length,periodActivations:period.length,periodValue:value,previousValue,valueChange:previousValue?Math.round((value-previousValue)/previousValue*100):null,
      periodBuyers:list.filter(c=>c.periodPlans>0).length,averagePlan:period.length?Math.round(value/period.length):0,
      totalAccounts:accounts.size,problemAccounts:[...accounts.values()].filter(a=>a.problem).length,accountsWithout2fa:[...accounts.values()].filter(a=>a.known2fa&&!a.has2fa).length,
      availableCodes,expiredUnused,withoutCode,problemRows,totalCodes,redeemedCodes,redemptionRate:totalCodes?Math.round(redeemedCodes/totalCodes*100):null,
      missingActivationDates:assigned.length-knownDates.length,
      topProducts:[...products.values()].sort((a,b)=>b.activations-a.activations||b.value-a.value),
      topCustomers:list.filter(c=>c.periodPlans>0).sort((a,b)=>b.periodPlans-a.periodPlans||b.periodValue-a.periodValue).slice(0,5)
    };
  }
  const api={compute,periodStart,isDue,isExpiredCode,isActive:active};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IAPInsights=api;
})(typeof window!=='undefined'?window:globalThis);
