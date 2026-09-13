// The main menu is not a colour, it is a place: a shelf in the wine cellar with
// you on it, three cheeses that are further along than you are, a rack of
// bottles, a lamp on a chain and dust going up through it. The camera drifts.
CZ.MenuScene = class MenuScene {
  constructor() {
    const E = CZ.Effects, T = CZ.Tex;
    this.t = 0;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x160d13);
    this.scene.fog = new THREE.Fog(0x1b1018, 22, 58);
    this.camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.1, 120);

    const mat = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, ...o });
    const tex = (p, pal, w, h) => new THREE.MeshToonMaterial({ map: T.tiled(p, pal, w, h) });
    const box = (w, h, d, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.castShadow = true; b.receiveShadow = true; return b; };

    this.scene.add(new THREE.HemisphereLight(0xffd9b0, 0x3a2030, 0.9));
    const key = new THREE.DirectionalLight(0xffe2bb, 1.5);
    key.position.set(6, 12, 12); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 12; sc.bottom = -10; sc.near = 1; sc.far = 50;
    this.scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x9a7fd0, 0.5); rim.position.set(-12, 6, -10); this.scene.add(rim);

    // ── the room ──
    const wall = box(60, 34, 1, tex('brick', 'cellar', 60, 34));
    wall.position.set(0, 8, -9); this.scene.add(wall);
    const floor = box(60, 2, 26, tex('brick', 'cellar', 60, 2));
    floor.position.set(0, -6.6, 0); this.scene.add(floor);

    // ── the shelf you are sitting on ──
    const shelf = new THREE.Group(); shelf.position.set(0, -1.6, 0); this.scene.add(shelf);
    const plank = box(40, 0.9, 6.4, tex('wood', 'timber', 40, 1));
    E.edges(plank); shelf.add(plank);
    const lip = box(40.2, 0.3, 0.5, mat(0xa06a34)); lip.position.set(0, 0.35, 3.2); shelf.add(lip);
    for (const x of [-15, -5, 5, 15]) {
      const post = box(1.1, 9, 1.1, tex('wood', 'timber', 1, 9));
      post.position.set(x, -5, -1.6); E.edges(post); shelf.add(post);
      const brace = box(0.7, 3.2, 0.7, mat(0x5c3618));
      brace.position.set(x + 1.4, -2.2, -1.4); brace.rotation.z = 0.6; shelf.add(brace);
    }
    // a second shelf above, out of the light
    const upper = box(40, 0.8, 5.6, tex('wood', 'timber', 40, 1));
    upper.position.set(0, 7.4, -1); this.scene.add(upper);

    // ── the other cheeses: older, greener, further along than you ──
    this.mould = [];
    // Further from the lamp, further gone. You are on the end, still yellow.
    // Spread wide, because the menu panel sits over the middle of the shelf:
    // what you see is the far ends of the row, down each side of it.
    const WHEELS = [
      { x: -14.2, r: 1.6, green: 1.0 },
      { x: -10.8, r: 1.85, green: 0.8 },
      { x: -7.4, r: 1.5, green: 0.55 },
      { x: 8.2, r: 1.5, green: 0.3 },
      { x: 11.4, r: 1.7, green: 0.15 },
    ];
    for (const w of WHEELS) this.scene.add(this.cheese(w.x, -1.15 + w.r, w.r, w.green));
    // ...and you, off to one side where the menu is not, the only one with a face
    this.heroY = -1.15 + 2.05;
    this.hero = this.cheese(14.6, this.heroY, 2.05, 0, true);
    this.hero.position.z = 1.6;
    this.scene.add(this.hero);

    // ── the wine ──
    for (const [rx, rz] of [[-19.5, -3.4], [19.5, -3.4]]) {
      const rack = new THREE.Group(); rack.position.set(rx, -3.2, rz); this.scene.add(rack);
      const frame = box(5.4, 7.4, 2.4, tex('wood', 'timber', 5, 7)); frame.position.y = 3.7;
      E.edges(frame); rack.add(frame);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.4, 8), mat(0x150d08));
        hole.rotation.x = Math.PI / 2; hole.position.set(-1.6 + c * 1.6, 1.5 + r * 2.1, 1.25); rack.add(hole);
        const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.34, 8), mat((r + c) % 2 ? 0x6b2436 : 0x3f5a2a));
        cork.rotation.x = Math.PI / 2; cork.position.set(-1.6 + c * 1.6, 1.5 + r * 2.1, 1.4); rack.add(cork);
      }
    }
    for (const [bx, bz] of [[-16.6, 2.2], [17.2, 2.0], [-17.8, 1.4]]) {
      const b = new THREE.Group(); b.position.set(bx, -5.6, bz); b.rotation.z = CZ.rand(-0.1, 0.1); this.scene.add(b);
      const part = (g, m, y) => { const p = new THREE.Mesh(g, m); p.position.y = y; p.castShadow = true; b.add(p); };
      part(new THREE.CylinderGeometry(0.5, 0.5, 1.9, 9), mat(0x2f5a34), 0.95);
      part(new THREE.CylinderGeometry(0.18, 0.26, 1.3, 9), mat(0x2f5a34), 2.5);
      part(new THREE.CylinderGeometry(0.52, 0.52, 0.8, 9), mat(0xe8dcc0), 1.0);
    }

    // ── the lamp, and everything it does to the room ──
    this.lamp = new THREE.Group(); this.lamp.position.set(-11.5, 12.5, 3.4); this.scene.add(this.lamp);
    const chain = box(0.16, 6, 0.16, mat(0x3b3038)); chain.position.y = 3; this.lamp.add(chain);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.5, 9, 1, true), new THREE.MeshToonMaterial({ color: 0x4a3a2a, side: THREE.DoubleSide }));
    shade.position.y = -0.4; this.lamp.add(shade);
    this.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.46, 9, 7), new THREE.MeshBasicMaterial({ color: 0xffe6a8 }));
    this.bulb.position.y = -1.2; this.lamp.add(this.bulb);
    this.lampLight = new THREE.PointLight(0xffc266, 90, 34); this.lampLight.position.y = -1.8; this.lamp.add(this.lampLight);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), new THREE.MeshBasicMaterial({
      color: 0xffc266, transparent: true, opacity: 0.15, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.y = -1.2; this.lamp.add(halo);

    // ── dust ──
    this.motes = [];
    const mg = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    const mm = new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 110; i++) {
      const m = new THREE.Mesh(mg, mm);
      m.position.set(CZ.rand(-18, 18), CZ.rand(-7, 11), CZ.rand(-6, 6));
      this.scene.add(m);
      this.motes.push({ m, s: CZ.rand(0.22, 0.8), p: CZ.rand(0, 6.3) });
    }
  }

  // One wheel. `green` is how far gone it is; `face` is whether it is you.
  cheese(x, y, r, green, face) {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    const rot = CZ.rand(-0.09, 0.09);
    g.rotation.z = rot;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 1.05, 22),
      new THREE.MeshToonMaterial({ map: CZ.Tex.get('cheese', 'stone'),
        color: new THREE.Color(0xffffff).lerp(new THREE.Color(0x9aa86a), green) }));
    body.rotation.x = Math.PI / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
    const rind = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.04, r * 0.3, 22),
      new THREE.MeshToonMaterial({ color: new THREE.Color(0xe8892a).lerp(new THREE.Color(0x6c7a3a), green) }));
    rind.rotation.x = Math.PI / 2; g.add(rind);
    // mould, spreading up from the bottom of the ones that have given up
    for (let i = 0; i < Math.round(green * 11); i++) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(CZ.rand(0.18, 0.5) * r * 0.6, 7),
        new THREE.MeshBasicMaterial({ color: CZ.pick([0x4f6b24, 0x6f8c3a, 0x33471a]) }));
      const a = CZ.rand(3.6, 5.8), d = CZ.rand(0.1, r * 0.82);
      p.position.set(Math.cos(a) * d, Math.sin(a) * d, r * 0.54);
      g.add(p);
    }
    if (!face) return g;
    // Two dots and a smile, same as in the game.
    const ink = new THREE.MeshBasicMaterial({ color: 0x22131a });
    this.eyes = [];
    for (const ex of [-r * 0.32, r * 0.32]) {
      const dot = new THREE.Mesh(new THREE.CircleGeometry(r * 0.13, 14), ink);
      dot.position.set(ex, r * 0.3, r * 0.55); g.add(dot); this.eyes.push(dot);
    }
    this.lip = [];
    for (let i = 0; i < 11; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(r * 0.1, r * 0.1, 0.05), ink);
      g.add(m); this.lip.push(m);
    }
    this.smileW = r * 0.5; this.smileK = r;
    this.blinkT = 2;
    return g;
  }

  setSmile(curve) {
    if (!this.lip) return;
    const N = this.lip.length;
    for (let i = 0; i < N; i++) {
      const u = (i / (N - 1)) * 2 - 1, m = this.lip[i];
      m.position.set(u * this.smileW, -curve * (1 - u * u) * this.smileK - this.smileK * 0.06, this.smileK * 0.55);
      m.rotation.z = Math.atan2(2 * curve * u, 1.7);
    }
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    // the camera drifts across the shelf and never quite settles
    const cx = Math.sin(t * 0.11) * 2.4, cy = 3.0 + Math.sin(t * 0.17 + 1) * 0.5;
    this.camera.position.set(cx, cy, 36 + Math.sin(t * 0.09) * 1.6);
    this.camera.lookAt(cx * 0.4, 1.2, 0);
    // the lamp swings, and the light swings with it
    this.lamp.rotation.z = Math.sin(t * 0.7) * 0.08;
    const f = 0.9 + Math.sin(t * 6.5) * 0.06 + (Math.random() < 0.015 ? -0.28 : 0);
    this.lampLight.intensity = 90 * f;
    this.bulb.scale.setScalar(f);
    // you breathe, you blink, and you are the only one still smiling
    this.hero.position.y = this.heroY + Math.sin(t * 1.6) * 0.07;
    this.hero.rotation.z = Math.sin(t * 0.9) * 0.035;
    this.blinkT -= dt;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3.4;
    const open = this.blinkT < 0.12 ? 0.1 : 1;
    for (const d of this.eyes) d.scale.y = CZ.damp(d.scale.y, open, 30, dt);
    this.setSmile(0.26 + Math.sin(t * 1.1) * 0.03);
    for (const d of this.motes) {
      d.m.position.y += d.s * dt;
      d.m.position.x += Math.sin(t * 0.5 + d.p) * dt * 0.3;
      if (d.m.position.y > 11) d.m.position.y = -7;
    }
  }

  dispose() {
    CZ.Effects.disposeTree(this.scene);
    this.scene.traverse(o => { if (o.isMesh && o.material && o.material.dispose) o.material.dispose(); });
  }
};
