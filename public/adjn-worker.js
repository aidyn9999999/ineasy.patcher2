/**
 * ADJN Web Worker
 * Runs the heavy MP4 patching off the main thread — no UI lag.
 * Mirrors how the browser extension uses processor.html in an iframe.
 */
'use strict';

// We need to import the core and processor scripts into the worker context.
// importScripts is synchronous and available in dedicated workers.
importScripts('adjn-mp4-core.js', 'adjn-processor.js');

const FFMPEG_PACKAGE_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10';
const FFMPEG_UTIL_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js';
const FFMPEG_CORE_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
const TRANSCODE_BITRATE_THRESHOLD = 15_000_000;

async function loadFfmpegWorkerURL() {
  const response = await fetch(`${FFMPEG_PACKAGE_BASE}/dist/esm/worker.js`);
  if (!response.ok) throw new Error(`Converter worker download failed (${response.status}).`);
  const source = (await response.text())
    .replaceAll('from "./const.js"', `from "${FFMPEG_PACKAGE_BASE}/dist/esm/const.js"`)
    .replaceAll('from "./errors.js"', `from "${FFMPEG_PACKAGE_BASE}/dist/esm/errors.js"`);
  return URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
}

function targetVideoRate(width, height, fps) {
  const pixels = Number(width || 0) * Number(height || 0);
  if (fps > 60.01) return pixels >= 3840 * 2160 ? 22_000_000 : 20_000_000;
  if (pixels >= 3840 * 2160) return 20_000_000;
  if (pixels >= 1920 * 1080) return 10_000_000;
  return 8_000_000;
}

