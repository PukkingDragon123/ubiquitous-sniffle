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
    // they come apart into pieces too, so the floor keeps a record of the trip
    CZ.Effects.smash({ x: this.x, y: this.y, w: this.w, h: this.h, d: 1.1 }, {
      count: this.small ? 5 : 9, power: 1.15, floor: Math.min(this.y, 0.2),
      colors: [this.color, 0xffffff, 0xff7a9a],
    });
    CZ.Audio.sfx[how === 'stomp' ? 'stomp' : 'kill']();
    if (this.game.hitstop) this.game.hitstop(0.035);
    CZ.Effects.disposeTree(this.mesh);
    this.game.addScore && this.game.addScore(1);
  }
  solids() { return this.game.level.blocking({}); }
  update(dt) {}
};

CZ.Rat = class Rat extends CZ.Enemy {
  constructor(game, d) {
    super(game, d); this.w = 1.2; this.h = 0.75; this.color = 0x8a8a96; this.small = true; this.speed = d.speed || 2.6; this.facing = d.dir || -1;
    const E = CZ.Effects, box = (w, h, d, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), E.toon(c)); m.castShadow = true; return m; };
    // A rat reads side-on: long low body, a small head set forward with a notch
    // behind it, a pale snout, one big cartoon eye, and a tail that whips.
    const body = box(0.92, 0.44, 0.56, 0x6e6e7c); body.position.set(0.1, 0.0, 0);
    E.outline(body, 0.06); this.mesh.add(body); this.body = body;
    const back = box(0.66, 0.16, 0.5, 0x83838f); back.position.set(0.14, 0.22, 0); this.mesh.add(back);
    const belly = box(0.8, 0.14, 0.5, 0xb2b2be); belly.position.set(0.1, -0.2, 0); this.mesh.add(belly);

    this.head = new THREE.Group(); this.head.position.set(-0.46, -0.02, 0); this.mesh.add(this.head);
    const skull = box(0.34, 0.34, 0.42, 0x7a7a88); E.outline(skull, 0.05); this.head.add(skull);
    const snout = box(0.26, 0.18, 0.26, 0xb2b2be); snout.position.set(-0.24, -0.07, 0); this.head.add(snout);
    const nose = box(0.11, 0.1, 0.11, 0xff7a9a); nose.position.set(-0.38, -0.07, 0); this.head.add(nose);
    this.ears = [];
    for (const s2 of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 8), E.toon(0xffaabb));
      ear.rotation.x = Math.PI / 2; ear.position.set(0.06, 0.24, s2 * 0.14);
      E.outline(ear, 0.04); this.head.add(ear); this.ears.push(ear);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.07, 8), E.toon(0xd4707f));
      inner.rotation.x = Math.PI / 2; inner.position.z = s2 * 0.01; ear.add(inner);
      // one cartoon eye per side: white, pupil, glint
      const white = new THREE.Mesh(new THREE.CircleGeometry(0.1, 10), E.basic(0xffffff));
      white.position.set(-0.12, 0.05, s2 * 0.215); white.rotation.y = s2 > 0 ? 0 : Math.PI; this.head.add(white);
      const pup = new THREE.Mesh(new THREE.CircleGeometry(0.055, 8), E.basic(0x140c06));
      pup.position.set(-0.02, 0, 0.01); white.add(pup);
      const glint = new THREE.Mesh(new THREE.CircleGeometry(0.02, 6), E.basic(0xffffff));
      glint.position.set(-0.02, 0.025, 0.01); pup.add(glint);
      for (const wy of [0.0, -0.09]) {
        const w = box(0.3, 0.025, 0.025, 0xe8e2d8);
        w.position.set(-0.46, wy - 0.05, s2 * 0.11); w.rotation.z = s2 * 0.1 + (wy ? -0.18 : 0.1);
        this.head.add(w);
      }
    }
    // tail: three chained segments, curling up and whipping as it runs
    this.tail = []; let parent = this.mesh, off = 0.56;
    for (let i = 0; i < 3; i++) {
      const pivot = new THREE.Group(); pivot.position.set(off, i === 0 ? 0.12 : 0, 0); parent.add(pivot);
      if (i === 0) pivot.rotation.z = 0.6;
      const seg = box(0.3 - i * 0.04, 0.13 - i * 0.025, 0.13 - i * 0.025, 0xe08a9a);
      seg.position.x = 0.15; pivot.add(seg);
      this.tail.push(pivot); parent = pivot; off = 0.28;
    }
    // four feet that actually step
    this.feet = [];
    for (const s2 of [-1, 1]) for (const fx of [-0.24, 0.34]) {
      const ft = box(0.19, 0.16, 0.16, 0x5a5a66); ft.position.set(fx, -0.3, s2 * 0.2);
      this.mesh.add(ft); this.feet.push({ ft, x: fx, ph: (fx < 0 ? 0 : Math.PI) + (s2 < 0 ? 0 : Math.PI) });
    }
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
    // scuttle: body bob, ear twitch, tail whip, feet stepping in pairs
    const g = this.t * 13;
    this.body.position.y = Math.abs(Math.sin(g)) * 0.05;
    this.body.scale.y = 1 + Math.sin(g * 2) * 0.04;
    this.head.position.y = -0.02 + Math.abs(Math.sin(g + 0.6)) * 0.04;
    this.head.rotation.z = Math.sin(this.t * 2.2) * 0.07;
    for (const e of this.ears) e.rotation.z = Math.sin(this.t * 5.5) * 0.25;
    this.tail.forEach((pv, i) => { pv.rotation.z = (i === 0 ? 0.6 : 0) + Math.sin(g * 0.5 - i * 0.8) * (0.4 - i * 0.08); });
    for (const f of this.feet) f.ft.position.y = -0.3 + Math.max(0, Math.sin(g + f.ph)) * 0.13;
  }
};

