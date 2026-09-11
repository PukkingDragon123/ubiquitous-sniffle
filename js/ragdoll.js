// A small verlet ragdoll solver, and a mech built out of it. Points integrate,
// sticks pull them back together, and sticks can snap so limbs come off.
CZ.Ragdoll = class Ragdoll {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.pts = []; this.sticks = []; this.bones = [];
    this.pal = opts.pal || 'mechBlue';
    this.glow = opts.glow ?? 0x9fd4ff;
    this.trim = opts.trim ?? 0xffd23f;
    this.group = new THREE.Group(); scene.add(this.group);
    this.gravity = opts.gravity ?? -62;
    this.dead = false; this.hp = opts.hp ?? 6;
    this.facing = opts.facing ?? 1;
  }

  pt(x, y, r = 0.9, m = 1) { const p = { x, y, px: x, py: y, r, m, pinned: false, ax: 0, ay: 0 }; this.pts.push(p); return this.pts.length - 1; }
  stick(a, b, stiff = 1, tough = Infinity) {
    const A = this.pts[a], B = this.pts[b];
    const s = { a, b, len: Math.hypot(A.x - B.x, A.y - B.y), stiff, tough, broken: false };
    this.sticks.push(s); return this.sticks.length - 1;
  }
  // Draw a box between two points; it follows them every frame.
  bone(a, b, w, d, pal, extra) {
    const mat = new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('mech', pal || this.pal, Math.max(w, 1.5), 2.4, 5) });
    const len = Math.hypot(this.pts[a].x - this.pts[b].x, this.pts[a].y - this.pts[b].y) || 1;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, len, d), mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const holder = new THREE.Group(); holder.add(mesh);
    if (extra) extra(mesh, holder);
    this.group.add(holder);
    const bone = { a, b, mesh, holder, len, w, d, off: 0 };
    this.bones.push(bone); return bone;
  }

  // Forces are accelerations in units/s^2; they are integrated in step().
  accel(i, ax, ay) { const p = this.pts[i]; p.ax += ax; p.ay += ay; }
  // An instant velocity change, in units/s.
  impulse(i, vx, vy, dt = 1 / 60) { const p = this.pts[i]; p.px -= vx * dt; p.py -= vy * dt; }
  // Pull a point toward a target, injecting only a little velocity so the rig
  // stays controllable instead of exploding.
  springTo(i, tx, ty, k = 0.25, carry = 0.8) {
    const p = this.pts[i];
    const dx = (tx - p.x) * k, dy = (ty - p.y) * k;
    p.x += dx; p.y += dy; p.px += dx * carry; p.py += dy * carry;
  }
  vel(i) { const p = this.pts[i]; return { x: p.x - p.px, y: p.y - p.py }; }
  center() {
    let x = 0, y = 0; for (const p of this.pts) { x += p.x; y += p.y; }
    return { x: x / this.pts.length, y: y / this.pts.length };
  }
  // Snap every stick attached to a point, so whatever hangs off it falls away.
  sever(i) {
    let any = false;
    for (const s of this.sticks) if (!s.broken && (s.a === i || s.b === i)) { s.broken = true; any = true; }
    return any;
  }

  step(dt, opts = {}) {
    const drag = Math.exp(-dt * (opts.drag ?? 1.4));
    const MAXV = 1.6;                       // units per frame; keeps the rig sane
    for (const p of this.pts) {
      if (p.pinned) { p.px = p.x; p.py = p.y; p.ax = p.ay = 0; continue; }
      let vx = (p.x - p.px) * drag, vy = (p.y - p.py) * drag;
      const sp = Math.hypot(vx, vy);
      if (sp > MAXV) { vx *= MAXV / sp; vy *= MAXV / sp; }
      p.px = p.x; p.py = p.y;
      p.x += vx + p.ax * dt * dt;
      p.y += vy + (this.gravity + p.ay) * dt * dt;
      p.ax = 0; p.ay = 0;
    }
    for (let it = 0; it < 6; it++) {
      for (const s of this.sticks) {
        if (s.broken) continue;
        const A = this.pts[s.a], B = this.pts[s.b];
        const dx = B.x - A.x, dy = B.y - A.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        if (d > s.len * s.tough) { s.broken = true; continue; }
        const diff = (s.len - d) / d * 0.5 * s.stiff;
        const ox = dx * diff, oy = dy * diff;
        if (!A.pinned) { A.x -= ox; A.y -= oy; }
        if (!B.pinned) { B.x += ox; B.y += oy; }
      }
      // ground
      for (const p of this.pts) {
        if (p.y - p.r < 0) {
          p.y = p.r;
          const vx = p.x - p.px;
          p.px = p.x - vx * 0.72;          // friction
          p.py = p.y + (p.py - p.y) * -0.18; // bounce
        }
      }
    }
  }

  // How many unbroken sticks still hold a point.
  attached(i) { let n = 0; for (const s of this.sticks) if (!s.broken && (s.a === i || s.b === i)) n++; return n; }

  syncBones() {
    for (const b of this.bones) {
      const A = this.pts[b.a], B = this.pts[b.b];
      let ax = A.x, ay = A.y, bx = B.x, by = B.y;
      let len = Math.hypot(bx - ax, by - ay) || 0.001;
      if (len > b.len * 1.45) {
        // the joint snapped - draw the piece at its own size hanging off the end
        // that is still attached, instead of stretching between the two halves
        const ux = (bx - ax) / len, uy = (by - ay) / len;
        if (this.attached(b.a) >= this.attached(b.b)) { bx = ax + ux * b.len; by = ay + uy * b.len; }
        else { ax = bx - ux * b.len; ay = by - uy * b.len; }
        len = b.len;
      }
      b.holder.position.set((ax + bx) / 2, (ay + by) / 2, 0);
      b.holder.rotation.z = Math.atan2(by - ay, bx - ax) - Math.PI / 2;
      b.mesh.scale.y = len / b.len;
    }
  }
  dispose() { CZ.Effects.disposeTree(this.group); }
};

