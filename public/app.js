document.addEventListener('DOMContentLoaded', () => {
  const giveawayToastClose = document.getElementById('giveawayToastClose');
  const giveawayToast = document.getElementById('giveawayToast');
  if (giveawayToastClose && giveawayToast) {
    giveawayToastClose.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      giveawayToast.hidden = true;
      giveawayToast.remove();
    });
  }
});

// --- Auth + layout ---
function getBrowserValue(key) {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value;
  } catch (error) {}
  try { return sessionStorage.getItem(key); } catch (error) { return null; }
}

function setBrowserValue(key, value) {
  try {
    localStorage.setItem(key, value);
    return;
  } catch (error) {}
  try { sessionStorage.setItem(key, value); } catch (error) {}
}

function removeBrowserValue(key) {
  try { localStorage.removeItem(key); } catch (error) {}
  try { sessionStorage.removeItem(key); } catch (error) {}
}

const PATCHER_TEST_MODE = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname) &&
  new URLSearchParams(window.location.search).get('patcher-test') === '1';
const tgId = getBrowserValue('tg_id') || (PATCHER_TEST_MODE ? 'LOCAL-TEST' : '');
const tgAuthToken = getBrowserValue('tg_auth_token');

if ((!tgId || !tgAuthToken) && !PATCHER_TEST_MODE) {
  window.location.href = '/login';
}

const STATE = {
  lang: getBrowserValue('ineasy-language') || 'en',
};
let tiktokCreatorInfo = null;
let tiktokAccountId = null;
const TIKTOK_CAPTION_SUFFIX = '@ineasybot или ineasy.site(веб сайт)\n#ineasybot';

