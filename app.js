// --- Проверяем, что пользователь авторизован ---
const tgId = localStorage.getItem('tg_id');

if (!tgId) {
  window.location.href = '/';
}

document.getElementById('tgIdLabel').textContent = tgId;

document.getElementById('copyIdBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(tgId).then(() => {
    const btn = document.getElementById('copyIdBtn');
    const old = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = old; }, 1200);
  });
});

// --- Баланс видео (хранится на сервере, привязан к Telegram ID) ---
const balanceLabel = document.getElementById('balanceLabel');

async function loadBalance() {
  try {
    const res = await fetch(`/api/balance/${tgId}`);
    const data = await res.json();
    balanceLabel.textContent = `${data.balance} видео`;
  } catch (e) {
    balanceLabel.textContent = '—';
  }
}
loadBalance();

// --- Пакеты покупки ---
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
  pkgList.innerHTML = '';
  PACKAGES.forEach(pkg => {
    const li = document.createElement('li');
    li.className = 'pkg-row';
    const link = `https://t.me/${BOT_USERNAME}?start=buy_${pkg.count}_${pkg.price}`;
    li.innerHTML = `
      <span class="pkg-text">${pkg.count} видео × ${(pkg.price / pkg.count).toFixed(0).replace(/\.0$/, '')} ₸ = <b>${pkg.price.toLocaleString('ru-RU')} ₸</b></span>
      <a class="pkg-buy" href="${link}" target="_blank" rel="noopener">Купить</a>
    `;
    pkgList.appendChild(li);
  });
}
renderPackages();

function openModal() {
  modalOverlay.classList.remove('hidden');
  loadBalance();
}
function closeModal() {
  modalOverlay.classList.add('hidden');
}

plusBtn.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// --- Дропзона: всё полностью локально, ничего никуда не отправляется ---
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

