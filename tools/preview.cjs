const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',webp:'image/webp',png:'image/png',jpg:'image/jpeg',svg:'image/svg+xml',webmanifest:'application/manifest+json'};
http.createServer((req,res)=>{
  let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  if(p==='/')p='/index.html';
  if(p==='/__qa/admin.html'||p==='/__qa/admin-preview.js'||p==='/__qa/no-google.js'){
    delete require.cache[require.resolve('./fixtures/admin-preview.cjs')];
    const qa=require('./fixtures/admin-preview.cjs');
    res.setHeader('Content-Type',p.endsWith('.html')?mime.html:mime.js);res.setHeader('Cache-Control','no-store');
    return res.end(p.endsWith('.html')?qa.html():p.endsWith('no-google.js')?'':qa.js());
  }
  const fixtures={'/__qa/paypal.html':'tools/fixtures/paypal.html','/__qa/paypal-preview.js':'tools/fixtures/paypal-preview.js'};
  if(fixtures[p]){fs.readFile(path.join(root,fixtures[p]),(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[p.split('.').pop()]);res.setHeader('Cache-Control','no-store');res.end(data);});return;}
  if(!/^\/[\w./-]+\.(html|js|css|webp|png|jpg|svg|webmanifest)$/.test(p)||p.includes('..')||/^\/(backend|bot-local|whatsapp-bot|tools|\.)/.test(p)){res.writeHead(403).end();return;}
  fs.readFile(path.join(root,p),(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[p.split('.').pop()]);res.setHeader('Cache-Control','no-cache');res.end(data);});
}).listen(8765,'127.0.0.1',()=>console.log('Preview http://127.0.0.1:8765/index.html'));
