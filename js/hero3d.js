/*
 * 3D-Manakish (Three.js) – begleitet den Besucher vom Hero in die Scroll-Geschichte
 *
 * 1. Hero: fertige Manakish dreht sich, Sesam schwebt drumherum
 * 2. Beim Scrollen wandert sie in die Bildschirmmitte (.story3d__stage)
 * 3. Scroll-Geschichte: die Schichten heben sich ab (Teig, Za'atar, Sesam, Sumach),
 *    jede Schicht wird der Reihe nach hervorgehoben – am Ende setzt sie sich wieder zusammen
 *
 * Realismus: handgezogener, unregelmäßiger Teig mit Blasen und Röstflecken,
 * Za'atar-Paste mit ungleichmäßigem Rand und Olivenöl-Glanz, Umgebungslicht für Reflexe.
 * Ohne WebGL bleibt die SVG-Grafik im Hero und die Geschichte wird als normale Liste gezeigt.
 */
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const hero = document.querySelector(".hero");
const anchor = document.querySelector(".hero__visual");
const story = document.querySelector(".story3d");
const stage = document.querySelector(".story3d__stage");
const steps = [...document.querySelectorAll(".story3d__step")];
const bars = [...document.querySelectorAll(".story3d__progress span")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mqSmall = window.matchMedia("(max-width: 860px)");

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) { return false; }
}


/* ======================================================================
   Form der Manakish: unregelmäßiger Rand, flacher Boden, leichter Wulst,
   Teigblasen – eine Höhenfunktion, die Teig, Paste und Körner teilen
   ====================================================================== */
const R = 1.5;
const rand = (a, b) => a + Math.random() * (b - a);

// periodisches "Rauschen" entlang des Umfangs (Summe von Sinuswellen)
function makeRing(amps) {
  const waves = amps.map((a, k) => ({ a, k: k + 2, p: rand(0, Math.PI * 2) }));
  return th => waves.reduce((s, w) => s + w.a * Math.sin(w.k * th + w.p), 0);
}
const edgeNoise = makeRing([0.035, 0.022, 0.016, 0.01, 0.008, 0.006, 0.004]);
const rimNoise = makeRing([0.35, 0.25, 0.2, 0.15, 0.1]);
const pasteNoise = makeRing([0.03, 0.025, 0.02, 0.015, 0.012, 0.01, 0.008, 0.006]);

const edgeR = th => R * (1 + edgeNoise(th)) * (1 + 0.035 * Math.cos(2 * th)); // leicht oval
const pasteT = th => 0.84 + pasteNoise(th);                                    // Rand der Paste (relativ)

// Teigblasen
const bubbles = Array.from({ length: 26 }, () => {
  const th = rand(0, Math.PI * 2), t = Math.sqrt(Math.random()) * 0.95;
  const onRim = t > 0.8;
  return {
    x: Math.cos(th) * t * R, z: Math.sin(th) * t * R,
    s: onRim ? rand(0.06, 0.13) : rand(0.08, 0.2),
    h: onRim ? rand(0.02, 0.05) : rand(0.008, 0.022)
  };
});

function heightAt(x, z) {
  const r = Math.hypot(x, z), th = Math.atan2(z, x);
  const t = Math.min(1, r / edgeR(th));
  const base = 0.035;
  const rim = 0.06 * (0.7 + 0.6 * (0.5 + rimNoise(th))) * Math.exp(-(((t - 0.91) / 0.065) ** 2));
  let bub = 0;
  for (const b of bubbles) {
    const d2 = (x - b.x) ** 2 + (z - b.z) ** 2;
    bub += b.h * Math.exp(-d2 / (b.s * b.s));
  }
  const top = base + rim + bub;
  if (t < 0.92) return top;
  // abgerundete Kante
  const k = (t - 0.92) / 0.08;
  return -0.015 + (top + 0.015) * Math.sqrt(Math.max(0, 1 - k * k));
}

