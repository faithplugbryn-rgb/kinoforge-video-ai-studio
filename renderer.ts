import {
  ColorGrade,
  MediaAssetEntry,
  Project,
  Scene,
} from '../types/studio';
import { drawCinemaWorld } from './cinemaWorlds';
import { drawParticles } from './particles';

export class MediaCache {
  private map = new Map<string, MediaAssetEntry>();
  private onAssetLoaded?: () => void;

  constructor(onAssetLoaded?: () => void) {
    this.onAssetLoaded = onAssetLoaded;
  }

  getOrLoad(url: string, kind: 'image' | 'video'): MediaAssetEntry {
    const existing = this.map.get(url);
    if (existing && existing.kind === kind) return existing;

    if (kind === 'video') {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.preload = 'auto';
      const entry: MediaAssetEntry = { kind: 'video', status: 'loading', element: video, url };
      this.map.set(url, entry);

      video.onloadeddata = () => {
        entry.status = 'ready';
        this.onAssetLoaded?.();
      };
      video.onerror = () => {
        entry.status = 'error';
      };
      video.src = url;
      video.load();
      return entry;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    const entry: MediaAssetEntry = { kind: 'image', status: 'loading', element: img, url };
    this.map.set(url, entry);

    img.onload = () => {
      entry.status = 'ready';
      this.onAssetLoaded?.();
    };
    img.onerror = () => {
      entry.status = 'error';
    };
    img.src = url;
    return entry;
  }

  preloadProject(project: Project) {
    for (const s of project.scenes) {
      if (s.mediaUrl) {
        this.getOrLoad(s.mediaUrl, s.visualSource === 'upload-video' ? 'video' : 'image');
      }
    }
  }
}

export interface TimelineCursor {
  sceneIndex: number;
  scene: Scene;
  localTime: number; // seconds inside scene
  progress: number; // 0..1 inside scene
  prevScene: Scene | null;
  prevSceneLocalTime: number;
  transitionProgress: number; // 0..1 if transitioning in, else 1
}

const TRANSITION_DURATION = 0.65;

export function getTimelineCursor(scenes: Scene[], time: number): TimelineCursor | null {
  if (!scenes.length) return null;
  const clamped = Math.max(0, time);
  let elapsed = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const dur = Math.max(1, scene.duration);
    const isLast = i === scenes.length - 1;
    if (clamped < elapsed + dur || isLast) {
      const localTime = Math.min(dur, Math.max(0, clamped - elapsed));
      const progress = Math.min(1, localTime / dur);
      const prevScene = i > 0 ? scenes[i - 1] : null;
      const transDur = Math.min(TRANSITION_DURATION, dur * 0.4);
      const transitionProgress =
        prevScene && scene.transition !== 'cut' && localTime < transDur
          ? Math.max(0, Math.min(1, localTime / transDur))
          : 1;
      const prevSceneLocalTime = prevScene
        ? Math.max(0, prevScene.duration - (transDur - localTime))
        : 0;

      return {
        sceneIndex: i,
        scene,
        localTime,
        progress,
        prevScene,
        prevSceneLocalTime,
        transitionProgress,
      };
    }
    elapsed += dur;
  }

  return null;
}

export function getSceneStartTime(scenes: Scene[], sceneIndex: number): number {
  let sum = 0;
  for (let i = 0; i < Math.min(sceneIndex, scenes.length); i++) {
    sum += Math.max(1, scenes[i].duration);
  }
  return sum;
}

// Reusable scratch canvases for crisp transitions without allocation churn
let scratchCanvasA: HTMLCanvasElement | null = null;
let scratchCanvasB: HTMLCanvasElement | null = null;