const translations = {
  en: {
    id: 'ID:',
    balance: 'Balance:',
    logout: 'Log out',
    packages: 'Paid packages',
    packageHint: 'Click “Buy” to open @ineasybot and receive payment details.',
    buy: 'Buy',
    nav: ['HOME', 'PATCHER', 'VIDEO CHECK', 'FAQ'],
    homeKicker: 'INEASY  ·  VIDEO OPTIMIZATION',
    homeTitle: 'EVERY FRAME. READY TO SHINE.',
    homeIntro: 'A polished final step before TikTok: prepare your finished edit in a clean, guided workflow right in your browser.',
    homeCta: 'Go to processing',
    comparisonKicker: 'QUALITY',
    comparisonTitle: 'See the result: patched vs. unpatched',
    comparisonIntro: 'Drag the divider to compare the image.',
    comparisonDisclaimer: 'Visual illustration only, not a preview of a specific processed video. TikTok controls the final published quality.',
    workflowKicker: 'THREE STEPS',
    workflowTitle: 'From edit to post',
    stepOneTitle: 'Start with your finished edit',
    stepOneBody: 'Add your final cut after music, captions, and effects are in place.',
    stepTwoTitle: 'Process in one tap',
    stepTwoBody: 'INEASY prepares the compatible file in your browser and verifies the finished output.',
    stepThreeTitle: 'Download. Publish. Done.',
    stepThreeBody: 'Download your result or open the publishing panel to send it to TikTok.',
    localProcessingCopy: 'Your video stays on your device. Patcher preserves the source frame rate and resolution. HDR/SDR metadata is validated without re-encoding.',
    homeBottomCta: 'Start processing',
    faqLabel: 'FAQ / FREQUENTLY ASKED QUESTIONS',
    analyzerEyebrow: 'VIDEO ANALYZER',
    videos: 'videos',
    report: 'Report',
    patchTitle: 'Optimize video up to 4K • 120 FPS.',
    patchSub: 'Supports source videos up to 4K / 120 FPS. Recommended source bitrate: 15–45 Mbps.',
    choose: 'Drop your video here',
    chooseSub: 'MP4, MOV and M4V videos (up to 4K / 120 FPS)',
    localNote: 'Supports source videos up to 4K / 120 FPS • recommended bitrate 15–45 Mbps.',
    exportNote: 'Your video is ready to process — tap “Process video”, then publish it to TikTok.',
    fpsPolicyNote: 'TikTok may change video quality after upload.',
    patcherNoteV1: 'V1 is the standard mode for everyday use. V2 is for testing only and is not intended for regular processing.',
    patcherNoteV2: 'V2 is for testing only. It is not intended for everyday use.',
    fpsAdvice: 'V1 is the recommended mode for regular processing.',
    fps30Rejected: 'This video cannot be processed. Choose another file.',
    fpsInspectUnavailable: 'Could not read video details. The file will be checked during processing.',
    choosePostingDevice: 'Choose your device before processing.',
    communityTitle: 'Join our giveaway channel',
    communityBody: 'News, updates and giveaways in our Telegram channel.',
    newsText: 'Tutorials, updates, and giveaways',
    newsButton: 'View',
    process: 'Process video',
    progressLabel: 'Loading',
    uhdWait: '4K video processing can take 1–2 minutes. Please wait.',
    ready: 'Your video is ready',
    readySub: 'Video processed',
    compatibilityNote: 'TikTok-compatible target: 1080p • 60 FPS • H.264 (AVC) or H.265 (HEVC). Actual output details are shown above.',
    previewMeta: '1080p',
    optimizeAnother: 'Optimize another video',
    download: 'Download',
    publishTikTok: 'Post on site (easy)',
    publishTikTokStudio: 'Open TikTok Studio',
    autopostHint: 'Quick auto-post with Zernio',
    tiktokStudioHint: 'Official TikTok upload. Posting on site is usually faster.',
    autopostScrollHint: 'The publishing section is below. Scroll down to continue.',
    publishNow: 'Publish now',
    scheduleSubmit: 'Schedule post',
    publishTitle: 'Publish to TikTok',
    connectTikTok: 'Connect TikTok account',
    checkingTikTok: 'Checking your Zernio connection…',
    connectedAs: 'Online ·',
    uploadNotice: 'Your processed video will be uploaded to your TikTok account through Zernio.',
    uploadFailed: 'The video upload failed. Please try again.',
    zernioMp4Required: 'Auto-post accepts MP4 or MOV with H.264 or HEVC video. The video is not re-encoded.',
    connectHint: 'No TikTok account is linked to this Zernio key. Link it in Zernio, then reopen this section.',
    connectFailed: 'Could not verify your Zernio connection.',
    zernioConnectCopy: 'Connect your Zernio API key to publish from your TikTok account.',
    zernioKeyLabel: 'Zernio API key',
    zernioKeyPlaceholder: 'Paste your Zernio API key here',
    zernioGetApiKey: 'Get API key',
    zernioSaveKey: 'Connect Zernio',
    zernioChangeKey: 'Change API key',
    zernioKeyHint: 'Your key is encrypted on the server and never saved in this browser.',
    zernioKeyRequired: 'Enter your Zernio API key first.',
    invalidZernioKey: 'That Zernio API key is invalid. Check it and try again.',
    zernioKeySaved: 'Zernio API key saved. Checking for your TikTok account…',
    zernioConnectFailed: 'Could not connect to Zernio. Check the API key and try again.',
    popupBlocked: 'Allow pop-ups for this site to connect TikTok.',
    captionLabel: 'Description',
    captionHint: '#hashtags  @mentions',
    privacyLabel: 'Who can see this video?',
    privacyPublic: 'Everyone',
    privacyFriends: 'Friends',
    privacyPrivate: 'Only you',
    privacyDescription: 'Choose who can see your post',
    privacyUnavailable: 'TikTok does not allow every visibility option for this account.',
    interactionsTitle: 'Interactions',
    interactionsDescription: 'Choose what viewers can do with your video',
    commentsLabel: 'Allow comments',
    duetLabel: 'Allow duet',
    stitchLabel: 'Allow Stitch',
    aiLabel: 'AI-generated content',
    commercialLabel: 'Commercial content disclosure',
    commercialNone: 'None',
    commercialOwnBrand: 'Your brand',
    commercialPartner: 'Paid partnership',
    scheduleTitle: 'When should it post?',
    scheduleNow: 'Post now',
    scheduleLater: 'Schedule for later',
    scheduledForLabel: 'Date and time',
    timezoneHint: 'Times use {timezone}.',
    scheduleInvalid: 'Choose a future date and time.',
    consentLabel: 'I confirm I have the rights to this video and music, allow copyright checks, and agree to TikTok’s posting rules.',
    draftNotice: 'The selected privacy setting will be applied when this video is published.',
    connecting: 'Opening TikTok sign-in…',
    uploading: 'Uploading video…',
    publishing: 'Publishing to TikTok…',
    publishSuccess: 'Video published to TikTok.',
    publishScheduled: 'Video scheduled for publishing.',
    publishPending: 'TikTok accepted the video and is processing the post.',
    draftSuccess: 'Draft sent to TikTok. Finish visibility and publishing in the TikTok app.',
    publishFailed: 'TikTok could not publish this video. Check the options and try again.',
    authExpired: 'Your session expired. Sign in again to publish.',
    close: 'Close',
    notice: 'If the duration displays as 0:00, check the downloaded MP4 in a separate video player before publishing.',
    analyzerTitle: 'Video Analyzer',
    analyzerDesc: 'Check the parameters of your published video and compare them with the original file.',
    analyzerButton: 'Analyze video',
    analyzerLabel: 'Video link',
    analyzerPlaceholder: 'Paste TikTok link',
    analyzerSubmit: 'Analyze',
    analyzerLoading: 'Analyzing your video…',
    analyzerDone: 'Analysis complete',
    analyzerError: 'Could not verify this link. Make sure the video is public.',
    analyzerSource: 'Checking link',
    analyzerAuthor: 'Creator',
    analyzerRegion: 'Upload region',
    analyzerRegionUnavailable: 'Not provided by TikTok',
    analyzerSize: 'File size',
    analyzerDuration: 'Duration',
    faqTitle: 'Frequently asked questions',
    faqSupportText: 'Found a bug?',
    faqReport: 'Report',
    footerSupport: 'Support',
    footerHome: 'Home',
    footerFaq: 'FAQ',
    footerTelegram: 'Telegram',
    footerDesc: 'Prepare your video. Preserve its quality. Publish with confidence.',
    remove: 'Remove',
    selectFile: 'Select video',
    fileName: 'Selected file',
    packageLabel: 'Video package',
    errorInvalidFile: 'Choose a supported video file.',
    videoTooLarge: 'Video exceeds the 150 MB limit. Choose a smaller file.',
    readingVideoMetadata: 'Reading video details…',
    loadingVideoData: 'Preparing video for local processing…',
    analyzingVideo: 'Analyzing video…',
    patchingVideo: 'Applying video patch…',
    videoDimensionsUnavailable: 'Could not read the video resolution. Try exporting it as MP4.',
    formatConversionFailed: 'This video format or codec is not supported by this browser. Try MP4, MOV, or another H.264 video.',
    cancel: 'Cancel',
    processingCancelled: 'Processing cancelled.',
    processingTimedOut: 'Processing took longer than 20 minutes. Try a shorter video.',
    videoTooLong: 'Choose a video that is 1 minute or shorter.',
    videoDurationUnavailable: 'Could not read this video duration. Try an MP4 file.',
    noBalance: 'No videos remain in your balance. Add videos to continue.',
    balanceCheckFailed: 'Could not refresh your balance. Please try again.',
    noCreditsTitle: 'You are out of video credits',
    noCreditsText: 'Add credits to process another video.',
    buyOnSite: 'Buy on the site',
    buyInTelegram: 'Buy in Telegram',
    inviteOnSite: 'Invite a friend',
    balanceUpdateFailed: 'The video was patched, but the balance could not be updated. Contact support before processing again.',
    successText: 'Done. Video and audio stayed on your device; only MP4 metadata was sent.',
    checkResult: 'Result',
    quality: 'Quality',
    fps: 'Frame rate',
    codec: 'Codec',
    bitrate: 'Bitrate',
    close: 'Close',
    noData: '—',
    faq: [
      ['What does INEASY Patcher do?', 'INEASY Patcher automatically prepares your video before publishing it to TikTok. It analyzes the source file and applies optimized processing parameters designed to minimize noticeable quality loss after upload.'],
      ['Which export settings should I use?', 'Patcher selects its processing settings automatically. For a clean source, use vertical MP4 at 1080p and 60 FPS with a 6–10 Mbps bitrate. In TikTok, enable Upload HD before publishing.'],
      ['Does Patcher improve video quality?', 'Patcher is not a traditional AI upscaler and does not turn a low-quality video into native 4K. Its purpose is to prepare your original video correctly and preserve as much of its existing quality as possible during processing.'],
      ['Why shouldn’t I edit the video after processing?', 'The processed file is intended to be the final version. Re-editing, applying filters or exporting the video again can change its parameters and introduce additional quality loss. Use the processed file as your final upload.'],
      ['Should I export the video again from CapCut or another editor?', 'No. If you need music, text, effects or other edits, add them before processing the video with Patcher. Do not export the processed file again.'],
      ['How do I prepare a video for TikTok?', '1. Sign in to INEASY.\n2. Finish editing your source video and export it before using Patcher.\n3. Upload it and select “Process video”.\n4. Wait for processing, then download the result.\n5. Do not edit or export the processed file again; avoid sending it through apps that recompress video.\n6. In TikTok, turn on Upload HD under More options and publish the processed file.\n7. After posting, paste the public link into Video Analyzer to review the delivered parameters.'],
      ['Does Patcher completely disable TikTok compression?', 'No. TikTok processes uploaded content on its own systems. Patcher cannot disable TikTok’s internal processing. Its purpose is to prepare the video with optimized parameters designed to minimize noticeable quality loss after publishing.']
    ],
  },
  ru: {
    id: 'ID:',
    balance: 'Баланс:',
    logout: 'Выйти',
    packages: 'Платные пакеты',
    packageHint: 'Нажмите «Купить» — откроется бот @ineasybot, он пришлёт реквизиты для оплаты.',
    buy: 'Купить',
    nav: ['ГЛАВНАЯ', 'ПАТЧЕР', 'ПРОВЕРКА ВИДЕО', 'FAQ'],
    homeKicker: 'INEASY  ·  ОПТИМИЗАЦИЯ ВИДЕО',
    homeTitle: 'КАЖДЫЙ КАДР. ПОД КОНТРОЛЕМ.',
    homeIntro: 'Профессиональный финальный этап перед TikTok: подготовьте готовый ролик в браузере — без сложных настроек и лишних шагов.',
    homeCta: 'Перейти к обработке',
    comparisonKicker: 'КАЧЕСТВО',
    comparisonTitle: 'Смотрите результат: с патчингом и без патчинга',
    comparisonIntro: 'Потяните разделитель, чтобы сравнить изображение.',
    comparisonDisclaimer: 'Визуальный пример, а не предпросмотр результата обработки конкретного видео. Итоговое качество публикации зависит от TikTok.',
    workflowKicker: 'ТРИ ШАГА',
    workflowTitle: 'От монтажа до публикации',
    stepOneTitle: 'Загрузите готовый ролик',
    stepOneBody: 'Сначала завершите монтаж — добавьте звук, подписи и эффекты. Затем выберите итоговый файл.',
    stepTwoTitle: 'Обработайте одним нажатием',
    stepTwoBody: 'INEASY подготовит совместимый файл прямо в браузере и проверит результат перед скачиванием.',
    stepThreeTitle: 'Скачайте и публикуйте',
    stepThreeBody: 'Сохраните готовый файл или откройте блок публикации, чтобы отправить ролик в TikTok.',
    localProcessingCopy: 'Видео остаётся на устройстве. Патчер сохраняет исходные FPS и разрешение. Метаданные HDR/SDR проверяются без перекодирования.',
    homeBottomCta: 'Начать обработку',
    faqLabel: 'FAQ / ЧАСТЫЕ ВОПРОСЫ',
    analyzerEyebrow: 'АНАЛИЗАТОР ВИДЕО',
    videos: 'видео',
    report: 'Сообщить',
    patchTitle: 'Оптимизируйте видео до 4K • 120 FPS.',
    patchSub: 'Поддержка исходников до 4K / 120 FPS. Рекомендуемый исходный битрейт — 15–45 Мбит/с.',
    choose: 'Перетащите видео сюда',
    chooseSub: 'Видео MP4, MOV и M4V (до 4K / 120 FPS)',
    localNote: 'Поддержка исходников до 4K / 120 FPS • рекомендуемый битрейт 15–45 Мбит/с.',
    exportNote: 'Ваше видео готово к обработке — нажмите «Обработать видео», а затем опубликуйте его в TikTok.',
    fpsPolicyNote: 'TikTok может изменить качество видео после загрузки.',
    patcherNoteV1: 'V1 — обычный режим, выбирайте его для повседневной обработки. V2 — только для тестирования, не для обычного использования.',
    patcherNoteV2: 'V2 — тестовый режим. Используйте его только для тестирования; для обычного использования он не предназначен.',
    fpsAdvice: 'Для обычной обработки используйте V1.',
    fps30Rejected: 'Не удалось подготовить это видео. Выберите другой файл.',
    fpsInspectUnavailable: 'Не удалось прочитать параметры видео. Файл будет проверен при обработке.',
    choosePostingDevice: 'Перед обработкой выберите устройство.',
    communityTitle: 'Канал с розыгрышами',
    communityBody: 'Подписывайтесь на канал, чтобы не пропускать новости и розыгрыши.',
    newsText: 'Новости и розыгрыши',
    newsButton: 'Смотреть',
    process: 'Обработать видео',
    progressLabel: 'Загрузка',
    uhdWait: 'Обработка видео 4K может занять 1–2 минуты. Пожалуйста, подождите.',
    ready: 'Ваше видео готово',
    readySub: 'Видео обработано',
    compatibilityNote: 'Совместимый формат для TikTok: 1080p • 60 FPS • H.264 (AVC) или H.265 (HEVC). Фактические параметры результата указаны выше.',
    previewMeta: '1080p',
    optimizeAnother: 'Оптимизировать другое видео',
    download: 'Скачать',
    publishTikTok: 'Пост в сайте (легкий)',
    publishTikTokStudio: 'Открыть TikTok Studio',
    autopostHint: 'Быстрая публикация через Zernio',
    tiktokStudioHint: 'Официальная загрузка TikTok. Публикация на сайте обычно быстрее.',
    autopostScrollHint: 'Раздел публикации ниже. Прокрутите страницу вниз.',
    publishNow: 'Опубликовать сейчас',
    scheduleSubmit: 'Запланировать публикацию',
    publishTitle: 'Публикация в TikTok',
    connectTikTok: 'Подключить аккаунт TikTok',
    checkingTikTok: 'Проверяем подключение к Zernio…',
    connectedAs: 'В сети ·',
    uploadNotice: 'Обработанное видео будет загружено в ваш TikTok через Zernio.',
    uploadFailed: 'Не удалось загрузить видео. Попробуйте ещё раз.',
    zernioMp4Required: 'Автопост принимает MP4 и MOV с видео H.264 или HEVC. Видео не перекодируется.',
    connectHint: 'Аккаунт TikTok для этого ключа Zernio не найден. Подключите его в Zernio и откройте этот раздел снова.',
    connectFailed: 'Не удалось проверить подключение к Zernio.',
    zernioConnectCopy: 'Подключите API-ключ Zernio для публикации в своём аккаунте TikTok.',
    zernioKeyLabel: 'API-ключ Zernio',
    zernioKeyPlaceholder: 'Вставьте сюда API-ключ Zernio',
    zernioGetApiKey: 'Получить API-ключ',
    zernioSaveKey: 'Подключить Zernio',
    zernioChangeKey: 'Изменить API-ключ',
    zernioKeyHint: 'Ключ шифруется на сервере и не сохраняется в этом браузере.',
    zernioKeyRequired: 'Сначала введите API-ключ Zernio.',
    invalidZernioKey: 'API-ключ Zernio не подошёл. Проверьте его и попробуйте ещё раз.',
    zernioKeySaved: 'API-ключ Zernio сохранён. Проверяем аккаунт TikTok…',
    zernioConnectFailed: 'Не удалось подключиться к Zernio. Проверьте API-ключ.',
    popupBlocked: 'Разрешите всплывающие окна для подключения TikTok.',
    captionLabel: 'Описание',
    captionHint: '#хештеги  @упоминания',
    privacyLabel: 'Кто может увидеть это видео?',
    privacyPublic: 'Все',
    privacyFriends: 'Друзья',
    privacyPrivate: 'Только я',
    privacyDescription: 'Выберите, кто увидит публикацию',
    privacyUnavailable: 'TikTok ограничил варианты видимости для этого аккаунта.',
    interactionsTitle: 'Взаимодействия',
    interactionsDescription: 'Разрешите зрителям взаимодействовать с видео',
    commentsLabel: 'Разрешить комментарии',
    duetLabel: 'Разрешить дуэты',
    stitchLabel: 'Разрешить склейку (Stitch)',
    aiLabel: 'Контент создан с помощью ИИ',
    commercialLabel: 'Маркировка коммерческого контента',
    commercialNone: 'Нет',
    commercialOwnBrand: 'Продвижение своего бренда',
    commercialPartner: 'Платное партнёрство',
    scheduleTitle: 'Когда опубликовать?',
    scheduleNow: 'Сейчас',
    scheduleLater: 'Запланировать',
    scheduledForLabel: 'Дата и время публикации',
    timezoneHint: 'Часовой пояс: {timezone}.',
    scheduleInvalid: 'Выберите будущие дату и время.',
    consentLabel: 'Подтверждаю права на видео и музыку, разрешаю проверку авторских прав и принимаю правила публикации TikTok.',
    draftNotice: 'Выбранные настройки приватности применятся при публикации видео.',
    connecting: 'Открываем вход в TikTok…',
    uploading: 'Загружаем видео…',
    publishing: 'Публикуем в TikTok…',
    publishSuccess: 'Видео опубликовано в TikTok.',
    publishScheduled: 'Публикация запланирована.',
    publishPending: 'TikTok принял видео и обрабатывает публикацию.',
    draftSuccess: 'Черновик отправлен в TikTok. Завершите настройку видимости и публикацию в приложении TikTok.',
    publishFailed: 'Не удалось опубликовать видео в TikTok. Проверьте настройки и попробуйте снова.',
    authExpired: 'Сессия истекла. Войдите снова, чтобы опубликовать видео.',
    close: 'Закрыть',
    notice: 'Если длительность отображается как 0:00, проверьте скачанный MP4 в отдельном видеоплеере перед публикацией.',
    analyzerTitle: 'Анализатор видео',
    analyzerDesc: 'Проверьте параметры опубликованного видео и сравните их с исходным файлом.',
    analyzerButton: 'Проверить видео',
    analyzerLabel: 'Ссылка на видео',
    analyzerPlaceholder: 'Вставьте ссылку',
    analyzerSubmit: 'Проверить видео',
    analyzerLoading: 'Анализируем ваше видео…',
    analyzerDone: 'Проверка завершена',
    analyzerError: 'Не удалось проверить ссылку. Убедитесь, что видео открыто публично.',
    analyzerSource: 'Проверяем ссылку',
    analyzerAuthor: 'Автор',
    analyzerRegion: 'Регион публикации',
    analyzerRegionUnavailable: 'TikTok не передал данные',
    analyzerSize: 'Размер файла',
    analyzerDuration: 'Длительность',
    faqTitle: 'Ответы на частые вопросы',
    faqSupportText: 'Заметили ошибку?',
    faqReport: 'Сообщить',
    footerSupport: 'Поддержка',
    footerHome: 'Главная',
    footerFaq: 'FAQ',
    footerTelegram: 'Telegram',
    footerDesc: 'Подготовьте видео. Сохраните качество. Публикуйте уверенно.',
    remove: 'Убрать',
    selectFile: 'Выберите видео',
    fileName: 'Выбранный файл',
    packageLabel: 'Пакет видео',
    errorInvalidFile: 'Выберите поддерживаемый видеофайл.',
    videoTooLarge: 'Видео больше лимита 150 МБ. Выберите файл меньшего размера.',
    readingVideoMetadata: 'Читаем параметры видео…',
    loadingVideoData: 'Подготавливаем видео к локальной обработке…',
    analyzingVideo: 'Анализируем видео…',
    patchingVideo: 'Применяем патчер…',
    videoDimensionsUnavailable: 'Не удалось прочитать разрешение видео. Попробуйте экспортировать его в MP4.',
    formatConversionFailed: 'Браузер не поддерживает этот формат или кодек. Попробуйте MP4, MOV или видео H.264.',
    cancel: 'Отмена',
    processingCancelled: 'Обработка отменена.',
    processingTimedOut: 'Обработка длится больше 20 минут. Попробуйте более короткое видео.',
    videoTooLong: 'Выберите видео длительностью не более 1 минуты.',
    videoDurationUnavailable: 'Не удалось определить длительность видео. Попробуйте файл MP4.',
    noBalance: 'На балансе не осталось обработок. Пополните его, чтобы продолжить.',
    balanceCheckFailed: 'Не удалось проверить баланс. Попробуйте ещё раз.',
    noCreditsTitle: 'Лимиты закончились',
    noCreditsText: 'Пополните баланс, чтобы снова обрабатывать видео.',
    buyOnSite: 'Купить на сайте',
    buyInTelegram: 'Купить в Telegram',
    inviteOnSite: '👥 Пригласить друга',
    balanceUpdateFailed: 'Видео обработано, но баланс не удалось обновить. Перед повторной обработкой обратитесь в поддержку.',
    successText: 'Готово. Видео и аудио не отправлялись; сервис получил только метаданные MP4.',
    checkResult: 'Результат проверки',
    quality: 'Качество',
    fps: 'Частота кадров',
    codec: 'Кодек',
    bitrate: 'Битрейт',
    close: 'Закрыть',
    noData: '—',
    faq: [
      ['Что делает INEASY Patcher?', 'INEASY Patcher автоматически подготавливает видео к публикации в TikTok. Он анализирует исходный файл и подбирает параметры обработки, чтобы свести к минимуму заметную потерю качества после загрузки.'],
      ['Какие настройки экспорта выбрать?', 'Параметры обработки INEASY подбирает автоматически. Для исходника подойдёт вертикальный MP4 в 1080p и 60 FPS с битрейтом 6–10 Мбит/с. Перед публикацией в TikTok включите Upload HD.'],
      ['Patcher улучшает качество видео?', 'Patcher — не AI-апскейлер: он не превращает видео низкого качества в исходное 4K. Его задача — правильно подготовить оригинал и по возможности сохранить его качество при обработке.'],
      ['Почему не следует редактировать видео после обработки?', 'Обработанный файл предназначен для публикации как финальная версия. Повторный монтаж, фильтры и экспорт могут изменить параметры и дополнительно снизить качество. Загружайте обработанный файл без изменений.'],
      ['Нужно ли повторно экспортировать видео из CapCut или другого редактора?', 'Нет. Добавьте музыку, текст, эффекты и другие изменения до обработки в Patcher. Не экспортируйте обработанный файл повторно.'],
      ['Как подготовить видео к публикации в TikTok?', '1. Войдите в INEASY.\n2. Завершите монтаж исходного видео и экспортируйте его до обработки в Patcher.\n3. Загрузите видео и нажмите «Обработать видео».\n4. Дождитесь завершения и скачайте результат.\n5. Не редактируйте и не экспортируйте обработанный файл повторно; не пересылайте его через приложения, которые повторно сжимают видео.\n6. В TikTok откройте «Дополнительные настройки», включите Upload HD и опубликуйте обработанный файл.\n7. После публикации вставьте открытую ссылку в анализатор видео, чтобы проверить параметры ролика.'],
      ['Patcher полностью отключает сжатие TikTok?', 'Нет. TikTok обрабатывает загруженные видео на своих серверах. Patcher не может отключить внутреннюю обработку TikTok. Его задача — подготовить видео с оптимальными параметрами и свести к минимуму заметную потерю качества после публикации.']
    ],
  },
  kk: {
    id: 'ID:',
    balance: 'Баланс:',
    logout: 'Шығу',
    packages: 'Ақылы пакеттер',
    packageHint: '«Сатып алу» түймесін басыңыз — бот @ineasybot сізге төлем реквизиттерін жіберетін болады.',
    buy: 'Сатып алу',
    nav: ['БАСТЫ', 'ПАТЧЕР', 'БЕЙНЕНІ ТЕКСЕРУ', 'FAQ'],
    homeKicker: 'INEASY  ·  БЕЙНЕНІ ОҢТАЙЛАНДЫРУ',
    homeTitle: 'ӘР КАДР. ТОЛЫҚ БАҚЫЛАУДА.',
    homeIntro: 'TikTok алдында бейнеңізді браузерде оңтайландырыңыз: қарапайым қадамдар, түсінікті процесс және дайын нәтижені жүктеу.',
    homeCta: 'Өңдеуге өту',
    comparisonKicker: 'САПА',
    comparisonTitle: 'Патчпен және патчсыз нәтижені салыстырыңыз',
    comparisonIntro: 'Суретті салыстыру үшін бөлгішті жылжытыңыз.',
    comparisonDisclaimer: 'Бұл тек көрнекі мысал, нақты өңделген видеоның алдын ала көрінісі емес. Жарияланған видеоны TikTok өзі өңдейді.',
    workflowKicker: 'ҮШ ҚАДАМ',
    workflowTitle: 'Монтаждан жариялауға дейін',
    stepOneTitle: 'Дайын бейнені жүктеңіз',
    stepOneBody: 'Алдымен монтажды аяқтаңыз: музыка, жазулар мен әсерлерді қосып, дайын файлды таңдаңыз.',
    stepTwoTitle: 'Бір рет басып өңдеңіз',
    stepTwoBody: 'INEASY үйлесімді файлды браузерде дайындап, жүктемес бұрын нәтижені тексереді.',
    stepThreeTitle: 'Жүктеп, жариялаңыз',
    stepThreeBody: 'Дайын файлды жүктеңіз немесе TikTok-қа жіберу үшін жариялау бөлімін ашыңыз.',
    localProcessingCopy: 'Бейне құрылғыңызда қалады. Патчер бастапқы FPS пен ажыратымдылықты сақтайды. HDR/SDR метадеректері қайта кодтаусыз тексеріледі.',
    homeBottomCta: 'Өңдеуді бастау',
    faqLabel: 'FAQ / ЖИІ ҚОЙЫЛАТЫН СҰРАҚТАР',
    analyzerEyebrow: 'БЕЙНЕ АНАЛИЗАТОРЫ',
    videos: 'бейне',
    report: 'Хабарлау',
    patchTitle: 'Бейнені 4K • 120 FPS дейін оңтайландырыңыз.',
    patchSub: '4K / 120 FPS дейінгі бастапқы бейнелерге қолдау бар. Ұсынылатын бастапқы битрейт: 15–45 Мбит/с.',
    choose: 'Видеоны осында сүйреп әкеліңіз',
    chooseSub: 'MP4, MOV және M4V бейнелері (4K / 120 FPS дейін)',
    localNote: '4K / 120 FPS дейінгі бастапқы бейнелерге қолдау бар • ұсынылатын битрейт 15–45 Мбит/с.',
    exportNote: 'Бейнеңіз өңдеуге дайын — «Бейнені өңдеу» түймесін басып, TikTok-та жариялаңыз.',
    fpsPolicyNote: 'TikTok жүктегеннен кейін бейне сапасын өзгертуі мүмкін.',
    patcherNoteV1: 'V1 — күнделікті өңдеуге арналған қалыпты режим. V2 — тек сынақ үшін, күнделікті қолдануға арналмаған.',
    patcherNoteV2: 'V2 — тек сынақ режимі. Ол күнделікті қолдануға арналмаған.',
    fpsAdvice: 'Қалыпты өңдеу үшін V1 нұсқасын пайдаланыңыз.',
    fps30Rejected: 'Бұл бейнені өңдеу мүмкін болмады. Басқа файл таңдаңыз.',
    fpsInspectUnavailable: 'Бейне параметрлерін оқу мүмкін болмады. Файл өңдеу кезінде тексеріледі.',
    choosePostingDevice: 'Өңдемес бұрын құрылғыны таңдаңыз.',
    communityTitle: 'Ұтыс ойындары бар арна',
    communityBody: 'Жаңалықтар мен ұтыс ойындарын жіберіп алмаңыз.',
    newsText: 'Туториалдар, жаңартулар және ұтыс ойындары',
    newsButton: 'Көру',
    process: 'Бейнені өңдеу',
    progressLabel: 'Жүктелуде',
    uhdWait: '4K бейнесін өңдеу 1–2 минутқа созылуы мүмкін. Күте тұрыңыз.',
    ready: 'Бейнеңіз дайын',
    readySub: '1080p • 60 FPS',
    previewMeta: '1080p • 60 FPS',
    optimizeAnother: 'Басқа бейнені оңтайландыру',
    download: 'Жүктеу',
    publishTikTok: 'Сайтқа жариялау (жеңіл)',
    publishTikTokStudio: 'TikTok Studio ашу',
    autopostHint: 'Zernio арқылы жылдам жариялау',
    tiktokStudioHint: 'TikTok-тың ресми жүктеу беті. Сайт арқылы жариялау әдетте жылдамырақ.',
    autopostScrollHint: 'Жариялау бөлімі төменде. Жалғастыру үшін төмен қарай айналдырыңыз.',
    publishNow: 'Қазір жариялау',
    scheduleSubmit: 'Жариялауды жоспарлау',
    publishTitle: 'TikTok-қа жариялау',
    connectTikTok: 'TikTok аккаунтын қосу',
    checkingTikTok: 'Zernio байланысын тексеріп жатырмыз…',
    connectedAs: 'Желіде ·',
    uploadNotice: 'Өңделген бейне Zernio арқылы TikTok аккаунтыңызға жүктеледі.',
    uploadFailed: 'Бейне жүктелмеді. Қайталап көріңіз.',
    zernioMp4Required: 'Автожариялау H.264 немесе HEVC бейнесі бар MP4 және MOV форматтарын қабылдайды. Бейне қайта кодталмайды.',
    connectHint: 'Бұл Zernio кілтіне TikTok аккаунты қосылмаған. Оны Zernio ішінде қосып, осы бөлімді қайта ашыңыз.',
    connectFailed: 'Zernio байланысын тексеру мүмкін болмады.',
    zernioConnectCopy: 'TikTok аккаунтыңыздан жариялау үшін Zernio API кілтін қосыңыз.',
    zernioKeyLabel: 'Zernio API кілті',
    zernioKeyPlaceholder: 'Zernio API кілтін осында енгізіңіз',
    zernioGetApiKey: 'API кілтін алу',
    zernioSaveKey: 'Zernio-ны қосу',
    zernioChangeKey: 'API кілтін өзгерту',
    zernioKeyHint: 'Кілт серверде шифрланады және браузерде сақталмайды.',
    zernioKeyRequired: 'Алдымен Zernio API кілтін енгізіңіз.',
    invalidZernioKey: 'Zernio API кілті жарамсыз. Тексеріп, қайталап көріңіз.',
    zernioKeySaved: 'Zernio API кілті сақталды. TikTok аккаунтын тексеріп жатырмыз…',
    zernioConnectFailed: 'Zernio-ға қосылу мүмкін болмады. API кілтін тексеріңіз.',
    popupBlocked: 'TikTok-ты қосу үшін қалқымалы терезелерге рұқсат беріңіз.',
    captionLabel: 'Сипаттама',
    captionHint: '#хештегтер  @белгілер',
    privacyLabel: 'Бұл жазбаны кім көре алады?',
    privacyPublic: 'Барлығы',
    privacyFriends: 'Достар',
    privacyPrivate: 'Тек мен',
    privacyDescription: 'Жазбаны кім көре алатынын таңдаңыз',
    privacyUnavailable: 'TikTok бұл аккаунт үшін кейбір көріну параметрлерін шектеді.',
    interactionsTitle: 'Әрекеттесу',
    interactionsDescription: 'Көрермендерге бейнемен әрекеттесуге рұқсат беріңіз',
    commentsLabel: 'Пікірлерге рұқсат беру',
    duetLabel: 'Дуэтке рұқсат беру',
    stitchLabel: 'Stitch арқылы біріктіруге рұқсат беру',
    aiLabel: 'ЖИ жасаған контент',
    commercialLabel: 'Коммерциялық контент белгісі',
    commercialNone: 'Жоқ',
    commercialOwnBrand: 'Өз брендіңіз',
    commercialPartner: 'Ақылы серіктестік',
    scheduleTitle: 'Қашан жариялансын?',
    scheduleNow: 'Қазір жариялау',
    scheduleLater: 'Кейінге жоспарлау',
    scheduledForLabel: 'Жариялау күні мен уақыты',
    timezoneHint: 'Уақыт белдеуі: {timezone}.',
    scheduleInvalid: 'Болашақ күн мен уақытты таңдаңыз.',
    consentLabel: 'Бұл бейне мен музыкаға құқығым бар екенін растаймын, авторлық құқықты тексеруге рұқсат беремін және TikTok жариялау ережелерін қабылдаймын.',
    draftNotice: 'Таңдалған құпиялық параметрі бейне жарияланғанда қолданылады.',
    connecting: 'TikTok жүйесіне кіру ашылуда…',
    uploading: 'Бейне жүктелуде…',
    publishing: 'TikTok-та жариялануда…',
    publishSuccess: 'Бейне TikTok-та жарияланды.',
    publishScheduled: 'Жариялау жоспарланды.',
    publishPending: 'TikTok бейнені қабылдады және жариялап жатыр.',
    draftSuccess: 'Черновик TikTok-қа жіберілді. Жариялауды TikTok қолданбасында аяқтаңыз.',
    publishFailed: 'Бейне TikTok-та жарияланбады. Параметрлерді тексеріп, қайталап көріңіз.',
    authExpired: 'Сеанс аяқталды. Жариялау үшін қайта кіріңіз.',
    close: 'Жабу',
    notice: 'Ұзақтығы 0:00 болып көрсетілсе, жарияламас бұрын жүктелген MP4 файлын бөлек бейне ойнатқышта тексеріңіз.',
    analyzerTitle: 'Бейне анализаторы',
    analyzerDesc: 'Жарияланған бейненің параметрлерін тексеріп, бастапқы файлмен салыстырыңыз.',
    analyzerButton: 'Бейнені тексеру',
    analyzerLabel: 'Бейненің сілтемесі',
    analyzerPlaceholder: 'TikTok сілтемесін енгізіңіз',
    analyzerSubmit: 'Тексеру',
    analyzerLoading: 'Бейнені талдаймыз…',
    analyzerDone: 'Тексеру аяқталды',
    analyzerError: 'Сілтемені тексеру мүмкін болмады. Бейне қоғамдық екенін тексеріңіз.',
    analyzerSource: 'Сілтеме тексерілуде',
    analyzerAuthor: 'Автор',
    analyzerRegion: 'Жарияланған аймақ',
    analyzerRegionUnavailable: 'TikTok дерек бермеді',
    analyzerSize: 'Файл өлшемі',
    analyzerDuration: 'Ұзақтығы',
    faqTitle: 'Жиі қойылатын сұрақтарға жауаптар',
    faqSupportText: 'Қате таптыңыз ба?',
    faqReport: 'Ескерту',
    footerSupport: 'Қолдау',
    footerHome: 'Басты',
    footerFaq: 'FAQ',
    footerTelegram: 'Telegram',
    footerDesc: 'Бейнеңізді дайындаңыз. Сапасын сақтаңыз. Сенімді түрде жариялаңыз.',
    remove: 'Жою',
    selectFile: 'Бейнені таңдаңыз',
    fileName: 'Таңдалған файл',
    packageLabel: 'Бейне пакеті',
    errorInvalidFile: 'Қолдау көрсетілетін бейне файлын таңдаңыз.',
    videoTooLarge: 'Бейне 150 МБ шегінен асады. Кішірек файл таңдаңыз.',
    readingVideoMetadata: 'Бейне параметрлері оқылуда…',
    loadingVideoData: 'Бейне құрылғыда өңдеуге дайындалуда…',
    analyzingVideo: 'Бейне талдануда…',
    patchingVideo: 'Патчер қолданылуда…',
    videoDimensionsUnavailable: 'Бейне ажыратымдылығын оқу мүмкін болмады. MP4 форматында экспорттап көріңіз.',
    formatConversionFailed: 'Браузер бұл пішімге немесе кодекке қолдау көрсетпейді. MP4, MOV немесе H.264 бейнесін қолданып көріңіз.',
    cancel: 'Бас тарту',
    processingCancelled: 'Өңдеу тоқтатылды.',
    processingTimedOut: 'Өңдеу 20 минуттан ұзақ. Қысқарақ бейне қолданып көріңіз.',
    videoTooLong: 'Ұзақтығы 1 минуттан аспайтын бейне таңдаңыз.',
    videoDurationUnavailable: 'Бейне ұзақтығын анықтау мүмкін болмады. MP4 файлын қолданып көріңіз.',
    noBalance: 'Өңдеу лимиті таусылды. Жалғастыру үшін балансты толтырыңыз.',
    balanceCheckFailed: 'Балансты тексеру мүмкін болмады. Қайталап көріңіз.',
    noCreditsTitle: 'Видео лимиті таусылды',
    noCreditsText: 'Келесі видеоны өңдеу үшін балансты толтырыңыз.',
    buyOnSite: 'Сайттан сатып алу',
    buyInTelegram: 'Telegram-нан сатып алу',
    inviteOnSite: '👥 Дос шақыру',
    balanceUpdateFailed: 'Бейне өңделді, бірақ баланс жаңартылмады. Қайталап өңдемей, қолдау қызметіне хабарласыңыз.',
    successText: 'Дайын. Бейне мен аудио жіберілмеді; сервис тек MP4 метадеректерін алды.',
    checkResult: 'Нәтиже',
    quality: 'Сапа',
    fps: 'Кадр жиілігі',
    codec: 'Кодек',
    bitrate: 'Битрейт',
    close: 'Жабу',
    noData: '—',
    faq: [
      ['INEASY Patcher не істейді?', 'INEASY Patcher TikTok-та жариялау алдында бейнеңізді автоматты түрде дайындайды. Ол бастапқы файлды талдап, жүктегеннен кейін сапаның көзге көрінетіндей төмендеуін барынша азайтуға арналған өңдеу параметрлерін қолданады.'],
      ['Қандай экспорт параметрлерін таңдау керек?', 'INEASY өңдеу параметрлерін автоматты түрде таңдайды. Бастапқы бейне үшін тік MP4, 1080p, 60 FPS және 6–10 Мбит/с битрейт ұсынылады. TikTok-та жарияламас бұрын Upload HD параметрін қосыңыз.'],
      ['Patcher бейне сапасын жақсарта ма?', 'Patcher дәстүрлі AI-апскейлер емес және сапасы төмен бейнені бастапқы 4K сапасына айналдырмайды. Оның мақсаты — бастапқы бейнені дұрыс дайындап, өңдеу кезінде бар сапасын мүмкіндігінше сақтау.'],
      ['Өңдеуден кейін бейнені неге өзгертпеу керек?', 'Өңделген файл — соңғы нұсқа. Қайта өңдеу, сүзгілер қосу немесе қайта экспорттау параметрлерді өзгертіп, сапаны қосымша төмендетуі мүмкін. Өңделген файлды соңғы жарияланым ретінде пайдаланыңыз.'],
      ['Бейнені CapCut немесе басқа редактордан қайта экспорттау керек пе?', 'Жоқ. Музыка, мәтін, эффектілер мен басқа өзгерістерді Patcher арқылы өңдеуге дейін қосыңыз. Өңделген файлды қайта экспорттамаңыз.'],
      ['Бейнені TikTok-та жариялауға қалай дайындаймын?', '1. INEASY сайтына кіріңіз.\n2. Бастапқы бейнені өңдеп, Patcher қолданбай тұрып экспорттаңыз.\n3. Бейнені жүктеп, «Бейнені өңдеу» түймесін басыңыз.\n4. Өңдеу аяқталғанша күтіп, дайын файлды жүктеп алыңыз.\n5. Өңделген файлды қайта өңдемеңіз және экспорттамаңыз; бейнені қайта сығатын қолданбалар арқылы жібермеңіз.\n6. TikTok-та «Қосымша параметрлер» бөлімінен Upload HD функциясын қосып, өңделген файлды жариялаңыз.\n7. Жариялаған соң бейненің ашық сілтемесін анализаторға енгізіп, параметрлерін тексеріңіз.'],
      ['Patcher TikTok қысуын толығымен өшіре ме?', 'Жоқ. TikTok жүктелген бейнелерді өз жүйесінде өңдейді. Patcher TikTok-тың ішкі өңдеуін өшіре алмайды. Оның мақсаты — бейнені жариялауға дұрыс дайындап, сапаның айтарлықтай төмендеуін барынша азайту.']
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
  if (tgAuthToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${tgAuthToken}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && ['authentication_expired', 'authentication_required'].includes(data.error)) {
      removeBrowserValue('tg_id');
      removeBrowserValue('tg_auth_token');
      // Return to the sign-in page so a stale site session can be renewed.
      window.location.replace('/login');
      const error = new Error('authentication_expired');
      error.status = 401;
      throw error;
    }
    const error = new Error(data.error || 'tiktok_request_failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

function localizeTikTokPublishError(message) {
  const error = String(message || '').trim();
  if (/session[ _-]*(failed|expired)|tiktok.*session|session.*tiktok/i.test(error)) {
    return ({
      ru: 'Сессия TikTok истекла или не прошла проверку. Подключите аккаунт TikTok заново в разделе публикации и повторите попытку.',
      kk: 'TikTok сеансы аяқталған немесе тексеруден өтпеді. Жариялау бөлімінде TikTok аккаунтын қайта қосып, қайталап көріңіз.',
      en: 'The TikTok session expired or could not be verified. Reconnect your TikTok account in the publishing section and try again.'
    })[STATE.lang] || 'Reconnect your TikTok account and try again.';
  }
  if (/tiktok_request_failed|tiktok_publish_failed/i.test(error)) {
    return ({
      ru: 'TikTok не вернул причину отказа. Проверьте подключение аккаунта в Zernio и разрешение на публикацию видео; затем попробуйте ещё раз. Если ошибка повторится, переподключите TikTok в разделе публикации.',
      kk: 'TikTok бас тарту себебін қайтармады. Zernio ішіндегі аккаунт байланысын және видео жариялау рұқсатын тексеріп, қайталап көріңіз. Қате қайталанса, TikTok аккаунтын қайта қосыңыз.',
      en: 'TikTok did not provide a specific failure reason. Check the account connection and video-posting permission in Zernio, then try again. If it repeats, reconnect TikTok in the publishing section.'
    })[STATE.lang] || t('publishFailed');
  }
  if (/authentication_required|authentication_expired/i.test(error)) return t('authExpired');
  if (/tiktok_account_not_connected|account.*not.*connected/i.test(error)) return t('connectHint');
  if (/upload_not_found_or_expired|upload_expired/i.test(error)) {
    return ({
      ru: 'Время загрузки файла истекло. Повторите публикацию, чтобы загрузить видео заново.',
      kk: 'Файлды жүктеу уақыты аяқталды. Бейнені қайта жүктеу үшін жариялауды қайталаңыз.',
      en: 'The upload expired. Try publishing again to upload the video again.'
    })[STATE.lang] || t('publishFailed');
  }
  return error || t('publishFailed');
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function applyLanguage(lang) {
  lang = translations[lang] ? lang : 'en';
  STATE.lang = lang;
  setBrowserValue('ineasy-language', lang);
  document.documentElement.lang = lang;

  const pack = translations[lang] || translations.en;

  setText('idCaption', pack.id);
  setText('balanceCaption', pack.balance);
  setText('logoutLabel', pack.logout);
  setText('packagesTitle', pack.packages);
  setText('packagesHint', pack.packageHint);
  setText('navHome', pack.nav[0]);
  setText('navPatcher', pack.nav[1]);
  setText('navAnalyzer', pack.nav[2]);
  setText('navFaq', pack.nav[3]);
  setText('homeKicker', pack.homeKicker);
  setText('homeTitle', pack.homeTitle);
  setText('homeIntro', pack.homeIntro);
  setText('homeCta', pack.homeCta);
  setText('comparisonKicker', pack.comparisonKicker);
  setText('comparisonTitle', pack.comparisonTitle);
  setText('comparisonIntro', pack.comparisonIntro);
  setText('comparisonDisclaimer', pack.comparisonDisclaimer);
  setText('workflowKicker', pack.workflowKicker);
  setText('workflowTitle', pack.workflowTitle);
  setText('stepOneTitle', pack.stepOneTitle);
  setText('stepOneBody', pack.stepOneBody);
  setText('stepTwoTitle', pack.stepTwoTitle);
  setText('stepTwoBody', pack.stepTwoBody);
  setText('stepThreeTitle', pack.stepThreeTitle);
  setText('stepThreeBody', pack.stepThreeBody);
  setText('localProcessingCopy', pack.localProcessingCopy);
  setText('homeBottomCta', pack.homeBottomCta);
  setText('patchTitle', pack.patchTitle);
  setText('patchSub', pack.patchSub);
  setText('dzTitle', pack.choose);
  setText('dzSub', pack.chooseSub);
  setText('noCreditsTitle', pack.noCreditsTitle);
  setText('noCreditsText', pack.noCreditsText);
  setText('buyOnSiteBtn', pack.buyOnSite);
  setText('buyInTelegram', pack.buyInTelegram);
  setText('inviteOnSiteBtn', pack.inviteOnSite);
  setText('localNote', pack.localNote);
  setText('exportNote', pack.exportNote);
  setText('fpsPolicyNote', pack.fpsPolicyNote || pack.exportNote);
  const selectedPatcherMode = document.querySelector('input[name="patcherVersion"]:checked')?.value || 'v1';
  setText('patcherVersionNote', selectedPatcherMode === 'v2' ? pack.patcherNoteV2 : pack.patcherNoteV1);
  setText('fpsAdvice', pack.fpsAdvice);
  setText('communityTitle', pack.communityTitle);
  setText('communityBody', pack.communityBody);
  setText('processBtn', pack.process);
  setText('cancelProcessBtn', pack.cancel);
  setText('resultTitle', pack.ready);
  setText('resultSub', pack.readySub);
  setText('optimizeAnotherBtn', pack.optimizeAnother);
  setText('downloadBtn', pack.download);
  setText('publishTiktokBtn', pack.publishTikTok);
  setText('tiktokStudioBtn', pack.publishTikTokStudio);
  setText('autopostHint', pack.autopostHint);
  setText('tiktokStudioHint', pack.tiktokStudioHint);
  setText('publishModalTitle', pack.publishTitle);
  setText('zernioConnectCopy', pack.zernioConnectCopy);
  setText('zernioKeyLabel', pack.zernioKeyLabel);
  setText('zernioGetApiKey', pack.zernioGetApiKey);
  setText('zernioSaveKeyBtn', pack.zernioSaveKey);
  setText('zernioChangeKeyBtn', pack.zernioChangeKey);
  setText('zernioKeyHint', pack.zernioKeyHint);
  const zernioApiKeyInput = document.getElementById('zernioApiKey');
  if (zernioApiKeyInput) zernioApiKeyInput.placeholder = pack.zernioKeyPlaceholder;
  setText('tiktokCaptionLabel', pack.captionLabel);
  setText('tiktokUploadNotice', pack.uploadNotice);
  setText('tiktokCaptionHint', pack.captionHint);
  const captionInput = document.getElementById('tiktokCaption');
  if (captionInput) captionInput.placeholder = pack.captionHint;
  setText('tiktokPrivacyLabel', pack.privacyLabel);
  setText('tiktokPrivacyPublic', pack.privacyPublic);
  setText('tiktokPrivacyFriends', pack.privacyFriends);
  setText('tiktokPrivacyPrivate', pack.privacyPrivate);
  const privacyOptionsRestricted = [...document.querySelectorAll('input[name="tiktokPrivacyChoice"]')].some((input) => input.disabled);
  setText('tiktokPrivacyDescription', privacyOptionsRestricted ? pack.privacyUnavailable : pack.privacyDescription);
  setText('tiktokInteractionsTitle', pack.interactionsTitle);
  setText('tiktokInteractionsDescription', pack.interactionsDescription);
  setText('tiktokCommentsLabel', pack.commentsLabel);
  setText('tiktokDuetLabel', pack.duetLabel);
  setText('tiktokStitchLabel', pack.stitchLabel);
  setText('tiktokAiLabel', pack.aiLabel);
  setText('tiktokConsentLabel', pack.consentLabel);
  setText('tiktokScheduleTitle', pack.scheduleTitle);
  setText('tiktokScheduleNow', pack.scheduleNow);
  setText('tiktokScheduleLater', pack.scheduleLater);
  setText('tiktokScheduledForLabel', pack.scheduledForLabel);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  setText('tiktokTimezoneHint', pack.timezoneHint.replace('{timezone}', timezone));
  setText('tiktokDraftNote', pack.draftNotice);
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
  setText('footerTitle', 'INEASY');
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

document.getElementById('logoutBtn').addEventListener('click', async () => {
  const button = document.getElementById('logoutBtn');
  button.disabled = true;
  try {
    const response = await fetch('/api/logout', { method: 'POST', cache: 'no-store' });
    if (!response.ok) throw new Error('Could not clear the login session.');
    ['tg_id', 'tg_username', 'tg_first_name', 'tg_auth_token'].forEach(removeBrowserValue);
    window.location.replace('/login');
  } catch (error) {
    button.disabled = false;
    console.error('Не удалось завершить сессию:', error);
  }
});

// --- Balance ---
const balanceLabel = document.getElementById('balanceLabel');
let currentBalance = null;
let currentFreeNextAt = null;
let balanceRequestVersion = 0;
let checkingFileDimensions = false;

function balanceTotal(data) {
  const free = Number(data.free);
  const purchased = Number(data.purchased);
  const total = Number.isFinite(free) && Number.isFinite(purchased)
    ? free + purchased
    : Number(data.balance);
  if (!Number.isFinite(total) || total < 0) throw new Error('balance_fetch_failed');
  return total;
}

function renderBalance() {
  if (balanceLabel && currentBalance !== null) balanceLabel.textContent = `${currentBalance} ${t('videos')}`;
  updateFreeBalanceNextAt();
  updateDropzoneAvailability();
  updateProcessButton();
}

function updateFreeBalanceNextAt() {
  const label = document.getElementById('freeBalanceNextAt');
  const inviteLink = document.getElementById('inviteOnSiteBtn');
  if (label) {
    if (currentBalance !== 0 || !currentFreeNextAt) {
      label.hidden = true;
      label.textContent = '';
    } else {
      const locale = STATE.lang === 'ru' ? 'ru-RU' : STATE.lang === 'kk' ? 'kk-KZ' : 'en-GB';
      const formatted = new Intl.DateTimeFormat(locale, {
        timeZone: 'Asia/Almaty',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(Number(currentFreeNextAt)));
      label.hidden = false;
      label.textContent = STATE.lang === 'ru'
        ? `Следующий бесплатный баланс: ${formatted} (время Астаны). Бесплатный баланс пополняется до 2 видео каждые 24 часа.`
        : STATE.lang === 'kk'
          ? `Келесі тегін баланс: ${formatted} (Астана уақыты). Тегін баланс әр 24 сағат сайын 2 видеоға дейін толтырылады.`
          : `Next free balance: ${formatted} (Astana time). It refills to 2 free videos every 24 hours.`;
    }
  }
  if (inviteLink && tgId && /^\d+$/.test(String(tgId))) {
    const referralUrl = `https://t.me/${BOT_USERNAME}?start=ref_${encodeURIComponent(tgId)}`;
    const shareText = STATE.lang === 'ru'
      ? 'Приглашаю в INEASY Patcher. Открой ссылку и нажми Start в боте, чтобы приглашение засчиталось.'
      : STATE.lang === 'kk'
        ? 'INEASY Patcher-ге шақырамын. Шақыру есептелуі үшін сілтемені ашып, ботта Start бас.'
        : 'Try INEASY Patcher. Open the link and press Start in the bot for the invite to count.';
    inviteLink.href = `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(shareText)}`;
  }
}

function updateDropzoneAvailability() {
  const locked = currentBalance === 0;
  if (locked) {
    if (processController) processController.abort();
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
    if (previewVideo) {
      previewVideo.removeAttribute('src');
      previewVideo.load();
    }
    if (previewWrap) previewWrap.classList.remove('show');
    if (fileInput) fileInput.value = '';
    selectedVideoDimensions = null;
    if (postingDeviceSelect) postingDeviceSelect.value = '';
  }
  if (dropzone) dropzone.classList.toggle('locked', locked);
  if (dropzoneContent) dropzoneContent.classList.toggle('hidden', locked);
  if (balanceLock) balanceLock.classList.toggle('hidden', !locked);
  if (fileInput) fileInput.disabled = locked;
}

function updateProcessButton() {
  if (!processBtn) return;
  const hasVideo = Boolean(fileInput && fileInput.files && fileInput.files[0]);
  const hasCredits = currentBalance === null || (Number.isFinite(currentBalance) && currentBalance > 0);
  const hasPostingDevice = Boolean(postingDeviceSelect && ['pc', 'phone', 'phone-ghost'].includes(postingDeviceSelect.value));
  const hasResult = Boolean(processedResult && !processedResult.classList.contains('hidden'));
  processBtn.disabled = !hasVideo || !hasCredits || !hasPostingDevice || checkingFileDimensions || Boolean(processController) || hasResult;
}

async function loadBalance() {
  const requestVersion = ++balanceRequestVersion;
  try {
    const token = getBrowserValue('tg_auth_token');
    const res = await fetch(`/api/balance/${encodeURIComponent(tgId)}`, {
      headers: { Authorization: `Bearer ${token || ''}` },
      cache: 'no-store',
    });
    if (requestVersion !== balanceRequestVersion) return;
    if (res.status === 401 || res.status === 403) {
      removeBrowserValue('tg_id');
      removeBrowserValue('tg_auth_token');
      window.location.replace('/login');
      return;
    }
    if (!res.ok) throw new Error('balance_fetch_failed');
    const data = await res.json();
    if (requestVersion !== balanceRequestVersion) return;
    currentBalance = balanceTotal(data);
    currentFreeNextAt = data.freeNextAt || null;
    renderBalance();
  } catch (e) {
    if (requestVersion !== balanceRequestVersion) return;
    currentBalance = null;
    updateDropzoneAvailability();
    updateProcessButton();
    if (balanceLabel) balanceLabel.textContent = '—';
  }
}

async function refreshBalanceForProcessing() {
  if (PATCHER_TEST_MODE) return true;
  const requestVersion = ++balanceRequestVersion;
  const token = getBrowserValue('tg_auth_token');
  const response = await fetch(`/api/balance/${encodeURIComponent(tgId)}`, {
    headers: { Authorization: `Bearer ${token || ''}` },
    cache: 'no-store',
  });
  if (requestVersion !== balanceRequestVersion) return false;
  if (response.status === 401 || response.status === 403) {
    removeBrowserValue('tg_id');
    removeBrowserValue('tg_auth_token');
    window.location.replace('/login');
    return false;
  }
  if (!response.ok) throw new Error('balance_fetch_failed');
  const data = await response.json();
  if (requestVersion !== balanceRequestVersion) return false;
  currentBalance = balanceTotal(data);
  currentFreeNextAt = data.freeNextAt || null;
  renderBalance();
  return currentBalance > 0;
}

async function consumeProcessedVideo() {
  if (PATCHER_TEST_MODE) return { free: 1, purchased: 0, patched: 0 };
  const requestVersion = ++balanceRequestVersion;
  const token = getBrowserValue('tg_auth_token');
  const response = await fetch(`/api/consume/${encodeURIComponent(tgId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token || ''}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (data.error === 'no_balance') {
      if (requestVersion === balanceRequestVersion) {
        currentBalance = 0;
        currentFreeNextAt = data.freeNextAt || currentFreeNextAt;
        renderBalance();
      }
      throw new Error(t('noBalance'));
    }
    if (response.status === 401) throw new Error(t('authExpired'));
    throw new Error(t('balanceUpdateFailed'));
  }
  if (requestVersion === balanceRequestVersion) {
    currentBalance = data.free + data.purchased;
    currentFreeNextAt = data.freeNextAt || null;
    renderBalance();
  }
  return data;
}

if (PATCHER_TEST_MODE) {
  currentBalance = 1;
} else {
  loadBalance();
  window.addEventListener('focus', () => {
    if (!processController) loadBalance();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !processController) loadBalance();
  });
}

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
const MAX_VIDEO_SIZE_BYTES = 150_000_000; // Strict 150 MB decimal cap, enforced before local processing.
const fileInput = document.getElementById('fileInput');
const dropzoneContent = document.getElementById('dropzoneContent');
const balanceLock = document.getElementById('balanceLock');
const previewWrap = document.getElementById('previewWrap');
const previewVideo = document.getElementById('previewVideo');
const fileMeta = document.getElementById('fileMeta');
const clearBtn = document.getElementById('clearBtn');
(() => {
  const inputs = document.querySelectorAll('input[name="patcherVersion"]');
  const note = document.getElementById('patcherVersionNote');
  const picker = document.querySelector('.patcher-version-picker');
  const fpsAdvice = document.getElementById('fpsAdvice');
  const update = () => {
    const selected = document.querySelector('input[name="patcherVersion"]:checked')?.value || 'v1';
    if (note) {
      const pack = translations[STATE.lang] || translations.en;
      note.textContent = selected === 'v2' ? pack.patcherNoteV2 : pack.patcherNoteV1;
      note.classList.toggle('v1-highlight', selected === 'v1');
    }
    if (fpsAdvice) { fpsAdvice.textContent = (translations[STATE.lang] || translations.en).fpsAdvice; fpsAdvice.classList.toggle('hidden', selected !== 'v1' || Boolean(picker?.classList.contains('hidden'))); }
    if (picker) picker.classList.toggle('has-v1-selected', selected === 'v1');
  };
  inputs.forEach((input) => input.addEventListener('change', update));
  update();
  return document.querySelector('input[name="patcherVersion"]:checked')?.value || 'v1';
})();
function getSelectedPatcherVersion() {
  return document.querySelector('input[name="patcherVersion"]:checked')?.value || 'v1';
}

const processBtn = document.getElementById('processBtn');
const postingDeviceSelect = document.getElementById('postingDevice');
const cancelProcessBtn = document.getElementById('cancelProcessBtn');
const processingState = document.getElementById('processingState');
const processingText = document.getElementById('processingText');
const processingPercent = document.getElementById('processingPercent');
const processingProgress = document.getElementById('processingProgress');
const processedResult = document.getElementById('processedResult');
const publicationActions = document.getElementById('publicationActions');
const durationNotice = document.getElementById('durationNotice');
const optimizeAnotherBtn = document.getElementById('optimizeAnotherBtn');
const downloadBtn = document.getElementById('downloadBtn');
const publishTiktokBtn = document.getElementById('publishTiktokBtn');
const tiktokComposerOverlay = document.getElementById('tiktokComposerOverlay');
const zernioKeyPanel = document.getElementById('zernioKeyPanel');
const zernioApiKeyInput = document.getElementById('zernioApiKey');
const zernioSaveKeyBtn = document.getElementById('zernioSaveKeyBtn');
const zernioChangeKeyBtn = document.getElementById('zernioChangeKeyBtn');
const zernioKeyHint = document.getElementById('zernioKeyHint');
const tiktokAccountPanel = document.getElementById('tiktokAccountPanel');
const tiktokAccountStatus = document.getElementById('tiktokAccountStatus');
const tiktokPublishForm = document.getElementById('tiktokPublishForm');
const tiktokPublishStatus = document.getElementById('tiktokPublishStatus');
const tiktokCaption = document.getElementById('tiktokCaption');
const tiktokCaptionCount = document.getElementById('tiktokCaptionCount');
const tiktokPrivacy = document.getElementById('tiktokPrivacy');
const tiktokDraftNote = document.getElementById('tiktokDraftNote');
const tiktokScheduleField = document.getElementById('tiktokScheduleField');
const tiktokScheduledFor = document.getElementById('tiktokScheduledFor');
const tiktokSubmitBtn = document.getElementById('tiktokSubmitBtn');
let processedVideoBlob = null;

let currentObjectUrl = null;
let patchedDownloadUrl = null;
let processController = null;

function setPublicationActionsVisible(visible) {
  if (publicationActions) publicationActions.classList.toggle('hidden', !visible);
}

function renderTikTokOptions() {
  if (!tiktokCreatorInfo || !tiktokPrivacy) return;
  const allowedPrivacy = new Set((Array.isArray(tiktokCreatorInfo.privacyLevels) ? tiktokCreatorInfo.privacyLevels : [])
    .map((level) => typeof level === 'string' ? level : level?.value)
    .filter(Boolean));
  const privacyInputs = [...document.querySelectorAll('input[name="tiktokPrivacyChoice"]')];
  privacyInputs.forEach((input) => {
    input.disabled = allowedPrivacy.size > 0 && !allowedPrivacy.has(input.value);
    input.closest('.privacy-choice')?.classList.toggle('unavailable', input.disabled);
  });
  setText('tiktokPrivacyDescription', privacyInputs.some((input) => input.disabled)
    ? t('privacyUnavailable')
    : t('privacyDescription'));
  let selectedPrivacy = privacyInputs.find((input) => input.checked && !input.disabled);
  if (!selectedPrivacy) {
    selectedPrivacy = privacyInputs.find((input) => !input.disabled);
    if (selectedPrivacy) selectedPrivacy.checked = true;
  }
  if (selectedPrivacy) updateTikTokPrivacyChoice(selectedPrivacy);
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
      const commercialLabels = { 
        none: t('commercialNone'), 
        brand_organic: t('commercialOwnBrand'), 
        brand_content: t('commercialPartner') 
      };
      commercialSelect.replaceChildren(...(tiktokCreatorInfo.commercialContentTypes || [{ value: 'none' }]).map((item) => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = commercialLabels[item.value] || item.label || item.value;
        return option;
      }));
    }
  updateTikTokPrivacyNote();
}

function buildTikTokCaption(value) {
  const caption = String(value || '').trim();
  if (caption.endsWith(TIKTOK_CAPTION_SUFFIX)) return caption;
  return `${caption}${caption ? '\n' : ''}${TIKTOK_CAPTION_SUFFIX}`;
}

function updateTikTokPrivacyNote() {
  if (tiktokDraftNote && tiktokPrivacy) {
    tiktokDraftNote.classList.toggle('hidden', tiktokPrivacy.value === 'PUBLIC_TO_EVERYONE' && !isTikTokScheduled());
  }
}

function isTikTokScheduled() {
  return document.querySelector('input[name="tiktokScheduleMode"]:checked')?.value === 'later';
}

function updateTikTokScheduleField() {
  const scheduled = isTikTokScheduled();
  if (tiktokScheduleField) tiktokScheduleField.classList.toggle('hidden', !scheduled);
  if (tiktokSubmitBtn) tiktokSubmitBtn.textContent = t(scheduled ? 'scheduleSubmit' : 'publishNow');
  if (tiktokScheduledFor) {
    tiktokScheduledFor.required = scheduled;
    const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    tiktokScheduledFor.min = localNow;
  }
  updateTikTokPrivacyNote();
}

function updateTikTokPrivacyChoice(input) {
  if (!tiktokPrivacy || !input) return;
  tiktokPrivacy.value = input.value;
  document.querySelectorAll('.privacy-choice').forEach((choice) => {
    choice.classList.toggle('selected', choice.contains(input));
  });
  updateTikTokPrivacyNote();
}

async function refreshTikTokStatus() {
  if (!tiktokAccountStatus || !tiktokPublishForm) return;
  tiktokAccountStatus.textContent = t('checkingTikTok');
  tiktokAccountStatus.classList.remove('online');
  zernioKeyPanel.classList.add('hidden');
  tiktokAccountPanel.classList.remove('hidden');
  tiktokPublishForm.classList.add('hidden');
  try {
    const data = await tiktokApi('/api/tiktok/status');
    if (!data.configured) {
      zernioKeyPanel.classList.remove('hidden');
      tiktokAccountPanel.classList.add('hidden');
      tiktokAccountId = null;
      return;
    }
    if (!data.connected) {
      tiktokAccountId = null;
      tiktokAccountStatus.textContent = t('connectHint');
      return;
    }
    tiktokAccountId = data.account.id;
    tiktokCreatorInfo = data.creatorInfo;
    tiktokAccountStatus.textContent = `${t('connectedAs')} @${data.account.username}`;
    tiktokAccountStatus.classList.add('online');
    tiktokPublishForm.classList.remove('hidden');
    renderTikTokOptions();
  } catch (error) {
    if (error.message === 'invalid_zernio_api_key') {
      zernioKeyPanel.classList.remove('hidden');
      tiktokAccountPanel.classList.add('hidden');
      zernioKeyHint.textContent = t('invalidZernioKey');
    } else {
      tiktokAccountPanel.classList.remove('hidden');
      tiktokAccountStatus.textContent = error.status === 401 ? t('authExpired') : (error.message || t('connectFailed'));
    }
  }
}

async function openTikTokComposer() {
  if (!tiktokComposerOverlay) return;
  tiktokComposerOverlay.classList.remove('hidden');
  const autopostHint = document.getElementById('autopostHint');
  if (autopostHint) {
    autopostHint.textContent = t('autopostScrollHint');
    autopostHint.classList.add('attention');
  }
  if (tiktokPublishStatus) tiktokPublishStatus.textContent = '';
  tiktokComposerOverlay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  await refreshTikTokStatus();
}

if (publishTiktokBtn) {
  publishTiktokBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openTikTokComposer();
  });
}
if (zernioSaveKeyBtn) {
  zernioSaveKeyBtn.addEventListener('click', async () => {
    const apiKey = zernioApiKeyInput.value.trim();
    if (!apiKey) {
      zernioKeyHint.textContent = t('zernioKeyRequired');
      zernioApiKeyInput.focus();
      return;
    }
    zernioSaveKeyBtn.disabled = true;
    zernioKeyHint.textContent = t('checkingTikTok');
    try {
      await tiktokApi('/api/tiktok/key', {
        method: 'POST',
        body: JSON.stringify({ apiKey }),
      });
      zernioApiKeyInput.value = '';
      zernioKeyHint.textContent = t('zernioKeySaved');
      await refreshTikTokStatus();
    } catch (error) {
      zernioKeyHint.textContent = error.message === 'invalid_zernio_api_key' ? t('invalidZernioKey') : (error.message || t('zernioConnectFailed'));
    } finally {
      zernioSaveKeyBtn.disabled = false;
    }
  });
}
if (zernioChangeKeyBtn) {
  zernioChangeKeyBtn.addEventListener('click', () => {
    zernioKeyPanel.classList.remove('hidden');
    tiktokAccountPanel.classList.add('hidden');
    tiktokPublishForm.classList.add('hidden');
    tiktokAccountId = null;
    tiktokCreatorInfo = null;
    zernioApiKeyInput.focus();
  });
}
document.querySelectorAll('input[name="tiktokPrivacyChoice"]').forEach((input) => {
  input.addEventListener('change', () => updateTikTokPrivacyChoice(input));
});
document.querySelectorAll('input[name="tiktokScheduleMode"]').forEach((input) => {
  input.addEventListener('change', updateTikTokScheduleField);
});
updateTikTokScheduleField();
if (tiktokCaption && tiktokCaptionCount) {
  tiktokCaption.maxLength = 2200 - TIKTOK_CAPTION_SUFFIX.length - 1;
  tiktokCaption.addEventListener('input', () => {
    tiktokCaptionCount.textContent = `${tiktokCaption.value.length} / 2200`;
  });
}
if (tiktokComposerOverlay) {
  const closeTikTokComposer = () => {
    tiktokComposerOverlay.classList.add('hidden');
    const autopostHint = document.getElementById('autopostHint');
    if (autopostHint) {
      autopostHint.textContent = t('autopostHint');
      autopostHint.classList.remove('attention');
    }
  };
  document.getElementById('tiktokModalClose').addEventListener('click', closeTikTokComposer);
}

if (downloadBtn) {
  downloadBtn.addEventListener('click', async (event) => {
    const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isAppleMobile || !processedVideoBlob) {
      return;
    }
    event.preventDefault();
    const openVideoFallback = () => window.open(patchedDownloadUrl || downloadBtn.href, '_blank', 'noopener');
    if (typeof File !== 'function' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
      openVideoFallback();
      return;
    }
    const file = new File([processedVideoBlob], downloadBtn.download || 'ineasy-video.mp4', { type: 'video/mp4' });
    let canShareFile = false;
    try { canShareFile = navigator.canShare({ files: [file] }); } catch (error) {}
    if (!canShareFile) {
      openVideoFallback();
      return;
    }
    try {
      await navigator.share({ files: [file], title: file.name });
    } catch (error) {
      if (error.name !== 'AbortError') {
        openVideoFallback();
      }
    }
  });
}

if (tiktokPublishForm) {
  tiktokPublishForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!processedVideoBlob || !tiktokAccountId) return;
    const scheduledFor = isTikTokScheduled() ? tiktokScheduledFor.value : '';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    if (scheduledFor && (!Number.isFinite(new Date(scheduledFor).getTime()) || new Date(scheduledFor).getTime() <= Date.now())) {
      if (tiktokPublishStatus) tiktokPublishStatus.textContent = t('scheduleInvalid');
      tiktokScheduleField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    tiktokSubmitBtn.disabled = true;
    try {
      if (tiktokPublishStatus) tiktokPublishStatus.textContent = t('uploading');
      const filename = (downloadBtn && downloadBtn.download) || 'ineasy-video.mp4';
      const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
      const contentType = processedVideoBlob.type || (extension === '.mov' ? 'video/quicktime' : extension === '.mp4' ? 'video/mp4' : '');
      const supportedFormat = (extension === '.mp4' && contentType === 'video/mp4') ||
        (extension === '.mov' && contentType === 'video/quicktime');
      if (!supportedFormat) {
        if (tiktokPublishStatus) tiktokPublishStatus.textContent = t('zernioMp4Required');
        return;
      }
      const upload = await tiktokApi('/api/tiktok/media/presign', {
        method: 'POST',
        body: JSON.stringify({ filename, contentType, size: processedVideoBlob.size }),
      });
      const uploaded = await tiktokApi(`/api/tiktok/media/upload/${encodeURIComponent(upload.uploadId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: processedVideoBlob,
      });

      if (tiktokPublishStatus) tiktokPublishStatus.textContent = t('publishing');
      const result = await tiktokApi('/api/tiktok/publish', {
        method: 'POST',
        body: JSON.stringify({
          accountId: tiktokAccountId,
          uploadId: uploaded.uploadId,
          content: buildTikTokCaption(tiktokCaption.value),
          privacyLevel: tiktokPrivacy.value,
          allowComment: document.getElementById('tiktokAllowComments').checked,
          allowDuet: document.getElementById('tiktokAllowDuet').checked,
          allowStitch: document.getElementById('tiktokAllowStitch').checked,
          madeWithAi: document.getElementById('tiktokMadeWithAi').checked,
          commercialContentType: 'none',
          scheduledFor: scheduledFor || null,
          timezone,
          confirmedPreview: document.getElementById('tiktokConsentGiven').checked,
          consentGiven: document.getElementById('tiktokConsentGiven').checked,
        }),
      });
      if (tiktokPublishStatus) {
        const platformResult = result.post?.platforms?.find((item) => item.platform === 'tiktok');
        const publishState = platformResult?.status || result.post?.status;
        console.info('[INEASY] TikTok publish response', {
          postStatus: result.post?.status || 'unknown',
          platformStatus: publishState || 'unknown',
        });
        tiktokPublishStatus.textContent = scheduledFor
          ? t('publishScheduled')
          : result.draft
            ? t('draftSuccess')
            : publishState === 'published' ? t('publishSuccess') : t('publishPending');
      }
      // Keep the publish form and its status visible after publishing.
      // It closes when the user switches tabs or clears/changes the video.
    } catch (error) {
      console.warn('[INEASY] TikTok publish request failed', {
        status: error.status || null,
        reason: error.message || 'unknown_error',
      });
      if (tiktokPublishStatus) {
        tiktokPublishStatus.textContent = error.status === 401
          ? t('authExpired')
          : error.message === 'invalid_zernio_api_key' ? t('invalidZernioKey') : localizeTikTokPublishError(error.message);
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
  if (processingText) processingText.textContent = text || '';
}

let progressTarget = 0;
let progressDisplayed = 0;
let progressAnimationFrame = 0;
let progressLastTimestamp = 0;

function paintProcessingProgress() {
  const percent = Math.max(0, Math.min(100, Math.round(progressDisplayed)));
  if (processingPercent) processingPercent.textContent = `${t('progressLabel')}: ${percent}%`;
  if (processingProgress) processingProgress.style.width = `${progressDisplayed.toFixed(2)}%`;
}

function animateProcessingProgress(timestamp) {
  if (!progressLastTimestamp) progressLastTimestamp = timestamp;
  const elapsed = Math.min(48, Math.max(0, timestamp - progressLastTimestamp));
  progressLastTimestamp = timestamp;
  const remaining = progressTarget - progressDisplayed;
  if (remaining > 0.08) {
    progressDisplayed = Math.min(progressTarget, progressDisplayed + Math.max(0.06, remaining * elapsed / 480));
    paintProcessingProgress();
    progressAnimationFrame = requestAnimationFrame(animateProcessingProgress);
  } else {
    progressDisplayed = progressTarget;
    paintProcessingProgress();
    progressAnimationFrame = 0;
    progressLastTimestamp = 0;
  }
}

function updateProcessingProgress(value) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  if (percent === 0) {
    progressTarget = 0;
    progressDisplayed = 0;
    if (progressAnimationFrame) cancelAnimationFrame(progressAnimationFrame);
    progressAnimationFrame = 0;
    progressLastTimestamp = 0;
    paintProcessingProgress();
    return;
  }
  progressTarget = Math.max(progressTarget, percent);
  if (!progressAnimationFrame) {
    progressLastTimestamp = 0;
    progressAnimationFrame = requestAnimationFrame(animateProcessingProgress);
  }
}

async function readVideoDuration(file, signal) {
  if (signal?.aborted) throw new Error('processing_cancelled');
  if (previewVideo && currentObjectUrl && previewVideo.src === currentObjectUrl &&
      (!previewVideo.currentSrc || previewVideo.currentSrc === currentObjectUrl) &&
      previewVideo.readyState >= 1 && previewVideo.videoWidth > 0 &&
      previewVideo.duration > 0 && Number.isFinite(previewVideo.duration)) {
    if (previewVideo.duration > 60) throw new Error('video_over_60_seconds');
    return previewVideo.duration;
  }
  try {
    const dur = await new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const sourceUrl = URL.createObjectURL(file);
      let timeoutId;
      let settled = false;
      const cleanup = () => {
        clearTimeout(timeoutId);
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        signal.removeEventListener('abort', onAbort);
        video.removeAttribute('src');
        video.load();
        URL.revokeObjectURL(sourceUrl);
      };
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback(value);
      };
      const onLoaded = () => {
        if (!Number.isFinite(video.duration)) return finish(reject, new Error('video_duration_unavailable'));
        finish(resolve, video.duration);
      };
      const onError = () => finish(reject, new Error('video_duration_unavailable'));
      const onAbort = () => finish(reject, new Error('processing_cancelled'));
      video.preload = 'metadata';
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });
      signal.addEventListener('abort', onAbort, { once: true });
      timeoutId = setTimeout(() => finish(reject, new Error('video_duration_unavailable')), 8000);
      video.src = sourceUrl;
      video.load();
      if (signal.aborted) onAbort();
    });
    if (dur > 60) throw new Error('video_over_60_seconds');
    return dur;
  } catch (err) {
    if (err.message === 'video_over_60_seconds' || err.message === 'processing_cancelled') throw err;
    try {
      const core = globalThis.ADJNOriginalMp4Core || globalThis.FRYOriginalMp4Core;
      if (core?.inspectMediaInfo) {
        const slice = await file.slice(0, Math.min(file.size, 16 * 1024 * 1024)).arrayBuffer();
        const info = core.inspectMediaInfo(new Uint8Array(slice));
        const videoTrack = (info.tracks || []).find((t) => t.handler === 'vide');
        if (videoTrack && videoTrack.duration && videoTrack.timescale) {
          const sec = videoTrack.duration / videoTrack.timescale;
          if (sec > 60) throw new Error('video_over_60_seconds');
          return sec;
        }
      }
    } catch (parseErr) {
      if (parseErr.message === 'video_over_60_seconds') throw parseErr;
    }
    return 0;
  }
}

function readVideoDimensions(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const sourceUrl = URL.createObjectURL(file);
    let timeoutId;
    let settled = false;
    const cleanup = () => {
      clearTimeout(timeoutId);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(sourceUrl);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const onLoaded = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return finish(reject, new Error('video_dimensions_unavailable'));
      finish(resolve, { width, height });
    };
    const onError = () => finish(reject, new Error('video_dimensions_unavailable'));
    video.preload = 'metadata';
    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });
    const isSafari = /^((?!chrome|chromium|android).)*safari/i.test(navigator.userAgent);
    timeoutId = setTimeout(() => finish(reject, new Error('video_dimensions_unavailable')), isSafari ? 3500 : 10000);
    video.src = sourceUrl;
    video.load();
  });
}


