/**
 * ADJN Web Worker
 * Runs the heavy MP4 patching off the main thread — no UI lag.
 * Mirrors how the browser extension uses processor.html in an iframe.
 */
'use strict';

// We need to import the core and processor scripts into the worker context.
// importScripts is synchronous and available in dedicated workers.
importScripts('adjn-mp4-core.js?v=20261009-3', 'adjn-processor.js?v=20261009-3');

const MEDIABUNNY_URL = 'https://cdn.jsdelivr.net/npm/mediabunny@1.61.3/+esm';
const TARGET_BITRATE_REDUCTION = 0.05;
const OUTPUT_AUDIO_BITRATE = 192_000;
const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024;

async function compressWithWebCodecs(file, targetBitrate, outputFps, onProgress) {
  const { Input, Output, Conversion, ALL_FORMATS, BlobSource, Mp4OutputFormat, BufferTarget, Quality } = await import(MEDIABUNNY_URL);
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const conversion = await Conversion.init({
    input,
    output,
    tracks: 'primary',
    video: {
      codec: 'avc',
      quality: new Quality({ bitrate: targetBitrate }),
      frameRate: outputFps,
      hardwareAcceleration: 'prefer-hardware',
    },
    audio: { codec: 'aac', quality: new Quality({ bitrate: 192_000 }) },
  });
  if (!conversion.isValid) throw new Error('BROWSER_COMPRESSION_UNSUPPORTED');
  conversion.onProgress = (progress) => onProgress(progress);
  await conversion.execute();
  const buffer = output.target.buffer;
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 64) {
    throw new Error('BROWSER_COMPRESSION_INVALID_OUTPUT');
  }
  return buffer;
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
    if (Number(fileSize || buffer?.byteLength || 0) > MAX_VIDEO_FILE_SIZE) {
      throw new Error('video_file_over_limit');
    }
    self.postMessage({ type: 'STAGE', requestId, phase: 'analyzing', progress: 3 });

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
      if (Math.max(sourceInfo.width, sourceInfo.height) > 1920 || Math.min(sourceInfo.width, sourceInfo.height) > 1080) {
        throw new Error('video_resolution_over_1080p');
      }
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
    const needsCompression = averageBitrate > 500_000 || sourceFps > 60.01;
    const outputFps = Math.min(60, Math.max(1, Math.round(sourceFps || 30)));
    rateControlReport = {
      performed: false,
      estimatedSourceBitrate: Math.round(averageBitrate),
      targetBitrateReductionPercent: TARGET_BITRATE_REDUCTION * 100,
      sourceFps: Math.round(sourceFps),
      compressionSkippedReason: needsCompression ? null : 'source_bitrate_unavailable_or_too_low',
    };
    const targetTotalBitrate = averageBitrate > 0
      ? Math.round(averageBitrate * (1 - TARGET_BITRATE_REDUCTION))
      : 10_000_000;
    const targetVideoBitrate = Math.max(300_000, targetTotalBitrate - OUTPUT_AUDIO_BITRATE);
    const sourceExtension = String(fileName || data.file?.name || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
    const needsContainerConversion = !['mp4', 'm4v', 'mov'].includes(sourceExtension);
    const needsReencode = needsCompression || needsContainerConversion;
    if (needsReencode) {
      if (!data.file) throw new Error('BROWSER_COMPRESSION_FILE_REQUIRED');
      sourceBytes = null;
      inputBuffer = null;
      buffer = null;
      data.buffer = null;
      try {
        const compressedBuffer = await compressWithWebCodecs(data.file, targetVideoBitrate, outputFps, (progress) => {
          self.postMessage({ type: 'STAGE', requestId, phase: 'compression', progress: 5 + Math.round(progress * 55) });
        });
        if (needsCompression && compressedBuffer.byteLength >= fileSize) {
          throw new Error('compression output was not smaller than source');
        }
        inputBuffer = compressedBuffer;
        outputName = `${String(fileName || 'video').replace(/\.[^.]+$/, '')}-optimized.mp4`;
        outputType = 'video/mp4';
        rateControlReport = {
          performed: true,
          sourceBitrate: Math.round(averageBitrate),
          outputAverageBitrate: duration > 0 ? Math.round((compressedBuffer.byteLength * 8) / duration) : null,
          outputBitrateTarget: targetVideoBitrate,
          sourceFps: Math.round(sourceFps),
          outputFps,
          containerConverted: needsContainerConversion,
          sourceResolution: sourceInfo ? `${sourceInfo.width}x${sourceInfo.height}` : 'unknown',
        };
      } catch (error) {
        rateControlReport = { performed: false, error: error?.message || String(error) };
        const failureCode = needsContainerConversion ? 'BROWSER_FORMAT_CONVERSION_FAILED' : 'BROWSER_COMPRESSION_FAILED';
        throw new Error(`${failureCode}:${rateControlReport.error}`);
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
        const adjustedProgress = needsReencode ? 60 + Math.round(progress * 0.4) : progress;
        self.postMessage({ type: 'STAGE', requestId, phase: 'patching', label, progress: adjustedProgress, detail, key });
      }
    );

    // Transfer the output buffer to avoid copying large ArrayBuffer
    let output = result.output;
    if (output instanceof Uint8Array) {
      output = output.byteOffset === 0 && output.byteLength === output.buffer.byteLength
        ? output.buffer
        : output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
    }
    sourceBytes = null;
    inputBuffer = null;
    buffer = null;
    data.buffer = null;

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
