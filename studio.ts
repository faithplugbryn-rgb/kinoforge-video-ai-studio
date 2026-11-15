export type AspectRatio = '16:9' | '9:16' | '1:1';

export type VisualSource =
  | 'cinema'
  | 'stock'
  | 'ai-image'
  | 'upload-image'
  | 'upload-video';

export type CinemaWorld =
  | 'neon-cyber'
  | 'deep-cosmos'
  | 'golden-horizon'
  | 'ocean-moonlight'
  | 'mystic-forest'
  | 'desert-eclipse'
  | 'synthwave-grid'
  | 'aurora-arctic'
  | 'data-matrix'
  | 'storm-horizon'
  | 'studio-editorial'
  | 'crimson-volcano';

export type ParticleEffect =
  | 'none'
  | 'dust'
  | 'rain'
  | 'snow'
  | 'embers'
  | 'stars'
  | 'bokeh'
  | 'fireflies';

export type CameraMotion =
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'drift-up'
  | 'orbit'
  | 'static';

export type TransitionType =
  | 'crossfade'
  | 'dip-black'
  | 'slide-left'
  | 'wipe'
  | 'zoom-dissolve'
  | 'cut';

export type CaptionStyle =
  | 'pop-highlight'
  | 'cinematic'
  | 'minimalist'
  | 'typewriter'
  | 'off';

export type CaptionPosition = 'bottom' | 'center' | 'top';

export type ColorGrade =
  | 'neutral'
  | 'teal-orange'
  | 'noir'
  | 'golden-film'
  | 'cyber-neon'
  | 'warm-kodak';

export type SoundtrackId =
  | 'cinematic-horizon'
  | 'neon-cyberwave'
  | 'lofi-story'
  | 'deep-space'
  | 'upbeat-creator'
  | 'none';

export interface Scene {
  id: string;
  title: string;
  narration: string;
  headingOverlay: string;
  duration: number; // seconds
  visualSource: VisualSource;
  cinemaWorld: CinemaWorld;
  accentColor: string;
  mediaUrl?: string; // stock photo URL, AI blob/data URL, or uploaded object/data URL
  mediaCredit?: string;
  stockQuery: string;
  aiPrompt: string;
  particles: ParticleEffect;
  cameraMotion: CameraMotion;
  motionIntensity: number; // 0 to 1
  transition: TransitionType;
  voiceAudioUrl?: string; // recorded mic or uploaded audio URL (object URL or data URL)
  voiceAudioLabel?: string;
  seed: number;
}

export interface ProjectSettings {
  aspectRatio: AspectRatio;
  captionStyle: CaptionStyle;
  captionPosition: CaptionPosition;
  captionScale: number; // 0.75 to 1.4
  captionAccent: string;
  colorGrade: ColorGrade;
  filmGrain: number; // 0 to 1
  vignette: number; // 0 to 1
  letterbox: boolean;
  soundtrack: SoundtrackId;
  musicVolume: number; // 0 to 1
  voiceVolume: number; // 0 to 1
  transitionSfx: boolean;
  ttsEnabled: boolean;
  ttsVoiceURI: string;
  ttsRate: number; // 0.7 to 1.4
  ttsPitch: number; // 0.7 to 1.3
}

export interface Project {
  id: string;
  title: string;
  prompt: string;
  updatedAt: number;
  settings: ProjectSettings;
  scenes: Scene[];
}

export interface ExportOptions {
  resolution: '720p' | '1080p';
  fps: 30 | 60;
  includeAudio: boolean;
}

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'finalizing' | 'done' | 'error';
  progress: number; // 0 to 1
  currentTime: number;
  totalDuration: number;
  message: string;
}

export interface ExportResult {
  blob: Blob;
  url: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
}

export interface StockPhotoResult {
  id: string;
  title: string;
  thumbUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  credit: string;
}

export interface MediaAssetEntry {
  kind: 'image' | 'video';
  status: 'loading' | 'ready' | 'error';
  element: HTMLImageElement | HTMLVideoElement;
  url: string;
}

export function getCanvasDimensions(
  aspectRatio: AspectRatio,
  tier: 'preview' | '720p' | '1080p' = 'preview'
): { width: number; height: number } {
  if (tier === '1080p') {
    if (aspectRatio === '16:9') return { width: 1920, height: 1080 };
    if (aspectRatio === '9:16') return { width: 1080, height: 1920 };
    return { width: 1080, height: 1080 };
  }
  if (tier === '720p') {
    if (aspectRatio === '16:9') return { width: 1280, height: 720 };
    if (aspectRatio === '9:16') return { width: 720, height: 1280 };
    return { width: 720, height: 720 };
  }
  // preview crisp HD resolution
  if (aspectRatio === '16:9') return { width: 1280, height: 720 };
  if (aspectRatio === '9:16') return { width: 720, height: 1280 };
  return { width: 960, height: 960 };
}

export function getTotalDuration(scenes: Scene[]): number {
  return scenes.reduce((sum, s) => sum + Math.max(1, s.duration), 0);
}
