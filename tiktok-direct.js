// Direct TikTok integration (Login Kit + Content Posting API, Direct Post, FILE_UPLOAD).
// Enabled when TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are set; otherwise server.js keeps using Zernio.
// While the TikTok app is in review the direct flow is available to the admin only (adminId):
// every other user falls through to the Zernio routes registered after this module.
// It serves the same /api/tiktok/* routes and response shapes the web app already uses.
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream');
const { v4: uuidv4 } = require('uuid');

const API_ORIGIN = 'https://open.tiktokapis.com';
const AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const SCOPES = 'user.info.basic,video.publish';
const MB = 1024 * 1024;
const MAX_UPLOAD_BYTES = (Number(process.env.TIKTOK_MAX_UPLOAD_MB) || 1024) * MB;
const MAX_SPOOL_BYTES = (Number(process.env.TIKTOK_MAX_SPOOL_MB) || 20 * 1024) * MB;
const SINGLE_CHUNK_LIMIT = 64 * MB;
const CHUNK_SIZE = 16 * MB;
const SPOOL_TTL_MS = 2 * 60 * 60 * 1000;
const UPLOAD_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function registerTikTokDirect(app, { redis, requireUserToken, secret, siteUrl, captionSuffix, adminId }) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret || !adminId) return false;
  // next('route') hands everyone except the admin to the Zernio route registered later for the same path.
  const requireAdmin = (req, res, next) => (req.telegramId === String(adminId) ? next() : next('route'));

  const redirectUri = process.env.TIKTOK_REDIRECT_URI || new URL('/api/tiktok/callback', siteUrl).toString();
  const appPage = new URL('/app.html', siteUrl).toString();
  const spoolDir = path.join(os.tmpdir(), 'ineasy-tiktok-spool');
  fs.mkdirSync(spoolDir, { recursive: true });

  const spoolPath = (telegramId, uploadId) => path.join(spoolDir, `${telegramId}-${uploadId}.mp4`);
  const removeFile = (file) => fs.promises.rm(file, { force: true }).catch(() => {});

  async function sweepSpool() {
    try {
      const now = Date.now();
      for (const name of await fs.promises.readdir(spoolDir)) {
        const file = path.join(spoolDir, name);
        const stat = await fs.promises.stat(file).catch(() => null);
        if (stat && now - stat.mtimeMs > SPOOL_TTL_MS) await removeFile(file);
      }
    } catch (error) {
      console.error('[TikTok] spool cleanup failed:', error.message);
    }
  }
  sweepSpool();
  setInterval(sweepSpool, 15 * 60 * 1000).unref();

  async function spoolBytes() {
    let total = 0;
    for (const name of await fs.promises.readdir(spoolDir).catch(() => [])) {
      const stat = await fs.promises.stat(path.join(spoolDir, name)).catch(() => null);
      if (stat) total += stat.size;
    }
    return total;
  }

  // ---- token storage (AES-256-GCM, same scheme as the Zernio keys) ----
  const encKey = crypto.createHmac('sha256', secret).update('ineasy:tiktok-tokens:v1').digest();
  function encrypt(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return JSON.stringify({ iv: iv.toString('base64url'), tag: cipher.getAuthTag().toString('base64url'), ciphertext: ciphertext.toString('base64url') });
  }
  function decrypt(record) {
    const data = typeof record === 'string' ? JSON.parse(record) : record;
    const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, Buffer.from(data.iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(data.tag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.ciphertext, 'base64url')), decipher.final()]).toString('utf8'));
  }
  const tokensKey = (telegramId) => `tiktokTokens:${telegramId}`;
  async function loadTokens(telegramId) {
    const saved = await redis.get(tokensKey(telegramId));
    if (!saved) return null;
    try { return decrypt(saved); } catch (error) {
      console.error('[TikTok] cannot decrypt tokens for user', telegramId);
      return null;
    }
  }
  const saveTokens = (telegramId, tokens) => redis.set(tokensKey(telegramId), encrypt(tokens));

  function tokensFromResponse(data, previous = {}) {
    const now = Date.now();
    return {
      openId: data.open_id || previous.openId,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || previous.refreshToken,
      accessExpiresAt: now + (Number(data.expires_in) || 86400) * 1000,
      refreshExpiresAt: now + (Number(data.refresh_expires_in) || 365 * 86400) * 1000,
    };
  }

  async function oauthRequest(params) {
    const response = await fetch(`${API_ORIGIN}/v2/oauth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, ...params }).toString(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) {
      const error = new Error(data.error || 'tiktok_oauth_failed');
      error.status = response.status === 400 || response.status === 401 ? 401 : 502;
      throw error;
    }
    return data;
  }

  const refreshing = new Map();
  async function getAccessToken(telegramId) {
    const tokens = await loadTokens(telegramId);
    if (!tokens) return null;
    if (tokens.accessExpiresAt - 60 * 1000 > Date.now()) return tokens.accessToken;
    if (refreshing.has(telegramId)) return refreshing.get(telegramId);
    const job = (async () => {
      try {
        const data = await oauthRequest({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken });
        const next = tokensFromResponse(data, tokens);
        await saveTokens(telegramId, next);
        return next.accessToken;
      } catch (error) {
        if (error.status === 401) await redis.del(tokensKey(telegramId));
        return null;
      } finally {
        refreshing.delete(telegramId);
      }
    })();
    refreshing.set(telegramId, job);
    return job;
  }

  async function apiCall(accessToken, resource, body) {
    const response = await fetch(`${API_ORIGIN}${resource}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(body || {}),
    });
    const payload = await response.json().catch(() => ({}));
    const code = payload.error?.code;
    if (!response.ok || (code && code !== 'ok')) {
      const error = new Error(code || `tiktok_api_${response.status}`);
      error.status = response.status === 401 || /access_token|scope_not_authorized/.test(code || '') ? 401 : (response.status >= 400 && response.status < 500 ? 400 : 502);
      error.tiktokMessage = payload.error?.message;
      throw error;
    }
    return payload.data || {};
  }

  async function queryCreator(accessToken) {
    const info = await apiCall(accessToken, '/v2/post/publish/creator_info/query/');
    return {
      username: info.creator_username || '',
      displayName: info.creator_nickname || '',
      privacyLevels: Array.isArray(info.privacy_level_options) ? info.privacy_level_options : [],
      commentDisabled: Boolean(info.comment_disabled),
      duetDisabled: Boolean(info.duet_disabled),
      stitchDisabled: Boolean(info.stitch_disabled),
      maxVideoPostDurationSec: info.max_video_post_duration_sec || null,
      postingLimits: { interactionSettings: { allow_comment: { enabled: !info.comment_disabled } } },
    };
  }

  const fail = (res, error, fallback) => res.status(error.status || 502).json({ error: error.message || fallback });

  // ---- routes (registered before the Zernio ones, so they take precedence) ----
  // The user pastes no API key any more; keep the old endpoint harmless for cached pages.
  app.post('/api/tiktok/key', requireUserToken, requireAdmin, (req, res) => res.json({ configured: true }));

  app.get('/api/tiktok/status', requireUserToken, requireAdmin, async (req, res) => {
    try {
      const accessToken = await getAccessToken(req.telegramId);
      if (!accessToken) return res.json({ configured: true, provider: 'direct', connected: false });
      const tokens = await loadTokens(req.telegramId);
      const creator = await queryCreator(accessToken);
      res.json({
        configured: true,
        provider: 'direct',
        connected: true,
        account: { id: tokens.openId, username: creator.username, displayName: creator.displayName },
        creatorInfo: creator,
      });
    } catch (error) {
      if (error.status === 401) {
        await redis.del(tokensKey(req.telegramId));
        return res.json({ configured: true, provider: 'direct', connected: false });
      }
      console.error('[TikTok] status failed:', error.message);
      fail(res, error, 'tiktok_status_failed');
    }
  });

  app.get('/api/tiktok/connect', requireUserToken, requireAdmin, async (req, res) => {
    try {
      const state = crypto.randomBytes(24).toString('hex');
      await redis.set(`tiktokOAuthState:${state}`, req.telegramId, { ex: 600 });
      const query = new URLSearchParams({ client_key: clientKey, scope: SCOPES, response_type: 'code', redirect_uri: redirectUri, state });
      res.json({ authUrl: `${AUTHORIZE_URL}?${query.toString()}` });
    } catch (error) {
      console.error('[TikTok] connect failed:', error.message);
      res.status(503).json({ error: 'tiktok_connect_failed' });
    }
  });

  // TikTok redirects the browser here. The user is identified by the one-time state, not by cookies.
  app.get('/api/tiktok/callback', async (req, res) => {
    const back = (params) => res.redirect(`${appPage}?${new URLSearchParams(params).toString()}`);
    const { code, state, error: oauthError } = req.query;
    if (typeof state !== 'string' || !/^[0-9a-f]{48}$/.test(state)) return back({ error: 'tiktok_invalid_state' });
    try {
      const telegramId = await redis.get(`tiktokOAuthState:${state}`);
      await redis.del(`tiktokOAuthState:${state}`);
      if (!telegramId) return back({ error: 'tiktok_state_expired' });
      if (oauthError || typeof code !== 'string') return back({ error: 'tiktok_access_denied' });
      const data = await oauthRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
      if (!String(data.scope || '').includes('video.publish')) return back({ error: 'tiktok_permission_missing' });
      await saveTokens(String(telegramId), tokensFromResponse(data));
      back({ connected: 'tiktok' });
    } catch (error) {
      console.error('[TikTok] callback failed:', error.message);
      back({ error: 'tiktok_connect_failed' });
    }
  });

  app.delete('/api/tiktok/disconnect', requireUserToken, requireAdmin, async (req, res) => {
    try {
      const tokens = await loadTokens(req.telegramId);
      if (tokens?.accessToken) {
        await fetch(`${API_ORIGIN}/v2/oauth/revoke/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, token: tokens.accessToken }).toString(),
        }).catch(() => {});
      }
      await redis.del(tokensKey(req.telegramId));
      res.status(204).end();
    } catch (error) {
      res.status(503).json({ error: 'tiktok_disconnect_failed' });
    }
  });

  // Upload step: the video is spooled to disk until publish, because TikTok needs the
  // post settings (publish/init) before it accepts the file. One spooled file per user.
  app.post('/api/tiktok/media/presign', requireUserToken, requireAdmin, async (req, res) => {
    const { filename, contentType, size } = req.body || {};
    const extension = typeof filename === 'string' ? path.extname(filename).toLowerCase() : '';
    const supported = (extension === '.mp4' && contentType === 'video/mp4') || (extension === '.mov' && contentType === 'video/quicktime');
    if (!supported) return res.status(400).json({ error: 'unsupported_video_format' });
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_UPLOAD_BYTES) return res.status(400).json({ error: 'video_size_out_of_range' });
    try {
      const previous = await redis.get(`tiktokDirectCurrent:${req.telegramId}`);
      if (typeof previous === 'string' && UPLOAD_ID_RE.test(previous)) await removeFile(spoolPath(req.telegramId, previous));
      if ((await spoolBytes()) + size > MAX_SPOOL_BYTES) return res.status(503).json({ error: 'server_busy_try_later' });
      const uploadId = uuidv4();
      await redis.set(`tiktokDirectUpload:${req.telegramId}:${uploadId}`, JSON.stringify({ size, contentType, ready: false }), { ex: 3600 });
      await redis.set(`tiktokDirectCurrent:${req.telegramId}`, uploadId, { ex: 3600 });
      res.json({ uploadId });
    } catch (error) {
      console.error('[TikTok] presign failed:', error.message);
      res.status(503).json({ error: 'media_upload_setup_failed' });
    }
  });

  app.put('/api/tiktok/media/upload/:uploadId', requireUserToken, requireAdmin, async (req, res) => {
    const { uploadId } = req.params;
    if (!UPLOAD_ID_RE.test(uploadId)) return res.status(400).json({ error: 'invalid_upload' });
    const metaKey = `tiktokDirectUpload:${req.telegramId}:${uploadId}`;
    try {
      const saved = await redis.get(metaKey);
      if (!saved) return res.status(404).json({ error: 'upload_expired' });
      const meta = typeof saved === 'string' ? JSON.parse(saved) : saved;
      if (req.headers['content-type'] !== meta.contentType) return res.status(400).json({ error: 'upload_type_mismatch' });
      const declared = Number(req.headers['content-length']);
      if (!Number.isFinite(declared) || declared !== meta.size) return res.status(400).json({ error: 'upload_size_mismatch' });

      const file = spoolPath(req.telegramId, uploadId);
      let received = 0;
      req.on('data', (chunk) => { received += chunk.length; if (received > meta.size) req.destroy(); });
      pipeline(req, fs.createWriteStream(file), async (error) => {
        if (error || received !== meta.size) {
          await removeFile(file);
          if (!res.headersSent) res.status(400).json({ error: 'upload_incomplete' });
          return;
        }
        try {
          await redis.set(metaKey, JSON.stringify({ ...meta, ready: true }), { ex: 3600 });
          res.json({ uploadId });
        } catch (redisError) {
          await removeFile(file);
          if (!res.headersSent) res.status(503).json({ error: 'media_upload_finalize_failed' });
        }
      });
    } catch (error) {
      if (!res.headersSent) res.status(503).json({ error: 'media_upload_failed' });
    }
  });

  function putChunk(uploadUrl, file, start, end, total, contentType) {
    return new Promise((resolve, reject) => {
      const target = new URL(uploadUrl);
      if (target.protocol !== 'https:') return reject(new Error('invalid_tiktok_upload_url'));
      const request = https.request({
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(end - start + 1),
          'Content-Range': `bytes ${start}-${end}/${total}`,
        },
      }, (response) => {
        response.resume();
        response.on('end', () => (response.statusCode >= 200 && response.statusCode < 300
          ? resolve()
          : reject(new Error('tiktok_chunk_upload_failed'))));
      });
      request.on('error', () => reject(new Error('tiktok_chunk_upload_failed')));
      fs.createReadStream(file, { start, end }).on('error', reject).pipe(request);
    });
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  app.post('/api/tiktok/publish', requireUserToken, requireAdmin, async (req, res) => {
    const { accountId, uploadId, content, privacyLevel, allowComment, allowDuet, allowStitch, madeWithAi, commercialContentType, confirmedPreview, consentGiven, scheduledFor } = req.body || {};
    if (typeof content !== 'string' || content.length > 2200) return res.status(400).json({ error: 'invalid_caption' });
    const trimmed = content.trim();
    const caption = trimmed.endsWith(captionSuffix) ? trimmed : `${trimmed}${trimmed ? '\n' : ''}${captionSuffix}`;
    if (caption.length > 2200) return res.status(400).json({ error: 'invalid_caption' });
    if (!confirmedPreview || !consentGiven) return res.status(400).json({ error: 'publishing_consent_required' });
    if (typeof uploadId !== 'string' || !UPLOAD_ID_RE.test(uploadId) || typeof accountId !== 'string') return res.status(400).json({ error: 'upload_or_account_required' });
    if (scheduledFor) return res.status(400).json({ error: 'scheduling_not_supported' });
    if (!['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'].includes(privacyLevel)) return res.status(400).json({ error: 'privacy_level_not_available' });
    if (!['none', 'brand_organic', 'brand_content'].includes(commercialContentType)) return res.status(400).json({ error: 'invalid_commercial_content_type' });
    if (commercialContentType === 'brand_content' && privacyLevel === 'SELF_ONLY') return res.status(400).json({ error: 'branded_content_cannot_be_private' });

    const lockKey = `tiktokDirectPublishing:${req.telegramId}`;
    const metaKey = `tiktokDirectUpload:${req.telegramId}:${uploadId}`;
    const file = spoolPath(req.telegramId, uploadId);
    let locked = false;
    try {
      locked = Boolean(await redis.set(lockKey, '1', { nx: true, ex: 900 }));
      if (!locked) return res.status(409).json({ error: 'publish_already_running' });

      const saved = await redis.get(metaKey);
      const meta = saved ? (typeof saved === 'string' ? JSON.parse(saved) : saved) : null;
      if (!meta || !meta.ready) return res.status(404).json({ error: 'upload_not_found_or_expired' });
      const stat = await fs.promises.stat(file).catch(() => null);
      if (!stat || stat.size !== meta.size) return res.status(404).json({ error: 'upload_not_found_or_expired' });

      const tokens = await loadTokens(req.telegramId);
      const accessToken = tokens && await getAccessToken(req.telegramId);
      if (!accessToken) return res.status(401).json({ error: 'tiktok_account_not_connected' });
      if (tokens.openId !== accountId) return res.status(403).json({ error: 'tiktok_account_not_connected' });

      const creator = await queryCreator(accessToken);
      if (creator.privacyLevels.length && !creator.privacyLevels.includes(privacyLevel)) return res.status(400).json({ error: 'privacy_level_not_available' });

      const size = meta.size;
      const chunkSize = size <= SINGLE_CHUNK_LIMIT ? size : CHUNK_SIZE;
      const totalChunks = Math.max(1, Math.floor(size / chunkSize));
      const init = await apiCall(accessToken, '/v2/post/publish/video/init/', {
        post_info: {
          title: caption,
          privacy_level: privacyLevel,
          disable_comment: !allowComment || creator.commentDisabled,
          disable_duet: !allowDuet || creator.duetDisabled,
          disable_stitch: !allowStitch || creator.stitchDisabled,
          is_aigc: Boolean(madeWithAi),
          brand_content_toggle: commercialContentType === 'brand_content',
          brand_organic_toggle: commercialContentType === 'brand_organic',
        },
        source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: chunkSize, total_chunk_count: totalChunks },
      });
      if (!init.publish_id || !init.upload_url) throw new Error('tiktok_init_failed');

      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * chunkSize;
        const end = index === totalChunks - 1 ? size - 1 : start + chunkSize - 1;
        await putChunk(init.upload_url, file, start, end, size, meta.contentType);
      }

      let status = 'PROCESSING_UPLOAD';
      let failReason = null;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await sleep(2000);
        const info = await apiCall(accessToken, '/v2/post/publish/status/fetch/', { publish_id: init.publish_id });
        status = info.status || status;
        failReason = info.fail_reason || null;
        if (status === 'PUBLISH_COMPLETE' || status === 'FAILED') break;
      }
      if (status === 'FAILED') return res.status(502).json({ error: failReason || 'tiktok_publish_failed' });
      const platformStatus = status === 'PUBLISH_COMPLETE' ? 'published' : 'processing';
      res.status(201).json({
        post: { id: init.publish_id, status: platformStatus, platforms: [{ platform: 'tiktok', status: platformStatus }] },
        draft: false,
      });
    } catch (error) {
      console.error('[TikTok] publish failed', { status: error.status || 502, message: error.message, detail: error.tiktokMessage || null });
      if (!res.headersSent) res.status(error.status || 502).json({ error: error.message || 'tiktok_publish_failed' });
    } finally {
      await removeFile(file);
      await redis.del(metaKey).catch(() => {});
      if (locked) await redis.del(lockKey).catch(() => {});
    }
  });

  console.log('[TikTok] direct integration enabled, redirect URI:', redirectUri);
  return true;
}

module.exports = { registerTikTokDirect };
