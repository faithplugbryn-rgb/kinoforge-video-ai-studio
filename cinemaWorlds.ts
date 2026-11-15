import { CinemaWorld } from './studio';

/** Deterministic PRNG (Mulberry32) so frames never flicker across renders */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [249, 115, 22];
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Renders 12 handcrafted procedural cinema worlds at 60fps.
 * Every world is deterministic in (seed, localTime) and adapts smoothly to 16:9, 9:16, and 1:1.
 */
export function drawCinemaWorld(
  ctx: CanvasRenderingContext2D,
  world: CinemaWorld,
  w: number,
  h: number,
  t: number,
  seed: number,
  accentHex: string
) {
  switch (world) {
    case 'neon-cyber':
      drawNeonCyber(ctx, w, h, t, seed, accentHex);
      break;
    case 'deep-cosmos':
      drawDeepCosmos(ctx, w, h, t, seed, accentHex);
      break;
    case 'golden-horizon':
      drawGoldenHorizon(ctx, w, h, t, seed, accentHex);
      break;
    case 'ocean-moonlight':
      drawOceanMoonlight(ctx, w, h, t, seed, accentHex);
      break;
    case 'mystic-forest':
      drawMysticForest(ctx, w, h, t, seed, accentHex);
      break;
    case 'desert-eclipse':
      drawDesertEclipse(ctx, w, h, t, seed, accentHex);
      break;
    case 'synthwave-grid':
      drawSynthwaveGrid(ctx, w, h, t, seed, accentHex);
      break;
    case 'aurora-arctic':
      drawAuroraArctic(ctx, w, h, t, seed, accentHex);
      break;
    case 'data-matrix':
      drawDataMatrix(ctx, w, h, t, seed, accentHex);
      break;
    case 'storm-horizon':
      drawStormHorizon(ctx, w, h, t, seed, accentHex);
      break;
    case 'studio-editorial':
      drawStudioEditorial(ctx, w, h, t, seed, accentHex);
      break;
    case 'crimson-volcano':
      drawCrimsonVolcano(ctx, w, h, t, seed, accentHex);
      break;
  }
}

