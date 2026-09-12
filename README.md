# CHEEZ-IT — Get Out Before You Rot

A 3D side-scrolling platformer about a wheel of cheese escaping the place that left it to rot, built with Three.js
and no build tools. Made by Pukking Dragon.

You are a wheel of cheese on a cellar shelf. Nobody is coming back for you. The wheel beside you is already green,
and the mould is working its way along the shelf. So you roll off the shelf and go looking for the door.

## The opening

Four short beats, about ten seconds, skippable with the SKIP button in the corner:

1. A forgotten shelf in a dark cellar - *"They forgot me down here."*
2. The mould takes your neighbour, then starts on you - *"That one rotted." / "I'M NEXT."*
3. You rock until you tip, and hit the floor - **THUD**
4. The gap of light under the cellar door, and one decision - *"Not today."*

Every line is a pixel-art cloud balloon. There is no title screen and no dialogue box anywhere in this game.

## What the game is about

**Speed is the weapon.** Rolling builds momentum, and momentum is what opens the level up: at a jog you bounce off a
crate wall, at a full roll you go straight through it, and heavy things - stacked barrels, the door at the end -
need real speed behind them. Everything you break costs you a little of it, so a run is a chain: build, spend,
rebuild.

**The wind-up is the skill.** Hold SPIN and the wheel plants itself and starts spinning on the spot, with a ring
filling around it. Let go and you launch. Let go inside the bright band near the top of the ring and you get a
**PERFECT** - a much harder launch and a moment of invulnerability. Hold past the top for too long and it flops,
leaving you dizzy and slow.

**Everything in the room is breakable.** Wine racks, shelves of cheese, crates, bottles, knife blocks, the lamps
overhead, whole vats - none of it is scenery, all of it comes apart into chunks that fly, tumble, bounce and pile up
on the floor and stay there. A counter in the corner keeps the tally. Smash a lamp and that corner of the cellar
genuinely goes dark.

**You have no bones.** Hold DOWN on the ground and the wheel spreads into a flat slab less than half as tall, and a
flat slab slides a very long way. Walls that run to the ceiling have a hand's width of daylight under them; ducts run
over the top of locked gates with the same clearance. Let go under a low roof and you stay flat until there is room
to pop back up. Most obstacles have two answers: hit it hard enough, or change shape and go round.

**The way out is a door.** Every stage ends at a heavy one. Hit it slowly and it just cracks and shrugs you off.
Hit it with enough speed and the game stops for a single button press: a ring shrinks toward a target band, and if
you press inside the band the door blows apart in planks and iron. Miss, and you bounce off and go get more speed.

Between stages, the kitchen map: the room you are escaping through, your route across it, and your wheel rolling on
to the next stop.

## What you do

You are a wheel. Four things, no tech trees:

| Action | Key | What it does |
| --- | --- | --- |
| Roll | LEFT / RIGHT | Builds speed and keeps it, like a wheel should |
| Jump | SPACE | Hold for height |
| Wind up | SHIFT (hold) | Spin on the spot, release to launch - time the release |
| Squish | DOWN (hold) | Go flat, slide under things a wheel cannot pass |

Levers are not a button either: roll into one and it flips.

Damage is literal: every hit **cuts a wedge out of the wheel**. There is no health bar in the HUD, because you are
the health bar - look at how much cheese is left.
Stand near molten cheese and you **soften** - you sag, you slow down, and if you cook through you are a puddle.

Upgrades come from machines in the world, not from floating orbs. Roll into a press and something gets done to you:
a bouncier rind, a coat of wax, a stickier crust, more dead weight, a length of cheese string, and finally enough
holes to slip through a wall.

## Play

The game opens on a short cutscene and drops you straight into world one. From the pause menu, QUIT takes you to the
main menu: PLAY (which reads CONTINUE once you are past world one and puts you back at the furthest one you reached),
WORLDS, CONTROLS, SETTINGS, and a button to watch the opening again.

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
| Wind up / launch (hold, then release) | SHIFT / X |
| Squish flat (on the ground) | ↓ / S |
| Bounce rind (double jump) | Jump again in the air, once you have it |
| Sticky crust (wall cling) | Hold toward a wall to slide, Jump to kick off |
| Dead weight (ground pound) | ↓ / S in the air |
| Cheese string (grapple) | C / E near a blue node, Jump to fling |
| Hole slip (noclip) | Hold V / Q (meter refills on the ground) |
| Pause / Mute / Restart at checkpoint | ESC or P / M / R |

