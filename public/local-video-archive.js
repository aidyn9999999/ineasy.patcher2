/* INEASY local processed-video archive.
 * Stores at most two processed videos in this browser's IndexedDB; no video bytes are uploaded.
 * Local to this browser/profile and device, not synced to the user's account.
 */
(() => {
  'use strict';
  const DB_NAME = 'ineasy-processed-archive';
  const STORE = 'videos';
  const LIMIT = 2;
  let dbPromise;
  const objectUrls = new Set();

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB is unavailable'));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local archive'));
    });
    return dbPromise;
  }
  async function allRecords() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result || []).sort((a, b) => b.createdAt - a.createdAt));
      request.onerror = () => reject(request.error);
    });
  }
  async function putRecord(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Archive save was aborted'));
    });
  }
  async function deleteRecord(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  function makeId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function formatSize(bytes) {
    return bytes >= 1024 * 1024 ? (bytes / (1024 * 1024)).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }
  function ensurePanel() {
    let panel = document.getElementById('ineasyLocalArchive');
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = 'ineasyLocalArchive';
    panel.style.cssText = 'max-width:980px;margin:28px auto;padding:20px;border:1px solid var(--border-color,#333);border-radius:18px;background:var(--card-bg,rgba(127,127,127,.06));color:inherit';
    panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0 0 6px">Архив обработанных видео</h2><p style="margin:0;opacity:.75">До 2 видео · хранится только в этом браузере, без загрузки видео на сервер</p></div><span id="ineasyArchiveCount">0 / 2</span></div><div id="ineasyArchiveItems" style="display:grid;gap:10px;margin-top:16px"></div><p id="ineasyArchiveStatus" role="status" style="margin:12px 0 0;opacity:.8"></p>';
    const footer = document.querySelector('.site-footer');
    if (footer?.parentNode) footer.parentNode.insertBefore(panel, footer);
    else document.body.appendChild(panel);
    return panel;
  }
  function button(label, action) {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = label;
    el.style.cssText = 'padding:9px 13px;border:1px solid currentColor;border-radius:10px;background:transparent;color:inherit;cursor:pointer';
    el.addEventListener('click', action);
    return el;
  }
  async function render() {
    const panel = ensurePanel();
    const list = panel.querySelector('#ineasyArchiveItems');
    const count = panel.querySelector('#ineasyArchiveCount');
    const status = panel.querySelector('#ineasyArchiveStatus');
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls.clear();
    list.replaceChildren();
    try {
      const records = await allRecords();
      count.textContent = records.length + ' / ' + LIMIT;
      if (!records.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Пока нет сохранённых видео. После обработки они появятся здесь.';
        empty.style.opacity = '.7';
        list.appendChild(empty);
      }
      for (const record of records) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px;border:1px solid rgba(127,127,127,.25);border-radius:12px';
        const info = document.createElement('div');
        info.style.cssText = 'min-width:0;flex:1';
        const name = document.createElement('strong');
        name.textContent = record.name;
        name.style.cssText = 'display:block;overflow-wrap:anywhere';
        const meta = document.createElement('small');
        meta.textContent = formatSize(record.blob.size) + ' · ' + new Date(record.createdAt).toLocaleString();
        meta.style.opacity = '.7';
        info.append(name, meta);
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
        actions.appendChild(button('Скачать', () => {
          const url = URL.createObjectURL(record.blob);
          objectUrls.add(url);
          const a = document.createElement('a');
          a.href = url; a.download = record.name; a.hidden = true;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => { URL.revokeObjectURL(url); objectUrls.delete(url); }, 60000);
        }));
        actions.appendChild(button('Автопост', () => {
          window.dispatchEvent(new CustomEvent('ineasy:archive-autopost', { detail: { blob: record.blob, name: record.name } }));
        }));
        actions.appendChild(button('Удалить', async () => {
          try { await deleteRecord(record.id); status.textContent = 'Видео удалено из локального архива.'; await render(); }
          catch (_) { status.textContent = 'Не удалось удалить видео. Проверьте свободное место браузера.'; }
        }));
        row.append(info, actions);
        list.appendChild(row);
      }
      status.textContent = '';
    } catch (error) {
      count.textContent = '— / ' + LIMIT;
      status.textContent = 'Локальный архив недоступен в этом браузере: ' + (error.message || 'ошибка хранилища');
    }
  }

  let pendingArchiveDetail = null;
  async function requestArchiveSpace(detail) {
    pendingArchiveDetail = detail;
    const overlay = document.getElementById('archiveFullOverlay');
    const list = document.getElementById('archiveFullItems');
    const done = document.getElementById('archiveFullDone');
    const cancel = document.getElementById('archiveFullCancel');
    if (!overlay || !list || !done || !cancel) {
      pendingArchiveDetail = null;
      const status = ensurePanel().querySelector('#ineasyArchiveStatus');
      status.textContent = 'Архив заполнен. Удалите ненужное видео и повторите обработку, чтобы сохранить результат.';
      return;
    }
    list.replaceChildren();
    const records = await allRecords();
    for (const record of records) {
      const label = document.createElement('label');
      label.className = 'archive-full-choice';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = record.id;
      checkbox.addEventListener('change', () => {
        done.disabled = !list.querySelector('input:checked');
      });
      const text = document.createElement('span');
      text.textContent = record.name + ' · ' + formatSize(record.blob.size);
      label.append(checkbox, text);
      list.appendChild(label);
    }
    done.disabled = true;
    overlay.classList.remove('hidden');
    done.onclick = async () => {
      const ids = Array.from(list.querySelectorAll('input:checked')).map(input => input.value);
      if (!ids.length || !pendingArchiveDetail) return;
      done.disabled = true;
      try {
        for (const id of ids) await deleteRecord(id);
        const detailToSave = pendingArchiveDetail;
        pendingArchiveDetail = null;
        overlay.classList.add('hidden');
        await save(detailToSave, true);
        const status = ensurePanel().querySelector('#ineasyArchiveStatus');
        status.textContent = 'Готово — новое обработанное видео добавлено в архив.';
      } catch (error) {
        done.disabled = false;
        ensurePanel().querySelector('#ineasyArchiveStatus').textContent = 'Не удалось обновить архив. Попробуйте ещё раз.';
      }
    };
    cancel.onclick = () => {
      pendingArchiveDetail = null;
      overlay.classList.add('hidden');
    };
  }
  async function save(detail, spaceAlreadyFreed = false) {
    if (!detail || !(detail.blob instanceof Blob) || !detail.blob.size) return;
    const status = ensurePanel().querySelector('#ineasyArchiveStatus');
    try {
      const records = await allRecords();
      if (records.length >= LIMIT && !spaceAlreadyFreed) {
        await requestArchiveSpace(detail);
        return;
      }
      const record = { id: makeId(), name: String(detail.name || 'ineasy-video.mp4').slice(0, 240), blob: detail.blob, createdAt: Date.now(), mimeType: detail.blob.type || 'application/octet-stream' };
      await putRecord(record);
      const after = await allRecords();
      for (const old of after.slice(LIMIT)) await deleteRecord(old.id);
      status.textContent = 'Видео сохранено в архиве этого браузера.';
      await render();
    } catch (error) {
      status.textContent = 'Видео обработано, но не помещается в локальный архив. Освободите место браузера; скачать результат можно выше.';
      console.warn('[INEASY archive] Save failed:', error);
    }
  }
  window.addEventListener('ineasy:processed-video', event => { save(event.detail); });
  window.addEventListener('ineasy:archive-autopost', event => {
    const detail = event.detail || {};
    const blob = detail.blob;
    if (!(blob instanceof Blob)) return;
    window.dispatchEvent(new CustomEvent('ineasy:use-archive-video', { detail: { blob, name: detail.name || 'ineasy-video.mp4' } }));
    document.getElementById('publicationActions')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  document.addEventListener('DOMContentLoaded', render);
})();