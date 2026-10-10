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
const NEWS_CHANNEL_ID = process.env.NEWS_CHANNEL_ID || '@ineasynews';
const PORT = process.env.PORT || 3000;
const ADMIN_ID = process.env.ADMIN_ID ? String(process.env.ADMIN_ID).trim() : null;
const ZERNIO_API_BASE = 'https://zernio.com/api/v1';
const TIKTOK_CAPTION_SUFFIX = '@ineasybot или ineasy.site(веб сайт)\n#ineasybot';
const WEEKLY_FREE_BALANCE = 2;
const CARD_INFO = '4400 4300 4955 5771 или 705 542 37 05 (Freedom Bank, Halyk Bank, Kaspi.kz)\nИмя: Айдынбек Н.';
const SITE_URL = process.env.SITE_URL || 'https://ineasy.site/app.html';
const WEBSITE_URL = new URL('/', SITE_URL).toString();

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
  ru: { buy: '🛒 Купить видео', website: '🌐 Зайти на сайт', balance: '💰 Баланс', profile: '👤 Профиль', lang: '🌐 Язык', check: '🔍 Проверка видео', invite: '👥 Пригласить друга' },
  en: { buy: '🛒 Buy videos', website: '🌐 Open website', balance: '💰 Balance', profile: '👤 Profile', lang: '🌐 Language', check: '🔍 Video check', invite: '👥 Invite a friend' },
  kk: { buy: '🛒 Видео сатып алу', website: '🌐 Сайтқа кіру', balance: '💰 Баланс', profile: '👤 Профиль', lang: '🌐 Тіл', check: '🔍 Бейнені тексеру', invite: '👥 Дос шақыру' },
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
      `✨ Добро пожаловать в INEASY PATCHER\n\n` +
      `1️⃣ Заходите на сайт https://ineasy.site. Если ссылка открылась внутри Telegram, удерживайте её и выберите «Открыть в браузере» — Chrome или Safari. Не используйте встроенный браузер Telegram.\n\n` +
      `2️⃣ Войдите через Telegram, выберите видео и нажмите «Обработать видео».\n` +
      `3️⃣ Загрузите файл на tiktok.com/upload или используйте «Пост в сайте (легкий)».\n\n` +
      `🌐 Сайт: ${WEBSITE_URL}. Покупка видео и баланс доступны в меню.`,
    authSuccess: '✅ Успешно авторизовались!\n\nВернитесь на сайт — там уже можно работать.',
    subscribeRequired: '📣 Чтобы продолжить, подпишитесь на канал @ineasynews. После подписки нажмите «Я подписался» — мы проверим доступ.',
    subscribeFailed: 'Вы не подписаны на канал. Чтобы пользоваться патчером, сначала подпишитесь.',
    subscribeCheckError: 'Не удалось проверить подписку. Попробуйте позже или сообщите администратору.',
    subscribeButton: '📢 Подписаться на канал',
    checkSubscribeButton: '✅ Я подписался',
    inviteButton: BTN.ru.invite,
    inviteShareButton: '📨 Поделиться ссылкой',
    inviteMessage: (link) => `👥 Пригласите друга в INEASY Patcher. За каждого нового пользователя начислим вам 1 видео после того, как он впервые запустит бота и подтвердит подписку на @ineasynews.\n\nВаша ссылка:\n${link}`,
    inviteShareText: 'Попробуй INEASY Patcher. Запусти бота по моей ссылке, подпишись на @ineasynews и подтверди подписку.',
    referralJoinPrompt: 'Чтобы получить приглашённое видео, подпишитесь на @ineasynews и нажмите «Проверить подписку».',
    referralVerifyButton: '✅ Проверить подписку',
    referralJoinSuccess: '✅ Подписка подтверждена. Пригласившему начислено 1 видео. Нажмите /start, чтобы открыть меню.',
    referralNotEligible: 'ℹ️ Бонус выдаётся один раз за нового пользователя, который впервые запускает бота по приглашению и подписывается на @ineasynews.',
    referralRewarded: (id) => `🎉 Вашему приглашённому пользователю ${id} начислен 1 бонус за подписку и запуск бота.`,
    websiteButton: '🌐 Открыть ineasy.site',
    websiteGuide: (url) => `📘 Как пользоваться INEASY\n\n1. Откройте ${url} и войдите через Telegram.\n2. Выберите видео и нажмите «Обработать видео».\n3. Опубликуйте файл на tiktok.com/upload или нажмите «Пост в сайте (легкий)». Для публикации на сайте один раз добавьте API-ключ Zernio и используйте аккаунт TikTok, подключённый в Zernio.\n\nКак работает пост: INEASY передаёт обработанное видео в Zernio, а Zernio отправляет его в TikTok.\n\nЕсли ссылка открылась внутри Telegram, удерживайте её и выберите «Открыть в браузере» — Chrome или Safari. Не используйте встроенный браузер Telegram.`,
    packagesTitle: '🛒 Выберите пакет видео:',
    packageButton: (count, perUnit, price) => `${count} видео × ${perUnit} ₸ = ${price.toLocaleString('ru-RU')} ₸`,
    packageDetails: (count, price) =>
      `🎬 <b>Пакет выбран!</b>\n\n` +
      `Вы выбрали: <b>${count} видео</b> 🎥\n\n` +
      `💰 Стоимость: <b>${price.toLocaleString('ru-RU')} ₸</b>\n\n` +
      `💳 Для оплаты используйте реквизиты ниже.\n\n${CARD_INFO}\n\n` +
      `После оплаты отправьте <b>фото или PDF чека</b> 📩\n\n` +
      `🔎 Чек проверит реальный человек. Пожалуйста, ожидайте 1–2 часа. После подтверждения <b>${price.toLocaleString('ru-RU')} ₸ автоматически зачислятся на ваш баланс</b>.\n\n` +
      `⚠️ Отправляйте только настоящий чек.\n\n` +
      `🚫 <b>Фейковые или отредактированные чеки не принимаются.</b>\n\n` +
      `Спасибо за покупку! 💚`,
    purchasePending: '⏳ Чек уже отправлен на проверку реальным человеком. Пожалуйста, ожидайте 1–2 часа.',
    receiptRequired: 'Сначала выберите пакет через кнопку «Купить видео», затем отправьте фото или PDF чека.',
    receiptFormat: 'Отправьте чек изображением или PDF-файлом.',
    receiptReceived: '✅ Чек отправлен на проверку реальным человеком. Пожалуйста, ожидайте 1–2 часа. После подтверждения видео автоматически зачислятся на баланс.',
    purchaseApproved: (count) => `✅ Оплата подтверждена. На купленный баланс зачислено ${count} видео.`,
    purchaseRejected: '❌ Чек отклонён. Если считаете это ошибкой, ответьте сюда или свяжитесь с администратором.',
    accessBlocked: '⛔ Доступ к боту и сайту заблокирован администратором.',
    balance: (free, purchased) =>
      `💰 Ваш баланс:\n\n` +
      `🆓 Бесплатный (на этой неделе): ${free} видео\n` +
      `💎 Купленный: ${purchased} видео\n\n` +
      `📊 Всего доступно: ${free + purchased} видео`,
    profile: (username, id, patched, free, purchased, purchasedTotal) =>
      `👤 Профиль\n\n` +
      `Ник: ${username}\n` +
      `Telegram ID: ${id}\n\n` +
      `🎬 Обработано видео: ${patched}\n` +
      `🛒 Всего куплено: ${purchasedTotal} видео\n` +
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
      `1️⃣ Open ${WEBSITE_URL} in Chrome or Safari. Do not use Telegram's built-in browser.\n\n` +
      `2️⃣ 🔐 Sign in with Telegram on the website.\n\n` +
      `3️⃣ 🎥 Choose a video and tap Prepare video.\n\n` +
      `4️⃣ ✅ Download the finished video and upload it to TikTok.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `🔥 OUT OF LIMITS? 🔥\n\n` +
      `💎 Keep processing!\n` +
      `🛒 BUY MORE LIMITS\n\n` +
      `💰 Great price • Fast activation • More processing\n\n` +
      `👇 Tap «${BTN.en.buy}» below! 👇\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `✨ Thanks for using INEASY PATCHER!`,
    authSuccess: '✅ Successfully logged in!\n\nGo back to the website — you can start working now.',
    subscribeRequired: '📣 Subscribe to @ineasynews to continue. After joining, tap “I subscribed” and we will check your access.',
    subscribeFailed: 'You are not subscribed to the channel. Subscribe first to use the patcher.',
    subscribeCheckError: 'Could not check your subscription. Try again later or contact support.',
    subscribeButton: '📢 Subscribe to the channel',
    checkSubscribeButton: '✅ I subscribed',
    inviteButton: BTN.en.invite,
    inviteShareButton: '📨 Share invite link',
    inviteMessage: (link) => `👥 Invite a friend to INEASY Patcher. Earn 1 video credit for each new user after they start the bot for the first time and confirm their @ineasynews subscription.\n\nYour link:\n${link}`,
    inviteShareText: 'Try INEASY Patcher. Start the bot with my link and subscribe to @ineasynews to activate the invite.',
    referralJoinPrompt: 'To qualify for the invite, subscribe to @ineasynews and tap “Verify subscription”.',
    referralVerifyButton: '✅ Verify subscription',
    referralJoinSuccess: '✅ Subscription verified. Your inviter received 1 video credit. Send /start to open the menu.',
    referralNotEligible: 'ℹ️ The reward is available once per new user who starts the bot from an invite and subscribes to @ineasynews.',
    referralRewarded: (id) => `🎉 Your invited user ${id} started the bot and verified their subscription. You received 1 video credit.`,
    websiteButton: '🌐 Open ineasy.site',
    websiteGuide: (url) => `📘 How to use INEASY\n\n1. Open ${url} and sign in with Telegram.\n2. Choose a video and process it.\n3. Upload it at tiktok.com/upload or use “Post on site (easy)”. For site publishing, add your Zernio API key once and use a TikTok account linked in Zernio.\n\nHow it works: INEASY sends the processed video to Zernio, and Zernio sends it to TikTok.\n\nIf Telegram opens the link internally, press and hold it, choose “Open in Browser”, then select Chrome or Safari. Do not use Telegram's built-in browser.`,
    packagesTitle: '🛒 Choose a video package:',
    packageButton: (count, perUnit, price) => `${count} videos × ${perUnit} ₸ = ${price.toLocaleString('en-US')} ₸`,
    packageDetails: (count, price) =>
      `🎬 <b>Package selected!</b>\n\n` +
      `You selected: <b>${count} videos</b> 🎥\n\n` +
      `💰 Cost: <b>${price.toLocaleString('en-US')} ₸</b>\n\n` +
      `💳 Use the payment details below.\n\n${CARD_INFO}\n\n` +
      `After payment, send a <b>photo or PDF of the receipt</b> 📩\n\n` +
      `🔎 A real person will review the receipt. Please allow 1–2 hours. After approval, <b>${price.toLocaleString('en-US')} ₸ will be added to your balance automatically</b>.\n\n` +
      `⚠️ Send only a genuine receipt.\n\n` +
      `🚫 <b>Fake or edited receipts are not accepted.</b>\n\n` +
      `Thank you for your purchase! 💚`,
    purchasePending: '⏳ Your receipt is being reviewed by a real person. Please allow 1–2 hours.',
    receiptRequired: 'Choose a package with “Buy videos” first, then send a receipt photo or PDF.',
    receiptFormat: 'Send the receipt as an image or PDF file.',
    receiptReceived: '✅ Your receipt is being reviewed by a real person. Please allow 1–2 hours. Your videos will be added to your balance after approval.',
    purchaseApproved: (count) => `✅ Payment confirmed. ${count} videos were added to your purchased balance.`,
    purchaseRejected: '❌ The receipt was declined. If you think this is an error, reply here or contact the administrator.',
    accessBlocked: '⛔ Access to the bot and website has been blocked by an administrator.',
    balance: (free, purchased) =>
      `💰 Your balance:\n\n` +
      `🆓 Free (this week): ${free} videos\n` +
      `💎 Purchased: ${purchased} videos\n\n` +
      `📊 Total available: ${free + purchased} videos`,
    profile: (username, id, patched, free, purchased, purchasedTotal) =>
      `👤 Profile\n\n` +
      `Username: ${username}\n` +
      `Telegram ID: ${id}\n\n` +
      `🎬 Videos processed so far: ${patched}\n` +
      `🛒 Videos purchased: ${purchasedTotal}\n` +
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
      `🎬 Бейнені өңдеу жолы:\n\n` +
      `1️⃣ ${WEBSITE_URL} сайтын Chrome немесе Safari браузерінде ашыңыз. Telegram-ның ішкі браузерін пайдаланбаңыз.\n\n` +
      `2️⃣ 🔐 Сайтқа Telegram арқылы кіріңіз.\n\n` +
      `3️⃣ 🎥 Бейнені таңдап, «Бейнені дайындау» түймесін басыңыз.\n\n` +
      `4️⃣ ✅ Дайын файлды жүктеп алып, TikTok-қа салыңыз.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `🔥 ЛИМИТ БІТТІ МЕ? 🔥\n\n` +
      `💎 Өңдеуді жалғастырыңыз!\n` +
      `🛒 ҚОСЫМША ЛИМИТ САТЫП АЛУ\n\n` +
      `💰 Тиімді баға • Жылдам іске қосу • Көбірек өңдеу\n\n` +
      `👇 Төмендегі «${BTN.kk.buy}» түймесін басыңыз! 👇\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `✨ INEASY PATCHER-ді қолданғаныңыз үшін рақмет!`,
    authSuccess: '✅ Сәтті авторизациядан өттіңіз!\n\nСайтқа қайта оралыңыз — енді жұмыс істей аласыз.',
    subscribeRequired: '📣 Жалғастыру үшін @ineasynews арнасына жазылыңыз. Жазылған соң «Жазылдым» түймесін басыңыз — біз тексереміз.',
    subscribeFailed: 'Сіз арнаға жазылмағансыз. Патчерді пайдалану үшін алдымен арнаға жазылыңыз.',
    subscribeCheckError: 'Жазылымды тексеру мүмкін болмады. Кейінірек қайталап көріңіз немесе қолдау қызметіне хабарласыңыз.',
    subscribeButton: '📢 Арнаға жазылу',
    checkSubscribeButton: '✅ Жазылдым',
    inviteButton: BTN.kk.invite,
    inviteShareButton: '📨 Шақыру сілтемесін бөлісу',
    inviteMessage: (link) => `👥 Досыңызды INEASY Patcher-ге шақырыңыз. Әр жаңа пайдаланушы ботты алғаш рет іске қосып, @ineasynews арнасына жазылғанын растағаннан кейін сізге 1 видео беріледі.\n\nСілтемеңіз:\n${link}`,
    inviteShareText: 'INEASY Patcher қолданып көріңіз. Менің сілтемем арқылы ботты іске қосып, @ineasynews арнасына жазылыңыз.',
    referralJoinPrompt: 'Шақыру бонусы үшін @ineasynews арнасына жазылып, «Жазылымды тексеру» түймесін басыңыз.',
    referralVerifyButton: '✅ Жазылымды тексеру',
    referralJoinSuccess: '✅ Жазылым расталды. Сізді шақырған адамға 1 видео берілді. Мәзірді ашу үшін /start жіберіңіз.',
    referralNotEligible: 'ℹ️ Бонус ботты шақыру сілтемесімен алғаш рет іске қосып, @ineasynews арнасына жазылған жаңа пайдаланушы үшін бір рет беріледі.',
    referralRewarded: (id) => `🎉 Сіз шақырған ${id} пайдаланушы ботты іске қосып, жазылымын растады. Сізге 1 видео берілді.`,
    websiteButton: '🌐 ineasy.site ашу',
    websiteGuide: (url) => `📘 INEASY пайдалану\n\n1. ${url} сайтына кіріп, Telegram арқылы авторизациядан өтіңіз.\n2. Бейнені таңдап, өңдеңіз.\n3. Файлды tiktok.com/upload сайтына жүктеңіз немесе «Сайтқа жариялау (жеңіл)» түймесін пайдаланыңыз. Ол үшін Zernio API кілтін бір рет енгізіп, TikTok аккаунтын Zernio-ға байланыстырыңыз.\n\nЖариялау жолы: INEASY өңделген бейнені Zernio-ға жібереді, ал Zernio оны TikTok-қа жүктейді.\n\nСілтеме Telegram ішінде ашылса, оны басып тұрып, «Браузерде ашу» тармағын таңдаңыз. Chrome немесе Safari қолданыңыз.`,
    packagesTitle: '🛒 Видео пакетін таңдаңыз:',
    packageButton: (count, perUnit, price) => `${count} видео × ${perUnit} ₸ = ${price.toLocaleString('ru-RU')} ₸`,
    packageDetails: (count, price) =>
      `🎬 <b>Пакет таңдалды!</b>\n\n` +
      `Таңдағаныңыз: <b>${count} видео</b> 🎥\n\n` +
      `💰 Бағасы: <b>${price.toLocaleString('ru-RU')} ₸</b>\n\n` +
      `💳 Төлем үшін төмендегі деректемелерді пайдаланыңыз.\n\n${CARD_INFO}\n\n` +
      `Төлемнен кейін чектің <b>фотосын немесе PDF нұсқасын</b> жіберіңіз 📩\n\n` +
      `🔎 Чекті нақты адам тексереді. 1–2 сағат күте тұрыңыз. Расталғаннан кейін <b>${price.toLocaleString('ru-RU')} ₸ балансыңызға автоматты түрде қосылады</b>.\n\n` +
      `⚠️ Тек шынайы чекті жіберіңіз.\n\n` +
      `🚫 <b>Жалған немесе өңделген чектер қабылданбайды.</b>\n\n` +
      `Сатып алғаныңызға рақмет! 💚`,
    purchasePending: '⏳ Чекті нақты адам тексеріп жатыр. 1–2 сағат күте тұрыңыз.',
    receiptRequired: 'Алдымен «Видео сатып алу» түймесімен пакет таңдап, содан кейін чек фотосын немесе PDF жіберіңіз.',
    receiptFormat: 'Чекті сурет немесе PDF файл түрінде жіберіңіз.',
    receiptReceived: '✅ Чекті нақты адам тексеріп жатыр. 1–2 сағат күте тұрыңыз. Расталғаннан кейін видео балансыңызға қосылады.',
    purchaseApproved: (count) => `✅ Төлем расталды. Сатып алынған балансыңызға ${count} видео қосылды.`,
    purchaseRejected: '❌ Чек қабылданбады. Қате бар деп ойласаңыз, осы жерге жазыңыз немесе әкімшіге хабарласыңыз.',
    accessBlocked: '⛔ Әкімші бот пен сайтқа кіруді бұғаттады.',
    balance: (free, purchased) =>
      `💰 Сіздің балансыңыз:\n\n` +
      `🆓 Тегін (осы аптада): ${free} видео\n` +
      `💎 Сатып алынған: ${purchased} видео\n\n` +
      `📊 Барлығы қолжетімді: ${free + purchased} видео`,
    profile: (username, id, patched, free, purchased, purchasedTotal) =>
      `👤 Профиль\n\n` +
      `Ник: ${username}\n` +
      `Telegram ID: ${id}\n\n` +
      `🎬 Өңделген видео саны: ${patched}\n` +
      `🛒 Сатып алынған видео саны: ${purchasedTotal}\n` +
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

