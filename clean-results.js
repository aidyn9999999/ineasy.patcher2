'use strict';
// Deletes every finished video kept by the bot (BOT_VIDEO_KEEP_DIR) and prints the freed space.
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.env.BOT_VIDEO_KEEP_DIR || process.argv[2] || '');
if (!process.env.BOT_VIDEO_KEEP_DIR && !process.argv[2]) {
  console.error('BOT_VIDEO_KEEP_DIR не задан. Укажите его в .env или передайте папку: npm run clean -- ./results');
  process.exit(1);
}
if (!fs.existsSync(dir)) { console.log('Папка пуста или не существует:', dir); process.exit(0); }

let bytes = 0;
let files = 0;
(function walk(d) {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) walk(full);
    else { bytes += fs.statSync(full).size; files += 1; }
  }
})(dir);
for (const entry of fs.readdirSync(dir)) fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
console.log(`Удалено файлов: ${files}, освобождено ${(bytes / 1048576).toFixed(1)} МБ`);
