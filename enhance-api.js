'use strict';
// HTTP side of the quality enhancer: upload + analysis, jobs with real progress, result, cancel.
// Jobs live in memory (one replica); temporary files are removed after TTL_MS or when the user cancels.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const engine = require('./enhance-engine');

const MAX_BYTES = 300 * 1024 * 1024;
const TTL_MS = 15 * 60 * 1000;
const MAX_WAITING = 3;

const HTTP_STATUS = {
  preset_unknown: 400, bad_options: 400, nothing_to_do: 400,
};

function registerEnhanceRoutes(app, { requireUserToken, hasPro, ffmpegPath, ffprobePath, onDone = () => {} }) {
  const uploads = new Map();
  const jobs = new Map();
  let tail = Promise.resolve();

  const removeDir = (dir) => fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
  const dropUpload = (id) => { const u = uploads.get(id); if (u) { uploads.delete(id); removeDir(u.dir); } };
  const live = (job) => job.status === 'queued' || job.status === 'enhancing';

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [id, u] of uploads) if (now - u.createdAt > TTL_MS) dropUpload(id);
    for (const [id, j] of jobs) if (!live(j) && now - (j.finishedAt || j.createdAt) > TTL_MS) { jobs.delete(id); removeDir(j.dir); }
  }, 60 * 1000);
  sweep.unref();

  const publicInfo = (i) => ({
    width: i.width, height: i.height, fps: Number(i.fps.toFixed(3)), vfr: i.vfr, seconds: Number(i.seconds.toFixed(2)),
    bytes: i.bytes, codec: i.codec, profile: i.profile, bits: i.bits, hdr: i.hdr, audio: i.audioCodec,
  });

  const publicJob = (job) => {
    const ahead = [...jobs.values()].filter((j) => live(j) && j.createdAt < job.createdAt).length;
    const out = {
      id: job.id, status: job.status, percent: Math.round(job.percent * 10) / 10, options: job.options,
      before: publicInfo(job.info), after: job.after ? publicInfo(job.after) : null, timings: job.timings, error: job.error || null,
    };
    if (job.status === 'queued') out.position = ahead + 1;
    if (job.status === 'enhancing' && job.percent >= 3) out.etaSeconds = Math.round(((Date.now() - job.startedAt) / 1000) * (100 - job.percent) / job.percent);
    return out;
  };

  const reject = (req, res, status, error, extra = {}) => { req.resume(); return res.status(status).json({ error, ...extra }); };

  // 1. Upload + analysis: the user sees the real codec / FPS / HDR before choosing settings.
  app.post('/api/enhance/upload', requireUserToken, async (req, res) => {
    const userId = req.telegramId;
    if (!ffmpegPath) return reject(req, res, 503, 'enhance_unavailable');
    if (!(await hasPro(userId))) return reject(req, res, 403, 'pro_required');
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > MAX_BYTES) return reject(req, res, 413, 'video_too_large');
    for (const [id, u] of uploads) if (u.userId === userId) dropUpload(id);
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ineasy-enh-'));
    const inputPath = path.join(dir, 'input.mp4');
    const started = Date.now();
    try {
      let received = 0;
      await new Promise((resolve, fail) => {
        const sink = fs.createWriteStream(inputPath);
        req.on('data', (chunk) => {
          received += chunk.length;
          if (received > MAX_BYTES) { req.destroy(); sink.destroy(); fail(new Error('video_too_large')); }
        });
        req.on('error', fail);
        req.on('aborted', () => fail(new Error('upload_aborted')));
        sink.on('error', fail);
        sink.on('finish', resolve);
        req.pipe(sink);
      });
      const receiveMs = Date.now() - started;
      if (received < 16) { await removeDir(dir); return res.status(400).json({ error: 'video_body_missing' }); }
      const analyzeStart = Date.now();
      let info;
      try { info = await engine.probe(ffprobePath, inputPath); } catch (error) { await removeDir(dir); return res.status(422).json({ error: 'enhance_unreadable' }); }
      if (!(info.seconds > 0) || !(info.fps > 0)) { await removeDir(dir); return res.status(422).json({ error: 'enhance_duration_unknown' }); }
      const id = crypto.randomUUID();
      uploads.set(id, { userId, dir, path: inputPath, info, createdAt: Date.now(), timings: { receiveMs, analyzeMs: Date.now() - analyzeStart } });
      return res.json({
        uploadId: id, info: publicInfo(info), timings: uploads.get(id).timings,
        limits: { maxSeconds: engine.allowedSeconds(info), maxMb: MAX_BYTES / 1048576 },
      });
    } catch (error) {
      await removeDir(dir);
      if (res.headersSent) return undefined;
      return res.status(error.message === 'video_too_large' ? 413 : 400).json({ error: error.message === 'video_too_large' ? 'video_too_large' : 'upload_failed' });
    }
  });

  // 2. Start a job for an uploaded video.
  app.post('/api/enhance/jobs', requireUserToken, async (req, res) => {
    const userId = req.telegramId;
    if (!(await hasPro(userId))) return res.status(403).json({ error: 'pro_required' });
    const upload = uploads.get(String((req.body || {}).uploadId));
    if (!upload || upload.userId !== userId) return res.status(404).json({ error: 'upload_not_found' });
    let options;
    try { options = engine.resolveOptions(upload.info, req.body); } catch (error) {
      return res.status(HTTP_STATUS[error.code] || 400).json({ error: error.code || 'bad_options' });
    }
    const maxSeconds = engine.allowedSeconds(upload.info);
    if (upload.info.seconds > maxSeconds) return res.status(413).json({ error: 'too_long', maxSeconds });
    const running = [...jobs.values()].filter(live);
    if (running.some((j) => j.userId === userId)) return res.status(429).json({ error: 'job_active' });
    if (running.length >= 1 + MAX_WAITING) return res.status(429).json({ error: 'busy' });

    uploads.delete(String(req.body.uploadId));
    const job = {
      id: crypto.randomUUID(), userId, status: 'queued', percent: 0, options, info: upload.info, after: null,
      dir: upload.dir, inputPath: upload.path, outputPath: path.join(upload.dir, 'output.mp4'),
      timings: { ...upload.timings }, createdAt: Date.now(),
    };
    jobs.set(job.id, job);
    tail = tail.then(() => runJob(job));
    return res.status(202).json({ id: job.id });
  });

  async function runJob(job) {
    if (job.status !== 'queued') return;
    job.status = 'enhancing';
    job.startedAt = Date.now();
    try {
      const handle = engine.startEnhance({
        ffmpegPath, inputPath: job.inputPath, outputPath: job.outputPath, info: job.info, options: job.options,
        onProgress: (fraction) => { job.percent = fraction * 100; },
      });
      job.cancel = handle.cancel;
      await handle.done;
      job.timings.enhanceMs = Date.now() - job.startedAt;
      job.after = await engine.probe(ffprobePath, job.outputPath);
      job.after.bytes = (await fs.promises.stat(job.outputPath)).size;
      job.timings.totalMs = Date.now() - job.createdAt;
      job.percent = 100;
      job.status = 'done';
      onDone(job.userId);
    } catch (error) {
      job.status = error.code === 'cancelled' ? 'cancelled' : 'error';
      job.error = error.code === 'timeout' ? 'timeout' : error.code === 'cancelled' ? null : 'failed';
      if (job.status === 'error') console.error('[INEASY Enhance] job failed:', { reason: error.code || error.message, stderr: String(error.stderr || '').slice(-1500) });
    } finally {
      job.finishedAt = Date.now();
      job.cancel = null;
      fs.promises.rm(job.inputPath, { force: true }).catch(() => {});
      if (job.status !== 'done') fs.promises.rm(job.outputPath, { force: true }).catch(() => {});
    }
  }

  const ownJob = (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job || job.userId !== req.telegramId) { res.status(404).json({ error: 'job_not_found' }); return null; }
    return job;
  };

  app.get('/api/enhance/jobs/:id', requireUserToken, (req, res) => {
    const job = ownJob(req, res);
    if (!job) return;
    res.set('Cache-Control', 'no-store');
    res.json(publicJob(job));
  });

  app.get('/api/enhance/jobs/:id/result', requireUserToken, (req, res) => {
    const job = ownJob(req, res);
    if (!job) return;
    if (job.status !== 'done') return res.status(409).json({ error: 'not_ready' });
    res.set('Content-Type', 'video/mp4');
    return res.sendFile(job.outputPath, { headers: { 'Content-Disposition': 'inline' } });
  });

  app.delete('/api/enhance/jobs/:id', requireUserToken, (req, res) => {
    const job = ownJob(req, res);
    if (!job) return;
    if (job.status === 'queued') { job.status = 'cancelled'; job.finishedAt = Date.now(); fs.promises.rm(job.inputPath, { force: true }).catch(() => {}); }
    else if (job.status === 'enhancing' && job.cancel) job.cancel();
    else { jobs.delete(job.id); removeDir(job.dir); }
    res.json({ ok: true });
  });
}

module.exports = { registerEnhanceRoutes };
