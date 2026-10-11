/*
 * V2 Beta compatibility + metadata inspection.
 * Preserves the original media bytes exactly; this code does not rewrite MP4
 * metadata or alter container fields to influence a platform's transcoding.
 */
(function installV2BetaProcessor(root) {
  'use strict';

  function bytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    throw new Error('V2_INVALID_INPUT_BUFFER');
  }

  function safeInspect(core, original) {
    if (!core || typeof core.inspectMediaInfo !== 'function') return null;
    try {
      const info = core.inspectMediaInfo(original);
      // Keep the metadata report focused on source facts; do not mutate media.
      return {
        container: 'mp4-compatible',
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
      // Non-MP4 and unusual MP4 variants remain untouched; report that inspection
      // was unavailable instead of failing or silently rewriting the file.
      return null;
    }
  }

  function safeCompatibility(core, original) {
    if (!core || typeof core.inspectCompatibility !== 'function') return null;
    try {
      const result = core.inspectCompatibility(original);
      return {
        needsRefinery: !!result.needsRefinery,
        reasons: Array.isArray(result.reasons) ? result.reasons.map(String) : []
      };
    } catch (_) {
      return null;
    }
  }

  async function processVideoDirect(data, onProgress) {
    const original = bytes(data.buffer);
    if (original.byteLength < 64) throw new Error('V2_INVALID_VIDEO_FILE');
    const progress = (label, percent, detail) => {
      if (typeof onProgress === 'function') onProgress(label, percent, detail, 'v2-beta');
    };

    progress('Checking video metadata', 15, 'Reading source codec, dimensions, frame rate and tracks');
    const core = root.FRYOriginalMp4Core || root.ADJNOriginalMp4Core;
    const info = safeInspect(core, original);
    const compatibility = safeCompatibility(core, original);
    const metadataReport = {
      fileName: data.fileName || '',
      mimeType: data.fileType || 'application/octet-stream',
      byteSize: original.byteLength,
      inspected: !!info,
      media: info,
      compatibility
    };

    progress('Preserving original quality', 90, 'No re-encoding; source bytes and metadata are not rewritten');
    progress('Ready', 100, 'Original file preserved; metadata report available');
    return {
      output: original.slice(),
      outputMime: data.fileType || 'application/octet-stream',
      info,
      outputInfo: info,
      metadataReport,
      compatibility,
      passthrough: true,
      mode: 'v2-beta-original-preservation',
      inputBytes: original.byteLength,
      report: {
        engine: 'V2 Beta compatibility + metadata inspection',
        passthrough: true,
        reencoded: false,
        bytesPreserved: true,
        metadataInspected: !!info,
        metadataRewritten: false,
        compatibility,
        note: info
          ? 'Source metadata was inspected for diagnostics; original video bytes are preserved unchanged.'
          : 'Metadata inspection was unavailable for this container; original video bytes are preserved unchanged. If TikTok playback stutters, export a standard H.264/AAC MP4.'
      }
    };
  }

  root.V2BetaVideoProcessor = { processVideoDirect };
})(typeof globalThis !== 'undefined' ? globalThis : self);