// A piloted mech, as a ragdoll. Everything below is bones and joints.
CZ.RagMech = class RagMech extends CZ.Ragdoll {
  constructor(scene, opts = {}) {
    super(scene, opts);
    const x = opts.x || 0, f = this.facing;
    const P = (dx, dy, r, m) => this.pt(x + dx * f, dy, r, m);
    this.i = {};
    this.i.head = P(0, 16.6, 1.7, 1);
    this.i.chest = P(0, 12.0, 2.2, 2.4);
    this.i.hip = P(0, 7.2, 2.0, 2.2);
    this.i.shL = P(-2.7, 12.9, 1.1, 1); this.i.shR = P(2.7, 12.9, 1.1, 1);
    this.i.elL = P(-4.4, 9.6, 0.9, 0.8); this.i.elR = P(4.4, 9.6, 0.9, 0.8);
    this.i.hdL = P(-5.2, 6.2, 0.9, 0.8); this.i.hdR = P(5.2, 6.2, 0.9, 0.8);
    this.i.knL = P(-1.6, 4.0, 1.1, 1.2); this.i.knR = P(1.6, 4.0, 1.1, 1.2);
    this.i.ftL = P(-1.7, 1.0, 1.0, 1.2); this.i.ftR = P(1.7, 1.0, 1.0, 1.2);
    const I = this.i;

    // skeleton
    this.sNeck = this.stick(I.head, I.chest, 1, 1.55);
    this.stick(I.chest, I.hip, 1);
    this.stick(I.chest, I.shL, 1); this.stick(I.chest, I.shR, 1);
    this.stick(I.hip, I.shL, 0.6); this.stick(I.hip, I.shR, 0.6);
    this.stick(I.head, I.shL, 0.35); this.stick(I.head, I.shR, 0.35);
    this.sArmL = this.stick(I.shL, I.elL, 1, 1.7); this.sArmR = this.stick(I.shR, I.elR, 1, 1.7);
    this.stick(I.elL, I.hdL, 1, 1.8); this.stick(I.elR, I.hdR, 1, 1.8);
    this.sLegL = this.stick(I.hip, I.knL, 1, 1.7); this.sLegR = this.stick(I.hip, I.knR, 1, 1.7);
    this.stick(I.knL, I.ftL, 1, 1.8); this.stick(I.knR, I.ftR, 1, 1.8);
    this.stick(I.knL, I.knR, 0.12); this.stick(I.shL, I.shR, 0.5);

    // armour
    const grey = 'mechGrey';
    this.bone(I.chest, I.hip, 5.4, 4.0, this.pal, (m, h) => {
      const core = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.4), new THREE.MeshBasicMaterial({ color: this.glow }));
      core.position.set(0, 0.6, 2.3); h.add(core); this.core = core;
      const pack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.4, 1.6), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('mech', grey, 4, 3, 5) }));
      pack.position.set(0, 0.8, -2.7); h.add(pack);
    });
    this.headBone = this.bone(I.head, I.chest, 2.8, 2.8, this.pal, (m, h) => {
      m.scale.y = 0.46; m.position.y = 1.7;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 0.4), new THREE.MeshBasicMaterial({ color: this.glow }));
      visor.position.set(0, 1.4, 1.6); h.add(visor); this.visor = visor;
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.5), new THREE.MeshToonMaterial({ color: this.trim }));
      crest.position.set(0, 2.9, 0.8); h.add(crest);
      for (const s of [-1, 1]) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 1.4), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('mech', grey, 1, 1.2, 5) }));
        fin.position.set(s * 1.5, 2.0, -0.2); h.add(fin);
      }
    });
    for (const [sh, el, hd, side] of [[I.shL, I.elL, I.hdL, -1], [I.shR, I.elR, I.hdR, 1]]) {
      this.bone(sh, el, 2.4, 3.0, this.pal, (m, h) => {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 3.2), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('mech', this.pal, 2.8, 2.4, 5) }));
        pad.position.y = 1.3; h.add(pad);
      });
      this.bone(el, hd, 2.1, 2.1, grey, (m, h) => {
        const fist = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.5, 2.1), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('mech', grey, 1.9, 1.5, 5) }));
        fist.position.y = -1.2; h.add(fist);
      });
    }
    for (const [hip, kn, ft] of [[I.hip, I.knL, I.ftL], [I.hip, I.knR, I.ftR]]) {
      this.bone(hip, kn, 2.6, 2.8, this.pal);
      this.bone(kn, ft, 2.4, 2.8, grey, (m, h) => {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 4.2), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('mech', this.pal, 2.8, 1.2, 5) }));
        foot.position.set(0, -1.5, 0.9); h.add(foot);
      });
    }
    // beam saber on the right hand
    this.saber = new THREE.Group();
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('mech', grey, 1, 2, 5) }));
    this.saber.add(hilt);
    this.blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 12, 0.9), new THREE.MeshBasicMaterial({ color: this.glow, transparent: true, opacity: 0.9 }));
    this.blade.position.y = 7; this.saber.add(this.blade);
    this.bladeCore = new THREE.Mesh(new THREE.BoxGeometry(0.36, 12.2, 0.36), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.bladeCore.position.y = 7; this.saber.add(this.bladeCore);
    this.saberLight = new THREE.PointLight(this.glow, 3, 50); this.saberLight.position.y = 6; this.saber.add(this.saberLight);
    this.group.add(this.saber);
    this.armGone = { L: false, R: false }; this.legGone = { L: false, R: false }; this.headGone = false;
  }

  // The animation is all physics targets: the torso is sprung over the hips,
  // the legs step through a gait cycle, the arms counter-swing, and every pose
  // is a spring, so a hit or a lost limb bends it instead of breaking it.
  // move: -1, 0 or 1 - which way it is walking this frame.
  balance(dt, lean = 0, strength = 1, move = 0) {
    if (this.headGone) return;
    const I = this.i;
    const k = CZ.clamp(16 * strength * dt, 0, 0.34);
    const air = !this.grounded();
    const f = this.facing;      // the rig is mirrored when it faces left
    if (this.armBusy > 0) this.armBusy -= dt;
    // one clock drives legs, arms and the idle sway, so they stay in step
    this.gaitT = (this.gaitT || 0) + dt * (move ? 8.5 : 1.5);
    const g = this.gaitT;

    // the legs hold the hips up over whichever feet are left
    const feet = [];
    if (!this.legGone.L) feet.push(this.pts[I.ftL]);
    if (!this.legGone.R) feet.push(this.pts[I.ftR]);
    // ...but only while they are on something. In the air the legs tuck toward
    // the hips instead, and springing the hips back over them would lift the
    // whole rig by its own bootstraps.
    if (feet.length && !air) {
      const fx = feet.reduce((a, p) => a + p.x, 0) / feet.length;
      const fy = feet.reduce((a, p) => a + p.y, 0) / feet.length;
      this.springTo(I.hip, fx + lean * 0.8 + move * 0.6, fy + 6.2, k * 0.9, 0.2);
      // the hips rise and fall once per step, like weight passing over a leg.
      // carry 1 = move the point without handing it any velocity, so the bob
      // is purely cosmetic and cannot pump the rig into the air.
      const bob = move ? Math.abs(Math.sin(g)) * 0.5 : Math.sin(g) * 0.14;
      const hp = this.pts[I.hip];
      this.springTo(I.hip, hp.x, hp.y + bob, 0.3, 1);
    }
    const hip = this.pts[I.hip];
    // the torso leans into the walk and rocks against the stride
    const twist = move ? Math.sin(g) * 0.5 * move : 0;
    this.springTo(I.chest, hip.x + lean * 1.5 + move * 0.9, hip.y + 4.8, k, 0.2);
    const chest = this.pts[I.chest];
    this.springTo(I.head, chest.x + lean * 1.3 + move * 0.5 + twist * 0.3,
      chest.y + 4.6 + (move ? Math.sin(g * 2) * 0.18 : 0), k * 0.95, 0.2);

    // ── legs: a stride when walking, a tuck in the air, a weight shift at rest
    for (const [kn, ft, s, side] of [[I.knL, I.ftL, -1, 'L'], [I.knR, I.ftR, 1, 'R']]) {
      if (this.legGone[side]) continue;
      const ph = g + (s < 0 ? 0 : Math.PI);
      if (air) {                                  // knees up, feet tucked under
        this.springTo(kn, hip.x + s * f * 1.2 + move * 1.2, hip.y - 2.6, k * 0.6, 0.95);
        this.springTo(ft, hip.x + s * f * 1.3, hip.y - 4.4, k * 0.5, 0.95);
        continue;
      }
      const step = move ? Math.cos(ph) * 3.0 * move : 0;
      const lift = move ? Math.max(0, Math.sin(ph)) * 1.6 : 0;
      // while walking the legs are posed, not pushed: carry ~0.85 moves them
      // without handing the rig velocity, so a stride cannot lift it off the floor
      const carry = move ? 0.85 : 0.1;
      this.springTo(kn, hip.x + s * f * 1.3 + step * 0.6, hip.y - 3.2 + lift * 0.45, k * 0.7, move ? 0.8 : 0.15);
      const footY = lift > 0.05 ? 1.0 + lift : Math.min(this.pts[ft].y, 1.1);
      this.springTo(ft, hip.x + s * f * 1.5 + step, footY, k * (move ? 0.8 : 0.45), carry);
    }

    // ── arms: counter-swing against the legs, unless the sword arm is busy
    for (const [sh, el, s, side] of [[I.shL, I.elL, -1, 'L'], [I.shR, I.elR, 1, 'R']]) {
      if (this.armGone[side]) continue;
      if (side === 'R' && this.armBusy > 0) continue;
      const ph = g + (s < 0 ? Math.PI : 0);
      const swing = move ? Math.cos(ph) * 2.0 * move : Math.sin(g * 0.8 + s) * 0.35;
      const S = this.pts[sh];
      this.springTo(el, S.x + s * f * 1.5 + swing, S.y - 3.0 + (air ? 0.9 : 0), k * 0.5, 0.9);
    }
  }

  // A sword swing with a wind-up and a follow-through: the hand is dragged
  // along an arc and the rest of the body is pulled around by its own joints.
  // k: 0 → 1 across the swing.
  swingArc(k, facing) {
    const I = this.i, chest = this.pts[I.chest];
    this.armBusy = 0.12;
    // ease back for the first fifth, then whip through
    const e = k < 0.22 ? -k / 0.22 * 0.35 : (k - 0.22) / 0.78;
    const a = Math.PI * 0.95 - e * Math.PI * 1.3;
    const R = 8.2 * (0.82 + 0.18 * Math.min(1, k * 3));
    const pull = k < 0.22 ? 0.3 : 0.45;
    this.springTo(I.hdR, chest.x + Math.cos(a) * R * facing, chest.y + Math.sin(a) * R, pull, 0.55);
    this.springTo(I.elR, chest.x + Math.cos(a + 0.5) * R * 0.55 * facing, chest.y + Math.sin(a + 0.5) * R * 0.55, pull * 0.7, 0.6);
    // the shoulder follows the cut through
    this.springTo(I.shR, chest.x + facing * (1.6 + e * 1.4), chest.y + 0.9, 0.22, 0.4);
    if (k > 0.25) this.accel(I.chest, facing * 34, 0);
  }
  grounded() {
    const I = this.i;
    return this.pts[I.ftL].y < 1.5 || this.pts[I.ftR].y < 1.5;
  }
  setSaber(on) { this.blade.visible = this.bladeCore.visible = on; this.saberLight.intensity = on ? 3 : 0; }

  syncBones() {
    super.syncBones();
    // saber follows the right hand, pointing away from the elbow
    const I = this.i, h = this.pts[I.hdR], e = this.pts[I.elR];
    const dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1;
    this.saber.position.set(h.x + dx / d * 1.2, h.y + dy / d * 1.2, 0);
    this.saber.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
    this.saber.visible = !this.armGone.R;
  }
  // Cut a limb off: snap its joint and let it fall.
  loseLimb(which) {
    const I = this.i;
    if (which === 'head' && !this.headGone) { this.headGone = true; this.sticks[this.sNeck].broken = true; return this.pts[I.head]; }
    if (which === 'armL' && !this.armGone.L) { this.armGone.L = true; this.sticks[this.sArmL].broken = true; return this.pts[I.elL]; }
    if (which === 'armR' && !this.armGone.R) { this.armGone.R = true; this.sticks[this.sArmR].broken = true; return this.pts[I.elR]; }
    if (which === 'legL' && !this.legGone.L) { this.legGone.L = true; this.sticks[this.sLegL].broken = true; return this.pts[I.knL]; }
    if (which === 'legR' && !this.legGone.R) { this.legGone.R = true; this.sticks[this.sLegR].broken = true; return this.pts[I.knR]; }
    return null;
  }
};