function describeBotActivity(ctx) {
  const callbackData = ctx.callbackQuery && ctx.callbackQuery.data;
  if (callbackData) {
    const packageMatch = callbackData.match(/^pkg_(\d+)_(\d+)$/);
    if (packageMatch) return `Выбрал пакет: ${packageMatch[1]} видео за ${packageMatch[2]} ₸`;
    if (/^lang_/.test(callbackData)) return `Выбрал язык: ${callbackData.slice(5)}`;
    if (/^verify_news_/.test(callbackData)) return 'Нажал проверку подписки';
    return 'Нажал кнопку в боте';
  }

  const message = ctx.message;
  if (!message) return 'Действие в боте';
  if (message.photo) return 'Отправил фото';
  if (message.document) return `Отправил документ (${message.document.mime_type || 'тип не указан'})`;
  if (message.text) {
    const command = message.text.match(/^\/([\w]+)(?:@\w+)?/);
    if (command) return `Команда /${command[1]}`;
    if (extractTikTokUrl(message.text)) return 'Запустил проверку ссылки TikTok';
    return `Отправил текстовое сообщение (${message.text.length} символов)`;
  }
  return 'Отправил сообщение';
}

async function logUserActivity(telegramId, action, details = {}) {
  const key = `activity:${telegramId}`;
  const entry = JSON.stringify({ at: new Date().toISOString(), action, ...details });
  await redis.lpush(key, entry);
  await redis.ltrim(key, 0, 49);
  await redis.expire(key, 90 * 24 * 60 * 60);
}