Gamepads work too (A jump, B/RB wind up, X winch, Y noclip, D-pad/stick move; hold the stick down to squish).

### Touch (phones and tablets)

On-screen controls appear automatically on touch devices, and the HUD shrinks to fit a phone screen.

- **Floating thumbstick** — press anywhere in the left half of the screen and the stick snaps to your thumb.
- **Action buttons** on the right: a large JUMP, plus WIND UP and SQUISH. Both are there from the first screen - the
  wheel can do both without any upgrade. Hold SQUISH on the ground to go flat; tap it in mid-air, once you have the
  weight for it, to crash dive. WINCH and PHASE appear once you have the parts for them.
- **Pause** sits in the top-left corner. SKIP in the corner ends the opening.
- Portrait mode shows a "turn sideways" nudge, but the game is fully playable either way if you dismiss it.

Add the page to your home screen for a fullscreen, browser-chrome-free run.

## Rolling

Stages are built for a wheel, and built to be wrecked. Ramps carry your speed uphill and fling you off the lip,
boost strips fire you down a lane, crates exist to be smashed at speed, levers flip when you roll into them, and the
furniture is there to be gone through rather than around. Nothing is hidden behind a tech hunt - the upgrades sit in
machines on the critical path, and rolling into one bolts the part on: spring legs, thruster, grip claws, hammer
fist, winch arm, phase core.

## Worlds

1. **The Cheese Cellar** — one authored room, and every stick of furniture in it is destructible: wine racks,
   barrels, shelves of cheese, bottles, a giant cheese press, cobwebs and spiders. Learn to roll, wind up a spin,
   smash a nine-crate wall, squish flat and slide under a wall that runs to the ceiling, break through stacked
   barrels at speed, flip a lever (or skip it entirely by crawling the duct over the gate), feed yourself into the
   first machine, and take the cellar door off its hinges.
2. **The Grater Line** — conveyors, graters, moving platforms. Unlock: wax skate.
3. **The Melting Vats** — molten cheese and shafts. Unlock: sticky crust.
4. **The Packaging Plant** — presses and cracked floors. Unlock: dead weight. **Boss: RAT KING** — the same animal
   as the rats you have been stomping all game, three times the size, hunched under a stolen crown that slips further
   down his head with every hit, in a torn cape, with scars, a bitten ear and four legs that scrabble when he charges
   (stomp him).
5. **The Ventilation Ducts** — fans and hook nodes. Unlock: cheese string.
6. **The Firewall** — lasers and sorting gear. Unlock: hole slip. **Boss: THE SORTER** (slip inside its scanner).
   Its scanning beam is not a wall any more: it crosses the arena with a hole in it, marked in green, either up at
   jump height or along the floor, and it crawls slowly enough that you can read which and get there.
7. **The Loading Dock** — everything at once, and the door out. **Final boss: THE CHEESEMONGER** (he takes the floor away while you climb).

Progress and installed parts save to `localStorage`.

## Look and feel

Everything is drawn at runtime. There are no image files in this repository, and the game uses **no emoji anywhere** -
every icon, portrait and glyph is hand-authored pixel art.

- **Pixel-art rendering.** The 3D world renders into a 360px-tall buffer and is upscaled with nearest-neighbour
  filtering - an exact 2x at 720p, 3x at 1080p, 4x at 1440p, so there are no half pixels and nothing shimmers. The
  upscale pass then crushes the frame to 14 steps per channel with a 4x4 ordered dither, evaluated on the low-res
  grid rather than the screen grid so the banding lands on pixel boundaries. The result is a lit 3D scene that reads
  as drawn rather than rendered. Every surface carries a procedural pixel texture generated on a 32px canvas: stone
  brick, riveted plate, corrugated cardboard, cracked magma, circuit board, ducting, cloud marble, cheese, belts.
- **Three depths per world.** A dithered sky, two parallax background layers of themed props, the play plane, and a
  foreground layer of pipes, girders and chains that sweeps past in front of the camera.
