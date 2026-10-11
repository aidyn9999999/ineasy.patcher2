/* Local FFmpeg.wasm worker bridge for INEASY Patcher.
 * Protocol-compatible with @ffmpeg/ffmpeg 0.12.10; video processing stays in this browser.
 */
const FFMessageType = {
  LOAD: 'LOAD', EXEC: 'EXEC', FFPROBE: 'FFPROBE', WRITE_FILE: 'WRITE_FILE',
  READ_FILE: 'READ_FILE', DELETE_FILE: 'DELETE_FILE', RENAME: 'RENAME',
  CREATE_DIR: 'CREATE_DIR', LIST_DIR: 'LIST_DIR', DELETE_DIR: 'DELETE_DIR',
  ERROR: 'ERROR', DOWNLOAD: 'DOWNLOAD', PROGRESS: 'PROGRESS', LOG: 'LOG',
  MOUNT: 'MOUNT', UNMOUNT: 'UNMOUNT'
};
const DEFAULT_CORE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js';
let ffmpegCore = null;

async function loadCore(config) {
  let coreURL = config?.coreURL || DEFAULT_CORE_URL;
  try {
    // This worker is an ES module, where importScripts is intentionally unavailable.
    importScripts(coreURL);
  } catch (_) {
    ffmpegCore = (await import(coreURL)).default;
    if (typeof ffmpegCore !== 'function') throw new Error('FFmpeg core could not be imported');
  }
  if (!ffmpegCore && self.createFFmpegCore) ffmpegCore = self.createFFmpegCore;
  if (typeof ffmpegCore !== 'function') throw new Error('FFmpeg core could not be imported');

  const wasmURL = config?.wasmURL || coreURL.replace(/\.js$/i, '.wasm');
  const workerURL = config?.workerURL || coreURL.replace(/\.js$/i, '.worker.js');
  const core = await ffmpegCore({
    mainScriptUrlOrBlob: coreURL + '#' + btoa(JSON.stringify({ wasmURL, workerURL }))
  });
  core.setLogger((data) => self.postMessage({ type: FFMessageType.LOG, data }));
  core.setProgress((data) => self.postMessage({ type: FFMessageType.PROGRESS, data }));
  return core;
}

async function dispatch(type, data) {
  if (type === FFMessageType.LOAD) {
    const first = !self.__ineasyFfmpegCore;
    self.__ineasyFfmpegCore = await loadCore(data || {});
    return first;
  }
  const core = self.__ineasyFfmpegCore;
  if (!core) throw new Error('FFmpeg core is not loaded');
  switch (type) {
    case FFMessageType.EXEC: {
      core.setTimeout(data?.timeout ?? -1);
      core.exec(...(data?.args || []));
      const result = core.ret;
      core.reset();
      return result;
    }
    case FFMessageType.FFPROBE: {
      core.setTimeout(data?.timeout ?? -1);
      core.ffprobe(...(data?.args || []));
      const result = core.ret;
      core.reset();
      return result;
    }
    case FFMessageType.WRITE_FILE:
      core.FS.writeFile(data.path, data.data);
      return true;
    case FFMessageType.READ_FILE:
      return core.FS.readFile(data.path, { encoding: data.encoding || 'binary' });
    case FFMessageType.DELETE_FILE:
      core.FS.unlink(data.path);
      return true;
    case FFMessageType.RENAME:
      core.FS.rename(data.oldPath, data.newPath);
      return true;
    case FFMessageType.CREATE_DIR:
      core.FS.mkdir(data.path);
      return true;
    case FFMessageType.LIST_DIR:
      return core.FS.readdir(data.path).map((name) => {
        const stat = core.FS.stat(data.path + '/' + name);
        return { name, isDir: core.FS.isDir(stat.mode) };
      });
    case FFMessageType.DELETE_DIR:
      core.FS.rmdir(data.path);
      return true;
    case FFMessageType.MOUNT: {
      const fs = core.FS.filesystems[data.fsType];
      if (!fs) return false;
      core.FS.mount(fs, data.options, data.mountPoint);
      return true;
    }
    case FFMessageType.UNMOUNT:
      core.FS.unmount(data.mountPoint);
      return true;
    default:
      throw new Error('Unknown FFmpeg worker message: ' + type);
  }
}

self.onmessage = async (event) => {
  const { id, type, data } = event.data || {};
  let result;
  try {
    result = await dispatch(type, data);
  } catch (error) {
    self.postMessage({ id, type: FFMessageType.ERROR, data: String(error?.message || error) });
    return;
  }
  const transfers = result instanceof Uint8Array ? [result.buffer] : [];
  self.postMessage({ id, type, data: result }, transfers);
};
