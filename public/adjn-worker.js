/**
 * ADJN Web Worker
 * Runs the heavy MP4 patching off the main thread — no UI lag.
 * Mirrors how the browser extension uses processor.html in an iframe.
 */
'use strict';

// We need to import the core and processor scripts into the worker context.
// importScripts is synchronous and available in dedicated workers.
importScripts('adjn-mp4-core.js?v=20261008-2', 'adjn-processor.js?v=20261009-1');

const MEDIABUNNY_URL = 'https://cdn.jsdelivr.net/npm/mediabunny@1.61.3/+esm';
const TRANSCODE_BITRATE_THRESHOLD = 20_000_000;
const MAX_VIDEO_FILE_SIZE = 150 * 1024 * 1024;
const TEST_MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024;

async function compressWithWebCodecs(file, onProgress) {
  const { Input, Output, Conversion, ALL_FORMATS, BlobSource, Mp4OutputFormat, BufferTarget, Quality } = await import(MEDIABUNNY_URL);
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const conversion = await Conversion.init({
    input,
    output,
    tracks: 'primary',
    video: { codec: 'avc', quality: new Quality({ bitrate: TRANSCODE_BITRATE_THRESHOLD }) },
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
  const testCompression = data.testCompression === true;
  let { buffer, fileName, fileType } = data;
  let inputBuffer = buffer;
  let outputName = fileName;
  let outputType = fileType;
  let rateControlReport = { performed: false };

  try {
    const maxFileSize = testCompression ? TEST_MAX_VIDEO_FILE_SIZE : MAX_VIDEO_FILE_SIZE;
    if (Number(fileSize || buffer?.byteLength || 0) > maxFileSize) {
      throw new Error('video_file_over_limit');
    }

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
    const needsCompression = testCompression && averageBitrate > TRANSCODE_BITRATE_THRESHOLD;
    const sourceExtension = String(fileName || data.file?.name || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
    const needsContainerConversion = testCompression && !['mp4', 'm4v', 'mov'].includes(sourceExtension);
    const needsReencode = needsCompression || needsContainerConversion;
    let result = await globalThis.ADJNVideoProcessor.processVideoDirect(
      {
        requestId,
        buffer: inputBuffer,
        fileName: outputName,
        fileType: outputType,
        fileSize: inputBuffer.byteLength,
        engine,
      },
      (label, progress, detail, key) => {
        const adjustedProgress = needsReencode ? Math.min(70, Math.round(progress * 0.7)) : progress;
        self.postMessage({ type: 'STAGE', requestId, label, progress: adjustedProgress, detail, key });
      }
    );

    if (needsReencode && (needsContainerConversion || !result.passthrough) && data.file) {
      result = null;
      sourceBytes = null;
      inputBuffer = null;
      buffer = null;
      data.buffer = null;
      try {
        const compressedBuffer = await compressWithWebCodecs(data.file, (progress) => {
          self.postMessage({ type: 'STAGE', requestId, progress: 70 + Math.round(progress * 20) });
        });
        if (needsContainerConversion || compressedBuffer.byteLength < fileSize) {
          const compressedResult = await globalThis.ADJNVideoProcessor.processVideoDirect(
            {
              requestId,
              buffer: compressedBuffer,
              fileName: `${String(fileName || 'video').replace(/\.[^.]+$/, '')}-optimized.mp4`,
              fileType: 'video/mp4',
              fileSize: compressedBuffer.byteLength,
              engine,
            },
            (label, progress, detail, key) => {
              self.postMessage({ type: 'STAGE', requestId, label, progress: 90 + Math.round(progress * 0.1), detail, key });
            }
          );
          if (compressedResult.passthrough) throw new Error('BROWSER_FORMAT_CONVERSION_UNPATCHABLE');
          result = compressedResult;
          outputName = `${String(fileName || 'video').replace(/\.[^.]+$/, '')}-optimized.mp4`;
          outputType = 'video/mp4';
          rateControlReport = {
            performed: true,
            sourceBitrate: Math.round(averageBitrate),
            outputAverageBitrate: duration > 0 ? Math.round((compressedBuffer.byteLength * 8) / duration) : null,
            outputBitrateTarget: TRANSCODE_BITRATE_THRESHOLD,
            containerConverted: needsContainerConversion,
            sourceResolution: sourceInfo ? `${sourceInfo.width}x${sourceInfo.height}` : 'unknown',
            sourceFps: Math.round(sourceFps),
          };
        }
      } catch (error) {
        rateControlReport = { performed: false, error: error?.message || String(error) };
      }

      if (!result && needsContainerConversion) {
        throw new Error(`BROWSER_FORMAT_CONVERSION_FAILED:${rateControlReport.error || 'unsupported video codec'}`);
      }
      if (!result) {
        const originalBuffer = await data.file.arrayBuffer();
        result = await globalThis.ADJNVideoProcessor.processVideoDirect(
          { requestId, buffer: originalBuffer, fileName, fileType, fileSize, engine },
          (label, progress, detail, key) => {
            self.postMessage({ type: 'STAGE', requestId, label, progress: 90 + Math.round(progress * 0.1), detail, key });
          }
        );
      }
    }

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