// Polar-Gitter (Mitte -> Rand) mit Höhen aus heightAt
function polarGeometry(rings, segs, tMaxFn, lift) {
  const pos = [], uv = [], idx = [];
  pos.push(0, heightAt(0, 0) + lift, 0); uv.push(0.5, 0.5);
  for (let i = 1; i <= rings; i++) {
    for (let j = 0; j < segs; j++) {
      const th = (j / segs) * Math.PI * 2;
      const r = (i / rings) * tMaxFn(th) * edgeR(th);
      const x = Math.cos(th) * r, z = Math.sin(th) * r;
      pos.push(x, heightAt(x, z) + lift, z);
      uv.push(0.5 + x / (2.2 * R), 0.5 - z / (2.2 * R));
    }
  }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
  for (let i = 1; i < rings; i++) {
    const a = 1 + (i - 1) * segs, b = 1 + i * segs;
    for (let j = 0; j < segs; j++) {
      const j2 = (j + 1) % segs;
      idx.push(a + j, a + j2, b + j, a + j2, b + j2, b + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function init() {
  const small = () => mqSmall.matches;
  const lowPower = small();
  if (window.zatarProgress) window.zatarProgress(0.88);

  // Erst das 3D-Layout aktivieren, dann messen
  document.documentElement.classList.add("has-3d");
  hero.classList.add("has-3d");

  const canvas = document.createElement("canvas");
  canvas.className = "scene3d";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  // Umgebungslicht für realistische Reflexe (Olivenöl-Glanz)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  /* ---------- Licht: warmes Ofenlicht von oben links ---------- */
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x2b3a26, 0.55));
  const key = new THREE.DirectionalLight(0xffdcaa, 2.6);
  key.position.set(-4, 7, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe8c878, 1.2);
  rim.position.set(5, -1, -4);
  scene.add(rim);

  const quality = lowPower ? { rings: 46, segs: 110, tex: 1024 } : { rings: 70, segs: 180, tex: 1536 };

  /* ---------- Schicht 1: Teig ---------- */
  const doughTex = makeDoughTexture(quality.tex);
  const doughGeo = polarGeometry(quality.rings, quality.segs, () => 1, 0);
  const doughMat = new THREE.MeshStandardMaterial({
    map: doughTex.color, bumpMap: doughTex.bump, bumpScale: 3, roughness: 0.82, transparent: true
  });
  const doughTop = new THREE.Mesh(doughGeo, doughMat);
  const bottomGeo = new THREE.CircleGeometry(R * 1.02, 96);
  bottomGeo.rotateX(Math.PI / 2);
  bottomGeo.translate(0, -0.016, 0);
  const doughBottom = new THREE.Mesh(bottomGeo, new THREE.MeshStandardMaterial({ color: "#b98246", roughness: 0.9, transparent: true }));
  const dough = new THREE.Group();
  dough.add(doughTop, doughBottom);

  /* ---------- Schicht 2: Za'atar-Paste ---------- */
  const pasteTex = makePasteTexture(quality.tex);
  const pasteGeo = polarGeometry(quality.rings, quality.segs, th => Math.min(0.97, pasteT(th) + 0.08), 0.006);
  const toppingMat = new THREE.MeshStandardMaterial({
    map: pasteTex.color, bumpMap: pasteTex.bump, bumpScale: 2.5,
    roughnessMap: pasteTex.rough, roughness: 1, metalness: 0, envMapIntensity: 0.7,
    alphaMap: pasteTex.alpha, alphaTest: 0.5, transparent: true, side: THREE.DoubleSide
  });
  const topping = new THREE.Mesh(pasteGeo, toppingMat);

  /* ---------- Schicht 3 & 4: Sesam und Sumach als 3D-Körner ---------- */
  const seedCount = lowPower ? 170 : 300;
  const sumacCount = lowPower ? 70 : 120;
  const seedMat = new THREE.MeshStandardMaterial({ roughness: 0.4, transparent: true });
  const sumacMat = new THREE.MeshStandardMaterial({ color: "#9b2a1c", emissive: "#3a0c06", roughness: 0.75, transparent: true });
  const seedGeo = new THREE.SphereGeometry(1, 10, 6);
  seedGeo.translate(0.25, 0, 0);                         // leicht tropfenförmig
  const seeds = new THREE.InstancedMesh(seedGeo, seedMat, seedCount);
  const sumacGeo = new THREE.IcosahedronGeometry(1, 0);  // unregelmäßige Flocken
  const sumac = new THREE.InstancedMesh(sumacGeo, sumacMat, sumacCount);
  const onPaste = (count, size, lift) => Array.from({ length: count }, () => {
    let x, z, th, t;
    do {
      th = Math.random() * Math.PI * 2; t = Math.sqrt(Math.random()) * 0.97;
    } while (t > pasteT(th) - 0.03);
    const r = t * edgeR(th);
    x = Math.cos(th) * r; z = Math.sin(th) * r;
    return {
      x, z, y: heightAt(x, z) + 0.006 + lift, lift: Math.random(),
      rot: new THREE.Euler(rand(-0.25, 0.25), rand(0, Math.PI), rand(-0.25, 0.25)),
      size: size * rand(0.75, 1.25)
    };
  });
  const seedData = onPaste(seedCount, 0.028, 0.01);
  const sumacData = onPaste(sumacCount, 0.016, 0.008);
  // Sesam unterschiedlich stark geröstet
  const seedColors = ["#f4e6c4", "#ecd7a6", "#e2c486", "#d4ad6a", "#f7ecd2"].map(c => new THREE.Color(c));
  for (let i = 0; i < seedCount; i++) seeds.setColorAt(i, seedColors[(Math.random() * seedColors.length) | 0]);
  seeds.instanceColor.needsUpdate = true;

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.2;

  const bread = new THREE.Group();   // Drehung um die eigene Achse
  bread.add(dough, topping, seeds, sumac, shadow);
  const tilt = new THREE.Group();    // Neigung
  tilt.add(bread);
  const holder = new THREE.Group();  // Position & Größe auf dem Bildschirm
  holder.add(tilt);
  scene.add(holder);

  /* ---------- Schwebende Körner rund um den Hero ---------- */
  const ambCount = lowPower ? 60 : 140;
  const amb = new THREE.InstancedMesh(seedGeo, new THREE.MeshStandardMaterial({ color: "#efdcb0", roughness: 0.45 }), ambCount);
  const ambData = Array.from({ length: ambCount }, () => {
    const a = Math.random() * Math.PI * 2, r = 1.9 + Math.random() * 1.8;
    return {
      base: new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 2.6, Math.sin(a) * r * 0.6),
      rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      spin: (Math.random() - 0.5) * 1.2, speed: 0.3 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2, size: 0.028 + Math.random() * 0.018
    };
  });
  holder.add(amb);

  /* ---------- Hilfsfunktionen ---------- */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  let viewW = 1, viewH = 1, W = 1, H = 1;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    viewW = viewH * camera.aspect;
  }
  resize();
  window.addEventListener("resize", resize);

  // Bildschirm-Rechteck -> Position & Skalierung in der 3D-Welt
  const place = (rect, fill) => ({
    x: ((rect.left + rect.width / 2) / W - 0.5) * viewW,
    y: -((rect.top + rect.height / 2) / H - 0.5) * viewH,
    s: (Math.min(rect.width, rect.height) * fill / W) * viewW / (R * 2)
  });

  /* ---------- Interaktion ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", e => {
      pointer.tx = (e.clientX / W - 0.5) * 2;
      pointer.ty = (e.clientY / H - 0.5) * 2;
    }, { passive: true });
  }

  /* ---------- Animation ---------- */
  const clock = new THREE.Clock();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  let intro = reduceMotion ? 1 : 0, spin = 0, activeStep = -1;
  // Einflug-Animation erst starten, wenn der Ladebildschirm weggleitet
  let started = !window.zatarReady;
  if (window.zatarReady) window.zatarReady.then(() => { started = true; });
  const layerOpacity = [1, 1, 1, 1];
  const layerMats = [[doughMat, doughBottom.material], [toppingMat], [seedMat], [sumacMat]];

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const sm = small();

    const heroRect = hero.getBoundingClientRect();
    const a = place(anchor.getBoundingClientRect(), sm ? 0.86 : 0.92);
    let target = a, move = 0, prog = 0, fadeOut = 0;

    if (story && stage) {
      const sr = story.getBoundingClientRect();
      const b = place(stage.getBoundingClientRect(), sm ? 0.9 : 0.8);
      move = smooth(0, 1, 1 - sr.top / H);                       // Hero -> Bühne
      prog = clamp(-sr.top / Math.max(1, sr.height - H));        // Fortschritt der Geschichte
      fadeOut = smooth(H * 0.9, H * 0.35, sr.bottom);            // am Ende ausblenden
      target = { x: lerp(a.x, b.x, move), y: lerp(a.y, b.y, move), s: lerp(a.s, b.s, move) };

      // Texte & Fortschritt
      const step = Math.min(4, Math.floor(prog * 5));
      if (step !== activeStep && move > 0.6) {
        activeStep = step;
        steps.forEach((el, i) => el.classList.toggle("is-active", i === step));
        bars.forEach((el, i) => el.classList.toggle("is-done", i <= step));
      }
      if (move <= 0.6 && activeStep !== -1) {
        activeStep = -1;
        steps.forEach(el => el.classList.remove("is-active"));
        bars.forEach(el => el.classList.remove("is-done"));
      }
    }

    if (intro < 1 && started) intro = Math.min(1, intro + dt / (sm ? 1.1 : 1.6));
    const e = 1 - Math.pow(1 - intro, 4);

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    if (!reduceMotion) spin += dt * (0.2 + move * 0.15);

    // Explosionsansicht: Schichten heben sich ab und setzen sich am Ende wieder zusammen
    const explode = smooth(0.03, 0.16, prog) * (1 - smooth(0.8, 0.93, prog)) * move;

    holder.position.set(target.x, target.y + (reduceMotion ? 0 : Math.sin(t * 0.8) * 0.05 * (1 - explode)), 0);
    holder.scale.setScalar(target.s * (0.85 + 0.15 * e));

    const heroTilt = sm ? 0.55 : 0.95;
    const storyTilt = lerp(heroTilt, 0.9, move);
    tilt.rotation.x = lerp(storyTilt, 0.38, explode) + pointer.y * 0.15 * (1 - explode) + (1 - e) * 0.9;
    tilt.rotation.z = -0.12 * (1 - explode) + pointer.x * -0.12;
    bread.rotation.y = spin + (1 - e) * -2.2;
    bread.position.y = -0.9 * explode;

    // Schichten auseinanderziehen
    const gap = 0.62;
    topping.position.y = gap * explode;
    for (let i = 0; i < seedCount; i++) {
      const d = seedData[i];
      p.set(d.x, d.y + gap * 2 * explode + d.lift * 0.18 * explode, d.z);
      q.setFromEuler(d.rot);
      sc.set(d.size, d.size * 0.36, d.size * 0.55).multiplyScalar(e);
      seeds.setMatrixAt(i, m4.compose(p, q, sc));
    }
    for (let i = 0; i < sumacCount; i++) {
      const d = sumacData[i];
      p.set(d.x, d.y + gap * 3 * explode + d.lift * 0.14 * explode, d.z);
      q.setFromEuler(d.rot);
      sc.set(d.size, d.size * 0.4, d.size * 0.8).multiplyScalar(e);
      sumac.setMatrixAt(i, m4.compose(p, q, sc));
    }
    seeds.instanceMatrix.needsUpdate = true;
    sumac.instanceMatrix.needsUpdate = true;
    shadow.material.opacity = 1 - explode * 0.7;

    // Aktive Schicht hervorheben, andere abdunkeln
    for (let i = 0; i < 4; i++) {
      const want = explode > 0.2 && activeStep >= 0 && activeStep < 4 && activeStep !== i ? 0.22 : 1;
      layerOpacity[i] += (want - layerOpacity[i]) * 0.12;
      for (const m of layerMats[i]) {
        m.opacity = layerOpacity[i];
        m.depthWrite = layerOpacity[i] > 0.9;
        if (m.alphaMap) m.alphaTest = 0.5 * layerOpacity[i];
      }
    }

    // Schwebende Körner nur im Hero
    const ambVis = e * (1 - move);
    for (let i = 0; i < ambCount; i++) {
      const d = ambData[i];
      const bob = reduceMotion ? 0 : Math.sin(t * d.speed + d.phase) * 0.15;
      const ang = reduceMotion ? 0 : t * 0.05 * d.speed;
      const x = d.base.x * Math.cos(ang) - d.base.z * Math.sin(ang);
      const z = d.base.x * Math.sin(ang) + d.base.z * Math.cos(ang);
      p.set(x * ambVis, (d.base.y + bob) * ambVis, z);
      d.rot.x += dt * d.spin; d.rot.y += dt * d.spin * 0.7;
      q.setFromEuler(d.rot);
      sc.set(d.size, d.size * 0.4, d.size * 0.6).multiplyScalar(ambVis);
      amb.setMatrixAt(i, m4.compose(p, q, sc));
    }
    amb.instanceMatrix.needsUpdate = true;

    canvas.style.opacity = String(1 - fadeOut);
    renderer.render(scene, camera);
    return heroRect.bottom > 0 || fadeOut < 1;
  }

  // Nur rendern, solange Hero oder Geschichte sichtbar sind
  let running = false;
  function loop() {
    if (running) return;
    running = true;
    const tick = () => {
      if (document.hidden) { running = false; return; }
      const visible = frame();
      canvas.style.visibility = visible ? "visible" : "hidden";
      if (!visible) { running = false; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const wake = () => loop();
  window.addEventListener("scroll", wake, { passive: true });
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("resize", wake);
  loop();
  // erstes Bild ist gezeichnet -> Ladebildschirm darf verschwinden
  requestAnimationFrame(() => requestAnimationFrame(() => window.zatarLoaded && window.zatarLoaded()));
}

/* ======================================================================
   Texturen (prozedural gemalt – keine Bilddateien nötig)
   Textur-Koordinaten: u = 0.5 + x/(2.2R), v = 0.5 - z/(2.2R)
   ====================================================================== */
function canvas2d(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")];
}
const toPx = (size, x, z) => [(0.5 + x / (2.2 * R)) * size, (0.5 + z / (2.2 * R)) * size];

function blob(g, x, y, r, color) {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, color);
  rg.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
  g.fillStyle = rg;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}

function makeDoughTexture(size) {
  const [c, g] = canvas2d(size);
  const [cb, gb] = canvas2d(size);
  const k = size / 1024;

  // Grundfarbe: hell-golden innen, goldbraun zum Rand
  g.fillStyle = "#c98c4a"; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 360; i++) {
    const th = (i / 360) * Math.PI * 2;
    const er = edgeR(th);
    for (let s = 0; s < 12; s++) {
      const t = s / 12;
      const [x, y] = toPx(size, Math.cos(th) * t * er, Math.sin(th) * t * er);
      const col = t < 0.75 ? "rgba(236,196,138,0.25)" : "rgba(205,142,72,0.25)";
      blob(g, x, y, 60 * k, col);
    }
  }
  // Bräunung am Rand und auf den Blasen
  for (let i = 0; i < 900; i++) {
    const th = Math.random() * Math.PI * 2, t = 0.78 + Math.random() * 0.22;
    const [x, y] = toPx(size, Math.cos(th) * t * edgeR(th), Math.sin(th) * t * edgeR(th));
    blob(g, x, y, rand(6, 22) * k, `rgba(${rand(120, 160) | 0},${rand(66, 88) | 0},${rand(25, 40) | 0},${rand(0.12, 0.3)})`);
  }
  for (const b of bubbles) {
    const [x, y] = toPx(size, b.x, b.z);
    blob(g, x, y, b.s * size / (2.2 * R) * 0.8, "rgba(122,66,24,0.45)");
    blob(g, x - 3 * k, y - 3 * k, b.s * size / (2.2 * R) * 0.35, "rgba(80,40,14,0.4)");
  }
  // kleine dunkle Röstflecken (Steinofen)
  for (let i = 0; i < 70; i++) {
    const th = Math.random() * Math.PI * 2, t = 0.86 + Math.random() * 0.12;
    const [x, y] = toPx(size, Math.cos(th) * t * edgeR(th), Math.sin(th) * t * edgeR(th));
    blob(g, x, y, rand(3, 9) * k, "rgba(62,32,12,0.75)");
  }
  // Mehlstaub
  for (let i = 0; i < 2500 * Math.min(1, (size / 1536) ** 2); i++) {
    g.fillStyle = `rgba(255,244,222,${rand(0.08, 0.3)})`;
    g.fillRect(Math.random() * size, Math.random() * size, rand(1, 2.5) * k, rand(1, 2.5) * k);
  }

  // Relief: feine Körnung + Blasen
  gb.fillStyle = "#808080"; gb.fillRect(0, 0, size, size);
  for (let i = 0; i < 6000; i++) {
    const v = rand(100, 160) | 0;
    gb.fillStyle = `rgba(${v},${v},${v},0.5)`;
    gb.fillRect(Math.random() * size, Math.random() * size, 2 * k, 2 * k);
  }
  for (const b of bubbles) {
    const [x, y] = toPx(size, b.x, b.z);
    blob(gb, x, y, b.s * size / (2.2 * R), "rgba(255,255,255,0.35)");
  }

  const color = new THREE.CanvasTexture(c);
  color.colorSpace = THREE.SRGBColorSpace;
  color.anisotropy = 4;
  return { color, bump: new THREE.CanvasTexture(cb) };
}

