require('dotenv').config();
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Telegraf, Markup } = require('telegraf');
const { Redis } = require('@upstash/redis');
const { execFile } = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const crypto = require('crypto');
let FFPROBE_PATH = 'ffprobe';
try { FFPROBE_PATH = require('ffprobe-static').path; } catch (e) { /* используем системный ffprobe */ }

const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME || 'ineasybot';
const PORT = process.env.PORT || 3000;
const ADMIN_ID = process.env.ADMIN_ID ? String(process.env.ADMIN_ID).trim() : null;
const WEEKLY_FREE_BALANCE = 2;
const CARD_INFO = '4400 4300 4955 5771\nИмя: Айдынбек Н.';
const SITE_URL = process.env.SITE_URL || 'https://ineasypatcher2-production.up.railway.app/app.html';

const PACKAGES = [
  [3, 450],
  [5, 725],
  [10, 1400],
  [15, 2025],
  [20, 2600],
  [30, 3750],
  [50, 6000],
  [100, 11000],
];

if (!BOT_TOKEN) {
  console.error('Не найден BOT_TOKEN.');
  process.exit(1);
}
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('Не найдены UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.');
  process.exit(1);
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const BTN = {
  ru: { buy: '🛒 Купить лимиты', balance: '💰 Баланс', profile: '👤 Профиль', lang: '🌐 Язык', check: '🔍 Чекер видео' },
  en: { buy: '🛒 Buy limits', balance: '💰 Balance', profile: '👤 Profile', lang: '🌐 Language', check: '🔍 Video checker' },
  kk: { buy: '🛒 Лимит сатып алу', balance: '💰 Баланс', profile: '👤 Профиль', lang: '🌐 Тіл', check: '🔍 Бейне тексеру' },
};

function langChoiceKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🇷🇺 Русский', 'lang_ru')],
    [Markup.button.callback('🇬🇧 English', 'lang_en')],
    [Markup.button.callback('🇰🇿 Қазақша', 'lang_kk')],
  ]);
}

