import { readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';

// --- загрузка модулей (IIFE с globalThis) ---
const g = globalThis;
const load = (f) => { const code = readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8'); eval(code); };
load('adjn-mp4-core.js');
const core = g.ADJNMP4Core || g.ADJN_MP4_CORE || g.ADJNCore || (() => { for (const k of Object.keys(g)) if (/adjn/i.test(k) && g[k]?.quickPatch) return g[k]; })();
if (!core?.quickPatch) throw new Error('core module not found: ' + Object.keys(g).filter(k=>/adjn/i.test(k)));

const probe = (file) => JSON.parse(execFileSync('ffprobe', ['-v','error','-print_format','json',
  '-show_streams','-show_format', file]).toString());
const vstream = (p) => p.streams.find(s => s.codec_type === 'video');
const astream = (p) => p.streams.find(s => s.codec_type === 'audio');

let failures = 0;
function check(name, cond, detail='') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
  if (!cond) failures++;
}

for (const fx of ['fps60.mp4', 'hevc60.mp4']) {
  const src = `tests/fixtures/${fx}`;
  const bytes = new Uint8Array(readFileSync(src));
  const out = core.quickPatch(bytes);
  const outFile = `tests/fixtures/out-${fx}`;
  writeFileSync(outFile, out);

  const pi = probe(src), po = probe(outFile);
  const vi = vstream(pi), vo = vstream(po);
  const ai = astream(pi), ao = astream(po);

  // 1. FPS после патча == честные 59.94 (60000/1001)
  check(`${fx}: avg_frame_rate = 60000/1001`, vo.avg_frame_rate === '60000/1001', `got ${vo.avg_frame_rate}`);
  check(`${fx}: r_frame_rate = 60000/1001`, vo.r_frame_rate === '60000/1001', `got ${vo.r_frame_rate}`);

  // 2. Никакого фиктивного 60.05
  const fpsNum = eval(vo.avg_frame_rate.replace('/','/'));
  check(`${fx}: FPS ≈ 59.94 (не 60.05)`, Math.abs(fpsNum - 59.94006) < 0.001, `fps=${fpsNum.toFixed(5)}`);

  // 3. Кадры и разрешение сохранены
  check(`${fx}: nb_frames preserved`, vi.nb_frames === vo.nb_frames, `${vi.nb_frames} → ${vo.nb_frames}`);
  check(`${fx}: resolution preserved`, vi.width===vo.width && vi.height===vo.height, `${vo.width}x${vo.height}`);
  check(`${fx}: codec preserved`, vi.codec_name === vo.codec_name, `${vo.codec_name}`);

  // 4. Длительность видео == длительности аудио (A/V синхрон без дрейфа).
  // format.duration в этом патчере — sentinel «Unknown Duration» (защита TikTok),
  // поэтому сравниваем постримовые длительности.
  if (ao) {
    const vSec = Number(vo.nb_frames) * 1001 / 60000; // честная кадента 59.94
    const adur = parseFloat(ao.duration);
    const driftMs = Math.abs(vSec*1000 - adur*1000);
    check(`${fx}: A/V duration aligned (<15ms)`, driftMs < 15, `video=${vSec.toFixed(3)}s audio=${adur}s drift=${driftMs.toFixed(1)}ms`);
  } else {
    check(`${fx}: no audio track — skip A/V check`, true);
  }

  // 5. Полное декодирование без ошибок (плавность/корректность таймингов)
  let decOk = true, decErr='';
  try { execFileSync('ffmpeg', ['-v','error','-i',outFile,'-f','null','-']); }
  catch(e){ decOk=false; decErr=String(e.stderr||e.message).slice(0,120); }
  check(`${fx}: full decode without errors`, decOk, decErr);

  // 6. Битстрим не перекодирован (размер ~ исходный + метаданные)
  const ratio = out.byteLength / bytes.byteLength;
  check(`${fx}: bitstream untouched (size ratio 0.9–1.1)`, ratio > 0.9 && ratio < 1.1, `ratio=${ratio.toFixed(3)}`);

  // 7. Честный ритм кадров: все PTS-интервалы = 1001 тиков @ 60000 (без jitter)
  const pts = execFileSync('ffprobe', ['-v','error','-select_streams','v:0',
    '-show_entries','frame=pts_time','-of','csv=p=0', outFile]).toString()
    .trim().split('\n').map(Number).filter(n => !Number.isNaN(n));
  let maxJitterUs = 0;
  for (let i = 1; i < pts.length; i++) {
    const dUs = Math.abs((pts[i]-pts[i-1]) - 1001/60000) * 1e6;
    if (dUs > maxJitterUs) maxJitterUs = dUs;
  }
  check(`${fx}: frame intervals exactly 1/59.94s (jitter < 10µs)`, pts.length >= 2 && maxJitterUs < 10, `frames=${pts.length}, maxJitter=${maxJitterUs.toFixed(2)}µs`);
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL TESTS PASSED');
process.exit(failures ? 1 : 0);