function makePasteTexture(size) {
  const [c, g] = canvas2d(size);
  const [cr, gr] = canvas2d(size);
  const [ca, ga] = canvas2d(size);
  const [cb, gb] = canvas2d(size);
  const k = size / 1024;
  const inside = () => {
    let th, t;
    do { th = Math.random() * Math.PI * 2; t = Math.sqrt(Math.random()) * 0.97; } while (t > pasteT(th));
    return toPx(size, Math.cos(th) * t * edgeR(th), Math.sin(th) * t * edgeR(th));
  };

  // Grundton: olivgrün-bräunlich, fleckig gemischt
  g.fillStyle = "#3a4318"; g.fillRect(0, 0, size, size);
  const tones = ["rgba(46,54,18,0.55)", "rgba(78,86,32,0.45)", "rgba(92,74,30,0.4)", "rgba(38,44,14,0.55)"];
  for (let i = 0; i < 500; i++) { const [x, y] = inside(); blob(g, x, y, rand(20, 70) * k, tones[i % tones.length]); }

  // Thymian-Blättchen
  const greens = ["#232c0c", "#2f3a12", "#44521c", "#566226", "#5e5020", "#3a3212"];
  const dens = Math.min(1, (size / 1536) ** 2);   // Handy: weniger Details
  for (let i = 0; i < 26000 * dens; i++) {
    const [x, y] = inside();
    g.save(); g.translate(x, y); g.rotate(Math.random() * Math.PI);
    g.fillStyle = greens[(Math.random() * greens.length) | 0];
    g.beginPath(); g.ellipse(0, 0, rand(1.5, 4) * k, rand(0.7, 1.6) * k, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // Sumach & Sesam fein in der Paste
  for (let i = 0; i < 900; i++) {
    const [x, y] = inside();
    g.fillStyle = ["#7c2217", "#962b1c", "#5e1a12"][i % 3];
    g.beginPath(); g.arc(x, y, rand(0.8, 1.8) * k, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 300; i++) {
    const [x, y] = inside();
    g.save(); g.translate(x, y); g.rotate(Math.random() * Math.PI);
    g.fillStyle = "rgba(240,224,186,0.85)";
    g.beginPath(); g.ellipse(0, 0, 3 * k, 1.6 * k, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  // Olivenöl: gelblich-glänzende Pfützen (Farbe + Glanz)
  gr.fillStyle = "#b4b4b4"; gr.fillRect(0, 0, size, size);   // eher matt
  for (let i = 0; i < 70; i++) {
    const [x, y] = inside();
    const r = rand(18, 60) * k;
    blob(g, x, y, r, "rgba(150,140,50,0.18)");
    blob(gr, x, y, r, "rgba(40,40,40,0.9)");                   // dunkel = glänzend
  }

  // Unregelmäßiger Rand der Paste (Alpha) – Teig schaut an den Rändern durch
  ga.fillStyle = "#000"; ga.fillRect(0, 0, size, size);
  ga.fillStyle = "#fff";
  ga.beginPath();
  for (let i = 0; i <= 720; i++) {
    const th = (i / 720) * Math.PI * 2;
    const t = pasteT(th) + rand(-0.006, 0.006);
    const [x, y] = toPx(size, Math.cos(th) * t * edgeR(th), Math.sin(th) * t * edgeR(th));
    i ? ga.lineTo(x, y) : ga.moveTo(x, y);
  }
  ga.closePath(); ga.fill();
  // einzelne Kleckse über den Rand hinaus
  for (let i = 0; i < 40; i++) {
    const th = Math.random() * Math.PI * 2, t = pasteT(th) + rand(0, 0.05);
    const [x, y] = toPx(size, Math.cos(th) * t * edgeR(th), Math.sin(th) * t * edgeR(th));
    ga.beginPath(); ga.arc(x, y, rand(3, 10) * k, 0, Math.PI * 2); ga.fill();
  }

  // Relief der Paste
  gb.drawImage(c, 0, 0);

  const color = new THREE.CanvasTexture(c);
  color.colorSpace = THREE.SRGBColorSpace;
  color.anisotropy = 4;
  return {
    color,
    rough: new THREE.CanvasTexture(cr),
    alpha: new THREE.CanvasTexture(ca),
    bump: new THREE.CanvasTexture(cb)
  };
}

function makeShadowTexture() {
  const [c, g] = canvas2d(256);
  const rg = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  rg.addColorStop(0, "rgba(0,0,0,0.55)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// Start (am Ende, damit alle Form- und Texturfunktionen bereits definiert sind)
if (hero && anchor && webglAvailable()) init();
