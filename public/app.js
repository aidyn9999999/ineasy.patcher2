// --- Auth + layout ---
const tgId = localStorage.getItem('tg_id');

if (!tgId) {
  window.location.href = '/';
}

const STATE = {
  lang: localStorage.getItem('ineasy-language') || 'en',
};

const translations = {
  en: {
    id: 'ID:',
    balance: 'Balance:',
    logout: 'Log out',
    packages: 'Paid packages',
    packageHint: 'Click “Buy” to open @ineasybot and receive payment details.',
    buy: 'Buy',
    nav: ['PATCHER', 'VIDEO CHECKER', 'HOW TO USE'],
    faqLabel: 'HOW TO USE / FAQ',
    analyzerEyebrow: 'VIDEO CHECKER / 02',
    videos: 'videos',
    report: 'Report',
    patchTitle: 'Patcher auto-detects the right settings.',
    patchSub: 'Upload a video. We choose FPS, resolution and bitrate automatically.',
    choose: 'Select video',
    chooseSub: 'Drag file here or click to browse',
    localNote: 'The video stays on your device. Processing settings are selected automatically.',
    process: 'Process video',
    processing: 'Preparing video…',
    processingSub: 'Preparing…',
    ready: 'Video ready',
    readySub: 'Download your patched file',
    download: 'Download',
    notice: 'If the video duration shows 0:00 after patching, this is normal. The file works correctly.',
    analyzerTitle: 'Check video quality',
    analyzerDesc: 'Paste a public TikTok link. We analyze the original video and show real parameters.',
    analyzerButton: 'Analyze video',
    analyzerLabel: 'Video link',
    analyzerPlaceholder: 'Paste TikTok link',
    analyzerSubmit: 'Analyze',
    analyzerLoading: 'Analyzing your video…',
    analyzerDone: 'Analysis complete',
    analyzerError: 'Could not verify this link. Make sure the video is public.',
    faqTitle: 'Everything important in one place',
    faqSupportText: 'Found a bug?',
    faqReport: 'Report',
    footerSupport: 'Support',
    footerHome: 'Home',
    footerFaq: 'FAQ',
    footerTelegram: 'Telegram',
    footerDesc: 'Keep quality. Publish confidently.',
    remove: 'Remove',
    selectFile: 'Select video',
    fileName: 'Selected file',
    packageLabel: 'Video package',
    errorInvalidFile: 'Choose an MP4 up to 8 GiB.',
    loadingText: 'Preparing MP4 metadata on your device…',
    successText: 'Done. Video and audio stayed on your device; only MP4 metadata was sent.',
    checkResult: 'Result',
    quality: 'Quality',
    fps: 'Frame rate',
    codec: 'Codec',
    bitrate: 'Bitrate',
    close: 'Close',
    noData: '—',
    faq: [
      ['Do I need to install anything?', 'No. VideoPatcher works in your browser.'],
      ['What videos can I process?', 'Vertical videos for TikTok and short-form formats.'],
      ['What happens after processing?', 'You will see the result and can download the patched file.'],
      ['Can I edit after patching?', 'No. After processing, internal parameters are changed and re-editing can cause errors.'],
      ['Does the patcher compress?', 'We preserve quality and prepare optimized parameters for publishing.'],
      ['Do I need to pick FPS, bitrate, or resolution?', 'No. INEASY auto-detects compatible settings.'],
      ['Where do I report bugs?', 'Message the admin on Telegram.']
    ],
  },
  ru: {
    id: 'ID:',
    balance: 'Баланс:',
    logout: 'Выйти',
    packages: 'Платные пакеты',
    packageHint: 'Нажмите «Купить» — откроется бот @ineasybot, он пришлёт реквизиты для оплаты.',
    buy: 'Купить',
    nav: ['ПАТЧЕР', 'ЧЕКЕР ВИДЕО', 'КАК ИСПОЛЬЗОВАТЬ'],
    faqLabel: 'КАК ПОЛЬЗОВАТЬСЯ / FAQ',
    analyzerEyebrow: 'ПРОВЕРКА ВИДЕО / 02',
    videos: 'видео',
    report: 'Сообщить',
    patchTitle: 'Патчер автоматически определяет необходимые параметры.',
    patchSub: 'Загрузите ролик. Мы подберём оптимальные параметры без ручной настройки FPS, разрешения и битрейта.',
    choose: 'Выберите видео',
    chooseSub: 'Перетащите файл сюда или нажмите, чтобы открыть устройство',
    localNote: 'Видео остаётся в вашем рабочем процессе. Настройки обработки определяются автоматически.',
    process: 'Обработать видео',
    processing: 'Подготавливаем видео…',
    processingSub: 'Обработка…',
    ready: 'Видео готово',
    readySub: 'Можно скачать обработанный файл',
    download: 'Скачать',
    notice: 'Если после патчинга длительность видео показывает 0:00, это нормально. Файл работает корректно.',
    analyzerTitle: 'Проверить качество видео',
    analyzerDesc: 'Вставьте публичную ссылку на видео. Сервер проанализирует оригинальный ролик и покажет реальные параметры.',
    analyzerButton: 'Проверить видео',
    analyzerLabel: 'Ссылка на видео',
    analyzerPlaceholder: 'Вставьте ссылку',
    analyzerSubmit: 'Анализировать',
    analyzerLoading: 'Анализируем ваше видео…',
    analyzerDone: 'Проверка завершена',
    analyzerError: 'Не удалось проверить ссылку. Убедитесь, что видео открыто публично.',
    faqTitle: 'Всё важное, без лишнего',
    faqSupportText: 'Заметили ошибку?',
    faqReport: 'Сообщить',
    footerSupport: 'Поддержка',
    footerHome: 'Главная',
    footerFaq: 'FAQ',
    footerTelegram: 'Telegram',
    footerDesc: 'Сохраняйте качество. Публикуйте уверенно.',
    remove: 'Убрать',
    selectFile: 'Выберите видео',
    fileName: 'Выбранный файл',
    packageLabel: 'Пакет видео',
    errorInvalidFile: 'Выберите MP4 размером до 8 GiB.',
    loadingText: 'Проверяем MP4 и подготавливаем метаданные на устройстве…',
    successText: 'Готово. Видео и аудио не отправлялись; сервис получил только метаданные MP4.',
    checkResult: 'Результат проверки',
    quality: 'Качество',
    fps: 'Частота кадров',
    codec: 'Кодек',
    bitrate: 'Битрейт',
    close: 'Закрыть',
    noData: '—',
    faq: [
      ['Нужно ли устанавливать программу?', 'Нет. VideoPatcher работает в браузере.'],
      ['Какие видео можно обрабатывать?', 'Вертикальные видео для TikTok и коротких форматов.'],
      ['Что происходит после обработки?', 'Вы увидите результат и сможете скачать готовый файл.'],
      ['Можно ли изменить видео после патчинга?', 'Нет. После обработки внутренние параметры файла изменяются, и повторное редактирование может вызвать ошибки.'],
      ['Патчер сжимает видео?', 'Мы сохраняем качество и всё оптимизируем для загрузки в сервисы.'],
      ['Нужно ли выбирать FPS, битрейт или разрешение?', 'Нет. INEASY автоматически определяет совместимые параметры.'],
      ['Куда сообщить о баге?', 'Напишите администратору в Telegram.']
    ],
  },
  kk: {
    id: 'ID:',
    balance: 'Баланс:',
    logout: 'Шығу',
    packages: 'Ақылы пакеттер',
    packageHint: '«Сатып алу» түймесін басыңыз — бот @ineasybot сізге төлем реквизиттерін жіберетін болады.',
    buy: 'Сатып алу',
    nav: ['ПАТЧЕР', 'ТЕКСЕР ВИДЕО', 'ҚАЛАЙ ПАЙДАЛАНУ',],
    faqLabel: 'ҚАЛАЙ ПАЙДАЛАНУ / FAQ',
    analyzerEyebrow: 'БЕЙНЕНІ ТЕКСЕРУ / 02',
    videos: 'бейне',
    report: 'Хабарлау',
    patchTitle: 'Патчер қажетті параметрлерді өзі анықтайды.',
    patchSub: 'Бейнені жүктеңіз. FPS, ажыратымдылық және битрейт автоматты түрде тандалады.',
    choose: 'Бейнені таңдаңыз',
    chooseSub: 'Файлды осы жерге сүйреп апарыңыз немесе құрылғыдан таңдаңыз',
    localNote: 'Бейне құрылғыда қалады. Өңдеу параметрлері автоматты түрде анықталады.',
    process: 'Бейнені өңдеу',
    processing: 'Бейнені даярлау…',
    processingSub: 'Өңдеу…',
    ready: 'Бейне дайын',
    readySub: 'Өңделген файлын жүктеп алыңыз',
    download: 'Жүктеу',
    notice: 'Егер өңдеуден кейін ұзақтығы 0:00 болса, бұл қалыпты. Файл дұрыс жұмыс істейді.',
    analyzerTitle: 'Бейнені тексеру',
    analyzerDesc: 'Жалпы доступты TikTok сілтемесін енгізіңіз. Біз түпнұсқа бейненің нақты параметрлерін анықтаймыз.',
    analyzerButton: 'Бейнені тексеру',
    analyzerLabel: 'Бейненің сілтемесі',
    analyzerPlaceholder: 'TikTok сілтемесін енгізіңіз',
    analyzerSubmit: 'Тексеру',
    analyzerLoading: 'Бейнені талдаймыз…',
    analyzerDone: 'Тексеру аяқталды',
    analyzerError: 'Сілтемені тексеру мүмкін болмады. Бейне қоғамдық екенін тексеріңіз.',
    faqTitle: 'Маңызды мәліметтер барлығы бір жерде',
    faqSupportText: 'Қате таптыңыз ба?',
    faqReport: 'Ескерту',
    footerSupport: 'Қолдау',
    footerHome: 'Басты',
    footerFaq: 'FAQ',
    footerTelegram: 'Telegram',
    footerDesc: 'Сапаны сақтаңыз. Сенімді түрде жариялаңыз.',
    remove: 'Жою',
    selectFile: 'Бейнені таңдаңыз',
    fileName: 'Таңдалған файл',
    packageLabel: 'Бейне пакеті',
    errorInvalidFile: '8 GiB-ке дейін MP4 файл таңдаңыз.',
    loadingText: 'MP4 метадеректерін құрылғыда дайындаймыз…',
    successText: 'Дайын. Бейне мен аудио жіберілмеді; сервис тек MP4 метадеректерін алды.',
    checkResult: 'Нәтиже',
    quality: 'Сапа',
    fps: 'Кадр жиілігі',
    codec: 'Кодек',
    bitrate: 'Битрейт',
    close: 'Жабу',
    noData: '—',
    faq: [
      ['Бағдарламаны орнату керек пе?', 'Жоқ. VideoPatcher браузерде жұмыс істейді.'],
      ['Қандай бейнелерді өңдеу мүмкін?', 'TikTok және қысқа форматтағы тік бейнелер.'],
      ['Өңдеуден кейін не болады?', 'Нәтижені көресіз және өңделген файлды жүктеп алуға болады.'],
      ['Өңдеуден кейін қайта өңдеуге болады ма?', 'Жоқ. Өңдеуден кейін ішкі параметрлер өзгереді, қайталап өңдеу қателерге себеп болуы мүмкін.'],
      ['Патчер сығымдай ма?', 'Біз сапаны сақтаймыз және жариялау үшін оңтайлы параметрлерді дайындаймыз.'],
      ['FPS, битрейт немесе ажыратымдылықты өзім таңдауым керек пе?', 'Жоқ. INEASY үйлесімді параметрлерді автоматты түрде анықтайды.'],
      ['Қате туралы қайда хабарласуға болады?', 'Администратору Telegram арқылы жазып шығыңыз.']
    ],
  }
};

