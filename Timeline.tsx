import React, { useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Film,
  Mic,
  Music,
  Plus,
  Trash2,
  Type,
} from 'lucide-react';
import { SOUNDTRACKS } from '../data/presets';
import { MediaCache, getSceneStartTime, renderSceneThumbnail } from '../engine/renderer';
import { Project, Scene, getTotalDuration } from '../types/studio';

interface TimelineProps {
  project: Project;
  currentTime: number;
  selectedSceneId: string | null;
  mediaCache: MediaCache;
  renderTick: number;
  onSeek: (time: number) => void;
  onSelectScene: (sceneId: string) => void;
  onAddScene: () => void;
  onDuplicateScene: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onMoveScene: (sceneId: string, dir: -1 | 1) => void;
}

const SceneThumbCanvas: React.FC<{
  scene: Scene;
  mediaCache: MediaCache;
  renderTick: number;
}> = ({ scene, mediaCache, renderTick }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    renderSceneThumbnail(ref.current, scene, mediaCache);
  }, [
    scene.cinemaWorld,
    scene.accentColor,
    scene.visualSource,
    scene.mediaUrl,
    scene.particles,
    scene.seed,
    scene.headingOverlay,
    mediaCache,
    renderTick,
  ]);

  return (
    <canvas
      ref={ref}
      width={160}
      height={90}
      className="w-full h-full object-cover opacity-75 group-hover:opacity-90 transition-opacity"
    />
  );
};

