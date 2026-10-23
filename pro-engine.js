'use strict';
// INEASY Pro: colour + sharpness enhancement, then the same ADJN patch as V2.
const fs = require('fs');
const { execFile } = require('child_process');
const { adjnPatchFile } = require('./v2-engine');

const MAX_SECONDS = Number(process.env.PRO_MAX_SECONDS) || 60;
// Work = frames x megapixels (HDR counts double). Measured on 8 cores: 6700 ~ 40 s, 13400 ~ 70 s.
// 12000 allows 24 s of SDR 4K60, 12 s of HDR 4K60, 60 s of 1080p60.
const MAX_WORK = Number(process.env.PRO_MAX_WORK) || 12000;
const TIMEOUT_MS = Number(process.env.PRO_TIMEOUT_MS) || 180000;

const run = (file, args, options) => new Promise((resolve, reject) => {
  execFile(file, args, { maxBuffer: 4 * 1024 * 1024, ...options }, (error, stdout, stderr) => {
    if (error) { error.stderr = stderr; reject(error); } else resolve(stdout);
  });
});

const rate = (value) => {
  const [n, d] = String(value || '').split('/').map(Number);
  return n > 0 && d > 0 ? n / d : 0;
};

async function probe(ffprobePath, filePath) {
  const json = JSON.parse(await run(ffprobePath, [
    '-v', 'error',
    '-show_entries', 'stream=codec_type,codec_name,width,height,avg_frame_rate,r_frame_rate,color_transfer:format=duration',
    '-of', 'json', filePath
  ], { timeout: 30000 }));
  const streams = json.streams || [];
  const video = streams.find((s) => s.codec_type === 'video');
  if (!video) throw new Error('pro_no_video');
  const audio = streams.find((s) => s.codec_type === 'audio');
  const fps = rate(video.avg_frame_rate) || rate(video.r_frame_rate);
  const seconds = Number(json.format && json.format.duration) || 0;
  const width = Number(video.width) || 0;
  const height = Number(video.height) || 0;
  const hdr = ['arib-std-b67', 'smpte2084'].includes(String(video.color_transfer || '').toLowerCase());
  const pq = String(video.color_transfer || '').toLowerCase() === 'smpte2084';
  // Work per second of video; the job fits when seconds x perSecond <= MAX_WORK.
  const perSecond = fps * (width * height / 1e6) * (hdr ? 2 : 1);
  return { width, height, fps, seconds, hdr, pq, perSecond, audioCodec: audio ? audio.codec_name : null };
}

// HDR is converted to standard colour: it looks right on every screen and in TikTok.
function filterChain(info) {
  const toSdr = info.pq
    ? 'zscale=t=linear:npl=203,format=gbrpf32le,tonemap=mobius,zscale=t=bt709:m=bt709:p=bt709:r=tv,'
    : info.hdr ? 'zscale=t=bt709:m=bt709:p=bt709:r=tv:npl=203,' : '';
  return `${toSdr}format=yuv420p,eq=saturation=1.22:contrast=1.04,unsharp=5:5:2.0:5:5:0.0`;
}

// Longest clip (seconds) that is processed quickly for this resolution / FPS.
const allowedSeconds = (info) => Math.min(MAX_SECONDS, Math.floor(MAX_WORK / Math.max(info.perSecond, 0.001)));

async function enhanceVideo({ ffmpegPath, ffprobePath, inputPath, outputPath, fileName, info }) {
  const source = info || await probe(ffprobePath, inputPath);
  const silent = !source.audioCodec;
  const args = [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', inputPath,
    ...(silent ? ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'] : []),
    '-map', '0:v:0', '-map', silent ? '1:a:0' : '0:a:0',
    '-vf', filterChain(source),
    '-c:v', 'libx264', '-preset', 'superfast', '-crf', '21', '-maxrate', '45M', '-bufsize', '90M',
    '-profile:v', 'high', '-fps_mode', 'passthrough',
    ...(source.hdr ? ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'] : []),
    ...(!silent && source.audioCodec === 'aac' ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '192k']),
    ...(silent ? ['-shortest'] : []),
    '-sn', '-dn', '-map_metadata', '0', '-write_tmcd', '0', '-movflags', '+faststart', '-f', 'mp4', `${outputPath}.enh.mp4`
  ];
  try {
    await run(ffmpegPath, args, { timeout: TIMEOUT_MS, killSignal: 'SIGKILL' });
    // Size and FPS come from the enhanced file: ffmpeg applies the phone rotation flag while encoding.
    const out = await probe(ffprobePath, `${outputPath}.enh.mp4`);
    return await adjnPatchFile({
      inputPath: `${outputPath}.enh.mp4`,
      outputPath,
      fileName,
      sourceFps: out.fps,
      sourceWidth: out.width,
      sourceHeight: out.height
    });
  } finally {
    await fs.promises.rm(`${outputPath}.enh.mp4`, { force: true }).catch(() => {});
  }
}

module.exports = { probe, allowedSeconds, enhanceVideo };
