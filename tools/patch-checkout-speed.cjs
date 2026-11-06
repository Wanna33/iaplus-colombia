const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function patch(source){
 let s=source.replace(/\r\n/g,'\n');if(s.includes('function ppHostedStartFast_('))return s;
 const replace=(a,b)=>{if(!s.includes(a))throw Error('Missing checkout anchor: '+a.slice(0,90));s=s.replace(a,b);};
 replace("const props=PropertiesService.getScriptProperties(),g=k=>String(props.getProperty(k)||'').trim();", "const props=PropertiesService.getScriptProperties(),values=props.getProperties(),g=k=>String(values[k]||'').trim();");
 replace('function ppStatus_(){\n  const c=ppConfig_(),prices={};', 'function ppStatus_(config){\n  const c=config||ppConfig_(),prices={};');
 replace('function ppGuard_(email,product){\n  const c=ppConfig_();if(!ppStatus_().ready)', 'function ppGuard_(email,product,config){\n  const c=config||ppConfig_();if(!ppStatus_(c).ready)');
 replace('  designSnapshot_(product);\n  return {config:c,product:p};', '  return {config:c,product:p,design:designSnapshot_(product)};');
 replace('function ppQuote_(b,email){\n  const id=String(b.producto||\'\'),valid=ppGuard_(email,id)', 'function ppQuote_(b,email,validated){\n  const id=String(b.producto||\'\'),valid=validated||ppGuard_(email,id)');
 replace('q.design=designSnapshot_(id);','q.design=valid.design;');
 replace('function ppCreate_(b,email){','function ppCreate_(b,email,validated){');
 replace('const valid=ppGuard_(email,q.product),c=valid.config,p=valid.product;', 'const valid=validated||ppGuard_(email,q.product),c=valid.config,p=valid.product;');
 const start=s.indexOf("  if(b.action==='paypal_hosted_create'){",s.indexOf('function ppHandle_('));
 const end=s.indexOf("  if(b.action==='paypal_quote')",start);
 if(start<0||end<0)throw Error('Missing hosted dispatch');
 s=s.slice(0,start)+"  if(b.action==='paypal_hosted_create')return ppHostedStartFast_(b,email);\n"+s.slice(end);
 replace("function ppHostedReady_(){const c=ppConfig_(),p=PropertiesService.getScriptProperties();return !!(ppStatus_().ready", "function ppHostedReady_(config){const c=config||ppConfig_(),p=PropertiesService.getScriptProperties();return !!(ppStatus_(c).ready");
 replace("if(!ppHostedReady_())throw fail_('El pago automático aún no está disponible.');", "if(!ppHostedReady_(c))throw fail_('El pago automático aún no está disponible.');");
 s+='\n'+fs.readFileSync(path.join(__dirname,'../payments/checkout-speed.gs'),'utf8');new vm.Script(s);return s;
}
if(require.main===module)for(const f of process.argv.slice(2)){fs.writeFileSync(f,patch(fs.readFileSync(f,'utf8')));console.log('Optimized '+f);}
module.exports={patch};
