// Enemies + projectiles. Shared simple AABB physics against level solids.
CZ.moveBody = function (b, dt, solids) {
  // b: {x,y,w,h,vx,vy}; returns {hitX, grounded}
  const r = { hitX: 0, grounded: false };
  b.x += b.vx * dt;
  for (const s of solids) if (CZ.overlap(b, s)) { if (b.vx > 0) { b.x = s.x - b.w; r.hitX = 1; } else if (b.vx < 0) { b.x = s.x + s.w; r.hitX = -1; } }
  b.y += b.vy * dt;
  for (const s of solids) if (CZ.overlap(b, s)) { if (b.vy <= 0) { b.y = s.y + s.h; b.vy = 0; r.grounded = true; r.ground = s; } else { b.y = s.y - b.h; b.vy = 0; } }
  return r;
};
CZ.groundAhead = function (b, dir, solids) {
  const px = dir > 0 ? b.x + b.w + 0.2 : b.x - 0.2;
  const probe = { x: px - 0.1, y: b.y - 0.4, w: 0.2, h: 0.5 };
  return solids.some(s => CZ.overlap(probe, s));
};

CZ.Enemy = class Enemy {
  constructor(game, d) {
    this.game = game; this.d = d; this.x = d.x; this.y = d.y; this.vx = 0; this.vy = 0; this.w = 1; this.h = 1;
    this.dead = false; this.t = Math.random() * 10; this.stompable = true; this.dashKill = true; this.hurts = true;
    this.mesh = new THREE.Group(); game.scene.add(this.mesh); this.facing = -1;
  }
  aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  cx() { return this.x + this.w / 2; } cy() { return this.y + this.h / 2; }
  place() { this.mesh.position.set(this.cx(), this.cy(), 0); }
  kill(how) {
    if (this.dead) return; this.dead = true;
    CZ.Effects.burst(this.cx(), this.cy(), this.color, 16, { spread: 9, up: 6, life: 0.8, size: 1.3 });
    CZ.Effects.burst(this.cx(), this.cy(), 0xffffff, 6, { spread: 5, up: 4, life: 0.4 });
    CZ.Audio.sfx[how === 'stomp' ? 'stomp' : 'kill']();
    this.game.scene.remove(this.mesh);
    this.game.addScore && this.game.addScore(1);
  }
  solids() { return this.game.level.blocking({}); }
  update(dt) {}
};

CZ.Rat = class Rat extends CZ.Enemy {
  constructor(game, d) {
    super(game, d); this.w = 1.2; this.h = 0.75; this.color = 0x8a8a96; this.speed = d.speed || 2.6; this.facing = d.dir || -1;
    const E = CZ.Effects;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), E.toon(0x8a8a96)); body.scale.set(1.4, 0.85, 1); body.castShadow = true; E.outline(body, 0.07); this.mesh.add(body); this.body = body;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), E.toon(0x9a9aa6)); head.position.set(-0.55, 0.05, 0); head.scale.set(1.3, 1, 1); E.outline(head, 0.06); this.mesh.add(head); this.head = head;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), E.basic(0xff7a9a)); nose.position.set(-0.36, -0.02, 0); head.add(nose);
    [[-0.15, 0.22, 0.1], [-0.15, 0.22, -0.1]].forEach(p => { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), E.toon(0xffaabb)); ear.position.set(...p); ear.scale.z = 0.4; head.add(ear); });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), E.basic(0x1a0f0a)); eye.position.set(-0.15, 0.08, 0.24); head.add(eye);
    const eye2 = eye.clone(); eye2.position.z = -0.24; head.add(eye2);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.9, 6), E.toon(0xffaabb)); tail.position.set(0.85, 0.05, 0); tail.rotation.z = Math.PI / 2 + 0.4; this.mesh.add(tail); this.tail = tail;
  }
  update(dt) {
    this.t += dt; const solids = this.solids();
    if (this.d.min !== undefined && this.x < this.d.min) this.facing = 1;
    if (this.d.max !== undefined && this.x + this.w > this.d.max) this.facing = -1;
    this.vx = this.facing * this.speed; this.vy -= 40 * dt;
    const r = CZ.moveBody(this, dt, solids);
    if (r.hitX) this.facing = -r.hitX;
    if (r.grounded && !CZ.groundAhead(this, this.facing, solids)) this.facing *= -1;
    this.place();
    this.mesh.scale.x = this.facing < 0 ? 1 : -1;
    this.body.scale.y = 0.85 + Math.sin(this.t * 14) * 0.05; this.tail.rotation.z = Math.PI / 2 + 0.4 + Math.sin(this.t * 8) * 0.3;
  }
};

