/* ===== A.N.O.M.A.L.Y. ОНЛАЙН — Atmospheric Audio Engine ===== */
/* Procedural ambient: drone, wind, creatures, thunder, static    */

const ZoneAudio = (() => {
  let ctx = null;
  let masterGain = null;
  let isPlaying = false;
  let isUnlocked = false;
  let timers = [];

  // Layer gain nodes
  let droneGain, windGain, creaturesGain, thunderGain, staticGain;

  const MASTER_VOLUME = 0.35;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = ctx.createGain();
    masterGain.gain.value = MASTER_VOLUME;
    masterGain.connect(ctx.destination);

    // Layer gains
    droneGain = createGain(0.5);
    windGain = createGain(0.3);
    creaturesGain = createGain(0.15);
    thunderGain = createGain(0.4);
    staticGain = createGain(0.06);
  }

  function createGain(vol) {
    const g = ctx.createGain();
    g.gain.value = vol;
    g.connect(masterGain);
    return g;
  }

  // --- Noise buffer generator ---
  function noiseBuffer(duration) {
    const len = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  // ========== LAYER 1: DARK DRONE ==========
  function startDrone() {
    // Base sub-drone (very low frequency)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 38;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 55;

    const osc3 = ctx.createOscillator();
    osc3.type = 'triangle';
    osc3.frequency.value = 73;

    // Slow LFO for eerie modulation
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 8;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc3.frequency);

    // Deep lowpass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    filter.Q.value = 2;

    // LFO on filter for breathing effect
    const filterLfo = ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 0.03;
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.value = 40;
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency);

    // Mix oscillators
    const mix = ctx.createGain();
    mix.gain.value = 0.35;

    osc1.connect(mix);
    osc2.connect(mix);
    osc3.connect(mix);
    mix.connect(filter);
    filter.connect(droneGain);

    osc1.start();
    osc2.start();
    osc3.start();
    lfo.start();
    filterLfo.start();

    // Second layer: very deep rumble with noise
    const rumbleNoise = ctx.createBufferSource();
    rumbleNoise.buffer = noiseBuffer(4);
    rumbleNoise.loop = true;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 60;
    rumbleFilter.Q.value = 5;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.5;
    rumbleNoise.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(droneGain);
    rumbleNoise.start();
  }

  // ========== LAYER 2: WIND ==========
  function startWind() {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(5);
    noise.loop = true;

    // Bandpass for wind character
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 600;
    bp.Q.value = 0.5;

    // Modulate wind intensity
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);

    // Volume modulation for gusts
    const volLfo = ctx.createOscillator();
    volLfo.type = 'sine';
    volLfo.frequency.value = 0.08;
    const volLfoGain = ctx.createGain();
    volLfoGain.gain.value = 0.15;
    const windVol = ctx.createGain();
    windVol.gain.value = 0.3;
    volLfo.connect(volLfoGain);
    volLfoGain.connect(windVol.gain);

    noise.connect(bp);
    bp.connect(windVol);
    windVol.connect(windGain);

    noise.start();
    lfo.start();
    volLfo.start();

    // Second wind layer - higher howl
    const noise2 = ctx.createBufferSource();
    noise2.buffer = noiseBuffer(3);
    noise2.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 1200;
    hp.Q.value = 2;

    const howlLfo = ctx.createOscillator();
    howlLfo.type = 'sine';
    howlLfo.frequency.value = 0.05;
    const howlLfoGain = ctx.createGain();
    howlLfoGain.gain.value = 400;
    howlLfo.connect(howlLfoGain);
    howlLfoGain.connect(hp.frequency);

    const howlVol = ctx.createGain();
    howlVol.gain.value = 0.1;

    noise2.connect(hp);
    hp.connect(howlVol);
    howlVol.connect(windGain);

    noise2.start();
    howlLfo.start();
  }

  // ========== LAYER 3: CREATURE SOUNDS ==========
  function playCreatureSound() {
    if (!isPlaying) return;
    const type = Math.floor(Math.random() * 4);

    switch (type) {
      case 0: playDistantGrowl(); break;
      case 1: playCreatureWhine(); break;
      case 2: playChirpClick(); break;
      case 3: playDistantHowl(); break;
    }

    // Next creature sound in 8-25 seconds
    const next = 8000 + Math.random() * 17000;
    timers.push(setTimeout(playCreatureSound, next));
  }

  function playDistantGrowl() {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 1.5);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 3;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.6, now + 0.3);
    env.gain.linearRampToValueAtTime(0.4, now + 0.8);
    env.gain.linearRampToValueAtTime(0, now + 2);

    osc.connect(filter);
    filter.connect(env);
    env.connect(creaturesGain);

    osc.start(now);
    osc.stop(now + 2);
  }

  function playCreatureWhine() {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
    osc.frequency.exponentialRampToValueAtTime(200, now + 1.5);

    const vibrato = ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 6;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 30;
    vibrato.connect(vibGain);
    vibGain.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 4;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.3, now + 0.15);
    env.gain.linearRampToValueAtTime(0.2, now + 0.8);
    env.gain.linearRampToValueAtTime(0, now + 1.8);

    osc.connect(filter);
    filter.connect(env);
    env.connect(creaturesGain);

    osc.start(now);
    vibrato.start(now);
    osc.stop(now + 1.8);
    vibrato.stop(now + 1.8);
  }

  function playChirpClick() {
    const now = ctx.currentTime;
    // Series of rapid clicks (like a bloodsucker echo-location)
    for (let i = 0; i < 4 + Math.floor(Math.random() * 5); i++) {
      const t = now + i * (0.08 + Math.random() * 0.06);
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 1500 + Math.random() * 2000;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.15, t + 0.005);
      env.gain.linearRampToValueAtTime(0, t + 0.03);

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      osc.connect(filter);
      filter.connect(env);
      env.connect(creaturesGain);

      osc.start(t);
      osc.stop(t + 0.04);
    }
  }

  function playDistantHowl() {
    const now = ctx.currentTime;
    const dur = 2.5 + Math.random() * 1.5;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + dur * 0.3);
    osc.frequency.exponentialRampToValueAtTime(350, now + dur * 0.6);
    osc.frequency.exponentialRampToValueAtTime(120, now + dur);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(152, now);
    osc2.frequency.exponentialRampToValueAtTime(405, now + dur * 0.3);
    osc2.frequency.exponentialRampToValueAtTime(348, now + dur * 0.6);
    osc2.frequency.exponentialRampToValueAtTime(118, now + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 2;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.35, now + dur * 0.15);
    env.gain.linearRampToValueAtTime(0.25, now + dur * 0.5);
    env.gain.linearRampToValueAtTime(0, now + dur);

    const mix = ctx.createGain();
    mix.gain.value = 0.5;

    osc.connect(mix);
    osc2.connect(mix);
    mix.connect(filter);
    filter.connect(env);
    env.connect(creaturesGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + dur);
    osc2.stop(now + dur);
  }

  // ========== LAYER 4: THUNDER ==========
  function playThunder() {
    if (!isPlaying) return;

    const now = ctx.currentTime;

    // Crack (sharp noise burst)
    const crack = ctx.createBufferSource();
    crack.buffer = noiseBuffer(0.3);
    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = 'highpass';
    crackFilter.frequency.value = 800;
    const crackEnv = ctx.createGain();
    crackEnv.gain.setValueAtTime(0, now);
    crackEnv.gain.linearRampToValueAtTime(0.7, now + 0.01);
    crackEnv.gain.linearRampToValueAtTime(0, now + 0.15);
    crack.connect(crackFilter);
    crackFilter.connect(crackEnv);
    crackEnv.connect(thunderGain);
    crack.start(now);

    // Rumble (low filtered noise, longer)
    const rumble = ctx.createBufferSource();
    rumble.buffer = noiseBuffer(4);
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 150;
    rumbleFilter.Q.value = 3;
    const rumbleEnv = ctx.createGain();
    rumbleEnv.gain.setValueAtTime(0, now + 0.05);
    rumbleEnv.gain.linearRampToValueAtTime(0.6, now + 0.2);
    rumbleEnv.gain.linearRampToValueAtTime(0.3, now + 1.5);
    rumbleEnv.gain.linearRampToValueAtTime(0, now + 3.5);
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleEnv);
    rumbleEnv.connect(thunderGain);
    rumble.start(now);

    // Next thunder in 15-45 seconds
    const next = 15000 + Math.random() * 30000;
    timers.push(setTimeout(playThunder, next));
  }

  // ========== LAYER 5: GEIGER / STATIC ==========
  function startStatic() {
    // Continuous low-level crackle
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(2);
    noise.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4000;

    const vol = ctx.createGain();
    vol.gain.value = 0.3;

    noise.connect(hp);
    hp.connect(vol);
    vol.connect(staticGain);
    noise.start();

    // Random geiger clicks
    scheduleGeigerBurst();
  }

  function scheduleGeigerBurst() {
    if (!isPlaying) return;

    const now = ctx.currentTime;
    const clicks = 2 + Math.floor(Math.random() * 8);

    for (let i = 0; i < clicks; i++) {
      const t = now + i * (0.04 + Math.random() * 0.12);
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 2000 + Math.random() * 3000;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.4 + Math.random() * 0.3, t + 0.001);
      env.gain.linearRampToValueAtTime(0, t + 0.008);

      osc.connect(env);
      env.connect(staticGain);
      osc.start(t);
      osc.stop(t + 0.01);
    }

    const next = 3000 + Math.random() * 10000;
    timers.push(setTimeout(scheduleGeigerBurst, next));
  }

  // ========== CONTROLS ==========
  function start() {
    if (isPlaying) return;
    init();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Fade in
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(MASTER_VOLUME, ctx.currentTime + 2);

    startDrone();
    startWind();
    startStatic();

    // Delayed start for creatures and thunder
    timers.push(setTimeout(playCreatureSound, 5000 + Math.random() * 5000));
    timers.push(setTimeout(playThunder, 3000 + Math.random() * 8000));

    isPlaying = true;
    isUnlocked = true;
    updateButton();
  }

  function stop() {
    if (!isPlaying || !ctx) return;
    isPlaying = false;

    // Fade out
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);

    // Clear scheduled events
    timers.forEach(t => clearTimeout(t));
    timers = [];

    // Suspend context after fade
    setTimeout(() => {
      if (!isPlaying && ctx) ctx.suspend();
    }, 1200);

    updateButton();
  }

  function toggle() {
    if (isPlaying) stop();
    else start();
  }

  // ========== UI BUTTON ==========
  function updateButton() {
    const btn = document.getElementById('audioToggle');
    if (!btn) return;
    const icon = btn.querySelector('.audio-toggle-icon');
    if (icon) {
      icon.innerHTML = isPlaying ? '&#9835;' : '&#9836;';
    }
    btn.classList.toggle('audio-muted', !isPlaying);
    btn.title = isPlaying ? 'Выключить звук Зоны' : 'Включить звук Зоны';
  }

  function createButton() {
    const btn = document.createElement('button');
    btn.className = 'audio-toggle audio-muted';
    btn.id = 'audioToggle';
    btn.title = 'Включить звук Зоны';
    btn.innerHTML = '<span class="audio-toggle-icon">&#9836;</span>';
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);

    // Auto-start on first user interaction (click anywhere)
    const autoStart = () => {
      if (!isUnlocked) {
        start();
      }
      document.removeEventListener('click', autoStart);
    };
    // Slight delay so the button click itself triggers it
    setTimeout(() => {
      if (!isUnlocked) {
        document.addEventListener('click', autoStart);
      }
    }, 500);
  }

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createButton);
  } else {
    createButton();
  }

  return { start, stop, toggle, isPlaying: () => isPlaying };
})();
