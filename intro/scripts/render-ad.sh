#!/usr/bin/env bash
# Renders the 77 s / 60 fps ad in chunks (silent), concatenates them and mixes the audio.
# Usage: scripts/render-ad.sh [chrome-executable]
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME=${1:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}
BROWSER=(--browser-executable="$CHROME" --chrome-mode=chrome-for-testing)
mkdir -p out/chunks
i=0
for r in 0-299 300-1799 1800-3299 3300-4619; do
  [ -s out/chunks/c$i.mp4 ] || npx remotion render src/index.ts IneasyAd out/chunks/c$i.mp4 --frames=$r --muted --codec=h264 --crf=20 --concurrency=3 --timeout=180000 "${BROWSER[@]}"
  echo "file 'c$i.mp4'" >> out/chunks/list.tmp
  i=$((i+1))
done
mv out/chunks/list.tmp out/chunks/list.txt
ffmpeg -v error -y -f concat -safe 0 -i out/chunks/list.txt -c copy out/ad-silent.mp4
node scripts/mix-audio.mjs
