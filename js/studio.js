/* ============================================================================
   DE Architects — section 3, engine C: the studio fly-through
   ----------------------------------------------------------------------------
   Instead of a house, this flies through DE Architects' own two-storey studio.
   The services are not lettering on a wall any more — they are the drawings on
   the drafting tables, each one a real sheet with linework, dimensions and a
   title block, drawn to canvas at runtime. No image or model assets.

   The move: close on the entrance sign → in through the door → down the
   drafting hall past the six service boards → the model bay → up through the
   double-height void → back along the gallery → out the upper glazing, pulling
   away to reveal the whole studio in the city.

   Two other engines read the same markup — js/drone.js (the villa) and
   js/flight.js (a pre-rendered image reel). Swap them in index.html.
   ========================================================================== */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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

/* ---------- the studio shell ---------- */
const HW   = 11.5;  // half width → side walls at x = ±11.5
const FRONT= -12;   // front facade
const BACK =  26;   // rear wall
const GH   = 5.2;   // ground floor clear height
const SLAB = 0.5;
const UH   = 4.6;   // upper floor clear height
const UY   = GH + SLAB;          // upper finished floor level
const TOP  = UY + UH;            // underside of roof

/* ---------- the six services, as drawings on the tables ----------
   side: -1 = left of the aisle, +1 = right.  z = position down the hall. */
const SERVICES = [
  { n:'01', title:'Residential Architecture', sub:'Concept to keys',            dwg:'A-101', scale:'1:100', side:-1, z:-4,  kind:'plan'  },
  { n:'02', title:'Interior Design',          sub:'Spaces that feel like you',  dwg:'ID-204', scale:'1:50', side: 1, z: 0,  kind:'layout'},
  { n:'03', title:'Commercial & Workspaces',  sub:'Where business takes shape', dwg:'C-310', scale:'1:200', side:-1, z: 4,  kind:'grid'  },
  { n:'04', title:'Renovation & Restoration', sub:'Brought back to life',       dwg:'R-118', scale:'1:100', side: 1, z: 8,  kind:'elev'  },
  { n:'05', title:'Landscape & Exteriors',    sub:'Design meets the outdoors',  dwg:'L-402', scale:'1:500', side:-1, z:12,  kind:'site'  },
  { n:'06', title:'3D Visualisation',         sub:"See it before it's built",   dwg:'V-006', scale:'N.T.S.',side: 1, z:16,  kind:'axo'   }
];

if (section && canvas && !reduce && webglOK()) boot();

