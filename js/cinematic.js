// The opening is a fight you actually play: two ragdoll mechs on a grassland.
// Hover height of the dev duck - low enough that it shares the frame with the mech.
const DUCK_Y = 34;

// Win or lose, it ends the same way - with a duck and a curse.
CZ.Cinematic = class Cinematic {
  constructor(game) {
    this.game = game;
    this.t = 0; this.phaseT = 0; this.phase = 'ready';
    this.done = false; this.shake = 0; this.flashT = 0; this.glitch = 0;
    this.said = {};
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ec9f0);
    this.scene.fog = new THREE.Fog(0xa9d8f2, 140, 480);
    this.camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.5, 700);
    this.sparks = []; this.pool = [];
    this.build();
    this.spawnFighters();
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
    const bladeGeo = new THREE.PlaneGeometry(0.5, 1.5);
    bladeGeo.translate(0, 0.75, 0);
    this.grass = new THREE.InstancedMesh(bladeGeo,
      new THREE.MeshToonMaterial({ color: 0x6db43f, side: THREE.DoubleSide }), 2600);
    const dummy = new THREE.Object3D(); this.grassPhase = [];
    for (let i = 0; i < 2600; i++) {
      dummy.position.set(CZ.rand(-150, 150), 0, CZ.rand(-80, -4));
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

    // ── the dev ──
    this.duck = this.makeDuck(); this.duck.visible = false; S.add(this.duck);
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(6, 16, 120, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff3c0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.beam.position.set(-40, 60, 0); S.add(this.beam);
    this.bolt = new THREE.Mesh(new THREE.BoxGeometry(2.6, 42, 2.6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.bolt.position.set(-40, 21, 0); this.bolt.visible = false; S.add(this.bolt);
    this.cheese = this.makeCheeseWheel(); this.cheese.visible = false; S.add(this.cheese);
  }


  spawnFighters() {
    this.blue = new CZ.RagMech(this.scene, { pal: 'mechBlue', glow: 0x9fd4ff, trim: 0xffd23f, x: -17, facing: 1 });
    this.red = new CZ.RagMech(this.scene, { pal: 'mechRed', glow: 0xffb0b8, trim: 0x2a2f38, x: 17, facing: -1 });
    this.blue.setSaber(false); this.red.setSaber(false);
    this.blueHp = 3; this.redHp = 3;
    this.swingT = 0; this.swingCd = 0;
    this.aiT = 1.8; this.aiState = 'approach';
    this.hitCd = 0; this.aiHitCd = 0;
  }

  // ---------- helpers ----------
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
    g.scale.setScalar(1.15);
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

  spark(x, y, z, color, n = 16, spread = 28) {
    for (let i = 0; i < n; i++) {
      let p = this.pool.pop();
      if (!p) p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color }));
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
    if (fov && Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
  }
  say(id, text, anchor, opts) { if (this.said[id]) return; this.said[id] = true; CZ.Comic.bubble(text, anchor, opts); }
  once(id, fn) { if (this.said[id]) return; this.said[id] = true; fn(); }
  headAnchor(m, dy = 6) { return () => { const h = m.pts[m.i.head]; return [h.x, h.y + dy, 0]; }; }

  // Point the camera at both fighters, backing off as they separate.
  followCam(dt, tight = 0) {
    const a = this.blue.pts[this.blue.i.chest], b = this.red.pts[this.red.i.chest];
    // if one of them is flung far away, stay with the player and look that way
    const spread = Math.abs(a.x - b.x), sep = Math.min(spread, 34);
    const cx = spread > 34 ? a.x + Math.sign(b.x - a.x) * 17 : (a.x + b.x) / 2;
    const cy = Math.max(10, (a.y + b.y) / 2 + 3);
    const want = CZ.clamp(30 + sep * 1.0 - tight, 42, 66);
    this.camX = this.camX === undefined ? cx : CZ.damp(this.camX, cx, 4, dt);
    this.camY = this.camY === undefined ? cy : CZ.damp(this.camY, cy, 3, dt);
    this.camZ = this.camZ === undefined ? want : CZ.damp(this.camZ, want, 2.4, dt);
    this.cam([this.camX + this.sx, this.camY + this.sy, this.camZ], [this.camX, this.camY - 2, 0], 46);
  }

  // ---------- combat ----------
  // The blade, as a segment from the hand outward.
  blade(m) {
    const h = m.pts[m.i.hdR], e = m.pts[m.i.elR];
    const dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1;
    return { ax: h.x, ay: h.y, bx: h.x + dx / d * 13, by: h.y + dy / d * 13, speed: Math.hypot(h.x - h.px, h.y - h.py) };
  }
  // A swing connects if the moving blade sweeps close to a body point. Testing
  // the whole blade, not just the tip, means a downward cut still finds a mech
  // that is already on the ground.
  tryHit(attacker, victim, onHit) {
    if (attacker.armGone.R) return false;
    const b = this.blade(attacker);
    if (b.speed < 0.10) return false;
    const vx = b.bx - b.ax, vy = b.by - b.ay, L = vx * vx + vy * vy || 1;
    for (const key of ['head', 'chest', 'hip', 'elL', 'elR', 'knL', 'knR']) {
      const p = victim.pts[victim.i[key]];
      const t = CZ.clamp(((p.x - b.ax) * vx + (p.y - b.ay) * vy) / L, 0, 1);
      const qx = b.ax + vx * t, qy = b.ay + vy * t;
      if (Math.hypot(p.x - qx, p.y - qy) < 4.6) { onHit(key, p, { x: qx, y: qy }); return true; }
    }
    return false;
  }
  damage(victim, isPlayer, key, p) {
    const hpKey = isPlayer ? 'blueHp' : 'redHp';
    this[hpKey]--;
    this.shake = 1.9; this.flashT = 0.16; CZ.Audio.sfx.bossHit(); CZ.Comic.flash();
    this.spark(p.x, p.y, 0, isPlayer ? 0x9fd4ff : 0xffb0b8, 34, 26);
    CZ.Comic.pow(CZ.pick(['WHAM!', 'KRAK!', 'THUD!', 'KLANG!']), [p.x, p.y + 5, 0], { kind: 'hit', life: 0.6 });
    // knocked back away from whoever swung, not always to the right
    const other = isPlayer ? this.red : this.blue;
    const dir = Math.sign(victim.pts[victim.i.chest].x - other.pts[other.i.chest].x) || 1;
    victim.impulse(victim.i.chest, dir * 12, 9, 1 / 60);
    victim.impulse(victim.i.head, dir * 6, 3, 1 / 60);
    // limbs come off as the damage adds up
    const hp = this[hpKey];
    const order = ['armL', 'legL', 'head'];
    if (hp <= 2 && hp >= 0) {
      const lost = victim.loseLimb(order[2 - hp] || 'head');
      if (lost) {
        this.spark(lost.x, lost.y, 0, 0xff8a1f, 40, 30);
        CZ.Comic.pow('SHK!', [lost.x + 7, lost.y - 3, 0], { kind: 'slash', life: 0.6 });
      }
    }
    if (hp <= 0) this.knockOut(isPlayer);
  }
  knockOut(isPlayer) {
    if (this.phase !== 'fight') return;
    this.phase = isPlayer ? 'glitch' : 'finish';
    this.phaseT = 0;
    this.flashT = 0.4; this.shake = 2.6; CZ.Audio.sfx.bossDie(); CZ.Comic.flash('white');
    CZ.Comic.clearBubbles();
  }

  // ---------- update ----------
  update(dt) {
    if (this.done) return;
    dt = Math.min(dt, 1 / 45);
    this.t += dt; this.phaseT += dt;
    const I = CZ.Input, B = this.blue, R = this.red;
    // ambience
    for (const c of this.clouds) { c.position.x += c.userData.drift * dt; if (c.position.x > 460) c.position.x = -460; }
    const d = this.grassDummy;
    for (let i = 0; i < this.grassPhase.length; i++) {
      const g = this.grassPhase[i];
      d.position.set(g.x, 0, g.z); d.rotation.set(Math.sin(this.t * 1.6 + g.p) * 0.22, g.ry, Math.sin(this.t * 2.1 + g.p) * 0.18);
      d.scale.setScalar(g.s); d.updateMatrix(); this.grass.setMatrixAt(i, d.matrix);
    }
    this.grass.instanceMatrix.needsUpdate = true;
    this.duckHalo.rotation.z += dt * 1.4;
    this.sx = this.shake > 0.01 ? CZ.rand(-1, 1) * this.shake : 0;
    this.sy = this.shake > 0.01 ? CZ.rand(-1, 1) * this.shake : 0;

    if (this.phase === 'ready') this.phaseReady(dt);
    else if (this.phase === 'fight') this.phaseFight(dt);
    else if (this.phase === 'glitch') this.phaseGlitch(dt);
    else if (this.phase === 'finish') this.phaseFinish(dt);
    else if (this.phase === 'duck') this.phaseDuck(dt);
    else if (this.phase === 'curse') this.phaseCurse(dt);
    else if (this.phase === 'outro') this.phaseOutro(dt);

    // physics for whoever is still simulated
    if (this.phase !== 'curse' && this.phase !== 'outro') { B.step(dt); R.step(dt); }
    else R.step(dt);
    B.syncBones(); R.syncBones();

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i], u = p.userData;
      u.life -= dt; u.vy -= 50 * dt;
      p.position.x += u.vx * dt; p.position.y += u.vy * dt; p.position.z += u.vz * dt;
      if (u.life <= 0 || p.position.y < 0) { this.scene.remove(p); this.sparks.splice(i, 1); this.pool.push(p); }
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3.2);
    if (this.flashT > 0) this.flashT -= dt;
    CZ.Comic.shakeFrame(this.shake > 0.7);
    CZ.UI.cineFx(this.flashT > 0 ? Math.min(1, this.flashT * 3) : 0, this.glitch);
    CZ.Comic.update(dt);
  }

  phaseReady(dt) {
    const B = this.blue, R = this.red;
    B.balance(dt, 0, 1); R.balance(dt, 0, 1);
    this.followCam(dt);
    this.say('a', 'LAST ONE STANDING.', this.headAnchor(R), { kind: 'shout' });
    if (this.phaseT > 2.2) {
      this.say('b', 'SWING WITH SHIFT.', this.headAnchor(B), { kind: 'say', life: 2.6 });
      B.setSaber(true); R.setSaber(true);
    }
    if (this.phaseT > 3.4) { this.phase = 'fight'; this.phaseT = 0; }
  }

  // Two mechs cannot stand in the same place: shove the torsos apart so you
  // duel at sword range instead of walking through each other.
  separate() {
    const B = this.blue, R = this.red;
    for (const key of ['head', 'chest', 'hip']) {
      const p = B.pts[B.i[key]], q = R.pts[R.i[key]];
      const dx = q.x - p.x, d = Math.abs(dx);
      if (d < 7 && d > 0.0001) {
        const o = (7 - d) * 0.22 * Math.sign(dx);
        p.x -= o; q.x += o;
      }
    }
  }

  phaseFight(dt) {
    const I = CZ.Input, B = this.blue, R = this.red;
    const bc = B.pts[B.i.chest], rc = R.pts[R.i.chest];
    const toward = Math.sign(rc.x - bc.x) || 1;

    // ── player ──
    const axis = I.axisX();
    B.balance(dt, axis * 0.55, 1);
    if (axis) { B.accel(B.i.hip, axis * 150, 0); B.accel(B.i.chest, axis * 70, 0); }
    if (I.pressed('jump') && B.grounded()) {
      B.impulse(B.i.hip, 0, 26, dt); B.impulse(B.i.chest, 0, 20, dt);
      B.impulse(B.i.ftL, 0, 12, dt); B.impulse(B.i.ftR, 0, 12, dt);
      CZ.Audio.sfx.jump();
    }
    if (this.swingCd > 0) this.swingCd -= dt;
    if (I.pressed('dash') && this.swingCd <= 0 && !B.armGone.R) {
      this.swingT = 0.38; this.swingCd = 0.55; CZ.Audio.sfx.laser();
    }
    if (this.swingT > 0) {
      this.swingT -= dt;
      B.swingArc(1 - this.swingT / 0.38, toward);
    }
    // ── enemy ──
    R.balance(dt, 0, 1);
    this.aiT -= dt;
    const gap = Math.abs(rc.x - bc.x);
    const away = -toward;
    if (this.aiState === 'approach') {
      if (gap > 16) R.accel(R.i.hip, away * 120, 0);
      else if (gap < 11) R.accel(R.i.hip, -away * 90, 0);
      if (this.aiT <= 0 && gap < 20) { this.aiState = 'swing'; this.aiT = 0.42; }
    } else if (this.aiState === 'swing') {
      R.swingArc(1 - Math.max(0, this.aiT) / 0.42, away);
      if (this.aiT <= 0) { this.aiState = 'approach'; this.aiT = CZ.rand(1.0, 2.0); }
    }

    // ── blades ──
    if (this.hitCd > 0) this.hitCd -= dt;
    if (this.aiHitCd > 0) this.aiHitCd -= dt;
    if (this.swingT > 0.05 && this.hitCd <= 0) {
      if (this.tryHit(B, R, (key, p) => { this.hitCd = 0.5; this.damage(R, false, key, p); })) { /* hit */ }
    }
    if (this.aiState === 'swing' && this.aiHitCd <= 0) {
      if (this.tryHit(R, B, (key, p) => { this.aiHitCd = 0.6; this.damage(B, true, key, p); })) { /* hit */ }
    }
    if (Math.random() < 0.02) this.spark(rc.x, rc.y - 4, 0, 0x8cc65b, 1, 6);
    this.separate();
    this.followCam(dt, 6);
  }

  // The player lost: the floor turns out to be optional.
  phaseGlitch(dt) {
    const B = this.blue, R = this.red, k = this.phaseT;
    R.balance(dt, 0, 1);
    this.glitch = k < 2.2 ? 1 : 0;
    this.once('clipStart', () => { CZ.Audio.sfx.noclip(); this.hole.visible = this.holeRing.visible = true; });
    const c = B.pts[B.i.chest];
    this.hole.position.set(c.x, 0.14, 0); this.holeRing.position.set(c.x, 0.16, 0);
    if (k < 2.2) {
      for (const p of B.pts) { p.y -= 14 * dt; p.py = p.y; }
      B.group.traverse(o => { if (o.isMesh && o.material.wireframe !== undefined) o.material.wireframe = Math.floor(this.t * 18) % 2 === 0; });
      if (Math.random() < 0.5) this.spark(c.x, 2, 0, 0x39ff88, 3, 16);
      this.say('g1', 'no collision.', () => [c.x, 8, 0], { kind: 'small', life: 2.4 });
    } else if (k < 3.0) {
      B.group.visible = false;
    } else {
      this.once('reappear', () => {
        B.group.visible = true;
        B.group.traverse(o => { if (o.isMesh && o.material.wireframe !== undefined) o.material.wireframe = false; });
        const rx = R.pts[R.i.chest].x;
        const dx = rx - 22 - B.pts[B.i.chest].x;
        for (const p of B.pts) { p.x += dx; p.y += 32; p.px = p.x; p.py = p.y; }
        this.spark(rx - 22, 12, 0, 0x39ff88, 44, 30); CZ.Audio.sfx.dash();
        CZ.Comic.pow('CLIP!', [rx - 22, 18, 0], { kind: 'glitch', life: 0.9 });
      });
      B.balance(dt, 0, 1);
      if (k > 3.9) this.once('behead', () => {
        const h = R.loseLimb('head');
        R.loseLimb('armR');
        if (h) { this.spark(h.x, h.y, 0, 0xffb0b8, 50, 34); h.px = h.x - 1.6; h.py = h.y - 1.2; }
        this.flashT = 0.35; this.shake = 2.4; CZ.Audio.sfx.bossDie(); CZ.Comic.flash('white');
        CZ.Comic.pow('KRAK!!', [R.pts[R.i.chest].x, 16, 0], { kind: 'hit', life: 0.9 });
      });
      if (k > 5.0) { this.phase = 'duck'; this.phaseT = 0; this.hole.visible = this.holeRing.visible = false; }
    }
    this.followCam(dt, 10);
  }

  // The player won.
  phaseFinish(dt) {
    const R = this.red, B = this.blue, k = this.phaseT;
    this.blue.balance(dt, 0, 1);
    this.once('fin', () => {
      const h = R.loseLimb('head'); R.loseLimb('armR');
      if (h) { h.px = h.x - 1.8; h.py = h.y - 1.4; this.spark(h.x, h.y, 0, 0xffb0b8, 50, 34); }
      CZ.Comic.pow('KRAK!!', [R.pts[R.i.chest].x, 16, 0], { kind: 'hit', life: 0.9 });
    });
    if (Math.random() < 0.4) { const c = R.pts[R.i.chest]; this.spark(c.x, c.y, 0, 0xff8a1f, 3, 12); }
    this.followCam(dt, 10);
    if (k > 3.0) { this.phase = 'duck'; this.phaseT = 0; }
  }

  phaseDuck(dt) {
    const k = this.phaseT, B = this.blue;
    B.balance(dt, 0, 1);
    const cx = B.pts[B.i.chest].x;
    this.beam.position.x = cx; this.bolt.position.x = cx;
    this.beam.material.opacity = Math.min(0.24, k * 0.35);
    this.duck.visible = true;
    // drops out of the sky and parks just above the mech, so both stay in shot
    const dy = CZ.lerp(112, DUCK_Y, CZ.ease(Math.min(1, k / 2.8)));
    this.duck.position.set(cx, dy, 0);
    this.duck.rotation.y = Math.PI + Math.sin(this.t) * 0.1;
    this.duckWing.rotation.x = Math.sin(this.t * 9) * 0.7 * (k < 2.8 ? 1 : 0.25);
    if (k > 2.2) this.say('d1', 'NINE MONTHS ON THAT ARENA.', this.duckAnchor(), { kind: 'shout' });
    // frame the pair: look between the mech's chest and the duck, pull back to fit
    this.camX = CZ.damp(this.camX, cx, 3, dt);
    this.camY = CZ.damp(this.camY, (dy + 18) * 0.5, 6, dt);
    this.camZ = CZ.damp(this.camZ, CZ.clamp((dy + 42) * 1.35, 100, 220), 6, dt);
    this.cam([this.camX + this.sx, this.camY + this.sy, this.camZ], [this.camX, this.camY, 0], 46);
    if (k > 4.2) { this.phase = 'curse'; this.phaseT = 0; }
  }

  // beside the duck, not above it - the letterbox bars eat the top of the frame
  duckAnchor() { return () => [this.duck.position.x + 30, this.duck.position.y + 4, 0]; }

  phaseCurse(dt) {
    const k = this.phaseT, B = this.blue;
    const cx = B.pts[B.i.chest].x;
    this.duck.position.y = DUCK_Y + Math.sin(this.t * 1.5) * 1.4;
    this.duckWing.rotation.x = Math.sin(this.t * 6) * 0.35;
    if (k > 0.8) this.once('bolt', () => {
      this.bolt.visible = true; this.flashT = 0.45; this.shake = 2.6;
      CZ.Audio.sfx.thunder(); CZ.Comic.flash('white');
      CZ.Comic.pow('ZAAP', [cx + 8, 19, 0], { kind: 'glitch', life: 0.8 });
    });
    if (k > 0.9) {
      this.bolt.visible = Math.floor(this.t * 30) % 2 === 0 && k < 1.5;
      const s = Math.max(0.001, 1 - (k - 0.9) * 1.6);
      B.group.scale.setScalar(s);
      B.group.position.y = 0;
      if (k > 1.5 && !this.cheese.visible) {
        B.group.visible = false; this.cheese.visible = true; this.cheese.position.x = cx;
        this.spark(cx, 6, 0, 0xffd23f, 40, 24);
      }
      if (Math.random() < 0.5) this.spark(cx, 8, 0, 0xffd23f, 3, 16);
    }
    // by now the shot is tight on what is left of the mech, so speak from above it
    if (k > 2.0) this.say('d2', 'BE CHEESE.', [cx + 4, 17, 0], { kind: 'shout' });
    // hold the duck in shot for the bolt, then push in on what is left of the mech
    const wide = k < 1.7;
    this.camX = CZ.damp(this.camX, cx, 3, dt);
    this.camY = CZ.damp(this.camY, wide ? 27 : 11, 2.6, dt);
    this.camZ = CZ.damp(this.camZ, wide ? 96 : 40, 2.2, dt);
    this.cam([this.camX + this.sx, this.camY + this.sy, this.camZ], [this.camX, wide ? 26 : 6, 0], 42);
    if (k > 3.4) { this.phase = 'outro'; this.phaseT = 0; }
  }

  phaseOutro(dt) {
    const k = this.phaseT;
    this.duck.position.y = DUCK_Y + k * 90;
    this.duckWing.rotation.x = Math.sin(this.t * 12) * 0.9;
    this.beam.material.opacity = Math.max(0, 0.24 - k * 0.3);
    this.cheese.rotation.z = Math.sin(this.t * 3) * 0.18;
    this.cheese.position.y = 4 + Math.abs(Math.sin(this.t * 3)) * 0.5;
    if (k > 0.4) this.say('d3', "I'LL BUILD MY OWN.", () => [this.cheese.position.x, this.cheese.position.y + 9, 0], { kind: 'say', life: 2.6 });
    this.camZ = CZ.damp(this.camZ, 24, 2, dt);
    this.camY = CZ.damp(this.camY, 7, 3, dt);
    this.cam([this.cheese.position.x + this.sx, this.camY + this.sy, this.camZ], [this.cheese.position.x, 4.6, 0], 34);
    if (k > 3.2) this.finish();
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
