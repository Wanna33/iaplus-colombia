(() => {
  try {
    const params = new URLSearchParams(location.search);
    if (!(params.get("codigo") || params.get("code"))) return;
    const welcome = document.getElementById("activationWelcome");
    if (welcome) welcome.hidden = false;
  } catch {}
})();
