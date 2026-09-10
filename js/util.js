// Shared helpers + constants. Everything lives on window.CZ (classic scripts, no build step).
window.CZ = window.CZ || {};

// Internal render height for the pixel-art pass; everything upscales from this.
CZ.PIXEL_HEIGHT = 288;

CZ.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
CZ.lerp = (a, b, t) => a + (b - a) * t;
CZ.damp = (a, b, k, dt) => CZ.lerp(a, b, 1 - Math.exp(-k * dt));
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
  RUN_ACCEL: 70,
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
  PLAYER_W: 0.9,
  PLAYER_H: 1.0,
  MAX_HP: 3,
  IFRAMES: 1.1,
};

// Ability metadata: id → display.
CZ.ABILITIES = {
  doubleJump: { name: 'FRAME SKIP', ico: 'tech-jump', key: 'JUMP again in mid-air',
    desc: 'The game only checks "grounded" once per jump. Nobody said you can\'t jump AGAIN.' },
  dash: { name: 'CLIP DASH', ico: 'tech-dash', key: 'SHIFT / X  (+ direction)',
    desc: 'Hitboxes turn off for 9 frames. Dash through GLITCH WALLS (green) and straight through enemies. Dash on the ground, then jump right away to keep the speed.' },
  wallJump: { name: 'WALL CLIP', ico: 'tech-wall', key: 'Hold toward a wall, then JUMP',
    desc: 'Walls are just floors the dev rotated. Slide down them, kick off them.' },
  pound: { name: 'CRASH DIVE', ico: 'tech-pound', key: 'DOWN / S  in the air',
    desc: 'Fall damage got applied to the FLOOR instead of you. Slam down to shatter CRACKED tiles, squish enemies and bounce.' },
  grapple: { name: 'HOOK EXPLOIT', ico: 'tech-hook', key: 'C / E  near a blue node',
    desc: 'The dev left their debug grapple hook in the build. Pull yourself to HOOK NODES (blue) and fling.' },
  noclip: { name: 'NOCLIP', ico: 'tech-ghost', key: 'Hold V / Q',
    desc: 'You found the dev console. Phase through CORRUPT blocks (purple) while the meter lasts. Refills on solid ground.' },
};
CZ.ABILITY_ORDER = ['doubleJump', 'dash', 'wallJump', 'pound', 'grapple', 'noclip'];
CZ.TECH_KEYS = { doubleJump: 'JUMP×2', dash: 'SHIFT', wallJump: 'WALL', pound: 'DOWN', grapple: 'C', noclip: 'V' };

// Save data.
CZ.SAVE_KEY = 'cheezit.save.v1';
CZ.loadSave = () => {
  try { return JSON.parse(localStorage.getItem(CZ.SAVE_KEY)) || null; } catch (e) { return null; }
};
CZ.writeSave = data => { try { localStorage.setItem(CZ.SAVE_KEY, JSON.stringify(data)); } catch (e) {} };
CZ.newSave = () => ({ level: 0, abilities: {}, bugs: {}, deaths: 0, time: 0, bestTime: null, completed: false });
