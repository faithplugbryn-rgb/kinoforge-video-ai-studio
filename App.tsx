import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExportModal } from './ExportModal';
import { HeaderBar } from './HeaderBar';
import { LeftSidebar } from './LeftSidebar';
import { PreviewMonitor } from './PreviewMonitor';
import { SceneInspector } from './SceneInspector';
import { Timeline } from './Timeline';
import { createDefaultProject } from './presets';
import {
  StudioAudioEngine,
  speakSceneNarration,
  stopSpeechNarration,
} from './audioEngine';
import { generateProjectSRT } from './exporter';
import {
  MediaCache,
  getSceneStartTime,
  getTimelineCursor,
} from './renderer';
import {
  GenerationStyle,
  GenerationVisualMode,
  generateStoryboard,
} from './scriptGenerator';
import {
  AspectRatio,
  Project,
  ProjectSettings,
  Scene,
  SoundtrackId,
  getTotalDuration,
} from './studio';

const STORAGE_KEY = 'kinoforge_studio_project_v1';

function loadSavedProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProject();
    const parsed = JSON.parse(raw) as Project;
    if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      return createDefaultProject();
    }
    const cleanedScenes = parsed.scenes.map((s) => ({
      ...s,
      mediaUrl: s.mediaUrl?.startsWith('blob:') ? undefined : s.mediaUrl,
      visualSource:
        s.mediaUrl?.startsWith('blob:') && s.visualSource !== 'cinema'
          ? ('cinema' as const)
          : s.visualSource,
      voiceAudioUrl: s.voiceAudioUrl?.startsWith('blob:') ? undefined : s.voiceAudioUrl,
    }));
    return { ...parsed, scenes: cleanedScenes };
  } catch {
    return createDefaultProject();
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [project, setProject] = useState<Project>(loadSavedProject);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(
    () => project.scenes[0]?.id ?? null
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loop, setLoop] = useState(true);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [previewingTrack, setPreviewingTrack] = useState<SoundtrackId | null>(null);
  const [renderTick, setRenderTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const audioEngineRef = useRef<StudioAudioEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameMsRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const activePlaybackSceneIdxRef = useRef<number>(-1);
  const toastTimerRef = useRef<number | null>(null);

  // Latest-state refs so live playback never stutters when editing sliders or muting
  const projectRef = useRef(project);
  projectRef.current = project;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const loopRef = useRef(loop);
  loopRef.current = loop;

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const mediaCache = useMemo(
    () =>
      new MediaCache(() => {
        setRenderTick((n) => n + 1);
      }),
    []
  );

  if (!audioEngineRef.current) {
    audioEngineRef.current = new StudioAudioEngine();
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      // ignore storage quota
    }
    mediaCache.preloadProject(project);
  }, [project, mediaCache]);

  useEffect(() => {
    if (!project.scenes.some((s) => s.id === selectedSceneId)) {
      setSelectedSceneId(project.scenes[0]?.id ?? null);
    }
  }, [project.scenes, selectedSceneId]);

  // Sync volume & mute changes smoothly without restarting playback
  useEffect(() => {
    audioEngineRef.current?.setVolumes(
      project.settings.musicVolume,
      project.settings.voiceVolume,
      isMuted
    );
    if (isMuted) {
      stopSpeechNarration();
    }
  }, [project.settings.musicVolume, project.settings.voiceVolume, isMuted]);

  // Switch soundtrack live if user changes tracks while playing
  useEffect(() => {
    if (!isPlaying) return;
    audioEngineRef.current?.startSoundtrack(
      project.settings.soundtrack,
      project.settings.musicVolume,
      project.settings.voiceVolume,
      isMutedRef.current
    );
  }, [project.settings.soundtrack, isPlaying]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    audioEngineRef.current?.stopAll();
    stopSpeechNarration();
    activePlaybackSceneIdxRef.current = -1;
  }, []);

  const triggerSceneAudio = useCallback((scene: Scene, sceneIdx: number, isTransition: boolean) => {
    const audio = audioEngineRef.current;
    const settings = projectRef.current.settings;
    if (!audio) return;

    if (isTransition && settings.transitionSfx && !isMutedRef.current) {
      audio.playTransitionWhoosh();
    }

    if (isMutedRef.current) return;

    if (scene.voiceAudioUrl) {
      stopSpeechNarration();
      audio.playVoiceClip(scene.voiceAudioUrl, 0).catch(() => {});
    } else if (settings.ttsEnabled && scene.narration.trim()) {
      audio.stopVoiceClips();
      speakSceneNarration(
        scene.narration,
        settings.ttsVoiceURI,
        settings.ttsRate,
        settings.ttsPitch,
        settings.voiceVolume
      );
    }

    activePlaybackSceneIdxRef.current = sceneIdx;
  }, []);

  // Main requestAnimationFrame playback clock (isolated from scene/UI edits!)
  useEffect(() => {
    if (!isPlaying) return;

    const initialProj = projectRef.current;
    const initialTotal = Math.max(0.5, getTotalDuration(initialProj.scenes));
    if (currentTimeRef.current >= initialTotal - 0.05) {
      currentTimeRef.current = 0;
      setCurrentTime(0);
    }

    setPreviewingTrack(null);
    const audio = audioEngineRef.current!;
    audio.startSoundtrack(
      initialProj.settings.soundtrack,
      initialProj.settings.musicVolume,
      initialProj.settings.voiceVolume,
      isMutedRef.current
    );

    const startCursor = getTimelineCursor(initialProj.scenes, currentTimeRef.current);
    if (startCursor) {
      setSelectedSceneId(startCursor.scene.id);
      triggerSceneAudio(startCursor.scene, startCursor.sceneIndex, false);
    }

    lastFrameMsRef.current = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastFrameMsRef.current) / 1000);
      lastFrameMsRef.current = now;
      const curProj = projectRef.current;
      const total = Math.max(0.5, getTotalDuration(curProj.scenes));
      let nextTime = currentTimeRef.current + dt;

      if (nextTime >= total) {
        if (loopRef.current) {
          nextTime = 0;
          activePlaybackSceneIdxRef.current = -1;
        } else {
          currentTimeRef.current = total;
          setCurrentTime(total);
          stopPlayback();
          return;
        }
      }

      currentTimeRef.current = nextTime;
      setCurrentTime(nextTime);

      const cur = getTimelineCursor(curProj.scenes, nextTime);
      if (cur && cur.sceneIndex !== activePlaybackSceneIdxRef.current) {
        setSelectedSceneId(cur.scene.id);
        triggerSceneAudio(cur.scene, cur.sceneIndex, activePlaybackSceneIdxRef.current >= 0);
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      audio.stopAll();
      stopSpeechNarration();
    };
  }, [isPlaying, triggerSceneAudio, stopPlayback]);

  useEffect(() => {
    return () => {
      audioEngineRef.current?.stopAll();
      stopSpeechNarration();
    };
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      const scenes = projectRef.current.scenes;
      const total = getTotalDuration(scenes);
      const clamped = Math.max(0, Math.min(total, time));
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);

      const cur = getTimelineCursor(scenes, clamped);
      if (cur) {
        setSelectedSceneId(cur.scene.id);
        if (isPlaying && cur.sceneIndex !== activePlaybackSceneIdxRef.current) {
          triggerSceneAudio(cur.scene, cur.sceneIndex, false);
        }
      }
    },
    [isPlaying, triggerSceneAudio]
  );

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleJumpScene = useCallback(
    (delta: -1 | 1) => {
      const scenes = projectRef.current.scenes;
      const cur = getTimelineCursor(scenes, currentTimeRef.current);
      const curIdx = cur ? cur.sceneIndex : 0;
      const targetIdx = Math.max(0, Math.min(scenes.length - 1, curIdx + delta));
      const targetTime = getSceneStartTime(scenes, targetIdx);
      handleSeek(targetTime + 0.02);
    },
    [handleSeek]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (showExportModal) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleJumpScene(-1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleJumpScene(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePlay, handleJumpScene, showExportModal]);

  const handleUpdateSettings = (patch: Partial<ProjectSettings>) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      settings: { ...prev.settings, ...patch },
    }));
  };

  const handleUpdateScene = (sceneId: string, patch: Partial<Scene>) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
    }));
  };

  const handleAddScene = () => {
    const idx = project.scenes.length + 1;
    const newScene: Scene = {
      id: `sc-${Date.now()}`,
      title: `Scene ${idx}`,
      headingOverlay: `SCENE 0${idx}`,
      narration: 'Add your narration or caption text here to bring this scene to life.',
      duration: 4.5,
      visualSource: 'cinema',
      cinemaWorld: 'studio-editorial',
      accentColor: project.settings.captionAccent,
      stockQuery: 'cinematic landscape lighting',
      aiPrompt: 'Minimalist cinematic film frame with soft volumetric rim light',
      particles: 'dust',
      cameraMotion: 'zoom-in',
      motionIntensity: 0.65,
      transition: 'crossfade',
      seed: Math.floor(Math.random() * 9000) + 1000,
    };

    const startOfNew = getTotalDuration(project.scenes);
    setProject((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      scenes: [...prev.scenes, newScene],
    }));
    setSelectedSceneId(newScene.id);
    currentTimeRef.current = startOfNew + 0.05;
    setCurrentTime(startOfNew + 0.05);
  };

  const handleDuplicateScene = (sceneId: string) => {
    const idx = project.scenes.findIndex((s) => s.id === sceneId);
    if (idx === -1) return;
    const orig = project.scenes[idx];
    const copy: Scene = {
      ...orig,
      id: `sc-${Date.now()}`,
      title: `${orig.title} (Copy)`,
      seed: orig.seed + 77,
    };
    const next = [...project.scenes];
    next.splice(idx + 1, 0, copy);
    setProject((prev) => ({ ...prev, updatedAt: Date.now(), scenes: next }));
    setSelectedSceneId(copy.id);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (project.scenes.length <= 1) return;
    const next = project.scenes.filter((s) => s.id !== sceneId);
    setProject((prev) => ({ ...prev, updatedAt: Date.now(), scenes: next }));
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(next[0]?.id ?? null);
    }
    const newTotal = getTotalDuration(next);
    if (currentTimeRef.current > newTotal) {
      currentTimeRef.current = 0;
      setCurrentTime(0);
    }
  };

  const handleMoveScene = (sceneId: string, dir: -1 | 1) => {
    const idx = project.scenes.findIndex((s) => s.id === sceneId);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= project.scenes.length) return;
    const next = [...project.scenes];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    setProject((prev) => ({ ...prev, updatedAt: Date.now(), scenes: next }));
  };

  const handleGenerateStoryboard = async (params: {
    prompt: string;
    pastedScript: string;
    mode: 'prompt' | 'script';
    style: GenerationStyle;
    aspectRatio: AspectRatio;
    visualMode: GenerationVisualMode;
    sceneCount: number;
  }) => {
    stopPlayback();
    setIsGenerating(true);
    try {
      const nextProj = await generateStoryboard({
        ...params,
        baseSettings: project.settings,
      });
      setProject(nextProj);
      setSelectedSceneId(nextProj.scenes[0]?.id ?? null);
      currentTimeRef.current = 0;
      setCurrentTime(0);
      notify(`Generated ${nextProj.scenes.length} scenes — press Play to preview!`);
    } catch {
      notify('Could not generate storyboard. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTogglePreviewSoundtrack = (track: SoundtrackId) => {
    stopPlayback();
    const audio = audioEngineRef.current!;
    if (previewingTrack === track) {
      audio.stopSoundtrack();
      setPreviewingTrack(null);
    } else {
      audio.startSoundtrack(track, project.settings.musicVolume, project.settings.voiceVolume, false);
      setPreviewingTrack(track);
    }
  };

  const handleTestVoice = () => {
    const active = project.scenes.find((s) => s.id === selectedSceneId) ?? project.scenes[0];
    if (!active) return;
    speakSceneNarration(
      active.narration || 'Welcome to KinoForge, your free video AI studio.',
      project.settings.ttsVoiceURI,
      project.settings.ttsRate,
      project.settings.ttsPitch,
      project.settings.voiceVolume
    );
  };

  const handleExportSRT = () => {
    const srt = generateProjectSRT(project);
    const slug =
      project.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'subtitles';
    downloadBlob(new Blob([srt], { type: 'text/plain;charset=utf-8' }), `${slug}.srt`);
    notify('Downloaded subtitles (.srt)');
  };

  const handleSaveJson = () => {
    const slug =
      project.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'project';
    downloadBlob(
      new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
      `${slug}.kinoforge.json`
    );
    notify('Saved project file (.json)');
  };

  const handleLoadJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Project;
        if (!parsed?.scenes?.length) throw new Error('Invalid project file');
        stopPlayback();
        setProject(parsed);
        setSelectedSceneId(parsed.scenes[0].id);
        currentTimeRef.current = 0;
        setCurrentTime(0);
        notify(`Loaded "${parsed.title}"`);
      } catch {
        notify('Invalid KinoForge project file.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    stopPlayback();
    const demo = createDefaultProject();
    setProject(demo);
    setSelectedSceneId(demo.scenes[0].id);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    notify('Loaded default demo showcase');
  };

  const selectedSceneIndex = project.scenes.findIndex((s) => s.id === selectedSceneId);
  const selectedScene =
    selectedSceneIndex >= 0 ? project.scenes[selectedSceneIndex] : project.scenes[0] ?? null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#09090B] text-zinc-100 overflow-hidden">
      <HeaderBar
        project={project}
        onUpdateTitle={(title) => setProject((p) => ({ ...p, title }))}
        onChangeAspectRatio={(aspectRatio) => handleUpdateSettings({ aspectRatio })}
        onExportVideo={() => {
          stopPlayback();
          setPreviewingTrack(null);
          audioEngineRef.current?.stopAll();
          setShowExportModal(true);
        }}
        onExportSRT={handleExportSRT}
        onSaveJson={handleSaveJson}
        onLoadJson={handleLoadJson}
        onResetDemo={handleResetDemo}
      />

      {/* Main 3-Pane Studio Workspace */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {showLeftPanel && (
          <LeftSidebar
            project={project}
            isGenerating={isGenerating}
            previewingTrack={previewingTrack}
            onGenerateStoryboard={handleGenerateStoryboard}
            onUpdateSettings={handleUpdateSettings}
            onTogglePreviewSoundtrack={handleTogglePreviewSoundtrack}
            onTestVoice={handleTestVoice}
          />
        )}

        <PreviewMonitor
          project={project}
          currentTime={currentTime}
          isPlaying={isPlaying}
          isMuted={isMuted}
          loop={loop}
          showLeftPanel={showLeftPanel}
          showRightPanel={showRightPanel}
          mediaCache={mediaCache}
          renderTick={renderTick}
          onTogglePlay={handleTogglePlay}
          onJumpStart={() => handleSeek(0)}
          onPrevScene={() => handleJumpScene(-1)}
          onNextScene={() => handleJumpScene(1)}
          onToggleMute={() => setIsMuted((m) => !m)}
          onToggleLoop={() => setLoop((l) => !l)}
          onToggleLeftPanel={() => setShowLeftPanel((v) => !v)}
          onToggleRightPanel={() => setShowRightPanel((v) => !v)}
        />

        {showRightPanel && (
          <SceneInspector
            scene={selectedScene}
            sceneIndex={Math.max(0, selectedSceneIndex)}
            aspectRatio={project.settings.aspectRatio}
            onUpdateScene={handleUpdateScene}
          />
        )}
      </main>

      {/* Bottom Multi-Track Timeline */}
      <Timeline
        project={project}
        currentTime={currentTime}
        selectedSceneId={selectedScene?.id ?? null}
        mediaCache={mediaCache}
        renderTick={renderTick}
        onSeek={handleSeek}
        onSelectScene={(id) => setSelectedSceneId(id)}
        onAddScene={handleAddScene}
        onDuplicateScene={handleDuplicateScene}
        onDeleteScene={handleDeleteScene}
        onMoveScene={handleMoveScene}
      />

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          project={project}
          mediaCache={mediaCache}
          onClose={() => setShowExportModal(false)}
          onDownloadSRT={handleExportSRT}
        />
      )}

      {/* Subtle Toast Feedback */}
      {toast && (
        <div className="fixed bottom-[210px] left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-lg bg-zinc-900/95 border border-zinc-700 text-xs font-medium text-zinc-100 shadow-xl backdrop-blur-md">
          {toast}
        </div>
      )}
    </div>
  );
}
