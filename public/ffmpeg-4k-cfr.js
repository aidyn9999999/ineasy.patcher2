// Dedicated 4K SDR fallback for browsers whose WebCodecs H.264 encoder rejects 4K.
 // The primary MediaBunny CFR converter and ADJN processing files are intentionally untouched.
const FFMPEG_VERSION = '0.12.10';
const MAX_INPUT_BYTES = 500 * 1024 * 1024;
const MAX_SIDE = 4096;
const MAX_SHORT_SIDE = 2304;
const TARGET_FPS = '60000/1001';
const FFMPEG_PACKAGE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@' + FFMPEG_VERSION + '/dist/esm/index.js';
const FFMPEG_CORE_VERSION = '0.12.10';
// The class worker is an ES module worker, so the core must also be the ESM build.
// Supplying a UMD URL explicitly prevents ffmpeg.wasm from auto-switching to /esm.
const FFMPEG_CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@' + FFMPEG_CORE_VERSION + '/dist/esm';

let ffmpegRuntime = null;
let ffmpegRuntimePromise = null;

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

function loadFFmpegRuntime() {
  if (!ffmpegRuntimePromise) {
    ffmpegRuntimePromise = Promise.all([
      import(FFMPEG_PACKAGE_URL),
      fetchBlobAsset(FFMPEG_CORE_BASE_URL + '/ffmpeg-core.js', 'text/javascript'),
      fetchBlobAsset(FFMPEG_CORE_BASE_URL + '/ffmpeg-core.wasm', 'application/wasm')
    ]).then(([module, coreURL, wasmURL]) => {
      if (!module?.FFmpeg) {
        URL.revokeObjectURL(coreURL);
        URL.revokeObjectURL(wasmURL);
        throw new Error('ffmpeg_4k_api_unavailable');
      }
      ffmpegRuntime = { FFmpeg: module.FFmpeg, coreURL, wasmURL, ffmpegInstance: null, ffmpegLoadPromise: null };
      return ffmpegRuntime;
    }).catch((error) => {
      ffmpegRuntimePromise = null;
      throw error;
    });
  }
  return ffmpegRuntimePromise;
}

// Warm the FFmpeg module and WASM core while the user prepares a selected 4K video.
export async function preloadFFmpeg4k() {
  try {
    const runtime = await loadFFmpegRuntime();
    if (!runtime.ffmpegLoadPromise) {
      const classWorkerURL = new URL('/ffmpeg/worker.js', window.location.origin).href;
      const instance = new runtime.FFmpeg();
      runtime.ffmpegInstance = instance;
      runtime.ffmpegLoadPromise = instance.load({
        coreURL: runtime.coreURL,
        wasmURL: runtime.wasmURL,
        classWorkerURL
      }).then(() => true).catch((error) => {
        try { instance.terminate(); } catch (_) {}
        if (runtime.ffmpegInstance === instance) runtime.ffmpegInstance = null;
        runtime.ffmpegLoadPromise = null;
        throw error;
      });
    }
    await runtime.ffmpegLoadPromise;
    return true;
  } catch (error) {
    console.warn('[INEASY] 4K FFmpeg pre-load deferred:', error?.message || error);
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (ffmpegRuntime?.coreURL) URL.revokeObjectURL(ffmpegRuntime.coreURL);
    if (ffmpegRuntime?.wasmURL) URL.revokeObjectURL(ffmpegRuntime.wasmURL);
    ffmpegRuntime = null;
    ffmpegRuntimePromise = null;
  }, { once: true });
}

function readTopLevelBoxes(bytes) {
  const boxes = [];
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    let size = new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getUint32(0, false);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > bytes.length) return [];
      const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 16);
      size = view.getUint32(8, false) * 4294967296 + view.getUint32(12, false);
      header = 16;
    } else if (size === 0) {
      size = bytes.length - offset;
    }
    if (!Number.isSafeInteger(size) || size < header || offset + size > bytes.length) return [];
    const type = String.fromCharCode(
      bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]
    );
    boxes.push({ type, start: offset, end: offset + size, header });
    offset += size;
  }
  return offset === bytes.length ? boxes : [];
}

