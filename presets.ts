import {
  AspectRatio,
  CameraMotion,
  CaptionStyle,
  CinemaWorld,
  ColorGrade,
  ParticleEffect,
  Project,
  SoundtrackId,
  TransitionType,
} from '../types/studio';
import { GenerationStyle } from '../engine/scriptGenerator';

export const CINEMA_WORLDS: {
  id: CinemaWorld;
  label: string;
  swatch: [string, string];
  tag: string;
}[] = [
  { id: 'neon-cyber', label: 'Neon Metropolis', swatch: ['#0c1530', '#22d3ee'], tag: 'Sci-Fi' },
  { id: 'deep-cosmos', label: 'Deep Cosmos', swatch: ['#0b1124', '#38bdf8'], tag: 'Space' },
  { id: 'golden-horizon', label: 'Golden Dawn', swatch: ['#3b1f3a', '#f59e0b'], tag: 'Nature' },
  { id: 'ocean-moonlight', label: 'Moonlit Ocean', swatch: ['#0c1b33', '#bae6fd'], tag: 'Calm' },
  { id: 'mystic-forest', label: 'Mystic Forest', swatch: ['#061c1d', '#34d399'], tag: 'Fantasy' },
  { id: 'desert-eclipse', label: 'Solar Eclipse', swatch: ['#5c1d13', '#fb923c'], tag: 'Epic' },
  { id: 'synthwave-grid', label: 'Retro Grid', swatch: ['#1e0a3c', '#ec4899'], tag: '80s' },
  { id: 'aurora-arctic', label: 'Arctic Aurora', swatch: ['#071a26', '#10b981'], tag: 'Nordic' },
  { id: 'data-matrix', label: 'Neural Grid', swatch: ['#070c18', '#38bdf8'], tag: 'Tech' },
  { id: 'storm-horizon', label: 'Storm Horizon', swatch: ['#080c14', '#64748b'], tag: 'Drama' },
  { id: 'studio-editorial', label: 'Editorial Stage', swatch: ['#16131c', '#f97316'], tag: 'Brand' },
  { id: 'crimson-volcano', label: 'Obsidian Ember', swatch: ['#24090c', '#fb923c'], tag: 'Action' },
];

export const PARTICLE_EFFECTS: { id: ParticleEffect; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'dust', label: 'Cinema Dust' },
  { id: 'rain', label: 'Neon Rain' },
  { id: 'snow', label: 'Snowfall' },
  { id: 'embers', label: 'Rising Embers' },
  { id: 'stars', label: 'Starfield' },
  { id: 'bokeh', label: 'Soft Bokeh' },
  { id: 'fireflies', label: 'Fireflies' },
];

export const CAMERA_MOTIONS: { id: CameraMotion; label: string }[] = [
  { id: 'zoom-in', label: 'Dolly Zoom In' },
  { id: 'zoom-out', label: 'Pull Back Out' },
  { id: 'pan-left', label: 'Pan Left' },
  { id: 'pan-right', label: 'Pan Right' },
  { id: 'drift-up', label: 'Crane Tilt Up' },
  { id: 'orbit', label: 'Subtle Orbit' },
  { id: 'static', label: 'Locked Tripod' },
];

export const TRANSITION_TYPES: { id: TransitionType; label: string }[] = [
  { id: 'crossfade', label: 'Crossfade' },
  { id: 'zoom-dissolve', label: 'Zoom Dissolve' },
  { id: 'dip-black', label: 'Dip to Black' },
  { id: 'slide-left', label: 'Slide Cut' },
  { id: 'wipe', label: 'Cinema Wipe' },
  { id: 'cut', label: 'Hard Cut' },
];

export const CAPTION_STYLES: { id: CaptionStyle; label: string; desc: string }[] = [
  { id: 'pop-highlight', label: 'Viral Pop', desc: 'Word-by-word active accent pill' },
  { id: 'cinematic', label: 'Cinema Sub', desc: 'Lower-third bar with progress rail' },
  { id: 'minimalist', label: 'Minimal Bold', desc: 'Clean floating display typography' },
  { id: 'typewriter', label: 'Typewriter', desc: 'Documentary monospace reveal' },
  { id: 'off', label: 'Captions Off', desc: 'Clean unobstructed picture' },
];