function waitForCurrentPreviewMetadata(timeoutMs = 10000) {
  const video = previewVideo;
  const expectedUrl = currentObjectUrl;
  if (!video || !expectedUrl || video.src !== expectedUrl) {
    return Promise.reject(new Error('video_dimensions_unavailable'));
  }
  const getMetadata = () => ({
    width: Number(video.videoWidth) || 0,
    height: Number(video.videoHeight) || 0,
    duration: Number.isFinite(video.duration) ? video.duration : null
  });
  const isCurrent = () => currentObjectUrl === expectedUrl && video.src === expectedUrl &&
    (!video.currentSrc || video.currentSrc === expectedUrl);
  if (video.readyState >= 1 && isCurrent()) {
    const value = getMetadata();
    if (value.width && value.height) return Promise.resolve(value);
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId;
    const cleanup = () => {
      clearTimeout(timeoutId);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const onLoadedMetadata = () => {
      if (!isCurrent()) return finish(reject, new Error('video_selection_changed'));
      const value = getMetadata();
      if (!value.width || !value.height) {
        return finish(reject, new Error('video_dimensions_unavailable'));
      }
      finish(resolve, value);
    };
    const onError = () => finish(reject, new Error('video_dimensions_unavailable'));
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('error', onError);
    timeoutId = setTimeout(() => finish(reject, new Error('video_dimensions_unavailable')), timeoutMs);
    if (video.readyState >= 1) onLoadedMetadata();
  });
}

