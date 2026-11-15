import React, { useEffect, useRef, useState } from 'react';
import {
  PanelLeft,
  PanelRight,
  Pause,
  Play,
  Repeat,
  SkipBack,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  Project,
  getCanvasDimensions,
  getTotalDuration,
} from './studio';
import { MediaCache, getTimelineCursor, renderProjectFrame } from './renderer';

interface PreviewMonitorProps {
  project: Project;
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  loop: boolean;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  mediaCache: MediaCache;
  renderTick: number;
  onTogglePlay: () => void;
  onJumpStart: () => void;
  onPrevScene: () => void;
  onNextScene: () => void;
  onToggleMute: () => void;
  onToggleLoop: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}

function formatTimecode(sec: number): string {
  const safe = Math.max(0, sec);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const cs = Math.floor((safe % 1) * 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export const PreviewMonitor: React.FC<PreviewMonitorProps> = ({
  project,
  currentTime,
  isPlaying,
  isMuted,
  loop,
  showLeftPanel,
  showRightPanel,
  mediaCache,
  renderTick,
  onTogglePlay,
  onJumpStart,
  onPrevScene,
  onNextScene,
  onToggleMute,
  onToggleLoop,
  onToggleLeftPanel,
  onToggleRightPanel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 640, h: 360 });

  const totalDuration = getTotalDuration(project.scenes);
  const { width, height } = getCanvasDimensions(project.settings.aspectRatio, 'preview');
  const cursor = getTimelineCursor(project.scenes, currentTime);

  // Measure monitor stage so the canvas frame always fits at pixel-exact aspect ratio
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setStageSize({ w: Math.max(120, rect.width - 32), h: Math.max(120, rect.height - 32) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute exact fitted monitor box dimensions
  const ratio = width / height;
  let frameW = stageSize.w;
  let frameH = frameW / ratio;
  if (frameH > stageSize.h) {
    frameH = stageSize.h;
    frameW = frameH * ratio;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderProjectFrame(ctx, project, currentTime, mediaCache, isPlaying);
  }, [project, currentTime, width, height, mediaCache, isPlaying, renderTick]);

  return (
    <section className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#09090B]">
      {/* Viewport Info Strip */}
      <div className="h-8 shrink-0 px-2.5 border-b border-zinc-800/70 bg-[#0D0D10] flex items-center justify-between gap-2 text-[11px] text-zinc-400">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onToggleLeftPanel}
            title={showLeftPanel ? 'Hide AI Script panel' : 'Show AI Script panel'}
            className={`p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer ${
              showLeftPanel ? 'text-zinc-300' : 'text-orange-400'
            }`}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
          <span className="inline-flex items-center gap-1.5 text-zinc-300 font-medium truncate">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isPlaying ? 'bg-orange-500 animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span className="truncate">
              {cursor ? `Scene ${cursor.sceneIndex + 1} · ${cursor.scene.title}` : 'Empty Timeline'}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2.5 font-mono-tabular text-[10px] text-zinc-500 shrink-0">
          <span>{project.settings.aspectRatio}</span>
          <span className="hidden sm:inline">
            {width}×{height}
          </span>
          <span className="hidden xl:inline">Space: Play</span>
          <button
            type="button"
            onClick={onToggleRightPanel}
            title={showRightPanel ? 'Hide Scene Inspector' : 'Show Scene Inspector'}
            className={`p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer ${
              showRightPanel ? 'text-zinc-300' : 'text-orange-400'
            }`}
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Monitor Stage */}
      <div
        ref={stageRef}
        className="flex-1 min-h-0 monitor-backdrop p-4 flex items-center justify-center overflow-hidden"
      >
        <div
          onClick={onTogglePlay}
          title="Click monitor to play or pause"
          style={{
            width: `${Math.round(frameW)}px`,
            height: `${Math.round(frameH)}px`,
          }}
          className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-zinc-700/70 bg-black cursor-pointer shrink-0"
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full h-full block"
          />

          {/* Subtle center play affordance when paused at start */}
          {!isPlaying && currentTime === 0 && (
            <div className="absolute inset-0 bg-black/15 hover:bg-black/5 transition-colors flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-zinc-950/75 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-xl">
                <Play className="w-6 h-6 text-orange-400 fill-orange-400 ml-0.5" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transport Bar */}
      <div className="h-12 shrink-0 border-t border-zinc-800/90 bg-[#111114] px-3 sm:px-4 flex items-center justify-between gap-2 select-none">
        {/* Timecode */}
        <div className="font-mono-tabular text-xs flex items-center gap-1 min-w-[115px]">
          <span className="text-cyan-400 font-semibold">{formatTimecode(currentTime)}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">{formatTimecode(totalDuration)}</span>
        </div>

        {/* Playback buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onJumpStart}
            title="Jump to start"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onPrevScene}
            title="Previous scene (Left Arrow)"
            className="px-2 py-1 rounded-md text-[11px] font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onNextScene}
            title="Next scene (Right Arrow)"
            className="px-2 py-1 rounded-md text-[11px] font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Next
          </button>
          <button
            type="button"
            onClick={onToggleLoop}
            title={loop ? 'Loop enabled' : 'Loop disabled'}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              loop
                ? 'text-orange-400 bg-orange-500/12'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Volume mute */}
        <div className="flex items-center justify-end gap-2 min-w-[95px]">
          <button
            type="button"
            onClick={onToggleMute}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              isMuted
                ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            )}
            <span className="hidden md:inline">{isMuted ? 'Muted' : 'Audio'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
