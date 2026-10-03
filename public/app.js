// --- Auth + layout ---
const tgId = localStorage.getItem('tg_id');

if (!tgId) {
  window.location.href = '/';
}

const STATE = {
  lang: localStorage.getItem('ineasy-language') || 'en',
};
let tiktokCreatorInfo = null;
let tiktokAccountId = null;

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
    localNote: 'Video stays on your device. Videos up to 4K / 10 minutes are reduced to 1080p; output size depends on your device.',
    process: 'Process video',
    processing: 'Preparing video…',
    processingSub: 'Preparing…',
    ready: 'Video ready',
    readySub: 'Download your patched file',
    download: 'Download',
    publishTikTok: 'Publish to TikTok',
    publishNow: 'Publish now',
    publishTitle: 'Publish to TikTok',
    connectTikTok: 'Connect TikTok',
    checkingTikTok: 'Checking TikTok connection…',
    connectedAs: 'Connected as',
    uploadNotice: 'When publishing, this video streams through our server to Zernio and TikTok. This site does not save it.',
    allowPopups: 'Allow pop-ups to connect TikTok in a new tab.',
    uploadFailed: 'The video upload failed. Please try again.',
    connectHint: 'Connect a TikTok account to continue.',
    captionLabel: 'Description',
    captionHint: 'Add hashtags with # and mention accounts with @',
    privacyLabel: 'Who can watch this video',
    privacyPublic: 'Everyone',
    privacyFriends: 'Friends',
    privacyFollowers: 'Followers',
    privacyPrivate: 'Only you',
    commentsLabel: 'Allow comments',
    duetLabel: 'Allow Duet',
    stitchLabel: 'Allow Stitch',
    aiLabel: 'AI-generated content',
    adsOnlyLabel: 'Only show in ads',
    commercialLabel: 'Commercial content disclosure',
    commercialNone: 'None',
    commercialOwnBrand: 'Your brand',
    commercialPartner: 'Paid partnership',
    previewLabel: 'I reviewed the video and caption.',
    consentLabel: 'I authorize publishing this content to TikTok.',
    draftNotice: 'Friends-only and private videos are sent as drafts. Review all settings and finish publishing in TikTok.',
    connecting: 'Opening TikTok sign-in…',
    uploading: 'Uploading video…',
    publishing: 'Publishing to TikTok…',
    publishSuccess: 'Video published to TikTok.',
    publishPending: 'TikTok accepted the video and is processing the post.',
    draftSuccess: 'Draft sent to TikTok. Finish visibility and publishing in the TikTok app.',
    connectFailed: 'Could not connect TikTok. Check the server setup and try again.',
    publishFailed: 'TikTok could not publish this video. Check the options and try again.',
    authExpired: 'Your session expired. Sign in again to publish.',
    close: 'Close',
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
    errorInvalidFile: 'Choose a supported video up to 8 GiB.',
    cancel: 'Cancel',
    processingCancelled: 'Processing cancelled.',
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
    localNote: 'Видео остаётся на устройстве. Ролики до 4K и 10 минут уменьшаются до 1080p; размер результата зависит от устройства.',
    process: 'Обработать видео',
    processing: 'Подготавливаем видео…',
    processingSub: 'Обработка…',
    ready: 'Видео готово',
    readySub: 'Можно скачать обработанный файл',
    download: 'Скачать',
    publishTikTok: 'Опубликовать в TikTok',
    publishNow: 'Опубликовать сейчас',
    publishTitle: 'Публикация в TikTok',
    connectTikTok: 'Подключить TikTok',
    checkingTikTok: 'Проверяем подключение TikTok…',
    connectedAs: 'Подключён аккаунт',
    uploadNotice: 'При публикации видео пройдет через сервер сайта в Zernio и TikTok. Сайт не сохраняет файл.',
    allowPopups: 'Разрешите всплывающие окна для входа в TikTok в новой вкладке.',
    uploadFailed: 'Не удалось загрузить видео. Попробуйте ещё раз.',
    connectHint: 'Подключите аккаунт TikTok, чтобы продолжить.',
    captionLabel: 'Описание',
    captionHint: 'Добавьте хештеги через # и упоминания через @',
    privacyLabel: 'Кто может смотреть это видео',
    privacyPublic: 'Все',
    privacyFriends: 'Друзья',
    privacyFollowers: 'Подписчики',
    privacyPrivate: 'Только я',
    commentsLabel: 'Разрешить комментарии',
    duetLabel: 'Разрешить дуэты',
    stitchLabel: 'Разрешить Stitch',
    aiLabel: 'Контент создан с помощью ИИ',
    adsOnlyLabel: 'Показывать только в рекламе',
    commercialLabel: 'Маркировка коммерческого контента',
    commercialNone: 'Нет',
    commercialOwnBrand: 'Продвижение своего бренда',
    commercialPartner: 'Платное партнёрство',
    previewLabel: 'Я проверил видео и описание.',
    consentLabel: 'Я разрешаю опубликовать этот контент в TikTok.',
    draftNotice: 'Видео для друзей или личное будет отправлено в черновики. Проверьте настройки и завершите публикацию в TikTok.',
    connecting: 'Открываем вход в TikTok…',
    uploading: 'Загружаем видео…',
    publishing: 'Публикуем в TikTok…',
    publishSuccess: 'Видео опубликовано в TikTok.',
    publishPending: 'TikTok принял видео и обрабатывает публикацию.',
    draftSuccess: 'Черновик отправлен в TikTok. Завершите настройку видимости и публикацию в приложении TikTok.',
    connectFailed: 'Не удалось подключить TikTok. Проверьте настройки сервера и попробуйте снова.',
    publishFailed: 'Не удалось опубликовать видео в TikTok. Проверьте настройки и попробуйте снова.',
    authExpired: 'Сессия истекла. Войдите снова, чтобы опубликовать видео.',
    close: 'Закрыть',
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
    errorInvalidFile: 'Выберите поддерживаемое видео размером до 8 GiB.',
    cancel: 'Отмена',
    processingCancelled: 'Обработка отменена.',
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
    localNote: 'Бейне құрылғыда қалады. 4K және 10 минутқа дейінгі бейне 1080p-ке дейін кішірейтіледі; нәтиже өлшемі құрылғыға байланысты.',
    process: 'Бейнені өңдеу',
    processing: 'Бейнені даярлау…',
    processingSub: 'Өңдеу…',
    ready: 'Бейне дайын',
    readySub: 'Өңделген файлын жүктеп алыңыз',
    download: 'Жүктеу',
    publishTikTok: 'TikTok-қа жариялау',
    publishNow: 'Қазір жариялау',
    publishTitle: 'TikTok-қа жариялау',
    connectTikTok: 'TikTok-ты қосу',
    checkingTikTok: 'TikTok байланысын тексеру…',
    connectedAs: 'Қосылған аккаунт',
    uploadNotice: 'Жариялау кезінде бейне серверіміз арқылы Zernio мен TikTok-қа жіберіледі. Сайт файлды сақтамайды.',
    allowPopups: 'TikTok-қа жаңа қойындыда кіру үшін қалқымалы терезелерге рұқсат беріңіз.',
    uploadFailed: 'Бейне жүктелмеді. Қайталап көріңіз.',
    connectHint: 'Жалғастыру үшін TikTok аккаунтын қосыңыз.',
    captionLabel: 'Сипаттама',
    captionHint: '# арқылы хештег, @ арқылы аккаунтты белгілеңіз',
    privacyLabel: 'Бұл бейнені кім көре алады',
    privacyPublic: 'Барлығы',
    privacyFriends: 'Достар',
    privacyFollowers: 'Жазылушылар',
    privacyPrivate: 'Тек мен',
    commentsLabel: 'Пікірлерге рұқсат беру',
    duetLabel: 'Дуэтке рұқсат беру',
    stitchLabel: 'Stitch-ке рұқсат беру',
    aiLabel: 'ЖИ жасаған контент',
    adsOnlyLabel: 'Тек жарнамада көрсету',
    commercialLabel: 'Коммерциялық контент белгісі',
    commercialNone: 'Жоқ',
    commercialOwnBrand: 'Өз брендіңіз',
    commercialPartner: 'Ақылы серіктестік',
    previewLabel: 'Бейне мен сипаттаманы тексердім.',
    consentLabel: 'Осы контентті TikTok-та жариялауға рұқсат беремін.',
    draftNotice: 'Достарға немесе жеке бейне черновикке жіберіледі. Баптауларды тексеріп, жариялауды TikTok-та аяқтаңыз.',
    connecting: 'TikTok жүйесіне кіру ашылуда…',
    uploading: 'Бейне жүктелуде…',
    publishing: 'TikTok-та жариялануда…',
    publishSuccess: 'Бейне TikTok-та жарияланды.',
    publishPending: 'TikTok бейнені қабылдады және жариялап жатыр.',
    draftSuccess: 'Черновик TikTok-қа жіберілді. Жариялауды TikTok қолданбасында аяқтаңыз.',
    connectFailed: 'TikTok қосылмады. Сервер баптауларын тексеріп, қайталап көріңіз.',
    publishFailed: 'Бейне TikTok-та жарияланбады. Параметрлерді тексеріп, қайталап көріңіз.',
    authExpired: 'Сеанс аяқталды. Жариялау үшін қайта кіріңіз.',
    close: 'Жабу',
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
    errorInvalidFile: '8 GiB-ке дейін қолдау көрсетілетін бейне таңдаңыз.',
    cancel: 'Бас тарту',
    processingCancelled: 'Өңдеу тоқтатылды.',
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

