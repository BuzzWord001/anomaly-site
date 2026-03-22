/* ===== A.N.O.M.A.L.Y. ОНЛАЙН — Zone Audio Player ===== */
/* OST 10 — Саня БтрЪ (Студия BTR FM) — dark ambient    */

const ZoneAudio = (() => {
  let audioA = null;
  let audioB = null;
  let activeAudio = null;   // which one is currently playing
  let fadeTimer = null;
  let isPlaying = false;
  let isUnlocked = false;
  let wantPlay = true;
  let volume = 0.25;

  const CROSSFADE_SEC = 4;  // seconds of crossfade overlap
  const FADE_STEPS = 60;    // smoothness

  function createAudioEl() {
    const a = new Audio('assets/zone-ambient.mp3');
    a.loop = false;
    a.volume = 0;
    a.preload = 'auto';
    return a;
  }

  function initAudio() {
    if (audioA) return;
    // Reuse the HTML autoplay element if it exists and is playing
    const preload = document.getElementById('zoneAudioPreload');
    if (preload && !preload.paused && preload.currentTime > 0) {
      // Browser allowed autoplay via HTML — hijack this element
      preload.loop = false;
      preload.volume = volume;
      audioA = preload;
      audioB = createAudioEl();
      activeAudio = audioA;
      isPlaying = true;
      isUnlocked = true;
      startCrossfadeLoop(audioA);
      updateUI();
      return;
    }
    // Otherwise clean up the preload element
    if (preload) { preload.pause(); preload.remove(); }
    audioA = createAudioEl();
    audioB = createAudioEl();
    activeAudio = audioA;
  }

  function startCrossfadeLoop(src) {
    // When src approaches end, fade it out and fade in the other
    const checkInterval = 250; // ms

    if (fadeTimer) clearInterval(fadeTimer);

    fadeTimer = setInterval(() => {
      if (!isPlaying || !wantPlay) return;
      if (!src || src.paused) return;

      const timeLeft = src.duration - src.currentTime;
      if (isNaN(timeLeft)) return;

      if (timeLeft <= CROSSFADE_SEC && timeLeft > 0) {
        // Start crossfade
        clearInterval(fadeTimer);
        fadeTimer = null;

        const next = (src === audioA) ? audioB : audioA;
        next.currentTime = 0;
        next.volume = 0;
        next.play().catch(() => {});

        let step = 0;
        const interval = (CROSSFADE_SEC * 1000) / FADE_STEPS;

        const fadeInterval = setInterval(() => {
          step++;
          const progress = step / FADE_STEPS;

          // Fade out current
          src.volume = Math.max(0, volume * (1 - progress));
          // Fade in next
          next.volume = Math.min(volume, volume * progress);

          if (step >= FADE_STEPS) {
            clearInterval(fadeInterval);
            src.pause();
            src.currentTime = 0;
            src.volume = 0;
            next.volume = volume;
            activeAudio = next;
            // Start watching the new active track
            startCrossfadeLoop(next);
          }
        }, interval);
      }
    }, checkInterval);
  }

  function tryPlay() {
    if (!wantPlay || isPlaying) return;
    initAudio();
    activeAudio.currentTime = 0;
    activeAudio.volume = volume;
    activeAudio.play().then(() => {
      isPlaying = true;
      isUnlocked = true;
      startCrossfadeLoop(activeAudio);
      updateUI();
    }).catch(() => {});
  }

  function stop() {
    if (!audioA) return;
    if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
    audioA.pause();
    audioB.pause();
    isPlaying = false;
    wantPlay = false;
    updateUI();
  }

  function toggle() {
    if (wantPlay && isPlaying) {
      stop();
    } else {
      wantPlay = true;
      updateUI();
      tryPlay();
    }
  }

  function setVolume(val) {
    volume = val;
    if (activeAudio && !activeAudio.paused) {
      activeAudio.volume = volume;
    }
    try { localStorage.setItem('zoneAudioVol', val); } catch(e) {}
  }

  // ========== UI ==========
  // UI отражает wantPlay (намерение), а не isPlaying (факт)
  function updateUI() {
    const btn = document.getElementById('audioToggleBtn');
    if (!btn) return;
    btn.classList.toggle('active', wantPlay);

    const icon = btn.querySelector('.audio-icon-svg');
    if (icon) {
      icon.innerHTML = wantPlay ? getIconOn() : getIconOff();
    }

    const slider = document.getElementById('audioVolumeSlider');
    if (slider) slider.style.opacity = wantPlay ? '1' : '0.4';
  }

  function getIconOn() {
    return `
      <polygon points="2,8 2,16 6,16 12,20 12,4 6,8" fill="currentColor"/>
      <path d="M16 8.5c0 0 1.5 1.2 1.5 3.5s-1.5 3.5-1.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M19 6c0 0 2.5 2.2 2.5 6s-2.5 6-2.5 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`;
  }

  function getIconOff() {
    return `
      <polygon points="2,8 2,16 6,16 12,20 12,4 6,8" fill="currentColor" opacity="0.35"/>
      <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.5"/>
      <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.5"/>`;
  }

  function createUI() {
    try {
      const saved = localStorage.getItem('zoneAudioVol');
      if (saved !== null) volume = parseFloat(saved);
    } catch(e) {}

    const panel = document.getElementById('audioControl');
    if (!panel) return;

    // Рендерим сразу как АКТИВНЫЙ — звук по умолчанию включён
    panel.innerHTML = `
      <button class="audio-toggle-btn active" id="audioToggleBtn" title="ЗВУК ЗОНЫ">
        <svg class="audio-icon-svg" viewBox="0 0 24 24" width="20" height="20">
          ${getIconOn()}
        </svg>
        <span class="audio-glitch-layer"></span>
        <span class="audio-glitch-layer g2"></span>
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
    `;

    // Button
    document.getElementById('audioToggleBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });

    // Slider
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
      if (val > 0 && !isPlaying) { wantPlay = true; tryPlay(); updateUI(); }
      if (val === 0 && isPlaying) stop();
    });
    slider.addEventListener('click', (e) => e.stopPropagation());

    // --- AUTOPLAY STRATEGY ---
    // 1. Try normal autoplay with sound
    // 2. If blocked: start muted via Web Audio API (gain=0), unmute on interaction
    // Web Audio API lets us control volume via GainNode without needing "user activation"

    let actx = null;
    let gainNode = null;
    let mutedPlaying = false;

    function connectWebAudio(audioEl) {
      if (actx) return;
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        const source = actx.createMediaElementSource(audioEl);
        gainNode = actx.createGain();
        gainNode.gain.value = 0; // start silent
        source.connect(gainNode);
        gainNode.connect(actx.destination);
      } catch(e) {}
    }

    function unmute() {
      if (isUnlocked) return;
      isUnlocked = true;

      if (gainNode) {
        // Smooth fade in via Web Audio gain
        gainNode.gain.cancelScheduledValues(actx.currentTime);
        gainNode.gain.setValueAtTime(0, actx.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, actx.currentTime + 0.8);
      }
      if (activeAudio) {
        activeAudio.muted = false;
        activeAudio.volume = volume;
      }
      if (actx && actx.state === 'suspended') {
        actx.resume();
      }
      removeListeners();
    }

    const interactionEvents = ['click', 'touchstart', 'touchend', 'mousemove', 'mousedown',
                               'scroll', 'keydown', 'pointerdown', 'pointerup', 'wheel'];

    function removeListeners() {
      interactionEvents.forEach(ev => {
        document.removeEventListener(ev, onInteraction, { capture: true });
        window.removeEventListener(ev, onInteraction, { capture: true });
      });
    }

    function addListeners() {
      interactionEvents.forEach(ev => {
        document.addEventListener(ev, onInteraction, { capture: true, passive: true });
        window.addEventListener(ev, onInteraction, { capture: true, passive: true });
      });
    }

    function onInteraction() {
      if (isUnlocked) return;
      if (!wantPlay) { removeListeners(); return; }

      if (mutedPlaying && activeAudio) {
        // Track already playing silently — just unmute
        unmute();
        return;
      }

      // Not playing at all — try to start
      tryPlay();
      if (!isPlaying) {
        setTimeout(tryPlay, 100);
        setTimeout(tryPlay, 300);
      } else {
        removeListeners();
      }
    }

    // Step 1: Try normal autoplay with sound
    tryPlay();

    if (!isPlaying) {
      // Step 2: Start via Web Audio API with gain=0 (silent but playing)
      initAudio();
      connectWebAudio(activeAudio);
      activeAudio.muted = false; // not muted — volume controlled by gainNode
      activeAudio.volume = 1;    // full volume to audio element, gain controls actual output
      activeAudio.currentTime = 0;
      activeAudio.play().then(() => {
        isPlaying = true;
        mutedPlaying = true;
        startCrossfadeLoop(activeAudio);
        updateUI();
        addListeners();
      }).catch(() => {
        // Even this failed — try HTML muted approach
        activeAudio.muted = true;
        activeAudio.volume = 0;
        activeAudio.play().then(() => {
          isPlaying = true;
          mutedPlaying = true;
          startCrossfadeLoop(activeAudio);
          updateUI();
          addListeners();
        }).catch(() => {
          // Total block — wait for interaction
          addListeners();
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createUI);
  } else {
    createUI();
  }

  return { start: tryPlay, stop, toggle, setVolume, isPlaying: () => isPlaying };
})();