async function recordUserActivity(telegramId, action, details = {}) {
  try {
    await logUserActivity(telegramId, action, details);
  } catch (error) {
    console.error('Не удалось записать действие пользователя:', error.message);
  }
}

async function getUserActivity(telegramId, count = 20) {
  const entries = await redis.lrange(`activity:${telegramId}`, 0, count - 1);
  return entries.map((entry) => {
    if (typeof entry !== 'string') return entry;
    try { return JSON.parse(entry); } catch (error) { return null; }
  }).filter(Boolean);
}

async function getBlockedUser(telegramId) {
  const value = await redis.get(`blocked:${telegramId}`);
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (error) { return { reason: value }; }
  }
  return value;
}

async function isUserBlocked(telegramId) {
  return Boolean(await getBlockedUser(telegramId));
}

async function blockUser(telegramId, reason, adminId) {
  await redis.set(`blocked:${telegramId}`, {
    reason: String(reason || '').trim().slice(0, 300),
    blockedAt: new Date().toISOString(),
    blockedBy: String(adminId),
  });
  await recordUserActivity(telegramId, 'Аккаунт заблокирован', { details: String(reason || 'Причина не указана').slice(0, 200) });
}

async function unblockUser(telegramId) {
  await redis.del(`blocked:${telegramId}`);
  await recordUserActivity(telegramId, 'Блокировка снята');
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
  const balance = await redis.eval(
    "local week = redis.call('GET', KEYS[1]); if week ~= ARGV[1] then redis.call('SET', KEYS[1], ARGV[1]); redis.call('SET', KEYS[2], ARGV[2]); return ARGV[2]; end; local balance = redis.call('GET', KEYS[2]); if not balance then redis.call('SET', KEYS[2], ARGV[2]); return ARGV[2]; end; return balance",
    [`freeWeek:${telegramId}`, `freeBalance:${telegramId}`],
    [weekKey, String(WEEKLY_FREE_BALANCE)]
  );
  return Number(balance);
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

async function getPurchasedTotal(telegramId) {
  const val = await redis.get(`purchasedTotal:${telegramId}`);
  return val === null || val === undefined ? 0 : Number(val);
}

async function addPurchasedBalance(telegramId, amount) {
  await getPurchasedBalance(telegramId);
  return redis.incrby(`purchased:${telegramId}`, amount);
}

async function removePurchasedBalance(telegramId, amount) {
  await getPurchasedBalance(telegramId);
  const [removed, remaining] = await redis.eval(
    "local balance = tonumber(redis.call('GET', KEYS[1]) or '0'); local amount = tonumber(ARGV[1]); local removed = math.min(balance, amount); local remaining = balance - removed; if removed > 0 then redis.call('SET', KEYS[1], remaining); end; return {removed, remaining}",
    [`purchased:${telegramId}`],
    [String(amount)]
  );
  return { removed: Number(removed), remaining: Number(remaining) };
}

async function getPatchedCount(telegramId) {
  const val = await redis.get(`patched:${telegramId}`);
  return val === null || val === undefined ? 0 : Number(val);
}

async function consumeOneVideo(telegramId) {
  await Promise.all([getFreeBalance(telegramId), getPurchasedBalance(telegramId)]);
  const consumed = await redis.eval(
    "local free = tonumber(redis.call('GET', KEYS[1]) or '0'); local purchased = tonumber(redis.call('GET', KEYS[2]) or '0'); if free > 0 then free = redis.call('DECR', KEYS[1]); elseif purchased > 0 then purchased = redis.call('DECR', KEYS[2]); else return 0; end; redis.call('INCR', KEYS[3]); return 1",
    [`freeBalance:${telegramId}`, `purchased:${telegramId}`, `patched:${telegramId}`],
    []
  );
  if (Number(consumed) !== 1) throw new Error('no_balance');
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
  const uploadRegion = info.region || info.country || info.uploader_location || info.location;
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
    region: typeof uploadRegion === 'string' ? uploadRegion : null,
  };
}

const LOGIN_SESSION_TTL_SECONDS = 30 * 60;

async function getLoginSession(sessionId) {
  const key = `loginSession:${sessionId}`;
  const value = await redis.get(key);
  if (!value) return null;
  let session = value;
  if (typeof value === 'string') {
    try { session = JSON.parse(value); } catch (error) { return null; }
  }
  if (!session.createdAt || Date.now() - session.createdAt > LOGIN_SESSION_TTL_SECONDS * 1000) {
    await redis.del(key);
    return null;
  }
  return session;
}

async function setLoginSession(sessionId, session) {
  const remainingSeconds = Math.ceil((session.createdAt + LOGIN_SESSION_TTL_SECONDS * 1000 - Date.now()) / 1000);
  if (remainingSeconds <= 0) {
    await redis.del(`loginSession:${sessionId}`);
    return false;
  }
  await redis.set(`loginSession:${sessionId}`, session, { ex: remainingSeconds });
  return true;
}

const bot = new Telegraf(BOT_TOKEN);

bot.use(async (ctx, next) => {
  const telegramId = ctx.from && String(ctx.from.id);
  if (!telegramId) return next();

  if (ADMIN_ID && telegramId === ADMIN_ID) return next();

  await recordUserActivity(telegramId, describeBotActivity(ctx));

  const blocked = await getBlockedUser(telegramId);
  if (blocked) {
    const lang = await getLang(telegramId);
    const message = TEXTS[lang].accessBlocked;
    if (ctx.callbackQuery) await ctx.answerCbQuery(message, { show_alert: true });
    else if (ctx.message) await ctx.reply(message);
    return;
  }

  return next();
});

function mainKeyboard(lang) {
  const b = BTN[lang];
  return Markup.keyboard([
    [b.website],
    [b.buy],
    [b.check],
    [b.balance, b.profile],
    [b.lang],
    [b.invite],
  ]).resize();
}

