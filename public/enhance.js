// INEASY video enhancer: pick a video, pick a style, press "Enhance".
// The whole job runs in this browser (WebCodecs + WebGL). The video is never sent anywhere.
(function () {
  const $ = (id) => document.getElementById(id);
  const MAX_SECONDS = 60;
  const MAX_WORK = 36000; // frames x megapixels, e.g. 60 s of 4K60 or 4 minutes of 1080p30 (capped by MAX_SECONDS)
  const T = {
    ru: {
      nav: 'УЛУЧШЕНИЕ', kicker: 'УЛУЧШЕНИЕ ВИДЕО', title: 'Улучшите качество своего видео',
      lead: 'Выберите видео и стиль, остальное сделаем автоматически: чище картинка, чётче детали, живее цвета. Обработка идёт прямо на вашем устройстве, видео никуда не отправляется.',
      buy: 'Купить', needPro: 'Нужна подписка INEASY Pro', proUntil: (d) => `Подписка до ${d}`,
      dropTitle: 'Выберите видео', dropHint: 'MP4 или MOV', presets: 'Стиль',
      nNatural: 'Естественный', nSharp: 'Чёткий', nVivid: 'Яркий',
      pNatural: 'Чистая картинка и естественные цвета', pSharp: 'Больше чёткости и деталей', pVivid: 'Насыщенные цвета и контраст',
      run: 'Улучшить', runBuy: 'Купить подписку', reading: 'Открываем видео…', stageWork: 'Улучшаем видео', eta: (s) => `Осталось примерно ${s} сек`, cancel: 'Отменить',
      done: 'Готово', after: 'Результат', before: 'Было', download: 'Скачать', again: 'Улучшить другое видео',
      tooLong: (s) => `Видео слишком длинное. Максимум для него: ${s} сек.`,
      lockedHint: 'Улучшение доступно по подписке INEASY Pro.',
      lockTitle: 'Раздел закрыт', lockText: 'Улучшение доступно только по подписке INEASY Pro.',
      err: {
        unsupported: 'Браузер не смог открыть это видео. Обновите Chrome или Safari и попробуйте MP4 или MOV.',
        no_webgl: 'Этот браузер не поддерживает нужное ускорение. Попробуйте Chrome или Safari последней версии.',
        no_webcodecs: 'Этот браузер не умеет обрабатывать видео. Попробуйте Chrome или Safari последней версии.',
        failed: 'Не удалось улучшить видео. Попробуйте ещё раз или другой файл.',
      },
      buyLead: 'Подписка открывает улучшение видео.',
      perks: ['Чище картинка, чётче детали, живее цвета', 'Без дневного лимита', '30 дней доступа', 'Поддержка всегда онлайн'],
      unit: '/ 30 дней', go: 'Купить в Telegram', terms: 'Оплата переводом, чек проверяет человек (1–2 часа). Подписка включится автоматически после подтверждения.',
    },
    en: {
      nav: 'ENHANCE', kicker: 'VIDEO ENHANCER', title: 'Improve the quality of your video',
      lead: 'Pick a video and a style, we do the rest: cleaner picture, sharper details, livelier colour. It runs right on your device and the video is never sent anywhere.',
      buy: 'Buy', needPro: 'INEASY Pro subscription required', proUntil: (d) => `Subscription until ${d}`,
      dropTitle: 'Choose a video', dropHint: 'MP4 or MOV', presets: 'Style',
      nNatural: 'Natural', nSharp: 'Sharp', nVivid: 'Vivid',
      pNatural: 'Clean picture and natural colour', pSharp: 'More sharpness and detail', pVivid: 'Rich colour and contrast',
      run: 'Enhance', runBuy: 'Buy subscription', reading: 'Opening your video…', stageWork: 'Enhancing your video', eta: (s) => `About ${s} s left`, cancel: 'Cancel',
      done: 'Done', after: 'Result', before: 'Before', download: 'Download', again: 'Enhance another video',
      tooLong: (s) => `This video is too long. The maximum for it is ${s} s.`,
      lockedHint: 'Enhancing needs an INEASY Pro subscription.',
      lockTitle: 'Section locked', lockText: 'Enhancing is available with an INEASY Pro subscription only.',
      err: {
        unsupported: 'Your browser could not open this video. Update Chrome or Safari and try an MP4 or MOV.',
        no_webgl: 'This browser lacks the graphics acceleration needed. Try the latest Chrome or Safari.',
        no_webcodecs: 'This browser cannot process video. Try the latest Chrome or Safari.',
        failed: 'Could not enhance the video. Please try again or use another file.',
      },
      buyLead: 'The subscription unlocks video enhancing.',
      perks: ['Cleaner picture, sharper details, livelier colour', 'No daily limit', '30 days of access', 'Support always online'],
      unit: '/ 30 days', go: 'Buy in Telegram', terms: 'Payment by transfer, a person checks the receipt (1–2 hours). The subscription turns on automatically after approval.',
    },
    kk: {
      nav: 'ЖАҚСАРТУ', kicker: 'БЕЙНЕНІ ЖАҚСАРТУ', title: 'Бейнеңіздің сапасын жақсартыңыз',
      lead: 'Бейне мен стильді таңдаңыз, қалғанын өзіміз жасаймыз: таза сурет, анық детальдар, тірі түстер. Өңдеу тікелей құрылғыңызда жүреді, бейне ешқайда жіберілмейді.',
      buy: 'Сатып алу', needPro: 'INEASY Pro жазылымы қажет', proUntil: (d) => `Жазылым ${d} дейін`,
      dropTitle: 'Бейнені таңдаңыз', dropHint: 'MP4 немесе MOV', presets: 'Стиль',
      nNatural: 'Табиғи', nSharp: 'Анық', nVivid: 'Жарқын',
      pNatural: 'Таза сурет және табиғи түстер', pSharp: 'Анығырақ және детальдырақ', pVivid: 'Қанық түстер мен контраст',
      run: 'Жақсарту', runBuy: 'Жазылым сатып алу', reading: 'Бейне ашылуда…', stageWork: 'Бейне жақсартылуда', eta: (s) => `Шамамен ${s} сек қалды`, cancel: 'Бас тарту',
      done: 'Дайын', after: 'Нәтиже', before: 'Бұрын', download: 'Жүктеп алу', again: 'Басқа бейнені жақсарту',
      tooLong: (s) => `Бейне тым ұзақ. Ол үшін ең көбі: ${s} сек.`,
      lockedHint: 'Жақсарту INEASY Pro жазылымымен қолжетімді.',
      lockTitle: 'Бөлім жабық', lockText: 'Жақсарту тек INEASY Pro жазылымымен қолжетімді.',
      err: {
        unsupported: 'Браузер бұл бейнені аша алмады. Chrome немесе Safari жаңартып, MP4 немесе MOV қолданып көріңіз.',
        no_webgl: 'Бұл браузерде қажетті жеделдету жоқ. Chrome немесе Safari соңғы нұсқасын қолданып көріңіз.',
        no_webcodecs: 'Бұл браузер бейнені өңдей алмайды. Chrome немесе Safari соңғы нұсқасын қолданып көріңіз.',
        failed: 'Бейнені жақсарту мүмкін болмады. Қайталап көріңіз немесе басқа файлды қолданыңыз.',
      },
      buyLead: 'Жазылым бейнені жақсартуды ашады.',
      perks: ['Таза сурет, анық детальдар, тірі түстер', 'Күнделікті лимитсіз', '30 күн қолжетімділік', 'Қолдау әрдайым онлайн'],
      unit: '/ 30 күн', go: 'Telegram-да сатып алу', terms: 'Төлем аударым арқылы, чекті адам тексереді (1–2 сағат). Расталғаннан кейін жазылым автоматты түрде қосылады.',
    },
  };

  let status = null;
  let file = null;
  let localUrl = null;
  let clip = null; // { seconds, maxSeconds }
  let preset = 'natural';
  let job = null; // { conversion }
  let resultUrl = null;
  let busy = false;
  let cancelRequested = false;
  let mediabunny = null;

  const lang = () => (T[document.documentElement.lang] ? document.documentElement.lang : 'en');
  const t = () => T[lang()];
  const token = () => { try { return localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token') || ''; } catch (e) { return ''; } };
  const hide = (id, on) => { const n = $(id); if (n) n.classList.toggle('hidden', on); };
  const text = (id, value) => { const n = $(id); if (n) n.textContent = value; };
  const dateText = (ms) => new Date(ms).toLocaleDateString(lang() === 'kk' ? 'kk-KZ' : lang() === 'en' ? 'en-GB' : 'ru-RU', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'long', year: 'numeric' });
  const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
  const active = () => Boolean(status && status.active);
  const tooLong = () => Boolean(clip && clip.seconds > clip.maxSeconds);
  const loadMediabunny = () => { if (!mediabunny) mediabunny = import('/vendor/mediabunny.mjs?v=20261025-local'); return mediabunny; };

  function render() {
    const s = t();
    text('navEnhance', s.nav); text('enhKicker', s.kicker); text('enhTitle', s.title); text('enhLead', s.lead);
    text('enhBuyBtn', s.buy); text('enhLockTitle', s.lockTitle); text('enhLockText', s.lockText); text('enhLockBuy', s.buy);
    $('enhStageBox').classList.toggle('locked', !active());
    hide('enhLock', active()); text('enhPresetsTitle', s.presets); text('enhCancel', s.cancel);
    text('enhDone', s.done); text('enhTabAfter', s.after); text('enhTabBefore', s.before); text('enhDownload', s.download); text('enhAgain', s.again);
    document.querySelectorAll('[data-k]').forEach((n) => { n.textContent = s[n.dataset.k]; });
    $('enhAccess').classList.toggle('on', active());
    text('enhAccessText', active() ? s.proUntil(dateText(status.until)) : s.needPro);
    text('enhDropTitle', file ? file.name : s.dropTitle);
    text('enhDropHint', file ? mb(file.size) : s.dropHint);
    text('enhBuyTitle', 'INEASY Pro'); text('enhBuyLead', s.buyLead); text('enhPriceUnit', s.unit); text('enhBuyGo', s.go); text('enhTerms', s.terms);
    $('enhPerks').replaceChildren(...s.perks.map((p) => { const li = document.createElement('li'); li.textContent = p; return li; }));
    if (status && status.price) text('enhPrice', Number(status.price).toLocaleString('ru-RU'));
    document.querySelectorAll('.enh-preset').forEach((b) => {
      b.classList.toggle('active', b.dataset.preset === preset);
      b.setAttribute('aria-checked', String(b.dataset.preset === preset));
    });
    const note = tooLong() ? s.tooLong(clip.maxSeconds) : (file && !active() ? s.lockedHint : '');
    text('enhWarn', note);
    hide('enhWarn', !note);
    const run = $('enhRun');
    run.textContent = file && !active() ? s.runBuy : s.run;
    run.disabled = busy || !file || (active() && (!clip || tooLong()));
  }

  // The only request this page makes: who is subscribed. No video data is ever sent.
  async function loadStatus() {
    try {
      const res = await fetch('/api/pro/status', { headers: token() ? { Authorization: `Bearer ${token()}` } : {}, cache: 'no-store' });
      if (res.ok) status = await res.json();
    } catch (e) { /* stays locked */ }
    render();
  }

  function showError(code) {
    $('enhError').textContent = t().err[code] || t().err.failed;
    hide('enhError', false);
  }

  function reset() {
    job = null; clip = null; file = null; busy = false;
    if (localUrl) { URL.revokeObjectURL(localUrl); localUrl = null; }
    $('enhFile').value = '';
    $('enhOriginal').removeAttribute('src');
    ['enhOriginalWrap', 'enhUpload', 'enhProgress', 'enhError', 'enhResult', 'enhWarn'].forEach((id) => hide(id, true));
    render();
  }

  function openInput(m, source) {
    return new m.Input({ source: new m.BlobSource(source), formats: m.ALL_FORMATS });
  }

  // Reads the clip's size / FPS / length and checks that this browser can decode it.
  async function analyse(next) {
    if (!window.VideoEncoder || !window.VideoDecoder) throw Object.assign(new Error('no_webcodecs'), { code: 'no_webcodecs' });
    const m = await loadMediabunny();
    const input = openInput(m, next);
    try {
      const track = await input.getPrimaryVideoTrack();
      if (!track || !(await track.canDecode())) throw Object.assign(new Error('unsupported'), { code: 'unsupported' });
      const width = await track.getDisplayWidth();
      const height = await track.getDisplayHeight();
      const seconds = await track.computeDuration();
      const fps = (await track.computePacketStats(120)).averagePacketRate || 30;
      const maxSeconds = Math.min(MAX_SECONDS, Math.floor(MAX_WORK / Math.max(0.001, fps * (width * height) / 1e6)));
      return { width, height, seconds, fps, maxSeconds, bytes: next.size };
    } finally {
      input.dispose?.();
    }
  }

  async function chooseFile(next) {
    reset();
    if (!next) return;
    file = next;
    localUrl = URL.createObjectURL(next);
    $('enhOriginal').src = localUrl;
    hide('enhOriginalWrap', false);
    render();
    busy = true;
    text('enhUploadText', t().reading);
    $('enhUploadBar').classList.add('wait');
    hide('enhUpload', false);
    render();
    try { clip = await analyse(next); } catch (error) { showError(error.code || 'unsupported'); }
    busy = false;
    hide('enhUpload', true);
    render();
  }

  function showProgress(fraction, startedAt) {
    const s = t();
    hide('enhProgress', false);
    const percent = Math.floor(fraction * 100);
    text('enhStage', s.stageWork);
    text('enhPercent', `${percent}%`);
    $('enhBar').classList.remove('wait');
    $('enhBar').firstElementChild.style.width = `${percent}%`;
    const elapsed = (Date.now() - startedAt) / 1000;
    text('enhEta', fraction >= 0.03 ? s.eta(Math.round((elapsed * (1 - fraction)) / fraction)) : '');
  }

  async function run() {
    if (!active()) { hide('enhBuyOverlay', false); return; }
    if (!file || !clip || busy) return;
    busy = true;
    hide('enhError', true);
    hide('enhResult', true);
    render();
    let input = null;
    let frames = null;
    const startedAt = Date.now();
    cancelRequested = false;
    showProgress(0, startedAt);
    try {
      const m = await loadMediabunny();
      input = openInput(m, file);
      frames = window.INEASYEnhanceGL.create(clip.width, clip.height, preset);
      const target = new m.BufferTarget();
      const output = new m.Output({ format: new m.Mp4OutputFormat({ fastStart: 'in-memory' }), target });
      // About the source bitrate plus a little for the added detail; bounded so phones keep up.
      const sourceBitrate = (file.size * 8) / Math.max(1, clip.seconds);
      const conversion = await m.Conversion.init({
        input, output,
        video: {
          codec: 'avc',
          bitrate: Math.min(45e6, Math.max(4e6, Math.round(sourceBitrate * 1.15))),
          forceTranscode: true,
          allowTransformationMetadata: false, // rotation is baked into the frames before the filter runs
          processedWidth: clip.width,
          processedHeight: clip.height,
          process: (sample) => {
            const frame = frames.render(sample.toCanvasImageSource(), sample.microsecondTimestamp, sample.microsecondDuration);
            return new m.VideoSample(frame);
          },
        },
      });
      if (!conversion.isValid) throw Object.assign(new Error('unsupported'), { code: 'unsupported' });
      job = { conversion };
      if (cancelRequested) await conversion.cancel();
      conversion.onProgress = (fraction) => showProgress(Math.max(0, Math.min(1, fraction)), startedAt);
      await conversion.execute();
      const blob = new Blob([target.buffer], { type: 'video/mp4' });
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(blob);
      $('enhDownload').href = resultUrl;
      $('enhDownload').download = `ineasy-enhanced-${(file.name || 'video').replace(/\.[^.]+$/, '')}.mp4`;
      hide('enhProgress', true);
      $('enhTabAfter').click();
      hide('enhResult', false);
    } catch (error) {
      hide('enhProgress', true);
      if (!(error && error.name === 'ConversionCanceledError')) {
        console.error('[INEASY enhance]', error);
        showError(error && error.code ? error.code : (/webgl/i.test(String(error && error.message)) ? 'no_webgl' : 'failed'));
      }
    } finally {
      frames?.close();
      input?.dispose?.();
      job = null;
      busy = false;
      render();
    }
  }

  function cancel() {
    cancelRequested = true; // also covers a click while the video is still being opened
    if (job) job.conversion.cancel();
  }

  const closeBuy = () => hide('enhBuyOverlay', true);

  function init() {
    if (!$('enhanceSection')) return;
    $('enhFile').addEventListener('change', (e) => chooseFile(e.target.files[0]));
    document.querySelectorAll('.enh-preset').forEach((b) => b.addEventListener('click', () => { preset = b.dataset.preset; render(); }));
    $('enhRun').addEventListener('click', run);
    $('enhCancel').addEventListener('click', cancel);
    $('enhAgain').addEventListener('click', reset);
    $('enhBuyBtn').addEventListener('click', () => hide('enhBuyOverlay', false));
    $('enhLockBuy').addEventListener('click', () => hide('enhBuyOverlay', false));
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
