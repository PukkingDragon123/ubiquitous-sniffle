// Bosses. Each exposes hurtboxes() (damage the player) and weakspots() (how the player damages it).
CZ.Boss = class Boss {
  constructor(game, arena) {
    this.game = game; this.arena = arena; this.t = 0; this.hp = 3; this.maxHp = 3; this.name = 'BOSS';
    this.dead = false; this.dying = false; this.invuln = 0; this.owned = []; this.hazards = []; this.hazardMeshes = [];
    this.group = new THREE.Group(); game.scene.add(this.group);
  }
  addSolid(s) {
    s.x0 = s.x; s.y0 = s.y; s.vx = 0; s.vy = 0; s.broken = false; s.t = 'solid';
    this.game.level.addBlock(s); this.game.level.solids.push(s); this.owned.push(s); return s;
  }
  addHook(h) { h.t = 'hook'; this.game.level.addProp('hook', h); this.game.level.hooks.push(h); this.ownedHooks = this.ownedHooks || []; this.ownedHooks.push(h); return h; }
  hit(how) {
    if (this.invuln > 0 || this.dead || this.dying) return false;
    this.hp--; this.invuln = 1.4; CZ.Audio.sfx.bossHit(); CZ.Effects.shake(1.1); this.game.flash('rgba(255,255,255,.5)');
    if (this.hp <= 0) { this.dying = true; this.deathT = 0; CZ.Audio.sfx.bossDie(); this.hazards.length = 0; this.onDeathStart && this.onDeathStart(); }
    else this.onHit(how);
    return true;
  }
  update(dt) {
    this.t += dt; if (this.invuln > 0) this.invuln -= dt;
    if (this.dying) {
      this.deathT += dt;
      if (Math.random() < 0.5) CZ.Effects.burst(this.deathX() + (Math.random() - 0.5) * 4, this.deathY() + (Math.random() - 0.5) * 3, CZ.pick([0xffffff, 0xff8a1f, 0xff2d55]), 8, { spread: 8, up: 4, life: 0.8, size: 1.5 });
      CZ.Effects.shake(0.3);
      this.deathAnim && this.deathAnim(dt);
      if (this.deathT > 2.4) { this.dead = true; this.cleanup(); this.game.bossDefeated(this); }
      return;
    }
    this.think(dt);
  }
  deathX() { return this.arena.x + this.arena.w / 2; } deathY() { return 5; }
  hurtboxes() { return this.hazards.filter(h => h.active); }
  weakspots() { return []; }
  cleanup() {
    const E = CZ.Effects, L = this.game.level;
    E.disposeTree(this.group);
    for (const s of this.owned) { E.disposeTree(s.mesh); const i = L.solids.indexOf(s); if (i >= 0) L.solids.splice(i, 1); }
    for (const h of (this.ownedHooks || [])) { E.disposeTree(h.mesh); const i = L.hooks.indexOf(h); if (i >= 0) L.hooks.splice(i, 1); }
    for (const m of this.hazardMeshes) E.disposeTree(m);
    this.hazardMeshes.length = 0;
  }
  think(dt) {}
  onHit() {}
  // a column hazard mesh helper (lasers / lightning / warning columns)
  column(x, y, w, h, color, opacity) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    m.position.set(x + w / 2, y + h / 2, 0.2); this.game.scene.add(m); this.hazardMeshes.push(m); return m;
  }
  removeMesh(m) { CZ.Effects.disposeTree(m); const i = this.hazardMeshes.indexOf(m); if (i >= 0) this.hazardMeshes.splice(i, 1); }
};

