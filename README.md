# CHEEZ-IT — File a Hole in This Game

A cartoony 3D side-scrolling platformer about breaking games, built with Three.js and zero build tools.

You are a professional game bugger: you find exploits, clip through bosses, skip credits. The God of Games has had
enough and curses you into a piece of cheese, trapped inside their "perfect, bug-free" Cheese Factory. Escape the
factory, climb to the Pantry in the sky, and touch the Golden Apple to become human again. To do it, you'll have to
find holes in the game — every movement tech you unlock is an "exploit" the God forgot to patch.

## Play

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

Each world hides **bug reports** (🪲) to collect. Progress, unlocked techs and collectibles save to `localStorage`.

## Code layout

```
index.html      DOM overlay (HUD, dialog, menus) + script tags
css/style.css   UI styling
js/util.js      constants (all physics tuning lives in CZ.P), ability metadata, save helpers
js/audio.js     procedural WebAudio SFX + chiptune sequencer
js/input.js     keyboard/gamepad → actions with press/hold edges
js/levels.js    level data (a tiny DSL: floor/plat/hazard/mover/glitch/corrupt/cracked/hook/...)
js/effects.js   toon materials, outlines, particles, screen shake
js/level.js     level runtime: meshes, animation, collision queries, parallax backgrounds
js/player.js    the cheese: movement controller + squash/stretch visuals
js/enemies.js   rat, spore, blob, turret, projectiles
js/bosses.js    Rat King, Anti-Cheat.exe, God of Games
js/ui.js        DOM helpers
js/main.js      game loop, camera, state machine, interactions, progress
```

Everything is plain classic scripts on a `CZ` namespace, so there is no build step. Physics runs at a fixed 120 Hz.