function t(key) {
  const lang = translations[STATE.lang] ? STATE.lang : 'en';
  const pack = translations[lang] || translations.en;
  return pack[key] ?? translations.en[key] ?? key;
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function applyLanguage(lang) {
  lang = translations[lang] ? lang : 'en';
  STATE.lang = lang;
  localStorage.setItem('ineasy-language', lang);
  document.documentElement.lang = lang;

  const pack = translations[lang] || translations.en;

  setText('idCaption', pack.id);
  setText('balanceCaption', pack.balance);
  setText('logoutBtn', pack.logout);
  setText('packagesTitle', pack.packages);
  setText('packagesHint', pack.packageHint);
  setText('navPatcher', pack.nav[0]);
  setText('navAnalyzer', pack.nav[1]);
  setText('navFaq', pack.nav[2]);
  setText('patchTitle', pack.patchTitle);
  setText('patchSub', pack.patchSub);
  setText('dzTitle', pack.choose);
  setText('dzSub', pack.chooseSub);
  setText('localNote', pack.localNote);
  setText('processBtn', pack.process);
  setText('processingTitle', pack.processing);
  setText('processingText', pack.processingSub);
  setText('resultTitle', pack.ready);
  setText('resultSub', pack.readySub);
  setText('downloadBtn', pack.download);
  setText('noticeBannerText', pack.notice);
  setText('checkerTitle', pack.analyzerTitle);
  setText('checkerDesc', pack.analyzerDesc);
  setText('checkerOpenBtn', pack.analyzerButton);
  setText('urlLabel', pack.analyzerLabel);
  if (document.getElementById('checkerUrl')) document.getElementById('checkerUrl').placeholder = pack.analyzerPlaceholder;
  setText('analyzeBtn', pack.analyzerSubmit);
  setText('faqTitle', pack.faqTitle);
  setText('supportText', pack.faqSupportText);
  setText('faqSupportText', pack.faqSupportText);
  setText('checkerReport', pack.report);
  setText('faqReport', pack.report);
  setText('footerTitle', 'VideoPatcher');
  setText('footerDesc', pack.footerDesc);
  setText('footerHome', pack.footerHome);
  setText('footerFaq', pack.footerFaq);
  setText('footerSupport', pack.footerSupport);
  setText('footerTelegram', pack.footerTelegram);
  setText('faqLabel', pack.faqLabel);
  setText('analyzerLabel', pack.analyzerEyebrow);
  setText('clearBtn', pack.remove);
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) bottomNav.setAttribute('aria-label', lang === 'ru' ? 'Навигация' : lang === 'kk' ? 'Навигация' : 'Navigation');
  const copyIdLabel = lang === 'ru' ? 'Копировать ID' : lang === 'kk' ? 'ID көшіру' : 'Copy ID';
  const topUpLabel = lang === 'ru' ? 'Пополнить баланс' : lang === 'kk' ? 'Балансты толтыру' : 'Top up';
  const logoutButton = document.getElementById('logoutBtn');
  const copyIdButton = document.getElementById('copyIdBtn');
  const topUpButton = document.getElementById('plusBtn');
  const closeButton = document.getElementById('modalClose');
  const languageDock = document.getElementById('languageDock');
  const footerNav = document.querySelector('.site-footer nav');
  if (logoutButton) {
    logoutButton.setAttribute('aria-label', pack.logout);
    logoutButton.title = pack.logout;
  }
  if (copyIdButton) {
    copyIdButton.setAttribute('aria-label', copyIdLabel);
    copyIdButton.title = copyIdLabel;
  }
  if (topUpButton) {
    topUpButton.setAttribute('aria-label', topUpLabel);
    topUpButton.title = topUpLabel;
  }
  if (closeButton) closeButton.setAttribute('aria-label', pack.close);
  if (languageDock) languageDock.setAttribute('aria-label', lang === 'ru' ? 'Язык' : lang === 'kk' ? 'Тіл' : 'Language');
  if (footerNav) footerNav.setAttribute('aria-label', lang === 'ru' ? 'Навигация внизу страницы' : lang === 'kk' ? 'Бет төменіндегі навигация' : 'Footer Navigation');

  const faqBlocks = [
    ['faq1q', 'faq1a'], ['faq2q', 'faq2a'], ['faq3q', 'faq3a'],
    ['faq4q', 'faq4a'], ['faq5q', 'faq5a'], ['faq6q', 'faq6a'], ['faq7q', 'faq7a']
  ];
  faqBlocks.forEach(([qId, aId], index) => {
    const q = document.getElementById(qId);
    const a = document.getElementById(aId);
    if (q && a && pack.faq[index]) {
      q.textContent = pack.faq[index][0];
      a.textContent = pack.faq[index][1];
    }
  });

  document.querySelectorAll('[data-lang]').forEach((button) => {
    button.classList.toggle('active', button.dataset.lang === lang);
  });

  document.getElementById('checkerUrl').value = document.getElementById('checkerUrl').value.trim();
  renderPackages();
}

