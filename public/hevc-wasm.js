export async function encodeHevcLocally(file, frameRate, bitrate, signal, onProgress) {
  const { FFmpeg } = await import('/vendor/ffmpeg/esm/index.js');
  const ffmpeg = new FFmpeg();
  const extension = String(file.name || '').match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase() || 'mp4';
  const inputFile = new File([file], `source.${extension}`, { type: file.type });
  const progressHandler = ({ progress }) => {
    if (Number.isFinite(progress)) onProgress?.(Math.max(0, Math.min(1, progress)));
  };
  let terminated = false;
  const terminate = () => {
    if (terminated) return;
    terminated = true;
    ffmpeg.terminate();
  };
  const onAbort = () => terminate();

  ffmpeg.on('progress', progressHandler);
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    await ffmpeg.load({
      coreURL: '/vendor/ffmpeg/core/ffmpeg-core.js',
      wasmURL: '/vendor/ffmpeg/core/ffmpeg-core.wasm'
    });
    signal.throwIfAborted();
    await ffmpeg.mount('WORKERFS', { files: [inputFile] }, '/input');
    signal.throwIfAborted();

    const args = [
      '-i', `/input/${inputFile.name}`,
      '-map', '0:v:0',
      '-map', '0:a:0?',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libx265',
      '-preset', 'ultrafast',
      '-b:v', `${Math.round(bitrate / 1000)}k`,
      '-maxrate', '24M',
      '-bufsize', '48M',
      '-pix_fmt', 'yuv420p',
      '-tag:v', 'hvc1',
      '-c:a', 'aac',
      '-b:a', '192k'
    ];
    if (frameRate) args.push('-r', String(frameRate), '-fps_mode', 'cfr');
    args.push('-movflags', '+faststart', '-f', 'mp4', '/output.mp4');

    const exitCode = await ffmpeg.exec(args);
    signal.throwIfAborted();
    if (exitCode !== 0) throw new Error(`Local HEVC encoder exited with code ${exitCode}.`);

    const output = await ffmpeg.readFile('/output.mp4');
    signal.throwIfAborted();
    if (!(output instanceof Uint8Array) || output.byteLength < 64) {
      throw new Error('Local HEVC encoder returned an empty MP4.');
    }
    return new Blob([output], { type: 'video/mp4' });
  } finally {
    ffmpeg.off('progress', progressHandler);
    signal.removeEventListener('abort', onAbort);
    terminate();
  }
}