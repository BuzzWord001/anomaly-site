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

    // --- Lightning bolts (rare, dramatic) ---
    boltTimer += dt;
    if (boltTimer > nextBolt) {
      boltTimer = 0;
      nextBolt = 3000 + Math.random() * 6000;
      bolts.push(makeBolt());
      if (Math.random() < 0.2) {
        setTimeout(() => bolts.push(makeBolt()), 100 + Math.random() * 200);
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

    // --- Electric arcs (rare) ---
    arcTimer += dt;
    if (arcTimer > 2000 + Math.random() * 4000) {
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
// PROGRESS BAR — ELECTRIFIED LIQUID v2
// =========================================
(function() {
  const canvas = document.getElementById('progressLightning');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Overflow margins so arcs can escape the bar
  const OX = 10, OY = 25;
  let W, H, barW, barH;
  let arcs = [], sparks = [], orbitArcs = [];
  let arcTimer = 0, sparkTimer = 0, orbitTimer = 0;

  // Anomalous color palette
  const anomColors = [
    { core: [200,230,255], mid: [60,140,255],  out: [20,60,220],  glow: [80,150,255]  }, // blue
    { core: [255,200,255], mid: [200,60,255],  out: [120,20,220], glow: [180,80,255]  }, // purple
    { core: [200,255,220], mid: [40,220,100],  out: [15,160,60],  glow: [60,255,120]  }, // green
    { core: [255,230,200], mid: [255,140,40],  out: [200,80,10],  glow: [255,160,60]  }, // amber
    { core: [255,200,200], mid: [255,50,80],   out: [200,15,40],  glow: [255,80,100]  }, // crimson
    { core: [200,255,255], mid: [40,220,220],  out: [10,150,180], glow: [60,240,240]  }, // cyan
  ];
  function randColor() { return anomColors[Math.floor(Math.random() * anomColors.length)]; }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    barW = rect.width || 200;
    barH = rect.height || 22;
    W = canvas.width = barW + OX * 2;
    H = canvas.height = barH + OY * 2;
  }
  resize();
  window.addEventListener('resize', resize);

  // Slow wave data for liquid surface
  const WAVES = 80;
  const wave = [];
  for (let i = 0; i < WAVES; i++) {
    wave.push({
      phase: Math.random() * Math.PI * 2,
      speed: 0.004 + Math.random() * 0.008,  // very slow
      amp: 1.5 + Math.random() * 3
    });
  }

  // ---- LIQUID ----
  function drawLiquid(t) {
    ctx.save();
    ctx.translate(OX, OY);

    // Wavy top surface
    ctx.beginPath();
    ctx.moveTo(0, barH);
    for (let i = 0; i < WAVES; i++) {
      const x = (i / (WAVES - 1)) * barW;
      const w = wave[i];
      const y = Math.sin(w.phase + t * w.speed) * w.amp + 2;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(barW, barH);
    ctx.closePath();

    // Slow color shift — hue drifts gently
    const shift = Math.sin(t * 0.0008) * 15;
    const pulse = 0.9 + 0.1 * Math.sin(t * 0.002);
    const g = ctx.createLinearGradient(0, 0, barW, barH);
    g.addColorStop(0,    `rgba(${80 + shift}, 8, 12, ${pulse})`);
    g.addColorStop(0.25, `rgba(${140 + shift}, 15, 15, ${pulse})`);
    g.addColorStop(0.5,  `rgba(${190 + shift}, 25, 18, ${pulse})`);
    g.addColorStop(0.75, `rgba(${220 + shift}, 40, 22, ${pulse})`);
    g.addColorStop(1,    `rgba(${250}, ${60 + shift}, 30, ${pulse})`);
    ctx.fillStyle = g;
    ctx.fill();

    // Slow-moving hotspots (bright patches drifting inside)
    for (let i = 0; i < 4; i++) {
      const hx = (Math.sin(t * 0.0006 * (i + 1) + i * 1.7) * 0.5 + 0.5) * barW;
      const hy = barH * (0.3 + 0.4 * Math.sin(t * 0.0008 + i * 2));
      const ha = 0.1 + 0.08 * Math.sin(t * 0.003 + i);
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, barW * 0.18);
      hg.addColorStop(0, `rgba(255, 140, 80, ${ha})`);
      hg.addColorStop(1, 'transparent');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, barW, barH);
      ctx.globalCompositeOperation = 'source-over';
    }

    // ====== ELECTRIC AURA — slow pulsing current covering all liquid ======
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Deep electric pulse — whole liquid breathes with current
    const ePulse = 0.04 + 0.03 * Math.sin(t * 0.0015);
    ctx.fillStyle = `rgba(60, 120, 255, ${ePulse})`;
    ctx.fillRect(0, 0, barW, barH);

    // 2. Crawling electric veins — multi-color, slowly drift
    const veinCount = 12;
    for (let v = 0; v < veinCount; v++) {
      const vc = anomColors[v % anomColors.length];
      const vPhase = t * 0.0004 + v * 1.3;
      const vx = ((vPhase * (0.8 + v * 0.1)) % 1) * barW;
      const vy1 = Math.sin(t * 0.001 + v * 0.7) * barH * 0.3 + barH * 0.3;
      const vy2 = vy1 + (Math.random() - 0.5) * barH * 0.6;
      const va = 0.08 + 0.06 * Math.sin(t * 0.002 + v * 2);

      ctx.beginPath();
      ctx.moveTo(vx, vy1);
      const segs = 4 + Math.floor(Math.random() * 3);
      for (let s = 1; s <= segs; s++) {
        ctx.lineTo(
          vx + (Math.random() - 0.5) * 20,
          vy1 + (vy2 - vy1) * (s / segs) + (Math.random() - 0.5) * 6
        );
      }
      ctx.strokeStyle = `rgba(${vc.mid[0]}, ${vc.mid[1]}, ${vc.mid[2]}, ${va})`;
      ctx.lineWidth = 0.5 + Math.random() * 0.5;
      ctx.shadowColor = `rgba(${vc.glow[0]}, ${vc.glow[1]}, ${vc.glow[2]}, ${va * 0.8})`;
      ctx.shadowBlur = 4;
      ctx.stroke();
    }

    // 3. Slow pulsing glow nodes — multi-color charge pooling
    for (let n = 0; n < 6; n++) {
      const nc = anomColors[n % anomColors.length];
      const nx = (Math.sin(t * 0.0003 * (n + 1) + n * 1.1) * 0.5 + 0.5) * barW;
      const ny = (Math.cos(t * 0.0004 * (n + 1) + n * 0.8) * 0.3 + 0.5) * barH;
      const nPulse = 0.06 + 0.05 * Math.sin(t * 0.0025 + n * 1.5);
      const nr = 10 + 8 * Math.sin(t * 0.002 + n);
      const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      ng.addColorStop(0, `rgba(${nc.glow[0]}, ${nc.glow[1]}, ${nc.glow[2]}, ${nPulse})`);
      ng.addColorStop(0.5, `rgba(${nc.out[0]}, ${nc.out[1]}, ${nc.out[2]}, ${nPulse * 0.4})`);
      ng.addColorStop(1, 'transparent');
      ctx.fillStyle = ng;
      ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
    }

    // 4. Surface crackle — multi-color micro-arcs on top
    const cracklePulse = Math.sin(t * 0.002);
    if (cracklePulse > 0.3) {
      const numCrackles = 3 + Math.floor(cracklePulse * 4);
      for (let c = 0; c < numCrackles; c++) {
        const cc = anomColors[Math.floor(Math.random() * anomColors.length)];
        const cx = Math.random() * barW;
        const cy = 1 + Math.random() * 4;
        const cLen = 5 + Math.random() * 15;
        const cAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        let crX = cx, crY = cy;
        for (let s = 0; s < 3; s++) {
          crX += Math.cos(cAngle) * cLen / 3 + (Math.random() - 0.5) * 5;
          crY += Math.sin(cAngle) * cLen / 3 + (Math.random() - 0.5) * 3;
          ctx.lineTo(crX, crY);
        }
        const ca = 0.15 + 0.1 * Math.random();
        ctx.strokeStyle = `rgba(${cc.core[0]}, ${cc.core[1]}, ${cc.core[2]}, ${ca})`;
        ctx.lineWidth = 0.5;
        ctx.shadowColor = `rgba(${cc.glow[0]}, ${cc.glow[1]}, ${cc.glow[2]}, ${ca})`;
        ctx.shadowBlur = 3;
        ctx.stroke();
      }
    }

    // 5. Bottom edge glow — current pooling at bottom
    const bgPulse = 0.04 + 0.03 * Math.sin(t * 0.0018 + 1);
    const bg = ctx.createLinearGradient(0, barH, 0, barH - 5);
    bg.addColorStop(0, `rgba(60, 130, 255, ${bgPulse})`);
    bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg;
    ctx.fillRect(0, barH - 5, barW, 5);

    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';

    // Surface shimmer (thin bright line on top)
    const sg = ctx.createLinearGradient(0, 0, 0, 5);
    sg.addColorStop(0, `rgba(180, 210, 255, ${0.1 + 0.08 * Math.sin(t * 0.002)})`);
    sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, barW, 5);

    ctx.restore();
  }

  // ---- POWERFUL INTERNAL ARCS ----
  function makeArc() {
    const x0 = Math.random() * barW * 0.4;
    const x1 = barW * 0.4 + Math.random() * barW * 0.6;
    const yBase = 3 + Math.random() * (barH - 6);
    const pts = [];
    const steps = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      pts.push({
        x: OX + x0 + (x1 - x0) * frac,
        // Arcs can break out of bar vertically!
        y: OY + yBase + (Math.random() - 0.5) * (barH * 1.4)
      });
    }
    return { pts, life: 0, maxLife: 15 + Math.random() * 15, width: 1.5 + Math.random() * 2, color: randColor() };
  }

  // ---- ORBIT ARCS — circulate AROUND the bar ----
  function makeOrbitArc() {
    // Pick a random X position along the bar
    const cx = OX + Math.random() * barW;
    const cy = OY + barH / 2;
    const pts = [];
    const steps = 10 + Math.floor(Math.random() * 8);
    const radiusY = barH * 0.5 + 8 + Math.random() * 15; // extends beyond bar
    const radiusX = 30 + Math.random() * 60;
    const startAngle = Math.random() * Math.PI * 2;
    const sweep = (0.5 + Math.random() * 1.2) * Math.PI; // partial orbit

    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const angle = startAngle + sweep * frac;
      pts.push({
        x: cx + Math.cos(angle) * radiusX + (Math.random() - 0.5) * 8,
        y: cy + Math.sin(angle) * radiusY + (Math.random() - 0.5) * 5
      });
    }
    return { pts, life: 0, maxLife: 18 + Math.random() * 14, width: 1 + Math.random() * 1.5, color: randColor() };
  }

  // ---- SPARKS ----
  function makeSpark(fromEdge) {
    const x = fromEdge ? OX + barW : OX + Math.random() * barW;
    const side = fromEdge ? 1 : (Math.random() < 0.5 ? -1 : 1);
    const c = randColor();
    return {
      x,
      y: OY + (fromEdge ? Math.random() * barH : (side < 0 ? 0 : barH)),
      vx: fromEdge ? (2 + Math.random() * 4) : (Math.random() - 0.5) * 3,
      vy: fromEdge ? (Math.random() - 0.5) * 5 : side * -(2 + Math.random() * 4),
      life: 0,
      maxLife: 10 + Math.random() * 18,
      size: 0.8 + Math.random() * 2,
      color: c
    };
  }

  // ---- DRAW ARC (multi-color anomalous) ----
  function drawArc(points, alpha, width, color) {
    if (points.length < 2) return;
    const c = color || anomColors[0];

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(
        points[i].x + (Math.random() - 0.5) * 2,
        points[i].y + (Math.random() - 0.5) * 2
      );
    }

    // Outer glow
    ctx.strokeStyle = `rgba(${c.out[0]}, ${c.out[1]}, ${c.out[2]}, ${alpha * 0.3})`;
    ctx.lineWidth = width + 6;
    ctx.shadowColor = `rgba(${c.glow[0]}, ${c.glow[1]}, ${c.glow[2]}, ${alpha * 0.6})`;
    ctx.shadowBlur = 25;
    ctx.stroke();

    // Mid glow
    ctx.strokeStyle = `rgba(${c.mid[0]}, ${c.mid[1]}, ${c.mid[2]}, ${alpha * 0.5})`;
    ctx.lineWidth = width + 3;
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Hot core
    ctx.strokeStyle = `rgba(${c.core[0]}, ${c.core[1]}, ${c.core[2]}, ${alpha})`;
    ctx.lineWidth = width;
    ctx.shadowColor = `rgba(${c.glow[0]}, ${c.glow[1]}, ${c.glow[2]}, ${alpha})`;
    ctx.shadowBlur = 8;
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  // ---- MAIN LOOP ----
  let lastTime = 0;

  function frame(time) {
    const dt = Math.min(time - lastTime, 50);
    lastTime = time;
    ctx.clearRect(0, 0, W, H);

    // 1. Liquid body
    drawLiquid(time);

    // 2. Internal arcs (rare, powerful)
    arcTimer += dt;
    if (arcTimer > 1500 + Math.random() * 3500) {
      arcTimer = 0;
      arcs.push(makeArc());
    }

    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i];
      a.life++;
      let al;
      if (a.life < 2) al = 1;
      else if (a.life < 4) al = 0.2;
      else if (a.life < 7) al = 0.8;
      else al = Math.max(0, 1 - (a.life - 7) / (a.maxLife - 7));
      if (al <= 0) { arcs.splice(i, 1); continue; }
      drawArc(a.pts, al, a.width, a.color);
    }

    // 3. Orbit arcs — rare, circulate around the bar
    orbitTimer += dt;
    if (orbitTimer > 3000 + Math.random() * 6000) {
      orbitTimer = 0;
      orbitArcs.push(makeOrbitArc());
    }

    for (let i = orbitArcs.length - 1; i >= 0; i--) {
      const o = orbitArcs[i];
      o.life++;
      let al;
      if (o.life < 3) al = 0.9;
      else if (o.life < 5) al = 0.15;
      else if (o.life < 8) al = 0.7;
      else al = Math.max(0, 1 - (o.life - 8) / (o.maxLife - 8));
      if (al <= 0) { orbitArcs.splice(i, 1); continue; }
      drawArc(o.pts, al * 0.7, o.width, o.color);
    }

    // 4. Sparks — blue, from surface and edge (less frequent)
    sparkTimer += dt;
    if (sparkTimer > 100 + Math.random() * 200) {
      sparkTimer = 0;
      sparks.push(makeSpark(false));
      if (Math.random() < 0.2) sparks.push(makeSpark(true));
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.15;
      s.life++;
      const fade = 1 - s.life / s.maxLife;
      if (fade <= 0) { sparks.splice(i, 1); continue; }

      const sc = s.color || anomColors[0];
      // Color glow
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${sc.mid[0]}, ${sc.mid[1]}, ${sc.mid[2]}, ${fade * 0.12})`;
      ctx.fill();
      // Bright core
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${sc.core[0]}, ${sc.core[1]}, ${sc.core[2]}, ${fade * 0.9})`;
      ctx.shadowColor = `rgba(${sc.glow[0]}, ${sc.glow[1]}, ${sc.glow[2]}, ${fade})`;
      ctx.shadowBlur = 5;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 5. Edge meniscus glow — color cycles slowly
    const ec = anomColors[Math.floor((time * 0.0002) % anomColors.length)];
    const ep = 0.2 + 0.12 * Math.sin(time * 0.005);
    const eg = ctx.createRadialGradient(OX + barW, OY + barH / 2, 0, OX + barW, OY + barH / 2, 25);
    eg.addColorStop(0, `rgba(${ec.glow[0]}, ${ec.glow[1]}, ${ec.glow[2]}, ${ep})`);
    eg.addColorStop(0.5, `rgba(${ec.out[0]}, ${ec.out[1]}, ${ec.out[2]}, ${ep * 0.3})`);
    eg.addColorStop(1, 'transparent');
    ctx.fillStyle = eg;
    ctx.fillRect(OX + barW - 25, OY - 10, 50, barH + 20);

    requestAnimationFrame(frame);
  }

  setTimeout(() => { resize(); requestAnimationFrame(frame); }, 1800);
})();
