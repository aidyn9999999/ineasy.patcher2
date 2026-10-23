// INEASY Pro: the subscription card under the patcher and the subscription page.
(function () {
  const $ = (id) => document.getElementById(id);
  const MAX_MB = 300;
  const T = {
    ru: {
      cardSub: 'Улучшение видео для TikTok',
      lockedTitle: 'У вас нет прав', lockedText: 'Этот патчер доступен только по подписке INEASY Pro.',
      buy: 'Купить подписку',
      left: (n, d) => `Сегодня осталось: ${n} из ${d}`, until: (d) => `Подписка до ${d}`,
      dropTitle: 'Выберите видео', dropHint: 'MP4 или MOV', run: 'Улучшить видео',
      uploading: (p) => `Загрузка: ${p}%`, enhancing: 'Улучшаем видео… обычно до 1–2 минут',
      done: 'Готово! Видео улучшено', download: 'Скачать', another: 'Улучшить другое видео',
      pageA: 'Улучшение видео для ', pageB: 'TikTok',
      lead: 'Загрузите ролик и получите чёткое, яркое видео, готовое к публикации.',
      perk1: '5 видео бесплатно каждый день', perk2: '30 дней подписки', perk3: 'Поддержка всегда онлайн',
      f1: 'Чёткость', f1t: 'Видео становится резче: детали, текст и края выглядят чище.',
      f2: 'Насыщенность', f2t: 'Живые цвета и контраст без перегруза.',
      f3: 'Готово для TikTok', f3t: 'Файл сразу готов к публикации: разрешение и 60 FPS сохраняются.',
      note: 'Никаких настроек: загрузили видео и получили результат.',
      unit: '/ 30 дней', active: (d) => `Подписка активна до ${d}`, pageBuy: 'Купить подписку',
      err: {
        pro_required: 'Нужна подписка INEASY Pro.',
        no_pro_balance: 'Лимит на сегодня закончился. Баланс обновится завтра в 07:00 по Астане.',
        pro_video_too_long: (s) => `Для быстрого улучшения видео должно быть не длиннее ${s} сек.`,
        video_too_large: `Файл слишком большой (максимум ${MAX_MB} МБ).`,
        pro_busy: 'Сейчас много заявок. Повторите через минуту.',
        pro_unreadable: 'Не удалось прочитать видео. Попробуйте MP4 или MOV.',
        pro_duration_unknown: 'Загрузите исходное видео, а не уже обработанный файл.',
        generic: 'Не удалось улучшить видео. Лимит не списан, попробуйте ещё раз.',
      },
    },
    en: {
      cardSub: 'Video enhancement for TikTok',
      lockedTitle: 'You do not have access', lockedText: 'This patcher is available with an INEASY Pro subscription only.',
      buy: 'Buy subscription',
      left: (n, d) => `Left today: ${n} of ${d}`, until: (d) => `Subscription until ${d}`,
      dropTitle: 'Choose a video', dropHint: 'MP4 or MOV', run: 'Enhance video',
      uploading: (p) => `Uploading: ${p}%`, enhancing: 'Enhancing your video… usually up to 1–2 minutes',
      done: 'Done! Your video is enhanced', download: 'Download', another: 'Enhance another video',
      pageA: 'Video enhancement for ', pageB: 'TikTok',
      lead: 'Upload your clip and get a sharp, vivid video that is ready to publish.',
      perk1: '5 free videos every day', perk2: '30 days of access', perk3: 'Support always online',
      f1: 'Sharpness', f1t: 'The video gets crisper: details, text and edges look cleaner.',
      f2: 'Rich colour', f2t: 'Lively colours and contrast without overdoing it.',
      f3: 'Ready for TikTok', f3t: 'The file is ready to publish: resolution and 60 FPS are kept.',
      note: 'No settings: upload a video and get the result.',
      unit: '/ 30 days', active: (d) => `Subscription active until ${d}`, pageBuy: 'Buy subscription',
      err: {
        pro_required: 'An INEASY Pro subscription is required.',
        no_pro_balance: "Today's limit is used up. It refills tomorrow at 07:00 Astana time.",
        pro_video_too_long: (s) => `For fast enhancement the video must be at most ${s} s long.`,
        video_too_large: `The file is too large (max ${MAX_MB} MB).`,
        pro_busy: 'Many requests right now. Try again in a minute.',
        pro_unreadable: 'Could not read the video. Try MP4 or MOV.',
        pro_duration_unknown: 'Upload the original video, not an already processed file.',
        generic: 'Could not enhance the video. Your limit was not used, please try again.',
      },
    },
    kk: {
      cardSub: 'TikTok үшін бейнені жақсарту',
      lockedTitle: 'Сізде рұқсат жоқ', lockedText: 'Бұл патчер тек INEASY Pro жазылымымен қолжетімді.',
      buy: 'Жазылым сатып алу',
      left: (n, d) => `Бүгін қалды: ${n} / ${d}`, until: (d) => `Жазылым ${d} дейін`,
      dropTitle: 'Бейнені таңдаңыз', dropHint: 'MP4 немесе MOV', run: 'Бейнені жақсарту',
      uploading: (p) => `Жүктелуде: ${p}%`, enhancing: 'Бейне жақсартылуда… әдетте 1–2 минутқа дейін',
      done: 'Дайын! Бейне жақсартылды', download: 'Жүктеп алу', another: 'Басқа бейнені жақсарту',
      pageA: 'TikTok үшін ', pageB: 'бейнені жақсарту',
      lead: 'Бейнені жүктеңіз де, жариялауға дайын анық әрі жарқын нәтиже алыңыз.',
      perk1: 'Күн сайын 5 бейне тегін', perk2: '30 күн жазылым', perk3: 'Қолдау әрдайым онлайн',
      f1: 'Анықтық', f1t: 'Бейне айқындала түседі: детальдар, мәтін және жиектер таза көрінеді.',
      f2: 'Қанықтық', f2t: 'Артық күшейтусіз тірі түстер мен контраст.',
      f3: 'TikTok-қа дайын', f3t: 'Файл жариялауға дайын: ажыратымдылық пен 60 FPS сақталады.',
      note: 'Баптаусыз: бейнені жүктеп, нәтиже алыңыз.',
      unit: '/ 30 күн', active: (d) => `Жазылым ${d} дейін белсенді`, pageBuy: 'Жазылым сатып алу',
      err: {
        pro_required: 'INEASY Pro жазылымы қажет.',
        no_pro_balance: 'Бүгінгі лимит бітті. Ертең Астана уақытымен 07:00-де жаңарады.',
        pro_video_too_long: (s) => `Жылдам жақсарту үшін бейне ${s} сек-тан ұзақ болмауы керек.`,
        video_too_large: `Файл тым үлкен (ең көбі ${MAX_MB} МБ).`,
        pro_busy: 'Қазір өтінімдер көп. Бір минуттан кейін қайталаңыз.',
        pro_unreadable: 'Бейнені оқу мүмкін болмады. MP4 немесе MOV қолданып көріңіз.',
        pro_duration_unknown: 'Өңделген файлды емес, түпнұсқа бейнені жүктеңіз.',
        generic: 'Бейнені жақсарту мүмкін болмады. Лимит жұмсалмады, қайталап көріңіз.',
      },
    },
  };

  let status = null;
  let file = null;
  let resultUrl = null;
  let busy = false;
  const lang = () => (T[document.documentElement.lang] ? document.documentElement.lang : 'en');
  const t = () => T[lang()];
  const token = () => { try { return localStorage.getItem('tg_auth_token') || sessionStorage.getItem('tg_auth_token') || ''; } catch (e) { return ''; } };
  const dateText = (ms) => new Date(ms).toLocaleDateString(lang() === 'kk' ? 'kk-KZ' : lang() === 'en' ? 'en-GB' : 'ru-RU', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'long', year: 'numeric' });
  const hide = (id, on) => { const n = $(id); if (n) n.classList.toggle('hidden', on); };
  const text = (id, value) => { const n = $(id); if (n) n.textContent = value; };

  function render() {
    const s = t();
    for (const [id, key] of Object.entries({
      proCardSub: 'cardSub', proLockedTitle: 'lockedTitle', proLockedText: 'lockedText', proBuyBtn: 'buy',
      proDropTitle: 'dropTitle', proDropHint: 'dropHint', proRunBtn: 'run', proDownload: 'download', proAnother: 'another',
      proPageA: 'pageA', proPageB: 'pageB', proLead: 'lead', proPerk1: 'perk1', proPerk2: 'perk2', proPerk3: 'perk3',
      proF1: 'f1', proF1t: 'f1t', proF2: 'f2', proF2t: 'f2t', proF3: 'f3', proF3t: 'f3t', proNote: 'note',
      proUnit: 'unit', proPageBuy: 'pageBuy', proDone: 'done',
    })) text(id, s[key]);
    const active = Boolean(status && status.active);
    hide('proLocked', active);
    hide('proWork', !active);
    hide('proActive', !active);
    if (active) {
      text('proLeft', s.left(status.left, status.daily));
      text('proUntil', s.until(dateText(status.until)));
      text('proActive', s.active(dateText(status.until)));
    }
    if (status && status.price) text('proPrice', Number(status.price).toLocaleString('ru-RU'));
    if (file) { text('proDropTitle', file.name); text('proDropHint', `${(file.size / 1048576).toFixed(1)} MB`); }
    const run = $('proRunBtn');
    if (run) run.disabled = busy || !file || !active || status.left <= 0;
  }

  async function loadStatus() {
    try {
      const headers = token() ? { Authorization: `Bearer ${token()}` } : {};
      const res = await fetch('/api/pro/status', { headers, cache: 'no-store' });
      if (res.ok) status = await res.json();
    } catch (e) { /* the card stays locked */ }
    render();
  }

  function showProSection(push = true) {
    document.querySelectorAll('.view-section').forEach((n) => { n.classList.add('hidden'); n.classList.remove('active'); });
    const page = $('proSection');
    page.classList.remove('hidden');
    page.classList.add('active');
    if (push && window.location.pathname !== '/pro') window.history.pushState({ ineasyView: 'proSection' }, '', '/pro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadStatus();
  }
  window.showProSection = showProSection;

  function showError(message) {
    const node = $('proError');
    node.textContent = message;
    node.classList.remove('hidden');
  }

  function setFile(next) {
    file = next || null;
    hide('proError', true);
    if (file && file.size > MAX_MB * 1048576) { showError(t().err.video_too_large); file = null; }
    render();
  }

  function enhance() {
    if (!file || busy) return;
    busy = true;
    hide('proError', true);
    hide('proResult', true);
    hide('proProgress', false);
    $('proBar').classList.remove('busy');
    $('proBar').firstElementChild.style.width = '0';
    text('proProgressText', t().uploading(0));
    render();
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/pro/enhance');
    xhr.responseType = 'blob';
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    if (token()) xhr.setRequestHeader('Authorization', `Bearer ${token()}`);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      $('proBar').firstElementChild.style.width = `${percent}%`;
      text('proProgressText', t().uploading(percent));
    };
    xhr.upload.onload = () => {
      $('proBar').firstElementChild.style.width = '';
      $('proBar').classList.add('busy');
      text('proProgressText', t().enhancing);
    };
    const finish = () => { busy = false; hide('proProgress', true); loadStatus(); };
    xhr.onerror = () => { showError(t().err.generic); finish(); };
    xhr.onload = async () => {
      if (xhr.status === 200) {
        if (resultUrl) URL.revokeObjectURL(resultUrl);
        resultUrl = URL.createObjectURL(xhr.response);
        $('proPreview').src = resultUrl;
        $('proDownload').href = resultUrl;
        $('proDownload').download = `ineasy-pro-${(file.name || 'video').replace(/\.[^.]+$/, '')}.mp4`;
        hide('proResult', false);
        file = null;
        setFile(null);
      } else {
        let body = {};
        try { body = JSON.parse(await xhr.response.text()); } catch (e) { /* generic message */ }
        const message = t().err[body.error];
        showError(typeof message === 'function' ? message(body.maxSeconds) : (message || t().err.generic));
      }
      finish();
    };
    xhr.send(file);
  }

  function init() {
    if (!$('proCard')) return;
    $('proBuyBtn').addEventListener('click', () => showProSection());
    $('proPageBuy').addEventListener('click', () => window.open((status && status.buyUrl) || 'https://t.me/ineasybot?start=pro', '_blank', 'noopener'));
    $('proFile').addEventListener('change', (event) => setFile(event.target.files[0]));
    $('proRunBtn').addEventListener('click', enhance);
    $('proAnother').addEventListener('click', () => { hide('proResult', true); $('proPreview').removeAttribute('src'); $('proFile').value = ''; });
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    render();
    loadStatus();
    if (window.location.pathname.replace(/\/+$/, '') === '/pro') showProSection(false);
  }
  init();
})();
