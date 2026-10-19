/*
 * V2 Beta: standard MP4 remux + source metadata inspection.
 * Uses the site's bundled Mediabunny remux implementation to repackage
 * compatible MP4 tracks without video/audio re-encoding. It does not modify
 * metadata to evade platform transcoding. If remux is unsupported, it preserves
 * the original file and reports the fallback.
 */
(function installV2BetaProcessor(root) {
  'use strict';

  function bytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    throw new Error('V2_INVALID_INPUT_BUFFER');
  }

  function inspect(core, data) {
    if (!core || typeof core.inspectMediaInfo !== 'function') return null;
    try {
      const info = core.inspectMediaInfo(data);
      return {
        width: Number(info.width) || null,
        height: Number(info.height) || null,
        codec: info.codec || '',
        codecFamily: info.codecFamily || '',
        averageFps: Number(info.averageFps) || null,
        maxFps: Number(info.maxFps) || null,
        audioCodec: info.audioCodec || '',
        videoSamples: Number(info.videoSamples) || null,
        audioSamples: Number(info.audioSamples) || null,
        fragmented: !!info.fragmented,
        tracks: Array.isArray(info.tracks) ? info.tracks.map(track => ({
          trackId: Number(track.trackId) || null,
          handler: track.handler || '',
          codec: track.codec || '',
          width: Number(track.width) || null,
          height: Number(track.height) || null,
          sampleCount: Number(track.sampleCount) || null,
          timescale: Number(track.timescale) || null,
          durationUnits: Number(track.duration) || null,
          averageFps: Number(track.averageFps) || null
        })) : []
      };
    } catch (_) {
      return null;
    }
  }

  function compareMedia(input, output) {
    if (!input || !output) return { compatible: false, reason: 'Input or output media metadata could not be verified.' };
    const checks = {
      codecFamily: String(input.codecFamily || '').toLowerCase() === String(output.codecFamily || '').toLowerCase(),
      codec: String(input.codec || '').toLowerCase() === String(output.codec || '').toLowerCase(),
      dimensions: Number(input.width) === Number(output.width) && Number(input.height) === Number(output.height),
      fps: Number.isFinite(Number(input.averageFps)) && Number.isFinite(Number(output.averageFps))
        ? Math.abs(Number(input.averageFps) - Number(output.averageFps)) <= 0.05
        : (!input.averageFps && !output.averageFps),
      audioCodec: !input.audioCodec || String(input.audioCodec).toLowerCase() === String(output.audioCodec || '').toLowerCase(),
      videoSamples: !input.videoSamples || !output.videoSamples || Number(input.videoSamples) === Number(output.videoSamples),
      audioSamples: !input.audioSamples || !output.audioSamples || Number(input.audioSamples) === Number(output.audioSamples)
    };
    const failed = Object.keys(checks).filter(key => !checks[key]);
    return {
      compatible: failed.length === 0,
      checks,
      reason: failed.length ? 'Remux changed or could not preserve: ' + failed.join(', ') : ''
    };
  }

  async function processVideoDirect(data, onProgress) {
    const original = bytes(data.buffer);
    if (original.byteLength < 64) throw new Error('V2_INVALID_VIDEO_FILE');
    const progress = (label, percent, detail) => {
      if (typeof onProgress === 'function') onProgress(label, percent, detail, 'v2-beta');
    };

    const core = root.FRYOriginalMp4Core || root.ADJNOriginalMp4Core;
    const inputInfo = inspect(core, original);
    const isMp4 = /\.mp4$/i.test(data.fileName || '') || /video\/mp4/i.test(data.fileType || '');
    // 4K high-FPS (>= 50) sources are kept byte-for-byte. The remux rewrites track
    // timing and movie duration, which platforms can read back as 30 FPS.
    const uhdHighFps = !!inputInfo &&
      Math.max(Number(inputInfo.width) || 0, Number(inputInfo.height) || 0) >= 3000 &&
      Number(inputInfo.averageFps) >= 50;
    let output = original.slice();
    let remuxed = false;
    let remuxError = '';
    let streamCheck = null;

    if (uhdHighFps) {
      remuxError = 'UHD high-FPS source preserved byte-for-byte; remux would rewrite frame timing.';
    } else if (isMp4 && inputInfo && /^(avc|hevc)$/i.test(inputInfo.codecFamily || '')) {
      progress('Checking source metadata', 12, 'Reading codec, dimensions, FPS and audio tracks');
      try {
        progress('Preparing MP4 tracks', 25, 'Standard stream remux; no video re-encoding');
        const { remux } = await import('./remux.mjs');
        const sourceBlob = new Blob([original], { type: 'video/mp4' });
        const outputBlob = await remux(sourceBlob);
        const remuxBytes = new Uint8Array(await outputBlob.arrayBuffer());
        if (remuxBytes.byteLength < 64) throw new Error('Remux output is empty or incomplete.');
        const remuxInfo = inspect(core, remuxBytes);
        streamCheck = compareMedia(inputInfo, remuxInfo);
        if (!streamCheck.compatible) {
          remuxError = streamCheck.reason;
          output = original.slice();
        } else {
          output = remuxBytes;
          remuxed = true;
        }
      } catch (error) {
        remuxError = String(error && error.message || error);
        output = original.slice();
      }
    } else {
      remuxError = isMp4
        ? 'Source codec or MP4 metadata could not be inspected safely.'
        : 'Standard remux is limited to compatible MP4 input.';
    }

    const outputInfo = inspect(core, output);
    const metadataReport = {
      fileName: data.fileName || '',
      mimeType: data.fileType || 'application/octet-stream',
      inputBytes: original.byteLength,
      outputBytes: output.byteLength,
      inspected: !!inputInfo,
      input: inputInfo,
      output: outputInfo,
      streamCheck,
      codecPreserved: !!inputInfo && !!outputInfo && String(inputInfo.codec || '').toLowerCase() === String(outputInfo.codec || '').toLowerCase(),
      dimensionsPreserved: !!inputInfo && !!outputInfo && inputInfo.width === outputInfo.width && inputInfo.height === outputInfo.height,
      fpsPreserved: !!inputInfo && !!outputInfo && Number.isFinite(inputInfo.averageFps) && Number.isFinite(outputInfo.averageFps) && Math.abs(inputInfo.averageFps - outputInfo.averageFps) <= 0.05,
      remuxed,
      reencoded: false,
      metadataRewritten: false,
      fallbackReason: remuxed ? '' : remuxError
    };

    progress(remuxed ? 'MP4 remux complete' : 'Original file preserved', 100,
      remuxed ? 'Compatible streams repackaged without re-encoding' : 'Remux unavailable; source file left unchanged');

    return {
      output,
      outputMime: remuxed ? 'video/mp4' : (data.fileType || 'application/octet-stream'),
      info: inputInfo,
      outputInfo: outputInfo || inputInfo,
      metadataReport,
      passthrough: !remuxed,
      mode: remuxed ? 'v2-beta-standard-mp4-remux' : 'v2-beta-original-fallback',
      inputBytes: original.byteLength,
      report: {
        engine: 'V2 Beta standard MP4 remux',
        remuxed,
        passthrough: !remuxed,
        reencoded: false,
        metadataInspected: !!inputInfo,
        metadataRewritten: false,
        codecPreserved: !!inputInfo && !!outputInfo && String(inputInfo.codec || '').toLowerCase() === String(outputInfo.codec || '').toLowerCase(),
        dimensionsPreserved: !!inputInfo && !!outputInfo && inputInfo.width === outputInfo.width && inputInfo.height === outputInfo.height,
        fpsPreserved: !!inputInfo && !!outputInfo && Number.isFinite(inputInfo.averageFps) && Number.isFinite(outputInfo.averageFps) && Math.abs(inputInfo.averageFps - outputInfo.averageFps) <= 0.05,
        streamCheck,
        fallbackReason: remuxed ? null : remuxError,
        note: remuxed
          ? 'Compatible MP4 tracks were repackaged without video/audio re-encoding. TikTok may still transcode after upload.'
          : 'The original source bytes were preserved because remux was unavailable or the output stream metadata did not match the source.'
      }
    };
  }

  root.V2BetaVideoProcessor = { processVideoDirect };
})(typeof globalThis !== 'undefined' ? globalThis : self);