function ensureScratch(canvas: HTMLCanvasElement | null, w: number, h: number): HTMLCanvasElement {
  const c = canvas ?? document.createElement('canvas');
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Compute smooth camera scale & translation for Ken Burns / Cinema motion.
 */
function getCameraTransform(
  scene: Scene,
  progress: number,
  w: number,
  h: number
): { scale: number; tx: number; ty: number } {
  const k = Math.max(0, Math.min(1, scene.motionIntensity));
  const p = progress;
  switch (scene.cameraMotion) {
    case 'zoom-in':
      return { scale: 1 + 0.16 * k * p, tx: 0, ty: 0 };
    case 'zoom-out':
      return { scale: 1 + 0.16 * k * (1 - p), tx: 0, ty: 0 };
    case 'pan-left':
      return {
        scale: 1 + 0.14 * k,
        tx: (0.055 * k - 0.11 * k * p) * w,
        ty: 0,
      };
    case 'pan-right':
      return {
        scale: 1 + 0.14 * k,
        tx: (-0.055 * k + 0.11 * k * p) * w,
        ty: 0,
      };
    case 'drift-up':
      return {
        scale: 1 + 0.14 * k,
        tx: 0,
        ty: (0.05 * k - 0.1 * k * p) * h,
      };
    case 'orbit':
      return {
        scale: 1 + 0.12 * k + 0.04 * k * Math.sin(p * Math.PI),
        tx: Math.sin(p * Math.PI * 2) * w * 0.025 * k,
        ty: Math.cos(p * Math.PI * 2) * h * 0.02 * k,
      };
    case 'static':
    default:
      return { scale: 1, tx: 0, ty: 0 };
  }
}

function drawCoverMedia(
  ctx: CanvasRenderingContext2D,
  el: HTMLImageElement | HTMLVideoElement,
  w: number,
  h: number
) {
  const sw = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
  const sh = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
  if (!sw || !sh) return false;

  const targetRatio = w / h;
  const srcRatio = sw / sh;
  let drawW = w;
  let drawH = h;
  let dx = 0;
  let dy = 0;

  if (srcRatio > targetRatio) {
    drawH = h;
    drawW = h * srcRatio;
    dx = (w - drawW) * 0.5;
  } else {
    drawW = w;
    drawH = w / srcRatio;
    dy = (h - drawH) * 0.5;
  }

  ctx.drawImage(el, dx, dy, drawW, drawH);
  return true;
}

/**
 * Draws the visual layer of a single scene (world or photo/video + camera + particles + heading).
 */
export function drawSceneVisual(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  w: number,
  h: number,
  localTime: number,
  mediaCache: MediaCache,
  isPlaying: boolean
) {
  const dur = Math.max(1, scene.duration);
  const progress = Math.min(1, Math.max(0, localTime / dur));
  const { scale, tx, ty } = getCameraTransform(scene, progress, w, h);

  ctx.save();
  ctx.translate(w * 0.5 + tx, h * 0.5 + ty);
  ctx.scale(scale, scale);
  ctx.translate(-w * 0.5, -h * 0.5);

  let drewExternal = false;
  if (scene.visualSource !== 'cinema' && scene.mediaUrl) {
    const kind = scene.visualSource === 'upload-video' ? 'video' : 'image';
    const entry = mediaCache.getOrLoad(scene.mediaUrl, kind);
    if (entry.status === 'ready') {
      if (entry.kind === 'video') {
        const vid = entry.element as HTMLVideoElement;
        if (vid.duration && isFinite(vid.duration)) {
          const targetT = localTime % vid.duration;
          if (!isPlaying && Math.abs(vid.currentTime - targetT) > 0.12) {
            try {
              vid.currentTime = targetT;
            } catch {
              // ignore seek exceptions
            }
          } else if (isPlaying && vid.paused) {
            vid.play().catch(() => {});
          }
        }
      }
      drewExternal = drawCoverMedia(ctx, entry.element, w, h);
    }
  }

  if (!drewExternal) {
    drawCinemaWorld(ctx, scene.cinemaWorld, w, h, localTime, scene.seed, scene.accentColor);
  } else {
    // Subtle cinematic darkening gradient so captions pop crisply over stock/uploaded media
    const veil = ctx.createLinearGradient(0, 0, 0, h);
    veil.addColorStop(0, 'rgba(0, 0, 0, 0.24)');
    veil.addColorStop(0.45, 'rgba(0, 0, 0, 0.08)');
    veil.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();

  // Animated particle & weather atmosphere overlay
  drawParticles(ctx, scene.particles, w, h, localTime, scene.seed, scene.accentColor);

  // Optional Scene Heading / Chapter Title Badge
  if (scene.headingOverlay.trim()) {
    drawHeadingOverlay(ctx, scene.headingOverlay.trim(), w, h, localTime, dur, scene.accentColor);
  }
}

function drawHeadingOverlay(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  localTime: number,
  duration: number,
  accent: string
) {
  const fadeIn = Math.min(1, localTime / 0.45);
  const fadeOut = Math.min(1, Math.max(0, (duration - localTime) / 0.4));
  const alpha = easeInOutCubic(Math.min(fadeIn, fadeOut));
  if (alpha <= 0.01) return;

  const isVertical = h > w;
  const fontSize = Math.round(Math.min(w, h) * (isVertical ? 0.033 : 0.03));
  const padX = Math.round(fontSize * 0.72);
  const padY = Math.round(fontSize * 0.42);
  const marginX = Math.round(w * 0.055);
  const marginY = Math.round(h * (isVertical ? 0.075 : 0.085));
  const slideOffset = (1 - alpha) * 14;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `600 ${fontSize}px "Space Grotesk", "Inter", sans-serif`;
  const textWidth = ctx.measureText(text.toUpperCase()).width;
  const boxW = textWidth + padX * 2 + 10;
  const boxH = fontSize + padY * 2;

  // Translucent dark glass badge
  ctx.fillStyle = 'rgba(9, 9, 11, 0.64)';
  roundRectPath(ctx, marginX, marginY + slideOffset, boxW, boxH, 8);
  ctx.fill();

  // Left accent cinema bar
  ctx.fillStyle = accent;
  roundRectPath(ctx, marginX, marginY + slideOffset, 4, boxH, 2);
  ctx.fill();

  ctx.fillStyle = '#F4F4F5';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text.toUpperCase(), marginX + padX + 6, marginY + slideOffset + boxH * 0.52);
  ctx.restore();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Word-level synchronized kinetic captions
 */
function drawCaptions(
  ctx: CanvasRenderingContext2D,
  project: Project,
  scene: Scene,
  localTime: number,
  w: number,
  h: number
) {
  const { captionStyle, captionPosition, captionScale, captionAccent, letterbox } = project.settings;
  if (captionStyle === 'off') return;
  const text = scene.narration.trim();
  if (!text) return;

  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return;

  const dur = Math.max(1, scene.duration);
  // Active word index weighted by word length for natural speech rhythm
  const weights = words.map((word) => Math.max(2.5, word.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const speakWindow = Math.max(0.5, dur - 0.25);
  const progress = Math.min(0.999, Math.max(0, localTime / speakWindow));
  let acc = 0;
  let activeIdx = 0;
  for (let i = 0; i < words.length; i++) {
    acc += weights[i] / totalWeight;
    if (progress <= acc) {
      activeIdx = i;
      break;
    }
    activeIdx = i;
  }

  const isVertical = h > w;
  const baseUnit = Math.min(w, h);

  // Anchor Y based on position, letterbox & optional heading badge
  const letterboxH = letterbox ? h * 0.1 : 0;
  let anchorY = h - letterboxH - h * (isVertical ? 0.18 : 0.13);
  if (captionPosition === 'center') anchorY = h * 0.52;
  if (captionPosition === 'top') {
    const hasHeading = Boolean(scene.headingOverlay.trim());
    anchorY = letterboxH + h * (hasHeading ? 0.22 : isVertical ? 0.17 : 0.15);
  }

  ctx.save();

  if (captionStyle === 'pop-highlight') {
    // Viral short-form 3-5 word kinetic chunks with active glowing pill
    const chunkSize = isVertical ? 4 : 6;
    const chunkIdx = Math.floor(activeIdx / chunkSize);
    const start = chunkIdx * chunkSize;
    const chunkWords = words.slice(start, start + chunkSize);
    const localActive = activeIdx - start;

    const fontSize = Math.round(baseUnit * (isVertical ? 0.068 : 0.056) * captionScale);
    ctx.font = `800 ${fontSize}px "Space Grotesk", "Inter", sans-serif`;
    ctx.textBaseline = 'middle';

    // Wrap chunk into max 2 lines
    const maxLineW = w * 0.84;
    const spaceW = ctx.measureText(' ').width * 1.15;
    const lines: { word: string; idx: number; width: number }[][] = [[]];
    let curW = 0;

    chunkWords.forEach((word, i) => {
      const display = word.toUpperCase();
      const ww = ctx.measureText(display).width;
      if (lines[lines.length - 1].length > 0 && curW + spaceW + ww > maxLineW) {
        lines.push([{ word: display, idx: i, width: ww }]);
        curW = ww;
      } else {
        lines[lines.length - 1].push({ word: display, idx: i, width: ww });
        curW += (lines[lines.length - 1].length > 1 ? spaceW : 0) + ww;
      }
    });

    const lineH = fontSize * 1.32;
    const totalH = lines.length * lineH;
    const startY = anchorY - totalH * 0.5 + lineH * 0.5;

    lines.forEach((line, li) => {
      const lineW =
        line.reduce((sum, item) => sum + item.width, 0) + spaceW * Math.max(0, line.length - 1);
      let curX = (w - lineW) * 0.5;
      const y = startY + li * lineH;

      line.forEach((item) => {
        const isActive = item.idx === localActive;
        const isPast = item.idx < localActive;
        const padX = fontSize * 0.22;
        const padY = fontSize * 0.14;

        if (isActive) {
          ctx.save();
          ctx.fillStyle = captionAccent;
          ctx.shadowColor = captionAccent;
          ctx.shadowBlur = 22;
          roundRectPath(
            ctx,
            curX - padX,
            y - fontSize * 0.56 - padY * 0.5,
            item.width + padX * 2,
            fontSize * 1.12 + padY,
            10
          );
          ctx.fill();
          ctx.restore();
        }

        ctx.save();
        ctx.textAlign = 'left';
        ctx.lineWidth = Math.max(3, fontSize * 0.12);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = isActive ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.85)';
        ctx.strokeText(item.word, curX, y);
        ctx.fillStyle = isActive ? '#09090B' : isPast ? '#FFFFFF' : 'rgba(244,244,245,0.78)';
        ctx.fillText(item.word, curX, y);
        ctx.restore();

        curX += item.width + spaceW;
      });
    });
  } else if (captionStyle === 'cinematic') {
    const fontSize = Math.round(baseUnit * (isVertical ? 0.042 : 0.036) * captionScale);
    ctx.font = `500 ${fontSize}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxW = w * 0.8;
    const lines = wrapTextLines(ctx, text, maxW).slice(0, 3);
    const lineH = fontSize * 1.4;
    const blockH = lines.length * lineH + fontSize * 0.7;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const boxW = Math.min(w * 0.9, widest + fontSize * 1.6);

    ctx.fillStyle = 'rgba(9, 9, 11, 0.72)';
    roundRectPath(ctx, (w - boxW) * 0.5, anchorY - blockH * 0.5, boxW, blockH, 10);
    ctx.fill();

    // Subtle accent underline
    ctx.fillStyle = captionAccent;
    ctx.fillRect((w - boxW) * 0.5 + 16, anchorY + blockH * 0.5 - 3, (boxW - 32) * progress, 2.5);

    const startY = anchorY - ((lines.length - 1) * lineH) * 0.5;
    ctx.fillStyle = '#F4F4F5';
    lines.forEach((line, i) => {
      ctx.fillText(line, w * 0.5, startY + i * lineH);
    });
  } else if (captionStyle === 'minimalist') {
    const fontSize = Math.round(baseUnit * (isVertical ? 0.048 : 0.042) * captionScale);
    ctx.font = `700 ${fontSize}px "Space Grotesk", "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = wrapTextLines(ctx, text, w * 0.78).slice(0, 3);
    const lineH = fontSize * 1.32;
    const startY = anchorY - ((lines.length - 1) * lineH) * 0.5;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FFFFFF';
    lines.forEach((line, i) => {
      ctx.fillText(line, w * 0.5, startY + i * lineH);
    });
  } else if (captionStyle === 'typewriter') {
    const fontSize = Math.round(baseUnit * (isVertical ? 0.038 : 0.033) * captionScale);
    ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const visibleChars = Math.max(1, Math.floor(text.length * Math.min(1, progress * 1.12)));
    const partial = text.slice(0, visibleChars) + (Math.floor(localTime * 3) % 2 === 0 ? '▍' : '');
    const maxW = w * 0.78;
    const lines = wrapTextLines(ctx, partial, maxW).slice(-3);
    const lineH = fontSize * 1.45;
    const blockH = lines.length * lineH + fontSize * 0.85;
    const boxW = Math.min(w * 0.88, maxW + fontSize * 1.3);

    ctx.fillStyle = 'rgba(9, 9, 11, 0.78)';
    roundRectPath(ctx, (w - boxW) * 0.5, anchorY - blockH * 0.5, boxW, blockH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const startX = (w - boxW) * 0.5 + fontSize * 0.65;
    const startY = anchorY - ((lines.length - 1) * lineH) * 0.5;
    ctx.fillStyle = '#E4E4E7';
    lines.forEach((line, i) => {
      ctx.fillText(line, startX, startY + i * lineH);
    });
  }

  ctx.restore();
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Post-processing color grade LUTs, vignette, film grain, and cinema letterbox bars.
 */
function applyPostProcessing(
  ctx: CanvasRenderingContext2D,
  grade: ColorGrade,
  grainAmount: number,
  vignetteAmount: number,
  letterbox: boolean,
  w: number,
  h: number,
  t: number
) {
  ctx.save();

  // Color grade overlay
  if (grade === 'teal-orange') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(6, 182, 212, 0.14)');
    g.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    g.addColorStop(1, 'rgba(249, 115, 22, 0.16)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'noir') {
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'golden-film') {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'cyber-neon') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(56, 189, 248, 0.16)');
    g.addColorStop(1, 'rgba(236, 72, 153, 0.16)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'warm-kodak') {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(251, 146, 60, 0.17)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(30, 18, 12, 0.12)';
    ctx.fillRect(0, 0, w, h);
  }

  ctx.globalCompositeOperation = 'source-over';

  // Vignette
  if (vignetteAmount > 0.01) {
    const vig = ctx.createRadialGradient(
      w * 0.5,
      h * 0.5,
      Math.min(w, h) * 0.28,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.76
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, vignetteAmount * 0.72)})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  // Lightweight deterministic film grain specks
  if (grainAmount > 0.02) {
    const frameSeed = Math.floor(t * 24);
    const specks = Math.floor(240 * grainAmount);
    for (let i = 0; i < specks; i++) {
      const h1 = Math.sin(i * 127.1 + frameSeed * 311.7) * 43758.5453;
      const h2 = Math.sin(i * 269.5 + frameSeed * 183.3) * 43758.5453;
      const gx = (h1 - Math.floor(h1)) * w;
      const gy = (h2 - Math.floor(h2)) * h;
      ctx.fillStyle = i % 2 === 0
        ? `rgba(255,255,255,${0.08 * grainAmount})`
        : `rgba(0,0,0,${0.12 * grainAmount})`;
      ctx.fillRect(gx, gy, 2, 2);
    }
  }

  // Optional 2.39:1 cinema letterbox bars
  if (letterbox) {
    const barH = Math.round(h * 0.095);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, barH);
    ctx.fillRect(0, h - barH, w, barH);
  }

  ctx.restore();
}

/**
 * Master frame renderer used identically for Live Monitor AND Video Export!
 */
export function renderProjectFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  currentTime: number,
  mediaCache: MediaCache,
  isPlaying = false
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cursor = getTimelineCursor(project.scenes, currentTime);

  if (!cursor) {
    ctx.fillStyle = '#09090B';
    ctx.fillRect(0, 0, w, h);
    return;
  }

  const { scene, localTime, prevScene, prevSceneLocalTime, transitionProgress } = cursor;

  if (prevScene && transitionProgress < 1 && scene.transition !== 'cut') {
    const tp = easeInOutCubic(transitionProgress);
    scratchCanvasA = ensureScratch(scratchCanvasA, w, h);
    scratchCanvasB = ensureScratch(scratchCanvasB, w, h);
    const ctxA = scratchCanvasA.getContext('2d')!;
    const ctxB = scratchCanvasB.getContext('2d')!;

    drawSceneVisual(ctxA, prevScene, w, h, prevSceneLocalTime, mediaCache, isPlaying);
    drawSceneVisual(ctxB, scene, w, h, localTime, mediaCache, isPlaying);

    ctx.clearRect(0, 0, w, h);

    switch (scene.transition) {
      case 'crossfade':
        ctx.drawImage(scratchCanvasA, 0, 0);
        ctx.save();
        ctx.globalAlpha = tp;
        ctx.drawImage(scratchCanvasB, 0, 0);
        ctx.restore();
        break;

      case 'dip-black':
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        if (tp < 0.5) {
          ctx.globalAlpha = 1 - tp * 2;
          ctx.drawImage(scratchCanvasA, 0, 0);
        } else {
          ctx.globalAlpha = (tp - 0.5) * 2;
          ctx.drawImage(scratchCanvasB, 0, 0);
        }
        ctx.restore();
        break;

      case 'slide-left': {
        const shift = Math.round(w * tp);
        ctx.drawImage(scratchCanvasA, -shift, 0);
        ctx.drawImage(scratchCanvasB, w - shift, 0);
        break;
      }

      case 'wipe': {
        ctx.drawImage(scratchCanvasA, 0, 0);
        const clipW = Math.round(w * tp);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, clipW, h);
        ctx.clip();
        ctx.drawImage(scratchCanvasB, 0, 0);
        ctx.restore();
        break;
      }

      case 'zoom-dissolve': {
        ctx.save();
        const sA = 1 + tp * 0.22;
        ctx.translate(w * 0.5, h * 0.5);
        ctx.scale(sA, sA);
        ctx.translate(-w * 0.5, -h * 0.5);
        ctx.drawImage(scratchCanvasA, 0, 0);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = tp;
        const sB = 1.18 - tp * 0.18;
        ctx.translate(w * 0.5, h * 0.5);
        ctx.scale(sB, sB);
        ctx.translate(-w * 0.5, -h * 0.5);
        ctx.drawImage(scratchCanvasB, 0, 0);
        ctx.restore();
        break;
      }

      default:
        ctx.drawImage(scratchCanvasB, 0, 0);
    }
  } else {
    drawSceneVisual(ctx, scene, w, h, localTime, mediaCache, isPlaying);
  }

  // Post-processing before captions so captions remain tack-sharp
  applyPostProcessing(
    ctx,
    project.settings.colorGrade,
    project.settings.filmGrain,
    project.settings.vignette,
    project.settings.letterbox,
    w,
    h,
    currentTime
  );

  // Kinetic captions on top
  drawCaptions(ctx, project, scene, localTime, w, h);
}

/**
 * Renders a crisp mini thumbnail of a single scene for the Timeline strip
 */
export function renderSceneThumbnail(
  canvas: HTMLCanvasElement,
  scene: Scene,
  mediaCache: MediaCache
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  drawSceneVisual(ctx, scene, canvas.width, canvas.height, Math.min(1.5, scene.duration * 0.35), mediaCache, false);
}
