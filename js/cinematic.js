// The opening. No mechs, no gods: a forgotten wheel of cheese on a cellar
// shelf, the mould arriving, and the decision to leave. Four short beats,
// skippable, and every line is a comic balloon.
CZ.Cinematic = class Cinematic {
  constructor(game) {
    this.game = game;
    this.t = 0; this.phaseT = 0; this.phase = 'shelf';
    this.done = false; this.said = {}; this.shake = 0; this.flashT = 0;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x140d0a);
    this.scene.fog = new THREE.Fog(0x1a1008, 18, 62);
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 200);
    this.camX = 0.5; this.camY = 4.6; this.camZ = 27;
    this.motes = []; this.puffs = []; this.pool = [];
    this.puffGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    this.build();
    CZ.Comic.setCamera(this.camera);
  }

  mat(c, o = {}) { return new THREE.MeshToonMaterial({ color: c, ...o }); }
  tex(pattern, pal, w, h, unit = 2) { return new THREE.MeshToonMaterial({ map: CZ.Tex.tiled(pattern, pal, w, h, unit) }); }

  build() {
    const S = this.scene;
    S.add(new THREE.HemisphereLight(0x8a6a3a, 0x1a1008, 1.15));
    const fill = new THREE.DirectionalLight(0xffd9a0, 0.55); fill.position.set(6, 10, 18); S.add(fill);
    const lamp = new THREE.PointLight(0xffc266, 40, 46);
    lamp.position.set(-1.4, 6.4, 3.2); lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024); S.add(lamp); this.lampLight = lamp;

    // ── the cellar corner ──
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 34), this.tex('brick', 'stone', 30, 17, 1.6));
    wall.position.set(0, 8, -6); wall.receiveShadow = true; S.add(wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 26), this.tex('brick', 'stone', 30, 13, 1.6));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -6.2, 4); floor.receiveShadow = true; S.add(floor);

    // the shelf the cheese has been left on, and the one above it
    for (const y of [0, 6.6]) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(26, 0.7, 5), this.tex('wood', 'timber', 13, 1));
      plank.position.set(0, y - 0.35, -2.6); plank.castShadow = true; plank.receiveShadow = true; S.add(plank);
      for (const x of [-9, 0, 9]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 7.4, 4.4), this.tex('wood', 'timber', 1, 4));
        post.position.set(x, y - 4, -3.2); post.castShadow = true; S.add(post);
      }
    }

    // neighbours on the shelf: one fine, one long gone
    this.neighbour = this.makeWheel(1.9, false); this.neighbour.position.set(-5.6, 1.9, -2.4); S.add(this.neighbour);
    this.rotted = this.makeWheel(2.1, true); this.rotted.position.set(5.4, 2.1, -2.4); S.add(this.rotted);

    // ── you ──
    this.hero = this.makeWheel(2.2, false, true);
    this.hero.position.set(0, 2.2, -1.6); S.add(this.hero);

    // the mould that is coming for you
    this.mould = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(CZ.rand(0.22, 0.5), 7),
        new THREE.MeshBasicMaterial({ color: CZ.pick([0x5c7a2a, 0x74963a, 0x3f5a1f]) }));
      const a = CZ.rand(-2.5, -0.6), r = CZ.rand(1.1, 1.9);
      m.position.set(Math.cos(a) * r, Math.sin(a) * r, 1.16);
      m.scale.setScalar(0.001); this.hero.add(m); this.mould.push(m);
    }

    // hanging lamp
    const cord = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5, 0.12), this.mat(0x2b2229));
    cord.position.set(-1.4, 9.4, 3.2); S.add(cord);
    this.lampShade = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.4, 8, 1, true),
      new THREE.MeshToonMaterial({ color: 0x4a3a2a, side: THREE.DoubleSide }));
    this.lampShade.position.set(-1.4, 6.9, 3.2); S.add(this.lampShade);
    this.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe6a8 }));
    this.bulb.position.set(-1.4, 6.3, 3.2); S.add(this.bulb);

    // dust in the lamplight
    const moteGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const moteMat = new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(moteGeo, moteMat);
      m.position.set(CZ.rand(-11, 11), CZ.rand(-6, 9), CZ.rand(-3, 5));
      S.add(m); this.motes.push({ m, s: CZ.rand(0.15, 0.5), p: CZ.rand(0, 6.3) });
    }

    // a cobweb in the corner and the door you are going to leave by
    const web = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({
      map: CZ.Tex.custom('cine-web', 32, (x, N) => {
        x.strokeStyle = '#e8e2d8'; x.lineWidth = 1;
        for (let i = 1; i <= 5; i++) { x.beginPath(); x.arc(N, N, i * 6, Math.PI, Math.PI * 1.5); x.stroke(); }
        for (let i = 0; i <= 5; i++) { x.beginPath(); x.moveTo(N, N); x.lineTo(N - Math.cos(i * 0.31) * N, N - Math.sin(i * 0.31) * N); x.stroke(); }
      }), transparent: true, opacity: 0.4, side: THREE.DoubleSide,
    }));
    web.position.set(9.6, 9.2, -4.6); this.scene.add(web);

    this.door = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.4, 10.4, 1), this.tex('wood', 'timber', 3, 5));
    frame.position.y = 5.2; this.door.add(frame);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.5), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    glow.position.set(0, 0.26, 0.6); this.door.add(glow); this.doorGlow = glow;
    this.door.add(new THREE.PointLight(0xffd27a, 8, 18));
    this.door.position.set(13, -6.2, -3); S.add(this.door);
  }

  // A cheese wheel: rind, holes, and - if it is you - a smile.
  makeWheel(r, rotten, eyes) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 1.05, 20),
      new THREE.MeshToonMaterial({ map: CZ.Tex.get('cheese', 'stone'), color: rotten ? 0x9aa86a : 0xffffff }));
    body.rotation.x = Math.PI / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
    const rind = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.04, r * 0.3, 20),
      this.mat(rotten ? 0x6c7a3a : 0xe8892a));
    rind.rotation.x = Math.PI / 2; g.add(rind);
    if (rotten) {
      for (let i = 0; i < 9; i++) {
        const p = new THREE.Mesh(new THREE.CircleGeometry(CZ.rand(0.2, 0.55), 7), new THREE.MeshBasicMaterial({ color: CZ.pick([0x4f6b24, 0x6f8c3a, 0x33471a]) }));
        const a = CZ.rand(0, 6.3), d = CZ.rand(0.2, r * 0.8);
        p.position.set(Math.cos(a) * d, Math.sin(a) * d, r * 0.54);
        g.add(p);
      }
    }
    if (eyes) {
      // The same face the game gives you: two dots and a smile.
      this.eyes = [];
      for (const ex of [-r * 0.34, r * 0.34]) {
        const dot = new THREE.Mesh(new THREE.CircleGeometry(r * 0.13, 14),
          new THREE.MeshBasicMaterial({ color: 0x22131a }));
        dot.position.set(ex, r * 0.44, r * 0.55);
        g.add(dot); this.eyes.push(dot);
      }
      this.blinkT = 1.6;
      const mouth = new THREE.Group(); mouth.position.set(0, -r * 0.04, r * 0.54); g.add(mouth);
      const lip = [];
      for (let i = 0; i < 11; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(r * 0.1, r * 0.1, 0.04),
          new THREE.MeshBasicMaterial({ color: 0x22131a }));
        mouth.add(m); lip.push(m);
      }
      this.smile = { mouth, lip, halfW: r * 0.56, curve: 0.16, r };
      this.setSmile(0.16);
    }
    return g;
  }

  // ---------- helpers ----------
  // A handful of little cubes thrown from a point, in this scene.
  puff(x, y, z, color, n = 10, spread = 5, up = 4) {
    for (let i = 0; i < n; i++) {
      const p = this.pool.pop() || new THREE.Mesh(this.puffGeo, new THREE.MeshBasicMaterial({ color }));
      p.material.color.set(color);
      p.position.set(x, y, z); p.scale.setScalar(CZ.rand(0.6, 1.6));
      p.userData = { vx: CZ.rand(-spread, spread), vy: CZ.rand(up * 0.2, up), vz: CZ.rand(-spread, spread) * 0.4, life: CZ.rand(0.4, 1.1), g: 26 };
      this.scene.add(p); this.puffs.push(p);
    }
  }
  stepPuffs(dt) {
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i], u = p.userData;
      u.life -= dt; u.vy -= u.g * dt;
      p.position.x += u.vx * dt; p.position.y += u.vy * dt; p.position.z += u.vz * dt;
      p.rotation.z += dt * 4;
      if (u.life <= 0) { this.scene.remove(p); this.puffs.splice(i, 1); this.pool.push(p); }
    }
  }
  cam(pos, look, fov) {
    this.camera.position.set(pos[0] + CZ.rand(-1, 1) * this.shake, pos[1] + CZ.rand(-1, 1) * this.shake, pos[2]);
    this.camera.lookAt(look[0], look[1], look[2]);
    if (fov && this.camera.fov !== fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
  }
  say(id, text, anchor, opts) {
    if (this.said[id]) return; this.said[id] = true;
    CZ.Comic.bubble(text, anchor, opts);
  }
  once(id, fn) { if (this.said[id]) return; this.said[id] = true; fn(); }
  heroAnchor(dy = 3.4, dx = 0) { return () => [this.hero.position.x + dx, this.hero.position.y + dy, this.hero.position.z]; }
  // Bend the cutscene smile. curve: + is a grin, - is a grimace. It is a line,
  // not a hole - the mouth never opens.
  setSmile(curve, wob = 0) {
    const S = this.smile; if (!S) return;
    S.curve = curve;
    const k = S.halfW * 2, N = S.lip.length;
    for (let i = 0; i < N; i++) {
      const u = (i / (N - 1)) * 2 - 1;
      const m = S.lip[i];
      m.position.set(u * S.halfW, (-curve * (1 - u * u) + Math.sin(this.t * 15 + i * 1.3) * wob) * k, 0);
      m.rotation.z = Math.atan2(2 * curve * u, 1.9);
      m.scale.set(1.25, 1.1, 1);
    }
  }
  // The cutscene has four beats and the mouth plays all of them: bored on the
  // shelf, appalled by the mould, wide open on the way down, set on the way out.
  faceBeat(dt) {
    if (!this.smile) return;
    const S = this.smile;
    let curve = 0.14, wob = 0, eOpen = 1, eSize = 1;
    if (this.phase === 'shelf') { curve = 0.13 + Math.sin(this.t * 1.4) * 0.02; eOpen = 0.7; }
    else if (this.phase === 'mould') { curve = -0.4; wob = 0.05; eSize = 1.35; }
    else if (this.phase === 'fall') { curve = -0.26; wob = 0.03; eSize = 1.3; }
    else if (this.phase === 'out') { curve = 0.52; eOpen = 0.4; eSize = 1.1; }
    // the dots blink and squint along with it
    if (this.eyes) {
      this.blinkT -= dt;
      if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3;
      if (this.blinkT < 0.11 && eOpen > 0.5) eOpen = 0.08;
      S.eo = CZ.damp(S.eo === undefined ? eOpen : S.eo, eOpen, 26, dt);
      S.es = CZ.damp(S.es === undefined ? eSize : S.es, eSize, 12, dt);
      for (const d of this.eyes) d.scale.set(S.es, S.es * S.eo, 1);
    }
    S.tc = CZ.damp(S.tc === undefined ? curve : S.tc, curve, 7, dt);
    S.tw = CZ.damp(S.tw === undefined ? wob : S.tw, wob, 7, dt);
    this.setSmile(S.tc, S.tw);
  }

  // ---------- timeline ----------
  update(dt) {
    if (this.done) return;
    dt = Math.min(dt, 1 / 45);
    this.t += dt; this.phaseT += dt;

    // lamp swing, dust drift, door glow
    const sw = Math.sin(this.t * 1.1) * 0.06;
    this.lampShade.rotation.z = sw; this.bulb.position.x = -1.4 + sw * 5.6;
    this.lampLight.position.x = this.bulb.position.x;
    this.lampLight.intensity = 26 * (0.92 + Math.sin(this.t * 7) * 0.05 + (Math.random() < 0.02 ? -0.25 : 0));
    for (const d of this.motes) {
      d.m.position.y += d.s * dt; d.m.position.x += Math.sin(this.t * 0.6 + d.p) * dt * 0.3;
      if (d.m.position.y > 9) d.m.position.y = -6;
    }
    this.doorGlow.material.opacity = 1;
    this.faceBeat(dt);

    if (this.phase === 'shelf') this.phaseShelf(dt);
    else if (this.phase === 'mould') this.phaseMould(dt);
    else if (this.phase === 'fall') this.phaseFall(dt);
    else if (this.phase === 'out') this.phaseOut(dt);

    this.stepPuffs(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 4);
    if (this.flashT > 0) this.flashT -= dt;
    CZ.UI.cineFx(this.flashT > 0 ? Math.min(1, this.flashT * 3) : 0, 0);
    CZ.Comic.update(dt);
  }

  // 1. left on a shelf, in the dark
  phaseShelf(dt) {
    const k = Math.min(1, this.phaseT / 3.2);
    this.hero.rotation.z = Math.sin(this.t * 1.4) * 0.03;
    this.camX = CZ.damp(this.camX, 0.6, 1.6, dt);
    this.camY = CZ.damp(this.camY, 3.2, 1.6, dt);
    this.camZ = CZ.damp(this.camZ, 19, 1.3, dt);
    this.cam([this.camX, this.camY, this.camZ], [0.4, 1.5, -2], 42 - k * 4);
    if (this.phaseT > 0.7) this.say('a', 'They forgot me down here.', this.heroAnchor(), { kind: 'say', life: 2.8 });
    if (this.phaseT > 3.4) { this.phase = 'mould'; this.phaseT = 0; }
  }

  // 2. the mould arrives
  phaseMould(dt) {
    const k = Math.min(1, this.phaseT / 2.6);
    for (let i = 0; i < this.mould.length; i++) {
      const s = CZ.clamp((k - i / this.mould.length * 0.8) * 2.4, 0.001, 1);
      this.mould[i].scale.setScalar(s);
    }
    if (Math.random() < 0.25) {
      this.puff(this.hero.position.x + CZ.rand(-1.6, 1.6), this.hero.position.y - 1.4, 1.4, 0x74963a, 1, 0.4, 0.6);
    }
    this.hero.rotation.z = Math.sin(this.t * 1.4) * 0.03 - k * 0.05;
    this.camX = CZ.damp(this.camX, 2.8, 2, dt);
    this.camY = CZ.damp(this.camY, 2.8, 2, dt);
    this.camZ = CZ.damp(this.camZ, 14.5, 1.8, dt);
    this.cam([this.camX, this.camY, this.camZ], [2.8, 1.7, -2.2], 38);
    if (this.phaseT > 0.6) this.say('b', 'That one rotted.', () => [this.rotted.position.x, this.rotted.position.y + 3.2, this.rotted.position.z], { kind: 'say', life: 2.4 });
    if (this.phaseT > 3.0) this.say('c', "I'M NEXT.", this.heroAnchor(3.6), { kind: 'shout', life: 2.2 });
    if (this.phaseT > 4.4) { this.phase = 'fall'; this.phaseT = 0; this.vy = 0; }
  }

  // 3. rock off the shelf and hit the floor
  phaseFall(dt) {
    const k = this.phaseT;
    const h = this.hero;
    if (k < 0.9) {                                   // rock harder and harder
      h.rotation.z = Math.sin(k * 22) * k * 0.35;
      h.position.x = Math.sin(k * 22) * k * 0.5;
    } else {
      this.once('tip', () => { CZ.Audio.sfx.jump(); });
      this.vy -= 34 * dt;
      h.position.y += this.vy * dt;
      h.position.x += 2.4 * dt;
      h.rotation.z -= 6 * dt;
      if (h.position.y <= -4.0) {
        h.position.y = -4.0;
        this.once('land', () => {
          this.shake = 0.5; this.flashT = 0.12; CZ.Audio.sfx.poundLand();
          this.puff(h.position.x, -5.4, 0, 0xffd23f, 18, 6, 5);
          this.puff(h.position.x, -2.6, 0, 0xe8d5b0, 16, 7, 5);
        });
        this.vy = 0;
        h.rotation.z -= 3 * dt;
        h.position.x += 3.2 * dt;
      }
    }
    this.camX = CZ.damp(this.camX, h.position.x + 1.2, 4, dt);
    this.camY = CZ.damp(this.camY, k < 0.9 ? 2.6 : -1.6, 3, dt);
    this.camZ = CZ.damp(this.camZ, 20, 2, dt);
    this.cam([this.camX, this.camY, this.camZ], [h.position.x, h.position.y + 0.4, -1], 40);
    if (k > 2.6) { this.phase = 'out'; this.phaseT = 0; }
  }

  // 4. the door, and the decision
  phaseOut(dt) {
    const k = this.phaseT;
    const h = this.hero;
    h.position.x += 3.6 * dt; h.rotation.z -= 1.6 * dt;
    this.camX = CZ.damp(this.camX, 8.6, 2, dt);
    this.camY = CZ.damp(this.camY, -0.6, 2, dt);
    this.camZ = CZ.damp(this.camZ, 25, 1.6, dt);
    this.cam([this.camX, this.camY, this.camZ], [9.4, -2.2, -2], 46);
    if (k > 0.5) this.say('d', 'Not today.', this.heroAnchor(3.2), { kind: 'shout', life: 2.4 });
    if (k > 3.0) this.finish();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    CZ.Comic.clearBubbles();
    this.onDone && this.onDone();
  }
  skip() { this.finish(); }
  dispose() {
    CZ.Effects.disposeTree(this.scene);
    this.puffs.length = 0; this.pool.length = 0;
  }
};
