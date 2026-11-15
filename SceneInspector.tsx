import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Clock,
  Image as ImageIcon,
  Loader2,
  Mic,
  Search,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Video,
  Wand2,
  Wind,
} from 'lucide-react';
import {
  ACCENT_SWATCHES,
  CAMERA_MOTIONS,
  CINEMA_WORLDS,
  PARTICLE_EFFECTS,
  TRANSITION_TYPES,
} from '../data/presets';
import { generateFreeAIImage, searchWikimediaPhotos } from '../engine/mediaSearch';
import { estimateSceneDuration } from '../engine/scriptGenerator';
import {
  AspectRatio,
  Scene,
  StockPhotoResult,
  getCanvasDimensions,
} from '../types/studio';

interface SceneInspectorProps {
  scene: Scene | null;
  sceneIndex: number;
  aspectRatio: AspectRatio;
  onUpdateScene: (sceneId: string, patch: Partial<Scene>) => void;
}

type SourceTab = 'cinema' | 'stock' | 'ai-image' | 'upload';

export const SceneInspector: React.FC<SceneInspectorProps> = ({
  scene,
  sceneIndex,
  aspectRatio,
  onUpdateScene,
}) => {
  const [sourceTab, setSourceTab] = useState<SourceTab>('cinema');
  const [stockQuery, setStockQuery] = useState('');
  const [stockResults, setStockResults] = useState<StockPhotoResult[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Mic Voiceover recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [recError, setRecError] = useState<string | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const recTimerRef = useRef<number | null>(null);

  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!scene) return;
    setStockQuery(scene.stockQuery || scene.title);
    setAiError(null);
    setStockError(null);
    if (scene.visualSource === 'upload-image' || scene.visualSource === 'upload-video') {
      setSourceTab('upload');
    } else {
      setSourceTab(scene.visualSource);
    }
  }, [scene?.id]);

  useEffect(() => {
    return () => {
      if (recTimerRef.current) window.clearInterval(recTimerRef.current);
      if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
        mediaRecRef.current.stop();
      }
    };
  }, []);

  if (!scene) {
    return (
      <aside className="w-[260px] xl:w-[300px] 2xl:w-[325px] shrink-0 border-l border-zinc-800/90 bg-[#111114] p-4 flex items-center justify-center text-xs text-zinc-500">
        Select a scene on the timeline to inspect & edit.
      </aside>
    );
  }

  const patch = (p: Partial<Scene>) => onUpdateScene(scene.id, p);

  const handleSearchStock = async (q?: string) => {
    const query = (q ?? stockQuery).trim();
    if (!query) return;
    setStockLoading(true);
    setStockError(null);
    try {
      const results = await searchWikimediaPhotos(query, 9);
      setStockResults(results);
      patch({ stockQuery: query });
      if (!results.length) {
        setStockError('No photos found. Try broader keywords (e.g. "ocean night", "city neon").');
      }
    } catch (err) {
      setStockError(err instanceof Error ? err.message : 'Stock search failed.');
    } finally {
      setStockLoading(false);
    }
  };

  const handleGenerateAIArt = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const dims = getCanvasDimensions(aspectRatio, '720p');
      const result = await generateFreeAIImage(
        scene.aiPrompt || scene.narration || scene.title,
        dims.width,
        dims.height,
        Math.floor(Math.random() * 99999)
      );
      patch({
        visualSource: 'ai-image',
        mediaUrl: result.url,
        mediaCredit: 'AI Generated (Free Tier)',
      });
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Free AI image endpoint is busy. Use Motion Art or Free Stock Photos instantly!'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleMediaUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    patch({
      visualSource: isVideo ? 'upload-video' : 'upload-image',
      mediaUrl: url,
      mediaCredit: file.name,
    });
  };

  const handleAudioUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    patch({
      voiceAudioUrl: url,
      voiceAudioLabel: file.name,
    });
  };

  const toggleMicRecording = async () => {
    setRecError(null);
    if (isRecording) {
      if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
        mediaRecRef.current.stop();
      }
      if (recTimerRef.current) {
        window.clearInterval(recTimerRef.current);
        recTimerRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const mr = new MediaRecorder(stream);
      mediaRecRef.current = mr;

      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        patch({
          voiceAudioUrl: url,
          voiceAudioLabel: `Mic Recording (${recSeconds.toFixed(1)}s)`,
        });
      };

      setRecSeconds(0);
      mr.start();
      setIsRecording(true);
      const started = performance.now();
      recTimerRef.current = window.setInterval(() => {
        setRecSeconds((performance.now() - started) / 1000);
      }, 100);
    } catch {
      setRecError('Microphone unavailable or permission denied. You can upload an audio clip instead.');
    }
  };

  const recommendedDur = estimateSceneDuration(scene.narration);

  return (
    <aside className="w-[260px] xl:w-[300px] 2xl:w-[325px] shrink-0 border-l border-zinc-800/90 bg-[#111114] flex flex-col min-h-0">
      {/* Header */}
      <div className="h-10 shrink-0 px-3.5 border-b border-zinc-800/90 bg-[#0D0D10] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono-tabular text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">
            #{sceneIndex + 1}
          </span>
          <input
            type="text"
            value={scene.title}
            onChange={(e) => patch({ title: e.target.value })}
            aria-label="Scene title"
            className="bg-transparent text-xs font-semibold text-zinc-100 outline-none truncate w-full focus:text-white"
          />
        </div>
        <span className="font-mono-tabular text-[11px] text-zinc-400 shrink-0">
          {scene.duration.toFixed(1)}s
        </span>
      </div>

      {/* Scrollable Inspector Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* Narration & Captions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Script & Captions
            </label>
            <button
              type="button"
              onClick={() => patch({ duration: recommendedDur })}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
              title="Match scene duration to speaking length"
            >
              Auto-fit ({recommendedDur.toFixed(1)}s)
            </button>
          </div>
          <textarea
            rows={3}
            value={scene.narration}
            onChange={(e) => patch({ narration: e.target.value })}
            placeholder="Write the spoken script & on-screen captions for this scene..."
            className="w-full rounded-lg bg-[#09090B] border border-zinc-800 focus:border-orange-500/70 px-2.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none resize-none leading-relaxed"
          />
          <input
            type="text"
            value={scene.headingOverlay}
            onChange={(e) => patch({ headingOverlay: e.target.value })}
            placeholder="Optional corner badge (e.g. CHAPTER 01 · TOKYO)"
            className="w-full rounded-lg bg-[#09090B] border border-zinc-800 focus:border-zinc-700 px-2.5 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 outline-none"
          />
        </div>

        {/* Visual Source Switcher */}
        <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Visual Backdrop
          </label>
          <div className="grid grid-cols-4 bg-[#09090B] p-0.5 rounded-lg border border-zinc-800 gap-0.5">
            {(
              [
                { id: 'cinema', label: 'Motion', icon: <Sparkles className="w-3 h-3" /> },
                { id: 'stock', label: 'Stock', icon: <ImageIcon className="w-3 h-3" /> },
                { id: 'ai-image', label: 'AI Art', icon: <Wand2 className="w-3 h-3" /> },
                { id: 'upload', label: 'Upload', icon: <Upload className="w-3 h-3" /> },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSourceTab(t.id);
                  if (t.id === 'cinema') patch({ visualSource: 'cinema' });
                  if (t.id === 'stock' && stockResults.length === 0) {
                    handleSearchStock(scene.stockQuery || scene.title);
                  }
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-md text-[10px] font-medium gap-0.5 transition-colors cursor-pointer ${
                  sourceTab === t.id
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className={sourceTab === t.id ? 'text-orange-400' : 'text-zinc-500'}>
                  {t.icon}
                </span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab 1: Procedural Cinema Art */}
          {sourceTab === 'cinema' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5">
                {CINEMA_WORLDS.map((w) => {
                  const active = scene.visualSource === 'cinema' && scene.cinemaWorld === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() =>
                        patch({
                          visualSource: 'cinema',
                          cinemaWorld: w.id,
                        })
                      }
                      className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-zinc-800 border-orange-500/70 text-zinc-100'
                          : 'bg-[#09090B] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-md shrink-0 border border-white/10"
                        style={{
                          background: `linear-gradient(135deg, ${w.swatch[0]}, ${w.swatch[1]})`,
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium truncate">{w.label}</div>
                        <div className="text-[9px] text-zinc-500">{w.tag}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div>
                <span className="block text-[10px] text-zinc-500 mb-1">Scene Lighting Accent</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ACCENT_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => patch({ accentColor: hex })}
                      className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                        scene.accentColor === hex
                          ? 'border-white scale-110'
                          : 'border-zinc-800 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Free Stock Photography (Wikimedia Commons) */}
          {sourceTab === 'stock' && (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={stockQuery}
                  onChange={(e) => setStockQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchStock();
                  }}
                  placeholder="Search free stock photos..."
                  className="flex-1 min-w-0 bg-[#09090B] border border-zinc-800 focus:border-orange-500/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 outline-none"
                />
                <button
                  type="button"
                  disabled={stockLoading}
                  onClick={() => handleSearchStock()}
                  className="px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer"
                >
                  {stockLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {stockError && (
                <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg p-2">
                  {stockError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5">
                {stockResults.map((photo) => {
                  const picked = scene.visualSource === 'stock' && scene.mediaUrl === photo.fullUrl;
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() =>
                        patch({
                          visualSource: 'stock',
                          mediaUrl: photo.fullUrl,
                          mediaCredit: photo.credit,
                        })
                      }
                      className={`relative aspect-video rounded-md overflow-hidden border transition-all cursor-pointer group ${
                        picked
                          ? 'border-orange-500 ring-1 ring-orange-500'
                          : 'border-zinc-800 hover:border-zinc-600'
                      }`}
                      title={photo.title}
                    >
                      <img
                        src={photo.thumbUrl}
                        alt={photo.title}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                      {picked && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-zinc-500">
                Powered by Wikimedia Commons (100% free, zero API key, export-safe CORS).
              </p>
            </div>
          )}

          {/* Tab 3: Optional Free AI Image */}
          {sourceTab === 'ai-image' && (
            <div className="space-y-2">
              <textarea
                rows={3}
                value={scene.aiPrompt}
                onChange={(e) => patch({ aiPrompt: e.target.value })}
                placeholder="Describe a cinematic still frame to generate..."
                className="w-full rounded-lg bg-[#09090B] border border-zinc-800 focus:border-orange-500/70 px-2.5 py-2 text-xs text-zinc-100 outline-none resize-none"
              />
              <button
                type="button"
                disabled={aiLoading}
                onClick={handleGenerateAIArt}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                    <span>Generating AI Still…</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 text-orange-400" />
                    <span>Generate Free AI Frame</span>
                  </>
                )}
              </button>
              {aiError && (
                <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 leading-relaxed">
                  {aiError}
                </div>
              )}
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Uses Pollinations free public tier (1 image per ~45s per IP). For unlimited instant
                scenes, use Motion Art or Stock Photos.
              </p>
            </div>
          )}

          {/* Tab 4: Upload Custom Image or Video */}
          {sourceTab === 'upload' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => mediaFileInputRef.current?.click()}
                className="w-full py-5 px-3 rounded-lg border border-dashed border-zinc-700 hover:border-orange-500/70 bg-[#09090B] hover:bg-zinc-900/60 flex flex-col items-center gap-1.5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-orange-400">
                  <ImageIcon className="w-4 h-4" />
                  <Video className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-zinc-200">
                  Upload Photo or Video Clip
                </span>
                <span className="text-[10px] text-zinc-500">PNG, JPG, WebP, MP4, WebM</span>
              </button>
              <input
                ref={mediaFileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleMediaUpload(f);
                  e.target.value = '';
                }}
              />
              {(scene.visualSource === 'upload-image' || scene.visualSource === 'upload-video') &&
                scene.mediaCredit && (
                  <div className="flex items-center justify-between text-[11px] bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5">
                    <span className="truncate text-zinc-300">{scene.mediaCredit}</span>
                    <button
                      type="button"
                      onClick={() => patch({ visualSource: 'cinema', mediaUrl: undefined, mediaCredit: undefined })}
                      className="text-zinc-500 hover:text-red-400 ml-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Atmosphere Particles */}
        <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>Atmosphere Overlay</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {PARTICLE_EFFECTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => patch({ particles: p.id })}
                className={`px-2 py-1.5 rounded-md text-[11px] font-medium border text-left transition-colors cursor-pointer ${
                  scene.particles === p.id
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200'
                    : 'bg-[#09090B] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Camera & Timing */}
        <div className="space-y-3 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            <Camera className="w-3.5 h-3.5 text-orange-400" />
            <span>Camera & Pacing</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Camera Move</label>
              <select
                value={scene.cameraMotion}
                onChange={(e) => patch({ cameraMotion: e.target.value as Scene['cameraMotion'] })}
                className="w-full bg-[#09090B] border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-orange-500/60"
              >
                {CAMERA_MOTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Transition In</label>
              <select
                value={scene.transition}
                onChange={(e) => patch({ transition: e.target.value as Scene['transition'] })}
                className="w-full bg-[#09090B] border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-orange-500/60"
              >
                {TRANSITION_TYPES.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Duration
              </span>
              <span className="font-mono-tabular text-zinc-200">{scene.duration.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min={2}
              max={14}
              step={0.5}
              value={scene.duration}
              onChange={(e) => patch({ duration: Number(e.target.value) })}
              className="w-full studio-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-zinc-400">Motion Intensity</span>
              <span className="font-mono-tabular text-zinc-200">
                {Math.round(scene.motionIntensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={scene.motionIntensity}
              onChange={(e) => patch({ motionIntensity: Number(e.target.value) })}
              className="w-full studio-slider"
            />
          </div>
        </div>

        {/* Recorded / Uploaded Voiceover Clip (Baked into Export!) */}
        <div className="space-y-2 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Scene Voiceover Audio
            </span>
            <span className="text-[10px] text-emerald-400">Exports in Video</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={toggleMicRecording}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isRecording
                  ? 'bg-red-500/20 border-red-500 text-red-300 animate-pulse'
                  : 'bg-[#09090B] hover:bg-zinc-800 border-zinc-800 text-zinc-200'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span className="font-mono-tabular">{recSeconds.toFixed(1)}s</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-orange-400" />
                  <span>Record Mic</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => audioFileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-[#09090B] hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload Audio</span>
            </button>
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAudioUpload(f);
                e.target.value = '';
              }}
            />
          </div>

          {recError && <p className="text-[10px] text-amber-400">{recError}</p>}

          {scene.voiceAudioUrl && (
            <div className="p-2 rounded-lg bg-[#09090B] border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-300 truncate font-medium">
                  {scene.voiceAudioLabel || 'Voiceover Clip'}
                </span>
                <button
                  type="button"
                  onClick={() => patch({ voiceAudioUrl: undefined, voiceAudioLabel: undefined })}
                  className="text-zinc-500 hover:text-red-400 cursor-pointer"
                  title="Remove scene voiceover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <audio src={scene.voiceAudioUrl} controls className="w-full h-7" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
