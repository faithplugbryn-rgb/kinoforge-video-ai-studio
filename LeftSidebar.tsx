import React, { useEffect, useState } from 'react';
import {
  Captions,
  FileText,
  Loader2,
  Music,
  Palette,
  Play,
  Sparkles,
  Square,
  Volume2,
  Wand2,
} from 'lucide-react';
import {
  ACCENT_SWATCHES,
  CAPTION_STYLES,
  COLOR_GRADES,
  SOUNDTRACKS,
  STARTER_TEMPLATES,
  StarterTemplate,
} from '../data/presets';
import {
  GenerationStyle,
  GenerationVisualMode,
} from '../engine/scriptGenerator';
import {
  AspectRatio,
  CaptionPosition,
  Project,
  ProjectSettings,
  SoundtrackId,
} from '../types/studio';

type LeftTab = 'generate' | 'audio' | 'look';

interface LeftSidebarProps {
  project: Project;
  isGenerating: boolean;
  previewingTrack: SoundtrackId | null;
  onGenerateStoryboard: (params: {
    prompt: string;
    pastedScript: string;
    mode: 'prompt' | 'script';
    style: GenerationStyle;
    aspectRatio: AspectRatio;
    visualMode: GenerationVisualMode;
    sceneCount: number;
  }) => void;
  onUpdateSettings: (patch: Partial<ProjectSettings>) => void;
  onTogglePreviewSoundtrack: (track: SoundtrackId) => void;
  onTestVoice: () => void;
}

