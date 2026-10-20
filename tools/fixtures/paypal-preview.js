// Isolated UI fixture, served only at the local preview's exact /__qa route.
const CONFIG={API_URL:'fixture-only',WHATSAPP:'573102035327'};
let user={email:'demo@example.test'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const postJson=async()=>({ok:true,ready:true,env:'live',currency:'USD',prices:{chatgpt:'3.17',chatgpt3:'6.34',chatgpt6:'15.85'}});
const apiRaw=async body=>{if(body.action==='paypal_quote')return {ok:true,quote:'PPQ-DEMO',name:'ChatGPT 3 meses',days:90,total:'6.34',currency:'USD',env:'live',expires:Date.now()+900000};throw Error('Prueba visual: no se crean pedidos ni se realizan cobros.');};
function save(){throw Error('No persistent data in fixture.');}
function toast(message){document.getElementById('demoMessage').textContent=message;}
function openLogin(){toast('Acceso de demostración.');}
function renderGrid(){document.querySelector('[data-paypal]').disabled=false;}
