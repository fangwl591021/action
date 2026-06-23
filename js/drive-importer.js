(function () {
  'use strict';

  const state = {
    importedLessons: null,
    currentLessons: [],
    activeFileId: ''
  };

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function init() {
    [
      'apiKey',
      'folderUrl',
      'importBtn',
      'loadLocalBtn',
      'copyBtn',
      'downloadBtn',
      'status',
      'summary',
      'jsonOutput',
      'lessonList',
      'playerFrame',
      'playerTitle',
      'folderIdPreview'
    ].forEach((id) => {
      els[id] = $(id);
    });

    els.importBtn.addEventListener('click', importFromDrive);
    els.loadLocalBtn.addEventListener('click', loadLocalLessons);
    els.copyBtn.addEventListener('click', copyJson);
    els.downloadBtn.addEventListener('click', downloadJson);
    els.folderUrl.addEventListener('input', updateFolderIdPreview);
    updateFolderIdPreview();
    loadLocalLessons({ silent: true });
  }

  function updateFolderIdPreview() {
    const value = els.folderUrl.value.trim();
    if (!value) {
      els.folderIdPreview.textContent = '尚未輸入';
      return;
    }

    const folderId = extractFolderId(value);
    els.folderIdPreview.textContent = folderId || '無法解析 folder_id';
  }

  function extractFolderId(input) {
    const raw = String(input || '').trim();
    if (!raw) return '';

    const folderMatch = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return folderMatch[1];

    const idMatch = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];

    if (/^[a-zA-Z0-9_-]{10,}$/.test(raw)) return raw;
    return '';
  }

  async function importFromDrive() {
    const apiKey = els.apiKey.value.trim();
    const folderUrl = els.folderUrl.value.trim();
    const folderId = extractFolderId(folderUrl);

    if (!apiKey) {
      setStatus('請先輸入 Google Drive API Key。', 'error');
      return;
    }
    if (!folderId) {
      setStatus('無法解析 Google Drive 資料夾網址，請確認網址格式。', 'error');
      return;
    }

    setBusy(true);
    setStatus('正在讀取 Google Drive 資料夾...', 'info');

    try {
      const files = await fetchDriveVideos(apiKey, folderId);
      const lessons = buildLessonsJson(files, folderId, folderUrl);
      state.importedLessons = lessons;
      renderLessons(lessons, { sourceLabel: 'Drive 匯入結果' });
      setJson(lessons);
      setStatus(`匯入完成，共 ${lessons.count} 支 MP4 影片。`, 'success');
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Google Drive 匯入失敗。', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function fetchDriveVideos(apiKey, folderId) {
    const files = [];
    let pageToken = '';

    do {
      const url = buildDriveListUrl(apiKey, folderId, pageToken);
      const response = await fetch(url);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message = payload && payload.error && payload.error.message
          ? payload.error.message
          : `Google Drive API 回傳 HTTP ${response.status}`;
        throw new Error(message);
      }

      const pageFiles = Array.isArray(payload.files) ? payload.files : [];
      files.push(...pageFiles.filter((file) => file.mimeType === 'video/mp4'));
      pageToken = payload.nextPageToken || '';
    } while (pageToken);

    return files;
  }

  function buildDriveListUrl(apiKey, folderId, pageToken) {
    const params = new URLSearchParams({
      key: apiKey,
      pageSize: '1000',
      fields: 'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime)',
      orderBy: 'name',
      q: `'${folderId}' in parents and mimeType = 'video/mp4' and trashed = false`
    });

    if (pageToken) params.set('pageToken', pageToken);
    return `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
  }

  function buildLessonsJson(files, folderId, folderUrl) {
    const lessons = files.map((file) => ({
      file_id: file.id,
      title: file.name,
      mime_type: file.mimeType,
      size: Number(file.size || 0),
      created_time: file.createdTime || '',
      modified_time: file.modifiedTime || '',
      preview_url: `https://drive.google.com/file/d/${file.id}/preview`
    }));

    lessons.sort(compareLessonTitles);

    return {
      generated_at: new Date().toISOString(),
      source: {
        provider: 'google_drive',
        folder_id: folderId,
        folder_url: folderUrl
      },
      count: lessons.length,
      lessons
    };
  }

  function compareLessonTitles(a, b) {
    const aNum = extractSortNumber(a.title);
    const bNum = extractSortNumber(b.title);

    if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
      return aNum - bNum;
    }
    if (Number.isFinite(aNum) && !Number.isFinite(bNum)) return -1;
    if (!Number.isFinite(aNum) && Number.isFinite(bNum)) return 1;

    return String(a.title || '').localeCompare(String(b.title || ''), 'zh-Hant', {
      numeric: true,
      sensitivity: 'base'
    });
  }

  function extractSortNumber(title) {
    const cleanTitle = String(title || '').replace(/\.[^.]+$/, '');
    const matches = cleanTitle.match(/\d+/g);
    if (!matches || !matches.length) return Infinity;
    return Number(matches[matches.length - 1]);
  }

  async function loadLocalLessons(options) {
    const silent = options && options.silent;
    if (!silent) setStatus('正在讀取 data/lessons.json...', 'info');

    try {
      const response = await fetch(`data/lessons.json?v=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`讀取 data/lessons.json 失敗：HTTP ${response.status}`);

      const lessons = await response.json();
      renderLessons(lessons, { sourceLabel: '目前 lessons.json' });
      setJson(lessons);
      if (!silent) setStatus(`已載入 lessons.json，共 ${getLessonArray(lessons).length} 支影片。`, 'success');
    } catch (error) {
      if (!silent) setStatus(error.message, 'error');
    }
  }

  function renderLessons(lessonsJson, options) {
    const lessons = getLessonArray(lessonsJson);
    state.currentLessons = lessons;

    const label = options && options.sourceLabel ? options.sourceLabel : '影片清單';
    els.summary.innerHTML = `
      <strong>${escapeHtml(label)}</strong>
      <span>${lessons.length} 支影片</span>
      <span>Folder ID：${escapeHtml(lessonsJson.source && lessonsJson.source.folder_id || '-')}</span>
    `;

    if (!lessons.length) {
      els.lessonList.innerHTML = '<div class="empty">目前沒有影片資料。</div>';
      clearPlayer();
      return;
    }

    els.lessonList.innerHTML = lessons.map((lesson, index) => `
      <button class="lesson-item" type="button" data-file-id="${escapeAttr(lesson.file_id)}">
        <span class="lesson-index">${index + 1}</span>
        <span class="lesson-main">
          <strong>${escapeHtml(lesson.title)}</strong>
          <small>${formatBytes(lesson.size)} · ${escapeHtml(lesson.modified_time || '-')}</small>
        </span>
      </button>
    `).join('');

    els.lessonList.querySelectorAll('.lesson-item').forEach((button) => {
      button.addEventListener('click', () => {
        const lesson = lessons.find((item) => item.file_id === button.dataset.fileId);
        if (lesson) playLesson(lesson);
      });
    });

    playLesson(lessons[0]);
  }

  function getLessonArray(lessonsJson) {
    if (Array.isArray(lessonsJson)) return lessonsJson;
    if (lessonsJson && Array.isArray(lessonsJson.lessons)) return lessonsJson.lessons;
    return [];
  }

  function playLesson(lesson) {
    state.activeFileId = lesson.file_id;
    els.playerTitle.textContent = lesson.title || 'Google Drive 影片';
    els.playerFrame.src = lesson.preview_url || `https://drive.google.com/file/d/${lesson.file_id}/preview`;

    els.lessonList.querySelectorAll('.lesson-item').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.fileId === lesson.file_id);
    });
  }

  function clearPlayer() {
    state.activeFileId = '';
    els.playerTitle.textContent = '尚未選擇影片';
    els.playerFrame.removeAttribute('src');
  }

  function setJson(value) {
    els.jsonOutput.value = JSON.stringify(value, null, 2);
  }

  async function copyJson() {
    const text = els.jsonOutput.value.trim();
    if (!text) {
      setStatus('目前沒有可複製的 JSON。', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus('已複製 lessons.json 內容。', 'success');
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      setStatus('已複製 lessons.json 內容。', 'success');
    }
  }

  function downloadJson() {
    const text = els.jsonOutput.value.trim();
    if (!text) {
      setStatus('目前沒有可下載的 JSON。', 'error');
      return;
    }

    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lessons.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function setBusy(isBusy) {
    els.importBtn.disabled = isBusy;
    els.loadLocalBtn.disabled = isBusy;
    els.importBtn.textContent = isBusy ? '匯入中...' : '讀取 Drive 影片';
  }

  function setStatus(message, type) {
    els.status.textContent = message;
    els.status.className = `status ${type || 'info'}`;
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!value) return 'size: -';
    const units = ['bytes', 'KB', 'MB', 'GB'];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
