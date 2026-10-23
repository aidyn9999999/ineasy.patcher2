// INEASY quality enhancer: file analysis, presets, real progress, before/after, buy panel.
(function () {
  const $ = (id) => document.getElementById(id);
  const T = {
    ru: {
      nav: 'УЛУЧШЕНИЕ', kicker: 'УЛУЧШАТЕЛЬ КАЧЕСТВА', title: 'Улучшите качество своего видео',
      lead: 'Шумоподавление, чёткость, локальный контраст и насыщенность. Результат сохраняется отдельным файлом, оригинал не меняется.',
      buy: 'Купить', needPro: 'Нужна подписка INEASY Pro', proUntil: (d) => `Подписка до ${d}`,
      dropTitle: 'Выберите видео', dropHint: 'MP4 или MOV', presets: 'Пресет', settings: 'Настройки',
      strength: 'Сила улучшения', saturation: 'Насыщенность',
      pNatural: 'Естественные цвета, лёгкое шумоподавление', pSharp: 'Больше чёткости, меньше шума', pVivid: 'Насыщеннее цвета и контраст, без кислоты',
      pRestore: 'Нейросетевое восстановление: пока недоступно (нужен GPU-сервер)', pHdr: 'Сохраняет HDR (только для HDR-видео)',
      note: 'Применяются шумоподавление, чёткость, контраст и цвет. Это не нейросеть: AI-восстановление деталей будет доступно после подключения GPU. Видео перекодируется, звук сохраняется. Для TikTok дальше обработайте файл в Patcher.',
      run: 'Улучшить качество', runBuy: 'Купить подписку', uploading: (p) => `Загрузка: ${p}%`, analyzing: 'Анализ видео…',
      stageQueued: (n) => `В очереди, перед вами: ${n - 1}`, stageWork: 'Улучшаем видео', eta: (s) => `Осталось примерно ${s} сек`, cancel: 'Отменить',
      done: 'Готово', after: 'Результат', before: 'Оригинал', download: 'Скачать', again: 'Улучшить другое видео',
      res: 'Разрешение', fps: 'FPS', dur: 'Длительность', codec: 'Кодек', color: 'Цвет', size: 'Размер', audio: 'Звук', yes: 'есть', no: 'нет',
      vfr: 'переменный', sec: 'сек', fpsKept: 'FPS сохранён', fpsChanged: 'FPS изменился',
      times: (u, a, e, t) => `Загрузка ${u} · анализ ${a} · улучшение ${e} · всего ${t}`,
      afterNote: 'Результат перекодирован. Для публикации в TikTok пропустите этот файл через Patcher.',
      hdrToSdr: 'HDR будет переведён в стандартные цвета (SDR). Чтобы сохранить HDR, выберите HDR Preserve.',
      bits10: 'Исходник 10-bit: результат будет 8-bit.', vfrWarn: 'Переменная частота кадров: тайминг кадров сохраняется без изменений.',
      tooLong: (s) => `Для быстрой обработки видео должно быть не длиннее ${s} сек при таком разрешении и FPS.`,
      lockedHint: 'Загрузка и обработка доступны по подписке INEASY Pro.',
      err: {
        pro_required: 'Нужна подписка INEASY Pro.', video_too_large: 'Файл слишком большой (максимум 300 МБ).',
        enhance_unreadable: 'Не удалось прочитать видео. Попробуйте MP4 или MOV.', enhance_duration_unknown: 'Не удалось определить длительность. Загрузите исходное видео.',
        ai_unavailable: 'AI-восстановление пока недоступно: нужен GPU-сервер.', hdr_source_required: 'HDR Preserve работает только с HDR-видео.',
        nothing_to_do: 'Включите силу улучшения или насыщенность.', job_active: 'У вас уже идёт обработка.', busy: 'Сейчас много заявок. Повторите через минуту.',
        timeout: 'Обработка заняла слишком много времени. Попробуйте более короткое видео.', failed: 'Не удалось улучшить видео. Попробуйте ещё раз.',
        upload_not_found: 'Загрузка устарела, выберите видео ещё раз.', generic: 'Не удалось выполнить операцию. Попробуйте ещё раз.',
      },
      buyLead: 'Подписка открывает улучшатель качества видео.',
      perks: ['Шумоподавление, чёткость, контраст и насыщенность', 'Без дневного лимита улучшений', '30 дней доступа', 'Поддержка всегда онлайн'],
      unit: '/ 30 дней', go: 'Купить в Telegram', terms: 'Оплата переводом, чек проверяет человек (1–2 часа). Подписка включится автоматически после подтверждения.',
    },
    en: {
      nav: 'ENHANCE', kicker: 'QUALITY ENHANCER', title: 'Improve the quality of your video',
      lead: 'Denoise, sharpness, local contrast and saturation. The result is saved as a separate file; your original stays untouched.',
      buy: 'Buy', needPro: 'INEASY Pro subscription required', proUntil: (d) => `Subscription until ${d}`,
      dropTitle: 'Choose a video', dropHint: 'MP4 or MOV', presets: 'Preset', settings: 'Settings',
      strength: 'Enhancement strength', saturation: 'Saturation',
      pNatural: 'Natural colour, light denoise', pSharp: 'More sharpness, less noise', pVivid: 'Richer colour and contrast, not garish',
      pRestore: 'Neural restoration: not available yet (needs a GPU server)', pHdr: 'Keeps HDR (HDR videos only)',
      note: 'Denoise, sharpness, contrast and colour are applied. This is not a neural network: AI detail restoration comes once a GPU is connected. The video is re-encoded, audio is kept. For TikTok, run the file through the Patcher afterwards.',
      run: 'Enhance quality', runBuy: 'Buy subscription', uploading: (p) => `Uploading: ${p}%`, analyzing: 'Analysing video…',
      stageQueued: (n) => `Queued, ahead of you: ${n - 1}`, stageWork: 'Enhancing video', eta: (s) => `About ${s} s left`, cancel: 'Cancel',
      done: 'Done', after: 'Result', before: 'Original', download: 'Download', again: 'Enhance another video',
      res: 'Resolution', fps: 'FPS', dur: 'Duration', codec: 'Codec', color: 'Colour', size: 'Size', audio: 'Audio', yes: 'yes', no: 'no',
      vfr: 'variable', sec: 's', fpsKept: 'FPS kept', fpsChanged: 'FPS changed',
      times: (u, a, e, t) => `Upload ${u} · analysis ${a} · enhancing ${e} · total ${t}`,
      afterNote: 'The result is re-encoded. To publish on TikTok, run this file through the Patcher.',
      hdrToSdr: 'HDR will be converted to standard colour (SDR). Choose HDR Preserve to keep HDR.',
      bits10: 'The source is 10-bit: the result will be 8-bit.', vfrWarn: 'Variable frame rate: frame timing is kept as is.',
      tooLong: (s) => `For fast processing the video must be at most ${s} s at this resolution and FPS.`,
      lockedHint: 'Upload and processing need an INEASY Pro subscription.',
      err: {
        pro_required: 'INEASY Pro subscription required.', video_too_large: 'The file is too large (max 300 MB).',
        enhance_unreadable: 'Could not read the video. Try MP4 or MOV.', enhance_duration_unknown: 'Could not detect the duration. Upload the original video.',
        ai_unavailable: 'AI restoration is not available yet: a GPU server is needed.', hdr_source_required: 'HDR Preserve works with HDR videos only.',
        nothing_to_do: 'Turn on enhancement strength or saturation.', job_active: 'You already have a job running.', busy: 'Many requests right now. Try again in a minute.',
        timeout: 'Processing took too long. Try a shorter video.', failed: 'Could not enhance the video. Please try again.',
        upload_not_found: 'The upload expired, choose the video again.', generic: 'The operation failed. Please try again.',
      },
      buyLead: 'The subscription unlocks the video quality enhancer.',
      perks: ['Denoise, sharpness, contrast and saturation', 'No daily limit on enhancements', '30 days of access', 'Support always online'],
      unit: '/ 30 days', go: 'Buy in Telegram', terms: 'Payment by transfer, a person checks the receipt (1–2 hours). The subscription turns on automatically after approval.',
    },
    kk: {
      nav: 'ЖАҚСАРТУ', kicker: 'САПАНЫ ЖАҚСАРТҚЫШ', title: 'Бейнеңіздің сапасын жақсартыңыз',
      lead: 'Шуды азайту, анықтық, жергілікті контраст және қанықтық. Нәтиже бөлек файлға сақталады, түпнұсқа өзгермейді.',
      buy: 'Сатып алу', needPro: 'INEASY Pro жазылымы қажет', proUntil: (d) => `Жазылым ${d} дейін`,
      dropTitle: 'Бейнені таңдаңыз', dropHint: 'MP4 немесе MOV', presets: 'Пресет', settings: 'Баптаулар',
      strength: 'Жақсарту күші', saturation: 'Қанықтық',
      pNatural: 'Табиғи түстер, жеңіл шуды азайту', pSharp: 'Анығырақ, шуы аз', pVivid: 'Қанық түстер мен контраст, артық емес',
      pRestore: 'Нейрожелілік қалпына келтіру: әзірге қолжетімсіз (GPU сервер қажет)', pHdr: 'HDR сақтайды (тек HDR бейне)',
      note: 'Шуды азайту, анықтық, контраст және түс қолданылады. Бұл нейрожелі емес: AI қалпына келтіру GPU қосылғаннан кейін болады. Бейне қайта кодталады, дыбыс сақталады. TikTok үшін файлды кейін Patcher арқылы өткізіңіз.',
      run: 'Сапаны жақсарту', runBuy: 'Жазылым сатып алу', uploading: (p) => `Жүктелуде: ${p}%`, analyzing: 'Бейне талдануда…',
      stageQueued: (n) => `Кезекте, алдыңызда: ${n - 1}`, stageWork: 'Бейне жақсартылуда', eta: (s) => `Шамамен ${s} сек қалды`, cancel: 'Бас тарту',
      done: 'Дайын', after: 'Нәтиже', before: 'Түпнұсқа', download: 'Жүктеп алу', again: 'Басқа бейнені жақсарту',
      res: 'Ажыратымдылық', fps: 'FPS', dur: 'Ұзақтығы', codec: 'Кодек', color: 'Түс', size: 'Өлшемі', audio: 'Дыбыс', yes: 'бар', no: 'жоқ',
      vfr: 'ауыспалы', sec: 'сек', fpsKept: 'FPS сақталды', fpsChanged: 'FPS өзгерді',
      times: (u, a, e, t) => `Жүктеу ${u} · талдау ${a} · жақсарту ${e} · барлығы ${t}`,
      afterNote: 'Нәтиже қайта кодталған. TikTok-қа жариялау үшін файлды Patcher арқылы өткізіңіз.',
      hdrToSdr: 'HDR стандартты түске (SDR) ауыстырылады. HDR сақтау үшін HDR Preserve таңдаңыз.',
      bits10: 'Бастапқы 10-bit: нәтиже 8-bit болады.', vfrWarn: 'Ауыспалы кадр жиілігі: кадр уақыты өзгеріссіз сақталады.',
      tooLong: (s) => `Жылдам өңдеу үшін бейне осы ажыратымдылық пен FPS-те ${s} сек-тан ұзақ болмауы керек.`,
      lockedHint: 'Жүктеу мен өңдеу INEASY Pro жазылымымен қолжетімді.',
      err: {
        pro_required: 'INEASY Pro жазылымы қажет.', video_too_large: 'Файл тым үлкен (ең көбі 300 МБ).',
        enhance_unreadable: 'Бейнені оқу мүмкін болмады. MP4 немесе MOV қолданып көріңіз.', enhance_duration_unknown: 'Ұзақтығын анықтау мүмкін болмады. Түпнұсқа бейнені жүктеңіз.',
        ai_unavailable: 'AI қалпына келтіру әзірге қолжетімсіз: GPU сервер қажет.', hdr_source_required: 'HDR Preserve тек HDR бейнемен жұмыс істейді.',
        nothing_to_do: 'Жақсарту күшін немесе қанықтықты қосыңыз.', job_active: 'Сізде өңдеу жүріп жатыр.', busy: 'Қазір өтінімдер көп. Бір минуттан кейін қайталаңыз.',
        timeout: 'Өңдеу тым ұзақ болды. Қысқарақ бейнені қолданып көріңіз.', failed: 'Бейнені жақсарту мүмкін болмады. Қайталап көріңіз.',
        upload_not_found: 'Жүктеу ескірді, бейнені қайта таңдаңыз.', generic: 'Әрекет орындалмады. Қайталап көріңіз.',
      },
      buyLead: 'Жазылым бейне сапасын жақсартқышты ашады.',
      perks: ['Шуды азайту, анықтық, контраст және қанықтық', 'Жақсартуға күнделікті лимит жоқ', '30 күн қолжетімділік', 'Қолдау әрдайым онлайн'],
      unit: '/ 30 күн', go: 'Telegram-да сатып алу', terms: 'Төлем аударым арқылы, чекті адам тексереді (1–2 сағат). Расталғаннан кейін жазылым автоматты түрде қосылады.',
    },
  };
  const PRESET_SAT = { natural: 5, sharp: 5, vivid: 18, hdr: 0 };

  let status = null;
  let file = null;
  let localUrl = null;
  let uploaded = null; // { uploadId, info, limits, presets, timings }
  let clientInfo = null;
  let preset = 'natural';
  let job = null; // { id, timer }
  let uploadMs = 0;
  let resultUrl = null;
  let busy = false;

  const lang = () => (T[document.documentElement.lang] ? document.documentElement.lang : 'en');
  const t = () => T[lang()];
  const token = () => { try { return localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token') || ''; } catch (e) { return ''; } };
  const authHeaders = () => (token() ? { Authorization: `Bearer ${token()}` } : {});
  const hide = (id, on) => { const n = $(id); if (n) n.classList.toggle('hidden', on); };
  const text = (id, value) => { const n = $(id); if (n) n.textContent = value; };
  const locale = () => (lang() === 'kk' ? 'kk-KZ' : lang() === 'en' ? 'en-GB' : 'ru-RU');
  const dateText = (ms) => new Date(ms).toLocaleDateString(locale(), { timeZone: 'Asia/Almaty', day: 'numeric', month: 'long', year: 'numeric' });
  const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
  const secs = (ms) => `${(ms / 1000).toFixed(1)} ${t().sec}`;
  const active = () => Boolean(status && status.active);
  const info = () => (uploaded ? uploaded.info : null);

  function row(label, value) {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = value;
    wrap.append(dt, dd);
    return wrap;
  }

  function showInfo() {
    const box = $('enhInfo');
    box.replaceChildren();
    const s = t();
    const i = info();
    if (i) {
      box.append(
        row(s.res, `${i.width}×${i.height}`), row(s.fps, `${i.fps}${i.vfr ? ' (' + s.vfr + ')' : ''}`), row(s.dur, `${i.seconds} ${s.sec}`),
        row(s.codec, `${i.codec}${i.profile ? ' · ' + i.profile : ''}`), row(s.color, `${i.hdr} · ${i.bits}-bit`), row(s.size, mb(i.bytes)),
      );
    } else if (clientInfo) {
      box.append(row(s.res, clientInfo.res), row(s.dur, clientInfo.dur), row(s.size, mb(file.size)));
    }
    hide('enhInfo', !(i || clientInfo));
  }

  function warnings() {
    const s = t();
    const i = info();
    const list = [];
    if (i) {
      const limit = preset === 'hdr' ? uploaded.limits.maxSecondsHdrPreserve : uploaded.limits.maxSeconds;
      if (i.seconds > limit) list.push(s.tooLong(limit));
      if (i.hdr !== 'SDR' && preset !== 'hdr') list.push(s.hdrToSdr);
      if (i.hdr === 'SDR' && i.bits > 8) list.push(s.bits10);
      if (i.vfr) list.push(s.vfrWarn);
    }
    if (file && !active()) list.push(s.lockedHint);
    $('enhWarn').textContent = list.join(' ');
    hide('enhWarn', list.length === 0);
    return list;
  }

  function render() {
    const s = t();
    text('navEnhance', s.nav); text('enhKicker', s.kicker); text('enhTitle', s.title); text('enhLead', s.lead);
    text('enhBuyBtn', s.buy); text('enhPresetsTitle', s.presets); text('enhSettingsTitle', s.settings);
    text('enhStrengthLabel', s.strength); text('enhSatLabel', s.saturation); text('enhNote', s.note); text('enhCancel', s.cancel);
    text('enhDone', s.done); text('enhTabAfter', s.after); text('enhTabBefore', s.before); text('enhDownload', s.download); text('enhAgain', s.again);
    text('enhAfterNote', s.afterNote);
    document.querySelectorAll('[data-k]').forEach((n) => { n.textContent = s[n.dataset.k]; });
    $('enhAccess').classList.toggle('on', active());
    text('enhAccessText', active() ? s.proUntil(dateText(status.until)) : s.needPro);
    text('enhDropTitle', file ? file.name : s.dropTitle);
    text('enhDropHint', file ? mb(file.size) : s.dropHint);
    // buy panel
    text('enhBuyTitle', 'INEASY Pro'); text('enhBuyLead', s.buyLead); text('enhPriceUnit', s.unit); text('enhBuyGo', s.go); text('enhTerms', s.terms);
    $('enhPerks').replaceChildren(...s.perks.map((p) => { const li = document.createElement('li'); li.textContent = p; return li; }));
    if (status && status.price) text('enhPrice', Number(status.price).toLocaleString('ru-RU'));
    // presets availability
    const hdrOk = Boolean(uploaded && uploaded.presets.hdr.available);
    document.querySelectorAll('.enh-preset').forEach((b) => {
      const p = b.dataset.preset;
      const disabled = p === 'restore' || (p === 'hdr' && !hdrOk);
      b.setAttribute('aria-disabled', String(disabled));
      b.classList.toggle('active', p === preset);
      b.setAttribute('aria-checked', String(p === preset));
    });
    text('enhStrengthOut', `${$('enhStrength').value}%`);
    text('enhSatOut', `+${$('enhSat').value}%`);
    showInfo();
    const list = warnings();
    const tooLong = Boolean(info() && list.includes(s.tooLong(preset === 'hdr' ? uploaded.limits.maxSecondsHdrPreserve : uploaded.limits.maxSeconds)));
    const run = $('enhRun');
    run.textContent = file && !active() ? s.runBuy : s.run;
    run.disabled = busy || !file || (active() && (!uploaded || tooLong));
  }

  async function loadStatus() {
    try {
      const res = await fetch('/api/pro/status', { headers: authHeaders(), cache: 'no-store' });
      if (res.ok) status = await res.json();
    } catch (e) { /* stays locked */ }
    render();
  }

  function showError(code, extra) {
    const m = t().err[code] || t().err.generic;
    $('enhError').textContent = typeof m === 'function' ? m(extra) : m;
    hide('enhError', false);
  }

  function reset() {
    if (job) { clearInterval(job.timer); job = null; }
    uploaded = null; clientInfo = null; file = null; busy = false;
    if (localUrl) { URL.revokeObjectURL(localUrl); localUrl = null; }
    $('enhFile').value = '';
    $('enhOriginal').removeAttribute('src');
    ['enhInfo', 'enhOriginalWrap', 'enhUpload', 'enhProgress', 'enhError', 'enhResult', 'enhWarn'].forEach((id) => hide(id, true));
    render();
  }

  function readLocal(next) {
    clientInfo = null;
    localUrl = URL.createObjectURL(next);
    const video = $('enhOriginal');
    video.src = localUrl;
    hide('enhOriginalWrap', false);
    video.onloadedmetadata = () => {
      clientInfo = { res: `${video.videoWidth}×${video.videoHeight}`, dur: `${video.duration.toFixed(1)} ${t().sec}` };
      render();
    };
  }

  function sendUpload(next) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/enhance/upload');
      xhr.responseType = 'json';
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      Object.entries(authHeaders()).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      const started = Date.now();
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        $('enhUploadBar').firstElementChild.style.width = `${percent}%`;
        text('enhUploadText', t().uploading(percent));
      };
      xhr.upload.onload = () => { uploadMs = Date.now() - started; $('enhUploadBar').classList.add('wait'); text('enhUploadText', t().analyzing); };
      xhr.onerror = () => reject({ error: 'generic' });
      xhr.onload = () => (xhr.status === 200 ? resolve(xhr.response) : reject(xhr.response || { error: 'generic' }));
      xhr.send(next);
    });
  }

  async function chooseFile(next) {
    reset();
    if (!next) return;
    file = next;
    readLocal(next);
    render();
    if (!active()) return;
    $('enhUploadBar').classList.remove('wait');
    $('enhUploadBar').firstElementChild.style.width = '0';
    hide('enhUpload', false);
    busy = true;
    render();
    try {
      uploaded = await sendUpload(next);
      if (uploaded.info.hdr !== 'SDR') preset = preset === 'hdr' ? 'hdr' : preset;
    } catch (body) {
      showError(body.error, body.maxSeconds);
    }
    busy = false;
    hide('enhUpload', true);
    render();
  }

  function selectPreset(p) {
    if (p === 'restore' || (p === 'hdr' && !(uploaded && uploaded.presets.hdr.available))) return;
    preset = p;
    $('enhStrength').value = 25;
    $('enhSat').value = PRESET_SAT[p];
    render();
  }

  async function api(method, path, body) {
    const res = await fetch(path, { method, headers: { ...authHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw json;
    return json;
  }

  function showProgress(state) {
    const s = t();
    hide('enhProgress', false);
    const queued = state.status === 'queued';
    text('enhStage', queued ? s.stageQueued(state.position || 1) : s.stageWork);
    text('enhPercent', queued ? '' : `${Math.floor(state.percent)}%`);
    $('enhBar').classList.toggle('wait', queued);
    $('enhBar').firstElementChild.style.width = queued ? '' : `${state.percent}%`;
    text('enhEta', state.etaSeconds !== undefined ? s.eta(state.etaSeconds) : '');
  }

  function finish(state) {
    const s = t();
    clearInterval(job.timer);
    const id = job.id;
    hide('enhProgress', true);
    fetch(`/api/enhance/jobs/${id}/result`, { headers: authHeaders() }).then((r) => r.blob()).then((blob) => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(blob);
      $('enhResultVideo').src = resultUrl;
      $('enhDownload').href = resultUrl;
      $('enhDownload').download = `ineasy-enhanced-${(file ? file.name : 'video').replace(/\.[^.]+$/, '')}.mp4`;
      $('enhTabAfter').click();
    });
    const b = state.before; const a = state.after;
    const table = $('enhCompare');
    table.replaceChildren();
    const head = table.insertRow();
    ['', s.before, s.after].forEach((h) => { const th = document.createElement('th'); th.textContent = h; head.append(th); });
    [[s.res, `${b.width}×${b.height}`, `${a.width}×${a.height}`], [s.fps, `${b.fps}`, `${a.fps}`], [s.codec, b.codec, a.codec],
      [s.color, `${b.hdr} · ${b.bits}-bit`, `${a.hdr} · ${a.bits}-bit`], [s.dur, `${b.seconds} ${s.sec}`, `${a.seconds} ${s.sec}`],
      [s.size, mb(b.bytes), mb(a.bytes)], [s.audio, b.audio ? b.audio : s.no, a.audio ? a.audio : s.no]].forEach((cells) => {
      const tr = table.insertRow();
      cells.forEach((c, n) => { const cell = tr.insertCell(); cell.textContent = c; if (n === 0) cell.style.color = 'var(--text-3)'; });
    });
    const fpsOk = Math.abs(a.fps - b.fps) < 0.01;
    const tm = state.timings;
    text('enhTimes', `${s.times(secs(uploadMs), secs(tm.analyzeMs), secs(tm.enhanceMs), secs(tm.totalMs + uploadMs))} · ${fpsOk ? s.fpsKept : s.fpsChanged}`);
    hide('enhResult', false);
    busy = false;
    render();
  }

  async function run() {
    if (!active()) { openBuy(); return; }
    if (!uploaded || busy) return;
    busy = true;
    hide('enhError', true);
    hide('enhResult', true);
    render();
    try {
      const started = await api('POST', '/api/enhance/jobs', { uploadId: uploaded.uploadId, preset, strength: Number($('enhStrength').value), saturation: Number($('enhSat').value) });
      job = { id: started.id, timer: null };
      showProgress({ status: 'queued', percent: 0, position: 1 });
      job.timer = setInterval(async () => {
        try {
          const state = await api('GET', `/api/enhance/jobs/${started.id}`);
          if (state.status === 'done') return finish(state);
          if (state.status === 'error' || state.status === 'cancelled') {
            clearInterval(job.timer); hide('enhProgress', true); busy = false;
            if (state.status === 'error') showError(state.error || 'failed');
            uploaded = null; render();
            return undefined;
          }
          return showProgress(state);
        } catch (e) { return undefined; }
      }, 700);
    } catch (body) {
      busy = false;
      showError(body.error, body.maxSeconds);
      render();
    }
  }

  async function cancel() {
    if (!job) return;
    clearInterval(job.timer);
    try { await api('DELETE', `/api/enhance/jobs/${job.id}`); } catch (e) { /* already finished */ }
    job = null; busy = false; uploaded = null;
    hide('enhProgress', true);
    render();
  }

  function openBuy() { hide('enhBuyOverlay', false); }
  function closeBuy() { hide('enhBuyOverlay', true); }

  function init() {
    if (!$('enhanceSection')) return;
    $('enhFile').addEventListener('change', (e) => chooseFile(e.target.files[0]));
    document.querySelectorAll('.enh-preset').forEach((b) => b.addEventListener('click', () => selectPreset(b.dataset.preset)));
    ['enhStrength', 'enhSat'].forEach((id) => $(id).addEventListener('input', render));
    $('enhRun').addEventListener('click', run);
    $('enhCancel').addEventListener('click', cancel);
    $('enhAgain').addEventListener('click', reset);
    $('enhBuyBtn').addEventListener('click', openBuy);
    $('enhBuyClose').addEventListener('click', closeBuy);
    $('enhBuyOverlay').addEventListener('click', (e) => { if (e.target === $('enhBuyOverlay')) closeBuy(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBuy(); });
    $('enhBuyGo').addEventListener('click', () => window.open((status && status.buyUrl) || 'https://t.me/ineasybot?start=pro', '_blank', 'noopener'));
    $('enhTabAfter').addEventListener('click', () => { $('enhResultVideo').src = resultUrl || ''; $('enhTabAfter').classList.add('active'); $('enhTabBefore').classList.remove('active'); });
    $('enhTabBefore').addEventListener('click', () => { if (localUrl) $('enhResultVideo').src = localUrl; $('enhTabBefore').classList.add('active'); $('enhTabAfter').classList.remove('active'); });
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    render();
    loadStatus();
  }
  init();
})();
