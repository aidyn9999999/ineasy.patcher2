#!/usr/bin/env bash
# Renders the 77 s / 60 fps ad in small silent chunks (each with a watchdog + retries; software-GL Chrome can stall
# on heavy 3D frames), concatenates them and mixes the audio. Re-running resumes from finished chunks.
# Usage: scripts/render-ad.sh [chrome-executable]
set -uo pipefail
cd "$(dirname "$0")/.."
CHROME=${1:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}
TOTAL=4620      # 77 s * 60 fps
STEP=150
mkdir -p out/chunks
[ -d out/bundle ] || npx remotion bundle src/index.ts --out-dir=out/bundle >/dev/null
n=0
for ((s=0; s<TOTAL; s+=STEP)); do
  e=$((s+STEP-1)); [ $e -ge $TOTAL ] && e=$((TOTAL-1))
  f=out/chunks/$(printf %03d $n).mp4
  if [ ! -s "$f" ]; then
    for try in 1 2 3 4 5; do
      timeout 240 npx remotion render out/bundle IneasyAd "$f" --frames=$s-$e --muted --codec=h264 --crf=20 --concurrency=2 \
        --browser-executable="$CHROME" --chrome-mode=chrome-for-testing >/dev/null 2>&1 && [ -s "$f" ] && break
      rm -f "$f"; echo "retry chunk $n (frames $s-$e), try $try" >&2
    done
  fi
  [ -s "$f" ] || { echo "FAILED chunk $n" >&2; exit 1; }
  echo "chunk $((n+1))/$(( (TOTAL+STEP-1)/STEP )) done (frames $s-$e)"
  n=$((n+1))
done
: > out/chunks/list.txt
for f in out/chunks/[0-9]*.mp4; do echo "file '$(basename "$f")'" >> out/chunks/list.txt; done
ffmpeg -v error -y -f concat -safe 0 -i out/chunks/list.txt -c copy out/ad-silent.mp4 && node scripts/mix-audio.mjs && echo DONE