const tgIdLabel = document.getElementById('tgIdLabel');
if (tgIdLabel) tgIdLabel.textContent = tgId;

document.getElementById('copyIdBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(tgId).then(() => {
    const btn = document.getElementById('copyIdBtn');
    const old = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = old; }, 1200);
  });
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  ['tg_id', 'tg_username', 'tg_first_name'].forEach((key) => localStorage.removeItem(key));
  window.location.href = '/';
});

// --- Balance ---
const balanceLabel = document.getElementById('balanceLabel');
let currentBalance = null;

function renderBalance() {
  if (balanceLabel && currentBalance !== null) balanceLabel.textContent = `${currentBalance} ${t('videos')}`;
}

async function loadBalance() {
  try {
    const res = await fetch(`/api/balance/${tgId}`);
    const data = await res.json();
    currentBalance = data.balance;
    renderBalance();
  } catch (e) {
    if (balanceLabel) balanceLabel.textContent = '—';
  }
}

loadBalance();

// --- Packages ---
const BOT_USERNAME = 'ineasybot';
const PACKAGES = [
  { count: 3, price: 450 },
  { count: 5, price: 725 },
  { count: 10, price: 1400 },
  { count: 15, price: 2025 },
  { count: 20, price: 2600 },
  { count: 30, price: 3750 },
  { count: 50, price: 6000 },
  { count: 100, price: 11000 },
];

