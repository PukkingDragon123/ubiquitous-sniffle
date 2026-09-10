// The opening: two mechs, one game-breaking glitch, and a rubber duck with opinions.
// Runs in its own scene with its own camera keyframes; the game renders it through
// the same pixel pipeline as everything else.
CZ.Cinematic = class Cinematic {
  constructor(game) {
    this.game = game;
    this.t = 0; this.done = false; this.shake = 0; this.flashT = 0; this.glitch = 0;
    this.caption = ''; this.captionKey = '';
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x120810);
    this.scene.fog = new THREE.Fog(0x4a1a22, 90, 320);
    this.camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.5, 400);
    this.sparks = []; this.sparkPool = [];
    this.build();
  }

  // ---------- construction ----------
  mat(c, o = {}) { return new THREE.MeshToonMaterial({ color: c, ...o }); }
  box(w, h, d, c, o = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mat(c, o));
    m.castShadow = true; return m;
  }

  build() {
    const S = this.scene;
    S.add(new THREE.HemisphereLight(0xffb0a0, 0x3a1420, 2.0));
    S.add(new THREE.AmbientLight(0x6a3040, 0.7));
    const key = new THREE.DirectionalLight(0xffd7c0, 2.6); key.position.set(-30, 50, 40);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 50; sc.bottom = -30; sc.far = 200;
    S.add(key, key.target);
    this.rim = new THREE.PointLight(0xff5577, 5, 260); this.rim.position.set(0, 40, -40); S.add(this.rim);
    // sky backdrop: dark at the top, burning at the horizon
    const sky = CZ.Tex.custom('cine-sky', 64, (g, S2) => {
      const grd = g.createLinearGradient(0, 0, 0, S2);
      grd.addColorStop(0, '#120810'); grd.addColorStop(0.55, '#3a1020'); grd.addColorStop(0.85, '#7a2418'); grd.addColorStop(1, '#c2461c');
      g.fillStyle = grd; g.fillRect(0, 0, S2, S2);
      g.fillStyle = '#0d0610';
      for (let i = 0; i < 26; i++) { const w = 3 + Math.random() * 9; g.fillRect(Math.random() * S2, S2 - 10 - Math.random() * 8, w, 12); }
    });
    const dome = new THREE.Mesh(new THREE.PlaneGeometry(2400, 900), new THREE.MeshBasicMaterial({ map: sky, depthWrite: false, fog: false }));
    dome.position.set(0, 180, -320); S.add(dome);

    // battlefield floor
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 300),
      new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('rock', 'magma', 300, 150, 8), color: 0xa08290 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; S.add(ground);
    this.ground = ground;
    // craters and rubble
    for (let i = 0; i < 70; i++) {
      const r = CZ.rand(1.5, 6);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.7, 0.6, 6), this.mat(0x3a2630));
      c.position.set(CZ.rand(-160, 160), 0.05, CZ.rand(-90, 60)); S.add(c);
      const rub = this.box(CZ.rand(1, 3), CZ.rand(1, 3), CZ.rand(1, 3), 0x4a3540);
      rub.position.set(CZ.rand(-150, 150), 0.8, CZ.rand(-80, 50)); rub.rotation.set(CZ.rand(3), CZ.rand(3), CZ.rand(3)); S.add(rub);
    }
    // burning wrecks + smoke columns on the horizon
    for (let i = 0; i < 9; i++) {
      const x = CZ.rand(-170, 170), z = CZ.rand(-120, -60);
      const wreck = this.box(CZ.rand(5, 12), CZ.rand(4, 9), 6, 0x2e2028);
      wreck.position.set(x, 3, z); wreck.rotation.z = CZ.rand(-0.5, 0.5); S.add(wreck);
      const fire = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 3), new THREE.MeshBasicMaterial({ color: 0xff7a1f }));
      fire.position.set(x, 7, z); S.add(fire);
      const light = new THREE.PointLight(0xff5a1f, 2.5, 60); light.position.set(x, 9, z); S.add(light);
      for (let k = 0; k < 7; k++) {
        const puff = new THREE.Mesh(new THREE.BoxGeometry(CZ.rand(5, 11), CZ.rand(5, 11), 5),
          new THREE.MeshBasicMaterial({ color: 0x3a2c34, transparent: true, opacity: 0.55 }));
        puff.position.set(x + CZ.rand(-6, 6), 12 + k * 7, z + CZ.rand(-5, 5));
        puff.userData.rise = CZ.rand(1.5, 4); S.add(puff);
        (this.smoke = this.smoke || []).push(puff);
      }
    }
    // stars / embers in the sky
    for (let i = 0; i < 120; i++) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xffb066 }));
      e.position.set(CZ.rand(-200, 200), CZ.rand(10, 110), CZ.rand(-160, -30)); S.add(e);
      (this.embers = this.embers || []).push(e);
    }

    this.blue = this.makeMech(0x3b7de0, 0x2a5bb0, 0x9fd4ff);
    this.red = this.makeMech(0xd93b4a, 0xa02533, 0xffb0b8);
    this.blue.root.position.set(-34, 0, 0);
    this.red.root.position.set(34, 0, 0); this.red.root.rotation.y = Math.PI;
    S.add(this.blue.root, this.red.root);

    // the hole the blue mech clips through
    this.hole = new THREE.Mesh(new THREE.CircleGeometry(7, 6), new THREE.MeshBasicMaterial({ color: 0x05030a }));
    this.hole.rotation.x = -Math.PI / 2; this.hole.position.set(0, 0.12, 0); this.hole.visible = false; S.add(this.hole);
    this.holeRing = new THREE.Mesh(new THREE.RingGeometry(7, 8.4, 6), new THREE.MeshBasicMaterial({ color: 0x39ff88, side: THREE.DoubleSide }));
    this.holeRing.rotation.x = -Math.PI / 2; this.holeRing.position.set(0, 0.14, 0); this.holeRing.visible = false; S.add(this.holeRing);

    // the severed head, kept aside until it is needed
    this.redHeadFlying = false;

    this.duck = this.makeDuck(); this.duck.visible = false; S.add(this.duck);
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(6, 15, 150, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.beam.position.set(-34, 75, 0); S.add(this.beam);
    this.bolt = new THREE.Mesh(new THREE.BoxGeometry(2.2, 120, 2.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.bolt.position.set(0, 60, 0); this.bolt.visible = false; S.add(this.bolt);

    this.cheese = this.makeCheese(); this.cheese.visible = false; S.add(this.cheese);
  }

  // A boxy gundam: torso, head with a visor, shoulders, arms, legs, thrusters, saber.
  makeMech(main, dark, glow) {
    const root = new THREE.Group();
    const body = new THREE.Group(); body.position.y = 9.4; root.add(body);
    const torso = this.box(6.4, 6.2, 4.2, main); body.add(torso);
    const chest = this.box(4.4, 1.6, 4.6, dark); chest.position.y = 1.9; body.add(chest);
    const core = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.5), new THREE.MeshBasicMaterial({ color: glow }));
    core.position.set(0, 0.4, 2.2); body.add(core);
    const skirt = this.box(6.0, 2.0, 4.0, dark); skirt.position.y = -3.6; body.add(skirt);

    const neck = this.box(1.6, 1.0, 1.6, dark); neck.position.y = 3.4; body.add(neck);
    const head = new THREE.Group(); head.position.y = 4.6; body.add(head);
    const skull = this.box(2.8, 2.4, 2.6, main); head.add(skull);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.4), new THREE.MeshBasicMaterial({ color: glow }));
    visor.position.set(0, 0.2, 1.4); head.add(visor);
    const crest = this.box(0.4, 1.5, 0.4, 0xffd23f); crest.position.set(0, 1.7, 0.9); head.add(crest);
    for (const s of [-1, 1]) { const horn = this.box(0.3, 0.9, 0.3, dark); horn.position.set(s * 1.2, 1.5, 0); head.add(horn); }

    const pack = this.box(4.0, 3.6, 1.6, dark); pack.position.set(0, 0.6, -2.8); body.add(pack);
    const thrusters = [];
    for (const s of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 2.4, 6), this.mat(0x2a2a30));
      t.position.set(s * 1.3, -1.6, -3.2); body.add(t);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4, 6), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.9 }));
      flame.position.set(s * 1.3, -4, -3.2); flame.rotation.x = Math.PI; flame.visible = false; body.add(flame);
      thrusters.push(flame);
    }

    const arms = [];
    for (const s of [-1, 1]) {
      const shoulder = new THREE.Group(); shoulder.position.set(s * 4.0, 1.6, 0); body.add(shoulder);
      const pad = this.box(2.6, 2.4, 3.4, main); pad.position.set(s * 0.6, 0.6, 0); shoulder.add(pad);
      const upper = this.box(1.7, 3.0, 1.7, dark); upper.position.y = -1.8; shoulder.add(upper);
      const elbow = new THREE.Group(); elbow.position.y = -3.3; shoulder.add(elbow);
      const fore = this.box(2.0, 3.2, 2.0, main); fore.position.y = -1.6; elbow.add(fore);
      const fist = this.box(1.8, 1.4, 1.8, dark); fist.position.y = -3.5; elbow.add(fist);
      arms.push({ shoulder, elbow, fist });
    }
    // beam saber in the right hand
    const saber = new THREE.Group(); saber.position.y = -4.2; arms[1].elbow.add(saber);
    const hilt = this.box(0.6, 1.8, 0.6, 0x2a2a30); saber.add(hilt);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.7, 12, 0.7), new THREE.MeshBasicMaterial({ color: glow }));
    blade.position.y = -6.8; saber.add(blade);
    const bladeCore = new THREE.Mesh(new THREE.BoxGeometry(0.3, 12.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    bladeCore.position.y = -6.8; saber.add(bladeCore);
    const saberLight = new THREE.PointLight(glow, 2.5, 40); saberLight.position.y = -6; saber.add(saberLight);
    blade.visible = bladeCore.visible = false; saberLight.intensity = 0;

    const legs = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * 1.9, -4.4, 0); body.add(hip);
      const thigh = this.box(2.4, 3.6, 2.4, main); thigh.position.y = -1.8; hip.add(thigh);
      const knee = new THREE.Group(); knee.position.y = -3.8; hip.add(knee);
      const shin = this.box(2.2, 3.8, 2.4, dark); shin.position.y = -1.9; knee.add(shin);
      const foot = this.box(2.8, 1.2, 4.2, main); foot.position.set(0, -4.2, 0.7); knee.add(foot);
      legs.push({ hip, knee });
    }
    return { root, body, head, skull, visor, arms, legs, saber, blade, bladeCore, saberLight, thrusters, core, crest, main, dark, glow };
  }

  makeDuck() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 9), this.mat(0xffd23f)); body.scale.set(1.25, 1, 1.1); g.add(body);
    const head = new THREE.Group(); head.position.set(7, 8.5, 0); g.add(head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(5.2, 12, 9), this.mat(0xffd23f)); head.add(skull);
    const bill = this.box(6, 1.8, 3.6, 0xff8a1f); bill.position.set(4.6, -1.2, 0); head.add(bill);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.position.set(2.6, 1.4, s * 3.1); head.add(eye);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 8), new THREE.MeshBasicMaterial({ color: 0x140c06 }));
      pup.position.set(1.0, 0, 0); eye.add(pup);
    }
    const tail = this.box(4, 3.4, 3.4, 0xffd23f); tail.position.set(-8.5, 3, 0); tail.rotation.z = 0.5; g.add(tail);
    const wingL = this.box(2, 5, 6.4, 0xf5c02f); wingL.position.set(0, 1, 6.4); g.add(wingL);
    const wingR = wingL.clone(); wingR.position.z = -6.4; g.add(wingR);
    this.duckWing = wingL;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(7, 0.55, 6, 18), new THREE.MeshBasicMaterial({ color: 0xfff0b0 }));
    halo.position.set(6, 16, 0); halo.rotation.x = Math.PI / 2.3; g.add(halo); this.duckHalo = halo;
    const light = new THREE.PointLight(0xfff0b0, 5, 120); light.position.y = 10; g.add(light);
    g.scale.setScalar(1.5);
    return g;
  }

  makeCheese() {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(-4, -4); shape.lineTo(4, -4); shape.lineTo(0, 4.6); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false });
    geo.translate(0, 0, -3);
    const m = new THREE.Mesh(geo, this.mat(0xffd23f)); m.castShadow = true; g.add(m);
    for (const s of [-1.4, 1.4]) {
      const eye = new THREE.Mesh(new THREE.CircleGeometry(1.5, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.position.set(s, 0.2, 3.05); g.add(eye);
      const pup = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12), new THREE.MeshBasicMaterial({ color: 0x140c06 }));
      pup.position.set(0, -0.5, 0.05); eye.add(pup);
    }
    g.position.set(0, 4.4, 0);
    return g;
  }

  // ---------- helpers ----------
  spark(x, y, z, color, n = 14, spread = 26) {
    for (let i = 0; i < n; i++) {
      let p = this.sparkPool.pop();
      if (!p) p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial({ color }));
      else p.material.color.set(color);
      p.position.set(x, y, z);
      p.userData = { vx: CZ.rand(-spread, spread), vy: CZ.rand(2, spread), vz: CZ.rand(-spread, spread), life: CZ.rand(0.3, 0.8) };
      p.scale.setScalar(CZ.rand(0.7, 2.0));
      this.scene.add(p); this.sparks.push(p);
    }
  }
  poseMech(m, pose, k) {
    const L = (a, b) => a + (b - a) * k;
    const p = pose;
    m.arms[0].shoulder.rotation.z = L(m.arms[0].shoulder.rotation.z, p.aL ?? 0, 1);
    m.arms[1].shoulder.rotation.z = L(m.arms[1].shoulder.rotation.z, p.aR ?? 0, 1);
    m.arms[0].elbow.rotation.z = p.eL ?? 0;
    m.arms[1].elbow.rotation.z = p.eR ?? 0;
    m.legs[0].hip.rotation.x = p.lL ?? 0;
    m.legs[1].hip.rotation.x = p.lR ?? 0;
    m.legs[0].knee.rotation.x = p.kL ?? 0;
    m.legs[1].knee.rotation.x = p.kR ?? 0;
    m.body.rotation.z = p.lean ?? 0;
    m.body.position.y = 9.4 + (p.crouch ?? 0);
  }
  runCycle(m, t, speed = 12) {
    const s = Math.sin(t * speed), c = Math.cos(t * speed);
    m.legs[0].hip.rotation.x = s * 0.8; m.legs[1].hip.rotation.x = -s * 0.8;
    m.legs[0].knee.rotation.x = Math.max(0, -s) * 1.0; m.legs[1].knee.rotation.x = Math.max(0, s) * 1.0;
    m.arms[0].shoulder.rotation.x = -s * 0.7; m.arms[1].shoulder.rotation.x = s * 0.7;
    m.body.position.y = 9.4 + Math.abs(c) * 0.5;
    m.body.rotation.z = s * 0.05;
  }
  saberOn(m, on) {
    m.blade.visible = m.bladeCore.visible = on; m.saberLight.intensity = on ? 2.5 : 0;
  }
  cam(pos, look, fov) {
    this.camera.position.set(pos[0], pos[1], pos[2]);
    this.camera.lookAt(look[0], look[1], look[2]);
    if (fov && this.camera.fov !== fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
  }
  // Ease between two camera setups.
  camLerp(a, b, k, ease = 'inout') {
    const e = ease === 'out' ? 1 - Math.pow(1 - k, 3) : ease === 'in' ? k * k * k : k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const mix = (u, v) => [u[0] + (v[0] - u[0]) * e, u[1] + (v[1] - u[1]) * e, u[2] + (v[2] - u[2]) * e];
    this.cam(mix(a.pos, b.pos), mix(a.look, b.look), a.fov + (b.fov - a.fov) * e);
  }
  say(text) { if (text !== this.captionKey) { this.captionKey = text; CZ.UI.cineCaption(text); } }

  // ---------- the timeline ----------
  update(dt) {
    if (this.done) return;
    this.t += dt;
    const t = this.t, B = this.blue, R = this.red;
    const seg = (a, b) => CZ.clamp((t - a) / (b - a), 0, 1);

    // ambience
    for (const s of this.smoke) { s.position.y += s.userData.rise * dt; if (s.position.y > 80) s.position.y = 12; }
    for (const e of this.embers) { e.position.y += dt * 3; if (e.position.y > 115) e.position.y = 10; }
    this.duckHalo.rotation.z += dt * 1.4;

    if (t < 2.6) {
      // ── establish ──
      this.say('ARENA 07  //  FINAL MATCH');
      this.camLerp({ pos: [0, 52, 190], look: [0, 14, 0], fov: 46 }, { pos: [0, 34, 132], look: [0, 12, 0], fov: 42 }, seg(0, 2.6));
      this.poseMech(B, {}, 1); this.poseMech(R, {}, 1);
    } else if (t < 5.2) {
      // ── charge ──
      const k = seg(2.6, 5.2);
      this.say('');
      B.root.position.x = -34 + k * 26; R.root.position.x = 34 - k * 26;
      this.runCycle(B, t); this.runCycle(R, t);
      this.saberOn(B, k > 0.3); this.saberOn(R, k > 0.3);
      for (const f of [...B.thrusters, ...R.thrusters]) { f.visible = true; f.scale.y = 0.7 + Math.sin(t * 30) * 0.3; }
      this.camLerp({ pos: [0, 26, 118], look: [0, 12, 0], fov: 42 }, { pos: [0, 13, 66], look: [0, 11, 0], fov: 38 }, k, 'in');
    } else if (t < 6.6) {
      // ── clash ──
      const k = seg(5.2, 6.6);
      if (k < 0.05) { this.shake = 1.6; this.flashT = 0.16; CZ.Audio.sfx.bossHit(); this.spark(0, 12, 0, 0xffffff, 40, 34); }
      B.root.position.x = -8 + Math.sin(t * 40) * 0.35; R.root.position.x = 8 - Math.sin(t * 40) * 0.35;
      this.poseMech(B, { aR: -1.15, eR: 0.55, aL: 0.5, lean: 0.14 }, 1);
      this.poseMech(R, { aR: -1.15, eR: 0.55, aL: 0.5, lean: 0.14 }, 1);
      if (Math.random() < 0.5) this.spark(0, 12, CZ.rand(-2, 2), 0xffe066, 4, 22);
      this.camLerp({ pos: [40, 20, 46], look: [0, 13, 0], fov: 34 }, { pos: [26, 16, 32], look: [0, 13, 0], fov: 30 }, k);
    } else if (t < 8.3) {
      // ── red lands a punch ──
      const k = seg(6.6, 8.3);
      if (k < 0.04) { this.shake = 1.2; CZ.Audio.sfx.poundLand(); this.spark(-5, 13, 0, 0xff8a1f, 26); }
      this.poseMech(R, { aR: -1.5 + k * 1.0, eR: 0.2, lean: -0.16 }, 1);
      this.poseMech(B, { aL: 0.5, lean: 0.3 + k * 0.1, crouch: -0.6 }, 1);
      B.root.position.x = -8 - k * 4;
      B.head.rotation.z = 0.3;
      this.camLerp({ pos: [-34, 22, 40], look: [-8, 13, 0], fov: 32 }, { pos: [-27, 18, 31], look: [-10, 12, 0], fov: 30 }, k);
    } else if (t < 10.0) {
      // ── blue answers ──
      const k = seg(8.3, 10.0);
      if (k < 0.04) { this.shake = 1.0; CZ.Audio.sfx.laser(); this.spark(4, 14, 0, 0x9fd4ff, 30); }
      B.head.rotation.z = 0;
      this.poseMech(B, { aR: -1.7 + k * 1.3, eR: 0.4, lean: -0.2 }, 1);
      this.poseMech(R, { aL: -1.6, lean: 0.22, crouch: -0.4 }, 1);
      this.camLerp({ pos: [24, 9, 44], look: [2, 13, 0], fov: 34 }, { pos: [16, 14, 33], look: [4, 13, 0], fov: 30 }, k);
    } else if (t < 12.2) {
      // ── red kicks blue across the field ──
      const k = seg(10.0, 12.2);
      if (k < 0.03) { this.shake = 1.8; CZ.Audio.sfx.bossHit(); }
      this.poseMech(R, { lL: -1.4, kL: 0.6, lean: -0.3 }, 1);
      B.root.position.x = -12 - k * 22;
      B.root.position.y = Math.sin(k * Math.PI) * 9;
      B.root.rotation.z = -k * 2.2;
      this.saberOn(B, false);
      if (k > 0.86) { B.root.rotation.z = -2.2 + (k - 0.86) * 12; if (k < 0.9) { this.shake = 1.5; this.spark(-34, 3, 0, 0xaaaaaa, 30); } }
      this.camLerp({ pos: [-8, 26, 84], look: [-16, 12, 0], fov: 42 }, { pos: [-44, 18, 62], look: [-34, 8, 0], fov: 40 }, k, 'out');
    } else if (t < 15.2) {
      // ── down, and about to be finished ──
      const k = seg(12.2, 15.2);
      this.say('SYSTEM CRITICAL  //  NO OUTS REMAINING');
      B.root.rotation.z = 0; B.root.position.y = 0; B.root.position.x = -34;
      this.poseMech(B, { crouch: -3.2, lL: -1.2, kL: 1.6, lean: 0.22, aL: 0.6 }, 1);
      B.visor.material.color.setHex(Math.floor(t * 12) % 2 ? 0xff3355 : 0x551122);
      R.root.position.x = -34 + 16 - k * 4;
      this.runCycle(R, t, k > 0.7 ? 0 : 5);
      this.poseMech(R, { aR: -0.4 - k * 1.3, eR: 0.2 }, 1);
      this.saberOn(R, true);
      if (Math.random() < 0.25) this.spark(-34, 9, 2, 0xff5a1f, 2, 8);
      this.camLerp({ pos: [-58, 20, 60], look: [-32, 10, 0], fov: 38 }, { pos: [-44, 11, 26], look: [-34, 8, 0], fov: 28 }, k);
    } else if (t < 17.6) {
      // ── the glitch: the floor has no collision ──
      const k = seg(15.2, 17.6);
      this.say('...the floor has no collision.');
      this.glitch = 1;
      if (k < 0.04) { CZ.Audio.sfx.noclip(); this.hole.visible = this.holeRing.visible = true; this.hole.position.x = -34; this.holeRing.position.x = -34; }
      B.root.position.y = -k * 26;
      B.root.position.x = -34 + Math.sin(t * 60) * 0.3 * (1 - k);
      B.body.traverse(o => { if (o.isMesh && o.material.wireframe !== undefined) o.material.wireframe = Math.floor(t * 18) % 2 === 0 && k < 0.8; });
      this.holeRing.scale.setScalar(1 + Math.sin(t * 18) * 0.06);
      if (Math.random() < 0.5) this.spark(-34, 2, 0, 0x39ff88, 3, 14);
      this.poseMech(R, { aR: -1.8, eR: 0.3 }, 1);
      this.camLerp({ pos: [-44, 11, 26], look: [-34, 8, 0], fov: 28 }, { pos: [-24, 7, 34], look: [-34, 3, 0], fov: 36 }, k);
    } else if (t < 19.4) {
      // ── red swings at nothing ──
      const k = seg(17.6, 19.4);
      this.glitch = 0;
      this.say('');
      B.root.visible = false;
      B.body.traverse(o => { if (o.isMesh && o.material.wireframe !== undefined) o.material.wireframe = false; });
      this.poseMech(R, { aR: -1.8 + k * 2.4, eR: 0.3, lean: -0.2 }, 1);
      if (k > 0.35 && k < 0.42) { this.shake = 0.9; this.spark(-34, 1, 0, 0xaaaaaa, 20); }
      R.head.rotation.y = k > 0.5 ? Math.sin((k - 0.5) * 18) * 0.7 : 0;
      this.camLerp({ pos: [-24, 7, 34], look: [-34, 3, 0], fov: 36 }, { pos: [-12, 20, 46], look: [-32, 10, 0], fov: 40 }, k);
    } else if (t < 21.4) {
      // ── reappear behind red ──
      const k = seg(19.4, 21.4);
      if (k < 0.05 && !B.root.visible) {
        B.root.visible = true; B.root.position.set(-46, 0, 0); B.root.rotation.y = 0;
        this.spark(-46, 10, 0, 0x39ff88, 40, 30); CZ.Audio.sfx.dash(); this.shake = 0.8;
      }
      B.root.position.y = -8 + k * 8;
      this.saberOn(B, k > 0.3);
      this.poseMech(B, { aR: -0.9, eR: 0.2, lean: -0.1 }, 1);
      R.head.rotation.y = Math.sin(t * 6) * 0.5;
      this.camLerp({ pos: [-12, 20, 46], look: [-38, 10, 0], fov: 40 }, { pos: [-72, 16, 40], look: [-42, 11, 0], fov: 34 }, k);
    } else if (t < 23.4) {
      // ── the cut ──
      const k = seg(21.4, 23.4);
      if (k < 0.04) { this.flashT = 0.3; this.shake = 2.0; CZ.Audio.sfx.bossDie(); }
      B.root.position.y = 0;
      this.poseMech(B, { aR: -1.7 + k * 2.6, eR: 0.1, lean: -0.25 }, 1);
      if (k > 0.12 && !this.redHeadFlying) {
        this.redHeadFlying = true;
        this.headVel = { x: 18, y: 26, rz: 9 };
        this.spark(-34, 14, 0, 0xff5a1f, 40, 30);
      }
      if (this.redHeadFlying) {
        const h = R.head;
        h.position.x += this.headVel.x * dt; h.position.y += this.headVel.y * dt;
        this.headVel.y -= 40 * dt; h.rotation.z += this.headVel.rz * dt;
      }
      if (k > 0.3) {
        R.body.rotation.z = CZ.damp(R.body.rotation.z, -1.4, 3, dt);
        R.body.position.y = CZ.damp(R.body.position.y, 3, 2.4, dt);
        if (Math.random() < 0.4) this.spark(-34, 8, 0, 0xff8a1f, 3, 12);
      }
      if (k > 0.55) this.say('MATCH INVALID  //  OPPONENT DELETED');
      this.camLerp({ pos: [-72, 16, 40], look: [-42, 11, 0], fov: 34 }, { pos: [-66, 24, 62], look: [-36, 10, 0], fov: 42 }, k);
    } else if (t < 28.0) {
      // ── the dev arrives ──
      const k = seg(23.4, 28.0);
      this.beam.material.opacity = Math.min(0.22, k * 0.5);
      this.hole.visible = this.holeRing.visible = false;
      this.duck.visible = true;
      this.duck.position.set(-34, 150 - k * 92, 0);
      this.duck.rotation.y = Math.PI + Math.sin(t) * 0.1;
      this.rim.color.setHex(0xffd27a);
      if (k > 0.35) this.say('DEV: Do you know how long that arena took me?');
      if (k > 0.72) this.say('DEV: Nine months. You beat it by falling out of it.');
      const dy = this.duck.position.y;
      this.camLerp({ pos: [-66, 24, 62], look: [-36, 22, 0], fov: 42 }, { pos: [-34, 40, 128], look: [-34, dy * 0.55 + 8, 0], fov: 46 }, k);
    } else if (t < 31.4) {
      // ── the curse ──
      const k = seg(28.0, 31.4);
      this.duck.position.y = 58 + Math.sin(t * 1.5) * 1.4;
      this.duckWing.rotation.x = -k * 1.4;
      if (k > 0.3 && k < 0.34) { this.bolt.visible = true; this.bolt.position.x = -34; this.flashT = 0.4; this.shake = 2.2; CZ.Audio.sfx.thunder(); }
      if (k > 0.34) {
        this.bolt.visible = Math.floor(t * 30) % 2 === 0 && k < 0.5;
        const s = Math.max(0.001, 1 - (k - 0.34) * 3.4);
        B.root.scale.setScalar(s);
        B.root.position.y = 0;
        if (k > 0.6) { B.root.visible = false; this.cheese.visible = true; this.cheese.position.x = -34; }
        if (Math.random() < 0.5) this.spark(-34, 6, 0, 0xffd23f, 4, 16);
      }
      if (k > 0.62) this.say('DEV: Be cheese. Think about what you did.');
      this.camLerp({ pos: [-34, 44, 132], look: [-34, 34, 0], fov: 46 }, { pos: [-27, 12, 40], look: [-34, 7, 0], fov: 34 }, k);
    } else if (t < 34.6) {
      // ── left in the dirt ──
      const k = seg(31.4, 34.6);
      this.duck.position.y = 58 + k * 90;
      this.beam.material.opacity = Math.max(0, 0.22 - k * 0.5);
      this.cheese.rotation.y = Math.sin(t * 2) * 0.25;
      this.cheese.position.y = 4.4 + Math.abs(Math.sin(t * 3)) * 0.4;
      if (k > 0.25) this.say('CHEESE: ...I am going to build a mech out of this.');
      this.camLerp({ pos: [-27, 12, 40], look: [-34, 7, 0], fov: 34 }, { pos: [-33, 7, 20], look: [-34, 4.8, 0], fov: 28 }, k);
    } else {
      this.finish();
    }

    // sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i], u = p.userData;
      u.life -= dt; u.vy -= 46 * dt;
      p.position.x += u.vx * dt; p.position.y += u.vy * dt; p.position.z += u.vz * dt;
      if (u.life <= 0 || p.position.y < 0) { this.scene.remove(p); this.sparks.splice(i, 1); this.sparkPool.push(p); }
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3.2);
    if (this.flashT > 0) this.flashT -= dt;
    if (this.shake > 0.01) {
      this.camera.position.x += CZ.rand(-1, 1) * this.shake;
      this.camera.position.y += CZ.rand(-1, 1) * this.shake;
    }
    CZ.UI.cineFx(this.flashT > 0 ? Math.min(1, this.flashT * 3) : 0, this.glitch);
  }

  finish() {
    if (this.done) return;
    this.done = true;
    CZ.UI.cineCaption('');
    this.onDone && this.onDone();
  }
  skip() { this.finish(); }

  dispose() {
    CZ.Effects.disposeTree(this.scene);
    for (const p of this.sparks) this.scene.remove(p);
    this.sparks.length = 0; this.sparkPool.length = 0;
  }
};
