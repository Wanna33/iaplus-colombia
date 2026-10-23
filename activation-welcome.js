(() => {
  try {
    const params = new URLSearchParams(location.search);
    const welcome = document.getElementById("activationWelcome");
    const videoGuide = document.getElementById("activationVideoGuide");
    if (!welcome) return;
    const text = id => document.getElementById(id);
    const show = () => {
      welcome.hidden = false;
      if (videoGuide) videoGuide.hidden = false;
    };
    if (params.get("codigo") || params.get("code")) show();
    window.IAPActivationWelcome = {
      hideForSuccess() { welcome.hidden = true; },
      showSuccess() {
        const steps = text("activationWelcomeSteps");
        welcome.classList.add("activation-welcome--success");
        text("activationWelcomeKicker").textContent = "ACCESO ACTIVADO · TOQUE DE HALLOWEEN";
        text("activationWelcomeTitle").textContent = "¡Listo! Tu acceso ya está activado 🎃";
        text("activationWelcomeText").textContent = "Gracias por confiar en IA Plus Colombia. Aquí encuentras tus datos, vigencia e instrucciones para empezar.";
        steps.innerHTML = "<li><span>1</span><div><b>Ve a tus accesos</b><small>Tu plan aparece en «Mi cuenta».</small></div></li><li><span>2</span><div><b>Abre el servicio</b><small>Sigue los pasos que aparecen en la tarjeta de tu acceso.</small></div></li><li><span>3</span><div><b>¿Necesitas una mano?</b><small>El equipo de IA Plus te ayuda por WhatsApp.</small></div></li>";
        text("activationWelcomePrimary").innerHTML = "Ver mis accesos <span aria-hidden=\"true\">↓</span>";
        text("activationWelcomePrimary").href = "#app";
        text("activationWelcomeHelp").textContent = "Hablar con soporte";
        text("activationWelcomeNote").textContent = "Gracias por elegir un negocio colombiano. Disfruta tu acceso y consulta aquí la fecha de vigencia.";
        show();
        try { welcome.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"}); } catch {}
      }
    };
  } catch {}
})();