- **A menu that is a place.** The title screen is not a colour behind some
  buttons: it is a rendered shelf in the wine cellar, drawn through the same pixel pipeline as the game. You are
  sitting on it with a face on, and four other wheels are up there with you - the further from the lamp, the greener
  and further gone they are. Wine racks, bottles, a lamp on a chain that swings and flickers, dust going up through
  it, and a camera that drifts and never quite settles.
- **The cheese wipe.** Every change of scene - menu to world, world to kitchen map, map to world, death to retry,
  the cutscene to the first room - pours a sheet of molten cheese down over the screen, with runs of different
  lengths stretching ahead of the leading edge and holes in the sheet, holds while the scene swaps underneath, then
  drains away. Nothing is ever seen half-swapped, because the swap only happens at the moment the screen is solid
  cheese.
- **No words on impacts.** POW / CRUNCH / SMASH read as a comic panel pasted over the game rather than part of it.
  Every one of them is now something in the world instead: a ring that snaps outward from the point of impact, a
  shower of four-pointed stars that spin off it and tumble, and a gout of cheese blobs that stretch along their own
  velocity so they read as thrown rather than scattered. Landing hard rings the floor; a perfect launch, a smashed
  shelf and a cracked wheel all throw cheese.
- **Cloud balloons.** Every line of speech is a pixel-art cloud drawn per balloon, sized to the text, tracking a
  point in the 3D world, and never more than one on screen at a time. The lobes around the rim are deliberately
  uneven and the ink is deliberately uneven with them - a balloon whose every lobe is the same radius looks stamped
  out. The outline runs one pixel along the top and left and two along the bottom and right, the way a brush loads
  on the way down, with the odd pixel of it missing, because a line drawn by hand is never closed; outside it goes a
  pale halo, because a black line on a black cellar wall is not a line. The tail curls toward whoever is speaking
  and flips sides when the screen edge pushes the balloon past them, and a shout is a jagged burst instead.
- **Almost no words.** No title screen, no dialogue box, no signposts, no tutorial text. The HUD is a row of
  installed parts and a tally of what you have wrecked; the upgrade card is an icon, a name and a key.
- **A UI made of pixels, not of CSS.** Every frame, button, plank and chain link in the interface is drawn pixel by
  pixel on a small canvas in `js/frames.js` and handed to CSS as a 9-slice `border-image`, blown up with
  nearest-neighbour at an integer scale. Nothing is a rounded rectangle with a gradient on it. Panels are a leaf of
  parchment in a tooled leather edge with gold studs pinning the corners; the upgrade card and the HUD slots are
  ornate gold banding with a scroll in every corner over a dark wood field; buttons are struck brass; the touch
  controls are blued steel; meters sit in a dark slot cut into an iron-capped plank; the wreck tally hangs off a
  length of chain.
- **Nothing in here is square.** The four corners of a frame are not mirrors of each other: each edge wanders in and
  out by a pixel through the corner slices, each corner scroll sits a pixel out from the last and frays differently,
  studs are hammered in slightly crooked, and gold gets chipped off corners and edges. The bricks in the walls are
  laid in courses that shift, some short, some missing, corners knocked off, with hairline cracks wandering down
  across them; planks vary in width and carry knots and grain that drifts as it runs; crates and clutter are set
  down a degree or two off true. The one place none of it applies is the middle of a frame's edges, because that is
  the part CSS tiles and a repeating wobble is just a pattern.
- **Two bitmap faces.** Press Start 2P for anything short and loud - titles, keys, labels, impact words - and
  Pixelify Sans for anything you actually have to read. Both are real pixel fonts, so nothing is anti-aliased into
  mush at size, and neither carries a fat outline: a thick stroke fills in a bitmap face's counters, so the depth
  comes from hard offset shadows instead. The boss name shudders and prompts blink; all motion respects
  `prefers-reduced-motion`.
- **Two dots and a smile.** The eyes are just dots - no whites, no glint, nothing rattling around inside - so all
  they do is squint, widen, blink and drift the way you are travelling. The mouth never opens: it is a drawn line
  that bends, wobbles and stretches, and there is no hole in the cheese behind it. A grin spreads; a wince snaps on.
  Roll fast and the smile widens while the eyes squeeze into two happy dashes; wind up a spin and both narrow; take
  a hit and the line flips into a shaking grimace; go flat and the whole face stretches across the wheel. The opening
  cutscene plays the same face through its four beats.