async function tiktokApi(url, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${localStorage.getItem('tg_auth_token') || ''}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'tiktok_request_failed');
    error.status = response.status;
    throw error;
  }
  return data;
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
  setText('logoutLabel', pack.logout);
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
  setText('cancelProcessBtn', pack.cancel);
  setText('processingTitle', pack.processing);
  setText('processingText', pack.processingSub);
  setText('resultTitle', pack.ready);
  setText('resultSub', pack.readySub);
  setText('downloadBtn', pack.download);
  setText('publishTiktokBtn', pack.publishTikTok);
  setText('publishModalTitle', pack.publishTitle);
  setText('tiktokCaptionLabel', pack.captionLabel);
  setText('tiktokUploadNotice', pack.uploadNotice);
  setText('tiktokCaptionHint', pack.captionHint);
  setText('tiktokPrivacyLabel', pack.privacyLabel);
  setText('tiktokCommentsLabel', pack.commentsLabel);
  setText('tiktokDuetLabel', pack.duetLabel);
  setText('tiktokStitchLabel', pack.stitchLabel);
  setText('tiktokAiLabel', pack.aiLabel);
  setText('tiktokAdsOnlyLabel', pack.adsOnlyLabel);
  setText('tiktokCommercialLabel', pack.commercialLabel);
  setText('tiktokPreviewLabel', pack.previewLabel);
  setText('tiktokConsentLabel', pack.consentLabel);
  setText('tiktokDraftNote', pack.draftNotice);
  setText('tiktokConnectBtn', pack.connectTikTok);
  setText('tiktokSubmitBtn', pack.publishNow);
  if (tiktokCreatorInfo) renderTikTokOptions();
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
  const tiktokCloseButton = document.getElementById('tiktokModalClose');
  if (tiktokCloseButton) tiktokCloseButton.setAttribute('aria-label', pack.close);
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
  ['tg_id', 'tg_username', 'tg_first_name', 'tg_auth_token'].forEach((key) => localStorage.removeItem(key));
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
const cancelProcessBtn = document.getElementById('cancelProcessBtn');
const processingState = document.getElementById('processingState');
const processingText = document.getElementById('processingText');
const processingProgress = document.getElementById('processingProgress');
const processedResult = document.getElementById('processedResult');
const downloadBtn = document.getElementById('downloadBtn');
const publishTiktokBtn = document.getElementById('publishTiktokBtn');
const tiktokComposerOverlay = document.getElementById('tiktokComposerOverlay');
const tiktokAccountStatus = document.getElementById('tiktokAccountStatus');
const tiktokConnectBtn = document.getElementById('tiktokConnectBtn');
const tiktokPublishForm = document.getElementById('tiktokPublishForm');
const tiktokPublishStatus = document.getElementById('tiktokPublishStatus');
const tiktokCaption = document.getElementById('tiktokCaption');
const tiktokCaptionCount = document.getElementById('tiktokCaptionCount');
const tiktokPrivacy = document.getElementById('tiktokPrivacy');
const tiktokDraftNote = document.getElementById('tiktokDraftNote');
const tiktokSubmitBtn = document.getElementById('tiktokSubmitBtn');
let processedVideoBlob = null;

