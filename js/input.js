// Keyboard + gamepad + touch → abstract actions with pressed/held/released edges.
CZ.Input = (() => {
  const keys = {};
  const map = {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    jump: ['Space', 'KeyZ', 'KeyW', 'ArrowUp', 'KeyK'],
    dash: ['ShiftLeft', 'ShiftRight', 'KeyX', 'KeyJ'],
    grapple: ['KeyC', 'KeyE', 'KeyL'],
    noclip: ['KeyV', 'KeyQ', 'KeyI'],
    pause: ['Escape', 'KeyP'], mute: ['KeyM'], restart: ['KeyR'], confirm: ['Space', 'Enter', 'KeyZ'],
  };
  const state = {}, prev = {}, touch = {};
  for (const a in map) { state[a] = false; prev[a] = false; touch[a] = false; }
  let anyKeyCb = null;
  // Analog stick value from a virtual thumbstick (-1..1); touch buttons set `touch` flags.
  let stickX = 0, stickY = 0;
  const setTouch = (a, on) => { if (a in touch) touch[a] = !!on; };
  const setStick = (x, y) => { stickX = x; stickY = y; };
  const clearTouch = () => { for (const a in touch) touch[a] = false; stickX = stickY = 0; };

  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (anyKeyCb) anyKeyCb();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  let padAxisX = 0, padAxisY = 0;
  function pollPad() {
    padAxisX = 0; padAxisY = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && [...pads].find(g => g && g.connected);
    const pb = {};
    if (p) {
      const b = i => !!(p.buttons[i] && p.buttons[i].pressed);
      padAxisX = Math.abs(p.axes[0]) > 0.3 ? p.axes[0] : 0;
      padAxisY = Math.abs(p.axes[1]) > 0.3 ? p.axes[1] : 0;
      pb.left = padAxisX < -0.3 || b(14); pb.right = padAxisX > 0.3 || b(15);
      pb.up = padAxisY < -0.3 || b(12); pb.down = padAxisY > 0.3 || b(13);
      pb.jump = b(0); pb.dash = b(1) || b(5) || b(7); pb.grapple = b(2) || b(4); pb.noclip = b(3) || b(6);
      pb.pause = b(9); pb.confirm = b(0);
    }
    return pb;
  }

  function update() {
    const pb = pollPad();
    const tl = stickX < -0.35, tr = stickX > 0.35, tu = stickY < -0.45, td = stickY > 0.45;
    for (const a in map) {
      prev[a] = state[a];
      state[a] = map[a].some(k => keys[k]) || !!pb[a] || touch[a];
    }
    if (tl) state.left = true; if (tr) state.right = true;
    if (tu) state.up = true; if (td) state.down = true;
  }
  const held = a => !!state[a];
  const pressed = a => state[a] && !prev[a];
  const released = a => !state[a] && prev[a];
  const axisX = () => (held('left') ? -1 : 0) + (held('right') ? 1 : 0);
  const stick = () => ({ x: stickX, y: stickY });
  // Consume a press so no other system reacts to it this frame.
  const consume = a => { prev[a] = true; };
  // After a physics substep, edges must not fire again in the same frame.
  const clearEdges = () => { for (const a in map) prev[a] = state[a]; };
  const onAnyKey = cb => { anyKeyCb = cb; };
  return { update, held, pressed, released, axisX, stick, consume, clearEdges, onAnyKey, setTouch, setStick, clearTouch };
})();