const modalOverlay = document.getElementById('modalOverlay');
const plusBtn = document.getElementById('plusBtn');
const modalClose = document.getElementById('modalClose');
const pkgList = document.getElementById('pkgList');

function renderPackages() {
  if (!pkgList) return;
  pkgList.innerHTML = '';
  const lang = STATE.lang || 'en';
  PACKAGES.forEach((pkg) => {
    const li = document.createElement('li');
    li.className = 'pkg-row';
    const link = `https://t.me/${BOT_USERNAME}?start=buy_${pkg.count}_${pkg.price}`;
    const price = `${pkg.price.toLocaleString(lang === 'ru' ? 'ru-RU' : lang === 'kk' ? 'kk-KZ' : 'en-US')} ₸`;
    li.innerHTML = `
      <span class="pkg-text">${pkg.count} ${t('packageLabel')} × ${(pkg.price / pkg.count).toFixed(0).replace(/\.0$/, '')} ₸ = <b>${price}</b></span>
      <a class="pkg-buy" href="${link}" target="_blank" rel="noopener">${t('buy')}</a>
    `;
    pkgList.appendChild(li);
  });
}

function openModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove('hidden');
  loadBalance();
}
function closeModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.add('hidden');
}

if (plusBtn) plusBtn.addEventListener('click', openModal);
if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

