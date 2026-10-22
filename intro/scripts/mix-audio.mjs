// Mixes: Cinnamon Girl fragment 0-5 s (public/intro-music-5s.mp3), the supplied Kazakh voice-over used whole from 0:05
// (public/voiceover-final.mp3), and a very quiet synthesised pad under the voice. No other voice is added.
import {execFileSync} from 'node:child_process';

const TOTAL = 77;
const VOICE_AT = 5000;
const run = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], {stdio: 'inherit'});

run(['-f', 'lavfi', '-i', `sine=f=110:d=${TOTAL}`, '-f', 'lavfi', '-i', `sine=f=164.8:d=${TOTAL}`, '-f', 'lavfi', '-i', `sine=f=220:d=${TOTAL}`, '-f', 'lavfi', '-i', `sine=f=277.2:d=${TOTAL}`,
  '-filter_complex', `[0][1][2][3]amix=inputs=4:normalize=0,lowpass=f=900,tremolo=f=0.25:d=0.4,aecho=0.8:0.7:600:0.4,afade=t=out:st=${TOTAL - 4}:d=4,aformat=channel_layouts=stereo`, '-ar', '48000', 'out/pad.wav']);

run(['-i', 'out/ad-silent.mp4', '-i', 'public/intro-music-5s.mp3', '-i', 'public/voiceover-final.mp3', '-i', 'out/pad.wav',
  '-filter_complex',
  `[2:a]loudnorm=I=-16:TP=-1.5:LRA=7,adelay=${VOICE_AT}|${VOICE_AT}[v];[1:a]apad=whole_dur=${TOTAL}[m];[3:a]volume='if(lt(t,4),0,min(1,(t-4)/2))*0.10':eval=frame[p];[m][v][p]amix=inputs=3:normalize=0:duration=longest,alimiter=limit=0.95,atrim=0:${TOTAL}[a]`,
  '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'out/ineasy-ad.mp4']);
console.log('out/ineasy-ad.mp4');