/* 1. NEON METROPOLIS */
function drawNeonCyber(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seed: number,
  accent: string
) {
  const rand = mulberry32(seed + 101);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#050816');
  sky.addColorStop(0.45, '#0c1530');
  sky.addColorStop(0.75, '#1b1136');
  sky.addColorStop(1, '#090912');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Volumetric neon haze behind skyline
  const horizonY = h * 0.72;
  const glow1 = ctx.createRadialGradient(w * 0.28, horizonY, 10, w * 0.28, horizonY, w * 0.55);
  glow1.addColorStop(0, 'rgba(34, 211, 238, 0.34)');
  glow1.addColorStop(0.5, 'rgba(34, 211, 238, 0.08)');
  glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, w, h);

  const glow2 = ctx.createRadialGradient(w * 0.76, horizonY * 0.94, 10, w * 0.76, horizonY, w * 0.5);
  glow2.addColorStop(0, rgba(accent, 0.36));
  glow2.addColorStop(0.55, rgba(accent, 0.07));
  glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, w, h);

  // Diagonal searchlights sweeping sky
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const baseX = w * (0.2 + i * 0.3);
    const angle = Math.sin(t * 0.45 + i * 2.1) * 0.32 - 0.15;
    ctx.save();
    ctx.translate(baseX, horizonY);
    ctx.rotate(angle);
    const beam = ctx.createLinearGradient(0, 0, 0, -h * 0.85);
    beam.addColorStop(0, i === 1 ? rgba(accent, 0.22) : 'rgba(34, 211, 238, 0.18)');
    beam.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(-w * 0.015, 0);
    ctx.lineTo(-w * 0.11, -h * 0.85);
    ctx.lineTo(w * 0.11, -h * 0.85);
    ctx.lineTo(w * 0.015, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Multi-layer buildings
  const layers = [
    { count: 16, minH: 0.22, maxH: 0.48, color: '#0b1024', speed: 4, alpha: 0.65 },
    { count: 13, minH: 0.18, maxH: 0.44, color: '#070a18', speed: 10, alpha: 0.92 },
  ];

  layers.forEach((layer, li) => {
    const step = (w * 1.25) / layer.count;
    for (let i = 0; i < layer.count; i++) {
      const bw = step * (0.62 + rand() * 0.55);
      const bh = h * (layer.minH + rand() * (layer.maxH - layer.minH));
      const bx = ((i * step - (t * layer.speed) % (w * 1.25) + w * 1.25) % (w * 1.25)) - w * 0.12;
      const by = horizonY - bh;

      ctx.fillStyle = layer.color;
      ctx.fillRect(bx, by, bw, bh + 4);

      // Spire / antenna
      if (rand() > 0.55) {
        ctx.fillRect(bx + bw * 0.48, by - h * 0.06, Math.max(2, bw * 0.04), h * 0.06);
        const blink = 0.5 + 0.5 * Math.sin(t * 3.5 + i);
        ctx.fillStyle = rgba(accent, 0.4 + 0.6 * blink);
        ctx.beginPath();
        ctx.arc(bx + bw * 0.5, by - h * 0.06, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Neon edge trim
      const isCyan = (i + li) % 2 === 0;
      const neonCol = isCyan ? '#22d3ee' : accent;
      ctx.fillStyle = rgba(neonCol, li === 1 ? 0.55 : 0.25);
      ctx.fillRect(bx, by, bw, 2);

      // Window grid
      if (li === 1) {
        const cols = Math.max(2, Math.floor(bw / 14));
        const rows = Math.max(3, Math.floor(bh / 18));
        const padX = bw / (cols + 1);
        const padY = bh / (rows + 1);
        for (let r = 1; r <= rows; r++) {
          for (let c = 1; c <= cols; c++) {
            const litSeed = Math.sin(i * 31.7 + r * 17.3 + c * 11.1);
            if (litSeed > 0.25) {
              const flicker = litSeed > 0.88 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 7 + r)) : 0.72;
              ctx.fillStyle = litSeed > 0.72
                ? rgba(neonCol, flicker * 0.85)
                : `rgba(226, 232, 240, ${flicker * 0.42})`;
              ctx.fillRect(bx + c * padX - 2, by + r * padY - 2, Math.max(3, padX * 0.45), 3.5);
            }
          }
        }
      }
    }
  });

  // Wet street / harbor reflection below horizon
  const street = ctx.createLinearGradient(0, horizonY, 0, h);
  street.addColorStop(0, '#090d1f');
  street.addColorStop(1, '#03040a');
  ctx.fillStyle = street;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Shimmering neon reflection bands
  for (let i = 0; i < 28; i++) {
    const ry = horizonY + ((i / 28) ** 1.35) * (h - horizonY);
    const rw = w * (0.06 + rand() * 0.22);
    const rx = rand() * w - rw * 0.5 + Math.sin(t * 1.4 + i) * 14;
    const col = i % 3 === 0 ? accent : '#22d3ee';
    ctx.fillStyle = rgba(col, 0.16 * (1 - i / 32));
    ctx.fillRect(rx, ry, rw, 2 + (i / 28) * 3);
  }

  // Moving flying light streaks (traffic trails)
  for (let i = 0; i < 6; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    const speed = 160 + i * 45;
    const sx = ((t * speed * dir + i * 240) % (w + 260) + (w + 260)) % (w + 260) - 130;
    const sy = horizonY + 12 + (i % 4) * ((h - horizonY) * 0.18);
    const grad = ctx.createLinearGradient(sx - 90 * dir, sy, sx, sy);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, dir > 0 ? rgba(accent, 0.75) : 'rgba(56, 189, 248, 0.75)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(sx - 90 * dir, sy);
    ctx.lineTo(sx, sy);
    ctx.stroke();
  }
}