// --- File upload + patcher ---
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const previewWrap = document.getElementById('previewWrap');
const previewVideo = document.getElementById('previewVideo');
const fileMeta = document.getElementById('fileMeta');
const clearBtn = document.getElementById('clearBtn');
const processBtn = document.getElementById('processBtn');
const processingState = document.getElementById('processingState');
const processingText = document.getElementById('processingText');
const processingProgress = document.getElementById('processingProgress');
const processedResult = document.getElementById('processedResult');
const downloadBtn = document.getElementById('downloadBtn');

let currentObjectUrl = null;
let patchedDownloadUrl = null;

function setProcessingState(type, text) {
  if (!processingState) return;
  processingState.classList.remove('hidden');
  processingState.classList.toggle('completed', type === 'success');
  processingState.classList.toggle('failed', type === 'error');
  if (processingText) processingText.textContent = text;
}

function handleFile(file) {
  const isMp4 = file && (file.type === 'video/mp4' || /\.mp4$/i.test(file.name));
  if (!isMp4 || file.size < 16 || file.size > 8 * 1024 ** 3) {
    setProcessingState('error', t('errorInvalidFile'));
    if (processBtn) processBtn.disabled = true;
    return;
  }

  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  if (patchedDownloadUrl) URL.revokeObjectURL(patchedDownloadUrl);
  patchedDownloadUrl = null;
  currentObjectUrl = URL.createObjectURL(file);

  if (previewVideo) previewVideo.src = currentObjectUrl;
  if (fileMeta) fileMeta.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  if (previewWrap) previewWrap.classList.add('show');
  if (processBtn) processBtn.disabled = false;
  if (processingState) processingState.classList.add('hidden');
  if (processedResult) processedResult.classList.add('hidden');
}

