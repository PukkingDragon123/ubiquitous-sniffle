// Game orchestrator: renderer, camera, state machine, interactions, save/progress.
CZ.Game = class Game {
  constructor() {
    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 400);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x664422, 0.9); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2dd, 2.2); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048); const sc = this.sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 90; this.sun.shadow.bias = -0.0015;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    CZ.Effects.init(this.scene);

    this.save = CZ.loadSave() || CZ.newSave(); this.abilities = this.save.abilities;
    this.state = 'title'; this.level = null; this.player = null; this.enemies = []; this.projectiles = []; this.boss = null; this.bossStarted = false;
    this.levelIndex = 0; this.levelTime = 0; this.levelDeaths = 0; this.levelBugs = 0; this.checkpoint = { x: 0, y: 0 };
    this.camX = 0; this.camY = 4; this.camZ = 15; this.acc = 0; this.last = performance.now(); this.deadT = 0; this.unlockingId = null;
    CZ.Touch.init(); this.bindUI(); this.resize(); window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(t => this.loop(t));
  }

  // ---------- menus ----------
  bindUI() {
    const U = CZ.UI, $ = U.$;
    const gesture = () => CZ.Audio.resume();
    window.addEventListener('pointerdown', gesture, { once: true }); window.addEventListener('keydown', gesture, { once: true });
    $('btn-play').onclick = () => { this.save = CZ.newSave(); this.abilities = this.save.abilities; CZ.writeSave(this.save); this.startLevel(0, true); };
    $('btn-continue').onclick = () => this.startLevel(Math.min(this.save.level, CZ.LEVELS.length - 1), this.save.level === 0);
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
    U.$('best-time').textContent = this.save.completed && this.save.bestTime ? `· Best full run: ${CZ.fmtTime(this.save.bestTime)}` : '';
  }
  toTitle() {
    this.unloadLevel(); this.state = 'title';
    const U = CZ.UI; U.show('title', true); U.show('hud', false); U.show('complete', false); U.show('ending', false); U.show('unlock', false); U.show('dialog', false); U.sign(null);
    this.refreshTitle(); CZ.Touch.setVisible(false); CZ.Audio.playMusic('title');
  }
  setPaused(on) {
    if (on && this.state !== 'playing') return;
    if (!on && this.state !== 'paused') return;
    this.state = on ? 'paused' : 'playing'; CZ.UI.show('pause', on); CZ.Touch.setVisible(!on);
  }

  // ---------- level lifecycle ----------
  unloadLevel() {
    if (this.level) this.level.dispose();
    for (const e of this.enemies) this.scene.remove(e.mesh);
    for (const p of this.projectiles) p.kill(false);
    if (this.boss) this.boss.cleanup();
    if (this.player) { this.scene.remove(this.player.mesh); this.scene.remove(this.player.rope); for (const g of this.player.ghosts) this.scene.remove(g); }
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
    // already-known abilities: hide their pickups
    for (const a of this.level.abilities) if (this.abilities[a.id]) { a.taken = true; a.mesh.visible = false; }
    this.player = new CZ.Player(this); this.scene.add(this.player.mesh);
    this.checkpoint = { x: data.spawn[0], y: data.spawn[1] }; this.player.respawn(this.checkpoint.x, this.checkpoint.y);
    this.spawnEnemies();
    this.camX = this.player.cx(); this.camY = this.player.cy() + 2; this.camZ = 15;
    U.show('title', false); U.show('complete', false); U.show('hud', true); U.levelName(data.name, data.sub); U.bossBar(null); U.sign(null);
    U.hp(this.player.hp, CZ.P.MAX_HP); U.bugs(this.levelBugs, this.level.bugTotal); U.techs(this.abilities, this.player);
    CZ.Audio.playMusic(data.song);
    CZ.Touch.setVisible(true); CZ.Touch.syncAbilities(this.abilities);
    this.state = 'playing';
    U.toast(`${data.name} — ${data.sub}`, 3200);
    if (withIntro && data.intro) { this.state = 'dialog'; U.dialog(data.intro, () => { this.state = 'playing'; }); }
  }
  spawnEnemies() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
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
      `<b>${data.name}</b><br>⏱ ${CZ.fmtTime(this.levelTime)} &nbsp; 💀 ${this.levelDeaths} deaths<br>🪲 Bug reports: ${this.levelBugs}/${this.level.bugTotal}`);
    U.$('btn-next').textContent = this.levelIndex === CZ.LEVELS.length - 1 ? 'GET THE APPLE ▸' : 'NEXT ▸';
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
    U.ending(`You touched the Golden Apple. Reality re-rendered. You're human again — and the God of Games just made you <b>lead QA</b> for the universe.<br><br>Somewhere in the Pantry, a floor is still deleted. You'll file it Monday.`,
      `⏱ Total time: ${CZ.fmtTime(this.save.time)}<br>💀 Deaths: ${this.save.deaths}<br>🪲 Bug reports: ${got}/${total}${got === total ? ' — 100%! Certified Game Bugger.' : ''}`);
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
      ratking: [{ who: 'RAT KING', portrait: '🐀', text: 'Fine. FINE. The exit is that way. Tell no one a cheese did this.' }, { who: 'YOU', portrait: '🧀', text: 'Filed under: "boss can be stomped". Severity: crown.' }],
      anticheat: [{ who: 'ANTI-CHEAT.EXE', portrait: '🛡️', text: 'B-BAN FAILED. PLAYER... IS... INSIDE... THE... SHIELD...' }, { who: 'YOU', portrait: '🧀', text: 'You checked WHERE I was. You never checked HOW I got there.' }],
      god: [{ who: 'GOD OF GAMES', portrait: '👁️', text: 'The apple is yours. You are human again. ...but HOW did you stand on that platform? I DELETED it.' }, { who: 'YOU', portrait: '🧀', text: 'You deleted the mesh. You left the collision box. Classic. Want me to write it up?' }, { who: 'GOD OF GAMES', portrait: '👁️', text: '...yes. Please. My inbox is open. Take the exit.' }],
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
    if (I.pressed('mute')) U.toast(CZ.Audio.toggleMute() ? '🔇 MUTED' : '🔊 SOUND ON');
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
        U.bugs(this.levelBugs, L.bugTotal); U.toast(`🪲 BUG REPORT FILED (${this.levelBugs}/${L.bugTotal})`);
      }
    });
    // abilities
    for (const a of L.abilities) if (!a.taken && CZ.overlap(box, { x: a.x - 0.8, y: a.y - 0.2, w: 1.6, h: 1.8 })) {
      a.taken = true; a.mesh.visible = false; this.abilities[a.id] = true; CZ.writeSave(this.save);
      CZ.Audio.sfx.unlock(); CZ.Effects.burst(a.x, a.y + 0.6, 0x39ff88, 30, { spread: 10, up: 6, life: 1.2, size: 1.4 }); CZ.Effects.shake(0.5);
      this.state = 'unlock'; U.unlock(a.id); U.techs(this.abilities, p); CZ.Touch.syncAbilities(this.abilities);
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
    for (const e of this.enemies) {
      if (e.dead || !CZ.overlap(box, e.aabb())) continue;
      if (p.dashing && e.dashKill) { e.kill('dash'); CZ.Effects.shake(0.3); continue; }
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
      tz = 15; tx = p.cx() + p.facing * 1.5 + p.vx * 0.12; ty = p.cy() + 2.2;
      const hw = tz * tanH * aspect;
      if (L.data.width > hw * 2) tx = CZ.clamp(tx, hw - 2, L.data.width - hw + 2);
      ty = Math.max(ty, -1);
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
    const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  render() { if (this.state === 'title' || this.state === 'ending') { this.renderer.setClearColor(0x1a1023); this.renderer.clear(); return; } this.renderer.render(this.scene, this.camera); }
};

window.addEventListener('DOMContentLoaded', () => { window.game = new CZ.Game(); CZ.UI.$('title').addEventListener('pointerdown', () => CZ.Audio.playMusic('title'), { once: true }); });
