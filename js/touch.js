// On-screen controls for phones and tablets: floating thumbstick + action buttons.
// Feeds CZ.Input via setStick/setTouch, so the rest of the game never knows what a finger is.
CZ.Touch = (() => {
  const $ = id => document.getElementById(id);
  const isTouch = () => (matchMedia('(hover: none) and (pointer: coarse)').matches
    || navigator.maxTouchPoints > 0 || 'ontouchstart' in window
    || /[?&]touch=1/.test(location.search));

  let enabled = false, root = null, stickEl = null, baseEl = null, knobEl = null;
  let stickPointer = null, homeX = 0, homeY = 0, baseHome = null;
  const RADIUS = 46;              // px of travel for a full-tilt stick
  const btnPointers = new Map();  // pointerId → button element
  const holdTimers = new Map();   // action → pending release timer
  const MIN_HOLD = 110;           // ms a tap stays "down", so a quick tap is never missed between frames
  let rotateDismissed = false;

  function init() {
    if (!isTouch()) return;
    enabled = true;
    document.documentElement.classList.add('touch');
    root = $('touch'); stickEl = $('tc-stick'); baseEl = $('tc-stick-base'); knobEl = $('tc-stick-knob');

    // ---- floating thumbstick: grab anywhere in the left half, the base jumps to your thumb ----
    const stickZone = document.createElement('div');
    stickZone.id = 'tc-stick-zone';
    Object.assign(stickZone.style, { position: 'absolute', left: '0', bottom: '0', width: '46%', height: '78%', pointerEvents: 'auto', touchAction: 'none' });
    root.insertBefore(stickZone, root.firstChild);

    const rect = () => baseEl.getBoundingClientRect();
    const restBase = () => {
      stickEl.style.left = ''; stickEl.style.bottom = ''; stickEl.style.top = '';
      knobEl.style.transform = 'translate(0,0)'; stickEl.classList.remove('active');
    };
    const grab = e => {
      if (stickPointer !== null) return;
      stickPointer = e.pointerId;
      stickEl.classList.add('active');
      // Move the stick under the thumb (clamped so it stays fully on screen).
      const half = baseEl.offsetWidth / 2 + 6;
      const cx = CZ.clamp(e.clientX, half, innerWidth * 0.5);
      const cy = CZ.clamp(e.clientY, half, innerHeight - half);
      stickEl.style.left = `${cx - baseEl.offsetWidth / 2}px`;
      stickEl.style.top = `${cy - baseEl.offsetHeight / 2}px`;
      stickEl.style.bottom = 'auto';
      homeX = cx; homeY = cy;
      move(e);
      stickZone.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const move = e => {
      if (e.pointerId !== stickPointer) return;
      let dx = e.clientX - homeX, dy = e.clientY - homeY;
      const d = Math.hypot(dx, dy);
      if (d > RADIUS) { dx *= RADIUS / d; dy *= RADIUS / d; }
      knobEl.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      CZ.Input.setStick(dx / RADIUS, dy / RADIUS);
      e.preventDefault();
    };
    const drop = e => {
      if (e.pointerId !== stickPointer) return;
      stickPointer = null; CZ.Input.setStick(0, 0); restBase(); e.preventDefault();
    };
    stickZone.addEventListener('pointerdown', grab);
    stickZone.addEventListener('pointermove', move);
    stickZone.addEventListener('pointerup', drop);
    stickZone.addEventListener('pointercancel', drop);

    // ---- action buttons ----
    for (const btn of root.querySelectorAll('[data-act]')) {
      const act = btn.dataset.act;
      const press = e => {
        if (btnPointers.has(e.pointerId)) return;
        btnPointers.set(e.pointerId, { btn, at: performance.now() }); btn.classList.add('pressed');
        hold(act, true);
        if (act === 'jump') hold('confirm', true, MIN_HOLD);
        btn.setPointerCapture(e.pointerId);
        CZ.Audio.resume();
        e.preventDefault(); e.stopPropagation();
      };
      const release = e => {
        const rec = btnPointers.get(e.pointerId);
        if (!rec || rec.btn !== btn) return;
        btnPointers.delete(e.pointerId); btn.classList.remove('pressed');
        // A tap can start and end between two frames; keep it held long enough to be sampled.
        hold(act, false, Math.max(0, MIN_HOLD - (performance.now() - rec.at)));
        e.preventDefault(); e.stopPropagation();
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('contextmenu', e => e.preventDefault());
    }

    // Tap anywhere on a story card to advance it.
    for (const id of ['dialog', 'unlock']) {
      $(id).addEventListener('pointerdown', e => { hold('confirm', true, MIN_HOLD); e.preventDefault(); });
    }

    // Losing the window mid-hold must not leave a key stuck down.
    const panic = () => { holdTimers.forEach(clearTimeout); holdTimers.clear(); CZ.Input.clearTouch(); stickPointer = null; btnPointers.clear(); restBase(); root.querySelectorAll('.pressed').forEach(b => b.classList.remove('pressed')); };
    window.addEventListener('blur', panic);
    document.addEventListener('visibilitychange', () => { if (document.hidden) panic(); });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());

    $('rotate-ok').addEventListener('click', () => { rotateDismissed = true; $('rotate').classList.add('hidden'); });
    addEventListener('resize', checkRotate);
    addEventListener('orientationchange', () => setTimeout(checkRotate, 250));
  }

  // hold(act, true) presses; hold(act, false, delay) releases, optionally after a delay.
  // hold(act, true, ms) is a self-releasing pulse for one-shot actions.
  function hold(act, on, ms) {
    clearTimeout(holdTimers.get(act)); holdTimers.delete(act);
    if (on) {
      CZ.Input.setTouch(act, true);
      if (ms) holdTimers.set(act, setTimeout(() => { CZ.Input.setTouch(act, false); holdTimers.delete(act); }, ms));
    } else if (ms) {
      holdTimers.set(act, setTimeout(() => { CZ.Input.setTouch(act, false); holdTimers.delete(act); }, ms));
    } else CZ.Input.setTouch(act, false);
  }

  let shown = false;
  function setVisible(on) {
    if (!enabled || on === shown) return;
    shown = on; root.classList.toggle('hidden', !on);
    if (!on) { holdTimers.forEach(clearTimeout); holdTimers.clear(); CZ.Input.clearTouch(); stickPointer = null; btnPointers.clear(); root.querySelectorAll('.pressed').forEach(b => b.classList.remove('pressed')); }
    checkRotate();
  }
  // Only offer the buttons for techs the player has actually unlocked.
  function syncAbilities(ab) {
    if (!enabled) return;
    $('tc-dash').hidden = !ab.dash;
    $('tc-grapple').hidden = !ab.grapple;
    $('tc-noclip').hidden = !ab.noclip;
  }
  function checkRotate() {
    if (!enabled) return;
    const portrait = innerHeight > innerWidth;
    $('rotate').classList.toggle('hidden', !(shown && portrait && !rotateDismissed));
  }

  return { init, setVisible, syncAbilities, enabled: () => enabled };
})();
