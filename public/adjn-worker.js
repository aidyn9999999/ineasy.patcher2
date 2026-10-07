/**
 * ADJN Web Worker
 * Runs the heavy MP4 patching off the main thread — no UI lag.
 * Mirrors how the browser extension uses processor.html in an iframe.
 */
'use strict';

// We need to import the core and processor scripts into the worker context.
// importScripts is synchronous and available in dedicated workers.
importScripts('adjn-mp4-core.js', 'adjn-processor.js');

self.onmessage = async function (event) {
  const data = event.data;
  if (!data || data.type !== 'PROCESS') return;

  const { requestId, buffer, fileName, fileType, fileSize, engine } = data;

  try {
    if (!globalThis.ADJNVideoProcessor?.processVideoDirect) {
      throw new Error('ADJN engine not loaded in worker.');
    }

    const result = await globalThis.ADJNVideoProcessor.processVideoDirect(
      { requestId, buffer, fileName, fileType, fileSize, engine },
      (label, progress, detail, key) => {
        // Send progress back to main thread without transferring ownership
        self.postMessage({ type: 'STAGE', requestId, label, progress, detail, key });
      }
    );

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
