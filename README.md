# CHEEZ-IT — Get Out Before You Rot

A 3D side-scrolling platformer about a wheel of cheese escaping the place that left it to rot, built with Three.js
and no build tools.

You are a wheel of cheese on a cellar shelf. Nobody is coming back for you. The wheel beside you is already green,
and the mould is working its way along the shelf. So you roll off the shelf and go looking for the door.

## The opening

Four short beats, about ten seconds, skippable with the SKIP button in the corner:

1. A forgotten shelf in a dark cellar - *"They forgot me down here."*
2. The mould takes your neighbour, then starts on you - *"That one rotted." / "I'M NEXT."*
3. You rock until you tip, and hit the floor - **THUD**
4. The gap of light under the cellar door, and one decision - *"Not today."*

Every line is a pixel-art cloud balloon. There is no title screen and no dialogue box anywhere in this game.

## What you do

You are a wheel. Four things, no tech trees:

| Action | Key | What it does |
| --- | --- | --- |
| Roll | LEFT / RIGHT | Builds speed and keeps it, like a wheel should |
| Jump | SPACE | Hold for height |
| Spin | SHIFT | Spin attack: smashes crates, kills what it touches |
| Poke | C | A toothpick pops out to flip levers and prod enemies |

Damage is literal: every hit **cuts a wedge out of the wheel**. There is no health bar in the HUD, because you are
the health bar - look at how much cheese is left.
Stand near molten cheese and you **soften** - you sag, you slow down, and if you cook through you are a puddle.

Upgrades come from machines in the world, not from floating orbs. Roll into a press and something gets done to you:
a bouncier rind, a coat of wax, a stickier crust, more dead weight, a length of cheese string, and finally enough
holes to slip through a wall.

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
| Bounce rind (double jump) | Jump again in the air, once you have it |
| Sticky crust (wall cling) | Hold toward a wall to slide, Jump to kick off |
| Dead weight (ground pound) | ↓ / S in the air |
| Cheese string (grapple) | C / E near a blue node, Jump to fling |
| Hole slip (noclip) | Hold V / Q (meter refills on the ground) |
| Pause / Mute / Restart at checkpoint | ESC or P / M / R |

Gamepads work too (A jump, B/RB dash, X grapple, Y noclip, D-pad/stick move).

### Touch (phones and tablets)

On-screen controls appear automatically on touch devices, and the HUD shrinks to fit a phone screen.

- **Floating thumbstick** — press anywhere in the left half of the screen and the stick snaps to your thumb. Flick it
  down in mid-air to ground pound; hold it up or down while spinning to aim the spin.
- **Action buttons** on the right: a large JUMP, plus SPIN, POKE and PHASE. Spin and poke are always there - the
  wheel can do both from the start - and PHASE appears once you have the holes for it.
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
2. **The Grater Line** — conveyors, graters, moving platforms. Unlock: wax skate.
3. **The Melting Vats** — molten cheese and shafts. Unlock: sticky crust.
4. **The Packaging Plant** — presses and cracked floors. Unlock: dead weight. **Boss: RAT KING** (stomp the crown).
5. **The Ventilation Ducts** — fans and hook nodes. Unlock: cheese string.
6. **The Firewall** — lasers and sorting gear. Unlock: hole slip. **Boss: THE SORTER** (slip inside its scanner).
7. **The Loading Dock** — everything at once, and the door out. **Final boss: THE CHEESEMONGER** (he takes the floor away while you climb).

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
- **One pixel typeface.** Everything - headings, balloons, buttons, impact words - is set in Pixelify Sans, heavy
  weight for display sizes. No second face anywhere. The boss name shudders and prompts blink; all motion respects
  `prefers-reduced-motion`.
- **Googly eyes.** The cheese has two of them, deliberately mismatched in size and height, each pupil a weight on its
  own loose spring that overshoots, rattles off the rim and takes its time settling - and spins in circles when you
  spin.
- **Cheese everywhere.** Drips ooze off every panel and off ledges in the world, where they stretch, break and
  fall, and the wheel throws a trail of crumbs whenever it is rolling fast or spinning.
- **Lit like a room.** Key, fill and a cool rim light pick every silhouette off the background; cellar lamps throw
  visible cones of light; dust drifts up through them; a vignette and a faint scanline wash frame the screen.
- **Things that live here.** The rat has a snout, whiskers, flicking ears, a whipping three-part tail and four feet
  that step; the spider hangs on a thread on eight two-jointed legs; the mould spore is a spiked puffball with one
  enormous eye that follows you; the molten blob drips and gurns; the turret wears hazard stripes and its lens flares
  red before it fires.

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
js/cinematic.js the opening: a shelf, the mould, the fall, the door
js/comic.js     speech balloons, impact words, speed lines, halftone
js/touch.js     on-screen thumbstick + buttons for touch devices
js/main.js      game loop, camera, state machine, interactions, progress
```

Everything is plain classic scripts on a `CZ` namespace, so there is no build step. Physics runs at a fixed 120 Hz,
independent of the render rate.
