// Level runtime: builds meshes from CZ.LEVELS data, animates dynamic pieces, exposes collision lists.
CZ.Level = class Level {
  constructor(data, scene) {
    this.data = data; this.scene = scene;
    this.theme = data.theme;
    this.group = new THREE.Group(); scene.add(this.group);
    this.solids = []; this.hazards = []; this.bounces = []; this.winds = []; this.hooks = [];
    this.checks = []; this.bugs = []; this.abilities = []; this.signs = []; this.dialogs = [];
    this.enemySpawns = []; this.exit = null; this.boss = null;
    this.time = 0; this.windStreaks = [];
    this.textures = {};
    this.build();
    this.buildBackground();
  }

  // ---------- textures ----------
  canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  crackTex() {
    if (this.textures.crack) return this.textures.crack;
    return this.textures.crack = this.canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#6b5236'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#2a1a0e'; g.lineWidth = 4; g.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        let x = Math.random() * w, y = 0; g.beginPath(); g.moveTo(x, y);
        while (y < h) { x += (Math.random() - 0.5) * 30; y += 10 + Math.random() * 20; g.lineTo(x, y); }
        g.stroke();
      }
      g.strokeStyle = '#3a2a1e'; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40); g.stroke(); }
    });
  }
  beltTex() {
    if (this.textures.belt) return this.textures.belt;
    const t = this.canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#333'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffcc33'; g.beginPath(); g.moveTo(0, 8); g.lineTo(24, 8); g.lineTo(40, h - 8); g.lineTo(16, h - 8); g.fill();
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return this.textures.belt = t;
  }
  signTex() {
    if (this.textures.sign) return this.textures.sign;
    return this.textures.sign = this.canvasTex(128, 80, (g, w, h) => {
      g.fillStyle = '#fff3c4'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c94f10'; g.font = 'bold 60px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', w / 2, h / 2 + 4);
    });
  }
  bugTex() {
    if (this.textures.bug) return this.textures.bug;
    return this.textures.bug = this.canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#ffd700'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2b1a0e'; g.fillRect(14, 6, 36, 22); g.fillStyle = '#fff'; g.fillRect(10, 36, 44, 22);
      g.fillStyle = '#2b1a0e'; g.font = 'bold 14px monospace'; g.fillText('BUG', 16, 52);
    });
  }

  // ---------- geometry helpers ----------
  addBlock(s) {
    const E = CZ.Effects, th = this.theme;
    let mesh;
    if (s.glitch) {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 3.6), new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.18 }));
      const wire = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0x39ff88, wireframe: true }));
      mesh.add(wire); s.wire = wire;
    } else if (s.corrupt) {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 3.8), new THREE.MeshToonMaterial({ color: 0xb455ff, transparent: true, opacity: 0.85, emissive: 0x3a0060 }));
      const wire = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0xff7bff, wireframe: true, transparent: true, opacity: 0.6 }));
      mesh.add(wire); mesh.castShadow = true;
    } else if (s.cracked) {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 3.8), new THREE.MeshToonMaterial({ map: this.crackTex(), color: 0xffffff }));
      mesh.castShadow = true; mesh.receiveShadow = true; E.edges(mesh);
    } else if (s.conveyor) {
      const tex = this.beltTex().clone(); tex.needsUpdate = true; tex.repeat.set(s.w / 1.5, 1);
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 3.4), new THREE.MeshToonMaterial({ map: tex, color: 0xffffff }));
      mesh.castShadow = true; mesh.receiveShadow = true; E.edges(mesh); s.tex = tex;
      // rollers
      for (let x = -s.w / 2 + 0.5; x < s.w / 2; x += 1.5) {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.6, 10), E.toon(0x444a55));
        r.rotation.x = Math.PI / 2; r.position.set(x, -s.h / 2 + 0.1, 0); mesh.add(r);
      }
    } else if (s.plat) {
      mesh = E.box(s.w, s.h, 3, th.plat); E.edges(mesh);
    } else {
      const big = s.h >= 1 && s.w >= 1;
      mesh = E.box(s.w, s.h, 4, s.mover ? th.plat : th.block); E.edges(mesh);
      if (big && !s.mover) {
        const top = E.box(s.w + 0.04, 0.28, 4.04, th.plat); top.position.y = s.h / 2 - 0.14; top.castShadow = false; mesh.add(top);
        // some studs on tall blocks for cartoon texture
        if (s.w > 4 && s.h > 3.5) {
          for (let i = 0; i < Math.min(8, Math.floor(s.w / 3)); i++) {
            const stud = E.box(0.7, 0.7, 0.2, th.blockAlt); stud.castShadow = false;
            stud.position.set(-s.w / 2 + 1.5 + i * 3 + ((i % 2) * 0.6), (Math.random() - 0.5) * (s.h - 1.6), 2.05); mesh.add(stud);
          }
        }
      }
      if (s.mover) { const und = E.box(s.w * 0.7, 0.35, 2.2, 0x333333); und.position.y = -s.h / 2 - 0.15; mesh.add(und); }
    }
    mesh.position.set(s.x + s.w / 2, s.y + s.h / 2, 0);
    s.mesh = mesh; this.group.add(mesh);
  }

  addHazard(hz) {
    const E = CZ.Effects; let mesh;
    const cx = hz.x + hz.w / 2, cy = hz.y + hz.h / 2;
    if (hz.kind === 'goo') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(hz.w, hz.h + 0.4, 4.2), new THREE.MeshToonMaterial({ color: 0xff8a1f, emissive: 0xff5500, emissiveIntensity: 0.4 }));
      mesh.position.set(cx, cy - 0.2, 0); hz.bubbleT = Math.random();
    } else if (hz.kind === 'spikes') {
      mesh = new THREE.Group(); mesh.position.set(cx, hz.y, 0);
      for (let x = -hz.w / 2 + 0.4; x < hz.w / 2; x += 0.75) for (let z = -1.2; z <= 1.2; z += 1.2) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.3, hz.h, 6), E.toon(0xb8c0c8)); c.position.set(x, hz.h / 2, z); c.castShadow = true; mesh.add(c);
        E.edges(c);
      }
    } else if (hz.kind === 'grater') {
      mesh = new THREE.Group(); mesh.position.set(cx, cy, 0);
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(hz.w / 2, hz.w / 2, 3.4, 12), E.toon(0xc8ccd4)); cyl.rotation.x = Math.PI / 2; cyl.castShadow = true; mesh.add(cyl); E.edges(cyl);
      for (let i = 0; i < 10; i++) { const d = E.box(0.2, 0.2, 0.2, 0x333); const a = i * 0.63; d.position.set(Math.cos(a) * hz.w / 2, Math.sin(a) * hz.w / 2, (i % 3 - 1) * 1.1); mesh.add(d); }
      hz.spin = cyl; hz.spinGroup = mesh;
    } else if (hz.kind === 'laser') {
      mesh = new THREE.Group(); mesh.position.set(cx, cy, 0);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(hz.w, hz.h, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2d55, transparent: true, opacity: 0.9 }));
      const core = new THREE.Mesh(new THREE.BoxGeometry(hz.w * 0.4, hz.h, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
      mesh.add(beam, core); hz.beam = beam; hz.core = core;
      const emitA = E.box(hz.w + 0.6, 0.4, 1, 0x333344), emitB = emitA.clone(); emitA.position.y = -hz.h / 2 - 0.2; emitB.position.y = hz.h / 2 + 0.2; mesh.add(emitA, emitB);
    } else if (hz.kind === 'press') {
      mesh = new THREE.Group(); mesh.position.set(cx, cy, 0);
      const body = E.box(hz.w, hz.h, 3.4, 0x8a2a2a); E.edges(body); mesh.add(body);
      const teeth = E.box(hz.w * 0.8, 0.3, 3, 0x222); teeth.position.y = -hz.h / 2 - 0.1; mesh.add(teeth);
      const pole = E.box(0.5, 14, 0.5, 0x555566); pole.position.y = hz.h / 2 + 7; mesh.add(pole);
      hz.y0 = hz.y;
    }
    hz.mesh = mesh; this.group.add(mesh);
  }

  addProp(kind, it) {
    const E = CZ.Effects, th = this.theme;
    let mesh = new THREE.Group();
    if (kind === 'bounce') {
      const pad = E.box(it.w, 0.5, 3, 0x39ff88); E.outline(pad, 0.08); pad.position.y = 0.25; mesh.add(pad); it.pad = pad;
      const base = E.box(it.w + 0.3, 0.3, 3.2, 0x2a2a2a); base.position.y = 0.05; mesh.add(base);
      mesh.position.set(it.x + it.w / 2, it.y, 0);
    } else if (kind === 'wind') {
      const vol = new THREE.Mesh(new THREE.BoxGeometry(it.w, it.h, 3), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.09, depthWrite: false }));
      mesh.add(vol);
      const fan = new THREE.Group(); fan.position.y = -it.h / 2 + 0.6;
      for (let i = 0; i < 4; i++) { const b = E.box(it.w * 0.42, 0.15, 0.8, 0x99a); b.position.x = it.w * 0.21; const piv = new THREE.Group(); piv.rotation.y = i * Math.PI / 2; piv.add(b); fan.add(piv); }
      mesh.add(fan); it.fan = fan;
      for (let i = 0; i < 10; i++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), new THREE.MeshBasicMaterial({ color: 0xdfffff, transparent: true, opacity: 0.5 }));
        st.position.set((Math.random() - 0.5) * it.w * 0.8, (Math.random() - 0.5) * it.h, (Math.random() - 0.5) * 2);
        mesh.add(st); this.windStreaks.push({ m: st, h: it.h, s: 6 + Math.random() * 6 });
      }
      mesh.position.set(it.x + it.w / 2, it.y + it.h / 2, 0);
    } else if (kind === 'hook') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.13, 8, 20), new THREE.MeshToonMaterial({ color: 0x43b8ff, emissive: 0x1050a0 }));
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      mesh.add(ring, core); it.ring = ring; mesh.position.set(it.x, it.y, 0);
    } else if (kind === 'check') {
      const pole = E.box(0.16, 2.6, 0.16, 0x444); pole.position.y = 1.3; mesh.add(pole);
      const flag = E.box(1.0, 0.7, 0.1, 0xff4b5c); flag.position.set(0.55, 2.2, 0); mesh.add(flag); it.flag = flag;
      mesh.position.set(it.x, it.y, 0);
    } else if (kind === 'bug') {
      const disk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.14), new THREE.MeshToonMaterial({ map: this.bugTex() })); E.outline(disk, 0.06);
      mesh.add(disk); it.disk = disk; mesh.position.set(it.x, it.y, 0.6);
    } else if (kind === 'ability') {
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), new THREE.MeshToonMaterial({ color: 0x39ff88, emissive: 0x108840 }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const ring2 = ring.clone(); ring2.rotation.x = Math.PI / 2;
      mesh.add(orb, ring, ring2); it.orb = orb; it.rings = [ring, ring2];
      const light = new THREE.PointLight(0x39ff88, 6, 8); mesh.add(light);
      mesh.position.set(it.x, it.y + 0.3, 0.5);
    } else if (kind === 'exit') {
      const c = th.accent;
      const l = E.box(0.5, 3.6, 1, c), r = l.clone(), top = E.box(3.2, 0.5, 1, c);
      l.position.set(-1.35, 1.8, 0); r.position.set(1.35, 1.8, 0); top.position.set(0, 3.55, 0);
      const portal = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
      portal.position.set(0, 1.6, 0); it.portal = portal;
      E.edges(l); E.edges(r); E.edges(top);
      mesh.add(l, r, top, portal); mesh.position.set(it.x, it.y, 0);
      const light = new THREE.PointLight(0xffffff, 8, 10); light.position.y = 2; mesh.add(light);
    } else if (kind === 'sign') {
      const post = E.box(0.16, 1.4, 0.16, 0x6b4a2a); post.position.y = 0.7; mesh.add(post);
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 0.12), new THREE.MeshToonMaterial({ map: this.signTex() })); E.outline(board, 0.06);
      board.position.y = 1.7; mesh.add(board);
      mesh.position.set(it.x, it.y, 1.2);
    }
    it.mesh = mesh; this.group.add(mesh);
  }

  build() {
    for (const raw of this.data.items) {
      const it = { ...raw };
      switch (it.t) {
        case 'solid':
          it.x0 = it.x; it.y0 = it.y; it.vx = 0; it.vy = 0; it.broken = false;
          this.addBlock(it); this.solids.push(it); break;
        case 'hazard': it.active = true; this.addHazard(it); this.hazards.push(it); break;
        case 'bounce': this.addProp('bounce', it); this.bounces.push(it); break;
        case 'wind': this.addProp('wind', it); this.winds.push(it); break;
        case 'hook': this.addProp('hook', it); this.hooks.push(it); break;
        case 'check': it.active = false; this.addProp('check', it); this.checks.push(it); break;
        case 'bug': it.taken = false; this.addProp('bug', it); this.bugs.push(it); break;
        case 'ability': it.taken = false; this.addProp('ability', it); this.abilities.push(it); break;
        case 'exit': this.addProp('exit', it); this.exit = it; break;
        case 'sign': this.addProp('sign', it); this.signs.push(it); break;
        case 'dialog': it.done = false; this.dialogs.push(it); break;
        case 'enemy': this.enemySpawns.push(it); break;
        case 'boss': this.boss = it; break;
      }
    }
    this.bugTotal = this.bugs.length;
  }

  // ---------- background ----------
  buildBackground() {
    const E = CZ.Effects, th = this.theme, W = this.data.width;
    const bg = new THREE.Group(); this.bgGroup = bg; this.group.add(bg);
    // gradient sky plane that follows the camera
    const sky = this.canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    this.skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(320, 180), new THREE.MeshBasicMaterial({ map: sky, depthWrite: false }));
    this.skyMesh.position.set(0, 20, -80); this.scene.add(this.skyMesh);
    // far floor slab (so the world has a visual bottom)
    const abyss = new THREE.Mesh(new THREE.PlaneGeometry(W + 200, 60), new THREE.MeshBasicMaterial({ color: th.sky[0], transparent: true, opacity: 0.8, depthWrite: false }));
    abyss.position.set(W / 2, this.data.deathY - 32, -6); bg.add(abyss);

    const rnd = CZ.rand;
    const themeProp = () => {
      switch (th.bg) {
        case 'cellar': {
          if (Math.random() < 0.5) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.2, 20), E.toon(0xf0b040)); wheel.rotation.x = Math.PI / 2; const rind = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.3, 8, 20), E.toon(0xc94f10)); wheel.add(rind); return wheel; }
          const b = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3.2, 12), E.toon(0x7a4a22)); for (let i = -1; i <= 1; i++) { const h = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.1, 6, 16), E.toon(0x333)); h.rotation.x = Math.PI / 2; h.position.y = i * 1.1; b.add(h); } return b;
        }
        case 'factory': case 'boxes': {
          if (th.bg === 'boxes' && Math.random() < 0.6) { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = E.box(2.6, 2.6, 2.6, [0xb8865a, 0xc99a6a, 0xa87a4a][i]); b.position.set((Math.random() - 0.5) * 0.8, i * 2.65, 0); g.add(b); E.edges(b); } return g; }
          const gear = new THREE.Group(); const r = 1.5 + Math.random() * 2;
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.6, 10), E.toon(0x556070)); disc.rotation.x = Math.PI / 2; gear.add(disc);
          for (let i = 0; i < 10; i++) { const t = E.box(0.6, 0.7, 0.6, 0x556070); const a = i / 10 * Math.PI * 2; t.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); t.rotation.z = a; gear.add(t); }
          gear.userData.spin = (Math.random() < 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5); return gear;
        }
        case 'vats': { const g = new THREE.Group(); const v = new THREE.Mesh(new THREE.CylinderGeometry(3, 2.4, 5, 16), E.toon(0x3a2a2a)); g.add(v); const top = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.4, 16), new THREE.MeshBasicMaterial({ color: 0xff7a1f })); top.position.y = 2.5; g.add(top); const l = new THREE.PointLight(0xff6a1f, 6, 14); l.position.y = 3.5; g.add(l); return g; }
        case 'vents': { const g = new THREE.Group(); const d = E.box(6 + Math.random() * 6, 2.2, 2.2, 0x7f98b0); E.edges(d); g.add(d); if (Math.random() < 0.5) { const f = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = E.box(1.6, 0.3, 0.2, 0x445); b.position.x = 0.8; const p = new THREE.Group(); p.rotation.z = i * Math.PI * 2 / 3; p.add(b); f.add(p); } f.position.z = 1.3; f.userData.spin = 3; g.add(f); } return g; }
        case 'digital': { const c = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 3, 2 + Math.random() * 3, 2), new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0x39ff88 : 0xb455ff, wireframe: true, transparent: true, opacity: 0.5 })); c.userData.spin = 0.4; return c; }
        case 'heaven': { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1.2 + Math.random() * 1.4, 12, 10), E.toon(0xffffff)); s.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2); g.add(s); } return g; }
      }
      return E.box(2, 2, 2, th.blockAlt);
    };
    for (let layer = 0; layer < 3; layer++) {
      const z = [-10, -18, -30][layer], count = Math.ceil(W / [22, 14, 10][layer]);
      for (let i = 0; i < count; i++) {
        const p = themeProp(); const sc = [0.7, 1.1, 1.8][layer];
        p.scale.setScalar(sc); p.position.set(rnd(-10, W + 10), rnd(-4, 10) + layer * 5 + (th.bg === 'heaven' ? rnd(0, 14) : 0), z + rnd(-1.5, 1.5));
        p.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
        bg.add(p);
      }
    }
    if (th.bg === 'digital') {
      const grid = new THREE.GridHelper(400, 80, 0x39ff88, 0x2a2a6a); grid.position.set(W / 2, this.data.deathY - 4, -10); grid.material.transparent = true; grid.material.opacity = 0.35; bg.add(grid);
    }
    if (th.bg === 'cellar' || th.bg === 'vats' || th.bg === 'boxes') {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(W + 100, 90), E.toon(th.bg === 'boxes' ? 0x9fb8cc : th.blockAlt)); wall.position.set(W / 2, 20, -32); wall.receiveShadow = false; bg.add(wall);
    }
  }

  // ---------- per-frame ----------
  update(dt, playerX) {
    this.time += dt;
    const t = this.time;
    for (const s of this.solids) {
      if (s.mover) {
        const k = 0.5 - 0.5 * Math.cos((t / s.period) * Math.PI * 2 + s.phase);
        const nx = s.x0 + s.dx * k, ny = s.y0 + s.dy * k;
        s.vx = (nx - s.x) / dt; s.vy = (ny - s.y) / dt; s.x = nx; s.y = ny;
        s.mesh.position.set(s.x + s.w / 2, s.y + s.h / 2, 0);
      }
      if (s.conveyor && s.tex) s.tex.offset.x -= s.conveyor * dt * 0.35;
      if (s.glitch) { s.mesh.material.opacity = 0.14 + 0.08 * Math.sin(t * 9 + s.x); s.wire.visible = (t * 6 + s.x) % 1 > 0.15; }
      if (s.corrupt) { s.mesh.material.opacity = 0.75 + 0.15 * Math.sin(t * 13 + s.y * 2); s.mesh.position.x = s.x + s.w / 2 + ((Math.random() < 0.04) ? (Math.random() - 0.5) * 0.15 : 0); }
    }
    for (const hz of this.hazards) {
      if (hz.kind === 'laser') {
        const ph = ((t / hz.period) + hz.phase) % 1, onFrac = hz.on / hz.period;
        hz.active = ph < onFrac;
        const warn = ph > 1 - 0.3 / hz.period;
        hz.beam.material.opacity = hz.active ? 0.85 + 0.15 * Math.sin(t * 40) : warn ? 0.12 + 0.1 * Math.sin(t * 30) : 0.04;
        hz.core.visible = hz.active;
        hz.beam.scale.x = hz.active ? 1 : 0.35;
      } else if (hz.kind === 'press') {
        const k = 0.5 - 0.5 * Math.cos((t / hz.period) * Math.PI * 2 + hz.phase);
        hz.y = hz.y0 + hz.dy * k; hz.mesh.position.y = hz.y + hz.h / 2;
      } else if (hz.kind === 'grater') {
        hz.spin.rotation.y += dt * 6; hz.spinGroup.rotation.z += dt * 6;
      } else if (hz.kind === 'goo') {
        hz.mesh.position.y = hz.y + hz.h / 2 - 0.2 + Math.sin(t * 2 + hz.x) * 0.06;
        hz.bubbleT -= dt;
        if (hz.bubbleT < 0 && Math.abs(hz.x + hz.w / 2 - playerX) < 30) { hz.bubbleT = 0.25 + Math.random() * 0.5; CZ.Effects.burst(hz.x + Math.random() * hz.w, hz.y + hz.h, 0xffb347, 1, { spread: 0.5, up: 3, life: 0.6, gravity: 4, size: 0.7, z: 1.5 }); }
      }
    }
    for (const b of this.bounces) b.pad.scale.y = CZ.damp(b.pad.scale.y, 1, 12, dt);
    for (const w of this.winds) w.fan.rotation.y += dt * 14;
    for (const st of this.windStreaks) { st.m.position.y += st.s * dt; if (st.m.position.y > st.h / 2) st.m.position.y = -st.h / 2; }
    for (const h of this.hooks) { h.ring.rotation.y += dt * 2; h.ring.rotation.x = Math.sin(t) * 0.4; h.mesh.position.y = h.y + Math.sin(t * 2 + h.x) * 0.1; }
    for (const b of this.bugs) if (!b.taken) { b.disk.rotation.y += dt * 3; b.mesh.position.y = b.y + Math.sin(t * 3 + b.x) * 0.15; }
    for (const a of this.abilities) if (!a.taken) { a.orb.rotation.y += dt * 2; a.orb.rotation.z += dt; a.rings[0].rotation.z += dt * 1.5; a.rings[1].rotation.y += dt * 1.2; a.mesh.position.y = a.y + 0.6 + Math.sin(t * 2.5) * 0.2; const s = 1 + Math.sin(t * 6) * 0.08; a.orb.scale.setScalar(s); }
    if (this.exit) this.exit.portal.material.opacity = 0.45 + 0.2 * Math.sin(t * 3);
    for (const c of this.checks) if (c.active) c.flag.rotation.y = Math.sin(t * 6) * 0.25;
    this.bgGroup.children.forEach(o => { if (o.userData.spin) o.rotation.z += o.userData.spin * dt; });
  }

  // Blocking solids for an entity with the given phase flags.
  solidFor(s, f) {
    if (s.broken) return false;
    if (s.glitch && (f.dashing || f.inGlitch)) return false;
    if (s.corrupt && (f.noclip || f.inCorrupt)) return false;
    return true;
  }
  blocking(f = {}) { const out = []; for (const s of this.solids) if (this.solidFor(s, f)) out.push(s); return out; }

  breakCracked(s) {
    if (s.broken) return; s.broken = true; s.mesh.visible = false;
    CZ.Effects.burst(s.x + s.w / 2, s.y + s.h / 2, 0x6b5236, 22, { spread: 9, up: 6, life: 1, size: 1.6 });
    CZ.Audio.sfx.crack(); CZ.Effects.shake(0.5);
  }

  setSky(camX, camY) { this.skyMesh.position.x = camX; this.skyMesh.position.y = camY + 10; }

  dispose() {
    this.scene.remove(this.group); this.scene.remove(this.skyMesh);
    this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const k in this.textures) this.textures[k].dispose();
  }
};