function packagesKeyboard(lang) {
  const t = TEXTS[lang];
  const rows = PACKAGES.map(([count, price]) => {
    const perUnit = Math.round(price / count);
    return [Markup.button.callback(t.packageButton(count, perUnit, price), `pkg_${count}_${price}`)];
  });
  return Markup.inlineKeyboard(rows);
}

async function readPurchaseOrder(orderId) {
  const order = await redis.get(`purchase:${orderId}`);
  if (!order) return null;
  if (typeof order === 'string') {
    try { return JSON.parse(order); } catch (error) { return null; }
  }
  return order;
}

async function createPurchaseOrder(ctx, count, price, lang) {
  const selectedPackage = PACKAGES.find(([packageCount, packagePrice]) =>
    packageCount === count && packagePrice === price);
  if (!selectedPackage) {
    await ctx.reply('❌ Неизвестный пакет. Откройте меню покупки и выберите пакет из списка.');
    return;
  }

  const telegramId = String(ctx.from.id);
  const pendingKey = `pendingPurchase:${telegramId}`;
  const existingId = await redis.get(pendingKey);
  if (existingId) {
    const existing = await readPurchaseOrder(existingId);
    if (existing && existing.status === 'awaiting_review') {
      await ctx.reply(TEXTS[lang].purchasePending, mainKeyboard(lang));
      return;
    }
    if (existing && existing.status === 'awaiting_receipt') {
      existing.status = 'cancelled';
      await redis.set(`purchase:${existing.id}`, existing);
    }
  }

  const order = {
    id: uuidv4(),
    telegramId,
    username: ctx.from.username || null,
    firstName: ctx.from.first_name || '',
    count,
    price,
    status: 'awaiting_receipt',
    createdAt: new Date().toISOString(),
  };
  await redis.set(`purchase:${order.id}`, order);
  await redis.set(pendingKey, order.id, { ex: 30 * 60 });
  await recordUserActivity(telegramId, 'Создан заказ на покупку', { details: `${count} видео, ${price} ₸` });
  const keyboard = mainKeyboard(lang);
  await ctx.reply(TEXTS[lang].packageDetails(count, price), {
    parse_mode: 'HTML',
    reply_markup: keyboard.reply_markup,
  });
}

async function sendWelcome(ctx, lang) {
  const name = ctx.from.first_name || ctx.from.username || 'friend';
  await ctx.reply(TEXTS[lang].welcome(name), mainKeyboard(lang));
}

function newsSubscriptionKeyboard(lang, sessionId) {
  const text = TEXTS[lang];
  return Markup.inlineKeyboard([
    [Markup.button.url(text.subscribeButton, 'https://t.me/ineasynews')],
    [Markup.button.callback(text.checkSubscribeButton, `verify_news_${sessionId}`)],
  ]);
}

async function confirmSiteLogin(ctx, sessionId) {
  const session = await getLoginSession(sessionId);
  const lang = await getLang(ctx.from.id);
  const isSubscriptionCheck = Boolean(ctx.callbackQuery);
  if (!session) {
    const message = 'Ссылка для входа устарела. Вернитесь на сайт и начните вход заново.';
    if (isSubscriptionCheck) await ctx.answerCbQuery(message, { show_alert: true });
    else await ctx.reply(message);
    return;
  }
  if (session.telegramId && String(session.telegramId) !== String(ctx.from.id)) {
    const message = 'Эта ссылка для входа уже привязана к другому Telegram-аккаунту.';
    if (isSubscriptionCheck) await ctx.answerCbQuery(message, { show_alert: true });
    else await ctx.reply(message);
    return;
  }

  session.telegramId = ctx.from.id;
  session.username = ctx.from.username || null;
  session.firstName = ctx.from.first_name || '';
  session.subscriptionRequired = true;
  if (!await setLoginSession(sessionId, session)) {
    const message = 'Ссылка для входа устарела. Вернитесь на сайт и начните вход заново.';
    if (isSubscriptionCheck) await ctx.answerCbQuery(message, { show_alert: true });
    else await ctx.reply(message);
    return;
  }

  try {
    const member = await bot.telegram.getChatMember(NEWS_CHANNEL_ID, ctx.from.id);
    const subscribed = ['creator', 'administrator', 'member'].includes(member.status) ||
      (member.status === 'restricted' && member.is_member);
    if (!subscribed) {
      if (isSubscriptionCheck) {
        await ctx.answerCbQuery(TEXTS[lang].subscribeFailed, { show_alert: true });
      } else {
        await ctx.reply(TEXTS[lang].subscribeRequired, newsSubscriptionKeyboard(lang, sessionId));
      }
      return;
    }

    session.authorized = true;
    session.subscriptionRequired = false;
    await setLoginSession(sessionId, session);
    if (isSubscriptionCheck) {
      await ctx.answerCbQuery();
      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.error('Не удалось удалить сообщение о подписке:', error.message);
      }
    }
    await ctx.reply(TEXTS[lang].authSuccess, mainKeyboard(lang));
  } catch (error) {
    console.error('Не удалось проверить подписку на канал:', error.message);
    if (isSubscriptionCheck) {
      await ctx.answerCbQuery(TEXTS[lang].subscribeCheckError, { show_alert: true });
    } else {
      await ctx.reply(TEXTS[lang].subscribeCheckError, newsSubscriptionKeyboard(lang, sessionId));
    }
  }
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
  const [free, purchased, patched, purchasedTotal] = await Promise.all([
    getFreeBalance(id), getPurchasedBalance(id), getPatchedCount(id), getPurchasedTotal(id),
  ]);
  await ctx.reply(TEXTS[lang].profile(username, id, patched, free, purchased, purchasedTotal), mainKeyboard(lang));
}