export const Timeline: React.FC<TimelineProps> = ({
  project,
  currentTime,
  selectedSceneId,
  mediaCache,
  renderTick,
  onSeek,
  onSelectScene,
  onAddScene,
  onDuplicateScene,
  onDeleteScene,
  onMoveScene,
}) => {
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const totalDuration = Math.max(1, getTotalDuration(project.scenes));
  const seekRef = useRef(onSeek);
  seekRef.current = onSeek;
  const totalDurRef = useRef(totalDuration);
  totalDurRef.current = totalDuration;

  const seekFromClientX = (clientX: number) => {
    const el = trackAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seekRef.current(ratio * totalDurRef.current);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) seekFromClientX(e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const playheadPct = Math.max(0, Math.min(100, (currentTime / totalDuration) * 100));
  const soundtrackInfo = SOUNDTRACKS.find((s) => s.id === project.settings.soundtrack);

  // Compute crisp time ruler ticks
  const tickStep = totalDuration <= 15 ? 2 : totalDuration <= 35 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= totalDuration; t += tickStep) {
    ticks.push(t);
  }

  return (
    <footer className="h-[196px] shrink-0 border-t border-zinc-800/90 bg-[#111114] flex flex-col select-none">
      {/* Timeline Toolbar */}
      <div className="h-8 shrink-0 px-3 border-b border-zinc-800/80 bg-[#0D0D10] flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          <span className="font-semibold text-zinc-200 tracking-wide uppercase text-[10px]">
            Multi-Track Timeline
          </span>
          <span className="text-zinc-600">·</span>
          <span className="font-mono-tabular text-zinc-400">
            {project.scenes.length} {project.scenes.length === 1 ? 'scene' : 'scenes'} ·{' '}
            {totalDuration.toFixed(1)}s total
          </span>
        </div>

        <button
          type="button"
          onClick={onAddScene}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/70 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-orange-400" />
          <span>Add Scene</span>
        </button>
      </div>

      {/* Tracks Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Track Labels */}
        <div className="w-[104px] shrink-0 border-r border-zinc-800/90 bg-[#0D0D10] flex flex-col">
          <div className="h-6 border-b border-zinc-800/70 px-2.5 flex items-center text-[10px] font-mono-tabular text-zinc-500">
            TIME
          </div>
          <div className="flex-1 flex flex-col justify-between py-1.5 px-2.5 gap-1.5">
            <div className="h-[64px] flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
              <Film className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>Scenes</span>
            </div>
            <div className="h-[28px] flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <Type className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Script</span>
            </div>
            <div className="h-[26px] flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Audio</span>
            </div>
          </div>
        </div>

        {/* Right Interactive Scrubbing Track Area */}
        <div
          ref={trackAreaRef}
          className="flex-1 relative min-w-0 flex flex-col overflow-hidden bg-[#09090B]"
        >
          {/* Ruler */}
          <div
            onMouseDown={(e) => {
              draggingRef.current = true;
              seekFromClientX(e.clientX);
            }}
            className="h-6 shrink-0 border-b border-zinc-800/80 bg-[#0D0D10]/80 relative cursor-ew-resize"
          >
            {ticks.map((sec) => {
              const pct = (sec / totalDuration) * 100;
              return (
                <div
                  key={sec}
                  className="absolute top-0 bottom-0 flex flex-col justify-end pb-0.5 pointer-events-none"
                  style={{ left: `${pct}%` }}
                >
                  <span className="font-mono-tabular text-[9px] text-zinc-500 pl-1">
                    {sec}s
                  </span>
                  <div className="w-px h-1.5 bg-zinc-700" />
                </div>
              );
            })}
          </div>

          {/* Track Rows */}
          <div className="flex-1 flex flex-col justify-between py-1.5 px-0 gap-1.5 relative">
            {/* Row 1: Visual Scenes */}
            <div className="h-[64px] flex items-stretch gap-1 px-1">
              {project.scenes.map((scene, idx) => {
                const widthPct = (Math.max(1, scene.duration) / totalDuration) * 100;
                const isSelected = scene.id === selectedSceneId;
                const startT = getSceneStartTime(project.scenes, idx);

                return (
                  <div
                    key={scene.id}
                    style={{ width: `${widthPct}%` }}
                    onClick={() => {
                      onSelectScene(scene.id);
                      onSeek(startT + 0.05);
                    }}
                    className={`relative h-full rounded-lg overflow-hidden border transition-all cursor-pointer group min-w-[54px] ${
                      isSelected
                        ? 'border-orange-500 ring-1 ring-orange-500/70'
                        : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <SceneThumbCanvas
                      scene={scene}
                      mediaCache={mediaCache}
                      renderTick={renderTick}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/45 p-1.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono-tabular text-[9px] font-semibold px-1 rounded bg-black/70 text-zinc-200">
                          {idx + 1}
                        </span>
                        {/* Quick hover actions */}
                        <div
                          className="hidden group-hover:flex items-center gap-0.5 bg-zinc-950/90 rounded px-0.5 py-0.5 border border-zinc-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => onMoveScene(scene.id, -1)}
                              title="Move left"
                              className="p-0.5 text-zinc-400 hover:text-white cursor-pointer"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          )}
                          {idx < project.scenes.length - 1 && (
                            <button
                              type="button"
                              onClick={() => onMoveScene(scene.id, 1)}
                              title="Move right"
                              className="p-0.5 text-zinc-400 hover:text-white cursor-pointer"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDuplicateScene(scene.id)}
                            title="Duplicate scene"
                            className="p-0.5 text-zinc-400 hover:text-cyan-300 cursor-pointer"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                          {project.scenes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onDeleteScene(scene.id)}
                              title="Delete scene"
                              className="p-0.5 text-zinc-400 hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-1">
                        <span className="text-[10px] font-medium text-zinc-100 truncate">
                          {scene.title}
                        </span>
                        <span className="font-mono-tabular text-[9px] text-zinc-300 shrink-0">
                          {scene.duration.toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row 2: Captions & Voiceover Strip */}
            <div className="h-[28px] flex items-stretch gap-1 px-1">
              {project.scenes.map((scene, idx) => {
                const widthPct = (Math.max(1, scene.duration) / totalDuration) * 100;
                const isSelected = scene.id === selectedSceneId;
                const startT = getSceneStartTime(project.scenes, idx);
                return (
                  <div
                    key={scene.id}
                    style={{ width: `${widthPct}%` }}
                    onClick={() => {
                      onSelectScene(scene.id);
                      onSeek(startT + 0.05);
                    }}
                    className={`h-full rounded-md px-2 flex items-center gap-1.5 border text-[10px] truncate cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-100'
                        : 'bg-zinc-900/90 border-zinc-800/90 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {scene.voiceAudioUrl && (
                      <Mic className="w-3 h-3 text-emerald-400 shrink-0" />
                    )}
                    <span className="truncate">{scene.narration || '(No captions)'}</span>
                  </div>
                );
              })}
            </div>

            {/* Row 3: Soundtrack Waveform Bar */}
            <div className="h-[26px] px-1">
              <div
                onMouseDown={(e) => {
                  draggingRef.current = true;
                  seekFromClientX(e.clientX);
                }}
                className={`h-full w-full rounded-md border px-2.5 flex items-center justify-between relative overflow-hidden cursor-ew-resize ${
                  project.settings.soundtrack === 'none'
                    ? 'bg-zinc-950 border-zinc-800/60 text-zinc-600'
                    : 'bg-emerald-950/35 border-emerald-500/30 text-emerald-300'
                }`}
              >
                {/* Decorative audio waveform bars */}
                {project.settings.soundtrack !== 'none' && (
                  <div className="absolute inset-0 flex items-center justify-around px-2 opacity-30 pointer-events-none">
                    {Array.from({ length: 64 }).map((_, i) => {
                      const h = 25 + Math.abs(Math.sin(i * 0.72) * Math.cos(i * 0.29)) * 65;
                      return (
                        <div
                          key={i}
                          className="w-0.5 rounded-full bg-emerald-400"
                          style={{ height: `${h}%` }}
                        />
                      );
                    })}
                  </div>
                )}
                <span className="relative z-10 text-[10px] font-medium truncate">
                  {soundtrackInfo?.label ?? 'No Soundtrack'}
                </span>
                <span className="relative z-10 font-mono-tabular text-[9px] opacity-80">
                  {project.settings.soundtrack === 'none'
                    ? 'Muted'
                    : `${Math.round(project.settings.musicVolume * 100)}% vol`}
                </span>
              </div>
            </div>
          </div>

          {/* Playhead Needle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none z-20 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            style={{ left: `${playheadPct}%` }}
          >
            <div className="w-3 h-3 -ml-[5px] -mt-0.5 bg-cyan-400 rotate-45 rounded-[2px]" />
          </div>
        </div>
      </div>
    </footer>
  );
};
