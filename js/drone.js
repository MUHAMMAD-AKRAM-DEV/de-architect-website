/* ============================================================================
   DE Architects — section 3: scroll-driven drone fly-through
   ----------------------------------------------------------------------------
   Everything in this scene is built from code. There are no images, no models,
   no textures on disk — the house, the garden, the pool and the lettering on
   the walls are all generated at runtime, so the section ships with the site.

   Scroll position drives a camera along a spline: approach high over the front
   garden, arc down around the facade, push in through the front door, weave
   past the six service walls, then out the rear glass and up over the pool.
   Scroll back up and the drone flies the route in reverse.

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

/* ---------- palette (the site's tokens, as numbers) ---------- */
const C = {
  paper:0xF4EFE6, paperWarm:0xFAF6EE, paper2:0xE4DBC9,
  plum:0x3E0E2C, crimson:0xC2183F,
  lawn:0x7C9A62, hedge:0x5C784C, bark:0x6A4A34,
  timber:0x9C6533, deck:0xE0D6C4, tile:0x14454F, ink:0x241019
};

/* the six services, in the order the drone passes them.
   side: -1 = left wall, +1 = right wall.  z = position down the house. */
const SERVICES = [
  { n:'01', title:'Residential\nArchitecture', sub:'Concept to keys',            side:-1, z:-7.6 },
  { n:'02', title:'Interior\nDesign',          sub:'Spaces that feel like you',  side: 1, z:-4.6 },
  { n:'03', title:'Commercial\n& Workspaces',  sub:'Where business takes shape', side:-1, z:-1.6 },
  { n:'04', title:'Renovation\n& Restoration', sub:'Brought back to life',       side: 1, z: 1.4 },
  { n:'05', title:'Landscape\n& Exteriors',    sub:'Design meets the outdoors',  side:-1, z: 4.4 },
  { n:'06', title:'3D\nVisualisation',         sub:"See it before it's built",   side: 1, z: 7.4 }
];

/* house dimensions — referenced by the garden, the pool and the camera path */
const HW = 8;    // half width  → walls at x = ±8
const HH = 4.6;  // interior height
const HD = 11;   // half depth  → front wall z = -11, rear wall z = +11

if (section && canvas && !reduce && webglOK()) boot();

