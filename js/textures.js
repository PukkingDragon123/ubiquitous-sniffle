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
    brick: (g, S, c) => {
      const r = rng(7);
      g.fillStyle = c.mortar; g.fillRect(0, 0, S, S);
      const bh = 8, bw = 16;
      for (let y = 0; y < S; y += bh) {
        const off = (y / bh) % 2 ? bw / 2 : 0;
        for (let x = -bw; x < S; x += bw) {
          g.fillStyle = r() < 0.28 ? c.alt : c.base;
          g.fillRect(x + off + 1, y + 1, bw - 2, bh - 2);
          g.fillStyle = c.light; g.fillRect(x + off + 1, y + 1, bw - 2, 1);
          g.fillStyle = c.dark; g.fillRect(x + off + 1, y + bh - 2, bw - 2, 1);
        }
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
    // wooden barrel / crate staves
    wood: (g, S, c) => {
      const r = rng(311);
      g.fillStyle = c.base; g.fillRect(0, 0, S, S);
      for (let x = 0; x < S; x += 8) { g.fillStyle = c.dark; g.fillRect(x, 0, 1, S); g.fillStyle = c.light; g.fillRect(x + 1, 0, 1, S); }
      g.fillStyle = c.alt; for (let i = 0; i < 18; i++) g.fillRect((r() * S) | 0, (r() * S) | 0, 4, 1);
      speck(g, S, c.dark, 20, r);
    },
  };

  const PAL = {
    stone: { base: '#8a5a2b', alt: '#7a4d24', dark: '#4a2c12', light: '#a87040', mortar: '#3a2210' },
    steel: { base: '#6d7f95', alt: '#5b6c80', dark: '#3b4855', light: '#93a6ba' },
    cardboard: { base: '#b8865a', alt: '#a5754b', dark: '#7d5230', light: '#d3a274' },
    magma: { base: '#4a3a3a', alt: '#5a3028', dark: '#2a1a1a', light: '#ff7a1f' },
    data: { base: '#241f4d', alt: '#39ff88', dark: '#151130', light: '#3ba36b' },
    vent: { base: '#8fa8c0', alt: '#6e88a2', dark: '#4d607a', light: '#b6cbdd' },
    marble: { base: '#efeaff', alt: '#dcd4f5', dark: '#b9aee0', light: '#ffffff' },
    timber: { base: '#7a4a22', alt: '#8f5a2c', dark: '#4a2a10', light: '#9a6636' },
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
  function tiled(pattern, palette, w, h, unit = 2) {
    const t = get(pattern, palette).clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, Math.round(w / unit)), Math.max(1, Math.round(h / unit)));
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
