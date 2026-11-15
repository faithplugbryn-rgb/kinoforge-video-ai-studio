import { Project, SoundtrackId } from './studio';

interface TrackSpec {
  bpm: number;
  rootMidi: number;
  chords: number[][]; // semitone offsets from root
  arpPattern: number[];
  padWave: OscillatorType;
  leadWave: OscillatorType;
  filterHz: number;
  bassLevel: number;
  pulseLevel: number;
}

const TRACK_SPECS: Record<Exclude<SoundtrackId, 'none'>, TrackSpec> = {
  'cinematic-horizon': {
    bpm: 72,
    rootMidi: 48, // C3
    chords: [
      [0, 7, 12, 16, 19], // Cmaj
      [-3, 4, 9, 12, 16], // Am
      [-7, 0, 5, 9, 12],  // Fmaj
      [-5, 2, 7, 11, 14], // Gmaj
    ],
    arpPattern: [0, 2, 3, 4, 3, 2, 1, 2],
    padWave: 'sawtooth',
    leadWave: 'triangle',
    filterHz: 780,
    bassLevel: 0.24,
    pulseLevel: 0.14,
  },
  'neon-cyberwave': {
    bpm: 108,
    rootMidi: 45, // A2
    chords: [
      [0, 7, 12, 15, 19], // Am
      [-4, 3, 8, 12, 15], // Fmaj
      [-2, 5, 10, 14, 17], // G
      [-5, 2, 7, 11, 14], // Em
    ],
    arpPattern: [0, 1, 2, 3, 4, 3, 2, 1],
    padWave: 'sawtooth',
    leadWave: 'square',
    filterHz: 1150,
    bassLevel: 0.28,
    pulseLevel: 0.16,
  },
  'lofi-story': {
    bpm: 80,
    rootMidi: 50, // D3
    chords: [
      [0, 3, 7, 10, 14], // Dm9
      [-5, 0, 4, 7, 11], // G13
      [-2, 2, 5, 9, 12], // Cmaj9
      [-7, -3, 0, 4, 7], // Am7
    ],
    arpPattern: [0, 2, 4, 2, 1, 3, 2, 4],
    padWave: 'triangle',
    leadWave: 'sine',
    filterHz: 680,
    bassLevel: 0.2,
    pulseLevel: 0.12,
  },
  'deep-space': {
    bpm: 60,
    rootMidi: 43, // G2
    chords: [
      [0, 7, 14, 19, 26],
      [-2, 5, 12, 17, 24],
      [-5, 2, 9, 14, 21],
      [-4, 3, 10, 15, 22],
    ],
    arpPattern: [0, 3, 4, 2, 4, 1, 3, 2],
    padWave: 'sine',
    leadWave: 'sine',
    filterHz: 620,
    bassLevel: 0.22,
    pulseLevel: 0.1,
  },
  'upbeat-creator': {
    bpm: 116,
    rootMidi: 53, // F3
    chords: [
      [0, 4, 7, 12, 16], // F
      [2, 5, 9, 14, 17], // Gm
      [-5, 0, 4, 7, 12], // C
      [-3, 0, 4, 9, 12], // Am
    ],
    arpPattern: [0, 2, 4, 3, 1, 4, 2, 3],
    padWave: 'triangle',
    leadWave: 'triangle',
    filterHz: 1450,
    bassLevel: 0.22,
    pulseLevel: 0.18,
  },
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Procedural Web Audio Studio Engine.
 * Drives live playback AND routes cleanly into MediaStreamAudioDestinationNode during export!
 */
export class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;

  private schedulerTimer: number | null = null;
  private activeNodes: AudioNode[] = [];
  private activeVoiceSources: AudioBufferSourceNode[] = [];
  private bufferCache = new Map<string, AudioBuffer>();

  private currentTrack: SoundtrackId = 'none';
  private isPlayingMusic = false;
  private nextStepTime = 0;
  private stepCount = 0;

  ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.voiceGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      // Gentle master compressor so mixes stay loud & never clip
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 18;
      comp.ratio.value = 4;

      this.musicGain.connect(comp);
      this.voiceGain.connect(comp);
      this.sfxGain.connect(comp);
      comp.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Connects the mixed audio output to a MediaStreamDestination for video export */
  attachExportStream(): MediaStream {
    const ctx = this.ensureContext();
    if (!this.streamDest) {
      this.streamDest = ctx.createMediaStreamDestination();
      this.masterGain?.connect(this.streamDest);

      // Inaudible -100dB keepalive signal prevents Chrome MediaRecorder from stalling on silent tracks
      const keepAlive = ctx.createOscillator();
      const tinyGain = ctx.createGain();
      keepAlive.frequency.value = 20;
      tinyGain.gain.value = 0.00001;
      keepAlive.connect(tinyGain);
      tinyGain.connect(this.streamDest);
      keepAlive.start();
      this.trackNode(keepAlive);
    }
    return this.streamDest.stream;
  }

  setVolumes(musicVol: number, voiceVol: number, muted: boolean) {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.voiceGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, now, 0.04);
    this.musicGain.gain.setTargetAtTime(Math.max(0, Math.min(1, musicVol)) * 0.55, now, 0.06);
    this.voiceGain.gain.setTargetAtTime(Math.max(0, Math.min(1, voiceVol)), now, 0.05);
    this.sfxGain.gain.setTargetAtTime(Math.max(0, Math.min(1, musicVol)) * 0.45, now, 0.05);
  }

  startSoundtrack(track: SoundtrackId, musicVol: number, voiceVol: number, muted = false) {
    this.stopSoundtrack();
    if (track === 'none') return;
    const ctx = this.ensureContext();
    this.setVolumes(musicVol, voiceVol, muted);
    this.currentTrack = track;
    this.isPlayingMusic = true;
    this.stepCount = 0;
    this.nextStepTime = ctx.currentTime + 0.05;

    const lookahead = () => {
      if (!this.isPlayingMusic || !this.ctx || this.currentTrack === 'none') return;
      const spec = TRACK_SPECS[this.currentTrack];
      const stepDur = 60 / spec.bpm / 2; // 8th-note steps

      while (this.nextStepTime < this.ctx.currentTime + 0.25) {
        this.scheduleStep(spec, this.stepCount, this.nextStepTime, stepDur);
        this.nextStepTime += stepDur;
        this.stepCount++;
      }
    };

    lookahead();
    this.schedulerTimer = window.setInterval(lookahead, 80);
  }

  private scheduleStep(spec: TrackSpec, step: number, time: number, stepDur: number) {
    if (!this.ctx || !this.musicGain) return;
    const bar = Math.floor(step / 8);
    const beatInBar = step % 8;
    const chord = spec.chords[bar % spec.chords.length];

    // Warm lush chord pad on every bar downbeat
    if (beatInBar === 0) {
      const padDur = stepDur * 8.2;
      chord.slice(0, 4).forEach((offset, idx) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = spec.padWave;
        osc.frequency.setValueAtTime(midiToFreq(spec.rootMidi + offset), time);
        osc.detune.setValueAtTime((idx - 1.5) * 6, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(spec.filterHz, time);
        filter.Q.setValueAtTime(0.8, time);

        const peak = 0.065 / Math.sqrt(chord.length);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(peak, time + padDur * 0.22);
        gain.gain.setValueAtTime(peak * 0.85, time + padDur * 0.72);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + padDur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + padDur + 0.05);
        this.trackNode(osc);
      });

      // Sub bass foundation
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(midiToFreq(spec.rootMidi + chord[0] - 12), time);
      bassGain.gain.setValueAtTime(0.0001, time);
      bassGain.gain.linearRampToValueAtTime(spec.bassLevel * 0.45, time + 0.12);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, time + padDur);
      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(time);
      bassOsc.stop(time + padDur + 0.05);
      this.trackNode(bassOsc);
    }

    // Gentle melodic arpeggio / pulse note
    const noteIdx = spec.arpPattern[beatInBar % spec.arpPattern.length] % chord.length;
    const arpMidi = spec.rootMidi + chord[noteIdx] + 12;
    const leadOsc = this.ctx.createOscillator();
    const leadFilter = this.ctx.createBiquadFilter();
    const leadGain = this.ctx.createGain();

    leadOsc.type = spec.leadWave;
    leadOsc.frequency.setValueAtTime(midiToFreq(arpMidi), time);

    leadFilter.type = 'lowpass';
    leadFilter.frequency.setValueAtTime(spec.filterHz * 2.1, time);
    leadFilter.frequency.exponentialRampToValueAtTime(spec.filterHz * 0.7, time + stepDur * 1.4);

    const accent = beatInBar % 2 === 0 ? 1 : 0.6;
    leadGain.gain.setValueAtTime(0.0001, time);
    leadGain.gain.linearRampToValueAtTime(spec.pulseLevel * 0.25 * accent, time + 0.015);
    leadGain.gain.exponentialRampToValueAtTime(0.0001, time + stepDur * 1.45);

    leadOsc.connect(leadFilter);
    leadFilter.connect(leadGain);
    leadGain.connect(this.musicGain);

    leadOsc.start(time);
    leadOsc.stop(time + stepDur * 1.55);
    this.trackNode(leadOsc);
  }

  /** Subtle cinematic filtered-noise whoosh for scene transitions */
  playTransitionWhoosh() {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = 0.42;
    const sampleCount = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / sampleCount) * Math.PI);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + dur * 0.45);
    filter.frequency.exponentialRampToValueAtTime(220, now + dur);
    filter.Q.value = 2.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + dur * 0.42);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
  }

  /** Loads and plays a scene's recorded/uploaded voiceover clip */
  async playVoiceClip(url: string, offsetSec = 0) {
    this.stopVoiceClips();
    const ctx = this.ensureContext();
    if (!this.voiceGain) return;

    let buffer = this.bufferCache.get(url);
    if (!buffer) {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      buffer = await ctx.decodeAudioData(arr);
      this.bufferCache.set(url, buffer);
    }

    if (offsetSec >= buffer.duration) return;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.voiceGain);
    src.start(ctx.currentTime, Math.max(0, offsetSec));
    this.activeVoiceSources.push(src);
  }

  /** Pre-decodes all recorded/uploaded scene voice clips before export */
  async preloadVoiceClips(project: Project): Promise<void> {
    const ctx = this.ensureContext();
    await Promise.all(
      project.scenes
        .filter((s) => Boolean(s.voiceAudioUrl))
        .map(async (s) => {
          const url = s.voiceAudioUrl!;
          if (this.bufferCache.has(url)) return;
          try {
            const res = await fetch(url);
            const arr = await res.arrayBuffer();
            const decoded = await ctx.decodeAudioData(arr);
            this.bufferCache.set(url, decoded);
          } catch {
            // ignore broken audio clip
          }
        })
    );
  }

  stopVoiceClips() {
    this.activeVoiceSources.forEach((src) => {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    });
    this.activeVoiceSources = [];
  }

  stopSoundtrack() {
    this.isPlayingMusic = false;
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.activeNodes.forEach((n) => {
      try {
        if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
          (n as OscillatorNode).stop();
        }
        n.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeNodes = [];
  }

  stopAll() {
    this.stopSoundtrack();
    this.stopVoiceClips();
  }

  private trackNode(node: AudioNode) {
    this.activeNodes.push(node);
    if (this.activeNodes.length > 90) {
      this.activeNodes.splice(0, 30);
    }
  }
}

/**
 * Clean wrapper around browser Web Speech API for zero-key narration preview.
 */
export function speakSceneNarration(
  text: string,
  voiceURI: string,
  rate: number,
  pitch: number,
  volume: number
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const clean = text.trim();
  if (!clean) return;

  const utt = new SpeechSynthesisUtterance(clean);
  utt.rate = Math.max(0.6, Math.min(1.6, rate));
  utt.pitch = Math.max(0.5, Math.min(1.5, pitch));
  utt.volume = Math.max(0, Math.min(1, volume));

  if (voiceURI) {
    const match = window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI);
    if (match) utt.voice = match;
  }
  window.speechSynthesis.speak(utt);
}

export function stopSpeechNarration() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}
