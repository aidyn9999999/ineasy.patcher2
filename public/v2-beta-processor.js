/*
 * V2 Beta processor entry point.
 * Runs a separate, conservative MP4 stream-copy patch path in the worker.
 * No video/audio re-encoding is performed.
 */
(function installV2BetaProcessor(root) {
  'use strict';

  function bytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    throw new Error('V2_INVALID_INPUT_BUFFER');
  }

  async function processVideoDirect(data, onProgress) {
    const core = root.FRYOriginalMp4Core || root.ADJNOriginalMp4Core;
    if (!core || typeof core.patchWithReport !== 'function' ||
        typeof core.verifyOutput !== 'function') {
      throw new Error('V2_BETA_CORE_NOT_LOADED');
    }

    const original = bytes(data.buffer);
    if (original.byteLength < 64) throw new Error('V2_INVALID_VIDEO_FILE');
    const reportProgress = (label, progress, detail) => {
      if (typeof onProgress === 'function') onProgress(label, progress, detail, 'v2-beta');
    };
    reportProgress('Checking video structure', 12, 'V2 Beta: checking MP4 boxes');

    let info = null;
    try {
      if (typeof core.inspectMediaInfo === 'function') info = core.inspectMediaInfo(original);
    } catch (_) {
      // Unsupported/complex containers are preserved unchanged below.
    }

    const type = String(data.fileType || '').toLowerCase();
    const name = String(data.fileName || '').toLowerCase();
    const isMp4 = type === 'video/mp4' || /\.mp4$/.test(name) ||
      (original[4] === 0x66 && original[5] === 0x74 && original[6] === 0x79 && original[7] === 0x70);
    if (!isMp4) {
      reportProgress('Preserving original file', 90, 'V2 Beta leaves non-MP4 containers unchanged');
      return {
        output: original.slice(),
        outputMime: data.fileType || 'application/octet-stream',
        info, outputInfo: info, passthrough: true,
        mode: 'v2-beta-safe-passthrough',
        inputBytes: original.byteLength,
        report: { engine: 'V2 Beta', passthrough: true, reason: 'non-MP4 container; original bytes preserved', reencoded: false }
      };
    }

    reportProgress('Applying V2 patch', 35, 'Stream-copy container patch; no re-encoding');
    try {
      const patched = core.patchWithReport(original);
      const output = bytes(patched.bytes);
      if (output.byteLength < 64) throw new Error('V2_EMPTY_OUTPUT');
      const verification = core.verifyOutput(original, output);
      if (verification.videoBitstreamByteIdentical !== true ||
          verification.originalAudioTrackPreserved !== true) {
        throw new Error('V2_OUTPUT_VERIFICATION_FAILED');
      }
      reportProgress('Verifying result', 88, 'Checking preserved video and audio streams');
      let outputInfo = null;
      try {
        if (typeof core.inspectMediaInfo === 'function') outputInfo = core.inspectMediaInfo(output);
      } catch (_) {}
      reportProgress('Ready', 100, 'V2 Beta processing complete');
      return {
        output: output.slice(),
        outputMime: 'video/mp4',
        info, outputInfo, passthrough: false,
        mode: 'v2-beta-stream-copy',
        inputBytes: original.byteLength,
        report: { ...(patched.report || {}), engine: 'V2 Beta', passthrough: false, reencoded: false },
        verification
      };
    } catch (error) {
      // Never risk damaging a video: on unsupported layouts, preserve exact input bytes.
      reportProgress('Preserving original file', 92, 'Patch not verified; returning the untouched source');
      return {
        output: original.slice(),
        outputMime: data.fileType || 'video/mp4',
        info, outputInfo: info, passthrough: true,
        mode: 'v2-beta-safe-passthrough',
        inputBytes: original.byteLength,
        report: { engine: 'V2 Beta', passthrough: true, reencoded: false, reason: error?.message || String(error) }
      };
    }
  }

  root.V2BetaVideoProcessor = { processVideoDirect };
})(typeof globalThis !== 'undefined' ? globalThis : self);