let currentObjectUrl = null;
let patchedDownloadUrl = null;
let processController = null;

function renderTikTokOptions() {
  if (!tiktokCreatorInfo || !tiktokPrivacy) return;
  const privacyLabels = {
    PUBLIC_TO_EVERYONE: t('privacyPublic'),
    MUTUAL_FOLLOW_FRIENDS: t('privacyFriends'),
    FOLLOWER_OF_CREATOR: t('privacyFollowers'),
    SELF_ONLY: t('privacyPrivate'),
  };
  tiktokPrivacy.replaceChildren(...(tiktokCreatorInfo.privacyLevels || []).map((level) => {
    const option = document.createElement('option');
    option.value = level.value;
    option.textContent = privacyLabels[level.value] || level.label || level.value;
    return option;
  }));
  if ([...tiktokPrivacy.options].some((option) => option.value === 'PUBLIC_TO_EVERYONE')) {
    tiktokPrivacy.value = 'PUBLIC_TO_EVERYONE';
  }

  const settings = tiktokCreatorInfo.postingLimits?.interactionSettings || {};
  [['tiktokAllowComments', 'allow_comment'], ['tiktokAllowDuet', 'allow_duet'], ['tiktokAllowStitch', 'allow_stitch']].forEach(([id, key]) => {
    const input = document.getElementById(id);
    const setting = settings[key];
    if (input) {
      input.checked = Boolean(setting && setting.default);
      input.disabled = Boolean(setting && setting.enabled === false);
    }
  });

  const commercialSelect = document.getElementById('tiktokCommercialType');
  if (commercialSelect) {
    const commercialLabels = { none: t('commercialNone'), brand_organic: t('commercialOwnBrand'), brand_content: t('commercialPartner') };
    commercialSelect.replaceChildren(...(tiktokCreatorInfo.commercialContentTypes || [{ value: 'none' }]).map((item) => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = commercialLabels[item.value] || item.label || item.value;
      return option;
    }));
  }
  updateTikTokPrivacyNote();
}

