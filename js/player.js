// The cheese: a wedge with googly eyes that collects limbs and abuses bugs.
CZ.Player = class Player {
  constructor(game) {
    const P = CZ.P;
    this.game = game;
    this.w = P.PLAYER_W; this.h = P.PLAYER_H;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.facing = 1;
    this.grounded = false; this.groundSolid = null; this.wasGrounded = false;
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
    // limbs + glitch state
    this.stabT = 0; this.stabCd = 0; this.stabbing = false;
    this.jumpPresses = []; this.glitchJump = 0; this.glitchJumps = 0;
    this.prevVx = 0; this.accelX = 0;
    this.buildMesh();
  }

  has(id) { return !!this.game.abilities[id]; }
  limb(id) { return !!this.game.limbs[id]; }
  armCount() { return (this.limb('forkArm') ? 1 : 0) + (this.limb('knifeArm') ? 1 : 0); }
  runSpeed() { return this.limb('leg') ? CZ.P.RUN_SPEED : CZ.P.WALK_SPEED; }
  jumpScale() { return this.limb('leg') ? 1 : CZ.P.LEGLESS_JUMP; }
  aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }
  flags() { return { dashing: this.dashing, noclip: this.noclip, inGlitch: this.inGlitch, inCorrupt: this.inCorrupt }; }
  // The business end of a stab, in world space.
  stabBox() {
    if (!this.stabbing) return null;
    return { x: this.facing > 0 ? this.x + this.w * 0.5 : this.x - 0.7, y: this.y + 0.15, w: 1.2, h: 0.7 };
  }

  // ---------- visuals ----------
  buildMesh() {
    const E = CZ.Effects;
    const flat = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, ...o });
    this.mesh = new THREE.Group();
    this.body = new THREE.Group(); this.mesh.add(this.body);

    // wedge body: one clean shape, flat colour, a few round holes
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, -0.5); shape.lineTo(0.5, -0.5); shape.lineTo(0.0, 0.6); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.72, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 1 });
    geo.translate(0, 0, -0.36);
    this.bodyMat = flat(0xffd23f);
    const wedge = new THREE.Mesh(geo, this.bodyMat); wedge.castShadow = true;
    this.wedge = wedge; this.body.add(wedge);
    this.outline = E.outline(wedge, 0.08);
    const rind = new THREE.Mesh(new THREE.BoxGeometry(1.03, 0.16, 0.78), flat(0xe8892a));
    rind.position.y = -0.44; rind.castShadow = false; this.body.add(rind);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0xd9931f });
    for (const [hx, hy, r] of [[-0.33, -0.4, 0.075], [0.34, -0.38, 0.06], [0.02, 0.28, 0.05]]) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(r, 14), holeMat);
      hole.position.set(hx, hy, 0.44); this.body.add(hole);
      const back = hole.clone(); back.position.z = -0.44; back.rotation.y = Math.PI; this.body.add(back);
    }

    // ── googly eyes: white shells with pupils that physically swing ──
    this.eyes = [];
    for (const ex of [-0.175, 0.175]) {
      const socket = new THREE.Group(); socket.position.set(ex, -0.16, 0.47);
      const rim = new THREE.Mesh(new THREE.CircleGeometry(0.172, 18), new THREE.MeshBasicMaterial({ color: 0x2a1a0e }));
      const white = new THREE.Mesh(new THREE.CircleGeometry(0.142, 18), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      white.position.z = 0.012;
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.07, 14), new THREE.MeshBasicMaterial({ color: 0x140c06 }));
      pupil.position.z = 0.026;
      const shine = new THREE.Mesh(new THREE.CircleGeometry(0.022, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shine.position.set(-0.022, 0.026, 0.01); pupil.add(shine);
      socket.add(rim, white, pupil);
      this.body.add(socket);
      this.eyes.push({ socket, pupil, px: 0, py: -0.05, vx: 0, vy: 0 });
    }
    this.brows = [];
    for (const bx of [-0.175, 0.175]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0x2a1a0e }));
      brow.position.set(bx, 0.02, 0.48); this.body.add(brow); this.brows.push(brow);
    }
    this.mouth = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0x2a1a0e }));
    this.mouth.position.set(0, -0.36, 0.48); this.body.add(this.mouth);
    this.mouthLow = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0x2a1a0e }));
    this.mouthLow.position.set(0, -0.43, 0.48); this.mouthLow.visible = false; this.body.add(this.mouthLow);
    this.blush = [];
    for (const bx of [-0.31, 0.31]) {
      const b = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), new THREE.MeshBasicMaterial({ color: 0xff8aa0, transparent: true, opacity: 0.75 }));
      b.position.set(bx, -0.3, 0.47); b.visible = false; this.body.add(b); this.blush.push(b);
    }

    // ── limbs ──
    this.arms = { forkArm: this.makeArm('fork'), knifeArm: this.makeArm('knife') };
    this.arms.forkArm.group.position.set(-0.46, 0.04, 0.42);
    this.arms.knifeArm.group.position.set(0.46, 0.04, 0.42);
    this.body.add(this.arms.forkArm.group, this.arms.knifeArm.group);
    this.legGroup = this.makeLeg();
    this.legGroup.position.set(0.06, -0.34, 0.2);
    this.body.add(this.legGroup);

    this.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), new THREE.MeshBasicMaterial({ color: 0x43b8ff }));
    this.rope.visible = false; this.game.scene.add(this.rope);
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.5 });
    this.blinkT = 2;
  }

  // A utensil arm: a stick shoulder plus a fork head or a knife blade.
  makeArm(kind) {
    const group = new THREE.Group();
    const steel = new THREE.MeshToonMaterial({ color: 0xd8dde6 });
    const dark = new THREE.MeshToonMaterial({ color: 0x8b9099 });
    const pivot = new THREE.Group(); group.add(pivot);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.46, 0.16), dark);
    upper.position.y = -0.23; pivot.add(upper);
    const head = new THREE.Group(); head.position.y = -0.48; pivot.add(head);
    if (kind === 'fork') {
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.14), steel); neck.position.y = -0.1; head.add(neck);
      for (const px of [-0.12, 0, 0.12]) {
        const prong = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.1), steel);
        prong.position.set(px, -0.36, 0); head.add(prong);
      }
    } else {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.56, 0.09), steel);
      blade.position.y = -0.34; head.add(blade);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.56, 0.095), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      edge.position.set(0.07, -0.34, 0.005); head.add(edge);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 4), steel);
      tip.position.y = -0.7; head.add(tip);
    }
    CZ.Effects.outline(upper, 0.05);
    group.visible = false;
    return { group, pivot, head };
  }
  // A toothpick leg with a chunky foot.
  makeLeg() {
    const g = new THREE.Group();
    const pivot = new THREE.Group(); g.add(pivot);
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.24, 0.13), new THREE.MeshToonMaterial({ color: 0xe0c48a }));
    shin.position.y = -0.12; pivot.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), new THREE.MeshToonMaterial({ color: 0xb98f4e }));
    foot.position.set(0.06, -0.28, 0); pivot.add(foot);
    CZ.Effects.outline(shin, 0.05); CZ.Effects.outline(foot, 0.05);
    g.visible = false; g.userData.pivot = pivot;
    return g;
  }

  spawnGhost() {
    const g = new THREE.Mesh(this.wedge.geometry, this.ghostMat.clone());
    g.position.copy(this.mesh.position); g.rotation.copy(this.body.rotation); g.scale.copy(this.body.scale);
    g.userData.life = 0.28; this.game.scene.add(g); this.ghosts.push(g);
  }

  // What face to wear right now.
  mood() {
    if (this.iframes > 0) return 'hurt';
    if (this.stabbing) return 'stab';
    if (this.glitchJump > 0) return 'glitch';
    if (this.dashing || this.pounding) return 'determined';
    if (this.wallSliding) return 'strain';
    if (!this.grounded && this.vy < -16) return 'scared';
    if (!this.grounded && this.vy > 2) return 'happy';
    if (this.grounded && Math.abs(this.vx) > this.runSpeed() * 0.6) return 'happy';
    return 'idle';
  }

  updateVisual(dt) {
    const m = this.mesh, b = this.body;
    m.position.set(this.cx(), this.cy(), 0);
    this.squashV += (1 - this.squash) * 260 * dt; this.squashV *= Math.exp(-dt * 14); this.squash += this.squashV * dt;
    let sx = 1, sy = 1, rz = 0;
    if (this.dashing) { sx = 1.4; sy = 0.78; rz = -this.dashDir.y * this.facing * 0.5; }
    else if (this.stabbing) { sx = 1.25; sy = 0.85; }
    else if (this.pounding) { sx = 0.82; sy = 1.24; rz = this.time * 25; }
    else if (this.hanging) { sy = 1.05; sx = 0.95; }
    else if (!this.grounded) { const f = CZ.clamp(this.vy / 18, -1, 1); sy = 1 + f * 0.18; sx = 1 - f * 0.12; }
    else if (Math.abs(this.vx) > 1) {
      rz = -this.vx * 0.018;
      // legless cheese waddles; with a leg it runs smoothly
      sy = 1 + Math.abs(Math.sin(this.time * (this.limb('leg') ? 20 : 12))) * (this.limb('leg') ? 0.05 : 0.1);
    }
    if (this.wallSliding) rz = this.wallDir * 0.25;
    sy *= this.squash; sx *= (2 - this.squash);
    b.scale.x = CZ.damp(b.scale.x, sx, 22, dt); b.scale.y = CZ.damp(b.scale.y, sy, 22, dt);
    b.position.y = CZ.damp(b.position.y, this.limb('leg') ? 0.16 : 0, 10, dt);   // the leg lifts you off the floor
    if (this.pounding) b.rotation.z = rz; else b.rotation.z = CZ.damp(b.rotation.z, rz, 16, dt);
    b.rotation.y = CZ.damp(b.rotation.y, this.facing > 0 ? 0.2 : -0.2, 14, dt);

    this.updateFace(dt);
    this.updateLimbs(dt);

    const nc = this.noclip || this.inCorrupt;
    this.bodyMat.transparent = nc; this.bodyMat.opacity = nc ? 0.5 : 1;
    this.bodyMat.color.set(nc ? 0xd9a3ff : this.glitchJump > 0 ? 0xbfffd8 : 0xffd23f);
    this.outline.visible = !nc;
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
      if (g.userData.life <= 0) { this.game.scene.remove(g); g.material.dispose(); this.ghosts.splice(i, 1); }
    }
  }

  // Googly pupils swing on their own; brows and mouth carry the expression.
  updateFace(dt) {
    const mood = this.mood();
    const R = 0.066;                       // how far a pupil can roll inside its shell
    for (const e of this.eyes) {
      // gravity, plus the shove from the body's own acceleration
      e.vx += (-this.accelX * 0.05 - e.px * 26) * dt;
      e.vy += (-9 - (this.vy > 6 ? 8 : 0) - e.py * 26) * dt;
      e.vx *= Math.exp(-dt * 3.4); e.vy *= Math.exp(-dt * 3.4);
      e.px += e.vx * dt; e.py += e.vy * dt;
      const d = Math.hypot(e.px, e.py);
      if (d > R) { const k = R / d; e.px *= k; e.py *= k; e.vx *= -0.35; e.vy *= -0.35; }
      // when concentrating, the pupils lock onto where you are going
      if (mood === 'determined' || mood === 'stab') { e.px = CZ.damp(e.px, this.facing * R * 0.7, 18, dt); e.py = CZ.damp(e.py, 0, 18, dt); e.vx = e.vy = 0; }
      e.pupil.position.set(e.px, e.py, 0.026);
      e.pupil.scale.setScalar(mood === 'scared' ? 0.6 : mood === 'glitch' ? 1.25 : 1);
    }
    this.blinkT -= dt; if (this.blinkT < 0) this.blinkT = 1.6 + Math.random() * 3.4;
    const blinking = this.blinkT < 0.11;
    const open = blinking ? 0.08 : mood === 'determined' || mood === 'stab' ? 0.62 : mood === 'strain' ? 0.55
      : mood === 'scared' || mood === 'glitch' ? 1.15 : 1;
    for (const e of this.eyes) e.socket.scale.y = CZ.damp(e.socket.scale.y, open, 34, dt);

    const browSet = {
      idle: [0.1, 0.1], happy: [0.2, 0.13], determined: [-0.5, 0.05], stab: [-0.55, 0.04],
      hurt: [0.45, 0.12], scared: [0.5, 0.14], strain: [-0.3, 0.07], glitch: [-0.18, 0.14],
    }[mood] || [0.1, 0.1];
    this.brows[0].rotation.z = CZ.damp(this.brows[0].rotation.z, -browSet[0], 14, dt);
    this.brows[1].rotation.z = CZ.damp(this.brows[1].rotation.z, browSet[0], 14, dt);
    for (const br of this.brows) br.position.y = CZ.damp(br.position.y, browSet[1], 14, dt);

    // mouth: [scaleX, scaleY, y offset, second bar for an open mouth]
    const mouthSet = {
      idle: [1, 1, -0.36, false], happy: [1.8, 0.9, -0.38, false], determined: [1.5, 0.8, -0.36, false],
      stab: [0.7, 2.4, -0.36, false], hurt: [0.8, 2.2, -0.36, false], scared: [1.1, 2.6, -0.38, false],
      strain: [1.4, 0.7, -0.35, false], glitch: [2.0, 1.4, -0.37, true],
    }[mood] || [1, 1, -0.36, false];
    this.mouth.scale.x = CZ.damp(this.mouth.scale.x, mouthSet[0], 16, dt);
    this.mouth.scale.y = CZ.damp(this.mouth.scale.y, mouthSet[1], 16, dt);
    this.mouth.position.y = CZ.damp(this.mouth.position.y, mouthSet[2], 16, dt);
    this.mouthLow.visible = mouthSet[3];
    this.mouthLow.scale.x = this.mouth.scale.x * 0.8;
    const wantBlush = mood === 'happy' || mood === 'stab';
    for (const bl of this.blush) { bl.visible = wantBlush; bl.material.opacity = wantBlush ? 0.7 : 0; }
  }

  updateLimbs(dt) {
    const walking = this.grounded && Math.abs(this.vx) > 0.6;
    const cycle = Math.sin(this.time * (this.limb('leg') ? 16 : 10));
    for (const id of ['forkArm', 'knifeArm']) {
      const arm = this.arms[id]; const on = this.limb(id);
      arm.group.visible = on; if (!on) continue;
      const side = id === 'forkArm' ? -1 : 1;
      let target;
      if (this.stabbing && side === this.facing) target = -this.facing * 1.75;      // thrust forward
      else if (this.stabbing) target = this.facing * 0.5;
      else if (this.dashing) target = -this.facing * 1.5;
      else if (!this.grounded) target = side * (this.vy > 0 ? 1.5 : 0.3);
      else if (walking) target = side * 0.5 + cycle * side * 0.55;
      else target = side * 0.5 + Math.sin(this.time * 2 + side) * 0.07;
      arm.pivot.rotation.z = CZ.damp(arm.pivot.rotation.z, target, this.stabbing ? 34 : 12, dt);
    }
    const legOn = this.limb('leg');
    this.legGroup.visible = legOn;
    if (legOn) {
      const p = this.legGroup.userData.pivot;
      let t = 0;
      if (!this.grounded) t = this.vy > 0 ? -0.5 : 0.35;
      else if (walking) t = cycle * 0.85;
      p.rotation.z = CZ.damp(p.rotation.z, t, 16, dt);
    }
  }

  // ---------- spawning / damage ----------
  respawn(x, y) {
    const P = CZ.P;
    this.x = x - this.w / 2; this.y = y + 0.05; this.vx = 0; this.vy = 0; this.hp = P.MAX_HP;
    this.dead = false; this.iframes = 0.5; this.dashing = false; this.pounding = false; this.grappling = false; this.hanging = false; this.hook = null;
    this.noclip = false; this.noclipMeter = P.NOCLIP_MAX; this.inCorrupt = false; this.inGlitch = false; this.jumpsUsed = 0; this.canDash = true;
    this.stabbing = false; this.stabT = 0; this.stabCd = 0; this.glitchJump = 0; this.jumpPresses.length = 0;
    this.lastSafe = { x: this.x, y: this.y }; this.facing = 1; this.body.rotation.set(0, 0, 0);
    this.mesh.visible = true;
  }
  damage(fromX, amount = 1) {
    if (this.iframes > 0 || this.dead) return false;
    this.hp -= amount; CZ.Audio.sfx.hurt(); CZ.Effects.shake(0.6);
    CZ.Effects.burst(this.cx(), this.cy(), 0xffd23f, 8, { spread: 6, up: 5 });
    this.game.flash('rgba(255,60,80,.35)');
    if (this.hp <= 0) { this.die(); return true; }
    this.iframes = CZ.P.IFRAMES;
    const dir = fromX === undefined ? -this.facing : CZ.sign(this.cx() - fromX) || -this.facing;
    this.vx = dir * 9; this.vy = 9; this.dashing = false; this.pounding = false; this.stabbing = false; this.releaseGrapple(); this.grounded = false;
    return true;
  }
  die() {
    if (this.dead) return; this.dead = true; this.deadT = 0; this.hp = 0;
    CZ.Audio.sfx.die(); CZ.Effects.shake(1.2);
    CZ.Effects.burst(this.cx(), this.cy(), 0xffd23f, 28, { spread: 11, up: 8, life: 1.1, size: 1.6 });
    CZ.Effects.burst(this.cx(), this.cy(), 0xe8892a, 10, { spread: 8, up: 6, life: 0.9 });
    this.releaseGrapple(); this.noclip = false;
    this.game.playerDied();
  }
  releaseGrapple() { this.grappling = false; this.hanging = false; this.hook = null; }

  // Mashing JUMP faster than the grounded flag can clear leaves the jump queue stuck open.
  noteJumpPress() {
    const P = CZ.P;
    this.jumpPresses.push(this.time);
    while (this.jumpPresses.length && this.time - this.jumpPresses[0] > P.RAPID_WINDOW) this.jumpPresses.shift();
    if (this.jumpPresses.length >= P.RAPID_PRESSES && this.glitchJump <= 0) {
      this.glitchJump = P.RAPID_TIME; this.glitchJumps = 0;
      this.game.discover('rapidJump');
      CZ.Audio.sfx.unlock(); CZ.Effects.shake(0.3);
      CZ.Effects.burst(this.cx(), this.cy(), 0x39ff88, 14, { spread: 6, up: 3, gravity: 0, life: 0.5 });
    }
  }

  // ---------- physics ----------
  update(dt) {
    const P = CZ.P, I = CZ.Input, L = this.game.level;
    this.time += dt;
    if (this.dead) { this.deadT += dt; this.updateVisual(dt); return; }
    this.accelX = (this.vx - this.prevVx) / Math.max(dt, 1e-4); this.prevVx = this.vx;
    if (this.iframes > 0) this.iframes -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.stabCd > 0) this.stabCd -= dt;
    if (this.wallStick > 0) this.wallStick -= dt;
    if (this.glitchJump > 0) {
      this.glitchJump -= dt;
      if (Math.random() < 0.25) CZ.Effects.burst(this.cx(), this.cy(), 0x39ff88, 1, { spread: 2, up: 1, life: 0.3, size: 0.6, gravity: 0 });
    }

    let axis = I.axisX();
    if (this.wallStick > 0 && axis === this.wallStickDir) axis = 0;
    if (I.pressed('jump')) { this.jumpBuffer = P.JUMP_BUFFER; this.noteJumpPress(); }
    else if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    this.jumpHeld = I.held('jump');
    if (axis !== 0 && !this.dashing && !this.hanging && !this.stabbing) this.facing = axis;

    // ---- noclip ----
    if (this.has('noclip') && I.held('noclip') && this.noclipMeter > 0 && !this.dashing) {
      if (!this.noclip) CZ.Audio.sfx.noclip();
      this.noclip = true; this.noclipMeter -= dt;
      if (this.noclipMeter <= 0) { this.noclipMeter = 0; this.noclip = false; }
    } else {
      this.noclip = false;
      if (this.grounded && !this.inCorrupt) this.noclipMeter = Math.min(P.NOCLIP_MAX, this.noclipMeter + P.NOCLIP_REGEN * dt);
    }

    // ---- grapple ----
    if (this.has('grapple') && I.pressed('grapple') && !this.dashing) {
      if (this.hanging) { this.releaseGrapple(); this.vy = 2; }
      else {
        let best = null, bd = P.GRAPPLE_RANGE;
        for (const h of L.hooks) { const d = Math.hypot(h.x - this.cx(), h.y - this.cy()); if (d < bd && h !== this.hook) { bd = d; best = h; } }
        if (best) { this.hook = best; this.grappling = true; this.hanging = false; this.pounding = false; CZ.Audio.sfx.grapple(); this.jumpsUsed = 0; this.canDash = true; }
      }
    }
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
            this.jumpBuffer = 0; this.releaseGrapple(); this.vy = Math.max(this.vy, 6) + 8; this.vx += axis * 4; CZ.Audio.sfx.doubleJump(); this.jumpsUsed = 1;
            CZ.Effects.burst(this.cx(), this.cy(), 0x43b8ff, 10, { spread: 6, up: 2, gravity: 0 });
          }
        }
      }
      if (this.grappling) { this.moveAndCollide(dt); this.postMove(dt); this.updateVisual(dt); return; }
    }

    // ---- stab (utensil arms, before Clip Dash is found) ----
    if (!this.has('dash') && this.armCount() > 0 && I.pressed('dash') && this.stabCd <= 0 && !this.stabbing) {
      this.stabbing = true; this.stabT = P.STAB_TIME; this.stabCd = P.STAB_COOLDOWN + P.STAB_TIME;
      CZ.Audio.sfx.dash();
      CZ.Effects.burst(this.cx() + this.facing * 0.7, this.cy(), 0xd8dde6, 5, { spread: 3, up: 1, life: 0.25, size: 0.6 });
    }
    if (this.stabbing) {
      this.stabT -= dt;
      this.vx = this.facing * P.STAB_SPEED * Math.max(0.2, this.stabT / P.STAB_TIME);
      if (this.stabT <= 0) { this.stabbing = false; this.vx *= 0.4; }
    }

    // ---- dash ----
    if (this.has('dash') && I.pressed('dash') && this.canDash && this.dashCd <= 0 && !this.dashing) {
      let dx = axis, dy = (I.held('up') ? 1 : 0) - (I.held('down') ? 1 : 0);
      if (dx === 0 && dy === 0) dx = this.facing;
      const len = Math.hypot(dx, dy); this.dashDir = { x: dx / len, y: dy / len };
      this.dashing = true; this.dashT = P.DASH_TIME; this.canDash = false; this.dashCd = P.DASH_COOLDOWN + P.DASH_TIME;
      this.pounding = false; this.wasGroundDash = this.grounded; this.noclip = false;
      if (dx !== 0) this.facing = CZ.sign(dx);
      CZ.Audio.sfx.dash(); CZ.Effects.burst(this.cx(), this.cy(), 0x39ff88, 8, { spread: 3, up: 0, gravity: 0, life: 0.3 });
      this.dashGhostT = 0;
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

    // ---- pound ----
    if (this.has('pound') && !this.grounded && !this.dashing && !this.pounding && I.pressed('down') && this.coyote <= 0) {
      this.pounding = true; this.vy = -P.POUND_SPEED; this.vx *= 0.25; CZ.Audio.sfx.poundStart();
    }
    if (this.pounding) { this.vy = -P.POUND_SPEED; this.vx = CZ.damp(this.vx, 0, 6, dt); }

    // ---- run ----
    if (!this.dashing && !this.pounding && !this.stabbing) {
      const top = this.runSpeed();
      const excess = Math.abs(this.vx) > top;
      if (axis !== 0) {
        const accel = this.grounded ? P.RUN_ACCEL : P.AIR_ACCEL;
        if (!excess || CZ.sign(this.vx) !== axis) this.vx = CZ.clamp(this.vx + axis * accel * dt, -top, top);
        else this.vx -= CZ.sign(this.vx) * (this.grounded ? 20 : P.AIR_FRICTION) * dt;   // bleed carried speed slowly
      } else {
        const fr = this.grounded ? P.GROUND_FRICTION : P.AIR_FRICTION;
        const s = CZ.sign(this.vx); this.vx -= s * fr * dt; if (CZ.sign(this.vx) !== s) this.vx = 0;
      }
    }

    // ---- wall slide ----
    this.wallSliding = false;
    if (this.has('wallJump') && !this.grounded && !this.dashing && !this.pounding && this.wallDir !== 0 && this.vy < 0 && (axis === this.wallDir || this.wallStick > 0)) {
      this.wallSliding = true; this.vy = Math.max(this.vy, -P.WALL_SLIDE); this.canDash = true; this.jumpsUsed = Math.min(this.jumpsUsed, 1);
      if (Math.random() < 0.3) CZ.Effects.burst(this.x + (this.wallDir > 0 ? this.w : 0), this.y + 0.3, 0xdddddd, 1, { spread: 1, up: 1, life: 0.3, size: 0.6 });
    }

    // ---- jump ----
    if (this.jumpBuffer > 0 && !this.dashing) {
      let jumped = false;
      if (this.grounded || this.coyote > 0) {
        this.vy = P.JUMP_VEL * this.jumpScale(); jumped = true; this.jumpsUsed = 1; CZ.Audio.sfx.jump();
        if (this.time - this.groundDashEnd < P.WAVEDASH_WINDOW) {
          this.vx = this.facing * Math.max(Math.abs(this.vx), P.DASH_SPEED * 0.8); CZ.Effects.burst(this.cx(), this.y, 0x39ff88, 10, { spread: 5, up: 1, gravity: 10, life: 0.4 });
        }
        CZ.Effects.burst(this.cx(), this.y, 0xffffff, 5, { spread: 3, up: 1, life: 0.3, size: 0.7 });
        this.squash = 1.2;
      } else if (this.wallSliding || (this.has('wallJump') && this.wallDir !== 0 && !this.grounded && !this.pounding)) {
        this.vy = P.WALL_JUMP_VY; this.vx = -this.wallDir * P.WALL_JUMP_VX; this.facing = -this.wallDir;
        this.wallStick = P.WALL_STICK; this.wallStickDir = this.wallDir; jumped = true; this.jumpsUsed = 1; CZ.Audio.sfx.wallJump();
        CZ.Effects.burst(this.x + (this.wallDir > 0 ? this.w : 0), this.cy(), 0xffffff, 6, { spread: 4, up: 2, life: 0.3, size: 0.7 });
      } else if (this.glitchJump > 0 && !this.pounding) {
        // the queue never cleared: every press keeps launching you
        this.vy = P.JUMP_VEL * this.jumpScale() * 0.92; jumped = true; this.glitchJumps++;
        CZ.Audio.sfx.doubleJump();
        CZ.Effects.burst(this.cx(), this.y, 0x39ff88, 8, { spread: 4, up: -1, gravity: -6, life: 0.35 });
        this.squash = 1.25;
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
    // X
    this.x += this.vx * dt; this.wallDir = 0;
    for (const s of solids) if (CZ.overlap(this.aabb(), s)) {
      if (this.y >= s.y + s.h - 0.1 && this.vy <= 0.01) continue;
      const penL = this.x + this.w - s.x, penR = s.x + s.w - this.x;
      if (penL <= penR) { this.x = s.x - this.w; if (!this.grounded) this.wallDir = 1; }
      else { this.x = s.x + s.w; if (!this.grounded) this.wallDir = -1; }
      if (this.dashing) this.dashT = 0;
      if (this.stabbing) { this.stabbing = false; this.stabT = 0; }
      if (this.vx !== 0 && !this.dashing) this.vx = s.mover ? s.vx : 0;
    }
    // Y
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
      this.game.shockwave(this.cx(), this.y, 3.2);
      if (s && s.cracked) { this.game.level.breakCracked(s); this.grounded = false; this.vy = -2; this.groundSolid = null; }
      this.squash = 0.55;
    } else {
      CZ.Audio.sfx.land(); this.squash = 0.72;
      if (this.vy < -12) CZ.Effects.burst(this.cx(), this.y, 0xffffff, 4, { spread: 3, up: 1, life: 0.3, size: 0.6 });
    }
  }

  postMove(dt) {
    const L = this.game.level, box = this.aabb();
    this.inGlitch = false; this.inCorrupt = false;
    for (const s of L.solids) if (!s.broken && CZ.overlap(box, s)) { if (s.glitch) this.inGlitch = true; if (s.corrupt) this.inCorrupt = true; }
    if (this.inCorrupt && !this.noclip) {
      this.x = this.lastSafe.x; this.y = this.lastSafe.y; this.vx = 0; this.vy = 0; this.inCorrupt = false;
      this.game.toast('CORRUPT DATA - meter ran out');
      this.damage(undefined, 1);
    }
    const pad = 0.14; const hb = { x: box.x + pad, y: box.y + pad, w: box.w - pad * 2, h: box.h - pad * 2 };
    for (const hz of L.hazards) if (hz.active && CZ.overlap(hb, hz)) {
      if (hz.kind === 'laser') { if (!this.dashing) this.damage(hz.x + hz.w / 2); }
      else if (!(hz.kind === 'press' && this.dashing)) { this.die(); return; }
    }
    for (const b of L.bounces) if (this.vy <= 0 && CZ.overlap({ x: box.x, y: box.y - 0.15, w: box.w, h: 0.4 }, { x: b.x, y: b.y, w: b.w, h: b.h + 0.2 })) {
      const wasPound = this.pounding; this.pounding = false; this.dashing = false;
      this.vy = wasPound ? 31 : 24; this.grounded = false; this.jumpsUsed = 1; this.canDash = true; b.pad.scale.y = 0.3;
      CZ.Audio.sfx.bounce(); CZ.Effects.burst(b.x + b.w / 2, b.y + 0.4, 0x39ff88, 10, { spread: 5, up: 4 }); this.squash = 1.35;
    }
  }
};
