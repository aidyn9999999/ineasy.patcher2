/*
 * V2 Beta compatibility path.
 * Inspects the selected video and preserves its bytes exactly.
 * This path does not alter container metadata to influence platform transcoding.
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
    const original = bytes(data.buffer);
    if (original.byteLength < 64) throw new Error('V2_INVALID_VIDEO_FILE');
    const progress = (label, percent, detail) => {
      if (typeof onProgress === 'function') onProgress(label, percent, detail, 'v2-beta');
    };
    progress('Checking video', 15, 'V2 Beta compatibility check');
    let info = null;
    const core = root.FRYOriginalMp4Core || root.ADJNOriginalMp4Core;
    try {
      if (core && typeof core.inspectMediaInfo === 'function') info = core.inspectMediaInfo(original);
    } catch (_) {
      // Some containers cannot be inspected by the MP4 parser; preserve them unchanged.
    }
    progress('Preserving original quality', 90, 'No re-encoding or metadata rewrite');
    progress('Ready', 100, 'Original file preserved');
    return {
      output: original.slice(),
      outputMime: data.fileType || 'application/octet-stream',
      info,
      outputInfo: info,
      passthrough: true,
      mode: 'v2-beta-original-preservation',
      inputBytes: original.byteLength,
      report: {
        engine: 'V2 Beta compatibility path',
        passthrough: true,
        reencoded: false,
        bytesPreserved: true,
        note: 'The source file is unchanged. Use a standard H.264/AAC export if TikTok playback stutters.'
      }
    };
  }

  root.V2BetaVideoProcessor = { processVideoDirect };
})(typeof globalThis !== 'undefined' ? globalThis : self);
