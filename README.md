# CHEEZ-IT — File a Hole in This Game

A cartoony 3D side-scrolling platformer about breaking games, built with Three.js and zero build tools.

You are a professional game bugger: you find exploits, clip through bosses, skip credits. The God of Games has had
enough and curses you into a piece of cheese, trapped inside their "perfect, bug-free" Cheese Factory. Escape the
factory, climb to the Pantry in the sky, and touch the Golden Apple to become human again. To do it, you'll have to
find holes in the game — every movement tech you unlock is an "exploit" the God forgot to patch.

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

### Movement tech

- **Coyote time + jump buffering** so jumps feel fair.
- **Wavedash**: dash on the ground and jump within a few frames to carry dash speed into the air.
- **Dash i-frames**: nothing can hurt you mid-dash, and dashing deletes small enemies. Dash through green glitch walls.
- **Crash Dive** shatters cracked tiles, squishes anything nearby, and bounces you off enemies.
- **Hook** nodes pull you in; release early with Jump for a slingshot, or hang and jump off.
- **Noclip** phases through purple corrupt data. Run out of meter inside a block and it hurts.

## Worlds

1. **The Aging Cellar** — tutorial. Unlock: Frame Skip.
2. **The Grater Line** — conveyors, graters, moving platforms. Unlock: Clip Dash.
3. **The Melting Vats** — molten cheese and shafts. Unlock: Wall Clip.
4. **The Packaging Plant** — presses and cracked floors. Unlock: Crash Dive. **Boss: RAT KING** (stomp the crown).
5. **The Ventilation Ducts** — fans and hook nodes. Unlock: Hook Exploit.
6. **The Firewall** — lasers and corrupt data. Unlock: Noclip. **Boss: ANTI-CHEAT.EXE** (phase through its shield).
7. **God's Pantry** — everything at once. **Final boss: THE GOD OF GAMES** (reach the Golden Apple while the floor gets deleted).

Each world hides **bug reports** (bug reports) to collect. Progress, unlocked techs and collectibles save to `localStorage`.

## Look and feel

Everything is drawn at runtime. There are no image files in this repository, and the game uses **no emoji anywhere** -
every icon, portrait and glyph is hand-authored pixel art.

- **Pixel-art rendering.** The 3D world renders into a 288px-tall buffer and is upscaled with nearest-neighbour
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
js/touch.js     on-screen thumbstick + buttons for touch devices
js/main.js      game loop, camera, state machine, interactions, progress
```

Everything is plain classic scripts on a `CZ` namespace, so there is no build step. Physics runs at a fixed 120 Hz,
independent of the render rate.
