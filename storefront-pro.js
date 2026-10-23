/* Customer entry point: validate locally, then continue through the real account flow. */
(function(){
  const form=document.getElementById('activationForm');if(!form)return;
  const input=document.getElementById('activationCode'),error=document.getElementById('activationError');
  form.addEventListener('submit',e=>{
    e.preventDefault();const result=IAPActivation.parse(input.value);
    error.hidden=!result.error;input.setAttribute('aria-invalid',String(!!result.error));
    if(result.error){error.textContent=result.error;input.focus();return;}
    input.value=result.code;
    try{sessionStorage.setItem('iap_activation_draft',result.code);}catch{}
    location.href='cuenta.html?codigo='+encodeURIComponent(result.code);
  });
  input.addEventListener('input',()=>{error.hidden=true;input.removeAttribute('aria-invalid');});
})();
