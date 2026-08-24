/* ============================================================================
   DE Architects — section 3: scroll-driven drone fly-through
   ----------------------------------------------------------------------------
   A luxury villa on a walled urban plot, at dusk. Everything is built from
   code — no images, no models, no textures on disk. The city, the forecourt,
   the house, every piece of furniture and the pool are generated at runtime.

   Scroll drives a camera along a spline: in over the city street, down across
   the forecourt, through the front door, past the six service walls in a fully
   furnished interior, out the rear glazing and up over the pool.

   Pacing note: the camera reads the spline with getPoint(), not getPointAt(),
   so every segment between waypoints takes an equal share of the scroll. That
   is what keeps the interior — where the services are — from flashing past.
   ========================================================================== */
import * as THREE from 'three';

const section  = document.getElementById('work');
const canvas   = document.getElementById('flightCanvas');
const headline = section && section.querySelector('.scene-text');
const railFill = section && section.querySelector('.flight-progress i');
const reduce   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK(){
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e){ return false; }
}

/* ---------- palette ---------- */
const C = {
  plum:0x3E0E2C, crimson:0xC2183F, bronze:0x9A7B4F,
  walnut:0x6B4526, oak:0xB08A5E, charcoal:0x2B2A2E,
  hedge:0x3F5B3A, leaf:0x4E6E45, bark:0x4A3627
};

/* the six services, in the order the drone passes them.
   side: -1 = left wall, +1 = right wall.  z = position down the house. */
const SERVICES = [
  { n:'01', title:'Residential\nArchitecture', sub:'Concept to keys',            side:-1, z:-9.4 },
  { n:'02', title:'Interior\nDesign',          sub:'Spaces that feel like you',  side: 1, z:-5.8 },
  { n:'03', title:'Commercial\n& Workspaces',  sub:'Where business takes shape', side:-1, z:-2.2 },
  { n:'04', title:'Renovation\n& Restoration', sub:'Brought back to life',       side: 1, z: 1.4 },
  { n:'05', title:'Landscape\n& Exteriors',    sub:'Design meets the outdoors',  side:-1, z: 5.0 },
  { n:'06', title:'3D\nVisualisation',         sub:"See it before it's built",   side: 1, z: 8.2 }
];

const HW = 9;     // half width  → interior walls at x = ±9
const H1 = 4.9;   // ground floor height (the storey the drone flies through)
const HD = 13;    // half depth  → front wall z = -13, rear glazing z = +13

if (section && canvas && !reduce && webglOK()) boot();