async function readVideoDimensionsForSelection(file) {
  // The visible preview is already loading the selected file; reuse its metadata instead
  // of creating another video element which makes large 4K files load twice.
  let previewError = null;
  try {
    const metadata = await waitForCurrentPreviewMetadata();
    return { width: metadata.width, height: metadata.height };
  } catch (error) {
    previewError = error;
  }

  // Prefer the local ADJN parser before downloading any additional parsing module.
  try {
    const core = globalThis.ADJNOriginalMp4Core || globalThis.FRYOriginalMp4Core;
    if (core?.inspectMediaInfo) {
      const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 16 * 1024 * 1024)).arrayBuffer());
      const info = core.inspectMediaInfo(bytes);
      const track = (info?.tracks || []).find((item) => item.handler === 'vide');
      const width = Number(track?.width || track?.displayWidth || info?.width);
      const height = Number(track?.height || track?.displayHeight || info?.height);
      if (width > 0 && height > 0) return { width, height };
    }
  } catch (_) {}

  try {
    const mediaModule = await loadMediabunnyForCfr(new AbortController().signal, 18000);
    const { Input, ALL_FORMATS, BlobSource } = mediaModule;
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    try {
      const track = await input.getPrimaryVideoTrack();
      if (!track) throw previewError || new Error('video_dimensions_unavailable');
      const width = await track.getDisplayWidth();
      const height = await track.getDisplayHeight();
      if (!width || !height) throw previewError || new Error('video_dimensions_unavailable');
      return { width, height };
    } finally {
      try { input.dispose?.(); } catch (_) {}
    }
  } catch (_) {
    throw previewError || new Error('video_dimensions_unavailable');
  }
}

