# CHEEZ-IT — File a Hole in This Game

A 3D side-scrolling platformer about a wheel of cheese with a grudge, built with Three.js and no build tools.

You were a mech pilot, losing a duel on a grassland. Then you noticed the ground had no collision, clipped through
it, came up behind the red mech and took its head off. A rubber duck descended, introduced itself as the dev, and
turned you into a wheel of cheese. You are going to build your own mech out of whatever this cellar has.

## The opening

The game boots straight into the fight: two panelled mechs, a losing duel, limbs torn off and left tumbling in the
grass, the clip-through-the-floor glitch, a decapitation, and a duck with a lightning bolt. Every line is a comic
speech balloon, every hit is a comic impact word. There is no title screen and no dialogue box anywhere in this
game. Tap or press JUMP to skip.

## What you do

You are a wheel. Four things, no tech trees:

| Action | Key | What it does |
| --- | --- | --- |
| Roll | LEFT / RIGHT | Builds speed and keeps it, like a wheel should |
| Jump | SPACE | Hold for height |
| Spin | SHIFT | Spin attack: smashes crates, kills what it touches |
| Poke | C | A toothpick pops out to flip levers and prod enemies |

Damage is literal: every hit **cuts a wedge out of the wheel**, and the meter in the corner is the cheese itself.
Stand near molten cheese and you **soften** - you sag, you slow down, and if you cook through you are a puddle.

Upgrades come from machines in the world, not from floating orbs. Roll into a press and it bolts a part on:
spring legs, a thruster, grip claws, a hammer fist, a winch arm, a phase core. By the last world you are a mech.

## Play

A single-file build is also available: run `node build.js` and open `dist/cheez-it.html`.

### From the repo

Open `index.html` in a browser (Chrome/Edge/Firefox), or serve the folder:

```
python3 -m http.server 8000
# → http://localhost:8000
```

Three.js is loaded from cdnjs, so an internet connection is needed the first time.

## Controls

| Action | Keys |
| --- | --- |
| Move | ← → / A D |
| Jump (hold for higher) | SPACE / Z / W / ↑ |
| Frame Skip (double jump) | Jump again in the air |
| Clip Dash | SHIFT / X (+ any direction) |
| Wall Clip | Hold toward a wall to slide, Jump to kick off |
| Crash Dive (ground pound) | ↓ / S in the air |
| Hook Exploit (grapple) | C / E near a blue node, Jump to fling |
| Noclip | Hold V / Q (meter refills on the ground) |
| Pause / Mute / Restart at checkpoint | ESC or P / M / R |

Gamepads work too (A jump, B/RB dash, X grapple, Y noclip, D-pad/stick move).

### Touch (phones and tablets)

On-screen controls appear automatically on touch devices, and the HUD shrinks to fit a phone screen.

- **Floating thumbstick** — press anywhere in the left half of the screen and the stick snaps to your thumb. Flick it
  down in mid-air to Crash Dive; hold it up or down while dashing to aim the dash.
- **Action buttons** on the right: a large JUMP, plus DASH, HOOK and NOCLIP. Each button appears only once you have
  unlocked that tech, so the controls grow with the game.
- **Pause** sits in the top-left corner; tapping a story card or the JUMP button advances dialogue.
- Portrait mode shows a "turn sideways" nudge, but the game is fully playable either way if you dismiss it.

Add the page to your home screen for a fullscreen, browser-chrome-free run.

## Body parts

You start as a wedge that can barely hop. Each part changes how you move:

| Part | Where | What it does |
| --- | --- | --- |
| Fork arm | on the cellar counter | SHIFT stabs. Whatever you stab stops existing. |
| Knife arm | in the locked pantry | A second arm, so walking into small things skewers them instead of hurting you. |
| Toothpick leg | on top of the cheese press | **Running.** Full speed, higher jumps, and the run-up you need for the floor drain. |

## Glitches you find, not pickups

Two of the techs are bugs in the game you are inside. Nobody hands them to you:

- **Jump queue** — mash JUMP faster than the grounded check can clear and it never clears. Keep mashing, keep rising.
  This is how you get onto the counter, which is deliberately taller than your hop.
