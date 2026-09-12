// The player is a wheel of cheese. It rolls, winds up, launches, squashes flat
// to fit through gaps, and melts near heat. Every hit cuts a wedge out of it.
// Mech parts bolt on as you find machines to feed yourself into.
CZ.Player = class Player {
  constructor(game) {
    const P = CZ.P;
    this.game = game;
    this.w = P.PLAYER_W; this.h = P.PLAYER_H; this.r = P.PLAYER_H / 2;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.facing = 1;
    this.grounded = false; this.groundSolid = null;
    this.wallDir = 0; this.wallSliding = false; this.wallStick = 0; this.wallStickDir = 0;
    this.coyote = 0; this.jumpBuffer = 0; this.jumpHeld = false; this.jumpsUsed = 0;
    this.dashT = 0; this.dashCd = 0; this.dashDir = { x: 1, y: 0 }; this.canDash = true; this.dashing = false;
    this.groundDashEnd = -99; this.dashGhostT = 0;
    this.pounding = false;
    this.grappling = false; this.hanging = false; this.hook = null;
    this.noclip = false; this.noclipMeter = P.NOCLIP_MAX; this.inCorrupt = false; this.inGlitch = false;
    this.hp = P.MAX_HP; this.iframes = 0; this.dead = false; this.deadT = 0;
    this.lastSafe = { x: 0, y: 0 };
    this.squash = 1; this.squashV = 0; this.time = 0;
    this.ghosts = [];
    this.spin = 0; this.spinT = 0; this.spinCd = 0;          // charge spin
    this.charge = 0; this.chargeOver = 0; this.spinSpeed = 0; this.spinLen = 0.4;
    this.perfect = false; this.dizzy = 0;
    this.squish = 0; this.squishHeld = false;                 // flattened into a slab
    this.roll = 0;                                            // wheel angle
    this.heat = 0; this.melting = 0;                          // how soft the cheese is
    this.buildMesh();
  }

  has(id) { return !!this.game.abilities[id]; }
  aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }
  flags() { return { dashing: this.dashing, noclip: this.noclip, inGlitch: this.inGlitch, inCorrupt: this.inCorrupt }; }
  spinning() { return this.spinT > 0 || this.dashing; }
  charging() { return this.charge > 0; }
  flat() { return this.squish > 0.4; }

  // ---------- visuals ----------
  buildMesh() {
    const flat = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, ...o });
    this.mesh = new THREE.Group();
    this.body = new THREE.Group(); this.mesh.add(this.body);
    this.wheel = new THREE.Group(); this.body.add(this.wheel);   // spins as it rolls

    this.cheeseMat = new THREE.MeshToonMaterial({ map: CZ.Tex.get('cheese', 'stone'), color: 0xffffff });
    this.rindMat = flat(0xe8892a);
    this.rebuildWheel();

    // face rides on the front and stays upright while the wheel turns
    this.face = new THREE.Group(); this.face.position.z = 0.56; this.body.add(this.face);
    // Two dots and a smile. The dots are just dots - no whites, no glint, no
    // rattling disc - so all they do is squint, widen, blink and look where you
    // are going; the mouth still does the acting.
    this.eyes = [];
    for (const ex of [-0.21, 0.21]) {
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.082, 14), flat(0x22131a));
      dot.position.set(ex, 0.24, 0.01);
      this.face.add(dot);
      this.eyes.push(dot);
    }
    this.blinkT = 2.4;
    this.ey = { open: 1, size: 1, lift: 0 };

    this.mouth = new THREE.Group(); this.mouth.position.set(0, 0.06, 0); this.face.add(this.mouth);
    // the dark inside, a half-disc that opens under the smile line
    this.maw = new THREE.Mesh(new THREE.CircleGeometry(1, 18, Math.PI, Math.PI), flat(0x5c1220));
    this.maw.position.z = -0.01; this.mouth.add(this.maw);
    // the smile itself: a row of chunky pixels that trace the curve
    this.lip = [];
    const LIPS = 13;
    for (let i = 0; i < LIPS; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 0.03), flat(0x22131a));
      this.mouth.add(m); this.lip.push(m);
    }
    // A stupid little tongue that flops out whenever this is going badly or
    // extremely well, which is most of the time.
    this.tongue = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.06), flat(0xff7a9a));
    this.tongue.position.set(0.04, -0.3, 0.02); this.tongue.visible = false; this.mouth.add(this.tongue);
    // how the smile is sitting right now, damped toward whatever the mood wants
    this.sm = { curve: 0.16, open: 0.06, wob: 0, wide: 1 };

    // mech parts, revealed as they are installed
    this.parts = {};
    this.buildParts();

    // the wind-up meter is drawn on the cheese itself: a ring that fills
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(this.r + 0.16, this.r + 0.3, 24, 1, Math.PI / 2, 0.001), this.ringMat);
    this.ring.position.z = 0.6; this.ring.visible = false; this.body.add(this.ring);

    this.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), new THREE.MeshBasicMaterial({ color: 0x43b8ff }));
    this.rope.visible = false; this.game.scene.add(this.rope);
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.5 });
  }

  // The wheel is drawn as a partial cylinder: missing wedges are damage.
  rebuildWheel() {
    const frac = CZ.clamp(this.hp / CZ.P.MAX_HP, 0.001, 1);
    const span = Math.PI * 2 * frac;
    if (this.wheelMesh) { CZ.Effects.disposeTree(this.wheelMesh); }
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(this.r, this.r, 1.0, 24, 1, false, 0, span), this.cheeseMat);
    body.rotation.x = Math.PI / 2; body.castShadow = true; g.add(body);
    const rind = new THREE.Mesh(new THREE.CylinderGeometry(this.r + 0.04, this.r + 0.04, 0.3, 24, 1, false, 0, span), this.rindMat);
    rind.rotation.x = Math.PI / 2; g.add(rind);
    if (frac < 0.999) {                       // cut faces, pale like fresh cheese
      const cut = new THREE.MeshToonMaterial({ color: 0xffe98a, side: THREE.DoubleSide });
      for (const a of [0, span]) {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(this.r, 1.0), cut);
        f.position.set(Math.cos(a) * this.r / 2, Math.sin(a) * this.r / 2, 0);
        f.rotation.z = a - Math.PI / 2; f.rotation.y = Math.PI / 2;
        g.add(f);
      }
    }
    this.wheelMesh = g; this.wheel.add(g);
  }

  buildParts() {
    const flat = c => new THREE.MeshToonMaterial({ color: c });
    const steel = new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('mech', 'mechGrey', 1, 1, 1) });
    const mk = (id, build) => { const g = new THREE.Group(); build(g); g.visible = false; this.body.add(g); this.parts[id] = g; };
    // spring legs
    mk('doubleJump', g => {
      for (const s of [-1, 1]) {
        const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.3, 6), steel);
        spring.position.set(s * 0.3, -0.55, 0); g.add(spring);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.28), steel);
        foot.position.set(s * 0.3, -0.72, 0); g.add(foot);
      }
    });
    // thruster
    mk('dash', g => {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.5), steel); pack.position.set(-0.5, 0.08, 0); g.add(pack);
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.22, 6), flat(0x3a4048));
      bell.rotation.z = Math.PI / 2; bell.position.set(-0.72, 0.08, 0); g.add(bell);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.5, 6), new THREE.MeshBasicMaterial({ color: 0x9fd4ff }));
      flame.rotation.z = Math.PI / 2; flame.position.set(-1.05, 0.08, 0); flame.visible = false; g.add(flame);
      this.thrustFlame = flame;
    });
    // grip claws
    mk('wallJump', g => {
      for (const s of [-1, 1]) {
        const claw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.14), steel);
        claw.position.set(s * 0.56, 0.1, 0.2); claw.rotation.z = s * 0.5; g.add(claw);
      }
    });
    // hammer fist
    mk('pound', g => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.14), steel); arm.position.set(0.42, 0.34, -0.1); g.add(arm);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.34), steel); head.position.set(0.42, 0.58, -0.1); g.add(head);
    });
    // winch arm
    mk('grapple', g => {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 8), steel);
      drum.rotation.x = Math.PI / 2; drum.position.set(0.48, 0.3, 0.16); g.add(drum);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 4, 8), flat(0x43b8ff));
      hook.position.set(0.66, 0.24, 0.16); g.add(hook);
    });
    // phase core
    mk('noclip', g => {
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), new THREE.MeshToonMaterial({ color: 0xb455ff, emissive: 0x4a1080 }));
      core.position.set(0, 0.5, 0.1); g.add(core); this.phaseCore = core;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 4, 12), new THREE.MeshBasicMaterial({ color: 0xff7bff }));
      ring.position.set(0, 0.5, 0.1); g.add(ring);
    });
    // the cockpit shows up once you have most of a mech
    mk('cockpit', g => {
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.4), steel); canopy.position.set(0, 0.56, 0); g.add(canopy);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.05), new THREE.MeshBasicMaterial({ color: 0x9fd4ff }));
      glass.position.set(0, 0.58, 0.22); g.add(glass);
    });
  }

  spawnGhost() {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(this.r, this.r, 0.8, 14), this.ghostMat.clone());
    g.rotation.x = Math.PI / 2;
    g.position.copy(this.mesh.position);
    g.userData.life = 0.28; this.game.scene.add(g); this.ghosts.push(g);
  }

  mood() {
    if (this.iframes > 0) return 'hurt';
    if (this.heat > 0.45) return 'melting';
    if (this.spinning()) return 'determined';
    if (this.squish > 0.4) return 'squish';
    if (this.wallSliding) return 'strain';
    if (!this.grounded && this.vy < -16) return 'scared';
    if (Math.abs(this.vx) > CZ.P.RUN_SPEED * 0.6) return 'happy';
    return 'idle';
  }

  updateVisual(dt) {
    const m = this.mesh, b = this.body;
    m.position.set(this.cx(), this.cy(), 0);
    this.squashV += (1 - this.squash) * 260 * dt; this.squashV *= Math.exp(-dt * 14); this.squash += this.squashV * dt;

    // rolling: the wheel turns with the distance travelled
    if (this.charge > 0) this.roll -= dt * (8 + this.charge * 46) * (this.facing || 1);
    else if (!this.spinning()) this.roll -= (this.vx * dt) / this.r;
    else this.roll -= dt * 30 * (this.facing || 1);

    // the wind-up ring fills as you hold, and flashes white in the sweet spot
    const P2 = CZ.P, ch = Math.min(1, this.charge);
    this.ring.visible = this.charge > 0.02;
    if (this.ring.visible) {
      const sweet = ch >= P2.PERFECT_FROM && ch <= P2.PERFECT_TO;
      this.ring.geometry.dispose();
      this.ring.geometry = new THREE.RingGeometry(this.r + 0.16, this.r + (sweet ? 0.42 : 0.3), 26, 1,
        Math.PI / 2, Math.max(0.001, ch * Math.PI * 2));
      this.ringMat.color.setHex(sweet ? 0xffffff : this.charge >= 1 ? 0xff4b5c : 0xffd23f);
      this.ring.rotation.z = sweet ? Math.sin(this.time * 40) * 0.08 : 0;
    }
    // at speed you leave afterimages, and the world starts streaking past
    const mo = this.momentum();
    if (mo > 16 && !this.dead) {
      this.ghostT = (this.ghostT || 0) - dt;
      if (this.ghostT <= 0) { this.ghostT = 0.04; this.spawnGhost(); }
    }
    CZ.Comic.speedLines(mo > 21 && !this.dead);
    this.wheel.rotation.z = this.roll;

    // crumbs off the rim, and a trail of them behind a fast roll
    this.crumbT = (this.crumbT || 0) - dt;
    const fast = Math.abs(this.vx);
    if (this.crumbT <= 0 && (this.grounded && fast > 2.2 || this.spinning())) {
      this.crumbT = this.spinning() ? 0.02 : CZ.clamp(0.16 - fast * 0.012, 0.03, 0.16);
      const back = -Math.sign(this.vx || this.facing);
      CZ.Effects.burst(this.cx() + back * this.r * 0.7, this.y + 0.12, this.heat > 0.3 ? 0xffb04a : 0xffe066,
        this.spinning() ? 2 : 1,
        { spread: 1.6 + fast * 0.12, up: 1.4 + fast * 0.1, life: 0.45, size: 0.55, gravity: 34, vx: back * fast * 0.35 });
    }
    if (this.grounded && fast > 6 && Math.random() < 0.5) {
      CZ.Effects.burst(this.cx(), this.y + 0.05, 0xfff0b0, 1, { spread: 0.6, up: 0.6, life: 0.3, size: 0.4, gravity: 12 });
    }

    // soft cheese sags and spreads
    const melt = this.heat;
    let sx = 1 + melt * 0.22, sy = 1 - melt * 0.3;
    if (this.spinning()) { sx *= 1.06; sy *= 1.06; }
    if (!this.grounded && !this.spinning()) { const f = CZ.clamp(this.vy / 18, -1, 1); sy *= 1 + f * 0.22; sx *= 1 - f * 0.16; }
    if (this.squish > 0) { sy *= CZ.lerp(1, CZ.P.SQUISH_H, this.squish); sx *= CZ.lerp(1, CZ.P.SQUISH_W, this.squish); }
    sy *= this.squash; sx *= (2 - this.squash);
    b.scale.x = CZ.damp(b.scale.x, sx, 22, dt); b.scale.y = CZ.damp(b.scale.y, sy, 22, dt);
    b.position.y = CZ.damp(b.position.y, -melt * 0.12, 10, dt);

    this.cheeseMat.color.setHex(this.noclip || this.inCorrupt ? 0xd9a3ff : melt > 0.05 ? 0xffc06a : 0xffffff);
    this.cheeseMat.transparent = this.noclip || this.inCorrupt;
    this.cheeseMat.opacity = this.noclip || this.inCorrupt ? 0.5 : 1;
    this.rindMat.color.setHex(melt > 0.4 ? 0xff7a1f : 0xe8892a);

    this.face.position.y = -melt * 0.1 + this.squish * 0.1;
    this.face.rotation.z = CZ.damp(this.face.rotation.z, this.spinning() ? 0 : -this.vx * 0.012, 12, dt);
    // The face rides on the body but refuses to be squashed with it: it is
    // counter-scaled, so flat cheese still has two properly round eyes on it.
    const fs = this.spinning() ? 0.9 : 1;
    this.face.scale.set(fs / Math.max(0.2, b.scale.x), fs / Math.max(0.2, b.scale.y), 1);
    this.updateFace(dt);

    // parts
    for (const id in this.parts) {
      const on = id === 'cockpit' ? this.partCount() >= 4 : this.has(id);
      this.parts[id].visible = on;
    }
    if (this.thrustFlame) this.thrustFlame.visible = this.dashing;
    if (this.phaseCore) { this.phaseCore.rotation.y += dt * 3; this.phaseCore.material.emissiveIntensity = this.noclip ? 2 : 1; }
    this.body.rotation.y = CZ.damp(this.body.rotation.y, this.facing > 0 ? 0 : Math.PI, 14, dt);

    m.visible = !this.dead && !(this.iframes > 0 && Math.floor(this.iframes * 18) % 2 === 0);

    if (this.grappling && this.hook) {
      this.rope.visible = true;
      const a = new THREE.Vector3(this.cx(), this.cy(), 0), bb = new THREE.Vector3(this.hook.x, this.hook.mesh.position.y, 0);
      const mid = a.clone().add(bb).multiplyScalar(0.5), d = bb.clone().sub(a);
      this.rope.position.copy(mid); this.rope.scale.y = Math.max(0.01, d.length());
      this.rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    } else this.rope.visible = false;

    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i]; g.userData.life -= dt; g.material.opacity = Math.max(0, g.userData.life / 0.28) * 0.5;
      if (g.userData.life <= 0) { CZ.Effects.disposeTree(g); g.material.dispose(); this.ghosts.splice(i, 1); }
    }
  }

  // One mouth, no eyes, and it has to act. Everything the cheese is feeling is
  // in how far the smile bends, how far it opens, and how badly it wobbles.
  //
  // `curve` is the bend: positive is a smile, negative a grimace. `open` is how
  // much of the space between the corners and the bend is dark inside, so the
  // lip always lands exactly on the rim of the hole instead of cutting across
  // it. `wide` stretches the whole thing sideways.
  updateFace(dt) {
    const mood = this.mood(), S = this.sm;
    let curve = 0.27, open = 0, wob = 0, wide = 1;
    if (mood === 'happy') { curve = 0.5; open = 1; }
    else if (mood === 'determined') { curve = 0.2; open = 0.78; wide = 1.2; }
    else if (mood === 'squish') { curve = 0.12; open = 0; wide = 1.6; }
    else if (mood === 'scared') { curve = -0.42; open = 0.92; wide = 0.55; }
    else if (mood === 'hurt') { curve = -0.34; open = 0.72; wob = 0.05; wide = 0.85; }
    else if (mood === 'melting') { curve = -0.14; open = 0.5; wob = 0.02; wide = 1.15; }
    else if (mood === 'strain') { curve = -0.22; open = 0.45; wide = 0.75; }
    if (this.charge > 0.05) { curve = -0.08 - this.charge * 0.14; open = 0.75; wide = 0.75; }
    if (this.dizzy > 0) { curve = 0.04; open = 0.95; wob = 0.06; }
    // a grin spreads; a wince snaps on
    S.curve = CZ.damp(S.curve, curve, curve < S.curve ? 30 : 15, dt);
    S.open = CZ.damp(S.open, open, 18, dt);
    S.wob = CZ.damp(S.wob, wob, 18, dt);
    S.wide = CZ.damp(S.wide, wide, 16, dt);

    // ── the dots ──
    // open: how far the lids are down. size: how big the eye goes. lift: where
    // it sits, so a grin pushes the eyes up into it the way a real one does.
    let eOpen = 1, eSize = 1, eLift = 0;
    if (mood === 'happy') { eOpen = 0.45; eSize = 1.05; eLift = 0.03; }
    else if (mood === 'determined') { eOpen = 0.5; eSize = 1.1; eLift = -0.01; }
    else if (mood === 'squish') { eOpen = 0.35; eSize = 1.3; eLift = -0.05; }
    else if (mood === 'scared') { eOpen = 1; eSize = 1.45; eLift = 0.02; }
    else if (mood === 'hurt') { eOpen = 0.2; eSize = 1.15; eLift = 0; }
    else if (mood === 'melting') { eOpen = 0.55; eSize = 1; eLift = -0.03; }
    else if (mood === 'strain') { eOpen = 0.6; eSize = 1.05; eLift = 0; }
    if (this.charge > 0.05) { eOpen = 0.42 - this.charge * 0.12; eSize = 1.15; }
    if (this.dizzy > 0) { eOpen = 0.32; eSize = 1.25; }
    // a blink, but never in the middle of a wince
    this.blinkT -= dt;
    if (this.blinkT < 0) this.blinkT = 2.2 + Math.random() * 3.6;
    if (this.blinkT < 0.1 && eOpen > 0.5) eOpen = 0.08;
    const E = this.ey;
    E.open = CZ.damp(E.open, eOpen, 30, dt);
    E.size = CZ.damp(E.size, eSize, 16, dt);
    E.lift = CZ.damp(E.lift, eLift, 14, dt);
    // they drift the way you are travelling, so the face leads the roll
    const look = CZ.clamp(this.vx * 0.006, -0.05, 0.05);
    this.eyes.forEach((dot, i) => {
      dot.position.set((i ? 0.21 : -0.21) * (0.9 + S.wide * 0.1) + look, 0.24 + E.lift, 0.01);
      dot.scale.set(E.size, E.size * E.open, 1);
    });

    const bow = S.curve, halfW = 0.4 * S.wide, N = this.lip.length;
    for (let i = 0; i < N; i++) {
      const u = (i / (N - 1)) * 2 - 1;
      const m = this.lip[i];
      m.position.set(u * halfW, -bow * (1 - u * u) + Math.sin(this.time * 15 + i * 1.3) * S.wob, 0);
      m.rotation.z = Math.atan2(2 * bow * u, 1.7);          // follow the slope
      m.scale.set(1.15, 1.05, 1);
    }
    // the hole, sized so its rim is exactly where the lip runs
    const h = Math.abs(bow) * S.open;
    this.maw.visible = h > 0.022;
    this.maw.scale.set(halfW * 0.94, Math.max(0.02, h), 1);
    this.maw.rotation.z = bow < 0 ? Math.PI : 0;            // a grimace opens upward
    this.maw.position.y = 0;
    this.mouth.position.y = -0.07 + Math.abs(bow) * 0.25 + this.heat * 0.02;
    // the tongue lolls out of an open mouth, never out of a closed one
    const lolling = (this.dizzy > 0 || this.squish > 0.4 || this.heat > 0.5
      || Math.abs(this.vx) > 20) && h > 0.07;
    this.tongue.visible = lolling;
    if (lolling) {
      this.tongue.scale.y = 1 + Math.sin(this.time * 17) * 0.3;
      this.tongue.position.set(0.04 + Math.sin(this.time * 9) * 0.05, -h * 0.9, 0.02);
      this.tongue.rotation.z = Math.sin(this.time * 11) * 0.45 - this.vx * 0.015;
    }
  }

  partCount() { return CZ.ABILITY_ORDER.filter(id => this.has(id)).length; }

  // ---------- the charge spin ----------
  // Hold SPIN to wind up on the spot, release to launch. Let go inside the
  // bright band at the top of the wind-up and it launches much harder; hold
  // past the top for too long and it fizzles out.
  updateCharge(dt, axis) {
    const P = CZ.P, I = CZ.Input;
    if (this.spinT > 0) {                    // already launched: coast it out
      this.spinT -= dt;
      const k = Math.max(0.3, this.spinT / this.spinLen);
      this.vx = this.facing * this.spinSpeed * k;
      if (Math.random() < 0.6) {
        CZ.Effects.burst(this.cx() - this.facing * this.r, this.y + 0.15, this.perfect ? 0xffffff : 0xffe98a, 1,
          { spread: 2, up: 1.4, life: 0.3, size: 0.7 });
      }
      if (this.spinT <= 0) this.perfect = false;
      return;
    }
    const held = I.held('dash') && !this.dashing && !this.has('dash');
    if (held && this.spinCd <= 0) {
      if (this.charge === 0) { CZ.Audio.sfx.dash(); this.chargeOver = 0; }
      this.charge = Math.min(1.45, this.charge + dt / P.CHARGE_TIME);
      // plant yourself: winding up costs you your speed
      this.vx = CZ.damp(this.vx, 0, P.CHARGE_GRIP, dt);
      if (axis) this.facing = axis;
      if (this.charge >= 1) {
        this.chargeOver += dt;
        if (this.chargeOver > P.OVERCHARGE) {   // held too long: it fizzles
          this.fizzle();
          return;
        }
      }
      const heavy = this.charge > P.PERFECT_FROM;
      if (Math.random() < (heavy ? 0.9 : 0.35)) {
        const a = CZ.rand(0, 6.3);
        CZ.Effects.burst(this.cx() + Math.cos(a) * this.r, this.cy() + Math.sin(a) * this.r * 0.6,
          heavy ? 0xffffff : 0xffd23f, 1, { spread: 1.6, up: 2, life: 0.35, size: heavy ? 0.9 : 0.6 });
      }
      CZ.Effects.shake(this.charge * 0.18);
      return;
    }
    if (this.charge > 0) this.release();
  }
  release() {
    const P = CZ.P;
    const c = Math.min(1, this.charge);
    this.perfect = c >= P.PERFECT_FROM && c <= P.PERFECT_TO;
    this.spinSpeed = this.perfect ? P.LAUNCH_PERFECT : CZ.lerp(P.LAUNCH_MIN, P.LAUNCH_MAX, c);
    this.spinLen = 0.3 + c * 0.5;
    this.spinT = this.spinLen;
    this.spinCd = P.SPIN_COOLDOWN;
    this.charge = 0; this.chargeOver = 0;
    this.vx = this.facing * this.spinSpeed;
    if (this.perfect) {
      this.iframes = Math.max(this.iframes, 0.5);
      CZ.Audio.sfx.unlock(); CZ.Effects.shake(1.1);
      CZ.Comic.pow('PERFECT', [this.cx(), this.cy() + 1.8, 0], { kind: 'glitch', life: 0.7 });
      CZ.Effects.burst(this.cx(), this.cy(), 0xffffff, 22, { spread: 9, up: 5, life: 0.6, size: 1.2 });
    } else {
      CZ.Audio.sfx.dash(); CZ.Effects.shake(0.4 + c * 0.5);
      CZ.Effects.burst(this.cx(), this.cy(), 0xffd23f, 10 + c * 14, { spread: 6, up: 3, life: 0.5, size: 1 });
    }
  }
  fizzle() {
    this.charge = 0; this.chargeOver = 0; this.spinT = 0;
    this.spinCd = 0.7; this.vy = Math.max(this.vy, 5); this.dizzy = 0.8;
    CZ.Audio.sfx.hurt();
    CZ.Comic.pow('FLOP', [this.cx(), this.cy() + 1.6, 0], { kind: 'hit', life: 0.6 });
    CZ.Effects.burst(this.cx(), this.cy(), 0xd9931f, 10, { spread: 4, up: 2, life: 0.5, size: 0.8 });
  }
  // How much damage your speed is worth right now.
  momentum() { return Math.abs(this.vx) + (this.spinT > 0 ? 6 : 0); }

  // ---------- the squish ----------
  // Hold DOWN on the ground and the wheel spreads into a slab less than half as
  // tall. Gaps you could never roll through you can now slide under. Let go
  // under a low roof and you stay flat until there is room to pop back up.
  updateSquish(dt) {
    const P = CZ.P, I = CZ.Input;
    const want = I.held('down') && this.grounded && !this.dashing && !this.pounding
      && this.spinT <= 0 && this.charge <= 0 && !this.grappling;
    const was = this.squish;
    let target = want ? 1 : 0;
    if (!want && was > 0.02 && this.roofClose()) target = was;   // the roof is holding you down
    this.squish = CZ.damp(this.squish, target, P.SQUISH_RATE, dt);
    if (this.squish < 0.012) this.squish = 0;
    // Only the height is real: the extra width is all show, so squashing can
    // never wedge you into a wall you were standing beside.
    this.h = P.PLAYER_H * CZ.lerp(1, P.SQUISH_H, this.squish);
    if (was < 0.4 && this.squish >= 0.4) {
      CZ.Audio.sfx.land(); this.squashV = -6;
      CZ.Effects.burst(this.cx(), this.y, 0xfff0b0, 7, { spread: 5, up: 1.4, life: 0.4, size: 0.7, gravity: 30 });
      CZ.Comic.pow(CZ.pick(['SPLAT', 'PANCAKE', 'FLOOMP']), [this.cx(), this.y + 1.3, 0], { kind: 'hit', life: 0.45 });
    }
    if (was >= 0.4 && this.squish < 0.4) { this.squash = 1.3; CZ.Audio.sfx.jump(); }
  }
  // Is there something directly over our head, in the space we would pop back into?
  roofClose() {
    const L = this.game.level, P = CZ.P;
    const gap = P.PLAYER_H - this.h;
    if (gap <= 0.02) return false;
    const probe = { x: this.x + 0.1, y: this.y + this.h, w: this.w - 0.2, h: gap + 0.04 };
    for (const s of L.blocking(this.flags())) if (!s.broken && CZ.overlap(probe, s)) return true;
    return false;
  }

  // ---------- damage ----------
  respawn(x, y) {
    const P = CZ.P;
    this.x = x - this.w / 2; this.y = y + 0.05; this.vx = 0; this.vy = 0;
    const healed = this.hp !== P.MAX_HP; this.hp = P.MAX_HP; if (healed) this.rebuildWheel();
    this.dead = false; this.iframes = 0.5; this.dashing = false; this.pounding = false; this.grappling = false; this.hanging = false; this.hook = null;
    this.noclip = false; this.noclipMeter = P.NOCLIP_MAX; this.inCorrupt = false; this.inGlitch = false; this.jumpsUsed = 0; this.canDash = true;
    this.spinT = 0; this.spinCd = 0; this.charge = 0; this.chargeOver = 0; this.dizzy = 0;
    this.squish = 0; this.w = P.PLAYER_W; this.h = P.PLAYER_H; this.heat = 0;
    this.lastSafe = { x: this.x, y: this.y }; this.facing = 1;
    this.mesh.visible = true;
  }
  // Damage literally cuts a wedge out of the wheel.
  damage(fromX, amount = 1) {
    if (this.iframes > 0 || this.dead) return false;
    this.hp -= amount;
    CZ.Audio.sfx.hurt(); CZ.Effects.shake(0.6);
    CZ.Effects.burst(this.cx(), this.cy(), 0xffd23f, 12, { spread: 7, up: 6, size: 1.2 });
    this.game.flash('rgba(255,60,80,.3)');
    CZ.Comic.pow('SLICE', [this.cx(), this.cy() + 1.4, 0], { kind: 'slash', life: 0.5 });
    if (this.hp <= 0) { this.die(); return true; }
    this.rebuildWheel();
    this.iframes = CZ.P.IFRAMES;
    const dir = fromX === undefined ? -this.facing : CZ.sign(this.cx() - fromX) || -this.facing;
    this.vx = dir * 9; this.vy = 9;
    this.dashing = false; this.pounding = false; this.spinT = 0; this.releaseGrapple(); this.grounded = false;
    return true;
  }
  die() {
    if (this.dead) return; this.dead = true; this.deadT = 0; this.hp = 0;
    CZ.Audio.sfx.die(); CZ.Effects.shake(1.2);
    CZ.Effects.burst(this.cx(), this.cy(), 0xffd23f, 30, { spread: 11, up: 8, life: 1.1, size: 1.6 });
    CZ.Effects.burst(this.cx(), this.cy(), 0xe8892a, 12, { spread: 8, up: 6, life: 0.9 });
    CZ.Comic.pow(this.heat > 0.9 ? 'MELTED' : 'SPLAT', [this.cx(), this.cy() + 1, 0], { kind: 'hit', life: 0.9 });
    this.releaseGrapple(); this.noclip = false;
    this.game.playerDied();
  }
  releaseGrapple() { this.grappling = false; this.hanging = false; this.hook = null; }

  // ---------- physics ----------
  update(dt) {
    const P = CZ.P, I = CZ.Input, L = this.game.level;
    this.time += dt;
    if (this.dead) { this.deadT += dt; this.updateVisual(dt); return; }
    this.accelX = (this.vx - (this.prevVx || 0)) / Math.max(dt, 1e-4); this.prevVx = this.vx;
    if (this.iframes > 0) this.iframes -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.spinCd > 0) this.spinCd -= dt;
    if (this.wallStick > 0) this.wallStick -= dt;

    // heat: standing near molten cheese softens you, and soft cheese is slow
    let nearHeat = 0;
    for (const hz of L.hazards) {
      if (hz.kind !== 'goo') continue;
      const dx = Math.max(0, Math.abs(this.cx() - (hz.x + hz.w / 2)) - hz.w / 2);
      const dy = Math.max(0, Math.abs(this.cy() - (hz.y + hz.h / 2)) - hz.h / 2);
      const d = Math.hypot(dx, dy);
      if (d < 6) nearHeat = Math.max(nearHeat, 1 - d / 6);
    }
    this.heat = CZ.clamp(this.heat + (nearHeat > 0 ? nearHeat * dt * 0.55 : -dt * 0.7), 0, 1);
    if (this.heat > 0.35 && Math.random() < this.heat * 0.5) {
      CZ.Effects.burst(this.cx() + CZ.rand(-0.3, 0.3), this.y, 0xffc06a, 1, { spread: 0.6, up: -1, life: 0.5, size: 0.7, gravity: 26 });
    }
    if (this.heat >= 1) { this.die(); return; }

    let axis = I.axisX();
    if (this.wallStick > 0 && axis === this.wallStickDir) axis = 0;
    if (I.pressed('jump')) this.jumpBuffer = P.JUMP_BUFFER;
    else if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    this.jumpHeld = I.held('jump');
    if (axis !== 0 && !this.dashing && !this.hanging) this.facing = axis;

    // ---- phase core ----
    if (this.has('noclip') && I.held('noclip') && this.noclipMeter > 0 && !this.dashing) {
      if (!this.noclip) CZ.Audio.sfx.noclip();
      this.noclip = true; this.noclipMeter -= dt;
      if (this.noclipMeter <= 0) { this.noclipMeter = 0; this.noclip = false; }
    } else {
      this.noclip = false;
      if (this.grounded && !this.inCorrupt) this.noclipMeter = Math.min(P.NOCLIP_MAX, this.noclipMeter + P.NOCLIP_REGEN * dt);
    }

    // ---- winch ----
    if (I.pressed('grapple') && !this.dashing && this.has('grapple')) {
      if (this.hanging) { this.releaseGrapple(); this.vy = 2; }
      else {
        let best = null, bd = P.GRAPPLE_RANGE;
        for (const h of L.hooks) { const d = Math.hypot(h.x - this.cx(), h.y - this.cy()); if (d < bd && h !== this.hook) { bd = d; best = h; } }
        if (best) { this.hook = best; this.grappling = true; this.hanging = false; this.pounding = false; CZ.Audio.sfx.grapple(); this.jumpsUsed = 0; this.canDash = true; }
      }
    }
    this.updateSquish(dt);

    if (this.grappling) {
      const hx = this.hook.x, hy = this.hook.y - 0.9;
      const dx = hx - this.cx(), dy = hy - this.cy(), d = Math.hypot(dx, dy);
      if (this.hanging) {
        this.vx = 0; this.vy = 0; this.x = hx - this.w / 2; this.y = hy - this.h / 2 + Math.sin(this.time * 3) * 0.05;
        if (this.jumpBuffer > 0) { this.jumpBuffer = 0; this.releaseGrapple(); this.vy = P.JUMP_VEL * 1.05; this.vx = axis * P.RUN_SPEED * 1.25; CZ.Audio.sfx.jump(); this.jumpsUsed = 1; }
      } else {
        if (d < 0.5) { this.hanging = true; this.vx = 0; this.vy = 0; }
        else {
          const sp = P.GRAPPLE_SPEED; this.vx = dx / d * sp; this.vy = dy / d * sp;
          if (this.jumpBuffer > 0) {
            this.jumpBuffer = 0; this.releaseGrapple(); this.vy = Math.max(this.vy, 6) + 8; this.vx += axis * 4; CZ.Audio.sfx.doubleJump();
            this.jumpsUsed = 1; CZ.Effects.burst(this.cx(), this.cy(), 0x43b8ff, 10, { spread: 6, up: 2, gravity: 0 });
          }
        }
      }
      if (this.grappling) { this.moveAndCollide(dt); this.postMove(dt); this.updateVisual(dt); return; }
    }

    // ---- spin / thruster dash ----
    if (I.pressed('dash') && !this.dashing) {
      if (this.has('dash') && this.canDash && this.dashCd <= 0) {
        let dx = axis, dy = (I.held('up') ? 1 : 0) - (I.held('down') ? 1 : 0);
        if (dx === 0 && dy === 0) dx = this.facing;
        const len = Math.hypot(dx, dy); this.dashDir = { x: dx / len, y: dy / len };
        this.dashing = true; this.dashT = P.DASH_TIME; this.canDash = false; this.dashCd = P.DASH_COOLDOWN + P.DASH_TIME;
        this.pounding = false; this.wasGroundDash = this.grounded; this.noclip = false;
        if (dx !== 0) this.facing = CZ.sign(dx);
        CZ.Audio.sfx.dash(); CZ.Effects.burst(this.cx(), this.cy(), 0x39ff88, 8, { spread: 3, up: 0, gravity: 0, life: 0.3 });
        this.dashGhostT = 0;
      }
    }
    this.updateCharge(dt, axis);
    if (this.dashing) {
      this.dashT -= dt; this.vx = this.dashDir.x * P.DASH_SPEED; this.vy = this.dashDir.y * P.DASH_SPEED;
      this.dashGhostT -= dt; if (this.dashGhostT <= 0) { this.dashGhostT = 0.03; this.spawnGhost(); }
      if (this.dashT <= 0) {
        this.dashing = false;
        this.vx = this.dashDir.x * P.DASH_SPEED * 0.55; this.vy = this.dashDir.y * P.DASH_SPEED * 0.3;
        if (this.wasGroundDash) this.groundDashEnd = this.time;
      }
    }

    // ---- hammer fist ----
    if (this.has('pound') && !this.grounded && !this.dashing && !this.pounding && I.pressed('down') && this.coyote <= 0) {
      this.pounding = true; this.vy = -P.POUND_SPEED; this.vx *= 0.25; CZ.Audio.sfx.poundStart();
    }
    if (this.pounding) { this.vy = -P.POUND_SPEED; this.vx = CZ.damp(this.vx, 0, 6, dt); }

    // ---- rolling ----
    if (this.dizzy > 0) this.dizzy -= dt;
    if (!this.dashing && !this.pounding && this.spinT <= 0 && this.charge <= 0) {
      const top = P.RUN_SPEED * (1 - this.heat * 0.4) * (this.dizzy > 0 ? 0.45 : 1);
      const excess = Math.abs(this.vx) > top;
      if (axis !== 0) {
        const accel = (this.grounded ? P.ROLL_ACCEL : P.AIR_ACCEL) * (1 - this.heat * 0.5);
        if (!excess || CZ.sign(this.vx) !== axis) this.vx = CZ.clamp(this.vx + axis * accel * dt, -top, top);
        else this.vx -= CZ.sign(this.vx) * (this.grounded ? 8 : P.AIR_FRICTION) * dt;
      } else {
        const base = this.grounded ? CZ.lerp(P.ROLL_FRICTION, P.SQUISH_FRICTION, this.squish) : P.AIR_FRICTION;
        const fr = base * (1 + this.heat * 3);
        const s = CZ.sign(this.vx); this.vx -= s * fr * dt; if (CZ.sign(this.vx) !== s) this.vx = 0;
      }
    }

    // ---- grip claws ----
    this.wallSliding = false;
    if (this.has('wallJump') && !this.grounded && !this.dashing && !this.pounding && this.wallDir !== 0 && this.vy < 0 && (axis === this.wallDir || this.wallStick > 0)) {
      this.wallSliding = true; this.vy = Math.max(this.vy, -P.WALL_SLIDE); this.canDash = true; this.jumpsUsed = Math.min(this.jumpsUsed, 1);
      if (Math.random() < 0.3) CZ.Effects.burst(this.x + (this.wallDir > 0 ? this.w : 0), this.y + 0.3, 0xdddddd, 1, { spread: 1, up: 1, life: 0.3, size: 0.6 });
    }

    // ---- jump ----
    if (this.jumpBuffer > 0 && !this.dashing) {
      let jumped = false;
      if (this.grounded || this.coyote > 0) {
        this.vy = P.JUMP_VEL; jumped = true; this.jumpsUsed = 1; CZ.Audio.sfx.jump();
        if (this.time - this.groundDashEnd < P.WAVEDASH_WINDOW) {
          this.vx = this.facing * Math.max(Math.abs(this.vx), P.DASH_SPEED * 0.8);
          CZ.Effects.burst(this.cx(), this.y, 0x39ff88, 10, { spread: 5, up: 1, gravity: 10, life: 0.4 });
        }
        CZ.Effects.burst(this.cx(), this.y, 0xffffff, 5, { spread: 3, up: 1, life: 0.3, size: 0.7 });
        this.squash = 1.2;
      } else if (this.wallSliding || (this.has('wallJump') && this.wallDir !== 0 && !this.grounded && !this.pounding)) {
        this.vy = P.WALL_JUMP_VY; this.vx = -this.wallDir * P.WALL_JUMP_VX; this.facing = -this.wallDir;
        this.wallStick = P.WALL_STICK; this.wallStickDir = this.wallDir; jumped = true; this.jumpsUsed = 1; CZ.Audio.sfx.wallJump();
        CZ.Effects.burst(this.x + (this.wallDir > 0 ? this.w : 0), this.cy(), 0xffffff, 6, { spread: 4, up: 2, life: 0.3, size: 0.7 });
      } else if (this.has('doubleJump') && this.jumpsUsed < 2 && !this.pounding) {
        this.vy = P.DOUBLE_JUMP_VEL; this.jumpsUsed = 2; jumped = true; CZ.Audio.sfx.doubleJump();
        CZ.Effects.burst(this.cx(), this.y, 0x39ff88, 10, { spread: 5, up: -2, gravity: -10, life: 0.4 });
        this.squash = 1.25;
      } else if (this.pounding && this.has('doubleJump') && this.jumpsUsed < 2) {
        this.pounding = false; this.vy = P.DOUBLE_JUMP_VEL; this.jumpsUsed = 2; jumped = true; CZ.Audio.sfx.doubleJump();
      }
      if (jumped) { this.jumpBuffer = 0; this.coyote = 0; this.grounded = false; this.groundSolid = null; }
    }
    if (!this.jumpHeld && this.vy > 0 && !this.dashing && !this.grappling && this.jumpsUsed > 0 && !this.jumpCut) { this.vy *= P.JUMP_CUT; this.jumpCut = true; }
    if (this.jumpHeld) this.jumpCut = false;

    // ---- gravity & wind ----
    if (!this.dashing && !this.pounding) {
      let g = P.GRAVITY; if (this.noclip) g *= 0.55; if (this.wallSliding) g *= 0.6;
      this.vy -= g * dt;
      for (const w of L.winds) if (CZ.overlap(this.aabb(), w)) { this.vy = Math.min(this.vy + w.fy * dt, 11); this.jumpsUsed = Math.min(this.jumpsUsed, 1); this.canDash = true; }
      this.vy = Math.max(this.vy, -P.MAX_FALL);
    }

    this.moveAndCollide(dt);
    this.postMove(dt);
    this.updateVisual(dt);
  }

  carryByGround(frameDt) {
    const g = this.groundSolid;
    if (g && g.mover && !g.broken && !this.dead) { this.x += g.vx * frameDt; this.y += g.vy * frameDt; }
  }

  moveAndCollide(dt) {
    const L = this.game.level, f = this.flags();
    const solids = L.blocking(f);
    if (this.groundSolid && !this.groundSolid.broken && this.groundSolid.conveyor) this.x += this.groundSolid.conveyor * dt;
    const wasGrounded = this.grounded;
    const mo = this.momentum();                    // speed is the weapon
    this.x += this.vx * dt; this.wallDir = 0;
    for (const s of solids) if (!s.broken && CZ.overlap(this.aabb(), s)) {
      if (this.y >= s.y + s.h - 0.1 && this.vy <= 0.01) continue;
      const preX = this.x;                         // where we were before being pushed out
      const penL = this.x + this.w - s.x, penR = s.x + s.w - this.x;
      if (penL <= penR) { this.x = s.x - this.w; if (!this.grounded) this.wallDir = 1; }
      else { this.x = s.x + s.w; if (!this.grounded) this.wallDir = -1; }
      if (s.door) { this.game.hitDoor(mo); this.vx = -CZ.sign(this.vx || this.facing) * 4; break; }
      if (s.breakable && (this.dashing || this.spinT > 0 || mo >= (s.hard || CZ.P.SMASH_CRATE))) {
        this.game.level.breakCrate(s);
        this.x = preX;                             // you go through it, not into it
        this.vx *= s.hard ? 0.72 : 0.94;           // heavy things cost you speed
        continue;
      }
      if (this.dashing) this.dashT = 0;
      if (this.spinT > 0) this.spinT = 0;
      if (this.vx !== 0 && !this.dashing) this.vx = s.mover ? s.vx : 0;
    }
    this.y += this.vy * dt;
    this.grounded = false; let landed = null;
    for (const s of solids) if (!s.broken && CZ.overlap(this.aabb(), s)) {
      if (this.vy <= 0) { this.y = s.y + s.h; landed = s; this.grounded = true; if (this.vy < 0) this.vy = 0; }
      else { this.y = s.y - this.h; this.vy = Math.min(this.vy, 0); if (this.dashing && this.dashDir.y > 0) this.dashT = 0; }
    }
    if (!this.grounded && this.vy <= 0.5) {
      const probe = { x: this.x + 0.06, y: this.y - 0.1, w: this.w - 0.12, h: 0.12 };
      for (const s of solids) if (!s.broken && CZ.overlap(probe, s)) { landed = s; this.grounded = true; this.y = s.y + s.h; if (this.vy < 0) this.vy = 0; break; }
    }
    // ramps: sit on the slope surface and let gravity pull you along it
    const ramp = L.rampAt(this.cx());
    if (ramp && this.vy <= 0.5 && this.y <= ramp.y + 0.35 && this.y + this.h > ramp.base) {
      this.y = ramp.y; this.vy = 0; this.grounded = true; landed = landed || { x: this.x, y: ramp.y - 1, w: 1, h: 1, ramp: true };
      this.onRamp = ramp.slope; this.rampTop = ramp.top;
      this.vx += -ramp.slope * CZ.P.GRAVITY * 0.42 * dt;   // downhill acceleration
    } else {
      // rolling off the lip of an up-ramp throws you into the air
      if (this.onRamp && this.onRamp * this.vx > 0 && this.vy <= 0.5 && this.y >= (this.rampTop || 0) - 0.6) {
        this.vy = Math.max(this.vy, Math.abs(this.vx) * Math.abs(this.onRamp) * 1.15);
        CZ.Effects.burst(this.cx(), this.y, 0xffe066, 5, { spread: 3, up: 2, life: 0.35, size: 0.6 });
      }
      this.onRamp = 0;
    }
    if (!this.grounded) {
      const pr = { x: this.x - 0.08, y: this.y + 0.1, w: this.w + 0.16, h: this.h - 0.2 };
      for (const s of solids) if (!s.broken && CZ.overlap(pr, s)) { this.wallDir = this.cx() < s.x + s.w / 2 ? 1 : -1; break; }
    }
    this.groundSolid = landed;
    if (this.grounded) {
      if (!wasGrounded) this.onLand(landed);
      this.coyote = CZ.P.COYOTE; this.jumpsUsed = 0; this.canDash = true;
      if (this.groundSolid && !this.groundSolid.mover && !this.groundSolid.conveyor && !this.groundSolid.cracked && !this.groundSolid.glitch && !this.groundSolid.corrupt && !this.inCorrupt && !this.inGlitch) this.lastSafe = { x: this.x, y: this.y };
    } else if (this.coyote > 0) this.coyote -= dt;
    this.x = CZ.clamp(this.x, 0, L.data.width - this.w);
    if (this.y < L.data.deathY) this.die();
  }

  onLand(s) {
    if (this.pounding) {
      this.pounding = false; CZ.Audio.sfx.poundLand(); CZ.Effects.shake(0.9);
      CZ.Effects.burst(this.cx(), this.y, 0xffffff, 16, { spread: 9, up: 3, life: 0.5 });
      CZ.Comic.pow('WHUMP', [this.cx(), this.y + 1.2, 0], { kind: 'hit', life: 0.5 });
      this.game.shockwave(this.cx(), this.y, 3.2);
      if (s && s.cracked) { this.game.level.breakCracked(s); this.grounded = false; this.vy = -2; this.groundSolid = null; }
      this.squash = 0.55;
    } else {
      CZ.Audio.sfx.land(); this.squash = 0.74;
      if (this.vy < -12) CZ.Effects.burst(this.cx(), this.y, 0xffffff, 4, { spread: 3, up: 1, life: 0.3, size: 0.6 });
    }
  }

  postMove(dt) {
    const L = this.game.level, box = this.aabb();
    this.inGlitch = false; this.inCorrupt = false;
    for (const s of L.solids) if (!s.broken && CZ.overlap(box, s)) { if (s.glitch) this.inGlitch = true; if (s.corrupt) this.inCorrupt = true; }
    if (this.inCorrupt && !this.noclip) {
      this.x = this.lastSafe.x; this.y = this.lastSafe.y; this.vx = 0; this.vy = 0; this.inCorrupt = false;
      this.damage(undefined, 1);
    }
    const pad = 0.14; const hb = { x: box.x + pad, y: box.y + pad, w: box.w - pad * 2, h: box.h - pad * 2 };
    for (const hz of L.hazards) if (hz.active && CZ.overlap(hb, hz)) {
      if (hz.kind === 'laser') { if (!this.dashing) this.damage(hz.x + hz.w / 2); }
      else if (hz.kind === 'goo') { this.heat = 1; this.die(); return; }
      else if (!(hz.kind === 'press' && this.dashing)) { this.die(); return; }
    }
    // boost pads: a wheel loves these
    for (const bo of L.boosts) if (CZ.overlap({ x: box.x, y: box.y - 0.2, w: box.w, h: 0.5 }, { x: bo.x, y: bo.y, w: bo.w, h: 0.9 })) {
      const dir = Math.sign(bo.speed);
      if (Math.abs(this.vx) < Math.abs(bo.speed) || Math.sign(this.vx) !== dir) {
        this.vx = bo.speed; this.facing = dir;
        CZ.Audio.sfx.dash();
        CZ.Effects.burst(this.cx(), this.y + 0.2, 0x39ff88, 6, { spread: 4, up: 2, life: 0.35, size: 0.7 });
      }
    }
    for (const b of L.bounces) if (this.vy <= 0 && CZ.overlap({ x: box.x, y: box.y - 0.15, w: box.w, h: 0.4 }, { x: b.x, y: b.y, w: b.w, h: b.h + 0.2 })) {
      const wasPound = this.pounding; this.pounding = false; this.dashing = false;
      this.vy = wasPound ? 31 : 24; this.grounded = false; this.jumpsUsed = 1; this.canDash = true; b.pad.scale.y = 0.3;
      CZ.Audio.sfx.bounce(); CZ.Effects.burst(b.x + b.w / 2, b.y + 0.4, 0x39ff88, 10, { spread: 5, up: 4 }); this.squash = 1.35;
    }
  }
};
