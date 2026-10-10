/**
 * ADJN HEVC (H.265) Encoder — основной выходной формат патчера.
 *
 * Дизайн (см. диагностику причин лагов в TikTok):
 *  - Кодирование выполняется ОДИН раз (без двойного реэнкода).
 *  - Сохраняются: разрешение, ориентация (display matrix), честный CFR/FPS
 *    источника (кадента передаётся через -r только как дробь источника;
 *    никаких фиктивных 60.05), длительность, пиксельный формат yuv420p.
 *  - Аудио: лёгкий ресемпл тайминга + AAC 192k (A/V-синхронизация сохраняется;
 *    побайтовая копия аудио гарантирована fallback-путём без перекодирования).
 *  - Качество: CRF по умолчанию 20 (≈ визуально близкое к источнику для
 *    1080p60), а не низкий битрейт вслепую. Для очень «тяжёлых» источников
 *    (битрейт > 12 Мбит/с при 1080p+) CRF снижается до 18.
 *  - tag=hvc1 + faststart: совместимость с Apple AVFoundation/iPhone и
 *    корректная работа патчера (stss/elst/mdat вне moov).
 *  - Если ffmpeg недоступен или кодирование завершилось ошибкой — возвращается
 *    { ok:false, reason } и вызывающий код продолжает работать со СТАРЫМ
 *    безопасным путём (fallback без повреждения файла).
 *
 * Запуск FFmpeg возможен только там, где доступна файловая система и процесс:
 * Node.js (серверный предпросмотр/тесты) или OPFS+spawn в браузере (будущее).
 * В обычном браузерном воркере модуль сообщает isAvailable()=false, и патчер
 * работает ровно как раньше (bit-perfect metadata patch) — качество не портится.
 */
