import { ParticleEffect } from './studio';
import { mulberry32 } from './cinemaWorlds';

/**
 * Deterministic animated atmosphere & particle overlays.
 * Works cleanly over procedural cinema worlds, stock photography, AI art, or uploaded video!
 */
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  effect: ParticleEffect,
  w: number,
  h: number,
  t: number,
  seed: number,
  accentHex: string
) {
  if (effect === 'none') return;
  const rand = mulberry32(seed + 4242);

  ctx.save();

  switch (effect) {
    case 'dust': {
      const count = 48;
      for (let i = 0; i < count; i++) {
        const bx = rand() * w;
        const by = rand() * h;
        const speed = 8 + rand() * 18;
        const x = ((bx + t * speed * 0.7 + Math.sin(t * 0.8 + i) * 24) % w + w) % w;
        const y = ((by - t * speed * 0.45 + Math.cos(t * 0.6 + i) * 16) % h + h) % h;
        const r = 1 + rand() * 2.4;
        const a = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6 + i * 2.3));
        ctx.fillStyle = `rgba(255, 248, 235, ${a})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'rain': {
      const count = 95;
      ctx.lineCap = 'round';
      for (let i = 0; i < count; i++) {
        const bx = rand() * (w + 160);
        const by = rand() * h;
        const speed = 520 + rand() * 340;
        const len = 16 + rand() * 22;
        const y = (by + t * speed) % (h + 60) - 30;
        const x = ((bx - t * speed * 0.18) % (w + 160) + (w + 160)) % (w + 160) - 80;
        ctx.strokeStyle = `rgba(186, 230, 253, ${0.18 + rand() * 0.28})`;
        ctx.lineWidth = 1 + rand() * 0.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - len * 0.18, y + len);
        ctx.stroke();
      }
      break;
    }

    case 'snow': {
      const count = 75;
      for (let i = 0; i < count; i++) {
        const bx = rand() * w;
        const by = rand() * h;
        const fall = 38 + rand() * 58;
        const y = (by + t * fall) % (h + 20) - 10;
        const x = ((bx + Math.sin(t * (1 + rand()) + i) * 32 + t * 14) % w + w) % w;
        const r = 1.2 + rand() * 3.1;
        ctx.fillStyle = `rgba(241, 245, 249, ${0.35 + rand() * 0.45})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'embers': {
      const count = 58;
      for (let i = 0; i < count; i++) {
        const bx = rand() * w;
        const by = rand() * h;
        const rise = 45 + rand() * 85;
        const y = ((by - t * rise) % (h + 30) + (h + 30)) % (h + 30) - 15;
        const x = ((bx + Math.sin(t * (1.8 + rand()) + i * 3) * 38 + t * 18) % w + w) % w;
        const r = 1.2 + rand() * 2.8;
        const flicker = 0.5 + 0.5 * Math.sin(t * 7 + i * 5);
        const col = i % 3 === 0 ? '#fef08a' : i % 2 === 0 ? '#fb923c' : accentHex;
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.4 + flicker * 0.55;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'stars': {
      const count = 60;
      for (let i = 0; i < count; i++) {
        const x = rand() * w;
        const y = rand() * h * 0.72;
        const r = 0.8 + rand() * 1.8;
        const twinkle = 0.25 + 0.75 * Math.abs(Math.sin(t * (1.5 + rand() * 3) + i * 4));
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'bokeh': {
      const count = 20;
      for (let i = 0; i < count; i++) {
        const bx = rand() * w;
        const by = rand() * h;
        const x = ((bx + Math.sin(t * 0.35 + i * 1.7) * 55 + t * 8) % (w + 120) + (w + 120)) % (w + 120) - 60;
        const y = ((by + Math.cos(t * 0.3 + i * 2.1) * 40) % (h + 120) + (h + 120)) % (h + 120) - 60;
        const r = Math.min(w, h) * (0.025 + rand() * 0.055);
        const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
        const c = i % 3 === 0 ? accentHex : i % 2 === 0 ? '#38bdf8' : '#fef3c7';
        g.addColorStop(0, c);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 1.2 + i);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'fireflies': {
      const count = 34;
      for (let i = 0; i < count; i++) {
        const bx = rand() * w;
        const by = h * 0.25 + rand() * h * 0.7;
        const x = ((bx + Math.sin(t * (0.6 + rand() * 0.6) + i * 3) * 65) % w + w) % w;
        const y = ((by + Math.cos(t * (0.5 + rand() * 0.5) + i * 2) * 45) % h + h) % h;
        const glow = Math.pow(0.5 + 0.5 * Math.sin(t * (2.2 + rand() * 2) + i * 5), 2);
        const r = 6 + glow * 10;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(217, 249, 157, ${0.85 * glow})`);
        g.addColorStop(0.4, `rgba(132, 204, 22, ${0.3 * glow})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  ctx.restore();
}