async function sendInvite(ctx, lang) {
  const link = `https://t.me/${BOT_USERNAME}?start=ref_${ctx.from.id}`;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(TEXTS[lang].inviteShareText)}`;
  await ctx.reply(TEXTS[lang].inviteMessage(link), Markup.inlineKeyboard([
    [Markup.button.url(TEXTS[lang].inviteShareButton, shareUrl)],
  ]));
}

function referralSubscriptionKeyboard(lang, referrerId) {
  return Markup.inlineKeyboard([
    [Markup.button.url(TEXTS[lang].subscribeButton, 'https://t.me/ineasynews')],
    [Markup.button.callback(TEXTS[lang].referralVerifyButton, `verify_ref_${referrerId}`)],
  ]);
}

async function awardReferral(inviteeId, referrerId) {
  if (!/^\d+$/.test(referrerId) || referrerId === inviteeId || await isUserBlocked(referrerId)) return false;
  await getPurchasedBalance(referrerId);
  const awarded = await redis.eval(
    "if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end; redis.call('SET', KEYS[1], ARGV[1]); redis.call('INCRBY', KEYS[2], 1); return 1",
    [`referralInviter:${inviteeId}`, `purchased:${referrerId}`],
    [referrerId]
  );
  if (Number(awarded) !== 1) return false;

  await redis.del(`pendingReferral:${inviteeId}`);
  await recordUserActivity(referrerId, 'Получен бонус за приглашение', { details: `Новый пользователь ${inviteeId}` });
  await recordUserActivity(inviteeId, 'Выполнил условия приглашения', { details: `Пригласивший ${referrerId}` });
  try {
    await bot.telegram.sendMessage(referrerId, TEXTS[await getLang(referrerId)].referralRewarded(inviteeId), mainKeyboard(await getLang(referrerId)));
  } catch (error) {
    console.error('Не удалось уведомить пригласившего о бонусе:', error.message);
  }
  return true;
}

async function handleReferralStart(ctx, referrerId, isFirstStart) {
  const inviteeId = String(ctx.from.id);
  const lang = await getLang(inviteeId);
  if (!/^\d+$/.test(referrerId) || referrerId === inviteeId || await redis.get(`referralInviter:${inviteeId}`) || await isUserBlocked(referrerId)) {
    await ctx.reply(TEXTS[lang].referralNotEligible, mainKeyboard(lang));
    return;
  }
  if (!isFirstStart) {
    const pendingReferrer = await redis.get(`pendingReferral:${inviteeId}`);
    if (String(pendingReferrer) === referrerId) {
      await ctx.reply(TEXTS[lang].referralJoinPrompt, referralSubscriptionKeyboard(lang, referrerId));
      return;
    }
    await ctx.reply(TEXTS[lang].referralNotEligible, mainKeyboard(lang));
    return;
  }

  try {
    const member = await bot.telegram.getChatMember(NEWS_CHANNEL_ID, inviteeId);
    const subscribed = ['creator', 'administrator', 'member'].includes(member.status) ||
      (member.status === 'restricted' && member.is_member);
    if (!subscribed) {
      await redis.set(`pendingReferral:${inviteeId}`, referrerId, { ex: 7 * 24 * 60 * 60 });
      await ctx.reply(TEXTS[lang].referralJoinPrompt, referralSubscriptionKeyboard(lang, referrerId));
      return;
    }

    const awarded = await awardReferral(inviteeId, referrerId);
    await ctx.reply(awarded ? TEXTS[lang].referralJoinSuccess : TEXTS[lang].referralNotEligible, mainKeyboard(lang));
  } catch (error) {
    console.error('Не удалось проверить приглашение:', error.message);
    await ctx.reply(TEXTS[lang].subscribeCheckError, mainKeyboard(lang));
  }
}

bot.start(async (ctx) => {
  const firstStart = await redis.set(`botStarted:${ctx.from.id}`, '1', { nx: true });
  const lang = await getLang(ctx.from.id);
  const payload = ctx.startPayload ? ctx.startPayload.trim() : null;

  if (payload && payload.startsWith('ref_')) {
    await handleReferralStart(ctx, payload.slice(4), firstStart === 'OK');
    return;
  }

  if (payload && payload !== 'buyvideo' && !payload.startsWith('buy_') && await getLoginSession(payload)) {
    await confirmSiteLogin(ctx, payload);
    return;
  }

  if (payload && payload.startsWith('buy_')) {
    const [, count, price] = payload.split('_');
    if (count && price) {
      await createPurchaseOrder(ctx, Number(count), Number(price), lang);
      return;
    }
  }

  await sendWelcome(ctx, lang);
});

bot.command('buyvideo', async (ctx) => sendPackagesMenu(ctx, await getLang(ctx.from.id)));
bot.command('autorization', async (ctx) => sendWelcome(ctx, await getLang(ctx.from.id)));
bot.command('invite', async (ctx) => sendInvite(ctx, await getLang(ctx.from.id)));
bot.command('balance', async (ctx) => sendBalance(ctx, await getLang(ctx.from.id)));
bot.command('profile', async (ctx) => sendProfile(ctx, await getLang(ctx.from.id)));

bot.command('language', async (ctx) => {
  await ctx.reply('Choose language / Выберите язык / Тілді таңдаңыз:', langChoiceKeyboard());
});

bot.hears([BTN.ru.lang, BTN.en.lang, BTN.kk.lang], async (ctx) => {
  await ctx.reply('Choose language / Выберите язык / Тілді таңдаңыз:', langChoiceKeyboard());
});

bot.command('website', async (ctx) => {
  const lang = await getLang(ctx.from.id);
  await ctx.reply(TEXTS[lang].websiteGuide(WEBSITE_URL), Markup.inlineKeyboard([
    [Markup.button.url(TEXTS[lang].websiteButton, WEBSITE_URL)],
  ]));
});

bot.hears([BTN.ru.website, BTN.en.website, BTN.kk.website], async (ctx) => {
  const lang = await getLang(ctx.from.id);
  await ctx.reply(TEXTS[lang].websiteGuide(WEBSITE_URL), Markup.inlineKeyboard([
    [Markup.button.url(TEXTS[lang].websiteButton, WEBSITE_URL)],
  ]));
});

bot.action(/^lang_(ru|en|kk)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.match[1];
  await setLang(ctx.from.id, lang);
  await ctx.reply(TEXTS[lang].langSet, mainKeyboard(lang));
});

bot.hears([BTN.ru.buy, BTN.en.buy, BTN.kk.buy], async (ctx) => sendPackagesMenu(ctx, await getLang(ctx.from.id)));
bot.hears([BTN.ru.invite, BTN.en.invite, BTN.kk.invite], async (ctx) => sendInvite(ctx, await getLang(ctx.from.id)));
bot.hears([BTN.ru.balance, BTN.en.balance, BTN.kk.balance], async (ctx) => sendBalance(ctx, await getLang(ctx.from.id)));
bot.hears([BTN.ru.profile, BTN.en.profile, BTN.kk.profile], async (ctx) => sendProfile(ctx, await getLang(ctx.from.id)));

bot.action(/^pkg_(\d+)_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const lang = await getLang(ctx.from.id);
  await createPurchaseOrder(ctx, Number(ctx.match[1]), Number(ctx.match[2]), lang);
});

bot.action(/^verify_ref_(\d+)$/, async (ctx) => {
  const inviteeId = String(ctx.from.id);
  const referrerId = ctx.match[1];
  const lang = await getLang(inviteeId);
  const pendingReferrer = await redis.get(`pendingReferral:${inviteeId}`);
  if (String(pendingReferrer) !== referrerId) {
    await ctx.answerCbQuery(TEXTS[lang].referralNotEligible, { show_alert: true });
    return;
  }

  try {
    const member = await bot.telegram.getChatMember(NEWS_CHANNEL_ID, inviteeId);
    const subscribed = ['creator', 'administrator', 'member'].includes(member.status) ||
      (member.status === 'restricted' && member.is_member);
    if (!subscribed) {
      await ctx.answerCbQuery(TEXTS[lang].subscribeFailed, { show_alert: true });
      return;
    }

    const awarded = await awardReferral(inviteeId, referrerId);
    await ctx.answerCbQuery();
    await ctx.reply(awarded ? TEXTS[lang].referralJoinSuccess : TEXTS[lang].referralNotEligible, mainKeyboard(lang));
  } catch (error) {
    console.error('Не удалось подтвердить подписку для приглашения:', error.message);
    await ctx.answerCbQuery(TEXTS[lang].subscribeCheckError, { show_alert: true });
  }
});

bot.on(['photo', 'document'], async (ctx) => {
  const telegramId = String(ctx.from.id);
  const lang = await getLang(telegramId);
  if (!ADMIN_ID) {
    await ctx.reply('❌ Проверка оплаты временно недоступна. Сообщите администратору.');
    return;
  }

  const pendingId = await redis.get(`pendingPurchase:${telegramId}`);
  const order = pendingId ? await readPurchaseOrder(pendingId) : null;
  if (!order || order.status === 'cancelled') {
    if (pendingId) await redis.del(`pendingPurchase:${telegramId}`);
    await ctx.reply(TEXTS[lang].receiptRequired, mainKeyboard(lang));
    return;
  }
  const orderCreatedAt = Date.parse(order.createdAt);
  if (order.status === 'awaiting_receipt' && (!Number.isFinite(orderCreatedAt) || Date.now() - orderCreatedAt > 30 * 60 * 1000)) {
    order.status = 'cancelled';
    await redis.set(`purchase:${order.id}`, order);
    await redis.del(`pendingPurchase:${telegramId}`);
    await ctx.reply(TEXTS[lang].receiptRequired, mainKeyboard(lang));
    return;
  }
  if (order.status === 'awaiting_review') {
    await ctx.reply(TEXTS[lang].purchasePending, mainKeyboard(lang));
    return;
  }
  if (order.status !== 'awaiting_receipt') {
    await ctx.reply(TEXTS[lang].receiptRequired, mainKeyboard(lang));
    return;
  }

  const document = ctx.message.document;
  if (document && !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(document.mime_type)) {
    await ctx.reply(TEXTS[lang].receiptFormat, mainKeyboard(lang));
    return;
  }

  const receiptType = ctx.message.photo ? 'photo' : 'document';
  const fileId = ctx.message.photo
    ? ctx.message.photo[ctx.message.photo.length - 1].file_id
    : document.file_id;
  order.status = 'awaiting_review';
  order.receiptType = receiptType;
  order.receiptReceivedAt = new Date().toISOString();
  await redis.set(`purchase:${order.id}`, order);
  await recordUserActivity(telegramId, 'Отправлен чек', { details: `Заказ ${order.id}, ${order.count} видео` });

  const displayName = String(order.username ? `@${order.username}` : order.firstName || 'Без имени')
    .replace(/[\r\n]/g, ' ')
    .slice(0, 80);
  const caption = [
    '🧾 Новый чек на проверку',
    `Заявка: ${order.id}`,
    `Пользователь: ${displayName}`,
    `Telegram ID: ${telegramId}`,
    `Пакет: ${order.count} видео за ${order.price} ₸`,
  ].join('\n');
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Подтвердить и зачислить', `purchase_approve_${order.id}`)],
    [Markup.button.callback('❌ Отклонить', `purchase_reject_${order.id}`), Markup.button.callback('🚫 Заблокировать', `block_user_${telegramId}`)],
  ]);

  try {
    if (receiptType === 'photo') {
      await bot.telegram.sendPhoto(ADMIN_ID, fileId, { caption, reply_markup: keyboard.reply_markup });
    } else {
      await bot.telegram.sendDocument(ADMIN_ID, fileId, { caption, reply_markup: keyboard.reply_markup });
    }
    await ctx.reply(TEXTS[lang].receiptReceived, mainKeyboard(lang));
  } catch (error) {
    order.status = 'awaiting_receipt';
    delete order.receiptType;
    delete order.receiptReceivedAt;
    await redis.set(`purchase:${order.id}`, order);
    console.error('Не удалось передать чек администратору:', error.message);
    await ctx.reply('❌ Не удалось передать чек администратору. Попробуйте отправить его ещё раз.');
  }
});

bot.action(/^purchase_(approve|reject)_([\w-]+)$/, async (ctx) => {
  if (!ADMIN_ID || String(ctx.from.id) !== ADMIN_ID) {
    await ctx.answerCbQuery('Только администратор может проверять оплату.', { show_alert: true });
    return;
  }

  const [, action, orderId] = ctx.match;
  const lockKey = `purchaseLock:${orderId}`;
  const lock = await redis.set(lockKey, String(ctx.from.id), { nx: true, ex: 60 });
  if (!lock) {
    await ctx.answerCbQuery('Заявка уже обрабатывается.');
    return;
  }

  try {
    const order = await readPurchaseOrder(orderId);
    if (!order || order.status !== 'awaiting_review') {
      await ctx.answerCbQuery('Заявка уже обработана или не найдена.', { show_alert: true });
      return;
    }

    const updatedOrder = {
      ...order,
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: String(ctx.from.id),
    };
    const transaction = redis.multi();
    if (action === 'approve') {
      await getPurchasedBalance(order.telegramId);
      transaction.incrby(`purchased:${order.telegramId}`, order.count);
      transaction.incrby(`purchasedTotal:${order.telegramId}`, order.count);
    }
    transaction.set(`purchase:${orderId}`, updatedOrder);
    transaction.del(`pendingPurchase:${order.telegramId}`);
    await transaction.exec();
    await recordUserActivity(order.telegramId, action === 'approve' ? 'Оплата подтверждена' : 'Чек отклонён', {
      details: `Заказ ${order.id}, ${order.count} видео, ${order.price} ₸`,
    });

    const lang = await getLang(order.telegramId);
    const customerMessage = action === 'approve'
      ? TEXTS[lang].purchaseApproved(order.count)
      : TEXTS[lang].purchaseRejected;
    try {
      await bot.telegram.sendMessage(order.telegramId, customerMessage, mainKeyboard(lang));
    } catch (error) {
      console.error('Не удалось уведомить пользователя об оплате:', error.message);
    }

    await ctx.answerCbQuery(action === 'approve' ? 'Пакет зачислен.' : 'Заявка отклонена.');
    const previousCaption = ctx.callbackQuery.message.caption || `Заявка: ${orderId}`;
    const resultLabel = action === 'approve' ? '✅ Оплата подтверждена, видео зачислены.' : '❌ Чек отклонён.';
    try {
      await ctx.editMessageCaption(`${previousCaption}\n\n${resultLabel}`, { reply_markup: { inline_keyboard: [] } });
    } catch (error) {
      console.error('Не удалось обновить сообщение с чеком:', error.message);
    }
  } catch (error) {
    console.error('Ошибка обработки оплаты:', error);
    await ctx.answerCbQuery('Не удалось обработать заявку. Проверьте логи сервера.', { show_alert: true });
  } finally {
    await redis.del(lockKey);
  }
});

bot.action(/^block_user_(\d+)$/, async (ctx) => {
  if (!ADMIN_ID || String(ctx.from.id) !== ADMIN_ID) {
    await ctx.answerCbQuery('Только администратор может блокировать пользователей.', { show_alert: true });
    return;
  }
  const targetId = ctx.match[1];
  if (targetId === ADMIN_ID) {
    await ctx.answerCbQuery('Нельзя заблокировать администратора.', { show_alert: true });
    return;
  }
  try {
    await blockUser(targetId, 'Заблокирован из заявки на оплату', ctx.from.id);
    await ctx.answerCbQuery(`Пользователь ${targetId} заблокирован.`);
    try { await bot.telegram.sendMessage(targetId, TEXTS[await getLang(targetId)].accessBlocked); } catch (error) {}
    const previousCaption = ctx.callbackQuery.message.caption || `Telegram ID: ${targetId}`;
    try {
      await ctx.editMessageCaption(`${previousCaption}\n\n🚫 Пользователь заблокирован.`, { reply_markup: { inline_keyboard: [] } });
    } catch (error) {
      console.error('Не удалось обновить сообщение с чеком:', error.message);
    }
  } catch (error) {
    console.error('Ошибка блокировки пользователя:', error);
    await ctx.answerCbQuery('Не удалось заблокировать пользователя.', { show_alert: true });
  }
});

bot.action(/^verify_news_([\w-]+)$/, async (ctx) => {
  await confirmSiteLogin(ctx, ctx.match[1]);
});

function isAdmin(ctx) {
  return Boolean(ADMIN_ID && ctx.from && String(ctx.from.id) === ADMIN_ID);
}

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.reply(
    'Команды администратора:\n' +
    '/addvideo <ID> <количество> — добавить купленные видео\n' +
    '/removevideo <ID> <количество> [причина] — снять купленные видео\n' +
    '/block <ID> [причина] — заблокировать бота и сайт\n' +
    '/unblock <ID> — восстановить доступ\n' +
    '/history <ID> [число] — последние действия, покупки и баланс'
  );
});

bot.command('history', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const parts = ctx.message.text.trim().split(/\s+/);
  const targetId = parts[1];
  const requestedCount = Number(parts[2]) || 15;
  const count = Math.min(20, Math.max(1, Math.floor(requestedCount)));
  if (!targetId || !/^\d+$/.test(targetId)) {
    await ctx.reply('Формат: /history <telegram_id> [число событий до 20]');
    return;
  }

  try {
    const [free, purchased, processed, blocked, events, pendingId] = await Promise.all([
      getFreeBalance(targetId), getPurchasedBalance(targetId), getPatchedCount(targetId),
      getBlockedUser(targetId), getUserActivity(targetId, count), redis.get(`pendingPurchase:${targetId}`),
    ]);
    const pendingOrder = pendingId ? await readPurchaseOrder(pendingId) : null;
    const status = blocked ? `🚫 Заблокирован${blocked.reason ? `: ${blocked.reason}` : ''}` : '✅ Не заблокирован';
    const pending = pendingOrder
      ? `\n🧾 Заявка: ${pendingOrder.count} видео за ${pendingOrder.price} ₸ (${pendingOrder.status})`
      : '';
    const history = events.length
      ? events.map((event) => {
        const time = new Date(event.at).toLocaleString('ru-RU');
        const details = event.details ? ` — ${event.details}` : '';
        return `${time}: ${event.action}${details}`;
      }).join('\n')
      : 'Записей пока нет. Журнал начал собираться после обновления бота.';
    await ctx.reply(
      `👤 Пользователь ${targetId}\n${status}\n` +
      `🆓 Бесплатные видео: ${free}\n💎 Купленные видео: ${purchased}\n` +
      `🎬 Обработано видео: ${processed}${pending}\n\n` +
      `Последние действия (UTC):\n${history}`
    );
  } catch (error) {
    console.error('Ошибка history:', error);
    await ctx.reply('❌ Не удалось получить историю пользователя.');
  }
});

bot.command('addvideo', async (ctx) => {
  if (!isAdmin(ctx)) return;

  const parts = ctx.message.text.trim().split(/\s+/);
  const targetId = parts[1];
  const amount = Number(parts[2]);

  if (!targetId || !/^\d+$/.test(targetId) || !Number.isSafeInteger(amount) || amount <= 0) {
    ctx.reply('Формат: /addvideo <telegram_id> <количество>');
    return;
  }

  try {
    const newBalance = await addPurchasedBalance(targetId, amount);
    await recordUserActivity(targetId, 'Администратор добавил видео', { details: `${amount} видео` });
    ctx.reply(`✅ Зачислено ${amount} видео пользователю ${targetId}.\nНовый купленный баланс: ${newBalance}`);
  } catch (err) {
    console.error('Ошибка addvideo:', err);
    ctx.reply('❌ Не удалось обновить баланс. Проверьте логи сервера.');
  }
});

bot.command('removevideo', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const parts = ctx.message.text.trim().split(/\s+/);
  const targetId = parts[1];
  const amount = Number(parts[2]);
  const reason = parts.slice(3).join(' ').trim();
  if (!targetId || !/^\d+$/.test(targetId) || !Number.isSafeInteger(amount) || amount <= 0) {
    await ctx.reply('Формат: /removevideo <telegram_id> <количество> [причина]. Снимаются только купленные видео.');
    return;
  }

  try {
    const result = await removePurchasedBalance(targetId, amount);
    await recordUserActivity(targetId, 'Администратор снял купленные видео', {
      details: `${result.removed} видео${reason ? `; причина: ${reason}` : ''}`,
    });
    console.log('Admin removed purchased video balance', JSON.stringify({
      adminId: String(ctx.from.id), targetId, requested: amount, removed: result.removed, reason,
    }));
    await ctx.reply(`✅ Снято купленных видео: ${result.removed}. Остаток купленных: ${result.remaining}.`);
    try {
      const lang = await getLang(targetId);
      const [free, purchased] = await Promise.all([getFreeBalance(targetId), getPurchasedBalance(targetId)]);
      await bot.telegram.sendMessage(targetId, TEXTS[lang].balance(free, purchased), mainKeyboard(lang));
    } catch (error) {
      console.error('Не удалось уведомить пользователя о снятии баланса:', error.message);
    }
  } catch (error) {
    console.error('Ошибка removevideo:', error);
    await ctx.reply('❌ Не удалось изменить баланс. Проверьте логи сервера.');
  }
});

bot.command('block', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const parts = ctx.message.text.trim().split(/\s+/);
  const targetId = parts[1];
  const reason = parts.slice(2).join(' ').trim();
  if (!targetId || !/^\d+$/.test(targetId) || targetId === ADMIN_ID) {
    await ctx.reply('Формат: /block <telegram_id> [причина]. Нельзя заблокировать администратора.');
    return;
  }
  try {
    await blockUser(targetId, reason, ctx.from.id);
    await ctx.reply(`🚫 Пользователь ${targetId} заблокирован в боте и на сайте.${reason ? `\nПричина: ${reason}` : ''}`);
    try { await bot.telegram.sendMessage(targetId, TEXTS[await getLang(targetId)].accessBlocked); } catch (error) {}
  } catch (error) {
    console.error('Ошибка block:', error);
    await ctx.reply('❌ Не удалось заблокировать пользователя.');
  }
});

bot.command('unblock', async (ctx) => {
  if (!isAdmin(ctx)) return;
  const targetId = ctx.message.text.trim().split(/\s+/)[1];
  if (!targetId || !/^\d+$/.test(targetId)) {
    await ctx.reply('Формат: /unblock <telegram_id>');
    return;
  }
  try {
    await unblockUser(targetId);
    await ctx.reply(`✅ Блокировка пользователя ${targetId} снята.`);
    try {
      const lang = await getLang(targetId);
      await bot.telegram.sendMessage(targetId, '✅ Доступ восстановлен. Отправьте /start, чтобы продолжить.', mainKeyboard(lang));
    } catch (error) {}
  } catch (error) {
    console.error('Ошибка unblock:', error);
    await ctx.reply('❌ Не удалось снять блокировку.');
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

async function requireUserToken(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return res.status(401).json({ error: 'authentication_required' });

  const expected = crypto.createHmac('sha256', BOT_TOKEN).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch (error) { actual = Buffer.alloc(0); }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return res.status(401).json({ error: 'authentication_required' });
  }

  let session;
  try {
    session = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch (error) {
    res.status(401).json({ error: 'authentication_required' });
    return;
  }
  if (!session.telegramId || session.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'authentication_expired' });
  }
  req.telegramId = String(session.telegramId);
  try {
    if (await isUserBlocked(req.telegramId)) {
      return res.status(403).json({ error: 'user_blocked' });
    }
  } catch (error) {
    console.error('Не удалось проверить блокировку пользователя:', error.message);
    return res.status(503).json({ error: 'access_check_unavailable' });
  }
  return next();
}

function zernioEncryptionKey() {
  return crypto.createHmac('sha256', BOT_TOKEN).update('ineasy:zernio-api-key:v1').digest();
}

function encryptZernioApiKey(apiKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', zernioEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  return JSON.stringify({
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  });
}

function decryptZernioApiKey(record) {
  const cipherData = typeof record === 'string' ? JSON.parse(record) : record;
  const decipher = crypto.createDecipheriv('aes-256-gcm', zernioEncryptionKey(), Buffer.from(cipherData.iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(cipherData.tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherData.ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

async function getZernioApiKey(telegramId) {
  const saved = await redis.get(`zernioApiKey:${telegramId}`);
  if (!saved) return null;
  try {
    return decryptZernioApiKey(saved);
  } catch (error) {
    console.error('Не удалось расшифровать ключ Zernio для пользователя:', telegramId);
    return null;
  }
}

async function zernioRequest(apiKey, resource, options = {}) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };
  const response = await fetch(`${ZERNIO_API_BASE}${resource}`, {
    ...options,
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = response.status === 401
      ? 'invalid_zernio_api_key'
      : (typeof data.error === 'string' ? data.error : data.message);
    const error = new Error(message || `Zernio API request failed (${response.status}).`);
    error.status = response.status === 401 ? 422 : (response.status >= 400 && response.status < 500 ? response.status : 502);
    error.code = data.code || null;
    throw error;
  }
  return data;
}

function unwrapZernioData(response) {
  return response && Object.prototype.hasOwnProperty.call(response, 'data') ? response.data : response;
}

async function getZernioTikTokAccount(apiKey, accountId) {
  const data = unwrapZernioData(await zernioRequest(apiKey, '/accounts?platform=tiktok'));
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  return accounts.find((account) => account.platform === 'tiktok' && account.isActive !== false && (!accountId || account._id === accountId)) || null;
}

function parseScheduleInstant(localDateTime, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localDateTime || '');
  if (!match || typeof timeZone !== 'string' || timeZone.length > 100) return null;
  const requested = match.slice(1).map(Number);
  const targetAsUtc = Date.UTC(requested[0], requested[1] - 1, requested[2], requested[3], requested[4]);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  let instant = targetAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const representedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    instant += targetAsUtc - representedAsUtc;
  }
  const resolved = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, Number(part.value)]));
  const resolvedParts = [resolved.year, resolved.month, resolved.day, resolved.hour, resolved.minute];
  if (resolvedParts.some((value, index) => value !== requested[index])) return null;
  return instant;
}

app.post('/api/session', async (req, res) => {
  const sessionId = uuidv4();
  try {
    await setLoginSession(sessionId, { authorized: false, createdAt: Date.now() });
    res.json({ sessionId, botLink: `https://t.me/${BOT_USERNAME}?start=${sessionId}` });
  } catch (error) {
    console.error('Не удалось создать login-сессию:', error.message);
    res.status(503).json({ error: 'login_session_unavailable' });
  }
});