export const COLOR_GRADES: { id: ColorGrade; label: string; preview: string }[] = [
  { id: 'neutral', label: 'Neutral', preview: 'linear-gradient(135deg,#27272a,#52525b)' },
  { id: 'teal-orange', label: 'Teal & Orange', preview: 'linear-gradient(135deg,#0891b2,#ea580c)' },
  { id: 'golden-film', label: 'Golden Film', preview: 'linear-gradient(135deg,#92400e,#fbbf24)' },
  { id: 'cyber-neon', label: 'Cyber Neon', preview: 'linear-gradient(135deg,#06b6d4,#db2777)' },
  { id: 'warm-kodak', label: 'Warm Kodak', preview: 'linear-gradient(135deg,#451a03,#fb923c)' },
  { id: 'noir', label: 'Silver Noir', preview: 'linear-gradient(135deg,#09090b,#a1a1aa)' },
];

export const SOUNDTRACKS: { id: SoundtrackId; label: string; mood: string; bpm: string }[] = [
  { id: 'cinematic-horizon', label: 'Cinematic Horizon', mood: 'Warm ambient swells', bpm: '72 BPM' },
  { id: 'neon-cyberwave', label: 'Neon Cyberwave', mood: 'Synthwave arpeggio drive', bpm: '108 BPM' },
  { id: 'lofi-story', label: 'Lo-Fi Storytelling', mood: 'Mellow warm chords', bpm: '80 BPM' },
  { id: 'deep-space', label: 'Deep Space Drift', mood: 'Ethereal harmonic drone', bpm: '60 BPM' },
  { id: 'upbeat-creator', label: 'Upbeat Creator', mood: 'Snappy Shorts & Reels pulse', bpm: '116 BPM' },
  { id: 'none', label: 'No Soundtrack', mood: 'Voiceover or silent export', bpm: '—' },
];

export const ACCENT_SWATCHES = [
  '#F97316',
  '#22D3EE',
  '#F59E0B',
  '#34D399',
  '#F43F5E',
  '#38BDF8',
  '#A78BFA',
  '#FFFFFF',
];

export interface StarterTemplate {
  id: string;
  label: string;
  badge: string;
  aspectRatio: AspectRatio;
  style: GenerationStyle;
  prompt: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'scifi-trailer',
    label: 'Sci-Fi Film Trailer',
    badge: '16:9',
    aspectRatio: '16:9',
    style: 'cinematic',
    prompt: 'humanity discovering a luminous ancient city beneath the neon storms of Europa',
  },
  {
    id: 'viral-ocean',
    label: 'Deep Ocean Facts Short',
    badge: '9:16',
    aspectRatio: '9:16',
    style: 'viral-short',
    prompt: 'the mysterious bioluminescent creatures living in the midnight zone of the ocean',
  },
  {
    id: 'product-launch',
    label: 'Product Launch Teaser',
    badge: '1:1',
    aspectRatio: '1:1',
    style: 'product-launch',
    prompt: 'Nova Studio — an instant zero-cost creative workspace built for independent filmmakers',
  },
  {
    id: 'arctic-doc',
    label: 'Arctic Aurora Documentary',
    badge: '16:9',
    aspectRatio: '16:9',
    style: 'documentary',
    prompt: 'the aurora borealis dancing above frozen arctic fjords in deep winter',
  },
  {
    id: 'cyber-reel',
    label: 'Retro Synthwave Reel',
    badge: '9:16',
    aspectRatio: '9:16',
    style: 'viral-short',
    prompt: 'how retro 80s synthwave aesthetics shaped modern futuristic cinema and games',
  },
  {
    id: 'forest-story',
    label: 'Enchanted Forest Tale',
    badge: '16:9',
    aspectRatio: '16:9',
    style: 'storytelling',
    prompt: 'a lone traveler following fireflies through an ancient misty emerald forest at dusk',
  },
];

