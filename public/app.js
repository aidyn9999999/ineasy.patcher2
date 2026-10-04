// --- Auth + layout ---
const tgId = localStorage.getItem('tg_id');
const tgAuthToken = localStorage.getItem('tg_auth_token');

if (!tgId || !tgAuthToken) {
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
    nav: ['PATCHER', 'VIDEO ANALYZER', 'FAQ'],
    faqLabel: 'FAQ / FREQUENTLY ASKED QUESTIONS',
    analyzerEyebrow: 'VIDEO ANALYZER',
    videos: 'videos',
    report: 'Report',
    patchTitle: 'Prepare your video for TikTok.',
    patchSub: 'Patcher changes internal video parameters to help minimize visible quality loss after upload to TikTok.',
    choose: 'Select video',
    chooseSub: 'Drag file here or click to browse',
    localNote: 'Your video stays on your device. 1440p (2K) and 4K videos are automatically prepared in 1080p to reduce processing load.',
    exportNote: 'For smoother playback, export in 1080p, 60 FPS, with a bitrate of 15–35 Mbps.',
    newsText: 'Tutorials, updates, and giveaways',
    newsButton: 'View',
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
    errorInvalidFile: 'Choose a supported video up to 8 GiB.',
    cancel: 'Cancel',
    processingCancelled: 'Processing cancelled.',
    loadingText: 'Preparing MP4 metadata on your device…',
    noBalance: 'No videos remain in your balance. Add videos to continue.',
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
      ['Which export settings should I use?', 'Patcher selects its processing settings automatically. For a clean source, use vertical MP4 at 1080p and 60 FPS with a 15–35 Mbps bitrate. In TikTok, enable Upload HD before publishing.'],
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
    nav: ['ПАТЧЕР', 'АНАЛИЗАТОР', 'FAQ'],
    faqLabel: 'FAQ / ЧАСТЫЕ ВОПРОСЫ',
    analyzerEyebrow: 'АНАЛИЗАТОР ВИДЕО',
    videos: 'видео',
    report: 'Сообщить',
    patchTitle: 'Подготовьте видео к публикации в TikTok.',
    patchSub: 'Patcher корректирует внутренние параметры видео, чтобы уменьшить заметную потерю качества после загрузки в TikTok.',
    choose: 'Выберите видео',
    chooseSub: 'Перетащите файл сюда или нажмите, чтобы открыть устройство',
    localNote: 'Ваше видео остаётся на устройстве. Видео в 1440p (2K) и 4K автоматически подготавливается в 1080p, чтобы снизить нагрузку при обработке.',
    exportNote: 'Для более плавного воспроизведения экспортируйте видео в 1080p, 60 FPS и с битрейтом 15–35 Мбит/с.',
    newsText: 'Туториалы, обновления и розыгрыши',
    newsButton: 'Смотреть',
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
    errorInvalidFile: 'Выберите поддерживаемое видео размером до 8 GiB.',
    cancel: 'Отмена',
    processingCancelled: 'Обработка отменена.',
    loadingText: 'Проверяем MP4 и подготавливаем метаданные на устройстве…',
    noBalance: 'На балансе не осталось обработок. Пополните его, чтобы продолжить.',
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
      ['Какие настройки экспорта выбрать?', 'Параметры обработки INEASY подбирает автоматически. Для исходника подойдёт вертикальный MP4 в 1080p и 60 FPS с битрейтом 15–35 Мбит/с. Перед публикацией в TikTok включите Upload HD.'],
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
    nav: ['ПАТЧЕР', 'БЕЙНЕ АНАЛИЗАТОРЫ', 'FAQ'],
    faqLabel: 'FAQ / ЖИІ ҚОЙЫЛАТЫН СҰРАҚТАР',
    analyzerEyebrow: 'БЕЙНЕ АНАЛИЗАТОРЫ',
    videos: 'бейне',
    report: 'Хабарлау',
    patchTitle: 'Бейнеңізді TikTok-та жариялауға дайындаңыз.',
    patchSub: 'Patcher бейненің ішкі параметрлерін өзгертіп, TikTok-қа жүктегеннен кейін сапаның көзге көрінетіндей төмендеуін азайтуға көмектеседі.',
    choose: 'Бейнені таңдаңыз',
    chooseSub: 'Файлды осы жерге сүйреп апарыңыз немесе құрылғыдан таңдаңыз',
    localNote: 'Бейнеңіз құрылғыңызда қалады. 1440p (2K) және 4K бейнелері өңдеу жүктемесін азайту үшін автоматты түрде 1080p форматына дайындалады.',
    exportNote: 'Бірқалыпты ойнату үшін бейнені 1080p, 60 FPS және 15–35 Мбит/с битрейтпен экспорттаңыз.',
    newsText: 'Туториалдар, жаңартулар және ұтыс ойындары',
    newsButton: 'Көру',
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
    errorInvalidFile: '8 GiB-ке дейін қолдау көрсетілетін бейне таңдаңыз.',
    cancel: 'Бас тарту',
    processingCancelled: 'Өңдеу тоқтатылды.',
    loadingText: 'MP4 метадеректерін құрылғыда дайындаймыз…',
    noBalance: 'Өңдеу лимиті таусылды. Жалғастыру үшін балансты толтырыңыз.',
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
      ['Қандай экспорт параметрлерін таңдау керек?', 'INEASY өңдеу параметрлерін автоматты түрде таңдайды. Бастапқы бейне үшін тік MP4, 1080p, 60 FPS және 15–35 Мбит/с битрейт ұсынылады. TikTok-та жарияламас бұрын Upload HD параметрін қосыңыз.'],
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
  setText('exportNote', pack.exportNote);
  setText('newsText', pack.newsText);
  setText('newsButton', pack.newsButton);
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
    const token = localStorage.getItem('tg_auth_token');
    const res = await fetch(`/api/balance/${encodeURIComponent(tgId)}`, {
      headers: { Authorization: `Bearer ${token || ''}` },
    });
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('tg_id');
      localStorage.removeItem('tg_auth_token');
      window.location.replace('/');
      return;
    }
    if (!res.ok) throw new Error('balance_fetch_failed');
    const data = await res.json();
    currentBalance = data.balance;
    renderBalance();
  } catch (e) {
    if (balanceLabel) balanceLabel.textContent = '—';
  }
}

async function consumeProcessedVideo() {
  const token = localStorage.getItem('tg_auth_token');
  const response = await fetch(`/api/consume/${encodeURIComponent(tgId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token || ''}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (data.error === 'no_balance') throw new Error(t('noBalance'));
    if (response.status === 401) throw new Error(t('authExpired'));
    throw new Error(t('balanceUpdateFailed'));
  }
  currentBalance = data.free + data.purchased;
  renderBalance();
  return data;
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

if (publishTiktokBtn) {
  publishTiktokBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openTikTokComposer();
  });
}
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
          Authorization: `Bearer ${localStorage.getItem('tg_auth_token') || ''}`,
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

      await consumeProcessedVideo();
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
