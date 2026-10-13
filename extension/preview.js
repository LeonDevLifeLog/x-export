import { DEFAULT_OPTIONS, normalizeOptions, plainText, renderDocument, toMarkdown, toHTML, fileName, safeURL, readingMinutes } from './lib/document.js';
import { embedImages } from './lib/assets.js';
import { downloadFile } from './lib/download.js';
import { createDemoDocument } from './lib/demo.js';
import { initializeI18n, saveLanguage, t, locale, number } from './lib/i18n.js';

await initializeI18n();

const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const isDemo = params.get('demo') === '1';
const key = `doc:${params.get('id') || ''}`;
const hasExtension = Boolean(globalThis.chrome?.storage?.session);
let original;
let selected = new Set();
let options = { ...DEFAULT_OPTIONS };
let format = 'html';
let busy = false;
let saveTimer;
let ready = false;

function showStatus(message, type = '') { $('#status').textContent = message; $('#status').className = `status ${type}`; }

function currentDocument() {
  return { ...original, title: $('#document-title').value.trim() || original.title, posts: original.posts.filter((post) => selected.has(post.id)) };
}

function save() {
  if (!hasExtension) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await chrome.storage.local.set({ options });
      if (!isDemo) {
        const [record] = Object.values(await chrome.storage.session.get(key));
        if (record && ready) await chrome.storage.session.set({ [key]: { ...record, selectedIds: [...selected], title: $('#document-title').value, format } });
      }
    } catch { showStatus(t('preferencesFailed'), 'warn'); }
  }, 180);
}

function render() {
  const doc = currentDocument();
  const characters = doc.posts.reduce((sum, post) => sum + Array.from(plainText(post)).length, 0);
  $('#source-count').textContent = t('selectedCount', number(doc.posts.length));
  $('#selection-count').textContent = `${selected.size} / ${original.posts.length}`;
  $('#preview-meta').textContent = t('previewMeta', t(doc.posts.length === 1 ? 'postSingular' : 'postPlural', number(doc.posts.length)), number(characters), readingMinutes(doc));
  $('#preview').innerHTML = doc.posts.length ? renderDocument(doc, options) : `<div class="empty-state"><p>${t('emptySelection')}</p></div>`;
  $('#markdown-preview').textContent = toMarkdown(doc, options);
  $('#markdown-preview').hidden = format !== 'md';
  $('#preview').hidden = format === 'md';
  $('#appearance').disabled = format === 'md';
  $('#appearance').style.opacity = format === 'md' ? '.5' : '1';
  $('#preview-heading').textContent = t(format === 'md' ? 'markdownPreview' : 'readingPreview');
  $('#preview-badge').textContent = t(format === 'md' ? 'plainBadge' : format === 'pdf' ? 'pdfBadge' : 'visualBadge');
  $('#format-description').textContent = t({ md: 'mdDescription', html: 'htmlDescription', pdf: 'pdfDescription' }[format]);
  $('#export-label').textContent = t('exportLabel', format === 'md' ? 'Markdown' : format.toUpperCase());
  $('#export-hint').textContent = t(format === 'pdf' ? 'pdfHint' : format === 'html' ? 'htmlHint' : 'mdHint');
  const truncated = doc.posts.some((post) => post.truncated);
  $('#export').disabled = busy || !doc.posts.length || truncated;
  if (truncated) showStatus(t('foldedWarning'), 'warn');
}

async function initialize() {
  try {
    let record;
    if (isDemo) {
      original = createDemoDocument(locale);
      $('#demo-badge').hidden = false;
      $('#original-link').textContent = t('openX');
    } else {
      if (!hasExtension || !params.get('id')) throw new Error(t('previewRecovery'));
      record = (await chrome.storage.session.get(key))[key];
      if (!record?.document?.posts?.length) throw new Error(t('previewRecovery'));
      original = record.document;
    }
    if (hasExtension) options = normalizeOptions((await chrome.storage.local.get('options')).options);
    const validIds = new Set(original.posts.map((post) => post.id));
    selected = new Set((record?.selectedIds || [original.rootId]).filter((id) => validIds.has(id)));
    format = ['md', 'html', 'pdf'].includes(record?.format) ? record.format : 'html';
    $(`input[name="format"][value="${format}"]`).checked = true;
    $(`input[name="theme"][value="${options.theme}"]`).checked = true;
    $(`input[name="fontSize"][value="${options.fontSize}"]`).checked = true;
    ['includeImages', 'includeSource', 'includeQuote'].forEach((name) => { $(`#${name}`).checked = options[name]; });
    $('#document-title').value = record?.title || original.title;
    $('#original-link').href = safeURL(original.pageUrl) || 'https://x.com';
    const root = original.posts.find((post) => post.id === original.rootId) || original.posts[0];
    $('#source-author').textContent = `${root.author}${root.handle ? ` · @${root.handle}` : ''}`;
    $('#source-excerpt').textContent = plainText(root);
    $('#source-kind').textContent = t(isDemo ? 'sourceDemo' : original.kind === 'article' ? 'sourceArticle' : 'sourcePost');
    $('#source-time').textContent = t('capturedAt', new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(original.capturedAt)));
    $('#selection').hidden = original.posts.length < 2;
    for (const post of original.posts) {
      const row = document.createElement('label');
      row.className = 'post-choice';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.checked = selected.has(post.id); checkbox.value = post.id;
      const excerpt = document.createElement('span'); excerpt.textContent = `${post.id === original.rootId ? t('currentPost') : ''}${plainText(post).slice(0, 110) || t('mediaPost')}${post.truncated ? t('foldedLabel') : ''}`;
      row.append(checkbox, excerpt);
      checkbox.addEventListener('change', () => { checkbox.checked ? selected.add(post.id) : selected.delete(post.id); showStatus(''); render(); save(); });
      $('#post-list').append(row);
    }
    $('#studio').hidden = false;
    ready = true;
    render();
  } catch (error) {
    $('#fatal').hidden = false;
    $('#fatal-message').textContent = error.message;
  }
}