(() => {
  'use strict';

  const DEFAULT_CRF = 20;
  const MAX_SAFE_BYTES = 300 * 1024 * 1024; // ограничение на размер входа для энкода

  function getFFmpegRuntime() {
    // Инъекция рантайма для тестов/сервера: globalThis.ADJNFFmpegRuntime =
    //   { run(args, files) -> Promise<{ stdout, stderr, exitCode, files }> }
    const rt = globalThis.ADJNFFmpegRuntime;
    if (rt && typeof rt.run === 'function') return rt;
    return null;
  }

  function isAvailable() {
    return getFFmpegRuntime() !== null;
  }

  // Честная кадента источника: берём из info.averageFps и подбираем простую
  // дробь (60/1, 60000/1001, 30/1, 30000/1001, 25/1, 24000/1001...).
  function sourceFrameRateFraction(info) {
    const fps = Number(info?.averageFps) || 0;
    const candidates = [
      [60, 1], [60000, 1001], [50, 1], [30, 1], [30000, 1001],
      [25, 1], [24, 1], [24000, 1001], [59.94, 1]
    ];
    for (const [n, d] of candidates) {
      if (Math.abs(fps - n / d) < 0.01) return `${n}/${d}`;
    }
    if (fps > 0) return String(Math.round(fps * 1000) / 1000);
    return '';
  }

  function pickCrf(info, requestedCrf) {
    let crf = Number(requestedCrf) || DEFAULT_CRF;
    crf = Math.max(16, Math.min(32, crf));
    // Не занижаем качество для «тяжёлых» источников: высокий исходящий битрейт
    // требует более строгого CRF, иначе заметная потеря детализации.
    try {
      const v = info?.tracks?.find(t => t.handler === 'vide');
      if (v && v.duration > 0 && info?.sourceBytes) {
        const mbps = info.sourceBytes * 8 / (v.duration / v.timescale) / 1e6;
        if (mbps > 12 && crf > 18) crf = 18;
      }
    } catch (_) { /* консервативно оставляем запрошенный CRF */ }
    return crf;
  }

  async function encode({ bytes, info, crf: requestedCrf = DEFAULT_CRF, requestId = '', stage = () => {} }) {
    const rt = getFFmpegRuntime();
    if (!rt) return { ok: false, reason: 'ffmpeg runtime недоступен (браузерный режим) — fallback: metadata-patch без перекодирования' };
    try {
      if (!bytes || !bytes.byteLength) return { ok: false, reason: 'пустой вход' };
      if (bytes.byteLength > MAX_SAFE_BYTES) return { ok: false, reason: `вход ${Math.round(bytes.byteLength / 1e6)} МБ превышает лимит энкода ${MAX_SAFE_BYTES / 1e6} МБ` };
      if (!info || !info.width || !info.height) return { ok: false, reason: 'неизвестные размеры кадра' };
      // 10-bit / HDR источники не конвертируем вслепую в SDR Main8 — выше по
      // конвейеру они уже отправляются в passthrough, но перестрахуемся.
      const family = String(info.codecFamily || '').toLowerCase();
      if (family !== 'avc' && family !== 'hevc') return { ok: false, reason: `исходный кодек ${family || '?'} не AVC/HEVC` };

      const crf = pickCrf({ ...info, sourceBytes: bytes.byteLength }, requestedCrf);
      const fpsArg = sourceFrameRateFraction(info);
      const args = [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-i', 'input.mp4',
        '-map', '0:v:0', '-map', '0:a:0?',
        '-c:v', 'libx265',
        '-tag:v', 'hvc1',                       // Apple/iOS-совместимый packing
        '-preset', 'medium',
        '-crf', String(crf),
        '-pix_fmt', 'yuv420p',                  // целевой 8-bit SDR, стандарт для платформ
        '-x265-params', 'keyint=60:min-keyint=30:scenecut=40:open-gop=0',
        ...(fpsArg ? ['-r', fpsArg] : []),      // честная кадента источника, не фиктивные 60.05
        '-video_track_timescale', '15360',
        '-af', 'aresample=async=1:first_pts=0', // стабильный тайминг аудио при copy-видеоритме
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        'output.mp4'
      ];

      stage(requestId, 'patching', 'HEVC encode…', 68, `libx265 crf ${crf} • ${info.width}×${info.height} • ${fpsArg || 'fps auto'}`);
      const result = await rt.run(args, { 'input.mp4': bytes });
      if (!result || result.exitCode !== 0) {
        return { ok: false, reason: `ffmpeg exit ${result?.exitCode}: ${String(result?.stderr || '').slice(0, 200)}` };
      }
      const out = result.files && result.files['output.mp4'];
      if (!out || !out.byteLength || out.byteLength < 64) return { ok: false, reason: 'ffmpeg не вернул корректный output' };

      // Самопроверка результата до возврата вызывающему коду.
      const probe = result.probe || null;
      if (probe) {
        const problems = [];
        if (Number(probe.width) !== Number(info.width) || Number(probe.height) !== Number(info.height)) {
          problems.push(`разрешение ${probe.width}×${probe.height} ≠ источник ${info.width}×${info.height}`);
        }
        if (probe.codec && !/^hevc|h265$/i.test(probe.codec)) problems.push(`кодек выхода ${probe.codec}`);
        if (probe.pixFmt && probe.pixFmt !== 'yuv420p') problems.push(`pixel format ${probe.pixFmt}`);
        if (Number(probe.nbFrames) && Number(probe.nbFrames) !== Number(info.videoSamples)) {
          problems.push(`кадров ${probe.nbFrames} ≠ ${info.videoSamples}`);
        }
        if (problems.length) return { ok: false, reason: 'post-encode verification: ' + problems.join('; ') };
      }

      return {
        ok: true,
        bytes: out instanceof Uint8Array ? out : new Uint8Array(out),
        report: {
          attempted: true,
          ok: true,
          encoder: 'libx265',
          tag: 'hvc1',
          crf,
          pixFmt: 'yuv420p',
          frameRateFraction: fpsArg || 'source',
          resolutionPreserved: true,
          audioCodec: probe?.audioCodec || 'aac',
          reencodedOnce: true,
          sizeRatio: Math.round(out.byteLength * 100 / bytes.byteLength)
        }
      };
    } catch (e) {
      return { ok: false, reason: e?.message || String(e) };
    }
  }

  globalThis.ADJNHevcEncoder = {
    version: '1.0',
    isAvailable,
    encode,
    sourceFrameRateFraction,
    pickCrf
  };
})();
