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
    const box = (w, h, d, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), E.toon(c)); m.castShadow = true; return m; };
    const FUR = 0x6e6e7c, FUR_LT = 0x83838f, PALE = 0xb2b2be, PINK = 0xffaabb, GOLD = 0xffd700;

    // He is the same animal as the rats you have been stomping all game, three
    // times the size and wearing something he took off somebody. Built side-on:
    // a long hunched body, a heavy shoulder, a snout out front, a tail that
    // whips, and a crown that is visibly too small for him.
    // The rig is drawn at its own comfortable scale and then fitted to the
    // collision box, so his feet land on the floor and his snout reaches the
    // front of the box he actually hits you with.
    this.rig = new THREE.Group(); this.rig.scale.setScalar(0.82); this.group.add(this.rig);
    this.rigY = 0.16;

    // A heavy back end, a body that tapers toward the shoulders, and a hump
    // over them: the silhouette of something that is mostly arse and appetite.
    const haunch = box(2.1, 1.85, 1.6, FUR); haunch.position.set(1.15, 0.0, 0);
    E.outline(haunch, 0.09); this.rig.add(haunch); this.haunch = haunch;
    const body = box(2.3, 1.45, 1.42, FUR_LT); body.position.set(-0.3, -0.12, 0);
    E.outline(body, 0.09); this.rig.add(body); this.body = body;
    const belly = box(3.6, 0.4, 1.34, PALE); belly.position.set(0.3, -0.78, 0); this.rig.add(belly);
    // the hump over his shoulders, where all the weight is
    const hump = box(1.7, 0.72, 1.3, FUR); hump.position.set(-0.55, 0.78, 0);
    E.outline(hump, 0.07); this.rig.add(hump);
    // scars: bald patches the colour of old rope, down the near flank
    for (const [sx, sy, sw] of [[0.3, 0.35, 0.5], [1.2, 0.4, 0.38], [-0.5, -0.3, 0.6]]) {
      const sc = box(sw, 0.14, 0.06, 0xa2927e); sc.position.set(sx, sy, 0.72); sc.castShadow = false;
      sc.rotation.z = 0.3; this.rig.add(sc);
    }

    this.head = new THREE.Group(); this.head.position.set(-1.6, 0.4, 0); this.rig.add(this.head);
    const skull = box(1.45, 1.3, 1.3, FUR_LT); E.outline(skull, 0.08); this.head.add(skull);
    const brow = box(1.2, 0.22, 1.32, FUR); brow.position.set(-0.1, 0.5, 0); this.head.add(brow);
    const snout = box(1.0, 0.6, 0.86, PALE); snout.position.set(-1.05, -0.3, 0); E.outline(snout, 0.05); this.head.add(snout);
    const nose = box(0.3, 0.28, 0.32, 0xff7a9a); nose.position.set(-1.55, -0.26, 0); this.head.add(nose);
    // two long yellow incisors under the snout
    for (const s2 of [-1, 1]) {
      const tooth = box(0.18, 0.48, 0.16, 0xe8d98a); tooth.position.set(-1.2, -0.76, s2 * 0.18);
      tooth.rotation.z = s2 * 0.06; this.head.add(tooth);
    }
    this.ears = [];
    for (const s2 of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.14, 10), E.toon(PINK));
      ear.rotation.x = Math.PI / 2; ear.position.set(0.2, 0.86, s2 * 0.48);
      E.outline(ear, 0.05); this.head.add(ear); this.ears.push(ear);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10), E.toon(0xd4707f));
      inner.rotation.x = Math.PI / 2; inner.position.z = s2 * 0.02; ear.add(inner);
      // a notch bitten out of the left ear, because of course there is
      if (s2 < 0) { const notch = box(0.2, 0.22, 0.2, FUR_LT); notch.position.set(-0.18, 0.34, 0); ear.add(notch); }
      // the eye: white, red pupil, glint
      const white = new THREE.Mesh(new THREE.CircleGeometry(0.3, 12), E.basic(0xfff0f0));
      white.position.set(-0.42, 0.14, s2 * 0.66); white.rotation.y = s2 > 0 ? 0 : Math.PI; this.head.add(white);
      const pup = new THREE.Mesh(new THREE.CircleGeometry(0.15, 10), E.basic(0xc21f2e));
      pup.position.set(-0.05, 0, 0.01); white.add(pup);
      const slit = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), E.basic(0x2a0408));
      slit.position.z = 0.01; pup.add(slit);
      const glint = new THREE.Mesh(new THREE.CircleGeometry(0.055, 6), E.basic(0xffffff));
      glint.position.set(-0.07, 0.08, 0.02); white.add(glint);
      for (const wy of [0.06, -0.16, -0.36]) {
        const w = box(1.0, 0.055, 0.055, 0xe8e2d8);
        w.position.set(-1.75, wy - 0.2, s2 * 0.32); w.rotation.z = s2 * 0.08 + (wy - 0.06) * 0.9;
        this.head.add(w);
      }
    }
    // the crown, jammed on crooked and a size too small
    const crown = new THREE.Group(); crown.position.set(0.0, 0.82, 0); crown.rotation.z = -0.16; this.head.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.6, 0.36, 10), E.toon(GOLD));
    E.outline(band, 0.05); crown.add(band);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42 + (i % 3) * 0.12, 4), E.toon(GOLD));
      sp.position.set(Math.cos(a) * 0.52, 0.34, Math.sin(a) * 0.52);
      sp.rotation.z = (i % 2 ? 0.12 : -0.08); crown.add(sp);
      if (i % 2 === 0) {
        const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), E.basic(i % 4 ? 0xff2d55 : 0x39ff88));
        jewel.position.set(Math.cos(a) * 0.6, 0.02, Math.sin(a) * 0.6); crown.add(jewel);
      }
    }
    this.crown = crown;
    // a rag cloak over the shoulders, hanging in strips that swing
    // Short and over the shoulders only: a full-length cloak just hides the
    // animal, and the animal is the point.
    this.rags = [];
    for (let i = 0; i < 5; i++) {
      const piv = new THREE.Group();
      piv.position.set(-1.05 + i * 0.44, 0.92, 0.78);
      this.rig.add(piv);
      const len = 0.62 + (i % 3) * 0.26;
      const rag = box(0.4, len, 0.1, i % 2 ? 0x71304f : 0x8d3d61);
      rag.position.y = -len / 2; rag.castShadow = false; piv.add(rag);
      const tip = box(0.3, 0.22, 0.1, 0x5a2340);
      tip.position.set(0.07, -len - 0.08, 0); tip.rotation.z = 0.4; tip.castShadow = false; piv.add(tip);
      this.rags.push({ piv, phase: i * 0.7 });
    }
    // the collar it all hangs off, a strip of something he tore up
    const collar = box(2.2, 0.3, 1.62, 0x8d3d61); collar.position.set(-0.45, 0.95, 0);
    E.outline(collar, 0.05); this.rig.add(collar);
    // four legs that scrabble when he runs
    this.legs = [];
    for (const [lx, ly, s2] of [[-0.9, -0.9, 1], [-0.9, -0.9, -1], [1.2, -0.9, 1], [1.2, -0.9, -1]]) {
      const piv = new THREE.Group(); piv.position.set(lx, ly, s2 * 0.5); this.rig.add(piv);
      const leg = box(0.34, 0.62, 0.34, FUR); leg.position.y = -0.31; piv.add(leg);
      const foot = box(0.5, 0.2, 0.42, PALE); foot.position.set(-0.08, -0.62, 0); piv.add(foot);
      this.legs.push({ piv, phase: (lx < 0 ? 0 : Math.PI) + (s2 > 0 ? 0 : Math.PI / 2) });
    }
    // tail: five chained segments that whip behind him
    this.tail = []; let parent = this.rig, off = 2.0;
    for (let i = 0; i < 5; i++) {
      const pivot = new THREE.Group(); pivot.position.set(off, i === 0 ? 0.2 : 0, 0); parent.add(pivot);
      if (i === 0) pivot.rotation.z = 0.5;
      const seg = box(0.62 - i * 0.07, 0.3 - i * 0.045, 0.3 - i * 0.045, 0xe08a9a);
      seg.position.x = 0.31 - i * 0.035; pivot.add(seg);
      this.tail.push(pivot); parent = pivot; off = 0.6 - i * 0.07;
    }
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
    // ---- visuals ----
    this.group.position.set(this.cx(), this.y + this.h / 2, 0);
    this.group.scale.x = this.facing < 0 ? 1 : -1;
    const stun = this.state === 'stunned';
    const run = CZ.clamp(Math.abs(this.vx) / this.speed, 0, 1);
    const gait = this.t * (6 + run * 12);
    // breathing, and the whole animal dropping into a crouch when he is stunned
    this.rig.position.y = CZ.damp(this.rig.position.y, this.rigY + (stun ? -0.5 : Math.sin(this.t * 3) * 0.04), 9, dt);
    this.rig.rotation.z = CZ.damp(this.rig.rotation.z, stun ? 0.14 : -run * 0.1, 8, dt);
    this.haunch.scale.y = CZ.damp(this.haunch.scale.y, stun ? 0.75 : 1 + Math.sin(this.t * 3) * 0.03, 9, dt);
    this.body.scale.y = CZ.damp(this.body.scale.y, stun ? 0.72 : 1 + Math.sin(this.t * 3 + 1) * 0.035, 9, dt);
    // the head leads the charge and hangs when he is seeing stars
    this.head.position.y = CZ.damp(this.head.position.y, stun ? -0.35 : 0.42 - run * 0.18, 10, dt);
    this.head.rotation.z = CZ.damp(this.head.rotation.z, stun ? Math.sin(this.t * 9) * 0.28 : -run * 0.12, 12, dt);
    // ears twitch on their own and pin back at speed
    this.ears.forEach((ear, i) => {
      const pin = stun ? -0.5 : -run * 0.8;
      ear.rotation.z = CZ.damp(ear.rotation.z, pin + Math.sin(this.t * (2.1 + i * 0.4)) * 0.12, 10, dt);
    });
    // the crown slips further every time you take a hit off him
    this.crown.rotation.z = CZ.damp(this.crown.rotation.z, -0.16 - (3 - this.hp) * 0.22 + (stun ? 0.5 : 0), 7, dt);
    this.crown.position.y = CZ.damp(this.crown.position.y, 1.0 - (3 - this.hp) * 0.06, 7, dt);
    // legs scrabble in a two-beat gait, and fold under him when stunned
    for (const l of this.legs) {
      const swing = stun ? -0.7 : Math.sin(gait + l.phase) * (0.18 + run * 0.7);
      l.piv.rotation.z = CZ.damp(l.piv.rotation.z, swing, 18, dt);
      l.piv.position.y = CZ.damp(l.piv.position.y, stun ? -1.15 : -0.9 + Math.max(0, Math.sin(gait + l.phase)) * run * 0.18, 16, dt);
    }
    // the rags swing behind him, late, the way cloth does
    for (const r of this.rags) {
      r.piv.rotation.z = CZ.damp(r.piv.rotation.z,
        CZ.clamp(this.vx * 0.02, -0.32, 0.32) + Math.sin(this.t * 4 + r.phase) * 0.09, 6, dt);
    }
    // the tail whips, each segment a beat behind the one before it
    this.tail.forEach((seg, i) => {
      const base = i === 0 ? 0.5 : 0;
      seg.rotation.z = base + Math.sin(this.t * (5 + run * 4) - i * 0.8) * (0.18 + run * 0.22) + (stun ? -0.12 : 0);
    });
    const flash = this.invuln > 0 && Math.floor(this.t * 20) % 2;
    this.body.material = CZ.Effects.toon(flash ? 0xffffff : 0x83838f);
    this.haunch.material = CZ.Effects.toon(flash ? 0xffffff : 0x6e6e7c);
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
    // A sweep is one hazard with two boxes - the halves of the beam either side
    // of the hole - so it contributes those and never its own full-height span,
    // which would hurt you inside the gap it just told you to stand in.
    const hb = [];
    for (const h of this.hazards) {
      if (!h.active) continue;
      if (h.kind === 'sweep') { for (const seg of h.segs) hb.push(seg); }
      else hb.push(h);
    }
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
      if (h.kind === 'sweep') {
        // The beam is two columns with a hole between them. It crawls, so you
        // have time to read which half of the arena the hole is in and get to
        // it - and once you are in the hole, staying in it is the whole job.
        if (h.life < h.activeAt) { h.active = true; h.x += h.dir * h.speed * dt; }
        const lit = h.active ? 0.85 : 0.18 + 0.12 * Math.sin(this.t * 22);
        for (const seg of h.segs) {
          seg.x = h.x; seg.active = h.active;
          seg.mesh.position.x = h.x + h.w / 2;
          seg.mesh.material.opacity = lit;
          seg.mesh.scale.x = h.active ? 1 : 0.35;
        }
        // the safe gap gets its own marker, so you can see it coming
        h.gapMesh.position.x = h.x + h.w / 2;
        h.gapMesh.material.opacity = h.active ? 0.62 : 0.4 + 0.2 * Math.sin(this.t * 8);
      }
      if (h.kind === 'hammer') { if (h.life < h.activeAt) { h.active = true; h.y -= 24 * dt; if (h.y <= 0) { h.life = 0; CZ.Effects.burst(h.x + h.w / 2, 0, 0xb455ff, 14, { spread: 8, up: 5 }); CZ.Effects.shake(0.5); CZ.Audio.sfx.poundLand(); } } h.mesh.position.y = h.y + h.h / 2; h.warn.material.opacity = h.active ? 0 : 0.2 + 0.1 * Math.sin(this.t * 25); }
      if (h.life <= 0) {
        if (h.mesh) this.removeMesh(h.mesh);
        if (h.warn) this.removeMesh(h.warn);
        if (h.segs) for (const seg of h.segs) this.removeMesh(seg.mesh);
        if (h.gapMesh) this.removeMesh(h.gapMesh);
        this.hazards.splice(i, 1);
      }
    }
  }
  attack(n) {
    const A = this.arena, p = this.game.player; CZ.Audio.sfx.warn();
    if (n === 0 || n === 2) {
      // A scanning beam that crosses the arena with a gap in it: either high,
      // so you jump through, or along the floor, so you stay down and let it
      // pass over. It crawls and it telegraphs for a long beat first.
      const dir = p.cx() < this.cx ? 1 : -1, x0 = dir > 0 ? A.x + 1 : A.x + A.w - 2;
      // High: a hole one clean jump up. Low: a hole along the floor you simply
      // stay out of the air for. Both are twice the height of the wheel.
      const high = Math.random() < 0.5;
      const gapY = high ? 2.9 : 0, gapH = high ? 3.4 : 2.6;
      const speed = 6, cross = A.w / speed;
      const h = { kind: 'sweep', x: x0, y: 0, w: 0.9, h: A.h, dir, speed,
        life: 1.2 + cross, activeAt: cross, active: false, segs: [] };
      // the solid halves of the beam, above and below the hole
      const bands = [];
      if (gapY > 0.1) bands.push([0, gapY]);
      if (gapY + gapH < A.h) bands.push([gapY + gapH, A.h - (gapY + gapH)]);
      for (const [by, bh] of bands) {
        const seg = { x: x0, y: by, w: h.w, h: bh, active: false };
        seg.mesh = this.column(0, by, h.w, bh, 0xff2d55, 0.2);
        seg.mesh.position.set(x0 + h.w / 2, by + bh / 2, 0.2);
        h.segs.push(seg);
      }
      // the hole, marked in the one colour in this game that means 'safe'
      h.gapMesh = this.column(0, gapY, h.w * 1.7, gapH, 0x39ff88, 0.45);
      h.gapMesh.position.set(x0 + h.w / 2, gapY + gapH / 2, 0.15);
      this.hazards.push(h);              // one object owns the whole beam
      this.game.toast(high ? 'THE SORTER: "SCANNING. MIND THE GAP."' : 'THE SORTER: "SCANNING. HEADS DOWN."');
      CZ.Audio.sfx.laser();
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
