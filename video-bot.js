'use strict';
// Telegram video patcher: send a video to the bot and get it back processed with the V2
// settings (ffmpeg stream-copy + ADJN patch). There is nothing to choose — V2 is hard-wired.
// Everything lives in a per-job temp dir that is deleted as soon as the result is sent, so
// the server disk only ever holds the videos that are being processed right now.
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const http = require('http');
const { Markup } = require('telegraf');
const { patchVideoV2 } = require('./v2-engine');

const MB = 1024 * 1024;
const MAX_VIDEO_BYTES = (Number(process.env.BOT_VIDEO_MAX_MB) || 150) * MB;
const CONCURRENCY = Math.max(1, Number(process.env.BOT_VIDEO_CONCURRENCY) || 1);
const MAX_QUEUE = Math.max(1, Number(process.env.BOT_VIDEO_MAX_QUEUE) || 20);
// Empty = results are deleted right after sending. Set it (e.g. on a laptop) to keep each
// result in that folder so you can look at it and delete it yourself.
const KEEP_DIR = (process.env.BOT_VIDEO_KEEP_DIR || '').trim();
const JOBS_DIR = process.env.BOT_VIDEO_TMP_DIR || path.join(os.tmpdir(), 'ineasy-bot-jobs');
// The cloud Bot API lets a bot download 20 MB and upload 50 MB. Bigger files need a local
// Bot API server (BOT_API_ROOT), which the bot then talks to instead.
const CLOUD_DOWNLOAD_LIMIT = 20 * MB;
const CLOUD_UPLOAD_LIMIT = 50 * MB;
// ffmpeg writes a remux next to the output and ADJN needs RAM for the whole file; keep headroom.
const DISK_FACTOR = 3;
// Queue length from which the "use the website" hint is added to the waiting message.
const SITE_HINT_AFTER = Math.max(1, Number(process.env.BOT_VIDEO_SITE_HINT_AFTER) || 3);
const VIDEO_EXT = /\.(mp4|mov|m4v|mkv|webm|avi|3gp|mts|m2ts)$/i;