CZ.Spore = class Spore extends CZ.Enemy {
  constructor(game, d) {
    super(game, d); this.w = 0.9; this.h = 0.9; this.color = 0x62d26f; this.small = true; this.x0 = d.x; this.y0 = d.y; this.amp = d.amp || 1.5; this.speed = d.speed || 2;
    const E = CZ.Effects;
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), E.toon(0x62d26f));
    body.castShadow = true; E.outline(body, 0.07); this.mesh.add(body); this.body = body;
    // blotches of darker mould over the skin
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(CZ.rand(0.12, 0.2), 0), E.toon(0x3aa04a));
      const a = CZ.rand(0, 6.3), p2 = CZ.rand(-1, 1);
      b.position.set(Math.cos(a) * 0.36, Math.sin(a) * 0.36, p2 * 0.28); body.add(b);
    }
    this.spikes = [];
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.4, 4), E.toon(0x2f8a3f));
      const a = i / 7 * Math.PI * 2;
      sp.position.set(Math.cos(a) * 0.44, Math.sin(a) * 0.44, 0); sp.rotation.z = a - Math.PI / 2;
      body.add(sp); this.spikes.push({ sp, a });
    }
    // one big dumb eye
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), E.basic(0xffffff));
    eye.position.set(0, 0.04, 0.42); this.mesh.add(eye); this.eye = eye;
    const rim = new THREE.Mesh(new THREE.CircleGeometry(0.29, 12), E.basic(0x1a2f16));
    rim.position.set(0, 0.04, 0.4); this.mesh.add(rim);
    this.pupil = new THREE.Mesh(new THREE.CircleGeometry(0.12, 10), E.basic(0x140c06));
    this.pupil.position.z = 0.02; eye.add(this.pupil);
  }
  update(dt) {
    this.t += dt;
    this.x = this.x0 + Math.sin(this.t * this.speed * 0.5) * 2.2 - this.w / 2;
    this.y = this.y0 + Math.sin(this.t * this.speed) * this.amp - this.h / 2;
    this.place();
    this.body.rotation.z += dt * 1.2;
    this.body.scale.setScalar(1 + Math.sin(this.t * 5) * 0.07);
    for (const s2 of this.spikes) s2.sp.scale.y = 1 + Math.sin(this.t * 6 + s2.a * 2) * 0.25;
    // the eye keeps track of the cheese
    const p = this.game.player;
    if (p) {
      const dx = CZ.clamp((p.cx() - this.cx()) * 0.05, -0.1, 0.1);
      const dy = CZ.clamp((p.cy() - this.cy()) * 0.05, -0.1, 0.1);
      this.pupil.position.set(dx, dy, 0.02);
    }
  }
};