function findValidBoxTypes(bytes, start, end, type) {
  const found = [];
  const encoded = [type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)];
  for (let at = start + 4; at + 4 <= end; at++) {
    if (bytes[at] !== encoded[0] || bytes[at + 1] !== encoded[1] ||
        bytes[at + 2] !== encoded[2] || bytes[at + 3] !== encoded[3]) continue;
    const boxStart = at - 4;
    const available = end - boxStart;
    if (available < 8) continue;
    let size = new DataView(bytes.buffer, bytes.byteOffset + boxStart, 8).getUint32(0, false);
    let header = 8;
    if (size === 1) {
      if (available < 16) continue;
      const view = new DataView(bytes.buffer, bytes.byteOffset + boxStart, 16);
      size = view.getUint32(8, false) * 4294967296 + view.getUint32(12, false);
      header = 16;
    } else if (size === 0) {
      continue; // A size-to-end pseudo-box is not expected inside moov sample entries.
    }
    if (!Number.isSafeInteger(size) || size < header || size > available) continue;
    found.push({ type, start: boxStart, typeOffset: at, payloadStart: boxStart + header, end: boxStart + size, size, header });
    at += 3;
  }
  return found;
}

// Inspect only structurally valid codec/color boxes within moov. Never scan the
// compressed mdat payload as text: random encoded pixels frequently contain byte
// sequences that look like "bt2020", "nclx" or "hvcC" and must not trigger HDR.
function inspectSourceColorProfile(bytes, sourceInfo) {
  const boxes = readTopLevelBoxes(bytes);
  const moov = boxes.find((box) => box.type === 'moov');
  const result = { hdr: false, tenBit: false, reason: '', displayColor: 'unknown' };
  if (!moov) return result;

  const moovStart = moov.start + moov.header;
  const moovEnd = moov.end;
  const codec = String(sourceInfo?.codecFamily || sourceInfo?.codec || '').toLowerCase();
  const isHevc = codec === 'hevc' || /^(hvc1|hev1|hvc2|hev2|dvh1|dvhe)$/i.test(String(sourceInfo?.codec || ''));
  const isAvc = codec === 'avc' || /^(avc1|avc3)$/i.test(String(sourceInfo?.codec || ''));

  if (isHevc) {
    for (const box of findValidBoxTypes(bytes, moovStart, moovEnd, 'hvcC')) {
      if (box.end - box.payloadStart < 23 || bytes[box.payloadStart] !== 1) continue;
      const profileIdc = bytes[box.payloadStart + 1] & 0x1f;
      if (profileIdc === 2) {
        result.tenBit = true; // HEVC Main 10 profile, whether HDR or SDR.
        result.reason = 'HEVC Main 10 profile';
      }
    }
    for (const tag of ['dvcC', 'dvvC']) {
      const configs = findValidBoxTypes(bytes, moovStart, moovEnd, tag);
      if (configs.some((box) => box.end - box.payloadStart >= 2 && bytes[box.payloadStart] === 1)) {
        result.hdr = true;
        result.reason = 'Dolby Vision configuration box ' + tag;
        return result;
      }
    }
  }

  if (isAvc) {
    for (const box of findValidBoxTypes(bytes, moovStart, moovEnd, 'avcC')) {
      if (box.end - box.payloadStart < 4 || bytes[box.payloadStart] !== 1) continue;
      const profileIdc = bytes[box.payloadStart + 1];
      if ([110, 122, 144, 244].includes(profileIdc)) {
        result.tenBit = true;
        result.reason = 'AVC high-bit-depth profile ' + profileIdc;
      }
    }
  }

  if (isAvc || isHevc) {
    for (const box of findValidBoxTypes(bytes, moovStart, moovEnd, 'colr')) {
      const p = box.payloadStart;
      if (p + 11 > box.end) continue;
      const subtype = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]);
      if (subtype !== 'nclx' && subtype !== 'nclc') continue;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const primaries = view.getUint16(p + 4, false);
      const transfer = view.getUint16(p + 6, false);
      if (primaries === 9 && transfer === 16) {
        result.hdr = true;
        result.displayColor = 'BT.2020 / PQ (HDR10)';
        result.reason = 'ISO BMFF colr/nclx specifies BT.2020 + PQ';
        return result;
      }
      if (primaries === 9 && transfer === 18) {
        result.hdr = true;
        result.displayColor = 'BT.2020 / HLG';
        result.reason = 'ISO BMFF colr/nclx specifies BT.2020 + HLG';
        return result;
      }
      if (primaries === 9) result.displayColor = 'BT.2020 / non-HDR transfer';
    }
  }
  return result;
}

