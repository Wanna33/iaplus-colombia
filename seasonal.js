(() => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const date = `${parts.find(x => x.type === "year").value}-${parts.find(x => x.type === "month").value}-${parts.find(x => x.type === "day").value}`;
  if (date >= "2026-10-22" && date < "2026-11-01") {
    document.documentElement.classList.add("halloween-theme");
    const banner = document.getElementById("seasonalBanner");
    if (banner) banner.hidden = false;
  }
})();