document.addEventListener('change', (event) => {
  if (!ready || busy || event.target.id === 'language') return;
  const input = event.target;
  if (input.name === 'format') format = input.value;
  if (input.name === 'theme') options.theme = input.value;
  if (input.name === 'fontSize') options.fontSize = Number(input.value);
  if (['includeImages', 'includeSource', 'includeQuote'].includes(input.id)) options[input.id] = input.checked;
  showStatus(''); render(); save();
});
$('#document-title').addEventListener('input', () => { if (ready) { render(); save(); } });

async function saveDownload(content, filename, type) {
  if (hasExtension) await downloadFile(content, filename, type);
  else {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

$('#export').addEventListener('click', async () => {
  if (busy || !ready) return;
  const doc = currentDocument();
  if (!doc.posts.length || doc.posts.some((post) => post.truncated)) return;
  const exportOptions = { ...options };
  const exportFormat = format;
  // Request optional access synchronously with the export gesture, before any await.
  const imageSources = [...new Set(doc.posts.flatMap((post) => post.blocks.filter((block) => block.type === 'image').map((block) => block.src)))];
  const imagePermission = exportFormat !== 'md' && exportOptions.includeImages && imageSources.length && hasExtension
    ? chrome.permissions.request({ origins: ['https://pbs.twimg.com/*'] }).catch(() => false)
    : Promise.resolve(true);
  busy = true;
  document.querySelectorAll('.sidebar input, .sidebar button, .sidebar select').forEach((input) => { input.disabled = true; });
  $('#export-label').textContent = t('preparing');
  showStatus(t('preparingDocument'));
  try {
    if (exportFormat === 'md') {
      await saveDownload(toMarkdown(doc, exportOptions), fileName(doc.title, 'md'), 'text/markdown;charset=utf-8');
      showStatus(t('mdDownloaded'));
    } else {
      const allowed = await imagePermission;
      const { assets, failed } = !allowed ? { assets: {}, failed: imageSources } : exportOptions.includeImages ? await embedImages(doc, (current, total) => { $('#export-label').textContent = t('embeddingProgress', current, total); }) : { assets: {}, failed: [] };
      if (!ready) return;
      const warning = failed.length ? t('imageWarning', failed.length) : '';
      if (exportFormat === 'html') {
        const response = await fetch(new URL('document.css', import.meta.url));
        if (!response.ok) throw new Error(t('styleFailed'));
        const css = await response.text();
        if (!ready) return;
        await saveDownload(toHTML(doc, exportOptions, css, assets), fileName(doc.title, 'html'), 'text/html;charset=utf-8');
        showStatus(t('htmlDownloaded') + warning, failed.length ? 'warn' : '');
      } else {
        $('#preview').innerHTML = renderDocument(doc, exportOptions, assets);
        await document.fonts.ready;
        await Promise.all(Array.from($('#preview').querySelectorAll('img'), (img) => img.decode().catch(() => {})));
        if (!ready) return;
        document.title = doc.title;
        showStatus(warning + t('printInstruction'), failed.length ? 'warn' : '');
        window.print();
      }
    }
  } catch (error) { showStatus(/cancel/i.test(error.message) ? t('exportCancelled') : error.message === t('styleFailed') ? error.message : t('exportFailed'), 'error'); }
  finally {
    busy = false;
    document.querySelectorAll('.sidebar input, .sidebar button, .sidebar select').forEach((input) => { input.disabled = false; });
    // Preserve embedded images after PDF preparation; the next edit re-renders normally.
    $('#appearance').disabled = format === 'md';
    $('#export-label').textContent = t('exportLabel', format === 'md' ? 'Markdown' : format.toUpperCase());
    $('#export').disabled = !ready || !selected.size || currentDocument().posts.some((post) => post.truncated);
  }
});

$('#language').addEventListener('change', async (event) => {
  clearTimeout(saveTimer);
  if (hasExtension && ready) {
    await chrome.storage.local.set({ options });
    if (!isDemo) {
      const record = (await chrome.storage.session.get(key))[key];
      if (record && ready) await chrome.storage.session.set({ [key]: { ...record, selectedIds: [...selected], title: $('#document-title').value, format } });
    }
  }
  await saveLanguage(event.target.value);
  location.reload();
});

// Clearing session data in Help also removes already-open document previews.
if (hasExtension && !isDemo) chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes[key] && !changes[key].newValue) {
    clearTimeout(saveTimer);
    ready = false; original = null; selected.clear();
    $('#studio').hidden = true;
    $('#preview').replaceChildren(); $('#markdown-preview').textContent = '';
    $('#post-list').replaceChildren(); $('#source-excerpt').textContent = '';
    $('#document-title').value = '';
    for (const id of ['source-author', 'source-time', 'preview-meta', 'source-count', 'selection-count']) $(`#${id}`).textContent = '';
    $('#original-link').href = 'https://x.com'; document.title = t('previewTitle');
    $('#fatal').hidden = false; $('#fatal-message').textContent = t('previewRecovery');
  }
});

await initialize();
