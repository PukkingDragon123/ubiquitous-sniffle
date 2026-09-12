// Procedural WebAudio SFX + a tiny chiptune sequencer. No asset files.
CZ.Audio = (() => {
  let ctx = null, master = null, musicGain = null, muted = false, musicTimer = null, currentSong = null;
  const ensure = () => {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.28; musicGain.connect(master);
      return true;
    } catch (e) { return false; }
  };
  const resume = () => { if (ensure() && ctx.state === 'suspended') ctx.resume(); };

  // Generic tone: type, freq start→end, duration, gain, optional filter.
  function tone({ type = 'square', f0 = 440, f1 = f0, dur = 0.12, vol = 0.25, attack = 0.005, slide = 'exp', delay = 0, dest = master }) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    if (slide === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    else o.frequency.linearRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise({ dur = 0.2, vol = 0.2, f = 1200, q = 1, delay = 0 }) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime + delay;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = f; flt.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(master); src.start(t);
  }

  const sfx = {
    jump: () => tone({ type: 'square', f0: 300, f1: 620, dur: 0.14, vol: 0.18 }),
    doubleJump: () => { tone({ type: 'square', f0: 420, f1: 900, dur: 0.14, vol: 0.18 }); tone({ type: 'triangle', f0: 880, f1: 1400, dur: 0.1, vol: 0.12, delay: 0.04 }); },
    dash: () => { noise({ dur: 0.18, vol: 0.25, f: 2200, q: 0.7 }); tone({ type: 'sawtooth', f0: 900, f1: 200, dur: 0.16, vol: 0.12 }); },
    land: () => { noise({ dur: 0.07, vol: 0.12, f: 300, q: 0.8 }); },
    wallJump: () => tone({ type: 'square', f0: 250, f1: 700, dur: 0.12, vol: 0.18 }),
    poundStart: () => tone({ type: 'sawtooth', f0: 300, f1: 90, dur: 0.25, vol: 0.14 }),
    poundLand: () => { noise({ dur: 0.35, vol: 0.4, f: 180, q: 0.6 }); tone({ type: 'square', f0: 120, f1: 40, dur: 0.3, vol: 0.25 }); },
    grapple: () => { tone({ type: 'square', f0: 500, f1: 1500, dur: 0.12, vol: 0.14 }); noise({ dur: 0.12, vol: 0.1, f: 3000 }); },
    noclip: () => tone({ type: 'sine', f0: 200, f1: 400, dur: 0.2, vol: 0.12 }),
    hurt: () => { tone({ type: 'sawtooth', f0: 400, f1: 80, dur: 0.3, vol: 0.25 }); noise({ dur: 0.2, vol: 0.2, f: 800 }); },
    die: () => { tone({ type: 'square', f0: 500, f1: 60, dur: 0.6, vol: 0.25 }); tone({ type: 'square', f0: 380, f1: 40, dur: 0.6, vol: 0.2, delay: 0.1 }); },
    collect: () => { tone({ type: 'square', f0: 900, f1: 900, dur: 0.07, vol: 0.14 }); tone({ type: 'square', f0: 1350, f1: 1350, dur: 0.14, vol: 0.14, delay: 0.07 }); },
    stomp: () => { tone({ type: 'square', f0: 200, f1: 600, dur: 0.1, vol: 0.2 }); noise({ dur: 0.1, vol: 0.15, f: 600 }); },
    kill: () => { tone({ type: 'sawtooth', f0: 700, f1: 100, dur: 0.18, vol: 0.18 }); noise({ dur: 0.15, vol: 0.2, f: 1500 }); },
    checkpoint: () => [0, 4, 7].forEach((n, i) => tone({ type: 'triangle', f0: 440 * Math.pow(2, n / 12), dur: 0.2, vol: 0.14, delay: i * 0.07 })),
    unlock: () => [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => tone({ type: 'square', f0: 330 * Math.pow(2, n / 12), dur: 0.25, vol: 0.14, delay: i * 0.08 })),
    exit: () => [0, 7, 12, 19].forEach((n, i) => tone({ type: 'triangle', f0: 392 * Math.pow(2, n / 12), dur: 0.3, vol: 0.16, delay: i * 0.1 })),
    bossHit: () => { tone({ type: 'sawtooth', f0: 200, f1: 50, dur: 0.4, vol: 0.3 }); noise({ dur: 0.4, vol: 0.35, f: 400 }); },
    bossDie: () => { for (let i = 0; i < 6; i++) { noise({ dur: 0.4, vol: 0.3, f: 200 + i * 150, delay: i * 0.12 }); tone({ type: 'square', f0: 300 - i * 30, f1: 40, dur: 0.4, vol: 0.2, delay: i * 0.12 }); } },
    laser: () => tone({ type: 'sawtooth', f0: 1800, f1: 300, dur: 0.35, vol: 0.14 }),
    warn: () => tone({ type: 'square', f0: 700, f1: 700, dur: 0.08, vol: 0.12 }),
    thunder: () => { noise({ dur: 0.6, vol: 0.45, f: 150, q: 0.5 }); tone({ type: 'sawtooth', f0: 90, f1: 30, dur: 0.6, vol: 0.25 }); },
    shoot: () => tone({ type: 'square', f0: 800, f1: 300, dur: 0.1, vol: 0.1 }),
    bounce: () => tone({ type: 'sine', f0: 300, f1: 900, dur: 0.18, vol: 0.2 }),
    talk: () => tone({ type: 'square', f0: 600 + Math.random() * 300, dur: 0.03, vol: 0.05 }),
    god: () => { tone({ type: 'sawtooth', f0: 60, f1: 55, dur: 1.2, vol: 0.2 }); tone({ type: 'sine', f0: 120, f1: 110, dur: 1.2, vol: 0.15 }); },
    crack: () => { noise({ dur: 0.25, vol: 0.3, f: 900, q: 0.5 }); },
  };

  // ---------- Music: tiny step sequencer ----------
  // Songs: { bpm, bass:[...], lead:[...], arp:[...] } arrays of semitone offsets (null = rest), 16th notes.
  const N = null;
  const SONGS = {
    factory: { bpm: 128, root: 110,
      bass: [0,N,0,N,12,N,0,N,-2,N,-2,N,10,N,-2,N, 0,N,0,N,12,N,0,N,-4,N,-4,N,8,N,-4,N],
      lead: [12,N,15,N,19,N,15,N,12,N,N,N,10,N,N,N, 12,N,15,N,19,N,22,N,19,N,N,N,15,N,N,N],
      arp:  [N,24,N,27,N,31,N,27,N,24,N,27,N,31,N,34, N,24,N,27,N,31,N,27,N,22,N,27,N,29,N,31] },
    lava: { bpm: 140, root: 98,
      bass: [0,0,N,0,N,0,3,N,0,0,N,0,N,5,3,N, 0,0,N,0,N,0,3,N,-2,-2,N,-2,N,-4,-2,N],
      lead: [12,N,N,15,N,N,12,N,17,N,15,N,12,N,N,N, 12,N,N,15,N,N,19,N,17,N,15,N,10,N,N,N],
      arp:  [24,N,27,N,24,N,27,N,29,N,27,N,24,N,22,N, 24,N,27,N,31,N,27,N,29,N,27,N,22,N,20,N] },
    digital: { bpm: 150, root: 130.8,
      bass: [0,N,N,0,N,N,0,N,-5,N,N,-5,N,N,-5,N, -3,N,N,-3,N,N,-3,N,-5,N,N,-5,N,N,-7,N],
      lead: [N,N,12,N,14,N,16,N,N,N,N,N,19,N,16,N, N,N,14,N,12,N,11,N,N,N,N,N,7,N,N,N],
      arp:  [12,16,19,24,12,16,19,24,7,11,14,19,7,11,14,19, 9,12,16,21,9,12,16,21,7,11,14,19,5,9,12,17] },
    heaven: { bpm: 112, root: 146.8,
      bass: [0,N,N,N,N,N,N,N,-3,N,N,N,N,N,N,N, -5,N,N,N,N,N,N,N,-7,N,N,N,-5,N,N,N],
      lead: [12,N,N,N,16,N,19,N,N,N,17,N,16,N,N,N, 14,N,N,N,12,N,N,N,N,N,N,N,N,N,N,N],
      arp:  [24,N,28,N,31,N,28,N,21,N,24,N,28,N,24,N, 19,N,23,N,26,N,23,N,17,N,21,N,24,N,21,N] },
    boss: { bpm: 160, root: 82.4,
      bass: [0,0,N,0,0,N,0,N,1,1,N,1,1,N,1,N, 0,0,N,0,0,N,0,N,-2,-2,N,-2,N,-1,-1,N],
      lead: [N,N,N,N,12,N,13,N,12,N,N,N,N,N,N,N, N,N,N,N,12,N,10,N,12,N,13,N,N,N,N,N],
      arp:  [12,N,N,12,N,N,13,N,12,N,N,12,N,N,10,N, 12,N,N,12,N,N,13,N,15,N,N,13,N,N,12,N] },
    title: { bpm: 120, root: 110,
      bass: [0,N,N,N,0,N,N,N,5,N,N,N,5,N,N,N, 3,N,N,N,3,N,N,N,-2,N,N,N,-2,N,N,N],
      lead: [N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N, N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N],
      arp:  [12,N,16,N,19,N,24,N,17,N,21,N,24,N,29,N, 15,N,19,N,22,N,27,N,10,N,14,N,17,N,22,N] },
  };
  let step = 0;
  function playMusic(name) {
    if (currentSong === name) return;
    stopMusic();
    if (musVol <= 0 || muted) { currentSong = name; return; }
    currentSong = name;
    if (!ensure()) return;
    step = 0;
    const song = SONGS[name]; if (!song) return;
    const stepDur = 60 / song.bpm / 4;
    let nextTime = ctx.currentTime + 0.05;
    const schedule = () => {
      if (currentSong !== name) return;
      while (nextTime < ctx.currentTime + 0.25) {
        const i = step % 32;
        const b = song.bass[i], l = song.lead[i], a = song.arp[i];
        const d = nextTime - ctx.currentTime;
        if (!muted) {
          if (b !== N) tone({ type: 'triangle', f0: song.root * Math.pow(2, b / 12), dur: stepDur * 1.8, vol: 0.35, delay: d, dest: musicGain });
          if (l !== N) tone({ type: 'square', f0: song.root * Math.pow(2, l / 12), dur: stepDur * 1.5, vol: 0.12, delay: d, dest: musicGain });
          if (a !== N) tone({ type: 'square', f0: song.root * Math.pow(2, a / 12), dur: stepDur * 0.9, vol: 0.06, delay: d, dest: musicGain });
          if (i % 4 === 0) noise({ dur: 0.05, vol: 0.06, f: 200, delay: d });
          if (i % 8 === 4) noise({ dur: 0.08, vol: 0.05, f: 4000, delay: d });
        }
        nextTime += stepDur; step++;
      }
      musicTimer = setTimeout(schedule, 80);
    };
    schedule();
  }
  function stopMusic() { currentSong = null; if (musicTimer) clearTimeout(musicTimer); musicTimer = null; }
  function toggleMute() { muted = !muted; setMuted(muted); return muted; }
  // Settings reach in here: sound and music are separate taps.
  function setMuted(on) {
    muted = !!on;
    if (master) master.gain.value = muted ? 0 : 0.5 * sfxVol;
    if (muted) stopMusic();
  }
  let sfxVol = 1, musVol = 1;
  function setVolumes(sfx01, mus01) {
    sfxVol = sfx01; musVol = mus01;
    if (master) master.gain.value = muted ? 0 : 0.5 * sfxVol;
    if (musicGain) musicGain.gain.value = 0.28 * musVol;
    if (musVol <= 0) stopMusic();
  }

  return { sfx, playMusic, stopMusic, toggleMute, setMuted, setVolumes, resume,
    isMuted: () => muted, musicOn: () => musVol > 0 };
})();