/* 2. DEEP SPACE NEBULA */
function drawDeepCosmos(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seed: number,
  accent: string
) {
  const rand = mulberry32(seed + 202);
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
  bg.addColorStop(0, '#10142b');
  bg.addColorStop(0.55, '#070814');
  bg.addColorStop(1, '#020207');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Flowing multi-lobe nebula clouds
  const clouds = [
    { x: 0.3, y: 0.38, r: 0.48, col: '#22d3ee', a: 0.18 },
    { x: 0.68, y: 0.52, r: 0.52, col: accent, a: 0.22 },
    { x: 0.48, y: 0.65, r: 0.44, col: '#6366f1', a: 0.2 },
    { x: 0.22, y: 0.72, r: 0.36, col: '#ec4899', a: 0.11 },
  ];
  clouds.forEach((c, idx) => {
    const cx = w * c.x + Math.sin(t * 0.22 + idx * 1.7) * w * 0.04;
    const cy = h * c.y + Math.cos(t * 0.18 + idx * 2.3) * h * 0.03;
    const rad = Math.max(w, h) * c.r;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, rgba(c.col, c.a));
    g.addColorStop(0.5, rgba(c.col, c.a * 0.35));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  // Crisp parallax starfield
  for (let i = 0; i < 160; i++) {
    const sx = ((rand() * w + t * (2 + (i % 5) * 1.4)) % w + w) % w;
    const sy = rand() * h;
    const sr = 0.6 + rand() * 1.8;
    const twinkle = 0.45 + 0.55 * Math.sin(t * (1.8 + rand() * 3.5) + i * 7);
    ctx.fillStyle = i % 9 === 0 ? rgba('#7dd3fc', twinkle) : `rgba(248, 250, 252, ${twinkle * 0.85})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ringed hero planet with atmospheric limb glow
  const px = w * 0.66 + Math.sin(t * 0.14) * 14;
  const py = h * 0.42 + Math.cos(t * 0.12) * 10;
  const pr = Math.min(w, h) * 0.21;

  // Back ring half
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-0.32);
  ctx.strokeStyle = rgba(accent, 0.34);
  ctx.lineWidth = pr * 0.14;
  ctx.beginPath();
  ctx.ellipse(0, 0, pr * 1.95, pr * 0.42, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Planet atmosphere halo
  const halo = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.7, px, py, pr * 1.45);
  halo.addColorStop(0, rgba('#38bdf8', 0.34));
  halo.addColorStop(0.6, rgba(accent, 0.12));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(px, py, pr * 1.45, 0, Math.PI * 2);
  ctx.fill();

  // Planet body
  const pGrad = ctx.createRadialGradient(px - pr * 0.38, py - pr * 0.35, pr * 0.1, px, py, pr);
  pGrad.addColorStop(0, '#38bdf8');
  pGrad.addColorStop(0.35, '#1e3a5f');
  pGrad.addColorStop(0.75, '#0b1124');
  pGrad.addColorStop(1, '#03040a');
  ctx.fillStyle = pGrad;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();

  // Front ring half
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-0.32);
  const ringGrad = ctx.createLinearGradient(-pr * 2, 0, pr * 2, 0);
  ringGrad.addColorStop(0, rgba('#38bdf8', 0.1));
  ringGrad.addColorStop(0.35, rgba(accent, 0.55));
  ringGrad.addColorStop(0.7, rgba('#e2e8f0', 0.42));
  ringGrad.addColorStop(1, rgba('#38bdf8', 0.08));
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = pr * 0.15;
  ctx.beginPath();
  ctx.ellipse(0, 0, pr * 1.95, pr * 0.42, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();

  // Periodic shooting star
  const meteorPhase = (t * 0.35) % 1;
  if (meteorPhase < 0.28) {
    const mp = meteorPhase / 0.28;
    const mx = w * (0.1 + mp * 0.42);
    const my = h * (0.12 + mp * 0.2);
    const mg = ctx.createLinearGradient(mx - 95, my - 45, mx, my);
    mg.addColorStop(0, 'rgba(255,255,255,0)');
    mg.addColorStop(1, `rgba(255,255,255,${Math.sin(mp * Math.PI) * 0.9})`);
    ctx.strokeStyle = mg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx - 95, my - 45);
    ctx.lineTo(mx, my);
    ctx.stroke();
  }
}

/* 3. GOLDEN MOUNTAIN HORIZON */
function drawGoldenHorizon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seed: number,
  accent: string
) {
  const rand = mulberry32(seed + 303);
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.78);
  sky.addColorStop(0, '#0f172a');
  sky.addColorStop(0.32, '#3b1f3a');
  sky.addColorStop(0.64, '#b45309');
  sky.addColorStop(0.86, '#f59e0b');
  sky.addColorStop(1, '#fef3c7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Rising sun disk & soft god-rays
  const sunX = w * 0.52 + Math.sin(t * 0.12) * w * 0.03;
  const sunY = h * 0.56 - Math.sin(t * 0.15) * h * 0.025;
  const sunR = Math.min(w, h) * 0.11;

  const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.3, sunX, sunY, sunR * 4.5);
  halo.addColorStop(0, 'rgba(255, 251, 235, 0.92)');
  halo.addColorStop(0.22, rgba(accent, 0.45));
  halo.addColorStop(0.6, 'rgba(245, 158, 11, 0.12)');
  halo.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Drifting warm clouds
  for (let i = 0; i < 6; i++) {
    const cx = ((rand() * w * 1.4 + t * (8 + i * 3)) % (w * 1.4)) - w * 0.2;
    const cy = h * (0.14 + i * 0.065);
    const cw = w * (0.18 + rand() * 0.2);
    const ch = h * (0.025 + rand() * 0.02);
    const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, cw * 0.6);
    cg.addColorStop(0, 'rgba(254, 215, 170, 0.28)');
    cg.addColorStop(1, 'rgba(254, 215, 170, 0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Multi-tier alpine ridges with atmospheric perspective mist
  const ridges = [
    { baseY: 0.6, amp: 0.15, freq: 3.1, color: '#451a2b', speed: 0.015 },
    { baseY: 0.69, amp: 0.14, freq: 4.3, color: '#271222', speed: 0.032 },
    { baseY: 0.78, amp: 0.12, freq: 5.5, color: '#140c16', speed: 0.055 },
    { baseY: 0.87, amp: 0.09, freq: 6.7, color: '#09070d', speed: 0.085 },
  ];

  ridges.forEach((ridge, idx) => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    const steps = 42;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const x = u * w;
      const phase = u * ridge.freq + seed * 0.1 + idx * 1.9 + t * ridge.speed;
      const n =
        Math.sin(phase) * 0.55 +
        Math.sin(phase * 2.3 + 1.4) * 0.3 +
        Math.sin(phase * 4.7 + 0.5) * 0.15;
      const y = h * ridge.baseY - Math.abs(n) * h * ridge.amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = ridge.color;
    ctx.fill();

    // Valley mist band between ridges
    if (idx < 2) {
      const mist = ctx.createLinearGradient(0, h * (ridge.baseY - 0.04), 0, h * (ridge.baseY + 0.12));
      mist.addColorStop(0, 'rgba(251, 146, 60, 0)');
      mist.addColorStop(0.5, 'rgba(253, 186, 116, 0.18)');
      mist.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, h * (ridge.baseY - 0.04), w, h * 0.16);
    }
  });
}

/* 4. MOONLIT OCEAN */
function drawOceanMoonlight(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seed: number,
  accent: string
) {
  const rand = mulberry32(seed + 404);
  const horizonY = h * 0.54;

  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, '#020617');
  sky.addColorStop(0.55, '#0c1b33');
  sky.addColorStop(1, '#163455');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizonY + 2);

  // Subtle stars
  for (let i = 0; i < 65; i++) {
    const sx = rand() * w;
    const sy = rand() * horizonY * 0.85;
    const a = 0.25 + 0.65 * Math.abs(Math.sin(t * 1.4 + i * 3.1));
    ctx.fillStyle = `rgba(226, 232, 240, ${a})`;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }

  // Luminous full moon
  const moonX = w * 0.52 + Math.sin(t * 0.08) * w * 0.02;
  const moonY = horizonY * 0.44;
  const moonR = Math.min(w, h) * 0.085;

  const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 4.2);
  halo.addColorStop(0, 'rgba(224, 242, 254, 0.55)');
  halo.addColorStop(0.3, 'rgba(56, 189, 248, 0.18)');
  halo.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#f0f9ff';
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  // Ocean surface
  const sea = ctx.createLinearGradient(0, horizonY, 0, h);
  sea.addColorStop(0, '#0f2847');
  sea.addColorStop(0.45, '#07172b');
  sea.addColorStop(1, '#020611');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Specular moonlight reflection path on animated ripples
  const rows = 44;
  for (let i = 0; i < rows; i++) {
    const p = i / rows;
    const y = horizonY + Math.pow(p, 1.55) * (h - horizonY);
    const waveOffset = Math.sin(t * 2.1 + i * 0.65) * (12 + p * 34);
    const span = moonR * (0.9 + p * 3.8);
    const thickness = 1.2 + p * 4.5;
    const alpha = (0.55 - p * 0.34) * (0.65 + 0.35 * Math.sin(t * 3.1 + i * 1.7));

    ctx.fillStyle = `rgba(224, 242, 254, ${Math.max(0.05, alpha)})`;
    ctx.fillRect(moonX - span * 0.5 + waveOffset, y, span, thickness);

    // Subtle secondary accent shimmer
    if (i % 4 === 0) {
      ctx.fillStyle = rgba(accent, 0.14 * (1 - p));
      ctx.fillRect(moonX - span * 0.75 - waveOffset * 0.6, y + 2, span * 1.5, thickness * 0.7);
    }
  }

  // Gentle dark rolling wave silhouettes near foreground
  for (let l = 0; l < 3; l++) {
    ctx.beginPath();
    const base = horizonY + (h - horizonY) * (0.68 + l * 0.12);
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 28) {
      const y = base + Math.sin(x * 0.008 + t * (1.2 + l * 0.45) + l * 2) * (6 + l * 4);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = `rgba(2, 6, 17, ${0.35 + l * 0.2})`;
    ctx.fill();
  }
}

/* 5. BIOLUMINESCENT MYSTIC FOREST */
function drawMysticForest(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seed: number,
  accent: string
) {
  const rand = mulberry32(seed + 505);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#041214');
  bg.addColorStop(0.45, '#092629');
  bg.addColorStop(0.82, '#061c1d');
  bg.addColorStop(1, '#02090a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Diagonal volumetric light rays through canopy
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const rx = w * (0.12 + i * 0.2) + Math.sin(t * 0.3 + i) * 28;
    const beam = ctx.createLinearGradient(rx, 0, rx + w * 0.16, h * 0.9);
    beam.addColorStop(0, 'rgba(110, 231, 183, 0.15)');
    beam.addColorStop(0.65, rgba(accent, 0.06));
    beam.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx + w * 0.09, 0);
    ctx.lineTo(rx + w * 0.26, h);
    ctx.lineTo(rx + w * 0.08, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Layered redwood/pine tree trunks & canopy silhouettes
  const layers = [
    { count: 14, color: '#071c1f', width: 0.022, speed: 3 },
    { count: 10, color: '#041315', width: 0.036, speed: 7 },
    { count: 7, color: '#020a0b', width: 0.055, speed: 12 },
  ];
  layers.forEach((layer, li) => {
    for (let i = 0; i < layer.count; i++) {
      const tx =
        (((i / layer.count) * w * 1.25 + rand() * 50 - t * layer.speed) % (w * 1.25) + w * 1.25) %
          (w * 1.25) -
        w * 0.1;
      const tw = w * layer.width * (0.7 + rand() * 0.6);
      ctx.fillStyle = layer.color;
      ctx.fillRect(tx - tw * 0.5, 0, tw, h);

      // Stylized pine tiers
      for (let b = 0; b < 5; b++) {
        const by = h * (0.1 + b * 0.14);
        const bw = tw * (2.6 + b * 0.9);
        ctx.beginPath();
        ctx.moveTo(tx, by - h * 0.09);
        ctx.lineTo(tx - bw, by + h * 0.06);
        ctx.lineTo(tx + bw, by + h * 0.06);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Forest floor mist after each layer
    const fog = ctx.createLinearGradient(0, h * 0.64, 0, h);
    fog.addColorStop(0, 'rgba(52, 211, 153, 0)');
    fog.addColorStop(0.55, `rgba(52, 211, 153, ${0.07 + li * 0.025})`);
    fog.addColorStop(1, 'rgba(2, 9, 10, 0.7)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, h * 0.64, w, h * 0.36);
  });

  // Glowing bioluminescent spores
  for (let i = 0; i < 24; i++) {
    const sx = ((rand() * w + Math.sin(t * 0.6 + i * 2) * 40) % w + w) % w;
    const sy = ((rand() * h * 0.85 - t * (8 + (i % 4) * 5)) % h + h) % h;
    const pulse = 0.4 + 0.6 * Math.sin(t * 2.5 + i * 3);
    const col = i % 3 === 0 ? accent : '#34d399';
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14);
    g.addColorStop(0, rgba(col, 0.85 * pulse));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* 6. DESERT ECLIPSE */
function drawDesertEclipse(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seed: number,
  accent: string
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  sky.addColorStop(0, '#180907');
  sky.addColorStop(0.38, '#5c1d13');
  sky.addColorStop(0.72, '#c2410c');
  sky.addColorStop(1, '#fdba74');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Dramatic solar eclipse corona
  const sx = w * 0.5;
  const sy = h * 0.34;
  const sr = Math.min(w, h) * 0.12;
  const pulse = 1 + 0.04 * Math.sin(t * 1.8);

  const corona = ctx.createRadialGradient(sx, sy, sr * 0.9, sx, sy, sr * 3.4 * pulse);
  corona.addColorStop(0, 'rgba(255, 247, 237, 0.95)');
  corona.addColorStop(0.18, rgba(accent, 0.65));
  corona.addColorStop(0.5, 'rgba(234, 88, 12, 0.16)');
  corona.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = corona;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#120706';
  ctx.beginPath();
  ctx.arc(sx, sy, sr * 0.94, 0, Math.PI * 2);
  ctx.fill();

  // Sweeping sculpted dunes
  const dunes = [
    { y: 0.62, amp: 0.06, c1: '#9a3412', c2: '#5c1d0c', speed: 0.03 },
    { y: 0.73, amp: 0.07, c1: '#7c2d12', c2: '#3b1208', speed: 0.055 },
    { y: 0.85, amp: 0.06, c1: '#431407', c2: '#140604', speed: 0.09 },
  ];
  dunes.forEach((d, idx) => {
    const g = ctx.createLinearGradient(0, h * (d.y - 0.08), 0, h);
    g.addColorStop(0, d.c1);
    g.addColorStop(1, d.c2);
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 36) {
      const u = x / w;
      const y =
        h * d.y +
        Math.sin(u * 4.5 + idx * 2.1 + seed * 0.2 + t * d.speed) * h * d.amp +
        Math.cos(u * 2.1 - idx) * h * (d.amp * 0.5);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
  });
}

/* 7. SYNTHWAVE RETRO HORIZON */
function drawSynthwaveGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seed: number,
  accent: string
) {
  const rand = mulberry32(seed + 707);
  const horizonY = h * 0.56;

  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, '#070316');
  sky.addColorStop(0.55, '#1e0a3c');
  sky.addColorStop(1, '#581c5f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizonY + 2);

  // Stars
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * rand()})`;
    ctx.fillRect(rand() * w, rand() * horizonY * 0.72, 1.5, 1.5);
  }

  // Segmented Outrun Sun
  const sunX = w * 0.5;
  const sunY = horizonY - Math.min(w, h) * 0.07;
  const sunR = Math.min(w, h) * 0.17;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
  sunGrad.addColorStop(0, '#fef08a');
  sunGrad.addColorStop(0.45, accent);
  sunGrad.addColorStop(1, '#ec4899');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

  // Horizontal scan-line cuts across lower sun
  ctx.fillStyle = '#1e0a3c';
  for (let i = 0; i < 6; i++) {
    const cutY = sunY + sunR * (0.08 + i * 0.155);
    const cutH = 2.5 + i * 2.4;
    ctx.fillRect(sunX - sunR, cutY, sunR * 2, cutH);
  }
  ctx.restore();

  // Mountain silhouettes on horizon
  ctx.fillStyle = '#0c051e';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let x = 0; x <= w; x += w / 24) {
    const u = x / w;
    const distCenter = Math.abs(u - 0.5);
    const peak = (0.04 + distCenter * 0.24) * Math.abs(Math.sin(u * 13 + seed));
    ctx.lineTo(x, horizonY - h * peak);
  }
  ctx.lineTo(w, horizonY);
  ctx.closePath();
  ctx.fill();

  // Floor backdrop
  const floor = ctx.createLinearGradient(0, horizonY, 0, h);
  floor.addColorStop(0, '#17072b');
  floor.addColorStop(1, '#06020f');
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Infinite gliding perspective grid
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
  ctx.lineWidth = 1.5;

  // Vertical converging lines
  const vLines = 18;
  for (let i = -vLines; i <= vLines; i++) {
    const topX = w * 0.5 + i * (w * 0.045);
    const botX = w * 0.5 + i * (w * 0.24);
    ctx.beginPath();
    ctx.moveTo(topX, horizonY);
    ctx.lineTo(botX, h);
    ctx.stroke();
  }

  // Horizontal scrolling perspective bars
  const hLines = 14;
  for (let i = 0; i < hLines; i++) {
    const raw = ((i + (t * 1.45) % 1) / hLines);
    const y = horizonY + Math.pow(raw, 2.2) * (h - horizonY);
    ctx.strokeStyle = rgba(accent, 0.25 + raw * 0.65);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Glowing horizon laser line
  ctx.fillStyle = rgba('#22d3ee', 0.85);
  ctx.fillRect(0, horizonY - 1, w, 2.5);
}

/* 8. ARCTIC AURORA */
function drawAuroraArctic(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seed: number,
  accent: string
) {
  const rand = mulberry32(seed + 808);
  const horizonY = h * 0.72;

  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, '#020612');
  sky.addColorStop(0.55, '#071a26');
  sky.addColorStop(1, '#0b2938');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Crisp stars
  for (let i = 0; i < 80; i++) {
    const a = 0.25 + 0.65 * Math.abs(Math.sin(t * 1.8 + i));
    ctx.fillStyle = `rgba(241, 245, 249, ${a})`;
    ctx.fillRect(rand() * w, rand() * horizonY * 0.85, 1.4, 1.4);
  }

  // Flowing multi-ribbon northern lights curtains
  const ribbons = [
    { baseY: 0.28, c1: '#10b981', c2: '#06b6d4', amp: 0.08, speed: 0.65 },
    { baseY: 0.36, c1: '#22d3ee', c2: '#8b5cf6', amp: 0.07, speed: 0.48 },
    { baseY: 0.22, c1: accent, c2: '#34d399', amp: 0.05, speed: 0.52 },
  ];
  ribbons.forEach((r, ri) => {
    const cols = 48;
    const step = w / cols;
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const x = u * w;
      const waveY =
        h * r.baseY +
        Math.sin(u * 5.2 + t * r.speed + ri * 2.1) * h * r.amp +
        Math.cos(u * 9.1 - t * r.speed * 0.7) * h * 0.025;
      const curtainH = h * (0.22 + 0.1 * Math.sin(u * 4 + t * 0.8 + ri));
      const g = ctx.createLinearGradient(x, waveY - curtainH * 0.6, x, waveY + curtainH * 0.45);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.45, rgba(r.c2, 0.12));
      g.addColorStop(0.75, rgba(r.c1, 0.24));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - step * 0.6, waveY - curtainH * 0.6, step * 1.4, curtainH * 1.05);
    }
  });

  // Fjord mountain peaks
  ctx.fillStyle = '#040a14';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let x = 0; x <= w; x += w / 26) {
    const u = x / w;
    const peak = Math.abs(Math.sin(u * 8.5 + seed)) * h * 0.14 + Math.abs(Math.cos(u * 3.1)) * h * 0.06;
    ctx.lineTo(x, horizonY - peak);
  }
  ctx.lineTo(w, horizonY);
  ctx.closePath();
  ctx.fill();

  // Mirror lake reflection
  const lake = ctx.createLinearGradient(0, horizonY, 0, h);
  lake.addColorStop(0, '#07222d');
  lake.addColorStop(1, '#020710');
  ctx.fillStyle = lake;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Subtle reflected emerald shimmer
  for (let i = 0; i < 18; i++) {
    const ry = horizonY + ((i + 0.5) / 18) * (h - horizonY);
    const rw = w * (0.2 + 0.35 * Math.abs(Math.sin(i * 1.7 + t * 0.5)));
    const rx = w * 0.5 - rw * 0.5 + Math.sin(t + i) * 35;
    ctx.fillStyle = rgba('#2dd4bf', 0.12 * (1 - i / 20));
    ctx.fillRect(rx, ry, rw, 2.5);
  }
}

