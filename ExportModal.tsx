import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  Film,
  Loader2,
  X,
} from 'lucide-react';
import { exportProjectVideo } from './exporter';
import { MediaCache } from './renderer';
import {
  ExportOptions,
  ExportProgress,
  ExportResult,
  Project,
  getCanvasDimensions,
  getTotalDuration,
} from './studio';

interface ExportModalProps {
  project: Project;
  mediaCache: MediaCache;
  onClose: () => void;
  onDownloadSRT: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  mediaCache,
  onClose,
  onDownloadSRT,
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    resolution: '720p',
    fps: 30,
    includeAudio: true,
  });
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const dims = getCanvasDimensions(project.settings.aspectRatio, options.resolution);
  const totalDuration = getTotalDuration(project.scenes);
  const isRendering =
    progress !== null &&
    (progress.phase === 'preparing' ||
      progress.phase === 'rendering' ||
      progress.phase === 'finalizing');

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleStartExport = async () => {
    setError(null);
    if (result?.url) {
      URL.revokeObjectURL(result.url);
      setResult(null);
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await exportProjectVideo(
        project,
        mediaCache,
        options,
        (p) => setProgress(p),
        previewCanvasRef.current,
        controller.signal
      );
      setResult(res);
    } catch (err) {
      if ((err as Error).message !== 'Export cancelled') {
        setError(err instanceof Error ? err.message : 'Video export failed.');
      }
      setProgress(null);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    onClose();
  };

  const slug =
    project.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'kinoforge-video';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#111114] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-orange-400" />
            <h2 className="font-display font-semibold text-sm text-zinc-100">
              Export Video — 100% Free & Watermark-Free
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!result && !isRendering && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Resolution
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['720p', '1080p'] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setOptions((o) => ({ ...o, resolution: res }))}
                        className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          options.resolution === res
                            ? 'bg-orange-500/15 border-orange-500 text-orange-200'
                            : 'bg-[#09090B] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {res} {res === '1080p' ? 'HD' : 'Fast'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Frame Rate
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([30, 60] as const).map((fps) => (
                      <button
                        key={fps}
                        type="button"
                        onClick={() => setOptions((o) => ({ ...o, fps }))}
                        className={`py-2 px-2 rounded-lg border text-xs font-medium font-mono-tabular transition-colors cursor-pointer ${
                          options.fps === fps
                            ? 'bg-orange-500/15 border-orange-500 text-orange-200'
                            : 'bg-[#09090B] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {fps} FPS
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[#09090B] border border-zinc-800 cursor-pointer">
                <div>
                  <div className="text-xs font-medium text-zinc-200">
                    Include Soundtrack, SFX & Recorded Voiceovers
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Mixes Web Audio music + scene audio clips straight into the exported video
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={options.includeAudio}
                  onChange={(e) => setOptions((o) => ({ ...o, includeAudio: e.target.checked }))}
                  className="accent-orange-500 w-4 h-4"
                />
              </label>

              <div className="rounded-xl bg-[#09090B] border border-zinc-800/80 p-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="text-zinc-400">Output Specification</div>
                  <div className="font-mono-tabular text-zinc-100">
                    {dims.width}×{dims.height} ({project.settings.aspectRatio}) · {options.fps}fps ·{' '}
                    {totalDuration.toFixed(1)}s
                  </div>
                </div>
                <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-medium text-emerald-300">
                  Local Browser Render
                </span>
              </div>
            </>
          )}

          {/* Live Rendering Preview */}
          {isRendering && progress && (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center max-h-[260px]">
                <canvas
                  ref={previewCanvasRef}
                  width={Math.round(dims.width / 2)}
                  height={Math.round(dims.height / 2)}
                  className="max-h-[260px] w-auto object-contain"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-zinc-200 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                    {progress.message}
                  </span>
                  <span className="font-mono-tabular text-orange-400 font-semibold">
                    {Math.round(progress.progress * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-cyan-400 transition-all duration-150"
                    style={{ width: `${Math.round(progress.progress * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Keep this tab active during real-time recording (~{totalDuration.toFixed(0)}s).
                </p>
              </div>
            </div>
          )}

          {/* Completed Video Preview & Download */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Export complete! {result.width}×{result.height} ·{' '}
                  {result.extension.toUpperCase()} · {formatBytes(result.sizeBytes)}
                </span>
              </div>

              <div className="rounded-xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
                <video
                  src={result.url}
                  controls
                  autoPlay
                  className="max-h-[280px] w-full object-contain"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-[#0D0D10] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onDownloadSRT}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download .SRT</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              {isRendering ? 'Cancel' : 'Close'}
            </button>

            {result ? (
              <a
                href={result.url}
                download={`${slug}.${result.extension}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-400 text-zinc-950 shadow-sm shadow-orange-500/25 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.4]" />
                <span>Download .{result.extension.toUpperCase()}</span>
              </a>
            ) : (
              <button
                type="button"
                disabled={isRendering}
                onClick={handleStartExport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-zinc-950 shadow-sm shadow-orange-500/25 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>{isRendering ? 'Rendering…' : 'Start Render'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