// ───────────────────────── RAT KING ─────────────────────────
CZ.RatKing = class RatKing extends CZ.Boss {
  constructor(game, arena) {
    super(game, arena); this.name = 'RAT KING'; this.hp = this.maxHp = 3;
    this.w = 3.6; this.h = 2.7; this.x = arena.x + arena.w - 10; this.y = 0.1; this.vx = 0; this.vy = 0; this.facing = -1;
    this.state = 'intro'; this.st = 0; this.next = 'charge'; this.speed = 9; this.color = 0x6a6a78;
    const E = CZ.Effects;
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 6), E.toon(0x6a6a78)); body.scale.set(1.35, 0.95, 1); body.castShadow = true; E.outline(body, 0.1); this.group.add(body); this.body = body;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 7, 5), E.toon(0x7a7a88)); head.position.set(-1.5, 0.5, 0); head.scale.set(1.25, 1, 1); E.outline(head, 0.08); this.group.add(head); this.head = head;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), E.basic(0xff7a9a)); nose.position.set(-1.05, -0.1, 0); head.add(nose);
    [[-0.3, 0.7, 0.35], [-0.3, 0.7, -0.35]].forEach(p => { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8), E.toon(0xffaabb)); ear.position.set(...p); ear.scale.z = 0.4; head.add(ear); });
    [[-0.45, 0.2, 0.62], [-0.45, 0.2, -0.62]].forEach(p => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.12), E.basic(0xff2d2d)); e.position.set(...p); head.add(e); });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.5, 6), new THREE.MeshToonMaterial({ color: 0xffd700 })); crown.position.set(-0.1, 1.05, 0); head.add(crown);
    for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 4), E.toon(0xffd700)); const a = i / 6 * Math.PI * 2; sp.position.set(Math.cos(a) * 0.5, 0.4, Math.sin(a) * 0.5); crown.add(sp); }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 2.6, 6), E.toon(0xffaabb)); tail.position.set(2.2, 0.2, 0); tail.rotation.z = Math.PI / 2 + 0.5; this.group.add(tail); this.tail = tail;
    this.shockMesh = this.column(0, 0, 1, 0.6, 0xffffff, 0.6); this.shockMesh.visible = false;
  }
  aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  cx() { return this.x + this.w / 2; }
  deathX() { return this.cx(); } deathY() { return this.y + 1.5; }
  hurtboxes() {
    const hb = super.hurtboxes();
    if (this.state !== 'stunned' && this.state !== 'intro') hb.push({ x: this.x + 0.3, y: this.y, w: this.w - 0.6, h: this.h - 0.9 });
    return hb;
  }
  weakspots() { return [{ x: this.x + 0.2, y: this.y + this.h - 1.0, w: this.w - 0.4, h: 1.0, how: ['stomp'] }]; }
  onHit() {
    this.state = 'stunned'; this.st = 0; this.vx = 0; this.speed += 2.2;
    const p = this.game.player; p.vy = p.pounding ? 20 : 15; p.pounding = false; p.jumpsUsed = 1;
    CZ.Effects.burst(this.cx(), this.y + this.h, 0xffd700, 20, { spread: 10, up: 8, life: 1 });
    for (const dx of [-3, 3]) this.game.spawnEnemy({ kind: 'rat', x: CZ.clamp(this.cx() + dx, this.arena.x + 2, this.arena.x + this.arena.w - 4), y: this.y + 1, min: this.arena.x, max: this.arena.x + this.arena.w, speed: 3.4 });
    this.game.toast(['RAT KING: "SQUEAK!! ...that\'s not fair."', 'RAT KING: "My crown! My BEAUTIFUL crown!"'][3 - this.hp - 1] || 'RAT KING: "..."');
  }
  think(dt) {
    const p = this.game.player, solids = this.game.level.blocking({});
    this.st += dt;
    const toPlayer = CZ.sign(p.cx() - this.cx()) || -1;
    switch (this.state) {
      case 'intro': this.vx = 0; if (this.st > 1.2) { this.state = 'idle'; this.st = 0; } break;
      case 'idle':
        this.vx = CZ.damp(this.vx, 0, 8, dt); this.facing = toPlayer;
        if (this.st > 0.8) { this.st = 0; this.state = this.next; this.next = this.next === 'charge' ? 'leap' : 'charge'; if (this.state === 'leap') { this.vy = 17; this.vx = CZ.clamp((p.cx() - this.cx()) / 0.9, -14, 14); CZ.Audio.sfx.warn(); } else { this.facing = toPlayer; CZ.Audio.sfx.warn(); } }
        break;
      case 'charge': {
        this.vx = this.facing * this.speed;
        if (Math.random() < 0.4) CZ.Effects.burst(this.x + (this.facing > 0 ? 0 : this.w), this.y + 0.2, 0xcccccc, 1, { spread: 2, up: 2, life: 0.4, size: 0.8 });
        if (this.st > 2.4) { this.state = 'idle'; this.st = 0; }
        break; }
      case 'leap': if (this.st > 0.3 && this.grounded) { this.state = 'idle'; this.st = 0; this.slam(); } break;
      case 'stunned': this.vx = 0; if (this.st > 1.8) { this.state = 'idle'; this.st = 0; } break;
    }
    this.vy -= 40 * dt; this.vy = Math.max(this.vy, -35);
    const r = CZ.moveBody(this, dt, solids); this.grounded = r.grounded;
    if (r.hitX && this.state === 'charge') { this.state = 'idle'; this.st = 0; CZ.Effects.shake(0.5); this.facing = -r.hitX; }
    this.x = CZ.clamp(this.x, this.arena.x + 0.5, this.arena.x + this.arena.w - this.w - 0.5);
    for (const h of this.hazards) { h.life -= dt; if (h.life <= 0) h.active = false; }
    this.hazards = this.hazards.filter(h => h.active); this.shockMesh.visible = this.hazards.length > 0;
    // visuals
    this.group.position.set(this.cx(), this.y + this.h / 2, 0);
    this.group.scale.x = this.facing < 0 ? 1 : -1;
    const stun = this.state === 'stunned';
    this.body.scale.y = CZ.damp(this.body.scale.y, stun ? 0.6 : 0.95 + Math.sin(this.t * 12) * 0.04 * (Math.abs(this.vx) > 1 ? 1 : 0), 10, dt);
    this.head.position.y = CZ.damp(this.head.position.y, stun ? -0.2 : 0.5, 10, dt);
    this.head.rotation.z = stun ? Math.sin(this.t * 10) * 0.3 : 0;
    this.tail.rotation.z = Math.PI / 2 + 0.5 + Math.sin(this.t * 6) * 0.4;
    this.body.material = CZ.Effects.toon(this.invuln > 0 && Math.floor(this.t * 20) % 2 ? 0xffffff : 0x6a6a78);
  }
  slam() {
    CZ.Audio.sfx.poundLand(); CZ.Effects.shake(1); CZ.Effects.burst(this.cx(), this.y, 0xcccccc, 20, { spread: 12, up: 4, life: 0.6 });
    const hz = { x: this.x - 3, y: this.y, w: this.w + 6, h: 0.7, active: true, life: 0.4 };
    this.hazards.push(hz);
    this.shockMesh.scale.x = hz.w; this.shockMesh.position.set(hz.x + hz.w / 2, hz.y + 0.35, 0.3);
  }
};

