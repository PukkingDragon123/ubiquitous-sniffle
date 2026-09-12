// Comic layer: speech balloons that track a point in the 3D world, impact
// bursts, speed lines and halftone. This replaces the old dialogue box entirely.
CZ.Comic = (() => {
  const $ = id => document.getElementById(id);
  let layer = null, bubbles = [], bursts = [], camera = null;
  const v = { x: 0, y: 0, z: 0 };

  function init() { layer = $('comic'); }
  function setCamera(c) { camera = c; }

  // A pixel-art cloud, drawn to fit whatever the text needs. Blocky lobes around
  // the edge, a chunky outline, and a tail of shrinking puffs underneath.
  const cloudCache = new Map();
  function cloudSprite(w, h, kind) {
    // Chunkier pixels on bigger balloons, so the lobes stay lobes instead of
    // shrinking into a torn-paper edge.
    const S = CZ.clamp(Math.round(w / 60), 4, 9);   // pixel size
    const cw = Math.max(12, Math.round(w / S)), ch = Math.max(8, Math.round(h / S));
    const key = `${cw}x${ch}|${kind}`;
    if (cloudCache.has(key)) return cloudCache.get(key);
    const tailH = 6;
    const c = document.createElement('canvas');
    c.width = (cw + 10) * S; c.height = (ch + 10 + tailH) * S;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const W = cw + 10, H = ch + 10;
    const grid = Array.from({ length: H + tailH }, () => new Array(W).fill(0));
    const disc = (cx, cy, r) => {
      for (let y = 0; y < H + tailH; y++) for (let x = 0; x < W; x++) {
        const dx = (x - cx), dy = (y - cy) * 1.12;
        if (dx * dx + dy * dy <= r * r) grid[y][x] = 1;
      }
    };
    // body plus big round lobes all around the rim
    for (let y = 6; y < H - 6; y++) for (let x = 6; x < W - 6; x++) grid[y][x] = 1;
    const lobes = Math.max(3, Math.round(W / 14));
    for (let i = 0; i <= lobes; i++) {
      const x = 5.5 + (i / lobes) * (W - 11);
      disc(x, 6, 6.6 + (i % 2) * 1.8);
      disc(x, H - 6, 6.2 + ((i + 1) % 2) * 1.6);
    }
    const vl = Math.max(2, Math.round(H / 13));
    for (let i = 0; i <= vl; i++) {
      const y = 5.5 + (i / vl) * (H - 11);
      disc(6, y, 6.2 + (i % 2) * 1.5);
      disc(W - 6, y, 6.2 + ((i + 1) % 2) * 1.5);
    }
    // tail: three shrinking puffs trailing down toward the speaker
    const tx = W * 0.4;
    disc(tx, H - 3, 3.4); disc(tx - 2, H + 0.4, 2.3); disc(tx - 3.6, H + 3.2, 1.4);
    // paint: outline first, then fill
    const fill = kind === 'shout' ? '#ffd23f' : '#f6e9c8';
    for (let y = 0; y < H + tailH; y++) for (let x = 0; x < W; x++) {
      if (!grid[y][x]) continue;
      const edge = !grid[y - 1]?.[x] || !grid[y + 1]?.[x] || !grid[y][x - 1] || !grid[y][x + 1]
        || !grid[y - 1]?.[x - 1] || !grid[y + 1]?.[x + 1];
      g.fillStyle = edge ? '#140d07' : fill;
      g.fillRect(x * S, y * S, S, S);
    }
    const url = c.toDataURL();
    const out = { url, padX: 6 * S, padY: 6 * S, tail: tailH * S, w: c.width, h: c.height };
    cloudCache.set(key, out);
    return out;
  }
  function dressCloud(el, kind) {
    const w = el.offsetWidth, h = el.offsetHeight;
    const cloud = cloudSprite(w, h, kind);
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
    dressCloud(el, opts.kind || 'say');
    // if the pixel font is still loading the text will reflow, so re-fit then
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(() => { if (el.isConnected) dressCloud(el, opts.kind || 'say'); });
    }
    // one balloon at a time: a new line clears whatever was still up, instantly,
    // so two lines never sit on screen together
    for (const old of bubbles) old.el.remove();
    bubbles.length = 0;
    const b = { el, anchor, tall: true, life: opts.life ?? (1.2 + text.length * 0.045), t: 0, side: opts.side || 0, off: opts.off || [0, 0] };
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
