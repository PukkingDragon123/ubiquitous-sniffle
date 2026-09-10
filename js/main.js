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
    this.state = 'title'; this.level = null; this.player = null; this.enemies = []; this.projectiles = []; this.boss = null; this.bossStarted = false;
    this.levelIndex = 0; this.levelTime = 0; this.levelDeaths = 0; this.checkpoint = { x: 0, y: 0 };
    this.camX = 0; this.camY = 4; this.camZ = 19; this.acc = 0; this.last = performance.now(); this.deadT = 0; this.unlockingId = null;
    CZ.Touch.init(); this.bindUI(); this.resize(); window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(t => this.loop(t));
  }

  // ---------- menus ----------
  bindUI() {
    const U = CZ.UI, $ = U.$;
    const gesture = () => CZ.Audio.resume();
    window.addEventListener('pointerdown', gesture, { once: true }); window.addEventListener('keydown', gesture, { once: true });
    $('btn-controls').onclick = () => { U.show('levelselect', false); U.show('controls', true); };
    $('btn-replay-intro').onclick = () => this.startIntro();
    document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { U.show('controls', false); this.showMenu(); });
    $('btn-resume').onclick = () => this.setPaused(false);
    $('btn-restart').onclick = () => { this.setPaused(false); this.startLevel(this.levelIndex, false); };
    $('btn-quit').onclick = () => { this.setPaused(false); this.showMenu(); };
    $('btn-next').onclick = () => this.nextLevel();
    $('btn-ending-title').onclick = () => this.showMenu();
  }
  // The world picker doubles as the main menu now that the title screen is gone.
  showMenu() {
    const U = CZ.UI;
    this.unloadLevel();
    if (this._skipTap && this._skipBtn) { this._skipBtn.removeEventListener('pointerdown', this._skipTap); this._skipTap = null; }
    if (this.cine) { this.cine.dispose(); this.cine = null; }
    U.cineShow(false); U.cineFx(0, 0); CZ.Comic.show(false);
    U.show('hud', false); U.show('complete', false); U.show('ending', false); U.show('unlock', false); U.show('controls', false);
    U.sign(null); CZ.Touch.setVisible(false);
    U.levelList(CZ.LEVELS, this.save, i => { U.show('levelselect', false); this.startLevel(i, false); });
    U.show('levelselect', true);
    this.state = 'menu';
    CZ.Audio.playMusic('factory');
  }

  // ---------- opening cinematic ----------
  startIntro() {
    this.unloadLevel();
    if (this.cine) { this.cine.dispose(); this.cine = null; }
    const U = CZ.UI;
    U.show('hud', false); U.show('complete', false); U.show('ending', false); U.show('levelselect', false);
    U.cineShow(true); CZ.Comic.show(true);
    this.cine = new CZ.Cinematic(this);
    this.cine.camera.aspect = this.camera.aspect; this.cine.camera.updateProjectionMatrix();
    this.cine.onDone = () => this.endIntro();
    this.state = 'intro';
    // tap or click anywhere to skip (the touch buttons are hidden during the cutscene)
    const skipBtn = CZ.UI.$('cine-skip');
    this._skipTap = () => { if (this.state === 'intro' && this.cine) this.cine.skip(); };
    skipBtn.addEventListener('pointerdown', this._skipTap);
    this._skipBtn = skipBtn;
    CZ.Audio.resume();
    CZ.Audio.playMusic('boss');
  }
  endIntro() {
    const U = CZ.UI;
    if (this._skipTap && this._skipBtn) { this._skipBtn.removeEventListener('pointerdown', this._skipTap); this._skipTap = null; }
    U.cineShow(false); U.cineFx(0, 0);
    if (this.cine) { this.cine.dispose(); this.cine = null; }
    this.save.sawIntro = true; CZ.writeSave(this.save);
    this.startLevel(0, true);
  }

  setPaused(on) {
    if (on && this.state !== 'playing') return;
    if (!on && this.state !== 'paused') return;
    this.state = on ? 'paused' : 'playing'; CZ.UI.show('pause', on); CZ.Touch.setVisible(!on);
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
    this.levelIndex = i; this.levelTime = 0; this.levelDeaths = 0;
    this.level = new CZ.Level(data, this.scene);
    this.scene.fog = new THREE.Fog(data.theme.fog, 28, 95);
    this.scene.background = new THREE.Color(data.theme.sky[1]);
    this.hemi.groundColor.set(data.theme.sky[1]); this.hemi.color.set(data.theme.sky[0]).lerp(new THREE.Color(0xffffff), 0.7);
    for (const a of this.level.abilities) if (this.abilities[a.id]) { a.taken = true; a.mesh.visible = false; }
    this.player = new CZ.Player(this); this.scene.add(this.player.mesh);
    this.checkpoint = { x: data.spawn[0], y: data.spawn[1] }; this.player.respawn(this.checkpoint.x, this.checkpoint.y);
    this.spawnEnemies();
    this.camX = this.player.cx(); this.camY = this.player.cy() + 2; this.camZ = 19;
    U.show('levelselect', false); U.show('complete', false); U.show('hud', true); U.levelName(data.name, data.sub); U.bossBar(null); U.sign(null);
    U.wheel(this.player.hp, CZ.P.MAX_HP); U.parts(this.abilities);
    CZ.Spr.paint();
    CZ.Audio.playMusic(data.song);
    CZ.Touch.setVisible(true); CZ.Touch.syncAbilities(this.abilities);
    CZ.Comic.show(true); CZ.Comic.setCamera(this.camera); CZ.Comic.clearBubbles();
    this.bubbleQueue = []; this.bubbleT = 0;
    this.state = 'playing';
    U.toast(`${data.name}  //  ${data.sub}`, 3000);
    if (data.intro) this.sayLines(data.intro);
  }
  spawnEnemies() {
    for (const e of this.enemies) CZ.Effects.disposeTree(e.mesh);
    this.enemies = [];
    for (const d of this.level.enemySpawns) this.spawnEnemy(d);
  }
  spawnEnemy(d) { const e = CZ.createEnemy(this, d); if (e) this.enemies.push(e); return e; }

  // Queue short balloons over the cheese. Nothing pauses; there is no dialogue box.
  sayLines(lines) {
    this.bubbleQueue = lines.map(l => (typeof l === 'string' ? { text: l } : l));
    this.bubbleT = 0.4;
  }
  updateBubbles(dt) {
    if (!this.bubbleQueue || !this.bubbleQueue.length) return;
    this.bubbleT -= dt;
    if (this.bubbleT > 0) return;
    const line = this.bubbleQueue.shift();
    const p = this.player;
    CZ.Comic.bubble(line.text, line.at || (() => [p.cx(), p.cy() + 1.9, 0]), { kind: line.kind || 'say', life: line.life });
    this.bubbleT = (line.life || (1.1 + line.text.length * 0.045)) + 0.35;
  }

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
      + U.stat('cheese', `PARTS ${Object.keys(this.abilities).length}/${CZ.ABILITY_ORDER.length}`));
    U.$('btn-next').textContent = this.levelIndex === CZ.LEVELS.length - 1 ? 'GET THE APPLE' : 'NEXT';
  }
  nextLevel() {
    if (this.levelIndex + 1 < CZ.LEVELS.length) this.startLevel(this.levelIndex + 1, false);
    else this.showEnding();
  }
  showEnding() {
    const U = CZ.UI; this.unloadLevel(); this.state = 'ending'; CZ.Touch.setVisible(false); U.show('complete', false); U.show('hud', false);
    this.save.completed = true; if (!this.save.bestTime || this.save.time < this.save.bestTime) this.save.bestTime = this.save.time; CZ.writeSave(this.save);
    U.ending(`You took the golden patch and rebuilt yourself: a <b>CHEESE MECH</b>, twelve metres of aged cheddar and stolen hitboxes. The dev signs off on it, because the alternative is you finding more bugs.<br><br>Somewhere in the Pantry a floor is still deleted. You will file it Monday.`,
      U.stat('clock', `TOTAL ${CZ.fmtTime(this.save.time)}`)
      + U.stat('skull', `${this.save.deaths} DEATHS`)
      + U.stat('apple', 'CHEESE MECH ONLINE'));
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
    CZ.Comic.pow('DOWN!', [this.player.cx(), this.player.cy() + 3, 0], { kind: 'hit', life: 1 });
    const lines = {
      ratking: ['Tell no one a cheese did this.'],
      anticheat: ['You checked WHERE I was. Not HOW I got there.'],
      god: ['You left the collision box in. Classic.'],
    }[this.level.boss.kind];
    if (lines) this.sayLines(lines);
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
      if (I.pressed('pause')) this.cine.skip();
      else this.cine.update(dt);
      return;
    }
    if (this.state === 'menu' || this.state === 'ending') return;
    if (I.pressed('pause')) { if (this.state === 'playing') this.setPaused(true); else if (this.state === 'paused') this.setPaused(false); }
    if (this.state === 'paused') return;
    if (this.state === 'unlock') { if (I.pressed('confirm') || I.pressed('jump')) { U.show('unlock', false); this.state = 'playing'; } this.ambient(dt); CZ.Comic.update(dt); return; }
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
    this.updateBubbles(dt);
    CZ.Comic.update(dt);
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
    // upgrade stations: roll into a machine and it bolts a part onto you
    for (const a of L.abilities) if (!a.taken && CZ.overlap(box, { x: a.x - 1.1, y: a.y - 0.2, w: 2.2, h: 2.4 })) {
      a.taken = true; a.mesh.visible = false;
      this.abilities[a.id] = true; CZ.writeSave(this.save);
      CZ.Audio.sfx.unlock();
      CZ.Effects.burst(a.x, a.y + 0.8, 0x9fd4ff, 34, { spread: 10, up: 6, life: 1.2, size: 1.4 });
      CZ.Effects.shake(0.6);
      CZ.Comic.pow('BOLT ON!', [a.x, a.y + 2.4, 0], { kind: 'glitch', life: 0.9 });
      this.state = 'unlock'; U.unlock(a.id); U.parts(this.abilities);
      CZ.Touch.syncAbilities(this.abilities);
      p.vx = 0; p.vy = Math.max(p.vy, 0);
    }
    // levers: a poke opens whatever gate they are wired to
    const poke = p.pokeBox();
    for (const lv of L.levers) {
      if (lv.on) continue;
      const hit = (poke && CZ.overlap(poke, { x: lv.x - 0.7, y: lv.y, w: 1.4, h: 1.8 }))
        || (p.spinning() && CZ.overlap(box, { x: lv.x - 0.8, y: lv.y, w: 1.6, h: 1.8 }));
      if (!hit) continue;
      lv.on = true; lv.handle.rotation.z = -0.9;
      CZ.Audio.sfx.checkpoint(); CZ.Effects.shake(0.4);
      CZ.Comic.pow('CLUNK', [lv.x, lv.y + 2.2, 0], { kind: 'hit', life: 0.6 });
      for (const g of L.solids) if (g.gate && g.gate === lv.opens) {
        g.broken = true; g.mesh.visible = false;
        CZ.Effects.burst(g.x + g.w / 2, g.y + g.h / 2, 0x8d95a3, 18, { spread: 7, up: 5 });
      }
    }
    // hint posts: the cheese says the line once, as a balloon
    for (const s of L.signs) {
      if (s.said || !s.text) continue;
      if (Math.abs(p.cx() - s.x) < 3 && Math.abs(p.y - s.y) < 4) {
        s.said = true;
        CZ.Comic.bubble(s.text, () => [p.cx(), p.cy() + 1.9, 0], { kind: 'small' });
      }
    }
    // dialog triggers
    for (const d of L.dialogs) if (!d.done && p.cx() > d.x) { d.done = true; this.sayLines(d.lines); }
    // boss
    if (L.boss && !this.bossStarted && p.cx() > L.boss.x + 3) this.startBoss();
    // exit
    if (L.exit && !this.boss && CZ.overlap(box, { x: L.exit.x - 1, y: L.exit.y, w: 2, h: 3.2 })) { this.completeLevel(); return; }
    // enemies
    // the toothpick reaches past the wheel, so check it before contact damage
    if (poke) for (const e of this.enemies) if (!e.dead && CZ.overlap(poke, e.aabb())) { e.kill('dash'); CZ.Effects.shake(0.25); CZ.Comic.pow('POK', [e.cx(), e.cy() + 1, 0], { kind: 'slash', life: 0.4 }); }
    for (const e of this.enemies) {
      if (e.dead || !CZ.overlap(box, e.aabb())) continue;
      if (p.dashing && e.dashKill) { e.kill('dash'); CZ.Effects.shake(0.3); continue; }
      if (p.spinning()) { e.kill('dash'); CZ.Comic.pow('SMASH', [e.cx(), e.cy() + 1, 0], { kind: 'hit', life: 0.45 }); continue; }
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
      tz = L.data.room ? 16.5 : 15.5; tx = p.cx() + p.facing * 1.5 + p.vx * 0.12; ty = p.cy() + 2.0;
      const hw = tz * tanH * aspect;
      if (L.data.width > hw * 2) tx = CZ.clamp(tx, hw - 2, L.data.width - hw + 2);
      ty = Math.max(ty, -1);
      if (L.data.room) ty = CZ.clamp(ty, 3.6, L.data.room.top - 5);
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
    U.wheel(p.hp, CZ.P.MAX_HP); U.timer(this.levelTime);
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
    if (this.state === 'menu' || this.state === 'ending') { this.renderer.setRenderTarget(null); this.renderer.setClearColor(0x140d1c); this.renderer.clear(); return; }
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
  CZ.Comic.init();
  window.game = new CZ.Game();
  window.game.startIntro();
});
