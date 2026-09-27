(function () {
  "use strict";

  /* ---------- Navigation: Hintergrund beim Scrollen, mobiles Menü ---------- */
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav__toggle");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
  });
  document.querySelectorAll(".nav__links a").forEach(a =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );

  /* ---------- Hero: Za'atar-Sprenkel auf dem Manakish ---------- */
  const specks = document.getElementById("specks");
  if (specks) {
    const colors = ["#e9d6a8", "#f3e7c7", "#9b2d20", "#7c8f3c", "#2d3817"];
    let svg = "";
    for (let i = 0; i < 260; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 150;
      const x = 200 + Math.cos(a) * r;
      const y = 200 + Math.sin(a) * r;
      const c = colors[Math.floor(Math.random() * colors.length)];
      const rot = Math.random() * 180;
      svg += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(2 + Math.random() * 2).toFixed(1)}" ry="1.3" fill="${c}" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" opacity=".9"/>`;
    }
    specks.innerHTML = svg;
  }

  /* ---------- Speisekarte ---------- */
  const menuEl = document.getElementById("menu");
  const tabs = document.querySelectorAll(".tab");
  const fmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

  function renderMenu(key) {
    const cat = window.ZATAR_MENU && window.ZATAR_MENU[key];
    if (!cat || !menuEl) return;
    const items = cat.items.map(i => `
      <div class="menu__item">
        <div class="menu__line">
          <span class="menu__name">${i.name}${i.star ? ' <span class="menu__star" title="Empfehlung des Hauses">★</span>' : ""}</span>
          ${i.veg ? '<span class="menu__badge" title="vegetarisch">V</span>' : ""}
          <span class="menu__dots"></span>
          <span class="price">${fmt.format(i.price)}</span>
        </div>
        <p class="menu__desc">${i.desc}</p>
      </div>`).join("");
    menuEl.innerHTML = `
      <div class="menu__head">
        <span lang="ar">${cat.ar}</span>
        <p>${cat.intro}</p>
      </div>
      <div class="menu__list">${items}</div>`;
  }

  tabs.forEach(tab =>
    tab.addEventListener("click", () => {
      tabs.forEach(t => { t.classList.remove("is-active"); t.setAttribute("aria-selected", "false"); });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      renderMenu(tab.dataset.tab);
    })
  );
  renderMenu("manakish");

  /* ---------- Öffnungszeiten: "Jetzt geöffnet" + heutigen Tag markieren ---------- */
  // [öffnet, schließt] in Minuten; Index 0 = Sonntag
  const HOURS = [
    [570, 1200], [570, 1200], [570, 1200], [570, 1200], [570, 1200], [570, 1200], [570, 1200]
  ];
  const now = new Date();
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const [open, close] = HOURS[day];
  const status = document.getElementById("openStatus") || document.createElement("span");
  const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  if (mins >= open && mins < close) {
    status.textContent = `Jetzt geöffnet · bis ${hhmm(close)} Uhr`;
    status.classList.add("is-open");
  } else {
    const opensToday = mins < open;
    status.textContent = `Geschlossen · öffnet ${opensToday ? "heute" : "morgen"} um ${hhmm(opensToday ? open : HOURS[(day + 1) % 7][0])} Uhr`;
    status.classList.add("is-closed");
  }
  const todayRow = document.querySelector(`#hours tr[data-day="${day}"]`);
  if (todayRow) todayRow.classList.add("is-today");

  /* ---------- Karte erst nach Zustimmung laden (DSGVO) ---------- */
  const loadMap = document.getElementById("loadMap");
  if (loadMap) {
    loadMap.addEventListener("click", () => {
      const wrap = document.getElementById("mapConsent").parentElement;
      wrap.innerHTML = '<iframe title="Karte: Zatar, Rheinstraße 46, Darmstadt" loading="lazy" ' +
        'src="https://www.openstreetmap.org/export/embed.html?bbox=8.6370%2C49.8690%2C8.6490%2C49.8740&layer=mapnik&marker=49.8715%2C8.6430"></iframe>';
    });
  }

  /* ---------- Scroll-Effekte ---------- */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = window.gsap && window.ScrollTrigger && !reduceMotion;

  if (hasGsap) {
    initMotion();
  } else {
    // Fallback: einfache Einblendung
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));
  }

  function splitWords(el) {
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = "w";
            const inner = document.createElement("span");
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
    return el.querySelectorAll(".w > span");
  }

  function initMotion() {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add("js-gsap");

    // Weiches Scrollen (nur Desktop, Touch-Geräte scrollen nativ)
    if (window.Lenis) {
      const lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      document.querySelectorAll('a[href^="#"]').forEach(a =>
        a.addEventListener("click", e => {
          const id = a.getAttribute("href");
          const target = id.length > 1 && document.querySelector(id);
          if (!target && id !== "#top") return;
          e.preventDefault();
          lenis.scrollTo(id === "#top" ? 0 : target, { offset: -70, duration: 1.4 });
        })
      );
    }

    // Hero-Animationen warten auf den Ladebildschirm (Startzustand wird sofort gesetzt)
    const heroIntro = [];
    const ready = window.zatarReady || Promise.resolve();
    ready.then(() => heroIntro.forEach(tw => tw.play()));

    // Überschriften: Wörter gleiten von unten herein
    document.querySelectorAll(".split").forEach(el => {
      const words = splitWords(el);
      const inHero = el.closest(".hero");
      const tw = gsap.from(words, {
        yPercent: 110, rotate: 4, duration: inHero ? 1.1 : 0.9, ease: "power4.out",
        stagger: inHero ? 0.07 : 0.04, delay: inHero ? 0.15 : 0,
        paused: !!inHero,
        scrollTrigger: inHero ? null : { trigger: el, start: "top 88%" }
      });
      if (inHero) heroIntro.push(tw);
    });

    // Hero-Text
    heroIntro.push(gsap.from(".hero .lead, .hero__actions, .hero__facts li, .hero .eyebrow", {
      y: 30, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.08, delay: 0.45, paused: true
    }));
    if (document.querySelector(".hero__badge")) heroIntro.push(gsap.from(".hero__badge", {
      scale: 0.6, opacity: 0, rotate: -8, duration: 1, ease: "back.out(1.7)", delay: 0.9, paused: true
    }));
    // Hero-Text verschwindet beim Scrollen leicht nach oben (Parallax)
    if (document.querySelector(".hero")) gsap.to(".hero__text", {
      yPercent: -18, opacity: 0.2, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });

    // Allgemeine Einblendungen (ohne Karten, die eigene Effekte bekommen)
    gsap.utils.toArray(".reveal").forEach(el => {
      if (el.matches(".dish, .spice, .review, .feature, .hero__text, .hero__visual")) return;
      gsap.from(el, {
        y: 60, opacity: 0, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });

    const mm = gsap.matchMedia();

    // Desktop: 3D-Karten klappen beim Scrollen nach vorne
    mm.add("(min-width: 861px)", () => {
      [".feature", ".dish", ".review", ".spice"].forEach(sel => {
        gsap.utils.toArray(sel).forEach((card, i) => {
          gsap.from(card, {
            y: 80, rotateX: -35, rotateY: i % 2 ? 8 : -8, opacity: 0, transformOrigin: "50% 100%",
            transformPerspective: 900, duration: 1.2, ease: "power3.out", delay: (i % 4) * 0.08,
            scrollTrigger: { trigger: card, start: "top 100%" }
          });
        });
      });
    });

    // Handy: ruhige, saubere Einblendung – Karussells gleiten als Ganzes von rechts herein
    mm.add("(max-width: 860px)", () => {
      gsap.utils.toArray(".carousel").forEach(row => {
        gsap.from(row.children, {
          x: 60, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.08,
          scrollTrigger: { trigger: row, start: "top 90%" }
        });
      });
      gsap.utils.toArray(".feature, .spice").forEach(card => {
        gsap.from(card, {
          y: 30, opacity: 0, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: card, start: "top 95%" }
        });
      });
    });

    // Laufband reagiert auf Scroll-Geschwindigkeit
    const track = document.querySelector(".marquee__track");
    if (track) {
      const skew = gsap.quickTo(track, "skewX", { duration: 0.4, ease: "power3" });
      ScrollTrigger.create({
        onUpdate: self => skew(gsap.utils.clamp(-8, 8, self.getVelocity() / -250))
      });
    }

    // Parallax in der Geschichte
    if (document.querySelector(".story")) gsap.fromTo(".story__frame", { y: 80 }, {
      y: -80, ease: "none",
      scrollTrigger: { trigger: ".story", start: "top bottom", end: "bottom top", scrub: true }
    });
    if (document.querySelector(".story")) gsap.fromTo(".story__frame span", { y: 40 }, {
      y: -40, ease: "none",
      scrollTrigger: { trigger: ".story", start: "top bottom", end: "bottom top", scrub: true }
    });

    // Gewürz-Punkte "atmen" beim Scrollen
    gsap.utils.toArray(".spice__dot").forEach((dot, i) => {
      gsap.fromTo(dot, { scale: 0.4, rotate: -90 }, {
        scale: 1, rotate: 0, ease: "none",
        scrollTrigger: { trigger: dot, start: "top 95%", end: "top 55%", scrub: true }
      });
    });

    // Bestell-Kacheln
    if (document.querySelector(".order__buttons")) gsap.from(".order__btn", {
      y: 50, opacity: 0, rotateX: -25, transformPerspective: 900, stagger: 0.12, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".order__buttons", start: "top 90%" }
    });

    // Speisekarte: Einträge beim Tab-Wechsel nacheinander einblenden
    tabs.forEach(tab => tab.addEventListener("click", () => {
      gsap.from("#menu .menu__item", { y: 20, opacity: 0, duration: 0.5, stagger: 0.035, ease: "power2.out" });
    }));

    // 3D-Neigung der Karten bei Mausbewegung (nur Desktop)
    if (window.matchMedia("(pointer: fine)").matches) {
      document.querySelectorAll(".dish, .review, .order__btn, .catering__card").forEach(card => {
        const rx = gsap.quickTo(card, "rotateX", { duration: 0.5, ease: "power3" });
        const ry = gsap.quickTo(card, "rotateY", { duration: 0.5, ease: "power3" });
        gsap.set(card, { transformPerspective: 900 });
        card.addEventListener("pointermove", e => {
          const r = card.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 12);
          rx(((e.clientY - r.top) / r.height - 0.5) * -12);
        });
        card.addEventListener("pointerleave", () => { rx(0); ry(0); });
      });
    }

    // Nach dem Laden von Schriften Positionen neu berechnen
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ---------- Karussell (Handy): Punkte-Anzeige ---------- */
  document.querySelectorAll(".carousel").forEach(row => {
    const items = [...row.children];
    const dots = document.createElement("div");
    dots.className = "carousel-dots";
    dots.setAttribute("aria-hidden", "true");
    items.forEach((item, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.tabIndex = -1;
      b.addEventListener("click", () => row.scrollTo({ left: item.offsetLeft - row.offsetLeft - 16, behavior: "smooth" }));
      dots.appendChild(b);
    });
    row.after(dots);
    const update = () => {
      const center = row.scrollLeft + row.clientWidth / 2;
      let best = 0, bestDist = Infinity;
      items.forEach((item, i) => {
        const c = item.offsetLeft - row.offsetLeft + item.offsetWidth / 2;
        const d = Math.abs(c - center);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      if (row.scrollLeft < 8) best = 0;
      if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 8) best = items.length - 1;
      [...dots.children].forEach((d, i) => d.classList.toggle("is-active", i === best));
    };
    let ticking = false;
    row.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }, { passive: true });
    update();
  });

  /* ---------- Aktionsleiste (Handy): erscheint nach dem Startbereich ---------- */
  const bar = document.querySelector(".action-bar");
  const heroEl = document.querySelector(".hero, .page-hero");
  if (bar && heroEl) {
    const footer = document.querySelector(".footer");
    const story3d = document.querySelector(".story3d");
    let pastHero = false, atFooter = false, inStory = false;
    const sync = () => bar.classList.toggle("is-visible", pastHero && !atFooter && !inStory);
    if (story3d) new IntersectionObserver(([e]) => { inStory = e.isIntersecting && document.documentElement.classList.contains("has-3d"); sync(); }, { threshold: 0.02 }).observe(story3d);
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }, { threshold: 0.15 }).observe(heroEl);
    if (footer) new IntersectionObserver(([e]) => { atFooter = e.isIntersecting; sync(); }).observe(footer);
  }

  document.getElementById("year").textContent = now.getFullYear();
})();
