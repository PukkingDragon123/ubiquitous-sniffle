// Comic layer: speech balloons that track a point in the 3D world, impact
// bursts, speed lines and halftone. This replaces the old dialogue box entirely.
CZ.Comic = (() => {
  const $ = id => document.getElementById(id);
  let layer = null, bubbles = [], bursts = [], camera = null;
  const v = { x: 0, y: 0, z: 0 };

  function init() { layer = $('comic'); }
  function setCamera(c) { camera = c; }

  // anchor: () => [x, y, z] in world space, or [x, y] already in screen fractions.
  function bubble(text, anchor, opts = {}) {
    if (!layer) init();
    const el = document.createElement('div');
    el.className = `bubble ${opts.kind || 'say'}`;
    el.innerHTML = `<span>${text}</span><i class="tail"></i>`;
    layer.appendChild(el);
    const b = { el, anchor, life: opts.life ?? (1.2 + text.length * 0.045), t: 0, side: opts.side || 0, off: opts.off || [0, 0] };
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
    const b = { el, anchor, life: opts.life ?? 0.75, t: 0, off: opts.off || [0, 0], spin: (Math.random() - 0.5) * 16 };
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
  function place(b) {
    const p = project(b.anchor);
    b.el.style.left = `${p.x + b.off[0]}px`;
    b.el.style.top = `${p.y + b.off[1]}px`;
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
