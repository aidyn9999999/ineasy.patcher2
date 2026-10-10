import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execFileSync } from 'child_process';

const g = globalThis;
eval(readFileSync(new URL('../public/adjn-mp4-core.js', import.meta.url), 'utf8'));
eval(readFileSync(new URL('../public/hevc-encoder.js', import.meta.url), 'utf8'));
const core = (() => { for (const k of Object.keys(g)) if (g[k]?.quickPatch) return g[k]; })();
const enc = g.ADJNHevcEncoder;

let failures = 0;
const check = (name, cond, d='') => { console.log(`${cond?'PASS':'FAIL'}  ${name}${d?' :: '+d:''}`); if(!cond) failures++; };

// 1. Браузерный режим без ffmpeg-рантайма: недоступен, файл не портится
check('HEVC isAvailable()=false без рантайма', enc.isAvailable() === false);
const fb = await enc.encode({ bytes: new Uint8Array(0), info: {} });
check('encode() ok:false + причина (безопасный fallback)', fb.ok === false && !!fb.reason, fb.reason);

// 2. Инъектированный рантайм поверх CLI ffmpeg (корректная работа с input/output файлами)
g.ADJNFFmpegRuntime = {
  async run(args, files) {
    const tmpIn = '/tmp/adjn-hevc-in.mp4', tmpOut = '/tmp/adjn-hevc-out.mp4';
    writeFileSync(tmpIn, files['input.mp4']);
    // заменяем имена файлов из аргументов модуля на tmp-пути
    const mapped = args.map(a => a === 'input.mp4' ? tmpIn : a === 'output.mp4' ? tmpOut : a);
    let exitCode = 0, stderr = '';
    try { execFileSync('ffmpeg', mapped, { stdio: ['ignore','pipe','pipe'] }); }
    catch (e) { exitCode = e.status ?? 1; stderr = String(e.stderr || e.message); }
    let out = null;
    try { out = new Uint8Array(readFileSync(tmpOut)); unlinkSync(tmpOut); } catch {}
    unlinkSync(tmpIn);
    return { exitCode, stderr, files: { 'output.mp4': out } };
  }
};
check('HEVC isAvailable()=true с рантаймом', enc.isAvailable() === true);

const srcBytes = new Uint8Array(readFileSync(new URL('../tests/fixtures/fps60.mp4', import.meta.url)));
const info = core.inspectMediaInfo(srcBytes);
const res = await enc.encode({ bytes: srcBytes, info });
check('HEVC encode ok', res.ok === true, res.reason || '');
if (res.ok) {
  writeFileSync('/tmp/adjn-hevc-probe.mp4', res.bytes);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v','error','-print_format','json','-show_streams','/tmp/adjn-hevc-probe.mp4']).toString());
  const v = probe.streams.find(s=>s.codec_type==='video');
  check('выход — HEVC', v.codec_name === 'hevc', v.codec_name);
  check('разрешение сохранено (1080x1920)', v.width===info.width && v.height===info.height, `${v.width}x${v.height}`);
  const fps = eval(v.avg_frame_rate);
  check('FPS честный 60/1 или 60000/1001 (без 60.05)', v.avg_frame_rate==='60/1' || v.avg_frame_rate==='60000/1001', `${v.avg_frame_rate} (${fps.toFixed(3)})`);
  check('yuv420p', v.pix_fmt === 'yuv420p', v.pix_fmt);
  check('CRF выбран автоматически', res.report.crf>=16 && res.report.crf<=32, `crf=${res.report.crf}`);
  check('кодирование выполнено один раз', res.report.reencodedOnce === true);
  // hvc1-тег в контейнере
  const raw = Buffer.from(res.bytes).subarray(0, Math.min(res.bytes.byteLength, 200000)).toString('latin1');
  check('тег hvc1 в stsd', raw.includes('hvc1'));
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL HEVC TESTS PASSED');
process.exit(failures?1:0);