const TEXTS = {
  ru: {
    welcome: (name) =>
      `👋 Привет, ${name}!\n\n` +
      `Добро пожаловать в INEASY PATCHER 🚀🔥\n\n` +
      `🎬 Как обработать видео:\n\n` +
      `1️⃣ Перейдите на сайт патчера:\n🔗 ${SITE_URL}\n\n` +
      `2️⃣ 🔐 Авторизуйтесь на сайте.\n\n` +
      `3️⃣ 🎥 Выберите своё видео и патчите его как необходимо.\n\n` +
      `4️⃣ ✅ После завершения обработки скачайте готовое видео и опубликуйте его согласно инструкции.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `🔥 ЗАКОНЧИЛИСЬ ЛИМИТЫ? 🔥\n\n` +
      `💎 Не останавливай обработку!\n` +
      `🛒 КУПИТЬ ДОПОЛНИТЕЛЬНЫЕ ЛИМИТЫ\n\n` +
      `💰 Выгодная цена • Быстрая активация • Больше обработок\n\n` +
      `👇 Нажмите кнопку «${BTN.ru.buy}» внизу экрана! 👇\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `✨ Спасибо, что используете INEASY PATCHER!`,
    authSuccess: '✅ Успешно авторизовались!\n\nВернитесь на сайт — там уже можно работать.',
    packagesTitle: '🛒 Выберите пакет лимитов:',
    packageButton: (count, perUnit, price) => `${count} видео × ${perUnit} ₸ = ${price.toLocaleString('ru-RU')} ₸`,
    packageDetails: (count, price) =>
      `🛒 Пакет: ${count} видео за ${price.toLocaleString('ru-RU')} тенге\n\n` +
      `💳 Оплата на карту:\n${CARD_INFO}\n\n` +
      `✅ После перевода отправьте сюда чек и ваш Telegram ID.\n\n` +
      `🔎 Как узнать свой Telegram ID:\n` +
      `1) Нажмите кнопку «${BTN.ru.profile}» внизу и скопируйте ID оттуда\n` +
      `2) Либо зайдите на сайт — ID указан в углу экрана`,
    balance: (free, purchased) =>
      `💰 Ваш баланс:\n\n` +
      `🆓 Бесплатный (на этой неделе): ${free} видео\n` +
      `💎 Купленный: ${purchased} видео\n\n` +
      `📊 Всего доступно: ${free + purchased} видео`,
    profile: (username, id, patched, free, purchased) =>
      `👤 Профиль\n\n` +
      `Ник: ${username}\n` +
      `Telegram ID: ${id}\n\n` +
      `🎬 Обработано видео: ${patched}\n` +
      `🆓 Бесплатный баланс (неделя): ${free}\n` +
      `💎 Купленный баланс: ${purchased}\n` +
      `📊 Всего доступно: ${free + purchased}`,
    langSet: '✅ Язык переключён на русский.',
    checkerHint: '🔍 Отправьте сюда ссылку на видео из TikTok — я покажу качество, FPS, кодек и другие данные.',
    checkerWorking: '⏳ Анализирую видео...',
    checkerBusy: '⚠️ Сейчас много проверок, попробуйте через минуту.',
    checkerWait: '⏳ Подождите несколько секунд перед следующей проверкой.',
    checkerError: '❌ Не удалось получить данные. Проверьте ссылку (видео должно быть публичным) и попробуйте ещё раз.',
    checkerResult: (d) =>
      `🔍 Данные видео\n\n` +
      `📺 Качество: ${d.quality}p (${d.width}×${d.height})\n` +
      `🎞 FPS: ${d.fps}\n` +
      `🎬 Кодек: ${d.codec}\n` +
      `📶 Битрейт: ${d.bitrate}\n` +
      `⏱ Длительность: ${d.duration}\n` +
      `💾 Размер: ${d.size}\n` +
      `📁 Формат: ${d.ext}\n` +
      `👤 Автор: ${d.author}`,
  },
  en: {
    welcome: (name) =>
      `👋 Hi, ${name}!\n\n` +
      `Welcome to INEASY PATCHER 🚀🔥\n\n` +
      `🎬 How to process a video:\n\n` +
      `1️⃣ Go to the patcher website:\n🔗 ${SITE_URL}\n\n` +
      `2️⃣ 🔐 Log in on the website.\n\n` +
      `3️⃣ 🎥 Choose your video and patch it as needed.\n\n` +
      `4️⃣ ✅ Once processing is done, download the finished video and publish it as instructed.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `🔥 OUT OF LIMITS? 🔥\n\n` +
      `💎 Don't stop processing!\n` +
      `🛒 BUY MORE LIMITS\n\n` +
      `💰 Great price • Instant activation • More processing\n\n` +
      `👇 Tap the «${BTN.en.buy}» button at the bottom! 👇\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `✨ Thanks for using INEASY PATCHER!`,
    authSuccess: '✅ Successfully logged in!\n\nGo back to the website — you can start working now.',
    packagesTitle: '🛒 Choose a limits package:',
    packageButton: (count, perUnit, price) => `${count} videos × ${perUnit} ₸ = ${price.toLocaleString('en-US')} ₸`,
    packageDetails: (count, price) =>
      `🛒 Package: ${count} videos for ${price.toLocaleString('en-US')} tenge\n\n` +
      `💳 Card payment:\n${CARD_INFO}\n\n` +
      `✅ After the transfer, send the receipt and your Telegram ID here.\n\n` +
      `🔎 How to find your Telegram ID:\n` +
      `1) Tap the «${BTN.en.profile}» button below and copy the ID from there\n` +
      `2) Or open the website — the ID is shown in the corner of the screen`,
    balance: (free, purchased) =>
      `💰 Your balance:\n\n` +
      `🆓 Free (this week): ${free} videos\n` +
      `💎 Purchased: ${purchased} videos\n\n` +
      `📊 Total available: ${free + purchased} videos`,
    profile: (username, id, patched, free, purchased) =>
      `👤 Profile\n\n` +
      `Username: ${username}\n` +
      `Telegram ID: ${id}\n\n` +
      `🎬 Videos processed so far: ${patched}\n` +
      `🆓 Free balance (this week): ${free}\n` +
      `💎 Purchased balance: ${purchased}\n` +
      `📊 Total available: ${free + purchased}`,
    langSet: '✅ Language switched to English.',
    checkerHint: '🔍 Send a TikTok video link here — I will show its quality, FPS, codec and other details.',
    checkerWorking: '⏳ Analyzing the video...',
    checkerBusy: '⚠️ Many checks are running right now, please try again in a minute.',
    checkerWait: '⏳ Please wait a few seconds before the next check.',
    checkerError: '❌ Could not get the data. Check the link (the video must be public) and try again.',
    checkerResult: (d) =>
      `🔍 Video details\n\n` +
      `📺 Quality: ${d.quality}p (${d.width}×${d.height})\n` +
      `🎞 FPS: ${d.fps}\n` +
      `🎬 Codec: ${d.codec}\n` +
      `📶 Bitrate: ${d.bitrate}\n` +
      `⏱ Duration: ${d.duration}\n` +
      `💾 Size: ${d.size}\n` +
      `📁 Format: ${d.ext}\n` +
      `👤 Author: ${d.author}`,
  },
  kk: {
    welcome: (name) =>
      `👋 Сәлем, ${name}!\n\n` +
      `INEASY PATCHER-ге қош келдіңіз 🚀🔥\n\n` +
      `🎬 Видеоны қалай өңдеу керек:\n\n` +
      `1️⃣ Патчер сайтына өтіңіз:\n🔗 ${SITE_URL}\n\n` +
      `2️⃣ 🔐 Сайтта авторизациядан өтіңіз.\n\n` +
      `3️⃣ 🎥 Видеоңызды таңдап, қажетінше патчтаңыз.\n\n` +
      `4️⃣ ✅ Өңдеу аяқталған соң дайын видеоны жүктеп алып, нұсқаулыққа сай жариялаңыз.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `🔥 ЛИМИТ БІТТІ МЕ? 🔥\n\n` +
      `💎 Өңдеуді тоқтатпаңыз!\n` +
      `🛒 ҚОСЫМША ЛИМИТ САТЫП АЛУ\n\n` +
      `💰 Тиімді баға • Жылдам белсендіру • Көбірек өңдеу\n\n` +
      `👇 Төмендегі «${BTN.kk.buy}» батырмасын басыңыз! 👇\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `✨ INEASY PATCHER-ді қолданғаныңыз үшін рахмет!`,
    authSuccess: '✅ Сәтті авторизациядан өттіңіз!\n\nСайтқа қайта оралыңыз — енді жұмыс істей аласыз.',
    packagesTitle: '🛒 Лимит пакетін таңдаңыз:',
    packageButton: (count, perUnit, price) => `${count} видео × ${perUnit} ₸ = ${price.toLocaleString('ru-RU')} ₸`,
    packageDetails: (count, price) =>
      `🛒 Пакет: ${price.toLocaleString('ru-RU')} теңгеге ${count} видео\n\n` +
      `💳 Картаға төлем:\n${CARD_INFO}\n\n` +
      `✅ Аударымнан кейін чек пен Telegram ID-іңізді осында жіберіңіз.\n\n` +
      `🔎 Telegram ID-іңізді қалай табуға болады:\n` +
      `1) Төмендегі «${BTN.kk.profile}» батырмасын басып, ID-ды сол жерден көшіріп алыңыз\n` +
      `2) Немесе сайтқа кіріңіз — ID экранның бұрышында көрсетілген`,
    balance: (free, purchased) =>
      `💰 Сіздің балансыңыз:\n\n` +
      `🆓 Тегін (осы аптада): ${free} видео\n` +
      `💎 Сатып алынған: ${purchased} видео\n\n` +
      `📊 Барлығы қолжетімді: ${free + purchased} видео`,
    profile: (username, id, patched, free, purchased) =>
      `👤 Профиль\n\n` +
      `Ник: ${username}\n` +
      `Telegram ID: ${id}\n\n` +
      `🎬 Өңделген видео саны: ${patched}\n` +
      `🆓 Тегін баланс (апта): ${free}\n` +
      `💎 Сатып алынған баланс: ${purchased}\n` +
      `📊 Барлығы қолжетімді: ${free + purchased}`,
    langSet: '✅ Тіл қазақ тіліне ауыстырылды.',
    checkerHint: '🔍 Осында TikTok бейнесінің сілтемесін жіберіңіз — мен сапасын, FPS, кодегін және басқа деректерін көрсетемін.',
    checkerWorking: '⏳ Бейне талданып жатыр...',
    checkerBusy: '⚠️ Қазір тексерулер көп, бір минуттан кейін қайталап көріңіз.',
    checkerWait: '⏳ Келесі тексеруге дейін бірнеше секунд күтіңіз.',
    checkerError: '❌ Деректерді алу мүмкін болмады. Сілтемені тексеріңіз (бейне ашық болуы керек) да қайталап көріңіз.',
    checkerResult: (d) =>
      `🔍 Бейне деректері\n\n` +
      `📺 Сапасы: ${d.quality}p (${d.width}×${d.height})\n` +
      `🎞 FPS: ${d.fps}\n` +
      `🎬 Кодек: ${d.codec}\n` +
      `📶 Битрейт: ${d.bitrate}\n` +
      `⏱ Ұзақтығы: ${d.duration}\n` +
      `💾 Көлемі: ${d.size}\n` +
      `📁 Форматы: ${d.ext}\n` +
      `👤 Авторы: ${d.author}`,
  },
};

async function getLang(telegramId) {
  const val = await redis.get(`lang:${telegramId}`);
  return (val === 'en' || val === 'kk') ? val : 'ru';
}
async function setLang(telegramId, lang) {
  await redis.set(`lang:${telegramId}`, lang);
}

function currentWeekKey() {
  const now = new Date();
  const firstJan = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - firstJan) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + firstJan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
}

async function getFreeBalance(telegramId) {
  const weekKey = currentWeekKey();
  const storedWeek = await redis.get(`freeWeek:${telegramId}`);
  if (storedWeek !== weekKey) {
    await redis.set(`freeWeek:${telegramId}`, weekKey);
    await redis.set(`freeBalance:${telegramId}`, WEEKLY_FREE_BALANCE);
    return WEEKLY_FREE_BALANCE;
  }
  const val = await redis.get(`freeBalance:${telegramId}`);
  if (val === null || val === undefined) {
    await redis.set(`freeBalance:${telegramId}`, WEEKLY_FREE_BALANCE);
    return WEEKLY_FREE_BALANCE;
  }
  return Number(val);
}

async function getPurchasedBalance(telegramId) {
  const val = await redis.get(`purchased:${telegramId}`);
  if (val !== null && val !== undefined) {
    return Number(val);
  }
  // Миграция со старого формата (единый ключ balance:<id>, использовался раньше)
  const oldVal = await redis.get(`balance:${telegramId}`);
  if (oldVal !== null && oldVal !== undefined) {
    const migrated = Number(oldVal);
    await redis.set(`purchased:${telegramId}`, migrated);
    await redis.del(`balance:${telegramId}`);
    return migrated;
  }
  return 0;
}

async function addPurchasedBalance(telegramId, amount) {
  await getPurchasedBalance(telegramId);
  return redis.incrby(`purchased:${telegramId}`, amount);
}

async function getPatchedCount(telegramId) {
  const val = await redis.get(`patched:${telegramId}`);
  return val === null || val === undefined ? 0 : Number(val);
}

async function consumeOneVideo(telegramId) {
  const free = await getFreeBalance(telegramId);
  if (free > 0) {
    await redis.decrby(`freeBalance:${telegramId}`, 1);
  } else {
    const purchased = await getPurchasedBalance(telegramId);
    if (purchased <= 0) {
      throw new Error('no_balance');
    }
    await redis.decrby(`purchased:${telegramId}`, 1);
  }
  await redis.incrby(`patched:${telegramId}`, 1);
}

// ============ ЧЕКЕР ВИДЕО TIKTOK (yt-dlp) ============
const YTDLP_PATH = '/tmp/yt-dlp';
const TIKTOK_RE = /https?:\/\/(?:www\.|m\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/i;
const MAX_PARALLEL_CHECKS = 2;
const CHECK_COOLDOWN_MS = 8000;
let activeChecks = 0;
const lastCheckAt = new Map();
let ytdlpReady = null;

function downloadFile(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ineasy-patcher' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        return resolve(downloadFile(res.headers.location, dest, redirects - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    }).on('error', reject);
  });
}

// Скачивает автономный бинарник yt-dlp (не требует Python) один раз при старте
function ensureYtDlp() {
  if (ytdlpReady) return ytdlpReady;
  ytdlpReady = (async () => {
    if (fs.existsSync(YTDLP_PATH)) return;
    const tmp = YTDLP_PATH + '.part';
    await downloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux', tmp);
    fs.chmodSync(tmp, 0o755);
    fs.renameSync(tmp, YTDLP_PATH);
    console.log('yt-dlp установлен');
  })().catch((e) => {
    ytdlpReady = null;
    throw e;
  });
  return ytdlpReady;
}

function extractTikTokUrl(text) {
  const m = (text || '').match(TIKTOK_RE);
  return m ? m[0] : null;
}

function runYtDlp(url) {
  return new Promise((resolve, reject) => {
    execFile(
      YTDLP_PATH,
      ['--dump-single-json', '--no-warnings', '--no-playlist', '--socket-timeout', '15', url],
      { timeout: 45000, maxBuffer: 20 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(err);
        try { resolve(JSON.parse(stdout)); } catch (e) { reject(e); }
      }
    );
  });
}

function pickBestVideo(info) {
  const formats = (info.formats || []).filter((f) => f.vcodec && f.vcodec !== 'none' && f.height);
  if (!formats.length) return info.height ? info : null;
  formats.sort((a, b) => (b.height - a.height) || ((b.tbr || 0) - (a.tbr || 0)));
  return formats[0];
}

function fmtDuration(sec) {
  if (!sec) return '—';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ===== FFPROBE START =====
function parseFraction(str) {
  if (!str || typeof str !== 'string') return null;
  const [a, b] = str.split('/').map(Number);
  if (!a || !b) return null;
  return a / b;
}

function prettyCodec(name) {
  const c = (name || '').toLowerCase();
  if (c === 'h264') return 'H.264 (AVC)';
  if (c === 'hevc' || c === 'h265') return 'H.265 (HEVC)';
  if (c === 'av1') return 'AV1';
  if (c === 'vp9') return 'VP9';
  return c || '—';
}

// Читает реальные параметры файла (а не то, что заявляет TikTok)
function probeFile(filePath) {
  return new Promise((resolve, reject) => {
    execFile(
      FFPROBE_PATH,
      ['-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_name,width,height,avg_frame_rate,r_frame_rate,bit_rate:format=bit_rate,duration,size',
        '-of', 'json', filePath],
      { timeout: 20000, maxBuffer: 5 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(err);
        try { resolve(JSON.parse(stdout)); } catch (e) { reject(e); }
      }
    );
  });
}

function summarizeProbe(probe) {
  const st = (probe.streams && probe.streams[0]) || {};
  const fmt = probe.format || {};
  const fpsNum = parseFraction(st.avg_frame_rate) || parseFraction(st.r_frame_rate);
  const bps = Number(st.bit_rate) || Number(fmt.bit_rate) || 0;
  return {
    width: st.width,
    height: st.height,
    fps: fpsNum ? String(Math.round(fpsNum * 100) / 100).replace(/\.0+$/, '') : null,
    codec: st.codec_name ? prettyCodec(st.codec_name) : null,
    bitrate: bps ? `${Math.round(bps / 1000)} kbps` : null,
    duration: Number(fmt.duration) || null,
    bytes: Number(fmt.size) || null,
  };
}
// ===== FFPROBE END =====

function downloadVideoToTmp(url) {
  const id = uuidv4();
  const template = path.join(os.tmpdir(), `chk_${id}.%(ext)s`);
  return new Promise((resolve, reject) => {
    execFile(
      YTDLP_PATH,
      ['--no-warnings', '--no-playlist', '--max-filesize', '100M', '--socket-timeout', '15', '-o', template, url],
      { timeout: 90000, maxBuffer: 5 * 1024 * 1024 },
      (err) => {
        const files = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith(`chk_${id}.`) && !f.endsWith('.part'));
        const full = files.map((f) => path.join(os.tmpdir(), f));
        if (err || !full.length) {
          full.forEach((f) => fs.unlink(f, () => {}));
          return reject(err || new Error('download_failed'));
        }
        resolve(full[0]);
      }
    );
  });
}

async function analyzeTikTok(url) {
  await ensureYtDlp();
  const info = await runYtDlp(url);
  const v = pickBestVideo(info);
  if (!v) throw new Error('no_video_format');

  // Данные заявленные TikTok (запасной вариант)
  const meta = {
    width: v.width || info.width,
    height: v.height || info.height,
    fps: v.fps || info.fps || null,
    codec: v.vcodec && v.vcodec !== 'none' ? prettyCodec(v.vcodec.split('.')[0]) : null,
    bitrate: (v.vbr || v.tbr) ? `${Math.round(v.vbr || v.tbr)} kbps` : null,
    bytes: v.filesize || v.filesize_approx || null,
  };

  // Реальные данные: скачиваем файл во временную папку, читаем ffprobe, удаляем
  let real = {};
  let filePath = null;
  try {
    filePath = await downloadVideoToTmp(url);
    real = summarizeProbe(await probeFile(filePath));
    if (!real.bytes) real.bytes = fs.statSync(filePath).size;
  } catch (e) {
    console.error('ffprobe/скачивание не удалось, используем данные TikTok:', e.message);
  } finally {
    if (filePath) fs.unlink(filePath, () => {});
  }

  const width = real.width || meta.width;
  const height = real.height || meta.height;
  const bytes = real.bytes || meta.bytes;
  return {
    quality: Math.min(width || 0, height || 0) || '—',
    width: width || '—',
    height: height || '—',
    fps: real.fps || meta.fps || '—',
    codec: real.codec || meta.codec || '—',
    bitrate: real.bitrate || meta.bitrate || '—',
    duration: fmtDuration(real.duration || info.duration),
    size: bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '—',
    ext: v.ext || info.ext || '—',
    author: info.uploader ? `@${info.uploader}` : (info.creator || '—'),
  };
}

const sessions = new Map();
const tiktokProfilePromises = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (!s.authorized && now - s.createdAt > 30 * 60 * 1000) sessions.delete(id);
  }
}, 60 * 60 * 1000);

const bot = new Telegraf(BOT_TOKEN);

function mainKeyboard(lang) {
  const b = BTN[lang];
  return Markup.keyboard([[b.buy], [b.check], [b.balance, b.profile], [b.lang]]).resize();
}

function packagesKeyboard(lang) {
  const t = TEXTS[lang];
  const rows = PACKAGES.map(([count, price]) => {
    const perUnit = Math.round(price / count);
    return [Markup.button.callback(t.packageButton(count, perUnit, price), `pkg_${count}_${price}`)];
  });
  return Markup.inlineKeyboard(rows);
}

async function sendWelcome(ctx, lang) {
  const name = ctx.from.first_name || ctx.from.username || 'friend';
  await ctx.reply(TEXTS[lang].welcome(name), mainKeyboard(lang));
}

async function sendPackagesMenu(ctx, lang) {
  await ctx.reply(TEXTS[lang].packagesTitle, packagesKeyboard(lang));
}

async function sendBalance(ctx, lang) {
  const id = ctx.from.id;
  const [free, purchased] = await Promise.all([getFreeBalance(id), getPurchasedBalance(id)]);
  await ctx.reply(TEXTS[lang].balance(free, purchased), mainKeyboard(lang));
}

async function sendProfile(ctx, lang) {
  const id = ctx.from.id;
  const username = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || '—');
  const [free, purchased, patched] = await Promise.all([
    getFreeBalance(id), getPurchasedBalance(id), getPatchedCount(id),
  ]);
  await ctx.reply(TEXTS[lang].profile(username, id, patched, free, purchased), mainKeyboard(lang));
}

bot.start(async (ctx) => {
  const lang = await getLang(ctx.from.id);
  const payload = ctx.startPayload ? ctx.startPayload.trim() : null;

  if (payload && payload !== 'buyvideo' && !payload.startsWith('buy_') && sessions.has(payload)) {
    const session = sessions.get(payload);
    session.authorized = true;
    session.telegramId = ctx.from.id;
    session.username = ctx.from.username || null;
    session.firstName = ctx.from.first_name || '';
    sessions.set(payload, session);

    await ctx.reply(TEXTS[lang].authSuccess, mainKeyboard(lang));
    return;
  }

  if (payload && payload.startsWith('buy_')) {
    const [, count, price] = payload.split('_');
    if (count && price) {
      await ctx.reply(TEXTS[lang].packageDetails(Number(count), Number(price)), mainKeyboard(lang));
      return;
    }
  }

  await sendWelcome(ctx, lang);
});

bot.command('buyvideo', async (ctx) => sendPackagesMenu(ctx, await getLang(ctx.from.id)));
bot.command('autorization', async (ctx) => sendWelcome(ctx, await getLang(ctx.from.id)));
bot.command('balance', async (ctx) => sendBalance(ctx, await getLang(ctx.from.id)));
bot.command('profile', async (ctx) => sendProfile(ctx, await getLang(ctx.from.id)));

bot.command('language', async (ctx) => {
  await ctx.reply('Choose language / Выберите язык / Тілді таңдаңыз:', langChoiceKeyboard());
});

bot.hears([BTN.ru.lang, BTN.en.lang, BTN.kk.lang], async (ctx) => {
  await ctx.reply('Choose language / Выберите язык / Тілді таңдаңыз:', langChoiceKeyboard());
});

bot.action(/^lang_(ru|en|kk)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.match[1];
  await setLang(ctx.from.id, lang);
  await ctx.reply(TEXTS[lang].langSet, mainKeyboard(lang));
});

bot.hears([BTN.ru.buy, BTN.en.buy, BTN.kk.buy], async (ctx) => sendPackagesMenu(ctx, await getLang(ctx.from.id)));
bot.hears([BTN.ru.balance, BTN.en.balance, BTN.kk.balance], async (ctx) => sendBalance(ctx, await getLang(ctx.from.id)));
bot.hears([BTN.ru.profile, BTN.en.profile, BTN.kk.profile], async (ctx) => sendProfile(ctx, await getLang(ctx.from.id)));

bot.action(/^pkg_(\d+)_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const lang = await getLang(ctx.from.id);
  await ctx.reply(TEXTS[lang].packageDetails(Number(ctx.match[1]), Number(ctx.match[2])), mainKeyboard(lang));
});

bot.command('addvideo', async (ctx) => {
  if (!ADMIN_ID || String(ctx.from.id) !== ADMIN_ID) return;

  const parts = ctx.message.text.trim().split(/\s+/);
  const targetId = parts[1];
  const amount = parseInt(parts[2], 10);

  if (!targetId || !Number.isFinite(amount) || amount <= 0) {
    ctx.reply('Формат: /addvideo <telegram_id> <количество>');
    return;
  }

  try {
    const newBalance = await addPurchasedBalance(targetId, amount);
    ctx.reply(`✅ Зачислено ${amount} видео пользователю ${targetId}.\nНовый купленный баланс: ${newBalance}`);
  } catch (err) {
    console.error('Ошибка addvideo:', err);
    ctx.reply('❌ Не удалось обновить баланс. Проверьте логи сервера.');
  }
});

bot.hears([BTN.ru.check, BTN.en.check, BTN.kk.check], async (ctx) => {
  const lang = await getLang(ctx.from.id);
  await ctx.reply(TEXTS[lang].checkerHint, mainKeyboard(lang));
});

// Любое сообщение со ссылкой на TikTok = запуск чекера
bot.on('text', async (ctx, next) => {
  const url = extractTikTokUrl(ctx.message.text);
  if (!url) return next();

  const lang = await getLang(ctx.from.id);
  const t = TEXTS[lang];
  const now = Date.now();

  if (now - (lastCheckAt.get(ctx.from.id) || 0) < CHECK_COOLDOWN_MS) {
    await ctx.reply(t.checkerWait);
    return;
  }
  if (activeChecks >= MAX_PARALLEL_CHECKS) {
    await ctx.reply(t.checkerBusy);
    return;
  }

  lastCheckAt.set(ctx.from.id, now);
  activeChecks++;
  try {
    await ctx.reply(t.checkerWorking);
    const data = await analyzeTikTok(url);
    await ctx.reply(t.checkerResult(data), mainKeyboard(lang));
  } catch (err) {
    console.error('Ошибка чекера:', err.message);
    await ctx.reply(t.checkerError, mainKeyboard(lang));
  } finally {
    activeChecks--;
  }
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function createUserToken(telegramId) {
  const payload = Buffer.from(JSON.stringify({
    telegramId: String(telegramId),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', BOT_TOKEN).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function requireUserToken(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return res.status(401).json({ error: 'authentication_required' });

  const expected = crypto.createHmac('sha256', BOT_TOKEN).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch (error) { actual = Buffer.alloc(0); }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return res.status(401).json({ error: 'authentication_required' });
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!session.telegramId || session.expiresAt < Date.now()) {
      return res.status(401).json({ error: 'authentication_expired' });
    }
    req.telegramId = String(session.telegramId);
    next();
  } catch (error) {
    res.status(401).json({ error: 'authentication_required' });
  }
}

async function zernioRequest(resource, options = {}) {
  if (!process.env.ZERNIO_API_KEY) {
    const error = new Error('TikTok publishing is not configured. Add ZERNIO_API_KEY on the server.');
    error.status = 503;
    throw error;
  }
  const response = await fetch(`https://zernio.com/api/v1${resource}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.ZERNIO_API_KEY}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || 'TikTok provider request failed.');
    error.status = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw error;
  }
  return data;
}

