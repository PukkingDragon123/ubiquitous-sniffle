// Procedural pixel-art textures for every 3D surface. Drawn on 32px canvases with
// NearestFilter so they stay crisp and blocky when the scene is upscaled.
CZ.Tex = (() => {
  const cache = new Map();
  // Small deterministic RNG so a texture looks the same every run.
  const rng = seed => () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  function draw(size, fn) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    fn(g, size);
    return c;
  }
  function tex(canvas, repeat) {
    const t = new THREE.CanvasTexture(canvas);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    return t;
  }
  // Scatter `n` single pixels of `color` for grain.
  const speck = (g, S, color, n, r) => { g.fillStyle = color; for (let i = 0; i < n; i++) g.fillRect((r() * S) | 0, (r() * S) | 0, 1, 1); };

  const PATTERNS = {
    // stacked stone blocks with mortar lines
    // Stacked stone. Nobody laid these to the millimetre: courses shift, the
    // odd brick is short, corners are knocked off and a few of them have given
    // up entirely and left a hole in the wall.
    brick: (g, S, c) => {
      const r = rng(7);
      g.fillStyle = c.mortar; g.fillRect(0, 0, S, S);
      const bh = 8;
      for (let y = 0; y < S; y += bh) {
        const off = ((y / bh) % 2 ? 8 : 0) + ((r() * 3) | 0) - 1;
        for (let x = -16; x < S; ) {
          const bw = r() < 0.22 ? 10 : 16;          // the odd short brick
          const gone = r() < 0.06;                  // ...and the odd missing one
          if (!gone) {
            const top = y + 1 + (r() < 0.3 ? 1 : 0);
            const h = y + bh - 1 - top;
            g.fillStyle = r() < 0.28 ? c.alt : c.base;
            g.fillRect(x + off + 1, top, bw - 2, h);
            g.fillStyle = c.light; g.fillRect(x + off + 1, top, bw - 2 - ((r() * 4) | 0), 1);
            g.fillStyle = c.dark; g.fillRect(x + off + 1 + ((r() * 3) | 0), y + bh - 2, bw - 3, 1);
            // a chipped corner
            if (r() < 0.3) { g.fillStyle = c.mortar; g.fillRect(x + off + 1, top, 1 + ((r() * 2) | 0), 1); }
            if (r() < 0.22) { g.fillStyle = c.dark; g.fillRect(x + off + bw - 3, y + bh - 3, 2, 1); }
          }
          x += bw;
        }
      }
      // hairline cracks that wander down across the courses
      for (let i = 0; i < 2; i++) {
        let x = (r() * S) | 0, y = (r() * S) | 0;
        g.fillStyle = c.dark;
        for (let k = 0; k < 5 + ((r() * 7) | 0); k++) { g.fillRect(x, y, 1, 1); y++; x += ((r() * 3) | 0) - 1; }
      }
      speck(g, S, c.dark, 26, r); speck(g, S, c.light, 14, r);
    },
    // riveted metal plating
    plate: (g, S, c) => {
      const r = rng(19);
      g.fillStyle = c.base; g.fillRect(0, 0, S, S);
      g.fillStyle = c.dark; g.fillRect(0, 0, S, 2); g.fillRect(0, 16, S, 1); g.fillRect(0, 0, 2, S); g.fillRect(16, 0, 1, S);
      g.fillStyle = c.light; g.fillRect(2, 2, S - 3, 1); g.fillRect(2, 2, 1, S - 3);
      g.fillStyle = c.dark;
      for (const [x, y] of [[5, 5], [12, 5], [5, 12], [12, 12], [21, 21], [28, 21], [21, 28], [28, 28], [21, 5], [28, 12], [5, 21], [12, 28]]) g.fillRect(x, y, 2, 2);
      speck(g, S, c.light, 10, r); speck(g, S, c.dark, 16, r);
    },
    // corrugated cardboard: the UI's signature material
    card: (g, S, c) => {
      const r = rng(31);
      g.fillStyle = c.base; g.fillRect(0, 0, S, S);
      for (let x = 0; x < S; x += 4) { g.fillStyle = c.dark; g.fillRect(x, 0, 1, S); g.fillStyle = c.light; g.fillRect(x + 1, 0, 1, S); }
      g.fillStyle = c.alt; g.fillRect(0, 0, S, 2); g.fillRect(0, 15, S, 2);
      speck(g, S, c.dark, 40, r); speck(g, S, c.light, 22, r);
    },
    // cracked volcanic rock with glowing seams
    rock: (g, S, c) => {
      const r = rng(53);
      g.fillStyle = c.base; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? c.dark : c.alt; const x = (r() * S) | 0, y = (r() * S) | 0, w = 2 + ((r() * 4) | 0); g.fillRect(x, y, w, 2); }
      g.fillStyle = c.light;
      let x = 4, y = 0; while (y < S) { g.fillRect(x, y, 1, 2); x += (r() * 3 | 0) - 1; y += 2; }
      x = 22; y = 0; while (y < S) { g.fillRect(x, y, 1, 2); x += (r() * 3 | 0) - 1; y += 2; }
      speck(g, S, c.dark, 30, r);
    },
    // circuit board traces
    circuit: (g, S, c) => {
      const r = rng(97);
      g.fillStyle = c.base; g.fillRect(0, 0, S, S);
      g.fillStyle = c.dark; for (let i = 0; i < S; i += 8) { g.fillRect(0, i, S, 1); g.fillRect(i, 0, 1, S); }
      g.fillStyle = c.light;
      for (let i = 0; i < 7; i++) {
        let px = (r() * S) | 0, py = (r() * S) | 0;
        for (let j = 0; j < 5; j++) { const len = 3 + ((r() * 7) | 0); if (r() < 0.5) { g.fillRect(px, py, len, 1); px += len; } else { g.fillRect(px, py, 1, len); py += len; } }
        g.fillStyle = c.alt; g.fillRect(px - 1, py - 1, 2, 2); g.fillStyle = c.light;
      }
      speck(g, S, c.alt, 12, r);
    },
    // sheet metal ducting with seams
    duct: (g, S, c) => {
      const r = rng(131);
      g.fillStyle = c.base; g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 6) { g.fillStyle = c.dark; g.fillRect(0, y, S, 1); g.fillStyle = c.light; g.fillRect(0, y + 1, S, 1); }
      g.fillStyle = c.alt; for (let y = 3; y < S; y += 6) for (let x = 2; x < S; x += 10) g.fillRect(x, y, 2, 1);
      speck(g, S, c.dark, 14, r);
    },
    // soft brick of cloud/marble for the pantry
    cloud: (g, S, c) => {
      const r = rng(173);
      g.fillStyle = c.base; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 26; i++) { g.fillStyle = r() < 0.6 ? c.light : c.alt; const x = (r() * S) | 0, y = (r() * S) | 0, w = 3 + ((r() * 6) | 0); g.fillRect(x, y, w, 2 + ((r() * 2) | 0)); }
      g.fillStyle = c.dark; g.fillRect(0, S - 3, S, 1);
      g.fillStyle = c.light; g.fillRect(0, 1, S, 1);
      speck(g, S, c.light, 20, r);
    },
    // the cheese itself: rind band plus holes
    cheese: (g, S) => {
      const r = rng(211);
      g.fillStyle = '#ffcc33'; g.fillRect(0, 0, S, S);
      g.fillStyle = '#ffe066'; for (let i = 0; i < 22; i++) g.fillRect((r() * S) | 0, (r() * S) | 0, 2, 1);
      g.fillStyle = '#c9781a';
      for (const [x, y, s] of [[5, 6, 3], [20, 4, 2], [11, 17, 4], [25, 20, 3], [3, 25, 2], [17, 27, 2]]) { g.fillRect(x, y, s, s); g.fillStyle = '#a85a12'; g.fillRect(x, y, s, 1); g.fillStyle = '#c9781a'; }
      speck(g, S, '#e0a82a', 16, r);
    },
    // conveyor belt with chevrons
    belt: (g, S) => {
      g.fillStyle = '#2a2a2e'; g.fillRect(0, 0, S, S);
      g.fillStyle = '#3a3a42'; for (let y = 0; y < S; y += 4) g.fillRect(0, y, S, 1);
      g.fillStyle = '#ffcc33';
      for (let i = 0; i < 2; i++) { const x = i * 16; for (let k = 0; k < 8; k++) { g.fillRect(x + k, 6 + k, 5, 1); g.fillRect(x + k, 25 - k, 5, 1); } }
    },
    // fractured tile that a Crash Dive shatters
    crack: (g, S) => {
      const r = rng(233);
      g.fillStyle = '#7a5f3a'; g.fillRect(0, 0, S, S);
      g.fillStyle = '#5f4828'; for (let i = 0; i < 30; i++) g.fillRect((r() * S) | 0, (r() * S) | 0, 2, 2);
      g.fillStyle = '#241608';
      for (let i = 0; i < 3; i++) { let x = 4 + i * 11, y = 0; while (y < S) { g.fillRect(x, y, 2, 2); x += (r() * 5 | 0) - 2; y += 2; } }
      g.fillStyle = '#241608'; let x = 0, y = 14; while (x < S) { g.fillRect(x, y, 2, 2); y += (r() * 5 | 0) - 2; x += 2; }
      g.fillStyle = '#8d7048'; speck(g, S, '#8d7048', 18, r);
    },
    // molten cheese surface
    goo: (g, S) => {
      const r = rng(281);
      g.fillStyle = '#ff8a1f'; g.fillRect(0, 0, S, S);
      g.fillStyle = '#ffcc33'; for (let i = 0; i < 30; i++) g.fillRect((r() * S) | 0, (r() * S) | 0, 3, 2);
      g.fillStyle = '#ffe066'; for (let i = 0; i < 14; i++) g.fillRect((r() * S) | 0, (r() * S) | 0, 2, 1);
      g.fillStyle = '#c94f10'; for (let i = 0; i < 16; i++) g.fillRect((r() * S) | 0, (r() * S) | 0, 2, 1);
    },
    // mech armour: panel seams, rivets, vents, warning stripes, weathering
    mech: (g, S, c) => {
      const r = rng(419);
      g.fillStyle = c.base; g.fillRect(0, 0, S, S);
      // one clean panel inset with a shaded lip
      g.fillStyle = c.alt; g.fillRect(2, 2, S - 4, S - 4);
      g.fillStyle = c.light; g.fillRect(2, 2, S - 4, 1);
      g.fillStyle = c.dark; g.fillRect(2, S - 3, S - 4, 1); g.strokeStyle = c.dark; g.lineWidth = 1;
      g.strokeRect(2.5, 2.5, S - 5, S - 5);
      // a seam across the middle
      g.fillStyle = c.dark; g.fillRect(2, 18, S - 4, 1);
      g.fillStyle = c.light; g.fillRect(2, 19, S - 4, 1);
      // corner rivets
      g.fillStyle = c.dark;
      for (const [x, y] of [[5, 5], [S - 6, 5], [5, S - 6], [S - 6, S - 6]]) g.fillRect(x, y, 1, 1);
      // three vent slits
      for (let i = 0; i < 3; i++) { g.fillStyle = c.dark; g.fillRect(8, 23 + i * 2, 16, 1); }
      // light weathering only
      speck(g, S, c.light, 7, r); speck(g, S, c.dark, 9, r);
    },
    // grass: blades and dirt flecks for the battlefield ground
    grass: (g, S, c) => {
      const r = rng(523);
      g.fillStyle = c.base; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 90; i++) {
        const x = (r() * S) | 0, y = (r() * S) | 0;
        g.fillStyle = r() < 0.45 ? c.light : r() < 0.8 ? c.alt : c.dark;
        g.fillRect(x, y, 1, 1 + ((r() * 3) | 0));
      }
      g.fillStyle = c.dark; for (let i = 0; i < 12; i++) g.fillRect((r() * S) | 0, (r() * S) | 0, 2, 1);
    },
    // wooden barrel / crate staves
    // Planks of uneven width, with grain that wanders and a knot or two.
    wood: (g, S, c) => {
      const r = rng(311);
      g.fillStyle = c.base; g.fillRect(0, 0, S, S);
      for (let x = 0; x < S; ) {
        const w = 6 + ((r() * 5) | 0);
        g.fillStyle = c.dark; g.fillRect(x, 0, 1, S);
        g.fillStyle = c.light; g.fillRect(x + 1, 0, 1, S);
        // the grain inside this plank, drifting as it runs
        let gx = x + 2 + ((r() * (w - 3)) | 0);
        g.fillStyle = c.alt;
        for (let y = 0; y < S; y++) { g.fillRect(gx, y, 1, 1); if (r() < 0.18) gx += r() < 0.5 ? 1 : -1; }
        // a knot
        if (r() < 0.45) {
          const kx = x + 2 + ((r() * Math.max(1, w - 4)) | 0), ky = (r() * S) | 0;
          g.fillStyle = c.dark; g.fillRect(kx, ky, 3, 2); g.fillRect(kx + 1, ky - 1, 1, 4);
          g.fillStyle = c.alt; g.fillRect(kx + 1, ky, 1, 1);
        }
        x += w;
      }
      g.fillStyle = c.alt; for (let i = 0; i < 14; i++) g.fillRect((r() * S) | 0, (r() * S) | 0, 2 + ((r() * 4) | 0), 1);
      speck(g, S, c.dark, 20, r);
    },
  };

  const PAL = {
    stone: { base: '#8a5a2b', alt: '#7a4d24', dark: '#4a2c12', light: '#a87040', mortar: '#3a2210' },
    // The cellar's own stone: cool and purple, so the warm wood, the orange
    // rind and the yellow cheese all read against it instead of into it.
    cellar: { base: '#5c4663', alt: '#4a3752', dark: '#2a1d31', light: '#82688c', mortar: '#211729' },
    steel: { base: '#6d7f95', alt: '#5b6c80', dark: '#3b4855', light: '#93a6ba' },
    cardboard: { base: '#b8865a', alt: '#a5754b', dark: '#7d5230', light: '#d3a274' },
    magma: { base: '#4a3a3a', alt: '#5a3028', dark: '#2a1a1a', light: '#ff7a1f' },
    data: { base: '#241f4d', alt: '#39ff88', dark: '#151130', light: '#3ba36b' },
    vent: { base: '#8fa8c0', alt: '#6e88a2', dark: '#4d607a', light: '#b6cbdd' },
    marble: { base: '#efeaff', alt: '#dcd4f5', dark: '#b9aee0', light: '#ffffff' },
    timber: { base: '#a5682e', alt: '#bd7d3a', dark: '#6a3f18', light: '#d29a52' },
    mechBlue: { base: '#3f74c8', alt: '#345fa4', dark: '#1b3568', light: '#8fc0f5' },
    mechRed: { base: '#c8384a', alt: '#a32b3c', dark: '#651320', light: '#ff9aa6' },
    mechGrey: { base: '#8d95a3', alt: '#767e8c', dark: '#41474f', light: '#c8d0dc' },
    meadow: { base: '#5d9a3a', alt: '#4b8230', dark: '#2f5a1f', light: '#8cc65b' },
  };

  // get('brick', 'stone') → cached THREE texture.
  function get(pattern, palette, size = 32) {
    const key = `${pattern}|${palette}|${size}`;
    if (cache.has(key)) return cache.get(key);
    const c = draw(size, (g, S) => PATTERNS[pattern](g, S, PAL[palette] || PAL.stone));
    const t = tex(c);
    cache.set(key, t);
    return t;
  }
  // A per-mesh clone so each block can tile the texture to its own size.
  // Patterns that cover whole walls get a bigger canvas, so the repeat has a
  // longer period before the eye catches it. The world scale is unchanged: the
  // unit grows with the canvas, so a brick is still a brick.
  const TILE = { brick: 64, wood: 64 };
  function tiled(pattern, palette, w, h, unit = 2) {
    const size = TILE[pattern] || 32;
    const u = unit * (size / 32);
    const t = get(pattern, palette, size).clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, Math.round(w / u)), Math.max(1, Math.round(h / u)));
    return t;
  }
  // Draw a sprite from CZ.Spr onto a transparent texture (used for in-world signs).
  function sprite(name, scale = 4) {
    const key = `spr|${name}|${scale}`;
    if (cache.has(key)) return cache.get(key);
    const t = new THREE.CanvasTexture(CZ.Spr.canvas(name, scale));
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    cache.set(key, t);
    return t;
  }
  // Arbitrary pixel canvas → texture (for one-off art like the sign plate).
  function custom(key, size, fn, repeat) {
    if (cache.has(key)) return cache.get(key);
    const t = tex(draw(size, fn), repeat);
    cache.set(key, t);
    return t;
  }
  return { get, tiled, sprite, custom, draw, tex, PAL, PATTERNS };
})();
