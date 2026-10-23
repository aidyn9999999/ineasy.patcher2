'use strict';
// INEASY quality enhancer: classic restoration filters (denoise, sharpen, local contrast, saturation).
// It is NOT the Patcher: no TikTok patch is applied here, and no AI model runs (see the note below).
const { execFile, spawn } = require('child_process');

const MAX_SECONDS = Number(process.env.ENHANCE_MAX_SECONDS) || 60;
// Work = frames x megapixels x weight. Measured on 8 cores: ~6 s of encoding per 1000 units for plain SDR.
const MAX_WORK = Number(process.env.ENHANCE_MAX_WORK) || 12000;
const TIMEOUT_MS = Number(process.env.ENHANCE_TIMEOUT_MS) || 240000;

// No neural model runs here: a real super-resolution / restoration model needs a GPU runtime
// (Real-ESRGAN ncnn-vulkan, ONNX Runtime GPU) and the server has none. Only classic filters are applied.
// strength 0-50 (%): 25 gives the base amounts below. saturation: extra percent on top (0-50).
const PRESETS = {
  natural: { denoise: [1.0, 2.0], sharpen: 0.8, contrast: 0.02, saturation: 5 },
  sharp: { denoise: [1.5, 3.0], sharpen: 1.6, contrast: 0.03, saturation: 5 },
  vivid: { denoise: [0.8, 1.5], sharpen: 0.8, contrast: 0.05, saturation: 18 },
};

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
    '-show_entries', 'stream=codec_type,codec_name,profile,width,height,avg_frame_rate,r_frame_rate,pix_fmt,color_transfer,color_primaries,color_space:format=duration,size,format_name',
    '-of', 'json', filePath
  ], { timeout: 30000 }));
  const streams = json.streams || [];
  const video = streams.find((s) => s.codec_type === 'video');
  if (!video) throw new Error('enhance_no_video');
  const audio = streams.find((s) => s.codec_type === 'audio');
  const avg = rate(video.avg_frame_rate);
  const raw = rate(video.r_frame_rate);
  const transfer = String(video.color_transfer || '').toLowerCase();
  const width = Number(video.width) || 0;
  const height = Number(video.height) || 0;
  return {
    width, height, fps: avg || raw,
    vfr: avg > 0 && raw > 0 && Math.abs(avg - raw) / raw > 0.01,
    seconds: Number(json.format && json.format.duration) || 0,
    bytes: Number(json.format && json.format.size) || 0,
    codec: video.codec_name, profile: video.profile || '', pixFmt: video.pix_fmt || '',
    bits: /10/.test(String(video.pix_fmt)) ? 10 : /12/.test(String(video.pix_fmt)) ? 12 : 8,
    hdr: transfer === 'smpte2084' ? 'HDR10 (PQ)' : transfer === 'arib-std-b67' ? 'HLG' : 'SDR',
    transfer, primaries: video.color_primaries || '', matrix: video.color_space || '',
    audioCodec: audio ? audio.codec_name : null,
    megapixels: (width * height) / 1e6,
  };
}

// HDR videos stay HDR (10-bit HEVC, same colour signal) when they are short enough for that slower path;
// otherwise they are converted to standard colour. Everything else is 8-bit H.264.
const weight = (info, preserveHdr) => (preserveHdr ? 3 : info.hdr !== 'SDR' ? 2 : 1);
const allowedSeconds = (info, preserveHdr = false) => Math.min(MAX_SECONDS, Math.floor(MAX_WORK / Math.max(info.fps * info.megapixels * weight(info, preserveHdr), 0.001)));

// Validates the request and returns the normalised options, or throws an Error with .code.
function resolveOptions(info, { preset = 'natural', strength = 25, saturation } = {}) {
  const fail = (code) => Object.assign(new Error(code), { code });
  const base = PRESETS[preset];
  if (!base) throw fail('preset_unknown');
  const level = Number(strength);
  const extra = Number(saturation === undefined ? base.saturation : saturation);
  if (!Number.isFinite(level) || !Number.isFinite(extra) || level < 0 || level > 50 || extra < 0 || extra > 50) throw fail('bad_options');
  if (level === 0 && extra === 0) throw fail('nothing_to_do');
  const preserveHdr = info.hdr !== 'SDR' && info.seconds <= allowedSeconds(info, true);
  return { preset, strength: level, saturation: extra, k: level / 25, preserveHdr };
}

