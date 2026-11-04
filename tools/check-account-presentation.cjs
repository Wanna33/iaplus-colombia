const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('admin.js','utf8');
const begin=source.indexOf('function passListHtml()'),end=source.indexOf('async function savePass',begin);
const rows=[{producto:'ChatGPT',correo:'old@example.test',clave:'demo',ordenCuenta:1},{producto:'ChatGPT',correo:'retired@example.test',retirada:true,clave:'demo',ordenCuenta:9},{producto:'ChatGPT',correo:'new@example.test',clave:'demo',ordenCuenta:100,recomendada:true}];
const ctx=vm.createContext({items:rows,IAPInsights:{isActive:()=>true},esc:s=>String(s??''),EMO:()=>'',capMap:()=>new Map(),getCap:()=>25});
vm.runInContext(source.slice(begin,end),ctx);const html=ctx.passListHtml();
assert.ok(!html.includes('retired@example.test'));assert.ok(html.indexOf('new@example.test')<html.indexOf('old@example.test'));assert.ok(html.includes('★ Recomendada'));assert.ok(html.includes('data-recommend="false"'));
console.log('PASS: retired accounts absent from inventory; newest first; recommendation toggle rendered.');
