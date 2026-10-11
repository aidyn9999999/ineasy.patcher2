// Dedicated 4K SDR fallback for browsers whose WebCodecs H.264 encoder rejects 4K.
 // The primary MediaBunny CFR converter and ADJN processing files are intentionally untouched.
const FFMPEG_VERSION = '0.12.10';
const MAX_INPUT_BYTES = 500 * 1024 * 1024;
const MAX_SIDE = 4096;
const MAX_SHORT_SIDE = 2304;
const TARGET_FPS = '60000/1001';

function throwIfAborted(signal) {
  if (signal?.aborted) throw new Error('processing_cancelled');
}

async function fetchBlobAsset(url, mimeType, signal) {
  throwIfAborted(signal);
  const response = await fetch(url, { signal, cache: 'force-cache', mode: 'cors' });
  if (!response.ok) throw new Error('ffmpeg_4k_asset_download_failed: ' + response.status);
  const bytes = await response.arrayBuffer();
  throwIfAborted(signal);
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

function containsHdrSignals(bytes) {
  const decoder = new TextDecoder('latin1');
  const windowSize = 16 * 1024 * 1024;
  const ranges = [[0, Math.min(bytes.length, windowSize)]];
  if (bytes.length > windowSize) ranges.push([Math.max(windowSize, bytes.length - windowSize), bytes.length]);

  for (const [start, end] of ranges) {
    const chunk = bytes.subarray(start, end);
    const text = decoder.decode(chunk).toLowerCase();
    if (/smpte.?2084|arib.?std.?b67|bt.?2020|dolby.?vision|dvh1|dvhe|dvc[cC]|dvv[cC]|hdr10|hlg/.test(text)) return true;

    // ISO-BMFF 'colr'/'nclx' stores colour primaries, transfer, and matrix as 16-bit codes.
    let at = text.indexOf('nclx');
    while (at >= 0 && at + 10 < chunk.length) {
      const primaries = (chunk[at + 4] << 8) | chunk[at + 5];
      const transfer = (chunk[at + 6] << 8) | chunk[at + 7];
      if (primaries === 9 || transfer === 16 || transfer === 18) return true; // BT.2020, PQ, HLG
      at = text.indexOf('nclx', at + 4);
    }

    // HEVC Main 10/10-bit profiles are kept off the SDR x264 fallback.
    at = text.indexOf('hvcc');
    while (at >= 0 && at + 6 < chunk.length) {
      const profileIdc = chunk[at + 5] & 0x1f;
      if (profileIdc === 2 || profileIdc === 3) return true;
      at = text.indexOf('hvcc', at + 4);
    }
  }
  return false;
}

function fileExtension(name) {
  const extension = String(name || '').toLowerCase().match(/\.(mp4|m4v|mov)$/)?.[1];
  return extension || '';
}

/**
 * Actual FFmpeg-wasm frame conversion for 4K SDR AVC/8-bit HEVC sources.
 * It accepts inputs up to 4096x2304, including 4K sources up to 120 fps, and
 * produces a real constant 60000/1001 fps (59.94) MP4 without scaling the frame.
 * HDR/BT.2020/PQ/HLG and HEVC Main10 inputs are intentionally rejected here.
 */
export async function convertVideoToExact5994FpsWithFFmpeg(inputBlob, dimensions, duration, signal, onProgress) {
  throwIfAborted(signal);
  if (!inputBlob || !inputBlob.size || inputBlob.size > MAX_INPUT_BYTES) throw new Error('video_file_over_limit');
  const extension = fileExtension(inputBlob.name);
  if (!extension) throw new Error('ffmpeg_4k_source_format_unsupported');

  // Read and inspect the source before downloading the ~31 MB FFmpeg core.
  const inputBytes = new Uint8Array(await inputBlob.arrayBuffer());
  throwIfAborted(signal);
  const mediaCore = globalThis.ADJNOriginalMp4Core || globalThis.FRYOriginalMp4Core;
  if (!mediaCore?.inspectMediaInfo) throw new Error('fps_encoder_verification_unavailable');

  let sourceInfo;
  try {
    sourceInfo = mediaCore.inspectMediaInfo(inputBytes);
  } catch (_) {
    throw new Error('ffmpeg_4k_source_format_unsupported');
  }
  const width = Number(sourceInfo.width || dimensions?.width);
  const height = Number(sourceInfo.height || dimensions?.height);
  if (!width || !height || Math.max(width, height) > MAX_SIDE || Math.min(width, height) > MAX_SHORT_SIDE) {
    throw new Error('video_resolution_over_4k');
  }
  if (!['avc', 'hevc'].includes(String(sourceInfo.codecFamily || '').toLowerCase())) {
    throw new Error('ffmpeg_4k_source_format_unsupported');
  }
  if (containsHdrSignals(inputBytes)) {
    throw new Error('ffmpeg_4k_hdr_unsafe');
  }

  onProgress?.(0.02);
  const ffmpegPackageUrl = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@' + FFMPEG_VERSION + '/dist/esm/index.js';
  const coreBaseUrl = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@' + FFMPEG_VERSION + '/dist/umd';
  const [{ FFmpeg }, coreURL, wasmURL] = await Promise.all([
    import(ffmpegPackageUrl),
    fetchBlobAsset(coreBaseUrl + '/ffmpeg-core.js', 'text/javascript', signal),
    fetchBlobAsset(coreBaseUrl + '/ffmpeg-core.wasm', 'application/wasm', signal)
  ]);
  throwIfAborted(signal);
  if (!FFmpeg) throw new Error('ffmpeg_4k_api_unavailable');

  const ffmpeg = new FFmpeg();
  let coreBlobUrl = coreURL;
  let wasmBlobUrl = wasmURL;
  let inputFileName = 'ineasy-source' + extension;
  const outputFileName = 'ineasy-4k-cfr.mp4';
  let aborted = false;
  const handleAbort = () => {
    aborted = true;
    try { ffmpeg.terminate(); } catch (_) {}
  };
  const handleLog = ({ message }) => {
    const line = String(message || '');
    const match = line.match(/time=(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
    const totalDuration = Number(duration);
    if (match && totalDuration > 0) {
      const processedSeconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      onProgress?.(Math.max(0.05, Math.min(0.96, processedSeconds / totalDuration)));
    }
  };
  const handleProgress = ({ progress }) => {
    // ffmpeg.wasm documents its progress event as experimental; logs above are the main signal.
    if (Number.isFinite(progress)) onProgress?.(Math.max(0.05, Math.min(0.96, progress)));
  };
  signal?.addEventListener('abort', handleAbort, { once: true });

  try {
    ffmpeg.on('log', handleLog);
    ffmpeg.on('progress', handleProgress);
    onProgress?.(0.04);
    await ffmpeg.load({ coreURL: coreBlobUrl, wasmURL: wasmBlobUrl });
    throwIfAborted(signal);
    if (aborted) throw new Error('processing_cancelled');
    onProgress?.(0.08);
    await ffmpeg.writeFile(inputFileName, inputBytes);
    throwIfAborted(signal);
    onProgress?.(0.12);

    // fps filter performs real frame drop/duplication to CFR; no resize filter is used.
    const code = await ffmpeg.exec([
      '-hide_banner', '-y',
      '-i', inputFileName,
      '-map', '0:v:0',
      '-map', '0:a?',
      '-map_metadata', '0',
      '-vf', 'fps=' + TARGET_FPS,
      '-fps_mode', 'cfr',
      '-r', TARGET_FPS,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '18',
      '-maxrate', '45M',
      '-bufsize', '90M',
      '-profile:v', 'high',
      '-level:v', '5.2',
      '-pix_fmt', 'yuv420p',
      '-tag:v', 'avc1',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      outputFileName
    ]);
    throwIfAborted(signal);
    if (aborted) throw new Error('processing_cancelled');
    if (code !== 0) throw new Error('ffmpeg_4k_exec_failed: exit=' + code);

    const outputBytes = await ffmpeg.readFile(outputFileName);
    if (!(outputBytes instanceof Uint8Array) || outputBytes.byteLength < 64) {
      throw new Error('fps_encoder_empty_output');
    }
    if (outputBytes.byteLength > MAX_INPUT_BYTES) throw new Error('video_file_over_limit');

    const verified = mediaCore.inspectMediaInfo(outputBytes);
    const actualFps = Number(verified?.averageFps);
    if (!Number.isFinite(actualFps) || Math.abs(actualFps - 60000 / 1001) > 0.03) {
      throw new Error('fps_encoder_verification_failed: reported=' + String(actualFps));
    }
    if (Math.abs(Number(verified.width) - width) > 0 || Math.abs(Number(verified.height) - height) > 0) {
      throw new Error('ffmpeg_4k_resolution_verification_failed');
    }

    const blob = new Blob([outputBytes], { type: 'video/mp4' });
    console.info('[INEASY] FFmpeg 4K SDR fallback verified', {
      inputCodec: sourceInfo.codec || 'unknown',
      outputCodec: verified.codec || 'unknown',
      inputResolution: width + 'x' + height,
      outputResolution: verified.width + 'x' + verified.height,
      outputFps: actualFps,
      encoder: 'FFmpeg.wasm libx264',
      sourceHdrFallback: false
    });
    onProgress?.(1);
    return {
      blob,
      info: verified,
      fps: actualFps,
      sourceFps: sourceInfo.averageFps || null,
      preserveOriginal: false,
      hdr: false,
      hdrTranscoded: false,
      main10Transcoded: false,
      hdrProfile: null
    };
  } catch (error) {
    if (signal?.aborted || aborted || /processing_cancelled|AbortError/i.test(String(error?.message || ''))) {
      throw new Error('processing_cancelled');
    }
    const message = String(error?.message || error || 'unknown_error').slice(0, 400);
    if (/ffmpeg_4k_hdr_unsafe|ffmpeg_4k_source_format_unsupported|video_file_over_limit|fps_encoder_empty_output|fps_encoder_verification_failed|ffmpeg_4k_resolution_verification_failed/.test(message)) {
      throw new Error(message);
    }
    throw new Error('ffmpeg_4k_fallback_failed: ' + message);
  } finally {
    signal?.removeEventListener('abort', handleAbort);
    try { ffmpeg.terminate(); } catch (_) {}
    if (coreBlobUrl) URL.revokeObjectURL(coreBlobUrl);
    if (wasmBlobUrl) URL.revokeObjectURL(wasmBlobUrl);
  }
}