const TEXTS = {
  ru: {
    subscribe: 'Для обработки видео подпишитесь на канал и отправьте видео ещё раз.',
    subscribeBtn: '📢 Подписаться',
    subscribeError: 'Не удалось проверить подписку. Попробуйте ещё раз чуть позже.',
    tooBig: (max) => `❌ Видео слишком большое. Максимум — ${max} МБ.`,
    needLocalApi: '❌ Сейчас бот принимает видео только до 20 МБ. Отправьте файл поменьше или обработайте видео на сайте.',
    busyUser: '⏳ Ваше предыдущее видео ещё обрабатывается. Дождитесь результата.',
    queueFull: '⏳ Сейчас очень много видео. Попробуйте через пару минут.',
    noDisk: '⏳ На сервере сейчас мало места. Попробуйте через минуту.',
    siteHint: (url) => `\n\n🌐 Не хотите ждать? Обработайте видео на сайте прямо в браузере: ${url}`,
    queued: (n) => `⏳ Видео в очереди, перед вами: ${n}`,
    downloading: '⬇️ Скачиваю видео…',
    processing: '⚙️ Обрабатываю видео (V2)…',
    sending: '📤 Отправляю результат…',
    done: '✅ Готово! Видео обработано.',
    failed: '❌ Не удалось обработать видео. Баланс не списан. Попробуйте другой файл.',
    sendFailed: '❌ Не удалось отправить результат. Баланс не списан. Попробуйте ещё раз.',
    outTooBig: '❌ Готовый файл больше 50 МБ — бот не может его отправить. Обработайте это видео на сайте.',
    noBalance: '🆓 Видео закончились. Купите видео или пригласите друга.',
    unsupported: '❌ Отправьте видео файлом (mp4, mov).'
  },
  en: {
    subscribe: 'Subscribe to the channel to process videos, then send the video again.',
    subscribeBtn: '📢 Subscribe',
    subscribeError: 'Could not check your subscription. Please try again shortly.',
    tooBig: (max) => `❌ The video is too large. Maximum is ${max} MB.`,
    needLocalApi: '❌ The bot currently accepts videos up to 20 MB only. Send a smaller file or use the website.',
    busyUser: '⏳ Your previous video is still being processed. Please wait for the result.',
    queueFull: '⏳ There are too many videos right now. Please try again in a couple of minutes.',
    noDisk: '⏳ The server is low on space right now. Please try again in a minute.',
    siteHint: (url) => `\n\n🌐 Don't want to wait? Process the video on the website right in your browser: ${url}`,
    queued: (n) => `⏳ Your video is queued, ahead of you: ${n}`,
    downloading: '⬇️ Downloading the video…',
    processing: '⚙️ Processing the video (V2)…',
    sending: '📤 Sending the result…',
    done: '✅ Done! Your video is processed.',
    failed: '❌ Could not process the video. Your balance was not charged. Try another file.',
    sendFailed: '❌ Could not send the result. Your balance was not charged. Please try again.',
    outTooBig: '❌ The result is over 50 MB and the bot cannot send it. Process this video on the website.',
    noBalance: '🆓 You are out of videos. Buy videos or invite a friend.',
    unsupported: '❌ Send the video as a file (mp4, mov).'
  },
  kk: {
    subscribe: 'Бейнені өңдеу үшін арнаға жазылыңыз да, бейнені қайта жіберіңіз.',
    subscribeBtn: '📢 Жазылу',
    subscribeError: 'Жазылымды тексере алмадық. Сәлден соң қайталап көріңіз.',
    tooBig: (max) => `❌ Бейне тым үлкен. Максимум — ${max} МБ.`,
    needLocalApi: '❌ Қазір бот тек 20 МБ-қа дейінгі бейнені қабылдайды. Кішірек файл жіберіңіз немесе сайтты қолданыңыз.',
    busyUser: '⏳ Алдыңғы бейнеңіз әлі өңделіп жатыр. Нәтижесін күтіңіз.',
    queueFull: '⏳ Қазір бейне өте көп. Бірнеше минуттан соң қайталап көріңіз.',
    noDisk: '⏳ Серверде орын аз. Бір минуттан соң қайталап көріңіз.',
    siteHint: (url) => `\n\n🌐 Күткіңіз келмей ме? Бейнені сайтта браузердің өзінде өңдеңіз: ${url}`,
    queued: (n) => `⏳ Бейне кезекте, алдыңызда: ${n}`,
    downloading: '⬇️ Бейнені жүктеп жатырмын…',
    processing: '⚙️ Бейнені өңдеп жатырмын (V2)…',
    sending: '📤 Нәтижені жіберіп жатырмын…',
    done: '✅ Дайын! Бейне өңделді.',
    failed: '❌ Бейнені өңдеу мүмкін болмады. Баланс алынбады. Басқа файлды қолданып көріңіз.',
    sendFailed: '❌ Нәтижені жіберу мүмкін болмады. Баланс алынбады. Қайталап көріңіз.',
    outTooBig: '❌ Дайын файл 50 МБ-тан үлкен, бот жібере алмайды. Бұл бейнені сайтта өңдеңіз.',
    noBalance: '🆓 Бейнелер таусылды. Бейне сатып алыңыз немесе дос шақырыңыз.',
    unsupported: '❌ Бейнені файл ретінде жіберіңіз (mp4, mov).'
  }
};

// The video attached to a message, or null (photos, receipts and other documents are not videos).
function pickVideo(message) {
  if (!message) return null;
  if (message.video) {
    const v = message.video;
    return { fileId: v.file_id, size: Number(v.file_size) || 0, name: v.file_name || 'video.mp4' };
  }
  const d = message.document;
  if (d && (/^video\//i.test(d.mime_type || '') || VIDEO_EXT.test(d.file_name || ''))) {
    return { fileId: d.file_id, size: Number(d.file_size) || 0, name: d.file_name || 'video.mp4' };
  }
  return null;
}

function httpGetStream(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        return resolve(httpGetStream(new URL(res.headers.location, url).toString(), redirects - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`download_http_${res.statusCode}`));
      }
      resolve(res);
    }).on('error', reject);
  });
}

