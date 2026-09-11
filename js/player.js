// The player is a wheel of cheese. It rolls, spins, jumps and pokes, it melts
// near heat, and every hit cuts a wedge out of it. Mech parts bolt on as you
// find machines to feed yourself into.
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
    this.spin = 0; this.spinT = 0; this.spinCd = 0;          // spin attack
    this.pokeT = 0; this.pokeCd = 0;                          // toothpick poke
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
  // Reach of the poke, in world space, while the toothpick is out.
  pokeBox() {
    if (this.pokeT <= 0) return null;
    return { x: this.facing > 0 ? this.x + this.w * 0.6 : this.x - 0.8, y: this.y + 0.15, w: 1.1, h: 0.7 };
  }

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
    // Two googly eyes, deliberately mismatched: different sizes, different
    // heights, pupils that swing on their own and never quite agree.
    this.eyes = [];
    const EYE = [
      { x: -0.25, y: 0.12, r: 0.3, pr: 0.14, tilt: 0.16 },
      { x: 0.24, y: 0.0, r: 0.235, pr: 0.125, tilt: -0.1 },
    ];
    for (const cfg of EYE) {
      const socket = new THREE.Group(); socket.position.set(cfg.x, cfg.y, 0); socket.rotation.z = cfg.tilt;
      socket.add(new THREE.Mesh(new THREE.CircleGeometry(cfg.r, 20), new THREE.MeshBasicMaterial({ color: 0x2a1a0e })));
      const white = new THREE.Mesh(new THREE.CircleGeometry(cfg.r - 0.045, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      white.position.z = 0.012; socket.add(white);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(cfg.pr, 16), new THREE.MeshBasicMaterial({ color: 0x140c06 }));
      pupil.position.z = 0.026; socket.add(pupil);
      const shine = new THREE.Mesh(new THREE.CircleGeometry(cfg.pr * 0.28, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shine.position.set(-cfg.pr * 0.3, cfg.pr * 0.34, 0.01); pupil.add(shine);
      this.face.add(socket);
      this.eyes.push({ socket, pupil, px: 0, py: -0.05, vx: 0, vy: 0, tilt: cfg.tilt,
        R: cfg.r - cfg.pr - 0.02, wob: CZ.rand(0.8, 1.35), phase: CZ.rand(0, 6.3) });
    }
    // the toothpick it pokes with
    this.poker = new THREE.Group(); this.poker.position.set(0, -0.05, 0.15); this.body.add(this.poker);
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.09), flat(0xe0c48a));
    stick.position.x = 0.31; this.poker.add(stick);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 4), flat(0xd8dde6));
    tip.position.x = 0.7; tip.rotation.z = -Math.PI / 2; this.poker.add(tip);
    this.poker.visible = false;

    // mech parts, revealed as they are installed
    this.parts = {};
    this.buildParts();

    this.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), new THREE.MeshBasicMaterial({ color: 0x43b8ff }));
    this.rope.visible = false; this.game.scene.add(this.rope);
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.5 });
    this.blinkT = 2;
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
    if (this.pokeT > 0) return 'poke';
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
    if (!this.spinning()) this.roll -= (this.vx * dt) / this.r;
    else this.roll -= dt * 26 * (this.facing || 1);
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
    if (!this.grounded && !this.spinning()) { const f = CZ.clamp(this.vy / 18, -1, 1); sy *= 1 + f * 0.14; sx *= 1 - f * 0.1; }
    sy *= this.squash; sx *= (2 - this.squash);
    b.scale.x = CZ.damp(b.scale.x, sx, 22, dt); b.scale.y = CZ.damp(b.scale.y, sy, 22, dt);
    b.position.y = CZ.damp(b.position.y, -melt * 0.12, 10, dt);

    this.cheeseMat.color.setHex(this.noclip || this.inCorrupt ? 0xd9a3ff : melt > 0.05 ? 0xffc06a : 0xffffff);
    this.cheeseMat.transparent = this.noclip || this.inCorrupt;
    this.cheeseMat.opacity = this.noclip || this.inCorrupt ? 0.5 : 1;
    this.rindMat.color.setHex(melt > 0.4 ? 0xff7a1f : 0xe8892a);

    this.face.position.y = -melt * 0.1;
    this.face.rotation.z = CZ.damp(this.face.rotation.z, this.spinning() ? 0 : -this.vx * 0.012, 12, dt);
    this.face.scale.setScalar(this.spinning() ? 0.9 : 1);
    this.updateFace(dt);

    // poke
    this.poker.visible = this.pokeT > 0;
    this.poker.scale.x = this.pokeT > 0 ? CZ.clamp(1 - Math.abs(this.pokeT / CZ.P.STAB_TIME - 0.5) * 1.2, 0.25, 1) : 0.1;
    this.poker.rotation.z = this.facing > 0 ? 0 : Math.PI;

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

  // Only eyes. No brows, no mouth: the googly pupils carry the whole performance.
  updateFace(dt) {
    const mood = this.mood();
    for (const e of this.eyes) {
      // a real googly eye: a weight on a loose spring that overshoots, rattles
      // off the rim and takes its time settling
      const R = e.R;
      e.vx += (-this.accelX * 0.07 * e.wob - e.px * 15 + Math.sin(this.time * 5.5 + e.phase) * 1.4) * dt;
      e.vy += (-11 * e.wob - (this.vy > 6 ? 10 : 0) - e.py * 15) * dt;
      e.vx *= Math.exp(-dt * 2.1); e.vy *= Math.exp(-dt * 2.1);
      e.px += e.vx * dt; e.py += e.vy * dt;
      const d = Math.hypot(e.px, e.py);
      if (d > R) { const k = R / d; e.px *= k; e.py *= k; e.vx *= -0.5; e.vy *= -0.5; }
      if (this.spinning()) { const a = this.time * 22 * e.wob + e.phase; e.px = Math.cos(a) * R; e.py = Math.sin(a) * R; e.vx = e.vy = 0; }
      else if (mood === 'poke') { e.px = CZ.damp(e.px, this.facing * R * 0.8, 18, dt); e.py = CZ.damp(e.py, 0, 18, dt); e.vx = e.vy = 0; }
      e.pupil.position.set(e.px, e.py, 0.026);
      e.pupil.scale.setScalar(mood === 'scared' ? 0.55 : mood === 'melting' ? 1.35 : mood === 'hurt' ? 1.2 : 1);
      // the eye itself is glued on badly and wobbles with the wheel
      e.socket.rotation.z = e.tilt + Math.sin(this.time * 3.2 + e.phase) * 0.08;
    }
    this.blinkT -= dt; if (this.blinkT < 0) this.blinkT = 1.6 + Math.random() * 3.4;
    const open = this.blinkT < 0.11 ? 0.08 : mood === 'determined' || mood === 'poke' ? 0.58
      : mood === 'melting' ? 0.45 : mood === 'scared' ? 1.2 : 1;
    for (const e of this.eyes) e.socket.scale.y = CZ.damp(e.socket.scale.y, open, 34, dt);
  }

  partCount() { return CZ.ABILITY_ORDER.filter(id => this.has(id)).length; }

  // ---------- damage ----------
  respawn(x, y) {
    const P = CZ.P;
    this.x = x - this.w / 2; this.y = y + 0.05; this.vx = 0; this.vy = 0;
    const healed = this.hp !== P.MAX_HP; this.hp = P.MAX_HP; if (healed) this.rebuildWheel();
    this.dead = false; this.iframes = 0.5; this.dashing = false; this.pounding = false; this.grappling = false; this.hanging = false; this.hook = null;
    this.noclip = false; this.noclipMeter = P.NOCLIP_MAX; this.inCorrupt = false; this.inGlitch = false; this.jumpsUsed = 0; this.canDash = true;
    this.spinT = 0; this.spinCd = 0; this.pokeT = 0; this.pokeCd = 0; this.heat = 0;
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
    if (this.pokeCd > 0) this.pokeCd -= dt;
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

    // ---- poke / winch ----
    if (I.pressed('grapple') && !this.dashing) {
      if (this.has('grapple')) {
        if (this.hanging) { this.releaseGrapple(); this.vy = 2; }
        else {
          let best = null, bd = P.GRAPPLE_RANGE;
          for (const h of L.hooks) { const d = Math.hypot(h.x - this.cx(), h.y - this.cy()); if (d < bd && h !== this.hook) { bd = d; best = h; } }
          if (best) { this.hook = best; this.grappling = true; this.hanging = false; this.pounding = false; CZ.Audio.sfx.grapple(); this.jumpsUsed = 0; this.canDash = true; }
        }
      } else if (this.pokeCd <= 0) {
        this.pokeT = P.STAB_TIME; this.pokeCd = P.STAB_COOLDOWN + P.STAB_TIME;
        CZ.Audio.sfx.shoot();
      }
    }
    if (this.pokeT > 0) this.pokeT -= dt;

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
      } else if (!this.has('dash') && this.spinCd <= 0) {
        this.spinT = P.SPIN_TIME; this.spinCd = P.SPIN_COOLDOWN + P.SPIN_TIME;
        this.vx = this.facing * P.SPIN_SPEED;
        CZ.Audio.sfx.dash(); CZ.Effects.burst(this.cx(), this.cy(), 0xffd23f, 8, { spread: 4, up: 1, life: 0.3 });
      }
    }
    if (this.spinT > 0) {
      this.spinT -= dt;
      this.vx = this.facing * P.SPIN_SPEED * Math.max(0.35, this.spinT / P.SPIN_TIME);
      if (Math.random() < 0.5) CZ.Effects.burst(this.cx(), this.y + 0.1, 0xffe98a, 1, { spread: 2, up: 1, life: 0.25, size: 0.6 });
    }
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
    if (!this.dashing && !this.pounding && this.spinT <= 0) {
      const top = P.RUN_SPEED * (1 - this.heat * 0.4);          // soft cheese does not roll well
      const excess = Math.abs(this.vx) > top;
      if (axis !== 0) {
        const accel = (this.grounded ? P.ROLL_ACCEL : P.AIR_ACCEL) * (1 - this.heat * 0.5);
        if (!excess || CZ.sign(this.vx) !== axis) this.vx = CZ.clamp(this.vx + axis * accel * dt, -top, top);
        else this.vx -= CZ.sign(this.vx) * (this.grounded ? 8 : P.AIR_FRICTION) * dt;
      } else {
        const fr = (this.grounded ? P.ROLL_FRICTION : P.AIR_FRICTION) * (1 + this.heat * 3);
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
    this.x += this.vx * dt; this.wallDir = 0;
    for (const s of solids) if (CZ.overlap(this.aabb(), s)) {
      if (this.y >= s.y + s.h - 0.1 && this.vy <= 0.01) continue;
      const penL = this.x + this.w - s.x, penR = s.x + s.w - this.x;
      if (penL <= penR) { this.x = s.x - this.w; if (!this.grounded) this.wallDir = 1; }
      else { this.x = s.x + s.w; if (!this.grounded) this.wallDir = -1; }
      if (s.breakable && (this.dashing || this.spinT > 0)) { this.game.level.breakCrate(s); continue; }
      if (this.dashing) this.dashT = 0;
      if (this.spinT > 0) this.spinT = 0;
      if (this.vx !== 0 && !this.dashing) this.vx = s.mover ? s.vx : 0;
    }
    this.y += this.vy * dt;
    this.grounded = false; let landed = null;
    for (const s of solids) if (CZ.overlap(this.aabb(), s)) {
      if (this.vy <= 0) { this.y = s.y + s.h; landed = s; this.grounded = true; if (this.vy < 0) this.vy = 0; }
      else { this.y = s.y - this.h; this.vy = Math.min(this.vy, 0); if (this.dashing && this.dashDir.y > 0) this.dashT = 0; }
    }
    if (!this.grounded && this.vy <= 0.5) {
      const probe = { x: this.x + 0.06, y: this.y - 0.1, w: this.w - 0.12, h: 0.12 };
      for (const s of solids) if (CZ.overlap(probe, s)) { landed = s; this.grounded = true; this.y = s.y + s.h; if (this.vy < 0) this.vy = 0; break; }
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
      for (const s of solids) if (CZ.overlap(pr, s)) { this.wallDir = this.cx() < s.x + s.w / 2 ? 1 : -1; break; }
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