const STYLE_OPTIONS: { id: GenerationStyle; label: string }[] = [
  { id: 'cinematic', label: 'Cinematic Trailer' },
  { id: 'viral-short', label: 'Viral Short / Reel' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'product-launch', label: 'Product Launch' },
  { id: 'storytelling', label: 'Storytelling' },
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  project,
  isGenerating,
  previewingTrack,
  onGenerateStoryboard,
  onUpdateSettings,
  onTogglePreviewSoundtrack,
  onTestVoice,
}) => {
  const [tab, setTab] = useState<LeftTab>('generate');
  const [inputMode, setInputMode] = useState<'prompt' | 'script'>('prompt');
  const [prompt, setPrompt] = useState(project.prompt);
  const [pastedScript, setPastedScript] = useState(
    'Every great story begins in the dark.\nThen a single beam of light reveals a hidden world waiting to be explored.\nWith the right tools, anyone can direct cinema straight from their browser.\nPress play and bring your vision to life.'
  );
  const [genStyle, setGenStyle] = useState<GenerationStyle>('cinematic');
  const [visualMode, setVisualMode] = useState<GenerationVisualMode>('cinema');
  const [sceneCount, setSceneCount] = useState(5);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleRunGenerate = () => {
    onGenerateStoryboard({
      prompt,
      pastedScript,
      mode: inputMode,
      style: genStyle,
      aspectRatio: project.settings.aspectRatio,
      visualMode,
      sceneCount,
    });
  };

  const handleApplyTemplate = (tpl: StarterTemplate) => {
    setInputMode('prompt');
    setPrompt(tpl.prompt);
    setGenStyle(tpl.style);
    onGenerateStoryboard({
      prompt: tpl.prompt,
      pastedScript: '',
      mode: 'prompt',
      style: tpl.style,
      aspectRatio: tpl.aspectRatio,
      visualMode,
      sceneCount: 5,
    });
  };

  return (
    <aside className="w-[260px] xl:w-[300px] 2xl:w-[320px] shrink-0 border-r border-zinc-800/90 bg-[#111114] flex flex-col min-h-0">
      {/* Tabs */}
      <div className="grid grid-cols-3 border-b border-zinc-800/90 bg-[#0D0D10] p-1 gap-1 shrink-0">
        {(
          [
            { id: 'generate', label: 'AI Script', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'audio', label: 'Audio', icon: <Music className="w-3.5 h-3.5" /> },
            { id: 'look', label: 'Look', icon: <Palette className="w-3.5 h-3.5" /> },
          ] as const
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <span className={active ? 'text-orange-400' : 'text-zinc-500'}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {tab === 'generate' && (
          <>
            {/* Prompt vs Paste Script toggle */}
            <div className="grid grid-cols-2 bg-[#09090B] p-0.5 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setInputMode('prompt')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  inputMode === 'prompt'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5 text-orange-400" />
                Idea Prompt
              </button>
              <button
                type="button"
                onClick={() => setInputMode('script')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  inputMode === 'script'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Paste Script
              </button>
            </div>

            {inputMode === 'prompt' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Describe Your Video
                  </label>
                  <textarea
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A dramatic trailer about exploring bioluminescent oceans beneath Jupiter's icy moon..."
                    className="w-full rounded-lg bg-[#09090B] border border-zinc-800 focus:border-orange-500/70 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Directing Style
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setGenStyle(opt.id)}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border text-left transition-colors cursor-pointer ${
                          genStyle === opt.id
                            ? 'bg-orange-500/15 border-orange-500/60 text-orange-200'
                            : 'bg-[#09090B] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Scenes
                    </label>
                    <span className="text-xs font-mono-tabular text-orange-400">
                      {sceneCount} scenes
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={6}
                    step={1}
                    value={sceneCount}
                    onChange={(e) => setSceneCount(Number(e.target.value))}
                    className="w-full studio-slider"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Paste Your Full Script
                </label>
                <textarea
                  rows={6}
                  value={pastedScript}
                  onChange={(e) => setPastedScript(e.target.value)}
                  placeholder="Paste one line or paragraph per scene. KinoForge automatically splits timing, matches visuals, adds camera motion & captions."
                  className="w-full rounded-lg bg-[#09090B] border border-zinc-800 focus:border-cyan-500/70 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none resize-none leading-relaxed"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Each line or short paragraph becomes an auto-timed, animated scene.
                </p>
              </div>
            )}

            {/* Visual Engine Mode */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Free Visual Engine
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'cinema', label: 'Motion Art', desc: '60fps instant' },
                    { id: 'stock', label: 'Real Photos', desc: 'Free stock' },
                    { id: 'hybrid', label: 'Hybrid Mix', desc: 'Both styles' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setVisualMode(m.id)}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      visualMode === m.id
                        ? 'bg-zinc-800 border-orange-500/60 text-zinc-100'
                        : 'bg-[#09090B] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-[11px] font-semibold leading-tight">{m.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleRunGenerate}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 font-semibold text-xs shadow-sm shadow-orange-500/20 transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Directing Storyboard…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {inputMode === 'prompt' ? 'Generate Storyboard' : 'Convert Script to Video'}
                  </span>
                </>
              )}
            </button>

            {/* Quick Templates */}
            <div className="pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  1-Click Starter Templates
                </span>
                <span className="text-[10px] text-zinc-500">100% Free</span>
              </div>
              <div className="space-y-1.5">
                {STARTER_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => handleApplyTemplate(tpl)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#09090B] hover:bg-zinc-800/80 border border-zinc-800/90 hover:border-zinc-700 text-left transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                        {tpl.label}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {tpl.prompt}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono-tabular text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/70">
                      {tpl.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'audio' && (
          <>
            {/* Procedural Synthesized Soundtracks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Royalty-Free Soundtrack
                </label>
                <span className="text-[10px] text-emerald-400 font-medium">Baked into Export</span>
              </div>
              <div className="space-y-1.5">
                {SOUNDTRACKS.map((track) => {
                  const selected = project.settings.soundtrack === track.id;
                  const isPrev = previewingTrack === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => onUpdateSettings({ soundtrack: track.id })}
                      className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-orange-500/12 border-orange-500/60'
                          : 'bg-[#09090B] border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-zinc-100">{track.label}</div>
                        <div className="text-[10px] text-zinc-500">
                          {track.mood} · <span className="font-mono-tabular">{track.bpm}</span>
                        </div>
                      </div>
                      {track.id !== 'none' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePreviewSoundtrack(track.id);
                          }}
                          title={isPrev ? 'Stop preview' : 'Preview track'}
                          className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                            isPrev
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                              : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {isPrev ? (
                            <Square className="w-3 h-3 fill-current" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 space-y-2.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Music Volume</span>
                    <span className="font-mono-tabular text-zinc-300">
                      {Math.round(project.settings.musicVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={project.settings.musicVolume}
                    onChange={(e) => onUpdateSettings({ musicVolume: Number(e.target.value) })}
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Voiceover Volume</span>
                    <span className="font-mono-tabular text-zinc-300">
                      {Math.round(project.settings.voiceVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={project.settings.voiceVolume}
                    onChange={(e) => onUpdateSettings({ voiceVolume: Number(e.target.value) })}
                    className="w-full studio-slider"
                  />
                </div>

                <label className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#09090B] border border-zinc-800 cursor-pointer">
                  <span className="text-xs text-zinc-300">Scene Transition Whoosh SFX</span>
                  <input
                    type="checkbox"
                    checked={project.settings.transitionSfx}
                    onChange={(e) => onUpdateSettings({ transitionSfx: e.target.checked })}
                    className="accent-orange-500 w-3.5 h-3.5"
                  />
                </label>
              </div>
            </div>

            {/* Browser SpeechSynthesis Live Voiceover */}
            <div className="pt-3 border-t border-zinc-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Live AI Narration (TTS)
                </label>
                <input
                  type="checkbox"
                  checked={project.settings.ttsEnabled}
                  onChange={(e) => onUpdateSettings({ ttsEnabled: e.target.checked })}
                  className="accent-orange-500 w-3.5 h-3.5 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">System Voice</label>
                <select
                  value={project.settings.ttsVoiceURI}
                  onChange={(e) => onUpdateSettings({ ttsVoiceURI: e.target.value })}
                  className="w-full bg-[#09090B] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-orange-500/60"
                >
                  <option value="">Auto Default Voice</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Speed</span>
                    <span className="font-mono-tabular text-zinc-300">
                      {project.settings.ttsRate.toFixed(2)}×
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.75}
                    max={1.35}
                    step={0.05}
                    value={project.settings.ttsRate}
                    onChange={(e) => onUpdateSettings({ ttsRate: Number(e.target.value) })}
                    className="w-full studio-slider"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Pitch</span>
                    <span className="font-mono-tabular text-zinc-300">
                      {project.settings.ttsPitch.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.75}
                    max={1.25}
                    step={0.05}
                    value={project.settings.ttsPitch}
                    onChange={(e) => onUpdateSettings({ ttsPitch: Number(e.target.value) })}
                    className="w-full studio-slider"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={onTestVoice}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-zinc-700/70 transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test Current Scene Voice</span>
              </button>

              <p className="text-[10px] leading-relaxed text-zinc-500 bg-[#09090B] border border-zinc-800/80 rounded-lg p-2">
                Tip: Live TTS reads scripts aloud during preview. To bake spoken voice directly into
                exported video files, record or upload a voice clip on any scene in the right panel.
              </p>
            </div>
          </>
        )}

        {tab === 'look' && (
          <>
            {/* Caption Style Presets */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <Captions className="w-3.5 h-3.5 text-orange-400" />
                <span>Kinetic Captions</span>
              </div>
              <div className="space-y-1.5">
                {CAPTION_STYLES.map((c) => {
                  const active = project.settings.captionStyle === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onUpdateSettings({ captionStyle: c.id })}
                      className={`w-full px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-orange-500/12 border-orange-500/60'
                          : 'bg-[#09090B] border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-xs font-medium text-zinc-100">{c.label}</div>
                      <div className="text-[10px] text-zinc-500">{c.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {(['top', 'center', 'bottom'] as CaptionPosition[]).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => onUpdateSettings({ captionPosition: pos })}
                    className={`py-1.5 rounded-md text-[11px] font-medium capitalize border transition-colors cursor-pointer ${
                      project.settings.captionPosition === pos
                        ? 'bg-zinc-800 border-orange-500/60 text-zinc-100'
                        : 'bg-[#09090B] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Caption Size</span>
                  <span className="font-mono-tabular text-zinc-300">
                    {Math.round(project.settings.captionScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.75}
                  max={1.35}
                  step={0.05}
                  value={project.settings.captionScale}
                  onChange={(e) => onUpdateSettings({ captionScale: Number(e.target.value) })}
                  className="w-full studio-slider"
                />
              </div>

              <div>
                <span className="block text-[11px] text-zinc-400 mb-1.5">Highlight Accent</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ACCENT_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => onUpdateSettings({ captionAccent: hex })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        project.settings.captionAccent === hex
                          ? 'border-white scale-110'
                          : 'border-zinc-800 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Color Grade LUTs */}
            <div className="pt-3 border-t border-zinc-800/80 space-y-2.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Cinema Color Grade
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {COLOR_GRADES.map((g) => {
                  const active = project.settings.colorGrade === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onUpdateSettings({ colorGrade: g.id })}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-zinc-800 border-orange-500/60 text-zinc-100'
                          : 'bg-[#09090B] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-white/15"
                        style={{ background: g.preview }}
                      />
                      <span className="text-[11px] font-medium truncate">{g.label}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">35mm Film Grain</span>
                  <span className="font-mono-tabular text-zinc-300">
                    {Math.round(project.settings.filmGrain * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={project.settings.filmGrain}
                  onChange={(e) => onUpdateSettings({ filmGrain: Number(e.target.value) })}
                  className="w-full studio-slider"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-400">Lens Vignette</span>
                  <span className="font-mono-tabular text-zinc-300">
                    {Math.round(project.settings.vignette * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={project.settings.vignette}
                  onChange={(e) => onUpdateSettings({ vignette: Number(e.target.value) })}
                  className="w-full studio-slider"
                />
              </div>

              <label className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-[#09090B] border border-zinc-800 cursor-pointer">
                <span className="text-xs text-zinc-300">2.39:1 Cinema Letterbox</span>
                <input
                  type="checkbox"
                  checked={project.settings.letterbox}
                  onChange={(e) => onUpdateSettings({ letterbox: e.target.checked })}
                  className="accent-orange-500 w-3.5 h-3.5"
                />
              </label>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
