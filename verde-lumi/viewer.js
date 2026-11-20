// Green Onyx Lighting Plinth — 3D preview viewer (3d.html).
//
// The 3D plinth (the .glb) is drawn over a photo of a living room at night. The photo never
// moves or changes exposure; only the plinth, its contact shadow and the light it adds do.
//
// Stone: every side uses one clean face of the actual plinth from workshop footage, flipped
// differently on each side; the top comes from the same footage. Approximate by design.
//
// Camera match, estimated from the photo (1254 × 1254 px): verticals are upright, the horizon sits
// at y ≈ 438 px, focal length ≈ 1690 px, camera height ≈ 1.04 m (checked against the sofa arm,
// ≈ 0.68 m, and the door handle). The plinth stands on the floor just right of the sofa arm.
//
// Tilt (mouse only): a photo can't be re-viewed from a new height, so the 3D camera rises instead (level, with
// lens shift) while the plinth's base stays pinned to the same spot on the floor. The plinth stays
// upright and grounded, and the default view is a little above the photo's eye level so the top
// and two faces read clearly.

const stage = document.getElementById('stage');
const hintEl = document.getElementById('viewer-hint');
const lightBtn = document.getElementById('light-switch');
const lightLabel = document.getElementById('light-label');
const rotLeft = document.getElementById('rot-left');
const rotRight = document.getElementById('rot-right');
const photo = stage.querySelector('.room-photo');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const MODEL_URL = '/verde-lumi/assets/green-onyx-plinth.glb';
const DEG = Math.PI / 180;

// ---- Photo geometry (photo pixels / metres) ----
const IMG = 1254;
const HORIZON_Y = 438;
const FOCAL = 1690;
const PHOTO_EYE = 1.04;                    // camera height the photo was taken from
const BASE = { u: 700, v: 985 };           // where the plinth's footprint centre sits in the photo
const BASE_Z = FOCAL * PHOTO_EYE / (BASE.v - HORIZON_Y);
const BASE_X = (BASE.u - IMG / 2) * BASE_Z / FOCAL;
const START_YAW = 60 * DEG;                // same three-quarter angle as the photo view
const EYE = { start: 1.5, min: 1.12, max: 1.95 };   // 3D camera height range for tilting

// Warm-white glow, driven by the photographed stone: ivory and pale sage glow, darker bands and veins hold.
const GLOW = {
  color: 0xfff0dc,     // warm-white lamp inside the stone
  intensity: 0.85,
  lo: 0.3, hi: 0.84,   // texture brightness from no glow to full glow
  gamma: 1.25,         // steeper fall-off through the darker bands
  spread: 0.32,        // share of light that diffuses through the stone
  veinContrast: 1.6,   // how firmly fine veining holds back the light
  tint: 1.0,           // how strongly the stone colours the light
  chroma: 1.6,         // >1 deepens the stone's sage and honey in the light
};

// Floor light around the base when on: plane size (m), fall-off distance from the faces (m), colour at the base.
const POOL = { size: 1.7, falloff: 0.24, rgb: [178, 164, 118] };

// Areas that must stay in frame. Wide screens see the room; portrait screens crop tighter on the
// plinth with the sofa arm and cushions beside it for scale.
const FOCUS_WIDE = { x0: 0, x1: 1150, y0: 240, y1: 1130 };
const FOCUS_TALL = { x0: 300, x1: 960, y0: 380, y1: 1065 };

const HALF_H = Math.max(HORIZON_Y, IMG - HORIZON_Y);
const FULL_H = HALF_H * 2;
const ROW_SHIFT = HALF_H - HORIZON_Y;

let crop = { x: 0, y: 0, w: IMG, h: IMG };
let onLayout = () => {};

