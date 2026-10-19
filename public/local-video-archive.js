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
  let liveWatching = false;
  function ensurePanel() {
    let panel = document.getElementById('ineasyLocalArchive');
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = 'ineasyLocalArchive';
    panel.className = 'ia-panel';
    panel.innerHTML =
      '<header class="ia-head"><h2>Архив</h2><span class="ia-note">только в этом браузере</span><span id="ineasyArchiveCount" class="ia-count">0 / ' + LIMIT + '</span></header>' +
      '<div class="ia-live hidden" id="ineasyArchiveLive"><div class="ia-live-label" id="ineasyArchiveLiveLabel"></div><div class="ia-track"><i id="ineasyArchiveLiveBar"></i></div></div>' +
      '<div class="ia-list" id="ineasyArchiveItems"></div>' +
      '<p class="ia-status" id="ineasyArchiveStatus" role="status" aria-live="polite"></p>';
    const footer = document.querySelector('.site-footer');
    if (footer?.parentNode) footer.parentNode.insertBefore(panel, footer);
    else document.body.appendChild(panel);
    watchProcessing();
    return panel;
  }
  // Mirror the real processing progress bar so the archive shows the same live state.
  function syncLive() {
    const state = document.getElementById('processingState');
    const bar = document.getElementById('processingProgress');
    const live = document.getElementById('ineasyArchiveLive');
    if (!state || !bar || !live) return;
    // Once the bar reaches 100% processing is finished, so the live row should not linger at 100%.
    const ratio = parseFloat(bar.style.width) || 0;
    const active = !state.classList.contains('hidden') && !state.classList.contains('failed') && ratio < 100;
    live.classList.toggle('hidden', !active);
    if (!active) return;
    document.getElementById('ineasyArchiveLiveBar').style.width = bar.style.width;
    document.getElementById('ineasyArchiveLiveLabel').textContent = document.getElementById('processingPercent')?.textContent || '';
  }
  function watchProcessing() {
    if (liveWatching) return;
    const state = document.getElementById('processingState');
    const bar = document.getElementById('processingProgress');
    const percent = document.getElementById('processingPercent');
    if (!state || !bar) return;
    liveWatching = true;
    new MutationObserver(syncLive).observe(state, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(syncLive).observe(bar, { attributes: true, attributeFilter: ['style'] });
    if (percent) new MutationObserver(syncLive).observe(percent, { childList: true, characterData: true, subtree: true });
    syncLive();
  }
  function button(label, action, variant) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ia-btn' + (variant ? ' ' + variant : '');
    el.textContent = label;
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
        empty.className = 'ia-empty';
        empty.textContent = 'Пусто';
        list.appendChild(empty);
      }
      for (const record of records) {
        const row = document.createElement('div');
        row.className = 'ia-row';
        const info = document.createElement('div');
        info.className = 'ia-info';
        const name = document.createElement('span');
        name.className = 'ia-name';
        name.textContent = record.name;
        name.title = record.name;
        const meta = document.createElement('span');
        meta.className = 'ia-meta';
        meta.textContent = formatSize(record.blob.size) + ' · ' + new Date(record.createdAt).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        info.append(name, meta);
        const actions = document.createElement('div');
        actions.className = 'ia-actions';
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
          try { await deleteRecord(record.id); status.textContent = ''; await render(); }
          catch (_) { status.textContent = 'Не удалось удалить.'; }
        }, 'ia-btn-danger'));
        row.append(info, actions);
        list.appendChild(row);
      }
      status.textContent = '';
    } catch (error) {
      count.textContent = '— / ' + LIMIT;
      status.textContent = 'Архив недоступен в этом браузере.';
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
      status.textContent = 'Архив полон. Удалите видео и повторите.';
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
        status.textContent = '';
      } catch (error) {
        done.disabled = false;
        ensurePanel().querySelector('#ineasyArchiveStatus').textContent = 'Не удалось обновить архив.';
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
      status.textContent = '';
      await render();
    } catch (error) {
      status.textContent = 'Нет места для сохранения. Освободите место в браузере.';
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