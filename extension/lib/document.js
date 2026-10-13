export const DEFAULT_OPTIONS = Object.freeze({ theme: 'paper', includeImages: true, includeSource: true, includeQuote: true, fontSize: 17 });
export const THEMES = Object.freeze({ paper: '纸感杂志', minimal: '纯净白', midnight: '夜读' });

export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function safeURL(value = '', allowImage = false) {
  if (allowImage && /^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=]+$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.href : '';
  } catch { return ''; }
}

export function normalizeOptions(options = {}) {
  return {
    theme: Object.hasOwn(THEMES, options.theme) ? options.theme : DEFAULT_OPTIONS.theme,
    includeImages: options.includeImages !== false,
    includeSource: options.includeSource !== false,
    includeQuote: options.includeQuote !== false,
    fontSize: [15, 17, 19].includes(Number(options.fontSize)) ? Number(options.fontSize) : 17,
  };
}

export function plainText(post) {
  return post.blocks.map((block) => block.type === 'list' ? block.items.flat().map((run) => run.text).join('') : (block.runs || []).map((run) => run.text).join('')).join('\n');
}

export function formatDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai' }).format(date) : '';
}

function postDate(post) { return formatDate(post.publishedAt) || post.publishedLabel || ''; }

export function fileName(title, extension) {
  const clean = String(title || 'X 发文').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/[. ]+$/g, '').trim().slice(0, 80) || 'X 发文';
  return `${clean}.${extension}`;
}

function runsHTML(runs = []) {
  return runs.map((run) => {
    let text = escapeHTML(run.text).replace(/\n/g, '<br>');
    if (run.code) text = `<code>${text}</code>`;
    if (run.bold) text = `<strong>${text}</strong>`;
    if (run.italic) text = `<em>${text}</em>`;
    if (run.strike) text = `<s>${text}</s>`;
    const href = safeURL(run.href);
    return href ? `<a href="${escapeHTML(href)}" rel="noopener noreferrer">${text}</a>` : text;
  }).join('');
}

function markdownText(value) { return String(value).replace(/([\\`*_{}[\]<>~!|#])/g, '\\$1'); }
function markdownURL(value) { return safeURL(value).replace(/[()\s<>]/g, (char) => `%${char.codePointAt(0).toString(16).toUpperCase().padStart(2, '0')}`); }
function runsMarkdown(runs = []) {
  return runs.map((run) => {
    let text = markdownText(run.text);
    if (run.code) {
      const delimiter = '`'.repeat(Math.max(1, ...Array.from(run.text.matchAll(/`+/g), (match) => match[0].length + 1)));
      text = `${delimiter} ${run.text} ${delimiter}`;
    }
    if (run.bold) text = `**${text}**`;
    if (run.italic) text = `*${text}*`;
    if (run.strike) text = `~~${text}~~`;
    const href = markdownURL(run.href);
    return href ? `[${text}](${href})` : text;
  }).join('');
}

export function toMarkdown(doc, rawOptions = {}) {
  const options = normalizeOptions(rawOptions);
  const lines = [`# ${markdownText(doc.title)}`, ''];
  doc.posts.forEach((post, index) => {
    if (doc.posts.length > 1) lines.push(`## ${String(index + 1).padStart(2, '0')} · ${markdownText(post.title || post.author)}`, '');
    lines.push(`**${markdownText(post.author)}**${post.handle ? ` · @${markdownText(post.handle)}` : ''}${postDate(post) ? ` · ${markdownText(postDate(post))}` : ''}`, '');
    for (const block of post.blocks) {
      if (block.type === 'image') {
        if (options.includeImages && markdownURL(block.src)) lines.push(`![${markdownText(block.alt || '发文配图')}](${markdownURL(block.src)})`, '');
      } else if (block.type === 'video') {
        if (markdownURL(block.url)) lines.push(`[在 X 查看视频](${markdownURL(block.url)})`, '');
      } else if (block.type === 'list') {
        lines.push(...block.items.map((runs, i) => `${block.ordered ? `${i + 1}.` : '-'} ${runsMarkdown(runs)}`), '');
      } else if (block.type === 'code') {
        const text = (block.runs || []).map((run) => run.text).join('');
        const fence = '`'.repeat(Math.max(3, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length + 1)));
        lines.push(fence, text, fence, '');
      } else {
        if (block.embedded && !options.includeQuote) continue;
        const text = runsMarkdown(block.runs);
        lines.push(block.type === 'heading' ? `${'#'.repeat(Math.min(6, Math.max(2, Number(block.level) || 2)))} ${text}` : block.type === 'quote' ? [...(block.author ? [`> **${markdownText(block.author)}**`, '>'] : []), ...text.split('\n').map((line) => `> ${line}`), ...(options.includeSource && markdownURL(block.url) ? ['>', `> [引用来源](${markdownURL(block.url)})`] : [])].join('\n') : text, '');
      }
    }
    if (options.includeQuote && post.quote) lines.push(`> **${markdownText(post.quote.author)}**`, '>', ...runsMarkdown(post.quote.runs).split('\n').map((line) => `> ${line}`), ...(options.includeSource && markdownURL(post.quote.url) ? ['>', `> [引用来源](${markdownURL(post.quote.url)})`] : []), '');
    if (options.includeSource && markdownURL(post.url)) lines.push(`[查看原文](${markdownURL(post.url)})`, '');
    if (index < doc.posts.length - 1) lines.push('---', '');
  });
  return `${lines.join('\n').trim()}\n`;
}