if (dropzone) {
  dropzone.addEventListener('click', () => fileInput && fileInput.click());
}

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(file);
  });
}

if (dropzone) {
  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
}

if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    if (previewVideo) previewVideo.src = '';
    if (previewWrap) previewWrap.classList.remove('show');
    if (fileInput) fileInput.value = '';
    if (processBtn) processBtn.disabled = true;
    if (patchedDownloadUrl) URL.revokeObjectURL(patchedDownloadUrl);
    patchedDownloadUrl = null;
    if (processedResult) processedResult.classList.add('hidden');
    if (processingState) processingState.classList.add('hidden');
  });
}

// --- Analyzer fixes ---
const checkerOpenBtn = document.getElementById('checkerOpenBtn');
const checkerForm = document.getElementById('checkerForm');
const checkerUrl = document.getElementById('checkerUrl');
const checkerStatus = document.getElementById('checkerStatus');
const checkerResult = document.getElementById('checkerResult');
let checkerRequestToken = 0;

function resetAnalyzerUi() {
  if (!checkerStatus || !checkerResult) return;
  checkerStatus.className = 'checker-status';
  checkerStatus.textContent = '';
  checkerResult.classList.add('hidden');
  checkerResult.innerHTML = '';
}

if (checkerOpenBtn) {
  checkerOpenBtn.addEventListener('click', () => {
    if (!checkerForm) return;
    checkerForm.classList.toggle('hidden');
    resetAnalyzerUi();
    if (!checkerForm.classList.contains('hidden') && checkerUrl) checkerUrl.focus();
  });
}

if (checkerForm) {
  checkerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!checkerUrl) return;

    const rawUrl = checkerUrl.value.trim();
    if (!rawUrl) {
      if (checkerStatus) {
        checkerStatus.className = 'checker-status error';
        checkerStatus.textContent = t('analyzerError');
      }
      return;
    }

    const token = ++checkerRequestToken;
    if (checkerResult) {
      checkerResult.innerHTML = '';
      checkerResult.classList.add('hidden');
    }
    if (checkerStatus) {
      checkerStatus.className = 'checker-status loading';
      checkerStatus.textContent = t('analyzerLoading');
    }

    try {
      const response = await fetch('/api/check-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl }),
      });

      const data = await response.json();
      if (token !== checkerRequestToken) return;
      if (!response.ok) throw new Error(data.error || 'check_failed');

      const quality = data.quality ?? '—';
      const width = data.width ?? '—';
      const height = data.height ?? '—';
      const fps = data.fps ?? '—';
      const codec = data.codec ?? '—';
      const bitrate = data.bitrate ?? '—';
      const size = data.size ?? '—';
      const duration = data.duration ?? '—';

      if (checkerStatus) {
        checkerStatus.className = 'checker-status success';
        checkerStatus.textContent = t('analyzerDone');
      }

      if (checkerResult) {
        checkerResult.innerHTML = `
          <div class="result-heading"><span>✓</span><div><small>${t('checkResult')}</small><strong>${t('analyzerDone')}</strong></div></div>
          <div class="result-grid">
            <div><small>${t('quality')}</small><strong>${quality}p</strong><span>${width} × ${height}</span></div>
            <div><small>${t('fps')}</small><strong>${fps} FPS</strong><span>${t('quality')}</span></div>
            <div><small>${t('codec')}</small><strong>${codec}</strong><span>${t('codec')}</span></div>
            <div><small>${t('bitrate')}</small><strong>${bitrate}</strong><span>${size} • ${duration}</span></div>
          </div>
        `;
        checkerResult.classList.remove('hidden');
      }
    } catch (error) {
      if (token !== checkerRequestToken) return;
      if (checkerStatus) {
        checkerStatus.className = 'checker-status error';
        checkerStatus.textContent = t('analyzerError');
      }
    }
  });
}

// --- Tabs ---
document.querySelectorAll('.nav-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach((item) => {
      item.classList.remove('active');
      item.removeAttribute('aria-current');
    });
    document.querySelectorAll('.view-section').forEach((section) => {
      section.classList.add('hidden');
      section.classList.remove('active');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-current', 'page');
    const target = document.getElementById(tab.dataset.view);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }
  });
});

