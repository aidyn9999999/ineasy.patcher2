'use strict';
// V2 patcher engine shared by the website endpoint (/api/v2/ffmpeg-copy) and the Telegram bot.
// Step 1: verified ffmpeg stream-copy remux (never re-encodes video).
// Step 2: ADJN metadata patch — the same public/adjn-*.js files the browser worker runs.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// Optional stream-copy command variants for experiments. Every variant keeps the video
// bitstream (-c:v copy); only the container layout differs. The client picks one with
// ?variant=<name>; unknown names fall back to the default.
const FFMPEG_COPY_VARIANTS = {
  default: { videoArgs: [], audioMaps: ['-map', '0:a:0?'] },
  // 60000 is a multiple of 60 and 59.94 (60000/1001) so every frame lands on an exact tick.
  ts60000: { videoArgs: ['-video_track_timescale', '60000'], audioMaps: ['-map', '0:a:0?'] },
  // Same audio stream mapped twice (the layout that survived TikTok's transcode in the research log).
  dualaudio: { videoArgs: [], audioMaps: ['-map', '0:a:0?', '-map', '0:a:0?'] }
};

// Sample-entry boxes that carry HDR / colour signalling. ffmpeg's MP4 muxer can drop some of
// them (e.g. Dolby Vision dvvC without -strict unofficial), which makes TikTok treat the
// clip as plain SDR and wash out the colours.
const HDR_SIGNALING_BOXES = ['colr', 'mdcv', 'clli', 'dvcC', 'dvvC', 'dvwC'];

function parseIsoBoxes(buf, start, end) {
  const out = [];
  let pos = start;
  while (pos + 8 <= end) {
    let size = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    let header = 8;
    if (size === 1 && pos + 16 <= end) { size = Number(buf.readBigUInt64BE(pos + 8)); header = 16; }
    else if (size === 0) size = end - pos;
    if (size < header || pos + size > end) break;
    out.push({ type, start: pos, header, end: pos + size });
    pos += size;
  }
  return out;
}

// Returns { codecTag, boxes: { colr: '<hex>', ... } } for the first video sample entry,
// reading only the moov box so large files are not loaded into memory.
async function readVideoSampleEntrySignaling(filePath) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const { size: fileSize } = await handle.stat();
    let pos = 0;
    let moov = null;
    const head = Buffer.alloc(16);
    while (pos + 8 <= fileSize) {
      await handle.read(head, 0, 16, pos);
      let boxSize = head.readUInt32BE(0);
      const type = head.toString('latin1', 4, 8);
      let header = 8;
      if (boxSize === 1) { boxSize = Number(head.readBigUInt64BE(8)); header = 16; }
      else if (boxSize === 0) boxSize = fileSize - pos;
      if (boxSize < header || pos + boxSize > fileSize) break;
      if (type === 'moov') {
        if (boxSize > 64 * 1024 * 1024) break;
        moov = Buffer.alloc(boxSize - header);
        await handle.read(moov, 0, moov.length, pos + header);
        break;
      }
      pos += boxSize;
    }
    if (!moov) return null;
    const find = (buf, start, end, type) => parseIsoBoxes(buf, start, end).find((b) => b.type === type);
    for (const trak of parseIsoBoxes(moov, 0, moov.length).filter((b) => b.type === 'trak')) {
      const mdia = find(moov, trak.start + trak.header, trak.end, 'mdia');
      if (!mdia) continue;
      const hdlr = find(moov, mdia.start + mdia.header, mdia.end, 'hdlr');
      if (!hdlr || moov.toString('latin1', hdlr.start + hdlr.header + 8, hdlr.start + hdlr.header + 12) !== 'vide') continue;
      const minf = find(moov, mdia.start + mdia.header, mdia.end, 'minf');
      const stbl = minf && find(moov, minf.start + minf.header, minf.end, 'stbl');
      const stsd = stbl && find(moov, stbl.start + stbl.header, stbl.end, 'stsd');
      if (!stsd) continue;
      const entryStart = stsd.start + stsd.header + 8; // version/flags + entry_count
      if (entryStart + 86 > stsd.end) continue;
      const entrySize = moov.readUInt32BE(entryStart);
      const codecTag = moov.toString('latin1', entryStart + 4, entryStart + 8);
      const children = parseIsoBoxes(moov, entryStart + 86, Math.min(entryStart + entrySize, stsd.end));
      const boxes = {};
      for (const child of children) {
        if (HDR_SIGNALING_BOXES.includes(child.type) && !(child.type in boxes)) {
          boxes[child.type] = moov.subarray(child.start + child.header, child.end).toString('hex');
        }
      }
      return { codecTag, boxes };
    }
    return null;
  } finally {
    await handle.close();
  }
}