app.get('/api/session/:id', async (req, res) => {
  const session = await getLoginSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'session_not_found' });
  if (session.telegramId) {
    try {
      if (await isUserBlocked(session.telegramId)) {
        session.authorized = false;
        await setLoginSession(req.params.id, session);
        return res.status(403).json({ error: 'user_blocked' });
      }
    } catch (error) {
      console.error('Не удалось проверить блокировку пользователя:', error.message);
      return res.status(503).json({ error: 'access_check_unavailable' });
    }
  }
  res.json({
    authorized: session.authorized,
    subscriptionRequired: Boolean(session.subscriptionRequired),
    telegramId: session.telegramId || null,
    username: session.username || null,
    firstName: session.firstName || null,
    authToken: session.authorized ? createUserToken(session.telegramId) : null,
  });
});

app.post('/api/tiktok/key', requireUserToken, async (req, res) => {
  const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
  if (!/^(sk|zrk)_[a-f\d]{64}$/i.test(apiKey)) {
    return res.status(400).json({ error: 'invalid_zernio_api_key' });
  }
  try {
    await zernioRequest(apiKey, '/accounts?platform=tiktok');
    await redis.set(`zernioApiKey:${req.telegramId}`, encryptZernioApiKey(apiKey));
    res.json({ configured: true });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.status === 422 ? 'invalid_zernio_api_key' : (error.message || 'zernio_connection_failed') });
  }
});

