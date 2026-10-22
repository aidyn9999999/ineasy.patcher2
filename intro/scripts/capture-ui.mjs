// Captures real INEASY.SITE screens (served statically from ../public, API mocked) for the Remotion ad.
import {chromium} from 'playwright-core';

const BASE = 'http://127.0.0.1:8123';
const OUT = 'public/ui';
const VIDEO = process.argv[2];
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--no-proxy-server']});
const ctx = await b.newContext({viewport: {width: 390, height: 693}, deviceScaleFactor: 1080 / 390, locale: 'ru-RU'});
await ctx.addInitScript(() => {
  localStorage.setItem('tg_id', '100200300');
  localStorage.setItem('tg_auth_token', 'demo');
  localStorage.setItem('lang', 'ru');
});
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
let tiktokState = 'nokey';
await ctx.route('**/api/**', async (route) => {
  const u = route.request().url();
  const json = (o) => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(o)});
  if (u.includes('/api/balance')) return json({balance: 3, freeLeft: 2});
  if (u.includes('/api/tiktok/status')) {
    if (tiktokState === 'nokey') return json({configured: false});
    return json({configured: true, connected: true, account: {id: 'a1', username: 'ineasy'}, creatorInfo: {privacyLevelOptions: ['PUBLIC_TO_EVERYONE'], commentDisabled: false, duetDisabled: false, stitchDisabled: false, maxVideoPostDurationSec: 600}});
  }
  return json({});
});
const page = await ctx.newPage();
const S = 1080 / 390;
const coords = {};
const shot = (n) => page.screenshot({path: `${OUT}/${n}.png`});
const box = async (name, sel) => {
  const bb = await page.locator(sel).first().boundingBox().catch(() => null);
  if (bb) coords[name] = {x: Math.round((bb.x + bb.width / 2) * S), y: Math.round((bb.y + bb.height / 2) * S), w: Math.round(bb.width * S), h: Math.round(bb.height * S)};
};

await page.goto(`${BASE}/index.html`, {waitUntil: 'commit'}); await page.waitForTimeout(1500); await box('login', '#tgBtn'); await shot('login');
await page.goto(`${BASE}/app.html`, {waitUntil: 'commit'}); await page.waitForTimeout(2500); await box('home', '.home-cta'); await shot('home');
await page.click('[data-open-view="patchSection"]'); await page.waitForTimeout(1200); await shot('patcher');
await page.setInputFiles('#fileInput', VIDEO); await page.waitForTimeout(2500);
await page.evaluate(() => { const b = document.getElementById('processBtn'); b.disabled = false; b.scrollIntoView({block: 'center'}); });
await page.waitForTimeout(600); await box('process', '#processBtn'); await shot('patcher-video');
await page.evaluate(() => {
  const btn = document.getElementById('publishTiktokBtn');
  let n = btn; while (n && n !== document.body) { n.classList?.remove('hidden'); n.hidden = false; n = n.parentElement; }
  btn.scrollIntoView({block: 'center'});
});
await page.waitForTimeout(800); await box('publish', '#publishTiktokBtn'); await shot('result');
await page.click('#publishTiktokBtn'); await page.waitForTimeout(1500); await shot('zernio-empty');
await page.fill('#zernioApiKey', 'demo-key-0000000000000000'); await page.waitForTimeout(400); await box('key', '#zernioApiKey'); await box('connect', '#zernioSaveKeyBtn'); await shot('zernio-filled');
tiktokState = 'ok';
await page.evaluate(() => document.getElementById('zernioSaveKeyBtn').click()).catch(() => {});
await page.waitForTimeout(1800); await shot('publish-form');
await page.fill('#tiktokCaption', '#ineasy #tiktok #quality').catch(() => {}); await page.waitForTimeout(500); await shot('publish-caption');
await page.evaluate(() => document.getElementById('tiktokSubmitBtn').scrollIntoView({block: 'center'}));
await page.waitForTimeout(600); await box('submit', '#tiktokSubmitBtn'); await shot('publish-submit');
await box('caption', '#tiktokCaption');
import('node:fs').then((fs) => fs.writeFileSync(`${OUT}/coords.json`, JSON.stringify(coords, null, 1)));
await b.close();
