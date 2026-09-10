// A build-once, animate-forever mech: panelled armour, procedural walk and
// aim poses, and limbs that can be blown off and left to tumble on the ground.
CZ.Mech = class Mech {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.pal = opts.pal || 'mechBlue';
    this.glow = opts.glow ?? 0x9fd4ff;
    this.trim = opts.trim ?? 0xffd23f;
    this.t = 0;
    this.detached = [];              // limbs currently tumbling
    this.stumps = [];                // where to spit sparks from
    this.hitLean = 0; this.hitLeanV = 0;
    this.root = new THREE.Group();
    this.build();
    scene.add(this.root);
  }

  armour(w, h, d, pal = this.pal) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('mech', pal, Math.max(w, 1.5), Math.max(h, 1.5), 5) }));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  lamp(w, h, d, color = this.glow) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
  }

  build() {
    const A = (w, h, d, p) => this.armour(w, h, d, p);
    const body = new THREE.Group(); body.position.y = 10.2; this.root.add(body); this.body = body;

    // ── torso ──
    const chest = A(7.2, 4.2, 4.6); chest.position.y = 1.4; body.add(chest);
    const collar = A(5.0, 1.2, 4.2, 'mechGrey'); collar.position.y = 3.6; body.add(collar);
    const abdomen = A(4.2, 2.2, 3.6, 'mechGrey'); abdomen.position.y = -1.2; body.add(abdomen);
    const waist = A(5.6, 1.8, 4.0); waist.position.y = -2.8; body.add(waist);
    for (const s of [-1, 1]) {
      const skirt = A(2.0, 3.0, 3.4); skirt.position.set(s * 2.2, -4.4, 0); skirt.rotation.z = s * 0.12; body.add(skirt);
    }
    const front = A(2.6, 2.8, 0.6, 'mechGrey'); front.position.set(0, -4.4, 2.0); body.add(front);
    this.core = this.lamp(1.6, 1.6, 0.4); this.core.position.set(0, 1.4, 2.4); body.add(this.core);
    for (const s of [-1, 1]) { const vent = this.lamp(0.5, 2.2, 0.3, 0x2a2f38); vent.position.set(s * 2.6, 1.4, 2.35); body.add(vent); }

    // ── head on a neck ──
    const neck = A(1.4, 1.0, 1.4, 'mechGrey'); neck.position.y = 4.4; body.add(neck);
    const head = new THREE.Group(); head.position.y = 5.6; body.add(head); this.head = head;
    const skull = A(3.0, 2.4, 2.8); head.add(skull);
    const jaw = A(2.4, 0.8, 2.4, 'mechGrey'); jaw.position.y = -1.4; head.add(jaw);
    this.visor = this.lamp(2.4, 0.8, 0.4); this.visor.position.set(0, 0.3, 1.5); head.add(this.visor);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.5), new THREE.MeshToonMaterial({ color: this.trim }));
    crest.position.set(0, 1.9, 0.8); head.add(crest);
    for (const s of [-1, 1]) {
      const fin = A(0.4, 1.2, 1.6, 'mechGrey'); fin.position.set(s * 1.5, 0.9, -0.2); fin.rotation.z = s * 0.3; head.add(fin);
      const ear = this.lamp(0.35, 0.35, 0.35, 0xff5544); ear.position.set(s * 1.6, 0.1, 0.9); head.add(ear);
    }
    const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), new THREE.MeshToonMaterial({ color: 0xc8d0dc }));
    antenna.position.set(-1.2, 2.6, -0.6); head.add(antenna);

    // ── backpack ──
    const pack = A(4.4, 3.8, 1.8, 'mechGrey'); pack.position.set(0, 1.2, -3.0); body.add(pack);
    this.thrusters = [];
    for (const s of [-1, 1]) {
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.15, 2.4, 8), new THREE.MeshToonMaterial({ color: 0x3a4048 }));
      bell.position.set(s * 1.4, -1.4, -3.4); body.add(bell);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.85, 4.2, 6), new THREE.MeshBasicMaterial({ color: this.glow, transparent: true, opacity: 0.9 }));
      flame.position.set(s * 1.4, -4, -3.4); flame.rotation.x = Math.PI; flame.visible = false; body.add(flame);
      this.thrusters.push(flame);
      const wing = A(0.5, 3.4, 2.2); wing.position.set(s * 2.6, 2.4, -3.2); wing.rotation.z = s * 0.35; body.add(wing);
    }

    // ── arms ──
    this.arms = {};
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? -1 : 1;
      const mount = new THREE.Group(); mount.position.set(s * 3.9, 2.2, 0); body.add(mount);
      const shoulder = new THREE.Group(); mount.add(shoulder);
      const limb = new THREE.Group(); shoulder.add(limb);          // everything below here can come off
      const pad = A(2.8, 2.6, 3.8); pad.position.set(s * 0.7, 0.4, 0); limb.add(pad);
      const padTrim = this.lamp(0.4, 1.8, 3.0, this.trim); padTrim.position.set(s * 2.0, 0.4, 0); limb.add(padTrim);
      const upper = A(1.8, 3.2, 1.8, 'mechGrey'); upper.position.y = -2.0; limb.add(upper);
      const elbow = new THREE.Group(); elbow.position.y = -3.6; limb.add(elbow);
      const fore = A(2.2, 3.4, 2.2); fore.position.y = -1.7; elbow.add(fore);
      const vern = this.lamp(0.5, 0.9, 0.5, 0x2a2f38); vern.position.set(s * 1.1, -1.7, 0.9); elbow.add(vern);
      const wrist = new THREE.Group(); wrist.position.y = -3.6; elbow.add(wrist);
      const palm = A(1.7, 1.2, 1.9, 'mechGrey'); wrist.add(palm);
      for (let f = 0; f < 3; f++) {
        const finger = A(0.42, 1.2, 0.42, 'mechGrey');
        finger.position.set(-0.5 + f * 0.5, -1.0, 0.4); wrist.add(finger);
      }
      const thumb = A(0.42, 0.9, 0.42, 'mechGrey'); thumb.position.set(s * -0.8, -0.6, -0.3); wrist.add(thumb);
      this.arms[side] = { mount, shoulder, limb, elbow, wrist, side: s, gone: false };
    }
    // beam saber in the right hand
    const saber = new THREE.Group(); saber.position.y = -1.2; this.arms.R.wrist.add(saber);
    const hilt = A(0.7, 2.0, 0.7, 'mechGrey'); saber.add(hilt);
    this.blade = new THREE.Mesh(new THREE.BoxGeometry(0.8, 13, 0.8), new THREE.MeshBasicMaterial({ color: this.glow, transparent: true, opacity: 0.85 }));
    this.blade.position.y = -7.4; saber.add(this.blade);
    this.bladeCore = new THREE.Mesh(new THREE.BoxGeometry(0.34, 13.2, 0.34), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.bladeCore.position.y = -7.4; saber.add(this.bladeCore);
    this.saberLight = new THREE.PointLight(this.glow, 0, 46); this.saberLight.position.y = -6; saber.add(this.saberLight);
    this.blade.visible = this.bladeCore.visible = false;
    this.saber = saber;

    // ── legs ──
    this.legs = {};
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? -1 : 1;
      const mount = new THREE.Group(); mount.position.set(s * 2.0, -5.0, 0); body.add(mount);
      const hip = new THREE.Group(); mount.add(hip);
      const limb = new THREE.Group(); hip.add(limb);
      const thigh = A(2.6, 3.8, 2.8); thigh.position.y = -1.9; limb.add(thigh);
      const knee = new THREE.Group(); knee.position.y = -4.0; limb.add(knee);
      const guard = A(2.2, 1.4, 2.6, 'mechGrey'); guard.position.set(0, 0.2, 0.5); knee.add(guard);
      const shin = A(2.4, 4.0, 2.8); shin.position.y = -2.2; knee.add(shin);
      const calf = A(1.2, 2.4, 1.0, 'mechGrey'); calf.position.set(0, -2.2, -1.7); knee.add(calf);
      const ankle = new THREE.Group(); ankle.position.y = -4.4; knee.add(ankle);
      const foot = A(2.8, 1.2, 4.4); foot.position.set(0, -0.6, 0.8); ankle.add(foot);
      const toe = A(2.4, 0.8, 1.2, 'mechGrey'); toe.position.set(0, -0.8, 2.6); ankle.add(toe);
      const heel = A(1.6, 1.0, 1.2, 'mechGrey'); heel.position.set(0, -0.6, -1.2); ankle.add(heel);
      this.legs[side] = { mount, hip, limb, knee, ankle, side: s, gone: false };
    }
  }

  // ---------- poses ----------
  setSaber(on) { this.blade.visible = this.bladeCore.visible = on; this.saberLight.intensity = on ? 3 : 0; }
  setThrust(on, p = 1) { for (const f of this.thrusters) { f.visible = on; f.scale.y = p * (0.7 + Math.sin(this.t * 30) * 0.3); } }

  // A weight-shifting walk cycle; `speed` scales the stride.
  walk(dt, speed = 1) {
    const t = this.t * 5.2 * speed, s = Math.sin(t), c = Math.cos(t);
    if (!this.legs.L.gone) { this.legs.L.hip.rotation.x = s * 0.72; this.legs.L.knee.rotation.x = Math.max(0, -s) * 1.15; this.legs.L.ankle.rotation.x = -Math.max(0, -s) * 0.5; }
    if (!this.legs.R.gone) { this.legs.R.hip.rotation.x = -s * 0.72; this.legs.R.knee.rotation.x = Math.max(0, s) * 1.15; this.legs.R.ankle.rotation.x = -Math.max(0, s) * 0.5; }
    if (!this.arms.L.gone) { this.arms.L.shoulder.rotation.x = -s * 0.5; this.arms.L.elbow.rotation.x = -0.3 - Math.max(0, -s) * 0.3; }
    if (!this.arms.R.gone) { this.arms.R.shoulder.rotation.x = s * 0.5; this.arms.R.elbow.rotation.x = -0.3 - Math.max(0, s) * 0.3; }
    this.body.position.y = 10.2 + Math.abs(c) * 0.55 - 0.3;
    this.body.rotation.z = s * 0.05;
    this.body.rotation.y = s * 0.09;
    this.head.rotation.y = -s * 0.06;
  }
  idle(dt) {
    const b = Math.sin(this.t * 1.6);
    this.body.position.y = 10.2 + b * 0.18;
    this.body.rotation.z = b * 0.02;
    for (const k of ['L', 'R']) {
      if (!this.legs[k].gone) { this.legs[k].hip.rotation.x = 0; this.legs[k].knee.rotation.x = 0.06; this.legs[k].ankle.rotation.x = -0.06; }
      if (!this.arms[k].gone) { this.arms[k].shoulder.rotation.x = 0; this.arms[k].shoulder.rotation.z = this.arms[k].side * 0.06 + b * 0.02; this.arms[k].elbow.rotation.x = -0.25; }
    }
  }
  // Aim the saber arm: k 0 = ready, 1 = full swing across the body.
  swing(k) {
    const a = this.arms.R; if (a.gone) return;
    a.shoulder.rotation.x = -2.3 + k * 3.4;
    a.shoulder.rotation.z = 0.3 - k * 0.5;
    a.elbow.rotation.x = -0.5 + k * 0.4;
    this.body.rotation.y = -0.5 + k * 1.0;
  }
  guard() {
    const a = this.arms.L; if (a.gone) return;
    a.shoulder.rotation.x = -1.5; a.shoulder.rotation.z = -0.5; a.elbow.rotation.x = -1.7;
  }
  punch(k) {
    const a = this.arms.L; if (a.gone) return;
    a.shoulder.rotation.x = -1.1 - k * 0.6; a.elbow.rotation.x = -1.6 + k * 1.6;
    this.body.rotation.y = 0.35 - k * 0.7;
  }
  kneel(k) {
    this.body.position.y = 10.2 - k * 4.4;
    this.legs.L.hip.rotation.x = -k * 1.5; this.legs.L.knee.rotation.x = k * 2.3;
    this.legs.R.hip.rotation.x = k * 0.5; this.legs.R.knee.rotation.x = k * 1.4;
    this.body.rotation.z = k * 0.12;
  }
  hit(dir = 1) { this.hitLeanV += dir * 9; CZ.Effects.shake && CZ.Effects.shake(0.6); }

  // ---------- damage ----------
  // Blow a limb off: it keeps its pose, gets thrown, and tumbles on the ground.
  detach(which, vel = {}) {
    const isArm = which[0] === 'a';
    const side = which.slice(-1);
    const rec = isArm ? this.arms[side] : this.legs[side];
    if (!rec || rec.gone) return null;
    rec.gone = true;
    const limb = rec.limb;
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
    limb.getWorldPosition(wp); limb.getWorldQuaternion(wq); limb.getWorldScale(ws);
    limb.parent.remove(limb);
    this.scene.add(limb);
    limb.position.copy(wp); limb.quaternion.copy(wq); limb.scale.copy(ws);
    const piece = {
      obj: limb,
      vx: vel.vx ?? CZ.rand(-16, 16), vy: vel.vy ?? CZ.rand(14, 26), vz: vel.vz ?? CZ.rand(-8, 8),
      rx: CZ.rand(-7, 7), ry: CZ.rand(-7, 7), rz: CZ.rand(-7, 7), rest: false,
    };
    this.detached.push(piece);
    // sparking stump
    const stump = new THREE.Group();
    (isArm ? rec.shoulder : rec.hip).add(stump);
    const cap = this.lamp(1.4, 1.4, 1.4, 0x2a2f38); cap.position.y = -0.8; stump.add(cap);
    this.stumps.push({ node: stump, t: 0 });
    return piece;
  }

  update(dt) {
    this.t += dt;
    // recoil spring
    this.hitLeanV += -this.hitLean * 70 * dt; this.hitLeanV *= Math.exp(-dt * 7);
    this.hitLean += this.hitLeanV * dt;
    this.body.rotation.x = this.hitLean * 0.05;
    // tumbling limbs
    for (const p of this.detached) {
      if (p.rest) continue;
      p.vy -= 46 * dt;
      p.obj.position.x += p.vx * dt; p.obj.position.y += p.vy * dt; p.obj.position.z += p.vz * dt;
      p.obj.rotation.x += p.rx * dt; p.obj.rotation.y += p.ry * dt; p.obj.rotation.z += p.rz * dt;
      if (p.obj.position.y < 1.2) {
        p.obj.position.y = 1.2; p.vy *= -0.32; p.vx *= 0.6; p.vz *= 0.6;
        p.rx *= 0.4; p.ry *= 0.4; p.rz *= 0.4;
        if (Math.abs(p.vy) < 2.5) { p.rest = true; p.obj.rotation.x = Math.PI / 2 * Math.sign(Math.cos(p.obj.rotation.x) || 1) * 0 + p.obj.rotation.x; }
      }
    }
    // stump sparks
    for (const s of this.stumps) {
      s.t -= dt;
      if (s.t <= 0) {
        s.t = CZ.rand(0.04, 0.16);
        const wp = new THREE.Vector3(); s.node.getWorldPosition(wp);
        this.onSpark && this.onSpark(wp.x, wp.y, wp.z);
      }
    }
  }
  dispose() { CZ.Effects.disposeTree(this.root); for (const p of this.detached) CZ.Effects.disposeTree(p.obj); }
};
