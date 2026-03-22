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
// PROGRESS BAR — ELECTRIFIED LIQUID
// =========================================
(function() {
  const canvas = document.getElementById('progressLightning');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, pad = 3; // padding for overflow glow
  let bolts = [];
  let sparks = [];
  let boltTimer = 0;
  let nextBolt = 300;

  function resize() {
    const bar = canvas.parentElement;
    const rect = bar.getBoundingClientRect();
    W = canvas.width = Math.max(rect.width + pad * 2, 10);
    H = canvas.height = Math.max(rect.height + pad * 2, 10);
  }

  resize();
  window.addEventListener('resize', resize);

  // Liquid surface — wavy top edge
  const wavePoints = 60;
  const waveData = [];
  for (let i = 0; i < wavePoints; i++) {
    waveData.push({
      phase: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.03,
      amp: 1.5 + Math.random() * 2.5
    });
  }

  function drawLiquid(time) {
    const bH = H - pad * 2; // bar height
    const bW = W - pad * 2;

    ctx.save();
    ctx.translate(pad, pad);

    // Build wavy top path
    ctx.beginPath();
    ctx.moveTo(0, bH); // bottom-left
    ctx.lineTo(0, 0);  // top-left (will be wavy)

    for (let i = 0; i < wavePoints; i++) {
      const x = (i / (wavePoints - 1)) * bW;
      const wd = waveData[i];
      const y = Math.sin(wd.phase + time * wd.speed) * wd.amp;
      if (i === 0) ctx.moveTo(0, bH);
      ctx.lineTo(x, y + 2);
    }
    ctx.lineTo(bW, bH);
    ctx.closePath();

    // Liquid fill — pulsing gradient
    const pulse = 0.85 + 0.15 * Math.sin(time * 0.004);
    const grad = ctx.createLinearGradient(0, 0, bW, 0);
    grad.addColorStop(0, `rgba(100, 10, 10, ${pulse})`);
    grad.addColorStop(0.3, `rgba(180, 20, 20, ${pulse})`);
    grad.addColorStop(0.6, `rgba(210, 35, 25, ${pulse})`);
    grad.addColorStop(0.85, `rgba(240, 50, 30, ${pulse})`);
    grad.addColorStop(1, `rgba(255, 80, 40, ${pulse})`);
    ctx.fillStyle = grad;
    ctx.fill();

    // Internal glow — moving hotspots
    for (let g = 0; g < 3; g++) {
      const gx = (Math.sin(time * 0.001 * (g + 1) + g * 2) * 0.5 + 0.5) * bW;
      const ga = 0.12 + 0.08 * Math.sin(time * 0.005 + g);
      const grd = ctx.createRadialGradient(gx, bH * 0.5, 0, gx, bH * 0.5, bW * 0.2);
      grd.addColorStop(0, `rgba(255, 120, 60, ${ga})`);
      grd.addColorStop(1, 'transparent');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, bW, bH);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Surface shimmer
    const shimGrad = ctx.createLinearGradient(0, 0, 0, 6);
    shimGrad.addColorStop(0, `rgba(255, 200, 150, ${0.15 + 0.1 * Math.sin(time * 0.006)})`);
    shimGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = shimGrad;
    ctx.fillRect(0, 0, bW, 6);

    ctx.restore();
  }

  // Horizontal lightning arc through the liquid
  function makeArc() {
    const bH = H - pad * 2;
    const bW = W - pad * 2;
    const y0 = pad + 3 + Math.random() * (bH - 6);
    const startX = pad + Math.random() * bW * 0.3;
    const endX = pad + bW * 0.5 + Math.random() * bW * 0.5;
    const pts = [];
    const steps = 6 + Math.floor(Math.random() * 8);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push({
        x: startX + (endX - startX) * t,
        y: y0 + (Math.random() - 0.5) * bH * 0.7
      });
    }

    return {
      pts,
      life: 0,
      maxLife: 10 + Math.random() * 12,
      width: 0.8 + Math.random() * 1.2
    };
  }

  // Sparks flying off the surface
  function makeSpark() {
    const bW = W - pad * 2;
    return {
      x: pad + Math.random() * bW,
      y: pad + 1,
      vx: (Math.random() - 0.5) * 2,
      vy: -(1 + Math.random() * 3),
      life: 0,
      maxLife: 8 + Math.random() * 15,
      size: 0.5 + Math.random() * 1.5
    };
  }

  // Edge sparks — electrical discharge at the leading edge (right side)
  function makeEdgeSpark() {
    const bW = W - pad * 2;
    const bH = H - pad * 2;
    return {
      x: pad + bW - 2 + Math.random() * 6,
      y: pad + Math.random() * bH,
      vx: 1 + Math.random() * 3,
      vy: (Math.random() - 0.5) * 4,
      life: 0,
      maxLife: 6 + Math.random() * 10,
      size: 0.5 + Math.random() * 1
    };
  }

  function drawArcPath(points, alpha, width) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(
        points[i].x + (Math.random() - 0.5) * 2,
        points[i].y + (Math.random() - 0.5) * 2
      );
    }
    // Bright core
    ctx.strokeStyle = `rgba(255, 220, 200, ${alpha})`;
    ctx.lineWidth = width;
    ctx.shadowColor = `rgba(255, 80, 40, ${alpha})`;
    ctx.shadowBlur = 6;
    ctx.stroke();

    // Outer glow
    ctx.strokeStyle = `rgba(255, 60, 30, ${alpha * 0.5})`;
    ctx.lineWidth = width + 2;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  let lastTime = 0;
  let sparkTimer = 0;
  let edgeSparkTimer = 0;

  function frame(time) {
    const dt = Math.min(time - lastTime, 50);
    lastTime = time;
    ctx.clearRect(0, 0, W, H);

    // 1. Draw liquid body
    drawLiquid(time);

    // 2. Lightning arcs inside liquid
    boltTimer += dt;
    if (boltTimer > nextBolt) {
      boltTimer = 0;
      nextBolt = 200 + Math.random() * 800;
      bolts.push(makeArc());
      if (Math.random() < 0.4) bolts.push(makeArc());
    }

    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.life++;
      let a;
      if (b.life < 2) a = 0.9;
      else if (b.life < 4) a = 0.25;
      else if (b.life < 6) a = 0.6;
      else a = Math.max(0, 1 - (b.life - 6) / (b.maxLife - 6));

      if (a <= 0) { bolts.splice(i, 1); continue; }
      drawArcPath(b.pts, a, b.width);
    }

    // 3. Surface sparks
    sparkTimer += dt;
    if (sparkTimer > 60 + Math.random() * 120) {
      sparkTimer = 0;
      sparks.push(makeSpark());
    }

    // 4. Edge sparks (leading edge discharge)
    edgeSparkTimer += dt;
    if (edgeSparkTimer > 80 + Math.random() * 200) {
      edgeSparkTimer = 0;
      sparks.push(makeEdgeSpark());
      if (Math.random() < 0.5) sparks.push(makeEdgeSpark());
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.1; // gravity
      s.life++;

      const fade = 1 - s.life / s.maxLife;
      if (fade <= 0) { sparks.splice(i, 1); continue; }

      // Spark glow
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 100, 50, ${fade * 0.2})`;
      ctx.fill();

      // Spark core
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 230, 200, ${fade * 0.9})`;
      ctx.shadowColor = `rgba(255, 80, 30, ${fade})`;
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 5. Rim glow on right edge (meniscus)
    const bW = W - pad * 2;
    const bH = H - pad * 2;
    const edgePulse = 0.3 + 0.2 * Math.sin(time * 0.008);
    const edgeGrad = ctx.createRadialGradient(pad + bW, pad + bH / 2, 0, pad + bW, pad + bH / 2, 15);
    edgeGrad.addColorStop(0, `rgba(255, 120, 60, ${edgePulse})`);
    edgeGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(pad + bW - 15, pad - 3, 20, bH + 6);

    requestAnimationFrame(frame);
  }

  setTimeout(() => {
    resize();
    requestAnimationFrame(frame);
  }, 1800);
})();
