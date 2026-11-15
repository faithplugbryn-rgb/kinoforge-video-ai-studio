import React, { useRef } from 'react';
import {
  Download,
  FileText,
  Film,
  FolderOpen,
  RotateCcw,
  Save,
  Smartphone,
  Square,
  Monitor,
} from 'lucide-react';
import { AspectRatio, Project } from '../types/studio';

interface HeaderBarProps {
  project: Project;
  onUpdateTitle: (title: string) => void;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  onExportVideo: () => void;
  onExportSRT: () => void;
  onSaveJson: () => void;
  onLoadJson: (file: File) => void;
  onResetDemo: () => void;
}

const RATIOS: { id: AspectRatio; label: string; sub: string; icon: React.ReactNode }[] = [
  { id: '16:9', label: '16:9', sub: 'YouTube', icon: <Monitor className="w-3.5 h-3.5" /> },
  { id: '9:16', label: '9:16', sub: 'Shorts', icon: <Smartphone className="w-3.5 h-3.5" /> },
  { id: '1:1', label: '1:1', sub: 'Square', icon: <Square className="w-3.5 h-3.5" /> },
];

export const HeaderBar: React.FC<HeaderBarProps> = ({
  project,
  onUpdateTitle,
  onChangeAspectRatio,
  onExportVideo,
  onExportSRT,
  onSaveJson,
  onLoadJson,
  onResetDemo,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="h-12 shrink-0 border-b border-zinc-800/90 bg-[#111114] px-3 flex items-center justify-between gap-3 select-none">
      {/* Left: Brand + Editable Project Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-sm shadow-orange-500/20">
            <Film className="w-4 h-4 text-zinc-950 stroke-[2.4]" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-sm tracking-tight text-zinc-100">
              KinoForge
            </span>
            <span className="text-[10px] font-medium text-zinc-500 tracking-wide">
              FREE VIDEO AI STUDIO
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-zinc-800 shrink-0" />

        <input
          type="text"
          value={project.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          aria-label="Project title"
          className="bg-transparent hover:bg-zinc-800/60 focus:bg-zinc-800/90 text-xs sm:text-sm font-medium text-zinc-200 px-2 py-1 rounded-md border border-transparent focus:border-zinc-700 outline-none truncate max-w-[180px] sm:max-w-[240px] transition-colors"
        />
      </div>

      {/* Center: Aspect Ratio Switcher */}
      <div className="flex items-center bg-[#09090B] p-0.5 rounded-lg border border-zinc-800/90 shrink-0">
        {RATIOS.map((r) => {
          const active = project.settings.aspectRatio === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onChangeAspectRatio(r.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                active
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={`Switch canvas to ${r.label} (${r.sub})`}
            >
              <span className={active ? 'text-orange-400' : 'text-zinc-500'}>{r.icon}</span>
              <span className="font-mono-tabular">{r.label}</span>
              <span className="text-[10px] text-zinc-500 hidden xl:inline">{r.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Project & Export Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onSaveJson}
          title="Save project file (.json)"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Open saved project (.json)"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onLoadJson(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={onResetDemo}
          title="Load default demo project"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-zinc-800 mx-0.5 hidden sm:block" />

        <button
          type="button"
          onClick={onExportSRT}
          title="Download subtitles (.srt)"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/70 transition-colors cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-zinc-400" />
          <span>SRT</span>
        </button>

        <button
          type="button"
          onClick={onExportVideo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-zinc-950 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 shadow-sm shadow-orange-500/25 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.4]" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  );
};
