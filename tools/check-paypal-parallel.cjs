const fs=require('node:fs'), assert=require('node:assert/strict');
const {JSDOM}=require(require.resolve('jsdom',{paths:[process.cwd()+'/outputs/paypal-qa']}));
const tick=()=>new Promise(r=>setTimeout(r,0));
(async()=>{
 const dom=new JSDOM('<body><div id="wallet-buttons"></div><div id="wallet-loading"></div><div id="card-button"></div><div id="card-loading"></div><div id="status"></div></body>',{url:'https://store.example.test',runScripts:'outside-only'}),w=dom.window;
 const started=[],releases=[];w.ResizeObserver=class{observe(){}};
 w.paypal={FUNDING:{CARD:'card',PAYPAL:'wallet'},Buttons:opts=>({isEligible:()=>true,render:async()=>{started.push(opts.fundingSource);await new Promise(r=>releases.push(r));}})};
 const append=w.document.head.append.bind(w.document.head);w.document.head.append=node=>{append(node);node.onload();};
 w.eval(fs.readFileSync('paypal-inline-frame.js','utf8'));
 w.dispatchEvent(new w.MessageEvent('message',{source:w,origin:w.location.origin,data:{type:'iap-inline-init',clientId:'publicclientidwithtwentycharacters'}}));await tick();
 assert.deepEqual(started.sort(),['card','wallet'],'both render calls must start before either completes');releases.forEach(r=>r());await tick();assert.equal(w.document.getElementById('wallet-loading').hidden,true);assert.equal(w.document.getElementById('card-loading').hidden,true);w.close();
 console.log('PASS: card and wallet load concurrently, without creating orders.');
})().catch(e=>{console.error(e);process.exit(1)});