export async function inspectHDRVideo(inputBlob) {
  if (!inputBlob || !inputBlob.size || inputBlob.size > MAX_INPUT_BYTES) {
    return { hdr: false, reason: 'file_size_unavailable' };
  }
  const extension = fileExtension(inputBlob.name);
  if (!extension) return { hdr: false, reason: 'unsupported_container' };
  try {
    const bytes = new Uint8Array(await inputBlob.arrayBuffer());
    const mediaCore = globalThis.ADJNOriginalMp4Core || globalThis.FRYOriginalMp4Core;
    if (!mediaCore?.inspectMediaInfo) return { hdr: false, reason: 'media_inspector_unavailable' };
    const info = mediaCore.inspectMediaInfo(bytes);
    const profile = inspectSourceColorProfile(bytes, info);
    return {
      ...profile,
      codec: info.codec || '',
      codecFamily: info.codecFamily || '',
      width: Number(info.width) || null,
      height: Number(info.height) || null,
      hdrType: /Dolby Vision/i.test(profile.reason) ? 'dolby-vision' :
        /HLG/i.test(profile.displayColor) ? 'hlg' :
        /PQ|HDR10/i.test(profile.displayColor) ? 'pq' : 'unknown',
      label: profile.displayColor || 'HDR / 10-bit'
    };
  } catch (error) {
    console.warn('[INEASY] HDR metadata inspection inconclusive:', error?.message || error);
    return { hdr: false, reason: 'metadata_inspection_inconclusive' };
  }
}

function fileExtension(name) {
  const extension = String(name || '').toLowerCase().match(/\.(mp4|m4v|mov)$/)?.[1];
  return extension || '';
}

/**
 * FFmpeg-wasm CFR conversion for 4K SDR and explicit HDR10/HLG Main10 paths.
 * It accepts inputs up to 4096x2304, including 4K sources up to 120 fps, and
 * produces a real constant 60000/1001 fps (59.94) MP4 without scaling the frame.
 * Explicit HDR conversion uses HEVC Main10 and retains PQ/HLG signaling; Dolby Vision
 * is rejected because dynamic metadata cannot be preserved by this re-encode.
 */
