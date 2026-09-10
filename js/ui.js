// DOM overlay: HUD, dialogue, unlock cards, menus. Every icon is a pixel sprite
// from CZ.Spr — this game contains no emoji.
CZ.UI = (() => {
  const $ = id => document.getElementById(id);
  const show = (id, on = true) => $(id).classList.toggle('hidden', !on);
  let dialogState = null, typeTimer = null, toastTimer = null, signShown = null;

  function hp(cur, max) {
    const el = $('hp');
    if (el.childElementCount !== max) {
      el.innerHTML = '';
      for (let i = 0; i < max; i++) {
        const d = document.createElement('div'); d.className = 'heart';
        d.style.backgroundImage = `url(${CZ.Spr.url('cheese', 6)})`;
        el.appendChild(d);
      }
    }
    [...el.children].forEach((c, i) => c.classList.toggle('lost', i >= cur));
  }
  function bugs(c, t) { $('bug-count').textContent = `${c}/${t}`; }
  function timer(t) { $('timer').textContent = CZ.fmtTime(t); }
  function levelName(n, sub) { $('level-name').textContent = n; $('level-name').title = sub || ''; }

  function techs(ab, player) {
    const el = $('techs');
    if (el.childElementCount !== CZ.ABILITY_ORDER.length) {
      el.innerHTML = '';
      for (const id of CZ.ABILITY_ORDER) {
        const a = CZ.ABILITIES[id];
        const d = document.createElement('div'); d.className = 'tech';
        d.innerHTML = `<i class="spr" data-spr="${a.ico}"></i><div>${a.name.split(' ')[0]}</div><div class="k">${CZ.TECH_KEYS[id]}</div>`;
        el.appendChild(d);
      }
      CZ.Spr.paint(el);
    }
    [...el.children].forEach((c, i) => {
      const id = CZ.ABILITY_ORDER[i]; c.classList.toggle('locked', !ab[id]);
      let active = false, cd = false;
      if (player) {
        if (id === 'dash') { active = player.dashing; cd = !player.canDash || player.dashCd > 0; }
        if (id === 'noclip') { active = player.noclip; cd = player.noclipMeter <= 0.01; }
        if (id === 'doubleJump') cd = player.jumpsUsed >= 2 && !player.grounded;
        if (id === 'pound') active = player.pounding;
        if (id === 'grapple') active = player.grappling;
        if (id === 'wallJump') active = player.wallSliding;
      }
      c.classList.toggle('active', active); c.classList.toggle('cd', cd && !active);
    });
  }
  function noclipMeter(on, frac) { show('noclip-meter', on); if (on) $('noclip-fill').style.width = `${Math.round(frac * 100)}%`; }
  function bossBar(boss) { show('boss-bar', !!boss); if (boss) { $('boss-name').textContent = boss.name; $('boss-fill').style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`; } }
  function sign(text) { if (text === signShown) return; signShown = text; show('sign', !!text); if (text) $('sign').textContent = text; }
  function toast(text, ms = 2600) { const el = $('toast'); el.textContent = text; show('toast', true); clearTimeout(toastTimer); toastTimer = setTimeout(() => show('toast', false), ms); }
  function flash(color) { const f = $('flash'); f.style.background = color; f.style.transition = 'none'; f.style.opacity = 1; requestAnimationFrame(() => { f.style.transition = 'opacity .35s'; f.style.opacity = 0; }); }

  // Dialogue: lines are {who, portrait (sprite name), text}.
  function dialog(lines, done) { dialogState = { lines, i: 0, done, typing: false }; show('dialog', true); showLine(); }
  function showLine() {
    const st = dialogState, ln = st.lines[st.i];
    $('dlg-who').textContent = ln.who;
    const port = $('dlg-portrait');
    port.dataset.spr = ln.portrait; port.dataset.sprPainted = ''; CZ.Spr.paint($('dialog'));
    $('dlg-text').textContent = '';
    if (ln.who.startsWith('GOD')) CZ.Audio.sfx.god();
    let k = 0; st.typing = true; clearInterval(typeTimer);
    typeTimer = setInterval(() => {
      k++; $('dlg-text').textContent = ln.text.slice(0, k);
      if (k % 3 === 0) CZ.Audio.sfx.talk();
      if (k >= ln.text.length) { clearInterval(typeTimer); st.typing = false; }
    }, 18);
  }
  function dialogAdvance() {
    const st = dialogState; if (!st) return;
    if (st.typing) { clearInterval(typeTimer); $('dlg-text').textContent = st.lines[st.i].text; st.typing = false; return; }
    st.i++;
    if (st.i >= st.lines.length) { show('dialog', false); dialogState = null; st.done && st.done(); } else showLine();
  }
  const dialogOpen = () => !!dialogState;

  function unlock(id) {
    const a = CZ.ABILITIES[id];
    const ico = $('unlock-ico'); ico.dataset.spr = a.ico; ico.dataset.sprPainted = ''; CZ.Spr.paint($('unlock'));
    $('unlock-name').textContent = a.name; $('unlock-desc').textContent = a.desc; $('unlock-key').textContent = a.key;
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
      const got = (save.bugs[l.id] || []).length, tot = l.items.filter(x => x.t === 'bug').length;
      b.innerHTML = `<span class="n">WORLD ${i + 1}</span>${l.name}<span class="n">BUGS ${got}/${tot}</span>`;
      b.disabled = i > save.level; b.onclick = () => onPick(i); el.appendChild(b);
    });
  }

  return { $, show, hp, bugs, timer, levelName, techs, noclipMeter, bossBar, sign, toast, flash,
    dialog, dialogAdvance, dialogOpen, unlock, complete, ending, levelList, stat };
})();
