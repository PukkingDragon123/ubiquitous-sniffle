// Level data. Coordinates: x right, y up; every box is {x,y,w,h} with x,y = bottom-left.
// Physics reference (see CZ.P): single jump ≈ 2.8 high / 6 wide, double jump ≈ 5.1 high / 12 wide,
// dash adds ≈ 4.3 horizontal, bounce pad ≈ 6.5 high.
CZ.LEVELS = (() => {
  const solid = (x, y, w, h, o = {}) => ({ t: 'solid', x, y, w, h, ...o });
  const plat = (x, y, w, o = {}) => ({ t: 'solid', x, y, w, h: 0.6, plat: true, ...o });
  const floor = (x1, x2, top = 0, depth = 3) => solid(x1, top - depth, x2 - x1, depth);
  const hazard = (x, y, w, h, kind = 'goo', o = {}) => ({ t: 'hazard', x, y, w, h, kind, ...o });
  const goo = (x1, x2, top = -1) => hazard(x1, top - 1, x2 - x1, 1, 'goo');
  const knives = (x, y, w) => hazard(x, y, w, 0.9, 'spikes');
  const grater = (x, y) => hazard(x, y, 1.6, 1.6, 'grater');
  const laser = (x, y, w, h, period = 2, on = 0.9, phase = 0) => hazard(x, y, w, h, 'laser', { period, on, phase });
  const press = (x, y, w, h, dy, period, phase = 0) => hazard(x, y, w, h, 'press', { dy, period, phase });
  const mover = (x, y, w, h, dx, dy, period, phase = 0) => ({ t: 'solid', x, y, w, h, dx, dy, period, phase, mover: true });
  const mplat = (x, y, w, dx, dy, period, phase = 0) => mover(x, y, w, 0.6, dx, dy, period, phase);
  const conveyor = (x1, x2, top, speed) => ({ t: 'solid', x: x1, y: top - 1, w: x2 - x1, h: 1, conveyor: speed });
  const glitch = (x, y, w, h) => ({ t: 'solid', x, y, w, h, glitch: true });
  const corrupt = (x, y, w, h) => ({ t: 'solid', x, y, w, h, corrupt: true });
  const cracked = (x, y, w, h) => ({ t: 'solid', x, y, w, h, cracked: true });
  const bounce = (x, y, w = 2) => ({ t: 'bounce', x, y, w, h: 0.5 });
  const wind = (x, y, w, h, fy = 60) => ({ t: 'wind', x, y, w, h, fy });
  const hook = (x, y) => ({ t: 'hook', x, y });
  const check = (x, y = 0) => ({ t: 'check', x, y });
  const enemy = (kind, x, y, o = {}) => ({ t: 'enemy', kind, x, y, ...o });
  const bug = (x, y) => ({ t: 'bug', x, y });
  const ability = (x, y, id) => ({ t: 'ability', x, y, id });
  const exit = (x, y = 0) => ({ t: 'exit', x, y });
  // The way out is a heavy door. You do not open it, you go through it.
  const door = (x, y = 0) => ({ t: 'door', x, y });
  const sign = (x, y, text) => ({ t: 'sign', x, y, text });
  const boss = (kind, x, w, h, o = {}) => ({ t: 'boss', kind, x, w, h, ...o });
  const lever = (x, y, opens) => ({ t: 'lever', x, y, opens });
  const ramp = (x, y, w, h, dir) => ({ t: 'ramp', x, y, w, h, dir });
  const boost = (x, y, w, speed) => ({ t: 'boost', x, y, w, speed });
  const gate = (x, y, w, h, id) => ({ t: 'solid', x, y, w, h, gate: id, skin: 'gate' });
  const deco = (kind, x, y, o = {}) => ({ t: 'deco', kind, x, y, ...o });
  const wood = (x, y, w, h, o = {}) => ({ t: 'solid', x, y, w, h, skin: 'wood', ...o });
  const talk = (x, lines) => ({ t: 'dialog', x, lines });

  // Portraits are pixel sprites from CZ.Spr, never emoji.
  const YOU = 'p-cheese', GOD = 'p-duck', RAT = 'p-rat', AC = 'p-guard', HUMAN = 'p-human';
  const D = (who, portrait, text) => ({ who, portrait, text });

  return [
  // ───────────────────────── 1. THE CHEESE CELLAR ─────────────────────────
  // A room, not a corridor. Every stick of furniture in it can be destroyed, and
  // most obstacles have two answers: go over it fast, or go flat and go under.
  { id: 'cellar', name: 'THE CHEESE CELLAR', sub: 'World 1', song: 'factory',
    width: 190, deathY: -7, room: { top: 16, back: true },
    theme: { tile: ['brick', 'cellar'], prop: ['wood', 'timber'],
      sky: ['#170e1d', '#3a2038'], fog: '#221429', block: '#6b4f6a', blockAlt: '#3a2844',
      plat: '#d99b52', accent: '#ffcc33', bg: 'cellar' },
    spawn: [4, 0],
    intro: ['Out. Before the mould gets here.'],
    items: [
      floor(0, 170, 0, 2.4), floor(175, 190, 0, 2.4),
      solid(-2, 0, 2, 16), solid(190, 0, 2, 16),

      // ── the junk room: nothing here is load-bearing, so wreck all of it ──
      deco('lamp', 10, 13.4), deco('rack', 7, 0), deco('web', 1.5, 14.2),
      deco('bottle', 12.4, 0), deco('bottle', 13.2, 0), deco('knifeblock', 17, 0),
      ramp(20, 0, 7, 4, 1), solid(27, 0, 6, 4), ramp(33, 0, 7, 4, -1),
      deco('crate', 29, 4), deco('cheesewheel', 43, 0), deco('bottle', 45.6, 0),
      wood(39, 0, 2, 2, { crate: true }),

      // ── two ways past the crate wall: smash it, or squish under the shelf ──
      wood(55, 0, 2, 2, { crate: true }), wood(57, 0, 2, 2, { crate: true }), wood(59, 0, 2, 2, { crate: true }),
      wood(55, 2, 2, 2, { crate: true }), wood(57, 2, 2, 2, { crate: true }), wood(59, 2, 2, 2, { crate: true }),
      wood(55, 4, 2, 2, { crate: true }), wood(57, 4, 2, 2, { crate: true }), wood(59, 4, 2, 2, { crate: true }),
      deco('crate', 63, 0, { stack: 2 }), deco('shelf', 50, 0),
      // ── the slot: a wall to the ceiling with a hand's width under it ──
      sign(64, 2, 'Hold DOWN. Cheese has no bones.'),
      solid(66, 0.8, 2.4, 15.2, { slot: true }),

      // ── the speed lane: a boost, then barrels only real speed goes through ──
      boost(68, 0, 8, 22),
      wood(82, 0, 3, 3, { crate: true, hard: 15, skin: 'barrel' }),
      wood(82, 3, 3, 3, { crate: true, hard: 15, skin: 'barrel' }),
      deco('rack', 90, 0), deco('lamp', 96, 13.4), deco('knifeblock', 87.5, 0),
      enemy('spider', 94, 11.5, { drop: 5, speed: 1.4 }),

      // ── the lever gate, and the vent that skips it entirely ──
      ramp(98, 0, 7, 4, 1), solid(105, 0, 5, 4), ramp(110, 0, 6, 4, -1),
      enemy('bugcrawl', 114, 0, { min: 110, max: 120 }),
      lever(122, 0, 'g1'),
      gate(128, 0, 2, 9, 'g1'),
      // ...or climb the crates and crawl the duct clean over the top of it
      plat(117, 3, 4), plat(121, 5.8, 3),
      plat(124, 8.5, 16),                             // duct floor, top y=9.1
      solid(124, 9.7, 16, 1.4, { skin: 'wood' }),     // duct roof: 0.6 of clearance
      deco('web', 130, 7.4), deco('bottle', 133, 9.2), deco('bottle', 136, 9.2),

      // ── the press: your first upgrade, and a vat worth ruining ──
      deco('press', 142, 0), deco('vat', 154, 0),
      ramp(134, 0, 6, 3, 1), solid(140, 0, 5, 3),
      ability(143, 3, 'doubleJump'),
      deco('cheesewheel', 150, 0), deco('cheesewheel', 152.4, 0),
      enemy('spider', 151, 13.6, { drop: 3.6, speed: 1.8 }),

      // ── the drain: get a run at it ──
      ramp(162, 0, 8, 4, 1),
      solid(170, -3.4, 5, 2, { skin: 'drain' }), hazard(170, -1.4, 5, 1, 'goo'),
      deco('web', 172, 13.8), deco('lamp', 180, 13.4), deco('rack', 182, 0),
      deco('shelf', 177, 0),

      // ── the way out: a boost strip, then a door you have to break ──
      boost(176, 0, 7, 27),
      door(187),
    ] },

  // ───────────────────────────── 2. THE GRATER LINE ─────────────────────────────
  { id: 'grater', name: 'THE GRATER LINE', sub: 'World 2 · Conveyors', song: 'factory', width: 268, deathY: -11,
    theme: { tile: ['plate', 'steel'], prop: ['plate', 'steel'], sky: ['#1d3140', '#4f9bb0'], fog: '#3a6f80', block: '#6d7f95', blockAlt: '#54657a', plat: '#9fb3c8', accent: '#ffcc33', bg: 'factory' },
    spawn: [3, 0],
    items: [
      floor(0, 30),
      // the line is still somebody's workplace, and all of it comes apart
      deco('crate', 6, 0, { stack: 2 }), deco('bottle', 10, 0), deco('knifeblock', 11.4, 0),
      ramp(14, 0, 6, 3, 1), solid(20, 0, 4, 3), ramp(24, 0, 6, 3, -1),
      conveyor(30, 50, 0, 6),
      solid(30, -3, 20, 2),
      // gap 50..55 (belt flings you)
      floor(55, 72),
      enemy('rat', 62, 0, { min: 56, max: 70 }), deco('rack', 58, 0),
      bounce(64, 0),      plat(66, 6.5, 4), // lift to upper deck
      mplat(73, 0.5, 4, 0, 4, 3.2),
      solid(80, 0, 22, 4), // deck top y=4
      grater(88, 4), grater(95, 4),
      enemy('spore', 92, 7.5, { amp: 1.2, speed: 2 }),
      conveyor(102, 120, 4, -7), solid(102, 0, 18, 3),
      grater(112, 4),
      solid(120, 0, 22, 4), check(122, 4), 
      // drop to y=0 and moving platforms over goo
      floor(142, 152), deco('shelf', 146, 0),
      goo(152, 172, -2), solid(152, -6, 20, 3),
      mplat(153, 1, 3, 0, 3, 2.6),
      mplat(160, 2, 3, 4, 0, 3, 1.5),
      floor(172, 194),
      enemy('rat', 178, 0, { min: 173, max: 192 }),
      deco('crate', 190, 0, { stack: 3 }), deco('cheesewheel', 176, 0),
      ability(184, 1, 'dash'),
      glitch(194, 0, 3, 6), floor(194, 206),
      // gap 206..217 (dash + double jump)
      floor(217, 268),
      glitch(222, 0, 2, 5),
      enemy('rat', 230, 0, { min: 224, max: 236 }),
      enemy('rat', 240, 0, { min: 236, max: 248 }),
      // hidden pit under a glitch floor
      glitch(238, -3, 5, 3), solid(238, -10, 5, 1), bounce(238.5, -9, 1.6),
      solid(233, -9, 5, 6), solid(243, -9, 5, 6),
      enemy('spore', 254, 3, { amp: 2, speed: 2.5 }),
      deco('bottle', 245, 0), deco('crate', 250, 0, { stack: 2 }), deco('knifeblock', 258, 0),
      door(262),
    ] },

  // ───────────────────────────── 3. MELTING VATS ─────────────────────────────
  { id: 'vats', name: 'THE MELTING VATS', sub: 'World 3 · Walls', song: 'lava', width: 250, deathY: -8,
    theme: { tile: ['rock', 'magma'], prop: ['plate', 'steel'], sky: ['#2a0a0a', '#ff6a1f'], fog: '#7a2a10', block: '#4a3a3a', blockAlt: '#3a2a2a', plat: '#7a6a6a', accent: '#ffb347', bg: 'vats' },
    spawn: [3, 0],
    items: [
      floor(0, 25),
      deco('crate', 6, 0, { stack: 2 }), deco('bottle', 11, 0), deco('cheesewheel', 13, 0),
      ramp(17, 0, 8, 3, 1),
      goo(25, 40, -1), solid(25, -5, 15, 3),
      solid(29, -3, 2, 3), solid(34.5, -3, 2, 3),
      floor(40, 60),
      enemy('blob', 46, 0, { min: 41, max: 58 }), enemy('blob', 54, 0, { min: 41, max: 58 }),
      plat(50, 3.5, 3), goo(60, 70, -1), solid(60, -5, 10, 3),
      floor(70, 92), deco('knifeblock', 75, 0), deco('crate', 78, 0),
      check(72),
      enemy('turret', 86, 0, { dir: -1, rate: 2.2 }),
      ability(80, 1, 'wallJump'),
      // the shaft: walk under the left wall, climb between x=94 and x=98
      solid(92, 3, 2, 9),           // left wall, y 3..12
      solid(98, 0, 4, 10),          // right wall, y 0..10
      floor(92, 98),                // shaft floor
      solid(102, 7, 30, 3),         // upper floor top y=10
      enemy('blob', 115, 10, { min: 104, max: 130 }),
      // pillar shaft descent over goo
      goo(132, 162, -1), solid(132, -5, 30, 3),
      solid(138, 0, 2, 13), solid(144, 0, 2, 13),   // wall-jump between 140..144
      plat(150, 10, 4),
      plat(157, 7, 3),
      floor(162, 200), deco('crate', 167, 0, { stack: 3 }), deco('rack', 196, 0),
      check(164),
      enemy('blob', 172, 0, { min: 164, max: 184 }),
      enemy('turret', 190, 0, { dir: -1, rate: 1.8 }),
      solid(184, 0, 2, 3), glitch(180, 3, 4, 1), // final climb: alternating walls with goo below
      goo(200, 226, -1), solid(200, -5, 26, 3),
      solid(204, 0, 2, 8), solid(210, 0, 2, 12), solid(216, 0, 2, 8), solid(222, 0, 2, 12),
      enemy('spore', 213, 6, { amp: 3, speed: 1.6 }),
      solid(226, 0, 24, 8),   // exit deck top y=8
      deco('shelf', 232, 8), deco('cheesewheel', 238, 8), deco('bottle', 240.4, 8),
      door(245, 8),
    ] },

  // ───────────────────────────── 4. PACKAGING PLANT ─────────────────────────────
  { id: 'packaging', name: 'THE PACKAGING PLANT', sub: 'World 4 · Boss: RAT KING', song: 'factory', width: 300, deathY: -16,
    theme: { tile: ['card', 'cardboard'], prop: ['card', 'cardboard'], sky: ['#5aa8d8', '#c9ecff'], fog: '#8fc3e0', block: '#b8865a', blockAlt: '#96683f', plat: '#e0b080', accent: '#ff8a1f', bg: 'boxes' },
    spawn: [3, 0],
    items: [
      floor(0, 60),
      deco('crate', 3, 0, { stack: 2 }), deco('cheesewheel', 56, 0), deco('bottle', 58, 0),
      ramp(6, 0, 6, 3, 1), ramp(12, 0, 5, 3, -1),
      press(18, 1, 3, 3, 4.5, 2.2, 0), press(30, 1, 3, 3, 4.5, 2.2, 1.1), press(42, 1, 3, 3, 4.5, 2.2, 0.5),
      enemy('rat', 50, 0, { min: 46, max: 58 }),
      plat(24, 6.5, 3), // belts + knives
      conveyor(60, 80, 0, 8), solid(60, -3, 20, 2),
      knives(80, 0, 4), solid(80, -3, 4, 3),
      floor(84, 110), deco('rack', 88, 0), deco('shelf', 96, 0), deco('knifeblock', 108, 0),
      enemy('turret', 104, 0, { dir: -1, rate: 2 }),
      enemy('rat', 92, 0, { min: 85, max: 100 }),
      check(86),
      mplat(112, 0.5, 4, 0, 5, 3.5),
      solid(118, 0, 20, 5.5),      // deck top 5.5
      press(126, 6.5, 3, 3, 4, 1.8, 0),
      ability(133, 6.5, 'pound'),
      cracked(138, 2.5, 6, 3),     // top y=5.5, falls into lower factory
      solid(144, 0, 4, 14),         // wall blocks the way, must go down
      // lower floor y=-8
      solid(138, -11, 60, 3),       // floor top -8, x 138..198
      solid(118, -11, 20, 11),      // solid mass under the deck
      enemy('rat', 150, -8, { min: 140, max: 160 }),
      enemy('rat', 165, -8, { min: 160, max: 180 }),
      cracked(170, -8, 3, 3), // crack a block guarding a bug? (bug sits on top)
      solid(180, -8, 3, 2), cracked(186, -8, 4, 5), bounce(195, -8, 2.5),
      solid(198, -11, 4, 11),       // wall right of lower floor up to y=0
      floor(202, 232), deco('crate', 218, 0, { stack: 2 }), deco('bottle', 202.6, 0),
      check(204), boost(206, 0, 5, 22),
      enemy('turret', 220, 0, { dir: -1, rate: 1.6 }),
      cracked(212, 0, 3, 2), enemy('rat', 226, 0, { min: 216, max: 230 }),
      // boss arena
        talk(236, ['RAT KING: hold still, snack.']),
      floor(232, 300),
      solid(298, 0, 2, 20),
      boss('ratking', 240, 58, 14),
      door(292),
    ] },

  // ───────────────────────────── 5. VENTILATION ─────────────────────────────
  { id: 'vents', name: 'THE VENTILATION DUCTS', sub: 'World 5 · Hooks', song: 'digital', width: 280, deathY: -9,
    theme: { tile: ['duct', 'vent'], prop: ['duct', 'vent'], sky: ['#1a2230', '#5f7d9c'], fog: '#4a6a8a', block: '#8fa8c0', blockAlt: '#6e88a2', plat: '#c0d4e8', accent: '#43b8ff', bg: 'vents' },
    spawn: [3, 0],
    items: [
      floor(0, 26),
      deco('crate', 7, 0, { stack: 2 }), deco('bottle', 20, 0), deco('knifeblock', 22, 0),
      wind(26, -8, 6, 24, 70), solid(26, -9, 6, 1),
      solid(32, 3, 20, 3),                // ledge top y=6
      enemy('spore', 40, 9, { amp: 1.2, speed: 2 }),
      wind(52, -8, 5, 26, 70), solid(52, -9, 5, 1),
      solid(57, 7, 18, 3),                // ledge top y=10
      enemy('rat', 64, 10, { min: 58, max: 74 }),
      plat(78, 6, 4), plat(85, 3, 4), floor(90, 120), deco('rack', 104, 0), deco('shelf', 115, 0),
      ramp(90, 0, 6, 3, 1), ramp(96, 0, 4, 3, -1),
      check(92),
      enemy('turret', 110, 0, { dir: -1, rate: 2 }),
      ability(100, 1, 'grapple'),
      hook(124, 7), hook(133, 9), hook(142, 7),
      goo(120, 150, -1), solid(120, -5, 30, 3),
      floor(150, 172), deco('crate', 155, 0, { stack: 2 }), deco('cheesewheel', 167, 0),
      enemy('blob', 160, 0, { min: 151, max: 170 }),
      // fan + hook combos
      wind(172, -8, 5, 30, 70), solid(172, -9, 5, 1),
      hook(184, 14), hook(196, 12),
      solid(177, 4, 3, 16),  // tall wall, go over with the fan
      goo(180, 206, -1), solid(180, -5, 26, 3),
      plat(203, 5, 4), solid(206, 0, 24, 6),  // deck y=6
      check(208, 6),
      enemy('turret', 224, 6, { dir: -1, rate: 1.5 }),
      corrupt(217, 6, 2, 4),  // teaser: can't pass yet, go over
      laser(228, 6, 0.6, 8, 2.4, 1.0, 0),
      glitch(230, 6, 3, 6), solid(230, 0, 30, 6),
      hook(266, 11), goo(260, 272, -1), solid(260, -5, 12, 3),
      floor(272, 280), door(276),
    ] },

  // ───────────────────────────── 6. THE FIREWALL ─────────────────────────────
  { id: 'firewall', name: 'THE FIREWALL', sub: 'World 6 · Boss: THE SORTER', song: 'digital', width: 330, deathY: -9,
    theme: { tile: ['circuit', 'data'], prop: ['circuit', 'data'], sky: ['#05030f', '#2a1a5a'], fog: '#1a1040', block: '#2c2a58', blockAlt: '#1f1d40', plat: '#4a4890', accent: '#39ff88', bg: 'digital' },
    spawn: [3, 0],
    items: [
      floor(0, 40),
      laser(20, 0, 0.6, 6, 2.0, 0.9, 0), laser(28, 0, 0.6, 6, 2.0, 0.9, 1.0), laser(36, 0, 0.6, 6, 2.0, 0.9, 0.5),
      goo(40, 52, -1), solid(40, -5, 12, 3), hook(46, 7),
      floor(52, 84),
      ramp(54, 0, 5, 3, 1), ramp(59, 0, 3, 3, -1),
      enemy('turret', 70, 0, { dir: -1, rate: 1.4 }), enemy('turret', 80, 0, { dir: -1, rate: 1.4, phase: 0.7 }),
      glitch(62, 0, 2, 4), check(54),
      solid(84, 0, 4, 6), solid(84, 6, 30, 0.6), floor(88, 118),   // tunnel roof y=6
      laser(96, 0, 0.6, 6, 1.6, 0.7, 0), laser(104, 0, 0.6, 6, 1.6, 0.7, 0.8),
      enemy('rat', 110, 0, { min: 106, max: 116 }),
      floor(118, 140), check(120),
      ability(128, 1, 'noclip'),
      corrupt(140, 0, 5, 8), floor(140, 170),
      corrupt(152, 0, 4, 8), corrupt(160, 0, 8, 4),           // corridor full of corrupt data: hold noclip the whole way
      solid(160, 4, 8, 4),
      goo(170, 186, -1), solid(170, -5, 16, 3),
      corrupt(176, 3, 4, 1),           // corrupt bridge — phase to stand?? (no: can't stand while phasing) → use as a bridge only when NOT noclipping
      floor(186, 210), check(188),
      enemy('turret', 200, 0, { dir: -1, rate: 1.2 }),
      laser(194, 0, 0.6, 8, 1.4, 0.6, 0),
      // corrupt maze
      corrupt(210, 0, 3, 12), floor(210, 250),
      corrupt(216, 0, 6, 2), corrupt(226, 0, 3, 12), corrupt(233, 0, 3, 12),
      solid(229, 4, 4, 0.6),           // rest ledge between the walls (refill meter here)
      enemy('spore', 240, 4, { amp: 2, speed: 3 }),
      hook(246, 9), goo(250, 262, -1), solid(250, -5, 12, 3),
      floor(262, 330),
      talk(266, ['THE SORTER: UNGRADED ITEM.']),
      solid(328, 0, 2, 22),
      plat(280, 4, 4), plat(312, 4, 4), hook(299, 10),
      boss('anticheat', 270, 58, 16),
      door(322),
    ] },

  // ───────────────────────────── 7. THE LOADING DOCK ─────────────────────────────
  { id: 'pantry', name: 'THE LOADING DOCK', sub: 'Final - Boss: THE CHEESEMONGER', song: 'heaven', width: 340, deathY: -12,
    theme: { tile: ['cloud', 'marble'], prop: ['cloud', 'marble'], sky: ['#ffb6d9', '#ffe9a8'], fog: '#ffd6a8', block: '#f6f2ff', blockAlt: '#dcd4f5', plat: '#ffffff', accent: '#ffd700', bg: 'heaven' },
    spawn: [3, 0],
    items: [
      floor(0, 24),
      deco('crate', 4, 0, { stack: 2 }), deco('cheesewheel', 7, 0), deco('bottle', 8.8, 0),
      ramp(10, 0, 7, 3, 1), solid(17, 0, 4, 3), ramp(21, 0, 3, 3, 1),
      mplat(26, 0.5, 3, 0, 4, 3), mplat(33, 2, 3, 3, 0, 2.5, 1),
      plat(42, 4, 4), enemy('spore', 47, 7, { amp: 2, speed: 2.5 }),
      glitch(48, 4, 2, 5), plat(50, 4, 6),
      hook(62, 10), hook(72, 12), plat(78, 6, 5),
      solid(83, 6, 2, 10), solid(89, 6, 2, 10),   // wall-jump chimney → top y=16
      plat(91, 16, 8), check(93, 16),
      cracked(99, 13, 4, 3), solid(103, 13, 3, 12),
      solid(99, 2, 20, 4),   // landing shelf top y=6 (x 99..119)
      enemy('blob', 110, 6, { min: 100, max: 118 }),
      corrupt(119, 6, 4, 6), solid(123, 2, 14, 4),
      enemy('turret', 132, 6, { dir: -1, rate: 1.3 }),
      laser(128, 6, 0.6, 8, 1.6, 0.7, 0),
      wind(137, -10, 5, 40, 75), solid(137, -11, 5, 1),
      solid(142, 14, 20, 3),   // high ledge y=17
      enemy('rat', 150, 17, { min: 143, max: 160 }),
      hook(168, 20), hook(180, 22), hook(192, 20),
      plat(198, 12, 6), check(200, 12),
      mplat(206, 12, 3, 5, -3, 3),
      plat(216, 8, 4), glitch(220, 8, 2, 6), plat(222, 8, 4), 
      bounce(227, 8, 2), 
      hook(234, 16), plat(240, 8, 6), corrupt(246, 8, 3, 8), solid(246, 4, 10, 4),
      floor(256, 340, 0),
      talk(260, ['THE CHEESEMONGER: back on the shelf.']),
      solid(338, 0, 2, 30),
      wind(268, 0, 4, 18, 75),
      plat(280, 7, 4), plat(290, 11, 4), plat(318, 9, 4), plat(328, 4, 4),
      hook(300, 16), hook(312, 14), hook(322, 17),
      boss('god', 264, 74, 22),
      door(332),
    ] },
  ];
})();