async function getTiktokProfile(telegramId) {
  const key = `tiktokProfile:${telegramId}`;
  const existing = await redis.get(key);
  if (existing) return existing;
  if (tiktokProfilePromises.has(telegramId)) return tiktokProfilePromises.get(telegramId);

  const pending = zernioRequest('/profiles', {
    method: 'POST',
    body: { name: `telegram_${telegramId}` },
  }).then(async (data) => {
    if (!data.profile || !data.profile._id) throw new Error('Zernio did not return a profile id.');
    await redis.set(key, data.profile._id);
    return data.profile._id;
  }).finally(() => tiktokProfilePromises.delete(telegramId));
  tiktokProfilePromises.set(telegramId, pending);
  return pending;
}

async function getUserTiktokAccount(telegramId) {
  const profileId = await redis.get(`tiktokProfile:${telegramId}`);
  if (!profileId) return { profileId: null, account: null };
  const data = await zernioRequest(`/accounts?profileId=${encodeURIComponent(profileId)}`);
  const account = (data.accounts || []).find((item) => item.platform === 'tiktok' && item.isActive);
  return { profileId, account: account || null };
}

app.post('/api/session', (req, res) => {
  const sessionId = uuidv4();
  sessions.set(sessionId, { authorized: false, createdAt: Date.now() });
  res.json({ sessionId, botLink: `https://t.me/${BOT_USERNAME}?start=${sessionId}` });
});