app.get('/api/tiktok/status', requireUserToken, async (req, res) => {
  try {
    const apiKey = await getZernioApiKey(req.telegramId);
    if (!apiKey) return res.json({ configured: false, connected: false });
    const account = await getZernioTikTokAccount(apiKey);
    if (!account) return res.json({ configured: true, connected: false });
    const creatorInfo = unwrapZernioData(await zernioRequest(apiKey, `/accounts/${encodeURIComponent(account._id)}/tiktok/creator-info`));
    res.json({
      configured: true,
      connected: true,
      account: {
        id: account._id,
        username: account.username || account.displayName || '',
        displayName: account.displayName || '',
      },
      creatorInfo,
    });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'tiktok_status_failed' });
  }
});

app.get('/api/tiktok/connect', requireUserToken, async (req, res) => {
  try {
    const apiKey = await getZernioApiKey(req.telegramId);
    if (!apiKey) return res.status(400).json({ error: 'zernio_api_key_required' });
    const profilesData = unwrapZernioData(await zernioRequest(apiKey, '/profiles'));
    const profiles = Array.isArray(profilesData.profiles) ? profilesData.profiles : [];
    const account = await getZernioTikTokAccount(apiKey);
    const profileId = (account && typeof account.profileId === 'object' ? account.profileId._id : account?.profileId)
      || profiles.find((profile) => profile.isDefault)?._id
      || profiles[0]?._id;
    if (!profileId) return res.status(409).json({ error: 'zernio_profile_not_found' });
    const redirectUrl = new URL('/app.html', SITE_URL).toString();
    const query = new URLSearchParams({ profileId, redirect_url: redirectUrl, scopes: 'posting' });
    const connect = unwrapZernioData(await zernioRequest(apiKey, `/connect/tiktok?${query.toString()}`));
    if (!connect.authUrl) return res.status(502).json({ error: 'zernio_connect_url_missing' });
    res.json({ authUrl: connect.authUrl });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'tiktok_connect_failed' });
  }
});

