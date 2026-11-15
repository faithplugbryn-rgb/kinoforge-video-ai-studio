import {
  ExportOptions,
  ExportProgress,
  ExportResult,
  Project,
  getCanvasDimensions,
  getTotalDuration,
} from '../types/studio';
import { StudioAudioEngine } from './audioEngine';
import { MediaCache, getTimelineCursor, renderProjectFrame } from './renderer';

function pickSupportedMimeType(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: 'video/webm', extension: 'webm' };
}

/**
 * Exports a real downloadable video file (.mp4 or .webm) directly in the browser!
 * Captures canvas frames at target resolution & FPS while mixing synthesized soundtrack,
 * transition SFX, and any recorded/uploaded scene voiceovers in exact real-time sync.
 */
export async function exportProjectVideo(
  project: Project,
  mediaCache: MediaCache,
  options: ExportOptions,
  onProgress: (p: ExportProgress) => void,
  previewCanvas: HTMLCanvasElement | null,
  abortSignal: AbortSignal
): Promise<ExportResult> {
  const totalDuration = Math.max(1, getTotalDuration(project.scenes));
  const { width, height } = getCanvasDimensions(project.settings.aspectRatio, options.resolution);

  onProgress({
    phase: 'preparing',
    progress: 0,
    currentTime: 0,
    totalDuration,
    message: 'Preparing canvas, media assets & audio tracks…',
  });

  // Ensure scene media & recorded audio buffers are ready
  mediaCache.preloadProject(project);
  const exportAudio = new StudioAudioEngine();
  if (options.includeAudio) {
    await exportAudio.preloadVoiceClips(project);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D export canvas.');
  }

  // Render frame 0 before starting capture
  renderProjectFrame(ctx, project, 0, mediaCache, true);

  const videoStream = canvas.captureStream(options.fps);
  const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];

  if (options.includeAudio) {
    const audioStream = exportAudio.attachExportStream();
    tracks.push(...audioStream.getAudioTracks());
  }

  const combinedStream = new MediaStream(tracks);
  const { mimeType, extension } = pickSupportedMimeType();

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: options.resolution === '1080p' ? 8_000_000 : 5_000_000,
    audioBitsPerSecond: 192_000,
  });

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  const stopPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = (ev) => {
      reject(new Error(`Recorder error: ${String(ev)}`));
    };
  });

  if (abortSignal.aborted) {
    throw new Error('Export cancelled');
  }

  recorder.start(250);

  // Start synchronized soundtrack & voiceovers
  if (options.includeAudio) {
    exportAudio.startSoundtrack(
      project.settings.soundtrack,
      project.settings.musicVolume,
      project.settings.voiceVolume,
      false
    );
  }

  const startMs = performance.now();
  let lastSceneIdx = -1;
  const frameIntervalMs = 1000 / options.fps;

  try {
    await new Promise<void>((resolve, reject) => {
      let lastDraw = 0;

      const tick = () => {
        if (abortSignal.aborted) {
          reject(new Error('Export cancelled'));
          return;
        }

        const now = performance.now();
        const elapsedSec = (now - startMs) / 1000;

        if (elapsedSec >= totalDuration) {
          renderProjectFrame(ctx, project, totalDuration, mediaCache, true);
          resolve();
          return;
        }

        if (now - lastDraw >= frameIntervalMs * 0.8) {
          lastDraw = now;
          renderProjectFrame(ctx, project, elapsedSec, mediaCache, true);

          // Mirror crisp live frame onto modal preview canvas if attached
          if (previewCanvas) {
            const pCtx = previewCanvas.getContext('2d');
            if (pCtx) {
              pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
              pCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
            }
          }

          // Trigger scene-boundary voice clips & transition SFX
          const cursor = getTimelineCursor(project.scenes, elapsedSec);
          if (cursor && cursor.sceneIndex !== lastSceneIdx) {
            if (lastSceneIdx >= 0 && options.includeAudio && project.settings.transitionSfx) {
              exportAudio.playTransitionWhoosh();
            }
            lastSceneIdx = cursor.sceneIndex;
            if (options.includeAudio && cursor.scene.voiceAudioUrl) {
              exportAudio.playVoiceClip(cursor.scene.voiceAudioUrl, 0).catch(() => {});
            }
          }

          onProgress({
            phase: 'rendering',
            progress: Math.min(0.99, elapsedSec / totalDuration),
            currentTime: elapsedSec,
            totalDuration,
            message: `Rendering ${width}×${height} @ ${options.fps}fps (${elapsedSec.toFixed(1)}s / ${totalDuration.toFixed(1)}s)`,
          });
        }

        window.setTimeout(tick, Math.max(8, Math.floor(frameIntervalMs / 2)));
      };

      tick();
    });
  } finally {
    exportAudio.stopAll();
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
    combinedStream.getTracks().forEach((t) => t.stop());
  }

  onProgress({
    phase: 'finalizing',
    progress: 0.99,
    currentTime: totalDuration,
    totalDuration,
    message: 'Finalizing video file…',
  });

  const blob = await stopPromise;
  const url = URL.createObjectURL(blob);

  onProgress({
    phase: 'done',
    progress: 1,
    currentTime: totalDuration,
    totalDuration,
    message: 'Video export ready!',
  });

  return {
    blob,
    url,
    mimeType,
    extension,
    sizeBytes: blob.size,
    durationSec: totalDuration,
    width,
    height,
  };
}

/**
 * Formats seconds into SRT timestamp `HH:MM:SS,mmm`
 */
function formatSrtTime(sec: number): string {
  const msTotal = Math.max(0, Math.round(sec * 1000));
  const hours = Math.floor(msTotal / 3600000);
  const mins = Math.floor((msTotal % 3600000) / 60000);
  const secs = Math.floor((msTotal % 60000) / 1000);
  const ms = msTotal % 1000;
  return (
    String(hours).padStart(2, '0') +
    ':' +
    String(mins).padStart(2, '0') +
    ':' +
    String(secs).padStart(2, '0') +
    ',' +
    String(ms).padStart(3, '0')
  );
}

/**
 * Generates a clean standards-compliant .SRT subtitle file for the project
 */
export function generateProjectSRT(project: Project): string {
  let cursor = 0;
  const blocks: string[] = [];

  project.scenes.forEach((scene, idx) => {
    const start = cursor;
    const end = cursor + Math.max(1, scene.duration);
    cursor = end;
    const text = scene.narration.trim() || scene.title;
    blocks.push(`${idx + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end - 0.08)}\n${text}`);
  });

  return blocks.join('\n\n') + '\n';
}
