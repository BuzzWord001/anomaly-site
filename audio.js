/* ===== A.N.O.M.A.L.Y. ОНЛАЙН — Zone Ambient Audio Engine ===== */
/* Dark melody + distant creature sounds                          */

const ZoneAudio = (() => {
  let ctx = null;
  let masterGain = null;
  let isPlaying = false;
  let isUnlocked = false;
  let timers = [];
  let volume = 0.35;

  let melodyGain, padGain, creaturesGain;

  // --- D minor / aeolian scale (the Zone's key) ---
  // Octave 2-4, dark and low
  const SCALE = {
    bass:    [55.00, 61.74, 65.41, 73.42, 82.41, 87.31, 98.00],       // A1-G2
    low:     [110.0, 123.5, 130.8, 146.8, 164.8, 174.6, 196.0],       // A2-G3
    mid:     [220.0, 246.9, 261.6, 293.7, 329.6, 349.2, 392.0],       // A3-G4
    high:    [440.0, 493.9, 523.3, 587.3, 659.3, 698.5, 784.0],       // A4-G5
  };

  // Chord progressions — Am, Dm, Em, F, Am (i - iv - v - VI - i)
  const CHORDS = [
    [0, 2, 4],    // Am  (A C E)
    [3, 5, 0],    // Dm  (D F A)
    [4, 6, 1],    // Em  (E G B)
    [5, 0, 2],    // F   (F A C)
    [0, 2, 4],    // Am
    [3, 5, 0],    // Dm
    [1, 3, 5],    // Bdim(B D F)
    [0, 2, 4],    // Am
  ];

  let chordIndex = 0;
  let convolver = null;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);

    // Create reverb
    convolver = createReverb(4.5, 2.5);

    // Wet/dry mix for reverb
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.6;
    convolver.connect(reverbGain);
    reverbGain.connect(masterGain);

    // Dry path also to master
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.5;

    melodyGain = ctx.createGain();
    melodyGain.gain.value = 0.4;
    melodyGain.connect(convolver);
    melodyGain.connect(dryGain);
    dryGain.connect(masterGain);

    padGain = ctx.createGain();
    padGain.gain.value = 0.25;
    padGain.connect(convolver);
    padGain.connect(masterGain);

    creaturesGain = ctx.createGain();
    creaturesGain.gain.value = 0.18;
    creaturesGain.connect(convolver);
    creaturesGain.connect(masterGain);
  }

  // --- Algorithmic reverb via noise convolution ---
  function createReverb(duration, decay) {
    const len = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  function noiseBuffer(duration) {
    const len = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  // ========== MAIN: DARK ZONE MELODY ==========

  // Evolving dark pad — the "soul" of the Zone
  function startPad() {
    playPadChord();
  }

  function playPadChord() {
    if (!isPlaying) return;

    const now = ctx.currentTime;
    const chord = CHORDS[chordIndex % CHORDS.length];
    const dur = 8 + Math.random() * 4; // 8-12 sec per chord

    chord.forEach((noteIdx, i) => {
      // Two detuned oscillators per note for thickness
      const freq = SCALE.bass[noteIdx];

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = freq;

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 1.002; // slight detune

      // Octave above, very quiet
      const osc3 = ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.value = freq * 2;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200 + Math.random() * 100;
      filter.Q.value = 1;

      // Slow filter sweep
      const filterLfo = ctx.createOscillator();
      filterLfo.type = 'sine';
      filterLfo.frequency.value = 0.04 + Math.random() * 0.03;
      const filterLfoGain = ctx.createGain();
      filterLfoGain.gain.value = 80;
      filterLfo.connect(filterLfoGain);
      filterLfoGain.connect(filter.frequency);

      const env = ctx.createGain();
      const startTime = now + i * 0.3;
      env.gain.setValueAtTime(0, startTime);
      env.gain.linearRampToValueAtTime(0.2, startTime + 2.5);
      env.gain.linearRampToValueAtTime(0.15, startTime + dur - 3);
      env.gain.linearRampToValueAtTime(0, startTime + dur);

      const mix = ctx.createGain();
      mix.gain.value = 0.4;

      osc1.connect(mix);
      osc2.connect(mix);
      const octGain = ctx.createGain();
      octGain.gain.value = 0.08;
      osc3.connect(octGain);
      octGain.connect(mix);

      mix.connect(filter);
      filter.connect(env);
      env.connect(padGain);

      osc1.start(startTime);
      osc2.start(startTime);
      osc3.start(startTime);
      filterLfo.start(startTime);
      osc1.stop(startTime + dur + 0.5);
      osc2.stop(startTime + dur + 0.5);
      osc3.stop(startTime + dur + 0.5);
      filterLfo.stop(startTime + dur + 0.5);
    });

    chordIndex++;
    timers.push(setTimeout(playPadChord, dur * 1000 - 2000));
  }

  // Melody — sparse, haunting single notes
  function startMelody() {
    timers.push(setTimeout(playMelodyPhrase, 3000));
  }

  function playMelodyPhrase() {
    if (!isPlaying) return;

    // Pick 3-6 notes for a phrase
    const noteCount = 3 + Math.floor(Math.random() * 4);
    const now = ctx.currentTime;
    let offset = 0;

    // Current chord for consonance
    const chord = CHORDS[chordIndex % CHORDS.length];

    for (let i = 0; i < noteCount; i++) {
      // 70% chance chord tone, 30% passing tone
      let noteIdx;
      if (Math.random() < 0.7) {
        noteIdx = chord[Math.floor(Math.random() * chord.length)];
      } else {
        noteIdx = Math.floor(Math.random() * 7);
      }

      // Choose octave — mostly low/mid
      const octave = Math.random() < 0.6 ? 'low' : 'mid';
      const freq = SCALE[octave][noteIdx];

      const noteDur = 1.5 + Math.random() * 3; // 1.5 - 4.5 sec per note
      const gap = 0.5 + Math.random() * 2;     // silence between notes

      playMelodyNote(freq, now + offset, noteDur);
      offset += noteDur + gap;
    }

    // Next phrase after this one + pause
    const pause = 4000 + Math.random() * 8000;
    timers.push(setTimeout(playMelodyPhrase, offset * 1000 + pause));
  }

  function playMelodyNote(freq, startTime, dur) {
    // Main tone
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    // Subtle vibrato
    const vibrato = ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 4 + Math.random() * 2;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 2 + Math.random() * 2;
    vibrato.connect(vibGain);
    vibGain.connect(osc.frequency);

    // Second voice — fifth above, very quiet (ghostly harmonic)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 1.498; // slightly flat fifth
    const ghostGain = ctx.createGain();
    ghostGain.gain.value = 0.06;

    // Warmth filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 3;
    filter.Q.value = 0.7;

    // Envelope — slow attack, long sustain, slow release
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(0.35, startTime + Math.min(dur * 0.3, 1));
    env.gain.setValueAtTime(0.35, startTime + dur * 0.4);
    env.gain.linearRampToValueAtTime(0.2, startTime + dur * 0.7);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    osc.connect(filter);
    osc2.connect(ghostGain);
    ghostGain.connect(filter);
    filter.connect(env);
    env.connect(melodyGain);

    osc.start(startTime);
    osc2.start(startTime);
    vibrato.start(startTime);
    osc.stop(startTime + dur + 0.1);
    osc2.stop(startTime + dur + 0.1);
    vibrato.stop(startTime + dur + 0.1);
  }

  // Occasional deep bell / distant signal — like an anomaly detector
  function playDistantBell() {
    if (!isPlaying) return;

    const now = ctx.currentTime;
    const chord = CHORDS[chordIndex % CHORDS.length];
    const noteIdx = chord[0];
    const freq = SCALE.mid[noteIdx];

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Harmonics for bell-like timbre
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2.756;
    const h2 = ctx.createGain();
    h2.gain.value = 0.08;

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 5.404;
    const h3 = ctx.createGain();
    h3.gain.value = 0.03;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.2, now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.08, now + 1);
    env.gain.exponentialRampToValueAtTime(0.001, now + 4);

    const mix = ctx.createGain();
    mix.gain.value = 0.3;

    osc.connect(mix);
    osc2.connect(h2);
    h2.connect(mix);
    osc3.connect(h3);
    h3.connect(mix);
    mix.connect(env);
    env.connect(melodyGain);

    osc.start(now);
    osc2.start(now);
    osc3.start(now);
    osc.stop(now + 4.5);
    osc2.stop(now + 4.5);
    osc3.stop(now + 4.5);

    const next = 20000 + Math.random() * 40000;
    timers.push(setTimeout(playDistantBell, next));
  }

  // ========== CREATURES ==========
  function playCreatureSound() {
    if (!isPlaying) return;
    const type = Math.floor(Math.random() * 4);

    switch (type) {
      case 0: playDistantGrowl(); break;
      case 1: playCreatureWhine(); break;
      case 2: playChirpClick(); break;
      case 3: playDistantHowl(); break;
    }

    const next = 12000 + Math.random() * 25000;
    timers.push(setTimeout(playCreatureSound, next));
  }

  function playDistantGrowl() {
    const now = ctx.currentTime;
    const dur = 2.5 + Math.random() * 1.5;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70 + Math.random() * 20, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + dur);

    // Rumble modulation
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = 15 + Math.random() * 10;
    const modGain = ctx.createGain();
    modGain.gain.value = 10;
    mod.connect(modGain);
    modGain.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    filter.Q.value = 4;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.5, now + 0.4);
    env.gain.linearRampToValueAtTime(0.35, now + dur * 0.6);
    env.gain.linearRampToValueAtTime(0, now + dur);

    osc.connect(filter);
    filter.connect(env);
    env.connect(creaturesGain);
    osc.start(now);
    mod.start(now);
    osc.stop(now + dur);
    mod.stop(now + dur);
  }

  function playCreatureWhine() {
    const now = ctx.currentTime;
    const dur = 1.5 + Math.random() * 1.5;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250 + Math.random() * 100, now);
    osc.frequency.exponentialRampToValueAtTime(700 + Math.random() * 200, now + dur * 0.4);
    osc.frequency.exponentialRampToValueAtTime(180 + Math.random() * 50, now + dur);

    const vibrato = ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 5 + Math.random() * 4;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 25 + Math.random() * 20;
    vibrato.connect(vibGain);
    vibGain.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 450;
    filter.Q.value = 3;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.25, now + 0.12);
    env.gain.linearRampToValueAtTime(0.18, now + dur * 0.6);
    env.gain.linearRampToValueAtTime(0, now + dur);

    osc.connect(filter);
    filter.connect(env);
    env.connect(creaturesGain);
    osc.start(now);
    vibrato.start(now);
    osc.stop(now + dur);
    vibrato.stop(now + dur);
  }

  function playChirpClick() {
    const now = ctx.currentTime;
    const count = 3 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const t = now + i * (0.07 + Math.random() * 0.08);
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 1200 + Math.random() * 2500;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.12, t + 0.004);
      env.gain.linearRampToValueAtTime(0, t + 0.025);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2000;
      filter.Q.value = 2;

      osc.connect(filter);
      filter.connect(env);
      env.connect(creaturesGain);
      osc.start(t);
      osc.stop(t + 0.035);
    }
  }

  function playDistantHowl() {
    const now = ctx.currentTime;
    const dur = 3 + Math.random() * 2.5;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130 + Math.random() * 30, now);
    osc.frequency.exponentialRampToValueAtTime(380 + Math.random() * 60, now + dur * 0.35);
    osc.frequency.exponentialRampToValueAtTime(320 + Math.random() * 40, now + dur * 0.6);
    osc.frequency.exponentialRampToValueAtTime(100 + Math.random() * 30, now + dur);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(132, now);
    osc2.frequency.exponentialRampToValueAtTime(385, now + dur * 0.35);
    osc2.frequency.exponentialRampToValueAtTime(318, now + dur * 0.6);
    osc2.frequency.exponentialRampToValueAtTime(98, now + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 280;
    filter.Q.value = 2;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.3, now + dur * 0.15);
    env.gain.linearRampToValueAtTime(0.22, now + dur * 0.5);
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

  // ========== CONTROLS ==========
  function setVolume(val) {
    volume = val;
    if (masterGain) {
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
    }
    try { localStorage.setItem('zoneAudioVol', val); } catch(e) {}
  }

  function start() {
    if (isPlaying) return;
    init();

    if (ctx.state === 'suspended') ctx.resume();

    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3);

    // Start the dark melody
    startPad();
    startMelody();

    // Creatures and bell — delayed
    timers.push(setTimeout(playCreatureSound, 8000 + Math.random() * 7000));
    timers.push(setTimeout(playDistantBell, 15000 + Math.random() * 10000));

    isPlaying = true;
    isUnlocked = true;
    updateUI();
  }

  function stop() {
    if (!isPlaying || !ctx) return;
    isPlaying = false;

    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);

    timers.forEach(t => clearTimeout(t));
    timers = [];

    setTimeout(() => {
      if (!isPlaying && ctx) ctx.suspend();
    }, 1800);

    updateUI();
  }

  function toggle() {
    if (isPlaying) stop();
    else start();
  }

  // ========== UI ==========
  function updateUI() {
    const btn = document.getElementById('audioToggleBtn');
    const slider = document.getElementById('audioVolumeSlider');
    if (!btn) return;

    btn.classList.toggle('active', isPlaying);

    const svg = btn.querySelector('.audio-icon-svg');
    if (svg) {
      svg.innerHTML = isPlaying ? getSpeakerOnSVG() : getSpeakerOffSVG();
    }

    if (slider) {
      slider.style.opacity = isPlaying ? '1' : '0.4';
    }
  }

  function getSpeakerOnSVG() {
    return `<path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor"/>
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="currentColor" opacity="0.7"/>
      <path d="M19 12c0 3.53-2.04 6.58-5 8.03v2.21c4.01-1.82 6.8-5.86 6.8-10.24S18.01 3.58 14 1.76v2.22c2.96 1.46 5 4.5 5 8.02z" fill="currentColor" opacity="0.4"/>`;
  }

  function getSpeakerOffSVG() {
    return `<path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" opacity="0.4"/>
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v1.79l4.72 4.72c.14-.5.22-1.03.28-1.48z" fill="currentColor" opacity="0.2"/>
      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>`;
  }

  function createUI() {
    try {
      const saved = localStorage.getItem('zoneAudioVol');
      if (saved !== null) volume = parseFloat(saved);
    } catch(e) {}

    const header = document.querySelector('.header-content');
    if (!header) return;

    const panel = document.createElement('div');
    panel.className = 'audio-control';
    panel.innerHTML = `
      <button class="audio-toggle-btn" id="audioToggleBtn" title="ЗВУК ЗОНЫ">
        <svg class="audio-icon-svg" viewBox="0 0 24 24" width="20" height="20">
          ${getSpeakerOffSVG()}
        </svg>
      </button>
      <div class="audio-slider-wrap">
        <div class="audio-slider-track">
          <div class="audio-slider-fill" id="audioSliderFill"></div>
          <div class="audio-slider-glow" id="audioSliderGlow"></div>
        </div>
        <input type="range" class="audio-volume-slider" id="audioVolumeSlider"
          min="0" max="100" value="${Math.round(volume * 100)}"
          title="Громкость">
      </div>
      <span class="audio-label">ЗОНА</span>
    `;

    header.appendChild(panel);

    document.getElementById('audioToggleBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });

    const slider = document.getElementById('audioVolumeSlider');
    const fill = document.getElementById('audioSliderFill');
    const glow = document.getElementById('audioSliderGlow');

    function updateSliderVisual() {
      const pct = slider.value + '%';
      fill.style.width = pct;
      glow.style.width = pct;
    }
    updateSliderVisual();

    slider.addEventListener('input', (e) => {
      e.stopPropagation();
      const val = parseInt(slider.value) / 100;
      setVolume(val);
      updateSliderVisual();
      if (!isPlaying && val > 0) start();
      if (isPlaying && val === 0) stop();
    });

    slider.addEventListener('click', (e) => e.stopPropagation());

    // --- Auto-start: try immediately, then on ANY user interaction ---
    const events = ['click', 'touchstart', 'mousemove', 'scroll', 'keydown'];

    function autoStart() {
      if (isUnlocked) return;
      start();
      events.forEach(ev => document.removeEventListener(ev, autoStart, { capture: true }));
    }

    // Try to play right away (works if browser allows autoplay)
    try {
      start();
      // If AudioContext got suspended, set up listeners
      if (ctx && ctx.state === 'suspended') {
        isPlaying = false;
        isUnlocked = false;
        updateUI();
        events.forEach(ev => {
          document.addEventListener(ev, autoStart, { capture: true, once: false, passive: true });
        });
      }
    } catch(e) {
      // Autoplay blocked — wait for interaction
      events.forEach(ev => {
        document.addEventListener(ev, autoStart, { capture: true, once: false, passive: true });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createUI);
  } else {
    createUI();
  }

  return { start, stop, toggle, setVolume, isPlaying: () => isPlaying };
})();
