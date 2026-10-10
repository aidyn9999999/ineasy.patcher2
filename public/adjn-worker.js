/**
 * ADJN Web Worker
 * Runs the heavy MP4 patching off the main thread — no UI lag.
 * Mirrors how the browser extension uses processor.html in an iframe.
 */
'use strict';

// We need to import the core and processor scripts into the worker context.
// importScripts is synchronous and available in dedicated workers.
importScripts('adjn-mp4-core.js?v=20261010-14', 'adjn-processor.js?v=20261010-15');

const MAX_VIDEO_FILE_SIZE = 500 * 1024 * 1024;

self.onmessage = async function (event) {
  const data = event.data;
  if (!data || data.type !== 'PROCESS') return;

  const { requestId, fileSize, engine } = data;
  let { buffer, fileName, fileType } = data;
  let inputBuffer = buffer;
  let outputName = fileName;
  let outputType = fileType;
  const rateControlReport = data.preparationReport || { performed: false, compressionDisabled: true };

  try {
    if (Number(fileSize || buffer?.byteLength || 0) > MAX_VIDEO_FILE_SIZE) {
      throw new Error('video_file_over_limit');
    }
    self.postMessage({ type: 'STAGE', requestId, phase: 'analyzing', progress: 3 });

    if (!globalThis.ADJNVideoProcessor?.processVideoDirect) {
      throw new Error('ADJN engine not loaded in worker.');
    }

    self.postMessage({ type: 'STAGE', requestId, phase: 'patching', progress: 10 });
    const result = await globalThis.ADJNVideoProcessor.processVideoDirect(
      {
        requestId,
        buffer: inputBuffer,
        fileName: outputName,
        fileType: outputType,
        fileSize: inputBuffer.byteLength,
        engine,
      },
      (label, progress, detail, key) => self.postMessage({ type: 'STAGE', requestId, phase: 'patching', label, progress, detail, key })
    );

    // Transfer the output buffer to avoid copying large ArrayBuffer
    let output = result.output;
    if (output instanceof Uint8Array) {
      output = output.byteOffset === 0 && output.byteLength === output.buffer.byteLength
        ? output.buffer
        : output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
    }
    inputBuffer = null;
    buffer = null;
    data.buffer = null;

    self.postMessage({
      type: 'DONE',
      requestId,
      output,
      outputMime: result.outputMime,
      inputInfo: result.info,
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
