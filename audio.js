/* ===== A.N.O.M.A.L.Y. ОНЛАЙН — Zone Audio Player ===== */
/* OST 10 — Саня БтрЪ (Студия BTR FM) — dark ambient    */

const ZoneAudio = (() => {
  let audio = null;
  let isPlaying = false;
  let isUnlocked = false;
  let volume = 0.25; // 1/4 громкости по умолчанию

  function initAudio() {
    if (audio) return;
    audio = new Audio('assets/zone-ambient.mp3');
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
  }

  function start() {
    if (isPlaying) return;
    initAudio();
    audio.volume = volume;
    audio.play().then(() => {
      isPlaying = true;
      isUnlocked = true;
      updateUI();
    }).catch(() => {
      // Autoplay blocked — will retry on interaction
    });
  }

  function stop() {
    if (!isPlaying || !audio) return;
    audio.pause();
    isPlaying = false;
    updateUI();
  }

  function toggle() {
    if (isPlaying) stop();
    else start();
  }

  function setVolume(val) {
    volume = val;
    if (audio) audio.volume = volume;
    try { localStorage.setItem('zoneAudioVol', val); } catch(e) {}
  }

  // ========== UI ==========
  function updateUI() {
    const btn = document.getElementById('audioToggleBtn');
    if (!btn) return;
    btn.classList.toggle('active', isPlaying);

    const icon = btn.querySelector('.audio-icon-svg');
    if (icon) {
      icon.innerHTML = isPlaying ? getIconOn() : getIconOff();
    }

    const slider = document.getElementById('audioVolumeSlider');
    if (slider) slider.style.opacity = isPlaying ? '1' : '0.4';
  }

  // Speaker icon — ON (with sound waves)
  function getIconOn() {
    return `
      <polygon points="2,8 2,16 6,16 12,20 12,4 6,8" fill="currentColor"/>
      <path d="M16 8.5c0 0 1.5 1.2 1.5 3.5s-1.5 3.5-1.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M19 6c0 0 2.5 2.2 2.5 6s-2.5 6-2.5 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`;
  }

  // Speaker icon — OFF (muted, with X)
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

    panel.innerHTML = `
      <button class="audio-toggle-btn" id="audioToggleBtn" title="ЗВУК ЗОНЫ">
        <svg class="audio-icon-svg" viewBox="0 0 24 24" width="20" height="20">
          ${getIconOff()}
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

    // Button click
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
      if (!isPlaying && val > 0) start();
      if (isPlaying && val === 0) stop();
    });
    slider.addEventListener('click', (e) => e.stopPropagation());

    // --- Auto-start on ANY interaction ---
    const events = ['click', 'touchstart', 'mousemove', 'scroll', 'keydown'];

    function autoStart() {
      if (isUnlocked) return;
      start();
      events.forEach(ev => document.removeEventListener(ev, autoStart, { capture: true }));
    }

    // Try immediate playback
    initAudio();
    audio.play().then(() => {
      isPlaying = true;
      isUnlocked = true;
      updateUI();
    }).catch(() => {
      // Blocked — wait for user gesture
      events.forEach(ev => {
        document.addEventListener(ev, autoStart, { capture: true, passive: true });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createUI);
  } else {
    createUI();
  }

  return { start, stop, toggle, setVolume, isPlaying: () => isPlaying };
})();