async function boot(){
  try {
    await Promise.all([
      document.fonts.load('160px Anton'),
      document.fonts.load('600 60px Inter'),
      document.fonts.ready
    ]);
  } catch (e){ /* fall through with whatever is available */ }

  const small = window.innerWidth < 900;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:!small, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.38;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.4, 900);

  /* ---------- dusk sky, doubled as the environment map ---------- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite:false,
    uniforms:{
      top:{ value:new THREE.Color(0x1C2340) },
      mid:{ value:new THREE.Color(0x6E4A63) },
      bot:{ value:new THREE.Color(0xE8A268) }
    },
    vertexShader:`varying vec3 vP;
      void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader:`varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      void main(){
        float h = normalize(vP).y;
        vec3 c = mix(bot, mid, smoothstep(-0.04, 0.20, h));
        c = mix(c, top, smoothstep(0.14, 0.62, h));
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), skyMat));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), skyMat));
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.fog = new THREE.FogExp2(0x53415C, 0.0026);

  /* ---------- procedural textures ---------- */
  function tex(draw, w, h, rx, ry){
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    if (rx){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); }
    t.anisotropy = 4;
    return t;
  }

  // large travertine slabs with fine joints
  const paving = tex((g, w, h) => {
    g.fillStyle = '#E4DACA'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++){
      g.fillStyle = `rgba(${(198 + Math.random() * 40) | 0},${(186 + Math.random() * 36) | 0},${(166 + Math.random() * 34) | 0},0.35)`;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 22, 0, 6.2832); g.fill();
    }
    g.strokeStyle = 'rgba(120,108,94,.5)'; g.lineWidth = 3;
    for (let i = 0; i <= 2; i++){
      g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke();
    }
  }, 512, 512, 8, 16);

  // book-matched marble for the island and the coffee table
  const marble = tex((g, w, h) => {
    g.fillStyle = '#F4F1EA'; g.fillRect(0, 0, w, h);
    g.lineWidth = 2;
    for (let i = 0; i < 26; i++){
      g.strokeStyle = `rgba(${(120 + Math.random() * 60) | 0},${(118 + Math.random() * 50) | 0},${(126 + Math.random() * 50) | 0},${0.10 + Math.random() * 0.18})`;
      g.beginPath();
      let x = Math.random() * w, y = 0;
      g.moveTo(x, y);
      while (y < h){ x += (Math.random() - 0.5) * 70; y += 18 + Math.random() * 26; g.lineTo(x, y); }
      g.stroke();
    }
  }, 512, 512, 1, 1);

  // oak boards for the interior floor
  const boards = tex((g, w, h) => {
    const rows = 6, bw = w / 2;
    g.fillStyle = '#7C5732'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++){
      const off = (r % 2) ? -bw / 2 : 0;
      for (let c = -1; c < 3; c++){
        const v = 154 + Math.random() * 32;
        g.fillStyle = `rgb(${v | 0},${(v * 0.74) | 0},${(v * 0.5) | 0})`;
        g.fillRect(c * bw + off + 1.5, r * h / rows + 1.5, bw - 3, h / rows - 3);
      }
    }
  }, 512, 512, 9, 16);

  // lit window grid, used for every neighbouring building and every tower
  function facade(cols, rows, litRatio){
    return tex((g, w, h) => {
      g.fillStyle = '#22212B'; g.fillRect(0, 0, w, h);
      const cw = w / cols, ch = h / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
        const on = Math.random() < litRatio;
        g.fillStyle = on ? (Math.random() < 0.3 ? '#FFE6BC' : '#FFC97E') : '#2E2D3A';
        g.fillRect(c * cw + cw * 0.18, r * ch + ch * 0.22, cw * 0.64, ch * 0.5);
      }
    }, cols * 24, rows * 24, 1, 1);
  }
  const facadeA = facade(8, 14, 0.5);
  const facadeB = facade(6, 10, 0.42);
  const facadeC = facade(10, 20, 0.55);

  /* ---------- light: low warm sun, cool sky, warm interiors ---------- */
  scene.add(new THREE.HemisphereLight(0x8FA4D6, 0x554A54, 1.05));

  const sun = new THREE.DirectionalLight(0xFFB877, 2.2);
  sun.position.set(-60, 26, -46);
  if (!small){
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = -60; s.right = 60; s.top = 60; s.bottom = -60; s.near = 1; s.far = 220;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.03;
  }
  scene.add(sun);

  // keep real lights few — everything else glows via emissive materials
  [-9, -3, 3, 9].forEach(z => {
    const l = new THREE.PointLight(0xFFE0B4, 38, 28, 2);
    l.position.set(0, H1 - 1.0, z);
    scene.add(l);
  });

  /* ---------- materials ---------- */
  const mat = (color, rough = 0.9, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness:rough, metalness:0, ...opts });
  const glow = (color, intensity = 1) =>
    new THREE.MeshStandardMaterial({ color:0x111111, emissive:new THREE.Color(color), emissiveIntensity:intensity, roughness:1 });

  const M = {
    stone    : mat(0xE6DCCB, 0.92),
    stoneWarm: mat(0xD8CBB4, 0.94),
    stoneDark: mat(0x50474A, 0.9),
    plasterIn: mat(0xF6F2EA, 0.95),
    ceiling  : mat(0xF7F3EB, 0.96, { emissive:new THREE.Color(0xFFF0DC), emissiveIntensity:0.2 }),
    slab     : mat(C.plum, 0.78),
    charcoal : mat(C.charcoal, 0.72),
    paving   : mat(0xFFFFFF, 0.93, { map:paving }),
    floor    : mat(0xFFFFFF, 0.62, { map:boards }),
    marble   : mat(0xFFFFFF, 0.32, { map:marble }),
    walnut   : mat(C.walnut, 0.6),
    oak      : mat(C.oak, 0.7),
    bronze   : mat(C.bronze, 0.34, { metalness:0.85 }),
    fabric   : mat(0xC9BFB1, 0.98),
    fabricDk : mat(0x6E5F63, 0.98),
    hedge    : new THREE.MeshStandardMaterial({ color:C.hedge, roughness:1, flatShading:true }),
    leaf     : new THREE.MeshStandardMaterial({ color:C.leaf, roughness:1, flatShading:true }),
    bark     : mat(C.bark, 1),
    tile     : mat(0x11414B, 0.42),
    sheer    : mat(0xEDE5DA, 0.99, { transparent:true, opacity:0.7 }),
    glass    : new THREE.MeshPhysicalMaterial({
      color:0xC8DCE0, roughness:0.04, metalness:0, transparent:true,
      opacity:0.16, envMapIntensity:2.2, side:THREE.DoubleSide
    }),
    lamp     : glow(0xFFD9A0, 2.4),
    cove     : glow(0xFFCF96, 1.6),
    poolGlow : glow(0x8FE2DC, 1.0)
  };

  const world = new THREE.Group();
  scene.add(world);

  function box(w, h, d, material, x, y, z, cast = true, receive = true){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = cast; m.receiveShadow = receive;
    world.add(m);
    return m;
  }
  function cyl(rt, rb, h, material, x, y, z, seg = 12, cast = true){
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
    m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true;
    world.add(m);
    return m;
  }
  function blob(r, material, x, y, z){
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), material);
    m.position.set(x, y, z);
    m.rotation.set(Math.random(), Math.random(), Math.random());
    m.castShadow = true; world.add(m);
    return m;
  }

  /* ---------- ground: road, pavement, plot ---------- */
  box(900, 0.4, 900, mat(0x39373F, 0.98), 0, -0.25, 0, false, true);      // city ground
  box(400, 0.12, 16, mat(0x2C2B33, 0.96), 0, 0.0, -62, false, true);    // road
  for (let i = -12; i <= 12; i++) box(3.4, 0.02, 0.3, glow(0xE9E2CE, 0.4), i * 9, 0.06, -62, false, false);
  box(400, 0.44, 5, M.stoneWarm, 0, 0.12, -52.5, false, true);           // pavement
  box(14.6, 0.30, 64, M.paving, -15.7, -0.05, -20, false, true);         // plot, west
  box(14.6, 0.30, 64, M.paving,  15.7, -0.05, -20, false, true);         // plot, east
  box(16.8, 0.30, 16.1, M.paving, 0, -0.05, -43.95, false, true);        // plot, gate end
  box(16.8, 0.30, 36.1, M.paving, 0, -0.05, -6.05, false, true);         // plot, house end
  box(6, 0.30, 32, M.paving, -20, -0.05, 28, false, true);               // plot, beside the deck
  box(6, 0.30, 32, M.paving,  20, -0.05, 28, false, true);

  /* ---------- boundary wall, gate, street trees ---------- */
  [-23, 23].forEach(x => box(1.0, 3.0, 96, M.stoneWarm, x, 1.5, -4));
  box(14, 3.0, 1.0, M.stoneWarm, -16, 1.5, -50);
  box(14, 3.0, 1.0, M.stoneWarm,  16, 1.5, -50);
  box(46, 3.0, 1.0, M.stoneWarm, 0, 1.5, 44);
  [-8.4, 8.4].forEach(x => { box(1.6, 4.2, 1.6, M.stoneDark, x, 2.1, -50); box(1.9, 0.3, 1.9, M.bronze, x, 4.3, -50); });
  for (let i = 0; i < 14; i++) box(0.12, 2.4, 0.12, M.bronze, -7.4 + i * 1.14, 1.2, -50, true, false);

  function tree(x, z, s, tall){
    const g = new THREE.Group();
    const base = tall ? 3.4 : 2.2;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, base, 8), M.bark);
    t.position.y = base / 2; t.castShadow = true; g.add(t);
    for (let i = 0; i < 3; i++){
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 - i * 0.34, 0), M.leaf);
      f.position.y = base + 0.5 + i * 0.95;
      f.rotation.set(Math.random(), Math.random(), Math.random());
      f.castShadow = true; g.add(f);
    }
    g.position.set(x, 0, z); g.scale.setScalar(s); world.add(g);
  }
  for (let i = 0; i < 9; i++) tree(-56 + i * 14, -56, 1.1, true);

  /* ---------- the city around the plot ---------- */
  function building(x, z, w, d, h, face){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        map:face, emissiveMap:face, emissive:new THREE.Color(0xFFFFFF),
        emissiveIntensity:0.9, roughness:0.9, metalness:0
      }));
    m.position.set(x, h / 2, z);
    world.add(m);
    box(w + 0.6, 0.5, d + 0.6, M.stoneDark, x, h + 0.2, z, false, false);
  }
  // immediate neighbours, hard against the boundary walls
  [[-36, -34, 16, 22, 10, facadeB], [-38, -4, 18, 26, 12, facadeA], [-36, 30, 16, 24, 9, facadeB],
   [ 36, -30, 16, 20, 11, facadeA], [ 38,  2, 18, 28, 13, facadeC], [ 36, 34, 16, 22, 9.5, facadeB]]
    .forEach(b => building(b[0], b[1], b[2], b[3], b[4], b[5]));
  // blocks across the street
  for (let i = 0; i < 11; i++)
    building(-100 + i * 20, -104 - (i % 3) * 18, 14 + (i % 3) * 4, 16, 15 + (i % 4) * 8, i % 2 ? facadeA : facadeC);
  // blocks behind the rear wall — the closing shot looks straight at this
  // ground, and it read as an empty dark band. Kept clear of the exit line.
  for (let i = 0; i < 8; i++){
    const x = (i < 4 ? -26 - (i % 4) * 17 : 26 + (i % 4) * 17);
    building(x, 58 + (i % 3) * 15, 15 + (i % 3) * 4, 18, 12 + (i % 4) * 7, i % 2 ? facadeB : facadeA);
  }
  for (let i = 0; i < 5; i++) building(-46 + i * 23, 88 + (i % 2) * 12, 18, 16, 9 + (i % 3) * 4, facadeB);

  // the skyline
  for (let i = 0; i < 36; i++){
    const a = (i / 36) * Math.PI * 2 + 0.3;
    const r = 270 + (i % 5) * 52;
    building(Math.cos(a) * r, Math.sin(a) * r - 40, 16 + (i % 4) * 7, 16 + (i % 3) * 7,
             52 + ((i * 37) % 104), i % 3 ? facadeC : facadeA);
  }

  /* ---------- water shader, shared by both pools ---------- */
  const uTime = { value:0 };
  function waterMaterial(deep, shallow, alpha, scale){
    return new THREE.ShaderMaterial({
      transparent:true,
      uniforms:{ uTime, uDeep:{ value:new THREE.Color(deep) }, uShallow:{ value:new THREE.Color(shallow) },
                 uAlpha:{ value:alpha }, uScale:{ value:scale } },
      vertexShader:`varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader:`uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow;
        uniform float uAlpha; uniform float uScale; varying vec2 vUv;
        void main(){
          vec2 p = vUv * uScale;
          float a = sin(p.x * 3.1 + uTime * 0.9) * sin(p.y * 2.3 - uTime * 0.7);
          float b = sin((p.x + p.y) * 3.6 - uTime * 1.2);
          float caustic = smoothstep(0.42, 1.0, a * 0.5 + b * 0.5 + 0.5);
          vec3 col = mix(uDeep, uShallow, smoothstep(0.0, 1.0, vUv.y * 0.55 + 0.28));
          col += caustic * 0.34;
          gl_FragColor = vec4(col, uAlpha);
        }`
    });
  }

  /* ---------- forecourt ---------- */
  box(16.4, 0.7, 11.4, M.stoneDark, 0, -0.31, -30, false, true);
  const rpool = new THREE.Mesh(new THREE.PlaneGeometry(16, 11), waterMaterial(0x1B4E5A, 0x63A9AC, 0.88, 9));
  rpool.rotation.x = -Math.PI / 2; rpool.position.set(0, 0.06, -30); world.add(rpool);
  [[-8.4, -30, 0.6, 11.6], [8.4, -30, 0.6, 11.6], [0, -35.9, 17.2, 0.6], [0, -24.1, 17.2, 0.6]]
    .forEach(c => box(c[2], 0.36, c[3], M.stoneDark, c[0], 0.18, c[1], false));

  for (let i = 0; i < 5; i++) box(4.4, 0.12, 1.9, M.stone, 0, 0.17, -47 + i * 2.6, false);
  box(7.0, 0.16, 7.0, M.stone, 0, 0.18, -18.5, false);

  for (let i = 0; i < 6; i++){
    [-18.5, 18.5].forEach(x => {
      box(2.0, 1.5, 2.0, M.hedge, x, 0.95, -44 + i * 6.5);
      box(2.3, 0.5, 2.3, M.stoneWarm, x, 0.35, -44 + i * 6.5, true, false);
    });
  }
  [[-13, -40], [13, -40], [-13, -22], [13, -22], [-16, -14], [16, -14]].forEach(p => tree(p[0], p[1], 1.05, false));
  for (let i = 0; i < 8; i++){
    [-6.5, 6.5].forEach(x => {
      cyl(0.09, 0.09, 0.9, M.charcoal, x, 0.55, -46 + i * 4, 8, false);
      box(0.24, 0.1, 0.24, M.lamp, x, 1.05, -46 + i * 4, false, false);
    });
  }

  box(9, 0.12, 22, M.stoneDark, -15, 0.16, -34, false, true);
  function car(x, z, body){
    const g = new THREE.Group();
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.6), mat(body, 0.3, { metalness:0.6 }));
    b1.position.y = 0.68; b1.castShadow = true; g.add(b1);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.56, 2.4), mat(0x1A1A20, 0.16, { metalness:0.4 }));
    b2.position.set(0, 1.2, -0.2); b2.castShadow = true; g.add(b2);
    [[-0.95, 1.6], [0.95, 1.6], [-0.95, -1.6], [0.95, -1.6]].forEach(w => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 12), mat(0x151519, 0.9));
      t.rotation.z = Math.PI / 2; t.position.set(w[0], 0.36, w[1]); g.add(t);
    });
    g.position.set(x, 0, z); world.add(g);
  }
  car(-15, -30, 0x1E2733);
  car(-15, -38, 0x6E1230);

  /* ---------- the house ---------- */
  const H2 = 4.2;
  const TOP = H1 + 0.95 + H2;
  const FL = 0.65;                    // finished floor level inside

  box(HW * 2 + 1.4, 0.5, HD * 2 + 1.4, M.stone, 0, 0.25, 0);          // plinth
  box(HW * 2, 0.22, HD * 2, M.floor, 0, 0.54, 0, false, true);        // oak floor
  box(HW * 2 - 0.1, 0.16, HD * 2 - 0.1, M.ceiling, 0, H1 - 0.08 + FL, 0, false, false);
  [-1, 1].forEach(s => box(0.22, 0.1, HD * 2 - 1.4, M.cove, s * (HW - 0.45), H1 - 0.24 + FL, 0, false, false));

  // side walls (these carry the lettering)
  box(0.36, H1, HD * 2, M.stone, -HW - 0.18, H1 / 2 + FL, 0);
  box(0.36, H1, HD * 2, M.stone,  HW + 0.18, H1 / 2 + FL, 0);

  // front elevation
  const DW = 3.0, DH = 3.6, SW = HW - DW / 2;
  box(SW, H1, 0.34, M.stone, -(DW / 2 + SW / 2), H1 / 2 + FL, -HD);
  box(SW, H1, 0.34, M.stone,  (DW / 2 + SW / 2), H1 / 2 + FL, -HD);
  box(DW, H1 - DH, 0.34, M.stone, 0, DH + (H1 - DH) / 2 + FL, -HD);
  for (let i = 0; i < 4; i++){
    const gx = -7.2 + i * 1.8;
    box(1.5, 3.3, 0.06, M.glass, gx, FL + 1.75, -HD - 0.3, false, false);
    box(0.1, 3.5, 0.22, M.bronze, gx - 0.82, FL + 1.75, -HD - 0.32);
  }
  box(0.1, 3.5, 0.22, M.bronze, -0.42, FL + 1.75, -HD - 0.32);
  for (let i = 0; i < 13; i++) box(0.14, 4.2, 0.34, M.bronze, 2.3 + i * 0.48, FL + 2.1, -HD - 0.34);

  // rear elevation — full-height glazing onto the pool
  box(2.2, H1, 0.34, M.stone, -HW + 1.1, H1 / 2 + FL, HD);
  box(2.2, H1, 0.34, M.stone,  HW - 1.1, H1 / 2 + FL, HD);
  box(13.6, H1 - 4.3, 0.34, M.stone, 0, 4.3 + (H1 - 4.3) / 2 + FL, HD);
  for (let i = 0; i < 4; i++){
    const gx = -5.1 + i * 3.4;
    box(3.1, 4.2, 0.06, M.glass, gx, FL + 2.15, HD + 0.28, false, false);
    box(0.12, 4.3, 0.26, M.bronze, gx - 1.7, FL + 2.2, HD + 0.3);
  }
  box(0.12, 4.3, 0.26, M.bronze, 6.8, FL + 2.2, HD + 0.3);

  // upper storey, cantilevered over the entry
  box(HW * 2 + 2.6, 0.45, HD * 2 + 2.6, M.slab, 0, H1 + FL + 0.22, 0);
  box(HW * 2 + 2.3, 0.10, HD * 2 + 2.3, M.plasterIn, 0, H1 + FL - 0.02, 0, false, false);
  box(15.4, H2, 20, M.stoneWarm, -0.6, H1 + FL + 0.45 + H2 / 2, 1.4);
  box(16.0, 0.4, 20.6, M.slab, -0.6, TOP + FL + 0.2, 1.4);
  for (let i = 0; i < 5; i++){
    box(2.2, 2.6, 0.06, M.glass, -6.6 + i * 3.0, H1 + FL + 2.0, -8.75, false, false);
    box(0.12, 2.8, 0.2, M.bronze, -7.8 + i * 3.0, H1 + FL + 2.0, -8.85);
  }
  box(14.6, 2.4, 0.08, M.cove, -0.6, H1 + FL + 2.0, -8.6, false, false);   // glow from within
  box(16.4, 0.3, 3.8, M.stone, -0.6, H1 + FL + 0.5, -10.7);                // balcony
  for (let i = 0; i < 19; i++) box(0.08, 1.1, 0.08, M.bronze, -8.2 + i * 0.86, H1 + FL + 1.2, -12.5, true, false);
  box(17.0, 0.12, 0.16, M.bronze, -0.6, H1 + FL + 1.8, -12.5, true, false);

  /* ---------- service lettering ---------- */
  function serviceTexture(s){
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 512;
    const g = cv.getContext('2d');
    g.textBaseline = 'top';
    const PAD = 44, MAXW = cv.width - PAD * 2;
    const lines = s.title.toUpperCase().split('\n');

    let px = 150;
    const fits = () => { g.font = `${px}px Anton, sans-serif`; return lines.every(l => g.measureText(l).width <= MAXW); };
    while (px > 46 && !fits()) px -= 3;

    g.fillStyle = '#C2183F';
    g.font = '700 58px Inter, sans-serif';
    g.fillText(s.n, PAD, 30);
    g.fillStyle = 'rgba(194,24,63,.45)';
    g.fillRect(PAD, 104, 92, 4);

    g.fillStyle = '#3E0E2C';
    g.font = `${px}px Anton, sans-serif`;
    const lh = px * 0.92;
    lines.forEach((l, i) => g.fillText(l, PAD, 142 + i * lh));

    let sp = 38;
    g.font = `600 ${sp}px Inter, sans-serif`;
    while (sp > 20 && g.measureText(s.sub.toUpperCase()).width > MAXW){ sp -= 2; g.font = `600 ${sp}px Inter, sans-serif`; }
    g.fillStyle = 'rgba(62,14,44,.6)';
    g.fillText(s.sub.toUpperCase(), PAD + 2, 152 + lines.length * lh);

    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  const panels = SERVICES.map(s => {
    const t = serviceTexture(s);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2),
      new THREE.MeshStandardMaterial({
        map:t, emissiveMap:t, emissive:new THREE.Color(C.crimson), emissiveIntensity:0,
        transparent:true, opacity:0, roughness:1, metalness:0, depthWrite:false
      }));
    m.position.set(s.side * (HW - 0.04), FL + 2.5, s.z);
    m.rotation.y = s.side < 0 ? Math.PI / 2 : -Math.PI / 2;
    world.add(m);
    return { mesh:m, z:s.z, side:s.side };
  });

  /* ---------- interior, furnished; the centre aisle stays clear ---------- */

  // -- living, z -12 .. -5 (left side) --
  box(9.4, 0.02, 7.2, mat(0x8A7B72, 0.99), -4.0, FL + 0.01, -8.4, false);
  box(3.6, 0.42, 1.8, M.fabric, -6.2, FL + 0.21, -8.0);
  box(3.6, 0.52, 0.32, M.fabric, -6.2, FL + 0.56, -8.8);
  box(1.8, 0.42, 3.2, M.fabric, -3.6, FL + 0.21, -6.5);
  box(0.32, 0.52, 3.2, M.fabric, -2.65, FL + 0.56, -6.5);
  [[-7.2, -8.1], [-5.4, -8.1], [-3.7, -7.3]].forEach(p => box(0.6, 0.18, 0.5, M.fabricDk, p[0], FL + 0.52, p[1], true, false));
  box(2.0, 0.1, 1.05, M.marble, -5.3, FL + 0.44, -6.0);
  box(1.0, 0.36, 0.62, M.bronze, -5.3, FL + 0.22, -6.0);
  box(0.42, 0.16, 0.3, M.walnut, -5.3, FL + 0.55, -6.0, true, false);
  cyl(0.17, 0.21, 0.55, M.stoneWarm, -7.9, FL + 0.28, -5.2, 10);
  [0, 1, 2].forEach(i => blob(0.5 - i * 0.1, M.leaf, -7.9, FL + 0.95 + i * 0.42, -5.2));
  box(0.32, 2.7, 5.0, M.walnut, -8.5, FL + 1.35, -10.3);
  for (let i = 0; i < 4; i++) box(0.52, 0.06, 4.8, M.oak, -8.32, FL + 0.55 + i * 0.62, -10.3, true, false);
  box(0.12, 1.6, 4.6, M.cove, -8.28, FL + 1.5, -10.3, false, false);
  cyl(0.05, 0.05, 1.5, M.charcoal, -8.1, FL + 0.75, -6.4, 8);
  box(0.36, 0.34, 0.36, M.lamp, -8.1, FL + 1.62, -6.4, false, false);

  // -- dining, z -4 .. 1 (right side) --
  box(1.6, 0.09, 4.2, M.walnut, 5.4, FL + 0.75, -1.6);
  box(1.0, 0.72, 3.4, M.walnut, 5.4, FL + 0.38, -1.6);
  [-3.2, -2.0, -0.8, 0.4].forEach(z => {
    [4.3, 6.5].forEach(x => {
      box(0.5, 0.08, 0.5, M.fabricDk, x, FL + 0.46, z, true, false);
      box(0.5, 0.6, 0.1, M.walnut, x, FL + 0.76, z + (x > 5.4 ? 0.24 : -0.24), true, false);
      [0.18, -0.18].forEach(o => cyl(0.03, 0.03, 0.46, M.charcoal, x + o, FL + 0.23, z, 6, false));
    });
  });
  [-2.8, -1.6, -0.4].forEach(z => {
    cyl(0.014, 0.014, 1.4, M.charcoal, 5.4, FL + H1 - 1.0, z, 6, false);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), M.lamp);
    s2.position.set(5.4, FL + H1 - 1.75, z); world.add(s2);
  });
  box(0.55, 0.85, 3.4, M.walnut, 8.35, FL + 0.43, -1.6);
  box(0.65, 0.06, 3.5, M.marble, 8.35, FL + 0.89, -1.6, true, false);

  // artwork on the left wall
  box(0.08, 2.0, 3.0, M.charcoal, -8.72, FL + 2.3, -2.6, true, false);
  box(0.05, 1.7, 2.7, mat(0x7C3350, 0.9), -8.66, FL + 2.3, -2.6, false, false);

  // -- stair against the right wall, z 2 .. 6 --
  for (let i = 0; i < 12; i++) box(3.2, 0.16, 0.32, M.stone, 7.2, FL + 0.24 + i * 0.36, 2.4 + i * 0.33);
  box(0.08, 3.6, 4.2, M.glass, 5.5, FL + 1.9, 4.2, false, false);
  box(0.12, 0.1, 4.3, M.bronze, 5.5, FL + 3.72, 4.2, true, false);

  // -- kitchen, z 6 .. 12 (right side) --
  box(2.2, 0.9, 5.4, M.marble, 5.6, FL + 0.45, 9.4);
  box(2.5, 0.1, 5.7, M.marble, 5.6, FL + 0.95, 9.4, true, false);
  box(0.14, 0.9, 5.4, M.marble, 4.45, FL + 0.45, 9.4, true, false);
  [7.9, 9.4, 10.9].forEach(z => {
    cyl(0.2, 0.22, 0.66, M.walnut, 3.8, FL + 0.33, z, 10);
    box(0.44, 0.1, 0.44, M.fabricDk, 3.8, FL + 0.71, z, true, false);
  });
  box(0.75, 0.92, 6.4, M.stone, 8.3, FL + 0.46, 9.2);
  box(0.85, 0.06, 6.5, M.marble, 8.3, FL + 0.95, 9.2, true, false);
  box(0.12, 0.85, 6.4, M.marble, 8.62, FL + 1.42, 9.2, true, false);   // backsplash
  box(0.1, 0.08, 6.2, M.cove, 8.1, FL + 1.02, 9.2, false, false);      // counter light
  box(0.75, 3.5, 1.9, M.walnut, 8.3, FL + 1.75, 12.2);                 // tall storage, past the panel
  box(0.06, 3.1, 0.09, M.bronze, 7.9, FL + 1.75, 11.4, true, false);

  // -- tall units and rear lounge on the left --
  box(0.9, 3.4, 2.6, M.walnut, -8.2, FL + 1.7, 11.0);
  box(0.06, 3.0, 0.1, M.bronze, -7.7, FL + 1.7, 9.9, true, false);
  box(3.2, 0.4, 1.5, M.fabric, -5.2, FL + 0.2, 5.8);
  box(3.2, 0.48, 0.3, M.fabric, -5.2, FL + 0.54, 5.2);
  box(1.3, 0.36, 1.3, M.walnut, -5.2, FL + 0.18, 7.4);
  cyl(0.3, 0.36, 0.75, M.stoneWarm, -7.8, FL + 0.38, 8.2, 10);
  [0, 1].forEach(i => blob(0.55 - i * 0.14, M.leaf, -7.8, FL + 1.1 + i * 0.5, 8.2));

  // -- reading corner filling the middle of the plan, left of the aisle --
  function armchair(x, z, face){
    box(1.15, 0.34, 1.15, M.fabricDk, x, FL + 0.24, z);
    box(1.15, 0.55, 0.22, M.fabricDk, x + face * -0.46, FL + 0.55, z, true, false);
    box(0.2, 0.5, 1.0, M.fabricDk, x, FL + 0.5, z - 0.55, true, false);
    box(0.2, 0.5, 1.0, M.fabricDk, x, FL + 0.5, z + 0.55, true, false);
    [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]
      .forEach(o => cyl(0.035, 0.035, 0.24, M.bronze, x + o[0], FL + 0.12, z + o[1], 6, false));
  }
  box(8.2, 0.02, 7.6, mat(0x7E7068, 0.99), -4.6, FL + 0.01, 0.6, false);
  armchair(-6.8, -1.2, 1);
  armchair(-6.8, 2.4, 1);
  box(0.9, 0.1, 0.9, M.marble, -4.3, FL + 0.46, 0.6);
  box(0.44, 0.4, 0.44, M.bronze, -4.3, FL + 0.24, 0.6);
  box(0.3, 0.2, 0.22, mat(0x7C3350, 0.9), -4.3, FL + 0.58, 0.6, true, false);
  cyl(0.34, 0.4, 0.9, M.stoneWarm, -8.0, FL + 0.45, 4.4, 10);
  [0, 1, 2].forEach(i => blob(0.62 - i * 0.13, M.leaf, -8.0, FL + 1.25 + i * 0.55, 4.4));

  // console and mirror on the left wall, between the art and the kitchen
  box(0.5, 0.75, 3.4, M.walnut, -8.45, FL + 0.38, 7.4);
  box(0.6, 0.06, 3.5, M.marble, -8.45, FL + 0.78, 7.4, true, false);
  box(0.08, 2.1, 1.5, M.bronze, -8.72, FL + 2.1, 7.4, true, false);
  box(0.04, 1.9, 1.3, mat(0x59606B, 0.12, { metalness:0.9 }), -8.66, FL + 2.1, 7.4, false, false);
  [6.3, 8.5].forEach(z => { cyl(0.09, 0.11, 0.3, M.bronze, -8.45, FL + 0.95, z, 8, false);
                            box(0.2, 0.26, 0.2, M.lamp, -8.45, FL + 1.22, z, false, false); });

  // pendant cluster over the living group
  [[-6.4, -8.4, 0.9], [-5.2, -7.4, 1.3], [-4.2, -8.8, 0.6]].forEach(c => {
    cyl(0.012, 0.012, c[2], M.charcoal, c[0], FL + H1 - 0.55 - c[2] / 2, c[1], 6, false);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), M.lamp);
    b.position.set(c[0], FL + H1 - 0.55 - c[2], c[1]); world.add(b);
  });

  // -- entry hall: runner, console, bench --
  box(3.2, 0.02, 4.4, mat(0x74655F, 0.99), 0, FL + 0.008, -11.0, false);
  box(2.6, 0.4, 0.6, M.walnut, 0, FL + 0.2, -11.9);
  box(2.7, 0.06, 0.7, M.marble, 0, FL + 0.43, -11.9, true, false);
  [-0.8, 0.8].forEach(x => { cyl(0.12, 0.15, 0.42, M.bronze, x, FL + 0.67, -11.9, 10);
                             blob(0.26, M.leaf, x, FL + 1.0, -11.9); });
  box(1.9, 0.36, 0.55, M.fabricDk, 0, FL + 0.18, -9.6);
  box(6.6, 0.02, 3.0, mat(0x74655F, 0.99), 0, FL + 0.008, 11.4, false);

  // sheer curtains framing both glass walls
  [[-7.6, -HD + 0.55], [7.6, -HD + 0.55], [-7.8, HD - 0.55], [7.8, HD - 0.55]]
    .forEach(c => box(1.1, 4.2, 0.16, M.sheer, c[0], FL + 2.1, c[1], false, false));

  /* ---------- rear: deck, pool, pergola, lounge ---------- */
  box(10.8, 0.32, 32, M.paving, -11.6, 0.0, 28, false, true);
  box(10.8, 0.32, 32, M.paving,  11.6, 0.0, 28, false, true);
  box(12.4, 0.32, 4.8, M.paving, 0, 0.0, 14.4, false, true);
  box(12.4, 0.32, 8.8, M.paving, 0, 0.0, 39.6, false, true);
  box(11.4, 2.0, 17.4, M.tile, 0, -1.0, 26, false, true);   // basin, top just under the water
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 17.0), waterMaterial(0x14606E, 0x86D2CC, 0.9, 12));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.02, 26); world.add(pool);
  [[-5.9, 26, 0.6, 17.8], [5.9, 26, 0.6, 17.8], [0, 17.1, 12.4, 0.6], [0, 34.9, 12.4, 0.6]]
    .forEach(c => box(c[2], 0.24, c[3], M.stone, c[0], 0.09, c[1], false));
  [-5.4, 5.4].forEach(x => box(0.16, 0.5, 15.0, M.poolGlow, x, -0.55, 26, false, false));

  [[-13.6, 19.4], [-13.6, 30.6], [-8.2, 19.4], [-8.2, 30.6]].forEach(p => box(0.3, 3.4, 0.3, M.walnut, p[0], 1.7, p[1]));
  box(6.4, 0.24, 12.0, M.walnut, -10.9, 3.5, 25);
  for (let i = 0; i < 13; i++) box(6.0, 0.14, 0.16, M.walnut, -10.9, 3.3, 19.6 + i * 0.9, true, false);
  box(3.4, 0.4, 1.5, M.fabric, -10.9, 0.36, 22.2);
  box(3.4, 0.48, 0.3, M.fabric, -10.9, 0.70, 21.6);
  box(1.6, 0.4, 1.6, M.fabric, -12.8, 0.36, 26.6);
  box(1.5, 0.32, 1.5, M.walnut, -10.9, 0.32, 25.4);
  box(0.45, 0.5, 0.45, M.lamp, -10.9, 0.64, 25.4, false, false);

  [22, 26, 30].forEach(z => {
    box(1.05, 0.34, 2.3, M.fabric, 8.8, 0.42, z);
    const b = box(1.05, 0.22, 1.2, M.fabric, 8.8, 0.70, z - 1.25); b.rotation.x = -0.62;
    box(0.5, 0.4, 0.5, M.walnut, 10.4, 0.22, z - 0.7, true, false);
  });
  cyl(0.06, 0.06, 2.8, M.charcoal, 11.8, 1.4, 26, 8);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(2.5, 0.7, 14), M.fabric);
  shade.position.set(11.8, 2.9, 26); shade.castShadow = true; world.add(shade);

  box(2.4, 0.5, 1.2, M.stoneDark, 0, 0.27, 39);
  box(1.5, 0.16, 0.55, glow(0xFF8A3C, 3.0), 0, 0.58, 39, false, false);
  for (let i = 0; i < 8; i++){
    box(1.6, 1.0, 1.6, M.hedge, -16 + i * 4.6, 0.6, 41.5);
    box(1.8, 0.42, 1.8, M.stoneWarm, -16 + i * 4.6, 0.29, 41.5, true, false);
  }
  [[-16, 16], [16, 16], [-17, 38], [17, 38]].forEach(p => tree(p[0], p[1], 1.15, false));

  /* ---------- the flight path ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const path = new THREE.CatmullRomCurve3([
    V(-30, 22, -82), V(-42, 15, -62), V(-40, 10, -45), V(-28, 6.2, -31),
    V(-11, 3.9, -24), V(0, 3.3, -19),
    V(0, 2.85, -13.6), V(0, 2.80, -10), V(0, 2.78, -6.5), V(0, 2.76, -3),
    V(0, 2.76, 0.5),  V(0, 2.78, 4),   V(0, 2.82, 8),   V(0, 3.1, 12.6),
    V(0, 4.8, 18),    V(0, 11, 38),    V(0, 15, 54),    V(0, 20, 74),
    V(0, 27, 98)
  ], false, 'catmullrom', 0.4);

  const aim = new THREE.CatmullRomCurve3([
    V(0, 9.0, -18), V(-3, 7.5, -20), V(-4, 5.5, -20), V(-2, 4.0, -18),
    V(0, 3.2, -16), V(0, 2.9, -14),
    V(0, 2.80, -11), V(0, 2.78, -7.5), V(0, 2.76, -4), V(0, 2.76, -0.5),
    V(0, 2.76, 3),   V(0, 2.78, 6.5),  V(0, 2.82, 10.5), V(0, 3.0, 15),
    V(0, 1.2, 30),   V(0, 1.8, 20),   V(0, 3.5, 12),   V(0, 5.0, 4),
    V(0, 6.0, 0)
  ], false, 'catmullrom', 0.4);

  /* ---------- scroll → progress ---------- */
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  let targetP = 0, curP = 0, running = false, raf = null, lastFov = -1;
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  const t0 = performance.now();

  function readScroll(){
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    targetP = clamp(-r.top / (total || 1), 0, 1);
  }

  function resize(){
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function frame(){
    raf = requestAnimationFrame(frame);
    readScroll();

    curP += (targetP - curP) * 0.085;
    const u = clamp(curP, 0, 1);

    path.getPoint(u, pos);
    aim.getPoint(u, look);

    // inside, tip the aim toward whichever service wall is passing
    let nearD = 1e9, nearSide = 0;
    for (const p of panels){
      const d = Math.abs(pos.z - p.z);
      if (d < nearD){ nearD = d; nearSide = p.side; }
    }
    if (nearD < 6.5){
      const w = 1 - nearD / 6.5;
      look.x += nearSide * 6.0 * w * w;
    }

    for (const p of panels){
      const a = clamp(1 - Math.abs(pos.z - p.z) / 9, 0, 1);
      const e = a * a * (3 - 2 * a);
      p.mesh.material.opacity = e;
      p.mesh.material.emissiveIntensity = e * 0.8;
    }

    const et = (performance.now() - t0) / 1000;
    camera.position.copy(pos);
    camera.position.x += Math.sin(et * 0.7) * 0.07;
    camera.position.y += Math.sin(et * 1.13) * 0.05;
    camera.lookAt(look);

    const inside = clamp(1 - Math.abs(pos.z) / 15, 0, 1);
    const fov = 52 + inside * 16;
    if (Math.abs(fov - lastFov) > 0.05){ camera.fov = fov; camera.updateProjectionMatrix(); lastFov = fov; }

    uTime.value = et;

    if (headline) headline.classList.toggle('is-on', u < 0.14);
    section.classList.toggle('hide-hint', u > 0.04);
    if (railFill) railFill.style.transform = `scaleX(${u.toFixed(4)})`;

    renderer.render(scene, camera);
  }

  function start(){ if (!running){ running = true; raf = requestAnimationFrame(frame); } }
  function stop(){ if (running){ running = false; cancelAnimationFrame(raf); } }

  resize();
  window.addEventListener('resize', resize, { passive:true });
  new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop()), { rootMargin:'200px' }).observe(section);

  section.classList.add('has-webgl');
  readScroll();
  curP = targetP;
}
