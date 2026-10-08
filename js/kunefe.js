/*
 * Künefe-Seite: Scroll-Erzählung mit echten (generierten) Bildern
 *
 *  0  Künefe auf dem Gasherd (Foto), Text daneben
 *  1–6 die ausgeschnittenen Schichten fahren auseinander: Blech, Teigboden, Käse,
 *      Teigdecke, Sirup, Pistazien – die aktive Schicht bleibt hell, eine Linie führt zur Karte
 *  7  Schichten setzen sich wieder zusammen – "Ein Stück, bitte!"
 *
 * html.kn-3d (schon im <head> gesetzt) = Scroll-Bühne aktiv, html.kn-ready = Bilder geladen.
 * Ohne JavaScript bleiben die Karten eine normale Liste.
 */
(function () {
  const root = document.documentElement;
  const section = document.querySelector(".kn");
  const stage = document.querySelector(".kn__stage");
  if (!section || !stage) return;

  const cards = [...document.querySelectorAll(".kn__card")];
  const intro = document.querySelector(".kn__intro");
  const bars = [...document.querySelectorAll(".kn__progress span")];
  const lineSvg = document.querySelector(".kn__line");
  const linePath = lineSvg && lineSvg.querySelector("path");
  const lineDot = lineSvg && lineSvg.querySelector("circle");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mqSmall = window.matchMedia("(max-width: 860px)");
  const isRtl = root.dir === "rtl";
  const imgBase = new URL("../images/kunefe/", document.currentScript.src).href;

  root.classList.add("kn-3d");

  /* Lage der Schichten im Originalbild (1200 × 896), aus images/kunefe/layers.json */
  const W = 1200, H = 896;
  const LAYERS = [
    // key, Datei, x, y, w, Verschiebung nach unten im zusammengesetzten Zustand
    ["base", "blech", 51, 588, 1149, 0],
    ["dough", "teigboden", 183, 586, 834, 0],
    ["cheese", "kaese", 203, 482, 793, 95],
    ["top", "teigdecke", 191, 351, 820, 195],
    ["syrup", "sirup", 198, 235, 803, 312],
    ["pist", "pistazien", 202, 127, 793, 410]
  ];
  const STEP_KEY = { 1: "base", 2: "dough", 3: "cheese", 4: "top", 5: "syrup", 6: "pist" };
  const STEP_AT = [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.86];

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  /* ---------- Bühne aufbauen ---------- */
  const hero = document.createElement("div");
  hero.className = "kn__hero";
  hero.innerHTML =
    `<img src="${imgBase}herd.webp" srcset="${imgBase}herd-900.webp 900w, ${imgBase}herd.webp 1376w" ` +
    `sizes="(max-width: 860px) 150vw, 66vw" width="1376" height="768" alt="" decoding="async" fetchpriority="high">` +
    `<span class="kn__fire"></span>`;
  const stack = document.createElement("div");
  stack.className = "kn__stack";
  const layerEls = {};
  for (const [key, file, x, y, w] of LAYERS) {
    const img = document.createElement("img");
    img.className = `kn__layer kn__layer--${key}`;
    img.src = imgBase + file + ".webp";
    img.alt = "";
    img.decoding = "async";
    img.style.left = (x / W) * 100 + "%";
    img.style.top = (y / H) * 100 + "%";
    img.style.width = (w / W) * 100 + "%";
    stack.appendChild(img);
    layerEls[key] = img;
  }
  stage.append(hero, stack);

  // erst zeigen, wenn alle Bilder da sind (sonst bauen sich die Schichten einzeln auf)
  const imgs = [...stage.querySelectorAll("img")];
  let ready = false;
  const showStage = () => { if (ready) return; ready = true; root.classList.add("kn-ready"); update(); };
  Promise.all(imgs.map(i => (i.decode ? i.decode() : Promise.resolve()).catch(() => {}))).then(showStage);
  setTimeout(showStage, 12000);

  /* ---------- Linie zur Karte (nur Desktop) ---------- */
  function drawLine(step) {
    if (!lineSvg) return;
    const key = STEP_KEY[step];
    const card = cards[step];
    if (!key || !card || mqSmall.matches) { lineSvg.classList.remove("is-on"); return; }
    const sr = stage.getBoundingClientRect();
    const lr = layerEls[key === "base" ? "base" : key].getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    // Punkt am Rand der Schicht; beim Blech auf Höhe des Randes
    const fy = key === "base" ? 0.42 : 0.5;
    const inset = key === "base" ? 0.035 : 0.01;
    const ax = (isRtl ? lr.left + lr.width * inset : lr.right - lr.width * inset) - sr.left;
    const ay = lr.top + lr.height * fy - sr.top;
    const bx = (isRtl ? cr.right : cr.left) - sr.left;
    const by = cr.top - sr.top + 34;
    const mx = (ax + bx) / 2;
    linePath.setAttribute("d", `M${ax},${ay} L${mx},${ay} L${mx},${by} L${bx},${by}`);
    lineDot.setAttribute("cx", ax); lineDot.setAttribute("cy", ay);
    lineSvg.setAttribute("viewBox", `0 0 ${sr.width} ${sr.height}`);
    lineSvg.classList.add("is-on");
  }

  /* ---------- Scroll ---------- */
  let activeStep = -1;
  function setStep(step) {
    if (step === activeStep) return;
    activeStep = step;
    cards.forEach((c, i) => c.classList.toggle("is-active", i === step));
    bars.forEach((b, i) => b.classList.toggle("is-done", i <= step));
    if (intro) intro.classList.toggle("is-hidden", step > 0);
  }

  function update(t = 0) {
    const sr = section.getBoundingClientRect();
    const total = Math.max(1, sr.height - window.innerHeight);
    const p = clamp(-sr.top / total);

    let step = 0;
    for (let i = 0; i < STEP_AT.length; i++) if (p >= STEP_AT[i]) step = i;
    setStep(step);

    const heroOut = smooth(0.02, 0.07, p);
    const explode = smooth(0.08, 0.16, p) * (1 - smooth(0.8, 0.88, p));
    const fin = smooth(0.86, 0.95, p);

    hero.style.opacity = 1 - heroOut;
    hero.style.transform = `translateY(${-heroOut * 6}%) scale(${1 + heroOut * 0.08})`;
    stack.style.opacity = smooth(0.065, 0.11, p);
    stack.style.setProperty("--fin", fin);
    stack.style.setProperty("--st", 1 - explode);   // zusammengesetzt: Künefe sitzt unten im Bild -> anheben

    // Schichten: zusammen -> auseinander -> zusammen; leichtes Schweben im offenen Zustand
    const scale = stack.clientHeight / H;
    for (const [key, , , , , shift] of LAYERS) {
      const bob = reduceMotion ? 0 : Math.sin(t / 900 + shift * 0.02) * 3 * explode * (shift ? 1 : 0);
      layerEls[key].style.transform = `translateY(${(shift * (1 - explode)) * scale + bob}px)`;
    }

    const hl = explode > 0.5 ? STEP_KEY[step] : null;
    if (hl) stack.dataset.hl = hl; else delete stack.dataset.hl;
    if (hl) drawLine(step); else if (lineSvg) lineSvg.classList.remove("is-on");
  }

  // nur animieren, solange die Bühne sichtbar ist
  let visible = false, running = false;
  function loop() {
    if (running) return;
    running = true;
    const tick = (t) => {
      if (!visible || document.hidden) { running = false; return; }
      update(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    document.body.classList.toggle("kn-in-scene", e.isIntersecting && e.intersectionRatio > 0.2);
    if (visible) loop();
  }, { threshold: [0, 0.2, 0.5] }).observe(section);
  document.addEventListener("visibilitychange", loop);
  window.addEventListener("resize", () => update());
  update();
})();
