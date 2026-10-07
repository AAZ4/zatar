/*
 * Künefe-Seite: 3D-Künefe im Kupferblech über der Gasflamme (Three.js)
 *
 * Ablauf beim Scrollen (Abschnitt .kn, Bühne klebt oben):
 *  0  ganze Künefe dreht sich über dem Feuer, Dampf steigt auf
 *  1–6 Explosionsansicht: Blech, Teigboden, Käse, Teigdecke, Sirup, Pistazien –
 *      die aktive Schicht leuchtet, eine Linie verbindet sie mit ihrer Erklärkarte
 *  7  Schichten setzen sich zusammen, ein quadratisches Stück wird herausgehoben,
 *      der Käse zieht Fäden
 *
 * Ohne WebGL: html.no-3d -> die Karten stehen als normale Liste untereinander.
 */
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const section = document.querySelector(".kn");
const stage = document.querySelector(".kn__stage");
const cards = [...document.querySelectorAll(".kn__card")];
const intro = document.querySelector(".kn__intro");
const bars = [...document.querySelectorAll(".kn__progress span")];
const lineSvg = document.querySelector(".kn__line");
const linePath = lineSvg && lineSvg.querySelector("path");
const lineDot = lineSvg && lineSvg.querySelector("circle");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mqSmall = window.matchMedia("(max-width: 860px)");
const isRtl = document.documentElement.dir === "rtl";

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) { return false; }
}

/* ---------- Maße ---------- */
const R = 1.5;                 // Radius der Künefe
const SQ_C = 0.55, SQ_H = 0.34; // quadratisches Stück: Mitte (auf +x) und halbe Kantenlänge
const LAYERS = [               // [Name, Unterkante, Dicke, Radius]
  ["bottom", 0.006, 0.11, R],
  ["cheese", 0.116, 0.075, R - 0.07],
  ["top", 0.191, 0.1, R]
];
const STEPS = 8;

/* ---------- Hilfen ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);

function canvas2d(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")];
}

/* Kreis mit quadratischem Loch (Körper) bzw. nur das Quadrat (Stück), hochkant extrudiert */
function bodyShape(r, wavy = 0) {
  const s = new THREE.Shape();
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + wavy * (Math.sin(a * 7) * 0.6 + Math.sin(a * 13 + 1) * 0.4));
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const hole = new THREE.Path();
  hole.moveTo(SQ_C - SQ_H, -SQ_H); hole.lineTo(SQ_C - SQ_H, SQ_H);
  hole.lineTo(SQ_C + SQ_H, SQ_H); hole.lineTo(SQ_C + SQ_H, -SQ_H); hole.lineTo(SQ_C - SQ_H, -SQ_H);
  s.holes.push(hole);
  return s;
}
function squareShape() {
  const s = new THREE.Shape();
  s.moveTo(SQ_C - SQ_H, -SQ_H); s.lineTo(SQ_C + SQ_H, -SQ_H);
  s.lineTo(SQ_C + SQ_H, SQ_H); s.lineTo(SQ_C - SQ_H, SQ_H); s.lineTo(SQ_C - SQ_H, -SQ_H);
  return s;
}
function extrude(shape, depth) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.18, bevelSize: 0.012, bevelSegments: 2, curveSegments: 72 });
  g.rotateX(-Math.PI / 2);   // Form liegt flach, Dicke zeigt nach oben
  return g;
}