async function transcodeSdrForPlayback(file, info, onProgress) {
  onProgress('Loading local converter…', 8, 'FFmpeg core loads on demand (~31 MB)');
  const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
    import(`${FFMPEG_PACKAGE_BASE}/dist/esm/index.js`),
    import(FFMPEG_UTIL_URL),
  ]);
  const ffmpeg = new FFmpeg();
  let workerUrl = null;
  let mounted = false;
  const outputPath = 'output.mp4';
  const inputName = String(file.name || 'input.mp4').replace(/[\\/]/g, '_');
  const inputPath = `/source/${inputName}`;
  const fps = Math.max(1, Math.min(120, Math.round(Number(info?.maxFps || info?.averageFps || 30))));
  const maxRate = targetVideoRate(info?.width, info?.height, fps);

  try {
    workerUrl = await loadFfmpegWorkerURL();
    await ffmpeg.load({
      classWorkerURL: workerUrl,
      coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;

    await ffmpeg.createDir('/source');
    await ffmpeg.mount('WORKERFS', { files: [file] }, '/source');
    mounted = true;

    ffmpeg.on('progress', ({ progress }) => {
      if (Number.isFinite(progress)) {
        onProgress('Optimizing video locally…', Math.max(8, Math.min(48, 8 + Math.round(progress * 40))), 'Preserving resolution and frame rate');
      }
    });

    const exitCode = await ffmpeg.exec([
      '-hide_banner', '-y', '-i', inputPath,
      '-map', '0:v:0', '-map', '0:a:0?',
      '-c:v', 'libx264', '-preset', 'medium', '-tune', 'fastdecode',
      '-crf', '17', '-maxrate', `${Math.round(maxRate / 1_000_000)}M`,
      '-bufsize', `${Math.round(maxRate * 2 / 1_000_000)}M`, '-pix_fmt', 'yuv420p',
      '-r', String(fps), '-fps_mode', 'cfr',
      '-c:a', 'aac', '-b:a', '192k', '-sn', '-dn', '-map_metadata', '0',
      '-movflags', '+faststart', outputPath,
    ], 9 * 60 * 1000);
    if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}.`);

    const converted = await ffmpeg.readFile(outputPath);
    if (!(converted instanceof Uint8Array) || converted.byteLength < 64) {
      throw new Error('FFmpeg returned an invalid MP4.');
    }
    onProgress('Rate control complete; applying ADJN patch…', 50, 'Passing encoded video to the original ADJN patcher');
    return {
      buffer: converted.buffer.slice(converted.byteOffset, converted.byteOffset + converted.byteLength),
      fps,
      maxRate,
    };
  } finally {
    if (mounted) {
      try { await ffmpeg.unmount('/source'); } catch (error) {}
      try { await ffmpeg.deleteDir('/source'); } catch (error) {}
    }
    try { await ffmpeg.deleteFile(outputPath); } catch (error) {}
    if (workerUrl) URL.revokeObjectURL(workerUrl);
    ffmpeg.terminate();
  }
}

self.onmessage = async function (event) {
  const data = event.data;
  if (!data || data.type !== 'PROCESS') return;

  const { requestId, fileSize, engine } = data;
  let { buffer, fileName, fileType } = data;
  let inputBuffer = buffer;
  let outputName = fileName;
  let outputType = fileType;
  let rateControlReport = { performed: false };

  try {
    if (!globalThis.ADJNVideoProcessor?.processVideoDirect) {
      throw new Error('ADJN engine not loaded in worker.');
    }

    let sourceBytes = new Uint8Array(buffer);
    let sourceInfo = null;
    let sourceHdr = null;
    try {
      sourceInfo = globalThis.ADJNOriginalMp4Core?.inspectMediaInfo(sourceBytes) || null;
      if (sourceInfo) sourceHdr = globalThis.ADJNVideoProcessor.detectHdrProfile(sourceBytes, sourceInfo);
    } catch (error) {}

    if (sourceInfo) {
      globalThis.ADJNVideoProcessor.validateMediaInfo(sourceInfo);
      if (sourceHdr?.hdr10 || sourceHdr?.hdr10plus || sourceHdr?.hlg || sourceHdr?.dolbyVision) {
        throw new Error('hdr_video_not_supported');
      }
    }

    const videoTrack = sourceInfo?.tracks?.find((track) => track.handler === 'vide');
    const duration = Number(data.duration) || (videoTrack?.duration && videoTrack?.timescale
      ? videoTrack.duration / videoTrack.timescale
      : 0);
    const averageBitrate = duration > 0 ? (fileSize * 8) / duration : 0;
    const sourceFps = Number(sourceInfo?.maxFps || sourceInfo?.averageFps || 30);
    const needsRateControl = averageBitrate >= TRANSCODE_BITRATE_THRESHOLD || Boolean(sourceInfo && (
      Math.max(sourceInfo.width, sourceInfo.height) > 1920 || sourceFps > 60.01
    ));

    if (needsRateControl) {
      if (!data.file) throw new Error('LOCAL_RATE_CONTROL_FILE_REQUIRED');
      sourceBytes = null;
      buffer = null;
      inputBuffer = null;
      data.buffer = null;
      try {
        const encoded = await transcodeSdrForPlayback(
          data.file,
          sourceInfo,
          (label, progress, detail) => self.postMessage({ type: 'STAGE', requestId, label, progress, detail })
        );
        inputBuffer = encoded.buffer;
        outputName = `${String(fileName || 'video').replace(/\.[^.]+$/, '')}-optimized.mp4`;
        outputType = 'video/mp4';
        rateControlReport = {
          performed: true,
          durationSeconds: duration,
          sourceBitrate: Math.round(averageBitrate),
          outputAverageBitrate: duration > 0 ? Math.round((encoded.buffer.byteLength * 8) / duration) : null,
          sourceResolution: sourceInfo ? `${sourceInfo.width}x${sourceInfo.height}` : 'unknown',
          sourceFps: Math.round(sourceFps),
          outputBitrateCap: encoded.maxRate,
          outputFps: encoded.fps,
        };
      } catch (error) {
        throw new Error(`LOCAL_RATE_CONTROL_FAILED: ${error?.message || String(error)}`);
      }
    }

    const result = await globalThis.ADJNVideoProcessor.processVideoDirect(
      {
        requestId,
        buffer: inputBuffer,
        fileName: outputName,
        fileType: outputType,
        fileSize: inputBuffer.byteLength,
        engine,
      },
      (label, progress, detail, key) => {
        // Send progress back to main thread without transferring ownership
        const adjustedProgress = rateControlReport.performed ? 50 + Math.round(progress * 0.5) : progress;
        self.postMessage({ type: 'STAGE', requestId, label, progress: adjustedProgress, detail, key });
      }
    );

    // Transfer the output buffer to avoid copying large ArrayBuffer
    const output = result.output instanceof Uint8Array
      ? result.output.buffer.slice(result.output.byteOffset, result.output.byteOffset + result.output.byteLength)
      : result.output;

    self.postMessage({
      type: 'DONE',
      requestId,
      output,
      outputMime: result.outputMime,
      outputInfo: result.outputInfo || result.info,
      outputHdr: result.outputHdr || result.hdr,
      passthrough: !!result.passthrough,
      mode: result.mode,
      report: result.report || null,
      rateControlReport,
      inputBytes: result.inputBytes
    }, [output]);

  } catch (err) {
    self.postMessage({
      type: 'ERROR',
      requestId,
      message: err?.message || String(err)
    });
  }
};

// Signal ready
self.postMessage({ type: 'READY' });
