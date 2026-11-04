// Explicit visual campaign. It never reads accounts or changes activation/payment state.
(() => {
  document.documentElement.classList.remove('halloween-theme');
  document.documentElement.classList.add('christmas-theme');
  const banner=document.getElementById('seasonalBanner');
  if(banner)banner.hidden=false;
})();