function updateTikTokPrivacyNote() {
  if (tiktokDraftNote && tiktokPrivacy) {
    tiktokDraftNote.classList.toggle('hidden', tiktokPrivacy.value === 'PUBLIC_TO_EVERYONE');
  }
}

async function refreshTikTokStatus() {
  if (!tiktokAccountStatus || !tiktokConnectBtn || !tiktokPublishForm) return;
  tiktokAccountStatus.textContent = t('checkingTikTok');
  tiktokPublishForm.classList.add('hidden');
  tiktokConnectBtn.classList.add('hidden');
  try {
    const data = await tiktokApi('/api/tiktok/status');
    if (!data.connected) {
      tiktokAccountStatus.textContent = t('connectHint');
      tiktokConnectBtn.classList.remove('hidden');
      return;
    }
    tiktokAccountId = data.account.id;
    tiktokCreatorInfo = data.creatorInfo;
    tiktokAccountStatus.textContent = `${t('connectedAs')} @${data.account.username}`;
    tiktokPublishForm.classList.remove('hidden');
    renderTikTokOptions();
  } catch (error) {
    tiktokAccountStatus.textContent = error.status === 401 ? t('authExpired') : (error.message || t('connectFailed'));
  }
}

async function openTikTokComposer() {
  if (!tiktokComposerOverlay) return;
  tiktokComposerOverlay.classList.remove('hidden');
  if (tiktokPublishStatus) tiktokPublishStatus.textContent = '';
  await refreshTikTokStatus();
}