app.get('/api/session/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'session_not_found' });
  res.json({
    authorized: session.authorized,
    telegramId: session.telegramId || null,
    username: session.username || null,
    firstName: session.firstName || null,
    authToken: session.authorized ? createUserToken(session.telegramId) : null,
  });
});

app.get('/api/tiktok/status', requireUserToken, async (req, res) => {
  try {
    const { profileId, account } = await getUserTiktokAccount(req.telegramId);
    if (!profileId || !account) return res.json({ connected: false });
    const creator = await zernioRequest(`/accounts/${encodeURIComponent(account._id)}/tiktok/creator-info?mediaType=video`);
    res.json({
      connected: true,
      account: { id: account._id, username: account.username || '' },
      creatorInfo: creator,
    });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'tiktok_status_failed' });
  }
});

app.get('/api/tiktok/connect', requireUserToken, async (req, res) => {
  try {
    const profileId = await getTiktokProfile(req.telegramId);
    const callbackUrl = `${new URL(SITE_URL).origin}/tiktok/callback`;
    const query = new URLSearchParams({ profileId, redirect_url: callbackUrl });
    const result = await zernioRequest(`/connect/tiktok?${query}`);
    if (!result.authUrl) return res.status(502).json({ error: 'tiktok_auth_url_missing' });
    res.json({ authUrl: result.authUrl });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'tiktok_connect_failed' });
  }
});