const ineasyMediabunnyCfrPromises = new Map();

function waitForMediabunnyModule(promise, signal, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      signal.removeEventListener('abort', onAbort);
      callback(value);
    };
    const onAbort = () => finish(reject, new Error('processing_cancelled'));
    const timeoutId = setTimeout(
      () => finish(reject, new Error('mediabunny_cdn_timeout')),
      Math.max(1, timeoutMs)
    );
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    promise.then(
      (module) => finish(resolve, module),
      (error) => finish(reject, error)
    );
  });
}

async function loadMediabunnyForCfr(signal, timeoutMs = 25000) {
  const urls = [
    'https://cdn.jsdelivr.net/npm/mediabunny@1.61.3/+esm',
    'https://esm.sh/mediabunny@1.61.3?bundle'
  ];
  const deadline = Date.now() + Math.max(1, timeoutMs);
  let lastError = null;

  for (let index = 0; index < urls.length; index++) {
    signal.throwIfAborted();
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    const url = urls[index];
    if (!ineasyMediabunnyCfrPromises.has(url)) {
      const promise = import(url).catch((error) => {
        ineasyMediabunnyCfrPromises.delete(url);
        throw error;
      });
      ineasyMediabunnyCfrPromises.set(url, promise);
    }

    const attemptBudget = index === 0 && urls.length > 1
      ? Math.min(remainingMs, Math.ceil(timeoutMs * 0.55))
      : remainingMs;
    try {
      return await waitForMediabunnyModule(
        ineasyMediabunnyCfrPromises.get(url),
        signal,
        attemptBudget
      );
    } catch (error) {
      if (signal.aborted || /processing_cancelled/i.test(String(error?.message || ''))) throw error;
      lastError = error;
      console.warn('[INEASY] Lightweight media module source failed:', url, error);
    }
  }

  if (/mediabunny_cdn_timeout/i.test(String(lastError?.message || '')) || Date.now() >= deadline) {
    throw new Error('mediabunny_load_timeout');
  }
  throw new Error('mediabunny_module_load_failed: ' + String(lastError?.message || 'unknown_error'));
}


async function getExplicitSdr1080pEligibility(file, dimensions) {
  const width = Number(dimensions?.width) || 0;
  const height = Number(dimensions?.height) || 0;
  const is1080p = (width === 1920 && height === 1080) || (width === 1080 && height === 1920);
  if (!is1080p) return { eligible: false, reason: 'not_1080p' };

  const core = globalThis.ADJNOriginalMp4Core || globalThis.FRYOriginalMp4Core;
  if (!core?.inspectMediaInfo) return { eligible: false, reason: 'metadata_inspector_unavailable' };
  try {
    const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 16 * 1024 * 1024)).arrayBuffer());
    const info = core.inspectMediaInfo(bytes);
    const track = (info?.tracks || []).find((item) => item.handler === 'vide') || {};
    const codec = String(track.codec || track.codecName || info?.codec || '').toLowerCase();
    if (!/(?:avc|h264|hev|hevc|h265)/i.test(codec)) {
      return { eligible: false, reason: 'unsupported_source_codec' };
    }
    const metadata = JSON.stringify({ info, track }).toLowerCase();
    if (/dolby.?vision|hdr10\+|hdr10|smpte2084|arib-std-b67|bt2020|hlg|\bpq\b/.test(metadata)) {
      return { eligible: false, reason: 'hdr_detected' };
    }
    // Fail closed: only transcode when metadata explicitly identifies an SDR transfer function.
    const transfer = String(track.transferCharacteristics || track.transfer || info?.transferCharacteristics || info?.transfer || '').toLowerCase();
    const primaries = String(track.colorPrimaries || track.primaries || info?.colorPrimaries || info?.primaries || '').toLowerCase();
    const explicitSdrTransfer = /bt709|smpte170m|bt470bg|bt470m|gamma22|gamma28|srgb/.test(transfer);
    const explicitSdrPrimaries = /bt709|smpte170m|bt470bg|bt470m|srgb/.test(primaries);
    if (!explicitSdrTransfer && !explicitSdrPrimaries) {
      return { eligible: false, reason: 'sdr_not_confirmed' };
    }
    return { eligible: true, reason: 'confirmed_sdr_1080p', info, codec };
  } catch (error) {
    console.warn('[INEASY] Could not confirm SDR metadata; preserving original FPS:', error);
    return { eligible: false, reason: 'metadata_inspection_failed' };
  }
}

async function convertVideoToExact5994Fps(inputBlob, inputName, signal, onProgress, sourceDurationSeconds, is4kSource = false, encoderPreference = 'prefer-hardware') {
  const TARGET_FPS = 60000 / 1001;
  signal.throwIfAborted();
  if (!inputBlob || !inputBlob.size) throw new Error('video_file_over_limit');

  onProgress?.(0.01);
  let input = null;
  let conversion = null;
  let activeOutput = null;
  let aborted = false;

  const cancelQuietly = (target) => {
    try {
      const task = target?.cancel?.();
      task?.catch?.(() => {});
    } catch (_) {}
  };
  const abortConversion = () => {
    aborted = true;
    cancelQuietly(conversion);
    cancelQuietly(activeOutput);
  };
  signal.addEventListener('abort', abortConversion, { once: true });

  try {
    // Stable pre-HDR motor: MediaBunny decodes and re-encodes actual frames.
    // frameRate + forceTranscode makes this a real CFR conversion, not an MP4
    // metadata edit. Keep the ADJN output inspector as the final FPS verifier.
    const media = await loadMediabunnyForCfr(signal, 25000);
    signal.throwIfAborted();

    const {
      Input, Output, Conversion, ALL_FORMATS, BlobSource, BufferTarget,
      Mp4OutputFormat
    } = media;

    if (![Input, Output, Conversion, ALL_FORMATS, BlobSource, BufferTarget,
          Mp4OutputFormat].every((item) => item !== undefined && item !== null)) {
      throw new Error('mediabunny_api_unavailable');
    }

    input = new Input({ source: new BlobSource(inputBlob), formats: ALL_FORMATS });
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new Error('video_track_missing');
    signal.throwIfAborted();

    // Explicitly lock output dimensions to the source display dimensions.
    // This prevents the browser encoder from silently choosing a smaller frame.
    const sourceWidth = Math.round(Number(await videoTrack.getDisplayWidth()));
    const sourceHeight = Math.round(Number(await videoTrack.getDisplayHeight()));
    if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) ||
        sourceWidth < 1 || sourceHeight < 1) {
      throw new Error('video_dimensions_unavailable');
    }

    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat(), target });
    activeOutput = output;

    conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: {
        codec: 'avc',
        width: sourceWidth,
        height: sourceHeight,
        frameRate: TARGET_FPS,
        // Match the source's average bitrate instead of the browser's unconstrained
        // "high" quality preset, which can nearly double file size at 59.94 fps.
        bitrate: Math.max(
          150000,
          Math.floor(
            (inputBlob.size * 8 / Math.max(1, Number(sourceDurationSeconds) || 1)) - 192000
          )
        ),
        hardwareAcceleration: encoderPreference,
        forceTranscode: true
      }
    });

    if (!conversion.isValid) {
      const discarded = (conversion.discardedTracks || [])
        .map((item) => item.reason || item.message || 'unsupported track')
        .join('; ');
      throw new Error('mediabunny_conversion_invalid' + (discarded ? ': ' + discarded : ''));
    }

    conversion.onProgress = (progress) => {
      if (!signal.aborted) {
        onProgress?.(Math.max(0, Math.min(1, Number(progress) || 0)));
      }
    };
    signal.throwIfAborted();
    await conversion.execute();
    signal.throwIfAborted();
    activeOutput = null;

    const buffer = target.buffer;
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
      throw new Error('fps_encoder_empty_output');
    }

    const mediaCore = globalThis.ADJNOriginalMp4Core || globalThis.FRYOriginalMp4Core;
    if (!mediaCore?.inspectMediaInfo) throw new Error('fps_encoder_verification_unavailable');
    const verified = mediaCore.inspectMediaInfo(new Uint8Array(buffer));
    const fps = Number(verified?.averageFps);
    if (!Number.isFinite(fps) || Math.abs(fps - TARGET_FPS) > 0.03) {
      throw new Error('fps_encoder_verification_failed: reported=' + String(fps));
    }
    if (Number(verified?.width) !== sourceWidth || Number(verified?.height) !== sourceHeight) {
      throw new Error('video_resolution_changed_during_cfr: expected=' +
        sourceWidth + 'x' + sourceHeight + '; actual=' +
        String(verified?.width) + 'x' + String(verified?.height));
    }

    const outputBlob = new Blob([buffer], { type: 'video/mp4' });
    console.info('[INEASY] CFR conversion verified', {
      inputBytes: inputBlob.size,
      outputBytes: outputBlob.size,
      outputFps: fps,
      targetFps: '60000/1001',
      codec: verified.codec || 'unknown',
      resolution: verified.width && verified.height
        ? String(verified.width) + 'x' + String(verified.height)
        : 'unknown',
      encoder: 'MediaBunny WebCodecs'
    });
    onProgress?.(1);
    return {
      blob: outputBlob,
      info: verified,
      fps,
      sourceFps: null,
      preserveOriginal: false,
      hdr: false,
      hdrTranscoded: false,
      main10Transcoded: false,
      hdrProfile: null
    };
  } catch (error) {
    if (signal.aborted || aborted || /processing_cancelled|AbortError/i.test(String(error?.message || ''))) {
      throw new Error('processing_cancelled');
    }
    cancelQuietly(conversion);
    cancelQuietly(activeOutput);
    console.error('[INEASY] CFR conversion failed:', error);
    const detail = String(error?.message || error || 'unknown_error').slice(0, 500);
    if (/mediabunny_load_timeout/i.test(detail)) throw new Error('mediabunny_load_timeout');
    if (/^(?:video_file_over_limit|fps_encoder_empty_output|fps_encoder_verification_failed|fps_encoder_verification_unavailable)$/i.test(detail)) {
      throw new Error(detail);
    }
    throw new Error('fps_encoder_failed: ' + detail);
  } finally {
    signal.removeEventListener('abort', abortConversion);
    try { input?.dispose?.(); } catch (_) {}
  }
}
async function prepareVideoForPatcher(file, dimensions, signal) {
  signal.throwIfAborted();
  return {
    blob: file,
    sourceFps: null,
    targetFrameRate: null,
    report: {
      performed: false,
      compressionDisabled: true,
      inputWidth: dimensions?.width || null,
      inputHeight: dimensions?.height || null,
      outputWidth: dimensions?.width || null,
      outputHeight: dimensions?.height || null
    }
  };
}

