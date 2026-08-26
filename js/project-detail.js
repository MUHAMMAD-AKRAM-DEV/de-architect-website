/* ============================================================================
   DE Architects — project detail
   ----------------------------------------------------------------------------
   One page serves every project: the slug comes from ?p= and the content from
   js/projects-data.js. Projects carrying a `tour` get a 3D virtual visit;
   everything else falls back to the image showcase, which is the normal case.

   three.js and the loaders are imported lazily, and only when a tour actually
   exists — a project without one never pays for the library.
   ========================================================================== */
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.185.1/';

const slug = new URLSearchParams(location.search).get('p');
const all = window.DE_PROJECTS || [];
const idx = all.findIndex(p => p.slug === slug);
const project = idx > -1 ? all[idx] : null;

const main = document.getElementById('pdMain');
const missing = document.getElementById('pdMissing');

if (!project) {
  if (missing) missing.hidden = false;
} else {
  main.hidden = false;
  render(project);
  if (project.tour) startTour(project.tour);
}

function render(p) {
  document.title = `${p.title} — DE Architects`;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', `${p.title}, ${p.place}. ${p.blurb}`);

  document.getElementById('pdCat').textContent = p.category;
  document.getElementById('pdTitle').textContent = p.title;
  document.getElementById('pdPlace').textContent = p.place;
  document.getElementById('pdYear').textContent = p.year;

  document.getElementById('pdCopy').innerHTML =
    `<p class="pd-lede">${p.blurb}</p>` + p.body.map(t => `<p>${t}</p>`).join('');

  document.getElementById('pdFacts').innerHTML =
    '<h2>Project facts</h2><dl>' +
    p.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') +
    '</dl>' + (p.tour ? '<span class="pd-hastour">Includes a 3D virtual visit</span>' : '');

  document.getElementById('pdGallery').innerHTML =
    `<h2 class="pd-gtitle">Gallery</h2><div class="pd-shots">` +
    p.gallery.map((src, i) =>
      `<figure class="pd-shot${i === 0 ? ' wide' : ''}"><img src="${src}" alt="${p.title} — view ${i + 1}" loading="lazy" decoding="async"></figure>`
    ).join('') + '</div>';

  // wrap around at both ends so the pair of arrows is never a dead end
  const prev = all[(idx - 1 + all.length) % all.length];
  const next = all[(idx + 1) % all.length];
  const pv = document.getElementById('pdPrev'), nx = document.getElementById('pdNext');
  pv.href = `project.html?p=${encodeURIComponent(prev.slug)}`;
  pv.querySelector('b').textContent = prev.title;
  nx.href = `project.html?p=${encodeURIComponent(next.slug)}`;
  nx.querySelector('b').textContent = next.title;
}

/* ---------------------------------------------------------------------------
   The virtual visit
   ------------------------------------------------------------------------- */
async function startTour(tour) {
  const section = document.getElementById('pdTour');
  const canvas = document.getElementById('tourCanvas');
  const load = document.getElementById('tourLoad');
  const bar = document.getElementById('tourBar');
  const pct = document.getElementById('tourPct');
  const hint = document.getElementById('tourHint');
  section.hidden = false;
  document.getElementById('tourKind').textContent = tour.kind;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let THREE, GLTFLoader, DRACOLoader, OrbitControls;
  try {
    // via the import map, so the addons can resolve their own "three" import
    [THREE, { GLTFLoader }, { DRACOLoader }, { OrbitControls }] = await Promise.all([
      import('three'),
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/loaders/DRACOLoader.js'),
      import('three/addons/controls/OrbitControls.js')
    ]);
  } catch (e) {
    return fail('The 3D viewer could not load.');
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 2000);

  // A gradient sky, doubled as the environment map — these models are lit
  // entirely by image-based lighting, so without one they read flat.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x35507E) },
      mid: { value: new THREE.Color(0xBFCEE0) },
      bot: { value: new THREE.Color(0xEDE6DA) }
    },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      void main(){ float h=normalize(vP).y;
        vec3 c=mix(bot,mid,smoothstep(-0.1,0.25,h));
        c=mix(c,top,smoothstep(0.2,0.85,h));
        gl_FragColor=vec4(c,1.0); }`
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat));
  scene.environment = pmrem.fromScene(envScene, 0.03).texture;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xCFE0F4, 0x9A9080, 1.5));
  const key = new THREE.DirectionalLight(0xFFF0DC, 2.0);
  key.position.set(-40, 60, 30);
  scene.add(key);

  const draco = new DRACOLoader();
  draco.setDecoderPath(CDN + 'examples/jsm/libs/draco/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  let gltf;
  try {
    gltf = await loader.loadAsync(tour.file, ev => {
      if (!ev.lengthComputable) return;
      const p = Math.round(ev.loaded / ev.total * 100);
      bar.style.transform = `scaleX(${p / 100})`;
      pct.textContent = `Loading the model… ${p}%`;
    });
  } catch (e) {
    return fail('The model could not be loaded.');
  }

  const model = gltf.scene;
  scene.add(model);

  /* Frame whatever arrives. The two models have completely different scales
     and origins, so the camera is derived from the bounding box rather than
     hard-coded — a third model can be dropped in without touching this. */
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.copy(centre);
  controls.minDistance = span * 0.18;
  controls.maxDistance = span * 2.4;
  controls.maxPolarAngle = Math.PI * 0.495;      // never go under the ground
  controls.enablePan = false;
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.45;

  const start = new THREE.Vector3(span * 0.72, centre.y + span * 0.30, span * 0.72);
  camera.position.copy(centre).add(start);
  camera.near = span / 800;
  camera.far = span * 12;
  camera.updateProjectionMatrix();
  controls.update();

  ['pointerdown', 'wheel', 'touchstart'].forEach(ev =>
    canvas.addEventListener(ev, () => { controls.autoRotate = false; hint.classList.add('gone'); }, { passive: true }));

  document.getElementById('tourReset').addEventListener('click', () => {
    camera.position.copy(centre).add(start);
    controls.target.copy(centre);
    controls.update();
  });

  // opt-in diagnostics, matching js/studio.js
  if (location.search.includes('debug')) window.__deTour = { renderer, scene, camera, controls, model, box, span };

  load.classList.add('gone');
  setTimeout(() => hint.classList.add('gone'), 6000);

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize, { passive: true });

  /* Only render while the viewer is actually on screen. A 220k-triangle model
     spinning in a section nobody is looking at is exactly the kind of thing
     that drains a laptop battery. */
  let running = false, raf = null;
  function frame() {
    raf = requestAnimationFrame(frame);
    controls.update();
    renderer.render(scene, camera);
  }
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(frame); }
    else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
  }), { rootMargin: '120px' }).observe(section);

  function fail(msg) {
    load.innerHTML = `<span class="tour-fail">${msg} The gallery below shows the project.</span>`;
  }
}