if (publishTiktokBtn) publishTiktokBtn.addEventListener('click', openTikTokComposer);
if (tiktokConnectBtn) {
  tiktokConnectBtn.addEventListener('click', async () => {
    const authWindow = window.open('about:blank', '_blank');
    tiktokConnectBtn.disabled = true;
    tiktokAccountStatus.textContent = t('connecting');
    try {
      const data = await tiktokApi('/api/tiktok/connect');
      if (!authWindow) throw new Error(t('allowPopups'));
      authWindow.location.href = data.authUrl;
    } catch (error) {
      if (authWindow) authWindow.close();
      tiktokAccountStatus.textContent = error.status === 401 ? t('authExpired') : (error.message || t('connectFailed'));
    } finally {
      tiktokConnectBtn.disabled = false;
    }
  });
}

if (tiktokPrivacy) tiktokPrivacy.addEventListener('change', updateTikTokPrivacyNote);
if (tiktokCaption && tiktokCaptionCount) {
  tiktokCaption.addEventListener('input', () => {
    tiktokCaptionCount.textContent = `${tiktokCaption.value.length} / 2200`;
  });
}
if (tiktokComposerOverlay) {
  const closeTikTokComposer = () => tiktokComposerOverlay.classList.add('hidden');
  document.getElementById('tiktokModalClose').addEventListener('click', closeTikTokComposer);
  tiktokComposerOverlay.addEventListener('click', (event) => {
    if (event.target === tiktokComposerOverlay) closeTikTokComposer();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeTikTokComposer();
  });
  window.addEventListener('focus', () => {
    if (!tiktokComposerOverlay.classList.contains('hidden')) refreshTikTokStatus();
  });
}

