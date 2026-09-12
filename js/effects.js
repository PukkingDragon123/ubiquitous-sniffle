// Toon materials, outlines, particles, screen shake.
CZ.Effects = (() => {
  let scene = null, gradientMap = null;
  const matCache = new Map();
  const particles = [];
  let shakeAmt = 0, shakeX = 0, shakeY = 0;
  let particleGeo = null, pool = [];
  // Chunky debris: real lumps that fly, tumble, bounce and settle in a heap.
  const chunks = [];
  let chunkGeo = null, chunkPool = [];
  // Dust: soft billboards that bloom and fade where something came apart.
  const dust = [];
  let dustGeo = null, dustTex = null, dustPool = [];
  // Debris asks the level what is underneath it, so a heap lands on the ledge
  // it was knocked off rather than on one imaginary plane.
  let level = null;
  const setLevel = l => { level = l; };

  function init(s) {
    scene = s;
    const colors = new Uint8Array([60, 120, 200, 255]);
    gradientMap = new THREE.DataTexture(colors, colors.length, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter; gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
    particleGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    chunkGeo = new THREE.BoxGeometry(1, 1, 1);
    dustGeo = new THREE.PlaneGeometry(1, 1);
    dustTex = dustTex || makeDustTex();
    particles.length = 0; pool = [];
    for (const c of chunks) scene.remove(c);
    for (const d of dust) scene.remove(d);
    chunks.length = 0; chunkPool = []; dust.length = 0; dustPool = [];
  }

  function toon(color, opts = {}) {
    const key = `${color}|${JSON.stringify(opts)}`;
    if (matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshToonMaterial({ color, gradientMap, ...opts });
    matCache.set(key, m);
    return m;
  }
  function basic(color, opts = {}) {
    const key = `b|${color}|${JSON.stringify(opts)}`;
    if (matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshBasicMaterial({ color, ...opts });
    matCache.set(key, m);
    return m;
  }
  const lineMat = (() => { let m; return () => m || (m = new THREE.LineBasicMaterial({ color: 0x1a0f0a, transparent: true, opacity: 0.55 })); })();
  const outlineMat = (() => { let m; return () => m || (m = new THREE.MeshBasicMaterial({ color: 0x1a0f0a, side: THREE.BackSide })); })();

  // Inverted-hull outline for a mesh (cartoon look).
  function outline(mesh, grow = 0.06) {
    const o = new THREE.Mesh(mesh.geometry, outlineMat());
    const b = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);
    const size = new THREE.Vector3(); b.getSize(size);
    o.scale.set(1 + grow / Math.max(size.x, 0.01), 1 + grow / Math.max(size.y, 0.01), 1 + grow / Math.max(size.z, 0.01));
    o.renderOrder = -1;
    mesh.add(o);
    return o;
  }
  function edges(mesh) {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), lineMat());
    mesh.add(e);
    return e;
  }
  function box(w, h, d, color, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color, opts));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  // ---- particles ----
  function burst(x, y, color, count = 12, o = {}) {
    if (!scene) return;
    const spread = o.spread ?? 7, up = o.up ?? 4, life = o.life ?? 0.7, size = o.size ?? 1, gravity = o.gravity ?? 30, z = o.z ?? 0.5;
    for (let i = 0; i < count; i++) {
      let p = pool.pop();
      if (!p) {
        p = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({ color }));
        p.material.transparent = true;
      } else { p.material.color.set(color); p.material.opacity = 1; }
      const a = Math.random() * Math.PI * 2, sp = Math.random() * spread;
      p.position.set(x, y, z + (Math.random() - 0.5));
      const s = size * (0.6 + Math.random() * 0.8);
      p.scale.set(s, s, s);
      p.userData.vx = Math.cos(a) * sp + (o.vx || 0);
      p.userData.vy = Math.sin(a) * sp + up + (o.vy || 0);
      p.userData.life = life * (0.6 + Math.random() * 0.6);
      p.userData.maxLife = p.userData.life;
      p.userData.gravity = gravity;
      p.userData.rot = (Math.random() - 0.5) * 12;
      scene.add(p); particles.push(p);
    }
  }
  // A soft round blob on a 16x16 grid: big enough to read as a cloud, small
  // enough that it stays a pixel cloud when the frame is blown up.
  function makeDustTex() {
    const S = 16, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    const img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - (S - 1) / 2, y - (S - 1) / 2) / (S / 2);
      const a = d > 1 ? 0 : Math.round(255 * Math.pow(1 - d, 0.7));
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a > 24 ? a : 0;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    return t;
  }
  // A puff of dust. Blooms outward, drifts up, and thins out.
  function puff(x, y, n = 6, opts = {}) {
    if (!scene) return;
    const color = opts.color ?? 0xd8c4a0;
    for (let i = 0; i < n; i++) {
      let m = dustPool.pop();
      if (!m) m = new THREE.Mesh(dustGeo, new THREE.MeshBasicMaterial({
        map: dustTex, transparent: true, depthWrite: false, opacity: 0.5 }));
      m.material.color.setHex(color);
      m.material.opacity = opts.opacity ?? 0.42;
      const s0 = (opts.size ?? 1) * CZ.rand(0.5, 1.1);
      m.scale.setScalar(s0);
      m.position.set(x + CZ.rand(-0.5, 0.5) * (opts.spread ?? 1),
        y + CZ.rand(-0.3, 0.5) * (opts.spread ?? 1), CZ.rand(-0.9, 1.4));
      m.rotation.z = CZ.rand(0, 6.3);
      m.userData = {
        vx: CZ.rand(-1, 1) * (opts.blow ?? 2) + (opts.vx || 0) * 0.35,
        vy: CZ.rand(0.2, 1.4) + (opts.vy || 0) * 0.2,
        grow: CZ.rand(0.8, 1.7) * (opts.size ?? 1),
        spin: CZ.rand(-0.8, 0.8),
        life: CZ.rand(0.5, 1.1) * (opts.life ?? 1), max: 0, o0: m.material.opacity,
      };
      m.userData.max = m.userData.life;
      scene.add(m); dust.push(m);
    }
  }
  function stepDust(dt) {
    for (let i = dust.length - 1; i >= 0; i--) {
      const m = dust[i], u = m.userData;
      u.life -= dt;
      if (u.life <= 0) { scene.remove(m); dust.splice(i, 1); dustPool.push(m); continue; }
      const k = u.life / u.max;
      m.position.x += u.vx * dt; m.position.y += u.vy * dt;
      u.vx *= Math.exp(-dt * 2.2); u.vy = u.vy * Math.exp(-dt * 1.6) + 0.5 * dt;
      m.rotation.z += u.spin * dt;
      m.scale.setScalar(m.scale.x + u.grow * dt);
      m.material.opacity = u.o0 * k * k;
    }
  }

  // ---- debris ----
  // Blow an object apart into lumps. Big pieces, small shards and dust all come
  // off the same hit, they fly away from where they were struck, and each one
  // asks the level what is underneath it before it lands.
  function smash(box, opts = {}) {
    if (!scene) return;
    const n = opts.count ?? 10;
    const colors = opts.colors || [0x8f5a2c];
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const power = opts.power ?? 1;
    const dirX = opts.vx ? CZ.sign(opts.vx) : 0;
    for (let i = 0; i < n; i++) {
      let m = chunkPool.pop();
      if (!m) m = new THREE.Mesh(chunkGeo, new THREE.MeshToonMaterial({ color: 0xffffff }));
      m.material.color.set(colors[(Math.random() * colors.length) | 0]);
      m.material.opacity = 1; m.material.transparent = false;
      // A third of the pieces are big slabs, the rest are shards. Real debris is
      // never one grade of gravel.
      const big = i < n * 0.32;
      const grade = big ? CZ.rand(0.62, 1.0) : CZ.rand(0.2, 0.5);
      const sx = CZ.clamp(box.w / 2.6, 0.14, 0.9) * grade * CZ.rand(0.75, 1.3);
      const sy = CZ.clamp(box.h / 2.6, 0.14, 0.9) * grade * CZ.rand(0.75, 1.3);
      const sz = CZ.clamp((box.d ?? 1.6) / 2.4, 0.16, 0.9) * grade * CZ.rand(0.8, 1.3);
      m.scale.set(sx, sy, sz);
      m.position.set(box.x + Math.random() * box.w, box.y + Math.random() * box.h, (Math.random() - 0.5) * 1.7);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      m.castShadow = true; m.visible = true;
      // Away from the middle, plus the blow that caused it. Small shards take
      // the same push on less mass, so they go further and stop sooner.
      const dx = m.position.x - cx, dy = m.position.y - cy;
      const mass = 0.45 + grade;
      const kick = power / mass;
      m.userData = {
        vx: (dx * 2.6 + (opts.vx || 0) + dirX * CZ.rand(1, 7) + CZ.rand(-3.5, 3.5)) * kick,
        vy: (Math.abs(dy) * 2.1 + CZ.rand(2.5, 10) + (opts.vy || 0)) * kick,
        vz: CZ.rand(-2.2, 2.2),
        rx: CZ.rand(-11, 11) * kick, ry: CZ.rand(-11, 11) * kick, rz: CZ.rand(-11, 11) * kick,
        life: CZ.rand(3.0, 5.2), rest: false, half: sy / 2, mass,
        drag: big ? 0.25 : 0.9,            // shards lose their speed to the air
        floor: opts.floor ?? box.y, qx: -999, bounces: 0, recheck: CZ.rand(0.1, 0.35),
      };
      scene.add(m); chunks.push(m);
    }
    // the cloud the pieces come out of
    puff(cx, cy, Math.max(3, Math.round(n * 0.35)), {
      color: opts.dust ?? 0xcbb493, size: 0.34 + Math.min(box.w, 6) * 0.08,
      spread: Math.max(0.8, Math.min(box.w, box.h) * 0.5), blow: 2.2 * power,
      vx: opts.vx || 0, life: 0.95, opacity: 0.3,
    });
  }
  // Where a chunk would land if it kept falling from here.
  function groundUnder(m) {
    const u = m.userData;
    if (level && Math.abs(m.position.x - u.qx) > 0.5) {
      u.qx = m.position.x;
      u.floor = level.groundAt(m.position.x, m.position.y);
    }
    return u.floor + u.half;
  }
  function stepChunks(dt) {
    for (let i = chunks.length - 1; i >= 0; i--) {
      const m = chunks[i], u = m.userData;
      u.life -= dt;
      if (u.life <= 0) { scene.remove(m); chunks.splice(i, 1); chunkPool.push(m); continue; }
      if (u.life < 0.7) { m.material.transparent = true; m.material.opacity = u.life / 0.7; }
      // A pile can be resting on something that is about to stop existing —
      // the next crate in the wall, a gate that opens. Poke the floor now and
      // then, and if it has gone, fall.
      if (u.rest) {
        u.recheck -= dt;
        if (u.recheck <= 0) {
          u.recheck = CZ.rand(0.2, 0.4);
          if (level) {
            u.qx = m.position.x;
            u.floor = level.groundAt(m.position.x, m.position.y);
            if (m.position.y - (u.floor + u.half) > 0.06) { u.rest = false; u.vy = 0; }
          }
        }
        continue;
      }
      u.vy -= 46 * dt;
      const airK = Math.exp(-u.drag * dt);
      u.vx *= airK; u.vz *= airK;
      m.position.x += u.vx * dt; m.position.y += u.vy * dt; m.position.z += u.vz * dt;
      m.rotation.x += u.rx * dt; m.rotation.y += u.ry * dt; m.rotation.z += u.rz * dt;
      const floor = groundUnder(m);
      if (m.position.y <= floor) {
        const hard = u.vy < -7;
        m.position.y = floor;
        u.bounces++;
        // Less bounce every time, and the tumble bleeds into the slide.
        const e = 0.34 / (1 + u.bounces * 0.55);
        u.vy *= -e;
        u.vx *= 0.74; u.vz *= 0.5;
        u.rx *= 0.35; u.ry *= 0.45; u.rz *= 0.35;
        if (hard) puff(m.position.x, floor + 0.05, 1,
          { color: 0xb9a382, size: 0.35 + u.half, spread: 0.4, blow: 1.4, life: 0.55, opacity: 0.3 });
        if (Math.abs(u.vy) < 2.0) {
          // Down, but not done: it still has to slide to a stop.
          u.vy = 0;
          m.rotation.set(0, m.rotation.y, Math.round(m.rotation.z / (Math.PI / 2)) * (Math.PI / 2));
          if (Math.abs(u.vx) < 0.35) { u.rest = true; u.vx = 0; u.vz = 0; }
        }
      }
      // friction on the ground, so a heap keeps creeping for a beat
      if (!u.rest && u.vy === 0) {
        const f = 9 * dt, sgn = CZ.sign(u.vx);
        u.vx -= sgn * f;
        if (CZ.sign(u.vx) !== sgn) { u.vx = 0; u.rest = true; }
      }
    }
  }

  function shake(a) { shakeAmt = Math.max(shakeAmt, a); }
  function update(dt) {
    stepChunks(dt);
    stepDust(dt);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i], u = p.userData;
      u.life -= dt;
      if (u.life <= 0) { scene.remove(p); particles.splice(i, 1); pool.push(p); continue; }
      u.vy -= u.gravity * dt;
      p.position.x += u.vx * dt; p.position.y += u.vy * dt;
      p.rotation.z += u.rot * dt; p.rotation.x += u.rot * 0.5 * dt;
      const t = u.life / u.maxLife;
      p.material.opacity = Math.min(1, t * 2);
      const s = p.scale.x; p.scale.setScalar(Math.max(0.001, s * (1 - dt * 0.8)));
    }
    if (shakeAmt > 0.001) {
      shakeX = (Math.random() - 0.5) * shakeAmt; shakeY = (Math.random() - 0.5) * shakeAmt;
      shakeAmt *= Math.exp(-dt * 9);
    } else { shakeX = shakeY = 0; shakeAmt = 0; }
  }
  function clear() {
    for (const p of particles) scene.remove(p); particles.length = 0;
    for (const c of chunks) scene.remove(c); chunks.length = 0;
    for (const d of dust) scene.remove(d); dust.length = 0;
    level = null;
  }
  // Release the GPU geometry under an object tree. Materials and textures are
  // shared through the caches above, so they are deliberately left alone.
  function disposeTree(obj) {
    if (!obj) return;
    obj.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    if (obj.parent) obj.parent.remove(obj);
  }
  const getShake = () => ({ x: shakeX, y: shakeY });

  return { init, toon, basic, outline, edges, box, burst, smash, puff, setLevel, shake, update, clear, disposeTree, getShake };
})();
