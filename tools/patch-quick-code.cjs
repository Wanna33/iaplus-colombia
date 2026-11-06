const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function patch(source){
 let s=source.replace(/\r\n/g,'\n');const module=fs.readFileSync(path.join(__dirname,'../payments/admin-quick-code.gs'),'utf8').replace(/\r\n/g,'\n');
 if(s.includes('function adminQuickCode_(')){const start=s.indexOf('// Called only inside the authenticated admin branch');if(start<0)throw Error('Missing quick-code module marker');return s.slice(0,start)+module;}
 const anchor="    if (action === 'admin_bulk')";if(!s.includes(anchor))throw Error('Missing authenticated admin route');
 s=s.replace(anchor,"    if (action === 'admin_quick_code') return adminQuickCode_(b,email);\n"+anchor);
 s+='\n'+module;new vm.Script(s);return s;
}
if(require.main===module)for(const file of process.argv.slice(2))fs.writeFileSync(file,patch(fs.readFileSync(file,'utf8')));
module.exports={patch};