app.get('/tiktok/callback', (req, res) => {
  res.type('html').send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>TikTok connected</title></head><body><p>TikTok connected. Return to the INEASY tab.</p><script>window.close()</script></body></html>');
});

app.post('/api/tiktok/media/presign', requireUserToken, async (req, res) => {
  const { filename, contentType, size } = req.body || {};
  if (typeof filename !== 'string' || !filename.toLowerCase().endsWith('.mp4') || contentType !== 'video/mp4') {
    return res.status(400).json({ error: 'unsupported_video_format' });
  }
  if (!Number.isSafeInteger(size) || size < 1 || size > 4 * 1024 * 1024 * 1024) {
    return res.status(400).json({ error: 'video_size_out_of_range' });
  }
  try {
    const result = await zernioRequest('/media/presign', {
      method: 'POST',
      body: { filename: path.basename(filename), contentType, size },
    });
    const uploadId = uuidv4();
    const uploadKey = `tiktokUpload:${req.telegramId}:${uploadId}`;
    const uploadRecord = JSON.stringify({ uploadUrl: result.uploadUrl, publicUrl: result.publicUrl, contentType, size });
    await redis.set(uploadKey, uploadRecord, { ex: Math.min(3600, Math.max(60, Number(result.expiresIn) || 3600)) });
    res.json({ uploadId, publicUrl: result.publicUrl });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'media_upload_setup_failed' });
  }
});

