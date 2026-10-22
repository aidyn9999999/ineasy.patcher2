// Final mix. Inputs: video (silent or any, default out/ad-silent.mp4), the full Cinnamon Girl track (public/cinnamon-girl-full.mp3,
// supplied by the project owner) and the supplied Kazakh voice-over (public/voiceover-final.mp3, used whole, starting at 0:05).
// Music plays through the whole ad: full level for the 0-5 s intro, ducked under the voice, swelling back for the end card.
// Usage: node scripts/mix-audio.mjs [videoIn] [videoOut]
import {execFileSync} from 'node:child_process';

const TOTAL = 77;
const VOICE_AT = 5000;
const IN = process.argv[2] ?? 'out/ad-silent.mp4';
const OUT = process.argv[3] ?? 'out/ineasy-ad.mp4';
const DUCK = 0.24; // music level under the voice
const VOL = `if(lt(t,4.5),1,if(lt(t,6),1-(t-4.5)/1.5*${1 - DUCK},if(lt(t,72.4),${DUCK},if(lt(t,74),${DUCK}+(t-72.4)/1.6*0.3,${DUCK + 0.3}))))`;

// Track is 60 s: play 15 s -> end, then loop back to the start with a 2 s crossfade to cover 77 s.
const music = `[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=15:60,asetpts=PTS-STARTPTS[A];[3:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:40,asetpts=PTS-STARTPTS[B];[A][B]acrossfade=d=2,afade=t=in:d=0.5,afade=t=out:st=${TOTAL - 2.5}:d=2.5,volume='${VOL}':eval=frame,atrim=0:${TOTAL}[m]`;
const voice = `[2:a]loudnorm=I=-16:TP=-1.5:LRA=7,adelay=${VOICE_AT}|${VOICE_AT},aformat=sample_rates=48000:channel_layouts=stereo[v]`;
const mix = `[m][v]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.95,apad=whole_dur=${TOTAL},atrim=0:${TOTAL}[a]`;

execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', IN, '-i', 'public/cinnamon-girl-full.mp3', '-i', 'public/voiceover-final.mp3', '-i', 'public/cinnamon-girl-full.mp3',
  '-filter_complex', `${music};${voice};${mix}`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT], {stdio: 'inherit'});
console.log(OUT);
