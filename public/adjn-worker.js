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

async function transcodeSdrForPlayback(file, sourceFps, onProgress) {
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

    const filters = ["scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2"];
    if (sourceFps > 60.01) filters.push('fps=60');
    filters.push('format=yuv420p');

    ffmpeg.on('progress', ({ progress }) => {
      if (Number.isFinite(progress)) {
        onProgress('Preparing video locally…', Math.max(8, Math.min(48, 8 + Math.round(progress * 40))), 'Reducing decode load');
      }
    });

    const exitCode = await ffmpeg.exec([
      '-hide_banner', '-y', '-i', inputPath,
      '-map', '0:v:0', '-map', '0:a:0?', '-vf', filters.join(','),
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'fastdecode',
      '-crf', '20', '-maxrate', '10M', '-bufsize', '20M', '-pix_fmt', 'yuv420p',
      '-fps_mode', 'vfr', '-c:a', 'aac', '-b:a', '192k', '-sn', '-dn',
      '-map_metadata', '0', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-colorspace', 'bt709', '-color_range', 'tv', '-movflags', '+faststart', outputPath,
    ], 9 * 60 * 1000);
    if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}.`);

    const converted = await ffmpeg.readFile(outputPath);
    if (!(converted instanceof Uint8Array) || converted.byteLength < 64) {
      throw new Error('FFmpeg returned an invalid MP4.');
    }
    onProgress('Video prepared; applying ADJN patch…', 50, 'Using the original ADJN patcher');
    return converted.buffer.slice(converted.byteOffset, converted.byteOffset + converted.byteLength);
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

  try {
    if (!globalThis.ADJNVideoProcessor?.processVideoDirect) {
      throw new Error('ADJN engine not loaded in worker.');
    }

    let sourceInfo = null;
    try {
      sourceInfo = globalThis.ADJNOriginalMp4Core?.inspectMediaInfo(new Uint8Array(buffer)) || null;
    } catch (error) {}

    if (sourceInfo) {
      globalThis.ADJNVideoProcessor.validateMediaInfo(sourceInfo);
      const hdr = globalThis.ADJNVideoProcessor.detectHdrProfile(new Uint8Array(buffer), sourceInfo);
      if (hdr?.hdr10 || hdr?.hdr10plus || hdr?.hlg || hdr?.dolbyVision) {
        throw new Error('hdr_video_not_supported');
      }
    }

    const videoTrack = sourceInfo?.tracks?.find((track) => track.handler === 'vide');
    const duration = Number(data.duration) || (videoTrack?.duration && videoTrack?.timescale
      ? videoTrack.duration / videoTrack.timescale
      : 0);
    const sourceBitrate = duration > 0 ? (fileSize * 8) / duration : 0;
    const sourceFps = Number(sourceInfo?.maxFps || sourceInfo?.averageFps || 0);
    const needsPreparation = sourceBitrate >= TRANSCODE_BITRATE_THRESHOLD || Boolean(sourceInfo && (
      Math.max(sourceInfo.width, sourceInfo.height) > 1920 ||
      sourceFps > 60.01
    ));
    let transcodeReport = { performed: false, sourceBitrate: Math.round(sourceBitrate) };

    if (needsPreparation) {
      buffer = null;
      buffer = await transcodeSdrForPlayback(
        data.file,
        sourceFps,
        (label, progress, detail) => self.postMessage({ type: 'STAGE', requestId, label, progress, detail })
      );
      fileName = `${String(fileName || 'video').replace(/\.[^.]+$/, '')}-prepared.mp4`;
      fileType = 'video/mp4';
      transcodeReport = {
        performed: true,
        sourceBitrate: Math.round(sourceBitrate),
        outputCodec: 'H.264',
        outputMaxBitrate: 10_000_000,
        outputMaxDimension: 1920,
        outputFps: Math.min(60, Math.round(sourceFps || 60)),
      };
    }

    const result = await globalThis.ADJNVideoProcessor.processVideoDirect(
      { requestId, buffer, fileName, fileType, fileSize: needsPreparation ? buffer.byteLength : fileSize, engine },
      (label, progress, detail, key) => {
        // Send progress back to main thread without transferring ownership
        const adjustedProgress = needsPreparation ? 50 + Math.round(progress * 0.5) : progress;
        self.postMessage({ type: 'STAGE', requestId, label, progress: adjustedProgress, detail, key });
      }
    );

    const outputView = result.output;
    const output = outputView instanceof Uint8Array
      ? outputView.byteOffset === 0 && outputView.byteLength === outputView.buffer.byteLength
        ? outputView.buffer
        : outputView.buffer.slice(outputView.byteOffset, outputView.byteOffset + outputView.byteLength)
      : outputView;

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
      transcodeReport,
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
