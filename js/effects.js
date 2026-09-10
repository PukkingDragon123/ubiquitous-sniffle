// Toon materials, outlines, particles, screen shake.
CZ.Effects = (() => {
  let scene = null, gradientMap = null;
  const matCache = new Map();
  const particles = [];
  let shakeAmt = 0, shakeX = 0, shakeY = 0;
  let particleGeo = null, pool = [];

  function init(s) {
    scene = s;
    const colors = new Uint8Array([60, 120, 200, 255]);
    gradientMap = new THREE.DataTexture(colors, colors.length, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter; gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
    particleGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    particles.length = 0; pool = [];
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
  function shake(a) { shakeAmt = Math.max(shakeAmt, a); }
  function update(dt) {
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
  function clear() { for (const p of particles) scene.remove(p); particles.length = 0; }
  // Release the GPU geometry under an object tree. Materials and textures are
  // shared through the caches above, so they are deliberately left alone.
  function disposeTree(obj) {
    if (!obj) return;
    obj.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    if (obj.parent) obj.parent.remove(obj);
  }
  const getShake = () => ({ x: shakeX, y: shakeY });

  return { init, toon, basic, outline, edges, box, burst, shake, update, clear, disposeTree, getShake };
})();
