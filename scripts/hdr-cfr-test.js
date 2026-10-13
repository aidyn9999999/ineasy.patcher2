#!/usr/bin/env node
'use strict';

// Experimental local-only HDR CFR converter for V1 validation.
// Requires a system FFmpeg build with libx265 Main10 and ffprobe.
// Does not modify the website or ADJN processor.

const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const fs = require('node:fs');
const execFileAsync = promisify(execFile);

const TARGET_FPS = '60000/1001';
const TARGET_FPS_DECIMAL = 60000 / 1001;
const HDR_TRANSFERS = new Set(['smpte2084', 'arib-std-b67']);
const DYNAMIC_HDR_RE = /dolby.?vision|hdr10\+/i;

function fail(message) {
  console.error('[HDR-CFR-TEST] ERROR:', message);
  process.exitCode = 1;
}

async function run(binary, args, options = {}) {
  const { stdout = '', stderr = '' } = await execFileAsync(binary, args, {
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
  return { stdout, stderr };
}

async function probe(file) {
  const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
  const { stdout } = await run(ffprobe, [
    '-v', 'error',
    '-show_streams',
    '-show_format',
    '-of', 'json',
    file,
  ]);
  return JSON.parse(stdout);
}

function fpsValue(value) {
  if (typeof value !== 'string') return NaN;
  const parts = value.split('/').map(Number);
  if (parts.length === 2 && parts.every(Number.isFinite) && parts[1] !== 0) return parts[0] / parts[1];
  return Number(value);
}

function inspectHdr(info) {
  const video = (info.streams || []).find((stream) => stream.codec_type === 'video');
  if (!video) throw new Error('No video stream found.');
  const transfer = String(video.color_transfer || '').toLowerCase();
  const primaries = String(video.color_primaries || '').toLowerCase();
  const pixelFormat = String(video.pix_fmt || '').toLowerCase();
  const sideData = JSON.stringify(video.side_data_list || []);
  const profile = String(video.profile || '');
  if (DYNAMIC_HDR_RE.test(sideData + ' ' + profile)) {
    throw new Error('Dolby Vision/HDR10+ dynamic metadata detected. This test intentionally stops because its preservation cannot be guaranteed.');
  }
  if (!HDR_TRANSFERS.has(transfer) || primaries !== 'bt2020') {
    throw new Error('Input is not confirmed HDR10/PQ or HLG with BT.2020 primaries; refusing to label uncertain media as HDR.');
  }
  if (!/(10|12|16)le?$/.test(pixelFormat) && !/p10|p12|p16/.test(pixelFormat)) {
    throw new Error('Input pixel format is not clearly 10-bit-or-higher; refusing a potentially destructive HDR transcode.');
  }
  return { video, transfer, primaries, pixelFormat };
}

async function main() {
  const [, , inputArg, outputArg] = process.argv;
  if (!inputArg || !outputArg || inputArg.startsWith('-') || outputArg.startsWith('-')) {
    console.error('Usage: node scripts/hdr-cfr-test.js <input-hdr.mp4> <output-test.mp4>');
    process.exitCode = 2;
    return;
  }
  const input = path.resolve(inputArg);
  const output = path.resolve(outputArg);
  if (!fs.existsSync(input) || !fs.statSync(input).isFile()) throw new Error('Input file does not exist.');
  if (input === output) throw new Error('Input and output paths must be different.');
  if (fs.existsSync(output)) throw new Error('Output already exists; choose a new output path to avoid overwriting files.');

  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const inputInfo = await probe(input);
  const { video, transfer, primaries, pixelFormat } = inspectHdr(inputInfo);
  console.log('[HDR-CFR-TEST] Input confirmed:', JSON.stringify({
    codec: video.codec_name,
    profile: video.profile,
    width: video.width,
    height: video.height,
    sourceFps: video.avg_frame_rate,
    pixelFormat,
    transfer,
    primaries,
  }, null, 2));

  // No scale filter: native resolution is retained. The fps filter duplicates/drops
  // frames to reach CFR; it does not synthesize motion-interpolated frames.
  const args = [
    '-hide_banner', '-nostdin', '-n',
    '-i', input,
    '-map', '0:v:0',
    '-map', '0:a?',
    '-map_metadata', '0',
    '-map_chapters', '0',
    '-vf', `fps=${TARGET_FPS}`,
    '-fps_mode', 'cfr',
    '-c:v', 'libx265',
    '-profile:v', 'main10',
    '-pix_fmt', 'yuv420p10le',
    '-tag:v', 'hvc1',
    '-preset', 'medium',
    '-crf', '18',
    '-x265-params', 'hdr-opt=1:repeat-headers=1',
    '-color_primaries', primaries,
    '-color_trc', transfer,
    '-colorspace', String(video.color_space || 'bt2020nc'),
    '-c:a', 'copy',
    '-movflags', '+faststart',
    output,
  ];

  console.log('[HDR-CFR-TEST] Starting local FFmpeg encode at 59.94 FPS; output dimensions remain native.');
  const { stderr } = await run(ffmpeg, args);
  if (stderr.trim()) console.log(stderr.trim().split('\n').slice(-12).join('\n'));

  const outputInfo = await probe(output);
  const outVideo = (outputInfo.streams || []).find((stream) => stream.codec_type === 'video');
  if (!outVideo) throw new Error('Output validation failed: no video stream.');
  const outFps = fpsValue(outVideo.avg_frame_rate);
  const fpsOk = Number.isFinite(outFps) && Math.abs(outFps - TARGET_FPS_DECIMAL) < 0.0005;
  const sizeOk = outVideo.width === video.width && outVideo.height === video.height;
  const bitDepthOk = /10|12|16/.test(String(outVideo.pix_fmt || '')) && /p10|p12|p16|10le|12le|16le/.test(String(outVideo.pix_fmt || ''));
  const hdrOk = HDR_TRANSFERS.has(String(outVideo.color_transfer || '').toLowerCase())
    && String(outVideo.color_primaries || '').toLowerCase() === 'bt2020';

  const report = {
    output,
    codec: outVideo.codec_name,
    profile: outVideo.profile,
    width: outVideo.width,
    height: outVideo.height,
    avgFrameRate: outVideo.avg_frame_rate,
    pixelFormat: outVideo.pix_fmt,
    transfer: outVideo.color_transfer,
    primaries: outVideo.color_primaries,
    checks: { exact5994Fps: fpsOk, nativeResolution: sizeOk, highBitDepth: bitDepthOk, hdrSignaling: hdrOk },
  };
  console.log('[HDR-CFR-TEST] Validation report:\n' + JSON.stringify(report, null, 2));
  if (!fpsOk || !sizeOk || !bitDepthOk || !hdrOk) {
    throw new Error('Output validation failed. Do not use this file; inspect FFmpeg build and logs.');
  }
  console.log('[HDR-CFR-TEST] PASS: output passed the basic metadata checks. This does not prove visual equivalence or preservation of dynamic HDR metadata.');
}

main().catch((error) => {
  fail(error && error.message ? error.message : String(error));
});