function blockHTML(block, options, assets) {
  if (block.type === 'image') {
    if (!options.includeImages) return '';
    const original = safeURL(block.src);
    const src = assets ? safeURL(assets[block.src], true) : original;
    if (!src) return original ? `<figure class="image-fallback"><p>图片未能嵌入</p><a href="${escapeHTML(original)}">查看原图</a></figure>` : '';
    const caption = /^(图像|图片|image|发文配图|长文配图|长文封面)$/i.test(block.alt || '') ? '' : block.alt || '';
    return `<figure><img src="${escapeHTML(src)}" alt="${escapeHTML(block.alt || '发文配图')}" referrerpolicy="no-referrer"><figcaption>${escapeHTML(caption)}</figcaption></figure>`;
  }
  if (block.type === 'video') {
    const url = safeURL(block.url);
    return url ? `<aside class="video-note"><span class="play-symbol" aria-hidden="true">▶</span> 这篇发文包含视频 <a href="${escapeHTML(url)}">在 X 查看</a></aside>` : '';
  }
  if (block.type === 'list') { const tag = block.ordered ? 'ol' : 'ul'; return `<${tag}>${block.items.map((runs) => `<li>${runsHTML(runs)}</li>`).join('')}</${tag}>`; }
  if (block.type === 'code') return `<pre><code>${escapeHTML((block.runs || []).map((run) => run.text).join(''))}</code></pre>`;
  const text = runsHTML(block.runs);
  if (block.type === 'heading') { const tag = `h${Math.min(6, Math.max(2, Number(block.level) || 2))}`; return `<${tag}>${text}</${tag}>`; }
  if (block.embedded && !options.includeQuote) return '';
  return block.type === 'quote' ? `<blockquote>${block.author ? `<div class="quote-author">${escapeHTML(block.author)}</div>` : ''}<p>${text}</p>${options.includeSource && safeURL(block.url) ? `<a href="${escapeHTML(safeURL(block.url))}">引用来源 ↗</a>` : ''}</blockquote>` : `<p>${text}</p>`;
}

export function renderDocument(doc, rawOptions = {}, assets) {
  const options = normalizeOptions(rawOptions);
  const first = doc.posts[0];
  if (!first) return '';
  const charCount = doc.posts.reduce((sum, post) => sum + Array.from(plainText(post)).length, 0);
  const date = postDate(first);
  const posts = doc.posts.map((post, index) => `<section class="post-section">
    ${doc.posts.length > 1 ? `<div class="section-number">${String(index + 1).padStart(2, '0')} <span>${escapeHTML(post.title || post.author)}${postDate(post) ? ` · ${escapeHTML(postDate(post))}` : ''}</span></div>` : ''}
    <div class="prose">${post.blocks.map((block) => blockHTML(block, options, assets)).join('\n')}</div>
    ${options.includeQuote && post.quote ? `<blockquote class="quoted-post"><div class="quote-author">${escapeHTML(post.quote.author)}</div><p>${runsHTML(post.quote.runs)}</p>${options.includeSource && safeURL(post.quote.url) ? `<a href="${escapeHTML(safeURL(post.quote.url))}">引用来源 ↗</a>` : ''}</blockquote>` : ''}
    ${options.includeSource && safeURL(post.url) ? `<a class="source-link" href="${escapeHTML(safeURL(post.url))}">查看原文 <span aria-hidden="true">↗</span><small>${escapeHTML(post.url.replace(/^https?:\/\//, ''))}</small></a>` : ''}
  </section>`).join('');
  return `<article class="document theme-${options.theme} size-${options.fontSize}">
    <header class="document-header"><div class="eyebrow"><span class="eyebrow-dot"></span> ${doc.posts.some((post) => post.title) ? 'X ARTICLE' : doc.posts.length > 1 ? 'X COLLECTION' : 'FROM X'}<span class="reading-time">${Math.max(1, Math.ceil(charCount / 400))} 分钟阅读</span></div>
    <h1>${escapeHTML(doc.title)}</h1><div class="author-line"><span class="author-avatar" aria-hidden="true">${escapeHTML(Array.from(first.author || 'X')[0])}</span><div><div class="author-name">${escapeHTML(first.author)}${first.handle ? ` <span>@${escapeHTML(first.handle)}</span>` : ''}</div>${date ? `<div class="publish-date">${escapeHTML(date)}</div>` : ''}</div></div></header>
    ${posts}<footer class="document-footer"><span>留住值得重读的文字。</span><span>X Export</span></footer></article>`;
}

export function toHTML(doc, options, css, assets) {
  return `<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https://pbs.twimg.com; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHTML(doc.title)}</title><style>${css}</style></head><body class="export-page">${renderDocument(doc, options, assets)}</body></html>\n`;
}