function handleFile(file) {
  if (!file || !file.type.startsWith('video/')) return;

  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(file); // локальный blob, файл никуда не уходит

  previewVideo.src = currentObjectUrl;
  fileMeta.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} МБ`;
  previewWrap.classList.add('show');
  processBtn.disabled = false;
  processedResult.classList.add('hidden');

  // TODO: здесь позже подключим саму логику обработки видео
}

dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

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
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

clearBtn.addEventListener('click', () => {
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  previewVideo.src = '';
  previewWrap.classList.remove('show');
  fileInput.value = '';
  processBtn.disabled = true;
  processedResult.classList.add('hidden');
});

// --- Реальная проверка качества через серверный yt-dlp/ffprobe ---
const checkerOpenBtn = document.getElementById('checkerOpenBtn');
const checkerForm = document.getElementById('checkerForm');
const checkerUrl = document.getElementById('checkerUrl');
const checkerStatus = document.getElementById('checkerStatus');
const checkerResult = document.getElementById('checkerResult');

checkerOpenBtn.addEventListener('click', () => {
  checkerForm.classList.toggle('hidden');
  if (!checkerForm.classList.contains('hidden')) checkerUrl.focus();
});

checkerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  checkerResult.classList.add('hidden');
  checkerStatus.className = 'checker-status loading';
  checkerStatus.textContent = 'Анализируем ваше видео…';

  try {
    const response = await fetch('/api/check-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: checkerUrl.value.trim() }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'check_failed');

    checkerStatus.textContent = 'Проверка завершена';
    checkerStatus.className = 'checker-status success';
    checkerResult.innerHTML = `
      <div class="result-heading"><span>✓</span><div><small>Результат проверки</small><strong>Видео готово к публикации</strong></div></div>
      <div class="result-grid">
        <div><small>Качество</small><strong>${data.quality}p</strong><span>${data.width} × ${data.height}</span></div>
        <div><small>Частота кадров</small><strong>${data.fps} FPS</strong><span>Плавность движения</span></div>
        <div><small>Кодек</small><strong>${data.codec}</strong><span>Тип сжатия</span></div>
        <div><small>Битрейт</small><strong>${data.bitrate}</strong><span>${data.size} · ${data.duration}</span></div>
      </div>`;
    checkerResult.classList.remove('hidden');
  } catch (error) {
    checkerStatus.textContent = 'Не удалось проверить ссылку. Убедитесь, что видео открыто публично.';
    checkerStatus.className = 'checker-status error';
  }
});

// --- Вкладки и обработка без списания баланса ---
document.querySelectorAll('.nav-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach((section) => section.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.view).classList.remove('hidden');
  });
});

async function renderVideoLocally(file, updateProgress) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('browser_processing_unsupported');
  }

  const source = document.createElement('video');
  const sourceUrl = URL.createObjectURL(file);
  source.src = sourceUrl;
  source.playsInline = true;
  source.muted = false;
  await new Promise((resolve, reject) => {
    source.onloadedmetadata = resolve;
    source.onerror = reject;
  });

  const maxWidth = 1080;
  const scale = Math.min(1, maxWidth / source.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(source.videoWidth * scale));
  canvas.height = Math.max(2, Math.round(source.videoHeight * scale));
  const context = canvas.getContext('2d', { alpha: false });
  const outputStream = canvas.captureStream(30);
  const sourceStream = source.captureStream ? source.captureStream() : null;
  if (sourceStream) sourceStream.getAudioTracks().forEach((track) => outputStream.addTrack(track));

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : 'video/webm';
  const recorder = new MediaRecorder(outputStream, { mimeType, videoBitsPerSecond: 8000000 });
  const chunks = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const finished = new Promise((resolve) => { recorder.onstop = resolve; });
  const drawFrame = () => {
    if (source.ended) return;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    updateProgress(source.duration ? source.currentTime / source.duration : 0);
    requestAnimationFrame(drawFrame);
  };

  recorder.start(250);
  await source.play();
  drawFrame();
  await new Promise((resolve) => { source.onended = resolve; });
  recorder.stop();
  await finished;
  outputStream.getTracks().forEach((track) => track.stop());
  URL.revokeObjectURL(sourceUrl);
  return new Blob(chunks, { type: mimeType });
}

processBtn.addEventListener('click', async () => {
  if (!fileInput.files[0]) return;
  processBtn.disabled = true;
  processingState.classList.remove('hidden');
  processedResult.classList.add('hidden');
  processingProgress.style.width = '1%';
  try {
    const outputBlob = await renderVideoLocally(fileInput.files[0], (progress) => {
      processingProgress.style.width = `${Math.max(1, Math.round(progress * 100))}%`;
    });
    processingProgress.style.width = '100%';
    processingText.textContent = 'Готово. Файл обработан только на вашем устройстве.';
    downloadBtn.href = URL.createObjectURL(outputBlob);
    downloadBtn.download = `${fileInput.files[0].name.replace(/\.[^.]+$/, '')}-ineasy.webm`;
    processedResult.classList.remove('hidden');
  } catch (error) {
    processingText.textContent = error.message === 'browser_processing_unsupported'
      ? 'Этот браузер не поддерживает локальную обработку видео.'
      : 'Не удалось обработать файл. Попробуйте другой формат видео.';
    processingProgress.style.width = '0%';
    processBtn.disabled = false;
  }
});

const languagePacks = {
  ru: {
    tabs: ['Патчер', 'Чекер', 'FAQ'], title: 'Патчер автоматически определяет необходимые параметры.', subtitle: 'Загрузите ролик. Мы подберём оптимальные параметры без ручной настройки FPS, разрешения и битрейта.', choose: 'Выберите видео', chooseSub: 'Перетащите файл сюда или нажмите, чтобы открыть устройство', note: 'Видео остаётся в вашем рабочем процессе. Настройки обработки определяются автоматически.', process: 'Обработать видео', processing: 'Подготавливаем видео…', processingSub: 'Автоматически применяем параметры', ready: 'Видео готово', readySub: 'Можно скачать обработанный файл', download: 'Скачать видео', checkerTitle: 'Проверить качество видео', checkerText: 'Вставьте публичную ссылку TikTok. Сервер проанализирует оригинальный ролик и покажет реальные параметры.', checkerButton: 'Проверить видео', label: 'Ссылка на видео', placeholder: 'Вставьте ссылку на TikTok', analyse: 'Анализировать', faqTitle: 'Всё важное, без лишнего', faq: [['Нужно ли устанавливать программу?', 'Нет. INEASY работает прямо в браузере.'], ['Какие видео можно обрабатывать?', 'Вертикальные видео для TikTok и коротких форматов.'], ['Что происходит после обработки?', 'Вы увидите результат и сможете скачать готовый файл.'], ['Можно ли изменить видео после патчинга?', 'Нет. После обработки внутренние параметры уже изменены.'], ['Патчер сжимает видео?', 'Мы максимально сохраняем исходное качество, но финальное сжатие выполняет сам TikTok.'], ['Нужно ли выбирать FPS, битрейт или разрешение?', 'Нет. INEASY автоматически определяет совместимые параметры.'], ['Куда сообщить о баге?', 'Напишите администратору @ineasyadmin.']], notice: 'Если после патчинга длительность видео показывает 0:00, это нормально. Файл специально подготовлен так, чтобы TikTok меньше сжимал его.', support: 'Заметили ошибку на сайте? Сообщите сразу', footer: 'Сохраняйте качество. Публикуйте уверенно.', footerSupport: 'Поддержка: @ineasyadmin', faqSupport: 'Заметили баг или ошибку? Сообщите быстро',
  },
  kk: {
    tabs: ['Патчер', 'Чекер', 'FAQ'], title: 'Патчер қажетті параметрлерді өзі анықтайды.', subtitle: 'Бейнені жүктеңіз. FPS, ажыратымдылық және битрейтті қолмен таңдаудың қажеті жоқ.', choose: 'Бейне таңдау', chooseSub: 'Файлды осы жерге сүйреңіз немесе құрылғыдан таңдаңыз', note: 'Параметрлер автоматты түрде анықталады.', process: 'Бейнені өңдеу', processing: 'Бейне дайындалуда…', processingSub: 'Параметрлер автоматты түрде қолданылуда', ready: 'Бейне дайын', readySub: 'Дайын файлды жүктей аласыз', download: 'Бейнені жүктеу', checkerTitle: 'Бейне сапасын тексеру', checkerText: 'TikTok-тағы ашық сілтемені енгізіңіз. Сервер нақты параметрлерді көрсетеді.', checkerButton: 'Бейнені тексеру', label: 'Бейне сілтемесі', placeholder: 'TikTok сілтемесін енгізіңіз', analyse: 'Талдау', faqTitle: 'Маңызды сұрақтар', faq: [['Бағдарлама орнату керек пе?', 'Жоқ. INEASY браузерде жұмыс істейді.'], ['Қандай бейнелерді өңдеуге болады?', 'TikTok және қысқа форматтарға арналған тік бейнелер.'], ['Өңдеуден кейін не болады?', 'Нәтижені көріп, дайын файлды жүктей аласыз.'], ['Патчингтен кейін бейнені өзгертуге бола ма?', 'Жоқ. Өңдеуден кейін ішкі параметрлер өзгертіледі.'], ['Патчер бейнені қыса ма?', 'Бастапқы сапаны барынша сақтаймыз, бірақ соңғы қысуды TikTok жасайды.'], ['FPS пен ажыратымдылықты таңдау керек пе?', 'Жоқ. INEASY үйлесімді параметрлерді өзі анықтайды.'], ['Қате туралы қайда хабарлаймын?', '@ineasyadmin әкімшісіне жазыңыз.']], notice: 'Патчингтен кейін ұзақтық 0:00 болып көрінсе, бұл қалыпты. Файл TikTok аз қысатындай дайындалды.', support: 'Сайттан қате байқадыңыз ба? Бірден хабарлаңыз', footer: 'Сапаны сақтаңыз. Сенімді жариялаңыз.', footerSupport: 'Қолдау: @ineasyadmin', faqSupport: 'Қате байқадыңыз ба? Тез хабарлаңыз',
  },
  en: {
    tabs: ['Patcher', 'Checker', 'FAQ'], title: 'The patcher automatically detects the right parameters.', subtitle: 'Upload a clip. We choose compatible FPS, resolution and bitrate automatically.', choose: 'Choose video', chooseSub: 'Drop a file here or choose one from your device', note: 'Parameters are detected automatically.', process: 'Process video', processing: 'Preparing your video…', processingSub: 'Applying automatic parameters', ready: 'Video ready', readySub: 'Your processed file is ready to download', download: 'Download video', checkerTitle: 'Check video quality', checkerText: 'Paste a public TikTok link. The server will return the real video parameters.', checkerButton: 'Check video', label: 'Video link', placeholder: 'Paste a TikTok link', analyse: 'Analyze', faqTitle: 'Everything important, kept short', faq: [['Do I need to install a program?', 'No. INEASY works directly in your browser.'], ['Which videos can I process?', 'Vertical videos for TikTok and short-form platforms.'], ['What happens after processing?', 'You can review the result and download the finished file.'], ['Can I edit the video after patching?', 'No. The internal parameters have already been changed.'], ['Does the patcher compress video?', 'We preserve the source quality as much as possible; TikTok controls final compression.'], ['Do I need to choose FPS or resolution?', 'No. INEASY detects compatible parameters automatically.'], ['Where do I report a bug?', 'Message the administrator @ineasyadmin.']], notice: 'If the duration shows 0:00 after patching, that is expected. The file was prepared to reduce TikTok compression.', support: 'Found a website issue? Report it now', footer: 'Keep the quality. Publish with confidence.', footerSupport: 'Support: @ineasyadmin', faqSupport: 'Found a bug? Report it quickly',
  },
};

function applyLanguage(lang) {
  const pack = languagePacks[lang] || languagePacks.ru;
  document.querySelectorAll('.nav-tab > span:last-child').forEach((item, index) => { item.textContent = pack.tabs[index]; });
  document.querySelector('.patch-title').textContent = pack.title;
  document.querySelector('.patch-sub').textContent = pack.subtitle;
  document.querySelector('.dz-title').textContent = pack.choose;
  document.querySelector('.dz-sub').textContent = pack.chooseSub;
  document.querySelector('.local-note').textContent = pack.note;
  processBtn.textContent = pack.process;
  document.querySelector('.processing-state strong').textContent = pack.processing;
  processingText.textContent = pack.processingSub;
  document.querySelector('.processed-result strong').textContent = pack.ready;
  document.querySelector('.processed-result small').textContent = pack.readySub;
  downloadBtn.textContent = pack.download;
  document.querySelector('.notice-banner p').textContent = pack.notice;
  document.getElementById('checkerTitle').textContent = pack.checkerTitle;
  document.querySelector('.checker-copy p:not(.eyebrow)').textContent = pack.checkerText;
  checkerOpenBtn.textContent = pack.checkerButton;
  document.querySelector('.checker-form label').textContent = pack.label;
  checkerUrl.placeholder = pack.placeholder;
  document.querySelector('.checker-input-row button').textContent = pack.analyse;
  document.getElementById('faqTitle').textContent = pack.faqTitle;
  document.querySelectorAll('.faq-section details').forEach((item, index) => {
    if (!pack.faq[index]) return;
    item.querySelector('summary').textContent = pack.faq[index][0];
    item.querySelector('p').textContent = pack.faq[index][1];
  });
  document.querySelector('.checker-support').firstChild.textContent = `${pack.support.split('?')[0]}? `;
  document.querySelector('.faq-support').firstChild.textContent = `${pack.faqSupport.split('?')[0]}? `;
  document.querySelector('.site-footer span').textContent = pack.footer;
  document.querySelector('.footer-telegram').textContent = pack.footerSupport;
}

const savedLanguage = localStorage.getItem('ineasy-language') || 'ru';
document.querySelectorAll('[data-lang]').forEach((button) => {
  button.classList.toggle('active', button.dataset.lang === savedLanguage);
  button.addEventListener('click', () => {
    localStorage.setItem('ineasy-language', button.dataset.lang);
    document.querySelectorAll('[data-lang]').forEach((item) => item.classList.toggle('active', item === button));
    applyLanguage(button.dataset.lang);
  });
});
applyLanguage(savedLanguage);
