/*
 * Künefe-Seite: 3D-Künefe im Kupferblech auf dem Gasherd (Three.js)
 *
 * Ablauf beim Scrollen (Abschnitt .kn, Bühne klebt oben):
 *  0  ganze Künefe dreht sich auf dem Herd, Gasflammen züngeln am Blechrand hoch
 *  1–6 Explosionsansicht: Blech, Teigboden, Käse, Teigdecke, Sirup, Pistazien –
 *      die aktive Schicht leuchtet, eine Linie verbindet sie mit ihrer Erklärkarte
 *  7  Schichten setzen sich zusammen, ein Messer schneidet ein Quadrat,
 *      der Tortenheber fährt darunter und hebt das Stück heraus – der Käse zieht Fäden
 *
 * html.kn-3d wird schon im <head> gesetzt (kein Aufblitzen der Karten als Liste),
 * html.kn-ready nach dem ersten Bild. Ohne WebGL: html.no-3d -> Karten als Liste.
 */
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const root$ = document.documentElement;
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
const isRtl = root$.dir === "rtl";

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) { return false; }
}
function fallback() {
  root$.classList.remove("kn-3d", "kn-ready");
  root$.classList.add("no-3d");
}

/* ---------- Maße ---------- */
const R = 1.5;                 // Radius der Künefe
const SQ_C = 0.55, SQ_H = 0.34; // quadratisches Stück: Mitte (auf +x) und halbe Kantenlänge
const LAYERS = [               // [Name, Unterkante, Dicke, Radius]
  ["bottom", 0.03, 0.11, R],
  ["cheese", 0.14, 0.075, R - 0.07],
  ["top", 0.215, 0.1, R]
];
const TOP_Y = 0.333;           // Oberfläche der Teigdecke
// Scroll-Abschnitte: ab welchem Fortschritt welche Karte aktiv ist (letzter Schritt bekommt mehr Platz)
const STEP_AT = [0, 0.11, 0.21, 0.31, 0.41, 0.51, 0.61, 0.75];

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

/* Kreis (optional mit quadratischem Loch) bzw. nur das Quadrat, hochkant extrudiert */
function discShape(r, wavy = 0, hole = false) {
  const s = new THREE.Shape();
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + wavy * (Math.sin(a * 7) * 0.6 + Math.sin(a * 13 + 1) * 0.4));
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  if (hole) {
    const h = new THREE.Path();
    h.moveTo(SQ_C - SQ_H, -SQ_H); h.lineTo(SQ_C - SQ_H, SQ_H);
    h.lineTo(SQ_C + SQ_H, SQ_H); h.lineTo(SQ_C + SQ_H, -SQ_H); h.lineTo(SQ_C - SQ_H, -SQ_H);
    s.holes.push(h);
  }
  return s;
}
function squareShape() {
  const s = new THREE.Shape();
  s.moveTo(SQ_C - SQ_H, -SQ_H); s.lineTo(SQ_C + SQ_H, -SQ_H);
  s.lineTo(SQ_C + SQ_H, SQ_H); s.lineTo(SQ_C - SQ_H, SQ_H); s.lineTo(SQ_C - SQ_H, -SQ_H);
  return s;
}
function extrude(shape, depth, bevel = true) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel, bevelThickness: depth * 0.18, bevelSize: 0.012, bevelSegments: 2, curveSegments: 72
  });
  g.rotateX(-Math.PI / 2);   // Form liegt flach, Dicke zeigt nach oben (Form-y = Welt −z)
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
function woodTexture(size) {
  const [c, g] = canvas2d(size);
  g.fillStyle = "#3a2214"; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = Math.random() < 0.5 ? "rgba(20,10,4,.45)" : "rgba(110,64,34,.35)";
    g.lineWidth = rand(1, 3);
    const y = Math.random() * size;
    g.beginPath(); g.moveTo(0, y);
    g.bezierCurveTo(size * 0.3, y + rand(-8, 8), size * 0.7, y + rand(-8, 8), size, y + rand(-4, 4));
    g.stroke();
  }
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

/* ---------- Shader fürs Feuer ---------- */
// Flammen-Partikel: weiche Punkte, Farbe nach "Hitze" (blau an der Düse -> gelb -> orange -> rot)
const FLAME_VS = `
  attribute float aSize; attribute float aHeat; attribute float aAlpha;
  uniform float uScale;
  varying float vHeat; varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / -mv.z;
    vHeat = aHeat; vAlpha = aAlpha;
  }`;