app.put('/api/tiktok/media/upload/:uploadId', requireUserToken, async (req, res) => {
  const uploadKey = `tiktokUpload:${req.telegramId}:${req.params.uploadId}`;
  let upload;
  try {
    const saved = await redis.get(uploadKey);
    if (!saved) return res.status(404).json({ error: 'upload_expired' });
    upload = typeof saved === 'string' ? JSON.parse(saved) : saved;
    const target = new URL(upload.uploadUrl);
    if (target.protocol !== 'https:' || !target.hostname.endsWith('.r2.cloudflarestorage.com')) {
      return res.status(502).json({ error: 'invalid_storage_upload_url' });
    }
    if (req.headers['content-type'] !== upload.contentType || Number(req.headers['content-length']) !== upload.size) {
      return res.status(400).json({ error: 'upload_size_or_type_mismatch' });
    }

    const upstream = https.request({
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      method: 'PUT',
      headers: { 'Content-Type': upload.contentType, 'Content-Length': String(upload.size) },
    }, (storageResponse) => {
      storageResponse.resume();
      storageResponse.on('end', () => {
        if (storageResponse.statusCode < 200 || storageResponse.statusCode >= 300) {
          return res.status(502).json({ error: 'media_storage_upload_failed' });
        }
        redis.del(uploadKey).catch(() => {});
        res.json({ publicUrl: upload.publicUrl });
      });
    });
    upstream.on('error', (error) => {
      if (!res.headersSent) res.status(502).json({ error: 'media_storage_upload_failed' });
    });
    req.on('aborted', () => upstream.destroy());
    req.pipe(upstream);
  } catch (error) {
    if (!res.headersSent) res.status(502).json({ error: 'media_storage_upload_failed' });
  }
});