if (processBtn) {
  processBtn.addEventListener('click', async () => {
    if (!fileInput || !fileInput.files[0]) return;
    processBtn.disabled = true;
    if (processingState) {
      processingState.classList.remove('hidden');
      processingState.classList.remove('completed', 'failed');
    }
    if (processedResult) processedResult.classList.add('hidden');
    if (processingText) processingText.textContent = t('loadingText');
    if (processingProgress) processingProgress.style.width = '';

    try {
      const { patchVideo } = await import('./client.mjs');
      const outputBlob = await patchVideo(fileInput.files[0], {
        onStatus: (message) => {
          if (processingText) processingText.textContent = localizePatchStatus(message);
        },
      });

      patchedDownloadUrl = URL.createObjectURL(outputBlob);
      if (downloadBtn) {
        downloadBtn.href = patchedDownloadUrl;
        downloadBtn.download = `${fileInput.files[0].name.replace(/\.mp4$/i, '')}-ineasy.mp4`;
      }

      if (processingText) processingText.textContent = t('successText');
      if (processingProgress) processingProgress.style.width = '100%';
      if (processingState) processingState.classList.add('completed');
      if (processedResult) processedResult.classList.remove('hidden');
      loadPatchCount();
    } catch (error) {
      if (processingState) processingState.classList.add('failed');
      if (processingText) processingText.textContent = localizePatchError(error.message);
      if (processingProgress) processingProgress.style.width = '0%';
      processBtn.disabled = false;
    }
  });
}

function localizePatchStatus(message) {
  const lang = STATE.lang || 'en';
  const statuses = {
    'Preparing fragmented MP4 on your device…': { ru: 'Подготавливаем MP4 на вашем устройстве…', kk: 'MP4 файл құрылғыда дайындалу…', en: 'Preparing MP4 on your device…' },
    'Preparing MP4 metadata on your device…': { ru: 'Подготавливаем метаданные на устройстве…', kk: 'Метадеректер құрылғыда дайындалуда…', en: 'Preparing metadata on your device…' },
    'Patching metadata…': { ru: 'Обновляем метаданные видео…', kk: 'Бейне метадеректері жаңартылуда…', en: 'Patching video metadata…' },
  };
  return statuses[message]?.[lang] || message;
}

async function loadPatchCount() {
  const patchCount = document.getElementById('patchCount');
  if (!patchCount) return;
  try {
    const response = await fetch('https://compressbase.com/api/method/v1/stats');
    if (!response.ok) return;
    const data = await response.json();
    if (Number.isFinite(data.patches)) {
      const labels = { en: 'patches', ru: 'обработок', kk: 'өңдеу' };
      patchCount.textContent = ` · ${data.patches.toLocaleString()} ${labels[STATE.lang] || labels.en}`;
    }
  } catch (error) {
    patchCount.textContent = '';
  }
}

function localizePatchError(message) {
  const lang = STATE.lang || 'en';
  const knownErrors = [
    { test: /up to 8 GiB/i, ru: 'Выберите MP4 размером до 8 GiB.', kk: 'Өлшемі 8 GiB-ке дейінгі MP4 таңдаңыз.', en: 'Choose an MP4 up to 8 GiB.' },
    { test: /supported MP4|non-fragmented|fast-start/i, ru: 'Этот MP4 не поддерживается. Экспортируйте видео как MP4 и попробуйте снова.', kk: 'Бұл MP4 қолдау көрсетпейді. Бейнені MP4 түрінде экспорттаңыз.', en: 'This MP4 is not supported. Export the video as MP4 and try again.' },
    { test: /429|limit/i, ru: 'Достигнут бесплатный лимит. Попробуйте позже.', kk: 'Тегін шектеуге жеттіңіз. Кейінірек қайталап көріңіз.', en: 'Free limit reached. Please try again later.' },
  ];
  const match = knownErrors.find((entry) => entry.test.test(message || ''));
  if (match) return match[lang];
  return message || ({ ru: 'Не удалось обработать видео. Попробуйте ещё раз.', kk: 'Бейнені өңдеу мүмкін болмады. Қайталап көріңіз.', en: 'Unable to process the video. Please try again.' })[lang];
}

const savedLanguage = localStorage.getItem('ineasy-language') || 'en';
applyLanguage(savedLanguage);

document.querySelectorAll('[data-lang]').forEach((button) => {
  button.addEventListener('click', () => {
    applyLanguage(button.dataset.lang);
    renderBalance();
  });
});
