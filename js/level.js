// Level runtime: builds pixel-textured meshes from CZ.LEVELS data, animates the
// dynamic pieces, and answers collision queries. Three parallax depths plus a
// foreground layer give every world a background / midground / foreground.
CZ.Level = class Level {
  constructor(data, scene) {
    this.data = data; this.scene = scene;
    this.theme = data.theme;
    this.group = new THREE.Group(); scene.add(this.group);
    this.solids = []; this.hazards = []; this.bounces = []; this.winds = []; this.hooks = [];
    this.checks = []; this.bugs = []; this.abilities = []; this.signs = []; this.dialogs = [];
    this.enemySpawns = []; this.exit = null; this.boss = null;
    this.time = 0; this.windStreaks = []; this.drips = []; this.spinners = []; this.decos = [];
    this.build();
    this.buildScenery();
  }

  tileTex(w, h) { const t = this.theme.tile; return CZ.Tex.tiled(t[0], t[1], w, h); }
  flat(color, opts = {}) { return new THREE.MeshToonMaterial({ color, ...opts }); }

  // ---------- blocks ----------
  addBlock(s) {
    const E = CZ.Effects, th = this.theme;
    let mesh;
    if (s.glitch) {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 3.6), new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.16 }));
      const wire = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0x39ff88, wireframe: true }));
      mesh.add(wire); s.wire = wire;
    } else if (s.corrupt) {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 3.8), new THREE.MeshToonMaterial({ color: 0xb455ff, transparent: true, opacity: 0.88, emissive: 0x3a0060 }));
      mesh.add(new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0xff7bff, wireframe: true, transparent: true, opacity: 0.55 })));
      mesh.castShadow = true;
    } else if (s.cracked) {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 3.8), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('crack', 'stone', s.w, s.h) }));
      mesh.castShadow = true; mesh.receiveShadow = true; E.edges(mesh);
    } else if (s.conveyor) {
      const t = CZ.Tex.get('belt', 'steel').clone(); t.needsUpdate = true; t.repeat.set(s.w / 2, 1);
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 3.4), new THREE.MeshToonMaterial({ map: t }));
      mesh.castShadow = true; mesh.receiveShadow = true; E.edges(mesh); s.tex = t;
      for (let x = -s.w / 2 + 0.6; x < s.w / 2; x += 1.6) {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 3.6, 6), this.flat(0x4a5060));
        r.rotation.x = Math.PI / 2; r.position.set(x, -s.h / 2 + 0.12, 0); mesh.add(r);
      }
    } else if (s.plat) {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 3), new THREE.MeshToonMaterial({ map: this.tileTex(s.w, 1), color: 0xd8d8d8 }));
      mesh.castShadow = true; mesh.receiveShadow = true; E.edges(mesh);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.06, 0.18, 3.06), this.flat(th.plat));
      lip.position.y = s.h / 2 - 0.06; lip.castShadow = false; mesh.add(lip);
    } else if (s.skin === 'barrel') {
      // a barrel on its side: cylinder art, box collision
      mesh = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(s.h / 2, s.h / 2, s.w, 12),
        new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('wood', 'timber', s.w, 3) }));
      body.rotation.z = Math.PI / 2; body.castShadow = true; body.receiveShadow = true; mesh.add(body);
      for (const off of [-0.32, 0.32]) {
        const hoop = new THREE.Mesh(new THREE.CylinderGeometry(s.h / 2 + 0.06, s.h / 2 + 0.06, 0.22, 12), this.flat(0x3b3038));
        hoop.rotation.z = Math.PI / 2; hoop.position.x = s.w * off; mesh.add(hoop);
      }
      const plank = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.22, 2.4), this.flat(0x8a5a2b));
      plank.position.y = s.h / 2 - 0.05; mesh.add(plank);
    } else if (s.skin === 'counter') {
      mesh = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 4), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('wood', 'timber', s.w, s.h) }));
      body.castShadow = true; body.receiveShadow = true; E.edges(body); mesh.add(body);
      const top = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.5, 0.42, 4.5), this.flat(0xcfc3ae));
      top.position.y = s.h / 2 + 0.1; mesh.add(top); E.edges(top);
      for (let x = -s.w / 2 + 1.6; x < s.w / 2; x += 3.4) {
        const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, s.h - 1.2, 0.2), this.flat(0x5c3a1c));
        door.position.set(x, -0.2, 2.05); mesh.add(door);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), this.flat(0xd8c07a));
        knob.position.set(x + 0.9, -0.2, 2.2); mesh.add(knob);
      }
    } else if (s.skin === 'drain') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 4), this.flat(0x2b2229));
      mesh.receiveShadow = true;
    } else {
      const pal = s.skin === 'wood' ? ['wood', 'timber'] : this.theme.tile;
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 4), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled(pal[0], pal[1], s.w, s.h) }));
      mesh.castShadow = true; mesh.receiveShadow = true; E.edges(mesh);
      if (s.mover) {
        mesh.material = new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('plate', 'steel', s.w, Math.max(1, s.h)) });
        const und = new THREE.Mesh(new THREE.BoxGeometry(s.w * 0.7, 0.35, 2.2), this.flat(0x2a2a2e));
        und.position.y = -s.h / 2 - 0.15; mesh.add(und);
      } else if (s.h >= 1 && s.w >= 1) {
        // bright capping strip so the standable surface reads instantly
        const top = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.05, 0.3, 4.05), this.flat(th.plat));
        top.position.y = s.h / 2 - 0.15; top.castShadow = false; mesh.add(top);
        const lipDark = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.05, 0.12, 4.06), this.flat(th.blockAlt));
        lipDark.position.y = s.h / 2 - 0.36; lipDark.castShadow = false; mesh.add(lipDark);
        if (s.w >= 5 && s.y > 1.5) this.addDrips(mesh, s);
      }
    }
    mesh.position.set(s.x + s.w / 2, s.y + s.h / 2, 0);
    s.mesh = mesh; this.group.add(mesh);
  }

  // Molten cheese oozing off a ledge — a slow stretch, a drop, repeat.
  addDrips(mesh, s) {
    const n = Math.min(3, Math.floor(s.w / 12));
    for (let i = 0; i < n; i++) {
      if (Math.random() > 0.55) continue;
      const g = new THREE.Group();
      const x = -s.w / 2 + 1.5 + Math.random() * (s.w - 3);
      g.position.set(x, -s.h / 2 + 0.15, 1.4);
      
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.3, 0.3), new THREE.MeshToonMaterial({ color: 0xffcc33 }));
      lip.position.y = 0.1; g.add(lip);
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1, 0.34), new THREE.MeshToonMaterial({ color: 0xffcc33 }));
      stem.position.y = -0.5; g.add(stem);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), new THREE.MeshToonMaterial({ color: 0xffe066 }));
      bulb.position.y = -1; g.add(bulb);
      mesh.add(g);
      this.drips.push({ g, stem, bulb, t: Math.random() * 4, x: s.x + s.w / 2 + x, y: s.y });
    }
  }

  addHazard(hz) {
    const E = CZ.Effects; let mesh;
    const cx = hz.x + hz.w / 2, cy = hz.y + hz.h / 2;
    if (hz.kind === 'goo') {
      const t = CZ.Tex.get('goo', 'magma').clone(); t.needsUpdate = true; t.repeat.set(hz.w / 2, 1);
      mesh = new THREE.Mesh(new THREE.BoxGeometry(hz.w, hz.h + 0.4, 4.2), new THREE.MeshBasicMaterial({ map: t }));
      mesh.position.set(cx, cy - 0.2, 0); hz.bubbleT = Math.random(); hz.tex = t;
    } else if (hz.kind === 'spikes') {
      mesh = new THREE.Group(); mesh.position.set(cx, hz.y, 0);
      for (let x = -hz.w / 2 + 0.4; x < hz.w / 2; x += 0.75) for (let z = -1.2; z <= 1.2; z += 1.2) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.3, hz.h, 4), this.flat(0xc8ccd4));
        c.position.set(x, hz.h / 2, z); c.rotation.y = Math.PI / 4; c.castShadow = true; mesh.add(c); E.edges(c);
      }
    } else if (hz.kind === 'grater') {
      mesh = new THREE.Group(); mesh.position.set(cx, cy, 0);
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(hz.w / 2, hz.w / 2, 3.4, 8), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('plate', 'steel', 3, 2) }));
      cyl.rotation.x = Math.PI / 2; cyl.castShadow = true; mesh.add(cyl); E.edges(cyl);
      for (let i = 0; i < 12; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), this.flat(0x2a2a2e)); const a = i * 0.52; d.position.set(Math.cos(a) * hz.w / 2, Math.sin(a) * hz.w / 2, (i % 3 - 1) * 1.1); mesh.add(d); }
      hz.spinGroup = mesh;
    } else if (hz.kind === 'laser') {
      mesh = new THREE.Group(); mesh.position.set(cx, cy, 0);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(hz.w, hz.h, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2d55, transparent: true, opacity: 0.9 }));
      const core = new THREE.Mesh(new THREE.BoxGeometry(hz.w * 0.4, hz.h, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
      mesh.add(beam, core); hz.beam = beam; hz.core = core;
      const emitA = new THREE.Mesh(new THREE.BoxGeometry(hz.w + 0.7, 0.5, 1.1), this.flat(0x3b4855)), emitB = emitA.clone();
      emitA.position.y = -hz.h / 2 - 0.25; emitB.position.y = hz.h / 2 + 0.25; mesh.add(emitA, emitB);
    } else if (hz.kind === 'press') {
      mesh = new THREE.Group(); mesh.position.set(cx, cy, 0);
      const body = new THREE.Mesh(new THREE.BoxGeometry(hz.w, hz.h, 3.4), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('plate', 'steel', hz.w, hz.h), color: 0xff8888 }));
      E.edges(body); mesh.add(body);
      const teeth = new THREE.Mesh(new THREE.BoxGeometry(hz.w * 0.85, 0.3, 3), this.flat(0x2a2a2e)); teeth.position.y = -hz.h / 2 - 0.12; mesh.add(teeth);
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.5, 14, 0.5), this.flat(0x5a6472)); pole.position.y = hz.h / 2 + 7; mesh.add(pole);
      hz.y0 = hz.y;
    }
    hz.mesh = mesh; this.group.add(mesh);
  }

  addProp(kind, it) {
    const E = CZ.Effects, th = this.theme;
    let mesh = new THREE.Group();
    if (kind === 'bounce') {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(it.w, 0.5, 3), this.flat(0x39ff88));
      E.outline(pad, 0.09); pad.position.y = 0.25; mesh.add(pad); it.pad = pad;
      const base = new THREE.Mesh(new THREE.BoxGeometry(it.w + 0.3, 0.3, 3.2), this.flat(0x1f9c53)); base.position.y = 0.05; mesh.add(base);
      mesh.position.set(it.x + it.w / 2, it.y, 0);
    } else if (kind === 'wind') {
      mesh.add(new THREE.Mesh(new THREE.BoxGeometry(it.w, it.h, 3), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.08, depthWrite: false })));
      const fan = new THREE.Group(); fan.position.y = -it.h / 2 + 0.6;
      for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(it.w * 0.42, 0.18, 0.8), this.flat(0x93a6ba)); b.position.x = it.w * 0.21; const piv = new THREE.Group(); piv.rotation.y = i * Math.PI / 2; piv.add(b); fan.add(piv); }
      mesh.add(fan); it.fan = fan;
      for (let i = 0; i < 10; i++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), new THREE.MeshBasicMaterial({ color: 0xdfffff, transparent: true, opacity: 0.5 }));
        st.position.set((Math.random() - 0.5) * it.w * 0.8, (Math.random() - 0.5) * it.h, (Math.random() - 0.5) * 2);
        mesh.add(st); this.windStreaks.push({ m: st, h: it.h, s: 6 + Math.random() * 6 });
      }
      mesh.position.set(it.x + it.w / 2, it.y + it.h / 2, 0);
    } else if (kind === 'hook') {
      // blocky ring: eight cubes instead of a smooth torus
      const ring = new THREE.Group();
      for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshToonMaterial({ color: 0x43b8ff, emissive: 0x1d5f9e })); const a = i / 8 * Math.PI * 2; c.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0); ring.add(c); }
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      mesh.add(ring, core); it.ring = ring; mesh.position.set(it.x, it.y, 0);
    } else if (kind === 'check') {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.18), this.flat(0x4a2c12)); pole.position.y = 1.3; mesh.add(pole);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.12), this.flat(0xff4b5c)); flag.position.set(0.55, 2.2, 0); mesh.add(flag); it.flag = flag;
      mesh.position.set(it.x, it.y, 0);
    } else if (kind === 'bug') {
      const disk = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: CZ.Tex.sprite('bug', 4), transparent: true, side: THREE.DoubleSide }));
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.12), this.flat(0xffd700)); back.position.z = -0.09;
      mesh.add(disk, back); it.disk = mesh; mesh.position.set(it.x, it.y, 0.7);
    } else if (kind === 'ability' && it.limb) {
      // a body part lying where it fell, spinning under a glow
      const spr = CZ.LIMBS[it.id].ico;
      const card = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: CZ.Tex.sprite(spr, 6), transparent: true, side: THREE.DoubleSide }));
      mesh.add(card); it.orb = card; it.rings = [];
      const halo = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.15, 16), new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
      mesh.add(halo); it.rings.push(halo);
      mesh.add(new THREE.PointLight(0xffd27a, 5, 9));
      mesh.position.set(it.x, it.y + 0.9, 0.6);
    } else if (kind === 'ability') {
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), new THREE.MeshToonMaterial({ color: 0x39ff88, emissive: 0x108840 }));
      const r1 = new THREE.Group(), r2 = new THREE.Group();
      for (const [grp, ax] of [[r1, 'z'], [r2, 'y']]) for (let i = 0; i < 10; i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        const a = i / 10 * Math.PI * 2;
        if (ax === 'z') c.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0); else c.position.set(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95);
        grp.add(c);
      }
      mesh.add(orb, r1, r2); it.orb = orb; it.rings = [r1, r2];
      mesh.add(new THREE.PointLight(0x39ff88, 6, 8));
      mesh.position.set(it.x, it.y + 0.3, 0.5);
    } else if (kind === 'exit') {
      const c = th.accent;
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.6, 1), this.flat(c)), r = l.clone();
      const top = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.55, 1), this.flat(c));
      l.position.set(-1.38, 1.8, 0); r.position.set(1.38, 1.8, 0); top.position.set(0, 3.58, 0);
      const portal = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
      portal.position.set(0, 1.6, 0); it.portal = portal;
      E.edges(l); E.edges(r); E.edges(top);
      mesh.add(l, r, top, portal); mesh.position.set(it.x, it.y, 0);
      const light = new THREE.PointLight(0xffffff, 8, 10); light.position.y = 2; mesh.add(light);
    } else if (kind === 'sign') {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.2), this.flat(0x4a2c12)); post.position.y = 0.7; mesh.add(post);
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.95, 0.14), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('card', 'cardboard', 1.4, 1) }));
      board.position.y = 1.75; mesh.add(board); E.edges(board);
      const bang = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: CZ.Tex.sprite('bang', 4), transparent: true }));
      bang.position.set(0, 1.75, 0.08); mesh.add(bang);
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
        case 'deco': this.addDeco(it); break;
        case 'boss': this.boss = it; break;
      }
    }
    this.bugTotal = this.bugs.length;
  }

  // ---------- room dressing ----------
  // Props that make the cellar read as a place someone works in.
  addDeco(it) {
    const E = CZ.Effects, F = c => this.flat(c);
    const g = new THREE.Group();
    const timber = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('wood', 'timber', w, h) }));
    switch (it.kind) {
      case 'lamp': {
        const chain = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), F(0x3b3038)); chain.position.y = 1.2; g.add(chain);
        const shade = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.9, 8, 1, true), new THREE.MeshToonMaterial({ color: 0x4a3a2a, side: THREE.DoubleSide }));
        shade.position.y = -0.3; g.add(shade);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe6a8 }));
        bulb.position.y = -0.8; g.add(bulb);
        const light = new THREE.PointLight(0xffc266, 3.4, 26); light.position.y = -1.4; g.add(light);
        it.bulb = bulb; it.lamp = light;
        break;
      }
      case 'rack': {          // wine rack against the wall
        const frame = timber(4.6, 5.6, 1.6); frame.position.y = 2.8; g.add(frame); E.edges(frame);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 8), F(0x1a1016));
          hole.rotation.x = Math.PI / 2; hole.position.set(-1.4 + c * 1.4, 1.3 + r * 1.5, 0.85); g.add(hole);
          const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.24, 8), F(Math.random() < 0.5 ? 0x6b2436 : 0x3f5a2a));
          cork.rotation.x = Math.PI / 2; cork.position.set(-1.4 + c * 1.4, 1.3 + r * 1.5, 0.95); g.add(cork);
        }
        break;
      }
      case 'crate': {
        const n = it.stack || 1;
        for (let i = 0; i < n; i++) {
          const c = timber(2.1, 2.1, 2.1); c.position.set(CZ.rand(-0.2, 0.2), 1.05 + i * 2.15, 0); c.castShadow = true; g.add(c); E.edges(c);
        }
        break;
      }
      case 'web': {           // cobweb wedge plus a resident
        const web = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: CZ.Tex.custom('web', 32, (x, S) => {
          x.strokeStyle = '#e8e2d8'; x.lineWidth = 1;
          for (let i = 1; i <= 5; i++) { x.beginPath(); x.arc(0, S, i * 6, 0, Math.PI / 2); x.stroke(); }
          for (let i = 0; i <= 5; i++) { x.beginPath(); x.moveTo(0, S); x.lineTo(Math.cos(i * 0.31) * S, S - Math.sin(i * 0.31) * S); x.stroke(); }
        }), transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
        web.position.set(0, 0, 0.5); g.add(web);
        const sp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), F(0x1a1016));
        sp.position.set(-0.9, -1.0, 0.7); g.add(sp); it.spider = sp;
        break;
      }
      case 'cheesewheel': {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.8, 14), new THREE.MeshToonMaterial({ map: CZ.Tex.get('cheese', 'stone') }));
        w.position.y = 0.4; w.castShadow = true; g.add(w);
        const rind = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.26, 14), F(0xd98a2a)); rind.position.y = 0.4; g.add(rind);
        const cut = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 14, 1, false, 0, 1.1), new THREE.MeshToonMaterial({ map: CZ.Tex.get('cheese', 'stone') }));
        cut.position.set(0.5, 1.05, 0.4); cut.rotation.z = 0.25; g.add(cut);
        break;
      }
      case 'knifeblock': {
        const b = timber(1.3, 1.4, 1.1); b.position.y = 0.7; b.rotation.z = -0.12; g.add(b); E.edges(b);
        for (const dx of [-0.3, 0, 0.3]) {
          const h = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), F(0x2b2229));
          h.position.set(dx, 1.7, 0); h.rotation.z = -0.12 + dx * 0.2; g.add(h);
        }
        break;
      }
      case 'bottle': {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.0, 8), F(0x2f5a34)); body.position.y = 0.5; g.add(body);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.7, 8), F(0x2f5a34)); neck.position.y = 1.3; g.add(neck);
        const label = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.42, 8), F(0xe8dcc0)); label.position.y = 0.52; g.add(label);
        break;
      }
      case 'shelf': {
        const board = timber(4.4, 0.3, 1.6);
        for (let i = 0; i < 3; i++) { const b = board.clone(); b.position.y = 1.4 + i * 1.8; g.add(b); }
        for (const dx of [-2, 2]) { const post = timber(0.3, 5.6, 1.6); post.position.set(dx, 2.8, 0); g.add(post); }
        for (let i = 0; i < 5; i++) {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10), new THREE.MeshToonMaterial({ map: CZ.Tex.get('cheese', 'stone') }));
          w.rotation.x = Math.PI / 2; w.position.set(CZ.rand(-1.6, 1.6), 1.75 + ((i % 3) * 1.8), 0.1); g.add(w);
        }
        break;
      }
      case 'press': {         // the giant cheese maker: hopper, screw, wheel, pipes
        const frame = new THREE.Mesh(new THREE.BoxGeometry(16, 13, 5), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('plate', 'steel', 16, 13), color: 0x9a8b7a }));
        frame.position.y = 6.5; g.add(frame); E.edges(frame);
        const hopper = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 2.2, 4.4, 10), this.flat(0xb98f4e));
        hopper.position.y = 14.4; g.add(hopper); E.edges(hopper);
        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.6, 8), this.flat(0x8a6a3a)); spout.position.y = 11.4; g.add(spout);
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.42, 6, 14), this.flat(0x7a3a2a));
        wheel.position.set(-6.6, 8.5, 2.9); g.add(wheel); it.wheel = wheel;
        for (let i = 0; i < 6; i++) { const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 0.3), this.flat(0x7a3a2a)); spoke.rotation.z = i * 0.52; spoke.position.copy(wheel.position); g.add(spoke); (it.spokes = it.spokes || []).push(spoke); }
        for (const [px, py, pl] of [[7.4, 10, 7], [7.4, 4, 5]]) {
          const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, pl, 8), this.flat(0x6a5f55));
          pipe.rotation.z = Math.PI / 2; pipe.position.set(px + pl / 2, py, 1.2); g.add(pipe);
        }
        const belt = new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 3), this.flat(0x2f2a30)); belt.position.set(-11, 2.4, 1); g.add(belt);
        for (let i = 0; i < 3; i++) {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.55, 12), new THREE.MeshToonMaterial({ map: CZ.Tex.get('cheese', 'stone') }));
          w.rotation.x = Math.PI / 2; w.position.set(-13.5 + i * 2.6, 3, 1); g.add(w);
        }
        break;
      }
      case 'vat': {
        const v = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.6, 6, 12), this.flat(0xa06a3a));
        v.position.y = 3; g.add(v); E.edges(v);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.28, 6, 14), this.flat(0xc98a4a));
        lip.rotation.x = Math.PI / 2; lip.position.y = 6; g.add(lip);
        const milk = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 0.3, 12), new THREE.MeshBasicMaterial({ color: 0xfff3d0 }));
        milk.position.y = 5.9; g.add(milk); it.milk = milk;
        for (let i = 0; i < 6; i++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.16), this.flat(0x5c4a3a)); rung.position.set(-3.4, 0.8 + i, 1.4); g.add(rung); }
        break;
      }
      case 'door': {
        const frame = timber(5.4, 8.4, 1.2); frame.position.y = 4.2; g.add(frame); E.edges(frame);
        const panel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 7.4, 0.4), this.flat(0x3a2418)); panel.position.set(0, 3.9, 0.7); g.add(panel);
        for (const dy of [2.2, 5.6]) { const band = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.4, 0.5), this.flat(0x6a5f55)); band.position.set(0, dy, 0.9); g.add(band); }
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), this.flat(0xd8c07a)); knob.position.set(1.5, 3.8, 1.0); g.add(knob);
        const glow = new THREE.PointLight(0xffd27a, 2.4, 14); glow.position.set(0, 4, 3); g.add(glow);
        break;
      }
    }
    // Room dressing lives behind the play plane; only cobwebs hang in front.
    const DEPTH = { rack: -2.8, crate: -2.5, shelf: -2.8, lamp: -1.4, web: 2.6,
      cheesewheel: -0.9, knifeblock: -0.9, bottle: -0.9, press: -3, vat: -2.5, door: -1.6 };
    g.position.set(it.x, g.position.y + it.y, it.z !== undefined ? it.z : (DEPTH[it.kind] ?? -2));
    it.mesh = g; this.group.add(g);
    this.decos.push(it);
  }

  // Enclosing shell for a level authored as one room.
  buildRoom() {
    const th = this.theme, W = this.data.width, top = this.data.room.top;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W + 40, top + 26),
      new THREE.MeshToonMaterial({ map: CZ.Tex.tiled(th.tile[0], th.tile[1], (W + 40) / 2, (top + 26) / 2, 4) }));
    back.position.set(W / 2, top / 2 - 4, -7); back.receiveShadow = true; this.bgGroup.add(back);
    // ceiling with beams
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(W + 40, 2.4, 14), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('wood', 'timber', (W + 40) / 2, 1) }));
    ceil.position.set(W / 2, top + 1.2, -1); this.bgGroup.add(ceil);
    for (let x = 6; x < W; x += 15) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 13), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('wood', 'timber', 1, 1) }));
      beam.position.set(x, top - 0.6, -1); beam.castShadow = true; this.bgGroup.add(beam);
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.2, 1.0), this.flat(0x5c3a1c));
      brace.position.set(x, top - 2.6, -5.6); brace.rotation.z = 0.5; this.bgGroup.add(brace);
    }
    // skirting and a floor shadow strip so the ground reads as a surface
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(W + 40, 0.7, 1), this.flat(th.blockAlt));
    skirt.position.set(W / 2, 0.35, -6.4); this.bgGroup.add(skirt);
    // a few background barrels and racks stacked against the wall
    for (let x = 4; x < W; x += CZ.rand(16, 26)) {
      const stack = new THREE.Group();
      const n = 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3.4, 10), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled('wood', 'timber', 3, 3), color: 0xb0a08c }));
        b.rotation.z = Math.PI / 2; b.position.set(CZ.rand(-0.6, 0.6), 1.6 + i * 3.2, 0); stack.add(b);
        for (const off of [-1, 1]) { const hoop = new THREE.Mesh(new THREE.CylinderGeometry(1.56, 1.56, 0.2, 10), this.flat(0x584a52)); hoop.rotation.z = Math.PI / 2; hoop.position.set(off, 1.6 + i * 3.2, 0); stack.add(hoop); }
      }
      stack.position.set(x, 0, -5.2); this.bgGroup.add(stack);
    }
  }

  // ---------- scenery: sky, three parallax depths, foreground ----------
  buildScenery() {
    const th = this.theme, W = this.data.width, rnd = CZ.rand;
    this.bgGroup = new THREE.Group(); this.group.add(this.bgGroup);
    this.fgGroup = new THREE.Group(); this.group.add(this.fgGroup);

    // Dithered pixel sky that follows the camera.
    const sky = CZ.Tex.custom(`sky|${th.sky[0]}|${th.sky[1]}`, 64, (g, S) => {
      const a = new THREE.Color(th.sky[0]), b = new THREE.Color(th.sky[1]);
      for (let y = 0; y < S; y++) {
        const t = y / (S - 1), col = a.clone().lerp(b, t);
        g.fillStyle = `#${col.getHexString()}`; g.fillRect(0, y, S, 1);
        // ordered dither between neighbouring bands for a retro gradient
        if (y % 2 === 0 && y > 0) {
          const prev = a.clone().lerp(b, (y - 1) / (S - 1));
          g.fillStyle = `#${prev.getHexString()}`;
          for (let x = 0; x < S; x += 2) g.fillRect(x, y, 1, 1);
        }
      }
    });
    this.skyMesh = new THREE.Mesh(new THREE.PlaneGeometry(340, 190), new THREE.MeshBasicMaterial({ map: sky, depthWrite: false }));
    this.skyMesh.position.set(0, 20, -80); this.scene.add(this.skyMesh);

    const abyss = new THREE.Mesh(new THREE.PlaneGeometry(W + 240, 70), new THREE.MeshBasicMaterial({ color: th.sky[0], transparent: true, opacity: 0.85, depthWrite: false }));
    abyss.position.set(W / 2, this.data.deathY - 36, -6); this.bgGroup.add(abyss);

    // A level authored as a room gets walls and a ceiling instead of parallax scatter.
    if (this.data.room) { this.buildRoom(); return; }

    // Far wall so worlds feel enclosed rather than floating in void.
    if (th.bg !== 'heaven') {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(W + 120, 100), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled(th.tile[0], th.tile[1], W + 120, 100, 6), color: 0x8a8a8a }));
      wall.position.set(W / 2, 22, -34); this.bgGroup.add(wall);
    }
    if (th.bg === 'digital') {
      const grid = new THREE.GridHelper(400, 64, 0x39ff88, 0x2a2a6a);
      grid.position.set(W / 2, this.data.deathY - 4, -10); grid.material.transparent = true; grid.material.opacity = 0.3; this.bgGroup.add(grid);
    }

    // Midground / background props at two depths, plus a near foreground layer.
    for (let layer = 0; layer < 3; layer++) {
      const z = [-9, -17, -28][layer], step = [24, 16, 12][layer], sc = [0.85, 1.3, 2.0][layer];
      const shade = [0.82, 0.6, 0.42][layer];
      for (let x = -12; x < W + 12; x += step * rnd(0.7, 1.3)) {
        const p = this.sceneryProp(shade);
        p.scale.setScalar(sc);
        p.position.set(x, rnd(-4, 9) + layer * 5 + (th.bg === 'heaven' ? rnd(0, 14) : 0), z + rnd(-2, 2));
        p.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
        this.bgGroup.add(p);
      }
    }
    for (let x = rnd(14, 46); x < W; x += rnd(38, 62)) {
      const p = this.foregroundProp();
      p.position.set(x, rnd(-3, 4), 4.0);
      p.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
      this.fgGroup.add(p);
    }
  }

  // A silhouette-ish prop for the parallax layers; `shade` darkens it with depth.
  sceneryProp(shade) {
    const th = this.theme, rnd = CZ.rand;
    const tint = c => new THREE.Color(c).multiplyScalar(shade).getHex();
    const mat = (pattern, pal, w, h, c) => new THREE.MeshToonMaterial({ map: CZ.Tex.tiled(pattern, pal, w, h), color: tint(c || 0xffffff) });
    const g = new THREE.Group();
    switch (th.bg) {
      case 'cellar': {
        if (Math.random() < 0.5) {   // cheese wheel on a rack
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 1.2, 10), new THREE.MeshToonMaterial({ map: CZ.Tex.get('cheese', 'stone'), color: tint(0xffffff) }));
          wheel.rotation.x = Math.PI / 2; g.add(wheel);
          const rind = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.4, 10), new THREE.MeshToonMaterial({ color: tint(0xc94f10) }));
          rind.rotation.x = Math.PI / 2; g.add(rind);
        } else {                      // barrel
          const b = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3.2, 8), mat('wood', 'timber', 3, 3));
          for (let i = -1; i <= 1; i++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.24, 8), new THREE.MeshToonMaterial({ color: tint(0x3b4855) })); h.position.y = i * 1.1; b.add(h); }
          g.add(b);
        }
        break;
      }
      case 'factory': case 'boxes': {
        if (th.bg === 'boxes' && Math.random() < 0.6) {
          for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), mat('card', 'cardboard', 2.6, 2.6)); b.position.set(rnd(-0.5, 0.5), i * 2.65, 0); g.add(b); CZ.Effects.edges(b); }
        } else {
          const r = rnd(1.6, 3.4);
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.6, 8), mat('plate', 'steel', 3, 3));
          disc.rotation.x = Math.PI / 2; g.add(disc);
          for (let i = 0; i < 8; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.6), new THREE.MeshToonMaterial({ color: tint(0x5b6c80) })); const a = i / 8 * Math.PI * 2; t.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); t.rotation.z = a; g.add(t); }
          g.userData.spin = (Math.random() < 0.5 ? 1 : -1) * rnd(0.3, 0.8);
        }
        break;
      }
      case 'vats': {
        const v = new THREE.Mesh(new THREE.CylinderGeometry(3, 2.4, 5, 8), mat('plate', 'steel', 5, 5, 0xbb8877));
        g.add(v);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.5, 8), new THREE.MeshBasicMaterial({ map: CZ.Tex.get('goo', 'magma') }));
        top.position.y = 2.5; g.add(top);
        const l = new THREE.PointLight(0xff6a1f, 5, 14); l.position.y = 3.5; g.add(l);
        break;
      }
      case 'vents': {
        const d = new THREE.Mesh(new THREE.BoxGeometry(rnd(6, 12), 2.4, 2.2), mat('duct', 'vent', 8, 2.4)); CZ.Effects.edges(d); g.add(d);
        if (Math.random() < 0.5) {
          const f = new THREE.Group();
          for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.2), new THREE.MeshToonMaterial({ color: tint(0x3b4855) })); b.position.x = 0.8; const p = new THREE.Group(); p.rotation.z = i * Math.PI * 2 / 3; p.add(b); f.add(p); }
          f.position.z = 1.3; f.userData.spin = 3; g.add(f); this.spinners.push(f);
        }
        break;
      }
      case 'digital': {
        const c = new THREE.Mesh(new THREE.BoxGeometry(rnd(2, 5), rnd(2, 5), 2), new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0x39ff88 : 0xb455ff, wireframe: true, transparent: true, opacity: 0.45 }));
        c.userData.spin = 0.4; g.add(c);
        break;
      }
      case 'heaven': {
        for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(rnd(2, 3.6), rnd(1.4, 2.4), 2), new THREE.MeshToonMaterial({ map: CZ.Tex.get('cloud', 'marble'), color: tint(0xffffff) })); s.position.set(rnd(-4, 4), rnd(-1, 1), rnd(-1, 1)); g.add(s); }
        break;
      }
      default: g.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat('brick', 'stone', 2, 2)));
    }
    if (g.userData.spin) this.spinners.push(g);
    return g;
  }

  // Near-camera silhouettes that sweep past to sell the depth.
  foregroundProp() {
    const th = this.theme, rnd = CZ.rand, g = new THREE.Group();
    const dark = c => new THREE.Color(c).multiplyScalar(0.35).getHex();
    const h = rnd(14, 26), w = rnd(1.1, 1.9);
    if (th.bg === 'heaven') {
      for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(rnd(3, 5), rnd(1.6, 2.6), 2), new THREE.MeshToonMaterial({ map: CZ.Tex.get('cloud', 'marble'), color: dark(0xffffff), transparent: true, opacity: 0.9 })); c.position.set(rnd(-3, 3), rnd(-4, 4), rnd(-1, 1)); g.add(c); }
      return g;
    }
    // pipe / girder column with brackets
    const col = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.6), new THREE.MeshToonMaterial({ map: CZ.Tex.tiled(th.tile[0], th.tile[1], w, h), color: dark(0xffffff) }));
    g.add(col); CZ.Effects.edges(col);
    for (let i = 0; i < 3; i++) {
      const br = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, 1.9), new THREE.MeshToonMaterial({ color: dark(th.plat) }));
      br.position.y = -h / 2 + rnd(2, h - 2); g.add(br);
    }
    if (Math.random() < 0.4) {   // dangling chain
      const chain = new THREE.Group();
      for (let i = 0; i < 6; i++) { const lnk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshToonMaterial({ color: dark(0x93a6ba) })); lnk.position.y = -i * 0.45; chain.add(lnk); }
      chain.position.set(rnd(-3, 3), -h / 2 + rnd(1, 4), 0); g.add(chain);
    }
    return g;
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
      if (s.conveyor && s.tex) s.tex.offset.x -= s.conveyor * dt * 0.3;
      if (s.glitch) { s.mesh.material.opacity = 0.12 + 0.08 * Math.sin(t * 9 + s.x); s.wire.visible = (t * 6 + s.x) % 1 > 0.15; }
      if (s.corrupt) { s.mesh.material.opacity = 0.78 + 0.15 * Math.sin(t * 13 + s.y * 2); s.mesh.position.x = s.x + s.w / 2 + ((Math.random() < 0.04) ? (Math.random() - 0.5) * 0.15 : 0); }
    }
    for (const hz of this.hazards) {
      if (hz.kind === 'laser') {
        const ph = ((t / hz.period) + hz.phase) % 1, onFrac = hz.on / hz.period;
        hz.active = ph < onFrac;
        const warn = ph > 1 - 0.3 / hz.period;
        hz.beam.material.opacity = hz.active ? 0.85 + 0.15 * Math.sin(t * 40) : warn ? 0.12 + 0.1 * Math.sin(t * 30) : 0.04;
        hz.core.visible = hz.active; hz.beam.scale.x = hz.active ? 1 : 0.35;
      } else if (hz.kind === 'press') {
        const k = 0.5 - 0.5 * Math.cos((t / hz.period) * Math.PI * 2 + hz.phase);
        hz.y = hz.y0 + hz.dy * k; hz.mesh.position.y = hz.y + hz.h / 2;
      } else if (hz.kind === 'grater') {
        hz.spinGroup.rotation.z += dt * 6;
      } else if (hz.kind === 'goo') {
        hz.mesh.position.y = hz.y + hz.h / 2 - 0.2 + Math.sin(t * 2 + hz.x) * 0.06;
        if (hz.tex) hz.tex.offset.x = Math.sin(t * 0.4 + hz.x) * 0.05;
        hz.bubbleT -= dt;
        if (hz.bubbleT < 0 && Math.abs(hz.x + hz.w / 2 - playerX) < 30) { hz.bubbleT = 0.25 + Math.random() * 0.5; CZ.Effects.burst(hz.x + Math.random() * hz.w, hz.y + hz.h, 0xffb347, 1, { spread: 0.5, up: 3, life: 0.6, gravity: 4, size: 0.7, z: 1.5 }); }
      }
    }
    // cheese drips: stretch, fall, reset
    for (const d of this.drips) {
      d.t += dt;
      const c = d.t % 3.4;
      if (c < 2.2) { const k = c / 2.2; d.stem.scale.y = 0.3 + k * 1.5; d.stem.position.y = -(0.3 + k * 1.5) / 2; d.bulb.position.y = -(0.3 + k * 1.5); d.bulb.visible = true; d.bulb.scale.setScalar(0.7 + k * 0.5); }
      else if (c < 2.5) { d.bulb.position.y -= dt * 14; if (Math.abs(d.x - playerX) < 26 && Math.random() < 0.25) CZ.Effects.burst(d.x, d.y + d.bulb.position.y, 0xffcc33, 1, { spread: 0.4, up: -1, life: 0.5, size: 0.6, gravity: 20, z: 2 }); }
      else { d.bulb.visible = false; d.stem.scale.y = 0.2; d.stem.position.y = -0.1; }
    }
    for (const b of this.bounces) b.pad.scale.y = CZ.damp(b.pad.scale.y, 1, 12, dt);
    for (const w of this.winds) w.fan.rotation.y += dt * 14;
    for (const st of this.windStreaks) { st.m.position.y += st.s * dt; if (st.m.position.y > st.h / 2) st.m.position.y = -st.h / 2; }
    for (const h of this.hooks) { h.ring.rotation.z += dt * 1.6; h.mesh.position.y = h.y + Math.sin(t * 2 + h.x) * 0.1; }
    for (const b of this.bugs) if (!b.taken) { b.mesh.rotation.y = Math.sin(t * 2 + b.x) * 0.5; b.mesh.position.y = b.y + Math.sin(t * 3 + b.x) * 0.15; }
    for (const a of this.abilities) {
      if (a.taken) continue;
      a.mesh.position.y = a.y + (a.limb ? 0.9 : 0.6) + Math.sin(t * 2.5 + a.x) * 0.2;
      if (a.limb) {
        a.orb.rotation.y = Math.sin(t * 1.6) * 0.5;               // a dropped body part turning in the light
        a.rings[0].rotation.z += dt * 0.8;
        a.rings[0].scale.setScalar(1 + Math.sin(t * 4) * 0.06);
      } else {
        a.orb.rotation.y += dt * 2; a.orb.rotation.z += dt;
        a.rings[0].rotation.z += dt * 1.5; a.rings[1].rotation.y += dt * 1.2;
        a.orb.scale.setScalar(1 + Math.sin(t * 6) * 0.08);
      }
    }
    if (this.exit) this.exit.portal.material.opacity = 0.45 + 0.2 * Math.sin(t * 3);
    for (const c of this.checks) if (c.active) c.flag.rotation.y = Math.sin(t * 6) * 0.25;
    for (const sp of this.spinners) sp.rotation.z += (sp.userData.spin || 1) * dt;
    for (const d of this.decos) {
      if (d.bulb) { const f = 0.9 + Math.sin(t * 7 + d.x) * 0.06 + (Math.random() < 0.02 ? -0.3 : 0); d.lamp.intensity = 3.4 * f; d.bulb.scale.setScalar(f); d.mesh.rotation.z = Math.sin(t * 0.7 + d.x) * 0.03; }
      if (d.spider) { d.spider.position.y = -1.0 + Math.sin(t * 1.4 + d.x) * 0.35; }
      if (d.wheel) { d.wheel.rotation.z += dt * 0.7; for (const sp of d.spokes) sp.rotation.z += dt * 0.7; }
      if (d.milk) { d.milk.position.y = 5.9 + Math.sin(t * 1.6 + d.x) * 0.06; }
    }
  }

  solidFor(s, f) {
    if (s.broken) return false;
    if (s.glitch && (f.dashing || f.inGlitch)) return false;
    if (s.corrupt && (f.noclip || f.inCorrupt)) return false;
    return true;
  }
  blocking(f = {}) { const out = []; for (const s of this.solids) if (this.solidFor(s, f)) out.push(s); return out; }

  breakCracked(s) {
    if (s.broken) return; s.broken = true; s.mesh.visible = false;
    CZ.Effects.burst(s.x + s.w / 2, s.y + s.h / 2, 0x7a5f3a, 22, { spread: 9, up: 6, life: 1, size: 1.6 });
    CZ.Audio.sfx.crack(); CZ.Effects.shake(0.5);
  }

  setSky(camX, camY) {
    this.skyMesh.position.x = camX; this.skyMesh.position.y = camY + 10;
    // parallax: shift the layers against the camera
    this.bgGroup.position.x = camX * 0.06;
    this.fgGroup.position.x = -camX * 0.05;
  }

  dispose() {
    CZ.Effects.disposeTree(this.group);
    CZ.Effects.disposeTree(this.skyMesh);
  }
};
