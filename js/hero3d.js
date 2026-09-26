/*
 * 3D-Manakish (Three.js) – begleitet den Besucher vom Hero in die Scroll-Geschichte
 *
 * 1. Hero: fertige Manakish dreht sich, Sesam schwebt drumherum
 * 2. Beim Scrollen wandert sie in die Bildschirmmitte (.story3d__stage)
 * 3. Scroll-Geschichte: die Schichten heben sich ab (Teig, Za'atar, Sesam, Sumach),
 *    jede Schicht wird der Reihe nach hervorgehoben – am Ende setzt sie sich wieder zusammen
 *
 * Ohne WebGL bleibt die SVG-Grafik im Hero und die Geschichte wird als normale Liste gezeigt.
 */
import * as THREE from "./vendor/three.module.min.js";

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

if (hero && anchor && webglAvailable()) init();

function init() {
  const small = () => mqSmall.matches;
  const lowPower = small();

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
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  /* ---------- Licht ---------- */
  scene.add(new THREE.HemisphereLight(0xfff1d6, 0x2b3a26, 1.15));
  const key = new THREE.DirectionalLight(0xffe2b0, 2.5);
  key.position.set(-4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe2c46a, 1.5);
  rim.position.set(5, -2, -4);
  scene.add(rim);

  const R = 1.5;
  const wobble = a => 1 + 0.02 * Math.sin(a * 5) + 0.012 * Math.sin(a * 11 + 1.3);

  /* ---------- Schicht 1: Teig ---------- */
  const profile = [
    [0, -0.06], [1.1, -0.06], [1.42, -0.03], [1.52, 0.05], [1.5, 0.15],
    [1.42, 0.2], [1.32, 0.17], [1.24, 0.1], [0, 0.1]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const doughGeo = new THREE.LatheGeometry(profile, lowPower ? 72 : 128);
  {
    const pos = doughGeo.attributes.position, colors = [];
    const golden = new THREE.Color("#e2ae67"), toasted = new THREE.Color("#9a5a24");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x);
      pos.setX(i, x * wobble(a)); pos.setZ(i, z * wobble(a));
      const t = Math.min(1, Math.max(0, (y - 0.05) * 5)) * (0.5 + 0.5 * Math.sin(a * 7 + 0.7) * Math.sin(a * 3));
      const c = golden.clone().lerp(toasted, 0.15 + Math.abs(t) * 0.7);
      colors.push(c.r, c.g, c.b);
    }
    doughGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    doughGeo.computeVertexNormals();
  }
  const doughMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, transparent: true });
  const dough = new THREE.Mesh(doughGeo, doughMat);

  /* ---------- Schicht 2: Za'atar-Paste ---------- */
  const topTex = makeToppingTexture(lowPower ? 768 : 1024);
  const topGeo = new THREE.CircleGeometry(1.3, lowPower ? 72 : 128);
  topGeo.rotateX(-Math.PI / 2);
  {
    const tp = topGeo.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i), a = Math.atan2(z, x);
      tp.setX(i, x * wobble(a)); tp.setZ(i, z * wobble(a));
    }
  }
  const toppingMat = new THREE.MeshStandardMaterial({
    map: topTex, bumpMap: topTex, bumpScale: 2.2, roughness: 0.5, metalness: 0.05,
    transparent: true, side: THREE.DoubleSide
  });
  const topping = new THREE.Mesh(topGeo, toppingMat);

  /* ---------- Schicht 3 & 4: Sesam und Sumach als echte 3D-Körner ---------- */
  const seedCount = lowPower ? 190 : 320;
  const sumacCount = lowPower ? 120 : 200;
  const seedMat = new THREE.MeshStandardMaterial({ color: "#f3e4bf", roughness: 0.45, transparent: true });
  const sumacMat = new THREE.MeshStandardMaterial({ color: "#c0392b", emissive: "#5a120a", roughness: 0.6, transparent: true });
  const seeds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), seedMat, seedCount);
  const sumac = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), sumacMat, sumacCount);
  const onTop = (count, size) => Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.22;
    return {
      x: Math.cos(a) * r, z: Math.sin(a) * r, lift: Math.random(),
      rot: new THREE.Euler((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4),
      size: size * (0.8 + Math.random() * 0.4)
    };
  });
  const seedData = onTop(seedCount, 0.03);
  const sumacData = onTop(sumacCount, 0.03);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.35;

  const bread = new THREE.Group();   // Drehung um die eigene Achse
  bread.add(dough, topping, seeds, sumac, shadow);
  const tilt = new THREE.Group();    // Neigung
  tilt.add(bread);
  const holder = new THREE.Group();  // Position & Größe auf dem Bildschirm
  holder.add(tilt);
  scene.add(holder);

  /* ---------- Schwebende Körner rund um den Hero ---------- */
  const ambCount = lowPower ? 60 : 140;
  const amb = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshStandardMaterial({ color: "#f1e2bd", roughness: 0.5 }),
    ambCount
  );
  const ambData = Array.from({ length: ambCount }, () => {
    const a = Math.random() * Math.PI * 2, r = 1.9 + Math.random() * 1.8;
    return {
      base: new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 2.6, Math.sin(a) * r * 0.6),
      rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      spin: (Math.random() - 0.5) * 1.2, speed: 0.3 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2, size: 0.03 + Math.random() * 0.02
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
  const layerOpacity = [1, 1, 1, 1];
  const mats = [doughMat, toppingMat, seedMat, sumacMat];

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const sm = small();

    const heroRect = hero.getBoundingClientRect();
    const a = place(anchor.getBoundingClientRect(), sm ? 1.02 : 0.92);
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

    if (intro < 1) intro = Math.min(1, intro + dt / (sm ? 1.1 : 1.6));
    const e = 1 - Math.pow(1 - intro, 4);

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    if (!reduceMotion) spin += dt * (0.2 + move * 0.15);

    // Explosionsansicht: Schichten heben sich ab und setzen sich am Ende wieder zusammen
    const explode = smooth(0.03, 0.16, prog) * (1 - smooth(0.8, 0.93, prog)) * move;

    holder.position.set(target.x, target.y + (reduceMotion ? 0 : Math.sin(t * 0.8) * 0.05 * (1 - explode)), 0);
    holder.scale.setScalar(target.s * (0.85 + 0.15 * e));

    const heroTilt = sm ? 0.5 : 0.95;
    const storyTilt = lerp(heroTilt, 0.9, move);
    tilt.rotation.x = lerp(storyTilt, 0.38, explode) + pointer.y * 0.15 * (1 - explode) + (1 - e) * 0.9;
    tilt.rotation.z = -0.12 * (1 - explode) + pointer.x * -0.12;
    bread.rotation.y = spin + (1 - e) * -2.2;
    bread.position.y = -0.95 * explode;

    // Schichten auseinanderziehen
    const gap = 0.62;
    topping.position.y = 0.105 + gap * explode;
    const seedY = 0.13 + gap * 2 * explode;
    const sumacY = 0.125 + gap * 3 * explode;

    for (let i = 0; i < seedCount; i++) {
      const d = seedData[i];
      p.set(d.x, seedY + d.lift * 0.18 * explode, d.z);
      q.setFromEuler(d.rot);
      sc.set(d.size, d.size * 0.42, d.size * 0.62).multiplyScalar(e);
      seeds.setMatrixAt(i, m4.compose(p, q, sc));
    }
    for (let i = 0; i < sumacCount; i++) {
      const d = sumacData[i];
      p.set(d.x, sumacY + d.lift * 0.14 * explode, d.z);
      q.setFromEuler(d.rot);
      sc.set(d.size, d.size * 0.35, d.size * 0.8).multiplyScalar(e);
      sumac.setMatrixAt(i, m4.compose(p, q, sc));
    }
    seeds.instanceMatrix.needsUpdate = true;
    sumac.instanceMatrix.needsUpdate = true;
    shadow.material.opacity = 1 - explode * 0.7;

    // Aktive Schicht hervorheben, andere abdunkeln
    for (let i = 0; i < 4; i++) {
      const want = explode > 0.2 && activeStep >= 0 && activeStep < 4 && activeStep !== i ? 0.22 : 1;
      layerOpacity[i] += (want - layerOpacity[i]) * 0.12;
      mats[i].opacity = layerOpacity[i];
      mats[i].depthWrite = layerOpacity[i] > 0.9;
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
      sc.set(d.size, d.size * 0.45, d.size * 0.7).multiplyScalar(ambVis);
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
}

/* ---------- Texturen ---------- */
function makeToppingTexture(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const r = size / 2;

  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, "#5d6b2c");
  grad.addColorStop(0.75, "#4a5622");
  grad.addColorStop(0.93, "#6b5a28");
  grad.addColorStop(1, "#b7803f");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);

  const k = size / 1024;
  const speck = (n, colors, w, h) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * r * 0.97;
      g.save();
      g.translate(r + Math.cos(a) * d, r + Math.sin(a) * d);
      g.rotate(Math.random() * Math.PI);
      g.fillStyle = colors[(Math.random() * colors.length) | 0];
      g.beginPath();
      g.ellipse(0, 0, (w + Math.random() * w) * k, (h + Math.random() * h) * k, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  };
  speck(10000, ["#3a4519", "#2d3713", "#6f7f35", "#55632a"], 2.5, 1.2); // Thymian
  speck(250, ["#e7d3a3", "#f3e5c2"], 3, 1.6);                          // feiner Sesam in der Paste

  // Olivenöl-Glanz
  for (let i = 0; i < 26; i++) {
    const x = r + (Math.random() - 0.5) * r * 1.4, y = r + (Math.random() - 0.5) * r * 1.4;
    const rg = g.createRadialGradient(x, y, 0, x, y, (40 + Math.random() * 60) * k);
    rg.addColorStop(0, "rgba(214,190,80,0.24)");
    rg.addColorStop(1, "rgba(214,190,80,0)");
    g.fillStyle = rg;
    g.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeShadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const rg = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  rg.addColorStop(0, "rgba(0,0,0,0.55)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