// Every HDR box present in the source must survive the remux. colr is compared by presence
// only (ffmpeg may rewrite nclc as nclx); everything else must match byte for byte.
function missingHdrSignaling(source, output) {
  if (!source) return [];
  const lost = [];
  for (const type of Object.keys(source.boxes)) {
    const after = output && output.boxes[type];
    if (after === undefined) lost.push(type);
    else if (type !== 'colr' && after !== source.boxes[type]) lost.push(type + '_changed');
  }
  return lost;
}

function parseFrameRate(value) {
  const parts = String(value || '').split('/').map(Number);
  if (parts.length !== 2 || !Number.isFinite(parts[0]) ||
      !Number.isFinite(parts[1]) || parts[0] <= 0 || parts[1] <= 0) return 0;
  return parts[0] / parts[1];
}
const videoFps = (stream) => parseFrameRate(stream.avg_frame_rate) || parseFrameRate(stream.r_frame_rate);

function probeVideo(ffprobePath, filePath) {
  return new Promise((resolve, reject) => {
    execFile(ffprobePath, [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name,width,height,avg_frame_rate,r_frame_rate,nb_frames,pix_fmt,color_primaries,color_transfer,color_space',
      '-of', 'json', filePath
    ], { maxBuffer: 2 * 1024 * 1024, timeout: 30000 }, (error, stdout) => {
      if (error) return reject(error);
      try {
        const stream = JSON.parse(stdout).streams?.[0];
        if (!stream) throw new Error('ffprobe_video_stream_missing');
        resolve(stream);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

// Stream-copy remux of inputPath into outputPath (MP4). The result is verified against the
// ORIGINAL file; when no attempt keeps the video exactly, the original bytes are copied instead.
async function ffmpegCopyV2({ ffmpegPath, ffprobePath, inputPath, outputPath, variant = 'default' }) {
  const inputVideo = await probeVideo(ffprobePath, inputPath);
  const sourceFps = videoFps(inputVideo);
  const inputFrames = Number(inputVideo.nb_frames);
  const sourceSignaling = await readVideoSampleEntrySignaling(inputPath).catch(() => null);

  const variantName = Object.prototype.hasOwnProperty.call(FFMPEG_COPY_VARIANTS, String(variant || ''))
    ? String(variant) : 'default';
  const variantArgs = FFMPEG_COPY_VARIANTS[variantName];
  const runRemux = (audioMode, copytb) => new Promise((resolve, reject) => {
    const args = [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
      '-i', inputPath, ...(copytb ? ['-copytb', copytb] : []),
      // -strict unofficial lets the MP4 muxer keep Dolby Vision (dvvC/dvcC) and similar
      // sample-entry boxes it would otherwise drop during the copy.
      '-strict', 'unofficial',
      '-map', '0:v:0?', ...variantArgs.audioMaps,
      '-c:v', 'copy', ...variantArgs.videoArgs,
      ...(audioMode === 'aac'
        ? ['-c:a', 'aac', '-b:a', '192k']
        : ['-c:a', 'copy']),
      '-sn', '-dn', '-map_metadata', '0', '-movflags', '+faststart',
      '-f', 'mp4', outputPath
    ];
    execFile(ffmpegPath, args, {
      maxBuffer: 4 * 1024 * 1024,
      timeout: 240000,
      killSignal: 'SIGKILL'
    }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        reject(error);
      } else resolve({ stdout, stderr });
    });
  });
  const remuxWithAudioFallback = async (copytb) => {
    try {
      await runRemux('copy', copytb);
      return 'copy';
    } catch (copyError) {
      // Retry only audio compatibility; the video stream remains copied.
      await fs.promises.rm(outputPath, { force: true }).catch(() => {});
      try {
        await runRemux('aac', copytb);
        return 'aac';
      } catch (aacError) {
        aacError.stderr = [
          'Audio-copy attempt: ' + String(copyError.stderr || copyError.message || '').slice(-1200),
          'AAC fallback attempt: ' + String(aacError.stderr || aacError.message || '').slice(-1800)
        ].join('\\n');
        throw aacError;
      }
    }
  };
  // The remux must keep dimensions, frame count and frame rate. A lower FPS here
  // is what platforms later report as 30 FPS, so such an output is never accepted.
  const remuxKeepsVideo = async () => {
    const outputVideo = await probeVideo(ffprobePath, outputPath);
    const outputFps = videoFps(outputVideo);
    const outputFrames = Number(outputVideo.nb_frames);
    const sameSize = Number(inputVideo.width) === Number(outputVideo.width) &&
      Number(inputVideo.height) === Number(outputVideo.height);
    const fpsKept = !(sourceFps >= 29 && outputFps > 0 && outputFps < sourceFps - 1);
    const framesKept = !(inputFrames > 0 && outputFrames > 0 && inputFrames !== outputFrames);
    // Colour format and HDR signalling must be identical, otherwise TikTok re-renders the
    // clip as SDR (washed out) or tone-maps it badly.
    const colourKept = ['pix_fmt', 'color_primaries', 'color_transfer', 'color_space'].every((key) => {
      const before = String(inputVideo[key] || '').toLowerCase();
      const after = String(outputVideo[key] || '').toLowerCase();
      return !before || before === 'unknown' || before === after;
    });
    const outputSignaling = await readVideoSampleEntrySignaling(outputPath).catch(() => null);
    const lostHdrBoxes = missingHdrSignaling(sourceSignaling, outputSignaling);
    if (lostHdrBoxes.length) {
      console.error('[INEASY V2] FFmpeg copy lost HDR signalling:', lostHdrBoxes.join(','));
    }
    return { ok: sameSize && fpsKept && framesKept && colourKept && lostHdrBoxes.length === 0, outputFps };
  };

  // First try the demuxer time base, then FFmpeg's default time base. If neither
  // keeps the video exactly, use the original bytes instead of a degraded file.
  let audioMode = 'copy';
  let outputFps = 0;
  let keptOriginal = false;
  let verified = false;
  for (const copytb of ['1', '']) {
    try {
      audioMode = await remuxWithAudioFallback(copytb);
      const check = await remuxKeepsVideo();
      outputFps = check.outputFps;
      if (check.ok) { verified = true; break; }
    } catch (attemptError) {
      console.error('[INEASY V2] FFmpeg stream-copy attempt failed:', {
        copytb: copytb || 'default',
        reason: attemptError.message || 'ffmpeg_copy_failed',
        stderr: String(attemptError.stderr || '').slice(-1500)
      });
      await fs.promises.rm(outputPath, { force: true }).catch(() => {});
    }
  }
  if (!verified) {
    console.error('[INEASY V2] FFmpeg copy changed the video; using the original file.', { sourceFps, outputFps });
    await fs.promises.copyFile(inputPath, outputPath);
    audioMode = 'original';
    outputFps = sourceFps;
    keptOriginal = true;
  }
  const stat = await fs.promises.stat(outputPath);
  if (stat.size < 16) throw new Error('ffmpeg_copy_output_invalid');
  return {
    audioMode,
    variant: keptOriginal ? 'original' : variantName,
    keptOriginal,
    sourceFps,
    outputFps,
    width: Number(inputVideo.width) || 0,
    height: Number(inputVideo.height) || 0,
    bytes: stat.size
  };
}

// ---- ADJN metadata patch (runs the browser files in Node) ----------------------------
let adjn = null;
function loadAdjn() {
  if (!adjn) {
    require(path.join(__dirname, 'public', 'adjn-mp4-core.js'));
    require(path.join(__dirname, 'public', 'adjn-processor.js'));
    adjn = {
      core: globalThis.ADJNOriginalMp4Core || globalThis.FRYOriginalMp4Core,
      processor: globalThis.ADJNVideoProcessor
    };
    if (!adjn.core || !adjn.processor) throw new Error('adjn_engine_not_loaded');
  }
  return adjn;
}

const isHdr = (hdr) => Boolean(hdr && (hdr.hdr10 || hdr.hdr10plus || hdr.hlg || hdr.dolbyVision || hdr.main10));

// ADJN patch of an already remuxed file with the same output guards the website applies:
// resolution, FPS and HDR signalling must survive. Returns metadata about the result.
async function adjnPatchFile({ inputPath, outputPath, fileName, sourceFps, sourceWidth, sourceHeight, onProgress }) {
  const { core, processor } = loadAdjn();
  let buffer = await fs.promises.readFile(inputPath);
  let result;
  try {
    result = await processor.processVideoDirect({
      requestId: `ineasy-bot-${Date.now()}`,
      buffer,
      fileName,
      fileType: 'video/mp4',
      fileSize: buffer.byteLength,
      engine: '2.1.5',
      preparationReport: { performed: false, compressionDisabled: true, skippedForV2: true }
    }, onProgress);
  } finally {
    buffer = null;
  }

  // Passthrough means ADJN left the bytes alone: the remuxed file already is the output.
  const outputBytes = result.passthrough ? null : result.output;
  let outputInfo = null;
  try { outputInfo = core.inspectMediaInfo(outputBytes || await fs.promises.readFile(inputPath)); } catch (_) { /* fall back below */ }
  outputInfo = outputInfo || result.outputInfo || result.info || null;

  const outW = Number(outputInfo?.width);
  const outH = Number(outputInfo?.height);
  const outFps = Number(outputInfo?.averageFps);
  const srcW = Number(sourceWidth || result.info?.width);
  const srcH = Number(sourceHeight || result.info?.height);
  const srcFps = Number(sourceFps || result.info?.averageFps);
  if (srcW >= 1280 && srcH >= 720 && Number.isFinite(outW) && Number.isFinite(outH) && (outW < srcW || outH < srcH)) {
    throw new Error(`resolution_downgrade_blocked: source=${srcW}x${srcH}; output=${outW}x${outH}`);
  }
  if (Number.isFinite(srcFps) && srcFps >= 50 && !Number.isFinite(outFps)) {
    throw new Error(`fps_output_verification_failed: source=${srcFps.toFixed(3)}; output=unknown`);
  }
  if (Number.isFinite(srcFps) && srcFps >= 29 && Number.isFinite(outFps) && outFps < srcFps - 1) {
    throw new Error(`fps_downgrade_blocked: source=${srcFps.toFixed(3)}; output=${outFps.toFixed(3)}`);
  }
  if (Math.max(srcW, srcH) >= 3000) {
    if (Number.isFinite(srcFps) && srcFps >= 50 && Number.isFinite(outFps) && outFps < 50) {
      throw new Error(`4k_fps_downgrade_blocked: source=${srcFps.toFixed(3)}; output=${outFps.toFixed(3)}`);
    }
    if (!srcW || !srcH || outW !== srcW || outH !== srcH) throw new Error('resolution_output_verification_failed');
  }
  const sourceHdr = result.hdr || null;
  if (isHdr(sourceHdr) && !isHdr(result.outputHdr || result.hdr)) throw new Error('hdr_output_verification_failed');

  if (outputBytes) await fs.promises.writeFile(outputPath, outputBytes);
  else if (outputPath !== inputPath) await fs.promises.copyFile(inputPath, outputPath);
  return {
    mode: result.mode,
    passthrough: Boolean(result.passthrough),
    width: outW || srcW,
    height: outH || srcH,
    fps: Number.isFinite(outFps) ? outFps : srcFps,
    codec: outputInfo?.codec || '',
    hdr: (result.outputHdr || result.hdr)?.label || ''
  };
}

// Full V2 pipeline for one file: ffmpeg stream-copy, then ADJN patch. The input file is
// removed as soon as the remux exists, so a job never holds more than two copies on disk.
async function patchVideoV2({ ffmpegPath, ffprobePath, inputPath, outputPath, fileName, onProgress }) {
  if (!ffmpegPath) throw new Error('ffmpeg_engine_unavailable');
  const remuxPath = `${outputPath}.remux.mp4`;
  try {
    const copy = await ffmpegCopyV2({ ffmpegPath, ffprobePath, inputPath, outputPath: remuxPath });
    await fs.promises.rm(inputPath, { force: true }).catch(() => {});
    if (onProgress) onProgress('patching');
    const patched = await adjnPatchFile({
      inputPath: remuxPath,
      outputPath,
      fileName,
      sourceFps: copy.sourceFps,
      sourceWidth: copy.width,
      sourceHeight: copy.height
    });
    const stat = await fs.promises.stat(outputPath);
    if (stat.size < 16) throw new Error('v2_output_invalid');
    return { ...patched, bytes: stat.size, audioMode: copy.audioMode, remuxKeptOriginal: copy.keptOriginal, sourceFps: copy.sourceFps };
  } finally {
    await fs.promises.rm(remuxPath, { force: true }).catch(() => {});
  }
}

module.exports = {
  FFMPEG_COPY_VARIANTS,
  ffmpegCopyV2,
  adjnPatchFile,
  patchVideoV2
};
