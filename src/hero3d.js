// Interactive hero: "standard formats" vs "the Dialogue Co. way".
// Edit this file, then run `npm run build` to regenerate /hero3d.js.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Color, Fog,
  SphereGeometry, CapsuleGeometry, ConeGeometry, BoxGeometry, CylinderGeometry, LatheGeometry,
  PlaneGeometry, CircleGeometry, TorusGeometry, MeshStandardMaterial, MeshBasicMaterial,
  HemisphereLight, DirectionalLight, SpotLight, CanvasTexture, Sprite, SpriteMaterial,
  InstancedMesh, Object3D, Raycaster, Vector2, Vector3, SRGBColorSpace, DoubleSide, PCFSoftShadowMap,
} from 'three';

const canvas = document.getElementById('hero3d');
const hero = document.querySelector('.hero');
if (canvas && hero) init();

function init() {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, powerPreference: 'high-performance' });
  } catch (e) { hero.classList.add('no-webgl'); return; }

  const lo = window.innerWidth < 760;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lo ? 1.5 : 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  const SHADOWS = !lo;
  if (SHADOWS) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap; }
  hero.classList.add('has-3d');

  const scene = new Scene();
  const BORING_BG = new Color('#24213a');
  const FUN_BG = new Color('#5B2EEF');
  scene.background = BORING_BG.clone();
  scene.fog = new Fog(scene.background, 15, 32);

  const camera = new PerspectiveCamera(34, 1, 0.1, 60);
  const camBase = new Vector3();
  const camTarget = new Vector3();

  const hemi = new HemisphereLight('#d6d2ff', '#3a3355', 1.3);
  scene.add(hemi);
  const sun = new DirectionalLight('#ffffff', 1.8);
  sun.position.set(4, 10, 7);
  if (SHADOWS) {
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
    sun.shadow.bias = -0.0008; sun.shadow.radius = 4;
  }
  scene.add(sun);
  const stageSpot = new SpotLight('#dfe6ff', 0, 14, 0.5, 0.6);
  stageSpot.position.set(-2, 7, 2);
  stageSpot.target.position.set(-5, 0.5, 0);
  scene.add(stageSpot, stageSpot.target);

  // ---------- shared geometry / materials ----------
  const torsoProfile = [[0, 0], [0.17, 0.02], [0.24, 0.1], [0.255, 0.22], [0.235, 0.36], [0.19, 0.48], [0.11, 0.56], [0, 0.59]].map(([x, y]) => new Vector2(x, y));
  const GEO = {
    head: new SphereGeometry(0.4, lo ? 20 : 32, lo ? 14 : 24),
    torso: new LatheGeometry(torsoProfile, lo ? 14 : 22),
    arm: new CapsuleGeometry(0.06, 0.24, 3, lo ? 6 : 10),
    hand: new SphereGeometry(0.085, 10, 8),
    leg: new CapsuleGeometry(0.085, 0.2, 3, lo ? 6 : 10),
    foot: new SphereGeometry(0.1, 10, 8),
    tie: new ConeGeometry(0.06, 0.24, 4),
    knot: new SphereGeometry(0.045, 8, 6),
    shadow: new CircleGeometry(0.45, 20),
  };
  const mats = {};
  const mat = (hex, opts = {}) => {
    const k = hex + JSON.stringify(opts);
    if (!mats[k]) mats[k] = new MeshStandardMaterial({ color: hex, roughness: 0.55, metalness: 0, ...opts });
    return mats[k];
  };
  const shadowMat = new MeshBasicMaterial({ map: radialTexture('rgba(0,0,0,0.38)'), transparent: true, depthWrite: false });
  const castAll = (o) => { if (SHADOWS) o.traverse(m => { if (m.isMesh) { m.castShadow = true; } }); return o; };

  // ---------- textures ----------
  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function radialTexture(inner) {
    const c = makeCanvas(64, 64), g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, inner); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }
  const HEAD_FONT = 'Archivo Black, "Arial Black", Arial, sans-serif';
  const redraws = [];
  function bubbleTexture(text, bg = '#C8F04B', fg = '#111', wide = false) {
    const W = wide ? 640 : 256, H = wide ? 260 : 192;
    const c = makeCanvas(W, H), g = c.getContext('2d');
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
    const draw = () => {
      g.clearRect(0, 0, W, H);
      const bh = H - 66;
      g.fillStyle = bg; g.strokeStyle = '#111'; g.lineWidth = 8;
      g.beginPath(); g.roundRect(10, 10, W - 20, bh, 44); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(70, bh + 6); g.lineTo(56, H - 6); g.lineTo(118, bh + 6); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(70, bh + 10); g.lineTo(56, H - 6); g.lineTo(118, bh + 10); g.stroke();
      g.fillStyle = bg; g.fillRect(66, bh - 2, 56, 14);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (text === '...') { [88, 128, 168].forEach(x => { g.beginPath(); g.arc(x, 72, 15, 0, Math.PI * 2); g.fill(); }); }
      else {
        const lines = text.split('\n');
        const size = wide ? (lines.length > 1 ? 50 : 56) : (text.length > 3 ? 60 : 84);
        g.font = `${size}px ${HEAD_FONT}`;
        lines.forEach((l, i) => g.fillText(l, W / 2, 10 + bh / 2 + (i - (lines.length - 1) / 2) * size * 1.12));
      }
      t.needsUpdate = true;
    };
    draw(); redraws.push(draw); return t;
  }
  function labelTexture(text) {
    const c = makeCanvas(512, 96), g = c.getContext('2d');
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
    const draw = () => {
      g.clearRect(0, 0, 512, 96);
      g.font = `38px ${HEAD_FONT}`;
      const w = Math.min(500, g.measureText(text).width + 56);
      g.fillStyle = '#111'; g.beginPath(); g.roundRect((512 - w) / 2, 8, w, 80, 40); g.fill();
      g.fillStyle = '#C8F04B'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 50);
      t.needsUpdate = true;
    };
    draw(); redraws.push(draw); return t;
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => redraws.forEach(d => d()));
  function zTexture() {
    const c = makeCanvas(128, 128), g = c.getContext('2d');
    g.fillStyle = '#d8d4ff'; g.font = 'bold 110px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Z', 64, 70);
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
  function screenTexture(bg, fg) {
    const c = makeCanvas(128, 80), g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 128, 80); g.fillStyle = fg;
    for (let i = 0; i < 6; i++) g.fillRect(10 + (i % 2) * 12, 10 + i * 11, 30 + ((i * 37) % 60), 5);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }
  const TEX = {
    z: zTexture(),
    dots: bubbleTexture('...'),
    haha: bubbleTexture('haha'),
    heart: bubbleTexture('♥', '#6FF2E3', '#F0357A'),
    huh: bubbleTexture('!?', '#ffffff'),
    wow: bubbleTexture('wow!', '#F06BE6'),
    cheers: bubbleTexture('cheers!', '#FFE45E', '#111', true),
    works: bubbleTexture('It works!!', '#6FF2E3', '#111', true),
    ahha: bubbleTexture('Ohh, I get it!', '#ffffff', '#111', true),
    action: bubbleTexture('And... action!', '#F06BE6', '#111', true),
    intro: bubbleTexture('Come, let me\nintroduce you!', '#C8F04B', '#111', true),
    meet: bubbleTexture("Oh, you've got to\nmeet this person!", '#FFE45E', '#111', true),
    incredible: bubbleTexture("What you're building\nis incredible!", '#6FF2E3', '#111', true),
    nice: bubbleTexture('So nice to\nmeet you!', '#F06BE6', '#111', true),
  };

  // ---------- character (white 3D figure) ----------
  const people = [];
  function makePerson(color, { tie = '#C8F04B', seated = false } = {}) {
    const root = new Group();
    const m = mat(color);
    const hips = new Group(); hips.position.y = 0.47; root.add(hips);
    const torso = new Mesh(GEO.torso, m); torso.scale.z = 0.85; hips.add(torso);
    const tieG = new Group(); tieG.position.set(0, 0.47, 0.165); hips.add(tieG);
    tieG.add(new Mesh(GEO.knot, mat(tie)));
    const tieM = new Mesh(GEO.tie, mat(tie)); tieM.rotation.x = Math.PI; tieM.position.y = -0.14; tieG.add(tieM);
    tieG.rotation.x = -0.22;
    const neck = new Group(); neck.position.y = 0.52; hips.add(neck);
    const head = new Mesh(GEO.head, m); head.position.y = 0.36; neck.add(head);
    const arm = (side) => {
      const g = new Group(); g.position.set(side * 0.23, 0.42, 0);
      const a = new Mesh(GEO.arm, m); a.position.y = -0.16; g.add(a);
      const hand = new Group(); hand.position.y = -0.34; g.add(hand);
      hand.add(new Mesh(GEO.hand, m));
      hips.add(g); g.userData.hand = hand; return g;
    };
    const leg = (side) => {
      const g = new Group(); g.position.set(side * 0.11, 0.47, 0);
      const l = new Mesh(GEO.leg, m); l.position.y = -0.2; g.add(l);
      const f = new Mesh(GEO.foot, m); f.scale.set(1, 0.6, 1.45); f.position.set(0, -0.4, 0.05); g.add(f);
      root.add(g); return g;
    };
    const armL = arm(-1), armR = arm(1), legL = leg(-1), legR = leg(1);
    const shadow = new Mesh(GEO.shadow, shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; root.add(shadow);
    if (seated) { root.position.y = 0; legL.rotation.x = legR.rotation.x = -1.4; }
    castAll(root); shadow.castShadow = false;
    shadow.visible = !SHADOWS && !seated;
    const p = { root, hips, neck, head, armL, armR, legL, legR, tieG, handL: armL.userData.hand, handR: armR.userData.hand, ph: Math.random() * 10, poke: -10, baseY: root.position.y, baseRotY: 0 };
    root.traverse(o => { o.userData.person = p; });
    people.push(p);
    return p;
  }
  function place(p, x, z, rotY) { p.root.position.x = x; p.root.position.z = z; p.root.rotation.y = rotY; p.baseRotY = rotY; return p; }
  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  function chair(color) {
    const g = new Group(); const m = mat(color, { roughness: 0.8 });
    const seat = new Mesh(new BoxGeometry(0.6, 0.08, 0.55), m); seat.position.y = 0.42; g.add(seat);
    const back = new Mesh(new BoxGeometry(0.6, 0.6, 0.07), m); back.position.set(0, 0.72, -0.26); g.add(back);
    const legGeo = new CylinderGeometry(0.03, 0.03, 0.42, 6);
    [[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.22], [0.25, 0.22]].forEach(([x, z]) => { const l = new Mesh(legGeo, m); l.position.set(x, 0.21, z); g.add(l); });
    return castAll(g);
  }
  function floor(color) {
    const f = new Mesh(new CircleGeometry(9, 56), mat(color, { roughness: 0.9 }));
    f.rotation.x = -Math.PI / 2; f.receiveShadow = SHADOWS; return f;
  }
  function label(text, x, y, z, w = 2.2) {
    const s = new Sprite(new SpriteMaterial({ map: labelTexture(text), transparent: true, depthWrite: false }));
    s.position.set(x, y, z); s.scale.set(w, w * 96 / 512, 1); s.userData.isLabel = true; return s;
  }

  // ======================= SCENE A: standard formats =======================
  const boring = new Group(); scene.add(boring);
  const A = { items: [], sleepers: [] };
  const addA = (o) => { boring.add(o); A.items.push(o); return o; };

  const floorA = addA(floor('#34304d')); floorA.position.y = 0.004;
  const stage = addA(castAll(new Mesh(new BoxGeometry(3.2, 0.5, 6.6), mat('#4a4566')))); stage.position.set(-5.2, 0.25, 0); stage.receiveShadow = SHADOWS;
  const screen = addA(new Mesh(new PlaneGeometry(5.4, 3), new MeshBasicMaterial({ map: slideTexture(), color: '#b9bacb' })));
  screen.position.set(-6.6, 2.7, 0); screen.rotation.y = Math.PI / 2;
  const table = addA(castAll(new Mesh(new BoxGeometry(0.7, 0.55, 3.8), mat('#5b5678')))); table.position.set(-4.3, 0.78, 0);
  const water = new CylinderGeometry(0.05, 0.05, 0.18, 8);
  [-1.2, 0, 1.2].forEach((z, i) => {
    const c = addA(chair('#3d3956')); c.position.set(-5.05, 0.5, z); c.rotation.y = Math.PI / 2;
    const p = makePerson('#cfcfd8', { tie: '#6b2f3a', seated: true });
    place(p, -5.05, z, Math.PI / 2); p.root.position.y += 0.5; p.baseY = p.root.position.y; addA(p.root);
    p.role = ['speaker', 'watch', 'slump'][i];
    const mic = addA(new Mesh(new CylinderGeometry(0.025, 0.025, 0.35, 6), mat('#222'))); mic.position.set(-4.15, 1.2, z + 0.28); mic.rotation.z = 0.5;
    const w = addA(new Mesh(water, mat('#a9c9ff', { transparent: true, opacity: 0.7 }))); w.position.set(-4.1, 1.14, z - 0.32);
  });
  const greys = ['#c4c4ce', '#cfcdd6', '#bcbfcc', '#d2d0d8', '#c6c4d0'];
  const ties = ['#6b2f3a', '#2f3a6b', '#4a4a4a', '#5a2f6b'];
  let n = 0;
  [-1.6, -0.2, 1.2, 2.6].forEach((x, row) => {
    [-2.6, -1.3, 0, 1.3, 2.6].forEach((z) => {
      const c = addA(chair('#45405e')); c.position.set(x, 0, z); c.rotation.y = -Math.PI / 2;
      const p = makePerson(greys[n % greys.length], { tie: ties[n % ties.length], seated: true });
      place(p, x, z, -Math.PI / 2); addA(p.root);
      const r = n % 5;
      p.role = r === 2 && row === 1 ? 'phone' : (r === 0 || r === 3 ? 'sleep' : (r === 4 ? 'lean' : 'droop'));
      if (row === 3 && z === 0) p.role = 'yawn';
      if (p.role === 'phone') {
        const ph = new Mesh(new BoxGeometry(0.14, 0.22, 0.02), mat('#9fd0ff', { emissive: '#4a7dbb' }));
        ph.rotation.x = -1.1; p.handR.add(ph); ph.position.set(-0.1, -0.02, 0.05);
      }
      if (p.role === 'sleep' || p.role === 'droop') A.sleepers.push(p);
      n++;
    });
  });
  const zs = [];
  for (let i = 0; i < 9; i++) {
    const s = new Sprite(new SpriteMaterial({ map: TEX.z, transparent: true, depthWrite: false }));
    s.scale.setScalar(0.35); boring.add(s); zs.push({ s, t: Math.random() * 3, who: A.sleepers[i % A.sleepers.length] });
  }

  // ======================= SCENE B: the Dialogue Co. way =======================
  const fun = new Group(); scene.add(fun);
  const B = { items: [] };
  const addB = (o) => { fun.add(o); B.items.push(o); return o; };
  const floorB = addB(floor('#6a43ff'));
  const ring = addB(new Mesh(new TorusGeometry(6.4, 0.06, 6, 90), mat('#C8F04B', { emissive: '#7da000' }))); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02;
  const WHITE = '#f4f4f6';
  const palette = ['#C8F04B', '#F06BE6', '#6FF2E3', '#FF9F43', '#FFE45E', '#9b7bff'];
  const person = (x, z, rot, role, tie) => { const p = makePerson(WHITE, { tie }); place(p, x, z, rot); addB(p.root); p.role = role; return p; };
  const box = (w, h, d, color, opts) => castAll(new Mesh(new BoxGeometry(w, h, d), mat(color, opts)));
  const cyl = (rt, rb, h, color, opts, seg = 16) => castAll(new Mesh(new CylinderGeometry(rt, rb, h, seg), mat(color, opts)));

  // --- Masterclass (hands-on): whiteboard, host, participants building + one at the board
  const MC = { x: -4.4, z: -1.0 };
  const board = addB(new Group()); board.position.set(MC.x - 0.6, 0, MC.z - 0.9); board.rotation.y = 0.75;
  const bFace = box(1.6, 1.0, 0.06, '#ffffff'); bFace.position.y = 1.45; board.add(bFace);
  const bFrame = box(1.7, 1.1, 0.04, '#111'); bFrame.position.set(0, 1.45, -0.03); board.add(bFrame);
  [-0.6, 0.6].forEach(x => { const l = cyl(0.03, 0.03, 0.95, '#111'); l.position.set(x, 0.47, 0); board.add(l); });
  [['#F06BE6', -0.3, 1.6, 0.5], ['#5B2EEF', 0.25, 1.35, 0.6], ['#C8F04B', -0.1, 1.2, 0.35]].forEach(([c, x, y, w]) => { const d = box(w, 0.06, 0.01, c); d.position.set(x, y, 0.04); board.add(d); });
  person(MC.x + 0.35, MC.z - 0.6, face(MC.x + 0.35, MC.z - 0.6, MC.x + 0.6, MC.z + 0.6), 'host', '#F0357A');
  const bx = MC.x - 0.6 + Math.sin(0.75) * 0.7, bz = MC.z - 0.9 + Math.cos(0.75) * 0.7;
  person(bx, bz, 0.75 + Math.PI, 'draw', '#111');
  const mt = addB(cyl(0.45, 0.45, 0.06, '#FF9F43')); mt.position.set(MC.x + 0.55, 0.9, MC.z + 0.55);
  const mtl = addB(cyl(0.05, 0.08, 0.88, '#111')); mtl.position.set(MC.x + 0.55, 0.44, MC.z + 0.55);
  [['#6FF2E3', 0.1, 0.1], ['#F06BE6', -0.12, -0.05], ['#FFE45E', 0.05, -0.18]].forEach(([c, dx, dz]) => { const b = addB(box(0.14, 0.14, 0.14, c)); b.position.set(MC.x + 0.55 + dx, 1.0, MC.z + 0.55 + dz); b.rotation.y = dx * 5; });
  person(MC.x + 0.05, MC.z + 1.15, face(MC.x + 0.05, MC.z + 1.15, MC.x + 0.55, MC.z + 0.55), 'build', '#5B2EEF');
  const mcB = person(MC.x + 1.3, MC.z + 1.1, face(MC.x + 1.3, MC.z + 1.1, MC.x + 0.55, MC.z + 0.55), 'handup', '#111');
  person(MC.x + 1.35, MC.z + 0.05, face(MC.x + 1.35, MC.z + 0.05, MC.x + 0.55, MC.z + 0.55), 'build', '#F0357A');
  addB(label('MASTERCLASS', MC.x, 2.55, MC.z));

  // --- Wine tasting
  const WT = { x: -3.9, z: 2.3 };
  const wt = addB(cyl(0.5, 0.5, 0.06, '#ffffff')); wt.position.set(WT.x, 0.95, WT.z);
  const wtl = addB(cyl(0.05, 0.12, 0.93, '#111')); wtl.position.set(WT.x, 0.47, WT.z);
  [[-0.12, 0.05, '#2f5d3a'], [0.12, -0.08, '#5b1a2c']].forEach(([dx, dz, c]) => {
    const b = addB(new Group()); b.position.set(WT.x + dx, 0.98, WT.z + dz);
    const body = cyl(0.07, 0.07, 0.3, c, { roughness: 0.2 }); body.position.y = 0.15; b.add(body);
    const nk = cyl(0.025, 0.04, 0.14, c, { roughness: 0.2 }); nk.position.y = 0.37; b.add(nk);
    const lb = cyl(0.072, 0.072, 0.1, '#f3e6c8', {}, 16); lb.position.y = 0.14; b.add(lb);
  });
  const glassMat = mat('#e8f4ff', { transparent: true, opacity: 0.55, roughness: 0.1, side: DoubleSide });
  const glass = () => {
    const g = new Group();
    const bowl = new Mesh(new CylinderGeometry(0.075, 0.035, 0.12, 12, 1, true), glassMat); bowl.position.y = 0.17; g.add(bowl);
    const wine = new Mesh(new CylinderGeometry(0.058, 0.035, 0.06, 12), mat('#8b1538', { roughness: 0.3 })); wine.position.y = 0.14; g.add(wine);
    const stem = new Mesh(new CylinderGeometry(0.01, 0.01, 0.11, 6), glassMat); stem.position.y = 0.06; g.add(stem);
    const base = new Mesh(new CylinderGeometry(0.045, 0.045, 0.01, 10), glassMat); g.add(base);
    g.position.set(0, 0, 0.07); g.rotation.x = Math.PI / 2;
    return g;
  };
  const wineFolk = [[-0.85, 0.3], [0.6, 0.75], [0.5, -0.75]].map(([dx, dz], i) => {
    const x = WT.x + dx, z = WT.z + dz;
    const p = person(x, z, face(x, z, WT.x, WT.z), 'wine', ['#8b1538', '#111', '#5B2EEF'][i]);
    const g = glass(); p.handR.add(g); p.glass = g;
    return p;
  });
  addB(label('WINE TASTING', WT.x, 2.35, WT.z));

  // --- Vibe coding hackathon
  const HK = { x: -0.4, z: -2.7 };
  const ht = addB(box(2.6, 0.07, 0.7, '#111', { roughness: 0.4 })); ht.position.set(HK.x, 0.82, HK.z);
  [-1.2, 1.2].forEach(dx => { const l = addB(box(0.06, 0.8, 0.6, '#111')); l.position.set(HK.x + dx, 0.4, HK.z); });
  const coders = [];
  [-0.85, 0, 0.85].forEach((dx, i) => {
    const lap = addB(new Group()); lap.position.set(HK.x + dx, 0.86, HK.z - 0.05);
    const base = box(0.5, 0.03, 0.34, '#d9d9e0', { metalness: 0.3, roughness: 0.3 }); lap.add(base);
    const scr = new Mesh(new BoxGeometry(0.5, 0.33, 0.02), mat('#222')); scr.position.set(0, 0.17, -0.17); scr.rotation.x = -0.25; lap.add(scr);
    const disp = new Mesh(new PlaneGeometry(0.46, 0.29), new MeshBasicMaterial({ map: screenTexture(['#111', '#1b1340', '#0f2a2a'][i], ['#C8F04B', '#F06BE6', '#6FF2E3'][i]) }));
    disp.position.set(0, 0, 0.011); scr.add(disp);
    coders.push(person(HK.x + dx, HK.z + 0.6, Math.PI, i === 1 ? 'celebrate' : 'type', ['#6FF2E3', '#C8F04B', '#F06BE6'][i]));
  });
  addB(label('VIBE CODING HACKATHON', HK.x, 2.3, HK.z - 0.3, 3.1));

  // --- Creators lab
  const CL = { x: 4.1, z: -1.6 };
  const creator = person(CL.x - 0.4, CL.z - 0.4, face(CL.x - 0.4, CL.z - 0.4, CL.x + 0.6, CL.z + 1.3), 'creator', '#F06BE6');
  const tripod = addB(new Group()); tripod.position.set(CL.x + 0.6, 0, CL.z + 1.3); tripod.rotation.y = face(CL.x + 0.6, CL.z + 1.3, CL.x - 0.4, CL.z - 0.4);
  [0, 2.1, 4.2].forEach(a => { const l = cyl(0.02, 0.02, 1.25, '#111', {}, 6); l.position.set(Math.sin(a) * 0.15, 0.6, Math.cos(a) * 0.15); l.rotation.set(Math.cos(a) * 0.15, 0, -Math.sin(a) * 0.15); tripod.add(l); });
  const cam = box(0.3, 0.2, 0.18, '#111', { roughness: 0.3 }); cam.position.y = 1.28; tripod.add(cam);
  const lens = cyl(0.07, 0.07, 0.12, '#333', {}, 12); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.28, 0.14); tripod.add(lens);
  const recDot = new Mesh(new SphereGeometry(0.025, 8, 6), new MeshBasicMaterial({ color: '#ff2d55' })); recDot.position.set(0.1, 1.4, 0.05); tripod.add(recDot);
  const ringLight = addB(new Group()); ringLight.position.set(CL.x + 1.0, 0, CL.z + 0.4); ringLight.rotation.y = face(CL.x + 1.0, CL.z + 0.4, CL.x - 0.4, CL.z - 0.4);
  const rl = new Mesh(new TorusGeometry(0.32, 0.05, 8, 32), new MeshBasicMaterial({ color: '#fff7d6' })); rl.position.y = 1.6; ringLight.add(rl);
  const rs = cyl(0.02, 0.02, 1.3, '#111', {}, 6); rs.position.y = 0.65; ringLight.add(rs);
  const filmer = person(CL.x + 1.05, CL.z + 1.05, face(CL.x + 1.05, CL.z + 1.05, CL.x - 0.4, CL.z - 0.4), 'film', '#111');
  const phone = new Mesh(new BoxGeometry(0.1, 0.18, 0.015), mat('#111')); phone.position.set(0.02, 0.0, 0.09); filmer.handR.add(phone);
  addB(label('CREATORS LAB', CL.x, 2.55, CL.z));

  // --- Networking: introductions
  const NW = { x: 1.0, z: 1.9 };
  const connector = person(NW.x - 0.35, NW.z + 0.1, face(NW.x - 0.35, NW.z + 0.1, NW.x + 0.7, NW.z - 0.25), 'connector', '#C8F04B');
  const guest = person(NW.x - 1.05, NW.z + 0.55, face(NW.x - 1.05, NW.z + 0.55, NW.x + 0.7, NW.z - 0.25), 'guest', '#111');
  const founder = person(NW.x + 0.7, NW.z - 0.25, face(NW.x + 0.7, NW.z - 0.25, NW.x - 0.6, NW.z + 0.3), 'talk', '#F0357A');
  const fan = person(NW.x + 2.4, NW.z + 0.6, face(NW.x + 2.4, NW.z + 0.6, NW.x + 3.3, NW.z - 0.1), 'talk', '#5B2EEF');
  person(NW.x + 3.3, NW.z - 0.1, face(NW.x + 3.3, NW.z - 0.1, NW.x + 2.4, NW.z + 0.6), 'proud', '#111');
  const friendA = person(NW.x - 1.4, NW.z - 1.5, face(NW.x - 1.4, NW.z - 1.5, NW.x - 0.5, NW.z - 1.7), 'talk', '#FF9F43');
  const friendB = person(NW.x - 0.5, NW.z - 1.7, face(NW.x - 0.5, NW.z - 1.7, NW.x - 1.4, NW.z - 1.5), 'talk', '#6FF2E3');
  person(NW.x + 1.9, NW.z - 1.9, 0.4, 'dance', '#FFE45E');

  // speech bubbles: a looping script
  const SCRIPT = [
    { who: connector, tex: TEX.intro, w: 1.9 },
    { who: coders[1], tex: TEX.works, w: 1.5 },
    { who: fan, tex: TEX.incredible, w: 2.0 },
    { who: wineFolk[1], tex: TEX.cheers, w: 1.4 },
    { who: friendA, tex: TEX.meet, w: 1.9 },
    { who: creator, tex: TEX.action, w: 1.6 },
    { who: guest, tex: TEX.nice, w: 1.6 },
    { who: mcB, tex: TEX.ahha, w: 1.6 },
    { who: friendB, tex: TEX.heart, w: 0.7 },
  ];
  const bubbles = [];
  const SLOTS = 3;
  for (let i = 0; i < SLOTS; i++) {
    const s = new Sprite(new SpriteMaterial({ map: TEX.dots, transparent: true, depthWrite: false, depthTest: false }));
    s.center.set(0.12, 0); s.scale.set(0, 0, 1); s.renderOrder = 10; fun.add(s); bubbles.push({ s, t: -i * 1.13, line: null, prevLife: 99 });
  }
  let scriptPos = 0;
  const pokeBubble = new Sprite(new SpriteMaterial({ map: TEX.huh, transparent: true, depthWrite: false, depthTest: false }));
  pokeBubble.center.set(0.2, 0); pokeBubble.scale.set(0, 0, 1); pokeBubble.renderOrder = 11; scene.add(pokeBubble);
  let pokeTarget = null, pokeT = 0;

  // confetti
  const CONF = lo ? 40 : 90;
  const conf = new InstancedMesh(new PlaneGeometry(0.08, 0.12), new MeshBasicMaterial({ side: DoubleSide }), CONF);
  const confData = [];
  const dummy = new Object3D();
  for (let i = 0; i < CONF; i++) {
    confData.push({ x: (Math.random() - 0.5) * 13, y: Math.random() * 6, z: (Math.random() - 0.5) * 9, s: 0.4 + Math.random() * 0.6, r: Math.random() * 6 });
    conf.setColorAt(i, new Color(palette[i % palette.length]));
  }
  addB(conf);

  // ---------- poses ----------
  const S = Math.sin, C = Math.cos, ab = Math.abs;
  function animBoring(p, t) {
    const q = t + p.ph;
    p.hips.scale.set(1, 1 + 0.03 * S(q * 1.3), 1);
    switch (p.role) {
      case 'sleep': p.neck.rotation.x = 0.7 + 0.08 * S(q * 0.9); p.neck.rotation.z = 0.15 * S(p.ph); p.hips.rotation.x = 0.12; p.armL.rotation.x = p.armR.rotation.x = -0.3; break;
      case 'droop': p.neck.rotation.z = 0.5 + 0.05 * S(q * 0.7); p.neck.rotation.x = 0.2; p.hips.rotation.x = -0.22; p.hips.rotation.z = 0.08; p.armL.rotation.z = -0.15; p.armR.rotation.z = 0.15; break;
      case 'lean': p.neck.rotation.x = 0.35; p.hips.rotation.x = 0.3; p.armL.rotation.x = p.armR.rotation.x = -1.1; p.armL.rotation.z = 0.45; p.armR.rotation.z = -0.45; break;
      case 'phone': p.neck.rotation.x = 0.55; p.hips.rotation.x = 0.15; p.armR.rotation.x = -1.2; p.armR.rotation.z = -0.35; p.armL.rotation.x = -0.4; break;
      case 'yawn': { const y = Math.max(0, S(q * 0.5)) ** 6; p.neck.rotation.x = 0.4 - y * 0.9; p.armL.rotation.x = -y * 2.7; p.armR.rotation.x = -y * 2.7; p.hips.rotation.x = -0.1 * y; break; }
      case 'speaker': p.armR.rotation.x = -0.9 + 0.25 * S(q * 1.4); p.armR.rotation.z = 0.2 * S(q * 0.7); p.neck.rotation.x = 0.05 * S(q * 2); p.armL.rotation.x = -0.6; break;
      case 'watch': { const w = S(q * 0.45) > 0.6; p.armL.rotation.x = w ? -1.35 : -0.5; p.armL.rotation.z = w ? 0.7 : 0; p.neck.rotation.x = w ? 0.45 : 0.1; p.armR.rotation.x = -0.5; break; }
      case 'slump': p.neck.rotation.x = 0.5; p.neck.rotation.z = -0.3; p.hips.rotation.x = -0.25; p.armL.rotation.x = p.armR.rotation.x = -0.4; break;
    }
    const since = t - p.poke;
    if (since < 1.6) { const k2 = 1 - since / 1.6; p.neck.rotation.x = -0.25 * k2 + p.neck.rotation.x * (1 - k2); p.neck.rotation.z *= 1 - k2; p.root.position.y = p.baseY + 0.25 * Math.max(0, S(since * 6)) * k2; }
    else p.root.position.y = p.baseY;
  }
  function animFun(p, t) {
    const q = t + p.ph;
    const tieFlap = (amp) => { p.tieG.rotation.z = amp * S(q * 9); p.tieG.rotation.x = -0.22 - amp * ab(S(q * 4.5)); };
    const walk = (amp, sp) => { p.legL.rotation.x = amp * S(q * sp); p.legR.rotation.x = -amp * S(q * sp); };
    let y = 0, spin = 0, lean = 0;
    p.armL.rotation.set(0, 0, -0.12); p.armR.rotation.set(0, 0, 0.12); p.neck.rotation.set(0, 0, 0); p.hips.rotation.set(0, 0, 0);
    p.legL.rotation.set(0, 0, 0); p.legR.rotation.set(0, 0, 0);
    switch (p.role) {
      case 'host': { const g = S(q * 1.6); p.armR.rotation.x = -1.3 - 0.3 * g; p.armR.rotation.z = 0.5; p.armL.rotation.x = -0.7 + 0.3 * S(q * 2.2); p.neck.rotation.y = 0.3 * g; p.neck.rotation.x = 0.08 * S(q * 3); y = 0.03 * ab(S(q * 3)); tieFlap(0.12); break; }
      case 'draw': p.armR.rotation.x = -1.9 + 0.2 * S(q * 5); p.armR.rotation.z = 0.25 * C(q * 5); p.armL.rotation.x = -0.3; p.neck.rotation.x = -0.15; p.hips.rotation.y = 0.1 * S(q * 2.5); tieFlap(0.08); break;
      case 'build': p.armL.rotation.x = -1.0 + 0.25 * S(q * 6); p.armR.rotation.x = -1.0 + 0.25 * S(q * 6 + 2); p.armL.rotation.z = 0.25; p.armR.rotation.z = -0.25; p.neck.rotation.x = 0.35 + 0.05 * S(q * 3); y = 0.03 * ab(S(q * 3)); tieFlap(0.1); break;
      case 'handup': { const up = 0.5 + 0.5 * S(q * 1.3); p.armR.rotation.x = -2.9 * up - 0.4; p.armR.rotation.z = 0.1 * S(q * 9) * up; p.armL.rotation.x = -0.9; p.neck.rotation.x = -0.15 * up; y = 0.18 * up * ab(S(q * 7)); tieFlap(0.25 * up); break; }
      case 'wine': {
        const cyc = (t % 6) / 6; const cheer = cyc > 0.7 ? S((cyc - 0.7) / 0.3 * Math.PI) : 0;
        p.armR.rotation.x = -1.35 - 0.8 * cheer + 0.05 * S(q * 4); p.armR.rotation.z = 0.12 * S(q * 4) - 0.2 * cheer;
        if (p.glass) p.glass.rotation.z = 0.25 * S(q * 4);
        p.armL.rotation.x = -0.25; p.neck.rotation.x = 0.1 - 0.25 * cheer; p.neck.rotation.z = 0.12 * S(q * 0.9);
        lean = 0.12 * cheer; y = 0.1 * cheer; tieFlap(0.1 + 0.2 * cheer); break; }
      case 'type': p.armL.rotation.x = -1.05 + 0.12 * S(q * 22); p.armR.rotation.x = -1.05 + 0.12 * S(q * 22 + 1.3); p.armL.rotation.z = 0.3; p.armR.rotation.z = -0.3; p.neck.rotation.x = 0.3 + 0.04 * S(q * 4); p.hips.rotation.z = 0.05 * S(q * 1.7); tieFlap(0.05); break;
      case 'celebrate': {
        const cyc = (t % 5) / 5; const yay = cyc > 0.55 ? Math.max(0, S((cyc - 0.55) / 0.45 * Math.PI)) : 0;
        p.armL.rotation.x = -1.05 + 0.12 * S(q * 22) * (1 - yay) - 1.9 * yay; p.armR.rotation.x = -1.05 + 0.12 * S(q * 22 + 1) * (1 - yay) - 1.9 * yay;
        p.armL.rotation.z = 0.3 - 0.7 * yay; p.armR.rotation.z = -0.3 + 0.7 * yay; p.neck.rotation.x = 0.3 * (1 - yay) - 0.3 * yay;
        y = 0.45 * yay * ab(S(q * 10)); tieFlap(0.05 + 0.5 * yay); break; }
      case 'creator': { p.armR.rotation.x = -1.5 + 0.5 * S(q * 3); p.armR.rotation.z = 0.6 + 0.3 * S(q * 6); p.armL.rotation.x = -0.9 + 0.4 * S(q * 2.3 + 1); p.armL.rotation.z = -0.4; p.neck.rotation.z = 0.15 * S(q * 2); p.neck.rotation.x = 0.08 * S(q * 4); y = 0.06 * ab(S(q * 3)); p.hips.rotation.z = 0.1 * S(q * 1.5); tieFlap(0.2); break; }
      case 'film': p.armR.rotation.x = -1.55; p.armR.rotation.z = -0.15; p.armL.rotation.x = -1.4; p.armL.rotation.z = 0.35; p.neck.rotation.x = 0.1; p.hips.rotation.y = 0.15 * S(q * 0.7); y = 0.02 * ab(S(q * 2)); tieFlap(0.05); break;
      case 'connector': p.armL.rotation.x = 0.9; p.armL.rotation.z = -0.5; p.armR.rotation.x = -1.4 + 0.25 * S(q * 3); p.armR.rotation.z = 0.35; p.neck.rotation.y = 0.5 * S(q * 0.8); y = 0.05 * ab(S(q * 4)); walk(0.25, 4); tieFlap(0.25); break;
      case 'guest': p.armR.rotation.x = -0.9; p.armR.rotation.z = 0.35; p.armL.rotation.x = -0.2 + 0.2 * S(q * 4); p.neck.rotation.x = -0.1; y = 0.05 * ab(S(q * 4 + 0.6)); walk(0.25, 4); tieFlap(0.2); break;
      case 'proud': p.armL.rotation.x = -0.4; p.armR.rotation.x = -1.0 + 0.2 * S(q * 2); p.armR.rotation.z = -0.5; p.hips.rotation.x = -0.12; p.neck.rotation.x = -0.15 + 0.08 * S(q * 2.5); y = 0.04 * ab(S(q * 2.5)); tieFlap(0.1); break;
      case 'talk': {
        const g = S(q * 2.2); p.armL.rotation.x = -0.6 - 0.6 * Math.max(0, g); p.armR.rotation.x = -0.6 - 0.6 * Math.max(0, -g); p.armL.rotation.z = -0.3; p.armR.rotation.z = 0.3;
        p.neck.rotation.x = 0.12 * S(q * 3.2); p.neck.rotation.z = 0.12 * S(q * 1.1);
        const laugh = Math.max(0, S(q * 0.7)) ** 12; y = 0.04 * ab(S(q * 2.2)) + 0.35 * laugh * ab(S(q * 9)); lean = -0.15 * laugh; tieFlap(0.15 + laugh * 0.4); break; }
      case 'dance': p.armL.rotation.x = -2.7 + 0.4 * S(q * 4); p.armR.rotation.x = -2.7 + 0.4 * S(q * 4 + Math.PI); p.armL.rotation.z = -0.3; p.armR.rotation.z = 0.3; p.hips.rotation.z = 0.25 * S(q * 4); y = 0.12 * ab(S(q * 4)); spin = t * 1.5; p.legL.rotation.z = -0.15 * ab(S(q * 4)); p.legR.rotation.z = 0.15 * ab(S(q * 4)); tieFlap(0.45); break;
    }
    if (lean) p.hips.rotation.x += lean;
    const sinceP = t - p.poke;
    if (sinceP < 1) { y += 0.8 * S(sinceP * Math.PI); spin += sinceP * Math.PI * 2; }
    p.root.position.y = p.baseY + y;
    p.root.rotation.y = p.baseRotY + spin;
  }
  people.forEach(p => { p.scene = boring.children.includes(p.root) ? 'A' : 'B'; });

  // ---------- mode switching ----------
  let mode = 0, prog = 1;
  const easeOutBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  [A, B].forEach(sc => sc.items.forEach(o => { o.userData.delay = (o === floorA || o === floorB || o === ring || o === conf) ? -0.25 : clamp01((o.position.x + 6.5) / 13) * 0.45 + Math.random() * 0.12; o.userData.baseScale = o.scale.clone(); }));
  const setS = (o, s) => o.scale.copy(o.userData.baseScale).multiplyScalar(s);
  function applyTransition() {
    const show = mode === 0 ? A : B, hide = mode === 0 ? B : A;
    const showG = mode === 0 ? boring : fun, hideG = mode === 0 ? fun : boring;
    showG.visible = true;
    show.items.forEach(o => setS(o, prog >= 1 ? 1 : Math.max(0.0001, easeOutBack(clamp01((prog * 1.4 - 0.35 - o.userData.delay) / 0.45)))));
    const out = clamp01(1 - prog * 2.6);
    hide.items.forEach(o => setS(o, Math.max(0.0001, out)));
    hideG.visible = out > 0.001;
    if (!hideG.visible) hide.items.forEach(o => setS(o, 1));
    const c = clamp01(prog * 1.5);
    scene.background.copy(mode === 1 ? BORING_BG : FUN_BG).lerp(mode === 1 ? FUN_BG : BORING_BG, c);
    scene.fog.color.copy(scene.background);
    const f = mode === 1 ? c : 1 - c;
    hemi.intensity = 1.3 + f * 0.5; sun.intensity = 1.8 + f * 0.5; stageSpot.intensity = (1 - f) * 40;
    hemi.color.set(f > 0.5 ? '#ffffff' : '#d6d2ff');
  }
  fun.visible = false;
  stageSpot.intensity = 40;

  const btns = hero.querySelectorAll('[data-mode]');
  const caption = hero.querySelector('.hero-caption');
  const captions = [
    'Standard formats: panels, slides, polite applause. Zzz.',
    'The Dialogue Co. way: masterclasses, tastings, labs and real introductions.',
  ];
  let autoplay = !reduced, autoTimer = 0;
  function setMode(m, user) {
    if (user) autoplay = false;
    if (m === mode) return;
    mode = m; prog = reduced ? 1 : 0;
    btns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.mode === m)));
    if (caption) caption.textContent = captions[m];
    hero.classList.toggle('mode-fun', m === 1);
    if (prog >= 1) applyTransition();
  }
  btns.forEach(b => b.addEventListener('click', () => setMode(+b.dataset.mode, true)));

  // ---------- interaction ----------
  const pointer = new Vector2(), look = new Vector2();
  const ray = new Raycaster();
  const ndc = (e) => { const r = canvas.getBoundingClientRect(); return new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  const pick = (e) => { ray.setFromCamera(ndc(e), camera); const h = ray.intersectObject(mode === 0 ? boring : fun, true).find(x => x.object.userData.person); return h && h.object.userData.person; };
  hero.addEventListener('pointermove', (e) => { pointer.copy(ndc(e)); });
  canvas.addEventListener('click', (e) => {
    const p = pick(e);
    if (p) { p.poke = clock; pokeTarget = p; pokeT = 0; pokeBubble.material.map = mode === 0 ? TEX.huh : TEX.wow; }
  });
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') canvas.style.cursor = pick(e) ? 'pointer' : ''; });

  // ---------- resize / visibility ----------
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = camera.aspect < 1;
    camera.fov = narrow ? 48 : 34;
    camBase.set(narrow ? 2.0 : 4.0, narrow ? 9.0 : 7.8, narrow ? 15 : 13.2);
    camTarget.set(narrow ? -0.6 : -0.6, narrow ? 0.6 : 2.3, 0);
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

    if (autoplay) { autoTimer += dt; if (autoTimer > (mode === 0 ? 4.5 : 10)) { autoTimer = 0; setMode(1 - mode, false); } }
    if (prog < 1) { prog = Math.min(1, prog + dt / 1.5); applyTransition(); }

    if (boring.visible) {
      people.forEach(p => p.scene === 'A' && animBoring(p, t));
      zs.forEach(z => {
        z.t += dt; const life = z.t % 3; const k2 = life / 3;
        if (life < dt * 1.5) z.who = A.sleepers[Math.floor(Math.random() * A.sleepers.length)];
        z.who.head.getWorldPosition(tmp);
        z.s.position.set(tmp.x + 0.3 + k2 * 0.4, tmp.y + 0.45 + k2 * 0.9, tmp.z + S(k2 * 6) * 0.1);
        z.s.material.opacity = S(k2 * Math.PI) * 0.9; z.s.scale.setScalar(0.2 + k2 * 0.3);
        z.s.visible = !(t - z.who.poke < 1.6);
      });
    }
    if (fun.visible) {
      people.forEach(p => p.scene === 'B' && animFun(p, t));
      recDot.visible = (t % 1) < 0.6;
      bubbles.forEach(b => {
        b.t += dt; const cyc = 3.4;
        if (b.t < 0) { b.s.scale.set(0, 0, 1); return; }
        const life = b.t % cyc;
        if (!b.line || life < b.prevLife) { b.line = SCRIPT[scriptPos % SCRIPT.length]; scriptPos++; b.s.material.map = b.line.tex; }
        b.prevLife = life;
        b.line.who.head.getWorldPosition(tmp);
        const sc = life < 0.35 ? easeOutBack(life / 0.35) : life > 2.7 ? Math.max(0, 1 - (life - 2.7) / 0.3) : 1;
        const w = b.line.w * (camera.aspect < 1 ? 1.5 : 1), h = b.line.tex.image.height / b.line.tex.image.width * w;
        b.s.position.set(tmp.x, tmp.y + 0.42, tmp.z); b.s.scale.set(w * sc, h * sc, 1);
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
      pokeBubble.position.set(tmp.x, tmp.y + 0.42, tmp.z); pokeBubble.scale.set(0.6 * sc, 0.45 * sc, 1);
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
