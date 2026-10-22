// INEASY interface layer.
// Presentation helpers (pointer light, keyboard access, accent word, translated UI copy) plus the small
// "after publishing" choice (keep / delete the just-published video from the local archive).
// It makes no network requests and does not touch processing, balance, auth or publishing logic in app.js.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  // ================= Translated copy for static UI blocks (app.js only knows the older strings) =================
  const COPY = {
    ru: {
      fpsTipTitle: 'Столкнулись с ошибкой 30 FPS?',
      fpsTipBody: 'Если вы столкнулись с ошибкой 30 FPS, после обработки попробуйте <b>опубликовать через сайт</b> или используйте формат <b>HEVC (H.265)</b> — это может решить проблему.',
      fpsTipTagSite: 'Через сайт',
      psTitle: 'Видео опубликовано!',
      psBody: 'Удалить только что обработанное видео автоматически? Вы уже опубликовали его, поэтому копия больше не нужна.',
      psKeep: 'Нет, оставить',
      psDelete: 'Да, удалить',
      psDeleted: 'Видео удалено — в архив оно не попадёт.',
      afTitle: 'Архив заполнен',
      afBody: 'У вас заполнен архив видео (2 из 2). Удалите ненужное видео — иначе новое видео потеряется.',
      pqHeading: "Обработайте видео без сжатия, с сохранением качества и без перекодирования.",
      dlTitle: "Ваш бесплатный дневной лимит",
      smKicker: "РАЗМЕР ВИДЕО",
      smMax: "Максимум 150 МБ",
      dwTitle: "Видео сохранено как черновик",
      dwBody: "Черновики могут не храниться постоянно. Проверяйте TikTok и удаляйте ненужные черновики вручную, чтобы освободить место.",
      dwOk: "Понятно",
      uhdTitle: "Вы выбрали видео в <span class=\"hl-4k\">4K</span>",
      uhdBody: "Чтобы избежать возможного сжатия и нежелательного изменения частоты кадров, рекомендуем загрузить оригинал через «Выбрать файл». Это поможет сохранить исходные параметры видео, если устройство и формат файла поддерживаются.",
      uhdConfirm: "Да, я выбрал через файл",
      uhdPick: "Нет, выбрать файл",
      guideLink: "Как правильно выбрать видео?",
      guideTitle: "Как правильно выбрать видео?",
      guideCaption: "Пример правильного выбора видео через файлы",
      guideMain: "Чтобы видео не сжималось и не превращалось в 30 FPS после публикации в TikTok, рекомендуем выбирать оригинальный видеофайл напрямую через кнопку «Выбрать файл», а не через медиатеку или фотогалерею.",
      guideExtra: "На телефоне видео можно найти через приложение «Файлы» или файловый менеджер. Если видео находится в галерее, сначала сохраните или экспортируйте оригинал в приложение «Файлы», а затем выберите его оттуда.",
      guideExpand: "Развернуть видео",
      guideStepsBtn: "Как сохранить видео в файлы?",
      guideStep1: "Откройте видео в приложении «Фото» и нажмите «Поделиться».",
      guideStep2: "Выберите «Экспортировать оригинал без изменений» или «Сохранить в Файлах».",
      guideStep3: "Выберите папку в приложении «Файлы» и нажмите «Сохранить».",
      guideStep4: "На сайте нажмите «Выбрать файл» и выберите сохранённое видео. На Android это «Файлы» или «Мои файлы».",
      guideClose: "Закрыть",
      guideZoomClose: "Закрыть",
      afDone: "Удалить выбранные и продолжить",
      afLater: "Позже",
    },
    kk: {
      fpsTipTitle: '30 FPS қатесіне тап болдыңыз ба?',
      fpsTipBody: 'Егер 30 FPS қатесіне тап болсаңыз, өңдеуден кейін бейнені <b>сайт арқылы жариялап</b> көріңіз немесе <b>HEVC (H.265)</b> форматын пайдаланыңыз — бұл мәселені шешуі мүмкін.',
      fpsTipTagSite: 'Сайт арқылы',
      psTitle: 'Бейне жарияланды!',
      psBody: 'Жаңа өңделген бейнені автоматты түрде жою керек пе? Сіз оны жарияладыңыз, сондықтан көшірме енді қажет емес.',
      psKeep: 'Жоқ, қалдыру',
      psDelete: 'Иә, жою',
      psDeleted: 'Бейне жойылды — архивке түспейді.',
      afTitle: 'Архив толы',
      afBody: 'Бейне архиві толы (2 / 2). Қажетсіз бейнені жойыңыз — әйтпесе жаңа бейне жоғалады.',
      pqHeading: "Бейнені сығымдамай, сапасын сақтап және қайта кодтамай өңдеңіз.",
      dlTitle: "Күнделікті тегін лимитіңіз",
      smKicker: "БЕЙНЕ ӨЛШЕМІ",
      smMax: "Ең көбі 150 МБ",
      dwTitle: "Бейне черновик ретінде сақталды",
      dwBody: "Черновиктер әрдайым сақталмауы мүмкін. TikTok-ты тексеріп, орын босату үшін қажетсіз черновиктерді қолмен жойыңыз.",
      dwOk: "Түсінікті",
      uhdTitle: "Вы выбрали видео в <span class=\"hl-4k\">4K</span>",
      uhdBody: "Чтобы избежать возможного сжатия и нежелательного изменения частоты кадров, рекомендуем загрузить оригинал через «Выбрать файл». Это поможет сохранить исходные параметры видео, если устройство и формат файла поддерживаются.",
      uhdConfirm: "Да, я выбрал через файл",
      uhdPick: "Нет, выбрать файл",
      guideLink: "Как правильно выбрать видео?",
      guideTitle: "Как правильно выбрать видео?",
      guideCaption: "Пример правильного выбора видео через файлы",
      guideMain: "Чтобы видео не сжималось и не превращалось в 30 FPS после публикации в TikTok, рекомендуем выбирать оригинальный видеофайл напрямую через кнопку «Выбрать файл», а не через медиатеку или фотогалерею.",
      guideExtra: "На телефоне видео можно найти через приложение «Файлы» или файловый менеджер. Если видео находится в галерее, сначала сохраните или экспортируйте оригинал в приложение «Файлы», а затем выберите его оттуда.",
      guideExpand: "Развернуть видео",
      guideStepsBtn: "Как сохранить видео в файлы?",
      guideStep1: "Откройте видео в приложении «Фото» и нажмите «Поделиться».",
      guideStep2: "Выберите «Экспортировать оригинал без изменений» или «Сохранить в Файлах».",
      guideStep3: "Выберите папку в приложении «Файлы» и нажмите «Сохранить».",
      guideStep4: "На сайте нажмите «Выбрать файл» и выберите сохранённое видео. На Android это «Файлы» или «Мои файлы».",
      guideClose: "Закрыть",
      guideZoomClose: "Закрыть",
      afDone: "Таңдалғанды жойып, жалғастыру",
      afLater: "Кейінірек",
    },
    en: {
      fpsTipTitle: 'Hit the 30 FPS error?',
      fpsTipBody: 'If you run into the 30 FPS error, after processing try to <b>publish through the site</b> or use the <b>HEVC (H.265)</b> format — it may fix the problem.',
      fpsTipTagSite: 'Via the site',
      psTitle: 'Video published!',
      psBody: 'Delete the video you just processed automatically? You already published it, so the copy is no longer needed.',
      psKeep: 'No, keep it',
      psDelete: 'Yes, delete',
      psDeleted: 'Video deleted — it will not be saved to the archive.',
      afTitle: 'Archive is full',
      afBody: 'Your video archive is full (2 of 2). Delete a video you no longer need — otherwise the new video will be lost.',
      pqHeading: "Process your video without compression, keeping its quality and without re-encoding.",
      dlTitle: "Your free daily limit",
      smKicker: "VIDEO SIZE",
      smMax: "Up to 150 MB",
      dwTitle: "Video saved as a draft",
      dwBody: "Drafts may not be kept forever. Check TikTok and delete drafts you no longer need to free up space.",
      dwOk: "Got it",
      uhdTitle: "You selected a <span class=\"hl-4k\">4K</span> video",
      uhdBody: "To avoid possible compression and an unwanted change of frame rate, we recommend uploading the original through \"Choose file\". This helps keep the original video parameters if your device and file format support it.",
      uhdConfirm: "Yes, I chose it as a file",
      uhdPick: "No, choose a file",
      guideLink: "How to choose the video correctly?",
      guideTitle: "How to choose the video correctly?",
      guideCaption: "Example of choosing a video through Files",
      guideMain: "So the video is not compressed or turned into 30 FPS after publishing to TikTok, we recommend choosing the original video file directly with the \"Choose file\" button, not through the media library or photo gallery.",
      guideExtra: "On a phone you can find the video in the Files app or a file manager. If the video is in the gallery, first save or export the original to the Files app, then choose it from there.",
      guideExpand: "Enlarge video",
      guideStepsBtn: "How to save the video to Files?",
      guideStep1: "Open the video in the Photos app and tap Share.",
      guideStep2: "Choose \"Export Unmodified Original\" or \"Save to Files\".",
      guideStep3: "Pick a folder in the Files app and tap Save.",
      guideStep4: "On the site tap \"Choose file\" and select the saved video. On Android this is \"Files\" or \"My Files\".",
      guideClose: "Close",
      guideZoomClose: "Close",
      afDone: "Delete selected and continue",
      afLater: "Later",
    },
  };
  const lang = () => (COPY[document.documentElement.lang] ? document.documentElement.lang : 'ru');
  function renderCopy() {
    const pack = COPY[lang()];
    document.querySelectorAll('[data-i18n]').forEach((node) => { if (pack[node.dataset.i18n]) node.textContent = pack[node.dataset.i18n]; });
    // trusted, hard-coded strings above (no user data) — allows <b> emphasis
    document.querySelectorAll('[data-i18n-html]').forEach((node) => { if (pack[node.dataset.i18nHtml]) node.innerHTML = pack[node.dataset.i18nHtml]; });
  }
  new MutationObserver(renderCopy).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  renderCopy();

  // ================= Accent: highlight the product name inside big headlines =================
  // app.js rewrites these titles on every language change, so watch them and re-apply.
  function accentWord(el) {
    if (!el || el.querySelector('.accent')) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = node.nodeValue.search(/tiktok/i);
      if (at < 0) continue;
      const span = document.createElement('span');
      span.className = 'accent';
      span.textContent = node.nodeValue.slice(at, at + 6);
      const after = node.splitText(at);
      after.nodeValue = after.nodeValue.slice(6);
      node.parentNode.insertBefore(span, after);
      return;
    }
  }
  [['homeTitle', '.home-headline'], ['patchTitle', null]].forEach(([id, sel]) => {
    const host = $(id);
    if (!host) return;
    const apply = () => accentWord(sel ? host.querySelector(sel) : host);
    apply();
    new MutationObserver(apply).observe(host, { childList: true, characterData: true, subtree: true });
  });

  // ================= Surface light: a soft spotlight follows the pointer (fine pointers only) =================
  if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const SURFACES = '.panel, .card, .ia-panel, .daily-limit-card, .video-size-meter, .news-callout, .home-local-note, .support-block, .home-hero';
    document.addEventListener('pointermove', (event) => {
      const surface = event.target.closest && event.target.closest(SURFACES);
      if (!surface) return;
      const box = surface.getBoundingClientRect();
      surface.style.setProperty('--mx', `${event.clientX - box.left}px`);
      surface.style.setProperty('--my', `${event.clientY - box.top}px`);
    }, { passive: true });
  }

  // ================= Dropzone: keyboard access (the click handler lives in app.js) =================
  const dropzone = $('dropzone');
  if (dropzone) {
    dropzone.setAttribute('role', 'button');
    dropzone.tabIndex = 0;
    dropzone.addEventListener('keydown', (event) => {
      if (event.target === dropzone && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        dropzone.click();
      }
    });
  }

  // ================= Navigation =================
  document.querySelectorAll('.nav-tab').forEach((tab) => tab.addEventListener('click', () => window.scrollTo(0, 0)));
  const openTab = (viewId) => document.querySelector(`.nav-tab[data-view="${viewId}"]`)?.click();
  $('footerHome')?.addEventListener('click', (event) => { event.preventDefault(); openTab('homeSection'); });
  $('footerFaq')?.addEventListener('click', (event) => { event.preventDefault(); openTab('faqSection'); });

  // ================= After publishing: keep or delete the just-published video =================
  // app.js announces the video it is about to publish (processed result or an archive item) through window events;
  // we only listen. Deleting reuses the archive panel's own "Удалить" button, so the archive code does the real work.
  let current = null;
  const remember = (event) => {
    const d = event.detail || {};
    if (d.blob instanceof Blob) current = { blob: d.blob, name: String(d.name || '') };
  };
  window.addEventListener('ineasy:processed-video', remember);
  window.addEventListener('ineasy:use-archive-video', remember);

  const formatSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
  const archiveRow = () => {
    if (!current) return null;
    const size = formatSize(current.blob.size);
    return [...document.querySelectorAll('#ineasyArchiveItems .ia-row')].find((row) =>
      row.querySelector('.ia-name')?.textContent === current.name && (row.querySelector('.ia-meta')?.textContent || '').startsWith(size)) || null;
  };
  const archiveFullOpen = () => { const o = $('archiveFullOverlay'); return !!o && !o.classList.contains('hidden'); };

  const overlay = $('postSuccessOverlay');
  const status = $('postSuccessStatus');
  const resetStatus = () => { if (status) status.textContent = ''; };
  new MutationObserver(() => { if (overlay && !overlay.classList.contains('hidden')) resetStatus(); }).observe(overlay || document.body, { attributes: true, attributeFilter: ['class'] });

  $('postSuccessDelete')?.addEventListener('click', () => {
    const button = $('postSuccessDelete');
    button.disabled = true;
    const row = archiveRow();
    if (row) row.querySelector('.ia-btn-danger')?.click();           // saved copy → removed by the archive itself
    else if (archiveFullOpen()) $('archiveFullCancel')?.click();     // not saved yet (archive was full) → drop the pending save
    if (status) status.textContent = COPY[lang()].psDeleted;
    current = null;
    setTimeout(() => { overlay?.classList.add('hidden'); button.disabled = false; resetStatus(); }, 1100);
  });

  $('postSuccessKeep')?.addEventListener('click', () => {
    // If the video never reached the archive (it was full at processing time), ask the archive to save it now:
    // it either stores it or shows the "archive is full" prompt, so the user decides what to remove.
    if (current && !archiveRow() && !archiveFullOpen()) {
      window.dispatchEvent(new CustomEvent('ineasy:processed-video', { detail: { blob: current.blob, name: current.name } }));
    }
  });

  // ================= File-selection guide (opened from the 4K confirmation) =================
  // Pure presentation: opens the guide, expands/closes the video and toggles the short steps. No autoplay.
  (() => {
    const guide = $('fileGuideOverlay'), zoom = $('fileGuideZoomOverlay');
    const video = $('fileGuideVideo'), big = $('fileGuideZoomVideo');
    const steps = $('fileGuideSteps'), stepsBtn = $('fileGuideStepsBtn');
    if (!guide || !zoom || !video || !big || !steps || !stepsBtn) return;
    const closeGuide = () => { video.pause(); guide.classList.add('hidden'); };
    const closeZoom = () => { big.pause(); zoom.classList.add('hidden'); };
    $('fileGuideOpenBtn')?.addEventListener('click', () => guide.classList.remove('hidden'));
    $('fileGuideCloseBtn')?.addEventListener('click', closeGuide);
    guide.addEventListener('click', (event) => { if (event.target === guide) closeGuide(); });
    stepsBtn.addEventListener('click', () => {
      stepsBtn.setAttribute('aria-expanded', String(!steps.classList.toggle('hidden')));
    });
    $('fileGuideExpandBtn')?.addEventListener('click', () => {
      const resumeAt = video.currentTime;
      video.pause();
      if (!big.querySelector('source')) {
        const source = document.createElement('source');
        source.src = video.querySelector('source')?.src || video.currentSrc;
        source.type = 'video/mp4';
        big.appendChild(source);
        big.load();
      }
      if (resumeAt > 0) {
        const seek = () => { big.currentTime = resumeAt; };
        if (big.readyState >= 1) seek(); else big.addEventListener('loadedmetadata', seek, { once: true });
      }
      zoom.classList.remove('hidden');
    });
    $('fileGuideZoomClose')?.addEventListener('click', closeZoom);
    zoom.addEventListener('click', (event) => { if (event.target === zoom) closeZoom(); });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!zoom.classList.contains('hidden')) closeZoom();
      else if (!guide.classList.contains('hidden')) closeGuide();
    });
  })();
})();