async function moveFile(from, to) {
  try {
    await fs.promises.rename(from, to);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    await fs.promises.copyFile(from, to);
    await fs.promises.rm(from, { force: true });
  }
}

function registerVideoPatcher(bot, deps) {
  const {
    ffmpegPath, ffprobePath, botToken, apiRoot, newsChannelId, websiteUrl,
    getLang, getFreeBalance, getPurchasedBalance, consumeProcessedVideo, replyNoBalance
  } = deps;
  const localApi = Boolean(apiRoot);
  const downloadLimit = localApi ? MAX_VIDEO_BYTES : Math.min(MAX_VIDEO_BYTES, CLOUD_DOWNLOAD_LIMIT);
  const uploadLimit = localApi ? Infinity : CLOUD_UPLOAD_LIMIT;

  const activeUsers = new Set();
  const queue = [];
  let running = 0;

  // Leftovers of a crashed run must not eat the small disk.
  const tempDirReady = fs.promises.rm(JOBS_DIR, { recursive: true, force: true })
    .then(() => fs.promises.mkdir(JOBS_DIR, { recursive: true }))
    .catch((error) => console.error('[INEASY BOT] temp dir setup failed:', error.message));

  async function isSubscribed(userId) {
    const member = await bot.telegram.getChatMember(newsChannelId, userId);
    return ['creator', 'administrator', 'member'].includes(member.status) ||
      (member.status === 'restricted' && member.is_member);
  }

  async function hasDiskFor(bytes) {
    try {
      const stat = await fs.promises.statfs(JOBS_DIR);
      return stat.bavail * stat.bsize > bytes * DISK_FACTOR + 50 * MB;
    } catch (_) {
      return true;
    }
  }

  async function downloadTo(fileId, destPath) {
    const file = await bot.telegram.getFile(fileId);
    const filePath = file.file_path;
    if (!filePath) throw new Error('telegram_file_path_missing');
    // Local Bot API server in --local mode returns an absolute path on its own disk: just move it.
    if (path.isAbsolute(filePath) && fs.existsSync(filePath)) {
      await moveFile(filePath, destPath);
      return;
    }
    const base = (apiRoot || 'https://api.telegram.org').replace(/\/+$/, '');
    const res = await httpGetStream(`${base}/file/bot${botToken}/${filePath.replace(/^\/+/, '')}`);
    await new Promise((resolve, reject) => {
      const sink = fs.createWriteStream(destPath);
      res.on('error', reject);
      sink.on('error', reject);
      sink.on('finish', resolve);
      res.pipe(sink);
    });
  }

  async function runJob(job) {
    const { ctx, video, lang, userId, statusMessageId } = job;
    const t = TEXTS[lang];
    const setStatus = (text) => ctx.telegram.editMessageText(ctx.chat.id, statusMessageId, undefined, text).catch(() => {});
    await tempDirReady;
    const jobDir = await fs.promises.mkdtemp(path.join(JOBS_DIR, 'job-'));
    const inputPath = path.join(jobDir, 'input.mp4');
    const outputPath = path.join(jobDir, 'output.mp4');
    try {
      await setStatus(t.downloading);
      await downloadTo(video.fileId, inputPath);
      const downloaded = (await fs.promises.stat(inputPath)).size;
      if (downloaded > MAX_VIDEO_BYTES) {
        await setStatus(t.tooBig(Math.round(MAX_VIDEO_BYTES / MB)));
        return;
      }

      await setStatus(t.processing);
      const baseName = path.basename(video.name, path.extname(video.name)) || 'video';
      let result;
      try {
        result = await patchVideoV2({
          ffmpegPath, ffprobePath, inputPath, outputPath, fileName: `${baseName}.mp4`
        });
      } catch (error) {
        console.error('[INEASY BOT] V2 processing failed:', { userId, reason: error.message, stderr: String(error.stderr || '').slice(-1500) });
        await setStatus(t.failed);
        return;
      }
      if (result.bytes > uploadLimit) {
        await setStatus(t.outTooBig);
        return;
      }

      await setStatus(t.sending);
      try {
        await ctx.replyWithDocument(
          { source: fs.createReadStream(outputPath), filename: `${baseName}-ineasy.mp4` },
          { caption: t.done }
        );
      } catch (error) {
        console.error('[INEASY BOT] sending result failed:', { userId, reason: error.message });
        await setStatus(t.sendFailed);
        return;
      }
      if (KEEP_DIR) {
        try {
          const userDir = path.join(KEEP_DIR, userId);
          await fs.promises.mkdir(userDir, { recursive: true });
          await moveFile(outputPath, path.join(userDir, `${Date.now()}-${baseName}-ineasy.mp4`));
        } catch (error) {
          console.error('[INEASY BOT] keeping result failed:', error.message);
        }
      }
      await ctx.telegram.deleteMessage(ctx.chat.id, statusMessageId).catch(() => {});
      // Charge only after the user actually received the file.
      await consumeProcessedVideo(userId, lang).catch((error) => {
        console.error('[INEASY BOT] consume failed after delivery:', { userId, reason: error.message });
      });
    } catch (error) {
      console.error('[INEASY BOT] job failed:', { userId, reason: error.message });
      await setStatus(t.failed);
    } finally {
      await fs.promises.rm(jobDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  function pump() {
    while (running < CONCURRENCY && queue.length) {
      const job = queue.shift();
      running += 1;
      runJob(job)
        .catch((error) => console.error('[INEASY BOT] unexpected job error:', error))
        .finally(() => {
          running -= 1;
          activeUsers.delete(job.userId);
          pump();
        });
      // Tell the people still waiting where they are now.
      queue.forEach((waiting, index) => {
        waiting.ctx.telegram.editMessageText(waiting.ctx.chat.id, waiting.statusMessageId, undefined, TEXTS[waiting.lang].queued(running + index) + (running + index >= SITE_HINT_AFTER ? TEXTS[waiting.lang].siteHint(websiteUrl) : '')).catch(() => {});
      });
    }
  }

  async function onMessage(ctx, next) {
    const video = pickVideo(ctx.message);
    if (!video) return next();
    // Private chats only: groups and channels never trigger processing.
    if (!ctx.chat || ctx.chat.type !== 'private') return;

    const userId = String(ctx.from.id);
    const lang = await getLang(userId);
    const t = TEXTS[lang];

    if (activeUsers.has(userId)) return ctx.reply(t.busyUser);
    if (video.size > MAX_VIDEO_BYTES) return ctx.reply(t.tooBig(Math.round(MAX_VIDEO_BYTES / MB)));
    if (video.size > downloadLimit) return ctx.reply(t.needLocalApi);
    if (queue.length >= MAX_QUEUE) return ctx.reply(t.queueFull + t.siteHint(websiteUrl));

    // Same entry conditions as the website: channel subscription and a positive balance.
    try {
      if (!await isSubscribed(ctx.from.id)) {
        const url = `https://t.me/${String(newsChannelId).replace(/^@/, '')}`;
        return ctx.reply(t.subscribe, Markup.inlineKeyboard([[Markup.button.url(t.subscribeBtn, url)]]));
      }
    } catch (error) {
      console.error('[INEASY BOT] subscription check failed:', error.message);
      return ctx.reply(t.subscribeError);
    }
    const [free, purchased] = await Promise.all([getFreeBalance(userId), getPurchasedBalance(userId)]);
    if (free + purchased <= 0) return replyNoBalance(ctx, lang);
    if (!await hasDiskFor(video.size)) return ctx.reply(t.noDisk + t.siteHint(websiteUrl));

    activeUsers.add(userId);
    try {
      const ahead = queue.length + running;
      const status = await ctx.reply(ahead >= CONCURRENCY ? t.queued(ahead) + (ahead >= SITE_HINT_AFTER ? t.siteHint(websiteUrl) : '') : t.downloading);
      queue.push({ ctx, video, lang, userId, statusMessageId: status.message_id });
    } catch (error) {
      activeUsers.delete(userId);
      throw error;
    }
    // Do not await the job: Telegram retries a webhook update that is not answered quickly.
    pump();
  }

  bot.on('video', onMessage);
  bot.on('document', onMessage);
}

module.exports = { registerVideoPatcher, pickVideo };