export async function convertVideoToExact5994FpsWithFFmpeg(inputBlob, dimensions, duration, signal, onProgress, options = {}) {
  throwIfAborted(signal);
  if (!inputBlob || !inputBlob.size || inputBlob.size > MAX_INPUT_BYTES) throw new Error('video_file_over_limit');
  const extension = fileExtension(inputBlob.name);
  if (!extension) throw new Error('ffmpeg_4k_source_format_unsupported');

  // Start loading FFmpeg while the local 4K file is read and inspected.
  const runtimePromise = loadFFmpegRuntime();
  runtimePromise.catch(() => {});
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
  // Browser metadata represents the displayed orientation; ADJN tkhd dimensions can
  // still represent coded orientation for phone-recorded clips. FFmpeg auto-rotates
  // to display orientation, so validate against the dimensions shown in the preview.
  const width = Number(dimensions?.width || sourceInfo.width);
  const height = Number(dimensions?.height || sourceInfo.height);
  if (!width || !height || Math.max(width, height) > MAX_SIDE || Math.min(width, height) > MAX_SHORT_SIDE) {
    throw new Error('video_resolution_over_4k: requested=' + width + 'x' + height);
  }
  if (!['avc', 'hevc'].includes(String(sourceInfo.codecFamily || '').toLowerCase())) {
    throw new Error('ffmpeg_4k_source_format_unsupported');
  }
  const colorProfile = inspectSourceColorProfile(inputBytes, sourceInfo);
  const isHdrEncode = options?.hdr === true;
  const hdrType = /HLG/i.test(colorProfile.displayColor) ? 'hlg' : 'pq';
  if (colorProfile.hdr && !isHdrEncode) {
    console.warn('[INEASY] Structured HDR colour metadata detected; SDR path refused:', colorProfile);
    throw new Error('ffmpeg_4k_hdr_unsafe: ' + colorProfile.reason);
  }
  if (isHdrEncode && !colorProfile.hdr) {
    throw new Error('hdr_metadata_not_detected');
  }
  if (isHdrEncode && /Dolby Vision/i.test(colorProfile.reason)) {
    // A plain HEVC re-encode cannot preserve Dolby Vision dynamic metadata.
    throw new Error('hdr_dolby_vision_transcode_unsupported');
  }
  if (isHdrEncode && !['avc', 'hevc'].includes(String(sourceInfo.codecFamily || '').toLowerCase())) {
    throw new Error('hdr_source_codec_unsupported');
  }
  if (colorProfile.tenBit && !isHdrEncode) {
    // Main10/10-bit by itself does not mean HDR. Only explicit PQ/HLG/Dolby Vision
    // metadata above blocks this SDR path. With no such signalling, process the file
    // as SDR and let the existing yuv420p output perform a normal 8-bit SDR conversion.
    console.warn('[INEASY] 10-bit profile detected without explicit HDR signalling; using the SDR conversion path:', colorProfile);
  }

  onProgress?.(0.02);
  const runtime = await runtimePromise;
  throwIfAborted(signal);
  const { FFmpeg, coreURL, wasmURL } = runtime;
  let ffmpeg = runtime.ffmpegInstance || new FFmpeg();
  let coreAlreadyLoaded = false;
  if (runtime.ffmpegLoadPromise) {
    try {
      await runtime.ffmpegLoadPromise;
      coreAlreadyLoaded = runtime.ffmpegInstance === ffmpeg;
    } catch (_) {
      ffmpeg = new FFmpeg();
    }
  }
  let inputFileName = 'ineasy-source' + extension;
  const outputFileName = 'ineasy-4k-cfr.mp4';
  let aborted = false;
  let used1080pFallback = false;
  let stage = 'initialize';
  const recentLogs = [];
  const rememberLog = (value) => {
    const line = String(value || '').replace(/\s+/g, ' ').trim();
    if (!line) return;
    recentLogs.push(line);
    if (recentLogs.length > 40) recentLogs.shift();
  };
  const diagnosticTail = () => recentLogs
    .filter((line) => !/frame=\s*\d+.*fps=/.test(line))
    .slice(-8)
    .join(' | ')
    .slice(-900);
  const handleAbort = () => {
    aborted = true;
    try { ffmpeg.terminate(); } catch (_) {}
  };
  const handleLog = ({ message }) => {
    const line = String(message || '');
    rememberLog(line);
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
    stage = coreAlreadyLoaded ? 'core_ready' : 'load_core';
    onProgress?.(coreAlreadyLoaded ? 0.08 : 0.04);
    // Preload the worker and WASM core while the user chooses processing options.
    // Reuse that initialized instance here to remove FFmpeg startup from processing time.
    const classWorkerURL = new URL('/ffmpeg/worker.js', window.location.origin).href;
    if (!coreAlreadyLoaded) {
      try {
        await ffmpeg.load({ coreURL, wasmURL, classWorkerURL });
      } catch (firstLoadError) {
        const firstLoadMessage = String(firstLoadError?.message || firstLoadError || '');
        if (!/failed to import ffmpeg-core\.js|failed to load ffmpeg-core/i.test(firstLoadMessage)) {
          throw firstLoadError;
        }
        try { ffmpeg.terminate(); } catch (_) {}
        throwIfAborted(signal);
        rememberLog('Retrying FFmpeg core load with pinned CDN URLs after initial core import failure');
        stage = 'load_core_cdn_retry';
        ffmpeg = new FFmpeg();
        ffmpeg.on('log', handleLog);
        ffmpeg.on('progress', handleProgress);
        await ffmpeg.load({
          coreURL: FFMPEG_CORE_BASE_URL + '/ffmpeg-core.js',
          wasmURL: FFMPEG_CORE_BASE_URL + '/ffmpeg-core.wasm',
          classWorkerURL
        });
      }
    }
    throwIfAborted(signal);
    if (aborted) throw new Error('processing_cancelled');
    stage = 'write_input';
    onProgress?.(0.08);
    await ffmpeg.writeFile(inputFileName, inputBytes);
    throwIfAborted(signal);
    stage = 'encode_4k';
    onProgress?.(0.12);

    // Keep the filter graph and encoder to one thread to reduce memory spikes on phones.
    // Do not hard-code an H.264 level: valid 4K/UHD and portrait 4K frame sizes differ.
    // The fps filter performs real drop/duplication to CFR; no scale filter is used.
    let code = await ffmpeg.exec([
      '-hide_banner', '-y',
      '-filter_threads', '1',
      '-i', inputFileName,
      '-map', '0:v:0',
      '-map', '0:a?',
      '-map_metadata', '0',
      '-vf', 'fps=' + TARGET_FPS,
      ...(isHdrEncode ? [] : ['-fps_mode', 'cfr']),
      ...(isHdrEncode
        ? [
            '-c:v', 'libx265',
            '-preset', 'ultrafast',
            '-crf', '22',
            '-threads', '1',
            '-pix_fmt', 'yuv420p10le',
            '-tag:v', 'hvc1',
            '-color_primaries', 'bt2020',
            '-color_trc', hdrType === 'hlg' ? 'arib-std-b67' : 'smpte2084',
            '-colorspace', 'bt2020nc',
            '-x265-params', hdrType === 'hlg' ? 'repeat-headers=1' : 'hdr10=1:repeat-headers=1'
          ]
        : [
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '20',
            '-threads', '1',
            '-pix_fmt', 'yuv420p',
            '-tag:v', 'avc1'
          ]),
      '-c:a', 'aac',
      '-b:a', '160k',
      '-movflags', '+faststart',
      outputFileName
    ]);
    throwIfAborted(signal);
    if (aborted) throw new Error('processing_cancelled');

    // Retry once with the most compatible CFR argument set if the stricter command fails.
    // The fps filter itself guarantees regular 59.94 FPS frames, so -fps_mode is unnecessary here.
    if (code !== 0) {
      const firstAttemptCode = code;
      const firstAttemptLog = diagnosticTail() || 'no FFmpeg log received';
      rememberLog('Retrying once with simplified 4K CFR arguments after exit=' + code);
      stage = 'encode_retry';
      try { await ffmpeg.deleteFile(outputFileName); } catch (_) {}
      code = await ffmpeg.exec([
        '-hide_banner', '-y',
        '-filter_threads', '1',
        '-i', inputFileName,
        '-map', '0:v:0',
        '-map', '0:a?',
        '-map_metadata', '0',
        '-vf', 'fps=' + TARGET_FPS,
        ...(isHdrEncode
          ? [
              '-c:v', 'libx265',
              '-preset', 'ultrafast',
              '-crf', '25',
              '-threads', '1',
              '-pix_fmt', 'yuv420p10le',
              '-tag:v', 'hvc1',
              '-color_primaries', 'bt2020',
              '-color_trc', hdrType === 'hlg' ? 'arib-std-b67' : 'smpte2084',
              '-colorspace', 'bt2020nc',
              '-x265-params', hdrType === 'hlg' ? 'repeat-headers=1' : 'hdr10=1:repeat-headers=1'
            ]
          : [
              '-c:v', 'libx264',
              '-preset', 'ultrafast',
              '-crf', '22',
              '-threads', '1',
              '-pix_fmt', 'yuv420p'
            ]),
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputFileName
      ]);
      throwIfAborted(signal);
      if (aborted) throw new Error('processing_cancelled');
      if (code !== 0) {
        // Last-resort compatibility mode: use the lightweight 1080p encode profile
        // for a 4K input if this browser cannot finish either full-resolution attempt.
        // Keep the source aspect ratio and still perform a real CFR conversion.
        if (isHdrEncode) {
          throw new Error('hdr_hevc10_encode_failed: ' + (diagnosticTail() || 'HEVC Main10 HDR encode returned a non-zero exit code'));
        }
        rememberLog('Trying 1080p compatibility fallback after both full-resolution 4K attempts failed');
        stage = 'encode_1080p_fallback';
        try { await ffmpeg.deleteFile(outputFileName); } catch (_) {}
        code = await ffmpeg.exec([
          '-hide_banner', '-y',
          '-filter_threads', '1',
          '-i', inputFileName,
          '-map', '0:v:0',
          '-map', '0:a?',
          '-map_metadata', '0',
          '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=' + TARGET_FPS,
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '23',
          '-threads', '1',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
          outputFileName
        ]);
        throwIfAborted(signal);
        if (aborted) throw new Error('processing_cancelled');
        if (code !== 0) {
          throw new Error('ffmpeg_4k_exec_failed: exit=' + code +
            '; stage=' + stage + '; detail=' + (diagnosticTail() || '4K and 1080p compatibility encodes failed') +
            '; firstAttemptExit=' + firstAttemptCode + '; firstAttemptDetail=' + firstAttemptLog.slice(-240));
        }
        used1080pFallback = true;
      }
    }

    stage = 'read_output';
    const outputBytes = await ffmpeg.readFile(outputFileName);
    if (!(outputBytes instanceof Uint8Array) || outputBytes.byteLength < 64) {
      throw new Error('fps_encoder_empty_output');
    }
    if (outputBytes.byteLength > MAX_INPUT_BYTES) throw new Error('video_file_over_limit');

    stage = 'verify_output';
    const verified = mediaCore.inspectMediaInfo(outputBytes);
    const actualFps = Number(verified?.averageFps);
    if (!Number.isFinite(actualFps) || Math.abs(actualFps - 60000 / 1001) > 0.03) {
      throw new Error('fps_encoder_verification_failed: reported=' + String(actualFps));
    }
    if (!used1080pFallback &&
        (Math.abs(Number(verified.width) - width) > 0 || Math.abs(Number(verified.height) - height) > 0)) {
      throw new Error('ffmpeg_4k_resolution_verification_failed');
    }
    if (isHdrEncode) {
      const outputProfile = inspectSourceColorProfile(outputBytes, verified);
      if (!outputProfile.hdr || !outputProfile.tenBit) {
        throw new Error('hdr_output_verification_failed: ' + JSON.stringify(outputProfile));
      }
    }
    if (used1080pFallback) {
      const outW = Number(verified.width);
      const outH = Number(verified.height);
      const inputRatio = width / height;
      const outputRatio = outW / outH;
      if (!outW || !outH || Math.max(outW, outH) > 1920 ||
          Math.abs(inputRatio - outputRatio) > 0.015) {
        throw new Error('ffmpeg_4k_1080p_fallback_verification_failed');
      }
    }

    const blob = new Blob([outputBytes], { type: 'video/mp4' });
    console.info(isHdrEncode ? '[INEASY] HDR HEVC Main10 CFR conversion verified' : '[INEASY] FFmpeg 4K SDR fallback verified', {
      inputCodec: sourceInfo.codec || 'unknown',
      outputCodec: verified.codec || 'unknown',
      inputResolution: width + 'x' + height,
      outputResolution: verified.width + 'x' + verified.height,
      outputFps: actualFps,
      encoder: 'FFmpeg.wasm libx264',
      sourceHdrFallback: false,
      hdrTranscoded: isHdrEncode,
      hdrProfile: isHdrEncode ? colorProfile : null,
      used1080pFallback
    });
    onProgress?.(1);
    return {
      blob,
      info: verified,
      fps: actualFps,
      sourceFps: sourceInfo.averageFps || null,
      preserveOriginal: false,
      hdr: isHdrEncode,
      hdrTranscoded: isHdrEncode,
      main10Transcoded: isHdrEncode,
      hdrProfile: isHdrEncode ? {
        label: colorProfile.displayColor || (hdrType === 'hlg' ? 'BT.2020 / HLG' : 'BT.2020 / PQ (HDR10)'),
        hdr10: hdrType !== 'hlg',
        hlg: hdrType === 'hlg',
        main10: true,
        dolbyVision: false
      } : null,
      downscaledFallback: used1080pFallback
    };
  } catch (error) {
    if (signal?.aborted || aborted || /processing_cancelled|AbortError/i.test(String(error?.message || ''))) {
      throw new Error('processing_cancelled');
    }
    const rawMessage = String(error?.message || error || 'unknown_error');
    const diagnostic = diagnosticTail();
    console.error('[INEASY] 4K FFmpeg failure', {
      stage,
      message: rawMessage.slice(0, 500),
      recentLogs: diagnostic,
      inputBytes: inputBytes.byteLength,
      inputResolution: width + 'x' + height
    });
    const message = (rawMessage + (diagnostic && !rawMessage.includes(diagnostic) ? '; detail=' + diagnostic : '')).slice(0, 1400);
    if (/ffmpeg_4k_hdr_unsafe|ffmpeg_4k_source_format_unsupported|video_file_over_limit|fps_encoder_empty_output|fps_encoder_verification_failed|ffmpeg_4k_resolution_verification_failed|ffmpeg_4k_exec_failed/.test(message)) {
      throw new Error(message);
    }
    throw new Error('ffmpeg_4k_fallback_failed: stage=' + stage + '; ' + message);
  } finally {
    signal?.removeEventListener('abort', handleAbort);
    try { ffmpeg.terminate(); } catch (_) {}
    if (runtime.ffmpegInstance === ffmpeg) {
      runtime.ffmpegInstance = null;
      runtime.ffmpegLoadPromise = null;
    }
    // Runtime URLs are reused by later 4K jobs and released on pagehide.
  }
}
