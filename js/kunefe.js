/*
 * Künefe-Seite: Video-Erzählung beim Scrollen (Einzelbilder aus dem Kling-Video auf <canvas>)
 *
 *  Start   Künefe auf dem Gasherd – Flammen und Dampf laufen in einer Schleife
 *  Scroll  das Video läuft Bild für Bild weiter: die Schichten heben sich ab (ohne Schnitt)
 *  1–6     Lichtkegel auf Blech, Teigboden, Käse, Teigdecke, Sirup, Pistazien + Erklärkarte
 *  7       das Video läuft rückwärts, die Künefe setzt sich wieder zusammen und brennt weiter
 *
 * Bilder: images/kunefe/d/000–144.webp (Desktop), images/kunefe/m/… (Handy).
 * Scroll-Video: Einzelbilder 000–144. Schleifen am Anfang und nach der Aufteilung: schleife-start.mp4 / schleife-aufteilung.mp4.
 * html.kn-3d (schon im <head>) = Scroll-Bühne aktiv, html.kn-ready = erstes Bild geladen.
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

  const FR = 145, LAST = FR - 1;
  const ASPECT = 1924 / 1076;
  // Lage der Schichten im letzten Bild (Anteile von Breite/Höhe): Mitte y, halbe Breite, halbe Höhe
  const SPOT = {
    1: { cy: 0.63, rx: 0.42, ry: 0.1 },    // Kupferblech
    2: { cy: 0.563, rx: 0.33, ry: 0.05 },  // Teigboden
    3: { cy: 0.5, rx: 0.33, ry: 0.055 },   // Käse
    4: { cy: 0.402, rx: 0.33, ry: 0.065 }, // Teigdecke
    5: { cy: 0.308, rx: 0.335, ry: 0.05 }, // Sirup
    6: { cy: 0.221, rx: 0.32, ry: 0.045 }  // Pistazien
  };
  const STEP_AT = [0, 0.3, 0.38, 0.46, 0.54, 0.62, 0.7, 0.8];

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Bilder stufenweise laden ---------- */
  const set = mqSmall.matches ? "m" : "d";
  const frames = new Array(FR);
  const order = [0, LAST];
  for (const step of [8, 4, 2, 1])                                   // grob -> fein über das ganze Video
    for (let i = 1; i < LAST; i += step) if (!order.includes(i)) order.push(i);
  let next = 0, ready = false;
  function loadNext() {
    if (next >= order.length) return;
    const i = order[next++];
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      frames[i] = img;
      if (i === 0) showStage();
      loadNext();
    };
    img.onerror = loadNext;
    img.src = `${imgBase}${set}/${String(i).padStart(3, "0")}.webp`;
  }
  function showStage() {
    if (ready) return;
    ready = true;
    resize();
    root.classList.add("kn-ready");
  }
  for (let k = 0; k < 6; k++) loadNext();
  setTimeout(showStage, 12000);

  function nearest(i) {
    if (frames[i]) return frames[i];
    for (let d = 1; d < FR; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  /* ---------- Canvas ---------- */
  const canvas = document.createElement("canvas");
  canvas.className = "kn__canvas";
  canvas.setAttribute("aria-hidden", "true");
  stage.prepend(canvas);
  const ctx = canvas.getContext("2d");
  let W = 1, H = 1, dpr = 1;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  resize();
  window.addEventListener("resize", () => { resize(); update(performance.now()); });

  // Wo das Video liegt: Desktop erst rechts neben dem Titel, dann links neben den Karten; Handy oben
  function box() {
    if (mqSmall.matches) {
      const bw = W * 1.55, bh = bw / ASPECT;
      return { x: (W - bw) / 2, y: Math.max(64, H * 0.42 - bh / 2 - 40), w: bw, h: bh };
    }
    const k = smooth(0.03, 0.22, p);                  // 0 = neben dem Titel, 1 = neben den Karten
    const bw = Math.min(W * lerp(0.62, 0.6, k), (H - 110) * ASPECT), bh = bw / ASPECT;
    let cx = lerp(0.67, 0.36, k);
    if (isRtl) cx = 1 - cx;
    return { x: W * cx - bw / 2, y: H * 0.53 - bh / 2, w: bw, h: bh };
  }

  /* ---------- Ablauf ---------- */
  let activeStep = -1, p = 0;
  const spot = { cy: 0.5, rx: 0.4, ry: 0.1, a: 0 };

  function setStep(step) {
    if (step === activeStep) return;
    activeStep = step;
    cards.forEach((c, i) => c.classList.toggle("is-active", i === step));
    bars.forEach((b, i) => b.classList.toggle("is-done", i <= step));
  }

  /* ---------- Schleifen (echte Videos mit eingebauter Überblendung, laufen von selbst) ----------
     schleife-start: ganze Künefe auf dem Herd, nur Flammen und Dampf bewegen sich (= Bild 000)
     schleife-aufteilung: aufgeteilte Künefe, nur die Flammen bewegen sich (= Bild 144)
     Beide passen pixelgenau auf das erste bzw. letzte Bild des Scroll-Videos. */
  function makeLoop(name) {
    const v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto";
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    v.src = `${imgBase}${set}/${name}.mp4`;
    v.addEventListener("playing", () => { if (!v.startedAt) v.startedAt = performance.now(); });
    return v;
  }
  const loopStart = makeLoop("schleife-start");
  const loopSplit = makeLoop("schleife-aufteilung");
  // Bei der Aufteilung kommen nur Flammen/Herd aus dem Video – die Schichten bleiben Standbild
  // (im Clip drehen sie sich leicht). Maske: weiß = Video, schwarz = Standbild, weiche Kante.
  const splitMask = new Image();
  splitMask.src = `${imgBase}maske-aufteilung.png`;
  const ofs = document.createElement("canvas");
  const octx = ofs.getContext("2d");
  function maskedSplit() {
    const vw = loopSplit.videoWidth, vh = loopSplit.videoHeight;
    if (!vw || !splitMask.complete || !splitMask.naturalWidth) return null;
    if (ofs.width !== vw) { ofs.width = vw; ofs.height = vh; }
    octx.globalCompositeOperation = "source-over";
    octx.clearRect(0, 0, vw, vh);
    octx.drawImage(loopSplit, 0, 0, vw, vh);
    octx.globalCompositeOperation = "destination-in";
    octx.drawImage(splitMask, 0, 0, vw, vh);
    return ofs;
  }
  const playing = (v) => v.readyState >= 2 && !v.paused;
  function setPlaying(v, on) {
    if (reduceMotion) on = false;
    if (on && v.paused) v.play().catch(() => {});
    else if (!on && !v.paused) v.pause();
  }

  // Welches Bild des Scroll-Videos, und wie stark die Schleifen darüberliegen
  function frameIndex() {
    if (p < 0.28) return Math.round(lerp(0, LAST, smooth(0.025, 0.28, p)));
    if (p < 0.8) return LAST;
    return Math.round(lerp(LAST, 0, smooth(0.8, 0.93, p)));
  }
  function loopWeights() {
    return {
      start: Math.max(1 - smooth(0.012, 0.035, p), smooth(0.925, 0.95, p)),
      split: smooth(0.27, 0.29, p) * (1 - smooth(0.8, 0.815, p))
    };
  }

  function draw(now) {
    const b = box();
    const img = nearest(frameIndex());
    const lw = loopWeights();
    setPlaying(loopStart, visible && lw.start > 0);
    setPlaying(loopSplit, visible && lw.split > 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, W, H);
    if (img) ctx.drawImage(img, b.x, b.y, b.w, b.h);
    for (const [v, w] of [[loopStart, lw.start], [loopSplit, lw.split]]) {
      // beim allerersten Start weich einblenden (das Standbild steht schon da)
      const fadeIn = v.startedAt ? clamp((now - v.startedAt) / 700) : 0;
      const src = v === loopSplit ? maskedSplit() : v;
      if (src && w * fadeIn > 0.001 && playing(v)) {
        ctx.globalAlpha = w * fadeIn;
        ctx.drawImage(src, b.x, b.y, b.w, b.h);
        ctx.globalAlpha = 1;
      }
    }

    // Lichtkegel auf die aktive Schicht
    const s = SPOT[activeStep];
    const want = s && p >= 0.29 && p < 0.8 ? 1 : 0;
    if (s) { spot.cy = lerp(spot.cy, s.cy, 0.15); spot.rx = lerp(spot.rx, s.rx, 0.15); spot.ry = lerp(spot.ry, s.ry, 0.15); }
    spot.a = lerp(spot.a, want, 0.12);
    if (spot.a > 0.01) {
      const cx = b.x + b.w / 2, cy = b.y + spot.cy * b.h;
      const rx = spot.rx * b.w, ry = spot.ry * b.h + 0.02 * b.h;
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, rx * 0.86, 0, 0, rx * 1.12);
      g.addColorStop(0, "rgba(12,16,9,0)");
      g.addColorStop(1, `rgba(12,16,9,${0.8 * spot.a})`);
      ctx.fillStyle = g;
      ctx.fillRect(-W * 2, -H * 40, W * 4, H * 80);
      ctx.restore();
    }

    // Ränder weich in den Seitenhintergrund auslaufen lassen
    ctx.globalCompositeOperation = "destination-in";
    ctx.save();
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(1, b.h / b.w);
    const v = ctx.createRadialGradient(0, 0, b.w * 0.3, 0, 0, b.w * 0.5);
    v.addColorStop(0, "rgba(0,0,0,1)"); v.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = v;
    ctx.fillRect(-b.w, -b.w, b.w * 2, b.w * 2);
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";

    drawLine(b);
  }

  /* ---------- Linie zur Karte (nur Desktop) ---------- */
  function drawLine(b) {
    if (!lineSvg) return;
    const s = SPOT[activeStep], card = cards[activeStep];
    if (!s || !card || mqSmall.matches || spot.a < 0.6) { lineSvg.classList.remove("is-on"); return; }
    const sr = stage.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    const ex = s.rx * 0.97 * b.w;
    const ax = b.x + b.w / 2 + (isRtl ? -ex : ex), ay = b.y + s.cy * b.h;
    const bx = (isRtl ? cr.right : cr.left) - sr.left, by = cr.top - sr.top + 34;
    const mx = (ax + bx) / 2;
    linePath.setAttribute("d", `M${ax},${ay} L${mx},${ay} L${mx},${by} L${bx},${by}`);
    lineDot.setAttribute("cx", ax); lineDot.setAttribute("cy", ay);
    lineSvg.setAttribute("viewBox", `0 0 ${sr.width} ${sr.height}`);
    lineSvg.classList.add("is-on");
  }

  function update(now) {
    const sr = section.getBoundingClientRect();
    p = clamp(-sr.top / Math.max(1, sr.height - window.innerHeight));
    let step = 0;
    for (let i = 0; i < STEP_AT.length; i++) if (p >= STEP_AT[i]) step = i;
    setStep(step);
    if (intro) intro.classList.toggle("is-hidden", p > 0.03);
    draw(now);
  }

  // nur zeichnen, solange die Bühne sichtbar ist
  let visible = false, running = false;
  function loop() {
    if (running) return;
    running = true;
    const tick = (now) => {
      if (!visible || document.hidden) { running = false; return; }
      update(now);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible) { loopStart.pause(); loopSplit.pause(); }
    document.body.classList.toggle("kn-in-scene", e.isIntersecting && e.intersectionRatio > 0.2);
    if (visible) loop();
  }, { threshold: [0, 0.2, 0.5] }).observe(section);
  document.addEventListener("visibilitychange", loop);
})();