CZ.Blob = class Blob extends CZ.Enemy {
  constructor(game, d) {
    super(game, d); this.w = 1.1; this.h = 0.95; this.color = 0xff8a1f; this.hopT = 0.8 + Math.random();
    const E = CZ.Effects;
    const skin = new THREE.MeshToonMaterial({ map: CZ.Tex.get('goo', 'magma'), color: 0xffffff, emissive: 0x3a1400 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), skin);
    body.scale.set(1.05, 0.85, 0.9); body.castShadow = true; E.outline(body, 0.07);
    this.mesh.add(body); this.body = body;
    // it is molten, so it drips
    this.drip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.16), E.toon(0xffb347));
    this.drip.position.set(0.18, -0.5, 0.22); this.mesh.add(this.drip);
    // two eyes and a gummy mouth, all on the front face
    this.eyes = [];
    for (const [x, y, r] of [[-0.2, 0.14, 0.16], [0.19, 0.1, 0.13]]) {
      const rim = new THREE.Mesh(new THREE.CircleGeometry(r + 0.05, 10), E.basic(0x5a1a00));
      rim.position.set(x, y, 0.52); this.mesh.add(rim);
      const e = new THREE.Mesh(new THREE.CircleGeometry(r, 10), E.basic(0xffffff));
      e.position.z = 0.02; rim.add(e);
      const pup = new THREE.Mesh(new THREE.CircleGeometry(r * 0.55, 8), E.basic(0x140c06));
      pup.position.z = 0.02; e.add(pup);
      this.eyes.push({ pup, r });
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.08), E.basic(0x5a1a00));
    mouth.position.set(0, -0.2, 0.52); this.mesh.add(mouth); this.mouth = mouth;
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
    const sq = r.grounded ? 0.8 + Math.max(0, 0.3 - this.hopT) : 1.15;
    this.body.scale.y = CZ.damp(this.body.scale.y, sq, 14, dt);
    this.body.scale.x = CZ.damp(this.body.scale.x, 2.05 - sq, 14, dt);
    // the drip stretches while it is in the air and snaps back on landing
    this.drip.scale.y = CZ.damp(this.drip.scale.y, r.grounded ? 0.5 : 1.5, 8, dt);
    this.drip.position.y = -0.5 - this.drip.scale.y * 0.12;
    this.mouth.scale.y = r.grounded ? 1 : 2.2;
    for (const e of this.eyes) e.pup.position.x = CZ.clamp((p.cx() - this.cx()) * 0.05, -e.r * 0.4, e.r * 0.4);
  }
};

