let sharedFFmpeg = null;
let sharedLoadPromise = null;

function resetFFmpeg(ffmpeg) {
  if (sharedFFmpeg !== ffmpeg) return;
  ffmpeg.terminate();
  sharedFFmpeg = null;
  sharedLoadPromise = null;
}

async function loadFFmpeg(signal, onProgress) {
  const { FFmpeg } = await import('/vendor/ffmpeg/esm/index.js');
  if (!sharedFFmpeg) sharedFFmpeg = new FFmpeg();
  const ffmpeg = sharedFFmpeg;
  if (!ffmpeg.loaded) {
    if (!sharedLoadPromise) {
      sharedLoadPromise = ffmpeg.load({
        coreURL: '/vendor/ffmpeg/core/ffmpeg-core.js?v=0.12.10',
        wasmURL: '/vendor/ffmpeg/core/ffmpeg-core.wasm?v=0.12.10'
      }, { signal }).catch((error) => {
        resetFFmpeg(ffmpeg);
        throw error;
      });
    }
    await sharedLoadPromise;
  }
  signal.throwIfAborted();
  onProgress?.(0, 'encodingSetup');
  return ffmpeg;
}

export async function preloadHevcEncoder() {
  const controller = new AbortController();
  await loadFFmpeg(controller.signal);
}

export async function encodeHevcLocally(file, frameRate, bitrate, signal, onProgress) {
  const extension = String(file.name || '').match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase() || 'mp4';
  const inputFile = new File([file], `source.${extension}`, { type: file.type });
  const progressHandler = ({ progress }) => {
    if (Number.isFinite(progress)) onProgress?.(Math.max(0, Math.min(1, progress)), 'encodingHevc');
  };
  let lastFfmpegMessage = '';
  const logHandler = ({ message }) => {
    if (/error|unsupported|decoder|demux|x265|encoder/i.test(message)) lastFfmpegMessage = message.trim();
  };
  let phase = 'loading FFmpeg worker';
  let ffmpeg = null;
  let mountedInput = false;
  let copiedInputPath = null;
  const onAbort = () => { if (ffmpeg) resetFFmpeg(ffmpeg); };
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    phase = 'loading FFmpeg WASM core';
    onProgress?.(0, 'loadingHevcEngine');
    ffmpeg = await loadFFmpeg(signal, onProgress);
    ffmpeg.on('progress', progressHandler);
    ffmpeg.on('log', logHandler);
    signal.throwIfAborted();
    phase = 'mounting local video with WORKERFS';
    let inputPath = `/input/${inputFile.name}`;
    try {
      mountedInput = await ffmpeg.mount('WORKERFS', { files: [inputFile] }, '/input');
      if (!mountedInput) throw new Error('WORKERFS is unavailable in this browser core.');
    } catch (mountError) {
      console.warn('[INEASY] WORKERFS mount failed; copying source into FFmpeg FS.', mountError);
      phase = 'copying local video into FFmpeg FS';
      onProgress?.(0, 'copyingVideo');
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      await ffmpeg.writeFile(`/${inputFile.name}`, inputBytes);
      inputPath = `/${inputFile.name}`;
      copiedInputPath = inputPath;
    }
    signal.throwIfAborted();

    const args = [];
    if (['mov', 'mp4', 'm4v', '3gp', '3g2'].includes(extension)) args.push('-f', 'mov');
    args.push(
      '-i', inputPath,
      '-map', '0:v:0',
      '-map', '0:a:0?',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libx265',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-b:v', `${Math.round(bitrate / 1000)}k`,
      '-maxrate', '24M',
      '-bufsize', '48M',
      '-pix_fmt', 'yuv420p',
      '-tag:v', 'hvc1',
      '-c:a', 'aac',
      '-b:a', '192k'
    );
    if (frameRate) args.push('-r', String(frameRate), '-fps_mode', 'cfr');
    args.push('-movflags', '+faststart', '-f', 'mp4', '/output.mp4');

    phase = `encoding .${extension} as HEVC with libx265`;
    onProgress?.(0, 'encodingHevc');
    const exitCode = await ffmpeg.exec(args);
    signal.throwIfAborted();
    if (exitCode !== 0) {
      throw new Error(`Local HEVC encoder exited with code ${exitCode}.${lastFfmpegMessage ? ` ${lastFfmpegMessage}` : ''}`);
    }

    phase = 'reading the encoded MP4';
  onProgress?.(0.99, 'checkingHevcOutput');
    const output = await ffmpeg.readFile('/output.mp4');
    signal.throwIfAborted();
    if (!(output instanceof Uint8Array) || output.byteLength < 64) {
      throw new Error('Local HEVC encoder returned an empty MP4.');
    }
    return new Blob([output], { type: 'video/mp4' });
  } catch (error) {
    if (signal.aborted) throw new Error('processing_cancelled');
    if (ffmpeg && !ffmpeg.loaded) resetFFmpeg(ffmpeg);
    const detail = lastFfmpegMessage && !String(error.message || '').includes(lastFfmpegMessage)
      ? ` ${lastFfmpegMessage}`
      : '';
    const errorText = error?.message || String(error) || JSON.stringify(error) || 'unknown error';
    throw new Error(`Local HEVC encoding failed while ${phase} for .${extension}: ${errorText}.${detail}`);
  } finally {
    if (ffmpeg) {
      ffmpeg.off('progress', progressHandler);
      ffmpeg.off('log', logHandler);
      if (mountedInput) await ffmpeg.unmount('/input').catch(() => {});
      if (copiedInputPath) await ffmpeg.deleteFile(copiedInputPath).catch(() => {});
      await ffmpeg.deleteFile('/output.mp4').catch(() => {});
    }
    signal.removeEventListener('abort', onAbort);
  }
}