async function boot(){
  /* Anton and Inter are already loading for the page; the wall lettering is
     drawn to a canvas, so we have to wait for the real faces or it bakes in
     the fallback font. */
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
  renderer.toneMappingExposure = 1.12;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.4, 500);

  /* ---------- sky: a soft dusk gradient, doubled as the environment map ---------- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite:false,
    uniforms:{
      top:{ value:new THREE.Color(0x93A6C8) },
      mid:{ value:new THREE.Color(0xF0E7D8) },
      bot:{ value:new THREE.Color(0xEED3A6) }
    },
    vertexShader:`varying vec3 vP;
      void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader:`varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      void main(){
        float h = normalize(vP).y;
        vec3 c = mix(bot, mid, smoothstep(-0.20, 0.16, h));
        c = mix(c, top, smoothstep(0.10, 0.72, h));
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat));

  // an environment map gives every surface a believable sheen without any HDRI file
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat));
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.fog = new THREE.FogExp2(0xE8DECB, 0.0030);

  /* ---------- light: one warm low sun, plus sky fill ---------- */
  scene.add(new THREE.HemisphereLight(0xD6E2F4, 0x9C9482, 0.95));

  const sun = new THREE.DirectionalLight(0xFFE2BC, 2.9);
  sun.position.set(-38, 30, -34);
  if (!small){
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = -52; s.right = 52; s.top = 52; s.bottom = -52; s.near = 1; s.far = 140;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.03;
  }
  scene.add(sun);

  // interior fill so the wall lettering reads once the drone is inside
  [-8, -2, 4, 9].forEach(z => {
    const l = new THREE.PointLight(0xFFEEDA, 22, 22, 2);
    l.position.set(0, HH - 0.9, z);
    scene.add(l);
  });

  /* ---------- materials ---------- */
  const mat = (color, rough = 0.92, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness:rough, metalness:0, ...opts });

  // a little mottling stops the lawn reading as flat felt
  function lawnTexture(){
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const g = cv.getContext('2d');
    g.fillStyle = '#7C9A62'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2400; i++){
      const r = 6 + Math.random() * 26;
      g.fillStyle = `rgba(${(88 + Math.random() * 46) | 0},${(118 + Math.random() * 44) | 0},${(66 + Math.random() * 34) | 0},0.11)`;
      g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, r, 0, 6.2832); g.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(28, 28);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  const M = {
    plaster  : mat(C.paper, 0.95),
    plasterIn: mat(C.paperWarm, 0.96),
    ceiling  : mat(C.paperWarm, 0.96, { emissive:new THREE.Color(0xFFF4E4), emissiveIntensity:0.22 }),
    soffit   : mat(C.paperWarm, 0.94),
    slab     : mat(C.plum, 0.8),
    floor    : mat(0xB98D5E, 0.8),
    stone    : mat(C.deck, 0.93),
    timber   : mat(C.timber, 0.75),
    lawn     : mat(0xFFFFFF, 1, { map:lawnTexture() }),
    hedge    : new THREE.MeshStandardMaterial({ color:C.hedge, roughness:1, flatShading:true }),
    bark     : mat(C.bark, 1),
    tile     : mat(C.tile, 0.5),
    soft     : mat(0xDCD2C4, 0.98),
    glass    : new THREE.MeshPhysicalMaterial({
      color:0xD4E5E6, roughness:0.05, metalness:0, transparent:true,
      opacity:0.22, envMapIntensity:1.8, side:THREE.DoubleSide
    })
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

  /* ---------- ground ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M.lawn);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.10;   // clear of the floor slab and the pool basin
  ground.receiveShadow = true;
  world.add(ground);

  /* ---------- the house ---------- */
  box(HW * 2, 0.24, HD * 2, M.floor, 0, -0.12, 0, false, true);
  box(HW * 2 - 0.1, 0.14, HD * 2 - 0.1, M.ceiling, 0, HH - 0.07, 0, false, false); // ceiling

  // side walls — these carry the service lettering
  box(0.32, HH, HD * 2, M.plaster, -HW - 0.16, HH / 2, 0);
  box(0.32, HH, HD * 2, M.plaster,  HW + 0.16, HH / 2, 0);

  // front wall: glazing left, timber screen right, a door gap for the drone
  const DOOR_W = 2.6, DOOR_H = 3.3, SIDE_W = HW - DOOR_W / 2;
  box(SIDE_W, HH, 0.3, M.plaster, -(DOOR_W / 2 + SIDE_W / 2), HH / 2, -HD);
  box(SIDE_W, HH, 0.3, M.plaster,  (DOOR_W / 2 + SIDE_W / 2), HH / 2, -HD);
  box(DOOR_W, HH - DOOR_H, 0.3, M.plaster, 0, DOOR_H + (HH - DOOR_H) / 2, -HD);

  for (let i = 0; i < 3; i++){
    const gx = -6.4 + i * 1.9;
    box(1.6, 3.0, 0.08, M.glass, gx, 1.7, -HD - 0.24, false, false);
    box(0.1, 3.2, 0.16, M.slab, gx - 0.86, 1.7, -HD - 0.16);
  }
  box(0.1, 3.2, 0.16, M.slab, 2.92, 1.7, -HD - 0.16);

  for (let i = 0; i < 13; i++){
    box(0.16, 3.6, 0.16, M.timber, 2.1 + i * 0.46, 1.9, -HD - 0.2);
  }

  // rear wall: full-width glazing onto the pool
  box(2.0, HH, 0.3, M.plaster, -HW + 1.0, HH / 2, HD);
  box(2.0, HH, 0.3, M.plaster,  HW - 1.0, HH / 2, HD);
  box(12.0, HH - 3.9, 0.3, M.plaster, 0, 3.9 + (HH - 3.9) / 2, HD);
  for (let i = 0; i < 4; i++){
    const gx = -4.5 + i * 3.0;
    box(2.7, 3.8, 0.08, M.glass, gx, 1.9, HD + 0.22, false, false);
    box(0.12, 3.9, 0.2, M.slab, gx - 1.5, 1.95, HD + 0.14);
  }
  box(0.12, 3.9, 0.2, M.slab, 6.0, 1.95, HD + 0.14);

  // roof: thin dark fascia over a pale soffit, so the mass reads light
  box(HW * 2 + 1.7, 0.30, HD * 2 + 1.7, M.slab, 0, HH + 0.21, 0);
  box(HW * 2 + 1.4, 0.10, HD * 2 + 1.4, M.soffit, 0, HH + 0.03, 0, false, false);
  box(5.0, 0.8, 6.0, M.plaster, 2.0, HH + 0.75, -1.0);

  // entry canopy + columns + step
  box(6.0, 0.22, 3.2, M.slab, 0, HH - 0.6, -HD - 1.6);
  box(5.7, 0.08, 3.0, M.soffit, 0, HH - 0.72, -HD - 1.6, false, false);
  [-2.3, 2.3].forEach(x => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, HH - 0.75, 12), M.slab);
    col.position.set(x, (HH - 0.75) / 2, -HD - 2.9);
    col.castShadow = true; world.add(col);
  });
  box(7.0, 0.18, 2.2, M.stone, 0, 0.09, -HD - 1.1);

  // side wing — a second volume to orbit
  box(6.4, 3.4, 8.0, M.plaster, -12.6, 1.7, -4.0);
  box(7.0, 0.28, 8.6, M.slab, -12.6, 3.54, -4.0);
  box(6.8, 0.08, 8.4, M.soffit, -12.6, 3.38, -4.0, false, false);
  for (let i = 0; i < 5; i++) box(0.16, 2.6, 0.16, M.timber, -15.6, 1.4, -6.6 + i * 1.3);

  /* ---------- the service lettering, set into the side walls ---------- */
  function serviceTexture(s){
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 512;
    const g = cv.getContext('2d');
    g.textBaseline = 'top';

    const PAD = 44, MAXW = cv.width - PAD * 2;
    const lines = s.title.toUpperCase().split('\n');

    // shrink the display face until the longest line fits the panel
    let px = 150;
    const fits = () => {
      g.font = `${px}px Anton, sans-serif`;
      return lines.every(ln => g.measureText(ln).width <= MAXW);
    };
    while (px > 46 && !fits()) px -= 3;

    g.fillStyle = '#C2183F';
    g.font = '700 58px Inter, sans-serif';
    g.fillText(s.n, PAD, 30);
    g.fillStyle = 'rgba(194,24,63,.45)';
    g.fillRect(PAD, 104, 92, 4);

    g.fillStyle = '#3E0E2C';
    g.font = `${px}px Anton, sans-serif`;
    const lh = px * 0.92;
    lines.forEach((ln, i) => g.fillText(ln, PAD, 142 + i * lh));

    // subtitle, shrunk the same way
    let sp = 38;
    g.font = `600 ${sp}px Inter, sans-serif`;
    while (sp > 20 && g.measureText(s.sub.toUpperCase()).width > MAXW){
      sp -= 2; g.font = `600 ${sp}px Inter, sans-serif`;
    }
    g.fillStyle = 'rgba(62,14,44,.6)';
    g.fillText(s.sub.toUpperCase(), PAD + 2, 152 + lines.length * lh);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  const panels = SERVICES.map(s => {
    const tex = serviceTexture(s);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 3.2),
      new THREE.MeshStandardMaterial({
        map:tex, emissiveMap:tex, emissive:new THREE.Color(C.crimson), emissiveIntensity:0,
        transparent:true, opacity:0, roughness:1, metalness:0, depthWrite:false
      })
    );
    m.position.set(s.side * (HW - 0.04), 2.5, s.z);
    m.rotation.y = s.side < 0 ? Math.PI / 2 : -Math.PI / 2;
    world.add(m);
    return { mesh:m, z:s.z, side:s.side };
  });

  /* ---------- interior furniture, kept low so the camera clears it ---------- */
  box(5.6, 0.04, 3.4, M.stone, -4.2, 0.01, -4.6, false);  // rug
  box(3.4, 0.42, 1.5, M.soft, -4.4, 0.24, -5.2);          // sofa seat
  box(3.9, 0.52, 0.34, M.soft, -4.4, 0.55, -5.86);        // sofa back
  box(0.28, 0.56, 1.5, M.soft, -6.1, 0.32, -5.2);         // sofa arms
  box(0.28, 0.56, 1.5, M.soft, -2.7, 0.32, -5.2);
  box(1.7, 0.32, 0.9, M.timber, -4.4, 0.16, -3.4);        // coffee table
  box(2.9, 0.10, 1.2, M.timber, 4.4, 0.74, 1.6);          // dining top
  box(2.4, 0.72, 0.7, M.soft, 4.4, 0.36, 1.6);            // dining base
  box(3.4, 0.88, 1.0, M.stone, 4.6, 0.44, 9.4);           // kitchen island
  box(3.5, 0.08, 1.1, M.timber, 4.6, 0.92, 9.4);          // island top
  box(0.7, 0.6, 0.7, M.stone, -6.6, 0.3, 9.6);            // planter
  box(0.6, 1.1, 0.6, M.hedge, -6.6, 1.15, 9.6);

  /* ---------- front garden ---------- */
  box(3.4, 0.08, 30, M.stone, 0, 0.04, -28, false);
  box(28, 1.1, 0.5, M.plaster, -16, 0.55, -42);
  box(28, 1.1, 0.5, M.plaster,  16, 0.55, -42);
  [-2.6, 2.6].forEach(x => box(0.8, 0.5, 14, M.hedge, x, 0.25, -22));

  /* ---------- rear: deck and swimming pool ---------- */
  box(5.8, 0.14, 22, M.stone, -7.1, 0.07, 22, false);
  box(5.8, 0.14, 22, M.stone,  7.1, 0.07, 22, false);
  box(8.4, 0.14, 3.0, M.stone, 0, 0.07, 12.5, false);
  box(8.4, 0.14, 3.0, M.stone, 0, 0.07, 31.5, false);
  box(8.4, 1.8, 16.4, M.tile, 0, -0.93, 22, false, true);   // basin, top just above the lawn

  const waterMat = new THREE.ShaderMaterial({
    transparent:true,
    uniforms:{
      uTime:{ value:0 },
      uDeep:{ value:new THREE.Color(0x2E8894) },
      uShallow:{ value:new THREE.Color(0x9EDCD4) }
    },
    vertexShader:`varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader:`uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; varying vec2 vUv;
      void main(){
        vec2 p = vUv * vec2(5.0, 10.0);
        float a = sin(p.x * 2.0 + uTime * 0.8) * sin(p.y * 1.5 - uTime * 0.6);
        float b = sin((p.x + p.y) * 2.2 - uTime * 1.1);
        float caustic = smoothstep(0.45, 1.0, a * 0.55 + b * 0.45 + 0.5);
        vec3 col = mix(uDeep, uShallow, smoothstep(0.0, 1.0, vUv.y * 0.55 + 0.25));
        col += caustic * 0.30;
        gl_FragColor = vec4(col, 0.9);
      }`
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 16.2), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.02, 22);
  world.add(water);

  box(9.0, 0.16, 0.5, M.stone, 0, 0.06, 13.85, false);
  box(9.0, 0.16, 0.5, M.stone, 0, 0.06, 30.15, false);
  box(0.5, 0.16, 16.6, M.stone, -4.45, 0.06, 22, false);
  box(0.5, 0.16, 16.6, M.stone,  4.45, 0.06, 22, false);

  [18, 21.5].forEach(z => {
    box(1.2, 0.34, 2.3, M.soft, -6.6, 0.33, z);
    const back = box(1.2, 0.20, 1.2, M.soft, -6.6, 0.60, z - 1.25);
    back.rotation.x = -0.6;
  });
  box(26, 1.3, 0.6, M.hedge, 0, 0.65, 35);

  /* ---------- the flight path ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // 19 waypoints → 18 segments. Approach 6, entry+interior 8, exit 5,
  // so roughly 44% of the scroll is spent inside with the services.
  const path = new THREE.CatmullRomCurve3([
    V(-24, 14, -38),  V(-33, 11, -31),  V(-34, 8.0, -24),  V(-25, 5.0, -18),
    V(-10, 3.2, -17.5), V(0, 2.6, -15.0),
    V(0, 2.40, -11.5), V(0, 2.35, -8.0), V(0, 2.32, -4.5), V(0, 2.30, -1.0),
    V(0, 2.30, 2.5),  V(0, 2.32, 6.0),  V(0, 2.38, 9.0),  V(0, 2.60, 11.8),
    V(0, 4.0, 15.5),  V(0, 10, 34),     V(0, 13.5, 48),   V(0, 17.5, 64),
    V(0, 22, 82)
  ], false, 'catmullrom', 0.4);

  const aim = new THREE.CatmullRomCurve3([
    V(0, 4.4, -3),   V(-2, 4.0, -7),  V(-3, 3.4, -10), V(-3, 2.8, -11),
    V(-1, 2.7, -12), V(0, 2.5, -12),
    V(0, 2.4, -9),   V(0, 2.35, -5),  V(0, 2.32, -1.5),V(0, 2.30, 2),
    V(0, 2.30, 5.5), V(0, 2.32, 9),   V(0, 2.38, 12.5),V(0, 2.4, 15),
    V(0, 0.6, 25),   V(0, 1.2, 16),   V(0, 2.0, 9),    V(0, 2.5, 4),
    V(0, 3.0, 0)
  ], false, 'catmullrom', 0.4);

  /* ---------- trees, kept clear of the flight corridor ---------- */
  // sample the path once, then refuse to plant anything the camera would hit
  const corridor = [];
  for (let i = 0; i <= 240; i++){
    const p = path.getPoint(i / 240);
    if (p.y < 10) corridor.push(p.x, p.z);   // higher passes clear the canopies
  }
  function clearOfPath(x, z, r){
    for (let i = 0; i < corridor.length; i += 2){
      const dx = corridor[i] - x, dz = corridor[i + 1] - z;
      if (dx * dx + dz * dz < r * r) return false;
    }
    return true;
  }

  function tree(x, z, scale){
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 2.0, 8), M.bark);
    trunk.position.y = 1.0; trunk.castShadow = true; g.add(trunk);
    // a little colour drift per tree so the canopy is not one flat green
    const leaf = new THREE.MeshStandardMaterial({
      color:new THREE.Color(C.hedge).offsetHSL(0, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.09),
      roughness:1, flatShading:true
    });
    for (let i = 0; i < 3; i++){
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35 - i * 0.3, 0), leaf);
      f.position.y = 2.1 + i * 0.85;
      f.rotation.set(Math.random(), Math.random(), Math.random());
      f.castShadow = true; g.add(f);
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    world.add(g);
  }

  [[-11,-20,1.15],[-16,-27,1.4],[-9,-33,1.0],[-18,-38,1.25],[-25,-22,1.5],[-22,-33,1.1],
   [9,-17,1.2],[14,-25,1.35],[8,-34,1.05],[18,-21,1.45],[21,-34,1.2],[13,-40,1.3],
   [24,-13,1.25],[-29,-14,1.3],[-28,-37,1.4],[27,-29,1.35],
   [-12,16,1.1],[12,17,1.15],[-13,30,1.25],[13,29,1.2],[-16,24,1.0],[16,24,1.05]]
    .forEach(t => { if (clearOfPath(t[0], t[1], 11)) tree(t[0], t[1], t[2]); });

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

    // damping — the drone eases toward the scroll position instead of snapping
    curP += (targetP - curP) * 0.085;
    const u = clamp(curP, 0, 1);

    path.getPoint(u, pos);
    aim.getPoint(u, look);

    // inside the house, tip the aim toward whichever service wall is passing
    let nearD = 1e9, nearSide = 0;
    for (const p of panels){
      const d = Math.abs(pos.z - p.z);
      if (d < nearD){ nearD = d; nearSide = p.side; }
    }
    if (nearD < 6.5){
      const w = 1 - nearD / 6.5;
      look.x += nearSide * 5.5 * w * w;
    }

    // reveal each panel as the drone draws level with it
    for (const p of panels){
      const a = clamp(1 - Math.abs(pos.z - p.z) / 9, 0, 1);
      const e = a * a * (3 - 2 * a);
      p.mesh.material.opacity = e;
      p.mesh.material.emissiveIntensity = e * 0.8;
    }

    const et = (performance.now() - t0) / 1000;
    camera.position.copy(pos);
    // a touch of drone float so the shot never feels like it is on rails
    camera.position.x += Math.sin(et * 0.7) * 0.07;
    camera.position.y += Math.sin(et * 1.13) * 0.05;
    camera.lookAt(look);

    // wider lens indoors, so the interior feels open
    const inside = clamp(1 - Math.abs(pos.z) / 13, 0, 1);
    const fov = 52 + inside * 16;
    if (Math.abs(fov - lastFov) > 0.05){ camera.fov = fov; camera.updateProjectionMatrix(); lastFov = fov; }

    waterMat.uniforms.uTime.value = et;

    if (headline) headline.classList.toggle('is-on', u < 0.14);
    section.classList.toggle('hide-hint', u > 0.04);
    if (railFill) railFill.style.transform = `scaleX(${u.toFixed(4)})`;

    renderer.render(scene, camera);
  }

  function start(){ if (!running){ running = true; raf = requestAnimationFrame(frame); } }
  function stop(){ if (running){ running = false; cancelAnimationFrame(raf); } }

  resize();
  window.addEventListener('resize', resize, { passive:true });

  // only burn frames while the section is actually on screen
  new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting ? start() : stop());
  }, { rootMargin:'200px' }).observe(section);

  section.classList.add('has-webgl');
  readScroll();
  curP = targetP;
}
