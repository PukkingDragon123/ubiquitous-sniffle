# CHEEZ-IT — File a Hole in This Game

A 3D side-scrolling platformer about a wheel of cheese with a grudge, built with Three.js and no build tools.

You were a mech pilot, losing a duel on a grassland. Then you noticed the ground had no collision, clipped through
it, came up behind the red mech and took its head off. A rubber duck descended, introduced itself as the dev, and
turned you into a wheel of cheese. You are going to build your own mech out of whatever this cellar has.

## The opening is a fight you play

The game boots straight into it. Two panelled mechs stand in a grassland and both of them are ragdolls - verlet
points, stick joints, joints that snap - so nothing is animated by hand. You drive the blue one:

| Action | Key | Touch |
| --- | --- | --- |
| Walk | LEFT / RIGHT | thumbstick |
| Jump | SPACE | JUMP |
| Beam saber | SHIFT | DASH |

Hits are found by sweeping the blade against the other rig, so a downward cut still lands on a mech that is already
on the ground. Three hits and a mech starts coming apart: an arm, a leg, then the head, each one a stick that snaps
and a piece that falls. Win and you take the red mech's head off. Lose and the floor turns out to have no collision:
you fall through it, come up behind red, and take its head off anyway. Either way a rubber duck descends on a beam
of light, says it spent nine months on that arena, and turns you into a wheel of cheese.

Every line is a pixel-art cloud balloon and every hit is a comic impact word. There is no title screen, no dialogue
box, and no HUD in the fight. SKIP is a button in the corner.

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
| Roll | ← → / A D |
| Jump (hold for higher) | SPACE / Z / W / ↑ |
| Spin | SHIFT / X |
| Poke | C / E |
| Spring legs (double jump) | Jump again in the air, once installed |
| Grip claws (wall cling) | Hold toward a wall to slide, Jump to kick off |
| Hammer fist (ground pound) | ↓ / S in the air |
| Winch arm (grapple) | C / E near a blue node, Jump to fling |
| Phase core (noclip) | Hold V / Q (meter refills on the ground) |
| Pause / Mute / Restart at checkpoint | ESC or P / M / R |

Gamepads work too (A jump, B/RB dash, X grapple, Y noclip, D-pad/stick move).

### Touch (phones and tablets)

On-screen controls appear automatically on touch devices, and the HUD shrinks to fit a phone screen.

- **Floating thumbstick** — press anywhere in the left half of the screen and the stick snaps to your thumb. Flick it
  down in mid-air to ground pound; hold it up or down while spinning to aim the spin.
- **Action buttons** on the right: a large JUMP, plus SPIN, POKE and PHASE. Each button appears only once the part
  is installed, so the controls grow with the game. The same stick and buttons drive the mech in the opening fight.
- **Pause** sits in the top-left corner. SKIP in the corner ends the opening.
- Portrait mode shows a "turn sideways" nudge, but the game is fully playable either way if you dismiss it.

Add the page to your home screen for a fullscreen, browser-chrome-free run.

## Rolling

Stages are built for a wheel. Ramps carry your speed uphill and fling you off the lip, boost strips fire you down a
lane, crates exist to be smashed at speed, and levers exist to be poked. Nothing is hidden behind a tech hunt - the
upgrades sit in machines on the critical path, and rolling into one bolts the part on: spring legs, thruster, grip
claws, hammer fist, winch arm, phase core.

## Worlds

1. **The Cheese Cellar** — one authored room: wine racks, barrels, a giant cheese press, cobwebs and spiders.
   Learn to roll, spin through crates, poke a lever, and feed yourself into the first machine.
2. **The Grater Line** — conveyors, graters, moving platforms. Unlock: thruster.
3. **The Melting Vats** — molten cheese and shafts. Unlock: grip claws.
4. **The Packaging Plant** — presses and cracked floors. Unlock: hammer fist. **Boss: RAT KING** (stomp the crown).
5. **The Ventilation Ducts** — fans and hook nodes. Unlock: winch arm.
6. **The Firewall** — lasers and corrupt data. Unlock: phase core. **Boss: ANTI-CHEAT.EXE** (phase through its shield).
7. **The Dev's Pantry** — everything at once. **Final boss: THE DEV** (a rubber duck who deletes the floor while you climb for the golden patch).

Progress and installed parts save to `localStorage`.

## Look and feel

Everything is drawn at runtime. There are no image files in this repository, and the game uses **no emoji anywhere** -
every icon, portrait and glyph is hand-authored pixel art.

- **Pixel-art rendering.** The 3D world renders into a 540px-tall buffer and is upscaled with nearest-neighbour
  filtering, so the whole game lands on a chunky pixel grid. Every surface carries a procedural pixel texture
  generated on a 32px canvas: stone brick, riveted plate, corrugated cardboard, cracked magma, circuit board,
  ducting, cloud marble, cheese, conveyor belts.
- **Three depths per world.** A dithered sky, two parallax background layers of themed props, the play plane, and a
  foreground layer of pipes, girders and chains that sweeps past in front of the camera.
- **Cloud balloons.** Every line of speech is a pixel-art cloud drawn per balloon on a 4px grid - a body with fat
  round lobes all around the rim, a chunky ink outline and three shrinking tail puffs - sized to the text, tracking
  a point in the 3D world, and never more than one on screen at a time.
- **Almost no words.** No title screen, no dialogue box, no signposts, no tutorial text. The HUD is a cheese wheel
  meter and a row of installed parts; the upgrade card is an icon, a name and a key.
- **Cardboard UI.** Panels and buttons are corrugated cardboard with hard pixel borders and a drop step instead of
  soft shadows, tilted slightly like taped-up signs.
- **Graffiti type.** Rubik Spray Paint for the huge tags, Press Start 2P for pixel labels, Silkscreen for body text.
  The title letters bob on a stagger, the boss name shudders, and prompts blink. All motion respects
  `prefers-reduced-motion`.
- **Cheese everywhere.** Drips ooze off every panel and off ledges in the world, where they stretch, break and
  fall, and the wheel throws a trail of crumbs whenever it is rolling fast or spinning.

## Code layout

```
index.html      DOM overlay (HUD, dialog, menus) + script tags
css/style.css   UI styling
js/util.js      constants (all physics tuning lives in CZ.P), ability metadata, save helpers
js/sprites.js   hand-authored 16x16 pixel-art sprites: icons, portraits, glyphs (no emoji)
js/textures.js  procedural pixel textures for every 3D surface
js/audio.js     procedural WebAudio SFX + chiptune sequencer
js/input.js     keyboard/gamepad → actions with press/hold edges
js/levels.js    level data (a tiny DSL: floor/plat/ramp/boost/hazard/mover/glitch/cracked/hook/...)
js/effects.js   toon materials, outlines, particles, screen shake
js/level.js     level runtime: meshes, animation, collision queries, parallax backgrounds
js/player.js    the cheese: movement controller + squash/stretch visuals
js/enemies.js   rat, spore, blob, turret, projectiles
js/bosses.js    Rat King, Anti-Cheat.exe, God of Games
js/ui.js        DOM helpers
js/ragdoll.js   verlet ragdoll solver + the mech rig built on it (balance, swings, severed limbs)
js/cinematic.js the playable opening: grassland, the duel, the duck, the curse
js/mech.js      the scripted mech model used outside the fight
js/comic.js     speech balloons, impact words, speed lines, halftone
js/touch.js     on-screen thumbstick + buttons for touch devices
js/main.js      game loop, camera, state machine, interactions, progress
```

Everything is plain classic scripts on a `CZ` namespace, so there is no build step. Physics runs at a fixed 120 Hz,
independent of the render rate.