// ───────────────────────── THE SORTER ─────────────────────────
CZ.AntiCheat = class AntiCheat extends CZ.Boss {
  constructor(game, arena) {
    super(game, arena); this.name = 'THE SORTER'; this.hp = this.maxHp = 3;
    this.cx = arena.x + arena.w / 2; this.cy = 6.5; this.w = 2.2; this.h = 2.2; this.ang = 0; this.spin = 1.4; this.attackT = 2.5; this.attackN = 0; this.rate = 3.4;
    const E = CZ.Effects;
    this.core = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshToonMaterial({ map: CZ.Tex.get('circuit', 'data'), color: 0xff5577, emissive: 0x660011 })); E.outline(this.core, 0.1); this.group.add(this.core);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.12), E.basic(0xffffff)); eye.position.z = 0.95; this.group.add(eye);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.1), E.basic(0x111111)); pupil.position.z = 0.08; eye.add(pupil); this.pupil = pupil; this.eye = eye;
    this.panels = [];
    for (let i = 0; i < 4; i++) {
      const vert = i % 2 === 0;
      const m = new THREE.Mesh(new THREE.BoxGeometry(vert ? 0.7 : 3.4, vert ? 3.4 : 0.7, 1.2), new THREE.MeshToonMaterial({ map: CZ.Tex.get('circuit', 'data'), color: 0xd9a3ff, emissive: 0x3a0060, transparent: true, opacity: 0.9 }));
      const wire = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ color: 0xff7bff, wireframe: true })); m.add(wire);
      this.group.add(m); this.panels.push({ m, vert, box: { x: 0, y: 0, w: vert ? 0.7 : 3.4, h: vert ? 3.4 : 0.7 } });
    }
    this.light = new THREE.PointLight(0xff2d55, 10, 14); this.group.add(this.light);
    this.telegraphs = [];
  }
  deathX() { return this.cx; } deathY() { return this.cy; }
  aabb() { return { x: this.cx - this.w / 2, y: this.cy - this.h / 2, w: this.w, h: this.h }; }
  weakspots() { return [{ ...this.aabb(), how: ['touch'] }]; }
  hurtboxes() {
    const hb = super.hurtboxes();
    if (!this.game.player.noclip) for (const p of this.panels) hb.push(p.box);   // shield hurts unless you phase through it
    return hb;
  }
  onHit() {
    this.spin += 1.2; this.rate = Math.max(1.8, this.rate - 0.6);
    const p = this.game.player; p.vy = 15; p.vx = (p.cx() < this.cx ? -1 : 1) * 10; p.iframes = 1.2; p.jumpsUsed = 1; p.canDash = true; // blast the player out of the shield
    for (let i = 0; i < 10; i++) this.game.projectiles.push(new CZ.Projectile(this.game, this.cx, this.cy, Math.cos(i / 10 * Math.PI * 2) * 7, Math.sin(i / 10 * Math.PI * 2) * 7, { color: 0xff2d55, life: 2.5 }));
    this.game.toast(['THE SORTER: "UNGRADED ITEM. RESCANNING."', 'THE SORTER: "ITEM IS INSIDE THE SCANNER. HOW."'][2 - this.hp] || '');
  }
  think(dt) {
    const p = this.game.player, A = this.arena;
    // hover
    this.cx = A.x + A.w / 2 + Math.sin(this.t * 0.45) * (A.w / 2 - 10);
    this.cy = 6.5 + Math.sin(this.t * 0.9) * 1.6;
    this.group.position.set(this.cx, this.cy, 0);
    this.core.rotation.y += dt * 2; this.core.rotation.x += dt * 0.7;
    this.core.material.color.set(this.invuln > 0 && Math.floor(this.t * 20) % 2 ? 0xffffff : 0xff2d55);
    this.pupil.position.x = CZ.clamp((p.cx() - this.cx) * 0.03, -0.2, 0.2); this.pupil.position.y = CZ.clamp((p.cy() - this.cy) * 0.03, -0.2, 0.2);
    // shield orbit
    this.ang += dt * this.spin; const R = 2.6;
    this.panels.forEach((pn, i) => {
      const a = this.ang + i * Math.PI / 2, px = Math.cos(a) * R, py = Math.sin(a) * R;
      pn.m.position.set(px, py, 0); pn.m.rotation.z = a;
      pn.vert = Math.abs(Math.cos(a)) > 0.707;
      const bw = pn.vert ? 0.8 : 3.0, bh = pn.vert ? 3.0 : 0.8;
      pn.box.x = this.cx + px - bw / 2; pn.box.y = this.cy + py - bh / 2; pn.box.w = bw; pn.box.h = bh;
      pn.m.material.opacity = p.noclip ? 0.3 : 0.9;
    });
    // attacks
    this.attackT -= dt;
    if (this.attackT <= 0) { this.attackT = this.rate; this.attack(this.attackN++ % 3); }
    // update hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]; h.life -= dt;
      if (h.kind === 'sweep') { if (h.life < h.activeAt) { h.active = true; h.x += h.dir * 8 * dt; } h.mesh.position.x = h.x + h.w / 2; h.mesh.material.opacity = h.active ? 0.85 : 0.15 + 0.1 * Math.sin(this.t * 30); h.mesh.scale.x = h.active ? 1 : 0.4; }
      if (h.kind === 'hammer') { if (h.life < h.activeAt) { h.active = true; h.y -= 24 * dt; if (h.y <= 0) { h.life = 0; CZ.Effects.burst(h.x + h.w / 2, 0, 0xb455ff, 14, { spread: 8, up: 5 }); CZ.Effects.shake(0.5); CZ.Audio.sfx.poundLand(); } } h.mesh.position.y = h.y + h.h / 2; h.warn.material.opacity = h.active ? 0 : 0.2 + 0.1 * Math.sin(this.t * 25); }
      if (h.life <= 0) { this.removeMesh(h.mesh); if (h.warn) this.removeMesh(h.warn); this.hazards.splice(i, 1); }
    }
  }
  attack(n) {
    const A = this.arena, p = this.game.player; CZ.Audio.sfx.warn();
    if (n === 0 || n === 2) {
      // sweeping laser from the side nearest the player… towards them
      const dir = p.cx() < this.cx ? 1 : -1; const x0 = dir > 0 ? A.x + 1 : A.x + A.w - 2;
      const h = { kind: 'sweep', x: x0, y: 0, w: 0.9, h: A.h, dir, life: 1.0 + A.w / 8, activeAt: A.w / 8, active: false };
      h.mesh = this.column(0, 0, h.w, h.h, 0xff2d55, 0.2); h.mesh.position.set(h.x + h.w / 2, h.h / 2, 0.2);
      this.game.toast('THE SORTER: "SCANNING."'); this.hazards.push(h); CZ.Audio.sfx.laser();
    } else {
      this.game.toast('THE SORTER: "STAMPING."');
      for (let i = 0; i < 3; i++) {
        const x = CZ.clamp(p.cx() + (i - 1) * 4.5 + p.vx * 0.4, A.x + 1, A.x + A.w - 4) - 1.5;
        const h = { kind: 'hammer', x, y: A.h + 2, w: 3, h: 2, life: 0.8 + 2.4, activeAt: 2.4, active: false };
        h.mesh = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 2.4), new THREE.MeshToonMaterial({ color: 0xb455ff, emissive: 0x3a0060 })); CZ.Effects.edges(h.mesh); h.mesh.position.set(x + 1.5, h.y + 1, 0); this.game.scene.add(h.mesh); this.hazardMeshes.push(h.mesh);
        h.warn = this.column(x, 0, 3, A.h + 4, 0xff2d55, 0.2);
        this.hazards.push(h);
      }
    }
  }
};
// ───────────────────────── THE CHEESEMONGER (he left you to rot) ─────────────────────────
CZ.GodOfGames = class GodOfGames extends CZ.Boss {
  constructor(game, arena) {
    super(game, arena); this.name = 'THE CHEESEMONGER'; this.hp = this.maxHp = 5;
    const A = arena; this.fx = A.x + A.w - 9; this.fy = 13;
    this.appleSpots = [[A.x + 61, 19.2], [A.x + 12, 17], [A.x + 36, 20.4], [A.x + 68, 8.2], [A.x + 32, 13.5]];
    this.appleI = 0; this.ax = this.appleSpots[0][0]; this.ay = this.appleSpots[0][1];
    this.boltT = 2.0; this.boltRate = 2.6; this.handT = 4; this.handRate = 5; this.delT = 6; this.delRate = 7;
    const E = CZ.Effects;
    // face
    this.face = new THREE.Group(); this.group.add(this.face);
    const head = new THREE.Mesh(new THREE.SphereGeometry(3.2, 9, 7), E.toon(0xffd23f)); head.castShadow = true; E.outline(head, 0.12); this.face.add(head);
    const bill = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 2.2), E.toon(0xff8a1f)); bill.position.set(0, -1.3, 2.6); this.face.add(bill);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 1.8), E.toon(0xf5c02f)); tail.position.set(-3.4, 1.4, -0.6); tail.rotation.z = 0.5; this.face.add(tail);
    for (const s2 of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.6, 2.6), E.toon(0xf5c02f)); wing.position.set(s2 * 3.1, -0.6, 0); this.face.add(wing); }
    this.eyesG = []; [[-1.1, 0.6], [1.1, 0.6]].forEach(([x, y]) => { const e = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.2), E.basic(0xffffff)); e.position.set(x, y, 2.9); const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.16), E.basic(0x1a0f0a)); p.position.z = 0.12; e.add(p); this.face.add(e); this.eyesG.push({ e, p }); });
    this.browsG = []; [[-1.1, 1.4, 1], [1.1, 1.4, -1]].forEach(([x, y, s]) => { const b = E.box(1.2, 0.22, 0.2, 0xffffff); b.position.set(x, y, 2.9); b.rotation.z = s * 0.25; this.face.add(b); this.browsG.push({ b, s }); });
    this.mouthG = E.box(1.2, 0.25, 0.2, 0x5a1a1a); this.mouthG.position.set(0, -1.1, 2.95); this.face.add(this.mouthG);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.22, 4, 12), new THREE.MeshBasicMaterial({ color: 0xffd700 })); halo.position.y = 3.6; halo.rotation.x = Math.PI / 2.4; this.face.add(halo); this.halo = halo;
    // apple
    this.apple = new THREE.Group();
    const ap = new THREE.Mesh(new THREE.SphereGeometry(0.78, 7, 6), new THREE.MeshToonMaterial({ color: 0xffd700, emissive: 0x806000 })); ap.scale.y = 1.05; E.outline(ap, 0.08); this.apple.add(ap);
    const stem = E.box(0.1, 0.4, 0.1, 0x6b4a2a); stem.position.y = 0.85; this.apple.add(stem);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.16), E.toon(0x39ff88)); leaf.scale.set(1.6, 0.6, 0.4); leaf.position.set(0.25, 0.95, 0); this.apple.add(leaf);
    const al = new THREE.PointLight(0xffd700, 12, 12); this.apple.add(al);
    this.group.add(this.apple);
    // hand
    this.hand = new THREE.Group(); const palm = E.box(3.6, 1.4, 2.4, 0xffe0c0); E.outline(palm, 0.1); this.hand.add(palm);
    for (let i = 0; i < 4; i++) { const f = E.box(0.7, 1.3, 0.7, 0xffe0c0); f.position.set(-1.3 + i * 0.86, -1.2, 0.5); this.hand.add(f); }
    this.hand.position.set(A.x + 10, A.h + 4, 0); this.hand.visible = false; this.group.add(this.hand);
    this.handState = 'idle'; this.handX = A.x + 10; this.handY = A.h + 4;
    this.plats = game.level.solids.filter(s => s.plat && s.x > A.x && s.x < A.x + A.w);
  }
  deathX() { return this.fx; } deathY() { return this.fy; }
  weakspots() { return [{ x: this.ax - 0.85, y: this.ay - 0.85, w: 1.7, h: 1.7, how: ['touch'] }]; }
  hurtboxes() {
    const hb = super.hurtboxes();
    if (this.handState === 'slam' || this.handState === 'down') hb.push({ x: this.handX - 1.8, y: this.handY - 1.9, w: 3.6, h: 2.6 });
    return hb;
  }
  onHit() {
    this.appleI = (this.appleI + 1) % this.appleSpots.length;
    const s = this.appleSpots[this.appleI]; this.ax = s[0]; this.ay = s[1];
    CZ.Effects.burst(this.ax, this.ay, 0xffd700, 24, { spread: 10, up: 6, life: 1, size: 1.4 });
    this.boltRate *= 0.85; this.handRate *= 0.85; this.delRate *= 0.85;
    const p = this.game.player; p.vy = Math.max(p.vy, 9); p.jumpsUsed = 1; p.canDash = true;
    this.game.toast(['THE CHEESEMONGER: "Get back on the shelf."', 'THE CHEESEMONGER: "You are not even ripe."', 'THE CHEESEMONGER: "I am taking the floor away."', 'THE CHEESEMONGER: "...how are you still rolling."'][this.maxHp - this.hp - 1] || '');
    CZ.Audio.sfx.god();
  }
  onDeathStart() { this.game.toast('THE CHEESEMONGER: "...fine. Go on then."'); }
  think(dt) {
    const p = this.game.player, A = this.arena;
    // face + apple visuals
    this.face.position.set(this.fx, this.fy + Math.sin(this.t) * 0.4, -1);
    this.face.rotation.z = Math.sin(this.t * 0.5) * 0.05;
    for (const { e, p: pp } of this.eyesG) { pp.position.x = CZ.clamp((p.cx() - this.fx) * 0.02, -0.3, 0.3); pp.position.y = CZ.clamp((p.cy() - this.fy) * 0.02, -0.3, 0.3); }
    const anger = (this.maxHp - this.hp) / this.maxHp;
    for (const { b, s } of this.browsG) b.rotation.z = s * (0.25 + anger * 0.5);
    this.mouthG.scale.x = 1 + anger; this.halo.rotation.z += dt;
    this.apple.position.set(this.ax, this.ay + Math.sin(this.t * 3) * 0.15, 0); this.apple.rotation.y += dt * 1.5;
    this.apple.visible = !(this.invuln > 0 && Math.floor(this.t * 14) % 2);
    // lightning
    this.boltT -= dt;
    if (this.boltT <= 0) {
      this.boltT = this.boltRate; CZ.Audio.sfx.warn();
      const x = CZ.clamp(p.cx() + p.vx * 0.25, A.x + 1, A.x + A.w - 2) - 0.7;
      const h = { kind: 'bolt', x, y: 0, w: 1.4, h: A.h + 4, life: 0.75 + 0.3, activeAt: 0.3, active: false };
      h.mesh = this.column(x, 0, 1.4, A.h + 4, 0xffd700, 0.18); this.hazards.push(h);
    }
    // hand
    this.handT -= dt;
    if (this.handState === 'idle' && this.handT <= 0) { this.handState = 'track'; this.hst = 0; this.hand.visible = true; this.handY = A.h + 2; CZ.Audio.sfx.warn(); }
    if (this.handState === 'track') { this.hst += dt; this.handX = CZ.damp(this.handX, p.cx(), 6, dt); this.handY = CZ.damp(this.handY, A.h - 2, 4, dt); if (this.hst > 0.9) { this.handState = 'slam'; CZ.Audio.sfx.poundStart(); } }
    else if (this.handState === 'slam') { this.handY -= 30 * dt; if (this.handY <= 1.9) { this.handY = 1.9; this.handState = 'down'; this.hst = 0; CZ.Effects.shake(1); CZ.Audio.sfx.poundLand(); CZ.Effects.burst(this.handX, 0, 0xffffff, 18, { spread: 12, up: 5 }); } }
    else if (this.handState === 'down') { this.hst += dt; if (this.hst > 0.7) this.handState = 'rise'; }
    else if (this.handState === 'rise') { this.handY += 14 * dt; if (this.handY > A.h + 4) { this.handState = 'idle'; this.hand.visible = false; this.handT = this.handRate; } }
    this.hand.position.set(this.handX, this.handY, 0.3);
    // floor deletion
    this.delT -= dt;
    if (this.delT <= 0) {
      this.delT = this.delRate; const n = 1 + Math.floor((this.maxHp - this.hp) / 2);
      const cands = this.plats.filter(s => !s.broken && !s.deleting); for (let i = 0; i < n && cands.length; i++) { const s = cands.splice((Math.random() * cands.length) | 0, 1)[0]; s.deleting = 0.9; }
      this.game.toast('THE CHEESEMONGER: "Mind the floor."'); CZ.Audio.sfx.laser();
    }
    for (const s of this.plats) {
      if (s.deleting !== undefined && s.deleting > 0) { s.deleting -= dt; s.mesh.visible = Math.floor(this.t * 20) % 2 === 0; if (s.deleting <= 0) { s.broken = true; s.mesh.visible = false; s.restore = 3.2; s.deleting = undefined; CZ.Effects.burst(s.x + s.w / 2, s.y + 0.3, 0xffffff, 10, { spread: 5, up: 3, gravity: 0 }); } }
      else if (s.restore > 0) { s.restore -= dt; if (s.restore <= 0) { s.broken = false; s.mesh.visible = true; CZ.Effects.burst(s.x + s.w / 2, s.y + 0.3, 0xffd700, 8, { spread: 4, up: 3, gravity: 0 }); } }
    }
    // hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]; h.life -= dt;
      if (h.kind === 'bolt') { if (h.life < h.activeAt && !h.active) { h.active = true; CZ.Audio.sfx.thunder(); CZ.Effects.shake(0.7); CZ.Effects.burst(h.x + h.w / 2, 0.5, 0xffd700, 10, { spread: 6, up: 6 }); } h.mesh.material.opacity = h.active ? 0.95 : 0.15 + 0.1 * Math.sin(this.t * 30); h.mesh.material.color.set(h.active ? 0xffffff : 0xffd700); h.mesh.scale.x = h.active ? 0.6 : 1; }
      if (h.life <= 0) { this.removeMesh(h.mesh); this.hazards.splice(i, 1); }
    }
  }
  deathAnim(dt) { this.face.position.y += dt * 6; this.face.rotation.z += dt; this.apple.position.set(this.ax, Math.max(1.2, this.ay - this.deathT * 8), 0); this.hand.visible = false; }
  cleanup() {
    super.cleanup();
    for (const s of this.plats) { s.broken = false; s.mesh.visible = true; s.deleting = undefined; s.restore = 0; }
  }
};

CZ.createBoss = (game, d) => {
  const arena = { x: d.x, y: 0, w: d.w, h: d.h };
  switch (d.kind) {
    case 'ratking': return new CZ.RatKing(game, arena);
    case 'anticheat': return new CZ.AntiCheat(game, arena);
    case 'god': return new CZ.GodOfGames(game, arena);
  }
  return null;
};
