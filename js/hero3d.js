/*
 * 3D-Manakish im Hero-Bereich (Three.js)
 * - dreht sich beim Scrollen und folgt leicht der Maus
 * - schwebende Sesamkörner und Thymianblättchen
 * - fällt auf die SVG-Grafik zurück, wenn WebGL nicht verfügbar ist
 */
import * as THREE from "./vendor/three.module.min.js";

const hero = document.querySelector(".hero");
const anchor = document.querySelector(".hero__visual");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isSmall = window.matchMedia("(max-width: 860px)").matches;

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) { return false; }
}

if (hero && anchor && webglAvailable()) init();

function init() {
  const canvas = document.createElement("canvas");
  canvas.className = "hero__canvas";
  canvas.setAttribute("aria-hidden", "true");
  hero.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isSmall, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  /* ---------- Licht ---------- */
  scene.add(new THREE.HemisphereLight(0xfff1d6, 0x2b3a26, 1.1));
  const key = new THREE.DirectionalLight(0xffe2b0, 2.4);
  key.position.set(-4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe2c46a, 1.4);
  rim.position.set(5, -2, -4);
  scene.add(rim);

  /* ---------- Manakish ---------- */
  const bread = new THREE.Group();
  const R = 1.5;

  // Teig mit erhöhtem Rand (Rotationskörper)
  const profile = [
    [0, -0.06], [1.1, -0.06], [1.42, -0.03], [1.52, 0.05], [1.5, 0.15],
    [1.42, 0.2], [1.32, 0.17], [1.24, 0.1], [0, 0.1]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const doughGeo = new THREE.LatheGeometry(profile, isSmall ? 72 : 128);
  // leichte Unregelmäßigkeit + geröstete Stellen über Vertex-Farben
  const pos = doughGeo.attributes.position;
  const colors = [];
  const golden = new THREE.Color("#e2ae67"), toasted = new THREE.Color("#9a5a24");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const wobble = 1 + 0.025 * Math.sin(a * 5) + 0.015 * Math.sin(a * 11 + 1.3);
    pos.setX(i, x * wobble);
    pos.setZ(i, z * wobble);
    const t = Math.min(1, Math.max(0, (y - 0.05) * 5)) * (0.5 + 0.5 * Math.sin(a * 7 + 0.7) * Math.sin(a * 3));
    const c = golden.clone().lerp(toasted, 0.15 + Math.abs(t) * 0.7);
    colors.push(c.r, c.g, c.b);
  }
  doughGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  doughGeo.computeVertexNormals();
  bread.add(new THREE.Mesh(doughGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })));

  // Za'atar-Belag als prozedurale Textur
  const topTex = makeToppingTexture(isSmall ? 768 : 1024);
  const topGeo = new THREE.CircleGeometry(1.3, isSmall ? 72 : 128);
  topGeo.rotateX(-Math.PI / 2);
  const tp = topGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), a = Math.atan2(z, x);
    const w = 1 + 0.025 * Math.sin(a * 5) + 0.015 * Math.sin(a * 11 + 1.3);
    tp.setX(i, x * w); tp.setZ(i, z * w);
  }
  const topping = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({
    map: topTex, bumpMap: topTex, bumpScale: 2.2, roughness: 0.55, metalness: 0.05
  }));
  topping.position.y = 0.105;
  bread.add(topping);

  // weicher Schatten
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.35;
  bread.add(shadow);

  const tilt = new THREE.Group();   // Neigung (Scroll/Maus)
  tilt.add(bread);
  const holder = new THREE.Group(); // Position/Skalierung (Layout)
  holder.add(tilt);
  scene.add(holder);

  /* ---------- Schwebende Sesamkörner & Thymian ---------- */
  const seedCount = isSmall ? 70 : 160;
  const flakeCount = isSmall ? 30 : 70;
  const seeds = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshStandardMaterial({ color: "#f1e2bd", roughness: 0.5 }),
    seedCount
  );
  const flakes = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 0.55),
    new THREE.MeshStandardMaterial({ color: "#5b6b2e", roughness: 0.8, side: THREE.DoubleSide }),
    flakeCount
  );
  const particles = [];
  const mkParticle = (i, mesh, size) => {
    const a = Math.random() * Math.PI * 2;
    const r = 1.9 + Math.random() * 1.8;
    particles.push({
      mesh, i, size,
      base: new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 2.6, Math.sin(a) * r * 0.6),
      rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      spin: (Math.random() - 0.5) * 1.2,
      speed: 0.3 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2
    });
  };
  for (let i = 0; i < seedCount; i++) mkParticle(i, seeds, 0.03 + Math.random() * 0.02);
  for (let i = 0; i < flakeCount; i++) mkParticle(i, flakes, 0.05 + Math.random() * 0.05);
  holder.add(seeds, flakes);

  /* ---------- Layout: Manakish in den Bereich .hero__visual setzen ---------- */
  let viewW = 1, viewH = 1, baseScale = 1;
  const baseCenter = new THREE.Vector3();
  function layout() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const dist = camera.position.z;
    viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    viewW = viewH * camera.aspect;

    const hr = hero.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    const cx = ar.left - hr.left + ar.width / 2;
    const cy = ar.top - hr.top + ar.height / 2;
    baseCenter.set((cx / w - 0.5) * viewW, -(cy / h - 0.5) * viewH, 0);
    const px = Math.min(ar.width, ar.height) * 0.92;
    baseScale = (px / w) * viewW / (R * 2);
  }
  layout();
  window.addEventListener("resize", layout);
  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(hero);

  hero.classList.add("has-3d");

  /* ---------- Interaktion ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", e => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }).observe(hero);

  /* ---------- Animation ---------- */
  const clock = new THREE.Clock();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let intro = reduceMotion ? 1 : 0;
  let spin = 0;
  let running = false;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const progress = Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight));

    if (intro < 1) intro = Math.min(1, intro + dt / 1.6);
    const e = 1 - Math.pow(1 - intro, 4); // easeOutQuart

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    if (!reduceMotion) spin += dt * (0.18 + progress * 0.9);

    // Position & Größe
    holder.position.set(
      baseCenter.x,
      baseCenter.y + progress * viewH * 0.35 + (reduceMotion ? 0 : Math.sin(t * 0.8) * 0.06),
      0
    );
    holder.scale.setScalar(baseScale * (0.6 + 0.4 * e) * (1 + progress * 0.25));

    // Neigung: zu Beginn Draufsicht, beim Scrollen kippt sie
    tilt.rotation.x = 0.95 - progress * 0.75 + pointer.y * 0.18 + (1 - e) * 0.9;
    tilt.rotation.z = -0.12 + pointer.x * -0.15;
    bread.rotation.y = spin + (1 - e) * -2.2;

    // Partikel
    const spread = 1 + progress * 0.9;
    for (const pt of particles) {
      const bob = reduceMotion ? 0 : Math.sin(t * pt.speed + pt.phase) * 0.15;
      const ang = reduceMotion ? 0 : t * 0.05 * pt.speed;
      const x = pt.base.x * Math.cos(ang) - pt.base.z * Math.sin(ang);
      const z = pt.base.x * Math.sin(ang) + pt.base.z * Math.cos(ang);
      p.set(x * spread * e, (pt.base.y + bob) * spread * e, z * spread);
      pt.rot.x += dt * pt.spin; pt.rot.y += dt * pt.spin * 0.7;
      q.setFromEuler(pt.rot);
      if (pt.mesh === seeds) s.set(pt.size, pt.size * 0.45, pt.size * 0.7); else s.setScalar(pt.size);
      s.multiplyScalar(e);
      m4.compose(p, q, s);
      pt.mesh.setMatrixAt(pt.i, m4);
    }
    seeds.instanceMatrix.needsUpdate = true;
    flakes.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
  }

  function loop() {
    if (running) return;
    running = true;
    const tick = () => {
      if (!visible || document.hidden) { running = false; return; }
      frame();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loop(); });
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
  speck(9000, ["#3a4519", "#2d3713", "#6f7f35", "#55632a"], 2.5, 1.2); // Thymian
  speck(1400, ["#8c2a1d", "#a33a24", "#6f2016"], 1.6, 1.4);            // Sumach
  speck(900, ["#f3e5c2", "#e7d3a3", "#fff3d6"], 4, 2.2);              // Sesam

  // Olivenöl-Glanz
  for (let i = 0; i < 26; i++) {
    const x = r + (Math.random() - 0.5) * r * 1.4, y = r + (Math.random() - 0.5) * r * 1.4;
    const rg = g.createRadialGradient(x, y, 0, x, y, (40 + Math.random() * 60) * k);
    rg.addColorStop(0, "rgba(214,190,80,0.22)");
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
