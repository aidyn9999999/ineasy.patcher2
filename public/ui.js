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
      uhdTitle: "Ваше видео <span class=\"hl-4k\">4K</span>",
      uhdBody: "Можете получить <span class=\"hl-fps\">30 FPS</span> после публикации — это риск. Советуем лучше выбрать видео <strong>1080p 60 FPS</strong>.",
      uhdReplace: "Заменить на другое",
      uhdKeep: "Оставить 4K — я рискую",
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
      uhdTitle: "Сіздің бейнеңіз <span class=\"hl-4k\">4K</span>",
      uhdBody: "Жарияланғаннан кейін <span class=\"hl-fps\">30 FPS</span> алуыңыз мүмкін — бұл тәуекел. Мұнан да <strong>1080p 60 FPS</strong> бейнесін таңдаған жөн.",
      uhdReplace: "Басқасымен ауыстыру",
      uhdKeep: "4K қалдыру — тәуекелге барамын",
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
      uhdTitle: "Your video is <span class=\"hl-4k\">4K</span>",
      uhdBody: "You may get <span class=\"hl-fps\">30 FPS</span> after publishing — that is a risk. We recommend choosing a <strong>1080p 60 FPS</strong> video instead.",
      uhdReplace: "Replace with another",
      uhdKeep: "Keep 4K — I accept the risk",
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
})();
