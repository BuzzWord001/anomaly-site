(function() {
  const canvas = document.getElementById('sideEffects');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, leftEdge, rightEdge;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    const imgAspect = 9 / 16;
    const screenAspect = W / H;
    let imgW;
    if (screenAspect > imgAspect) {
      imgW = H * imgAspect;
    } else {
      imgW = W;
    }
    leftEdge = (W - imgW) / 2;
    rightEdge = (W + imgW) / 2;
  }

  resize();
  window.addEventListener('resize', resize);

  // Pick X in side zones (with overlap into image edges)
  function sideX(overlap) {
    overlap = overlap || 80;
    if (Math.random() < 0.5) {
      return Math.random() * (leftEdge + overlap);
    } else {
      return rightEdge - overlap + Math.random() * (W - rightEdge + overlap);
    }
  }

  // =========================================
  // LIGHTNING — big, bright, red, frequent
  // =========================================
  let bolts = [];
  let boltTimer = 0;
  let nextBolt = 800;

  function makeBolt() {
    const startX = sideX(120);
    const pts = [{ x: startX, y: -10 }];
    let x = startX, y = -10;
    const steps = 10 + Math.floor(Math.random() * 10);
    const reach = H * (0.35 + Math.random() * 0.3);

    for (let i = 0; i < steps; i++) {
      x += (Math.random() - 0.5) * 90;
      y += reach / steps + Math.random() * 15;
      pts.push({ x, y });
    }

    // branches
    const branches = [];
    for (let i = 2; i < pts.length; i++) {
      if (Math.random() < 0.4) {
        const bp = [{ x: pts[i].x, y: pts[i].y }];
        let bx = pts[i].x, by = pts[i].y;
        const bSteps = 3 + Math.floor(Math.random() * 4);
        for (let j = 0; j < bSteps; j++) {
          bx += (Math.random() - 0.5) * 50;
          by += 15 + Math.random() * 20;
          bp.push({ x: bx, y: by });
        }
        branches.push(bp);
      }
    }

    return {
      pts,
      branches,
      life: 0,
      maxLife: 20 + Math.random() * 15,
      width: 2 + Math.random() * 2,
      startX
    };
  }

  function drawBoltPath(points, alpha, width) {
    if (points.length < 2) return;

    // Core (bright)
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = `rgba(255, 220, 220, ${alpha})`;
    ctx.lineWidth = width;
    ctx.shadowColor = `rgba(255, 50, 50, ${alpha})`;
    ctx.shadowBlur = 25;
    ctx.stroke();

    // Outer glow (red)
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = `rgba(220, 30, 30, ${alpha * 0.7})`;
    ctx.lineWidth = width + 4;
    ctx.shadowColor = `rgba(200, 0, 0, ${alpha * 0.8})`;
    ctx.shadowBlur = 40;
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  // =========================================
  // EMBERS — glowing red/orange particles
  // =========================================
  const embers = [];
  for (let i = 0; i < 80; i++) {
    embers.push(makeEmber());
  }

  function makeEmber() {
    return {
      x: sideX(60),
      y: H + Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(0.3 + Math.random() * 1.2),
      size: 1 + Math.random() * 2.5,
      r: Math.random() < 0.7 ? 220 : 255,
      g: Math.random() < 0.5 ? 40 : Math.floor(Math.random() * 120 + 60),
      b: 20,
      alpha: 0.3 + Math.random() * 0.5,
      life: Math.random() * 500,
      maxLife: 300 + Math.random() * 400,
      flicker: Math.random() * Math.PI * 2
    };
  }

  // =========================================
  // RED FOG — pulsing clouds on sides
  // =========================================
  const fogs = [];
  for (let i = 0; i < 12; i++) {
    fogs.push({
      x: sideX(40),
      y: Math.random() * H * 0.65,
      r: 60 + Math.random() * 100,
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.008,
      baseAlpha: 0.03 + Math.random() * 0.05,
      drift: (Math.random() - 0.5) * 0.1
    });
  }

  // =========================================
  // ANOMALY WAVES — expanding red rings
  // =========================================
  const waves = [];
  let waveTimer = 0;

  function makeWave() {
    return {
      x: sideX(50),
      y: H * 0.2 + Math.random() * H * 0.5,
      radius: 0,
      maxRadius: 50 + Math.random() * 100,
      speed: 0.4 + Math.random() * 0.6
    };
  }

  // =========================================
  // ELECTRIC ARCS — small crackling lines
  // =========================================
  let arcs = [];
  let arcTimer = 0;

  function makeArc() {
    const cx = sideX(100);
    const cy = Math.random() * H * 0.6;
    const segs = [];
    let x = cx, y = cy;
    const count = 4 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const nx = x + (Math.random() - 0.5) * 35;
      const ny = y + (Math.random() - 0.5) * 35;
      segs.push({ x1: x, y1: y, x2: nx, y2: ny });
      x = nx; y = ny;
    }
    return { segs, life: 0, maxLife: 8 + Math.random() * 10 };
  }

  // =========================================
  // RADIATION SYMBOLS — faint floating icons
  // =========================================
  const icons = [];
  const iconChars = ['\u2622', '\u2623', '\u26A0', '\u2620'];
  for (let i = 0; i < 5; i++) {
    icons.push({
      x: sideX(30),
      y: H * 0.15 + Math.random() * H * 0.55,
      char: iconChars[Math.floor(Math.random() * iconChars.length)],
      phase: Math.random() * Math.PI * 2,
      speed: 0.004 + Math.random() * 0.006,
      size: 18 + Math.random() * 22
    });
  }

  // =========================================
  // MAIN LOOP
  // =========================================
  let lastTime = 0;

  function frame(time) {
    const dt = Math.min(time - lastTime, 50);
    lastTime = time;
    ctx.clearRect(0, 0, W, H);

    // --- Fog ---
    fogs.forEach(f => {
      f.phase += f.speed;
      f.x += f.drift;
      const a = f.baseAlpha * (0.6 + 0.4 * Math.sin(f.phase));
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, `rgba(120, 15, 20, ${a})`);
      g.addColorStop(0.6, `rgba(60, 5, 10, ${a * 0.4})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    });

    // --- Anomaly waves ---
    waveTimer += dt;
    if (waveTimer > 2500) {
      waveTimer = 0;
      waves.push(makeWave());
    }
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.radius += w.speed;
      const fade = 1 - w.radius / w.maxRadius;
      if (fade <= 0) { waves.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200, 30, 30, ${0.2 * fade})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = `rgba(255, 50, 50, ${0.3 * fade})`;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // --- Embers ---
    embers.forEach((e, i) => {
      e.x += e.vx;
      e.y += e.vy;
      e.life++;
      e.flicker += 0.15;
      const lf = e.life < 40 ? e.life / 40 :
                 e.life > e.maxLife - 60 ? (e.maxLife - e.life) / 60 : 1;
      const a = e.alpha * lf * (0.7 + 0.3 * Math.sin(e.flicker));
      if (a <= 0 || e.life >= e.maxLife) {
        embers[i] = makeEmber();
        return;
      }
      // Glow
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${e.r}, ${e.g}, ${e.b}, ${a * 0.12})`;
      ctx.fill();
      // Core
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${e.r}, ${e.g}, ${e.b}, ${a})`;
      ctx.fill();
    });

    // --- Lightning bolts ---
    boltTimer += dt;
    if (boltTimer > nextBolt) {
      boltTimer = 0;
      nextBolt = 600 + Math.random() * 3000;
      bolts.push(makeBolt());
      // Sometimes double bolt
      if (Math.random() < 0.3) {
        setTimeout(() => bolts.push(makeBolt()), 80 + Math.random() * 150);
      }
    }

    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.life++;
      // Flash pattern: bright → dim → bright → fade
      let alpha;
      if (b.life < 3) alpha = 1;
      else if (b.life < 5) alpha = 0.3;
      else if (b.life < 8) alpha = 0.8;
      else alpha = Math.max(0, 1 - (b.life - 8) / (b.maxLife - 8));

      if (alpha <= 0) { bolts.splice(i, 1); continue; }

      drawBoltPath(b.pts, alpha, b.width);
      b.branches.forEach(br => drawBoltPath(br, alpha * 0.5, b.width * 0.6));

      // Red flash illumination
      if (b.life < 4) {
        const g = ctx.createRadialGradient(b.startX, H * 0.15, 0, b.startX, H * 0.15, 350);
        g.addColorStop(0, `rgba(200, 20, 20, ${0.12 * alpha})`);
        g.addColorStop(0.5, `rgba(120, 10, 10, ${0.05 * alpha})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H * 0.6);
      }
    }

    // --- Electric arcs ---
    arcTimer += dt;
    if (arcTimer > 400 + Math.random() * 800) {
      arcTimer = 0;
      arcs.push(makeArc());
    }

    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i];
      a.life++;
      const fade = 1 - a.life / a.maxLife;
      if (fade <= 0) { arcs.splice(i, 1); continue; }

      a.segs.forEach(s => {
        // jitter
        const jx = (Math.random() - 0.5) * 3;
        const jy = (Math.random() - 0.5) * 3;
        ctx.beginPath();
        ctx.moveTo(s.x1 + jx, s.y1 + jy);
        ctx.lineTo(s.x2 + jx, s.y2 + jy);
        ctx.strokeStyle = `rgba(255, 80, 80, ${fade * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = `rgba(255, 30, 30, ${fade * 0.5})`;
        ctx.shadowBlur = 8;
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
    }

    // --- Radiation icons ---
    icons.forEach(ic => {
      ic.phase += ic.speed;
      const a = 0.04 + 0.03 * Math.sin(ic.phase);
      ctx.font = `${ic.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(200, 40, 40, ${a})`;
      ctx.fillText(ic.char, ic.x, ic.y + Math.sin(ic.phase * 0.5) * 6);
    });

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();

// =========================================
// PROGRESS BAR LIGHTNING
// =========================================
(function() {
  const canvas = document.getElementById('progressLightning');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H;
  let bolts = [];
  let timer = 0;
  let nextBolt = 500;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width = rect.width || 400;
    H = canvas.height = rect.height || 22;
  }

  resize();
  window.addEventListener('resize', resize);

  function makeBolt() {
    const startX = Math.random() * W;
    const pts = [{ x: startX, y: 0 }];
    let x = startX;
    const steps = 4 + Math.floor(Math.random() * 5);
    const dir = (Math.random() - 0.5) * 2; // drift direction

    for (let i = 0; i < steps; i++) {
      x += dir * (5 + Math.random() * 15) + (Math.random() - 0.5) * 20;
      const y = (i + 1) / steps * H;
      pts.push({ x, y });
    }

    // Horizontal branch
    const branches = [];
    if (Math.random() < 0.6) {
      const bi = 1 + Math.floor(Math.random() * (pts.length - 2));
      const bp = [{ x: pts[bi].x, y: pts[bi].y }];
      let bx = pts[bi].x;
      const bdir = Math.random() < 0.5 ? -1 : 1;
      for (let j = 0; j < 3; j++) {
        bx += bdir * (8 + Math.random() * 15);
        const by = pts[bi].y + (Math.random() - 0.5) * 6;
        bp.push({ x: bx, y: by });
      }
      branches.push(bp);
    }

    return {
      pts,
      branches,
      life: 0,
      maxLife: 12 + Math.random() * 10,
      width: 1 + Math.random() * 1.5
    };
  }

  function drawPath(points, alpha, width) {
    if (points.length < 2) return;

    // White-hot core
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = `rgba(255, 230, 230, ${alpha})`;
    ctx.lineWidth = width;
    ctx.shadowColor = `rgba(255, 60, 60, ${alpha})`;
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Red outer glow
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = `rgba(220, 30, 30, ${alpha * 0.6})`;
    ctx.lineWidth = width + 3;
    ctx.shadowColor = `rgba(200, 0, 0, ${alpha * 0.7})`;
    ctx.shadowBlur = 15;
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  let lastTime = 0;

  function frame(time) {
    const dt = Math.min(time - lastTime, 50);
    lastTime = time;
    ctx.clearRect(0, 0, W, H);

    // Ambient pulse glow
    const pulse = 0.03 + 0.02 * Math.sin(time * 0.003);
    ctx.fillStyle = `rgba(255, 50, 50, ${pulse})`;
    ctx.fillRect(0, 0, W, H);

    // Spawn bolts
    timer += dt;
    if (timer > nextBolt) {
      timer = 0;
      nextBolt = 300 + Math.random() * 1500;
      bolts.push(makeBolt());
      if (Math.random() < 0.3) {
        setTimeout(() => bolts.push(makeBolt()), 50 + Math.random() * 100);
      }
    }

    // Draw bolts
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.life++;

      let alpha;
      if (b.life < 2) alpha = 1;
      else if (b.life < 4) alpha = 0.3;
      else if (b.life < 6) alpha = 0.7;
      else alpha = Math.max(0, 1 - (b.life - 6) / (b.maxLife - 6));

      if (alpha <= 0) { bolts.splice(i, 1); continue; }

      drawPath(b.pts, alpha, b.width);
      b.branches.forEach(br => drawPath(br, alpha * 0.4, b.width * 0.6));

      // Flash
      if (b.life < 3) {
        const cx = b.pts[0].x;
        const g = ctx.createRadialGradient(cx, H / 2, 0, cx, H / 2, 60);
        g.addColorStop(0, `rgba(255, 80, 80, ${0.15 * alpha})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(cx - 60, 0, 120, H);
      }
    }

    requestAnimationFrame(frame);
  }

  // Start after progress bar animates
  setTimeout(() => {
    resize();
    requestAnimationFrame(frame);
  }, 1800);
})();