app.post('/api/tiktok/publish', requireUserToken, async (req, res) => {
  const { accountId, publicUrl, content, privacyLevel, allowComment, allowDuet, allowStitch, madeWithAi, commercialContentType, adsOnly, confirmedPreview, consentGiven } = req.body || {};
  if (typeof content !== 'string' || !content.trim() || content.length > 2200) return res.status(400).json({ error: 'invalid_caption' });
  if (!confirmedPreview || !consentGiven) return res.status(400).json({ error: 'publishing_consent_required' });
  let mediaUrl;
  try {
    mediaUrl = new URL(publicUrl);
    if (mediaUrl.protocol !== 'https:' || mediaUrl.hostname !== 'media.zernio.com') throw new Error('invalid');
  } catch (error) {
    return res.status(400).json({ error: 'invalid_media_url' });
  }

  try {
    const { profileId, account } = await getUserTiktokAccount(req.telegramId);
    if (!profileId || !account || account._id !== accountId) return res.status(403).json({ error: 'tiktok_account_not_connected' });
    const creator = await zernioRequest(`/accounts/${encodeURIComponent(accountId)}/tiktok/creator-info?mediaType=video`);
    const privacyLevels = (creator.privacyLevels || []).map((level) => level.value);
    if (!privacyLevels.includes(privacyLevel)) return res.status(400).json({ error: 'privacy_level_not_available' });
    const commercialTypes = (creator.commercialContentTypes || []).map((item) => item.value);
    if (!['none', 'brand_organic', 'brand_content'].includes(commercialContentType)
      || (commercialTypes.length > 0 && !commercialTypes.includes(commercialContentType))) {
      return res.status(400).json({ error: 'invalid_commercial_content_type' });
    }
    if (commercialContentType !== 'none' && privacyLevel === 'SELF_ONLY') {
      return res.status(400).json({ error: 'branded_content_cannot_be_private' });
    }

    const isDraft = privacyLevel !== 'PUBLIC_TO_EVERYONE';
    const result = await zernioRequest('/posts', {
      method: 'POST',
      headers: { 'x-request-id': crypto.randomUUID() },
      body: {
        content,
        mediaItems: [{ type: 'video', url: mediaUrl.toString() }],
        platforms: [{ platform: 'tiktok', accountId }],
        tiktokSettings: {
          privacy_level: privacyLevel,
          allow_comment: Boolean(allowComment),
          allow_duet: Boolean(allowDuet),
          allow_stitch: Boolean(allowStitch),
          content_preview_confirmed: true,
          express_consent_given: true,
          video_made_with_ai: Boolean(madeWithAi),
          commercialContentType,
          isAdsOnly: Boolean(adsOnly),
          ...(isDraft ? { draft: true } : {}),
        },
        publishNow: true,
      },
    });
    res.status(result.post && result.post.status === 'failed' ? 502 : 200).json({
      post: result.post || null,
      draft: isDraft,
      error: result.post && result.post.platforms && result.post.platforms[0] && result.post.platforms[0].errorMessage,
    });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'tiktok_publish_failed' });
  }
});

