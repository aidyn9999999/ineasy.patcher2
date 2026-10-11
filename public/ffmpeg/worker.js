// Same-origin entry point for @ffmpeg/ffmpeg 0.12.10.
// The browser blocks constructing a Worker directly from jsDelivr on ineasy.site.
// This local module worker imports the official version-pinned worker as an ESM module.
import 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js';
