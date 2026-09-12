// The between-levels transition: a pixel map of the kitchen you are escaping
// through, with your wheel rolling along the route to the next stop.
CZ.MapScreen = (() => {
  const W = 320, H = 180;                 // logical pixels; the CSS blows it up
  let el = null, canvas = null, g = null, raf = 0, t = 0, from = 0, to = 1, done = null, skipHandler = null;

  // Where each stage sits in the kitchen, and what it is called on the map.
  const STOPS = [
    { x: 26, y: 150, name: 'CELLAR' },
    { x: 78, y: 146, name: 'GRATERS' },
    { x: 128, y: 126, name: 'VATS' },
    { x: 178, y: 142, name: 'PACKING' },
    { x: 228, y: 106, name: 'VENTS' },
    { x: 262, y: 74, name: 'SORTER' },
    { x: 296, y: 44, name: 'THE DOOR' },
  ];

  function init() {
    el = document.getElementById('map');
    canvas = document.getElementById('map-canvas');
    canvas.width = W; canvas.height = H;
    g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
  }

  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };

  // ── the kitchen itself, drawn once per frame (it is cheap at this size) ──
  function kitchen() {
    px(0, 0, W, H, '#2a1a12');                                  // wall
    for (let y = 0; y < 96; y += 8) for (let x = 0; x < W; x += 16) px(x + (y / 8 % 2 ? 8 : 0), y, 15, 7, '#3a2418');
    px(0, 96, W, 4, '#6a4a2a');                                 // skirting
    px(0, 100, W, H - 100, '#c9a06a');                          // floor
    for (let y = 100; y < H; y += 10) for (let x = 0; x < W; x += 20) px(x + (y / 10 % 2 ? 10 : 0), y, 19, 9, '#b8905c');

    // window with a cold night outside
    px(228, 14, 68, 52, '#1a2f4a'); px(232, 18, 60, 44, '#2f4f7a');
    px(258, 18, 4, 44, '#1a2f4a'); px(232, 38, 60, 3, '#1a2f4a');
    px(276, 24, 8, 8, '#ffe6a8');                               // moon
    px(224, 10, 76, 5, '#8a5a2b'); px(224, 64, 76, 5, '#8a5a2b');

    // counter running along the wall
    px(0, 70, 200, 6, '#d8c2a0'); px(0, 76, 200, 22, '#8a5a2b');
    for (let x = 8; x < 196; x += 26) px(x, 80, 20, 14, '#6a4522');

    // stove with a pot on it
    px(18, 40, 46, 30, '#9aa0ac'); px(22, 44, 38, 12, '#3a3f48');
    px(28, 30, 26, 12, '#c8ccd4'); px(26, 26, 30, 5, '#8a8f9a');
    px(32, 22, 6, 5, '#e8e2d8');                                // steam
    px(42, 18, 5, 4, '#e8e2d8');

    // sink
    px(84, 44, 40, 26, '#b8bec8'); px(88, 48, 32, 18, '#7a8290');
    px(100, 34, 4, 12, '#c8ccd4'); px(100, 34, 14, 4, '#c8ccd4');

    // fridge
    px(150, 22, 44, 76, '#e6e9ee'); px(150, 22, 44, 3, '#b8bec8');
    px(150, 56, 44, 3, '#b8bec8'); px(186, 32, 4, 14, '#9aa0ac'); px(186, 66, 4, 14, '#9aa0ac');
    px(156, 28, 8, 8, '#ffcc33');                               // a magnet, obviously cheese

    // shelves of cheese above the counter
    for (const [sx, sy] of [[70, 18], [108, 18]]) {
      px(sx, sy + 12, 34, 3, '#8a5a2b');
      for (let i = 0; i < 3; i++) { px(sx + 3 + i * 11, sy + 5, 8, 7, '#ffcc33'); px(sx + 3 + i * 11, sy + 5, 8, 2, '#e8892a'); }
    }

    // the cellar hatch you came out of, and the back door you are heading for
    px(14, 156, 30, 4, '#4a2c12'); px(16, 160, 26, 16, '#2a1a12');
    // and the bits that make it somebody's kitchen: a mousehole, a bowl, crumbs
    px(206, 88, 12, 10, '#2a1a12'); px(208, 92, 8, 6, '#140d07');
    px(120, 168, 22, 8, '#6a8ac0'); px(122, 170, 18, 4, '#a8c4e8');
    for (const [cx2, cy2] of [[96, 120], [102, 124], [144, 160], [150, 156], [188, 130]]) px(cx2, cy2, 2, 2, '#e8c07a');
    px(286, 28, 30, 64, '#6a4522'); px(290, 32, 22, 56, '#8a5a2b');
    px(292, 84, 18, 4, '#ffe6a8'); px(306, 58, 4, 4, '#d8c07a');
  }

  // the route, as a dotted line from stop to stop
  function route(progress) {
    for (let i = 0; i < STOPS.length - 1; i++) {
      const a = STOPS[i], b = STOPS[i + 1];
      const walked = i < to;
      const steps = Math.max(6, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 6));
      for (let s = 0; s <= steps; s++) {
        const k = s / steps;
        const done2 = walked || (i === from && k <= progress);
        px(a.x + (b.x - a.x) * k - 1, a.y + (b.y - a.y) * k - 1, 2, 2, done2 ? '#ffd23f' : '#6a4522');
      }
    }
    for (let i = 0; i < STOPS.length; i++) {
      const s = STOPS[i], reached = i <= from || (i === to && progress >= 1);
      px(s.x - 4, s.y - 4, 8, 8, '#140d07');
      px(s.x - 3, s.y - 3, 6, 6, reached ? '#ffd23f' : '#7a5a3a');
      if (reached) px(s.x - 2, s.y - 2, 2, 2, '#fff3c0');
      if (i === to && progress < 1) {                 // the one you are heading for
        const blink = (Math.floor(t * 6) % 2) === 0;
        if (blink) { px(s.x - 7, s.y - 7, 14, 2, '#fff'); px(s.x - 7, s.y + 5, 14, 2, '#fff'); }
      }
    }
  }

  // you, rolling from one stop to the next: a little round wheel, not a box
  function wheel(x, y, spin) {
    x = Math.round(x); y = Math.round(y);
    const disc = (r, c) => { for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); px(x - w, y + dy, w * 2 + 1, 1, c); } };
    disc(6, '#140d07');
    disc(5, '#e8892a');
    disc(4, '#ffcc33');
    // two holes that turn with it, so it reads as rolling
    const dx = Math.round(Math.cos(spin) * 2), dy = Math.round(Math.sin(spin) * 2);
    px(x + dx - 1, y + dy - 1, 2, 2, '#d9931f');
    px(x - dx - 1, y - dy - 1, 2, 2, '#d9931f');
    // and two eyes that always face forward
    px(x - 3, y - 2, 3, 3, '#fff'); px(x + 1, y - 2, 3, 3, '#fff');
    px(x - 2, y - 1, 1, 1, '#140d07'); px(x + 2, y - 1, 1, 1, '#140d07');
  }

  function frame(dt) {
    t += dt;
    const roll = CZ.clamp((t - 0.45) / 1.7, 0, 1);
    const ease = roll < 0.5 ? 2 * roll * roll : 1 - Math.pow(-2 * roll + 2, 2) / 2;
    kitchen();
    route(ease);
    const a = STOPS[from], b = STOPS[to];
    const x = a.x + (b.x - a.x) * ease, y = a.y + (b.y - a.y) * ease - Math.sin(ease * Math.PI) * 6;
    wheel(x, y, -t * 7);
    if (t > 2.9) finish();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - (loop.last || now)) / 1000); loop.last = now;
    frame(dt);
    raf = requestAnimationFrame(loop);
  }

  function show(fromIndex, toIndex, onDone) {
    if (!el) init();
    from = CZ.clamp(fromIndex, 0, STOPS.length - 1);
    to = CZ.clamp(toIndex, 0, STOPS.length - 1);
    done = onDone; t = 0; loop.last = 0;
    el.classList.remove('hidden');
    skipHandler = () => finish();
    addEventListener('pointerdown', skipHandler);
    addEventListener('keydown', skipHandler);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function finish() {
    if (!done) return;
    const cb = done; done = null;
    cancelAnimationFrame(raf); raf = 0;
    removeEventListener('pointerdown', skipHandler);
    removeEventListener('keydown', skipHandler);
    el.classList.add('hidden');
    cb();
  }

  return { show, STOPS };
})();
