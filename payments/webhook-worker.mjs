// Stateless forwarder: Apps Script cannot read PayPal's HTTP signature headers.
// No PayPal credentials live in this worker. Verification happens in PayPal.gs.
export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    if(request.method==='GET'&&path==='/health')return new Response('IA Plus PayPal webhook OK');
    if(request.method!=='POST'||path!=='/paypal/webhook')return new Response('Not found',{status:404});
    if(!env.TIENDA_API||!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(env.TIENDA_API))return new Response('Not configured',{status:503});
    if(Number(request.headers.get('content-length')||0)>16000)return new Response('Too large',{status:413});
    const reader=request.body?.getReader();if(!reader)return new Response('Invalid event',{status:400});
    const parts=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>16000){await reader.cancel();return new Response('Too large',{status:413});}parts.push(value);}
    const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
    let event;try{event=JSON.parse(new TextDecoder().decode(bytes));}catch{return new Response('Invalid event',{status:400});}
    const headers={};for(const key of ['paypal-transmission-id','paypal-transmission-time','paypal-transmission-sig','paypal-auth-algo','paypal-cert-url']){const value=request.headers.get(key);if(!value||value.length>4096)return new Response('Missing signature',{status:400});headers[key]=value;}
    const payload=JSON.stringify({action:'paypal_webhook',headers,event});if(payload.length>20000)return new Response('Too large',{status:413});
    try{const r=await fetch(env.TIENDA_API,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:payload,redirect:'follow',signal:AbortSignal.timeout(55000)});const result=await r.json();return new Response(result.ok?'OK':'Not verified',{status:result.ok?200:503});}catch{return new Response('Retry later',{status:503});}
  }
};
