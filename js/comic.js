// Comic layer: speech balloons that track a point in the 3D world, impact
// bursts, speed lines and halftone. This replaces the old dialogue box entirely.
CZ.Comic = (() => {
  const $ = id => document.getElementById(id);
  let layer = null, bubbles = [], bursts = [], camera = null;
  const v = { x: 0, y: 0, z: 0 };

  function init() { layer = $('comic'); }
  function setCamera(c) { camera = c; }

  // A pixel-art cloud, drawn to fit whatever the text needs. The lobes around
  // the rim are deliberately uneven and the ink is deliberately uneven with
  // them: a balloon whose every lobe is the same radius looks stamped out, and
  // a balloon is the one thing on screen that should look drawn by a person.
  const cloudCache = new Map();
  function cloudSprite(w, h, kind, side) {
    // Chunkier pixels on bigger balloons, so the lobes stay lobes instead of
    // shrinking into a torn-paper edge.
    const S = CZ.clamp(Math.round(w / 72), 4, 8);   // pixel size
    const cw = Math.max(12, Math.round(w / S)), ch = Math.max(8, Math.round(h / S));
    const key = `${cw}x${ch}|${kind}|${side}`;
    if (cloudCache.has(key)) return cloudCache.get(key);
    // Stable per-balloon wobble: the same balloon always draws the same way,
    // but no two sizes of balloon draw alike.
    let seed = (cw * 73856093) ^ (ch * 19349663) ^ (kind.length * 83492791) ^ (side + 3);
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const jit = a => (rnd() * 2 - 1) * a;

    // The margin has to be wider than the biggest lobe, or the rim gets clipped
    // flat against the edge of the canvas and the balloon turns into a envelope.
    const tailH = 7, PAD = 9;
    const W = cw + PAD * 2, H = ch + PAD * 2;
    const c = document.createElement('canvas');
    c.width = W * S; c.height = (H + tailH) * S;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const grid = Array.from({ length: H + tailH }, () => new Array(W).fill(0));
    const disc = (cx, cy, r) => {
      const r2 = r * r;
      for (let y = 0; y < H + tailH; y++) for (let x = 0; x < W; x++) {
        const dx = (x - cx), dy = (y - cy) * 1.12;
        if (dx * dx + dy * dy <= r2) grid[y][x] = 1;
      }
    };
    const spike = (cx, cy, nx, ny, len, halfW) => {
      for (let t = 0; t < len; t += 0.35) {
        const k = 1 - t / len;
        disc(cx + nx * t, cy + ny * t, Math.max(0.7, halfW * k));
      }
    };

    // the body, then the rim
    for (let y = PAD; y < H - PAD; y++) for (let x = PAD; x < W - PAD; x++) grid[y][x] = 1;
    if (kind === 'shout') {
      // a burst: uneven spikes all the way round, none of them the same length
      const n = Math.max(11, Math.round((W + H) / 6));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + jit(0.10);
        const ex = W / 2 + Math.cos(a) * (W / 2 - PAD), ey = H / 2 + Math.sin(a) * (H / 2 - PAD) / 1.12;
        spike(ex, ey, Math.cos(a), Math.sin(a) / 1.12, 4.6 + rnd() * 4.2, 4.0 + rnd() * 1.8);
      }
    } else {
      // Lobes big enough to overlap their neighbours generously - they have to
      // merge into one round rim, not sit in a row like a torn edge. The wobble
      // is small on purpose: enough that no two are twins, not so much that the
      // balloon stops reading as a balloon.
      const lobes = Math.max(3, Math.round(W / 12));
      for (let i = 0; i <= lobes; i++) {
        const t = i / lobes, x = PAD - 0.5 + t * (W - PAD * 2 + 1);
        disc(x + jit(0.45), PAD + jit(0.4), 6.3 + (i % 2) * 1.1 + jit(0.5));
        disc(x + jit(0.45), H - PAD + jit(0.4), 6.2 + ((i + 1) % 2) * 1.1 + jit(0.45));
      }
      const vl = Math.max(2, Math.round(H / 11));
      for (let i = 0; i <= vl; i++) {
        const t = i / vl, y = PAD - 0.5 + t * (H - PAD * 2 + 1);
        disc(PAD + jit(0.4), y + jit(0.45), 6.1 + (i % 2) * 1.0 + jit(0.45));
        disc(W - PAD + jit(0.4), y + jit(0.45), 6.1 + ((i + 1) % 2) * 1.0 + jit(0.45));
      }
    }
    // the tail leans toward whoever is talking, and curls as it shrinks
    const tx = side < 0 ? W * 0.30 : W * 0.70, dir = side < 0 ? -1 : 1;
    disc(tx, H - PAD + 2.4, 3.6);
    disc(tx + dir * 2.1, H - PAD + 5.2, 2.4);
    disc(tx + dir * 3.9, H - PAD + 7.6, 1.5);
    disc(tx + dir * 5.2, H - PAD + 9.2, 0.9);

    // Ink it. The outline runs one pixel thick along the top and left, two along
    // the bottom and right, the way a brush loads on the way down - with the odd
    // pixel of it missing, because a line drawn by hand is never closed. Outside
    // the ink goes a pale halo, because a black line on a black cellar wall is
    // not a line at all.
    const fill = kind === 'shout' ? '#ffd23f' : '#f6e9c8';
    const shade = kind === 'shout' ? '#e0a51c' : '#ddcaa2';
    const halo = kind === 'shout' ? '#fff3c0' : '#fffbef';
    const INK = '#140d07';
    const on = (x, y) => !!(grid[y] && grid[y][x]);
    for (let y = 0; y < H + tailH; y++) for (let x = 0; x < W; x++) {
      if (grid[y][x]) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)
        || on(x - 1, y - 1) || on(x + 1, y + 1) || on(x + 1, y - 1) || on(x - 1, y + 1)) {
        g.fillStyle = halo; g.fillRect(x * S, y * S, S, S);
      }
    }
    for (let y = 0; y < H + tailH; y++) for (let x = 0; x < W; x++) {
      if (!grid[y][x]) continue;
      const up = !on(x, y - 1), dn = !on(x, y + 1), lf = !on(x - 1, y), rt = !on(x + 1, y);
      const diag = !on(x - 1, y - 1) || !on(x + 1, y + 1) || !on(x + 1, y - 1) || !on(x - 1, y + 1);
      let col = null;
      if (up || dn || lf || rt || diag) col = INK;
      // the second pass of ink, on the shaded side only
      else if (!on(x + 2, y) || !on(x, y + 2)) col = rnd() < 0.82 ? INK : shade;
      else if (!on(x, y + 3) || !on(x + 3, y)) col = shade;
      if (col === INK && rnd() < 0.018 && !(up || lf)) col = fill;   // a gap in the line
      g.fillStyle = col || fill;
      g.fillRect(x * S, y * S, S, S);
    }
    const url = c.toDataURL();
    const out = { url, padX: PAD * S, padY: PAD * S, tail: tailH * S, w: c.width, h: c.height };
    cloudCache.set(key, out);
    return out;
  }
  function dressCloud(el, kind, side) {
    // Measure the bare text once. After the first dress the element carries the
    // balloon's own padding, and measuring that again grows it every time.
    if (el.__cw === undefined) { el.__cw = el.offsetWidth; el.__ch = el.offsetHeight; }
    const w = el.__cw, h = el.__ch;
    const cloud = cloudSprite(w, h, kind, side);
    el.style.backgroundImage = `url(${cloud.url})`;
    el.style.backgroundSize = '100% 100%';
    el.style.padding = `${cloud.padY}px ${cloud.padX}px ${cloud.padY + cloud.tail}px`;
    // no negative margins: place() clamps by the element box, and shifting it
    // outside that box is how balloons ended up under the letterbox bar
  }

  // anchor: () => [x, y, z] in world space, or [x, y] already in screen fractions.
  function bubble(text, anchor, opts = {}) {
    if (!layer) init();
    const el = document.createElement('div');
    el.className = `bubble ${opts.kind || 'say'}`;
    el.innerHTML = `<span>${text}</span>`;
    layer.appendChild(el);
    const kind = opts.kind || 'say';
    dressCloud(el, kind, -1);
    // if the pixel font is still loading the text will reflow, so re-fit then
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(() => {
        if (!el.isConnected) return;
        el.style.padding = '0'; el.__cw = undefined;   // re-measure the reflowed text
        dressCloud(el, kind, b.tailSide);
      });
    }
    // one balloon at a time: a new line clears whatever was still up, instantly,
    // so two lines never sit on screen together
    for (const old of bubbles) old.el.remove();
    bubbles.length = 0;
    // Nobody sticks a balloon on perfectly straight.
    const tilt = (Math.random() * 2 - 1) * 1.6;
    const b = { el, anchor, kind, tailSide: -1, tilt, tall: true,
      life: opts.life ?? (1.2 + text.length * 0.045), t: 0, side: opts.side || 0, off: opts.off || [0, 0] };
    el.style.setProperty('--tilt', `${tilt.toFixed(2)}deg`);
    bubbles.push(b);
    place(b);
    return b;
  }
  function clearBubbles() { for (const b of bubbles) b.el.remove(); bubbles = []; }

  // A big comic impact word at a world point.
  function pow(text, anchor, opts = {}) {
    if (!layer) init();
    const el = document.createElement('div');
    el.className = `pow ${opts.kind || 'hit'}`;
    el.textContent = text;
    layer.appendChild(el);
    // never more than two impact words at once, and never stacked exactly
    while (bursts.length >= 2) { const old = bursts.shift(); old.el.remove(); }
    // push each word well clear of the last one, so two hits never stack
    const side = bursts.length ? -Math.sign(bursts[bursts.length - 1].off[0] || 1) : (Math.random() < 0.5 ? -1 : 1);
    const jitter = [side * (70 + Math.random() * 90), (Math.random() - 0.5) * 120];
    const off = opts.off || [0, 0];
    const b = { el, anchor, life: opts.life ?? 0.75, t: 0, off: [off[0] + jitter[0], off[1] + jitter[1]], spin: (Math.random() - 0.5) * 16 };
    bursts.push(b);
    place(b);
    return b;
  }

  function project(anchor) {
    const a = typeof anchor === 'function' ? anchor() : anchor;
    if (a.length === 2) return { x: a[0] * innerWidth, y: a[1] * innerHeight, ok: true };
    if (!camera) return { x: innerWidth / 2, y: innerHeight / 2, ok: true };
    v.x = a[0]; v.y = a[1]; v.z = a[2];
    const p = new THREE.Vector3(v.x, v.y, v.z).project(camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight, ok: p.z < 1 };
  }
  // The cinematic letterbox eats 11vh top and bottom, so keep everything inside
  // that band - a balloon clipped by a black bar is worse than one nudged over.
  function place(b) {
    const p = project(b.anchor);
    let x = p.x + b.off[0], y = p.y + b.off[1];
    const w = b.el.offsetWidth, h = b.el.offsetHeight;
    const top = innerHeight * 0.12 + 8, bot = innerHeight * 0.88 - 8, side = 10;
    x = Math.max(w / 2 + side, Math.min(innerWidth - w / 2 - side, x));
    // The tail has to point at whoever is speaking, so it flips when the clamp
    // above pushes the balloon past them.
    if (b.tailSide !== undefined) {
      const want = p.x < x - 6 ? -1 : p.x > x + 6 ? 1 : b.tailSide;
      if (want !== b.tailSide) { b.tailSide = want; dressCloud(b.el, b.kind, want); }
    }
    if (b.tall) y = Math.max(top + h, Math.min(bot, y));            // grows upward
    else y = Math.max(top + h / 2, Math.min(bot - h / 2, y));       // centred
    b.el.style.left = `${x}px`;
    b.el.style.top = `${y}px`;
    b.el.style.visibility = p.ok ? 'visible' : 'hidden';
  }

  function speedLines(on) { layer && layer.classList.toggle('speed', !!on); }
  function halftone(on) { layer && layer.classList.toggle('halftone', !!on); }
  function shakeFrame(on) { layer && layer.classList.toggle('rattle', !!on); }
  function flash(kind) {
    if (!layer) init();
    const el = document.createElement('div');
    el.className = `panel-flash ${kind || ''}`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 320);
  }
  function show(on) { if (!layer) init(); layer.classList.toggle('hidden', !on); if (!on) { clearBubbles(); for (const b of bursts) b.el.remove(); bursts = []; } }

  function update(dt) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; b.t += dt; place(b);
      if (b.t > b.life) { b.el.classList.add('gone'); if (b.t > b.life + 0.25) { b.el.remove(); bubbles.splice(i, 1); } }
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.t += dt; place(b);
      const k = b.t / b.life;
      b.el.style.transform = `translate(-50%,-50%) scale(${1 + k * 0.5}) rotate(${b.spin * (1 - k)}deg)`;
      b.el.style.opacity = k > 0.7 ? String(1 - (k - 0.7) / 0.3) : '1';
      if (b.t > b.life) { b.el.remove(); bursts.splice(i, 1); }
    }
  }
  return { init, setCamera, bubble, pow, clearBubbles, speedLines, halftone, shakeFrame, flash, show, update };
})();
