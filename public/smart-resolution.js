/*
 * Smart Resolution — модуль автоматического подбора разрешения и формата кадра
 * для функции Smart Auto (ADJN Core patcher).
 *
 * Цель: уменьшить вероятность лагов после публикации на платформе за счёт
 * РЕАЛЬНЫХ параметров видеокадров, а не подмены метаданных.
 *
 * Принципы:
 *  1. Анализируется исходное разрешение, соотношение сторон, FPS, кодек,
 *     timescale/timing-таблицы (CFR/VFR) и параметры кодирования (bitrate, profile/level).
 *  2. Проверяется совместимость размеров кадра с pipeline обработки
 *     (модульность 2/16, целочисленное соотношение сторон без растяжения,
 *     лимиты контейнера и платформы).
 *  3. Изменение разрешения применяется ТОЛЬКО если проблема вызвана самим
 *     размером/форматом кадра. Если причина в тайминге или кодировании —
 *     выбираются другие реальные параметры (CFR-timeline retiming), либо
 *     изменение не применяется вовсе.
 *  4. Соотношение сторон сохраняется строго; при необходимости кадр
 *     доводится до ближайших чётных размеров симметричным паддингом
 *     (реальное изображение меняется, пропорции — нет; растяжение запрещено).
 *  5. Никакой имитации: заявленные размеры всегда равны фактическим
 *     размерам кадров (проверяется по tkhd + coded dimensions + браузерной
 *     декодировке videoWidth/videoHeight).
 *  6. Повторное кодирование выполняется только как явный opt-in fallback
 *     (engine 'ffmpeg'); по умолчанию используется без перекодировочный путь
 *     remux/patch, сохраняющий исходный битстрим.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SmartResolution = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0';

  // Стандартные «безопасные» кадры платформы: точные preset-размеры,
  // кратные 16 по обеим сторонам, которые pipeline принимает без изменений.
  const STANDARD_PRESETS = [
    { width: 1080, height: 1920, label: '1080x1920 (9:16)' },
    { width: 1920, height: 1080, label: '1920x1080 (16:9)' },
    { width: 720,  height: 1280, label: '720x1280 (16:9)' },
    { width: 1280, height: 720,  label: '1280x720 (9:16)' },
    { width: 1080, height: 1080, label: '1080x1080 (1:1)' },
    { width: 2160, height: 3840, label: '4K 9:16' },
    { width: 3840, height: 2160, label: '4K 16:9' }
  ];

  // Максимальная доля пикселей, которую можно потерять при приведении
  // к ближайшему безопасному кадру (~5% линейно ≈ ~10% площади).
  const MAX_LINEAR_SHRINK = 0.95;
  const MAX_PADDED_SIDE = 64;          // максимальные поля при паддинге
  const PLATFORM_LONG_SIDE_LIMIT = 4096;
  const PLATFORM_SHORT_SIDE_LIMIT = 2304;

  function gcd(a, b) {
    a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
    while (b) { const t = a % b; a = b; b = t; }
    return a || 1;
  }

  function aspectRatio(w, h) {
    const g = gcd(w, h);
    return { num: w / g, den: h / g, value: w / h };
  }

  // Известные соотношения сторон, допускающие лёгкую доводку кадра
  function isKnownAspect(w, h) {
    const r = (w / h);
    const known = [9 / 16, 16 / 9, 1 / 1, 4 / 5, 5 / 4, 3 / 4, 4 / 3, 2 / 3, 9 / 19.5, 9 / 20];
    return known.some(k => Math.abs(r - k) <= k * 0.01);
  }

  /**
   * Полный анализ исходного видео перед выбором параметров.
   * info — результат inspectMediaInfo ADJN Core (+ расширенные поля,
   * если они доступны из контейнера: bitrate, profile, level, VFR-флаги).
   */
  function analyzeSource(info, options = {}) {
    const width = Math.round(Number(info.width) || 0);
    const height = Math.round(Number(info.height) || 0);
    if (!width || !height) throw new Error('smart_resolution_source_unreadable');

    const fps = Number(info.maxFps || info.averageFps || 0);
    const codecFamily = String(info.codecFamily || '').toLowerCase();
    const aspect = aspectRatio(width, height);
    const shortSide = Math.min(width, height);
    const longSide = Math.max(width, height);

    // CFR vs VFR: pipeline безопасно ретаймит только CFR-видео
    // (все stts-интервалы одинаковы). core может передать flags.cfr.
    const cfr = info.cfr !== undefined ? Boolean(info.cfr)
      : (info.timingUniform === true || options.assumeCfr === true);

    const issues = [];

    // 1. Нечётные размеры кадра — реальная несовместимость:
    //    yuv420 требует чётных coded-размеров; браузеры/энкодеры падают
    //    или молча меняют геометрию; часть pipeline отклоняет такие файлы.
    if (width % 2 !== 0 || height % 2 !== 0) {
      issues.push({ code: 'odd_frame_dimensions', severity: 'blocking',
        detail: `Кадры ${width}×${height} нечётные — ломает chroma-subsample 4:2:0 конвейер и повторное транскодирование платформой.` });
    }

    // 2. Кадр не кратен модуле кодирования (16 для AVC/HEVC): coded-размеры
    //    расходятся с display, платформенный транскодер тратит ресурсы на
    //    crop/pad → лишняя нагрузка и вероятные лаги после публикации.
    const mod16Ok = width % 16 === 0 && height % 16 === 0;
    const mod2Ok = width % 2 === 0 && height % 2 === 0;
    if (mod2Ok && !mod16Ok && !isPresetExact(width, height)) {
      issues.push({ code: 'non_modular_coding_grid', severity: 'warning',
        detail: `${width}×${height} не кратен сетке кодирования 16 px (coded ≠ display geometry).` });
    }

    // 3. Дробное/нестандартное соотношение сторон → риск letterbox-артефактов
    //    и дополнительных фильтров на стороне платформы.
    if (!isKnownAspect(width, height)) {
      issues.push({ code: 'exotic_aspect_ratio', severity: 'warning',
        detail: `Соотношение ${aspect.num}:${aspect.den} не входит в стандартные форматы кадра.` });
    }

    // 4. Превышение лимитов платформы.
    if (longSide > PLATFORM_LONG_SIDE_LIMIT || shortSide > PLATFORM_SHORT_SIDE_LIMIT) {
      issues.push({ code: 'platform_resolution_limit', severity: 'blocking',
        detail: `${width}×${height} превышает принимаемый платформой максимум.` });
    }

    // 5. Битрейт выше разумного для данного размера кадра → серверный
    //    down-transcode почти гарантирован (источник лагов).
    const bitrateMbps = Number(info.bitrateMbps || 0);
    const recommendedMax = recommendedBitrateMbps(width, height, fps, codecFamily);
    if (bitrateMbps > recommendedMax * 1.35) {
      issues.push({ code: 'excessive_bitrate', severity: 'warning',
        detail: `Битрейт ${bitrateMbps.toFixed(1)} Mbps выше рекомендуемого ${recommendedMax} Mbps — платформенный транскодер будет резать качество.` });
    }

    // 6. VFR + попытка safe-retiming невозможна: это проблема тайминга,
    //    НЕ разрешения — разрешение менять нельзя (требование №8).
    if (options.retimeRequested && !cfr) {
      issues.push({ code: 'timing_vfr_not_resolution', severity: 'informational',
        detail: 'Переменная частота кадров (VFR): причина потенциальных лагов — тайминг, а не разрешение. Изменение разрешения не применится.' });
    }

    return {
      width, height, fps, codecFamily, aspect,
      shortSide, longSide,
      mod2Ok, mod16Ok,
      cfr,
      bitrateMbps,
      recommendedMaxBitrateMbps: recommendedMax,
      issues
    };
  }

  function recommendedBitrateMbps(width, height, fps, codecFamily) {
    const pixels = width * height;
    const base = pixels >= 3840 * 2160 ? 35 : pixels >= 1920 * 1080 ? 12 : 6;
    const fpsBoost = fps > 50 ? 1.5 : fps > 30 ? 1.25 : 1;
    const hevcEfficiency = (codecFamily === 'hevc' || codecFamily === 'av1') ? 0.7 : 1;
    return Math.round(base * fpsBoost * hevcEfficiency);
  }

  function isPresetExact(width, height) {
    return STANDARD_PRESETS.some(p => p.width === width && p.height === height);
  }

  /**
   * Кандидаты «безопасного кадра», сохраняющие исходное соотношение сторон.
   * Возвращается лучший вариант по детализации (максимум пикселей),
   * который pipeline принимает без растягивания.
   */
  function findCompatibleFrame(analysis) {
    const { width, height, aspect } = analysis;
    const portrait = height >= width;
    const candidates = [];

    // A) Точные стандартные пресеты с тем же соотношением сторон.
    for (const preset of STANDARD_PRESETS) {
      const pa = aspectRatio(preset.width, preset.height);
      if (Math.abs(pa.value - aspect.value) < 1e-9) {
        const scale = Math.sqrt((preset.width * preset.height) / (width * height));
        candidates.push({
          kind: 'exact-preset',
          width: preset.width, height: preset.height,
          pixelRetention: (preset.width * preset.height) / (width * height),
          linearScale: scale,
          requiresReencode: !(scale === 1),
          stretchRisk: false, padPx: 0,
          note: `Стандартный кадр ${preset.label}, точно совпадает с исходным соотношением ${aspect.num}:${aspect.den}.`
        });
      }
    }

    // B) Безпотерьная доводка до чётных размеров симметричным паддингом
    //    (реальные кадры становятся больше на ≤2 px поля; пропорции не меняются).
    if (width % 2 !== 0 || height % 2 !== 0) {
      const pw = width + (width % 2);
      const ph = height + (height % 2);
      const newAspect = aspectRatio(pw, ph);
      const drift = Math.abs(newAspect.value / aspect.value - 1);
      if (drift <= 0.005 && Math.max(pw - width, ph - height) <= MAX_PADDED_SIDE) {
        candidates.push({
          kind: 'pad-to-even',
          width: pw, height: ph,
          pixelRetention: (width * height) / (pw * ph),
          linearScale: 1,
          requiresReencode: true,
          reencodeMode: 'pad-only',
          stretchRisk: false,
          padPx: Math.max(pw - width, ph - height),
          note: `Доведение ${width}×${height} до чётного кадра ${pw}×${ph} симметричными полями (без растяжения, потеря ${aspect.num}:${aspect.den} → ${newAspect.num}:${newAspect.den} ≤ 0.5%).`
        });
      }
    }

    // C) Уменьшение до ближайшего compatible-кадра с сохранением пропорций
    //    (только когда паддинг невозможен, например тяжёлые нечётные размеры
    //    с экзотическим аспектом). Ограничение: не более MAX_LINEAR_SHRINK.
    const targetW = portrait ? nearestMod(width, 16, 'down') : nearestMod(width, 16, 'down');
    const targetH = portrait ? nearestMod(height, 16, 'down') : nearestMod(height, 16, 'down');
    if (targetW >= 16 && targetH >= 16) {
      const lin = Math.min(targetW / width, targetH / height);
      if (lin >= MAX_LINEAR_SHRINK && lin < 1) {
        // точное сохранение аспекта: пересчитываем короткую сторону
        const longSide = Math.max(targetW, targetH);
        const shortSide = Math.round(longSide / aspect.value / 16) * 16;
        const w2 = portrait ? shortSide : longSide;
        const h2 = portrait ? longSide : shortSide;
        if (w2 >= 16 && h2 >= 16) {
          const a2 = aspectRatio(w2, h2);
          if (Math.abs(a2.value / aspect.value - 1) <= 0.01) {
            candidates.push({
              kind: 'downscale-mod16',
              width: w2, height: h2,
              pixelRetention: (w2 * h2) / (width * height),
              linearScale: Math.min(w2 / width, h2 / height),
              requiresReencode: true,
              reencodeMode: 'scale-lanczos',
              stretchRisk: false,
              padPx: 0,
              note: `Приведение к сетке кодирования 16 px: ${w2}×${h2} (${a2.num}:${a2.den}), потерю детализации ≤ ${(100 - (w2 * h2) / (width * height) * 100).toFixed(1)}%.`
            });
          }
        }
      }
    }

    // D) Пресет чуть ниже исходника при превышении лимитов платформы.
    if (analysis.longSide > PLATFORM_LONG_SIDE_LIMIT || analysis.shortSide > PLATFORM_SHORT_SIDE_LIMIT) {
      for (const preset of STANDARD_PRESETS) {
        const pa = aspectRatio(preset.width, preset.height);
        if (Math.abs(pa.value - aspect.value) < 0.01 &&
            preset.width <= width && preset.height <= height &&
            preset.width >= width * MAX_LINEAR_SHRINK) {
          candidates.push({
            kind: 'platform-cap',
            width: preset.width, height: preset.height,
            pixelRetention: (preset.width * preset.height) / (width * height),
            linearScale: Math.min(preset.width / width, preset.height / height),
            requiresReencode: true,
            reencodeMode: 'scale-lanczos',
            stretchRisk: false,
            note: `Кадр превышает лимиты платформы — выбор ближайшего стандартного ${preset.label}.`
          });
        }
      }
    }

    if (!candidates.length) return null;

    // Лучший кандидат: без перекодирования > максимальная детализация > минимальный риск.
    candidates.sort((a, b) => {
      if (a.requiresReencode !== b.requiresReencode) return a.requiresReencode ? 1 : -1;
      if (Math.abs(b.pixelRetention - a.pixelRetention) > 1e-6) return b.pixelRetention - a.pixelRetention;
      return (a.padPx || 0) - (b.padPx || 0);
    });
    return candidates[0];
  }

  function nearestMod(v, m, dir) {
    return dir === 'down' ? Math.floor(v / m) * m : Math.ceil(v / m) * m;
  }

  /**
   * Основная функция Smart Auto → Smart Resolution.
   * decision = decideResolution(sourceInfo, context)
   *   context.pipeline — возможности текущего pipeline (retiming CFR, патч-puthrough)
   *   context.retimeRequested — запрошен ли safe frame-rate retiming (60→60.05)
   *   context.engine — 'none' (по умолчанию, без перекодирования) | 'ffmpeg' (opt-in fallback)
   *
   * Правила:
   *  - Если блокирующих проблем с разрешением нет → keep (не трогаем кадры).
   *  - Если проблема есть, но её природа — тайминг/кодирование → keep + рекомендация.
   *  - Изменение применяется только при реальной совместимости и сохранении аспекта.
   */
  function decideResolution(sourceInfo, context = {}) {
    const pipeline = context.pipeline || {};
    const engine = context.engine || 'none';
    const analysis = analyzeSource(sourceInfo, {
      retimeRequested: Boolean(context.retimeRequested),
      assumeCfr: context.assumeCfr
    });

    const blocking = analysis.issues.filter(i => i.severity === 'blocking');
    const warnings = analysis.issues.filter(i => i.severity === 'warning');
    const informational = analysis.issues.filter(i => i.severity === 'informational');

    const report = {
      module: `Smart Resolution v${VERSION}`,
      source: {
        width: analysis.width, height: analysis.height,
        resolution: `${analysis.width}x${analysis.height}`,
        aspectRatio: `${analysis.aspect.num}:${analysis.aspect.den}`,
        fps: analysis.fps ? Number(analysis.fps.toFixed(3)) : null,
        codec: analysis.codecFamily || 'unknown',
        bitrateMbps: analysis.bitrateMbps || null,
        cfr: analysis.cfr
      },
      issues: analysis.issues,
      action: 'keep',
      selected: null,
      recommendation: null,
      qualityComparison: null,
      notes: []
    };

    // Природа проблемы — тайминг, а не разрешение → разрешение НЕ меняем (треб. 8).
    if (informational.length && !blocking.length) {
      report.action = 'keep';
      report.notes.push('Причина потенциальных лагов — переменный тайминг кадров, изменение разрешения не поможет и не применено.');
      return report;
    }

    // Нет блокирующих проблем с кадром: стандартный/чётный кадр в пределах лимитов.
    if (!blocking.length) {
      if (isPresetExact(analysis.width, analysis.height) && analysis.mod16Ok) {
        report.notes.push(`Кадр ${analysis.width}×${analysis.height} уже является стандартным безопасным форматом — изменения не требуются.`);
      } else if (warnings.length) {
        report.action = 'keep';
        report.recommendation = {
          type: 'no-automatic-change',
          reason: 'Предупреждения не блокируют pipeline; автоматическое изменение разрешения могло бы снизить детализацию без гарантии улучшения совместимости.',
          warnings: warnings.map(w => w.detail)
        };
        report.notes.push('Применены предупреждения без принудительного изменения кадра (требование: не менять разрешение без необходимости).');
      } else {
        report.notes.push('Совместимый кадр, изменения не требуются.');
      }
      return report;
    }

    // Есть блокирующая проблема с размером/форматом кадра — подбираем вариант.
    const candidate = findCompatibleFrame(analysis);
    if (!candidate) {
      report.action = 'keep';
      report.notes.push('Не найдено совместимого кадра, сохраняющего исходное соотношение сторон без растягивания — изменение не применено.');
      return report;
    }

    // Требование 6: избегать повторного кодирования. Все кандидаты, кроме
    // exact-preset с scale==1, требуют реального изменения кадров.
    // Поэтому перекодирование включаем только при явном opt-in engine='ffmpeg'.
    if (candidate.requiresReencode && engine !== 'ffmpeg') {
      report.action = 'recommend';
      report.selected = describeCandidate(candidate, analysis);
      report.recommendation = {
        type: 'manual-reexport',
        instruction: buildExportInstruction(candidate, analysis),
        reason: 'Безперекодировочный pipeline не может изменить геометрию кадров; чтобы не выполнять скрытое повторное кодирование, выбранному варианту соответствует инструкция реэкспорта.'
      };
      report.notes.push('Изменение кадра требует реального масштабирования/паддинга — оно НЕ выполнено автоматически (избегаем повторного кодирования без opt-in).');
      return report;
    }

    // Проверка совместимости кандидата с текущим pipeline (требование 2).
    const pipelineCheck = checkPipelineCompatibility(candidate, analysis, pipeline);
    if (!pipelineCheck.compatible) {
      report.action = 'keep';
      report.notes.push(`Кандидат ${candidate.width}×${candidate.height} отклонён проверкой pipeline: ${pipelineCheck.reason}`);
      return report;
    }

    report.action = engine === 'ffmpeg' && candidate.requiresReencode ? 'reencode' : 'apply';
    report.selected = describeCandidate(candidate, analysis);
    report.qualityComparison = compareQuality(analysis, candidate);
    return report;
  }

  function describeCandidate(candidate, analysis) {
    return {
      width: candidate.width,
      height: candidate.height,
      resolution: `${candidate.width}x${candidate.height}`,
      aspectRatioBefore: `${analysis.aspect.num}:${analysis.aspect.den}`,
      aspectRatioAfter: (() => { const a = aspectRatio(candidate.width, candidate.height); return `${a.num}:${a.den}`; })(),
      kind: candidate.kind,
      pixelRetentionPercent: +(candidate.pixelRetention * 100).toFixed(2),
      linearScale: +candidate.linearScale.toFixed(4),
      requiresReencode: candidate.requiresReencode,
      reencodeMode: candidate.reencodeMode || null,
      stretched: false,
      cropped: false,
      note: candidate.note
    };
  }

  /**
   * Симуляция/проверка прохождения кандидата через текущий pipeline.
   * pipeline.acceptsFrame(w,h) — функция или список ограничений.
   */
  function checkPipelineCompatibility(candidate, analysis, pipeline) {
    if (candidate.stretchRisk) return { compatible: false, reason: 'риск растягивания кадра' };
    if (candidate.width % 2 || candidate.height % 2) return { compatible: false, reason: 'кандидат всё ещё имеет нечётные coded-размеры' };
    if (candidate.width > PLATFORM_LONG_SIDE_LIMIT || candidate.height > PLATFORM_LONG_SIDE_LIMIT) {
      return { compatible: false, reason: 'кадр превышает лимиты контейнера' };
    }
    if (typeof pipeline.acceptsFrame === 'function' && !pipeline.acceptsFrame(candidate.width, candidate.height)) {
      return { compatible: false, reason: 'pipeline отклоняет этот размер кадра' };
    }
    // Aspect drift проверка: candidate должен сохранять пропорции в ≤1%.
    const before = analysis.aspect.value, after = candidate.width / candidate.height;
    if (Math.abs(after / before - 1) > 0.01) return { compatible: false, reason: 'нарушено сохранение соотношения сторон' };
    return { compatible: true, reason: '' };
  }

  /**
   * Сравнение результата по качеству, плавности, совместимости и размеру файла.
   */
  function compareQuality(analysis, candidate) {
    const areaRatio = candidate.pixelRetention;
    // Размер файла при постоянном качестве примерно пропорционален числу пикселей
    // (для scale) или растёт на площадь полей (для pad).
    let fileSizeDelta;
    if (candidate.reencodeMode === 'pad-only') {
      fileSizeDelta = +(1 / Math.max(areaRatio, 0.5) - 1).toFixed(3); // поля добавляют коду немного
    } else {
      fileSizeDelta = +(areaRatio - 1).toFixed(3);
    }
    return {
      quality: candidate.kind === 'pad-to-even'
        ? 'Исходная детализация 100%, добавлены ≤2px симметричные поля — артефактов нет.'
        : `Сохранено ${Math.round(areaRatio * 100)}% площади кадра; ланкастер-масштабирование при ≥95% линейно визуально неотличимо.`,
      smoothness: 'Частота кадров и тайминг не изменяются модулем Smart Resolution — плавность идентична исходнику.',
      compatibility: 'Кадры чётные' + (candidate.width % 16 === 0 && candidate.height % 16 === 0 ? ', кратны сетке 16 px' : '') + '; платформенный транскодер не применяет дополнительные crop/pad фильтры.',
      fileSize: `${fileSizeDelta >= 0 ? '+' : ''}${(fileSizeDelta * 100).toFixed(1)}% относительно исходного при равном качестве`,
      metadataIntegrity: 'Заявленные размеры будут равны фактическим размерам кадров (tkhd == coded == decoded).'
    };
  }

  function buildExportInstruction(candidate, analysis) {
    const vf = candidate.reencodeMode === 'pad-only'
      ? `pad=${candidate.width}:${candidate.height}:(ow-iw)/2:(oh-ih)/2`
      : `scale=${candidate.width}:${candidate.height}:flags=lanczos`;
    return {
      ffmpeg: `ffmpeg -i input.mp4 -vf "${vf}" -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -c:a copy output.mp4`,
      exportSettings: `Реэкспортируйте видео в ${candidate.width}×${candidate.height} (${candidate.note}) с сохранением соотношения сторон ${analysis.aspect.num}:${analysis.aspect.den}; аудио скопируйте без перекодирования.`
    };
  }

  /**
   * Верификация фактических размеров выходного кадра против заявленных
   * (анти-имитация, требование 5). Вызывается после обработки.
   * expected — выбранные Smart Resolution размеры (или исходные при keep).
   */
  function verifyActualFrameSizes(mediaInfo, expected) {
    const problems = [];
    const checks = [
      ['display (tkhd)', mediaInfo.width, mediaInfo.height],
      ...(Array.isArray(mediaInfo.tracks) ? mediaInfo.tracks
        .filter(t => t.handler === 'vide')
        .map(t => [`track #${t.trackId}`, t.width, t.height]) : [])
    ];
    for (const [label, w, h] of checks) {
      if (Math.round(w) !== expected.width || Math.round(h) !== expected.height) {
        problems.push(`${label}: ${Math.round(w)}×${Math.round(h)} ≠ заявленные ${expected.width}×${expected.height}`);
      }
    }
    if (mediaInfo.decodedWidth !== undefined && mediaInfo.decodedHeight !== undefined) {
      if (mediaInfo.decodedWidth !== expected.width || mediaInfo.decodedHeight !== expected.height) {
        problems.push(`декодированный кадр: ${mediaInfo.decodedWidth}×${mediaInfo.decodedHeight} ≠ заявленные ${expected.width}×${expected.height}`);
      }
    }
    return { verified: problems.length === 0, problems };
  }

  return {
    version: VERSION,
    STANDARD_PRESETS,
    analyzeSource,
    findCompatibleFrame,
    decideResolution,
    checkPipelineCompatibility,
    compareQuality,
    verifyActualFrameSizes,
    aspectRatio,
    isPresetExact
  };
});