CZ.Spore = class Spore extends CZ.Enemy {
  constructor(game, d) {
    super(game, d); this.w = 0.9; this.h = 0.9; this.color = 0x62d26f; this.x0 = d.x; this.y0 = d.y; this.amp = d.amp || 1.5; this.speed = d.speed || 2;
    const E = CZ.Effects;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), E.toon(0x62d26f)); body.castShadow = true; E.outline(body, 0.07); this.mesh.add(body); this.body = body;
    for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 5), E.toon(0x3aa04a)); const a = i / 8 * Math.PI * 2; sp.position.set(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0); sp.rotation.z = a - Math.PI / 2; body.add(sp); }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), E.basic(0xffffff)); eye.position.set(0, 0.02, 0.38); body.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), E.basic(0x1a0f0a)); pupil.position.z = 0.1; eye.add(pupil);
  }
  update(dt) {
    this.t += dt;
    this.x = this.x0 + Math.sin(this.t * this.speed * 0.5) * 2.2 - this.w / 2;
    this.y = this.y0 + Math.sin(this.t * this.speed) * this.amp - this.h / 2;
    this.place(); this.body.rotation.z += dt * 1.5; this.body.scale.setScalar(1 + Math.sin(this.t * 5) * 0.06);
  }
};

CZ.Blob = class Blob extends CZ.Enemy {
  constructor(game, d) {
    super(game, d); this.w = 1.1; this.h = 0.95; this.color = 0xff8a1f; this.hopT = 0.8 + Math.random();
    const E = CZ.Effects;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), new THREE.MeshToonMaterial({ color: 0xff8a1f, emissive: 0x552200 })); body.scale.set(1, 0.85, 0.9); body.castShadow = true; E.outline(body, 0.07); this.mesh.add(body); this.body = body;
    [[-0.18, 0.12], [0.18, 0.12]].forEach(([x, y]) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), E.basic(0xffffff)); e.position.set(x, y, 0.47); const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), E.basic(0x1a0f0a)); p.position.z = 0.09; e.add(p); body.add(e); });
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), E.basic(0x5a1a00)); mouth.position.set(0, -0.18, 0.46); mouth.scale.set(1.4, 0.6, 0.3); body.add(mouth);
  }
  update(dt) {
    this.t += dt; const solids = this.solids(); const p = this.game.player;
    this.vy -= 40 * dt;
    const r = CZ.moveBody(this, dt, solids);
    if (r.grounded) {
      this.vx = CZ.damp(this.vx, 0, 10, dt); this.hopT -= dt;
      if (this.hopT <= 0) {
        this.hopT = 0.9 + Math.random() * 0.6;
        const near = Math.abs(p.cx() - this.cx()) < 9 && Math.abs(p.cy() - this.cy()) < 5;
        let dir = near ? CZ.sign(p.cx() - this.cx()) : (Math.random() < 0.5 ? -1 : 1);
        if (this.d.min !== undefined && this.x < this.d.min + 0.5) dir = 1;
        if (this.d.max !== undefined && this.x + this.w > this.d.max - 0.5) dir = -1;
        this.vx = dir * (near ? 5 : 3); this.vy = near ? 12 : 9; this.facing = dir;
        CZ.Effects.burst(this.cx(), this.y, 0xff8a1f, 3, { spread: 2, up: 1, life: 0.3, size: 0.7 });
      }
    } else if (r.hitX) this.vx = 0;
    this.place();
    const sq = r.grounded ? 0.8 + Math.max(0, 0.3 - this.hopT) : 1.15; this.body.scale.y = CZ.damp(this.body.scale.y, sq, 14, dt);
  }
};

