import {
  AspectRatio,
  CameraMotion,
  CinemaWorld,
  ColorGrade,
  ParticleEffect,
  Project,
  Scene,
  SoundtrackId,
  TransitionType,
} from '../types/studio';
import { searchWikimediaPhotos } from './mediaSearch';

export type GenerationStyle =
  | 'cinematic'
  | 'viral-short'
  | 'documentary'
  | 'product-launch'
  | 'storytelling';

export type GenerationVisualMode = 'cinema' | 'stock' | 'hybrid';

interface ThemeProfile {
  worlds: CinemaWorld[];
  particles: ParticleEffect[];
  accent: string;
  grade: ColorGrade;
  soundtrack: SoundtrackId;
  stockBoost: string;
}

const THEME_RULES: { keywords: RegExp; profile: ThemeProfile }[] = [
  {
    keywords: /\b(cyber|neon|tokyo|future|robot|ai|hack|android|city|metropolis|tech|code|digital|neural|app|startup)\b/i,
    profile: {
      worlds: ['neon-cyber', 'data-matrix', 'synthwave-grid', 'studio-editorial'],
      particles: ['rain', 'bokeh', 'dust', 'embers'],
      accent: '#22D3EE',
      grade: 'cyber-neon',
      soundtrack: 'neon-cyberwave',
      stockBoost: 'neon city night futuristic',
    },
  },
  {
    keywords: /\b(space|mars|planet|star|galaxy|cosmos|universe|nasa|orbit|astronaut|moon|alien|black hole|nebula)\b/i,
    profile: {
      worlds: ['deep-cosmos', 'aurora-arctic', 'desert-eclipse', 'data-matrix'],
      particles: ['stars', 'dust', 'bokeh', 'stars'],
      accent: '#38BDF8',
      grade: 'teal-orange',
      soundtrack: 'deep-space',
      stockBoost: 'galaxy nebula space cosmos',
    },
  },
  {
    keywords: /\b(ocean|sea|water|whale|deep|marine|island|beach|wave|coral|shark|underwater|ship)\b/i,
    profile: {
      worlds: ['ocean-moonlight', 'storm-horizon', 'aurora-arctic', 'golden-horizon'],
      particles: ['dust', 'rain', 'bokeh', 'stars'],
      accent: '#38BDF8',
      grade: 'teal-orange',
      soundtrack: 'cinematic-horizon',
      stockBoost: 'ocean waves sea coast',
    },
  },
  {
    keywords: /\b(forest|nature|tree|mountain|wild|earth|jungle|hike|travel|adventure|sunrise|dawn|valley)\b/i,
    profile: {
      worlds: ['golden-horizon', 'mystic-forest', 'aurora-arctic', 'ocean-moonlight'],
      particles: ['fireflies', 'dust', 'bokeh', 'snow'],
      accent: '#F59E0B',
      grade: 'golden-film',
      soundtrack: 'lofi-story',
      stockBoost: 'mountain forest landscape nature',
    },
  },
  {
    keywords: /\b(desert|egypt|pyramid|dune|sun|sahara|ancient|history|empire|sand|fire|volcano|dragon|battle|war)\b/i,
    profile: {
      worlds: ['desert-eclipse', 'crimson-volcano', 'golden-horizon', 'storm-horizon'],
      particles: ['embers', 'dust', 'embers', 'dust'],
      accent: '#F97316',
      grade: 'warm-kodak',
      soundtrack: 'cinematic-horizon',
      stockBoost: 'desert dunes ancient sunset',
    },
  },
  {
    keywords: /\b(arctic|ice|snow|winter|northern|aurora|nordic|iceland|glacier|cold|polar)\b/i,
    profile: {
      worlds: ['aurora-arctic', 'ocean-moonlight', 'storm-horizon', 'golden-horizon'],
      particles: ['snow', 'stars', 'snow', 'dust'],
      accent: '#34D399',
      grade: 'teal-orange',
      soundtrack: 'deep-space',
      stockBoost: 'aurora borealis winter glacier snow',
    },
  },
  {
    keywords: /\b(mystery|noir|horror|dark|storm|thriller|secret|shadow|crime|detective|ghost|midnight)\b/i,
    profile: {
      worlds: ['storm-horizon', 'neon-cyber', 'mystic-forest', 'crimson-volcano'],
      particles: ['rain', 'dust', 'embers', 'rain'],
      accent: '#EF4444',
      grade: 'noir',
      soundtrack: 'deep-space',
      stockBoost: 'storm night silhouette dramatic fog',
    },
  },
  {
    keywords: /\b(retro|80s|synth|music|arcade|vapor|game|gaming|race|car|speed)\b/i,
    profile: {
      worlds: ['synthwave-grid', 'neon-cyber', 'crimson-volcano', 'deep-cosmos'],
      particles: ['stars', 'embers', 'bokeh', 'rain'],
      accent: '#F43F5E',
      grade: 'cyber-neon',
      soundtrack: 'neon-cyberwave',
      stockBoost: 'retro neon car night highway',
    },
  },
];

