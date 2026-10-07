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
const FFMPEG_MODULE_URL = `${FFMPEG_PACKAGE_BASE}/dist/esm/index.js`;
const FFMPEG_UTIL_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js';
const FFMPEG_CORE_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
const TRANSCODE_BITRATE_THRESHOLD = 15_000_000;

async function createFfmpegWorkerURL() {
  const response = await fetch(`${FFMPEG_PACKAGE_BASE}/dist/esm/worker.js`);
  if (!response.ok) throw new Error(`Could not load local converter worker (${response.status}).`);
  let source = await response.text();
  source = source
    .replaceAll('from "./const.js"', `from "${FFMPEG_PACKAGE_BASE}/dist/esm/const.js"`)
    .replaceAll('from "./errors.js"', `from "${FFMPEG_PACKAGE_BASE}/dist/esm/errors.js"`);
  if (source.includes('from "./const.js"') || source.includes('from "./errors.js"')) {
    throw new Error('Could not prepare the local converter worker module.');
  }
  return URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
}

async function transcodeForPlayback(file, hdrSource, onProgress) {
  if (!file || typeof File !== 'function') throw new Error('Local source file is unavailable for conversion.');

  onProgress('Loading local converter…', 8, 'FFmpeg core downloads on demand (~31 MB)');
  const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
    import(FFMPEG_MODULE_URL),
    import(FFMPEG_UTIL_URL),
  ]);

  await ffmpeg.createDir('/source');
  const ffmpeg = new FFmpeg();
  let mounted = false;
  let classWorkerURL = null;
  const outputPath = 'output.mp4';
  const sourcePath = `/source/${file.name.replace(/[\\/]/g, '_') || 'input.mp4'}`;
  try {
    classWorkerURL = await createFfmpegWorkerURL();
    try {
      await ffmpeg.load({
        classWorkerURL,
        coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    } finally {
      URL.revokeObjectURL(classWorkerURL);
      classWorkerURL = null;
    }

    await ffmpeg.mount('WORKERFS', { files: [file] }, '/source');
    mounted = true;

    const scaleFilter = "scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2";
    const videoFilter = hdrSource
      ? `zscale=t=linear:npl=100,format=gbrpf32le,tonemap=tonemap=hable:desat=0,zscale=p=bt709:t=bt709:m=bt709:r=tv,${scaleFilter},fps=60,format=yuv420p`
      : `${scaleFilter},fps=60,format=yuv420p`;

    ffmpeg.on('progress', ({ progress }) => {
      if (Number.isFinite(progress)) {
        const percent = Math.max(8, Math.min(48, 8 + Math.round(progress * 40)));
        onProgress('Preparing video locally…', percent, hdrSource ? 'HDR to SDR tone mapping' : 'Reducing bitrate for smoother decoding');
      }
    });

    const exitCode = await ffmpeg.exec([
      '-hide_banner', '-y', '-i', sourcePath,
      '-map', '0:v:0', '-map', '0:a:0?',
      '-vf', videoFilter,
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'fastdecode',
      '-crf', '20', '-maxrate', '10M', '-bufsize', '20M', '-pix_fmt', 'yuv420p',
      '-fps_mode', 'cfr',
      '-c:a', 'aac', '-b:a', '192k',
      '-sn', '-dn', '-map_metadata', '0',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
      '-movflags', '+faststart', outputPath,
    ], 9 * 60 * 1000);
    if (exitCode !== 0) throw new Error(`Local video conversion failed (FFmpeg ${exitCode}).`);

    const converted = await ffmpeg.readFile(outputPath);
    if (!(converted instanceof Uint8Array) || converted.byteLength < 64) {
      throw new Error('Local video conversion produced an invalid MP4.');
    }
    onProgress('Video prepared; applying ADJN patch…', 50, 'Converted MP4 is passed to the existing patcher');
    return converted.buffer.slice(converted.byteOffset, converted.byteOffset + converted.byteLength);
  } finally {
    if (mounted) {
      try { await ffmpeg.unmount('/source'); } catch (error) {}
      try { await ffmpeg.deleteDir('/source'); } catch (error) {}
    }
    try { await ffmpeg.deleteFile(outputPath); } catch (error) {}
    if (classWorkerURL) URL.revokeObjectURL(classWorkerURL);
    ffmpeg.terminate();
  }
}

self.onmessage = async function (event) {
  const data = event.data;
  if (!data || data.type !== 'PROCESS') return;

  const { requestId, fileName, fileType, fileSize, engine } = data;
  let buffer = null;

  try {
    if (!globalThis.ADJNVideoProcessor?.processVideoDirect) {
      throw new Error('ADJN engine not loaded in worker.');
    }
    if (!data.file) throw new Error('LOCAL_SOURCE_FILE_REQUIRED');
    buffer = await data.file.arrayBuffer();

    let sourceBytes = new Uint8Array(buffer);
    let sourceInfo = null;
    let sourceHdr = null;
    try {
      sourceInfo = globalThis.ADJNOriginalMp4Core?.inspectMediaInfo(sourceBytes) || null;
      if (sourceInfo) sourceHdr = globalThis.ADJNVideoProcessor.detectHdrProfile(sourceBytes, sourceInfo);
    } catch (error) {}
    if (sourceInfo) globalThis.ADJNVideoProcessor.validateMediaInfo(sourceInfo);
    const videoTrack = sourceInfo?.tracks?.find((track) => track.handler === 'vide');
    const duration = Number(data.duration) || (videoTrack?.duration && videoTrack?.timescale
      ? videoTrack.duration / videoTrack.timescale
      : 0);
    const sourceBitrate = duration > 0 ? (fileSize * 8) / duration : 0;
    const hdrDetected = Boolean(sourceHdr && (sourceHdr.hdr10 || sourceHdr.hdr10plus || sourceHdr.hlg || sourceHdr.dolbyVision));
    const highDecodeLoad = Boolean(sourceInfo && (
      Math.max(sourceInfo.width, sourceInfo.height) > 1920 || Number(sourceInfo.maxFps) > 60.01
    ));
    const shouldTranscode = hdrDetected || sourceBitrate >= TRANSCODE_BITRATE_THRESHOLD || highDecodeLoad;
    let transcodeReport = {
      performed: false,
      sourceHdr: sourceHdr?.label || 'SDR / unknown',
      sourceBitrate: Math.round(sourceBitrate),
    };

    if (shouldTranscode) {
      sourceBytes = null;
      buffer = null;
      try {
        buffer = await transcodeForPlayback(
          data.file,
          hdrDetected,
          (label, progress, detail) => self.postMessage({ type: 'STAGE', requestId, label, detail, progress })
        );
      } catch (error) {
        throw new Error(`LOCAL_TRANSCODE_FAILED: ${error?.message || String(error)}`);
      }
      transcodeReport = {
        performed: true,
        sourceHdr: sourceHdr?.label || 'SDR / unknown',
        sourceBitrate: Math.round(sourceBitrate),
        outputHdr: 'SDR / BT.709',
        outputBitrateCap: 10_000_000,
        outputMaxDimension: 1920,
        outputFps: 60,
      };
    }

    const result = await globalThis.ADJNVideoProcessor.processVideoDirect(
      {
        requestId,
        buffer,
        fileName: shouldTranscode ? `${String(fileName || 'video').replace(/\.[^.]+$/, '')}-sdr.mp4` : fileName,
        fileType: shouldTranscode ? 'video/mp4' : fileType,
        fileSize: shouldTranscode ? buffer.byteLength : fileSize,
        engine,
      },
      (label, progress, detail, key) => {
        // Send progress back to main thread without transferring ownership
        const adjustedProgress = shouldTranscode ? 50 + Math.round(progress * 0.5) : progress;
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