CZ.Turret = class Turret extends CZ.Enemy {
  constructor(game, d) {
    super(game, d); this.w = 1.3; this.h = 1.3; this.color = 0x7a86a0; this.dir = d.dir || -1; this.rate = d.rate || 2; this.cd = (d.phase || 0) + 1;
    const E = CZ.Effects;
    const plate = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('plate', 'steel', w, h) }));
    const base = plate(1.35, 0.42, 1.3); base.position.y = -0.46; E.edges(base); this.mesh.add(base);
    for (const s2 of [-1, 1]) {                       // bolts holding it down
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 6), E.toon(0x3b4855));
      bolt.position.set(s2 * 0.5, -0.26, 0.45); this.mesh.add(bolt);
    }
    const housing = plate(0.95, 0.86, 1.0); housing.position.y = 0.16; E.edges(housing); E.outline(housing, 0.06);
    this.mesh.add(housing); this.housing = housing;
    // hazard stripes across the housing
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.2), new THREE.MeshBasicMaterial({
      map: CZ.Tex.custom('hazard', 16, (g, N) => {
        g.fillStyle = '#ffcc33'; g.fillRect(0, 0, N, N);
        g.fillStyle = '#241608';
        for (let i = -N; i < N; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 5, 0); g.lineTo(i + 11, N); g.lineTo(i + 6, N); g.fill(); }
      }, [3, 1]),
    }));
    stripe.position.set(0, 0.48, 0.51); this.mesh.add(stripe);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.95, 8), E.toon(0x2a2a2e));
    barrel.rotation.z = Math.PI / 2; barrel.position.set(this.dir * 0.8, 0.2, 0);
    E.outline(barrel, 0.05); this.mesh.add(barrel); this.barrel = barrel;
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.16, 8), E.toon(0x4a5060));
    muzzle.rotation.z = Math.PI / 2; muzzle.position.x = this.dir * 0.5; barrel.add(muzzle);
    // the lens it aims with
    const socket = new THREE.Mesh(new THREE.CircleGeometry(0.24, 10), E.basic(0x241608));
    socket.position.set(this.dir * 0.24, 0.38, 0.52); this.mesh.add(socket);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.15, 10), E.basic(0xff2d55));
    eye.position.z = 0.02; socket.add(eye); this.eye = eye;
    // the lens only throws light when it is about to fire, or it stains the room red
    this.glow = new THREE.PointLight(0xff2d55, 0, 2.4); this.glow.position.set(this.dir * 0.5, 0.38, 1.1); this.mesh.add(this.glow);
    this.place();
  }
  update(dt) {
    this.t += dt; const p = this.game.player;
    const near = Math.abs(p.cx() - this.cx()) < 24 && Math.abs(p.cy() - this.cy()) < 10;
    if (near) this.cd -= dt;
    const hot = this.cd < 0.35;
    this.eye.scale.setScalar(hot ? 1.45 : 1);
    this.eye.material = CZ.Effects.basic(hot && Math.floor(this.t * 14) % 2 ? 0xffffff : 0xff2d55);
    this.glow.intensity = hot ? 1.6 : 0;
    this.housing.rotation.z = Math.sin(this.t * 2) * 0.015;
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
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(this.w, this.h, this.w), new THREE.MeshBasicMaterial({ color: o.color || 0xffb347 }));
    CZ.Effects.outline(this.mesh, 0.12);   // dark rim so bullets read against any world
    game.scene.add(this.mesh); this.color = o.color || 0xffb347;
  }
  aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  update(dt) {
    this.life -= dt; this.vy -= this.gravity * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    this.mesh.position.set(this.x + this.w / 2, this.y + this.h / 2, 0);
    this.mesh.scale.setScalar(1 + Math.sin(this.life * 30) * 0.15); this.mesh.rotation.z += dt * 6; this.mesh.rotation.x += dt * 4;
    if (this.life <= 0) this.kill(false);
    else for (const s of this.game.level.blocking({})) if (CZ.overlap(this.aabb(), s)) { this.kill(true); break; }
  }
  kill(fx) { if (this.dead) return; this.dead = true; CZ.Effects.disposeTree(this.mesh); this.mesh.material.dispose(); if (fx) CZ.Effects.burst(this.x + this.w / 2, this.y + this.h / 2, this.color, 5, { spread: 4, up: 2, life: 0.3, size: 0.6 }); }
};

// A cellar spider on a thread: drops when you get close, climbs back when you leave.
CZ.Spider = class Spider extends CZ.Enemy {
  constructor(game, d) {
    super(game, d);
    this.w = 0.9; this.h = 0.7; this.color = 0x2b2229; this.small = true;
    this.top = d.y; this.drop = d.drop || 4; this.speed = d.speed || 1.4; this.down = 0;
    const E = CZ.Effects;
    this.thread = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.05), new THREE.MeshBasicMaterial({ color: 0xe8e2d8, transparent: true, opacity: 0.6 }));
    game.scene.add(this.thread);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 9, 7), E.toon(0x2b2229));
    body.scale.set(1, 0.9, 0.95); body.castShadow = true; E.outline(body, 0.06); this.mesh.add(body); this.body = body;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.1), E.toon(0x7a2436));
    stripe.position.set(0, 0.06, 0.34); body.add(stripe);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), E.toon(0x3a2f38));
    head.position.set(0, 0.02, 0.36); E.outline(head, 0.05); this.mesh.add(head); this.spiderHead = head;
    for (const s2 of [-1, 1]) for (const [ex, ey, er] of [[0.08, 0.08, 0.06], [0.17, 0.02, 0.045]]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(er, 6, 5), E.basic(0xff4b5c));
      eye.position.set(s2 * ex, ey, 0.2); head.add(eye);
    }
    for (const s2 of [-1, 1]) {                        // fangs
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), E.toon(0xe8e2d8));
      f.position.set(s2 * 0.07, -0.16, 0.14); f.rotation.x = 0.5; head.add(f);
    }
    // eight legs, each a thigh with a shin hanging off it
    this.legs = [];
    for (const s2 of [-1, 1]) for (let i = 0; i < 4; i++) {
      const hip = new THREE.Group(); hip.position.set(s2 * 0.2, 0.02, -0.18 + i * 0.14); this.mesh.add(hip);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.07), E.toon(0x1a1016));
      thigh.position.x = s2 * 0.21; hip.add(thigh);
      const knee = new THREE.Group(); knee.position.x = s2 * 0.42; hip.add(knee);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.4, 0.07), E.toon(0x1a1016));
      shin.position.y = -0.2; knee.add(shin);
      hip.rotation.z = s2 * 0.5; knee.rotation.z = -s2 * 0.4;
      this.legs.push({ hip, knee, s: s2, i });
    }    this.place();
  }
  update(dt) {
    this.t += dt;
    const p = this.game.player;
    const near = Math.abs(p.cx() - this.x) < 7;
    const want = near ? this.drop : 0;
    this.down = CZ.damp(this.down, want, this.speed, dt);
    this.y = this.top - this.down + Math.sin(this.t * 2.4) * 0.12 - this.h / 2;
    this.x = this.d.x - this.w / 2;
    this.place();
    for (const { hip, knee, s, i } of this.legs) {
      const w = Math.sin(this.t * 7 + i * 1.3 + (s > 0 ? Math.PI : 0));
      hip.rotation.z = s * (0.5 + w * 0.22);
      knee.rotation.z = -s * (0.4 + w * 0.3);
    }
    this.spiderHead.rotation.z = Math.sin(this.t * 3) * 0.1;
    const topY = this.top + 1.6, len = Math.max(0.1, topY - this.cy());
    this.thread.position.set(this.cx(), this.cy() + len / 2, 0);
    this.thread.scale.y = len;
  }
  kill(how) { CZ.Effects.disposeTree(this.thread); super.kill(how); }
};