const DEFAULT_PROFILE: ThemeProfile = {
  worlds: ['studio-editorial', 'golden-horizon', 'data-matrix', 'deep-cosmos'],
  particles: ['dust', 'bokeh', 'stars', 'embers'],
  accent: '#F97316',
  grade: 'teal-orange',
  soundtrack: 'cinematic-horizon',
  stockBoost: 'cinematic landscape dramatic lighting',
};

function detectTheme(text: string): ThemeProfile {
  for (const rule of THEME_RULES) {
    if (rule.keywords.test(text)) return rule.profile;
  }
  return DEFAULT_PROFILE;
}

function extractTopicPhrase(prompt: string): string {
  const cleaned = prompt
    .replace(/^(create|make|build|generate|write)\s+(a|an|me\s+a|me\s+an)?\s*/i, '')
    .replace(/\b(video|short|reel|tiktok|youtube|trailer|commercial|promo|about|for|on)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length >= 4) {
    return cleaned.slice(0, 68);
  }
  return prompt.trim().slice(0, 68) || 'the future of visual storytelling';
}

function extractKeywords(text: string): string {
  const stop = new Set([
    'the', 'and', 'for', 'that', 'with', 'this', 'from', 'into', 'your', 'about',
    'they', 'have', 'will', 'what', 'when', 'where', 'which', 'their', 'there',
    'been', 'being', 'more', 'most', 'only', 'just', 'like', 'over', 'every',
    'make', 'video', 'short', 'story', 'scene', 'build', 'create', 'around',
  ]);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w));
  const unique = Array.from(new Set(words));
  return unique.slice(0, 4).join(' ') || 'cinematic nature light';
}

export function estimateSceneDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const sec = Math.round((words / 2.35 + 1.2) * 2) / 2;
  return Math.max(3, Math.min(10, sec));
}

function uid(): string {
  return `sc-${Math.random().toString(36).slice(2, 9)}`;
}

const CAMERAS: CameraMotion[] = ['zoom-in', 'pan-right', 'drift-up', 'zoom-out', 'pan-left', 'orbit'];
const TRANSITIONS: TransitionType[] = ['crossfade', 'zoom-dissolve', 'wipe', 'dip-black', 'slide-left'];

interface BeatDraft {
  title: string;
  heading: string;
  narration: string;
  stockHint: string;
  aiPrompt: string;
}

