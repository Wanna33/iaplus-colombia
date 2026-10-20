(async()=>{
  const assert=require('node:assert/strict');const worker=(await import('../payments/webhook-worker.mjs')).default;
  const env={TIENDA_API:'https://script.google.com/macros/s/TEST/exec'};let forwarded;const original=global.fetch;
  global.fetch=async(url,options)=>{forwarded=JSON.parse(options.body);return {json:async()=>({ok:true})};};
  try{
    assert.equal((await worker.fetch(new Request('https://example.test/health'),env)).status,200);
    assert.equal((await worker.fetch(new Request('https://example.test/paypal/webhook',{method:'POST',body:'{}'}),env)).status,400);
    assert.equal(forwarded,undefined);
    const headers={'paypal-transmission-id':'t','paypal-transmission-time':'time','paypal-transmission-sig':'sig','paypal-auth-algo':'SHA256withRSA','paypal-cert-url':'https://api.paypal.com/v1/notifications/certs/TEST'};
    const req=()=>new Request('https://example.test/paypal/webhook',{method:'POST',headers,body:JSON.stringify({id:'EVENT',event_type:'PAYMENT.CAPTURE.COMPLETED'})});
    assert.equal((await worker.fetch(req(),env)).status,200);assert.equal(forwarded.action,'paypal_webhook');assert.equal(forwarded.event.id,'EVENT');assert.equal(forwarded.headers['paypal-transmission-sig'],'sig');
    assert.equal((await worker.fetch(req(),{TIENDA_API:'https://attacker.example.test/exec'})).status,503);
    global.fetch=async()=>({json:async()=>({ok:false})});assert.equal((await worker.fetch(req(),env)).status,503);
    console.log('PASS: webhook forwarding, header checks, host restriction, retries; no real network requests.');
  }finally{global.fetch=original;}
})().catch(error=>{console.error(error);process.exitCode=1;});
