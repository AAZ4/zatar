/*
 * Seite "Manakish & Fatayer": Empfehlungen für Einsteiger direkt aus js/menu.js
 * (so stimmen Namen und Preise immer mit der Speisekarte überein)
 */
(function () {
  "use strict";

  const menu = window.ZATAR_MENU || {};
  const fmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
  const PICKS = {
    manakish: ["Zatar", "Zatar Muhammara Käse", "Akkawi Käse", "Lahmajin (Antap)"],
    fatayer: ["Spinat mit Käse", "Labne mit Zatar", "Akkawi mit Tomaten", "Sucuk"]
  };

  document.querySelectorAll("[data-picks]").forEach(box => {
    const key = box.dataset.picks;
    const cat = menu[key];
    if (!cat) return;
    const items = PICKS[key].map(n => cat.items.find(i => i.name === n)).filter(Boolean);
    if (!items.length) return;
    box.innerHTML = `
      <h3 class="mf-sub">Unsere Empfehlung für den Einstieg</h3>
      <div class="mf-picks__grid">
        ${items.map(i => `
          <a class="mf-pick" href="speisekarte.html#${key}">
            <span class="mf-pick__ar" lang="ar">${i.ar || ""}</span>
            <strong>${cat.title === "Fatayer" ? "Fatayer " : ""}${i.name}</strong>
            <small>${i.desc}</small>
            <span class="mf-pick__price">${fmt.format(i.price)}</span>
          </a>`).join("")}
      </div>
      <a class="mf-picks__all" href="speisekarte.html#${key}">Alle ${cat.items.length} ${cat.title} ansehen →</a>`;
  });
})();