/* ---------- Texturen (prozedural) ---------- */
function kadaifTexture(size, toasted) {
  const [c, g] = canvas2d(size);
  g.fillStyle = toasted ? "#b8520f" : "#d98a2e";
  g.fillRect(0, 0, size, size);
  const cols = toasted
    ? ["#e07a1f", "#a3420c", "#ef9235", "#8a3608", "#f2a54d", "#c75f14", "#6e2a06"]
    : ["#e8a54e", "#cf8a33", "#f0c07a", "#b8722a", "#f5d29a"];
  const n = toasted ? 4200 : 3000;
  g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const x = Math.random() * size, y = Math.random() * size, len = rand(18, 60) * size / 1024;
    const a = Math.random() * Math.PI * 2, bend = rand(-0.9, 0.9);
    g.strokeStyle = cols[(Math.random() * cols.length) | 0];
    g.lineWidth = rand(1.2, 2.6) * size / 1024;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + bend) * len * 0.6, y + Math.sin(a + bend) * len * 0.6, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.repeat.set(1 / (2 * R), 1 / (2 * R));
  t.offset.set(0.5, 0.5);
  return t;
}
function cheeseTexture(size) {
  const [c, g] = canvas2d(size);
  g.fillStyle = "#f4ead0"; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = rand(10, 50) * size / 512;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, Math.random() < 0.5 ? "rgba(255,250,236,.55)" : "rgba(226,206,160,.35)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg; g.fillRect(0, 0, size, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(1 / (2 * R), 1 / (2 * R)); t.offset.set(0.5, 0.5);
  return t;
}
function hammeredTexture(size) {
  const [c, g] = canvas2d(size);
  g.fillStyle = "#808080"; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = rand(6, 18) * size / 512;
    const rg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    rg.addColorStop(0, "rgba(255,255,255,.35)");
    rg.addColorStop(0.7, "rgba(60,60,60,.25)");
    rg.addColorStop(1, "rgba(128,128,128,0)");
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
}
function flameTexture() {
  const [c, g] = canvas2d(128);
  const W = 128, H = 128;
  // Tropfenform: unten breit und blau, oben schmal und orange
  const grad = g.createLinearGradient(0, H, 0, 0);
  grad.addColorStop(0, "rgba(70,120,255,0.0)");
  grad.addColorStop(0.05, "rgba(90,140,255,0.85)");
  grad.addColorStop(0.16, "rgba(140,160,255,0.6)");
  grad.addColorStop(0.26, "rgba(255,200,90,0.95)");
  grad.addColorStop(0.6, "rgba(255,130,30,0.8)");
  grad.addColorStop(0.85, "rgba(240,80,10,0.4)");
  grad.addColorStop(1, "rgba(255,80,0,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(W / 2, 0);
  g.bezierCurveTo(W * 0.62, H * 0.35, W * 0.8, H * 0.7, W / 2, H);
  g.bezierCurveTo(W * 0.2, H * 0.7, W * 0.38, H * 0.35, W / 2, 0);
  g.fill();
  // weicher Rand
  g.globalCompositeOperation = "destination-in";
  const rg = g.createRadialGradient(W / 2, H * 0.62, 4, W / 2, H * 0.62, W * 0.62);
  rg.addColorStop(0, "rgba(0,0,0,1)"); rg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function softDot(color) {
  const [c, g] = canvas2d(128);
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, color); rg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* ======================================================================
   Start
   ====================================================================== */
if (section && stage && webglAvailable()) init();
else document.documentElement.classList.add("no-3d");

function init() {
  const small = () => mqSmall.matches;
  const lowPower = small();
  document.documentElement.classList.add("kn-3d");

  const canvas = document.createElement("canvas");
  canvas.className = "kn__canvas";
  canvas.setAttribute("aria-hidden", "true");
  stage.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  /* ---------- Licht ---------- */
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x1f2a1c, 0.5));
  const key = new THREE.DirectionalLight(0xffe0b4, 2.4);
  key.position.set(-3, 7, 4);
  key.castShadow = !lowPower;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe2c46a, 1.1);
  rim.position.set(4, 2, -4);
  scene.add(rim);
  const fireLight = new THREE.PointLight(0xff8a2a, 6, 4, 2);
  fireLight.position.set(0, -0.35, 0);
  scene.add(fireLight);

  const root = new THREE.Group();     // Position/Neigung der ganzen Szene
  const spinner = new THREE.Group();  // Drehung um die eigene Achse
  root.add(spinner);
  scene.add(root);

  /* ---------- Kupferblech (flach, ohne Griffe) ---------- */
  const trayProfile = [[0, 0], [1.6, 0], [1.66, 0.012], [1.8, 0.12], [1.84, 0.13]].map(([x, y]) => new THREE.Vector2(x, y));
  const trayMat = new THREE.MeshStandardMaterial({
    color: "#b8683c", metalness: 0.9, roughness: 0.32, bumpMap: hammeredTexture(512), bumpScale: 1.2,
    side: THREE.DoubleSide, transparent: true
  });
  const tray = new THREE.Mesh(new THREE.LatheGeometry(trayProfile, lowPower ? 72 : 128), trayMat);
  tray.receiveShadow = true;
  const trayGroup = new THREE.Group();
  trayGroup.add(tray);
  spinner.add(trayGroup);

  /* ---------- Teig & Käse: Körper (mit Loch) + quadratisches Stück ---------- */
  const tex = lowPower ? 768 : 1024;
  const matBottom = new THREE.MeshStandardMaterial({ map: kadaifTexture(tex, false), roughness: 0.72, transparent: true });
  const matCheese = new THREE.MeshStandardMaterial({ map: cheeseTexture(512), roughness: 0.55, emissive: "#3a2a10", emissiveIntensity: 0.12, transparent: true });
  const matTop = new THREE.MeshPhysicalMaterial({ map: kadaifTexture(tex, true), bumpMap: kadaifTexture(512, true), bumpScale: 1.5, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, transparent: true });
  const layerMat = { bottom: matBottom, cheese: matCheese, top: matTop };

  const layerGroups = {};   // je Schicht: Gruppe mit Körper + Stück
  const pieceGroup = new THREE.Group();   // alle Stück-Teile zusammen (für den Schluss)
  const pieceParts = {};
  for (const [name, y0, h, r] of LAYERS) {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(extrude(bodyShape(r, name === "top" ? 0.012 : 0.006), h), layerMat[name]);
    body.position.y = y0;
    body.castShadow = body.receiveShadow = !lowPower;
    grp.add(body);
    const piece = new THREE.Mesh(extrude(squareShape(), h), layerMat[name]);
    piece.position.y = y0;
    piece.castShadow = !lowPower;
    pieceParts[name] = piece;
    pieceGroup.add(piece);
    layerGroups[name] = grp;
    spinner.add(grp);
  }
  spinner.add(pieceGroup);

  /* ---------- Sirup (nur in der Explosionsansicht sichtbar) ---------- */
  const syrupMat = new THREE.MeshPhysicalMaterial({
    color: "#e0a325", roughness: 0.05, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.0,
    emissive: "#5a3400", emissiveIntensity: 0.25, side: THREE.DoubleSide
  });
  const syrupShape = new THREE.Shape();
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const rr = (R - 0.06) * (1 + 0.025 * Math.sin(a * 9) + 0.015 * Math.sin(a * 17 + 2));
    i ? syrupShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : syrupShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const syrupGeo = new THREE.ExtrudeGeometry(syrupShape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.02, bevelSegments: 3, curveSegments: 96 });
  syrupGeo.rotateX(-Math.PI / 2);
  const syrup = new THREE.Mesh(syrupGeo, syrupMat);
  syrup.position.y = 0.3;
  const syrupGroup = new THREE.Group();
  syrupGroup.add(syrup);
  // Tropfen, die vom Rand fallen
  const dropGeo = new THREE.SphereGeometry(1, 12, 10);
  dropGeo.scale(1, 1.5, 1);
  const drops = Array.from({ length: lowPower ? 10 : 18 }, () => {
    const m = new THREE.Mesh(dropGeo, syrupMat);
    const a = Math.random() * Math.PI * 2, rr = rand(0.3, R - 0.1);
    m.userData = { x: Math.cos(a) * rr, z: Math.sin(a) * rr, phase: Math.random(), speed: rand(0.35, 0.6), size: rand(0.022, 0.04) };
    syrupGroup.add(m);
    return m;
  });
  spinner.add(syrupGroup);

  /* ---------- Pistazien: Körper-Teil und Stück-Teil ---------- */
  const pistMat = new THREE.MeshStandardMaterial({ color: "#7aa83a", roughness: 0.6, transparent: true });
  const pistGeo = new THREE.IcosahedronGeometry(1, 0);
  const pistCount = lowPower ? 220 : 420;
  const pistData = [];
  for (let i = 0; i < pistCount; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.62 + (Math.random() < 0.25 ? rand(0.6, 1.25) : 0);
    const x = Math.cos(a) * Math.min(rr, R - 0.15), z = Math.sin(a) * Math.min(rr, R - 0.15);
    // im Quadrat? (Achtung: Form-y ist Welt -z)
    const inSq = Math.abs(x - SQ_C) < SQ_H - 0.01 && Math.abs(-z) < SQ_H - 0.01;
    pistData.push({ x, z, inSq, size: rand(0.012, 0.03), rot: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)), shade: Math.random() });
  }
  const pistBody = new THREE.InstancedMesh(pistGeo, pistMat, pistData.filter(d => !d.inSq).length);
  const pistPiece = new THREE.InstancedMesh(pistGeo, pistMat, Math.max(1, pistData.filter(d => d.inSq).length));
  const pistCols = ["#6f9e33", "#88b746", "#5c8a2a", "#a7c96a", "#c9d98f"].map(c => new THREE.Color(c));
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let ib = 0, ip = 0;
    for (const d of pistData) {
      q.setFromEuler(d.rot); s.set(d.size, d.size * 0.6, d.size * 0.8); p.set(d.x, 0, d.z);
      const col = pistCols[(d.shade * pistCols.length) | 0];
      if (d.inSq) { pistPiece.setMatrixAt(ip, m4.compose(p, q, s)); pistPiece.setColorAt(ip++, col); }
      else { pistBody.setMatrixAt(ib, m4.compose(p, q, s)); pistBody.setColorAt(ib++, col); }
    }
  }
  const pistGroup = new THREE.Group();
  pistGroup.add(pistBody);
  spinner.add(pistGroup);
  const pistPieceHolder = new THREE.Group();
  pistPieceHolder.add(pistPiece);
  pieceGroup.add(pistPieceHolder);

  /* ---------- Brenner, Topfträger und Gasflammen ---------- */
  const fireGroup = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({ color: "#2a2a2a", metalness: 0.7, roughness: 0.55, transparent: true });
  const burner = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 12, 64), iron);
  burner.rotation.x = Math.PI / 2; burner.position.y = -0.52;
  fireGroup.add(burner);
  for (let i = 0; i < 3; i++) {   // Topfträger
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.06), iron);
    arm.position.y = -0.04; arm.rotation.y = (i / 3) * Math.PI;
    fireGroup.add(arm);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), iron);
    leg.position.set(Math.cos((i / 3) * Math.PI * 2) * 0.95, -0.3, Math.sin((i / 3) * Math.PI * 2) * 0.95);
    fireGroup.add(leg);
  }
  const flameMat = new THREE.SpriteMaterial({ map: flameTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const jets = [];
  const jetCount = lowPower ? 26 : 40;
  for (let i = 0; i < jetCount; i++) {
    const a = (i / jetCount) * Math.PI * 2 + (i % 2) * 0.05;
    const outer = i % 3 !== 0;   // 2/3 der Flammen züngeln am Blechrand hoch
    const rr = outer ? rand(1.8, 1.95) : 0.62;
    const sp = new THREE.Sprite(flameMat.clone());
    sp.center.set(0.5, 0);       // Sprite wächst von unten nach oben
    sp.position.set(Math.cos(a) * rr, outer ? -0.22 : -0.5, Math.sin(a) * rr);
    const w = outer ? rand(0.16, 0.24) : 0.14, h = outer ? rand(0.42, 0.6) : 0.3;
    sp.scale.set(w, h, 1);
    sp.userData = { phase: Math.random() * 10, speed: rand(8, 14), w, h };
    fireGroup.add(sp);
    jets.push(sp);
  }
  root.add(fireGroup);   // dreht sich nicht mit

  /* ---------- Dampf ---------- */
  const steamMat = new THREE.SpriteMaterial({ map: softDot("rgba(255,255,255,0.55)"), transparent: true, depthWrite: false, opacity: 0 });
  const steam = Array.from({ length: lowPower ? 8 : 14 }, () => {
    const s = new THREE.Sprite(steamMat.clone());
    s.userData = { x: rand(-0.9, 0.9), z: rand(-0.9, 0.9), phase: Math.random(), speed: rand(0.12, 0.22) };
    root.add(s);
    return s;
  });

  /* ---------- Käsefäden zwischen Loch und Stück ---------- */
  const strandMat = new THREE.MeshStandardMaterial({ color: "#f6edd4", roughness: 0.5, emissive: "#3a2a10", emissiveIntensity: 0.1 });
  const strandAnchors = [];
  for (let i = 0; i < (lowPower ? 7 : 12); i++) {
    const t = rand(-0.85, 0.85) * SQ_H;
    const side = i % 3;   // 0: Rückwand des Lochs (−x), 1/2: Seitenwände (±z)
    const yy = rand(0.13, 0.18);
    strandAnchors.push({ side, t, y: yy, w: rand(0.006, 0.014), sag: rand(0.04, 0.14) });
  }
  const strands = strandAnchors.map(() => {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), strandMat);
    m.visible = false;
    spinner.add(m);
    return m;
  });

  /* ---------- Größe & Kamera ---------- */
  let W = 1, H = 1;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // Bild verschieben: Desktop -> Künefe links (Karte rechts), Handy -> Künefe oben (Karte unten)
    camera.updateProjectionMatrix();
  }
  // Bild verschieben: Desktop -> Start: Künefe rechts (Text links), danach links (Karte rechts)
  //                   Handy  -> Künefe oben (Text/Karte unten)
  function shiftView(p) {
    const sm = small();
    const dir = isRtl ? -1 : 1;
    const ox = sm ? 0 : dir * W * lerp(-0.2, 0.17, smooth(0.03, 0.12, p));
    const oy = sm ? H * 0.22 : 0;
    camera.setViewOffset(W, H, ox, oy, W, H);
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------- Linie zur Karte ---------- */
  const v = new THREE.Vector3();
  function project(obj, local) {
    v.copy(local);
    obj.localToWorld(v);
    v.project(camera);
    const r = stage.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * W + r.left, y: (-v.y * 0.5 + 0.5) * H + r.top };
  }
  const anchorObj = { 1: trayGroup, 2: layerGroups.bottom, 3: layerGroups.cheese, 4: layerGroups.top, 5: syrupGroup, 6: pistGroup };
  const anchorY = { 1: 0.1, 2: 0.06, 3: 0.15, 4: 0.24, 5: 0.31, 6: 0.02 };
  function drawLine(step) {
    if (!lineSvg) return;
    const card = cards[step];
    const obj = anchorObj[step];
    if (!obj || !card || !card.classList.contains("is-active")) { lineSvg.classList.remove("is-on"); return; }
    // Punkt am Rand der Schicht, der zur Karte zeigt (in Weltkoordinaten, unabhängig von der Drehung)
    const sm = small();
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    const dir = sm ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(isRtl ? -1 : 1, 0, 0.35).normalize();
    const edge = wp.clone().add(new THREE.Vector3(0, anchorY[step], 0)).add(dir.multiplyScalar(step === 6 ? 0.5 : R * 0.92));
    edge.project(camera);
    const sr = stage.getBoundingClientRect();
    const ax = (edge.x * 0.5 + 0.5) * W, ay = (-edge.y * 0.5 + 0.5) * H;
    const cr = card.getBoundingClientRect();
    let bx, by;
    if (sm) { bx = cr.left - sr.left + cr.width / 2; by = cr.top - sr.top; }
    else { bx = isRtl ? cr.right - sr.left : cr.left - sr.left; by = cr.top - sr.top + 34; }
    const mx = sm ? ax : (ax + bx) / 2;
    linePath.setAttribute("d", sm ? `M${ax},${ay} L${ax},${(ay + by) / 2} L${bx},${(ay + by) / 2} L${bx},${by}` : `M${ax},${ay} L${mx},${ay} L${mx},${by} L${bx},${by}`);
    lineDot.setAttribute("cx", ax); lineDot.setAttribute("cy", ay);
    lineSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    lineSvg.classList.add("is-on");
  }

  /* ---------- Animation ---------- */
  const clock = new THREE.Clock();
  let spin = 0, activeStep = -1;
  const allMats = { tray: trayMat, bottom: matBottom, cheese: matCheese, top: matTop, syrup: syrupMat, pist: pistMat };
  const stepMat = { 1: "tray", 2: "bottom", 3: "cheese", 4: "top", 5: "syrup", 6: "pist" };
  const opac = {};
  for (const k in allMats) opac[k] = 1;
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);

  function setStep(step) {
    if (step === activeStep) return;
    activeStep = step;
    cards.forEach((c, i) => c.classList.toggle("is-active", i === step));
    bars.forEach((b, i) => b.classList.toggle("is-done", i <= step));
    if (intro) intro.classList.toggle("is-hidden", step > 0);
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const sr = section.getBoundingClientRect();
    const total = Math.max(1, sr.height - window.innerHeight);
    const p = clamp(-sr.top / total);
    const sm = small();

    setStep(Math.min(STEPS - 1, Math.floor(p * STEPS)));

    const explode = smooth(0.1, 0.2, p) * (1 - smooth(0.76, 0.86, p));
    const fire = 1 - smooth(0.07, 0.16, p);
    const fin = smooth(0.87, 0.97, p);

    // Kamera: von schräg oben; in der Explosionsansicht etwas weiter weg und flacher
    const dist = lerp(sm ? 12.5 : 7.4, sm ? 15 : 9.4, explode) * lerp(1, sm ? 1.04 : 0.95, fin);
    const elev = lerp(0.5, 0.36, explode) + fin * 0.12;
    camera.position.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist);
    camera.lookAt(0, lerp(0.1, 1.05, explode), 0);
    shiftView(p);

    // Drehen: im Feuer schneller, beim Stück auf eine feste Ansicht einschwenken
    if (!reduceMotion) spin += dt * lerp(0.35, 0.12, explode);
    // Handy: Stück kommt direkt nach vorne; Desktop: schräg zur Seite der Karte hin
    const target = sm ? -Math.PI / 2 : (isRtl ? -Math.PI * 0.75 : -Math.PI / 4);
    const base = spin % (Math.PI * 2);
    let diff = ((target - base + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    spinner.rotation.y = base + diff * fin;

    // Schichten auseinanderziehen
    trayGroup.position.y = -0.25 * explode;
    layerGroups.bottom.position.y = 0.32 * explode;
    layerGroups.cheese.position.y = 0.72 * explode;
    layerGroups.top.position.y = 1.12 * explode;
    syrupGroup.position.y = 1.42 * explode;
    pistGroup.position.y = 0.302 + 1.78 * explode;
    pieceParts.bottom.position.y = LAYERS[0][1] + 0.32 * explode;
    pieceParts.cheese.position.y = LAYERS[1][1] + 0.72 * explode;
    pieceParts.top.position.y = LAYERS[2][1] + 1.12 * explode;
    pistPieceHolder.position.y = 0.302 + 1.78 * explode;

    // Stück herausheben (erst hoch, dann nach außen)
    const lift = smooth(0, 0.45, fin), out = smooth(0.25, 1, fin);
    pieceGroup.position.set(out * 0.95, lift * 0.42, 0);
    pieceGroup.rotation.z = -0.12 * out;

    // Sirup sichtbar nur in der Explosionsansicht; Tropfen fallen
    syrupMat.opacity = 0.82 * explode * (opac.syrup ?? 1);
    for (const d of drops) {
      const u = d.userData;
      const k = ((t * u.speed + u.phase) % 1);
      d.position.set(u.x, 0.3 - k * 0.38, u.z);
      d.scale.setScalar(u.size * explode * (k < 0.9 ? 1 : (1 - k) * 10));
    }

    // Aktive Schicht hervorheben, andere abdunkeln
    const hl = explode > 0.3 ? stepMat[activeStep] : null;
    for (const k in allMats) {
      const want = hl && hl !== k ? 0.18 : 1;
      opac[k] += (want - opac[k]) * 0.12;
      const m = allMats[k];
      if (k !== "syrup") { m.opacity = opac[k]; m.depthWrite = opac[k] > 0.9; }
      if (m.emissive && k !== "syrup") m.emissiveIntensity = (k === "cheese" ? 0.12 : 0) + (hl === k ? 0.18 : 0);
    }
    if (hl === "tray" || hl === null) trayMat.emissive.set("#2a1006"); else trayMat.emissive.set("#000000");

    // Feuer
    fireGroup.visible = fire > 0.01;
    iron.opacity = fire;
    for (const sp of jets) {
      const u = sp.userData;
      const f = reduceMotion ? 1 : 0.8 + 0.22 * Math.sin(t * u.speed + u.phase) + 0.12 * Math.sin(t * u.speed * 2.3 + u.phase * 3);
      sp.scale.set(u.w * (0.9 + 0.1 * f), u.h * f, 1);
      sp.material.opacity = fire * (0.75 + 0.25 * f);
    }
    fireLight.intensity = 6 * fire * (reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 11));

    // Dampf über der heißen Künefe (am Anfang und beim Stück)
    const steamVis = Math.max(1 - smooth(0.06, 0.14, p), fin) * (reduceMotion ? 0 : 1);
    for (const s of steam) {
      const u = s.userData;
      const k = (t * u.speed + u.phase) % 1;
      s.position.set(u.x + Math.sin(t + u.phase * 6) * 0.08, 0.4 + k * 1.3, u.z);
      s.scale.setScalar(0.35 + k * 0.6);
      s.material.opacity = 0.22 * steamVis * Math.sin(k * Math.PI);
    }

    // Käsefäden
    const showStrands = fin > 0.02;
    const pp = pieceGroup.position;
    strandAnchors.forEach((a, i) => {
      const m = strands[i];
      m.visible = showStrands;
      if (!showStrands) return;
      let from, to;
      if (a.side === 0) { from = new THREE.Vector3(SQ_C - SQ_H, a.y, a.t); to = new THREE.Vector3(SQ_C - SQ_H + pp.x, a.y + pp.y, a.t); }
      else { const zz = a.side === 1 ? SQ_H : -SQ_H; from = new THREE.Vector3(SQ_C + a.t * 0.6, a.y, zz); to = new THREE.Vector3(SQ_C + a.t * 0.6 + pp.x, a.y + pp.y, zz); }
      const mid = from.clone().lerp(to, 0.5); mid.y -= a.sag * fin;
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      m.geometry.dispose();
      m.geometry = new THREE.TubeGeometry(curve, 10, a.w * (1 - 0.4 * fin), 5, false);
    });

    root.position.y = sm ? -0.1 : -0.15;
    renderer.render(scene, camera);
    if (activeStep >= 0) drawLine(activeStep);
  }

  // Nur rendern, solange der Abschnitt sichtbar ist
  let visible = true, running = false;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    document.body.classList.toggle("kn-in-scene", e.isIntersecting && e.intersectionRatio > 0.2);
    if (visible) loop();
  }, { threshold: [0, 0.2, 0.5] }).observe(section);
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
  document.addEventListener("visibilitychange", () => loop());
  loop();
  document.documentElement.classList.add("kn-ready");
}
