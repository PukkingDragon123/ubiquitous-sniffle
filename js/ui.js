// DOM overlay: HUD, dialogue, unlock cards, menus. Every icon is a pixel sprite
// from CZ.Spr — this game contains no emoji.
CZ.UI = (() => {
  const $ = id => document.getElementById(id);
  const show = (id, on = true) => $(id).classList.toggle('hidden', !on);
  let dialogState = null, typeTimer = null, toastTimer = null, signShown = null;

  // No health meter anywhere: the wheel you are playing IS the health bar, and
  // every hit cuts a wedge out of it.
  function wheel() {}
  function timer() {}
  function levelName() {}

  // The upgrades you have rolled into.
  let partSig = '';
  function parts(ab) {
    const el = $('parts'); if (!el) return;
    const owned = CZ.ABILITY_ORDER.filter(id => ab[id]);
    const sig = owned.join(',');
    if (sig === partSig) return;
    const fresh = owned.length > partSig.split(',').filter(Boolean).length;
    partSig = sig; el.innerHTML = '';
    for (const id of owned) {
      const d = document.createElement('div'); d.className = 'part';
      d.innerHTML = `<i class="spr" data-spr="${CZ.ABILITIES[id].ico}"></i>`;
      d.title = CZ.ABILITIES[id].name;
      el.appendChild(d);
    }
    if (fresh && el.lastElementChild) el.lastElementChild.classList.add('fresh');
    CZ.Spr.paint(el);
  }

  // The door QTE: a ring shrinking toward a target band, and one key to press.
  let qteRing = null, qteKey = null;
  function qte(on, frac = 1, label) {
    const el = $('qte'); if (!el) return;
    show('qte', on);
    if (!on) return;
    qteRing = qteRing || el.querySelector('.ring');
    qteKey = qteKey || el.querySelector('.key');
    if (label) qteKey.textContent = label;
    qteRing.style.transform = `scale(${Math.max(0.18, frac)})`;
    el.classList.toggle('hit', frac < 0.42 && frac > 0.14);
  }

  // The wreck counter: the only number the HUD keeps, because breaking things
  // is the point. It jumps every time it goes up and then sits still.
  let wreckN = -1;
  function wrecked(n) {
    const el = $('wrecked'); if (!el) return;
    if (n === wreckN) return;
    wreckN = n;
    show('wrecked', n > 0);
    $('wrecked-n').textContent = n;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }

  function noclipMeter(on, frac) { show('noclip-meter', on); if (on) $('noclip-fill').style.width = `${Math.round(frac * 100)}%`; }
  function bossBar(boss) { show('boss-bar', !!boss); if (boss) { $('boss-name').textContent = boss.name; $('boss-fill').style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`; } }
  function sign() {}
  function toast() {}
  function flash(color) { const f = $('flash'); f.style.background = color; f.style.transition = 'none'; f.style.opacity = 1; requestAnimationFrame(() => { f.style.transition = 'opacity .35s'; f.style.opacity = 0; }); }

  // Cinematic overlay: letterbox caption plus a flash / glitch wash.
  function cineCaption(text) {
    const el = $('cine-caption');
    el.textContent = text || '';
    el.classList.toggle('hidden', !text);
  }
  function cineFx(flash, glitch) {
    const f = $('cine-flash'); f.style.opacity = flash;
    $('cine').classList.toggle('glitching', !!glitch);
  }
  function cineShow(on) { show('cine', on); if (!on) cineCaption(''); }

  function unlock(id) {
    const a = CZ.ABILITIES[id];
    const ico = $('unlock-ico'); ico.dataset.spr = a.ico; ico.dataset.sprPainted = ''; CZ.Spr.paint($('unlock'));
    $('unlock-name').textContent = a.name;
    $('unlock-key').textContent = a.key;
    show('unlock', true);
  }
  // A stat line: pixel icon + value, never an emoji.
  const stat = (spr, text) => `<div class="stat">${CZ.Spr.tag(spr)}<span>${text}</span></div>`;
  function complete(title, stats) { $('complete-title').textContent = title; $('complete-stats').innerHTML = stats; CZ.Spr.paint($('complete')); show('complete', true); }
  function ending(text, stats) { $('ending-text').innerHTML = text; $('ending-stats').innerHTML = stats; CZ.Spr.paint($('ending')); show('ending', true); }
  function levelList(levels, save, onPick) {
    const el = $('level-list'); el.innerHTML = '';
    levels.forEach((l, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<span class="n">WORLD ${i + 1}</span>${l.name}`;
      b.disabled = i > save.level; b.onclick = () => onPick(i); el.appendChild(b);
    });
  }

  return { $, show, wheel, parts, timer, levelName, qte, wrecked, noclipMeter, bossBar, sign, toast, flash,
    unlock, complete, ending, levelList, stat, cineCaption, cineFx, cineShow };
})();