const FLAME_FS = `
  uniform float uFire;
  varying float vHeat; varying float vAlpha;
  vec3 ramp(float h) {
    vec3 c = mix(vec3(0.22, 0.42, 1.0), vec3(1.0, 0.86, 0.5), smoothstep(0.0, 0.22, h));
    c = mix(c, vec3(1.0, 0.48, 0.1), smoothstep(0.25, 0.6, h));
    return mix(c, vec3(0.6, 0.12, 0.03), smoothstep(0.62, 1.0, h));
  }
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    d.y *= 0.8;                                  // leicht hochgezogen
    float a = smoothstep(0.5, 0.0, length(d));
    gl_FragColor = vec4(ramp(vHeat), a * a * vAlpha * uFire);
  }`;
// Blaue Gaskegel direkt an den Brennerdüsen
const JET_VS = `
  varying float vH;
  void main() {
    vH = position.y / 0.13 + 0.5;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }`;
const JET_FS = `
  uniform float uFire;
  varying float vH;
  void main() {
    vec3 c = mix(vec3(0.55, 0.72, 1.0), vec3(0.18, 0.32, 1.0), vH);
    gl_FragColor = vec4(c, pow(1.0 - vH, 0.8) * 0.75 * uFire);
  }`;

/* ======================================================================
   Start
   ====================================================================== */
if (section && stage && webglAvailable()) {
  try { init(); } catch (e) { console.error(e); fallback(); }
} else fallback();