function buildStoryBeats(topic: string, style: GenerationStyle, sceneCount: number): BeatDraft[] {
  const capTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
  const kw = extractKeywords(topic);

  const templates: Record<GenerationStyle, BeatDraft[]> = {
    cinematic: [
      {
        title: 'Opening Hook',
        heading: 'CHAPTER 01 · PROLOGUE',
        narration: `Before everything changed, few imagined what lay hidden behind ${topic}.`,
        stockHint: `${kw} wide landscape dramatic`,
        aiPrompt: `Wide establishing cinematic film still of ${topic}, atmospheric volumetric lighting, 35mm anamorphic`,
      },
      {
        title: 'The Discovery',
        heading: 'CHAPTER 02 · FIRST LIGHT',
        narration: `At first it looked ordinary—until a subtle signal revealed a world far larger than anyone expected.`,
        stockHint: `${kw} glow horizon silhouette`,
        aiPrompt: `Mysterious close-up cinematic shot exploring ${topic}, dramatic rim light, shallow depth of field`,
      },
      {
        title: 'Rising Tension',
        heading: 'CHAPTER 03 · BEYOND THE EDGE',
        narration: `Every step deeper into ${topic} reshaped the rules we thought were permanent.`,
        stockHint: `${kw} storm dramatic sky`,
        aiPrompt: `High-contrast dramatic scene of ${topic} in motion, intense atmosphere, IMAX cinema frame`,
      },
      {
        title: 'The Turning Point',
        heading: 'CHAPTER 04 · AWAKENING',
        narration: `In a single defining moment, silence gave way to brilliance across the entire horizon.`,
        stockHint: `${kw} sunrise rays light`,
        aiPrompt: `Breathtaking climax scene of ${topic}, glowing golden light rays breaking through darkness`,
      },
      {
        title: 'The New Era',
        heading: 'CHAPTER 05 · HORIZON',
        narration: `Nothing stays untouched once you witness ${topic} with your own eyes.`,
        stockHint: `${kw} panoramic vista night`,
        aiPrompt: `Sweeping aerial panorama of ${topic}, majestic scale, ultra detailed cinema color grade`,
      },
      {
        title: 'Final Echo',
        heading: 'FINALE',
        narration: `The journey is only beginning. Welcome to the next chapter.`,
        stockHint: `${kw} sunset twilight reflection`,
        aiPrompt: `Poetic closing film frame inspired by ${topic}, serene glowing dusk horizon`,
      },
    ],

    'viral-short': [
      {
        title: 'Scroll-Stopper Hook',
        heading: 'WAIT FOR THIS',
        narration: `Stop scrolling—almost nobody knows the real truth about ${topic}.`,
        stockHint: `${kw} dramatic close up`,
        aiPrompt: `Eye-catching hyper-vivid vertical cinematic shot of ${topic}, neon rim lighting`,
      },
      {
        title: 'Fact #1',
        heading: 'FACT 01',
        narration: `First, what you normally see is less than ten percent of what is actually happening.`,
        stockHint: `${kw} detail macro`,
        aiPrompt: `Dynamic high-contrast visual explaining ${topic}, crisp focal subject, dramatic shadows`,
      },
      {
        title: 'Fact #2',
        heading: 'FACT 02',
        narration: `Even crazier, small hidden forces around ${topic} trigger massive chain reactions every second.`,
        stockHint: `${kw} aerial energy`,
        aiPrompt: `Kinetic cinematic frame showing energy and motion in ${topic}, glowing particles`,
      },
      {
        title: 'The Plot Twist',
        heading: 'THE TWIST',
        narration: `And here is the twist that surprises even experts studying ${topic} today.`,
        stockHint: `${kw} night glow`,
        aiPrompt: `Surprising dramatic reveal of ${topic}, volumetric light beam, bold contrast`,
      },
      {
        title: 'Takeaway & CTA',
        heading: 'YOUR TURN',
        narration: `Now you will never look at ${topic} the same way again. Save this for later.`,
        stockHint: `${kw} horizon bright`,
        aiPrompt: `Clean inspiring closing frame for ${topic}, luminous horizon, crisp modern aesthetic`,
      },
    ],

    documentary: [
      {
        title: 'Establishing Shot',
        heading: 'FIELD REPORT',
        narration: `Across quiet frontiers of our world, ${topic} tells a story millions of years in the making.`,
        stockHint: `${kw} landscape documentary`,
        aiPrompt: `National Geographic style documentary photograph of ${topic}, natural golden light`,
      },
      {
        title: 'Closer Look',
        heading: 'OBSERVATION',
        narration: `Look closely and intricate patterns emerge—each layer shaped by time, pressure, and motion.`,
        stockHint: `${kw} texture nature close`,
        aiPrompt: `Intimate documentary telephoto shot of ${topic}, crisp natural detail, soft bokeh`,
      },
      {
        title: 'Human Perspective',
        heading: 'INSIGHT',
        narration: `Researchers exploring ${topic} have uncovered clues that bridge ancient past and modern science.`,
        stockHint: `${kw} exploration sky`,
        aiPrompt: `Editorial documentary frame highlighting scale and wonder of ${topic}, authentic color`,
      },
      {
        title: 'The Bigger Picture',
        heading: 'PERSPECTIVE',
        narration: `Seen from above, everything connects in a delicate balance that sustains life around us.`,
        stockHint: `${kw} aerial earth vista`,
        aiPrompt: `High-altitude documentary aerial view of ${topic}, mist and sunlight`,
      },
      {
        title: 'Closing Reflection',
        heading: 'EPILOGUE',
        narration: `The more we learn about ${topic}, the clearer it becomes how much wonder still awaits.`,
        stockHint: `${kw} twilight calm`,
        aiPrompt: `Serene dusk documentary closing shot of ${topic}, timeless atmosphere`,
      },
    ],

    'product-launch': [
      {
        title: 'The Problem',
        heading: 'THE OLD WAY',
        narration: `Great ideas shouldn't stay trapped behind slow, complicated workflows.`,
        stockHint: `${kw} minimal architecture dark`,
        aiPrompt: `Minimalist moody dark studio visual symbolizing friction before ${topic}, crisp rim light`,
      },
      {
        title: 'The Reveal',
        heading: 'INTRODUCING',
        narration: `Meet ${capTopic}—rebuilt from the ground up for speed, clarity, and creative flow.`,
        stockHint: `${kw} modern design light`,
        aiPrompt: `Sleek flagship Apple-keynote style reveal for ${topic}, glowing architectural glass light`,
      },
      {
        title: 'Core Superpower',
        heading: 'CRAFTED FOR SPEED',
        narration: `Turn rough sparks into polished results in seconds, right from your browser with zero friction.`,
        stockHint: `${kw} technology clean`,
        aiPrompt: `Futuristic clean kinetic light trails representing effortless flow of ${topic}`,
      },
      {
        title: 'Built For Creators',
        heading: 'ZERO LIMITS',
        narration: `Every detail responds instantly—so you spend less time configuring and more time creating.`,
        stockHint: `${kw} studio creative`,
        aiPrompt: `Warm editorial creative studio atmosphere inspired by ${topic}, soft lens flare`,
      },
      {
        title: 'Launch CTA',
        heading: 'START FREE TODAY',
        narration: `${capTopic} is ready now. Step in and build something unforgettable.`,
        stockHint: `${kw} sunrise minimal`,
        aiPrompt: `Bold minimalist keynote finale backdrop for ${topic}, radiant luminous gradient`,
      },
    ],

    storytelling: [
      {
        title: 'Once Upon A Time',
        heading: 'ACT I',
        narration: `Under a quiet sky, a single spark set our story of ${topic} into motion.`,
        stockHint: `${kw} twilight stars`,
        aiPrompt: `Storybook cinematic opening scene about ${topic}, warm atmospheric glow`,
      },
      {
        title: 'The Call',
        heading: 'ACT II',
        narration: `Far beyond the familiar road, a distant glow promised answers no map could show.`,
        stockHint: `${kw} path forest light`,
        aiPrompt: `Evocative journey frame about ${topic}, glowing distant light in mist`,
      },
      {
        title: 'The Trial',
        heading: 'ACT III',
        narration: `Shadows lengthened and winds rose—testing whether courage could outlast doubt.`,
        stockHint: `${kw} storm silhouette`,
        aiPrompt: `Dramatic narrative tension scene of ${topic}, rich chiaroscuro lighting`,
      },
      {
        title: 'The Breakthrough',
        heading: 'ACT IV',
        narration: `Then the clouds parted, revealing the luminous heart of ${topic} shining just ahead.`,
        stockHint: `${kw} dawn golden glow`,
        aiPrompt: `Triumphant luminous visual breakthrough of ${topic}, warm volumetric light`,
      },
      {
        title: 'Homecoming',
        heading: 'THE END',
        narration: `Some stories fade by morning—others stay lit inside us forever.`,
        stockHint: `${kw} calm moonlit reflection`,
        aiPrompt: `Peaceful poetic finale frame about ${topic}, shimmering night reflection`,
      },
    ],
  };

  const base = templates[style];
  return base.slice(0, Math.max(3, Math.min(base.length, sceneCount)));
}