function computeCrop(w, h) {
  const a = w / h;
  const F = w < 640 ? FOCUS_TALL : FOCUS_WIDE;
  let ch = Math.max(F.y1 - F.y0, (F.x1 - F.x0) / a);
  ch = Math.min(ch, IMG, IMG / a);
  const cw = ch * a;
  const x = Math.min(Math.max((F.x0 + F.x1) / 2 - cw / 2, 0), IMG - cw);
  let y = (F.y0 + F.y1) / 2 - ch / 2;
  y = Math.max(y, F.y1 - ch);
  y = Math.min(Math.max(y, 0), IMG - ch);
  return { x, y, w: cw, h: ch };
}

function layoutRoom() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  crop = computeCrop(w, h);
  const s = w / crop.w;
  photo.style.width = IMG + 'px';
  photo.style.height = IMG + 'px';
  photo.style.transform = `translate(${(-crop.x * s).toFixed(2)}px, ${(-crop.y * s).toFixed(2)}px) scale(${s})`;
  onLayout(w, h);
}
new ResizeObserver(layoutRoom).observe(stage);
layoutRoom();

// ---- Light switch ----
let lightOn = false;
let onLightChange = () => {};
lightBtn.addEventListener('click', () => {
  lightOn = !lightOn;
  lightBtn.classList.toggle('is-on', lightOn);
  lightLabel.textContent = lightOn ? 'Switch off the light' : 'Switch on the light';
  onLightChange(lightOn);
});

function fail(reason) {
  console.warn('[plinth demo] 3D view unavailable:', reason);
  hintEl.textContent = 'Interactive view unavailable on this device';
  rotLeft.hidden = rotRight.hidden = lightBtn.hidden = true;
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (_) { return false; }
}

const startObserver = new IntersectionObserver((entries) => {
  if (!entries.some(e => e.isIntersecting)) return;
  startObserver.disconnect();
  if (!webglAvailable()) { fail('no WebGL'); return; }
  start().catch(fail);
}, { rootMargin: '200px' });
startObserver.observe(stage);

