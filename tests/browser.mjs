import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = join(root, 'artifacts');
await mkdir(artifacts, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'x-export-test-'));
await cp(join(root, 'extension'), join(temporary, 'extension'), { recursive: true });
const extension = await realpath(join(temporary, 'extension'));
const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'));
// Synthetic tabs cannot activate Chrome's toolbar-granted activeTab permission.
// This isolated test build grants only the fixture origins; production stays unchanged.
manifest.host_permissions = ['https://x.com/*', 'https://twitter.com/*', 'https://pbs.twimg.com/*'];
await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));
const extensionId = [...createHash('sha256').update(extension).digest().subarray(0, 16)].map((byte) => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15))).join('');
const base = `chrome-extension://${extensionId}`;
const browser = await chromium.launchPersistentContext(join(temporary, 'profile'), {
  channel: 'chromium', headless: true, viewport: { width: 1440, height: 1080 }, acceptDownloads: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
const errors = [];
browser.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
let checks = 0;
const pass = (message) => { checks++; console.log(`✓ ${message}`); };
async function until(check) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (await check()) return;
    await delay(100);
  }
  throw new Error('Timed out waiting for saved preview settings');
}

try {
  const painter = await browser.newPage();
  const landscape = await painter.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 480;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e6ecd8'; ctx.fillRect(0, 0, 1200, 480);
    ctx.fillStyle = '#b6c4a2'; ctx.beginPath(); ctx.arc(960, 110, 48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#718d70'; ctx.beginPath(); ctx.moveTo(0, 300); ctx.bezierCurveTo(250, 100, 450, 440, 750, 250); ctx.bezierCurveTo(1000, 100, 1100, 270, 1200, 200); ctx.lineTo(1200, 480); ctx.lineTo(0, 480); ctx.fill();
    ctx.fillStyle = '#335b48'; ctx.beginPath(); ctx.moveTo(0, 390); ctx.bezierCurveTo(300, 250, 650, 500, 950, 360); ctx.bezierCurveTo(1100, 270, 1160, 330, 1200, 320); ctx.lineTo(1200, 480); ctx.lineTo(0, 480); ctx.fill();
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await painter.close();
  const postFixture = await readFile(join(root, 'tests/fixtures/post.html'), 'utf8');
  const articleFixture = await readFile(join(root, 'tests/fixtures/article.html'), 'utf8');
  const loggedFixture = await readFile(join(root, 'tests/fixtures/logged-in-post.html'), 'utf8');
  const nativeFixture = await readFile(join(root, 'tests/fixtures/native-post.html'), 'utf8');
  await browser.route(/^https:\/\/(x\.com|twitter\.com)\//, (route) => route.fulfill({ contentType: 'text/html', body: route.request().url().includes('/i/article/') ? articleFixture : route.request().url().includes('/wquguru/') ? loggedFixture : route.request().url().includes('native=1') ? nativeFixture : postFixture }));
  await browser.route('https://pbs.twimg.com/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from(landscape, 'base64') }));
  await browser.route('https://abs.twimg.com/**', (route) => route.abort());

  async function capture(url) {
    const source = await browser.newPage();
    await source.goto(url);
    const probe = await browser.newPage();
    await probe.goto(`${base}/preview.html?demo=1`);
    await probe.evaluate(() => chrome.storage.local.set({ language: 'zh-CN' }));
    const sourceId = await probe.evaluate(async (url) => (await chrome.tabs.query({})).find((tab) => tab.url === url).id, url);
    await probe.close();
    const popup = await browser.newPage();
    await popup.addInitScript((sourceId) => {
      const nativeQuery = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = async (query) => query.active ? [await chrome.tabs.get(sourceId)] : nativeQuery(query);
    }, sourceId);
    await popup.goto(`${base}/popup.html`);
    await popup.waitForFunction(() => !document.querySelector('#capture').disabled);
    await popup.locator('body').screenshot({ path: join(artifacts, 'popup.png') });
    const next = browser.waitForEvent('page');
    await popup.locator('#capture').click();
    const studio = await next;
    await studio.waitForSelector('#studio:not([hidden])');
    await source.close();
    if (!popup.isClosed()) await popup.close();
    await studio.evaluate(() => {
      const nativeDownload = chrome.downloads.download.bind(chrome.downloads);
      window.downloadRequests = [];
      window.imagePermissionRequests = [];
      // Native optional-permission dialogs are outside headless automation.
      chrome.permissions.request = async (request) => { window.imagePermissionRequests.push(request); return chrome.permissions.contains(request); };
      // Bypass only the native save dialog; use Chrome's actual download API.
      chrome.downloads.download = (options) => { window.downloadRequests.push(options); return nativeDownload({ ...options, saveAs: false }); };
    });
    return studio;
  }

  const studio = await capture('https://x.com/lin/status/101');
  const record = await studio.evaluate(async () => (await chrome.storage.session.get(null))[`doc:${new URLSearchParams(location.search).get('id')}`]);
  assert.equal(record.document.rootId, '101');
  assert.deepEqual(record.document.posts.map((post) => post.id), ['100', '101', '102']);
  const selectedPost = record.document.posts.find((post) => post.id === '101');
  assert.ok(selectedPost.blocks[0].runs.some((run) => run.text.includes('🚀')));
  assert.equal(selectedPost.blocks.filter((block) => block.type === 'image').length, 1);
  assert.equal(selectedPost.quote.url, 'https://x.com/chen/status/404');
  assert.ok(!selectedPost.blocks[0].runs.some((run) => run.text.includes('window.injected')));
  pass('real scripting injection preserves text/emoji/media and excludes other authors, nested quotes and duplicates');

  const loggedPost = await capture('https://x.com/wquguru/status/2109458639501271530');
  const loggedRecord = await loggedPost.evaluate(async () => (await chrome.storage.session.get(`doc:${new URLSearchParams(location.search).get('id')}`))[`doc:${new URLSearchParams(location.search).get('id')}`]);
  const actualPost = loggedRecord.document.posts[0];
  assert.equal(actualPost.author, 'WquGuru');
  assert.equal(actualPost.handle, 'wquguru');
  assert.equal(actualPost.publishedAt, '2026-10-12T01:38:26.000Z');
  assert.equal(actualPost.blocks.filter((block) => block.type === 'image').length, 1);
  assert.equal(actualPost.truncated, false);
  assert.ok(actualPost.blocks[0].runs.map((run) => run.text).join('').endsWith('来不及呢 😄'));
  assert.equal(actualPost.blocks[0].runs.filter((run) => run.href === 'https://x.com/yetone').length, 2);
  await loggedPost.screenshot({ path: join(artifacts, 'user-post-preview.png'), fullPage: true });
  await writeFile(join(artifacts, 'user-post-extracted.json'), JSON.stringify(loggedRecord.document, null, 2));
  pass('logged-in Chrome DOM replay retains the supplied post, timestamp, two mention links and one image');

  const native = await capture('https://x.com/lin/status/101?native=1');
  assert.equal(await native.locator('#preview .author-name').textContent(), '林间 @lin');
  assert.equal(await native.locator('#preview figure').count(), 1);
  assert.ok((await native.locator('#preview .quoted-post').textContent()).includes('这是引用文字。'));
  assert.ok(await native.locator('#export').isEnabled());
  assert.ok((await native.locator('#preview .publish-date').textContent()).includes('2026年10月12日'));
  pass('semantic X article markup preserves metadata and isolates nested quotes and their folded text');
  await native.close();

  const screenshotDemo = await browser.newPage();
  await screenshotDemo.goto(`${base}/preview.html?demo=1`);
  await screenshotDemo.waitForSelector('#studio:not([hidden])');
  await screenshotDemo.screenshot({ path: join(artifacts, 'studio-paper.png'), fullPage: true });
  for (const theme of ['minimal', 'midnight']) {
    await screenshotDemo.locator(`input[name="theme"][value="${theme}"]`).check();
    await screenshotDemo.screenshot({ path: join(artifacts, `studio-${theme}.png`), fullPage: true });
  }
  await screenshotDemo.setViewportSize({ width: 375, height: 900 });
  await screenshotDemo.emulateMedia({ reducedMotion: 'reduce' });
  assert.ok(await screenshotDemo.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await screenshotDemo.screenshot({ path: join(artifacts, 'studio-mobile.png'), fullPage: true });
  pass('three themes and a 375px viewport render without horizontal overflow');
  await screenshotDemo.close();

  await studio.locator('input[name="format"][value="md"]').check();
  const mdEvent = studio.waitForEvent('download');
  await studio.locator('#export').click();
  const md = await mdEvent;
  const mdPath = join(artifacts, 'post.md');
  await md.saveAs(mdPath);
  const markdown = await readFile(mdPath, 'utf8');
  assert.ok(markdown.includes('好文字，值得好好留存。\n保留中文、换行和表情 🚀'));
  assert.ok(markdown.includes('[阅读原文](https://example.com/article)'));
  assert.ok(markdown.includes('https://pbs.twimg.com/media/example.jpg?format=jpg&name=large'));
  assert.ok(!markdown.includes('其他用户的评论'));
  pass('Markdown downloads through Chrome with full text, source links and original image URLs');
  assert.deepEqual(await studio.evaluate(() => window.imagePermissionRequests), [], 'Markdown must not request image access');

  await studio.locator('input[name="format"][value="html"]').check();
  await studio.locator('input[name="theme"][value="paper"]').check();
  const htmlEvent = studio.waitForEvent('download');
  await studio.locator('#export').click();
  const html = await htmlEvent;
  const htmlPath = join(artifacts, 'post.html');
  await html.saveAs(htmlPath);
  const content = await readFile(htmlPath, 'utf8');
  assert.ok(content.includes('src="data:image/png;base64,'));
  assert.ok(!content.includes('src="https://'));
  const offline = await browser.newPage();
  await offline.route('https://**', (route) => route.abort());
  await offline.goto(pathToFileURL(htmlPath).href);
  assert.ok(await offline.locator('figure img').evaluate((img) => img.complete && img.naturalWidth === 1200));
  await offline.screenshot({ path: join(artifacts, 'export-html.png'), fullPage: true });
  pass('HTML embeds CDN images and renders with all network requests blocked');
  await offline.close();
  assert.ok(await studio.evaluate(() => window.downloadRequests.every((request) => request.saveAs === true)));

  assert.deepEqual(await studio.evaluate(() => window.imagePermissionRequests[0]), { origins: ['https://pbs.twimg.com/*'] });
  await studio.evaluate(() => { chrome.permissions.request = async () => false; });
  const deniedEvent = studio.waitForEvent('download');
  await studio.locator('#export').click();
  const denied = await deniedEvent;
  await denied.saveAs(join(artifacts, 'post-permission-denied.html'));
  const deniedHTML = await readFile(join(artifacts, 'post-permission-denied.html'), 'utf8');
  assert.ok(deniedHTML.includes('图片未能嵌入'));
  assert.ok(deniedHTML.includes('好文字，值得好好留存。'));
  assert.ok(!deniedHTML.includes('src="https://'));
  await studio.evaluate(() => { chrome.permissions.request = (request) => chrome.permissions.contains(request); });
  pass('denied optional image access preserves text and original links in HTML');

  // Check partial media failure is disclosed, with a working original-image link.
  await browser.unroute('https://pbs.twimg.com/**');
  await browser.route('https://pbs.twimg.com/**', (route) => route.fulfill({ status: 403, body: 'unavailable' }));
  const failedImageEvent = studio.waitForEvent('download');
  await studio.locator('#export').click();
  const failedHTML = await failedImageEvent;
  await failedHTML.saveAs(join(artifacts, 'post-image-fallback.html'));
  await studio.waitForFunction(() => document.querySelector('#status').textContent.includes('1 张图片未能嵌入'));
  assert.ok((await readFile(join(artifacts, 'post-image-fallback.html'), 'utf8')).includes('图片未能嵌入'));
  pass('image failures are visible and produce an explicit fallback instead of a broken image');
  await browser.unroute('https://pbs.twimg.com/**');
  await browser.route('https://pbs.twimg.com/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from(landscape, 'base64') }));

  await studio.locator('#selection summary').click();
  await studio.locator('#post-list input[value="100"]').check();
  await studio.locator('#post-list input[value="102"]').check();
  assert.equal(await studio.locator('#preview .post-section').count(), 3);
  await studio.locator('#document-title').fill('我的发文合集');
  await until(() => studio.evaluate(async () => {
    const key = `doc:${new URLSearchParams(location.search).get('id')}`;
    const record = (await chrome.storage.session.get(key))[key];
    return record.title === '我的发文合集' && record.selectedIds.length === 3;
  }));
  await studio.reload();
  await studio.waitForSelector('#studio:not([hidden])');
  assert.equal(await studio.locator('#preview .post-section').count(), 3);
  assert.equal(await studio.locator('#document-title').inputValue(), '我的发文合集');
  pass('manual post selection and edited title survive a preview reload');

  const article = await capture('https://x.com/i/article/777');
  assert.equal(await article.locator('#preview h1').textContent(), '让好内容，拥有第二次生命。');
  assert.equal(await article.locator('#preview .prose h2').count(), 1);
  assert.equal(await article.locator('#preview .prose ol li').count(), 3);
  assert.equal(await article.locator('#preview .prose pre').count(), 1);
  assert.equal(await article.locator('#preview figure').count(), 2);
  pass('long-form article extraction retains headings, list, code, images and rich text');
  await article.evaluate(() => { window.printCalls = 0; window.print = () => { window.printCalls++; }; });
  await article.locator('input[name="format"][value="pdf"]').check();
  await article.locator('#export').click();
  await article.waitForFunction(() => window.printCalls === 1);
  assert.ok(await article.locator('figure img').first().evaluate((img) => img.src.startsWith('data:image/')));
  await article.emulateMedia({ media: 'print' });
  assert.equal(await article.locator('.sidebar').isVisible(), false);
  assert.equal(await article.locator('.app-header').isVisible(), false);
  await article.pdf({ path: join(artifacts, 'article.pdf'), printBackground: true, preferCSSPageSize: true });
  assert.ok((await readFile(join(artifacts, 'article.pdf'))).subarray(0, 5).equals(Buffer.from('%PDF-')));
  await article.screenshot({ path: join(artifacts, 'print-layout.png'), fullPage: true });
  pass('PDF action invokes printing after images are embedded; A4 PDF contains no editor controls');

  await article.emulateMedia({ media: 'screen' });
  await article.evaluate(async () => {
    const key = `doc:${new URLSearchParams(location.search).get('id')}`;
    const record = (await chrome.storage.session.get(key))[key];
    record.document.posts[0].blocks.push(...Array.from({ length: 50 }, (_, index) => ({ type: 'paragraph', runs: [{ text: `分页校验段落 ${index + 1}。这是一段用于验证长文分页的文字，确保自动分页后正文依然连续，且导出文档没有设置栏或阅读预览的界面文字。` }] })));
    await chrome.storage.session.set({ [key]: record });
  });
  await article.reload();
  await article.waitForSelector('#studio:not([hidden])');
  await article.evaluate(() => { window.printCalls = 0; window.print = () => { window.printCalls++; }; });
  await article.locator('#export').click();
  await article.waitForFunction(() => window.printCalls === 1);
  await article.emulateMedia({ media: 'print' });
  await article.pdf({ path: join(artifacts, 'article-multipage.pdf'), printBackground: true, preferCSSPageSize: true });
  pass('long article generates a multipage PDF for pagination inspection');

  // Folded text must block export, rather than silently export an incomplete post.
  await studio.evaluate(async () => {
    const key = `doc:${new URLSearchParams(location.search).get('id')}`;
    const record = (await chrome.storage.session.get(key))[key];
    record.document.posts[0].truncated = true;
    await chrome.storage.session.set({ [key]: record });
  });
  await studio.reload();
  await studio.waitForSelector('#studio:not([hidden])');
  assert.ok(await studio.locator('#export').isDisabled());
  assert.ok((await studio.locator('#status').textContent()).includes('正文仍然折叠'));
  pass('folded content prevents export and gives a recovery instruction');

  const expired = await browser.newPage();
  await expired.goto(`${base}/preview.html?id=missing`);
  await expired.waitForSelector('#fatal:not([hidden])');
  assert.ok((await expired.locator('#fatal-message').textContent()).includes('重新读取'));
  const bilingual = await browser.newPage();
  await bilingual.goto(`${base}/preview.html?demo=1`);
  await bilingual.waitForSelector('#studio:not([hidden])');
  await bilingual.locator('#language').selectOption('en');
  await bilingual.waitForFunction(() => document.documentElement.lang === 'en');
  await bilingual.waitForSelector('#studio:not([hidden])');
  assert.equal(await bilingual.locator('#preview-heading').textContent(), 'Reading preview');
  assert.equal(await bilingual.locator('#preview h1').textContent(), 'Give good words a second life.');
  assert.equal(await bilingual.evaluate(() => chrome.runtime.getManifest().name), await bilingual.evaluate(() => chrome.i18n.getMessage('extName')));
  assert.ok((await bilingual.locator('#preview').textContent()).includes('min read'));
  await bilingual.locator('input[name="format"][value="md"]').check();
  assert.ok((await bilingual.locator('#markdown-preview').textContent()).includes('Give good words a second life.'));
  await bilingual.evaluate(() => {
    const download = chrome.downloads.download.bind(chrome.downloads);
    chrome.downloads.download = (options) => download({ ...options, saveAs: false });
  });
  const englishDownload = bilingual.waitForEvent('download');
  await bilingual.locator('#export').click();
  const englishMD = await englishDownload;
  await englishMD.saveAs(join(artifacts, 'demo-en.md'));
  assert.ok((await readFile(join(artifacts, 'demo-en.md'), 'utf8')).includes('Give good words a second life.'));
  await bilingual.locator('input[name="format"][value="html"]').check();
  const englishHTMLDownload = bilingual.waitForEvent('download');
  await bilingual.locator('#export').click();
  const englishHTML = await englishHTMLDownload;
  await englishHTML.saveAs(join(artifacts, 'demo-en.html'));
  const englishHTMLText = await readFile(join(artifacts, 'demo-en.html'), 'utf8');
  assert.ok(englishHTMLText.includes('<html lang="en">'));
  assert.ok(englishHTMLText.includes('Keep words worth revisiting.'));
  await bilingual.setViewportSize({ width: 375, height: 900 });
  assert.ok(await bilingual.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await bilingual.screenshot({ path: join(artifacts, 'studio-en-mobile.png'), fullPage: true });
  const help = await browser.newPage();
  await help.goto(`${base}/help.html`);
  await help.waitForFunction(() => document.querySelector('#version').textContent.includes('1.1.0'));
  assert.equal(await help.locator('h1').textContent(), 'Keep a post in three steps.');
  pass('English switch localizes demo, export labels, reading metadata and help without narrow-screen overflow');
  pass('Chrome resolves manifest messages; English Markdown/HTML downloads contain localized document labels');
  const englishPopup = await browser.newPage();
  await englishPopup.setViewportSize({ width: 376, height: 600 });
  await englishPopup.goto(`${base}/popup.html`);
  await englishPopup.waitForFunction(() => document.querySelector('#capture-label').textContent === 'Read current post');
  const popupSize = await englishPopup.locator('body').boundingBox();
  assert.ok(popupSize.height <= 600, `English popup exceeds Chrome height: ${popupSize.height}`);
  assert.ok(await englishPopup.evaluate(() => document.documentElement.scrollWidth <= 376));
  await englishPopup.locator('body').screenshot({ path: join(artifacts, 'popup-en.png') });
  await englishPopup.close();
  pass('English popup fits Chrome’s 600px popup height and 376px width');
  await studio.locator('#language').selectOption('en');
  await studio.waitForFunction(() => document.documentElement.lang === 'en');
  await studio.waitForSelector('#studio:not([hidden])');
  assert.equal(await studio.locator('#document-title').inputValue(), '我的发文合集');
  assert.ok((await studio.locator('#source-excerpt').textContent()).includes('好文字，值得好好留存。'));
  assert.ok((await studio.locator('#status').textContent()).includes('still folded'));
  pass('language switch preserves source text, title and selections and translates errors');
  help.on('dialog', (dialog) => dialog.accept());
  await help.locator('#clear-documents').click();
  await studio.waitForSelector('#fatal:not([hidden])');
  const cleared = await help.evaluate(async () => ({ session: await chrome.storage.session.get(null), local: await chrome.storage.local.get(null) }));
  assert.ok(!Object.keys(cleared.session).some((key) => key.startsWith('doc:')));
  assert.ok(cleared.local.options);
  assert.equal(cleared.local.language, 'en');
  assert.equal(await studio.locator('#preview').textContent(), '');
  pass('clearing temporary documents removes session content and invalidates open previews while preserving preferences');
  assert.deepEqual(errors, []);
  pass('missing preview data has a recovery state; no browser JavaScript errors');
  await writeFile(join(artifacts, 'verification.json'), JSON.stringify({ browser: browser.browser().version(), checks, javascriptErrors: errors, fixtureOnly: true, nativeSaveDialogBypassed: true, nativePrintDialogBypassed: true, productionActiveTabGestureTested: false, nativeOptionalPermissionDialogTested: false }, null, 2));
  console.log(`\n${checks} browser checks passed. Screenshots and exported files: ${artifacts}`);
} finally {
  await browser.close();
  await rm(temporary, { recursive: true, force: true });
}
