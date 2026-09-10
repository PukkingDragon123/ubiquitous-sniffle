// The opening. A grassland, two mechs, one game-breaking glitch and a duck.
// All speech is comic balloons (CZ.Comic); there is no dialogue box anywhere.
CZ.Cinematic = class Cinematic {
  constructor(game) {
    this.game = game;
    this.t = 0; this.done = false; this.shake = 0; this.flashT = 0; this.glitch = 0;
    this.said = {};
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ec9f0);
    this.scene.fog = new THREE.Fog(0xa9d8f2, 120, 460);
    this.camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.5, 700);
    this.sparks = []; this.pool = [];
    this.build();
    CZ.Comic.setCamera(this.camera);
  }

  mat(c, o = {}) { return new THREE.MeshToonMaterial({ color: c, ...o }); }

  build() {
    const S = this.scene;
    S.add(new THREE.HemisphereLight(0xcfe9ff, 0x4a7a30, 2.2));
    const sun = new THREE.DirectionalLight(0xfff3d8, 2.4);
    sun.position.set(-70, 90, 60); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 70; sc.bottom = -50; sc.far = 300;
    sun.shadow.bias = -0.0012;
    S.add(sun, sun.target);

    // ── sky: gradient, sun disc, blocky clouds ──
    const skyTex = CZ.Tex.custom('cine-sky2', 64, (g, N) => {
      const grd = g.createLinearGradient(0, 0, 0, N);
      grd.addColorStop(0, '#3f8fd0'); grd.addColorStop(0.55, '#8ec9f0'); grd.addColorStop(1, '#d8f0ff');
      g.fillStyle = grd; g.fillRect(0, 0, N, N);
    });
    const dome = new THREE.Mesh(new THREE.PlaneGeometry(2600, 900), new THREE.MeshBasicMaterial({ map: skyTex, depthWrite: false, fog: false }));
    dome.position.set(0, 200, -340); S.add(dome);
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(26, 20), new THREE.MeshBasicMaterial({ color: 0xfff6d0, fog: false }));
    sunDisc.position.set(-150, 190, -330); S.add(sunDisc);
    this.clouds = [];
    for (let i = 0; i < 26; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const puff = new THREE.Mesh(new THREE.BoxGeometry(CZ.rand(16, 34), CZ.rand(7, 13), 12),
          new THREE.MeshBasicMaterial({ color: k % 2 ? 0xffffff : 0xeaf6ff, fog: false }));
        puff.position.set(CZ.rand(-16, 16), CZ.rand(-3, 3), CZ.rand(-4, 4)); c.add(puff);
      }
      c.position.set(CZ.rand(-420, 420), CZ.rand(90, 170), CZ.rand(-300, -140));
      c.userData.drift = CZ.rand(1.2, 3.4); S.add(c); this.clouds.push(c);
    }

    // ── ground: rolling meadow ──
    const groundMat = new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('grass', 'meadow', 240, 240, 3) });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 700), groundMat);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; S.add(ground);
    for (let i = 0; i < 30; i++) {           // low hills so the horizon is not a ruler
      const r = CZ.rand(20, 70);
      const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), groundMat);
      hill.position.set(CZ.rand(-500, 500), -r * CZ.rand(0.55, 0.8), CZ.rand(-300, -70));
      hill.scale.y = CZ.rand(0.3, 0.6); hill.receiveShadow = true; S.add(hill);
    }
    // grass blades near the fight, instanced and waving
    const bladeGeo = new THREE.PlaneGeometry(0.5, 2.4);
    bladeGeo.translate(0, 1.2, 0);
    this.grass = new THREE.InstancedMesh(bladeGeo,
      new THREE.MeshToonMaterial({ color: 0x6db43f, side: THREE.DoubleSide }), 2600);
    const dummy = new THREE.Object3D(); this.grassPhase = [];
    for (let i = 0; i < 2600; i++) {
      dummy.position.set(CZ.rand(-130, 130), 0, CZ.rand(-70, 60));
      dummy.rotation.y = CZ.rand(0, Math.PI); dummy.scale.setScalar(CZ.rand(0.7, 1.6));
      dummy.updateMatrix(); this.grass.setMatrixAt(i, dummy.matrix);
      this.grassPhase.push({ x: dummy.position.x, z: dummy.position.z, ry: dummy.rotation.y, s: dummy.scale.x, p: CZ.rand(0, 6.3) });
    }
    this.grass.instanceMatrix.needsUpdate = true; S.add(this.grass);
    this.grassDummy = dummy;
    // trees and boulders
    for (let i = 0; i < 22; i++) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, CZ.rand(7, 12), 6), this.mat(0x6b4a2a));
      trunk.position.y = 5; trunk.castShadow = true; g.add(trunk);
      for (let k = 0; k < 3; k++) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(CZ.rand(8, 14), CZ.rand(5, 8), CZ.rand(8, 14)), this.mat(k % 2 ? 0x3f7c2a : 0x4f9636));
        leaf.position.set(CZ.rand(-2, 2), 11 + k * 3.5, CZ.rand(-2, 2)); leaf.castShadow = true; g.add(leaf);
      }
      g.position.set(CZ.rand(-330, 330), 0, CZ.rand(-220, -50)); g.scale.setScalar(CZ.rand(0.8, 2));
      S.add(g);
    }
    for (let i = 0; i < 26; i++) {
      const r = CZ.rand(1.2, 3.4);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), this.mat(0x8b8f96));
      rock.position.set(CZ.rand(-140, 140), r * 0.4, CZ.rand(-80, 50)); rock.castShadow = true; S.add(rock);
    }

    // ── the fighters ──
    this.blue = new CZ.Mech(S, { pal: 'mechBlue', glow: 0x9fd4ff, trim: 0xffd23f });
    this.red = new CZ.Mech(S, { pal: 'mechRed', glow: 0xffb0b8, trim: 0x2a2f38 });
    this.blue.root.position.set(-40, 0, 0);
    this.red.root.position.set(40, 0, 0); this.red.root.rotation.y = Math.PI;
    this.blue.onSpark = (x, y, z) => this.spark(x, y, z, 0x9fd4ff, 3, 10);
    this.red.onSpark = (x, y, z) => this.spark(x, y, z, 0xffb0b8, 3, 10);

    // the hole it clips through
    this.hole = new THREE.Mesh(new THREE.CircleGeometry(9, 7), new THREE.MeshBasicMaterial({ color: 0x0a1408 }));
    this.hole.rotation.x = -Math.PI / 2; this.hole.position.set(-40, 0.14, 0); this.hole.visible = false; S.add(this.hole);
    this.holeRing = new THREE.Mesh(new THREE.RingGeometry(9, 10.8, 7), new THREE.MeshBasicMaterial({ color: 0x39ff88, side: THREE.DoubleSide }));
    this.holeRing.rotation.x = -Math.PI / 2; this.holeRing.position.set(-40, 0.16, 0); this.holeRing.visible = false; S.add(this.holeRing);

    // ── the dev ──
    this.duck = this.makeDuck(); this.duck.visible = false; S.add(this.duck);
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(7, 17, 190, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff3c0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.beam.position.set(-40, 95, 0); S.add(this.beam);
    this.bolt = new THREE.Mesh(new THREE.BoxGeometry(2.6, 150, 2.6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.bolt.position.set(-40, 75, 0); this.bolt.visible = false; S.add(this.bolt);
    this.cheese = this.makeCheeseWheel(); this.cheese.visible = false; S.add(this.cheese);
  }

  makeDuck() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(10, 14, 10), this.mat(0xffd23f)); body.scale.set(1.3, 1, 1.15); body.castShadow = true; g.add(body);
    const head = new THREE.Group(); head.position.set(8, 9.5, 0); g.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(5.6, 12, 10), this.mat(0xffd23f)));
    const bill = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2, 4), this.mat(0xff8a1f)); bill.position.set(5, -1.3, 0); head.add(bill);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1.35, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.position.set(2.8, 1.6, s * 3.3); head.add(eye);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshBasicMaterial({ color: 0x140c06 }));
      pup.position.set(1.05, 0, 0); eye.add(pup);
    }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.8, 3.8), this.mat(0xffd23f)); tail.position.set(-9.5, 3.4, 0); tail.rotation.z = 0.5; g.add(tail);
    this.duckWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.6, 7), this.mat(0xf5c02f));
    this.duckWing.position.set(0, 1, 7); g.add(this.duckWing);
    const wingR = this.duckWing.clone(); wingR.position.z = -7; g.add(wingR);
    this.duckHalo = new THREE.Mesh(new THREE.TorusGeometry(8, 0.6, 6, 20), new THREE.MeshBasicMaterial({ color: 0xfff3c0 }));
    this.duckHalo.position.set(7, 18, 0); this.duckHalo.rotation.x = Math.PI / 2.3; g.add(this.duckHalo);
    g.add(new THREE.PointLight(0xfff3c0, 6, 140));
    g.scale.setScalar(1.5);
    return g;
  }

  makeCheeseWheel() {
    const g = new THREE.Group();
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 3.2, 20),
      new THREE.MeshToonMaterial({ map: CZ.Tex.get('cheese', 'stone') }));
    wheel.rotation.x = Math.PI / 2; wheel.castShadow = true; g.add(wheel); this.cheeseWheel = wheel;
    const rind = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.1, 0.6, 20), this.mat(0xe8892a));
    rind.rotation.x = Math.PI / 2; g.add(rind);
    for (const s of [-1.4, 1.4]) {
      const eye = new THREE.Mesh(new THREE.CircleGeometry(1.25, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.position.set(s, 0.7, 1.7); g.add(eye);
      const pup = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), new THREE.MeshBasicMaterial({ color: 0x140c06 }));
      pup.position.set(0, -0.45, 0.05); eye.add(pup);
    }
    g.position.set(-40, 4, 0);
    return g;
  }

  // ---------- helpers ----------
  spark(x, y, z, color, n = 16, spread = 28) {
    for (let i = 0; i < n; i++) {
      let p = this.pool.pop();
      if (!p) p = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), new THREE.MeshBasicMaterial({ color }));
      else p.material.color.set(color);
      p.position.set(x, y, z);
      p.userData = { vx: CZ.rand(-spread, spread), vy: CZ.rand(4, spread), vz: CZ.rand(-spread, spread), life: CZ.rand(0.3, 0.9) };
      p.scale.setScalar(CZ.rand(0.8, 2.4));
      this.scene.add(p); this.sparks.push(p);
    }
  }
  cam(pos, look, fov) {
    this.camera.position.set(pos[0], pos[1], pos[2]);
    this.camera.lookAt(look[0], look[1], look[2]);
    if (fov && this.camera.fov !== fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
  }
  camLerp(a, b, k, ease = 'inout') {
    const e = ease === 'out' ? 1 - Math.pow(1 - k, 3) : ease === 'in' ? k * k * k : k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const mix = (u, w) => [u[0] + (w[0] - u[0]) * e, u[1] + (w[1] - u[1]) * e, u[2] + (w[2] - u[2]) * e];
    this.cam(mix(a.pos, b.pos), mix(a.look, b.look), a.fov + (b.fov - a.fov) * e);
  }
  // Say a line once, as a balloon over a moving anchor.
  say(id, text, anchor, opts) {
    if (this.said[id]) return; this.said[id] = true;
    CZ.Comic.bubble(text, anchor, opts);
  }
  once(id, fn) { if (this.said[id]) return; this.said[id] = true; fn(); }
  headOf(m, dy = 0) { return () => { const v = new THREE.Vector3(); m.head.getWorldPosition(v); return [v.x, v.y + 7 + dy, v.z]; }; }

  // ---------- timeline ----------
  update(dt) {
    if (this.done) return;
    this.t += dt;
    const t = this.t, B = this.blue, R = this.red;
    const seg = (a, b) => CZ.clamp((t - a) / (b - a), 0, 1);
    for (const c of this.clouds) { c.position.x += c.userData.drift * dt; if (c.position.x > 460) c.position.x = -460; }
    // grass wave
    const d = this.grassDummy;
    for (let i = 0; i < this.grassPhase.length; i += 1) {
      const g = this.grassPhase[i];
      d.position.set(g.x, 0, g.z); d.rotation.set(Math.sin(t * 1.6 + g.p) * 0.22, g.ry, Math.sin(t * 2.1 + g.p) * 0.18);
      d.scale.setScalar(g.s); d.updateMatrix(); this.grass.setMatrixAt(i, d.matrix);
    }
    this.grass.instanceMatrix.needsUpdate = true;
    this.duckHalo.rotation.z += dt * 1.4;
    B.update(dt); R.update(dt);

    if (t < 2.6) {                                   // stare-down
      const k = seg(0, 2.6);
      B.idle(dt); R.idle(dt);
      this.say('a', 'LAST ONE STANDING.', this.headOf(R), { kind: 'shout', side: 1 });
      this.camLerp({ pos: [0, 40, 170], look: [0, 14, 0], fov: 46 }, { pos: [0, 22, 116], look: [0, 12, 0], fov: 42 }, k);
    } else if (t < 5.0) {                            // charge
      const k = seg(2.6, 5.0);
      B.root.position.x = -40 + k * 30; R.root.position.x = 40 - k * 30;
      B.walk(dt, 2.4); R.walk(dt, 2.4);
      B.setSaber(k > 0.25); R.setSaber(k > 0.25);
      B.setThrust(true); R.setThrust(true);
      CZ.Comic.speedLines(true);
      this.camLerp({ pos: [0, 20, 110], look: [0, 12, 0], fov: 42 }, { pos: [0, 11, 56], look: [0, 11, 0], fov: 36 }, k, 'in');
    } else if (t < 6.4) {                            // clash
      const k = seg(5.0, 6.4);
      CZ.Comic.speedLines(false);
      this.once('clash', () => {
        this.shake = 2; this.flashT = 0.2; CZ.Audio.sfx.bossHit(); CZ.Comic.flash();
        this.spark(0, 14, 0, 0xffffff, 46, 40);
        CZ.Comic.pow('KLANG!', [0, 14, 0], { kind: 'hit' });
      });
      B.root.position.x = -10 + Math.sin(t * 40) * 0.4; R.root.position.x = 10 - Math.sin(t * 40) * 0.4;
      B.swing(0.45); R.swing(0.45);
      B.setThrust(false); R.setThrust(false);
      if (Math.random() < 0.5) this.spark(0, 14, CZ.rand(-2, 2), 0xffe066, 4, 24);
      this.camLerp({ pos: [34, 20, 40], look: [0, 14, 0], fov: 34 }, { pos: [22, 16, 28], look: [0, 14, 0], fov: 30 }, k);
    } else if (t < 8.4) {                            // red tears an arm off
      const k = seg(6.4, 8.4);
      this.once('arm1', () => {
        this.shake = 1.8; CZ.Audio.sfx.poundLand(); CZ.Comic.flash();
        B.detach('armL', { vx: -22, vy: 20, vz: 4 });
        B.hit(-1);
        this.spark(-8, 13, 0, 0x9fd4ff, 40, 26);
        CZ.Comic.pow('WHAM!', [-6, 14, 0], { kind: 'hit' });
      });
      R.punch(Math.min(1, k * 3)); B.guard();
      B.root.position.x = -10 - k * 5;
      this.say('b', 'THAT WAS MY ARM.', this.headOf(B), { kind: 'say', life: 2 });
      this.camLerp({ pos: [-34, 22, 40], look: [-8, 13, 0], fov: 32 }, { pos: [-26, 17, 30], look: [-10, 12, 0], fov: 30 }, k);
    } else if (t < 10.0) {                           // blue answers
      const k = seg(8.4, 10.0);
      this.once('cut1', () => { this.shake = 1.2; CZ.Audio.sfx.laser(); this.spark(6, 15, 0, 0xffffff, 30, 24); CZ.Comic.pow('SHNK', [7, 15, 0], { kind: 'slash' }); });
      B.swing(Math.min(1, k * 2.2)); R.guard();
      this.camLerp({ pos: [26, 12, 40], look: [2, 14, 0], fov: 34 }, { pos: [16, 17, 30], look: [4, 13, 0], fov: 30 }, k);
    } else if (t < 12.4) {                           // red kicks blue across the field
      const k = seg(10.0, 12.4);
      this.once('kick', () => {
        this.shake = 2.2; CZ.Audio.sfx.bossHit(); CZ.Comic.flash();
        CZ.Comic.pow('THUD!!', [-14, 12, 0], { kind: 'hit' });
        B.detach('legL', { vx: -14, vy: 16, vz: -3 });
      });
      R.legs.R.hip.rotation.x = -1.5 + k * 0.8; R.legs.R.knee.rotation.x = 0.7;
      B.setSaber(false);
      B.root.position.x = -15 - k * 26;
      B.root.position.y = Math.sin(k * Math.PI) * 11;
      B.root.rotation.z = -k * 2.6;
      if (k > 0.9) { this.once('crash', () => { this.shake = 1.6; this.spark(-40, 4, 0, 0x8cc65b, 34, 22); CZ.Comic.pow('CRSSH', [-40, 8, 0], { kind: 'hit' }); }); }
      this.say('c', 'FINISH.', this.headOf(R), { kind: 'shout' });
      this.camLerp({ pos: [-8, 30, 96], look: [-18, 12, 0], fov: 42 }, { pos: [-52, 20, 66], look: [-40, 8, 0], fov: 40 }, k, 'out');
    } else if (t < 15.4) {                           // down, saber raised over it
      const k = seg(12.4, 15.4);
      B.root.rotation.z = 0; B.root.position.y = 0; B.root.position.x = -40;
      B.kneel(1); B.visor.material.color.setHex(Math.floor(t * 12) % 2 ? 0xff3355 : 0x551122);
      R.root.position.x = -40 + 20 - k * 4;
      if (k < 0.7) R.walk(dt, 1.2); else R.swing(0.05);
      R.setSaber(true);
      CZ.Comic.halftone(true);
      if (Math.random() < 0.3) this.spark(-40, 10, 2, 0xff8a1f, 2, 8);
      this.say('d', 'wait.', this.headOf(B, -2), { kind: 'small', life: 2.2 });
      this.camLerp({ pos: [-56, 20, 54], look: [-38, 10, 0], fov: 38 }, { pos: [-46, 11, 26], look: [-40, 8, 0], fov: 26 }, k);
    } else if (t < 17.8) {                           // the glitch
      const k = seg(15.4, 17.8);
      CZ.Comic.halftone(false);
      this.glitch = 1;
      this.once('clip', () => { CZ.Audio.sfx.noclip(); this.hole.visible = this.holeRing.visible = true; });
      B.root.position.y = -k * 30;
      B.root.position.x = -40 + Math.sin(t * 60) * 0.4 * (1 - k);
      B.body.traverse(o => { if (o.isMesh && o.material.wireframe !== undefined) o.material.wireframe = Math.floor(t * 18) % 2 === 0 && k < 0.8; });
      this.holeRing.scale.setScalar(1 + Math.sin(t * 18) * 0.07);
      if (Math.random() < 0.6) this.spark(-40, 2, 0, 0x39ff88, 3, 16);
      this.say('e', 'no collision.', [-40, 9, 0], { kind: 'small', life: 2.4 });
      this.camLerp({ pos: [-46, 11, 26], look: [-40, 8, 0], fov: 26 }, { pos: [-28, 8, 40], look: [-40, 3, 0], fov: 36 }, k);
    } else if (t < 19.4) {                           // swing at nothing
      const k = seg(17.8, 19.4);
      this.glitch = 0;
      B.root.visible = false;
      B.body.traverse(o => { if (o.isMesh && o.material.wireframe !== undefined) o.material.wireframe = false; });
      R.swing(Math.min(1, k * 2.4));
      this.once('whiff', () => { CZ.Comic.pow('WHFF', [-40, 8, 0], { kind: 'slash' }); this.spark(-40, 2, 0, 0x8cc65b, 20, 18); });
      R.head.rotation.y = k > 0.5 ? Math.sin((k - 0.5) * 18) * 0.7 : 0;
      this.camLerp({ pos: [-28, 8, 40], look: [-40, 3, 0], fov: 36 }, { pos: [-14, 22, 48], look: [-38, 11, 0], fov: 40 }, k);
    } else if (t < 21.2) {                           // reappear behind
      const k = seg(19.4, 21.2);
      this.once('back', () => {
        B.root.visible = true; B.root.position.set(-54, -10, 0); B.root.rotation.y = 0;
        B.kneel(0); this.spark(-54, 12, 0, 0x39ff88, 44, 30); CZ.Audio.sfx.dash();
        CZ.Comic.pow('CLIP!', [-54, 18, 0], { kind: 'glitch' });
      });
      B.root.position.y = -10 + k * 10;
      B.setSaber(k > 0.25); B.swing(0.1);
      R.head.rotation.y = Math.sin(t * 6) * 0.6;
      this.camLerp({ pos: [-14, 22, 48], look: [-44, 11, 0], fov: 40 }, { pos: [-74, 18, 40], look: [-46, 12, 0], fov: 34 }, k);
    } else if (t < 23.6) {                           // the cut
      const k = seg(21.2, 23.6);
      B.root.position.y = 0;
      B.swing(Math.min(1, k * 2.6));
      this.once('kill', () => {
        this.flashT = 0.35; this.shake = 2.4; CZ.Audio.sfx.bossDie(); CZ.Comic.flash('white');
        R.detach('armR', { vx: 24, vy: 22, vz: 6 });
        CZ.Comic.pow('KRAK!!', [-40, 16, 0], { kind: 'hit' });
        this.spark(-40, 15, 0, 0xffb0b8, 50, 34);
      });
      if (k > 0.25) this.once('behead', () => {
        const h = R.head; const wp = new THREE.Vector3(); h.getWorldPosition(wp);
        h.parent.remove(h); this.scene.add(h); h.position.copy(wp);
        this.flyingHead = { obj: h, vx: 16, vy: 26, rz: 8 };
        this.spark(wp.x, wp.y, wp.z, 0xffb0b8, 40, 30);
        CZ.Comic.pow('SHK!', [wp.x, wp.y + 4, wp.z], { kind: 'slash' });
      });
      if (this.flyingHead) {
        const f = this.flyingHead; f.vy -= 46 * dt;
        f.obj.position.x += f.vx * dt; f.obj.position.y += f.vy * dt; f.obj.rotation.z += f.rz * dt;
        if (f.obj.position.y < 1.6) { f.obj.position.y = 1.6; f.vy *= -0.3; f.vx *= 0.5; f.rz *= 0.4; }
      }
      if (k > 0.35) {
        R.body.rotation.z = CZ.damp(R.body.rotation.z, -1.5, 3, dt);
        R.body.position.y = CZ.damp(R.body.position.y, 3.5, 2.2, dt);
        if (Math.random() < 0.4) this.spark(-40, 9, 0, 0xff8a1f, 3, 12);
      }
      this.camLerp({ pos: [-74, 18, 40], look: [-46, 12, 0], fov: 34 }, { pos: [-66, 26, 62], look: [-40, 10, 0], fov: 42 }, k);
    } else if (t < 27.6) {                           // the dev descends
      const k = seg(23.6, 27.6);
      this.beam.material.opacity = Math.min(0.24, k * 0.5);
      this.hole.visible = this.holeRing.visible = false;
      this.duck.visible = true;
      this.duck.position.set(-40, 170 - k * 108, 0);
      this.duck.rotation.y = Math.PI + Math.sin(t) * 0.1;
      if (k > 0.45) this.say('f', 'NINE MONTHS ON THAT ARENA.', () => [this.duck.position.x + 6, this.duck.position.y + 22, 0], { kind: 'shout' });
      const dy = this.duck.position.y;
      this.camLerp({ pos: [-66, 26, 62], look: [-40, 20, 0], fov: 42 }, { pos: [-40, 46, 150], look: [-40, dy * 0.5 + 10, 0], fov: 46 }, k);
    } else if (t < 31.0) {                           // the curse
      const k = seg(27.6, 31.0);
      this.duck.position.y = 62 + Math.sin(t * 1.5) * 1.4;
      this.duckWing.rotation.x = -k * 1.5;
      this.once('boltA', () => {});
      if (k > 0.3 && k < 0.35) this.once('bolt', () => { this.bolt.visible = true; this.flashT = 0.45; this.shake = 2.4; CZ.Audio.sfx.thunder(); CZ.Comic.flash('white'); CZ.Comic.pow('ZAAP', [-40, 30, 0], { kind: 'glitch' }); });
      if (k > 0.34) {
        this.bolt.visible = Math.floor(t * 30) % 2 === 0 && k < 0.5;
        const s = Math.max(0.001, 1 - (k - 0.34) * 3.6);
        this.blue.root.scale.setScalar(s);
        if (k > 0.62) { this.blue.root.visible = false; this.cheese.visible = true; }
        if (Math.random() < 0.5) this.spark(-40, 8, 0, 0xffd23f, 4, 18);
      }
      if (k > 0.66) this.say('g', 'BE CHEESE.', () => [this.duck.position.x + 6, this.duck.position.y + 20, 0], { kind: 'shout' });
      this.camLerp({ pos: [-40, 46, 150], look: [-40, 40, 0], fov: 46 }, { pos: [-33, 12, 42], look: [-40, 7, 0], fov: 34 }, k);
    } else if (t < 34.4) {                           // left in the grass
      const k = seg(31.0, 34.4);
      this.duck.position.y = 62 + k * 110;
      this.beam.material.opacity = Math.max(0, 0.24 - k * 0.5);
      this.cheese.rotation.z = Math.sin(t * 3) * 0.16;
      this.cheese.position.y = 4 + Math.abs(Math.sin(t * 3)) * 0.5;
      if (k > 0.2) this.say('h', "I'LL BUILD MY OWN.", () => [this.cheese.position.x, this.cheese.position.y + 9, 0], { kind: 'say', life: 3 });
      this.camLerp({ pos: [-33, 12, 42], look: [-40, 7, 0], fov: 34 }, { pos: [-39, 7, 20], look: [-40, 4.6, 0], fov: 30 }, k);
    } else {
      this.finish();
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i], u = p.userData;
      u.life -= dt; u.vy -= 50 * dt;
      p.position.x += u.vx * dt; p.position.y += u.vy * dt; p.position.z += u.vz * dt;
      if (u.life <= 0 || p.position.y < 0) { this.scene.remove(p); this.sparks.splice(i, 1); this.pool.push(p); }
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3.2);
    if (this.flashT > 0) this.flashT -= dt;
    CZ.Comic.shakeFrame(this.shake > 0.6);
    if (this.shake > 0.01) {
      this.camera.position.x += CZ.rand(-1, 1) * this.shake;
      this.camera.position.y += CZ.rand(-1, 1) * this.shake;
    }
    CZ.UI.cineFx(this.flashT > 0 ? Math.min(1, this.flashT * 3) : 0, this.glitch);
    CZ.Comic.update(dt);
  }

  finish() {
    if (this.done) return;
    this.done = true;
    CZ.Comic.speedLines(false); CZ.Comic.halftone(false); CZ.Comic.shakeFrame(false); CZ.Comic.clearBubbles();
    this.onDone && this.onDone();
  }
  skip() { this.finish(); }
  dispose() {
    this.blue.dispose(); this.red.dispose();
    CZ.Effects.disposeTree(this.scene);
    for (const p of this.sparks) this.scene.remove(p);
    this.sparks.length = 0; this.pool.length = 0;
  }
};