// ---- Texture helpers ----
function canvasTexture(THREE, size, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  paint(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const radial = (stops) => (ctx, size) => {
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
};
const softSquare = (inner, soft, strength) => (ctx, size) => {
  const img = ctx.createImageData(size, size);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = Math.abs((i + 0.5) / size - 0.5), v = Math.abs((j + 0.5) / size - 0.5);
    const d = Math.hypot(Math.max(u - inner, 0), Math.max(v - inner, 0));
    const t = Math.max(0, 1 - d / soft);
    const k = (j * size + i) * 4;
    img.data[k] = 8; img.data[k + 1] = 6; img.data[k + 2] = 4;
    img.data[k + 3] = Math.round(strength * t * t * (3 - 2 * t) * 255);
  }
  ctx.putImageData(img, 0, 0);
};

// Light on the floor from a lit square footprint: brightest at the faces, soft fall-off, rounded far edge.
const floorGlow = (size, half, falloff, rgb) => (ctx, px) => {
  const img = ctx.createImageData(px, px);
  for (let j = 0; j < px; j++) for (let i = 0; i < px; i++) {
    const x = ((i + 0.5) / px - 0.5) * size, y = ((j + 0.5) / px - 0.5) * size;
    const d = Math.hypot(Math.max(Math.abs(x) - half, 0), Math.max(Math.abs(y) - half, 0));
    const edge = Math.max(0, 1 - Math.hypot(x, y) / (size / 2));
    const v = Math.exp(-d / falloff) * edge * edge * (3 - 2 * edge);
    const k = (j * px + i) * 4;
    img.data[k] = rgb[0] * v; img.data[k + 1] = rgb[1] * v; img.data[k + 2] = rgb[2] * v; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
};

// Glow map, driven by the photographed stone itself. Lit from inside, onyx shows its paler, thinner
// ivory and sage areas brightest; light spreads a little through the stone and falls off across the
// denser olive and honey bands, while the fine veining stays crisp. The lamp is warm white
// (GLOW.color); the colour comes from the stone. (Illustrative until there are photos of it lit.)
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {                          // horizontal pass
    let acc = 0, n = 0;
    for (let x = -r; x < w; x++) {
      if (x + r < w) { acc += src[y * w + x + r]; n++; }
      if (x - r - 1 >= 0) { acc -= src[y * w + x - r - 1]; n--; }
      if (x >= 0) tmp[y * w + x] = acc / n;
    }
  }
  for (let x = 0; x < w; x++) {                          // vertical pass
    let acc = 0, n = 0;
    for (let y = -r; y < h; y++) {
      if (y + r < h) { acc += tmp[(y + r) * w + x]; n++; }
      if (y - r - 1 >= 0) { acc -= tmp[(y - r - 1) * w + x]; n--; }
      if (y >= 0) out[y * w + x] = acc / n;
    }
  }
  return out;
}

function glowMapFrom(THREE, tex) {
  const src = tex.image;
  const w = src.width, h = src.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h);
  const p = d.data;
  const n = w * h;
  const lum = new Float32Array(n), lit = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const k = i * 4;
    const L = (0.299 * p[k] + 0.587 * p[k + 1] + 0.114 * p[k + 2]) / 255;
    lum[i] = L;
    const t = Math.min(1, Math.max(0, (L - GLOW.lo) / (GLOW.hi - GLOW.lo)));
    lit[i] = Math.pow(t * t * (3 - 2 * t), GLOW.gamma);   // ivory/pale sage → 1, dark bands → 0
  }
  const r = Math.max(2, Math.round(w / 40));
  const spread = boxBlur(boxBlur(lit, w, h, r), w, h, r);   // light diffusing through the stone
  const local = boxBlur(lum, w, h, Math.max(2, Math.round(w / 60)));
  const fine = boxBlur(lum, w, h, 1);                        // vein detail without the JPEG grain
  for (let i = 0; i < n; i++) {
    const k = i * 4;
    const L = Math.max(lum[i], 0.02);
    const F = Math.max(fine[i], 0.02);
    // Veins: anything darker than its surroundings is held back, at full texture resolution.
    const vein = Math.pow(Math.min(1.15, Math.max(0.3, F / Math.max(local[i], 0.02))), GLOW.veinContrast);
    const level = Math.min(1, ((1 - GLOW.spread) * lit[i] + GLOW.spread * spread[i]) * vein);
    // Colour: the stone's own hue, at the glow's brightness.
    for (let ch = 0; ch < 3; ch++) {
      const tint = Math.min(1.5, Math.pow((p[k + ch] / 255) / L, GLOW.chroma));
      p[k + ch] = Math.round(255 * Math.min(1, level * (1 - GLOW.tint + GLOW.tint * tint)));
    }
  }
  ctx.putImageData(d, 0, 0);
  const out = new THREE.CanvasTexture(c);
  out.colorSpace = THREE.SRGBColorSpace;
  out.flipY = tex.flipY;                                 // glTF textures are not flipped
  return out;
}

