/* Ingreso con código por correo: para quien no usa Gmail (Hotmail, Outlook, Yahoo, iCloud…).
   Uso: iapEmailLogin(elemento, (user, cred) => { … })
   Guarda la sesión igual que el ingreso con Google (iap_cred / iap_user), así el resto de la página no cambia. */
(function(){
  function css(){
    if(document.getElementById("ielCss")) return;
    const s = document.createElement("style"); s.id = "ielCss";
    s.textContent = `.iel{margin-top:14px;text-align:left}.iel [hidden]{display:none!important}
      .iel-or{display:flex;align-items:center;gap:10px;color:#94a3b8;font-size:12.5px;font-weight:600;margin:4px 0 12px}
      .iel-or::before,.iel-or::after{content:"";flex:1;height:1px;background:#e8edf3}
      .iel form{display:flex;flex-direction:column;gap:8px}
      .iel input{width:100%;padding:12px 14px;border:1.5px solid #dde4ed;border-radius:12px;font:inherit;font-size:16px;color:#0f172a;background:#fff;transition:border-color .2s,box-shadow .2s}
      .iel input:focus{outline:none;border-color:#ef5350;box-shadow:0 0 0 4px rgba(239,83,80,.12)}
      .iel input.code{letter-spacing:.5em;text-align:center;font-weight:800;font-size:22px}
      .iel button{min-height:46px;border-radius:12px;border:1.5px solid #dde4ed;background:#fff;color:#0f172a;font:inherit;font-weight:700;font-size:15px;cursor:pointer;transition:border-color .2s,color .2s,transform .15s}
      .iel button:hover{border-color:#ef5350;color:#ef5350}
      .iel button:active{transform:scale(.97)}
      .iel button.go{background:#ef5350;border-color:#ef5350;color:#fff}
      .iel button.go:hover{background:#e0403d;color:#fff}
      .iel button:disabled{opacity:.6;cursor:wait}
      .iel .lnk{background:none;border:0;min-height:0;padding:4px;color:#64748b;font-size:13px;font-weight:600;text-decoration:underline}
      .iel p{font-size:13.5px;color:#64748b;margin:0}
      .iel p b{color:#0f172a;overflow-wrap:anywhere}
      .iel .err{color:#c9302d;background:#fff3f2;border:1px solid #ffe1df;border-radius:10px;padding:8px 10px;font-weight:600}`;
    document.head.appendChild(s);
  }
  const save = (k,v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} };
  const okMail = m => /^[^@\s]{1,64}@[^@\s]+\.[a-z]{2,}$/i.test(m);

  window.iapEmailLogin = function(box, onDone){
    if(!box) return;
    css();
    box.innerHTML = `<div class="iel">
      <div class="iel-or">o ingresa con tu correo</div>
      <form class="f1" novalidate><input type="email" class="mail" placeholder="tucorreo@hotmail.com" autocomplete="email" inputmode="email" aria-label="Tu correo" maxlength="120" required>
        <button class="go" type="submit">Enviarme un código</button></form>
      <form class="f2" hidden novalidate><p>Te enviamos un código de 6 números a:<br><b class="to"></b><br>Revisa también la carpeta de spam.</p>
        <input class="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" aria-label="Código de 6 números" required>
        <button class="go" type="submit">Ingresar</button>
        <button class="lnk back" type="button">Cambiar correo o pedir otro código</button></form>
      <p class="err" hidden></p></div>`;
    const f1 = box.querySelector(".f1"), f2 = box.querySelector(".f2"), err = box.querySelector(".err");
    const mail = box.querySelector(".mail"), code = box.querySelector(".code");
    const showErr = m => { err.textContent = m; err.hidden = !m; };
    const busy = (btn, on, txt) => { btn.disabled = on; if(txt) btn.textContent = txt; };
    let email = "";

    f1.onsubmit = async e => {
      e.preventDefault(); showErr("");
      email = mail.value.trim().toLowerCase();
      if(!okMail(email)){ showErr("Escribe un correo válido."); mail.focus(); return; }
      const b = f1.querySelector("button"); busy(b, true, "Enviando…");
      try{
        const j = await postJson(window.IAP_API, {action:"otp_send", email});
        if(!j.ok) throw new Error(j.error || "No pudimos enviar el código.");
        box.querySelector(".to").textContent = email;
        f1.hidden = true; f2.hidden = false; code.value = ""; code.focus();
      }catch(ex){ showErr(ex.message); }
      busy(b, false, "Enviarme un código");
    };
    code.addEventListener("input", () => { code.value = code.value.replace(/\D/g, "").slice(0, 6); if(code.value.length === 6) f2.requestSubmit ? f2.requestSubmit() : f2.onsubmit(new Event("submit")); });
    f2.onsubmit = async e => {
      e.preventDefault(); showErr("");
      if(code.value.length !== 6){ showErr("El código tiene 6 números."); return; }
      const b = f2.querySelector("button.go"); if(b.disabled) return; busy(b, true, "Verificando…");
      try{
        const j = await postJson(window.IAP_API, {action:"otp_verify", email, otp: code.value});
        if(!j.ok) throw new Error(j.error || "Código incorrecto.");
        const cred = {token: j.token, exp: j.exp, metodo: "correo"};
        const user = {email: j.email, name: j.email.split("@")[0], picture: ""};
        save("iap_cred", cred); save("iap_user", user);
        onDone && onDone(user, cred);
      }catch(ex){ showErr(ex.message); code.select(); busy(b, false, "Ingresar"); }
    };
    box.querySelector(".back").onclick = () => { f2.hidden = true; f1.hidden = false; showErr(""); mail.focus(); };
  };
})();
