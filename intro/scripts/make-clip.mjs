// Cuts the 5-second intro fragment out of the full track (public/cinnamon-girl-full.mp3).
// Usage: npm run clip -- [startSeconds]   (default 15)
// The track is NOT shipped as a licensed asset: swap in your own licensed copy before publishing commercially.
import {execFileSync} from 'node:child_process';

const start = Number(process.argv[2] ?? 15);
execFileSync(
  'ffmpeg',
  [
    '-y', '-ss', String(start), '-t', '5',
    '-i', 'public/cinnamon-girl-full.mp3',
    '-af', 'afade=t=in:st=0:d=0.5,afade=t=out:st=4.2:d=0.8',
    '-ac', '2', '-ar', '48000', '-b:a', '192k',
    'public/intro-music-5s.mp3',
  ],
  {stdio: 'inherit'},
);
console.log(`public/intro-music-5s.mp3 <- ${start}s..${start + 5}s`);