async function boot(){
  try {
    await Promise.all([
      document.fonts.load('120px Anton'),
      document.fonts.load('600 40px Inter'),
      document.fonts.ready
    ]);
  } catch (e){ /* fall through with whatever is available */ }

  const small = window.innerWidth < 900;
  let visible = false, settled = false;   // declared early: texture callbacks call wake()

  /* MSAA earns its keep at 1:1, but on a hi-dpi screen the extra samples cost
     fill that buys more clarity if spent on resolution instead. So above 1.4
     device pixels the multisampling comes off and the buffer goes to native. */
  const hidpi = window.devicePixelRatio >= 1.4;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:!small && !hidpi, powerPreference:'high-performance' });
  /* Measured at 1440x900 on the target GPU: 1.0 -> 10.5ms, 1.25 -> 15.3ms,
     1.5 -> 21.0ms, 2.0 -> 34.7ms. The previous 1.1 cap on a 1.5-DPR screen
     upscaled the buffer by half again, which is what read as soft. Render at
     native up to 1.5, and never below 1:1 — blur costs more than a few fps. */
  const DPR_MAX = Math.min(window.devicePixelRatio, small ? 1.25 : 1.5);
  const DPR_MIN = 1.0;
  let dpr = DPR_MAX;
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const MAXA = renderer.capabilities.getMaxAnisotropy();

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 900);

  /* ---------- late-afternoon sky ---------- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite:false,
    uniforms:{
      top:{ value:new THREE.Color(0x6E8DBE) },
      mid:{ value:new THREE.Color(0xCFDCEA) },
      bot:{ value:new THREE.Color(0xF3E3CB) }
    },
    vertexShader:`varying vec3 vP;
      void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader:`varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      void main(){
        float h = normalize(vP).y;
        vec3 c = mix(bot, mid, smoothstep(-0.05, 0.22, h));
        c = mix(c, top, smoothstep(0.16, 0.78, h));
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), skyMat));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), skyMat));
  const envTex = pmrem.fromScene(envScene, 0.02).texture;
  pmrem.dispose();          // the render target is not needed once baked
  scene.fog = new THREE.FogExp2(0xC9CFD6, 0.0022);

  /* ---------- canvas texture helper ---------- */
  function tex(draw, w, h, rx, ry){
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    if (rx){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); }
    t.anisotropy = MAXA;   // was 4; walls are read at grazing angles
    return t;
  }

  /* ========================================================================
     THE DRAWINGS
     Each service gets a real sheet: border, linework, dimensions and a title
     block. These are what sit on the drafting tables and hang on the boards.
     ===================================================================== */
  const INK = '#3E0E2C', RED = '#C2183F', GREY = 'rgba(62,14,44,.42)';

  function dim(g, x1, y1, x2, y2, label){          // dimension line with ticks
    g.strokeStyle = GREY; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    const t = 4;
    [[x1, y1], [x2, y2]].forEach(p => {
      g.beginPath(); g.moveTo(p[0] - t, p[1] - t); g.lineTo(p[0] + t, p[1] + t); g.stroke();
    });
    if (label){
      g.fillStyle = GREY; g.font = '600 15px Inter, sans-serif'; g.textAlign = 'center';
      g.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 7);
      g.textAlign = 'left';
    }
  }
  function hatch(g, x, y, w, h, step, col){
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.strokeStyle = col; g.lineWidth = 1;
    for (let i = -h; i < w + h; i += step){
      g.beginPath(); g.moveTo(x + i, y + h); g.lineTo(x + i + h, y); g.stroke();
    }
    g.restore();
  }
  function wall(g, x, y, w, h){                    // poché: two lines, filled
    g.fillStyle = INK; g.fillRect(x, y, w, h);
  }

  // 01 — a floor plan
  function drawPlan(g){
    const T = 9;
    g.lineWidth = 2; g.strokeStyle = INK;
    wall(g, 40, 40, 520, T); wall(g, 40, 340, 520, T);
    wall(g, 40, 40, T, 309); wall(g, 551, 40, T, 309);
    wall(g, 250, 49, T, 130); wall(g, 250, 240, T, 100);
    wall(g, 259, 170, 130, T);
    // door swings
    g.strokeStyle = INK; g.lineWidth = 1.5;
    [[254, 179], [254, 230]].forEach(p => {
      g.beginPath(); g.arc(p[0], p[1], 46, -Math.PI / 2, 0); g.stroke();
      g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0], p[1] + 46); g.stroke();
    });
    // glazing on the south wall
    g.strokeStyle = RED; g.lineWidth = 3;
    g.beginPath(); g.moveTo(330, 344); g.lineTo(520, 344); g.stroke();
    // stair
    g.strokeStyle = INK; g.lineWidth = 1.2;
    for (let i = 0; i < 9; i++){ g.beginPath(); g.moveTo(400, 60 + i * 12); g.lineTo(470, 60 + i * 12); g.stroke(); }
    g.strokeRect(400, 60, 70, 108);
    // labels
    g.fillStyle = INK; g.font = '600 17px Inter, sans-serif';
    g.fillText('LIVING', 90, 300); g.fillText('KITCHEN', 300, 300); g.fillText('BED 01', 90, 90);
    g.font = '13px Inter, sans-serif'; g.fillStyle = GREY;
    g.fillText('42.5 m²', 90, 318); g.fillText('18.0 m²', 300, 318);
    dim(g, 40, 375, 560, 375, '12 400');
    dim(g, 20, 40, 20, 349, '7 200');
  }

  // 02 — an interior layout
  function drawLayout(g){
    g.strokeStyle = INK; g.lineWidth = 2.5;
    g.strokeRect(40, 40, 520, 300);
    hatch(g, 120, 150, 250, 150, 11, 'rgba(62,14,44,.13)');   // rug
    g.lineWidth = 1.8; g.strokeStyle = INK;
    g.strokeRect(130, 165, 150, 55);        // sofa
    g.strokeRect(130, 155, 150, 12);
    g.strokeRect(300, 175, 60, 36);         // chair
    g.beginPath(); g.ellipse(205, 265, 42, 26, 0, 0, 6.2832); g.stroke();  // table
    g.strokeRect(410, 70, 120, 230);        // joinery run
    for (let i = 0; i < 5; i++){ g.beginPath(); g.moveTo(410, 70 + i * 46); g.lineTo(530, 70 + i * 46); g.stroke(); }
    g.strokeStyle = RED; g.lineWidth = 2.5;
    g.beginPath(); g.arc(205, 265, 60, 0, 6.2832); g.stroke();             // pendant above
    g.fillStyle = INK; g.font = '600 17px Inter, sans-serif';
    g.fillText('LOUNGE', 70, 320); g.fillText('JOINERY', 410, 320);
    g.font = '13px Inter, sans-serif'; g.fillStyle = GREY;
    g.fillText('OAK / BRASS / LINEN', 70, 70);
    dim(g, 40, 372, 560, 372, '9 600');
  }

  // 03 — a column grid
  function drawGrid(g){
    const cols = 6, rows = 4, x0 = 80, y0 = 60, dx = 82, dy = 72;
    g.strokeStyle = GREY; g.lineWidth = 1;
    for (let c = 0; c < cols; c++){
      g.beginPath(); g.moveTo(x0 + c * dx, y0 - 26); g.lineTo(x0 + c * dx, y0 + (rows - 1) * dy + 26); g.stroke();
      g.beginPath(); g.arc(x0 + c * dx, y0 - 40, 14, 0, 6.2832); g.stroke();
      g.fillStyle = INK; g.font = '600 14px Inter, sans-serif'; g.textAlign = 'center';
      g.fillText(String(c + 1), x0 + c * dx, y0 - 35);
    }
    for (let r = 0; r < rows; r++){
      g.strokeStyle = GREY;
      g.beginPath(); g.moveTo(x0 - 26, y0 + r * dy); g.lineTo(x0 + (cols - 1) * dx + 26, y0 + r * dy); g.stroke();
      g.beginPath(); g.arc(x0 - 42, y0 + r * dy, 14, 0, 6.2832); g.stroke();
      g.fillStyle = INK; g.fillText('ABCD'[r], x0 - 42, y0 + r * dy + 5);
    }
    g.textAlign = 'left';
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++){
      g.fillStyle = INK; g.fillRect(x0 + c * dx - 6, y0 + r * dy - 6, 12, 12);
    }
    g.strokeStyle = INK; g.lineWidth = 2.5;
    g.strokeRect(x0 + dx - 10, y0 + dy - 10, dx * 2 + 20, dy + 20);       // core
    hatch(g, x0 + dx - 10, y0 + dy - 10, dx * 2 + 20, dy + 20, 12, 'rgba(194,24,63,.22)');
    g.fillStyle = INK; g.font = '600 16px Inter, sans-serif';
    g.fillText('SERVICE CORE', x0 + dx + 6, y0 + dy + 42);
    dim(g, x0, 372, x0 + (cols - 1) * dx, 372, '8 × 5 400');
  }

  // 04 — an elevation, existing vs new
  function drawElev(g){
    g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(40, 330); g.lineTo(560, 330); g.stroke();     // ground
    g.strokeRect(70, 120, 230, 210);                                      // existing wing
    hatch(g, 70, 120, 230, 210, 13, 'rgba(62,14,44,.16)');
    g.strokeRect(300, 70, 230, 260);                                      // new wing
    g.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++)
      g.strokeRect(96 + i * 70, 152 + j * 90, 44, 60);                    // existing windows
    g.strokeStyle = RED; g.lineWidth = 2.2;
    for (let i = 0; i < 3; i++) g.strokeRect(324 + i * 68, 110, 50, 180); // new glazing
    g.setLineDash([7, 6]); g.strokeStyle = GREY; g.lineWidth = 1.4;
    g.strokeRect(232, 120, 68, 210); g.setLineDash([]);                   // to be removed
    g.fillStyle = GREY; g.font = '600 14px Inter, sans-serif';
    g.fillText('EXISTING — RETAIN', 74, 112);
    g.fillStyle = RED; g.fillText('NEW BUILD', 304, 62);
    g.fillStyle = GREY; g.font = '12px Inter, sans-serif';
    g.fillText('DEMOLISH', 236, 348);
    dim(g, 40, 372, 560, 372, '18 000');
    dim(g, 20, 70, 20, 330, '6 800');
  }

  // 05 — a landscape site plan
  function drawSite(g){
    g.strokeStyle = GREY; g.lineWidth = 1.2;
    for (let i = 0; i < 5; i++){                                          // contours
      g.beginPath();
      for (let x = 40; x <= 560; x += 18)
        g.lineTo(x, 90 + i * 52 + Math.sin((x + i * 60) / 74) * 16);
      g.stroke();
    }
    g.setLineDash([10, 6]); g.strokeStyle = INK; g.lineWidth = 1.8;
    g.strokeRect(40, 40, 520, 300); g.setLineDash([]);                    // boundary
    g.fillStyle = 'rgba(62,14,44,.14)'; g.fillRect(180, 130, 220, 130);
    g.strokeStyle = INK; g.lineWidth = 2.4; g.strokeRect(180, 130, 220, 130);
    g.fillStyle = INK; g.font = '600 16px Inter, sans-serif';
    g.fillText('HOUSE', 262, 200);
    g.strokeStyle = RED; g.lineWidth = 2;                                  // path
    g.beginPath(); g.moveTo(290, 340); g.bezierCurveTo(290, 300, 250, 285, 250, 262); g.stroke();
    g.strokeStyle = 'rgba(62,14,44,.55)'; g.lineWidth = 1.4;
    [[90,90,26],[130,300,20],[470,100,24],[500,290,18],[95,200,15],[510,196,16],[430,320,14],[150,80,13]]
      .forEach(t => {
        g.beginPath(); g.arc(t[0], t[1], t[2], 0, 6.2832); g.stroke();
        g.beginPath(); g.arc(t[0], t[1], t[2] * 0.4, 0, 6.2832); g.stroke();
      });
    g.fillStyle = GREY; g.font = '13px Inter, sans-serif';
    g.fillText('EXISTING OAK — RETAIN', 60, 132);
    dim(g, 40, 372, 560, 372, '48 000');
  }

  // 06 — an axonometric
  function drawAxo(g){
    const P = (x, y, z) => [300 + (x - z) * 0.86, 250 - y - (x + z) * 0.5];
    const poly = (pts, w, col, close) => {
      g.strokeStyle = col; g.lineWidth = w; g.beginPath();
      pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
      if (close) g.closePath();
      g.stroke();
    };
    const W = 150, D = 110, H = 95;
    const b = [P(-W,0,-D), P(W,0,-D), P(W,0,D), P(-W,0,D)];
    const t = [P(-W,H,-D), P(W,H,-D), P(W,H,D), P(-W,H,D)];
    poly(b, 1.2, GREY, true);
    poly(t, 2.4, INK, true);
    for (let i = 0; i < 4; i++) poly([b[i], t[i]], 2.4, INK, false);
    // roof plane + a clerestory box
    poly([P(-W,H,-D), P(0,H+60,0), P(W,H,D)], 2.2, RED, false);
    poly([P(-60,H,-40), P(60,H,-40), P(60,H+42,-40), P(-60,H+42,-40)], 1.8, INK, true);
    // construction lines
    g.setLineDash([5, 6]);
    poly([P(-W,0,D), P(-W,H,D)], 1, GREY, false);
    poly([P(W,0,-D), P(W,H,-D)], 1, GREY, false);
    g.setLineDash([]);
    g.fillStyle = GREY; g.font = '13px Inter, sans-serif';
    g.fillText('AXONOMETRIC — MASSING STUDY', 60, 360);
  }

  const DRAW = { plan:drawPlan, layout:drawLayout, grid:drawGrid, elev:drawElev, site:drawSite, axo:drawAxo };

  function sheet(s, w, h){
    return tex((g) => {
      g.fillStyle = '#F5F1E7'; g.fillRect(0, 0, w, h);
      // faint paper tone
      g.fillStyle = 'rgba(180,168,150,.10)';
      for (let i = 0; i < 120; i++) g.fillRect(Math.random() * w, Math.random() * h, 60, 2);
      g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(20, 20, w - 40, h - 40);
      g.lineWidth = 1;   g.strokeRect(30, 30, w - 60, h - 60);

      g.save(); g.translate(46, 46); g.scale((w - 92) / 600, (h - 190) / 400);
      (DRAW[s.kind] || drawPlan)(g);
      g.restore();

      // title block, bottom right
      const bx = w - 396, by = h - 140;
      g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(bx, by, 366, 110);
      g.beginPath(); g.moveTo(bx, by + 42); g.lineTo(bx + 366, by + 42); g.stroke();
      g.beginPath(); g.moveTo(bx + 232, by + 42); g.lineTo(bx + 232, by + 110); g.stroke();
      g.fillStyle = INK; g.font = '28px Anton, sans-serif';
      g.fillText('DE ARCHITECTS', bx + 14, by + 32);
      g.font = '600 20px Inter, sans-serif';
      g.fillText(s.title.toUpperCase().slice(0, 26), bx + 14, by + 72);
      g.fillStyle = GREY; g.font = '600 14px Inter, sans-serif';
      g.fillText('SCALE ' + s.scale, bx + 14, by + 96);
      g.fillStyle = RED; g.font = '600 22px Inter, sans-serif';
      g.fillText(s.dwg, bx + 248, by + 74);
      g.fillStyle = GREY; g.font = '600 13px Inter, sans-serif';
      g.fillText('REV. C', bx + 248, by + 96);
    }, w, h);
  }

  // the wall board: the same drawing, plus a label bar you can read at distance
  function board(s, w, h){
    return tex((g) => {
      g.fillStyle = '#DED6C4'; g.fillRect(0, 0, w, h);   // board ground
      g.textBaseline = 'top';        // otherwise Anton's ascenders clip off the top
      var BAR = Math.round(h * 0.19), PAD = Math.round(w * 0.025);
      var availW = w - PAD * 2, availH = h - BAR - PAD * 2;
      var scale = Math.min(availW / 600, availH / 400);      // uniform: no squash
      // the drawing is a sheet pinned to the board, not the board itself —
      // without this the uniform scale just leaves dead white either side
      var sw = 600 * scale, sh = 400 * scale;
      var sx0 = (w - sw) / 2, sy0 = BAR + PAD + (availH - sh) / 2;
      var m = Math.round(24 * scale);
      g.fillStyle = 'rgba(40,18,32,.14)';
      g.fillRect(sx0 - m + 7, sy0 - m + 9, sw + m * 2, sh + m * 2);
      g.fillStyle = '#F7F4EC';
      g.fillRect(sx0 - m, sy0 - m, sw + m * 2, sh + m * 2);
      g.strokeStyle = 'rgba(62,14,44,.22)'; g.lineWidth = 2;
      g.strokeRect(sx0 - m, sy0 - m, sw + m * 2, sh + m * 2);
      [[sx0 - m + 16, sy0 - m + 16], [sx0 + sw + m - 16, sy0 - m + 16],
       [sx0 - m + 16, sy0 + sh + m - 16], [sx0 + sw + m - 16, sy0 + sh + m - 16]].forEach(function (pin) {
        g.fillStyle = RED; g.beginPath(); g.arc(pin[0], pin[1], 7, 0, 6.2832); g.fill();
      });

      g.save();
      g.translate(sx0, sy0);
      g.scale(scale, scale);
      (DRAW[s.kind] || drawPlan)(g);
      g.restore();

      g.fillStyle = INK; g.fillRect(0, 0, w, BAR);
      var numPx = Math.round(BAR * 0.36), titlePx = Math.round(BAR * 0.52), subPx = Math.round(BAR * 0.17);
      g.fillStyle = RED; g.font = '600 ' + numPx + 'px Inter, sans-serif';
      g.fillText(s.n, PAD, Math.round(BAR * 0.22));
      var titleX = PAD + numPx * 1.9;
      g.fillStyle = '#F5F1E7';
      g.font = titlePx + 'px Anton, sans-serif';
      while (titlePx > 30 && g.measureText(s.title.toUpperCase()).width > w - titleX - PAD){
        titlePx -= 2; g.font = titlePx + 'px Anton, sans-serif';
      }
      g.fillText(s.title.toUpperCase(), titleX, Math.round(BAR * 0.16));
      g.fillStyle = 'rgba(245,241,231,.66)';
      g.font = '600 ' + subPx + 'px Inter, sans-serif';
      g.fillText(s.sub.toUpperCase(), titleX + 2, Math.round(BAR * 0.62));
    }, w, h);
  }

  /* ---------- surface textures ---------- */
  const concrete = tex((g, w, h) => {
    g.fillStyle = '#E6DED0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++){
      const v = 200 + Math.random() * 40;
      g.fillStyle = `rgba(${v|0},${(v-4)|0},${(v-12)|0},.4)`;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 18, 0, 6.2832); g.fill();
    }
    g.strokeStyle = 'rgba(120,116,108,.35)'; g.lineWidth = 2;
    for (let i = 0; i <= 2; i++){
      g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke();
    }
  }, 512, 512, 4, 5);

  const boards = tex((g, w, h) => {
    const rows = 6, bw = w / 2;
    g.fillStyle = '#8A6A44'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++){
      const off = (r % 2) ? -bw / 2 : 0;
      for (let c = -1; c < 3; c++){
        const v = 176 + Math.random() * 30;
        g.fillStyle = `rgb(${v|0},${(v*0.78)|0},${(v*0.56)|0})`;
        g.fillRect(c * bw + off + 1.5, r * h / rows + 1.5, bw - 3, h / rows - 3);
      }
    }
  }, 512, 512, 8, 12);

  // daylight facades for the city — glass and stone, nothing glowing
  function facade(cols, rows, tint){
    return tex((g, w, h) => {
      g.fillStyle = tint; g.fillRect(0, 0, w, h);
      const cw = w / cols, ch = h / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
        const v = 90 + Math.random() * 46;
        g.fillStyle = `rgb(${(v*0.72)|0},${(v*0.8)|0},${(v*0.94)|0})`;
        g.fillRect(c * cw + cw * 0.14, r * ch + ch * 0.18, cw * 0.72, ch * 0.56);
      }
    }, cols * 20, rows * 20, 1, 1);
  }
  const FAC = { A:facade(8, 14, '#B9B3A9'), B:facade(6, 10, '#A9A9A6'), C:facade(10, 20, '#C2BCB2') };

  /* ---------- light ---------- */
  scene.add(new THREE.HemisphereLight(0xDCE8F8, 0xB0A692, 3.15));
  const sun = new THREE.DirectionalLight(0xFFE7C6, 2.6);
  sun.position.set(-48, 40, -34);
  if (!small){
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    const s = sun.shadow.camera;
    s.left = -46; s.right = 46; s.top = 46; s.bottom = -46; s.near = 1; s.far = 190;
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
  }
  // nothing in the scene moves, so the shadow map is rendered once, not every frame
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  scene.add(sun);
  [2, 16].forEach(z => {
    const l = new THREE.PointLight(0xFFF2DE, 30, 34, 2);
    l.position.set(0, GH - 1.0, z); scene.add(l);
  });
  // the front daylight is folded into the hemisphere rather than costing
  // another punctual light

  /* ---------- materials ---------- */
  /* Measured on the target hardware (Intel UHD): a scene-wide environment map
     cost about half the frame time. Plaster, concrete, timber, paper and fabric
     have no specular worth paying for — Lambert renders them the same for a
     fraction of the fragment cost. Standard, with the env map attached
     individually, is kept for the few surfaces that read as glass or metal. */
  const mat = (color, rough = 0.9, o = {}) => {
    const { metalness, roughness, envMapIntensity, ...rest } = o;
    return new THREE.MeshLambertMaterial({ color, ...rest });
  };
  const smat = (color, rough = 0.5, o = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness:rough, metalness:0, envMap:envTex, ...o });
  const glow = (color, i = 1) =>
    new THREE.MeshLambertMaterial({ color:0x151515, emissive:new THREE.Color(color), emissiveIntensity:i });

  const M = {
    concrete : mat(0xFFFFFF, 0.94, { map:concrete }),
    plaster  : mat(0xF3F0EA, 0.95),
    slab     : mat(0x3E0E2C, 0.8),
    floor    : mat(0xFFFFFF, 0.7, { map:boards }),
    screed   : mat(0xC9C4BB, 0.92),
    steel    : smat(0x3A3B40, 0.45, { metalness:0.7 }),
    bronze   : smat(0x9A7B4F, 0.36, { metalness:0.8 }),
    oak      : mat(0xB08A5E, 0.7),
    walnut   : mat(0x6B4526, 0.6),
    white    : mat(0xF6F4EF, 0.85),
    modelWhi : mat(0xEDEAE2, 0.96),
    figure   : mat(0xD8D4CA, 0.98),
    fabric   : mat(0x6E5F63, 0.98),
    crimson  : mat(0xC2183F, 0.8),
    leaf     : new THREE.MeshLambertMaterial({ color:0x4E6E45, flatShading:true }),
    bark     : mat(0x4A3627, 1),
    paper    : mat(0xF5F1E7, 0.96),
    glass    : new THREE.MeshStandardMaterial({
      color:0xCFE0E6, roughness:0.06, metalness:0.1, transparent:true, envMap:envTex,
      opacity:0.15, envMapIntensity:2.0, side:THREE.DoubleSide, depthWrite:false
    }),
    strip    : glow(0xFFF6E6, 1.8),
    screen   : glow(0xBFD8E6, 1.1)
  };

  const SAMPLE_MATS = [0xE4DCCC, 0xCFC6B4, 0xB9AE99, 0xD8D2C6].map(c => mat(c, 0.95));
  const BOOK_MATS = [0x6E3A4E, 0x3E4E6B, 0x7A5B3A, 0x4A5C4A, 0x8A4A3C, 0x40404E].map(c => mat(c, 0.95));

  const world = new THREE.Group();
  scene.add(world);

  function box(w, h, d, m, x, y, z, cast = true, rec = true){
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = rec;
    world.add(o); return o;
  }
  function cyl(rt, rb, h, m, x, y, z, seg = 10, cast = true){
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
    o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true;
    world.add(o); return o;
  }

  /* ---------- ground and the city ---------- */
  box(900, 0.4, 900, mat(0x9C9A93, 0.98), 0, -0.22, 0, false, true);
  box(120, 0.3, 150, M.screed, 0, 0.0, 8, false, true);            // the studio's plot
  box(400, 0.14, 18, mat(0x74736F, 0.96), 0, 0.06, -34, false, true);
  for (let i = -12; i <= 12; i++) box(3.4, 0.02, 0.3, mat(0xE9E2CE, 0.9), i * 9, 0.14, -34, false, false);

  const cityGeo = { A:[], B:[], C:[] }, capGeo = [];
  function building(x, z, w, d, h, key){
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, h / 2, z);
    cityGeo[key].push(g);
    const c = new THREE.BoxGeometry(w + 0.5, 0.5, d + 0.5); c.translate(x, h + 0.2, z);
    capGeo.push(c);
  }
  [[-40,-6,18,26,16,'B'],[-42,26,20,24,20,'A'],[40,-2,18,28,18,'A'],[42,30,20,26,15,'B']]
    .forEach(b => building(b[0], b[1], b[2], b[3], b[4], b[5]));
  for (let i = 0; i < 10; i++)
    building(-92 + i * 21, -58 - (i % 3) * 16, 15 + (i % 3) * 4, 17, 14 + (i % 4) * 8, i % 2 ? 'A' : 'C');
  for (let i = 0; i < 30; i++){
    const a = (i / 30) * Math.PI * 2 + 0.4, r = 190 + (i % 5) * 46;
    building(Math.cos(a) * r, Math.sin(a) * r + 10, 16 + (i % 4) * 7, 16 + (i % 3) * 6, 40 + ((i * 37) % 86), i % 3 ? 'C' : 'A');
  }
  Object.keys(cityGeo).forEach(k => {
    if (!cityGeo[k].length) return;
    const m = new THREE.Mesh(mergeGeometries(cityGeo[k]),
      new THREE.MeshLambertMaterial({ map:FAC[k] }));
    world.add(m);
  });
  world.add(new THREE.Mesh(mergeGeometries(capGeo), mat(0x6E6C68, 0.94)));

  /* ---------- the studio shell ---------- */
  const DEPTH = BACK - FRONT;
  const CZ = (FRONT + BACK) / 2;

  box(HW * 2 + 1.6, 0.4, DEPTH + 1.6, M.concrete, 0, 0.2, CZ);                 // plinth
  box(HW * 2, 0.2, DEPTH, M.floor, 0, 0.5, CZ, false, true);                   // ground floor
  box(0.5, TOP, DEPTH, M.concrete, -HW - 0.25, TOP / 2 + 0.4, CZ);             // side walls
  box(0.5, TOP, DEPTH, M.concrete,  HW + 0.25, TOP / 2 + 0.4, CZ);
  box(HW * 2 + 1.6, 0.5, DEPTH + 1.6, M.slab, 0, TOP + 0.65, CZ);              // roof
  box(HW * 2, 0.16, DEPTH, M.plaster, 0, TOP + 0.32, CZ, false, false);        // roof soffit
  box(HW * 2, TOP, 0.5, M.concrete, 0, TOP / 2 + 0.4, BACK + 0.25);           // rear wall

  /* The upper floor is deliberately NOT a full slab: two side galleries with a
     double-height void down the middle, so the hall reads two storeys and the
     camera can climb out of it at the back. */
  box(6, 0.5, DEPTH, M.concrete, -HW + 3, UY + 0.15, CZ);                      // gallery, west
  box(6, 0.5, DEPTH, M.concrete,  HW - 3, UY + 0.15, CZ);                      // gallery, east
  box(11, 0.5, 4, M.concrete, 0, UY + 0.15, BACK - 2);                         // bridge at the back
  box(11, 0.5, 5, M.concrete, 0, UY + 0.15, FRONT + 2.5);                      // landing at the front

  // gallery balustrades onto the void
  [-5.5, 5.5].forEach(x => {
    box(0.1, 1.05, DEPTH - 12, M.glass, x, UY + 0.95, CZ + 1, false, false);
    box(0.16, 0.1, DEPTH - 12, M.bronze, x, UY + 1.5, CZ + 1, true, false);
  });

  // front elevation: full-height glazing, a recessed entrance, the sign band
  const DW = 3.4;
  box(HW - DW / 2, TOP, 0.4, M.concrete, -(DW / 2 + (HW - DW / 2) / 2), TOP / 2 + 0.4, FRONT);
  box(HW - DW / 2, TOP, 0.4, M.concrete,  (DW / 2 + (HW - DW / 2) / 2), TOP / 2 + 0.4, FRONT);
  box(DW, TOP - 3.6, 0.4, M.concrete, 0, 3.6 + (TOP - 3.6) / 2 + 0.4, FRONT);
  for (let i = 0; i < 5; i++){
    const gx = -10.4 + i * 2.6;
    box(2.3, 4.4, 0.06, M.glass, gx, 2.9, FRONT - 0.3, false, false);          // ground glazing
    box(2.3, 3.8, 0.06, M.glass, gx, UY + 2.6, FRONT - 0.3, false, false);     // upper glazing
    box(0.12, 4.6, 0.24, M.steel, gx - 1.3, 2.9, FRONT - 0.32);
    box(0.12, 4.0, 0.24, M.steel, gx - 1.3, UY + 2.6, FRONT - 0.32);
  }
  [1, 2, 3, 4].forEach(i => {
    const gx = 3.2 + (i - 1) * 2.6;
    box(2.3, 4.4, 0.06, M.glass, gx, 2.9, FRONT - 0.3, false, false);
    box(2.3, 3.8, 0.06, M.glass, gx, UY + 2.6, FRONT - 0.3, false, false);
    box(0.12, 4.6, 0.24, M.steel, gx - 1.3, 2.9, FRONT - 0.32);
    box(0.12, 4.0, 0.24, M.steel, gx - 1.3, UY + 2.6, FRONT - 0.32);
  });
  box(HW * 2 + 2.2, 0.4, 2.6, M.slab, 0, 5.5, FRONT - 1.4);                    // entrance canopy
  box(9, 0.2, 3.4, M.concrete, 0, 0.55, FRONT - 1.8, false, true);             // entrance step

  // the sign band over the entrance, carrying the real logo
  const signBand = box(9.5, 1.5, 0.24, M.slab, 0, 6.6, FRONT - 0.5);
  new THREE.TextureLoader().load('assets/img/logo-nav.png', t => {
    t.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.05),
      new THREE.MeshLambertMaterial({ map:t, transparent:true,
        emissive:new THREE.Color(0xFFFFFF), emissiveMap:t, emissiveIntensity:0.35 }));
    sign.position.set(0, 6.6, FRONT - 0.8);
    world.add(sign);
    wake();
  }, undefined, () => { signBand.material = M.crimson; });

  // ceiling strip lights down the hall
  /* Only under the galleries — the middle of the plan is a double-height void,
     so a strip light at x = 0 would hang in mid-air (and did, cutting a white
     streak through the shots looking down from the gallery). */
  [-7.5, 7.5].forEach(x => {
    for (let i = 0; i < 5; i++) box(0.3, 0.08, 5, M.strip, x, GH - 0.35, -6 + i * 8, false, false);
  });

  // exposed services along the ceiling
  [-6.2, 6.2].forEach(x => {
    box(0.55, 0.12, DEPTH - 4, M.steel, x, GH - 0.20, CZ, true, false);
    box(0.42, 0.42, DEPTH - 4, mat(0xB9BCC2, 0.75, { metalness:0.4 }), x + (x > 0 ? 1.1 : -1.1), GH - 0.42, CZ);
  });
  for (let i = 0; i < 9; i++){
    box(0.26, 0.34, 0.26, M.steel, -6.2, GH - 0.03, -8 + i * 4, true, false);
    box(0.26, 0.34, 0.26, M.steel,  6.2, GH - 0.03, -8 + i * 4, true, false);
  }

  // pendants and a hung banner filling the double-height void
  [-3.0, 3.0].forEach(x => {
    [-2, 6, 14].forEach(z => {
      cyl(0.014, 0.014, 3.4, M.steel, x, TOP - 2.1, z, 6, false);
      const sh = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.5, 14, 1, true), M.white);
      sh.position.set(x, TOP - 4.0, z); sh.castShadow = false; world.add(sh);
      box(0.5, 0.08, 0.5, M.strip, x, TOP - 4.22, z, false, false);
    });
  });
  new THREE.TextureLoader().load('assets/img/logo-nav.png', t => {
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.5),
      new THREE.MeshLambertMaterial({ map:t, transparent:true,
        emissive:new THREE.Color(0xFFFFFF), emissiveMap:t, emissiveIntensity:0.25 }));
    m.position.set(0, 4.0, BACK - 0.28); m.rotation.y = Math.PI;
    world.add(m);
    wake();
  });
  box(9.0, 2.4, 0.16, M.slab, 0, 4.0, BACK - 0.2);

  /* ---------- reception ---------- */
  box(4.6, 1.1, 1.0, M.walnut, -4.5, 1.05, -8.5);
  box(4.9, 0.1, 1.2, M.white, -4.5, 1.63, -8.5, true, false);
  box(0.2, 3.0, 5.0, M.plaster, -8.2, 2.0, -8.0);                              // logo wall
  new THREE.TextureLoader().load('assets/img/logo-icon.png', t => {
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9),
      new THREE.MeshLambertMaterial({ map:t, transparent:true }));
    m.position.set(-8.08, 2.4, -8.0); m.rotation.y = Math.PI / 2;
    world.add(m);
    wake();
  });
  box(2.6, 0.42, 0.9, M.fabric, 5.5, 0.72, -9.0);                              // waiting bench
  box(2.6, 0.5, 0.24, M.fabric, 5.5, 1.1, -9.4, true, false);
  cyl(0.34, 0.4, 0.7, M.white, 8.4, 0.85, -9.2, 10);
  [0, 1, 2].forEach(i => {
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 - i * 0.13, 0), M.leaf);
    f.position.set(8.4, 1.4 + i * 0.5, -9.2); f.castShadow = true; world.add(f);
  });

  /* ---------- the drafting hall ---------- */
  const boardsOut = [];

  function figureSeated(x, z, face){
    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.44, 4, 8), M.figure);
    torso.position.y = 1.16; torso.castShadow = true; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), M.figure);
    head.position.y = 1.56; head.castShadow = true; g.add(head);
    const lap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.42), M.figure);
    lap.position.set(0, 0.82, face * 0.16); g.add(lap);
    g.position.set(x, 0.6, z); g.rotation.y = face > 0 ? 0 : Math.PI;
    world.add(g);
  }
  function figureStanding(x, z, r){
    const g = new THREE.Group();
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.86, 8), M.figure);
    legs.position.y = 0.43; legs.castShadow = true; g.add(legs);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.46, 4, 8), M.figure);
    torso.position.y = 1.18; torso.castShadow = true; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), M.figure);
    head.position.y = 1.6; head.castShadow = true; g.add(head);
    g.position.set(x, 0.6, z); g.rotation.y = r;
    world.add(g);
  }

  SERVICES.forEach((s, i) => {
    const sx = s.side * 8.0;          // table centre
    const wx = s.side * (HW - 0.05);  // wall board

    // drafting table: legs, a flat return and a tilted board
    box(3.2, 0.14, 1.8, M.white, sx, 1.33, s.z);
    box(2.4, 0.66, 1.4, M.steel, sx, 0.93, s.z);                     // pedestal
    box(0.9, 0.5, 1.2, M.walnut, sx + s.side * 0.85, 0.87, s.z);     // drawer stack
    [0, 1, 2].forEach(k => box(0.06, 0.03, 0.8, M.bronze, sx + s.side * 1.31, 0.72 + k * 0.16, s.z, true, false));
    const tilt = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 1.5),
      new THREE.MeshLambertMaterial({ map:sheet(s, 640, 452) }));
    tilt.position.set(sx, 1.52, s.z - 0.05);
    tilt.rotation.x = -0.24;
    tilt.rotation.y = s.side < 0 ? 0.06 : -0.06;
    tilt.castShadow = true; tilt.receiveShadow = true;
    world.add(tilt);

    // task lamp, laptop, mug, rolled drawings, scale rule
    cyl(0.05, 0.11, 0.5, M.steel, sx + s.side * 1.1, 1.63, s.z + 0.6, 8, false);
    const arm = box(0.05, 0.05, 0.7, M.steel, sx + s.side * 1.1, 1.95, s.z + 0.35, true, false);
    arm.rotation.x = 0.5;
    box(0.26, 0.1, 0.26, M.strip, sx + s.side * 1.05, 2.12, s.z + 0.08, false, false);
    box(0.62, 0.03, 0.44, M.steel, sx - s.side * 0.95, 1.41, s.z + 0.5, true, false);
    const scr = box(0.62, 0.4, 0.03, M.screen, sx - s.side * 0.95, 1.6, s.z + 0.72, false, false);
    scr.rotation.x = -0.28;
    cyl(0.055, 0.055, 0.12, M.white, sx - s.side * 0.3, 1.45, s.z + 0.66, 8, false);
    box(0.5, 0.02, 0.09, M.crimson, sx + s.side * 0.2, 1.4, s.z + 0.68, true, false);
    [0, 1, 2].forEach(k => {
      const r = cyl(0.06, 0.06, 0.9, M.paper, sx + s.side * 1.32, 1.44 + k * 0.13, s.z - 0.55 + k * 0.05, 8);
      r.rotation.z = Math.PI / 2;
    });

    // stool + someone at every other table
    cyl(0.28, 0.3, 0.1, M.fabric, sx + s.side * 0.1, 1.06, s.z + 1.35, 10);
    cyl(0.045, 0.045, 0.55, M.steel, sx + s.side * 0.1, 0.78, s.z + 1.35, 8, false);
    if (i % 2 === 0) figureSeated(sx + s.side * 0.1, s.z + 1.35, -1);

    // the wall board behind, plus a pin rail of sketches
    const bt = board(s, 1536, 864);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(7.9, 4.44),
      new THREE.MeshLambertMaterial({
        map:bt, emissiveMap:bt, emissive:new THREE.Color(0xFFFFFF), emissiveIntensity:0.22
      }));
    b.position.set(wx, 3.0, s.z);
    b.rotation.y = s.side < 0 ? Math.PI / 2 : -Math.PI / 2;
    b.userData.dynamic = true;
    world.add(b);
    boardsOut.push({ mesh:b, z:s.z, side:s.side, x:wx, y:3.3 });

    for (let k = 0; k < 4; k++){
      box(0.06, 0.62 + (k % 2) * 0.22, 0.5 + (k % 3) * 0.14, M.paper,
          wx - s.side * 0.06, 1.35 + (k % 2) * 0.78, s.z - 2.5 + k * 0.66, true, false);
      box(0.06, 0.5 + (k % 2) * 0.2, 0.46, M.paper,
          wx - s.side * 0.06, 1.3 + ((k + 1) % 2) * 0.72, s.z + 2.2 + k * 0.62, true, false);
    }
    box(0.1, 0.06, 7.0, M.bronze, wx - s.side * 0.08, 2.05, s.z, true, false);

    // a model table between the aisle and this board, so the turn has
    // something in the near field rather than bare floor
    const mx = s.side * 4.7;
    box(3.0, 0.7, 2.2, M.steel, mx, 0.95, s.z);
    box(3.3, 0.1, 2.5, M.walnut, mx, 1.36, s.z, true, false);
    box(2.8, 0.02, 2.0, M.paper, mx, 1.42, s.z, false, false);
    for (let k = 0; k < 8; k++){
      const bw = 0.24 + (k % 3) * 0.12, bh = 0.16 + ((k * 7 + i * 3) % 5) * 0.08;
      box(bw, bh, bw, M.modelWhi, mx - 1.0 + (k % 4) * 0.62, 1.43 + bh / 2, s.z - 0.45 + Math.floor(k / 4) * 0.8, true, false);
    }
    if (i % 2) box(0.32, 0.22, 0.22, M.crimson, mx + 1.15, 1.52, s.z + 0.7, true, false);
  });

  /* ---------- the model spine down the middle of the hall ----------
     Low enough that the camera flies over it; it fills what was bare floor
     and gives the shot something to pass across. */
  [-8, 0, 6, 12, 18].forEach((mz, i) => {
    box(3.4, 0.72, 2.5, M.steel, 0, 0.96, mz);
    box(3.7, 0.1, 2.8, M.walnut, 0, 1.37, mz, true, false);
    box(3.2, 0.02, 2.3, M.paper, 0, 1.43, mz, false, false);
    for (let k = 0; k < 9; k++){
      const w = 0.26 + (k % 3) * 0.12, h = 0.16 + ((k * 7 + i * 3) % 5) * 0.08;
      box(w, h, w, M.modelWhi, -1.15 + (k % 5) * 0.58, 1.44 + h / 2, mz - 0.5 + Math.floor(k / 5) * 0.8, true, false);
    }
    if (i % 2 === 0) box(0.34, 0.24, 0.24, M.crimson, 1.4, 1.54, mz + 0.8, true, false);
  });
  [[-3.6, -9], [3.6, 3], [-3.6, 15], [3.6, 19]].forEach(p => {
    cyl(0.3, 0.36, 0.72, M.white, p[0], 0.96, p[1], 10);
    [0, 1, 2].forEach(i => {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.56 - i * 0.13, 0), M.leaf);
      f.position.set(p[0], 1.5 + i * 0.44, p[1]); f.castShadow = true; world.add(f);
    });
  });

  /* ---------- model bay at the back ---------- */
  box(6.4, 0.9, 3.2, M.white, 0, 0.95, 21.5);                       // big model table
  box(6.7, 0.08, 3.5, M.oak, 0, 1.44, 21.5, true, false);
  // a massing model of a city block sitting on it
  for (let i = 0; i < 16; i++){
    const w = 0.34 + (i % 3) * 0.16, h = 0.4 + ((i * 13) % 9) * 0.13;
    box(w, h, w, M.modelWhi, -2.6 + (i % 6) * 0.95, 1.48 + h / 2, 20.6 + Math.floor(i / 6) * 0.95, true, false);
  }
  box(5.6, 0.02, 2.4, M.paper, 0, 1.49, 21.5, false, false);
  figureStanding(-3.5, 20.4, 1.3);
  figureStanding(3.4, 22.6, -2.2);

  // plinths with single models, along the rear
  [[-9, 23.4], [-5.6, 24.2], [8.8, 23.4], [5.4, 24.2]].forEach((p, i) => {
    box(1.5, 1.15, 1.5, M.white, p[0], 0.68, p[1]);
    const h = 0.5 + (i % 3) * 0.3;
    box(0.8, h, 0.8, M.modelWhi, p[0], 1.26 + h / 2, p[1], true, false);
    box(0.5, 0.06, 0.5, M.modelWhi, p[0] + 0.3, 1.29 + h, p[1] + 0.25, true, false);
  });

  // material library: shelves of samples on the east wall
  box(0.5, 3.0, 5.0, M.walnut, HW - 0.35, 1.9, 21.5);
  for (let r = 0; r < 5; r++){
    box(0.56, 0.05, 4.8, M.oak, HW - 0.4, 0.7 + r * 0.58, 21.5, true, false);
    for (let c = 0; c < 8; c++)
      box(0.3, 0.34, 0.34, SAMPLE_MATS[(r * 3 + c) % SAMPLE_MATS.length],
          HW - 0.52, 0.92 + r * 0.58, 19.5 + c * 0.56, true, false);
  }

  // plan chest + plotter on the west wall
  box(0.7, 1.0, 3.0, M.steel, -HW + 0.6, 1.0, 19.0);
  for (let d = 0; d < 5; d++) box(0.06, 0.03, 0.9, M.bronze, -HW + 0.28, 0.66 + d * 0.18, 19.0, true, false);
  box(0.9, 1.3, 1.8, M.white, -HW + 0.8, 1.15, 15.4);
  box(0.94, 0.1, 1.9, M.steel, -HW + 0.8, 1.85, 15.4, true, false);
  box(0.5, 0.02, 1.5, M.paper, -HW + 1.1, 1.9, 15.4, false, false);

  // the stair up, in the void at the back
  for (let i = 0; i < 14; i++)
    box(2.6, 0.14, 0.34, M.concrete, 3.4, 0.7 + i * 0.38, 17.4 + i * 0.36);
  box(0.1, 1.1, 5.4, M.glass, 2.1, 3.4, 19.9, false, false);
  box(0.14, 0.09, 5.5, M.bronze, 2.1, 4.0, 19.9, true, false);

  /* ---------- upper gallery: meeting room, library, desks ---------- */
  box(4.4, 0.1, 2.2, M.walnut, -9.0, UY + 1.15, 2.0);                // meeting table
  box(3.6, 0.7, 1.5, M.walnut, -9.0, UY + 0.75, 2.0);
  [-1.4, 0, 1.4].forEach(dz => {
    [-2.6, 2.6].forEach(dx => {
      box(0.5, 0.08, 0.5, M.fabric, -9.0 + dx, UY + 0.85, 2.0 + dz, true, false);
      box(0.5, 0.55, 0.1, M.fabric, -9.0 + dx + (dx > 0 ? 0.24 : -0.24), UY + 1.15, 2.0 + dz, true, false);
    });
  });
  box(3.4, 0.02, 1.4, M.paper, -9.0, UY + 1.21, 2.0, false, false);  // plans spread out
  box(0.14, 1.6, 2.8, M.paper, -HW + 0.42, UY + 2.4, 2.0, true, false);
  figureStanding(-11.4, 3.4, 1.6);

  // library wall
  box(0.5, 2.8, 8.0, M.walnut, -HW + 0.35, UY + 1.8, 14.0);
  for (let r = 0; r < 4; r++){
    box(0.56, 0.06, 7.8, M.oak, -HW + 0.4, UY + 0.8 + r * 0.62, 14.0, true, false);
    for (let c = 0; c < 26; c++){
      const hh = 0.34 + ((r * 7 + c * 3) % 5) * 0.04;
      box(0.3, hh, 0.06 + ((c * 5) % 3) * 0.025, BOOK_MATS[(r * 5 + c) % BOOK_MATS.length],
          -HW + 0.52, UY + 0.83 + r * 0.62 + hh / 2, 10.3 + c * 0.28, true, false);
    }
  }

  // east gallery: a row of desks
  for (let i = 0; i < 4; i++){
    const z = 1 + i * 4.4;
    box(2.6, 0.08, 1.3, M.white, 9.2, UY + 1.16, z);
    [[-1.15, -0.5], [1.15, -0.5], [-1.15, 0.5], [1.15, 0.5]].forEach(o =>
      cyl(0.045, 0.045, 0.7, M.steel, 9.2 + o[0], UY + 0.81, z + o[1], 8, false));
    const sc = box(0.7, 0.44, 0.03, M.screen, 9.2, UY + 1.42, z - 0.3, false, false);
    sc.rotation.x = -0.2;
    cyl(0.27, 0.29, 0.09, M.fabric, 9.2, UY + 0.88, z + 1.0, 10);
    cyl(0.04, 0.04, 0.5, M.steel, 9.2, UY + 0.62, z + 1.0, 8, false);
    if (i % 2) figureSeated(9.2, z + 1.0, -1);
  }
  box(0.2, 2.6, 9.0, M.plaster, HW - 0.4, UY + 1.8, 4.0);            // pin-up wall
  for (let i = 0; i < 10; i++)
    box(0.06, 0.8 + (i % 3) * 0.2, 0.6, M.paper, HW - 0.52, UY + 1.5 + (i % 2) * 1.0, 0.4 + i * 0.8, true, false);

  /* ---------- the forecourt ---------- */
  for (let i = 0; i < 6; i++){
    [-15.5, 15.5].forEach(x => {
      box(1.8, 0.7, 1.8, M.white, x, 0.45, -16 - i * 4.4, true, false);
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), M.leaf);
      f.position.set(x, 1.3, -16 - i * 4.4); f.castShadow = true; world.add(f);
    });
  }
  for (let i = 0; i < 4; i++) box(6.0, 0.14, 2.2, M.concrete, 0, 0.2, -15 - i * 3.2, false, true);

  // entrance forecourt: a signage monolith, planters, benches and bollards, so
  // the opening shot has a foreground instead of bare paving
  box(1.1, 3.2, 0.5, M.slab, -6.4, 1.75, -19);
  new THREE.TextureLoader().load('assets/img/logo-stacked-color.png', t => {
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86),
      new THREE.MeshLambertMaterial({ map:t, transparent:true }));
    m.position.set(-6.4, 2.3, -19.27);
    world.add(m);
    wake();
  });
  box(0.7, 0.12, 0.4, M.bronze, -6.4, 1.15, -19.28, true, false);

  [-4.6, 4.6].forEach(x => {
    for (let i = 0; i < 5; i++){
      box(1.5, 0.62, 1.5, M.concrete, x, 0.42, -16.5 - i * 4.2, true, false);
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), M.leaf);
      f.position.set(x, 1.15, -16.5 - i * 4.2); f.castShadow = true; world.add(f);
    }
  });
  [-8.6, 8.6].forEach(x => {
    [-18, -26].forEach(z => {
      box(2.4, 0.16, 0.6, M.walnut, x, 0.58, z);
      box(0.3, 0.42, 0.5, M.concrete, x - 0.9, 0.32, z, true, false);
      box(0.3, 0.42, 0.5, M.concrete, x + 0.9, 0.32, z, true, false);
    });
  });
  for (let i = 0; i < 7; i++){
    [-7.6, 7.6].forEach(x => {
      cyl(0.07, 0.07, 0.85, M.steel, x, 0.62, -14 - i * 3.6, 8, false);
      box(0.2, 0.08, 0.2, M.strip, x, 1.06, -14 - i * 3.6, false, false);
    });
  }
  for (let i = 0; i < 5; i++) box(0.06, 0.7, 0.06, M.steel, 11.5 + i * 0.42, 0.55, -21, true, false);
  box(2.4, 0.08, 0.08, M.steel, 12.3, 0.88, -21, true, false);
  [[-19, -12], [19, -12], [-21, 6], [21, 6], [-21, 24], [21, 24]].forEach(p => {
    cyl(0.16, 0.22, 3.0, M.bark, p[0], 1.5, p[1], 8);
    [0, 1, 2].forEach(i => {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 - i * 0.34, 0), M.leaf);
      f.position.set(p[0], 3.4 + i * 0.9, p[1]);
      f.rotation.set(Math.random(), Math.random(), Math.random());
      f.castShadow = true; world.add(f);
    });
  });
  function car(x, z, body){
    const g = new THREE.Group();
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 4.5), smat(body, 0.3, { metalness:0.6 }));
    b1.position.y = 0.66; b1.castShadow = true; g.add(b1);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.54, 2.3), mat(0x22242A, 0.15, { metalness:0.4 }));
    b2.position.set(0, 1.17, -0.2); b2.castShadow = true; g.add(b2);
    [[-0.94, 1.55], [0.94, 1.55], [-0.94, -1.55], [0.94, -1.55]].forEach(w => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.22, 10), mat(0x18181C, 0.9));
      t.rotation.z = Math.PI / 2; t.position.set(w[0], 0.35, w[1]); g.add(t);
    });
    g.position.set(x, 0.15, z); world.add(g);
  }
  car(-20, -20, 0x2A3340); car(-20, -25, 0x6E1230); car(20, -22, 0xE8E4DC);

  /* ---------- bake ----------
     The scene is completely static, so there is no reason to pay 900-odd draw
     calls a frame for it. Flatten every static mesh into one merged mesh per
     material. Anything that animates opts out with userData.dynamic. */
  function bake(root){
    root.updateMatrixWorld(true);
    const byMat = new Map(), drop = [];
    root.traverse(o => {
      if (!o.isMesh || o.userData.dynamic) return;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const name of Object.keys(g.attributes))
        if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
      g.applyMatrix4(o.matrixWorld);
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(g);
      drop.push(o);
    });
    drop.forEach(o => { o.parent.remove(o); o.geometry.dispose(); });
    byMat.forEach((list, material) => {
      const merged = list.length === 1 ? list[0] : mergeGeometries(list);
      list.forEach(g => { if (g !== merged) g.dispose(); });
      const m = new THREE.Mesh(merged, material);
      m.castShadow = true; m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      root.add(m);
    });
    return byMat.size;
  }
  const bakedGroups = bake(world);

  /* ---------- the flight path ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const path = new THREE.CatmullRomCurve3([
    V(0, 3.6, -40), V(0, 3.2, -26), V(0, 2.9, -17), V(0, 3.0, -11.5), V(0, 3.1, -7.5),
    V(0, 3.15, -4), V(0, 3.15, -2), V(0, 3.15, 0), V(0, 3.15, 2), V(0, 3.15, 4),
    V(0, 3.15, 6), V(0, 3.15, 8), V(0, 3.15, 10), V(0, 3.15, 12), V(0, 3.15, 14),
    V(0, 3.2, 16),
    V(0, 3.6, 19), V(0.5, 6.6, 23.2),
    V(0, 8.0, 19.5), V(0, 8.1, 13), V(0, 8.1, 6), V(0, 8.0, -1), V(0, 8.5, -14),
    V(0, 13, -34), V(0, 20, -56), V(0, 26, -74)
  ], false, 'catmullrom', 0.35);

  const aim = new THREE.CatmullRomCurve3([
    V(0, 4.8, -12), V(0, 4.0, -12), V(0, 3.2, -10), V(0, 3.0, -7), V(0, 3.0, -4),
    V(0, 3.0, -1), V(0, 3.0, 1), V(0, 3.0, 3), V(0, 3.0, 5), V(0, 3.0, 7),
    V(0, 3.0, 9), V(0, 3.0, 11), V(0, 3.0, 13), V(0, 3.0, 15), V(0, 3.0, 17),
    V(0, 2.9, 19),
    V(0, 2.4, 21.5), V(0, 1.5, 20.5),
    V(0, 2.6, 14), V(0, 2.8, 7), V(0, 3.0, 0), V(0, 4.2, -7), V(0, 5.0, -10),
    V(0, 5.0, -4), V(0, 5.0, -2), V(0, 5.0, -2)
  ], false, 'catmullrom', 0.35);

  /* ---------- scroll → progress ---------- */
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  let targetP = 0, curP = 0, running = false, raf = null, lastFov = -1;
  const pos = new THREE.Vector3(), look = new THREE.Vector3(), boardAt = new THREE.Vector3();

  /* adaptive resolution — trade pixels to hold the frame rate, as in drone.js */
  let acc = 0, ticks = 0, lastT = performance.now(), shadowsOn = renderer.shadowMap.enabled;
  function adapt(now){
    acc += now - lastT; lastT = now; ticks++;
    if (acc < 700) return;
    const avg = acc / ticks; acc = 0; ticks = 0;
    const target = 1000 / 50;   // tolerate ~45fps before trading away sharpness
    if (avg > target * 1.3){
      if (dpr > DPR_MIN){ dpr = Math.max(DPR_MIN, dpr - 0.14); renderer.setPixelRatio(dpr); resize(); }
      else if (shadowsOn){
        shadowsOn = false; renderer.shadowMap.enabled = false;
        scene.traverse(o => { if (o.isMesh) o.material.needsUpdate = true; });
      }
    } else if (avg < target * 0.98 && dpr < DPR_MAX){   // climb back to native when there is room
      dpr = Math.min(DPR_MAX, dpr + 0.08); renderer.setPixelRatio(dpr); resize();
    }
  }

  function readScroll(){
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    targetP = clamp(-r.top / (total || 1), 0, 1);
  }
  /* A vertical FOV that looks right at 16:9 goes uselessly narrow on a
     portrait phone. Hold the HORIZONTAL field instead and derive the vertical
     one from the actual aspect. */
  const BASE_ASPECT = 16 / 9;
  function vFov(base, aspect){
    if (aspect >= BASE_ASPECT) return base;
    const hor = 2 * Math.atan(Math.tan(base * Math.PI / 360) * BASE_ASPECT);
    // Fully preserving the horizontal field would push a 9:19 phone past 120
    // degrees vertical, which fisheyes the shot into mostly floor and ceiling.
    // Cap it and accept a little less width instead.
    return Math.min(80, 2 * Math.atan(Math.tan(hor / 2) / aspect) * 180 / Math.PI);
  }

  function resize(){
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    lastFov = -1;                       // force the next frame to re-derive it
    camera.updateProjectionMatrix();
  }

  function frame(){
    readScroll();
    const delta = targetP - curP;
    curP += delta * 0.085;
    if (Math.abs(delta) < 0.0002){ curP = targetP; settled = true; }
    const u = clamp(curP, 0, 1);

    path.getPoint(u, pos);
    aim.getPoint(u, look);

    // in the hall, turn toward whichever service board is passing
    let nearD = 1e9, near = null;
    for (const b of boardsOut){
      const d = Math.abs(pos.z - b.z);
      if (d < nearD){ nearD = d; near = b; }
    }
    const inHall = pos.y < 5 && pos.z > -7 && pos.z < 19;
    if (inHall && near && nearD < 4.2){
      // point straight at the board that is passing, so it lands in frame
      const w = 1 - nearD / 4.2;
      boardAt.set(near.x, near.y, near.z);
      look.lerp(boardAt, w * w * 0.88);
    }

    // the boards are always there; they just brighten as you draw level
    for (const b of boardsOut){
      const a = clamp(1 - Math.abs(pos.z - b.z) / 5, 0, 1);
      b.mesh.material.emissiveIntensity = 0.18 + a * a * (3 - 2 * a) * 0.34;
    }

    adapt(performance.now());
    camera.position.copy(pos);
    camera.lookAt(look);

    const inside = clamp(1 - Math.abs(pos.z - 7) / 22, 0, 1);
    const fov = vFov(50 + inside * 16, camera.aspect);
    if (Math.abs(fov - lastFov) > 0.05){ camera.fov = fov; camera.updateProjectionMatrix(); lastFov = fov; }

    if (headline) headline.classList.toggle('is-on', u < 0.12);
    section.classList.toggle('hide-hint', u > 0.04);
    if (railFill) railFill.style.transform = `scaleX(${u.toFixed(4)})`;

    renderer.render(scene, camera);

    // Once the damped camera has caught up with the scroll there is nothing
    // left to draw, so stop the loop entirely rather than burning the GPU on
    // identical frames. A scroll or resize wakes it again.
    if (settled){ running = false; raf = null; return; }
    raf = requestAnimationFrame(frame);
  }

  function wake(){
    if (!visible) return;
    settled = false;
    if (!running){ running = true; lastT = performance.now(); acc = ticks = 0; raf = requestAnimationFrame(frame); }
  }
  function stop(){ if (running){ running = false; cancelAnimationFrame(raf); raf = null; } }

  resize();
  window.addEventListener('scroll', wake, { passive:true });
  window.addEventListener('resize', () => { resize(); wake(); }, { passive:true });
  window.addEventListener('orientationchange', () => { resize(); wake(); });
  new IntersectionObserver(es => es.forEach(e => {
    visible = e.isIntersecting;
    visible ? wake() : stop();
  }), { rootMargin:'200px' }).observe(section);

  // opt-in diagnostics: /?debug=1 exposes the renderer for the perf harness
  if (location.search.includes('debug')) window.__deStudio = { renderer, scene, camera };

  section.classList.add('has-webgl');
  readScroll();
  curP = targetP;
}
