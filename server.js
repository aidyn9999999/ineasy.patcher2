require('dotenv').config();
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Telegraf, Markup } = require('telegraf');
const { Redis } = require('@upstash/redis');

const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME || 'ineasybot';
const PORT = process.env.PORT || 3000;
const ADMIN_ID = process.env.ADMIN_ID ? String(process.env.ADMIN_ID).trim() : null;
const DEFAULT_BALANCE = 2;
const CARD_INFO = '4400 4300 4955 5771\nИмя: Айдынбек Н.';
const SITE_URL = process.env.SITE_URL || 'https://ineasypatcher2-production.up.railway.app/app.html';

// Пакеты для покупки: [видео, цена в тенге]
const PACKAGES = [
  [5, 2000],
  [15, 5000],
  [40, 10000],
];

if (!BOT_TOKEN) {
  console.error('Не найден BOT_TOKEN. Скопируйте .env.example в .env и вставьте токен от @BotFather.');
  process.exit(1);
}

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('Не найдены UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. Добавьте их в переменные окружения (см. upstash.com).');
  process.exit(1);
}

// --- Постоянное хранилище баланса (Upstash Redis) ---
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function balanceKey(telegramId) {
  return `balance:${telegramId}`;
}

async function getBalance(telegramId) {
  const key = balanceKey(telegramId);
  const value = await redis.get(key);
  if (value === null || value === undefined) {
    await redis.set(key, DEFAULT_BALANCE);
    return DEFAULT_BALANCE;
  }
  return Number(value);
}

async function addBalance(telegramId, amount) {
  await getBalance(telegramId);
  const newValue = await redis.incrby(balanceKey(telegramId), amount);
  return newValue;
}

// --- Хранилище сессий авторизации (в памяти — сессии живут недолго) ---
const sessions = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (!s.authorized && now - s.createdAt > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 60 * 60 * 1000);

// --- Телеграм-бот ---
const bot = new Telegraf(BOT_TOKEN);

function welcomeText(name) {
  return `👋 Привет, ${name}!\n\n` +
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
    `👇 Нажмите кнопку «🛒 КУПИТЬ» прямо сейчас! 👇\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `✨ Спасибо, что используете INEASY PATCHER!`;
}

function welcomeKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url('🌐 Открыть сайт', SITE_URL)],
    [Markup.button.callback('🛒 КУПИТЬ', 'buyvideo')],
  ]);
}

function buyText() {
  let text = `🛒 Выберите пакет лимитов:\n\n💳 Оплата на карту:\n${CARD_INFO}\n\n`;
  PACKAGES.forEach(([count, price]) => {
    text += `▫️ ${count} видео — ${price.toLocaleString('ru-RU')} тенге\n`;
  });
  text += `\n✅ После перевода отправьте сюда чек и ваш Telegram ID.\n\n` +
    `🔎 Ваш Telegram ID указан в углу экрана на сайте.`;
  return text;
}

async function sendWelcome(ctx) {
  const name = ctx.from.first_name || ctx.from.username || 'друг';
  await ctx.reply(welcomeText(name), welcomeKeyboard());
}

bot.start(async (ctx) => {
  const payload = ctx.startPayload ? ctx.startPayload.trim() : null;

  // Если пришли из сайта с сессией — авторизуем в фоне, но всегда показываем приветствие
  if (payload && payload !== 'buyvideo' && !payload.startsWith('buy_') && sessions.has(payload)) {
    const session = sessions.get(payload);
    session.authorized = true;
    session.telegramId = ctx.from.id;
    session.username = ctx.from.username || null;
    session.firstName = ctx.from.first_name || '';
    sessions.set(payload, session);
  }

  if (payload === 'buyvideo' || (payload && payload.startsWith('buy_'))) {
    await ctx.reply(buyText());
    return;
  }

  await sendWelcome(ctx);
});

bot.command('buyvideo', async (ctx) => {
  await ctx.reply(buyText());
});

bot.command('autorization', async (ctx) => {
  await sendWelcome(ctx);
});

bot.action('buyvideo', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(buyText());
});

bot.command('addvideo', async (ctx) => {
  if (!ADMIN_ID || String(ctx.from.id) !== ADMIN_ID) {
    return;
  }

  const parts = ctx.message.text.trim().split(/\s+/);
  const targetId = parts[1];
  const amount = parseInt(parts[2], 10);

  if (!targetId || !Number.isFinite(amount) || amount <= 0) {
    ctx.reply('Формат: /addvideo <telegram_id> <количество>\nНапример: /addvideo 123456789 10');
    return;
  }

  try {
    const newBalance = await addBalance(targetId, amount);
    ctx.reply(`✅ Зачислено ${amount} видео пользователю ${targetId}.\nНовый баланс: ${newBalance}`);
  } catch (err) {
    console.error('Ошибка addvideo:', err);
    ctx.reply('❌ Не удалось обновить баланс. Проверьте логи сервера.');
  }
});

// --- Веб-сервер ---
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/session', (req, res) => {
  const sessionId = uuidv4();
  sessions.set(sessionId, { authorized: false, createdAt: Date.now() });
  res.json({
    sessionId,
    botLink: `https://t.me/${BOT_USERNAME}?start=${sessionId}`,
  });
});

app.get('/api/session/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'session_not_found' });
  }
  res.json({
    authorized: session.authorized,
    telegramId: session.telegramId || null,
    username: session.username || null,
    firstName: session.firstName || null,
  });
});

app.get('/api/balance/:telegramId', async (req, res) => {
  try {
    const balance = await getBalance(req.params.telegramId);
    res.json({ balance });
  } catch (err) {
    console.error('Ошибка получения баланса:', err);
    res.status(500).json({ error: 'balance_fetch_failed' });
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
    console.log(`Бот @${BOT_USERNAME} слушает через вебхук: ${publicUrl}${WEBHOOK_PATH}`);
  } else {
    await bot.telegram.deleteWebhook();
    bot.launch();
    console.log(`Бот @${BOT_USERNAME} слушает команды (локальный polling)...`);
  }

  if (!ADMIN_ID) {
    console.log('⚠️  ADMIN_ID не задан — команда /addvideo для пополнения баланса работать не будет.');
  }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
