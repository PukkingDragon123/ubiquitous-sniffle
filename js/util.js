// Shared helpers + constants. Everything lives on window.CZ (classic scripts, no build step).
window.CZ = window.CZ || {};

// Internal render height. Higher = crisper; the world art is kept simple and flat
// so it reads clearly at this resolution.
CZ.PIXEL_HEIGHT = 540;

CZ.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
CZ.lerp = (a, b, t) => a + (b - a) * t;
CZ.damp = (a, b, k, dt) => CZ.lerp(a, b, 1 - Math.exp(-k * dt));
CZ.ease = t => t * t * (3 - 2 * t);   // smoothstep, for scripted camera moves
CZ.sign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);
CZ.rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
CZ.pick = arr => arr[(Math.random() * arr.length) | 0];
CZ.fmtTime = t => {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
};

// AABB: {x,y,w,h} with x,y = bottom-left corner.
CZ.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
CZ.overlapPad = (a, b, p) => a.x - p < b.x + b.w && a.x + a.w + p > b.x && a.y - p < b.y + b.h && a.y + a.h + p > b.y;

// Physics tuning — the "movement focus" lives here.
CZ.P = {
  GRAVITY: 44,
  RUN_SPEED: 9.6,
  WALK_SPEED: 4.6,        // limbless shuffle, before the leg
  LEGLESS_JUMP: 0.86,     // jump velocity multiplier with no leg
  RAPID_WINDOW: 0.42,     // mash this many presses inside this window to trip the jump queue
  RAPID_PRESSES: 4,
  RAPID_TIME: 3.0,        // how long the queue stays broken
  STAB_TIME: 0.18,
  STAB_SPEED: 14,
  STAB_COOLDOWN: 0.3,
  RUN_ACCEL: 70,
  ROLL_ACCEL: 46,          // a wheel takes a moment to get going
  ROLL_FRICTION: 9,        // ...and keeps rolling once it does
  // Charge spin: hold to wind up on the spot, release to launch.
  CHARGE_TIME: 0.95,          // seconds to a full wind-up
  CHARGE_GRIP: 26,            // how hard it holds position while winding up
  PERFECT_FROM: 0.8,          // release inside this band for the big one
  PERFECT_TO: 0.96,
  OVERCHARGE: 0.55,           // hold past full this long and it fizzles
  LAUNCH_MIN: 13,             // release speed at no charge
  LAUNCH_MAX: 31,             // ...and at full charge
  LAUNCH_PERFECT: 37,
  SPIN_TIME: 0.26,
  SPIN_SPEED: 17,
  SPIN_COOLDOWN: 0.18,
  // What your momentum is worth. Speed alone opens doors in this game.
  SMASH_CRATE: 7,
  SMASH_HEAVY: 15,
  SMASH_DOOR: 23,
  AIR_ACCEL: 46,
  GROUND_FRICTION: 60,
  AIR_FRICTION: 6,
  JUMP_VEL: 15.8,
  DOUBLE_JUMP_VEL: 14.5,
  JUMP_CUT: 0.45,        // multiply vy by this when jump released early
  MAX_FALL: 30,
  COYOTE: 0.1,
  JUMP_BUFFER: 0.12,
  DASH_SPEED: 27,
  DASH_TIME: 0.16,
  DASH_COOLDOWN: 0.22,
  WAVEDASH_WINDOW: 0.12, // jump this soon after a ground dash keeps dash speed
  WALL_SLIDE: 3.2,
  WALL_JUMP_VX: 11.5,
  WALL_JUMP_VY: 15,
  WALL_STICK: 0.12,      // seconds input toward wall is ignored after a wall jump
  POUND_SPEED: 36,
  POUND_BOUNCE: 17,
  GRAPPLE_RANGE: 8.5,
  GRAPPLE_SPEED: 24,
  NOCLIP_MAX: 1.6,
  NOCLIP_REGEN: 1.2,
  PLAYER_W: 1.24,
  PLAYER_H: 1.24,
  MAX_HP: 3,
  IFRAMES: 1.1,
};

// Ability metadata: id → display.
CZ.ABILITIES = {
  doubleJump: { name: 'BOUNCE RIND', ico: 'tech-jump', key: 'JUMP again in mid-air',
    desc: 'A rind with some spring left in it.' },
  dash: { name: 'WAX SKATE', ico: 'tech-dash', key: 'SHIFT / X  (+ direction)',
    desc: 'A coat of wax. You go where you are pointed, fast.' },
  wallJump: { name: 'STICKY CRUST', ico: 'tech-wall', key: 'Hold toward a wall, then JUMP',
    desc: 'Ripe enough to stick to a wall and push off it.' },
  pound: { name: 'DEAD WEIGHT', ico: 'tech-pound', key: 'DOWN / S  in the air',
    desc: 'Drop like a whole wheel. Cracked floors do not survive it.' },
  grapple: { name: 'CHEESE STRING', ico: 'tech-hook', key: 'C / E  near a blue node',
    desc: 'One long string, thrown at anything hanging.' },
  noclip: { name: 'HOLE SLIP', ico: 'tech-ghost', key: 'Hold V / Q',
    desc: 'You are mostly holes. Slip through what is in the way.' },
};
CZ.ABILITY_ORDER = ['doubleJump', 'dash', 'wallJump', 'pound', 'grapple', 'noclip'];

CZ.TECH_KEYS = { doubleJump: 'JUMP x2', dash: 'SHIFT', wallJump: 'WALL', pound: 'DOWN', grapple: 'C', noclip: 'V' };

// Save data.
CZ.SAVE_KEY = 'cheezit.save.v1';
CZ.loadSave = () => {
  try { return JSON.parse(localStorage.getItem(CZ.SAVE_KEY)) || null; } catch (e) { return null; }
};
CZ.writeSave = data => { try { localStorage.setItem(CZ.SAVE_KEY, JSON.stringify(data)); } catch (e) {} };
CZ.newSave = () => ({ level: 0, abilities: {}, bugs: {}, deaths: 0, time: 0, bestTime: null, completed: false, sawIntro: false });
