// Every frame, button and panel edge in this UI is drawn here, pixel by pixel,
// on a tiny canvas and handed to CSS as a 9-slice border-image. Nothing is a
// rounded rectangle with a gradient on it: at 1x these are 24-32px sprites, and
// the browser blows them up with nearest-neighbour, so the UI is made of the
// same size pixels as the game behind it.
CZ.Frame = (() => {
  // ── palettes ─────────────────────────────────────────────────────────
  const INK = '#150d08';
  const GOLD = { lit: '#ffeab0', hi: '#ffd23f', mid: '#d9931f', lo: '#96580f', ink: INK };
  const AMBER = { lit: '#ffe98a', hi: '#ffc32e', mid: '#e08a14', lo: '#9e5408', ink: INK };
  const STEEL = { lit: '#9fd8e8', hi: '#4e9fc4', mid: '#2f6f92', lo: '#1b4460', ink: INK };
  const OAK = { lit: '#7a4a22', hi: '#5c3618', mid: '#48290f', lo: '#2a180c', ink: INK };
  const PAGE = { lit: '#f2dfae', hi: '#dcc48c', mid: '#c2a56c', lo: '#8a6e42', ink: INK };

  // ── canvas plumbing ──────────────────────────────────────────────────
  const cache = new Map();
  function build(key, w, h, fn) {
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    fn(g, w, h);
    const url = `url("${c.toDataURL()}")`;
    cache.set(key, url);
    return url;
  }
  const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

  // Deterministic noise, so a frame looks the same every time it is built.
  const rng = seed => () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  // Ring index of a pixel inside a chamfered rectangle: 0 is the outermost
  // row, -1 means the pixel is outside the cut corner. Rings are what make a
  // border read as bevelled metal instead of as a coloured outline.
  //
  // `wob` pushes the boundary in and out by a pixel as it travels round. A
  // frame whose every edge is dead straight and whose four corners are exact
  // mirrors of each other is the thing that gives a generated interface away,
  // so the edges here breathe and no two corners match.
  function ring(x, y, w, h, cut, wob) {
    const l = x, t = y, r = w - 1 - x, b = h - 1 - y;
    let d = Math.min(l, t, r, b);
    d = Math.min(d, l + t - cut, r + t - cut, l + b - cut, r + b - cut);
    if (wob) d += wob(x, y, w, h);
    return d;
  }
  // Which edge is nearest: the top and left catch the light, the rest fall away.
  const lit = (x, y, w, h) => {
    const l = x, t = y, r = w - 1 - x, b = h - 1 - y;
    const m = Math.min(l, t, r, b);
    return m === t || m === l;
  };
  // A wander that lives only in the corner slices. The middle of each edge is
  // the part CSS tiles, so it has to stay dead straight or the repeat shows a
  // seam; the corners are drawn once each, so that is where the hand goes in.
  function wobble(seed, amp, slice) {
    const r = rng(seed);
    const n = [];
    for (let i = 0; i < 48; i++) n.push(r());
    const wave = t => {
      const f = CZ.clamp(t, 0, 1) * (n.length - 1), i = Math.floor(f), k = f - i;
      const a = n[i], b = n[Math.min(n.length - 1, i + 1)];
      return (a + (b - a) * k) * 2 - 1;
    };
    // one different phase and bias per corner, so no two corners match
    const ph = [r() * 40, r() * 40, r() * 40, r() * 40];
    const bias = [r(), r(), r(), r()];
    return (x, y, w, h) => {
      const l = x, t = y, rr = w - 1 - x, b = h - 1 - y;
      const dx = Math.min(l, rr), dy = Math.min(t, b);      // distance to nearest corner
      const along = Math.max(dx, dy);                        // ...along the edge
      if (along >= slice) return 0;
      const taper = 1 - along / slice;
      const q = (rr < l ? 1 : 0) + (b < t ? 2 : 0);
      return Math.round((wave(ph[q] * 0.02 + along / slice) * amp + (bias[q] - 0.5) * amp) * taper);
    };
  }
  // Knock a few chips out of a finished frame. Only ever inside a corner slice:
  // a chip in the tiling middle repeats all the way along the edge, and a
  // regular row of identical holes is worse than no holes at all.
  function wear(g, w, h, seed, slice, n = 6) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const corner = (r() * 4) | 0;
      const along = 1 + ((r() * (slice - 3)) | 0);
      const deep = 1 + ((r() * 2) | 0);
      const len = 1 + ((r() * 2) | 0);
      const horiz = r() < 0.5;
      let x, y;
      if (horiz) { x = (corner & 1) ? w - along - len : along; y = (corner & 2) ? h - deep : 0; }
      else { x = (corner & 1) ? w - deep : 0; y = (corner & 2) ? h - along - len : along; }
      g.clearRect(x, y, horiz ? len : deep, horiz ? deep : len);
    }
  }

  // ── wood grain, for anything with a plank in it ──────────────────────
  function grain(g, x0, y0, w, h, pal, seed = 3, dense = 0.3) {
    const r = rng(seed);
    px(g, x0, y0, pal.mid, w, h);
    for (let x = x0; x < x0 + w; x++) {
      const t = r();
      if (t < dense * 0.5) px(g, x, y0, pal.lo, 1, h);
      else if (t < dense) px(g, x, y0, pal.hi, 1, h);
    }
    for (let i = 0; i < w * h * 0.05; i++) px(g, x0 + ((r() * w) | 0), y0 + ((r() * h) | 0), pal.lo);
    px(g, x0, y0, 'rgba(255,255,255,.10)', w, 1);
    px(g, x0, y0 + h - 1, 'rgba(0,0,0,.28)', w, 1);
  }

  // ── the corner flourish, mirrored into all four corners ──────────────
  // A gold bracket that runs a little way along both edges and curls back into
  // the field, with a stud at the elbow. Written as art, not as geometry,
  // because that is the only way this kind of thing ever looks right.
  const SCROLL = [
    'KKKKKKKKKK',
    'KLLHHHHMDK',
    'KLHMMMMD.K',
    'KHMD...DK.',
    'KHM..K.K..',
    'KHM.K.K...',
    'KMD.K.K...',
    'KMD..K....',
    'KD.K......',
    'KK.K......',
  ];
  function flourish(g, w, h, pal, inset = 0, seed = 17) {
    const map = { K: pal.ink, L: pal.lit, H: pal.hi, M: pal.mid, D: pal.lo };
    const r = rng(seed);
    for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      // Nobody fits four identical brackets by hand. Each one sits a pixel out
      // from the last, and each one drops a different pixel off its tail.
      const ox = (r() < 0.5 ? 0 : 1), oy = (r() < 0.5 ? 0 : 1);
      const skip = 0.06 + r() * 0.10;
      for (let y = 0; y < SCROLL.length; y++) {
        for (let x = 0; x < SCROLL[y].length; x++) {
          const ch = SCROLL[y][x];
          if (ch === '.') continue;
          if (x + y > 8 && r() < skip) continue;       // the tail frays
          const px0 = fx ? w - 1 - inset - ox - x : inset + ox + x;
          const py0 = fy ? h - 1 - inset - oy - y : inset + oy + y;
          px(g, px0, py0, map[ch]);
        }
      }
    }
  }

  // ── the frames themselves ────────────────────────────────────────────

  // An ornate slot: chamfered gold banding over a dark wood field, with a
  // scroll in every corner. This is the game's panel, its HUD chip and its
  // inventory square, at three different sizes.
  function ornate(opts = {}) {
    const S = 44, B = 6, pal = GOLD, wood = opts.wood || OAK;
    const SLICE = 19;
    return build(`ornate|${opts.wood ? 'w' : ''}`, S, S, g => {
      const wob = wobble(4271, 1, SLICE);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const d = ring(x, y, S, S, 5, wob);
        if (d < 0) continue;
        const L = lit(x, y, S, S);
        let c;
        if (d === 0) c = pal.ink;
        else if (d === 1) c = L ? pal.lit : pal.lo;
        else if (d === 2) c = L ? pal.hi : pal.mid;
        else if (d === 3) c = L ? pal.hi : pal.lo;
        else if (d === 4) c = L ? pal.mid : pal.lo;
        else if (d === 5) c = pal.lo;
        else if (d === B) c = pal.ink;
        else continue;
        px(g, x, y, c);
      }
      // the field: dark wood, lifted a little in the middle like the reference
      const F = B + 1;
      grain(g, F, F, S - F * 2, S - F * 2, wood, 11, 0.12);
      for (let y = F; y < S - F; y++) for (let x = F; x < S - F; x++) {
        const t = 1 - Math.hypot(x - S / 2, y - S / 2) / (S * 0.5);
        if (t > 0) px(g, x, y, `rgba(255,205,130,${(t * 0.16).toFixed(3)})`);
      }
      px(g, F, F, 'rgba(0,0,0,.45)', S - F * 2, 1);
      px(g, F, F, 'rgba(0,0,0,.32)', 1, S - F * 2);
      // The scrolls sit ON the wood, clear of the banding, with a gap of dark
      // field between: touching the band they just read as a thicker band.
      flourish(g, S, S, pal, B + 2, 9911);
      wear(g, S, S, 5501, SLICE, 7);
    });
  }

  // The same frame shrunk to slot size: banding and a corner stud, no scroll,
  // because a ten-pixel ornament on a sixty-pixel square is just noise.
  function slot() {
    const S = 24, B = 3;
    return build('slot', S, S, g => {
      const wob = wobble(8123, 1, 9);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const d = ring(x, y, S, S, 3, wob);
        if (d < 0) continue;
        const L = lit(x, y, S, S);
        let c;
        if (d === 0) c = GOLD.ink;
        else if (d === 1) c = L ? GOLD.lit : GOLD.lo;
        else if (d === 2) c = L ? GOLD.hi : GOLD.mid;
        else if (d === B) c = GOLD.ink;
        else continue;
        px(g, x, y, c);
      }
      grain(g, B + 1, B + 1, S - (B + 1) * 2, S - (B + 1) * 2, OAK, 7, 0.12);
      px(g, B + 1, B + 1, 'rgba(0,0,0,.45)', S - (B + 1) * 2, 1);
      const rr = rng(613);
      for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const bx = (fx ? S - 7 : 4) + (rr() < 0.5 ? 0 : 1), by = (fy ? S - 7 : 4) + (rr() < 0.5 ? 0 : 1);
        px(g, bx, by, GOLD.ink, 3, 3);
        px(g, bx, by, GOLD.hi, 2, 2);
        px(g, bx + 1, by + 1, GOLD.lo, 1, 1);
      }
      wear(g, S, S, 2207, 9, 4);
    });
  }

  // A raised button. Amber for the things you press, steel for the things you
  // toggle; both are the same bevel with a different metal in it.
  function button(name, pal, cut = 2) {
    const S = 24;
    return build(`btn|${name}`, S, S, g => {
      const wob = wobble(1000 + name.length * 977, 1, 8);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const d = ring(x, y, S, S, cut, wob);
        if (d < 0) continue;
        const L = lit(x, y, S, S);
        let c;
        if (d === 0) c = pal.ink;
        else if (d === 1) c = L ? pal.lit : pal.lo;
        else if (d === 2) c = L ? pal.hi : pal.mid;
        else c = pal.mid;
        px(g, x, y, c);
      }
      px(g, 4, 3, pal.hi, S - 8, 1);
      px(g, 3, 4, pal.hi, S - 6, 2);
      px(g, 3, S - 6, pal.lo, S - 6, 2);
      px(g, 4, S - 4, pal.lo, S - 8, 1);
      // scuffs across the face, from being pressed a few thousand times
      const r = rng(2000 + name.length * 31);
      for (let i = 0; i < 5; i++) {
        const x = 4 + ((r() * (S - 8)) | 0), y = 5 + ((r() * (S - 10)) | 0);
        px(g, x, y, r() < 0.5 ? pal.lit : pal.lo, 1 + ((r() * 2) | 0), 1);
      }
      wear(g, S, S, 3000 + name.length * 53, 8, 4);
    });
  }

  // The page: parchment inside a leather edge, with a gold stud at each corner.
  function page() {
    const S = 40, L0 = 7;      // L0: where the leather ends and paper begins
    return build('page', S, S, g => {
      const hide = { lit: '#8a5a2b', hi: '#6b4220', mid: '#523113', lo: '#311c0a', ink: INK };
      const wob = wobble(3319, 1, 13);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const d = ring(x, y, S, S, 4, wob);
        if (d < 0) continue;
        const L = lit(x, y, S, S);
        let c;
        if (d === 0) c = INK;
        else if (d === 1) c = L ? hide.lit : hide.lo;
        else if (d <= 3) c = L ? hide.hi : hide.mid;
        else if (d === 4) c = hide.lo;
        else if (d === 5) c = L ? hide.lit : hide.hi;   // a tooled keyline
        else if (d === 6) c = hide.lo;
        else if (d === L0) c = INK;
        else continue;
        px(g, x, y, c);
      }
      const r = rng(29);
      const P0 = L0 + 1, PW = S - P0 * 2;
      px(g, P0, P0, PAGE.lit, PW, PW);
      for (let i = 0; i < PW * PW * 0.09; i++) px(g, P0 + ((r() * PW) | 0), P0 + ((r() * PW) | 0), r() < 0.6 ? PAGE.hi : PAGE.mid);
      px(g, P0, P0, 'rgba(120,90,50,.32)', PW, 1);
      px(g, P0, P0, 'rgba(120,90,50,.24)', 1, PW);
      px(g, P0, S - P0 - 1, 'rgba(255,255,255,.35)', PW, 1);
      // A foxing stain and a crease, because a page that has been opened has
      // been opened somewhere.
      for (let i = 0; i < 3; i++) {
        const sx = P0 + 2 + ((r() * (PW - 6)) | 0), sy = P0 + 2 + ((r() * (PW - 6)) | 0);
        const sw = 2 + ((r() * 4) | 0), sh = 1 + ((r() * 3) | 0);
        g.fillStyle = 'rgba(150,110,60,.16)'; g.fillRect(sx, sy, sw, sh);
      }
      // corner studs, pinning the leaf to the board - hammered in by eye
      const rs = rng(881);
      for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const bx = (fx ? S - 8 : 3) + (rs() < 0.5 ? 0 : 1), by = (fy ? S - 8 : 3) + (rs() < 0.6 ? 0 : 1);
        px(g, bx, by, INK, 5, 5);
        px(g, bx + 1, by + 1, GOLD.mid, 3, 3);
        px(g, bx + 1, by + 1, GOLD.lit, 2, 1);
        px(g, bx + 1, by + 1, GOLD.lit, 1, 2);
        px(g, bx + 3, by + 3, GOLD.lo, 1, 1);
        if (rs() < 0.5) px(g, bx + 2, by, hide.lo, 1, 1);    // one seated crooked
      }
      wear(g, S, S, 7717, 13, 6);
    });
  }

  // A hanging plank with iron straps at both ends: the level title, the toast,
  // and the trough behind every meter.
  function plank(opts = {}) {
    const W = 56, H = 18, cap = 13, dark = !!opts.dark;
    return build(`plank|${dark ? 'd' : 'l'}`, W, H, g => {
      const wood = dark ? { lit: '#5c3618', hi: '#4a2a12', mid: '#33200e', lo: '#1f1208', ink: INK } : OAK;
      px(g, 0, 0, INK, W, H);
      grain(g, 1, 1, W - 2, H - 2, wood, dark ? 17 : 5);
      px(g, 1, 1, wood.lit, W - 2, 1);
      px(g, 1, H - 2, wood.lo, W - 2, 1);
      // iron straps
      for (const sx of [0, W - cap]) {
        px(g, sx, 0, INK, cap, H);
        for (let y = 1; y < H - 1; y++) for (let x = sx + 1; x < sx + cap - 1; x++) {
          const t = (y - 1) / (H - 3);
          px(g, x, y, t < 0.22 ? STEEL.lit : t < 0.62 ? STEEL.hi : t < 0.85 ? STEEL.mid : STEEL.lo);
        }
        const bx = sx + (sx ? cap - 5 : 2);
        for (const by of [3, H - 7]) {
          px(g, bx, by, INK, 4, 4);
          px(g, bx + 1, by + 1, STEEL.lit, 2, 2);
          px(g, bx + 2, by + 2, STEEL.lo, 1, 1);
        }
      }
    });
  }

  // The inside of a meter: a dark slot you fill with something bright.
  function trough() {
    const S = 12;
    return build('trough', S, S, g => {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const d = ring(x, y, S, S, 1);
        if (d < 0) continue;
        const L = lit(x, y, S, S);
        px(g, x, y, d === 0 ? INK : d === 1 ? (L ? '#2a1a10' : '#6b4a28') : d === 2 ? '#150d08' : '#0d0806');
      }
    });
  }

  // One link of hanging chain, tiled down the side of things.
  function chain() {
    const W = 12, H = 16;
    return build('chain', W, H, g => {
      const ART = [
        '..KKKK..', '.KLHHMK.', 'KLH..HMK', 'KH.KK.MK',
        'KH.KK.MK', 'KH.KK.MK', 'KMD..DMK', '.KMDDMK.',
        '..KKKK..', '.KLHHMK.', 'KLH..HMK', 'KH.KK.MK',
        'KH.KK.MK', 'KH.KK.MK', 'KMD..DMK', '.KMDDMK.',
      ];
      const map = { K: INK, L: STEEL.lit, H: STEEL.hi, M: STEEL.mid, D: STEEL.lo };
      for (let y = 0; y < ART.length; y++) for (let x = 0; x < ART[y].length; x++) {
        const ch = ART[y][x];
        if (ch !== '.') px(g, x + 2, y, map[ch]);
      }
    });
  }

  // Hand everything to CSS as custom properties on :root.
  function install() {
    const s = document.documentElement.style;
    s.setProperty('--f-ornate', ornate());
    s.setProperty('--f-slot', slot());
    s.setProperty('--f-page', page());
    s.setProperty('--f-btn', button('amber', AMBER));
    s.setProperty('--f-btn-hot', button('gold', GOLD));
    s.setProperty('--f-btn-steel', button('steel', STEEL));
    s.setProperty('--f-plank', plank());
    s.setProperty('--f-plank-dark', plank({ dark: true }));
    s.setProperty('--f-trough', trough());
    s.setProperty('--f-chain', chain());
  }

  return { install, ornate, slot, page, button, plank, trough, chain, GOLD, AMBER, STEEL, OAK, PAGE };
})();
