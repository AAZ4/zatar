/*
 * Speisekarten-Seite: rendert alle Kategorien aus js/menu.js,
 * klebende Kategorie-Chips mit Scroll-Spy, Suche und Vegetarisch-Filter.
 */
(function () {
  "use strict";

  const data = window.ZATAR_MENU || {};
  const page = document.getElementById("menuPage");
  const chipList = document.getElementById("chipList");
  const search = document.getElementById("menuSearch");
  const vegToggle = document.getElementById("vegToggle");
  const empty = document.getElementById("menuEmpty");
  const chipsBar = document.getElementById("chips");
  const count = document.getElementById("menuCount");
  if (!page) return;

  const fmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  /* ---------- Rendern ---------- */
  const keys = Object.keys(data);
  page.innerHTML = keys.map(key => {
    const cat = data[key];
    const from = Math.min(...cat.items.map(i => i.price));
    return `
      <section class="menu-cat" id="${key}" data-cat="${key}">
        <header class="menu-cat__head">
          <span class="menu-cat__ar" lang="ar">${cat.ar}</span>
          <div>
            <h2>${esc(cat.title)}</h2>
            <p>${esc(cat.intro)} <span class="menu-cat__from">ab ${fmt.format(from)}</span></p>
          </div>
        </header>
        <div class="menu-cat__list">
          ${cat.items.map(i => `
            <article class="dish-row${i.star ? " is-star" : ""}" data-veg="${i.veg ? 1 : 0}" data-search="${esc(norm(i.name + " " + i.desc))}">
              <div class="dish-row__main">
                <h3>${esc(i.name)}
                  ${i.star ? '<span class="menu__star" title="Empfehlung des Hauses">★</span>' : ""}
                  ${i.veg ? '<span class="menu__badge" title="vegetarisch">V</span>' : ""}
                </h3>
                <p>${esc(i.desc)}</p>
              </div>
              <span class="dish-row__price">${fmt.format(i.price)}</span>
            </article>`).join("")}
        </div>
      </section>`;
  }).join("");

  chipList.innerHTML = keys.map(key =>
    `<a class="chip" href="#${key}" data-chip="${key}">${esc(data[key].title)}</a>`).join("");
  const chips = [...chipList.querySelectorAll(".chip")];
  const sections = [...page.querySelectorAll(".menu-cat")];

  /* ---------- Chips: sanft zur Kategorie scrollen ---------- */
  const offset = () => (document.querySelector(".nav")?.offsetHeight || 0) + (chipsBar?.offsetHeight || 0) + 8;
  const scrollToSection = (sec, smooth = true) =>
    window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - offset(), behavior: smooth ? "smooth" : "auto" });

  chips.forEach(chip => chip.addEventListener("click", e => {
    e.preventDefault();
    const sec = document.getElementById(chip.dataset.chip);
    if (sec) {
      scrollToSection(sec);
      history.replaceState(null, "", "#" + chip.dataset.chip);
    }
  }));

  /* ---------- Scroll-Spy: aktive Kategorie markieren ---------- */
  function setActive(key) {
    chips.forEach(c => {
      const on = c.dataset.chip === key;
      c.classList.toggle("is-active", on);
      if (on) c.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    });
  }
  let lastActive = "";
  function spy() {
    const line = offset() + 20;
    let current = sections.find(s => !s.hidden)?.id || "";
    sections.forEach(s => { if (!s.hidden && s.getBoundingClientRect().top <= line) current = s.id; });
    if (current !== lastActive) { lastActive = current; setActive(current); }
    chipsBar?.classList.toggle("is-stuck", chipsBar.getBoundingClientRect().top <= (document.querySelector(".nav")?.offsetHeight || 0) + 1);
  }
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { spy(); ticking = false; });
  }, { passive: true });

  /* ---------- Suche & Vegetarisch-Filter ---------- */
  let vegOnly = false;
  function filter() {
    const q = norm(search.value.trim());
    let total = 0;
    sections.forEach(sec => {
      let visible = 0;
      sec.querySelectorAll(".dish-row").forEach(row => {
        const show = (!q || row.dataset.search.includes(q)) && (!vegOnly || row.dataset.veg === "1");
        row.hidden = !show;
        if (show) visible++;
      });
      sec.hidden = visible === 0;
      chips.find(c => c.dataset.chip === sec.id)?.classList.toggle("is-empty", visible === 0);
      total += visible;
    });
    empty.hidden = total > 0;
    if (count) {
      const active = q || vegOnly;
      count.hidden = !active || total === 0;
      count.textContent = vegOnly && !q
        ? `🌿 ${total} vegetarische Gerichte`
        : `${total} ${total === 1 ? "Treffer" : "Treffer"}${vegOnly ? " (nur vegetarisch)" : ""}`;
    }
    lastActive = "";
    spy();
  }
  search.addEventListener("input", filter);
  vegToggle.addEventListener("click", () => {
    vegOnly = !vegOnly;
    vegToggle.setAttribute("aria-pressed", String(vegOnly));
    vegToggle.classList.toggle("is-active", vegOnly);
    filter();
    // zum Anfang der Speisekarte springen, damit man das Ergebnis sieht
    const first = sections.find(s => !s.hidden);
    if (first && window.scrollY > first.offsetTop) scrollToSection(first);
  });

  // Direktlink auf eine Kategorie (z. B. speisekarte.html#fatayer)
  window.addEventListener("load", () => {
    const sec = location.hash && document.getElementById(location.hash.slice(1));
    if (sec && sec.classList.contains("menu-cat")) scrollToSection(sec, false);
    spy();
  });
  spy();
})();
