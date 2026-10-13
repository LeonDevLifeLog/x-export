import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { configureI18n, resolveLocale, t } from '../extension/lib/i18n.js';
import { toMarkdown, toHTML, formatDate } from '../extension/lib/document.js';
import { createDemoDocument } from '../extension/lib/demo.js';

const catalogs = Object.fromEntries(await Promise.all(['en', 'zh_CN'].map(async (code) => [code, JSON.parse(await readFile(new URL(`../extension/_locales/${code}/messages.json`, import.meta.url)))])));

test('both locales have identical keys, positional placeholders and Chrome-valid manifest strings', () => {
  assert.deepEqual(Object.keys(catalogs.en).sort(), Object.keys(catalogs.zh_CN).sort());
  for (const [key, value] of Object.entries(catalogs.en)) {
    assert.ok(value.message.trim(), key);
    assert.ok(catalogs.zh_CN[key].message.trim(), key);
    assert.deepEqual(value.message.match(/\$\d/g) || [], catalogs.zh_CN[key].message.match(/\$\d/g) || [], key);
  }
  for (const messages of Object.values(catalogs)) {
    assert.ok(messages.extName.message.length <= 75);
    assert.ok(messages.extDescription.message.length <= 132);
  }
});

test('unsupported languages fall back to English and simplified Chinese variants resolve correctly', () => {
  for (const language of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-CN']) assert.equal(resolveLocale(language), 'zh-CN');
  for (const language of ['en-US', 'fr', 'ja', 'zh-TW', 'zh-Hant', undefined]) assert.equal(resolveLocale(language), 'en');
});

test('document labels and dates follow UI locale without translating source content', () => {
  const doc = { title: '保持原始中文', posts: [{ author: '原作者', url: 'https://x.com/author/status/1', publishedAt: '2026-10-13T12:00:00Z', blocks: [{ type: 'paragraph', runs: [{ text: '原文 🚀' }] }, { type: 'image', src: 'https://pbs.twimg.com/media/a.png' }, { type: 'video', url: 'https://x.com/author/status/1' }], quote: { author: '引用作者', runs: [{ text: '引用原文' }], url: 'https://x.com/other/status/2' } }] };
  configureI18n('en', catalogs.en);
  const html = toHTML(doc, {}, '', {});
  assert.ok(html.includes('<html lang="en">'));
  for (const text of ['原文 🚀', '原作者', '引用原文', 'View original', 'Image could not be embedded', 'View on X']) assert.ok(html.includes(text), text);
  assert.ok(toMarkdown(doc).includes('[Quoted source]'));
  assert.ok(formatDate(doc.posts[0].publishedAt).includes('2026'));
  assert.equal(t('embeddingProgress', 2, 5), 'Embedding images 2/5');
  assert.equal(createDemoDocument('en').posts[0].author, 'X Export Studio');
  configureI18n('zh-CN', catalogs.zh_CN);
  assert.ok(toHTML(doc, {}, '', {}).includes('查看原文'));
  assert.equal(createDemoDocument('zh-CN').title, '让好内容，拥有第二次生命。');
});
