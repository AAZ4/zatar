/*
 * Speisekarten-Seite: rendert alle Kategorien aus js/menu.js,
 * klebende Kategorie-Chips mit Scroll-Spy, Suche und Vegetarisch-/Vegan-Filter.
 * Zweisprachig: auf der arabischen Seite (<html lang="ar">) stehen die arabischen Namen vorne.
 */
(function () {
  "use strict";

  const data = window.ZATAR_MENU || {};
  const page = document.getElementById("menuPage");
  const chipList = document.getElementById("chipList");
  const search = document.getElementById("menuSearch");
  const dietButtons = [...document.querySelectorAll("[data-diet]")];
  const empty = document.getElementById("menuEmpty");
  const chipsBar = document.getElementById("chips");
  const count = document.getElementById("menuCount");
  if (!page) return;
  const isAr = document.documentElement.lang === "ar";
  const T = isAr ? {
    from: "من", star: "بننصح فيها", vegan: "🌱 فيغان", veganTitle: "خالٍ من أي منتج حيواني",
    veganWish: "🌱 فيغان حسب الطلب", veganWishTitle: "منعملها فيغان إذا طلبت", veg: "نباتي", vegTitle: "بدون لحم"
  } : {
    from: "ab", star: "Empfehlung des Hauses", vegan: "🌱 Vegan", veganTitle: "vegan",
    veganWish: "🌱 Vegan auf Wunsch", veganWishTitle: "Auf Wunsch vegan zubereitbar", veg: "V", vegTitle: "vegetarisch"
  };

  const fmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // Nur die "strengste" Kennzeichnung zeigen: vegan > vegetarisch
  function dietBadge(i) {
    if (i.vegan === "wunsch") return `<span class="menu__badge menu__badge--vegan" title="${T.veganWishTitle}">${T.veganWish}</span>`;
    if (i.vegan) return `<span class="menu__badge menu__badge--vegan" title="${T.veganTitle}">${T.vegan}</span>`;
    if (i.veg) return `<span class="menu__badge" title="${T.vegTitle}">${T.veg}</span>`;
    return "";
  }

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
            <h2>${esc(isAr ? cat.titleAr || cat.ar : cat.title)}</h2>
            <p>${esc(isAr ? cat.introAr || "" : cat.intro)} <span class="menu-cat__from">${T.from} <bdi dir="ltr">${fmt.format(from)}</bdi></span></p>
          </div>
        </header>
        <div class="menu-cat__list">
          ${cat.items.map(i => `
            <article class="dish-row${i.star ? " is-star" : ""}" data-veg="${i.veg ? 1 : 0}" data-vegan="${i.vegan ? 1 : 0}" data-food="${cat.noBadge ? 0 : 1}" data-search="${esc(norm(i.name + " " + i.desc + " " + (i.ar || "")))}">
              <div class="dish-row__main">
                <h3>${esc(isAr ? i.ar || i.name : i.name)}
                  ${i.star ? `<span class="menu__star" title="${T.star}">★</span>` : ""}
                  ${cat.noBadge ? "" : dietBadge(i)}
                </h3>
                ${isAr
                  ? `<p class="dish-row__de" lang="de" dir="ltr">${esc(i.name)}</p>`
                  : (i.desc ? `<p>${esc(i.desc)}</p>` : "")}
              </div>
              <div class="dish-row__side">
                <span class="dish-row__price">${fmt.format(i.price)}</span>
                ${!isAr && i.ar ? `<span class="dish-row__ar" lang="ar">${esc(i.ar)}</span>` : ""}
              </div>
            </article>`).join("")}
        </div>
      </section>`;
  }).join("");

  chipList.innerHTML = keys.map(key =>
    `<a class="chip" href="#${key}" data-chip="${key}">${esc(isAr ? data[key].titleAr || data[key].ar : data[key].title)}</a>`).join("");
  const chips = [...chipList.querySelectorAll(".chip")];
  const sections = [...page.querySelectorAll(".menu-cat")];

  /* ---------- Kategorie-Leiste direkt unter der Navigation andocken ---------- */
  const navEl = document.querySelector(".nav");
  const dock = () => { if (chipsBar && navEl) chipsBar.style.top = navEl.offsetHeight + "px"; };
  dock();
  window.addEventListener("resize", dock);
  if ("ResizeObserver" in window && navEl) new ResizeObserver(dock).observe(navEl);

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
      // Nur die Chip-Leiste seitlich verschieben – NICHT die Seite (scrollIntoView würde die Seite mitbewegen)
      if (on) chipList.scrollTo({ left: c.offsetLeft - chipList.offsetLeft - (chipList.clientWidth - c.offsetWidth) / 2, behavior: "smooth" });
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

  /* ---------- Suche & Filter vegetarisch / vegan ---------- */
  let diet = "";   // "", "veg" (vegetarisch inkl. vegan) oder "vegan"
  function filter() {
    const q = norm(search.value.trim());
    let total = 0;
    sections.forEach(sec => {
      let visible = 0;
      sec.querySelectorAll(".dish-row").forEach(row => {
        // Ernährungsfilter gelten nur für Speisen (Getränke werden dann ausgeblendet)
        const dietOk = !diet || (row.dataset.food === "1" && (diet === "veg" ? row.dataset.veg === "1" : row.dataset.vegan === "1"));
        const show = (!q || row.dataset.search.includes(q)) && dietOk;
        row.hidden = !show;
        if (show) visible++;
      });
      sec.hidden = visible === 0;
      chips.find(c => c.dataset.chip === sec.id)?.classList.toggle("is-empty", visible === 0);
      total += visible;
    });
    empty.hidden = total > 0;
    if (count) {
      const active = q || diet;
      count.hidden = !active || total === 0;
      if (isAr) {
        const label = diet === "vegan" ? "فيغان" : "نباتية";
        count.textContent = diet && !q
          ? `${diet === "vegan" ? "🌱" : "🌿"} ${total} ${diet === "vegan" ? "أكلة فيغان" : "أكلة نباتية"}${diet === "veg" ? " (مع الفيغان)" : ""}`
          : `${total} نتيجة${diet ? ` (${label} فقط)` : ""}`;
      } else {
        const label = diet === "vegan" ? "vegan" : "vegetarisch";
        count.textContent = diet && !q
          ? `${diet === "vegan" ? "🌱" : "🌿"} ${total} ${label}e Gerichte${diet === "veg" ? " (inkl. vegan)" : ""}`
          : `${total} Treffer${diet ? ` (nur ${label})` : ""}`;
      }
    }
    lastActive = "";
    spy();
  }
  search.addEventListener("input", filter);
  dietButtons.forEach(btn => btn.addEventListener("click", () => {
    diet = diet === btn.dataset.diet ? "" : btn.dataset.diet;   // erneutes Tippen schaltet aus
    dietButtons.forEach(b => {
      const on = b.dataset.diet === diet;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    filter();
    // zum Anfang der Speisekarte springen, damit man das Ergebnis sieht
    const first = sections.find(s => !s.hidden);
    if (first && window.scrollY > first.offsetTop) scrollToSection(first);
  }));

  // Direktlink auf eine Kategorie (z. B. speisekarte.html#fatayer)
  window.addEventListener("load", () => {
    const sec = location.hash && document.getElementById(location.hash.slice(1));
    if (sec && sec.classList.contains("menu-cat")) scrollToSection(sec, false);
    spy();
  });
  spy();
})();
