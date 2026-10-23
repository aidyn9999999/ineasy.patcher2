// INEASY video enhancer: pick a video, pick a style, press "Enhance". Everything else is automatic.
(function () {
  const $ = (id) => document.getElementById(id);
  const T = {
    ru: {
      nav: 'УЛУЧШЕНИЕ', kicker: 'УЛУЧШЕНИЕ ВИДЕО', title: 'Улучшите качество своего видео',
      lead: 'Выберите видео и стиль, остальное сделаем автоматически: чище картинка, чётче детали, живее цвета.',
      buy: 'Купить', needPro: 'Нужна подписка INEASY Pro', proUntil: (d) => `Подписка до ${d}`,
      dropTitle: 'Выберите видео', dropHint: 'MP4 или MOV', presets: 'Стиль',
      nNatural: 'Естественный', nSharp: 'Чёткий', nVivid: 'Яркий',
      pNatural: 'Чистая картинка и естественные цвета', pSharp: 'Больше чёткости и деталей', pVivid: 'Насыщенные цвета и контраст',
      run: 'Улучшить', runBuy: 'Купить подписку', uploading: (p) => `Загрузка: ${p}%`, analyzing: 'Готовим видео…',
      stageQueued: (n) => `Ждём очереди: впереди ${n - 1}`, stageWork: 'Улучшаем видео', eta: (s) => `Осталось примерно ${s} сек`, cancel: 'Отменить',
      done: 'Готово', after: 'Результат', before: 'Было', download: 'Скачать', again: 'Улучшить другое видео',
      tooLong: (s) => `Видео слишком длинное. Максимум для него: ${s} сек.`,
      lockedHint: 'Улучшение доступно по подписке INEASY Pro.',
      err: {
        pro_required: 'Нужна подписка INEASY Pro.', video_too_large: 'Файл слишком большой (максимум 300 МБ).',
        enhance_unreadable: 'Не удалось открыть видео. Попробуйте MP4 или MOV.', enhance_duration_unknown: 'Не удалось прочитать видео. Загрузите исходный файл.',
        job_active: 'У вас уже идёт улучшение.', busy: 'Сейчас много заявок. Повторите через минуту.',
        timeout: 'Улучшение заняло слишком много времени. Попробуйте видео покороче.', failed: 'Не удалось улучшить видео. Попробуйте ещё раз.',
        upload_not_found: 'Загрузка устарела, выберите видео ещё раз.', generic: 'Что-то пошло не так. Попробуйте ещё раз.',
      },
      buyLead: 'Подписка открывает улучшение видео.',
      perks: ['Чище картинка, чётче детали, живее цвета', 'Без дневного лимита', '30 дней доступа', 'Поддержка всегда онлайн'],
      unit: '/ 30 дней', go: 'Купить в Telegram', terms: 'Оплата переводом, чек проверяет человек (1–2 часа). Подписка включится автоматически после подтверждения.',
    },
    en: {
      nav: 'ENHANCE', kicker: 'VIDEO ENHANCER', title: 'Improve the quality of your video',
      lead: 'Pick a video and a style, we do the rest: cleaner picture, sharper details, livelier colour.',
      buy: 'Buy', needPro: 'INEASY Pro subscription required', proUntil: (d) => `Subscription until ${d}`,
      dropTitle: 'Choose a video', dropHint: 'MP4 or MOV', presets: 'Style',
      nNatural: 'Natural', nSharp: 'Sharp', nVivid: 'Vivid',
      pNatural: 'Clean picture and natural colour', pSharp: 'More sharpness and detail', pVivid: 'Rich colour and contrast',
      run: 'Enhance', runBuy: 'Buy subscription', uploading: (p) => `Uploading: ${p}%`, analyzing: 'Preparing your video…',
      stageQueued: (n) => `Waiting in line: ${n - 1} ahead`, stageWork: 'Enhancing your video', eta: (s) => `About ${s} s left`, cancel: 'Cancel',
      done: 'Done', after: 'Result', before: 'Before', download: 'Download', again: 'Enhance another video',
      tooLong: (s) => `This video is too long. The maximum for it is ${s} s.`,
      lockedHint: 'Enhancing needs an INEASY Pro subscription.',
      err: {
        pro_required: 'INEASY Pro subscription required.', video_too_large: 'The file is too large (max 300 MB).',
        enhance_unreadable: 'Could not open the video. Try MP4 or MOV.', enhance_duration_unknown: 'Could not read the video. Upload the original file.',
        job_active: 'You already have an enhancement running.', busy: 'Many requests right now. Try again in a minute.',
        timeout: 'Enhancing took too long. Try a shorter video.', failed: 'Could not enhance the video. Please try again.',
        upload_not_found: 'The upload expired, choose the video again.', generic: 'Something went wrong. Please try again.',
      },
      buyLead: 'The subscription unlocks video enhancing.',
      perks: ['Cleaner picture, sharper details, livelier colour', 'No daily limit', '30 days of access', 'Support always online'],
      unit: '/ 30 days', go: 'Buy in Telegram', terms: 'Payment by transfer, a person checks the receipt (1–2 hours). The subscription turns on automatically after approval.',
    },
    kk: {
      nav: 'ЖАҚСАРТУ', kicker: 'БЕЙНЕНІ ЖАҚСАРТУ', title: 'Бейнеңіздің сапасын жақсартыңыз',
      lead: 'Бейне мен стильді таңдаңыз, қалғанын өзіміз жасаймыз: таза сурет, анық детальдар, тірі түстер.',
      buy: 'Сатып алу', needPro: 'INEASY Pro жазылымы қажет', proUntil: (d) => `Жазылым ${d} дейін`,
      dropTitle: 'Бейнені таңдаңыз', dropHint: 'MP4 немесе MOV', presets: 'Стиль',
      nNatural: 'Табиғи', nSharp: 'Анық', nVivid: 'Жарқын',
      pNatural: 'Таза сурет және табиғи түстер', pSharp: 'Анығырақ және детальдырақ', pVivid: 'Қанық түстер мен контраст',
      run: 'Жақсарту', runBuy: 'Жазылым сатып алу', uploading: (p) => `Жүктелуде: ${p}%`, analyzing: 'Бейне дайындалуда…',
      stageQueued: (n) => `Кезекте: алдыңызда ${n - 1}`, stageWork: 'Бейне жақсартылуда', eta: (s) => `Шамамен ${s} сек қалды`, cancel: 'Бас тарту',
      done: 'Дайын', after: 'Нәтиже', before: 'Бұрын', download: 'Жүктеп алу', again: 'Басқа бейнені жақсарту',
      tooLong: (s) => `Бейне тым ұзақ. Ол үшін ең көбі: ${s} сек.`,
      lockedHint: 'Жақсарту INEASY Pro жазылымымен қолжетімді.',
      err: {
        pro_required: 'INEASY Pro жазылымы қажет.', video_too_large: 'Файл тым үлкен (ең көбі 300 МБ).',
        enhance_unreadable: 'Бейнені ашу мүмкін болмады. MP4 немесе MOV қолданып көріңіз.', enhance_duration_unknown: 'Бейнені оқу мүмкін болмады. Түпнұсқа файлды жүктеңіз.',
        job_active: 'Сізде жақсарту жүріп жатыр.', busy: 'Қазір өтінімдер көп. Бір минуттан кейін қайталаңыз.',
        timeout: 'Жақсарту тым ұзақ болды. Қысқарақ бейнені қолданып көріңіз.', failed: 'Бейнені жақсарту мүмкін болмады. Қайталап көріңіз.',
        upload_not_found: 'Жүктеу ескірді, бейнені қайта таңдаңыз.', generic: 'Бірдеңе дұрыс болмады. Қайталап көріңіз.',
      },
      buyLead: 'Жазылым бейнені жақсартуды ашады.',
      perks: ['Таза сурет, анық детальдар, тірі түстер', 'Күнделікті лимитсіз', '30 күн қолжетімділік', 'Қолдау әрдайым онлайн'],
      unit: '/ 30 күн', go: 'Telegram-да сатып алу', terms: 'Төлем аударым арқылы, чекті адам тексереді (1–2 сағат). Расталғаннан кейін жазылым автоматты түрде қосылады.',
    },
  };

  let status = null;
  let file = null;
  let localUrl = null;
  let uploaded = null; // { uploadId, info, limits }
  let preset = 'natural';
  let job = null;
  let resultUrl = null;
  let busy = false;

  const lang = () => (T[document.documentElement.lang] ? document.documentElement.lang : 'en');
  const t = () => T[lang()];
  const token = () => { try { return localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token') || ''; } catch (e) { return ''; } };
  const authHeaders = () => (token() ? { Authorization: `Bearer ${token()}` } : {});
  const hide = (id, on) => { const n = $(id); if (n) n.classList.toggle('hidden', on); };
  const text = (id, value) => { const n = $(id); if (n) n.textContent = value; };
  const dateText = (ms) => new Date(ms).toLocaleDateString(lang() === 'kk' ? 'kk-KZ' : lang() === 'en' ? 'en-GB' : 'ru-RU', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'long', year: 'numeric' });
  const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
  const active = () => Boolean(status && status.active);
  const tooLong = () => Boolean(uploaded && uploaded.info.seconds > uploaded.limits.maxSeconds);

  function render() {
    const s = t();
    text('navEnhance', s.nav); text('enhKicker', s.kicker); text('enhTitle', s.title); text('enhLead', s.lead);
    text('enhBuyBtn', s.buy); text('enhPresetsTitle', s.presets); text('enhCancel', s.cancel);
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
    const note = tooLong() ? s.tooLong(uploaded.limits.maxSeconds) : (file && !active() ? s.lockedHint : '');
    text('enhWarn', note);
    hide('enhWarn', !note);
    const run = $('enhRun');
    run.textContent = file && !active() ? s.runBuy : s.run;
    run.disabled = busy || !file || (active() && (!uploaded || tooLong()));
  }

  async function loadStatus() {
    try {
      const res = await fetch('/api/pro/status', { headers: authHeaders(), cache: 'no-store' });
      if (res.ok) status = await res.json();
    } catch (e) { /* stays locked */ }
    render();
  }

  function showError(code) {
    $('enhError').textContent = t().err[code] || t().err.generic;
    hide('enhError', false);
  }

  function reset() {
    if (job) { clearInterval(job.timer); job = null; }
    uploaded = null; file = null; busy = false;
    if (localUrl) { URL.revokeObjectURL(localUrl); localUrl = null; }
    $('enhFile').value = '';
    $('enhOriginal').removeAttribute('src');
    ['enhOriginalWrap', 'enhUpload', 'enhProgress', 'enhError', 'enhResult', 'enhWarn'].forEach((id) => hide(id, true));
    render();
  }

  function sendUpload(next) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/enhance/upload');
      xhr.responseType = 'json';
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      Object.entries(authHeaders()).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        $('enhUploadBar').firstElementChild.style.width = `${percent}%`;
        text('enhUploadText', t().uploading(percent));
      };
      xhr.upload.onload = () => { $('enhUploadBar').classList.add('wait'); text('enhUploadText', t().analyzing); };
      xhr.onerror = () => reject({ error: 'generic' });
      xhr.onload = () => (xhr.status === 200 ? resolve(xhr.response) : reject(xhr.response || { error: 'generic' }));
      xhr.send(next);
    });
  }

  async function chooseFile(next) {
    reset();
    if (!next) return;
    file = next;
    localUrl = URL.createObjectURL(next);
    $('enhOriginal').src = localUrl;
    hide('enhOriginalWrap', false);
    render();
    if (!active()) return;
    $('enhUploadBar').classList.remove('wait');
    $('enhUploadBar').firstElementChild.style.width = '0';
    hide('enhUpload', false);
    busy = true;
    render();
    try { uploaded = await sendUpload(next); } catch (body) { showError(body.error); }
    busy = false;
    hide('enhUpload', true);
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

  function finish() {
    clearInterval(job.timer);
    const id = job.id;
    hide('enhProgress', true);
    fetch(`/api/enhance/jobs/${id}/result`, { headers: authHeaders() }).then((r) => r.blob()).then((blob) => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(blob);
      $('enhDownload').href = resultUrl;
      $('enhDownload').download = `ineasy-enhanced-${(file ? file.name : 'video').replace(/\.[^.]+$/, '')}.mp4`;
      $('enhTabAfter').click();
      hide('enhResult', false);
    });
    busy = false;
    render();
  }

  async function run() {
    if (!active()) { hide('enhBuyOverlay', false); return; }
    if (!uploaded || busy) return;
    busy = true;
    hide('enhError', true);
    hide('enhResult', true);
    render();
    try {
      const started = await api('POST', '/api/enhance/jobs', { uploadId: uploaded.uploadId, preset });
      job = { id: started.id, timer: null };
      showProgress({ status: 'queued', percent: 0, position: 1 });
      job.timer = setInterval(async () => {
        try {
          const state = await api('GET', `/api/enhance/jobs/${started.id}`);
          if (state.status === 'done') return finish();
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
      showError(body.error);
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

  const closeBuy = () => hide('enhBuyOverlay', true);

  function init() {
    if (!$('enhanceSection')) return;
    $('enhFile').addEventListener('change', (e) => chooseFile(e.target.files[0]));
    document.querySelectorAll('.enh-preset').forEach((b) => b.addEventListener('click', () => { preset = b.dataset.preset; render(); }));
    $('enhRun').addEventListener('click', run);
    $('enhCancel').addEventListener('click', cancel);
    $('enhAgain').addEventListener('click', reset);
    $('enhBuyBtn').addEventListener('click', () => hide('enhBuyOverlay', false));
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
