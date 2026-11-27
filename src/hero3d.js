// Interactive hero: "the usual conference" vs "the Dialogue Co. way".
// Edit this file, then run `npm run build` to regenerate /hero3d.js.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Color, Fog,
  SphereGeometry, CapsuleGeometry, ConeGeometry, BoxGeometry, CylinderGeometry,
  PlaneGeometry, CircleGeometry, TorusGeometry, MeshPhongMaterial, MeshBasicMaterial,
  HemisphereLight, DirectionalLight, SpotLight, CanvasTexture, Sprite, SpriteMaterial,
  InstancedMesh, Object3D, Raycaster, Vector2, Vector3, SRGBColorSpace, DoubleSide,
} from 'three';

const canvas = document.getElementById('hero3d');
const hero = document.querySelector('.hero');
if (canvas && hero) init();

function init() {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { hero.classList.add('no-webgl'); return; }

  const isSmall = () => window.innerWidth < 760;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall() ? 1.5 : 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  hero.classList.add('has-3d');

  const scene = new Scene();
  const BORING_BG = new Color('#24213a');
  const FUN_BG = new Color('#5B2EEF');
  scene.background = BORING_BG.clone();
  scene.fog = new Fog(scene.background, 14, 30);

  const camera = new PerspectiveCamera(34, 1, 0.1, 60);
  const camBase = new Vector3(4.6, 4.6, 10.5);
  const camTarget = new Vector3(-0.5, 1.15, 0);

  const hemi = new HemisphereLight('#c9c4ff', '#3a3355', 1.1);
  scene.add(hemi);
  const sun = new DirectionalLight('#ffffff', 1.6);
  sun.position.set(4, 9, 6);
  scene.add(sun);
  const stageSpot = new SpotLight('#dfe6ff', 0, 14, 0.5, 0.6);
  stageSpot.position.set(-2, 7, 2);
  stageSpot.target.position.set(-5, 0.5, 0);
  scene.add(stageSpot, stageSpot.target);

  // ---------- shared geometry / materials ----------
  const lo = isSmall();
  const GEO = {
    head: new SphereGeometry(0.27, lo ? 16 : 24, lo ? 12 : 18),
    torso: new CapsuleGeometry(0.22, 0.32, lo ? 4 : 6, lo ? 10 : 16),
    arm: new CapsuleGeometry(0.07, 0.3, 3, lo ? 6 : 10),
    leg: new CapsuleGeometry(0.085, 0.36, 3, lo ? 6 : 10),
    tie: new ConeGeometry(0.075, 0.28, 4),
    knot: new SphereGeometry(0.055, 8, 6),
    shadow: new CircleGeometry(0.42, 20),
  };
  const mats = {};
  const mat = (hex, opts = {}) => {
    const k = hex + JSON.stringify(opts);
    if (!mats[k]) mats[k] = new MeshPhongMaterial({ color: hex, shininess: 90, specular: 0x555555, ...opts });
    return mats[k];
  };
  const shadowMat = new MeshBasicMaterial({ map: radialTexture('rgba(0,0,0,0.38)'), transparent: true, depthWrite: false });

  // ---------- textures ----------
  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function radialTexture(inner) {
    const c = makeCanvas(64, 64), g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, inner); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }
  function textTexture(text, { bubble = false, color = '#111', bg = '#C8F04B', font = 'bold 72px Archivo Black, Arial, sans-serif' } = {}) {
    const c = makeCanvas(256, 192), g = c.getContext('2d');
    if (bubble) {
      g.fillStyle = bg; g.strokeStyle = '#111'; g.lineWidth = 8;
      g.beginPath(); g.roundRect(14, 14, 228, 124, 40); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(80, 134); g.lineTo(66, 182); g.lineTo(122, 134); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(80, 138); g.lineTo(66, 182); g.lineTo(122, 138); g.stroke();
      g.fillStyle = bg; g.fillRect(78, 126, 48, 14);
    }
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (text === '...') { [88, 128, 168].forEach(x => { g.beginPath(); g.arc(x, 76, 15, 0, Math.PI * 2); g.fill(); }); }
    else g.fillText(text, 128, bubble ? 80 : 96);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }
  function slideTexture() {
    const c = makeCanvas(512, 288), g = c.getContext('2d');
    g.fillStyle = '#c9cad6'; g.fillRect(0, 0, 512, 288);
    g.fillStyle = '#3b3f5c'; g.font = 'bold 30px Arial'; g.fillText('Q3 SYNERGY ALIGNMENT', 28, 50);
    g.font = '18px Arial'; g.fillStyle = '#5d6180';
    ['• Leveraging stakeholder bandwidth', '• Circling back on deliverables', '• Value-add optimisation matrix'].forEach((s, i) => g.fillText(s, 28, 96 + i * 30));
    [60, 95, 75, 110, 85].forEach((h, i) => { g.fillStyle = '#8b8fa8'; g.fillRect(320 + i * 34, 230 - h, 24, h); });
    g.fillStyle = '#7a7d95'; g.font = '16px Arial'; g.fillText('Slide 47 of 112', 28, 262);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }
  const TEX = {
    z: textTexture('Z', { color: '#d8d4ff', font: 'bold 120px Archivo Black, Arial, sans-serif' }),
    dots: textTexture('...', { bubble: true }),
    haha: textTexture('haha', { bubble: true, font: 'bold 64px Archivo Black, Arial, sans-serif' }),
    wow: textTexture('wow!', { bubble: true, bg: '#F06BE6', font: 'bold 64px Archivo Black, Arial, sans-serif' }),
    heart: textTexture('♥', { bubble: true, bg: '#6FF2E3', color: '#F0357A', font: 'bold 96px Arial, sans-serif' }),
    yum: textTexture('yum!', { bubble: true, bg: '#FFE45E', font: 'bold 64px Archivo Black, Arial, sans-serif' }),
    huh: textTexture('!?', { bubble: true, bg: '#ffffff', font: 'bold 84px Archivo Black, Arial, sans-serif' }),
    steam: radialTexture('rgba(255,255,255,0.85)'),
  };

  // ---------- character ----------
  const people = [];
  function makePerson(color, { tie = '#C8F04B', seated = false } = {}) {
    const root = new Group();
    const m = mat(color);
    const hips = new Group(); hips.position.y = 0.62; root.add(hips);
    const torso = new Mesh(GEO.torso, m); torso.position.y = 0.3; hips.add(torso);
    const tieG = new Group(); tieG.position.set(0, 0.5, 0.2); hips.add(tieG);
    const knot = new Mesh(GEO.knot, mat(tie)); tieG.add(knot);
    const tieM = new Mesh(GEO.tie, mat(tie)); tieM.rotation.x = Math.PI; tieM.position.y = -0.16; tieG.add(tieM);
    tieG.rotation.x = -0.18;
    const neck = new Group(); neck.position.y = 0.62; hips.add(neck);
    const head = new Mesh(GEO.head, m); head.position.y = 0.24; neck.add(head);
    const arm = (side) => { const g = new Group(); g.position.set(side * 0.29, 0.5, 0); const a = new Mesh(GEO.arm, m); a.position.y = -0.2; g.add(a); hips.add(g); return g; };
    const leg = (side) => { const g = new Group(); g.position.set(side * 0.1, 0.62, 0); const l = new Mesh(GEO.leg, m); l.position.y = -0.27; g.add(l); root.add(g); return g; };
    const armL = arm(-1), armR = arm(1), legL = leg(-1), legR = leg(1);
    const shadow = new Mesh(GEO.shadow, shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; root.add(shadow);
    if (seated) { root.position.y = -0.08; legL.rotation.x = legR.rotation.x = -1.35; shadow.visible = false; }
    const p = { root, hips, neck, head, armL, armR, legL, legR, tieG, ph: Math.random() * 10, poke: -10, baseY: root.position.y, baseRotY: 0 };
    root.traverse(o => { o.userData.person = p; });
    people.push(p);
    return p;
  }
  function place(p, x, z, rotY) { p.root.position.x = x; p.root.position.z = z; p.root.rotation.y = rotY; p.baseRotY = rotY; return p; }
  function chair(color) {
    const g = new Group(); const m = mat(color, { shininess: 30 });
    const seat = new Mesh(new BoxGeometry(0.55, 0.08, 0.5), m); seat.position.y = 0.42; g.add(seat);
    const back = new Mesh(new BoxGeometry(0.55, 0.6, 0.07), m); back.position.set(0, 0.72, -0.24); g.add(back);
    const legGeo = new CylinderGeometry(0.03, 0.03, 0.42, 6);
    [[-0.23, -0.2], [0.23, -0.2], [-0.23, 0.2], [0.23, 0.2]].forEach(([x, z]) => { const l = new Mesh(legGeo, m); l.position.set(x, 0.21, z); g.add(l); });
    return g;
  }

  // ======================= SCENE A: the usual conference =======================
  const boring = new Group(); scene.add(boring);
  const A = { items: [], sleepers: [], heads: [] };
  const addA = (o) => { boring.add(o); A.items.push(o); return o; };

  const floorA = new Mesh(new CircleGeometry(9, 48), mat('#34304d', { shininess: 10 })); floorA.rotation.x = -Math.PI / 2; floorA.position.y = 0.004; addA(floorA);
  const stage = addA(new Mesh(new BoxGeometry(3.2, 0.5, 6.6), mat('#4a4566', { shininess: 20 }))); stage.position.set(-5.2, 0.25, 0);
  const screen = addA(new Mesh(new PlaneGeometry(5.4, 3), new MeshBasicMaterial({ map: slideTexture(), color: '#b9bacb' })));
  screen.position.set(-6.6, 2.6, 0); screen.rotation.y = Math.PI / 2;
  const table = addA(new Mesh(new BoxGeometry(0.7, 0.55, 3.6), mat('#5b5678', { shininess: 20 }))); table.position.set(-4.35, 0.78, 0);
  const water = new CylinderGeometry(0.05, 0.05, 0.18, 8);
  [-1.1, 0, 1.1].forEach((z, i) => {
    const c = addA(chair('#3d3956')); c.position.set(-5.05, 0.5, z); c.rotation.y = Math.PI / 2;
    const p = makePerson(['#8d90a8', '#9a96a6', '#878aa0'][i], { tie: '#6b2f3a', seated: true });
    place(p, -5.05, z, Math.PI / 2); p.root.position.y += 0.5; p.baseY = p.root.position.y; addA(p.root);
    p.role = ['speaker', 'watch', 'slump'][i];
    const mic = addA(new Mesh(new CylinderGeometry(0.025, 0.025, 0.35, 6), mat('#222'))); mic.position.set(-4.2, 1.2, z + 0.25); mic.rotation.z = 0.5;
    const w = addA(new Mesh(water, mat('#a9c9ff', { transparent: true, opacity: 0.7 }))); w.position.set(-4.15, 1.14, z - 0.3);
  });
  // audience
  const greys = ['#8e8fa3', '#9d9aae', '#7f849c', '#a3a0ad', '#8a879c'];
  const ties = ['#6b2f3a', '#2f3a6b', '#4a4a4a', '#5a2f6b'];
  let n = 0;
  [-1.6, -0.3, 1.0, 2.3].forEach((x, row) => {
    [-2.4, -1.2, 0, 1.2, 2.4].forEach((z) => {
      const c = addA(chair('#45405e')); c.position.set(x, 0, z); c.rotation.y = -Math.PI / 2;
      const p = makePerson(greys[n % greys.length], { tie: ties[n % ties.length], seated: true });
      place(p, x, z, -Math.PI / 2); addA(p.root);
      const r = n % 5;
      p.role = r === 2 && row === 1 ? 'phone' : (r === 0 || r === 3 ? 'sleep' : (r === 4 ? 'lean' : 'droop'));
      if (row === 3 && z === 0) p.role = 'yawn';
      if (p.role === 'phone') {
        const ph = new Mesh(new BoxGeometry(0.14, 0.02, 0.22), mat('#9fd0ff', { emissive: '#4a7dbb' }));
        ph.position.set(0, 0.25, 0.42); p.hips.add(ph);
      }
      if (p.role === 'sleep' || p.role === 'droop') A.sleepers.push(p);
      n++;
    });
  });
  // floating Zzz
  const zs = [];
  for (let i = 0; i < 9; i++) {
    const s = new Sprite(new SpriteMaterial({ map: TEX.z, transparent: true, depthWrite: false }));
    s.scale.setScalar(0.35); boring.add(s); zs.push({ s, t: Math.random() * 3, who: A.sleepers[i % A.sleepers.length] });
  }

  // ======================= SCENE B: the Dialogue Co. way =======================
  const fun = new Group(); scene.add(fun);
  const B = { items: [], talkers: [] };
  const addB = (o) => { fun.add(o); B.items.push(o); return o; };
  const floorB = new Mesh(new CircleGeometry(9, 48), mat('#6a43ff', { shininess: 10 })); floorB.rotation.x = -Math.PI / 2; addB(floorB);
  const ring = new Mesh(new TorusGeometry(6.2, 0.06, 6, 80), mat('#C8F04B', { emissive: '#7da000' })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; addB(ring);
  const palette = ['#C8F04B', '#F06BE6', '#6FF2E3', '#FF9F43', '#FFE45E', '#ffffff', '#9b7bff'];
  const tiesB = ['#111111', '#5B2EEF', '#F0357A'];
  let k = 0;
  const pick = () => palette[(k++) % palette.length];

  // cooking class
  const counter = addB(new Group()); counter.position.set(-4, 0, 0.2);
  const cBase = new Mesh(new BoxGeometry(1.0, 0.85, 2.0), mat('#ffffff', { shininess: 40 })); cBase.position.y = 0.425; counter.add(cBase);
  const cTop = new Mesh(new BoxGeometry(1.1, 0.07, 2.1), mat('#FF9F43')); cTop.position.y = 0.87; counter.add(cTop);
  const pot = new Mesh(new CylinderGeometry(0.24, 0.2, 0.28, 16), mat('#2d2d3a', { shininess: 120 })); pot.position.set(0, 1.04, -0.45); counter.add(pot);
  const board = new Mesh(new BoxGeometry(0.4, 0.04, 0.5), mat('#e0b07a')); board.position.set(0.05, 0.92, 0.45); counter.add(board);
  ['#ff5a5a', '#C8F04B', '#FFE45E'].forEach((c, i) => { const v = new Mesh(new SphereGeometry(0.07, 10, 8), mat(c)); v.position.set(-0.05 + i * 0.09, 0.98, 0.35 + (i % 2) * 0.12); counter.add(v); });
  const chef = makePerson('#ffffff', { tie: '#F0357A' }); place(chef, -4.75, -0.3, Math.PI / 2); addB(chef.root); chef.role = 'chef';
  const hat = new Group(); const hb = new Mesh(new CylinderGeometry(0.2, 0.2, 0.22, 14), mat('#ffffff')); hb.position.y = 0.11; hat.add(hb);
  const hp = new Mesh(new SphereGeometry(0.26, 14, 10), mat('#ffffff')); hp.position.y = 0.28; hp.scale.y = 0.75; hat.add(hp); hat.position.y = 0.42; chef.neck.add(hat);
  [[-3.2, -0.6], [-3.2, 0.5], [-3.95, 1.55]].forEach(([x, z], i) => {
    const p = makePerson(pick(), { tie: tiesB[i % 3] }); place(p, x, z, i === 2 ? Math.PI : -Math.PI / 2); addB(p.root); p.role = i === 1 ? 'chop' : 'cookfan';
  });
  const steams = [];
  for (let i = 0; i < 5; i++) { const s = new Sprite(new SpriteMaterial({ map: TEX.steam, transparent: true, depthWrite: false })); fun.add(s); steams.push({ s, t: i / 5 }); }

  // VR zone
  const pad = addB(new Mesh(new CylinderGeometry(1.25, 1.25, 0.05, 32), mat('#111', { shininess: 60 }))); pad.position.set(-0.6, 0.025, -1.9);
  const padRing = new Mesh(new TorusGeometry(1.25, 0.04, 6, 48), mat('#6FF2E3', { emissive: '#2aa' })); padRing.rotation.x = Math.PI / 2; padRing.position.y = 0.03; pad.add(padRing);
  const vrs = [];
  [[-1.15, -1.8], [-0.05, -2.1]].forEach(([x, z], i) => {
    const p = makePerson(pick(), { tie: '#111' }); place(p, x, z, 0.3 - i * 0.6); addB(p.root); p.role = 'vr';
    const visor = new Mesh(new BoxGeometry(0.42, 0.2, 0.22), mat('#111', { shininess: 140 })); visor.position.set(0, 0.26, 0.2); p.neck.add(visor);
    const lens = new Mesh(new BoxGeometry(0.36, 0.12, 0.02), mat('#6FF2E3', { emissive: '#2ac' })); lens.position.set(0, 0.26, 0.315); p.neck.add(lens);
    vrs.push(p);
  });
  const cubes = [];
  for (let i = 0; i < 6; i++) { const c = new Mesh(new BoxGeometry(0.16, 0.16, 0.16), mat(['#6FF2E3', '#F06BE6', '#C8F04B'][i % 3], { emissive: '#333' })); fun.add(c); cubes.push(c); }

  // conversation circles
  const circle = (cx, cz, count, r) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.4;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const p = makePerson(pick(), { tie: tiesB[i % 3] });
      place(p, x, z, Math.atan2(cx - x, cz - z)); addB(p.root); p.role = 'talk'; B.talkers.push(p);
    }
  };
  circle(2.3, 1.2, 3, 0.62);
  circle(3.6, -1.6, 4, 0.72);
  // high-five pair
  const h1 = makePerson(pick(), { tie: '#111' }); place(h1, 0.05, 1.7, Math.PI / 2); addB(h1.root); h1.role = 'hi5'; h1.side = 1;
  const h2 = makePerson(pick(), { tie: '#F0357A' }); place(h2, 0.95, 1.7, -Math.PI / 2); addB(h2.root); h2.role = 'hi5'; h2.side = -1;
  // dancer
  const d1 = makePerson('#FFE45E', { tie: '#5B2EEF' }); place(d1, 1.3, -0.4, 0.3); addB(d1.root); d1.role = 'dance';

  // speech bubbles
  const bubbleTex = [TEX.dots, TEX.haha, TEX.wow, TEX.heart, TEX.dots, TEX.haha];
  const bubbles = [];
  for (let i = 0; i < 4; i++) {
    const s = new Sprite(new SpriteMaterial({ map: bubbleTex[i], transparent: true, depthWrite: false }));
    s.scale.set(0, 0, 1); fun.add(s); bubbles.push({ s, t: -i * 0.9, who: null, w: 0.75 });
  }
  const chefBubble = { s: new Sprite(new SpriteMaterial({ map: TEX.yum, transparent: true, depthWrite: false })), t: -1.5, who: chef, w: 0.7 };
  chefBubble.s.scale.set(0, 0, 1); fun.add(chefBubble.s); bubbles.push(chefBubble);
  // poke reaction bubble (both scenes)
  const pokeBubble = new Sprite(new SpriteMaterial({ map: TEX.huh, transparent: true, depthWrite: false })); pokeBubble.scale.set(0, 0, 1); scene.add(pokeBubble);
  let pokeTarget = null, pokeT = 0;

  // confetti
  const CONF = lo ? 50 : 110;
  const conf = new InstancedMesh(new PlaneGeometry(0.08, 0.12), new MeshBasicMaterial({ side: DoubleSide }), CONF);
  const confData = [];
  const dummy = new Object3D();
  for (let i = 0; i < CONF; i++) {
    confData.push({ x: (Math.random() - 0.5) * 12, y: Math.random() * 6, z: (Math.random() - 0.5) * 8, s: 0.4 + Math.random() * 0.6, r: Math.random() * 6 });
    conf.setColorAt(i, new Color(palette[i % palette.length]));
  }
  addB(conf);

  // ---------- poses ----------
  const S = Math.sin, C = Math.cos, ab = Math.abs;
  function animBoring(p, t) {
    const q = t + p.ph;
    const breathe = 1 + 0.035 * S(q * 1.3);
    p.hips.scale.set(1, breathe, 1);
    const woke = t - p.poke < 1.6;
    switch (p.role) {
      case 'sleep': p.neck.rotation.x = 0.75 + 0.08 * S(q * 0.9); p.neck.rotation.z = 0.15 * S(p.ph); p.hips.rotation.x = 0.12; p.armL.rotation.x = p.armR.rotation.x = -0.25; break;
      case 'droop': p.neck.rotation.z = 0.55 + 0.05 * S(q * 0.7); p.neck.rotation.x = 0.2; p.hips.rotation.x = -0.22; p.hips.rotation.z = 0.08; p.armL.rotation.z = -0.15; p.armR.rotation.z = 0.15; break;
      case 'lean': p.neck.rotation.x = 0.35; p.hips.rotation.x = 0.35; p.armL.rotation.x = p.armR.rotation.x = -1.0; p.armL.rotation.z = 0.35; p.armR.rotation.z = -0.35; break;
      case 'phone': p.neck.rotation.x = 0.6; p.hips.rotation.x = 0.15; p.armL.rotation.x = p.armR.rotation.x = -1.05; p.armL.rotation.z = 0.3; p.armR.rotation.z = -0.3; break;
      case 'yawn': { const y = Math.max(0, S(q * 0.5)) ** 6; p.neck.rotation.x = 0.4 - y * 0.9; p.armL.rotation.x = -y * 2.6; p.armR.rotation.x = -y * 2.6; p.hips.rotation.x = -0.1 * y; break; }
      case 'speaker': p.armR.rotation.x = -0.9 + 0.25 * S(q * 1.4); p.armR.rotation.z = 0.2 * S(q * 0.7); p.neck.rotation.x = 0.05 * S(q * 2); p.armL.rotation.x = -0.6; break;
      case 'watch': { const w = S(q * 0.45) > 0.6; p.armL.rotation.x = w ? -1.3 : -0.5; p.armL.rotation.z = w ? 0.6 : 0; p.neck.rotation.x = w ? 0.45 : 0.1; p.armR.rotation.x = -0.5; break; }
      case 'slump': p.neck.rotation.x = 0.5; p.neck.rotation.z = -0.3; p.hips.rotation.x = -0.25; p.armL.rotation.x = p.armR.rotation.x = -0.4; break;
    }
    if (woke) { const k2 = 1 - (t - p.poke) / 1.6; p.neck.rotation.x = -0.25 * k2 + p.neck.rotation.x * (1 - k2); p.neck.rotation.z *= 1 - k2; p.root.position.y = p.baseY + 0.25 * Math.max(0, S((t - p.poke) * 6)) * k2; }
    else p.root.position.y = p.baseY;
  }
  function animFun(p, t) {
    const q = t + p.ph;
    const tieFlap = (amp) => { p.tieG.rotation.z = amp * S(q * 9); p.tieG.rotation.x = -0.2 - amp * ab(S(q * 4.5)); };
    let y = 0, spin = 0;
    switch (p.role) {
      case 'chef': p.armR.rotation.x = -1.15 + 0.15 * S(q * 6); p.armR.rotation.z = -0.25 + 0.25 * C(q * 6); p.armL.rotation.x = -0.4 + 0.5 * ab(S(q * 1.5)); p.armL.rotation.z = -0.4; p.hips.rotation.z = 0.08 * S(q * 3); p.neck.rotation.z = 0.15 * S(q * 1.5); y = 0.03 * ab(S(q * 6)); tieFlap(0.15); break;
      case 'chop': p.armR.rotation.x = -0.9 + 0.45 * ab(S(q * 11)); p.armL.rotation.x = -0.8; p.neck.rotation.x = 0.35; y = 0.04 * ab(S(q * 5.5)); tieFlap(0.2); break;
      case 'cookfan': p.armL.rotation.z = -0.3 - 0.9 * ab(S(q * 3)); p.armR.rotation.z = 0.3 + 0.9 * ab(S(q * 3 + 1)); p.neck.rotation.x = 0.15 * S(q * 4); y = 0.1 * ab(S(q * 3)); tieFlap(0.35); break;
      case 'vr': p.armL.rotation.x = -1.5 + 0.7 * S(q * 2.1); p.armR.rotation.x = -1.2 + 0.8 * S(q * 2.6 + 1); p.armL.rotation.z = -0.3 * S(q * 1.3); spin = 0.9 * S(q * 0.8); p.neck.rotation.x = -0.25 + 0.2 * S(q * 1.7); y = 0.05 * ab(S(q * 3)); p.legL.rotation.x = 0.35 * S(q * 3); p.legR.rotation.x = -0.35 * S(q * 3); tieFlap(0.3); break;
      case 'talk': { const g = S(q * 2.2); p.armL.rotation.x = -0.6 - 0.6 * Math.max(0, g); p.armR.rotation.x = -0.6 - 0.6 * Math.max(0, -g); p.armL.rotation.z = -0.25; p.armR.rotation.z = 0.25; p.neck.rotation.x = 0.12 * S(q * 3.2); p.neck.rotation.z = 0.12 * S(q * 1.1);
        const laugh = Math.max(0, S(q * 0.7)) ** 12; y = 0.04 * ab(S(q * 2.2)) + 0.35 * laugh * ab(S(q * 9)); p.hips.rotation.x = -0.15 * laugh; tieFlap(0.15 + laugh * 0.4); break; }
      case 'hi5': { const c2 = (t % 2.4) / 2.4; const up = c2 > 0.35 && c2 < 0.75 ? S((c2 - 0.35) / 0.4 * Math.PI) : 0;
        p.armR.rotation.x = -0.3 - 2.5 * up; p.armR.rotation.z = p.side > 0 ? -0.4 * up : 0.4 * up; p.armL.rotation.x = -0.3; p.armL.rotation.z = -0.3 * up; y = 0.45 * up * up; p.hips.rotation.x = 0.15 * up; tieFlap(0.2 + up * 0.5);
        p.root.position.x = p.baseX + p.side * 0.12 * up; break; }
      case 'dance': p.armL.rotation.x = -2.7 + 0.4 * S(q * 4); p.armR.rotation.x = -2.7 + 0.4 * S(q * 4 + Math.PI); p.armL.rotation.z = -0.3; p.armR.rotation.z = 0.3; p.hips.rotation.z = 0.25 * S(q * 4); y = 0.12 * ab(S(q * 4)); spin = t * 1.5; p.legL.rotation.z = -0.15 * ab(S(q * 4)); p.legR.rotation.z = 0.15 * ab(S(q * 4)); tieFlap(0.45); break;
    }
    const sinceP = t - p.poke;
    if (sinceP < 1) { y += 0.9 * S(sinceP * Math.PI); spin += sinceP * Math.PI * 2; }
    p.root.position.y = p.baseY + y;
    p.root.rotation.y = p.baseRotY + spin;
    const squash = 1 - 0.06 * S(q * 6) * (p.role === 'chef' ? 0 : 1);
    p.hips.scale.set(1, squash, 1);
  }
  people.forEach(p => { p.baseX = p.root.position.x; p.scene = boring.children.includes(p.root) ? 'A' : 'B'; });

  // ---------- mode switching ----------
  let mode = 0, prog = 1, from = 0;
  const easeOutBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  [A, B].forEach(sc => sc.items.forEach(o => { o.userData.delay = (o === floorA || o === floorB || o === ring || o === conf) ? -0.25 : clamp01((o.position.x + 6.5) / 13) * 0.45 + Math.random() * 0.12; }));
  function applyTransition() {
    const show = mode === 0 ? A : B, hide = mode === 0 ? B : A;
    const showG = mode === 0 ? boring : fun, hideG = mode === 0 ? fun : boring;
    showG.visible = true;
    show.items.forEach(o => { const s = prog >= 1 ? 1 : Math.max(0.0001, easeOutBack(clamp01((prog * 1.4 - 0.35 - o.userData.delay) / 0.45))); o.scale.setScalar(s); });
    const out = clamp01(1 - prog * 2.6);
    hide.items.forEach(o => o.scale.setScalar(Math.max(0.0001, out)));
    hideG.visible = out > 0.001;
    if (!hideG.visible) hide.items.forEach(o => o.scale.setScalar(1));
    const c = clamp01(prog * 1.5);
    scene.background.copy(mode === 1 ? BORING_BG : FUN_BG).lerp(mode === 1 ? FUN_BG : BORING_BG, c);
    scene.fog.color.copy(scene.background);
    const f = mode === 1 ? c : 1 - c;
    hemi.intensity = 1.1 + f * 0.6; sun.intensity = 1.6 + f * 0.6; stageSpot.intensity = (1 - f) * 40;
    hemi.color.set(f > 0.5 ? '#ffffff' : '#c9c4ff');
  }
  fun.visible = false;
  stageSpot.intensity = 40;

  const btns = hero.querySelectorAll('[data-mode]');
  const caption = hero.querySelector('.hero-caption');
  const captions = [
    'The usual: panels, slides, polite applause. Zzz.',
    'The Dialogue Co. way: cook, play, talk, actually connect.',
  ];
  function setMode(m, user) {
    if (user) autoplay = false;
    if (m === mode) return;
    from = mode; mode = m; prog = reduced ? 1 : 0;
    btns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.mode === m)));
    if (caption) caption.textContent = captions[m];
    hero.classList.toggle('mode-fun', m === 1);
    if (prog >= 1) applyTransition();
  }
  btns.forEach(b => b.addEventListener('click', () => setMode(+b.dataset.mode, true)));
  let autoplay = !reduced, autoTimer = 0;

  // ---------- interaction ----------
  const pointer = new Vector2(), look = new Vector2();
  const ray = new Raycaster();
  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  });
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const v = new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v, camera);
    const hits = ray.intersectObject(mode === 0 ? boring : fun, true);
    const hit = hits.find(h => h.object.userData.person);
    if (hit) {
      const p = hit.object.userData.person; p.poke = clock;
      pokeTarget = p; pokeT = 0;
      pokeBubble.material.map = mode === 0 ? TEX.huh : TEX.wow;
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    const v = new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v, camera);
    const hit = ray.intersectObject(mode === 0 ? boring : fun, true).find(h => h.object.userData.person);
    canvas.style.cursor = hit ? 'pointer' : '';
  });

  // ---------- resize / visibility ----------
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = camera.aspect < 1;
    camera.fov = narrow ? 48 : 34;
    camBase.set(narrow ? 2.2 : 4.4, narrow ? 6.6 : 4.6, narrow ? 14 : 11.2);
    camTarget.set(narrow ? -0.8 : -0.9, narrow ? 0.3 : 1.15, 0);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  let onScreen = true;
  new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; if (onScreen) last = performance.now(); }).observe(hero);

  // ---------- loop ----------
  let clock = 0, last = performance.now();
  const tmp = new Vector3();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!onScreen || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    clock += reduced ? dt * 0.4 : dt;
    const t = clock;

    if (autoplay) { autoTimer += dt; if (autoTimer > (mode === 0 ? 4.5 : 7)) { autoTimer = 0; setMode(1 - mode, false); } }
    if (prog < 1) { prog = Math.min(1, prog + dt / 1.5); applyTransition(); }

    if (boring.visible) {
      people.forEach(p => p.scene === 'A' && animBoring(p, t));
      zs.forEach(z => {
        z.t += dt; const life = z.t % 3; const k2 = life / 3;
        if (life < dt * 1.5) z.who = A.sleepers[Math.floor(Math.random() * A.sleepers.length)];
        z.who.head.getWorldPosition(tmp);
        z.s.position.set(tmp.x + 0.25 + k2 * 0.4, tmp.y + 0.35 + k2 * 0.9, tmp.z + S(k2 * 6) * 0.1);
        z.s.material.opacity = S(k2 * Math.PI) * 0.9; z.s.scale.setScalar(0.2 + k2 * 0.3);
        z.s.visible = !(t - z.who.poke < 1.6);
      });
    }
    if (fun.visible) {
      people.forEach(p => p.scene === 'B' && animFun(p, t));
      steams.forEach((s, i) => { const k2 = (t * 0.5 + s.t) % 1; s.s.position.set(-4 + S(k2 * 5 + i) * 0.1, 1.2 + k2 * 1.0, -0.25); s.s.scale.setScalar(0.2 + k2 * 0.45); s.s.material.opacity = S(k2 * Math.PI) * 0.7; });
      cubes.forEach((c, i) => { const vr = vrs[i % 2]; const a = t * (0.8 + i * 0.1) + i * 2; c.position.set(vr.root.position.x + C(a) * 0.75, 1.3 + S(a * 1.3) * 0.35, vr.root.position.z + S(a) * 0.75); c.rotation.set(t * 1.5 + i, t + i, 0); });
      bubbles.forEach(b => {
        b.t += dt; const cyc = 3.2;
        if (b.t < 0) { b.s.scale.set(0, 0, 1); return; }
        const life = b.t % cyc;
        if (life < dt * 1.5 && b !== chefBubble) { b.who = B.talkers[Math.floor(Math.random() * B.talkers.length)]; }
        if (!b.who) return;
        b.who.head.getWorldPosition(tmp);
        const sc = life < 0.4 ? easeOutBack(life / 0.4) : life > 2.2 ? Math.max(0, 1 - (life - 2.2) / 0.3) : 1;
        b.s.position.set(tmp.x + 0.2, tmp.y + 0.62, tmp.z); b.s.scale.set(b.w * sc, b.w * 0.75 * sc, 1);
      });
      for (let i = 0; i < CONF; i++) {
        const d = confData[i]; const y = 6 - ((t * d.s * 0.6 + d.y) % 6.5);
        dummy.position.set(d.x + S(t + d.r) * 0.3, y, d.z); dummy.rotation.set(t * 2 + d.r, t + d.r, 0); dummy.updateMatrix(); conf.setMatrixAt(i, dummy.matrix);
      }
      conf.instanceMatrix.needsUpdate = true;
    }
    if (pokeTarget) {
      pokeT += dt; pokeTarget.head.getWorldPosition(tmp);
      const sc = pokeT < 0.3 ? easeOutBack(pokeT / 0.3) : Math.max(0, 1 - (pokeT - 1.1) / 0.3);
      pokeBubble.position.set(tmp.x, tmp.y + 0.62, tmp.z); pokeBubble.scale.set(0.6 * sc, 0.45 * sc, 1);
      if (pokeT > 1.4) { pokeTarget = null; pokeBubble.scale.set(0, 0, 1); }
    }

    look.lerp(pointer, 0.05);
    camera.position.set(camBase.x + look.x * 1.2, camBase.y + look.y * 0.5, camBase.z);
    camera.lookAt(camTarget);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  window.__hero3d = { setMode: (m) => setMode(m, true), get people() { return people.length; } };
}