async function start() {
  const THREE = await import('three');
  const { GLTFLoader } = await import('./vendor/jsm/loaders/GLTFLoader.js');

  const makeRenderer = (opts) => {
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', ...opts });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    return r;
  };
  // Main layer: plinth + contact shadow, transparent over the photo.
  const renderer = makeRenderer({ alpha: true });
  renderer.setClearColor(0x000000, 0);
  // Light layer: a faint pool on the floor around the base, on black, screen-blended onto the photo.
  const glowRenderer = makeRenderer({ alpha: false, antialias: false });
  glowRenderer.setClearColor(0x000000, 1);

  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '3D green onyx plinth beside the sofa. Drag, or use the arrow keys, to rotate and tilt it.');
  glowRenderer.domElement.classList.add('glow-layer');
  glowRenderer.domElement.setAttribute('aria-hidden', 'true');
  stage.insertBefore(glowRenderer.domElement, photo.nextSibling);
  stage.insertBefore(canvas, glowRenderer.domElement.nextSibling);

  const camera = new THREE.PerspectiveCamera(2 * Math.atan(HALF_H / FOCAL) / DEG, IMG / FULL_H, 0.05, 50);
  const scene = new THREE.Scene();
  const glowScene = new THREE.Scene();

  // Night lighting from the photo: warm floor lamp back-left, cool dusk from the windows, low bounce.
  // Enough to read the shape with the light off; the two faces get clearly different brightness.
  const hemi = new THREE.HemisphereLight(0x989aa6, 0x3a2a1c, 0.5);
  const lamp = new THREE.DirectionalLight(0xffdcb2, 1.05);
  lamp.position.set(-2.6, 1.8, -1.0);
  const dusk = new THREE.DirectionalLight(0x9fb2d6, 0.32);
  dusk.position.set(-0.6, 1.2, -2.4);
  const front = new THREE.DirectionalLight(0xffe6cc, 0.4);
  front.position.set(0.8, 1.3, 1.6);

  const pivot = new THREE.Group();
  pivot.position.set(BASE_X, 0, -BASE_Z);
  [lamp, dusk, front].forEach((l) => { l.target = pivot; });
  scene.add(hemi, lamp, dusk, front, pivot);

  // Contact shadow directly under the base (turns with it) plus a wider soft occlusion.
  const flat = new THREE.PlaneGeometry(1, 1);
  const contact = new THREE.Mesh(flat, new THREE.MeshBasicMaterial({
    map: canvasTexture(THREE, 128, softSquare(0.32, 0.17, 0.9)), transparent: true, depthWrite: false,
  }));
  contact.rotation.x = -Math.PI / 2;
  contact.scale.set(0.42, 0.42, 1);
  contact.position.y = 0.001;
  pivot.add(contact);
  const occlusion = new THREE.Mesh(flat, new THREE.MeshBasicMaterial({
    map: canvasTexture(THREE, 256, radial([[0, 'rgba(6,4,2,0.55)'], [0.45, 'rgba(6,4,2,0.2)'], [1, 'rgba(6,4,2,0)']])),
    transparent: true, depthWrite: false,
  }));
  occlusion.rotation.x = -Math.PI / 2;
  occlusion.scale.set(0.85, 0.85, 1);
  occlusion.position.set(BASE_X, 0.0005, -BASE_Z);
  scene.add(occlusion);

  // Light the plinth throws onto the oak when on (glow layer, screen-blended, so it can only brighten
  // the photo). Brightest against the base and falling off with distance from the four faces; it
  // turns with the plinth. Warm white, coloured a little by the stone it passes through.
  const pool = new THREE.Mesh(flat, new THREE.MeshBasicMaterial({
    map: canvasTexture(THREE, 256, floorGlow(POOL.size, 0.15, POOL.falloff, POOL.rgb)),
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0,
  }));
  pool.rotation.x = -Math.PI / 2;
  pool.scale.set(POOL.size, POOL.size, 1);
  pool.position.set(BASE_X, 0, -BASE_Z);
  glowScene.add(pool);

  // ---- Model ----
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const model = gltf.scene;
  const warmWhite = new THREE.Color(GLOW.color);
  const stone = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      if (m.map) {
        m.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
        m.emissiveMap = glowMapFrom(THREE, m.map);
      }
      m.color = new THREE.Color(0xe4e2da);
      m.roughness = 0.4;
      m.emissive = warmWhite.clone();
      m.emissiveIntensity = 0;
      m.needsUpdate = true;
      stone.push(m);
    });
  });
  const box = new THREE.Box3().setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.set(-c.x, -box.min.y, -c.z);
  pivot.add(model);

  // ---- View state ----
  let needsRender = true;
  let yaw = START_YAW, yawVel = 0, yawTarget = null;
  let eye = EYE.start, eyeTarget = null;
  let glow = 0, glowTarget = 0;

  function updateCamera() {
    camera.position.set(0, eye, 0);
    // Lens shift keeps the base centre on the same photo pixel at any camera height.
    const shift = FOCAL * (eye - PHOTO_EYE) / BASE_Z;
    camera.setViewOffset(IMG, FULL_H, crop.x, crop.y + ROW_SHIFT + shift, crop.w, crop.h);
    camera.updateProjectionMatrix();
  }
  onLayout = (w, h) => {
    renderer.setSize(w, h, false);
    glowRenderer.setSize(w, h, false);
    needsRender = true;
  };

  onLightChange = (on) => { glowTarget = on ? 1 : 0; if (reduceMotion) glow = glowTarget; needsRender = true; };
  function applyGlow() {
    stone.forEach((m) => { m.emissiveIntensity = glow * GLOW.intensity; });
    pool.material.opacity = glow;
    // The base's own light lifts the shadows around it.
    contact.material.opacity = 1 - 0.35 * glow;
    occlusion.material.opacity = 1 - 0.6 * glow;
  }

  // ---- Interaction: drag sideways to rotate; with a mouse, drag up/down to tilt a little.