/** Default studio project ready to preview & export the instant the app opens */
export function createDefaultProject(): Project {
  return {
    id: 'proj-default-horizon',
    title: 'Beyond The Horizon',
    prompt: 'A cinematic sci-fi journey from neon cities to uncharted cosmic worlds',
    updatedAt: Date.now(),
    settings: {
      aspectRatio: '16:9',
      captionStyle: 'pop-highlight',
      captionPosition: 'bottom',
      captionScale: 1,
      captionAccent: '#F97316',
      colorGrade: 'teal-orange',
      filmGrain: 0.25,
      vignette: 0.45,
      letterbox: false,
      soundtrack: 'cinematic-horizon',
      musicVolume: 0.65,
      voiceVolume: 0.9,
      transitionSfx: true,
      ttsEnabled: true,
      ttsVoiceURI: '',
      ttsRate: 1.0,
      ttsPitch: 1.0,
    },
    scenes: [
      {
        id: 'sc-init-1',
        title: 'Neon Awakening',
        headingOverlay: 'CHAPTER 01 · NEON SKYLINE',
        narration: 'Every unforgettable film begins with a single spark of imagination.',
        duration: 4.5,
        visualSource: 'cinema',
        cinemaWorld: 'neon-cyber',
        accentColor: '#F97316',
        stockQuery: 'neon city night rain skyline',
        aiPrompt: 'Rain-slicked futuristic neon metropolis at dusk, volumetric cyan and amber reflections, 35mm cinema still',
        particles: 'rain',
        cameraMotion: 'zoom-in',
        motionIntensity: 0.7,
        transition: 'cut',
        seed: 1024,
      },
      {
        id: 'sc-init-2',
        title: 'Across The Cosmos',
        headingOverlay: 'CHAPTER 02 · DEEP SPACE',
        narration: 'Turn any idea or script into animated scenes, motion, music, and kinetic captions.',
        duration: 5.0,
        visualSource: 'cinema',
        cinemaWorld: 'deep-cosmos',
        accentColor: '#38BDF8',
        stockQuery: 'deep space nebula stars galaxy',
        aiPrompt: 'Luminous ringed exoplanet surrounded by turquoise and amber cosmic nebula clouds, IMAX frame',
        particles: 'stars',
        cameraMotion: 'orbit',
        motionIntensity: 0.75,
        transition: 'zoom-dissolve',
        seed: 2048,
      },
      {
        id: 'sc-init-3',
        title: 'Arctic Silence',
        headingOverlay: 'CHAPTER 03 · NORTHERN LIGHTS',
        narration: 'Switch effortlessly between widescreen cinema, vertical Shorts, and square feeds.',
        duration: 4.5,
        visualSource: 'cinema',
        cinemaWorld: 'aurora-arctic',
        accentColor: '#34D399',
        stockQuery: 'aurora borealis fjord reflection night',
        aiPrompt: 'Emerald northern lights rippling over dark arctic fjords and still glass water',
        particles: 'snow',
        cameraMotion: 'pan-right',
        motionIntensity: 0.65,
        transition: 'crossfade',
        seed: 3072,
      },
      {
        id: 'sc-init-4',
        title: 'Golden Horizon',
        headingOverlay: 'FINALE · CREATE FREE',
        narration: 'Zero API keys. Zero watermarks. Export crisp video straight from your browser.',
        duration: 5.0,
        visualSource: 'cinema',
        cinemaWorld: 'golden-horizon',
        accentColor: '#F59E0B',
        stockQuery: 'golden sunrise mountain ridge clouds',
        aiPrompt: 'Radiant golden sunrise over misty alpine ridges, volumetric sunbeams, film photography',
        particles: 'embers',
        cameraMotion: 'zoom-out',
        motionIntensity: 0.7,
        transition: 'dip-black',
        seed: 4096,
      },
    ],
  };
}