// ADJN's unchanged size guard expects the patched MP4 to be at least as large as its input.
// Some encoders write a long existing QuickTime ©too item which ADJN replaces with its own
// encoder marker; that can shrink the output by a few bytes and incorrectly reject the video.
// Convert only that metadata-item FourCC to a same-sized standard 'free' box before ADJN runs.
// File length, sample offsets, video/audio bitstreams, timestamps, and resolution do not change.
function neutralizeAdjnEncoderMetadata(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 16) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const listBoxes = (start, end) => {
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        start < 0 || end > bytes.byteLength || start > end) return null;
    const boxes = [];
    let offset = start;
    while (offset < end) {
      if (offset + 8 > end) return null;
      let size = view.getUint32(offset, false);
      let header = 8;
      if (size === 1) {
        if (offset + 16 > end) return null;
        const hi = view.getUint32(offset + 8, false);
        const lo = view.getUint32(offset + 12, false);
        size = hi * 4294967296 + lo;
        header = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (!Number.isSafeInteger(size) || size < header || offset + size > end) return null;
      boxes.push({
        start: offset,
        end: offset + size,
        header,
        type: String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7])
      });
      offset += size;
    }
    return offset === end ? boxes : null;
  };

  const top = listBoxes(0, bytes.byteLength);
  if (!top) return 0;
  let changed = 0;

  const processMeta = (metaBox) => {
    const childrenStart = metaBox.start + metaBox.header + 4; // meta is an ISO FullBox
    if (childrenStart > metaBox.end) return;
    const metaChildren = listBoxes(childrenStart, metaBox.end);
    if (!metaChildren) return;
    for (const ilst of metaChildren) {
      if (ilst.type !== 'ilst') continue;
      const items = listBoxes(ilst.start + ilst.header, ilst.end);
      if (!items) continue;
      for (const item of items) {
        // ©too is encoded as byte 0xA9 followed by the ASCII bytes "too".
        if (bytes[item.start + 4] === 0xA9 &&
            bytes[item.start + 5] === 0x74 &&
            bytes[item.start + 6] === 0x6f &&
            bytes[item.start + 7] === 0x6f &&
            item.end - item.start >= item.header + 8) {
          // Replace only the 4-byte item type; keep every size and offset identical.
          bytes[item.start + 4] = 0x66; // f
          bytes[item.start + 5] = 0x72; // r
          bytes[item.start + 6] = 0x65; // e
          bytes[item.start + 7] = 0x65; // e
          changed += 1;
        }
      }
    }
  };

  const processUdta = (udta) => {
    const children = listBoxes(udta.start + udta.header, udta.end);
    if (!children) return;
    for (const child of children) {
      if (child.type === 'meta') processMeta(child);
    }
  };

  for (const moov of top.filter((box) => box.type === 'moov')) {
    const children = listBoxes(moov.start + moov.header, moov.end);
    if (!children) continue;
    for (const child of children) {
      if (child.type === 'udta') processUdta(child);
      else if (child.type === 'meta') processMeta(child);
    }
  }
  return changed;
}

function getPostingDeviceForPlatform() {
  const isPhoneMode = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isPhoneMode ? 'phone' : 'pc';
}

let fileSelectionVersion = 0;
let selectedVideoDimensions = null;

function rejectFileSelection(message) {
  setPublicationActionsVisible(false);
  if (durationNotice) durationNotice.classList.add('hidden');
  document.querySelector('.patcher-version-picker')?.classList.add('hidden');
  document.getElementById('patcherVersionNote')?.classList.add('hidden');
  document.getElementById('fpsAdvice')?.classList.add('hidden');
  if (fileInput) fileInput.value = '';
  selectedVideoDimensions = null;
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = null;
  if (previewVideo) {
    previewVideo.removeAttribute('src');
    previewVideo.load();
  }
  if (previewWrap) previewWrap.classList.remove('show');
  if (postingDeviceSelect) postingDeviceSelect.value = '';
  if (patchedDownloadUrl) URL.revokeObjectURL(patchedDownloadUrl);
  patchedDownloadUrl = null;
  processedVideoBlob = null;
  if (processedResult) processedResult.classList.add('hidden');
  setProcessingState('error', message);
  updateProcessButton();
}

async function handleFile(file) {
  const selectionVersion = ++fileSelectionVersion;
  selectedVideoDimensions = null;
  checkingFileDimensions = false;
  if (processController) processController.abort();
  if (currentBalance === 0) {
    if (fileInput) fileInput.value = '';
    updateDropzoneAvailability();
    return;
  }
  if (file && file.size > MAX_VIDEO_SIZE_BYTES) {
    rejectFileSelection(t('videoTooLarge'));
    return;
  }
  const isVideo = file && (file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi|3gp|3g2|ts|mts|m2ts|mpg|mpeg|wmv|flv|ogv)$/i.test(file.name));
  if (!isVideo || file.size < 16) {
    rejectFileSelection(t('errorInvalidFile'));
    return;
  }

  // Show the selected file immediately; metadata validation can be slow on Safari for large MOV/MP4 files.
  // Clear the previous result/publication controls before the new file's metadata check begins.
  if (processedResult) processedResult.classList.add('hidden');
  if (processingState) processingState.classList.add('hidden');
  if (durationNotice) durationNotice.classList.add('hidden');
  setPublicationActionsVisible(false);
  if (patchedDownloadUrl) URL.revokeObjectURL(patchedDownloadUrl);
  patchedDownloadUrl = null;
  processedVideoBlob = null;
  if (tiktokComposerOverlay) tiktokComposerOverlay.classList.add('hidden');
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(file);
  if (previewVideo) {
    previewVideo.preload = 'metadata';
    previewVideo.playsInline = true;
    previewVideo.src = currentObjectUrl;
    previewVideo.load();
  }
  if (fileMeta) fileMeta.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  if (previewWrap) previewWrap.classList.add('show');

  document.querySelector('.patcher-version-picker')?.classList.remove('hidden');
  document.getElementById('patcherVersionNote')?.classList.remove('hidden');
  document.getElementById('fpsAdvice')?.classList.toggle('hidden', getSelectedPatcherVersion() !== 'v1');
  checkingFileDimensions = true;
  updateProcessButton();
  let dimensions;
  try {
    dimensions = await readVideoDimensionsForSelection(file);
  } catch (error) {
    if (selectionVersion !== fileSelectionVersion) return;
    checkingFileDimensions = false;
    rejectFileSelection(t('videoDimensionsUnavailable'));
    return;
  }
  if (selectionVersion !== fileSelectionVersion) return;
  checkingFileDimensions = false;
  // Do not read the entire source MP4 into RAM at selection time just to show
  // a frame-rate advisory. The real CFR conversion and verification run in processing.
  if (selectionVersion !== fileSelectionVersion) return;
  const fpsPolicyNote = document.getElementById('fpsPolicyNote');
  if (fpsPolicyNote) {
    fpsPolicyNote.textContent = translations[STATE.lang]?.fpsPolicyNote || translations.en.fpsPolicyNote;
    fpsPolicyNote.classList.remove('hidden');
  }
  // Do not reject large HDR/UHD sources by resolution. Actual browser/WASM memory
  // remains the practical limit; keep the selected dimensions unchanged.
  const selectedLongSide = Math.max(dimensions.width, dimensions.height);
  selectedVideoDimensions = dimensions;
  // Keep the large FFmpeg/WASM fallback unloaded while the user selects a file.
  // It is imported only if HDR inspection or the primary browser encoder needs it.
  if (patchedDownloadUrl) URL.revokeObjectURL(patchedDownloadUrl);
  patchedDownloadUrl = null;
  processedVideoBlob = null;
  if (tiktokComposerOverlay) tiktokComposerOverlay.classList.add('hidden');
  if (postingDeviceSelect) postingDeviceSelect.value = getPostingDeviceForPlatform();
  updateProcessButton();
  if (processingState) processingState.classList.add('hidden');
  if (processedResult) processedResult.classList.add('hidden');
  if (tiktokComposerOverlay) tiktokComposerOverlay.classList.add('hidden');
}

if (dropzone) {
  dropzone.addEventListener('click', (event) => {
    if (event.target === fileInput) return;
    if (currentBalance === 0 || event.target.closest('.balance-lock-actions')) return;
    if (fileInput) fileInput.click();
  });
}

const buyOnSiteBtn = document.getElementById('buyOnSiteBtn');
if (buyOnSiteBtn) buyOnSiteBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  plusBtn?.click();
});

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
      if (currentBalance === 0) return;
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
    if (currentBalance === 0) return;
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
}

function clearSelectedVideo(openPicker = false) {
  fileSelectionVersion += 1;
  checkingFileDimensions = false;
  selectedVideoDimensions = null;
  if (processController) processController.abort();
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = null;
  if (patchedDownloadUrl) URL.revokeObjectURL(patchedDownloadUrl);
  patchedDownloadUrl = null;
  processedVideoBlob = null;
  if (previewVideo) {
    previewVideo.pause();
    previewVideo.removeAttribute('src');
    previewVideo.load();
  }
  if (previewWrap) previewWrap.classList.remove('show');
  if (postingDeviceSelect) postingDeviceSelect.value = '';
  if (fileInput) fileInput.value = '';
  if (fileMeta) fileMeta.textContent = '—';
  document.querySelector('.patcher-version-picker')?.classList.add('hidden');
  document.getElementById('patcherVersionNote')?.classList.add('hidden');
  document.getElementById('fpsAdvice')?.classList.add('hidden');
  if (processedResult) processedResult.classList.add('hidden');
  if (processingState) processingState.classList.add('hidden');
  if (durationNotice) durationNotice.classList.add('hidden');
  setPublicationActionsVisible(false);
  if (tiktokComposerOverlay) tiktokComposerOverlay.classList.add('hidden');
  updateProcessingProgress(0);
  updateProcessButton();
  if (openPicker && fileInput && !fileInput.disabled) fileInput.click();
}

if (clearBtn) clearBtn.addEventListener('click', () => clearSelectedVideo(false));
if (optimizeAnotherBtn) optimizeAnotherBtn.addEventListener('click', () => clearSelectedVideo(true));

// --- Analyzer fixes ---
const checkerOpenBtn = document.getElementById('checkerOpenBtn');
const checkerForm = document.getElementById('checkerForm');
const checkerUrl = document.getElementById('checkerUrl');
const checkerSource = document.getElementById('checkerSource');
const checkerStatus = document.getElementById('checkerStatus');
const checkerResult = document.getElementById('checkerResult');
const analyzeBtn = document.getElementById('analyzeBtn');
let checkerRequestToken = 0;

