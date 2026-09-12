// The cheese wipe: the screen is covered by molten cheese flooding down from
// the top, complete with drips that stretch ahead of the sheet and wobble as
// they go. Every change of scene in this game goes through one.
CZ.Wipe = (() => {
  const W = 160, H = 90;                  // logical pixels; the CSS blows it up
  let el = null, canvas = null, g = null, raf = 0, t = 0;
  let phase = 'idle', onCover = null, onDone = null, drips = [], holes = [];
  const DOWN = 0.34, HOLD = 0.09, UP = 0.38;   // seconds per beat

  function init() {
    el = document.getElementById('wipe');
    canvas = document.getElementById('wipe-canvas');
    canvas.width = W; canvas.height = H;
    g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
  }
  // A fresh set of drips, so no two wipes pour the same way.
  function seed() {
    drips = []; holes = [];
    // Walk across the screen leaving runs at uneven intervals. Evenly spaced
    // drips of equal width read as a comb, not as something pouring.
    for (let x = -4; x < W + 4; ) {
      const w = 2 + ((Math.random() * 6) | 0);
      drips.push({ x: Math.round(x), w,
        lead: CZ.rand(2, 10) + (Math.random() < 0.22 ? CZ.rand(6, 14) : 0),   // the odd long runner
        wob: CZ.rand(0, 6.3), sp: CZ.rand(0.6, 1.5) });
      x += w + CZ.rand(1, 9);
    }
    // the holes in it, because it is cheese
    for (let i = 0; i < 14; i++) {
      holes.push({ x: CZ.rand(4, W - 4), y: CZ.rand(-4, H), r: CZ.rand(1.5, 5) });
    }
  }

  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };

  // Paint the sheet with its lower edge at `edge`, measured down the screen.
  // `dir` +1 means it is coming down, -1 means it is draining back up.
  function sheet(edge, dir) {
    g.clearRect(0, 0, W, H);
    const body = '#ffd23f', lit = '#ffe98a', dark = '#d9931f', rind = '#e8892a';
    if (dir > 0) px(0, 0, W, Math.max(0, edge), body);
    else px(0, edge, W, Math.max(0, H - edge), body);

    for (const d of drips) {
      const stretch = d.lead * (1 + Math.sin(t * 9 * d.sp + d.wob) * 0.18);
      const tip = dir > 0 ? edge + stretch : edge - stretch;
      if (dir > 0) { if (edge > 0) px(d.x, edge - 1, d.w, stretch + 1, body); }
      else if (edge < H) px(d.x, tip, d.w, stretch + 1, body);
      // the rounded blob on the end of each run
      const by = dir > 0 ? tip : tip;
      px(d.x - 1, by - (dir > 0 ? 2 : -1), d.w + 2, 3, body);
      px(d.x, by - (dir > 0 ? 3 : -2), d.w, 1, lit);
    }
    // holes, shading and a bright rim along the leading edge
    for (const h of holes) {
      const hy = dir > 0 ? edge - h.y : edge + (H - h.y);
      if (hy < -6 || hy > H + 6) continue;
      const inside = dir > 0 ? hy < edge - 2 : hy > edge + 2;
      if (!inside) continue;
      px(h.x - h.r, hy - h.r * 0.8, h.r * 2, h.r * 1.6, dark);
      px(h.x - h.r + 1, hy - h.r * 0.8, h.r * 2 - 2, 1, rind);
    }
    if (dir > 0) {
      px(0, 0, W, 3, lit);
      if (edge > 4) px(0, edge - 3, W, 2, rind);
    } else {
      px(0, H - 3, W, 3, dark);
      if (edge < H - 4) px(0, edge + 1, W, 2, rind);
    }
  }

  function frame(dt) {
    t += dt;
    if (phase === 'down') {
      const k = CZ.clamp(t / DOWN, 0, 1);
      sheet(k * k * (H + 20) - 2, 1);              // accelerating, like it is pouring
      if (k >= 1) {
        phase = 'hold'; t = 0;
        g.clearRect(0, 0, W, H); px(0, 0, W, H, '#ffd23f');
        for (const h of holes) { px(h.x - h.r, h.y - h.r * 0.8, h.r * 2, h.r * 1.6, '#d9931f'); }
        if (onCover) { const cb = onCover; onCover = null; cb(); }
      }
    } else if (phase === 'hold') {
      if (t >= HOLD) { phase = 'up'; t = 0; }
    } else if (phase === 'up') {
      const k = CZ.clamp(t / UP, 0, 1);
      sheet(k * k * (H + 24) - 10, -1);            // and draining away downward
      if (k >= 1) { stop(); }
    }
  }
  function loop(now) {
    const dt = Math.min(0.05, (now - (loop.last || now)) / 1000); loop.last = now;
    frame(dt);
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    cancelAnimationFrame(raf); raf = 0; phase = 'idle';
    el.classList.add('hidden');
    const cb = onDone; onDone = null;
    if (cb) cb();
  }

  // play(cover, done): `cover` fires the moment the screen is fully cheese -
  // that is when you swap the scene behind it - and `done` when it has drained.
  function play(cover, done) {
    if (!el) init();
    if (phase !== 'idle') { if (onCover) onCover(); }
    seed();
    onCover = cover || null; onDone = done || null;
    phase = 'down'; t = 0; loop.last = 0;
    el.classList.remove('hidden');
    g.clearRect(0, 0, W, H);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  const busy = () => phase !== 'idle';
  return { play, busy };
})();