CZ.Turret = class Turret extends CZ.Enemy {
  constructor(game, d) {
    super(game, d); this.w = 1.3; this.h = 1.3; this.color = 0x7a86a0; this.dir = d.dir || -1; this.rate = d.rate || 2; this.cd = (d.phase || 0) + 1;
    const E = CZ.Effects;
    const base = E.box(1.3, 0.5, 1.3, 0x4a5060); base.position.y = -0.4; E.edges(base); this.mesh.add(base);
    const body = E.box(1.0, 0.9, 1.0, 0x7a86a0); body.position.y = 0.2; E.edges(body); E.outline(body, 0.06); this.mesh.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.9, 10), E.toon(0x333)); barrel.rotation.z = Math.PI / 2; barrel.position.set(this.dir * 0.8, 0.25, 0); this.mesh.add(barrel); this.barrel = barrel;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), E.basic(0xff2d55)); eye.position.set(this.dir * 0.3, 0.35, 0.5); this.mesh.add(eye); this.eye = eye;
    this.place();
  }
  update(dt) {
    this.t += dt; const p = this.game.player;
    const near = Math.abs(p.cx() - this.cx()) < 24 && Math.abs(p.cy() - this.cy()) < 10;
    if (near) this.cd -= dt;
    this.eye.scale.setScalar(this.cd < 0.3 ? 1.5 : 1);
    if (this.cd <= 0) {
      this.cd = this.rate; CZ.Audio.sfx.shoot();
      this.game.projectiles.push(new CZ.Projectile(this.game, this.cx() + this.dir * 0.9, this.cy() + 0.25, this.dir * 9, 0));
      this.barrel.position.x = this.dir * 0.55;
    }
    this.barrel.position.x = CZ.damp(this.barrel.position.x, this.dir * 0.8, 10, dt);
  }
};

CZ.Projectile = class Projectile {
  constructor(game, x, y, vx, vy, o = {}) {
    this.game = game; this.w = o.size || 0.45; this.h = o.size || 0.45; this.x = x - this.w / 2; this.y = y - this.h / 2; this.vx = vx; this.vy = vy; this.life = o.life || 4; this.dead = false; this.gravity = o.gravity || 0;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.w / 2, 8, 8), new THREE.MeshBasicMaterial({ color: o.color || 0xffb347 }));
    game.scene.add(this.mesh); this.color = o.color || 0xffb347;
  }
  aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  update(dt) {
    this.life -= dt; this.vy -= this.gravity * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    this.mesh.position.set(this.x + this.w / 2, this.y + this.h / 2, 0);
    this.mesh.scale.setScalar(1 + Math.sin(this.life * 30) * 0.15);
    if (this.life <= 0) this.kill(false);
    else for (const s of this.game.level.blocking({})) if (CZ.overlap(this.aabb(), s)) { this.kill(true); break; }
  }
  kill(fx) { if (this.dead) return; this.dead = true; this.game.scene.remove(this.mesh); this.mesh.material.dispose(); if (fx) CZ.Effects.burst(this.x + this.w / 2, this.y + this.h / 2, this.color, 5, { spread: 4, up: 2, life: 0.3, size: 0.6 }); }
};

CZ.createEnemy = (game, d) => {
  switch (d.kind) {
    case 'rat': return new CZ.Rat(game, d);
    case 'spore': return new CZ.Spore(game, d);
    case 'blob': return new CZ.Blob(game, d);
    case 'turret': return new CZ.Turret(game, d);
  }
  return null;
};