// A little bug scuttling along the floor: harmless-looking, still bites.
CZ.BugCrawl = class BugCrawl extends CZ.Enemy {
  constructor(game, d) {
    super(game, d);
    this.w = 0.7; this.h = 0.42; this.color = 0x62d26f; this.small = true; this.speed = d.speed || 3.4;
    this.facing = -1; this.stompable = true;
    const E = CZ.Effects;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), E.toon(0x2f6b38));
    body.scale.set(1.3, 0.7, 0.9); body.castShadow = true; E.outline(body, 0.05); this.mesh.add(body); this.body = body;
    // a shell split down the middle, each half lifting as it scuttles
    this.shell = [];
    for (const s2 of [-1, 1]) {
      const half = new THREE.Mesh(new THREE.SphereGeometry(0.27, 8, 6, 0, Math.PI), E.toon(0x62d26f));
      half.scale.set(1.15, 0.75, 0.85); half.position.set(0.03, 0.1, 0);
      half.rotation.y = s2 > 0 ? 0 : Math.PI; E.outline(half, 0.04);
      this.mesh.add(half); this.shell.push({ half, s: s2 });
    }
    const headB = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 6), E.toon(0x24522b));
    headB.position.set(-0.3, 0.02, 0); this.mesh.add(headB);
    for (const s2 of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), E.basic(0xffffff));
      eye.position.set(-0.12, 0.06, s2 * 0.1); headB.add(eye);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), E.basic(0x140c06));
      pup.position.set(-0.04, 0, 0); eye.add(pup);
      const ant = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.03), E.toon(0x1a1016));
      ant.position.set(-0.2, 0.12, s2 * 0.07); ant.rotation.z = 0.5; ant.rotation.y = s2 * 0.4;
      headB.add(ant);
    }
    this.legs = [];
    for (const s2 of [-1, 1]) for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.05), CZ.Effects.toon(0x1a1016));
      leg.position.set(-0.2 + i * 0.2, -0.2, s2 * 0.2); this.mesh.add(leg);
      this.legs.push({ leg, s: s2, i });
    }
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
    for (const { leg, s, i } of this.legs) leg.rotation.z = Math.sin(this.t * 22 + i * 2 + (s > 0 ? Math.PI : 0)) * 0.6;
    for (const { half, s } of this.shell) half.rotation.z = Math.sin(this.t * 11 + (s > 0 ? 0 : Math.PI)) * 0.09;
    this.body.position.y = Math.abs(Math.sin(this.t * 11)) * 0.03;
  }
};

CZ.createEnemy = (game, d) => {
  switch (d.kind) {
    case 'rat': return new CZ.Rat(game, d);
    case 'spore': return new CZ.Spore(game, d);
    case 'blob': return new CZ.Blob(game, d);
    case 'turret': return new CZ.Turret(game, d);
    case 'spider': return new CZ.Spider(game, d);
    case 'bugcrawl': return new CZ.BugCrawl(game, d);
  }
  return null;
};