app.post('/api/tiktok/media/presign', requireUserToken, async (req, res) => {
  const { filename, contentType, size } = req.body || {};
  const extension = typeof filename === 'string' ? path.extname(filename).toLowerCase() : '';
  const supportedFormat = (extension === '.mp4' && contentType === 'video/mp4') ||
    (extension === '.mov' && contentType === 'video/quicktime');
  if (!supportedFormat) {
    return res.status(400).json({ error: 'unsupported_video_format' });
  }
  if (!Number.isSafeInteger(size) || size < 1 || size > 2 * 1024 * 1024 * 1024) {
    return res.status(400).json({ error: 'video_size_out_of_range' });
  }
  try {
    const apiKey = await getZernioApiKey(req.telegramId);
    if (!apiKey) return res.status(400).json({ error: 'zernio_api_key_required' });
    const result = unwrapZernioData(await zernioRequest(apiKey, '/media/presign', {
      method: 'POST',
      body: { filename: path.basename(filename), contentType, size },
    }));
    if (!result.uploadUrl || !result.publicUrl) throw new Error('Zernio did not return an upload ticket.');
    const uploadId = uuidv4();
    const uploadKey = `tiktokUpload:${req.telegramId}:${uploadId}`;
    const uploadRecord = JSON.stringify({
      uploadUrl: result.uploadUrl,
      publicUrl: result.publicUrl,
      requiredHeaders: result.requiredHeaders && typeof result.requiredHeaders === 'object' ? result.requiredHeaders : {},
      contentType,
      size,
    });
    await redis.set(uploadKey, uploadRecord, { ex: Math.min(3600, Math.max(60, Number(result.expiresIn) || 3600)) });
    res.json({ uploadId });
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
    if (target.protocol !== 'https:') {
      return res.status(502).json({ error: 'invalid_storage_upload_url' });
    }
    if (req.headers['content-type'] !== upload.contentType) {
      return res.status(400).json({ error: 'upload_type_mismatch' });
    }
    const incomingLength = req.headers['content-length'] ? Number(req.headers['content-length']) : null;
    if (incomingLength !== null && !Number.isNaN(incomingLength) && incomingLength !== upload.size) {
      return res.status(400).json({ error: 'upload_size_mismatch' });
    }

    const upstream = https.request({
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      method: 'PUT',
      headers: {
        ...upload.requiredHeaders,
        'Content-Type': upload.contentType,
        'Content-Length': String(upload.size),
      },
    }, (storageResponse) => {
      storageResponse.resume();
      storageResponse.on('end', async () => {
        if (storageResponse.statusCode < 200 || storageResponse.statusCode >= 300) {
          return res.status(502).json({ error: 'media_storage_upload_failed' });
        }
        try {
          await redis.set(`zernioReadyUpload:${req.telegramId}:${req.params.uploadId}`, upload.publicUrl, { ex: 24 * 60 * 60 });
          await redis.del(uploadKey);
          res.json({ uploadId: req.params.uploadId });
        } catch (error) {
          console.error('Zernio media upload finalization failed:', error.message);
          res.status(502).json({ error: 'media_upload_finalize_failed' });
        }
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
  const { accountId, uploadId, content, privacyLevel, allowComment, allowDuet, allowStitch, madeWithAi, commercialContentType, confirmedPreview, consentGiven, scheduledFor, timezone } = req.body || {};
  if (typeof content !== 'string' || content.length > 2200) return res.status(400).json({ error: 'invalid_caption' });
  const trimmedContent = content.trim();
  const caption = trimmedContent.endsWith(TIKTOK_CAPTION_SUFFIX)
    ? trimmedContent
    : `${trimmedContent}${trimmedContent ? '\n' : ''}${TIKTOK_CAPTION_SUFFIX}`;
  if (caption.length > 2200) return res.status(400).json({ error: 'invalid_caption' });
  if (!confirmedPreview || !consentGiven) return res.status(400).json({ error: 'publishing_consent_required' });
  if (typeof uploadId !== 'string' || typeof accountId !== 'string') return res.status(400).json({ error: 'upload_or_account_required' });
  const allowedPrivacyLevels = ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'];
  if (!allowedPrivacyLevels.includes(privacyLevel)) return res.status(400).json({ error: 'privacy_level_not_available' });
  if (!['none', 'brand_organic', 'brand_content'].includes(commercialContentType)) {
    return res.status(400).json({ error: 'invalid_commercial_content_type' });
  }
  if (commercialContentType !== 'none' && privacyLevel === 'SELF_ONLY') {
    return res.status(400).json({ error: 'branded_content_cannot_be_private' });
  }
  let scheduledAt = null;
  if (scheduledFor !== null && scheduledFor !== undefined && scheduledFor !== '') {
    try { scheduledAt = parseScheduleInstant(scheduledFor, timezone); } catch (error) { scheduledAt = null; }
    if (scheduledAt === null || scheduledAt <= Date.now()) {
      return res.status(400).json({ error: 'invalid_schedule_time' });
    }
  }

  try {
    const apiKey = await getZernioApiKey(req.telegramId);
    if (!apiKey) return res.status(400).json({ error: 'zernio_api_key_required' });
    const account = await getZernioTikTokAccount(apiKey, accountId);
    if (!account) return res.status(403).json({ error: 'tiktok_account_not_connected' });
    const creatorInfo = unwrapZernioData(await zernioRequest(apiKey, `/accounts/${encodeURIComponent(accountId)}/tiktok/creator-info`));
    const allowedLevels = (Array.isArray(creatorInfo.privacyLevels) ? creatorInfo.privacyLevels : [])
      .map((level) => typeof level === 'string' ? level : level?.value)
      .filter(Boolean);
    if (allowedLevels.length && !allowedLevels.includes(privacyLevel)) {
      return res.status(400).json({ error: 'privacy_level_not_available' });
    }
    const readyUploadKey = `zernioReadyUpload:${req.telegramId}:${uploadId}`;
    const publicUrl = await redis.get(readyUploadKey);
    if (!publicUrl) return res.status(404).json({ error: 'upload_not_found_or_expired' });

    const idempotencyKeyName = `zernioPostKey:${req.telegramId}:${uploadId}`;
    let idempotencyKey = await redis.get(idempotencyKeyName);
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      await redis.set(idempotencyKeyName, idempotencyKey, { ex: 24 * 60 * 60 });
    }

    const platformSpecificData = {
      privacyLevel,
      allowComment: Boolean(allowComment),
      allowDuet: Boolean(allowDuet),
      allowStitch: Boolean(allowStitch),
      videoMadeWithAi: Boolean(madeWithAi),
      contentPreviewConfirmed: true,
      expressConsentGiven: true,
      ...(commercialContentType === 'none' ? {} : { commercialContentType }),
    };
    const response = await zernioRequest(apiKey, '/posts', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: {
        content: caption,
        mediaItems: [{ url: publicUrl, type: 'video' }],
        platforms: [{ platform: 'tiktok', accountId, platformSpecificData }],
        ...(scheduledAt === null ? { publishNow: true } : { scheduledFor, timezone }),
      },
    });
    const result = unwrapZernioData(response);
    const post = result.post || null;
    if (!post) throw new Error('Zernio did not return a post result.');
    const platformResult = (post.platforms || []).find((item) => item.platform === 'tiktok');
    if (post.status === 'failed' || platformResult?.status === 'failed') {
      await redis.del(idempotencyKeyName);
      return res.status(502).json({ error: platformResult?.errorMessage || post.errorMessage || 'tiktok_publish_failed' });
    }
    await redis.del(readyUploadKey, idempotencyKeyName);
    res.status(201).json({ post, draft: false });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'tiktok_publish_failed' });
  }
});

app.get('/api/balance/:telegramId', requireUserToken, async (req, res) => {
  try {
    const id = req.params.telegramId;
    if (String(id) !== req.telegramId) return res.status(403).json({ error: 'account_mismatch' });
    const [free, purchased] = await Promise.all([getFreeBalance(id), getPurchasedBalance(id)]);
    res.json({ free, purchased, balance: free + purchased });
  } catch (err) {
    console.error('Ошибка получения баланса:', err);
    res.status(500).json({ error: 'balance_fetch_failed' });
  }
});

app.post('/api/consume/:telegramId', requireUserToken, async (req, res) => {
  try {
    const telegramId = String(req.params.telegramId);
    if (telegramId !== req.telegramId) return res.status(403).json({ error: 'account_mismatch' });
    await consumeOneVideo(telegramId);
    await recordUserActivity(telegramId, 'Обработано видео');
    const [free, purchased, patched] = await Promise.all([
      getFreeBalance(telegramId),
      getPurchasedBalance(telegramId),
      getPatchedCount(telegramId),
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

app.post('/api/check-video', requireUserToken, async (req, res) => {
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
  if (!ADMIN_ID) console.log('⚠️  ADMIN_ID не задан — проверка чеков, админ-команды и модерация отключены.');
  ensureYtDlp().catch((e) => console.error('Не удалось установить yt-dlp:', e.message));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
