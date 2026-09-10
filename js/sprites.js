// Hand-authored pixel-art sprites. Nothing in this game uses emoji — every icon,
// portrait and glyph below is drawn pixel by pixel and rasterised to a canvas.
CZ.Spr = (() => {
  // Shared palette keys. '.' is transparent.
  const P = {
    k: '#1a0f0a', K: '#000000', w: '#ffffff', W: '#fff3c4',
    y: '#ffcc33', Y: '#ffe066', o: '#ff8a1f', O: '#c9781a', d: '#a85a12',
    g: '#39ff88', G: '#1f9c53', b: '#43b8ff', B: '#1d5f9e',
    r: '#ff4b5c', R: '#a81f2c', p: '#b455ff', P: '#6a2caa',
    s: '#8a8a96', S: '#5a5a66', n: '#c8ccd4', e: '#ffaabb',
    t: '#c9a227', T: '#6b4a2a', f: '#ffe0c0', F: '#d9a97f', c: '#62d26f',
  };

  const A = {
    // ── cheese wedge: hearts, the player portrait, the level-complete stamp ──
    cheese: [
      '................', '.......kk.......', '......kyyk......', '.....kyyyyk.....',
      '.....kyOyyk.....', '....kyyyyyyk....', '....kyyyOyyk....', '...kyOyyyyyyk...',
      '...kyyyyyyyyk...', '..kyyyOyyyyyyk..', '..kyyyyyyyOyyk..', '.kyyyyOyyyyyyyk.',
      '.kooooooooooook.', '.kkkkkkkkkkkkkk.', '................', '................',
    ],
    // ── portraits ──
    'p-cheese': [
      '................', '.......kk.......', '......kyyk......', '.....kyyyyk.....',
      '....kyyyyyyk....', '....kyyyyyyk....', '...kyywkkwyyk...', '...kywwkkwwyk...',
      '..kyywwkkwwyyk..', '..kyyyyyyyyyyk..', '.kyyyOyykkyyyyk.', '.kyyyyykkyyyOyk.',
      'kyyyyyyyyyyyyyyk', 'kooooooooooooook', 'kkkkkkkkkkkkkkkk', '................',
    ],
    'p-human': [
      '................', '.....kkkkkk.....', '....kTTTTTTk....', '...kTTTTTTTTk...',
      '...kTffffffTk...', '..skTffffffTks..', '..skTfkffkfTks..', '..skTffffffTks..',
      '..skTfoooooTks..', '...kTffffffTk...', '....kkffffkk....', '...kBBBBBBBBk...',
      '..kBBBBBBBBBBk..', '.kBBBBBBBBBBBBk.', '.kBBBBBBBBBBBBk.', '.kkkkkkkkkkkkkk.',
    ],
    'p-god': [
      '.....kkkkkk.....', '...kkttttttkk...', '..ktttttttttt k.', '..kfffffffffk...',
      '.kfffffffffffk..', '.kfkkfffffkkfk..', '.kfkwkfffkwkfk..', '.kffkffffkffk...',
      '.kffffofffffk...', '..kwwwwwwwwk....', '.kwwwwwwwwwwk...', 'kwwwwwwwwwwwwk..',
      'kwwwwwwwwwwwwk..', '.kwwwwwwwwww k..', '..kwwwwwwwwk....', '....kkkkkk......',
    ],
    'p-rat': [
      '................', '..kk........kk..', '.keek......keek.', '.kseek....kseek.',
      '..ksssssssssk...', '.kssssssssssssk.', 'ksskrkssssrksssk', 'kssskkssssskkssk',
      'kssssssssssssssk', 'kssssssssssssssk', '.ksskeeeeksskk..', '..kssseeesssk...',
      '...kwwkkkkwwk...', '....kkkkkkkk....', '................', '................',
    ],
    'p-guard': [
      '................', '..kkkkkkkkkkkk..', '.kRRRRRRRRRRRRk.', 'kRRRRRRRRRRRRRRk',
      'kRRkkkkkkkkkkRRk', 'kRRkKKKKKKKKkRRk', 'kRRkKKwwwwKKkRRk', 'kRRkKwwrrwwKkRRk',
      'kRRkKwrrrrwKkRRk', 'kRRkKKwwwwKKkRRk', 'kRRkKKKKKKKKkRRk', 'kRRkkkkkkkkkkRRk',
      'kRRRRRRRRRRRRRRk', '.kRRRRRRRRRRRRk.', '..kRRRRRRRRRRk..', '....kkkkkkkk....',
    ],
    // ── collectibles / stats ──
    bug: [
      '................', '..k..........k..', '...k...kk...k...', '....kkkccckk....',
      '...kcccccccck...', '..kccwccccwcck..', '..kcwkcccckwck..', 'kkccccccccccckk.',
      '.kcccGccccGccck.', 'kkccccccccccckk.', '..kcccccccccck..', '..kccGccccGcck..',
      '...kcccccccck...', '....kkccccKk....', '...k..kkkk..k...', '..k..........k..',
    ],
    apple: [
      '......kk........', '.....ktk........', '....kcck.kk.....', '...kcccktttk....',
      '..kkyykkyykk....', '.kyyyyyyyyyyk...', 'kyyywyyyyyyyyk..', 'kyywwyyyyyyyyk..',
      'kyywyyyyyyyyyk..', 'kyyyyyyyyyyyyk..', 'kyyyyyyyyyyyyk..', '.kyyyyyyyyyyk...',
      '.kttyyyyyyttk...', '..kttyyyyttk....', '...kkkkkkkk.....', '................',
    ],
    skull: [
      '................', '....kkkkkkkk....', '...kwwwwwwwwk...', '..kwwwwwwwwwwk..',
      '.kwwwwwwwwwwwwk.', '.kwwkkkwwkkkwwk.', '.kwkKKKwwKKKkwk.', '.kwkKKKwwKKKkwk.',
      '.kwwkkkwwkkkwwk.', '.kwwwwwkkwwwwwk.', '..kwwwkkkkwwwk..', '...kwwwwwwwwk...',
      '....kwkwkwkwk...', '....kwkwkwkwk...', '.....kkkkkkk....', '................',
    ],
    clock: [
      '................', '.....kkkkkk.....', '...kkwwwwwwkk...', '..kwwwwkwwwwwk..',
      '.kwwwwwkwwwwwwk.', '.kwwwwwkwwwwwwk.', 'kwwwwwwkwwwwwwwk', 'kwwkkkkkwwwwwwwk',
      'kwwwwwwkwwwwwwwk', 'kwwwwwwkkwwwwwwk', '.kwwwwwwkkwwwwk.', '.kwwwwwwwkkwwwk.',
      '..kwwwwwwwwwwk..', '...kkwwwwwwkk...', '.....kkkkkk.....', '................',
    ],
    // ── movement techs ──
    'tech-jump': [
      '................', '.......kk.......', '......kkkk......', '.....kk..kk.....',
      '....kk....kk....', '...kk......kk...', '..kk........kk..', '................',
      '.......kk.......', '......kkkk......', '.....kk..kk.....', '....kk....kk....',
      '...kk......kk...', '..kk........kk..', '................', '................',
    ],
    'tech-dash': [
      '................', '................', '..kk............', '..kk.....kk.....',
      '.........kkkk...', '..kkkk...kkkkkk.', '.........kkkkkkk', '..kkkk...kkkkkk.',
      '.........kkkk...', '..kk.....kk.....', '..kk............', '................',
      '................', '................', '................', '................',
    ],
    'tech-wall': [
      '................', '.kkk............', '.kkk...kk.......', '.kkk..kkkk......',
      '.kkk.kk..kk.....', '.kkk....kk......', '.kkk....kk......', '.kkk....kk......',
      '.kkk....kkkkk...', '.kkk........kk..', '.kkk.........kk.', '.kkk............',
      '.kkk............', '................', '................', '................',
    ],
    'tech-pound': [
      '................', '..kk........kk..', '..kk...kk...kk..', '.......kk.......',
      '.......kk.......', '.......kk.......', '....kk.kk.kk....', '.....kkkkkk.....',
      '......kkkk......', '.......kk.......', '................', '.kkkkkkkkkkkkkk.',
      'kk...kk..kk...kk', '................', '................', '................',
    ],
    'tech-hook': [
      '................', '.......kk.......', '.......kk.......', '.......kk.......',
      '.......kk.......', '.......kk.......', '....kk.kk.kk....', '...kk..kk..kk...',
      '...kk..kk..kk...', '...kk......kk...', '...kk......kk...', '....kk....kk....',
      '.....kkkkkk.....', '.......kk.......', '................', '................',
    ],
    'tech-ghost': [
      '................', '.....kkkkkk.....', '...kkkkkkkkkk...', '..kkkkkkkkkkkk..',
      '..kkwwkkkkwwkk..', '..kkwwkkkkwwkk..', '..kkkkkkkkkkkk..', '..kkkkkkkkkkkk..',
      '..kkkkkkkkkkkk..', '..kkkkkkkkkkkk..', '..kkkkkkkkkkkk..', '..kkkkkkkkkkkk..',
      '..kk.kkkkkk.kk..', '..k...kkkk...k..', '................', '................',
    ],
    // ── controls / system ──
    pause: [
      '................', '................', '..kkkk....kkkk..', '..kkkk....kkkk..',
      '..kkkk....kkkk..', '..kkkk....kkkk..', '..kkkk....kkkk..', '..kkkk....kkkk..',
      '..kkkk....kkkk..', '..kkkk....kkkk..', '..kkkk....kkkk..', '..kkkk....kkkk..',
      '..kkkk....kkkk..', '................', '................', '................',
    ],
    'arrow-up': [
      '................', '.......kk.......', '......kkkk......', '.....kkkkkk.....',
      '....kkkkkkkk....', '...kkkkkkkkkk...', '..kkkkkkkkkkkk..', '.....kkkkkk.....',
      '.....kkkkkk.....', '.....kkkkkk.....', '.....kkkkkk.....', '.....kkkkkk.....',
      '.....kkkkkk.....', '.....kkkkkk.....', '................', '................',
    ],
    phone: [
      '................', '...kkkkkkkkkk...', '...kwwwwwwwwk...', '...kwkkkkkkwk...',
      '...kwkbbbbkwk...', '...kwkbbbbkwk...', '...kwkbbbbkwk...', '...kwkbbbbkwk...',
      '...kwkbbbbkwk...', '...kwkbbbbkwk...', '...kwkbbbbkwk...', '...kwkkkkkkwk...',
      '...kwwwkkwwwk...', '...kkkkkkkkkk...', '................', '................',
    ],
    'sound-on': [
      '................', '..........k.....', '.......k...k....', '....kkkk.k..k...',
      '...kkkkk..k..k..', '..kkkkkk.k.k.k..', '.kkkkkkk.k.k.k..', '.kkkkkkk.k.k.k..',
      '.kkkkkkk.k.k.k..', '..kkkkkk.k.k.k..', '...kkkkk..k..k..', '....kkkk.k..k...',
      '.......k...k....', '..........k.....', '................', '................',
    ],
    'sound-off': [
      '................', '................', '................', '....kkkk........',
      '...kkkkk...k.k..', '..kkkkkk....k...', '.kkkkkkk...k.k..', '.kkkkkkk........',
      '.kkkkkkk...k.k..', '..kkkkkk....k...', '...kkkkk...k.k..', '....kkkk........',
      '................', '................', '................', '................',
    ],
    // ── the "!" plate used on in-world signs ──
    bang: [
      '................', '................', '......kkkk......', '......kkkk......',
      '......kkkk......', '......kkkk......', '......kkkk......', '......kkkk......',
      '......kkkk......', '......kkkk......', '................', '................',
      '......kkkk......', '......kkkk......', '................', '................',
    ],
  };

  const cache = new Map();
  // Rasterise a sprite at `scale` device pixels per art pixel.
  function canvas(name, scale = 4, tint) {
    const key = `${name}|${scale}|${tint || ''}`;
    if (cache.has(key)) return cache.get(key);
    const rows = A[name];
    if (!rows) throw new Error('unknown sprite: ' + name);
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement('canvas');
    c.width = w * scale; c.height = h * scale;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        g.fillStyle = (tint && ch === 'k') ? tint : (P[ch] || '#ff00ff');
        g.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    cache.set(key, c);
    return c;
  }
  const urls = new Map();
  function url(name, scale = 4, tint) {
    const key = `${name}|${scale}|${tint || ''}`;
    if (!urls.has(key)) urls.set(key, canvas(name, scale, tint).toDataURL());
    return urls.get(key);
  }
  // Point every [data-spr] element at its sprite. Safe to call repeatedly.
  function paint(root = document) {
    for (const el of root.querySelectorAll('[data-spr]')) {
      const name = el.dataset.spr;
      if (!name || el.dataset.sprPainted === name) continue;
      if (!A[name]) { el.dataset.sprPainted = name; continue; }
      el.style.backgroundImage = `url(${url(name, 6)})`;
      el.dataset.sprPainted = name;
    }
  }
  // Inline markup helper for strings built in JS.
  const tag = (name, cls = '') => `<i class="spr ${cls}" data-spr="${name}"></i>`;
  const has = name => !!A[name];

  return { canvas, url, paint, tag, has, art: A, palette: P };
})();
