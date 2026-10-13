import { DEFAULT_OPTIONS, normalizeOptions, plainText, renderDocument, toMarkdown, toHTML, fileName, safeURL } from './lib/document.js';
import { embedImages } from './lib/assets.js';
import { downloadFile } from './lib/download.js';
import { demoDocument } from './lib/demo.js';

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
        if (record) await chrome.storage.session.set({ [key]: { ...record, selectedIds: [...selected], title: $('#document-title').value, format } });
      }
    } catch { showStatus('设置暂时无法保存，当前预览与导出仍可使用。', 'warn'); }
  }, 180);
}

function render() {
  const doc = currentDocument();
  const characters = doc.posts.reduce((sum, post) => sum + Array.from(plainText(post)).length, 0);
  $('#source-count').textContent = `${doc.posts.length} 条已选`;
  $('#selection-count').textContent = `${selected.size} / ${original.posts.length}`;
  $('#preview-meta').textContent = `${doc.posts.length} 条发文 · ${characters.toLocaleString('zh-CN')} 字 · ${Math.max(1, Math.ceil(characters / 400))} 分钟阅读`;
  $('#preview').innerHTML = doc.posts.length ? renderDocument(doc, options) : '<div class="empty-state"><p>请至少选择一条发文。</p></div>';
  $('#markdown-preview').textContent = toMarkdown(doc, options);
  $('#markdown-preview').hidden = format !== 'md';
  $('#preview').hidden = format === 'md';
  $('#appearance').disabled = format === 'md';
  $('#appearance').style.opacity = format === 'md' ? '.5' : '1';
  $('#preview-heading').textContent = format === 'md' ? 'Markdown 预览' : '阅读预览';
  $('#preview-badge').textContent = format === 'md' ? '纯文本 · 可编辑' : format === 'pdf' ? 'A4 · 自动分页' : '所见即所得';
  $('#format-description').textContent = { md: '保存为 .md 文件；配图以原始图片链接保留。', html: '独立 HTML 文件，配图嵌入后可离线阅读。', pdf: '打开 Chrome 打印窗口，选择“保存为 PDF”。' }[format];
  $('#export-label').textContent = `导出 ${format === 'md' ? 'Markdown' : format.toUpperCase()}`;
  $('#export-hint').textContent = format === 'pdf' ? '打印时关闭页眉页脚；夜读主题自动转为浅色。' : format === 'html' ? '图片在导出时嵌入 · 无外部脚本或字体' : 'UTF-8 编码 · 适合笔记与知识库';
  const truncated = doc.posts.some((post) => post.truncated);
  $('#export').disabled = busy || !doc.posts.length || truncated;
  if (truncated) showStatus('所选发文正文仍然折叠。请回到 X 点击“显示更多”，再使用扩展重新读取。', 'warn');
}

async function initialize() {
  try {
    let record;
    if (isDemo) {
      original = structuredClone(demoDocument);
      $('#demo-badge').hidden = false;
      $('#original-link').textContent = '打开 X ↗';
    } else {
      if (!hasExtension || !params.get('id')) throw new Error('请在 X 发文页面点击扩展图标，重新读取内容。预览数据会在 Chrome 关闭后清除。');
      record = (await chrome.storage.session.get(key))[key];
      if (!record?.document?.posts?.length) throw new Error('请在 X 发文页面点击扩展图标，重新读取内容。预览数据会在 Chrome 关闭后清除。');
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
    $('#source-kind').textContent = isDemo ? '排版体验 · 示例内容' : original.kind === 'article' ? '来自 X 的长文' : '来自 X 的发文';
    $('#source-time').textContent = `读取于 ${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' }).format(new Date(original.capturedAt))}`;
    $('#selection').hidden = original.posts.length < 2;
    for (const post of original.posts) {
      const row = document.createElement('label');
      row.className = 'post-choice';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.checked = selected.has(post.id); checkbox.value = post.id;
      const excerpt = document.createElement('span'); excerpt.textContent = `${post.id === original.rootId ? '当前发文 · ' : ''}${plainText(post).slice(0, 110) || '图片或视频发文'}${post.truncated ? '（正文折叠）' : ''}`;
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
  if (!ready || busy) return;
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
  busy = true;
  document.querySelectorAll('.sidebar input, .sidebar button').forEach((input) => { input.disabled = true; });
  $('#export-label').textContent = '正在准备…';
  showStatus('正在准备文档…');
  try {
    if (exportFormat === 'md') {
      await saveDownload(toMarkdown(doc, exportOptions), fileName(doc.title, 'md'), 'text/markdown;charset=utf-8');
      showStatus('Markdown 已交给 Chrome 下载。');
    } else {
      const { assets, failed } = exportOptions.includeImages ? await embedImages(doc, (current, total) => { $('#export-label').textContent = `正在嵌入图片 ${current}/${total}`; }) : { assets: {}, failed: [] };
      const warning = failed.length ? `${failed.length} 张图片未能嵌入，文档中已保留原图链接。` : '';
      if (exportFormat === 'html') {
        const response = await fetch(new URL('document.css', import.meta.url));
        if (!response.ok) throw new Error('排版样式加载失败，请重新打开扩展。');
        await saveDownload(toHTML(doc, exportOptions, await response.text(), assets), fileName(doc.title, 'html'), 'text/html;charset=utf-8');
        showStatus(`HTML 已交给 Chrome 下载。${warning}`, failed.length ? 'warn' : '');
      } else {
        $('#preview').innerHTML = renderDocument(doc, exportOptions, assets);
        await document.fonts.ready;
        await Promise.all(Array.from($('#preview').querySelectorAll('img'), (img) => img.decode().catch(() => {})));
        document.title = doc.title;
        showStatus(`${warning}请在打印窗口选择“保存为 PDF”，并关闭页眉和页脚。`, failed.length ? 'warn' : '');
        window.print();
      }
    }
  } catch (error) { showStatus(error.message || '导出失败，请重试。', 'error'); }
  finally {
    busy = false;
    document.querySelectorAll('.sidebar input, .sidebar button').forEach((input) => { input.disabled = false; });
    // Preserve embedded images after PDF preparation; the next edit re-renders normally.
    $('#appearance').disabled = format === 'md';
    $('#export-label').textContent = `导出 ${format === 'md' ? 'Markdown' : format.toUpperCase()}`;
    $('#export').disabled = !selected.size || currentDocument().posts.some((post) => post.truncated);
  }
});

await initialize();