function filterChain(info, options) {
  const p = PRESETS[options.preset];
  const k = options.k;
  const parts = [];
  if (!options.preserveHdr && info.hdr === 'HDR10 (PQ)') parts.push('zscale=t=linear:npl=203,format=gbrpf32le,tonemap=mobius,zscale=t=bt709:m=bt709:p=bt709:r=tv');
  else if (!options.preserveHdr && info.hdr === 'HLG') parts.push('zscale=t=bt709:m=bt709:p=bt709:r=tv:npl=203');
  parts.push(options.preserveHdr ? 'format=yuv420p10le' : 'format=yuv420p');
  if (k > 0) {
    const spatial = (p.denoise[0] * k).toFixed(2);
    const temporal = (p.denoise[1] * k).toFixed(2);
    parts.push(`hqdn3d=${spatial}:${spatial}:${temporal}:${temporal}`);
  }
  const eq = [];
  if (k > 0) eq.push(`contrast=${(1 + p.contrast * k).toFixed(3)}`);
  if (options.saturation > 0) eq.push(`saturation=${(1 + options.saturation / 100).toFixed(3)}`);
  if (eq.length) parts.push(`eq=${eq.join(':')}`);
  if (k > 0) parts.push(`unsharp=5:5:${Math.min(2.4, p.sharpen * k).toFixed(2)}:5:5:0.0`);
  return parts.join(',');
}

function encoderArgs(info, options) {
  if (options.preserveHdr) {
    const primaries = /2020/.test(info.primaries) ? 'bt2020' : info.primaries || 'bt2020';
    return ['-c:v', 'libx265', '-preset', 'ultrafast', '-crf', '20', '-pix_fmt', 'yuv420p10le', '-tag:v', 'hvc1',
      '-x265-params', `colorprim=${primaries}:transfer=${info.transfer}:colormatrix=${info.matrix || 'bt2020nc'}:log-level=error`];
  }
  return ['-c:v', 'libx264', '-preset', 'superfast', '-crf', '21', '-maxrate', '50M', '-bufsize', '100M', '-profile:v', 'high',
    ...(info.hdr !== 'SDR' ? ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'] : [])];
}

// Starts the encode. Returns { done, cancel }: done resolves when the file is written; onProgress(0..1) is real
// (encoded time / duration, read from ffmpeg's own progress output).
function startEnhance({ ffmpegPath, inputPath, outputPath, info, options, onProgress }) {
  const args = [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-progress', 'pipe:1', '-nostats', '-i', inputPath,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', filterChain(info, options),
    ...encoderArgs(info, options),
    '-fps_mode', 'passthrough',
    // The original audio stays untouched when MP4 can carry it; anything else is converted.
    ...(info.audioCodec && info.audioCodec !== 'aac' ? ['-c:a', 'aac', '-b:a', '192k'] : ['-c:a', 'copy']),
    '-sn', '-dn', '-map_metadata', '0', '-movflags', '+faststart', '-f', 'mp4', outputPath
  ];
  const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  let cancelled = false;
  let timedOut = false;
  let buffer = '';
  child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-3000); });
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const match = /^out_time_(?:us|ms)=(\d+)/.exec(line);
      if (match && info.seconds > 0 && onProgress) onProgress(Math.min(1, Number(match[1]) / 1e6 / info.seconds));
    }
  });
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, TIMEOUT_MS);
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (cancelled) return reject(Object.assign(new Error('cancelled'), { code: 'cancelled' }));
      if (timedOut) return reject(Object.assign(new Error('timeout'), { code: 'timeout' }));
      if (code !== 0) return reject(Object.assign(new Error('ffmpeg_failed'), { code: 'failed', stderr }));
      return resolve();
    });
  });
  return { done, cancel: () => { cancelled = true; child.kill('SIGKILL'); } };
}

module.exports = { PRESETS, MAX_SECONDS, probe, allowedSeconds, resolveOptions, filterChain, startEnhance };