/**
 * Generates a complete Project storyboard from a prompt OR a pasted full script.
 * If visualMode is 'stock' or 'hybrid', automatically fetches real free Wikimedia Commons photos!
 */
export async function generateStoryboard(options: {
  prompt: string;
  pastedScript?: string;
  mode: 'prompt' | 'script';
  style: GenerationStyle;
  aspectRatio: AspectRatio;
  visualMode: GenerationVisualMode;
  sceneCount: number;
  baseSettings: Project['settings'];
}): Promise<Project> {
  const rawInput =
    options.mode === 'script' && options.pastedScript?.trim()
      ? options.pastedScript.trim()
      : options.prompt.trim() || 'A cinematic journey through neon cities and deep space';

  const theme = detectTheme(rawInput);
  const topic = extractTopicPhrase(
    options.prompt.trim() || rawInput.split(/[.!?\n]/)[0] || 'Cinematic Story'
  );

  let drafts: BeatDraft[];

  if (options.mode === 'script' && options.pastedScript?.trim()) {
    // Split pasted script cleanly by paragraphs or sentences into well-paced scenes
    const rawBlocks = options.pastedScript
      .trim()
      .split(/\n+/)
      .flatMap((para) => {
        const trimmed = para.trim();
        if (!trimmed) return [];
        if (trimmed.split(/\s+/).length <= 22) return [trimmed];
        // Split longer paragraphs into crisp sentence chunks
        const sentences = trimmed.match(/[^.!?]+[.!?]*/g) ?? [trimmed];
        const merged: string[] = [];
        let buf = '';
        for (const s of sentences) {
          const next = (buf ? `${buf} ${s.trim()}` : s.trim()).trim();
          if (buf && next.split(/\s+/).length > 20) {
            merged.push(buf);
            buf = s.trim();
          } else {
            buf = next;
          }
        }
        if (buf) merged.push(buf);
        return merged;
      })
      .slice(0, 12);

    drafts = rawBlocks.map((line, i) => {
      const kw = extractKeywords(line);
      return {
        title: `Scene ${i + 1}`,
        heading: i === 0 ? 'INTRO' : '',
        narration: line,
        stockHint: `${kw} ${theme.stockBoost.split(' ')[0]}`,
        aiPrompt: `Cinematic film still visualizing: ${line}`,
      };
    });
  } else {
    drafts = buildStoryBeats(topic, options.style, options.sceneCount);
  }

  const baseSeed = Math.floor(Math.random() * 9000) + 1000;

  const scenes: Scene[] = drafts.map((beat, idx) => {
    const localTheme = detectTheme(`${beat.narration} ${beat.stockHint}`);
    const chosenTheme = localTheme !== DEFAULT_PROFILE ? localTheme : theme;
    const world = chosenTheme.worlds[idx % chosenTheme.worlds.length];
    const particle = chosenTheme.particles[idx % chosenTheme.particles.length];
    const useStock =
      options.visualMode === 'stock' || (options.visualMode === 'hybrid' && idx % 2 === 1);

    return {
      id: uid(),
      title: beat.title,
      narration: beat.narration,
      headingOverlay: beat.heading,
      duration: estimateSceneDuration(beat.narration),
      visualSource: useStock ? 'stock' : 'cinema',
      cinemaWorld: world,
      accentColor: chosenTheme.accent,
      stockQuery: beat.stockHint,
      aiPrompt: beat.aiPrompt,
      particles: particle,
      cameraMotion: CAMERAS[idx % CAMERAS.length],
      motionIntensity: 0.72,
      transition: idx === 0 ? 'cut' : TRANSITIONS[(idx - 1) % TRANSITIONS.length],
      seed: baseSeed + idx * 137,
    };
  });

  // If stock or hybrid mode requested, automatically populate real CORS-safe Wikimedia photos!
  if (options.visualMode === 'stock' || options.visualMode === 'hybrid') {
    await Promise.all(
      scenes.map(async (scene, idx) => {
        if (scene.visualSource !== 'stock') return;
        try {
          const photos = await searchWikimediaPhotos(scene.stockQuery, 4);
          const pick = photos[idx % Math.max(1, photos.length)] ?? photos[0];
          if (pick) {
            scene.mediaUrl = pick.fullUrl;
            scene.mediaCredit = pick.credit;
          } else {
            scene.visualSource = 'cinema';
          }
        } catch {
          // Graceful fallback to procedural cinema world if offline
          scene.visualSource = 'cinema';
        }
      })
    );
  }

  const captionStyle =
    options.aspectRatio === '9:16' || options.style === 'viral-short'
      ? 'pop-highlight'
      : options.style === 'documentary'
      ? 'cinematic'
      : options.baseSettings.captionStyle;

  const projectTitle =
    topic
      .split(/\s+/)
      .slice(0, 5)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') || 'Untitled Video';

  return {
    id: `proj-${Date.now()}`,
    title: projectTitle,
    prompt: rawInput,
    updatedAt: Date.now(),
    settings: {
      ...options.baseSettings,
      aspectRatio: options.aspectRatio,
      captionStyle,
      captionAccent: theme.accent,
      colorGrade: theme.grade,
      soundtrack: theme.soundtrack,
      letterbox: options.aspectRatio === '16:9' && options.style === 'cinematic',
    },
    scenes,
  };
}
