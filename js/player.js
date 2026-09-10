// The cheese. Movement controller + visuals.
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
    this.lastSafe = { x: 0, y: 0 }; this.safeT = 0;
    this.squash = 1; this.squashV = 0; this.landT = 0; this.time = 0;
    this.ghosts = [];
    this.buildMesh();
  }

  has(id) { return !!this.game.abilities[id]; }
  aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }
  flags() { return { dashing: this.dashing, noclip: this.noclip, inGlitch: this.inGlitch, inCorrupt: this.inCorrupt }; }

  // ---------- visuals ----------
  buildMesh() {
    const E = CZ.Effects;
    this.mesh = new THREE.Group();
    this.body = new THREE.Group(); this.mesh.add(this.body);
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, -0.5); shape.lineTo(0.5, -0.5); shape.lineTo(0.0, 0.58); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 });
    geo.translate(0, 0, -0.4);
    this.bodyMat = new THREE.MeshToonMaterial({ map: CZ.Tex.get('cheese', 'stone'), color: 0xffffff, gradientMap: E.toon(0xffffff).gradientMap });
    const wedge = new THREE.Mesh(geo, this.bodyMat); wedge.castShadow = true;
    this.wedge = wedge; this.body.add(wedge);
    this.outline = E.outline(wedge, 0.07);
    // rind stripe at the bottom
    const rind = E.box(1.02, 0.14, 0.9, 0xff8a1f); rind.position.y = -0.47; rind.castShadow = false; this.body.add(rind);
    // square holes, drawn as pixels rather than smooth circles
    const holeMat = new THREE.MeshBasicMaterial({ color: 0xc9781a });
    [[-0.22, -0.32, 0.16], [0.26, -0.28, 0.12], [0.05, 0.22, 0.1], [-0.1, -0.05, 0.09]].forEach(([hx, hy, r]) => {
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(r, r), holeMat); hole.position.set(hx, hy, 0.47); this.body.add(hole);
    });
    // face
    this.eyes = []; this.pupils = [];
    [[-0.16, -0.08], [0.16, -0.08]].forEach(([ex, ey]) => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.position.set(ex, ey, 0.45);
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.1), new THREE.MeshBasicMaterial({ color: 0x1a0f0a }));
      pupil.position.set(0, 0, 0.06); eye.add(pupil);
      this.body.add(eye); this.eyes.push(eye); this.pupils.push(pupil);
    });
    this.brows = [];
    [[-0.16, 0.1], [0.16, 0.1]].forEach(([bx, by], i) => {
      const brow = E.box(0.22, 0.05, 0.05, 0x1a0f0a); brow.castShadow = false; brow.position.set(bx, by, 0.48); this.body.add(brow); this.brows.push(brow);
    });
    this.mouth = E.box(0.18, 0.05, 0.05, 0x1a0f0a); this.mouth.castShadow = false; this.mouth.position.set(0, -0.3, 0.49); this.body.add(this.mouth);
    // grapple rope
    this.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), new THREE.MeshBasicMaterial({ color: 0x43b8ff })); this.rope.visible = false;
    this.game.scene.add(this.rope);
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.5 });
    this.blinkT = 2;
  }

  spawnGhost() {
    const g = new THREE.Mesh(this.wedge.geometry, this.ghostMat.clone());
    g.position.copy(this.mesh.position); g.rotation.copy(this.body.rotation); g.scale.copy(this.body.scale);
    g.userData.life = 0.28; this.game.scene.add(g); this.ghosts.push(g);
  }

  updateVisual(dt) {
    const m = this.mesh, b = this.body;
    m.position.set(this.cx(), this.cy(), 0);
    // squash spring
    const targetSquash = this.dashing ? 1 : 1;
    this.squashV += (targetSquash - this.squash) * 260 * dt; this.squashV *= Math.exp(-dt * 14); this.squash += this.squashV * dt;
    let sx = 1, sy = 1, rz = 0;
    if (this.dashing) { sx = 1.45; sy = 0.75; rz = -this.dashDir.y * this.facing * 0.5; }
    else if (this.pounding) { sx = 0.8; sy = 1.25; rz = this.time * 25; }
    else if (this.hanging) { sy = 1.05; sx = 0.95; }
    else if (!this.grounded) { const f = CZ.clamp(this.vy / 18, -1, 1); sy = 1 + f * 0.18; sx = 1 - f * 0.12; }
    else if (Math.abs(this.vx) > 1) { rz = -this.vx * 0.02; sy = 1 + Math.abs(Math.sin(this.time * 18)) * 0.06; }
    if (this.wallSliding) { rz = this.wallDir * 0.25; }
    // landing squash
    sy *= this.squash; sx *= (2 - this.squash);
    b.scale.x = CZ.damp(b.scale.x, sx, 22, dt); b.scale.y = CZ.damp(b.scale.y, sy, 22, dt);
    if (this.pounding) b.rotation.z = rz; else b.rotation.z = CZ.damp(b.rotation.z, rz, 16, dt);
    b.rotation.y = CZ.damp(b.rotation.y, this.facing > 0 ? 0.25 : -0.25, 14, dt);
    // face
    const look = this.facing * 0.05;
    for (const p of this.pupils) { p.position.x = CZ.damp(p.position.x, look, 20, dt); p.position.y = CZ.damp(p.position.y, CZ.clamp(this.vy * 0.004, -0.05, 0.05), 20, dt); }
    this.blinkT -= dt; const blink = this.blinkT < 0.12;
    if (this.blinkT < 0) this.blinkT = 1.5 + Math.random() * 3;
    const squint = this.dashing || this.grappling;
    for (const e of this.eyes) e.scale.y = CZ.damp(e.scale.y, blink ? 0.1 : squint ? 0.45 : this.pounding ? 1.3 : 1, 30, dt);
    const angry = this.dashing || this.pounding || this.iframes > 0;
    this.brows[0].rotation.z = CZ.damp(this.brows[0].rotation.z, angry ? -0.5 : 0.15, 12, dt);
    this.brows[1].rotation.z = CZ.damp(this.brows[1].rotation.z, angry ? 0.5 : -0.15, 12, dt);
    this.mouth.scale.x = CZ.damp(this.mouth.scale.x, this.iframes > 0 ? 0.5 : angry ? 1.4 : 1, 12, dt);
    this.mouth.scale.y = CZ.damp(this.mouth.scale.y, this.iframes > 0 ? 2.5 : 1, 12, dt);
    // materials
    const nc = this.noclip || this.inCorrupt;
    this.bodyMat.transparent = nc; this.bodyMat.opacity = nc ? 0.5 : 1;
    this.bodyMat.color.set(nc ? 0xd9a3ff : 0xffffff);
    this.outline.visible = !nc;
    m.visible = !this.dead && !(this.iframes > 0 && Math.floor(this.iframes * 18) % 2 === 0);
    // rope
    if (this.grappling && this.hook) {
      this.rope.visible = true;
      const a = new THREE.Vector3(this.cx(), this.cy(), 0), bb = new THREE.Vector3(this.hook.x, this.hook.mesh.position.y, 0);
      const mid = a.clone().add(bb).multiplyScalar(0.5), d = bb.clone().sub(a);
      this.rope.position.copy(mid); this.rope.scale.y = Math.max(0.01, d.length());
      this.rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    } else this.rope.visible = false;
    // ghosts
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i]; g.userData.life -= dt; g.material.opacity = Math.max(0, g.userData.life / 0.28) * 0.5;
      if (g.userData.life <= 0) { this.game.scene.remove(g); g.material.dispose(); this.ghosts.splice(i, 1); }
    }
  }

  // ---------- spawning / damage ----------
  respawn(x, y) {
    const P = CZ.P;
    this.x = x - this.w / 2; this.y = y + 0.05; this.vx = 0; this.vy = 0; this.hp = P.MAX_HP;
    this.dead = false; this.iframes = 0.5; this.dashing = false; this.pounding = false; this.grappling = false; this.hanging = false; this.hook = null;
    this.noclip = false; this.noclipMeter = P.NOCLIP_MAX; this.inCorrupt = false; this.inGlitch = false; this.jumpsUsed = 0; this.canDash = true;
    this.lastSafe = { x: this.x, y: this.y }; this.facing = 1; this.body.rotation.set(0, 0, 0);
    this.mesh.visible = true;
  }
  damage(fromX, amount = 1) {
    if (this.iframes > 0 || this.dead) return false;
    this.hp -= amount; CZ.Audio.sfx.hurt(); CZ.Effects.shake(0.6);
    CZ.Effects.burst(this.cx(), this.cy(), 0xffcc33, 8, { spread: 6, up: 5 });
    this.game.flash('rgba(255,60,80,.35)');
    if (this.hp <= 0) { this.die(); return true; }
    this.iframes = CZ.P.IFRAMES;
    const dir = fromX === undefined ? -this.facing : CZ.sign(this.cx() - fromX) || -this.facing;
    this.vx = dir * 9; this.vy = 9; this.dashing = false; this.pounding = false; this.releaseGrapple(); this.grounded = false;
    return true;
  }
  die() {
    if (this.dead) return; this.dead = true; this.deadT = 0; this.hp = 0;
    CZ.Audio.sfx.die(); CZ.Effects.shake(1.2);
    CZ.Effects.burst(this.cx(), this.cy(), 0xffcc33, 28, { spread: 11, up: 8, life: 1.1, size: 1.6 });
    CZ.Effects.burst(this.cx(), this.cy(), 0xff8a1f, 10, { spread: 8, up: 6, life: 0.9 });
    this.releaseGrapple(); this.noclip = false;
    this.game.playerDied();
  }
  releaseGrapple() { this.grappling = false; this.hanging = false; this.hook = null; }

  // ---------- physics ----------
  update(dt) {
    const P = CZ.P, I = CZ.Input, L = this.game.level;
    this.time += dt;
    if (this.dead) { this.deadT += dt; this.updateVisual(dt); return; }
    if (this.iframes > 0) this.iframes -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.wallStick > 0) this.wallStick -= dt;

    let axis = I.axisX();
    if (this.wallStick > 0 && axis === this.wallStickDir) axis = 0;
    if (I.pressed('jump')) this.jumpBuffer = P.JUMP_BUFFER;
    else if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    this.jumpHeld = I.held('jump');
    if (axis !== 0 && !this.dashing && !this.hanging) this.facing = axis;

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
          if (this.jumpBuffer > 0) { // fling: release early keeping momentum + boost
            this.jumpBuffer = 0; this.releaseGrapple(); this.vy = Math.max(this.vy, 6) + 8; this.vx += axis * 4; CZ.Audio.sfx.doubleJump(); this.jumpsUsed = 1;
            CZ.Effects.burst(this.cx(), this.cy(), 0x43b8ff, 10, { spread: 6, up: 2, gravity: 0 });
          }
        }
      }
      if (this.grappling) { this.moveAndCollide(dt); this.postMove(dt); this.updateVisual(dt); return; }
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
    if (!this.dashing && !this.pounding) {
      const excess = Math.abs(this.vx) > P.RUN_SPEED;
      if (axis !== 0) {
        const accel = this.grounded ? P.RUN_ACCEL : P.AIR_ACCEL;
        if (!excess || CZ.sign(this.vx) !== axis) this.vx = CZ.clamp(this.vx + axis * accel * dt, -P.RUN_SPEED, P.RUN_SPEED);
        else this.vx -= CZ.sign(this.vx) * (this.grounded ? 20 : P.AIR_FRICTION) * dt; // bleed excess speed slowly (wavedash momentum)
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
        this.vy = P.JUMP_VEL; jumped = true; this.jumpsUsed = 1; CZ.Audio.sfx.jump();
        if (this.time - this.groundDashEnd < P.WAVEDASH_WINDOW) { // wavedash
          this.vx = this.facing * Math.max(Math.abs(this.vx), P.DASH_SPEED * 0.8); CZ.Effects.burst(this.cx(), this.y, 0x39ff88, 10, { spread: 5, up: 1, gravity: 10, life: 0.4 });
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
    // variable jump height
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

  // Called once per frame after the level moved: ride the platform we're standing on.
  carryByGround(frameDt) {
    const g = this.groundSolid;
    if (g && g.mover && !g.broken && !this.dead) { this.x += g.vx * frameDt; this.y += g.vy * frameDt; }
  }
  moveAndCollide(dt) {
    const L = this.game.level, f = this.flags();
    const solids = L.blocking(f);
    // conveyor carry (mover carry happens once per frame in Game.update, see carryByGround)
    if (this.groundSolid && !this.groundSolid.broken && this.groundSolid.conveyor) this.x += this.groundSolid.conveyor * dt;
    const wasGrounded = this.grounded;
    // X
    this.x += this.vx * dt; this.wallDir = 0;
    for (const s of solids) if (CZ.overlap(this.aabb(), s)) {
      if (this.y >= s.y + s.h - 0.1 && this.vy <= 0.01) continue;   // barely sunk into a floor: let the Y pass snap up
      // eject through the thinner side (robust when a moving/phased block ends up around the player)
      const penL = this.x + this.w - s.x, penR = s.x + s.w - this.x;
      if (penL <= penR) { this.x = s.x - this.w; if (!this.grounded) this.wallDir = 1; }
      else { this.x = s.x + s.w; if (!this.grounded) this.wallDir = -1; }
      if (this.dashing) { this.dashT = 0; }
      if (this.vx !== 0 && !this.dashing) this.vx = s.mover ? s.vx : 0;
    }
    // Y
    this.y += this.vy * dt;
    this.grounded = false; let landed = null;
    for (const s of solids) if (CZ.overlap(this.aabb(), s)) {
      if (this.vy <= 0) { this.y = s.y + s.h; landed = s; this.grounded = true; if (this.vy < 0) this.vy = 0; }
      else { this.y = s.y - this.h; this.vy = Math.min(this.vy, 0); if (this.dashing && this.dashDir.y > 0) this.dashT = 0; }
    }
    // ground probe (standing on a platform moving down, tiny gaps)
    if (!this.grounded && this.vy <= 0.5) {
      const probe = { x: this.x + 0.06, y: this.y - 0.1, w: this.w - 0.12, h: 0.12 };
      for (const s of solids) if (CZ.overlap(probe, s)) { landed = s; this.grounded = true; this.y = s.y + s.h; if (this.vy < 0) this.vy = 0; break; }
    }
    // wall probe for sliding
    if (!this.grounded) {
      const pr = { x: this.x - 0.08, y: this.y + 0.1, w: this.w + 0.16, h: this.h - 0.2 };
      for (const s of solids) if (CZ.overlap(pr, s)) { this.wallDir = this.cx() < s.x + s.w / 2 ? 1 : -1; break; }
    }
    this.groundSolid = landed;
    if (this.grounded) {
      if (!wasGrounded) this.onLand(landed);
      this.coyote = CZ.P.COYOTE; this.jumpsUsed = 0; this.canDash = true;
      if (this.groundSolid && !this.groundSolid.mover && !this.groundSolid.conveyor && !this.groundSolid.cracked && !this.groundSolid.glitch && !this.groundSolid.corrupt && !this.inCorrupt && !this.inGlitch) { this.lastSafe = { x: this.x, y: this.y }; }
    } else if (this.coyote > 0) this.coyote -= dt;
    // bounds
    this.x = CZ.clamp(this.x, 0, L.data.width - this.w);
    if (this.y < L.data.deathY) this.die();
  }

  onLand(s) {
    const P = CZ.P;
    if (this.pounding) {
      this.pounding = false; CZ.Audio.sfx.poundLand(); CZ.Effects.shake(0.9);
      CZ.Effects.burst(this.cx(), this.y, 0xffffff, 16, { spread: 9, up: 3, life: 0.5 });
      this.game.shockwave(this.cx(), this.y, 3.2);
      if (s && s.cracked) { this.game.level.breakCracked(s); this.grounded = false; this.vy = -2; this.groundSolid = null; }
      this.squash = 0.55;
    } else { CZ.Audio.sfx.land(); this.squash = 0.72; if (this.vy < -12) CZ.Effects.burst(this.cx(), this.y, 0xffffff, 4, { spread: 3, up: 1, life: 0.3, size: 0.6 }); }
  }

  postMove(dt) {
    const L = this.game.level, box = this.aabb();
    // glitch/corrupt overlap bookkeeping
    this.inGlitch = false; this.inCorrupt = false;
    for (const s of L.solids) if (!s.broken && CZ.overlap(box, s)) { if (s.glitch) this.inGlitch = true; if (s.corrupt) this.inCorrupt = true; }
    if (this.inCorrupt && !this.noclip) { // crushed by corrupt data
      this.x = this.lastSafe.x; this.y = this.lastSafe.y; this.vx = 0; this.vy = 0; this.inCorrupt = false;
      this.game.toast('CORRUPT DATA — meter ran out!');
      this.damage(undefined, 1);
    }
    // hazards
    const pad = 0.14; const hb = { x: box.x + pad, y: box.y + pad, w: box.w - pad * 2, h: box.h - pad * 2 };
    for (const hz of L.hazards) if (hz.active && CZ.overlap(hb, hz)) {
      if (hz.kind === 'laser') { if (!this.dashing) this.damage(hz.x + hz.w / 2); }
      else if (!(hz.kind === 'press' && this.dashing)) { this.die(); return; }
    }
    // bounce pads
    for (const b of L.bounces) if (this.vy <= 0 && CZ.overlap({ x: box.x, y: box.y - 0.15, w: box.w, h: 0.4 }, { x: b.x, y: b.y, w: b.w, h: b.h + 0.2 })) {
      const wasPound = this.pounding; this.pounding = false; this.dashing = false;
      this.vy = wasPound ? 31 : 24; this.grounded = false; this.jumpsUsed = 1; this.canDash = true; b.pad.scale.y = 0.3;
      CZ.Audio.sfx.bounce(); CZ.Effects.burst(b.x + b.w / 2, b.y + 0.4, 0x39ff88, 10, { spread: 5, up: 4 }); this.squash = 1.35;
    }
  }
};
