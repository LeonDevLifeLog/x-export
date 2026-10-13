import { readFile } from 'node:fs/promises';
import { configureI18n } from '../extension/lib/i18n.js';
configureI18n('zh-CN', JSON.parse(await readFile(new URL('../extension/_locales/zh_CN/messages.json', import.meta.url))));
import test from 'node:test';
import assert from 'node:assert/strict';
import { toMarkdown, toHTML, renderDocument, normalizeOptions, fileName, safeURL } from '../extension/lib/document.js';

const doc = {
  title: '测试 <img src=x onerror=alert(1)>',
  posts: [{
    author: '林 & <script>作者</script>', handle: 'lin', publishedAt: '2026-10-13T02:00:00Z', url: 'https://x.com/lin/status/123', title: '',
    blocks: [
      { type: 'paragraph', runs: [{ text: '中文 🚀\n第二行 ' }, { text: '危险链接', href: 'javascript:alert(1)' }, { text: '文档', href: 'https://example.com/a(b)', bold: true }] },
      { type: 'code', runs: [{ text: 'code ```\n<img onerror=alert(2)>' }] },
      { type: 'image', src: 'https://pbs.twimg.com/media/a.jpg', alt: '测试配图' },
      { type: 'image', src: 'javascript:alert(2)', alt: '危险图片' },
      { type: 'list', ordered: true, items: [[{ text: '第一项' }], [{ text: '第二项' }]] },
    ],
    quote: { author: '引用作者', url: 'https://x.com/other/status/456', runs: [{ text: '引用文字\n下一行' }] },
  }],
};

test('standalone HTML escapes page content and rejects executable URLs', () => {
  const html = toHTML(doc, {}, '.document{color:black}', {});
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('&lt;script&gt;作者&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('src="javascript:'));
  assert.ok(html.includes('Content-Security-Policy'));
  assert.ok(html.includes('中文 🚀<br>第二行'));
});

test('offline HTML uses embedded images and explicitly marks missing images', () => {
  const encoded = 'data:image/png;base64,aGVsbG8=';
  const html = renderDocument(doc, {}, { 'https://pbs.twimg.com/media/a.jpg': encoded });
  assert.ok(html.includes(`src="${encoded}"`));
  assert.ok(!html.includes('src="https://'));
  assert.ok(renderDocument(doc, {}, {}).includes('图片未能嵌入'));
  assert.ok(renderDocument(doc, { includeImages: false }, {}).indexOf('<figure') === -1);
});

test('Markdown preserves Chinese, line breaks, links, quote attribution and safe code fences', () => {
  const md = toMarkdown(doc);
  assert.ok(md.includes('中文 🚀\n第二行'));
  assert.ok(md.includes('https://example.com/a%28b%29'));
  assert.ok(md.includes('````\ncode ```'));
  assert.ok(md.includes('1. 第一项\n2. 第二项'));
  assert.ok(md.includes('> **引用作者**\n>\n> 引用文字\n> 下一行'));
  assert.ok(md.includes('[查看原文](https://x.com/lin/status/123)'));
  assert.ok(!md.includes('javascript:'));
});

test('retention choices apply to both HTML and Markdown', () => {
  const options = { includeImages: false, includeSource: false, includeQuote: false };
  const md = toMarkdown(doc, options);
  const html = renderDocument(doc, options);
  for (const output of [md, html]) {
    assert.ok(!output.includes('pbs.twimg.com'));
    assert.ok(!output.includes('查看原文'));
    assert.ok(!output.includes('引用作者'));
  }
});

test('unexpected option values and unsafe filenames cannot alter markup', () => {
  assert.equal(normalizeOptions({ theme: 'constructor', fontSize: -20 }).theme, 'paper');
  assert.equal(normalizeOptions({ fontSize: '19' }).fontSize, 19);
  assert.equal(safeURL('data:text/html,<script>alert(1)</script>', true), '');
  assert.equal(fileName('../ 标题:示例? /', 'md'), '.. 标题示例.md');
  assert.equal(fileName('... ', 'html'), 'X Export.html');
});

test('a date label from semantic X markup is escaped as page data', () => {
  const malicious = structuredClone(doc);
  malicious.posts[0].publishedAt = '';
  malicious.posts[0].publishedLabel = '<script>alert(1)</script>';
  const html = renderDocument(malicious);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});