- **Damage is bites out of the rim.** Every hit takes a chunk out of the edge of the wheel, down to a pale
  fresh-cut floor, at a fixed angle so the same amount of damage always looks the same. It never cuts a wedge to the
  middle: the face lives at the centre, and a solid core keeps it backed no matter how chewed the edge gets.
- **Destruction with weight.** A broken object throws big slabs and small shards from the same hit, sprayed away
  from where it was struck and carrying the speed of whatever hit it. Shards have less mass, so the same blow throws
  them further and the air stops them sooner. Each piece asks the level what is actually underneath it, so a heap
  lands on the ledge it was knocked off rather than on one imaginary plane - and if the thing it settled on is
  destroyed a moment later, it notices and falls. Pieces bounce with less spring each time, tumble down into a slide,
  creep to a stop and lie flat-side-down. Dust blooms out of the break and puffs again wherever a piece lands hard.
- **Cheese everywhere.** Drips ooze off ledges in the world, where they stretch, break and fall, and the wheel throws
  a trail of crumbs whenever it is rolling fast or spinning.
- **Lit like a room.** Key, fill and a cool rim light pick every silhouette off the background; cellar lamps throw
  visible cones of light; dust drifts up through them; a vignette and a faint scanline wash frame the screen.
- **Things that live here.** The rat has a snout, whiskers, flicking ears, a whipping three-part tail and four feet
  that step; the spider hangs on a thread on eight two-jointed legs; the mould spore is a spiked puffball with one
  enormous eye that follows you; the molten blob drips and gurns; the turret wears hazard stripes and its lens flares
  red before it fires.

## Settings

SETTINGS from the world picker or from the pause menu. Everything saves to `localStorage` with the rest of your
progress:

| | |
| --- | --- |
| SOUND / MUSIC | OFF / LOW / MID / FULL, on separate taps |
| SCREEN SHAKE | OFF / HALF / FULL |
| PIXEL SIZE | FINE (540) / CHUNKY (360) / BLOCKY (270) internal render height |
| COLOURS | FULL, or CRUSHED to 14 steps per channel with an ordered dither |
| SCREEN FLASH | OFF turns off every full-screen flash |
| ERASE SAVE | Asks twice, then puts you back to one wheel and no parts |

## Code layout

```
index.html      DOM overlay (HUD, dialog, menus) + script tags
css/style.css   UI styling
js/util.js      constants (all physics tuning lives in CZ.P), ability metadata, save helpers
js/frames.js    every UI frame, button and chain link, drawn pixel by pixel as a 9-slice sprite
js/sprites.js   hand-authored 16x16 pixel-art sprites: icons, portraits, glyphs (no emoji)
js/textures.js  procedural pixel textures for every 3D surface
js/audio.js     procedural WebAudio SFX + chiptune sequencer
js/input.js     keyboard/gamepad → actions with press/hold edges
js/levels.js    level data (a tiny DSL: floor/plat/ramp/boost/hazard/mover/glitch/cracked/hook/...)
js/effects.js   toon materials, outlines, particles, chunky debris, dust, screen shake
js/level.js     level runtime: meshes, animation, collision queries, parallax backgrounds
js/player.js    the cheese: movement controller + squash/stretch visuals
js/enemies.js   rat, spore, blob, turret, projectiles
js/bosses.js    Rat King, Anti-Cheat.exe, God of Games
js/ui.js        DOM helpers
js/cinematic.js the opening: a shelf, the mould, the fall, the door
js/map.js       the kitchen map you cross between stages
js/menuscene.js the wine cellar behind the main menu
js/wipe.js      the cheese wipe that covers every change of scene
js/comic.js     speech balloons, impact words, speed lines, halftone
js/touch.js     on-screen thumbstick + buttons for touch devices
js/main.js      game loop, camera, state machine, interactions, progress
```

Everything is plain classic scripts on a `CZ` namespace, so there is no build step. Physics runs at a fixed 120 Hz,
independent of the render rate.