if (tiktokPublishForm) {
  tiktokPublishForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!processedVideoBlob || !tiktokAccountId) return;
    tiktokSubmitBtn.disabled = true;
    try {
      if (tiktokPublishStatus) tiktokPublishStatus.textContent = t('uploading');
      const filename = (downloadBtn && downloadBtn.download) || 'ineasy-video.mp4';
      const upload = await tiktokApi('/api/tiktok/media/presign', {
        method: 'POST',
        body: JSON.stringify({ filename, contentType: 'video/mp4', size: processedVideoBlob.size }),
      });
      const uploaded = await tiktokApi(`/api/tiktok/media/upload/${encodeURIComponent(upload.uploadId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4' },
        body: processedVideoBlob,
      });

      if (tiktokPublishStatus) tiktokPublishStatus.textContent = t('publishing');
      const result = await tiktokApi('/api/tiktok/publish', {
        method: 'POST',
        body: JSON.stringify({
          accountId: tiktokAccountId,
          publicUrl: uploaded.publicUrl,
          content: tiktokCaption.value.trim(),
          privacyLevel: tiktokPrivacy.value,
          allowComment: document.getElementById('tiktokAllowComments').checked,
          allowDuet: document.getElementById('tiktokAllowDuet').checked,
          allowStitch: document.getElementById('tiktokAllowStitch').checked,
          madeWithAi: document.getElementById('tiktokMadeWithAi').checked,
          commercialContentType: document.getElementById('tiktokCommercialType').value,
          adsOnly: document.getElementById('tiktokAdsOnly').checked,
          confirmedPreview: document.getElementById('tiktokPreviewConfirmed').checked,
          consentGiven: document.getElementById('tiktokConsentGiven').checked,
        }),
      });
      if (tiktokPublishStatus) {
        const publishState = result.post?.status || result.post?.platforms?.[0]?.status;
        tiktokPublishStatus.textContent = result.draft
          ? t('draftSuccess')
          : publishState === 'published' ? t('publishSuccess') : t('publishPending');
      }
    } catch (error) {
      if (tiktokPublishStatus) {
        tiktokPublishStatus.textContent = error.status === 401 ? t('authExpired') : (error.message || t('publishFailed'));
      }
    } finally {
      tiktokSubmitBtn.disabled = false;
    }
  });
}

function setProcessingState(type, text) {
  if (!processingState) return;
  processingState.classList.remove('hidden');
  processingState.classList.toggle('completed', type === 'success');
  processingState.classList.toggle('failed', type === 'error');
  if (processingText) processingText.textContent = text;
}

function handleFile(file) {
  const isVideo = file && (file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name));
  if (!isVideo || file.size < 16 || file.size > 8 * 1024 ** 3) {
    setProcessingState('error', t('errorInvalidFile'));
    if (processBtn) processBtn.disabled = true;
    return;
  }

  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  if (processController) processController.abort();
  if (patchedDownloadUrl) URL.revokeObjectURL(patchedDownloadUrl);
  patchedDownloadUrl = null;
  processedVideoBlob = null;
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
    if (processController) processController.abort();
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    if (previewVideo) previewVideo.src = '';
    if (previewWrap) previewWrap.classList.remove('show');
    if (fileInput) fileInput.value = '';
    if (processBtn) processBtn.disabled = true;
    if (patchedDownloadUrl) URL.revokeObjectURL(patchedDownloadUrl);
    patchedDownloadUrl = null;
    processedVideoBlob = null;
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
    const sourceFile = fileInput.files[0];
    const controller = new AbortController();
    processController = controller;
    processBtn.disabled = true;
    if (cancelProcessBtn) cancelProcessBtn.disabled = false;
    if (processingState) {
      processingState.classList.remove('hidden');
      processingState.classList.remove('completed', 'failed');
    }
    if (processedResult) processedResult.classList.add('hidden');
    if (processingText) processingText.textContent = t('loadingText');
    if (processingProgress) processingProgress.style.width = '';

    try {
      const { downscaleVideo } = await import('https://compressbase.com/method-api/downscale.mjs');
      const scaledVideo = await downscaleVideo(sourceFile, {
        signal: controller.signal,
        onProgress: (fraction) => {
          if (!processingProgress) return;
          const progress = Math.max(0, Math.min(1, Number(fraction) || 0));
          processingProgress.style.width = `${progress * 95}%`;
        },
        onStatus: (message) => {
          if (processingText) processingText.textContent = localizePatchStatus(message);
        },
      });
      controller.signal.throwIfAborted();
      if (processingProgress) processingProgress.style.width = '95%';

      const { patchVideo } = await import('https://compressbase.com/method-api/client.mjs');
      const outputBlob = await patchVideo(scaledVideo, {
        signal: controller.signal,
        onStatus: (message) => {
          if (processingText) processingText.textContent = localizePatchStatus(message);
        },
      });

      processedVideoBlob = outputBlob;
      patchedDownloadUrl = URL.createObjectURL(outputBlob);
      if (downloadBtn) {
        downloadBtn.href = patchedDownloadUrl;
        downloadBtn.download = `${sourceFile.name.replace(/\.[^.]+$/, '')}-ineasy.mp4`;
      }

      if (processingText) processingText.textContent = t('successText');
      if (processingProgress) processingProgress.style.width = '100%';
      if (processingState) processingState.classList.add('completed');
      if (processedResult) processedResult.classList.remove('hidden');
      loadPatchCount();
    } catch (error) {
      if (processingState) processingState.classList.add('failed');
      if (processingText) processingText.textContent = controller.signal.aborted ? t('processingCancelled') : localizePatchError(error.message);
      if (processingProgress) processingProgress.style.width = '0%';
      processBtn.disabled = false;
    } finally {
      processController = null;
      if (cancelProcessBtn) cancelProcessBtn.disabled = true;
    }
  });
}

if (cancelProcessBtn) cancelProcessBtn.addEventListener('click', () => processController?.abort());

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
    { test: /up to 8 GiB/i, ru: 'Выберите поддерживаемое видео размером до 8 GiB.', kk: 'Өлшемі 8 GiB-ке дейін қолдау көрсетілетін бейне таңдаңыз.', en: 'Choose a supported video up to 8 GiB.' },
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