app.get('/api/balance/:telegramId', async (req, res) => {
  try {
    const id = req.params.telegramId;
    const [free, purchased] = await Promise.all([getFreeBalance(id), getPurchasedBalance(id)]);
    res.json({ free, purchased, balance: free + purchased });
  } catch (err) {
    console.error('Ошибка получения баланса:', err);
    res.status(500).json({ error: 'balance_fetch_failed' });
  }
});

app.post('/api/consume/:telegramId', async (req, res) => {
  try {
    await consumeOneVideo(req.params.telegramId);
    const [free, purchased, patched] = await Promise.all([
      getFreeBalance(req.params.telegramId),
      getPurchasedBalance(req.params.telegramId),
      getPatchedCount(req.params.telegramId),
    ]);
    res.json({ free, purchased, patched });
  } catch (err) {
    if (err.message === 'no_balance') {
      return res.status(402).json({ error: 'no_balance' });
    }
    console.error('Ошибка consume:', err);
    res.status(500).json({ error: 'consume_failed' });
  }
});

app.post('/api/check-video', async (req, res) => {
  const url = extractTikTokUrl(req.body && req.body.url);
  if (!url) return res.status(400).json({ error: 'invalid_tiktok_url' });

  try {
    const data = await analyzeTikTok(url);
    res.json(data);
  } catch (err) {
    console.error('Ошибка проверки видео через сайт:', err.message);
    res.status(502).json({ error: 'video_check_failed' });
  }
});

app.get('/api/buy-link/:count/:price', (req, res) => {
  const { count, price } = req.params;
  res.json({ url: `https://t.me/${BOT_USERNAME}?start=buy_${count}_${price}` });
});

const WEBHOOK_PATH = `/telegram-webhook/${BOT_TOKEN}`;
app.use(bot.webhookCallback(WEBHOOK_PATH));

app.listen(PORT, async () => {
  console.log(`Сайт запущен: http://localhost:${PORT}`);
  const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_PUBLIC_DOMAIN_URL;
  if (publicUrl) {
    await bot.telegram.setWebhook(`${publicUrl}${WEBHOOK_PATH}`);
    console.log(`Бот слушает через вебхук: ${publicUrl}${WEBHOOK_PATH}`);
  } else {
    await bot.telegram.deleteWebhook();
    bot.launch();
    console.log('Бот слушает команды (локальный polling)...');
  }
  if (!ADMIN_ID) console.log('⚠️  ADMIN_ID не задан — /addvideo работать не будет.');
  ensureYtDlp().catch((e) => console.error('Не удалось установить yt-dlp:', e.message));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