// On touch screens the canvas is `touch-action: pan-y`, so vertical swipes scroll the page. ----
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    yawTarget = eyeTarget = null; yawVel = 0;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const now = performance.now();
    const k = 360 / Math.max(stage.clientWidth, 320) * 0.9 * DEG;
    const dYaw = (e.clientX - drag.x) * k;
    yaw += dYaw;
    if (e.pointerType === 'mouse') eye = Math.min(EYE.max, Math.max(EYE.min, eye + (e.clientY - drag.y) * 0.0035));
    yawVel = dYaw / Math.max(now - drag.t, 1) * 16;
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
    needsRender = true;
  });
  const endDrag = () => { drag = null; canvas.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => { yawVel = 0; endDrag(); });

  function nudge(deg) {
    yawVel = 0;
    yawTarget = (yawTarget ?? yaw) + deg * DEG;
    if (reduceMotion) { yaw = yawTarget; yawTarget = null; }
    needsRender = true;
  }
  function tiltBy(dm) {
    eyeTarget = Math.min(EYE.max, Math.max(EYE.min, (eyeTarget ?? eye) + dm));
    if (reduceMotion) { eye = eyeTarget; eyeTarget = null; }
    needsRender = true;
  }
  rotLeft.addEventListener('click', () => nudge(-30));
  rotRight.addEventListener('click', () => nudge(30));
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') nudge(-15);
    else if (e.key === 'ArrowRight') nudge(15);
    else if (e.key === 'ArrowUp') tiltBy(0.12);
    else if (e.key === 'ArrowDown') tiltBy(-0.12);
    else return;
    e.preventDefault();
  });

  // ---- Loop ----
  let visible = true, last = performance.now();
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) needsRender = true; }).observe(stage);
  layoutRoom();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!visible || document.hidden) return;

    let moving = false;
    if (!drag && Math.abs(yawVel) > 0.00005) { yaw += yawVel; yawVel *= 0.9; moving = true; }
    if (yawTarget !== null) {
      const d = yawTarget - yaw;
      if (Math.abs(d) < 0.0008) { yaw = yawTarget; yawTarget = null; } else { yaw += d * Math.min(1, dt * 10); moving = true; }
    }
    if (eyeTarget !== null) {
      const d = eyeTarget - eye;
      if (Math.abs(d) < 0.001) { eye = eyeTarget; eyeTarget = null; } else { eye += d * Math.min(1, dt * 10); moving = true; }
    }
    if (Math.abs(glowTarget - glow) > 0.002) { glow += (glowTarget - glow) * Math.min(1, dt * 3.2); moving = true; }
    else glow = glowTarget;

    if (!moving && !needsRender) return;
    needsRender = false;
    pivot.rotation.y = yaw;
    pool.rotation.z = yaw;
    applyGlow();
    updateCamera();
    renderer.render(scene, camera);
    glowRenderer.render(glowScene, camera);
  }
  requestAnimationFrame(frame);

  requestAnimationFrame(() => {
    stage.classList.add('is-ready');
    hintEl.textContent = 'Drag to explore in 3D';
  });
}
