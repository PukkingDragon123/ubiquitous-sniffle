// Game orchestrator: renderer, camera, state machine, interactions, save/progress.
CZ.Game = class Game {
  constructor() {
    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 400);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x664422, 0.9); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2dd, 2.2); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048); const sc = this.sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 90; this.sun.shadow.bias = -0.0015;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    CZ.Effects.init(this.scene);

    // ── pixel-art pipeline ──────────────────────────────────────────────
    // The world renders into a small target and is blown up with NearestFilter,
    // so every 3D surface lands on a chunky pixel grid instead of smooth edges.
    this.rt = new THREE.WebGLRenderTarget(320, 180, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat, colorSpace: THREE.SRGBColorSpace, depthBuffer: true,
    });
    this.screenScene = new THREE.Scene();
    this.screenCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.screenQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: this.rt.texture }));
    this.screenScene.add(this.screenQuad);

    this.save = CZ.loadSave() || CZ.newSave();
    this.abilities = this.save.abilities;
    this.limbs = this.save.limbs || (this.save.limbs = {});
    this.state = 'title'; this.level = null; this.player = null; this.enemies = []; this.projectiles = []; this.boss = null; this.bossStarted = false;
    this.levelIndex = 0; this.levelTime = 0; this.levelDeaths = 0; this.levelBugs = 0; this.checkpoint = { x: 0, y: 0 };
    this.camX = 0; this.camY = 4; this.camZ = 19; this.acc = 0; this.last = performance.now(); this.deadT = 0; this.unlockingId = null;
    CZ.Touch.init(); this.bindUI(); this.resize(); window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(t => this.loop(t));
  }

  // ---------- menus ----------
  bindUI() {
    const U = CZ.UI, $ = U.$;
    const gesture = () => CZ.Audio.resume();
    window.addEventListener('pointerdown', gesture, { once: true }); window.addEventListener('keydown', gesture, { once: true });
    $('btn-play').onclick = () => { this.save = CZ.newSave(); this.abilities = this.save.abilities; this.limbs = this.save.limbs; CZ.writeSave(this.save); this.startIntro(); };
    $('btn-continue').onclick = () => this.startLevel(Math.min(this.save.level, CZ.LEVELS.length - 1), false);
    $('btn-levels').onclick = () => { U.levelList(CZ.LEVELS, this.save, i => { U.show('levelselect', false); this.startLevel(i, false); }); U.show('levelselect', true); };
    $('btn-controls').onclick = () => U.show('controls', true);
    document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { U.show('levelselect', false); U.show('controls', false); });
    $('btn-resume').onclick = () => this.setPaused(false);
    $('btn-restart').onclick = () => { this.setPaused(false); this.startLevel(this.levelIndex, false); };
    $('btn-quit').onclick = () => { this.setPaused(false); this.toTitle(); };
    $('btn-next').onclick = () => this.nextLevel();
    $('btn-ending-title').onclick = () => this.toTitle();
    this.refreshTitle();
  }
  refreshTitle() {
    const U = CZ.UI;
    const hasSave = this.save.level > 0 || Object.keys(this.save.abilities).length > 0;
    U.show('btn-continue', hasSave);
    U.$('best-time').textContent = this.save.completed && this.save.bestTime ? `BEST RUN ${CZ.fmtTime(this.save.bestTime)}` : '';
  }
  // ---------- opening cinematic ----------
  startIntro() {
    this.unloadLevel();
    if (this.cine) { this.cine.dispose(); this.cine = null; }
    const U = CZ.UI;
    U.show('title', false); U.show('hud', false); U.show('complete', false); U.show('ending', false);
    U.cineShow(true);
    this.cine = new CZ.Cinematic(this);
    this.cine.camera.aspect = this.camera.aspect; this.cine.camera.updateProjectionMatrix();
    this.cine.onDone = () => this.endIntro();
    this.state = 'intro';
    // tap or click anywhere to skip (the touch buttons are hidden during the cutscene)
    const startedAt = performance.now();
    this._skipTap = () => { if (this.state === 'intro' && this.cine && performance.now() - startedAt > 400) this.cine.skip(); };
    window.addEventListener('pointerdown', this._skipTap);
    CZ.Audio.resume();
    CZ.Audio.playMusic('boss');
  }
  endIntro() {
    const U = CZ.UI;
    if (this._skipTap) { window.removeEventListener('pointerdown', this._skipTap); this._skipTap = null; }
    U.cineShow(false); U.cineFx(0, 0);
    if (this.cine) { this.cine.dispose(); this.cine = null; }
    this.save.sawIntro = true; CZ.writeSave(this.save);
    this.startLevel(0, true);
  }

  toTitle() {
    this.unloadLevel();
    if (this._skipTap) { window.removeEventListener('pointerdown', this._skipTap); this._skipTap = null; }
    if (this.cine) { this.cine.dispose(); this.cine = null; }
    CZ.UI.cineShow(false); CZ.UI.cineFx(0, 0);
    this.state = 'title';
    const U = CZ.UI; U.show('title', true); U.show('hud', false); U.show('complete', false); U.show('ending', false); U.show('unlock', false); U.show('dialog', false); U.sign(null);
    this.refreshTitle(); CZ.Touch.setVisible(false); CZ.Audio.playMusic('title');
  }
  setPaused(on) {
    if (on && this.state !== 'playing') return;
    if (!on && this.state !== 'paused') return;
    if (on) this.clipTarget = this.findMenuClip();
    this.state = on ? 'paused' : 'playing'; CZ.UI.show('pause', on); CZ.Touch.setVisible(!on);
    if (!on && this.clipTarget) { this.doMenuClip(this.clipTarget); this.clipTarget = null; }
  }
  // Pausing parks the player outside the physics step. If they were pressed into a
  // wall when that happened, resuming puts them down on the far side of it.
  findMenuClip() {
    const p = this.player; if (!p || p.dead || !this.level) return null;
    const dir = p.facing;
    const probe = { x: p.x + (dir > 0 ? p.w - 0.05 : -0.25), y: p.y + 0.15, w: 0.3, h: p.h - 0.3 };
    const solids = this.level.blocking({});
    for (const s of solids) {
      if (!CZ.overlap(probe, s) || s.w > 4) continue;
      const nx = dir > 0 ? s.x + s.w + 0.05 : s.x - p.w - 0.05;
      if (nx < 0 || nx + p.w > this.level.data.width) continue;
      const dest = { x: nx, y: p.y, w: p.w, h: p.h };
      if (solids.some(o => CZ.overlap(dest, o))) continue;
      return { x: nx, y: p.y };
    }
    return null;
  }
  doMenuClip(t) {
    const p = this.player;
    CZ.Effects.burst(p.cx(), p.cy(), 0xb455ff, 14, { spread: 6, up: 2, gravity: 0, life: 0.5 });
    p.x = t.x; p.y = t.y; p.vx = 0; p.vy = 0; p.lastSafe = { x: p.x, y: p.y };
    CZ.Effects.burst(p.cx(), p.cy(), 0x39ff88, 14, { spread: 6, up: 2, gravity: 0, life: 0.5 });
    CZ.Audio.sfx.noclip(); CZ.Effects.shake(0.4);
    this.discover('menuClip');
  }
  // Register a glitch the player just found for themselves; these are not pickups.
  discover(id) {
    if (this.abilities[id]) return;
    this.abilities[id] = true; CZ.writeSave(this.save);
    CZ.UI.techs(this.abilities, this.player);
    CZ.UI.toast(`GLITCH FOUND  //  ${CZ.ABILITIES[id].name}`, 4200);
    CZ.Audio.sfx.unlock();
  }

  // ---------- level lifecycle ----------
  unloadLevel() {
    if (this.level) this.level.dispose();
    for (const e of this.enemies) CZ.Effects.disposeTree(e.mesh);
    for (const p of this.projectiles) p.kill(false);
    if (this.boss) this.boss.cleanup();
    if (this.player) {
      CZ.Effects.disposeTree(this.player.mesh); CZ.Effects.disposeTree(this.player.rope);
      for (const g of this.player.ghosts) { CZ.Effects.disposeTree(g); g.material.dispose(); }
    }
    CZ.Effects.clear();
    this.level = null; this.enemies = []; this.projectiles = []; this.boss = null; this.bossStarted = false; this.player = null;
  }
  startLevel(i, withIntro) {
    this.unloadLevel();
    const U = CZ.UI, data = CZ.LEVELS[i];
    this.levelIndex = i; this.levelTime = 0; this.levelDeaths = 0; this.levelBugs = 0;
    this.level = new CZ.Level(data, this.scene);
    this.scene.fog = new THREE.Fog(data.theme.fog, 28, 95);
    this.scene.background = new THREE.Color(data.theme.sky[1]);
    this.hemi.groundColor.set(data.theme.sky[1]); this.hemi.color.set(data.theme.sky[0]).lerp(new THREE.Color(0xffffff), 0.7);
    const gotBugs = new Set(this.save.bugs[data.id] || []);
    this.level.bugs.forEach((b, k) => { if (gotBugs.has(k)) { b.taken = true; b.mesh.visible = false; this.levelBugs++; } });
    // You assemble a body in world 1; every later world assumes you have one.
    if (i > 0) for (const id of CZ.LIMB_ORDER) this.limbs[id] = true;
    for (const a of this.level.abilities) {
      const owned = a.limb ? this.limbs[a.id] : this.abilities[a.id];
      if (owned) { a.taken = true; a.mesh.visible = false; }
    }
    this.player = new CZ.Player(this); this.scene.add(this.player.mesh);
    this.checkpoint = { x: data.spawn[0], y: data.spawn[1] }; this.player.respawn(this.checkpoint.x, this.checkpoint.y);
    this.spawnEnemies();
    this.camX = this.player.cx(); this.camY = this.player.cy() + 2; this.camZ = 19;
    U.show('title', false); U.show('complete', false); U.show('hud', true); U.levelName(data.name, data.sub); U.bossBar(null); U.sign(null);
    U.hp(this.player.hp, CZ.P.MAX_HP); U.bugs(this.levelBugs, this.level.bugTotal); U.techs(this.abilities, this.player); U.limbs(this.limbs);
    CZ.Spr.paint();
    CZ.Audio.playMusic(data.song);
    CZ.Touch.setVisible(true); CZ.Touch.syncAbilities(this.abilities);
    this.state = 'playing';
    U.toast(`${data.name}  //  ${data.sub}`, 3200);
    if (withIntro && data.intro) { this.state = 'dialog'; U.dialog(data.intro, () => { this.state = 'playing'; }); }
  }
  spawnEnemies() {
    for (const e of this.enemies) CZ.Effects.disposeTree(e.mesh);
    this.enemies = [];
    for (const d of this.level.enemySpawns) this.spawnEnemy(d);
  }
  spawnEnemy(d) { const e = CZ.createEnemy(this, d); if (e) this.enemies.push(e); return e; }

  playerDied() {
    this.state = 'dead'; this.deadT = 0; this.levelDeaths++; this.save.deaths++; CZ.UI.flash('rgba(255,40,60,.5)');
  }
  respawnAll() {
    this.player.respawn(this.checkpoint.x, this.checkpoint.y);
    this.spawnEnemies(); for (const p of this.projectiles) p.kill(false); this.projectiles = [];
    if (this.boss) { this.boss.cleanup(); this.boss = null; this.bossStarted = false; CZ.UI.bossBar(null); CZ.Audio.playMusic(this.level.data.song); }
    this.camX = this.player.cx(); this.camY = this.player.cy() + 2;
    this.state = 'playing';
  }
  completeLevel() {
    const U = CZ.UI, data = this.level.data; this.state = 'complete'; CZ.Touch.setVisible(false); CZ.Audio.sfx.exit();
    this.save.level = Math.max(this.save.level, this.levelIndex + 1); this.save.time += this.levelTime; CZ.writeSave(this.save);
    U.complete(this.levelIndex === CZ.LEVELS.length - 1 ? 'FACTORY ESCAPED' : 'LEVEL CLEARED',
      `<div class="stat"><span>${data.name}</span></div>`
      + U.stat('clock', CZ.fmtTime(this.levelTime))
      + U.stat('skull', `${this.levelDeaths} DEATHS`)
      + U.stat('bug', `BUG REPORTS ${this.levelBugs}/${this.level.bugTotal}`));
    U.$('btn-next').textContent = this.levelIndex === CZ.LEVELS.length - 1 ? 'GET THE APPLE' : 'NEXT';
  }
  nextLevel() {
    if (this.levelIndex + 1 < CZ.LEVELS.length) this.startLevel(this.levelIndex + 1, false);
    else this.showEnding();
  }
  showEnding() {
    const U = CZ.UI; this.unloadLevel(); this.state = 'ending'; CZ.Touch.setVisible(false); U.show('complete', false); U.show('hud', false);
    const total = CZ.LEVELS.reduce((n, l) => n + l.items.filter(x => x.t === 'bug').length, 0);
    const got = Object.values(this.save.bugs).reduce((n, a) => n + a.length, 0);
    this.save.completed = true; if (!this.save.bestTime || this.save.time < this.save.bestTime) this.save.bestTime = this.save.time; CZ.writeSave(this.save);
    U.ending(`You took the golden patch and rebuilt yourself: a <b>CHEESE MECH</b>, twelve metres of aged cheddar and stolen hitboxes. The dev signs off on it, because the alternative is you finding more bugs.<br><br>Somewhere in the Pantry a floor is still deleted. You will file it Monday.`,
      U.stat('clock', `TOTAL ${CZ.fmtTime(this.save.time)}`)
      + U.stat('skull', `${this.save.deaths} DEATHS`)
      + U.stat('bug', `BUG REPORTS ${got}/${total}`)
      + (got === total ? U.stat('apple', 'ALL BUGS FILED') : ''));
    CZ.Audio.playMusic('heaven');
  }

  // ---------- boss ----------
  startBoss() {
    const d = this.level.boss; this.bossStarted = true;
    this.boss = CZ.createBoss(this, d);
    // seal the arena behind the player
    this.boss.addSolid({ x: d.x - 1.5, y: 0, w: 1.5, h: d.h, glitch: false });
    this.checkpoint = { x: d.x + 2.5, y: 0 };
    CZ.UI.bossBar(this.boss); CZ.Audio.playMusic('boss'); CZ.Effects.shake(0.8); CZ.Audio.sfx.god();
  }
  bossDefeated(boss) {
    this.boss = null; CZ.UI.bossBar(null); CZ.Effects.shake(1.5); this.flash('rgba(255,255,255,.8)');
    CZ.Audio.playMusic(this.level.data.song);
    const lines = {
      ratking: [{ who: 'RAT KING', portrait: 'p-rat', text: 'Fine. FINE. The exit is that way. Tell no one a cheese did this.' }, { who: 'YOU', portrait: 'p-cheese', text: 'Filed under: "boss can be stomped". Severity: crown.' }],
      anticheat: [{ who: 'ANTI-CHEAT.EXE', portrait: 'p-guard', text: 'B-BAN FAILED. PLAYER... IS... INSIDE... THE... SHIELD...' }, { who: 'YOU', portrait: 'p-cheese', text: 'You checked WHERE I was. You never checked HOW I got there.' }],
      god: [{ who: 'THE DEV', portrait: 'p-duck', text: 'Take the patch. Build your stupid cheese mech. ...but HOW did you stand on that platform? I DELETED it.' }, { who: 'YOU', portrait: 'p-cheese', text: 'You deleted the mesh. You left the collision box. Classic. Want me to write it up?' }, { who: 'THE DEV', portrait: 'p-duck', text: '...yes. Please. My inbox is open. Take the exit.' }],
    }[this.level.boss.kind];
    if (lines) { this.state = 'dialog'; CZ.UI.dialog(lines, () => { this.state = 'playing'; }); }
  }
  shockwave(x, y, r) {
    for (const e of this.enemies) if (!e.dead && Math.abs(e.cx() - x) < r && Math.abs(e.y - y) < 1.6) e.kill('stomp');
    for (const p of this.projectiles) if (!p.dead && Math.abs(p.x - x) < r && Math.abs(p.y - y) < 2) p.kill(true);
  }
  flash(c) { CZ.UI.flash(c); }
  toast(t) { CZ.UI.toast(t); }

  // ---------- main loop ----------
  loop(now) {
    requestAnimationFrame(t => this.loop(t));
    let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    CZ.Input.update();
    this.update(dt);
    this.render();
  }
  update(dt) {
    const I = CZ.Input, U = CZ.UI;
    if (I.pressed('mute')) U.toast(CZ.Audio.toggleMute() ? 'SOUND OFF' : 'SOUND ON');
    if (this.state === 'intro') {
      if (I.pressed('confirm') || I.pressed('jump') || I.pressed('pause') || I.pressed('dash')) this.cine.skip();
      else this.cine.update(dt);
      return;
    }
    if (this.state === 'title' || this.state === 'ending') return;
    if (I.pressed('pause')) { if (this.state === 'playing') this.setPaused(true); else if (this.state === 'paused') this.setPaused(false); }
    if (this.state === 'paused') return;
    if (this.state === 'dialog') { if (I.pressed('confirm') || I.pressed('jump')) U.dialogAdvance(); this.ambient(dt); return; }
    if (this.state === 'unlock') { if (I.pressed('confirm') || I.pressed('jump')) { U.show('unlock', false); this.state = 'playing'; } this.ambient(dt); return; }
    if (this.state === 'complete') { this.ambient(dt); return; }
    this.levelTime += dt;
    if (this.state === 'dead') { this.deadT += dt; this.ambient(dt); if (this.deadT > 1.1) this.respawnAll(); this.updateCamera(dt); return; }
    // playing
    if (I.pressed('restart') && !this.player.dead) this.player.die();
    this.level.update(dt, this.player.cx());
    this.player.carryByGround(dt);
    const step = 1 / 120; this.acc += dt;
    while (this.acc >= step) { this.player.update(step); CZ.Input.clearEdges(); this.acc -= step; if (this.player.dead) break; }
    if (this.player.dead) { CZ.Effects.update(dt); this.player.updateVisual(dt); this.updateCamera(dt); return; }
    for (const e of this.enemies) if (!e.dead && Math.abs(e.cx() - this.player.cx()) < 48) e.update(dt);
    this.enemies = this.enemies.filter(e => !e.dead);
    for (const p of this.projectiles) p.update(dt);
    this.projectiles = this.projectiles.filter(p => !p.dead);
    if (this.boss) this.boss.update(dt);
    this.interact(dt);
    CZ.Effects.update(dt);
    this.updateCamera(dt);
    this.updateHUD();
  }
  ambient(dt) { if (this.level) this.level.update(dt, this.player ? this.player.cx() : 0); CZ.Effects.update(dt); if (this.player) this.player.updateVisual(dt); if (this.boss && this.state === 'dead') this.boss.update(dt); }

  interact(dt) {
    const p = this.player, L = this.level, U = CZ.UI, box = p.aabb();
    // checkpoints
    for (const c of L.checks) if (!c.active && Math.abs(p.cx() - c.x) < 1.3 && Math.abs(p.y - c.y) < 2.5) {
      c.active = true; c.flag.material = CZ.Effects.toon(0x39ff88); this.checkpoint = { x: c.x, y: c.y }; CZ.Audio.sfx.checkpoint(); U.toast('CHECKPOINT');
      CZ.Effects.burst(c.x, c.y + 2, 0x39ff88, 12, { spread: 5, up: 4 });
    }
    // bugs
    L.bugs.forEach((b, k) => {
      if (!b.taken && CZ.overlapPad(box, { x: b.x - 0.4, y: b.y - 0.4, w: 0.8, h: 0.8 }, 0.2)) {
        b.taken = true; b.mesh.visible = false; this.levelBugs++; CZ.Audio.sfx.collect();
        CZ.Effects.burst(b.x, b.y, 0xffd700, 14, { spread: 6, up: 5, gravity: 12 });
        const arr = this.save.bugs[L.data.id] || (this.save.bugs[L.data.id] = []); if (!arr.includes(k)) arr.push(k); CZ.writeSave(this.save);
        U.bugs(this.levelBugs, L.bugTotal); U.toast(`BUG REPORT FILED  ${this.levelBugs}/${L.bugTotal}`);
      }
    });
    // pickups: body parts and movement techs both use the unlock card
    for (const a of L.abilities) if (!a.taken && CZ.overlap(box, { x: a.x - 0.8, y: a.y - 0.2, w: 1.6, h: 1.8 })) {
      a.taken = true; a.mesh.visible = false;
      if (a.limb) this.limbs[a.id] = true; else this.abilities[a.id] = true;
      CZ.writeSave(this.save);
      CZ.Audio.sfx.unlock();
      CZ.Effects.burst(a.x, a.y + 0.6, a.limb ? 0xd8dde6 : 0x39ff88, 30, { spread: 10, up: 6, life: 1.2, size: 1.4 });
      CZ.Effects.shake(0.5);
      this.state = 'unlock'; U.unlock(a.id, a.limb); U.techs(this.abilities, p); U.limbs(this.limbs);
      CZ.Touch.syncAbilities(this.abilities);
      p.vx = 0; p.vy = Math.max(p.vy, 0);
    }
    // signs
    let signText = null, best = 3;
    for (const s of L.signs) { const d = Math.abs(p.cx() - s.x); if (d < best && Math.abs(p.y - s.y) < 3.5) { best = d; signText = s.text; } }
    U.sign(signText);
    // dialog triggers
    for (const d of L.dialogs) if (!d.done && p.cx() > d.x) { d.done = true; this.state = 'dialog'; p.vx = 0; U.dialog(d.lines, () => { this.state = 'playing'; }); return; }
    // boss
    if (L.boss && !this.bossStarted && p.cx() > L.boss.x + 3) this.startBoss();
    // exit
    if (L.exit && !this.boss && CZ.overlap(box, { x: L.exit.x - 1, y: L.exit.y, w: 2, h: 3.2 })) { this.completeLevel(); return; }
    // enemies
    // a stab reaches past the body, so check its hitbox before contact damage
    const stab = p.stabBox();
    if (stab) for (const e of this.enemies) if (!e.dead && CZ.overlap(stab, e.aabb())) { e.kill('dash'); CZ.Effects.shake(0.25); }
    for (const e of this.enemies) {
      if (e.dead || !CZ.overlap(box, e.aabb())) continue;
      if (p.dashing && e.dashKill) { e.kill('dash'); CZ.Effects.shake(0.3); continue; }
      if (p.stabbing) { e.kill('dash'); continue; }
      // with both utensils out you skewer small things instead of taking a hit
      if (p.armCount() >= 2 && e.small && Math.abs(p.vx) > 2) { e.kill('dash'); continue; }
      if (p.pounding) { e.kill('stomp'); p.vy = CZ.P.POUND_BOUNCE; p.pounding = false; p.jumpsUsed = 1; p.canDash = true; p.squash = 1.4; continue; }
      if (p.vy < 0 && p.y > e.y + e.h * 0.45 && e.stompable) { e.kill('stomp'); p.vy = 12.5; p.jumpsUsed = 1; p.canDash = true; p.squash = 1.35; CZ.Effects.shake(0.2); continue; }
      if (e.hurts && p.iframes <= 0) p.damage(e.cx());
    }
    // projectiles
    for (const pr of this.projectiles) if (!pr.dead && CZ.overlap(box, pr.aabb())) { pr.kill(true); if (!p.dashing) p.damage(pr.x); }
    // boss boxes
    if (this.boss && !this.boss.dying) {
      for (const ws of this.boss.weakspots()) {
        if (!CZ.overlap(box, ws)) continue;
        const how = ws.how;
        if (how.includes('touch')) { this.boss.hit('touch'); break; }
        if (how.includes('stomp') && (p.pounding || (p.vy < 0 && p.y > ws.y - 0.2))) { if (this.boss.hit('stomp')) { p.pounding = false; } break; }
        if (how.includes('dash') && p.dashing) { this.boss.hit('dash'); break; }
      }
      if (!p.dashing && p.iframes <= 0) for (const hb of this.boss.hurtboxes()) if (CZ.overlap(box, hb)) { p.damage(hb.x + hb.w / 2); break; }
    }
  }

  updateCamera(dt) {
    const p = this.player, L = this.level, cam = this.camera;
    const aspect = cam.aspect, tanH = Math.tan(cam.fov * Math.PI / 360);
    let tx, ty, tz;
    if (this.boss || (this.bossStarted && this.state === 'dead')) {
      const A = this.boss ? this.boss.arena : { x: L.boss.x, w: L.boss.w, h: L.boss.h };
      tz = Math.max((A.w / 2 + 2) / (tanH * aspect), (A.h / 2 + 3) / tanH); tx = A.x + A.w / 2; ty = A.h / 2 - 1.5;
    } else {
      tz = L.data.room ? 19 : 16.5; tx = p.cx() + p.facing * 1.5 + p.vx * 0.12; ty = p.cy() + 2.6;
      const hw = tz * tanH * aspect;
      if (L.data.width > hw * 2) tx = CZ.clamp(tx, hw - 2, L.data.width - hw + 2);
      ty = Math.max(ty, -1);
      if (L.data.room) ty = CZ.clamp(ty, 4.5, L.data.room.top - 5);
    }
    const ky = p.vy < -16 ? 9 : 4.5;
    this.camX = CZ.damp(this.camX, tx, 6, dt); this.camY = CZ.damp(this.camY, ty, ky, dt); this.camZ = CZ.damp(this.camZ, tz, 3, dt);
    const sh = CZ.Effects.getShake();
    cam.position.set(this.camX + sh.x, this.camY + sh.y, this.camZ);
    cam.lookAt(this.camX + sh.x, this.camY + sh.y, 0);
    this.sun.position.set(this.camX + 14, this.camY + 26, 22); this.sun.target.position.set(this.camX, this.camY, 0);
    L.setSky(this.camX, this.camY);
  }
  updateHUD() {
    const U = CZ.UI, p = this.player;
    U.hp(p.hp, CZ.P.MAX_HP); U.timer(this.levelTime); U.techs(this.abilities, p);
    U.noclipMeter(!!this.abilities.noclip, p.noclipMeter / CZ.P.NOCLIP_MAX);
    if (this.boss) U.bossBar(this.boss);
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    // Fixed vertical resolution keeps the pixel size identical on every screen.
    const ph = CZ.PIXEL_HEIGHT, pw = Math.max(2, Math.round(ph * (w / h)));
    this.rt.setSize(pw, ph);
    if (this.cine) { this.cine.camera.aspect = w / h; this.cine.camera.updateProjectionMatrix(); }
  }
  render() {
    if (this.state === 'title' || this.state === 'ending') { this.renderer.setRenderTarget(null); this.renderer.setClearColor(0x140d1c); this.renderer.clear(); return; }
    const cine = this.state === 'intro' && this.cine;
    this.renderer.setRenderTarget(this.rt);
    this.renderer.clear();
    this.renderer.render(cine ? this.cine.scene : this.scene, cine ? this.cine.camera : this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.screenScene, this.screenCam);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  CZ.Spr.paint();
  window.game = new CZ.Game();
  CZ.UI.$('title').addEventListener('pointerdown', () => CZ.Audio.playMusic('title'), { once: true });
});