function escapeAnalyzerValue(value) {
  return String(value ?? '—').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function resetAnalyzerUi() {
  if (!checkerStatus || !checkerResult) return;
  checkerStatus.className = 'checker-status';
  checkerStatus.textContent = '';
  if (checkerSource) {
    checkerSource.classList.add('hidden');
    checkerSource.textContent = '';
  }
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
    if (checkerSource) {
      checkerSource.textContent = `${t('analyzerSource')}: ${rawUrl}`;
      checkerSource.classList.remove('hidden');
    }
    if (checkerStatus) {
      checkerStatus.className = 'checker-status loading';
      checkerStatus.textContent = t('analyzerLoading');
    }
    if (analyzeBtn) analyzeBtn.disabled = true;

    try {
      const response = await fetch('/api/check-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getBrowserValue('tg_auth_token') || ''}`,
        },
        body: JSON.stringify({ url: rawUrl }),
      });

      const data = await response.json();
      if (token !== checkerRequestToken) return;
      if (!response.ok) throw new Error(data.error || 'check_failed');

      const quality = escapeAnalyzerValue(data.quality);
      const width = escapeAnalyzerValue(data.width);
      const height = escapeAnalyzerValue(data.height);
      const fps = escapeAnalyzerValue(data.fps);
      const codec = escapeAnalyzerValue(data.codec);
      const bitrate = escapeAnalyzerValue(data.bitrate);
      const size = escapeAnalyzerValue(data.size);
      const duration = escapeAnalyzerValue(data.duration);
      const author = escapeAnalyzerValue(data.author);
      const region = escapeAnalyzerValue(data.region || t('analyzerRegionUnavailable'));

      if (checkerStatus) {
        checkerStatus.className = 'checker-status success';
        checkerStatus.textContent = t('analyzerDone');
      }

      if (checkerResult) {
        checkerResult.innerHTML = `
          <div class="result-heading"><span>✓</span><div><small>${t('checkResult')}</small><strong>${t('analyzerDone')}</strong></div></div>
          <div class="result-meta">
            <div><small>${t('analyzerAuthor')}</small><strong>${author}</strong></div>
            <div><small>${t('analyzerRegion')}</small><strong>${region}</strong></div>
          </div>
          <div class="result-grid">
            <div><small>${t('quality')}</small><strong>${quality}p</strong><span>${width} × ${height}</span></div>
            <div><small>${t('fps')}</small><strong>${fps} FPS</strong></div>
            <div><small>${t('codec')}</small><strong>${codec}</strong></div>
            <div><small>${t('bitrate')}</small><strong>${bitrate}</strong></div>
            <div><small>${t('analyzerSize')}</small><strong>${size}</strong></div>
            <div><small>${t('analyzerDuration')}</small><strong>${duration}</strong></div>
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
    } finally {
      if (token === checkerRequestToken && analyzeBtn) analyzeBtn.disabled = false;
    }
  });
}

function applyProvidedNavIcons() {
  const icons = {
    homeSection: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    patchSection: '<path fill-rule="evenodd" clip-rule="evenodd" d="M11.9426 1.25h.1148c2.3084 0 4.1174 0 5.5289.18975 1.4447.19424 2.5848.59958 3.4796 1.49439.8948.89481 1.3001 2.03483 1.4944 3.47957.1897 1.41148.1897 3.22052.1897 5.52889v.1148c0 2.3084 0 4.1174-.1897 5.5289-.1943 1.4447-.5996 2.5848-1.4944 3.4796-.8948.8948-2.0349 1.3001-3.4796 1.4944-1.4115.1897-3.2205.1897-5.5289.1897h-.1148c-2.30837 0-4.11741 0-5.52889-.1897-1.44474-.1943-2.58476-.5996-3.47957-1.4944-.89481-.8948-1.30015-2.0349-1.49439-3.4796C1.24998 16.1748 1.24999 14.3658 1.25 12.0574v-.1148c-.00001-2.30837-.00002-4.11741.18975-5.52889.19424-1.44474.59958-2.58476 1.49439-3.47957.89481-.89481 2.03483-1.30015 3.47957-1.49439C7.82519 1.24998 9.63423 1.24999 11.9426 1.25ZM6.61358 2.92637c-1.27841.17188-2.04913.49877-2.61878 1.06843-.56966.56965-.89655 1.34037-1.06843 2.61878C2.75159 7.91356 2.75 9.62177 2.75 12c0 2.3782.00159 4.0864.17637 5.3864.17188 1.2784.49877 2.0491 1.06843 2.6188.56965.5697 1.34037.8966 2.61878 1.0684C7.91356 21.2484 9.62177 21.25 12 21.25c2.3782 0 4.0864-.0016 5.3864-.1764 1.2784-.1718 2.0491-.4987 2.6188-1.0684.5697-.5697.8966-1.3404 1.0684-2.6188C21.2484 16.0864 21.25 14.3782 21.25 12c0-2.37823-.0016-4.08644-.1764-5.38642-.1718-1.27841-.4987-2.04913-1.0684-2.61878-.5697-.56966-1.3404-.89655-2.6188-1.06843C16.0864 2.75159 14.3782 2.75 12 2.75c-2.37823 0-4.08644.00159-5.38642.17637ZM5.5 7.25c.41421 0 .75.33579.75.75v3.25h3.31482V8c0-.41421.33578-.75.75-.75s.75.33579.75.75v8c0 .4142-.33578.75-.75.75s-.75-.3358-.75-.75v-3.25H6.25V16c0 .4142-.33579.75-.75.75s-.75-.3358-.75-.75V8c0-.41421.33579-.75.75-.75Zm6.4722 1.55c0-.98021.9031-1.55 1.713-1.55 2.9372 0 5.5648 2.00248 5.5648 4.75s-2.6276 4.75-5.5648 4.75c-.8099 0-1.713-.5698-1.713-1.55V8.8Zm1.5.02154v6.35696c.0027.0027.0063.0062.0113.0103.0326.0271.1015.0612.2017.0612 2.3811 0 4.0648-1.5792 4.0648-3.25s-1.6837-3.25-4.0648-3.25c-.1002 0-.1691.0342-.2017.0612-.005.0042-.0086.0076-.0113.0104Z"/>',
    checkerSection: '<path d="M2 9V6.5C2 4.01 4.01 2 6.5 2H9M15 2h2.5C19.99 2 22 4.01 22 6.5V9M22 15v2.5c0 2.49-2.01 4.5-4.5 4.5H15M9 22H6.5C4.01 22 2 19.99 2 17.5V15M17 9.5v5c0 2-1 3-3 3h-4c-2 0-3-1-3-3v-5c0-2 1-3 3-3h4c2 0 3 1 3 3ZM19 12H5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    faqSection: '<path d="M12 21.6666C17.3386 21.6666 21.6666 17.3386 21.6666 12C21.6666 6.6613 17.3386 2.3333 12 2.3333C6.6613 2.3333 2.3333 6.6613 2.3333 12C2.3333 17.3386 6.6613 21.6666 12 21.6666Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17V12.3333C12 11.9652 11.7014 11.6666 11.3333 11.6666H10.3333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 9C11.264 9 10.6666 8.4013 10.6666 7.6666C10.6666 6.932 11.264 6.3333 12 6.3333C12.736 6.3333 13.3333 6.932 13.3333 7.6666C13.3333 8.4013 12.736 9 12 9Z" fill="currentColor"/>'
  };
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    const icon = tab.querySelector('.nav-icon svg');
    if (icon && icons[tab.dataset.view]) {
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('fill', tab.dataset.view === 'patchSection' ? 'currentColor' : 'none');
      icon.innerHTML = icons[tab.dataset.view];
    }
  });
}

applyProvidedNavIcons();

// --- Tabs and clean section URLs ---
const SECTION_PATHS = {
  homeSection: '/',
  patchSection: '/patcher',
  checkerSection: '/checker',
  faqSection: '/',
};
function syncSectionFromPath() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const view = path === '/patcher' ? 'patchSection'
    : path === '/checker' ? 'checkerSection'
    : 'homeSection';
  const tab = document.querySelector(`.nav-tab[data-view="${view}"]`);
  if (tab) tab.click();
}
document.querySelectorAll('.nav-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const nextPath = SECTION_PATHS[tab.dataset.view] || '/app.html';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ ineasyView: tab.dataset.view }, '', nextPath);
    }
    if (tab.dataset.view !== 'patchSection') {
      setPublicationActionsVisible(false);
      if (tiktokComposerOverlay) tiktokComposerOverlay.classList.add('hidden');
    }
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
    const icon = tab.querySelector('.nav-icon');
    if (icon) {
      icon.classList.remove('icon-arrive');
      requestAnimationFrame(() => icon.classList.add('icon-arrive'));
    }
    const target = document.getElementById(tab.dataset.view);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }
  });
});

document.querySelectorAll('[data-open-view]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector(`.nav-tab[data-view="${button.dataset.openView}"]`)?.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
window.addEventListener('popstate', syncSectionFromPath);
if (!PATCHER_TEST_MODE) syncSectionFromPath();

if (PATCHER_TEST_MODE) {
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.hidden = tab.dataset.view !== 'patchSection';
  });
  document.querySelector('.balance-pill')?.setAttribute('hidden', '');
  document.querySelector('.community-callout')?.setAttribute('hidden', '');
  document.querySelector('.site-footer')?.setAttribute('hidden', '');
  publishTiktokBtn.hidden = true;
  document.querySelector('.nav-tab[data-view="patchSection"]')?.click();
}

const comparisonRange = document.getElementById('comparisonRange');
const qualityComparison = document.getElementById('qualityComparison');
if (comparisonRange && qualityComparison) {
  const updateComparison = () => qualityComparison.style.setProperty('--compare-split', `${comparisonRange.value}%`);
  comparisonRange.addEventListener('input', updateComparison);
  updateComparison();
}



if (processBtn) {
  processBtn.addEventListener('click', async () => {
    if (!fileInput || !fileInput.files[0] || processBtn.disabled) return;
    if (fileInput.files[0].size > MAX_VIDEO_SIZE_BYTES) {
      rejectFileSelection(t('videoTooLarge'));
      return;
    }
    processBtn.disabled = true;
    try {
      if (!await refreshBalanceForProcessing()) {
        setProcessingState('error', t('noBalance'));
        updateProcessButton();
        return;
      }
    } catch (error) {
      setProcessingState('error', t('balanceCheckFailed'));
      updateProcessButton();
      return;
    }

    const sourceFile = fileInput.files[0];
    const postingDevice = postingDeviceSelect.value;
    if (!['pc', 'phone', 'phone-ghost'].includes(postingDevice)) {
      setProcessingState('error', t('choosePostingDevice'));
      updateProcessButton();
      return;
    }
    const controller = new AbortController();
    let processingTimedOut = false;
    let processingTimeoutId = setTimeout(() => {
      processingTimedOut = true;
      controller.abort();
    }, 1200000);
    processController = controller;
    processBtn.disabled = true;
    if (cancelProcessBtn) cancelProcessBtn.disabled = false;
    if (processingState) {
      processingState.classList.remove('hidden');
      processingState.classList.remove('completed', 'failed');
    }
    if (processedResult) processedResult.classList.add('hidden');
    if (processingText) processingText.textContent = '';
    updateProcessingProgress(0);

    let originalInputFps = null;
    try {
      setProcessingState('processing', '');
      updateProcessingProgress(1);
      const sourceDuration = await readVideoDuration(sourceFile, controller.signal);
      controller.signal.throwIfAborted();

      setProcessingState('processing', '');
      updateProcessingProgress(3);

      // Patcher-only mode: do not transcode or change the source frame rate.
      // Keeping the original media avoids the expensive metadata scan and encoder startup
      // that previously left large videos stuck near 4%. ADJN performs the patch on the
      // original MP4/MOV bytes and validates resolution, timing, codec and HDR signaling.
      const isV2SelectedForJob = getSelectedPatcherVersion() === 'v2';
      const sourceLongSide = Math.max(
        Number(selectedVideoDimensions?.width) || 0,
        Number(selectedVideoDimensions?.height) || 0
      );
      const is4kSource = sourceLongSide >= 3000;
      const sourceExtension = String(sourceFile.name || '').toLowerCase().match(/\.([^.]+)$/)?.[1] || '';
      if (!['mp4', 'mov', 'm4v'].includes(sourceExtension)) {
        throw new Error('patcher_requires_mp4_mov');
      }

      // Convert only confirmed SDR 1080p with an explicit supported AVC/HEVC codec.
      // HDR, unknown color metadata, other resolutions and unknown codecs keep original frames.
      const sdr1080pEligibility = !isV2SelectedForJob
        ? await getExplicitSdr1080pEligibility(sourceFile, selectedVideoDimensions)
        : { eligible: false, reason: 'v2_mode' };
      let fpsConversion = {
        blob: sourceFile,
        info: {
          width: Number(selectedVideoDimensions?.width) || null,
          height: Number(selectedVideoDimensions?.height) || null,
          averageFps: null,
          codec: ''
        },
        fps: null,
        sourceFps: null,
        preserveOriginal: true,
        hdr: false,
        hdrTranscoded: false,
        main10Transcoded: false,
        hdrProfile: null
      };
      if (sdr1080pEligibility.eligible) {
        console.info('[INEASY] Converting confirmed SDR 1080p to exact 59.94 FPS', {
          sourceCodec: sdr1080pEligibility.codec
        });
        fpsConversion = await convertVideoToExact5994Fps(
          sourceFile,
          sourceFile.name,
          controller.signal,
          (progress) => updateProcessingProgress(3 + Math.round(Math.max(0, Math.min(1, progress)) * 10)),
          sourceDuration,
          false,
          'prefer-hardware'
        );
      } else {
        console.info('[INEASY] Preserving source FPS; CFR conversion not eligible:', sdr1080pEligibility.reason);
      }
      originalInputFps = null;
      const normalizedFile = fpsConversion.blob || sourceFile;
      const basePreparedInput = {
        blob: normalizedFile,
        report: {
          performed: false,
          compressionDisabled: true,
          skippedForV2: isV2SelectedForJob
        }
      };
      const preparedInput = {
        ...basePreparedInput,
        blob: normalizedFile,
        sourceFps: null,
        targetFrameRate: null,
        report: {
          ...(basePreparedInput.report || {}),
          performed: false,
          compressionDisabled: true,
          cfrNormalized: false,
          hdrSourcePreserved: false,
          hdrCfrRequired: false,
          hdrMain10Encoded: false,
          hdrProfile: null,
          frameRateRetimed: false,
          targetFrameRate: null,
          inputWidth: selectedVideoDimensions?.width || null,
          inputHeight: selectedVideoDimensions?.height || null,
          outputWidth: selectedVideoDimensions?.width || null,
          outputHeight: selectedVideoDimensions?.height || null
        }
      };
      const processingFile = preparedInput.blob;
      const processingFileName = processingFile.name || `${sourceFile.name.replace(/\.[^.]+$/, '')}.mp4`;
      const buffer = await processingFile.arrayBuffer();
      // Keep ADJN and its SIZE GUARD unchanged; only eligible 1080p SDR is transcoded before patching.
      if (!isV2SelectedForJob && !fpsConversion.preserveOriginal) {
        const neutralizedItems = neutralizeAdjnEncoderMetadata(new Uint8Array(buffer));
        if (neutralizedItems > 0) {
          console.info('[INEASY] Normalized replaceable encoder metadata before ADJN:', {
            items: neutralizedItems,
            bytesChanged: neutralizedItems * 4,
            containerLengthPreserved: true
          });
        }
      }
      controller.signal.throwIfAborted();
      updateProcessingProgress(15);

      const requestId = `ineasy-${Date.now()}`;

      // Run heavy patching in a Web Worker (off main thread) to avoid UI lag.
      // No CFR conversion or whole-file HDR scan runs before the worker starts.
      const result = await new Promise((resolve, reject) => {
        let workerDone = false;

        // Abort support
        const onAbort = () => {
          if (!workerDone) {
            workerDone = true;
            worker.terminate();
            reject(new Error('processing_cancelled'));
          }
        };
        controller.signal.addEventListener('abort', onAbort, { once: true });

        const worker = new Worker('adjn-worker.js?v=20261012-3');
        let workerReadyTimeoutId = setTimeout(() => {
          if (workerDone) return;
          workerDone = true;
          controller.signal.removeEventListener('abort', onAbort);
          worker.terminate();
          reject(new Error('adjn_worker_ready_timeout'));
        }, 15000);

        const clearWorkerReadyTimeout = () => {
          if (workerReadyTimeoutId) clearTimeout(workerReadyTimeoutId);
          workerReadyTimeoutId = null;
        };

        worker.onmessage = (e) => {
          const msg = e.data;
          if (!msg) return;

          if (msg.type === 'READY') {
            clearWorkerReadyTimeout();
            // Worker is ready, send the job (transfer buffer ownership — zero copy)
            try {
              worker.postMessage({
                type: 'PROCESS',
                requestId,
                buffer,
                file: processingFile,
                duration: sourceDuration,
                fileName: processingFileName,
                fileType: processingFile.type || sourceFile.type || 'video/mp4',
                fileSize: processingFile.size || buffer.byteLength,
                preparationReport: preparedInput.report || null,
                engine: getSelectedPatcherVersion() === 'v2' ? 'rein-beta' : '2.1.5'
              }, [buffer]);
            } catch (error) {
              clearWorkerReadyTimeout();
              workerDone = true;
              controller.signal.removeEventListener('abort', onAbort);
              worker.terminate();
              reject(new Error('adjn_worker_post_message_failed: ' + (error?.message || error)));
            }
            return;
          }

          if (msg.type === 'STAGE') {
            if (controller.signal.aborted) return;
            // Worker progress uses its own 0-100 scale; show patcher work directly.
            const workerProgress = Math.max(0, Math.min(100, Number(msg.progress) || 0));
            updateProcessingProgress(15 + Math.round(workerProgress * 0.83));
            return;
          }

          if (msg.type === 'DONE') {
            clearWorkerReadyTimeout();
            workerDone = true;
            controller.signal.removeEventListener('abort', onAbort);
            worker.terminate();
            resolve({
              output: new Uint8Array(msg.output),
              outputMime: msg.outputMime,
              inputInfo: msg.inputInfo,
              outputInfo: msg.outputInfo,
              hdr: msg.hdr,
              outputHdr: msg.outputHdr,
              passthrough: msg.passthrough,
              mode: msg.mode,
              report: msg.report,
              metadataReport: msg.metadataReport,
              compatibility: msg.compatibility,
              rateControlReport: msg.rateControlReport,
              inputBytes: msg.inputBytes
            });
            return;
          }

          if (msg.type === 'ERROR') {
            clearWorkerReadyTimeout();
            workerDone = true;
            controller.signal.removeEventListener('abort', onAbort);
            worker.terminate();
            reject(new Error(msg.message || 'Worker processing failed'));
          }
        };

        worker.onerror = (err) => {
          if (!workerDone) {
            clearWorkerReadyTimeout();
            workerDone = true;
            controller.signal.removeEventListener('abort', onAbort);
            worker.terminate();
            reject(new Error(err?.message || 'Worker crashed'));
          }
        };
        worker.onmessageerror = () => {
          if (!workerDone) {
            clearWorkerReadyTimeout();
            workerDone = true;
            controller.signal.removeEventListener('abort', onAbort);
            worker.terminate();
            reject(new Error('adjn_worker_message_error'));
          }
        };
      });


      if (controller.signal.aborted) throw new Error('processing_cancelled');

      // V2 may pass through the source file when no byte-level patch is required.
      const isV2Selected = getSelectedPatcherVersion() === 'v2';
      const isV2InputPassThrough = isV2Selected && Boolean(result.passthrough);
      // Never append artificial padding: keep the patcher's output-size contract unchanged.
      const outputBytes = result.output;
      let outputBlob = isV2InputPassThrough
        ? processingFile
        : new Blob([outputBytes], { type: result.outputMime || 'video/mp4' });
      // Keep the patcher's output-size contract visible in diagnostics.
      if (outputBlob.size > sourceFile.size + 200 * 1024) {
        console.warn('[INEASY] Patcher output is larger than the source:', {
          sourceBytes: sourceFile.size,
          outputBytes: outputBlob.size,
          extraBytes: outputBlob.size - sourceFile.size
        });
      }

      // Inspect the actual patcher output before returning it; FPS is preserved, not normalized.
      const outputMediaCore = globalThis.ADJNOriginalMp4Core || globalThis.FRYOriginalMp4Core;
      let verifiedOutputInfo = null;
      if (outputMediaCore?.inspectMediaInfo) {
        try { verifiedOutputInfo = outputMediaCore.inspectMediaInfo(outputBytes); } catch (_) {}
      }
      verifiedOutputInfo = verifiedOutputInfo || result.outputInfo || result.info || null;
      const verifiedOutputFps = Number(verifiedOutputInfo?.averageFps);
      const verifiedHdrProfile = result.outputHdr || result.hdr || null;
      const hdrSourcePreserved = Boolean(
        verifiedHdrProfile?.hdr10 || verifiedHdrProfile?.hdr10plus || verifiedHdrProfile?.hlg ||
        verifiedHdrProfile?.dolbyVision || verifiedHdrProfile?.main10
      );
      if (is4kSource) {
        // Compare the patcher's coded dimensions to its own source metadata. The preview
        // may expose display-rotated dimensions for phone videos, while MP4 tkhd stores coded ones.
        const expectedWidth = Number(result.inputInfo?.width || selectedVideoDimensions?.width);
        const expectedHeight = Number(result.inputInfo?.height || selectedVideoDimensions?.height);
        const finalWidth = Number(verifiedOutputInfo?.width);
        const finalHeight = Number(verifiedOutputInfo?.height);
        if (!expectedWidth || !expectedHeight || finalWidth !== expectedWidth || finalHeight !== expectedHeight) {
          throw new Error('resolution_output_verification_failed');
        }
        console.info('[INEASY] Final 4K output verified after ADJN', {
          resolution: finalWidth + 'x' + finalHeight,
          sourceFpsPreserved: verifiedOutputFps,
          adjnMode: result.mode,
          adjnPassthrough: Boolean(result.passthrough)
        });
      }
      if (hdrSourcePreserved || preparedInput.report?.hdrCfrRequired) {
        const outputHdrProfile = result.outputHdr || result.hdr || null;
        const outputHasHdrSignaling = Boolean(
          outputHdrProfile?.hdr10 ||
          outputHdrProfile?.hdr10plus ||
          outputHdrProfile?.hlg ||
          outputHdrProfile?.dolbyVision ||
          outputHdrProfile?.main10
        );
        if (!outputHasHdrSignaling) throw new Error('hdr_output_verification_failed');
        console.info('[INEASY] HDR output verified after CFR processing', {
          profile: outputHdrProfile?.label || preparedInput.report?.hdrProfile?.label || 'HDR / 10-bit',
          cfrTranscoded: Boolean(preparedInput.report?.hdrCfrRequired),
          fps: verifiedOutputFps || 'unknown'
        });
      }
      result.outputInfo = verifiedOutputInfo;
      result.outputMime = 'video/mp4';
      result.mode = (result.mode || 'patched') + '+source-fps-preserved';

      await consumeProcessedVideo();
      processedVideoBlob = outputBlob;
      patchedDownloadUrl = URL.createObjectURL(outputBlob);
      if (downloadBtn) {
        downloadBtn.href = patchedDownloadUrl;
        const originalExtension = sourceFile.name.match(/\.([^.]+)$/)?.[1] || 'mp4';
        const outputExtension = result.outputMime === 'video/mp4' ? 'mp4' : originalExtension;
        downloadBtn.download = `${sourceFile.name.replace(/\.[^.]+$/, '')}-ineasy.${outputExtension}`;
      }

      const metaInfo = result.outputInfo || result.info;
      const hdrInfo = result.outputHdr || result.hdr;
      const resText = metaInfo && metaInfo.width ? `${metaInfo.width}×${metaInfo.height}` : '';
      const fpsText = metaInfo?.averageFps ? `${metaInfo.averageFps.toFixed(2)} FPS` : '';
      const codecText = metaInfo?.codec ? String(metaInfo.codec).toUpperCase() : '';
      const hdrText = hdrInfo?.label && hdrInfo.label !== 'SDR / unknown' ? hdrInfo.label : '';
      console.info('[INEASY] Media processing complete', {
        mode: result.mode || 'unknown',
        passthrough: Boolean(result.passthrough),
        rateControl: result.rateControlReport || null,
        sourceMetadataReport: result.metadataReport || null,
        sourceCompatibility: result.compatibility || null,
        patcherActive: !result.passthrough && result.mode === 'adjn-core-resolution-codec-safe',
        inputFps: originalInputFps ?? result.inputInfo?.averageFps ?? null,
        outputFps: metaInfo?.averageFps ?? null,
        frameRateRetimed: Boolean(preparedInput.report?.frameRateRetimed) || Boolean(result.report?.frameRateRetimed),
        cfrNormalizedBeforePatching: Boolean(preparedInput.report?.cfrNormalized),
        durationUnknown: result.report?.durationUnknown ?? null,
        encoderTag: result.report?.encoderTag || '',
        resolution: resText || 'unknown',
        codec: codecText || 'unknown',
        hdr: hdrInfo?.label || 'SDR / unknown',
        inputBytes: result.inputBytes || sourceFile.size,
        outputBytes: outputBlob.size,
      });
      const resultSubNode = document.getElementById('resultSub');
      const compatibilityNoteNode = document.getElementById('compatibilityNote');
      const outputLongSide = Math.max(Number(metaInfo?.width) || 0, Number(metaInfo?.height) || 0);
      const outputResolutionLabel = outputLongSide >= 3840 ? '4K' : '1080p';
      if (resultSubNode) resultSubNode.textContent = `${outputResolutionLabel} • ${resText || 'resolution verified'}`;
      if (compatibilityNoteNode) compatibilityNoteNode.textContent = t('compatibilityNote');
      if (durationNotice) durationNotice.classList.remove('hidden');
      setPublicationActionsVisible(true);

      if (processingText) processingText.textContent = '';
      updateProcessingProgress(100);
      if (processingState) processingState.classList.add('completed');
      if (processedResult) processedResult.classList.remove('hidden');
    } catch (error) {
      console.error('[INEASY] Video processing failed:', error);
      if (processingState) processingState.classList.add('failed');
      if (processingText) processingText.textContent = processingTimedOut
        ? t('processingTimedOut')
        : controller.signal.aborted ? t('processingCancelled') : localizePatchError(error.message);
      // Keep the last reached percentage visible on errors instead of snapping back to zero.
    } finally {
      clearTimeout(processingTimeoutId);
      processController = null;
      updateProcessButton();
      if (cancelProcessBtn) cancelProcessBtn.disabled = true;
    }
  });
}

if (cancelProcessBtn) cancelProcessBtn.addEventListener('click', () => processController?.abort());

function localizePatchError(message) {
  const lang = STATE.lang || 'en';
  const conversionFailure = String(message || '').match(/^AUTO_VIDEO_CONVERSION_FAILED:\s*(.*)$/i);
  if (conversionFailure) {
    if (/cannot encode H\.264/i.test(conversionFailure[1])) {
      return {
        ru: 'Браузер не поддерживает кодирование H.264 при разрешении этого видео.',
        kk: 'Браузер осы бейненің ажыратымдылығында H.264 кодтауын қолдамайды.',
        en: 'This browser cannot encode H.264 at this video resolution.'
      }[lang];
    }
    const text = {
      ru: 'Не удалось подготовить видео для TikTok без потери пропорций. Причина',
      kk: 'TikTok үшін бейнені пропорцияларын сақтап дайындау мүмкін болмады. Себебі',
      en: 'Could not prepare the video for TikTok while preserving its aspect ratio. Reason'
    }[lang];
    return `${text}: ${conversionFailure[1]}`;
  }
  const fpsRetimingFailure = String(message || '').match(/^fps_retime_failed:\s*(.*)$/i);
  if (fpsRetimingFailure) {
    const text = {
      ru: 'Не удалось безопасно изменить тайминг этого MP4 на 60,04 FPS. Причина',
      kk: 'Бұл MP4 таймингін 60,04 FPS-ке қауіпсіз өзгерту мүмкін болмады. Себебі',
      en: 'Could not safely retime this MP4 to 60.04 FPS. Reason'
    }[lang];
    return `${text}: ${fpsRetimingFailure[1]}`;
  }
  const rawError = String(message || '');
  const ffmpegExecFailure = rawError.match(/ffmpeg_4k_exec_failed:\s*exit=(\d+);\s*stage=([^;]+);\s*detail=([\s\S]*?)(?=;\s*(?:firstAttemptExit|MediaBunny)=|$)/i);
  if (ffmpegExecFailure) {
    const exitCode = ffmpegExecFailure[1];
    const stage = ffmpegExecFailure[2].trim();
    const detail = ffmpegExecFailure[3].trim().slice(0, 240);
    return {
      ru: 'Ошибка FFmpeg при обработке 4K (этап ' + stage + ', код ' + exitCode + '). Причина: ' + (detail || 'подробности смотрите в консоли браузера'),
      kk: '4K FFmpeg қатесі (кезең ' + stage + ', код ' + exitCode + '). Себебі: ' + (detail || 'толық мәлімет браузер консолінде'),
      en: 'FFmpeg 4K error (stage ' + stage + ', code ' + exitCode + '). Cause: ' + (detail || 'see browser console')
    }[lang];
  }
  const assetFailure = rawError.match(/ffmpeg_4k_asset_download_failed:\s*(\d+)/i);
  if (assetFailure) {
    return {
      ru: 'Не удалось загрузить файл FFmpeg с CDN (HTTP ' + assetFailure[1] + '). Проверьте соединение и повторите попытку.',
      kk: 'FFmpeg файлын CDN-нен жүктеу мүмкін болмады (HTTP ' + assetFailure[1] + '). Желіні тексеріп, қайталаңыз.',
      en: 'Could not download the FFmpeg asset from the CDN (HTTP ' + assetFailure[1] + '). Check the connection and retry.'
    }[lang];
  }
  const ffmpegStageFailure = rawError.match(/ffmpeg_4k_fallback_failed:\s*stage=([^;]+);\s*([\s\S]*?)(?=;\s*detail=|;\s*MediaBunny=|$)/i);
  if (ffmpegStageFailure) {
    const stage = ffmpegStageFailure[1].trim();
    const detail = ffmpegStageFailure[2].trim().slice(0, 240);
    return {
      ru: 'Сбой FFmpeg на этапе «' + stage + '». Причина: ' + (detail || 'загрузка или запуск кодировщика не завершились'),
      kk: 'FFmpeg қатесі, кезең: «' + stage + '». Себебі: ' + (detail || 'кодтағышты жүктеу немесе іске қосу аяқталмады'),
      en: 'FFmpeg failed at stage "' + stage + '". Cause: ' + (detail || 'encoder loading or startup did not finish')
    }[lang];
  }
  const knownErrors = [
    { test: /video_resolution_changed_during_cfr|resolution_output_verification_failed/i, ru: 'После конвертации 4K-разрешение изменилось. Файл не выдан.', kk: '4K түрлендіруден кейін ажыратымдылық өзгерді. Файл шығарылған жоқ.', en: 'The 4K resolution changed during processing. No file was produced.' },
    { test: /hdr_dolby_vision_transcode_unsupported/i, ru: 'Обнаружен Dolby Vision. Для конвертации в 59,94 FPS нужен режим HDR10; исходные динамические метаданные Dolby Vision не сохраняются, но видео не переводится в SDR.', kk: 'Dolby Vision анықталды. 59,94 FPS түрлендіру үшін HDR10 режимі қолданылады; Dolby Vision динамикалық метадеректері сақталмайды, бірақ видео SDR-ге айналмайды.', en: 'Dolby Vision detected. 59.94 FPS conversion uses HDR10; Dolby Vision dynamic metadata is not preserved, but video is not converted to SDR.' },
    { test: /hdr_hevc10_encode_failed|hdr_output_verification_failed|hdr_metadata_not_detected|hdr_source_codec_unsupported/i, ru: 'Не удалось безопасно перекодировать HDR в HEVC Main10 с сохранением HDR-сигнала. Файл не выдан.', kk: 'HDR сигналын сақтай отырып HEVC Main10 кодтау мүмкін болмады. Файл шығарылған жоқ.', en: 'HDR could not be safely re-encoded as HEVC Main10 with HDR signaling. No output was produced.' },
    { test: /adjn_worker_ready_timeout/i, ru: 'Патчер не запустился: Web Worker не прислал READY за 15 секунд. Проверьте загрузку adjn-worker.js и связанных скриптов в браузере.', kk: 'Патчер іске қосылмады: Web Worker 15 секунд ішінде READY жібермеді. Браузерде adjn-worker.js жүктелуін тексеріңіз.', en: 'The patcher did not start: its Web Worker did not send READY within 15 seconds. Check adjn-worker.js and its imported scripts in the browser.' },
    { test: /adjn_worker_post_message_failed|adjn_worker_message_error/i, ru: 'Браузер не смог передать подготовленное видео в патчер. Обновите страницу и попробуйте ещё раз; если ошибка повторяется, откройте консоль браузера.', kk: 'Браузер дайын бейнені патчерге жібере алмады. Бетті жаңартып, қайталап көріңіз; қате қайталанса, браузер консолін ашыңыз.', en: 'The browser could not pass the prepared video to the patcher. Refresh and retry; if it repeats, check the browser console.' },
    { test: /ffmpeg_4k_hdr_unsafe/i, ru: 'В метаданных обнаружен HDR-сигнал, но SDR-кодировщик остановлен, чтобы не испортить цвета.', kk: 'HDR сигналы анықталды, бірақ түстер бұзылмауы үшін SDR кодтауы тоқтатылды.', en: 'HDR signaling was detected, so the SDR encoder was stopped to protect colour.' },
    { test: /ffmpeg_4k_10bit_unsupported/i, ru: 'Обнаружен 10-битный профиль кодека, но явные HDR-метаданные не найдены. Этот SDR FFmpeg-режим пока не может безопасно перекодировать 10-bit. Обычные 8-битные SDR-файлы не должны попадать под эту ошибку.', kk: '10-биттік кодек профилі анықталды, бірақ HDR метадеректері табылмады. Бұл SDR FFmpeg режимі әзірге 10-bit бейнені қауіпсіз түрлендіре алмайды. Қалыпты 8-биттік SDR файлдары бұл қатеге түспеуі керек.', en: 'A 10-bit codec profile was detected, but no explicit HDR metadata was found. This SDR FFmpeg mode cannot safely re-encode 10-bit yet. Normal 8-bit SDR files should not trigger this.' },
    { test: /ffmpeg_4k_source_format_unsupported/i, ru: 'Запасной 4K-режим пока поддерживает MP4/MOV с AVC/HEVC SDR. Исходный файл не был выдан в ухудшенном качестве.', kk: 'Қосалқы 4K режимі әзірге SDR AVC/HEVC бар MP4/MOV файлдарын қолдайды. Бейне сапасы нашарлатылып шығарылған жоқ.', en: 'The 4K fallback currently supports SDR AVC/HEVC in MP4/MOV. No downgraded file was produced.' },
    { test: /ffmpeg_4k_asset_download_failed|ffmpeg_4k_fallback_failed|ffmpeg_4k_exec_failed/i, ru: 'FFmpeg не смог завершить конвертацию 4K в 59,94 FPS. Проверьте соединение и попробуйте более короткий файл SDR или HDR.', kk: 'FFmpeg 4K бейнесін 59,94 FPS форматына түрлендіре алмады. Интернетті тексеріп, қысқарақ SDR немесе HDR файлмен қайталаңыз.', en: 'FFmpeg could not finish the 4K 59.94 FPS conversion. Check the connection and try a shorter SDR or HDR file.' },
    { test: /ffmpeg_4k_api_unavailable/i, ru: 'Не удалось загрузить API FFmpeg для 4K. Обновите страницу и попробуйте снова.', kk: '4K үшін FFmpeg API жүктелмеді. Бетті жаңартып, қайталап көріңіз.', en: 'Could not load the FFmpeg 4K API. Refresh the page and try again.' },
    { test: /ffmpeg_4k_resolution_verification_failed|video_resolution_over_4k/i, ru: 'Проверка разрешения 4K не пройдена. Файл не выдан.', kk: '4K ажыратымдылығын тексеру өтпеді. Файл шығарылған жоқ.', en: 'The 4K output resolution check failed. No file was produced.' },
    { test: /V2_BETA_ENGINE_NOT_LOADED/i, ru: 'Не удалось загрузить модуль V2. Обновите страницу и попробуйте ещё раз.', kk: 'V2 модулін жүктеу мүмкін болмады. Бетті жаңартып, қайталап көріңіз.', en: 'Could not load the V2 module. Refresh the page and try again.' },
    { test: /fps_encoder_failed/i, ru: 'Не удалось обработать видео. Попробуйте ещё раз или выберите другой файл.', kk: 'Бейнені өңдеу мүмкін болмады. Қайталап көріңіз немесе басқа файл таңдаңыз.', en: 'Could not process the video. Try again or choose another file.' },
    { test: /mediabunny_load_timeout/i, ru: 'Модуль обработки не загрузился за 25 секунд. Проверьте интернет и обновите страницу.', kk: 'Өңдеу модулі 25 секундта жүктелмеді. Интернетті тексеріп, бетті жаңартыңыз.', en: 'The lightweight processing module did not load within 25 seconds. Check your connection and refresh the page.' },
    { test: /fps_output_verification_failed/i, ru: 'Проверка частоты кадров не пройдена. Повторите обработку файла.', kk: 'Кадр жиілігін тексеру өтпеді. Файлды қайта өңдеңіз.', en: 'The output frame-rate check failed. Process the file again.' },
    { test: /hdr_output_verification_failed/i, ru: 'После обработки не удалось подтвердить сохранение HDR. Файл не выдан.', kk: 'Өңдеуден кейін HDR сақталғанын растау мүмкін болмады. Файл шығарылмады.', en: 'HDR could not be verified after processing. No file was produced.' },
    { test: /hdr_main10_encoder_failed/i, ru: 'Не удалось обработать HDR-видео с сохранением HDR и 10-битного цвета. Попробуйте ещё раз или выберите другой файл.', kk: 'HDR және 10-бит түсін сақтап, бейнені өңдеу мүмкін болмады. Қайталап көріңіз немесе басқа файл таңдаңыз.', en: 'Could not process this HDR video while preserving HDR and 10-bit colour. Try again or choose another file.' },
    { test: /hdr_main10_encoder_unavailable|hdr_main10_encoder_config_unavailable/i, ru: 'Браузер не поддерживает безопасное кодирование HDR Main10. Видео не выдано с потерянным HDR.', kk: 'Браузер HDR Main10 кодтауын қолдамайды. HDR жоғалған бейне шығарылған жоқ.', en: 'This browser cannot encode HDR Main10 safely. A result with lost HDR was not produced.' },
    { test: /hdr_main10_verification_failed|hdr_cfr_verification_failed/i, ru: 'После конвертации не удалось подтвердить сохранение HDR и 10-битного цвета. Файл не выдан.', kk: 'Түрлендіруден кейін HDR және 10-бит түс сақталғаны расталмады. Файл шығарылмады.', en: 'HDR and 10-bit colour could not be verified after conversion. No file was produced.' },
    { test: /hdr_dynamic_metadata_lost/i, ru: 'Не удалось подтвердить сохранение HDR-профиля исходного видео. Файл не выдан, чтобы не ухудшать цвета.', kk: 'Бастапқы бейненің HDR профилі сақталғаны расталмады. Түстерді бұзбау үшін файл шығарылмады.', en: 'The original HDR profile could not be verified after processing. No file was produced to avoid degrading the colours.' },
    { test: /hdr_source_color_unknown/i, ru: 'Не удалось определить цветовой профиль HDR. Конвертация остановлена, чтобы не испортить цвета.', kk: 'HDR түс профилін анықтау мүмкін болмады. Түстерді бұзбау үшін түрлендіру тоқтатылды.', en: 'The HDR colour profile could not be determined. Conversion was stopped to avoid damaging the colours.' },
    { test: /hdr_audio_config_unavailable|hdr_audio_codec_unsupported|hdr_audio_empty/i, ru: 'Не удалось безопасно сохранить звук при HDR-конвертации. Попробуйте MP4/MOV с AAC.', kk: 'HDR түрлендіру кезінде дыбысты сақтау мүмкін болмады. AAC бар MP4/MOV қолданып көріңіз.', en: 'Audio could not be preserved safely during HDR conversion. Try an MP4/MOV with AAC audio.' },
    { test: /fps_encoder_download_failed|fps_encoder_empty_output|fps_encoder_verification_failed|fps_encoder_verification_unavailable/i, ru: 'Не удалось обработать видео. Проверьте соединение и повторите попытку.', kk: 'Бейнені өңдеу мүмкін болмады. Интернетті тексеріп, қайталап көріңіз.', en: 'Could not process the video. Check your connection and try again.' },
    { test: /video_file_over_limit/i, ru: t('errorInvalidFile'), kk: t('errorInvalidFile'), en: t('errorInvalidFile') },
    { test: /video_resolution_over_1080p/i, ru: t('videoResolutionTooHigh'), kk: t('videoResolutionTooHigh'), en: t('videoResolutionTooHigh') },
    { test: /BROWSER_FORMAT_CONVERSION_FAILED/i, ru: t('formatConversionFailed'), kk: t('formatConversionFailed'), en: t('formatConversionFailed') },
    { test: /hdr_video_not_supported/i, ru: 'HDR-видео нельзя безопасно перекодировать в этом браузере. Исходный поток должен быть сохранён без изменения.', kk: 'Бұл браузерде HDR бейнені қауіпсіз қайта кодтау мүмкін емес. Бастапқы ағын өзгеріссіз сақталуы керек.', en: 'This browser cannot safely transcode this HDR video. The original video stream must be preserved.' },
    { test: /engine not loaded|Worker crashed|Script error/i, ru: 'Не удалось загрузить модуль обработки. Обновите страницу и откройте сайт в Chrome или Safari.', kk: 'Өңдеу модулін жүктеу мүмкін болмады. Бетті жаңартып, сайтты Chrome немесе Safari арқылы ашыңыз.', en: 'Could not load the processing module. Refresh the page and open the site in Chrome or Safari.' },
    { test: /video metadata loading timed out/i, ru: 'Не удалось прочитать метаданные видео за 30 секунд. Проверьте файл или выберите другое видео.', kk: 'Бейне метадеректерін 30 секунд ішінде оқу мүмкін болмады. Файлды тексеріңіз немесе басқа бейне таңдаңыз.', en: 'Video metadata could not be read within 30 seconds. Check the file or try another video.' },
    { test: /video_over_60_seconds/i, ru: t('videoTooLong'), kk: t('videoTooLong'), en: t('videoTooLong') },
    { test: /video_duration_unavailable/i, ru: t('videoDurationUnavailable'), kk: t('videoDurationUnavailable'), en: t('videoDurationUnavailable') },
    { test: /HDR|Dolby Vision|HLG|BT\.2020|PQ/i, ru: 'Обнаружены HDR или цветовые метаданные. Патчер должен сохранить исходный видеопоток без перекодирования.', kk: 'HDR немесе түс метадеректері анықталды. Патчер бастапқы бейне ағынын қайта кодтамай сақтауы керек.', en: 'HDR or color metadata was detected. The patcher must preserve the original video stream without re-encoding.' },
    { test: /unsupported_codec|codec/i, ru: 'Кодек видео не поддерживается. Рекомендуется H.264 (AVC) или H.265 (HEVC).', kk: 'Бейне кодегіне қолдау көрсетілмейді. H.264 (AVC) немесе H.265 (HEVC) ұсынылады.', en: 'Video codec is not supported. H.264 (AVC) or H.265 (HEVC) is recommended.' },
    { test: /audio track/i, ru: 'Видео должно содержать звуковую дорожку (AAC).', kk: 'Бейнеде аудио жолы (AAC) болуы керек.', en: 'Video must include an audio track (AAC).' },
    { test: /already_patched/i, ru: 'Это видео уже оптимизировано с помощью Ultra HD патчера.', kk: 'Бұл бейне оңтайландырылған.', en: 'This video has already been optimized.' },
    { test: /File video kosong/i, ru: 'Файл видео пуст или повреждён.', kk: 'Бейне файлы бос немесе зақымдалған.', en: 'Video file is empty or corrupted.' },
    { test: /supported MP4|non-fragmented|fast-start/i, ru: 'Формат контейнера не поддерживается. Экспортируйте видео как стандартный MP4/MOV.', kk: 'Бұл пішім қолдау көрсетпейді. Бейнені стандартты MP4/MOV түрінде экспорттаңыз.', en: 'Container format is not supported. Export video as standard MP4/MOV.' }
  ];
  const match = knownErrors.find((entry) => entry.test.test(message || ''));
  if (match) return match[lang];
  return message || ({ ru: 'Не удалось обработать видео. Попробуйте ещё раз.', kk: 'Бейнені өңдеу мүмкін болмады. Қайталап көріңіз.', en: 'Unable to process the video. Please try again.' })[lang];
}

const savedLanguage = getBrowserValue('ineasy-language') || 'en';
applyLanguage(savedLanguage);

const zernioOAuthParams = new URLSearchParams(window.location.search);
if (window.opener && (zernioOAuthParams.get('connected') === 'tiktok' || zernioOAuthParams.has('error'))) {
  window.opener.postMessage({
    type: 'ineasy-zernio-oauth-return',
    error: zernioOAuthParams.get('error'),
  }, window.location.origin);
  window.close();
}

document.querySelectorAll('[data-lang]').forEach((button) => {
  button.addEventListener('click', () => {
    applyLanguage(button.dataset.lang);
    renderBalance();
  });
});