- **Menu clip** — pausing parks you outside the physics step. Pause while pressed into a thin wall, resume, and you
  come back on the other side. This is how the locked pantry opens.

The rest are found as pickups in later worlds: Frame Skip (double jump), Clip Dash (i-frames, cuts through green
glitch walls), Wall Clip, Crash Dive, Hook Exploit, Noclip. Dash on the ground and jump immediately to keep dash
speed.

## Worlds

1. **The Cheese Cellar** — one authored room: wine racks, barrels, a giant cheese press, cobwebs and spiders.
   Learn to roll, spin through crates, poke a lever, and feed yourself into the first machine.
2. **The Grater Line** — conveyors, graters, moving platforms. Unlock: Clip Dash.
3. **The Melting Vats** — molten cheese and shafts. Unlock: Wall Clip.
4. **The Packaging Plant** — presses and cracked floors. Unlock: Crash Dive. **Boss: RAT KING** (stomp the crown).
5. **The Ventilation Ducts** — fans and hook nodes. Unlock: Hook Exploit.
6. **The Firewall** — lasers and corrupt data. Unlock: Noclip. **Boss: ANTI-CHEAT.EXE** (phase through its shield).
7. **The Dev's Pantry** — everything at once. **Final boss: THE DEV** (a rubber duck who deletes the floor while you climb for the golden patch).

Each world hides **bug reports** (bug reports) to collect. Progress, unlocked techs and collectibles save to `localStorage`.

## Look and feel

Everything is drawn at runtime. There are no image files in this repository, and the game uses **no emoji anywhere** -
every icon, portrait and glyph is hand-authored pixel art.

- **Pixel-art rendering.** The 3D world renders into a 540px-tall buffer and is upscaled with nearest-neighbour
  filtering, so the whole game lands on a chunky pixel grid. Every surface carries a procedural pixel texture
  generated on a 32px canvas: stone brick, riveted plate, corrugated cardboard, cracked magma, circuit board,
  ducting, cloud marble, cheese, conveyor belts.
- **Three depths per world.** A dithered sky, two parallax background layers of themed props, the play plane, and a
  foreground layer of pipes, girders and chains that sweeps past in front of the camera.
- **Cardboard UI.** Panels, buttons and dialogue boxes are corrugated cardboard with hard pixel borders and a drop
  step instead of soft shadows, tilted slightly like taped-up signs.
- **Graffiti type.** Rubik Spray Paint for the huge tags, Press Start 2P for pixel labels, Silkscreen for body text.
  The title letters bob on a stagger, the boss name shudders, and prompts blink. All motion respects
  `prefers-reduced-motion`.
- **Cheese everywhere.** Drips ooze off the logo, off every panel, off the dialogue box, and off ledges in the
  world itself, where they stretch, break and fall.

## Code layout

```
index.html      DOM overlay (HUD, dialog, menus) + script tags
css/style.css   UI styling
js/util.js      constants (all physics tuning lives in CZ.P), ability metadata, save helpers
js/sprites.js   hand-authored 16x16 pixel-art sprites: icons, portraits, glyphs (no emoji)
js/textures.js  procedural pixel textures for every 3D surface
js/audio.js     procedural WebAudio SFX + chiptune sequencer
js/input.js     keyboard/gamepad → actions with press/hold edges
js/levels.js    level data (a tiny DSL: floor/plat/hazard/mover/glitch/corrupt/cracked/hook/...)
js/effects.js   toon materials, outlines, particles, screen shake
js/level.js     level runtime: meshes, animation, collision queries, parallax backgrounds
js/player.js    the cheese: movement controller + squash/stretch visuals
js/enemies.js   rat, spore, blob, turret, projectiles
js/bosses.js    Rat King, Anti-Cheat.exe, God of Games
js/ui.js        DOM helpers
js/cinematic.js the opening mech battle: grassland, camera keyframes, timeline
js/mech.js      the mech itself: panelled armour, procedural walk, detachable limbs
js/comic.js     speech balloons, impact words, speed lines, halftone
js/touch.js     on-screen thumbstick + buttons for touch devices
js/main.js      game loop, camera, state machine, interactions, progress
```

Everything is plain classic scripts on a `CZ` namespace, so there is no build step. Physics runs at a fixed 120 Hz,
independent of the render rate.