function init() {
  const small = () => mqSmall.matches;
  const lowPower = small();
  root$.classList.add("kn-3d");

  const canvas = document.createElement("canvas");
  canvas.className = "kn__canvas";
  canvas.setAttribute("aria-hidden", "true");
  stage.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: "high-performance" });
  const pixelRatio = Math.min(window.devicePixelRatio, lowPower ? 1.6 : 2);
  renderer.setPixelRatio(pixelRatio);
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
  const fireLight = new THREE.PointLight(0xff7a20, 9, 5, 2);   // glüht von unten gegen Blech und Herd
  fireLight.position.set(0, -0.3, 0);
  scene.add(fireLight);

  const root = new THREE.Group();     // Position der ganzen Szene
  const spinner = new THREE.Group();  // Drehung um die eigene Achse
  root.add(spinner);
  scene.add(root);

  /* ---------- Kupferblech (flach, ohne Griffe) ---------- */
  const trayProfile = [[0, 0], [1.6, 0], [1.66, 0.012], [1.8, 0.12], [1.84, 0.13]].map(([x, y]) => new THREE.Vector2(x, y));
  const trayMat = new THREE.MeshStandardMaterial({
    color: "#b8683c", metalness: 0.9, roughness: 0.32, bumpMap: hammeredTexture(512), bumpScale: 1.2,
    side: THREE.DoubleSide, transparent: true, emissive: "#ff6a1a", emissiveIntensity: 0
  });
  const tray = new THREE.Mesh(new THREE.LatheGeometry(trayProfile, lowPower ? 72 : 128), trayMat);
  tray.receiveShadow = true;
  const trayGroup = new THREE.Group();
  trayGroup.add(tray);
  spinner.add(trayGroup);

  /* ---------- Teig & Käse ----------
     je Schicht: ganze Scheibe (bis zum Schnitt) bzw. Körper mit Loch + quadratisches Stück (ab dem Schnitt) */
  const tex = lowPower ? 768 : 1024;
  const matBottom = new THREE.MeshStandardMaterial({ map: kadaifTexture(tex, false), roughness: 0.72, transparent: true });
  const matCheese = new THREE.MeshStandardMaterial({ map: cheeseTexture(512), roughness: 0.55, emissive: "#3a2a10", emissiveIntensity: 0.12, transparent: true });
  const matTop = new THREE.MeshPhysicalMaterial({ map: kadaifTexture(tex, true), bumpMap: kadaifTexture(512, true), bumpScale: 1.5, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, transparent: true });
  const layerMat = { bottom: matBottom, cheese: matCheese, top: matTop };

  const layerGroups = {};
  const wholes = [], bodies = [];
  const pieceGroup = new THREE.Group();   // alle Stück-Teile zusammen (für den Schluss)
  const pieceParts = {};
  for (const [name, y0, h, r] of LAYERS) {
    const wavy = name === "top" ? 0.012 : 0.006;
    const grp = new THREE.Group();
    const whole = new THREE.Mesh(extrude(discShape(r, wavy), h), layerMat[name]);
    const body = new THREE.Mesh(extrude(discShape(r, wavy, true), h), layerMat[name]);
    for (const m of [whole, body]) {
      m.position.y = y0;
      m.castShadow = m.receiveShadow = !lowPower;
      grp.add(m);
    }
    body.visible = false;
    wholes.push(whole); bodies.push(body);
    const piece = new THREE.Mesh(extrude(squareShape(), h), layerMat[name]);
    piece.position.y = y0;
    piece.castShadow = !lowPower;
    piece.visible = false;
    pieceParts[name] = piece;
    pieceGroup.add(piece);
    layerGroups[name] = grp;
    spinner.add(grp);
  }
  spinner.add(pieceGroup);
  function setCut(isCut) {
    wholes.forEach(m => { m.visible = !isCut; });
    bodies.forEach(m => { m.visible = isCut; });
    for (const k in pieceParts) pieceParts[k].visible = isCut;
  }

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
  syrup.position.y = 0.324;
  const syrupGroup = new THREE.Group();
  syrupGroup.add(syrup);
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
  const PIST_Y = TOP_Y - 0.007;
  const pistMat = new THREE.MeshStandardMaterial({ color: "#7aa83a", roughness: 0.6, transparent: true });
  const pistGeo = new THREE.IcosahedronGeometry(1, 0);
  const pistCount = lowPower ? 220 : 420;
  const pistData = [];
  for (let i = 0; i < pistCount; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.62 + (Math.random() < 0.25 ? rand(0.6, 1.25) : 0);
    const x = Math.cos(a) * Math.min(rr, R - 0.15), z = Math.sin(a) * Math.min(rr, R - 0.15);
    const inSq = Math.abs(x - SQ_C) < SQ_H - 0.01 && Math.abs(z) < SQ_H - 0.01;
    const onEdge = !inSq && Math.abs(x - SQ_C) < SQ_H + 0.02 && Math.abs(z) < SQ_H + 0.02;
    if (onEdge) continue;   // keine Pistazie auf der Schnittkante
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

  /* ---------- Gasherd: Gusseisen-Brenner, Topfträger, Beine, Gasleitung mit Hahn ---------- */
  const stove = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({ color: "#26231f", metalness: 0.75, roughness: 0.5, transparent: true });
  const brass = new THREE.MeshStandardMaterial({ color: "#b8913a", metalness: 1, roughness: 0.3, transparent: true });
  const knobMat = new THREE.MeshStandardMaterial({ color: "#151515", metalness: 0.2, roughness: 0.45, transparent: true });
  const stoveMats = [iron, brass, knobMat];
  const BURN_Y = -0.46;   // Oberkante der Brennerringe (dort sitzen die Düsen)
  const addMesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); stove.add(m); return m; };
  // Brennerkopf: zwei Ringe, Speichen und Nabe
  for (const [rr, tube] of [[0.95, 0.07], [0.5, 0.06]]) {
    const ring = addMesh(new THREE.TorusGeometry(rr, tube, 12, lowPower ? 48 : 80), iron, 0, BURN_Y - tube * 0.6);
    ring.rotation.x = Math.PI / 2;
    ring.scale.z = 1.5;   // etwas höher als breit
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const spoke = addMesh(new THREE.BoxGeometry(0.9, 0.06, 0.08), iron, Math.cos(a) * 0.5, BURN_Y - 0.08, -Math.sin(a) * 0.5);
    spoke.rotation.y = a;
  }
  addMesh(new THREE.CylinderGeometry(0.18, 0.22, 0.18, 24), iron, 0, BURN_Y - 0.1);
  // Topfträger: Ring mit sechs Fingern, auf denen das Blech steht, drei Beine bis zum Fußring
  const stand = addMesh(new THREE.TorusGeometry(1.5, 0.04, 8, lowPower ? 64 : 96), iron, 0, -0.07);
  stand.rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const f = addMesh(new THREE.BoxGeometry(0.62, 0.065, 0.06), iron, Math.cos(a) * 1.28, -0.035, -Math.sin(a) * 1.28);
    f.rotation.y = a;
  }
  const FOOT_Y = -1.0;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const top = new THREE.Vector3(Math.cos(a) * 1.5, -0.07, -Math.sin(a) * 1.5);
    const bot = new THREE.Vector3(Math.cos(a) * 1.7, FOOT_Y, -Math.sin(a) * 1.7);
    const len = top.distanceTo(bot);
    const leg = addMesh(new THREE.CylinderGeometry(0.04, 0.05, len, 10), iron);
    leg.position.copy(top).lerp(bot, 0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bot.clone().sub(top).normalize());
    addMesh(new THREE.CylinderGeometry(0.11, 0.13, 0.04, 16), iron, bot.x, FOOT_Y - 0.01, bot.z);
  }
  const footRing = addMesh(new THREE.TorusGeometry(1.7, 0.03, 8, lowPower ? 64 : 96), iron, 0, FOOT_Y + 0.12);
  footRing.rotation.x = Math.PI / 2;
  // Gasleitung von der Nabe nach vorne zum Hahn
  const pipePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, BURN_Y - 0.18, 0), new THREE.Vector3(0, -0.8, 0.05),
    new THREE.Vector3(0, -0.86, 0.6), new THREE.Vector3(0.05, -0.86, 1.6), new THREE.Vector3(0.05, -0.86, 2.0)
  ]);
  addMesh(new THREE.TubeGeometry(pipePath, 40, 0.035, 10, false), brass);
  const valve = addMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 16), brass, 0.05, -0.86, 2.05);
  valve.rotation.x = Math.PI / 2;
  addMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 10), brass, 0.05, -0.75, 2.05);
  const knob = addMesh(new THREE.CylinderGeometry(0.11, 0.12, 0.08, 20), knobMat, 0.05, -0.66, 2.05);
  addMesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), knobMat, 0.05, -0.6, 2.05).rotation.y = 0.5;
  knob.castShadow = false;
  stove.traverse(o => { if (o.isMesh) o.receiveShadow = !lowPower; });
  root.add(stove);   // dreht sich nicht mit

  // Düsen auf beiden Ringen
  const PORTS = [];
  const outerN = lowPower ? 36 : 54, innerN = lowPower ? 18 : 26;
  for (let i = 0; i < outerN; i++) PORTS.push({ a: (i / outerN) * Math.PI * 2, r: 0.95 });
  for (let i = 0; i < innerN; i++) PORTS.push({ a: ((i + 0.5) / innerN) * Math.PI * 2, r: 0.5 });

  // Blaue Gaskegel (stehen ruhig, wie bei echten Brennern)
  const jetMat = new THREE.ShaderMaterial({
    vertexShader: JET_VS, fragmentShader: JET_FS, uniforms: { uFire: { value: 1 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const jetGeo = new THREE.ConeGeometry(0.03, 0.13, 8, 1, true);
  const jetMesh = new THREE.InstancedMesh(jetGeo, jetMat, PORTS.length);
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    PORTS.forEach((pt, i) => {
      // leicht nach außen geneigt
      q.setFromAxisAngle(new THREE.Vector3(Math.sin(pt.a), 0, Math.cos(pt.a)), -0.25);
      p.set(Math.cos(pt.a) * pt.r, BURN_Y + 0.06, -Math.sin(pt.a) * pt.r);
      s.set(1, rand(0.85, 1.15), 1);
      jetMesh.setMatrixAt(i, m4.compose(p, q, s));
    });
  }
  jetMesh.frustumCulled = false;
  root.add(jetMesh);

  // Flammen-Partikel: steigen von den Düsen auf, laufen unter dem Blech nach außen und züngeln am Rand hoch
  const RIM = 1.86, UNDER_Y = -0.035, A_LEN = UNDER_Y - BURN_Y;
  const FN = lowPower ? 620 : 1300, SN = lowPower ? 16 : 34;   // Flammen + Funken
  const total = FN + SN;
  const fPos = new Float32Array(total * 3), fSize = new Float32Array(total), fHeat = new Float32Array(total), fAlpha = new Float32Array(total);
  const parts = [];
  function spawnFlame(o, initial) {
    const pt = PORTS[(Math.random() * PORTS.length) | 0];
    o.spark = false;
    o.a = pt.a + rand(-0.03, 0.03); o.r0 = pt.r;
    o.speed = rand(1.4, 2.2); o.life = rand(0.55, 1.15) * (pt.r < 0.7 ? 1.2 : 1);
    o.age = initial ? Math.random() * o.life : 0;
    o.ph = Math.random() * 6.28; o.sz = rand(0.75, 1.3);
    return o;
  }
  function spawnSpark(o, initial) {
    o.spark = true;
    o.a = Math.random() * Math.PI * 2; o.r0 = rand(1.75, 2.0);
    o.speed = rand(0.45, 0.85); o.life = rand(1.1, 2.0);
    o.age = initial ? Math.random() * o.life : 0;
    o.ph = Math.random() * 6.28; o.sz = rand(0.6, 1.2);
    return o;
  }
  for (let i = 0; i < FN; i++) parts.push(spawnFlame({}, true));
  for (let i = 0; i < SN; i++) parts.push(spawnSpark({}, true));
  const fireGeo = new THREE.BufferGeometry();
  fireGeo.setAttribute("position", new THREE.BufferAttribute(fPos, 3).setUsage(THREE.DynamicDrawUsage));
  fireGeo.setAttribute("aSize", new THREE.BufferAttribute(fSize, 1).setUsage(THREE.DynamicDrawUsage));
  fireGeo.setAttribute("aHeat", new THREE.BufferAttribute(fHeat, 1).setUsage(THREE.DynamicDrawUsage));
  fireGeo.setAttribute("aAlpha", new THREE.BufferAttribute(fAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  const flameMat = new THREE.ShaderMaterial({
    vertexShader: FLAME_VS, fragmentShader: FLAME_FS,
    uniforms: { uScale: { value: 1 }, uFire: { value: 1 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const flames = new THREE.Points(fireGeo, flameMat);
  flames.frustumCulled = false;
  root.add(flames);

  function updateFire(dt, t) {
    for (let i = 0; i < total; i++) {
      const o = parts[i];
      o.age += dt;
      if (o.age > o.life) (o.spark ? spawnSpark : spawnFlame)(o, false);
      const k = o.age / o.life;
      let r, y, a = o.a, size, heat, alpha;
      if (o.spark) {
        y = 0.05 + o.age * o.speed;
        r = o.r0 + o.age * 0.12;
        a += Math.sin(t * 2 + o.ph) * 0.05;
        size = 0.035 * o.sz; heat = 0.18 + k * 0.5;
        alpha = smooth(0, 0.1, k) * (1 - k) * (0.6 + 0.4 * Math.sin(t * 20 + o.ph));
      } else {
        const s = o.age * o.speed;
        const r1 = o.r0 + 0.06, B = RIM - r1;
        if (s < A_LEN) { y = BURN_Y + s; r = o.r0 + (s / A_LEN) * 0.06; }
        else if (s < A_LEN + B) { y = UNDER_Y; r = r1 + (s - A_LEN); }
        else {   // am Rand hoch, flackernd
          const u = s - A_LEN - B;
          y = UNDER_Y + u * 0.9;
          r = RIM + 0.02 + u * 0.2 + Math.sin(t * 9 + o.ph + u * 6) * 0.03;
        }
        a += Math.sin(t * 5 + o.ph + s * 4) * 0.025;
        y += Math.sin(t * 11 + o.ph) * 0.012;
        size = (0.05 + Math.min(s, 1.3) * 0.15) * o.sz * (1 - k * k * k * 0.6);
        heat = s < 0.08 ? 0 : clamp(0.2 + 0.24 * (s - 0.08) + 0.35 * k * k);
        alpha = smooth(0, 0.06, k) * Math.pow(1 - k, 1.3) * (s < 0.1 ? 0.7 : 0.42);
      }
      fPos[i * 3] = Math.cos(a) * r;
      fPos[i * 3 + 1] = y;
      fPos[i * 3 + 2] = -Math.sin(a) * r;
      fSize[i] = size; fHeat[i] = heat; fAlpha[i] = alpha;
    }
    for (const n of ["position", "aSize", "aHeat", "aAlpha"]) fireGeo.attributes[n].needsUpdate = true;
  }
  updateFire(0, 0);

  // warmer Lichtschein unter dem Herd
  const glowMat = new THREE.MeshBasicMaterial({ map: softDot("rgba(255,120,30,1)"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = FOOT_Y - 0.02;
  root.add(glow);

  /* ---------- Dampf ---------- */
  const steamMat = new THREE.SpriteMaterial({ map: softDot("rgba(255,255,255,0.55)"), transparent: true, depthWrite: false, opacity: 0 });
  const steam = Array.from({ length: lowPower ? 8 : 14 }, () => {
    const s = new THREE.Sprite(steamMat.clone());
    s.userData = { x: rand(-0.9, 0.9), z: rand(-0.9, 0.9), phase: Math.random(), speed: rand(0.12, 0.22) };
    root.add(s);
    return s;
  });

  /* ---------- Messer (schneidet das Quadrat) ---------- */
  const steel = new THREE.MeshStandardMaterial({ color: "#e4e4e8", metalness: 1, roughness: 0.18, transparent: true });
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(256), roughness: 0.55, transparent: true });
  const toolMats = [steel, wood];
  const knife = new THREE.Group();
  {
    // Klinge hochkant, Spitze unten (0,0), Schneide zeigt in Laufrichtung (+x)
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.17, 0.12, 0.17, 0.62);
    s.lineTo(0, 0.62);
    s.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 24 });
    g.translate(0, 0, -0.004);
    knife.add(new THREE.Mesh(g, steel));
    const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.03), steel);
    bolster.position.set(0.085, 0.64, 0);
    knife.add(bolster);
    const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.34, 4, 12), wood);
    handle.scale.set(1.5, 1, 0.8);
    handle.position.set(0.09, 0.86, 0);
    knife.add(handle);
  }
  knife.visible = false;
  spinner.add(knife);
  // Schnittlinien auf der Oberfläche (wachsen hinter dem Messer her)
  const SQ = [[SQ_C - SQ_H, SQ_H], [SQ_C + SQ_H, SQ_H], [SQ_C + SQ_H, -SQ_H], [SQ_C - SQ_H, -SQ_H]];   // [x, z]
  const cutMat = new THREE.MeshStandardMaterial({ color: "#4a1f05", roughness: 1, transparent: true });
  const cutGeo = new THREE.BoxGeometry(1, 0.008, 0.016);
  cutGeo.translate(0.5, 0, 0);
  const cutLines = SQ.map(([x, z], i) => {
    const [nx, nz] = SQ[(i + 1) % 4];
    const m = new THREE.Mesh(cutGeo, cutMat);
    m.position.set(x, TOP_Y + 0.002, z);
    m.rotation.y = Math.atan2(-(nz - z), nx - x);
    m.userData.len = Math.hypot(nx - x, nz - z);
    m.visible = false;
    spinner.add(m);
    return m;
  });
  function pointOnSquare(u) {   // u 0..1 einmal ringsum
    const f = clamp(u) * 4, i = Math.min(3, Math.floor(f)), k = f - i;
    const [x0, z0] = SQ[i], [x1, z1] = SQ[(i + 1) % 4];
    return { x: lerp(x0, x1, k), z: lerp(z0, z1, k), yaw: Math.atan2(-(z1 - z0), x1 - x0) };
  }

  /* ---------- Tortenheber (fährt unter das Stück und hebt es heraus) ---------- */
  const server = new THREE.Group();
  {
    // Blatt + flacher Schaft (liegt auf dem Blechboden unter dem Stück)
    const s = new THREE.Shape();
    s.moveTo(0.22, -0.06);
    s.quadraticCurveTo(0.17, 0, 0.22, 0.06);
    s.lineTo(0.92, 0.29);
    s.quadraticCurveTo(1.0, 0.31, 1.02, 0.2);
    s.lineTo(1.08, 0.045);
    s.lineTo(1.56, 0.035);
    s.lineTo(1.56, -0.035);
    s.lineTo(1.08, -0.045);
    s.lineTo(1.02, -0.2);
    s.quadraticCurveTo(1.0, -0.31, 0.92, -0.29);
    s.lineTo(0.22, -0.06);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.004, bevelSegments: 1, curveSegments: 16 });
    g.rotateX(-Math.PI / 2);
    const blade = new THREE.Mesh(g, steel);
    blade.position.y = 0.0;
    server.add(blade);
    // Hals steigt über den Blechrand
    const n0 = new THREE.Vector3(1.55, 0.006, 0), n1 = new THREE.Vector3(1.92, 0.27, 0);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(n0.distanceTo(n1), 0.014, 0.07), steel);
    neck.position.copy(n0).lerp(n1, 0.5);
    neck.rotation.z = Math.atan2(n1.y - n0.y, n1.x - n0.x);
    server.add(neck);
    // Griff
    const dir = new THREE.Vector3(Math.cos(0.22), Math.sin(0.22), 0);
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.09, 16), steel);
    ferrule.position.copy(n1).addScaledVector(dir, 0.04);
    ferrule.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    server.add(ferrule);
    const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.6, 4, 14), wood);
    handle.position.copy(n1).addScaledVector(dir, 0.43);
    handle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    handle.scale.set(1, 1, 0.75);
    server.add(handle);
    server.traverse(o => { if (o.isMesh) o.castShadow = !lowPower; });
  }
  server.visible = false;
  spinner.add(server);

  /* ---------- Käsefäden zwischen Loch und Stück ---------- */
  const strandMat = new THREE.MeshStandardMaterial({ color: "#f6edd4", roughness: 0.5, emissive: "#3a2a10", emissiveIntensity: 0.1 });
  const strandAnchors = [];
  for (let i = 0; i < (lowPower ? 8 : 14); i++) {
    const t = rand(-0.85, 0.85) * SQ_H;
    const side = i % 3;   // 0: Rückwand des Lochs (−x), 1/2: Seitenwände (±z)
    strandAnchors.push({ side, t, y: rand(0.15, 0.2), w: rand(0.006, 0.014), sag: rand(0.04, 0.14) });
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
    camera.updateProjectionMatrix();
    flameMat.uniforms.uScale.value = (H * pixelRatio) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  }
  // Bild verschieben: Desktop -> Start: Künefe rechts (Text links), danach links (Karte rechts)
  //                   Handy  -> Künefe oben (Text/Karte unten)
  function shiftView(p) {
    const sm = small();
    const dir = isRtl ? -1 : 1;
    const ox = sm ? 0 : dir * W * lerp(-0.2, 0.17, smooth(0.03, 0.12, p));
    const oy = sm ? H * 0.2 : 0;
    camera.setViewOffset(W, H, ox, oy, W, H);
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------- Linie zur Karte ---------- */
  const anchorObj = { 1: trayGroup, 2: layerGroups.bottom, 3: layerGroups.cheese, 4: layerGroups.top, 5: syrupGroup, 6: pistGroup };
  const anchorY = { 1: 0.1, 2: 0.08, 3: 0.17, 4: 0.26, 5: 0.33, 6: 0.02 };
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
  let spin = 0, activeStep = -1, knifeYaw = null;
  const allMats = { tray: trayMat, bottom: matBottom, cheese: matCheese, top: matTop, syrup: syrupMat, pist: pistMat };
  const stepMat = { 1: "tray", 2: "bottom", 3: "cheese", 4: "top", 5: "syrup", 6: "pist" };
  const opac = {};
  for (const k in allMats) opac[k] = 1;

  function setStep(step) {
    if (step === activeStep) return;
    activeStep = step;
    cards.forEach((c, i) => c.classList.toggle("is-active", i === step));
    bars.forEach((b, i) => b.classList.toggle("is-done", i <= step));
    if (intro) intro.classList.toggle("is-hidden", step > 0);
  }
  const fadeMats = (mats, o) => mats.forEach(m => { m.opacity = o; m.depthWrite = o > 0.9; });

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const sr = section.getBoundingClientRect();
    const totalScroll = Math.max(1, sr.height - window.innerHeight);
    const p = clamp(-sr.top / totalScroll);
    const sm = small();

    let step = 0;
    for (let i = 0; i < STEP_AT.length; i++) if (p >= STEP_AT[i]) step = i;
    setStep(step);

    const explode = smooth(0.08, 0.16, p) * (1 - smooth(0.7, 0.77, p));
    const fire = 1 - smooth(0.06, 0.13, p);
    const rise = smooth(0.03, 0.12, p);    // Kamera hebt sich aus der Herd-Ansicht
    const turn = smooth(0.75, 0.8, p);     // Schluss: auf feste Ansicht einschwenken
    const cut = smooth(0.78, 0.87, p);     // Messer schneidet
    const serve = smooth(0.87, 0.92, p);   // Tortenheber fährt darunter
    const lift = smooth(0.92, 0.985, p);   // Stück wird herausgehoben

    // Kamera: Start flach (Herd und Flammen sichtbar), dann von schräg oben
    const dist = lerp(sm ? 13.2 : 8.2, sm ? 15 : 9.4, explode) * lerp(1, sm ? 0.98 : 0.9, turn);
    const elev = lerp(lerp(0.3, 0.5, rise), 0.36, explode) + turn * 0.1;
    camera.position.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist);
    camera.lookAt(0, lerp(lerp(-0.35, 0.05, rise), 1.05, explode) + turn * 0.2, 0);
    shiftView(p);

    // Drehen: im Feuer schneller, zum Schneiden auf eine feste Ansicht einschwenken
    if (!reduceMotion) spin += dt * lerp(0.35, 0.12, explode) * (1 - turn);
    // Handy: Stück kommt direkt nach vorne; Desktop: schräg zur Seite der Karte hin
    const target = sm ? -Math.PI / 2 : (isRtl ? -Math.PI * 0.65 : -Math.PI * 0.35);
    const base = spin % (Math.PI * 2);
    const diff = ((target - base + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    spinner.rotation.y = base + diff * turn;

    // Schichten auseinanderziehen
    trayGroup.position.y = -0.25 * explode;
    layerGroups.bottom.position.y = 0.32 * explode;
    layerGroups.cheese.position.y = 0.72 * explode;
    layerGroups.top.position.y = 1.12 * explode;
    syrupGroup.position.y = 1.42 * explode;
    pistGroup.position.y = PIST_Y + 1.78 * explode;
    pistPieceHolder.position.y = PIST_Y + 1.78 * explode;

    // Ganz bis der Schnitt fertig ist, danach Körper mit Loch + Stück
    setCut(cut >= 1);

    // Messer: senkt sich ein, fährt einmal ums Quadrat, hebt wieder ab
    const kIn = smooth(0, 0.15, cut), kPath = smooth(0.15, 0.88, cut), kOut = smooth(0.88, 1, cut);
    knife.visible = cut > 0 && kOut < 1;
    if (knife.visible) {
      const pt = pointOnSquare(kPath);
      if (knifeYaw === null || kIn < 0.05) knifeYaw = pt.yaw;
      let dy = ((pt.yaw - knifeYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      knifeYaw += dy * 0.3;
      knife.position.set(pt.x, TOP_Y - 0.2 + (1 - kIn) * 0.9 + kOut * 1.1, pt.z);
      knife.rotation.set(0, knifeYaw, 0.32);
      fadeMats(toolMats, Math.min(kIn, 1 - kOut) * 1.0 + (serve > 0 ? 1 : 0));
    } else knifeYaw = null;
    cutLines.forEach((m, i) => {
      const k = clamp(kPath * 4 - i);
      m.visible = k > 0.001 && lift < 0.99;
      m.scale.x = Math.max(0.001, k * m.userData.len);
    });
    cutMat.opacity = 0.85 * (1 - smooth(0, 0.25, lift));

    // Stück herausheben (erst hoch, dann nach außen) – der Tortenheber trägt es
    const up = smooth(0, 0.5, lift), out = smooth(0.3, 1, lift);
    pieceGroup.position.set(out * 0.9, up * 0.5, 0);
    pieceGroup.rotation.z = 0;
    server.visible = serve > 0;
    if (server.visible) {
      const slide = 1.7 * Math.pow(1 - serve, 2);
      server.position.set(pieceGroup.position.x + slide, pieceGroup.position.y, 0);
      if (!knife.visible) fadeMats(toolMats, smooth(0, 0.35, serve));
    }

    // Sirup sichtbar nur in der Explosionsansicht; Tropfen fallen
    syrupMat.opacity = 0.82 * explode * (opac.syrup ?? 1);
    for (const d of drops) {
      const u = d.userData;
      const k = ((t * u.speed + u.phase) % 1);
      d.position.set(u.x, 0.324 - k * 0.38, u.z);
      d.scale.setScalar(u.size * explode * (k < 0.9 ? 1 : (1 - k) * 10));
    }

    // Aktive Schicht hervorheben, andere abdunkeln
    const hl = explode > 0.3 ? stepMat[activeStep] : null;
    for (const k in allMats) {
      const want = hl && hl !== k ? 0.18 : 1;
      opac[k] += (want - opac[k]) * 0.12;
      const m = allMats[k];
      if (k !== "syrup") { m.opacity = opac[k]; m.depthWrite = opac[k] > 0.9; }
      if (m.emissive && k !== "syrup" && k !== "tray") m.emissiveIntensity = (k === "cheese" ? 0.12 : 0) + (hl === k ? 0.18 : 0);
    }

    // Feuer & Herd
    const flick = reduceMotion ? 1 : 0.85 + 0.1 * Math.sin(t * 11) + 0.05 * Math.sin(t * 23.7);
    const fireOn = fire > 0.01;
    stove.visible = jetMesh.visible = flames.visible = glow.visible = fireOn;
    if (fireOn) {
      fadeMats(stoveMats, fire);
      flameMat.uniforms.uFire.value = fire;
      jetMat.uniforms.uFire.value = fire;
      glowMat.opacity = 0.32 * fire * flick;
      updateFire(reduceMotion ? 0 : dt, t);
      stove.position.y = -0.6 * (1 - fire);   // Herd sinkt beim Auseinandernehmen weg
      jetMesh.position.y = flames.position.y = stove.position.y;
    }
    fireLight.intensity = 9 * fire * flick;
    trayMat.emissiveIntensity = 0.14 * fire * flick + (hl === "tray" ? 0.08 : 0);

    // Dampf über der heißen Künefe (am Anfang und beim Stück)
    const steamVis = Math.max(1 - smooth(0.06, 0.14, p), lift) * (reduceMotion ? 0 : 1);
    for (const s of steam) {
      const u = s.userData;
      const k = (t * u.speed + u.phase) % 1;
      s.position.set(u.x + Math.sin(t + u.phase * 6) * 0.08, 0.45 + k * 1.3, u.z);
      s.scale.setScalar(0.35 + k * 0.6);
      s.material.opacity = 0.22 * steamVis * Math.sin(k * Math.PI);
    }

    // Käsefäden
    const showStrands = lift > 0.02;
    const pp = pieceGroup.position;
    strandAnchors.forEach((a, i) => {
      const m = strands[i];
      m.visible = showStrands;
      if (!showStrands) return;
      let from, to;
      if (a.side === 0) { from = new THREE.Vector3(SQ_C - SQ_H, a.y, a.t); to = new THREE.Vector3(SQ_C - SQ_H + pp.x, a.y + pp.y, a.t); }
      else { const zz = a.side === 1 ? SQ_H : -SQ_H; from = new THREE.Vector3(SQ_C + a.t * 0.6, a.y, zz); to = new THREE.Vector3(SQ_C + a.t * 0.6 + pp.x, a.y + pp.y, zz); }
      const mid = from.clone().lerp(to, 0.5); mid.y -= a.sag * lift;
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      m.geometry.dispose();
      m.geometry = new THREE.TubeGeometry(curve, 10, a.w * (1 - 0.4 * lift), 5, false);
    });

    root.position.y = sm ? -0.05 : -0.1;
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

  // erstes Bild sofort zeichnen, erst dann Bühne und Texte einblenden
  frame();
  requestAnimationFrame(() => root$.classList.add("kn-ready"));
  loop();
}