/* 9. NEURAL DATA MATRIX */
function drawDataMatrix(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seed: number,
  accent: string
) {
  const rand = mulberry32(seed + 909);
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
  bg.addColorStop(0, '#0c192c');
  bg.addColorStop(0.6, '#070c18');
  bg.addColorStop(1, '#03050a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural tech grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.065)';
  ctx.lineWidth = 1;
  const cell = Math.max(40, Math.min(w, h) * 0.075);
  const ox = (t * 14) % cell;
  const oy = (t * 8) % cell;
  for (let x = -cell + ox; x < w + cell; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = -cell + oy; y < h + cell; y += cell) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Animated neural constellation nodes
  const nodeCount = 26;
  const nodes: { x: number; y: number }[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const bx = rand() * w;
    const by = rand() * h;
    const x = bx + Math.sin(t * (0.4 + rand() * 0.5) + i * 2.1) * 38;
    const y = by + Math.cos(t * (0.35 + rand() * 0.5) + i * 1.7) * 32;
    nodes.push({ x, y });
  }

  const maxDist = Math.min(w, h) * 0.34;
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.hypot(dx, dy);
      if (dist < maxDist) {
        const a = (1 - dist / maxDist) * 0.38;
        ctx.strokeStyle = (i + j) % 5 === 0 ? rgba(accent, a) : `rgba(56, 189, 248, ${a})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();

        // Traveling signal pulse along edge
        if ((i * 7 + j) % 6 === 0) {
          const p = (t * 0.65 + (i + j) * 0.19) % 1;
          const px = nodes[i].x + (nodes[j].x - nodes[i].x) * p;
          const py = nodes[i].y + (nodes[j].y - nodes[i].y) * p;
          ctx.fillStyle = rgba(accent, 0.9);
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Node glows
  nodes.forEach((n, idx) => {
    const col = idx % 4 === 0 ? accent : '#38bdf8';
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 16);
    g.addColorStop(0, rgba(col, 0.8));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(n.x, n.y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* 10. CINEMATIC STORM HORIZON */
function drawStormHorizon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seed: number,
  accent: string
) {
  const rand = mulberry32(seed + 1010);
  // Subtle lightning flash timing
  const flashCycle = (t * 0.55 + (seed % 7) * 0.2) % 3.4;
  const flash = flashCycle < 0.14 ? Math.sin((flashCycle / 0.14) * Math.PI) : 0;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, flash > 0.2 ? '#1e293b' : '#080c14');
  sky.addColorStop(0.55, flash > 0.2 ? '#334155' : '#131d2d');
  sky.addColorStop(1, '#05070c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Rolling thundercloud banks
  for (let i = 0; i < 9; i++) {
    const cx = ((rand() * w * 1.4 + t * (16 + i * 3)) % (w * 1.4)) - w * 0.2;
    const cy = h * (0.14 + (i % 4) * 0.11);
    const cr = w * (0.2 + rand() * 0.18);
    const g = ctx.createRadialGradient(cx, cy, cr * 0.1, cx, cy, cr);
    g.addColorStop(0, `rgba(100, 116, 139, ${0.22 + flash * 0.25})`);
    g.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp lightning bolt during flash peak
  if (flash > 0.3) {
    ctx.save();
    ctx.strokeStyle = `rgba(224, 242, 254, ${flash * 0.92})`;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 2.6;
    let lx = w * 0.62;
    let ly = h * 0.08;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    for (let seg = 0; seg < 8; seg++) {
      lx += (seg % 2 === 0 ? -1 : 1) * (14 + (seg * 7) % 24);
      ly += h * 0.075;
      ctx.lineTo(lx, ly);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Dark stormy terrain horizon
  ctx.fillStyle = '#04060a';
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += w / 20) {
    const u = x / w;
    ctx.lineTo(x, h * 0.77 + Math.sin(u * 6 + seed) * h * 0.035);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Warm distant horizon beacon glow
  const beacon = ctx.createRadialGradient(w * 0.25, h * 0.77, 4, w * 0.25, h * 0.77, w * 0.28);
  beacon.addColorStop(0, rgba(accent, 0.25));
  beacon.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = beacon;
  ctx.fillRect(0, 0, w, h);
}

/* 11. STUDIO EDITORIAL (A24 / Apple Keynote Aesthetic) */
function drawStudioEditorial(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seed: number,
  accent: string
) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0c0b10');
  bg.addColorStop(0.5, '#16131c');
  bg.addColorStop(1, '#09090d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Sweeping organic soft light blobs
  const blobs = [
    { x: 0.28, y: 0.35, r: 0.55, col: accent, a: 0.32, s: 0.35 },
    { x: 0.74, y: 0.62, r: 0.52, col: '#38bdf8', a: 0.22, s: -0.28 },
    { x: 0.52, y: 0.24, r: 0.42, col: '#f59e0b', a: 0.16, s: 0.22 },
  ];
  blobs.forEach((b, i) => {
    const cx = w * b.x + Math.sin(t * b.s + i * 2 + seed) * w * 0.1;
    const cy = h * b.y + Math.cos(t * b.s * 0.8 + i) * h * 0.08;
    const rad = Math.max(w, h) * b.r;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, rgba(b.col, b.a));
    g.addColorStop(0.55, rgba(b.col, b.a * 0.25));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  // Architectural glass-like curved light ribbons
  ctx.save();
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i % 2 === 0 ? rgba(accent, 0.18) : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const cy = h * (0.25 + i * 0.18);
    ctx.moveTo(0, cy);
    ctx.bezierCurveTo(
      w * 0.33,
      cy + Math.sin(t * 0.5 + i) * h * 0.16,
      w * 0.66,
      cy - Math.cos(t * 0.45 + i) * h * 0.16,
      w,
      cy
    );
    ctx.stroke();
  }
  ctx.restore();
}

/* 12. CRIMSON VOLCANO / TRAILER ENERGY */
function drawCrimsonVolcano(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  seed: number,
  accent: string
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#090406');
  sky.addColorStop(0.45, '#24090c');
  sky.addColorStop(0.8, '#5c140e');
  sky.addColorStop(1, '#120505');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Pulsing magma underglow
  const pulse = 0.85 + 0.15 * Math.sin(t * 2.1);
  const magma = ctx.createRadialGradient(w * 0.5, h * 0.88, 10, w * 0.5, h * 0.85, Math.max(w, h) * 0.62);
  magma.addColorStop(0, rgba('#fb923c', 0.65 * pulse));
  magma.addColorStop(0.35, rgba(accent, 0.35 * pulse));
  magma.addColorStop(0.7, 'rgba(153, 27, 27, 0.12)');
  magma.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = magma;
  ctx.fillRect(0, 0, w, h);

  // Obsidian volcanic silhouette peaks
  ctx.fillStyle = '#090506';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * 0.78);
  ctx.lineTo(w * 0.24, h * 0.62);
  ctx.lineTo(w * 0.44, h * 0.48);
  ctx.lineTo(w * 0.56, h * 0.48);
  ctx.lineTo(w * 0.76, h * 0.64);
  ctx.lineTo(w, h * 0.76);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Subtle glowing magma veins along slope
  ctx.strokeStyle = rgba('#fb923c', 0.45 * pulse);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(w * 0.49, h * 0.49);
  ctx.quadraticCurveTo(w * 0.46, h * 0.66, w * 0.38, h * 0.88);
  ctx.moveTo(w * 0.52, h * 0.49);
  ctx.quadraticCurveTo(w * 0.57, h * 0.68, w * 0.64, h * 0.9);
  ctx.stroke();

  // Rising smoke plumes
  for (let i = 0; i < 6; i++) {
    const p = ((t * 0.14 + i / 6) % 1);
    const sx = w * 0.5 + Math.sin(t * 0.6 + i * 1.9 + seed) * w * 0.08 * p;
    const sy = h * (0.5 - p * 0.46);
    const sr = Math.min(w, h) * (0.07 + p * 0.18);
    const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, sr);
    g.addColorStop(0, `rgba(28, 16, 16, ${(1 - p) * 0.42})`);
    g.addColorStop(1, 'rgba(28, 16, 16, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
}
